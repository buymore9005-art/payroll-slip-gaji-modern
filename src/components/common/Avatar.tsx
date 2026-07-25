import { UserRound } from 'lucide-react';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { cn } from '@/lib/utils';

export function Avatar({
  path,
  name,
  className,
}: {
  path?: string | null;
  name: string;
  className?: string;
}) {
  const { data: url } = useSignedUrl(path);
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return (
    <div className={cn('flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-sm font-bold text-white', className)}>
      {url ? <img src={url} alt={name} className="size-full object-cover" /> : initials || <UserRound className="size-5" />}
    </div>
  );
}
