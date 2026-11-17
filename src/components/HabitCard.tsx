import React, { useState } from 'react';
import { Habit, HabitLog, HabitCategory, DayOfWeek } from '../types';
import { DynamicIcon } from './DynamicIcon';
import { StampSeal } from './StampSeal';
import { getCategoryStyle } from '../lib/categories';
import { playCompletionSound } from '../lib/notifications';
import { formatHabitFrequencyBadge, getHabitWeekProgress, getHabitMonthProgress, getHabitImportanceInfo } from '../lib/storage';
import confetti from 'canvas-confetti';
import {
  Check,
  Plus,
  Minus,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Save,
  Calendar,
  RotateCcw,
  CalendarDays,
  Sparkles,
  Layers,
  Tag,
  SlidersHorizontal,
  Star,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface HabitCardProps {
  habit: Habit;
  category?: HabitCategory;
  log?: HabitLog;
  allLogs?: HabitLog[];
  selectedDate?: Date;
  onToggle: (
    habit: Habit,
    action: 'toggle' | 'increment' | 'decrement',
    targetDate?: Date | string,
    targetSubitem?: string
  ) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  onSaveNotes: (habitId: string, notes: string) => void;
  onSelectDate?: (date: Date) => void;
  onUpdateHabit?: (habit: Partial<Habit>) => Promise<void> | void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  category,
  log,
  allLogs = [],
  selectedDate = new Date(),
  onToggle,
  onEdit,
  onDelete,
  onSaveNotes,
  onSelectDate,
  onUpdateHabit,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subModalEnabled, setSubModalEnabled] = useState(false);
  const [subModalItems, setSubModalItems] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState('');
  const [isSavingSubModal, setIsSavingSubModal] = useState(false);
  const [notesText, setNotesText] = useState(log?.notes || '');

  const isCompleted = log?.completed || false;
  const currentCount = log?.currentCount || 0;
  const targetCount = habit.targetCount || 1;
  const progressPercent = Math.min(100, Math.round((currentCount / targetCount) * 100));

  const colorStyle = getCategoryStyle(habit.color || category?.color || 'emerald');

  // Subcategories
  const subcategories = habit.subcategories && habit.subcategories.length > 0 ? habit.subcategories : null;

  // Weekly & Monthly Progress calculations
  const weekProgress = habit.frequencyType === 'weekly_target'
    ? getHabitWeekProgress(habit, allLogs, selectedDate)
    : null;
    
  const monthProgress = habit.frequencyType === 'monthly_target'
    ? getHabitMonthProgress(habit, allLogs, selectedDate)
    : null;

  // 7-day week mini stamps array for the current week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Mon
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(weekStart, i));

  const handleToggleClick = (action: 'toggle' | 'increment' | 'decrement' = 'toggle') => {
    const willBeCompleted = action === 'toggle' ? !isCompleted : (currentCount + 1 >= targetCount);
    
    if (willBeCompleted && !isCompleted) {
      playCompletionSound();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.75 },
          colors: ['#C23B22', '#E0472D', '#D4AF37', '#10B981', '#3B82F6'],
        });
      } catch {
        // Fallback
      }
    }
    
    onToggle(habit, action, selectedDate);
  };

  const handleSelectSubitem = (subitem: string) => {
    const willBeCompleted = !(isCompleted && log?.subitem === subitem);
    if (willBeCompleted) {
      playCompletionSound();
      try {
        confetti({
          particleCount: 35,
          spread: 55,
          origin: { y: 0.75 },
          colors: ['#C23B22', '#E0472D', '#D4AF37', '#10B981'],
        });
      } catch {
        // Fallback
      }
    }
    onToggle(habit, 'toggle', selectedDate, subitem);
  };

  // Helper to reliably find log for day without duplicate confusion
  const getLogForDay = (targetDayStr: string) => {
    const matches = allLogs.filter((l) => l.habitId === habit.id && l.date === targetDayStr);
    if (matches.length === 0) return undefined;
    return matches.find((l) => l.id === `${targetDayStr}_${habit.id}`) || matches[matches.length - 1];
  };

  // Toggle stamp on a specific date (via direct click on mini stamp box)
  const handleToggleDayStamp = (day: Date, e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLog = getLogForDay(dayStr);
    const willBeCompleted = !dayLog?.completed;

    if (willBeCompleted) {
      playCompletionSound();
      try {
        confetti({
          particleCount: 35,
          spread: 55,
          origin: { y: 0.75 },
          colors: ['#C23B22', '#E0472D', '#D4AF37', '#10B981'],
        });
      } catch {}
    }

    onToggle(habit, 'toggle', dayStr);
  };

  const handleSaveNotes = () => {
    onSaveNotes(habit.id, notesText);
    setShowNotesModal(false);
  };

  const handleOpenSubModal = () => {
    const hasSubs = !!(habit.subcategories && habit.subcategories.length > 0);
    setSubModalEnabled(hasSubs);
    if (hasSubs) {
      setSubModalItems([...habit.subcategories!]);
    } else {
      if (habit.categoryId === 'health' || habit.title.includes('운동') || habit.title.includes('헬스')) {
        setSubModalItems(['상체', '하체', '유산소']);
      } else if (habit.categoryId === 'learning' || habit.title.includes('공부') || habit.title.includes('독서')) {
        setSubModalItems(['이론학습', '실습과제', '복습정리']);
      } else {
        setSubModalItems(['1단계', '2단계', '3단계']);
      }
    }
    setNewSubInput('');
    setShowSubModal(true);
  };

  const handleSaveSubModal = async () => {
    setIsSavingSubModal(true);
    try {
      const finalItems = subModalEnabled
        ? subModalItems.map((s) => s.trim()).filter((s) => s.length > 0)
        : [];
      if (onUpdateHabit) {
        await onUpdateHabit({
          ...habit,
          subcategories: finalItems,
        });
      } else {
        onEdit({
          ...habit,
          subcategories: finalItems,
        });
      }
      setShowSubModal(false);
    } catch (err) {
      console.error('Failed to update subcategories', err);
    } finally {
      setIsSavingSubModal(false);
    }
  };

  const frequencyLabel = formatHabitFrequencyBadge(habit);
  const importanceInfo = getHabitImportanceInfo(habit);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`relative group rounded-3xl border transition-all duration-200 overflow-hidden font-sans ${
        isCompleted
          ? 'bg-[#FBF7F0] dark:bg-[#1E1B18] border-[#C23B22]/30 shadow-xs'
          : 'bg-[#FCFAF6] dark:bg-[#1A1816] border-[#E8E2D5] dark:border-[#2C2824] shadow-xs hover:border-[#D4CCA9] dark:hover:border-[#3D3730]'
      }`}
    >
      {/* Top progress bar for multi-count habit */}
      {targetCount > 1 && (
        <div className="w-full bg-[#E8E2D5] dark:bg-[#2C2824] h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-[#C23B22]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      <div className="p-3.5 sm:p-5 relative">
        {/* Top-Right Absolute Options Menu (Kept separate from Stamp Seal to avoid mis-clicks) */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-[#8A8174] hover:text-[#2C2723] dark:hover:text-[#E6E1DA] rounded-lg hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition"
            title="습관 옵션"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-36 bg-[#FCFAF6] dark:bg-[#1A1816] rounded-2xl shadow-xl border border-[#E8E2D5] dark:border-[#2C2824] py-1 z-40 text-xs font-serif-kr">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowNotesModal(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#5C5549] dark:text-[#D4CEC3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]"
                >
                  <FileText className="w-3.5 h-3.5 text-[#8A8174]" />
                  {log?.notes ? '메모 수정' : '오늘의 메모'}
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleOpenSubModal();
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#5C5549] dark:text-[#D4CEC3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]"
                >
                  <Tag className="w-3.5 h-3.5 text-[#C23B22]" />
                  {subcategories && subcategories.length > 0 ? '세부습관 관리·수정' : '세부습관 켜기·설정'}
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(habit);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#5C5549] dark:text-[#D4CEC3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#8A8174]" />
                  습관 수정
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  습관 삭제
                </button>
              </div>
            </>
          )}
        </div>

        {/* Main Card Content Row */}
        <div className="flex items-start justify-between gap-3">
          {/* Icon & Title info */}
          <div className="flex items-start gap-2.5 sm:gap-3.5 flex-1 min-w-0 pr-6 sm:pr-0">
            {/* Category Icon */}
            <div
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                isCompleted
                  ? 'bg-[#C23B22]/10 text-[#C23B22] border border-[#C23B22]/30'
                  : 'bg-[#F3EFE6] dark:bg-[#25221F] text-[#5C5549] dark:text-[#C5BEB3] border border-[#E2DBD0] dark:border-[#38332C]'
              }`}
            >
              <DynamicIcon name={habit.icon || category?.icon || 'Activity'} className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mb-1">
                {/* Category badge */}
                <span
                  className="text-[10px] sm:text-[11px] font-serif-kr font-semibold px-2 py-0.5 rounded-full bg-[#F3EFE6] dark:bg-[#25221F] text-[#5C5549] dark:text-[#C5BEB3] border border-[#E2DBD0] dark:border-[#38332C]"
                >
                  {category?.name || '일반'}
                </span>

                {/* Frequency badge */}
                <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-serif-kr font-medium px-2 py-0.5 rounded-full ${
                  habit.frequencyType === 'weekly_target'
                    ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                    : habit.frequencyType === 'monthly_target'
                    ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                    : 'bg-[#F3EFE6] dark:bg-[#25221F] text-[#7A7265] dark:text-[#A89F91]'
                }`}>
                  {habit.frequencyType === 'weekly_target' ? (
                    <RotateCcw className="w-2.5 h-2.5 text-indigo-400" />
                  ) : habit.frequencyType === 'monthly_target' ? (
                    <CalendarDays className="w-2.5 h-2.5 text-purple-400" />
                  ) : (
                    <Calendar className="w-2.5 h-2.5 text-[#8A8174]" />
                  )}
                  {frequencyLabel}
                </span>

                {/* Importance badge */}
                <span
                  title={`습관 중요도: ${importanceInfo.label} (${importanceInfo.weight}x 성취 가중치)`}
                  className={`inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-[11px] font-serif-kr font-medium px-1.5 sm:px-2 py-0.5 rounded-full border ${importanceInfo.badgeColor}`}
                >
                  <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                  <span>{importanceInfo.label} {importanceInfo.weight}x</span>
                </span>

                {/* Reminder time badge */}
                {habit.reminderEnabled && habit.reminderTime && (
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-[#7A7265] dark:text-[#A89F91] bg-[#F3EFE6] dark:bg-[#25221F] px-1.5 sm:px-2 py-0.5 rounded-full">
                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#8A8174]" />
                    {habit.reminderTime}
                  </span>
                )}
              </div>

              {/* Habit Title */}
              <h3
                className={`font-batang font-bold text-base sm:text-lg leading-snug transition-colors break-words ${
                  isCompleted
                    ? 'text-[#8A8174] dark:text-[#7A7265] line-through'
                    : 'text-[#2C2723] dark:text-[#E6E1DA]'
                }`}
                title={habit.title}
              >
                {habit.title}
              </h3>

              {habit.description && (
                <p className="text-xs font-serif-kr text-[#7A7265] dark:text-[#A89F91] mt-0.5 line-clamp-1">
                  {habit.description}
                </p>
              )}

              {/* Subcategories tags preview - Smooth horizontal touch scroll on mobile */}
              {subcategories && subcategories.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[10px] font-serif-kr text-[#8A8174] flex items-center gap-1 shrink-0">
                    <Tag className="w-3 h-3 text-[#C23B22]" /> 세부:
                  </span>
                  {subcategories.map((sub, idx) => {
                    const isCurrentSub = isCompleted && log?.subitem === sub;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSubitem(sub);
                        }}
                        className={`text-[10px] font-serif-kr px-2 py-0.5 rounded-lg border transition cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 ${
                          isCurrentSub
                            ? 'bg-[#C23B22] text-white border-[#C23B22] font-bold shadow-xs'
                            : 'bg-[#F3EFE6] dark:bg-[#25221F] text-[#5C5549] dark:text-[#C5BEB3] border-[#E2DBD0] dark:border-[#38332C] hover:border-[#C23B22]/50 hover:bg-[#FAF7F0]'
                        }`}
                        title={`'${sub}' 세부도장 직접 찍기/취소`}
                      >
                        {isCurrentSub && <Check className="w-2.5 h-2.5" />}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSubModal();
                    }}
                    className="text-[10px] font-serif-kr text-[#8A8174] hover:text-[#C23B22] px-2 py-0.5 rounded-md hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] flex items-center gap-1 transition border border-transparent hover:border-[#E2DBD0] dark:hover:border-[#38332C] shrink-0"
                    title="세부습관 항목 수정 / 켜기·끄기"
                  >
                    <SlidersHorizontal className="w-2.5 h-2.5" />
                    <span>설정</span>
                  </button>
                </div>
              )}

              {/* Weekly Frequency Progress Bar & Badge */}
              {weekProgress && (
                <div className="mt-2.5 p-2 sm:p-2.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/15">
                  <div className="flex items-center justify-between text-[11px] font-serif-kr font-medium mb-1">
                    <span className="text-indigo-600 dark:text-indigo-300 flex items-center gap-1">
                      <span>이번 주 실천:</span>
                      <strong className="text-indigo-700 dark:text-indigo-200">
                        {weekProgress.completedCount} / {weekProgress.targetCount}회
                      </strong>
                    </span>
                    {weekProgress.isGoalMet ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> 주간 달성!
                      </span>
                    ) : (
                      <span className="text-indigo-400">{weekProgress.rate}%</span>
                    )}
                  </div>
                  <div className="w-full bg-indigo-200/40 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${weekProgress.isGoalMet ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${weekProgress.rate}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              {/* Monthly Frequency Progress Bar & Badge */}
              {monthProgress && (
                <div className="mt-2.5 p-2 sm:p-2.5 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/15">
                  <div className="flex items-center justify-between text-[11px] font-serif-kr font-medium mb-1">
                    <span className="text-purple-600 dark:text-purple-300 flex items-center gap-1">
                      <span>이번 달 실천:</span>
                      <strong className="text-purple-700 dark:text-purple-200">
                        {monthProgress.completedCount} / {monthProgress.targetCount}회
                      </strong>
                    </span>
                    {monthProgress.isGoalMet ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" /> 월간 달성!
                      </span>
                    ) : (
                      <span className="text-purple-400">{monthProgress.rate}%</span>
                    )}
                  </div>
                  <div className="w-full bg-purple-200/40 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${monthProgress.isGoalMet ? 'bg-emerald-500' : 'bg-purple-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${monthProgress.rate}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>
              )}

              {/* Habit Log Memo indicator */}
              {log?.notes && (
                <div
                  onClick={() => setShowNotesModal(true)}
                  className="mt-2 text-xs text-[#5C5549] dark:text-[#C5BEB3] bg-[#F3EFE6] dark:bg-[#25221F] p-2 rounded-xl border border-[#E2DBD0] dark:border-[#38332C] flex items-start gap-1.5 cursor-pointer hover:bg-[#E8E2D5] transition font-serif-kr"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#C23B22]" />
                  <span className="line-clamp-2">{log.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stamp Seal Completion Action Zone - Spacious and Ergonomic on Mobile */}
          <div className="shrink-0 flex items-center justify-center pt-1 sm:pt-0">
            {/* If target count == 1 (Standard stamp) */}
            {targetCount <= 1 ? (
              <StampSeal
                text={habit.stampText || '完'}
                subitem={log?.subitem}
                shape={habit.stampShape || 'square'}
                completed={isCompleted}
                size="md"
                onClick={() => handleToggleClick('toggle')}
              />
            ) : (
              /* If multi-count target, counter plus stamp */
              <div className="flex items-center gap-1 sm:gap-1.5 bg-[#F3EFE6] dark:bg-[#25221F] p-1 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C]">
                <button
                  onClick={() => handleToggleClick('decrement')}
                  disabled={currentCount <= 0}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white dark:bg-[#1A1816] text-[#5C5549] dark:text-[#C5BEB3] flex items-center justify-center hover:bg-[#FAF7F0] disabled:opacity-30 shadow-2xs transition active:scale-95"
                  title="1 감소"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="px-1.5 sm:px-2 text-center min-w-[42px] sm:min-w-[50px]">
                  <span className={`text-xs font-bold font-serif-kr ${isCompleted ? 'text-[#C23B22]' : 'text-[#2C2723] dark:text-[#E6E1DA]'}`}>
                    {currentCount}/{targetCount}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-[#8A8174] block -mt-0.5 font-serif-kr">
                    {habit.unit || '회'}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleClick('increment')}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shadow-2xs transition active:scale-95 ${
                    isCompleted
                      ? 'bg-[#C23B22] text-white'
                      : 'bg-white dark:bg-[#1A1816] text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#FAF7F0]'
                  }`}
                  title="1 증가"
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 7-Day Mini Stamps Row - Evenly spaced 7-column layout that fits perfectly on vertical mobile */}
        <div className="mt-3.5 pt-2.5 border-t border-[#E8E2D5] dark:border-[#2C2824]">
          <div className="flex items-center justify-between text-[10px] font-serif-kr text-[#8A8174] mb-1.5 px-0.5">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[#C23B22]" />
              <span>주간 도장록 (월~일)</span>
            </span>
            <span className="text-[9px] text-[#C23B22] font-semibold">도장 클릭시 기록</span>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 w-full">
            {weekDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelectedDay = isSameDay(day, selectedDate);
              const dayLog = getLogForDay(dayStr);
              const dayCompleted = dayLog?.completed || false;
              const dayLabel = format(day, 'EEE', { locale: ko });

              return (
                <div
                  key={dayStr}
                  onClick={() => onSelectDate && onSelectDate(day)}
                  className={`group/day flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition cursor-pointer select-none ${
                    isSelectedDay
                      ? 'bg-[#C23B22]/10 border border-[#C23B22]/40 shadow-2xs'
                      : 'hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] border border-transparent'
                  }`}
                  title={`${format(day, 'M월 d일 (EEE)')}: ${dayCompleted ? '도장 완료' : '미완료'}\n• 도장 클릭: 기록 / 취소\n• 요일 클릭: 날짜 이동`}
                >
                  <span className={`text-[10px] font-serif-kr ${isSelectedDay ? 'font-bold text-[#C23B22]' : 'text-[#8A8174]'}`}>
                    {dayLabel}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleDayStamp(day, e);
                    }}
                    className={`mt-0.5 w-full max-w-[32px] sm:max-w-[36px] h-6 sm:h-7 rounded-md border flex items-center justify-center text-[10px] font-bold font-serif-kr transition-all active:scale-90 hover:scale-105 cursor-pointer ${
                      dayCompleted
                        ? 'border-[#C23B22] text-[#C23B22] bg-[#FDF5F2] dark:bg-[#2A1715] shadow-2xs'
                        : 'border-dashed border-[#8A8174]/40 text-transparent hover:border-[#C23B22]/60 hover:text-[#C23B22]/60 hover:bg-[#C23B22]/5'
                    }`}
                    title={dayCompleted ? '도장 취소' : '도장 찍기'}
                  >
                    {dayCompleted ? (dayLog?.subitem ? dayLog.subitem.slice(0, 1) : (habit.stampText?.slice(0, 1) || '完')) : '印'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FCFAF6] dark:bg-[#1A1816] rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-[#E8E2D5] dark:border-[#2C2824]"
            >
              <div className="flex items-center gap-2.5 mb-2 text-[#C23B22]">
                <div className="w-9 h-9 rounded-xl bg-[#C23B22]/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h4 className="font-batang font-bold text-[#2C2723] dark:text-[#E6E1DA] text-base">
                  습관 삭제 확인
                </h4>
              </div>
              <p className="text-xs font-serif-kr text-[#7A7265] dark:text-[#A89F91] leading-relaxed mb-5">
                '<strong className="text-[#2C2723] dark:text-[#E6E1DA]">{habit.title}</strong>' 습관을 삭제하시겠습니까?
                삭제 후에는 목록에서 제거됩니다.
              </p>
              <div className="flex items-center justify-end gap-2 font-serif-kr">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDelete(habit.id);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C23B22] hover:bg-[#A82E18] text-white flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notes Modal */}
      <AnimatePresence>
        {showNotesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FCFAF6] dark:bg-[#1A1816] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E8E2D5] dark:border-[#2C2824]"
            >
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-[#C23B22]" />
                <h4 className="font-batang font-bold text-[#2C2723] dark:text-[#E6E1DA] text-base">
                  [{habit.title}] 오늘 도장 일기 & 메모
                </h4>
              </div>
              <p className="text-xs font-serif-kr text-[#7A7265] dark:text-[#A89F91] mb-3">
                오늘의 실천 소감이나 인상 깊었던 배움을 기록해보세요.
              </p>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="예: 아침 맑은 공기를 마시며 기분 좋게 15분 스트레칭 완료!"
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C] bg-[#F8F4EC] dark:bg-[#23201D] text-[#2C2723] dark:text-[#E6E1DA] text-sm focus:outline-none focus:ring-1 focus:ring-[#C23B22] font-serif-kr"
              />
              <div className="flex justify-end gap-2 mt-4 font-serif-kr">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#C23B22] hover:bg-[#A82E18] text-white flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  저장하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subcategories Quick Editor & Toggle Modal */}
      <AnimatePresence>
        {showSubModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#FCFAF6] dark:bg-[#1A1816] rounded-3xl p-6 max-w-md w-full shadow-2xl border border-[#E8E2D5] dark:border-[#2C2824] font-serif-kr"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D5] dark:border-[#2C2824] mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-batang font-bold text-[#2C2723] dark:text-[#E6E1DA] text-base">
                      세부 습관 (하위 항목) 설정
                    </h4>
                    <p className="text-[11px] text-[#7A7265] dark:text-[#A89F91]">
                      '{habit.title}'의 부위별·단계별 세부 도장을 켜거나 수정합니다
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="p-1.5 rounded-lg text-[#8A8174] hover:text-[#2C2723] dark:hover:text-[#E6E1DA] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Master ON/OFF Toggle */}
              <div className="p-3.5 rounded-2xl bg-[#F3EFE6] dark:bg-[#25221F] border border-[#E8E2D5] dark:border-[#38332C] flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2C2723] dark:text-[#E6E1DA]">
                      세부 습관 기능
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        subModalEnabled
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-200 dark:bg-white/10 text-[#7A7265] dark:text-[#A89F91]'
                      }`}
                    >
                      {subModalEnabled ? 'ON (사용 중)' : 'OFF (꺼짐)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#7A7265] dark:text-[#A89F91] mt-0.5">
                    {subModalEnabled
                      ? '도장을 찍을 때 세부 항목이 순환되거나 원하는 항목을 직접 찍을 수 있습니다'
                      : '기능을 끄면 세부 항목 없이 기본 단일 도장으로 실천됩니다'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={subModalEnabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSubModalEnabled(checked);
                      if (checked && subModalItems.length === 0) {
                        if (habit.categoryId === 'health' || habit.title.includes('운동') || habit.title.includes('헬스')) {
                          setSubModalItems(['상체', '하체', '유산소']);
                        } else if (habit.categoryId === 'learning' || habit.title.includes('공부') || habit.title.includes('독서')) {
                          setSubModalItems(['이론학습', '실습과제', '복습정리']);
                        } else {
                          setSubModalItems(['1단계', '2단계', '3단계']);
                        }
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C23B22]"></div>
                </label>
              </div>

              {subModalEnabled ? (
                <div className="space-y-3.5 mb-5 max-h-[320px] overflow-y-auto pr-1">
                  {/* Presets */}
                  <div>
                    <span className="text-[11px] font-semibold text-[#7A7265] dark:text-[#A89F91] block mb-1.5">
                      추천 프리셋 (클릭 시 자동 적용)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '운동 루틴', items: ['상체', '하체', '유산소'] },
                        { label: '공부 루틴', items: ['이론학습', '실습과제', '복습정리'] },
                        { label: '독서 루틴', items: ['챕터읽기', '핵심메모', '실행적용'] },
                        { label: '단계별', items: ['1단계', '2단계', '3단계'] },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setSubModalItems([...preset.items])}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#FAF7F0] dark:bg-[#1E1C1A] text-[#5C5549] dark:text-[#C5BEB3] border border-[#E8E2D5] dark:border-[#38332C] hover:border-[#C23B22]/50 hover:text-[#C23B22] transition cursor-pointer"
                        >
                          {preset.label} ({preset.items.join('·')})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Items List */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#2C2723] dark:text-[#E6E1DA]">
                        세부 항목 목록 ({subModalItems.length}개)
                      </span>
                      {subModalItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSubModalItems([])}
                          className="text-[10px] text-[#8A8174] hover:text-rose-500 transition cursor-pointer"
                        >
                          전체 지우기
                        </button>
                      )}
                    </div>

                    {subModalItems.length === 0 ? (
                      <div className="p-3 text-center rounded-xl bg-white/50 dark:bg-black/20 border border-dashed border-[#E2DBD0] dark:border-[#38332C] text-xs text-[#8A8174]">
                        세부 항목이 없습니다. 아래에서 항목을 추가해주세요.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {subModalItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-xl bg-white dark:bg-[#201D1A] border border-[#E8E2D5] dark:border-[#2C2824]"
                          >
                            <span className="text-[10px] font-bold text-[#8A8174] w-4 shrink-0">
                              {idx + 1}.
                            </span>
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const next = [...subModalItems];
                                next[idx] = e.target.value;
                                setSubModalItems(next);
                              }}
                              className="flex-1 bg-transparent text-xs text-[#2C2723] dark:text-[#E6E1DA] focus:outline-none focus:ring-1 focus:ring-[#C23B22] rounded px-1.5 py-0.5 border border-transparent focus:border-[#C23B22]/30"
                              placeholder="항목 이름 (클릭하여 수정)"
                            />
                            {/* Reorder Buttons */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...subModalItems];
                                    const temp = next[idx - 1];
                                    next[idx - 1] = next[idx];
                                    next[idx] = temp;
                                    setSubModalItems(next);
                                  }}
                                  className="p-1 rounded text-[#8A8174] hover:text-[#2C2723] dark:hover:text-[#E6E1DA] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition cursor-pointer"
                                  title="위로 이동"
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                              )}
                              {idx < subModalItems.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...subModalItems];
                                    const temp = next[idx + 1];
                                    next[idx + 1] = next[idx];
                                    next[idx] = temp;
                                    setSubModalItems(next);
                                  }}
                                  className="p-1 rounded text-[#8A8174] hover:text-[#2C2723] dark:hover:text-[#E6E1DA] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition cursor-pointer"
                                  title="아래로 이동"
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSubModalItems(subModalItems.filter((_, i) => i !== idx));
                                }}
                                className="p-1 rounded text-[#8A8174] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                title="항목 삭제"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Item Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newSubInput}
                      onChange={(e) => setNewSubInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newSubInput.trim()) {
                            setSubModalItems([...subModalItems, newSubInput.trim()]);
                            setNewSubInput('');
                          }
                        }
                      }}
                      placeholder="새 세부항목 (예: 어깨·등, 30분 달리기)"
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-[#201D1A] border border-[#E2DBD0] dark:border-[#38332C] text-[#2C2723] dark:text-[#E6E1DA] focus:outline-none focus:ring-1 focus:ring-[#C23B22]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubInput.trim()) {
                          setSubModalItems([...subModalItems, newSubInput.trim()]);
                          setNewSubInput('');
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-[#C23B22] text-white text-xs font-semibold hover:bg-[#A82E18] transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>추가</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#FAF7F0] dark:bg-[#1E1C1A] border border-dashed border-[#E8E2D5] dark:border-[#38332C] text-center my-4">
                  <p className="text-xs text-[#7A7265] dark:text-[#A89F91] leading-relaxed">
                    현재 세부 습관 기능이 <strong>꺼져</strong> 있습니다.<br />
                    저장 버튼을 누르면 이 습관은 단일 도장으로 동작하게 됩니다.
                  </p>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E2D5] dark:border-[#2C2824]">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={isSavingSubModal}
                  onClick={handleSaveSubModal}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#C23B22] hover:bg-[#A82E18] text-white flex items-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingSubModal ? '저장 중...' : '설정 저장하기'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
