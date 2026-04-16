import Foundation

/// Represents the pairing information between this node and a Gateway.
struct PairingInfo: Codable, Equatable {
    let deviceId: String
    let deviceToken: String
    let gatewayEndpointId: UUID
    let pairedAt: Date

    init(
        deviceId: String,
        deviceToken: String,
        gatewayEndpointId: UUID,
        pairedAt: Date = Date()
    ) {
        self.deviceId = deviceId
        self.deviceToken = deviceToken
        self.gatewayEndpointId = gatewayEndpointId
        self.pairedAt = pairedAt
    }

    var isExpired: Bool {
        false
    }
}
