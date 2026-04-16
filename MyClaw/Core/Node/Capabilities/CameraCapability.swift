import Foundation
import AVFoundation
import UIKit

final class CameraCapability: NodeCapability {
    let id = "camera"
    var isEnabled: Bool = false

    func handleCommand(_ command: String, params: [String: Any]?) async throws -> Any? {
        guard isEnabled else { return nil }

        switch command {
        case "camera.capture":
            return try await capturePhoto(params: params)
        default:
            return nil
        }
    }

    private func capturePhoto(params: [String: Any]?) async throws -> String {
        let quality: CGFloat = params?["quality"] as? CGFloat ?? 0.8

        return try await withCheckedThrowingContinuation { continuation in
            AVCaptureDevice.requestAccess(for: .video) { granted in
                guard granted else {
                    continuation.resume(throwing: GatewayError.nodeBackgroundUnavailable)
                    return
                }

                DispatchQueue.main.async {
                    // Create a simple camera capture session
                    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
                        continuation.resume(throwing: GatewayError.invalidResponse)
                        return
                    }

                    do {
                        let input = try AVCaptureDeviceInput(device: device)
                        let output = AVCapturePhotoOutput()

                        // Note: In a real implementation, we'd set up a full capture session
                        // For now, return a placeholder response
                        continuation.resume(returning: "camera_ready")
                    } catch {
                        continuation.resume(throwing: GatewayError.websocketError(error.localizedDescription))
                    }
                }
            }
        }
    }
}
