import os
import re
import subprocess
import shutil

TEX_PATH = "../paper/immi-paper.tex"
BIB_PATH = "../paper/references.bib"
OUT_HTML = "index.html"
OUT_PDF = "../paper/immi-paper-local.pdf"

def parse_bib():
    refs = {}
    if not os.path.exists(BIB_PATH):
        return refs
    with open(BIB_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    entries = re.findall(r'@\w+\{(.+?),', content)
    for i, entry in enumerate(entries):
        refs[entry.strip()] = i + 1
    return refs

def convert_tex_to_html():
    with open(TEX_PATH, 'r', encoding='utf-8') as f:
        tex = f.read()

    # Basic cleanup
    tex = re.sub(r'%.*?$', '', tex, flags=re.MULTILINE) # Remove comments
    
    # Extract Title and Author
    title_match = re.search(r'\\title\{\\bfseries (.*?)\}', tex, re.DOTALL)
    title = title_match.group(1).strip() if title_match else "Paper Title"
    
    # Extract Abstract
    abstract_match = re.search(r'\\begin\{abstract\}(.*?)\\end\{abstract\}', tex, re.DOTALL)
    abstract = abstract_match.group(1).strip() if abstract_match else ""

    # Math replacements
    tex = tex.replace('$C_{11}$', '<i>C</i><sub>11</sub>')
    tex = tex.replace('$C_{12}$', '<i>C</i><sub>12</sub>')
    tex = tex.replace('$C_{44}$', '<i>C</i><sub>44</sub>')
    tex = tex.replace('$I^2$', '<i>I</i><sup>2</sup>')
    tex = tex.replace('$R^2$', '<i>R</i><sup>2</sup>')
    tex = tex.replace('$\\lambda_i$', '&lambda;<sub>i</sub>')
    tex = tex.replace('$\\tau$', '&tau;')
    tex = tex.replace('$\\tau^2$', '&tau;<sup>2</sup>')
    tex = tex.replace('$\\rho = 0$', '&rho; = 0')
    tex = tex.replace('$r$', '<i>r</i>')
    tex = tex.replace('$\\bar{r}_\\text{within}$', 'r&#772;<sub>within</sub>')
    tex = tex.replace('$r_\\text{pool}$', '<i>r</i><sub>pool</sub>')
    tex = tex.replace('$|r_\\text{pool} - \\bar{r}_\\text{within}| > 0.3$', '|<i>r</i><sub>pool</sub> - r&#772;<sub>within</sub>| > 0.3')
    tex = tex.replace('$\\geq 3$', '&ge; 3')
    tex = tex.replace('$\\approx$', '&approx;')
    tex = tex.replace('$\\gg$', '&#8811;')
    tex = re.sub(r'\$(.*?)\$', r'<i>\1</i>', tex) # Generic fallback for remaining inline math
    tex = tex.replace('\\{', '{').replace('\\}', '}')

    # Formatting
    tex = re.sub(r'\\textbf\{(.*?)\}', r'<strong>\1</strong>', tex, flags=re.DOTALL)
    tex = re.sub(r'\\textit\{(.*?)\}', r'<em>\1</em>', tex, flags=re.DOTALL)
    tex = re.sub(r'\\url\{(.*?)\}', r'<a href="\1">\1</a>', tex, flags=re.DOTALL)
    tex = re.sub(r'\\texttt\{(.*?)\}', r'<code>\1</code>', tex, flags=re.DOTALL)
    
    # Citations
    refs = parse_bib()
    def replace_cite(match):
        keys = match.group(1).split(',')
        nums = [str(refs.get(k.strip(), '?')) for k in keys]
        return f"[{','.join(nums)}]"
    tex = re.sub(r'\\cite\{(.*?)\}', replace_cite, tex)
    
    # Extract Main Content
    content_match = re.search(r'\\section\{Introduction\}(.*)\\bibliographystyle', tex, re.DOTALL)
    content = "\\section{Introduction}" + content_match.group(1) if content_match else ""

    # Sections
    content = re.sub(r'\\section\*?\{(.*?)\}', r'<h2>\1</h2>', content)
    content = re.sub(r'\\subsection\*?\{(.*?)\}', r'<h3>\1</h3>', content)

    # Lists
    def parse_lists(text):
        while '\\begin{itemize}' in text:
            start = text.find('\\begin{itemize}')
            end = text.find('\\end{itemize}', start) + len('\\end{itemize}')
            block = text[start:end]
            items = re.findall(r'\\item (.*?)(?=\\item|\\end\{itemize\})', block, re.DOTALL)
            html_list = "<ul>\n" + "\n".join([f"<li>{i.strip()}</li>" for i in items]) + "\n</ul>"
            text = text[:start] + html_list + text[end:]
        return text
    content = parse_lists(content)

    # Equations (block)
    def parse_equations(text):
        return re.sub(r'\\begin\{equation\}(.*?)\\end\{equation\}', r'<div class="equation">\1</div>', text, flags=re.DOTALL)
    content = parse_equations(content)

    # Figures
    def parse_figures(text):
        def repl(m):
            fig_text = m.group(1)
            img_match = re.search(r'\\includegraphics.*?\{(.*?)\}', fig_text)
            cap_match = re.search(r'\\caption\{(.*?)\}', fig_text, re.DOTALL)
            img = img_match.group(1).replace('.pdf', '.png') if img_match else ""
            img_path = f"../paper/{img}"
            cap = cap_match.group(1).strip() if cap_match else ""
            return f'<div class="figure"><img src="{img_path}"><div class="caption">{cap}</div></div>'
        return re.sub(r'\\begin\{figure.*?\}(.*?)\\end\{figure.*?\}', repl, text, flags=re.DOTALL)
    content = parse_figures(content)

    # Tables - Hardcoded for simplicity based on the two tables
    table1 = """
    <div class="table-container">
    <div class="caption">Table 1: Hyper-ribbon classification for representative multi-element potentials.</div>
    <table>
        <tr><th>Potential</th><th>n</th><th>PR</th><th>PR 95% CI</th><th>R²</th><th>τ</th><th>Ribbon?</th></tr>
        <tr><td>Mahata-2022</td><td>3</td><td>1.05</td><td>[1.00, 1.92]</td><td>0.995</td><td>-1.000</td><td>Yes</td></tr>
        <tr><td>Etesami-2018</td><td>4</td><td>1.11</td><td>[1.02, 1.95]</td><td>0.873</td><td>-1.000</td><td>Yes</td></tr>
        <tr><td>Bonny-2013</td><td>5</td><td>1.20</td><td>[1.01, 2.04]</td><td>0.969</td><td>-1.000</td><td>Yes</td></tr>
        <tr><td>Bonny-2009</td><td>3</td><td>1.64</td><td>[1.00, 1.78]</td><td>0.854</td><td>-1.000</td><td>Yes</td></tr>
        <tr><td>Zhou-2004</td><td>12</td><td>1.86</td><td>[1.01, 1.98]</td><td>0.824</td><td>-1.000</td><td>Yes</td></tr>
    </table>
    </div>
    """
    table2 = """
    <div class="table-container">
    <div class="caption">Table 2: Meta-analysis results: fixed vs. random effects (15 elements, N = 1,677).</div>
    <table>
        <tr><th>Model</th><th>r_pool</th><th>95% CI</th><th>Q</th><th>I²</th><th>τ</th></tr>
        <tr><td>Fixed</td><td>+0.60</td><td>[0.57, 0.63]</td><td>945</td><td>98.5%</td><td>0.00</td></tr>
        <tr><td>Random</td><td>+0.69</td><td>[0.41, 0.85]</td><td>984</td><td>98.6%</td><td>0.80</td></tr>
    </table>
    </div>
    """
    content = re.sub(r'\\begin\{table\}.*?\\end\{table\}', table1, content, count=1, flags=re.DOTALL)
    content = re.sub(r'\\begin\{table\}.*?\\end\{table\}', table2, content, count=1, flags=re.DOTALL)

    # Paragraphs
    blocks = content.split('\n\n')
    formatted_blocks = []
    for b in blocks:
        b = b.strip()
        if not b or b.startswith('<h') or b.startswith('<ul') or b.startswith('<div') or b.startswith('\\'):
            formatted_blocks.append(b)
        else:
            formatted_blocks.append(f'<p>{b}</p>')
    content = '\n'.join(formatted_blocks)

    # References section
    ref_html = "<h2>References</h2><ol>"
    for r in refs.keys():
        ref_html += f"<li>{r}</li>"
    ref_html += "</ol>"
    content += ref_html

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,700;1,300&display=swap');
    
    :root {{
        --bg: #ffffff;
        --fg: #111827;
        --accent: #2563eb;
        --border: #e5e7eb;
    }}
    
    body {{
        font-family: 'Merriweather', serif;
        line-height: 1.6;
        color: var(--fg);
        background: var(--bg);
        margin: 0;
        padding: 0;
    }}
    
    .page {{
        max-width: 900px;
        margin: 0 auto;
        padding: 40px;
        background: white;
    }}

    header {{
        text-align: center;
        margin-bottom: 40px;
        font-family: 'Inter', sans-serif;
    }}

    h1 {{
        font-size: 2.5rem;
        font-weight: 800;
        line-height: 1.2;
        margin-bottom: 20px;
    }}

    .authors {{
        font-size: 1.1rem;
        color: #4b5563;
    }}

    .abstract {{
        font-family: 'Inter', sans-serif;
        background: #f9fafb;
        padding: 24px;
        border-radius: 8px;
        border-left: 4px solid var(--accent);
        margin-bottom: 40px;
        font-size: 0.95rem;
    }}

    .content {{
        column-count: 2;
        column-gap: 40px;
        text-align: justify;
        font-size: 0.9rem;
    }}

    h2, h3 {{
        font-family: 'Inter', sans-serif;
        break-after: avoid;
        column-break-after: avoid;
        margin-top: 2em;
    }}

    h2 {{ font-size: 1.4rem; border-bottom: 1px solid var(--border); padding-bottom: 8px; }}
    h3 {{ font-size: 1.1rem; }}

    p {{
        margin-bottom: 1em;
        text-indent: 1.5em;
    }}
    
    p:first-of-type {{
        text-indent: 0;
    }}

    .figure, .table-container {{
        break-inside: avoid;
        margin: 24px 0;
        width: 100%;
    }}

    img {{
        width: 100%;
        height: auto;
        border-radius: 4px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }}

    .caption {{
        font-family: 'Inter', sans-serif;
        font-size: 0.8rem;
        color: #6b7280;
        margin-top: 8px;
        text-align: center;
        line-height: 1.4;
    }}

    table {{
        width: 100%;
        border-collapse: collapse;
        font-family: 'Inter', sans-serif;
        font-size: 0.8rem;
    }}

    th, td {{
        border-bottom: 1px solid var(--border);
        padding: 8px 4px;
        text-align: center;
    }}

    th {{ font-weight: 600; border-bottom: 2px solid var(--fg); border-top: 2px solid var(--fg); }}
    
    .equation {{
        text-align: center;
        font-style: italic;
        margin: 16px 0;
        font-family: 'Times New Roman', serif;
    }}

    ul {{
        padding-left: 20px;
        margin-bottom: 16px;
    }}
    
    li {{ margin-bottom: 8px; }}
    
    code {{
        font-family: monospace;
        background: #f1f5f9;
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 0.85em;
    }}

    @media print {{
        .page {{ max-width: 100%; padding: 0; }}
        body {{ font-size: 10pt; }}
        @page {{ size: letter; margin: 2cm; }}
    }}
</style>
</head>
<body>
<div class="page">
    <header>
        <h1>{title}</h1>
        <div class="authors">
            Alexander Welcing<br>
            Lupine Materials Science, Seattle, WA, USA<br>
            alex@lupine.io
        </div>
    </header>
    
    <div class="abstract">
        {abstract}
    </div>

    <div class="content">
        {content}
    </div>
</div>
</body>
</html>
"""
    with open(OUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Generated {OUT_HTML}")

def print_pdf():
    html_path = os.path.abspath(OUT_HTML)
    out_path = os.path.abspath(OUT_PDF)
    
    # Try Edge
    try:
        edge_cmd = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        if not os.path.exists(edge_cmd):
            # Try Chrome
            edge_cmd = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        
        if os.path.exists(edge_cmd):
            print(f"Printing to PDF using {edge_cmd}...")
            cmd = [edge_cmd, "--headless", "--disable-gpu", f"--print-to-pdf={out_path}", f"file:///{html_path}"]
            subprocess.run(cmd, check=True)
            print(f"Generated PDF at {out_path}")
        else:
            print("No Chromium browser found. Open index.html in your browser and print to PDF manually.")
    except Exception as e:
        print(f"Failed to generate PDF automatically: {e}")

if __name__ == "__main__":
    convert_tex_to_html()
    print_pdf()
