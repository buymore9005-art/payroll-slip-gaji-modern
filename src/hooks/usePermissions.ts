import { hasPermission, type Permission } from '@/lib/permissions';
import { useAuth } from '@/hooks/useAuth';

export function usePermissions() {
  const { profile } = useAuth();
  return {
    role: profile?.role ?? null,
    can: (permission: Permission) => hasPermission(profile?.role, permission),
  };
}
