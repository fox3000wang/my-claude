import UIKit
import WebKit

final class CanvasViewController: UIViewController {
    private lazy var webView: WKWebView = {
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        config.allowsInlineMediaPlayback = true
        config.allowsPictureInPictureMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.allowsLinkPreview = true
        return webView
    }()

    private lazy var progressView: UIProgressView = {
        let progress = UIProgressView(progressViewStyle: .bar)
        progress.translatesAutoresizingMaskIntoConstraints = false
        progress.progressTintColor = .systemBlue
        progress.trackTintColor = .clear
        return progress
    }()

    private var progressObservation: NSKeyValueObservation?

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupProgressObservation()
    }

    private func setupUI() {
        view.backgroundColor = .black

        view.addSubview(webView)
        view.addSubview(progressView)

        let progressTop = progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor)
        let progressLeading = progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor)
        let progressTrailing = progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        let progressHeight = progressView.heightAnchor.constraint(equalToConstant: 2)

        let webViewTop = webView.topAnchor.constraint(equalTo: progressView.bottomAnchor)
        let webViewLeading = webView.leadingAnchor.constraint(equalTo: view.leadingAnchor)
        let webViewTrailing = webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        let webViewBottom = webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)

        NSLayoutConstraint.activate([
            progressTop, progressLeading, progressTrailing, progressHeight,
            webViewTop, webViewLeading, webViewTrailing, webViewBottom
        ])
    }

    private func setupProgressObservation() {
        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, _ in
            DispatchQueue.main.async {
                self?.progressView.progress = Float(webView.estimatedProgress)
                self?.progressView.isHidden = webView.estimatedProgress >= 1.0
            }
        }
    }

    // MARK: - Public API

    func navigate(to url: URL) {
        let request = URLRequest(url: url)
        webView.load(request)
    }

    func evaluateJavaScript(_ script: String) async throws -> Any? {
        try await webView.evaluateJavaScript(script)
    }

    func snapshot() async throws -> UIImage? {
        let config = WKSnapshotConfiguration()
        return try await webView.takeSnapshot(configuration: config)
    }

    deinit {
        progressObservation?.invalidate()
    }
}

// MARK: - WKNavigationDelegate

extension CanvasViewController: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        DispatchQueue.main.async {
            self.progressView.isHidden = false
            self.progressView.progress = 0
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.async {
            self.progressView.isHidden = true
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        DispatchQueue.main.async {
            self.progressView.isHidden = true
        }
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(.allow)
    }
}
