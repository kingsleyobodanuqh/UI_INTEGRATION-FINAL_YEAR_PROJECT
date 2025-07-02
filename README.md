# PRTG Network Monitoring System

A complete full-stack application for monitoring PRTG network devices with real-time reporting and dashboard visualization.

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Python + Flask + Supabase integration
- **Database**: Supabase PostgreSQL
- **Monitoring**: 21 PRTG servers with automated polling

## 🚀 Features

### Backend
- Polls 21 PRTG servers for device status
- Generates comprehensive and critical device reports
- Automatic data persistence to Supabase
- RESTful API endpoints for frontend integration
- Comprehensive error handling and logging

### Frontend
- Real-time dashboard with key metrics
- Interactive data tables with filtering and search
- Responsive design for all screen sizes
- Status indicators and visual feedback
- One-click report generation

### Database
- Automated report log storage
- Optimized queries with proper indexing
- Row-level security for data protection
- Real-time data synchronization

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- Supabase account
- Access to PRTG servers

## 🛠️ Installation

### 1. Clone and Setup

```bash
git clone <repository>
cd prtg-monitoring-system
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your actual values
```

### 3. Frontend Setup

```bash
cd ..
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the migration script in the Supabase SQL editor:
   ```sql
   -- Copy contents from supabase/migrations/create_report_tables.sql
   ```
3. Update environment variables with your Supabase credentials

## 🔧 Configuration

### Backend Environment (`.env`)

```env
# PRTG Configuration
PRTG_USER=your_prtg_username
PRTG_PASS=your_prtg_password

# PRTG Server IPs (21 servers)
PRTG_IP_1=10.10.1.110
PRTG_IP_2=10.10.1.111
# ... up to PRTG_IP_21

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
```

### Frontend Environment (`.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 🚀 Running the Application

### Start Backend Server

```bash
cd backend
python report.py
```

Backend will be available at `http://localhost:5000`

### Start Frontend Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

## 🔍 API Endpoints

### Backend API

- `GET /` - Health check
- `POST /run-report` - Generate PRTG reports
- `GET /status` - System status

### Frontend Features

- **Dashboard**: Real-time metrics and statistics
- **Report Generation**: One-click report execution
- **Data Tables**: Interactive browsing with filters
- **Search**: Device and group name search
- **Responsive**: Mobile-friendly design

## 📊 Database Schema

### `full_report_logs`
- `id` - Unique identifier
- `group_name` - PRTG server group name
- `device` - Device name
- `last_up` - Last up timestamp
- `downtime` - Formatted downtime string
- `downtime_days` - Downtime in days (integer)
- `created_at` - Record creation timestamp

### `critical_report_logs`
- Same schema as `full_report_logs`
- Contains only devices with ≤ 15 days downtime

## 🔐 Security

- Row Level Security (RLS) enabled on all tables
- Anonymous read access for frontend
- Service role write access for backend
- Environment variable configuration
- SSL/TLS encryption for all connections

## 📈 Monitoring

The system provides comprehensive monitoring including:

- **Total Devices**: All monitored devices
- **Critical Devices**: Devices with ≤ 15 days downtime
- **Average Downtime**: Calculated across all devices
- **Last Update**: Timestamp of most recent data

## 🎨 UI Features

- Modern, clean interface
- Color-coded status indicators
- Interactive data tables
- Real-time updates
- Loading states and error handling
- Responsive design
- Professional styling with Tailwind CSS

## 🐛 Troubleshooting

### Common Issues

1. **Connection Errors**: Verify PRTG server accessibility
2. **Authentication**: Check PRTG credentials
3. **Supabase Errors**: Verify Supabase configuration
4. **CORS Issues**: Ensure backend CORS is properly configured

### Debugging

- Check backend logs for detailed error information
- Verify environment variables are properly set
- Test API endpoints individually
- Check browser console for frontend errors

## 📝 Development

### Backend Development

```bash
cd backend
python report.py  # Run with debug mode
```

### Frontend Development

```bash
npm run dev  # Start development server
npm run build  # Build for production
```

## 🔄 Deployment

### Backend Deployment
- Deploy to your preferred Python hosting service
- Configure environment variables
- Ensure Supabase connectivity

### Frontend Deployment
- Build the application: `npm run build`
- Deploy the `dist` folder to your static hosting service
- Configure environment variables for production

## 📋 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the logs for detailed error information