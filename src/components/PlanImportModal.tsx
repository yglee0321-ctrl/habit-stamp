import React, { useState, useRef } from 'react';
import { Habit, HabitCategory } from '../types';
import { DEFAULT_CATEGORIES, getCategoryStyle } from '../lib/categories';
import { DynamicIcon } from './DynamicIcon';
import {
  X,
  Sparkles,
  UploadCloud,
  FileText,
  FileCheck2,
  Check,
  AlertCircle,
  Clock,
  Calendar,
  Flame,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Edit3,
  BookmarkCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { SAMPLE_SCHEDULE_ANALYSIS, PLAN_SYSTEM_PROMPT } from '../lib/planSample';

export interface PlanAnalysisHabit {
  id?: string;
  title: string;
  description?: string;
  categoryId: string;
  frequencyType: 'specific_days' | 'weekly_target' | 'monthly_target';
  targetDays: number[];
  frequencyTargetCount?: number;
  targetCount: number;
  unit?: string;
  timeOfDay?: 'anytime' | 'morning' | 'afternoon' | 'evening';
  color: string;
  icon: string;
  stampText?: string;
  subcategories?: string[];
  selected?: boolean;
}

export interface PlanAnalysisResult {
  planTitle: string;
  summary: string;
  corePrinciples: string[];
  habits: PlanAnalysisHabit[];
}

interface PlanImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: HabitCategory[];
  onBatchImport: (habits: PlanAnalysisHabit[], replaceExisting: boolean) => Promise<void>;
}

export const PlanImportModal: React.FC<PlanImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  onBatchImport,
}) => {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [activeInputMode, setActiveInputMode] = useState<'file' | 'text'>('file');
  const [analysisResult, setAnalysisResult] = useState<PlanAnalysisResult | null>(null);
  const [selectedHabits, setSelectedHabits] = useState<{ [index: number]: boolean }>({});
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingHabitIndex, setEditingHabitIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadedFile(file);
      setErrorMessage(null);
    }
  };

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data:*/*;base64,
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Start analysis: either with Gemini API or Sample
  const handleAnalyze = async (useSample: boolean = false) => {
    setStep('analyzing');
    setErrorMessage(null);

    try {
      let json: any;
      if (useSample) {
        json = { data: SAMPLE_SCHEDULE_ANALYSIS };
      } else {
        const c = (window as any).claude;
        const sample = c?.use ? await c.use('sample') : null;
        if (!sample) throw new Error('지금 화면에서는 Claude 분석을 쓸 수 없어요. Claude 앱이나 웹에서 열어 주세요.');
        let prompt = PLAN_SYSTEM_PROMPT;
        const opts: any = {};
        if (activeInputMode === 'file') {
          if (!uploadedFile) throw new Error('분석할 파일(이미지 또는 텍스트)을 선택해 주세요.');
          if (uploadedFile.type.startsWith('image/')) {
            opts.images = [uploadedFile];
            prompt += '\n\n첨부한 이미지는 사용자의 계획표입니다. 꼼꼼히 읽고, 사용자가 도장을 찍으며 지켜나갈 최적의 습관들을 JSON 형식으로 추출해 주세요.';
          } else if (uploadedFile.type === 'application/pdf' || uploadedFile.name.toLowerCase().endsWith('.pdf')) {
            throw new Error('PDF는 아직 읽을 수 없어요. 계획표를 캡처한 이미지나 텍스트로 올려 주세요.');
          } else {
            const txt = await uploadedFile.text();
            prompt += `\n\n[사용자 계획표 텍스트 내용]:\n${txt.slice(0, 20000)}\n\n위 내용을 분석하여 최적의 습관들을 JSON 형식으로 추출해 주세요.`;
          }
        } else {
          if (!rawText.trim()) throw new Error('분석할 계획표 내용을 입력해 주세요.');
          prompt += `\n\n[사용자 계획표 텍스트 내용]:\n${rawText.trim().slice(0, 20000)}\n\n위 내용을 분석하여 최적의 습관들을 JSON 형식으로 추출해 주세요.`;
        }
        try {
          const parsed = await sample.json(prompt, opts);
          json = { data: parsed };
        } catch (e: any) {
          const code = e?.code;
          if (code === 'not_granted' || code === 'sampling_disabled') throw new Error('Claude 사용을 허용해야 분석할 수 있어요.');
          if (code === 'images_unavailable') throw new Error('이 화면에서는 이미지를 보낼 수 없어요. 텍스트로 붙여 넣어 주세요.');
          if (code === 'rate_limited') throw new Error('요청이 많아요. 잠시 후 다시 시도해 주세요.');
          if (code === 'invalid_json') throw new Error('분석 결과를 읽지 못했어요. 다시 시도해 주세요.');
          throw new Error('분석 중 오류가 발생했어요. 다시 시도해 주세요.');
        }
      }

      const data: PlanAnalysisResult = json.data;
      if (!data || !Array.isArray(data.habits) || data.habits.length === 0) {
        throw new Error('계획표에서 습관 항목을 추출하지 못했습니다.');
      }

      setAnalysisResult(data);

      // Select all by default
      const initialSelection: { [index: number]: boolean } = {};
      data.habits.forEach((_, idx) => {
        initialSelection[idx] = true;
      });
      setSelectedHabits(initialSelection);
      setStep('review');
    } catch (err: any) {
      console.error('Plan analyze failure:', err);
      setErrorMessage(err.message || '분석 중 오류가 발생했습니다.');
      setStep('upload');
    }
  };

  const handleToggleHabitSelection = (index: number) => {
    setSelectedHabits((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleSelectAll = (select: boolean) => {
    if (!analysisResult) return;
    const next: { [index: number]: boolean } = {};
    analysisResult.habits.forEach((_, idx) => {
      next[idx] = select;
    });
    setSelectedHabits(next);
  };

  const handleUpdateHabitField = (index: number, field: keyof PlanAnalysisHabit, value: any) => {
    if (!analysisResult) return;
    const updatedHabits = [...analysisResult.habits];
    updatedHabits[index] = {
      ...updatedHabits[index],
      [field]: value,
    };
    setAnalysisResult({
      ...analysisResult,
      habits: updatedHabits,
    });
  };

  const handleConfirmImport = async () => {
    if (!analysisResult) return;
    const selectedList = analysisResult.habits.filter((_, idx) => selectedHabits[idx]);
    if (selectedList.length === 0) {
      setErrorMessage('등록할 습관을 하나 이상 선택해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onBatchImport(selectedList, replaceExisting);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#C23B22', '#D4A373', '#2A9D8F', '#E76F51'],
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '습관 일괄 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = Object.values(selectedHabits).filter(Boolean).length;
  const totalCount = analysisResult?.habits.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-[#FAF7F0] dark:bg-[#1A1816] border border-[#E2DBD0] dark:border-[#38332C] shadow-2xl overflow-hidden text-[#2C2723] dark:text-[#E6E1DA]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2DBD0] dark:border-[#38332C] bg-[#F3EFE6]/70 dark:bg-[#201D1A]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C23B22]/10 dark:bg-[#C23B22]/20 border border-[#C23B22]/20 flex items-center justify-center text-[#C23B22]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-batang flex items-center gap-2">
                <span>계획표로 습관 자동 생성</span>
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-[#C23B22] text-white font-semibold">
                  AI 분석
                </span>
              </h2>
              <p className="text-xs text-[#7A7265] dark:text-[#A89F91] font-serif-kr">
                기존 시간표 캡처나 루틴표 글을 올리면 Claude가 읽고 실천 가능한 도장 습관으로 자동 변환합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#7A7265] hover:bg-[#E8E2D5] dark:hover:bg-[#2C2824] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-serif-kr">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Quick Sample Action Callout (Special feature for the user's PDF!) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F3EFE6] to-[#EAE4D6] dark:from-[#25221F] dark:to-[#1F1C19] border border-[#C23B22]/30 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#C23B22] font-batang">
                    <BookmarkCheck className="w-4 h-4" />
                    <span>방금 업로드해주신 예시 계획표 바로 불러오기</span>
                  </div>
                  <p className="text-xs text-[#5C5549] dark:text-[#BDB6AB] font-serif-kr">
                    첨부하신 <strong>'나의 생활 계획표 (운동·공부·커리어 루틴)'</strong>를 1초 만에 습관으로 변환해 체험해보세요.
                  </p>
                </div>
                <button
                  id="load-sample-plan-btn"
                  onClick={() => handleAnalyze(true)}
                  className="px-4 py-2 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] text-white text-xs font-bold font-serif-kr flex items-center justify-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  예시 계획표로 생성
                </button>
              </div>

              {/* Tab Selector: File Upload vs Direct Text */}
              <div className="flex border-b border-[#E2DBD0] dark:border-[#38332C]">
                <button
                  onClick={() => setActiveInputMode('file')}
                  className={`pb-2.5 px-4 text-xs font-bold font-serif-kr border-b-2 transition flex items-center gap-1.5 ${
                    activeInputMode === 'file'
                      ? 'border-[#C23B22] text-[#C23B22]'
                      : 'border-transparent text-[#7A7265] dark:text-[#A89F91] hover:text-[#2C2723]'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  파일 업로드 (이미지 / 텍스트)
                </button>
                <button
                  onClick={() => setActiveInputMode('text')}
                  className={`pb-2.5 px-4 text-xs font-bold font-serif-kr border-b-2 transition flex items-center gap-1.5 ${
                    activeInputMode === 'text'
                      ? 'border-[#C23B22] text-[#C23B22]'
                      : 'border-transparent text-[#7A7265] dark:text-[#A89F91] hover:text-[#2C2723]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  직접 텍스트 붙여넣기
                </button>
              </div>

              {activeInputMode === 'file' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    uploadedFile
                      ? 'border-[#C23B22] bg-[#C23B22]/5 dark:bg-[#C23B22]/10'
                      : 'border-[#D6CEC1] dark:border-[#423C34] hover:border-[#C23B22] bg-[#F7F4EC] dark:bg-[#201D1A]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,text/plain,.md,.txt"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {uploadedFile ? (
                    <div className="space-y-1.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center mx-auto">
                        <FileCheck2 className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-[#2C2723] dark:text-[#E6E1DA] font-serif-kr">
                        {uploadedFile.name}
                      </p>
                      <p className="text-xs text-[#7A7265] dark:text-[#A89F91]">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · 클릭하여 다른 파일로 변경
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#E8E2D5] dark:bg-[#2C2824] text-[#7A7265] dark:text-[#A89F91] flex items-center justify-center mx-auto">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#2C2723] dark:text-[#E6E1DA] font-serif-kr">
                          계획표 파일을 이곳에 드래그하거나 클릭하여 업로드
                        </p>
                        <p className="text-xs text-[#7A7265] dark:text-[#A89F91] mt-1 font-serif-kr">
                          지원 형식: 시간표 캡처 이미지(PNG, JPG), 텍스트(TXT)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#5C5549] dark:text-[#BDB6AB] font-serif-kr">
                    계획표, 시간표, 루틴 메모 붙여넣기
                  </label>
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`예시:\n08:00~08:30 출근 이동 중 JLPT 단어 암기\n헬스 주 3~4회 중량 증가\n펜싱 주 2회 필수\n매일 저녁 커리어 기사 1편 읽기\n24:00 취침 7시간 숙면 보장`}
                    rows={7}
                    className="w-full p-4 rounded-2xl border border-[#E2DBD0] dark:border-[#38332C] bg-[#F7F4EC] dark:bg-[#201D1A] text-xs font-sans focus:outline-hidden focus:ring-2 focus:ring-[#C23B22]/50"
                  />
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#E2DBD0] dark:border-[#38332C] text-xs font-serif-kr hover:bg-[#E8E2D5] dark:hover:bg-[#2C2824] transition cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => handleAnalyze(false)}
                  disabled={activeInputMode === 'file' ? !uploadedFile : !rawText.trim()}
                  className="px-6 py-2.5 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] disabled:opacity-50 text-white text-xs font-bold font-serif-kr flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  AI로 계획표 분석하기
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING */}
          {step === 'analyzing' && (
            <div className="py-16 text-center space-y-5">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-2xl border-4 border-[#C23B22]/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-2xl bg-[#C23B22] text-white flex items-center justify-center text-3xl font-bold font-batang shadow-xl">
                  印
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">
                  AI가 계획표를 정밀 분석하고 있습니다
                </h3>
                <p className="text-xs text-[#7A7265] dark:text-[#A89F91] font-serif-kr">
                  시간표, 핵심 목표, 주간 루틴을 추출하여 최적의 도장 습관으로 설계 중입니다...
                </p>
              </div>
              <div className="flex justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C23B22] animate-bounce" />
                <span
                  className="w-2 h-2 rounded-full bg-[#C23B22] animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[#C23B22] animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW & CUSTOMIZE */}
          {step === 'review' && analysisResult && (
            <div className="space-y-6">
              {/* Plan Summary Card */}
              <div className="p-4 rounded-2xl bg-[#F3EFE6] dark:bg-[#25221F] border border-[#E2DBD0] dark:border-[#38332C] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-batang font-bold text-sm text-[#C23B22] flex items-center gap-1.5">
                    <span>{analysisResult.planTitle}</span>
                  </h3>
                  <button
                    onClick={() => setStep('upload')}
                    className="text-[11px] text-[#7A7265] hover:text-[#2C2723] dark:hover:text-[#E6E1DA] flex items-center gap-1 font-serif-kr underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> 다른 계획표 분석
                  </button>
                </div>
                <p className="text-xs text-[#4A433A] dark:text-[#C5BEB3] font-serif-kr leading-relaxed">
                  "{analysisResult.summary}"
                </p>
                {analysisResult.corePrinciples && analysisResult.corePrinciples.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysisResult.corePrinciples.map((principle, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white dark:bg-[#1A1816] border border-[#E2DBD0] dark:border-[#38332C] text-[#5C5549] dark:text-[#BDB6AB] font-serif-kr"
                      >
                        ✓ {principle}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Habit Selection Controls */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold font-serif-kr text-[#2C2723] dark:text-[#E6E1DA]">
                  추출된 습관 목록 ({selectedCount}/{totalCount}개 선택됨)
                </div>
                <div className="flex items-center gap-2 text-xs font-serif-kr">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="text-[#C23B22] hover:underline font-semibold"
                  >
                    전체 선택
                  </button>
                  <span className="text-[#D6CEC1]">|</span>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="text-[#7A7265] hover:underline"
                  >
                    전체 해제
                  </button>
                </div>
              </div>

              {/* Habit Items Grid */}
              <div className="space-y-2.5">
                {analysisResult.habits.map((habit, idx) => {
                  const isChecked = !!selectedHabits[idx];
                  const category = categories.find((c) => c.id === habit.categoryId);
                  const isEditing = editingHabitIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition ${
                        isChecked
                          ? 'border-[#C23B22]/40 bg-white dark:bg-[#201D1A] shadow-xs'
                          : 'border-[#E2DBD0] dark:border-[#38332C] bg-[#F7F4EC]/60 dark:bg-[#1A1816]/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleHabitSelection(idx)}
                          className={`mt-1 w-5 h-5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                            isChecked
                              ? 'bg-[#C23B22] border-[#C23B22] text-white'
                              : 'border-[#C5BEB3] dark:border-[#4E473F] bg-transparent'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        {/* Seal Stamp Preview */}
                        <div
                          className="w-10 h-10 rounded-xl border-2 border-[#C23B22] bg-[#C23B22]/5 text-[#C23B22] flex items-center justify-center text-xs font-bold font-batang shrink-0 shadow-2xs"
                          title="습관 완료 시 찍힐 인장"
                        >
                          {habit.stampText || habit.title.slice(0, 2)}
                        </div>

                        {/* Info & Editing */}
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2 mb-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={habit.title}
                                  onChange={(e) =>
                                    handleUpdateHabitField(idx, 'title', e.target.value)
                                  }
                                  placeholder="습관 이름"
                                  className="flex-1 p-1.5 text-xs font-bold rounded-lg border border-[#E2DBD0] dark:border-[#38332C] bg-white dark:bg-[#1A1816]"
                                />
                                <input
                                  type="text"
                                  value={habit.stampText || ''}
                                  maxLength={4}
                                  onChange={(e) =>
                                    handleUpdateHabitField(idx, 'stampText', e.target.value)
                                  }
                                  placeholder="도장글자 (1~2자)"
                                  className="w-24 p-1.5 text-xs text-center font-bold rounded-lg border border-[#E2DBD0] dark:border-[#38332C] bg-white dark:bg-[#1A1816]"
                                />
                              </div>
                              <input
                                type="text"
                                value={habit.description || ''}
                                onChange={(e) =>
                                  handleUpdateHabitField(idx, 'description', e.target.value)
                                }
                                placeholder="설명 / 목표"
                                className="w-full p-1.5 text-xs rounded-lg border border-[#E2DBD0] dark:border-[#38332C] bg-white dark:bg-[#1A1816]"
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setEditingHabitIndex(null)}
                                  className="text-xs font-bold text-[#C23B22] hover:underline"
                                >
                                  수정 완료
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-[#2C2723] dark:text-[#E6E1DA] font-serif-kr">
                                  {habit.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#EAE4D6] dark:bg-[#2C2824] text-[#5C5549] dark:text-[#C5BEB3] font-semibold">
                                  {category?.name || '루틴'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingHabitIndex(idx)}
                                  className="text-[10px] text-[#7A7265] hover:text-[#C23B22] flex items-center gap-0.5 ml-auto"
                                >
                                  <Edit3 className="w-3 h-3" /> 수정
                                </button>
                              </div>

                              {habit.description && (
                                <p className="text-xs text-[#7A7265] dark:text-[#A89F91] font-serif-kr line-clamp-1">
                                  {habit.description}
                                </p>
                              )}

                              {/* Badges */}
                              <div className="flex items-center gap-2 pt-1 flex-wrap text-[11px] text-[#5C5549] dark:text-[#BDB6AB]">
                                <span className="flex items-center gap-1 font-semibold">
                                  <Calendar className="w-3 h-3 text-[#C23B22]" />
                                  {habit.frequencyType === 'weekly_target'
                                    ? `주 ${habit.frequencyTargetCount || 3}회`
                                    : habit.frequencyType === 'monthly_target'
                                    ? `월 ${habit.frequencyTargetCount || 1}회`
                                    : habit.targetDays.length === 7
                                    ? '매일'
                                    : habit.targetDays.length === 5 && !habit.targetDays.includes(0)
                                    ? '주중(월-금)'
                                    : '지정 요일'}
                                </span>

                                {habit.timeOfDay && habit.timeOfDay !== 'anytime' && (
                                  <span className="flex items-center gap-1 opacity-80">
                                    <Clock className="w-3 h-3" />
                                    {habit.timeOfDay === 'morning'
                                      ? '아침'
                                      : habit.timeOfDay === 'afternoon'
                                      ? '오후'
                                      : '저녁'}
                                  </span>
                                )}

                                {habit.subcategories && habit.subcategories.length > 0 && (
                                  <span className="text-[10px] opacity-75">
                                    세부: {habit.subcategories.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Import Mode Options */}
              <div className="p-4 rounded-2xl bg-[#F3EFE6]/70 dark:bg-[#25221F]/70 border border-[#E2DBD0] dark:border-[#38332C] space-y-2 text-xs font-serif-kr">
                <div className="font-bold text-[#2C2723] dark:text-[#E6E1DA]">등록 방식 선택:</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={!replaceExisting}
                    onChange={() => setReplaceExisting(false)}
                    className="accent-[#C23B22]"
                  />
                  <span>기존에 등록되어 있던 습관을 유지하면서 추가하기 (권장)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[#7A7265] dark:text-[#A89F91]">
                  <input
                    type="radio"
                    name="importMode"
                    checked={replaceExisting}
                    onChange={() => setReplaceExisting(true)}
                    className="accent-[#C23B22]"
                  />
                  <span>기존 습관을 모두 지우고 이번 계획표로 새롭게 시작하기</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2.5 rounded-xl border border-[#E2DBD0] dark:border-[#38332C] text-xs font-serif-kr hover:bg-[#E8E2D5] dark:hover:bg-[#2C2824] transition cursor-pointer"
                >
                  이전 단계
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedCount === 0 || isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] disabled:opacity-50 text-white text-xs font-bold font-serif-kr flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>등록 처리 중...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>선택한 {selectedCount}개 습관 내 도장판에 등록하기</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
