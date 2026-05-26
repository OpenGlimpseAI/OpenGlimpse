import Placeholder from './components/Placeholder';
import Chat from './components/chat.jsx';
import BottomNav from './components/bottomnav.jsx'
import { Routes, Route } from "react-router-dom";
import './App.css'
import { AdminDashboard } from "./components/dashboard.jsx";

export default function App() {
  return (
      <>
      <BottomNav />
      <Routes>
        <Route path="/" element={<Placeholder />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/camera" element={<Placeholder />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
      </Routes>
      </>
  )
};
