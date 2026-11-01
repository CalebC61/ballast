import { useEffect, useRef, useState } from 'react';
import { clockView, type ClockCfg } from './engine';
export interface ClockState { cfg: ClockCfg | null; label: string; startAt: number | null; pausedAt: number | null; pausedAcc: number; rounds: number }
/** Wall-clock based (survives backgrounding). Vibrates on phase changes; never plays audio. */
export function useClock(vibrate = true) {
  const [c, setC] = useState<ClockState>({ cfg: null, label: '', startAt: null, pausedAt: null, pausedAcc: 0, rounds: 0 });
  const [now, setNow] = useState(Date.now()); const last = useRef(''); const wake = useRef<any>(null);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const running = c.startAt !== null && c.pausedAt === null;
  const elapsed = c.startAt === null ? 0 : ((c.pausedAt ?? now) - c.startAt - c.pausedAcc) / 1000;
  const view = c.cfg ? clockView(c.cfg, elapsed, c.rounds) : null;
  useEffect(() => {
    if (!running || !view) return;
    if (view.phase !== last.current) { if (last.current && vibrate && navigator.vibrate) navigator.vibrate(view.done ? [300, 100, 300] : 200); last.current = view.phase; }
    if (view.done) setC(x => ({ ...x, pausedAt: Date.now() }));
  });
  const lock = async () => { try { wake.current = await (navigator as any).wakeLock?.request('screen'); } catch { /* optional */ } };
  return {
    ...c, running, elapsed, view,
    start: (cfg: ClockCfg, label: string) => { last.current = ''; setC({ cfg, label, startAt: Date.now(), pausedAt: null, pausedAcc: 0, rounds: 0 }); lock(); },
    load: (cfg: ClockCfg, label: string) => { last.current = ''; setC({ cfg, label, startAt: null, pausedAt: null, pausedAcc: 0, rounds: 0 }); },
    pause: () => setC(x => x.startAt !== null && x.pausedAt === null ? { ...x, pausedAt: Date.now() } : x),
    resume: () => { setC(x => x.startAt === null ? { ...x, startAt: Date.now() } : x.pausedAt !== null ? { ...x, pausedAcc: x.pausedAcc + Date.now() - x.pausedAt, pausedAt: null } : x); lock(); },
    addRound: () => setC(x => ({ ...x, rounds: x.rounds + 1 })),
    clear: () => setC({ cfg: null, label: '', startAt: null, pausedAt: null, pausedAcc: 0, rounds: 0 }),
  };
}
