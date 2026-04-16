import XCTest
@testable import MyClaw

final class KeychainServiceTests: XCTestCase {

    private var keychainService: KeychainService!

    override func setUp() {
        super.setUp()
        keychainService = KeychainService.shared
        // Clean up before each test
        try? keychainService.clearAll()
    }

    override func tearDown() {
        // Clean up after each test
        try? keychainService.clearAll()
        super.tearDown()
    }

    // MARK: - Private Key Storage

    func testPrivateKeyStorage() throws {
        // Given
        let testKeyData = "test_private_key_data_12345".data(using: .utf8)!

        // When
        try keychainService.savePrivateKey(testKeyData)
        let loadedKey = try keychainService.loadPrivateKey()

        // Then
        XCTAssertNotNil(loadedKey, "Loaded private key should not be nil")
        XCTAssertEqual(loadedKey, testKeyData, "Loaded private key should match saved key")
    }

    func testPrivateKeyStorageOverwritesExisting() throws {
        // Given
        let originalKey = "original_key".data(using: .utf8)!
        let newKey = "new_key".data(using: .utf8)!

        // When
        try keychainService.savePrivateKey(originalKey)
        try keychainService.savePrivateKey(newKey)
        let loadedKey = try keychainService.loadPrivateKey()

        // Then
        XCTAssertEqual(loadedKey, newKey, "Loaded key should be the newer one")
        XCTAssertNotEqual(loadedKey, originalKey, "Loaded key should not be the original")
    }

    func testPrivateKeyStorageDelete() throws {
        // Given
        let testKey = "delete_test_key".data(using: .utf8)!
        try keychainService.savePrivateKey(testKey)

        // When
        try keychainService.deletePrivateKey()
        let loadedKey = try keychainService.loadPrivateKey()

        // Then
        XCTAssertNil(loadedKey, "Private key should be nil after deletion")
    }

    func testPrivateKeyStorageReturnsNilWhenEmpty() throws {
        // When
        let loadedKey = try keychainService.loadPrivateKey()

        // Then
        XCTAssertNil(loadedKey, "Private key should be nil when not stored")
    }

    // MARK: - Pairing Info Storage

    func testSaveAndLoadPairingInfo() throws {
        // Given
        let pairingInfo = PairingInfo(
            deviceId: "test_device_123",
            deviceToken: "tok_abcdef123456",
            gatewayEndpointId: UUID()
        )

        // When
        try keychainService.savePairingInfo(pairingInfo)
        let loadedInfo = try keychainService.loadPairingInfo()

        // Then
        XCTAssertNotNil(loadedInfo, "Loaded pairing info should not be nil")
        XCTAssertEqual(loadedInfo?.deviceId, pairingInfo.deviceId, "Device ID should match")
        XCTAssertEqual(loadedInfo?.deviceToken, pairingInfo.deviceToken, "Device token should match")
        XCTAssertEqual(loadedInfo?.gatewayEndpointId, pairingInfo.gatewayEndpointId,
                       "Gateway endpoint ID should match")
    }

    func testSaveAndLoadPairingInfoWithDifferentValues() throws {
        // Given
        let pairingInfo1 = PairingInfo(
            deviceId: "device_alpha",
            deviceToken: "tok_alpha123",
            gatewayEndpointId: UUID()
        )
        let pairingInfo2 = PairingInfo(
            deviceId: "device_beta",
            deviceToken: "tok_beta456",
            gatewayEndpointId: UUID()
        )

        // When
        try keychainService.savePairingInfo(pairingInfo1)
        let loadedInfo1 = try keychainService.loadPairingInfo()

        try keychainService.savePairingInfo(pairingInfo2)
        let loadedInfo2 = try keychainService.loadPairingInfo()

        // Then
        XCTAssertEqual(loadedInfo1?.deviceId, "device_alpha")
        XCTAssertEqual(loadedInfo2?.deviceId, "device_beta")
    }

    func testDeletePairingInfo() throws {
        // Given
        let pairingInfo = PairingInfo(
            deviceId: "delete_test_device",
            deviceToken: "tok_delete_test",
            gatewayEndpointId: UUID()
        )
        try keychainService.savePairingInfo(pairingInfo)

        // When
        try keychainService.deletePairingInfo()
        let loadedInfo = try keychainService.loadPairingInfo()

        // Then
        XCTAssertNil(loadedInfo, "Pairing info should be nil after deletion")
    }

    func testDeletePairingInfoWhenEmpty() throws {
        // When & Then - should not throw
        XCTAssertNoThrow(try keychainService.deletePairingInfo(),
                         "Deleting non-existent pairing info should not throw")
    }

    func testLoadPairingInfoReturnsNilWhenEmpty() throws {
        // When
        let loadedInfo = try keychainService.loadPairingInfo()

        // Then
        XCTAssertNil(loadedInfo, "Pairing info should be nil when not stored")
    }

    // MARK: - Pairing Info Persistence Across Clear All

    func testPairingInfoClearAll() throws {
        // Given
        let pairingInfo = PairingInfo(
            deviceId: "clear_all_device",
            deviceToken: "tok_clear_all",
            gatewayEndpointId: UUID()
        )
        let testKey = "clear_all_key".data(using: .utf8)!
        try keychainService.savePairingInfo(pairingInfo)
        try keychainService.savePrivateKey(testKey)

        // When
        try keychainService.clearAll()

        // Then
        XCTAssertNil(try keychainService.loadPairingInfo(), "Pairing info should be cleared")
        XCTAssertNil(try keychainService.loadPrivateKey(), "Private key should be cleared")
    }
}
