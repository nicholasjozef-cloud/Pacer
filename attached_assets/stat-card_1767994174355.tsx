import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Props for StatCard component
 */
export interface StatCardProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Label text for the metric */
  label: string;
  /** Value to display (can be string or number) */
  value: string | number;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional click handler to make card interactive */
  onClick?: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * StatCard Component
 * 
 * A card component for displaying a single metric or KPI.
 * Features an icon, label, large value display, and optional subtitle.
 * 
 * @example
 * ```tsx
 * <StatCard
 *   icon={Target}
 *   label="Target Time"
 *   value="2:59:59"
 *   subtitle="6:52/mile"
 * />
 * ```
 */
export function StatCard({ icon: Icon, label, value, subtitle, onClick, className }: StatCardProps) {
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <p 
              className="text-3xl font-bold text-foreground tracking-tight truncate" 
              data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
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
