#!/usr/bin/env python3
"""
Lupine Site QA Fix Script
Fixes dead links (href="#") across all HTML pages by replacing them with actual page URLs.
Also fixes text overlap issues in Stitch-generated pages by injecting responsive CSS.
"""
import os
import re
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

SITE_DIR = r'c:\Users\alexw\Downloads\shed\glim\lupine-site'

# ─── Link Mapping: label text -> target URL ───
LINK_MAP = {
    # Nav links
    'research': 'research-manifesto.html',
    'platform': 'platform-architecture.html',
    'documentation': 'docs.html',
    'materials': 'research-manifesto.html',
    'investors': 'investors.html',
    'team': 'team.html',
    'careers': 'team.html',
    'pricing': 'pricing.html',
    'contact': 'contact.html',
    'science': 'research-manifesto.html',
    'theory': 'research-manifesto.html',
    'protocols': 'research-manifesto.html',
    'archive': 'research-manifesto.html',
    'technology': 'platform-architecture.html',
    'architecture': 'platform-architecture.html',
    'benchmarks': 'platform-architecture.html',
    'safety': 'platform-architecture.html',
    'defense': 'defense-aerospace.html',
    'infrastructure': 'platform-architecture.html',
    'simulation': 'platform-architecture.html',
    'opportunity': 'investors.html',
    'thesis': 'investors.html',
    'roadmap': 'investors.html',
    'market': 'investors.html',
    'intelligence': 'research-manifesto.html',
    'network': 'contact.html',
    'portfolio': 'investors.html',
    'solutions': 'platform-architecture.html',
    'pipeline': 'platform-architecture.html',

    # Footer links
    'privacy': 'index.html',
    'privacy policy': 'index.html',
    'terms of service': 'index.html',
    'security': 'platform-architecture.html',
    'security architecture': 'platform-architecture.html',
    'security protocol': 'platform-architecture.html',
    'investor relations': 'investors.html',
    'api status': 'docs.html',
    'api': 'docs.html',
    'api documentation': 'docs.html',
    'technical whitepaper': 'docs.html',
    'whitepapers': 'docs.html',
    'whitepaper': 'docs.html',
    'research nodes': 'platform-architecture.html',
    'ethics framework': 'research-manifesto.html',
    'ethics ai': 'research-manifesto.html',
    'open access': 'research-manifesto.html',
    'raw data': 'docs.html',
    'node status': 'platform-architecture.html',
    'terms': 'index.html',
    'legal': 'index.html',
    'compliance': 'platform-architecture.html',
    'itar compliance': 'defense-aerospace.html',
    'global support': 'contact.html',
    'sec filings': 'investors.html',
    'discord': 'contact.html',
    'github': 'docs.html',
    'arxiv': 'research-manifesto.html',

    # Stitch page-specific
    'conductivity': 'case-study-batteries.html',
    'morphology': 'case-study-batteries.html',
    'synthesis': 'case-study-batteries.html',
    'safety protocols': 'platform-architecture.html',
    'contact scientist': 'contact.html',
    'ip portfolio': 'investors.html',
    'investment': 'investors.html',
    'peer review': 'research-manifesto.html',
    'material specs': 'docs.html',
    'hardware specs': 'platform-architecture.html',
    'compute allocation': 'gpu-compute.html',
    'ml architectures': 'ml-potentials-guide.html',
    'open source potentials': 'ml-potentials-guide.html',
    'contact director': 'contact.html',
    'briefing': 'defense-aerospace.html',
    'clearance level iv': 'defense-aerospace.html',
    'deep tech repository': 'docs.html',
    'secure node': 'platform-architecture.html',

    # Region labels in gpu-compute
    'north america-01': 'gpu-compute.html',
    'europe-west-04': 'gpu-compute.html',
    'asia-pacific-09': 'gpu-compute.html',

    # Index page specific
    'try lupine view': 'glimPSE-demo.html',
    'log in': 'contact.html',

    # lupine.science links
    'lupine.science': 'index.html',
}

def normalize_label(text):
    """Normalize a link label for matching."""
    return text.strip().lower().replace('&amp;', '&').replace('\n', '').replace('\r', '')

def fix_dead_links(html, filename):
    """Replace href="#" links with correct targets based on link text."""
    fixed = 0
    
    def replacer(match):
        nonlocal fixed
        full = match.group(0)
        label_match = re.search(r'>([^<]+)<', full)
        if not label_match:
            return full
        
        label = normalize_label(label_match.group(1))
        if not label:
            return full
        
        target = LINK_MAP.get(label)
        if target:
            fixed += 1
            return full.replace('href="#"', f'href="{target}"')
        else:
            # Try partial matching
            for key, val in LINK_MAP.items():
                if key in label or label in key:
                    fixed += 1
                    return full.replace('href="#"', f'href="{val}"')
            return full
    
    # Match anchor tags with href="#"
    result = re.sub(r'<a[^>]*href="#"[^>]*>[^<]*<', replacer, html)
    
    # Also handle multi-line anchor content (like "View Full API Docs")
    def multi_replacer(match):
        nonlocal fixed
        full = match.group(0)
        # Extract all text content
        text_parts = re.findall(r'>([^<]+)<', full)
        label = normalize_label(' '.join(text_parts))
        if not label:
            return full
        
        for key, val in LINK_MAP.items():
            if key in label:
                fixed += 1
                return full.replace('href="#"', f'href="{val}"')
        return full
    
    result = re.sub(r'<a[^>]*href="#"[^>]*>.*?</a>', multi_replacer, result, flags=re.DOTALL)
    
    return result, fixed

# ─── Responsive CSS injection for Stitch pages ───
RESPONSIVE_CSS = """
<style>
/* QA Fix: Responsive overrides for Stitch-generated pages */
@media (max-width: 768px) {
  .grid-cols-3, [class*="grid-cols-3"] { grid-template-columns: 1fr !important; }
  .grid-cols-2, [class*="grid-cols-2"] { grid-template-columns: 1fr !important; }
  .text-8xl, .text-7xl, .text-6xl { font-size: 2.5rem !important; line-height: 1.2 !important; }
  .text-5xl { font-size: 2rem !important; }
  .text-4xl { font-size: 1.75rem !important; }
  .px-8 { padding-left: 1rem !important; padding-right: 1rem !important; }
  .p-16, .p-24 { padding: 2rem !important; }
  .md\\:p-24 { padding: 2rem !important; }
  .gap-8, .gap-12 { gap: 1.5rem !important; }
  .hidden.md\\:flex { display: none !important; }
  table { font-size: 12px !important; }
  table td, table th { padding: 8px !important; }
}
@media (max-width: 480px) {
  .text-6xl, .text-5xl { font-size: 1.8rem !important; line-height: 1.2 !important; }
  .text-4xl { font-size: 1.5rem !important; }
  .text-3xl { font-size: 1.25rem !important; }
}
</style>
"""

# Pages that came from Stitch and need responsive CSS
STITCH_PAGES = [
    'pricing.html', 'team.html', 'contact.html', 'docs.html',
    'glimPSE-demo.html', 'defense-aerospace.html', 'investors.html',
    'gpu-compute.html', 'case-study-batteries.html', 'case-study-superalloys.html',
    'ml-potentials-guide.html', 'platform-architecture.html',
    'research-manifesto.html', 'rust-in-science.html', 'sovereignty-materials.html',
]

total_fixed = 0
total_responsive = 0

for f in sorted(os.listdir(SITE_DIR)):
    if not f.endswith('.html'):
        continue

    filepath = os.path.join(SITE_DIR, f)
    with open(filepath, 'r', encoding='utf-8') as fh:
        html = fh.read()

    # Fix dead links
    html, count = fix_dead_links(html, f)
    total_fixed += count

    # Inject responsive CSS for Stitch pages that lack @media queries
    needs_responsive = f in STITCH_PAGES and '@media' not in html
    if needs_responsive:
        html = html.replace('</head>', RESPONSIVE_CSS + '</head>')
        total_responsive += 1

    with open(filepath, 'w', encoding='utf-8') as fh:
        fh.write(html)

    status = []
    if count > 0:
        status.append(f"{count} links fixed")
    if needs_responsive:
        status.append("responsive CSS added")
    if status:
        print(f"  {f}: {', '.join(status)}")

print(f"\n=== Summary ===")
print(f"  Total dead links fixed: {total_fixed}")
print(f"  Pages given responsive CSS: {total_responsive}")
print(f"  Done!")
