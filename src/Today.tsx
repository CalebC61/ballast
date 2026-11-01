import { useEffect, useState } from 'react';
import { DATA, adapt, applyBlockBoundary, buildSession, doseText, fmtClock, weeklyAdjust, type AppState, type BlockExercise, type ItemResult, type Profile, type Rating, type Readiness, type SessionKind, type WorkoutBlock } from './engine';
import { newId, today, type Today as TodayT } from './store';
import { useClock } from './useClock';
const SWAP = (DATA.engine as any).swapReasons as string[]; const PAIN = (DATA.engine as any).painAreas as string[];

export function TodayView({ profile, setProfile, state, setState, t, setT }: { profile: Profile; setProfile: (p: Profile) => void; state: AppState; setState: (s: AppState) => void; t: TodayT | null; setT: (t: TodayT | null) => void }) {
  const [readiness, setReadiness] = useState<Readiness>('normal'); const [minutes, setMinutes] = useState(profile.sessionMinutes);
  const [kind, setKind] = useState<SessionKind>('full');
  const [swapFor, setSwapFor] = useState<string | null>(null); const [open, setOpen] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const clock = useClock();
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const date = today();
  const gen = (r: Readiness, m: number, k: SessionKind, extra: string[] = [], keep?: TodayT) => {
    let st = applyBlockBoundary(DATA, profile, state, date); st = weeklyAdjust(st, date); if (st !== state) setState(st);
    const session = buildSession(DATA, profile, st, { date, readiness: r, minutes: m, extraExclude: extra, kind: k });
    setT({ session, results: keep?.results ?? {}, extraExclude: extra, readiness: r, minutes: m, kind: k, startedAt: keep?.startedAt, checked: keep?.checked ?? {}, score: keep?.score });
  };
  if (!t || t.session.date !== date || !t.session.blocks) return (
    <div><section className="card"><div className="slot">Today</div><h3>Check in</h3>
      <h4>How do you feel?</h4>
      <div className="seg">{([['fresh', 'Fresh'], ['normal', 'Normal'], ['beat', 'Beat up']] as const).map(([v, l]) => <button key={v} className={readiness === v ? 'on' : ''} onClick={() => setReadiness(v)}>{l}</button>)}</div>
      <h4>What do you want?</h4>
      <div className="seg">{([['full', 'Full session'], ['wod', 'WOD only']] as const).map(([v, l]) => <button key={v} className={kind === v ? 'on' : ''} onClick={() => setKind(v)}>{l}</button>)}</div>
      <p className="muted">{kind === 'full' ? 'Warm-up, main lift, supersets and a finisher, built from your program.' : 'Warm-up plus one conditioning piece (EMOM, AMRAP, For Time or Tabata).'}</p>
      <div className="row"><label>Time available (min)</label><input type="number" value={minutes} onChange={e => setMinutes(+e.target.value)} /></div>
      <button className="primary" onClick={() => gen(readiness, minutes, kind)}>Build today's workout</button></section></div>);

  const s = t.session; const U = profile.units; const started = !!t.startedAt;
  const itemOf = (e: BlockExercise) => e.itemIdx !== undefined ? s.items[e.itemIdx] : undefined;
  const res = (id: string, ladder: string): ItemResult => t.results[id] ?? { exerciseId: id, ladder, repsDone: [] };
  const setRes = (r: ItemResult) => setT({ ...t, results: { ...t.results, [r.exerciseId]: r } });
  const swap = (id: string, reason: string) => {
    setSwapFor(null);
    if (reason === 'hurts') setState({ ...state, paused: { ...state.paused, [id]: new Date(Date.now() + DATA.engine.painExcludeDays * 864e5).toISOString().slice(0, 10) } });
    gen(t.readiness, t.minutes, t.kind ?? 'full', [...t.extraExclude, id], t);
  };
  const exclude = (id: string) => { if (!confirm('Never show this exercise again? (You can undo in Settings.)')) return; setProfile({ ...profile, excluded: [...profile.excluded, id] }); setTimeout(() => gen(t.readiness, t.minutes, t.kind ?? 'full', t.extraExclude, t)); };
  const finish = () => {
    const results = s.items.map(i => ({ ...res(i.exerciseId, i.ladder), deload: s.deload }));
    const unrated = results.filter(r => !r.rating).length;
    if (unrated && !confirm(`${unrated} exercise(s) unrated. Unrated counts as Hard. Save anyway?`)) return;
    const next = adapt(DATA, profile, state, s, results);
    setState({ ...next, log: [...next.log, { id: newId(), date, kind: 'session', session: s, results, finisherScore: t.score || (clock.cfg?.mode === 'amrap' ? `${clock.rounds} rounds` : undefined) }] });
    clock.clear(); setT(null); alert('Saved. Next session is updated from your ratings.');
  };
  const checked = t.checked ?? {};
  const toggleSet = (b: WorkoutBlock, ei: number, k: number) => {
    const key = `${b.id}:${ei}:${k}`; const on = !checked[key]; const nc = { ...checked, [key]: on };
    setT({ ...t, checked: nc, startedAt: t.startedAt ?? Date.now() });
    // Gravl-style: logging a set starts rest. In a superset, rest starts after the last exercise of the round.
    const roundDone = b.exercises.every((x, j) => k >= x.sets || nc[`${b.id}:${j}:${k}`]);
    if (on && b.restSec && roundDone) clock.start({ mode: 'rest', minutes: b.restSec / 60 }, `${b.title} · rest after set ${k + 1}`);
  };
  const doneSets = (b: WorkoutBlock) => b.exercises.reduce((a, x, j) => a + Array.from({ length: x.sets }, (_, k) => checked[`${b.id}:${j}:${k}`]).filter(Boolean).length, 0);
  const totalSets = (b: WorkoutBlock) => b.exercises.reduce((a, x) => a + x.sets, 0);
  const isTimed = (b: WorkoutBlock) => b.kind === 'finisher' || b.kind === 'warmup';
  const current = s.blocks.find(b => b.kind === 'main' && doneSets(b) < totalSets(b));
  const nextLine = (() => { if (!current) return 'Main work done. Finisher next.'; const k = Math.min(...current.exercises.map((x, j) => Array.from({ length: x.sets }, (_, kk) => kk).find(kk => !checked[`${current.id}:${j}:${kk}`]) ?? 99));
    const ej = current.exercises.findIndex((x, j) => k < x.sets && !checked[`${current.id}:${j}:${k}`]); const e = current.exercises[ej]; if (!e) return '';
    return `Next: ${e.tag ?? ''} ${e.name} · set ${k + 1}/${e.sets} · ${e.dose === 'reps' ? `${e.reps[k] ?? e.reps[0]} reps` : doseText(e)}${e.load ? ` @ ${e.load.weight} ${U}` : ''}`; })();
  const v = clock.view;

  const banner = started && (<div className="banner">
    <div className="bantop"><span>⏱ {fmtClock((now - (t.startedAt ?? now)) / 1000)} total</span><span className="muted">{clock.cfg ? clock.label : s.dayName}</span></div>
    {v ? <><div className={`banclock ${v.resting ? 'rest' : ''} ${v.done ? 'done' : ''}`}>{v.big}</div><div className="bansub">{v.sub}{clock.startAt === null ? ' · ready' : ''}</div>
      <div className="bantools">{clock.running ? <button onClick={clock.pause}>Pause</button> : <button className="go" onClick={clock.resume}>{clock.startAt === null ? 'Start' : v.done ? 'Done' : 'Resume'}</button>}
        {clock.cfg?.mode === 'amrap' && clock.startAt !== null && <button onClick={clock.addRound}>+1 round</button>}
        {clock.cfg?.mode === 'rest' && <button onClick={clock.clear}>Skip rest</button>}
        {clock.cfg?.mode !== 'rest' && <button onClick={clock.clear}>Clear</button>}</div></>
      : <div className="bansub">{nextLine}</div>}
    {v && clock.cfg?.mode === 'rest' && <div className="bannext muted">{nextLine}</div>}
  </div>);

  const exRow = (b: WorkoutBlock, e: BlockExercise, ei: number) => {
    const it = itemOf(e); const r = it ? res(it.exerciseId, it.ladder) : null; const ex = DATA.exercises.find(x => x.id === e.exerciseId);
    return (<div key={e.exerciseId + ei} className="ex">
      <div className="itemhead"><div>{e.tag && <span className="tag">{e.tag}</span>}<b>{e.name}</b>
        <div className="muted">{b.kind === 'main' ? `${e.sets} × ${doseText(e)}` : doseText(e)}{e.load ? ` · ${e.load.bagName}` : ''}</div></div>
        <div className="load">{e.load ? <>{e.load.weight}<small>{U}</small></> : <small>{ex?.usesBag ? '' : 'no bag'}</small>}</div></div>
      {started && b.kind === 'main' && <div className="sets">{Array.from({ length: e.sets }, (_, k) => { const key = `${b.id}:${ei}:${k}`; return (
        <div key={k} className={`set ${checked[key] ? 'on' : ''}`}>
          {e.dose === 'reps' && r ? <input type="number" inputMode="numeric" placeholder={String(e.reps[k] ?? e.reps[0])} value={r.repsDone[k] ?? ''} onChange={x => { const dd = [...(r.repsDone.length ? r.repsDone : e.reps)]; dd[k] = +x.target.value; setRes({ ...r, repsDone: dd }); }} /> : <span className="muted">{doseText(e)}</span>}
          <button className="chk" aria-label={`log set ${k + 1}`} onClick={() => toggleSet(b, ei, k)}>{checked[key] ? '✓' : k + 1}</button></div>); })}</div>}
      {it && r && started && <div className="seg rate">{(['easy', 'right', 'hard'] as Rating[]).map(x => <button key={x} className={r.rating === x ? 'on ' + x : x} onClick={() => setRes({ ...r, rating: x })}>{x[0].toUpperCase() + x.slice(1)}</button>)}</div>}
      <div className="exlinks"><button className="link" onClick={() => setOpen(open === e.exerciseId ? null : e.exerciseId)}>{open === e.exerciseId ? 'Less' : 'How · why · swap'}</button></div>
      {open === e.exerciseId && <div className="more"><p className="cue">{e.cue} {ex && <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.demoSearch)}`} target="_blank">demo video</a>}</p>
        {it && <ul className="reasons">{it.reasons.map(c => <li key={c}>{DATA.reasons[c]}</li>)}</ul>}
        {it && r && <div className="row"><select value={r.pain ?? ''} onChange={x => setRes({ ...r, pain: x.target.value || undefined })}><option value="">No pain</option>{PAIN.map(a => <option key={a} value={a}>Pain: {a}</option>)}</select>
          <button onClick={() => setSwapFor(swapFor === e.exerciseId ? null : e.exerciseId)}>Swap</button><button onClick={() => exclude(e.exerciseId)}>Exclude</button></div>}
        {!it && <div className="row"><button onClick={() => swap(e.exerciseId, 'other')}>Swap</button></div>}
        {swapFor === e.exerciseId && <div className="chips">{SWAP.map(x => <button key={x} onClick={() => swap(e.exerciseId, x)}>{x}</button>)}</div>}</div>}
    </div>);
  };

  return (<div>
    {banner}
    <section className="card why"><div className="slot">{s.kind === 'wod' ? 'WOD' : 'Today'} · {DATA.programs.find(p => p.id === s.programId)?.name} · {s.blockName} wk {s.week}{s.deload ? ' · deload' : ''}</div>
      <h3>{s.dayName}</h3><p className="muted">{s.blocks.filter(b => b.kind !== 'cooldown').length} blocks · {s.blocks.reduce((a, b) => a + b.exercises.length, 0)} exercises · about {t.minutes} min</p><p>{s.why}</p>
      {!started && <div className="row"><label>Shorten to (min)</label><input type="number" defaultValue={t.minutes} onBlur={e => +e.target.value !== t.minutes && gen(t.readiness, +e.target.value, t.kind ?? 'full', t.extraExclude, t)} /><button onClick={() => setT(null)}>Start over</button></div>}</section>
    {s.blocks.map(b => (<section key={b.id} className={`card block ${current?.id === b.id && started ? 'cur' : ''}`}>
      <div className="bhead"><h3>{b.title}</h3><span className={`fmt f-${b.clock.mode}`}>{b.formatName}</span></div>
      <div className="summary">{b.summary}{b.kind === 'main' && started ? ` · ${doneSets(b)}/${totalSets(b)} sets logged` : ''}</div>
      <ol className="howto">{b.howTo.map((h, i) => <li key={i}>{h}</li>)}</ol>
      {b.exercises.map((e, ei) => exRow(b, e, ei))}
      {started && isTimed(b) && <div className="row"><button className="go wide" onClick={() => { clock.start(b.clock, `${b.title} · ${b.formatName}`); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>▶ Start {b.formatName} timer</button></div>}
      {started && b.kind === 'finisher' && <div className="row"><input placeholder="Score (rounds / time)" value={t.score ?? ''} onChange={e => setT({ ...t, score: e.target.value })} /></div>}
    </section>))}
    {!started ? <button className="primary sticky" onClick={() => { setT({ ...t, startedAt: Date.now(), checked: t.checked ?? {} }); clock.start(s.blocks[0].clock, `${s.blocks[0].title} · ${s.blocks[0].formatName}`); window.scrollTo({ top: 0 }); }}>Start workout</button>
      : <button className="primary" onClick={finish}>Finish & save</button>}
  </div>);
}
