import React, { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  highlight?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, highlight = false, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-3xl p-6 sm:p-7 shadow-sm border ${
        highlight
          ? 'border-sahaaya-primary/50 ring-2 ring-sahaaya-primary/20'
          : 'border-sahaaya-border'
      } transition-shadow hover:shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
