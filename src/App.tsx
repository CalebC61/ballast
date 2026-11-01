import { useState } from 'react';
import { ProfileForm } from './ProfileForm';
import { TodayView } from './Today';
import { LogView } from './Log';
import { Timer, type TimerCfg } from './Timer';
import { blankProfile, download, emptyState, usePersist, type Today } from './store';
import type { AppState, Profile } from './engine';
type Tab = 'today' | 'timer' | 'log' | 'settings';
export default function App() {
  const [profile, setProfile] = usePersist<Profile | null>('profile', null);
  const [state, setState] = usePersist<AppState>('state', emptyState());
  const [t, setT] = usePersist<Today | null>('today', null);
  const [tab, setTab] = useState<Tab>((location.hash.slice(1) as Tab) || 'today');
  const [timerCfg, setTimerCfg] = useState<TimerCfg | undefined>();
  const go = (x: Tab) => { setTab(x); location.hash = x; };
  if (!profile) return (<div className="app"><header><h1>Ballast</h1><p className="muted">Sandbag training that adapts to you. Set up takes about a minute; everything can be changed later.</p></header>
    <ProfileForm initial={blankProfile()} submitLabel="Start training" onSave={p => setProfile(p)} /></div>);
  return (<div className="app">
    <header><h1>Ballast</h1></header>
    <main>
      {tab === 'today' && <TodayView profile={profile} setProfile={setProfile} state={state} setState={setState} t={t} setT={setT} openTimer={c => { setTimerCfg(c); go('timer'); }} />}
      {tab === 'timer' && <Timer initial={timerCfg} />}
      {tab === 'log' && <LogView state={state} setState={setState} profile={profile} />}
      {tab === 'settings' && <><ProfileForm initial={profile} submitLabel="Save settings" onSave={p => { setProfile(p); setT(null); alert('Saved. Today\'s session will rebuild with your changes.'); }} />
        <section className="card"><h3>Data</h3><div className="row"><button onClick={() => download('ballast-backup.json', JSON.stringify({ profile, state }), 'application/json')}>Backup (JSON)</button>
          <label className="btn">Restore<input type="file" accept=".json" hidden onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const j = JSON.parse(await f.text()); if (confirm('Replace current data with this backup?')) { setProfile(j.profile); setState(j.state); } }} /></label></div>
          <p className="muted">Stored on this phone only. Nothing is deleted unless you restore a backup.</p></section></>}
    </main>
    <nav>{(['today', 'timer', 'log', 'settings'] as Tab[]).map(x => <button key={x} className={tab === x ? 'on' : ''} onClick={() => go(x)}>{x[0].toUpperCase() + x.slice(1)}</button>)}</nav>
  </div>);
}
