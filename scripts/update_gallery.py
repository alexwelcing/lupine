import re
import json
import os

# Load the dynamic JSON data
json_path = 'atlas/atlas-view/packages/ui/src/gallery-data.json'
with open(json_path, 'r', encoding='utf-8') as f:
    gallery_data = json.load(f)

# Filter out the 12 featured items precisely in order if possible, or just grab featured.
featured_items = [item for item in gallery_data if item.get('featured', False)]

# Map domain to specific tailwind color tokens matching the "Field Studies" aesthetic 
# or original marketing design.
domain_colors = {
    'Metals & Alloys': 'secondary',
    'Ceramics & Oxides': 'primary',
    'Polymers & Soft Matter': '[#ffe66d]',
    'Nanomaterials': 'tertiary-fixed-dim',
    'Biomolecules': '[#8fd785]',
    'Energy Materials': '[#7fd8be]',
    'Defects & Mechanics': 'tertiary',
    'Methods': '[#c7ceea]',
}

# The header of the showcase
replacement = '''<!-- Premium Authenticated Physics Data Library -->
<section class="py-32 px-8 md:px-20 bg-surface relative">
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-surface to-surface opacity-50 pointer-events-none"></div>
    
    <div class="relative mb-20 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-surface-container-highest pb-8 gap-8">
        <div>
            <span class="font-mono text-sm text-secondary tracking-[0.3em] uppercase block mb-4 flex items-center gap-3">
                <span class="w-8 h-[2px] bg-secondary"></span> Reference Archives
            </span>
            <h2 class="text-5xl md:text-6xl font-headline mb-4"><span class="italic font-newsreader">Authenticated</span> Topologies.</h2>
            <p class="text-on-surface-variant font-body text-lg max-w-2xl leading-relaxed">
                Directly access our curated library of high-fidelity atomic geometries. Every structure is rigorously verified against standard crystallographic parameterizations or generated via state-of-the-art exact spacegroup derivations. 
            </p>
        </div>
        <div class="flex items-center gap-3 bg-surface-container-low px-6 py-3 rounded-full border border-secondary/20 shadow-[0_0_20px_rgba(124,246,236,0.1)]">
            <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span class="relative inline-flex rounded-full h-full w-full bg-secondary"></span>
            </span>
            <span class="font-mono text-xs uppercase tracking-widest text-secondary font-bold">''' + str(len(gallery_data)) + ''' Assets Verified</span>
        </div>
    </div>

    <!-- 12-Item Showcase Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">'''

# Generate each card dynamically
for idx, item in enumerate(featured_items):
    # Some hardcoded iconic mapping could be done, or we just cycle through materials symbols
    icons = ['hexagon', 'polyline', 'broken_image', 'diamond', 'architecture', 'hive', 'blur_on', 'biotech', 'layers', 'all_inclusive', 'grain', 'gesture']
    icon = icons[idx % len(icons)]

    # Fetch mapped color token or fallback
    c = domain_colors.get(item['domain'], 'secondary')
    
    ext = 'lammpstrj' if 'lammpstrj' in item['file'] else 'xyz'
    
    # We construct the link path to invoke the molecular viewer
    # During dev this could be localhost, but we'll use a relative path that assumes the viewer is hosted
    viewer_base = "https://view.lupinematerials.science/?load=/"
    link = f"{viewer_base}{item['file']}"
    
    # Extract extension
    
    card = f'''
        <!-- Item -->
        <a href="{link}" class="group flex flex-col bg-surface-container-lowest p-8 rounded-2xl border border-white/5 hover:border-{c}/50 hover:bg-surface-container-low hover:-translate-y-1 transition-all duration-300">
            <div class="w-12 h-12 rounded-full bg-{c}/10 flex items-center justify-center mb-8 border border-{c}/20">
                <span class="material-symbols-outlined text-{c} text-2xl">{icon}</span>
            </div>
            <h4 class="text-2xl font-headline text-on-surface mb-2">{item["title"]}</h4>
            <p class="text-{c}/80 font-mono text-xs tracking-widest uppercase mb-6 flex-grow">{item["domain"]} • {item["atoms"]} Atoms</p>
            <div class="flex items-center justify-between text-on-surface-variant text-sm border-t border-white/5 pt-4">
                <span class="font-mono text-[10px] uppercase">load .{ext}</span>
                <span class="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 duration-300">arrow_forward</span>
            </div>
        </a>'''
    replacement += card

replacement += '''
    </div>
</section>'''

html_path = 'lupine-site/legacy/glimPSE-demo.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'<!-- Premium Authenticated Physics Data Library -->.*?</section>', re.DOTALL)
if pattern.search(content):
    content = pattern.sub(replacement, content)
else:
    # If the previous pattern was "Missing / Pending Molecule Data Library"
    pattern2 = re.compile(r'<!-- Missing / Pending Molecule Data Library -->.*?</section>', re.DOTALL)
    if pattern2.search(content):
        content = pattern2.sub(replacement, content)
    else:
        print("Pattern not found in HTML!")

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Injected {len(featured_items)} featured items into glimPSE-demo.html successfully!")
