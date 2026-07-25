import type { ReactNode } from 'react';

export function FormField({
  label,
  required,
  error,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
      {help && !error && <span className="field-help">{help}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
