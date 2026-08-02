import { useEffect, useRef } from 'react';
import { changeHandler } from '../sync/syncEngine';

export function useSync() {
  const syncing = useRef(false);

  useEffect(() => {
    const sync = async () => {
      if (syncing.current) return;
      syncing.current = true;
      try {
        await changeHandler();
        //send sync status based on successful sync
        window.dispatchEvent(new CustomEvent('sync:done'));
      } catch {
      } finally {
        syncing.current = false;
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
