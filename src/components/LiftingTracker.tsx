'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';
import type { Schema } from '../../amplify/data/resource';

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

  return (
    <div style={{ 
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '20px',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      minHeight: '100vh',
      color: '#e0e0e0'
    }}>
      <div style={{
        background: '#2d2d44',
        borderRadius: '15px',
        padding: '20px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px' 
        }}>
          <div style={{ color: '#aaa', fontSize: '14px' }}>
            Welcome, {user.username}
          </div>
          <h1 style={{
            textAlign: 'center',
            color: '#64ffda',
            margin: 0,
            fontSize: '2.5em'
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
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>

        {/* Add Exercise to Session */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#64ffda', marginBottom: '15px' }}>Add Exercise to Workout</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={selectedExercise}
              onChange={(e) => setSelectedExercise(e.target.value)}
              style={{
                background: '#3d3d5c',
                color: '#e0e0e0',
                border: '1px solid #64ffda',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '16px',
                minWidth: '300px'
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
                borderRadius: '8px',
                padding: '10px 20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
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
                <div style={{ marginTop: '15px', display: 'flex', gap: '20px' }}>
                  <div style={{ background: '#3d3d5c', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#aaa' }}>Last Weight</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.lastWeight} lbs</div>
                  </div>
                  <div style={{ background: '#3d3d5c', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#aaa' }}>Max Weight</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.maxWeight} lbs</div>
                  </div>
                  <div style={{ background: '#3d3d5c', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#aaa' }}>Sessions</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.totalSessions}</div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Current Workout Session */}
        {currentSession.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ color: '#64ffda', marginBottom: '15px' }}>Current Workout Session</h2>
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
                  borderRadius: '10px',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '15px' 
                  }}>
                    <h3 style={{ color: '#64ffda', margin: 0 }}>
                      {exercise?.name} ({exercise?.muscle}) - {exercise?.repRange} reps
                    </h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => getAIRecommendations(sessionExercise.exercise)}
                        disabled={loadingAI[sessionExercise.exercise]}
                        style={{
                          background: loadingAI[sessionExercise.exercise] ? '#666' : '#9c27b0',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: loadingAI[sessionExercise.exercise] ? 'not-allowed' : 'pointer',
                          fontSize: '14px'
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
                          borderRadius: '6px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Exercise Stats */}
                  {exerciseStats && (
                    <div style={{ marginBottom: '15px', display: 'flex', gap: '15px' }}>
                      <div style={{ background: '#2d2d44', padding: '8px 12px', borderRadius: '6px', flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>Last Weight</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{exerciseStats.lastWeight} lbs</div>
                      </div>
                      <div style={{ background: '#2d2d44', padding: '8px 12px', borderRadius: '6px', flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>Max Weight</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{exerciseStats.maxWeight} lbs</div>
                      </div>
                      <div style={{ background: '#2d2d44', padding: '8px 12px', borderRadius: '6px', flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#aaa' }}>Sessions</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{exerciseStats.totalSessions}</div>
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

                  {/* AI Recommendations for this exercise */}
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

                  {sessionExercise.sets.map((set, setIndex) => (
                    <div key={setIndex} style={{ 
                      display: 'flex', 
                      gap: '10px', 
                      alignItems: 'center', 
                      marginBottom: '10px' 
                    }}>
                      <span style={{ minWidth: '60px' }}>Set {setIndex + 1}:</span>
                      <input
                        type="number"
                        placeholder="Weight"
                        value={set.weight || ''}
                        onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, 'weight', Number(e.target.value))}
                        style={{
                          background: '#2d2d44',
                          color: '#e0e0e0',
                          border: '1px solid #64ffda',
                          borderRadius: '4px',
                          padding: '8px',
                          width: '80px'
                        }}
                      />
                      <span>lbs</span>
                      <input
                        type="number"
                        placeholder="Reps"
                        value={set.reps || ''}
                        onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, 'reps', Number(e.target.value))}
                        style={{
                          background: '#2d2d44',
                          color: '#e0e0e0',
                          border: '1px solid #64ffda',
                          borderRadius: '4px',
                          padding: '8px',
                          width: '80px'
                        }}
                      />
                      <span>reps</span>
                      {sessionExercise.sets.length > 1 && (
                        <button
                          onClick={() => removeSetFromExercise(exerciseIndex, setIndex)}
                          style={{
                            background: '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '5px 10px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Remove Set
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
                      borderRadius: '6px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      marginTop: '10px'
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
                borderRadius: '8px',
                padding: '15px 30px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '18px',
                width: '100%'
              }}
            >
              Save Complete Workout Session
            </button>
          </div>
        )}

        {/* Recent Workouts */}
        <div>
          <h2 style={{ color: '#64ffda', marginBottom: '15px' }}>Recent Workouts</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {workouts
              .slice(-15)
              .reverse()
              .map((workout, index) => (
                <div key={index} style={{
                  background: '#3d3d5c',
                  padding: '15px',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                    {EXERCISES.find(ex => ex.key === workout.exercise)?.name} - {workout.date}
                  </div>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {workout.sets.map((set, setIndex) => (
                      <div key={setIndex} style={{
                        background: '#4d4d6b',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}>
                        {set.weight} lbs × {set.reps}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}