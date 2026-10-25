import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || 'input-' + label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-xl font-bold text-emerald-950 tracking-tight">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-5 py-3.5 text-xl font-medium rounded-2xl border-2 transition-all bg-white text-emerald-950 placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-700/20 ${
            error
              ? 'border-rose-500 focus:border-rose-600'
              : 'border-stone-300 focus:border-emerald-700'
          } min-h-[56px] ${className}`}
          {...props}
        />
        {helperText && !error && (
          <p className="text-base font-medium text-emerald-900/80">{helperText}</p>
        )}
        {error && <p className="text-base font-bold text-rose-700">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
