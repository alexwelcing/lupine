"use client";

import { useState } from "react";

interface TimelineProps {
    segments: any[];
}

export default function ScriptTimeline({ segments }: TimelineProps) {
    // Mock segments if empty
    const displaySegments = segments.length > 0 ? segments : [
        { start: 0, end: 2.5, text: "Do not go gentle into that good night," },
        { start: 2.5, end: 5.0, text: "Old age should burn and rave at close of day;" },
        { start: 5.0, end: 8.0, text: "Rage, rage against the dying of the light." }
    ];

    return (
        <div className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-4 mt-8">
            <h3 className="text-xl font-bold text-zinc-300 mb-4">Script Timeline</h3>
            <div className="flex flex-col gap-2">
                {displaySegments.map((seg, idx) => (
                    <div key={idx} className="flex group relative">
                        <div className="w-16 text-zinc-500 text-xs font-mono pt-3">
                            {seg.start.toFixed(1)}s
                        </div>
                        <div className="flex-1 bg-zinc-800 p-3 rounded border border-zinc-700 hover:border-purple-500 hover:bg-zinc-700 transition-all cursor-move">
                            <p className="text-zinc-200">{seg.text}</p>
                        </div>
                        <div className="w-8 border-l border-zinc-700 ml-2"></div>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex justify-between text-xs text-zinc-500">
                <span>00:00</span>
                <span>End</span>
            </div>
        </div>
    );
}
