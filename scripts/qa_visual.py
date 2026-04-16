#!/usr/bin/env python3
"""Visual QA for Lupine site - check for CSS overlap patterns and layout issues."""
import urllib.request
import re
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

base = 'https://lupine-site-350452481649.us-central1.run.app'
pages = [
    ('/', 'Homepage'),
    ('/deck.html', 'Deck'),
    ('/one-pager.html', 'One Pager'),
    ('/pricing.html', 'Pricing'),
    ('/team.html', 'Team'),
    ('/contact.html', 'Contact'),
    ('/docs.html', 'Docs'),
    ('/glimPSE-demo.html', 'glimPSE Demo'),
    ('/investors.html', 'Investors'),
    ('/defense-aerospace.html', 'Defense'),
]

OVERLAP_PATTERNS = [
    (r'position:\s*absolute', 'absolute positioning (potential overlap)'),
    (r'position:\s*fixed', 'fixed positioning'),
    (r'margin-top:\s*-\d+', 'negative margin-top (overlap risk)'),
    (r'margin-left:\s*-\d+', 'negative margin-left'),
    (r'z-index:\s*-', 'negative z-index'),
    (r'overflow:\s*hidden', 'overflow hidden (content clip)'),
    (r'transform:\s*translate.*-\d+', 'negative transform translate'),
    (r'top:\s*-\d+', 'negative top offset'),
]

MISSING_RESPONSIVE = [
    (r'@media', 'has media queries'),
    (r'max-width', 'max-width constraints'),
    (r'min-width', 'min-width constraints'),
]

for path, name in pages:
    url = base + path
    try:
        r = urllib.request.urlopen(url)
        html = r.read().decode('utf-8', errors='replace')
    except Exception as e:
        print(f"[FAIL] {name} ({path}): {e}")
        continue

    print(f"\n{'='*60}")
    print(f"  {name} ({path})")
    print(f"{'='*60}")

    # Extract all inline styles and style blocks
    style_blocks = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL)
    inline_styles = re.findall(r'style="([^"]*)"', html)
    all_css = ' '.join(style_blocks + inline_styles)

    # Check for overlap-causing patterns
    issues = []
    for pattern, desc in OVERLAP_PATTERNS:
        matches = re.findall(pattern, all_css, re.IGNORECASE)
        if matches:
            issues.append(f"  - {desc}: {len(matches)} occurrences")

    # Check external link targets
    ext_links = re.findall(r'href="(https?://[^"]+)"', html)
    nav_links = re.findall(r'<nav.*?</nav>', html, re.DOTALL)
    footer_links = re.findall(r'<footer.*?</footer>', html, re.DOTALL)

    # Check for missing nav/footer consistency
    has_nav = bool(re.search(r'<nav', html))
    has_footer = bool(re.search(r'<footer', html))

    # Check for responsive meta
    has_viewport = bool(re.search(r'viewport', html))
    has_media_queries = bool(re.search(r'@media', all_css))

    # Large font overlap risk - check for multiple h1 or stacked headings
    h1_count = len(re.findall(r'<h1', html))
    stacked_headings = len(re.findall(r'</h[1-3]>\s*<h[1-3]', html))

    # Report
    if issues:
        print("  CSS Overlap Risks:")
        for i in issues:
            print(i)

    if h1_count > 1:
        print(f"  WARNING: Multiple h1 tags ({h1_count}) - potential heading stack")
    if stacked_headings:
        print(f"  WARNING: {stacked_headings} stacked headings (h1-h3 back-to-back)")
    if not has_nav:
        print(f"  MISSING: <nav> element")
    if not has_footer:
        print(f"  MISSING: <footer> element")
    if not has_viewport:
        print(f"  MISSING: viewport meta tag")
    if not has_media_queries:
        print(f"  MISSING: No @media queries (not responsive)")
    print(f"  External links: {len(ext_links)}")
    print(f"  Nav: {'YES' if has_nav else 'NO'} | Footer: {'YES' if has_footer else 'NO'}")

    # Special: Check for common visual bugs
    # Look for text in absolute positioned elements that may float over content
    abs_elements = re.findall(r'position:\s*absolute[^}]*', all_css)
    if len(abs_elements) > 5:
        print(f"  CAUTION: {len(abs_elements)} absolute-positioned elements (high overlap risk)")

    # Check for fixed-width elements on page
    fixed_widths = re.findall(r'width:\s*\d{4,}px', all_css)
    if fixed_widths:
        print(f"  CAUTION: Fixed-width elements > 999px: {fixed_widths}")

print("\n\nDone.")
