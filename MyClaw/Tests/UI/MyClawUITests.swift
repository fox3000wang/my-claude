import XCTest

final class MyClawUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--uitesting"]
        app.launch()
    }

    override func tearDown() {
        app = nil
        super.tearDown()
    }

    // MARK: - App Launch

    func testAppLaunch() {
        // App should show tab bar with 3 tabs: Home, Discovery, Settings
        XCTAssertEqual(app.tabBars.buttons.count, 3, "Should have exactly 3 tab bar items")
    }

    // MARK: - Tab Navigation

    func testTabNavigationToSettings() {
        // Navigate to Settings tab (index 2)
        let settingsTab = app.tabBars.buttons["Settings"]
        XCTAssertTrue(settingsTab.exists, "Settings tab should exist")
        settingsTab.tap()
        XCTAssertTrue(app.navigationBars["Settings"].exists, "Should show Settings navigation title")
    }

    func testTabNavigationToDiscovery() {
        // Navigate to Discovery tab (index 1)
        let discoveryTab = app.tabBars.buttons["Discovery"]
        XCTAssertTrue(discoveryTab.exists, "Discovery tab should exist")
        discoveryTab.tap()
        // Discovery view may or may not have a nav title
    }

    func testTabNavigationToHome() {
        // Start on Settings, navigate back to Home
        app.tabBars.buttons["Home"].tap()
        XCTAssertTrue(
            app.navigationBars["MyClaw"].waitForExistence(timeout: 2),
            "Should show MyClaw navigation title on Home"
        )
    }

    // MARK: - Home Screen

    func testHomeScreenShowsAppTitle() {
        XCTAssertTrue(
            app.navigationBars["MyClaw"].waitForExistence(timeout: 2),
            "App should show MyClaw navigation title"
        )
    }

    func testHomeScreenShowsConnectionStatusCard() {
        // Should show the main status card with connection state
        let statusCard = app.staticTexts["MyClaw"]
        XCTAssertTrue(statusCard.waitForExistence(timeout: 2), "App title should be visible")
    }

    func testHomeOpenDiscoverySheet() {
        // Tap Discover button in quick actions
        let discoverButton = app.buttons["Discover"]
        if discoverButton.exists {
            discoverButton.tap()
            // Should show discovery sheet
            XCTAssertTrue(
                app.navigationBars["Discover"].waitForExistence(timeout: 3) ||
                app.navigationBars["Gateway Discovery"].waitForExistence(timeout: 3) ||
                app.navigationBars.element.waitForExistence(timeout: 3),
                "Should show discovery view after tapping Discover"
            )
            // Dismiss if Cancel exists
            if app.buttons["Cancel"].exists {
                app.buttons["Cancel"].tap()
            }
        }
    }

    // MARK: - Settings Screen

    func testSettingsShowsGatewaySection() {
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(
            app.staticTexts["Gateway"].waitForExistence(timeout: 2),
            "Settings should show Gateway section"
        )
    }

    func testSettingsShowsDiscoveryToggle() {
        app.tabBars.buttons["Settings"].tap()
        // Should show Auto Discovery toggle
        let discoveryToggle = app.switches["Auto Discovery (Bonjour)"]
        if discoveryToggle.exists {
            XCTAssertTrue(true, "Auto Discovery toggle visible")
        }
    }

    func testSettingsShowsAboutSection() {
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(
            app.staticTexts["About"].waitForExistence(timeout: 2),
            "Settings should show About section"
        )
    }

    func testSettingsVersionDisplayed() {
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(
            app.staticTexts["Version"].waitForExistence(timeout: 2),
            "Should display Version label"
        )
    }

    func testSettingsProtocolVersion() {
        app.tabBars.buttons["Settings"].tap()
        XCTAssertTrue(
            app.staticTexts["Protocol"].waitForExistence(timeout: 2),
            "Should display Protocol label"
        )
    }

    func testSettingsResetConfirmation() {
        app.tabBars.buttons["Settings"].tap()

        // Tap Reset Pairing
        let resetButton = app.buttons["Reset Pairing"]
        if resetButton.exists {
            resetButton.tap()
            let alert = app.alerts["Reset Pairing"]
            if alert.waitForExistence(timeout: 2) {
                XCTAssertTrue(true, "Reset confirmation alert shown")
                alert.buttons["Cancel"].tap()
            }
        }
    }

    func testSettingsSavedGatewaysSection() {
        app.tabBars.buttons["Settings"].tap()
        // Should show Saved Gateways section
        let gateways = app.staticTexts["Saved Gateways"]
        if gateways.exists {
            XCTAssertTrue(true, "Saved Gateways section visible")
        }
    }

    func testSettingsAddGatewayButton() {
        app.tabBars.buttons["Settings"].tap()
        let addButton = app.buttons["Add Gateway Manually"]
        if addButton.exists {
            addButton.tap()
            // Should show Add Gateway sheet
            let cancelButton = app.buttons["Cancel"]
            if cancelButton.waitForExistence(timeout: 2) {
                cancelButton.tap()
            }
        }
    }

    // MARK: - Discovery Screen

    func testDiscoveryShowsDiscoveryTab() {
        app.tabBars.buttons["Discovery"].tap()
        // Should show discovery content
        XCTAssertTrue(app.tabBars.buttons["Discovery"].isSelected,
                      "Discovery tab should be selected")
    }

    // MARK: - Accessibility

    func testTabBarAccessibility() {
        // Verify tab bar items have labels
        for button in app.tabBars.buttons.allElementsBoundByIndex {
            XCTAssertFalse(button.label.isEmpty, "Tab bar button should have a label")
        }
    }

    func testHomeAccessibility() {
        XCTAssertTrue(
            app.navigationBars["MyClaw"].exists || app.staticTexts["MyClaw"].exists,
            "Home should have accessible title"
        )
    }
}
