with open('lupine-site/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all of them manually
content = content.replace("""<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px 24px;text-align:center;transition:all 0.3s;"
                onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(91,58,140,0.25)'"
                onmouseout="this.style.transform='none';this.style.borderColor='rgba(255,255,255,0.06)'">""", '<div class="corpus-stat-card">')

content = content.replace("""<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px 24px;text-align:center;transition:all 0.3s;"
                onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(212,168,67,0.35)'"
                onmouseout="this.style.transform='none';this.style.borderColor='rgba(255,255,255,0.06)'">
                <div
                    style="font-family:var(--font-serif);font-size:48px;font-weight:700;background:linear-gradient(135deg,var(--accent-cyan),#2a9d8f)""", """<div class="corpus-stat-card" style="--hover-border:rgba(78,205,196,0.35); --hover-glow:rgba(78,205,196,0.15); --hover-line:var(--accent-cyan);">
                <div
                    style="font-family:var(--font-serif);font-size:48px;font-weight:700;background:linear-gradient(135deg,var(--accent-cyan),#2a9d8f)""")

content = content.replace("""<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px 24px;text-align:center;transition:all 0.3s;"
                onmouseover="this.style.transform='translateY(-4px)';this.style.borderColor='rgba(212,168,67,0.35)'"
                onmouseout="this.style.transform='none';this.style.borderColor='rgba(255,255,255,0.06)'">
                <div
                    style="font-family:var(--font-serif);font-size:48px;font-weight:700;background:linear-gradient(135deg,var(--accent-gold),#c9a227)""", """<div class="corpus-stat-card" style="--hover-border:rgba(212,168,67,0.35); --hover-glow:rgba(212,168,67,0.15); --hover-line:var(--accent-gold);">
                <div
                    style="font-family:var(--font-serif);font-size:48px;font-weight:700;background:linear-gradient(135deg,var(--accent-gold),#c9a227)""")

with open('lupine-site/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
