import { useEffect, useRef, useState } from 'react';
export type TimerMode = 'amrap' | 'emom' | 'tabata' | 'fortime' | 'rest';
export interface TimerCfg { mode: TimerMode; minutes: number; work?: number; rest?: number; rounds?: number; label?: string }
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

/** Never auto-starts. Uses vibration (not audio) for cues so music keeps playing. Time comes from the wall clock so it survives backgrounding. */
export function Timer({ initial }: { initial?: TimerCfg }) {
  const [cfg, setCfg] = useState<TimerCfg>(initial ?? { mode: 'amrap', minutes: 12 });
  const [startAt, setStartAt] = useState<number | null>(null);
  const [pausedAcc, setPausedAcc] = useState(0); const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now()); const [rounds, setRounds] = useState(0); const [vib, setVib] = useState(true);
  const lastPhase = useRef(''); const wake = useRef<any>(null);
  useEffect(() => { if (initial) { setCfg(initial); reset(); } }, [initial]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 200); return () => clearInterval(t); }, []);
  const running = startAt !== null && pausedAt === null;
  const elapsed = startAt === null ? 0 : ((pausedAt ?? now) - startAt - pausedAcc) / 1000;
  const total = cfg.mode === 'tabata' ? (cfg.rounds ?? 8) * ((cfg.work ?? 20) + (cfg.rest ?? 10)) : cfg.minutes * 60;
  let big = '', sub = '', phase = '';
  if (cfg.mode === 'amrap') { big = fmt(total - elapsed); sub = `Rounds: ${rounds}`; phase = elapsed >= total ? 'done' : 'work'; }
  if (cfg.mode === 'fortime' || cfg.mode === 'rest') { big = fmt(cfg.mode === 'rest' ? total - elapsed : elapsed); sub = cfg.mode === 'rest' ? 'Rest' : `Cap ${cfg.minutes}:00`; phase = elapsed >= total ? 'done' : 'work'; }
  if (cfg.mode === 'emom') { const m = Math.floor(elapsed / 60); big = fmt(60 - (elapsed % 60)); sub = `Minute ${Math.min(m + 1, cfg.minutes)} of ${cfg.minutes}`; phase = elapsed >= total ? 'done' : `m${m}`; }
  if (cfg.mode === 'tabata') { const w = cfg.work ?? 20, r = cfg.rest ?? 10, per = w + r; const i = Math.floor(elapsed / per), into = elapsed % per; const isWork = into < w;
    big = fmt(isWork ? w - into : per - into); sub = `${isWork ? 'WORK' : 'rest'} · round ${Math.min(i + 1, cfg.rounds ?? 8)}/${cfg.rounds ?? 8}`; phase = elapsed >= total ? 'done' : `${i}${isWork}`; }
  useEffect(() => {
    if (!running) return;
    if (phase !== lastPhase.current) { if (lastPhase.current && vib && navigator.vibrate) navigator.vibrate(phase === 'done' ? [300, 100, 300] : 200); lastPhase.current = phase; }
    if (phase === 'done') stop();
  });
  async function start() {
    if (startAt === null) { setStartAt(Date.now()); setPausedAcc(0); lastPhase.current = ''; }
    else if (pausedAt !== null) { setPausedAcc(pausedAcc + Date.now() - pausedAt); setPausedAt(null); }
    try { wake.current = await (navigator as any).wakeLock?.request('screen'); } catch { /* optional */ }
  }
  function stop() { if (pausedAt === null && startAt !== null) setPausedAt(Date.now()); wake.current?.release?.(); }
  function reset() { setStartAt(null); setPausedAt(null); setPausedAcc(0); setRounds(0); lastPhase.current = ''; }
  return (
    <div className="timer">
      {startAt === null && <div className="card">
        <div className="seg">{(['amrap', 'emom', 'tabata', 'fortime', 'rest'] as TimerMode[]).map(m => <button key={m} className={cfg.mode === m ? 'on' : ''} onClick={() => setCfg({ ...cfg, mode: m, minutes: m === 'rest' ? 2 : cfg.minutes })}>{m === 'fortime' ? 'For Time' : m.toUpperCase()}</button>)}</div>
        {cfg.mode !== 'tabata' ? <div className="row"><label>{cfg.mode === 'fortime' ? 'Time cap (min)' : 'Minutes'}</label><input type="number" value={cfg.minutes} onChange={e => setCfg({ ...cfg, minutes: Number(e.target.value) })} /></div>
          : <div className="row three"><label>Work s<input type="number" value={cfg.work ?? 20} onChange={e => setCfg({ ...cfg, work: +e.target.value })} /></label><label>Rest s<input type="number" value={cfg.rest ?? 10} onChange={e => setCfg({ ...cfg, rest: +e.target.value })} /></label><label>Rounds<input type="number" value={cfg.rounds ?? 8} onChange={e => setCfg({ ...cfg, rounds: +e.target.value })} /></label></div>}
        <label className="row"><input type="checkbox" checked={vib} onChange={e => setVib(e.target.checked)} /> Vibrate on changes (no sound, so your music keeps playing)</label>
      </div>}
      {cfg.label && <p className="muted center">{cfg.label}</p>}
      <div className={`clock ${phase.includes('false') ? 'rest' : ''}`}>{big}</div>
      <div className="center sub">{phase === 'done' ? 'Done!' : sub}</div>
      <div className="controls">
        {!running ? <button className="primary" onClick={start}>{startAt === null ? 'Start' : 'Resume'}</button> : <button onClick={stop}>Pause</button>}
        {cfg.mode === 'amrap' && startAt !== null && <button onClick={() => setRounds(rounds + 1)}>+1 round</button>}
        {startAt !== null && <button onClick={reset}>Reset</button>}
      </div>
      <p className="muted center">The timer only starts when you tap Start.</p>
    </div>);
}
