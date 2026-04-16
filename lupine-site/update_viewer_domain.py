import os
import re

site_dir = r"C:\Users\alexw\Downloads\shed\glim\lupine-site"

html_files = [f for f in os.listdir(site_dir) if f.endswith(".html")]

dist_dir = os.path.join(site_dir, "dist")
if os.path.exists(dist_dir):
    dist_html_files = [os.path.join("dist", f) for f in os.listdir(dist_dir) if f.endswith(".html")]
    html_files.extend(dist_html_files)

# Update buttons specifically in glimPSE-demo.html
viewer_buttons = ["Launch Demo", "Launch Live Demo", "Try glimPSE Free"]

for f in html_files:
    filepath = os.path.join(site_dir, f)
    with open(filepath, "r", encoding="utf-8") as file:
        content = file.read()
    
    modified = False
    
    # 1. Look for buttons containing the text
    def button_replacer(m):
        tag_start = m.group(1)
        inner = m.group(2)
        tag_end = m.group(3)
        
        matched_item = False
        for item in viewer_buttons:
            if re.search(r'\b' + re.escape(item) + r'\b', inner, re.IGNORECASE):
                matched_item = True
                break
        
        if not matched_item:
            return m.group(0)
            
        # replace the onclick='alert(...)' with window.location or if it's an 'a', change href
        if 'onclick="alert(\'Feature Coming Soon\')"' in tag_start:
            tag_start = tag_start.replace('onclick="alert(\'Feature Coming Soon\')"', 'onclick="window.open(\'https://lupinematerials.science\', \'_blank\')"')
        elif "onclick=" not in tag_start and not tag_start.lower().startswith("<a"):
            tag_start = tag_start[:-1] + ' onclick="window.open(\'https://lupinematerials.science\', \'_blank\')">'
        elif tag_start.lower().startswith("<a"):
            tag_start = re.sub(r'(?i)href="[^"]*"', 'href="https://lupinematerials.science" target="_blank"', tag_start)
            
        return f"{tag_start}{inner}{tag_end}"

    pattern = re.compile(r'(?si)(<(?:button|a)\b[^>]*?>)(.*?)(</(?:button|a)>)')
    new_content = pattern.sub(button_replacer, content)
    
    # 2. Add an explicit "Launch Viewer" button in the hero of glimPSE-demo if missing? Let's just rely on the existing buttons.
    
    if new_content != content:
        modified = True
        content = new_content
        
    if modified:
        with open(filepath, "w", encoding="utf-8") as file:
            file.write(content)

print("Viewer links mapped to https://lupinematerials.science")
