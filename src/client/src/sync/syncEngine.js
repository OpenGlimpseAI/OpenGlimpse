import { db } from '../db/localDB';

const API_BASE = import.meta.env.VITE_API_URL || '';
//send and receive changes to and from /sync endpoint
export async function changeHandler() {
  const pc = await db.pendingChanges.get('current');
  if (!pc || pc.ops.length === 0) return;

  const res = await fetch(`${API_BASE}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ops: pc.ops, timestamp: pc.timestamp })
  });

  if (!res.ok) {
    throw new Error('Sync failed');
  }

  await db.pendingChanges.delete('current');
}
