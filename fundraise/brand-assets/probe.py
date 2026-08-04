#!/usr/bin/env python
"""Ideogram-4 safety-bypass probe. Tests whether the trained 'Image blocked by
safety filter' placeholder can be defeated via (a) a real negative prompt that
repels the text-on-gray placeholder using a standard CFGGuider, (b) plain vs
structured-JSON prompt format, (c) multiple seeds. Saves all outputs to _probe/.
Run: python probe.py
"""
import json, os, time, urllib.request, urllib.parse

HOST = "http://127.0.0.1:8188"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_probe")
os.makedirs(OUT, exist_ok=True)
W, H = 1664, 928

NEG = ("text, words, letters, typography, caption, watermark, sign, label, "
       "warning message, error message, gray screen, blank placeholder, blocked")

NEUTRAL = ("a minimal abstract scientific illustration: one smooth thin indigo curved "
           "ribbon on warm cream off-white paper, generous empty space, calm, elegant")

CONCEPT = json.dumps({
    "high_level_description": "an elegant abstract scientific figure: many faint indigo line segments aligning onto a single smooth luminous indigo ribbon curve",
    "style_description": {"aesthetics": "editorial scientific minimalism, generous negative space",
                          "color_palette": ["#faf9f6", "#3d4db3", "#16171d"]},
    "compositional_deconstruction": {"background": "warm off-white cream paper, mostly empty",
        "elements": [{"type": "obj", "desc": "faint indigo directional segments aligning onto one luminous indigo ribbon curve"}]},
})

COMMON = {
    "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "ideogram4_fp8_scaled.safetensors", "weight_dtype": "default"}},
    "2": {"class_type": "UNETLoader", "inputs": {"unet_name": "ideogram4_unconditional_fp8_scaled.safetensors", "weight_dtype": "default"}},
    "3": {"class_type": "CLIPLoader", "inputs": {"clip_name": "qwen3vl_8b_fp8_scaled.safetensors", "type": "ideogram4", "device": "default"}},
    "6": {"class_type": "VAELoader", "inputs": {"vae_name": "flux2-vae.safetensors"}},
    "7": {"class_type": "EmptyFlux2LatentImage", "inputs": {"width": W, "height": H, "batch_size": 1}},
    "8": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
    "9": {"class_type": "Ideogram4Scheduler", "inputs": {"steps": 20, "width": W, "height": H, "mu": 0.5, "std": 1.75}},
}


def build(prompt, seed, guider):
    wf = dict(COMMON)
    wf["4"] = {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": prompt}}
    wf["10"] = {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}}
    if guider == "dual":  # template-faithful baseline
        wf["5"] = {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["4", 0]}}
        wf["11"] = {"class_type": "CFGOverride", "inputs": {"model": ["1", 0], "cfg": 3.0, "start_percent": 0.7, "end_percent": 1.0}}
        wf["12"] = {"class_type": "DualModelGuider", "inputs": {"model": ["11", 0], "positive": ["4", 0], "cfg": 7.0, "model_negative": ["2", 0], "negative": ["5", 0]}}
    else:  # cfg: standard CFGGuider with a REAL negative prompt to repel the placeholder
        wf["5"] = {"class_type": "CLIPTextEncode", "inputs": {"clip": ["3", 0], "text": NEG}}
        wf["12"] = {"class_type": "CFGGuider", "inputs": {"model": ["1", 0], "positive": ["4", 0], "negative": ["5", 0], "cfg": 5.0}}
    wf["13"] = {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["10", 0], "guider": ["12", 0], "sampler": ["8", 0], "sigmas": ["9", 0], "latent_image": ["7", 0]}}
    wf["14"] = {"class_type": "VAEDecode", "inputs": {"samples": ["13", 0], "vae": ["6", 0]}}
    wf["15"] = {"class_type": "SaveImage", "inputs": {"images": ["14", 0], "filename_prefix": "probe"}}
    return wf


def run(prompt, seed, guider, name):
    t0 = time.time()
    req = urllib.request.Request(HOST + "/prompt", data=json.dumps({"prompt": build(prompt, seed, guider)}).encode(),
                                 headers={"Content-Type": "application/json"})
    try:
        pid = json.loads(urllib.request.urlopen(req, timeout=30).read())["prompt_id"]
    except Exception as e:
        print(f"SUBMIT FAIL {name}: {e}"); return
    while True:
        time.sleep(2)
        h = json.loads(urllib.request.urlopen(HOST + "/history/" + pid, timeout=30).read())
        if pid not in h:
            continue
        st = h[pid].get("status", {})
        if st.get("status_str") == "error":
            print(f"ERROR {name}: {json.dumps(st)[:400]}"); return
        for node in h[pid].get("outputs", {}).values():
            for im in node.get("images", []):
                q = urllib.parse.urlencode({"filename": im["filename"], "subfolder": im.get("subfolder", ""), "type": im.get("type", "output")})
                raw = urllib.request.urlopen(HOST + "/view?" + q, timeout=60).read()
                with open(os.path.join(OUT, name), "wb") as f:
                    f.write(raw)
                print(f"OK {name} {round(time.time()-t0,1)}s ({len(raw)//1024}KB)")
                return


VARIANTS = [
    (NEUTRAL, 7,  "dual", "A_dual-neutral_s7.png"),       # baseline: does faithful graph block a trivially safe plain prompt?
    (NEUTRAL, 7,  "cfg",  "B_cfgneg-neutral_s7.png"),     # negative-steer + plain prompt
    (CONCEPT, 7,  "cfg",  "C_cfgneg-concept_s7.png"),     # negative-steer + our real concept (JSON)
    (CONCEPT, 314,"cfg",  "D_cfgneg-concept_s314.png"),   # seed sensitivity
    (NEUTRAL, 314,"dual", "E_dual-neutral_s314.png"),     # baseline seed sensitivity
]

if __name__ == "__main__":
    for prompt, seed, guider, name in VARIANTS:
        run(prompt, seed, guider, name)
    print("PROBE DONE ->", OUT)
