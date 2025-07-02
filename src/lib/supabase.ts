import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ReportLog {
  id: string;
  group_name: string;
  device: string;
  last_up: string;
  downtime: string;
  downtime_days: number;
  created_at: string;
}

export interface ReportStats {
  totalDevices: number;
  criticalDevices: number;
  averageDowntime: number;
  lastUpdate: string;
}