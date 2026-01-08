import { getSupabase, supabase } from './supabase';
import type { UserSettingsData, DayDetailsData } from '@shared/schema';

export const userSettingsService = {
  async get(userId: string): Promise<UserSettingsData | null> {
    const client = await getSupabase();
    if (!client) return null;
    
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading settings:', error);
      throw error;
    }

    if (!data) return null;

    return {
      bodyWeight: data.body_weight ?? 168,
      targetTime: data.target_time ?? '2:59:59',
      raceDate: data.race_date ?? null,
      inTrainingPlan: data.in_training_plan ?? false,
      totalTrainingWeeks: data.total_training_weeks ?? 16,
      currentWeek: data.current_week ?? 1,
      trainingStartDate: data.training_start_date ?? null,
    };
  },

  async save(userId: string, settings: UserSettingsData): Promise<void> {
    const client = await getSupabase();
    if (!client) return;

    const { error } = await client
      .from('user_settings')
      .upsert({
        user_id: userId,
        body_weight: settings.bodyWeight,
        target_time: settings.targetTime,
        race_date: settings.raceDate || null,
        in_training_plan: settings.inTrainingPlan,
        total_training_weeks: settings.totalTrainingWeeks,
        current_week: settings.currentWeek,
        training_start_date: settings.trainingStartDate || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },
};

export const dayDetailsService = {
  async getAll(userId: string): Promise<Record<string, DayDetailsData>> {
    const client = await getSupabase();
    if (!client) return {};

    const { data, error } = await client
      .from('day_details')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading day details:', error);
      throw error;
    }

    const detailsMap: Record<string, DayDetailsData> = {};
    if (data) {
      data.forEach(day => {
        detailsMap[day.date] = {
          workout: day.workout_type,
          miles: day.miles,
          pace: day.pace,
          protein: day.protein,
          carbs: day.carbs,
          fats: day.fats,
          notes: day.notes,
        };
      });
    }
    return detailsMap;
  },

  async save(userId: string, dateKey: string, details: DayDetailsData): Promise<void> {
    const client = await getSupabase();
    if (!client) return;

    const { error } = await client
      .from('day_details')
      .upsert({
        user_id: userId,
        date: dateKey,
        workout_type: details.workout || null,
        miles: details.miles || null,
        pace: details.pace || null,
        protein: details.protein || null,
        carbs: details.carbs || null,
        fats: details.fats || null,
        notes: details.notes || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,date',
      });

    if (error) {
      console.error('Error saving day details:', error);
      throw error;
    }
  },
};

export const stravaService = {
  async getConnection(userId: string) {
    const client = await getSupabase();
    if (!client) return null;

    const { data, error } = await client
      .from('strava_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading Strava connection:', error);
    }

    return data;
  },

  async saveConnection(
    userId: string, 
    accessToken: string, 
    refreshToken: string, 
    athleteId: string,
    athleteData: any,
    expiresAt: Date
  ): Promise<void> {
    const client = await getSupabase();
    if (!client) return;

    const { error } = await client
      .from('strava_connections')
      .upsert({
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        athlete_id: athleteId,
        athlete_data: athleteData,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving Strava connection:', error);
      throw error;
    }
  },

  async deleteConnection(userId: string): Promise<void> {
    const client = await getSupabase();
    if (!client) return;

    const { error } = await client
      .from('strava_connections')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting Strava connection:', error);
      throw error;
    }
  },
};

export const authService = {
  async signIn(email: string, password: string) {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase not configured');
    
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string) {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase not configured');
    
    const { data, error } = await client.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = await getSupabase();
    if (!client) return;
    await client.auth.signOut();
  },

  async getSession() {
    const client = await getSupabase();
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    return session;
  },

  onAuthStateChange(callback: (session: any) => void) {
    // For auth state change, we need to use the synchronous client
    // since this is a subscription setup
    if (!supabase) return { unsubscribe: () => {} };
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    
    return subscription;
  },
};
