import Foundation
import SwiftUI
import Combine

/// Manages user authentication state
@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var error: String?

    private let apiService = APIService.shared
    private let tokenKey = "auth_token"

    init() {
        checkStoredToken()
    }

    // MARK: - Token Management
    private func checkStoredToken() {
        if let _ = UserDefaults.standard.string(forKey: tokenKey) {
            // In production, validate token with server
            isAuthenticated = true
            fetchCurrentUser()
        }
    }

    private func saveToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: tokenKey)
    }

    private func clearToken() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
    }

    // MARK: - Authentication Methods
    func register(name: String, email: String?, phone: String?, password: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await apiService.register(
                name: name,
                email: email,
                phone: phone,
                password: password
            )
            saveToken(response.token)
            currentUser = response.user
            isAuthenticated = true
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    func login(email: String?, phone: String?, password: String) async {
        isLoading = true
        error = nil

        do {
            let response = try await apiService.login(
                email: email,
                phone: phone,
                password: password
            )
            saveToken(response.token)
            currentUser = response.user
            isAuthenticated = true
            isLoading = false
        } catch {
            self.error = error.localizedDescription
            isLoading = false
        }
    }

    func logout() {
        clearToken()
        currentUser = nil
        isAuthenticated = false
    }

    private func fetchCurrentUser() {
        Task {
            do {
                let user = try await apiService.getCurrentUser()
                self.currentUser = user
            } catch {
                // Token might be invalid, log out
                self.logout()
            }
        }
    }
}

/// Manages user preferences
@MainActor
class UserPreferences: ObservableObject {
    @AppStorage("chartStyle") private var chartStyleRaw: String = ChartStyle.northIndian.rawValue
    @AppStorage("astrologySystem") private var astrologySystemRaw: String = AstrologySystem.parashari.rawValue
    @AppStorage("language") private var languageRaw: String = Language.english.rawValue
    @AppStorage("hasCompletedOnboarding") var hasCompletedOnboarding = false
    @AppStorage("birthDetailsEntered") var birthDetailsEntered = false

    @Published var birthDetails: BirthDetails?

    var chartStyle: ChartStyle {
        get { ChartStyle(rawValue: chartStyleRaw) ?? .northIndian }
        set { chartStyleRaw = newValue.rawValue }
    }

    var astrologySystem: AstrologySystem {
        get { AstrologySystem(rawValue: astrologySystemRaw) ?? .parashari }
        set { astrologySystemRaw = newValue.rawValue }
    }

    var language: Language {
        get { Language(rawValue: languageRaw) ?? .english }
        set { languageRaw = newValue.rawValue }
    }

    func saveBirthDetails(_ details: BirthDetails) {
        birthDetails = details
        birthDetailsEntered = true
        // In production, also save to server
    }
}
