import Foundation
import CryptoKit

enum CryptoError: LocalizedError {
    case keyGenerationFailed
    case signingFailed
    case invalidKeyData
    case keyNotFound
    case signatureVerificationFailed

    var errorDescription: String? {
        switch self {
        case .keyGenerationFailed:
            return "Failed to generate key pair"
        case .signingFailed:
            return "Failed to sign data"
        case .invalidKeyData:
            return "Invalid key data"
        case .keyNotFound:
            return "Key not found in Keychain"
        case .signatureVerificationFailed:
            return "Signature verification failed"
        }
    }
}

final class CryptoService {
    static let shared = CryptoService()

    private let keychain = KeychainService.shared

    private init() {}

    // MARK: - Key Generation

    func generateKeyPair() throws -> (privateKey: Curve25519.Signing.PrivateKey, publicKey: Curve25519.Signing.PublicKey) {
        let privateKey = Curve25519.Signing.PrivateKey()
        let publicKey = privateKey.publicKey
        return (privateKey, publicKey)
    }

    func ensureKeyPairExists() throws -> Curve25519.Signing.PrivateKey {
        if let existingKeyData = try keychain.loadPrivateKey() {
            return try Curve25519.Signing.PrivateKey(rawRepresentation: existingKeyData)
        }

        let (privateKey, publicKey) = try generateKeyPair()
        try keychain.savePrivateKey(privateKey.rawRepresentation)
        try keychain.savePublicKey(publicKey.rawRepresentation)

        let deviceId = try deriveDeviceId(publicKey: publicKey)
        try keychain.saveDeviceId(deviceId)

        return privateKey
    }

    func getPrivateKey() throws -> Curve25519.Signing.PrivateKey {
        guard let keyData = try keychain.loadPrivateKey() else {
            return try ensureKeyPairExists()
        }
        return try Curve25519.Signing.PrivateKey(rawRepresentation: keyData)
    }

    func getPublicKey() throws -> Curve25519.Signing.PublicKey {
        if let existingKeyData = try keychain.loadPublicKey() {
            return try Curve25519.Signing.PublicKey(rawRepresentation: existingKeyData)
        }
        let privateKey = try getPrivateKey()
        return privateKey.publicKey
    }

    func getDeviceId() throws -> String {
        if let existingId = try keychain.loadDeviceId() {
            return existingId
        }
        let privateKey = try ensureKeyPairExists()
        return try deriveDeviceId(publicKey: privateKey.publicKey)
    }

    private func deriveDeviceId(publicKey: Curve25519.Signing.PublicKey) throws -> String {
        let publicKeyData = Data(publicKey.rawRepresentation)
        let hash = CryptoHash.sha256(publicKeyData)
        return hash.hexString
    }

    // MARK: - Signing

    func sign(payload: Data) async throws -> Data {
        let privateKey = try getPrivateKey()
        let signature = try privateKey.signature(for: payload)
        return signature
    }

    func sign(string: String) async throws -> Data {
        guard let data = string.data(using: .utf8) else {
            throw CryptoError.signingFailed
        }
        return try await sign(payload: data)
    }

    // MARK: - Signature for Gateway Challenge

    func signChallenge(nonce: String, timestamp: Int64) async throws -> (signature: String, signedAt: Int64, nonce: String) {
        let payload = "\(nonce).\(timestamp)"
        let signatureData = try await sign(string: payload)
        return (
            signature: signatureData.hexString,
            signedAt: timestamp,
            nonce: nonce
        )
    }

    // MARK: - Build Device Info for Connect Request

    func buildDeviceInfo(nonce: String, timestamp: Int64) async throws -> ConnectRequest.DeviceInfo {
        let deviceId = try getDeviceId()
        let publicKeyData = Data(try getPublicKey().rawRepresentation)
        let publicKeyBase64 = publicKeyData.base64EncodedString()
        let (signature, signedAt, signedNonce) = try await signChallenge(nonce: nonce, timestamp: timestamp)

        return ConnectRequest.DeviceInfo(
            id: deviceId,
            publicKey: publicKeyBase64,
            signature: signature,
            signedAt: signedAt,
            nonce: signedNonce
        )
    }

    // MARK: - Reset

    func resetKeys() throws {
        try keychain.deletePrivateKey()
        try keychain.deletePublicKey()
        try keychain.deleteDeviceId()
    }
}
