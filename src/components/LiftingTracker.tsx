'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import type { Schema } from '../../amplify/data/resource';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line, Bar, Scatter } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Ensure Amplify is configured
Amplify.configure(outputs);

const client = generateClient<Schema>({
  authMode: 'apiKey'
});

interface Set {
  weight: number;
  reps: number;
}

interface WorkoutData {
  exercise: string;
  date: string;
  sets: Set[];
}

interface Exercise {
  key: string;
  name: string;
  muscle: string;
  repRange: string;
}

const EXERCISES: Exercise[] = [
  // Compound Movements
  { key: 'deadlift', name: 'Deadlift', muscle: 'Hamstrings, Glutes', repRange: '2-5' },
  { key: 'squat', name: 'Back Squat', muscle: 'Quadriceps, Glutes', repRange: '3-6' },
  { key: 'bench', name: 'Bench Press', muscle: 'Chest', repRange: '5-8' },
  { key: 'military', name: 'Military Press', muscle: 'Shoulders', repRange: '5-8' },
  { key: 'powerclean', name: 'Power Clean', muscle: 'Full Body', repRange: '2-5' },
  { key: 'pullup', name: 'Pull-ups', muscle: 'Lats', repRange: '5-8' },

  // Upper Body Push
  { key: 'inclinebench', name: 'Incline Bench Press', muscle: 'Upper Chest', repRange: '6-10' },
  { key: 'dumbellpress', name: 'Dumbbell Press', muscle: 'Chest', repRange: '8-12' },
  { key: 'shoulderpress', name: 'Dumbbell Shoulder Press', muscle: 'Shoulders', repRange: '8-12' },
  { key: 'lateralraise', name: 'Lateral Raise', muscle: 'Side Delts', repRange: '12-15' },
  { key: 'triceps', name: 'Tricep Dips', muscle: 'Triceps', repRange: '8-12' },
  { key: 'tricepext', name: 'Tricep Extension', muscle: 'Triceps', repRange: '10-15' },

  // Upper Body Pull
  { key: 'chinup', name: 'Chin-ups', muscle: 'Lats, Biceps', repRange: '5-8' },
  { key: 'bentrow', name: 'Bent Over Row', muscle: 'Lats, Rhomboids', repRange: '6-10' },
  { key: 'tbarrow', name: 'T-Bar Row', muscle: 'Lats, Rhomboids', repRange: '8-12' },
  { key: 'cablerow', name: 'Cable Row', muscle: 'Lats, Rhomboids', repRange: '10-15' },
  { key: 'biceps', name: 'Bicep Curls', muscle: 'Biceps', repRange: '10-15' },
  { key: 'hammercurl', name: 'Hammer Curls', muscle: 'Biceps, Forearms', repRange: '10-15' },
  { key: 'facepull', name: 'Face Pulls', muscle: 'Rear Delts', repRange: '12-20' },

  // Lower Body
  { key: 'lunges', name: 'Lunges', muscle: 'Quadriceps, Glutes', repRange: '10-15' },
  { key: 'legcurl', name: 'Leg Curls', muscle: 'Hamstrings', repRange: '12-15' },
  { key: 'legextension', name: 'Leg Extension', muscle: 'Quadriceps', repRange: '12-15' },
  { key: 'calfraize', name: 'Calf Raises', muscle: 'Calves', repRange: '15-20' },
  { key: 'romaniandeadlift', name: 'Romanian Deadlift', muscle: 'Hamstrings, Glutes', repRange: '8-12' },
  { key: 'hipthrust', name: 'Hip Thrust', muscle: 'Glutes', repRange: '10-15' },

  // Core & Functional
  { key: 'plank', name: 'Plank Hold', muscle: 'Core', repRange: '30-60s' },
  { key: 'russian', name: 'Russian Twists', muscle: 'Obliques', repRange: '20-30' },
  { key: 'mountainclimber', name: 'Mountain Climbers', muscle: 'Core', repRange: '20-30' },
  { key: 'burpees', name: 'Burpees', muscle: 'Full Body', repRange: '8-15' }
];

interface LiftingTrackerProps {
  user: {
    username: string;
    created_at: string;
  };
  onLogout: () => void;
}

interface WorkoutSession {
  exercise: string;
  sets: Set[];
}

export default function LiftingTracker({ user, onLogout }: LiftingTrackerProps) {
  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [currentSession, setCurrentSession] = useState<WorkoutSession[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('squat');
  const [selectedGraphExercise, setSelectedGraphExercise] = useState<string>('squat');
  const [aiRecommendations, setAiRecommendations] = useState<Record<string, string>>({});
  const [loadingAI, setLoadingAI] = useState<Record<string, boolean>>({});

  const loadWorkouts = useCallback(async () => {
    try {
      const { data } = await client.queries.getLegacyWorkouts({
        userId: user.username
      });

      if (data) {
        // The data is double-encoded JSON, so we need to parse it twice
        let result;
        if (typeof data === 'string') {
          result = JSON.parse(JSON.parse(data));
        } else {
          result = JSON.parse(data as unknown as string);
        }
        if (result.success) {
          setWorkouts(result.workouts);
        } else {
          console.error('Error loading workouts:', result.error);
        }
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    }
  }, [user.username]);

  // Load workouts on component mount
  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const addExerciseToSession = () => {
    const newExercise: WorkoutSession = {
      exercise: selectedExercise,
      sets: [
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 },
        { weight: 0, reps: 0 }
      ]
    };
    setCurrentSession([...currentSession, newExercise]);
  };

  const updateExerciseSet = (exerciseIndex: number, setIndex: number, field: 'weight' | 'reps', value: number) => {
    const updated = [...currentSession];
    updated[exerciseIndex].sets[setIndex][field] = value;
    setCurrentSession(updated);
  };

  const addSetToExercise = (exerciseIndex: number) => {
    const updated = [...currentSession];
    updated[exerciseIndex].sets.push({ weight: 0, reps: 0 });
    setCurrentSession(updated);
  };

  const removeSetFromExercise = (exerciseIndex: number, setIndex: number) => {
    const updated = [...currentSession];
    if (updated[exerciseIndex].sets.length > 1) {
      updated[exerciseIndex].sets.splice(setIndex, 1);
      setCurrentSession(updated);
    }
  };

  const removeExerciseFromSession = (exerciseIndex: number) => {
    const updated = currentSession.filter((_, i) => i !== exerciseIndex);
    setCurrentSession(updated);
  };

  const saveWorkoutSession = async () => {
    if (currentSession.length === 0) {
      alert('Please add at least one exercise to your workout');
      return;
    }

    try {
      const date = new Date().toISOString().split('T')[0];
      const savedWorkouts: WorkoutData[] = [];

      // Save each exercise in the session
      for (const sessionExercise of currentSession) {
        const validSets = sessionExercise.sets.filter(set => set.weight > 0 && set.reps > 0);
        
        if (validSets.length === 0) {
          alert(`Please fill in at least one complete set for ${EXERCISES.find(ex => ex.key === sessionExercise.exercise)?.name}`);
          return;
        }

        const workout: WorkoutData = {
          exercise: sessionExercise.exercise,
          date,
          sets: validSets
        };

        console.log('Saving workout for exercise:', sessionExercise.exercise, workout);

        const { data, errors } = await client.mutations.saveLegacyWorkout({
          userId: user.username,
          workout: JSON.stringify(workout)
        });

        console.log('Save workout response:', { data, errors });

        if (errors && errors.length > 0) {
          console.error('Save workout GraphQL errors:', errors);
          alert(`Failed to save ${EXERCISES.find(ex => ex.key === sessionExercise.exercise)?.name}: ${errors[0].message}`);
          return;
        }

        if (data) {
          let result;
          if (typeof data === 'string') {
            result = JSON.parse(JSON.parse(data));
          } else {
            result = JSON.parse(data as unknown as string);
          }
          
          console.log('Parsed save result:', result);
          
          if (result.success) {
            savedWorkouts.push(workout);
          } else {
            alert(`Failed to save ${EXERCISES.find(ex => ex.key === sessionExercise.exercise)?.name}: ${result.error}`);
            return;
          }
        }
      }

      // Update the workouts list and clear the session
      setWorkouts([...workouts, ...savedWorkouts]);
      setCurrentSession([]);
      alert(`Workout session saved successfully! ${savedWorkouts.length} exercises completed.`);
    } catch (error) {
      console.error('Error saving workout session:', error);
      alert('Failed to save workout session');
    }
  };

  const getAIRecommendations = async (exerciseKey: string) => {
    console.log('Getting AI recommendations for:', exerciseKey);
    setLoadingAI(prev => ({ ...prev, [exerciseKey]: true }));
    try {
      const exerciseData = EXERCISES.find(ex => ex.key === exerciseKey);
      const exerciseHistory = workouts.filter(w => w.exercise === exerciseKey);
      const exerciseStats = getExerciseStats(exerciseKey);

      // Prepare context data for AI recommendations
      const contextData = {
        exercise: {
          name: exerciseData?.name,
          muscle: exerciseData?.muscle,
          repRange: exerciseData?.repRange,
          key: exerciseKey
        },
        stats: exerciseStats ? {
          lastWeight: exerciseStats.lastWeight,
          maxWeight: exerciseStats.maxWeight,
          totalSessions: exerciseStats.totalSessions
        } : null,
        recentHistory: exerciseHistory.slice(-5), // Last 5 sessions
        currentUser: user.username
      };

      console.log('Calling getAIRecommendations with:', { promptType: 'exerciseTips', contextData });

      const { data, errors } = await client.queries.getAIRecommendations({
        promptType: 'exerciseTips',
        contextData: JSON.stringify(contextData)
      });

      console.log('AI Recommendations response:', { data, errors });

      if (errors && errors.length > 0) {
        console.error('GraphQL errors:', errors);
        setAiRecommendations(prev => ({ 
          ...prev, 
          [exerciseKey]: `Error: ${errors[0].message}` 
        }));
        return;
      }

      setAiRecommendations(prev => ({ 
        ...prev, 
        [exerciseKey]: data || 'No recommendations available' 
      }));
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      setAiRecommendations(prev => ({ 
        ...prev, 
        [exerciseKey]: 'Failed to get recommendations' 
      }));
    } finally {
      setLoadingAI(prev => ({ ...prev, [exerciseKey]: false }));
    }
  };


  const getExerciseStats = (exercise: string) => {
    const exerciseWorkouts = workouts.filter(w => w.exercise === exercise);
    if (exerciseWorkouts.length === 0) return null;

    const latestWorkout = exerciseWorkouts[exerciseWorkouts.length - 1];
    const maxWeight = Math.max(...exerciseWorkouts.flatMap(w => w.sets.map(s => s.weight)));
    
    return {
      lastWeight: latestWorkout.sets[0]?.weight || 0,
      maxWeight,
      totalSessions: exerciseWorkouts.length
    };
  };

  // Calculate 1RM using Epley formula: 1RM = weight * (1 + reps/30)
  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  };

  const get1RMChartData = (exercise: string) => {
    const exerciseWorkouts = workouts
      .filter(w => w.exercise === exercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (exerciseWorkouts.length === 0) return null;

    const chartData = exerciseWorkouts.map(workout => {
      // Find the set with highest estimated 1RM
      const best1RM = Math.max(...workout.sets.map(set => 
        calculate1RM(set.weight, set.reps)
      ));
      
      return {
        x: new Date(workout.date),
        y: best1RM
      };
    });

    return {
      datasets: [{
        label: '1RM Progression',
        data: chartData,
        borderColor: '#64ffda',
        backgroundColor: 'rgba(100, 255, 218, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#64ffda',
        pointBorderColor: '#64ffda',
        fill: false,
      }]
    };
  };

  const getVolumeChartData = (exercise: string) => {
    const exerciseWorkouts = workouts
      .filter(w => w.exercise === exercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (exerciseWorkouts.length === 0) return null;

    const chartData = exerciseWorkouts.map(workout => {
      // Calculate total volume (weight × reps for all sets)
      const totalVolume = workout.sets.reduce((sum, set) => 
        sum + (set.weight * set.reps), 0
      );
      
      return {
        x: new Date(workout.date),
        y: totalVolume
      };
    });

    return {
      datasets: [{
        label: 'Volume per Session',
        data: chartData,
        backgroundColor: 'rgba(100, 255, 218, 0.7)',
        borderColor: '#64ffda',
        borderWidth: 1,
      }]
    };
  };

  const getMaxWeightChartData = (exercise: string) => {
    const exerciseWorkouts = workouts
      .filter(w => w.exercise === exercise)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (exerciseWorkouts.length === 0) return null;

    const chartData = exerciseWorkouts.map(workout => {
      // Find the set with the highest weight
      const maxWeightSet = workout.sets.reduce((max, set) => 
        set.weight > max.weight ? set : max
      );
      
      return {
        x: new Date(workout.date),
        y: maxWeightSet.weight,
        // Scale reps (1-8) to circle radius (6-20) for better visibility
        r: 6 + (maxWeightSet.reps - 1) * 2,
        reps: maxWeightSet.reps
      };
    });

    return {
      datasets: [{
        label: 'Max Weight',
        data: chartData,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: '#ff6384',
        borderWidth: 2,
        pointRadius: (context: any) => {
          return context.raw?.r || 6;
        },
        pointHoverRadius: (context: any) => {
          const baseRadius = context.raw?.r || 6;
          return baseRadius + 2;
        },
      }]
    };
  };

  const maxWeightChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e0e0e0',
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const point = context.raw;
            return `${point.y} lbs × ${point.reps} reps`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MMM dd'
          },
          tooltipFormat: 'MMM dd, yyyy'
        },
        ticks: {
          color: '#e0e0e0',
          maxTicksLimit: 8,
          source: 'auto' as const
        },
        grid: {
          color: 'rgba(224, 224, 224, 0.1)',
        },
        title: {
          display: true,
          text: 'Date',
          color: '#e0e0e0'
        }
      },
      y: {
        ticks: {
          color: '#e0e0e0',
          callback: function(value: any) {
            return value + ' lbs';
          }
        },
        grid: {
          color: 'rgba(224, 224, 224, 0.1)',
        },
        beginAtZero: false,
        title: {
          display: true,
          text: 'Weight (lbs)',
          color: '#e0e0e0'
        }
      }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e0e0e0',
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            if (context.dataset.label === '1RM Progression') {
              return `${value} lbs (1RM)`;
            } else if (context.dataset.label === 'Volume per Session') {
              return `${value} lbs (total volume)`;
            }
            return `${value} lbs`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MMM dd'
          },
          tooltipFormat: 'MMM dd, yyyy'
        },
        ticks: {
          color: '#e0e0e0',
          maxTicksLimit: 8,
          source: 'auto' as const
        },
        grid: {
          color: 'rgba(224, 224, 224, 0.1)',
        },
        title: {
          display: true,
          text: 'Date',
          color: '#e0e0e0'
        }
      },
      y: {
        ticks: {
          color: '#e0e0e0',
          callback: function(value: any) {
            return value + ' lbs';
          }
        },
        grid: {
          color: 'rgba(224, 224, 224, 0.1)',
        },
        beginAtZero: false,
        title: {
          display: true,
          text: 'Weight (lbs)',
          color: '#e0e0e0'
        }
      }
    }
  };

  return (
    <div style={{ 
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '12px',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      minHeight: '100vh',
      color: '#e0e0e0'
    }}>
      <div style={{
        background: '#2d2d44',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ 
            color: '#aaa', 
            fontSize: '14px',
            order: 1
          }}>
            Welcome, {user.username}
          </div>
          <h1 style={{
            textAlign: 'center',
            color: '#64ffda',
            margin: 0,
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            order: 2,
            flex: '1 1 100%'
          }}>
            Lifting Progress Tracker
          </h1>
          <button
            onClick={onLogout}
            style={{
              background: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              order: 3
            }}
          >
            Logout
          </button>
        </div>

        {/* Add Exercise to Session */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ color: '#64ffda', marginBottom: '15px', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>Add Exercise to Workout</h2>
          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            alignItems: 'stretch',
            flexWrap: 'wrap'
          }}>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              style={{
                background: '#3d3d5c',
                color: '#e0e0e0',
                border: '1px solid #64ffda',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '16px',
                flex: '1 1 250px',
                minWidth: '250px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              {EXERCISES.map(exercise => (
                <option key={exercise.key} value={exercise.key}>
                  {exercise.name} ({exercise.muscle}) - {exercise.repRange} reps
                </option>
              ))}
            </select>
            <button
              onClick={addExerciseToSession}
              style={{
                background: '#64ffda',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                flex: '0 0 auto',
                whiteSpace: 'nowrap',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              Add Exercise
            </button>
          </div>

          {/* Exercise Stats */}
          {(() => {
            const stats = getExerciseStats(selectedExercise);
            if (stats) {
              return (
                <div style={{ 
                  marginTop: '15px', 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '10px'
                }}>
                  <div style={{ background: '#3d3d5c', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>Last Weight</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{stats.lastWeight} lbs</div>
                  </div>
                  <div style={{ background: '#3d3d5c', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>Max Weight</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{stats.maxWeight} lbs</div>
                  </div>
                  <div style={{ background: '#3d3d5c', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>Sessions</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{stats.totalSessions}</div>
                  </div>
                </div>
              );
            }
            return null;
          })()}

        </div>

        {/* Current Workout Session */}
        {currentSession.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ color: '#64ffda', marginBottom: '15px', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>Current Workout Session</h2>
            {currentSession.map((sessionExercise, exerciseIndex) => {
              const exercise = EXERCISES.find(ex => ex.key === sessionExercise.exercise);
              const exerciseStats = getExerciseStats(sessionExercise.exercise);
              const recentSessions = workouts
                .filter(w => w.exercise === sessionExercise.exercise)
                .slice(-5)
                .reverse();
              
              return (
                <div key={exerciseIndex} style={{
                  background: '#3d3d5c',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ marginBottom: '15px' }}>
                    <h3 style={{ color: '#64ffda', margin: '0 0 10px 0' }}>
                      {exercise?.name} ({exercise?.muscle}) - {exercise?.repRange} reps
                    </h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => getAIRecommendations(sessionExercise.exercise)}
                        disabled={loadingAI[sessionExercise.exercise]}
                        style={{
                          background: loadingAI[sessionExercise.exercise] ? '#666' : '#9c27b0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 18px',
                          cursor: loadingAI[sessionExercise.exercise] ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          minHeight: '40px',
                          boxSizing: 'border-box'
                        }}
                      >
                        {loadingAI[sessionExercise.exercise] ? 'Loading...' : 'AI Tips'}
                      </button>
                      <button
                        onClick={() => removeExerciseFromSession(exerciseIndex)}
                        style={{
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '10px 18px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          minHeight: '40px',
                          boxSizing: 'border-box'
                        }}
                      >
                        Remove Exercise
                      </button>
                    </div>
                  </div>

                  {/* AI Recommendations for this exercise - moved to be right after AI button */}
                  {aiRecommendations[sessionExercise.exercise] && (
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>
                        AI Recommendations:
                      </div>
                      <div style={{
                        background: '#2d2d44',
                        padding: '10px',
                        borderRadius: '6px',
                        border: '1px solid #9c27b0',
                        fontSize: '14px',
                        lineHeight: '1.4'
                      }}>
                        {aiRecommendations[sessionExercise.exercise]}
                      </div>
                    </div>
                  )}

                  {/* Exercise Stats */}
                  {exerciseStats && (
                    <div style={{ 
                      marginBottom: '15px', 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                      gap: '10px'
                    }}>
                      <div style={{ background: '#2d2d44', padding: '8px 12px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>Last Weight</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{exerciseStats.lastWeight} lbs</div>
                      </div>
                      <div style={{ background: '#2d2d44', padding: '8px 12px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>Max Weight</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{exerciseStats.maxWeight} lbs</div>
                      </div>
                      <div style={{ background: '#2d2d44', padding: '8px 12px', borderRadius: '6px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>Sessions</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{exerciseStats.totalSessions}</div>
                      </div>
                    </div>
                  )}

                  {/* Recent Sessions */}
                  {recentSessions.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>
                        Last {recentSessions.length} session{recentSessions.length > 1 ? 's' : ''}:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {recentSessions.map((session, sessionIndex) => (
                          <div key={sessionIndex} style={{
                            background: '#2d2d44',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}>
                            <span style={{ color: '#aaa' }}>{session.date}:</span> {
                              session.sets.map((set, setIndex) => (
                                <span key={setIndex} style={{ marginLeft: '8px' }}>
                                  {set.weight}×{set.reps}
                                  {setIndex < session.sets.length - 1 ? ',' : ''}
                                </span>
                              ))
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  {sessionExercise.sets.map((set, setIndex) => (
                    <div key={setIndex} style={{ 
                      display: 'flex',
                      gap: '8px', 
                      alignItems: 'center', 
                      marginBottom: '8px'
                    }}>
                      <input
                        type="number"
                        placeholder="Weight"
                        value={set.weight || ''}
                        onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, 'weight', Number(e.target.value))}
                        style={{
                          background: '#2d2d44',
                          color: '#e0e0e0',
                          border: '1px solid #64ffda',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          fontSize: '16px',
                          width: '90px',
                          minWidth: '80px',
                          minHeight: '40px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{ fontSize: '12px', color: '#aaa' }}>lbs</span>
                      <input
                        type="number"
                        placeholder="Reps"
                        value={set.reps || ''}
                        onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, 'reps', Number(e.target.value))}
                        style={{
                          background: '#2d2d44',
                          color: '#e0e0e0',
                          border: '1px solid #64ffda',
                          borderRadius: '6px',
                          padding: '10px 12px',
                          fontSize: '16px',
                          width: '90px',
                          minWidth: '80px',
                          minHeight: '40px',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{ fontSize: '12px', color: '#aaa' }}>reps</span>
                      {sessionExercise.sets.length > 1 && (
                        <button
                          onClick={() => removeSetFromExercise(exerciseIndex, setIndex)}
                          style={{
                            background: '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            whiteSpace: 'nowrap',
                            minHeight: '36px',
                            boxSizing: 'border-box'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  
                  <button
                    onClick={() => addSetToExercise(exerciseIndex)}
                    style={{
                      background: '#64ffda',
                      color: '#1a1a2e',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      marginTop: '12px',
                      minHeight: '40px',
                      boxSizing: 'border-box'
                    }}
                  >
                    Add Set
                  </button>
                </div>
              );
            })}
            
            <button
              onClick={saveWorkoutSession}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '18px',
                width: '100%',
                minHeight: '52px',
                boxSizing: 'border-box'
              }}
            >
              Save Complete Workout Session
            </button>
          </div>
        )}

        {/* Progress Charts & Exercise History Section */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: '#64ffda', marginBottom: '15px', fontSize: 'clamp(1.2rem, 3vw, 1.5rem)' }}>Exercise Analysis</h2>
          
          {/* Exercise selection for graphs and history */}
          <div style={{ marginBottom: '20px' }}>
            <select
              value={selectedGraphExercise}
              onChange={(e) => setSelectedGraphExercise(e.target.value)}
              style={{
                background: '#3d3d5c',
                color: '#e0e0e0',
                border: '1px solid #64ffda',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '16px',
                width: '100%',
                maxWidth: '400px',
                minHeight: '44px',
                boxSizing: 'border-box'
              }}
            >
              {EXERCISES.map(exercise => (
                <option key={exercise.key} value={exercise.key}>
                  {exercise.name} ({exercise.muscle})
                </option>
              ))}
            </select>
          </div>

          {/* Charts for selected graph exercise */}
          {(() => {
            const oneRMData = get1RMChartData(selectedGraphExercise);
            const volumeData = getVolumeChartData(selectedGraphExercise);
            const maxWeightData = getMaxWeightChartData(selectedGraphExercise);
            
            if (!oneRMData || !volumeData || !maxWeightData) {
              return (
                <div style={{
                  background: '#3d3d5c',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                  color: '#aaa'
                }}>
                  No workout data available for {EXERCISES.find(ex => ex.key === selectedGraphExercise)?.name}. 
                  Start tracking this exercise to see progress charts!
                </div>
              );
            }
            
            return (
              <div>
                <h3 style={{ color: '#64ffda', marginBottom: '15px', fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)' }}>
                  Progress Charts for {EXERCISES.find(ex => ex.key === selectedGraphExercise)?.name}
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  {/* 1RM Progression Chart */}
                  <div style={{
                    background: '#3d3d5c',
                    borderRadius: '12px',
                    padding: '16px',
                    height: '280px',
                    minHeight: '280px'
                  }}>
                    <h4 style={{ 
                      color: '#e0e0e0', 
                      margin: '0 0 15px 0',
                      fontSize: '16px'
                    }}>
                      1RM Progression
                    </h4>
                    <div style={{ height: '230px' }}>
                      <Line data={oneRMData} options={chartOptions} />
                    </div>
                  </div>

                  {/* Max Weight Chart */}
                  <div style={{
                    background: '#3d3d5c',
                    borderRadius: '12px',
                    padding: '16px',
                    height: '280px',
                    minHeight: '280px'
                  }}>
                    <h4 style={{ 
                      color: '#e0e0e0', 
                      margin: '0 0 15px 0',
                      fontSize: '16px'
                    }}>
                      Max Weight
                    </h4>
                    <div style={{ height: '230px' }}>
                      <Scatter data={maxWeightData} options={maxWeightChartOptions} />
                    </div>
                  </div>

                  {/* Volume Chart */}
                  <div style={{
                    background: '#3d3d5c',
                    borderRadius: '12px',
                    padding: '16px',
                    height: '280px',
                    minHeight: '280px'
                  }}>
                    <h4 style={{ 
                      color: '#e0e0e0', 
                      margin: '0 0 15px 0',
                      fontSize: '16px'
                    }}>
                      Volume per Session
                    </h4>
                    <div style={{ height: '230px' }}>
                      <Bar data={volumeData} options={chartOptions} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Recent Sessions for Selected Exercise */}
          {(() => {
            const exerciseHistory = workouts
              .filter(w => w.exercise === selectedGraphExercise)
              .slice(-10)
              .reverse();
            
            if (exerciseHistory.length === 0) {
              return (
                <div style={{
                  background: '#3d3d5c',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  color: '#aaa',
                  marginTop: '20px'
                }}>
                  No workout history available for {EXERCISES.find(ex => ex.key === selectedGraphExercise)?.name}. 
                  Complete some workouts to see your session history!
                </div>
              );
            }
            
            return (
              <div style={{ marginTop: '25px' }}>
                <h3 style={{ 
                  color: '#64ffda', 
                  marginBottom: '15px', 
                  fontSize: 'clamp(1.1rem, 2.5vw, 1.3rem)' 
                }}>
                  Recent Sessions - {EXERCISES.find(ex => ex.key === selectedGraphExercise)?.name}
                </h3>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '4px'
                }}>
                  {exerciseHistory.map((session, sessionIndex) => (
                    <div key={sessionIndex} style={{
                      background: '#3d3d5c',
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(100, 255, 218, 0.1)'
                    }}>
                      <div style={{ 
                        color: '#64ffda', 
                        fontWeight: 'bold',
                        marginBottom: '12px',
                        fontSize: '16px'
                      }}>
                        {new Date(session.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div style={{ 
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}>
                        {session.sets.map((set, setIndex) => (
                          <div key={setIndex} style={{
                            background: '#2d2d44',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            minWidth: '65px',
                            textAlign: 'center',
                            border: '1px solid rgba(100, 255, 218, 0.2)'
                          }}>
                            {set.weight}×{set.reps}
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#aaa'
                      }}>
                        Volume: {session.sets.reduce((sum, set) => sum + (set.weight * set.reps), 0)} lbs
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}