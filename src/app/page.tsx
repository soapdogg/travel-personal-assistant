"use client";
import { Button, View, Heading, Flex, Text } from "@aws-amplify/ui-react";
import LiftingTracker from "@/components/LiftingTracker";
import LegacyAuth from "@/components/LegacyAuth";
import Chat from "@/components/Chat";
import { useState } from "react";

interface LegacyUser {
  username: string;
  created_at: string;
}

export default function Home() {
  const [currentView, setCurrentView] = useState<'lifting' | 'travel'>('lifting');
  const [legacyUser, setLegacyUser] = useState<LegacyUser | null>(null);

  const handleLegacyLogin = (user: LegacyUser) => {
    setLegacyUser(user);
  };

  const handleLegacyLogout = () => {
    localStorage.removeItem('liftingTrackerUser');
    setLegacyUser(null);
  };

  // Handle authentication based on current view
  if (currentView === 'lifting') {
    // For lifting tracker, use legacy auth
    if (!legacyUser) {
      return <LegacyAuth onLogin={handleLegacyLogin} />;
    }
    
    return (
      <View className="app-container">
        <Flex
          as="header"
          justifyContent="space-between"
          alignItems="center"
          padding="1rem"
          style={{ background: '#2d2d44', color: '#e0e0e0' }}
        >
          <Text fontWeight="bold" color="white">
            {legacyUser.username}
          </Text>
          <Flex gap="1rem" alignItems="center">
            <Button 
              onClick={() => setCurrentView('lifting')}
              variation="primary"
              size="small"
            >
              Lifting Tracker
            </Button>
            <Button 
              onClick={() => setCurrentView('travel')}
              variation="link"
              size="small"
            >
              Travel Assistant
            </Button>
          </Flex>
          <Button 
            onClick={handleLegacyLogout} 
            size="small" 
            variation="destructive"
          >
            Sign out
          </Button>
        </Flex>
        <View as="main">
          <LiftingTracker user={legacyUser} onLogout={handleLegacyLogout} />
        </View>
      </View>
    );
  } else {
    // For travel assistant, show a message for now
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        minHeight: '100vh',
        color: '#e0e0e0'
      }}>
        <h2 style={{ color: '#64ffda', marginBottom: '20px' }}>Travel Assistant</h2>
        <p style={{ marginBottom: '20px' }}>Travel Assistant requires separate authentication. For now, please use the Lifting Tracker.</p>
        <Button onClick={() => setCurrentView('lifting')} variation="primary">
          Go to Lifting Tracker
        </Button>
      </div>
    );
  }
}
