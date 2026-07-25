import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  index = 0,
}: {
  label: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  index?: number;
}) {
  return (
    <motion.div
      className="glass rounded-2xl p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
          <Icon className="size-5" />
        </div>
      </div>
    </motion.div>
  );
}
