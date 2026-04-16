import os
import re

site_dir = r"C:\Users\alexw\Downloads\shed\glim\lupine-site"

html_files = [f for f in os.listdir(site_dir) if f.endswith(".html")]

dist_dir = os.path.join(site_dir, "dist")
if os.path.exists(dist_dir):
    dist_html_files = [os.path.join("dist", f) for f in os.listdir(dist_dir) if f.endswith(".html")]
    html_files.extend(dist_html_files)

files_to_check = {
    "glimPSE-demo.html": ["Launch Demo", "Launch Live Demo", "Watch 90-Second Tour"],
    "research-manifesto.html": ["Access Node", "Initialize Protocol", "View Raw Data", "Theory", "Protocols", "Archive"],
    "ml-potentials-guide.html": ["Execute Protocol", "INITIATE SIMULATION", "VIEW ARCHITECTURES", "INITIALIZE PROTOCOL"],
    "platform-architecture.html": ["Access Terminal"],
    "investors.html": ["Access Portal", "Request Diligence", "View Roadmap", "Thesis", "Opportunity", "Roadmap", "Team"],
    "team.html": ["Investor Login", "Careers"]
}

for f in html_files:
    basename = os.path.basename(f)
    if basename in files_to_check:
        filepath = os.path.join(site_dir, f)
        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()
        
        items = files_to_check[basename]
        
        def replacer(m):
            tag_start = m.group(1)
            inner = m.group(2)
            tag_end = m.group(3)
            
            # Check if inner html contains any of the items
            matched_item = False
            for item in items:
                # We need case insensitive match or we just match substrings
                if re.search(r'\b' + re.escape(item) + r'\b', inner, re.IGNORECASE):
                    matched_item = True
                    break
            
            if not matched_item:
                return m.group(0)
                
            if "onclick=" in tag_start:
                return m.group(0)
            
            # modify tag
            if tag_start.lower().startswith("<a"):
                # replace href
                tag_start = re.sub(r'(?i)\bhref="[^"]*"', 'href="javascript:void(0);"', tag_start)
            
            tag_start = tag_start[:-1] + ' onclick="alert(\'Feature Coming Soon\')">'
                
            return f"{tag_start}{inner}{tag_end}"
            
        pattern = re.compile(r'(?si)(<(?:button|a)\b[^>]*?>)(.*?)(</(?:button|a)>)')
        content = pattern.sub(replacer, content)
            
        with open(filepath, "w", encoding="utf-8") as file:
            file.write(content)

print("Site fixed fully!")
