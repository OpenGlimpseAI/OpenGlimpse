import { useState, useEffect } from 'react';
import { db } from '../db/localDB';

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updatePending = async () => {
      const pc = await db.pendingChanges.get('current');
      setPendingCount(pc ? pc.ops.length : 0);
    };

    const goOnline = () => {
      setIsOnline(true);
      updatePending();
    };

    const goOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    updatePending();
    const interval = setInterval(updatePending, 3000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isSyncing, pendingCount };
}
