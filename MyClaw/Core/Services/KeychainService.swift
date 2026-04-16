import Foundation
import Security

final class KeychainService {
    static let shared = KeychainService()

    private let service = Constants.Keychain.service

    private init() {}

    // MARK: - Private Key

    func savePrivateKey(_ key: Data) throws {
        try save(data: key, forKey: Constants.Keychain.privateKeyKey)
    }

    func loadPrivateKey() throws -> Data? {
        try loadData(forKey: Constants.Keychain.privateKeyKey)
    }

    func deletePrivateKey() throws {
        try delete(forKey: Constants.Keychain.privateKeyKey)
    }

    // MARK: - Public Key

    func savePublicKey(_ key: Data) throws {
        try save(data: key, forKey: Constants.Keychain.publicKeyKey)
    }

    func loadPublicKey() throws -> Data? {
        try loadData(forKey: Constants.Keychain.publicKeyKey)
    }

    func deletePublicKey() throws {
        try delete(forKey: Constants.Keychain.publicKeyKey)
    }

    // MARK: - Device ID

    func saveDeviceId(_ deviceId: String) throws {
        try save(string: deviceId, forKey: Constants.Keychain.deviceIdKey)
    }

    func loadDeviceId() throws -> String? {
        try loadString(forKey: Constants.Keychain.deviceIdKey)
    }

    func deleteDeviceId() throws {
        try delete(forKey: Constants.Keychain.deviceIdKey)
    }

    // MARK: - Device Token

    func saveDeviceToken(_ token: String) throws {
        try save(string: token, forKey: Constants.Keychain.deviceTokenKey)
    }

    func loadDeviceToken() throws -> String? {
        try loadString(forKey: Constants.Keychain.deviceTokenKey)
    }

    func deleteDeviceToken() throws {
        try delete(forKey: Constants.Keychain.deviceTokenKey)
    }

    // MARK: - Pairing Info

    func savePairingInfo(_ info: PairingInfo) throws {
        let data = try JSONEncoder().encode(info)
        try save(data: data, forKey: Constants.Keychain.pairingInfoKey)
    }

    func loadPairingInfo() throws -> PairingInfo? {
        guard let data = try loadData(forKey: Constants.Keychain.pairingInfoKey) else {
            return nil
        }
        return try JSONDecoder().decode(PairingInfo.self, from: data)
    }

    func deletePairingInfo() throws {
        try delete(forKey: Constants.Keychain.pairingInfoKey)
    }

    // MARK: - Clear All

    func clearAll() throws {
        try delete(forKey: Constants.Keychain.privateKeyKey)
        try delete(forKey: Constants.Keychain.publicKeyKey)
        try delete(forKey: Constants.Keychain.deviceIdKey)
        try delete(forKey: Constants.Keychain.deviceTokenKey)
        try delete(forKey: Constants.Keychain.pairingInfoKey)
    }

    // MARK: - Native Keychain Operations

    private func save(data: Data, forKey key: String) throws {
        // Delete existing item first
        try? delete(forKey: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    private func save(string: String, forKey key: String) throws {
        guard let data = string.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }
        try save(data: data, forKey: key)
    }

    private func loadData(forKey key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess else {
            throw KeychainError.loadFailed(status)
        }
        return result as? Data
    }

    private func loadString(forKey key: String) throws -> String? {
        guard let data = try loadData(forKey: key) else {
            return nil
        }
        return String(data: data, encoding: .utf8)
    }

    private func delete(forKey key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }
}

// MARK: - KeychainError

enum KeychainError: LocalizedError {
    case saveFailed(OSStatus)
    case loadFailed(OSStatus)
    case deleteFailed(OSStatus)
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .saveFailed(let status):
            return "Failed to save to Keychain (status: \(status))"
        case .loadFailed(let status):
            return "Failed to load from Keychain (status: \(status))"
        case .deleteFailed(let status):
            return "Failed to delete from Keychain (status: \(status))"
        case .encodingFailed:
            return "Failed to encode data for Keychain"
        }
    }
}
