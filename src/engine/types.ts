export type Units = 'lb' | 'kg';
export type Rating = 'easy' | 'right' | 'hard';
export type Readiness = 'fresh' | 'normal' | 'beat';
export interface Bag { id: string; name: string; weight: number; handles: boolean; adjustable: boolean; minFill?: number; maxFill?: number; step?: number }
export interface Kettlebell { id: string; weight: number }
export interface Profile {
  units: Units; bodyweight: number; bags: Bag[]; kettlebells: Kettlebell[];
  experience: 1 | 2 | 3; programId: string; eventDate?: string; startDate: string;
  daysPerWeek: number; sessionMinutes: number; excluded: string[]; painAreas: string[]; unlockAdvanced: boolean;
}
export interface Exercise { id: string; name: string; pattern: string; hold: string; stance: string; plane: string; level: number; ballistic: boolean; overhead: boolean; needsHandles: boolean; usesBag: boolean; dose: 'reps' | 'time' | 'distance'; cue: string; demoSearch: string; ladder: string }
export interface Ladder { id: string; pattern: string; rungs: string[] }
export interface Factors { position: Record<string, number>; stance: Record<string, number>; plane: Record<string, number>; grip: Record<string, number> }
export interface EngineCfg { eliCapPct: number; returnAfterDays: number; returnVolumePct: number; beatUpVolumeCut: number; painExcludeDays: number; weeklyHardSets: Record<string, [number, number]> }
export interface Block { name: string; weeks: number; repRange: [number, number]; rir: number; focus: string; deload: boolean }
export interface DayTemplate { name: string; slots: string[]; finisherFormats: string[] }
export interface Program { id: string; name: string; weeks: number; daysPerWeek: number; countBackFromEvent?: boolean; blocks: Block[]; dayTemplates: DayTemplate[]; default?: boolean }
export interface Format { id: string; name: string; timer: 'rest' | 'countdown' | 'countup' | 'interval'; desc: string; rules: { banPatterns?: string[]; banOverhead?: boolean; requireNonBallistic?: boolean; technicalFirst?: boolean } }
export interface Load { bagId: string; bagName: string; weight: number; handles: boolean }
export interface PatternState { rung: number; reps: number[]; weight?: number; lastEli?: number; missStreak: number; pendingRungUp?: boolean; blockName?: string }
export interface SessionItem {
  slot: string; exerciseId: string; name: string; ladder: string; load?: Load; eli?: number;
  sets: number; reps: number[]; dose: 'reps' | 'time' | 'distance'; amount?: number; reasons: string[]; anchor?: boolean;
}
export interface Finisher { formatId: string; minutes: number; items: { exerciseId: string; name: string; amount: string; load?: Load }[] }
export interface Session { date: string; dayName: string; programId: string; blockName: string; week: number; deload: boolean; readiness: Readiness; minutes: number; items: SessionItem[]; finisher?: Finisher; why: string; reasons: string[] }
export interface ItemResult { exerciseId: string; ladder: string; repsDone: number[]; rating?: Rating; pain?: string; deload?: boolean }
export interface LogEntry { id: string; date: string; kind: 'session' | 'offplan'; session?: Session; results?: ItemResult[]; note?: string; offplan?: { type: string; minutes: number; effort: 'low' | 'moderate' | 'hard' }; finisherScore?: string }
export interface AppState { patterns: Record<string, PatternState>; paused: Record<string, string>; weekSetAdj: number; weekAdjFor?: string; log: LogEntry[] }
export interface Data { exercises: Exercise[]; ladders: Ladder[]; factors: Factors; engine: EngineCfg; programs: Program[]; formats: Format[]; reasons: Record<string, string> }
