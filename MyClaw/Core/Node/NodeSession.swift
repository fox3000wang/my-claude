import Foundation
import Combine
import UIKit

// MARK: - ConnectionState

enum ConnectionState: Equatable {
    case idle
    case discovering
    case connecting
    case handshaking
    case paired
    case error(message: String)

    var isActive: Bool {
        switch self {
        case .connecting, .handshaking, .paired:
            return true
        case .idle, .discovering, .error:
            return false
        }
    }

    var displayName: String {
        switch self {
        case .idle:
            return "Disconnected"
        case .discovering:
            return "Discovering..."
        case .connecting:
            return "Connecting..."
        case .handshaking:
            return "Handshaking..."
        case .paired:
            return "Connected"
        case .error(let message):
            return "Error: \(message)"
        }
    }
}

// MARK: - NodeSession

@MainActor
final class NodeSession: ObservableObject {
    // MARK: - Published State

    @Published private(set) var connectionState: ConnectionState = .idle
    @Published private(set) var sessionId: String?
    @Published private(set) var nodeId: String?
    @Published private(set) var connectedEndpoint: GatewayEndpoint?
    @Published private(set) var capabilities: [Capability] = Capability.defaultCapabilities
    @Published private(set) var lastError: GatewayError?
    @Published private(set) var status: NodeStatus = .disconnected

    // MARK: - Public Accessors

    func reloadCapabilities() {
        loadCapabilities()
    }

    var nodeStatus: NodeStatus {
        status
    }

    // MARK: - Private

    private let gatewayClient: GatewayClient
    private let cryptoService: CryptoService
    private let keychainService: KeychainService
    private var cancellables = Set<AnyCancellable>()

    private let userDefaults = UserDefaults.standard
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid

    static let shared = NodeSession()

    private init(
        gatewayClient: GatewayClient = .shared,
        cryptoService: CryptoService = .shared,
        keychainService: KeychainService = .shared
    ) {
        self.gatewayClient = gatewayClient
        self.cryptoService = cryptoService
        self.keychainService = keychainService

        setupBindings()
        loadCapabilities()
        loadLastConnectedEndpoint()
        setupAppLifecycleObservers()
    }

    // MARK: - Bindings

    private func setupBindings() {
        gatewayClient.$status
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                self?.status = status
                self?.handleGatewayStatus(status)
            }
            .store(in: &cancellables)

        gatewayClient.$sessionId
            .receive(on: DispatchQueue.main)
            .assign(to: &$sessionId)

        gatewayClient.$nodeId
            .receive(on: DispatchQueue.main)
            .assign(to: &$nodeId)

        gatewayClient.$lastError
            .receive(on: DispatchQueue.main)
            .assign(to: &$lastError)
    }

    private func handleGatewayStatus(_ status: NodeStatus) {
        switch status {
        case .disconnected:
            connectionState = .idle
        case .connecting:
            connectionState = .connecting
        case .paired:
            connectionState = .paired
        case .connected:
            connectionState = .handshaking
        case .error:
            connectionState = .error(message: lastError?.localizedDescription ?? "Unknown error")
        }
    }

    // MARK: - App Lifecycle

    private func setupAppLifecycleObservers() {
        NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.handleAppBecameActive()
                }
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.handleAppWillResign()
                }
            }
            .store(in: &cancellables)
    }

    private func handleAppBecameActive() {
        endBackgroundTask()
        // Attempt reconnect if we were connected before
        if let endpoint = connectedEndpoint, connectionState == .idle {
            Task {
                try? await reconnect()
            }
        }
    }

    private func handleAppWillResign() {
        // Start background task to maintain connection briefly
        startBackgroundTask()
    }

    private func startBackgroundTask() {
        guard backgroundTask == .invalid else { return }
        backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in
            self?.endBackgroundTask()
        }
    }

    private func endBackgroundTask() {
        guard backgroundTask != .invalid else { return }
        UIApplication.shared.endBackgroundTask(backgroundTask)
        backgroundTask = .invalid
    }

    // MARK: - Connect

    func connect(to endpoint: GatewayEndpoint) async throws {
        connectionState = .connecting
        lastError = nil
        connectedEndpoint = endpoint

        do {
            try await gatewayClient.connect(to: endpoint)
            saveLastConnectedEndpoint(endpoint)
            connectionState = .handshaking
        } catch {
            connectionState = .error(message: error.localizedDescription)
            lastError = error as? GatewayError ?? .connectionFailed
            throw error
        }
    }

    // MARK: - Disconnect

    func disconnect() {
        gatewayClient.disconnect()
        connectionState = .idle
        connectedEndpoint = nil
        sessionId = nil
        nodeId = nil
    }

    // MARK: - Reconnect

    func reconnect() async throws {
        guard let endpoint = connectedEndpoint else {
            throw GatewayError.hostNotConfigured
        }

        connectionState = .connecting
        lastError = nil

        do {
            try await gatewayClient.reconnect()
        } catch {
            connectionState = .error(message: error.localizedDescription)
            lastError = error as? GatewayError ?? .connectionFailed
            throw error
        }
    }

    // MARK: - Capability Management

    func enableCapability(_ capabilityId: String) {
        if let index = capabilities.firstIndex(where: { $0.id == capabilityId }) {
            capabilities[index].isEnabled = true
            saveCapabilities()
        }
    }

    func disableCapability(_ capabilityId: String) {
        if let index = capabilities.firstIndex(where: { $0.id == capabilityId }) {
            capabilities[index].isEnabled = false
            saveCapabilities()
        }
    }

    func markCapabilityUsed(_ capabilityId: String) {
        if let index = capabilities.firstIndex(where: { $0.id == capabilityId }) {
            capabilities[index].lastUsed = Date()
            saveCapabilities()
        }
    }

    private func saveCapabilities() {
        let data = capabilities.map { CapSave(id: $0.id, isEnabled: $0.isEnabled, lastUsed: $0.lastUsed) }
        if let encoded = try? JSONEncoder().encode(data) {
            userDefaults.set(encoded, forKey: Constants.UserDefaults.capabilitiesKey)
        }
    }

    func loadCapabilities() {
        guard let data = userDefaults.data(forKey: Constants.UserDefaults.capabilitiesKey),
              let saved = try? JSONDecoder().decode([CapSave].self, from: data) else {
            return
        }
        for item in saved {
            if let index = capabilities.firstIndex(where: { $0.id == item.id }) {
                capabilities[index].isEnabled = item.isEnabled
                capabilities[index].lastUsed = item.lastUsed
            }
        }
    }

    // MARK: - Endpoint Persistence

    private func saveLastConnectedEndpoint(_ endpoint: GatewayEndpoint) {
        var updatedEndpoint = endpoint
        updatedEndpoint.lastConnected = Date()
        if let data = try? JSONEncoder().encode(updatedEndpoint) {
            userDefaults.set(data, forKey: Constants.UserDefaults.lastConnectedEndpointKey)
        }
    }

    private func loadLastConnectedEndpoint() {
        guard let data = userDefaults.data(forKey: Constants.UserDefaults.lastConnectedEndpointKey),
              let endpoint = try? JSONDecoder().decode(GatewayEndpoint.self, from: data) else {
            return
        }
        connectedEndpoint = endpoint
    }

    func clearLastConnectedEndpoint() {
        userDefaults.removeObject(forKey: Constants.UserDefaults.lastConnectedEndpointKey)
        connectedEndpoint = nil
    }

    // MARK: - Info

    var deviceId: String {
        (try? cryptoService.getDeviceId()) ?? "unknown"
    }

    var isPaired: Bool {
        (try? keychainService.loadPairingInfo()) != nil
    }

    var pairingInfo: PairingInfo? {
        try? keychainService.loadPairingInfo()
    }


    deinit {
        Task { @MainActor in
            endBackgroundTask()
        }
    }
}

// MARK: - CapSave (for encoding)

private struct CapSave: Codable {
    let id: String
    let isEnabled: Bool
    let lastUsed: Date?
}
