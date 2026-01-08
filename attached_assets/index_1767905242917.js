/**
 * Services Layer - All Supabase database operations
 * 
 * This centralizes all database calls in one place, making it easier to:
 * - Debug data issues
 * - Add caching later
 * - Switch databases if needed
 * - Test with mocks
 */

import { supabase } from '../supabaseClient';

// ============================================
// SETTINGS SERVICE
// ============================================

export const settingsService = {
  /**
   * Load user settings from database
   * @param {string} userId 
   * @returns {Promise<object|null>}
   */
  async load(userId) {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error loading settings:', error);
      throw error;
    }

    if (data) {
      console.log('✅ Settings loaded:', data);
    }
    
    return data;
  },

  /**
   * Save user settings to database
   * @param {string} userId 
   * @param {object} settings 
   */
  async save(userId, settings) {
    if (!supabase) return;

    console.log('💾 Saving settings:', settings);

    const { error } = await supabase
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
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Error saving settings:', error);
      throw error;
    }
    
    console.log('✅ Settings saved successfully');
  }
};

// ============================================
// DAY DETAILS SERVICE
// ============================================

export const dayDetailsService = {
  /**
   * Load all day details for a user
   * @param {string} userId 
   * @returns {Promise<object>} Map of dateKey -> details
   */
  async loadAll(userId) {
    if (!supabase) return {};

    const { data, error } = await supabase
      .from('day_details')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error loading day details:', error);
      throw error;
    }

    // Transform to a map keyed by date
    const detailsMap = {};
    data?.forEach(day => {
      detailsMap[day.date] = {
        workout: day.workout_type,
        miles: day.miles,
        pace: day.pace,
        protein: day.protein,
        carbs: day.carbs,
        fats: day.fats,
        notes: day.notes
      };
    });

    console.log('✅ Day details loaded:', Object.keys(detailsMap).length, 'entries');
    return detailsMap;
  },

  /**
   * Save day details for a specific date
   * @param {string} userId 
   * @param {string} dateKey - YYYY-MM-DD format
   * @param {object} details 
   */
  async save(userId, dateKey, details) {
    if (!supabase) return;

    const { error } = await supabase
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
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      });

    if (error) {
      console.error('❌ Error saving day details:', error);
      throw error;
    }
    
    console.log('✅ Day details saved for', dateKey);
  }
};

// ============================================
// STRAVA SERVICE
// ============================================

export const stravaService = {
  /**
   * Load Strava connection for a user
   * @param {string} userId 
   * @returns {Promise<object|null>}
   */
  async load(userId) {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error loading Strava connection:', error);
      throw error;
    }

    if (data) {
      console.log('✅ Strava connection loaded from database');
    }

    return data;
  },

  /**
   * Save Strava connection
   * @param {string} userId 
   * @param {object} tokenData - Response from Strava OAuth
   */
  async save(userId, tokenData) {
    if (!supabase) return;

    const { error } = await supabase
      .from('strava_connections')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        athlete_id: tokenData.athlete.id,
        athlete_data: tokenData.athlete,
        expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('❌ Error saving Strava connection:', error);
      throw error;
    }
    
    console.log('✅ Strava connection saved to database');
  },

  /**
   * Delete Strava connection
   * @param {string} userId 
   */
  async delete(userId) {
    if (!supabase) return;

    const { error } = await supabase
      .from('strava_connections')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error removing Strava connection:', error);
      throw error;
    }
    
    console.log('✅ Strava connection removed from database');
  },

  /**
   * Exchange OAuth code for tokens
   * @param {string} code 
   * @returns {Promise<object>}
   */
  async exchangeToken(code) {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.REACT_APP_STRAVA_CLIENT_ID,
        client_secret: process.env.REACT_APP_STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange Strava token');
    }

    return response.json();
  },

  /**
   * Fetch activities from Strava API
   * @param {string} accessToken 
   * @returns {Promise<array>} Array of run activities
   */
  async fetchActivities(accessToken) {
    const response = await fetch('/api/strava?endpoint=athlete/activities&method=GET', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Strava activities');
    }

    const activities = await response.json();
    return activities.filter(a => a.type === 'Run');
  },

  /**
   * Get OAuth authorization URL
   * @returns {string}
   */
  getAuthUrl() {
    const clientId = process.env.REACT_APP_STRAVA_CLIENT_ID;
    if (!clientId) {
      throw new Error('Strava Client ID not configured');
    }

    const redirectUri = `${window.location.origin}/`;
    const scope = 'read,activity:read_all';

    return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&approval_prompt=auto`;
  }
};

// ============================================
// NUTRITION SERVICE
// ============================================

export const nutritionService = {
  /**
   * Load nutrition entries for a user
   * @param {string} userId 
   * @param {number} limit 
   * @returns {Promise<array>}
   */
  async load(userId, limit = 100) {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('nutrition_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error loading nutrition:', error);
      throw error;
    }
    
    return data || [];
  }
};
