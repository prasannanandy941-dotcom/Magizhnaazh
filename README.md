# Magizhnaazh (மகிழ்னாள்) — Microservices Event Management & Vendor Marketplace Platform

Magizhnaazh is an enterprise-grade, scalable **Event Commerce Platform & Vendor Marketplace** built with a decoupled Microservices Architecture on the MERN stack (MongoDB, Express, React/Vite, Node.js, TypeScript).

---

## 🌟 Key Features

1. **E-Commerce Vendor Marketplace**: Location radius discovery (MongoDB `2dsphere` geo search), category filters, vendor comparison matrix, verified partner badges, and service package management.
2. **Smart Event Budget Planner**: Percentage-based dynamic budget allocator, actual vs planned spend tracking, budget overflow warnings, and real-time vendor match scoring.
3. **Canva-Style Digital Invitation Designer**: Interactive canvas editor with drag-and-drop elements, typography controls, public web invitation links (`/invite/:token`) backed by cryptographically random tokens, and a server-side SVG render endpoint.
4. **Guest Management & RSVP Tracker**: Guest roster grouping, dietary preferences (Veg/Non-Veg/Jain/Vegan), transport/hotel logistics tracking, and real-time RSVP responses.
5. **Public Guest Feedback System**: Anonymous, rate-limited guest feedback on venue, catering, decoration, and organization — no account required.
6. **Verified Vendor Reviews**: A review can only be published once the underlying booking is confirmed `completed` and belongs to that customer/vendor pair (checked live against `booking-payment-service`), with a unique index blocking duplicates.
7. **Local Disk Storage Engine**: `LocalStorageProvider` abstraction serving uploaded media directly from local disk (`/uploads`) without requiring cloud S3/R2 accounts.
8. **Microservices Architecture**: Centralized API Gateway orchestrating independent microservices for Auth, Marketplace, Event/Budget, Booking/Payments, Invitations, and Guest/Feedback — each with its own MongoDB database and JWT-verifying auth middleware.

---

## 🏗️ Architecture & Ports Overview

```
                                [ Web Apps: customer 3000 / vendor 3001 / admin 3002 ]
                                           │
                                 [ API Gateway: 8000 ]
     ┌───────────────────┬─────────────────┼───────────────────┬───────────────────┬───────────────────┐
     │                   │                 │                   │                   │                   │
[Auth: 8001]   [Marketplace: 8002]  [EventBudget: 8003]  [BookingPay: 8004]  [Invite: 8005]     [GuestFeedback: 8006]
                         │                                       ▲
                  [ Local Disk: /uploads ]                       │ verifies booking on review submit
                                                          [MongoDB :27017]
```

| Microservice | Port | Database | Main Responsibility |
|---|---|---|---|
| **API Gateway** | `8000` | — | Central routing, request-id logging, rate limiting, CORS. |
| **Auth Service** | `8001` | `magizhnaazh_auth` | Registration/login (bcrypt), real JWT issuance, RBAC. |
| **Marketplace Service** | `8002` | `magizhnaazh_marketplace` | Vendor search, package pricing, GeoSearch, Local Disk uploads. |
| **Event & Budget Service**| `8003` | `magizhnaazh_event_budget` | Event wizard, smart budget percentage calculator. |
| **Booking & Payment Service**|`8004`| `magizhnaazh_booking` | Quotation negotiation, booking reservations, deposit simulation. |
| **Invitation Service**|`8005`| `magizhnaazh_invitation` | Canva JSON canvas storage, public invite view + SVG render. |
| **Guest & Feedback Service**|`8006`| `magizhnaazh_guest_feedback` | Guest RSVP tracking, public feedback links, verified vendor reviews. |
| **Customer Web** | `3000` | — | Customer-facing React + Tailwind marketplace/event app. |
| **Vendor Web** | `3001` | — | Vendor dashboard (bookings, packages, portfolio). |
| **Admin Web** | `3002` | — | Admin/governance dashboard. |
| **Mobile** | Expo | — | React Native shell (Home/Events/Vendors/Profile). |

Gateway routes: `/api/v1/{auth,vendors,events,bookings,invitations,guests,feedback,reviews}`.

---

## 🚀 Quick Start & Development

### 1. Install dependencies
```bash
npm install
```

### 2. Start MongoDB
```bash
npm run docker:up
```
This brings up a local MongoDB (`localhost:27017`) and a Mongo Express admin UI at `http://localhost:8081`. Stop it with `npm run docker:down`.

### 3. Configure environment variables
Each service reads its own `.env` (falls back to sane localhost defaults for the gateway's proxy targets, but **requires** `JWT_SECRET`/`MONGODB_URI` to boot). Copy the example file per service and set a shared `JWT_SECRET` (any long random string, but it must be identical across every service — each verifies JWTs independently rather than calling back into auth-service):

```bash
for d in gateway auth-service marketplace-service event-budget-service booking-payment-service invitation-service guest-feedback-service; do
  cp services/$d/.env.example services/$d/.env
done
```

Then edit each `services/*/.env` and set the same `JWT_SECRET` value everywhere.

### 4. Launch the microservices
Run each in its own terminal:
```bash
npm run dev:gateway
npm run dev:auth
npm run dev:marketplace
npm run dev:event-budget
npm run dev:booking
npm run dev:invitation
npm run dev:guest-feedback
```

### 5. Launch a web app
```bash
npm run dev:customer   # http://localhost:3000
npm run dev:vendor     # http://localhost:3001
npm run dev:admin      # http://localhost:3002
```

Demo login (seeded on first boot of `auth-service`): `customer@magizhnaazh.com` / `vendor@magizhnaazh.com` / `admin@magizhnaazh.com`, password `Passw0rd!` for all three.

---

## 🧭 Roadmap

This backend pass focused on making persistence, auth, and the gateway real. Not yet done (tracked as future phases, not silently dropped):
- Wiring `customer-web`/`vendor-web`/`admin-web`/mobile UI to call the gateway instead of local mock state, plus real login/register screens.
- Kafka/RabbitMQ event bus, outbox pattern, saga orchestration for the booking→payment→confirmation flow.
- Invitation PNG/PDF export pipeline (currently: JSON canvas + server-rendered SVG only).
- Kubernetes manifests, CI/CD, OpenTelemetry/Prometheus/Grafana observability.

---

## 🛡️ License
Copyright © 2026 Magizhnaazh Technologies. All rights reserved.
