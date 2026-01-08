import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export function StatCard({ icon: Icon, label, value, subtitle, className }: StatCardProps) {
  return (
    <Card className={cn("border-border/50 hover-elevate transition-all duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold text-foreground tracking-tight truncate" data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g, '-')}`}>
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
      </CardContent>
    </Card>
  );
}

interface ProgressStatCardProps extends StatCardProps {
  progress: number;
  progressLabel?: string;
}

export function ProgressStatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtitle, 
  progress, 
  progressLabel,
  className 
}: ProgressStatCardProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <Card className={cn("border-border/50 hover-elevate transition-all duration-200", className)}>
      <CardContent className="p-6">
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
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{progressLabel || 'Progress'}</span>
            <span className="font-medium text-foreground">{clampedProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
