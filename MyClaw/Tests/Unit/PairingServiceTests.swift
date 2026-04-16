import XCTest
@testable import MyClaw

@MainActor
final class PairingServiceTests: XCTestCase {

    private var pairingService: PairingService!
    private var mockKeychainService: KeychainService!
    private var mockCryptoService: CryptoService!

    override func setUp() {
        super.setUp()
        // Use shared instances for testing
        mockKeychainService = KeychainService.shared
        mockCryptoService = CryptoService.shared
        pairingService = PairingService(
            keychainService: mockKeychainService,
            cryptoService: mockCryptoService
        )
    }

    override func tearDown() {
        try? pairingService.resetPairing()
        super.tearDown()
    }

    // MARK: - Pairing State Initial

    func testInitialPairingState() {
        // Then
        XCTAssertEqual(pairingService.pairingState, .unpaired, "Initial state should be unpaired")
        XCTAssertNil(pairingService.pairingCode, "Pairing code should be nil initially")
        XCTAssertNil(pairingService.pairingURL, "Pairing URL should be nil initially")
    }

    // MARK: - Pairing Code Generation

    func testPairingCodeIsGenerated() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )

        // When
        _ = try await pairingService.initiatePairing(with: endpoint)

        // Then
        XCTAssertNotNil(pairingService.pairingCode, "Pairing code should be generated")
        XCTAssertEqual(pairingService.pairingCode?.count, 6, "Pairing code should be 6 characters")
    }

    func testPairingCodeFormat() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )

        // When
        _ = try await pairingService.initiatePairing(with: endpoint)
        let code = pairingService.pairingCode ?? ""

        // Then - code should only contain valid characters (no I, O, 0, 1 to avoid confusion)
        let validCharacters = CharacterSet(charactersIn: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        XCTAssertTrue(code.unicodeScalars.allSatisfy { validCharacters.contains($0) },
                      "Pairing code should only contain valid characters")
    }

    // MARK: - Pairing URL Generation

    func testPairingURLFormat() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )

        // When
        _ = try await pairingService.initiatePairing(with: endpoint)

        // Then
        XCTAssertNotNil(pairingService.pairingURL, "Pairing URL should be generated")
        XCTAssertTrue(pairingService.pairingURL!.contains("myclaw://pair"),
                      "Pairing URL should use myclaw://pair scheme")
        XCTAssertTrue(pairingService.pairingURL!.contains("gateway=192.168.1.100"),
                      "Pairing URL should contain gateway host")
        XCTAssertTrue(pairingService.pairingURL!.contains("port=18789"),
                      "Pairing URL should contain port")
        XCTAssertTrue(pairingService.pairingURL!.contains("code="),
                      "Pairing URL should contain code parameter")
    }

    // MARK: - Pairing Request Format

    func testPairingRequestFormat() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )

        // When
        _ = try await pairingService.initiatePairing(with: endpoint)

        // Then - verify the URL contains all required components for a pairing.request
        guard let urlString = pairingService.pairingURL,
              let url = URL(string: urlString) else {
            XCTFail("Invalid pairing URL")
            return
        }

        // Verify URL components
        XCTAssertEqual(url.scheme, "myclaw", "URL scheme should be 'myclaw'")
        XCTAssertEqual(url.host, "pair", "URL host should be 'pair'")

        // Verify query parameters
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let queryItems = components.queryItems else {
            XCTFail("URL should have query components")
            return
        }

        let queryDict = Dictionary(uniqueKeysWithValues: queryItems.map { ($0.name, $0.value ?? "") })

        XCTAssertTrue(queryDict.keys.contains("gateway"), "URL should have gateway parameter")
        XCTAssertTrue(queryDict.keys.contains("port"), "URL should have port parameter")
        XCTAssertTrue(queryDict.keys.contains("code"), "URL should have code parameter")
        XCTAssertEqual(queryDict["gateway"], "192.168.1.100", "Gateway host should match")
        XCTAssertEqual(queryDict["port"], "18789", "Port should match")
        XCTAssertEqual(queryDict["code"]?.count, 6, "Code should be 6 characters")
    }

    // MARK: - Pairing State Transitions

    func testPairingStateTransitionsToWaiting() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )

        // When
        let pairingTask = Task {
            try await pairingService.initiatePairing(with: endpoint)
        }

        // Give it a moment to transition
        try await Task.sleep(nanoseconds: 100_000_000) // 100ms

        // Then - should be in waiting state
        XCTAssertTrue(pairingService.pairingState.isWaiting,
                      "Pairing state should transition to waiting")

        // Clean up
        pairingService.cancelPairing()
    }

    func testPairingStateTransitionsToApproved() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )

        // When
        _ = try await pairingService.initiatePairing(with: endpoint)

        // Then - simulation mode auto-approves after 3 seconds
        try await Task.sleep(nanoseconds: 4_000_000_000) // 4 seconds

        XCTAssertEqual(pairingService.pairingState, .approved,
                       "Pairing state should transition to approved in simulation mode")
    }

    // MARK: - QR Code Data

    func testQRCodeDataGeneration() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )
        _ = try await pairingService.initiatePairing(with: endpoint)

        // When
        let qrData = pairingService.qrCodeData()

        // Then
        XCTAssertNotNil(qrData, "QR code data should be generated")
        let qrString = String(data: qrData!, encoding: .utf8)
        XCTAssertEqual(qrString, pairingService.pairingURL,
                       "QR code data should match pairing URL")
    }

    func testQRCodeDataNilWhenNoPairing() {
        // When
        let qrData = pairingService.qrCodeData()

        // Then
        XCTAssertNil(qrData, "QR code data should be nil when not pairing")
    }

    // MARK: - Reset Pairing

    func testResetPairingClearsState() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )
        _ = try await pairingService.initiatePairing(with: endpoint)

        // When
        try pairingService.resetPairing()

        // Then
        XCTAssertEqual(pairingService.pairingState, .unpaired)
        XCTAssertNil(pairingService.pairingCode)
        XCTAssertNil(pairingService.pairingURL)
        XCTAssertNil(pairingService.pendingToken)
    }

    // MARK: - Cancel Pairing

    func testCancelPairingResetsState() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )
        _ = try await pairingService.initiatePairing(with: endpoint)

        // When
        pairingService.cancelPairing()

        // Then
        XCTAssertEqual(pairingService.pairingState, .unpaired)
        XCTAssertNil(pairingService.pairingCode)
    }

    // MARK: - Existing Pairing Check

    func testHasExistingPairingWhenNone() {
        // Clean up first
        try? pairingService.resetPairing()

        // Then
        XCTAssertFalse(pairingService.hasExistingPairing(),
                       "Should return false when no existing pairing")
    }

    func testHasExistingPairingAfterSuccessfulPairing() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )
        _ = try await pairingService.initiatePairing(with: endpoint)
        try await Task.sleep(nanoseconds: 4_000_000_000) // Wait for simulation approval

        // Then
        XCTAssertTrue(pairingService.hasExistingPairing(),
                      "Should return true after successful pairing")
    }

    // MARK: - Approve Pairing Manually

    func testApprovePairingWithCorrectCode() async throws {
        // Given
        let endpoint = GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        )
        _ = try await pairingService.initiatePairing(with: endpoint)
        let code = pairingService.pairingCode ?? "AAAAAA"

        // When
        try await pairingService.approvePairing(code: code)

        // Then
        XCTAssertEqual(pairingService.pairingState, .approved,
                       "Manual approval with correct code should succeed")
    }

    func testApprovePairingWithIncorrectCode() async throws {
        // Given
        _ = try await pairingService.initiatePairing(with: GatewayEndpoint(
            id: UUID(),
            name: "Test Gateway",
            host: "192.168.1.100",
            port: 18789
        ))

        // When & Then
        do {
            try await pairingService.approvePairing(code: "WRONG1")
            XCTFail("Should throw error for incorrect code")
        } catch {
            XCTAssertTrue(error is PairingError, "Should throw PairingError")
        }
    }
}
