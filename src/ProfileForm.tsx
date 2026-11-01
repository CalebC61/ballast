import { useState } from 'react';
import { DATA, type Bag, type Profile } from './engine';
import { newId } from './store';
const conv = (w: number, to: 'lb' | 'kg') => +(to === 'kg' ? w / 2.20462 : w * 2.20462).toFixed(1);

export function ProfileForm({ initial, onSave, submitLabel }: { initial: Profile; onSave: (p: Profile) => void; submitLabel: string }) {
  const [p, setP] = useState<Profile>(initial);
  const set = (o: Partial<Profile>) => setP({ ...p, ...o });
  const setBag = (i: number, o: Partial<Bag>) => set({ bags: p.bags.map((b, j) => (j === i ? { ...b, ...o } : b)) });
  const switchUnits = (u: 'lb' | 'kg') => { if (u === p.units) return; set({ units: u, bodyweight: conv(p.bodyweight, u), bags: p.bags.map(b => ({ ...b, weight: conv(b.weight, u), minFill: b.minFill != null ? conv(b.minFill, u) : undefined, maxFill: b.maxFill != null ? conv(b.maxFill, u) : undefined, step: b.step ? conv(b.step, u) : b.step })), kettlebells: p.kettlebells.map(k => ({ ...k, weight: conv(k.weight, u) })) }); };
  const num = (v: string) => (v === '' ? 0 : Number(v));
  const valid = p.bodyweight > 0 && p.bags.some(b => b.weight > 0 || (b.adjustable && (b.maxFill ?? 0) > 0));
  const togglePain = (a: string) => set({ painAreas: p.painAreas.includes(a) ? p.painAreas.filter(x => x !== a) : [...p.painAreas, a] });
  return (
    <div className="form">
      <section className="card"><h3>You</h3>
        <div className="row"><label>Units</label><div className="seg">{(['lb', 'kg'] as const).map(u => <button key={u} className={p.units === u ? 'on' : ''} onClick={() => switchUnits(u)}>{u}</button>)}</div></div>
        <div className="row"><label>Bodyweight ({p.units})</label><input inputMode="decimal" type="number" value={p.bodyweight || ''} placeholder="e.g. your weight" onChange={e => set({ bodyweight: num(e.target.value) })} /></div>
        <div className="row"><label>Experience</label><div className="seg">{[['New', 1], ['Some', 2], ['Lots', 3]].map(([l, v]) => <button key={v} className={p.experience === v ? 'on' : ''} onClick={() => set({ experience: v as 1 | 2 | 3 })}>{l}</button>)}</div></div>
      </section>
      <section className="card"><h3>Bags</h3>
        {p.bags.map((b, i) => (
          <div key={b.id} className="bag">
            <div className="row"><input value={b.name} placeholder="Name" onChange={e => setBag(i, { name: e.target.value })} /><button className="x" onClick={() => set({ bags: p.bags.filter((_, j) => j !== i) })}>✕</button></div>
            {!b.adjustable && <div className="row"><label>Weight ({p.units})</label><input type="number" inputMode="decimal" value={b.weight || ''} onChange={e => setBag(i, { weight: num(e.target.value) })} /></div>}
            <div className="row"><label><input type="checkbox" checked={b.handles} onChange={e => setBag(i, { handles: e.target.checked })} /> Handles</label>
              <label><input type="checkbox" checked={b.adjustable} onChange={e => setBag(i, { adjustable: e.target.checked, minFill: b.minFill ?? b.weight, maxFill: b.maxFill ?? b.weight, step: b.step ?? 5 })} /> Adjustable fill</label></div>
            {b.adjustable && <div className="row three">
              <label>Min<input type="number" value={b.minFill ?? ''} onChange={e => setBag(i, { minFill: num(e.target.value) })} /></label>
              <label>Max<input type="number" value={b.maxFill ?? ''} onChange={e => setBag(i, { maxFill: num(e.target.value), weight: num(e.target.value) })} /></label>
              <label>Step<input type="number" value={b.step ?? ''} onChange={e => setBag(i, { step: num(e.target.value) })} /></label></div>}
          </div>))}
        <button onClick={() => set({ bags: [...p.bags, { id: newId(), name: `Bag ${p.bags.length + 1}`, weight: 0, handles: true, adjustable: false }] })}>+ Add bag</button>
      </section>
      <section className="card"><h3>Kettlebells (optional)</h3>
        {p.kettlebells.map((k, i) => <div className="row" key={k.id}><input type="number" value={k.weight || ''} placeholder={p.units} onChange={e => set({ kettlebells: p.kettlebells.map((x, j) => j === i ? { ...x, weight: num(e.target.value) } : x) })} /><button className="x" onClick={() => set({ kettlebells: p.kettlebells.filter((_, j) => j !== i) })}>✕</button></div>)}
        <button onClick={() => set({ kettlebells: [...p.kettlebells, { id: newId(), weight: 0 }] })}>+ Add kettlebell</button>
        <p className="muted">Saved for later; v1 programs use your bags.</p>
      </section>
      <section className="card"><h3>Training</h3>
        <div className="row"><label>Program</label><select value={p.programId} onChange={e => set({ programId: e.target.value })}>{DATA.programs.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}</select></div>
        {DATA.programs.find(x => x.id === p.programId)?.countBackFromEvent && <div className="row"><label>Event date</label><input type="date" value={p.eventDate ?? ''} onChange={e => set({ eventDate: e.target.value })} /></div>}
        <div className="row"><label>Days / week</label><input type="number" min={2} max={6} value={p.daysPerWeek} onChange={e => set({ daysPerWeek: num(e.target.value) })} /></div>
        <div className="row"><label>Session (min)</label><input type="number" min={15} max={120} value={p.sessionMinutes} onChange={e => set({ sessionMinutes: num(e.target.value) })} /></div>
        <div className="row"><label>Rest, main lifts (s)</label><input type="number" min={15} step={15} value={p.restCompound ?? 120} onChange={e => set({ restCompound: num(e.target.value) })} /></div>
        <div className="row"><label>Rest, accessories (s)</label><input type="number" min={15} step={15} value={p.restAccessory ?? 90} onChange={e => set({ restAccessory: num(e.target.value) })} /></div>
        <div className="row"><label><input type="checkbox" checked={p.unlockAdvanced} onChange={e => set({ unlockAdvanced: e.target.checked })} /> I can already do snatches, throws and overhead work safely (unlock advanced moves)</label></div>
      </section>
      <section className="card"><h3>Anything that hurts?</h3>
        <div className="chips">{DATA_PAIN.map(a => <button key={a} className={p.painAreas.includes(a) ? 'on' : ''} onClick={() => togglePain(a)}>{a}</button>)}</div>
        {p.excluded.length > 0 && <><h4>Excluded moves</h4><div className="chips">{p.excluded.map(id => <button key={id} onClick={() => set({ excluded: p.excluded.filter(x => x !== id) })}>{DATA.exercises.find(e => e.id === id)?.name ?? id} ✕</button>)}</div></>}
        <h4>Exclude a move</h4>
        <select value="" onChange={e => e.target.value && set({ excluded: [...p.excluded, e.target.value] })}><option value="">Pick an exercise…</option>{DATA.exercises.filter(e => !p.excluded.includes(e.id)).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
      </section>
      {!valid && <p className="warn">Add your bodyweight and at least one bag to continue.</p>}
      <button className="primary" disabled={!valid} onClick={() => onSave(p)}>{submitLabel}</button>
    </div>);
}
const DATA_PAIN = (DATA.engine as unknown as { painAreas: string[] }).painAreas;
