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
import StaffProfile from "./pages/auth/StaffProfile.jsx";
import ParticipantManagement from "./pages/auth/ParticipantManagement.jsx";

function isSignedIn() {
  return Boolean(localStorage.getItem('authUser'));
}

export default function App() {
  const location = useLocation();
  const [signedIn, setSignedIn] = useState(() => isSignedIn());

  useEffect(() => {
    setSignedIn(isSignedIn());
  }, [location]);

  return (
      <>
      {signedIn && <BottomNav />}
      <Routes>
        <Route path="/" element={signedIn ? <StaffProfile /> : <Onboarding />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<ParticipantManagement />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/programmes" element={<ProgrammePage />} />
        <Route path="/summary/:id" element={<SummaryPage />} />
        <Route path="/badge" element={<BadgePage />} />
      </Routes>
      </>
  )
};
