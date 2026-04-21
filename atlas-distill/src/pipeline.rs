use std::process::Command;
use std::time::Instant;

pub struct Profile {
    pub name: &'static str,
    pub description: &'static str,
    pub command_template: &'static str,
    pub expected_outputs: &'static [&'static str],
    pub max_turns: u32,
}

pub const PROFILES: &[Profile] = &[
    Profile {
        name: "corpus",
        description: "Ingest literature sources, parse documents, emit extraction records",
        command_template: "hermes chat --provider {provider} --prompt 'Run corpus ingestion: parse all literature sources and emit normalized extraction records with provenance' --max-turns {max_turns}",
        expected_outputs: &["corpus_output.json", "corpus_metadata.json"],
        max_turns: 10,
    },
    Profile {
        name: "distill",
        description: "Run Rust transforms and Python operator discovery",
        command_template: "hermes chat --provider {provider} --prompt 'Run distillation: execute Rust canonical transforms, score candidate operators, and attach numerical evidence' --max-turns {max_turns}",
        expected_outputs: &["distilled_output.json", "distill_report.md"],
        max_turns: 15,
    },
    Profile {
        name: "counterexample",
        description: "Stress-test candidates against held-out data",
        command_template: "hermes chat --provider {provider} --prompt 'Run counterexample search: find edge cases and regime boundaries for all candidate operators' --max-turns {max_turns}",
        expected_outputs: &["counterexamples.json", "edge_cases.md"],
        max_turns: 12,
    },
    Profile {
        name: "loop",
        description: "Iterative refinement and run closure",
        command_template: "hermes chat --provider {provider} --prompt 'Run loop closure: package artifacts, generate manifests, and verify provenance chain' --max-turns {max_turns}",
        expected_outputs: &["refined_output.json", "loop_summary.json"],
        max_turns: 20,
    },
];

pub fn run_pipeline(provider: &str, dry_run: bool) {
    eprintln!("  ╔══════════════════════════════════════════════╗");
    eprintln!("  ║  Hermes Pipeline Orchestrator (Rust)         ║");
    eprintln!("  ╚══════════════════════════════════════════════╝");
    eprintln!("  Provider: {}", provider);
    eprintln!("  Dry run:  {}", dry_run);
    eprintln!();

    let start = Instant::now();
    let mut successes = 0;

    for (i, p) in PROFILES.iter().enumerate() {
        eprintln!("  [{}/{}] Profile: {}", i + 1, PROFILES.len(), p.name);
        eprintln!("  Description: {}", p.description);

        let cmd = p.command_template
            .replace("{provider}", provider)
            .replace("{max_turns}", &p.max_turns.to_string());

        if dry_run {
            eprintln!("  [DRY-RUN] Would execute: {}", cmd);
            successes += 1;
        } else {
            eprintln!("  Running: {}", cmd);
            let p_start = Instant::now();
            
            // Note: executing entirely through bash for simplicity
            let result = Command::new("bash")
                .arg("-c")
                .arg(&cmd)
                .status();

            let duration = p_start.elapsed().as_secs_f64();

            match result {
                Ok(status) if status.success() => {
                    eprintln!("  ✅ Completed in {:.1}s", duration);
                    successes += 1;
                }
                Ok(status) => eprintln!("  ❌ Failed with exit code: {}", status),
                Err(e) => eprintln!("  ❌ Error executing profile: {}", e),
            }
        }
        eprintln!();
    }

    let total = start.elapsed().as_secs_f64();
    eprintln!("  ==================================================");
    eprintln!("  PIPELINE SUMMARY");
    eprintln!("  ==================================================");
    eprintln!("  Total duration: {:.1}s", total);
    eprintln!("  Success rate:   {:.0}%", (successes as f64 / PROFILES.len() as f64) * 100.0);
    eprintln!("  ==================================================");
}
