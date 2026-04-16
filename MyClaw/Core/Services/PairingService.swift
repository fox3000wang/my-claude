import Foundation
import Combine

// MARK: - PairingError

enum PairingError: LocalizedError {
    case noEndpoint
    case notConnected
    case timeout
    case rejected(reason: String)
    case tokenStorageFailed
    case invalidResponse
    case simulationMode
    case cancelled

    var errorDescription: String? {
        switch self {
        case .noEndpoint:
            return "No Gateway endpoint specified"
        case .notConnected:
            return "Not connected to Gateway"
        case .timeout:
            return "Pairing request timed out"
        case .rejected(let reason):
            return "Pairing rejected: \(reason)"
        case .tokenStorageFailed:
            return "Failed to store pairing token"
        case .invalidResponse:
            return "Invalid pairing response"
        case .simulationMode:
            return "Running in simulation mode"
        case .cancelled:
            return "Pairing was cancelled"
        }
    }
}

// MARK: - PairingState

enum PairingServiceState: Equatable {
    case unpaired
    case waitingForApproval
    case approved
    case rejected(reason: String)
    case error(message: String)

    var isIdle: Bool {
        self == .unpaired
    }

    var isWaiting: Bool {
        self == .waitingForApproval
    }

    var isComplete: Bool {
        switch self {
        case .approved, .rejected, .error:
            return true
        case .unpaired, .waitingForApproval:
            return false
        }
    }
}

// MARK: - PairingService

@MainActor
final class PairingService: ObservableObject {
    @Published private(set) var pairingState: PairingServiceState = .unpaired
    @Published private(set) var pairingCode: String?
    @Published private(set) var pairingURL: String?
    @Published private(set) var pendingToken: String?
    @Published private(set) var lastError: PairingError?

    private let keychainService: KeychainService
    private let cryptoService: CryptoService

    private var pairingTask: Task<Void, Never>?
    private var statusTimer: Timer?
    private var cancellables = Set<AnyCancellable>()

    static let shared = PairingService()

    init(
        keychainService: KeychainService = .shared,
        cryptoService: CryptoService = .shared
    ) {
        self.keychainService = keychainService
        self.cryptoService = cryptoService
    }

    // MARK: - Check Existing Pairing

    func hasExistingPairing() -> Bool {
        (try? keychainService.loadPairingInfo()) != nil
    }

    func getExistingPairing() throws -> PairingInfo? {
        try keychainService.loadPairingInfo()
    }

    // MARK: - Initiate Pairing

    func initiatePairing(with endpoint: GatewayEndpoint) async throws -> PairingInfo {
        guard pairingState.isIdle || pairingState.isComplete else {
            return try await waitForCompletion()
        }

        pairingState = .waitingForApproval
        lastError = nil
        pendingToken = nil
        pairingCode = generatePairingCode()
        pairingURL = buildPairingURL(endpoint: endpoint)

        // Start simulation: in real usage, gateway would send events
        startSimulationTimer(endpoint: endpoint)

        return try await waitForCompletion()
    }

    private func buildPairingURL(endpoint: GatewayEndpoint) -> String {
        let code = pairingCode ?? generatePairingCode()
        return "myclaw://pair?gateway=\(endpoint.host)&port=\(endpoint.port)&code=\(code)"
    }

    // MARK: - Simulation Mode

    private func startSimulationTimer(endpoint: GatewayEndpoint) {
        statusTimer?.invalidate()
        statusTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.simulateApproval(endpointId: endpoint.id)
            }
        }
    }

    private func simulateApproval(endpointId: UUID) {
        // Simulate gateway approval after delay
        // In production, this would come from actual gateway WebSocket events
        let simulatedToken = "tok_\(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(32))"

        pendingToken = simulatedToken
        pairingState = .approved

        Task {
            try? await completePairing(token: simulatedToken, endpointId: endpointId)
        }
    }

    // MARK: - Complete Pairing

    private func completePairing(token: String, endpointId: UUID) async throws {
        pendingToken = token
        pairingState = .approved

        let deviceId = try cryptoService.getDeviceId()

        let pairingInfo = PairingInfo(
            deviceId: deviceId,
            deviceToken: token,
            gatewayEndpointId: endpointId
        )

        try keychainService.savePairingInfo(pairingInfo)
        try keychainService.saveDeviceToken(token)

        pairingState = .approved
    }

    // MARK: - Approve Pairing (Manual)

    func approvePairing(code: String) async throws {
        guard code == pairingCode || code.count == 6 else {
            throw PairingError.invalidResponse
        }

        let token = "tok_\(UUID().uuidString.replacingOccurrences(of: "-", with: "").prefix(32))"
        pendingToken = token

        let deviceId = try cryptoService.getDeviceId()
        let pairingInfo = PairingInfo(
            deviceId: deviceId,
            deviceToken: token,
            gatewayEndpointId: UUID()
        )

        try keychainService.savePairingInfo(pairingInfo)
        try keychainService.saveDeviceToken(token)

        pairingState = .approved
    }

    // MARK: - Reject Pairing

    func rejectPairing(reason: String = "Rejected by user") {
        statusTimer?.invalidate()
        pairingState = .rejected(reason: reason)
        lastError = .rejected(reason: reason)
    }

    // MARK: - Cancel Pairing

    func cancelPairing() {
        statusTimer?.invalidate()
        pairingTask?.cancel()
        pairingTask = nil
        resetState()
        lastError = .cancelled
    }

    // MARK: - Dispose Pairing

    func disposePairing() {
        statusTimer?.invalidate()
        pairingTask?.cancel()
        resetState()
    }

    private func resetState() {
        pairingState = .unpaired
        pairingCode = nil
        pairingURL = nil
        pendingToken = nil
    }

    // MARK: - Reset Pairing (Full Reset)

    func resetPairing() throws {
        statusTimer?.invalidate()
        pairingTask?.cancel()
        try keychainService.deletePairingInfo()
        try keychainService.deleteDeviceToken()
        resetState()
        lastError = nil
    }

    // MARK: - Wait for Completion

    private func waitForCompletion() async throws -> PairingInfo {
        try await withCheckedThrowingContinuation { continuation in
            pairingTask = Task { @MainActor [weak self] in
                guard let self = self else {
                    continuation.resume(throwing: PairingError.invalidResponse)
                    return
                }

                // Poll state changes with timeout
                var attempts = 0
                let maxAttempts = 100 // ~30 seconds at 300ms intervals

                Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] timer in
                    guard let self = self else {
                        timer.invalidate()
                        continuation.resume(throwing: PairingError.invalidResponse)
                        return
                    }

                    attempts += 1
                    switch self.pairingState {
                    case .approved:
                        timer.invalidate()
                        if let info = try? self.getExistingPairing() {
                            continuation.resume(returning: info)
                        } else {
                            continuation.resume(throwing: PairingError.invalidResponse)
                        }

                    case .rejected(let reason):
                        timer.invalidate()
                        continuation.resume(throwing: PairingError.rejected(reason: reason))

                    case .error(let message):
                        timer.invalidate()
                        continuation.resume(throwing: PairingError.rejected(reason: message))

                    case .waitingForApproval:
                        if attempts >= maxAttempts {
                            timer.invalidate()
                            self.pairingState = .error(message: "Pairing timed out")
                            continuation.resume(throwing: PairingError.timeout)
                        }

                    case .unpaired:
                        timer.invalidate()
                        continuation.resume(throwing: PairingError.cancelled)
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func generatePairingCode() -> String {
        let characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return String((0..<6).map { _ in characters.randomElement()! })
    }

    // MARK: - QR Code Data

    func qrCodeData() -> Data? {
        guard let urlString = pairingURL else { return nil }
        return urlString.data(using: .utf8)
    }

    deinit {
        statusTimer?.invalidate()
    }
}

// MARK: - Combine Observation Helpers

extension PairingService {
    private func observePhaseChange() -> AnyPublisher<PairingServiceState, Never> {
        $pairingState.eraseToAnyPublisher()
    }
}
