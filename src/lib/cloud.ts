// Claude artifact db 기반 저장소 (Firebase 대체)
// 모든 기록은 data/users/<내 id>/ 아래에 저장되어 본인만 읽고 쓸 수 있다.
import { Habit, HabitLog, HabitCategory } from '../types';

// 빌드 대상: 'web' = 독립 웹사이트(Firebase), 그 외 = Claude 아티팩트
export const IS_WEB = import.meta.env.VITE_TARGET === 'web';

// 저장소 백엔드: 문서 단위로 읽고 쓰기
export interface Backend {
  write(docId: string, body: Record<string, unknown>): Promise<void>;
  remove(docId: string): Promise<void>;
}
type DocSnap = { id: string; data: Record<string, unknown>; pending?: boolean };

type Settings = { theme?: 'light' | 'dark' | 'system'; language?: 'ko' | 'en' };
export type CloudStatus = 'loading' | 'ready' | 'nodb' | 'error';

interface State {
  status: CloudStatus;
  errorMessage?: string;
  habits: Habit[];
  habitsLoaded: boolean;
  categories: HabitCategory[] | null;
  logs: Map<string, HabitLog>; // key = `${date}_${habitId}`
  settings: Settings;
  uid: string | null;
  auth: 'unknown' | 'signedOut' | 'signedIn';
  account?: { name: string; email: string; photo?: string };
}

const state: State = {
  status: 'loading',
  habits: [],
  habitsLoaded: false,
  categories: null,
  logs: new Map(),
  settings: {},
  uid: null,
  auth: IS_WEB ? 'unknown' : 'signedIn',
};

const listeners = new Set<() => void>();
let version = 0;
function emit() {
  version++;
  listeners.forEach((l) => l());
}
export function subscribeStore(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export function getStoreVersion() {
  return version;
}
export function getState() {
  return state;
}

let backend: Backend | null = null;

// ---------- 쓰기 큐 (문서마다 한 번에 하나씩, 최신 상태로 합쳐서 기록) ----------
const inflight = new Set<string>();
const dirty = new Set<string>();

function monthKeyOf(date: string) {
  return 'logs-' + date.slice(0, 7);
}

function bodyFor(docId: string): Record<string, unknown> {
  if (docId === 'habits') return { items: JSON.parse(JSON.stringify(state.habits)) };
  if (docId === 'categories') return { items: JSON.parse(JSON.stringify(state.categories || [])) };
  if (docId === 'settings') return { ...state.settings };
  if (docId.startsWith('logs-')) {
    const prefix = docId.slice(5);
    const items: Record<string, HabitLog> = {};
    state.logs.forEach((l, k) => {
      if (l.date.startsWith(prefix)) items[k] = JSON.parse(JSON.stringify(l));
    });
    return { items };
  }
  return {};
}

async function flush(docId: string) {
  if (!backend) return;
  if (inflight.has(docId)) {
    dirty.add(docId);
    return;
  }
  inflight.add(docId);
  dirty.delete(docId);
  try {
    await backend.write(docId, bodyFor(docId));
  } catch (e: any) {
    if (e?.code === 'unavailable') {
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
      try {
        await backend.write(docId, bodyFor(docId));
      } catch (e2: any) {
        reportWriteError(e2);
      }
    } else {
      reportWriteError(e);
    }
  } finally {
    inflight.delete(docId);
    if (dirty.has(docId)) flush(docId);
  }
}

function reportWriteError(e: any) {
  console.warn('db write failed', e);
  state.errorMessage =
    e?.code === 'quota_exceeded'
      ? '저장 공간이 가득 찼어요. 오래된 기록을 정리해야 해요.'
      : '저장에 실패했어요. 잠시 후 다시 시도해 주세요.';
  emit();
}

function isPending(docId: string) {
  return inflight.has(docId) || dirty.has(docId);
}

// ---------- 스냅샷 반영 (백엔드 공통) ----------
export function applySnapshot(docs: DocSnap[], removedIds: string[], fromCache: boolean) {
  for (const d of docs) {
    if (isPending(d.id) || d.pending) continue;
    const data = d.data || {};
    if (d.id === 'habits') {
      state.habits = Array.isArray(data.items) ? (data.items as Habit[]) : [];
    } else if (d.id === 'categories') {
      state.categories = Array.isArray(data.items) ? (data.items as HabitCategory[]) : null;
    } else if (d.id === 'settings') {
      state.settings = data as Settings;
    } else if (d.id.startsWith('logs-')) {
      const prefix = d.id.slice(5);
      for (const k of Array.from(state.logs.keys())) if (k.startsWith(prefix)) state.logs.delete(k);
      const items = (data.items || {}) as Record<string, HabitLog>;
      Object.entries(items).forEach(([k, v]) => state.logs.set(k, v));
    }
  }
  for (const id of removedIds) {
    if (isPending(id)) continue;
    if (id.startsWith('logs-')) {
      const prefix = id.slice(5);
      for (const k of Array.from(state.logs.keys())) if (k.startsWith(prefix)) state.logs.delete(k);
    } else if (id === 'habits') state.habits = [];
    else if (id === 'categories') state.categories = null;
  }
  if (!fromCache) {
    clearLoadTimer();
    state.habitsLoaded = true;
    state.status = 'ready';
    state.errorMessage = undefined;
  } else if (docs.length > 0) {
    state.habitsLoaded = true;
  }
  emit();
}

export function setBackendError(message: string) {
  clearLoadTimer();
  state.status = 'error';
  state.errorMessage = message;
  emit();
}

export function setNoBackend() {
  clearLoadTimer();
  state.status = 'nodb';
  state.habitsLoaded = true;
  emit();
}

export function attachBackend(b: Backend | null, uid: string | null) {
  backend = b;
  state.uid = uid;
}

// 로그아웃 등으로 화면의 기록을 모두 비움
export function resetData() {
  state.habits = [];
  state.categories = null;
  state.logs = new Map();
  state.settings = {};
  state.habitsLoaded = false;
  state.status = 'loading';
  inflight.clear();
  dirty.clear();
  emit();
}

export function setAuth(auth: State['auth'], account?: State['account']) {
  state.auth = auth;
  state.account = account;
  emit();
}

let loadTimer: ReturnType<typeof setTimeout> | null = null;
function clearLoadTimer() {
  if (loadTimer) clearTimeout(loadTimer);
  loadTimer = null;
}
export function startLoadTimer() {
  clearLoadTimer();
  loadTimer = setTimeout(() => {
    if (state.status === 'loading') {
      state.status = 'error';
      state.errorMessage = '저장소에 연결하지 못했어요. 네트워크를 확인해 주세요.';
      emit();
    }
  }, 10000);
}

// 저장 중인 내용이 다 끝날 때까지 기다림 (로그아웃 전에 사용)
export async function waitForWrites(timeoutMs = 5000) {
  const t0 = Date.now();
  while ((inflight.size || dirty.size) && Date.now() - t0 < timeoutMs) {
    await new Promise((r) => setTimeout(r, 100));
  }
}

// 내 기록 전부 삭제
export async function deleteAllMyData() {
  if (!backend) return;
  const ids = new Set<string>(['habits', 'categories', 'settings']);
  state.logs.forEach((l) => ids.add(monthKeyOf(l.date)));
  for (const id of ids) await backend.remove(id);
  resetData();
  state.status = 'ready';
  state.habitsLoaded = true;
  emit();
}

let started = false;
export async function initCloud() {
  if (started) return;
  started = true;
  if (import.meta.env.VITE_TARGET === 'web') {
    const fb = await import('./firebaseBackend');
    fb.startFirebase();
    return;
  }
  startLoadTimer();
  const { startClaude } = await import('./claudeBackend');
  startClaude();
}

// ---------- 변경 API ----------
export function setHabits(habits: Habit[]) {
  state.habits = habits;
  emit();
  flush('habits');
}

export function setCategories(cats: HabitCategory[]) {
  state.categories = cats;
  emit();
  flush('categories');
}

export function setSettings(patch: Settings) {
  state.settings = { ...state.settings, ...patch };
  emit();
  flush('settings');
}

export function putLog(log: HabitLog) {
  const key = `${log.date}_${log.habitId}`;
  state.logs.set(key, { ...log, id: key });
  emit();
  flush(monthKeyOf(log.date));
}

export function removeLog(date: string, habitId: string) {
  const key = `${date}_${habitId}`;
  if (state.logs.delete(key)) {
    emit();
    flush(monthKeyOf(date));
  }
}

export function removeLogsForHabit(habitId: string) {
  const months = new Set<string>();
  state.logs.forEach((l, k) => {
    if (l.habitId === habitId) {
      state.logs.delete(k);
      months.add(monthKeyOf(l.date));
    }
  });
  emit();
  months.forEach((m) => flush(m));
}

export function getLog(date: string, habitId: string) {
  return state.logs.get(`${date}_${habitId}`) || null;
}

export function getAllLogs(): HabitLog[] {
  return Array.from(state.logs.values());
}
