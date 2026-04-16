import Foundation

/// Represents the current connection status of the node.
enum NodeStatus: String, Equatable {
    case disconnected
    case connecting
    case paired
    case connected
    case error

    var displayName: String {
        switch self {
        case .disconnected:
            return "Disconnected"
        case .connecting:
            return "Connecting..."
        case .paired:
            return "Paired"
        case .connected:
            return "Connected"
        case .error:
            return "Error"
        }
    }

    var isConnected: Bool {
        self == .connected
    }

    var canReconnect: Bool {
        self == .disconnected || self == .error
    }
}
