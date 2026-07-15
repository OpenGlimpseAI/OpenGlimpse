import Placeholder from './components/shared/Placeholder';
import Chat from './pages/chat/chat.jsx';
import Directory from './pages/directory/directory.jsx';
import BottomNav from './components/navbar/bottomnav.jsx'
import CameraPage from './pages/facial_recognition/CameraPage.jsx';
import { Routes, Route } from "react-router-dom";
import { AdminDashboard } from "./pages/dashboard/dashboard.jsx";

import ProgrammePage from "./pages/programmes/ProgrammePage.jsx";
import SummaryPage from "./pages/programmes/SummaryPage.jsx";

export default function App() {
  return (
      <>
      <BottomNav />
      <Routes>
        <Route path="/" element={<Placeholder />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/camera" element={<CameraPage />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/dashboard/routes/:routeId" element={<AdminDashboard />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/programmes" element={<ProgrammePage />} />
        <Route path="/summary/:id" element={<SummaryPage />} />
      </Routes>
      </>
  )
};
