# Nakshatra Horoscope

**Ancient Wisdom, Modern Insight**

A mobile astrology application that brings traditional Indian Vedic astrology to your fingertips, combining ancient wisdom with modern AI technology.

## Overview

Nakshatra Horoscope is a comprehensive Vedic astrology app that provides:

- **Birth Chart Generation (Kundali)** - Accurate Vedic birth charts using Swiss Ephemeris calculations
- **Dual System Support** - Both Parashari and KP (Krishnamurti Paddhati) systems
- **AI-Powered Interpretations** - Personalized readings using Claude AI
- **Horary Astrology (Prashna)** - Instant answers without birth details
- **Compatibility Matching** - Ashtakoot (36-point) and Dashakoot (10-point) systems
- **Daily/Monthly/Yearly Predictions** - Based on transits and dasha periods
- **Personalized Remedies** - Traditional solutions for planetary challenges

## Project Structure

```
Nakshatra/
├── backend/                 # Node.js/TypeScript API
│   ├── src/
│   │   ├── api/            # Routes and middleware
│   │   ├── services/       # Business logic
│   │   │   ├── astrology/  # Calculation engines
│   │   │   ├── ai/         # Claude AI integration
│   │   │   ├── horary/     # Prashna astrology
│   │   │   └── compatibility/  # Matching services
│   │   ├── models/         # Data models and schemas
│   │   ├── utils/          # Utilities
│   │   └── config/         # Configuration
│   └── package.json
│
├── mobile/
│   └── ios/                # iOS SwiftUI app
│       └── Nakshatra/
│           ├── App/        # Main app entry
│           ├── Views/      # SwiftUI views
│           ├── Models/     # Data models
│           ├── Services/   # API and auth services
│           └── Utils/      # Theme and utilities
│
└── docs/                   # Documentation
```

## Features

### Birth Chart (Kundali)
- Generate accurate Vedic birth charts
- Support for both North Indian (diamond) and South Indian (square) styles
- Planetary positions with degrees, nakshatras, and house placements
- Yoga identification (Gajakesari, Budha-Aditya, etc.)
- Vimshottari Dasha calculation
- Divisional charts (D9 Navamsa, D10 Dasamsa)

### Astrology Systems

**Parashari System (Traditional)**
- Classical Vedic astrology based on Parashara's principles
- Lahiri Ayanamsa
- Equal house system
- Traditional yoga analysis

**KP System (Krishnamurti Paddhati)**
- Stellar astrology for precise predictions
- KP Ayanamsa
- Placidus house system
- Sub-lord theory and significators
- Ruling planets analysis

### Horary Astrology (Prashna Jyotish)
- Ask specific questions without birth details
- KP number selection (1-249)
- Instant chart generation for the moment of asking
- AI-powered interpretation
- Categories: Career, Relationship, Health, Finance, Property, etc.

### Compatibility Matching

**Ashtakoot (North Indian)**
- 36-point Guna Milan system
- 8 kootas: Varna, Vasya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi
- Mangal Dosha and Nadi Dosha detection

**Dashakoot (South Indian)**
- 10-point Porutham system
- Essential and secondary poruthams
- Papa Samyam and Dasha Sandhi analysis

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **AI**: Anthropic Claude API
- **Calculations**: Swiss Ephemeris
- **Authentication**: JWT with Firebase Auth

### iOS App
- **Framework**: SwiftUI
- **Minimum iOS**: 17.0
- **Architecture**: MVVM
- **Networking**: URLSession with async/await

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Xcode 15+ (for iOS development)
- Anthropic API key

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### iOS Setup

1. Open `mobile/ios/Nakshatra` in Xcode
2. Update the API base URL in `APIService.swift`
3. Build and run on simulator or device

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Charts
- `POST /api/v1/chart/generate` - Generate birth chart
- `GET /api/v1/chart/:id` - Get chart by ID
- `POST /api/v1/chart/interpret` - Get AI interpretation
- `POST /api/v1/chart/ask` - Q&A about chart

### Horary
- `GET /api/v1/horary/categories` - Get question categories
- `POST /api/v1/horary/ask` - Ask horary question
- `GET /api/v1/horary/quota` - Get question quota

### Compatibility
- `POST /api/v1/compatibility/match` - Perform matching
- `GET /api/v1/compatibility/systems` - Get system info

### Predictions
- `GET /api/v1/predictions/daily/:sign` - Daily horoscope
- `POST /api/v1/predictions/personalized` - Personalized prediction

## Subscription Tiers

| Feature | Free | Premium (₹299/mo) | Premium Plus (₹599/mo) |
|---------|------|-------------------|------------------------|
| Basic Chart | ✓ | ✓ | ✓ |
| KP System | - | ✓ | ✓ |
| Horary Questions | 1/month | 3/month | Unlimited |
| Compatibility | - | 3/month | Unlimited |
| AI Interpretations | - | ✓ | ✓ |
| Remedies | - | ✓ | Detailed |

## Design System

### Colors
- **Soft Lavender**: #E9D5FF (Primary)
- **Warm Peach**: #FECACA (Accent)
- **Soft Mint**: #BAE6D3 (Success)
- **Pale Blue**: #BFDBFE (Info)
- **Charcoal**: #1F2937 (Text)

### Typography
- SF Pro Rounded (iOS)
- Clean, modern aesthetic with generous spacing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary. All rights reserved.

## Acknowledgments

- Swiss Ephemeris for astronomical calculations
- Anthropic Claude for AI-powered interpretations
- Traditional Vedic astrology texts and teachers

---

**Nakshatra Horoscope** - Bringing authentic Vedic astrology guidance to anyone, anytime.
