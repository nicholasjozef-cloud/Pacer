import { Target, Activity, Calendar, TrendingUp, Award } from 'lucide-react';
import { StatCard, ProgressStatCard } from './stat-card';
import { WeeklyProgressChart } from './weekly-progress-chart';
import { WeatherCard } from './weather-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { UserSettingsData, TrainingPlan, DayDetailsData } from '@shared/schema';

type TabType = 'dashboard' | 'calendar' | 'workouts' | 'settings';

interface DashboardProps {
  settings: UserSettingsData;
  trainingPlan: TrainingPlan;
  dayDetails: Record<string, DayDetailsData>;
  currentWeek: number;
  onTabChange: (tab: TabType) => void;
}

export function Dashboard({ settings, trainingPlan, dayDetails, currentWeek, onTabChange }: DashboardProps) {
  const { targetTime, raceDate } = settings;

  // Calculate days to race
  let daysToRace = 0;
  if (raceDate) {
    const [year, month, day] = raceDate.split('-').map(Number);
    const raceDateObj = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    raceDateObj.setHours(0, 0, 0, 0);
    daysToRace = Math.ceil((raceDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Calculate target pace
  const targetTimeInSeconds = targetTime.split(':').reduce((acc, time) => (60 * acc) + +time, 0);
  const targetPacePerMile = Math.floor(targetTimeInSeconds / 26.2 / 60) + ':' + 
    String(Math.round((targetTimeInSeconds / 26.2) % 60)).padStart(2, '0');

  // Calculate weekly volume
  const currentWeekPlan = trainingPlan[currentWeek] || [];
  const weeklyVolume = {
    planned: currentWeekPlan.reduce((sum, w) => sum + w.planned, 0),
    actual: currentWeekPlan.reduce((sum, w) => sum + (w.actual || 0), 0),
  };

  // Get Monday of current week for display
  const getMondayOfCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const mondayDate = getMondayOfCurrentWeek();

  // Count completed runs
  const runsCompleted = currentWeekPlan.filter(w => w.actual && w.actual > 0).length;
  const totalRuns = currentWeekPlan.filter(w => w.type !== 'Rest').length;

  // Calculate today's macros from dayDetails
  const today = new Date().toISOString().split('T')[0];
  const todayDetails = dayDetails[today];
  const todayMacros = {
    protein: todayDetails?.protein || 0,
    carbs: todayDetails?.carbs || 0,
    fats: todayDetails?.fats || 0,
  };
  const totalCalories = (todayMacros.protein * 4) + (todayMacros.carbs * 4) + (todayMacros.fats * 9);

  // Motivational quotes
  const quotes = [
    "The miracle isn't that I finished. The miracle is that I had the courage to start.",
    "Run when you can, walk if you have to, crawl if you must; just never give up.",
    "Your body can stand almost anything. It's your mind you have to convince.",
    "The pain of discipline is far less than the pain of regret.",
    "Every mile is a gift. Appreciate every one.",
  ];
  const dailyQuote = quotes[new Date().getDay() % quotes.length];

  return (
    <div className="space-y-6" data-testid="dashboard-container">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="stats-grid">
        <StatCard
          icon={Target}
          label="Target Time"
          value={targetTime}
          subtitle={`${targetPacePerMile}/mile`}
        />
        
        <ProgressStatCard
          icon={Activity}
          label={`Week of ${mondayDate}`}
          value={`${weeklyVolume.actual.toFixed(1)} mi`}
          subtitle={`Planned: ${weeklyVolume.planned.toFixed(1)} mi`}
          progress={weeklyVolume.planned > 0 ? (weeklyVolume.actual / weeklyVolume.planned) * 100 : 0}
          progressLabel="Completed"
          onClick={() => onTabChange('workouts')}
        />
        
        <StatCard
          icon={Award}
          label="Runs Completed"
          value={`${runsCompleted}/${totalRuns}`}
          subtitle="This week"
        />
        
        <WeatherCard />
        
        <StatCard
          icon={Calendar}
          label="Days to Race"
          value={daysToRace > 0 ? daysToRace : 'TBD'}
          subtitle={raceDate ? new Date(raceDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Set race date'}
        />

        <Card className="border-border/50 hover-elevate" data-testid="card-nutrition">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-chart-3/10 rounded-lg shrink-0">
                <TrendingUp className="w-6 h-6 text-chart-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1">Today's Nutrition</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-calories">{totalCalories} cal</p>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span data-testid="text-protein">P: {todayMacros.protein}g</span>
                  <span data-testid="text-carbs">C: {todayMacros.carbs}g</span>
                  <span data-testid="text-fats">F: {todayMacros.fats}g</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress Line Chart */}
      <WeeklyProgressChart weekPlan={currentWeekPlan} currentWeek={currentWeek} />

      {/* Motivational Quote */}
      <Card className="border-border/50 bg-gradient-to-r from-card to-primary/5" data-testid="card-quote">
        <CardContent className="p-6">
          <p className="text-lg italic text-foreground/90 text-center" data-testid="text-quote">"{dailyQuote}"</p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="secondary" 
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => onTabChange('calendar')}
          data-testid="button-quick-calendar"
        >
          <Calendar className="w-5 h-5" />
          <span>View Calendar</span>
        </Button>
        <Button 
          variant="secondary" 
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => onTabChange('workouts')}
          data-testid="button-quick-workouts"
        >
          <Activity className="w-5 h-5" />
          <span>Training Plan</span>
        </Button>
        <Button 
          variant="secondary" 
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => onTabChange('settings')}
          data-testid="button-quick-settings"
        >
          <Target className="w-5 h-5" />
          <span>Settings</span>
        </Button>
        <Button 
          variant="secondary" 
          className="h-auto py-4 flex flex-col gap-2"
          onClick={() => onTabChange('workouts')}
          data-testid="button-quick-log"
        >
          <TrendingUp className="w-5 h-5" />
          <span>Log Workout</span>
        </Button>
      </div>
    </div>
  );
}
