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
        <label htmlFor={inputId} className="text-lg font-semibold text-sahaaya-text">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-4 py-3.5 text-lg rounded-2xl border-2 transition-all bg-white text-sahaaya-text focus:outline-none focus:ring-4 focus:ring-sahaaya-primary/20 ${
            error
              ? 'border-sahaaya-alert focus:border-sahaaya-alert'
              : 'border-sahaaya-border focus:border-sahaaya-primary'
          } min-h-[52px] ${className}`}
          {...props}
        />
        {helperText && !error && (
          <p className="text-base text-sahaaya-muted">{helperText}</p>
        )}
        {error && <p className="text-base font-semibold text-sahaaya-alert">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
