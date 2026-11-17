import React, { useState, useEffect } from 'react';
import { HabitCategory } from '../types';
import { CATEGORY_COLORS, AVAILABLE_ICONS, getCategoryStyle } from '../lib/categories';
import { DynamicIcon } from './DynamicIcon';
import { askConfirm } from '../lib/ui';
import { X, Plus, Trash2, Layers, Check, Edit2, Save, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: HabitCategory[];
  onAddCategory: (category: Omit<HabitCategory, 'id'>) => void;
  onUpdateCategory: (category: HabitCategory) => void;
  onDeleteCategory: (id: string) => void;
  onResetDefaults?: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onResetDefaults,
}) => {
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list');
  const [editingCategory, setEditingCategory] = useState<HabitCategory | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState('emerald');
  const [icon, setIcon] = useState('Activity');

  useEffect(() => {
    if (!isOpen) {
      setMode('list');
      setEditingCategory(null);
      setName('');
      setColor('emerald');
      setIcon('Activity');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setName('');
    setColor('emerald');
    setIcon('Activity');
    setEditingCategory(null);
    setMode('add');
  };

  const handleStartEdit = (cat: HabitCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color);
    setIcon(cat.icon);
    setMode('edit');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (mode === 'add') {
      onAddCategory({
        name: name.trim(),
        color,
        icon,
      });
    } else if (mode === 'edit' && editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: name.trim(),
        color,
        icon,
      });
    }

    setMode('list');
    setEditingCategory(null);
    setName('');
  };

  const handleDelete = async (cat: HabitCategory) => {
    if (await askConfirm(`'${cat.name}' 카테고리를 삭제할까요?`, '삭제')) {
      onDeleteCategory(cat.id);
      if (editingCategory?.id === cat.id) {
        setMode('list');
        setEditingCategory(null);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="bg-[#FCFAF6] dark:bg-[#1A1816] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#E8E2D5] dark:border-[#2C2824] max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D5] dark:border-[#2C2824]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C23B22]/10 text-[#C23B22] flex items-center justify-center border border-[#C23B22]/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">
                  습관 카테고리 관리
                </h2>
                <p className="text-xs font-serif-kr text-[#7A7265] dark:text-[#A89F91]">
                  카테고리를 직접 추가, 수정, 삭제하여 분류해보세요
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#7A7265] hover:text-[#2C2723] dark:text-[#A89F91] dark:hover:text-[#E6E1DA] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form when adding or editing */}
          {mode !== 'list' ? (
            <form onSubmit={handleSave} className="mt-6 p-5 rounded-2xl bg-[#F3EFE6] dark:bg-[#25221F] border border-[#E2DBD0] dark:border-[#38332C] space-y-4 font-serif-kr">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#2C2723] dark:text-[#E6E1DA] flex items-center gap-1.5">
                  {mode === 'add' ? <Plus className="w-4 h-4 text-[#C23B22]" /> : <Edit2 className="w-4 h-4 text-[#C23B22]" />}
                  <span>{mode === 'add' ? '새 카테고리 추가' : `'${editingCategory?.name}' 카테고리 수정`}</span>
                </h3>
                <span className="text-[11px] text-[#8A8174]">
                  {mode === 'add' ? '새 항목 등록' : '정보 변경'}
                </span>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-[11px] font-bold text-[#5C5549] dark:text-[#C5BEB3] mb-1">
                  카테고리 이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 어학공부, 반려견 케어, 명상, 독서"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2DBD0] dark:border-[#38332C] bg-white dark:bg-[#1A1816] text-xs text-[#2C2723] dark:text-[#E6E1DA] focus:outline-none focus:ring-1 focus:ring-[#C23B22]"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-[11px] font-bold text-[#5C5549] dark:text-[#C5BEB3] mb-1">
                  색상 선택
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center shrink-0 transition-transform ${
                        color === c.id ? 'ring-2 ring-offset-2 ring-[#C23B22] scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {color === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-[11px] font-bold text-[#5C5549] dark:text-[#C5BEB3] mb-1">
                  아이콘 선택
                </label>
                <div className="grid grid-cols-6 gap-1.5 p-2 bg-white dark:bg-[#1A1816] rounded-xl border border-[#E2DBD0] dark:border-[#38332C] max-h-32 overflow-y-auto">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      className={`p-2 rounded-lg flex items-center justify-center transition ${
                        icon === iconName
                          ? 'bg-[#C23B22] text-white shadow-xs'
                          : 'text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F]'
                      }`}
                      title={iconName}
                    >
                      <DynamicIcon name={iconName} className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2DBD0] dark:border-[#38332C]">
                <button
                  type="button"
                  onClick={() => {
                    setMode('list');
                    setEditingCategory(null);
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-[#5C5549] dark:text-[#C5BEB3] hover:bg-[#E8E2D5] dark:hover:bg-[#302B26] rounded-xl transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-[#C23B22] hover:bg-[#A82E18] text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  {mode === 'add' ? '추가 완료' : '수정사항 저장'}
                </button>
              </div>
            </form>
          ) : (
            /* Categories List View */
            <div className="mt-6 space-y-4 font-serif-kr">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-[#2C2723] dark:text-[#E6E1DA]">
                  등록된 카테고리 목록 ({categories.length}개)
                </label>
                <button
                  onClick={handleStartAdd}
                  className="px-3 py-1.5 rounded-xl bg-[#C23B22] hover:bg-[#A82E18] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  카테고리 추가
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const style = getCategoryStyle(cat.color);
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E2D5] dark:border-[#2C2824] bg-white dark:bg-[#201D1A] hover:border-[#D4CCA9] transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${style.lightBg} ${style.text} border ${style.border}`}>
                          <DynamicIcon name={cat.icon} className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold font-batang text-[#2C2723] dark:text-[#E6E1DA]">
                              {cat.name}
                            </span>
                            {cat.isDefault && (
                              <span className="text-[10px] bg-[#F3EFE6] dark:bg-[#25221F] text-[#8A8174] px-1.5 py-0.2 rounded">
                                기본
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8A8174]">
                            색상: {style.label} · 아이콘: {cat.icon}
                          </span>
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-[#5C5549] dark:text-[#C5BEB3] hover:text-[#C23B22] hover:bg-[#F3EFE6] dark:hover:bg-[#25221F] rounded-lg transition"
                          title="카테고리 수정 (이름, 색상, 아이콘)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 text-[#8A8174] hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="카테고리 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {categories.length === 0 && (
                <div className="p-6 text-center text-xs text-[#8A8174] bg-[#F3EFE6] dark:bg-[#25221F] rounded-2xl">
                  등록된 카테고리가 없습니다. 새 카테고리를 추가해보세요.
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-[#E8E2D5] dark:border-[#2C2824] flex items-center justify-between font-serif-kr">
            {onResetDefaults ? (
              <button
                onClick={onResetDefaults}
                className="text-[11px] text-[#8A8174] hover:text-[#2C2723] dark:hover:text-[#E6E1DA] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> 기본 카테고리 복원
              </button>
            ) : <div />}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2C2723] text-white dark:bg-[#E6E1DA] dark:text-[#121110] shadow-xs"
            >
              닫기
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
