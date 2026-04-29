import os
import re

directories_to_scan = [
    r"c:\Users\alexw\Downloads\shed\glim\lupine-site",
    r"c:\Users\alexw\Downloads\shed\glim\atlas",
    r"c:\Users\alexw\Downloads\shed\glim\docs",
    r"c:\Users\alexw\Downloads\shed\glim\lean-spec",
]

def process_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        return False
        
    new_content = re.sub(r'manifesto', 'vision', content)
    new_content = re.sub(r'Manifesto', 'Vision', new_content)
    new_content = re.sub(r'MANIFESTO', 'VISION', new_content)
    
    if content != new_content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        return True
    return False

def main():
    modified_count = 0
    for d in directories_to_scan:
        for root, dirs, files in os.walk(d):
            # Skip node_modules or .git
            if "node_modules" in root or ".git" in root or "renders" in root:
                continue
            for f in files:
                filepath = os.path.join(root, f)
                if filepath.endswith((".html", ".md", ".lean", ".ts", ".js", ".css", ".rs", ".json")):
                    if process_file(filepath):
                        print(f"Modified content in {filepath}")
                        modified_count += 1
                        
    print(f"Total files modified: {modified_count}")

if __name__ == "__main__":
    main()
