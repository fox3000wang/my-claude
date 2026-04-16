import Foundation

enum Constants {
    enum App {
        static let bundleId = "com.openclaw.myclaw"
        static let name = "MyClaw"
        static let version = "0.1.0"
        static let clientId = "myclaw-ios"
        static let platform = "ios"
        static let mode = "node"
    }

    enum Gateway {
        static let defaultPort = 18789
        static let bonjourServiceType = "_openclaw-gw._tcp."
        static let bonjourDomain = "local."
        static let protocolVersion = 3
        static let handshakeTimeout: TimeInterval = 10
        static let reconnectDelay: TimeInterval = 2.0
        static let maxReconnectAttempts = 3
    }

    enum Keychain {
        static let service = "com.openclaw.myclaw"
        static let privateKeyKey = "device_private_key"
        static let publicKeyKey = "device_public_key"
        static let deviceIdKey = "device_id"
        static let deviceTokenKey = "device_token"
        static let pairingInfoKey = "pairing_info"
        static let accessGroup: String? = nil
    }

    enum UserDefaults {
        static let gatewayEndpointsKey = "gateway_endpoints"
        static let lastConnectedEndpointKey = "last_connected_endpoint"
        static let capabilitiesKey = "capabilities"
        static let autoDiscoveryKey = "auto_discovery"
    }

    enum Canvas {
        static let defaultURL = "https://canvas.openclaw.io"
        static let snapshotQuality: CGFloat = 0.8
    }

    enum Errors {
        static let nodeBackgroundUnavailable = "NODE_BACKGROUND_UNAVAILABLE"
        static let hostNotConfigured = "A2UI_HOST_NOT_CONFIGURED"
    }
}
