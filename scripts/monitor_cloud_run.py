import subprocess
import json
import time
import argparse
import sys

def get_service_status(service_name, region, project=None):
    cmd = [
        "gcloud", "run", "services", "describe", service_name,
        "--region", region,
        "--format", "json"
    ]
    if project:
        cmd.extend(["--project", project])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, shell=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error fetching status from gcloud: {e.stderr}", file=sys.stderr)
        return None
    except json.JSONDecodeError:
        print("Error parsing JSON output from gcloud.", file=sys.stderr)
        return None

def monitor_deployment(service_name, region, project=None, timeout_sec=600, poll_interval=10):
    print(f"Monitoring deployment for Cloud Run service '{service_name}' in region '{region}'...")
    start_time = time.time()
    
    # Store previous generation to detect updates
    prev_generation = None

    while True:
        elapsed = time.time() - start_time
        if elapsed > timeout_sec:
            print("\nTimeout reached while waiting for deployment outcome.")
            return False

        service = get_service_status(service_name, region, project)
        if not service:
            time.sleep(poll_interval)
            continue

        metadata = service.get("metadata", {})
        status = service.get("status", {})
        conditions = status.get("conditions", [])
        
        # Generation track
        current_generation = metadata.get("generation")
        observed_generation = status.get("observedGeneration")

        # Wait until generation is reconciled
        if current_generation != observed_generation:
            print(f"\rWaiting for generation reconciliation ({observed_generation} -> {current_generation})...", end="", flush=True)
            time.sleep(poll_interval)
            continue
            
        ready_condition = next((c for c in conditions if c.get("type") == "Ready"), None)
        
        if not ready_condition:
            print("\rWaiting for Ready condition...", end="", flush=True)
            time.sleep(poll_interval)
            continue
            
        is_ready = ready_condition.get("status")

        # The service has converged to its outcome for the current generation
        if is_ready == "True":
            print("\n\n[SUCCESS] DEPLOYMENT SUCCESSFUL!")
            print(f"Latest Revision: {status.get('latestReadyRevisionName')}")
            print(f"URL: {status.get('url')}")
            print(f"Transition Time: {ready_condition.get('lastTransitionTime')}")
            return True
            
        elif is_ready == "False":
            print("\n\n[FAILED] DEPLOYMENT FAILED!")
            print(f"Reason: {ready_condition.get('reason')}")
            print(f"Message: {ready_condition.get('message')}")
            print("\nPlease check the logs in Google Cloud Console for more details.")
            return False
            
        else:
            print(f"\rStatus is Unknown/Pending (Reason: {ready_condition.get('reason')}). Waiting...", end="", flush=True)
        
        time.sleep(poll_interval)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Monitor Cloud Run deployment outcome.")
    parser.add_argument("--service", "-s", default="lupine-site", help="Cloud Run service name")
    parser.add_argument("--region", "-r", default="us-central1", help="GCP Region")
    parser.add_argument("--project", "-p", default="shed-489901", help="GCP Project ID (optional)")
    parser.add_argument("--timeout", "-t", type=int, default=300, help="Timeout in seconds")
    
    args = parser.parse_args()
    
    success = monitor_deployment(args.service, args.region, args.project, args.timeout)
    sys.exit(0 if success else 1)
