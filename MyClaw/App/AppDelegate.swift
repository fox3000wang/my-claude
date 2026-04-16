import UIKit
import SwiftUI

class AppDelegate: NSObject, UIApplicationDelegate {

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        configureAppearance()
        return true
    }

    // MARK: - Background Modes

    func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        let sceneConfig = UISceneConfiguration(name: nil, sessionRole: connectingSceneSession.role)
        sceneConfig.delegateClass = SceneDelegate.self
        return sceneConfig
    }

    // MARK: - Appearance

    private func configureAppearance() {
        let appearance = UINavigationBarAppearance()
        appearance.configureWithDefaultBackground()
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance

        let tabBarAppearance = UITabBarAppearance()
        tabBarAppearance.configureWithDefaultBackground()
        UITabBar.appearance().standardAppearance = tabBarAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
    }
}

// MARK: - Scene Delegate

class SceneDelegate: NSObject, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = UIHostingController(rootView: ContentView())
        self.window = window
        window.makeKeyAndVisible()
    }

    func sceneDidDisconnect(_ scene: UIScene) {
        // Clean up resources when scene is disconnected
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        // Resume any paused tasks
        Logger.shared.info("App became active")
    }

    func sceneWillResignActive(_ scene: UIScene) {
        // Pause ongoing tasks if needed
    }

    func sceneWillEnterForeground(_ scene: UIScene) {
        Logger.shared.info("App entering foreground")
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        Logger.shared.info("App entered background")
        // Note: WebSocket connection maintained in background if backgroundModes configured
    }
}
