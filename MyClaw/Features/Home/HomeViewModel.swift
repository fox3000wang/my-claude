import Foundation
import Combine

@MainActor
final class HomeViewModel: ObservableObject {
    // MARK: - Published State

    @Published var connectionState: ConnectionState = .idle
    @Published var connectedEndpoint: GatewayEndpoint?
    @Published var isConnecting = false
    @Published var errorMessage: String?
    @Published var showDiscovery = false
    @Published var showPairing = false
    @Published var showCanvas = false
    @Published var canvasURL: URL?
    @Published var sessionId: String?
    @Published var nodeId: String?

    // MARK: - Private

    private let nodeSession: NodeSession
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Init

    init(nodeSession: NodeSession = .shared) {
        self.nodeSession = nodeSession
        setupBindings()
    }

    private func setupBindings() {
        nodeSession.$connectionState
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.connectionState = state
                self?.isConnecting = (state == .connecting || state == .handshaking)
            }
            .store(in: &cancellables)

        nodeSession.$connectedEndpoint
            .receive(on: DispatchQueue.main)
            .assign(to: &$connectedEndpoint)

        nodeSession.$sessionId
            .receive(on: DispatchQueue.main)
            .assign(to: &$sessionId)

        nodeSession.$nodeId
            .receive(on: DispatchQueue.main)
            .assign(to: &$nodeId)

        nodeSession.$lastError
            .receive(on: DispatchQueue.main)
            .compactMap { $0?.localizedDescription }
            .assign(to: &$errorMessage)
    }

    // MARK: - Computed

    var status: NodeStatus {
        nodeSession.nodeStatus
    }

    var statusDisplayName: String {
        connectionState.displayName
    }

    var statusColor: String {
        switch connectionState {
        case .idle:
            return "gray"
        case .discovering, .connecting, .handshaking:
            return "yellow"
        case .paired:
            return "green"
        case .error:
            return "red"
        }
    }

    var statusIcon: String {
        switch connectionState {
        case .idle:
            return "xmark.circle.fill"
        case .discovering:
            return "antenna.radiowaves.left.and.right"
        case .connecting:
            return "arrow.triangle.2.circlepath"
        case .handshaking:
            return "lock.fill"
        case .paired:
            return "checkmark.circle.fill"
        case .error:
            return "exclamationmark.triangle.fill"
        }
    }

    var deviceId: String {
        nodeSession.deviceId.truncated(to: 16)
    }

    var isPaired: Bool {
        nodeSession.isPaired
    }

    var hasEndpoint: Bool {
        connectedEndpoint != nil
    }

    var capabilities: [Capability] {
        nodeSession.capabilities
    }

    var recentEndpoints: [GatewayEndpoint] {
        // Load from UserDefaults
        guard let data = UserDefaults.standard.data(forKey: Constants.UserDefaults.gatewayEndpointsKey),
              let endpoints = try? JSONDecoder().decode([GatewayEndpoint].self, from: data) else {
            return []
        }
        return endpoints
            .filter { $0.lastConnected != nil }
            .sorted { ($0.lastConnected ?? .distantPast) > ($1.lastConnected ?? .distantPast) }
            .prefix(5)
            .map { $0 }
    }

    // MARK: - Actions

    func connect() async {
        if let endpoint = connectedEndpoint {
            isConnecting = true
            errorMessage = nil
            do {
                try await nodeSession.connect(to: endpoint)
            } catch {
                errorMessage = error.localizedDescription
            }
            isConnecting = false
        } else {
            showDiscovery = true
        }
    }

    func connect(to endpoint: GatewayEndpoint) async {
        isConnecting = true
        errorMessage = nil
        connectedEndpoint = endpoint
        do {
            try await nodeSession.connect(to: endpoint)
        } catch {
            errorMessage = error.localizedDescription
        }
        isConnecting = false
    }

    func disconnect() {
        nodeSession.disconnect()
    }

    func reconnect() async {
        isConnecting = true
        errorMessage = nil
        do {
            try await nodeSession.reconnect()
        } catch {
            errorMessage = error.localizedDescription
        }
        isConnecting = false
    }

    func openCanvas() {
        canvasURL = URL(string: Constants.Canvas.defaultURL)
        showCanvas = true
    }

    func testConnection() async {
        errorMessage = nil
        guard connectionState == .paired else {
            errorMessage = "Not connected"
            return
        }
        do {
            try await GatewayClient.shared.sendEvent(event: "node.ping", payload: ["ts": Date().timeIntervalSince1970])
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func clearError() {
        errorMessage = nil
    }
}
