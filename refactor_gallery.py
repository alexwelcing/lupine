import re

with open('atlas/atlas-view/packages/ui/src/Gallery.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I want to inject `import galleryData from './gallery-data.json';` at the top
content = content.replace("import { useStore } from './store';", "import { useStore } from './store';\nimport galleryData from './gallery-data.json';")

# I want to replace `const EXAMPLES: GalleryExample[] = [ ... ];`
# with `const EXAMPLES: GalleryExample[] = galleryData as GalleryExample[];`
pattern = re.compile(r'const EXAMPLES: GalleryExample\[\] = \[.*?\];', re.DOTALL)
replacement = 'const EXAMPLES: GalleryExample[] = galleryData as GalleryExample[];'

content = pattern.sub(replacement, content)

with open('atlas/atlas-view/packages/ui/src/Gallery.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Gallery.tsx updated!")
