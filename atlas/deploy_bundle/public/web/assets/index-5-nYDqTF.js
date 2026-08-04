const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./ComparisonTheater-WQJ_Jvf-.js","./vendor-react-OtmnRBTN.js","./vendor-react-three-BEavodTA.js","./vendor-three-Bam-DO-L.js","./vendor-postprocess-qWgy7zq_.js","./AtomsOptimized-DaI6y2ng.js","./App-C1_E5cpR.js"])))=>i.map(i=>d[i]);
import { _ as d, __tla as __tla_0 } from "./vendor-react-three-BEavodTA.js";
import { c as m, j as t, b as u } from "./vendor-react-OtmnRBTN.js";
import "./vendor-three-Bam-DO-L.js";
import "./vendor-postprocess-qWgy7zq_.js";
Promise.all([
    (()=>{
        try {
            return __tla_0;
        } catch  {}
    })()
]).then(async ()=>{
    (function() {
        const i = document.createElement("link").relList;
        if (i && i.supports && i.supports("modulepreload")) return;
        for (const e of document.querySelectorAll('link[rel="modulepreload"]'))a(e);
        new MutationObserver((e)=>{
            for (const r of e)if (r.type === "childList") for (const s of r.addedNodes)s.tagName === "LINK" && s.rel === "modulepreload" && a(s);
        }).observe(document, {
            childList: !0,
            subtree: !0
        });
        function p(e) {
            const r = {};
            return e.integrity && (r.integrity = e.integrity), e.referrerPolicy && (r.referrerPolicy = e.referrerPolicy), e.crossOrigin === "use-credentials" ? r.credentials = "include" : e.crossOrigin === "anonymous" ? r.credentials = "omit" : r.credentials = "same-origin", r;
        }
        function a(e) {
            if (e.ep) return;
            e.ep = !0;
            const r = p(e);
            fetch(e.href, r);
        }
    })();
    console.log("[lupi] Step 1: imports starting");
    let n, l = null;
    const f = new URLSearchParams(window.location.search).get("view") === "compare";
    try {
        f ? (n = (await d(()=>import("./ComparisonTheater-WQJ_Jvf-.js"), __vite__mapDeps([0,1,2,3,4,5]), import.meta.url)).default, console.log("[lupi] Step 2: Comparison Theater imported")) : (n = (await d(()=>import("./App-C1_E5cpR.js").then(async (m)=>{
                await m.__tla;
                return m;
            }).then((i)=>i.e), __vite__mapDeps([6,2,1,3,4,5]), import.meta.url)).default, console.log("[lupi] Step 2: App imported successfully"));
    } catch (o) {
        l = o.message + `
` + (o.stack || ""), console.error("[lupi] Step 2: import FAILED:", o);
    }
    const c = m.createRoot(document.getElementById("root"));
    if (l) c.render(t.jsxs("div", {
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
            l
        ]
    }));
    else try {
        c.render(t.jsx(u.Suspense, {
            fallback: t.jsx("div", {
                style: {
                    color: "#00c8f0",
                    padding: 40
                },
                children: "Loading..."
            }),
            children: t.jsx(n, {})
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
