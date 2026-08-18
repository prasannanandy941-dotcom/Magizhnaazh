import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { spawn } from 'child_process';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { authMiddleware, requireRole } from '../../packages/shared-utils/auth';
import { registerHealthRoute } from '../../packages/shared-utils/health';

const app = express();
const PORT = Number(process.env.PORT) || 8007;
const POLL_INTERVAL_MS = Number(process.env.MONITOR_POLL_INTERVAL_MS) || 10000;
const HISTORY_LEN = 180; // ~30 min of history at a 10s cadence
const ALLOW_RESTART = String(process.env.MONITOR_ALLOW_RESTART).toLowerCase() === 'true';
const RESTART_COOLDOWN_MS = (Number(process.env.MONITOR_RESTART_COOLDOWN_S) || 60) * 1000;

// The repo root — two levels up from services/monitor-service — used as the cwd
// for restart spawns so `npm run dev:<key>` resolves the root package scripts.
const REPO_ROOT = path.resolve(__dirname, '../..');

interface ServiceDef {
  key: string; // matches the root package.json `dev:<key>` script
  name: string;
  port: number;
  dependsOn: string[]; // keys this service depends on (for the dependency graph)
}

// The monitored topology. The gateway fronts every downstream service, so it
// depends on all of them; the leaf services each stand alone (they talk to
// MongoDB, which is outside this process graph).
const SERVICES: ServiceDef[] = [
  { key: 'gateway', name: 'API Gateway', port: 8000, dependsOn: ['auth', 'marketplace', 'event-budget', 'booking', 'invitation', 'guest-feedback'] },
  { key: 'auth', name: 'Auth Service', port: 8001, dependsOn: [] },
  { key: 'marketplace', name: 'Marketplace', port: 8002, dependsOn: [] },
  { key: 'event-budget', name: 'Event & Budget', port: 8003, dependsOn: [] },
  { key: 'booking', name: 'Booking & Pay', port: 8004, dependsOn: [] },
  { key: 'invitation', name: 'Invitation', port: 8005, dependsOn: [] },
  { key: 'guest-feedback', name: 'Guest & Feedback', port: 8006, dependsOn: [] },
];

const SERVICE_BY_KEY = new Map(SERVICES.map((s) => [s.key, s]));

interface Sample {
  t: number; // epoch ms
  up: boolean;
  responseMs: number | null;
}

interface ServiceState {
  up: boolean;
  responseMs: number | null;
  lastChangeAt: number; // when up/down last flipped
  lastCheckedAt: number;
  consecutiveFailures: number;
  history: Sample[];
  lastRestartAt: number; // 0 = never
}

const state = new Map<string, ServiceState>(
  SERVICES.map((s) => [
    s.key,
    { up: true, responseMs: null, lastChangeAt: Date.now(), lastCheckedAt: 0, consecutiveFailures: 0, history: [], lastRestartAt: 0 },
  ])
);

// ---------------------------------------------------------------------------
// Alerting — Slack, email (SMTP), plus an in-app feed the admin panel polls.
// ---------------------------------------------------------------------------

interface AlertEvent {
  id: string;
  at: number;
  service: string;
  kind: 'down' | 'recovered';
  message: string;
  channels: string[]; // which channels actually delivered
}

const alertFeed: AlertEvent[] = []; // most-recent-first, capped
const ALERT_FEED_LEN = 50;

const slackWebhook = process.env.SLACK_WEBHOOK_URL?.trim();
const smtpHost = process.env.SMTP_HOST?.trim();

async function sendSlack(text: string): Promise<boolean> {
  if (!slackWebhook) return false;
  try {
    const res = await fetch(slackWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (err) {
    console.error('[monitor] Slack alert failed:', (err as Error).message);
    return false;
  }
}

// nodemailer is optional — the service still runs if it isn't installed.
let mailTransport: any = null;
let mailerReady = false;
async function initMailer() {
  if (!smtpHost) return;
  try {
    const nodemailer = await import('nodemailer');
    mailTransport = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    mailerReady = true;
    console.log('[monitor] SMTP email alerts enabled.');
  } catch (err) {
    console.warn('[monitor] SMTP configured but nodemailer unavailable — run `npm install` in services/monitor-service. Email alerts disabled.');
  }
}

async function sendEmail(subject: string, text: string): Promise<boolean> {
  if (!mailerReady || !mailTransport) return false;
  const to = process.env.ALERT_EMAIL_TO?.trim();
  if (!to) return false;
  try {
    await mailTransport.sendMail({
      from: process.env.ALERT_EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.error('[monitor] Email alert failed:', (err as Error).message);
    return false;
  }
}

async function dispatchAlert(svc: ServiceDef, kind: 'down' | 'recovered') {
  const when = new Date().toISOString();
  const emoji = kind === 'down' ? '🔴' : '🟢';
  const headline =
    kind === 'down'
      ? `${emoji} ${svc.name} (port ${svc.port}) is DOWN`
      : `${emoji} ${svc.name} (port ${svc.port}) has RECOVERED`;
  const body = `${headline}\nTime: ${when}\nService key: ${svc.key}`;

  const channels: string[] = ['in-app'];
  const [slackOk, emailOk] = await Promise.all([
    sendSlack(body),
    sendEmail(headline, body),
  ]);
  if (slackOk) channels.push('slack');
  if (emailOk) channels.push('email');

  const event: AlertEvent = {
    id: `alert-${Date.now()}-${svc.key}`,
    at: Date.now(),
    service: svc.key,
    kind,
    message: headline,
    channels,
  };
  alertFeed.unshift(event);
  if (alertFeed.length > ALERT_FEED_LEN) alertFeed.length = ALERT_FEED_LEN;
  console.log(`[monitor] ${headline} — notified via: ${channels.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Auto-restart — best-effort local-dev only.
// ---------------------------------------------------------------------------

function restartCommand(key: string): string {
  return `npm run dev:${key}`;
}

interface RestartResult {
  attempted: boolean;
  spawned: boolean;
  reason?: string;
  command: string;
}

function restartService(key: string): RestartResult {
  const svc = SERVICE_BY_KEY.get(key);
  const command = restartCommand(key);
  if (!svc) return { attempted: false, spawned: false, reason: 'unknown service', command };
  if (!ALLOW_RESTART) {
    return { attempted: false, spawned: false, reason: 'auto-restart disabled (set MONITOR_ALLOW_RESTART=true)', command };
  }
  try {
    // Detached so the child outlives this request; ignore stdio so it doesn't
    // hold the monitor's streams open. shell:true so `npm` resolves on Windows.
    const child = spawn('npm', ['run', `dev:${key}`], {
      cwd: REPO_ROOT,
      detached: true,
      stdio: 'ignore',
      shell: true,
    });
    child.unref();
    state.get(key)!.lastRestartAt = Date.now();
    console.log(`[monitor] Spawned restart for ${svc.name}: ${command}`);
    return { attempted: true, spawned: true, command };
  } catch (err) {
    return { attempted: true, spawned: false, reason: (err as Error).message, command };
  }
}

// ---------------------------------------------------------------------------
// Health polling loop.
// ---------------------------------------------------------------------------

async function checkService(svc: ServiceDef): Promise<{ up: boolean; responseMs: number | null }> {
  const start = Date.now();
  try {
    const res = await fetch(`http://localhost:${svc.port}/health`, { signal: AbortSignal.timeout(4000) });
    const responseMs = Date.now() - start;
    return { up: res.ok, responseMs };
  } catch {
    return { up: false, responseMs: null };
  }
}

async function pollOnce() {
  await Promise.all(
    SERVICES.map(async (svc) => {
      const st = state.get(svc.key)!;
      const { up, responseMs } = await checkService(svc);
      const now = Date.now();

      const wasUp = st.up;
      st.up = up;
      st.responseMs = responseMs;
      st.lastCheckedAt = now;
      st.consecutiveFailures = up ? 0 : st.consecutiveFailures + 1;

      st.history.push({ t: now, up, responseMs });
      if (st.history.length > HISTORY_LEN) st.history.shift();

      if (wasUp !== up) {
        st.lastChangeAt = now;
        // Fire on any transition. (First poll compares against the optimistic
        // "up" default, so a service that starts down alerts on the first tick.)
        dispatchAlert(svc, up ? 'recovered' : 'down');
      }

      // Auto-restart: only once the service has been failing and outside the
      // cooldown window, so we don't thrash on a service that's mid-restart.
      if (!up && ALLOW_RESTART && st.consecutiveFailures >= 2 && now - st.lastRestartAt > RESTART_COOLDOWN_MS) {
        restartService(svc.key);
      }
    })
  );
}

// ---------------------------------------------------------------------------
// REST API.
// ---------------------------------------------------------------------------

app.use(cors());
app.use(express.json());
registerHealthRoute(app, 'monitor-service');

function summarize(key: string) {
  const svc = SERVICE_BY_KEY.get(key)!;
  const st = state.get(key)!;
  return {
    key: svc.key,
    name: svc.name,
    port: svc.port,
    dependsOn: svc.dependsOn,
    up: st.up,
    responseMs: st.responseMs,
    lastChangeAt: st.lastChangeAt,
    lastCheckedAt: st.lastCheckedAt,
    uptimeSince: st.lastChangeAt,
    restartCommand: restartCommand(key),
    // History is bundled here so the dashboard needs a single poll per tick
    // (sparklines + dependency graph are derived from this one response).
    history: st.history,
  };
}

// Current status of every service + history, dependency graph, rollup, and
// alert-channel availability — everything the dashboard needs in one call.
app.get('/api/v1/monitor/status', (_req: Request, res: Response) => {
  const services = SERVICES.map((s) => summarize(s.key));
  const up = services.filter((s) => s.up).length;
  const nodes = services.map((s) => ({ key: s.key, name: s.name, port: s.port, up: s.up, responseMs: s.responseMs }));
  const edges = SERVICES.flatMap((s) => s.dependsOn.map((dep) => ({ from: s.key, to: dep })));
  res.json({
    success: true,
    data: {
      services,
      summary: { up, total: services.length, allUp: up === services.length },
      dependencies: { nodes, edges },
      alerts: {
        recent: alertFeed.slice(0, 20),
        channels: {
          slack: Boolean(slackWebhook),
          email: mailerReady,
          inApp: true,
        },
      },
      restart: { enabled: ALLOW_RESTART },
      polledEveryMs: POLL_INTERVAL_MS,
    },
  });
});

// Time-series history for sparkline/graphs. ?key=<one> or all services.
app.get('/api/v1/monitor/history', (req: Request, res: Response) => {
  const key = req.query.key ? String(req.query.key) : null;
  if (key) {
    const st = state.get(key);
    if (!st) return res.status(404).json({ success: false, message: 'Unknown service.' });
    return res.json({ success: true, data: { key, history: st.history } });
  }
  const histories = SERVICES.map((s) => ({ key: s.key, name: s.name, history: state.get(s.key)!.history }));
  res.json({ success: true, data: { histories } });
});

// Dependency graph (nodes + edges) with live status baked into each node.
app.get('/api/v1/monitor/dependencies', (_req: Request, res: Response) => {
  const nodes = SERVICES.map((s) => {
    const st = state.get(s.key)!;
    return { key: s.key, name: s.name, port: s.port, up: st.up, responseMs: st.responseMs };
  });
  const edges = SERVICES.flatMap((s) => s.dependsOn.map((dep) => ({ from: s.key, to: dep })));
  res.json({ success: true, data: { nodes, edges } });
});

// Manual restart — admin only. Always returns the exact command so an operator
// can run it by hand when auto-restart is disabled or the spawn can't help.
app.post('/api/v1/monitor/restart/:key', authMiddleware(), requireRole('admin'), (req: Request, res: Response) => {
  const key = req.params.key;
  if (!SERVICE_BY_KEY.has(key)) {
    return res.status(404).json({ success: false, message: 'Unknown service key.' });
  }
  const result = restartService(key);
  res.json({
    success: result.spawned || !ALLOW_RESTART,
    message: result.spawned
      ? `Restart spawned for ${SERVICE_BY_KEY.get(key)!.name}.`
      : result.reason || 'Restart not performed.',
    data: result,
  });
});

async function start() {
  await initMailer();
  // Prime one poll before opening the port so the first request has real data.
  await pollOnce();
  setInterval(() => {
    pollOnce().catch((err) => console.error('[monitor] poll error:', err));
  }, POLL_INTERVAL_MS);

  app.listen(PORT, () => {
    console.log(`[Monitor Microservice] Running on http://localhost:${PORT}`);
    console.log(`[monitor] Polling ${SERVICES.length} services every ${POLL_INTERVAL_MS}ms.`);
    console.log(`[monitor] Alerts → slack:${Boolean(slackWebhook)} email:${mailerReady} in-app:true | auto-restart:${ALLOW_RESTART}`);
  });
}

start();
