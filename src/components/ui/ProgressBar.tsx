export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const safe = Math.min(100, Math.max(0, value));
  return (
    <div>
      {label && (
        <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>{label}</span><span>{Math.round(safe)}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-[width] duration-300"
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}
