import React, { useState, useMemo, useEffect } from 'react';
import { Habit, HabitLog, HabitCategory } from '../types';
import { getWeeklyIntervalStats, isHabitScheduledOnDate } from '../lib/storage';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Award,
  Calendar,
  CheckCircle2,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowRight,
  MousePointerClick,
} from 'lucide-react';
import { addWeeks, format, subDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface WeeklyInsightsProps {
  habits: Habit[];
  logs: HabitLog[];
  categories: HabitCategory[];
  currentStreak: number;
  longestStreak: number;
  onSelectDate?: (date: Date) => void;
}

const PIE_COLORS = ['#C23B22', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

export const WeeklyInsights: React.FC<WeeklyInsightsProps> = ({
  habits,
  logs,
  categories,
  currentStreak,
  longestStreak,
  onSelectDate,
}) => {
  const { isKorean } = useLanguage();
  const [weekOffset, setWeekOffset] = useState(0);

  // Compute reference date based on week offset
  const referenceDate = useMemo(() => {
    return weekOffset === 0 ? new Date() : addWeeks(new Date(), weekOffset);
  }, [weekOffset]);

  const weeklyData = useMemo(() => {
    return getWeeklyIntervalStats(habits, logs, referenceDate);
  }, [habits, logs, referenceDate]);

  // Selected date for detailed breakdown (defaults to today if in current week, else first day of week)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const hasToday = weeklyData.dailyStats.some((d) => d.date === todayStr);
    return hasToday ? todayStr : weeklyData.dailyStats[0]?.date || todayStr;
  });

  // Keep selectedDateStr within the active week if weekOffset changes
  useEffect(() => {
    const datesInWeek = weeklyData.dailyStats.map((d) => d.date);
    if (!datesInWeek.includes(selectedDateStr)) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      if (datesInWeek.includes(todayStr)) {
        setSelectedDateStr(todayStr);
      } else {
        setSelectedDateStr(datesInWeek[0]);
      }
    }
  }, [weeklyData, selectedDateStr]);

  // Map of completed habits by date for quick lookup
  const dayCompletedHabitsMap = useMemo(() => {
    const map = new Map<string, { habit: Habit; log: HabitLog; category?: HabitCategory }[]>();
    logs.forEach((log) => {
      if (log.completed) {
        const habit = habits.find((h) => h.id === log.habitId);
        if (habit) {
          const category = categories.find((c) => c.id === habit.categoryId);
          const list = map.get(log.date) || [];
          list.push({ habit, log, category });
          map.set(log.date, list);
        }
      }
    });
    return map;
  }, [habits, logs, categories]);

  // Current selected day info
  const selectedDayStat = useMemo(() => {
    return weeklyData.dailyStats.find((d) => d.date === selectedDateStr) || weeklyData.dailyStats[0];
  }, [weeklyData, selectedDateStr]);

  const selectedDayCompletedList = useMemo(() => {
    if (!selectedDayStat) return [];
    return dayCompletedHabitsMap.get(selectedDayStat.date) || [];
  }, [selectedDayStat, dayCompletedHabitsMap]);

  // Category completion statistics (count of practices)
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((log) => {
      if (log.completed) {
        const habit = habits.find((h) => h.id === log.habitId);
        if (habit) {
          const catId = habit.categoryId || 'health';
          map.set(catId, (map.get(catId) || 0) + 1);
        }
      }
    });

    const result = categories
      .map((cat) => ({
        name: cat.name,
        value: map.get(cat.id) || 0,
        color: cat.color,
      }))
      .filter((item) => item.value > 0);

    return result.length > 0 ? result : [{ name: isKorean ? '기본 습관' : 'General', value: 1, color: 'emerald' }];
  }, [habits, logs, categories, isKorean]);

  // 28-day Heatmap Matrix (4 weeks) - counts only, no percentages
  const heatmapData = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 27);
    const days = eachDayOfInterval({ start, end });

    const logsByDate = new Map<string, HabitLog[]>();
    logs.forEach((l) => {
      const list = logsByDate.get(l.date) || [];
      list.push(l);
      logsByDate.set(l.date, list);
    });

    return days.map((d) => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayLogs = logsByDate.get(dateStr) || [];

      const scheduledToday = habits.filter((h) => !h.archived && isHabitScheduledOnDate(h, d));
      const activeHabits = scheduledToday.length > 0 ? scheduledToday : habits.filter((h) => !h.archived);

      let completedCount = 0;
      activeHabits.forEach((h) => {
        const isDone = dayLogs.some((l) => l.habitId === h.id && l.completed);
        if (isDone) {
          completedCount++;
        }
      });

      let level = 0;
      if (completedCount >= 5) level = 4;
      else if (completedCount >= 3) level = 3;
      else if (completedCount >= 2) level = 2;
      else if (completedCount >= 1) level = 1;

      return {
        dateObj: d,
        date: dateStr,
        dayNumber: format(d, 'd'),
        dayName: format(d, 'EEE', { locale: ko }),
        completedCount,
        level,
      };
    });
  }, [habits, logs]);

  // Most consistent habit
  const topHabit = useMemo(() => {
    if (habits.length === 0) return null;
    const habitCompletedCountMap = new Map<string, number>();
    logs.forEach((l) => {
      if (l.completed) {
        habitCompletedCountMap.set(l.habitId, (habitCompletedCountMap.get(l.habitId) || 0) + 1);
      }
    });

    let bestHabit = habits[0];
    let maxCount = -1;

    habits.forEach((h) => {
      const count = habitCompletedCountMap.get(h.id) || 0;
      if (count > maxCount) {
        maxCount = count;
        bestHabit = h;
      }
    });

    return { habit: bestHabit, count: maxCount > 0 ? maxCount : 0 };
  }, [habits, logs]);

  // Smart weekly evaluation message based entirely on completed count (NO percentage)
  const smartSummaryMessage = useMemo(() => {
    const count = weeklyData.totalCompleted;
    if (count === 0) {
      return {
        tag: isKorean ? '새로운 시작 💡' : 'Fresh Start 💡',
        text: isKorean
          ? '이번 주 아직 찍힌 실천 도장이 없습니다. 오늘 가벼운 습관 하나부터 도장을 꾹 찍어보세요!'
          : 'No habit stamps recorded yet this week. Stamp your first habit today!',
        badgeColor: 'bg-slate-700 text-white',
      };
    } else if (count >= 25) {
      return {
        tag: isKorean ? '최고의 실천 주간 🏆' : 'Outstanding Week 🏆',
        text: isKorean
          ? `이번 주 총 ${count}개의 습관 도장을 찍으셨습니다! 엄청난 몰입과 지속력으로 매일 훌륭한 성과를 쌓고 계십니다.`
          : `You have completed ${count} habit stamps this week! Outstanding dedication and consistency.`,
        badgeColor: 'bg-[#C23B22] text-white',
      };
    } else if (count >= 15) {
      return {
        tag: isKorean ? '활기찬 실천력 🚀' : 'Strong Momentum 🚀',
        text: isKorean
          ? `이번 주 총 ${count}개의 습관을 실천하셨습니다! 탄탄한 생활 리듬이 정착되어가고 있습니다.`
          : `You have completed ${count} habits this week! A consistent and healthy daily rhythm is taking shape.`,
        badgeColor: 'bg-emerald-600 text-white',
      };
    } else if (count >= 7) {
      return {
        tag: isKorean ? '꾸준한 발걸음 🌱' : 'Steady Progress 🌱',
        text: isKorean
          ? `이번 주 총 ${count}개의 습관을 실천하셨습니다! 매일 하루 하나 이상의 인장을 정갈하게 이어가고 있습니다.`
          : `You have completed ${count} habits this week! Continuing to build habits step by step.`,
        badgeColor: 'bg-amber-600 text-white',
      };
    } else {
      return {
        tag: isKorean ? '소중한 발걸음 ✨' : 'Valuable Steps ✨',
        text: isKorean
          ? `이번 주 총 ${count}개의 습관을 실천하셨습니다. 완벽함보다 지속이 중요하니 가벼운 마음으로 이어가보세요.`
          : `You have completed ${count} habits this week. Keep up the momentum!`,
        badgeColor: 'bg-slate-700 text-white',
      };
    }
  }, [weeklyData.totalCompleted, isKorean]);

  // Max habits completed in any single day this week (for scaling blocks)
  const maxDayCompleted = useMemo(() => {
    return Math.max(4, ...weeklyData.dailyStats.map((d) => d.completedHabits));
  }, [weeklyData]);

  return (
    <div className="space-y-6 pb-12 font-sans font-serif-kr">
      {/* Top Overview Cards - strictly counts, no percentages */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Weekly Completed Habits Count */}
        <div className="p-4 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs">
          <div className="flex items-center justify-between text-[#8A8174] text-xs font-semibold mb-1">
            <span>{isKorean ? '주간 실천 도장 수' : 'Weekly Habits Stamped'}</span>
            <CheckCircle2 className="w-4 h-4 text-[#C23B22]" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">
            {weeklyData.totalCompleted}개
          </div>
          <div className="text-[11px] text-[#C23B22] font-medium mt-1">
            {isKorean ? `이번 주 총 ${weeklyData.totalCompleted}개 습관 완료` : `Total ${weeklyData.totalCompleted} habits completed`}
          </div>
        </div>

        {/* Current Streak */}
        <div className="p-4 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs">
          <div className="flex items-center justify-between text-[#8A8174] text-xs font-semibold mb-1">
            <span>{isKorean ? '연속 달성' : 'Current Streak'}</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-batang text-amber-600 dark:text-amber-400">
            {currentStreak}일
          </div>
          <div className="text-[11px] text-[#8A8174] mt-1">
            {isKorean ? `최고 기록: ${longestStreak}일` : `Best: ${longestStreak} days`}
          </div>
        </div>

        {/* Total Habits Active */}
        <div className="p-4 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs">
          <div className="flex items-center justify-between text-[#8A8174] text-xs font-semibold mb-1">
            <span>{isKorean ? '등록된 습관' : 'Active Habits'}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">
            {habits.length}개
          </div>
          <div className="text-[11px] text-[#8A8174] mt-1">
            {categories.length}개 {isKorean ? '카테고리' : 'categories'}
          </div>
        </div>

        {/* Top Habit */}
        <div className="p-4 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs">
          <div className="flex items-center justify-between text-[#8A8174] text-xs font-semibold mb-1">
            <span>{isKorean ? '최다 실천 습관' : 'Most Practiced'}</span>
            <Award className="w-4 h-4 text-[#C23B22]" />
          </div>
          <div className="text-base sm:text-lg font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] truncate mt-1">
            {topHabit?.habit.title || (isKorean ? '습관 없음' : 'None')}
          </div>
          <div className="text-[11px] text-[#C23B22] font-medium mt-1">
            {isKorean ? `누적 ${topHabit?.count || 0}회 도장 완료` : `Total ${topHabit?.count || 0} completions`}
          </div>
        </div>
      </div>

      {/* Weekly Evaluation Message */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#F8F4EC] dark:bg-[#23201D] border border-[#E8E2D5] dark:border-[#2C2824] relative overflow-hidden shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#C23B22] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${smartSummaryMessage.badgeColor}`}>
                {smartSummaryMessage.tag}
              </span>
              <span className="text-xs text-[#7A7265] dark:text-[#A89F91]">
                {weeklyData.startDate} ~ {weeklyData.endDate} {isKorean ? '주간 실천 성적표' : 'Weekly Report'}
              </span>
            </div>
            <p className="text-sm font-medium text-[#2C2723] dark:text-[#E6E1DA] leading-relaxed">
              {smartSummaryMessage.text}
            </p>
          </div>
        </div>
      </div>

      {/* Discrete Block-Style Weekly Habits Bar Chart ("칸별 막대그래프") */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C23B22]" />
              {isKorean ? '요일별 실천 습관 수 (칸별 막대 그래프)' : 'Habits Completed by Day'}
            </h3>
            <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>
                {isKorean
                  ? `기간: ${weeklyData.startDate} ~ ${weeklyData.endDate} · 달성한 습관 개수만큼 1칸씩 쌓입니다`
                  : `Period: ${weeklyData.startDate} ~ ${weeklyData.endDate} · 1 block per completed habit`}
              </span>
              <span className="inline-flex items-center gap-1 text-[#C23B22] dark:text-[#E0472D] font-medium">
                <MousePointerClick className="w-3.5 h-3.5" />
                {isKorean ? '막대를 클릭하여 상세 습관 확인' : 'Click a bar to view habit details'}
              </span>
            </p>
          </div>

          {/* Week offset controls */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#F3EFE6] dark:bg-[#25221F] p-1.5 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C]">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-[#5C5549] dark:text-[#D4CEC3] hover:bg-white dark:hover:bg-[#302B26] transition flex items-center gap-1 cursor-pointer"
              title={isKorean ? '이전 주 결과 보기' : 'Previous Week'}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {isKorean ? '이전 주' : 'Prev'}
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                weekOffset === 0
                  ? 'bg-[#C23B22] text-white shadow-2xs'
                  : 'text-[#2C2723] dark:text-[#E6E1DA] hover:bg-white dark:hover:bg-[#302B26]'
              }`}
              title={isKorean ? '현재 주로 돌아가기' : 'This Week'}
            >
              {isKorean ? '이번 주' : 'Current'}
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-[#5C5549] dark:text-[#D4CEC3] hover:bg-white dark:hover:bg-[#302B26] transition flex items-center gap-1 cursor-pointer"
              title={isKorean ? '다음 주 결과 보기' : 'Next Week'}
            >
              {isKorean ? '다음 주' : 'Next'}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Discrete Stacked Blocks Visualization (월요일 1칸, 화요일 3칸 형태) */}
        <div className="mt-4 bg-[#F8F5EE] dark:bg-[#1E1B18] p-4 sm:p-6 rounded-2xl border border-[#E8E2D5] dark:border-[#2C2824]">
          {/* Legend / Info bar */}
          <div className="flex items-center justify-between text-xs text-[#8A8174] mb-4 pb-2 border-b border-[#E2DBD0] dark:border-[#2F2B26]">
            <span className="font-medium">
              {isKorean ? '1칸 = 실천한 습관 1개' : '1 Block = 1 Practiced Habit'}
            </span>
            <span className="text-[11px]">
              {isKorean ? '요일 막대를 클릭하면 아래에 실천 목록이 열립니다' : 'Click any day to view habit details below'}
            </span>
          </div>

          {/* 7 Days Columns Grid */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3.5 items-end min-h-[220px] sm:min-h-[260px] pt-4 pb-2">
            {weeklyData.dailyStats.map((dayStat) => {
              const isSelected = selectedDateStr === dayStat.date;
              const isToday = isSameDay(dayStat.dateObj, new Date());
              const count = dayStat.completedHabits;
              const dayHabits = dayCompletedHabitsMap.get(dayStat.date) || [];

              return (
                <div
                  key={dayStat.date}
                  onClick={() => setSelectedDateStr(dayStat.date)}
                  className={`flex flex-col items-center justify-end h-full p-1.5 sm:p-2.5 rounded-2xl cursor-pointer transition-all duration-200 group relative ${
                    isSelected
                      ? 'bg-white dark:bg-[#282420] ring-2 ring-[#C23B22] shadow-md -translate-y-1'
                      : 'hover:bg-white/60 dark:hover:bg-[#25221F] hover:-translate-y-0.5'
                  }`}
                >
                  {/* Top count indicator */}
                  <div className="mb-2 text-center">
                    <span
                      className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-bold transition ${
                        count > 0
                          ? isSelected
                            ? 'bg-[#C23B22] text-white'
                            : 'bg-[#F2EBE0] dark:bg-[#322D28] text-[#C23B22] dark:text-[#E0472D]'
                          : 'text-[#A89F91] text-[11px]'
                      }`}
                    >
                      {count}{isKorean ? '개' : ''}
                    </span>
                  </div>

                  {/* Vertical stack of discrete blocks ("칸") */}
                  <div className="w-full flex flex-col-reverse gap-1.5 items-center justify-start flex-1 min-h-[110px] sm:min-h-[140px]">
                    {count === 0 ? (
                      /* 0 completed: Empty slot */
                      <div className="w-full h-8 sm:h-9 rounded-lg border border-dashed border-[#DDD7CD] dark:border-[#38332C] bg-white/40 dark:bg-black/10 flex items-center justify-center text-[10px] text-[#A89F91]">
                        <span>0칸</span>
                      </div>
                    ) : (
                      /* N completed: N distinct blocks stacked */
                      dayHabits.map((item, idx) => (
                        <motion.div
                          key={item.habit.id + '-' + idx}
                          initial={{ scale: 0.85, opacity: 0, y: 10 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.2 }}
                          className={`w-full h-8 sm:h-9 rounded-lg flex items-center justify-center text-white shadow-2xs transition-all duration-150 relative overflow-hidden px-1 ${
                            isSelected
                              ? 'bg-[#C23B22] ring-1 ring-[#9E2510]'
                              : 'bg-[#D4432A] dark:bg-[#C23B22] group-hover:brightness-105'
                          }`}
                          title={`${item.habit.title} (${isKorean ? '도장 완료' : 'Completed'})`}
                        >
                          {/* Block content: seal mark & short title */}
                          <div className="flex items-center gap-1 max-w-full truncate">
                            <span className="text-[10px] sm:text-[11px] font-bold text-amber-200 shrink-0">
                              💮
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-medium font-serif-kr truncate hidden sm:inline">
                              {item.habit.title}
                            </span>
                            <span className="text-[10px] font-bold sm:hidden">
                              {idx + 1}칸
                            </span>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Day Label at bottom */}
                  <div className="mt-2.5 pt-2 border-t border-[#E8E2D5] dark:border-[#2C2824] w-full text-center">
                    <div
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-[#C23B22] dark:text-[#E0472D]'
                          : isToday
                          ? 'text-[#2C2723] dark:text-[#E6E1DA]'
                          : 'text-[#5C5549] dark:text-[#D4CEC3]'
                      }`}
                    >
                      {dayStat.dayLabel}
                    </div>
                    <div className="text-[10px] text-[#8A8174]">
                      {format(dayStat.dateObj, 'M.d')}
                    </div>

                    {/* Active day indicator pill */}
                    {isSelected && (
                      <div className="mt-1 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-white bg-[#C23B22] px-1.5 py-0.2 rounded-full shadow-2xs">
                          {isKorean ? '선택됨' : 'Selected'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Breakdown for the Selected Day ("막대를 클릭하면 어떤 습관 몇개를 달성했는지 확인") */}
        <AnimatePresence mode="wait">
          {selectedDayStat && (
            <motion.div
              key={selectedDayStat.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-6 p-5 sm:p-6 rounded-2xl bg-[#F8F5EE] dark:bg-[#1E1B18] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs"
            >
              {/* Header of details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#E2DBD0] dark:border-[#2F2B26]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base font-batang text-[#2C2723] dark:text-[#E6E1DA]">
                    {selectedDayStat.fullDate} {isKorean ? '실천한 습관' : 'Practiced Habits'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C23B22] text-white text-xs font-bold shadow-2xs">
                    {isKorean ? `총 ${selectedDayCompletedList.length}개 달성` : `Total ${selectedDayCompletedList.length} Completed`}
                  </span>
                </div>

                {onSelectDate && (
                  <button
                    onClick={() => onSelectDate(selectedDayStat.dateObj)}
                    className="self-start sm:self-auto text-xs text-[#C23B22] dark:text-[#E0472D] hover:underline flex items-center gap-1 font-semibold cursor-pointer py-1"
                  >
                    <span>{isKorean ? '이 날짜 일일 트래커로 이동하기' : 'Go to Daily Tracker'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Habit Cards List */}
              {selectedDayCompletedList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedDayCompletedList.map(({ habit, log, category }) => {
                    const sealText = habit.stampText || '完';
                    const categoryName = category?.name || (isKorean ? '일반' : 'General');
                    const note = log.notes;
                    const subitems = log.subitem ? [log.subitem] : [];

                    return (
                      <div
                        key={habit.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-[#26221E] border border-[#E8E2D5] dark:border-[#38322B] shadow-2xs flex items-start justify-between gap-2.5 transition hover:shadow-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F2EBE0] dark:bg-[#322D28] text-[#7A7265] dark:text-[#BDB4A6]">
                              {categoryName}
                            </span>
                            {habit.timeOfDay && (
                              <span className="text-[10px] text-[#8A8174]">
                                · {habit.timeOfDay === 'morning' ? '아침' : habit.timeOfDay === 'afternoon' ? '오후' : '저녁'}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-[#2C2723] dark:text-[#E6E1DA] truncate">
                            {habit.title}
                          </h4>

                          {note && (
                            <p className="text-[11px] text-[#7A7265] dark:text-[#A89F91] mt-1 line-clamp-1 italic">
                              "{note}"
                            </p>
                          )}

                          {subitems.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {subitems.map((sub, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-[#F8F5EE] dark:bg-[#1E1B18] text-[#5C5549] dark:text-[#D4CEC3] border border-[#E8E2D5] dark:border-[#2C2824]"
                                >
                                  ✓ {sub}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Traditional Seal Stamp Badge */}
                        <div className="w-9 h-9 rounded-lg border-2 border-[#C23B22] text-[#C23B22] bg-[#FDF5F2] dark:bg-[#2A1715] flex flex-col items-center justify-center shrink-0 shadow-2xs font-batang font-bold">
                          <span className="text-[11px] leading-none">{sealText}</span>
                          <span className="text-[7px] text-[#C23B22]/70 leading-none mt-0.5">인장</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-white/50 dark:bg-black/10 rounded-xl border border-dashed border-[#DDD7CD] dark:border-[#38332C]">
                  <p className="text-sm font-medium text-[#7A7265] dark:text-[#A89F91]">
                    {isKorean
                      ? `이날(${selectedDayStat.dayLabel}요일)은 실천한 습관이 없습니다 (0칸).`
                      : `No habits were completed on this day (0 blocks).`}
                  </p>
                  <p className="text-xs text-[#8A8174] mt-1">
                    {isKorean
                      ? '다른 요일 막대를 클릭하거나, 아래 버튼을 눌러 이 날짜의 도장을 찍어보세요.'
                      : 'Click other day bars or tap below to stamp habits for this date.'}
                  </p>
                  {onSelectDate && (
                    <button
                      onClick={() => onSelectDate(selectedDayStat.dateObj)}
                      className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C23B22] text-white text-xs font-bold shadow-2xs hover:bg-[#A82E18] transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isKorean ? '이 날짜로 이동하여 도장 찍기' : 'Stamp Habits for this Day'}</span>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Grid of Category Breakdown & Consistency Heatmap (Strictly Counts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="p-6 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] flex items-center gap-2 mb-1">
              <Zap className="w-5 h-5 text-[#C23B22]" />
              {isKorean ? '카테고리별 실천 분포' : 'Completions by Category'}
            </h3>
            <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mb-4">
              {isKorean ? '어떤 영역에 가장 많은 습관 실천 도장을 찍었는지 확인하세요' : 'Distribution of habit completions across categories'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 my-2">
            <div className="w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                  >
                    {categoryStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 flex-1 max-w-xs">
              {categoryStats.map((cat, idx) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="font-semibold text-[#2C2723] dark:text-[#E6E1DA]">
                      {cat.name}
                    </span>
                  </div>
                  <span className="font-bold text-[#C23B22]">
                    {cat.value}회
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 28-Day Consistency Heatmap Grid (Count of completed habits, NO %) */}
        <div className="p-6 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {isKorean ? '최근 4주 실천 히트맵' : 'Recent 4-Week Heatmap'}
            </h3>
            <span className="text-[11px] text-[#8A8174]">{isKorean ? '최근 28일' : 'Last 28 Days'}</span>
          </div>
          <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mb-5">
            {isKorean
              ? '날짜를 클릭하면 해당 일자의 습관 도장 화면으로 바로 이동합니다'
              : 'Click any date to navigate to that daily tracker'}
          </p>

          <div className="grid grid-cols-7 gap-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-center text-[11px] font-bold text-[#8A8174]">
                {day}
              </div>
            ))}

            {heatmapData.map((d) => {
              const bgColors = [
                'bg-[#F3EFE6] dark:bg-[#25221F] text-[#8A8174] border-transparent', // 0
                'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300', // 1
                'bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-100 border-amber-400', // 2
                'bg-emerald-500 text-white font-bold shadow-2xs border-emerald-600', // 3
                'bg-[#C23B22] text-white font-bold ring-2 ring-[#C23B22]/40 shadow-xs border-[#A82E18]', // 4
              ];

              return (
                <button
                  key={d.date}
                  onClick={() => onSelectDate && onSelectDate(d.dateObj)}
                  className={`h-11 rounded-xl flex flex-col items-center justify-center p-1 cursor-pointer transition hover:scale-105 border ${bgColors[d.level]}`}
                  title={`${d.date} (${d.dayName}): ${d.completedCount}개 실천 달성 - 클릭하여 이동`}
                >
                  <span className="text-[11px] font-bold">{d.dayNumber}</span>
                  {d.completedCount > 0 && (
                    <span className="text-[9px] opacity-90 font-semibold">{d.completedCount}개</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 mt-4 text-[11px] text-[#8A8174]">
            <span>{isKorean ? '0개' : '0'}</span>
            <span className="w-3 h-3 rounded bg-[#F3EFE6] dark:bg-[#25221F]" />
            <span className="w-3 h-3 rounded bg-amber-100" />
            <span className="w-3 h-3 rounded bg-amber-200" />
            <span className="w-3 h-3 rounded bg-emerald-500" />
            <span className="w-3 h-3 rounded bg-[#C23B22]" />
            <span>{isKorean ? '5개+' : '5+'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
