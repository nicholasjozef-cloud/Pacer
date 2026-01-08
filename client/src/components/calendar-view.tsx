import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { DayDetailsData } from '@shared/schema';
import { WORKOUT_TYPES } from '@shared/schema';

interface CalendarViewProps {
  dayDetails: Record<string, DayDetailsData>;
  onSaveDayDetails: (dateKey: string, details: DayDetailsData) => void;
}

export function CalendarView({ dayDetails, onSaveDayDetails }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editDetails, setEditDetails] = useState<DayDetailsData>({
    workout: null,
    miles: null,
    pace: null,
    protein: null,
    carbs: null,
    fats: null,
    notes: null,
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const formatDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getWorkoutColor = (workout: string | null) => {
    switch (workout) {
      case 'Easy':
      case 'Recovery':
        return 'bg-workout-easy/20 text-workout-easy border-workout-easy/30';
      case 'Tempo':
      case 'Intervals':
        return 'bg-workout-tempo/20 text-workout-tempo border-workout-tempo/30';
      case 'Long Run':
        return 'bg-workout-long/20 text-workout-long border-workout-long/30';
      case 'Rest':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-transparent';
    }
  };

  const openDayEditor = (dateKey: string) => {
    setSelectedDate(dateKey);
    const existing = dayDetails[dateKey] || {
      workout: null,
      miles: null,
      pace: null,
      protein: null,
      carbs: null,
      fats: null,
      notes: null,
    };
    setEditDetails(existing);
  };

  const handleSave = () => {
    if (selectedDate) {
      onSaveDayDetails(selectedDate, editDetails);
      setSelectedDate(null);
    }
  };

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 md:h-32" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(day);
    const details = dayDetails[dateKey];
    const isToday = dateKey === todayKey;
    const isPast = new Date(dateKey) < new Date(todayKey);

    days.push(
      <button
        key={day}
        onClick={() => openDayEditor(dateKey)}
        className={cn(
          "h-24 md:h-32 p-2 rounded-lg border text-left transition-all hover-elevate",
          isToday ? "border-primary bg-primary/5" : "border-border/50 bg-card/50",
          isPast && !details?.workout && "opacity-50"
        )}
        data-testid={`calendar-day-${dateKey}`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className={cn(
            "text-sm font-semibold",
            isToday ? "text-primary" : "text-foreground"
          )}>
            {day}
          </span>
          {!details?.workout && (
            <Plus className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        
        {details?.workout && (
          <div className="space-y-1">
            <Badge 
              variant="outline" 
              className={cn("text-xs px-1.5 py-0", getWorkoutColor(details.workout))}
            >
              {details.workout}
            </Badge>
            {details.miles && (
              <p className="text-xs text-muted-foreground">
                {details.miles} mi
                {details.pace && ` @ ${details.pace}`}
              </p>
            )}
          </div>
        )}
      </button>
    );
  }

  return (
    <>
      <Card className="border-border/50" data-testid="calendar-container">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl" data-testid="text-calendar-month">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days}
          </div>
        </CardContent>
      </Card>

      {/* Day Editor Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={() => setSelectedDate(null)}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-day-editor">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-date">
              {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Workout Type</Label>
              <Select 
                value={editDetails.workout || ''} 
                onValueChange={(v) => setEditDetails({ ...editDetails, workout: v || null })}
              >
                <SelectTrigger data-testid="select-workout-type">
                  <SelectValue placeholder="Select workout type" />
                </SelectTrigger>
                <SelectContent>
                  {WORKOUT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Miles</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={editDetails.miles || ''}
                  onChange={(e) => setEditDetails({ ...editDetails, miles: e.target.value ? parseFloat(e.target.value) : null })}
                  data-testid="input-miles"
                />
              </div>
              <div className="space-y-2">
                <Label>Pace</Label>
                <Input
                  placeholder="8:30"
                  value={editDetails.pace || ''}
                  onChange={(e) => setEditDetails({ ...editDetails, pace: e.target.value || null })}
                  data-testid="input-pace"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editDetails.protein || ''}
                  onChange={(e) => setEditDetails({ ...editDetails, protein: e.target.value ? parseInt(e.target.value) : null })}
                  data-testid="input-protein"
                />
              </div>
              <div className="space-y-2">
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editDetails.carbs || ''}
                  onChange={(e) => setEditDetails({ ...editDetails, carbs: e.target.value ? parseInt(e.target.value) : null })}
                  data-testid="input-carbs"
                />
              </div>
              <div className="space-y-2">
                <Label>Fats (g)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={editDetails.fats || ''}
                  onChange={(e) => setEditDetails({ ...editDetails, fats: e.target.value ? parseInt(e.target.value) : null })}
                  data-testid="input-fats"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="How did you feel? Any notes..."
                value={editDetails.notes || ''}
                onChange={(e) => setEditDetails({ ...editDetails, notes: e.target.value || null })}
                className="resize-none"
                rows={3}
                data-testid="input-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)} data-testid="button-cancel-day">Cancel</Button>
            <Button onClick={handleSave} data-testid="button-save-day">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
