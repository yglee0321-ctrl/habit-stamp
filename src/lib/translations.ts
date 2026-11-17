export type Language = 'ko' | 'en';

export interface TranslationDict {
  // App General & Header
  appTitle: string;
  appSubtitle: string;
  appTagline: string;
  today: string;
  yesterday: string;
  tomorrow: string;
  prevWeek: string;
  nextWeek: string;
  prevDay: string;
  nextDay: string;
  streakDays: string;
  streakDaysShort: string;
  addToHome: string;
  addToHomeShort: string;
  importPlan: string;
  importPlanShort: string;
  backup: string;
  themeToggleLight: string;
  themeToggleDark: string;
  notificationsTitle: string;
  loginGoogle: string;
  loginShort: string;
  myProfile: string;
  moreMenu: string;
  switchLanguage: string;
  languageName: string;

  // Tabs
  tabDaily: string;
  tabDailyShort: string;
  tabReport: string;
  tabReportShort: string;
  tabInsights: string;
  tabInsightsShort: string;
  tabSocial: string;
  tabSheet: string;
  tabSocialShort: string;
  tabCategories: string;
  tabCategoriesShort: string;

  // Daily Tracker
  habitAddBtn: string;
  filterAll: string;
  filterPending: string;
  filterCompleted: string;
  sortByPriority: string;
  sortByName: string;
  completionRate: string;
  allDonePraise: string;
  noHabitsTitle: string;
  noHabitsDesc: string;
  createFirstHabit: string;
  weeklyTargetGoalMet: string;
  monthlyTargetGoalMet: string;

  // Habit Card
  clickSealToStamp: string;
  clickSealToCancel: string;
  sealLabel: string;
  subStamp: string;
  subSettings: string;
  weeklySealsHeader: string;
  clickSealToRecord: string;
  editDailyNote: string;
  addDailyNote: string;
  editHabit: string;
  deleteHabit: string;
  deleteHabitConfirm: string;
  cancel: string;
  confirm: string;
  save: string;
  weeklyProgress: string;
  monthlyProgress: string;
  importanceWeight: string;

  // Importance levels
  importanceParamount: string;
  importanceHigh: string;
  importanceNormal: string;
  importanceLow: string;

  // Frequency labels
  freqEveryday: string;
  freqWeeklyTarget: string; // e.g. "주 {n}회"
  freqMonthlyTarget: string; // e.g. "월 {n}회"
  freqCustomDays: string;

  // Subcategories modal
  subModalTitle: string;
  subModalDesc: string;
  subInputPlaceholder: string;
  subAddBtn: string;
  subItemCountNotice: string;
  subSaveBtn: string;
  subClearBtn: string;

  // Note Modal
  noteModalTitle: string;
  notePlaceholder: string;
  noteSave: string;

  // Monthly Report
  reportTitle: string;
  reportSubtitle: string;
  reportGradeTitle: string;
  reportGradeDesc: string;
  reportRate: string;
  reportWeightedScore: string;
  reportTotalStamps: string;
  reportCompletedCount: string;
  reportGradeA: string;
  reportGradeB: string;
  reportGradeC: string;
  reportGradeD: string;
  reportAlbumTitle: string;

  // Weekly Insights
  insightsTitle: string;
  insightsSubtitle: string;
  insightsConsistency: string;
  insightsNeedFocus: string;
  insightsDaysOfWeek: string[];

  // Social / Fellows
  socialTitle: string;
  socialSubtitle: string;
  socialAddFriend: string;
  socialFriendCode: string;
  socialCopyCode: string;
  socialFeed: string;
  socialCheers: string;
  socialSendCheer: string;
  socialCheerSent: string;

  // Category Manager
  catManagerTitle: string;
  catManagerSubtitle: string;
  catAddBtn: string;
  catEditBtn: string;
  catDeleteBtn: string;
  catResetBtn: string;
  catNamePlaceholder: string;

  // Stamp Seals
  stampDone: string;
  stampPass: string;
  stampSuccess: string;
  stampMax: string;
  stampLucky: string;
}

export const translations: Record<Language, TranslationDict> = {
  ko: {
    appTitle: '습관 도장',
    appSubtitle: '한지·인장 에디션',
    appTagline: '매일의 정갈한 인장으로 새기는 삶의 변화',
    today: '오늘',
    yesterday: '어제',
    tomorrow: '내일',
    prevWeek: '« 이전 주',
    nextWeek: '다음 주 »',
    prevDay: '어제',
    nextDay: '내일',
    streakDays: '일 연속',
    streakDaysShort: '일',
    addToHome: '홈 화면 추가',
    addToHomeShort: '홈 추가',
    importPlan: '계획표로 습관 생성',
    importPlanShort: '계획표 AI',
    backup: '데이터 백업 및 복원',
    themeToggleLight: '한지 라이트 모드로 전환',
    themeToggleDark: '먹물 다크 모드로 전환',
    notificationsTitle: '알림 및 친구 응원함',
    loginGoogle: 'Google 로그인',
    loginShort: '로그인',
    myProfile: '내 프로필',
    moreMenu: '더보기 메뉴',
    switchLanguage: '언어 변경 (EN/KR)',
    languageName: '한국어',

    tabDaily: '오늘의 도장',
    tabDailyShort: '오늘',
    tabReport: '월간 리포트 (성적표)',
    tabReportShort: '월간 성적표',
    tabInsights: '주간 통계',
    tabInsightsShort: '통계',
    tabSocial: '도반 (소셜)',
    tabSheet: '기록표',
    tabSocialShort: '도반',
    tabCategories: '분류 관리',
    tabCategoriesShort: '분류',

    habitAddBtn: '새 습관 만들기',
    filterAll: '전체',
    filterPending: '미완료',
    filterCompleted: '완료',
    sortByPriority: '중요도순',
    sortByName: '이름순',
    completionRate: '목표 달성률',
    allDonePraise: '오늘의 모든 습관에 인장을 마쳤습니다! 참 훌륭합니다.',
    noHabitsTitle: '등록된 습관이 없습니다',
    noHabitsDesc: '새로운 습관을 등록하고 매일 정갈한 도장을 찍어보세요.',
    createFirstHabit: '첫 습관 추가하기',
    weeklyTargetGoalMet: '주간 달성!',
    monthlyTargetGoalMet: '월간 달성!',

    clickSealToStamp: '도장을 찍어 완료',
    clickSealToCancel: '완료됨 (클릭하여 취소)',
    sealLabel: '인장',
    subStamp: '세부',
    subSettings: '설정',
    weeklySealsHeader: '주간 도장록 (월~일)',
    clickSealToRecord: '도장 클릭시 기록',
    editDailyNote: '메모 수정',
    addDailyNote: '오늘의 메모',
    editHabit: '습관 수정',
    deleteHabit: '습관 삭제',
    deleteHabitConfirm: '이 습관을 정말 삭제하시겠습니까? 기록된 도장은 유지됩니다.',
    cancel: '취소',
    confirm: '확인',
    save: '저장',
    weeklyProgress: '이번 주 실천',
    monthlyProgress: '이번 달 실천',
    importanceWeight: '가중치',

    importanceParamount: '최상',
    importanceHigh: '높음',
    importanceNormal: '보통',
    importanceLow: '기본',

    freqEveryday: '매일',
    freqWeeklyTarget: '주 {n}회 목표',
    freqMonthlyTarget: '월 {n}회 목표',
    freqCustomDays: '특정 요일',

    subModalTitle: '세부습관 (스탬프 태그) 관리',
    subModalDesc: '예: 운동(상체/하체/유산소), 독서(인문/과학/소설) 등 도장에 새길 세부 항목을 등록하세요.',
    subInputPlaceholder: '새 세부항목 (예: 상체, 챕터1)',
    subAddBtn: '추가',
    subItemCountNotice: '세부항목을 2개 이상 등록하면 도장을 클릭할 때마다 순환하며 인장에 새겨집니다.',
    subSaveBtn: '적용 완료',
    subClearBtn: '모두 지우기',

    noteModalTitle: '오늘의 실천 메모',
    notePlaceholder: '오늘 습관을 실천하며 느낀 소회나 세부 기록을 남겨보세요...',
    noteSave: '메모 저장',

    reportTitle: '월간 습관 성적표',
    reportSubtitle: '선조들의 지혜가 담긴 4단계 인장 평가와 한 달간의 발자취',
    reportGradeTitle: '조선 성균관 4단계 평가제',
    reportGradeDesc: '과거 유생들의 배움 평가(甲·乙·丙·丁) 기준을 본떠 한 달의 정성을 4단계 인장으로 환산합니다.',
    reportRate: '전체 달성률',
    reportWeightedScore: '가중치 성취 점수',
    reportTotalStamps: '누적 도장 수',
    reportCompletedCount: '완료 횟수',
    reportGradeA: '甲 (갑) - 최우수 달성 (85% 이상)',
    reportGradeB: '乙 (을) - 우수 달성 (70% ~ 84%)',
    reportGradeC: '丙 (병) - 정진 필요 (50% ~ 69%)',
    reportGradeD: '丁 (정) - 초심 회복 (50% 미만)',
    reportAlbumTitle: '이달의 도장 앨범',

    insightsTitle: '주간 실천 분석',
    insightsSubtitle: '요일별 성실도와 습관별 달성 패턴을 파악하여 균형을 맞춥니다.',
    insightsConsistency: '가장 꾸준한 요일',
    insightsNeedFocus: '더 관심이 필요한 습관',
    insightsDaysOfWeek: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],

    socialTitle: '도반 (Fellowship)',
    socialSubtitle: '뜻을 같이하는 벗들과 일상의 인장을 나누고 응원합니다.',
    socialAddFriend: '도반 추가',
    socialFriendCode: '나의 도반 코드',
    socialCopyCode: '코드 복사',
    socialFeed: '실시간 활동 피드',
    socialCheers: '응원 죽간',
    socialSendCheer: '응원 보내기',
    socialCheerSent: '응원을 보냈습니다!',

    catManagerTitle: '습관 분류 관리',
    catManagerSubtitle: '생활의 영역별로 도장을 정갈하게 분류하세요.',
    catAddBtn: '새 분류 추가',
    catEditBtn: '분류 수정',
    catDeleteBtn: '분류 삭제',
    catResetBtn: '기본값으로 복원',
    catNamePlaceholder: '분류 이름 입력...',

    stampDone: '完',
    stampPass: '通',
    stampSuccess: '成',
    stampMax: '極',
    stampLucky: '福',
  },
  en: {
    appTitle: 'Habit Seal',
    appSubtitle: 'Mindful Seal Edition',
    appTagline: 'Engraving lasting transformations with daily mindful seals.',
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    prevWeek: '« Prev Week',
    nextWeek: 'Next Week »',
    prevDay: 'Yesterday',
    nextDay: 'Tomorrow',
    streakDays: 'Days Streak',
    streakDaysShort: 'd',
    addToHome: 'Install App',
    addToHomeShort: 'Install',
    importPlan: 'AI Plan Import',
    importPlanShort: 'AI Plan',
    backup: 'Backup & Restore',
    themeToggleLight: 'Switch to Hanji Light Mode',
    themeToggleDark: 'Switch to Ink Dark Mode',
    notificationsTitle: 'Notifications & Cheers',
    loginGoogle: 'Sign in with Google',
    loginShort: 'Sign in',
    myProfile: 'Profile',
    moreMenu: 'More Menu',
    switchLanguage: 'Change Language (KR/EN)',
    languageName: 'English',

    tabDaily: 'Daily Seals',
    tabDailyShort: 'Daily',
    tabReport: 'Monthly Report (Grades)',
    tabReportShort: 'Report',
    tabInsights: 'Weekly Insights',
    tabInsightsShort: 'Insights',
    tabSocial: 'Fellowship (Social)',
    tabSheet: 'Log Sheet',
    tabSocialShort: 'Fellows',
    tabCategories: 'Categories',
    tabCategoriesShort: 'Categories',

    habitAddBtn: 'New Habit',
    filterAll: 'All',
    filterPending: 'Pending',
    filterCompleted: 'Done',
    sortByPriority: 'By Priority',
    sortByName: 'By Name',
    completionRate: 'Completion Rate',
    allDonePraise: 'All habit seals stamped for today! Outstanding discipline.',
    noHabitsTitle: 'No habits registered yet',
    noHabitsDesc: 'Create your first habit and stamp your mark of progress every day.',
    createFirstHabit: 'Add First Habit',
    weeklyTargetGoalMet: 'Weekly Goal Met!',
    monthlyTargetGoalMet: 'Monthly Goal Met!',

    clickSealToStamp: 'Click seal to stamp done',
    clickSealToCancel: 'Completed (Click to undo)',
    sealLabel: 'Seal',
    subStamp: 'Sub',
    subSettings: 'Settings',
    weeklySealsHeader: 'Weekly Stamp Journal (Mon~Sun)',
    clickSealToRecord: 'Click seal to log',
    editDailyNote: 'Edit Note',
    addDailyNote: 'Daily Note',
    editHabit: 'Edit Habit',
    deleteHabit: 'Delete Habit',
    deleteHabitConfirm: 'Are you sure you want to delete this habit? Existing logs will be preserved.',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    weeklyProgress: 'This Week',
    monthlyProgress: 'This Month',
    importanceWeight: 'Weight',

    importanceParamount: 'Paramount',
    importanceHigh: 'High',
    importanceNormal: 'Normal',
    importanceLow: 'Basic',

    freqEveryday: 'Daily',
    freqWeeklyTarget: '{n}x / week goal',
    freqMonthlyTarget: '{n}x / month goal',
    freqCustomDays: 'Custom Days',

    subModalTitle: 'Sub-habits (Stamp Tags) Settings',
    subModalDesc: 'e.g. Workout (Chest/Back/Cardio), Reading (Science/Fiction/History) to engrave into the seal.',
    subInputPlaceholder: 'New sub-tag (e.g. Upper Body, Chapter 1)',
    subAddBtn: 'Add',
    subItemCountNotice: 'When 2+ sub-items are added, clicking the seal cycles through each sub-tag onto the seal.',
    subSaveBtn: 'Save Settings',
    subClearBtn: 'Clear All',

    noteModalTitle: 'Daily Practice Reflection',
    notePlaceholder: 'Write your reflections, achievements, or details for today...',
    noteSave: 'Save Note',

    reportTitle: 'Monthly Habit Grade Report',
    reportSubtitle: 'Traditional 4-tier seal evaluation reflecting scholarly mindfulness and monthly progress',
    reportGradeTitle: 'Traditional 4-Tier Evaluation',
    reportGradeDesc: 'Modeled after historic scholarly academic assessments (甲·乙·丙·丁), grading your monthly perseverance into authentic seals.',
    reportRate: 'Overall Completion',
    reportWeightedScore: 'Weighted Achievement Score',
    reportTotalStamps: 'Total Seals Collected',
    reportCompletedCount: 'Completions',
    reportGradeA: '甲 (Grade A) - Exceptional Mastery (85%+)',
    reportGradeB: '乙 (Grade B) - Commendable Progress (70% ~ 84%)',
    reportGradeC: '丙 (Grade C) - Continued Dedication (50% ~ 69%)',
    reportGradeD: '丁 (Grade D) - Renewed Beginner Mind (Below 50%)',
    reportAlbumTitle: 'Monthly Seal Stamp Album',

    insightsTitle: 'Weekly Practice Insights',
    insightsSubtitle: 'Analyze daily consistency and habit patterns to cultivate harmonious balance.',
    insightsConsistency: 'Most Consistent Day',
    insightsNeedFocus: 'Habits Needing Attention',
    insightsDaysOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

    socialTitle: 'Fellowship (Social)',
    socialSubtitle: 'Share daily seals and walk the path of discipline alongside fellow practitioners.',
    socialAddFriend: 'Add Fellow',
    socialFriendCode: 'My Fellow Code',
    socialCopyCode: 'Copy Code',
    socialFeed: 'Live Activity Feed',
    socialCheers: 'Cheer Scrolls',
    socialSendCheer: 'Send Cheer',
    socialCheerSent: 'Cheer dispatched!',

    catManagerTitle: 'Manage Habit Categories',
    catManagerSubtitle: 'Organize your habit seals into elegant life domains.',
    catAddBtn: 'Add New Category',
    catEditBtn: 'Edit Category',
    catDeleteBtn: 'Delete Category',
    catResetBtn: 'Restore Defaults',
    catNamePlaceholder: 'Enter category name...',

    stampDone: 'DONE',
    stampPass: 'PASS',
    stampSuccess: 'OK',
    stampMax: 'MAX',
    stampLucky: 'BLESS',
  },
};
