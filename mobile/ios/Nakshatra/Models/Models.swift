import Foundation

// MARK: - User Models
struct User: Codable, Identifiable {
    let id: String
    var email: String?
    var phone: String?
    var name: String
    var birthDetails: BirthDetails?
    var preferredChartStyle: ChartStyle
    var preferredSystem: AstrologySystem
    var preferredLanguage: Language
    var subscriptionTier: SubscriptionTier
    var subscriptionExpiresAt: Date?
}

struct BirthDetails: Codable {
    var date: String // YYYY-MM-DD
    var time: String // HH:mm:ss
    var latitude: Double
    var longitude: Double
    var timezone: String
    var city: String?
    var country: String?
}

enum ChartStyle: String, Codable, CaseIterable {
    case northIndian = "north_indian"
    case southIndian = "south_indian"

    var displayName: String {
        switch self {
        case .northIndian: return "North Indian"
        case .southIndian: return "South Indian"
        }
    }
}

enum AstrologySystem: String, Codable, CaseIterable {
    case parashari = "parashari"
    case kp = "kp"

    var displayName: String {
        switch self {
        case .parashari: return "Parashari"
        case .kp: return "KP (Krishnamurti Paddhati)"
        }
    }
}

enum Language: String, Codable, CaseIterable {
    case english = "en"
    case hindi = "hi"

    var displayName: String {
        switch self {
        case .english: return "English"
        case .hindi: return "हिंदी"
        }
    }
}

enum SubscriptionTier: String, Codable, CaseIterable {
    case free = "free"
    case premium = "premium"
    case premiumPlus = "premium_plus"

    var displayName: String {
        switch self {
        case .free: return "Free"
        case .premium: return "Premium"
        case .premiumPlus: return "Premium Plus"
        }
    }
}

// MARK: - Chart Models
struct Chart: Codable, Identifiable {
    let id: String
    let userId: String
    let system: AstrologySystem
    let ascendant: Double
    let ascendantSign: String
    let moonSign: String
    let sunSign: String
    let planets: [PlanetPosition]
    let houses: [House]
    let chartStyle: ChartStyle
    let createdAt: Date
}

struct PlanetPosition: Codable, Identifiable {
    var id: String { planet }
    let planet: String
    let longitude: Double
    let signName: String
    let degree: Int
    let minute: Int
    let second: Int
    let nakshatra: String
    let nakshatraPada: Int
    let nakshatraLord: String
    let isRetrograde: Bool
    let house: Int
    var starLord: String?
    var subLord: String?
}

struct House: Codable, Identifiable {
    var id: Int { house }
    let house: Int
    let cusp: Double
    let signName: String
    let degree: Double
    let lord: String
    let planets: [String]
    var subLord: String?
}

struct Dasha: Codable {
    let planet: String
    let startDate: Date
    let endDate: Date
    let level: String
}

struct Yoga: Codable, Identifiable {
    var id: String { name }
    let name: String
    let type: String
    let planets: [String]
    let houses: [Int]
    let description: String
    let strength: Int
}

struct ChartAnalysis: Codable {
    let chart: Chart
    let currentDasha: Dasha
    let dashaTimeline: [Dasha]
    let yogas: [Yoga]
}

// MARK: - Horary Models
struct HoraryQuestion: Codable, Identifiable {
    let id: String
    let question: String
    let category: HoraryCategory
    let selectedNumber: Int
    let system: AstrologySystem
    let interpretation: String?
    let createdAt: Date
}

enum HoraryCategory: String, Codable, CaseIterable {
    case career, relationship, health, finance, property
    case travel, education, legal, lostItem = "lost_item", timing, general

    var displayName: String {
        switch self {
        case .career: return "Career"
        case .relationship: return "Relationship"
        case .health: return "Health"
        case .finance: return "Finance"
        case .property: return "Property"
        case .travel: return "Travel"
        case .education: return "Education"
        case .legal: return "Legal"
        case .lostItem: return "Lost Item"
        case .timing: return "Timing"
        case .general: return "General"
        }
    }

    var icon: String {
        switch self {
        case .career: return "briefcase.fill"
        case .relationship: return "heart.fill"
        case .health: return "heart.text.square.fill"
        case .finance: return "indianrupeesign.circle.fill"
        case .property: return "house.fill"
        case .travel: return "airplane"
        case .education: return "graduationcap.fill"
        case .legal: return "scale.3d"
        case .lostItem: return "magnifyingglass"
        case .timing: return "clock.fill"
        case .general: return "questionmark.circle.fill"
        }
    }
}

// MARK: - Compatibility Models
struct CompatibilityMatch: Codable, Identifiable {
    let id: String
    let person1Name: String
    let person2Name: String
    let system: CompatibilitySystem
    let result: CompatibilityResult
    let interpretation: String?
    let createdAt: Date
}

enum CompatibilitySystem: String, Codable, CaseIterable {
    case ashtakoot = "ashtakoot"
    case dashakoot = "dashakoot"

    var displayName: String {
        switch self {
        case .ashtakoot: return "Ashtakoot (North)"
        case .dashakoot: return "Dashakoot (South)"
        }
    }
}

struct CompatibilityResult: Codable {
    let totalPoints: Int?
    let matchedCount: Int?
    let percentage: Double
    let overallCompatibility: String
    let recommendation: String
}

// MARK: - Prediction Models
struct DailyPrediction: Codable, Identifiable {
    var id: String { sign + date }
    let sign: String
    let date: String
    let prediction: String
}

// MARK: - Zodiac
struct ZodiacSign: Identifiable {
    let id = UUID()
    let name: String
    let symbol: String
    let element: String
    let ruler: String

    static let all: [ZodiacSign] = [
        ZodiacSign(name: "Aries", symbol: "♈", element: "Fire", ruler: "Mars"),
        ZodiacSign(name: "Taurus", symbol: "♉", element: "Earth", ruler: "Venus"),
        ZodiacSign(name: "Gemini", symbol: "♊", element: "Air", ruler: "Mercury"),
        ZodiacSign(name: "Cancer", symbol: "♋", element: "Water", ruler: "Moon"),
        ZodiacSign(name: "Leo", symbol: "♌", element: "Fire", ruler: "Sun"),
        ZodiacSign(name: "Virgo", symbol: "♍", element: "Earth", ruler: "Mercury"),
        ZodiacSign(name: "Libra", symbol: "♎", element: "Air", ruler: "Venus"),
        ZodiacSign(name: "Scorpio", symbol: "♏", element: "Water", ruler: "Mars"),
        ZodiacSign(name: "Sagittarius", symbol: "♐", element: "Fire", ruler: "Jupiter"),
        ZodiacSign(name: "Capricorn", symbol: "♑", element: "Earth", ruler: "Saturn"),
        ZodiacSign(name: "Aquarius", symbol: "♒", element: "Air", ruler: "Saturn"),
        ZodiacSign(name: "Pisces", symbol: "♓", element: "Water", ruler: "Jupiter"),
    ]
}
