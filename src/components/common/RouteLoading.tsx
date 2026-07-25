import { Skeleton } from '@/components/ui/Skeleton';

export function RouteLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'space-y-5' : 'mx-auto max-w-6xl space-y-5 p-6 sm:p-10'}>
      <Skeleton className="h-10 w-72 max-w-full" />
      <Skeleton className="h-5 w-[min(36rem,90%)]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
