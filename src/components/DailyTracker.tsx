import React, { useState, useMemo } from 'react';
import { Habit, HabitLog, HabitCategory } from '../types';
import { HabitCard } from './HabitCard';
import { isHabitScheduledOnDate, isHabitStrictlyRequiredOnDay, getHabitWeight, calcGrade } from '../lib/storage';
import {
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  Calendar,
  RotateCcw,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfWeek, endOfWeek, addDays, subDays, addWeeks, subWeeks, getWeekOfMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useLanguage } from '../context/LanguageContext';

interface DailyTrackerProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  habits: Habit[];
  logs: HabitLog[];
  categories: HabitCategory[];
  onToggleHabit: (
    habit: Habit,
    action: 'toggle' | 'increment' | 'decrement',
    targetDate?: Date | string,
    targetSubitem?: string
  ) => void;
  onOpenCreateHabit: () => void;
  onOpenPlanImport: () => void;
  onEditHabit: (habit: Habit) => void;
  onDeleteHabit: (habitId: string) => void;
  onSaveNotes: (habitId: string, notes: string) => void;
  onUpdateHabit?: (habit: Partial<Habit>) => Promise<void> | void;
}

export const DailyTracker: React.FC<DailyTrackerProps> = ({
  selectedDate,
  onSelectDate,
  habits,
  logs,
  categories,
  onToggleHabit,
  onOpenCreateHabit,
  onOpenPlanImport,
  onEditHabit,
  onDeleteHabit,
  onSaveNotes,
  onUpdateHabit,
}) => {
  const { t, isKorean } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>('all');
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState<'all' | 'specific_days' | 'weekly_target' | 'monthly_target'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewScope, setViewScope] = useState<'today_scheduled' | 'all_habits'>('today_scheduled');

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  // Breadcrumb Calculations: Year, Month, Week number
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekNum = getWeekOfMonth(selectedDate, { weekStartsOn: 1 });

  const handlePrevDay = () => onSelectDate(subDays(selectedDate, 1));
  const handleNextDay = () => onSelectDate(addDays(selectedDate, 1));
  const handlePrevWeek = () => onSelectDate(subWeeks(selectedDate, 1));
  const handleNextWeek = () => onSelectDate(addWeeks(selectedDate, 1));
  const handleGoToday = () => onSelectDate(new Date());

  // Filter habits scheduled for this day or all habits
  const scheduledHabits = useMemo(() => {
    if (viewScope === 'all_habits') {
      return habits;
    }
    return habits.filter((h) => isHabitScheduledOnDate(h, selectedDate));
  }, [habits, selectedDate, viewScope]);

  // Create a fast map for today's logs
  const logsMap = useMemo(() => {
    const map = new Map<string, HabitLog>();
    logs.forEach((log) => {
      if (log.date === dateStr) {
        map.set(log.habitId, log);
      }
    });
    return map;
  }, [logs, dateStr]);

  // Filter by category, time of day, frequency type, search query
  const filteredHabits = useMemo(() => {
    return scheduledHabits.filter((h) => {
      if (selectedCategory !== 'all' && h.categoryId !== selectedCategory) {
        return false;
      }
      if (selectedTimeOfDay !== 'all' && h.timeOfDay !== selectedTimeOfDay) {
        return false;
      }
      if (selectedFrequencyFilter !== 'all') {
        const freq = h.frequencyType || 'specific_days';
        if (freq !== selectedFrequencyFilter) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = h.title.toLowerCase().includes(query);
        const matchesDesc = h.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [scheduledHabits, selectedCategory, selectedTimeOfDay, selectedFrequencyFilter, searchQuery]);

  // Completion calculation for today: counts how many scheduled habits were practiced on this date
  const { completedCount, totalCount, completionRate, isAllCompleted } = useMemo(() => {
    // All habits available/scheduled for today
    const activeList = scheduledHabits.length > 0
      ? scheduledHabits
      : habits.filter((h) => !h.archived);

    let completed = 0;
    activeList.forEach((h) => {
      const log = logsMap.get(h.id);
      if (log && log.completed) {
        completed++;
      }
    });

    const total = activeList.length;
    const rate = (total > 0 && completed > 0)
      ? Math.min(100, Math.round((completed / total) * 100))
      : 0;

    return {
      completedCount: completed,
      totalCount: total,
      completionRate: rate,
      isAllCompleted: total > 0 && completed === total,
    };
  }, [scheduledHabits, habits, logsMap]);

  const gradeInfo = calcGrade(completionRate);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Year > Month > Week Breadcrumbs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 sm:px-5 rounded-2xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-2xs font-serif-kr text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[#8A8174]">
            {isKorean ? format(selectedDate, 'yyyy년') : format(selectedDate, 'yyyy')}
          </span>
          <span className="text-[#D4CCA9] dark:text-[#3D3730]">/</span>
          <span className="text-[#8A8174]">
            {isKorean ? format(selectedDate, 'M월') : format(selectedDate, 'MMMM')}
          </span>
          <span className="text-[#D4CCA9] dark:text-[#3D3730]">/</span>
          <span className="font-bold text-[#C23B22] dark:text-[#E0472D]">
            {isKorean
              ? `${weekNum}주차 (${format(weekStart, 'M.d')}~${format(weekEnd, 'M.d')})`
              : `Week ${weekNum} (${format(weekStart, 'M/d')}~${format(weekEnd, 'M/d')})`}
          </span>
          <span className="text-[#D4CCA9] dark:text-[#3D3730]">/</span>
          <span className="font-bold text-[#2C2723] dark:text-[#E6E1DA]">
            {isKorean
              ? format(selectedDate, 'd일 (EEE)', { locale: ko })
              : format(selectedDate, 'MMM d (EEE)')}
          </span>
        </div>

        {/* Date Stepper Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-1 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[#E8E2D5]/60 dark:border-[#2C2824]">
          <button
            onClick={handlePrevWeek}
            className="hidden sm:inline-block px-2 py-1 rounded-lg text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition text-[11px]"
            title={t.prevWeek}
          >
            {t.prevWeek}
          </button>
          <button
            onClick={handlePrevDay}
            className="px-2.5 py-1.5 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition flex items-center gap-1 active:scale-95 text-xs"
            title={t.prevDay}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="sm:hidden">{t.prevDay}</span>
          </button>
          <button
            onClick={handleGoToday}
            className="px-3 py-1.5 rounded-xl bg-[#F3EFE6] dark:bg-[#25221F] text-[#2C2723] dark:text-[#E6E1DA] font-bold text-xs hover:bg-[#E8E2D5] transition active:scale-95"
          >
            {t.today}
          </button>
          <button
            onClick={handleNextDay}
            className="px-2.5 py-1.5 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition flex items-center gap-1 active:scale-95 text-xs"
            title={t.nextDay}
          >
            <span className="sm:hidden">{t.nextDay}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextWeek}
            className="hidden sm:inline-block px-2 py-1 rounded-lg text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition text-[11px]"
            title={t.nextWeek}
          >
            {t.nextWeek}
          </button>
        </div>
      </div>

      {/* Daily Progress Banner Card */}
      <div className="p-6 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap font-serif-kr">
              <span className="text-xs font-bold text-[#C23B22] dark:text-[#E0472D] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {isKorean
                  ? format(selectedDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })
                  : format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </span>

              {/* Today's Seal Count & Grade Badge */}
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg border border-[#C23B22]/30 text-[#C23B22] dark:text-[#E0472D] bg-[#FDF5F2] dark:bg-[#2A1715] flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isKorean ? `오늘 ${completedCount}개 실천` : `${completedCount} Practiced`}</span>
                <span className="font-normal text-[10px] text-[#8A8174]">
                  · {gradeInfo.hanjaGrade} ({completionRate}%)
                </span>
              </span>

              {isAllCompleted && totalCount > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#C23B22] text-white flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3 text-amber-300" /> {isKorean ? '오늘 모든 습관 완료! 💮' : 'All Daily Habits Complete! 💮'}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">
              {totalCount === 0
                ? t.noHabitsTitle
                : isAllCompleted
                ? (isKorean ? `오늘 모든 습관 실천 완료! (${completedCount}개 전부 완료) 💮` : `All ${completedCount} Habits Completed! 💮`)
                : isKorean
                ? `오늘 실천한 습관: ${completedCount}개 완료 (총 ${totalCount}개 중)`
                : `Habits Practiced Today: ${completedCount} completed (of ${totalCount})`}
            </h2>
            <p className="text-xs font-serif-kr text-[#7A7265] dark:text-[#A89F91] mt-1">
              {isAllCompleted
                ? (isKorean ? '오늘 목표한 인장을 모두 정갈하게 찍었습니다. 뿌듯한 마음으로 하루를 마무리해보세요.' : 'All seals engraved for today. Conclude your day with pride.')
                : (isKorean ? `오늘 예정된 ${totalCount}개 습관 중 ${completedCount}개를 실천하셨습니다. (달성률 ${completionRate}%)` : `You have completed ${completedCount} out of ${totalCount} scheduled habits today (${completionRate}%).`)}
            </p>
          </div>

          {/* Quick New Habit Button & View Scope toggle */}
          <div className="flex items-center gap-2 font-serif-kr">
            <div className="flex bg-[#F3EFE6] dark:bg-[#25221F] p-1 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C] text-xs font-semibold">
              <button
                onClick={() => setViewScope('today_scheduled')}
                className={`px-3 py-2 rounded-xl transition ${
                  viewScope === 'today_scheduled'
                    ? 'bg-white dark:bg-[#1A1816] text-[#2C2723] dark:text-[#E6E1DA] shadow-xs'
                    : 'text-[#7A7265] dark:text-[#A89F91] hover:text-[#2C2723] dark:hover:text-[#E6E1DA]'
                }`}
              >
                {isKorean ? '오늘 예정' : 'Today'}
              </button>
              <button
                onClick={() => setViewScope('all_habits')}
                className={`px-3 py-2 rounded-xl transition ${
                  viewScope === 'all_habits'
                    ? 'bg-white dark:bg-[#1A1816] text-[#2C2723] dark:text-[#E6E1DA] shadow-xs'
                    : 'text-[#7A7265] dark:text-[#A89F91] hover:text-[#2C2723] dark:hover:text-[#E6E1DA]'
                }`}
              >
                {isKorean ? `전체 습관 (${habits.length})` : `All (${habits.length})`}
              </button>
            </div>

            <button
              id="plan-import-daily-btn"
              onClick={onOpenPlanImport}
              className="px-3.5 py-2.5 rounded-2xl border border-[#C23B22]/30 bg-[#C23B22]/10 hover:bg-[#C23B22]/20 text-[#C23B22] dark:text-[#E0472D] font-serif-kr font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
              title={t.importPlan}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.importPlan}</span>
            </button>

            <button
              id="create-habit-top-btn"
              onClick={onOpenCreateHabit}
              className="px-4 py-2.5 rounded-2xl bg-[#C23B22] hover:bg-[#A82E18] text-white font-serif-kr font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.habitAddBtn}
            </button>
          </div>
        </div>

        {/* Progress bar and count */}
        {totalCount > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex justify-between items-center text-xs font-serif-kr text-[#7A7265] dark:text-[#A89F91]">
              <span className="flex items-center gap-1.5 font-medium">
                <span>{isKorean ? '오늘 실천 현황:' : 'Practiced Today:'}</span>
                <strong className="text-[#C23B22] dark:text-[#E0472D] font-bold text-sm">
                  {completedCount}개 실천
                </strong>
                <span>/ 총 {totalCount}개 습관</span>
              </span>
              <span className="font-semibold text-[#8A8174]">
                {completionRate}%
              </span>
            </div>
            <div className="w-full bg-[#E8E2D5] dark:bg-[#2C2824] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#E2DBD0] dark:border-[#38332C]">
              <motion.div
                className="h-full bg-[#C23B22] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="space-y-3 font-serif-kr">
        {/* Top search & time of day */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8A8174] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isKorean ? '습관 이름 또는 설명 검색...' : 'Search habits or descriptions...'}
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-[#E8E2D5] dark:border-[#2C2824] bg-[#FCFAF6] dark:bg-[#1A1816] text-[#2C2723] dark:text-[#E6E1DA] text-xs focus:outline-none focus:ring-1 focus:ring-[#C23B22] placeholder-[#8A8174]"
            />
          </div>

          {/* Frequency Type Filter Chips */}
          <div className="flex items-center gap-1 bg-[#FCFAF6] dark:bg-[#1A1816] p-1 rounded-2xl border border-[#E8E2D5] dark:border-[#2C2824] shrink-0 overflow-x-auto">
            {[
              { id: 'all', label: isKorean ? '모든 주기' : 'All Frequencies' },
              { id: 'specific_days', label: isKorean ? '요일 지정' : 'Day-specific', icon: Calendar },
              { id: 'weekly_target', label: isKorean ? '주간 횟수' : 'Weekly Target', icon: RotateCcw },
              { id: 'monthly_target', label: isKorean ? '월간 횟수' : 'Monthly Target', icon: CalendarDays },
            ].map((f) => (
              <button
                key={f.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => setSelectedFrequencyFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 shrink-0 ${
                  selectedFrequencyFilter === f.id
                    ? 'bg-[#2C2723] text-white dark:bg-[#E6E1DA] dark:text-[#121110] shadow-xs'
                    : 'text-[#7A7265] dark:text-[#A89F91] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]'
                }`}
              >
                {f.icon && <f.icon className="w-3 h-3" />}
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Time of Day filters */}
          <div className="flex items-center gap-1 bg-[#FCFAF6] dark:bg-[#1A1816] p-1 rounded-2xl border border-[#E8E2D5] dark:border-[#2C2824] shrink-0 overflow-x-auto">
            {[
              { id: 'all', label: isKorean ? '전체 시간' : 'Anytime' },
              { id: 'morning', label: isKorean ? '아침 🌅' : 'Morning 🌅' },
              { id: 'afternoon', label: isKorean ? '오후 ☀️' : 'Afternoon ☀️' },
              { id: 'evening', label: isKorean ? '저녁 🌙' : 'Evening 🌙' },
            ].map((tItem) => (
              <button
                key={tItem.id}
                onClick={() => setSelectedTimeOfDay(tItem.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                  selectedTimeOfDay === tItem.id
                    ? 'bg-[#2C2723] text-white dark:bg-[#E6E1DA] dark:text-[#121110] shadow-xs'
                    : 'text-[#7A7265] dark:text-[#A89F91] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]'
                }`}
              >
                {tItem.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-[#C23B22] text-white shadow-xs'
                : 'bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] text-[#5C5549] dark:text-[#C5BEB3] hover:border-[#D4CCA9]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {isKorean ? `전체 카테고리 (${scheduledHabits.length})` : `All Categories (${scheduledHabits.length})`}
          </button>

          {categories.map((cat) => {
            const count = scheduledHabits.filter((h) => h.categoryId === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#C23B22] text-white shadow-xs'
                    : 'bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] text-[#5C5549] dark:text-[#C5BEB3] hover:border-[#D4CCA9]'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white font-bold' : 'bg-[#F3EFE6] dark:bg-[#25221F] text-[#8A8174]'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Habits List */}
      {filteredHabits.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824]">
          <div className="w-14 h-14 rounded-2xl bg-[#F3EFE6] dark:bg-[#25221F] text-[#8A8174] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] mb-1">
            {t.noHabitsTitle}
          </h3>
          <p className="text-xs font-serif-kr text-[#7A7265] dark:text-[#A89F91] max-w-sm mx-auto mb-5 leading-relaxed">
            {scheduledHabits.length === 0
              ? (isKorean ? '오늘 요일에는 계획된 습관이 없습니다. [전체 습관]을 보거나 새 습관을 추가해보세요.' : 'No habits scheduled for this day. Switch to [All] or create a new habit.')
              : (isKorean ? '선택한 필터나 검색어에 맞는 습관이 없습니다.' : 'No habits match your active filters or search terms.')}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={onOpenPlanImport}
              className="px-4 py-2.5 rounded-xl border border-[#C23B22]/40 bg-[#C23B22]/10 hover:bg-[#C23B22]/20 text-[#C23B22] dark:text-[#E0472D] text-xs font-serif-kr font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {t.importPlan}
            </button>
            <button
              onClick={onOpenCreateHabit}
              className="px-5 py-2.5 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] text-white text-xs font-serif-kr font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.habitAddBtn}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredHabits.map((habit) => {
              const category = categories.find((c) => c.id === habit.categoryId);
              const log = logsMap.get(habit.id);
              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  category={category}
                  log={log}
                  allLogs={logs}
                  selectedDate={selectedDate}
                  onToggle={onToggleHabit}
                  onEdit={onEditHabit}
                  onDelete={onDeleteHabit}
                  onSaveNotes={onSaveNotes}
                  onSelectDate={onSelectDate}
                  onUpdateHabit={onUpdateHabit}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
