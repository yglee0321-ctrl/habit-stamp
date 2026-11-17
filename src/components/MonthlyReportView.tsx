import React, { useState, useMemo } from 'react';
import { Habit, HabitLog, HabitCategory, GradeLevel } from '../types';
import { computeMonthlyReport, calcGrade, getWeeksInMonth, getDailyCalendarStats } from '../lib/storage';
import { StampSeal } from './StampSeal';
import {
  ChevronLeft,
  ChevronRight,
  Award,
  Calendar,
  Download,
  Sparkles,
  TrendingUp,
  CheckCircle,
  FileSpreadsheet,
  CalendarDays,
  ArrowRight,
  Star,
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface MonthlyReportViewProps {
  habits: Habit[];
  logs: HabitLog[];
  categories: HabitCategory[];
  currentDate?: Date;
  onSelectDate?: (date: Date) => void;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  habits,
  logs,
  categories,
  currentDate = new Date(),
  onSelectDate,
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed
  const [viewMode, setViewMode] = useState<'both' | 'calendar' | 'table'>('both');

  // Navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Compute monthly report
  const { reports, overallGrade, overallHanjaGrade, overallRate } = useMemo(() => {
    return computeMonthlyReport(habits, logs, selectedYear, selectedMonth);
  }, [habits, logs, selectedYear, selectedMonth]);

  const weeks = useMemo(() => {
    return getWeeksInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Compute full daily calendar stats
  const calendarDays = useMemo(() => {
    return getDailyCalendarStats(habits, logs, selectedYear, selectedMonth);
  }, [habits, logs, selectedYear, selectedMonth]);

  const monthLabel = `${selectedYear}년 ${selectedMonth + 1}월`;
  const gradeInfo = calcGrade(overallRate);

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Month Navigation & Breadcrumb Header */}
      <div className="p-6 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs font-serif-kr">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#C23B22] dark:text-[#E0472D] mb-1">
              <span>서당 성적표 (月間 報告書)</span>
              <span className="text-[#A89F91]">/</span>
              <span>일별 성취도 달력 & 주차별 성적표</span>
            </div>
            <h2 className="text-2xl font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] flex items-center gap-2">
              <span>{monthLabel} 습관 성취도 리포트</span>
            </h2>
            <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mt-1">
              달력의 날짜를 누르면 해당 일자의 습관 도장 화면으로 바로 이동하여 과거 기록을 채울 수 있습니다.
            </p>
          </div>

          {/* Month Stepper & Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-[#F3EFE6] dark:bg-[#25221F] p-1 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C]">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-[#302B26] text-[#5C5549] dark:text-[#D4CEC3] transition"
                title="이전 달"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleCurrentMonth}
                className="px-3 font-bold text-xs text-[#2C2723] dark:text-[#E6E1DA] hover:underline"
                title="이번 달로 이동"
              >
                {selectedMonth + 1}월 (이번달)
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-[#302B26] text-[#5C5549] dark:text-[#D4CEC3] transition"
                title="다음 달"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            
          </div>
        </div>

        {/* Overall Grade Banner */}
        <div className="mt-6 p-5 rounded-2xl bg-[#F8F4EC] dark:bg-[#23201D] border border-[#E8E2D5] dark:border-[#2C2824] flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {/* Grand Seal Stamp for Overall Month Grade */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl border-2 border-[#C23B22] text-[#C23B22] bg-[#FDF7F5] dark:bg-[#2D1A18] flex flex-col items-center justify-center shadow-xs">
                <span className="text-xl font-black leading-none">{overallHanjaGrade}</span>
                <span className="text-[10px] font-bold mt-0.5">{overallGrade}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#C23B22]/10 text-[#C23B22] dark:text-[#E0472D] border border-[#C23B22]/20">
                  {gradeInfo.label}
                </span>
                <span className="text-xs text-[#7A7265] dark:text-[#A89F91]">
                  월간 종합 달성률 {overallRate}%
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  중요도 가중치 반영
                </span>
              </div>
              <h3 className="text-base font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] mt-1">
                {overallRate >= 85
                  ? '훌륭한 정진입니다! 한 달 동안 꾸준한 습관 도장을 완성하셨습니다.'
                  : overallRate >= 60
                  ? '꾸준히 실천해 나가고 있습니다. 조금만 더 도장을 찍어보세요!'
                  : '새로운 마음가짐으로 한 걸음씩 인장을 찍어나가 보세요.'}
              </h3>
            </div>
          </div>

          {/* Mini Stats Pill */}
          <div className="flex items-center gap-4 text-xs text-[#5C5549] dark:text-[#C5BEB3] bg-white/60 dark:bg-black/20 p-3 rounded-xl border border-[#E8E2D5] dark:border-[#2C2824]">
            <div className="text-center px-2">
              <span className="block text-[10px] text-[#8A8174]">관리 습관</span>
              <strong className="text-sm font-bold text-[#2C2723] dark:text-[#E6E1DA]">{habits.length}개</strong>
            </div>
            <div className="w-px h-6 bg-[#E8E2D5] dark:bg-[#2C2824]" />
            <div className="text-center px-2">
              <span className="block text-[10px] text-[#8A8174]">해당 월 주차수</span>
              <strong className="text-sm font-bold text-[#2C2723] dark:text-[#E6E1DA]">{weeks.length}주</strong>
            </div>
          </div>
        </div>
      </div>

      {/* MONTHLY CALENDAR: DAILY ACHIEVEMENT GRID */}
      <div className="bg-[#FCFAF6] dark:bg-[#1A1816] rounded-3xl border border-[#E8E2D5] dark:border-[#2C2824] p-6 shadow-xs font-serif-kr">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-batang font-bold text-lg text-[#2C2723] dark:text-[#E6E1DA] flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#C23B22]" />
              <span>{monthLabel} 일별 성취도 달력</span>
            </h3>
            <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mt-0.5">
              각 날짜를 클릭하면 해당 일자의 도장 기록 페이지로 이동하여 습관을 확인하거나 누락된 도장을 찍을 수 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#8A8174]">
            <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" /> 100%
            <span className="inline-block w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40" /> 50%~
            <span className="inline-block w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/40" /> 미달
          </div>
        </div>

        {/* 7 Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
          {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
            <div
              key={dayName}
              className={`text-center py-2 text-xs font-bold ${
                idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-[#7A7265] dark:text-[#A89F91]'
              }`}
            >
              {dayName}
            </div>
          ))}

          {calendarDays.map((d) => {
            const hasScheduled = d.totalScheduled > 0;
            const isFullyDone = hasScheduled && d.totalCompleted === d.totalScheduled;

            let bgColor = 'bg-white dark:bg-[#201D1A] border-[#E8E2D5] dark:border-[#2C2824]';
            if (hasScheduled && d.rate >= 90) {
              bgColor = 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40';
            } else if (hasScheduled && d.rate >= 50) {
              bgColor = 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40';
            } else if (hasScheduled && d.totalCompleted > 0) {
              bgColor = 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30';
            }

            return (
              <button
                key={d.dateStr}
                onClick={() => onSelectDate && onSelectDate(d.date)}
                disabled={!onSelectDate}
                className={`min-h-[90px] sm:min-h-[105px] p-2 rounded-2xl border flex flex-col justify-between text-left transition relative group hover:border-[#C23B22] hover:shadow-md ${bgColor} ${
                  !d.isCurrentMonth ? 'opacity-35' : 'opacity-100'
                } ${d.isToday ? 'ring-2 ring-[#C23B22]' : ''}`}
                title={`${d.dateStr}: ${d.totalCompleted}/${d.totalScheduled} 완료 (${d.rate}%) - 클릭하여 이동`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-bold font-batang ${
                      d.isToday
                        ? 'bg-[#C23B22] text-white px-1.5 py-0.2 rounded-md'
                        : d.date.getDay() === 0
                        ? 'text-rose-500'
                        : d.date.getDay() === 6
                        ? 'text-blue-500'
                        : 'text-[#2C2723] dark:text-[#E6E1DA]'
                    }`}
                  >
                    {d.dayNumber}
                  </span>

                  {hasScheduled && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                        d.rate >= 85
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300'
                          : d.rate >= 50
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300'
                          : 'bg-[#F3EFE6] text-[#7A7265] dark:bg-[#25221F] dark:text-[#A89F91] border-[#E2DBD0]'
                      }`}
                    >
                      {d.hanjaGrade} ({d.rate}%)
                    </span>
                  )}
                </div>

                {/* Stamps preview inside day */}
                <div className="my-1 space-y-1">
                  {hasScheduled ? (
                    <div className="flex flex-wrap gap-1 items-center">
                      {d.completedStamps.slice(0, 3).map((st, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded border border-[#C23B22] text-[#C23B22] dark:border-[#E0472D] dark:text-[#E0472D] bg-[#FDF5F2] dark:bg-[#2A1715] flex items-center justify-center text-[9px] font-bold shadow-2xs"
                          title={st.title}
                        >
                          {st.stampText}
                        </div>
                      ))}
                      {d.completedStamps.length > 3 && (
                        <span className="text-[9px] font-bold text-[#8A8174]">
                          +{d.completedStamps.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#A89F91]">계획 없음</span>
                  )}
                </div>

                {/* Bottom count & hover prompt */}
                <div className="flex items-center justify-between text-[10px] text-[#8A8174]">
                  <span>
                    {hasScheduled ? `${d.totalCompleted}/${d.totalScheduled}개` : '-'}
                  </span>
                  <span className="text-[#C23B22] opacity-0 group-hover:opacity-100 transition flex items-center">
                    이동 <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Habit by Habit Grade Matrix Table */}
      <div className="bg-[#FCFAF6] dark:bg-[#1A1816] rounded-3xl border border-[#E8E2D5] dark:border-[#2C2824] p-6 shadow-xs overflow-hidden font-serif-kr">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-batang font-bold text-lg text-[#2C2723] dark:text-[#E6E1DA] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#C23B22]" />
            <span>습관별 주차 등급 및 월간 성적표</span>
          </h3>
          <span className="text-xs text-[#7A7265] dark:text-[#A89F91]">
            등급 기준: 秀(95%↑) · 優(85%↑) · 美(70%↑) · 良(55%↑) · 可(40%↑) · 落(&lt;40%)
          </span>
        </div>

        {reports.length === 0 ? (
          <div className="p-8 text-center text-[#7A7265] dark:text-[#A89F91] text-sm">
            등록된 습관이 없습니다. 새 습관을 추가해보세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8E2D5] dark:border-[#2C2824] text-[11px] text-[#7A7265] dark:text-[#A89F91] uppercase tracking-wider">
                  <th className="py-3 px-3">습관 명칭 (인장)</th>
                  {weeks.map((w) => (
                    <th key={w.weekNumber} className="py-3 px-2 text-center">
                      <div>{w.label}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center">월간 실천 / 목표</th>
                  <th className="py-3 px-3 text-center">달성률</th>
                  <th className="py-3 px-3 text-center">월간 등급</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D5] dark:divide-[#2C2824] text-xs">
                {reports.map((report) => (
                  <tr
                    key={report.habitId}
                    className="hover:bg-[#F8F4EC]/60 dark:hover:bg-[#23201D]/60 transition"
                  >
                    {/* Habit Title + Stamp Seal preview */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md border border-[#C23B22] text-[#C23B22] dark:border-[#E0472D] dark:text-[#E0472D] flex items-center justify-center font-bold text-[11px] bg-[#FDF5F2] dark:bg-[#2A1715] shrink-0">
                          {report.stampText || '完'}
                        </div>
                        <div>
                          <span className="font-bold text-[#2C2723] dark:text-[#E6E1DA] block font-batang text-sm">
                            {report.habitTitle}
                          </span>
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded border mt-0.5 ${
                            report.importance === 'critical'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40'
                              : report.importance === 'high'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                              : report.importance === 'low'
                              ? 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40'
                          }`}>
                            <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                            <span>
                              {report.importance === 'critical' ? '핵심' : report.importance === 'high' ? '중요' : report.importance === 'low' ? '가벼움' : '보통'} ({report.weight}x)
                            </span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Week-by-Week Grade Pills */}
                    {report.weeks.map((w) => (
                      <td key={w.weekNumber} className="py-3.5 px-2 text-center">
                        <div className="inline-flex flex-col items-center justify-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              w.grade === 'A+' || w.grade === 'A'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : w.grade === 'B'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                                : w.grade === 'C'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            }`}
                            title={`${w.completedDays} / ${w.targetDays}회 실천 (${w.rate}%)`}
                          >
                            {w.hanjaGrade} ({w.grade})
                          </span>
                          <span className="text-[10px] text-[#8A8174] mt-0.5">
                            {w.completedDays}/{w.targetDays}회
                          </span>
                        </div>
                      </td>
                    ))}

                    {/* Monthly Completed / Target */}
                    <td className="py-3.5 px-3 text-center font-semibold text-[#2C2723] dark:text-[#E6E1DA]">
                      {report.monthlyCompleted} / {report.monthlyTarget}회
                    </td>

                    {/* Monthly Rate Progress */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-bold text-xs">{report.monthlyRate}%</span>
                        <div className="w-12 bg-[#E8E2D5] dark:bg-[#2C2824] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#C23B22] h-full"
                            style={{ width: `${report.monthlyRate}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Final Monthly Grade Stamp */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-lg border-2 border-[#C23B22] text-[#C23B22] dark:border-[#E0472D] dark:text-[#E0472D] bg-[#FDF5F2] dark:bg-[#2A1715]">
                        <span>{report.monthlyHanjaGrade}</span>
                        <span className="text-[11px]">({report.monthlyGrade})</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
