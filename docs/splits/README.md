# Public Surface Extraction Packets

These packets turn the repo split map into executable migration checklists.

Use them in this order:

1. [`lupine-science.md`](./lupine-science.md) - smallest static surface.
2. [`library-lupine-site.md`](./library-lupine-site.md) - reader extraction
   after the content bundle contract exists.
3. [`lupi-live.md`](./lupi-live.md) - viewer extraction after deploy coupling
   and Firebase boundaries are clean.
4. [`science-control-plane.md`](./science-control-plane.md) - final slimming of
   this repo after the public surfaces are live.

Each packet follows the same pattern:

- purpose
- maintenance win
- current source
- destination shape
- move and leave-behind lists
- contracts
- secrets and infra
- local dev loop
- deploy loop
- extraction steps
- verification checklist
- hazards
- done state

The parent map is [`docs/repo-split-map.md`](../repo-split-map.md).
