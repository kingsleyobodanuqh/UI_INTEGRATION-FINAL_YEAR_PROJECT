/*
  # Create PRTG Report Tables

  1. New Tables
    - `full_report_logs`
      - `id` (uuid, primary key)
      - `group_name` (text)
      - `device` (text)
      - `last_up` (text)
      - `downtime` (text)
      - `downtime_days` (int)
      - `created_at` (timestamp)
    - `critical_report_logs`
      - `id` (uuid, primary key)
      - `group_name` (text)
      - `device` (text)
      - `last_up` (text)
      - `downtime` (text)
      - `downtime_days` (int)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for anonymous read access
    - Add policies for service role insert access
*/

-- Create full_report_logs table
CREATE TABLE IF NOT EXISTS full_report_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  last_up text NOT NULL DEFAULT '',
  downtime text NOT NULL DEFAULT '',
  downtime_days int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create critical_report_logs table
CREATE TABLE IF NOT EXISTS critical_report_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL DEFAULT '',
  device text NOT NULL DEFAULT '',
  last_up text NOT NULL DEFAULT '',
  downtime text NOT NULL DEFAULT '',
  downtime_days int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE full_report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_report_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous read access (frontend)
CREATE POLICY "Allow anonymous read access to full_report_logs"
  ON full_report_logs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous read access to critical_report_logs"
  ON critical_report_logs
  FOR SELECT
  TO anon
  USING (true);

-- Create policies for service role insert access (backend)
CREATE POLICY "Allow service role insert to full_report_logs"
  ON full_report_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role insert to critical_report_logs"
  ON critical_report_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_full_report_logs_created_at ON full_report_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_full_report_logs_group_name ON full_report_logs(group_name);
CREATE INDEX IF NOT EXISTS idx_full_report_logs_downtime_days ON full_report_logs(downtime_days);

CREATE INDEX IF NOT EXISTS idx_critical_report_logs_created_at ON critical_report_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_critical_report_logs_group_name ON critical_report_logs(group_name);
CREATE INDEX IF NOT EXISTS idx_critical_report_logs_downtime_days ON critical_report_logs(downtime_days);