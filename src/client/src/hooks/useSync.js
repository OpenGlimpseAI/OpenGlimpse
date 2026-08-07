import { useEffect, useRef } from 'react';
import { db } from '../db/localDB';
import { changeHandler } from '../sync/syncEngine';

export function useSync() {
  const syncing = useRef(false);

  useEffect(() => {
    const sync = async () => {
      if (syncing.current) return;
      syncing.current = true;
      let started = false;
      try {
        const pc = await db.pendingChanges.get('current');
        started = !!(pc && pc.ops.length > 0);
        if (started) window.dispatchEvent(new CustomEvent('sync:start'));
        await changeHandler();
      } catch {
      } finally {
        syncing.current = false;
        //send sync status based on successful sync
        if (started) window.dispatchEvent(new CustomEvent('sync:done'));
      }
    };

    sync();

    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);

    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);
}
