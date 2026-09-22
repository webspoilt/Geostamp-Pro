# GeoStamp Pro Suite

A production-grade, hardened **GPS Timestamp Camera & Editor** platform with cloud synchronization, interactive OpenStreetMap exploration, and dual-layer local/S3-R2 storage.

[![CI Pipeline](https://github.com/webspoilt/Geostamp-Pro/actions/workflows/ci.yml/badge.svg)](https://github.com/webspoilt/Geostamp-Pro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

```
geostamp-pro/
├── mobile-app/          # Flutter mobile app (Secure KeyStore, On-Device GPS Stamper, Gallery)
├── web-dashboard/       # React + Leaflet OpenStreetMap dashboard + Canvas Stamp Editor
├── backend-api/         # Node.js Express API (Helmet, Rate Limiter, S3/R2 Storage, 2dsphere Geo)
├── docker-compose.yml   # Multi-container orchestration (API + MongoDB)
└── README.md
```

---

## 🔒 Security & Architecture Highlights

- **Strict Access Control**: Zero public upload holes. All image queries and files are scoped strictly to the authenticated owner (or admin role).
- **Dual-Storage Engine**: Direct AWS S3 / Cloudflare R2 object storage with presigned URLs, with automatic zero-dependency local disk fallback for development.
- **Image Sanitization**: Uses `sharp` and `heic-convert` to strip dangerous payloads, convert iPhone `.heic` files to JPEG, and generate 400px thumbnails.
- **Null Island & Geo Guard**: Strictly rejects coordinates `(0, 0)` and invalid GPS inputs with HTTP `422 Unprocessable Entity`.
- **Infrastructure Protection**: Reverse-proxy trust configuration (`trust proxy = 1`), brute-force rate limiters, anti-injection query guards, and clamped pagination ($\le 100$).
- **Hardware-Backed Mobile Auth**: Sensitive tokens stored via `FlutterSecureStorage` (iOS Keychain / Android Keystore).

---

## Quick Start

### 1. Run with Docker Compose (Recommended)

```bash
docker compose up -d
```
The API is available at `http://localhost:5000` and MongoDB is auto-initialized with persistent volumes and healthchecks.

### 2. Manual Development Setup

#### Backend API
```bash
cd backend-api
cp .env.example .env        # Configure MONGO_URI and JWT_SECRET
npm install
npm test                    # Run Jest regression test suite
npm run dev                 # Starts at http://localhost:5000
```

#### Web Dashboard
```bash
cd web-dashboard
npm install
npm run dev                 # Starts at http://localhost:5173
```
> The Vite development server automatically proxies `/api` calls to `localhost:5000`.

#### Mobile App
```bash
cd mobile-app
flutter pub get
flutter run                 # Launches on Android/iOS/Web
```

---

## 📍 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | ✗ | Register new user account |
| POST | `/api/auth/login` | ✗ | Authenticate & acquire JWT (Rate limited) |
| GET | `/api/auth/profile` | ✓ | Current user profile |
| GET | `/api/images/nearby` | ✓ | Viewport geo query using MongoDB `$near` 2dsphere |
| GET | `/api/images` | ✓ | List user's photos (clamped pagination $\le 100$) |
| POST | `/api/images` | ✓ | Upload & sanitize photo (multipart with GPS coords) |
| GET | `/api/images/:id` | ✓ | Get photo metadata (owner or admin only) |
| GET | `/api/images/:id/file` | ✓ | Stream full photo or redirect to S3 presigned URL |
| GET | `/api/images/:id/thumb` | ✓ | Stream 400px thumbnail or redirect to S3 presigned URL |
| DELETE | `/api/images/:id` | ✓ | Delete photo and remove files from storage |
| GET | `/api/locations` | ✓ | List user's saved project locations |
| POST | `/api/locations` | ✓ | Save custom location coordinate |

---

## 🛠️ Admin CLI Tools

Promote an existing user to admin:
```bash
cd backend-api
npm run make-admin -- user@example.com
```

Migrate local uploads to AWS S3 or Cloudflare R2:
```bash
cd backend-api
node scripts/migrate-uploads-to-s3.js
```

---

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 GeoStamp Pro.
