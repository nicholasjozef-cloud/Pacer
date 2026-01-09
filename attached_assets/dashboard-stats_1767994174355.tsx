import { Target, Activity, Calendar, Award, TrendingUp } from 'lucide-react';
import { StatCard, ProgressStatCard } from '@/components/shared/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { WeatherCard } from './weather-card';
import type { UserSettingsData, TrainingPlan, DayDetailsData } from '@shared/schema';

/**
 * Tab type for navigation
 */
type TabType = 'dashboard' | 'calendar' | 'workouts' | 'settings';

/**
 * Props for DashboardStats component
 */
export interface DashboardStatsProps {
  /** User settings including target time, race date, weight */
  settings: UserSettingsData;
  /** Training plan data */
  trainingPlan: TrainingPlan;
  /** Day-by-day details including nutrition */
  dayDetails: Record<string, DayDetailsData>;
  /** Current week number */
  currentWeek: number;
  /** Callback function when navigating to a different tab */
  onTabChange: (tab: TabType) => void;
}

/**
 * DashboardStats Component
 * 
 * Displays the stats grid section of the dashboard with key training metrics.
 * Includes target time, weekly volume, runs completed, current weight, days to race,
 * and today's nutrition information.
 * 
 * Features:
 * - Responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
 * - Mix of StatCard and ProgressStatCard components
 * - Calculated metrics (pace, volume, macros)
 * - Custom nutrition card with macro breakdown
 * 
 * @example
 * ```tsx
 * <DashboardStats
 *   settings={userSettings}
 *   trainingPlan={plan}
 *   dayDetails={details}
 *   currentWeek={1}
 * />
 * ```
 */
export function DashboardStats({ 
  settings, 
  trainingPlan, 
  dayDetails, 
  currentWeek,
  onTabChange 
}: DashboardStatsProps) {
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

  // Calculate target pace (min/mile)
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
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust when day is Sunday
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const mondayDate = getMondayOfCurrentWeek();

  // Count completed runs
  const runsCompleted = currentWeekPlan.filter(w => w.actual && w.actual > 0).length;
  const totalRuns = currentWeekPlan.filter(w => w.type !== 'Rest').length;

  // Calculate today's macros
  const today = new Date().toISOString().split('T')[0];
  const todayDetails = dayDetails[today];
  const todayMacros = {
    protein: todayDetails?.protein || 0,
    carbs: todayDetails?.carbs || 0,
    fats: todayDetails?.fats || 0,
  };
  const totalCalories = (todayMacros.protein * 4) + (todayMacros.carbs * 4) + (todayMacros.fats * 9);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="stats-grid">
      {/* Target time */}
      <StatCard
        icon={Target}
        label="Target Time"
        value={targetTime}
        subtitle={`${targetPacePerMile}/mile`}
      />
      
      {/* Weekly volume with progress - CLICKABLE */}
      <ProgressStatCard
        icon={Activity}
        label={`Week of ${mondayDate}`}
        value={`${weeklyVolume.actual.toFixed(1)} mi`}
        subtitle={`Planned: ${weeklyVolume.planned.toFixed(1)} mi`}
        progress={weeklyVolume.planned > 0 ? (weeklyVolume.actual / weeklyVolume.planned) * 100 : 0}
        progressLabel="Completed"
        onClick={() => onTabChange('workouts')}
      />
      
      {/* Runs completed */}
      <StatCard
        icon={Award}
        label="Runs Completed"
        value={`${runsCompleted}/${totalRuns}`}
        subtitle="This week"
      />
      
      {/* Weather card - REPLACED WEIGHT */}
      <WeatherCard />
      
      {/* Days to race */}
      <StatCard
        icon={Calendar}
        label="Days to Race"
        value={daysToRace > 0 ? daysToRace : 'TBD'}
        subtitle={raceDate ? new Date(raceDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Set race date'}
      />

      {/* Today's nutrition - custom card */}
      <Card className="border-border/50 hover-elevate" data-testid="card-nutrition">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-chart-3/10 rounded-lg shrink-0" aria-hidden="true">
              <TrendingUp className="w-6 h-6 text-chart-3" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground mb-1">Today's Nutrition</p>
              <p className="text-2xl font-bold text-foreground" data-testid="text-total-calories">
                {totalCalories} cal
              </p>
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
  );
}
