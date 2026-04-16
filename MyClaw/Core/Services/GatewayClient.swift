import Foundation
import Combine

// MARK: - RequestContinuation

/// Type-erased continuation wrapper for handling decoded responses
private final class RequestContinuation {
    let resume: (GatewayMessage) -> Void

    init<T: Decodable>(_ continuation: CheckedContinuation<T, Error>, resumeHandler: @escaping (GatewayMessage) -> Void) {
        self.resume = resumeHandler
    }

    init(_ continuation: CheckedContinuation<Void, Error>) {
        self.resume = { _ in continuation.resume() }
    }
}

// MARK: - GatewayError

enum GatewayError: LocalizedError {
    case nodeBackgroundUnavailable
    case hostNotConfigured
    case pairingFailed(reason: String)
    case connectionFailed
    case invalidSignature
    case tokenExpired
    case unknownCommand
    case handshakeTimeout
    case invalidResponse
    case notConnected
    case encodingFailed
    case decodingFailed(String)
    case websocketError(String)

    var errorDescription: String? {
        switch self {
        case .nodeBackgroundUnavailable:
            return "Please bring the app to foreground"
        case .hostNotConfigured:
            return "Gateway host is not configured"
        case .pairingFailed(let reason):
            return "Pairing failed: \(reason)"
        case .connectionFailed:
            return "Failed to connect to Gateway"
        case .invalidSignature:
            return "Invalid signature"
        case .tokenExpired:
            return "Device token has expired"
        case .unknownCommand:
            return "Unknown command received"
        case .handshakeTimeout:
            return "Handshake timed out"
        case .invalidResponse:
            return "Invalid response from Gateway"
        case .notConnected:
            return "Not connected to Gateway"
        case .encodingFailed:
            return "Failed to encode message"
        case .decodingFailed(let detail):
            return "Failed to decode message: \(detail)"
        case .websocketError(let detail):
            return "WebSocket error: \(detail)"
        }
    }
}

// MARK: - GatewayClient

@MainActor
final class GatewayClient: NSObject, ObservableObject {
    @Published private(set) var status: NodeStatus = .disconnected
    @Published private(set) var lastError: GatewayError?
    @Published private(set) var sessionId: String?
    @Published private(set) var nodeId: String?

    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var currentEndpoint: GatewayEndpoint?
    private var currentChallenge: ChallengePayload?
    private var reconnectAttempts = 0

    private var pendingRequests: [String: CheckedContinuation<GatewayMessage, Error>] = [:]
    private var requestContinuations: [String: Any] = [:]  // type-erased continuations
    private var isConnecting = false
    private var receiveTask: Task<Void, Never>?

    private let cryptoService = CryptoService.shared
    private let keychainService = KeychainService.shared

    static let shared = GatewayClient()

    override private init() {
        super.init()
    }

    // MARK: - Connection

    func connect(to endpoint: GatewayEndpoint) async throws {
        guard !isConnecting else { return }
        isConnecting = true

        currentEndpoint = endpoint
        status = .connecting
        lastError = nil

        do {
            try await performHandshake(endpoint: endpoint)
            status = .connected
            reconnectAttempts = 0
            updateLastConnected(endpoint: endpoint)
        } catch {
            status = .error
            lastError = error as? GatewayError ?? .connectionFailed
            throw error
        }

        isConnecting = false
    }

    private func performHandshake(endpoint: GatewayEndpoint) async throws {
        guard let url = endpoint.webSocketURL else {
            throw GatewayError.hostNotConfigured
        }

        urlSession = URLSession(configuration: .default, delegate: self, delegateQueue: .main)
        webSocketTask = urlSession?.webSocketTask(with: url)
        webSocketTask?.resume()

        // Start receiving messages
        receiveTask = Task { [weak self] in
            await self?.receiveMessages()
        }

        // Wait for handshake with timeout
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            Task { @MainActor [weak self] in
                guard let self = self else { return }

                // We'll complete the handshake when we receive the challenge response
                // For now, do a simple wait
                Task {
                    try? await Task.sleep(nanoseconds: UInt64(Constants.Gateway.handshakeTimeout * 1_000_000_000))
                    if self.status != .connected {
                        continuation.resume(throwing: GatewayError.handshakeTimeout)
                    }
                }
            }
        }
    }

    private func receiveMessages() async {
        guard let task = webSocketTask else { return }

        do {
            while task.state == .running {
                let message = try await task.receive()
                await handleWebSocketMessage(message)
            }
        } catch {
            if status == .connected {
                Task { @MainActor [weak self] in
                    self?.status = .disconnected
                    try? await self?.reconnect()
                }
            }
        }
    }

    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) async {
        var data: Data?

        switch message {
        case .string(let text):
            data = text.data(using: .utf8)
        case .data(let d):
            data = d
        @unknown default:
            return
        }

        guard let jsonData = data else { return }

        do {
            let gatewayMessage = try JSONDecoder.gateway.decode(GatewayMessage.self, from: jsonData)
            await processGatewayMessage(gatewayMessage)
        } catch {
            lastError = .decodingFailed(error.localizedDescription)
        }
    }

    private func processGatewayMessage(_ message: GatewayMessage) async {
        switch message.type {
        case .event:
            await handleEvent(message)
        case .res:
            handleResponse(message)
        case .req:
            break
        }
    }

    private func handleEvent(_ message: GatewayMessage) async {
        guard let event = message.event else { return }

        switch event {
        case "connect.challenge":
            if let payloadData = message.payload?.value as? [String: Any],
               let nonce = payloadData["nonce"] as? String,
               let ts = payloadData["ts"] as? Int64 {
                let challenge = ChallengePayload(nonce: nonce, ts: ts)
                try? await handleChallenge(challenge)
            }

        case "node.event":
            break

        case "pairing.pending":
            break

        case "pairing.approved":
            break

        case "pairing.rejected":
            break

        default:
            break
        }
    }

    private func handleChallenge(_ challenge: ChallengePayload) async throws {
        currentChallenge = challenge

        let pairingInfo = try? keychainService.loadPairingInfo()
        let authToken = pairingInfo?.deviceToken

        let deviceInfo = try await cryptoService.buildDeviceInfo(
            nonce: challenge.nonce,
            timestamp: challenge.ts
        )

        let enabledCaps = Capability.defaultCapabilities.filter { $0.isEnabled }.map { $0.id }
        let allCommands = enabledCaps.flatMap { capId in
            Capability(id: capId).commands
        }

        let connectRequest = ConnectRequest(
            minProtocol: Constants.Gateway.protocolVersion,
            maxProtocol: Constants.Gateway.protocolVersion,
            client: ConnectRequest.ClientInfo(
                id: Constants.App.clientId,
                version: Constants.App.version,
                platform: Constants.App.platform,
                mode: Constants.App.mode
            ),
            role: "node",
            scopes: [],
            caps: enabledCaps,
            commands: allCommands,
            permissions: enabledCaps.reduce(into: [String: Bool]()) { $0[$1] = true },
            auth: authToken.map { ConnectRequest.AuthInfo(token: $0) },
            device: deviceInfo
        )

        let requestMessage = try buildConnectRequestMessage(connectRequest)
        try await send(message: requestMessage)
    }

    private func buildConnectRequestMessage(_ request: ConnectRequest) throws -> GatewayMessage {
        let params: [String: Any] = [
            "minProtocol": request.minProtocol,
            "maxProtocol": request.maxProtocol,
            "client": [
                "id": request.client.id,
                "version": request.client.version,
                "platform": request.client.platform,
                "mode": request.client.mode
            ],
            "role": request.role,
            "scopes": request.scopes,
            "caps": request.caps,
            "commands": request.commands,
            "permissions": request.permissions,
            "auth": request.auth.map { ["token": $0.token] } as Any,
            "device": [
                "id": request.device.id,
                "publicKey": request.device.publicKey,
                "signature": request.device.signature,
                "signedAt": request.device.signedAt,
                "nonce": request.device.nonce
            ]
        ]

        return GatewayMessage.request(method: "connect", params: params)
    }

    private func handleHelloOK(payload: HelloOKPayload) {
        sessionId = payload.sessionId
        nodeId = payload.nodeId
        status = .connected
    }

    // MARK: - Disconnect

    func disconnect() {
        receiveTask?.cancel()
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        status = .disconnected
        sessionId = nil
        nodeId = nil
        currentEndpoint = nil
        currentChallenge = nil
    }

    // MARK: - Reconnect

    func reconnect() async throws {
        guard let endpoint = currentEndpoint else {
            throw GatewayError.hostNotConfigured
        }

        guard reconnectAttempts < Constants.Gateway.maxReconnectAttempts else {
            reconnectAttempts = 0
            throw GatewayError.connectionFailed
        }

        reconnectAttempts += 1
        status = .connecting

        try await Task.sleep(nanoseconds: UInt64(Constants.Gateway.reconnectDelay * Double(reconnectAttempts) * 1_000_000_000))

        try await connect(to: endpoint)
    }

    // MARK: - Send Request

    func sendRequest<T: Decodable>(method: String, params: [String: Any]? = nil) async throws -> T {
        let message = GatewayMessage.request(method: method, params: params)
        try await send(message: message)

        guard let id = message.id else {
            throw GatewayError.encodingFailed
        }

        return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<T, Error>) in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                // Store the typed continuation with its decode handler
                self.requestContinuations[id] = RequestContinuation(continuation) { msg in
                    do {
                        guard let dict = msg.payload?.value as? [String: Any] else {
                            throw GatewayError.decodingFailed("No payload in response")
                        }
                        let jsonData = try JSONSerialization.data(withJSONObject: dict)
                        let result = try JSONDecoder().decode(T.self, from: jsonData)
                        continuation.resume(returning: result)
                    } catch {
                        continuation.resume(throwing: error)
                    }
                }
            }
        }
    }

    // MARK: - Send Event

    func sendEvent(event: String, payload: Any? = nil) async throws {
        let message = GatewayMessage.event(event: event, payload: payload)
        try await send(message: message)
    }

    // MARK: - Send Response

    func sendResponse(id: String, ok: Bool, result: Any? = nil) async throws {
        let message = GatewayMessage.response(id: id, ok: ok, payload: result)
        try await send(message: message)
    }

    // MARK: - Send Message

    private func send(message: GatewayMessage) async throws {
        guard let task = webSocketTask else {
            throw GatewayError.notConnected
        }

        do {
            let data = try JSONEncoder.gateway.encode(message)
            guard let jsonString = String(data: data, encoding: .utf8) else {
                throw GatewayError.encodingFailed
            }
            try await task.send(.string(jsonString))
        } catch {
            throw GatewayError.encodingFailed
        }
    }

    // MARK: - Handle Response

    private func handleResponse(_ message: GatewayMessage) {
        guard let id = message.id else { return }

        // Handle connect response
        if message.method == "connect" {
            if let payloadData = message.payload?.value as? [String: Any],
               let type = payloadData["type"] as? String,
               type == "hello-ok" {
                let helloPayload = HelloOKPayload(
                    type: type,
                    protocolVersion: payloadData["protocol"] as? Int ?? Constants.Gateway.protocolVersion,
                    sessionId: payloadData["sessionId"] as? String,
                    nodeId: payloadData["nodeId"] as? String
                )
                handleHelloOK(payload: helloPayload)
            }
            return
        }

        if let continuation = pendingRequests.removeValue(forKey: id) {
            continuation.resume(returning: message)
        }
    }

    // MARK: - Handle Event

    private func handleEvent(_ message: GatewayMessage) {
        guard let event = message.event else { return }

        switch event {
        case "node.event":
            break
        case "pairing.pending":
            break
        case "pairing.approved":
            break
        case "pairing.rejected":
            break
        default:
            break
        }
    }

    // MARK: - Update Last Connected

    private func updateLastConnected(endpoint: GatewayEndpoint) {
        var updatedEndpoint = endpoint
        updatedEndpoint.lastConnected = Date()
        var endpoints = loadEndpoints()
        if let index = endpoints.firstIndex(where: { $0.id == endpoint.id }) {
            endpoints[index] = updatedEndpoint
        }
        saveEndpoints(endpoints)
    }

    // MARK: - Endpoint Persistence

    func loadEndpoints() -> [GatewayEndpoint] {
        guard let data = UserDefaults.standard.data(forKey: Constants.UserDefaults.gatewayEndpointsKey),
              let endpoints = try? JSONDecoder().decode([GatewayEndpoint].self, from: data) else {
            return []
        }
        return endpoints
    }

    func saveEndpoints(_ endpoints: [GatewayEndpoint]) {
        if let data = try? JSONEncoder().encode(endpoints) {
            UserDefaults.standard.set(data, forKey: Constants.UserDefaults.gatewayEndpointsKey)
        }
    }
}

// MARK: - URLSessionWebSocketDelegate

extension GatewayClient: URLSessionWebSocketDelegate {
    nonisolated func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        Task { @MainActor [weak self] in
            // Connection opened
        }
    }

    nonisolated func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        Task { @MainActor [weak self] in
            if self?.status == .connected {
                self?.status = .disconnected
                try? await self?.reconnect()
            }
        }
    }
}
