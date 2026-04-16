const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/App-DH5XXMoW.js","assets/vendor-three-J-Fe6CIY.js","assets/vendor-postprocess-B5yXXvdy.js","assets/App-CNCQb1kB.css"])))=>i.map(i=>d[i]);
import { _ as p, z as m, G as t, H as f } from "./vendor-three-J-Fe6CIY.js";
(async ()=>{
    (function() {
        const s = document.createElement("link").relList;
        if (s && s.supports && s.supports("modulepreload")) return;
        for (const e of document.querySelectorAll('link[rel="modulepreload"]'))n(e);
        new MutationObserver((e)=>{
            for (const r of e)if (r.type === "childList") for (const i of r.addedNodes)i.tagName === "LINK" && i.rel === "modulepreload" && n(i);
        }).observe(document, {
            childList: !0,
            subtree: !0
        });
        function a(e) {
            const r = {};
            return e.integrity && (r.integrity = e.integrity), e.referrerPolicy && (r.referrerPolicy = e.referrerPolicy), e.crossOrigin === "use-credentials" ? r.credentials = "include" : e.crossOrigin === "anonymous" ? r.credentials = "omit" : r.credentials = "same-origin", r;
        }
        function n(e) {
            if (e.ep) return;
            e.ep = !0;
            const r = a(e);
            fetch(e.href, r);
        }
    })();
    console.log("[glim] Step 1: imports starting");
    let d, c = null;
    try {
        d = (await p(()=>import("./App-DH5XXMoW.js"), __vite__mapDeps([0,1,2,3]))).default, console.log("[glim] Step 2: App imported successfully");
    } catch (o) {
        c = o.message + `
` + (o.stack || ""), console.error("[glim] Step 2: App import FAILED:", o);
    }
    const l = m.createRoot(document.getElementById("root"));
    if (c) l.render(t.jsxs("div", {
        style: {
            padding: 40,
            background: "#06080d",
            color: "#ff5472",
            height: "100vh",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap"
        },
        children: [
            t.jsx("h2", {
                style: {
                    color: "#00c8f0",
                    marginBottom: 16
                },
                children: "glimPSE — Import Error"
            }),
            c
        ]
    }));
    else try {
        l.render(t.jsx(f.Suspense, {
            fallback: t.jsx("div", {
                style: {
                    color: "#00c8f0",
                    padding: 40
                },
                children: "Loading..."
            }),
            children: t.jsx(d, {})
        })), console.log("[glim] Step 3: root.render() called");
    } catch (o) {
        console.error("[glim] Step 3: render FAILED:", o), l.render(t.jsxs("div", {
            style: {
                padding: 40,
                background: "#06080d",
                color: "#ff5472",
                height: "100vh",
                fontFamily: "monospace",
                whiteSpace: "pre-wrap"
            },
            children: [
                t.jsx("h2", {
                    style: {
                        color: "#00c8f0",
                        marginBottom: 16
                    },
                    children: "glimPSE — Render Error"
                }),
                o.message,
                `
`,
                o.stack
            ]
        }));
    }
})();
