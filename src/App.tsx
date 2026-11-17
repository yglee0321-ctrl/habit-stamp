import React, { useState, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/Header';
import { WeeklyInsights } from './components/WeeklyInsights';
import { MonthlyReportView } from './components/MonthlyReportView';
import { SheetView } from './components/SheetView';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { HabitModal } from './components/HabitModal';
import { PlanImportModal, PlanAnalysisHabit } from './components/PlanImportModal';
import { Habit, HabitCategory, DayOfWeek } from './types';
import { DEFAULT_CATEGORIES, getCategoryStyle } from './lib/categories';
import { DynamicIcon } from './components/DynamicIcon';
import {
  saveHabit,
  saveHabitsBatch,
  deleteHabit,
  calculateStreakStats,
} from './lib/storage';
import * as cloud from './lib/cloud';
import { askConfirm } from './lib/ui';
import { LoginScreen } from './components/AccountUI';
import { format } from 'date-fns';

type Tab = 'insights' | 'report' | 'sheet' | 'categories';

// 사용자의 구글 시트 항목으로 만든 시작 세트
const STARTER_HABITS: Partial<Habit>[] = [
  { title: '기상시간', description: '일어난 시각을 적어 두기', categoryId: 'routine', stampText: '起', icon: 'Sunrise', color: 'cyan', timeOfDay: 'morning', trackOnly: true },
  { title: '일본어공부', description: '공부한 범위를 적어 두기', categoryId: 'learning', stampText: '日', icon: 'BookOpen', color: 'sky' },
  { title: '화학공부', description: '공부한 범위를 적어 두기 (예: 6-2)', categoryId: 'learning', stampText: '化', icon: 'BookOpen', color: 'indigo' },
  { title: '액츄에이터 프로젝트', categoryId: 'productivity', stampText: '械', icon: 'Briefcase', color: 'amber' },
  { title: '개인 프로젝트', categoryId: 'productivity', stampText: '作', icon: 'Sparkles', color: 'violet' },
  { title: '뉴스/관심사 탐구', categoryId: 'learning', stampText: '聞', icon: 'BookOpen', color: 'teal' },
  { title: '요리/식단', categoryId: 'routine', stampText: '食', icon: 'Coffee', color: 'amber' },
  { title: '게임', categoryId: 'hobby', stampText: '遊', icon: 'Trophy', color: 'rose' },
  { title: '여가', categoryId: 'mindfulness', stampText: '休', icon: 'Moon', color: 'violet' },
  { title: '운동', categoryId: 'health', stampText: '動', icon: 'Activity', color: 'emerald' },
  { title: '기타', categoryId: 'hobby', stampText: '他', icon: 'Sparkles', color: 'rose' },
];

function useCloud() {
  useSyncExternalStore(cloud.subscribeStore, cloud.getStoreVersion);
  const st = cloud.getState();
  return st;
}

function HabitTrackerApp() {
  const store = useCloud();
  const habits = useMemo(() => store.habits.filter((h) => !h.archived), [store.habits, cloud.getStoreVersion()]);
  const logs = useMemo(() => cloud.getAllLogs(), [cloud.getStoreVersion()]);
  const categories = store.categories && store.categories.length > 0 ? store.categories : DEFAULT_CATEGORIES;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<Tab>('sheet');

  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isPlanImportOpen, setIsPlanImportOpen] = useState(false);

  useEffect(() => {
    cloud.initCloud();
  }, []);

  // 기록만 하는 항목은 달성률·연속 기록 계산에서 제외
  const statHabits = useMemo(() => habits.filter((h) => !h.trackOnly), [habits]);
  const streakStats = useMemo(() => calculateStreakStats(statHabits, logs), [statHabits, logs]);

  // Category handlers
  const handleAddCategory = (newCat: Omit<HabitCategory, 'id'>) => {
    cloud.setCategories([...categories, { ...newCat, id: `cat_${Date.now()}`, isDefault: false }]);
  };
  const handleUpdateCategory = (updatedCat: HabitCategory) => {
    cloud.setCategories(categories.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
  };
  const handleDeleteCategory = (catId: string) => {
    cloud.setCategories(categories.filter((c) => c.id !== catId));
  };
  const handleResetCategories = async () => {
    if (await askConfirm('기본 카테고리 목록으로 초기화할까요?', '초기화')) {
      cloud.setCategories(DEFAULT_CATEGORIES);
    }
  };



  const handleSaveHabit = async (habitData: Partial<Habit>) => {
    await saveHabit(habitData);
  };

  const handleDeleteHabit = async (habitId: string) => {
    await deleteHabit('me', habitId);
  };

  const handleBatchImportHabits = async (imported: PlanAnalysisHabit[], replaceExisting: boolean) => {
    await saveHabitsBatch(
      imported.map((item) => ({
        ...item,
        targetDays: (item.targetDays && item.targetDays.length > 0 ? item.targetDays : [0, 1, 2, 3, 4, 5, 6]) as DayOfWeek[],
        categoryId: item.categoryId || 'routine',
      })) as Partial<Habit>[],
      replaceExisting
    );
    setActiveTab('sheet');
    setSelectedDate(new Date());
  };

  const handleUseStarter = async () => {
    await saveHabitsBatch(STARTER_HABITS, false);
  };



  const syncLabel =
    store.status === 'ready' ? '☁ 저장됨' : store.status === 'loading' ? '불러오는 중…' : store.status === 'nodb' ? '저장 안 됨' : '연결 끊김';

  if (store.auth === 'signedOut') return <LoginScreen />;

  if (store.auth === 'unknown' || (store.status === 'loading' && !store.habitsLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFAF6] dark:bg-[#121110]">
        <div className="text-center font-serif-kr">
          <div className="w-14 h-14 mx-auto mb-3 rounded-xl border-[3px] border-[#C23B22] text-[#C23B22] flex items-center justify-center text-2xl font-black animate-pulse">印</div>
          <p className="text-xs text-[#8A8174]">기록을 불러오는 중…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFAF6] dark:bg-[#121110] text-[#2C2723] dark:text-[#E6E1DA] transition-colors duration-200 flex flex-col font-sans">
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenPlanImport={cloud.IS_WEB ? undefined : () => setIsPlanImportOpen(true)}
        currentStreak={streakStats.currentStreak}
        syncLabel={syncLabel}
      />

      {(store.status === 'nodb' || store.status === 'error' || store.errorMessage) && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-2xl border border-[#C23B22]/30 bg-[#C23B22]/10 text-[#8F220F] dark:text-[#F0A08F] px-4 py-3 text-xs font-serif-kr">
            {store.status === 'nodb'
              ? '지금은 기록이 저장되지 않아요. Claude에 로그인한 상태로 이 앱을 열어야 기록이 저장돼요.'
              : store.errorMessage}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {habits.length === 0 && activeTab === 'sheet' && (
          <div className="mb-5 p-5 rounded-3xl border border-dashed border-[#C23B22]/40 bg-[#C23B22]/[0.04] font-serif-kr">
            <div className="text-sm font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA] mb-1">처음 오셨네요</div>
            <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mb-3 leading-relaxed">
              구글 시트에 쓰던 항목(기상시간, 일본어공부, 화학공부, 액츄에이터 프로젝트, 개인 프로젝트, 뉴스/관심사 탐구, 요리/식단, 게임, 여가, 운동, 기타)으로 바로 시작할 수 있어요. 나중에 자유롭게 고치거나 지울 수 있어요.
            </p>
            <button onClick={handleUseStarter} className="px-4 py-2.5 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] text-white text-xs font-bold">
              시트 항목으로 시작하기
            </button>
          </div>
        )}

        {activeTab === 'sheet' && (
          <SheetView
            habits={habits}
            logs={logs}
            categories={categories}
            currentDate={selectedDate}
            onOpenCreateHabit={() => {
              setEditingHabit(null);
              setIsHabitModalOpen(true);
            }}
            onEditHabit={(habit) => {
              setEditingHabit(habit);
              setIsHabitModalOpen(true);
            }}
          />
        )}

        {activeTab === 'report' && (
          <MonthlyReportView
            habits={statHabits}
            logs={logs}
            categories={categories}
            currentDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('sheet');
            }}
          />
        )}

        {activeTab === 'insights' && (
          <WeeklyInsights
            habits={statHabits}
            logs={logs}
            categories={categories}
            currentStreak={streakStats.currentStreak}
            longestStreak={streakStats.longestStreak}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('sheet');
            }}
          />
        )}

        {activeTab === 'categories' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#FCFAF6] dark:bg-[#1A1816] border border-[#E8E2D5] dark:border-[#2C2824] shadow-xs font-serif-kr">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E8E2D5] dark:border-[#2C2824]">
              <div>
                <h2 className="text-xl font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">습관 카테고리 관리</h2>
                <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mt-0.5">습관을 성격별로 정리하고 직접 추가, 수정, 삭제하세요</p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] text-white text-xs font-bold shadow-xs transition"
              >
                + 카테고리 관리
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {categories.map((cat) => {
                const habitCount = habits.filter((h) => h.categoryId === cat.id).length;
                const style = getCategoryStyle(cat.color);
                return (
                  <div
                    key={cat.id}
                    className="p-4 rounded-2xl border border-[#E8E2D5] dark:border-[#2C2824] bg-white dark:bg-[#201D1A] flex items-center justify-between hover:border-[#D4CCA9] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${style.lightBg} ${style.text} border ${style.border}`}>
                        <DynamicIcon name={cat.icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">{cat.name}</span>
                        <span className="text-xs text-[#8A8174] block mt-0.5">{habitCount}개의 습관 연결됨</span>
                      </div>
                    </div>
                    <button onClick={() => setIsCategoryModalOpen(true)} className="text-xs text-[#C23B22] hover:underline font-semibold">
                      관리
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#E8E2D5] dark:border-[#2C2824] py-6 mt-8 text-center text-xs text-[#8A8174] font-serif-kr">
        <p>습관 도장 (印) • 기록은 본인 계정에서만 볼 수 있어요</p>
      </footer>

      <HabitModal
        isOpen={isHabitModalOpen}
        onClose={() => {
          setIsHabitModalOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
        editingHabit={editingHabit}
        categories={categories}
        onOpenCategoryManager={() => {
          setIsHabitModalOpen(false);
          setIsCategoryModalOpen(true);
        }}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        onResetDefaults={handleResetCategories}
      />

      <PlanImportModal
        isOpen={isPlanImportOpen}
        onClose={() => setIsPlanImportOpen(false)}
        categories={categories}
        onBatchImport={handleBatchImportHabits}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <HabitTrackerApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}
