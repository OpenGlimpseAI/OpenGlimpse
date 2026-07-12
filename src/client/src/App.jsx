import Placeholder from './components/shared/Placeholder';
import Chat from './pages/chat/chat.jsx';
import Directory from './pages/directory/directory.jsx';
import BottomNav from './components/navbar/bottomnav.jsx'
import Placeholder from './components/Placeholder';
import Chat from './components/Chat.jsx';
import Camera from './components/Camera.jsx';
import BottomNav from './components/BottomNav.jsx'
import { Routes, Route } from "react-router-dom";
import './App.css'
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
        <Route path="/camera" element={<Camera />} />
          <Route path="/dashboard" element={<Placeholder />} />
        <Route path="/camera" element={<Placeholder />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/programmes" element={<ProgrammePage />} />
        <Route path="/summary/:id" element={<SummaryPage />} />
      </Routes>
      </>
  )
};
