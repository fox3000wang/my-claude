import Foundation
import WebKit
import Combine

@MainActor
final class CanvasViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var currentURL: URL?
    @Published var pageTitle: String = "Canvas"
    @Published var errorMessage: String?

    weak var webView: WKWebView?
    private let canvasCapability = CanvasCapability()

    func setWebView(_ webView: WKWebView) {
        self.webView = webView
        canvasCapability.webView = webView
    }

    func navigate(to url: URL) {
        isLoading = true
        errorMessage = nil
        webView?.load(URLRequest(url: url))
        currentURL = url
    }

    func reload() {
        webView?.reload()
    }

    func goBack() {
        webView?.goBack()
    }

    func goForward() {
        webView?.goForward()
    }

    func evaluateJavaScript(_ script: String) async throws -> Any? {
        guard let webView = webView else {
            throw GatewayError.hostNotConfigured
        }

        return try await withCheckedThrowingContinuation { continuation in
            webView.evaluateJavaScript(script) { result, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: result)
                }
            }
        }
    }

    func updateNavigationState(canGoBack: Bool, canGoForward: Bool) {
        self.canGoBack = canGoBack
        self.canGoForward = canGoForward
    }

    func handlePageLoad(url: URL?, title: String?) {
        isLoading = false
        currentURL = url
        if let title = title, !title.isEmpty {
            pageTitle = title
        }
    }

    func handleLoadError(_ error: Error) {
        isLoading = false
        errorMessage = error.localizedDescription
    }

    func handleChallenge(command: String, params: [String: Any]?) async throws -> Any? {
        try await canvasCapability.handleCommand(command, params: params)
    }
}
