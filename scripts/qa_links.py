#!/usr/bin/env python3
"""QA link checker for the deployed Lupine site."""
import urllib.request
import re
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

base = 'https://lupine-site-350452481649.us-central1.run.app'
pages = [
    '/', '/deck.html', '/one-pager.html', '/pricing.html', '/team.html',
    '/contact.html', '/docs.html', '/glimPSE-demo.html', '/investors.html',
    '/platform-architecture.html', '/research-manifesto.html', '/gpu-compute.html',
    '/sovereignty-materials.html', '/case-study-batteries.html',
    '/case-study-superalloys.html', '/ml-potentials-guide.html',
    '/rust-in-science.html', '/defense-aerospace.html', '/lammps-visualizer.html',
]

all_links = set()
dead = []

for p in pages:
    url = base + p
    try:
        r = urllib.request.urlopen(url)
        html = r.read().decode('utf-8', errors='replace')
        links = re.findall(r'href=["\']([^"\']+)["\']', html)
        for lnk in links:
            if lnk.startswith('#') or lnk.startswith('mailto:') or lnk.startswith('javascript:'):
                continue
            if lnk.startswith('http'):
                all_links.add(('ext', lnk, p))
            elif lnk.startswith('/') or lnk.endswith('.html'):
                all_links.add(('int', lnk, p))
        print(f'OK: {p} ({len(links)} links found)')
    except Exception as e:
        print(f'FAIL: {p} -> {e}')

# Check internal links
print('\n=== Checking Internal Links ===')
checked = set()
for kind, link, source in sorted(all_links):
    if kind != 'int':
        continue
    full = base + (link if link.startswith('/') else '/' + link)
    if full in checked:
        continue
    checked.add(full)
    try:
        r = urllib.request.urlopen(full)
        status = r.getcode()
        if status != 200:
            print(f'  ISSUE [{status}]: {link} (from {source})')
            dead.append((link, source, status))
        else:
            print(f'  OK: {link}')
    except urllib.error.HTTPError as e:
        print(f'  DEAD [{e.code}]: {link} (from {source})')
        dead.append((link, source, e.code))
    except Exception as e:
        print(f'  ERROR: {link} (from {source}) -> {e}')
        dead.append((link, source, str(e)))

print(f'\n=== Summary: {len(dead)} dead internal links ===')
for d in dead:
    print(f'  {d[0]} (from {d[1]}) -> {d[2]}')
