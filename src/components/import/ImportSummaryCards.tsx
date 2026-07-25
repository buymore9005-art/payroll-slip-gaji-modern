import { AlertCircle, CheckCircle2, SkipForward } from 'lucide-react';

export function ImportSummaryCards({
  valid,
  errors,
  skipped,
}: {
  valid: number;
  errors: number;
  skipped: number;
}) {
  const cards = [
    { label: 'BARIS VALID', value: valid, icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' },
    { label: 'BARIS ERROR', value: errors, icon: AlertCircle, className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' },
    { label: 'BARIS DILEWATI', value: skipped, icon: SkipForward, className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`rounded-2xl p-4 ${card.className}`}>
            <div className="flex items-center gap-2">
              <Icon className="size-4" />
              <p className="text-[10px] font-bold">{card.label}</p>
            </div>
            <p className="mt-1 text-2xl font-black">{card.value}</p>
          </div>
        );
      })}
    </div>
  );
}
