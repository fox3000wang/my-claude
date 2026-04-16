import Foundation
import WebKit
import UIKit

protocol NodeCapability {
    var id: String { get }
    var isEnabled: Bool { get set }
    func handleCommand(_ command: String, params: [String: Any]?) async throws -> Any?
}

final class CanvasCapability: NodeCapability {
    let id = "canvas"

    var isEnabled: Bool = true
    weak var webView: WKWebView?

    func handleCommand(_ command: String, params: [String: Any]?) async throws -> Any? {
        guard isEnabled else { return nil }

        switch command {
        case "canvas.navigate":
            return try await handleNavigate(params: params)
        case "canvas.eval":
            return try await handleEval(params: params)
        case "canvas.snapshot":
            return try await handleSnapshot()
        default:
            return nil
        }
    }

    private func handleNavigate(params: [String: Any]?) async throws -> String {
        guard let webView = webView,
              let urlString = params?["url"] as? String,
              let url = URL(string: urlString) else {
            throw GatewayError.hostNotConfigured
        }

        await MainActor.run {
            webView.load(URLRequest(url: url))
        }
        return "navigated"
    }

    private func handleEval(params: [String: Any]?) async throws -> Any {
        guard let webView = webView,
              let script = params?["script"] as? String else {
            throw GatewayError.encodingFailed
        }

        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.main.async {
                webView.evaluateJavaScript(script) { result, error in
                    if let error = error {
                        continuation.resume(throwing: GatewayError.websocketError(error.localizedDescription))
                    } else {
                        continuation.resume(returning: result as Any)
                    }
                }
            }
        }
    }

    private func handleSnapshot() async throws -> String {
        guard let webView = webView else {
            throw GatewayError.hostNotConfigured
        }

        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.main.async {
                let config = WKSnapshotConfiguration()
                webView.takeSnapshot(with: config) { image, error in
                    if let error = error {
                        continuation.resume(throwing: GatewayError.websocketError(error.localizedDescription))
                    } else if let image = image {
                        if let data = image.jpegData(compressionQuality: Constants.Canvas.snapshotQuality) {
                            let base64 = data.base64EncodedString()
                            continuation.resume(returning: base64)
                        } else {
                            continuation.resume(throwing: GatewayError.encodingFailed)
                        }
                    } else {
                        continuation.resume(throwing: GatewayError.invalidResponse)
                    }
                }
            }
        }
    }
}
