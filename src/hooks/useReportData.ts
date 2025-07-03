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

      console.log('Fetching reports from Supabase...');

      // Fetch full reports (latest 100)
      const { data: fullData, error: fullError } = await supabase
        .from('full_report_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fullError) {
        console.error('Error fetching full reports:', fullError);
        throw fullError;
      }

      // Fetch critical reports (latest 100)
      const { data: criticalData, error: criticalError } = await supabase
        .from('critical_report_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (criticalError) {
        console.error('Error fetching critical reports:', criticalError);
        throw criticalError;
      }

      console.log(`Fetched ${fullData?.length || 0} full reports and ${criticalData?.length || 0} critical reports`);

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
      console.error('Error in fetchReports:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
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

      console.log('Running report via backend...');

      // Try different backend URLs
      const backendUrls = [
        'http://localhost:5000/run-report',
        'http://127.0.0.1:5000/run-report'
      ];

      let response;
      let lastError;

      for (const url of backendUrls) {
        try {
          console.log(`Trying backend URL: ${url}`);
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            console.log(`Successfully connected to backend at: ${url}`);
            break;
          }
        } catch (err) {
          console.warn(`Failed to connect to ${url}:`, err);
          lastError = err;
          continue;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Backend connection failed. Make sure the Python backend is running on port 5000. Last error: ${lastError}`);
      }

      const result = await response.json();
      console.log('Backend response:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'Report generation failed');
      }

      // Refresh data after successful report generation
      await fetchReports();
      
      return result;
    } catch (err) {
      console.error('Error in runReport:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to run report';
      setError(errorMessage);
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