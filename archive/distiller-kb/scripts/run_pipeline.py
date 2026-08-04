#!/usr/bin/env python3
"""
Pipeline Orchestrator for Hermes Agent
Runs a sequence of profiles with retry logic, timing, and quality gates.
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional


# Profile definitions
PROFILES = [
    {
        "name": "corpus",
        "description": "Generate initial corpus of examples",
        "command_template": "hermes chat --provider {provider} --prompt 'Generate a diverse corpus of test cases for the task' --max-turns {max_turns}",
        "expected_outputs": ["corpus_output.json", "corpus_metadata.json"],
        "max_turns": 10,
    },
    {
        "name": "distill",
        "description": "Distill corpus into refined examples",
        "command_template": "hermes chat --provider {provider} --prompt 'Distill the corpus into high-quality examples' --max-turns {max_turns}",
        "expected_outputs": ["distilled_output.json", "distill_report.md"],
        "max_turns": 15,
    },
    {
        "name": "counterexample",
        "description": "Find counterexamples and edge cases",
        "command_template": "hermes chat --provider {provider} --prompt 'Find counterexamples and edge cases in the distilled examples' --max-turns {max_turns}",
        "expected_outputs": ["counterexamples.json", "edge_cases.md"],
        "max_turns": 12,
    },
    {
        "name": "loop",
        "description": "Iterative refinement loop",
        "command_template": "hermes chat --provider {provider} --prompt 'Run iterative refinement on all examples' --max-turns {max_turns}",
        "expected_outputs": ["refined_output.json", "loop_summary.json"],
        "max_turns": 20,
    },
]

DEFAULT_TIMEOUT = 300  # 5 minutes
RUNS_DIR = Path("runs")


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Hermes Pipeline Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_pipeline.py                          # Run all profiles with default settings
  python run_pipeline.py --provider openai        # Use OpenAI provider
  python run_pipeline.py --skip corpus            # Skip the corpus profile
  python run_pipeline.py --skip corpus --skip distill  # Skip multiple profiles
  python run_pipeline.py --dry-run                # Print commands without executing
        """
    )
    parser.add_argument(
        "--provider",
        default="minimax",
        help="Hermes provider to use (default: minimax)"
    )
    parser.add_argument(
        "--skip",
        action="append",
        dest="skip_profiles",
        default=[],
        help="Profile name to skip (can be specified multiple times)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"Timeout per profile in seconds (default: {DEFAULT_TIMEOUT})"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print commands without executing"
    )
    return parser.parse_args()


def ensure_runs_dir() -> None:
    """Create runs directory structure."""
    RUNS_DIR.mkdir(exist_ok=True)
    for profile in PROFILES:
        (RUNS_DIR / profile["name"]).mkdir(exist_ok=True)


def build_command(profile: dict, provider: str) -> str:
    """Build the hermes command from template."""
    return profile["command_template"].format(
        provider=provider,
        max_turns=profile["max_turns"]
    )


def run_profile(
    profile: dict,
    provider: str,
    timeout: int,
    dry_run: bool
) -> tuple[Optional[int], str, float, int]:
    """
    Run a single profile.
    
    Returns:
        Tuple of (exit_code, output_path, duration_seconds, retries)
    """
    profile_name = profile["name"]
    output_dir = RUNS_DIR / profile_name
    log_path = output_dir / "run_latest.log"
    
    command = build_command(profile, provider)
    
    if dry_run:
        print(f"[DRY-RUN] Would execute: {command}")
        print(f"[DRY-RUN] Log file: {log_path}")
        return None, str(log_path), 0.0, 0
    
    # Write command to log header
    timestamp = datetime.now().isoformat()
    with open(log_path, "w") as f:
        f.write(f"# Hermes Pipeline Run\n")
        f.write(f"# Profile: {profile_name}\n")
        f.write(f"# Timestamp: {timestamp}\n")
        f.write(f"# Command: {command}\n")
        f.write(f"# Timeout: {timeout}s\n")
        f.write("=" * 80 + "\n\n")
    
    # First attempt
    retries = 0
    start_time = time.time()
    exit_code = None
    
    while retries < 2:
        try:
            print(f"[{profile_name}] Attempt {retries + 1}: Starting...")
            
            with open(log_path, "a") as log_file:
                result = subprocess.run(
                    command,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    timeout=timeout,
                    cwd=output_dir
                )
                log_file.write(result.stdout)
                exit_code = result.returncode
            
            duration = time.time() - start_time
            
            if exit_code == 0:
                print(f"[{profile_name}] Completed successfully in {duration:.1f}s")
                return exit_code, str(log_path), duration, retries
            else:
                print(f"[{profile_name}] Failed with exit code {exit_code}")
                
        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            error_msg = f"Command timed out after {timeout}s"
            print(f"[{profile_name}] {error_msg}")
            with open(log_path, "a") as f:
                f.write(f"\n[TIMEOUT] {error_msg}\n")
            exit_code = -1
            
        except Exception as e:
            duration = time.time() - start_time
            error_msg = f"Error executing command: {e}"
            print(f"[{profile_name}] {error_msg}")
            with open(log_path, "a") as f:
                f.write(f"\n[ERROR] {error_msg}\n")
            exit_code = -1
        
        # Retry if failed
        if exit_code != 0:
            retries += 1
            if retries < 2:
                print(f"[{profile_name}] Retrying (attempt {retries + 1})...")
                time.sleep(1)  # Brief pause before retry
            else:
                print(f"[{profile_name}] All retries exhausted")
    
    return exit_code, str(log_path), duration, retries


def check_output_files(profile: dict, log_path: str) -> tuple[list[str], list[str]]:
    """
    Check for expected output files.
    
    Returns:
        Tuple of (found_files, missing_files)
    """
    profile_name = profile["name"]
    output_dir = RUNS_DIR / profile_name
    
    found = []
    missing = []
    
    for expected_file in profile["expected_outputs"]:
        file_path = output_dir / expected_file
        if file_path.exists():
            found.append(expected_file)
            print(f"  [OK] Found: {expected_file}")
        else:
            missing.append(expected_file)
            print(f"  [WARNING] Missing: {expected_file}")
    
    return found, missing


def generate_report(
    results: list[dict],
    total_duration: float
) -> dict:
    """Generate the pipeline report."""
    successful = sum(1 for r in results if r["status"] == "success")
    success_rate = successful / len(results) if results else 0.0
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "profiles": results,
        "total_duration_s": round(total_duration, 2),
        "success_rate": round(success_rate, 2)
    }
    
    return report


def write_report(report: dict) -> Path:
    """Write the pipeline report to JSON file."""
    report_path = RUNS_DIR / "pipeline_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[REPORT] Written to: {report_path}")
    return report_path


def print_summary(report: dict) -> None:
    """Print a summary of the pipeline run."""
    print("\n" + "=" * 60)
    print("PIPELINE SUMMARY")
    print("=" * 60)
    
    for profile_result in report["profiles"]:
        status_icon = "✓" if profile_result["status"] == "success" else "✗"
        print(f"\n{status_icon} {profile_result['name']}")
        print(f"    Status: {profile_result['status']}")
        print(f"    Duration: {profile_result['duration_s']:.1f}s")
        print(f"    Retries: {profile_result['retries']}")
        
        if profile_result["output_files_missing"]:
            print(f"    Missing: {', '.join(profile_result['output_files_missing'])}")
    
    print("\n" + "-" * 60)
    print(f"Total Duration: {report['total_duration_s']:.1f}s")
    print(f"Success Rate: {report['success_rate']*100:.0f}%")
    print("=" * 60)


def main() -> int:
    """Main entry point."""
    args = parse_args()
    
    print("=" * 60)
    print("HERMES PIPELINE ORCHESTRATOR")
    print("=" * 60)
    print(f"Provider: {args.provider}")
    print(f"Timeout: {args.timeout}s per profile")
    print(f"Dry Run: {args.dry_run}")
    
    if args.skip_profiles:
        print(f"Skipping: {', '.join(args.skip_profiles)}")
    
    # Filter profiles to run
    profiles_to_run = [
        p for p in PROFILES
        if p["name"] not in args.skip_profiles
    ]
    
    if not profiles_to_run:
        print("\n[ERROR] No profiles to run!")
        return 1
    
    print(f"\nProfiles to run: {[p['name'] for p in profiles_to_run]}")
    print()
    
    # Ensure directories exist
    ensure_runs_dir()
    
    # Run pipeline
    results = []
    pipeline_start = time.time()
    
    for i, profile in enumerate(profiles_to_run, 1):
        print(f"\n[{i}/{len(profiles_to_run)}] Running profile: {profile['name']}")
        print(f"Description: {profile['description']}")
        
        # Run the profile
        exit_code, log_path, duration, retries = run_profile(
            profile,
            args.provider,
            args.timeout,
            args.dry_run
        )
        
        # Determine status
        if args.dry_run:
            status = "dry_run"
            found, missing = [], profile["expected_outputs"][:]
        else:
            status = "success" if exit_code == 0 else "failed"
            
            # Quality gate - check output files
            found, missing = check_output_files(profile, log_path)
            
            # If profile failed but outputs exist, still mark as having outputs
            if missing and status == "success":
                status = "success_with_warnings"
        
        # Record result
        result = {
            "name": profile["name"],
            "status": status,
            "duration_s": round(duration, 2),
            "retries": retries,
            "output_files_found": found,
            "output_files_missing": missing,
            "log_file": log_path
        }
        results.append(result)
    
    # Calculate total duration
    total_duration = time.time() - pipeline_start
    
    # Generate and write report
    report = generate_report(results, total_duration)
    
    if not args.dry_run:
        report_path = write_report(report)
    
    # Print summary
    print_summary(report)
    
    # Return exit code based on success rate
    if args.dry_run:
        return 0
    
    if report["success_rate"] < 1.0:
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
