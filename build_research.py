import os
import glob
import markdown
import re

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: Georgia, 'Times New Roman', serif; background: #fafafa; color: #1a1a1a; line-height: 1.9; font-size: 17px; }}
        .container {{ max-width: 800px; margin: 0 auto; padding: 80px 40px; }}
        header {{ text-align: left; margin-bottom: 50px; padding-top: 20px; border-bottom: 1px solid #000; padding-bottom: 40px; }}
        .symbol {{ font-size: 24px; margin-bottom: 20px; color: #333; letter-spacing: 0.5em; }}
        h1 {{ font-size: 32px; font-weight: 400; letter-spacing: 0.05em; color: #000; margin-bottom: 16px; line-height: 1.3; }}
        h2 {{ font-size: 22px; font-weight: 400; letter-spacing: 0.05em; color: #222; margin-top: 60px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e0e0e0; }}
        h3 {{ font-size: 18px; font-weight: 400; letter-spacing: 0.05em; color: #333; margin-top: 40px; margin-bottom: 15px; }}
        h4 {{ font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #555; margin-top: 30px; margin-bottom: 10px; }}
        p {{ margin-bottom: 24px; text-align: left; }}
        a {{ color: #000; text-decoration: underline; text-underline-offset: 4px; }}
        a:hover {{ color: #555; }}
        ul, ol {{ margin-bottom: 24px; padding-left: 20px; }}
        li {{ margin-bottom: 12px; }}
        code {{ font-family: monospace; background: #eee; padding: 2px 6px; font-size: 14px; border-radius: 3px; }}
        pre {{ background: #111; color: #ccc; padding: 24px; overflow-x: auto; margin-bottom: 30px; font-size: 13px; border-radius: 4px; font-family: monospace; }}
        pre code {{ background: none; padding: 0; color: inherit; border-radius: 0; }}
        blockquote {{ border-left: 3px solid #000; padding: 20px 30px; margin: 40px 0; background: #f5f5f5; font-style: italic; color: #444; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }}
        th, td {{ border: 1px solid #ddd; padding: 16px; text-align: left; }}
        th {{ background: #eaeaea; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }}
        .nav-link {{ display: inline-block; margin-bottom: 40px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; text-decoration: none; border-bottom: 1px solid #000; padding-bottom: 4px; transition: all 0.2s; }}
        .nav-link:hover {{ opacity: 0.6; }}
        .content {{ padding-bottom: 100px; }}
        
        .index-list {{ list-style: none; padding: 0; }}
        .index-list li {{ padding: 20px 0; border-bottom: 1px solid #eee; margin: 0; }}
        .index-list a {{ text-decoration: none; font-size: 18px; display: block; margin-bottom: 8px; }}
        .index-list a:hover {{ text-decoration: underline; }}
        .meta {{ font-size: 13px; color: #777; font-family: monospace; letter-spacing: 0.05em; }}
        
        hr {{ border: 0; border-top: 1px solid #ddd; margin: 60px 0; }}
    </style>
</head>
<body>
    <div class="container">
        {nav}
        <header>
            <div class="symbol">———</div>
            <h1>{title}</h1>
        </header>
        <div class="content">
            {content}
        </div>
    </div>
</body>
</html>
"""

OUTPUT_DIR = "c:\\Users\\alexw\\Downloads\\shed\\glim\\atlas\\deploy_bundle\\public\\research"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# Find all markdown files in root, docs, and atlas
directories = ['.', 'docs', 'atlas']
md_files = []

for d in directories:
    for f in glob.glob(os.path.join(d, "*.md")):
        if "node_modules" not in f and "deploy_bundle" not in f and "target" not in f:
            md_files.append(f)

index_items = []

for file_path in md_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract title - try to find first H1 or use filename
    title_match = re.search(r'^#\s+(.*?)$', content, re.MULTILINE)
    if title_match:
        title = title_match.group(1).strip()
    else:
        title = os.path.basename(file_path).replace('.md', '').replace('-', ' ').title()

    # Convert to HTML via Markdown
    # We use tables and fended_code extensions
    html_content = markdown.markdown(content, extensions=['tables', 'fenced_code'])
    
    # Fix internal markdown links to point to .html, and flatten paths automatically
    html_content = re.sub(r'href="([^"]+)\.md"', lambda m: 'href="' + os.path.basename(m.group(1)) + '.html"', html_content)
    
    # Render final page
    nav = '<a href="/research/" class="nav-link">← Research Index</a>'
    if "research-index.md" in file_path:
        nav = '<a href="/" class="nav-link">← Manifesto Root</a>'
        title = "glim Research Index"

    full_html = TEMPLATE.format(title=title, nav=nav, content=html_content)

    # Save to output dir
    base_name = os.path.basename(file_path).replace('.md', '.html')
    out_path = os.path.join(OUTPUT_DIR, base_name)
    
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(full_html)
        
    size_kb = os.path.getsize(file_path) / 1024
    folder_tag = os.path.dirname(file_path)
    if folder_tag == '.': folder_tag = 'root'
    
    # If the file is the index itself, we can skip adding it to the automatic list, 
    # but we DO want to list it or rename it!
    if base_name == "research-index.html":
        # we'll copy it to index.html at the end so it serves as the root
        pass
    else:
        index_items.append(f'<li><a href="{base_name}">{title}</a><div class="meta">{folder_tag}/{os.path.basename(file_path)} | {size_kb:.1f} KB</div></li>')

# If research-index.html exists, rename/copy to index.html
res_idx_path = os.path.join(OUTPUT_DIR, 'research-index.html')
if os.path.exists(res_idx_path):
    with open(res_idx_path, 'r', encoding='utf-8') as f:
        idx_content = f.read()
    with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(idx_content)
else:
    # Fallback to automatic index
    index_html = "<ul class='index-list'>\n" + "\n".join(index_items) + "</ul>"
    full_idx = TEMPLATE.format(title="Research & Project Documents", nav='<a href="/" class="nav-link">← Manifesto Root</a>', content=index_html)
    with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(full_idx)
        
print("Generated", len(md_files), "research documents.")
