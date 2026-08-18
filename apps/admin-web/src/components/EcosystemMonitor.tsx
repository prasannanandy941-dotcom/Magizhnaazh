import React, { useEffect, useState, useCallback } from 'react';
import {
  Server, Loader2, RefreshCw, AlertTriangle, Bell, Mail, Activity,
  Slack, Moon, Sun, GitBranch, RotateCw, Clock, CheckCircle2,
} from 'lucide-react';
import {
  fetchMonitorStatus, restartService, updateSettings,
  MonitorStatus, MonitorDependencies, MonitorSample,
} from '../api';

const THEME_KEY = 'magizhnaazh_theme';
const POLL_MS = 8000;

// ---- Response-time sparkline -------------------------------------------------
const Sparkline: React.FC<{ samples: MonitorSample[] }> = ({ samples }) => {
  const W = 180;
  const H = 40;
  if (samples.length < 2) {
    return <div className="text-[10px] text-slate-500 h-10 flex items-center">Collecting…</div>;
  }
  const times = samples.map((s) => s.responseMs).filter((v): v is number => v != null);
  const max = Math.max(50, ...times);
  const stepX = W / (samples.length - 1);

  // Build the up-time line; down samples become red dots pinned to the baseline.
  const pts = samples.map((s, i) => {
    const x = i * stepX;
    const y = s.up && s.responseMs != null ? H - (s.responseMs / max) * (H - 6) - 3 : H - 2;
    return { x, y, up: s.up };
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none">
      <path d={line} fill="none" stroke="#6366f1" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      {pts.map((p, i) => !p.up && (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill="#f43f5e" />
      ))}
    </svg>
  );
};

// ---- Service dependency graph ------------------------------------------------
const DependencyGraph: React.FC<{ deps: MonitorDependencies }> = ({ deps }) => {
  const gateway = deps.nodes.find((n) => n.key === 'gateway');
  const leaves = deps.nodes.filter((n) => n.key !== 'gateway');
  const W = 720;
  const H = 220;
  const gx = W / 2;
  const gy = 34;
  const leafY = 168;
  const slot = W / leaves.length;
  const leafX = (i: number) => slot * i + slot / 2;

  const color = (up: boolean) => (up ? '#10b981' : '#f43f5e');

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[600px]" style={{ height: 220 }}>
        {/* edges */}
        {leaves.map((n, i) => (
          <line
            key={n.key}
            x1={gx} y1={gy + 16} x2={leafX(i)} y2={leafY - 16}
            stroke={n.up && (gateway?.up ?? true) ? '#334155' : '#f43f5e'}
            strokeWidth={1.5}
            strokeDasharray={n.up ? '0' : '4 3'}
          />
        ))}
        {/* gateway node */}
        {gateway && (
          <g>
            <circle cx={gx} cy={gy} r={16} fill={color(gateway.up)} opacity={0.2} />
            <circle cx={gx} cy={gy} r={7} fill={color(gateway.up)} />
            <text x={gx} y={gy - 22} textAnchor="middle" className="fill-slate-200" fontSize={12} fontWeight={700}>
              {gateway.name}
            </text>
            <text x={gx} y={gy - 8} textAnchor="middle" className="fill-slate-500" fontSize={9}>
              :{gateway.port} · {gateway.responseMs ?? '–'}ms
            </text>
          </g>
        )}
        {/* leaf nodes */}
        {leaves.map((n, i) => (
          <g key={n.key}>
            <circle cx={leafX(i)} cy={leafY} r={13} fill={color(n.up)} opacity={0.2} />
            <circle cx={leafX(i)} cy={leafY} r={6} fill={color(n.up)} />
            <text x={leafX(i)} y={leafY + 26} textAnchor="middle" className="fill-slate-300" fontSize={10} fontWeight={600}>
              {n.name}
            </text>
            <text x={leafX(i)} y={leafY + 38} textAnchor="middle" className="fill-slate-500" fontSize={9}>
              :{n.port} · {n.responseMs ?? '–'}ms
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const EcosystemMonitor: React.FC<{ token: string }> = ({ token }) => {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);
  const [failStreak, setFailStreak] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'dark'
  );

  const load = useCallback(async () => {
    // Single poll returns status + history + dependencies. Never throws.
    const s = await fetchMonitorStatus();
    if (s?.data) {
      setStatus(s.data);
      setFailStreak(0);
    } else {
      // Only surface "unreachable" after a couple of consecutive misses so a
      // single transient blip doesn't flash an alarming banner.
      setFailStreak((n) => n + 1);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    try {
      await updateSettings(token, { theme: next });
    } catch {
      /* backend sync is best-effort; local theme already applied */
    }
  };

  const doRestart = async (key: string) => {
    setRestarting(key);
    setRestartMsg(null);
    try {
      const res: any = await restartService(token, key);
      setRestartMsg(res.message || 'Restart requested.');
    } catch (e: any) {
      setRestartMsg(e.message || 'Restart failed.');
    } finally {
      setRestarting(null);
      setTimeout(load, 1500);
    }
  };

  const services = status?.services ?? [];
  const historyFor = (key: string) => services.find((s) => s.key === key)?.history ?? [];
  const deps: MonitorDependencies | null = status?.dependencies ?? null;
  const down = services.filter((s) => !s.up);
  const summary = status?.summary;
  const channels = status?.alerts.channels;
  const restartEnabled = status?.restart.enabled;
  // Only "unreachable" once we've never loaded, or after 2+ consecutive misses.
  const reachable = status !== null && failStreak < 2;

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="font-bold text-lg text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" /> Decoupled Microservices Ecosystem Monitor
        </h3>
        <div className="flex items-center gap-2">
          {/* alert channel chips */}
          {channels && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold">
              <Chip on={channels.slack} icon={<Slack className="w-3 h-3" />} label="Slack" />
              <Chip on={channels.email} icon={<Mail className="w-3 h-3" />} label="Email" />
              <Chip on={channels.inApp} icon={<Bell className="w-3 h-3" />} label="In-app" />
            </div>
          )}
          {summary && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${summary.allUp ? 'bg-emerald-950/70 text-emerald-300' : 'bg-rose-950/70 text-rose-300'}`}>
              {summary.up}/{summary.total} Up
            </span>
          )}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme (applies site-wide)`}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 text-amber-300 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={load}
            title="Refresh now"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-400/50 text-indigo-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!reachable && failStreak >= 2 && (
        <div className="mb-4 p-3 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Monitor service unreachable. Start it with <code className="font-mono bg-black/30 px-1 rounded">npm run dev:monitor</code>.
        </div>
      )}

      {/* DOWN alert banner */}
      {down.length > 0 && (
        <div className="mb-4 p-4 rounded-2xl bg-rose-950/50 border border-rose-500/50">
          <div className="flex items-center gap-2 text-rose-200 font-bold text-sm mb-1">
            <AlertTriangle className="w-4 h-4" /> {down.length} service{down.length > 1 ? 's' : ''} DOWN
          </div>
          <div className="text-rose-300/80 text-xs">
            {down.map((s) => s.name).join(', ')} — alerts dispatched via {channels ? Object.entries(channels).filter(([, v]) => v).map(([k]) => k).join(', ') : 'in-app'}.
          </div>
        </div>
      )}

      {restartMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-700 text-slate-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> {restartMsg}
        </div>
      )}

      {/* Service cards with live response time + sparkline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
        {services.length === 0 && failStreak < 2 && (
          <div className="col-span-full text-center text-xs text-slate-500 py-4 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading services…
          </div>
        )}
        {services.map((svc) => (
          <div key={svc.key} className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${svc.up ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span className="font-bold text-xs text-white truncate">{svc.name}</span>
              </div>
              <span className={`text-[9px] font-bold uppercase ${svc.up ? 'text-emerald-400' : 'text-rose-400'}`}>{svc.up ? 'Up' : 'Down'}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1.5">
              <span>Port :{svc.port}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {svc.up && svc.responseMs != null ? `${svc.responseMs}ms` : '—'}
              </span>
            </div>
            <Sparkline samples={historyFor(svc.key)} />
            <button
              onClick={() => doRestart(svc.key)}
              disabled={restarting === svc.key}
              title={restartEnabled ? 'Restart this service' : `Auto-restart is off — runs: ${svc.restartCommand}`}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-bold text-slate-300 transition-colors disabled:opacity-50"
            >
              {restarting === svc.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
              Restart
            </button>
          </div>
        ))}
      </div>

      {/* Dependency visualization */}
      {deps && deps.nodes.length > 0 && (
        <div className="mb-2">
          <h4 className="font-bold text-sm text-slate-200 mb-2 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-400" /> Service Dependencies
          </h4>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
            <DependencyGraph deps={deps} />
          </div>
        </div>
      )}

      {/* Recent alerts feed */}
      {status && status.alerts.recent.length > 0 && (
        <div className="mt-4">
          <h4 className="font-bold text-sm text-slate-200 mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" /> Recent Alerts
          </h4>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {status.alerts.recent.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className={a.kind === 'down' ? 'text-rose-300' : 'text-emerald-300'}>{a.message}</span>
                <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                  {new Date(a.at).toLocaleTimeString()} · {a.channels.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Chip: React.FC<{ on: boolean; icon: React.ReactNode; label: string }> = ({ on, icon, label }) => (
  <span
    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${
      on ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-700 text-slate-500'
    }`}
    title={`${label} alerts ${on ? 'enabled' : 'not configured'}`}
  >
    {icon} {label}
  </span>
);
