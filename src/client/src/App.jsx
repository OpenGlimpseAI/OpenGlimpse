import { useState, useEffect } from 'react';
import Placeholder from './components/shared/Placeholder';
import Chat from './pages/chat/chat.jsx';
import Directory from './pages/directory/directory.jsx';
import BottomNav from './components/navbar/bottomnav.jsx'
import CameraPage from './pages/facial_recognition/CameraPage.jsx';
import { Routes, Route } from "react-router-dom";
import { AdminDashboard } from "./pages/dashboard/dashboard.jsx";
import { getStaffRole } from "./services/api";
import AdminPage from "./pages/admin/AdminPage.jsx";

import ProgrammePage from "./pages/programmes/ProgrammePage.jsx";
import SummaryPage from "./pages/programmes/SummaryPage.jsx";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
//temporary useEffect to fetch role of user,api routes to replace when we have sign in system
  useEffect(() => {
    const staffId = localStorage.getItem('staffId');
    if (!staffId) return;
    getStaffRole(staffId)
      .then(({ role }) => setIsAdmin(role === 'admin'))
      .catch(() => setIsAdmin(false));
  }, []);

  return (
      <>
      <BottomNav isAdmin={isAdmin} />
      <Routes>
        <Route path="/" element={<Placeholder />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/programmes" element={<ProgrammePage />} />
        <Route path="/summary/:id" element={<SummaryPage />} />
      </Routes>
      </>
  )
};
