import Foundation

/// API service for communicating with the backend
class APIService {
    static let shared = APIService()

    private let baseURL = "http://localhost:3000/api/v1"
    private var authToken: String? {
        UserDefaults.standard.string(forKey: "auth_token")
    }

    private init() {}

    // MARK: - HTTP Methods
    private func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: [String: Any]? = nil
    ) async throws -> T {
        guard let url = URL(string: "\(baseURL)\(endpoint)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            }
            throw APIError.statusCode(httpResponse.statusCode)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Auth Endpoints
    func register(name: String, email: String?, phone: String?, password: String) async throws -> AuthResponse {
        var body: [String: Any] = ["name": name, "password": password]
        if let email = email { body["email"] = email }
        if let phone = phone { body["phone"] = phone }

        let response: APIResponse<AuthData> = try await request(
            endpoint: "/auth/register",
            method: "POST",
            body: body
        )
        return AuthResponse(user: response.data.user, token: response.data.token)
    }

    func login(email: String?, phone: String?, password: String) async throws -> AuthResponse {
        var body: [String: Any] = ["password": password]
        if let email = email { body["email"] = email }
        if let phone = phone { body["phone"] = phone }

        let response: APIResponse<AuthData> = try await request(
            endpoint: "/auth/login",
            method: "POST",
            body: body
        )
        return AuthResponse(user: response.data.user, token: response.data.token)
    }

    func getCurrentUser() async throws -> User {
        let response: APIResponse<UserData> = try await request(endpoint: "/auth/me")
        return response.data.user
    }

    // MARK: - Chart Endpoints
    func generateChart(
        birthDetails: BirthDetails,
        system: AstrologySystem,
        chartStyle: ChartStyle,
        includeInterpretation: Bool
    ) async throws -> ChartResponse {
        let body: [String: Any] = [
            "birthDetails": [
                "date": birthDetails.date,
                "time": birthDetails.time,
                "latitude": birthDetails.latitude,
                "longitude": birthDetails.longitude,
                "timezone": birthDetails.timezone,
            ],
            "system": system.rawValue,
            "chartStyle": chartStyle.rawValue,
            "includeInterpretation": includeInterpretation,
        ]

        let response: APIResponse<ChartData> = try await request(
            endpoint: "/chart/generate",
            method: "POST",
            body: body
        )
        return ChartResponse(
            chart: response.data.chart,
            interpretation: response.data.interpretation,
            yogas: response.data.yogas ?? []
        )
    }

    func askChartQuestion(chartId: String, question: String, history: [[String: String]]) async throws -> String {
        let body: [String: Any] = [
            "chartId": chartId,
            "question": question,
            "conversationHistory": history,
        ]

        let response: APIResponse<QAData> = try await request(
            endpoint: "/chart/ask",
            method: "POST",
            body: body
        )
        return response.data.answer
    }

    // MARK: - Horary Endpoints
    func askHoraryQuestion(
        question: String,
        category: HoraryCategory,
        selectedNumber: Int,
        latitude: Double,
        longitude: Double
    ) async throws -> HoraryResponse {
        let body: [String: Any] = [
            "question": question,
            "category": category.rawValue,
            "selectedNumber": selectedNumber,
            "system": "kp",
            "latitude": latitude,
            "longitude": longitude,
            "timezone": "Asia/Kolkata",
        ]

        let response: APIResponse<HoraryData> = try await request(
            endpoint: "/horary/ask",
            method: "POST",
            body: body
        )
        return HoraryResponse(
            id: response.data.id,
            interpretation: response.data.interpretation,
            rulingPlanets: response.data.rulingPlanets
        )
    }

    func getHoraryQuota() async throws -> QuotaInfo {
        let response: APIResponse<QuotaData> = try await request(endpoint: "/horary/quota")
        return response.data.quota
    }

    // MARK: - Compatibility Endpoints
    func matchCompatibility(
        person1Name: String,
        person1BirthDetails: BirthDetails,
        person2Name: String,
        person2BirthDetails: BirthDetails,
        system: CompatibilitySystem
    ) async throws -> CompatibilityResponse {
        let body: [String: Any] = [
            "person1Name": person1Name,
            "person1BirthDetails": [
                "date": person1BirthDetails.date,
                "time": person1BirthDetails.time,
                "latitude": person1BirthDetails.latitude,
                "longitude": person1BirthDetails.longitude,
                "timezone": person1BirthDetails.timezone,
            ],
            "person2Name": person2Name,
            "person2BirthDetails": [
                "date": person2BirthDetails.date,
                "time": person2BirthDetails.time,
                "latitude": person2BirthDetails.latitude,
                "longitude": person2BirthDetails.longitude,
                "timezone": person2BirthDetails.timezone,
            ],
            "system": system.rawValue,
        ]

        let response: APIResponse<CompatibilityData> = try await request(
            endpoint: "/compatibility/match",
            method: "POST",
            body: body
        )
        return CompatibilityResponse(
            result: response.data.result,
            interpretation: response.data.interpretation
        )
    }

    // MARK: - Prediction Endpoints
    func getDailyPrediction(sign: String) async throws -> String {
        let response: APIResponse<PredictionData> = try await request(
            endpoint: "/predictions/daily/\(sign)"
        )
        return response.data.prediction
    }
}

// MARK: - Response Types
struct APIResponse<T: Decodable>: Decodable {
    let status: String
    let data: T
}

struct ErrorResponse: Decodable {
    let status: String
    let message: String
}

struct AuthData: Decodable {
    let user: User
    let token: String
}

struct UserData: Decodable {
    let user: User
}

struct ChartData: Decodable {
    let chart: Chart
    let interpretation: String?
    let yogas: [Yoga]?
}

struct QAData: Decodable {
    let answer: String
}

struct HoraryData: Decodable {
    let id: String
    let interpretation: String
    let rulingPlanets: [String]
}

struct QuotaData: Decodable {
    let quota: QuotaInfo
}

struct CompatibilityData: Decodable {
    let result: CompatibilityResult
    let interpretation: String?
}

struct PredictionData: Decodable {
    let prediction: String
}

struct AuthResponse {
    let user: User
    let token: String
}

struct ChartResponse {
    let chart: Chart
    let interpretation: String?
    let yogas: [Yoga]
}

struct HoraryResponse {
    let id: String
    let interpretation: String
    let rulingPlanets: [String]
}

struct QuotaInfo: Decodable {
    let limit: Int
    let used: Int
    let remaining: Int
}

struct CompatibilityResponse {
    let result: CompatibilityResult
    let interpretation: String?
}

// MARK: - Errors
enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case statusCode(Int)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .statusCode(let code):
            return "Server returned status code \(code)"
        case .serverError(let message):
            return message
        }
    }
}
