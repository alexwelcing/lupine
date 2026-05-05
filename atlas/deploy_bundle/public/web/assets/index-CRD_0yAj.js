const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./App-DXFserl2.js","./vendor-three-DXS2DCSU.js","./vendor-postprocess-Bo_Yp5T4.js","./App-CNCQb1kB.css"])))=>i.map(i=>d[i]);
import { _ as p, z as m, G as o, H as f } from "./vendor-three-DXS2DCSU.js";
(async ()=>{
    (function() {
        const s = document.createElement("link").relList;
        if (s && s.supports && s.supports("modulepreload")) return;
        for (const e of document.querySelectorAll('link[rel="modulepreload"]'))c(e);
        new MutationObserver((e)=>{
            for (const r of e)if (r.type === "childList") for (const i of r.addedNodes)i.tagName === "LINK" && i.rel === "modulepreload" && c(i);
        }).observe(document, {
            childList: !0,
            subtree: !0
        });
        function a(e) {
            const r = {};
            return e.integrity && (r.integrity = e.integrity), e.referrerPolicy && (r.referrerPolicy = e.referrerPolicy), e.crossOrigin === "use-credentials" ? r.credentials = "include" : e.crossOrigin === "anonymous" ? r.credentials = "omit" : r.credentials = "same-origin", r;
        }
        function c(e) {
            if (e.ep) return;
            e.ep = !0;
            const r = a(e);
            fetch(e.href, r);
        }
    })();
    console.log("[glim] Step 1: imports starting");
    let d, n = null;
    try {
        d = (await p(()=>import("./App-DXFserl2.js").then(async (m)=>{
                await m.__tla;
                return m;
            }).then((s)=>s.A), __vite__mapDeps([0,1,2,3]), import.meta.url)).default, console.log("[glim] Step 2: App imported successfully");
    } catch (t) {
        n = t.message + `
` + (t.stack || ""), console.error("[glim] Step 2: App import FAILED:", t);
    }
    const l = m.createRoot(document.getElementById("root"));
    if (n) l.render(o.jsxs("div", {
        style: {
            padding: 40,
            background: "#06080d",
            color: "#ff5472",
            height: "100vh",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap"
        },
        children: [
            o.jsx("h2", {
                style: {
                    color: "#00c8f0",
                    marginBottom: 16
                },
                children: "glimPSE — Import Error"
            }),
            n
        ]
    }));
    else try {
        l.render(o.jsx(f.Suspense, {
            fallback: o.jsx("div", {
                style: {
                    color: "#00c8f0",
                    padding: 40
                },
                children: "Loading..."
            }),
            children: o.jsx(d, {})
        })), console.log("[glim] Step 3: root.render() called");
    } catch (t) {
        console.error("[glim] Step 3: render FAILED:", t), l.render(o.jsxs("div", {
            style: {
                padding: 40,
                background: "#06080d",
                color: "#ff5472",
                height: "100vh",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap"
            },
            children: [
                o.jsx("h2", {
                    style: {
                        color: "#00c8f0",
                        marginBottom: 16
                    },
                    children: "glimPSE — Render Error"
                }),
                t.message,
                `
`,
                t.stack
            ]
        }));
    }
})();
