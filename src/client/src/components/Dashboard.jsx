import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';

function getStoredUser() {
  const raw = localStorage.getItem('authUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return user.role === 'admin' ? <AdminDashboard currentUser={user} /> : <UserDashboard currentUser={user} />;
}
