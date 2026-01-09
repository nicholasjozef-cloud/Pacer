import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { userSettingsService, dayDetailsService, authService, trainingPlanService } from '@/lib/services';
import { Auth } from '@/components/auth';
import { Dashboard } from '@/components/dashboard';
import { CalendarView } from '@/components/calendar-view';
import { Workouts } from '@/components/workouts';
import { Settings } from '@/components/settings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  Activity, 
  Calendar, 
  Settings as SettingsIcon,
  Target,
  LogOut
} from 'lucide-react';
import type { 
  UserSettingsData, 
  DayDetailsData, 
  TrainingPlan, 
  Workout 
} from '@shared/schema';
import type { User, Session } from '@supabase/supabase-js';

type TabType = 'dashboard' | 'calendar' | 'workouts' | 'settings';

const DEFAULT_SETTINGS: UserSettingsData = {
  bodyWeight: 168,
  targetTime: '2:59:59',
  raceDate: null,
  inTrainingPlan: false,
  totalTrainingWeeks: 16,
  currentWeek: 1,
  trainingStartDate: null,
};

const DEFAULT_TRAINING_PLAN: TrainingPlan = {
  1: [
    { day: 'Monday', type: 'Rest', planned: 0, actual: null, pace: null },
    { day: 'Tuesday', type: 'Easy', planned: 5, actual: null, pace: null },
    { day: 'Wednesday', type: 'Easy', planned: 6, actual: null, pace: null },
    { day: 'Thursday', type: 'Tempo', planned: 5, actual: null, pace: null },
    { day: 'Friday', type: 'Rest', planned: 0, actual: null, pace: null },
    { day: 'Saturday', type: 'Long Run', planned: 12, actual: null, pace: null },
    { day: 'Sunday', type: 'Recovery', planned: 4, actual: null, pace: null },
  ],
  2: [
    { day: 'Monday', type: 'Rest', planned: 0, actual: null, pace: null },
    { day: 'Tuesday', type: 'Easy', planned: 5, actual: null, pace: null },
    { day: 'Wednesday', type: 'Intervals', planned: 6, actual: null, pace: null },
    { day: 'Thursday', type: 'Easy', planned: 5, actual: null, pace: null },
    { day: 'Friday', type: 'Rest', planned: 0, actual: null, pace: null },
    { day: 'Saturday', type: 'Long Run', planned: 14, actual: null, pace: null },
    { day: 'Sunday', type: 'Recovery', planned: 4, actual: null, pace: null },
  ],
};

export default function Home() {
  // Auth state
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [settings, setSettings] = useState<UserSettingsData>(DEFAULT_SETTINGS);
  const [dayDetails, setDayDetails] = useState<Record<string, DayDetailsData>>({});
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(DEFAULT_TRAINING_PLAN);
  const [dataLoading, setDataLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { toast } = useToast();

  // Check auth status
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    
    const initAuth = async () => {
      const client = await getSupabase();
      if (!client) {
        setAuthLoading(false);
        return;
      }

      const { data: { session } } = await client.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);

      const { data: { subscription: sub } } = client.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      });
      subscription = sub;
    };

    initAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Load user data when logged in using services layer
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      setDataLoading(true);
      setSaveError(null);
      
      try {
        // Load settings using service
        const loadedSettings = await userSettingsService.get(user.id);
        if (loadedSettings) {
          setSettings(loadedSettings);
        }

        // Load day details using service
        const loadedDayDetails = await dayDetailsService.getAll(user.id);
        setDayDetails(loadedDayDetails);

        // Load training plan from localStorage
        const loadedPlan = trainingPlanService.get(user.id);
        if (loadedPlan) {
          setTrainingPlan(loadedPlan);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setSaveError('Failed to load your data');
        toast({
          title: 'Error',
          description: 'Failed to load your data. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setDataLoading(false);
      }
    };

    loadUserData();
  }, [user, toast]);

  // Save settings (debounced) using services layer
  const saveSettings = useCallback(async (newSettings: UserSettingsData) => {
    if (!user) return;

    try {
      await userSettingsService.save(user.id, newSettings);
      setSaveError(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveError('Failed to save settings');
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    }
  }, [user, toast]);

  // Debounced settings update
  useEffect(() => {
    if (!user) return;
    const timeoutId = setTimeout(() => saveSettings(settings), 500);
    return () => clearTimeout(timeoutId);
  }, [settings, user, saveSettings]);

  // Handle settings change
  const handleSettingsChange = (updates: Partial<UserSettingsData>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Save day details using services layer
  const handleSaveDayDetails = async (dateKey: string, details: DayDetailsData) => {
    if (!user) return;

    setDayDetails(prev => ({ ...prev, [dateKey]: details }));

    try {
      await dayDetailsService.save(user.id, dateKey, details);
      toast({
        title: 'Saved',
        description: 'Day details updated successfully.',
      });
    } catch (error) {
      console.error('Error saving day details:', error);
      toast({
        title: 'Error',
        description: 'Failed to save day details.',
        variant: 'destructive',
      });
    }
  };

  // Update workout in training plan
  const handleUpdateWorkout = (week: number, dayIndex: number, updates: Partial<Workout>) => {
    setTrainingPlan(prev => {
      const newPlan = { ...prev };
      if (newPlan[week] && newPlan[week][dayIndex]) {
        newPlan[week] = [...newPlan[week]];
        newPlan[week][dayIndex] = { ...newPlan[week][dayIndex], ...updates };
      }
      // Save to localStorage
      if (user) {
        trainingPlanService.save(user.id, newPlan);
      }
      return newPlan;
    });
  };

  // Handle week change
  const handleWeekChange = (week: number) => {
    handleSettingsChange({ currentWeek: week });
  };

  // Sign out using services layer
  const handleSignOut = async () => {
    await authService.signOut();
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="loading-auth">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Target className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground" data-testid="text-loading">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth required
  if (!session || !user) {
    return <Auth />;
  }

  // Navigation tabs
  const tabs = [
    { id: 'dashboard' as TabType, icon: TrendingUp, label: 'Dashboard' },
    { id: 'workouts' as TabType, icon: Activity, label: 'Workouts' },
    { id: 'calendar' as TabType, icon: Calendar, label: 'Calendar' },
    { id: 'settings' as TabType, icon: SettingsIcon, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="app-container">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center" data-testid="logo-icon">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground" data-testid="text-app-name">Pacer</h1>
              <p className="text-xs text-muted-foreground hidden sm:block" data-testid="text-app-tagline">Marathon Training</p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleSignOut}
            data-testid="button-header-signout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-[73px] z-40 bg-card/60 backdrop-blur-md border-b border-border/50" data-testid="app-navigation">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Error Banner */}
      {saveError && (
        <div className="max-w-7xl mx-auto px-4 py-2" data-testid="error-banner">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
            {saveError}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6" data-testid="app-main">
        {dataLoading ? (
          <div className="space-y-4" data-testid="loading-data">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                settings={settings}
                trainingPlan={trainingPlan}
                dayDetails={dayDetails}
                currentWeek={settings.currentWeek}
                onTabChange={setActiveTab}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarView
                dayDetails={dayDetails}
                onSaveDayDetails={handleSaveDayDetails}
              />
            )}
            {activeTab === 'workouts' && (
              <Workouts
                trainingPlan={trainingPlan}
                currentWeek={settings.currentWeek}
                totalWeeks={settings.totalTrainingWeeks}
                inTrainingPlan={settings.inTrainingPlan}
                onUpdateWorkout={handleUpdateWorkout}
                onWeekChange={handleWeekChange}
              />
            )}
            {activeTab === 'settings' && (
              <Settings
                settings={settings}
                onSettingsChange={handleSettingsChange}
                onSignOut={handleSignOut}
                userEmail={user.email}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
