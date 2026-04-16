import os

site_dir = r"C:\Users\alexw\Downloads\shed\glim\lupine-site"

def modify_file(filename):
    path = os.path.join(site_dir, filename)
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        data = f.read()

    # glimPSE demo replacements
    data = data.replace(
        """onclick="alert('Feature Coming Soon')">
            Launch Demo""",
        """onclick="window.open('https://lupinematerials.science', '_blank')">
            Launch Demo"""
    )
    data = data.replace(
        """onclick="alert('Feature Coming Soon')">
                            Launch Live Demo""",
        """onclick="window.open('https://lupinematerials.science', '_blank')">
                            Launch Live Demo"""
    )
    
    # Check if there is Try glimPSE Free
    data = data.replace(
        """>
                    Try glimPSE Free""",
        """ onclick="window.open('https://lupinematerials.science', '_blank')">
                    Try glimPSE Free"""
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(data)

modify_file("glimPSE-demo.html")
modify_file("dist/glimPSE-demo.html")
modify_file("index.html")
modify_file("dist/index.html")

# also let's make sure the generic "Try Lupine View" button in index.html (which goes to glimPSE-demo.html)
# stays that way, since glimPSE-demo.html is the landing page.

print("Done")
