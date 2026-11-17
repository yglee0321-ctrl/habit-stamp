// 기록표 내보내기: 구글 시트(Google Drive 커넥터) / 표 복사(TSV)
import { Habit, HabitLog } from '../types';
import { format, eachDayOfInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { isHabitScheduledOnDate } from './storage';
import { IS_WEB } from './cloud';

export function buildRows(habits: Habit[], logs: HabitLog[], start: Date, end: Date): string[][] {
  const map = new Map<string, HabitLog>();
  logs.forEach((l) => map.set(`${l.date}_${l.habitId}`, l));
  const header = ['날짜', '요일', '달성률', ...habits.map((h) => (h.trackOnly ? `${h.title}` : h.title))];
  const rows: string[][] = [header];
  eachDayOfInterval({ start, end }).forEach((d) => {
    const ds = format(d, 'yyyy-MM-dd');
    let done = 0;
    let total = 0;
    const cells = habits.map((h) => {
      const l = map.get(`${ds}_${h.id}`);
      if (!h.trackOnly) {
        if ((h.frequencyType || 'specific_days') === 'specific_days') {
          if (isHabitScheduledOnDate(h, d)) {
            total++;
            if (l?.completed) done++;
          }
        } else if (l?.completed) {
          total++;
          done++;
        }
      }
      const parts: string[] = [];
      if (!h.trackOnly && l?.completed) parts.push(l.subitem ? `O(${l.subitem})` : 'O');
      else if (!h.trackOnly && (l?.currentCount || 0) > 0) parts.push(`${l!.currentCount}/${h.targetCount || 1}`);
      if (l?.notes) parts.push(l.notes.replace(/\s*\n\s*/g, ' / '));
      return parts.join(' ');
    });
    const hasAny = cells.some((c) => c);
    rows.push([ds, format(d, 'EEE', { locale: ko }), total > 0 && (hasAny || done > 0) ? `${Math.round((done / total) * 100)}%` : '', ...cells]);
  });
  return rows;
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCSV(rows: string[][]) {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

export function toTSV(rows: string[][]) {
  return rows.map((r) => r.map((v) => v.replace(/\t/g, ' ')).join('\t')).join('\n');
}

export type ExportResult = { ok: true; url: string } | { ok: false; message: string };

export async function exportToGoogleSheets(title: string, rows: string[][]): Promise<ExportResult> {
  if (import.meta.env.VITE_TARGET === 'web') {
    const fb = await import('./firebaseBackend');
    return fb.uploadCsvAsSheet(title, toCSV(rows));
  }
  const c = (window as any).claude;
  const mcp = c?.use ? await c.use('mcp') : null;
  if (!mcp) return { ok: false, message: '이 화면에서는 구글 드라이브에 연결할 수 없어요. claude.ai에서 앱을 열어 주세요.' };
  try {
    const res = await mcp.callTool('Google Drive', 'create_file', {
      title,
      textContent: toCSV(rows),
      contentMimeType: 'text/csv',
    });
    const p: any = res?.payload || {};
    const file = p.file || p;
    const id = file.id || file.fileId;
    const url = file.webViewLink || file.alternateLink || (id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : '');
    return { ok: true, url };
  } catch (e: any) {
    switch (e?.code) {
      case 'server_not_connected':
        return { ok: false, message: 'Google Drive가 연결되어 있지 않아요. claude.ai 설정 → 커넥터에서 Google Drive를 추가해 주세요.' };
      case 'needs_reauth':
        return { ok: false, message: 'Google Drive 연결이 만료됐어요. claude.ai 설정 → 커넥터에서 다시 연결해 주세요.' };
      case 'not_in_manifest':
      case 'approval_required':
        return { ok: false, message: 'Google Drive 사용을 허용해야 내보낼 수 있어요. 다시 눌러서 허용해 주세요.' };
      case 'selection_required':
        return { ok: false, message: '연결된 Google Drive 계정 중 하나를 골라 주세요.' };
      case 'blocked_by_policy':
        return { ok: false, message: '조직 정책으로 Google Drive를 쓸 수 없어요.' };
      case 'tool_error':
        return { ok: false, message: `구글 드라이브가 파일을 만들지 못했어요. (${String(e.message || '').slice(0, 120)})` };
      default:
        return { ok: false, message: '내보내는 중 문제가 생겼어요. 파일이 만들어졌을 수도 있으니 구글 드라이브를 먼저 확인해 주세요.' };
    }
  }
}
