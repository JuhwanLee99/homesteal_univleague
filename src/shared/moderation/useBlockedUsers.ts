import { useEffect, useState } from 'react';
import { useAuth } from '@shared/auth/AuthProvider';
import { watchBlockedUserIds, watchBlockedUsers } from './moderationService';
import type { BlockedUserEntry } from '@shared/types';

export function useBlockedUserIds() {
  const { user } = useAuth();
  const [state, setState] = useState<{ uid: string | null; blockedUserIds: Set<string> }>({
    uid: null,
    blockedUserIds: new Set(),
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = watchBlockedUserIds(
      user.uid,
      (next) => {
        setState({ uid: user.uid, blockedUserIds: next });
      },
      () => {
        setState({ uid: user.uid, blockedUserIds: new Set() });
      },
    );

    return () => unsubscribe();
  }, [user]);

  const blockedUserIds = user ? (state.uid === user.uid ? state.blockedUserIds : new Set<string>()) : new Set<string>();
  const loading = Boolean(user && state.uid !== user.uid);
  return { blockedUserIds, loading, uid: user?.uid ?? null };
}

export function useBlockedUsers() {
  const { user } = useAuth();
  const [state, setState] = useState<{ uid: string | null; blockedUsers: BlockedUserEntry[] }>({
    uid: null,
    blockedUsers: [],
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribe = watchBlockedUsers(
      user.uid,
      (next) => {
        setState({ uid: user.uid, blockedUsers: next });
      },
      () => {
        setState({ uid: user.uid, blockedUsers: [] });
      },
    );

    return () => unsubscribe();
  }, [user]);

  const blockedUsers = user ? (state.uid === user.uid ? state.blockedUsers : []) : [];
  const loading = Boolean(user && state.uid !== user.uid);
  return { blockedUsers, loading, uid: user?.uid ?? null };
}
