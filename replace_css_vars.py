import os
import re

mapping = {
    r'var\(--slate-9[0-9]0\)': 'var(--surface-container-lowest)',
    r'var\(--slate-800\)': 'var(--surface-container-low)',
    r'var\(--slate-700\)': 'var(--surface-container-high)',
    r'var\(--slate-600\)': 'var(--surface-bright)',
    r'var\(--slate-500\)': 'var(--on-surface-variant)',
    r'var\(--slate-400\)': 'var(--on-surface-variant)',
    r'var\(--slate-300\)': 'var(--on-surface)',
    r'var\(--slate-200\)': 'var(--on-surface)',
    r'var\(--slate-100\)': '#ffffff',
    r'var\(--lupine-[1-4]00\)': 'var(--primary)',
    r'var\(--lupine-[5-9]00\)': 'var(--primary-container)',
    r'var\(--accent-cyan\)': 'var(--secondary)',
    r'var\(--accent-gold\)': 'var(--warning)',
    r'var\(--accent-green\)': 'var(--secondary)',
    r'var\(--accent-red\)': 'var(--error)'
}

src_dir = r"c:\Users\alexw\Downloads\shed\glim\lupine-site\src"

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.astro') or file.endswith('.css'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for k, v in mapping.items():
                new_content = re.sub(k, v, new_content)
                
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file}")
