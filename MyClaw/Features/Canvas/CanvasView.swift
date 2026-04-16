import SwiftUI
import WebKit

struct CanvasView: UIViewRepresentable {
    @ObservedObject var viewModel: CanvasViewModel
    let canvasURL: URL?

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        config.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsLinkPreview = true

        DispatchQueue.main.async {
            viewModel.setWebView(webView)
        }

        if let url = canvasURL {
            webView.load(URLRequest(url: url))
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if let url = canvasURL,
           webView.url != url,
           !webView.isLoading {
            webView.load(URLRequest(url: url))
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(viewModel: viewModel)
    }

    class Coordinator: NSObject, WKNavigationDelegate {
        let viewModel: CanvasViewModel

        init(viewModel: CanvasViewModel) {
            self.viewModel = viewModel
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.viewModel.isLoading = true
                self.viewModel.errorMessage = nil
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.viewModel.handlePageLoad(url: webView.url, title: webView.title)
                self.viewModel.updateNavigationState(
                    canGoBack: webView.canGoBack,
                    canGoForward: webView.canGoForward
                )
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.viewModel.handleLoadError(error)
            }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.viewModel.handleLoadError(error)
            }
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.viewModel.updateNavigationState(
                    canGoBack: webView.canGoBack,
                    canGoForward: webView.canGoForward
                )
            }
        }
    }
}
