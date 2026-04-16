#!/usr/bin/env python3
"""Count and categorize dead links across all Lupine HTML pages."""
import os
import re
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

d = r'c:\Users\alexw\Downloads\shed\glim\lupine-site'
total = 0
page_counts = []

for f in sorted(os.listdir(d)):
    if not f.endswith('.html'):
        continue
    with open(os.path.join(d, f), encoding='utf-8') as fh:
        html = fh.read()

    count = html.count('href="#"')
    if count > 0:
        page_counts.append((f, count))
        total += count

        # Categorize the dead links
        nav_dead = len(re.findall(r'<nav.*?</nav>', html, re.DOTALL))
        footer_dead = len(re.findall(r'<footer.*?</footer>', html, re.DOTALL))

print("=== Dead Link Count (href='#') per page ===")
for f, c in page_counts:
    print(f"  {f}: {c}")
print(f"\nTotal dead links: {total}")
print(f"Pages with dead links: {len(page_counts)}")

# Now categorize: What are the nav link labels pointing to #?
print("\n=== Dead Nav/Footer Link Labels ===")
for f in sorted(os.listdir(d)):
    if not f.endswith('.html'):
        continue
    with open(os.path.join(d, f), encoding='utf-8') as fh:
        html = fh.read()

    dead = re.findall(r'href="#"[^>]*>([^<]+)<', html)
    if dead:
        unique = sorted(set(dead))
        print(f"  {f}: {', '.join(unique)}")
