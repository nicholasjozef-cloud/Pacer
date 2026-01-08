export type WorkoutCategory = 'rest' | 'easy' | 'tempo' | 'speed' | 'long';

export interface WorkoutColorConfig {
  tailwind: string;
  hex: string;
  label: string;
}

export const WORKOUT_COLORS: Record<WorkoutCategory, WorkoutColorConfig> = {
  rest: {
    tailwind: 'bg-muted text-muted-foreground',
    hex: '#64748b',
    label: 'Rest',
  },
  easy: {
    tailwind: 'bg-workout-easy text-white',
    hex: '#22c55e',
    label: 'Easy/Recovery',
  },
  tempo: {
    tailwind: 'bg-workout-tempo text-white',
    hex: '#f97316',
    label: 'Tempo',
  },
  speed: {
    tailwind: 'bg-workout-intervals text-white',
    hex: '#ef4444',
    label: 'Speed/Intervals',
  },
  long: {
    tailwind: 'bg-workout-long text-white',
    hex: '#a855f7',
    label: 'Long Run',
  },
};

export function getWorkoutCategory(type: string): WorkoutCategory {
  switch (type) {
    case 'Rest':
      return 'rest';
    case 'Easy':
    case 'Recovery':
      return 'easy';
    case 'Tempo':
      return 'tempo';
    case 'Intervals':
      return 'speed';
    case 'Long Run':
      return 'long';
    default:
      return 'rest';
  }
}

export function getWorkoutColor(type: string): WorkoutColorConfig {
  const category = getWorkoutCategory(type);
  return WORKOUT_COLORS[category];
}

export function getWorkoutTailwindClass(type: string): string {
  return getWorkoutColor(type).tailwind;
}

export function getWorkoutHexColor(type: string): string {
  return getWorkoutColor(type).hex;
}
