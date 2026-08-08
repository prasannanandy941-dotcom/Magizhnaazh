# Magizhnaazh (மகிழ்னாள்) — Microservices Event Management & Vendor Marketplace Platform

Magizhnaazh is an enterprise-grade, scalable **Event Commerce Platform & Vendor Marketplace** built with a decoupled Microservices Architecture on the MERN stack (MongoDB, Express, React/Next.js, Node.js, TypeScript).

---

## 🌟 Key Features

1. **E-Commerce Vendor Marketplace**: Location radius discovery, category filters, vendor comparison matrix, verified partner badges, and service package management.
2. **Smart Event Budget Planner**: Percentage-based dynamic budget allocator, actual vs planned spend tracking, budget overflow warnings, and real-time vendor match scoring.
3. **Canva-Style Digital Invitation Designer**: Interactive canvas editor with drag-and-drop elements, typography controls, dynamic RSVP QR codes, public web invitation links (`/invite/:token`), and PNG/PDF export pipeline.
4. **Guest Management & RSVP Tracker**: Guest roster grouping, dietary preferences (Veg/Non-Veg), transport/hotel logistics tracking, and real-time RSVP responses.
5. **Public Guest Feedback System**: Printable QR links (`/feedback/event/:token`) for anonymous guest reviews on venue, catering, decoration, and organization.
6. **Local Disk Storage Engine**: `LocalStorageProvider` abstraction serving uploaded media directly from local disk (`/uploads`) without requiring cloud S3/R2 accounts.
7. **Microservices Architecture**: Centralized API Gateway orchestrating independent microservices for Auth, Marketplace, Event/Budget, Booking/Payments, Invitations, and Guest/Feedback.

---

## 🏗️ Architecture & Ports Overview

```
                                [ Web App (Port 3000) ]
                                           │
                                 [ API Gateway: 8000 ]
     ┌───────────────────┬─────────────────┼───────────────────┬───────────────────┐
     │                   │                 │                   │                   │
[Auth: 8001]   [Marketplace: 8002]  [EventBudget: 8003]  [BookingPay: 8004]  [Invite: 8005]
                         │
                  [ Local Disk: /uploads ]
```

| Microservice | Port | Main Responsibility |
|---|---|---|
| **API Gateway** | `8000` | Central routing, authentication validation, CORS, rate limiting. |
| **Auth Service** | `8001` | User registration, login, JWT token issuance, RBAC. |
| **Marketplace Service** | `8002` | Vendor search, package pricing, GeoSearch, Local Disk uploads. |
| **Event & Budget Service**| `8003` | Event wizard, smart budget percentage calculator, vendor match engine. |
| **Booking & Payment Service**|`8004`| Quotation negotiation, booking reservations, deposit simulation. |
| **Invitation & Canvas Service**|`8005`| Canva JSON canvas storage, SVG/Web invitation renderer. |
| **Guest & Feedback Service**|`8006`| Guest RSVP tracking, guest feedback links, verified vendor reviews. |
| **Web Application** | `3000` | React + Tailwind CSS client with modern glassmorphism design system. |

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Web Application
```bash
cd apps/web
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Launch Microservices
```bash
# Start API Gateway (Port 8000)
npx ts-node-dev services/gateway/index.ts

# Start Marketplace Microservice (Port 8002)
npx ts-node-dev services/marketplace-service/index.ts
```

---

## 🛡️ License
Copyright © 2026 Magizhnaazh Technologies. All rights reserved.
