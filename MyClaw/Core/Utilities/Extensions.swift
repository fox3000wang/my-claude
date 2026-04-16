import Foundation
import CryptoKit
import UIKit

// MARK: - Data Extensions

extension Data {
    var hexString: String {
        map { String(format: "%02x", $0) }.joined()
    }

    init?(hexString: String) {
        let hex = hexString.hasPrefix("0x") ? String(hexString.dropFirst(2)) : hexString
        guard hex.count % 2 == 0 else { return nil }
        var data = Data()
        var index = hex.startIndex
        while index < hex.endIndex {
            let nextIndex = hex.index(index, offsetBy: 2)
            guard let byte = UInt8(hex[index..<nextIndex], radix: 16) else { return nil }
            data.append(byte)
            index = nextIndex
        }
        self = data
    }

    var base64URLEncoded: String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

// MARK: - String Extensions

extension String {
    var base64Encoded: String? {
        data(using: .utf8)?.base64EncodedString()
    }

    var base64Decoded: String? {
        guard let data = Data(base64Encoded: self) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func truncated(to maxLength: Int, trailing: String = "...") -> String {
        if count <= maxLength {
            return self
        }
        return String(prefix(maxLength - trailing.count)) + trailing
    }
}

// MARK: - Date Extensions

extension Date {
    var iso8601String: String {
        ISO8601DateFormatter().string(from: self)
    }

    var relativeString: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: self, relativeTo: Date())
    }
}

// MARK: - JSON Encoder/Decoder

extension JSONEncoder {
    static var gateway: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }
}

extension JSONDecoder {
    static var gateway: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }
}

// MARK: - Result Extension

extension Result {
    var isSuccess: Bool {
        if case .success = self { return true }
        return false
    }

    var isFailure: Bool {
        if case .failure = self { return true }
        return false
    }
}

// MARK: - View Extensions (SwiftUI conditional modifier)

#if canImport(SwiftUI)
import SwiftUI

extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition {
            transform(self)
        } else {
            self
        }
    }

    func hideKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}
#endif

// MARK: - SHA256

enum CryptoHash {
    static func sha256(_ data: Data) -> Data {
        Data(SHA256.hash(data: data))
    }

    static func sha256(_ string: String) -> Data {
        guard let data = string.data(using: .utf8) else { return Data() }
        return sha256(data)
    }
}
