'use client'

import React, { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import type { Schema } from '../../amplify/data/resource';

// Ensure Amplify is configured
Amplify.configure(outputs);

const client = generateClient<Schema>({
  authMode: 'apiKey'
});

interface User {
  username: string;
  created_at: string;
}

interface LegacyAuthProps {
  onLogin: (user: User) => void;
}

export default function LegacyAuth({ onLogin }: LegacyAuthProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('Attempting login with:', { username, password: 'HIDDEN' });

    try {
      console.log('Making GraphQL call to authenticateUser...');
      const { data, errors } = await client.queries.authenticateUser({
        username,
        password
      });

      console.log('GraphQL response:', { data, errors });

      if (errors && errors.length > 0) {
        console.error('GraphQL errors:', errors);
        setError(`GraphQL Error: ${errors[0].message}`);
        return;
      }

      if (data) {
        console.log('Parsing response data:', data);
        // The data is double-encoded JSON, so we need to parse it twice
        let result;
        if (typeof data === 'string') {
          result = JSON.parse(JSON.parse(data));
        } else {
          result = JSON.parse(data as unknown as string);
        }
        console.log('Parsed result:', result);
        
        if (result.success) {
          console.log('Login successful, storing user:', result.user);
          // Store user in localStorage for persistence
          localStorage.setItem('liftingTrackerUser', JSON.stringify(result.user));
          onLogin(result.user);
        } else {
          console.error('Login failed with error:', result.error);
          setError(result.error || 'Login failed');
        }
      } else {
        console.error('No data in response');
        setError('No response from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('liftingTrackerUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        onLogin(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('liftingTrackerUser');
      }
    }
  }, [onLogin]);

  return (
    <div style={{ 
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#e0e0e0',
      padding: '20px'
    }}>
      <div style={{
        background: '#2d2d44',
        borderRadius: '15px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#64ffda',
          marginBottom: '30px',
          fontSize: '2em'
        }}>
          Lifting Tracker Login
        </h1>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: '#64ffda',
              fontWeight: 'bold'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#3d3d5c',
                color: '#e0e0e0',
                border: '1px solid #64ffda',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              color: '#64ffda',
              fontWeight: 'bold'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#3d3d5c',
                color: '#e0e0e0',
                border: '1px solid #64ffda',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#ff6b6b',
              marginBottom: '20px',
              padding: '10px',
              background: 'rgba(255, 107, 107, 0.1)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 107, 107, 0.3)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#666' : '#64ffda',
              color: loading ? '#aaa' : '#1a1a2e',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '14px',
          color: '#aaa'
        }}>
          Use your existing lifting tracker credentials
        </div>
      </div>
    </div>
  );
}