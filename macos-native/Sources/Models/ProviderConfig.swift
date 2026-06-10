import Foundation

struct ProviderConfig {
    var authToken: String = ""
    var baseUrl: String = ""
    var apiTimeoutMs: String = "3000000"
    var disableNonessentialTraffic: Int = 1
    var haikuModel: String = ""
    var sonnetModel: String = ""
    var opusModel: String = ""
    var supportedModels: String = ""

    var modelOptions: [String] {
        ProviderConfig.parseModels(supportedModels)
    }

    static func parseModels(_ raw: String) -> [String] {
        raw.split(whereSeparator: { $0 == "\n" || $0 == "," })
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }
}

/// Field name suffixes used to namespace provider configs inside `tmp`.
enum ConfigField: String, CaseIterable {
    case authToken = "ANTHROPIC_AUTH_TOKEN"
    case baseUrl = "ANTHROPIC_BASE_URL"
    case apiTimeoutMs = "API_TIMEOUT_MS"
    case disableTraffic = "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"
    case haikuModel = "ANTHROPIC_DEFAULT_HAIKU_MODEL"
    case sonnetModel = "ANTHROPIC_DEFAULT_SONNET_MODEL"
    case opusModel = "ANTHROPIC_DEFAULT_OPUS_MODEL"
    case supportedModels = "SUPPORTED_MODELS"
}

enum SettingsConstants {
    static let defaultProvider = "默认(Anthropic)"
}
