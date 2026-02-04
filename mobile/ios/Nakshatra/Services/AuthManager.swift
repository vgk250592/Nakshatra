import Foundation
import SwiftUI

/// Manages user authentication state
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
        await MainActor.run { isLoading = true; error = nil }

        do {
            let response = try await apiService.register(
                name: name,
                email: email,
                phone: phone,
                password: password
            )
            saveToken(response.token)
            await MainActor.run {
                currentUser = response.user
                isAuthenticated = true
                isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                isLoading = false
            }
        }
    }

    func login(email: String?, phone: String?, password: String) async {
        await MainActor.run { isLoading = true; error = nil }

        do {
            let response = try await apiService.login(
                email: email,
                phone: phone,
                password: password
            )
            saveToken(response.token)
            await MainActor.run {
                currentUser = response.user
                isAuthenticated = true
                isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                isLoading = false
            }
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
                await MainActor.run {
                    self.currentUser = user
                }
            } catch {
                // Token might be invalid, log out
                await MainActor.run {
                    self.logout()
                }
            }
        }
    }
}

/// Manages user preferences
class UserPreferences: ObservableObject {
    @AppStorage("chartStyle") var chartStyle: ChartStyle = .northIndian
    @AppStorage("astrologySystem") var astrologySystem: AstrologySystem = .parashari
    @AppStorage("language") var language: Language = .english
    @AppStorage("hasCompletedOnboarding") var hasCompletedOnboarding = false
    @AppStorage("birthDetailsEntered") var birthDetailsEntered = false

    @Published var birthDetails: BirthDetails?

    func saveBirthDetails(_ details: BirthDetails) {
        birthDetails = details
        birthDetailsEntered = true
        // In production, also save to server
    }
}
