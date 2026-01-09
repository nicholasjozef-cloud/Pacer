import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { StatCardProps } from './stat-card';

/**
 * Props for ProgressStatCard component
 * Extends StatCardProps with progress-specific properties
 */
export interface ProgressStatCardProps extends StatCardProps {
  /** Progress value (0-100). Values outside range will be clamped. */
  progress: number;
  /** Optional label for the progress bar (defaults to "Progress") */
  progressLabel?: string;
}

/**
 * ProgressStatCard Component
 * 
 * An enhanced StatCard that includes a progress bar visualization.
 * Useful for metrics that have a target or goal (e.g., weekly mileage completion).
 * 
 * @example
 * ```tsx
 * <ProgressStatCard
 *   icon={Activity}
 *   label="Week 1 Volume"
 *   value="25.5 mi"
 *   subtitle="Planned: 30.0 mi"
 *   progress={85}
 *   progressLabel="Completed"
 * />
 * ```
 */
export function ProgressStatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle, 
  progress, 
  progressLabel,
  onClick,
  className 
}: ProgressStatCardProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <Card 
      className={cn(
        "border-border/50 hover-elevate transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/50",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Stat display */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold text-foreground tracking-tight truncate">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-lg shrink-0">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{progressLabel || 'Progress'}</span>
            <span className="font-medium text-foreground">{clampedProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${clampedProgress}%` }}
              role="progressbar"
              aria-valuenow={clampedProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
