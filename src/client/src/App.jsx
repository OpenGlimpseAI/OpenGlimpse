import Chat from './pages/chat/chat.jsx';
import Directory from './pages/directory/directory.jsx';
import BottomNav from './components/navbar/bottomnav.jsx'
import CameraPage from './pages/facial_recognition/CameraPage.jsx';
import BadgePage from './pages/badge/BadgePage.jsx';
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from 'react';
import { AdminDashboard } from "./pages/dashboard/dashboard.jsx";

import ProgrammePage from "./pages/programmes/ProgrammePage.jsx";
import SummaryPage from "./pages/programmes/SummaryPage.jsx";
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
  if (!user) return <Onboarding />;
  return user.role === 'staff' ? <StaffLandingPage /> : <BadgePage />;
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
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/dashboard/routes/:routeId" element={<AdminDashboard />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/programmes" element={<ProgrammePage />} />
        <Route path="/summary/:id" element={<SummaryPage />} />
        <Route path="/badge" element={<BadgePage />} />
      </Routes>
      </>
  )
};
