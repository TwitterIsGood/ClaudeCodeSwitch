import SwiftUI

enum ThemeColor: String, CaseIterable, Identifiable {
    case blue, green, purple, red, teal
    var id: String { rawValue }

    /// Accent swatch matching the original Material light-primary tones.
    var color: Color {
        switch self {
        case .blue:   return Color(red: 0x00 / 255, green: 0x61 / 255, blue: 0xa4 / 255)
        case .green:  return Color(red: 0x00 / 255, green: 0x6e / 255, blue: 0x1c / 255)
        case .purple: return Color(red: 0x67 / 255, green: 0x50 / 255, blue: 0xa4 / 255)
        case .red:    return Color(red: 0xc0 / 255, green: 0x00 / 255, blue: 0x11 / 255)
        case .teal:   return Color(red: 0x00 / 255, green: 0x6a / 255, blue: 0x6a / 255)
        }
    }
}

enum ThemeMode: String, CaseIterable, Identifiable {
    case system, light, dark
    var id: String { rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light:  return .light
        case .dark:   return .dark
        }
    }

    var labelKey: String {
        switch self {
        case .system: return "systemMode"
        case .light:  return "lightMode"
        case .dark:   return "darkMode"
        }
    }
}
