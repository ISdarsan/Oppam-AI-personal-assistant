import React, { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  highlight?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, highlight = false, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 ${
        highlight
          ? 'border-emerald-600 ring-4 ring-emerald-100 shadow-md'
          : 'border-stone-200 hover:border-emerald-700/40'
      } transition-all duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
