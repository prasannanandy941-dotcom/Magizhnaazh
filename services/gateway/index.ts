import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requestLogger } from '../../packages/shared-utils/logging';

const app = express();
const PORT = Number(process.env.PORT) || 8000;

const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:8001',
  marketplace: process.env.MARKETPLACE_SERVICE_URL || 'http://localhost:8002',
  eventBudget: process.env.EVENT_BUDGET_SERVICE_URL || 'http://localhost:8003',
  bookingPayment: process.env.BOOKING_PAYMENT_SERVICE_URL || 'http://localhost:8004',
  invitation: process.env.INVITATION_SERVICE_URL || 'http://localhost:8005',
  guestFeedback: process.env.GUEST_FEEDBACK_SERVICE_URL || 'http://localhost:8006',
  monitor: process.env.MONITOR_SERVICE_URL || 'http://localhost:8007',
};

app.use(cors());
app.use(requestLogger('gateway'));

// General limiter across the whole gateway. The monitoring endpoints are
// polled continuously by the admin dashboard, so they're exempt — otherwise a
// single open dashboard exhausts the shared budget and every service call
// starts returning 429s.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/api/v1/monitor') || req.path === '/health',
  })
);

// Stricter limiter on public, unauthenticated submission endpoints.
const publicSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' },
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'UP',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    microservices: SERVICES,
  });
});

app.use('/api/v1/auth', createProxyMiddleware({ target: SERVICES.auth, changeOrigin: true }));
app.use('/api/v1/vendors', createProxyMiddleware({ target: SERVICES.marketplace, changeOrigin: true }));
app.use('/api/v1/categories', createProxyMiddleware({ target: SERVICES.marketplace, changeOrigin: true }));
app.use('/api/v1/locations', createProxyMiddleware({ target: SERVICES.marketplace, changeOrigin: true }));
app.use('/api/v1/banners', createProxyMiddleware({ target: SERVICES.marketplace, changeOrigin: true }));
app.use('/api/v1/events', createProxyMiddleware({ target: SERVICES.eventBudget, changeOrigin: true }));
app.use('/api/v1/bookings', createProxyMiddleware({ target: SERVICES.bookingPayment, changeOrigin: true }));
app.use('/api/v1/settings', createProxyMiddleware({ target: SERVICES.bookingPayment, changeOrigin: true }));
app.use('/api/v1/coupons', createProxyMiddleware({ target: SERVICES.bookingPayment, changeOrigin: true }));
app.use('/api/v1/invitation-templates', createProxyMiddleware({ target: SERVICES.invitation, changeOrigin: true }));
app.use('/api/v1/invitations', createProxyMiddleware({ target: SERVICES.invitation, changeOrigin: true }));
app.use('/api/v1/guests', publicSubmissionLimiter, createProxyMiddleware({ target: SERVICES.guestFeedback, changeOrigin: true }));
app.use('/api/v1/feedback', publicSubmissionLimiter, createProxyMiddleware({ target: SERVICES.guestFeedback, changeOrigin: true }));
app.use('/api/v1/reviews', createProxyMiddleware({ target: SERVICES.guestFeedback, changeOrigin: true }));
app.use('/api/v1/complaints', createProxyMiddleware({ target: SERVICES.guestFeedback, changeOrigin: true }));
app.use('/api/v1/monitor', createProxyMiddleware({ target: SERVICES.monitor, changeOrigin: true }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gateway running on port ${PORT}`);
});
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Magizhnaazh Gateway",
    message: "Gateway is running"
  });
});
