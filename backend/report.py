import os
import re
import requests
from datetime import datetime
from dotenv import load_dotenv
import pandas as pd
from supabase import create_client, Client
from flask import Flask, jsonify, request
from flask_cors import CORS
import urllib3
import logging

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase configuration. Please check your .env file.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# PRTG server configuration
prtg_servers = []
for i in range(21):
    ip = os.getenv(f"PRTG_IP_{i+1}")
    if ip:
        prtg_servers.append({
            "ip": ip,
            "username": os.getenv("PRTG_USER"),
            "password": os.getenv("PRTG_PASS"),
            "group_name": f"Group {i+1}"
        })

def fetch_sensors_with_last_up(prtg_ip, username, password):
    """Fetch sensor data from PRTG server"""
    url = f"https://{prtg_ip}/api/table.json"
    params = {
        "content": "sensors",
        "columns": "device,lastup",
        "filter_status": "5",  # Down sensors only
        "username": username,
        "password": password
    }
    
    try:
        logger.info(f"Fetching data from PRTG server: {prtg_ip}")
        response = requests.get(url, params=params, verify=False, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        sensors = data.get("sensors", [])
        logger.info(f"Retrieved {len(sensors)} sensors from {prtg_ip}")
        return sensors
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout fetching data from {prtg_ip}")
        return []
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data from {prtg_ip}: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error fetching data from {prtg_ip}: {e}")
        return []

def calculate_downtime(last_up_str):
    """Calculate downtime from last_up string"""
    try:
        # Extract date/time pattern
        match = re.search(r'(\d{1,2}/\d{1,2}/\d{4} \d{1,2}:\d{2}:\d{2} [APM]+)', last_up_str)
        if not match:
            return None, "Unknown", 999
        
        date_str = match.group(1)
        last_up_date = datetime.strptime(date_str, "%m/%d/%Y %I:%M:%S %p")
        
        delta = datetime.now() - last_up_date
        days = delta.days
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        
        downtime_str = f"{days} d {hours} h {minutes} m"
        
        return last_up_date, downtime_str, days
        
    except Exception as e:
        logger.error(f"Error calculating downtime for '{last_up_str}': {e}")
        return None, "Unknown", 999

def write_combined_report():
    """Generate full PRTG report and save to database"""
    logger.info("Starting full report generation...")
    full_logs = []
    
    try:
        with open("Full_PRTG_Report.txt", "w", encoding='utf-8') as f:
            f.write("Group,Device,LastUp,Downtime\n")
            
            for server in prtg_servers:
                sensors = fetch_sensors_with_last_up(server["ip"], server["username"], server["password"])
                
                for sensor in sensors:
                    device = sensor.get("device", "Unknown Device")
                    last_up = sensor.get("lastup", "Unknown")
                    
                    last_up_date, downtime_str, downtime_days = calculate_downtime(last_up)
                    formatted_last_up = last_up_date.strftime("%m/%d/%Y %I:%M:%S %p") if last_up_date else "Invalid"
                    
                    # Write to file
                    f.write(f"{server['group_name']},{device},{formatted_last_up},{downtime_str}\n")
                    
                    # Prepare for database
                    full_logs.append({
                        "group_name": server["group_name"],
                        "device": device,
                        "last_up": formatted_last_up,
                        "downtime": downtime_str,
                        "downtime_days": downtime_days
                    })
        
        # Insert into Supabase
        if full_logs:
            logger.info(f"Inserting {len(full_logs)} records into full_report_logs")
            result = supabase.table("full_report_logs").insert(full_logs).execute()
            logger.info("Full report logs inserted successfully")
        
        logger.info(f"Full report generated with {len(full_logs)} devices")
        return full_logs
        
    except Exception as e:
        logger.error(f"Error generating full report: {e}")
        raise

def generate_critical_report():
    """Generate critical sites report (≤ 15 days downtime)"""
    logger.info("Starting critical report generation...")
    
    try:
        # Read the full report
        df = pd.read_csv("Full_PRTG_Report.txt")
        
        # Filter out invalid entries
        df = df[~df["Downtime"].str.contains("Invalid|Unknown", na=False)]
        
        # Extract downtime days
        df["DowntimeDays"] = df["Downtime"].str.extract(r'(\d+)\s*d').astype(float)
        
        # Filter critical devices (≤ 15 days)
        critical_df = df[df["DowntimeDays"] <= 15].copy()
        
        critical_logs = []
        
        with open("Critical_Sites_Report.txt", "w", encoding='utf-8') as f:
            for group, group_df in critical_df.groupby("Group"):
                f.write(f"\n{group}:\n")
                f.write("-" * (len(group) + 1) + "\n")
                
                for i, row in enumerate(group_df.itertuples(index=False), 1):
                    f.write(f"{i}. {row.Device} = {row.Downtime} ago\n")
                    
                    critical_logs.append({
                        "group_name": row.Group,
                        "device": row.Device,
                        "last_up": row.LastUp,
                        "downtime": row.Downtime,
                        "downtime_days": int(row.DowntimeDays)
                    })
        
        # Insert into Supabase
        if critical_logs:
            logger.info(f"Inserting {len(critical_logs)} records into critical_report_logs")
            result = supabase.table("critical_report_logs").insert(critical_logs).execute()
            logger.info("Critical report logs inserted successfully")
        
        logger.info(f"Critical report generated with {len(critical_logs)} devices")
        return critical_logs
        
    except Exception as e:
        logger.error(f"Error generating critical report: {e}")
        raise

# Flask App
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

@app.route("/", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "PRTG Monitoring Backend",
        "timestamp": datetime.now().isoformat()
    })

@app.route("/run-report", methods=["POST"])
def run_report():
    """Run PRTG monitoring report"""
    try:
        logger.info("Report generation requested")
        
        # Generate reports
        full_logs = write_combined_report()
        critical_logs = generate_critical_report()
        
        response = {
            "success": True,
            "message": "Reports generated successfully",
            "full_report_count": len(full_logs),
            "critical_report_count": len(critical_logs),
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Report generation completed: {response}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error running report: {e}")
        return jsonify({
            "success": False,
            "message": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

@app.route("/status", methods=["GET"])
def get_status():
    """Get current system status"""
    try:
        # Check Supabase connection
        result = supabase.table("full_report_logs").select("count").execute()
        
        return jsonify({
            "status": "operational",
            "supabase_connected": True,
            "prtg_servers_configured": len(prtg_servers),
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "supabase_connected": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

if __name__ == "__main__":
    logger.info("Starting PRTG Monitoring Backend...")
    logger.info(f"Configured {len(prtg_servers)} PRTG servers")
    
    # Ensure required environment variables are set
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY", "PRTG_USER", "PRTG_PASS"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        exit(1)
    
    app.run(host="0.0.0.0", port=5000, debug=True)