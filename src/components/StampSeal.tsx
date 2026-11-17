import React from 'react';
import { motion } from 'motion/react';

interface StampSealProps {
  text?: string;
  subitem?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'square' | 'circle' | 'rounded';
  completed?: boolean;
  color?: string; // Optional custom color or default to red seal
  onClick?: () => void;
  className?: string;
  interactive?: boolean;
}

export const StampSeal: React.FC<StampSealProps> = ({
  text = '完',
  subitem,
  size = 'md',
  shape = 'square',
  completed = false,
  color,
  onClick,
  className = '',
  interactive = true,
}) => {
  const displayText = subitem || text || '完';

  // Sizing definitions - optimized for mobile touch targets (min 44px on mobile)
  const sizeClasses = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-12 h-12 sm:w-11 sm:h-11 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-lg',
  };

  const shapeClasses = {
    square: 'rounded-lg',
    rounded: 'rounded-xl',
    circle: 'rounded-full',
  };

  // If not completed and interactive, show faint ink outline or dashed stamp placeholder
  if (!completed) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        className={`group relative flex flex-col items-center justify-center border-2 border-dashed border-[#C23B22]/30 hover:border-[#C23B22]/70 dark:border-white/20 dark:hover:border-[#E0472D]/60 bg-transparent hover:bg-[#C23B22]/5 transition-all duration-200 ${
          sizeClasses[size]
        } ${shapeClasses[shape]} ${interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} ${className}`}
        title="도장 찍기"
      >
        <span className="font-serif-kr text-[#C23B22]/40 dark:text-gray-500 group-hover:text-[#C23B22] font-semibold text-[11px] transition-colors">
          인장
        </span>
      </button>
    );
  }

  // When completed, render the stamped red seal with organic rotation & ink stamp look
  const isMultiChar = displayText.length > 2;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      initial={{ scale: 1.8, rotate: -12, opacity: 0 }}
      animate={{ scale: 1, rotate: [-8, 2, 0], opacity: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`relative inline-flex flex-col items-center justify-center font-serif-kr font-bold select-none shadow-xs border-2 border-[#C23B22] text-[#C23B22] bg-[#FDF5F2] dark:bg-[#2A1715] dark:text-[#E0472D] dark:border-[#E0472D] ${
        sizeClasses[size]
      } ${shapeClasses[shape]} ${
        interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
      title={subitem ? `도장: ${subitem} (클릭시 변경)` : '도장 완료 (클릭시 취소/순환)'}
      style={{
        textShadow: '0 0 1px rgba(194, 59, 34, 0.5)',
        boxShadow: 'inset 0 0 5px rgba(194, 59, 34, 0.2)',
      }}
    >
      {/* Inner double border ring for vintage Korean seal look */}
      <div className={`absolute inset-0.5 border border-[#C23B22]/40 dark:border-[#E0472D]/40 pointer-events-none ${shapeClasses[shape]}`} />

      {/* Main Stamp Text */}
      <span
        className={`relative z-10 leading-tight font-extrabold tracking-tight text-center px-0.5 ${
          isMultiChar ? 'text-[10px] sm:text-[11px] scale-95' : 'text-xs sm:text-sm'
        }`}
      >
        {displayText}
      </span>

      {/* Subitem small label if distinct */}
      {subitem && displayText !== subitem && (
        <span className="text-[9px] font-normal leading-none opacity-80 mt-0.5">
          {subitem}
        </span>
      )}
    </motion.button>
  );
};
