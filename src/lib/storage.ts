import { Habit, HabitLog, DayOfWeek, GradeLevel, HabitMonthlyReport, WeekStats, HabitCategory } from '../types';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval, parseISO, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as cloud from './cloud';

/**
 * Add or update a habit
 */
export async function saveHabit(habit: Partial<Habit> & { userId?: string }): Promise<string> {
  const now = Date.now();
  const habits = cloud.getState().habits;
  const habitId = habit.id || `habit_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const prev = habits.find((h) => h.id === habitId);
  const merged: Partial<Habit> = { ...(prev || {}), ...habit };

  const fullHabit: Habit = {
    id: habitId,
    userId: 'me',
    title: merged.title || '새 습관',
    description: merged.description || '',
    categoryId: merged.categoryId || 'health',
    frequencyType: merged.frequencyType || 'specific_days',
    targetDays: merged.targetDays || [0, 1, 2, 3, 4, 5, 6],
    frequencyTargetCount: merged.frequencyTargetCount,
    targetCount: merged.targetCount || 1,
    unit: merged.unit || '회',
    timeOfDay: merged.timeOfDay || 'anytime',
    importance: merged.importance || 'normal',
    weight: typeof merged.weight === 'number' ? merged.weight : (merged.importance === 'critical' ? 2.0 : merged.importance === 'high' ? 1.5 : merged.importance === 'low' ? 0.5 : 1.0),
    stampShape: merged.stampShape || 'square',
    stampText: merged.stampText || merged.title?.slice(0, 2) || '完',
    subcategories: merged.subcategories || [],
    reminderEnabled: false,
    color: merged.color || 'emerald',
    icon: merged.icon || 'Activity',
    order: merged.order ?? habits.length,
    archived: false,
    trackOnly: !!merged.trackOnly,
    createdAt: merged.createdAt || now,
    updatedAt: now,
  };
  // undefined 필드 제거
  Object.keys(fullHabit).forEach((k) => (fullHabit as any)[k] === undefined && delete (fullHabit as any)[k]);

  const next = prev ? habits.map((h) => (h.id === habitId ? fullHabit : h)) : [...habits, fullHabit];
  cloud.setHabits(next);
  return habitId;
}

export async function saveHabitsBatch(list: Partial<Habit>[], replaceExisting: boolean): Promise<void> {
  const now = Date.now();
  const base = replaceExisting ? [] : cloud.getState().habits;
  const created: Habit[] = list.map((h, i) => ({
    id: `habit_${now}_${i}_${Math.random().toString(36).substring(2, 6)}`,
    userId: 'me',
    title: h.title || '새 습관',
    description: h.description || '',
    categoryId: h.categoryId || 'routine',
    frequencyType: h.frequencyType || 'specific_days',
    targetDays: h.targetDays && h.targetDays.length ? h.targetDays : [0, 1, 2, 3, 4, 5, 6],
    ...(h.frequencyTargetCount ? { frequencyTargetCount: h.frequencyTargetCount } : {}),
    targetCount: h.targetCount || 1,
    unit: h.unit || '회',
    timeOfDay: h.timeOfDay || 'anytime',
    importance: h.importance || 'normal',
    weight: 1,
    stampShape: h.stampShape || 'square',
    stampText: h.stampText || (h.title || '完').slice(0, 2),
    subcategories: h.subcategories || [],
    reminderEnabled: false,
    color: h.color || 'emerald',
    icon: h.icon || 'Activity',
    order: base.length + i,
    archived: false,
    trackOnly: !!h.trackOnly,
    createdAt: now,
    updatedAt: now,
  }));
  cloud.setHabits([...base, ...created]);
}

/**
 * Delete a habit (and its logs)
 */
export async function deleteHabit(_userId: string, habitId: string): Promise<void> {
  cloud.setHabits(cloud.getState().habits.filter((h) => h.id !== habitId));
  cloud.removeLogsForHabit(habitId);
}

/**
 * Toggle or increment habit log completion (원본 로직 유지)
 */
export async function toggleHabitLog(
  userId: string,
  habit: Habit,
  date: string,
  action: 'toggle' | 'increment' | 'decrement' = 'toggle',
  _userProfile?: unknown,
  targetSubitem?: string
): Promise<HabitLog> {
  const logId = `${date}_${habit.id}`;
  const target = habit.targetCount || 1;
  const existing = cloud.getLog(date, habit.id);

  let currentLog: HabitLog;
  const subcategories = habit.subcategories && habit.subcategories.length > 0 ? habit.subcategories : null;

  if (targetSubitem !== undefined) {
    if (existing && existing.completed && existing.subitem === targetSubitem) {
      currentLog = { ...existing, id: logId, habitId: habit.id, date, currentCount: 0, completed: false };
      delete currentLog.subitem;
      delete currentLog.completedAt;
    } else {
      currentLog = {
        ...(existing || ({} as HabitLog)),
        id: logId, habitId: habit.id, userId, date,
        completed: true, currentCount: target, targetCount: target,
        subitem: targetSubitem,
        completedAt: existing?.completedAt || Date.now(),
      };
    }
  } else if (!existing) {
    let nextCount = 1;
    let nextSubitem: string | undefined = undefined;
    if (subcategories) {
      nextSubitem = subcategories[0];
      nextCount = target;
    } else if (action === 'toggle') {
      nextCount = target;
    }
    const isCompleted = nextCount >= target;
    currentLog = {
      id: logId, habitId: habit.id, userId, date,
      completed: isCompleted, currentCount: nextCount, targetCount: target,
      ...(isCompleted && nextSubitem ? { subitem: nextSubitem } : {}),
      ...(isCompleted ? { completedAt: Date.now() } : {}),
    };
  } else {
    let nextCount = existing.currentCount;
    let nextSubitem: string | undefined = existing.subitem;
    if (subcategories && action === 'toggle') {
      if (!existing.completed) {
        nextSubitem = subcategories[0];
        nextCount = target;
      } else {
        const idx = existing.subitem ? subcategories.indexOf(existing.subitem) : -1;
        if (idx >= 0 && idx < subcategories.length - 1) {
          nextSubitem = subcategories[idx + 1];
          nextCount = target;
        } else {
          nextSubitem = undefined;
          nextCount = 0;
        }
      }
    } else if (action === 'toggle') {
      if (existing.completed) {
        nextCount = 0;
        nextSubitem = undefined;
      } else {
        nextCount = target;
      }
    } else if (action === 'increment') {
      nextCount = Math.min(target * 2, existing.currentCount + 1);
    } else if (action === 'decrement') {
      nextCount = Math.max(0, existing.currentCount - 1);
    }
    const isCompleted = nextCount >= target;
    if (isCompleted) {
      currentLog = {
        ...existing, id: logId, habitId: habit.id, date, currentCount: nextCount, completed: true,
        ...(nextSubitem ? { subitem: nextSubitem } : {}),
        completedAt: existing.completedAt || Date.now(),
      };
      delete currentLog.missed;
    } else {
      currentLog = { ...existing, id: logId, habitId: habit.id, date, currentCount: nextCount, completed: false };
      delete currentLog.subitem;
      delete currentLog.completedAt;
    }
  }
  Object.keys(currentLog).forEach((k) => (currentLog as any)[k] === undefined && delete (currentLog as any)[k]);
  cloud.putLog(currentLog);
  return currentLog;
}

/**
 * 시트 화면용: 한 칸의 상태(도장 O / X / 비움)와 글을 직접 지정
 */
export function setCellRecord(
  habit: Habit,
  date: string,
  mark: 'done' | 'missed' | 'none',
  notes: string,
  subitem?: string,
  count?: number
) {
  const existing = cloud.getLog(date, habit.id);
  const target = habit.targetCount || 1;
  const trimmed = notes.trim();
  let cnt = mark === 'done' ? Math.max(target, count ?? 0) : mark === 'missed' ? 0 : Math.max(0, Math.min(count ?? 0, target - 1));
  if (mark === 'none' && !trimmed && cnt === 0) {
    cloud.removeLog(date, habit.id);
    return;
  }
  const log: HabitLog = {
    id: `${date}_${habit.id}`,
    habitId: habit.id,
    userId: 'me',
    date,
    completed: mark === 'done',
    currentCount: cnt,
    targetCount: target,
  };
  if (mark === 'done') {
    log.completedAt = existing?.completedAt || Date.now();
    const sub = subitem ?? existing?.subitem;
    if (sub) log.subitem = sub;
  }
  if (mark === 'missed') log.missed = true;
  if (trimmed) log.notes = trimmed;
  cloud.putLog(log);
}

/**
 * Update notes on a habit log
 */
export async function updateHabitLogNotes(userId: string, habitId: string, date: string, notes: string): Promise<void> {
  const existing = cloud.getLog(date, habitId);
  const trimmed = notes.trim();
  if (existing) {
    const next: HabitLog = { ...existing };
    if (trimmed) next.notes = trimmed;
    else delete next.notes;
    if (!next.completed && !next.missed && !next.notes && !next.currentCount) {
      cloud.removeLog(date, habitId);
    } else {
      cloud.putLog(next);
    }
  } else if (trimmed) {
    cloud.putLog({ id: `${date}_${habitId}`, habitId, userId, date, completed: false, currentCount: 0, targetCount: 1, notes: trimmed });
  }
}

/**
 * Helpers for weekly & monthly frequency tracking
 */
export function getHabitWeekProgress(habit: Habit, logs: HabitLog[], referenceDate: Date = new Date()): { completedCount: number; targetCount: number; isGoalMet: boolean; rate: number } {
  const target = habit.frequencyTargetCount || 3;
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const end = endOfWeek(referenceDate, { weekStartsOn: 1 });

  // Count distinct completed dates for this habit in the current week
  const completedDates = new Set<string>();
  logs.forEach(l => {
    if (l.habitId === habit.id && l.completed) {
      try {
        const logDate = parseISO(l.date);
        if (isWithinInterval(logDate, { start, end })) {
          completedDates.add(l.date);
        }
      } catch {
        // fallback date match
        if (l.date >= format(start, 'yyyy-MM-dd') && l.date <= format(end, 'yyyy-MM-dd')) {
          completedDates.add(l.date);
        }
      }
    }
  });

  const count = completedDates.size;
  const rate = Math.min(100, Math.round((count / target) * 100));
  return {
    completedCount: count,
    targetCount: target,
    isGoalMet: count >= target,
    rate,
  };
}

export function getHabitMonthProgress(habit: Habit, logs: HabitLog[], referenceDate: Date = new Date()): { completedCount: number; targetCount: number; isGoalMet: boolean; rate: number } {
  const target = habit.frequencyTargetCount || 10;
  const start = startOfMonth(referenceDate);
  const end = endOfMonth(referenceDate);

  const completedDates = new Set<string>();
  logs.forEach(l => {
    if (l.habitId === habit.id && l.completed) {
      try {
        const logDate = parseISO(l.date);
        if (isWithinInterval(logDate, { start, end })) {
          completedDates.add(l.date);
        }
      } catch {
        if (l.date >= format(start, 'yyyy-MM-dd') && l.date <= format(end, 'yyyy-MM-dd')) {
          completedDates.add(l.date);
        }
      }
    }
  });

  const count = completedDates.size;
  const rate = Math.min(100, Math.round((count / target) * 100));
  return {
    completedCount: count,
    targetCount: target,
    isGoalMet: count >= target,
    rate,
  };
}

/**
 * Helper to get numeric weight multiplier of a habit for achievement score calculations.
 * - 'low': 0.5x (가벼운 습관, 부담 없는 루틴)
 * - 'normal': 1.0x (기본값, 모든 습관 기본 동일)
 * - 'high': 1.5x (중요 습관, 주요 목표)
 * - 'critical': 2.0x (핵심 사수 습관, 결정적 루틴)
 */
export function getHabitWeight(habit: Habit): number {
  if (typeof habit.weight === 'number' && habit.weight > 0) {
    return habit.weight;
  }
  switch (habit.importance) {
    case 'low':
      return 0.5;
    case 'high':
      return 1.5;
    case 'critical':
      return 2.0;
    case 'normal':
    default:
      return 1.0;
  }
}

export function getHabitImportanceInfo(habit: Habit) {
  const importance = habit.importance || 'normal';
  const weight = getHabitWeight(habit);
  switch (importance) {
    case 'low':
      return {
        key: 'low' as const,
        label: '가벼움',
        badge: '가벼움 (0.5x)',
        weight,
        stars: '★',
        badgeColor: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/10',
      };
    case 'high':
      return {
        key: 'high' as const,
        label: '중요',
        badge: '중요 (1.5x)',
        weight,
        stars: '★★',
        badgeColor: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/40',
      };
    case 'critical':
      return {
        key: 'critical' as const,
        label: '핵심',
        badge: '핵심 (2.0x)',
        weight,
        stars: '★★★',
        badgeColor: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/40',
      };
    case 'normal':
    default:
      return {
        key: 'normal' as const,
        label: '보통',
        badge: '보통 (1.0x)',
        weight: 1.0,
        stars: '★',
        badgeColor: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/40',
      };
  }
}

export function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  const frequencyType = habit.frequencyType || 'specific_days';
  if (frequencyType === 'weekly_target' || frequencyType === 'monthly_target') {
    return true; // Available for logging across the target interval
  }
  const dayOfWeek = date.getDay() as DayOfWeek;
  return (habit.targetDays || [0, 1, 2, 3, 4, 5, 6]).includes(dayOfWeek);
}

/**
 * Checks if a habit is strictly mandatory on this specific calendar day.
 * - 'specific_days': strictly checks if date's day of week is in targetDays.
 * - 'weekly_target' / 'monthly_target': flexible interval goals, not strict single-day obligations.
 */
export function isHabitStrictlyRequiredOnDay(habit: Habit, date: Date): boolean {
  const frequencyType = habit.frequencyType || 'specific_days';
  if (frequencyType === 'specific_days') {
    const dayOfWeek = date.getDay() as DayOfWeek;
    return (habit.targetDays || [0, 1, 2, 3, 4, 5, 6]).includes(dayOfWeek);
  }
  return false;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatHabitFrequencyBadge(habit: Habit): string {
  const frequencyType = habit.frequencyType || 'specific_days';
  if (frequencyType === 'weekly_target') {
    return `주 ${habit.frequencyTargetCount || 3}회`;
  }
  if (frequencyType === 'monthly_target') {
    return `월 ${habit.frequencyTargetCount || 10}회`;
  }

  const days = habit.targetDays || [0, 1, 2, 3, 4, 5, 6];
  if (days.length === 7) return '매일';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return '평일 (월~금)';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return '주말 (토·일)';
  return days.map(d => DAY_LABELS[d]).join('·');
}

/**
 * Add or update a habit with local fallback and Firestore sync
/**
 * Streak and Summary Computation Algorithms
 */
export function calculateStreakStats(habits: Habit[], logs: HabitLog[]): { currentStreak: number; longestStreak: number; totalCompleted: number } {
  if (habits.length === 0 || logs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalCompleted: 0 };
  }

  // Map of date -> boolean (all scheduled habits completed on this date)
  const dateLogsMap = new Map<string, HabitLog[]>();
  let totalCompleted = 0;

  logs.forEach(log => {
    if (log.completed) {
      totalCompleted++;
    }
    const list = dateLogsMap.get(log.date) || [];
    list.push(log);
    dateLogsMap.set(log.date, list);
  });

  const today = new Date();
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Check last 365 days for streaks
  for (let i = 0; i < 365; i++) {
    const d = subDays(today, i);
    const dateStr = format(d, 'yyyy-MM-dd');

    const dayLogs = dateLogsMap.get(dateStr) || [];
    const activeHabits = habits.filter(h => !h.archived && isHabitScheduledOnDate(h, d));
    if (activeHabits.length === 0) {
      continue;
    }

    let dayWeightedTarget = 0;
    let dayWeightedCompleted = 0;
    activeHabits.forEach(h => {
      const w = getHabitWeight(h);
      dayWeightedTarget += w;
      if (dayLogs.some(l => l.habitId === h.id && l.completed)) {
        dayWeightedCompleted += w;
      }
    });

    const isDaySuccess = dayWeightedCompleted > 0 && dayWeightedCompleted >= dayWeightedTarget * 0.7;

    if (isDaySuccess) {
      tempStreak++;
      if (i === 0 || (i === 1 && currentStreak === 0)) {
        currentStreak = tempStreak;
      }
    } else {
      if (i === 0) {
        // Today is not finished yet, so check if yesterday had streak
        continue;
      }
      if (currentStreak === 0 && tempStreak > 0) {
        currentStreak = tempStreak;
      }
      tempStreak = 0;
    }

    if (tempStreak > maxStreak) {
      maxStreak = tempStreak;
    }
  }

  return {
    currentStreak: Math.max(currentStreak, tempStreak),
    longestStreak: Math.max(maxStreak, currentStreak),
    totalCompleted,
  };
}

/**
 * Generate 7-day weekly stats with habit weights & frequency awareness
 */
export function getWeeklyIntervalStats(habits: Habit[], logs: HabitLog[], referenceDate: Date = new Date()) {
  const start = startOfWeek(referenceDate, { weekStartsOn: 1 }); // Monday start
  const end = endOfWeek(referenceDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const logsMap = new Map<string, Map<string, HabitLog>>();
  logs.forEach(l => {
    if (!logsMap.has(l.date)) {
      logsMap.set(l.date, new Map());
    }
    logsMap.get(l.date)!.set(l.habitId, l);
  });

  const dailyStats = days.map(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayLabel = format(d, 'EEE', { locale: ko });
    const dayLogs = logsMap.get(dateStr);

    // Active habits scheduled on this day
    const scheduledToday = habits.filter(h => !h.archived && isHabitScheduledOnDate(h, d));
    const activeHabitsToday = scheduledToday.length > 0
      ? scheduledToday
      : habits.filter(h => !h.archived);

    let dayWeightedTarget = 0;
    let dayWeightedCompleted = 0;
    let completedCount = 0;

    activeHabitsToday.forEach(h => {
      const w = getHabitWeight(h);
      dayWeightedTarget += w;
      const log = dayLogs?.get(h.id);
      if (log?.completed) {
        dayWeightedCompleted += w;
        completedCount++;
      }
    });

    const total = activeHabitsToday.length;
    // When completedCount is 0 or dayWeightedTarget is 0, the completion rate is strictly 0%.
    const rate = (dayWeightedTarget > 0 && completedCount > 0)
      ? Math.min(100, Math.round((dayWeightedCompleted / dayWeightedTarget) * 100))
      : 0;

    return {
      date: dateStr,
      dateObj: d,
      dayLabel,
      fullDate: format(d, 'M월 d일 (EEE)', { locale: ko }),
      totalHabits: total,
      completedHabits: completedCount,
      completionRate: rate,
    };
  });

  // Calculate overall weekly rate based on habit frequency targets and importance weights
  let totalWeightedTarget = 0;
  let totalWeightedCompleted = 0;
  let totalRawScheduled = 0;
  let totalRawCompleted = 0;

  habits.forEach(habit => {
    const w = getHabitWeight(habit);
    let habitWeekTarget = 0;
    let habitWeekCompleted = 0;

    const freq = habit.frequencyType || 'specific_days';
    if (freq === 'weekly_target') {
      habitWeekTarget = Math.max(1, habit.frequencyTargetCount || 1);
      days.forEach(d => {
        const dStr = format(d, 'yyyy-MM-dd');
        const log = logsMap.get(dStr)?.get(habit.id);
        if (log && log.completed) {
          habitWeekCompleted++;
        }
      });
    } else if (freq === 'monthly_target') {
      // For monthly target in a single week:
      days.forEach(d => {
        const dStr = format(d, 'yyyy-MM-dd');
        const log = logsMap.get(dStr)?.get(habit.id);
        if (log && log.completed) {
          habitWeekCompleted++;
        }
      });
      // If completed this week, count as contributing; if not completed yet, it does not unfairly drag down the week
      habitWeekTarget = habitWeekCompleted > 0 ? habitWeekCompleted : 0;
    } else {
      // specific_days
      days.forEach(d => {
        if (isHabitStrictlyRequiredOnDay(habit, d)) {
          habitWeekTarget++;
          const dStr = format(d, 'yyyy-MM-dd');
          const log = logsMap.get(dStr)?.get(habit.id);
          if (log && log.completed) {
            habitWeekCompleted++;
          }
        }
      });
    }

    totalRawScheduled += habitWeekTarget;
    totalRawCompleted += Math.min(habitWeekTarget, habitWeekCompleted);

    totalWeightedTarget += habitWeekTarget * w;
    totalWeightedCompleted += Math.min(habitWeekTarget, habitWeekCompleted) * w;
  });

  // Fix: When totalWeightedCompleted is 0 or totalWeightedTarget is 0, average rate is strictly 0%.
  // Previously it defaulted to 100%, causing 0% completion weeks to show as 100%!
  const averageRate = (totalWeightedTarget > 0 && totalWeightedCompleted > 0)
    ? Math.min(100, Math.round((totalWeightedCompleted / totalWeightedTarget) * 100))
    : 0;

  return {
    startDate: format(start, 'yyyy.MM.dd'),
    endDate: format(end, 'yyyy.MM.dd'),
    dailyStats,
    totalScheduled: totalRawScheduled,
    totalCompleted: totalRawCompleted,
    averageRate,
  };
}

/**
 * Traditional Grade Calculation (F to A+, and Hanja Grade)
 */
export function calcGrade(rate: number): { grade: GradeLevel; hanjaGrade: string; color: string; label: string } {
  if (rate >= 95) return { grade: 'A+', hanjaGrade: '秀', color: 'text-amber-500 border-amber-500 bg-amber-500/10', label: '최우수 (장원급제)' };
  if (rate >= 85) return { grade: 'A', hanjaGrade: '優', color: 'text-emerald-500 border-emerald-500 bg-emerald-500/10', label: '우수 (만족)' };
  if (rate >= 70) return { grade: 'B', hanjaGrade: '美', color: 'text-sky-500 border-sky-500 bg-sky-500/10', label: '양호 (보통)' };
  if (rate >= 55) return { grade: 'C', hanjaGrade: '良', color: 'text-indigo-400 border-indigo-400 bg-indigo-500/10', label: '노력 요망' };
  if (rate >= 40) return { grade: 'D', hanjaGrade: '可', color: 'text-orange-400 border-orange-400 bg-orange-500/10', label: '미흡' };
  return { grade: 'F', hanjaGrade: '落', color: 'text-rose-500 border-rose-500 bg-rose-500/10', label: '재도전' };
}

export interface MonthWeekRange {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  startStr: string;
  endStr: string;
  label: string;
}

/**
 * Determine weeks in a given month using the majority rule (과반수 규칙: at least 4 days in this month).
 */
export function getWeeksInMonth(year: number, month: number): MonthWeekRange[] {
  // month is 0-indexed (0 = Jan, 7 = Aug)
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const weeks: MonthWeekRange[] = [];
  let currentMon = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  let weekNum = 1;

  while (currentMon <= monthEnd) {
    const currentSun = endOfWeek(currentMon, { weekStartsOn: 1 });
    // Count how many days of this week fall in target month
    let daysInMonthCount = 0;
    for (let i = 0; i < 7; i++) {
      const day = addDays(currentMon, i);
      if (day.getMonth() === month && day.getFullYear() === year) {
        daysInMonthCount++;
      }
    }

    // Majority rule: 4 or more days must belong to this month
    if (daysInMonthCount >= 4) {
      weeks.push({
        weekNumber: weekNum,
        startDate: currentMon,
        endDate: currentSun,
        startStr: format(currentMon, 'yyyy-MM-dd'),
        endStr: format(currentSun, 'yyyy-MM-dd'),
        label: `${month + 1}월 ${weekNum}주차 (${format(currentMon, 'M.d')}~${format(currentSun, 'M.d')})`,
      });
      weekNum++;
    }

    currentMon = addDays(currentMon, 7);
  }

  return weeks;
}

/**
 * Compute full monthly grade report for all habits with importance weighting and fair frequency targets
 */
export function computeMonthlyReport(
  habits: Habit[],
  logs: HabitLog[],
  year: number,
  month: number
): { reports: HabitMonthlyReport[]; overallGrade: GradeLevel; overallHanjaGrade: string; overallRate: number } {
  const weeks = getWeeksInMonth(year, month);
  const logsMap = new Map<string, HabitLog>();
  logs.forEach(l => logsMap.set(`${l.date}_${l.habitId}`, l));

  let totalWeightedTargetAll = 0;
  let totalWeightedCompletedAll = 0;

  const reports: HabitMonthlyReport[] = habits.map(habit => {
    const weight = getHabitWeight(habit);
    let habitTotalTarget = 0;
    let habitTotalCompleted = 0;

    const weekStatsList: WeekStats[] = weeks.map(w => {
      const days = eachDayOfInterval({ start: w.startDate, end: w.endDate });
      let weekTarget = 0;
      let weekCompleted = 0;

      if (habit.frequencyType === 'weekly_target') {
        weekTarget = Math.max(1, habit.frequencyTargetCount || 1);
        days.forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          const log = logsMap.get(`${dStr}_${habit.id}`);
          if (log && log.completed) {
            weekCompleted++;
          }
        });
      } else if (habit.frequencyType === 'monthly_target') {
        // Monthly target applies to the whole month, not divided artificially into every single week
        days.forEach(d => {
          const dStr = format(d, 'yyyy-MM-dd');
          const log = logsMap.get(`${dStr}_${habit.id}`);
          if (log && log.completed) {
            weekCompleted++;
          }
        });
        // Week displays actual stamps done this week without penalizing inactive weeks
        weekTarget = weekCompleted > 0 ? weekCompleted : 0;
      } else {
        // specific days
        days.forEach(d => {
          if (isHabitStrictlyRequiredOnDay(habit, d)) {
            weekTarget++;
            const dStr = format(d, 'yyyy-MM-dd');
            const log = logsMap.get(`${dStr}_${habit.id}`);
            if (log && log.completed) {
              weekCompleted++;
            }
          }
        });
      }

      const rate = (weekTarget > 0 && weekCompleted > 0)
        ? Math.min(100, Math.round((weekCompleted / weekTarget) * 100))
        : 0;
      const { grade, hanjaGrade } = calcGrade(rate);

      if (habit.frequencyType === 'weekly_target') {
        habitTotalTarget += weekTarget;
        habitTotalCompleted += Math.min(weekTarget, weekCompleted);
      } else if (habit.frequencyType === 'specific_days') {
        habitTotalTarget += weekTarget;
        habitTotalCompleted += weekCompleted;
      } else {
        // monthly_target: accumulate completions across the weeks of this month
        habitTotalCompleted += weekCompleted;
      }

      return {
        weekNumber: w.weekNumber,
        startDate: w.startStr,
        endDate: w.endStr,
        label: `${w.weekNumber}주차`,
        completedDays: weekCompleted,
        targetDays: weekTarget,
        rate,
        grade,
        hanjaGrade,
      };
    });

    if (habit.frequencyType === 'monthly_target') {
      habitTotalTarget = Math.max(1, habit.frequencyTargetCount || 1);
    }

    const monthlyRate = (habitTotalTarget > 0 && habitTotalCompleted > 0)
      ? Math.min(100, Math.round((Math.min(habitTotalTarget, habitTotalCompleted) / habitTotalTarget) * 100))
      : 0;
    const { grade: monthlyGrade, hanjaGrade: monthlyHanjaGrade } = calcGrade(monthlyRate);

    totalWeightedTargetAll += habitTotalTarget * weight;
    totalWeightedCompletedAll += Math.min(habitTotalTarget, habitTotalCompleted) * weight;

    return {
      habitId: habit.id,
      habitTitle: habit.title,
      categoryName: habit.categoryId,
      color: habit.color || 'emerald',
      stampText: habit.stampText || '完',
      importance: habit.importance || 'normal',
      weight,
      weeks: weekStatsList,
      monthlyCompleted: Math.min(habitTotalTarget, habitTotalCompleted),
      monthlyTarget: habitTotalTarget,
      monthlyRate,
      monthlyGrade,
      monthlyHanjaGrade,
    };
  });

  // Calculate weighted overall rate across all habits
  let weightedRateSum = 0;
  let totalHabitWeight = 0;
  reports.forEach(r => {
    const w = r.weight || 1.0;
    weightedRateSum += r.monthlyRate * w;
    totalHabitWeight += w;
  });

  const overallRate = totalHabitWeight > 0 ? Math.min(100, Math.round(weightedRateSum / totalHabitWeight)) : 0;
  const { grade: overallGrade, hanjaGrade: overallHanjaGrade } = calcGrade(overallRate);

  return {
    reports,
    overallGrade,
    overallHanjaGrade,
    overallRate,
  };
}

export interface CalendarDayStat {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  totalScheduled: number;
  totalCompleted: number;
  rate: number;
  grade: GradeLevel;
  hanjaGrade: string;
  completedStamps: { habitId: string; title: string; stampText: string; color: string; subitem?: string }[];
}

/**
 * Generate full calendar grid (including leading and trailing overflow days) with achievement stats
 */
export function getDailyCalendarStats(
  habits: Habit[],
  logs: HabitLog[],
  year: number,
  month: number
): CalendarDayStat[] {
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(new Date(year, month, 1));

  // Start from Sunday of first week
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  // End on Saturday of last week
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const allCalendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const logsMap = new Map<string, Map<string, HabitLog>>();
  logs.forEach(l => {
    if (!logsMap.has(l.date)) {
      logsMap.set(l.date, new Map());
    }
    logsMap.get(l.date)!.set(l.habitId, l);
  });

  return allCalendarDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isCurrentMonth = day.getMonth() === month;
    const isToday = dateStr === todayStr;
    const isPast = dateStr <= todayStr;

    // Habits scheduled for this day
    const dayLogs = logsMap.get(dateStr);
    const scheduledToday = habits.filter(h => !h.archived && isHabitScheduledOnDate(h, day));
    const activeHabits = scheduledToday.length > 0 ? scheduledToday : habits.filter(h => !h.archived);
    const completedStamps: { habitId: string; title: string; stampText: string; color: string; subitem?: string }[] = [];
    let completedCount = 0;
    let dayWeightedTarget = 0;
    let dayWeightedCompleted = 0;

    activeHabits.forEach(h => {
      const w = getHabitWeight(h);
      dayWeightedTarget += w;
      const log = dayLogs?.get(h.id);
      if (log?.completed) {
        completedCount++;
        dayWeightedCompleted += w;
        completedStamps.push({
          habitId: h.id,
          title: h.title,
          stampText: h.stampText || '完',
          color: h.color || 'emerald',
          subitem: log.subitem,
        });
      }
    });

    const total = activeHabits.length;
    const rate = (dayWeightedTarget > 0 && completedCount > 0)
      ? Math.min(100, Math.round((dayWeightedCompleted / dayWeightedTarget) * 100))
      : 0;
    const { grade, hanjaGrade } = calcGrade(rate);

    return {
      date: day,
      dateStr,
      dayNumber: day.getDate(),
      isCurrentMonth,
      isToday,
      isPast,
      totalScheduled: total,
      totalCompleted: completedCount,
      rate,
      grade,
      hanjaGrade,
      completedStamps,
    };
  });
}


/**
 * 항목 순서 바꾸기: ids 순서대로 order를 다시 매김
 */
export function reorderHabits(ids: string[]) {
  const habits = cloud.getState().habits;
  const pos = new Map(ids.map((id, i) => [id, i]));
  const next = habits.map((h) => (pos.has(h.id) ? { ...h, order: pos.get(h.id)!, updatedAt: Date.now() } : h));
  cloud.setHabits(next);
}
