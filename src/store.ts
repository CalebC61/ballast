import { useEffect, useState } from 'react';
import type { AppState, ItemResult, Profile, Readiness, Session } from './engine';
const K = { profile: 'ballast.profile', state: 'ballast.state', today: 'ballast.today' };
export interface Today { session: Session; results: Record<string, ItemResult>; extraExclude: string[]; readiness: Readiness; minutes: number }
const load = <T,>(k: string, def: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
export function usePersist<T>(k: keyof typeof K, def: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => load(K[k], def));
  useEffect(() => { if (v === undefined || v === null) localStorage.removeItem(K[k]); else localStorage.setItem(K[k], JSON.stringify(v)); }, [k, v]);
  return [v, setV];
}
export const emptyState = (): AppState => ({ patterns: {}, paused: {}, weekSetAdj: 0, log: [] });
export const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const newId = () => Math.random().toString(36).slice(2, 10);
export const blankProfile = (): Profile => ({ units: 'lb', bodyweight: 0, bags: [], kettlebells: [], experience: 2, programId: 'hybrid', eventDate: '', startDate: today(), daysPerWeek: 4, sessionMinutes: 45, excluded: [], painAreas: [], unlockAdvanced: false });
export function download(name: string, text: string, type = 'text/csv') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); }
