import Foundation
import CoreLocation

final class LocationCapability: NodeCapability {
    let id = "location"
    var isEnabled: Bool = false

    private let locationManager = CLLocationManager()

    func handleCommand(_ command: String, params: [String: Any]?) async throws -> Any? {
        guard isEnabled else { return nil }

        switch command {
        case "location.get":
            return try await getCurrentLocation(params: params)
        default:
            return nil
        }
    }

    private func getCurrentLocation(params: [String: Any]?) async throws -> [String: Any] {
        let highAccuracy = params?["highAccuracy"] as? Bool ?? false

        return try await withCheckedThrowingContinuation { continuation in
            locationManager.desiredAccuracy = highAccuracy ? kCLLocationAccuracyBest : kCLLocationAccuracyHundredMeters

            var observation: NSKeyValueObservation?
            observation = locationManager.observe(\.location) { manager, _ in
                observation?.invalidate()
                if let location = manager.location {
                    let result: [String: Any] = [
                        "latitude": location.coordinate.latitude,
                        "longitude": location.coordinate.longitude,
                        "accuracy": location.horizontalAccuracy,
                        "altitude": location.altitude,
                        "timestamp": location.timestamp.timeIntervalSince1970
                    ]
                    continuation.resume(returning: result)
                } else {
                    continuation.resume(throwing: GatewayError.invalidResponse)
                }
            }

            // Request authorization if needed
            if locationManager.authorizationStatus == .notDetermined {
                locationManager.requestWhenInUseAuthorization()
            }

            locationManager.requestLocation()
        }
    }
}


