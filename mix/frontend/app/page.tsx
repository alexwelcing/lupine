"use client";

import { useState } from "react";
import ScriptTimeline from "./components/ScriptTimeline";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("Idle");
  const [result, setResult] = useState("");

  const handleExtract = async () => {
    setStatus("Extracting...");
    try {
      const response = await fetch("http://localhost:8000/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_path: "demo_video.mp4",
          prompt: prompt,
        }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setStatus("Completed");
        setResult(data.file);
      } else {
        setStatus("Error");
      }
    } catch (e) {
      console.error(e);
      setStatus("Connection Failed");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-zinc-950 text-zinc-100 font-mono">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-zinc-800 bg-zinc-950/80 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-zinc-800/50 lg:p-4">
          MIX :: CINEWEAVE ENGINE
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-zinc-900 via-zinc-900/0 lg:static lg:h-auto lg:w-auto lg:bg-none">
          <div className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0">
            Running on Port 3000
          </div>
        </div>
      </div>

      <div className="relative flex place-items-center my-16">
        <div className="text-4xl font-bold tracking-tighter sm:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Semantic Mixing
        </div>
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-2 lg:text-left gap-8">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
          <h2 className="mb-3 text-2xl font-semibold">
            Source Miner{" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter sound (e.g. 'female whisper')"
              className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded text-sm placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              onClick={handleExtract}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded font-bold transition-all"
            >
              EXTRACT STEM
            </button>
          </div>
        </div>

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors border-zinc-800 bg-zinc-900/50">
          <h2 className="mb-3 text-2xl font-semibold">
            Engine Status
          </h2>
          <div className="font-mono text-sm space-y-2">
            <p>State: <span className={status === "Extracting..." ? "text-yellow-400 animate-pulse" : "text-zinc-400"}>{status}</span></p>
            {result && (
              <p className="text-green-400 break-all">&gt; Generated: {result}</p>
            )}
            <p className="text-zinc-600 text-xs mt-4">Backend: localhost:8000</p>
          </div>
        </div>
      </div>


      {/* Timeline Section */}
      <div className="w-full max-w-5xl">
        <ScriptTimeline segments={[]} />
      </div>
    </main >
  );
}
