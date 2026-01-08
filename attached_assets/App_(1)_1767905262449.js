import React, { useState, useEffect } from 'react';
import { Calendar, Activity, Utensils, Brain, TrendingUp, MapPin, Zap, Target, ChevronRight, Award, Settings, Edit, Sparkles, LogOut } from 'lucide-react';
import { supabase } from './supabaseClient';
import Auth from './Auth';

const Sub3VTApp = () => {
  // Authentication state
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [nutritionLog, setNutritionLog] = useState([]);
  const [coachInsights, setCoachInsights] = useState([]);
  
  // User Settings
  const [bodyWeight, setBodyWeight] = useState(168);
  const [targetTime, setTargetTime] = useState('2:59:59');
  const [raceDate, setRaceDate] = useState('');
  
  // Training Plan Settings
  const [inTrainingPlan, setInTrainingPlan] = useState(false);
  const [totalTrainingWeeks, setTotalTrainingWeeks] = useState(16);
  const [trainingStartDate, setTrainingStartDate] = useState(null);
  
  // Calendar View Settings
  const [calendarView, setCalendarView] = useState('month'); // 'month' or 'week'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workoutsByDate, setWorkoutsByDate] = useState({}); // Store workouts by date key
  const [selectedDayForEdit, setSelectedDayForEdit] = useState(null); // For modal
  const [dayDetails, setDayDetails] = useState({}); // Store full day details (workout + nutrition)
  
  // Strava Integration State
  const [stravaConnected, setStravaConnected] = useState(false);
  const [stravaToken, setStravaToken] = useState(null);
  const [stravaAthlete, setStravaAthlete] = useState(null);
  
  // Check for Strava OAuth on mount
  useEffect(() => {
    // Check for stored token
    const storedToken = localStorage.getItem('strava_access_token');
    const storedAthlete = localStorage.getItem('strava_athlete');
    
    if (storedToken) {
      setStravaToken(storedToken);
      setStravaConnected(true);
      if (storedAthlete) {
        setStravaAthlete(JSON.parse(storedAthlete));
      }
    }

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const scope = urlParams.get('scope');
    
    if (code && scope && !storedToken) {
      exchangeStravaToken(code);
    }
  }, []);

  // Strava OAuth - Connect
  const connectStrava = () => {
    const clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
    const redirectUri = `${window.location.origin}/`;
    const scope = 'read,activity:read_all';
    
    if (!clientId) {
      alert('Strava Client ID not configured. Please check your .env file has REACT_APP_STRAVA_CLIENT_ID');
      return;
    }
    
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&approval_prompt=auto`;
    window.location.href = authUrl;
  };

  // Exchange OAuth code for token
  const exchangeStravaToken = async (code) => {
    try {
      const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.REACT_APP_STRAVA_CLIENT_ID,
          client_secret: process.env.REACT_APP_STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      if (data.access_token) {
        // Save to database
        if (user && supabase) {
          const { error } = await supabase
            .from('strava_connections')
            .upsert({
              user_id: user.id,
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              athlete_id: data.athlete.id,
              athlete_data: data.athlete,
              expires_at: new Date(data.expires_at * 1000).toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            });
          
          if (error) {
            console.error('❌ Error saving Strava connection:', error);
          } else {
            console.log('✅ Strava connection saved to database');
          }
        }
        
        setStravaToken(data.access_token);
        setStravaConnected(true);
        setStravaAthlete(data.athlete);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Sync activities
        syncStravaActivities(data.access_token);
      }
    } catch (error) {
      console.error('Strava OAuth error:', error);
      alert('Failed to connect to Strava. Please try again.');
    }
  };

  // Sync Strava activities and update training plan
  const syncStravaActivities = async (token = stravaToken) => {
    if (!token) {
      connectStrava();
      return;
    }
    
    try {
      // Use our serverless proxy to avoid CORS issues
      const response = await fetch(`/api/strava?endpoint=athlete/activities&method=GET`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const activities = await response.json();
      const runs = activities.filter(a => a.type === 'Run');
      
      if (runs.length > 0) {
        // Update training plan with actual data from Strava
        const updatedPlan = { ...trainingPlan };
        let updatedCount = 0;
        
        runs.forEach(run => {
          const runDate = new Date(run.start_date);
          const dayOfWeek = runDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const runDayName = dayNames[dayOfWeek];
          
          // Convert meters to miles
          const miles = (run.distance / 1609.34);
          
          // Find matching workout in current week and last week
          for (let week of [currentWeek, currentWeek - 1].filter(w => w > 0 && w <= 2)) {
            if (updatedPlan[week]) {
              const dayIndex = updatedPlan[week].findIndex(w => w.day === runDayName);
              
              if (dayIndex !== -1) {
                const workout = updatedPlan[week][dayIndex];
                
                // Check if this run is within a reasonable timeframe (last 14 days)
                const daysSinceRun = Math.floor((new Date() - runDate) / (1000 * 60 * 60 * 24));
                
                if (daysSinceRun <= 14 && (!workout.actual || workout.actual === 0)) {
                  updatedPlan[week][dayIndex] = {
                    ...workout,
                    actual: parseFloat(miles.toFixed(1)),
                    fromStrava: true,
                    stravaDate: runDate.toISOString()
                  };
                  updatedCount++;
                }
              }
            }
          }
        });
        
        if (updatedCount > 0) {
          setTrainingPlan(updatedPlan);
        }
        
        setCoachInsights(prev => [...prev, {
          timestamp: new Date(),
          type: 'sync',
          message: `✅ Synced ${runs.length} runs from Strava! ${updatedCount > 0 ? `Updated ${updatedCount} workout(s) with actual mileage.` : 'Your training plan is up to date.'}`,
          sentiment: 'positive'
        }]);
        
        console.log('Synced runs:', runs);
      } else {
        setCoachInsights(prev => [...prev, {
          timestamp: new Date(),
          type: 'sync',
          message: '✅ Strava connected! No recent runs found in the last 30 activities.',
          sentiment: 'neutral'
        }]);
      }
    } catch (error) {
      console.error('Error syncing Strava:', error);
      alert('Failed to sync activities. You may need to reconnect Strava.');
    }
  };

  // Disconnect Strava
  const disconnectStrava = () => {
    localStorage.removeItem('strava_access_token');
    localStorage.removeItem('strava_refresh_token');
    localStorage.removeItem('strava_athlete');
    setStravaToken(null);
    setStravaConnected(false);
    setStravaAthlete(null);
  };
  
  // Training Plan State (editable)
  const [trainingPlan, setTrainingPlan] = useState({
    1: [
      { day: 'Monday', type: 'Rest', planned: 0, actual: null, pace: null },
      { day: 'Tuesday', type: 'Easy', planned: 0, actual: null, pace: null },
      { day: 'Wednesday', type: 'Easy', planned: 0, actual: null, pace: null },
      { day: 'Thursday', type: 'Easy', planned: 0, actual: null, pace: null },
      { day: 'Friday', type: 'Rest', planned: 0, actual: null, pace: null },
      { day: 'Saturday', type: 'Long Run', planned: 0, actual: null, pace: null },
      { day: 'Sunday', type: 'Recovery', planned: 0, actual: null, pace: null }
    ],
    2: [
      { day: 'Monday', type: 'Rest', planned: 0, actual: null, pace: null },
      { day: 'Tuesday', type: 'Easy', planned: 0, actual: null, pace: null },
      { day: 'Wednesday', type: 'Easy', planned: 0, actual: null, pace: null },
      { day: 'Thursday', type: 'Easy', planned: 0, actual: null, pace: null },
      { day: 'Friday', type: 'Rest', planned: 0, actual: null, pace: null },
      { day: 'Saturday', type: 'Long Run', planned: 0, actual: null, pace: null },
      { day: 'Sunday', type: 'Recovery', planned: 0, actual: null, pace: null }
    ]
  });
  
  // AI Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Derived values
  const targetTimeInSeconds = targetTime.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
  const targetPacePerMile = Math.floor(targetTimeInSeconds / 26.2 / 60) + ':' + 
    String(Math.round((targetTimeInSeconds / 26.2) % 60)).padStart(2, '0');

  // Race day countdown - Burlington Marathon
  // Parse race date correctly (YYYY-MM-DD format)
  let daysToRace = 0;
  if (raceDate) {
    const [year, month, day] = raceDate.split('-').map(Number);
    const raceDateObj = new Date(year, month - 1, day); // month is 0-indexed
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to midnight for accurate day counting
    raceDateObj.setHours(0, 0, 0, 0);
    daysToRace = Math.ceil((raceDateObj - today) / (1000 * 60 * 60 * 24));
  }

  // Get Monday of current week
  const getMondayOfWeek = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    // If it's Sunday (0), go forward to Monday. Otherwise, go back to Monday.
    const diff = day === 0 ? 1 : (day === 1 ? 0 : -(day - 1));
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return monday;
  };

  const today = new Date();
  const currentMonday = getMondayOfWeek(today);
  const weekOfDate = currentMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  const weeklyVolume = {
    week1: { 
      planned: trainingPlan[1]?.reduce((sum, w) => sum + w.planned, 0) || 0, 
      actual: trainingPlan[1]?.reduce((sum, w) => sum + (w.actual || 0), 0) || 0 
    },
    week2: { 
      planned: trainingPlan[2]?.reduce((sum, w) => sum + w.planned, 0) || 0, 
      actual: trainingPlan[2]?.reduce((sum, w) => sum + (w.actual || 0), 0) || 0 
    }
  };
  
  // Get current week's volume
  const currentWeekVolume = {
    planned: trainingPlan[currentWeek]?.reduce((sum, w) => sum + w.planned, 0) || 0,
    actual: trainingPlan[currentWeek]?.reduce((sum, w) => sum + (w.actual || 0), 0) || 0
  };

  // Check authentication status
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user data from Supabase
  useEffect(() => {
    if (!user || !supabase) return;

    const loadUserData = async () => {
      try {
        console.log('Loading user data for user:', user.id);
        
        // Load settings
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (settingsError) {
          console.error('Error loading settings:', settingsError);
        }

        if (settings) {
          console.log('✅ Settings loaded:', settings);
          console.log('Race date from DB:', settings.race_date);
          setBodyWeight(settings.body_weight);
          setTargetTime(settings.target_time);
          setRaceDate(settings.race_date);
          setInTrainingPlan(settings.in_training_plan);
          setTotalTrainingWeeks(settings.total_training_weeks);
          setCurrentWeek(settings.current_week || 1);
          if (settings.training_start_date) {
            setTrainingStartDate(new Date(settings.training_start_date));
          }
        } else {
          console.log('⚠️ No settings found in database');
        }

        // Load calendar day details
        const { data: days, error: daysError } = await supabase
          .from('day_details')
          .select('*')
          .eq('user_id', user.id);

        if (daysError) {
          console.error('Error loading day details:', daysError);
        }

        if (days) {
          console.log('Day details loaded:', days.length, 'entries');
          const detailsMap = {};
          days.forEach(day => {
            detailsMap[day.date] = {
              workout: day.workout_type,
              miles: day.miles,
              pace: day.pace,
              protein: day.protein,
              carbs: day.carbs,
              fats: day.fats,
              notes: day.notes
            };
          });
          setDayDetails(detailsMap);
        }

        // Load nutrition entries
        const { data: nutrition } = await supabase
          .from('nutrition_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(100);

        if (nutrition) {
          setNutritionLog(nutrition.map(n => ({
            ...n,
            date: new Date(n.date)
          })));
        }

        // Load Strava connection
        const { data: stravaConnection } = await supabase
          .from('strava_connections')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (stravaConnection) {
          setStravaToken(stravaConnection.access_token);
          setStravaConnected(true);
          setStravaAthlete(stravaConnection.athlete_data);
          
          // Auto-sync Strava activities on load
          syncStravaActivities(stravaConnection.access_token);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user]);

  // Auto-save settings when they change
  useEffect(() => {
    if (!user || !supabase) return;

    const saveSettings = async () => {
      try {
        console.log('💾 Saving settings:', {
          race_date: raceDate,
          body_weight: bodyWeight,
          target_time: targetTime
        });
        
        const { data, error } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            body_weight: bodyWeight,
            target_time: targetTime,
            race_date: raceDate,
            in_training_plan: inTrainingPlan,
            total_training_weeks: totalTrainingWeeks,
            current_week: currentWeek,
            training_start_date: trainingStartDate?.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'  // Specify which column to check for conflicts
          });
          
        if (error) {
          console.error('❌ Error saving settings:', error);
        } else {
          console.log('✅ Settings saved successfully');
        }
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    };

    const timeoutId = setTimeout(saveSettings, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [user, bodyWeight, targetTime, raceDate, inTrainingPlan, totalTrainingWeeks, currentWeek, trainingStartDate]);

  // Auto-sync Strava activities every 15 minutes if connected
  useEffect(() => {
    if (!stravaConnected || !stravaToken) return;

    // Sync immediately on connect
    syncStravaActivities(stravaToken);

    // Then sync every 15 minutes
    const syncInterval = setInterval(() => {
      syncStravaActivities(stravaToken);
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(syncInterval);
  }, [stravaConnected, stravaToken]);

  // Helper function to save day details
  const saveDayDetails = async (dateKey, details) => {
    if (!user || !supabase) return;

    try {
      const { error } = await supabase
        .from('day_details')
        .upsert({
          user_id: user.id,
          date: dateKey,
          workout_type: details.workout || null,
          miles: details.miles || null,
          pace: details.pace || null,
          protein: details.protein || null,
          carbs: details.carbs || null,
          fats: details.fats || null,
          notes: details.notes || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,date'  // Composite key: user_id + date must be unique
        });
      
      if (error) {
        console.error('❌ Error saving day details:', error);
      }
    } catch (error) {
      console.error('Error saving day details:', error);
    }
  };

  // Nutrition tracking
  const addNutritionEntry = (entry) => {
    setNutritionLog(prev => [...prev, { ...entry, date: new Date() }]);
  };
  
  // Function to update training plan (callable by AI)
  const updateTrainingPlanFromAI = (updates) => {
    setTrainingPlan(prev => {
      const newPlan = { ...prev };
      updates.forEach(update => {
        const { week, day, type, mileage, pace } = update;
        if (newPlan[week]) {
          const dayIndex = newPlan[week].findIndex(w => w.day === day);
          if (dayIndex !== -1) {
            newPlan[week][dayIndex] = {
              ...newPlan[week][dayIndex],
              type: type || newPlan[week][dayIndex].type,
              planned: mileage !== undefined ? mileage : newPlan[week][dayIndex].planned,
              pace: pace || newPlan[week][dayIndex].pace
            };
          }
        }
      });
      return newPlan;
    });
  };

  // AI Chat handler using Claude API with tool use
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');
    setIsGenerating(true);
    
    try {
      // Build conversation history for Claude
      const messages = [
        ...chatMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        {
          role: 'user',
          content: currentInput
        }
      ];
      
      // Call Claude API with tool use capability
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          system: `You are an expert marathon training coach helping a runner prepare for the Burlington Marathon. 

Runner Details:
- Target finish time: ${targetTime}
- Race date: ${raceDate} (${daysToRace} days away)
- Current body weight: ${bodyWeight} lbs
- Target pace: ${targetPacePerMile} per mile

Current Training Plan (Weeks 1-2):
${JSON.stringify(trainingPlan, null, 2)}

Your role is to:
1. Create personalized training plans
2. Provide expert coaching advice
3. Update the training plan when requested

When the user asks you to modify their training plan:
1. First, provide your coaching advice and explain the changes
2. Then, at the END of your response, include the updates in this EXACT format on separate lines:
UPDATE: Week [number], [Day], [Type], [Miles], [Pace]

Example:
UPDATE: Week 1, Tuesday, Tempo, 10, 7:00
UPDATE: Week 1, Saturday, Long Run, 20, 7:45

Important:
- Use workout types: Easy, Tempo, Intervals, Long Run, Recovery, Rest
- Always include all 5 fields even if some don't change
- Put UPDATE lines at the very end
- Be conversational and supportive in your coaching`,
          messages: messages
        })
      });
      
      const data = await response.json();
      
      // Check if response was successful
      if (!response.ok) {
        throw new Error(data.error?.message || `API Error: ${response.status}`);
      }
      
      // Get response text
      let responseText = data.content?.[0]?.text || 'I apologize, but I encountered an error. Please try again.';
      
      // Parse for UPDATE commands and apply them
      const updateLines = responseText.match(/UPDATE:.*$/gm);
      if (updateLines && updateLines.length > 0) {
        const updates = [];
        updateLines.forEach(line => {
          // Parse: UPDATE: Week 1, Tuesday, Tempo, 10, 7:00
          const match = line.match(/UPDATE:\s*Week\s*(\d+),\s*(\w+),\s*([^,]+),\s*([\d.]+),\s*(.+)/);
          if (match) {
            updates.push({
              week: parseInt(match[1]),
              day: match[2].trim(),
              type: match[3].trim(),
              mileage: parseFloat(match[4]),
              pace: match[5].trim()
            });
          }
        });
        
        if (updates.length > 0) {
          updateTrainingPlanFromAI(updates);
          // Remove UPDATE lines from display text
          responseText = responseText.replace(/UPDATE:.*$/gm, '').trim();
          responseText += '\n\n✓ Training plan updated!';
        }
      }
      
      const aiResponse = {
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Claude API Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `I'm your AI training coach! I can help you create a personalized marathon training plan and update it directly. Try asking me things like:

• "Create a 16-week training plan to break 3 hours"
• "Change Tuesday's workout to 10 miles at tempo pace"
• "Make Saturday a 20-mile long run"
• "Update week 2 with more rest days"

Note: The AI features work best when this app is deployed outside of the artifact environment.`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate carb needs based on tomorrow's workout
  const getNextWorkoutCarbGoal = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();
    const workouts = trainingPlan[currentWeek];
    const tomorrowWorkout = workouts[dayOfWeek];
    
    if (!tomorrowWorkout || tomorrowWorkout.type === 'Rest') return bodyWeight * 5;
    if (tomorrowWorkout.type === 'Long Run' || tomorrowWorkout.type === 'Intervals') {
      return bodyWeight * 8; // High intensity
    }
    return bodyWeight * 6; // Moderate
  };

  const carbGoal = getNextWorkoutCarbGoal();

  // Pace zones calculator based on target marathon pace
  const targetPaceSeconds = parseInt(targetPacePerMile.split(':')[0]) * 60 + parseInt(targetPacePerMile.split(':')[1]);
  const formatPace = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };
  
  const paceZones = {
    'Easy': `${formatPace(targetPaceSeconds + 90)} - ${formatPace(targetPaceSeconds + 120)}`,
    'Marathon Pace': targetPacePerMile,
    'Half Marathon Pace': formatPace(targetPaceSeconds - 21),
    'Tempo': `${formatPace(targetPaceSeconds + 9)} - ${formatPace(targetPaceSeconds + 24)}`,
    'Intervals': `${formatPace(targetPaceSeconds - 31)} - ${formatPace(targetPaceSeconds - 16)}`,
    'Recovery': `${formatPace(targetPaceSeconds + 120)} - ${formatPace(targetPaceSeconds + 150)}`
  };

  // Show loading screen
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(0, 247, 255, 0.1)',
          borderTop: '4px solid #00f7ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          color: '#00f7ff',
          fontSize: '18px',
          fontWeight: '700'
        }}>
          Loading Sub3-VT...
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (supabase && !user) {
    return <Auth supabase={supabase} onAuthSuccess={setUser} />;
  }

  // Show main app
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
      color: '#e8edf4',
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 247, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 247, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: 0.4,
        pointerEvents: 'none'
      }} />

      {/* Header */}
      <header style={{
        background: 'rgba(10, 14, 39, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 247, 255, 0.1)',
        padding: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Logo */}
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '900',
              fontSize: '24px',
              color: '#0a0e27',
              boxShadow: '0 0 30px rgba(0, 247, 255, 0.4)',
              flexShrink: 0
            }}>
              S3
            </div>
            
            {/* Countdown - responsive */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flex: '1 1 auto',
              justifyContent: 'center',
              minWidth: '0'
            }}>
              <div style={{
                padding: '0.75rem 1.5rem',
                background: 'linear-gradient(135deg, rgba(0, 247, 255, 0.15) 0%, rgba(0, 132, 255, 0.15) 100%)',
                border: '2px solid rgba(0, 247, 255, 0.3)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                minWidth: '0',
                maxWidth: '100%'
              }}>
                {/* Top: Race Name */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#e8edf4',
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  BURLINGTON MARATHON
                </div>
                
                {/* Bottom: Info + Countdown */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  {/* Left: Race Info */}
                  <div style={{ 
                    textAlign: 'left',
                    borderRight: window.innerWidth > 768 ? '1px solid rgba(0, 247, 255, 0.2)' : 'none',
                    paddingRight: window.innerWidth > 768 ? '1rem' : '0',
                    minWidth: '0'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: '#e8edf4',
                      marginBottom: '0.25rem',
                      whiteSpace: 'nowrap'
                    }}>
                      {raceDate}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#7b8ba0',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>
                      Goal: <span style={{ color: '#00f7ff', fontWeight: '700' }}>{targetTime}</span>
                    </div>
                  </div>
                  
                  {/* Right: Countdown */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '36px',
                      fontWeight: '900',
                      background: 'linear-gradient(135deg, #00f7ff 0%, #ffffff 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                      marginBottom: '0.25rem'
                    }}>
                      {daysToRace}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      color: '#7b8ba0',
                      letterSpacing: '0.15em',
                      whiteSpace: 'nowrap'
                    }}>
                      DAYS TO RACE
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* AI Coach Button */}
            <button
              onClick={() => setActiveTab('coach')}
              style={{
                padding: '12px 24px',
                background: activeTab === 'coach' 
                  ? 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)'
                  : 'linear-gradient(135deg, rgba(0, 247, 255, 0.1) 0%, rgba(0, 132, 255, 0.1) 100%)',
                border: `1px solid ${activeTab === 'coach' ? 'rgba(0, 247, 255, 0.4)' : 'rgba(0, 247, 255, 0.2)'}`,
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                color: activeTab === 'coach' ? '#0a0e27' : '#00f7ff',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: activeTab === 'coach' ? '0 0 20px rgba(0, 247, 255, 0.3)' : 'none'
              }}
              onMouseEnter={e => {
                if (activeTab !== 'coach') {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 247, 255, 0.15) 0%, rgba(0, 132, 255, 0.15) 100%)';
                }
              }}
              onMouseLeave={e => {
                if (activeTab !== 'coach') {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 247, 255, 0.1) 0%, rgba(0, 132, 255, 0.1) 100%)';
                }
              }}
            >
              <Brain size={18} />
              AI COACH
            </button>
            
            {/* Logout Button */}
            {user && supabase && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(255, 0, 132, 0.1)',
                  border: '1px solid rgba(255, 0, 132, 0.2)',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#ff0084',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 0, 132, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 0, 132, 0.1)';
                }}
              >
                <LogOut size={16} />
                Log Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        background: 'rgba(26, 31, 58, 0.6)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 247, 255, 0.08)',
        position: 'sticky',
        top: window.innerWidth > 768 ? '88px' : '100px',
        zIndex: 99,
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE/Edge
      }}>
        <style>{`
          nav::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
          }
        `}</style>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          display: 'flex', 
          gap: '0.5rem',
          padding: '0 1rem',
          width: '100%'
        }}>
          {[
            { id: 'dashboard', icon: TrendingUp, label: 'Dashboard' },
            { id: 'workouts', icon: Activity, label: 'Workouts' },
            { id: 'calendar-view', icon: Calendar, label: 'Calendar' },
            { id: 'nutrition', icon: Utensils, label: 'Nutrition' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'rgba(0, 247, 255, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #00f7ff' : '2px solid transparent',
                color: activeTab === tab.id ? '#00f7ff' : '#7b8ba0',
                padding: '1rem 1.5rem',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                flex: '1 1 0',
                minWidth: 0
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: window.innerWidth > 768 ? '2rem' : '1rem'
      }}>
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            
            {/* Hero Stats - Fixed 3x2 Grid */}
            <style>{`
              .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 1.5rem;
              }
              @media (max-width: 1024px) {
                .dashboard-grid {
                  grid-template-columns: repeat(2, 1fr);
                }
              }
              @media (max-width: 640px) {
                .dashboard-grid {
                  grid-template-columns: 1fr;
                }
              }
            `}</style>
            <div className="dashboard-grid">
              <StatCard
                icon={Target}
                label="Target Time"
                value={targetTime}
                subtitle={`${targetPacePerMile}/mile`}
                color="#00f7ff"
              />
              <StatCard
                icon={Activity}
                label={`Week ${currentWeek} Volume`}
                value={`${(currentWeekVolume.actual > 0 ? currentWeekVolume.actual : currentWeekVolume.planned).toFixed(1)}mi`}
                subtitle={`Planned: ${currentWeekVolume.planned.toFixed(1)}mi`}
                color="#00ff88"
              />
              <RunsCompletedCard 
                trainingPlan={trainingPlan[currentWeek]}
                color="#ff6b00"
              />
              <DailyMacrosCard 
                dayDetails={dayDetails}
                color="#a855f7"
              />
              <StatCard
                icon={Zap}
                label="Current Weight"
                value={`${bodyWeight}lbs`}
                subtitle="Race weight target"
                color="#ff0084"
              />
              <MotivationalQuoteCard />
            </div>

            {/* Weekly Volume Chart - Enhanced */}
            <div style={{
              background: '#0B1117',
              border: '1px solid rgba(0, 247, 255, 0.1)',
              borderRadius: '16px',
              padding: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '20px',
                fontWeight: '700',
                color: '#e8edf4',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <TrendingUp size={24} style={{ color: '#00f7ff' }} />
                Weekly Volume Progression
              </h2>
              
              {/* Chart Container */}
              <div style={{ 
                position: 'relative', 
                height: '300px',
                width: '100%'
              }}>
                {/* Y-Axis Labels & Grid Lines */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: '40px',
                  width: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  {[25, 20, 15, 10, 5, 0].map(miles => (
                    <div key={miles} style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      position: 'relative'
                    }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#7b8ba0',
                        fontWeight: '600'
                      }}>
                        {miles}
                      </span>
                      {/* Horizontal Grid Line */}
                      <div style={{
                        position: 'absolute',
                        left: '40px',
                        width: 'calc(100vw - 120px)',
                        maxWidth: '1320px',
                        height: '1px',
                        background: 'rgba(123, 139, 160, 0.1)'
                      }} />
                    </div>
                  ))}
                </div>

                {/* Y-Axis Label */}
                <div style={{
                  position: 'absolute',
                  left: '-10px',
                  top: '50%',
                  transform: 'rotate(-90deg) translateX(-50%)',
                  transformOrigin: 'left center',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#7b8ba0',
                  letterSpacing: '0.05em'
                }}>
                  MILES
                </div>

                {/* Chart Area */}
                <svg 
                  viewBox="0 0 700 260" 
                  style={{
                    position: 'absolute',
                    left: '40px',
                    top: 0,
                    right: 0,
                    bottom: '40px',
                    width: 'calc(100% - 40px)',
                    height: 'calc(100% - 40px)',
                    overflow: 'visible'
                  }}
                >
                  <defs>
                    {/* Clip path to keep elements within bounds */}
                    <clipPath id="chart-bounds">
                      <rect x="-10" y="-10" width="720" height="280" />
                    </clipPath>
                    
                    {/* Glow filters for intensity markers */}
                    <filter id="threshold-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <filter id="easy-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <filter id="long-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  <g clipPath="url(#chart-bounds)">
                    {/* Planned Line (Dashed Grey) */}
                    <path
                      d={trainingPlan[currentWeek]?.map((day, i) => {
                        const x = (i / 6) * 700;
                        const y = Math.max(0, Math.min(260, 260 - (day.planned / 25 * 260)));
                        return i === 0 ? `M ${x},${y}` : `L ${x},${y}`;
                      }).join(' ')}
                      stroke="#4A4A4A"
                      strokeWidth="2"
                      strokeDasharray="5, 5"
                      fill="none"
                      opacity="0.6"
                    />

                    {/* Actual Line (Smooth Neon Blue) */}
                    <path
                      d={trainingPlan[currentWeek]?.map((day, i) => {
                        const x = (i / 6) * 700;
                        const miles = day.actual || day.planned;
                        const y = Math.max(0, Math.min(260, 260 - (miles / 25 * 260)));
                        if (i === 0) return `M ${x},${y}`;
                        // Smooth bezier curve
                        const prevX = ((i-1) / 6) * 700;
                        const prevMiles = trainingPlan[currentWeek][i-1].actual || trainingPlan[currentWeek][i-1].planned;
                        const prevY = Math.max(0, Math.min(260, 260 - (prevMiles / 25 * 260)));
                        const cpX1 = prevX + (x - prevX) / 3;
                        const cpX2 = prevX + 2 * (x - prevX) / 3;
                        return `C ${cpX1},${prevY} ${cpX2},${y} ${x},${y}`;
                      }).join(' ')}
                      stroke="#00E5FF"
                      strokeWidth="3"
                      fill="none"
                    />

                    {/* Data Points with Intensity Glow */}
                    {trainingPlan[currentWeek]?.map((day, i) => {
                      const x = (i / 6) * 700;
                      const miles = day.actual || day.planned;
                      const y = Math.max(10, Math.min(250, 260 - (miles / 25 * 260)));
                    
                    // Determine glow color based on workout type
                    let glowColor = '#22c55e'; // Green for easy/recovery (different from line)
                    if (day.type === 'Tempo' || day.type === 'Intervals') {
                      glowColor = '#f97316'; // Orange for threshold/intervals (less harsh)
                    } else if (day.type === 'Long Run') {
                      glowColor = '#A020F0'; // Purple for long runs
                    }

                    return (
                      <g key={i}>
                        {/* Glow circle */}
                        <circle
                          cx={x}
                          cy={y}
                          r="8"
                          fill={glowColor}
                          opacity="0.4"
                          style={{
                            filter: `drop-shadow(0 0 8px ${glowColor})`
                          }}
                        />
                        {/* Data point - colored by workout type */}
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill={glowColor}
                          stroke="#0B1117"
                          strokeWidth="2"
                          style={{
                            cursor: 'pointer'
                          }}
                        />
                        {/* Invisible larger hit area for tooltip */}
                        <circle
                          cx={x}
                          cy={y}
                          r="15"
                          fill="transparent"
                          style={{
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            // Show tooltip
                            const tooltip = document.getElementById(`tooltip-${i}`);
                            if (tooltip) tooltip.style.display = 'block';
                          }}
                          onMouseLeave={(e) => {
                            // Hide tooltip
                            const tooltip = document.getElementById(`tooltip-${i}`);
                            if (tooltip) tooltip.style.display = 'none';
                          }}
                        />
                        {/* Tooltip */}
                        <g 
                          id={`tooltip-${i}`}
                          style={{ display: 'none' }}
                        >
                          <rect
                            x={x - 40}
                            y={y - 60}
                            width="80"
                            height="50"
                            fill="rgba(10, 14, 39, 0.95)"
                            stroke="rgba(0, 247, 255, 0.3)"
                            strokeWidth="1"
                            rx="6"
                          />
                          <text
                            x={x}
                            y={y - 42}
                            textAnchor="middle"
                            fill="#00f7ff"
                            fontSize="11"
                            fontWeight="700"
                          >
                            {day.type}
                          </text>
                          <text
                            x={x}
                            y={y - 28}
                            textAnchor="middle"
                            fill="#e8edf4"
                            fontSize="10"
                          >
                            {miles.toFixed(1)} mi
                          </text>
                          {day.pace && (
                            <text
                              x={x}
                              y={y - 16}
                              textAnchor="middle"
                              fill="#7b8ba0"
                              fontSize="9"
                            >
                              {day.pace}/mi
                            </text>
                          )}
                        </g>
                      </g>
                    );
                  })}
                  </g>
                </svg>

                {/* X-Axis Labels */}
                <div style={{
                  position: 'absolute',
                  left: '40px',
                  right: 0,
                  bottom: 0,
                  height: '40px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingTop: '10px'
                }}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, i) => (
                    <div key={i} style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#7b8ba0'
                    }}>
                      {letter}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div style={{ 
                display: 'flex', 
                gap: '2rem', 
                marginTop: '2rem', 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '30px', 
                    height: '2px', 
                    background: '#4A4A4A', 
                    opacity: 0.6,
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      background: 'repeating-linear-gradient(to right, #4A4A4A 0, #4A4A4A 5px, transparent 5px, transparent 10px)'
                    }} />
                  </div>
                  <span style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '600' }}>Planned</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '30px', height: '3px', background: '#00E5FF', borderRadius: '2px' }} />
                  <span style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '600' }}>Actual</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    background: '#f97316', 
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #f97316'
                  }} />
                  <span style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '600' }}>Threshold</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    background: '#A020F0', 
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #A020F0'
                  }} />
                  <span style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '600' }}>Long Run</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    background: '#22c55e', 
                    borderRadius: '50%',
                    boxShadow: '0 0 8px #22c55e'
                  }} />
                  <span style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '600' }}>Easy/Recovery</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {!stravaConnected ? (
                <ActionButton
                  icon={Activity}
                  label="Connect Strava"
                  onClick={connectStrava}
                  color="#00f7ff"
                />
              ) : (
                <>
                  <ActionButton
                    icon={Activity}
                    label="Sync Strava"
                    onClick={() => syncStravaActivities()}
                    color="#00f7ff"
                  />
                  <ActionButton
                    icon={Activity}
                    label="Disconnect"
                    onClick={disconnectStrava}
                    color="#ff0084"
                  />
                </>
              )}
              <ActionButton
                icon={Utensils}
                label="Log Nutrition"
                onClick={() => setActiveTab('nutrition')}
                color="#00ff88"
              />
              <ActionButton
                icon={Brain}
                label="View Coach"
                onClick={() => setActiveTab('coach')}
                color="#ff6b00"
              />
            </div>
          </div>
        )}

        {/* Workouts Tab */}
        {activeTab === 'workouts' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {inTrainingPlan ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <h2 style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: '800',
                        color: '#e8edf4'
                      }}>
                        Week {currentWeek} Training Schedule
                      </h2>
                      <div style={{
                        padding: '6px 12px',
                        background: 'rgba(0, 247, 255, 0.1)',
                        border: '1px solid rgba(0, 247, 255, 0.2)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#7b8ba0',
                        letterSpacing: '0.05em'
                      }}>
                        WEEK {currentWeek} / {totalTrainingWeeks}
                      </div>
                    </div>
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '14px',
                      color: '#7b8ba0',
                      fontWeight: '500'
                    }}>
                      Click any workout to edit details • Volume: {currentWeekVolume.planned.toFixed(1)}mi planned
                    </p>
                  </>
                ) : (
                  <>
                    <h2 style={{
                      margin: 0,
                      fontSize: '24px',
                      fontWeight: '800',
                      color: '#e8edf4'
                    }}>
                      Week of {weekOfDate}
                    </h2>
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '14px',
                      color: '#7b8ba0',
                      fontWeight: '500'
                    }}>
                      Track your daily workouts • Click any day to log your run
                    </p>
                  </>
                )}
              </div>
              
              {inTrainingPlan ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                    disabled={currentWeek === 1}
                    style={{
                      padding: '10px 20px',
                      background: currentWeek === 1 ? 'rgba(123, 139, 160, 0.1)' : 'rgba(0, 247, 255, 0.1)',
                      border: '1px solid rgba(0, 247, 255, 0.2)',
                      borderRadius: '8px',
                      color: currentWeek === 1 ? '#7b8ba0' : '#00f7ff',
                      cursor: currentWeek === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentWeek(Math.min(totalTrainingWeeks, currentWeek + 1))}
                    disabled={currentWeek === totalTrainingWeeks}
                    style={{
                      padding: '10px 20px',
                      background: currentWeek === totalTrainingWeeks ? 'rgba(123, 139, 160, 0.1)' : 'rgba(0, 247, 255, 0.1)',
                      border: '1px solid rgba(0, 247, 255, 0.2)',
                      borderRadius: '8px',
                      color: currentWeek === totalTrainingWeeks ? '#7b8ba0' : '#00f7ff',
                      cursor: currentWeek === totalTrainingWeeks ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    Next
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setInTrainingPlan(true);
                    setTrainingStartDate(new Date());
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#0a0e27',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 0 20px rgba(0, 247, 255, 0.3)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  Start Training Plan
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {trainingPlan[currentWeek]?.map((workout, idx) => (
                <EditableWorkoutCard 
                  key={idx} 
                  workout={workout}
                  weekNumber={currentWeek}
                  dayIndex={idx}
                  onUpdate={(updatedWorkout) => {
                    setTrainingPlan(prev => ({
                      ...prev,
                      [currentWeek]: prev[currentWeek].map((w, i) => i === idx ? updatedWorkout : w)
                    }));
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* AI Planner Tab */}
        {activeTab === 'ai-planner' && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(75, 0, 130, 0.1) 100%)',
              border: '1px solid rgba(138, 43, 226, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #8a2be2 0%, #4b0082 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(138, 43, 226, 0.4)'
                }}>
                  <Sparkles size={28} style={{ color: '#fff' }} />
                </div>
                <div>
                  <h2 style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#e8edf4'
                  }}>
                    AI Training Plan Generator
                  </h2>
                  <p style={{ margin: 0, fontSize: '14px', color: '#7b8ba0', fontWeight: '500' }}>
                    Powered by Claude - Get a personalized 16-week marathon plan
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.4)',
              border: '1px solid rgba(0, 247, 255, 0.1)',
              borderRadius: '16px',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              height: '600px'
            }}>
              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <Sparkles size={48} style={{ color: '#8a2be2', margin: '0 auto 1rem' }} />
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '20px', fontWeight: '700', color: '#e8edf4' }}>
                      Generate Your Custom Training Plan
                    </h3>
                    <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: '#7b8ba0', lineHeight: 1.7 }}>
                      Tell me about your running background, weekly mileage, injuries, and goals. I'll create a personalized 16-week marathon plan.
                    </p>
                    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '500px', margin: '0 auto' }}>
                      {[
                        'Create a sub-3 hour marathon plan',
                        'I run 30 miles/week, need a 16-week plan',
                        'Build me a plan with 2 rest days per week'
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setChatInput(prompt)}
                          style={{
                            padding: '12px',
                            background: 'rgba(138, 43, 226, 0.1)',
                            border: '1px solid rgba(138, 43, 226, 0.2)',
                            borderRadius: '8px',
                            color: '#e8edf4',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(138, 43, 226, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.3)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(138, 43, 226, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(138, 43, 226, 0.2)';
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} />
                  ))
                )}
                {isGenerating && (
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(138, 43, 226, 0.05)',
                    border: '1px solid rgba(138, 43, 226, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #8a2be2 0%, #4b0082 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Sparkles size={18} style={{ color: '#fff' }} />
                    </div>
                    <div style={{ fontSize: '14px', color: '#7b8ba0', fontWeight: '500' }}>
                      Generating your training plan...
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{
                borderTop: '1px solid rgba(0, 247, 255, 0.1)',
                padding: '1.5rem',
                background: 'rgba(10, 14, 39, 0.6)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && chatInput.trim()) {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Describe your training needs..."
                    style={{
                      flex: 1,
                      background: 'rgba(0, 247, 255, 0.05)',
                      border: '1px solid rgba(0, 247, 255, 0.2)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#e8edf4'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isGenerating}
                    style={{
                      padding: '14px 24px',
                      background: (!chatInput.trim() || isGenerating) 
                        ? 'rgba(123, 139, 160, 0.1)' 
                        : 'linear-gradient(135deg, #8a2be2 0%, #4b0082 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: (!chatInput.trim() || isGenerating) ? '#7b8ba0' : '#fff',
                      cursor: (!chatInput.trim() || isGenerating) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nutrition Tab */}
        {activeTab === 'nutrition' && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            <div style={{
              background: 'rgba(26, 31, 58, 0.4)',
              border: '1px solid rgba(0, 247, 255, 0.1)',
              borderRadius: '16px',
              padding: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '20px',
                fontWeight: '700',
                color: '#e8edf4'
              }}>
                Tomorrow's Carb Target
              </h2>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{
                  fontSize: '48px',
                  fontWeight: '900',
                  color: '#00ff88',
                  fontVariantNumeric: 'tabular-nums'
                }}>
                  {carbGoal}g
                </span>
                <span style={{ fontSize: '16px', color: '#7b8ba0', fontWeight: '600' }}>
                  ({(carbGoal / bodyWeight).toFixed(1)}g/kg)
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: '#7b8ba0', lineHeight: 1.6 }}>
                Based on {bodyWeight}lbs body weight and tomorrow's workout intensity
              </p>
            </div>

            <NutritionLogger onAdd={addNutritionEntry} />

            {nutritionLog.length > 0 && (
              <div style={{
                background: 'rgba(26, 31, 58, 0.4)',
                border: '1px solid rgba(0, 247, 255, 0.1)',
                borderRadius: '16px',
                padding: '2rem',
                backdropFilter: 'blur(10px)'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#e8edf4'
                }}>
                  Recent Entries
                </h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {nutritionLog.slice(-5).reverse().map((entry, idx) => (
                    <div key={idx} style={{
                      padding: '1rem',
                      background: 'rgba(0, 247, 255, 0.05)',
                      border: '1px solid rgba(0, 247, 255, 0.1)',
                      borderRadius: '8px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '1rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', marginBottom: '4px' }}>CARBS</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#00ff88' }}>{entry.carbs}g</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', marginBottom: '4px' }}>PROTEIN</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#00f7ff' }}>{entry.protein}g</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', marginBottom: '4px' }}>FATS</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#ff6b00' }}>{entry.fats}g</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', marginBottom: '4px' }}>CALORIES</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#e8edf4' }}>{entry.calories}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Coach Tab (Combined Coach + Planner with Chat) */}
        {activeTab === 'coach' && (
          <div style={{ display: 'grid', gap: '2rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 247, 255, 0.1) 0%, rgba(0, 132, 255, 0.1) 100%)',
              border: '1px solid rgba(0, 247, 255, 0.2)',
              borderRadius: '16px',
              padding: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 30px rgba(0, 247, 255, 0.4)'
                }}>
                  <Brain size={28} style={{ color: '#0a0e27' }} />
                </div>
                <div>
                  <h2 style={{
                    margin: 0,
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#e8edf4'
                  }}>
                    AI Performance Coach
                  </h2>
                  <p style={{ margin: 0, fontSize: '14px', color: '#7b8ba0', fontWeight: '500' }}>
                    Your personal training advisor - can analyze workouts and update your plan
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Interface */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.4)',
              border: '1px solid rgba(0, 247, 255, 0.1)',
              borderRadius: '16px',
              overflow: 'hidden',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              flexDirection: 'column',
              height: '600px'
            }}>
              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <Brain size={48} style={{ color: '#00f7ff', margin: '0 auto 1rem' }} />
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '20px', fontWeight: '700', color: '#e8edf4' }}>
                      Your AI Running Coach
                    </h3>
                    <p style={{ margin: '0 0 1.5rem 0', fontSize: '14px', color: '#7b8ba0', lineHeight: 1.7 }}>
                      I can create training plans, analyze your workouts, and update your schedule directly. Just tell me what you need!
                    </p>
                    <div style={{ display: 'grid', gap: '0.75rem', maxWidth: '500px', margin: '0 auto' }}>
                      {[
                        'Create a 16-week plan to break 3 hours',
                        'Change Tuesday to a 10-mile tempo run',
                        'How should I prepare for Battery Street hill?',
                        'Make Saturday a 20-mile long run'
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setChatInput(prompt)}
                          style={{
                            padding: '12px',
                            background: 'rgba(0, 247, 255, 0.1)',
                            border: '1px solid rgba(0, 247, 255, 0.2)',
                            borderRadius: '8px',
                            color: '#e8edf4',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(0, 247, 255, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(0, 247, 255, 0.3)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'rgba(0, 247, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(0, 247, 255, 0.2)';
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <ChatMessage key={idx} message={msg} />
                  ))
                )}
                {isGenerating && (
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(0, 247, 255, 0.05)',
                    border: '1px solid rgba(0, 247, 255, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Brain size={18} style={{ color: '#0a0e27' }} />
                    </div>
                    <div style={{ fontSize: '14px', color: '#7b8ba0', fontWeight: '500' }}>
                      Analyzing your request...
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{
                borderTop: '1px solid rgba(0, 247, 255, 0.1)',
                padding: '1.5rem',
                background: 'rgba(10, 14, 39, 0.6)'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && chatInput.trim()) {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask about training, request plan updates..."
                    style={{
                      flex: 1,
                      background: 'rgba(0, 247, 255, 0.05)',
                      border: '1px solid rgba(0, 247, 255, 0.2)',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      fontSize: '15px',
                      fontWeight: '500',
                      color: '#e8edf4'
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim() || isGenerating}
                    style={{
                      padding: '14px 24px',
                      background: (!chatInput.trim() || isGenerating) 
                        ? 'rgba(123, 139, 160, 0.1)' 
                        : 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: (!chatInput.trim() || isGenerating) ? '#7b8ba0' : '#0a0e27',
                      cursor: (!chatInput.trim() || isGenerating) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar-view' && (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Calendar Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '800',
                color: '#e8edf4'
              }}>
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* View Toggle */}
                <div style={{ 
                  display: 'flex', 
                  background: 'rgba(26, 31, 58, 0.4)',
                  border: '1px solid rgba(0, 247, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '4px'
                }}>
                  <button
                    onClick={() => setCalendarView('week')}
                    style={{
                      padding: '8px 16px',
                      background: calendarView === 'week' ? 'rgba(0, 247, 255, 0.2)' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: calendarView === 'week' ? '#00f7ff' : '#7b8ba0',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setCalendarView('month')}
                    style={{
                      padding: '8px 16px',
                      background: calendarView === 'month' ? 'rgba(0, 247, 255, 0.2)' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      color: calendarView === 'month' ? '#00f7ff' : '#7b8ba0',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Month
                  </button>
                </div>
                
                {/* Navigation */}
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (calendarView === 'month') {
                      newDate.setMonth(newDate.getMonth() - 1);
                    } else {
                      newDate.setDate(newDate.getDate() - 7);
                    }
                    setSelectedDate(newDate);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(0, 247, 255, 0.1)',
                    border: '1px solid rgba(0, 247, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#00f7ff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(0, 247, 255, 0.15)',
                    border: '1px solid rgba(0, 247, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#00f7ff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700'
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    if (calendarView === 'month') {
                      newDate.setMonth(newDate.getMonth() + 1);
                    } else {
                      newDate.setDate(newDate.getDate() + 7);
                    }
                    setSelectedDate(newDate);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(0, 247, 255, 0.1)',
                    border: '1px solid rgba(0, 247, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#00f7ff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Next
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <CalendarGrid 
              view={calendarView}
              selectedDate={selectedDate}
              dayDetails={dayDetails}
              setDayDetails={setDayDetails}
              today={today}
              setSelectedDayForEdit={setSelectedDayForEdit}
            />
            
            {/* Day Details Modal */}
            {selectedDayForEdit && (
              <DayDetailsModal 
                date={selectedDayForEdit}
                details={dayDetails[selectedDayForEdit.toISOString().split('T')[0]] || {}}
                onClose={() => setSelectedDayForEdit(null)}
                onSave={(details) => {
                  const dateKey = selectedDayForEdit.toISOString().split('T')[0];
                  setDayDetails(prev => ({
                    ...prev,
                    [dateKey]: details
                  }));
                  saveDayDetails(dateKey, details);
                  setSelectedDayForEdit(null);
                }}
              />
            )}
          </div>
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gap: '2rem', maxWidth: '800px' }}>
            <div style={{
              background: 'rgba(26, 31, 58, 0.4)',
              border: '1px solid rgba(0, 247, 255, 0.1)',
              borderRadius: '16px',
              padding: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <Settings size={28} style={{ color: '#00f7ff' }} />
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '800',
                  color: '#e8edf4'
                }}>
                  Training Settings
                </h2>
              </div>

              <div style={{ display: 'grid', gap: '2rem' }}>
                {/* Race Date */}
                <SettingField
                  label="Race Date"
                  description="Your target race date"
                  value={raceDate}
                  type="date"
                  onChange={(e) => setRaceDate(e.target.value)}
                />

                {/* Target Time */}
                <SettingField
                  label="Target Time"
                  description="Your goal finish time (HH:MM:SS)"
                  value={targetTime}
                  type="text"
                  placeholder="2:59:59"
                  onChange={(e) => setTargetTime(e.target.value)}
                  helper={`Target pace: ${targetPacePerMile}/mile`}
                />

                {/* Body Weight */}
                <SettingField
                  label="Body Weight"
                  description="Your current weight in pounds"
                  value={bodyWeight}
                  type="number"
                  placeholder="168"
                  onChange={(e) => setBodyWeight(parseInt(e.target.value) || 0)}
                  helper="Used for nutrition calculations"
                />

                {/* Current Week */}
                <SettingField
                  label="Training Week"
                  description="Current week in your 16-week training block"
                  value={currentWeek}
                  type="number"
                  min="1"
                  max="16"
                  onChange={(e) => setCurrentWeek(Math.min(16, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>

            {/* Calculated Values Display */}
            <div style={{
              background: 'rgba(26, 31, 58, 0.4)',
              border: '1px solid rgba(0, 247, 255, 0.1)',
              borderRadius: '16px',
              padding: '2rem',
              backdropFilter: 'blur(10px)'
            }}>
              <h3 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '18px',
                fontWeight: '700',
                color: '#e8edf4'
              }}>
                Calculated Metrics
              </h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <MetricDisplay
                  label="Days to Race"
                  value={daysToRace}
                  unit="days"
                />
                <MetricDisplay
                  label="Target Marathon Pace"
                  value={targetPacePerMile}
                  unit="per mile"
                />
                <MetricDisplay
                  label="Daily Carb Goal (Tomorrow)"
                  value={carbGoal}
                  unit="grams"
                  subtitle={`${(carbGoal / bodyWeight).toFixed(1)}g per kg bodyweight`}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Component: SettingField
const SettingField = ({ label, description, value, type, placeholder, onChange, helper, min, max }) => {
  const inputStyle = {
    background: 'rgba(0, 247, 255, 0.05)',
    border: '1px solid rgba(0, 247, 255, 0.2)',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#e8edf4',
    width: '100%',
    fontVariantNumeric: 'tabular-nums'
  };

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '15px',
        fontWeight: '700',
        color: '#e8edf4',
        marginBottom: '0.5rem'
      }}>
        {label}
      </label>
      <p style={{
        margin: '0 0 0.75rem 0',
        fontSize: '13px',
        color: '#7b8ba0',
        fontWeight: '500'
      }}>
        {description}
      </p>
      <input
        type={type}
        value={value || ''}  // Convert null to empty string
        placeholder={placeholder}
        onChange={onChange}
        min={min}
        max={max}
        style={inputStyle}
      />
      {helper && (
        <p style={{
          margin: '0.5rem 0 0 0',
          fontSize: '12px',
          color: '#00f7ff',
          fontWeight: '600'
        }}>
          {helper}
        </p>
      )}
    </div>
  );
};

// Component: MetricDisplay
const MetricDisplay = ({ label, value, unit, subtitle }) => (
  <div style={{
    padding: '1rem',
    background: 'rgba(0, 247, 255, 0.05)',
    border: '1px solid rgba(0, 247, 255, 0.1)',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  }}>
    <div>
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#e8edf4', marginBottom: '4px' }}>
        {label}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: '#7b8ba0', fontWeight: '500' }}>
          {subtitle}
        </div>
      )}
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '24px', fontWeight: '900', color: '#00f7ff', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', letterSpacing: '0.05em' }}>
        {unit.toUpperCase()}
      </div>
    </div>
  </div>
);

// Component: StatCard
const StatCard = ({ icon: Icon, label, value, subtitle, color }) => (
  <div style={{
    background: 'rgba(26, 31, 58, 0.4)',
    border: `1px solid ${color}33`,
    borderRadius: '16px',
    padding: '1.5rem',
    backdropFilter: 'blur(10px)',
    position: 'relative',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '100px',
      height: '100px',
      background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
      pointerEvents: 'none'
    }} />
    <Icon size={28} style={{ color, marginBottom: '1rem' }} />
    <div style={{
      fontSize: '11px',
      fontWeight: '700',
      color: '#7b8ba0',
      letterSpacing: '0.1em',
      marginBottom: '0.5rem'
    }}>
      {label.toUpperCase()}
    </div>
    <div style={{
      fontSize: '32px',
      fontWeight: '900',
      color,
      marginBottom: '0.25rem',
      fontVariantNumeric: 'tabular-nums'
    }}>
      {value}
    </div>
    <div style={{
      fontSize: '13px',
      color: '#7b8ba0',
      fontWeight: '500'
    }}>
      {subtitle}
    </div>
  </div>
);

// Component: ActionButton
const ActionButton = ({ icon: Icon, label, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
      border: `1px solid ${color}33`,
      borderRadius: '12px',
      padding: '1.25rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      transition: 'all 0.2s ease',
      color: '#e8edf4',
      fontSize: '15px',
      fontWeight: '600'
    }}
    onMouseEnter={e => {
      e.currentTarget.style.background = `linear-gradient(135deg, ${color}25 0%, ${color}15 100%)`;
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 8px 24px ${color}33`;
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`;
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
  >
    <Icon size={20} style={{ color }} />
    {label}
  </button>
);

// Component: RunsCompletedCard
const RunsCompletedCard = ({ trainingPlan, color }) => {
  const completedRuns = trainingPlan?.filter(w => w.actual !== null && w.actual > 0 && w.type !== 'Rest').length || 0;
  const totalRuns = trainingPlan?.filter(w => w.type !== 'Rest').length || 0;
  
  return (
    <div style={{
      background: 'rgba(26, 31, 58, 0.4)',
      border: `1px solid ${color}33`,
      borderRadius: '16px',
      padding: '1.5rem',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />
      <Award size={28} style={{ color, marginBottom: '1rem' }} />
      <div style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#7b8ba0',
        letterSpacing: '0.1em',
        marginBottom: '0.5rem'
      }}>
        RUNS COMPLETED
      </div>
      <div style={{
        fontSize: '32px',
        fontWeight: '900',
        color,
        marginBottom: '0.25rem',
        fontVariantNumeric: 'tabular-nums'
      }}>
        {completedRuns} / {totalRuns}
      </div>
      <div style={{
        fontSize: '13px',
        color: '#7b8ba0',
        fontWeight: '500'
      }}>
        This week's workouts
      </div>
    </div>
  );
};

// Component: DailyMacrosCard
const DailyMacrosCard = ({ dayDetails, color }) => {
  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  const todayData = dayDetails[todayKey] || {};
  
  const totals = {
    protein: todayData.protein || 0,
    carbs: todayData.carbs || 0,
    fats: todayData.fats || 0
  };
  
  return (
    <div style={{
      background: 'rgba(26, 31, 58, 0.4)',
      border: `1px solid ${color}33`,
      borderRadius: '16px',
      padding: '1.5rem',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        pointerEvents: 'none'
      }} />
      <Utensils size={28} style={{ color, marginBottom: '1rem' }} />
      <div style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#7b8ba0',
        letterSpacing: '0.1em',
        marginBottom: '0.5rem'
      }}>
        TODAY'S MACROS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '600' }}>Protein</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#00f7ff' }}>{totals.protein}g</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '600' }}>Carbs</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#00ff88' }}>{totals.carbs}g</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '600' }}>Fats</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#ff6b00' }}>{totals.fats}g</span>
        </div>
      </div>
    </div>
  );
};

// Component: MotivationalQuoteCard
const MotivationalQuoteCard = () => {
  const quotes = [
    { text: "The miracle isn't that I finished. The miracle is that I had the courage to start.", author: "John Bingham" },
    { text: "Run when you can, walk if you have to, crawl if you must; just never give up.", author: "Dean Karnazes" },
    { text: "The only one who can tell you 'you can't' is you. And you don't have to listen.", author: "Nike" },
    { text: "The body achieves what the mind believes.", author: "Unknown" },
    { text: "Pain is temporary. Quitting lasts forever.", author: "Lance Armstrong" },
    { text: "Don't dream of winning, train for it.", author: "Mo Farah" }
  ];
  
  const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const todaysQuote = quotes[dayOfYear % quotes.length];
  
  return (
    <div style={{
      background: 'rgba(26, 31, 58, 0.4)',
      border: '1px solid rgba(255, 215, 0, 0.3)',
      borderRadius: '16px',
      padding: '1.5rem',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '100px',
        height: '100px',
        background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <Sparkles size={28} style={{ color: '#FFD700', marginBottom: '1rem' }} />
      <div style={{
        fontSize: '11px',
        fontWeight: '700',
        color: '#7b8ba0',
        letterSpacing: '0.1em',
        marginBottom: '0.5rem'
      }}>
        DAILY MOTIVATION
      </div>
      <p style={{
        margin: '0 0 0.75rem 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#e8edf4',
        lineHeight: 1.5,
        fontStyle: 'italic'
      }}>
        "{todaysQuote.text}"
      </p>
      <p style={{
        margin: 0,
        fontSize: '12px',
        color: '#FFD700',
        fontWeight: '700',
        textAlign: 'right'
      }}>
        — {todaysQuote.author}
      </p>
    </div>
  );
};

// Component: WorkoutCard
const WorkoutCard = ({ workout }) => {
  const typeColors = {
    'Rest': '#7b8ba0',
    'Easy': '#00ff88',
    'Tempo': '#ff6b00',
    'Intervals': '#ff0084',
    'Long Run': '#00f7ff',
    'Recovery': '#7b8ba0'
  };

  const color = typeColors[workout.type] || '#00f7ff';
  const isComplete = workout.actual !== null && workout.actual > 0;

  return (
    <div style={{
      background: 'rgba(26, 31, 58, 0.4)',
      border: `1px solid ${color}33`,
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'grid',
      gridTemplateColumns: '140px 1fr auto auto',
      gap: '1.5rem',
      alignItems: 'center',
      backdropFilter: 'blur(10px)',
      opacity: isComplete ? 1 : 0.7
    }}>
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: '700',
          color: '#7b8ba0',
          letterSpacing: '0.1em',
          marginBottom: '0.5rem'
        }}>
          {workout.day.toUpperCase()}
        </div>
        <div style={{
          fontSize: '18px',
          fontWeight: '800',
          color
        }}>
          {workout.type}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', marginBottom: '4px' }}>
            PLANNED
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#e8edf4' }}>
            {workout.planned > 0 ? `${workout.planned}mi` : 'Rest'}
          </div>
        </div>
        {isComplete && (
          <div>
            <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', marginBottom: '4px' }}>
              ACTUAL
            </div>
            <div style={{ fontSize: '20px', fontWeight: '800', color }}>
              {workout.actual}mi
            </div>
          </div>
        )}
      </div>

      {workout.pace && (
        <div style={{
          padding: '8px 16px',
          background: `${color}15`,
          border: `1px solid ${color}33`,
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '700',
          color,
          fontVariantNumeric: 'tabular-nums'
        }}>
          {workout.pace}/mi
        </div>
      )}

      {isComplete && (
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 20px ${color}66`
        }}>
          <Award size={18} style={{ color: '#0a0e27' }} />
        </div>
      )}
    </div>
  );
};

// Component: EditableWorkoutCard
const EditableWorkoutCard = ({ workout, weekNumber, dayIndex, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorkout, setEditedWorkout] = useState(workout);
  
  const typeColors = {
    'Rest': '#7b8ba0',
    'Easy': '#00ff88',
    'Tempo': '#ff6b00',
    'Intervals': '#ff0084',
    'Long Run': '#00f7ff',
    'Recovery': '#7b8ba0'
  };
  
  const workoutTypes = ['Rest', 'Easy', 'Tempo', 'Intervals', 'Long Run', 'Recovery'];
  const color = typeColors[editedWorkout.type] || '#00f7ff';
  const isComplete = workout.actual !== null && workout.actual > 0;
  
  const handleSave = () => {
    onUpdate(editedWorkout);
    setIsEditing(false);
  };

  return (
    <div 
      onClick={() => !isEditing && setIsEditing(true)}
      style={{
        background: 'rgba(26, 31, 58, 0.4)',
        border: `1px solid ${color}33`,
        borderRadius: '12px',
        padding: '1.5rem',
        backdropFilter: 'blur(10px)',
        cursor: !isEditing ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        opacity: isComplete ? 1 : 0.7
      }}
      onMouseEnter={e => {
        if (!isEditing) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = `0 4px 20px ${color}33`;
        }
      }}
      onMouseLeave={e => {
        if (!isEditing) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {!isEditing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto auto', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#7b8ba0',
              letterSpacing: '0.1em',
              marginBottom: '0.5rem'
            }}>
              {workout.day.toUpperCase()}
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '800',
              color
            }}>
              {workout.type}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', marginBottom: '4px' }}>
                PLANNED
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#e8edf4' }}>
                {workout.planned > 0 ? `${workout.planned}mi` : 'Rest'}
              </div>
            </div>
            {isComplete && (
              <div>
                <div style={{ fontSize: '11px', color: '#7b8ba0', fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  ACTUAL
                  {workout.fromStrava && (
                    <span style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      background: '#FC4C02',
                      color: '#fff',
                      borderRadius: '4px',
                      fontWeight: '700',
                      letterSpacing: '0.03em'
                    }}>
                      STRAVA
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '20px', fontWeight: '800', color }}>
                  {workout.actual}mi
                </div>
              </div>
            )}
          </div>

          {workout.pace && (
            <div style={{
              padding: '8px 16px',
              background: `${color}15`,
              border: `1px solid ${color}33`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              color,
              fontVariantNumeric: 'tabular-nums'
            }}>
              {workout.pace}/mi
            </div>
          )}

          <div style={{
            padding: '6px 12px',
            background: 'rgba(0, 247, 255, 0.1)',
            border: '1px solid rgba(0, 247, 255, 0.2)',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#00f7ff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Edit size={14} />
            EDIT
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '700',
                color: '#7b8ba0',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                WORKOUT TYPE
              </label>
              <select
                value={editedWorkout.type}
                onChange={(e) => setEditedWorkout({ ...editedWorkout, type: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 247, 255, 0.05)',
                  border: '1px solid rgba(0, 247, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e8edf4'
                }}
              >
                {workoutTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '700',
                color: '#7b8ba0',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                PLANNED MILES
              </label>
              <input
                type="number"
                step="0.1"
                value={editedWorkout.planned}
                onChange={(e) => setEditedWorkout({ ...editedWorkout, planned: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 247, 255, 0.05)',
                  border: '1px solid rgba(0, 247, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e8edf4'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '700',
                color: '#7b8ba0',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                ACTUAL MILES
              </label>
              <input
                type="number"
                step="0.1"
                value={editedWorkout.actual || ''}
                placeholder="0"
                onChange={(e) => setEditedWorkout({ ...editedWorkout, actual: e.target.value ? parseFloat(e.target.value) : null })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 247, 255, 0.05)',
                  border: '1px solid rgba(0, 247, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e8edf4'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: '700',
                color: '#7b8ba0',
                letterSpacing: '0.1em',
                marginBottom: '0.5rem'
              }}>
                TARGET PACE
              </label>
              <input
                type="text"
                value={editedWorkout.pace || ''}
                placeholder="7:00"
                onChange={(e) => setEditedWorkout({ ...editedWorkout, pace: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(0, 247, 255, 0.05)',
                  border: '1px solid rgba(0, 247, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#e8edf4'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditedWorkout(workout);
                setIsEditing(false);
              }}
              style={{
                padding: '10px 20px',
                background: 'rgba(123, 139, 160, 0.1)',
                border: '1px solid rgba(123, 139, 160, 0.2)',
                borderRadius: '8px',
                color: '#7b8ba0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#0a0e27',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '700'
              }}
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Component: ChatMessage
const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row'
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: isUser 
          ? 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)' 
          : 'linear-gradient(135deg, #8a2be2 0%, #4b0082 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {isUser ? (
          <Activity size={18} style={{ color: '#0a0e27' }} />
        ) : (
          <Sparkles size={18} style={{ color: '#fff' }} />
        )}
      </div>
      <div style={{
        flex: 1,
        padding: '1rem',
        background: isUser 
          ? 'rgba(0, 247, 255, 0.1)' 
          : 'rgba(138, 43, 226, 0.1)',
        border: `1px solid ${isUser ? 'rgba(0, 247, 255, 0.2)' : 'rgba(138, 43, 226, 0.2)'}`,
        borderRadius: '12px',
        maxWidth: '80%'
      }}>
        <div style={{
          fontSize: '14px',
          color: '#e8edf4',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap'
        }}>
          {message.content}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#7b8ba0',
          marginTop: '0.5rem',
          fontWeight: '500'
        }}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

// Component: NutritionLogger
const NutritionLogger = ({ onAdd }) => {
  const [carbs, setCarbs] = useState('');
  const [protein, setProtein] = useState('');
  const [fats, setFats] = useState('');

  const handleSubmit = () => {
    if (carbs && protein && fats) {
      const calories = (parseInt(carbs) * 4) + (parseInt(protein) * 4) + (parseInt(fats) * 9);
      onAdd({
        carbs: parseInt(carbs),
        protein: parseInt(protein),
        fats: parseInt(fats),
        calories
      });
      setCarbs('');
      setProtein('');
      setFats('');
    }
  };

  const inputStyle = {
    background: 'rgba(0, 247, 255, 0.05)',
    border: '1px solid rgba(0, 247, 255, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#e8edf4',
    width: '100%',
    fontVariantNumeric: 'tabular-nums'
  };

  return (
    <div style={{
      background: 'rgba(26, 31, 58, 0.4)',
      border: '1px solid rgba(0, 247, 255, 0.1)',
      borderRadius: '16px',
      padding: '2rem',
      backdropFilter: 'blur(10px)'
    }}>
      <h3 style={{
        margin: '0 0 1.5rem 0',
        fontSize: '18px',
        fontWeight: '700',
        color: '#e8edf4'
      }}>
        Log Today's Macros
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: '700',
            color: '#7b8ba0',
            letterSpacing: '0.1em',
            marginBottom: '0.5rem'
          }}>
            CARBS (g)
          </label>
          <input
            type="number"
            value={carbs}
            onChange={e => setCarbs(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: '700',
            color: '#7b8ba0',
            letterSpacing: '0.1em',
            marginBottom: '0.5rem'
          }}>
            PROTEIN (g)
          </label>
          <input
            type="number"
            value={protein}
            onChange={e => setProtein(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: '700',
            color: '#7b8ba0',
            letterSpacing: '0.1em',
            marginBottom: '0.5rem'
          }}>
            FATS (g)
          </label>
          <input
            type="number"
            value={fats}
            onChange={e => setFats(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={!carbs || !protein || !fats}
        style={{
          width: '100%',
          padding: '14px',
          background: (!carbs || !protein || !fats) 
            ? 'rgba(123, 139, 160, 0.1)' 
            : 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)',
          border: 'none',
          borderRadius: '10px',
          fontSize: '15px',
          fontWeight: '700',
          color: (!carbs || !protein || !fats) ? '#7b8ba0' : '#0a0e27',
          cursor: (!carbs || !protein || !fats) ? 'not-allowed' : 'pointer',
          letterSpacing: '0.05em',
          transition: 'all 0.2s ease'
        }}
      >
        Add Entry
      </button>
    </div>
  );
};

// Component: CoachInsightCard
const CoachInsightCard = ({ insight }) => {
  const sentimentColors = {
    positive: '#00ff88',
    neutral: '#00f7ff',
    warning: '#ff6b00'
  };

  const color = sentimentColors[insight.sentiment] || '#00f7ff';

  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
      border: `1px solid ${color}33`,
      borderRadius: '12px',
      padding: '1.5rem',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 20px ${color}33`
        }}>
          <Brain size={22} style={{ color: '#0a0e27' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '14px',
            color: '#e8edf4',
            lineHeight: 1.7,
            marginBottom: '0.5rem'
          }}>
            {insight.message}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#7b8ba0',
            fontWeight: '500'
          }}>
            {insight.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Component: PaceZoneCard
const PaceZoneCard = ({ zone, pace }) => {
  const zoneColors = {
    'Easy': '#00ff88',
    'Marathon Pace': '#00f7ff',
    'Half Marathon Pace': '#0084ff',
    'Tempo': '#ff6b00',
    'Intervals': '#ff0084',
    'Recovery': '#7b8ba0'
  };

  const color = zoneColors[zone] || '#00f7ff';

  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
      border: `1px solid ${color}33`,
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div style={{
        fontSize: '16px',
        fontWeight: '700',
        color: '#e8edf4'
      }}>
        {zone}
      </div>
      <div style={{
        padding: '8px 16px',
        background: `${color}20`,
        border: `1px solid ${color}40`,
        borderRadius: '8px',
        fontSize: '18px',
        fontWeight: '800',
        color,
        fontVariantNumeric: 'tabular-nums'
      }}>
        {pace}
      </div>
    </div>
  );
};

// Component: DayDetailsModal
const DayDetailsModal = ({ date, details, onClose, onSave }) => {
  const [workout, setWorkout] = useState(details.workout || '');
  const [miles, setMiles] = useState(details.miles || '');
  const [pace, setPace] = useState(details.pace || '');
  const [protein, setProtein] = useState(details.protein || '');
  const [carbs, setCarbs] = useState(details.carbs || '');
  const [fats, setFats] = useState(details.fats || '');
  const [notes, setNotes] = useState(details.notes || '');
  
  const handleSave = () => {
    onSave({
      workout,
      miles: miles ? parseFloat(miles) : null,
      pace,
      protein: protein ? parseFloat(protein) : null,
      carbs: carbs ? parseFloat(carbs) : null,
      fats: fats ? parseFloat(fats) : null,
      notes
    });
  };
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(10, 14, 39, 0.9)',
      backdropFilter: 'blur(10px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }} onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1f3a 0%, #0f1419 100%)',
          border: '1px solid rgba(0, 247, 255, 0.2)',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#e8edf4' }}>
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#7b8ba0',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '0',
              width: '32px',
              height: '32px'
            }}
          >
            ×
          </button>
        </div>
        
        {/* Workout Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: '700', color: '#00f7ff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} /> Workout
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#7b8ba0', marginBottom: '0.5rem' }}>
                Workout Type
              </label>
              <input
                type="text"
                value={workout}
                onChange={e => setWorkout(e.target.value)}
                placeholder="e.g., Easy Run, Tempo, Long Run"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(0, 247, 255, 0.05)',
                  border: '1px solid rgba(0, 247, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#e8edf4',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#7b8ba0', marginBottom: '0.5rem' }}>
                  Miles
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={miles}
                  onChange={e => setMiles(e.target.value)}
                  placeholder="0.0"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0, 247, 255, 0.05)',
                    border: '1px solid rgba(0, 247, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#e8edf4',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#7b8ba0', marginBottom: '0.5rem' }}>
                  Pace
                </label>
                <input
                  type="text"
                  value={pace}
                  onChange={e => setPace(e.target.value)}
                  placeholder="e.g., 8:30"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(0, 247, 255, 0.05)',
                    border: '1px solid rgba(0, 247, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#e8edf4',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Nutrition Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '16px', fontWeight: '700', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Utensils size={20} /> Nutrition
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#7b8ba0', marginBottom: '0.5rem' }}>
                Protein (g)
              </label>
              <input
                type="number"
                value={protein}
                onChange={e => setProtein(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: '8px',
                  color: '#e8edf4',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#7b8ba0', marginBottom: '0.5rem' }}>
                Carbs (g)
              </label>
              <input
                type="number"
                value={carbs}
                onChange={e => setCarbs(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: '8px',
                  color: '#e8edf4',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#7b8ba0', marginBottom: '0.5rem' }}>
                Fats (g)
              </label>
              <input
                type="number"
                value={fats}
                onChange={e => setFats(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(168, 85, 247, 0.05)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  borderRadius: '8px',
                  color: '#e8edf4',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Notes Section */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#7b8ba0', marginBottom: '0.5rem' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How did you feel? Any observations?"
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(0, 247, 255, 0.05)',
              border: '1px solid rgba(0, 247, 255, 0.2)',
              borderRadius: '8px',
              color: '#e8edf4',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              background: 'rgba(123, 139, 160, 0.1)',
              border: '1px solid rgba(123, 139, 160, 0.2)',
              borderRadius: '8px',
              color: '#7b8ba0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #00f7ff 0%, #0084ff 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#0a0e27',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 247, 255, 0.3)'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// Component: CalendarGrid
const CalendarGrid = ({ view, selectedDate, dayDetails, setDayDetails, today, setSelectedDayForEdit }) => {
  if (view === 'month') {
    return <MonthView selectedDate={selectedDate} dayDetails={dayDetails} today={today} setSelectedDayForEdit={setSelectedDayForEdit} />;
  } else {
    return <WeekView selectedDate={selectedDate} dayDetails={dayDetails} setDayDetails={setDayDetails} today={today} setSelectedDayForEdit={setSelectedDayForEdit} />;
  }
};

// Component: MonthView
const MonthView = ({ selectedDate, dayDetails, today, setSelectedDayForEdit }) => {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  
  // Get first day of month and how many days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
  
  // Create array of days
  const days = [];
  
  // Add empty slots for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  
  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div style={{
      background: 'rgba(26, 31, 58, 0.4)',
      border: '1px solid rgba(0, 247, 255, 0.1)',
      borderRadius: '16px',
      padding: '1.5rem',
      backdropFilter: 'blur(10px)'
    }}>
      {/* Day names header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        {dayNames.map(day => (
          <div key={day} style={{
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: '700',
            color: '#7b8ba0',
            padding: '0.5rem'
          }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar days grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: '0.5rem'
      }}>
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} style={{ aspectRatio: '1', minHeight: '80px' }} />;
          }
          
          const dateKey = day.toISOString().split('T')[0];
          const details = dayDetails[dateKey] || {};
          const isToday = day.toDateString() === today.toDateString();
          const hasWorkout = details.workout;
          const hasNutrition = details.protein || details.carbs || details.fats;
          
          return (
            <div
              key={dateKey}
              onClick={() => setSelectedDayForEdit(day)}
              style={{
                aspectRatio: '1',
                minHeight: '80px',
                background: isToday ? 'rgba(0, 247, 255, 0.1)' : 'rgba(26, 31, 58, 0.4)',
                border: isToday ? '2px solid rgba(0, 247, 255, 0.4)' : '1px solid rgba(0, 247, 255, 0.1)',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                position: 'relative'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 247, 255, 0.2)';
                // Show plus sign
                const plusSign = e.currentTarget.querySelector('.calendar-plus-sign');
                if (plusSign) plusSign.style.opacity = '1';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                // Hide plus sign
                const plusSign = e.currentTarget.querySelector('.calendar-plus-sign');
                if (plusSign) plusSign.style.opacity = '0';
              }}
            >
              {/* Hover Plus Sign */}
              <div 
                className="calendar-plus-sign"
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '20px',
                  height: '20px',
                  background: 'rgba(0, 247, 255, 0.2)',
                  border: '1px solid rgba(0, 247, 255, 0.4)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#00f7ff',
                  opacity: '0',
                  transition: 'opacity 0.2s ease',
                  pointerEvents: 'none'
                }}
              >
                +
              </div>
              
              <div style={{ 
                fontSize: '14px', 
                fontWeight: isToday ? '800' : '600',
                color: isToday ? '#00f7ff' : '#e8edf4',
                marginBottom: '0.25rem'
              }}>
                {day.getDate()}
              </div>
              
              {/* Miles with workout type color */}
              {details.miles && details.miles > 0 && (
                <div style={{
                  fontSize: '10px',
                  padding: '2px 4px',
                  background: details.workout?.toLowerCase().includes('tempo') || details.workout?.toLowerCase().includes('interval') || details.workout?.toLowerCase().includes('threshold')
                    ? 'rgba(249, 115, 22, 0.2)'  // Orange for threshold
                    : details.workout?.toLowerCase().includes('long')
                    ? 'rgba(160, 32, 240, 0.2)'  // Purple for long run
                    : 'rgba(34, 197, 94, 0.2)',  // Green for easy/recovery
                  border: details.workout?.toLowerCase().includes('tempo') || details.workout?.toLowerCase().includes('interval') || details.workout?.toLowerCase().includes('threshold')
                    ? '1px solid rgba(249, 115, 22, 0.4)'
                    : details.workout?.toLowerCase().includes('long')
                    ? '1px solid rgba(160, 32, 240, 0.4)'
                    : '1px solid rgba(34, 197, 94, 0.4)',
                  borderRadius: '4px',
                  color: details.workout?.toLowerCase().includes('tempo') || details.workout?.toLowerCase().includes('interval') || details.workout?.toLowerCase().includes('threshold')
                    ? '#f97316'  // Orange
                    : details.workout?.toLowerCase().includes('long')
                    ? '#A020F0'  // Purple
                    : '#22c55e',  // Green
                  fontWeight: '700',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {details.miles}mi {details.workout}
                </div>
              )}
              
              {/* Macros with color coding */}
              {hasNutrition && (
                <div style={{
                  fontSize: '9px',
                  fontWeight: '600',
                  display: 'flex',
                  gap: '0.25rem',
                  flexWrap: 'wrap'
                }}>
                  {details.protein > 0 && (
                    <span style={{ color: '#00f7ff' }}>P:{details.protein}g</span>
                  )}
                  {details.carbs > 0 && (
                    <span style={{ color: '#00ff88' }}>C:{details.carbs}g</span>
                  )}
                  {details.fats > 0 && (
                    <span style={{ color: '#ff6b00' }}>F:{details.fats}g</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Component: WeekView
const WeekView = ({ selectedDate, dayDetails, setDayDetails, today, setSelectedDayForEdit }) => {
  // Get the Monday of the week containing selectedDate
  const getMonday = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
  };
  
  const monday = getMonday(selectedDate);
  const weekDays = [];
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    weekDays.push(day);
  }
  
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {weekDays.map((day, idx) => {
        const dateKey = day.toISOString().split('T')[0];
        const details = dayDetails[dateKey] || {};
        const isToday = day.toDateString() === today.toDateString();
        const hasWorkout = details.workout;
        const hasNutrition = details.protein || details.carbs || details.fats;
        
        return (
          <div
            key={dateKey}
            onClick={() => setSelectedDayForEdit(day)}
            style={{
              background: 'rgba(26, 31, 58, 0.4)',
              border: isToday ? '2px solid rgba(0, 247, 255, 0.4)' : '1px solid rgba(0, 247, 255, 0.1)',
              borderRadius: '12px',
              padding: '1.5rem',
              backdropFilter: 'blur(10px)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 247, 255, 0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: '700',
                  color: isToday ? '#00f7ff' : '#e8edf4',
                  marginBottom: '0.25rem'
                }}>
                  {dayNames[idx]}
                </div>
                <div style={{ fontSize: '13px', color: '#7b8ba0', fontWeight: '500' }}>
                  {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                {hasWorkout ? (
                  <div style={{
                    padding: '8px 16px',
                    background: 'rgba(0, 255, 136, 0.1)',
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#00ff88'
                  }}>
                    {details.workout}
                  </div>
                ) : (
                  <div style={{
                    padding: '8px 16px',
                    background: 'rgba(123, 139, 160, 0.1)',
                    border: '1px solid rgba(123, 139, 160, 0.2)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#7b8ba0'
                  }}>
                    Click to add
                  </div>
                )}
                {hasNutrition && (
                  <div style={{
                    fontSize: '11px',
                    color: '#a855f7',
                    fontWeight: '600'
                  }}>
                    🍽️ Nutrition Logged
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Sub3VTApp;