import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { createSingleFlight } from '@/lib/singleFlight';
import { getProfile } from '@/services/auth.service';
import type { ProfileRow } from '@/types/database';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'profile-error';

type AuthState = {
  session: Session | null;
  profile: ProfileRow | null;
  status: AuthStatus;
  profileError: string | null;
};

type AuthContextValue = AuthState & {
  user: User | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const PROFILE_CACHE_PREFIX = 'payroll-profile:';
const loadProfileOnce = createSingleFlight(getProfile, userId => userId);

export const AuthContext = createContext<AuthContextValue | null>(null);

function readCachedProfile(userId: string): ProfileRow | null {
  try {
    const raw = sessionStorage.getItem(`${PROFILE_CACHE_PREFIX}${userId}`);
    if (!raw) return null;
    const profile = JSON.parse(raw) as ProfileRow;
    return profile.id === userId ? profile : null;
  } catch {
    return null;
  }
}

function cacheProfile(profile: ProfileRow) {
  try {
    sessionStorage.setItem(`${PROFILE_CACHE_PREFIX}${profile.id}`, JSON.stringify(profile));
  } catch {
    // Session storage only improves perceived speed; authentication remains functional without it.
  }
}

function clearCachedProfile(userId?: string) {
  if (!userId) return;
  try {
    sessionStorage.removeItem(`${PROFILE_CACHE_PREFIX}${userId}`);
  } catch {
    // Ignore storage restrictions.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    status: 'initializing',
    profileError: null,
  });
  const stateRef = useRef(state);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applySession = useCallback(async (
    nextSession: Session | null,
    options: { forceProfile?: boolean; event?: AuthChangeEvent } = {},
  ) => {
    const generation = ++generationRef.current;
    const previous = stateRef.current;
    const previousUserId = previous.session?.user.id;
    const nextUserId = nextSession?.user.id;

    if (!nextSession || !nextUserId) {
      clearCachedProfile(previousUserId);
      const unauthenticated: AuthState = {
        session: null,
        profile: null,
        status: 'unauthenticated',
        profileError: null,
      };
      stateRef.current = unauthenticated;
      if (mountedRef.current) setState(unauthenticated);
      return;
    }

    const sameUser = previousUserId === nextUserId;
    if (sameUser && previous.profile && !options.forceProfile) {
      const authenticated: AuthState = {
        ...previous,
        session: nextSession,
        status: 'authenticated',
        profileError: null,
      };
      stateRef.current = authenticated;
      if (mountedRef.current) setState(authenticated);
      return;
    }

    const cachedProfile = sameUser ? previous.profile : readCachedProfile(nextUserId);
    const pending: AuthState = {
      session: nextSession,
      profile: cachedProfile,
      status: cachedProfile ? 'authenticated' : 'initializing',
      profileError: null,
    };
    stateRef.current = pending;
    if (mountedRef.current) setState(pending);

    try {
      const profile = await loadProfileOnce(nextUserId);
      if (!mountedRef.current || generation !== generationRef.current) return;
      cacheProfile(profile);
      const authenticated: AuthState = {
        session: nextSession,
        profile,
        status: 'authenticated',
        profileError: null,
      };
      stateRef.current = authenticated;
      setState(authenticated);
    } catch (error) {
      if (!mountedRef.current || generation !== generationRef.current) return;
      const failed: AuthState = {
        session: nextSession,
        profile: cachedProfile,
        status: cachedProfile ? 'authenticated' : 'profile-error',
        profileError: error instanceof Error ? error.message : String(error),
      };
      stateRef.current = failed;
      setState(failed);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentSession = stateRef.current.session;
    clearCachedProfile(currentSession?.user.id);
    await applySession(currentSession, { forceProfile: true });
  }, [applySession]);

  useEffect(() => {
    mountedRef.current = true;
    let disposed = false;

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      queueMicrotask(() => {
        if (!disposed) void applySession(nextSession, { event });
      });
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (disposed) return;
      void applySession(error ? null : data.session, { event: 'INITIAL_SESSION' });
    });

    return () => {
      disposed = true;
      mountedRef.current = false;
      generationRef.current += 1;
      listener.subscription.unsubscribe();
    };
  }, [applySession]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    user: state.session?.user ?? null,
    loading: state.status === 'initializing',
    refreshProfile,
  }), [refreshProfile, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
