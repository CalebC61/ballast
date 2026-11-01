import { useState } from 'react';
import { DATA, adapt, applyBlockBoundary, buildSession, weeklyAdjust, type AppState, type ItemResult, type Profile, type Rating, type Readiness } from './engine';
import { newId, today, type Today as TodayT } from './store';
import type { TimerCfg } from './Timer';
const SWAP = (DATA.engine as any).swapReasons as string[]; const PAIN = (DATA.engine as any).painAreas as string[];
const timerFor = (formatId: string, minutes: number): TimerCfg => formatId === 'emom' || formatId === 'intervals' ? { mode: 'emom', minutes } : formatId === 'tabata' ? { mode: 'tabata', minutes, work: 20, rest: 10, rounds: 8 } : formatId === 'amrap' || formatId === 'density' ? { mode: 'amrap', minutes } : { mode: 'fortime', minutes };

export function TodayView({ profile, setProfile, state, setState, t, setT, openTimer }: { profile: Profile; setProfile: (p: Profile) => void; state: AppState; setState: (s: AppState) => void; t: TodayT | null; setT: (t: TodayT | null) => void; openTimer: (c: TimerCfg) => void }) {
  const [readiness, setReadiness] = useState<Readiness>('normal'); const [minutes, setMinutes] = useState(profile.sessionMinutes);
  const [swapFor, setSwapFor] = useState<string | null>(null); const [why, setWhy] = useState<string | null>(null);
  const date = today();
  const gen = (r: Readiness, m: number, extra: string[] = [], keep?: TodayT['results']) => {
    let st = applyBlockBoundary(DATA, profile, state, date); st = weeklyAdjust(st, date); if (st !== state) setState(st);
    const session = buildSession(DATA, profile, st, { date, readiness: r, minutes: m, extraExclude: extra });
    setT({ session, results: keep ?? {}, extraExclude: extra, readiness: r, minutes: m });
  };
  if (!t || t.session.date !== date) return (
    <div><section className="card"><h3>How do you feel today?</h3>
      <div className="seg">{([['fresh', 'Fresh'], ['normal', 'Normal'], ['beat', 'Beat up']] as const).map(([v, l]) => <button key={v} className={readiness === v ? 'on' : ''} onClick={() => setReadiness(v)}>{l}</button>)}</div>
      <div className="row"><label>Time available (min)</label><input type="number" value={minutes} onChange={e => setMinutes(+e.target.value)} /></div>
      <button className="primary" onClick={() => gen(readiness, minutes)}>Build today's session</button></section></div>);
  const s = t.session;
  const res = (id: string, ladder: string): ItemResult => t.results[id] ?? { exerciseId: id, ladder, repsDone: [] };
  const setRes = (r: ItemResult) => setT({ ...t, results: { ...t.results, [r.exerciseId]: r } });
  const swap = (id: string, reason: string) => {
    setSwapFor(null);
    if (reason === 'hurts') setState({ ...state, paused: { ...state.paused, [id]: new Date(Date.now() + DATA.engine.painExcludeDays * 864e5).toISOString().slice(0, 10) } });
    gen(t.readiness, t.minutes, [...t.extraExclude, id], t.results);
  };
  const exclude = (id: string) => { if (!confirm('Never show this exercise again? (You can undo in Settings.)')) return; setProfile({ ...profile, excluded: [...profile.excluded, id] }); setTimeout(() => gen(t.readiness, t.minutes, t.extraExclude, t.results)); };
  const finish = () => {
    const results = s.items.map(i => ({ ...res(i.exerciseId, i.ladder), deload: s.deload }));
    const unrated = results.filter(r => !r.rating).length;
    if (unrated && !confirm(`${unrated} exercise(s) unrated. Unrated counts as Hard. Save anyway?`)) return;
    const next = adapt(DATA, profile, state, s, results);
    setState({ ...next, log: [...next.log, { id: newId(), date, kind: 'session', session: s, results, finisherScore: (document.getElementById('fscore') as HTMLInputElement | null)?.value }] });
    setT(null); alert('Saved. Next session is updated from your ratings.');
  };
  const U = profile.units;
  return (<div>
    <section className="card why"><div className="muted">{DATA.programs.find(p => p.id === s.programId)?.name} · {s.blockName} · week {s.week}{s.deload ? ' · deload' : ''}</div><p>{s.why}</p>
      <div className="row"><label>Shorten to (min)</label><input type="number" defaultValue={t.minutes} onBlur={e => +e.target.value !== t.minutes && gen(t.readiness, +e.target.value, t.extraExclude, t.results)} /><button onClick={() => setT(null)}>Restart check-in</button></div></section>
    <section className="card"><h3>Warm-up · 5 min</h3><p className="muted">Light bag: around the world, cossack squats, half-kneeling chops, dead bugs. Easy pace.</p></section>
    {s.items.map(i => { const r = res(i.exerciseId, i.ladder); const ex = DATA.exercises.find(e => e.id === i.exerciseId)!; return (
      <section key={i.exerciseId} className="card item">
        <div className="itemhead"><div><div className="slot">{i.anchor ? 'ANCHOR' : i.slot.replace('2', '')}</div><h3>{i.name}</h3></div>
          <div className="load">{i.load ? <>{i.load.weight} {U}<small>{i.load.bagName}</small></> : <small>no bag</small>}</div></div>
        <div className="dose">{i.sets} × {i.dose === 'reps' ? i.reps.join('-') + ' reps' : i.dose === 'distance' ? `${i.amount} m` : `${i.amount} s`}{i.eli ? <span className="muted"> · ELI {i.eli.toFixed(2)}</span> : null}</div>
        <p className="cue">{ex.cue} <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.demoSearch)}`} target="_blank">demo</a></p>
        <button className="link" onClick={() => setWhy(why === i.exerciseId ? null : i.exerciseId)}>Why this?</button>
        {why === i.exerciseId && <ul className="reasons">{i.reasons.map(c => <li key={c}>{DATA.reasons[c]}</li>)}</ul>}
        {i.dose === 'reps' && <div className="sets">{i.reps.map((x, k) => <input key={k} type="number" inputMode="numeric" placeholder={String(x)} value={r.repsDone[k] ?? ''} onChange={e => { const d = [...(r.repsDone.length ? r.repsDone : i.reps)]; d[k] = +e.target.value; setRes({ ...r, repsDone: d }); }} />)}</div>}
        <div className="seg rate">{(['easy', 'right', 'hard'] as Rating[]).map(v => <button key={v} className={r.rating === v ? 'on ' + v : v} onClick={() => setRes({ ...r, rating: v })}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
        <div className="row"><select value={r.pain ?? ''} onChange={e => setRes({ ...r, pain: e.target.value || undefined })}><option value="">No pain</option>{PAIN.map(a => <option key={a} value={a}>Pain: {a}</option>)}</select>
          <button onClick={() => setSwapFor(swapFor === i.exerciseId ? null : i.exerciseId)}>Swap</button><button onClick={() => exclude(i.exerciseId)}>Exclude</button></div>
        {swapFor === i.exerciseId && <div className="chips">{SWAP.map(x => <button key={x} onClick={() => swap(i.exerciseId, x)}>{x}</button>)}</div>}
      </section>); })}
    {s.finisher && <section className="card"><div className="slot">FINISHER</div><h3>{DATA.formats.find(f => f.id === s.finisher!.formatId)?.name} · {s.finisher.minutes} min</h3>
      <ul>{s.finisher.items.map(f => <li key={f.exerciseId}>{f.amount} {f.name}{f.load ? ` (${f.load.weight} ${U})` : ''}</li>)}</ul>
      <p className="muted">{DATA.formats.find(f => f.id === s.finisher!.formatId)?.desc}</p>
      <div className="row"><button onClick={() => openTimer({ ...timerFor(s.finisher!.formatId, s.finisher!.minutes), label: s.finisher!.items.map(f => f.name).join(' · ') })}>Open timer</button><input id="fscore" placeholder="Score (rounds/time)" /></div></section>}
    <button className="primary" onClick={finish}>Finish & save</button>
  </div>);
}
