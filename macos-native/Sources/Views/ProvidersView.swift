import SwiftUI

struct ProviderDetailView: View {
    @EnvironmentObject var store: SettingsStore
    @State private var newModelInput: String = ""

    private var isDefault: Bool { store.activeProvider == SettingsConstants.defaultProvider }
    private var titleText: String {
        isDefault ? store.t("currentActive") : store.activeProvider
    }

    var body: some View {
        Form {
            if store.showUnsavedPrompt {
                Section {
                    Button {
                        store.prompt = PromptRequest(
                            title: store.t("saveAsProviderPrompt"),
                            placeholder: store.t("promptPlaceholder")) { name in
                                store.saveUnsavedAsProvider(name)
                            }
                    } label: {
                        Label(store.t("saveAsProvider"), systemImage: "square.and.arrow.down")
                    }
                    Button(store.t("dismissHint"), role: .cancel) {
                        store.showUnsavedPrompt = false
                    }
                } header: {
                    Text(store.t("unsavedConfigTitle"))
                } footer: {
                    Text(store.t("unsavedConfigDesc"))
                }
            }

            Section {
                if isDefault {
                    LabeledContent("API Key") {
                        Text(maskedToken).foregroundStyle(.secondary)
                    }
                    LabeledContent("Base URL") {
                        Text(store.config.baseUrl.isEmpty ? "—" : store.config.baseUrl)
                            .foregroundStyle(.secondary)
                    }
                    if let active = store.currentActiveProvider {
                        LabeledContent(store.t("sourceProvider")) {
                            Button {
                                store.requestSwitchToActiveProvider()
                            } label: {
                                HStack(spacing: 3) {
                                    Text(active)
                                    Image(systemName: "chevron.right").font(.caption2)
                                }
                            }
                            .buttonStyle(.link)
                        }
                    }
                } else {
                    SecureField("API Key", text: $store.config.authToken, prompt: Text("sk-..."))
                    TextField("Base URL", text: $store.config.baseUrl,
                              prompt: Text("https://api.anthropic.com/"))
                }
            } header: {
                Text("API")
            } footer: {
                if isDefault, store.currentActiveProvider != nil {
                    Text(store.t("readonlyFooter"))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            Section {
                modelPickerRow(label: "Opus", binding: $store.config.opusModel, placeholderKey: "opusPlaceholder")
                modelPickerRow(label: "Sonnet", binding: $store.config.sonnetModel, placeholderKey: "sonnetPlaceholder")
                modelPickerRow(label: "Haiku", binding: $store.config.haikuModel, placeholderKey: "haikuPlaceholder")
            } header: {
                Text("Models")
            }

            if !isDefault {
                Section(store.t("modelList")) {
                    ForEach(store.config.modelOptions, id: \.self) { model in
                        HStack {
                            Image(systemName: "cube").foregroundStyle(.secondary)
                            Text(model)
                            Spacer()
                            Button(role: .destructive) {
                                store.removeModel(model)
                            } label: {
                                Image(systemName: "minus.circle.fill").foregroundStyle(.red)
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                    HStack {
                        TextField(store.t("modelInputPlaceholder"), text: $newModelInput)
                            .onSubmit(addModel)
                        Button(store.t("addModel"), action: addModel)
                            .disabled(newModelInput.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
        }
        .formStyle(.grouped)
        .navigationTitle(titleText)
        .navigationSubtitle(subtitle)
        .toolbar {
            if isDefault {
                if store.currentActiveProvider != nil {
                    ToolbarItem {
                        Button {
                            store.requestSwitchToActiveProvider()
                        } label: {
                            Label(store.t("switchProviderTitle"), systemImage: "pencil")
                        }
                        .help(store.t("switchProviderTitle"))
                    }
                }
            } else {
                ToolbarItem {
                    Button(role: .destructive) {
                        store.deleteProvider()
                    } label: {
                        Label(store.t("delete"), systemImage: "trash")
                    }
                    .help(store.t("delete"))
                }
                ToolbarItem {
                    Button {
                        store.applyAsEnv()
                    } label: {
                        Label(store.t("applyToEnv"), systemImage: "checkmark.circle")
                    }
                    .disabled(store.isSaving)
                    .help(store.t("applyToEnv"))
                }
            }
            ToolbarItem(placement: .primaryAction) {
                Button {
                    store.saveToFile()
                } label: {
                    Label(store.isSaving ? store.t("saving") : store.t("save"),
                          systemImage: "square.and.arrow.down")
                }
                .keyboardShortcut("s", modifiers: .command)
                .disabled(store.isSaving)
            }
            ToolbarItem {
                Button {
                    store.openFilePanel()
                } label: {
                    Label(store.t("selectFile"), systemImage: "folder")
                }
                .help(store.t("selectFile"))
            }
        }
    }

    private var maskedToken: String {
        let t = store.config.authToken
        guard !t.isEmpty else { return "—" }
        return String(repeating: "•", count: min(t.count, 12))
    }

    private var subtitle: String {
        guard !store.filePath.isEmpty else { return "" }
        return (store.filePath as NSString).abbreviatingWithTildeInPath
    }

    private func addModel() {
        store.addModel(newModelInput)
        newModelInput = ""
    }

    @ViewBuilder
    private func modelPickerRow(label: String, binding: Binding<String>, placeholderKey: String) -> some View {
        let options = store.config.modelOptions
        if options.isEmpty {
            TextField(label, text: binding, prompt: Text(store.t(placeholderKey)))
        } else {
            Picker(label, selection: binding) {
                Text(store.t("selectPlaceholder")).tag("")
                if !binding.wrappedValue.isEmpty && !options.contains(binding.wrappedValue) {
                    Text("\(binding.wrappedValue) \(store.t("modelNotInList"))").tag(binding.wrappedValue)
                }
                ForEach(options, id: \.self) { model in
                    Text(model).tag(model)
                }
            }
        }
    }
}
