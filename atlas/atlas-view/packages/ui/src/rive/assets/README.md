# Rive Assets

Place exported `.riv` files here.

## Required file: `gpu-unlock.riv`

Author in [rive.app](https://rive.app) using the design spec.

### State Machine: `GpuUnlockStateMachine`

**Inputs:**
| Name | Type | Purpose |
|------|------|---------|
| `triggerUnlock` | Trigger | Fires to start the unlock cascade |
| `gpuReady` | Boolean | Set `true` when WebGPU pipeline is operational |
| `progress` | Number (0-100) | Initialization progress for loading bar |

**States:**
- `Idle` → default entry state
- `Initializing` → triggered by `triggerUnlock`
- `Unlocking` → auto-transition when `progress >= 100`
- `Active` → auto-transition after 1200ms, loops breathing dot

### Artboard

- **Name:** `GpuUnlock`
- **Size:** 1920 × 1080 (viewport overlay)
- **Background:** Transparent

### Timeline Layers

1. **Scanline Sweep** — 0–800ms, cyan horizontal line top→bottom
2. **Energy Ring** — 800–2000ms, concentric circles + lightning bolt
3. **Feature Chips** — 1200–1800ms, three cascading chip labels
4. **Badge Settle** — 1800–2400ms, shrink to corner badge
