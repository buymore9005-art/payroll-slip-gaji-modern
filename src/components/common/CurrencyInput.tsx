import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/Input';

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onValueChange: (value: number) => void;
};

function display(value: number) {
  return Number.isFinite(value) && value !== 0 ? new Intl.NumberFormat('id-ID').format(value) : '';
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, onBlur, ...props }, ref) => {
    const [text, setText] = useState(() => display(value));
    useEffect(() => setText(display(value)), [value]);
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">Rp</span>
        <Input
          {...props}
          ref={ref}
          inputMode="numeric"
          className="pl-10 text-right tabular-nums"
          value={text}
          onChange={event => {
            const digits = event.target.value.replace(/[^\d]/g, '');
            const numeric = Number(digits || 0);
            setText(digits ? new Intl.NumberFormat('id-ID').format(numeric) : '');
            onValueChange(numeric);
          }}
          onBlur={onBlur}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
