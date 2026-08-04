/**
 * PanelHost - renders the active viewer tool panel as a dockable window.
 *
 * On desktop this replaces the fixed right-side sheet with a floating,
 * draggable, resizable, snap-to-edge palette. On mobile the caller still
 * renders the bottom sheet; this component renders nothing when invisible.
 */
import { useStore, type AppState } from './store';
import { DockableWindow } from './DockableWindow';
import { ViewerControlsDrawer, type ViewerControlMode } from './ViewerControlsDrawer';
import { FigureExportPanel } from './panels/FigureExportPanel';
import { FlythroughPanel } from './panels/FlythroughPanel';
import { TelemetryPanel } from './panels/TelemetryPanel';
import { EquilibriumSolveWorkbench } from './EquilibriumSolveWorkbench';
import { MlipLongRunWorkbench } from './MlipLongRunWorkbench';

interface PanelHostProps {
  activePanel: AppState['activePanel'];
  studioDeck: ViewerControlMode | null;
  onOpenStudioDeck: (mode: ViewerControlMode) => void;
  onClose: () => void;
}

const TITLES: Record<NonNullable<PanelHostProps['activePanel']>, string> = {
  studio: 'Controls',
  export: 'Export Figure',
  flythrough: 'Flythrough',
  telemetry: 'Telemetry',
  equilibrium: 'Equilibrium Solve',
  mlipLongRun: 'MLIP Long Run',
};

const INITIALS: Record<NonNullable<PanelHostProps['activePanel']>, { x?: number; y?: number; w?: number; h?: number }> = {
  studio: { x: undefined, y: undefined, w: 400, h: 720 },
  export: { x: undefined, y: undefined, w: 420, h: 680 },
  flythrough: { x: undefined, y: undefined, w: 400, h: 620 },
  telemetry: { x: undefined, y: undefined, w: 400, h: 580 },
  equilibrium: { x: undefined, y: undefined, w: 460, h: 720 },
  mlipLongRun: { x: undefined, y: undefined, w: 460, h: 720 },
};

export function PanelHost({ activePanel, studioDeck, onOpenStudioDeck, onClose }: PanelHostProps) {
  const file = useStore(s => s.file);
  const frame = useStore(s => s.frame);
  const currentFrame = file ? file.trajectory.frames[frame] : null;
  const totalFrames = file?.trajectory.totalFrames ?? 0;

  if (!activePanel || !file) return null;

  return (
    <DockableWindow
      key={activePanel}
      title={TITLES[activePanel]}
      onClose={onClose}
      initial={INITIALS[activePanel]}
      minW={320}
      minH={240}
    >
      {activePanel === 'studio' && (
        <ViewerControlsDrawer
          activeMode={studioDeck ?? 'look'}
          onModeChange={onOpenStudioDeck}
          onClose={onClose}
          showChrome={false}
        />
      )}
      {activePanel === 'export' && <FigureExportPanel showCloseButton={false} />}
      {activePanel === 'flythrough' && <FlythroughPanel />}
      {activePanel === 'telemetry' && (
        <TelemetryPanel
          thermo={file?.thermo ?? null}
          currentFrame={currentFrame ?? undefined}
          totalFrames={totalFrames}
        />
      )}
      {activePanel === 'equilibrium' && <EquilibriumSolveWorkbench />}
      {activePanel === 'mlipLongRun' && <MlipLongRunWorkbench />}
    </DockableWindow>
  );
}
