import asyncio
from backend.core.source_miner import SourceMiner
from backend.core.script_timeline import ScriptTimeline
from backend.core.vibe_weaver import VibeWeaver

async def verify_mix():
    print("=== Verifying Mix (CineWeave) Backend ===")
    
    # 1. Source Miner
    miner = SourceMiner()
    stem_path = await miner.extract_stem("video.mp4", "female whisper")
    print(f"[SourceMiner] Stem: {stem_path}")
    
    # 2. Script Timeline
    timeline = ScriptTimeline()
    script = await timeline.transcribe(stem_path)
    print(f"[ScriptTimeline] Segments: {len(script['segments'])}")
    
    aligned = await timeline.align_edit(stem_path, "New Text")
    print(f"[ScriptTimeline] Aligned: {aligned}")
    
    # 3. Vibe Weaver
    weaver = VibeWeaver()
    vibe = await weaver.analyze_vibe(stem_path)
    print(f"[VibeWeaver] Vibe: {vibe}")
    
    mixed = await weaver.smart_duck("music.wav", stem_path)
    print(f"[VibeWeaver] Mixed: {mixed}")
    
    print("\nSUCCESS: Mix Backend systems online.")

if __name__ == "__main__":
    asyncio.run(verify_mix())
