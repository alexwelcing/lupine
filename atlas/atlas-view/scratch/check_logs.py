import os
import json

log_path = r"C:\Users\alexw\.gemini\antigravity\brain\616fe5ac-2ea2-47aa-a0e1-248d5dc8d6af\.system_generated\logs\transcript.jsonl"

if os.path.exists(log_path):
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                step_idx = data.get("step_index")
                if data.get("type") == "VIEW_FILE" and data.get("status") == "DONE":
                    content = data.get("content", "")
                    if "mcpViewerBridge.tsx" in content:
                        print(f"Step {step_idx}: VIEW_FILE has mcpViewerBridge.tsx! Size: {len(content)} chars.")
                        # Check first lines of output
                        header_line = [l for l in content.splitlines() if "Showing lines" in l]
                        print(f"  Header: {header_line}")
            except Exception as e:
                pass
