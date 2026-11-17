import React, { useState, useEffect } from 'react';
import { Habit, HabitCategory, DayOfWeek, FrequencyType, HabitImportance } from '../types';
import { CATEGORY_COLORS, AVAILABLE_ICONS, getCategoryStyle } from '../lib/categories';
import { DynamicIcon } from './DynamicIcon';
import {
  X,
  Bell,
  Plus,
  Check,
  Calendar,
  RotateCcw,
  CalendarDays,
  AlertCircle,
  Trash2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Edit3,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => Promise<void>;
  onDelete?: (habitId: string) => Promise<void> | void;
  editingHabit: Habit | null;
  categories: HabitCategory[];
  onOpenCategoryManager: () => void;
}

const SUBCATEGORY_PRESETS = [
  { label: '🏋️ 헬스/운동', items: ['상체', '하체', '유산소', '코어'] },
  { label: '📖 공부/학습', items: ['이론', '문제풀이', '오답복습'] },
  { label: '☀️ 일과/단계', items: ['아침', '점심', '저녁'] },
  { label: '🥗 식단 관리', items: ['아침', '점심', '저녁', '간식'] },
  { label: '📚 독서/작성', items: ['독서', '요약노트', '서평'] },
];

const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 0, label: '일' },
];

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingHabit,
  categories,
  onOpenCategoryManager,
}) => {
  const [title, setTitle] = useState('');
  const [trackOnly, setTrackOnly] = useState(false);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('health');
  
  // Frequency settings
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('specific_days');
  const [targetDays, setTargetDays] = useState<DayOfWeek[]>([0, 1, 2, 3, 4, 5, 6]);
  const [weeklyTargetCount, setWeeklyTargetCount] = useState<number>(3);
  const [monthlyTargetCount, setMonthlyTargetCount] = useState<number>(10);

  // Daily target count & unit
  const [targetCount, setTargetCount] = useState<number>(1);
  const [unit, setUnit] = useState('회');
  const [importance, setImportance] = useState<HabitImportance>('normal');
  const [timeOfDay, setTimeOfDay] = useState<'anytime' | 'morning' | 'afternoon' | 'evening'>('anytime');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:30');
  const [color, setColor] = useState('emerald');
  const [icon, setIcon] = useState('Activity');

  // Subcategories state (세부 습관 항목)
  const [subcategoriesEnabled, setSubcategoriesEnabled] = useState(false);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [newSubitemInput, setNewSubitemInput] = useState('');
  const [editingSubIndex, setEditingSubIndex] = useState<number | null>(null);
  const [editingSubText, setEditingSubText] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setShowDeleteConfirm(false);
    setIsDeleting(false);
    setErrorMessage(null);
    if (editingHabit) {
      setTitle(editingHabit.title);
      setTrackOnly(!!editingHabit.trackOnly);
      setDescription(editingHabit.description || '');
      setCategoryId(editingHabit.categoryId || 'health');
      setFrequencyType(editingHabit.frequencyType || 'specific_days');
      setTargetDays(editingHabit.targetDays || [0, 1, 2, 3, 4, 5, 6]);
      if (editingHabit.frequencyType === 'weekly_target') {
        setWeeklyTargetCount(editingHabit.frequencyTargetCount || 3);
      } else if (editingHabit.frequencyType === 'monthly_target') {
        setMonthlyTargetCount(editingHabit.frequencyTargetCount || 10);
      }
      setTargetCount(editingHabit.targetCount || 1);
      setUnit(editingHabit.unit || '회');
      setImportance(editingHabit.importance || 'normal');
      setTimeOfDay(editingHabit.timeOfDay || 'anytime');
      setReminderEnabled(!!editingHabit.reminderEnabled);
      setReminderTime(editingHabit.reminderTime || '08:30');
      setColor(editingHabit.color || 'emerald');
      setIcon(editingHabit.icon || 'Activity');
      
      const subs = editingHabit.subcategories || [];
      setSubcategoriesEnabled(subs.length > 0);
      setSubcategories([...subs]);
      setNewSubitemInput('');
      setEditingSubIndex(null);
      setEditingSubText('');
    } else {
      setTitle('');
      setTrackOnly(false);
      setDescription('');
      setCategoryId(categories[0]?.id || 'health');
      setFrequencyType('specific_days');
      setTargetDays([0, 1, 2, 3, 4, 5, 6]);
      setWeeklyTargetCount(3);
      setMonthlyTargetCount(10);
      setTargetCount(1);
      setUnit('회');
      setImportance('normal');
      setTimeOfDay('anytime');
      setReminderEnabled(false);
      setReminderTime('08:30');
      setColor('emerald');
      setIcon('Activity');

      setSubcategoriesEnabled(false);
      setSubcategories([]);
      setNewSubitemInput('');
      setEditingSubIndex(null);
      setEditingSubText('');
    }
  }, [editingHabit, categories, isOpen]);

  const toggleDay = (day: DayOfWeek) => {
    if (targetDays.includes(day)) {
      if (targetDays.length === 1) return; // Must have at least 1 day
      setTargetDays(targetDays.filter((d) => d !== day));
    } else {
      setTargetDays([...targetDays, day]);
    }
  };

  const handlePresetFrequency = (preset: 'daily' | 'weekdays' | 'weekends') => {
    if (preset === 'daily') setTargetDays([0, 1, 2, 3, 4, 5, 6]);
    else if (preset === 'weekdays') setTargetDays([1, 2, 3, 4, 5]);
    else if (preset === 'weekends') setTargetDays([0, 6]);
  };

  const handleAddSubitem = () => {
    if (!newSubitemInput.trim()) return;
    const parts = newSubitemInput
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length === 0) return;

    const next = [...subcategories];
    for (const part of parts) {
      if (!next.includes(part)) {
        next.push(part);
      }
    }
    setSubcategories(next);
    setNewSubitemInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('습관 이름을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const freqTargetCount =
      frequencyType === 'weekly_target'
        ? Math.max(1, Math.min(7, weeklyTargetCount))
        : frequencyType === 'monthly_target'
        ? Math.max(1, Math.min(31, monthlyTargetCount))
        : undefined;

    const cleanSubs = subcategoriesEnabled
      ? subcategories.map((s) => s.trim()).filter((s) => s.length > 0)
      : [];

    try {
      await onSave({
        id: editingHabit?.id,
        title: title.trim(),
        trackOnly,
        description: description.trim(),
        categoryId,
        frequencyType,
        targetDays: frequencyType === 'specific_days' ? targetDays : [0, 1, 2, 3, 4, 5, 6],
        frequencyTargetCount: freqTargetCount,
        targetCount: Math.max(1, Number(targetCount) || 1),
        unit: unit.trim() || '회',
        importance,
        weight: importance === 'critical' ? 2.0 : importance === 'high' ? 1.5 : importance === 'low' ? 0.5 : 1.0,
        timeOfDay,
        subcategories: cleanSubs,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : undefined,
        color,
        icon,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to save habit', err);
      setErrorMessage('습관을 저장하는 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-white/10 my-8 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <DynamicIcon name={icon} className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingHabit ? '습관 수정하기' : '새 습관 만들기'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  반복 주기와 목표를 설정해 매일 꾸준히 실천해보세요
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {/* Habit Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                습관 이름 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 물 2L 마시기, 주 3회 헬스장 가기, 월 4회 독서"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Track-only toggle */}
            <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={trackOnly}
                onChange={(e) => setTrackOnly(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#C23B22]"
              />
              <span>
                <span className="block text-xs font-semibold text-slate-800 dark:text-white">기록만 하는 항목</span>
                <span className="block text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                  기상시간처럼 글로만 적는 항목이에요. 달성 체크와 달성률 계산에서 빠져요.
                </span>
              </span>
            </label>

            {/* Habit Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                설명 또는 동기부여 메모 (선택)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 맑은 정신과 체력 증진을 위해"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Category Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                  카테고리
                </label>
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> 카테고리 관리
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  const style = getCategoryStyle(cat.color);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(cat.id);
                        setColor(cat.color);
                        setIcon(cat.icon);
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition ${
                        isSelected
                          ? `${style.lightBg} ${style.text} border-emerald-500 ring-1 ring-emerald-500`
                          : 'border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <DynamicIcon name={cat.icon} className="w-4 h-4" />
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* === IMPROVED: FREQUENCY SETTING (요일 지정 / 1주일 N회 / 1달 N회) === */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
              <label className="block text-xs font-semibold text-slate-800 dark:text-white">
                실천 주기 & 반복 방식
              </label>

              {/* Frequency Mode Tab Buttons */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/60 dark:bg-black/40 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFrequencyType('specific_days')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    frequencyType === 'specific_days'
                      ? 'bg-emerald-500 text-black shadow-xs'
                      : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>요일 지정</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFrequencyType('weekly_target')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    frequencyType === 'weekly_target'
                      ? 'bg-emerald-500 text-black shadow-xs'
                      : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>주간 횟수</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFrequencyType('monthly_target')}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    frequencyType === 'monthly_target'
                      ? 'bg-emerald-500 text-black shadow-xs'
                      : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>월간 횟수</span>
                </button>
              </div>

              {/* Mode 1: Specific Days Selection */}
              {frequencyType === 'specific_days' && (
                <div className="pt-2 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePresetFrequency('daily')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        targetDays.length === 7
                          ? 'bg-emerald-500 text-black font-semibold border-emerald-500'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      매일 (월~일)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetFrequency('weekdays')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        targetDays.length === 5 && !targetDays.includes(0) && !targetDays.includes(6)
                          ? 'bg-emerald-500 text-black font-semibold border-emerald-500'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      평일 (월~금)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetFrequency('weekends')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        targetDays.length === 2 && targetDays.includes(0) && targetDays.includes(6)
                          ? 'bg-emerald-500 text-black font-semibold border-emerald-500'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      주말 (토·일)
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_OPTIONS.map((d) => {
                      const selected = targetDays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDay(d.value)}
                          className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center transition ${
                            selected
                              ? 'bg-emerald-500 text-black font-semibold shadow-xs'
                              : 'bg-white dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mode 2: Weekly Target Count (1주일에 N회) */}
              {frequencyType === 'weekly_target' && (
                <div className="pt-2 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setWeeklyTargetCount(cnt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          weeklyTargetCount === cnt
                            ? 'bg-emerald-500 text-black border-emerald-500'
                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5'
                        }`}
                      >
                        주 {cnt}회
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">
                      1주일 목표:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={weeklyTargetCount}
                      onChange={(e) => setWeeklyTargetCount(Math.max(1, Math.min(7, parseInt(e.target.value) || 1)))}
                      className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-bold text-center text-sm"
                    />
                    <span className="text-xs text-slate-600 dark:text-gray-300 font-medium">회 실천</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">
                    💡 특정 요일에 얽매이지 않고 매주(월~일) 자유롭게 실천하여 주간 목표 횟수를 달성합니다.
                  </p>
                </div>
              )}

              {/* Mode 3: Monthly Target Count (1달에 N회) */}
              {frequencyType === 'monthly_target' && (
                <div className="pt-2 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 4, 8, 10, 15, 20].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setMonthlyTargetCount(cnt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          monthlyTargetCount === cnt
                            ? 'bg-emerald-500 text-black border-emerald-500'
                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/5'
                        }`}
                      >
                        월 {cnt}회
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-white/10">
                    <span className="text-xs font-semibold text-slate-700 dark:text-gray-200">
                      1개월 목표:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={monthlyTargetCount}
                      onChange={(e) => setMonthlyTargetCount(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                      className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white font-bold text-center text-sm"
                    />
                    <span className="text-xs text-slate-600 dark:text-gray-300 font-medium">회 실천</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">
                    💡 1달(1일~말일) 동안 목표 횟수를 달성하는 유연한 장기 습관입니다.
                  </p>
                </div>
              )}
            </div>

            {/* Target Goal Count & Unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  1회 실천량 / 수량
                </label>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={targetCount}
                  onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  단위 (예: 회, 잔, 분, 쪽)
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="예: 회, 잔, 분, 페이지"
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Habit Importance & Achievement Weight (습관별 중요도 설정) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>습관 중요도 (성취도 가중치)</span>
                </label>
                <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400">
                  기본값: 보통 (1.0x)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'low' as const, label: '가벼움', factor: '0.5x', starCount: 1, desc: '부담 없는 일과' },
                  { id: 'normal' as const, label: '보통', factor: '1.0x', starCount: 1, desc: '기본 동일 가중치' },
                  { id: 'high' as const, label: '중요', factor: '1.5x', starCount: 2, desc: '주요 목표 습관' },
                  { id: 'critical' as const, label: '핵심', factor: '2.0x', starCount: 3, desc: '절대 사수 루틴' },
                ].map((opt) => {
                  const isSelected = importance === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setImportance(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-500/20 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-xs">{opt.label}</span>
                          <span className="text-[10px] text-amber-500">
                            {'★'.repeat(opt.starCount)}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? 'bg-emerald-500 text-black'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-gray-300'
                          }`}
                        >
                          {opt.factor}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 line-clamp-1">
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed">
                💡 월 1회나 주 1회 실천하는 습관과 매일 실천하는 습관이 성취도에 동일하게 작용하지 않도록 가중치를 조절할 수 있습니다. 일일·주간·월간 종합 성적 산출에 반영됩니다.
              </p>
            </div>

            {/* Time of Day */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                권장 실천 시간대
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'anytime', label: '언제나' },
                  { id: 'morning', label: '아침 🌅' },
                  { id: 'afternoon', label: '오후 ☀️' },
                  { id: 'evening', label: '저녁 🌙' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => setTimeOfDay(t.id as any)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      timeOfDay === t.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategories (세부 습관 / 세부 도장 항목) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-[#C23B22] flex items-center justify-center">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-white block">
                        세부 습관 (도장 세부항목)
                      </span>
                      {subcategoriesEnabled && subcategories.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/15 text-[#C23B22]">
                          {subcategories.length}개 설정됨
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-gray-400">
                      운동 부위(상체/하체)나 일과 단계처럼 도장 찍을 세부 항목을 관리합니다
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      subcategoriesEnabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-gray-400'
                    }`}
                  >
                    {subcategoriesEnabled ? 'ON (사용 중)' : 'OFF (꺼짐)'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={subcategoriesEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSubcategoriesEnabled(checked);
                        if (checked && subcategories.length === 0) {
                          // Smart defaults based on category or title
                          if (categoryId === 'health' || title.includes('운동') || title.includes('헬스')) {
                            setSubcategories(['상체', '하체', '유산소']);
                          } else if (categoryId === 'learning' || title.includes('공부') || title.includes('독서')) {
                            setSubcategories(['이론', '실습', '복습']);
                          } else {
                            setSubcategories(['1단계', '2단계', '3단계']);
                          }
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-white/10 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-white/20 peer-checked:bg-[#C23B22]"></div>
                  </label>
                </div>
              </div>

              {!subcategoriesEnabled && (
                <p className="text-[11px] text-slate-500 dark:text-gray-400 pt-1">
                  현재 세부 습관 기능이 <strong>꺼져</strong> 있습니다. 스위치를 켜면 상체/하체, 단계별 등 세부 도장을 등록할 수 있습니다.
                </p>
              )}

              {subcategoriesEnabled && (
                <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-3">
                  {/* Tip */}
                  <div className="text-[11px] text-slate-600 dark:text-gray-300 bg-white/70 dark:bg-black/20 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#C23B22] shrink-0 mt-0.5" />
                    <span>
                      도장을 찍을 때마다 설정한 순서대로 순환하며 찍히며, 일일 카드에서 오늘 실천한 세부 항목을 직접 눌러 바로 기록할 수도 있습니다.
                    </span>
                  </div>

                  {/* Preset recommendations */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 block mb-1.5">
                      추천 프리셋 (클릭 시 자동 적용)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUBCATEGORY_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setSubcategories([...preset.items]);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-white/10 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-white/10 hover:border-rose-200 transition flex items-center gap-1"
                        >
                          <span>{preset.label}</span>
                          <span className="text-[10px] text-slate-400">({preset.items.join('·')})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current items list */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                        세부 항목 목록 ({subcategories.length}개)
                      </span>
                      {subcategories.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSubcategories([])}
                          className="text-[11px] text-slate-400 hover:text-rose-500 transition"
                        >
                          모두 지우기
                        </button>
                      )}
                    </div>

                    {subcategories.length === 0 ? (
                      <div className="p-3 text-center rounded-xl bg-white/50 dark:bg-black/20 border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-400">
                        등록된 세부 항목이 없습니다. 아래에서 항목을 추가해주세요.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 p-2.5 bg-white dark:bg-black/30 rounded-xl border border-slate-200 dark:border-white/10">
                        {subcategories.map((item, index) => {
                          const isEditing = editingSubIndex === index;
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-gray-100 text-xs font-medium border border-slate-200 dark:border-white/10 group"
                            >
                              {/* Order reordering */}
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...subcategories];
                                    const temp = next[index - 1];
                                    next[index - 1] = next[index];
                                    next[index] = temp;
                                    setSubcategories(next);
                                  }}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5"
                                  title="앞으로 이동"
                                >
                                  <ChevronLeft className="w-3 h-3" />
                                </button>
                              )}

                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingSubText}
                                    onChange={(e) => setEditingSubText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (editingSubText.trim()) {
                                          const next = [...subcategories];
                                          next[index] = editingSubText.trim();
                                          setSubcategories(next);
                                        }
                                        setEditingSubIndex(null);
                                      } else if (e.key === 'Escape') {
                                        setEditingSubIndex(null);
                                      }
                                    }}
                                    autoFocus
                                    className="w-20 px-1 py-0.5 text-xs rounded border border-slate-300 dark:border-white/20 bg-white dark:bg-black text-slate-900 dark:text-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editingSubText.trim()) {
                                        const next = [...subcategories];
                                        next[index] = editingSubText.trim();
                                        setSubcategories(next);
                                      }
                                      setEditingSubIndex(null);
                                    }}
                                    className="text-emerald-600 hover:text-emerald-700 p-0.5"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  onClick={() => {
                                    setEditingSubIndex(index);
                                    setEditingSubText(item);
                                  }}
                                  className="cursor-pointer hover:underline"
                                  title="클릭하여 이름 수정"
                                >
                                  {item}
                                </span>
                              )}

                              {index < subcategories.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...subcategories];
                                    const temp = next[index + 1];
                                    next[index + 1] = next[index];
                                    next[index] = temp;
                                    setSubcategories(next);
                                  }}
                                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5"
                                  title="뒤로 이동"
                                >
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}

                              {!isEditing && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubIndex(index);
                                    setEditingSubText(item);
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 ml-0.5 opacity-60 group-hover:opacity-100"
                                  title="이름 수정"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSubcategories(subcategories.filter((_, i) => i !== index));
                                  if (editingSubIndex === index) {
                                    setEditingSubIndex(null);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-500 ml-1 p-0.5"
                                title="항목 삭제"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add new subitem input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubitemInput}
                      onChange={(e) => setNewSubitemInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubitem();
                        }
                      }}
                      placeholder="예: 상체, 하체, 유산소 (쉼표로 구분해 여러 개 동시 입력 가능)"
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-[#C23B22]"
                    />
                    <button
                      type="button"
                      onClick={handleAddSubitem}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>추가</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

                        {/* Color & Icon Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                테마 색상 및 아이콘
              </label>
              <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                {CATEGORY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center shrink-0 transition-transform ${
                      color === c.id ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    {color === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>

              {/* Icon grid */}
              <div className="grid grid-cols-8 gap-2 p-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 max-h-28 overflow-y-auto">
                {AVAILABLE_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={`p-2 rounded-lg flex items-center justify-center transition ${
                      icon === iconName
                        ? 'bg-emerald-500 text-black font-semibold'
                        : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    <DynamicIcon name={iconName} className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/10 sticky bottom-0 bg-white dark:bg-[#161616] pb-1">
              {editingHabit && onDelete ? (
                <div>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>습관 삭제</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded-xl border border-rose-200 dark:border-rose-800/40">
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 px-1">정말 삭제할까요?</span>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={async () => {
                          if (!editingHabit?.id) return;
                          setIsDeleting(true);
                          try {
                            await onDelete(editingHabit.id);
                            onClose();
                          } catch (e) {
                            console.error('Delete error', e);
                          } finally {
                            setIsDeleting(false);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                      >
                        {isDeleting ? '삭제 중...' : '삭제'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-2 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-gray-300 hover:bg-white/50"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#C23B22] hover:bg-[#A82E18] text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {isSubmitting && (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isSubmitting ? '저장 중...' : editingHabit ? '변경사항 저장' : '습관 생성하기'}</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
