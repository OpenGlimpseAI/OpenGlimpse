import { useConnectivity } from '../../hooks/useConnectivity';

export default function ConnectivityIndicator() {
  const { isOnline, isSyncing, pendingCount } = useConnectivity();

  if (isSyncing) {
    return (
      <div className="connectivity-indicator syncing">
        Syncing...
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="connectivity-indicator offline">
        Offline &mdash; {pendingCount} pending change{pendingCount !== 1 ? 's' : ''}
      </div>
    );
  }

  return null;
}
