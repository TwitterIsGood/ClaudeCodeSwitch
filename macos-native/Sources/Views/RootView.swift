import SwiftUI

struct RootView: View {
    @EnvironmentObject var store: SettingsStore

    private var selection: Binding<String?> {
        Binding(
            get: { store.isLoaded ? store.activeProvider : nil },
            set: { if let v = $0 { store.switchProvider(v) } })
    }

    var body: some View {
        NavigationSplitView {
            sidebar
        } detail: {
            detail
                .frame(minWidth: 520, minHeight: 520)
        }
        .overlay(alignment: .top) { ToastOverlay() }
        .alert(item: $store.alert) { req in
            if req.isDanger {
                return Alert(
                    title: Text(req.title), message: Text(req.message),
                    primaryButton: .destructive(Text(req.confirmLabel)) { req.onConfirm() },
                    secondaryButton: .cancel(Text(req.cancelLabel)) { req.onCancel() })
            } else {
                return Alert(
                    title: Text(req.title), message: Text(req.message),
                    primaryButton: .default(Text(req.confirmLabel)) { req.onConfirm() },
                    secondaryButton: .cancel(Text(req.cancelLabel)) { req.onCancel() })
            }
        }
        .sheet(item: $store.prompt) { req in
            PromptSheet(request: req).environmentObject(store)
        }
    }

    // MARK: - Sidebar (projects + providers)

    private var sidebar: some View {
        List(selection: selection) {
            Section(store.t("navProjects")) {
                ForEach(store.projectPaths, id: \.self) { path in
                    projectRow(path)
                }
            }

            if store.isLoaded {
                Section(store.t("navProviders")) {
                    ForEach(store.providers, id: \.self) { provider in
                        providerRow(provider).tag(Optional(provider))
                    }
                }
            }
        }
        .navigationSplitViewColumnWidth(min: 225, ideal: 250, max: 340)
        .safeAreaInset(edge: .bottom) {
            if store.isLoaded {
                HStack {
                    Button {
                        store.addNewProvider()
                    } label: {
                        Label(store.t("add"), systemImage: "plus")
                    }
                    .buttonStyle(.borderless)
                    Spacer()
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.bar)
            }
        }
    }

    @ViewBuilder
    private func projectRow(_ path: String) -> some View {
        let isCurrent = path == store.filePath
        let isGlobal = path == store.globalPath
        Button {
            if path != store.filePath { store.loadSettings(path: path) }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: isGlobal ? "globe" : "folder")
                    .foregroundStyle(.secondary)
                Text(store.projectName(for: path))
                    .fontWeight(isCurrent ? .semibold : .regular)
                    .lineLimit(1)
                Spacer()
                if isCurrent {
                    Image(systemName: "checkmark")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.tint)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(path)
        .contextMenu {
            if !isGlobal {
                Button(store.t("removeFromRecents"), role: .destructive) {
                    store.removeRecent(path)
                }
            }
        }
    }

    @ViewBuilder
    private func providerRow(_ provider: String) -> some View {
        let isDefault = provider == SettingsConstants.defaultProvider
        let isActive = !isDefault && provider == store.currentActiveProvider
        HStack(spacing: 8) {
            Image(systemName: isDefault ? "bolt.fill" : "cloud")
                .foregroundStyle(.secondary)
            Text(isDefault ? store.t("currentActive") : provider)
                .lineLimit(1)
            Spacer()
            if isActive {
                Text(store.t("activeBadge"))
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(Color.green, in: Capsule())
                    .foregroundStyle(.white)
            }
        }
    }

    // MARK: - Detail

    @ViewBuilder
    private var detail: some View {
        if store.showWelcomeCard {
            WelcomeView()
                .toolbar { openFileToolbarItem }
        } else if store.isLoaded {
            ProviderDetailView()
        } else {
            ContentUnavailableView {
                Label(store.t("appTitle"), systemImage: "slider.horizontal.3")
            } description: {
                Text(store.t("filePlaceholder"))
            } actions: {
                Button {
                    store.openFilePanel()
                } label: {
                    Label(store.t("selectFile"), systemImage: "folder")
                }
                .buttonStyle(.borderedProminent)
            }
            .toolbar { openFileToolbarItem }
        }
    }

    private var openFileToolbarItem: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Button {
                store.openFilePanel()
            } label: {
                Label(store.t("selectFile"), systemImage: "folder")
            }
            .help(store.t("selectFile"))
        }
    }
}
