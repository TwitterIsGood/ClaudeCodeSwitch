import SwiftUI

enum ToastKind { case info, success, error }

struct Toast: Identifiable {
    let id = UUID()
    let message: String
    let kind: ToastKind
}

struct AlertRequest: Identifiable {
    let id = UUID()
    let title: String
    let message: String
    let isDanger: Bool
    let confirmLabel: String
    let cancelLabel: String
    let onConfirm: () -> Void
    let onCancel: () -> Void
}

struct PromptRequest: Identifiable {
    let id = UUID()
    let title: String
    let placeholder: String
    let onConfirm: (String) -> Void
}

@MainActor
final class SettingsStore: ObservableObject {
    // Preferences
    @Published var lang: Lang = .zh
    @Published var themeColor: ThemeColor = .blue
    @Published var themeMode: ThemeMode = .system

    // Provider state
    @Published var filePath: String = ""
    @Published var providers: [String] = []
    @Published var activeProvider: String = ""
    @Published var config: ProviderConfig = ProviderConfig()
    @Published var isLoaded: Bool = false
    @Published var isSaving: Bool = false

    // Welcome flow
    @Published var showWelcomeCard: Bool = false
    @Published var showUnsavedPrompt: Bool = false

    // UI requests
    @Published var toasts: [Toast] = []
    @Published var alert: AlertRequest?
    @Published var prompt: PromptRequest?

    // Recently-opened settings files (project memory)
    @Published var recentPaths: [String] = []
    private let recentsKey = "recentSettingsPaths"

    var globalPath: String {
        FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".claude/settings.json").path
    }

    /// Friendly project name derived from a settings.json path.
    /// `~/.claude/settings.json` -> "Global"; `<proj>/.claude/settings.json` -> "<proj>".
    func projectName(for path: String) -> String {
        if path == globalPath { return t("globalConfig") }
        let url = URL(fileURLWithPath: path)
        let parent = url.deletingLastPathComponent()
        if parent.lastPathComponent == ".claude" {
            let proj = parent.deletingLastPathComponent().lastPathComponent
            return proj.isEmpty ? parent.lastPathComponent : proj
        }
        return parent.lastPathComponent
    }

    func loadRecents() {
        recentPaths = UserDefaults.standard.stringArray(forKey: recentsKey) ?? []
    }

    private func addRecent(_ path: String) {
        var paths = UserDefaults.standard.stringArray(forKey: recentsKey) ?? []
        paths.removeAll { $0 == path }
        paths.insert(path, at: 0)
        if paths.count > 15 { paths = Array(paths.prefix(15)) }
        UserDefaults.standard.set(paths, forKey: recentsKey)
        recentPaths = paths
    }

    func removeRecent(_ path: String) {
        var paths = UserDefaults.standard.stringArray(forKey: recentsKey) ?? []
        paths.removeAll { $0 == path }
        UserDefaults.standard.set(paths, forKey: recentsKey)
        recentPaths = paths
    }

    /// Projects shown in the sidebar: Global pinned first, then recents.
    var projectPaths: [String] {
        [globalPath] + recentPaths.filter { $0 != globalPath }
    }

    /// Full parsed settings tree; preserves unknown keys & ordering.
    private var root: JSONValue = .object(JSONObject())

    // MARK: - Localization helper

    func t(_ key: String, _ params: [String: String] = [:]) -> String {
        L10n.string(key, lang: lang, params: params)
    }

    // MARK: - Root accessors

    private var rootObject: JSONObject {
        get { root.objectValue ?? JSONObject() }
        set { root = .object(newValue) }
    }

    private func env() -> JSONObject {
        rootObject["env"]?.objectValue ?? JSONObject()
    }

    private func tmp() -> JSONObject {
        rootObject["tmp"]?.objectValue ?? JSONObject()
    }

    // MARK: - Toast / Alert / Prompt

    func showToast(_ message: String, _ kind: ToastKind = .info, duration: Double = 3.0) {
        let toast = Toast(message: message, kind: kind)
        toasts.append(toast)
        DispatchQueue.main.asyncAfter(deadline: .now() + duration) { [weak self] in
            self?.toasts.removeAll { $0.id == toast.id }
        }
    }

    private func confirm(_ message: String, _ title: String, isDanger: Bool = false,
                         onConfirm: @escaping () -> Void) {
        alert = AlertRequest(
            title: title, message: message, isDanger: isDanger,
            confirmLabel: t("confirm"), cancelLabel: t("cancel"),
            onConfirm: onConfirm, onCancel: {})
    }

    private func requestPrompt(_ title: String, onConfirm: @escaping (String) -> Void) {
        prompt = PromptRequest(title: title, placeholder: t("promptPlaceholder"), onConfirm: onConfirm)
    }

    // MARK: - Startup

    private var didStartup = false

    func checkDefaultSettings() {
        guard !didStartup else { return }
        didStartup = true
        loadRecents()
        let home = FileManager.default.homeDirectoryForCurrentUser
        let path = home.appendingPathComponent(".claude/settings.json").path
        guard FileManager.default.fileExists(atPath: path) else { return }
        confirm(t("defaultPathFound", ["path": path]), t("defaultPathTitle")) { [weak self] in
            self?.loadSettings(path: path)
        }
    }

    func loadSettings(path: String) {
        let content: String
        do {
            content = try String(contentsOfFile: path, encoding: .utf8)
        } catch {
            showToast(t("readFileFailed") + error.localizedDescription, .error)
            return
        }
        let parsed: JSONValue
        do {
            parsed = try JSONValue.parse(content)
        } catch {
            showToast(t("parseFileFailed") + error.localizedDescription, .error)
            return
        }

        var obj = parsed.objectValue ?? JSONObject()
        if obj["env"]?.objectValue == nil { obj["env"] = .object(JSONObject()) }
        if obj["tmp"]?.objectValue == nil { obj["tmp"] = .object(JSONObject()) }
        root = .object(obj)
        filePath = path

        let tmpObj = tmp()
        if let v = tmpObj["APP_LANG"]?.stringValue, let l = Lang(rawValue: v) { lang = l }
        if let v = tmpObj["APP_THEME_COLOR"]?.stringValue, let c = ThemeColor(rawValue: v) { themeColor = c }
        if let v = tmpObj["APP_THEME_MODE"]?.stringValue, let m = ThemeMode(rawValue: v) { themeMode = m }

        // Extract providers from tmp keys
        var providerSet: [String] = []
        var seen = Set<String>()
        let suffixes = ConfigField.allCases.map { "-\($0.rawValue)" }
        for key in tmpObj.keys {
            for suffix in suffixes where key.hasSuffix(suffix) {
                let name = String(key.dropLast(suffix.count))
                if !name.hasPrefix("APP_") && !seen.contains(name) {
                    seen.insert(name)
                    providerSet.append(name)
                }
                break
            }
        }

        providers = [SettingsConstants.defaultProvider] + providerSet
        activeProvider = SettingsConstants.defaultProvider
        loadProviderConfig(SettingsConstants.defaultProvider)
        isLoaded = true
        addRecent(path)

        // Welcome / unsaved detection
        let skipWelcome = tmpObj.contains("APP_SKIP_WELCOME")
        if !skipWelcome {
            if checkFirstTimeUser() {
                showWelcomeCard = true
            } else if checkUnsavedProviderConfig() {
                showUnsavedPrompt = true
            }
        }
    }

    func openFilePanel() {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.allowedContentTypes = [.json]
        if panel.runModal() == .OK, let url = panel.url {
            loadSettings(path: url.path)
        }
    }

    // MARK: - Welcome detection

    private func checkFirstTimeUser() -> Bool {
        let token = env()["ANTHROPIC_AUTH_TOKEN"]?.stringValue ?? ""
        return token.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func checkUnsavedProviderConfig() -> Bool {
        let envObj = env()
        let tmpObj = tmp()
        let hasEnvToken = !(envObj["ANTHROPIC_AUTH_TOKEN"]?.stringValue ?? "").trimmingCharacters(in: .whitespaces).isEmpty
        let hasActiveProvider = tmpObj.contains("CURRENT_ACTIVE_PROVIDER")
        let hasAnyProviderConfig = tmpObj.keys.contains { key in
            key.hasSuffix("-ANTHROPIC_AUTH_TOKEN") && !key.hasPrefix("APP_")
                && !(tmpObj[key]?.stringValue ?? "").isEmpty
        }
        return hasEnvToken && !hasActiveProvider && !hasAnyProviderConfig
    }

    // MARK: - Load a provider's config into the editing form

    private func loadProviderConfig(_ provider: String) {
        let envObj = env()
        let tmpObj = tmp()

        if provider == SettingsConstants.defaultProvider {
            var c = ProviderConfig()
            c.authToken = envObj["ANTHROPIC_AUTH_TOKEN"]?.stringValue ?? ""
            c.baseUrl = envObj["ANTHROPIC_BASE_URL"]?.stringValue ?? ""
            c.apiTimeoutMs = envObj["API_TIMEOUT_MS"]?.stringValue ?? "3000000"
            c.disableNonessentialTraffic = envObj["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"]?.intValue ?? 1
            c.haikuModel = envObj["ANTHROPIC_DEFAULT_HAIKU_MODEL"]?.stringValue ?? ""
            c.sonnetModel = envObj["ANTHROPIC_DEFAULT_SONNET_MODEL"]?.stringValue ?? ""
            c.opusModel = envObj["ANTHROPIC_DEFAULT_OPUS_MODEL"]?.stringValue ?? ""
            if let activeProv = tmpObj["CURRENT_ACTIVE_PROVIDER"]?.stringValue {
                c.supportedModels = tmpObj["\(activeProv)-SUPPORTED_MODELS"]?.stringValue ?? ""
            }
            config = c
            return
        }

        func tmpStr(_ field: ConfigField) -> String {
            tmpObj["\(provider)-\(field.rawValue)"]?.stringValue ?? ""
        }
        var c = ProviderConfig()
        c.authToken = tmpStr(.authToken)
        c.baseUrl = tmpStr(.baseUrl)
        c.apiTimeoutMs = tmpObj["\(provider)-\(ConfigField.apiTimeoutMs.rawValue)"]?.stringValue ?? "3000000"
        c.disableNonessentialTraffic = tmpObj["\(provider)-\(ConfigField.disableTraffic.rawValue)"]?.intValue ?? 1
        c.haikuModel = tmpStr(.haikuModel)
        c.sonnetModel = tmpStr(.sonnetModel)
        c.opusModel = tmpStr(.opusModel)
        c.supportedModels = tmpStr(.supportedModels)
        config = c
    }

    // MARK: - Persist editing form back into the tree (in-memory)

    private func applyConfigToTree() {
        var obj = rootObject
        var envObj = obj["env"]?.objectValue ?? JSONObject()
        var tmpObj = obj["tmp"]?.objectValue ?? JSONObject()

        // App preferences
        tmpObj["APP_LANG"] = .string(lang.rawValue)
        tmpObj["APP_THEME_COLOR"] = .string(themeColor.rawValue)
        tmpObj["APP_THEME_MODE"] = .string(themeMode.rawValue)

        if activeProvider == SettingsConstants.defaultProvider {
            envObj["ANTHROPIC_AUTH_TOKEN"] = .string(config.authToken)
            envObj["ANTHROPIC_BASE_URL"] = .string(config.baseUrl)
            envObj["API_TIMEOUT_MS"] = .string(config.apiTimeoutMs)
            envObj["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = .number(String(config.disableNonessentialTraffic))
            envObj["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = .string(config.haikuModel)
            envObj["ANTHROPIC_DEFAULT_SONNET_MODEL"] = .string(config.sonnetModel)
            envObj["ANTHROPIC_DEFAULT_OPUS_MODEL"] = .string(config.opusModel)
            if let activeProv = tmpObj["CURRENT_ACTIVE_PROVIDER"]?.stringValue {
                tmpObj["\(activeProv)-ANTHROPIC_DEFAULT_HAIKU_MODEL"] = .string(config.haikuModel)
                tmpObj["\(activeProv)-ANTHROPIC_DEFAULT_SONNET_MODEL"] = .string(config.sonnetModel)
                tmpObj["\(activeProv)-ANTHROPIC_DEFAULT_OPUS_MODEL"] = .string(config.opusModel)
            }
        } else {
            let p = activeProvider
            tmpObj["\(p)-ANTHROPIC_AUTH_TOKEN"] = .string(config.authToken)
            tmpObj["\(p)-ANTHROPIC_BASE_URL"] = .string(config.baseUrl)
            tmpObj["\(p)-API_TIMEOUT_MS"] = .string(config.apiTimeoutMs)
            tmpObj["\(p)-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = .number(String(config.disableNonessentialTraffic))
            tmpObj["\(p)-ANTHROPIC_DEFAULT_HAIKU_MODEL"] = .string(config.haikuModel)
            tmpObj["\(p)-ANTHROPIC_DEFAULT_SONNET_MODEL"] = .string(config.sonnetModel)
            tmpObj["\(p)-ANTHROPIC_DEFAULT_OPUS_MODEL"] = .string(config.opusModel)
            tmpObj["\(p)-SUPPORTED_MODELS"] = .string(config.supportedModels)
        }

        obj["env"] = .object(envObj)
        obj["tmp"] = .object(tmpObj)
        root = .object(obj)
    }

    // MARK: - Provider switching

    func switchProvider(_ newProvider: String) {
        guard isLoaded else { return }
        applyConfigToTree()
        activeProvider = newProvider
        loadProviderConfig(newProvider)
    }

    func requestSwitchToActiveProvider() {
        guard let target = tmp()["CURRENT_ACTIVE_PROVIDER"]?.stringValue else { return }
        confirm(t("switchProviderConfirm", ["provider": target]), t("switchProviderTitle")) { [weak self] in
            self?.switchProvider(target)
        }
    }

    /// Called when a read-only field is tapped in the active-env view.
    func handleReadonlyTap(messageKey: String) {
        guard activeProvider == SettingsConstants.defaultProvider,
              let target = tmp()["CURRENT_ACTIVE_PROVIDER"]?.stringValue else { return }
        confirm(t(messageKey, ["provider": target]), t("hint")) { [weak self] in
            self?.switchProvider(target)
        }
    }

    func addNewProvider() {
        requestPrompt(t("newProviderPrompt")) { [weak self] name in
            guard let self else { return }
            let trimmed = name.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty, !self.providers.contains(trimmed) else { return }
            self.applyConfigToTree()
            self.providers.append(trimmed)
            self.activeProvider = trimmed
            self.config = ProviderConfig()
        }
    }

    // MARK: - Models management

    func addModel(_ name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        var models = config.modelOptions
        if !models.contains(trimmed) {
            models.append(trimmed)
            config.supportedModels = models.joined(separator: ",")
        }
    }

    func removeModel(_ name: String) {
        let models = config.modelOptions.filter { $0 != name }
        config.supportedModels = models.joined(separator: ",")
    }

    // MARK: - File writing

    @discardableResult
    private func writeToFile() -> Bool {
        guard !filePath.isEmpty else { return false }
        let text = root.serializedPretty()
        do {
            try text.write(toFile: filePath, atomically: true, encoding: .utf8)
            return true
        } catch {
            showToast(t("saveFileFailed") + error.localizedDescription, .error)
            return false
        }
    }

    func saveToFile() {
        guard isLoaded else { return }
        applyConfigToTree()
        isSaving = true
        if writeToFile() {
            showToast(t("saveSuccess"), .success)
        }
        isSaving = false
    }

    func applyAsEnv() {
        guard isLoaded, !filePath.isEmpty else { return }
        confirm(t("applyConfirm", ["provider": activeProvider]), t("applyTitle")) { [weak self] in
            guard let self else { return }
            self.applyConfigToTree()
            var obj = self.rootObject
            var tmpObj = obj["tmp"]?.objectValue ?? JSONObject()
            var envObj = obj["env"]?.objectValue ?? JSONObject()
            tmpObj["CURRENT_ACTIVE_PROVIDER"] = .string(self.activeProvider)
            envObj["ANTHROPIC_AUTH_TOKEN"] = .string(self.config.authToken)
            envObj["ANTHROPIC_BASE_URL"] = .string(self.config.baseUrl)
            envObj["API_TIMEOUT_MS"] = .string(self.config.apiTimeoutMs)
            envObj["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = .number(String(self.config.disableNonessentialTraffic))
            envObj["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = .string(self.config.haikuModel)
            envObj["ANTHROPIC_DEFAULT_SONNET_MODEL"] = .string(self.config.sonnetModel)
            envObj["ANTHROPIC_DEFAULT_OPUS_MODEL"] = .string(self.config.opusModel)
            obj["tmp"] = .object(tmpObj)
            obj["env"] = .object(envObj)
            self.root = .object(obj)

            self.isSaving = true
            if self.writeToFile() {
                self.showToast(self.t("applySuccess"), .success)
                self.activeProvider = SettingsConstants.defaultProvider
                self.loadProviderConfig(SettingsConstants.defaultProvider)
            }
            self.isSaving = false
        }
    }

    func deleteProvider() {
        guard activeProvider != SettingsConstants.defaultProvider else { return }
        let target = activeProvider
        confirm(t("deleteConfirm", ["provider": target]), t("deleteTitle"), isDanger: true) { [weak self] in
            guard let self else { return }
            var obj = self.rootObject
            var tmpObj = obj["tmp"]?.objectValue ?? JSONObject()
            for key in tmpObj.keys where key.hasPrefix("\(target)-") {
                tmpObj.remove(key)
            }
            if tmpObj["CURRENT_ACTIVE_PROVIDER"]?.stringValue == target {
                tmpObj.remove("CURRENT_ACTIVE_PROVIDER")
            }
            obj["tmp"] = .object(tmpObj)
            self.root = .object(obj)
            self.providers.removeAll { $0 == target }
            self.activeProvider = SettingsConstants.defaultProvider
            self.loadProviderConfig(SettingsConstants.defaultProvider)
        }
    }

    // MARK: - Preferences (saved immediately)

    func savePreferences() {
        guard isLoaded, !filePath.isEmpty else { return }
        var obj = rootObject
        var tmpObj = obj["tmp"]?.objectValue ?? JSONObject()
        tmpObj["APP_LANG"] = .string(lang.rawValue)
        tmpObj["APP_THEME_COLOR"] = .string(themeColor.rawValue)
        tmpObj["APP_THEME_MODE"] = .string(themeMode.rawValue)
        obj["tmp"] = .object(tmpObj)
        root = .object(obj)
        writeToFile()
    }

    var currentActiveProvider: String? {
        tmp()["CURRENT_ACTIVE_PROVIDER"]?.stringValue
    }

    // MARK: - Welcome flow

    func completeWelcome(preset: ProviderPreset, apiKey: String) {
        let key = apiKey.trimmingCharacters(in: .whitespaces)
        guard isLoaded, !key.isEmpty else { return }
        let providerName = t(preset.nameKey)
        var obj = rootObject
        var tmpObj = obj["tmp"]?.objectValue ?? JSONObject()
        var envObj = obj["env"]?.objectValue ?? JSONObject()

        tmpObj["\(providerName)-ANTHROPIC_AUTH_TOKEN"] = .string(key)
        if !preset.baseUrl.isEmpty {
            tmpObj["\(providerName)-ANTHROPIC_BASE_URL"] = .string(preset.baseUrl)
        }
        if !preset.defaultModels.isEmpty {
            tmpObj["\(providerName)-SUPPORTED_MODELS"] = .string(preset.defaultModels.joined(separator: ","))
        }
        tmpObj["\(providerName)-API_TIMEOUT_MS"] = .string("3000000")
        tmpObj["\(providerName)-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = .number("1")
        tmpObj["CURRENT_ACTIVE_PROVIDER"] = .string(providerName)
        tmpObj["APP_SKIP_WELCOME"] = .number("1")
        envObj["ANTHROPIC_AUTH_TOKEN"] = .string(key)
        if !preset.baseUrl.isEmpty {
            envObj["ANTHROPIC_BASE_URL"] = .string(preset.baseUrl)
        }

        obj["tmp"] = .object(tmpObj)
        obj["env"] = .object(envObj)
        root = .object(obj)

        if writeToFile() {
            providers = [SettingsConstants.defaultProvider, providerName]
            activeProvider = SettingsConstants.defaultProvider
            loadProviderConfig(SettingsConstants.defaultProvider)
            showWelcomeCard = false
            showToast(t("saveSuccess"), .success)
        }
    }

    func saveUnsavedAsProvider(_ providerName: String) {
        let name = providerName.trimmingCharacters(in: .whitespaces)
        guard isLoaded, !name.isEmpty else { return }
        var obj = rootObject
        var tmpObj = obj["tmp"]?.objectValue ?? JSONObject()

        tmpObj["\(name)-ANTHROPIC_AUTH_TOKEN"] = .string(config.authToken)
        if !config.baseUrl.isEmpty { tmpObj["\(name)-ANTHROPIC_BASE_URL"] = .string(config.baseUrl) }
        tmpObj["\(name)-API_TIMEOUT_MS"] = .string(config.apiTimeoutMs)
        tmpObj["\(name)-CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = .number(String(config.disableNonessentialTraffic))
        if !config.haikuModel.isEmpty { tmpObj["\(name)-ANTHROPIC_DEFAULT_HAIKU_MODEL"] = .string(config.haikuModel) }
        if !config.sonnetModel.isEmpty { tmpObj["\(name)-ANTHROPIC_DEFAULT_SONNET_MODEL"] = .string(config.sonnetModel) }
        if !config.opusModel.isEmpty { tmpObj["\(name)-ANTHROPIC_DEFAULT_OPUS_MODEL"] = .string(config.opusModel) }
        if !config.supportedModels.isEmpty { tmpObj["\(name)-SUPPORTED_MODELS"] = .string(config.supportedModels) }
        tmpObj["CURRENT_ACTIVE_PROVIDER"] = .string(name)

        obj["tmp"] = .object(tmpObj)
        root = .object(obj)

        if writeToFile() {
            providers.append(name)
            showUnsavedPrompt = false
            showToast(t("saveAsProviderSuccess", ["provider": name]), .success)
        }
    }

    func skipWelcome() {
        guard isLoaded else { return }
        var obj = rootObject
        var tmpObj = obj["tmp"]?.objectValue ?? JSONObject()
        tmpObj["APP_SKIP_WELCOME"] = .number("1")
        obj["tmp"] = .object(tmpObj)
        root = .object(obj)
        writeToFile()
        showWelcomeCard = false
    }
}
