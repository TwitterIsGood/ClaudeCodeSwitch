import SwiftUI

@main
struct ClaudeSwitchApp: App {
    @StateObject private var store = SettingsStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(store.themeMode.colorScheme)
                .onAppear { store.checkDefaultSettings() }
        }
        .defaultSize(width: 880, height: 720)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }

        Settings {
            SettingsView()
                .environmentObject(store)
                .preferredColorScheme(store.themeMode.colorScheme)
        }
    }
}
