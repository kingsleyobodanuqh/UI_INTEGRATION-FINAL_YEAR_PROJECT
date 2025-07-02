import { useState, useEffect } from 'react';
import { supabase, ReportLog, ReportStats } from '../lib/supabase';

export function useReportData() {
  const [fullReports, setFullReports] = useState<ReportLog[]>([]);
  const [criticalReports, setCriticalReports] = useState<ReportLog[]>([]);
  const [stats, setStats] = useState<ReportStats>({
    totalDevices: 0,
    criticalDevices: 0,
    averageDowntime: 0,
    lastUpdate: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch full reports (latest 100)
      const { data: fullData, error: fullError } = await supabase
        .from('full_report_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fullError) throw fullError;

      // Fetch critical reports (latest 100)
      const { data: criticalData, error: criticalError } = await supabase
        .from('critical_report_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (criticalError) throw criticalError;

      setFullReports(fullData || []);
      setCriticalReports(criticalData || []);

      // Calculate stats
      const totalDevices = fullData?.length || 0;
      const criticalDevices = criticalData?.length || 0;
      const averageDowntime = fullData?.length > 0 
        ? fullData.reduce((sum, report) => sum + report.downtime_days, 0) / fullData.length
        : 0;
      const lastUpdate = fullData?.[0]?.created_at || '';

      setStats({
        totalDevices,
        criticalDevices,
        averageDowntime: Math.round(averageDowntime * 10) / 10,
        lastUpdate
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const runReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:5000/run-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Report generation failed');
      }

      // Refresh data after successful report generation
      await fetchReports();
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    fullReports,
    criticalReports,
    stats,
    loading,
    error,
    runReport,
    refreshData: fetchReports
  };
}