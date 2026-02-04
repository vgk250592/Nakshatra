import SwiftUI

/// Design system colors and styles based on branding guidelines
struct Theme {
    // MARK: - Colors
    static let softLavender = Color(hex: "E9D5FF")
    static let warmPeach = Color(hex: "FECACA")
    static let softMint = Color(hex: "BAE6D3")
    static let paleBlue = Color(hex: "BFDBFE")
    static let pureWhite = Color(hex: "FFFFFF")
    static let charcoal = Color(hex: "1F2937")
    static let softGray = Color(hex: "9CA3AF")

    // Semantic colors
    static let primaryColor = softLavender
    static let accentColor = warmPeach
    static let successColor = softMint
    static let infoColor = paleBlue
    static let backgroundColor = pureWhite
    static let textPrimary = charcoal
    static let textSecondary = softGray

    // MARK: - Gradients
    static let primaryGradient = LinearGradient(
        colors: [softLavender, warmPeach],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let mintGradient = LinearGradient(
        colors: [softMint, paleBlue],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let peachGradient = LinearGradient(
        colors: [warmPeach, Color(hex: "FEF3C7")],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: - Typography
    struct Typography {
        static let largeTitle = Font.system(size: 34, weight: .bold, design: .rounded)
        static let title = Font.system(size: 28, weight: .bold, design: .rounded)
        static let title2 = Font.system(size: 22, weight: .semibold, design: .rounded)
        static let title3 = Font.system(size: 20, weight: .semibold, design: .rounded)
        static let headline = Font.system(size: 17, weight: .semibold, design: .rounded)
        static let body = Font.system(size: 17, weight: .regular, design: .default)
        static let callout = Font.system(size: 16, weight: .regular, design: .default)
        static let subheadline = Font.system(size: 15, weight: .regular, design: .default)
        static let footnote = Font.system(size: 13, weight: .regular, design: .default)
        static let caption = Font.system(size: 12, weight: .regular, design: .default)
    }

    // MARK: - Spacing
    struct Spacing {
        static let xxxs: CGFloat = 2
        static let xxs: CGFloat = 4
        static let xs: CGFloat = 8
        static let sm: CGFloat = 12
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
        static let xxxl: CGFloat = 64
    }

    // MARK: - Corner Radius
    struct CornerRadius {
        static let small: CGFloat = 8
        static let medium: CGFloat = 12
        static let large: CGFloat = 16
        static let xlarge: CGFloat = 24
        static let pill: CGFloat = 50
    }

    // MARK: - Shadows
    struct Shadow {
        static let light = ShadowStyle(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        static let medium = ShadowStyle(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
        static let heavy = ShadowStyle(color: .black.opacity(0.15), radius: 16, x: 0, y: 8)
    }
}

struct ShadowStyle {
    let color: Color
    let radius: CGFloat
    let x: CGFloat
    let y: CGFloat
}

// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - View Modifiers
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.backgroundColor)
            .cornerRadius(Theme.CornerRadius.large)
            .shadow(
                color: Theme.Shadow.light.color,
                radius: Theme.Shadow.light.radius,
                x: Theme.Shadow.light.x,
                y: Theme.Shadow.light.y
            )
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.Typography.headline)
            .foregroundColor(Theme.textPrimary)
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.vertical, Theme.Spacing.md)
            .background(Theme.primaryGradient)
            .cornerRadius(Theme.CornerRadius.pill)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(Theme.Typography.headline)
            .foregroundColor(Theme.primaryColor)
            .padding(.horizontal, Theme.Spacing.lg)
            .padding(.vertical, Theme.Spacing.md)
            .background(Theme.backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.CornerRadius.pill)
                    .stroke(Theme.primaryColor, lineWidth: 2)
            )
            .cornerRadius(Theme.CornerRadius.pill)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}
