# Social atom QR archive

This is a deliberately small, non-gallery archive of social links rendered as
molecular structures for LUPI. Each `.xyz` file is a QR code where:

- dark QR modules are carbon atoms;
- adjacent modules are spaced at 1.55 Å so LUPI infers visible C-C bonds;
- the viewer's Social QRs search provider loads the structures from
  `social-qr/manifest.json` instead of adding them to the main atomic gallery.

Regenerate after editing `social-links.json`:

```bash
cd atlas/atlas-view
python3 scripts/generate_social_qr_atoms.py
```

The bundled generator is dependency-free and supports byte-mode QR payloads up
to 108 UTF-8 bytes at ECC-M. Use a short profile URL for longer social links.
