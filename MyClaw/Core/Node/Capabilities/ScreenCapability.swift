import Foundation
import ReplayKit

final class ScreenCapability: NodeCapability {
    let id = "screen"
    var isEnabled: Bool = false

    private let recorder = RPScreenRecorder.shared()

    func handleCommand(_ command: String, params: [String: Any]?) async throws -> Any? {
        guard isEnabled else { return nil }

        switch command {
        case "screen.record":
            return try await handleScreenRecord(params: params)
        default:
            return nil
        }
    }

    private func handleScreenRecord(params: [String: Any]?) async throws -> String {
        let action = params?["action"] as? String ?? "status"

        switch action {
        case "start":
            return try await startRecording()
        case "stop":
            return try await stopRecording()
        case "status":
            return recorder.isRecording ? "recording" : "idle"
        default:
            return "unknown_action"
        }
    }

    private func startRecording() async throws -> String {
        guard recorder.isAvailable else {
            throw GatewayError.invalidResponse
        }

        return try await withCheckedThrowingContinuation { continuation in
            recorder.startRecording { error in
                if let error = error {
                    continuation.resume(throwing: GatewayError.websocketError(error.localizedDescription))
                } else {
                    continuation.resume(returning: "recording_started")
                }
            }
        }
    }

    private func stopRecording() async throws -> String {
        return try await withCheckedThrowingContinuation { continuation in
            let tempDir = FileManager.default.temporaryDirectory
            let outputURL = tempDir.appendingPathComponent("screen_recording.mp4")
            recorder.stopRecording(withOutput: outputURL) { error in
                if let error = error {
                    continuation.resume(throwing: GatewayError.websocketError(error.localizedDescription))
                } else {
                    continuation.resume(returning: "recording_stopped")
                }
            }
        }
    }
}
