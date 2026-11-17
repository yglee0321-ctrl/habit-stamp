import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sun,
  Moon,
  Bell,
  User as UserIcon,
  Users,
  BarChart3,
  CheckSquare,
  FileSpreadsheet,
  Database,
  Layers,
  Sparkles,
  Smartphone,
  MoreVertical,
  Globe,
  Table2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { AccountMenu } from './AccountUI';
import { format, isToday, addDays, subDays } from 'date-fns';
import { ko } from 'date-fns/locale';

interface HeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  activeTab: 'insights' | 'report' | 'sheet' | 'categories';
  setActiveTab: (tab: 'insights' | 'report' | 'sheet' | 'categories') => void;
  onOpenPlanImport?: () => void;
  syncLabel?: string;
  currentStreak: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate,
  onDateChange,
  activeTab,
  setActiveTab,
  onOpenPlanImport,
  syncLabel,
  currentStreak,
}) => {
  const { isDark, setTheme } = useTheme();
  const { language, toggleLanguage, t, isKorean } = useLanguage();
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);

  const isCurrentToday = isToday(selectedDate);
  const formattedDate = isKorean
    ? format(selectedDate, 'M월 d일 (EEE)', { locale: ko })
    : format(selectedDate, 'MMM d (EEE)');

  return (
    <header className="sticky top-0 z-30 bg-[#FCFAF6]/95 dark:bg-[#1A1816]/95 backdrop-blur-md border-b border-[#E8E2D5] dark:border-[#2C2824] transition-colors font-sans safe-top">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top bar: Brand, Streak, Install, Theme, User */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border-2 border-[#C23B22] text-[#C23B22] bg-[#FDF5F2] dark:bg-[#2A1715] flex items-center justify-center font-bold font-serif-kr text-sm sm:text-base shadow-xs shrink-0">
              {t.stampDone || '印'}
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold font-batang text-base sm:text-xl text-[#2C2723] dark:text-[#E6E1DA] tracking-tight">
                  {t.appTitle}
                </span>
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-serif-kr font-medium px-2 py-0.5 rounded-full bg-[#C23B22]/10 text-[#C23B22] dark:text-[#E0472D] border border-[#C23B22]/20">
                  {t.appSubtitle}
                </span>
              </div>
              <p className="text-[11px] font-serif-kr text-[#7A7265] dark:text-[#A89F91] hidden lg:block">
                {t.appTagline}
              </p>
            </div>
          </div>

          {/* Center: Streak & Date quick navigator (visible on desktop) */}
          <div className={`${activeTab === 'sheet' ? 'hidden' : 'hidden lg:flex'} items-center gap-2 bg-[#F3EFE6] dark:bg-[#25221F] p-1 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C]`}>
            <button
              id="header-prev-day-btn"
              onClick={() => onDateChange(subDays(selectedDate, 1))}
              className="p-1.5 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-white dark:hover:bg-[#1A1816] transition"
              title={t.prevDay}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-2 text-xs font-serif-kr font-bold text-[#2C2723] dark:text-[#E6E1DA]">
              <CalendarIcon className="w-3.5 h-3.5 text-[#C23B22]" />
              <span>{formattedDate}</span>
              {isCurrentToday && (
                <span className="text-[10px] bg-[#C23B22] text-white font-bold px-1.5 py-0.2 rounded-sm">
                  {t.today}
                </span>
              )}
            </div>
            <button
              id="header-next-day-btn"
              onClick={() => onDateChange(addDays(selectedDate, 1))}
              className="p-1.5 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-white dark:hover:bg-[#1A1816] transition"
              title={t.nextDay}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {!isCurrentToday && (
              <button
                id="header-today-jump-btn"
                onClick={() => onDateChange(new Date())}
                className="text-xs text-[#C23B22] font-serif-kr font-semibold px-2 py-1 hover:underline"
              >
                {t.today}
              </button>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Streak Counter Badge */}
            <div
              className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#F3EFE6] dark:bg-[#25221F] border border-[#E2DBD0] dark:border-[#38332C] text-[#C23B22] font-serif-kr font-bold text-xs shadow-2xs shrink-0"
              title={`${currentStreak} ${t.streakDays}`}
            >
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C23B22] fill-[#C23B22] animate-pulse shrink-0" />
              <span className="hidden sm:inline">{currentStreak} {t.streakDays}</span>
              <span className="sm:hidden">{currentStreak}{t.streakDaysShort}</span>
            </div>

            {/* Language Toggle Button (Quick Switcher) */}
            <button
              id="language-toggle-btn"
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] border border-[#E2DBD0] dark:border-[#38332C] transition font-serif-kr text-xs font-bold shrink-0 active:scale-95"
              title={language === 'ko' ? 'Switch to English' : '한국어로 전환'}
            >
              <Globe className="w-3.5 h-3.5 text-[#C23B22]" />
              <span>{language === 'ko' ? 'EN' : 'KR'}</span>
            </button>

            {/* AI Plan / PDF Import Button (visible on md+) */}
            {onOpenPlanImport && <button
              id="plan-import-header-btn"
              onClick={onOpenPlanImport}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C23B22]/40 bg-[#C23B22]/10 hover:bg-[#C23B22]/20 text-[#C23B22] dark:text-[#E0472D] transition font-serif-kr cursor-pointer text-xs font-bold shadow-2xs"
              title={t.importPlan}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C23B22]" />
              <span>{t.importPlan}</span>
            </button>}

            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-1.5 sm:p-2 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition shrink-0"
              title={isDark ? t.themeToggleLight : t.themeToggleDark}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#5C5549]" />}
            </button>

            {/* Mobile More (···) Menu for secondary actions */}
            <div className="relative md:hidden shrink-0">
              <button
                onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
                className="p-1.5 rounded-xl text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition"
                title={t.moreMenu}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMobileMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMobileMoreMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-52 bg-[#FCFAF6] dark:bg-[#1A1816] rounded-2xl shadow-xl border border-[#E8E2D5] dark:border-[#2C2824] py-1.5 z-50 text-xs font-serif-kr">
                    <button
                      onClick={() => {
                        setShowMobileMoreMenu(false);
                        toggleLanguage();
                      }}
                      className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 text-[#5C5549] dark:text-[#D4CEC3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]"
                    >
                      <Globe className="w-4 h-4 text-[#C23B22]" />
                      <span>{language === 'ko' ? 'Language: English' : '언어: 한국어'}</span>
                    </button>
{onOpenPlanImport && (                    <button
                      onClick={() => {
                        setShowMobileMoreMenu(false);
                        onOpenPlanImport!();
                      }}
                      className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 text-[#5C5549] dark:text-[#D4CEC3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]"
                    >
                      <Sparkles className="w-4 h-4 text-[#C23B22]" />
                      <span>{t.importPlan}</span>
                    </button>)}
                  </div>
                </>
              )}
            </div>

            {syncLabel && (
              <span className="hidden sm:inline text-[11px] font-serif-kr text-[#8A8174] dark:text-[#A89F91] shrink-0">{syncLabel}</span>
            )}
            <AccountMenu />
          </div>
        </div>

        {/* Mobile Date Switcher Row - Only shown when NOT on the daily tracker tab to prevent double date navigators */}
        {activeTab !== 'sheet' && (
          <div className="lg:hidden flex items-center justify-between py-1.5 border-t border-[#E8E2D5] dark:border-[#2C2824] font-serif-kr">
            <button
              onClick={() => onDateChange(subDays(selectedDate, 1))}
              className="p-1 text-[#5C5549] dark:text-[#C5BEB3]"
              title={t.prevDay}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C2723] dark:text-[#E6E1DA]">
              <CalendarIcon className="w-3 h-3 text-[#C23B22]" />
              <span>{formattedDate}</span>
              {isCurrentToday && (
                <span className="text-[10px] bg-[#C23B22] text-white font-bold px-1 py-0.2 rounded-sm">
                  {t.today}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {!isCurrentToday && (
                <button
                  onClick={() => onDateChange(new Date())}
                  className="text-xs text-[#C23B22] font-semibold"
                >
                  {t.today}
                </button>
              )}
              <button
                onClick={() => onDateChange(addDays(selectedDate, 1))}
                className="p-1 text-[#5C5549] dark:text-[#C5BEB3]"
                title={t.nextDay}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs - with no-scrollbar for smooth touch scroll */}
        <nav className="flex space-x-1 sm:space-x-3 border-t border-[#E8E2D5] dark:border-[#2C2824] pt-0.5 sm:pt-1 font-serif-kr overflow-x-auto no-scrollbar">
          <button
            id="tab-sheet-btn"
            onClick={() => setActiveTab('sheet')}
            className={`flex items-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'sheet'
                ? 'border-[#C23B22] text-[#C23B22] dark:text-[#E0472D]'
                : 'border-transparent text-[#7A7265] hover:text-[#2C2723] dark:text-[#A89F91] dark:hover:text-white'
            }`}
          >
            <Table2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t.tabSheet}</span>
          </button>

          <button
            id="tab-report-btn"
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'report'
                ? 'border-[#C23B22] text-[#C23B22] dark:text-[#E0472D]'
                : 'border-transparent text-[#7A7265] hover:text-[#2C2723] dark:text-[#A89F91] dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t.tabReport}</span>
            <span className="sm:hidden">{t.tabReportShort}</span>
          </button>

          <button
            id="tab-insights-btn"
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'insights'
                ? 'border-[#C23B22] text-[#C23B22] dark:text-[#E0472D]'
                : 'border-transparent text-[#7A7265] hover:text-[#2C2723] dark:text-[#A89F91] dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t.tabInsights}</span>
          </button>

          <button
            id="tab-categories-btn"
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'categories'
                ? 'border-[#C23B22] text-[#C23B22] dark:text-[#E0472D]'
                : 'border-transparent text-[#7A7265] hover:text-[#2C2723] dark:text-[#A89F91] dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{t.tabCategories}</span>
            <span className="sm:hidden">{t.tabCategoriesShort}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};

