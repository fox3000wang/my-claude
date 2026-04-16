import SwiftUI

// MARK: - ErrorBanner Modifier

/// A view modifier that displays an error banner at the top of the view.
/// Usage: `.modifier(ErrorBannerModifier(error: $viewModel.error))`
struct ErrorBannerModifier: ViewModifier {
    @Binding var error: Error?
    var autoDismiss: Bool = true
    var dismissAfter: TimeInterval = 5.0

    @State private var isVisible = false

    func body(content: Content) -> some View {
        ZStack(alignment: .top) {
            content

            if isVisible, let error = error {
                ErrorBanner(
                    message: error.localizedDescription,
                    onDismiss: { dismiss() }
                )
                .transition(.move(edge: .top).combined(with: .opacity))
                .zIndex(999)
            }
        }
        .onChange(of: error) { _, newError in
            if newError != nil {
                show()
            }
        }
    }

    private func show() {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            isVisible = true
        }
        if autoDismiss {
            DispatchQueue.main.asyncAfter(deadline: .now() + dismissAfter) {
                dismiss()
            }
        }
    }

    private func dismiss() {
        withAnimation(.easeOut(duration: 0.25)) {
            isVisible = false
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            error = nil
        }
    }
}

// MARK: - ErrorBanner View

struct ErrorBanner: View {
    let message: String
    var type: BannerType = .error
    let onDismiss: () -> Void

    enum BannerType {
        case error
        case warning
        case info

        var icon: String {
            switch self {
            case .error: return "xmark.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            case .info: return "info.circle.fill"
            }
        }

        var color: Color {
            switch self {
            case .error: return .red
            case .warning: return .orange
            case .info: return .blue
            }
        }

        var backgroundColor: Color {
            switch self {
            case .error: return .red.opacity(0.12)
            case .warning: return .orange.opacity(0.12)
            case .info: return .blue.opacity(0.12)
            }
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: type.icon)
                .foregroundColor(type.color)
                .font(.system(size: 18, weight: .medium))

            Text(message)
                .font(.subheadline)
                .foregroundColor(.primary)
                .lineLimit(2)

            Spacer()

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.secondary)
                    .padding(4)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(type.backgroundColor)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(type.color.opacity(0.3), lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)
    }
}

// MARK: - Error Banner Wrapper (Standalone)

/// A standalone error banner that can be placed anywhere in a view hierarchy.
struct ErrorBannerWrapper: View {
    @ObservedObject var errorManager: ErrorManager

    var body: some View {
        if let error = errorManager.currentError {
            ErrorBanner(
                message: error.localizedDescription,
                type: errorManager.bannerType,
                onDismiss: { errorManager.dismissCurrentError() }
            )
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}

// MARK: - Error Manager (ObservableObject)

/// A shared error manager for showing errors across the app.
/// Usage: Attach to App or root view, access via Environment.
@MainActor
final class ErrorManager: ObservableObject {
    @Published var currentError: Error?
    @Published var bannerType: BannerTypeType = .error

    enum BannerTypeType {
        case error
        case warning
        case info
    }

    func show(_ error: Error, type: BannerTypeType = .error) {
        currentError = error
        bannerType = type
    }

    func show(message: String, type: BannerTypeType = .error) {
        currentError = NSError(domain: "MyClaw", code: -1, userInfo: [
            NSLocalizedDescriptionKey: message
        ])
        bannerType = type
    }

    func dismissCurrentError() {
        currentError = nil
    }
}

// MARK: - View Extension

extension View {
    /// Attach an error banner to the view that responds to a binding.
    func errorBanner(error: Binding<Error?>, autoDismiss: Bool = true) -> some View {
        modifier(ErrorBannerModifier(error: error, autoDismiss: autoDismiss))
    }

    /// Attach the shared ErrorManager's error banner.
    func errorBanner(manager: ErrorManager) -> some View {
        overlay(alignment: .top) {
            ErrorBannerWrapper(errorManager: manager)
                .animation(.spring(response: 0.3, dampingFraction: 0.8), value: manager.currentError != nil)
        }
    }
}

// MARK: - Preview

#Preview {
    VStack {
        Spacer()
        Text("Content below")
    }
    .errorBanner(error: .constant(NSError(
        domain: "MyClaw",
        code: -1,
        userInfo: [NSLocalizedDescriptionKey: "Failed to connect to Gateway"]
    )))
}
