import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { requestLogger } from '../../packages/shared-utils/logging';
import { serviceUrl } from '../../packages/shared-utils/serviceUrl';

const app = express();
const PORT = Number(process.env.PORT) || 8000;

const SERVICES = {
  auth: serviceUrl(process.env.AUTH_SERVICE_URL, 'http://localhost:8001'),
  marketplace: serviceUrl(process.env.MARKETPLACE_SERVICE_URL, 'http://localhost:8002'),
  eventBudget: serviceUrl(process.env.EVENT_BUDGET_SERVICE_URL, 'http://localhost:8003'),
  bookingPayment: serviceUrl(process.env.BOOKING_PAYMENT_SERVICE_URL, 'http://localhost:8004'),
  invitation: serviceUrl(process.env.INVITATION_SERVICE_URL, 'http://localhost:8005'),
  guestFeedback: serviceUrl(process.env.GUEST_FEEDBACK_SERVICE_URL, 'http://localhost:8006'),
  monitor: serviceUrl(process.env.MONITOR_SERVICE_URL, 'http://localhost:8007'),
};

app.use(cors());
app.use(requestLogger('gateway'));

// Behind a reverse proxy (nginx on the VPS, Render's edge on the cloud) the
// real client IP is in X-Forwarded-For; the socket IP is the proxy's, which is
// the SAME for every visitor. Trust one proxy hop so req.ip resolves to the
// actual client — otherwise the rate limiter below keys every request to the
// proxy's single IP, all users share one bucket, and a little normal traffic
// 429s the entire app.
app.set('trust proxy', 1);

// General limiter across the whole gateway, keyed per client IP. The monitoring
// endpoints are polled continuously by the admin dashboard, so they're exempt —
// otherwise a single open dashboard exhausts that client's budget. The limit is
// deliberately generous: the web apps fire several calls on each page load and
// poll in the background, so a real session makes many legitimate requests.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down and try again shortly.' },
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

// Shared proxy options. On Render's free tier an idle upstream sleeps and
// takes ~50s to wake; the default proxy gives up early and the browser sees a
// raw 502/HTML page. We wait long enough for the upstream to wake, and on any
// proxy error reply with a clean, retryable JSON 503 that the frontend's
// cold-start retry recognises — so a waking service is never surfaced to the
// user as a hard failure.
const UPSTREAM_WAKE_MS = 100000; // > observed free-tier cold start (~50s), with headroom
const proxyDefaults = {
  changeOrigin: true,
  proxyTimeout: UPSTREAM_WAKE_MS, // how long to wait for the target to respond
  timeout: UPSTREAM_WAKE_MS,      // how long to keep the incoming socket open
  onError: (_err: Error, _req: Request, res: Response) => {
    if (res.headersSent) {
      try { res.end(); } catch { /* nothing more we can do */ }
      return;
    }
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: 'Server is starting up. Please try again in a moment.' }));
  },
};

app.use('/api/v1/auth', createProxyMiddleware({ target: SERVICES.auth, ...proxyDefaults }));
app.use('/api/v1/vendors', createProxyMiddleware({ target: SERVICES.marketplace, ...proxyDefaults }));
app.use('/api/v1/categories', createProxyMiddleware({ target: SERVICES.marketplace, ...proxyDefaults }));
app.use('/api/v1/locations', createProxyMiddleware({ target: SERVICES.marketplace, ...proxyDefaults }));
app.use('/api/v1/banners', createProxyMiddleware({ target: SERVICES.marketplace, ...proxyDefaults }));
app.use('/api/v1/uploads', createProxyMiddleware({ target: SERVICES.marketplace, ...proxyDefaults }));
app.use('/api/v1/events', createProxyMiddleware({ target: SERVICES.eventBudget, ...proxyDefaults }));
app.use('/api/v1/bookings', createProxyMiddleware({ target: SERVICES.bookingPayment, ...proxyDefaults }));
app.use('/api/v1/settings', createProxyMiddleware({ target: SERVICES.bookingPayment, ...proxyDefaults }));
app.use('/api/v1/settlements', createProxyMiddleware({ target: SERVICES.bookingPayment, ...proxyDefaults }));
app.use('/api/v1/coupons', createProxyMiddleware({ target: SERVICES.bookingPayment, ...proxyDefaults }));
app.use('/api/v1/invitation-templates', createProxyMiddleware({ target: SERVICES.invitation, ...proxyDefaults }));
app.use('/api/v1/invitations', createProxyMiddleware({ target: SERVICES.invitation, ...proxyDefaults }));
app.use('/api/v1/guests', publicSubmissionLimiter, createProxyMiddleware({ target: SERVICES.guestFeedback, ...proxyDefaults }));
app.use('/api/v1/feedback', publicSubmissionLimiter, createProxyMiddleware({ target: SERVICES.guestFeedback, ...proxyDefaults }));
app.use('/api/v1/reviews', createProxyMiddleware({ target: SERVICES.guestFeedback, ...proxyDefaults }));
app.use('/api/v1/complaints', createProxyMiddleware({ target: SERVICES.guestFeedback, ...proxyDefaults }));
app.use('/api/v1/monitor', createProxyMiddleware({ target: SERVICES.monitor, ...proxyDefaults }));

// Keep-alive: while the gateway is awake, ping every backend service's public
// /health on an interval shorter than Render's ~15 min idle window so they
// don't sleep out from under an active session. This does NOT keep the gateway
// itself awake — point one external uptime pinger at the gateway's /health for
// that, and it will keep the whole mesh warm through these pings.
const KEEPALIVE_MS = 10 * 60 * 1000;
setInterval(() => {
  for (const url of Object.values(SERVICES)) {
    fetch(`${url}/health`, { signal: AbortSignal.timeout(8000) }).catch(() => {
      /* best-effort warm-up; a failed ping just means we retry next tick */
    });
  }
}, KEEPALIVE_MS);

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
