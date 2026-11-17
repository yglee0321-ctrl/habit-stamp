export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ...

export type FrequencyType = 'specific_days' | 'weekly_target' | 'monthly_target';

export type HabitImportance = 'low' | 'normal' | 'high' | 'critical';

export type GradeLevel = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface HabitCategory {
  id: string;
  name: string;
  color: string; // Tailwind color class or hex
  icon: string;  // Lucide icon name
  isDefault?: boolean;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description?: string;
  categoryId: string;
  frequencyType?: FrequencyType; // 'specific_days' | 'weekly_target' | 'monthly_target'
  targetDays: DayOfWeek[]; // [0,1,2,3,4,5,6] for daily or specific days
  frequencyTargetCount?: number; // e.g. 3 for "주 3회", 10 for "월 10회"
  targetCount: number; // Daily session target: e.g. 1 time, 8 glasses of water, 30 mins
  unit?: string; // e.g. "회", "분", "잔", "페이지"
  timeOfDay?: 'anytime' | 'morning' | 'afternoon' | 'evening';
  importance?: HabitImportance; // 'low' (0.5x) | 'normal' (1.0x, default) | 'high' (1.5x) | 'critical' (2.0x)
  weight?: number; // Custom numeric weight (default 1.0)
  subcategories?: string[]; // Subcategories list to cycle stamps (e.g. ['상체', '하체', '유산소'])
  stampShape?: 'square' | 'circle' | 'rounded'; // Stamp seal shape
  stampText?: string; // Stamp character (e.g. "完", "참잘했어요", "通", "必", "성공")
  reminderEnabled: boolean;
  reminderTime?: string; // "08:30"
  color: string;
  icon: string;
  order: number;
  archived?: boolean;
  trackOnly?: boolean; // 기록만 하는 항목 (달성률 계산에서 제외)
  createdAt: number;
  updatedAt: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  completed: boolean;
  currentCount: number;
  targetCount: number;
  subitem?: string; // Currently stamped subcategory if available
  notes?: string;
  missed?: boolean; // 시트에서 X로 표시한 날
  completedAt?: number;
}

export interface WeekStats {
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
  completedDays: number;
  targetDays: number;
  rate: number;
  grade: GradeLevel;
  hanjaGrade: string;
}

export interface HabitMonthlyReport {
  habitId: string;
  habitTitle: string;
  categoryName: string;
  color: string;
  stampText: string;
  importance?: HabitImportance;
  weight?: number;
  weeks: WeekStats[];
  monthlyCompleted: number;
  monthlyTarget: number;
  monthlyRate: number;
  monthlyGrade: GradeLevel;
  monthlyHanjaGrade: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string | null;
  photoURL?: string | null;
  friendCode: string;
  bio?: string;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  isPublic: boolean;
  createdAt: number;
  lastActiveAt: number;
}

export interface Friend {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  friendCode: string;
  currentStreak: number;
  todayCompletedCount: number;
  todayTotalHabits: number;
  lastActiveAt?: number;
  addedAt: number;
}

export interface CheerNotification {
  id: string;
  fromUid: string;
  fromName: string;
  fromPhoto?: string | null;
  targetHabitTitle?: string;
  emoji: string;
  message: string;
  createdAt: number;
  read: boolean;
}

export interface SocialFeedItem {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  type: 'streak_milestone' | 'habit_completed' | 'all_completed' | 'custom_cheer';
  habitTitle?: string;
  streakCount?: number;
  message: string;
  emoji: string;
  createdAt: number;
  likes: string[]; // array of userIds
}

export interface DayProgress {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "월", "화" etc.
  totalHabits: number;
  completedHabits: number;
  completionRate: number; // 0 to 100
}

export interface CategoryStat {
  categoryId: string;
  categoryName: string;
  color: string;
  totalScheduled: number;
  completed: number;
  rate: number;
}
