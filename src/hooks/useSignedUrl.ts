import { useQuery } from '@tanstack/react-query';
import { signedUrl } from '@/services/storage.service';

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['signed-url', path],
    queryFn: () => signedUrl(path),
    enabled: Boolean(path),
    staleTime: 50 * 60 * 1000,
  });
}
