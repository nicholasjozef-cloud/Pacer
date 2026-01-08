import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClientType | null = null;
let initPromise: Promise<SupabaseClientType | null> | null = null;

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

async function initializeSupabase(): Promise<SupabaseClientType | null> {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  let supabaseUrl = '';
  let supabaseAnonKey = '';
  
  // First try Vite build-time env vars
  const buildTimeUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const buildTimeKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (isValidUrl(buildTimeUrl) && buildTimeKey) {
    supabaseUrl = buildTimeUrl;
    supabaseAnonKey = buildTimeKey;
  } else {
    // Fall back to runtime config from server
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const config = await response.json();
        supabaseUrl = config.supabaseUrl || '';
        supabaseAnonKey = config.supabaseAnonKey || '';
      }
    } catch (error) {
      console.error('Failed to fetch config from server:', error);
    }
  }
  
  if (isValidUrl(supabaseUrl) && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  
  return supabaseInstance;
}

export async function getSupabase(): Promise<SupabaseClientType | null> {
  if (!initPromise) {
    initPromise = initializeSupabase();
  }
  return initPromise;
}

export type SupabaseClient = SupabaseClientType | null;
