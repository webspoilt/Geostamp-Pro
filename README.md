# GeoStamp Pro Suite

A production-ready **GPS Timestamp Camera & Editor** application with cloud sync capabilities.

```
geostamp-pro/
├── mobile-app/          # Flutter mobile application
├── web-dashboard/       # React + Vite web dashboard
├── backend-api/         # Node.js Express REST API
└── README.md
```

---

## Prerequisites

| Tool             | Version  |
|------------------|----------|
| Node.js          | 18+      |
| npm              | 9+       |
| Flutter SDK      | 3.0+     |
| MongoDB          | 6+ (or Atlas) |
| Android Studio   | Latest   |
| Xcode (macOS)    | Latest   |

---

## Quick Start

### 1. Backend API

```bash
cd backend-api
cp .env.example .env        # edit MONGO_URI & JWT_SECRET
npm install
npm run dev                  # → http://localhost:5000
```

### 2. Web Dashboard

```bash
cd web-dashboard
npm install
npm run dev                  # → http://localhost:5173
```

> The Vite dev server proxies `/api` requests to `localhost:5000` automatically.

### 3. Mobile App

```bash
cd mobile-app
flutter pub get
flutter run                  # launches on connected device / emulator
```

---

## Deployment

### Backend → Railway / Render / Docker

```bash
# Railway
npm i -g railway && railway login && railway init && railway up

# Docker
docker build -t geostamp-api .
docker run -p 5000:5000 -e MONGO_URI=<uri> -e JWT_SECRET=<secret> geostamp-api
```

### Web Dashboard → Vercel / Netlify

```bash
cd web-dashboard
echo "VITE_API_URL=https://your-api.com/api" > .env
npm run build
npx vercel --prod
```

### Mobile → Play Store / App Store

```bash
# Android release
flutter build apk --release

# iOS release
flutter build ipa --release
```

---

## Environment Variables (Backend)

| Variable        | Description                     | Required |
|-----------------|---------------------------------|----------|
| `PORT`          | Server port (default 5000)      | No       |
| `MONGO_URI`     | MongoDB connection string       | **Yes**  |
| `JWT_SECRET`    | JWT signing key (≥ 32 chars)    | **Yes**  |
| `JWT_EXPIRES_IN`| Token lifetime (default `7d`)   | No       |
| `CORS_ORIGIN`   | Allowed CORS origin             | No       |

---

## API Endpoints

| Method | Endpoint              | Auth | Description          |
|--------|-----------------------|------|----------------------|
| POST   | `/api/auth/register`  | ✗    | Create account       |
| POST   | `/api/auth/login`     | ✗    | Sign in              |
| GET    | `/api/auth/profile`   | ✓    | Get current user     |
| GET    | `/api/images`         | ✓    | List images (paged)  |
| POST   | `/api/images`         | ✓    | Upload image         |
| GET    | `/api/images/:id`     | ✓    | Get image details    |
| DELETE | `/api/images/:id`     | ✓    | Delete image         |
| GET    | `/api/locations`      | ✓    | List saved locations |
| POST   | `/api/locations`      | ✓    | Create location      |
| PUT    | `/api/locations/:id`  | ✓    | Update location      |
| DELETE | `/api/locations/:id`  | ✓    | Delete location      |

---

## License

MIT
