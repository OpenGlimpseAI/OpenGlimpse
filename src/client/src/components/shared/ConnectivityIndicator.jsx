import { useConnectivity } from '../../hooks/useConnectivity';

export default function ConnectivityIndicator() {
  const { isOnline, isSyncing } = useConnectivity();

  if (isSyncing) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-sky-600/90 backdrop-blur-sm text-white text-xs font-medium py-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        Syncing...
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-1.5 bg-amber-50/90 backdrop-blur-sm text-amber-700 text-xs font-medium py-1 border-b border-amber-200/50">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        Offline
      </div>
    );
  }

  return null;
}
