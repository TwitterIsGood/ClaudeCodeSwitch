import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject var store: SettingsStore
    @State private var selectedPreset: PresetId?
    @State private var apiKey: String = ""
    @State private var step: Step = .select

    enum Step { case select, configure }

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 14)]

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 10) {
                    Image(systemName: "hand.wave.fill")
                        .font(.system(size: 46))
                        .foregroundStyle(.tint)
                        .symbolRenderingMode(.hierarchical)
                    Text(store.t("welcomeTitle")).font(.title.bold())
                    Text(store.t("welcomeSubtitle")).font(.title3).foregroundStyle(.secondary)
                    Text(store.t("welcomeDescription"))
                        .font(.callout).foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: 420)
                }
                .padding(.top, 40)

                if step == .select {
                    LazyVGrid(columns: columns, spacing: 14) {
                        ForEach(providerPresets) { preset in
                            Button {
                                selectedPreset = preset.id
                                step = .configure
                            } label: {
                                VStack(spacing: 10) {
                                    Image(systemName: preset.systemImage)
                                        .font(.system(size: 30))
                                        .foregroundStyle(.tint)
                                        .symbolRenderingMode(.hierarchical)
                                    Text(store.t(preset.nameKey)).font(.headline)
                                    Text(store.t(preset.descKey))
                                        .font(.caption).foregroundStyle(.secondary)
                                        .multilineTextAlignment(.center)
                                }
                                .frame(maxWidth: .infinity, minHeight: 120)
                                .padding(16)
                                .background(.background.secondary, in: RoundedRectangle(cornerRadius: 14))
                                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(.quaternary))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .frame(maxWidth: 560)

                    Button(store.t("skipSetup")) { store.skipWelcome() }
                        .buttonStyle(.link)
                } else if let presetId = selectedPreset,
                          let preset = providerPresets.first(where: { $0.id == presetId }) {
                    VStack(spacing: 18) {
                        HStack(spacing: 10) {
                            Image(systemName: preset.systemImage)
                                .font(.title).foregroundStyle(.tint)
                                .symbolRenderingMode(.hierarchical)
                            Text(store.t(preset.nameKey)).font(.title2.bold())
                        }
                        Form {
                            SecureField("API Key", text: $apiKey, prompt: Text(store.t("enterApiKey")))
                        }
                        .formStyle(.grouped)
                        .frame(maxWidth: 460, maxHeight: 90)
                        HStack {
                            Button {
                                step = .select
                                apiKey = ""
                            } label: {
                                Label(store.t("back"), systemImage: "arrow.left")
                            }
                            Spacer()
                            Button {
                                store.completeWelcome(preset: preset, apiKey: apiKey)
                            } label: {
                                Label(store.t("setupComplete"), systemImage: "checkmark")
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(apiKey.trimmingCharacters(in: .whitespaces).isEmpty)
                        }
                        .frame(maxWidth: 460)
                    }
                }
                Spacer(minLength: 30)
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 24)
        }
        .navigationTitle(store.t("appTitle"))
    }
}
