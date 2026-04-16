import Foundation

// MARK: - AnyCodable

/// A type-erased Codable wrapper for arbitrary JSON values.
struct AnyCodable: Codable, Equatable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let string = try? container.decode(String.self) {
            value = string
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else if container.decodeNil() {
            value = NSNull()
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "AnyCodable cannot decode value"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let string as String:
            try container.encode(string)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let bool as Bool:
            try container.encode(bool)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        case is NSNull:
            try container.encodeNil()
        default:
            throw EncodingError.invalidValue(
                value,
                EncodingError.Context(
                    codingPath: container.codingPath,
                    debugDescription: "AnyCodable cannot encode value of type \(type(of: value))"
                )
            )
        }
    }

    static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
        switch (lhs.value, rhs.value) {
        case let (l as String, r as String): return l == r
        case let (l as Int, r as Int): return l == r
        case let (l as Double, r as Double): return l == r
        case let (l as Bool, r as Bool): return l == r
        case (is NSNull, is NSNull): return true
        default: return false
        }
    }
}

// MARK: - GatewayMessage

/// The root WebSocket message type for all Gateway communications.
struct GatewayMessage: Codable, Equatable {
    let type: MessageType
    let id: String?
    let method: String?
    let event: String?
    let params: [String: AnyCodable]?
    let payload: AnyCodable?

    init(
        type: MessageType,
        id: String? = nil,
        method: String? = nil,
        event: String? = nil,
        params: [String: AnyCodable]? = nil,
        payload: AnyCodable? = nil
    ) {
        self.type = type
        self.id = id
        self.method = method
        self.event = event
        self.params = params
        self.payload = payload
    }

    static func request(id: String = UUID().uuidString, method: String, params: [String: Any]? = nil) -> GatewayMessage {
        GatewayMessage(
            type: .req,
            id: id,
            method: method,
            params: params?.mapValues { AnyCodable($0) }
        )
    }

    static func response(id: String, ok: Bool, payload: Any? = nil) -> GatewayMessage {
        GatewayMessage(
            type: .res,
            id: id,
            payload: payload.map { AnyCodable($0) }
        )
    }

    static func event(event: String, payload: Any? = nil) -> GatewayMessage {
        GatewayMessage(
            type: .event,
            event: event,
            payload: payload.map { AnyCodable($0) }
        )
    }
}

// MARK: - MessageType

enum MessageType: String, Codable {
    case req
    case res
    case event
}

// MARK: - Connect Challenge Payload

struct ChallengePayload: Codable {
    let nonce: String
    let ts: Int64

    var timestamp: Date {
        Date(timeIntervalSince1970: TimeInterval(ts))
    }
}

// MARK: - Connect Request/Response

struct ConnectRequest: Codable {
    let minProtocol: Int
    let maxProtocol: Int
    let client: ClientInfo
    let role: String
    let scopes: [String]
    let caps: [String]
    let commands: [String]
    let permissions: [String: Bool]
    let auth: AuthInfo?
    let device: DeviceInfo

    struct ClientInfo: Codable {
        let id: String
        let version: String
        let platform: String
        let mode: String
    }

    struct AuthInfo: Codable {
        let token: String
    }

    struct DeviceInfo: Codable {
        let id: String
        let publicKey: String
        let signature: String
        let signedAt: Int64
        let nonce: String
    }
}

struct ConnectResponse: Codable {
    let type: String
    let protocolVersion: Int
    let sessionId: String?
    let nodeId: String?

    enum CodingKeys: String, CodingKey {
        case type
        case protocolVersion = "protocol"
        case sessionId
        case nodeId
    }
}

// MARK: - Hello OK Response

struct HelloOKPayload: Codable {
    let type: String
    let protocolVersion: Int
    let sessionId: String?
    let nodeId: String?

    enum CodingKeys: String, CodingKey {
        case type
        case protocolVersion = "protocol"
        case sessionId
        case nodeId
    }
}

// MARK: - Node Event

struct NodeEventPayload: Codable {
    let nodeEvent: String
    let data: [String: AnyCodable]?

    init(nodeEvent: String, data: [String: Any]? = nil) {
        self.nodeEvent = nodeEvent
        self.data = data?.mapValues { AnyCodable($0) }
    }
}

// MARK: - Pairing Messages

struct PairingRequestPayload: Codable {
    let deviceId: String
    let deviceName: String
    let publicKey: String
    let capabilities: [String]
}

enum PairingState: String, Codable {
    case pending
    case approved
    case rejected
    case expired
}

struct PairingResponsePayload: Codable {
    let state: PairingState
    let token: String?
    let reason: String?
}
