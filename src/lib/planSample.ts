export const SAMPLE_SCHEDULE_ANALYSIS = {
  planTitle: "나의 생활 계획표",
  summary: "오늘의 묵묵한 루틴이 복학 후 압도적인 차이를 만든다 (복학 전 피지컬 & GPA 4.0 베이스)",
  corePrinciples: [
    "7시간 숙면 보장 (23:00 정리 → 24:00 취침)",
    "출퇴근 틈새시간 JLPT 회독앱 고정",
    "퇴근 후 운동/펜싱 미루지 않고 즉시 직행",
    "요일별 커리어 기사 1편 (10~15분)",
    "주 1회 요리 & 신제품 성분표 탐구",
  ],
  habits: [
    {
      title: "헬스장 운동 (중량 증량)",
      description: "주 3~4회 퇴근 후 직행, 3대 운동 및 중량 증가 목표",
      categoryId: "health",
      frequencyType: "weekly_target",
      targetDays: [1, 3, 5, 6],
      frequencyTargetCount: 4,
      targetCount: 1,
      unit: "회",
      timeOfDay: "evening",
      color: "emerald",
      icon: "Activity",
      stampText: "헬스",
      subcategories: ["가슴/등", "하체/어깨", "유산소"],
    },
    {
      title: "펜싱 훈련 (최소 주 2회)",
      description: "화/목 저녁 레슨 & 집중 풋워크 훈련",
      categoryId: "health",
      frequencyType: "weekly_target",
      targetDays: [2, 4],
      frequencyTargetCount: 2,
      targetCount: 1,
      unit: "회",
      timeOfDay: "evening",
      color: "amber",
      icon: "Flame",
      stampText: "펜싱",
      subcategories: ["기본기", "대련", "체력"],
    },
    {
      title: "복근 & 유산소 루틴 (주 2회)",
      description: "주 2회 이상 병합 루틴 및 체지방 관리",
      categoryId: "health",
      frequencyType: "weekly_target",
      targetDays: [2, 5],
      frequencyTargetCount: 2,
      targetCount: 1,
      unit: "회",
      timeOfDay: "evening",
      color: "teal",
      icon: "Sparkles",
      stampText: "복근",
    },
    {
      title: "출퇴근 JLPT 회독앱 암기",
      description: "출근(08:00~08:30) & 퇴근(16:30~17:00) 이동 중 한자/단어 암기 고정",
      categoryId: "learning",
      frequencyType: "specific_days",
      targetDays: [1, 2, 3, 4, 5],
      targetCount: 1,
      unit: "회",
      timeOfDay: "morning",
      color: "sky",
      icon: "BookOpen",
      stampText: "일어",
    },
    {
      title: "요일별 커리어 기사 1편 읽기",
      description: "월/목 Food Science, 화/금 Engineering, 수 Medical 기사 읽기 (10~15분)",
      categoryId: "productivity",
      frequencyType: "specific_days",
      targetDays: [1, 2, 3, 4, 5],
      targetCount: 1,
      unit: "편",
      timeOfDay: "afternoon",
      color: "indigo",
      icon: "Briefcase",
      stampText: "기사",
      subcategories: ["식품(월/목)", "화공(화/금)", "의료(수)"],
    },
    {
      title: "고단백 아침식사 & 썬크림",
      description: "기상 및 출근 준비 루틴 (고단백 아침식사, 썬크림 필수 도포)",
      categoryId: "routine",
      frequencyType: "specific_days",
      targetDays: [0, 1, 2, 3, 4, 5, 6],
      targetCount: 1,
      unit: "회",
      timeOfDay: "morning",
      color: "cyan",
      icon: "Sunrise",
      stampText: "식단",
    },
    {
      title: "7시간 숙면 보장 (24:00 취침)",
      description: "23:00 침실 정리 및 스마트폰 침대 밖 거치 → 24:00 취침",
      categoryId: "routine",
      frequencyType: "specific_days",
      targetDays: [0, 1, 2, 3, 4, 5, 6],
      targetCount: 1,
      unit: "회",
      timeOfDay: "evening",
      color: "violet",
      icon: "Moon",
      stampText: "수면",
    },
    {
      title: "주말 요리 1개 & 성분표 탐구",
      description: "토요일 주 1회 요리 도전 & 신제품 시식 성분표 분석",
      categoryId: "hobby",
      frequencyType: "specific_days",
      targetDays: [6],
      targetCount: 1,
      unit: "회",
      timeOfDay: "afternoon",
      color: "rose",
      icon: "Coffee",
      stampText: "요리",
    },
    {
      title: "월 1회 주식 계좌 점검 & 적립 매수",
      description: "월 1회 계좌 점검 및 적립식 ETF 매수",
      categoryId: "productivity",
      frequencyType: "monthly_target",
      targetDays: [0, 1, 2, 3, 4, 5, 6],
      frequencyTargetCount: 1,
      targetCount: 1,
      unit: "회",
      timeOfDay: "anytime",
      color: "amber",
      icon: "Trophy",
      stampText: "투자",
    },
  ],
};

export const PLAN_SYSTEM_PROMPT = `당신은 사용자의 계획표(시간표, 루틴표, 목표 리스트, 주간 체크리스트, 생활 계획서 등)를 정밀하게 분석하여 '습관 도장 트래커' 앱에서 실천할 수 있는 최적의 습관 항목들로 변환해주는 습관 설계 전문가입니다.

업로드된 계획표 문서나 이미지를 분석하여 아래 JSON 포맷으로 응답하세요.

[요구사항]
1. planTitle: 계획표의 핵심 제목 (예: "나의 생활 계획표", "2026 복학 준비 루틴")
2. summary: 계획표 전체의 목표나 모토 1-2문장
3. corePrinciples: 계획표에서 강조하는 핵심 가치나 운영 원칙 3~5개 문자열 배열
4. habits: 사용자가 매일 또는 주간 단위로 도장을 찍으며 실천할 수 있는 구체적인 습관 리스트 (보통 5~10개).
   각 습관 객체 필수 필드:
   - title: 명확하고 실천적인 습관명 (예: "헬스장 운동 (중량 증량)", "출퇴근 JLPT 회독앱 단어 암기")
   - description: 시간대, 구체적 실행 지침이나 목표
   - categoryId: 다음 중 가장 적합한 카테고리 ID: "health"(건강/운동), "learning"(학습/독서), "productivity"(업무/생산성/커리어/재테크), "mindfulness"(마음챙김/휴식), "routine"(생활루틴/수면/식단), "hobby"(취미/창작)
   - frequencyType: "specific_days"(특정 요일) | "weekly_target"(주 N회 목표) | "monthly_target"(월 N회 목표)
   - targetDays: 실천하는 요일 번호 배열 (0:일, 1:월, 2:화, 3:수, 4:목, 5:금, 6:토). 매일인 경우 [0,1,2,3,4,5,6], 주중인 경우 [1,2,3,4,5]
   - frequencyTargetCount: weekly_target인 경우 목표 횟수 숫자 (예: 주 3~4회면 4, 주 2회면 2)
   - targetCount: 1회 실천 시 카운트 (기본 1)
   - unit: 단위 ("회", "편", "시간", "분" 등)
   - timeOfDay: "anytime" | "morning" | "afternoon" | "evening"
   - color: "emerald" | "sky" | "indigo" | "amber" | "cyan" | "rose" | "violet" | "teal"
   - icon: "Activity" | "BookOpen" | "Briefcase" | "Heart" | "Droplets" | "Sparkles" | "Flame" | "Moon" | "Coffee" | "Sunrise" | "Trophy"
   - stampText: 한국 전통 도장에 새길 1~2글자의 강렬한 인장 한글/한자 단어 (예: "헬스", "펜싱", "일어", "기사", "수면", "식단", "요리", "투자", "독서", "성공", "完")
   - subcategories: (선택) 세부 종목이나 요일별 순환 항목이 있다면 문자열 배열 (예: ["식품", "화공", "의료"] 또는 ["가슴", "등", "하체"])

반드시 유효한 JSON 문자열만 반환하세요.`;
