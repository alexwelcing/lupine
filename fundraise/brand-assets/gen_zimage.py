#!/usr/bin/env python
"""Lupine deck stills via LOCAL ComfyUI + Z-Image Turbo (GGUF, AuraFlow) — the
existing panorama pathway, no LoRAs, no safety gate. Fast 8-step Turbo.
Run: python gen_zimage.py
"""
import json, os, time, urllib.request, urllib.parse

HOST = "http://127.0.0.1:8188"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "zimage")
os.makedirs(OUT, exist_ok=True)
W, H = 1344, 768  # 16:9, /16

STYLE = ("abstract scientific illustration, editorial minimalism like a figure in a beautiful "
         "physics monograph, warm off-white cream paper background, thin precise lines in a single "
         "indigo blue accent, very low contrast, vast negative space, calm, premium, restrained")
NEG = "text, words, letters, watermark, signature, people, faces, flowers, neon, glow, photo, low quality, blurry, frame, border"

CONCEPTS = [
 (1,"cover-shape-of-wrongness", "many faint thin indigo directional line segments scattered across the field gracefully converging and aligning onto a single smooth luminous indigo ribbon curve on the right, structure emerging from scatter, "+STYLE),
 (2,"bits-to-atoms", "a field of tiny faint indigo pixels on the left dissolving and re-forming into a precise crystalline atomic lattice of indigo nodes joined by thin bonds on the right, "+STYLE),
 (4,"hyper-ribbon", "a single elegant low-dimensional luminous indigo ribbon sheet folded gracefully in space with faint scattered points converging onto its surface, "+STYLE),
 (6,"bridge", "a single luminous indigo arc bridging a crystalline atomic lattice on the left through a faint field of small squares in the middle to a crystalline lattice on the right, atoms to bits to atoms, "+STYLE),
 (10,"vision-replicator-arc", "matter coalescing out of faint indigo particles and light along a sweeping horizon arc, ordered crystalline structure assembling, expansive yet restrained, "+STYLE),
 (7,"calibration-grid", "a clean faint indigo grid gently overlaying and aligning a field of scattered points onto a smooth manifold surface, "+STYLE),
 (8,"flywheel", "a crystalline indigo lattice growing outward in an elegant self-reinforcing spiral, each ring larger than the last, "+STYLE),
]

def wf(pos, seed):
    return {
      "1":{"class_type":"UnetLoaderGGUF","inputs":{"unet_name":"z_image_turbo-Q8_0.gguf"}},
      "2":{"class_type":"CLIPLoaderGGUF","inputs":{"clip_name":"Qwen_3_4b-Q8_0.gguf","type":"sd3"}},
      "3":{"class_type":"VAELoader","inputs":{"vae_name":"ae.safetensors"}},
      "4":{"class_type":"ModelSamplingAuraFlow","inputs":{"model":["1",0],"shift":1.0}},
      "5":{"class_type":"CLIPTextEncode","inputs":{"text":pos,"clip":["2",0]}},
      "6":{"class_type":"CLIPTextEncode","inputs":{"text":NEG,"clip":["2",0]}},
      "7":{"class_type":"EmptyLatentImage","inputs":{"width":W,"height":H,"batch_size":1}},
      "8":{"class_type":"KSampler","inputs":{"seed":seed,"steps":8,"cfg":1.0,"sampler_name":"euler","scheduler":"simple","denoise":1.0,"model":["4",0],"positive":["5",0],"negative":["6",0],"latent_image":["7",0]}},
      "9":{"class_type":"VAEDecode","inputs":{"samples":["8",0],"vae":["3",0]}},
      "10":{"class_type":"SaveImage","inputs":{"filename_prefix":"lupine_zimage","images":["9",0]}},
    }

def run(pos, seed, name):
    t0=time.time()
    req=urllib.request.Request(HOST+"/prompt",data=json.dumps({"prompt":wf(pos,seed)}).encode(),headers={"Content-Type":"application/json"})
    try: pid=json.loads(urllib.request.urlopen(req,timeout=30).read())["prompt_id"]
    except Exception as e: print(f"SUBMIT FAIL {name}: {e}"); return
    while True:
        time.sleep(1.5)
        h=json.loads(urllib.request.urlopen(HOST+"/history/"+pid,timeout=30).read())
        if pid not in h: continue
        st=h[pid].get("status",{})
        if st.get("status_str")=="error": print(f"ERROR {name}: {json.dumps(st)[:400]}"); return
        for node in h[pid].get("outputs",{}).values():
            for im in node.get("images",[]):
                q=urllib.parse.urlencode({"filename":im["filename"],"subfolder":im.get("subfolder",""),"type":im.get("type","output")})
                raw=urllib.request.urlopen(HOST+"/view?"+q,timeout=60).read()
                with open(os.path.join(OUT,name),"wb") as f: f.write(raw)
                print(f"OK {name} {round(time.time()-t0,1)}s ({len(raw)//1024}KB)"); return

if __name__=="__main__":
    for slide,nm,pos in CONCEPTS:
        for seed in (101, 202):
            run(pos, seed, f"slide{slide:02d}-{nm}-{seed}.png")
    print("ZIMAGE DONE ->", OUT)
