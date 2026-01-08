import { useState } from 'react';
import { Activity, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getWorkoutTailwindClass } from '@/lib/workout-colors';
import type { TrainingPlan, Workout } from '@shared/schema';
import { WORKOUT_TYPES } from '@shared/schema';

interface WorkoutsProps {
  trainingPlan: TrainingPlan;
  currentWeek: number;
  totalWeeks: number;
  inTrainingPlan: boolean;
  onUpdateWorkout: (week: number, dayIndex: number, updates: Partial<Workout>) => void;
  onWeekChange: (week: number) => void;
}

export function Workouts({ 
  trainingPlan, 
  currentWeek, 
  totalWeeks,
  inTrainingPlan,
  onUpdateWorkout,
  onWeekChange
}: WorkoutsProps) {
  const [editingWorkout, setEditingWorkout] = useState<{ week: number; dayIndex: number } | null>(null);
  const [editValues, setEditValues] = useState<Partial<Workout>>({});

  const weekPlan = trainingPlan[currentWeek] || [];
  
  const weeklyVolume = {
    planned: weekPlan.reduce((sum, w) => sum + w.planned, 0),
    actual: weekPlan.reduce((sum, w) => sum + (w.actual || 0), 0),
  };


  const startEditing = (dayIndex: number) => {
    const workout = weekPlan[dayIndex];
    setEditingWorkout({ week: currentWeek, dayIndex });
    setEditValues({
      type: workout.type,
      planned: workout.planned,
      actual: workout.actual,
      pace: workout.pace,
    });
  };

  const saveEditing = () => {
    if (editingWorkout) {
      onUpdateWorkout(editingWorkout.week, editingWorkout.dayIndex, editValues);
      setEditingWorkout(null);
      setEditValues({});
    }
  };

  const cancelEditing = () => {
    setEditingWorkout(null);
    setEditValues({});
  };

  // Get Monday of current week
  const getMondayOfWeek = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? 1 : (day === 1 ? 0 : -(day - 1));
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    return monday;
  };

  const currentMonday = getMondayOfWeek();
  const weekOfDate = currentMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6" data-testid="workouts-container">
      {/* Week Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground" data-testid="text-workouts-title">
            {inTrainingPlan ? `Week ${currentWeek} Training` : `Week of ${weekOfDate}`}
          </h2>
          <p className="text-muted-foreground mt-1">
            {weeklyVolume.actual.toFixed(1)} / {weeklyVolume.planned.toFixed(1)} miles completed
          </p>
        </div>
        
        {inTrainingPlan && totalWeeks > 1 && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentWeek <= 1}
              onClick={() => onWeekChange(currentWeek - 1)}
              data-testid="button-prev-week"
            >
              Previous
            </Button>
            <Badge variant="secondary" className="px-3 py-1">
              Week {currentWeek} / {totalWeeks}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentWeek >= totalWeeks}
              onClick={() => onWeekChange(currentWeek + 1)}
              data-testid="button-next-week"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Workouts Grid */}
      <div className="grid gap-4" data-testid="workouts-grid">
        {weekPlan.map((workout, index) => {
          const isEditing = editingWorkout?.week === currentWeek && editingWorkout?.dayIndex === index;
          
          return (
            <Card 
              key={`${workout.day}-${index}`} 
              className={cn(
                "border-border/50 transition-all",
                workout.fromStrava && "border-l-4 border-l-chart-1"
              )}
              data-testid={`card-workout-${workout.day.toLowerCase()}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Day & Type */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-24 shrink-0">
                      <p className="font-semibold text-foreground">{workout.day}</p>
                      {workout.fromStrava && (
                        <p className="text-xs text-chart-1">via Strava</p>
                      )}
                    </div>

                    {isEditing ? (
                      <Select 
                        value={editValues.type} 
                        onValueChange={(v) => setEditValues({ ...editValues, type: v })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WORKOUT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={cn("shrink-0", getWorkoutTailwindClass(workout.type))}>
                        {workout.type}
                      </Badge>
                    )}
                  </div>

                  {/* Mileage */}
                  <div className="flex items-center gap-4 flex-1 justify-center">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Planned</p>
                          <Input
                            type="number"
                            step="0.1"
                            className="w-20 text-center"
                            value={editValues.planned || 0}
                            onChange={(e) => setEditValues({ ...editValues, planned: parseFloat(e.target.value) || 0 })}
                            data-testid="input-planned-miles"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">Actual</p>
                          <Input
                            type="number"
                            step="0.1"
                            className="w-20 text-center"
                            value={editValues.actual || ''}
                            onChange={(e) => setEditValues({ ...editValues, actual: e.target.value ? parseFloat(e.target.value) : null })}
                            data-testid="input-actual-miles"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">
                          {workout.actual ?? workout.planned}
                          <span className="text-base font-normal text-muted-foreground ml-1">mi</span>
                        </p>
                        {workout.actual !== null && workout.actual !== workout.planned && (
                          <p className="text-xs text-muted-foreground">
                            Planned: {workout.planned} mi
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pace */}
                  <div className="flex items-center gap-4 flex-1 justify-center">
                    {isEditing ? (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Pace</p>
                        <Input
                          className="w-24 text-center"
                          placeholder="8:30"
                          value={editValues.pace || ''}
                          onChange={(e) => setEditValues({ ...editValues, pace: e.target.value || null })}
                          data-testid="input-pace"
                        />
                      </div>
                    ) : (
                      workout.pace && (
                        <div className="text-center">
                          <p className="font-medium text-foreground">{workout.pace}</p>
                          <p className="text-xs text-muted-foreground">/mile</p>
                        </div>
                      )
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <Button size="icon" variant="ghost" onClick={saveEditing} data-testid="button-save-workout">
                          <Check className="w-4 h-4 text-chart-2" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEditing} data-testid="button-cancel-edit">
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => startEditing(index)} data-testid={`button-edit-${workout.day}`}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {weekPlan.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="p-12 text-center">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No workouts planned</h3>
            <p className="text-muted-foreground">
              Add workouts to your training plan in Settings
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
