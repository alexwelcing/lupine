const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./App-CAGJ73pY.js","./vendor-react-three-aPBKrKDH.js","./vendor-react-OtmnRBTN.js","./vendor-three-D2ym6CsH.js","./vendor-postprocess-WgxrzeKQ.js","./App-CNCQb1kB.css"])))=>i.map(i=>d[i]);
import { _ as a, __tla as __tla_0 } from "./vendor-react-three-aPBKrKDH.js";
import { c as u, j as t, b as f } from "./vendor-react-OtmnRBTN.js";
import "./vendor-three-D2ym6CsH.js";
import "./vendor-postprocess-WgxrzeKQ.js";
Promise.all([
    (()=>{
        try {
            return __tla_0;
        } catch  {}
    })()
]).then(async ()=>{
    (function() {
        const s = document.createElement("link").relList;
        if (s && s.supports && s.supports("modulepreload")) return;
        for (const e of document.querySelectorAll('link[rel="modulepreload"]'))l(e);
        new MutationObserver((e)=>{
            for (const r of e)if (r.type === "childList") for (const i of r.addedNodes)i.tagName === "LINK" && i.rel === "modulepreload" && l(i);
        }).observe(document, {
            childList: !0,
            subtree: !0
        });
        function p(e) {
            const r = {};
            return e.integrity && (r.integrity = e.integrity), e.referrerPolicy && (r.referrerPolicy = e.referrerPolicy), e.crossOrigin === "use-credentials" ? r.credentials = "include" : e.crossOrigin === "anonymous" ? r.credentials = "omit" : r.credentials = "same-origin", r;
        }
        function l(e) {
            if (e.ep) return;
            e.ep = !0;
            const r = p(e);
            fetch(e.href, r);
        }
    })();
    console.log("[lupi] Step 1: imports starting");
    let d, n = null;
    try {
        d = (await a(()=>import("./App-CAGJ73pY.js").then(async (m)=>{
                await m.__tla;
                return m;
            }).then((s)=>s.o), __vite__mapDeps([0,1,2,3,4,5]), import.meta.url)).default, console.log("[lupi] Step 2: App imported successfully");
    } catch (o) {
        n = o.message + `
` + (o.stack || ""), console.error("[lupi] Step 2: App import FAILED:", o);
    }
    const c = u.createRoot(document.getElementById("root"));
    if (n) c.render(t.jsxs("div", {
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
                children: "LUPI - Import Error"
            }),
            n
        ]
    }));
    else try {
        c.render(t.jsx(f.Suspense, {
            fallback: t.jsx("div", {
                style: {
                    color: "#00c8f0",
                    padding: 40
                },
                children: "Loading..."
            }),
            children: t.jsx(d, {})
        })), console.log("[lupi] Step 3: root.render() called");
    } catch (o) {
        console.error("[lupi] Step 3: render FAILED:", o), c.render(t.jsxs("div", {
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
                    children: "LUPI - Render Error"
                }),
                o.message,
                `
`,
                o.stack
            ]
        }));
    }
});
