import { Target, Activity, Zap, Calendar, TrendingUp, Award } from 'lucide-react';
import { StatCard, ProgressStatCard } from './stat-card';
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
  const { targetTime, raceDate, bodyWeight } = settings;

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
          label={`Week ${currentWeek} Volume`}
          value={`${weeklyVolume.actual.toFixed(1)} mi`}
          subtitle={`Planned: ${weeklyVolume.planned.toFixed(1)} mi`}
          progress={weeklyVolume.planned > 0 ? (weeklyVolume.actual / weeklyVolume.planned) * 100 : 0}
          progressLabel="Completed"
        />
        
        <StatCard
          icon={Award}
          label="Runs Completed"
          value={`${runsCompleted}/${totalRuns}`}
          subtitle="This week"
        />
        
        <StatCard
          icon={Zap}
          label="Current Weight"
          value={`${bodyWeight} lbs`}
          subtitle="Race weight target"
        />
        
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

      {/* Weekly Chart Placeholder */}
      <Card className="border-border/50" data-testid="card-weekly-chart">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg" data-testid="text-chart-title">
            <TrendingUp className="w-5 h-5 text-primary" />
            Weekly Volume Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2 px-4 py-6">
            {currentWeekPlan.map((day, i) => {
              const maxMiles = Math.max(...currentWeekPlan.map(d => Math.max(d.planned, d.actual || 0)), 1);
              const plannedHeight = (day.planned / maxMiles) * 100;
              const actualHeight = ((day.actual || 0) / maxMiles) * 100;
              
              const getWorkoutColor = (type: string) => {
                switch (type) {
                  case 'Easy':
                  case 'Recovery':
                    return 'bg-workout-easy';
                  case 'Tempo':
                  case 'Intervals':
                    return 'bg-workout-tempo';
                  case 'Long Run':
                    return 'bg-workout-long';
                  default:
                    return 'bg-muted';
                }
              };

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full h-48 flex items-end justify-center gap-1">
                    <div 
                      className="w-3 bg-muted/50 rounded-t transition-all duration-300"
                      style={{ height: `${plannedHeight}%` }}
                      title={`Planned: ${day.planned} mi`}
                    />
                    <div 
                      className={`w-3 ${getWorkoutColor(day.type)} rounded-t transition-all duration-300`}
                      style={{ height: `${actualHeight}%` }}
                      title={`Actual: ${day.actual || 0} mi`}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {day.day.slice(0, 1)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-6 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-muted/50 rounded" />
              <span className="text-sm text-muted-foreground">Planned</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-workout-easy rounded" />
              <span className="text-sm text-muted-foreground">Easy/Recovery</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-workout-tempo rounded" />
              <span className="text-sm text-muted-foreground">Tempo/Intervals</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-workout-long rounded" />
              <span className="text-sm text-muted-foreground">Long Run</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <Zap className="w-5 h-5" />
          <span>Log Workout</span>
        </Button>
      </div>
    </div>
  );
}
