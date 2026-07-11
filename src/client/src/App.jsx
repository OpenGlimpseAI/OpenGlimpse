import Placeholder from './components/Placeholder';
import Chat from './components/Chat.jsx';
import BottomNav from './components/BottomNav.jsx'
import Onboarding from './components/Onboarding.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import Dashboard from './components/Dashboard.jsx';
import { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from "react-router-dom";
import './App.css'
//import { AdminDashboard } from "./components/Dashboard.jsx";

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
        <Route path="/" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/chat" element={<Chat/>} />
        <Route path="/camera" element={<Placeholder />} />
          <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
      </>
  )
};
