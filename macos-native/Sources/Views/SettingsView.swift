import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var store: SettingsStore

    var body: some View {
        Form {
            Section {
                Picker(store.t("language"), selection: Binding(
                    get: { store.lang },
                    set: { store.lang = $0; store.savePreferences() })) {
                        ForEach(Lang.allCases) { Text($0.displayName).tag($0) }
                    }

                Picker(store.t("appearance"), selection: Binding(
                    get: { store.themeMode },
                    set: { store.themeMode = $0; store.savePreferences() })) {
                        ForEach(ThemeMode.allCases) { Text(store.t($0.labelKey)).tag($0) }
                    }
            }
        }
        .formStyle(.grouped)
        .frame(width: 440, height: 170)
    }
}
