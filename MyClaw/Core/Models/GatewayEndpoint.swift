import Foundation

/// Represents a Gateway endpoint that the node can connect to.
struct GatewayEndpoint: Codable, Identifiable, Equatable {
    let id: UUID
    var name: String
    var host: String
    var port: Int
    var useTLS: Bool
    var lastConnected: Date?

    init(
        id: UUID = UUID(),
        name: String,
        host: String,
        port: Int = 18789,
        useTLS: Bool = false,
        lastConnected: Date? = nil
    ) {
        self.id = id
        self.name = name
        self.host = host
        self.port = port
        self.useTLS = useTLS
        self.lastConnected = lastConnected
    }

    var webSocketURL: URL? {
        let scheme = useTLS ? "wss" : "ws"
        return URL(string: "\(scheme)://\(host):\(port)")
    }

    static func fromBonjour(name: String, host: String, port: Int) -> GatewayEndpoint {
        GatewayEndpoint(
            name: name,
            host: host,
            port: port,
            useTLS: false
        )
    }
}
