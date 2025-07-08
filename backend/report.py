import requests
import re
from datetime import datetime
from dotenv import load_dotenv
import os

requests.packages.urllib3.disable_warnings()

load_dotenv()

USERNAME = os.getenv("PRTG_USERNAME")
PASSWORD = os.getenv("PRTG_PASSWORD")

prtg_servers = [
    {"ip": "10.10.1.110", "username": USERNAME, "password": PASSWORD, "group_name": "Group 1"},
    {"ip": "10.10.1.111", "username": USERNAME, "password": PASSWORD, "group_name": "Group 2"},
    {"ip": "10.10.1.112", "username": USERNAME, "password": PASSWORD, "group_name": "Group 3"},
    {"ip": "10.10.1.113", "username": USERNAME, "password": PASSWORD, "group_name": "CCTV SWITCHES"},
    {"ip": "10.10.1.114", "username": USERNAME, "password": PASSWORD, "group_name": "VOIP SERVERS"},
    {"ip": "10.10.1.115", "username": USERNAME, "password": PASSWORD, "group_name": "DC SWITCHES"},
    {"ip": "10.10.1.116", "username": USERNAME, "password": PASSWORD, "group_name": "RESIDENTIAL WIFI"},
    {"ip": "10.10.1.117", "username": USERNAME, "password": PASSWORD, "group_name": "LAN FACULTY"},
    {"ip": "10.10.1.118", "username": USERNAME, "password": PASSWORD, "group_name": "CCTV NVR"},
    {"ip": "10.10.1.119", "username": USERNAME, "password": PASSWORD, "group_name": "MASTERCARD SWITCHES"},
    {"ip": "10.10.1.120", "username": USERNAME, "password": PASSWORD, "group_name": "FACULTY WIFI"},
    {"ip": "10.10.1.121", "username": USERNAME, "password": PASSWORD, "group_name": "Group 12"},
    {"ip": "10.10.1.122", "username": USERNAME, "password": PASSWORD, "group_name": "RESIDENTIAL LAN"},
    {"ip": "10.10.1.123", "username": USERNAME, "password": PASSWORD, "group_name": "SERVERS AND SWITCHES"},
    {"ip": "10.10.1.124", "username": USERNAME, "password": PASSWORD, "group_name": "ADMIN NETWORKS"},
    {"ip": "10.10.1.125", "username": USERNAME, "password": PASSWORD, "group_name": "Group 16"},
    {"ip": "10.10.1.126", "username": USERNAME, "password": PASSWORD, "group_name": "ISPs"},
    {"ip": "10.10.1.127", "username": USERNAME, "password": PASSWORD, "group_name": "Group 18"},
    {"ip": "10.10.1.128", "username": USERNAME, "password": PASSWORD, "group_name": "Group 19"},
    {"ip": "10.10.1.129", "username": USERNAME, "password": PASSWORD, "group_name": "Group 20"},
    {"ip": "10.10.1.130", "username": USERNAME, "password": PASSWORD, "group_name": "Group 21"},
]

def fetch_sensors_with_last_up(prtg_ip, username, password):
    url = f"https://{prtg_ip}/api/table.json"
    params = {
        "content": "sensors",
        "columns": "device,lastup",
        "filter_status": "5",
        "username": username,
        "password": password
    }
    try:
        response = requests.get(url, params=params, verify=False, timeout=10)
        response.raise_for_status()
        sensors = response.json().get("sensors", [])
        return sensors
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from {prtg_ip}: {e}")
        return []

def write_combined_report(prtg_servers):
    report_filename = "Full_PRTG_Report.txt"
    with open(report_filename, 'w') as report_file:
        for server in prtg_servers:
            sensors = fetch_sensors_with_last_up(server['ip'], server['username'], server['password'])
            for sensor in sensors:
                device = sensor['device']
                last_up = sensor['lastup']
                # Extract the date part from the last_up string
                match = re.search(r'\d+/\d+/\d+ \d+:\d+:\d+ [APM]+', last_up)
                if match:
                    last_up_date_str = match.group()
                    last_up_date = datetime.strptime(last_up_date_str, '%m/%d/%Y %I:%M:%S %p')
                    downtime = datetime.now() - last_up_date
                    downtime_days = downtime.days
                    downtime_seconds = downtime.seconds
                    downtime_hours = downtime_seconds // 3600
                    downtime_minutes = (downtime_seconds % 3600) // 60
                    downtime_str = f"{downtime_days} d {downtime_hours} h {downtime_minutes} m"
                    report_file.write(f"{server['group_name']},{device},{last_up_date_str},{downtime_str}\n")
                else:
                    report_file.write(f"{server['group_name']},{device},Invalid date format,Unknown\n")

def generate_critical_sites_report(combined_report_path, critical_sites_report_path):
    with open(combined_report_path, 'r') as combined_file:
        lines = combined_file.readlines()

    critical_sites = {}
    for line in lines:
        columns = line.split(',')
        group_name = columns[0]
        device = columns[1]
        last_up = columns[2]
        downtime = columns[3].strip()
        if "Invalid" in downtime or "Unknown" in downtime:
            continue
        downtime_parts = downtime.split()
        downtime_days = int(downtime_parts[0].strip())
        if downtime_days <= 15:
            if group_name not in critical_sites:
                critical_sites[group_name] = []
            critical_sites[group_name].append((device, last_up, downtime))

    with open(critical_sites_report_path, 'w') as critical_file:
        current_time = datetime.now().strftime("%I:%M%p on %A %d %B %Y")
        critical_file.write(f"Critical Sites and Downtimes as at {current_time}\n\n")
        for group_name, devices in critical_sites.items():
            critical_file.write(f"{group_name}\n")
            for i, (device, last_up, downtime) in enumerate(devices, start=1):
                critical_file.write(f"{i}. {device} = {downtime} ago\n")
            critical_file.write("\n")

if __name__ == "__main__":
    combined_report_path = "Full_PRTG_Report.txt"
    critical_sites_report_path = "Critical_Sites_Report.txt"

    while True:
        print("1. Generate full report and critical sites report")
        print("2. Exit")
        choice = input("Enter your choice: ")

        if choice == "1":
            write_combined_report(prtg_servers)
            generate_critical_sites_report(combined_report_path, critical_sites_report_path)

            print("\nFirst few lines of the critical sites report:")
            with open(critical_sites_report_path, 'r') as file:
                print(file.read(5000))

        elif choice == "2":
            print("Exiting the program. Goodbye!")
            break

        else:
            print("Invalid choice. Please enter 1 or 2.")