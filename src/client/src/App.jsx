import Chat from './pages/chat/chat.jsx';
import Directory from './pages/directory/directory.jsx';
import BottomNav from './components/navbar/bottomnav.jsx'
import CameraPage from './pages/facial_recognition/CameraPage.jsx';
import BadgePage from './pages/badge/BadgePage.jsx';
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import { AdminDashboard } from "./pages/dashboard/dashboard.jsx";

import ProgrammePage from "./pages/programmes/ProgrammePage.jsx";
import ProgrammeDetailPage from "./pages/programmes/ProgrammeDetailPage";
// OLD: SummaryPage removed — route moved to /programmes/:id/*
import Onboarding from "./pages/auth/Onboarding.jsx";
import Login from "./pages/auth/Login.jsx";
import ProfilePage from "./pages/auth/ProfilePage.jsx";
import StaffLandingPage from "./pages/staff/StaffLandingPage.jsx";

import { useSync } from './hooks/useSync';
import ConnectivityIndicator from './components/shared/ConnectivityIndicator';

function getAuthUser() {
  const raw = localStorage.getItem('authUser');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function isSignedIn() {
  return Boolean(localStorage.getItem('authUser'));
}

function LandingPage() {
  const user = getAuthUser();
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'staff' ? <StaffLandingPage /> : <BadgePage />;
}

function RequireAuth({ children }) {
  return isSignedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  useSync();

  const location = useLocation();
  const [signedIn, setSignedIn] = useState(() => isSignedIn());

  useEffect(() => {
    setSignedIn(isSignedIn());
  }, [location]);

  return (
      <>
      <ConnectivityIndicator />
      {signedIn && <BottomNav />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/chat" element={<RequireAuth><Chat/></RequireAuth>} />
        <Route path="/camera" element={<RequireAuth><CameraPage /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="/dashboard/routes/:routeId" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
        <Route path="/directory" element={<RequireAuth><Directory /></RequireAuth>} />
        <Route path="/programmes" element={<RequireAuth><ProgrammePage /></RequireAuth>} />
        <Route path="/programmes/:id/*" element={<RequireAuth><ProgrammeDetailPage /></RequireAuth>} />
        <Route path="/badge" element={<RequireAuth><BadgePage /></RequireAuth>} />
      </Routes>
      </>
  )
};
