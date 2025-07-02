import { useState } from 'react';
import { Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface RunReportButtonProps {
  onRunReport: () => Promise<any>;
  disabled?: boolean;
}

export function RunReportButton({ onRunReport, disabled }: RunReportButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleRunReport = async () => {
    if (isRunning || disabled) return;

    setIsRunning(true);
    setStatus('idle');
    setMessage('');

    try {
      const result = await onRunReport();
      
      if (result.success) {
        setStatus('success');
        setMessage(`Report generated successfully! Full: ${result.full_report_count}, Critical: ${result.critical_report_count}`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 5000);
      } else {
        setStatus('error');
        setMessage(result.message || 'Report generation failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const getButtonClasses = () => {
    const baseClasses = "inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200";
    
    if (disabled || isRunning) {
      return `${baseClasses} bg-gray-400 text-white cursor-not-allowed`;
    }
    
    if (status === 'success') {
      return `${baseClasses} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500`;
    }
    
    if (status === 'error') {
      return `${baseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`;
    }
    
    return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-lg hover:shadow-xl`;
  };

  const getIcon = () => {
    if (isRunning) return <Loader2 className="w-5 h-5 mr-2 animate-spin" />;
    if (status === 'success') return <CheckCircle className="w-5 h-5 mr-2" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 mr-2" />;
    return <Play className="w-5 h-5 mr-2" />;
  };

  const getButtonText = () => {
    if (isRunning) return 'Running Report...';
    if (status === 'success') return 'Report Complete';
    if (status === 'error') return 'Retry Report';
    return 'Run Report';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleRunReport}
        disabled={disabled || isRunning}
        className={getButtonClasses()}
      >
        {getIcon()}
        {getButtonText()}
      </button>
      
      {message && (
        <div className={`p-3 rounded-lg text-sm max-w-md text-center ${
          status === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}