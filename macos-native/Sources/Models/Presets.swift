import Foundation

enum PresetId: String, CaseIterable, Identifiable {
    case anthropic, openrouter, azure, bedrock, custom
    var id: String { rawValue }
}

struct ProviderPreset: Identifiable {
    let id: PresetId
    let nameKey: String
    let descKey: String
    let systemImage: String   // SF Symbol
    let baseUrl: String
    let defaultModels: [String]
}

let providerPresets: [ProviderPreset] = [
    ProviderPreset(
        id: .anthropic, nameKey: "presetAnthropic", descKey: "presetAnthropicDesc",
        systemImage: "brain", baseUrl: "https://api.anthropic.com/",
        defaultModels: ["claude-3-opus-20240229", "claude-3-5-sonnet-20240620", "claude-3-haiku-20240307"]),
    ProviderPreset(
        id: .openrouter, nameKey: "presetOpenRouter", descKey: "presetOpenRouterDesc",
        systemImage: "arrow.triangle.branch", baseUrl: "https://openrouter.ai/api/v1/",
        defaultModels: ["anthropic/claude-3-opus", "anthropic/claude-3.5-sonnet", "anthropic/claude-3-haiku"]),
    ProviderPreset(
        id: .azure, nameKey: "presetAzure", descKey: "presetAzureDesc",
        systemImage: "cloud", baseUrl: "", defaultModels: []),
    ProviderPreset(
        id: .bedrock, nameKey: "presetBedrock", descKey: "presetBedrockDesc",
        systemImage: "server.rack", baseUrl: "", defaultModels: []),
    ProviderPreset(
        id: .custom, nameKey: "presetCustom", descKey: "presetCustomDesc",
        systemImage: "slider.horizontal.3", baseUrl: "", defaultModels: []),
]
