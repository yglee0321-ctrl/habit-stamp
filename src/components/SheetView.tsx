import React, { useMemo, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Habit, HabitLog, HabitCategory } from '../types';
import { isHabitScheduledOnDate, setCellRecord, calcGrade, reorderHabits } from '../lib/storage';
import { ChevronLeft, ChevronRight, X, Zap, PenLine, Plus, Minus, ArrowLeftRight, Check, GripVertical, Share2, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { buildRows, toTSV, exportToGoogleSheets, ExportResult } from '../lib/export';
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
  isAfter,
  startOfDay,
  isSameMonth,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface SheetViewProps {
  habits: Habit[];
  logs: HabitLog[];
  categories: HabitCategory[];
  currentDate: Date;
  onOpenCreateHabit: () => void;
  onEditHabit: (habit: Habit) => void;
}

const DATE_W = 56;
const RATE_W = 46;

// 하루 달성률 → 주황색 진하기 (불투명 색만 사용: 고정 열 뒤가 비치지 않게)
function rateBg(rate: number | null) {
  if (rate === null) return 'bg-[#FCFAF6] dark:bg-[#1A1816]';
  if (rate >= 100) return 'bg-orange-500 text-white';
  if (rate >= 75) return 'bg-orange-400 text-[#3A1D08] dark:bg-orange-600 dark:text-white';
  if (rate >= 50) return 'bg-orange-300 text-[#3A1D08] dark:bg-orange-700 dark:text-orange-50';
  if (rate > 0) return 'bg-orange-200 text-[#3A1D08] dark:bg-orange-900 dark:text-orange-100';
  return 'bg-[#EFEBE3] text-[#8A8174] dark:bg-[#25221F]';
}

export const SheetView: React.FC<SheetViewProps> = ({ habits, logs, currentDate, onOpenCreateHabit, onEditHabit }) => {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [anchor, setAnchor] = useState<Date>(currentDate);
  const [quickMode, setQuickMode] = useState(false);
  const [editing, setEditing] = useState<{ habit: Habit; date: string } | null>(null);
  const [orderMode, setOrderMode] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [box, setBox] = useState<{ h?: number; w: number }>({ w: 0 });
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const todayRowRef = useRef<HTMLTableRowElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedHabits = useMemo(() => [...habits].filter((h) => !h.archived).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [habits]);
  const days = useMemo(
    () =>
      view === 'month'
        ? eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) })
        : eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) }),
    [view, anchor]
  );
  const rangeKey = view + format(days[0], 'yyyy-MM-dd');

  const logMap = useMemo(() => {
    const m = new Map<string, HabitLog>();
    logs.forEach((l) => m.set(`${l.date}_${l.habitId}`, l));
    return m;
  }, [logs]);

  // 표를 화면 높이에 맞추고, 폭을 재서 열 너비를 정함
  const updateScrollHints = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useLayoutEffect(() => {
    const fit = () => {
      const el = scrollRef.current;
      if (!el) return;
      const docTop = el.getBoundingClientRect().top + window.scrollY;
      const h = Math.max(320, window.innerHeight - docTop - 12);
      const w = el.clientWidth;
      setBox((prev) => (prev.h === h && prev.w === w ? prev : { h, w }));
      updateScrollHints();
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  });

  // 처음 열 때 오늘 줄이 가운데 오도록
  const scrolledFor = useRef('');
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !box.h) return;
    if (scrolledFor.current === rangeKey) return;
    scrolledFor.current = rangeKey;
    const row = todayRowRef.current;
    el.scrollTop = row ? Math.max(0, row.offsetTop - el.clientHeight / 2) : 0;
  }, [rangeKey, box.h, sortedHabits.length > 0]);

  // 마우스 휠로 좌우 이동: 세로로 넘칠 게 없거나(주 보기), 항목 이름 줄·합계 줄 위에서는 휠이 좌우로 움직임
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.shiftKey) return;
      if (el.scrollWidth <= el.clientWidth + 2) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const noVertical = el.scrollHeight <= el.clientHeight + 2;
      const onEdgeRow = (e.target as Element | null)?.closest?.('thead, tfoot');
      if (noVertical || onEdgeRow) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [sortedHabits.length > 0]);

  const now = startOfDay(new Date());

  // 기록을 시작한 날 이전은 달성률 계산에서 제외
  const startDay = useMemo(() => {
    let min = Date.now();
    habits.forEach((h) => {
      if (h.createdAt && h.createdAt < min) min = h.createdAt;
    });
    logs.forEach((l) => {
      const t = new Date(l.date + 'T00:00:00').getTime();
      if (t < min) min = t;
    });
    return startOfDay(new Date(min));
  }, [habits, logs]);

  const dayRate = (d: Date): { done: number; total: number; rate: number | null } => {
    const ds = format(d, 'yyyy-MM-dd');
    let done = 0;
    let total = 0;
    if (isAfter(startDay, d)) return { done, total, rate: null };
    sortedHabits.forEach((h) => {
      if (h.trackOnly) return;
      const l = logMap.get(`${ds}_${h.id}`);
      if ((h.frequencyType || 'specific_days') === 'specific_days') {
        if (!isHabitScheduledOnDate(h, d)) return;
        total++;
        if (l?.completed) done++;
      } else if (l?.completed) {
        total++;
        done++;
      }
    });
    return { done, total, rate: total > 0 ? Math.round((done / total) * 100) : null };
  };

  const habitStats = useMemo(() => {
    const res = new Map<string, { done: number; scheduled: number; written: number }>();
    const counted = days.filter((d) => !isAfter(d, now) && !isAfter(startDay, d));
    sortedHabits.forEach((h) => {
      let done = 0;
      let scheduled = 0;
      let written = 0;
      days.forEach((d) => {
        if (isAfter(d, now)) return;
        const l = logMap.get(`${format(d, 'yyyy-MM-dd')}_${h.id}`);
        if (l?.completed) done++;
        if (l?.notes) written++;
      });
      counted.forEach((d) => {
        if (isHabitScheduledOnDate(h, d)) scheduled++;
      });
      if (h.frequencyType === 'weekly_target') scheduled = Math.round(((h.frequencyTargetCount || 3) * counted.length) / 7);
      else if (h.frequencyType === 'monthly_target')
        scheduled = view === 'month' ? h.frequencyTargetCount || 10 : Math.round(((h.frequencyTargetCount || 10) * counted.length) / 30);
      res.set(h.id, { done, scheduled, written });
    });
    return res;
  }, [sortedHabits, days, logMap, startDay, view]);

  const moveHabit = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = sortedHabits.map((h) => h.id);
    const from = ids.indexOf(fromId);
    ids.splice(from, 1);
    const to = ids.indexOf(toId);
    ids.splice(from <= to ? to + 1 : to, 0, fromId);
    reorderHabits(ids);
  };
  const shiftHabit = (id: string, dir: -1 | 1) => {
    const ids = sortedHabits.map((h) => h.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderHabits(ids);
  };
  const scrollCols = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(200, (el.clientWidth - DATE_W - RATE_W) * 0.8), behavior: 'smooth' });
  };

  const handleCellClick = (habit: Habit, ds: string) => {
    if (orderMode) return;
    if (!quickMode || habit.trackOnly) {
      setEditing({ habit, date: ds });
      return;
    }
    const log = logMap.get(`${ds}_${habit.id}`);
    const done = !log?.completed;
    const sub = habit.subcategories && habit.subcategories.length > 0 ? log?.subitem || habit.subcategories[0] : undefined;
    setCellRecord(habit, ds, done ? 'done' : 'none', log?.notes || '', done ? sub : undefined);
  };

  const goPrev = () => setAnchor(view === 'month' ? subMonths(anchor, 1) : subWeeks(anchor, 1));
  const goNext = () => setAnchor(view === 'month' ? addMonths(anchor, 1) : addWeeks(anchor, 1));
  const isCurrentRange = days.some((d) => isToday(d));
  const rangeLabel =
    view === 'month'
      ? format(anchor, 'yyyy년 M월')
      : `${format(days[0], 'M월 d일')} – ${isSameMonth(days[0], days[6]) ? format(days[6], 'd일') : format(days[6], 'M월 d일')}`;

  if (sortedHabits.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] font-serif-kr">
        <p className="text-sm text-[#7A7265] dark:text-[#A89F91] mb-4">기록표에 표시할 항목이 아직 없어요.</p>
        <button onClick={onOpenCreateHabit} className="px-5 py-2.5 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] text-white text-xs font-bold inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> 항목 추가
        </button>
      </div>
    );
  }

  const todayStat = dayRate(now);
  const isWeek = view === 'week';
  // 열 너비: 화면에 다 들어가면 꽉 채우고, 안 들어가면 최소 너비로 가로 스크롤
  const minCol = isWeek ? (box.w < 640 ? 100 : 92) : box.w < 640 ? 76 : 68;
  const tableW = Math.max(box.w - 2, DATE_W + RATE_W + sortedHabits.length * minCol);

  const segBtn = (active: boolean) =>
    `px-3 py-2 rounded-xl flex items-center gap-1.5 transition ${
      active ? 'bg-[#C23B22] text-white shadow-xs' : 'text-[#5C5549] dark:text-[#C5BEB3] hover:bg-white dark:hover:bg-[#1A1816]'
    }`;
  const seg = 'flex items-center gap-1 bg-[#F3EFE6] dark:bg-[#25221F] p-1 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C] text-xs font-bold';
  const line = 'border-[#E8E2D5] dark:border-[#2C2824]';

  return (
    <div className="font-serif-kr pb-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-[#F3EFE6] dark:bg-[#25221F] p-1 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C]">
            <button onClick={goPrev} className="p-2 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-white dark:hover:bg-[#1A1816]" title="이전">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-1 text-sm font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] min-w-[92px] text-center whitespace-nowrap">{rangeLabel}</span>
            <button onClick={goNext} className="p-2 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-white dark:hover:bg-[#1A1816]" title="다음">
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isCurrentRange && (
              <button onClick={() => setAnchor(new Date())} className="text-xs text-[#C23B22] font-semibold px-2 whitespace-nowrap">
                오늘
              </button>
            )}
          </div>
          <div className={seg}>
            <button onClick={() => setView('week')} className={segBtn(isWeek)}>주</button>
            <button onClick={() => setView('month')} className={segBtn(!isWeek)}>월</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={seg}>
            <button onClick={() => setQuickMode(false)} className={segBtn(!quickMode)}>
              <PenLine className="w-3.5 h-3.5" /> 기록
            </button>
            <button onClick={() => setQuickMode(true)} className={segBtn(quickMode)}>
              <Zap className="w-3.5 h-3.5" /> 빠른 체크
            </button>
          </div>
          <button
            onClick={() => setOrderMode((v) => !v)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition ${
              orderMode
                ? 'bg-[#2C2723] dark:bg-[#E6E1DA] text-white dark:text-[#1A1816] border-transparent'
                : 'border-[#E2DBD0] dark:border-[#38332C] text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]'
            }`}
            title="항목 순서 바꾸기"
          >
            {orderMode ? <Check className="w-3.5 h-3.5" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
            <span>{orderMode ? '완료' : '순서'}</span>
          </button>
          <button
            onClick={() => setExportOpen(true)}
            className="px-3 py-2.5 rounded-xl text-xs font-bold border border-[#E2DBD0] dark:border-[#38332C] text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] flex items-center gap-1"
            title="구글 시트로 내보내기"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">내보내기</span>
          </button>
          <button onClick={onOpenCreateHabit} className="px-3 py-2.5 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] text-white text-xs font-bold flex items-center gap-1" title="항목 추가">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">항목</span>
          </button>
        </div>
      </div>

      {/* 오늘 요약 + 안내 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2.5 text-[11px] text-[#7A7265] dark:text-[#A89F91]">
        {todayStat.rate !== null && (
          <span className="text-xs font-bold text-[#2C2723] dark:text-[#E6E1DA]">
            오늘 {todayStat.done}/{todayStat.total} · {todayStat.rate}%
          </span>
        )}
        <span>
          {orderMode
            ? '항목 이름을 끌어다 놓거나 ◀ ▶로 순서를 바꾸세요'
            : quickMode
            ? '칸을 누를 때마다 달성 ↔ 비달성'
            : '칸을 누르면 달성 여부와 그날 한 일을 적을 수 있어요'}
          {!orderMode && (canL || canR) && (box.w < 640 ? ' · 표를 옆으로 밀면 다른 항목이 보여요' : ' · 항목 이름 줄에서 휠을 굴리면 좌우로 움직여요')}
        </span>
      </div>

      {/* Table */}
      <div className="relative">
        {canL && (
          <button
            onClick={() => scrollCols(-1)}
            className="absolute top-1.5 z-40 w-7 h-7 rounded-full bg-[#2C2723]/75 hover:bg-[#2C2723] text-white flex items-center justify-center shadow"
            style={{ left: DATE_W + RATE_W + 6 }}
            title="왼쪽 항목 보기"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {canR && (
          <button
            onClick={() => scrollCols(1)}
            className="absolute right-1.5 top-1.5 z-40 w-7 h-7 rounded-full bg-[#2C2723]/75 hover:bg-[#2C2723] text-white flex items-center justify-center shadow"
            title="오른쪽 항목 보기"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <div
          ref={scrollRef}
          onScroll={updateScrollHints}
          style={{ height: isWeek ? undefined : box.h, maxHeight: box.h, scrollPaddingLeft: DATE_W + RATE_W }}
          className={`rounded-2xl border ${line} bg-[#FCFAF6] dark:bg-[#1A1816] overflow-auto overscroll-contain ${box.w < 640 ? 'snap-x snap-proximity' : ''}`}
        >
          <table className="border-separate border-spacing-0 text-xs table-fixed" style={{ width: tableW }}>
            <colgroup>
              <col style={{ width: DATE_W }} />
              <col style={{ width: RATE_W }} />
              {sortedHabits.map((h) => (
                <col key={h.id} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className={`sticky top-0 left-0 z-30 bg-[#F3EFE6] dark:bg-[#25221F] border-b-2 border-r ${line} px-2 py-2 text-left font-bold text-[#5C5549] dark:text-[#C5BEB3]`}>
                  날짜
                </th>
                <th
                  className={`sticky top-0 z-30 bg-[#F3EFE6] dark:bg-[#25221F] border-b-2 border-r-2 ${line} px-1 py-2 font-bold text-[#5C5549] dark:text-[#C5BEB3] text-[11px]`}
                  style={{ left: DATE_W }}
                >
                  달성
                </th>
                {sortedHabits.map((h, ci) => (
                  <th
                    key={h.id}
                    draggable
                    onDragStart={(e) => {
                      setDragId(h.id);
                      e.dataTransfer.effectAllowed = 'move';
                      try {
                        e.dataTransfer.setData('text/plain', h.id);
                      } catch {}
                    }}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      if (overId !== h.id) setOverId(h.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) moveHabit(dragId, h.id);
                      setDragId(null);
                      setOverId(null);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    className={`snap-start sticky top-0 z-20 border-b-2 border-r ${line} px-1.5 py-2 font-bold text-[#2C2723] dark:text-[#E6E1DA] align-bottom cursor-grab active:cursor-grabbing select-none ${
                      ci % 2 ? 'bg-[#EEE9DF] dark:bg-[#221F1C]' : 'bg-[#F3EFE6] dark:bg-[#25221F]'
                    } ${dragId === h.id ? 'opacity-40' : ''} ${overId === h.id && dragId && dragId !== h.id ? 'shadow-[inset_3px_0_0_#C23B22,inset_-3px_0_0_#C23B22]' : ''}`}
                  >
                    {orderMode && (
                      <div className="flex items-center justify-between mb-1 text-[#8A8174]">
                        <button onClick={() => shiftHabit(h.id, -1)} className="w-6 h-6 rounded-md hover:bg-white dark:hover:bg-[#1A1816] flex items-center justify-center" title="왼쪽으로">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <GripVertical className="w-3.5 h-3.5" />
                        <button onClick={() => shiftHabit(h.id, 1)} className="w-6 h-6 rounded-md hover:bg-white dark:hover:bg-[#1A1816] flex items-center justify-center" title="오른쪽으로">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => !orderMode && onEditHabit(h)}
                      className="block w-full text-center text-[12px] leading-tight break-keep hover:text-[#C23B22]"
                      title={orderMode ? '끌어서 옮기기' : `${h.title} 수정 (끌어서 순서 변경)`}
                    >
                      {h.title}
                      {h.trackOnly && <span className="block text-[9px] font-normal text-[#8A8174] mt-0.5">기록만</span>}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const ds = format(d, 'yyyy-MM-dd');
                const today = isToday(d);
                const future = isAfter(d, now);
                const dow = d.getDay();
                const weekEnd = dow === 0 && view === 'month';
                const dr = dayRate(d);
                const rowLine = weekEnd ? 'border-b-2 border-b-[#CFC6B5] dark:border-b-[#4A433B]' : `border-b ${line}`;
                const dateColor = today
                  ? 'bg-[#C23B22] text-white'
                  : `bg-[#FCFAF6] dark:bg-[#1A1816] ${
                      future
                        ? 'text-[#B8AF9F] dark:text-[#5C5549]'
                        : dow === 0
                        ? 'text-[#C23B22]'
                        : dow === 6
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-[#2C2723] dark:text-[#E6E1DA]'
                    }`;
                return (
                  <tr key={ds} ref={today ? todayRowRef : undefined}>
                    <td className={`sticky left-0 z-10 border-r ${line} ${rowLine} px-2 whitespace-nowrap font-bold ${isWeek ? 'py-3' : 'py-0'} ${dateColor}`}>
                      {format(d, 'd')}
                      <span className={`ml-1 font-normal text-[11px] ${today ? 'text-white/85' : 'opacity-60'}`}>{format(d, 'EEE', { locale: ko })}</span>
                    </td>
                    <td
                      className={`sticky z-10 border-r-2 ${line} ${rowLine} text-center font-bold text-[11px] ${future ? 'bg-[#FCFAF6] dark:bg-[#1A1816]' : rateBg(dr.rate)}`}
                      style={{ left: DATE_W }}
                    >
                      {!future && dr.rate !== null ? `${dr.rate}%` : ''}
                    </td>
                    {sortedHabits.map((h, ci) => {
                      const log = logMap.get(`${ds}_${h.id}`);
                      const done = !h.trackOnly && !!log?.completed;
                      const scheduled = isHabitScheduledOnDate(h, d);
                      const target = h.targetCount || 1;
                      const partial = !h.trackOnly && !done && (log?.currentCount || 0) > 0;
                      const written = !!h.trackOnly && !!log?.notes; // 기록만 항목: 글을 적은 날은 달성처럼 칠함
                      const bg = done || written
                        ? 'bg-orange-400 dark:bg-orange-600 text-[#3A1D08] dark:text-white'
                        : partial
                        ? 'bg-orange-200 dark:bg-orange-900 text-[#3A1D08] dark:text-orange-100'
                        : !scheduled && !h.trackOnly
                        ? 'bg-[repeating-linear-gradient(135deg,transparent_0_5px,rgba(138,129,116,.13)_5px_6px)]'
                        : today
                        ? 'bg-[#C23B22]/[0.06]'
                        : ci % 2
                        ? 'bg-[#F6F2EA] dark:bg-[#1D1B19]'
                        : '';
                      return (
                        <td
                          key={h.id}
                          onClick={() => handleCellClick(h, ds)}
                          className={`border-r ${line} ${rowLine} px-1.5 align-middle cursor-pointer hover:shadow-[inset_0_0_0_2px_rgba(194,59,34,.45)] ${bg}`}
                          title={log?.notes || undefined}
                        >
                          <div
                            className={`flex items-center justify-center gap-1 text-center leading-snug ${
                              isWeek ? 'min-h-[64px] text-[12px]' : 'h-[28px] text-[11px]'
                            }`}
                          >
                            {done && log?.subitem && <span className="font-bold shrink-0">{log.subitem}</span>}
                            {partial && <span className="font-bold shrink-0">{log!.currentCount}/{target}</span>}
                            {log?.notes && (
                              <span className={`${isWeek ? 'line-clamp-4 whitespace-pre-line' : 'truncate'} break-all min-w-0`}>{log.notes}</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className={`sticky bottom-0 left-0 z-30 bg-[#F3EFE6] dark:bg-[#25221F] border-r border-t-2 ${line} px-2 py-1.5 font-bold text-[#5C5549] dark:text-[#C5BEB3] text-[11px]`}>
                  {isWeek ? '이번 주' : '이달'}
                </td>
                <td className={`sticky bottom-0 z-30 bg-[#F3EFE6] dark:bg-[#25221F] border-r-2 border-t-2 ${line}`} style={{ left: DATE_W }} />
                {sortedHabits.map((h) => {
                  const st = habitStats.get(h.id)!;
                  if (h.trackOnly) {
                    return (
                      <td key={h.id} className={`sticky bottom-0 z-20 bg-[#F3EFE6] dark:bg-[#25221F] border-r border-t-2 ${line} px-1 py-1.5 text-center text-[11px] text-[#7A7265] dark:text-[#A89F91]`}>
                        {st.written}일 기록
                      </td>
                    );
                  }
                  const rate = st.scheduled > 0 ? Math.min(100, Math.round((st.done / st.scheduled) * 100)) : null;
                  const g = calcGrade(rate ?? 0);
                  return (
                    <td key={h.id} className={`sticky bottom-0 z-20 bg-[#F3EFE6] dark:bg-[#25221F] border-r border-t-2 ${line} px-1 py-1.5 text-center`}>
                      <span className="font-bold text-[#2C2723] dark:text-[#E6E1DA]">{st.done}</span>
                      <span className="text-[#8A8174]">/{st.scheduled}</span>
                      {rate !== null && <span className={`ml-1 text-[10px] font-bold ${g.color.split(' ')[0]}`}>{rate}%</span>}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {exportOpen && (
          <ExportModal
            habits={sortedHabits}
            logs={logs}
            rangeStart={days[0]}
            rangeEnd={days[days.length - 1]}
            rangeLabel={rangeLabel}
            allStart={startDay}
            onClose={() => setExportOpen(false)}
          />
        )}
        {editing && (
          <CellEditor
            key={editing.date + editing.habit.id}
            habit={editing.habit}
            date={editing.date}
            log={logMap.get(`${editing.date}_${editing.habit.id}`)}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const CellEditor: React.FC<{
  habit: Habit;
  date: string;
  log?: HabitLog;
  onClose: () => void;
}> = ({ habit, date, log, onClose }) => {
  const target = habit.targetCount || 1;
  const [done, setDone] = useState<boolean>(!!log?.completed);
  const [count, setCount] = useState<number>(log?.currentCount || 0);
  const [notes, setNotes] = useState(log?.notes || '');
  const subs = habit.subcategories || [];
  const [sub, setSub] = useState<string | undefined>(log?.subitem || subs[0]);
  const d = new Date(date + 'T00:00:00');

  const save = () => {
    if (habit.trackOnly) setCellRecord(habit, date, 'none', notes);
    else setCellRecord(habit, date, done ? 'done' : 'none', notes, done && subs.length ? sub : undefined, count);
    onClose();
  };

  const changeCount = (n: number) => {
    const c = Math.max(0, Math.min(target * 2, n));
    setCount(c);
    setDone(c >= target);
  };

  const pick = (v: boolean) => {
    setDone(v);
    setCount(v ? Math.max(count, target) : 0);
  };

  const btn = (active: boolean, activeCls: string) =>
    `flex-1 py-3 rounded-xl text-sm font-bold border transition ${
      active ? activeCls : 'border-[#E2DBD0] dark:border-[#38332C] text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]'
    }`;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] rounded-t-3xl sm:rounded-3xl p-5 font-serif-kr shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[11px] text-[#8A8174]">{format(d, 'M월 d일 (EEE)', { locale: ko })}</div>
            <div className="text-base font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">{habit.title}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#8A8174] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!habit.trackOnly && (
          <>
            <div className="flex gap-2 mb-3">
              <button onClick={() => pick(true)} className={btn(done, 'bg-orange-400 border-orange-400 text-[#3A1D08]')}>
                ✓ 달성
              </button>
              <button onClick={() => pick(false)} className={btn(!done, 'bg-[#2C2723] dark:bg-[#E6E1DA] border-transparent text-white dark:text-[#1A1816]')}>
                비달성
              </button>
            </div>

            {target > 1 && (
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs text-[#7A7265] dark:text-[#A89F91]">
                  횟수 (목표 {target}
                  {habit.unit || '회'})
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => changeCount(count - 1)} className="w-8 h-8 rounded-lg border border-[#E2DBD0] dark:border-[#38332C] flex items-center justify-center text-[#5C5549] dark:text-[#C5BEB3]">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-12 text-center text-sm font-bold text-[#2C2723] dark:text-[#E6E1DA]">
                    {count}/{target}
                  </span>
                  <button onClick={() => changeCount(count + 1)} className="w-8 h-8 rounded-lg border border-[#E2DBD0] dark:border-[#38332C] flex items-center justify-center text-[#5C5549] dark:text-[#C5BEB3]">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {done && subs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {subs.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSub(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      sub === s ? 'border-orange-500 text-orange-600 bg-orange-500/10' : 'border-[#E2DBD0] dark:border-[#38332C] text-[#7A7265]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          autoFocus
          rows={3}
          placeholder={habit.trackOnly ? '예: 7:10' : '그날 한 일을 적어 두세요 (선택)\n예: 6-2, 모의고사 오답노트'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
          }}
          className="w-full rounded-2xl border border-[#E2DBD0] dark:border-[#38332C] bg-white dark:bg-[#201D1A] px-3.5 py-3 text-sm text-[#2C2723] dark:text-[#E6E1DA] placeholder:text-[#B0A797] focus:outline-none focus:ring-2 focus:ring-orange-400/40 resize-none"
        />

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-[#E2DBD0] dark:border-[#38332C] text-[#5C5549] dark:text-[#C5BEB3]">
            취소
          </button>
          <button onClick={save} className="flex-[2] py-2.5 rounded-xl text-sm font-bold bg-[#C23B22] hover:bg-[#A82E18] text-white">
            저장
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ExportModal: React.FC<{
  habits: Habit[];
  logs: HabitLog[];
  rangeStart: Date;
  rangeEnd: Date;
  rangeLabel: string;
  allStart: Date;
  onClose: () => void;
}> = ({ habits, logs, rangeStart, rangeEnd, rangeLabel, allStart, onClose }) => {
  const [scope, setScope] = useState<'range' | 'all'>('range');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const today = startOfDay(new Date());

  const getRows = () => {
    const start = scope === 'all' ? allStart : rangeStart;
    let end = scope === 'all' ? today : rangeEnd;
    if (isAfter(end, today) && !isAfter(start, today)) end = today; // 앞으로 올 날은 빼고
    return buildRows(habits, logs, start, end);
  };
  const title = `습관 기록표 ${scope === 'all' ? `${format(allStart, 'yyyy.M.d')}-${format(today, 'M.d')}` : rangeLabel}`;

  const toSheets = async () => {
    setBusy(true);
    setResult(null);
    const r = await exportToGoogleSheets(title, getRows());
    setResult(r);
    setBusy(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toTSV(getRows()));
      setCopied('복사했어요. 구글 시트의 A1 칸을 누르고 붙여넣기(Ctrl+V) 하세요.');
    } catch {
      setCopied('복사가 막혀 있어요. 구글 시트로 바로 만들기를 써 주세요.');
    }
  };

  const opt = (v: 'range' | 'all', label: string) => (
    <button
      onClick={() => { setScope(v); setResult(null); setCopied(null); }}
      className={`flex-1 py-2.5 rounded-xl text-xs font-bold border ${
        scope === v ? 'border-[#C23B22] text-[#C23B22] bg-[#C23B22]/10' : 'border-[#E2DBD0] dark:border-[#38332C] text-[#5C5549] dark:text-[#C5BEB3]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] rounded-t-3xl sm:rounded-3xl p-5 font-serif-kr shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-base font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">구글 시트로 내보내기</div>
            <div className="text-[11px] text-[#8A8174] mt-0.5">날짜별로 달성(O)과 적어 둔 글이 한 칸에 들어가요</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#8A8174] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {opt('range', `지금 보는 기간 (${rangeLabel})`)}
          {opt('all', '전체 기록')}
        </div>

        <button
          onClick={toSheets}
          disabled={busy}
          className="w-full py-3 rounded-xl text-sm font-bold bg-[#188038] hover:bg-[#137333] disabled:opacity-60 text-white flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          {busy ? '만드는 중…' : '구글 시트로 바로 만들기'}
        </button>
        <p className="text-[11px] text-[#8A8174] mt-1.5 mb-3">내 구글 드라이브에 새 시트가 만들어져요. 이 컴퓨터에는 아무것도 저장되지 않아요.</p>

        {result && result.ok && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">
            시트를 만들었어요.{' '}
            {result.url && (
              <a href={result.url} target="_blank" rel="noreferrer" className="font-bold underline inline-flex items-center gap-1">
                열기 <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
        {result && result.ok === false && <div className="mb-3 p-3 rounded-xl bg-[#C23B22]/10 text-[#8F220F] dark:text-[#F0A08F] text-xs">{result.message}</div>}

        <button
          onClick={copy}
          className="w-full py-2.5 rounded-xl text-sm font-bold border border-[#E2DBD0] dark:border-[#38332C] text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" /> 표 복사하기 (시트에 직접 붙여넣기)
        </button>
        {copied && <p className="text-[11px] text-[#7A7265] dark:text-[#A89F91] mt-1.5">{copied}</p>}
      </motion.div>
    </motion.div>
  );
};
