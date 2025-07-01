"use client";
import LiftingTracker from "@/components/LiftingTracker";
import LegacyAuth from "@/components/LegacyAuth";
import { useState } from "react";

interface LegacyUser {
  username: string;
  created_at: string;
}

export default function Home() {
  const [legacyUser, setLegacyUser] = useState<LegacyUser | null>(null);

  const handleLegacyLogin = (user: LegacyUser) => {
    setLegacyUser(user);
  };

  const handleLegacyLogout = () => {
    localStorage.removeItem('liftingTrackerUser');
    setLegacyUser(null);
  };

  // Show login page if not authenticated
  if (!legacyUser) {
    return <LegacyAuth onLogin={handleLegacyLogin} />;
  }
  
  // Show lifting tracker once authenticated
  return <LiftingTracker user={legacyUser} onLogout={handleLegacyLogout} />;
}
