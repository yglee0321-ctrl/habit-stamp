import { HabitCategory } from '../types';

export const DEFAULT_CATEGORIES: HabitCategory[] = [
  {
    id: 'health',
    name: '건강 & 운동',
    color: 'emerald',
    icon: 'Activity',
    isDefault: true,
  },
  {
    id: 'learning',
    name: '학습 & 독서',
    color: 'sky',
    icon: 'BookOpen',
    isDefault: true,
  },
  {
    id: 'productivity',
    name: '업무 & 생산성',
    color: 'indigo',
    icon: 'Briefcase',
    isDefault: true,
  },
  {
    id: 'mindfulness',
    name: '마음챙김 & 휴식',
    color: 'amber',
    icon: 'Heart',
    isDefault: true,
  },
  {
    id: 'routine',
    name: '생활 루틴 & 수분',
    color: 'cyan',
    icon: 'Droplets',
    isDefault: true,
  },
  {
    id: 'hobby',
    name: '취미 & 창작',
    color: 'rose',
    icon: 'Sparkles',
    isDefault: true,
  },
];

export const CATEGORY_COLORS = [
  { id: 'emerald', label: '에메랄드 그린', bg: 'bg-emerald-500', text: 'text-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-500/20' },
  { id: 'sky', label: '스카이 블루', bg: 'bg-sky-500', text: 'text-sky-500', lightBg: 'bg-sky-50 dark:bg-sky-950/40', border: 'border-sky-500/20' },
  { id: 'indigo', label: '인디고 퍼플', bg: 'bg-indigo-500', text: 'text-indigo-500', lightBg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-500/20' },
  { id: 'amber', label: '앰버 오렌지', bg: 'bg-amber-500', text: 'text-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-500/20' },
  { id: 'cyan', label: '시안 블루', bg: 'bg-cyan-500', text: 'text-cyan-500', lightBg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-500/20' },
  { id: 'rose', label: '로즈 핑크', bg: 'bg-rose-500', text: 'text-rose-500', lightBg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-500/20' },
  { id: 'violet', label: '바이올렛', bg: 'bg-violet-500', text: 'text-violet-500', lightBg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-500/20' },
  { id: 'teal', label: '틸 그린', bg: 'bg-teal-500', text: 'text-teal-500', lightBg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-500/20' },
];

export const AVAILABLE_ICONS = [
  'Activity', 'BookOpen', 'Briefcase', 'Heart', 'Droplets', 'Sparkles',
  'Flame', 'Dumbbell', 'Coffee', 'Moon', 'Sun', 'CheckCircle2',
  'Target', 'Zap', 'Smile', 'Apple', 'Footprints', 'Music',
  'PenTool', 'Compass', 'Clock', 'Shield', 'Gift', 'Star'
];

export function getCategoryStyle(colorId: string) {
  return CATEGORY_COLORS.find(c => c.id === colorId) || CATEGORY_COLORS[0];
}
