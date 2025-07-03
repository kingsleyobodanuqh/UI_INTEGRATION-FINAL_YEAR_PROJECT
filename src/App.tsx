import { useReportData } from './hooks/useReportData';
import { StatsCard } from './components/StatsCard';
import { ReportTable } from './components/ReportTable';
import { RunReportButton } from './components/RunReportButton';
import { Server, AlertTriangle, Clock, RefreshCw, Activity } from 'lucide-react';

function App() {
  const { fullReports, criticalReports, stats, loading, error, runReport } = useReportData();

  const formatLastUpdate = (dateString: string) => {
    if (!dateString) return 'No data';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (loading && fullReports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading PRTG monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PRTG Network Monitor</h1>
                <p className="text-gray-600">Real-time network device monitoring</p>
              </div>
            </div>
            <RunReportButton onRunReport={runReport} disabled={loading} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-800 font-medium">Error</p>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            {error.includes('Backend connection failed') && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 text-sm">
                  <strong>Troubleshooting:</strong>
                </p>
                <ul className="text-yellow-700 text-sm mt-1 list-disc list-inside">
                  <li>Make sure the Python backend is running: <code>cd backend && python report.py</code></li>
                  <li>Check that port 5000 is not blocked by firewall</li>
                  <li>Verify your .env file has correct Supabase credentials</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Devices"
            value={stats.totalDevices}
            icon={Server}
            color="blue"
            subtitle="Monitored devices"
          />
          <StatsCard
            title="Critical Devices"
            value={stats.criticalDevices}
            icon={AlertTriangle}
            color="red"
            subtitle="≤ 15 days downtime"
          />
          <StatsCard
            title="Avg Downtime"
            value={`${stats.averageDowntime} days`}
            icon={Clock}
            color="yellow"
            subtitle="Across all devices"
          />
          <StatsCard
            title="Last Update"
            value={formatLastUpdate(stats.lastUpdate)}
            icon={RefreshCw}
            color="green"
            subtitle="Data refresh time"
          />
        </div>

        {/* Data Tables */}
        <div className="space-y-8">
          <ReportTable
            title={`Critical Devices Report (${criticalReports.length})`}
            data={criticalReports}
            type="critical"
          />
          
          <ReportTable
            title={`Full Network Report (${fullReports.length})`}
            data={fullReports}
            type="full"
          />
        </div>

        {/* Footer */}
        <footer className="mt-12 py-8 border-t border-gray-200">
          <div className="text-center text-gray-500">
            <p>PRTG Network Monitoring System • Built with React, Python & Supabase</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;