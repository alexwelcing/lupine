#!/usr/bin/env python
"""Lupine Science brand-still generator — local ComfyUI + Ideogram 4.
Graph flattened/verified from image_ideogram4_t2i.json against /object_info.
Run with ComfyUI embedded python (has PIL): python generate.py test | batch
"""
import json, sys, time, urllib.request, urllib.parse, os, io

HOST = "http://127.0.0.1:8188"
OUT = os.path.dirname(os.path.abspath(__file__))
W, H = 1664, 928  # 16:9, /16

STYLE = {
    "aesthetics": "editorial scientific minimalism, like a figure in a beautiful physics monograph, generous negative space, calm, premium, restrained, subtle paper grain",
    "lighting": "soft single indigo light source on warm paper",
    "medium": "fine abstract scientific illustration",
    "color_palette": ["#faf9f6", "#3d4db3", "#16171d"],
}
BG = ("warm off-white #faf9f6 paper, mostly empty negative space, faint detail toward "
      "the edges so text can sit on top, no text, no words, no letters, no people, no flowers")

def P(desc, elements):
    return json.dumps({
        "high_level_description": desc,
        "style_description": STYLE,
        "compositional_deconstruction": {"background": BG, "elements": elements},
    })

def el(d):
    return {"type": "obj", "desc": d, "color_palette": ["#3d4db3", "#16171d"]}

# slide -> (name, hero, prompt)
CONCEPTS = [
 (1,"shape-of-wrongness",True, P(
   "an elegant abstract scientific figure: many faint directional line segments aligning onto a single smooth luminous indigo ribbon curve; structure emerging from a scattered field",
   [el("dozens of short thin faint indigo directional line segments at varied angles scattered across the periphery"),
    el("one smooth luminous indigo ribbon curve sweeping through center-right that the segments align onto")])),
 (2,"bits-to-atoms",False, P(
   "the crossing from the digital to the physical: a field of tiny pixels dissolving on the left and re-forming into a precise atomic lattice on the right",
   [el("left: a faint field of tiny square pixels and digital glyphs dissolving"),
    el("right: a precise crystalline atomic lattice of indigo nodes joined by thin bonds")])),
 (3,"scattered-wrong-curves",False, P(
   "many faint subtly different prediction curves scattered across paper, each slightly wrong in a different way, quiet visual tension",
   [el("many faint thin indigo curves/trajectories scattered, each slightly offset from the others, lots of empty space")])),
 (4,"hyper-ribbon",False, P(
   "the hyper-ribbon: a single elegant low-dimensional luminous indigo ribbon sheet folded in space with faint error points converging onto its surface",
   [el("one luminous indigo low-dimensional ribbon/sheet folded gracefully in space"),
    el("faint scattered points converging onto the ribbon surface")])),
 (5,"upstream-cascade",False, P(
   "a single point of indigo light rippling outward through a vast sparse lattice; scale and consequence",
   [el("a single bright indigo point at one side emitting faint concentric ripples"),
    el("a vast sparse faint lattice of small nodes the ripples pass through")])),
 (6,"the-bridge",True, P(
   "atoms to bits to atoms: a single luminous indigo arc bridging a crystalline lattice to a field of digital glyphs and back to a lattice",
   [el("left: a crystalline atomic lattice"), el("middle: a faint field of digital glyphs"),
    el("right: a crystalline atomic lattice"),
    el("one luminous indigo arc sweeping across connecting all three")])),
 (7,"calibration-grid",False, P(
   "correction made visible: a clean indigo grid gently overlaying and aligning a field of scattered points onto a smooth manifold",
   [el("a clean faint indigo grid/mesh overlay"),
    el("scattered faint points being pulled into alignment onto a smooth manifold surface")])),
 (8,"compounding-flywheel",False, P(
   "an edge that compounds: a crystal lattice growing outward in self-reinforcing spiral geometry, each layer larger",
   [el("a crystalline indigo lattice growing outward in an elegant self-reinforcing spiral, each ring larger than the last")])),
 (10,"replicator-arc",True, P(
   "matter coalescing out of faint indigo light along a sweeping horizon arc; expansive, cinematic, restrained",
   [el("faint indigo particles and light along a sweeping horizon arc assembling into ordered crystalline structure")])),
 (11,"network-horizon",False, P(
   "reach and momentum: a luminous indigo line extending across warm paper toward a distant horizon with a sparse network of faint nodes lighting up",
   [el("one luminous indigo line extending toward a distant horizon"),
    el("a sparse network of faint nodes lighting up along the line")])),
]

def build_wf(prompt_text, seed):
    return {
      "1": {"class_type":"UNETLoader","inputs":{"unet_name":"ideogram4_fp8_scaled.safetensors","weight_dtype":"default"}},
      "2": {"class_type":"UNETLoader","inputs":{"unet_name":"ideogram4_unconditional_fp8_scaled.safetensors","weight_dtype":"default"}},
      "3": {"class_type":"CLIPLoader","inputs":{"clip_name":"qwen3vl_8b_fp8_scaled.safetensors","type":"ideogram4","device":"default"}},
      "4": {"class_type":"CLIPTextEncode","inputs":{"clip":["3",0],"text":prompt_text}},
      "5": {"class_type":"ConditioningZeroOut","inputs":{"conditioning":["4",0]}},
      "6": {"class_type":"VAELoader","inputs":{"vae_name":"flux2-vae.safetensors"}},
      "7": {"class_type":"EmptyFlux2LatentImage","inputs":{"width":W,"height":H,"batch_size":1}},
      "8": {"class_type":"KSamplerSelect","inputs":{"sampler_name":"euler"}},
      "9": {"class_type":"Ideogram4Scheduler","inputs":{"steps":20,"width":W,"height":H,"mu":0.5,"std":1.75}},
      "10":{"class_type":"RandomNoise","inputs":{"noise_seed":seed}},
      "11":{"class_type":"CFGOverride","inputs":{"model":["1",0],"cfg":3.0,"start_percent":0.7,"end_percent":1.0}},
      "12":{"class_type":"DualModelGuider","inputs":{"model":["11",0],"positive":["4",0],"cfg":7.0,"model_negative":["2",0],"negative":["5",0]}},
      "13":{"class_type":"SamplerCustomAdvanced","inputs":{"noise":["10",0],"guider":["12",0],"sampler":["8",0],"sigmas":["9",0],"latent_image":["7",0]}},
      "14":{"class_type":"VAEDecode","inputs":{"samples":["13",0],"vae":["6",0]}},
      "15":{"class_type":"SaveImage","inputs":{"images":["14",0],"filename_prefix":"lupine_brand"}},
    }

def post(path, data):
    req = urllib.request.Request(HOST+path, data=json.dumps(data).encode(), headers={"Content-Type":"application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

def get(path):
    return json.loads(urllib.request.urlopen(HOST+path, timeout=30).read())

def run_one(prompt_text, seed, outname):
    t0=time.time()
    r = post("/prompt", {"prompt": build_wf(prompt_text, seed)})
    pid = r["prompt_id"]
    while True:
        time.sleep(2)
        h = get("/history/"+pid)
        if pid in h:
            status = h[pid].get("status",{})
            if status.get("status_str")=="error":
                raise RuntimeError("comfy error: "+json.dumps(status)[:800])
            outs = h[pid].get("outputs",{})
            imgs=[]
            for node in outs.values():
                for im in node.get("images",[]):
                    imgs.append(im)
            if imgs:
                im=imgs[0]
                q=urllib.parse.urlencode({"filename":im["filename"],"subfolder":im.get("subfolder",""),"type":im.get("type","output")})
                raw=urllib.request.urlopen(HOST+"/view?"+q, timeout=60).read()
                dst=os.path.join(OUT, outname)
                with open(dst,"wb") as f: f.write(raw)
                return dst, round(time.time()-t0,1)

def contact_sheet(files, path):
    try:
        from PIL import Image, ImageDraw
    except Exception as e:
        print("PIL unavailable, skipping contact sheet:", e); return
    cols=4; tw=520; th=int(tw*H/W)+22
    rows=(len(files)+cols-1)//cols
    sheet=Image.new("RGB",(cols*tw, rows*th),(250,249,246))
    d=ImageDraw.Draw(sheet)
    for i,(label,fp) in enumerate(files):
        try: im=Image.open(fp).convert("RGB").resize((tw,int(tw*H/W)))
        except: continue
        x=(i%cols)*tw; y=(i//cols)*th
        sheet.paste(im,(x,y)); d.text((x+6,y+int(tw*H/W)+4),label,fill=(22,23,29))
    sheet.save(path); print("contact sheet:", path)

if __name__=="__main__":
    mode = sys.argv[1] if len(sys.argv)>1 else "test"
    if mode=="test":
        os.makedirs(os.path.join(OUT,"_test"),exist_ok=True)
        dst,sec=run_one(CONCEPTS[0][3], 4242, "_test/slide01-reworded-4242.png")
        print(f"TEST OK {dst} in {sec}s")
    else:
        hero_seeds=[1001,2002,3003][:int(sys.argv[2])] if len(sys.argv)>2 else [1001,2002]
        other_seeds=[1001,2002,3003][:int(sys.argv[3])] if len(sys.argv)>3 else [1001]
        manifest=[]; made=[]
        for slide,name,hero,prompt in CONCEPTS:
            seeds=hero_seeds if hero else other_seeds
            for s in seeds:
                fn=f"slide{slide:02d}-{name}-{s}.png"
                try:
                    dst,sec=run_one(prompt,s,fn)
                    made.append((f"s{slide:02d} {name} #{s}",dst))
                    manifest.append({"file":fn,"slide":slide,"concept":name,"hero":hero,"seed":s,"sec":sec,
                                     "model":"ideogram4_fp8_scaled","size":[W,H],"prompt":json.loads(prompt)})
                    print(f"ok {fn} {sec}s")
                except Exception as e:
                    print(f"FAIL {fn}: {e}")
        with open(os.path.join(OUT,"manifest.json"),"w") as f: json.dump(manifest,f,indent=2)
        contact_sheet(made, os.path.join(OUT,"contact-sheet.png"))
        print(f"DONE {len(made)} images")
