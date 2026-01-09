import { WeeklyProgressChart } from '@/components/shared/charts';
import { DashboardStats } from './dashboard-stats';
import { DashboardQuote } from './dashboard-quote';
import { DashboardActions } from './dashboard-actions';
import type { UserSettingsData, TrainingPlan, DayDetailsData } from '@shared/schema';

/**
 * Tab type for navigation
 */
type TabType = 'dashboard' | 'calendar' | 'workouts' | 'settings';

/**
 * Props for Dashboard component
 */
export interface DashboardProps {
  /** User settings including target time, race date, weight */
  settings: UserSettingsData;
  /** Training plan data for all weeks */
  trainingPlan: TrainingPlan;
  /** Day-by-day details including nutrition and notes */
  dayDetails: Record<string, DayDetailsData>;
  /** Current week number in training plan */
  currentWeek: number;
  /** Callback function when navigating to a different tab */
  onTabChange: (tab: TabType) => void;
}

/**
 * Dashboard Component
 * 
 * Main dashboard view displaying training overview and key metrics.
 * Orchestrates multiple sub-components to show stats, charts, motivation, and quick actions.
 * 
 * Features:
 * - Stats grid with key training metrics
 * - Weekly progress visualization
 * - Daily motivational quote
 * - Quick action buttons for navigation
 * - Responsive layout
 * 
 * Sub-components:
 * - DashboardStats: Displays stat cards (target time, volume, weight, etc.)
 * - WeeklyProgressChart: Line chart showing weekly training progression
 * - DashboardQuote: Motivational quote card
 * - DashboardActions: Quick navigation buttons
 * 
 * @example
 * ```tsx
 * <Dashboard
 *   settings={userSettings}
 *   trainingPlan={plan}
 *   dayDetails={details}
 *   currentWeek={1}
 *   onTabChange={(tab) => setActiveTab(tab)}
 * />
 * ```
 */
export function Dashboard({ 
  settings, 
  trainingPlan, 
  dayDetails, 
  currentWeek, 
  onTabChange 
}: DashboardProps) {
  // Get current week's training plan for the chart
  const currentWeekPlan = trainingPlan[currentWeek] || [];

  return (
    <div className="space-y-6" data-testid="dashboard-container">
      {/* Stats Grid */}
      <DashboardStats
        settings={settings}
        trainingPlan={trainingPlan}
        dayDetails={dayDetails}
        currentWeek={currentWeek}
        onTabChange={onTabChange}
      />

      {/* Weekly Progress Line Chart */}
      <WeeklyProgressChart 
        weekPlan={currentWeekPlan} 
        currentWeek={currentWeek} 
      />

      {/* Motivational Quote */}
      <DashboardQuote />

      {/* Quick Actions */}
      <DashboardActions onTabChange={onTabChange} />
    </div>
  );
}
