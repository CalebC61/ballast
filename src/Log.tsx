import { useState } from 'react';
import { DATA, type AppState, type Profile } from './engine';
import { download, newId, today } from './store';
export function LogView({ state, setState, profile }: { state: AppState; setState: (s: AppState) => void; profile: Profile }) {
  const [open, setOpen] = useState<string | null>(null); const [op, setOp] = useState({ type: 'Ruck', minutes: 45, effort: 'moderate' as 'low' | 'moderate' | 'hard', date: today() });
  const csv = () => { const rows = [['date', 'kind', 'exercise', 'load', 'unit', 'target', 'done', 'rating', 'pain', 'note']];
    for (const l of state.log) { if (l.kind === 'offplan') rows.push([l.date, 'offplan', l.offplan!.type, '', '', `${l.offplan!.minutes} min`, '', l.offplan!.effort, '', l.note ?? '']);
      else for (const i of l.session!.items) { const r = l.results?.find(x => x.exerciseId === i.exerciseId); rows.push([l.date, 'session', i.name, String(i.load?.weight ?? ''), profile.units, i.reps.join('-'), (r?.repsDone ?? []).join('-'), r?.rating ?? 'unrated', r?.pain ?? '', '']); } }
    download(`ballast-log-${today()}.csv`, rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')); };
  const sorted = [...state.log].sort((a, b) => b.date.localeCompare(a.date));
  return (<div>
    <section className="card"><h3>Log off-plan work</h3>
      <div className="row"><input value={op.type} onChange={e => setOp({ ...op, type: e.target.value })} placeholder="Ruck, run, someone's WOD" /><input type="date" value={op.date} onChange={e => setOp({ ...op, date: e.target.value })} /></div>
      <div className="row"><label>Minutes</label><input type="number" value={op.minutes} onChange={e => setOp({ ...op, minutes: +e.target.value })} /></div>
      <div className="seg">{(['low', 'moderate', 'hard'] as const).map(e => <button key={e} className={op.effort === e ? 'on' : ''} onClick={() => setOp({ ...op, effort: e })}>{e}</button>)}</div>
      <button onClick={() => setState({ ...state, log: [...state.log, { id: newId(), date: op.date, kind: 'offplan', offplan: { type: op.type, minutes: op.minutes, effort: op.effort } }] })}>Add</button></section>
    <div className="row"><h3>History ({state.log.length})</h3><button onClick={csv}>Export CSV</button></div>
    {sorted.length === 0 && <p className="muted">No sessions yet.</p>}
    {sorted.map(l => <section className="card" key={l.id} onClick={() => setOpen(open === l.id ? null : l.id)}>
      <div className="row"><b>{l.date}</b><span>{l.kind === 'offplan' ? `${l.offplan!.type} · ${l.offplan!.minutes} min · ${l.offplan!.effort}` : `${l.session!.dayName} · ${l.session!.blockName} wk ${l.session!.week}`}</span></div>
      {open === l.id && l.session && <ul>{l.session.items.map(i => { const r = l.results?.find(x => x.exerciseId === i.exerciseId); return <li key={i.exerciseId}>{i.name} {i.load ? `${i.load.weight}${profile.units}` : ''} · {(r?.repsDone.length ? r.repsDone : i.reps).join('-')} · {r?.rating ?? 'unrated'}{r?.pain ? ` · pain: ${r.pain}` : ''}</li>; })}
        {l.finisherScore && <li>Finisher: {l.finisherScore}</li>}</ul>}
    </section>)}
    <p className="muted">{DATA.exercises.length} exercises in the library.</p>
  </div>);
}
