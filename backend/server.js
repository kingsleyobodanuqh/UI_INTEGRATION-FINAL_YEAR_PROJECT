import express from 'express';
import cors from 'cors';
import https from 'https';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// PRTG server configuration
const prtgServers = [];
for (let i = 1; i <= 21; i++) {
  const ip = process.env[`PRTG_IP_${i}`];
  if (ip) {
    prtgServers.push({
      ip: ip,
      username: process.env.PRTG_USER,
      password: process.env.PRTG_PASS,
      group_name: `Group ${i}`
    });
  }
}

// Utility functions
function makeHttpsRequest(url, params) {
  return new Promise((resolve, reject) => {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;
    
    const options = {
      rejectUnauthorized: false, // Ignore SSL certificate errors
      timeout: 30000
    };

    const req = https.get(fullUrl, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(30000);
  });
}

function fetchSensorsWithLastUp(prtgIp, username, password) {
  const url = `https://${prtgIp}/api/table.json`;
  const params = {
    content: 'sensors',
    columns: 'device,lastup',
    filter_status: '5', // Down sensors only
    username: username,
    password: password
  };

  console.log(`Fetching data from PRTG server: ${prtgIp}`);
  
  return makeHttpsRequest(url, params)
    .then(data => {
      const sensors = data.sensors || [];
      console.log(`Retrieved ${sensors.length} sensors from ${prtgIp}`);
      return sensors;
    })
    .catch(error => {
      console.error(`Error fetching data from ${prtgIp}:`, error.message);
      return [];
    });
}

function calculateDowntime(lastUpStr) {
  try {
    // Extract date/time pattern
    const match = lastUpStr.match(/(\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} [APM]+)/);
    if (!match) {
      return { lastUpDate: null, downtimeStr: "Unknown", downtimeDays: 999 };
    }

    const dateStr = match[1];
    const lastUpDate = new Date(dateStr);
    
    if (isNaN(lastUpDate.getTime())) {
      return { lastUpDate: null, downtimeStr: "Invalid", downtimeDays: 999 };
    }

    const now = new Date();
    const delta = now - lastUpDate;
    const days = Math.floor(delta / (1000 * 60 * 60 * 24));
    const hours = Math.floor((delta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));

    const downtimeStr = `${days} d ${hours} h ${minutes} m`;

    return { lastUpDate, downtimeStr, downtimeDays: days };
  } catch (error) {
    console.error(`Error calculating downtime for '${lastUpStr}':`, error);
    return { lastUpDate: null, downtimeStr: "Unknown", downtimeDays: 999 };
  }
}

async function generateFullReport() {
  console.log('Starting full report generation...');
  const fullLogs = [];

  try {
    for (const server of prtgServers) {
      const sensors = await fetchSensorsWithLastUp(server.ip, server.username, server.password);
      
      for (const sensor of sensors) {
        const device = sensor.device || 'Unknown Device';
        const lastUp = sensor.lastup || 'Unknown';
        
        const { lastUpDate, downtimeStr, downtimeDays } = calculateDowntime(lastUp);
        const formattedLastUp = lastUpDate ? lastUpDate.toLocaleString('en-US') : 'Invalid';
        
        fullLogs.push({
          group_name: server.group_name,
          device: device,
          last_up: formattedLastUp,
          downtime: downtimeStr,
          downtime_days: downtimeDays
        });
      }
    }

    // Insert into Supabase
    if (fullLogs.length > 0) {
      console.log(`Inserting ${fullLogs.length} records into full_report_logs`);
      const { error } = await supabase
        .from('full_report_logs')
        .insert(fullLogs);
      
      if (error) {
        throw error;
      }
      console.log('Full report logs inserted successfully');
    }

    console.log(`Full report generated with ${fullLogs.length} devices`);
    return fullLogs;
  } catch (error) {
    console.error('Error generating full report:', error);
    throw error;
  }
}

async function generateCriticalReport(fullLogs) {
  console.log('Starting critical report generation...');
  
  try {
    // Filter critical devices (≤ 15 days downtime)
    const criticalLogs = fullLogs.filter(log => 
      log.downtime_days <= 15 && 
      !log.downtime.includes('Invalid') && 
      !log.downtime.includes('Unknown')
    );

    // Insert into Supabase
    if (criticalLogs.length > 0) {
      console.log(`Inserting ${criticalLogs.length} records into critical_report_logs`);
      const { error } = await supabase
        .from('critical_report_logs')
        .insert(criticalLogs);
      
      if (error) {
        throw error;
      }
      console.log('Critical report logs inserted successfully');
    }

    console.log(`Critical report generated with ${criticalLogs.length} devices`);
    return criticalLogs;
  } catch (error) {
    console.error('Error generating critical report:', error);
    throw error;
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'PRTG Monitoring Backend (Node.js)',
    timestamp: new Date().toISOString()
  });
});

app.post('/run-report', async (req, res) => {
  try {
    console.log('Report generation requested');
    
    // Generate reports
    const fullLogs = await generateFullReport();
    const criticalLogs = await generateCriticalReport(fullLogs);
    
    const response = {
      success: true,
      message: 'Reports generated successfully',
      full_report_count: fullLogs.length,
      critical_report_count: criticalLogs.length,
      timestamp: new Date().toISOString()
    };
    
    console.log('Report generation completed:', response);
    res.json(response);
  } catch (error) {
    console.error('Error running report:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/status', async (req, res) => {
  try {
    // Check Supabase connection
    const { count, error } = await supabase
      .from('full_report_logs')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }

    res.json({
      status: 'operational',
      supabase_connected: true,
      prtg_servers_configured: prtgServers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      supabase_connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`PRTG Monitoring Backend (Node.js) running on port ${PORT}`);
  console.log(`Configured ${prtgServers.length} PRTG servers`);
  
  // Check required environment variables
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'PRTG_USER', 'PRTG_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file');
  }
});