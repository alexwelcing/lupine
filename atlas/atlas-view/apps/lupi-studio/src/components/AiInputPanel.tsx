import { useState, useCallback } from 'react';
import { MessageSquare, Code, FileText, Upload, Send, Loader2 } from 'lucide-react';

type InputMode = 'natural' | 'smiles' | 'xyz' | 'upload';

interface AiInputPanelProps {
  onSubmit?: (data: { mode: InputMode; value: string }) => void;
  loading?: boolean;
}

const modes: { id: InputMode; label: string; icon: typeof MessageSquare; placeholder: string }[] = [
  {
    id: 'natural',
    label: 'Natural Language',
    icon: MessageSquare,
    placeholder: 'Describe a molecule, e.g. "caffeine molecule" or "the active compound in aspirin"...',
  },
  {
    id: 'smiles',
    label: 'SMILES',
    icon: Code,
    placeholder: 'Enter SMILES notation, e.g. "CN1C=NC2=C1C(=O)N(C(=O)N2C)C"...',
  },
  {
    id: 'xyz',
    label: 'XYZ Paste',
    icon: FileText,
    placeholder: 'Paste XYZ coordinates...',
  },
  {
    id: 'upload',
    label: 'Upload File',
    icon: Upload,
    placeholder: 'Upload a molecule file (XYZ, SDF, PDB, MOL)...',
  },
];

export default function AiInputPanel({ onSubmit, loading = false }: AiInputPanelProps) {
  const [activeMode, setActiveMode] = useState<InputMode>('natural');
  const [value, setValue] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || loading) return;
    onSubmit?.({ mode: activeMode, value: value.trim() });
  }, [value, activeMode, loading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setValue(event.target?.result as string);
        };
        reader.readAsText(files[0]);
        setActiveMode('upload');
      }
    },
    []
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setValue(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  }, []);

  const currentMode = modes.find((m) => m.id === activeMode)!;

  return (
    <div className="w-full bg-surface rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
      {/* Mode Tabs */}
      <div className="flex items-center gap-1 p-1.5 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
        {modes.map((mode) => {
          const ModeIcon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => {
                setActiveMode(mode.id);
                setValue('');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-medium transition-all duration-200 ${
                activeMode === mode.id
                  ? 'bg-[rgba(123,92,255,0.15)] text-lupi-violet'
                  : 'text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              <ModeIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Area */}
      <div
        className={`relative p-4 transition-colors ${
          dragOver ? 'bg-[rgba(123,92,255,0.05)] border-2 border-dashed border-lupi-violet' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {activeMode === 'upload' && !value ? (
          <label className="flex flex-col items-center justify-center gap-3 py-12 cursor-pointer">
            <Upload className="w-8 h-8 text-[rgba(255,255,255,0.3)]" />
            <span className="text-sm text-[rgba(255,255,255,0.5)]">
              Drag and drop a file, or click to browse
            </span>
            <input
              type="file"
              accept=".xyz,.sdf,.pdb,.mol,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentMode.placeholder}
            className="w-full min-h-[120px] bg-transparent text-white placeholder:text-[rgba(255,255,255,0.3)] placeholder:italic font-body text-base resize-none focus:outline-none"
            style={{
              fontFamily: activeMode === 'smiles' || activeMode === 'xyz' ? '"JetBrains Mono", monospace' : undefined,
            }}
          />
        )}

        {value && activeMode === 'upload' && (
          <div className="mt-3 p-3 bg-surface-elevated rounded-lg border border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-2 text-sm text-[rgba(255,255,255,0.6)]">
              <FileText className="w-4 h-4 text-lupi-violet" />
              <span className="font-mono text-xs">File loaded</span>
              <button
                onClick={() => setValue('')}
                className="ml-auto text-xs text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
              >
                Clear
              </button>
            </div>
            <pre className="mt-2 text-xs font-mono text-[rgba(255,255,255,0.4)] max-h-32 overflow-auto">
              {value.slice(0, 500)}{value.length > 500 ? '...' : ''}
            </pre>
          </div>
        )}
      </div>

      {/* Submit Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
        <span className="text-caption text-[rgba(255,255,255,0.3)]">
          {activeMode === 'natural' && 'Press Ctrl+Enter to submit'}
          {activeMode === 'smiles' && 'SMILES will be validated'}
          {activeMode === 'xyz' && 'XYZ format expected'}
          {activeMode === 'upload' && 'Supported: XYZ, SDF, PDB, MOL'}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-body text-button transition-all duration-200 ${
            !value.trim() || loading
              ? 'bg-[rgba(123,92,255,0.3)] text-[rgba(255,255,255,0.4)] cursor-not-allowed'
              : 'bg-lupi-violet text-white hover:bg-[#8B6CFF] hover:scale-[1.02] active:scale-[0.98] shadow-glow-violet'
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Generate</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
