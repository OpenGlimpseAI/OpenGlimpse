import Placeholder from './components/Placeholder';
import Chat from './components/Chat.jsx';
import Camera from './components/Camera.jsx';
import BottomNav from './components/BottomNav.jsx'
import { Routes, Route } from "react-router-dom";
import './App.css'
//import { AdminDashboard } from "./components/Dashboard.jsx";

export default function App() {
  return (
      <>
      <BottomNav />
      <Routes>
        <Route path="/" element={<Placeholder />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/camera" element={<Camera />} />
          <Route path="/dashboard" element={<Placeholder />} />
      </Routes>
      </>
  )
};
