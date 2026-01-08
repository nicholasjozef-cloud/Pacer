import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClientType | null = null;
let configPromise: Promise<{ supabaseUrl: string; supabaseAnonKey: string }> | null = null;
let initializationComplete = false;

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

async function fetchConfig(): Promise<{ supabaseUrl: string; supabaseAnonKey: string }> {
  // First try Vite build-time env vars
  const buildTimeUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const buildTimeKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  if (isValidUrl(buildTimeUrl) && buildTimeKey) {
    return { supabaseUrl: buildTimeUrl, supabaseAnonKey: buildTimeKey };
  }
  
  // Fall back to runtime config from server
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      const config = await response.json();
      return {
        supabaseUrl: config.supabaseUrl || '',
        supabaseAnonKey: config.supabaseAnonKey || '',
      };
    }
  } catch (error) {
    console.error('Failed to fetch config from server:', error);
  }
  
  return { supabaseUrl: '', supabaseAnonKey: '' };
}

export async function getSupabase(): Promise<SupabaseClientType | null> {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  // Wait for config and create single instance
  if (!configPromise) {
    configPromise = fetchConfig();
  }
  
  const config = await configPromise;
  
  // Only create client once, even if called multiple times
  if (!initializationComplete) {
    initializationComplete = true;
    if (isValidUrl(config.supabaseUrl) && config.supabaseAnonKey) {
      supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
    }
  }
  
  return supabaseInstance;
}

// Synchronous getter - may return null if not yet initialized
export function getSupabaseSync(): SupabaseClientType | null {
  return supabaseInstance;
}

// Legacy export for compatibility - initialize on module load if build-time vars available
const buildTimeUrl = import.meta.env.VITE_SUPABASE_URL || '';
const buildTimeKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (isValidUrl(buildTimeUrl) && buildTimeKey && !supabaseInstance) {
  supabaseInstance = createClient(buildTimeUrl, buildTimeKey);
  initializationComplete = true;
}

// Export the synchronous instance for legacy compatibility
export const supabase = supabaseInstance;

export type SupabaseClient = typeof supabase;
