import Foundation

/// Order-preserving JSON value model.
/// Round-trips `settings.json` without dropping unknown keys or reordering existing ones,
/// matching JavaScript `JSON.stringify(obj, null, 2)` output closely.
indirect enum JSONValue {
    case null
    case bool(Bool)
    case number(String)   // original literal preserved
    case string(String)
    case array([JSONValue])
    case object(JSONObject)
}

/// An ordered string-keyed object. Preserves insertion order; updating an existing
/// key keeps its original position.
struct JSONObject {
    private(set) var keys: [String] = []
    private var map: [String: JSONValue] = [:]

    init() {}

    var isEmpty: Bool { keys.isEmpty }

    subscript(_ key: String) -> JSONValue? {
        get { map[key] }
        set {
            if let newValue {
                if map[key] == nil { keys.append(key) }
                map[key] = newValue
            } else {
                remove(key)
            }
        }
    }

    mutating func remove(_ key: String) {
        if map[key] != nil {
            map[key] = nil
            keys.removeAll { $0 == key }
        }
    }

    func contains(_ key: String) -> Bool { map[key] != nil }
}

// MARK: - Convenience accessors

extension JSONValue {
    var stringValue: String? {
        switch self {
        case .string(let s): return s
        case .number(let n): return n
        case .bool(let b): return b ? "true" : "false"
        default: return nil
        }
    }

    var objectValue: JSONObject? {
        if case .object(let o) = self { return o }
        return nil
    }

    /// Integer-ish value for fields like CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC.
    var intValue: Int? {
        switch self {
        case .number(let n): return Int(Double(n) ?? .nan)
        case .string(let s): return Int(s)
        default: return nil
        }
    }
}

// MARK: - Parsing

enum JSONParseError: Error, LocalizedError {
    case unexpected(String)
    var errorDescription: String? {
        if case .unexpected(let m) = self { return m }
        return "JSON parse error"
    }
}

extension JSONValue {
    static func parse(_ text: String) throws -> JSONValue {
        var parser = JSONParser(text)
        let value = try parser.parseValue()
        parser.skipWhitespace()
        if !parser.isAtEnd {
            throw JSONParseError.unexpected("Trailing characters after JSON value")
        }
        return value
    }
}

private struct JSONParser {
    private let scalars: [UnicodeScalar]
    private var index = 0

    init(_ text: String) {
        scalars = Array(text.unicodeScalars)
    }

    var isAtEnd: Bool { index >= scalars.count }

    private func peek() -> UnicodeScalar? { index < scalars.count ? scalars[index] : nil }

    private mutating func advance() -> UnicodeScalar {
        let s = scalars[index]; index += 1; return s
    }

    mutating func skipWhitespace() {
        while let c = peek(), c == " " || c == "\t" || c == "\n" || c == "\r" {
            index += 1
        }
    }

    mutating func parseValue() throws -> JSONValue {
        skipWhitespace()
        guard let c = peek() else { throw JSONParseError.unexpected("Unexpected end of input") }
        switch c {
        case "{": return try parseObject()
        case "[": return try parseArray()
        case "\"": return .string(try parseString())
        case "t", "f": return try parseBool()
        case "n": return try parseNull()
        default: return try parseNumber()
        }
    }

    private mutating func expect(_ ch: UnicodeScalar) throws {
        skipWhitespace()
        guard peek() == ch else {
            throw JSONParseError.unexpected("Expected '\(ch)'")
        }
        index += 1
    }

    private mutating func parseObject() throws -> JSONValue {
        try expect("{")
        var obj = JSONObject()
        skipWhitespace()
        if peek() == "}" { index += 1; return .object(obj) }
        while true {
            skipWhitespace()
            guard peek() == "\"" else { throw JSONParseError.unexpected("Expected object key") }
            let key = try parseString()
            try expect(":")
            let value = try parseValue()
            obj[key] = value
            skipWhitespace()
            let c = peek()
            if c == "," { index += 1; continue }
            if c == "}" { index += 1; break }
            throw JSONParseError.unexpected("Expected ',' or '}' in object")
        }
        return .object(obj)
    }

    private mutating func parseArray() throws -> JSONValue {
        try expect("[")
        var arr: [JSONValue] = []
        skipWhitespace()
        if peek() == "]" { index += 1; return .array(arr) }
        while true {
            let value = try parseValue()
            arr.append(value)
            skipWhitespace()
            let c = peek()
            if c == "," { index += 1; continue }
            if c == "]" { index += 1; break }
            throw JSONParseError.unexpected("Expected ',' or ']' in array")
        }
        return .array(arr)
    }

    private mutating func parseString() throws -> String {
        try expect("\"")
        var result = String.UnicodeScalarView()
        while true {
            guard !isAtEnd else { throw JSONParseError.unexpected("Unterminated string") }
            let c = advance()
            if c == "\"" { break }
            if c == "\\" {
                guard !isAtEnd else { throw JSONParseError.unexpected("Unterminated escape") }
                let esc = advance()
                switch esc {
                case "\"": result.append("\"")
                case "\\": result.append("\\")
                case "/": result.append("/")
                case "b": result.append(UnicodeScalar(0x08))
                case "f": result.append(UnicodeScalar(0x0C))
                case "n": result.append("\n")
                case "r": result.append("\r")
                case "t": result.append("\t")
                case "u":
                    let scalar = try parseUnicodeEscape()
                    result.append(scalar)
                default:
                    throw JSONParseError.unexpected("Invalid escape sequence")
                }
            } else {
                result.append(c)
            }
        }
        return String(result)
    }

    private mutating func parseUnicodeEscape() throws -> UnicodeScalar {
        func hex4() throws -> UInt32 {
            var value: UInt32 = 0
            for _ in 0..<4 {
                guard !isAtEnd else { throw JSONParseError.unexpected("Invalid \\u escape") }
                let c = advance()
                guard let digit = Character(c).hexDigitValue else {
                    throw JSONParseError.unexpected("Invalid hex digit")
                }
                value = value * 16 + UInt32(digit)
            }
            return value
        }
        let first = try hex4()
        // Surrogate pair handling
        if first >= 0xD800 && first <= 0xDBFF {
            if peek() == "\\" {
                index += 1
                guard peek() == "u" else { throw JSONParseError.unexpected("Expected low surrogate") }
                index += 1
                let second = try hex4()
                let combined = 0x10000 + ((first - 0xD800) << 10) + (second - 0xDC00)
                guard let scalar = UnicodeScalar(combined) else {
                    throw JSONParseError.unexpected("Invalid surrogate pair")
                }
                return scalar
            }
        }
        guard let scalar = UnicodeScalar(first) else {
            throw JSONParseError.unexpected("Invalid unicode scalar")
        }
        return scalar
    }

    private mutating func parseBool() throws -> JSONValue {
        if match("true") { return .bool(true) }
        if match("false") { return .bool(false) }
        throw JSONParseError.unexpected("Invalid literal")
    }

    private mutating func parseNull() throws -> JSONValue {
        if match("null") { return .null }
        throw JSONParseError.unexpected("Invalid literal")
    }

    private mutating func match(_ literal: String) -> Bool {
        let lit = Array(literal.unicodeScalars)
        guard index + lit.count <= scalars.count else { return false }
        for i in 0..<lit.count where scalars[index + i] != lit[i] { return false }
        index += lit.count
        return true
    }

    private mutating func parseNumber() throws -> JSONValue {
        let start = index
        if peek() == "-" { index += 1 }
        while let c = peek(), (c >= "0" && c <= "9") || c == "." || c == "e" || c == "E" || c == "+" || c == "-" {
            index += 1
        }
        guard index > start else { throw JSONParseError.unexpected("Invalid number") }
        let literal = String(String.UnicodeScalarView(scalars[start..<index]))
        guard Double(literal) != nil else { throw JSONParseError.unexpected("Invalid number: \(literal)") }
        return .number(literal)
    }
}

// MARK: - Serialization (matches JSON.stringify(obj, null, 2))

extension JSONValue {
    func serializedPretty() -> String {
        var out = ""
        write(into: &out, indentLevel: 0)
        return out
    }

    private func write(into out: inout String, indentLevel: Int) {
        switch self {
        case .null:
            out += "null"
        case .bool(let b):
            out += b ? "true" : "false"
        case .number(let n):
            out += n
        case .string(let s):
            out += JSONValue.escapeString(s)
        case .array(let arr):
            if arr.isEmpty { out += "[]"; return }
            let inner = String(repeating: "  ", count: indentLevel + 1)
            let outer = String(repeating: "  ", count: indentLevel)
            out += "[\n"
            for (i, v) in arr.enumerated() {
                out += inner
                v.write(into: &out, indentLevel: indentLevel + 1)
                out += i < arr.count - 1 ? ",\n" : "\n"
            }
            out += outer + "]"
        case .object(let obj):
            if obj.isEmpty { out += "{}"; return }
            let inner = String(repeating: "  ", count: indentLevel + 1)
            let outer = String(repeating: "  ", count: indentLevel)
            out += "{\n"
            for (i, key) in obj.keys.enumerated() {
                out += inner + JSONValue.escapeString(key) + ": "
                obj[key]!.write(into: &out, indentLevel: indentLevel + 1)
                out += i < obj.keys.count - 1 ? ",\n" : "\n"
            }
            out += outer + "}"
        }
    }

    static func escapeString(_ s: String) -> String {
        var result = "\""
        for scalar in s.unicodeScalars {
            switch scalar {
            case "\"": result += "\\\""
            case "\\": result += "\\\\"
            case "\n": result += "\\n"
            case "\r": result += "\\r"
            case "\t": result += "\\t"
            case UnicodeScalar(0x08): result += "\\b"
            case UnicodeScalar(0x0C): result += "\\f"
            default:
                if scalar.value < 0x20 {
                    result += String(format: "\\u%04x", scalar.value)
                } else {
                    result.unicodeScalars.append(scalar)
                }
            }
        }
        result += "\""
        return result
    }
}
