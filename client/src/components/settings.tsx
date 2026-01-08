import { Settings as SettingsIcon, Target, Calendar, Activity, Scale } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import type { UserSettingsData } from '@shared/schema';

interface SettingsProps {
  settings: UserSettingsData;
  onSettingsChange: (settings: Partial<UserSettingsData>) => void;
  onSignOut: () => void;
  userEmail?: string;
}

export function Settings({ settings, onSettingsChange, onSignOut, userEmail }: SettingsProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto" data-testid="settings-container">
      {/* User Profile */}
      <Card className="border-border/50" data-testid="card-account">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            Account
          </CardTitle>
          <CardDescription>Manage your account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{userEmail || 'Not logged in'}</p>
              <p className="text-sm text-muted-foreground">Email</p>
            </div>
            <Button variant="destructive" onClick={onSignOut} data-testid="button-sign-out">
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Race Settings */}
      <Card className="border-border/50" data-testid="card-race-goal">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Race Goal
          </CardTitle>
          <CardDescription>Set your marathon goal time and race date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetTime">Target Time</Label>
              <Input
                id="targetTime"
                placeholder="2:59:59"
                value={settings.targetTime}
                onChange={(e) => onSettingsChange({ targetTime: e.target.value })}
                data-testid="input-target-time"
              />
              <p className="text-xs text-muted-foreground">Format: H:MM:SS</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="raceDate">Race Date</Label>
              <Input
                id="raceDate"
                type="date"
                value={settings.raceDate || ''}
                onChange={(e) => onSettingsChange({ raceDate: e.target.value || null })}
                data-testid="input-race-date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Body Stats */}
      <Card className="border-border/50" data-testid="card-body-stats">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Body Stats
          </CardTitle>
          <CardDescription>Track your body metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bodyWeight">Current Weight (lbs)</Label>
            <Input
              id="bodyWeight"
              type="number"
              value={settings.bodyWeight}
              onChange={(e) => onSettingsChange({ bodyWeight: parseInt(e.target.value) || 0 })}
              data-testid="input-body-weight"
            />
          </div>
        </CardContent>
      </Card>

      {/* Training Plan Settings */}
      <Card className="border-border/50" data-testid="card-training-plan">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Training Plan
          </CardTitle>
          <CardDescription>Configure your training plan settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="inTrainingPlan">In Training Plan</Label>
              <p className="text-sm text-muted-foreground">
                Enable structured training plan mode
              </p>
            </div>
            <Switch
              id="inTrainingPlan"
              checked={settings.inTrainingPlan}
              onCheckedChange={(checked) => onSettingsChange({ inTrainingPlan: checked })}
              data-testid="switch-training-plan"
            />
          </div>

          {settings.inTrainingPlan && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalWeeks">Total Training Weeks</Label>
                  <Input
                    id="totalWeeks"
                    type="number"
                    min="1"
                    max="52"
                    value={settings.totalTrainingWeeks}
                    onChange={(e) => onSettingsChange({ totalTrainingWeeks: parseInt(e.target.value) || 16 })}
                    data-testid="input-total-weeks"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentWeek">Current Week</Label>
                  <Input
                    id="currentWeek"
                    type="number"
                    min="1"
                    max={settings.totalTrainingWeeks}
                    value={settings.currentWeek}
                    onChange={(e) => onSettingsChange({ currentWeek: parseInt(e.target.value) || 1 })}
                    data-testid="input-current-week"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainingStartDate">Training Start Date</Label>
                <Input
                  id="trainingStartDate"
                  type="date"
                  value={settings.trainingStartDate || ''}
                  onChange={(e) => onSettingsChange({ trainingStartDate: e.target.value || null })}
                  data-testid="input-training-start-date"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Calculated Pace */}
      <Card className="border-border/50 bg-primary/5" data-testid="card-target-pace">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Target Pace</p>
              <p className="text-3xl font-bold text-primary" data-testid="text-target-pace">
                {(() => {
                  const parts = settings.targetTime.split(':');
                  const totalSeconds = parts.reduce((acc, time) => (60 * acc) + +time, 0);
                  const paceSeconds = totalSeconds / 26.2;
                  const paceMinutes = Math.floor(paceSeconds / 60);
                  const paceRemaining = Math.round(paceSeconds % 60);
                  return `${paceMinutes}:${String(paceRemaining).padStart(2, '0')}`;
                })()}
                <span className="text-lg font-normal text-muted-foreground ml-1">/mile</span>
              </p>
            </div>
            <Calendar className="w-12 h-12 text-primary/30" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
