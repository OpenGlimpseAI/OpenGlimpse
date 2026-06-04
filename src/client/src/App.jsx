import Placeholder from './components/shared/Placeholder';
import Chat from './pages/chat/chat.jsx';
import Directory from './pages/directory/directory.jsx';
import BottomNav from './components/navbar/bottomnav.jsx'
import { Routes, Route } from "react-router-dom";
import './App.css'
import { AdminDashboard } from "./pages/dashboard/dashboard.jsx";

export default function App() {
  return (
      <>
      <BottomNav />
      <Routes>
        <Route path="/" element={<Placeholder />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/camera" element={<Placeholder />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/directory" element={<Directory />} />
      </Routes>
      </>
  )
};
