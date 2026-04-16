import XCTest
import CryptoKit
@testable import MyClaw

final class CryptoServiceTests: XCTestCase {

    // MARK: - Key Pair Generation

    func testKeyPairGeneration() throws {
        // Given
        let cryptoService = CryptoService.shared

        // When
        let (privateKey, publicKey) = try cryptoService.generateKeyPair()

        // Then
        XCTAssertNotNil(privateKey, "Private key should not be nil")
        XCTAssertNotNil(publicKey, "Public key should not be nil")
        XCTAssertEqual(privateKey.publicKey.rawRepresentation, publicKey.rawRepresentation,
                       "Public key derived from private key should match")
    }

    func testKeyPairGenerationProducesUniqueKeys() throws {
        // Given
        let cryptoService = CryptoService.shared

        // When
        let (privateKey1, _) = try cryptoService.generateKeyPair()
        let (privateKey2, _) = try cryptoService.generateKeyPair()

        // Then
        XCTAssertNotEqual(privateKey1.rawRepresentation, privateKey2.rawRepresentation,
                          "Each key generation should produce unique keys")
    }

    // MARK: - Sign and Verify

    func testSignAndVerify() throws {
        // Given
        let (privateKey, publicKey) = try CryptoService.shared.generateKeyPair()
        let testData = "Hello, MyClaw!".data(using: .utf8)!

        // When
        let signature = try privateKey.signature(for: testData)

        // Then
        XCTAssertTrue(publicKey.isValidSignature(signature, for: testData),
                      "Signature should be valid for the original data")
    }

    func testSignAndVerifyWithDifferentData() throws {
        // Given
        let (privateKey, publicKey) = try CryptoService.shared.generateKeyPair()
        let originalData = "Original message".data(using: .utf8)!
        let tamperedData = "Tampered message".data(using: .utf8)!

        // When
        let signature = try privateKey.signature(for: originalData)

        // Then
        XCTAssertFalse(publicKey.isValidSignature(signature, for: tamperedData),
                       "Signature should be invalid for different data")
    }

    // MARK: - Device Info Signing

    func testDeviceInfoSigning() async throws {
        // Given
        let cryptoService = CryptoService.shared
        let nonce = "test_nonce_12345"
        let timestamp: Int64 = 1234567890

        // When
        let deviceInfo = try await cryptoService.buildDeviceInfo(nonce: nonce, timestamp: timestamp)

        // Then
        XCTAssertFalse(deviceInfo.id.isEmpty, "Device ID should not be empty")
        XCTAssertFalse(deviceInfo.publicKey.isEmpty, "Public key should not be empty")
        XCTAssertFalse(deviceInfo.signature.isEmpty, "Signature should not be empty")
        XCTAssertEqual(deviceInfo.nonce, nonce, "Nonce should match")
        XCTAssertEqual(deviceInfo.signedAt, timestamp, "SignedAt should match")
    }

    func testDeviceInfoSignatureIsValid() async throws {
        // Given
        let cryptoService = CryptoService.shared
        let nonce = "verification_nonce"
        let timestamp: Int64 = 9876543210

        // When
        let deviceInfo = try await cryptoService.buildDeviceInfo(nonce: nonce, timestamp: timestamp)

        // Then - verify the signature manually
        let payload = "\(nonce).\(timestamp)"
        guard let payloadData = payload.data(using: .utf8) else {
            XCTFail("Failed to encode payload")
            return
        }
        guard let signatureData = Data(hexString: deviceInfo.signature) else {
            XCTFail("Failed to decode signature hex string")
            return
        }
        guard let publicKeyData = Data(base64Encoded: deviceInfo.publicKey) else {
            XCTFail("Failed to decode public key base64")
            return
        }

        let publicKey = try Curve25519.Signing.PublicKey(rawRepresentation: publicKeyData)
        XCTAssertTrue(publicKey.isValidSignature(signatureData, for: payloadData),
                      "Device info signature should be valid")
    }

    func testDeviceInfoSigningProducesConsistentDeviceId() async throws {
        // Given
        let cryptoService = CryptoService.shared
        let nonce = "consistent_nonce"
        let timestamp1: Int64 = 1111111111
        let timestamp2: Int64 = 2222222222

        // When
        let deviceInfo1 = try await cryptoService.buildDeviceInfo(nonce: nonce, timestamp: timestamp1)
        let deviceInfo2 = try await cryptoService.buildDeviceInfo(nonce: nonce, timestamp: timestamp2)

        // Then - Device ID should be the same regardless of nonce/timestamp
        XCTAssertEqual(deviceInfo1.id, deviceInfo2.id,
                       "Device ID should be consistent across different nonces/timestamps")
    }
}
