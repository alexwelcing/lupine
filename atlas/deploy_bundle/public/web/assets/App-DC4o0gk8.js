const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-DAvcjLNf.js","./vendor-three-DXS2DCSU.js","./vendor-postprocess-Bo_Yp5T4.js"])))=>i.map(i=>d[i]);
import { I as Xp, J as is, K as Zp, Q as Jp, X as eh, H as y, G as l, Y as th, Z as ss, O as nh, P as Xn, i as Hd, $ as ji, a0 as oh, a1 as rh, a2 as ah, a3 as lh, d as ih, S as Kd, a4 as Yd, a5 as sh, a6 as md, C as cs, R as Xd, U as ch, V as us, h as Ae, a7 as uh, a8 as dh, a9 as fh, W as mh, aa as Zd, L as pd, D as ph, F as hh, ab as Zt, ac as bh, ad as Jd, ae as Wi, r as ef, af as tf, ag as gh, ah as yh, _ as Zn, ai as hd, aj as bd, ak as _a, s as xh, N as gd, al as nf, am as vh, an as Sh, ao as Ch, l as jh, ap as wh, aq as kh } from "./vendor-three-DXS2DCSU.js";
import { E as Ph, R as Mh, N as Fh, D as Th, a as yd, b as Eh, S as zh, c as Ih, M as _h, P as Dh, B as Ah, T as Rh, V as Nh, d as xd, e as Bh } from "./vendor-postprocess-Bo_Yp5T4.js";
let qg, ns, Cr, db;
let __tla = (async ()=>{
    const { useSyncExternalStoreWithSelector: Oh } = Zp, Lh = (a)=>a;
    function Uh(a, r = Lh, s) {
        const u = Oh(a.subscribe, a.getState, a.getInitialState, r, s);
        return is.useDebugValue(u), u;
    }
    const vd = (a, r)=>{
        const s = Xp(a), u = (d, m = r)=>Uh(s, d, m);
        return Object.assign(u, s), u;
    }, of = ((a, r)=>a ? vd(a, r) : vd);
    var Qi = Jp();
    const $h = eh(Qi);
    function ds(a, r, s) {
        if (!a) return;
        if (s(a) === !0) return a;
        let u = r ? a.return : a.child;
        for(; u;){
            const d = ds(u, r, s);
            if (d) return d;
            u = r ? null : u.sibling;
        }
    }
    function rf(a) {
        try {
            return Object.defineProperties(a, {
                _currentRenderer: {
                    get () {
                        return null;
                    },
                    set () {}
                },
                _currentRenderer2: {
                    get () {
                        return null;
                    },
                    set () {}
                }
            });
        } catch  {
            return a;
        }
    }
    const fs = rf(y.createContext(null));
    class af extends y.Component {
        render() {
            return y.createElement(fs.Provider, {
                value: this._reactInternals
            }, this.props.children);
        }
    }
    function lf() {
        const a = y.useContext(fs);
        if (a === null) throw new Error("its-fine: useFiber must be called within a <FiberProvider />!");
        const r = y.useId();
        return y.useMemo(()=>{
            for (const s of [
                a,
                a?.alternate
            ]){
                if (!s) continue;
                const u = ds(s, !1, (d)=>{
                    let m = d.memoizedState;
                    for(; m;){
                        if (m.memoizedState === r) return !0;
                        m = m.next;
                    }
                });
                if (u) return u;
            }
        }, [
            a,
            r
        ]);
    }
    const Gh = Symbol.for("react.context"), Wh = (a)=>a !== null && typeof a == "object" && "$$typeof" in a && a.$$typeof === Gh;
    function Qh() {
        const a = lf(), [r] = y.useState(()=>new Map);
        r.clear();
        let s = a;
        for(; s;){
            const u = s.type;
            Wh(u) && u !== fs && !r.has(u) && r.set(u, y.use(rf(u))), s = s.return;
        }
        return r;
    }
    function Vh() {
        const a = Qh();
        return y.useMemo(()=>Array.from(a.keys()).reduce((r, s)=>(u)=>y.createElement(r, null, y.createElement(s.Provider, {
                        ...u,
                        value: a.get(s)
                    })), (r)=>y.createElement(af, {
                    ...r
                })), [
            a
        ]);
    }
    function sf(a) {
        let r = a.root;
        for(; r.getState().previousRoot;)r = r.getState().previousRoot;
        return r;
    }
    const cf = (a)=>a && a.isOrthographicCamera, qh = (a)=>a && a.hasOwnProperty("current"), Hh = (a)=>a != null && (typeof a == "string" || typeof a == "number" || a.isColor), jr = ((a, r)=>typeof window < "u" && (((a = window.document) == null ? void 0 : a.createElement) || ((r = window.navigator) == null ? void 0 : r.product) === "ReactNative"))() ? y.useLayoutEffect : y.useEffect;
    function ms(a) {
        const r = y.useRef(a);
        return jr(()=>void (r.current = a), [
            a
        ]), r;
    }
    function Kh() {
        const a = lf(), r = Vh();
        return y.useMemo(()=>({ children: s })=>{
                const d = !!ds(a, !0, (m)=>m.type === y.StrictMode) ? y.StrictMode : y.Fragment;
                return l.jsx(d, {
                    children: l.jsx(r, {
                        children: s
                    })
                });
            }, [
            a,
            r
        ]);
    }
    function Yh({ set: a }) {
        return jr(()=>(a(new Promise(()=>null)), ()=>a(!1)), [
            a
        ]), null;
    }
    const Xh = ((a)=>(a = class extends y.Component {
            constructor(...s){
                super(...s), this.state = {
                    error: !1
                };
            }
            componentDidCatch(s) {
                this.props.set(s);
            }
            render() {
                return this.state.error ? null : this.props.children;
            }
        }, a.getDerivedStateFromError = ()=>({
                error: !0
            }), a))();
    function uf(a) {
        var r;
        const s = typeof window < "u" ? (r = window.devicePixelRatio) != null ? r : 2 : 1;
        return Array.isArray(a) ? Math.min(Math.max(a[0], s), a[1]) : a;
    }
    function Eo(a) {
        var r;
        return (r = a.__r3f) == null ? void 0 : r.root.getState();
    }
    const Le = {
        obj: (a)=>a === Object(a) && !Le.arr(a) && typeof a != "function",
        fun: (a)=>typeof a == "function",
        str: (a)=>typeof a == "string",
        num: (a)=>typeof a == "number",
        boo: (a)=>typeof a == "boolean",
        und: (a)=>a === void 0,
        nul: (a)=>a === null,
        arr: (a)=>Array.isArray(a),
        equ (a, r, { arrays: s = "shallow", objects: u = "reference", strict: d = !0 } = {}) {
            if (typeof a != typeof r || !!a != !!r) return !1;
            if (Le.str(a) || Le.num(a) || Le.boo(a)) return a === r;
            const m = Le.obj(a);
            if (m && u === "reference") return a === r;
            const h = Le.arr(a);
            if (h && s === "reference") return a === r;
            if ((h || m) && a === r) return !0;
            let v;
            for(v in a)if (!(v in r)) return !1;
            if (m && s === "shallow" && u === "shallow") {
                for(v in d ? r : a)if (!Le.equ(a[v], r[v], {
                    strict: d,
                    objects: "reference"
                })) return !1;
            } else for(v in d ? r : a)if (a[v] !== r[v]) return !1;
            if (Le.und(v)) {
                if (h && a.length === 0 && r.length === 0 || m && Object.keys(a).length === 0 && Object.keys(r).length === 0) return !0;
                if (a !== r) return !1;
            }
            return !0;
        }
    };
    function Zh(a) {
        a.type !== "Scene" && (a.dispose == null || a.dispose());
        for(const r in a){
            const s = a[r];
            s?.type !== "Scene" && (s == null || s.dispose == null || s.dispose());
        }
    }
    const df = [
        "children",
        "key",
        "ref"
    ];
    function Jh(a) {
        const r = {};
        for(const s in a)df.includes(s) || (r[s] = a[s]);
        return r;
    }
    function Da(a, r, s, u) {
        const d = a;
        let m = d?.__r3f;
        return m || (m = {
            root: r,
            type: s,
            parent: null,
            children: [],
            props: Jh(u),
            object: d,
            eventCount: 0,
            handlers: {},
            isHidden: !1
        }, d && (d.__r3f = m)), m;
    }
    function Sr(a, r) {
        if (!r.includes("-")) return {
            root: a,
            key: r,
            target: a[r]
        };
        if (r in a) return {
            root: a,
            key: r,
            target: a[r]
        };
        let s = a;
        const u = r.split("-");
        for (const d of u){
            if (typeof s != "object" || s === null) {
                if (s !== void 0) {
                    const m = u.slice(u.indexOf(d)).join("-");
                    return {
                        root: s,
                        key: m,
                        target: void 0
                    };
                }
                return {
                    root: a,
                    key: r,
                    target: void 0
                };
            }
            r = d, a = s, s = s[r];
        }
        return {
            root: a,
            key: r,
            target: s
        };
    }
    const Sd = /-\d+$/;
    function Aa(a, r) {
        if (Le.str(r.props.attach)) {
            if (Sd.test(r.props.attach)) {
                const d = r.props.attach.replace(Sd, ""), { root: m, key: h } = Sr(a.object, d);
                Array.isArray(m[h]) || (m[h] = []);
            }
            const { root: s, key: u } = Sr(a.object, r.props.attach);
            r.previousAttach = s[u], s[u] = r.object;
        } else Le.fun(r.props.attach) && (r.previousAttach = r.props.attach(a.object, r.object));
    }
    function Ra(a, r) {
        if (Le.str(r.props.attach)) {
            const { root: s, key: u } = Sr(a.object, r.props.attach), d = r.previousAttach;
            d === void 0 ? delete s[u] : s[u] = d;
        } else r.previousAttach == null || r.previousAttach(a.object, r.object);
        delete r.previousAttach;
    }
    const Vi = [
        ...df,
        "args",
        "dispose",
        "attach",
        "object",
        "onUpdate",
        "dispose"
    ], Cd = new Map;
    function e0(a) {
        let r = Cd.get(a.constructor);
        try {
            r || (r = new a.constructor, Cd.set(a.constructor, r));
        } catch  {}
        return r;
    }
    function t0(a, r) {
        const s = {};
        for(const u in r)if (!Vi.includes(u) && !Le.equ(r[u], a.props[u])) {
            s[u] = r[u];
            for(const d in r)d.startsWith(`${u}-`) && (s[d] = r[d]);
        }
        for(const u in a.props){
            if (Vi.includes(u) || r.hasOwnProperty(u)) continue;
            const { root: d, key: m } = Sr(a.object, u);
            if (d.constructor && d.constructor.length === 0) {
                const h = e0(d);
                Le.und(h) || (s[m] = h[m]);
            } else s[m] = 0;
        }
        return s;
    }
    const n0 = [
        "map",
        "emissiveMap",
        "sheenColorMap",
        "specularColorMap",
        "envMap"
    ], o0 = /^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/;
    function _n(a, r) {
        var s;
        const u = a.__r3f, d = u && sf(u).getState(), m = u?.eventCount;
        for(const v in r){
            let b = r[v];
            if (Vi.includes(v)) continue;
            if (u && o0.test(v)) {
                typeof b == "function" ? u.handlers[v] = b : delete u.handlers[v], u.eventCount = Object.keys(u.handlers).length;
                continue;
            }
            if (b === void 0) continue;
            let { root: C, key: g, target: p } = Sr(a, v);
            if (p === void 0 && (typeof C != "object" || C === null)) throw Error(`R3F: Cannot set "${v}". Ensure it is an object before setting "${g}".`);
            if (p instanceof md && b instanceof md) p.mask = b.mask;
            else if (p instanceof cs && Hh(b)) p.set(b);
            else if (p !== null && typeof p == "object" && typeof p.set == "function" && typeof p.copy == "function" && b != null && b.constructor && p.constructor === b.constructor) p.copy(b);
            else if (p !== null && typeof p == "object" && typeof p.set == "function" && Array.isArray(b)) typeof p.fromArray == "function" ? p.fromArray(b) : p.set(...b);
            else if (p !== null && typeof p == "object" && typeof p.set == "function" && typeof b == "number") typeof p.setScalar == "function" ? p.setScalar(b) : p.set(b);
            else {
                var h;
                C[g] = b, d && !d.linear && n0.includes(g) && (h = C[g]) != null && h.isTexture && C[g].format === Xd && C[g].type === ch && (C[g].colorSpace = Kd);
            }
        }
        if (u != null && u.parent && d != null && d.internal && (s = u.object) != null && s.isObject3D && m !== u.eventCount) {
            const v = u.object, b = d.internal.interaction.indexOf(v);
            b > -1 && d.internal.interaction.splice(b, 1), u.eventCount && v.raycast !== null && d.internal.interaction.push(v);
        }
        return u && u.props.attach === void 0 && (u.object.isBufferGeometry ? u.props.attach = "geometry" : u.object.isMaterial && (u.props.attach = "material")), u && No(u), a;
    }
    function No(a) {
        var r;
        if (!a.parent) return;
        a.props.onUpdate == null || a.props.onUpdate(a.object);
        const s = (r = a.root) == null || r.getState == null ? void 0 : r.getState();
        s && s.internal.frames === 0 && s.invalidate();
    }
    function ff(a, r) {
        a.manual || (cf(a) ? (a.left = r.width / -2, a.right = r.width / 2, a.top = r.height / 2, a.bottom = r.height / -2) : a.aspect = r.width / r.height, a.updateProjectionMatrix());
    }
    const wt = (a)=>a?.isObject3D;
    function Sa(a) {
        return (a.eventObject || a.object).uuid + "/" + a.index + a.instanceId;
    }
    function mf(a, r, s, u) {
        const d = s.get(r);
        d && (s.delete(r), s.size === 0 && (a.delete(u), d.target.releasePointerCapture(u)));
    }
    function r0(a, r) {
        const { internal: s } = a.getState();
        s.interaction = s.interaction.filter((u)=>u !== r), s.initialHits = s.initialHits.filter((u)=>u !== r), s.hovered.forEach((u, d)=>{
            (u.eventObject === r || u.object === r) && s.hovered.delete(d);
        }), s.capturedMap.forEach((u, d)=>{
            mf(s.capturedMap, r, u, d);
        });
    }
    function a0(a) {
        function r(b) {
            const { internal: C } = a.getState(), g = b.offsetX - C.initialClick[0], p = b.offsetY - C.initialClick[1];
            return Math.round(Math.sqrt(g * g + p * p));
        }
        function s(b) {
            return b.filter((C)=>[
                    "Move",
                    "Over",
                    "Enter",
                    "Out",
                    "Leave"
                ].some((g)=>{
                    var p;
                    return (p = C.__r3f) == null ? void 0 : p.handlers["onPointer" + g];
                }));
        }
        function u(b, C) {
            const g = a.getState(), p = new Set, M = [], S = C ? C(g.internal.interaction) : g.internal.interaction;
            for(let w = 0; w < S.length; w++){
                const x = Eo(S[w]);
                x && (x.raycaster.camera = void 0);
            }
            g.previousRoot || g.events.compute == null || g.events.compute(b, g);
            function T(w) {
                const x = Eo(w);
                if (!x || !x.events.enabled || x.raycaster.camera === null) return [];
                if (x.raycaster.camera === void 0) {
                    var D;
                    x.events.compute == null || x.events.compute(b, x, (D = x.previousRoot) == null ? void 0 : D.getState()), x.raycaster.camera === void 0 && (x.raycaster.camera = null);
                }
                return x.raycaster.camera ? x.raycaster.intersectObject(w, !0) : [];
            }
            let j = S.flatMap(T).sort((w, x)=>{
                const D = Eo(w.object), k = Eo(x.object);
                return !D || !k ? w.distance - x.distance : k.events.priority - D.events.priority || w.distance - x.distance;
            }).filter((w)=>{
                const x = Sa(w);
                return p.has(x) ? !1 : (p.add(x), !0);
            });
            g.events.filter && (j = g.events.filter(j, g));
            for (const w of j){
                let x = w.object;
                for(; x;){
                    var F;
                    (F = x.__r3f) != null && F.eventCount && M.push({
                        ...w,
                        eventObject: x
                    }), x = x.parent;
                }
            }
            if ("pointerId" in b && g.internal.capturedMap.has(b.pointerId)) for (let w of g.internal.capturedMap.get(b.pointerId).values())p.has(Sa(w.intersection)) || M.push(w.intersection);
            return M;
        }
        function d(b, C, g, p) {
            if (b.length) {
                const M = {
                    stopped: !1
                };
                for (const S of b){
                    let T = Eo(S.object);
                    if (T || S.object.traverseAncestors((j)=>{
                        const F = Eo(j);
                        if (F) return T = F, !1;
                    }), T) {
                        const { raycaster: j, pointer: F, camera: w, internal: x } = T, D = new Ae(F.x, F.y, 0).unproject(w), k = (O)=>{
                            var N, V;
                            return (N = (V = x.capturedMap.get(O)) == null ? void 0 : V.has(S.eventObject)) != null ? N : !1;
                        }, E = (O)=>{
                            const N = {
                                intersection: S,
                                target: C.target
                            };
                            x.capturedMap.has(O) ? x.capturedMap.get(O).set(S.eventObject, N) : x.capturedMap.set(O, new Map([
                                [
                                    S.eventObject,
                                    N
                                ]
                            ])), C.target.setPointerCapture(O);
                        }, z = (O)=>{
                            const N = x.capturedMap.get(O);
                            N && mf(x.capturedMap, S.eventObject, N, O);
                        };
                        let G = {};
                        for(let O in C){
                            let N = C[O];
                            typeof N != "function" && (G[O] = N);
                        }
                        let _ = {
                            ...S,
                            ...G,
                            pointer: F,
                            intersections: b,
                            stopped: M.stopped,
                            delta: g,
                            unprojectedPoint: D,
                            ray: j.ray,
                            camera: w,
                            stopPropagation () {
                                const O = "pointerId" in C && x.capturedMap.get(C.pointerId);
                                if ((!O || O.has(S.eventObject)) && (_.stopped = M.stopped = !0, x.hovered.size && Array.from(x.hovered.values()).find((N)=>N.eventObject === S.eventObject))) {
                                    const N = b.slice(0, b.indexOf(S));
                                    m([
                                        ...N,
                                        S
                                    ]);
                                }
                            },
                            target: {
                                hasPointerCapture: k,
                                setPointerCapture: E,
                                releasePointerCapture: z
                            },
                            currentTarget: {
                                hasPointerCapture: k,
                                setPointerCapture: E,
                                releasePointerCapture: z
                            },
                            nativeEvent: C
                        };
                        if (p(_), M.stopped === !0) break;
                    }
                }
            }
            return b;
        }
        function m(b) {
            const { internal: C } = a.getState();
            for (const g of C.hovered.values())if (!b.length || !b.find((p)=>p.object === g.object && p.index === g.index && p.instanceId === g.instanceId)) {
                const M = g.eventObject.__r3f;
                if (C.hovered.delete(Sa(g)), M != null && M.eventCount) {
                    const S = M.handlers, T = {
                        ...g,
                        intersections: b
                    };
                    S.onPointerOut == null || S.onPointerOut(T), S.onPointerLeave == null || S.onPointerLeave(T);
                }
            }
        }
        function h(b, C) {
            for(let g = 0; g < C.length; g++){
                const p = C[g].__r3f;
                p == null || p.handlers.onPointerMissed == null || p.handlers.onPointerMissed(b);
            }
        }
        function v(b) {
            switch(b){
                case "onPointerLeave":
                case "onPointerCancel":
                    return ()=>m([]);
                case "onLostPointerCapture":
                    return (C)=>{
                        const { internal: g } = a.getState();
                        "pointerId" in C && g.capturedMap.has(C.pointerId) && requestAnimationFrame(()=>{
                            g.capturedMap.has(C.pointerId) && (g.capturedMap.delete(C.pointerId), m([]));
                        });
                    };
            }
            return function(g) {
                const { onPointerMissed: p, internal: M } = a.getState();
                M.lastEvent.current = g;
                const S = b === "onPointerMove", T = b === "onClick" || b === "onContextMenu" || b === "onDoubleClick", F = u(g, S ? s : void 0), w = T ? r(g) : 0;
                b === "onPointerDown" && (M.initialClick = [
                    g.offsetX,
                    g.offsetY
                ], M.initialHits = F.map((D)=>D.eventObject)), T && !F.length && w <= 2 && (h(g, M.interaction), p && p(g)), S && m(F);
                function x(D) {
                    const k = D.eventObject, E = k.__r3f;
                    if (!(E != null && E.eventCount)) return;
                    const z = E.handlers;
                    if (S) {
                        if (z.onPointerOver || z.onPointerEnter || z.onPointerOut || z.onPointerLeave) {
                            const G = Sa(D), _ = M.hovered.get(G);
                            _ ? _.stopped && D.stopPropagation() : (M.hovered.set(G, D), z.onPointerOver == null || z.onPointerOver(D), z.onPointerEnter == null || z.onPointerEnter(D));
                        }
                        z.onPointerMove == null || z.onPointerMove(D);
                    } else {
                        const G = z[b];
                        G ? (!T || M.initialHits.includes(k)) && (h(g, M.interaction.filter((_)=>!M.initialHits.includes(_))), G(D)) : T && M.initialHits.includes(k) && h(g, M.interaction.filter((_)=>!M.initialHits.includes(_)));
                    }
                }
                d(F, g, w, x);
            };
        }
        return {
            handlePointer: v
        };
    }
    const jd = (a)=>!!(a != null && a.render), ps = y.createContext(null), l0 = (a, r)=>{
        const s = of((v, b)=>{
            const C = new Ae, g = new Ae, p = new Ae;
            function M(w = b().camera, x = g, D = b().size) {
                const { width: k, height: E, top: z, left: G } = D, _ = k / E;
                x.isVector3 ? p.copy(x) : p.set(...x);
                const O = w.getWorldPosition(C).distanceTo(p);
                if (cf(w)) return {
                    width: k / w.zoom,
                    height: E / w.zoom,
                    top: z,
                    left: G,
                    factor: 1,
                    distance: O,
                    aspect: _
                };
                {
                    const N = w.fov * Math.PI / 180, V = 2 * Math.tan(N / 2) * O, K = V * (k / E);
                    return {
                        width: K,
                        height: V,
                        top: z,
                        left: G,
                        factor: k / K,
                        distance: O,
                        aspect: _
                    };
                }
            }
            let S;
            const T = (w)=>v((x)=>({
                        performance: {
                            ...x.performance,
                            current: w
                        }
                    })), j = new us;
            return {
                set: v,
                get: b,
                gl: null,
                camera: null,
                raycaster: null,
                events: {
                    priority: 1,
                    enabled: !0,
                    connected: !1
                },
                scene: null,
                xr: null,
                invalidate: (w = 1)=>a(b(), w),
                advance: (w, x)=>r(w, x, b()),
                legacy: !1,
                linear: !1,
                flat: !1,
                controls: null,
                clock: new uh,
                pointer: j,
                mouse: j,
                frameloop: "always",
                onPointerMissed: void 0,
                performance: {
                    current: 1,
                    min: .5,
                    max: 1,
                    debounce: 200,
                    regress: ()=>{
                        const w = b();
                        S && clearTimeout(S), w.performance.current !== w.performance.min && T(w.performance.min), S = setTimeout(()=>T(b().performance.max), w.performance.debounce);
                    }
                },
                size: {
                    width: 0,
                    height: 0,
                    top: 0,
                    left: 0
                },
                viewport: {
                    initialDpr: 0,
                    dpr: 0,
                    width: 0,
                    height: 0,
                    top: 0,
                    left: 0,
                    aspect: 0,
                    distance: 0,
                    factor: 0,
                    getCurrentViewport: M
                },
                setEvents: (w)=>v((x)=>({
                            ...x,
                            events: {
                                ...x.events,
                                ...w
                            }
                        })),
                setSize: (w, x, D = 0, k = 0)=>{
                    const E = b().camera, z = {
                        width: w,
                        height: x,
                        top: D,
                        left: k
                    };
                    v((G)=>({
                            size: z,
                            viewport: {
                                ...G.viewport,
                                ...M(E, g, z)
                            }
                        }));
                },
                setDpr: (w)=>v((x)=>{
                        const D = uf(w);
                        return {
                            viewport: {
                                ...x.viewport,
                                dpr: D,
                                initialDpr: x.viewport.initialDpr || D
                            }
                        };
                    }),
                setFrameloop: (w = "always")=>{
                    const x = b().clock;
                    x.stop(), x.elapsedTime = 0, w !== "never" && (x.start(), x.elapsedTime = 0), v(()=>({
                            frameloop: w
                        }));
                },
                previousRoot: void 0,
                internal: {
                    interaction: [],
                    hovered: new Map,
                    subscribers: [],
                    initialClick: [
                        0,
                        0
                    ],
                    initialHits: [],
                    capturedMap: new Map,
                    lastEvent: y.createRef(),
                    active: !1,
                    frames: 0,
                    priority: 0,
                    subscribe: (w, x, D)=>{
                        const k = b().internal;
                        return k.priority = k.priority + (x > 0 ? 1 : 0), k.subscribers.push({
                            ref: w,
                            priority: x,
                            store: D
                        }), k.subscribers = k.subscribers.sort((E, z)=>E.priority - z.priority), ()=>{
                            const E = b().internal;
                            E != null && E.subscribers && (E.priority = E.priority - (x > 0 ? 1 : 0), E.subscribers = E.subscribers.filter((z)=>z.ref !== w));
                        };
                    }
                }
            };
        }), u = s.getState();
        let d = u.size, m = u.viewport.dpr, h = u.camera;
        return s.subscribe(()=>{
            const { camera: v, size: b, viewport: C, gl: g, set: p } = s.getState();
            if (b.width !== d.width || b.height !== d.height || C.dpr !== m) {
                d = b, m = C.dpr, ff(v, b), C.dpr > 0 && g.setPixelRatio(C.dpr);
                const M = typeof HTMLCanvasElement < "u" && g.domElement instanceof HTMLCanvasElement;
                g.setSize(b.width, b.height, M);
            }
            v !== h && (h = v, p((M)=>({
                    viewport: {
                        ...M.viewport,
                        ...M.viewport.getCurrentViewport(v)
                    }
                })));
        }), s.subscribe((v)=>a(v)), s;
    };
    function hs() {
        const a = y.useContext(ps);
        if (!a) throw new Error("R3F: Hooks can only be used within the Canvas component!");
        return a;
    }
    function ze(a = (s)=>s, r) {
        return hs()(a, r);
    }
    function mn(a, r = 0) {
        const s = hs(), u = s.getState().internal.subscribe, d = ms(a);
        return jr(()=>u(d, r, s), [
            r,
            u,
            s
        ]), null;
    }
    const i0 = 1, s0 = 8, c0 = 32, u0 = 2;
    var d0 = {
        version: "9.5.0"
    };
    function f0(a) {
        return a && a.__esModule && Object.prototype.hasOwnProperty.call(a, "default") ? a.default : a;
    }
    var wd = {
        exports: {}
    }, kd = {
        exports: {}
    }, Pd;
    function m0() {
        return Pd || (Pd = 1, (function(a) {
            a.exports = function(r) {
                function s(e, t, n, o) {
                    return new nm(e, t, n, o);
                }
                function u() {}
                function d(e) {
                    var t = "https://react.dev/errors/" + e;
                    if (1 < arguments.length) {
                        t += "?args[]=" + encodeURIComponent(arguments[1]);
                        for(var n = 2; n < arguments.length; n++)t += "&args[]=" + encodeURIComponent(arguments[n]);
                    }
                    return "Minified React error #" + e + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
                }
                function m(e) {
                    var t = e, n = e;
                    if (e.alternate) for(; t.return;)t = t.return;
                    else {
                        e = t;
                        do t = e, (t.flags & 4098) !== 0 && (n = t.return), e = t.return;
                        while (e);
                    }
                    return t.tag === 3 ? n : null;
                }
                function h(e) {
                    if (m(e) !== e) throw Error(d(188));
                }
                function v(e) {
                    var t = e.alternate;
                    if (!t) {
                        if (t = m(e), t === null) throw Error(d(188));
                        return t !== e ? null : e;
                    }
                    for(var n = e, o = t;;){
                        var i = n.return;
                        if (i === null) break;
                        var c = i.alternate;
                        if (c === null) {
                            if (o = i.return, o !== null) {
                                n = o;
                                continue;
                            }
                            break;
                        }
                        if (i.child === c.child) {
                            for(c = i.child; c;){
                                if (c === n) return h(i), e;
                                if (c === o) return h(i), t;
                                c = c.sibling;
                            }
                            throw Error(d(188));
                        }
                        if (n.return !== o.return) n = i, o = c;
                        else {
                            for(var f = !1, P = i.child; P;){
                                if (P === n) {
                                    f = !0, n = i, o = c;
                                    break;
                                }
                                if (P === o) {
                                    f = !0, o = i, n = c;
                                    break;
                                }
                                P = P.sibling;
                            }
                            if (!f) {
                                for(P = c.child; P;){
                                    if (P === n) {
                                        f = !0, n = c, o = i;
                                        break;
                                    }
                                    if (P === o) {
                                        f = !0, o = c, n = i;
                                        break;
                                    }
                                    P = P.sibling;
                                }
                                if (!f) throw Error(d(189));
                            }
                        }
                        if (n.alternate !== o) throw Error(d(190));
                    }
                    if (n.tag !== 3) throw Error(d(188));
                    return n.stateNode.current === n ? e : t;
                }
                function b(e) {
                    var t = e.tag;
                    if (t === 5 || t === 26 || t === 27 || t === 6) return e;
                    for(e = e.child; e !== null;){
                        if (t = b(e), t !== null) return t;
                        e = e.sibling;
                    }
                    return null;
                }
                function C(e) {
                    var t = e.tag;
                    if (t === 5 || t === 26 || t === 27 || t === 6) return e;
                    for(e = e.child; e !== null;){
                        if (e.tag !== 4 && (t = C(e), t !== null)) return t;
                        e = e.sibling;
                    }
                    return null;
                }
                function g(e) {
                    return e === null || typeof e != "object" ? null : (e = Iu && e[Iu] || e["@@iterator"], typeof e == "function" ? e : null);
                }
                function p(e) {
                    if (e == null) return null;
                    if (typeof e == "function") return e.$$typeof === im ? null : e.displayName || e.name || null;
                    if (typeof e == "string") return e;
                    switch(e){
                        case co:
                            return "Fragment";
                        case Gl:
                            return "Profiler";
                        case Eu:
                            return "StrictMode";
                        case Ql:
                            return "Suspense";
                        case Vl:
                            return "SuspenseList";
                        case Hl:
                            return "Activity";
                    }
                    if (typeof e == "object") switch(e.$$typeof){
                        case so:
                            return "Portal";
                        case vn:
                            return e.displayName || "Context";
                        case zu:
                            return (e._context.displayName || "Context") + ".Consumer";
                        case Wl:
                            var t = e.render;
                            return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
                        case ql:
                            return t = e.displayName || null, t !== null ? t : p(e.type) || "Memo";
                        case Sn:
                            t = e._payload, e = e._init;
                            try {
                                return p(e(t));
                            } catch  {}
                    }
                    return null;
                }
                function M(e) {
                    return {
                        current: e
                    };
                }
                function S(e) {
                    0 > mo || (e.current = ei[mo], ei[mo] = null, mo--);
                }
                function T(e, t) {
                    mo++, ei[mo] = e.current, e.current = t;
                }
                function j(e) {
                    return e >>>= 0, e === 0 ? 32 : 31 - (Ap(e) / Rp | 0) | 0;
                }
                function F(e) {
                    var t = e & 42;
                    if (t !== 0) return t;
                    switch(e & -e){
                        case 1:
                            return 1;
                        case 2:
                            return 2;
                        case 4:
                            return 4;
                        case 8:
                            return 8;
                        case 16:
                            return 16;
                        case 32:
                            return 32;
                        case 64:
                            return 64;
                        case 128:
                            return 128;
                        case 256:
                        case 512:
                        case 1024:
                        case 2048:
                        case 4096:
                        case 8192:
                        case 16384:
                        case 32768:
                        case 65536:
                        case 131072:
                            return e & 261888;
                        case 262144:
                        case 524288:
                        case 1048576:
                        case 2097152:
                            return e & 3932160;
                        case 4194304:
                        case 8388608:
                        case 16777216:
                        case 33554432:
                            return e & 62914560;
                        case 67108864:
                            return 67108864;
                        case 134217728:
                            return 134217728;
                        case 268435456:
                            return 268435456;
                        case 536870912:
                            return 536870912;
                        case 1073741824:
                            return 0;
                        default:
                            return e;
                    }
                }
                function w(e, t, n) {
                    var o = e.pendingLanes;
                    if (o === 0) return 0;
                    var i = 0, c = e.suspendedLanes, f = e.pingedLanes;
                    e = e.warmLanes;
                    var P = o & 134217727;
                    return P !== 0 ? (o = P & ~c, o !== 0 ? i = F(o) : (f &= P, f !== 0 ? i = F(f) : n || (n = P & ~e, n !== 0 && (i = F(n))))) : (P = o & ~c, P !== 0 ? i = F(P) : f !== 0 ? i = F(f) : n || (n = o & ~e, n !== 0 && (i = F(n)))), i === 0 ? 0 : t !== 0 && t !== i && (t & c) === 0 && (c = i & -i, n = t & -t, c >= n || c === 32 && (n & 4194048) !== 0) ? t : i;
                }
                function x(e, t) {
                    return (e.pendingLanes & ~(e.suspendedLanes & ~e.pingedLanes) & t) === 0;
                }
                function D(e, t) {
                    switch(e){
                        case 1:
                        case 2:
                        case 4:
                        case 8:
                        case 64:
                            return t + 250;
                        case 16:
                        case 32:
                        case 128:
                        case 256:
                        case 512:
                        case 1024:
                        case 2048:
                        case 4096:
                        case 8192:
                        case 16384:
                        case 32768:
                        case 65536:
                        case 131072:
                        case 262144:
                        case 524288:
                        case 1048576:
                        case 2097152:
                            return t + 5e3;
                        case 4194304:
                        case 8388608:
                        case 16777216:
                        case 33554432:
                            return -1;
                        case 67108864:
                        case 134217728:
                        case 268435456:
                        case 536870912:
                        case 1073741824:
                            return -1;
                        default:
                            return -1;
                    }
                }
                function k() {
                    var e = na;
                    return na <<= 1, (na & 62914560) === 0 && (na = 4194304), e;
                }
                function E(e) {
                    for(var t = [], n = 0; 31 > n; n++)t.push(e);
                    return t;
                }
                function z(e, t) {
                    e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
                }
                function G(e, t, n, o, i, c) {
                    var f = e.pendingLanes;
                    e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
                    var P = e.entanglements, U = e.expirationTimes, W = e.hiddenUpdates;
                    for(n = f & ~n; 0 < n;){
                        var Y = 31 - Et(n), q = 1 << Y;
                        P[Y] = 0, U[Y] = -1;
                        var ee = W[Y];
                        if (ee !== null) for(W[Y] = null, Y = 0; Y < ee.length; Y++){
                            var ue = ee[Y];
                            ue !== null && (ue.lane &= -536870913);
                        }
                        n &= ~q;
                    }
                    o !== 0 && _(e, o, 0), c !== 0 && i === 0 && e.tag !== 0 && (e.suspendedLanes |= c & ~(f & ~t));
                }
                function _(e, t, n) {
                    e.pendingLanes |= t, e.suspendedLanes &= ~t;
                    var o = 31 - Et(t);
                    e.entangledLanes |= t, e.entanglements[o] = e.entanglements[o] | 1073741824 | n & 261930;
                }
                function O(e, t) {
                    var n = e.entangledLanes |= t;
                    for(e = e.entanglements; n;){
                        var o = 31 - Et(n), i = 1 << o;
                        i & t | e[o] & t && (e[o] |= t), n &= ~i;
                    }
                }
                function N(e, t) {
                    var n = t & -t;
                    return n = (n & 42) !== 0 ? 1 : V(n), (n & (e.suspendedLanes | t)) !== 0 ? 0 : n;
                }
                function V(e) {
                    switch(e){
                        case 2:
                            e = 1;
                            break;
                        case 8:
                            e = 4;
                            break;
                        case 32:
                            e = 16;
                            break;
                        case 256:
                        case 512:
                        case 1024:
                        case 2048:
                        case 4096:
                        case 8192:
                        case 16384:
                        case 32768:
                        case 65536:
                        case 131072:
                        case 262144:
                        case 524288:
                        case 1048576:
                        case 2097152:
                        case 4194304:
                        case 8388608:
                        case 16777216:
                        case 33554432:
                            e = 128;
                            break;
                        case 268435456:
                            e = 134217728;
                            break;
                        default:
                            e = 0;
                    }
                    return e;
                }
                function K(e) {
                    return e &= -e, 2 < e ? 8 < e ? (e & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
                }
                function Q(e) {
                    if (typeof Up == "function" && $p(e), zt && typeof zt.setStrictMode == "function") try {
                        zt.setStrictMode(er, e);
                    } catch  {}
                }
                function Z(e, t) {
                    return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
                }
                function J(e) {
                    if (oi === void 0) try {
                        throw Error();
                    } catch (n) {
                        var t = n.stack.trim().match(/\n( *(at )?)/);
                        oi = t && t[1] || "", rd = -1 < n.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < n.stack.indexOf("@") ? "@unknown:0:0" : "";
                    }
                    return `
` + oi + e + rd;
                }
                function A(e, t) {
                    if (!e || ri) return "";
                    ri = !0;
                    var n = Error.prepareStackTrace;
                    Error.prepareStackTrace = void 0;
                    try {
                        var o = {
                            DetermineComponentFrameRoot: function() {
                                try {
                                    if (t) {
                                        var q = function() {
                                            throw Error();
                                        };
                                        if (Object.defineProperty(q.prototype, "props", {
                                            set: function() {
                                                throw Error();
                                            }
                                        }), typeof Reflect == "object" && Reflect.construct) {
                                            try {
                                                Reflect.construct(q, []);
                                            } catch (ue) {
                                                var ee = ue;
                                            }
                                            Reflect.construct(e, [], q);
                                        } else {
                                            try {
                                                q.call();
                                            } catch (ue) {
                                                ee = ue;
                                            }
                                            e.call(q.prototype);
                                        }
                                    } else {
                                        try {
                                            throw Error();
                                        } catch (ue) {
                                            ee = ue;
                                        }
                                        (q = e()) && typeof q.catch == "function" && q.catch(function() {});
                                    }
                                } catch (ue) {
                                    if (ue && ee && typeof ue.stack == "string") return [
                                        ue.stack,
                                        ee.stack
                                    ];
                                }
                                return [
                                    null,
                                    null
                                ];
                            }
                        };
                        o.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
                        var i = Object.getOwnPropertyDescriptor(o.DetermineComponentFrameRoot, "name");
                        i && i.configurable && Object.defineProperty(o.DetermineComponentFrameRoot, "name", {
                            value: "DetermineComponentFrameRoot"
                        });
                        var c = o.DetermineComponentFrameRoot(), f = c[0], P = c[1];
                        if (f && P) {
                            var U = f.split(`
`), W = P.split(`
`);
                            for(i = o = 0; o < U.length && !U[o].includes("DetermineComponentFrameRoot");)o++;
                            for(; i < W.length && !W[i].includes("DetermineComponentFrameRoot");)i++;
                            if (o === U.length || i === W.length) for(o = U.length - 1, i = W.length - 1; 1 <= o && 0 <= i && U[o] !== W[i];)i--;
                            for(; 1 <= o && 0 <= i; o--, i--)if (U[o] !== W[i]) {
                                if (o !== 1 || i !== 1) do if (o--, i--, 0 > i || U[o] !== W[i]) {
                                    var Y = `
` + U[o].replace(" at new ", " at ");
                                    return e.displayName && Y.includes("<anonymous>") && (Y = Y.replace("<anonymous>", e.displayName)), Y;
                                }
                                while (1 <= o && 0 <= i);
                                break;
                            }
                        }
                    } finally{
                        ri = !1, Error.prepareStackTrace = n;
                    }
                    return (n = e ? e.displayName || e.name : "") ? J(n) : "";
                }
                function oe(e, t) {
                    switch(e.tag){
                        case 26:
                        case 27:
                        case 5:
                            return J(e.type);
                        case 16:
                            return J("Lazy");
                        case 13:
                            return e.child !== t && t !== null ? J("Suspense Fallback") : J("Suspense");
                        case 19:
                            return J("SuspenseList");
                        case 0:
                        case 15:
                            return A(e.type, !1);
                        case 11:
                            return A(e.type.render, !1);
                        case 1:
                            return A(e.type, !0);
                        case 31:
                            return J("Activity");
                        default:
                            return "";
                    }
                }
                function fe(e) {
                    try {
                        var t = "", n = null;
                        do t += oe(e, n), n = e, e = e.return;
                        while (e);
                        return t;
                    } catch (o) {
                        return `
Error generating stack: ` + o.message + `
` + o.stack;
                    }
                }
                function X(e, t) {
                    if (typeof e == "object" && e !== null) {
                        var n = ad.get(e);
                        return n !== void 0 ? n : (t = {
                            value: e,
                            source: t,
                            stack: fe(t)
                        }, ad.set(e, t), t);
                    }
                    return {
                        value: e,
                        source: t,
                        stack: fe(t)
                    };
                }
                function ne(e, t) {
                    ho[bo++] = tr, ho[bo++] = ra, ra = e, tr = t;
                }
                function re(e, t, n) {
                    Nt[Bt++] = Yt, Nt[Bt++] = Xt, Nt[Bt++] = Cn, Cn = e;
                    var o = Yt;
                    e = Xt;
                    var i = 32 - Et(o) - 1;
                    o &= ~(1 << i), n += 1;
                    var c = 32 - Et(t) + i;
                    if (30 < c) {
                        var f = i - i % 5;
                        c = (o & (1 << f) - 1).toString(32), o >>= f, i -= f, Yt = 1 << 32 - Et(t) + i | n << i | o, Xt = c + e;
                    } else Yt = 1 << c | n << i | o, Xt = e;
                }
                function ae(e) {
                    e.return !== null && (ne(e, 1), re(e, 1, 0));
                }
                function Se(e) {
                    for(; e === ra;)ra = ho[--bo], ho[bo] = null, tr = ho[--bo], ho[bo] = null;
                    for(; e === Cn;)Cn = Nt[--Bt], Nt[Bt] = null, Xt = Nt[--Bt], Nt[Bt] = null, Yt = Nt[--Bt], Nt[Bt] = null;
                }
                function ye(e, t) {
                    Nt[Bt++] = Yt, Nt[Bt++] = Xt, Nt[Bt++] = Cn, Yt = t.id, Xt = t.overflow, Cn = e;
                }
                function Me(e, t) {
                    T(jn, t), T(nr, e), T(st, null), e = um(t), S(st), T(st, e);
                }
                function Ue() {
                    S(st), S(nr), S(jn);
                }
                function De(e) {
                    e.memoizedState !== null && T(aa, e);
                    var t = st.current, n = dm(t, e.type);
                    t !== n && (T(nr, e), T(st, n));
                }
                function kt(e) {
                    nr.current === e && (S(st), S(nr)), aa.current === e && (S(aa), rn ? Un._currentValue = uo : Un._currentValue2 = uo);
                }
                function je(e) {
                    var t = Error(d(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", ""));
                    throw L(X(t, e)), ai;
                }
                function se(e, t) {
                    if (!mt) throw Error(d(175));
                    dp(e.stateNode, e.type, e.memoizedProps, t, e) || je(e, !0);
                }
                function nt(e) {
                    for(ct = e.return; ct;)switch(ct.tag){
                        case 5:
                        case 31:
                        case 13:
                            Ot = !1;
                            return;
                        case 27:
                        case 3:
                            Ot = !0;
                            return;
                        default:
                            ct = ct.return;
                    }
                }
                function Re(e) {
                    if (!mt || e !== ct) return !1;
                    if (!ve) return nt(e), ve = !0, !1;
                    var t = e.tag;
                    if (et ? t !== 3 && t !== 27 && (t !== 5 || Qu(e.type) && !Jr(e.type, e.memoizedProps)) && Ne && je(e) : t !== 3 && (t !== 5 || Qu(e.type) && !Jr(e.type, e.memoizedProps)) && Ne && je(e), nt(e), t === 13) {
                        if (!mt) throw Error(d(316));
                        if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(d(317));
                        Ne = bp(e);
                    } else if (t === 31) {
                        if (e = e.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(d(317));
                        Ne = hp(e);
                    } else Ne = et && t === 27 ? tp(e.type, Ne) : ct ? Wu(e.stateNode) : null;
                    return !0;
                }
                function qe() {
                    mt && (Ne = ct = null, ve = !1);
                }
                function lt() {
                    var e = wn;
                    return e !== null && (Ct === null ? Ct = e : Ct.push.apply(Ct, e), wn = null), e;
                }
                function L(e) {
                    wn === null ? wn = [
                        e
                    ] : wn.push(e);
                }
                function te(e, t, n) {
                    rn ? (T(la, t._currentValue), t._currentValue = n) : (T(la, t._currentValue2), t._currentValue2 = n);
                }
                function Ie(e) {
                    var t = la.current;
                    rn ? e._currentValue = t : e._currentValue2 = t, S(la);
                }
                function xe(e, t, n) {
                    for(; e !== null;){
                        var o = e.alternate;
                        if ((e.childLanes & t) !== t ? (e.childLanes |= t, o !== null && (o.childLanes |= t)) : o !== null && (o.childLanes & t) !== t && (o.childLanes |= t), e === n) break;
                        e = e.return;
                    }
                }
                function me(e, t, n, o) {
                    var i = e.child;
                    for(i !== null && (i.return = e); i !== null;){
                        var c = i.dependencies;
                        if (c !== null) {
                            var f = i.child;
                            c = c.firstContext;
                            e: for(; c !== null;){
                                var P = c;
                                c = i;
                                for(var U = 0; U < t.length; U++)if (P.context === t[U]) {
                                    c.lanes |= n, P = c.alternate, P !== null && (P.lanes |= n), xe(c.return, n, e), o || (f = null);
                                    break e;
                                }
                                c = P.next;
                            }
                        } else if (i.tag === 18) {
                            if (f = i.return, f === null) throw Error(d(341));
                            f.lanes |= n, c = f.alternate, c !== null && (c.lanes |= n), xe(f, n, e), f = null;
                        } else f = i.child;
                        if (f !== null) f.return = i;
                        else for(f = i; f !== null;){
                            if (f === e) {
                                f = null;
                                break;
                            }
                            if (i = f.sibling, i !== null) {
                                i.return = f.return, f = i;
                                break;
                            }
                            f = f.return;
                        }
                        i = f;
                    }
                }
                function He(e, t, n, o) {
                    e = null;
                    for(var i = t, c = !1; i !== null;){
                        if (!c) {
                            if ((i.flags & 524288) !== 0) c = !0;
                            else if ((i.flags & 262144) !== 0) break;
                        }
                        if (i.tag === 10) {
                            var f = i.alternate;
                            if (f === null) throw Error(d(387));
                            if (f = f.memoizedProps, f !== null) {
                                var P = i.type;
                                It(i.pendingProps.value, f.value) || (e !== null ? e.push(P) : e = [
                                    P
                                ]);
                            }
                        } else if (i === aa.current) {
                            if (f = i.alternate, f === null) throw Error(d(387));
                            f.memoizedState.memoizedState !== i.memoizedState.memoizedState && (e !== null ? e.push(Un) : e = [
                                Un
                            ]);
                        }
                        i = i.return;
                    }
                    e !== null && me(t, e, n, o), t.flags |= 262144;
                }
                function ut(e) {
                    for(e = e.firstContext; e !== null;){
                        var t = e.context;
                        if (!It(rn ? t._currentValue : t._currentValue2, e.memoizedValue)) return !0;
                        e = e.next;
                    }
                    return !1;
                }
                function $e(e) {
                    $n = e, ln = null, e = e.dependencies, e !== null && (e.firstContext = null);
                }
                function Ce(e) {
                    return Pt($n, e);
                }
                function gt(e, t) {
                    return $n === null && $e(e), Pt(e, t);
                }
                function Pt(e, t) {
                    var n = rn ? t._currentValue : t._currentValue2;
                    if (t = {
                        context: t,
                        memoizedValue: n,
                        next: null
                    }, ln === null) {
                        if (e === null) throw Error(d(308));
                        ln = t, e.dependencies = {
                            lanes: 0,
                            firstContext: t
                        }, e.flags |= 524288;
                    } else ln = ln.next = t;
                    return n;
                }
                function Rt() {
                    return {
                        controller: new Wp,
                        data: new Map,
                        refCount: 0
                    };
                }
                function yt(e) {
                    e.refCount--, e.refCount === 0 && Qp(Vp, function() {
                        e.controller.abort();
                    });
                }
                function wr() {}
                function qt(e) {
                    e !== go && e.next === null && (go === null ? ia = go = e : go = go.next = e), sa = !0, li || (li = !0, If());
                }
                function oo(e, t) {
                    if (!ii && sa) {
                        ii = !0;
                        do for(var n = !1, o = ia; o !== null;){
                            if (e !== 0) {
                                var i = o.pendingLanes;
                                if (i === 0) var c = 0;
                                else {
                                    var f = o.suspendedLanes, P = o.pingedLanes;
                                    c = (1 << 31 - Et(42 | e) + 1) - 1, c &= i & ~(f & ~P), c = c & 201326741 ? c & 201326741 | 1 : c ? c | 2 : 0;
                                }
                                c !== 0 && (n = !0, js(o, c));
                            } else c = ge, c = w(o, o === Ee ? c : 0, o.cancelPendingCommit !== null || o.timeoutHandle !== Ln), (c & 3) === 0 || x(o, c) || (n = !0, js(o, c));
                            o = o.next;
                        }
                        while (n);
                        ii = !1;
                    }
                }
                function xs() {
                    vs();
                }
                function vs() {
                    sa = li = !1;
                    var e = 0;
                    Gn !== 0 && vm() && (e = Gn);
                    for(var t = vt(), n = null, o = ia; o !== null;){
                        var i = o.next, c = Ss(o, t);
                        c === 0 ? (o.next = null, n === null ? ia = i : n.next = i, i === null && (go = n)) : (n = o, (e !== 0 || (c & 3) !== 0) && (sa = !0)), o = i;
                    }
                    tt !== 0 && tt !== 5 || oo(e), Gn !== 0 && (Gn = 0);
                }
                function Ss(e, t) {
                    for(var n = e.suspendedLanes, o = e.pingedLanes, i = e.expirationTimes, c = e.pendingLanes & -62914561; 0 < c;){
                        var f = 31 - Et(c), P = 1 << f, U = i[f];
                        U === -1 ? ((P & n) === 0 || (P & o) !== 0) && (i[f] = D(P, t)) : U <= t && (e.expiredLanes |= P), c &= ~P;
                    }
                    if (t = Ee, n = ge, n = w(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== Ln), o = e.callbackNode, n === 0 || e === t && (Fe === 2 || Fe === 9) || e.cancelPendingCommit !== null) return o !== null && o !== null && ti(o), e.callbackNode = null, e.callbackPriority = 0;
                    if ((n & 3) === 0 || x(e, n)) {
                        if (t = n & -n, t === e.callbackPriority) return t;
                        switch(o !== null && ti(o), K(n)){
                            case 2:
                            case 8:
                                n = Op;
                                break;
                            case 32:
                                n = ni;
                                break;
                            case 268435456:
                                n = Lp;
                                break;
                            default:
                                n = ni;
                        }
                        return o = Cs.bind(null, e), n = oa(n, o), e.callbackPriority = t, e.callbackNode = n, t;
                    }
                    return o !== null && o !== null && ti(o), e.callbackPriority = 2, e.callbackNode = null, 2;
                }
                function Cs(e, t) {
                    if (tt !== 0 && tt !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
                    var n = e.callbackNode;
                    if (Yo() && e.callbackNode !== n) return null;
                    var o = ge;
                    return o = w(e, e === Ee ? o : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== Ln), o === 0 ? null : (au(e, o, t), Ss(e, vt()), e.callbackNode != null && e.callbackNode === n ? Cs.bind(null, e) : null);
                }
                function js(e, t) {
                    if (Yo()) return null;
                    au(e, t, !0);
                }
                function If() {
                    Mm ? Fm(function() {
                        (he & 6) !== 0 ? oa(nd, xs) : vs();
                    }) : oa(nd, xs);
                }
                function Ga() {
                    if (Gn === 0) {
                        var e = yo;
                        e === 0 && (e = ea, ea <<= 1, (ea & 261888) === 0 && (ea = 256)), Gn = e;
                    }
                    return Gn;
                }
                function _f(e, t) {
                    if (or === null) {
                        var n = or = [];
                        si = 0, yo = Ga(), xo = {
                            status: "pending",
                            value: void 0,
                            then: function(o) {
                                n.push(o);
                            }
                        };
                    }
                    return si++, t.then(ws, ws), t;
                }
                function ws() {
                    if (--si === 0 && or !== null) {
                        xo !== null && (xo.status = "fulfilled");
                        var e = or;
                        or = null, yo = 0, xo = null;
                        for(var t = 0; t < e.length; t++)(0, e[t])();
                    }
                }
                function Df(e, t) {
                    var n = [], o = {
                        status: "pending",
                        value: null,
                        reason: null,
                        then: function(i) {
                            n.push(i);
                        }
                    };
                    return e.then(function() {
                        o.status = "fulfilled", o.value = t;
                        for(var i = 0; i < n.length; i++)(0, n[i])(t);
                    }, function(i) {
                        for(o.status = "rejected", o.reason = i, i = 0; i < n.length; i++)(0, n[i])(void 0);
                    }), o;
                }
                function Wa() {
                    var e = Wn.current;
                    return e !== null ? e : Ee.pooledCache;
                }
                function kr(e, t) {
                    t === null ? T(Wn, Wn.current) : T(Wn, t.pool);
                }
                function ks() {
                    var e = Wa();
                    return e === null ? null : {
                        parent: rn ? Be._currentValue : Be._currentValue2,
                        pool: e
                    };
                }
                function Pr(e, t) {
                    if (It(e, t)) return !0;
                    if (typeof e != "object" || e === null || typeof t != "object" || t === null) return !1;
                    var n = Object.keys(e), o = Object.keys(t);
                    if (n.length !== o.length) return !1;
                    for(o = 0; o < n.length; o++){
                        var i = n[o];
                        if (!Gp.call(t, i) || !It(e[i], t[i])) return !1;
                    }
                    return !0;
                }
                function Ps(e) {
                    return e = e.status, e === "fulfilled" || e === "rejected";
                }
                function Ms(e, t, n) {
                    switch(n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(wr, wr), t = n), t.status){
                        case "fulfilled":
                            return t.value;
                        case "rejected":
                            throw e = t.reason, Ts(e), e;
                        default:
                            if (typeof t.status == "string") t.then(wr, wr);
                            else {
                                if (e = Ee, e !== null && 100 < e.shellSuspendCounter) throw Error(d(482));
                                e = t, e.status = "pending", e.then(function(o) {
                                    if (t.status === "pending") {
                                        var i = t;
                                        i.status = "fulfilled", i.value = o;
                                    }
                                }, function(o) {
                                    if (t.status === "pending") {
                                        var i = t;
                                        i.status = "rejected", i.reason = o;
                                    }
                                });
                            }
                            switch(t.status){
                                case "fulfilled":
                                    return t.value;
                                case "rejected":
                                    throw e = t.reason, Ts(e), e;
                            }
                            throw Qn = t, vo;
                    }
                }
                function Dn(e) {
                    try {
                        var t = e._init;
                        return t(e._payload);
                    } catch (n) {
                        throw n !== null && typeof n == "object" && typeof n.then == "function" ? (Qn = n, vo) : n;
                    }
                }
                function Fs() {
                    if (Qn === null) throw Error(d(459));
                    var e = Qn;
                    return Qn = null, e;
                }
                function Ts(e) {
                    if (e === vo || e === ca) throw Error(d(483));
                }
                function Mr(e) {
                    var t = rr;
                    return rr += 1, So === null && (So = []), Ms(So, e, t);
                }
                function Bo(e, t) {
                    t = t.props.ref, e.ref = t !== void 0 ? t : null;
                }
                function Fr(e, t) {
                    throw t.$$typeof === am ? Error(d(525)) : (e = Object.prototype.toString.call(t), Error(d(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
                }
                function Es(e) {
                    function t(R, I) {
                        if (e) {
                            var B = R.deletions;
                            B === null ? (R.deletions = [
                                I
                            ], R.flags |= 16) : B.push(I);
                        }
                    }
                    function n(R, I) {
                        if (!e) return null;
                        for(; I !== null;)t(R, I), I = I.sibling;
                        return null;
                    }
                    function o(R) {
                        for(var I = new Map; R !== null;)R.key !== null ? I.set(R.key, R) : I.set(R.index, R), R = R.sibling;
                        return I;
                    }
                    function i(R, I) {
                        return R = on(R, I), R.index = 0, R.sibling = null, R;
                    }
                    function c(R, I, B) {
                        return R.index = B, e ? (B = R.alternate, B !== null ? (B = B.index, B < I ? (R.flags |= 67108866, I) : B) : (R.flags |= 67108866, I)) : (R.flags |= 1048576, I);
                    }
                    function f(R) {
                        return e && R.alternate === null && (R.flags |= 67108866), R;
                    }
                    function P(R, I, B, H) {
                        return I === null || I.tag !== 6 ? (I = Ol(B, R.mode, H), I.return = R, I) : (I = i(I, B), I.return = R, I);
                    }
                    function U(R, I, B, H) {
                        var ie = B.type;
                        return ie === co ? Y(R, I, B.props.children, H, B.key) : I !== null && (I.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === Sn && Dn(ie) === I.type) ? (I = i(I, B.props), Bo(I, B), I.return = R, I) : (I = Yr(B.type, B.key, B.props, null, R.mode, H), Bo(I, B), I.return = R, I);
                    }
                    function W(R, I, B, H) {
                        return I === null || I.tag !== 4 || I.stateNode.containerInfo !== B.containerInfo || I.stateNode.implementation !== B.implementation ? (I = Ll(B, R.mode, H), I.return = R, I) : (I = i(I, B.children || []), I.return = R, I);
                    }
                    function Y(R, I, B, H, ie) {
                        return I === null || I.tag !== 7 ? (I = On(B, R.mode, H, ie), I.return = R, I) : (I = i(I, B), I.return = R, I);
                    }
                    function q(R, I, B) {
                        if (typeof I == "string" && I !== "" || typeof I == "number" || typeof I == "bigint") return I = Ol("" + I, R.mode, B), I.return = R, I;
                        if (typeof I == "object" && I !== null) {
                            switch(I.$$typeof){
                                case Xr:
                                    return B = Yr(I.type, I.key, I.props, null, R.mode, B), Bo(B, I), B.return = R, B;
                                case so:
                                    return I = Ll(I, R.mode, B), I.return = R, I;
                                case Sn:
                                    return I = Dn(I), q(R, I, B);
                            }
                            if (Zr(I) || g(I)) return I = On(I, R.mode, B, null), I.return = R, I;
                            if (typeof I.then == "function") return q(R, Mr(I), B);
                            if (I.$$typeof === vn) return q(R, gt(R, I), B);
                            Fr(R, I);
                        }
                        return null;
                    }
                    function ee(R, I, B, H) {
                        var ie = I !== null ? I.key : null;
                        if (typeof B == "string" && B !== "" || typeof B == "number" || typeof B == "bigint") return ie !== null ? null : P(R, I, "" + B, H);
                        if (typeof B == "object" && B !== null) {
                            switch(B.$$typeof){
                                case Xr:
                                    return B.key === ie ? U(R, I, B, H) : null;
                                case so:
                                    return B.key === ie ? W(R, I, B, H) : null;
                                case Sn:
                                    return B = Dn(B), ee(R, I, B, H);
                            }
                            if (Zr(B) || g(B)) return ie !== null ? null : Y(R, I, B, H, null);
                            if (typeof B.then == "function") return ee(R, I, Mr(B), H);
                            if (B.$$typeof === vn) return ee(R, I, gt(R, B), H);
                            Fr(R, B);
                        }
                        return null;
                    }
                    function ue(R, I, B, H, ie) {
                        if (typeof H == "string" && H !== "" || typeof H == "number" || typeof H == "bigint") return R = R.get(B) || null, P(I, R, "" + H, ie);
                        if (typeof H == "object" && H !== null) {
                            switch(H.$$typeof){
                                case Xr:
                                    return R = R.get(H.key === null ? B : H.key) || null, U(I, R, H, ie);
                                case so:
                                    return R = R.get(H.key === null ? B : H.key) || null, W(I, R, H, ie);
                                case Sn:
                                    return H = Dn(H), ue(R, I, B, H, ie);
                            }
                            if (Zr(H) || g(H)) return R = R.get(B) || null, Y(I, R, H, ie, null);
                            if (typeof H.then == "function") return ue(R, I, B, Mr(H), ie);
                            if (H.$$typeof === vn) return ue(R, I, B, gt(I, H), ie);
                            Fr(I, H);
                        }
                        return null;
                    }
                    function Je(R, I, B, H) {
                        for(var ie = null, Oe = null, ce = I, ke = I = 0, at = null; ce !== null && ke < B.length; ke++){
                            ce.index > ke ? (at = ce, ce = null) : at = ce.sibling;
                            var Pe = ee(R, ce, B[ke], H);
                            if (Pe === null) {
                                ce === null && (ce = at);
                                break;
                            }
                            e && ce && Pe.alternate === null && t(R, ce), I = c(Pe, I, ke), Oe === null ? ie = Pe : Oe.sibling = Pe, Oe = Pe, ce = at;
                        }
                        if (ke === B.length) return n(R, ce), ve && ne(R, ke), ie;
                        if (ce === null) {
                            for(; ke < B.length; ke++)ce = q(R, B[ke], H), ce !== null && (I = c(ce, I, ke), Oe === null ? ie = ce : Oe.sibling = ce, Oe = ce);
                            return ve && ne(R, ke), ie;
                        }
                        for(ce = o(ce); ke < B.length; ke++)at = ue(ce, R, ke, B[ke], H), at !== null && (e && at.alternate !== null && ce.delete(at.key === null ? ke : at.key), I = c(at, I, ke), Oe === null ? ie = at : Oe.sibling = at, Oe = at);
                        return e && ce.forEach(function(En) {
                            return t(R, En);
                        }), ve && ne(R, ke), ie;
                    }
                    function dr(R, I, B, H) {
                        if (B == null) throw Error(d(151));
                        for(var ie = null, Oe = null, ce = I, ke = I = 0, at = null, Pe = B.next(); ce !== null && !Pe.done; ke++, Pe = B.next()){
                            ce.index > ke ? (at = ce, ce = null) : at = ce.sibling;
                            var En = ee(R, ce, Pe.value, H);
                            if (En === null) {
                                ce === null && (ce = at);
                                break;
                            }
                            e && ce && En.alternate === null && t(R, ce), I = c(En, I, ke), Oe === null ? ie = En : Oe.sibling = En, Oe = En, ce = at;
                        }
                        if (Pe.done) return n(R, ce), ve && ne(R, ke), ie;
                        if (ce === null) {
                            for(; !Pe.done; ke++, Pe = B.next())Pe = q(R, Pe.value, H), Pe !== null && (I = c(Pe, I, ke), Oe === null ? ie = Pe : Oe.sibling = Pe, Oe = Pe);
                            return ve && ne(R, ke), ie;
                        }
                        for(ce = o(ce); !Pe.done; ke++, Pe = B.next())Pe = ue(ce, R, ke, Pe.value, H), Pe !== null && (e && Pe.alternate !== null && ce.delete(Pe.key === null ? ke : Pe.key), I = c(Pe, I, ke), Oe === null ? ie = Pe : Oe.sibling = Pe, Oe = Pe);
                        return e && ce.forEach(function(Yp) {
                            return t(R, Yp);
                        }), ve && ne(R, ke), ie;
                    }
                    function Kn(R, I, B, H) {
                        if (typeof B == "object" && B !== null && B.type === co && B.key === null && (B = B.props.children), typeof B == "object" && B !== null) {
                            switch(B.$$typeof){
                                case Xr:
                                    e: {
                                        for(var ie = B.key; I !== null;){
                                            if (I.key === ie) {
                                                if (ie = B.type, ie === co) {
                                                    if (I.tag === 7) {
                                                        n(R, I.sibling), H = i(I, B.props.children), H.return = R, R = H;
                                                        break e;
                                                    }
                                                } else if (I.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === Sn && Dn(ie) === I.type) {
                                                    n(R, I.sibling), H = i(I, B.props), Bo(H, B), H.return = R, R = H;
                                                    break e;
                                                }
                                                n(R, I);
                                                break;
                                            } else t(R, I);
                                            I = I.sibling;
                                        }
                                        B.type === co ? (H = On(B.props.children, R.mode, H, B.key), H.return = R, R = H) : (H = Yr(B.type, B.key, B.props, null, R.mode, H), Bo(H, B), H.return = R, R = H);
                                    }
                                    return f(R);
                                case so:
                                    e: {
                                        for(ie = B.key; I !== null;){
                                            if (I.key === ie) if (I.tag === 4 && I.stateNode.containerInfo === B.containerInfo && I.stateNode.implementation === B.implementation) {
                                                n(R, I.sibling), H = i(I, B.children || []), H.return = R, R = H;
                                                break e;
                                            } else {
                                                n(R, I);
                                                break;
                                            }
                                            else t(R, I);
                                            I = I.sibling;
                                        }
                                        H = Ll(B, R.mode, H), H.return = R, R = H;
                                    }
                                    return f(R);
                                case Sn:
                                    return B = Dn(B), Kn(R, I, B, H);
                            }
                            if (Zr(B)) return Je(R, I, B, H);
                            if (g(B)) {
                                if (ie = g(B), typeof ie != "function") throw Error(d(150));
                                return B = ie.call(B), dr(R, I, B, H);
                            }
                            if (typeof B.then == "function") return Kn(R, I, Mr(B), H);
                            if (B.$$typeof === vn) return Kn(R, I, gt(R, B), H);
                            Fr(R, B);
                        }
                        return typeof B == "string" && B !== "" || typeof B == "number" || typeof B == "bigint" ? (B = "" + B, I !== null && I.tag === 6 ? (n(R, I.sibling), H = i(I, B), H.return = R, R = H) : (n(R, I), H = Ol(B, R.mode, H), H.return = R, R = H), f(R)) : n(R, I);
                    }
                    return function(R, I, B, H) {
                        try {
                            rr = 0;
                            var ie = Kn(R, I, B, H);
                            return So = null, ie;
                        } catch (ce) {
                            if (ce === vo || ce === ca) throw ce;
                            var Oe = s(29, ce, null, R.mode);
                            return Oe.lanes = H, Oe.return = R, Oe;
                        } finally{}
                    };
                }
                function Tr() {
                    for(var e = Co, t = ui = Co = 0; t < e;){
                        var n = Lt[t];
                        Lt[t++] = null;
                        var o = Lt[t];
                        Lt[t++] = null;
                        var i = Lt[t];
                        Lt[t++] = null;
                        var c = Lt[t];
                        if (Lt[t++] = null, o !== null && i !== null) {
                            var f = o.pending;
                            f === null ? i.next = i : (i.next = f.next, f.next = i), o.pending = i;
                        }
                        c !== 0 && zs(n, i, c);
                    }
                }
                function Er(e, t, n, o) {
                    Lt[Co++] = e, Lt[Co++] = t, Lt[Co++] = n, Lt[Co++] = o, ui |= o, e.lanes |= o, e = e.alternate, e !== null && (e.lanes |= o);
                }
                function Qa(e, t, n, o) {
                    return Er(e, t, n, o), zr(e);
                }
                function An(e, t) {
                    return Er(e, null, null, t), zr(e);
                }
                function zs(e, t, n) {
                    e.lanes |= n;
                    var o = e.alternate;
                    o !== null && (o.lanes |= n);
                    for(var i = !1, c = e.return; c !== null;)c.childLanes |= n, o = c.alternate, o !== null && (o.childLanes |= n), c.tag === 22 && (e = c.stateNode, e === null || e._visibility & 1 || (i = !0)), e = c, c = c.return;
                    return e.tag === 3 ? (c = e.stateNode, i && t !== null && (i = 31 - Et(n), e = c.hiddenUpdates, o = e[i], o === null ? e[i] = [
                        t
                    ] : o.push(t), t.lane = n | 536870912), c) : null;
                }
                function zr(e) {
                    if (50 < ur) throw ur = 0, Ci = null, Error(d(185));
                    for(var t = e.return; t !== null;)e = t, t = e.return;
                    return e.tag === 3 ? e.stateNode : null;
                }
                function Va(e) {
                    e.updateQueue = {
                        baseState: e.memoizedState,
                        firstBaseUpdate: null,
                        lastBaseUpdate: null,
                        shared: {
                            pending: null,
                            lanes: 0,
                            hiddenCallbacks: null
                        },
                        callbacks: null
                    };
                }
                function qa(e, t) {
                    e = e.updateQueue, t.updateQueue === e && (t.updateQueue = {
                        baseState: e.baseState,
                        firstBaseUpdate: e.firstBaseUpdate,
                        lastBaseUpdate: e.lastBaseUpdate,
                        shared: e.shared,
                        callbacks: null
                    });
                }
                function pn(e) {
                    return {
                        lane: e,
                        tag: 0,
                        payload: null,
                        callback: null,
                        next: null
                    };
                }
                function hn(e, t, n) {
                    var o = e.updateQueue;
                    if (o === null) return null;
                    if (o = o.shared, (he & 2) !== 0) {
                        var i = o.pending;
                        return i === null ? t.next = t : (t.next = i.next, i.next = t), o.pending = t, t = zr(e), zs(e, null, n), t;
                    }
                    return Er(e, o, t, n), zr(e);
                }
                function Oo(e, t, n) {
                    if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194048) !== 0)) {
                        var o = t.lanes;
                        o &= e.pendingLanes, n |= o, t.lanes = n, O(e, n);
                    }
                }
                function Ha(e, t) {
                    var n = e.updateQueue, o = e.alternate;
                    if (o !== null && (o = o.updateQueue, n === o)) {
                        var i = null, c = null;
                        if (n = n.firstBaseUpdate, n !== null) {
                            do {
                                var f = {
                                    lane: n.lane,
                                    tag: n.tag,
                                    payload: n.payload,
                                    callback: null,
                                    next: null
                                };
                                c === null ? i = c = f : c = c.next = f, n = n.next;
                            }while (n !== null);
                            c === null ? i = c = t : c = c.next = t;
                        } else i = c = t;
                        n = {
                            baseState: o.baseState,
                            firstBaseUpdate: i,
                            lastBaseUpdate: c,
                            shared: o.shared,
                            callbacks: o.callbacks
                        }, e.updateQueue = n;
                        return;
                    }
                    e = n.lastBaseUpdate, e === null ? n.firstBaseUpdate = t : e.next = t, n.lastBaseUpdate = t;
                }
                function Lo() {
                    if (di) {
                        var e = xo;
                        if (e !== null) throw e;
                    }
                }
                function Uo(e, t, n, o) {
                    di = !1;
                    var i = e.updateQueue;
                    kn = !1;
                    var c = i.firstBaseUpdate, f = i.lastBaseUpdate, P = i.shared.pending;
                    if (P !== null) {
                        i.shared.pending = null;
                        var U = P, W = U.next;
                        U.next = null, f === null ? c = W : f.next = W, f = U;
                        var Y = e.alternate;
                        Y !== null && (Y = Y.updateQueue, P = Y.lastBaseUpdate, P !== f && (P === null ? Y.firstBaseUpdate = W : P.next = W, Y.lastBaseUpdate = U));
                    }
                    if (c !== null) {
                        var q = i.baseState;
                        f = 0, Y = W = U = null, P = c;
                        do {
                            var ee = P.lane & -536870913, ue = ee !== P.lane;
                            if (ue ? (ge & ee) === ee : (o & ee) === ee) {
                                ee !== 0 && ee === yo && (di = !0), Y !== null && (Y = Y.next = {
                                    lane: 0,
                                    tag: P.tag,
                                    payload: P.payload,
                                    callback: null,
                                    next: null
                                });
                                e: {
                                    var Je = e, dr = P;
                                    ee = t;
                                    var Kn = n;
                                    switch(dr.tag){
                                        case 1:
                                            if (Je = dr.payload, typeof Je == "function") {
                                                q = Je.call(Kn, q, ee);
                                                break e;
                                            }
                                            q = Je;
                                            break e;
                                        case 3:
                                            Je.flags = Je.flags & -65537 | 128;
                                        case 0:
                                            if (Je = dr.payload, ee = typeof Je == "function" ? Je.call(Kn, q, ee) : Je, ee == null) break e;
                                            q = $l({}, q, ee);
                                            break e;
                                        case 2:
                                            kn = !0;
                                    }
                                }
                                ee = P.callback, ee !== null && (e.flags |= 64, ue && (e.flags |= 8192), ue = i.callbacks, ue === null ? i.callbacks = [
                                    ee
                                ] : ue.push(ee));
                            } else ue = {
                                lane: ee,
                                tag: P.tag,
                                payload: P.payload,
                                callback: P.callback,
                                next: null
                            }, Y === null ? (W = Y = ue, U = q) : Y = Y.next = ue, f |= ee;
                            if (P = P.next, P === null) {
                                if (P = i.shared.pending, P === null) break;
                                ue = P, P = ue.next, ue.next = null, i.lastBaseUpdate = ue, i.shared.pending = null;
                            }
                        }while (!0);
                        Y === null && (U = q), i.baseState = U, i.firstBaseUpdate = W, i.lastBaseUpdate = Y, c === null && (i.shared.lanes = 0), Mn |= f, e.lanes = f, e.memoizedState = q;
                    }
                }
                function Is(e, t) {
                    if (typeof e != "function") throw Error(d(191, e));
                    e.call(t);
                }
                function _s(e, t) {
                    var n = e.callbacks;
                    if (n !== null) for(e.callbacks = null, e = 0; e < n.length; e++)Is(n[e], t);
                }
                function Ds(e, t) {
                    e = un, T(da, e), T(jo, t), un = e | t.baseLanes;
                }
                function Ka() {
                    T(da, un), T(jo, jo.current);
                }
                function Ya() {
                    un = da.current, S(jo), S(da);
                }
                function bn(e) {
                    var t = e.alternate;
                    T(Ve, Ve.current & 1), T(_t, e), Qt === null && (t === null || jo.current !== null || t.memoizedState !== null) && (Qt = e);
                }
                function Xa(e) {
                    T(Ve, Ve.current), T(_t, e), Qt === null && (Qt = e);
                }
                function As(e) {
                    e.tag === 22 ? (T(Ve, Ve.current), T(_t, e), Qt === null && (Qt = e)) : gn();
                }
                function gn() {
                    T(Ve, Ve.current), T(_t, _t.current);
                }
                function Mt(e) {
                    S(_t), Qt === e && (Qt = null), S(Ve);
                }
                function Ir(e) {
                    for(var t = e; t !== null;){
                        if (t.tag === 13) {
                            var n = t.memoizedState;
                            if (n !== null && (n = n.dehydrated, n === null || Xl(n) || Zl(n))) return t;
                        } else if (t.tag === 19 && (t.memoizedProps.revealOrder === "forwards" || t.memoizedProps.revealOrder === "backwards" || t.memoizedProps.revealOrder === "unstable_legacy-backwards" || t.memoizedProps.revealOrder === "together")) {
                            if ((t.flags & 128) !== 0) return t;
                        } else if (t.child !== null) {
                            t.child.return = t, t = t.child;
                            continue;
                        }
                        if (t === e) break;
                        for(; t.sibling === null;){
                            if (t.return === null || t.return === e) return null;
                            t = t.return;
                        }
                        t.sibling.return = t.return, t = t.sibling;
                    }
                    return null;
                }
                function Ge() {
                    throw Error(d(321));
                }
                function Za(e, t) {
                    if (t === null) return !1;
                    for(var n = 0; n < t.length && n < e.length; n++)if (!It(e[n], t[n])) return !1;
                    return !0;
                }
                function Ja(e, t, n, o, i, c) {
                    return sn = c, de = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, le.H = e === null || e.memoizedState === null ? sd : fi, qn = !1, c = n(o, i), qn = !1, wo && (c = Ns(t, n, o, i)), Rs(e), c;
                }
                function Rs(e) {
                    le.H = lr;
                    var t = Te !== null && Te.next !== null;
                    if (sn = 0, Ke = Te = de = null, fa = !1, ar = 0, ko = null, t) throw Error(d(300));
                    e === null || Ye || (e = e.dependencies, e !== null && ut(e) && (Ye = !0));
                }
                function Ns(e, t, n, o) {
                    de = e;
                    var i = 0;
                    do {
                        if (wo && (ko = null), ar = 0, wo = !1, 25 <= i) throw Error(d(301));
                        if (i += 1, Ke = Te = null, e.updateQueue != null) {
                            var c = e.updateQueue;
                            c.lastEffect = null, c.events = null, c.stores = null, c.memoCache != null && (c.memoCache.index = 0);
                        }
                        le.H = cd, c = t(n, o);
                    }while (wo);
                    return c;
                }
                function Af() {
                    var e = le.H, t = e.useState()[0];
                    return t = typeof t.then == "function" ? $o(t) : t, e = e.useState()[0], (Te !== null ? Te.memoizedState : null) !== e && (de.flags |= 1024), t;
                }
                function el() {
                    var e = ma !== 0;
                    return ma = 0, e;
                }
                function tl(e, t, n) {
                    t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
                }
                function nl(e) {
                    if (fa) {
                        for(e = e.memoizedState; e !== null;){
                            var t = e.queue;
                            t !== null && (t.pending = null), e = e.next;
                        }
                        fa = !1;
                    }
                    sn = 0, Ke = Te = de = null, wo = !1, ar = ma = 0, ko = null;
                }
                function pt() {
                    var e = {
                        memoizedState: null,
                        baseState: null,
                        baseQueue: null,
                        queue: null,
                        next: null
                    };
                    return Ke === null ? de.memoizedState = Ke = e : Ke = Ke.next = e, Ke;
                }
                function Qe() {
                    if (Te === null) {
                        var e = de.alternate;
                        e = e !== null ? e.memoizedState : null;
                    } else e = Te.next;
                    var t = Ke === null ? de.memoizedState : Ke.next;
                    if (t !== null) Ke = t, Te = e;
                    else {
                        if (e === null) throw de.alternate === null ? Error(d(467)) : Error(d(310));
                        Te = e, e = {
                            memoizedState: Te.memoizedState,
                            baseState: Te.baseState,
                            baseQueue: Te.baseQueue,
                            queue: Te.queue,
                            next: null
                        }, Ke === null ? de.memoizedState = Ke = e : Ke = Ke.next = e;
                    }
                    return Ke;
                }
                function _r() {
                    return {
                        lastEffect: null,
                        events: null,
                        stores: null,
                        memoCache: null
                    };
                }
                function $o(e) {
                    var t = ar;
                    return ar += 1, ko === null && (ko = []), e = Ms(ko, e, t), t = de, (Ke === null ? t.memoizedState : Ke.next) === null && (t = t.alternate, le.H = t === null || t.memoizedState === null ? sd : fi), e;
                }
                function Dr(e) {
                    if (e !== null && typeof e == "object") {
                        if (typeof e.then == "function") return $o(e);
                        if (e.$$typeof === vn) return Ce(e);
                    }
                    throw Error(d(438, String(e)));
                }
                function ol(e) {
                    var t = null, n = de.updateQueue;
                    if (n !== null && (t = n.memoCache), t == null) {
                        var o = de.alternate;
                        o !== null && (o = o.updateQueue, o !== null && (o = o.memoCache, o != null && (t = {
                            data: o.data.map(function(i) {
                                return i.slice();
                            }),
                            index: 0
                        })));
                    }
                    if (t == null && (t = {
                        data: [],
                        index: 0
                    }), n === null && (n = _r(), de.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for(n = t.data[t.index] = Array(e), o = 0; o < e; o++)n[o] = lm;
                    return t.index++, n;
                }
                function Jt(e, t) {
                    return typeof t == "function" ? t(e) : t;
                }
                function Ar(e) {
                    var t = Qe();
                    return rl(t, Te, e);
                }
                function rl(e, t, n) {
                    var o = e.queue;
                    if (o === null) throw Error(d(311));
                    o.lastRenderedReducer = n;
                    var i = e.baseQueue, c = o.pending;
                    if (c !== null) {
                        if (i !== null) {
                            var f = i.next;
                            i.next = c.next, c.next = f;
                        }
                        t.baseQueue = i = c, o.pending = null;
                    }
                    if (c = e.baseState, i === null) e.memoizedState = c;
                    else {
                        t = i.next;
                        var P = f = null, U = null, W = t, Y = !1;
                        do {
                            var q = W.lane & -536870913;
                            if (q !== W.lane ? (ge & q) === q : (sn & q) === q) {
                                var ee = W.revertLane;
                                if (ee === 0) U !== null && (U = U.next = {
                                    lane: 0,
                                    revertLane: 0,
                                    gesture: null,
                                    action: W.action,
                                    hasEagerState: W.hasEagerState,
                                    eagerState: W.eagerState,
                                    next: null
                                }), q === yo && (Y = !0);
                                else if ((sn & ee) === ee) {
                                    W = W.next, ee === yo && (Y = !0);
                                    continue;
                                } else q = {
                                    lane: 0,
                                    revertLane: W.revertLane,
                                    gesture: null,
                                    action: W.action,
                                    hasEagerState: W.hasEagerState,
                                    eagerState: W.eagerState,
                                    next: null
                                }, U === null ? (P = U = q, f = c) : U = U.next = q, de.lanes |= ee, Mn |= ee;
                                q = W.action, qn && n(c, q), c = W.hasEagerState ? W.eagerState : n(c, q);
                            } else ee = {
                                lane: q,
                                revertLane: W.revertLane,
                                gesture: W.gesture,
                                action: W.action,
                                hasEagerState: W.hasEagerState,
                                eagerState: W.eagerState,
                                next: null
                            }, U === null ? (P = U = ee, f = c) : U = U.next = ee, de.lanes |= q, Mn |= q;
                            W = W.next;
                        }while (W !== null && W !== t);
                        if (U === null ? f = c : U.next = P, !It(c, e.memoizedState) && (Ye = !0, Y && (n = xo, n !== null))) throw n;
                        e.memoizedState = c, e.baseState = f, e.baseQueue = U, o.lastRenderedState = c;
                    }
                    return i === null && (o.lanes = 0), [
                        e.memoizedState,
                        o.dispatch
                    ];
                }
                function al(e) {
                    var t = Qe(), n = t.queue;
                    if (n === null) throw Error(d(311));
                    n.lastRenderedReducer = e;
                    var o = n.dispatch, i = n.pending, c = t.memoizedState;
                    if (i !== null) {
                        n.pending = null;
                        var f = i = i.next;
                        do c = e(c, f.action), f = f.next;
                        while (f !== i);
                        It(c, t.memoizedState) || (Ye = !0), t.memoizedState = c, t.baseQueue === null && (t.baseState = c), n.lastRenderedState = c;
                    }
                    return [
                        c,
                        o
                    ];
                }
                function Bs(e, t, n) {
                    var o = de, i = Qe(), c = ve;
                    if (c) {
                        if (n === void 0) throw Error(d(407));
                        n = n();
                    } else n = t();
                    var f = !It((Te || i).memoizedState, n);
                    if (f && (i.memoizedState = n, Ye = !0), i = i.queue, sl(Us.bind(null, o, i, e), [
                        e
                    ]), i.getSnapshot !== t || f || Ke !== null && Ke.memoizedState.tag & 1) {
                        if (o.flags |= 2048, ro(9, {
                            destroy: void 0
                        }, Ls.bind(null, o, i, n, t), null), Ee === null) throw Error(d(349));
                        c || (sn & 127) !== 0 || Os(o, t, n);
                    }
                    return n;
                }
                function Os(e, t, n) {
                    e.flags |= 16384, e = {
                        getSnapshot: t,
                        value: n
                    }, t = de.updateQueue, t === null ? (t = _r(), de.updateQueue = t, t.stores = [
                        e
                    ]) : (n = t.stores, n === null ? t.stores = [
                        e
                    ] : n.push(e));
                }
                function Ls(e, t, n, o) {
                    t.value = n, t.getSnapshot = o, $s(t) && Gs(e);
                }
                function Us(e, t, n) {
                    return n(function() {
                        $s(t) && Gs(e);
                    });
                }
                function $s(e) {
                    var t = e.getSnapshot;
                    e = e.value;
                    try {
                        var n = t();
                        return !It(e, n);
                    } catch  {
                        return !0;
                    }
                }
                function Gs(e) {
                    var t = An(e, 2);
                    t !== null && xt(t, e, 2);
                }
                function ll(e) {
                    var t = pt();
                    if (typeof e == "function") {
                        var n = e;
                        if (e = n(), qn) {
                            Q(!0);
                            try {
                                n();
                            } finally{
                                Q(!1);
                            }
                        }
                    }
                    return t.memoizedState = t.baseState = e, t.queue = {
                        pending: null,
                        lanes: 0,
                        dispatch: null,
                        lastRenderedReducer: Jt,
                        lastRenderedState: e
                    }, t;
                }
                function Ws(e, t, n, o) {
                    return e.baseState = n, rl(e, Te, typeof o == "function" ? o : Jt);
                }
                function Rf(e, t, n, o, i) {
                    if (Br(e)) throw Error(d(485));
                    if (e = t.action, e !== null) {
                        var c = {
                            payload: i,
                            action: e,
                            next: null,
                            isTransition: !0,
                            status: "pending",
                            value: null,
                            reason: null,
                            listeners: [],
                            then: function(f) {
                                c.listeners.push(f);
                            }
                        };
                        le.T !== null ? n(!0) : c.isTransition = !1, o(c), n = t.pending, n === null ? (c.next = t.pending = c, Qs(t, c)) : (c.next = n.next, t.pending = n.next = c);
                    }
                }
                function Qs(e, t) {
                    var n = t.action, o = t.payload, i = e.state;
                    if (t.isTransition) {
                        var c = le.T, f = {};
                        le.T = f;
                        try {
                            var P = n(i, o), U = le.S;
                            U !== null && U(f, P), Vs(e, t, P);
                        } catch (W) {
                            il(e, t, W);
                        } finally{
                            c !== null && f.types !== null && (c.types = f.types), le.T = c;
                        }
                    } else try {
                        c = n(i, o), Vs(e, t, c);
                    } catch (W) {
                        il(e, t, W);
                    }
                }
                function Vs(e, t, n) {
                    n !== null && typeof n == "object" && typeof n.then == "function" ? n.then(function(o) {
                        qs(e, t, o);
                    }, function(o) {
                        return il(e, t, o);
                    }) : qs(e, t, n);
                }
                function qs(e, t, n) {
                    t.status = "fulfilled", t.value = n, Hs(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Qs(e, n)));
                }
                function il(e, t, n) {
                    var o = e.pending;
                    if (e.pending = null, o !== null) {
                        o = o.next;
                        do t.status = "rejected", t.reason = n, Hs(t), t = t.next;
                        while (t !== o);
                    }
                    e.action = null;
                }
                function Hs(e) {
                    e = e.listeners;
                    for(var t = 0; t < e.length; t++)(0, e[t])();
                }
                function Ks(e, t) {
                    return t;
                }
                function Ys(e, t) {
                    if (ve) {
                        var n = Ee.formState;
                        if (n !== null) {
                            e: {
                                var o = de;
                                if (ve) {
                                    if (Ne) {
                                        var i = Jm(Ne, Ot);
                                        if (i) {
                                            Ne = Wu(i), o = ep(i);
                                            break e;
                                        }
                                    }
                                    je(o);
                                }
                                o = !1;
                            }
                            o && (t = n[0]);
                        }
                    }
                    n = pt(), n.memoizedState = n.baseState = t, o = {
                        pending: null,
                        lanes: 0,
                        dispatch: null,
                        lastRenderedReducer: Ks,
                        lastRenderedState: t
                    }, n.queue = o, n = pc.bind(null, de, o), o.dispatch = n, o = ll(!1);
                    var c = fl.bind(null, de, !1, o.queue);
                    return o = pt(), i = {
                        state: t,
                        dispatch: null,
                        action: e,
                        pending: null
                    }, o.queue = i, n = Rf.bind(null, de, i, c, n), i.dispatch = n, o.memoizedState = e, [
                        t,
                        n,
                        !1
                    ];
                }
                function Xs(e) {
                    var t = Qe();
                    return Zs(t, Te, e);
                }
                function Zs(e, t, n) {
                    if (t = rl(e, t, Ks)[0], e = Ar(Jt)[0], typeof t == "object" && t !== null && typeof t.then == "function") try {
                        var o = $o(t);
                    } catch (f) {
                        throw f === vo ? ca : f;
                    }
                    else o = t;
                    t = Qe();
                    var i = t.queue, c = i.dispatch;
                    return n !== t.memoizedState && (de.flags |= 2048, ro(9, {
                        destroy: void 0
                    }, Nf.bind(null, i, n), null)), [
                        o,
                        c,
                        e
                    ];
                }
                function Nf(e, t) {
                    e.action = t;
                }
                function Js(e) {
                    var t = Qe(), n = Te;
                    if (n !== null) return Zs(t, n, e);
                    Qe(), t = t.memoizedState, n = Qe();
                    var o = n.queue.dispatch;
                    return n.memoizedState = e, [
                        t,
                        o,
                        !1
                    ];
                }
                function ro(e, t, n, o) {
                    return e = {
                        tag: e,
                        create: n,
                        deps: o,
                        inst: t,
                        next: null
                    }, t = de.updateQueue, t === null && (t = _r(), de.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (o = n.next, n.next = e, e.next = o, t.lastEffect = e), e;
                }
                function ec() {
                    return Qe().memoizedState;
                }
                function Rr(e, t, n, o) {
                    var i = pt();
                    de.flags |= e, i.memoizedState = ro(1 | t, {
                        destroy: void 0
                    }, n, o === void 0 ? null : o);
                }
                function Nr(e, t, n, o) {
                    var i = Qe();
                    o = o === void 0 ? null : o;
                    var c = i.memoizedState.inst;
                    Te !== null && o !== null && Za(o, Te.memoizedState.deps) ? i.memoizedState = ro(t, c, n, o) : (de.flags |= e, i.memoizedState = ro(1 | t, c, n, o));
                }
                function tc(e, t) {
                    Rr(8390656, 8, e, t);
                }
                function sl(e, t) {
                    Nr(2048, 8, e, t);
                }
                function Bf(e) {
                    de.flags |= 4;
                    var t = de.updateQueue;
                    if (t === null) t = _r(), de.updateQueue = t, t.events = [
                        e
                    ];
                    else {
                        var n = t.events;
                        n === null ? t.events = [
                            e
                        ] : n.push(e);
                    }
                }
                function nc(e) {
                    var t = Qe().memoizedState;
                    return Bf({
                        ref: t,
                        nextImpl: e
                    }), function() {
                        if ((he & 2) !== 0) throw Error(d(440));
                        return t.impl.apply(void 0, arguments);
                    };
                }
                function oc(e, t) {
                    return Nr(4, 2, e, t);
                }
                function rc(e, t) {
                    return Nr(4, 4, e, t);
                }
                function ac(e, t) {
                    if (typeof t == "function") {
                        e = e();
                        var n = t(e);
                        return function() {
                            typeof n == "function" ? n() : t(null);
                        };
                    }
                    if (t != null) return e = e(), t.current = e, function() {
                        t.current = null;
                    };
                }
                function lc(e, t, n) {
                    n = n != null ? n.concat([
                        e
                    ]) : null, Nr(4, 4, ac.bind(null, t, e), n);
                }
                function cl() {}
                function ic(e, t) {
                    var n = Qe();
                    t = t === void 0 ? null : t;
                    var o = n.memoizedState;
                    return t !== null && Za(t, o[1]) ? o[0] : (n.memoizedState = [
                        e,
                        t
                    ], e);
                }
                function sc(e, t) {
                    var n = Qe();
                    t = t === void 0 ? null : t;
                    var o = n.memoizedState;
                    if (t !== null && Za(t, o[1])) return o[0];
                    if (o = e(), qn) {
                        Q(!0);
                        try {
                            e();
                        } finally{
                            Q(!1);
                        }
                    }
                    return n.memoizedState = [
                        o,
                        t
                    ], o;
                }
                function ul(e, t, n) {
                    return n === void 0 || (sn & 1073741824) !== 0 && (ge & 261930) === 0 ? e.memoizedState = t : (e.memoizedState = n, e = ru(), de.lanes |= e, Mn |= e, n);
                }
                function cc(e, t, n, o) {
                    return It(n, t) ? n : jo.current !== null ? (e = ul(e, n, o), It(e, t) || (Ye = !0), e) : (sn & 42) === 0 || (sn & 1073741824) !== 0 && (ge & 261930) === 0 ? (Ye = !0, e.memoizedState = n) : (e = ru(), de.lanes |= e, Mn |= e, t);
                }
                function uc(e, t, n, o, i) {
                    var c = an();
                    ot(c !== 0 && 8 > c ? c : 8);
                    var f = le.T, P = {};
                    le.T = P, fl(e, !1, t, n);
                    try {
                        var U = i(), W = le.S;
                        if (W !== null && W(P, U), U !== null && typeof U == "object" && typeof U.then == "function") {
                            var Y = Df(U, o);
                            Go(e, t, Y, Ft(e));
                        } else Go(e, t, o, Ft(e));
                    } catch (q) {
                        Go(e, t, {
                            then: function() {},
                            status: "rejected",
                            reason: q
                        }, Ft());
                    } finally{
                        ot(c), f !== null && P.types !== null && (f.types = P.types), le.T = f;
                    }
                }
                function dc(e) {
                    var t = e.memoizedState;
                    if (t !== null) return t;
                    t = {
                        memoizedState: uo,
                        baseState: uo,
                        baseQueue: null,
                        queue: {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: Jt,
                            lastRenderedState: uo
                        },
                        next: null
                    };
                    var n = {};
                    return t.next = {
                        memoizedState: n,
                        baseState: n,
                        baseQueue: null,
                        queue: {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: Jt,
                            lastRenderedState: n
                        },
                        next: null
                    }, e.memoizedState = t, e = e.alternate, e !== null && (e.memoizedState = t), t;
                }
                function dl() {
                    return Ce(Un);
                }
                function fc() {
                    return Qe().memoizedState;
                }
                function mc() {
                    return Qe().memoizedState;
                }
                function Of(e) {
                    for(var t = e.return; t !== null;){
                        switch(t.tag){
                            case 24:
                            case 3:
                                var n = Ft();
                                e = pn(n);
                                var o = hn(t, e, n);
                                o !== null && (xt(o, t, n), Oo(o, t, n)), t = {
                                    cache: Rt()
                                }, e.payload = t;
                                return;
                        }
                        t = t.return;
                    }
                }
                function Lf(e, t, n) {
                    var o = Ft();
                    n = {
                        lane: o,
                        revertLane: 0,
                        gesture: null,
                        action: n,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    }, Br(e) ? hc(t, n) : (n = Qa(e, t, n, o), n !== null && (xt(n, e, o), bc(n, t, o)));
                }
                function pc(e, t, n) {
                    var o = Ft();
                    Go(e, t, n, o);
                }
                function Go(e, t, n, o) {
                    var i = {
                        lane: o,
                        revertLane: 0,
                        gesture: null,
                        action: n,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    };
                    if (Br(e)) hc(t, i);
                    else {
                        var c = e.alternate;
                        if (e.lanes === 0 && (c === null || c.lanes === 0) && (c = t.lastRenderedReducer, c !== null)) try {
                            var f = t.lastRenderedState, P = c(f, n);
                            if (i.hasEagerState = !0, i.eagerState = P, It(P, f)) return Er(e, t, i, 0), Ee === null && Tr(), !1;
                        } catch  {} finally{}
                        if (n = Qa(e, t, i, o), n !== null) return xt(n, e, o), bc(n, t, o), !0;
                    }
                    return !1;
                }
                function fl(e, t, n, o) {
                    if (o = {
                        lane: 2,
                        revertLane: Ga(),
                        gesture: null,
                        action: o,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    }, Br(e)) {
                        if (t) throw Error(d(479));
                    } else t = Qa(e, n, o, 2), t !== null && xt(t, e, 2);
                }
                function Br(e) {
                    var t = e.alternate;
                    return e === de || t !== null && t === de;
                }
                function hc(e, t) {
                    wo = fa = !0;
                    var n = e.pending;
                    n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
                }
                function bc(e, t, n) {
                    if ((n & 4194048) !== 0) {
                        var o = t.lanes;
                        o &= e.pendingLanes, n |= o, t.lanes = n, O(e, n);
                    }
                }
                function ml(e, t, n, o) {
                    t = e.memoizedState, n = n(o, t), n = n == null ? t : $l({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
                }
                function gc(e, t, n, o, i, c, f) {
                    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(o, c, f) : t.prototype && t.prototype.isPureReactComponent ? !Pr(n, o) || !Pr(i, c) : !0;
                }
                function yc(e, t, n, o) {
                    e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, o), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, o), t.state !== e && mi.enqueueReplaceState(t, t.state, null);
                }
                function Rn(e, t) {
                    var n = t;
                    if ("ref" in t) {
                        n = {};
                        for(var o in t)o !== "ref" && (n[o] = t[o]);
                    }
                    if (e = e.defaultProps) {
                        n === t && (n = $l({}, n));
                        for(var i in e)n[i] === void 0 && (n[i] = e[i]);
                    }
                    return n;
                }
                function Or(e, t) {
                    try {
                        var n = e.onUncaughtError;
                        n(t.value, {
                            componentStack: t.stack
                        });
                    } catch (o) {
                        setTimeout(function() {
                            throw o;
                        });
                    }
                }
                function xc(e, t, n) {
                    try {
                        var o = e.onCaughtError;
                        o(n.value, {
                            componentStack: n.stack,
                            errorBoundary: t.tag === 1 ? t.stateNode : null
                        });
                    } catch (i) {
                        setTimeout(function() {
                            throw i;
                        });
                    }
                }
                function pl(e, t, n) {
                    return n = pn(n), n.tag = 3, n.payload = {
                        element: null
                    }, n.callback = function() {
                        Or(e, t);
                    }, n;
                }
                function vc(e) {
                    return e = pn(e), e.tag = 3, e;
                }
                function Sc(e, t, n, o) {
                    var i = n.type.getDerivedStateFromError;
                    if (typeof i == "function") {
                        var c = o.value;
                        e.payload = function() {
                            return i(c);
                        }, e.callback = function() {
                            xc(t, n, o);
                        };
                    }
                    var f = n.stateNode;
                    f !== null && typeof f.componentDidCatch == "function" && (e.callback = function() {
                        xc(t, n, o), typeof i != "function" && (Fn === null ? Fn = new Set([
                            this
                        ]) : Fn.add(this));
                        var P = o.stack;
                        this.componentDidCatch(o.value, {
                            componentStack: P !== null ? P : ""
                        });
                    });
                }
                function Uf(e, t, n, o, i) {
                    if (n.flags |= 32768, o !== null && typeof o == "object" && typeof o.then == "function") {
                        if (t = n.alternate, t !== null && He(t, n, i, !0), n = _t.current, n !== null) {
                            switch(n.tag){
                                case 31:
                                case 13:
                                    return Qt === null ? Hr() : n.alternate === null && We === 0 && (We = 3), n.flags &= -257, n.flags |= 65536, n.lanes = i, o === ua ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = new Set([
                                        o
                                    ]) : t.add(o), Nl(e, o, i)), !1;
                                case 22:
                                    return n.flags |= 65536, o === ua ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
                                        transitions: null,
                                        markerInstances: null,
                                        retryQueue: new Set([
                                            o
                                        ])
                                    }, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = new Set([
                                        o
                                    ]) : n.add(o)), Nl(e, o, i)), !1;
                            }
                            throw Error(d(435, n.tag));
                        }
                        return Nl(e, o, i), Hr(), !1;
                    }
                    if (ve) return t = _t.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = i, o !== ai && (e = Error(d(422), {
                        cause: o
                    }), L(X(e, n)))) : (o !== ai && (t = Error(d(423), {
                        cause: o
                    }), L(X(t, n))), e = e.current.alternate, e.flags |= 65536, i &= -i, e.lanes |= i, o = X(o, n), i = pl(e.stateNode, o, i), Ha(e, i), We !== 4 && (We = 2)), !1;
                    var c = Error(d(520), {
                        cause: o
                    });
                    if (c = X(c, n), sr === null ? sr = [
                        c
                    ] : sr.push(c), We !== 4 && (We = 2), t === null) return !0;
                    o = X(o, n), n = t;
                    do {
                        switch(n.tag){
                            case 3:
                                return n.flags |= 65536, e = i & -i, n.lanes |= e, e = pl(n.stateNode, o, e), Ha(n, e), !1;
                            case 1:
                                if (t = n.type, c = n.stateNode, (n.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || c !== null && typeof c.componentDidCatch == "function" && (Fn === null || !Fn.has(c)))) return n.flags |= 65536, i &= -i, n.lanes |= i, i = vc(i), Sc(i, e, n, o), Ha(n, i), !1;
                        }
                        n = n.return;
                    }while (n !== null);
                    return !1;
                }
                function it(e, t, n, o) {
                    t.child = e === null ? id(t, null, n, o) : Vn(t, e.child, n, o);
                }
                function Cc(e, t, n, o, i) {
                    n = n.render;
                    var c = t.ref;
                    if ("ref" in o) {
                        var f = {};
                        for(var P in o)P !== "ref" && (f[P] = o[P]);
                    } else f = o;
                    return $e(t), o = Ja(e, t, n, f, c, i), P = el(), e !== null && !Ye ? (tl(e, t, i), en(e, t, i)) : (ve && P && ae(t), t.flags |= 1, it(e, t, o, i), t.child);
                }
                function jc(e, t, n, o, i) {
                    if (e === null) {
                        var c = n.type;
                        return typeof c == "function" && !Bl(c) && c.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = c, wc(e, t, c, o, i)) : (e = Yr(n.type, null, o, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
                    }
                    if (c = e.child, !Sl(e, i)) {
                        var f = c.memoizedProps;
                        if (n = n.compare, n = n !== null ? n : Pr, n(f, o) && e.ref === t.ref) return en(e, t, i);
                    }
                    return t.flags |= 1, e = on(c, o), e.ref = t.ref, e.return = t, t.child = e;
                }
                function wc(e, t, n, o, i) {
                    if (e !== null) {
                        var c = e.memoizedProps;
                        if (Pr(c, o) && e.ref === t.ref) if (Ye = !1, t.pendingProps = o = c, Sl(e, i)) (e.flags & 131072) !== 0 && (Ye = !0);
                        else return t.lanes = e.lanes, en(e, t, i);
                    }
                    return hl(e, t, n, o, i);
                }
                function kc(e, t, n, o) {
                    var i = o.children, c = e !== null ? e.memoizedState : null;
                    if (e === null && t.stateNode === null && (t.stateNode = {
                        _visibility: 1,
                        _pendingMarkers: null,
                        _retryCache: null,
                        _transitions: null
                    }), o.mode === "hidden") {
                        if ((t.flags & 128) !== 0) {
                            if (c = c !== null ? c.baseLanes | n : n, e !== null) {
                                for(o = t.child = e.child, i = 0; o !== null;)i = i | o.lanes | o.childLanes, o = o.sibling;
                                o = i & ~c;
                            } else o = 0, t.child = null;
                            return Pc(e, t, c, n, o);
                        }
                        if ((n & 536870912) !== 0) t.memoizedState = {
                            baseLanes: 0,
                            cachePool: null
                        }, e !== null && kr(t, c !== null ? c.cachePool : null), c !== null ? Ds(t, c) : Ka(), As(t);
                        else return o = t.lanes = 536870912, Pc(e, t, c !== null ? c.baseLanes | n : n, n, o);
                    } else c !== null ? (kr(t, c.cachePool), Ds(t, c), gn(), t.memoizedState = null) : (e !== null && kr(t, null), Ka(), gn());
                    return it(e, t, i, n), t.child;
                }
                function Wo(e, t) {
                    return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
                        _visibility: 1,
                        _pendingMarkers: null,
                        _retryCache: null,
                        _transitions: null
                    }), t.sibling;
                }
                function Pc(e, t, n, o, i) {
                    var c = Wa();
                    return c = c === null ? null : {
                        parent: rn ? Be._currentValue : Be._currentValue2,
                        pool: c
                    }, t.memoizedState = {
                        baseLanes: n,
                        cachePool: c
                    }, e !== null && kr(t, null), Ka(), As(t), e !== null && He(e, t, o, !0), t.childLanes = i, null;
                }
                function Lr(e, t) {
                    return t = $r({
                        mode: t.mode,
                        children: t.children
                    }, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
                }
                function Mc(e, t, n) {
                    return Vn(t, e.child, null, n), e = Lr(t, t.pendingProps), e.flags |= 2, Mt(t), t.memoizedState = null, e;
                }
                function $f(e, t, n) {
                    var o = t.pendingProps, i = (t.flags & 128) !== 0;
                    if (t.flags &= -129, e === null) {
                        if (ve) {
                            if (o.mode === "hidden") return e = Lr(t, o), t.lanes = 536870912, Wo(null, e);
                            if (Xa(t), (e = Ne) ? (e = cp(e, Ot), e !== null && (t.memoizedState = {
                                dehydrated: e,
                                treeContext: Cn !== null ? {
                                    id: Yt,
                                    overflow: Xt
                                } : null,
                                retryLane: 536870912,
                                hydrationErrors: null
                            }, n = wu(e), n.return = t, t.child = n, ct = t, Ne = null)) : e = null, e === null) throw je(t);
                            return t.lanes = 536870912, null;
                        }
                        return Lr(t, o);
                    }
                    var c = e.memoizedState;
                    if (c !== null) {
                        var f = c.dehydrated;
                        if (Xa(t), i) if (t.flags & 256) t.flags &= -257, t = Mc(e, t, n);
                        else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
                        else throw Error(d(558));
                        else if (Ye || He(e, t, n, !1), i = (n & e.childLanes) !== 0, Ye || i) {
                            if (o = Ee, o !== null && (f = N(o, n), f !== 0 && f !== c.retryLane)) throw c.retryLane = f, An(e, f), xt(o, e, f), pi;
                            Hr(), t = Mc(e, t, n);
                        } else e = c.treeContext, mt && (Ne = rp(f), ct = t, ve = !0, wn = null, Ot = !1, e !== null && ye(t, e)), t = Lr(t, o), t.flags |= 4096;
                        return t;
                    }
                    return e = on(e.child, {
                        mode: o.mode,
                        children: o.children
                    }), e.ref = t.ref, t.child = e, e.return = t, e;
                }
                function Ur(e, t) {
                    var n = t.ref;
                    if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
                    else {
                        if (typeof n != "function" && typeof n != "object") throw Error(d(284));
                        (e === null || e.ref !== n) && (t.flags |= 4194816);
                    }
                }
                function hl(e, t, n, o, i) {
                    return $e(t), n = Ja(e, t, n, o, void 0, i), o = el(), e !== null && !Ye ? (tl(e, t, i), en(e, t, i)) : (ve && o && ae(t), t.flags |= 1, it(e, t, n, i), t.child);
                }
                function Fc(e, t, n, o, i, c) {
                    return $e(t), t.updateQueue = null, n = Ns(t, o, n, i), Rs(e), o = el(), e !== null && !Ye ? (tl(e, t, c), en(e, t, c)) : (ve && o && ae(t), t.flags |= 1, it(e, t, n, c), t.child);
                }
                function Tc(e, t, n, o, i) {
                    if ($e(t), t.stateNode === null) {
                        var c = po, f = n.contextType;
                        typeof f == "object" && f !== null && (c = Ce(f)), c = new n(o, c), t.memoizedState = c.state !== null && c.state !== void 0 ? c.state : null, c.updater = mi, t.stateNode = c, c._reactInternals = t, c = t.stateNode, c.props = o, c.state = t.memoizedState, c.refs = {}, Va(t), f = n.contextType, c.context = typeof f == "object" && f !== null ? Ce(f) : po, c.state = t.memoizedState, f = n.getDerivedStateFromProps, typeof f == "function" && (ml(t, n, f, o), c.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof c.getSnapshotBeforeUpdate == "function" || typeof c.UNSAFE_componentWillMount != "function" && typeof c.componentWillMount != "function" || (f = c.state, typeof c.componentWillMount == "function" && c.componentWillMount(), typeof c.UNSAFE_componentWillMount == "function" && c.UNSAFE_componentWillMount(), f !== c.state && mi.enqueueReplaceState(c, c.state, null), Uo(t, o, c, i), Lo(), c.state = t.memoizedState), typeof c.componentDidMount == "function" && (t.flags |= 4194308), o = !0;
                    } else if (e === null) {
                        c = t.stateNode;
                        var P = t.memoizedProps, U = Rn(n, P);
                        c.props = U;
                        var W = c.context, Y = n.contextType;
                        f = po, typeof Y == "object" && Y !== null && (f = Ce(Y));
                        var q = n.getDerivedStateFromProps;
                        Y = typeof q == "function" || typeof c.getSnapshotBeforeUpdate == "function", P = t.pendingProps !== P, Y || typeof c.UNSAFE_componentWillReceiveProps != "function" && typeof c.componentWillReceiveProps != "function" || (P || W !== f) && yc(t, c, o, f), kn = !1;
                        var ee = t.memoizedState;
                        c.state = ee, Uo(t, o, c, i), Lo(), W = t.memoizedState, P || ee !== W || kn ? (typeof q == "function" && (ml(t, n, q, o), W = t.memoizedState), (U = kn || gc(t, n, U, o, ee, W, f)) ? (Y || typeof c.UNSAFE_componentWillMount != "function" && typeof c.componentWillMount != "function" || (typeof c.componentWillMount == "function" && c.componentWillMount(), typeof c.UNSAFE_componentWillMount == "function" && c.UNSAFE_componentWillMount()), typeof c.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof c.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = o, t.memoizedState = W), c.props = o, c.state = W, c.context = f, o = U) : (typeof c.componentDidMount == "function" && (t.flags |= 4194308), o = !1);
                    } else {
                        c = t.stateNode, qa(e, t), f = t.memoizedProps, Y = Rn(n, f), c.props = Y, q = t.pendingProps, ee = c.context, W = n.contextType, U = po, typeof W == "object" && W !== null && (U = Ce(W)), P = n.getDerivedStateFromProps, (W = typeof P == "function" || typeof c.getSnapshotBeforeUpdate == "function") || typeof c.UNSAFE_componentWillReceiveProps != "function" && typeof c.componentWillReceiveProps != "function" || (f !== q || ee !== U) && yc(t, c, o, U), kn = !1, ee = t.memoizedState, c.state = ee, Uo(t, o, c, i), Lo();
                        var ue = t.memoizedState;
                        f !== q || ee !== ue || kn || e !== null && e.dependencies !== null && ut(e.dependencies) ? (typeof P == "function" && (ml(t, n, P, o), ue = t.memoizedState), (Y = kn || gc(t, n, Y, o, ee, ue, U) || e !== null && e.dependencies !== null && ut(e.dependencies)) ? (W || typeof c.UNSAFE_componentWillUpdate != "function" && typeof c.componentWillUpdate != "function" || (typeof c.componentWillUpdate == "function" && c.componentWillUpdate(o, ue, U), typeof c.UNSAFE_componentWillUpdate == "function" && c.UNSAFE_componentWillUpdate(o, ue, U)), typeof c.componentDidUpdate == "function" && (t.flags |= 4), typeof c.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof c.componentDidUpdate != "function" || f === e.memoizedProps && ee === e.memoizedState || (t.flags |= 4), typeof c.getSnapshotBeforeUpdate != "function" || f === e.memoizedProps && ee === e.memoizedState || (t.flags |= 1024), t.memoizedProps = o, t.memoizedState = ue), c.props = o, c.state = ue, c.context = U, o = Y) : (typeof c.componentDidUpdate != "function" || f === e.memoizedProps && ee === e.memoizedState || (t.flags |= 4), typeof c.getSnapshotBeforeUpdate != "function" || f === e.memoizedProps && ee === e.memoizedState || (t.flags |= 1024), o = !1);
                    }
                    return c = o, Ur(e, t), o = (t.flags & 128) !== 0, c || o ? (c = t.stateNode, n = o && typeof n.getDerivedStateFromError != "function" ? null : c.render(), t.flags |= 1, e !== null && o ? (t.child = Vn(t, e.child, null, i), t.child = Vn(t, null, n, i)) : it(e, t, n, i), t.memoizedState = c.state, e = t.child) : e = en(e, t, i), e;
                }
                function Ec(e, t, n, o) {
                    return qe(), t.flags |= 256, it(e, t, n, o), t.child;
                }
                function bl(e) {
                    return {
                        baseLanes: e,
                        cachePool: ks()
                    };
                }
                function gl(e, t, n) {
                    return e = e !== null ? e.childLanes & ~n : 0, t && (e |= At), e;
                }
                function zc(e, t, n) {
                    var o = t.pendingProps, i = !1, c = (t.flags & 128) !== 0, f;
                    if ((f = c) || (f = e !== null && e.memoizedState === null ? !1 : (Ve.current & 2) !== 0), f && (i = !0, t.flags &= -129), f = (t.flags & 32) !== 0, t.flags &= -33, e === null) {
                        if (ve) {
                            if (i ? bn(t) : gn(), (e = Ne) ? (e = up(e, Ot), e !== null && (t.memoizedState = {
                                dehydrated: e,
                                treeContext: Cn !== null ? {
                                    id: Yt,
                                    overflow: Xt
                                } : null,
                                retryLane: 536870912,
                                hydrationErrors: null
                            }, n = wu(e), n.return = t, t.child = n, ct = t, Ne = null)) : e = null, e === null) throw je(t);
                            return Zl(e) ? t.lanes = 32 : t.lanes = 536870912, null;
                        }
                        var P = o.children;
                        return o = o.fallback, i ? (gn(), i = t.mode, P = $r({
                            mode: "hidden",
                            children: P
                        }, i), o = On(o, i, n, null), P.return = t, o.return = t, P.sibling = o, t.child = P, o = t.child, o.memoizedState = bl(n), o.childLanes = gl(e, f, n), t.memoizedState = hi, Wo(null, o)) : (bn(t), yl(t, P));
                    }
                    var U = e.memoizedState;
                    if (U !== null && (P = U.dehydrated, P !== null)) {
                        if (c) t.flags & 256 ? (bn(t), t.flags &= -257, t = xl(e, t, n)) : t.memoizedState !== null ? (gn(), t.child = e.child, t.flags |= 128, t = null) : (gn(), P = o.fallback, i = t.mode, o = $r({
                            mode: "visible",
                            children: o.children
                        }, i), P = On(P, i, n, null), P.flags |= 2, o.return = t, P.return = t, o.sibling = P, t.child = o, Vn(t, e.child, null, n), o = t.child, o.memoizedState = bl(n), o.childLanes = gl(e, f, n), t.memoizedState = hi, t = Wo(null, o));
                        else if (bn(t), Zl(P)) f = Xm(P).digest, o = Error(d(419)), o.stack = "", o.digest = f, L({
                            value: o,
                            source: null,
                            stack: null
                        }), t = xl(e, t, n);
                        else if (Ye || He(e, t, n, !1), f = (n & e.childLanes) !== 0, Ye || f) {
                            if (f = Ee, f !== null && (o = N(f, n), o !== 0 && o !== U.retryLane)) throw U.retryLane = o, An(e, o), xt(f, e, o), pi;
                            Xl(P) || Hr(), t = xl(e, t, n);
                        } else Xl(P) ? (t.flags |= 192, t.child = e.child, t = null) : (e = U.treeContext, mt && (Ne = ap(P), ct = t, ve = !0, wn = null, Ot = !1, e !== null && ye(t, e)), t = yl(t, o.children), t.flags |= 4096);
                        return t;
                    }
                    return i ? (gn(), P = o.fallback, i = t.mode, U = e.child, c = U.sibling, o = on(U, {
                        mode: "hidden",
                        children: o.children
                    }), o.subtreeFlags = U.subtreeFlags & 65011712, c !== null ? P = on(c, P) : (P = On(P, i, n, null), P.flags |= 2), P.return = t, o.return = t, o.sibling = P, t.child = o, Wo(null, o), o = t.child, P = e.child.memoizedState, P === null ? P = bl(n) : (i = P.cachePool, i !== null ? (U = rn ? Be._currentValue : Be._currentValue2, i = i.parent !== U ? {
                        parent: U,
                        pool: U
                    } : i) : i = ks(), P = {
                        baseLanes: P.baseLanes | n,
                        cachePool: i
                    }), o.memoizedState = P, o.childLanes = gl(e, f, n), t.memoizedState = hi, Wo(e.child, o)) : (bn(t), n = e.child, e = n.sibling, n = on(n, {
                        mode: "visible",
                        children: o.children
                    }), n.return = t, n.sibling = null, e !== null && (f = t.deletions, f === null ? (t.deletions = [
                        e
                    ], t.flags |= 16) : f.push(e)), t.child = n, t.memoizedState = null, n);
                }
                function yl(e, t) {
                    return t = $r({
                        mode: "visible",
                        children: t
                    }, e.mode), t.return = e, e.child = t;
                }
                function $r(e, t) {
                    return e = s(22, e, null, t), e.lanes = 0, e;
                }
                function xl(e, t, n) {
                    return Vn(t, e.child, null, n), e = yl(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
                }
                function Ic(e, t, n) {
                    e.lanes |= t;
                    var o = e.alternate;
                    o !== null && (o.lanes |= t), xe(e.return, t, n);
                }
                function vl(e, t, n, o, i, c) {
                    var f = e.memoizedState;
                    f === null ? e.memoizedState = {
                        isBackwards: t,
                        rendering: null,
                        renderingStartTime: 0,
                        last: o,
                        tail: n,
                        tailMode: i,
                        treeForkCount: c
                    } : (f.isBackwards = t, f.rendering = null, f.renderingStartTime = 0, f.last = o, f.tail = n, f.tailMode = i, f.treeForkCount = c);
                }
                function _c(e, t, n) {
                    var o = t.pendingProps, i = o.revealOrder, c = o.tail;
                    o = o.children;
                    var f = Ve.current, P = (f & 2) !== 0;
                    if (P ? (f = f & 1 | 2, t.flags |= 128) : f &= 1, T(Ve, f), it(e, t, o, n), o = ve ? tr : 0, !P && e !== null && (e.flags & 128) !== 0) e: for(e = t.child; e !== null;){
                        if (e.tag === 13) e.memoizedState !== null && Ic(e, n, t);
                        else if (e.tag === 19) Ic(e, n, t);
                        else if (e.child !== null) {
                            e.child.return = e, e = e.child;
                            continue;
                        }
                        if (e === t) break e;
                        for(; e.sibling === null;){
                            if (e.return === null || e.return === t) break e;
                            e = e.return;
                        }
                        e.sibling.return = e.return, e = e.sibling;
                    }
                    switch(i){
                        case "forwards":
                            for(n = t.child, i = null; n !== null;)e = n.alternate, e !== null && Ir(e) === null && (i = n), n = n.sibling;
                            n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), vl(t, !1, i, n, c, o);
                            break;
                        case "backwards":
                        case "unstable_legacy-backwards":
                            for(n = null, i = t.child, t.child = null; i !== null;){
                                if (e = i.alternate, e !== null && Ir(e) === null) {
                                    t.child = i;
                                    break;
                                }
                                e = i.sibling, i.sibling = n, n = i, i = e;
                            }
                            vl(t, !0, n, null, c, o);
                            break;
                        case "together":
                            vl(t, !1, null, null, void 0, o);
                            break;
                        default:
                            t.memoizedState = null;
                    }
                    return t.child;
                }
                function en(e, t, n) {
                    if (e !== null && (t.dependencies = e.dependencies), Mn |= t.lanes, (n & t.childLanes) === 0) if (e !== null) {
                        if (He(e, t, n, !1), (n & t.childLanes) === 0) return null;
                    } else return null;
                    if (e !== null && t.child !== e.child) throw Error(d(153));
                    if (t.child !== null) {
                        for(e = t.child, n = on(e, e.pendingProps), t.child = n, n.return = t; e.sibling !== null;)e = e.sibling, n = n.sibling = on(e, e.pendingProps), n.return = t;
                        n.sibling = null;
                    }
                    return t.child;
                }
                function Sl(e, t) {
                    return (e.lanes & t) !== 0 ? !0 : (e = e.dependencies, !!(e !== null && ut(e)));
                }
                function Gf(e, t, n) {
                    switch(t.tag){
                        case 3:
                            Me(t, t.stateNode.containerInfo), te(t, Be, e.memoizedState.cache), qe();
                            break;
                        case 27:
                        case 5:
                            De(t);
                            break;
                        case 4:
                            Me(t, t.stateNode.containerInfo);
                            break;
                        case 10:
                            te(t, t.type, t.memoizedProps.value);
                            break;
                        case 31:
                            if (t.memoizedState !== null) return t.flags |= 128, Xa(t), null;
                            break;
                        case 13:
                            var o = t.memoizedState;
                            if (o !== null) return o.dehydrated !== null ? (bn(t), t.flags |= 128, null) : (n & t.child.childLanes) !== 0 ? zc(e, t, n) : (bn(t), e = en(e, t, n), e !== null ? e.sibling : null);
                            bn(t);
                            break;
                        case 19:
                            var i = (e.flags & 128) !== 0;
                            if (o = (n & t.childLanes) !== 0, o || (He(e, t, n, !1), o = (n & t.childLanes) !== 0), i) {
                                if (o) return _c(e, t, n);
                                t.flags |= 128;
                            }
                            if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), T(Ve, Ve.current), o) break;
                            return null;
                        case 22:
                            return t.lanes = 0, kc(e, t, n, t.pendingProps);
                        case 24:
                            te(t, Be, e.memoizedState.cache);
                    }
                    return en(e, t, n);
                }
                function Dc(e, t, n) {
                    if (e !== null) if (e.memoizedProps !== t.pendingProps) Ye = !0;
                    else {
                        if (!Sl(e, n) && (t.flags & 128) === 0) return Ye = !1, Gf(e, t, n);
                        Ye = (e.flags & 131072) !== 0;
                    }
                    else Ye = !1, ve && (t.flags & 1048576) !== 0 && re(t, tr, t.index);
                    switch(t.lanes = 0, t.tag){
                        case 16:
                            e: {
                                var o = t.pendingProps;
                                if (e = Dn(t.elementType), t.type = e, typeof e == "function") Bl(e) ? (o = Rn(e, o), t.tag = 1, t = Tc(null, t, e, o, n)) : (t.tag = 0, t = hl(null, t, e, o, n));
                                else {
                                    if (e != null) {
                                        var i = e.$$typeof;
                                        if (i === Wl) {
                                            t.tag = 11, t = Cc(null, t, e, o, n);
                                            break e;
                                        } else if (i === ql) {
                                            t.tag = 14, t = jc(null, t, e, o, n);
                                            break e;
                                        }
                                    }
                                    throw t = p(e) || e, Error(d(306, t, ""));
                                }
                            }
                            return t;
                        case 0:
                            return hl(e, t, t.type, t.pendingProps, n);
                        case 1:
                            return o = t.type, i = Rn(o, t.pendingProps), Tc(e, t, o, i, n);
                        case 3:
                            e: {
                                if (Me(t, t.stateNode.containerInfo), e === null) throw Error(d(387));
                                var c = t.pendingProps;
                                i = t.memoizedState, o = i.element, qa(e, t), Uo(t, c, null, n);
                                var f = t.memoizedState;
                                if (c = f.cache, te(t, Be, c), c !== i.cache && me(t, [
                                    Be
                                ], n, !0), Lo(), c = f.element, mt && i.isDehydrated) if (i = {
                                    element: c,
                                    isDehydrated: !1,
                                    cache: f.cache
                                }, t.updateQueue.baseState = i, t.memoizedState = i, t.flags & 256) {
                                    t = Ec(e, t, c, n);
                                    break e;
                                } else if (c !== o) {
                                    o = X(Error(d(424)), t), L(o), t = Ec(e, t, c, n);
                                    break e;
                                } else for(mt && (Ne = op(t.stateNode.containerInfo), ct = t, ve = !0, wn = null, Ot = !0), n = id(t, null, c, n), t.child = n; n;)n.flags = n.flags & -3 | 4096, n = n.sibling;
                                else {
                                    if (qe(), c === o) {
                                        t = en(e, t, n);
                                        break e;
                                    }
                                    it(e, t, c, n);
                                }
                                t = t.child;
                            }
                            return t;
                        case 26:
                            if (Wt) return Ur(e, t), e === null ? (n = qu(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : ve || (t.stateNode = Ep(t.type, t.pendingProps, jn.current, t)) : t.memoizedState = qu(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
                        case 27:
                            if (et) return De(t), e === null && et && ve && (o = t.stateNode = Ju(t.type, t.pendingProps, jn.current, st.current, !1), ct = t, Ot = !0, Ne = lp(t.type, o, Ne)), it(e, t, t.pendingProps.children, n), Ur(e, t), e === null && (t.flags |= 4194304), t.child;
                        case 5:
                            return e === null && ve && (Mp(t.type, t.pendingProps, st.current), (i = o = Ne) && (o = ip(o, t.type, t.pendingProps, Ot), o !== null ? (t.stateNode = o, ct = t, Ne = np(o), Ot = !1, i = !0) : i = !1), i || je(t)), De(t), i = t.type, c = t.pendingProps, f = e !== null ? e.memoizedProps : null, o = c.children, Jr(i, c) ? o = null : f !== null && Jr(i, f) && (t.flags |= 32), t.memoizedState !== null && (i = Ja(e, t, Af, null, null, n), rn ? Un._currentValue = i : Un._currentValue2 = i), Ur(e, t), it(e, t, o, n), t.child;
                        case 6:
                            return e === null && ve && (Fp(t.pendingProps, st.current), (e = n = Ne) && (n = sp(n, t.pendingProps, Ot), n !== null ? (t.stateNode = n, ct = t, Ne = null, e = !0) : e = !1), e || je(t)), null;
                        case 13:
                            return zc(e, t, n);
                        case 4:
                            return Me(t, t.stateNode.containerInfo), o = t.pendingProps, e === null ? t.child = Vn(t, null, o, n) : it(e, t, o, n), t.child;
                        case 11:
                            return Cc(e, t, t.type, t.pendingProps, n);
                        case 7:
                            return it(e, t, t.pendingProps, n), t.child;
                        case 8:
                            return it(e, t, t.pendingProps.children, n), t.child;
                        case 12:
                            return it(e, t, t.pendingProps.children, n), t.child;
                        case 10:
                            return o = t.pendingProps, te(t, t.type, o.value), it(e, t, o.children, n), t.child;
                        case 9:
                            return i = t.type._context, o = t.pendingProps.children, $e(t), i = Ce(i), o = o(i), t.flags |= 1, it(e, t, o, n), t.child;
                        case 14:
                            return jc(e, t, t.type, t.pendingProps, n);
                        case 15:
                            return wc(e, t, t.type, t.pendingProps, n);
                        case 19:
                            return _c(e, t, n);
                        case 31:
                            return $f(e, t, n);
                        case 22:
                            return kc(e, t, n, t.pendingProps);
                        case 24:
                            return $e(t), o = Ce(Be), e === null ? (i = Wa(), i === null && (i = Ee, c = Rt(), i.pooledCache = c, c.refCount++, c !== null && (i.pooledCacheLanes |= n), i = c), t.memoizedState = {
                                parent: o,
                                cache: i
                            }, Va(t), te(t, Be, i)) : ((e.lanes & n) !== 0 && (qa(e, t), Uo(t, null, null, n), Lo()), i = e.memoizedState, c = t.memoizedState, i.parent !== o ? (i = {
                                parent: o,
                                cache: o
                            }, t.memoizedState = i, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = i), te(t, Be, o)) : (o = c.cache, te(t, Be, o), o !== i.cache && me(t, [
                                Be
                            ], n, !0))), it(e, t, t.pendingProps.children, n), t.child;
                        case 29:
                            throw t.pendingProps;
                    }
                    throw Error(d(156, t.tag));
                }
                function Ut(e) {
                    e.flags |= 4;
                }
                function Gr(e) {
                    Kt && (e.flags |= 8);
                }
                function Ac(e, t) {
                    if (e !== null && e.child === t.child) return !1;
                    if ((t.flags & 16) !== 0) return !0;
                    for(e = t.child; e !== null;){
                        if ((e.flags & 8218) !== 0 || (e.subtreeFlags & 8218) !== 0) return !0;
                        e = e.sibling;
                    }
                    return !1;
                }
                function Cl(e, t, n, o) {
                    if (ft) for(n = t.child; n !== null;){
                        if (n.tag === 5 || n.tag === 6) Kl(e, n.stateNode);
                        else if (!(n.tag === 4 || et && n.tag === 27) && n.child !== null) {
                            n.child.return = n, n = n.child;
                            continue;
                        }
                        if (n === t) break;
                        for(; n.sibling === null;){
                            if (n.return === null || n.return === t) return;
                            n = n.return;
                        }
                        n.sibling.return = n.return, n = n.sibling;
                    }
                    else if (Kt) for(var i = t.child; i !== null;){
                        if (i.tag === 5) {
                            var c = i.stateNode;
                            n && o && (c = $u(c, i.type, i.memoizedProps)), Kl(e, c);
                        } else if (i.tag === 6) c = i.stateNode, n && o && (c = Gu(c, i.memoizedProps)), Kl(e, c);
                        else if (i.tag !== 4) {
                            if (i.tag === 22 && i.memoizedState !== null) c = i.child, c !== null && (c.return = i), Cl(e, i, !0, !0);
                            else if (i.child !== null) {
                                i.child.return = i, i = i.child;
                                continue;
                            }
                        }
                        if (i === t) break;
                        for(; i.sibling === null;){
                            if (i.return === null || i.return === t) return;
                            i = i.return;
                        }
                        i.sibling.return = i.return, i = i.sibling;
                    }
                }
                function Rc(e, t, n, o) {
                    var i = !1;
                    if (Kt) for(var c = t.child; c !== null;){
                        if (c.tag === 5) {
                            var f = c.stateNode;
                            n && o && (f = $u(f, c.type, c.memoizedProps)), Lu(e, f);
                        } else if (c.tag === 6) f = c.stateNode, n && o && (f = Gu(f, c.memoizedProps)), Lu(e, f);
                        else if (c.tag !== 4) {
                            if (c.tag === 22 && c.memoizedState !== null) i = c.child, i !== null && (i.return = c), Rc(e, c, !0, !0), i = !0;
                            else if (c.child !== null) {
                                c.child.return = c, c = c.child;
                                continue;
                            }
                        }
                        if (c === t) break;
                        for(; c.sibling === null;){
                            if (c.return === null || c.return === t) return i;
                            c = c.return;
                        }
                        c.sibling.return = c.return, c = c.sibling;
                    }
                    return i;
                }
                function Nc(e, t) {
                    if (Kt && Ac(e, t)) {
                        e = t.stateNode;
                        var n = e.containerInfo, o = Ou();
                        Rc(o, t, !1, !1), e.pendingChildren = o, Ut(t), Ym(n, o);
                    }
                }
                function jl(e, t, n, o) {
                    if (ft) e.memoizedProps !== o && Ut(t);
                    else if (Kt) {
                        var i = e.stateNode, c = e.memoizedProps;
                        if ((e = Ac(e, t)) || c !== o) {
                            var f = st.current;
                            c = Km(i, n, c, o, !e, null), c === i ? t.stateNode = i : (Gr(t), Du(c, n, o, f) && Ut(t), t.stateNode = c, e && Cl(c, t, !1, !1));
                        } else t.stateNode = i;
                    }
                }
                function wl(e, t, n, o, i) {
                    if ((e.mode & 32) !== 0 && (n === null ? Cm(t, o) : jm(t, n, o))) {
                        if (e.flags |= 16777216, (i & 335544128) === i || Yl(t, o)) if (Ru(e.stateNode, t, o)) e.flags |= 8192;
                        else if (cu()) e.flags |= 8192;
                        else throw Qn = ua, ci;
                    } else e.flags &= -16777217;
                }
                function Bc(e, t) {
                    if (Ip(t)) {
                        if (e.flags |= 16777216, !Zu(t)) if (cu()) e.flags |= 8192;
                        else throw Qn = ua, ci;
                    } else e.flags &= -16777217;
                }
                function Wr(e, t) {
                    t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag !== 22 ? k() : 536870912, e.lanes |= t, Fo |= t);
                }
                function Qo(e, t) {
                    if (!ve) switch(e.tailMode){
                        case "hidden":
                            t = e.tail;
                            for(var n = null; t !== null;)t.alternate !== null && (n = t), t = t.sibling;
                            n === null ? e.tail = null : n.sibling = null;
                            break;
                        case "collapsed":
                            n = e.tail;
                            for(var o = null; n !== null;)n.alternate !== null && (o = n), n = n.sibling;
                            o === null ? t || e.tail === null ? e.tail = null : e.tail.sibling = null : o.sibling = null;
                    }
                }
                function _e(e) {
                    var t = e.alternate !== null && e.alternate.child === e.child, n = 0, o = 0;
                    if (t) for(var i = e.child; i !== null;)n |= i.lanes | i.childLanes, o |= i.subtreeFlags & 65011712, o |= i.flags & 65011712, i.return = e, i = i.sibling;
                    else for(i = e.child; i !== null;)n |= i.lanes | i.childLanes, o |= i.subtreeFlags, o |= i.flags, i.return = e, i = i.sibling;
                    return e.subtreeFlags |= o, e.childLanes = n, t;
                }
                function Wf(e, t, n) {
                    var o = t.pendingProps;
                    switch(Se(t), t.tag){
                        case 16:
                        case 15:
                        case 0:
                        case 11:
                        case 7:
                        case 8:
                        case 12:
                        case 9:
                        case 14:
                            return _e(t), null;
                        case 1:
                            return _e(t), null;
                        case 3:
                            return n = t.stateNode, o = null, e !== null && (o = e.memoizedState.cache), t.memoizedState.cache !== o && (t.flags |= 2048), Ie(Be), Ue(), n.pendingContext && (n.context = n.pendingContext, n.pendingContext = null), (e === null || e.child === null) && (Re(t) ? Ut(t) : e === null || e.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, lt())), Nc(e, t), _e(t), null;
                        case 26:
                            if (Wt) {
                                var i = t.type, c = t.memoizedState;
                                return e === null ? (Ut(t), c !== null ? (_e(t), Bc(t, c)) : (_e(t), wl(t, i, null, o, n))) : c ? c !== e.memoizedState ? (Ut(t), _e(t), Bc(t, c)) : (_e(t), t.flags &= -16777217) : (c = e.memoizedProps, ft ? c !== o && Ut(t) : jl(e, t, i, o), _e(t), wl(t, i, c, o, n)), null;
                            }
                        case 27:
                            if (et) {
                                if (kt(t), n = jn.current, i = t.type, e !== null && t.stateNode != null) ft ? e.memoizedProps !== o && Ut(t) : jl(e, t, i, o);
                                else {
                                    if (!o) {
                                        if (t.stateNode === null) throw Error(d(166));
                                        return _e(t), null;
                                    }
                                    e = st.current, Re(t) ? se(t, e) : (e = Ju(i, o, n, e, !0), t.stateNode = e, Ut(t));
                                }
                                return _e(t), null;
                            }
                        case 5:
                            if (kt(t), i = t.type, e !== null && t.stateNode != null) jl(e, t, i, o);
                            else {
                                if (!o) {
                                    if (t.stateNode === null) throw Error(d(166));
                                    return _e(t), null;
                                }
                                if (c = st.current, Re(t)) se(t, c), Sp(t.stateNode, i, o, c) && (t.flags |= 64);
                                else {
                                    var f = pm(i, o, jn.current, c, t);
                                    Gr(t), Cl(f, t, !1, !1), t.stateNode = f, Du(f, i, o, c) && Ut(t);
                                }
                            }
                            return _e(t), wl(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
                        case 6:
                            if (e && t.stateNode != null) n = e.memoizedProps, ft ? n !== o && Ut(t) : Kt && (n !== o ? (e = jn.current, n = st.current, Gr(t), t.stateNode = Au(o, e, n, t)) : t.stateNode = e.stateNode);
                            else {
                                if (typeof o != "string" && t.stateNode === null) throw Error(d(166));
                                if (e = jn.current, n = st.current, Re(t)) {
                                    if (!mt) throw Error(d(176));
                                    if (e = t.stateNode, n = t.memoizedProps, o = null, i = ct, i !== null) switch(i.tag){
                                        case 27:
                                        case 5:
                                            o = i.memoizedProps;
                                    }
                                    fp(e, n, t, o) || je(t, !0);
                                } else Gr(t), t.stateNode = Au(o, e, n, t);
                            }
                            return _e(t), null;
                        case 31:
                            if (n = t.memoizedState, e === null || e.memoizedState !== null) {
                                if (o = Re(t), n !== null) {
                                    if (e === null) {
                                        if (!o) throw Error(d(318));
                                        if (!mt) throw Error(d(556));
                                        if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(d(557));
                                        mp(e, t);
                                    } else qe(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
                                    _e(t), e = !1;
                                } else n = lt(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = n), e = !0;
                                if (!e) return t.flags & 256 ? (Mt(t), t) : (Mt(t), null);
                                if ((t.flags & 128) !== 0) throw Error(d(558));
                            }
                            return _e(t), null;
                        case 13:
                            if (o = t.memoizedState, e === null || e.memoizedState !== null && e.memoizedState.dehydrated !== null) {
                                if (i = Re(t), o !== null && o.dehydrated !== null) {
                                    if (e === null) {
                                        if (!i) throw Error(d(318));
                                        if (!mt) throw Error(d(344));
                                        if (i = t.memoizedState, i = i !== null ? i.dehydrated : null, !i) throw Error(d(317));
                                        pp(i, t);
                                    } else qe(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
                                    _e(t), i = !1;
                                } else i = lt(), e !== null && e.memoizedState !== null && (e.memoizedState.hydrationErrors = i), i = !0;
                                if (!i) return t.flags & 256 ? (Mt(t), t) : (Mt(t), null);
                            }
                            return Mt(t), (t.flags & 128) !== 0 ? (t.lanes = n, t) : (n = o !== null, e = e !== null && e.memoizedState !== null, n && (o = t.child, i = null, o.alternate !== null && o.alternate.memoizedState !== null && o.alternate.memoizedState.cachePool !== null && (i = o.alternate.memoizedState.cachePool.pool), c = null, o.memoizedState !== null && o.memoizedState.cachePool !== null && (c = o.memoizedState.cachePool.pool), c !== i && (o.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), Wr(t, t.updateQueue), _e(t), null);
                        case 4:
                            return Ue(), Nc(e, t), e === null && ym(t.stateNode.containerInfo), _e(t), null;
                        case 10:
                            return Ie(t.type), _e(t), null;
                        case 19:
                            if (S(Ve), o = t.memoizedState, o === null) return _e(t), null;
                            if (i = (t.flags & 128) !== 0, c = o.rendering, c === null) if (i) Qo(o, !1);
                            else {
                                if (We !== 0 || e !== null && (e.flags & 128) !== 0) for(e = t.child; e !== null;){
                                    if (c = Ir(e), c !== null) {
                                        for(t.flags |= 128, Qo(o, !1), e = c.updateQueue, t.updateQueue = e, Wr(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;)ju(n, e), n = n.sibling;
                                        return T(Ve, Ve.current & 1 | 2), ve && ne(t, o.treeForkCount), t.child;
                                    }
                                    e = e.sibling;
                                }
                                o.tail !== null && vt() > cr && (t.flags |= 128, i = !0, Qo(o, !1), t.lanes = 4194304);
                            }
                            else {
                                if (!i) if (e = Ir(c), e !== null) {
                                    if (t.flags |= 128, i = !0, e = e.updateQueue, t.updateQueue = e, Wr(t, e), Qo(o, !0), o.tail === null && o.tailMode === "hidden" && !c.alternate && !ve) return _e(t), null;
                                } else 2 * vt() - o.renderingStartTime > cr && n !== 536870912 && (t.flags |= 128, i = !0, Qo(o, !1), t.lanes = 4194304);
                                o.isBackwards ? (c.sibling = t.child, t.child = c) : (e = o.last, e !== null ? e.sibling = c : t.child = c, o.last = c);
                            }
                            return o.tail !== null ? (e = o.tail, o.rendering = e, o.tail = e.sibling, o.renderingStartTime = vt(), e.sibling = null, n = Ve.current, T(Ve, i ? n & 1 | 2 : n & 1), ve && ne(t, o.treeForkCount), e) : (_e(t), null);
                        case 22:
                        case 23:
                            return Mt(t), Ya(), o = t.memoizedState !== null, e !== null ? e.memoizedState !== null !== o && (t.flags |= 8192) : o && (t.flags |= 8192), o ? (n & 536870912) !== 0 && (t.flags & 128) === 0 && (_e(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : _e(t), n = t.updateQueue, n !== null && Wr(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), o = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (o = t.memoizedState.cachePool.pool), o !== n && (t.flags |= 2048), e !== null && S(Wn), null;
                        case 24:
                            return n = null, e !== null && (n = e.memoizedState.cache), t.memoizedState.cache !== n && (t.flags |= 2048), Ie(Be), _e(t), null;
                        case 25:
                            return null;
                        case 30:
                            return null;
                    }
                    throw Error(d(156, t.tag));
                }
                function Qf(e, t) {
                    switch(Se(t), t.tag){
                        case 1:
                            return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
                        case 3:
                            return Ie(Be), Ue(), e = t.flags, (e & 65536) !== 0 && (e & 128) === 0 ? (t.flags = e & -65537 | 128, t) : null;
                        case 26:
                        case 27:
                        case 5:
                            return kt(t), null;
                        case 31:
                            if (t.memoizedState !== null) {
                                if (Mt(t), t.alternate === null) throw Error(d(340));
                                qe();
                            }
                            return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
                        case 13:
                            if (Mt(t), e = t.memoizedState, e !== null && e.dehydrated !== null) {
                                if (t.alternate === null) throw Error(d(340));
                                qe();
                            }
                            return e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
                        case 19:
                            return S(Ve), null;
                        case 4:
                            return Ue(), null;
                        case 10:
                            return Ie(t.type), null;
                        case 22:
                        case 23:
                            return Mt(t), Ya(), e !== null && S(Wn), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
                        case 24:
                            return Ie(Be), null;
                        case 25:
                            return null;
                        default:
                            return null;
                    }
                }
                function Oc(e, t) {
                    switch(Se(t), t.tag){
                        case 3:
                            Ie(Be), Ue();
                            break;
                        case 26:
                        case 27:
                        case 5:
                            kt(t);
                            break;
                        case 4:
                            Ue();
                            break;
                        case 31:
                            t.memoizedState !== null && Mt(t);
                            break;
                        case 13:
                            Mt(t);
                            break;
                        case 19:
                            S(Ve);
                            break;
                        case 10:
                            Ie(t.type);
                            break;
                        case 22:
                        case 23:
                            Mt(t), Ya(), e !== null && S(Wn);
                            break;
                        case 24:
                            Ie(Be);
                    }
                }
                function Vo(e, t) {
                    try {
                        var n = t.updateQueue, o = n !== null ? n.lastEffect : null;
                        if (o !== null) {
                            var i = o.next;
                            n = i;
                            do {
                                if ((n.tag & e) === e) {
                                    o = void 0;
                                    var c = n.create, f = n.inst;
                                    o = c(), f.destroy = o;
                                }
                                n = n.next;
                            }while (n !== i);
                        }
                    } catch (P) {
                        we(t, t.return, P);
                    }
                }
                function yn(e, t, n) {
                    try {
                        var o = t.updateQueue, i = o !== null ? o.lastEffect : null;
                        if (i !== null) {
                            var c = i.next;
                            o = c;
                            do {
                                if ((o.tag & e) === e) {
                                    var f = o.inst, P = f.destroy;
                                    if (P !== void 0) {
                                        f.destroy = void 0, i = t;
                                        var U = n, W = P;
                                        try {
                                            W();
                                        } catch (Y) {
                                            we(i, U, Y);
                                        }
                                    }
                                }
                                o = o.next;
                            }while (o !== c);
                        }
                    } catch (Y) {
                        we(t, t.return, Y);
                    }
                }
                function Lc(e) {
                    var t = e.updateQueue;
                    if (t !== null) {
                        var n = e.stateNode;
                        try {
                            _s(t, n);
                        } catch (o) {
                            we(e, e.return, o);
                        }
                    }
                }
                function Uc(e, t, n) {
                    n.props = Rn(e.type, e.memoizedProps), n.state = e.memoizedState;
                    try {
                        n.componentWillUnmount();
                    } catch (o) {
                        we(e, t, o);
                    }
                }
                function qo(e, t) {
                    try {
                        var n = e.ref;
                        if (n !== null) {
                            switch(e.tag){
                                case 26:
                                case 27:
                                case 5:
                                    var o = Xo(e.stateNode);
                                    break;
                                case 30:
                                    o = e.stateNode;
                                    break;
                                default:
                                    o = e.stateNode;
                            }
                            typeof n == "function" ? e.refCleanup = n(o) : n.current = o;
                        }
                    } catch (i) {
                        we(e, t, i);
                    }
                }
                function Ht(e, t) {
                    var n = e.ref, o = e.refCleanup;
                    if (n !== null) if (typeof o == "function") try {
                        o();
                    } catch (i) {
                        we(e, t, i);
                    } finally{
                        e.refCleanup = null, e = e.alternate, e != null && (e.refCleanup = null);
                    }
                    else if (typeof n == "function") try {
                        n(null);
                    } catch (i) {
                        we(e, t, i);
                    }
                    else n.current = null;
                }
                function $c(e) {
                    var t = e.type, n = e.memoizedProps, o = e.stateNode;
                    try {
                        Bm(o, t, n, e);
                    } catch (i) {
                        we(e, e.return, i);
                    }
                }
                function kl(e, t, n) {
                    try {
                        Om(e.stateNode, e.type, n, t, e);
                    } catch (o) {
                        we(e, e.return, o);
                    }
                }
                function Gc(e) {
                    return e.tag === 5 || e.tag === 3 || (Wt ? e.tag === 26 : !1) || (et ? e.tag === 27 && fo(e.type) : !1) || e.tag === 4;
                }
                function Pl(e) {
                    e: for(;;){
                        for(; e.sibling === null;){
                            if (e.return === null || Gc(e.return)) return null;
                            e = e.return;
                        }
                        for(e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;){
                            if (et && e.tag === 27 && fo(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue e;
                            e.child.return = e, e = e.child;
                        }
                        if (!(e.flags & 2)) return e.stateNode;
                    }
                }
                function Ml(e, t, n) {
                    var o = e.tag;
                    if (o === 5 || o === 6) e = e.stateNode, t ? Um(n, e, t) : Rm(n, e);
                    else if (o !== 4 && (et && o === 27 && fo(e.type) && (n = e.stateNode, t = null), e = e.child, e !== null)) for(Ml(e, t, n), e = e.sibling; e !== null;)Ml(e, t, n), e = e.sibling;
                }
                function Qr(e, t, n) {
                    var o = e.tag;
                    if (o === 5 || o === 6) e = e.stateNode, t ? Lm(n, e, t) : Am(n, e);
                    else if (o !== 4 && (et && o === 27 && fo(e.type) && (n = e.stateNode), e = e.child, e !== null)) for(Qr(e, t, n), e = e.sibling; e !== null;)Qr(e, t, n), e = e.sibling;
                }
                function Wc(e, t, n) {
                    e = e.containerInfo;
                    try {
                        Uu(e, n);
                    } catch (o) {
                        we(t, t.return, o);
                    }
                }
                function Qc(e) {
                    var t = e.stateNode, n = e.memoizedProps;
                    try {
                        Dp(e.type, n, t, e);
                    } catch (o) {
                        we(e, e.return, o);
                    }
                }
                function Vf(e, t) {
                    for(fm(e.containerInfo), rt = t; rt !== null;)if (e = rt, t = e.child, (e.subtreeFlags & 1028) !== 0 && t !== null) t.return = e, rt = t;
                    else for(; rt !== null;){
                        e = rt;
                        var n = e.alternate;
                        switch(t = e.flags, e.tag){
                            case 0:
                                if ((t & 4) !== 0 && (t = e.updateQueue, t = t !== null ? t.events : null, t !== null)) for(var o = 0; o < t.length; o++){
                                    var i = t[o];
                                    i.ref.impl = i.nextImpl;
                                }
                                break;
                            case 11:
                            case 15:
                                break;
                            case 1:
                                if ((t & 1024) !== 0 && n !== null) {
                                    t = void 0, o = e, i = n.memoizedProps, n = n.memoizedState;
                                    var c = o.stateNode;
                                    try {
                                        var f = Rn(o.type, i);
                                        t = c.getSnapshotBeforeUpdate(f, n), c.__reactInternalSnapshotBeforeUpdate = t;
                                    } catch (P) {
                                        we(o, o.return, P);
                                    }
                                }
                                break;
                            case 3:
                                (t & 1024) !== 0 && ft && Hm(e.stateNode.containerInfo);
                                break;
                            case 5:
                            case 26:
                            case 27:
                            case 6:
                            case 4:
                            case 17:
                                break;
                            default:
                                if ((t & 1024) !== 0) throw Error(d(163));
                        }
                        if (t = e.sibling, t !== null) {
                            t.return = e.return, rt = t;
                            break;
                        }
                        rt = e.return;
                    }
                }
                function Vc(e, t, n) {
                    var o = n.flags;
                    switch(n.tag){
                        case 0:
                        case 11:
                        case 15:
                            tn(e, n), o & 4 && Vo(5, n);
                            break;
                        case 1:
                            if (tn(e, n), o & 4) if (e = n.stateNode, t === null) try {
                                e.componentDidMount();
                            } catch (f) {
                                we(n, n.return, f);
                            }
                            else {
                                var i = Rn(n.type, t.memoizedProps);
                                t = t.memoizedState;
                                try {
                                    e.componentDidUpdate(i, t, e.__reactInternalSnapshotBeforeUpdate);
                                } catch (f) {
                                    we(n, n.return, f);
                                }
                            }
                            o & 64 && Lc(n), o & 512 && qo(n, n.return);
                            break;
                        case 3:
                            if (tn(e, n), o & 64 && (o = n.updateQueue, o !== null)) {
                                if (e = null, n.child !== null) switch(n.child.tag){
                                    case 27:
                                    case 5:
                                        e = Xo(n.child.stateNode);
                                        break;
                                    case 1:
                                        e = n.child.stateNode;
                                }
                                try {
                                    _s(o, e);
                                } catch (f) {
                                    we(n, n.return, f);
                                }
                            }
                            break;
                        case 27:
                            et && t === null && o & 4 && Qc(n);
                        case 26:
                        case 5:
                            if (tn(e, n), t === null) {
                                if (o & 4) $c(n);
                                else if (o & 64) {
                                    e = n.type, t = n.memoizedProps, i = n.stateNode;
                                    try {
                                        gp(i, e, t, n);
                                    } catch (f) {
                                        we(n, n.return, f);
                                    }
                                }
                            }
                            o & 512 && qo(n, n.return);
                            break;
                        case 12:
                            tn(e, n);
                            break;
                        case 31:
                            tn(e, n), o & 4 && Hc(e, n);
                            break;
                        case 13:
                            tn(e, n), o & 4 && Kc(e, n), o & 64 && (o = n.memoizedState, o !== null && (o = o.dehydrated, o !== null && (n = Jf.bind(null, n), Zm(o, n))));
                            break;
                        case 22:
                            if (o = n.memoizedState !== null || cn, !o) {
                                t = t !== null && t.memoizedState !== null || Xe, i = cn;
                                var c = Xe;
                                cn = o, (Xe = t) && !c ? nn(e, n, (n.subtreeFlags & 8772) !== 0) : tn(e, n), cn = i, Xe = c;
                            }
                            break;
                        case 30:
                            break;
                        default:
                            tn(e, n);
                    }
                }
                function qc(e) {
                    var t = e.alternate;
                    t !== null && (e.alternate = null, qc(t)), e.child = null, e.deletions = null, e.sibling = null, e.tag === 5 && (t = e.stateNode, t !== null && Sm(t)), e.stateNode = null, e.return = null, e.dependencies = null, e.memoizedProps = null, e.memoizedState = null, e.pendingProps = null, e.stateNode = null, e.updateQueue = null;
                }
                function $t(e, t, n) {
                    for(n = n.child; n !== null;)Fl(e, t, n), n = n.sibling;
                }
                function Fl(e, t, n) {
                    if (zt && typeof zt.onCommitFiberUnmount == "function") try {
                        zt.onCommitFiberUnmount(er, n);
                    } catch  {}
                    switch(n.tag){
                        case 26:
                            if (Wt) {
                                Xe || Ht(n, t), $t(e, t, n), n.memoizedState ? Ku(n.memoizedState) : n.stateNode && Xu(n.stateNode);
                                break;
                            }
                        case 27:
                            if (et) {
                                Xe || Ht(n, t);
                                var o = Ze, i = St;
                                fo(n.type) && (Ze = n.stateNode, St = !1), $t(e, t, n), ed(n.stateNode), Ze = o, St = i;
                                break;
                            }
                        case 5:
                            Xe || Ht(n, t);
                        case 6:
                            if (ft) {
                                if (o = Ze, i = St, Ze = null, $t(e, t, n), Ze = o, St = i, Ze !== null) if (St) try {
                                    Gm(Ze, n.stateNode);
                                } catch (c) {
                                    we(n, t, c);
                                }
                                else try {
                                    $m(Ze, n.stateNode);
                                } catch (c) {
                                    we(n, t, c);
                                }
                            } else $t(e, t, n);
                            break;
                        case 18:
                            ft && Ze !== null && (St ? wp(Ze, n.stateNode) : jp(Ze, n.stateNode));
                            break;
                        case 4:
                            ft ? (o = Ze, i = St, Ze = n.stateNode.containerInfo, St = !0, $t(e, t, n), Ze = o, St = i) : (Kt && Wc(n.stateNode, n, Ou()), $t(e, t, n));
                            break;
                        case 0:
                        case 11:
                        case 14:
                        case 15:
                            yn(2, n, t), Xe || yn(4, n, t), $t(e, t, n);
                            break;
                        case 1:
                            Xe || (Ht(n, t), o = n.stateNode, typeof o.componentWillUnmount == "function" && Uc(n, t, o)), $t(e, t, n);
                            break;
                        case 21:
                            $t(e, t, n);
                            break;
                        case 22:
                            Xe = (o = Xe) || n.memoizedState !== null, $t(e, t, n), Xe = o;
                            break;
                        default:
                            $t(e, t, n);
                    }
                }
                function Hc(e, t) {
                    if (mt && t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null))) {
                        e = e.dehydrated;
                        try {
                            xp(e);
                        } catch (n) {
                            we(t, t.return, n);
                        }
                    }
                }
                function Kc(e, t) {
                    if (mt && t.memoizedState === null && (e = t.alternate, e !== null && (e = e.memoizedState, e !== null && (e = e.dehydrated, e !== null)))) try {
                        vp(e);
                    } catch (n) {
                        we(t, t.return, n);
                    }
                }
                function qf(e) {
                    switch(e.tag){
                        case 31:
                        case 13:
                        case 19:
                            var t = e.stateNode;
                            return t === null && (t = e.stateNode = new ud), t;
                        case 22:
                            return e = e.stateNode, t = e._retryCache, t === null && (t = e._retryCache = new ud), t;
                        default:
                            throw Error(d(435, e.tag));
                    }
                }
                function Vr(e, t) {
                    var n = qf(e);
                    t.forEach(function(o) {
                        if (!n.has(o)) {
                            n.add(o);
                            var i = em.bind(null, e, o);
                            o.then(i, i);
                        }
                    });
                }
                function dt(e, t) {
                    var n = t.deletions;
                    if (n !== null) for(var o = 0; o < n.length; o++){
                        var i = n[o], c = e, f = t;
                        if (ft) {
                            var P = f;
                            e: for(; P !== null;){
                                switch(P.tag){
                                    case 27:
                                        if (et) {
                                            if (fo(P.type)) {
                                                Ze = P.stateNode, St = !1;
                                                break e;
                                            }
                                            break;
                                        }
                                    case 5:
                                        Ze = P.stateNode, St = !1;
                                        break e;
                                    case 3:
                                    case 4:
                                        Ze = P.stateNode.containerInfo, St = !0;
                                        break e;
                                }
                                P = P.return;
                            }
                            if (Ze === null) throw Error(d(160));
                            Fl(c, f, i), Ze = null, St = !1;
                        } else Fl(c, f, i);
                        c = i.alternate, c !== null && (c.return = null), i.return = null;
                    }
                    if (t.subtreeFlags & 13886) for(t = t.child; t !== null;)Yc(t, e), t = t.sibling;
                }
                function Yc(e, t) {
                    var n = e.alternate, o = e.flags;
                    switch(e.tag){
                        case 0:
                        case 11:
                        case 14:
                        case 15:
                            dt(t, e), ht(e), o & 4 && (yn(3, e, e.return), Vo(3, e), yn(5, e, e.return));
                            break;
                        case 1:
                            dt(t, e), ht(e), o & 512 && (Xe || n === null || Ht(n, n.return)), o & 64 && cn && (e = e.updateQueue, e !== null && (o = e.callbacks, o !== null && (n = e.shared.hiddenCallbacks, e.shared.hiddenCallbacks = n === null ? o : n.concat(o))));
                            break;
                        case 26:
                            if (Wt) {
                                var i = Vt;
                                if (dt(t, e), ht(e), o & 512 && (Xe || n === null || Ht(n, n.return)), o & 4) {
                                    o = n !== null ? n.memoizedState : null;
                                    var c = e.memoizedState;
                                    n === null ? c === null ? e.stateNode === null ? e.stateNode = Tp(i, e.type, e.memoizedProps, e) : Yu(i, e.type, e.stateNode) : e.stateNode = Hu(i, c, e.memoizedProps) : o !== c ? (o === null ? n.stateNode !== null && Xu(n.stateNode) : Ku(o), c === null ? Yu(i, e.type, e.stateNode) : Hu(i, c, e.memoizedProps)) : c === null && e.stateNode !== null && kl(e, e.memoizedProps, n.memoizedProps);
                                }
                                break;
                            }
                        case 27:
                            if (et) {
                                dt(t, e), ht(e), o & 512 && (Xe || n === null || Ht(n, n.return)), n !== null && o & 4 && kl(e, e.memoizedProps, n.memoizedProps);
                                break;
                            }
                        case 5:
                            if (dt(t, e), ht(e), o & 512 && (Xe || n === null || Ht(n, n.return)), ft) {
                                if (e.flags & 32) {
                                    i = e.stateNode;
                                    try {
                                        Bu(i);
                                    } catch (q) {
                                        we(e, e.return, q);
                                    }
                                }
                                o & 4 && e.stateNode != null && (i = e.memoizedProps, kl(e, i, n !== null ? n.memoizedProps : i)), o & 1024 && (bi = !0);
                            } else Kt && e.alternate !== null && (e.alternate.stateNode = e.stateNode);
                            break;
                        case 6:
                            if (dt(t, e), ht(e), o & 4 && ft) {
                                if (e.stateNode === null) throw Error(d(162));
                                o = e.memoizedProps, n = n !== null ? n.memoizedProps : o, i = e.stateNode;
                                try {
                                    Nm(i, n, o);
                                } catch (q) {
                                    we(e, e.return, q);
                                }
                            }
                            break;
                        case 3:
                            if (Wt ? (zp(), i = Vt, Vt = Jl(t.containerInfo), dt(t, e), Vt = i) : dt(t, e), ht(e), o & 4) {
                                if (ft && mt && n !== null && n.memoizedState.isDehydrated) try {
                                    yp(t.containerInfo);
                                } catch (q) {
                                    we(e, e.return, q);
                                }
                                if (Kt) {
                                    o = t.containerInfo, n = t.pendingChildren;
                                    try {
                                        Uu(o, n);
                                    } catch (q) {
                                        we(e, e.return, q);
                                    }
                                }
                            }
                            bi && (bi = !1, Xc(e));
                            break;
                        case 4:
                            Wt ? (n = Vt, Vt = Jl(e.stateNode.containerInfo), dt(t, e), ht(e), Vt = n) : (dt(t, e), ht(e)), o & 4 && Kt && Wc(e.stateNode, e, e.stateNode.pendingChildren);
                            break;
                        case 12:
                            dt(t, e), ht(e);
                            break;
                        case 31:
                            dt(t, e), ht(e), o & 4 && (o = e.updateQueue, o !== null && (e.updateQueue = null, Vr(e, o)));
                            break;
                        case 13:
                            dt(t, e), ht(e), e.child.flags & 8192 && e.memoizedState !== null != (n !== null && n.memoizedState !== null) && (xa = vt()), o & 4 && (o = e.updateQueue, o !== null && (e.updateQueue = null, Vr(e, o)));
                            break;
                        case 22:
                            i = e.memoizedState !== null;
                            var f = n !== null && n.memoizedState !== null, P = cn, U = Xe;
                            if (cn = P || i, Xe = U || f, dt(t, e), Xe = U, cn = P, ht(e), o & 8192 && (t = e.stateNode, t._visibility = i ? t._visibility & -2 : t._visibility | 1, i && (n === null || f || cn || Xe || Nn(e)), ft)) {
                                e: if (n = null, ft) for(t = e;;){
                                    if (t.tag === 5 || Wt && t.tag === 26) {
                                        if (n === null) {
                                            f = n = t;
                                            try {
                                                c = f.stateNode, i ? Wm(c) : Vm(f.stateNode, f.memoizedProps);
                                            } catch (q) {
                                                we(f, f.return, q);
                                            }
                                        }
                                    } else if (t.tag === 6) {
                                        if (n === null) {
                                            f = t;
                                            try {
                                                var W = f.stateNode;
                                                i ? Qm(W) : qm(W, f.memoizedProps);
                                            } catch (q) {
                                                we(f, f.return, q);
                                            }
                                        }
                                    } else if (t.tag === 18) {
                                        if (n === null) {
                                            f = t;
                                            try {
                                                var Y = f.stateNode;
                                                i ? kp(Y) : Pp(f.stateNode);
                                            } catch (q) {
                                                we(f, f.return, q);
                                            }
                                        }
                                    } else if ((t.tag !== 22 && t.tag !== 23 || t.memoizedState === null || t === e) && t.child !== null) {
                                        t.child.return = t, t = t.child;
                                        continue;
                                    }
                                    if (t === e) break e;
                                    for(; t.sibling === null;){
                                        if (t.return === null || t.return === e) break e;
                                        n === t && (n = null), t = t.return;
                                    }
                                    n === t && (n = null), t.sibling.return = t.return, t = t.sibling;
                                }
                            }
                            o & 4 && (o = e.updateQueue, o !== null && (n = o.retryQueue, n !== null && (o.retryQueue = null, Vr(e, n))));
                            break;
                        case 19:
                            dt(t, e), ht(e), o & 4 && (o = e.updateQueue, o !== null && (e.updateQueue = null, Vr(e, o)));
                            break;
                        case 30:
                            break;
                        case 21:
                            break;
                        default:
                            dt(t, e), ht(e);
                    }
                }
                function ht(e) {
                    var t = e.flags;
                    if (t & 2) {
                        try {
                            for(var n, o = e.return; o !== null;){
                                if (Gc(o)) {
                                    n = o;
                                    break;
                                }
                                o = o.return;
                            }
                            if (ft) {
                                if (n == null) throw Error(d(160));
                                switch(n.tag){
                                    case 27:
                                        if (et) {
                                            var i = n.stateNode, c = Pl(e);
                                            Qr(e, c, i);
                                            break;
                                        }
                                    case 5:
                                        var f = n.stateNode;
                                        n.flags & 32 && (Bu(f), n.flags &= -33);
                                        var P = Pl(e);
                                        Qr(e, P, f);
                                        break;
                                    case 3:
                                    case 4:
                                        var U = n.stateNode.containerInfo, W = Pl(e);
                                        Ml(e, W, U);
                                        break;
                                    default:
                                        throw Error(d(161));
                                }
                            }
                        } catch (Y) {
                            we(e, e.return, Y);
                        }
                        e.flags &= -3;
                    }
                    t & 4096 && (e.flags &= -4097);
                }
                function Xc(e) {
                    if (e.subtreeFlags & 1024) for(e = e.child; e !== null;){
                        var t = e;
                        Xc(t), t.tag === 5 && t.flags & 1024 && Pm(t.stateNode), e = e.sibling;
                    }
                }
                function tn(e, t) {
                    if (t.subtreeFlags & 8772) for(t = t.child; t !== null;)Vc(e, t.alternate, t), t = t.sibling;
                }
                function Nn(e) {
                    for(e = e.child; e !== null;){
                        var t = e;
                        switch(t.tag){
                            case 0:
                            case 11:
                            case 14:
                            case 15:
                                yn(4, t, t.return), Nn(t);
                                break;
                            case 1:
                                Ht(t, t.return);
                                var n = t.stateNode;
                                typeof n.componentWillUnmount == "function" && Uc(t, t.return, n), Nn(t);
                                break;
                            case 27:
                                et && ed(t.stateNode);
                            case 26:
                            case 5:
                                Ht(t, t.return), Nn(t);
                                break;
                            case 22:
                                t.memoizedState === null && Nn(t);
                                break;
                            case 30:
                                Nn(t);
                                break;
                            default:
                                Nn(t);
                        }
                        e = e.sibling;
                    }
                }
                function nn(e, t, n) {
                    for(n = n && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null;){
                        var o = t.alternate, i = e, c = t, f = c.flags;
                        switch(c.tag){
                            case 0:
                            case 11:
                            case 15:
                                nn(i, c, n), Vo(4, c);
                                break;
                            case 1:
                                if (nn(i, c, n), o = c, i = o.stateNode, typeof i.componentDidMount == "function") try {
                                    i.componentDidMount();
                                } catch (W) {
                                    we(o, o.return, W);
                                }
                                if (o = c, i = o.updateQueue, i !== null) {
                                    var P = o.stateNode;
                                    try {
                                        var U = i.shared.hiddenCallbacks;
                                        if (U !== null) for(i.shared.hiddenCallbacks = null, i = 0; i < U.length; i++)Is(U[i], P);
                                    } catch (W) {
                                        we(o, o.return, W);
                                    }
                                }
                                n && f & 64 && Lc(c), qo(c, c.return);
                                break;
                            case 27:
                                et && Qc(c);
                            case 26:
                            case 5:
                                nn(i, c, n), n && o === null && f & 4 && $c(c), qo(c, c.return);
                                break;
                            case 12:
                                nn(i, c, n);
                                break;
                            case 31:
                                nn(i, c, n), n && f & 4 && Hc(i, c);
                                break;
                            case 13:
                                nn(i, c, n), n && f & 4 && Kc(i, c);
                                break;
                            case 22:
                                c.memoizedState === null && nn(i, c, n), qo(c, c.return);
                                break;
                            case 30:
                                break;
                            default:
                                nn(i, c, n);
                        }
                        t = t.sibling;
                    }
                }
                function Tl(e, t) {
                    var n = null;
                    e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && yt(n));
                }
                function El(e, t) {
                    e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && yt(e));
                }
                function Gt(e, t, n, o) {
                    if (t.subtreeFlags & 10256) for(t = t.child; t !== null;)Zc(e, t, n, o), t = t.sibling;
                }
                function Zc(e, t, n, o) {
                    var i = t.flags;
                    switch(t.tag){
                        case 0:
                        case 11:
                        case 15:
                            Gt(e, t, n, o), i & 2048 && Vo(9, t);
                            break;
                        case 1:
                            Gt(e, t, n, o);
                            break;
                        case 3:
                            Gt(e, t, n, o), i & 2048 && (e = null, t.alternate !== null && (e = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== e && (t.refCount++, e != null && yt(e)));
                            break;
                        case 12:
                            if (i & 2048) {
                                Gt(e, t, n, o), e = t.stateNode;
                                try {
                                    var c = t.memoizedProps, f = c.id, P = c.onPostCommit;
                                    typeof P == "function" && P(f, t.alternate === null ? "mount" : "update", e.passiveEffectDuration, -0);
                                } catch (U) {
                                    we(t, t.return, U);
                                }
                            } else Gt(e, t, n, o);
                            break;
                        case 31:
                            Gt(e, t, n, o);
                            break;
                        case 13:
                            Gt(e, t, n, o);
                            break;
                        case 23:
                            break;
                        case 22:
                            c = t.stateNode, f = t.alternate, t.memoizedState !== null ? c._visibility & 2 ? Gt(e, t, n, o) : Ho(e, t) : c._visibility & 2 ? Gt(e, t, n, o) : (c._visibility |= 2, ao(e, t, n, o, (t.subtreeFlags & 10256) !== 0 || !1)), i & 2048 && Tl(f, t);
                            break;
                        case 24:
                            Gt(e, t, n, o), i & 2048 && El(t.alternate, t);
                            break;
                        default:
                            Gt(e, t, n, o);
                    }
                }
                function ao(e, t, n, o, i) {
                    for(i = i && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null;){
                        var c = e, f = t, P = n, U = o, W = f.flags;
                        switch(f.tag){
                            case 0:
                            case 11:
                            case 15:
                                ao(c, f, P, U, i), Vo(8, f);
                                break;
                            case 23:
                                break;
                            case 22:
                                var Y = f.stateNode;
                                f.memoizedState !== null ? Y._visibility & 2 ? ao(c, f, P, U, i) : Ho(c, f) : (Y._visibility |= 2, ao(c, f, P, U, i)), i && W & 2048 && Tl(f.alternate, f);
                                break;
                            case 24:
                                ao(c, f, P, U, i), i && W & 2048 && El(f.alternate, f);
                                break;
                            default:
                                ao(c, f, P, U, i);
                        }
                        t = t.sibling;
                    }
                }
                function Ho(e, t) {
                    if (t.subtreeFlags & 10256) for(t = t.child; t !== null;){
                        var n = e, o = t, i = o.flags;
                        switch(o.tag){
                            case 22:
                                Ho(n, o), i & 2048 && Tl(o.alternate, o);
                                break;
                            case 24:
                                Ho(n, o), i & 2048 && El(o.alternate, o);
                                break;
                            default:
                                Ho(n, o);
                        }
                        t = t.sibling;
                    }
                }
                function Bn(e, t, n) {
                    if (e.subtreeFlags & Po) for(e = e.child; e !== null;)Jc(e, t, n), e = e.sibling;
                }
                function Jc(e, t, n) {
                    switch(e.tag){
                        case 26:
                            if (Bn(e, t, n), e.flags & Po) if (e.memoizedState !== null) _p(n, Vt, e.memoizedState, e.memoizedProps);
                            else {
                                var o = e.stateNode, i = e.type;
                                e = e.memoizedProps, ((t & 335544128) === t || Yl(i, e)) && Nu(n, o, i, e);
                            }
                            break;
                        case 5:
                            Bn(e, t, n), e.flags & Po && (o = e.stateNode, i = e.type, e = e.memoizedProps, ((t & 335544128) === t || Yl(i, e)) && Nu(n, o, i, e));
                            break;
                        case 3:
                        case 4:
                            Wt ? (o = Vt, Vt = Jl(e.stateNode.containerInfo), Bn(e, t, n), Vt = o) : Bn(e, t, n);
                            break;
                        case 22:
                            e.memoizedState === null && (o = e.alternate, o !== null && o.memoizedState !== null ? (o = Po, Po = 16777216, Bn(e, t, n), Po = o) : Bn(e, t, n));
                            break;
                        default:
                            Bn(e, t, n);
                    }
                }
                function eu(e) {
                    var t = e.alternate;
                    if (t !== null && (e = t.child, e !== null)) {
                        t.child = null;
                        do t = e.sibling, e.sibling = null, e = t;
                        while (e !== null);
                    }
                }
                function Ko(e) {
                    var t = e.deletions;
                    if ((e.flags & 16) !== 0) {
                        if (t !== null) for(var n = 0; n < t.length; n++){
                            var o = t[n];
                            rt = o, nu(o, e);
                        }
                        eu(e);
                    }
                    if (e.subtreeFlags & 10256) for(e = e.child; e !== null;)tu(e), e = e.sibling;
                }
                function tu(e) {
                    switch(e.tag){
                        case 0:
                        case 11:
                        case 15:
                            Ko(e), e.flags & 2048 && yn(9, e, e.return);
                            break;
                        case 3:
                            Ko(e);
                            break;
                        case 12:
                            Ko(e);
                            break;
                        case 22:
                            var t = e.stateNode;
                            e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, qr(e)) : Ko(e);
                            break;
                        default:
                            Ko(e);
                    }
                }
                function qr(e) {
                    var t = e.deletions;
                    if ((e.flags & 16) !== 0) {
                        if (t !== null) for(var n = 0; n < t.length; n++){
                            var o = t[n];
                            rt = o, nu(o, e);
                        }
                        eu(e);
                    }
                    for(e = e.child; e !== null;){
                        switch(t = e, t.tag){
                            case 0:
                            case 11:
                            case 15:
                                yn(8, t, t.return), qr(t);
                                break;
                            case 22:
                                n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, qr(t));
                                break;
                            default:
                                qr(t);
                        }
                        e = e.sibling;
                    }
                }
                function nu(e, t) {
                    for(; rt !== null;){
                        var n = rt;
                        switch(n.tag){
                            case 0:
                            case 11:
                            case 15:
                                yn(8, n, t);
                                break;
                            case 23:
                            case 22:
                                if (n.memoizedState !== null && n.memoizedState.cachePool !== null) {
                                    var o = n.memoizedState.cachePool.pool;
                                    o != null && o.refCount++;
                                }
                                break;
                            case 24:
                                yt(n.memoizedState.cache);
                        }
                        if (o = n.child, o !== null) o.return = n, rt = o;
                        else e: for(n = e; rt !== null;){
                            o = rt;
                            var i = o.sibling, c = o.return;
                            if (qc(o), o === n) {
                                rt = null;
                                break e;
                            }
                            if (i !== null) {
                                i.return = c, rt = i;
                                break e;
                            }
                            rt = c;
                        }
                    }
                }
                function zl(e) {
                    var t = gm(e);
                    if (t != null) {
                        if (typeof t.memoizedProps["data-testname"] != "string") throw Error(d(364));
                        return t;
                    }
                    if (e = Tm(e), e === null) throw Error(d(362));
                    return e.stateNode.current;
                }
                function Il(e, t) {
                    var n = e.tag;
                    switch(t.$$typeof){
                        case pa:
                            if (e.type === t.value) return !0;
                            break;
                        case ha:
                            e: {
                                for(t = t.value, e = [
                                    e,
                                    0
                                ], n = 0; n < e.length;){
                                    var o = e[n++], i = o.tag, c = e[n++], f = t[c];
                                    if (i !== 5 && i !== 26 && i !== 27 || !Jo(o)) {
                                        for(; f != null && Il(o, f);)c++, f = t[c];
                                        if (c === t.length) {
                                            t = !0;
                                            break e;
                                        } else for(o = o.child; o !== null;)e.push(o, c), o = o.sibling;
                                    }
                                }
                                t = !1;
                            }
                            return t;
                        case ba:
                            if ((n === 5 || n === 26 || n === 27) && Im(e.stateNode, t.value)) return !0;
                            break;
                        case ya:
                            if ((n === 5 || n === 6 || n === 26 || n === 27) && (e = zm(e), e !== null && 0 <= e.indexOf(t.value))) return !0;
                            break;
                        case ga:
                            if ((n === 5 || n === 26 || n === 27) && (e = e.memoizedProps["data-testname"], typeof e == "string" && e.toLowerCase() === t.value.toLowerCase())) return !0;
                            break;
                        default:
                            throw Error(d(365));
                    }
                    return !1;
                }
                function _l(e) {
                    switch(e.$$typeof){
                        case pa:
                            return "<" + (p(e.value) || "Unknown") + ">";
                        case ha:
                            return ":has(" + (_l(e) || "") + ")";
                        case ba:
                            return '[role="' + e.value + '"]';
                        case ya:
                            return '"' + e.value + '"';
                        case ga:
                            return '[data-testname="' + e.value + '"]';
                        default:
                            throw Error(d(365));
                    }
                }
                function ou(e, t) {
                    var n = [];
                    e = [
                        e,
                        0
                    ];
                    for(var o = 0; o < e.length;){
                        var i = e[o++], c = i.tag, f = e[o++], P = t[f];
                        if (c !== 5 && c !== 26 && c !== 27 || !Jo(i)) {
                            for(; P != null && Il(i, P);)f++, P = t[f];
                            if (f === t.length) n.push(i);
                            else for(i = i.child; i !== null;)e.push(i, f), i = i.sibling;
                        }
                    }
                    return n;
                }
                function Dl(e, t) {
                    if (!Zo) throw Error(d(363));
                    e = zl(e), e = ou(e, t), t = [], e = Array.from(e);
                    for(var n = 0; n < e.length;){
                        var o = e[n++], i = o.tag;
                        if (i === 5 || i === 26 || i === 27) Jo(o) || t.push(o.stateNode);
                        else for(o = o.child; o !== null;)e.push(o), o = o.sibling;
                    }
                    return t;
                }
                function Ft() {
                    return (he & 2) !== 0 && ge !== 0 ? ge & -ge : le.T !== null ? Ga() : xm();
                }
                function ru() {
                    if (At === 0) if ((ge & 536870912) === 0 || ve) {
                        var e = ta;
                        ta <<= 1, (ta & 3932160) === 0 && (ta = 262144), At = e;
                    } else At = 536870912;
                    return e = _t.current, e !== null && (e.flags |= 32), At;
                }
                function xt(e, t, n) {
                    (e === Ee && (Fe === 2 || Fe === 9) || e.cancelPendingCommit !== null) && (lo(e, 0), xn(e, ge, At, !1)), z(e, n), ((he & 2) === 0 || e !== Ee) && (e === Ee && ((he & 2) === 0 && (Hn |= n), We === 4 && xn(e, ge, At, !1)), qt(e));
                }
                function au(e, t, n) {
                    if ((he & 6) !== 0) throw Error(d(327));
                    var o = !n && (t & 127) === 0 && (t & e.expiredLanes) === 0 || x(e, t), i = o ? Yf(e, t) : Rl(e, t, !0), c = o;
                    do {
                        if (i === 0) {
                            Mo && !o && xn(e, t, 0, !1);
                            break;
                        } else {
                            if (n = e.current.alternate, c && !Hf(n)) {
                                i = Rl(e, t, !1), c = !1;
                                continue;
                            }
                            if (i === 2) {
                                if (c = t, e.errorRecoveryDisabledLanes & c) var f = 0;
                                else f = e.pendingLanes & -536870913, f = f !== 0 ? f : f & 536870912 ? 536870912 : 0;
                                if (f !== 0) {
                                    t = f;
                                    e: {
                                        var P = e;
                                        i = sr;
                                        var U = mt && P.current.memoizedState.isDehydrated;
                                        if (U && (lo(P, f).flags |= 256), f = Rl(P, f, !1), f !== 2) {
                                            if (gi && !U) {
                                                P.errorRecoveryDisabledLanes |= c, Hn |= c, i = 4;
                                                break e;
                                            }
                                            c = Ct, Ct = i, c !== null && (Ct === null ? Ct = c : Ct.push.apply(Ct, c));
                                        }
                                        i = f;
                                    }
                                    if (c = !1, i !== 2) continue;
                                }
                            }
                            if (i === 1) {
                                lo(e, 0), xn(e, t, 0, !0);
                                break;
                            }
                            e: {
                                switch(o = e, c = i, c){
                                    case 0:
                                    case 1:
                                        throw Error(d(345));
                                    case 4:
                                        if ((t & 4194048) !== t) break;
                                    case 6:
                                        xn(o, t, At, !Pn);
                                        break e;
                                    case 2:
                                        Ct = null;
                                        break;
                                    case 3:
                                    case 5:
                                        break;
                                    default:
                                        throw Error(d(329));
                                }
                                if ((t & 62914560) === t && (i = xa + 300 - vt(), 10 < i)) {
                                    if (xn(o, t, At, !Pn), w(o, 0, !0) !== 0) break e;
                                    dn = t, o.timeoutHandle = hm(lu.bind(null, o, n, Ct, va, xi, t, At, Hn, Fo, Pn, c, "Throttled", -0, 0), i);
                                    break e;
                                }
                                lu(o, n, Ct, va, xi, t, At, Hn, Fo, Pn, c, null, -0, 0);
                            }
                        }
                        break;
                    }while (!0);
                    qt(e);
                }
                function lu(e, t, n, o, i, c, f, P, U, W, Y, q, ee, ue) {
                    if (e.timeoutHandle = Ln, q = t.subtreeFlags, q & 8192 || (q & 16785408) === 16785408) {
                        q = wm(), Jc(t, c, q);
                        var Je = (c & 62914560) === c ? xa - vt() : (c & 4194048) === c ? dd - vt() : 0;
                        if (Je = km(q, Je), Je !== null) {
                            dn = c, e.cancelPendingCommit = Je(hu.bind(null, e, t, c, n, o, i, f, P, U, Y, q, null, ee, ue)), xn(e, c, f, !W);
                            return;
                        }
                    }
                    hu(e, t, c, n, o, i, f, P, U);
                }
                function Hf(e) {
                    for(var t = e;;){
                        var n = t.tag;
                        if ((n === 0 || n === 11 || n === 15) && t.flags & 16384 && (n = t.updateQueue, n !== null && (n = n.stores, n !== null))) for(var o = 0; o < n.length; o++){
                            var i = n[o], c = i.getSnapshot;
                            i = i.value;
                            try {
                                if (!It(c(), i)) return !1;
                            } catch  {
                                return !1;
                            }
                        }
                        if (n = t.child, t.subtreeFlags & 16384 && n !== null) n.return = t, t = n;
                        else {
                            if (t === e) break;
                            for(; t.sibling === null;){
                                if (t.return === null || t.return === e) return !0;
                                t = t.return;
                            }
                            t.sibling.return = t.return, t = t.sibling;
                        }
                    }
                    return !0;
                }
                function xn(e, t, n, o) {
                    t &= ~yi, t &= ~Hn, e.suspendedLanes |= t, e.pingedLanes &= ~t, o && (e.warmLanes |= t), o = e.expirationTimes;
                    for(var i = t; 0 < i;){
                        var c = 31 - Et(i), f = 1 << c;
                        o[c] = -1, i &= ~f;
                    }
                    n !== 0 && _(e, n, t);
                }
                function iu() {
                    return (he & 6) === 0 ? (oo(0), !1) : !0;
                }
                function Al() {
                    if (be !== null) {
                        if (Fe === 0) var e = be.return;
                        else e = be, ln = $n = null, nl(e), So = null, rr = 0, e = be;
                        for(; e !== null;)Oc(e.alternate, e), e = e.return;
                        be = null;
                    }
                }
                function lo(e, t) {
                    var n = e.timeoutHandle;
                    n !== Ln && (e.timeoutHandle = Ln, bm(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), dn = 0, Al(), Ee = e, be = n = on(e.current, null), ge = t, Fe = 0, Dt = null, Pn = !1, Mo = x(e, t), gi = !1, Fo = At = yi = Hn = Mn = We = 0, Ct = sr = null, xi = !1, (t & 8) !== 0 && (t |= t & 32);
                    var o = e.entangledLanes;
                    if (o !== 0) for(e = e.entanglements, o &= t; 0 < o;){
                        var i = 31 - Et(o), c = 1 << i;
                        t |= e[i], o &= ~c;
                    }
                    return un = t, Tr(), n;
                }
                function su(e, t) {
                    de = null, le.H = lr, t === vo || t === ca ? (t = Fs(), Fe = 3) : t === ci ? (t = Fs(), Fe = 4) : Fe = t === pi ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, Dt = t, be === null && (We = 1, Or(e, X(t, e.current)));
                }
                function cu() {
                    var e = _t.current;
                    return e === null ? !0 : (ge & 4194048) === ge ? Qt === null : (ge & 62914560) === ge || (ge & 536870912) !== 0 ? e === Qt : !1;
                }
                function uu() {
                    var e = le.H;
                    return le.H = lr, e === null ? lr : e;
                }
                function du() {
                    var e = le.A;
                    return le.A = Hp, e;
                }
                function Hr() {
                    We = 4, Pn || (ge & 4194048) !== ge && _t.current !== null || (Mo = !0), (Mn & 134217727) === 0 && (Hn & 134217727) === 0 || Ee === null || xn(Ee, ge, At, !1);
                }
                function Rl(e, t, n) {
                    var o = he;
                    he |= 2;
                    var i = uu(), c = du();
                    (Ee !== e || ge !== t) && (va = null, lo(e, t)), t = !1;
                    var f = We;
                    e: do try {
                        if (Fe !== 0 && be !== null) {
                            var P = be, U = Dt;
                            switch(Fe){
                                case 8:
                                    Al(), f = 6;
                                    break e;
                                case 3:
                                case 2:
                                case 9:
                                case 6:
                                    _t.current === null && (t = !0);
                                    var W = Fe;
                                    if (Fe = 0, Dt = null, io(e, P, U, W), n && Mo) {
                                        f = 0;
                                        break e;
                                    }
                                    break;
                                default:
                                    W = Fe, Fe = 0, Dt = null, io(e, P, U, W);
                            }
                        }
                        Kf(), f = We;
                        break;
                    } catch (Y) {
                        su(e, Y);
                    }
                    while (!0);
                    return t && e.shellSuspendCounter++, ln = $n = null, he = o, le.H = i, le.A = c, be === null && (Ee = null, ge = 0, Tr()), f;
                }
                function Kf() {
                    for(; be !== null;)fu(be);
                }
                function Yf(e, t) {
                    var n = he;
                    he |= 2;
                    var o = uu(), i = du();
                    Ee !== e || ge !== t ? (va = null, cr = vt() + 500, lo(e, t)) : Mo = x(e, t);
                    e: do try {
                        if (Fe !== 0 && be !== null) {
                            t = be;
                            var c = Dt;
                            t: switch(Fe){
                                case 1:
                                    Fe = 0, Dt = null, io(e, t, c, 1);
                                    break;
                                case 2:
                                case 9:
                                    if (Ps(c)) {
                                        Fe = 0, Dt = null, mu(t);
                                        break;
                                    }
                                    t = function() {
                                        Fe !== 2 && Fe !== 9 || Ee !== e || (Fe = 7), qt(e);
                                    }, c.then(t, t);
                                    break e;
                                case 3:
                                    Fe = 7;
                                    break e;
                                case 4:
                                    Fe = 5;
                                    break e;
                                case 7:
                                    Ps(c) ? (Fe = 0, Dt = null, mu(t)) : (Fe = 0, Dt = null, io(e, t, c, 7));
                                    break;
                                case 5:
                                    var f = null;
                                    switch(be.tag){
                                        case 26:
                                            f = be.memoizedState;
                                        case 5:
                                        case 27:
                                            var P = be, U = P.type, W = P.pendingProps;
                                            if (f ? Zu(f) : Ru(P.stateNode, U, W)) {
                                                Fe = 0, Dt = null;
                                                var Y = P.sibling;
                                                if (Y !== null) be = Y;
                                                else {
                                                    var q = P.return;
                                                    q !== null ? (be = q, Kr(q)) : be = null;
                                                }
                                                break t;
                                            }
                                    }
                                    Fe = 0, Dt = null, io(e, t, c, 5);
                                    break;
                                case 6:
                                    Fe = 0, Dt = null, io(e, t, c, 6);
                                    break;
                                case 8:
                                    Al(), We = 6;
                                    break e;
                                default:
                                    throw Error(d(462));
                            }
                        }
                        Xf();
                        break;
                    } catch (ee) {
                        su(e, ee);
                    }
                    while (!0);
                    return ln = $n = null, le.H = o, le.A = i, he = n, be !== null ? 0 : (Ee = null, ge = 0, Tr(), We);
                }
                function Xf() {
                    for(; be !== null && !Np();)fu(be);
                }
                function fu(e) {
                    var t = Dc(e.alternate, e, un);
                    e.memoizedProps = e.pendingProps, t === null ? Kr(e) : be = t;
                }
                function mu(e) {
                    var t = e, n = t.alternate;
                    switch(t.tag){
                        case 15:
                        case 0:
                            t = Fc(n, t, t.pendingProps, t.type, void 0, ge);
                            break;
                        case 11:
                            t = Fc(n, t, t.pendingProps, t.type.render, t.ref, ge);
                            break;
                        case 5:
                            nl(t);
                        default:
                            Oc(n, t), t = be = ju(t, un), t = Dc(n, t, un);
                    }
                    e.memoizedProps = e.pendingProps, t === null ? Kr(e) : be = t;
                }
                function io(e, t, n, o) {
                    ln = $n = null, nl(t), So = null, rr = 0;
                    var i = t.return;
                    try {
                        if (Uf(e, i, t, n, ge)) {
                            We = 1, Or(e, X(n, e.current)), be = null;
                            return;
                        }
                    } catch (c) {
                        if (i !== null) throw be = i, c;
                        We = 1, Or(e, X(n, e.current)), be = null;
                        return;
                    }
                    t.flags & 32768 ? (ve || o === 1 ? e = !0 : Mo || (ge & 536870912) !== 0 ? e = !1 : (Pn = e = !0, (o === 2 || o === 9 || o === 3 || o === 6) && (o = _t.current, o !== null && o.tag === 13 && (o.flags |= 16384))), pu(t, e)) : Kr(t);
                }
                function Kr(e) {
                    var t = e;
                    do {
                        if ((t.flags & 32768) !== 0) {
                            pu(t, Pn);
                            return;
                        }
                        e = t.return;
                        var n = Wf(t.alternate, t, un);
                        if (n !== null) {
                            be = n;
                            return;
                        }
                        if (t = t.sibling, t !== null) {
                            be = t;
                            return;
                        }
                        be = t = e;
                    }while (t !== null);
                    We === 0 && (We = 5);
                }
                function pu(e, t) {
                    do {
                        var n = Qf(e.alternate, e);
                        if (n !== null) {
                            n.flags &= 32767, be = n;
                            return;
                        }
                        if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
                            be = e;
                            return;
                        }
                        be = e = n;
                    }while (e !== null);
                    We = 6, be = null;
                }
                function hu(e, t, n, o, i, c, f, P, U) {
                    e.cancelPendingCommit = null;
                    do Yo();
                    while (tt !== 0);
                    if ((he & 6) !== 0) throw Error(d(327));
                    if (t !== null) {
                        if (t === e.current) throw Error(d(177));
                        if (c = t.lanes | t.childLanes, c |= ui, G(e, n, c, f, P, U), e === Ee && (be = Ee = null, ge = 0), To = t, Tn = e, dn = n, vi = c, Si = i, fd = o, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, tm(ni, function() {
                            return vu(), null;
                        })) : (e.callbackNode = null, e.callbackPriority = 0), o = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || o) {
                            o = le.T, le.T = null, i = an(), ot(2), f = he, he |= 4;
                            try {
                                Vf(e, t, n);
                            } finally{
                                he = f, ot(i), le.T = o;
                            }
                        }
                        tt = 1, bu(), gu(), yu();
                    }
                }
                function bu() {
                    if (tt === 1) {
                        tt = 0;
                        var e = Tn, t = To, n = (t.flags & 13878) !== 0;
                        if ((t.subtreeFlags & 13878) !== 0 || n) {
                            n = le.T, le.T = null;
                            var o = an();
                            ot(2);
                            var i = he;
                            he |= 4;
                            try {
                                Yc(t, e), mm(e.containerInfo);
                            } finally{
                                he = i, ot(o), le.T = n;
                            }
                        }
                        e.current = t, tt = 2;
                    }
                }
                function gu() {
                    if (tt === 2) {
                        tt = 0;
                        var e = Tn, t = To, n = (t.flags & 8772) !== 0;
                        if ((t.subtreeFlags & 8772) !== 0 || n) {
                            n = le.T, le.T = null;
                            var o = an();
                            ot(2);
                            var i = he;
                            he |= 4;
                            try {
                                Vc(e, t.alternate, t);
                            } finally{
                                he = i, ot(o), le.T = n;
                            }
                        }
                        tt = 3;
                    }
                }
                function yu() {
                    if (tt === 4 || tt === 3) {
                        tt = 0, Bp();
                        var e = Tn, t = To, n = dn, o = fd;
                        (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? tt = 5 : (tt = 0, To = Tn = null, xu(e, e.pendingLanes));
                        var i = e.pendingLanes;
                        if (i === 0 && (Fn = null), K(n), t = t.stateNode, zt && typeof zt.onCommitFiberRoot == "function") try {
                            zt.onCommitFiberRoot(er, t, void 0, (t.current.flags & 128) === 128);
                        } catch  {}
                        if (o !== null) {
                            t = le.T, i = an(), ot(2), le.T = null;
                            try {
                                for(var c = e.onRecoverableError, f = 0; f < o.length; f++){
                                    var P = o[f];
                                    c(P.value, {
                                        componentStack: P.stack
                                    });
                                }
                            } finally{
                                le.T = t, ot(i);
                            }
                        }
                        (dn & 3) !== 0 && Yo(), qt(e), i = e.pendingLanes, (n & 261930) !== 0 && (i & 42) !== 0 ? e === Ci ? ur++ : (ur = 0, Ci = e) : ur = 0, mt && Cp(), oo(0);
                    }
                }
                function xu(e, t) {
                    (e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, yt(t)));
                }
                function Yo() {
                    return bu(), gu(), yu(), vu();
                }
                function vu() {
                    if (tt !== 5) return !1;
                    var e = Tn, t = vi;
                    vi = 0;
                    var n = K(dn), o = 32 > n ? 32 : n;
                    n = le.T;
                    var i = an();
                    try {
                        ot(o), le.T = null, o = Si, Si = null;
                        var c = Tn, f = dn;
                        if (tt = 0, To = Tn = null, dn = 0, (he & 6) !== 0) throw Error(d(331));
                        var P = he;
                        if (he |= 4, tu(c.current), Zc(c, c.current, f, o), he = P, oo(0, !1), zt && typeof zt.onPostCommitFiberRoot == "function") try {
                            zt.onPostCommitFiberRoot(er, c);
                        } catch  {}
                        return !0;
                    } finally{
                        ot(i), le.T = n, xu(e, t);
                    }
                }
                function Su(e, t, n) {
                    t = X(n, t), t = pl(e.stateNode, t, 2), e = hn(e, t, 2), e !== null && (z(e, 2), qt(e));
                }
                function we(e, t, n) {
                    if (e.tag === 3) Su(e, e, n);
                    else for(; t !== null;){
                        if (t.tag === 3) {
                            Su(t, e, n);
                            break;
                        } else if (t.tag === 1) {
                            var o = t.stateNode;
                            if (typeof t.type.getDerivedStateFromError == "function" || typeof o.componentDidCatch == "function" && (Fn === null || !Fn.has(o))) {
                                e = X(n, e), n = vc(2), o = hn(t, n, 2), o !== null && (Sc(n, o, t, e), z(o, 2), qt(o));
                                break;
                            }
                        }
                        t = t.return;
                    }
                }
                function Nl(e, t, n) {
                    var o = e.pingCache;
                    if (o === null) {
                        o = e.pingCache = new Kp;
                        var i = new Set;
                        o.set(t, i);
                    } else i = o.get(t), i === void 0 && (i = new Set, o.set(t, i));
                    i.has(n) || (gi = !0, i.add(n), e = Zf.bind(null, e, t, n), t.then(e, e));
                }
                function Zf(e, t, n) {
                    var o = e.pingCache;
                    o !== null && o.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, Ee === e && (ge & n) === n && (We === 4 || We === 3 && (ge & 62914560) === ge && 300 > vt() - xa ? (he & 2) === 0 && lo(e, 0) : yi |= n, Fo === ge && (Fo = 0)), qt(e);
                }
                function Cu(e, t) {
                    t === 0 && (t = k()), e = An(e, t), e !== null && (z(e, t), qt(e));
                }
                function Jf(e) {
                    var t = e.memoizedState, n = 0;
                    t !== null && (n = t.retryLane), Cu(e, n);
                }
                function em(e, t) {
                    var n = 0;
                    switch(e.tag){
                        case 31:
                        case 13:
                            var o = e.stateNode, i = e.memoizedState;
                            i !== null && (n = i.retryLane);
                            break;
                        case 19:
                            o = e.stateNode;
                            break;
                        case 22:
                            o = e.stateNode._retryCache;
                            break;
                        default:
                            throw Error(d(314));
                    }
                    o !== null && o.delete(t), Cu(e, n);
                }
                function tm(e, t) {
                    return oa(e, t);
                }
                function nm(e, t, n, o) {
                    this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = o, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
                }
                function Bl(e) {
                    return e = e.prototype, !(!e || !e.isReactComponent);
                }
                function on(e, t) {
                    var n = e.alternate;
                    return n === null ? (n = s(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 65011712, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
                        lanes: t.lanes,
                        firstContext: t.firstContext
                    }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
                }
                function ju(e, t) {
                    e.flags &= 65011714;
                    var n = e.alternate;
                    return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
                        lanes: t.lanes,
                        firstContext: t.firstContext
                    }), e;
                }
                function Yr(e, t, n, o, i, c) {
                    var f = 0;
                    if (o = e, typeof e == "function") Bl(e) && (f = 1);
                    else if (typeof e == "string") f = Wt && et ? Vu(e, n, st.current) ? 26 : td(e) ? 27 : 5 : Wt ? Vu(e, n, st.current) ? 26 : 5 : et && td(e) ? 27 : 5;
                    else e: switch(e){
                        case Hl:
                            return e = s(31, n, t, i), e.elementType = Hl, e.lanes = c, e;
                        case co:
                            return On(n.children, i, c, t);
                        case Eu:
                            f = 8, i |= 24;
                            break;
                        case Gl:
                            return e = s(12, n, t, i | 2), e.elementType = Gl, e.lanes = c, e;
                        case Ql:
                            return e = s(13, n, t, i), e.elementType = Ql, e.lanes = c, e;
                        case Vl:
                            return e = s(19, n, t, i), e.elementType = Vl, e.lanes = c, e;
                        default:
                            if (typeof e == "object" && e !== null) switch(e.$$typeof){
                                case vn:
                                    f = 10;
                                    break e;
                                case zu:
                                    f = 9;
                                    break e;
                                case Wl:
                                    f = 11;
                                    break e;
                                case ql:
                                    f = 14;
                                    break e;
                                case Sn:
                                    f = 16, o = null;
                                    break e;
                            }
                            f = 29, n = Error(d(130, e === null ? "null" : typeof e, "")), o = null;
                    }
                    return t = s(f, n, t, i), t.elementType = e, t.type = o, t.lanes = c, t;
                }
                function On(e, t, n, o) {
                    return e = s(7, e, o, t), e.lanes = n, e;
                }
                function Ol(e, t, n) {
                    return e = s(6, e, null, t), e.lanes = n, e;
                }
                function wu(e) {
                    var t = s(18, null, null, 0);
                    return t.stateNode = e, t;
                }
                function Ll(e, t, n) {
                    return t = s(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = {
                        containerInfo: e.containerInfo,
                        pendingChildren: null,
                        implementation: e.implementation
                    }, t;
                }
                function om(e, t, n, o, i, c, f, P, U) {
                    this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = Ln, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = E(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = E(0), this.hiddenUpdates = E(null), this.identifierPrefix = o, this.onUncaughtError = i, this.onCaughtError = c, this.onRecoverableError = f, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = U, this.incompleteTransitions = new Map;
                }
                function ku(e, t, n, o, i, c, f, P, U, W, Y, q) {
                    return e = new om(e, t, n, f, U, W, Y, q, P), t = 1, c === !0 && (t |= 24), c = s(3, null, null, t), e.current = c, c.stateNode = e, t = Rt(), t.refCount++, e.pooledCache = t, t.refCount++, c.memoizedState = {
                        element: o,
                        isDehydrated: n,
                        cache: t
                    }, Va(c), e;
                }
                function Pu(e) {
                    return e ? (e = po, e) : po;
                }
                function Mu(e) {
                    var t = e._reactInternals;
                    if (t === void 0) throw typeof e.render == "function" ? Error(d(188)) : (e = Object.keys(e).join(","), Error(d(268, e)));
                    return e = v(t), e = e !== null ? b(e) : null, e === null ? null : Xo(e.stateNode);
                }
                function Fu(e, t, n, o, i, c) {
                    i = Pu(i), o.context === null ? o.context = i : o.pendingContext = i, o = pn(t), o.payload = {
                        element: n
                    }, c = c === void 0 ? null : c, c !== null && (o.callback = c), n = hn(e, o, t), n !== null && (xt(n, e, t), Oo(n, e, t));
                }
                function Tu(e, t) {
                    if (e = e.memoizedState, e !== null && e.dehydrated !== null) {
                        var n = e.retryLane;
                        e.retryLane = n !== 0 && n < t ? n : t;
                    }
                }
                function Ul(e, t) {
                    Tu(e, t), (e = e.alternate) && Tu(e, t);
                }
                var pe = {}, rm = is, Tt = $h, $l = Object.assign, am = Symbol.for("react.element"), Xr = Symbol.for("react.transitional.element"), so = Symbol.for("react.portal"), co = Symbol.for("react.fragment"), Eu = Symbol.for("react.strict_mode"), Gl = Symbol.for("react.profiler"), zu = Symbol.for("react.consumer"), vn = Symbol.for("react.context"), Wl = Symbol.for("react.forward_ref"), Ql = Symbol.for("react.suspense"), Vl = Symbol.for("react.suspense_list"), ql = Symbol.for("react.memo"), Sn = Symbol.for("react.lazy"), Hl = Symbol.for("react.activity"), lm = Symbol.for("react.memo_cache_sentinel"), Iu = Symbol.iterator, im = Symbol.for("react.client.reference"), Zr = Array.isArray, le = rm.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, sm = r.rendererVersion, cm = r.rendererPackageName, _u = r.extraDevToolsConfig, Xo = r.getPublicInstance, um = r.getRootHostContext, dm = r.getChildHostContext, fm = r.prepareForCommit, mm = r.resetAfterCommit, pm = r.createInstance;
                r.cloneMutableInstance;
                var Kl = r.appendInitialChild, Du = r.finalizeInitialChildren, Jr = r.shouldSetTextContent, Au = r.createTextInstance;
                r.cloneMutableTextInstance;
                var hm = r.scheduleTimeout, bm = r.cancelTimeout, Ln = r.noTimeout, rn = r.isPrimaryRenderer;
                r.warnsIfNotActing;
                var ft = r.supportsMutation, Kt = r.supportsPersistence, mt = r.supportsHydration, gm = r.getInstanceFromNode;
                r.beforeActiveInstanceBlur;
                var ym = r.preparePortalMount;
                r.prepareScopeUpdate, r.getInstanceFromScope;
                var ot = r.setCurrentUpdatePriority, an = r.getCurrentUpdatePriority, xm = r.resolveUpdatePriority;
                r.trackSchedulerEvent, r.resolveEventType, r.resolveEventTimeStamp;
                var vm = r.shouldAttemptEagerTransition, Sm = r.detachDeletedInstance;
                r.requestPostPaintCallback;
                var Cm = r.maySuspendCommit, jm = r.maySuspendCommitOnUpdate, Yl = r.maySuspendCommitInSyncRender, Ru = r.preloadInstance, wm = r.startSuspendingCommit, Nu = r.suspendInstance;
                r.suspendOnActiveViewTransition;
                var km = r.waitForCommitToBeReady;
                r.getSuspendedCommitReason;
                var uo = r.NotPendingTransition, Un = r.HostTransitionContext, Pm = r.resetFormInstance;
                r.bindToConsole;
                var Mm = r.supportsMicrotasks, Fm = r.scheduleMicrotask, Zo = r.supportsTestSelectors, Tm = r.findFiberRoot, Em = r.getBoundingRect, zm = r.getTextContent, Jo = r.isHiddenSubtree, Im = r.matchAccessibilityRole, _m = r.setFocusIfFocusable, Dm = r.setupIntersectionObserver, Am = r.appendChild, Rm = r.appendChildToContainer, Nm = r.commitTextUpdate, Bm = r.commitMount, Om = r.commitUpdate, Lm = r.insertBefore, Um = r.insertInContainerBefore, $m = r.removeChild, Gm = r.removeChildFromContainer, Bu = r.resetTextContent, Wm = r.hideInstance, Qm = r.hideTextInstance, Vm = r.unhideInstance, qm = r.unhideTextInstance;
                r.cancelViewTransitionName, r.cancelRootViewTransitionName, r.restoreRootViewTransitionName, r.cloneRootViewTransitionContainer, r.removeRootViewTransitionClone, r.measureClonedInstance, r.hasInstanceChanged, r.hasInstanceAffectedParent, r.startViewTransition, r.startGestureTransition, r.stopViewTransition, r.getCurrentGestureOffset, r.createViewTransitionInstance;
                var Hm = r.clearContainer;
                r.createFragmentInstance, r.updateFragmentInstanceFiber, r.commitNewChildToFragmentInstance, r.deleteChildFromFragmentInstance;
                var Km = r.cloneInstance, Ou = r.createContainerChildSet, Lu = r.appendChildToContainerChildSet, Ym = r.finalizeContainerChildren, Uu = r.replaceContainerChildren, $u = r.cloneHiddenInstance, Gu = r.cloneHiddenTextInstance, Xl = r.isSuspenseInstancePending, Zl = r.isSuspenseInstanceFallback, Xm = r.getSuspenseInstanceFallbackErrorDetails, Zm = r.registerSuspenseInstanceRetry, Jm = r.canHydrateFormStateMarker, ep = r.isFormStateMarkerMatching, Wu = r.getNextHydratableSibling, tp = r.getNextHydratableSiblingAfterSingleton, np = r.getFirstHydratableChild, op = r.getFirstHydratableChildWithinContainer, rp = r.getFirstHydratableChildWithinActivityInstance, ap = r.getFirstHydratableChildWithinSuspenseInstance, lp = r.getFirstHydratableChildWithinSingleton, ip = r.canHydrateInstance, sp = r.canHydrateTextInstance, cp = r.canHydrateActivityInstance, up = r.canHydrateSuspenseInstance, dp = r.hydrateInstance, fp = r.hydrateTextInstance, mp = r.hydrateActivityInstance, pp = r.hydrateSuspenseInstance, hp = r.getNextHydratableInstanceAfterActivityInstance, bp = r.getNextHydratableInstanceAfterSuspenseInstance, gp = r.commitHydratedInstance, yp = r.commitHydratedContainer, xp = r.commitHydratedActivityInstance, vp = r.commitHydratedSuspenseInstance, Sp = r.finalizeHydratedChildren, Cp = r.flushHydrationEvents;
                r.clearActivityBoundary;
                var jp = r.clearSuspenseBoundary;
                r.clearActivityBoundaryFromContainer;
                var wp = r.clearSuspenseBoundaryFromContainer, kp = r.hideDehydratedBoundary, Pp = r.unhideDehydratedBoundary, Qu = r.shouldDeleteUnhydratedTailInstances;
                r.diffHydratedPropsForDevWarnings, r.diffHydratedTextForDevWarnings, r.describeHydratableInstanceForDevWarnings;
                var Mp = r.validateHydratableInstance, Fp = r.validateHydratableTextInstance, Wt = r.supportsResources, Vu = r.isHostHoistableType, Jl = r.getHoistableRoot, qu = r.getResource, Hu = r.acquireResource, Ku = r.releaseResource, Tp = r.hydrateHoistable, Yu = r.mountHoistable, Xu = r.unmountHoistable, Ep = r.createHoistableInstance, zp = r.prepareToCommitHoistables, Ip = r.mayResourceSuspendCommit, Zu = r.preloadResource, _p = r.suspendResource, et = r.supportsSingletons, Ju = r.resolveSingletonInstance, Dp = r.acquireSingletonInstance, ed = r.releaseSingletonInstance, td = r.isHostSingletonType, fo = r.isSingletonScope, ei = [], mo = -1, po = {}, Et = Math.clz32 ? Math.clz32 : j, Ap = Math.log, Rp = Math.LN2, ea = 256, ta = 262144, na = 4194304, oa = Tt.unstable_scheduleCallback, ti = Tt.unstable_cancelCallback, Np = Tt.unstable_shouldYield, Bp = Tt.unstable_requestPaint, vt = Tt.unstable_now, nd = Tt.unstable_ImmediatePriority, Op = Tt.unstable_UserBlockingPriority, ni = Tt.unstable_NormalPriority, Lp = Tt.unstable_IdlePriority, Up = Tt.log, $p = Tt.unstable_setDisableYieldValue, er = null, zt = null, It = typeof Object.is == "function" ? Object.is : Z, od = typeof reportError == "function" ? reportError : function(e) {
                    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
                        var t = new window.ErrorEvent("error", {
                            bubbles: !0,
                            cancelable: !0,
                            message: typeof e == "object" && e !== null && typeof e.message == "string" ? String(e.message) : String(e),
                            error: e
                        });
                        if (!window.dispatchEvent(t)) return;
                    } else if (typeof process == "object" && typeof process.emit == "function") {
                        process.emit("uncaughtException", e);
                        return;
                    }
                    console.error(e);
                }, Gp = Object.prototype.hasOwnProperty, oi, rd, ri = !1, ad = new WeakMap, ho = [], bo = 0, ra = null, tr = 0, Nt = [], Bt = 0, Cn = null, Yt = 1, Xt = "", st = M(null), nr = M(null), jn = M(null), aa = M(null), ct = null, Ne = null, ve = !1, wn = null, Ot = !1, ai = Error(d(519)), la = M(null), $n = null, ln = null, Wp = typeof AbortController < "u" ? AbortController : function() {
                    var e = [], t = this.signal = {
                        aborted: !1,
                        addEventListener: function(n, o) {
                            e.push(o);
                        }
                    };
                    this.abort = function() {
                        t.aborted = !0, e.forEach(function(n) {
                            return n();
                        });
                    };
                }, Qp = Tt.unstable_scheduleCallback, Vp = Tt.unstable_NormalPriority, Be = {
                    $$typeof: vn,
                    Consumer: null,
                    Provider: null,
                    _currentValue: null,
                    _currentValue2: null,
                    _threadCount: 0
                }, ia = null, go = null, li = !1, sa = !1, ii = !1, Gn = 0, or = null, si = 0, yo = 0, xo = null, ld = le.S;
                le.S = function(e, t) {
                    dd = vt(), typeof t == "object" && t !== null && typeof t.then == "function" && _f(e, t), ld !== null && ld(e, t);
                };
                var Wn = M(null), vo = Error(d(460)), ci = Error(d(474)), ca = Error(d(542)), ua = {
                    then: function() {}
                }, Qn = null, So = null, rr = 0, Vn = Es(!0), id = Es(!1), Lt = [], Co = 0, ui = 0, kn = !1, di = !1, jo = M(null), da = M(0), _t = M(null), Qt = null, Ve = M(0), sn = 0, de = null, Te = null, Ke = null, fa = !1, wo = !1, qn = !1, ma = 0, ar = 0, ko = null, qp = 0, lr = {
                    readContext: Ce,
                    use: Dr,
                    useCallback: Ge,
                    useContext: Ge,
                    useEffect: Ge,
                    useImperativeHandle: Ge,
                    useLayoutEffect: Ge,
                    useInsertionEffect: Ge,
                    useMemo: Ge,
                    useReducer: Ge,
                    useRef: Ge,
                    useState: Ge,
                    useDebugValue: Ge,
                    useDeferredValue: Ge,
                    useTransition: Ge,
                    useSyncExternalStore: Ge,
                    useId: Ge,
                    useHostTransitionStatus: Ge,
                    useFormState: Ge,
                    useActionState: Ge,
                    useOptimistic: Ge,
                    useMemoCache: Ge,
                    useCacheRefresh: Ge
                };
                lr.useEffectEvent = Ge;
                var sd = {
                    readContext: Ce,
                    use: Dr,
                    useCallback: function(e, t) {
                        return pt().memoizedState = [
                            e,
                            t === void 0 ? null : t
                        ], e;
                    },
                    useContext: Ce,
                    useEffect: tc,
                    useImperativeHandle: function(e, t, n) {
                        n = n != null ? n.concat([
                            e
                        ]) : null, Rr(4194308, 4, ac.bind(null, t, e), n);
                    },
                    useLayoutEffect: function(e, t) {
                        return Rr(4194308, 4, e, t);
                    },
                    useInsertionEffect: function(e, t) {
                        Rr(4, 2, e, t);
                    },
                    useMemo: function(e, t) {
                        var n = pt();
                        t = t === void 0 ? null : t;
                        var o = e();
                        if (qn) {
                            Q(!0);
                            try {
                                e();
                            } finally{
                                Q(!1);
                            }
                        }
                        return n.memoizedState = [
                            o,
                            t
                        ], o;
                    },
                    useReducer: function(e, t, n) {
                        var o = pt();
                        if (n !== void 0) {
                            var i = n(t);
                            if (qn) {
                                Q(!0);
                                try {
                                    n(t);
                                } finally{
                                    Q(!1);
                                }
                            }
                        } else i = t;
                        return o.memoizedState = o.baseState = i, e = {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: e,
                            lastRenderedState: i
                        }, o.queue = e, e = e.dispatch = Lf.bind(null, de, e), [
                            o.memoizedState,
                            e
                        ];
                    },
                    useRef: function(e) {
                        var t = pt();
                        return e = {
                            current: e
                        }, t.memoizedState = e;
                    },
                    useState: function(e) {
                        e = ll(e);
                        var t = e.queue, n = pc.bind(null, de, t);
                        return t.dispatch = n, [
                            e.memoizedState,
                            n
                        ];
                    },
                    useDebugValue: cl,
                    useDeferredValue: function(e, t) {
                        var n = pt();
                        return ul(n, e, t);
                    },
                    useTransition: function() {
                        var e = ll(!1);
                        return e = uc.bind(null, de, e.queue, !0, !1), pt().memoizedState = e, [
                            !1,
                            e
                        ];
                    },
                    useSyncExternalStore: function(e, t, n) {
                        var o = de, i = pt();
                        if (ve) {
                            if (n === void 0) throw Error(d(407));
                            n = n();
                        } else {
                            if (n = t(), Ee === null) throw Error(d(349));
                            (ge & 127) !== 0 || Os(o, t, n);
                        }
                        i.memoizedState = n;
                        var c = {
                            value: n,
                            getSnapshot: t
                        };
                        return i.queue = c, tc(Us.bind(null, o, c, e), [
                            e
                        ]), o.flags |= 2048, ro(9, {
                            destroy: void 0
                        }, Ls.bind(null, o, c, n, t), null), n;
                    },
                    useId: function() {
                        var e = pt(), t = Ee.identifierPrefix;
                        if (ve) {
                            var n = Xt, o = Yt;
                            n = (o & ~(1 << 32 - Et(o) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = ma++, 0 < n && (t += "H" + n.toString(32)), t += "_";
                        } else n = qp++, t = "_" + t + "r_" + n.toString(32) + "_";
                        return e.memoizedState = t;
                    },
                    useHostTransitionStatus: dl,
                    useFormState: Ys,
                    useActionState: Ys,
                    useOptimistic: function(e) {
                        var t = pt();
                        t.memoizedState = t.baseState = e;
                        var n = {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: null,
                            lastRenderedState: null
                        };
                        return t.queue = n, t = fl.bind(null, de, !0, n), n.dispatch = t, [
                            e,
                            t
                        ];
                    },
                    useMemoCache: ol,
                    useCacheRefresh: function() {
                        return pt().memoizedState = Of.bind(null, de);
                    },
                    useEffectEvent: function(e) {
                        var t = pt(), n = {
                            impl: e
                        };
                        return t.memoizedState = n, function() {
                            if ((he & 2) !== 0) throw Error(d(440));
                            return n.impl.apply(void 0, arguments);
                        };
                    }
                }, fi = {
                    readContext: Ce,
                    use: Dr,
                    useCallback: ic,
                    useContext: Ce,
                    useEffect: sl,
                    useImperativeHandle: lc,
                    useInsertionEffect: oc,
                    useLayoutEffect: rc,
                    useMemo: sc,
                    useReducer: Ar,
                    useRef: ec,
                    useState: function() {
                        return Ar(Jt);
                    },
                    useDebugValue: cl,
                    useDeferredValue: function(e, t) {
                        var n = Qe();
                        return cc(n, Te.memoizedState, e, t);
                    },
                    useTransition: function() {
                        var e = Ar(Jt)[0], t = Qe().memoizedState;
                        return [
                            typeof e == "boolean" ? e : $o(e),
                            t
                        ];
                    },
                    useSyncExternalStore: Bs,
                    useId: fc,
                    useHostTransitionStatus: dl,
                    useFormState: Xs,
                    useActionState: Xs,
                    useOptimistic: function(e, t) {
                        var n = Qe();
                        return Ws(n, Te, e, t);
                    },
                    useMemoCache: ol,
                    useCacheRefresh: mc
                };
                fi.useEffectEvent = nc;
                var cd = {
                    readContext: Ce,
                    use: Dr,
                    useCallback: ic,
                    useContext: Ce,
                    useEffect: sl,
                    useImperativeHandle: lc,
                    useInsertionEffect: oc,
                    useLayoutEffect: rc,
                    useMemo: sc,
                    useReducer: al,
                    useRef: ec,
                    useState: function() {
                        return al(Jt);
                    },
                    useDebugValue: cl,
                    useDeferredValue: function(e, t) {
                        var n = Qe();
                        return Te === null ? ul(n, e, t) : cc(n, Te.memoizedState, e, t);
                    },
                    useTransition: function() {
                        var e = al(Jt)[0], t = Qe().memoizedState;
                        return [
                            typeof e == "boolean" ? e : $o(e),
                            t
                        ];
                    },
                    useSyncExternalStore: Bs,
                    useId: fc,
                    useHostTransitionStatus: dl,
                    useFormState: Js,
                    useActionState: Js,
                    useOptimistic: function(e, t) {
                        var n = Qe();
                        return Te !== null ? Ws(n, Te, e, t) : (n.baseState = e, [
                            e,
                            n.queue.dispatch
                        ]);
                    },
                    useMemoCache: ol,
                    useCacheRefresh: mc
                };
                cd.useEffectEvent = nc;
                var mi = {
                    enqueueSetState: function(e, t, n) {
                        e = e._reactInternals;
                        var o = Ft(), i = pn(o);
                        i.payload = t, n != null && (i.callback = n), t = hn(e, i, o), t !== null && (xt(t, e, o), Oo(t, e, o));
                    },
                    enqueueReplaceState: function(e, t, n) {
                        e = e._reactInternals;
                        var o = Ft(), i = pn(o);
                        i.tag = 1, i.payload = t, n != null && (i.callback = n), t = hn(e, i, o), t !== null && (xt(t, e, o), Oo(t, e, o));
                    },
                    enqueueForceUpdate: function(e, t) {
                        e = e._reactInternals;
                        var n = Ft(), o = pn(n);
                        o.tag = 2, t != null && (o.callback = t), t = hn(e, o, n), t !== null && (xt(t, e, n), Oo(t, e, n));
                    }
                }, pi = Error(d(461)), Ye = !1, hi = {
                    dehydrated: null,
                    treeContext: null,
                    retryLane: 0,
                    hydrationErrors: null
                }, cn = !1, Xe = !1, bi = !1, ud = typeof WeakSet == "function" ? WeakSet : Set, rt = null, Ze = null, St = !1, Vt = null, Po = 8192, Hp = {
                    getCacheForType: function(e) {
                        var t = Ce(Be), n = t.data.get(e);
                        return n === void 0 && (n = e(), t.data.set(e, n)), n;
                    },
                    cacheSignal: function() {
                        return Ce(Be).controller.signal;
                    }
                }, pa = 0, ha = 1, ba = 2, ga = 3, ya = 4;
                if (typeof Symbol == "function" && Symbol.for) {
                    var ir = Symbol.for;
                    pa = ir("selector.component"), ha = ir("selector.has_pseudo_class"), ba = ir("selector.role"), ga = ir("selector.test_id"), ya = ir("selector.text");
                }
                var Kp = typeof WeakMap == "function" ? WeakMap : Map, he = 0, Ee = null, be = null, ge = 0, Fe = 0, Dt = null, Pn = !1, Mo = !1, gi = !1, un = 0, We = 0, Mn = 0, Hn = 0, yi = 0, At = 0, Fo = 0, sr = null, Ct = null, xi = !1, xa = 0, dd = 0, cr = 1 / 0, va = null, Fn = null, tt = 0, Tn = null, To = null, dn = 0, vi = 0, Si = null, fd = null, ur = 0, Ci = null;
                return pe.attemptContinuousHydration = function(e) {
                    if (e.tag === 13 || e.tag === 31) {
                        var t = An(e, 67108864);
                        t !== null && xt(t, e, 67108864), Ul(e, 67108864);
                    }
                }, pe.attemptHydrationAtCurrentPriority = function(e) {
                    if (e.tag === 13 || e.tag === 31) {
                        var t = Ft();
                        t = V(t);
                        var n = An(e, t);
                        n !== null && xt(n, e, t), Ul(e, t);
                    }
                }, pe.attemptSynchronousHydration = function(e) {
                    switch(e.tag){
                        case 3:
                            if (e = e.stateNode, e.current.memoizedState.isDehydrated) {
                                var t = F(e.pendingLanes);
                                if (t !== 0) {
                                    for(e.pendingLanes |= 2, e.entangledLanes |= 2; t;){
                                        var n = 1 << 31 - Et(t);
                                        e.entanglements[1] |= n, t &= ~n;
                                    }
                                    qt(e), (he & 6) === 0 && (cr = vt() + 500, oo(0));
                                }
                            }
                            break;
                        case 31:
                        case 13:
                            t = An(e, 2), t !== null && xt(t, e, 2), iu(), Ul(e, 2);
                    }
                }, pe.batchedUpdates = function(e, t) {
                    return e(t);
                }, pe.createComponentSelector = function(e) {
                    return {
                        $$typeof: pa,
                        value: e
                    };
                }, pe.createContainer = function(e, t, n, o, i, c, f, P, U, W) {
                    return ku(e, t, !1, null, n, o, c, null, f, P, U, W);
                }, pe.createHasPseudoClassSelector = function(e) {
                    return {
                        $$typeof: ha,
                        value: e
                    };
                }, pe.createHydrationContainer = function(e, t, n, o, i, c, f, P, U, W, Y, q, ee, ue) {
                    var Je;
                    return e = ku(n, o, !0, e, i, c, P, ue, U, W, Y, q), e.context = Pu(null), n = e.current, o = Ft(), o = V(o), i = pn(o), i.callback = (Je = t) != null ? Je : null, hn(n, i, o), t = o, e.current.lanes = t, z(e, t), qt(e), e;
                }, pe.createPortal = function(e, t, n) {
                    var o = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
                    return {
                        $$typeof: so,
                        key: o == null ? null : "" + o,
                        children: e,
                        containerInfo: t,
                        implementation: n
                    };
                }, pe.createRoleSelector = function(e) {
                    return {
                        $$typeof: ba,
                        value: e
                    };
                }, pe.createTestNameSelector = function(e) {
                    return {
                        $$typeof: ga,
                        value: e
                    };
                }, pe.createTextSelector = function(e) {
                    return {
                        $$typeof: ya,
                        value: e
                    };
                }, pe.defaultOnCaughtError = function(e) {
                    console.error(e);
                }, pe.defaultOnRecoverableError = function(e) {
                    od(e);
                }, pe.defaultOnUncaughtError = function(e) {
                    od(e);
                }, pe.deferredUpdates = function(e) {
                    var t = le.T, n = an();
                    try {
                        return ot(32), le.T = null, e();
                    } finally{
                        ot(n), le.T = t;
                    }
                }, pe.discreteUpdates = function(e, t, n, o, i) {
                    var c = le.T, f = an();
                    try {
                        return ot(2), le.T = null, e(t, n, o, i);
                    } finally{
                        ot(f), le.T = c, he === 0 && (cr = vt() + 500);
                    }
                }, pe.findAllNodes = Dl, pe.findBoundingRects = function(e, t) {
                    if (!Zo) throw Error(d(363));
                    t = Dl(e, t), e = [];
                    for(var n = 0; n < t.length; n++)e.push(Em(t[n]));
                    for(t = e.length - 1; 0 < t; t--){
                        n = e[t];
                        for(var o = n.x, i = o + n.width, c = n.y, f = c + n.height, P = t - 1; 0 <= P; P--)if (t !== P) {
                            var U = e[P], W = U.x, Y = W + U.width, q = U.y, ee = q + U.height;
                            if (o >= W && c >= q && i <= Y && f <= ee) {
                                e.splice(t, 1);
                                break;
                            } else if (o !== W || n.width !== U.width || ee < c || q > f) {
                                if (!(c !== q || n.height !== U.height || Y < o || W > i)) {
                                    W > o && (U.width += W - o, U.x = o), Y < i && (U.width = i - W), e.splice(t, 1);
                                    break;
                                }
                            } else {
                                q > c && (U.height += q - c, U.y = c), ee < f && (U.height = f - q), e.splice(t, 1);
                                break;
                            }
                        }
                    }
                    return e;
                }, pe.findHostInstance = Mu, pe.findHostInstanceWithNoPortals = function(e) {
                    return e = v(e), e = e !== null ? C(e) : null, e === null ? null : Xo(e.stateNode);
                }, pe.findHostInstanceWithWarning = function(e) {
                    return Mu(e);
                }, pe.flushPassiveEffects = Yo, pe.flushSyncFromReconciler = function(e) {
                    var t = he;
                    he |= 1;
                    var n = le.T, o = an();
                    try {
                        if (ot(2), le.T = null, e) return e();
                    } finally{
                        ot(o), le.T = n, he = t, (he & 6) === 0 && oo(0);
                    }
                }, pe.flushSyncWork = iu, pe.focusWithin = function(e, t) {
                    if (!Zo) throw Error(d(363));
                    for(e = zl(e), t = ou(e, t), t = Array.from(t), e = 0; e < t.length;){
                        var n = t[e++], o = n.tag;
                        if (!Jo(n)) {
                            if ((o === 5 || o === 26 || o === 27) && _m(n.stateNode)) return !0;
                            for(n = n.child; n !== null;)t.push(n), n = n.sibling;
                        }
                    }
                    return !1;
                }, pe.getFindAllNodesFailureDescription = function(e, t) {
                    if (!Zo) throw Error(d(363));
                    var n = 0, o = [];
                    e = [
                        zl(e),
                        0
                    ];
                    for(var i = 0; i < e.length;){
                        var c = e[i++], f = c.tag, P = e[i++], U = t[P];
                        if ((f !== 5 && f !== 26 && f !== 27 || !Jo(c)) && (Il(c, U) && (o.push(_l(U)), P++, P > n && (n = P)), P < t.length)) for(c = c.child; c !== null;)e.push(c, P), c = c.sibling;
                    }
                    if (n < t.length) {
                        for(e = []; n < t.length; n++)e.push(_l(t[n]));
                        return `findAllNodes was able to match part of the selector:
  ` + (o.join(" > ") + `

No matching component was found for:
  `) + e.join(" > ");
                    }
                    return null;
                }, pe.getPublicRootInstance = function(e) {
                    if (e = e.current, !e.child) return null;
                    switch(e.child.tag){
                        case 27:
                        case 5:
                            return Xo(e.child.stateNode);
                        default:
                            return e.child.stateNode;
                    }
                }, pe.injectIntoDevTools = function() {
                    var e = {
                        bundleType: 0,
                        version: sm,
                        rendererPackageName: cm,
                        currentDispatcherRef: le,
                        reconcilerVersion: "19.2.0"
                    };
                    if (_u !== null && (e.rendererConfig = _u), typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u") e = !1;
                    else {
                        var t = __REACT_DEVTOOLS_GLOBAL_HOOK__;
                        if (t.isDisabled || !t.supportsFiber) e = !0;
                        else {
                            try {
                                er = t.inject(e), zt = t;
                            } catch  {}
                            e = !!t.checkDCE;
                        }
                    }
                    return e;
                }, pe.isAlreadyRendering = function() {
                    return (he & 6) !== 0;
                }, pe.observeVisibleRects = function(e, t, n, o) {
                    if (!Zo) throw Error(d(363));
                    e = Dl(e, t);
                    var i = Dm(e, n, o).disconnect;
                    return {
                        disconnect: function() {
                            i();
                        }
                    };
                }, pe.shouldError = function() {
                    return null;
                }, pe.shouldSuspend = function() {
                    return !1;
                }, pe.startHostTransition = function(e, t, n, o) {
                    if (e.tag !== 5) throw Error(d(476));
                    var i = dc(e).queue;
                    uc(e, i, t, uo, n === null ? u : function() {
                        var c = dc(e);
                        return c.next === null && (c = e.alternate.memoizedState), Go(e, c.next.queue, {}, Ft()), n(o);
                    });
                }, pe.updateContainer = function(e, t, n, o) {
                    var i = t.current, c = Ft();
                    return Fu(i, c, e, t, n, o), c;
                }, pe.updateContainerSync = function(e, t, n, o) {
                    return Fu(t.current, 2, e, t, n, o), 2;
                }, pe;
            }, a.exports.default = a.exports, Object.defineProperty(a.exports, "__esModule", {
                value: !0
            });
        })(kd)), kd.exports;
    }
    var Md;
    function p0() {
        return Md || (Md = 1, wd.exports = m0()), wd.exports;
    }
    var h0 = p0();
    const b0 = f0(h0);
    function g0(a) {
        const r = b0(a);
        return r.injectIntoDevTools(), r;
    }
    const pf = 0, Ao = {}, y0 = /^three(?=[A-Z])/, La = (a)=>`${a[0].toUpperCase()}${a.slice(1)}`;
    let x0 = 0;
    const v0 = (a)=>typeof a == "function";
    function hf(a) {
        if (v0(a)) {
            const r = `${x0++}`;
            return Ao[r] = a, r;
        } else Object.assign(Ao, a);
    }
    function bf(a, r) {
        const s = La(a), u = Ao[s];
        if (a !== "primitive" && !u) throw new Error(`R3F: ${s} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`);
        if (a === "primitive" && !r.object) throw new Error("R3F: Primitives without 'object' are invalid!");
        if (r.args !== void 0 && !Array.isArray(r.args)) throw new Error("R3F: The args prop must be an array!");
    }
    function S0(a, r, s) {
        var u;
        return a = La(a) in Ao ? a : a.replace(y0, ""), bf(a, r), a === "primitive" && (u = r.object) != null && u.__r3f && delete r.object.__r3f, Da(r.object, s, a, r);
    }
    function C0(a) {
        if (!a.isHidden) {
            var r;
            a.props.attach && (r = a.parent) != null && r.object ? Ra(a.parent, a) : wt(a.object) && (a.object.visible = !1), a.isHidden = !0, No(a);
        }
    }
    function gf(a) {
        if (a.isHidden) {
            var r;
            a.props.attach && (r = a.parent) != null && r.object ? Aa(a.parent, a) : wt(a.object) && a.props.visible !== !1 && (a.object.visible = !0), a.isHidden = !1, No(a);
        }
    }
    function bs(a, r, s) {
        const u = r.root.getState();
        if (!(!a.parent && a.object !== u.scene)) {
            if (!r.object) {
                var d, m;
                const h = Ao[La(r.type)];
                r.object = (d = r.props.object) != null ? d : new h(...(m = r.props.args) != null ? m : []), r.object.__r3f = r;
            }
            if (_n(r.object, r.props), r.props.attach) Aa(a, r);
            else if (wt(r.object) && wt(a.object)) {
                const h = a.object.children.indexOf(s?.object);
                if (s && h !== -1) {
                    const v = a.object.children.indexOf(r.object);
                    if (v !== -1) {
                        a.object.children.splice(v, 1);
                        const b = v < h ? h - 1 : h;
                        a.object.children.splice(b, 0, r.object);
                    } else r.object.parent = a.object, a.object.children.splice(h, 0, r.object), r.object.dispatchEvent({
                        type: "added"
                    }), a.object.dispatchEvent({
                        type: "childadded",
                        child: r.object
                    });
                } else a.object.add(r.object);
            }
            for (const h of r.children)bs(r, h);
            No(r);
        }
    }
    function wi(a, r) {
        r && (r.parent = a, a.children.push(r), bs(a, r));
    }
    function Fd(a, r, s) {
        if (!r || !s) return;
        r.parent = a;
        const u = a.children.indexOf(s);
        u !== -1 ? a.children.splice(u, 0, r) : a.children.push(r), bs(a, r, s);
    }
    function yf(a) {
        if (typeof a.dispose == "function") {
            const r = ()=>{
                try {
                    a.dispose();
                } catch  {}
            };
            typeof IS_REACT_ACT_ENVIRONMENT < "u" ? r() : Qi.unstable_scheduleCallback(Qi.unstable_IdlePriority, r);
        }
    }
    function qi(a, r, s) {
        if (!r) return;
        r.parent = null;
        const u = a.children.indexOf(r);
        u !== -1 && a.children.splice(u, 1), r.props.attach ? Ra(a, r) : wt(r.object) && wt(a.object) && (a.object.remove(r.object), r0(sf(r), r.object));
        const d = r.props.dispose !== null && s !== !1;
        for(let m = r.children.length - 1; m >= 0; m--){
            const h = r.children[m];
            qi(r, h, d);
        }
        r.children.length = 0, delete r.object.__r3f, d && r.type !== "primitive" && r.object.type !== "Scene" && yf(r.object), s === void 0 && No(r);
    }
    function j0(a, r) {
        for (const s of [
            a,
            a.alternate
        ])if (s !== null) if (typeof s.ref == "function") {
            s.refCleanup == null || s.refCleanup();
            const u = s.ref(r);
            typeof u == "function" && (s.refCleanup = u);
        } else s.ref && (s.ref.current = r);
    }
    const Ea = [];
    function w0() {
        for (const [s] of Ea){
            const u = s.parent;
            if (u) {
                s.props.attach ? Ra(u, s) : wt(s.object) && wt(u.object) && u.object.remove(s.object);
                for (const d of s.children)d.props.attach ? Ra(s, d) : wt(d.object) && wt(s.object) && s.object.remove(d.object);
            }
            s.isHidden && gf(s), s.object.__r3f && delete s.object.__r3f, s.type !== "primitive" && yf(s.object);
        }
        for (const [s, u, d] of Ea){
            s.props = u;
            const m = s.parent;
            if (m) {
                var a, r;
                const h = Ao[La(s.type)];
                s.object = (a = s.props.object) != null ? a : new h(...(r = s.props.args) != null ? r : []), s.object.__r3f = s, j0(d, s.object), _n(s.object, s.props), s.props.attach ? Aa(m, s) : wt(s.object) && wt(m.object) && m.object.add(s.object);
                for (const v of s.children)v.props.attach ? Aa(s, v) : wt(v.object) && wt(s.object) && s.object.add(v.object);
                No(s);
            }
        }
        Ea.length = 0;
    }
    const ki = ()=>{}, Td = {};
    let Ca = pf;
    const k0 = 0, P0 = 4, Na = g0({
        isPrimaryRenderer: !1,
        warnsIfNotActing: !1,
        supportsMutation: !0,
        supportsPersistence: !1,
        supportsHydration: !1,
        createInstance: S0,
        removeChild: qi,
        appendChild: wi,
        appendInitialChild: wi,
        insertBefore: Fd,
        appendChildToContainer (a, r) {
            const s = a.getState().scene.__r3f;
            !r || !s || wi(s, r);
        },
        removeChildFromContainer (a, r) {
            const s = a.getState().scene.__r3f;
            !r || !s || qi(s, r);
        },
        insertInContainerBefore (a, r, s) {
            const u = a.getState().scene.__r3f;
            !r || !s || !u || Fd(u, r, s);
        },
        getRootHostContext: ()=>Td,
        getChildHostContext: ()=>Td,
        commitUpdate (a, r, s, u, d) {
            var m, h, v;
            bf(r, u);
            let b = !1;
            if ((a.type === "primitive" && s.object !== u.object || ((m = u.args) == null ? void 0 : m.length) !== ((h = s.args) == null ? void 0 : h.length) || (v = u.args) != null && v.some((g, p)=>{
                var M;
                return g !== ((M = s.args) == null ? void 0 : M[p]);
            })) && (b = !0), b) Ea.push([
                a,
                {
                    ...u
                },
                d
            ]);
            else {
                const g = t0(a, u);
                Object.keys(g).length && (Object.assign(a.props, g), _n(a.object, g));
            }
            (d.sibling === null || (d.flags & P0) === k0) && w0();
        },
        finalizeInitialChildren: ()=>!1,
        commitMount () {},
        getPublicInstance: (a)=>a?.object,
        prepareForCommit: ()=>null,
        preparePortalMount: (a)=>Da(a.getState().scene, a, "", {}),
        resetAfterCommit: ()=>{},
        shouldSetTextContent: ()=>!1,
        clearContainer: ()=>!1,
        hideInstance: C0,
        unhideInstance: gf,
        createTextInstance: ki,
        hideTextInstance: ki,
        unhideTextInstance: ki,
        scheduleTimeout: typeof setTimeout == "function" ? setTimeout : void 0,
        cancelTimeout: typeof clearTimeout == "function" ? clearTimeout : void 0,
        noTimeout: -1,
        getInstanceFromNode: ()=>null,
        beforeActiveInstanceBlur () {},
        afterActiveInstanceBlur () {},
        detachDeletedInstance () {},
        prepareScopeUpdate () {},
        getInstanceFromScope: ()=>null,
        shouldAttemptEagerTransition: ()=>!1,
        trackSchedulerEvent: ()=>{},
        resolveEventType: ()=>null,
        resolveEventTimeStamp: ()=>-1.1,
        requestPostPaintCallback () {},
        maySuspendCommit: ()=>!1,
        preloadInstance: ()=>!0,
        suspendInstance () {},
        waitForCommitToBeReady: ()=>null,
        NotPendingTransition: null,
        HostTransitionContext: y.createContext(null),
        setCurrentUpdatePriority (a) {
            Ca = a;
        },
        getCurrentUpdatePriority () {
            return Ca;
        },
        resolveUpdatePriority () {
            var a;
            if (Ca !== pf) return Ca;
            switch(typeof window < "u" && ((a = window.event) == null ? void 0 : a.type)){
                case "click":
                case "contextmenu":
                case "dblclick":
                case "pointercancel":
                case "pointerdown":
                case "pointerup":
                    return u0;
                case "pointermove":
                case "pointerout":
                case "pointerover":
                case "pointerenter":
                case "pointerleave":
                case "wheel":
                    return s0;
                default:
                    return c0;
            }
        },
        resetFormInstance () {},
        rendererPackageName: "@react-three/fiber",
        rendererVersion: d0.version,
        applyViewTransitionName (a, r, s) {},
        restoreViewTransitionName (a, r) {},
        cancelViewTransitionName (a, r, s) {},
        cancelRootViewTransitionName (a) {},
        restoreRootViewTransitionName (a) {},
        InstanceMeasurement: null,
        measureInstance: (a)=>null,
        wasInstanceInViewport: (a)=>!0,
        hasInstanceChanged: (a, r)=>!1,
        hasInstanceAffectedParent: (a, r)=>!1,
        suspendOnActiveViewTransition (a, r) {},
        startGestureTransition: ()=>null,
        startViewTransition: ()=>null,
        stopViewTransition (a) {},
        createViewTransitionInstance: (a)=>null,
        getCurrentGestureOffset (a) {
            throw new Error("startGestureTransition is not yet supported in react-three-fiber.");
        },
        cloneMutableInstance (a, r) {
            return a;
        },
        cloneMutableTextInstance (a) {
            return a;
        },
        cloneRootViewTransitionContainer (a) {
            throw new Error("Not implemented.");
        },
        removeRootViewTransitionClone (a, r) {
            throw new Error("Not implemented.");
        },
        createFragmentInstance: (a)=>null,
        updateFragmentInstanceFiber (a, r) {},
        commitNewChildToFragmentInstance (a, r) {},
        deleteChildFromFragmentInstance (a, r) {},
        measureClonedInstance: (a)=>null,
        maySuspendCommitOnUpdate: (a, r, s)=>!1,
        maySuspendCommitInSyncRender: (a, r)=>!1,
        startSuspendingCommit: ()=>null,
        getSuspendedCommitReason: (a, r)=>null
    }), to = new Map, zo = {
        objects: "shallow",
        strict: !1
    };
    function M0(a, r) {
        if (!r && typeof HTMLCanvasElement < "u" && a instanceof HTMLCanvasElement && a.parentElement) {
            const { width: s, height: u, top: d, left: m } = a.parentElement.getBoundingClientRect();
            return {
                width: s,
                height: u,
                top: d,
                left: m
            };
        } else if (!r && typeof OffscreenCanvas < "u" && a instanceof OffscreenCanvas) return {
            width: a.width,
            height: a.height,
            top: 0,
            left: 0
        };
        return {
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            ...r
        };
    }
    function F0(a) {
        const r = to.get(a), s = r?.fiber, u = r?.store;
        r && console.warn("R3F.createRoot should only be called once!");
        const d = typeof reportError == "function" ? reportError : console.error, m = u || l0(Yi, zd), h = s || Na.createContainer(m, i0, null, !1, null, "", d, d, d, null);
        r || to.set(a, {
            fiber: h,
            store: m
        });
        let v, b, C = !1, g = null;
        return {
            async configure (p = {}) {
                let M;
                g = new Promise((re)=>M = re);
                let { gl: S, size: T, scene: j, events: F, onCreated: w, shadows: x = !1, linear: D = !1, flat: k = !1, legacy: E = !1, orthographic: z = !1, frameloop: G = "always", dpr: _ = [
                    1,
                    2
                ], performance: O, raycaster: N, camera: V, onPointerMissed: K } = p, Q = m.getState(), Z = Q.gl;
                if (!Q.gl) {
                    const re = {
                        canvas: a,
                        powerPreference: "high-performance",
                        antialias: !0,
                        alpha: !0
                    }, ae = typeof S == "function" ? await S(re) : S;
                    jd(ae) ? Z = ae : Z = new th({
                        ...re,
                        ...S
                    }), Q.set({
                        gl: Z
                    });
                }
                let J = Q.raycaster;
                J || Q.set({
                    raycaster: J = new ss
                });
                const { params: A, ...oe } = N || {};
                if (Le.equ(oe, J, zo) || _n(J, {
                    ...oe
                }), Le.equ(A, J.params, zo) || _n(J, {
                    params: {
                        ...J.params,
                        ...A
                    }
                }), !Q.camera || Q.camera === b && !Le.equ(b, V, zo)) {
                    b = V;
                    const re = V?.isCamera, ae = re ? V : z ? new nh(0, 0, 0, 0, .1, 1e3) : new Xn(75, 0, .1, 1e3);
                    re || (ae.position.z = 5, V && (_n(ae, V), ae.manual || ("aspect" in V || "left" in V || "right" in V || "bottom" in V || "top" in V) && (ae.manual = !0, ae.updateProjectionMatrix())), !Q.camera && !(V != null && V.rotation) && ae.lookAt(0, 0, 0)), Q.set({
                        camera: ae
                    }), J.camera = ae;
                }
                if (!Q.scene) {
                    let re;
                    j != null && j.isScene ? (re = j, Da(re, m, "", {})) : (re = new Hd, Da(re, m, "", {}), j && _n(re, j)), Q.set({
                        scene: re
                    });
                }
                F && !Q.events.handlers && Q.set({
                    events: F(m)
                });
                const fe = M0(a, T);
                if (Le.equ(fe, Q.size, zo) || Q.setSize(fe.width, fe.height, fe.top, fe.left), _ && Q.viewport.dpr !== uf(_) && Q.setDpr(_), Q.frameloop !== G && Q.setFrameloop(G), Q.onPointerMissed || Q.set({
                    onPointerMissed: K
                }), O && !Le.equ(O, Q.performance, zo) && Q.set((re)=>({
                        performance: {
                            ...re.performance,
                            ...O
                        }
                    })), !Q.xr) {
                    var X;
                    const re = (ye, Me)=>{
                        const Ue = m.getState();
                        Ue.frameloop !== "never" && zd(ye, !0, Ue, Me);
                    }, ae = ()=>{
                        const ye = m.getState();
                        ye.gl.xr.enabled = ye.gl.xr.isPresenting, ye.gl.xr.setAnimationLoop(ye.gl.xr.isPresenting ? re : null), ye.gl.xr.isPresenting || Yi(ye);
                    }, Se = {
                        connect () {
                            const ye = m.getState().gl;
                            ye.xr.addEventListener("sessionstart", ae), ye.xr.addEventListener("sessionend", ae);
                        },
                        disconnect () {
                            const ye = m.getState().gl;
                            ye.xr.removeEventListener("sessionstart", ae), ye.xr.removeEventListener("sessionend", ae);
                        }
                    };
                    typeof ((X = Z.xr) == null ? void 0 : X.addEventListener) == "function" && Se.connect(), Q.set({
                        xr: Se
                    });
                }
                if (Z.shadowMap) {
                    const re = Z.shadowMap.enabled, ae = Z.shadowMap.type;
                    if (Z.shadowMap.enabled = !!x, Le.boo(x)) Z.shadowMap.type = ji;
                    else if (Le.str(x)) {
                        var ne;
                        const Se = {
                            basic: ah,
                            percentage: rh,
                            soft: ji,
                            variance: oh
                        };
                        Z.shadowMap.type = (ne = Se[x]) != null ? ne : ji;
                    } else Le.obj(x) && Object.assign(Z.shadowMap, x);
                    (re !== Z.shadowMap.enabled || ae !== Z.shadowMap.type) && (Z.shadowMap.needsUpdate = !0);
                }
                return lh.enabled = !E, C || (Z.outputColorSpace = D ? ih : Kd, Z.toneMapping = k ? Yd : sh), Q.legacy !== E && Q.set(()=>({
                        legacy: E
                    })), Q.linear !== D && Q.set(()=>({
                        linear: D
                    })), Q.flat !== k && Q.set(()=>({
                        flat: k
                    })), S && !Le.fun(S) && !jd(S) && !Le.equ(S, Z, zo) && _n(Z, S), v = w, C = !0, M(), this;
            },
            render (p) {
                return !C && !g && this.configure(), g.then(()=>{
                    Na.updateContainer(l.jsx(T0, {
                        store: m,
                        children: p,
                        onCreated: v,
                        rootElement: a
                    }), h, null, ()=>{});
                }), m;
            },
            unmount () {
                xf(a);
            }
        };
    }
    function T0({ store: a, children: r, onCreated: s, rootElement: u }) {
        return jr(()=>{
            const d = a.getState();
            d.set((m)=>({
                    internal: {
                        ...m.internal,
                        active: !0
                    }
                })), s && s(d), a.getState().events.connected || d.events.connect == null || d.events.connect(u);
        }, []), l.jsx(ps.Provider, {
            value: a,
            children: r
        });
    }
    function xf(a, r) {
        const s = to.get(a), u = s?.fiber;
        if (u) {
            const d = s?.store.getState();
            d && (d.internal.active = !1), Na.updateContainer(null, u, null, ()=>{
                d && setTimeout(()=>{
                    try {
                        var m, h, v, b;
                        d.events.disconnect == null || d.events.disconnect(), (m = d.gl) == null || (h = m.renderLists) == null || h.dispose == null || h.dispose(), (v = d.gl) == null || v.forceContextLoss == null || v.forceContextLoss(), (b = d.gl) != null && b.xr && d.xr.disconnect(), Zh(d.scene), to.delete(a);
                    } catch  {}
                }, 500);
            });
        }
    }
    function E0(a, r, s) {
        return l.jsx(z0, {
            children: a,
            container: r,
            state: s
        });
    }
    function z0({ state: a = {}, children: r, container: s }) {
        const { events: u, size: d, ...m } = a, h = hs(), [v] = y.useState(()=>new ss), [b] = y.useState(()=>new us), C = ms((p, M)=>{
            let S;
            if (M.camera && d) {
                const T = M.camera;
                S = p.viewport.getCurrentViewport(T, new Ae, d), T !== p.camera && ff(T, d);
            }
            return {
                ...p,
                ...M,
                scene: s,
                raycaster: v,
                pointer: b,
                mouse: b,
                previousRoot: h,
                events: {
                    ...p.events,
                    ...M.events,
                    ...u
                },
                size: {
                    ...p.size,
                    ...d
                },
                viewport: {
                    ...p.viewport,
                    ...S
                },
                setEvents: (T)=>M.set((j)=>({
                            ...j,
                            events: {
                                ...j.events,
                                ...T
                            }
                        }))
            };
        }), g = y.useMemo(()=>{
            const p = of((S, T)=>({
                    ...m,
                    set: S,
                    get: T
                })), M = (S)=>p.setState((T)=>C.current(S, T));
            return M(h.getState()), h.subscribe(M), p;
        }, [
            h,
            s
        ]);
        return l.jsx(l.Fragment, {
            children: Na.createPortal(l.jsx(ps.Provider, {
                value: g,
                children: r
            }), g, null)
        });
    }
    const I0 = new Set, _0 = new Set, D0 = new Set;
    function Pi(a, r) {
        if (a.size) for (const { callback: s } of a.values())s(r);
    }
    function yr(a, r) {
        switch(a){
            case "before":
                return Pi(I0, r);
            case "after":
                return Pi(_0, r);
            case "tail":
                return Pi(D0, r);
        }
    }
    let Mi, Fi;
    function Hi(a, r, s) {
        let u = r.clock.getDelta();
        r.frameloop === "never" && typeof a == "number" && (u = a - r.clock.elapsedTime, r.clock.oldTime = r.clock.elapsedTime, r.clock.elapsedTime = a), Mi = r.internal.subscribers;
        for(let d = 0; d < Mi.length; d++)Fi = Mi[d], Fi.ref.current(Fi.store.getState(), u, s);
        return !r.internal.priority && r.gl.render && r.gl.render(r.scene, r.camera), r.internal.frames = Math.max(0, r.internal.frames - 1), r.frameloop === "always" ? 1 : r.internal.frames;
    }
    let Ba = !1, Ki = !1, Ti, Ed, Io;
    function vf(a) {
        Ed = requestAnimationFrame(vf), Ba = !0, Ti = 0, yr("before", a), Ki = !0;
        for (const s of to.values()){
            var r;
            Io = s.store.getState(), Io.internal.active && (Io.frameloop === "always" || Io.internal.frames > 0) && !((r = Io.gl.xr) != null && r.isPresenting) && (Ti += Hi(a, Io));
        }
        if (Ki = !1, yr("after", a), Ti === 0) return yr("tail", a), Ba = !1, cancelAnimationFrame(Ed);
    }
    function Yi(a, r = 1) {
        var s;
        if (!a) return to.forEach((u)=>Yi(u.store.getState(), r));
        (s = a.gl.xr) != null && s.isPresenting || !a.internal.active || a.frameloop === "never" || (r > 1 ? a.internal.frames = Math.min(60, a.internal.frames + r) : Ki ? a.internal.frames = 2 : a.internal.frames = 1, Ba || (Ba = !0, requestAnimationFrame(vf)));
    }
    function zd(a, r = !0, s, u) {
        if (r && yr("before", a), s) Hi(a, s, u);
        else for (const d of to.values())Hi(a, d.store.getState());
        r && yr("after", a);
    }
    const Ei = {
        onClick: [
            "click",
            !1
        ],
        onContextMenu: [
            "contextmenu",
            !1
        ],
        onDoubleClick: [
            "dblclick",
            !1
        ],
        onWheel: [
            "wheel",
            !0
        ],
        onPointerDown: [
            "pointerdown",
            !0
        ],
        onPointerUp: [
            "pointerup",
            !0
        ],
        onPointerLeave: [
            "pointerleave",
            !0
        ],
        onPointerMove: [
            "pointermove",
            !0
        ],
        onPointerCancel: [
            "pointercancel",
            !0
        ],
        onLostPointerCapture: [
            "lostpointercapture",
            !0
        ]
    };
    function A0(a) {
        const { handlePointer: r } = a0(a);
        return {
            priority: 1,
            enabled: !0,
            compute (s, u, d) {
                u.pointer.set(s.offsetX / u.size.width * 2 - 1, -(s.offsetY / u.size.height) * 2 + 1), u.raycaster.setFromCamera(u.pointer, u.camera);
            },
            connected: void 0,
            handlers: Object.keys(Ei).reduce((s, u)=>({
                    ...s,
                    [u]: r(u)
                }), {}),
            update: ()=>{
                var s;
                const { events: u, internal: d } = a.getState();
                (s = d.lastEvent) != null && s.current && u.handlers && u.handlers.onPointerMove(d.lastEvent.current);
            },
            connect: (s)=>{
                const { set: u, events: d } = a.getState();
                if (d.disconnect == null || d.disconnect(), u((m)=>({
                        events: {
                            ...m.events,
                            connected: s
                        }
                    })), d.handlers) for(const m in d.handlers){
                    const h = d.handlers[m], [v, b] = Ei[m];
                    s.addEventListener(v, h, {
                        passive: b
                    });
                }
            },
            disconnect: ()=>{
                const { set: s, events: u } = a.getState();
                if (u.connected) {
                    if (u.handlers) for(const d in u.handlers){
                        const m = u.handlers[d], [h] = Ei[d];
                        u.connected.removeEventListener(h, m);
                    }
                    s((d)=>({
                            events: {
                                ...d.events,
                                connected: void 0
                            }
                        }));
                }
            }
        };
    }
    function R0({ ref: a, children: r, fallback: s, resize: u, style: d, gl: m, events: h = A0, eventSource: v, eventPrefix: b, shadows: C, linear: g, flat: p, legacy: M, orthographic: S, frameloop: T, dpr: j, performance: F, raycaster: w, camera: x, scene: D, onPointerMissed: k, onCreated: E, ...z }) {
        y.useMemo(()=>hf(fh), []);
        const G = Kh(), [_, O] = dh({
            scroll: !0,
            debounce: {
                scroll: 50,
                resize: 0
            },
            ...u
        }), N = y.useRef(null), V = y.useRef(null);
        y.useImperativeHandle(a, ()=>N.current);
        const K = ms(k), [Q, Z] = y.useState(!1), [J, A] = y.useState(!1);
        if (Q) throw Q;
        if (J) throw J;
        const oe = y.useRef(null);
        jr(()=>{
            const X = N.current;
            if (O.width > 0 && O.height > 0 && X) {
                oe.current || (oe.current = F0(X));
                async function ne() {
                    await oe.current.configure({
                        gl: m,
                        scene: D,
                        events: h,
                        shadows: C,
                        linear: g,
                        flat: p,
                        legacy: M,
                        orthographic: S,
                        frameloop: T,
                        dpr: j,
                        performance: F,
                        raycaster: w,
                        camera: x,
                        size: O,
                        onPointerMissed: (...re)=>K.current == null ? void 0 : K.current(...re),
                        onCreated: (re)=>{
                            re.events.connect == null || re.events.connect(v ? qh(v) ? v.current : v : V.current), b && re.setEvents({
                                compute: (ae, Se)=>{
                                    const ye = ae[b + "X"], Me = ae[b + "Y"];
                                    Se.pointer.set(ye / Se.size.width * 2 - 1, -(Me / Se.size.height) * 2 + 1), Se.raycaster.setFromCamera(Se.pointer, Se.camera);
                                }
                            }), E?.(re);
                        }
                    }), oe.current.render(l.jsx(G, {
                        children: l.jsx(Xh, {
                            set: A,
                            children: l.jsx(y.Suspense, {
                                fallback: l.jsx(Yh, {
                                    set: Z
                                }),
                                children: r ?? null
                            })
                        })
                    }));
                }
                ne();
            }
        }), y.useEffect(()=>{
            const X = N.current;
            if (X) return ()=>xf(X);
        }, []);
        const fe = v ? "none" : "auto";
        return l.jsx("div", {
            ref: V,
            style: {
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                pointerEvents: fe,
                ...d
            },
            ...z,
            children: l.jsx("div", {
                ref: _,
                style: {
                    width: "100%",
                    height: "100%"
                },
                children: l.jsx("canvas", {
                    ref: N,
                    style: {
                        display: "block"
                    },
                    children: s
                })
            })
        });
    }
    function N0(a) {
        return l.jsx(af, {
            children: l.jsx(R0, {
                ...a
            })
        });
    }
    function B0(a, r, s) {
        const u = ze((S)=>S.size), d = ze((S)=>S.viewport), m = typeof a == "number" ? a : u.width * d.dpr, h = u.height * d.dpr, v = (typeof a == "number" ? s : a) || {}, { samples: b = 0, depth: C, ...g } = v, p = C ?? v.depthBuffer, M = y.useMemo(()=>{
            const S = new mh(m, h, {
                minFilter: pd,
                magFilter: pd,
                type: Zd,
                ...g
            });
            return p && (S.depthTexture = new ph(m, h, hh)), S.samples = b, S;
        }, []);
        return y.useLayoutEffect(()=>{
            M.setSize(m, h), b && (M.samples = b);
        }, [
            b,
            M,
            m,
            h
        ]), y.useEffect(()=>()=>M.dispose(), []), M;
    }
    const O0 = (a)=>typeof a == "function", L0 = y.forwardRef(({ envMap: a, resolution: r = 256, frames: s = 1 / 0, children: u, makeDefault: d, ...m }, h)=>{
        const v = ze(({ set: F })=>F), b = ze(({ camera: F })=>F), C = ze(({ size: F })=>F), g = y.useRef(null);
        y.useImperativeHandle(h, ()=>g.current, []);
        const p = y.useRef(null), M = B0(r);
        y.useLayoutEffect(()=>{
            m.manual || g.current.updateProjectionMatrix();
        }, [
            C,
            m
        ]), y.useLayoutEffect(()=>{
            g.current.updateProjectionMatrix();
        }), y.useLayoutEffect(()=>{
            if (d) {
                const F = b;
                return v(()=>({
                        camera: g.current
                    })), ()=>v(()=>({
                            camera: F
                        }));
            }
        }, [
            g,
            d,
            v
        ]);
        let S = 0, T = null;
        const j = O0(u);
        return mn((F)=>{
            j && (s === 1 / 0 || S < s) && (p.current.visible = !1, F.gl.setRenderTarget(M), T = F.scene.background, a && (F.scene.background = a), F.gl.render(F.scene, g.current), F.scene.background = T, F.gl.setRenderTarget(null), p.current.visible = !0, S++);
        }), y.createElement(y.Fragment, null, y.createElement("orthographicCamera", Zt({
            left: C.width / -2,
            right: C.width / 2,
            top: C.height / 2,
            bottom: C.height / -2,
            ref: g
        }, m), !j && u), y.createElement("group", {
            ref: p
        }, j && u(M.texture)));
    }), U0 = y.forwardRef(({ makeDefault: a, camera: r, regress: s, domElement: u, enableDamping: d = !0, keyEvents: m = !1, onChange: h, onStart: v, onEnd: b, ...C }, g)=>{
        const p = ze((z)=>z.invalidate), M = ze((z)=>z.camera), S = ze((z)=>z.gl), T = ze((z)=>z.events), j = ze((z)=>z.setEvents), F = ze((z)=>z.set), w = ze((z)=>z.get), x = ze((z)=>z.performance), D = r || M, k = u || T.connected || S.domElement, E = y.useMemo(()=>new bh(D), [
            D
        ]);
        return mn(()=>{
            E.enabled && E.update();
        }, -1), y.useEffect(()=>(m && E.connect(m === !0 ? k : m), E.connect(k), ()=>void E.dispose()), [
            m,
            k,
            s,
            E,
            p
        ]), y.useEffect(()=>{
            const z = (O)=>{
                p(), s && x.regress(), h && h(O);
            }, G = (O)=>{
                v && v(O);
            }, _ = (O)=>{
                b && b(O);
            };
            return E.addEventListener("change", z), E.addEventListener("start", G), E.addEventListener("end", _), ()=>{
                E.removeEventListener("start", G), E.removeEventListener("end", _), E.removeEventListener("change", z);
            };
        }, [
            h,
            v,
            b,
            E,
            p,
            j
        ]), y.useEffect(()=>{
            if (a) {
                const z = w().controls;
                return F({
                    controls: E
                }), ()=>F({
                        controls: z
                    });
            }
        }, [
            a,
            E
        ]), y.createElement("primitive", Zt({
            ref: g,
            object: E,
            enableDamping: d
        }, C));
    });
    function $0({ defaultScene: a, defaultCamera: r, renderPriority: s = 1 }) {
        const { gl: u, scene: d, camera: m } = ze();
        let h;
        return mn(()=>{
            h = u.autoClear, s === 1 && (u.autoClear = !0, u.render(a, r)), u.autoClear = !1, u.clearDepth(), u.render(d, m), u.autoClear = h;
        }, s), y.createElement("group", {
            onPointerOver: ()=>null
        });
    }
    function G0({ children: a, renderPriority: r = 1 }) {
        const { scene: s, camera: u } = ze(), [d] = y.useState(()=>new Hd);
        return y.createElement(y.Fragment, null, E0(y.createElement(y.Fragment, null, a, y.createElement($0, {
            defaultScene: s,
            defaultCamera: u,
            renderPriority: r
        })), d, {
            events: {
                priority: r + 1
            }
        }));
    }
    const Sf = y.createContext({}), W0 = ()=>y.useContext(Sf), Q0 = 2 * Math.PI, zi = new Jd, Id = new ef, [_o, Ii] = [
        new Wi,
        new Wi
    ], _d = new Ae, Dd = new Ae, V0 = (a)=>"minPolarAngle" in a, Ad = (a)=>"getTarget" in a, q0 = ({ alignment: a = "bottom-right", margin: r = [
        80,
        80
    ], renderPriority: s = 1, onUpdate: u, onTarget: d, children: m })=>{
        const h = ze((z)=>z.size), v = ze((z)=>z.camera), b = ze((z)=>z.controls), C = ze((z)=>z.invalidate), g = y.useRef(null), p = y.useRef(null), M = y.useRef(!1), S = y.useRef(0), T = y.useRef(new Ae(0, 0, 0)), j = y.useRef(new Ae(0, 0, 0));
        y.useEffect(()=>{
            j.current.copy(v.up), zi.up.copy(v.up);
        }, [
            v
        ]);
        const F = y.useCallback((z)=>{
            M.current = !0, (b || d) && (T.current = d?.() || (Ad(b) ? b.getTarget(T.current) : b?.target)), S.current = v.position.distanceTo(_d), _o.copy(v.quaternion), Dd.copy(z).multiplyScalar(S.current).add(_d), zi.lookAt(Dd), Ii.copy(zi.quaternion), C();
        }, [
            b,
            v,
            d,
            C
        ]);
        mn((z, G)=>{
            if (p.current && g.current) {
                var _;
                if (M.current) if (_o.angleTo(Ii) < .01) M.current = !1, V0(b) && v.up.copy(j.current);
                else {
                    const O = G * Q0;
                    _o.rotateTowards(Ii, O), v.position.set(0, 0, 1).applyQuaternion(_o).multiplyScalar(S.current).add(T.current), v.up.set(0, 1, 0).applyQuaternion(_o).normalize(), v.quaternion.copy(_o), Ad(b) && b.setPosition(v.position.x, v.position.y, v.position.z), u ? u() : b && b.update(G), C();
                }
                Id.copy(v.matrix).invert(), (_ = g.current) == null || _.quaternion.setFromRotationMatrix(Id);
            }
        });
        const w = y.useMemo(()=>({
                tweenCamera: F
            }), [
            F
        ]), [x, D] = r, k = a.endsWith("-center") ? 0 : a.endsWith("-left") ? -h.width / 2 + x : h.width / 2 - x, E = a.startsWith("center-") ? 0 : a.startsWith("top-") ? h.height / 2 - D : -h.height / 2 + D;
        return y.createElement(G0, {
            renderPriority: s
        }, y.createElement(Sf.Provider, {
            value: w
        }, y.createElement(L0, {
            makeDefault: !0,
            ref: p,
            position: [
                0,
                0,
                200
            ]
        }), y.createElement("group", {
            ref: g,
            position: [
                k,
                E,
                0
            ]
        }, m)));
    };
    function _i({ scale: a = [
        .8,
        .05,
        .05
    ], color: r, rotation: s }) {
        return y.createElement("group", {
            rotation: s
        }, y.createElement("mesh", {
            position: [
                .4,
                0,
                0
            ]
        }, y.createElement("boxGeometry", {
            args: a
        }), y.createElement("meshBasicMaterial", {
            color: r,
            toneMapped: !1
        })));
    }
    function Do({ onClick: a, font: r, disabled: s, arcStyle: u, label: d, labelColor: m, axisHeadScale: h = 1, ...v }) {
        const b = ze((j)=>j.gl), C = y.useMemo(()=>{
            const j = document.createElement("canvas");
            j.width = 64, j.height = 64;
            const F = j.getContext("2d");
            return F.beginPath(), F.arc(32, 32, 16, 0, 2 * Math.PI), F.closePath(), F.fillStyle = u, F.fill(), d && (F.font = r, F.textAlign = "center", F.fillStyle = m, F.fillText(d, 32, 41)), new tf(j);
        }, [
            u,
            d,
            m,
            r
        ]), [g, p] = y.useState(!1), M = (d ? 1 : .75) * (g ? 1.2 : 1) * h, S = (j)=>{
            j.stopPropagation(), p(!0);
        }, T = (j)=>{
            j.stopPropagation(), p(!1);
        };
        return y.createElement("sprite", Zt({
            scale: M,
            onPointerOver: s ? void 0 : S,
            onPointerOut: s ? void 0 : a || T
        }, v), y.createElement("spriteMaterial", {
            map: C,
            "map-anisotropy": b.capabilities.getMaxAnisotropy() || 1,
            alphaTest: .3,
            opacity: d ? 1 : .75,
            toneMapped: !1
        }));
    }
    const H0 = ({ hideNegativeAxes: a, hideAxisHeads: r, disabled: s, font: u = "18px Inter var, Arial, sans-serif", axisColors: d = [
        "#ff2060",
        "#20df80",
        "#2080ff"
    ], axisHeadScale: m = 1, axisScale: h, labels: v = [
        "X",
        "Y",
        "Z"
    ], labelColor: b = "#000", onClick: C, ...g })=>{
        const [p, M, S] = d, { tweenCamera: T } = W0(), j = {
            font: u,
            disabled: s,
            labelColor: b,
            onClick: C,
            axisHeadScale: m,
            onPointerDown: s ? void 0 : (F)=>{
                T(F.object.position), F.stopPropagation();
            }
        };
        return y.createElement("group", Zt({
            scale: 40
        }, g), y.createElement(_i, {
            color: p,
            rotation: [
                0,
                0,
                0
            ],
            scale: h
        }), y.createElement(_i, {
            color: M,
            rotation: [
                0,
                0,
                Math.PI / 2
            ],
            scale: h
        }), y.createElement(_i, {
            color: S,
            rotation: [
                0,
                -Math.PI / 2,
                0
            ],
            scale: h
        }), !r && y.createElement(y.Fragment, null, y.createElement(Do, Zt({
            arcStyle: p,
            position: [
                1,
                0,
                0
            ],
            label: v[0]
        }, j)), y.createElement(Do, Zt({
            arcStyle: M,
            position: [
                0,
                1,
                0
            ],
            label: v[1]
        }, j)), y.createElement(Do, Zt({
            arcStyle: S,
            position: [
                0,
                0,
                1
            ],
            label: v[2]
        }, j)), !a && y.createElement(y.Fragment, null, y.createElement(Do, Zt({
            arcStyle: p,
            position: [
                -1,
                0,
                0
            ]
        }, j)), y.createElement(Do, Zt({
            arcStyle: M,
            position: [
                0,
                -1,
                0
            ]
        }, j)), y.createElement(Do, Zt({
            arcStyle: S,
            position: [
                0,
                0,
                -1
            ]
        }, j)))));
    }, gs = y.createContext(null), Rd = (a)=>(a.getAttributes() & 2) === 2, K0 = y.memo(y.forwardRef(({ children: a, camera: r, scene: s, resolutionScale: u, enabled: d = !0, renderPriority: m = 1, autoClear: h = !0, depthBuffer: v, enableNormalPass: b, stencilBuffer: C, multisampling: g = 8, frameBufferType: p = Zd }, M)=>{
        const { gl: S, scene: T, camera: j, size: F } = ze(), w = s || T, x = r || j, [D, k, E] = y.useMemo(()=>{
            const _ = new Ph(S, {
                depthBuffer: v,
                stencilBuffer: C,
                multisampling: g,
                frameBufferType: p
            });
            _.addPass(new Mh(w, x));
            let O = null, N = null;
            return b && (N = new Fh(w, x), N.enabled = !1, _.addPass(N), u !== void 0 && (O = new Th({
                normalBuffer: N.texture,
                resolutionScale: u
            }), O.enabled = !1, _.addPass(O))), [
                _,
                N,
                O
            ];
        }, [
            x,
            S,
            v,
            C,
            g,
            p,
            w,
            b,
            u
        ]);
        y.useEffect(()=>D?.setSize(F.width, F.height), [
            D,
            F
        ]), mn((_, O)=>{
            if (d) {
                const N = S.autoClear;
                S.autoClear = h, C && !h && S.clearStencil(), D.render(O), S.autoClear = N;
            }
        }, d ? m : 0);
        const z = y.useRef(null);
        y.useLayoutEffect(()=>{
            const _ = [], O = z.current.__r3f;
            if (O && D) {
                const N = O.children;
                for(let V = 0; V < N.length; V++){
                    const K = N[V].object;
                    if (K instanceof yd) {
                        const Q = [
                            K
                        ];
                        if (!Rd(K)) {
                            let J = null;
                            for(; (J = N[V + 1]?.object) instanceof yd && !Rd(J);)Q.push(J), V++;
                        }
                        const Z = new Eh(x, ...Q);
                        _.push(Z);
                    } else K instanceof Dh && _.push(K);
                }
                for (const V of _)D?.addPass(V);
                k && (k.enabled = !0), E && (E.enabled = !0);
            }
            return ()=>{
                for (const N of _)D?.removePass(N);
                k && (k.enabled = !1), E && (E.enabled = !1);
            };
        }, [
            D,
            a,
            x,
            k,
            E
        ]), y.useEffect(()=>{
            const _ = S.toneMapping;
            return S.toneMapping = Yd, ()=>{
                S.toneMapping = _;
            };
        }, [
            S
        ]);
        const G = y.useMemo(()=>({
                composer: D,
                normalPass: k,
                downSamplingPass: E,
                resolutionScale: u,
                camera: x,
                scene: w
            }), [
            D,
            k,
            E,
            u,
            x,
            w
        ]);
        return y.useImperativeHandle(M, ()=>D, [
            D
        ]), l.jsx(gs.Provider, {
            value: G,
            children: l.jsx("group", {
                ref: z,
                children: a
            })
        });
    }));
    let Y0 = 0;
    const Nd = new WeakMap, ys = (a, r)=>function({ blendFunction: s = r?.blendFunction, opacity: u = r?.opacity, ...d }) {
            let m = Nd.get(a);
            if (!m) {
                const b = `@react-three/postprocessing/${a.name}-${Y0++}`;
                hf({
                    [b]: a
                }), Nd.set(a, m = b);
            }
            const h = ze((b)=>b.camera), v = is.useMemo(()=>[
                    ...r?.args ?? [],
                    ...d.args ?? [
                        {
                            ...r,
                            ...d
                        }
                    ]
                ], [
                JSON.stringify(d)
            ]);
            return l.jsx(m, {
                camera: h,
                "blendMode-blendFunction": s,
                "blendMode-opacity-value": u,
                ...d,
                args: v
            });
        }, X0 = y.forwardRef(function({ blendFunction: a, worldFocusDistance: r, worldFocusRange: s, focusDistance: u, focusRange: d, focalLength: m, bokehScale: h, resolutionScale: v, resolutionX: b, resolutionY: C, width: g, height: p, target: M, depthTexture: S, ...T }, j) {
        const { camera: F } = y.useContext(gs), w = M != null, x = y.useMemo(()=>{
            const D = new Ih(F, {
                blendFunction: a,
                worldFocusDistance: r,
                worldFocusRange: s,
                focusDistance: u,
                focusRange: d,
                focalLength: m,
                bokehScale: h,
                resolutionScale: v,
                resolutionX: b,
                resolutionY: C,
                width: g,
                height: p
            });
            w && (D.target = new Ae), S && D.setDepthTexture(S.texture, S.packing);
            const k = D.maskPass;
            return k.maskFunction = _h.MULTIPLY_RGB_SET_ALPHA, D;
        }, [
            F,
            a,
            r,
            s,
            u,
            d,
            m,
            h,
            v,
            b,
            C,
            g,
            p,
            w,
            S
        ]);
        return y.useEffect(()=>()=>{
                x.dispose();
            }, [
            x
        ]), l.jsx("primitive", {
            ...T,
            ref: j,
            object: x,
            target: M
        });
    }), Z0 = ys(Ah, {
        blendFunction: 0
    }), J0 = y.forwardRef(function(a, r) {
        const { camera: s, normalPass: u, downSamplingPass: d, resolutionScale: m } = y.useContext(gs), h = y.useMemo(()=>u === null && d === null ? (console.error("Please enable the NormalPass in the EffectComposer in order to use SSAO."), {}) : new zh(s, u && !d ? u.texture : null, {
                blendFunction: 21,
                samples: 30,
                rings: 4,
                distanceThreshold: 1,
                distanceFalloff: 0,
                rangeThreshold: .5,
                rangeFalloff: .1,
                luminanceInfluence: .9,
                radius: 20,
                bias: .5,
                intensity: 1,
                color: void 0,
                normalDepthBuffer: d ? d.texture : null,
                resolutionScale: m ?? 1,
                depthAwareUpsampling: !0,
                ...a
            }), [
            s,
            d,
            u,
            m
        ]);
        return l.jsx("primitive", {
            ref: r,
            object: h,
            dispose: null
        });
    }), eb = ys(Rh), tb = ys(Nh), Bd = {
        file: null,
        loading: !1,
        loadProgress: 0,
        error: null,
        frame: 0,
        colorMode: "type",
        colorProperty: null,
        colormap: "viridis",
        propRange: [
            0,
            1
        ],
        showCell: !0,
        showAxes: !0,
        showBonds: !1,
        bondCutoff: 2.5,
        renderStyle: "standard",
        atomScale: 1,
        backgroundPreset: "deep",
        backgroundStyle: "linear",
        ssao: !0,
        ssaoIntensity: .5,
        bloom: !1,
        bloomIntensity: .3,
        dof: !1,
        dofFocus: 50,
        toneMapping: "aces",
        antialiasing: "fxaa",
        playing: !1,
        playbackSpeed: 1,
        loopMode: "loop",
        cameraPosition: [
            0,
            0,
            50
        ],
        cameraTarget: [
            0,
            0,
            0
        ],
        cameraFov: 50,
        cameraPreset: "free",
        showScaleBar: !0,
        colorblindMode: !1,
        activePanel: null,
        showStats: !1,
        showThermo: !0,
        selectedAtoms: [],
        hoveredAtom: null,
        hiddenAtomTypes: new Set,
        atomTypeScales: {},
        viewportMode: "standard",
        exportRequest: {
            type: null
        },
        flythrough: null,
        flythroughPreview: !1,
        flythroughTime: 0
    }, $ = gh()(yh((a, r)=>({
            ...Bd,
            setFile: (s)=>a({
                    file: s,
                    frame: 0,
                    playing: !1,
                    error: null,
                    loading: !1,
                    loadProgress: 1
                }),
            setLoading: (s, u)=>a({
                    loading: s,
                    loadProgress: u ?? (s ? 0 : 1)
                }),
            setError: (s)=>a({
                    error: s,
                    loading: !1
                }),
            setViewportMode: (s)=>a({
                    viewportMode: s
                }),
            setFrame: (s)=>{
                const u = r().file;
                if (!u) return;
                const d = u.trajectory.totalFrames - 1;
                a({
                    frame: Math.max(0, Math.min(s, d))
                });
            },
            nextFrame: ()=>{
                const { file: s, frame: u, loopMode: d } = r();
                if (!s) return;
                const m = s.trajectory.totalFrames - 1;
                u >= m ? d === "loop" ? a({
                    frame: 0
                }) : d === "once" && a({
                    playing: !1
                }) : a({
                    frame: u + 1
                });
            },
            prevFrame: ()=>{
                const { file: s, frame: u } = r();
                if (!s) return;
                const d = s.trajectory.totalFrames - 1;
                a({
                    frame: u <= 0 ? d : u - 1
                });
            },
            togglePlay: ()=>a((s)=>({
                        playing: !s.playing
                    })),
            setPlaybackSpeed: (s)=>a({
                    playbackSpeed: s
                }),
            setColorMode: (s)=>a({
                    colorMode: s
                }),
            setColorProperty: (s)=>a({
                    colorProperty: s
                }),
            setColormap: (s)=>a({
                    colormap: s,
                    backgroundPreset: `palette:${s}`
                }),
            toggleSSAO: ()=>a((s)=>({
                        ssao: !s.ssao
                    })),
            toggleBloom: ()=>a((s)=>({
                        bloom: !s.bloom
                    })),
            toggleDOF: ()=>a((s)=>({
                        dof: !s.dof
                    })),
            setSSAOIntensity: (s)=>a({
                    ssaoIntensity: s
                }),
            setBloomIntensity: (s)=>a({
                    bloomIntensity: s
                }),
            setDOFFocus: (s)=>a({
                    dofFocus: s
                }),
            setToneMapping: (s)=>a({
                    toneMapping: s
                }),
            toggleCell: ()=>a((s)=>({
                        showCell: !s.showCell
                    })),
            toggleAxes: ()=>a((s)=>({
                        showAxes: !s.showAxes
                    })),
            toggleBonds: ()=>a((s)=>({
                        showBonds: !s.showBonds
                    })),
            setBondCutoff: (s)=>a({
                    bondCutoff: s
                }),
            setRenderStyle: (s)=>a({
                    renderStyle: s
                }),
            setAtomScale: (s)=>a({
                    atomScale: s
                }),
            setBackgroundPreset: (s)=>a({
                    backgroundPreset: s
                }),
            setBackgroundStyle: (s)=>a({
                    backgroundStyle: s
                }),
            setActivePanel: (s)=>a((u)=>({
                        activePanel: u.activePanel === s ? null : s
                    })),
            clearFile: ()=>a({
                    file: null,
                    frame: 0,
                    playing: !1,
                    loading: !1,
                    loadProgress: 0,
                    error: null,
                    activePanel: null,
                    exportRequest: {
                        type: null
                    }
                }),
            triggerExport: (s)=>a((u)=>({
                        exportRequest: {
                            ...s,
                            type: s.type ?? null
                        }
                    })),
            clearExportRequest: ()=>a({
                    exportRequest: {
                        type: null
                    }
                }),
            setFlythrough: (s)=>a({
                    flythrough: s
                }),
            setFlythroughPreview: (s)=>a({
                    flythroughPreview: s
                }),
            setFlythroughTime: (s)=>a({
                    flythroughTime: s
                }),
            addFlythroughKeyframe: (s)=>a((u)=>u.flythrough ? u.flythrough.keyframes.length >= 5 ? {} : {
                        flythrough: {
                            ...u.flythrough,
                            keyframes: [
                                ...u.flythrough.keyframes,
                                s
                            ]
                        }
                    } : {
                        flythrough: {
                            keyframes: [
                                s
                            ],
                            loop: !1
                        }
                    }),
            removeFlythroughKeyframe: (s)=>a((u)=>{
                    if (!u.flythrough) return {};
                    const d = u.flythrough.keyframes.filter((m, h)=>h !== s);
                    return d.length < 2 ? {
                        flythrough: null
                    } : {
                        flythrough: {
                            ...u.flythrough,
                            keyframes: d
                        }
                    };
                }),
            updateFlythroughKeyframe: (s, u)=>a((d)=>{
                    if (!d.flythrough) return {};
                    const m = d.flythrough.keyframes.map((h, v)=>v === s ? {
                            ...h,
                            ...u
                        } : h);
                    return {
                        flythrough: {
                            ...d.flythrough,
                            keyframes: m
                        }
                    };
                }),
            setFlythroughLoop: (s)=>a((u)=>u.flythrough ? {
                        flythrough: {
                            ...u.flythrough,
                            loop: s
                        }
                    } : {}),
            reset: ()=>a(Bd),
            setSelectedAtoms: (s)=>a((u)=>({
                        selectedAtoms: typeof s == "function" ? s(u.selectedAtoms) : s
                    })),
            setHoveredAtom: (s)=>a({
                    hoveredAtom: s
                }),
            toggleAtomType: (s)=>a((u)=>{
                    const d = new Set(u.hiddenAtomTypes);
                    return d.has(s) ? d.delete(s) : d.add(s), {
                        hiddenAtomTypes: d
                    };
                }),
            showAllAtomTypes: ()=>a({
                    hiddenAtomTypes: new Set
                }),
            soloAtomType: (s)=>a((u)=>{
                    const d = u.file;
                    if (!d) return {};
                    const m = d.trajectory.frames[u.frame];
                    if (!m) return {};
                    const h = new Set;
                    for(let b = 0; b < m.natoms; b++)h.add(m.types[b]);
                    const v = new Set;
                    return h.forEach((b)=>{
                        b !== s && v.add(b);
                    }), {
                        hiddenAtomTypes: v
                    };
                }),
            setAtomTypeScale: (s, u)=>a((d)=>({
                        atomTypeScales: {
                            ...d.atomTypeScales,
                            [s]: u
                        }
                    })),
            resetAtomTypeScales: ()=>a({
                    atomTypeScales: {}
                }),
            setCameraState: (s, u)=>a({
                    cameraPosition: s,
                    cameraTarget: u
                }),
            setCameraPreset: (s)=>{
                const u = r();
                if (!u.file) return;
                const { min: d, max: m } = u.file.trajectory.globalBounds, h = [
                    (d[0] + m[0]) / 2,
                    (d[1] + m[1]) / 2,
                    (d[2] + m[2]) / 2
                ], v = m[0] - d[0], b = m[1] - d[1], C = m[2] - d[2], p = Math.max(v, b, C) * 1.5;
                let M;
                switch(s){
                    case "front":
                        M = [
                            h[0],
                            h[1],
                            h[2] + p
                        ];
                        break;
                    case "side":
                        M = [
                            h[0] + p,
                            h[1],
                            h[2]
                        ];
                        break;
                    case "top":
                        M = [
                            h[0],
                            h[1] + p,
                            h[2]
                        ];
                        break;
                    case "iso":
                        M = [
                            h[0] + p * .7,
                            h[1] + p * .7,
                            h[2] + p * .7
                        ];
                        break;
                    default:
                        return;
                }
                a({
                    cameraPreset: s,
                    cameraPosition: M,
                    cameraTarget: h
                });
            },
            setShowScaleBar: (s)=>a({
                    showScaleBar: s
                }),
            setColorblindMode: (s)=>{
                a(s ? {
                    colorblindMode: s,
                    colormap: "viridis"
                } : {
                    colorblindMode: s
                });
            },
            encodeToURL: ()=>{
                const s = r(), u = {}, d = (b)=>Math.round(b * 100) / 100, m = (b)=>b.map(d), h = (b, C)=>b.length === C.length && b.every((g, p)=>Math.abs(g - C[p]) < .01);
                s.frame !== 0 && (u.f = s.frame), s.colorMode !== "type" && (u.cm = s.colorMode), s.colorProperty !== null && (u.cp = s.colorProperty), s.colormap !== "viridis" && (u.cmap = s.colormap), s.ssao || (u.ssao = 0), s.bloom && (u.bloom = 1), s.dof && (u.dof = 1), s.showCell || (u.cell = 0), s.showAxes || (u.axes = 0), d(s.atomScale) !== 1 && (u.as = d(s.atomScale)), s.backgroundPreset !== "deep" && (u.bg = s.backgroundPreset), s.backgroundStyle !== "linear" && (u.bgs = s.backgroundStyle), h(s.cameraPosition, [
                    0,
                    0,
                    50
                ]) || (u.cp3 = m(s.cameraPosition)), h(s.cameraTarget, [
                    0,
                    0,
                    0
                ]) || (u.ct = m(s.cameraTarget)), s.cameraFov !== 50 && (u.fov = s.cameraFov), d(s.playbackSpeed) !== 1 && (u.spd = d(s.playbackSpeed)), d(s.ssaoIntensity) !== .5 && (u.si = d(s.ssaoIntensity)), d(s.bloomIntensity) !== .3 && (u.bi = d(s.bloomIntensity)), s.dofFocus !== 50 && (u.df = s.dofFocus), s.toneMapping !== "aces" && (u.tm = s.toneMapping), s.showBonds && (u.bonds = 1), d(s.bondCutoff) !== 2.5 && (u.bc = d(s.bondCutoff)), s.renderStyle !== "standard" && (u.rs = s.renderStyle);
                const v = JSON.stringify(u);
                return btoa(v).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            },
            decodeFromURL: (s)=>{
                try {
                    let u = s.replace(/-/g, "+").replace(/_/g, "/");
                    for(; u.length % 4;)u += "=";
                    const d = JSON.parse(atob(u));
                    a({
                        frame: d.f ?? 0,
                        colorMode: d.cm ?? "type",
                        colorProperty: d.cp ?? null,
                        colormap: d.cmap ?? "viridis",
                        ssao: d.ssao !== 0,
                        bloom: d.bloom === 1,
                        dof: d.dof === 1,
                        showCell: d.cell !== 0,
                        showAxes: d.axes !== 0,
                        atomScale: d.as ?? 1,
                        backgroundPreset: d.bg ?? "deep",
                        backgroundStyle: d.bgs ?? "linear",
                        cameraPosition: d.cp3 ?? [
                            0,
                            0,
                            50
                        ],
                        cameraTarget: d.ct ?? [
                            0,
                            0,
                            0
                        ],
                        cameraFov: d.fov ?? 50,
                        playbackSpeed: d.spd ?? 1,
                        ssaoIntensity: d.si ?? .5,
                        bloomIntensity: d.bi ?? .3,
                        dofFocus: d.df ?? 50,
                        toneMapping: d.tm ?? "aces",
                        showBonds: d.bonds === 1,
                        bondCutoff: d.bc ?? 2.5,
                        renderStyle: d.rs ?? "standard"
                    });
                } catch  {
                    console.warn("Failed to decode URL state");
                }
            }
        })));
    let ja = null, nb = 0;
    const Xi = new Map;
    function ob() {
        return ja || (ja = new Worker(new URL("" + new URL("parse.worker-D6ORZDg7.js", import.meta.url).href, import.meta.url), {
            type: "module"
        }), ja.onmessage = (a)=>{
            const { type: r, id: s } = a.data;
            if (r === "progress") {
                window.dispatchEvent(new CustomEvent("atlas:parse-progress", {
                    detail: {
                        total: a.data.total,
                        parsed: a.data.parsed
                    }
                }));
                return;
            }
            const u = Xi.get(s);
            u && (r === "error" ? u.reject(new Error(a.data.message)) : u.resolve(a.data), Xi.delete(s));
        }), ja;
    }
    function Ua(a, r) {
        return new Promise((s, u)=>{
            const d = ++nb;
            Xi.set(d, {
                resolve: s,
                reject: u
            }), ob().postMessage({
                type: a,
                payload: r,
                id: d
            });
        });
    }
    async function $a(a) {
        if (a.name.endsWith(".gz")) {
            const s = await a.arrayBuffer(), u = new DecompressionStream("gzip"), d = new Blob([
                s
            ]).stream().pipeThrough(u).getReader(), m = [];
            for(;;){
                const { done: h, value: v } = await d.read();
                if (h) break;
                m.push(v);
            }
            return new TextDecoder().decode(new Uint8Array(m.reduce((h, v)=>h + v.length, 0)).map((h, v)=>{
                let b = 0;
                for (const C of m){
                    if (v < b + C.length) return C[v - b];
                    b += C.length;
                }
                return 0;
            }));
        }
        const r = await a.text();
        if (r.trim().toLowerCase().startsWith("<html") || r.trim().toLowerCase().startsWith("<!doctype html>")) throw new Error("Received HTML instead of molecular data (file not found on server).");
        return r;
    }
    async function Cf(a) {
        const r = await $a(a), s = await Ua("parse-dump", r);
        if (!s.frames || s.frames.length === 0) throw new Error("No frames parsed; possibly wrong format.");
        const u = s.frames.map((S)=>({
                timestep: S.timestep,
                natoms: S.natoms,
                boxBounds: new Float64Array(S.boxBounds),
                boxTilt: new Float64Array(S.boxTilt),
                triclinic: S.triclinic,
                columns: S.columns,
                ids: new Int32Array(S.ids),
                types: new Int32Array(S.types),
                positions: new Float32Array(S.positions),
                bonds: new Int32Array(S.bonds),
                properties: new Map(S.properties.map((T)=>[
                        T.name,
                        new Float32Array(T.data)
                    ]))
            }));
        let d = 1 / 0, m = 1 / 0, h = 1 / 0, v = -1 / 0, b = -1 / 0, C = -1 / 0;
        const g = new Set, p = u[0], M = new Map;
        if (p) for(let S = 0; S < p.natoms; S++)M.set(p.ids[S], S);
        for (const S of u){
            const T = new Float32Array(S.natoms);
            for(let j = 0; j < S.natoms; j++){
                const F = S.positions[j * 3], w = S.positions[j * 3 + 1], x = S.positions[j * 3 + 2];
                F < d && (d = F), F > v && (v = F), w < m && (m = w), w > b && (b = w), x < h && (h = x), x > C && (C = x), g.add(S.types[j]);
                const D = M.get(S.ids[j]);
                if (D !== void 0 && p) {
                    const k = F - p.positions[D * 3], E = w - p.positions[D * 3 + 1], z = x - p.positions[D * 3 + 2];
                    T[j] = Math.sqrt(k * k + E * E + z * z);
                } else T[j] = 0;
            }
            S.properties || (S.properties = new Map), S.properties.set("Displacement", T);
        }
        return {
            frames: u,
            totalFrames: u.length,
            atomTypes: Array.from(g).sort(),
            globalBounds: {
                min: [
                    d,
                    m,
                    h
                ],
                max: [
                    v,
                    b,
                    C
                ]
            }
        };
    }
    async function Zi(a) {
        const r = await $a(a), s = await Ua("parse-log", r);
        if (!s.runs || s.runs.length === 0) throw new Error("No thermo runs parsed; possibly wrong format.");
        return {
            numRuns: s.runs.length,
            runs: s.runs.map((u)=>({
                    columns: u.columns,
                    nrows: u.nrows,
                    getColumn: (d)=>u.data[d] ? new Float64Array(u.data[d]) : null
                }))
        };
    }
    function Oa(a) {
        const r = a.toLowerCase();
        return r.endsWith(".lammpstrj") || r.includes("dump.") || r.endsWith(".dump") || r.endsWith(".lammpstrj.gz") ? "dump" : r.startsWith("log.") || r.endsWith(".log") ? "log" : r.startsWith("data.") || r.endsWith(".data") || r.endsWith(".lmp") ? "data" : r.endsWith(".xyz") ? "xyz" : "unknown";
    }
    async function Ji(a) {
        const r = await $a(a), s = await Ua("parse-xyz", r);
        if (!s.frames || s.frames.length === 0) throw new Error("No frames parsed; possibly wrong format.");
        const u = s.frames.map((S)=>({
                timestep: S.timestep,
                natoms: S.natoms,
                boxBounds: new Float64Array(S.boxBounds),
                boxTilt: new Float64Array(S.boxTilt),
                triclinic: S.triclinic,
                columns: S.columns,
                ids: new Int32Array(S.ids),
                types: new Int32Array(S.types),
                positions: new Float32Array(S.positions),
                bonds: new Int32Array(S.bonds),
                properties: new Map(S.properties.map((T)=>[
                        T.name,
                        new Float32Array(T.data)
                    ]))
            }));
        let d = 1 / 0, m = 1 / 0, h = 1 / 0, v = -1 / 0, b = -1 / 0, C = -1 / 0;
        const g = new Set, p = u[0], M = new Map;
        if (p) for(let S = 0; S < p.natoms; S++)M.set(p.ids[S], S);
        for (const S of u){
            const T = new Float32Array(S.natoms);
            for(let j = 0; j < S.natoms; j++){
                const F = S.positions[j * 3], w = S.positions[j * 3 + 1], x = S.positions[j * 3 + 2];
                F < d && (d = F), F > v && (v = F), w < m && (m = w), w > b && (b = w), x < h && (h = x), x > C && (C = x), g.add(S.types[j]);
                const D = M.get(S.ids[j]);
                if (D !== void 0 && p) {
                    const k = F - p.positions[D * 3], E = w - p.positions[D * 3 + 1], z = x - p.positions[D * 3 + 2];
                    T[j] = Math.sqrt(k * k + E * E + z * z);
                } else T[j] = 0;
            }
            S.properties || (S.properties = new Map), S.properties.set("Displacement", T);
        }
        return {
            frames: u,
            totalFrames: u.length,
            atomTypes: Array.from(g).sort(),
            globalBounds: {
                min: [
                    d,
                    m,
                    h
                ],
                max: [
                    v,
                    b,
                    C
                ]
            }
        };
    }
    async function jf(a) {
        const r = await $a(a), s = await Ua("parse-data", r);
        if (!s.frames || s.frames.length === 0) throw new Error("No frames parsed; possibly wrong format.");
        const u = s.frames.map((p)=>({
                timestep: p.timestep,
                natoms: p.natoms,
                boxBounds: new Float64Array(p.boxBounds),
                boxTilt: new Float64Array(p.boxTilt),
                triclinic: p.triclinic,
                columns: p.columns,
                ids: new Int32Array(p.ids),
                types: new Int32Array(p.types),
                positions: new Float32Array(p.positions),
                bonds: new Int32Array(p.bonds),
                properties: new Map(p.properties.map((M)=>[
                        M.name,
                        new Float32Array(M.data)
                    ]))
            }));
        let d = 1 / 0, m = 1 / 0, h = 1 / 0, v = -1 / 0, b = -1 / 0, C = -1 / 0;
        const g = new Set;
        for (const p of u)for(let M = 0; M < p.natoms; M++){
            const S = p.positions[M * 3], T = p.positions[M * 3 + 1], j = p.positions[M * 3 + 2];
            S < d && (d = S), S > v && (v = S), T < m && (m = T), T > b && (b = T), j < h && (h = j), j > C && (C = j), g.add(p.types[M]);
        }
        return {
            frames: u,
            totalFrames: u.length,
            atomTypes: Array.from(g).sort(),
            globalBounds: {
                min: [
                    d,
                    m,
                    h
                ],
                max: [
                    v,
                    b,
                    C
                ]
            }
        };
    }
    async function wf(a) {
        const r = Oa(a.name);
        if (r === "xyz") return {
            trajectory: await Ji(a)
        };
        if (r === "dump" || r === "unknown") try {
            return {
                trajectory: await Cf(a)
            };
        } catch  {
            try {
                return {
                    thermo: await Zi(a)
                };
            } catch  {
                return {
                    trajectory: await Ji(a)
                };
            }
        }
        if (r === "log") return {
            thermo: await Zi(a)
        };
        if (r === "data") return {
            trajectory: await jf(a)
        };
        throw new Error(`Unsupported file type: ${a.name}`);
    }
    const es = Object.freeze(Object.defineProperty({
        __proto__: null,
        detectFileType: Oa,
        parseDataFile: jf,
        parseDumpFile: Cf,
        parseFile: wf,
        parseLogFile: Zi,
        parseXyzFile: Ji
    }, Symbol.toStringTag, {
        value: "Module"
    })), rb = JSON.parse('[{"id":"lupine_brand_asset","title":"Lupine Brand Asset (Procedural Hill)","subtitle":"Procedurally generated rolling hill of Texas state flowers with dynamic GPU wind sway.","domain":"Nanomaterials","atoms":"150,000+","frames":"1","file":"procedural","available":true,"colors":["#3050f8","#1ff01f","#ffffff"],"metadata":{"method":"Procedural Math Sculpture","potential":"Brand Identity Architecture","temperature":"0 K","reference":"Lupine Materials Science — lupine.science"},"featured":true},{"id":"lupine_bluebonnet","title":"Lupine Bluebonnet (Scientific)","subtitle":"Lupinus texensis scientific molecular model (.xyz dataset) showing strict atomic arrangement.","domain":"Nanomaterials","atoms":"930","frames":"1","file":"gallery/curated/lupine_bluebonnet.xyz","available":true,"colors":["#3050f8","#1ff01f","#ffffff"],"metadata":{"method":"Ab Initio Assembly","potential":"Lennard-Jones","temperature":"0 K","reference":"Lupine Materials Science — lupine.science"},"featured":true},{"id":"oscillation_timeseries","title":"Time-Series Oscillation","subtitle":"Test dataset for 60fps property interpolation","domain":"Advanced Theory & Validation","atoms":"1,000","frames":"30","file":"archive/oscillation_timeseries.lammpstrj","available":true,"colors":["#f542d4","#87247a","#c78aba"],"metadata":{"method":"Synthetic Oscillation","potential":"N/A","temperature":"Oscillating","ensemble":"N/A","reference":"Used to validate playback extrapolation logic."},"featured":true},{"id":"dang_cu_dislocation","title":"FCC Cu Dislocation-GB Tracking","subtitle":"Khanh Dang et al. (Sci Data 2025): Dislocation–grain-boundary interactions matrix","domain":"Advanced Theory & Validation","atoms":"Variable","frames":"100+","file":"archive/DisGB_data.lammpstrj","available":true,"colors":["#4287f5","#244a87","#8aa1c7"],"metadata":{"method":"Dislocation-GB dynamics MD","potential":"EAM (Mishin/Cu)","temperature":"Analytical Time-Series","ensemble":"NPT / Dynamic Strain","reference":"Perfect testbed for GNN Topology Error Mapping to characterize complex GB network transitions.","doi":"10.1038/s41597-025-05256-6"},"featured":true},{"id":"chen_ti_grip","title":"hcp Ti Grand-Canonical GB Optimization","subtitle":"Enze Chen et al. (Nat Commun 2024): Automated phase discovery using GRIP","domain":"Advanced Theory & Validation","atoms":"Variable","frames":"Multi-phase","file":"archive/GRIP_snapshot.lammpstrj","available":true,"colors":["#87f542","#40751f","#abd68b"],"metadata":{"method":"Grand-canonical evolutionary optimization","potential":"MEAM","temperature":"Variable","ensemble":"SGC","reference":"Requires Phonon Benchmarking (PDOS) to validate the dynamical stability of newly discovered hcp Ti GB phases.","doi":"10.1038/s41467-024-51330-9"},"featured":true},{"id":"devulapalli_segregation","title":"Topological GB Segregation Transitions","subtitle":"Vivek Devulapalli et al. (Science 2024): SGC MD/MC thermodynamic excess mapping","domain":"Advanced Theory & Validation","atoms":"Variable","frames":"Phase Transition","file":"archive/MDMC-SGC.lammpstrj","available":true,"colors":["#f54242","#802121","#c28080"],"metadata":{"method":"Semi-grand canonical MD/MC workflow","potential":"Multi-component EAM","temperature":"Variable","ensemble":"SGC / MDMC","reference":"Candidate for Multi-Fidelity UQ (glimMER) to correct biases in the calculated segregation thermodynamic excess properties.","doi":"10.1126/science.adq4147"},"featured":true},{"id":"curtin_hea_dislocation","title":"Cantor Alloy Dislocation Glide","subtitle":"W. Curtin et al. (Nature 2023): Edge dislocation mobility in CoCrFeMnNi High-Entropy Alloy using MLIP.","domain":"Metals & Alloys","atoms":"2,500,000","frames":"250","file":"archive/curtin_hea_dislocation.lammpstrj","available":true,"colors":["#e6194b","#f58231","#ffe119"],"metadata":{"method":"Machine-Learning MD (MACE)","potential":"NequIP/MACE (High-Entropy)","temperature":"300 K","ensemble":"NPT / Shear","reference":"Deep learning potential reveals cross-slip mechanisms in Cantor alloy.","doi":"10.1038/s41586-022-05582-8"},"featured":true},{"id":"ceder_llzo_diffusion","title":"LLZO Solid Electrolyte Ion Dynamics","subtitle":"G. Ceder et al. (Nature Materials 2024): Correlated Li-ion diffusion pathways in garnet-type solid electrolytes.","domain":"Energy Materials","atoms":"12,000","frames":"500","file":"archive/llzo_diffusion.lammpstrj","available":true,"colors":["#3cb44b","#aaffc3","#008080"],"metadata":{"method":"Ab Initio Molecular Dynamics (AIMD)","potential":"DFT-trained NNP","temperature":"600 K","ensemble":"NVT","reference":"Analysis of concerted migration events in Li7La3Zr2O12.","doi":"10.1038/s41563-023-01700-1"},"featured":true},{"id":"coudert_mof_flexibility","title":"ZIF-8 Gate-Opening Transition","subtitle":"F.X. Coudert et al. (Science 2023): Mechanical flexibility and gas-induced phase transition in Metal-Organic Frameworks.","domain":"Polymers & Soft Matter","atoms":"8,500","frames":"120","file":"archive/zif8_gate_opening.lammpstrj","available":true,"colors":["#4363d8","#911eb4","#e6beff"],"metadata":{"method":"Classical MD with flexible force field","potential":"MOF-FF","temperature":"298 K","ensemble":"NPT","reference":"Adsorption-induced breathing and swing transitions in ZIF-8.","doi":"10.1126/science.ade1469"},"featured":true},{"id":"sand_w_cascade","title":"Tungsten Collision Cascade","subtitle":"A.E. Sand et al. (PRL 2022): Primary radiation damage and defect clustering in plasma-facing materials.","domain":"Defects & Mechanics","atoms":"4,000,000","frames":"100","file":"archive/w_cascade_150keV.lammpstrj","available":true,"colors":["#808080","#a9a9a9","#ffffff"],"metadata":{"method":"Radiation Damage MD","potential":"EAM-ZBL","temperature":"10 K","ensemble":"NVE","reference":"150 keV primary knock-on atom (PKA) cascade evolution over 20 ps.","doi":"10.1103/PhysRevLett.128.015501"},"featured":true},{"id":"elliott_gst_crystallization","title":"GST Phase-Change Crystallization","subtitle":"S.R. Elliott et al. (Nature Comms 2024): Ultrafast nucleation in Ge2Sb2Te5 memory materials.","domain":"Ceramics & Oxides","atoms":"32,000","frames":"300","file":"archive/gst_crystallization.lammpstrj","available":true,"colors":["#800000","#9a6324","#ffd8b1"],"metadata":{"method":"Melt-Quench & Anneal MD","potential":"Machine Learning (GAP)","temperature":"600 K","ensemble":"NVT","reference":"Tracking the amorphous-to-cubic phase transition via homonuclear bonds.","doi":"10.1038/s41467-024-11000-0"},"featured":true},{"id":"c60_buckyball","title":"Buckminsterfullerene","subtitle":"C60 Truncated Icosahedron: The iconic carbon allotrope discovered by Kroto, Smalley, and Curl.","domain":"Nanomaterials","atoms":"60","frames":"1","file":"gallery/curated/c60_buckyball.xyz","available":true,"colors":["#444444","#444444","#444444"],"metadata":{"method":"Theoretical Geometry","potential":"DFT Optimized","temperature":"0 K","reference":"Nobel Prize in Chemistry 1996."},"featured":true},{"id":"cnt_6_6","title":"Carbon Nanotube","subtitle":"(6,6) Armchair Single-Walled Carbon Nanotube.","domain":"Nanomaterials","atoms":"96","frames":"1","file":"gallery/curated/carbon_nanotube.xyz","available":true,"colors":["#333333","#333333","#333333"],"metadata":{"method":"Geometry Construction","potential":"ASE Builder","chirality":"(6,6) Armchair"},"featured":true},{"id":"graphene_ribbon","title":"Graphene Nanoribbon","subtitle":"Armchair Graphene Nanoribbon with Hydrogen-passivated edges.","domain":"Nanomaterials","atoms":"86","frames":"1","file":"gallery/curated/graphene_ribbon.xyz","available":true,"colors":["#222222","#cccccc","#222222"],"metadata":{"method":"Geometry Construction","potential":"ASE Builder"},"featured":true},{"id":"au_nanocluster","title":"Gold Nanocluster","subtitle":"Au FCC 3x3x3 Bulk Supercell representing a tiny nanocluster fragment.","domain":"Metals & Alloys","atoms":"108","frames":"1","file":"gallery/curated/gold_nanocluster.xyz","available":true,"colors":["#ffd700","#ffd700","#ffd700"],"metadata":{"method":"Crystallography","potential":"FCC Lattice"},"featured":true},{"id":"water_cluster_64","title":"Ice/Water Cluster","subtitle":"A generated cluster of 64 water molecules.","domain":"Fluids & Solvents","atoms":"192","frames":"1","file":"gallery/curated/water_cluster.xyz","available":true,"colors":["#0000ff","#ffaaaa","#0000ff"],"metadata":{"method":"Geometry Construction","potential":"ASE Builder"},"featured":true},{"id":"cuzr_melt","title":"Cu₆₄Zr₃₆ Metallic Glass","subtitle":"Melt-quench simulation showing glass transition and short-range order","domain":"Metals & Alloys","atoms":"5,000","frames":"100","file":"dump.CuZr_melt.lammpstrj","available":true,"colors":["#4da6ff","#40ff80","#4d4dff"],"metadata":{"method":"Molecular Dynamics","potential":"EAM (Mendelev et al.)","temperature":"300-2000 K","ensemble":"NPT","reference":"Standard melt-quench protocol"},"featured":true},{"id":"al_polycrystal","title":"Al Polycrystal (Voronoi)","subtitle":"Grain boundary structure in FCC aluminum with Σ5 misorientation","domain":"Metals & Alloys","atoms":"32,000","frames":"50","file":"gallery/al_polycrystal_32k.lammpstrj","available":true,"colors":["#c0c0c0","#a0a0a0","#ff6b6b"],"metadata":{"method":"MD with grain boundary analysis","potential":"EAM (Mishin et al.)","temperature":"300 K","ensemble":"NVT","reference":"Cubic polycrystal with 8 grains"},"featured":true},{"id":"ni_superalloy","title":"Ni-Based Superalloy","subtitle":"γ/γ′ microstructure with cuboidal precipitates","domain":"Metals & Alloys","atoms":"108,000","frames":"1","file":"gallery/ni_superalloy_gamma_prime_8k.lammpstrj","available":true,"colors":["#4a90d9","#f5a623","#d0021b"],"metadata":{"method":"Monte Carlo + MD hybrid","potential":"MEAM","temperature":"1273 K","reference":"CMSX-4 inspired composition"}},{"id":"ti_hcp","title":"Titanium HCP Deformation","subtitle":"Basal slip and twinning under uniaxial tension","domain":"Metals & Alloys","atoms":"24,000","frames":"200","file":"gallery/ti_hcp_tension_13k.lammpstrj","available":true,"colors":["#7ed321","#50e3c2","#b8e986"],"metadata":{"method":"Deformation MD","potential":"MEAM (Hennig et al.)","temperature":"300 K","ensemble":"NPT with strain rate","reference":"HCP Ti single crystal"},"featured":true},{"id":"crack2d","title":"Brittle Fracture (2D)","subtitle":"Dynamic crack propagation with elastic-plastic zone","domain":"Defects & Mechanics","atoms":"1,800","frames":"100","file":"dump.crack2d.lammpstrj","available":true,"colors":["#ff4060","#ff8040","#ffd040"],"metadata":{"method":"MD with velocity loading","potential":"LJ (brittle parameterization)","temperature":"0.01 K","reference":"Griffith-Irwin fracture mechanics"}},{"id":"dislocation_cu","title":"Cu Edge Dislocation","subtitle":"1/2⟨110⟩ dislocation on (111) plane with stacking fault","domain":"Defects & Mechanics","atoms":"28,800","frames":"1","file":"gallery/cu_dislocation_28k.lammpstrj","available":true,"colors":["#b87333","#cd853f","#d4af37"],"metadata":{"method":"Energy minimization + MD","potential":"EAM (Mishin)","reference":"FCC edge dislocation dipole"}},{"id":"nanoindentation","title":"Nanoindentation Al","subtitle":"Spherical indenter penetration with dislocation nucleation","domain":"Defects & Mechanics","atoms":"256,000","frames":"150","file":"gallery/al_nanoindent_256k.lammpstrj","available":true,"colors":["#c0c0c0","#808080","#ff6b6b"],"metadata":{"method":"Indenter MD","potential":"EAM","temperature":"300 K","reference":"Hertzian contact + dislocation plasticity"}},{"id":"void_growth","title":"Void Growth & Coalescence","subtitle":"Ductile failure under triaxial tension","domain":"Defects & Mechanics","atoms":"64,000","frames":"100","file":"gallery/cu_void_growth_64k.lammpstrj","available":true,"colors":["#ff6b6b","#ffa500","#ffff00"],"metadata":{"method":"Cavitation MD","potential":"EAM","temperature":"600 K","ensemble":"NPT with negative pressure"}},{"id":"multielement_nanoparticle","title":"High-Entropy Alloy Nanoparticle","subtitle":"Multi-element open dataset (Ni-Co-Cr-Fe-Mn) showing composition gradients","domain":"Nanomaterials","atoms":"85,000+","frames":"Multi-frame","file":"advanced_samples/dump.multielement_nanoparticle.lammpstrj","available":true,"colors":["#f5a623","#4a90d9","#d0021b"],"metadata":{"method":"MD Open Dataset","potential":"EAM (High-Entropy)","temperature":"300 K","reference":"Public Open Data Repository"},"featured":true},{"id":"cnt_bond_pull","title":"Carbon Nanotube Tensile Pull","subtitle":"Mechanics of a SWCNT structural failure under extreme load","domain":"Nanomaterials","atoms":"12,000","frames":"Multi-frame","file":"advanced_samples/dump.bondstrength_nanotube.lammpstrj","available":true,"colors":["#333333","#666666","#999999"],"metadata":{"method":"Tensile MD open dataset","potential":"REBO/AIREBO","temperature":"300 K","reference":"Public Open Data Repository"}},{"id":"cnt_bundle","title":"Carbon Nanotube Bundle","subtitle":"(10,10) SWCNT rope with hexagonal packing","domain":"Nanomaterials","atoms":"1,200","frames":"1","file":"cnt_bundle_12k.xyz","available":true,"colors":["#333333","#666666","#999999"],"metadata":{"method":"AIREBO potential MD","potential":"AIREBO (Stuart)","temperature":"300 K","reference":"7-tube bundle with vdW interactions"},"featured":true},{"id":"graphene_ribbon","title":"Graphene Nanoribbon","subtitle":"Armchair-edge GNR under uniaxial strain","domain":"Nanomaterials","atoms":"800","frames":"1","file":"graphene_ribbon_8k.xyz","available":true,"colors":["#2d2d2d","#4a4a4a","#7d7d7d"],"metadata":{"method":"Tensile MD","potential":"AIREBO","temperature":"300 K","reference":"Armchair GNR, width ~5nm"}},{"id":"au_nanoparticle","title":"Gold Nanoparticle Melt","subtitle":"Size-dependent melting of Au147 (Mackay icosahedron)","domain":"Nanomaterials","atoms":"147","frames":"200","file":"gallery/au147_melt.lammpstrj","available":true,"colors":["#ffd700","#ffb700","#ff8c00"],"metadata":{"method":"Caloric curve MD","potential":"EAM (Foiles)","temperature":"100-1500 K","reference":"Lindemann criterion melting"}},{"id":"mos2_sheet","title":"MoS₂ Monolayer","subtitle":"2D semiconductor with puckered structure","domain":"Nanomaterials","atoms":"24,000","frames":"50","file":"gallery/mos2_monolayer_24k.lammpstrj","available":true,"colors":["#4a90d9","#f5a623","#7ed321"],"metadata":{"method":"2D materials MD","potential":"SW-like (Liang)","temperature":"300 K","reference":"Hexagonal TMD monolayer"}},{"id":"sio2_glass","title":"SiO₂ Amorphous Silica","subtitle":"Vitreous silica with tetrahedral network structure","domain":"Ceramics & Oxides","atoms":"24,000","frames":"100","file":"gallery/sio2_glass_24k.lammpstrj","available":true,"colors":["#87ceeb","#b0e0e6","#ffd700"],"metadata":{"method":"Melt-quench with Vashishta potential","potential":"Vashishta (SiO₂)","temperature":"300-4000 K","reference":"Continuous random network"},"featured":true},{"id":"al2o3_sapphire","title":"α-Al₂O₃ (Sapphire)","subtitle":"Corundum structure with basal plane surface","domain":"Ceramics & Oxides","atoms":"18,000","frames":"1","file":"gallery/al2o3_sapphire_18k.lammpstrj","available":true,"colors":["#e6e6fa","#d8bfd8","#dda0dd"],"metadata":{"method":"Crystal structure","potential":"Buckingham + Coulomb","reference":"Rhombohedral corundum"}},{"id":"zro2_tetragonal","title":"ZrO₂ Tetragonal","subtitle":"Yttria-stabilized zirconia (YSZ) with oxygen vacancies","domain":"Ceramics & Oxides","atoms":"32,768","frames":"50","file":"gallery/zro2_ysz_32k.lammpstrj","available":true,"colors":["#f0e68c","#daa520","#b8860b"],"metadata":{"method":"Oxide MD","potential":"Buckingham","temperature":"1200 K","reference":"8% Y₂O₃ stabilized"}},{"id":"pe_chain","title":"Polyethylene Chain","subtitle":"Single C₁₀₀₀H₂₀₀₂ chain with united-atom model","domain":"Polymers & Soft Matter","atoms":"3,000","frames":"200","file":"gallery/pe_chain_3k.lammpstrj","available":true,"colors":["#ff69b4","#ff1493","#dc143c"],"metadata":{"method":"Polymer MD","potential":"TraPPE-UA","temperature":"450 K","ensemble":"NVT","reference":"Melt-state polyethylene"},"featured":true},{"id":"pe_crystal","title":"Polyethylene Crystal","subtitle":"Orthorhombic crystal with chain folding","domain":"Polymers & Soft Matter","atoms":"12,000","frames":"50","file":"gallery/pe_crystal_12k.lammpstrj","available":true,"colors":["#ffb6c1","#ffc0cb","#ff69b4"],"metadata":{"method":"Crystal MD","potential":"TraPPE-UA","temperature":"300 K","reference":"Orthorhombic PE unit cell"}},{"id":"li_metal","title":"Lithium Metal Anode","subtitle":"Dendrite nucleation at electrode-electrolyte interface","domain":"Energy Materials","atoms":"16,384","frames":"150","file":"gallery/li_dendrite_16k.lammpstrj","available":true,"colors":["#c0c0c0","#a9a9a9","#808080"],"metadata":{"method":"Electrodeposition MD","potential":"EAM (Daw)","temperature":"300 K","reference":"BCC Li with surface diffusion"}},{"id":"sulfur_cathode","title":"Li-S Cathode","subtitle":"Sulfur nanoparticle with Li₂S coating","domain":"Energy Materials","atoms":"8,000","frames":"100","file":"gallery/li_s_cathode_8k.lammpstrj","available":true,"colors":["#ffff00","#ffd700","#ffa500"],"metadata":{"method":"Reactive MD","potential":"ReaxFF","temperature":"400 K","reference":"Sulfur conversion cathode"}},{"id":"water_box","title":"TIP4P/2005 Water","subtitle":"Equilibrated water box with H-bond network","domain":"Biomolecules","atoms":"12,000","frames":"100","file":"gallery/water_tip4p_12k.lammpstrj","available":true,"colors":["#4169e1","#1e90ff","#87cefa"],"metadata":{"method":"Liquid MD","potential":"TIP4P/2005","temperature":"300 K","density":"0.997 g/cm³","reference":"Standard water model"}},{"id":"alanine_dipeptide","title":"Alanine Dipeptide","subtitle":"Ace-Ala-Nme with CHARMM potential","domain":"Biomolecules","atoms":"66","frames":"1000","file":"gallery/ala_dipeptide.lammpstrj","available":true,"colors":["#ff6347","#ff4500","#ffd700"],"metadata":{"method":"Biomolecular MD","potential":"CHARMM36","temperature":"300 K","ensemble":"NVT","reference":"Ramachandran sampling"},"featured":true},{"id":"pubchem_aspirin","title":"Aspirin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"21","frames":"1","file":"gallery/pubchem/aspirin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_caffeine","title":"Caffeine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/caffeine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_adenosine","title":"Adenosine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"32","frames":"1","file":"gallery/pubchem/adenosine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_serotonin","title":"Serotonin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"25","frames":"1","file":"gallery/pubchem/serotonin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_dopamine","title":"Dopamine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"22","frames":"1","file":"gallery/pubchem/dopamine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_penicillin_g","title":"Penicillin G","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"41","frames":"1","file":"gallery/pubchem/penicillin_g.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_glucose","title":"Glucose","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/glucose.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cholesterol","title":"Cholesterol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"74","frames":"1","file":"gallery/pubchem/cholesterol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_testosterone","title":"Testosterone","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"49","frames":"1","file":"gallery/pubchem/testosterone.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_estradiol","title":"Estradiol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"44","frames":"1","file":"gallery/pubchem/estradiol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_adrenaline","title":"Adrenaline","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/adrenaline.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_melatonin","title":"Melatonin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"33","frames":"1","file":"gallery/pubchem/melatonin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cortisol","title":"Cortisol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"56","frames":"1","file":"gallery/pubchem/cortisol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_nicotine","title":"Nicotine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/nicotine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_morphine","title":"Morphine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"40","frames":"1","file":"gallery/pubchem/morphine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cannabidiol","title":"Cannabidiol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"53","frames":"1","file":"gallery/pubchem/cannabidiol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_menthol","title":"Menthol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"31","frames":"1","file":"gallery/pubchem/menthol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_vanillin","title":"Vanillin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"19","frames":"1","file":"gallery/pubchem/vanillin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_eugenol","title":"Eugenol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/eugenol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_capsaicin","title":"Capsaicin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"49","frames":"1","file":"gallery/pubchem/capsaicin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cinnamaldehyde","title":"Cinnamaldehyde","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"18","frames":"1","file":"gallery/pubchem/cinnamaldehyde.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_limonene","title":"Limonene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/limonene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_linalool","title":"Linalool","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"29","frames":"1","file":"gallery/pubchem/linalool.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_pinene","title":"Pinene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/pinene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_citral","title":"Citral","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"27","frames":"1","file":"gallery/pubchem/citral.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_myrcene","title":"Myrcene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/myrcene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_geraniol","title":"Geraniol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"29","frames":"1","file":"gallery/pubchem/geraniol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_citronellol","title":"Citronellol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"31","frames":"1","file":"gallery/pubchem/citronellol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_camphor","title":"Camphor","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"27","frames":"1","file":"gallery/pubchem/camphor.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_thymol","title":"Thymol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"25","frames":"1","file":"gallery/pubchem/thymol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_carvacrol","title":"Carvacrol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"25","frames":"1","file":"gallery/pubchem/carvacrol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_eucalyptol","title":"Eucalyptol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"29","frames":"1","file":"gallery/pubchem/eucalyptol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_farnesene","title":"Farnesene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"39","frames":"1","file":"gallery/pubchem/farnesene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_nerolidol","title":"Nerolidol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"42","frames":"1","file":"gallery/pubchem/nerolidol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_bisabolol","title":"Bisabolol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"42","frames":"1","file":"gallery/pubchem/bisabolol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_humulene","title":"Humulene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"39","frames":"1","file":"gallery/pubchem/humulene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_caryophyllene","title":"Caryophyllene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"39","frames":"1","file":"gallery/pubchem/caryophyllene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_squalene","title":"Squalene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"80","frames":"1","file":"gallery/pubchem/squalene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_retinol","title":"Retinol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"51","frames":"1","file":"gallery/pubchem/retinol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_ergocalciferol","title":"Ergocalciferol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"73","frames":"1","file":"gallery/pubchem/ergocalciferol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_tocopherol","title":"Tocopherol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"78","frames":"1","file":"gallery/pubchem/tocopherol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_phylloquinone","title":"Phylloquinone","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"79","frames":"1","file":"gallery/pubchem/phylloquinone.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_thiamine","title":"Thiamine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"35","frames":"1","file":"gallery/pubchem/thiamine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_riboflavin","title":"Riboflavin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"47","frames":"1","file":"gallery/pubchem/riboflavin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_niacin","title":"Niacin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/niacin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_pantothenic_acid","title":"Pantothenic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"32","frames":"1","file":"gallery/pubchem/pantothenic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_pyridoxine","title":"Pyridoxine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"23","frames":"1","file":"gallery/pubchem/pyridoxine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_biotin","title":"Biotin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"32","frames":"1","file":"gallery/pubchem/biotin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_folic_acid","title":"Folic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"51","frames":"1","file":"gallery/pubchem/folic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_ascorbic_acid","title":"Ascorbic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/ascorbic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_citric_acid","title":"Citric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"21","frames":"1","file":"gallery/pubchem/citric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_malic_acid","title":"Malic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"15","frames":"1","file":"gallery/pubchem/malic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_fumaric_acid","title":"Fumaric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"12","frames":"1","file":"gallery/pubchem/fumaric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_succinic_acid","title":"Succinic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/succinic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_oxaloacetic_acid","title":"Oxaloacetic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"13","frames":"1","file":"gallery/pubchem/oxaloacetic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_pyruvic_acid","title":"Pyruvic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"10","frames":"1","file":"gallery/pubchem/pyruvic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_lactic_acid","title":"Lactic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"12","frames":"1","file":"gallery/pubchem/lactic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_acetic_acid","title":"Acetic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"8","frames":"1","file":"gallery/pubchem/acetic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_formic_acid","title":"Formic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"5","frames":"1","file":"gallery/pubchem/formic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_propionic_acid","title":"Propionic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"11","frames":"1","file":"gallery/pubchem/propionic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_butyric_acid","title":"Butyric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/butyric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_valeric_acid","title":"Valeric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"17","frames":"1","file":"gallery/pubchem/valeric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_caproic_acid","title":"Caproic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/caproic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_caprylic_acid","title":"Caprylic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/caprylic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_capric_acid","title":"Capric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"32","frames":"1","file":"gallery/pubchem/capric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_lauric_acid","title":"Lauric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"38","frames":"1","file":"gallery/pubchem/lauric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_myristic_acid","title":"Myristic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"44","frames":"1","file":"gallery/pubchem/myristic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_palmitic_acid","title":"Palmitic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"50","frames":"1","file":"gallery/pubchem/palmitic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_oleic_acid","title":"Oleic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"54","frames":"1","file":"gallery/pubchem/oleic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_linoleic_acid","title":"Linoleic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"52","frames":"1","file":"gallery/pubchem/linoleic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_linolenic_acid","title":"Linolenic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"50","frames":"1","file":"gallery/pubchem/linolenic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_arachidonic_acid","title":"Arachidonic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"54","frames":"1","file":"gallery/pubchem/arachidonic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_eicosapentaenoic_acid","title":"Eicosapentaenoic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"52","frames":"1","file":"gallery/pubchem/eicosapentaenoic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_docosahexaenoic_acid","title":"Docosahexaenoic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"56","frames":"1","file":"gallery/pubchem/docosahexaenoic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_glycine","title":"Glycine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"10","frames":"1","file":"gallery/pubchem/glycine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_alanine","title":"Alanine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"13","frames":"1","file":"gallery/pubchem/alanine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_valine","title":"Valine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"19","frames":"1","file":"gallery/pubchem/valine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_leucine","title":"Leucine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"22","frames":"1","file":"gallery/pubchem/leucine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_isoleucine","title":"Isoleucine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"22","frames":"1","file":"gallery/pubchem/isoleucine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_proline","title":"Proline","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"17","frames":"1","file":"gallery/pubchem/proline.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_phenylalanine","title":"Phenylalanine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"23","frames":"1","file":"gallery/pubchem/phenylalanine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_tyrosine","title":"Tyrosine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/tyrosine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_tryptophan","title":"Tryptophan","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"27","frames":"1","file":"gallery/pubchem/tryptophan.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_serine","title":"Serine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/serine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_threonine","title":"Threonine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"17","frames":"1","file":"gallery/pubchem/threonine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cysteine","title":"Cysteine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/cysteine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_methionine","title":"Methionine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/methionine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_asparagine","title":"Asparagine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"17","frames":"1","file":"gallery/pubchem/asparagine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_glutamine","title":"Glutamine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/glutamine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_aspartic_acid","title":"Aspartic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"16","frames":"1","file":"gallery/pubchem/aspartic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_glutamic_acid","title":"Glutamic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"19","frames":"1","file":"gallery/pubchem/glutamic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_lysine","title":"Lysine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/lysine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_arginine","title":"Arginine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/arginine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_histidine","title":"Histidine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/histidine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_uracil","title":"Uracil","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"12","frames":"1","file":"gallery/pubchem/uracil.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_thymine","title":"Thymine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"15","frames":"1","file":"gallery/pubchem/thymine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cytosine","title":"Cytosine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"13","frames":"1","file":"gallery/pubchem/cytosine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_adenine","title":"Adenine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"15","frames":"1","file":"gallery/pubchem/adenine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_guanine","title":"Guanine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"16","frames":"1","file":"gallery/pubchem/guanine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"lj_melt","title":"Lennard-Jones Fluid","subtitle":"Argon-like system near triple point","domain":"Methods","atoms":"32,768","frames":"100","file":"dump.lj_melt.lammpstrj","available":true,"colors":["#00ff7f","#00fa9a","#40e0d0"],"metadata":{"method":"Benchmark MD","potential":"LJ (σ=3.4Å, ε=0.238kcal)","temperature":"85 K","reference":"Standard benchmark system"}},{"id":"fcc_perf","title":"1M Atom FCC Benchmark","subtitle":"Performance test — pure copper crystal","domain":"Methods","atoms":"1,000,000","frames":"10","file":"scale_tests/dump.large_100k.lammpstrj","available":true,"colors":["#ff00ff","#ff1493","#ff69b4"],"metadata":{"method":"Performance benchmark","potential":"EAM","temperature":"300 K","reference":"WebGPU scaling test"}}]'), za = {
        "Metals & Alloys": "#ff6b6b",
        "Ceramics & Oxides": "#4ecdc4",
        "Polymers & Soft Matter": "#ffe66d",
        Nanomaterials: "#a8e6cf",
        Biomolecules: "#ff8b94",
        "Energy Materials": "#7fd8be",
        "Defects & Mechanics": "#ffd93d",
        Methods: "#c7ceea",
        "Fluids & Solvents": "#82b1ff",
        "Advanced Theory & Validation": "#bf5cf0"
    }, ab = rb;
    function kf() {
        const [a, r] = y.useState(null), [s, u] = y.useState(null), [d, m] = y.useState("All"), [h, v] = y.useState(""), b = ab.filter((g)=>{
            if (d !== "All" && g.domain !== d) return !1;
            if (h) {
                const p = h.toLowerCase();
                return g.title.toLowerCase().includes(p) || g.subtitle.toLowerCase().includes(p) || g.domain.toLowerCase().includes(p);
            }
            return !0;
        }), C = y.useCallback(async (g)=>{
            if (g.available) {
                u(g.id), $.getState().setLoading(!0, 0);
                try {
                    const M = g.file.replace(/^\/+/, ""), S = "./".endsWith("/") ? "./" : ".//", T = `${S}${M}`;
                    if (g.id === "lupine_brand_asset") {
                        const k = `${S}gallery/curated/lupine_bluebonnet.xyz`.replace(/([^:]\/)\/+/g, "$1"), z = await (await fetch(k)).blob(), G = new File([
                            z
                        ], "lupine_bluebonnet.xyz"), { parseFile: _ } = await Zn(async ()=>{
                            const { parseFile: Q } = await Promise.resolve().then(()=>es);
                            return {
                                parseFile: Q
                            };
                        }, void 0, import.meta.url), O = await _(G);
                        if (!O.trajectory) throw new Error("No trajectory found in scientific prefab");
                        const N = O.trajectory.frames[0], { generateLupineFrame: V } = await Zn(async ()=>{
                            const { generateLupineFrame: Q } = await import("./index-DAvcjLNf.js");
                            return {
                                generateLupineFrame: Q
                            };
                        }, __vite__mapDeps([0,1,2]), import.meta.url), K = V(N);
                        $.getState().setFile({
                            name: g.title,
                            size: 1024,
                            trajectory: {
                                frames: [
                                    K
                                ],
                                totalFrames: 1,
                                atomTypes: O.trajectory.atomTypes,
                                globalBounds: {
                                    min: [
                                        K.boxBounds[0],
                                        K.boxBounds[2],
                                        K.boxBounds[4]
                                    ],
                                    max: [
                                        K.boxBounds[1],
                                        K.boxBounds[3],
                                        K.boxBounds[5]
                                    ]
                                }
                            },
                            thermo: null,
                            sourceUrl: "procedural"
                        }), $.getState().setRenderStyle("botanical"), $.getState().setAtomScale(1.4), u(null);
                        return;
                    }
                    const j = await fetch(T);
                    if (!j.ok) throw new Error(`Failed to fetch: ${j.status}`);
                    const F = await j.blob(), w = new File([
                        F
                    ], g.file.split("/").pop() ?? "file.dump"), { parseFile: x } = await Zn(async ()=>{
                        const { parseFile: k } = await Promise.resolve().then(()=>es);
                        return {
                            parseFile: k
                        };
                    }, void 0, import.meta.url), D = await x(w);
                    D.trajectory && $.getState().setFile({
                        name: g.title,
                        size: F.size,
                        trajectory: D.trajectory,
                        thermo: D.thermo ?? null,
                        sourceUrl: T
                    });
                } catch (p) {
                    console.warn(`Gallery load failed for ${g.id}:`, p.message), $.getState().setError(`Could not load "${g.title}" — try dragging the file directly.`);
                } finally{
                    u(null);
                }
            }
        }, []);
        return l.jsxs("div", {
            style: {
                width: "100%",
                maxWidth: 1200,
                margin: "0 auto",
                padding: "0 24px"
            },
            children: [
                l.jsxs("div", {
                    style: {
                        marginBottom: 24
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                marginBottom: 16
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 3,
                                        height: 20,
                                        background: "linear-gradient(180deg, var(--accent), #b480ff)",
                                        borderRadius: 2
                                    }
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 16,
                                        fontWeight: 600,
                                        color: "var(--text-primary)"
                                    },
                                    children: "Example Library"
                                }),
                                l.jsxs("span", {
                                    style: {
                                        fontSize: 13,
                                        color: "var(--text-muted)"
                                    },
                                    children: [
                                        b.length,
                                        " simulations"
                                    ]
                                })
                            ]
                        }),
                        l.jsx("div", {
                            style: {
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                marginBottom: 16
                            },
                            children: [
                                "All",
                                ...Object.keys(za)
                            ].map((g)=>l.jsx("button", {
                                    onClick: ()=>m(g),
                                    style: {
                                        padding: "6px 12px",
                                        fontSize: 12,
                                        fontWeight: 500,
                                        color: d === g ? "white" : "var(--text-muted)",
                                        background: d === g ? "var(--accent)" : "transparent",
                                        border: `1px solid ${d === g ? "var(--accent)" : "var(--border-subtle)"}`,
                                        borderRadius: 20,
                                        cursor: "pointer",
                                        transition: "all 100ms ease-out"
                                    },
                                    children: g
                                }, g))
                        }),
                        l.jsx("input", {
                            type: "text",
                            placeholder: "Search examples...",
                            value: h,
                            onChange: (g)=>v(g.target.value),
                            style: {
                                width: "100%",
                                maxWidth: 400,
                                padding: "10px 14px",
                                fontSize: 14,
                                background: "var(--bg-elevated)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: 10,
                                color: "var(--text-primary)"
                            }
                        })
                    ]
                }),
                d === "All" && !h ? l.jsx("div", {
                    style: {
                        display: "flex",
                        flexDirection: "column",
                        gap: 40
                    },
                    children: Object.keys(za).map((g)=>{
                        const p = b.filter((T)=>T.domain === g);
                        if (p.length === 0) return null;
                        const M = p.length > 6, S = M ? p.slice(0, 6) : p;
                        return l.jsxs("div", {
                            children: [
                                l.jsxs("div", {
                                    style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        marginBottom: 16
                                    },
                                    children: [
                                        l.jsx("div", {
                                            style: {
                                                width: 12,
                                                height: 12,
                                                borderRadius: 6,
                                                background: za[g]
                                            }
                                        }),
                                        l.jsx("h3", {
                                            style: {
                                                margin: 0,
                                                fontSize: 18,
                                                fontWeight: 600,
                                                color: "var(--text-primary)"
                                            },
                                            children: g
                                        }),
                                        l.jsxs("span", {
                                            style: {
                                                fontSize: 13,
                                                color: "var(--text-muted)"
                                            },
                                            children: [
                                                p.length,
                                                " simulations"
                                            ]
                                        }),
                                        M && l.jsxs("button", {
                                            onClick: ()=>m(g),
                                            style: {
                                                marginLeft: "auto",
                                                background: "transparent",
                                                border: "none",
                                                color: "var(--accent)",
                                                cursor: "pointer",
                                                fontSize: 13,
                                                fontWeight: 500
                                            },
                                            children: [
                                                "View all ",
                                                p.length,
                                                " →"
                                            ]
                                        })
                                    ]
                                }),
                                l.jsx("div", {
                                    style: {
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                                        gap: 16
                                    },
                                    children: S.map((T, j)=>l.jsx(Od, {
                                            example: T,
                                            hovered: a === T.id,
                                            loading: s === T.id,
                                            onHover: ()=>r(T.id),
                                            onLeave: ()=>r(null),
                                            onClick: ()=>C(T)
                                        }, T.id))
                                })
                            ]
                        }, g);
                    })
                }) : l.jsx("div", {
                    style: {
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: 16
                    },
                    children: b.map((g, p)=>l.jsx(Od, {
                            example: g,
                            hovered: a === g.id,
                            loading: s === g.id,
                            onHover: ()=>r(g.id),
                            onLeave: ()=>r(null),
                            onClick: ()=>C(g),
                            dataDemo: p === 0 ? "crack2d" : void 0
                        }, g.id))
                })
            ]
        });
    }
    function Od({ example: a, hovered: r, loading: s, onHover: u, onLeave: d, onClick: m, dataDemo: h }) {
        const v = y.useRef(null), b = za[a.domain];
        return y.useEffect(()=>{
            const C = v.current;
            if (!C) return;
            const g = C.getContext("2d");
            if (!g) return;
            const p = C.width, M = C.height, S = a.colors[0] || "#444444", T = a.colors[1] || S, j = a.colors[2] || S, F = g.createRadialGradient(p / 2, M / 2, 0, p / 2, M / 2, p * .7);
            F.addColorStop(0, "#0a0d14"), F.addColorStop(1, "#040608"), g.fillStyle = F, g.fillRect(0, 0, p, M);
            const w = a.id.split("").reduce((E, z)=>E + z.charCodeAt(0), 0), x = (E)=>{
                const z = Math.sin(w * 9301 + E * 49297) * 49297;
                return z - Math.floor(z);
            }, D = 50 + Math.floor(x(0) * 40);
            for(let E = 0; E < D; E++){
                const z = x(E * 3 + 1) * p, G = x(E * 3 + 2) * M, _ = 2 + x(E * 3 + 3) * 5, N = [
                    S,
                    T,
                    j
                ][Math.floor(x(E * 7) * 3)], V = g.createRadialGradient(z, G, 0, z, G, _ * 3);
                V.addColorStop(0, N + "40"), V.addColorStop(1, N + "00"), g.fillStyle = V, g.fillRect(z - _ * 3, G - _ * 3, _ * 6, _ * 6), g.beginPath(), g.arc(z, G, _, 0, Math.PI * 2), g.fillStyle = N, g.fill();
            }
            g.strokeStyle = S + "20", g.lineWidth = 1;
            const k = [];
            for(let E = 0; E < Math.min(D, 30); E++)k.push([
                x(E * 3 + 1) * p,
                x(E * 3 + 2) * M
            ]);
            for(let E = 0; E < k.length; E++)for(let z = E + 1; z < k.length; z++){
                const G = k[E][0] - k[z][0], _ = k[E][1] - k[z][1];
                G * G + _ * _ < 2500 && (g.beginPath(), g.moveTo(k[E][0], k[E][1]), g.lineTo(k[z][0], k[z][1]), g.stroke());
            }
        }, [
            a
        ]), l.jsxs("button", {
            "data-demo": h,
            onClick: m,
            onMouseEnter: u,
            onMouseLeave: d,
            disabled: s || !a.available,
            style: {
                position: "relative",
                opacity: a.available ? 1 : .5,
                display: "flex",
                flexDirection: "column",
                background: r ? "var(--bg-elevated)" : "var(--bg-glass)",
                border: `1px solid ${r ? b : "var(--border-subtle)"}`,
                borderRadius: 12,
                overflow: "hidden",
                cursor: s ? "wait" : a.available ? "pointer" : "default",
                transition: "all 200ms ease-out",
                transform: r ? "translateY(-2px)" : "none",
                boxShadow: r ? `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${b}40` : "none",
                textAlign: "left",
                padding: 0,
                color: "inherit",
                font: "inherit"
            },
            children: [
                l.jsx("canvas", {
                    ref: v,
                    width: 300,
                    height: 130,
                    style: {
                        width: "100%",
                        height: 130,
                        display: "block",
                        borderBottom: "1px solid var(--border-subtle)"
                    }
                }),
                l.jsxs("div", {
                    style: {
                        padding: "14px 16px"
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "inline-block",
                                padding: "3px 10px",
                                fontSize: 10,
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: b,
                                background: b + "15",
                                border: `1px solid ${b}30`,
                                borderRadius: 12,
                                marginBottom: 10
                            },
                            children: [
                                a.domain,
                                !a.available && " · Coming soon"
                            ]
                        }),
                        l.jsx("div", {
                            style: {
                                fontSize: 15,
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                marginBottom: 4,
                                lineHeight: 1.3
                            },
                            children: a.title
                        }),
                        l.jsx("div", {
                            style: {
                                fontSize: 12,
                                color: "var(--text-dim)",
                                lineHeight: 1.4,
                                marginBottom: 12,
                                minHeight: 34
                            },
                            children: a.subtitle
                        }),
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                gap: 8,
                                fontSize: 11,
                                color: "var(--text-muted)"
                            },
                            children: [
                                l.jsxs("span", {
                                    style: {
                                        padding: "3px 8px",
                                        background: "var(--bg-surface)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: 6
                                    },
                                    children: [
                                        a.atoms,
                                        " atoms"
                                    ]
                                }),
                                l.jsxs("span", {
                                    style: {
                                        padding: "3px 8px",
                                        background: "var(--bg-surface)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: 6
                                    },
                                    children: [
                                        a.frames,
                                        " frames"
                                    ]
                                })
                            ]
                        }),
                        r && a.metadata && l.jsxs("div", {
                            style: {
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: "1px solid var(--border-subtle)",
                                fontSize: 11,
                                color: "var(--text-dim)",
                                lineHeight: 1.5
                            },
                            children: [
                                a.metadata.potential && l.jsxs("div", {
                                    children: [
                                        "Potential: ",
                                        a.metadata.potential
                                    ]
                                }),
                                a.metadata.temperature && l.jsxs("div", {
                                    children: [
                                        "Temperature: ",
                                        a.metadata.temperature
                                    ]
                                }),
                                a.metadata.method && l.jsxs("div", {
                                    children: [
                                        "Method: ",
                                        a.metadata.method
                                    ]
                                })
                            ]
                        })
                    ]
                }),
                s && l.jsx("div", {
                    style: {
                        position: "absolute",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent)",
                        fontSize: 13,
                        fontWeight: 500
                    },
                    children: "Loading..."
                })
            ]
        });
    }
    const lb = Object.freeze(Object.defineProperty({
        __proto__: null,
        Gallery: kf
    }, Symbol.toStringTag, {
        value: "Module"
    })), ib = ()=>l.jsxs("svg", {
            width: "40",
            height: "40",
            viewBox: "0 0 48 48",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            children: [
                l.jsx("circle", {
                    cx: "24",
                    cy: "16",
                    r: "6"
                }),
                l.jsx("circle", {
                    cx: "14",
                    cy: "32",
                    r: "6"
                }),
                l.jsx("circle", {
                    cx: "34",
                    cy: "32",
                    r: "6"
                }),
                l.jsx("line", {
                    x1: "21",
                    y1: "21",
                    x2: "17",
                    y2: "27",
                    strokeLinecap: "round"
                }),
                l.jsx("line", {
                    x1: "27",
                    y1: "21",
                    x2: "31",
                    y2: "27",
                    strokeLinecap: "round"
                }),
                l.jsx("line", {
                    x1: "20",
                    y1: "32",
                    x2: "28",
                    y2: "32",
                    strokeLinecap: "round"
                })
            ]
        }), sb = ()=>l.jsxs("svg", {
            width: "32",
            height: "32",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("path", {
                    d: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                }),
                l.jsx("line", {
                    x1: "12",
                    y1: "9",
                    x2: "12",
                    y2: "13"
                }),
                l.jsx("line", {
                    x1: "12",
                    y1: "17",
                    x2: "12.01",
                    y2: "17"
                })
            ]
        });
    function cb() {
        const a = y.useRef(null), [r, s] = y.useState(!1), { file: u, loading: d, loadProgress: m, error: h, setFile: v, setLoading: b, setError: C } = $();
        y.useEffect(()=>{
            const j = (F)=>{
                const { total: w, parsed: x } = F.detail;
                w > 0 && b(!0, x / w);
            };
            return window.addEventListener("atlas:parse-progress", j), ()=>window.removeEventListener("atlas:parse-progress", j);
        }, [
            b
        ]);
        const g = y.useCallback(async (j)=>{
            if (j.length === 0) return;
            const F = Array.from(j).sort((w, x)=>{
                const D = Oa(w.name), k = Oa(x.name);
                return D === "dump" && k !== "dump" ? -1 : D !== "dump" && k === "dump" ? 1 : 0;
            });
            b(!0, 0), C(null);
            try {
                let w = null, x = null;
                for (const D of F){
                    const k = await wf(D);
                    k.trajectory && (w = k.trajectory), k.thermo && (x = k.thermo);
                }
                if (w) v({
                    name: F[0].name,
                    size: F.reduce((D, k)=>D + k.size, 0),
                    trajectory: w,
                    thermo: x
                });
                else throw new Error("No valid trajectory data found in the uploaded files.");
            } catch (w) {
                C(w.message || "Failed to parse file");
            }
        }, [
            v,
            b,
            C
        ]), p = y.useCallback((j)=>{
            j.preventDefault(), s(!1), g(j.dataTransfer.files);
        }, [
            g
        ]), M = y.useCallback((j)=>{
            j.preventDefault(), s(!0);
        }, []), S = y.useCallback(()=>s(!1), []), T = y.useCallback(()=>a.current?.click(), []);
        return y.useEffect(()=>{
            const j = ()=>{
                document.querySelector('[data-demo="crack2d"]')?.click();
            };
            return window.addEventListener("atlas:load-demo", j), ()=>window.removeEventListener("atlas:load-demo", j);
        }, []), u && !d ? null : l.jsxs("div", {
            onDrop: p,
            onDragOver: M,
            onDragLeave: S,
            onClick: d ? void 0 : T,
            style: {
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: u || d ? "center" : "flex-start",
                paddingTop: u || d ? 0 : 80,
                overflowY: "auto",
                background: r ? "radial-gradient(ellipse at center, rgba(15,98,254,0.08) 0%, rgba(0,0,0,0.96) 70%)" : "radial-gradient(ellipse at center, rgba(15,98,254,0.02) 0%, rgba(0,0,0,0.98) 70%)",
                cursor: d ? "wait" : "pointer",
                transition: "background 300ms ease-out",
                zIndex: 100
            },
            children: [
                l.jsx("input", {
                    ref: a,
                    type: "file",
                    accept: ".lammpstrj,.dump,.gz,.log,.data,.lmp,.xyz",
                    multiple: !0,
                    onChange: (j)=>j.target.files && g(j.target.files),
                    style: {
                        display: "none"
                    }
                }),
                d ? l.jsxs("div", {
                    style: {
                        textAlign: "center"
                    },
                    children: [
                        l.jsxs("svg", {
                            width: "80",
                            height: "80",
                            style: {
                                marginBottom: 20
                            },
                            children: [
                                l.jsx("circle", {
                                    cx: "40",
                                    cy: "40",
                                    r: "34",
                                    fill: "none",
                                    stroke: "var(--border-subtle)",
                                    strokeWidth: "3"
                                }),
                                l.jsx("circle", {
                                    cx: "40",
                                    cy: "40",
                                    r: "34",
                                    fill: "none",
                                    stroke: "var(--accent)",
                                    strokeWidth: "3",
                                    strokeLinecap: "round",
                                    strokeDasharray: `${Math.PI * 68}`,
                                    strokeDashoffset: `${Math.PI * 68 * (1 - m)}`,
                                    transform: "rotate(-90 40 40)",
                                    style: {
                                        transition: "stroke-dashoffset 200ms ease-out",
                                        filter: "drop-shadow(0 0 8px var(--accent-glow))"
                                    }
                                })
                            ]
                        }),
                        l.jsx("div", {
                            style: {
                                fontSize: "var(--fs-md)",
                                fontWeight: 500,
                                color: "var(--text-secondary)",
                                marginBottom: 6
                            },
                            children: "Parsing..."
                        }),
                        l.jsxs("div", {
                            style: {
                                fontSize: "var(--fs-sm)",
                                color: "var(--text-muted)",
                                fontFamily: "var(--font-mono)"
                            },
                            children: [
                                Math.round(m * 100),
                                "%"
                            ]
                        })
                    ]
                }) : h ? l.jsxs("div", {
                    style: {
                        textAlign: "center",
                        maxWidth: 400
                    },
                    children: [
                        l.jsx("div", {
                            style: {
                                width: 72,
                                height: 72,
                                borderRadius: "var(--radius-xl)",
                                background: "var(--danger-soft)",
                                border: "1px solid rgba(218, 30, 40, 0.2)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 20px",
                                color: "var(--danger)"
                            },
                            children: l.jsx(sb, {})
                        }),
                        l.jsx("div", {
                            style: {
                                fontSize: "var(--fs-md)",
                                color: "var(--danger)",
                                marginBottom: 8,
                                lineHeight: 1.5
                            },
                            children: h
                        }),
                        l.jsx("div", {
                            style: {
                                fontSize: "var(--fs-sm)",
                                color: "var(--text-muted)"
                            },
                            children: "Click or drag to try another file"
                        })
                    ]
                }) : l.jsxs("div", {
                    style: {
                        textAlign: "center",
                        maxWidth: 720,
                        padding: "0 24px"
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                position: "relative",
                                padding: "64px",
                                borderRadius: 32,
                                border: `1px solid ${r ? "var(--accent)" : "rgba(255,255,255,0.15)"}`,
                                background: r ? "rgba(15,98,254,0.12)" : "rgba(30, 30, 40, 0.4)",
                                backdropFilter: "blur(32px)",
                                WebkitBackdropFilter: "blur(32px)",
                                boxShadow: r ? "0 0 40px rgba(15,98,254,0.3), inset 0 0 20px rgba(15,98,254,0.1)" : "0 24px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
                                transition: "all 400ms cubic-bezier(0.16, 1, 0.3, 1)",
                                marginBottom: 48,
                                overflow: "hidden"
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        position: "absolute",
                                        top: -50,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        width: 150,
                                        height: 100,
                                        background: "var(--accent)",
                                        filter: "blur(80px)",
                                        opacity: .3,
                                        zIndex: 0
                                    }
                                }),
                                l.jsxs("div", {
                                    style: {
                                        position: "relative",
                                        zIndex: 1
                                    },
                                    children: [
                                        l.jsx("div", {
                                            style: {
                                                width: 88,
                                                height: 88,
                                                borderRadius: 28,
                                                background: "linear-gradient(135deg, var(--accent), #d04ed6)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                margin: "0 auto 24px",
                                                color: "white",
                                                boxShadow: "0 12px 24px rgba(15,98,254,0.4)",
                                                transform: r ? "scale(1.1)" : "scale(1)",
                                                transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                                            },
                                            children: l.jsx(ib, {})
                                        }),
                                        l.jsx("h1", {
                                            style: {
                                                fontSize: 32,
                                                fontWeight: 700,
                                                background: "linear-gradient(to right, #ffffff, #a8b0c3)",
                                                WebkitBackgroundClip: "text",
                                                WebkitTextFillColor: "transparent",
                                                marginBottom: 12,
                                                letterSpacing: "-0.02em"
                                            },
                                            children: "glimPSE"
                                        }),
                                        l.jsx("div", {
                                            style: {
                                                fontSize: 16,
                                                color: "rgba(255,255,255,0.6)",
                                                marginBottom: 32,
                                                lineHeight: 1.6,
                                                maxWidth: 400,
                                                margin: "0 auto 32px"
                                            },
                                            children: "Drop your LAMMPS dump, XYZ, or log files here to instantly render millions of atoms directly in your browser."
                                        }),
                                        l.jsx("button", {
                                            onClick: (j)=>{
                                                j.stopPropagation(), a.current?.click();
                                            },
                                            style: {
                                                padding: "12px 32px",
                                                fontSize: 16,
                                                fontWeight: 600,
                                                color: "white",
                                                background: "rgba(255,255,255,0.06)",
                                                border: "1px solid rgba(255,255,255,0.15)",
                                                borderRadius: 100,
                                                cursor: "pointer",
                                                transition: "all 200ms ease"
                                            },
                                            onMouseEnter: (j)=>{
                                                j.currentTarget.style.background = "rgba(255,255,255,0.12)", j.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                                            },
                                            onMouseLeave: (j)=>{
                                                j.currentTarget.style.background = "rgba(255,255,255,0.06)", j.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                                            },
                                            children: "Browse Files"
                                        })
                                    ]
                                })
                            ]
                        }),
                        l.jsx("div", {
                            onClick: (j)=>j.stopPropagation(),
                            style: {
                                cursor: "default"
                            },
                            children: l.jsx(kf, {})
                        })
                    ]
                })
            ]
        });
    }
    function ub({ thermo: a, totalFrames: r, currentFrame: s, onFrameChange: u, height: d = 28 }) {
        const m = y.useRef(null), h = y.useRef(null), v = y.useMemo(()=>{
            if (!a || a.runs.length === 0) return null;
            const C = a.runs[0];
            let g = C.getColumn("Temp");
            if (!g && C.columns.length > 0) for (const p of C.columns){
                const M = C.getColumn(p);
                if (M && M.length > 0) {
                    g = M;
                    break;
                }
            }
            return g;
        }, [
            a
        ]);
        y.useEffect(()=>{
            const C = m.current;
            if (!C || !v) return;
            const g = C.getContext("2d");
            if (!g) return;
            const p = window.devicePixelRatio || 1, M = C.clientWidth;
            C.width = Math.floor(M * p), C.height = Math.floor(d * p), g.scale(p, p), g.clearRect(0, 0, M, d);
            let S = 1 / 0, T = -1 / 0;
            for(let x = 0; x < v.length; x++)v[x] < S && (S = v[x]), v[x] > T && (T = v[x]);
            S === 1 / 0 && (S = 0, T = 1);
            const j = T - S || 1, F = Math.max(1, M / r);
            for(let x = 0; x < r; x++){
                const D = Math.floor(x / Math.max(1, r - 1) * (v.length - 1)), E = 240 - (v[D] - S) / j * 240;
                g.fillStyle = `hsl(${E}, 80%, 50%)`, g.fillRect(Math.floor(x * F), 0, Math.ceil(F), d);
            }
            const w = s / Math.max(1, r - 1) * M;
            g.fillStyle = "white", g.fillRect(Math.floor(w), 0, 2, d);
        }, [
            v,
            r,
            s,
            d
        ]);
        const b = y.useCallback((C)=>{
            const g = h.current?.getBoundingClientRect();
            if (!g || r <= 1) return;
            const p = C.clientX - g.left, M = Math.round(p / g.width * (r - 1));
            u(Math.max(0, Math.min(M, r - 1)));
        }, [
            r,
            u
        ]);
        return v ? l.jsxs("div", {
            ref: h,
            onClick: b,
            style: {
                flex: 1,
                height: d,
                position: "relative",
                cursor: "pointer",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)"
            },
            children: [
                l.jsx("canvas", {
                    ref: m,
                    style: {
                        width: "100%",
                        height: "100%",
                        display: "block"
                    }
                }),
                l.jsx("input", {
                    type: "range",
                    min: 0,
                    max: Math.max(r - 1, 0),
                    value: s,
                    onChange: (C)=>u(+C.target.value),
                    style: {
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                        margin: 0
                    },
                    "aria-label": "Frame scrubber"
                })
            ]
        }) : l.jsx("div", {
            style: {
                flex: 1,
                display: "flex",
                alignItems: "center"
            },
            children: l.jsx("input", {
                type: "range",
                min: 0,
                max: Math.max(r - 1, 0),
                value: s,
                onChange: (C)=>u(+C.target.value),
                style: {
                    width: "100%"
                }
            })
        });
    }
    class ts {
        cells = new Map;
        cellSize;
        positions = new Float32Array(0);
        constructor(r = 3){
            this.cellSize = r;
        }
        build(r, s) {
            this.cells.clear(), this.positions = r;
            for(let u = 0; u < s; u++){
                const d = r[u * 3], m = r[u * 3 + 1], h = r[u * 3 + 2], v = this.key(d, m, h);
                this.cells.has(v) || this.cells.set(v, []), this.cells.get(v).push(u);
            }
        }
        query(r, s, u, d) {
            const m = [], h = Math.ceil(d / this.cellSize), v = Math.floor(r / this.cellSize), b = Math.floor(s / this.cellSize), C = Math.floor(u / this.cellSize);
            for(let g = -h; g <= h; g++)for(let p = -h; p <= h; p++)for(let M = -h; M <= h; M++){
                const S = `${v + g},${b + p},${C + M}`, T = this.cells.get(S);
                if (T) for (const j of T){
                    const F = this.positions[j * 3], w = this.positions[j * 3 + 1], x = this.positions[j * 3 + 2], D = F - r, k = w - s, E = x - u, z = D * D + k * k + E * E;
                    z < d * d && m.push({
                        index: j,
                        dist: Math.sqrt(z)
                    });
                }
            }
            return m.sort((g, p)=>g.dist - p.dist);
        }
        closest(r, s, u, d = 10) {
            let m = this.cellSize;
            for(; m <= d;){
                const h = this.query(r, s, u, m);
                if (h.length > 0) return h[0];
                m *= 2;
            }
            return null;
        }
        getCell(r, s, u) {
            const d = this.key(r, s, u);
            return this.cells.get(d) ?? [];
        }
        findBonds(r, s) {
            const u = [], d = new Set, m = Math.ceil(r / this.cellSize);
            for (const [h, v] of this.cells){
                const [b, C, g] = h.split(",").map(Number);
                for (const p of v){
                    const M = this.positions[p * 3], S = this.positions[p * 3 + 1], T = this.positions[p * 3 + 2];
                    for(let j = -m; j <= m; j++)for(let F = -m; F <= m; F++)for(let w = -m; w <= m; w++){
                        const x = `${b + j},${C + F},${g + w}`, D = this.cells.get(x);
                        if (D) for (const k of D){
                            if (p >= k) continue;
                            const E = `${p}-${k}`;
                            if (d.has(E)) continue;
                            d.add(E);
                            const z = this.positions[k * 3], G = this.positions[k * 3 + 1], _ = this.positions[k * 3 + 2], O = z - M, N = G - S, V = _ - T, K = O * O + N * N + V * V;
                            let Q = r;
                            K < Q * Q && u.push([
                                p,
                                k
                            ]);
                        }
                    }
                }
            }
            return u;
        }
        clear() {
            this.cells.clear(), this.positions = new Float32Array(0);
        }
        stats() {
            let r = 0, s = 0;
            for (const u of this.cells.values())r += u.length, s = Math.max(s, u.length);
            return {
                numCells: this.cells.size,
                totalAtoms: r,
                avgPerCell: r / (this.cells.size || 1),
                maxInCell: s
            };
        }
        key(r, s, u) {
            return `${Math.floor(r / this.cellSize)},${Math.floor(s / this.cellSize)},${Math.floor(u / this.cellSize)}`;
        }
    }
    ns = {
        1: {
            symbol: "H",
            name: "Hydrogen",
            mass: 1.008,
            radius: .31,
            block: "s",
            role: "Terminator",
            color: "#ffffff"
        },
        2: {
            symbol: "He",
            name: "Helium",
            mass: 4.0026,
            radius: .28,
            block: "s",
            role: "Inert Gas",
            color: "#d9ffff"
        },
        3: {
            symbol: "Li",
            name: "Lithium",
            mass: 6.94,
            radius: 1.28,
            block: "s",
            role: "Intercalant",
            color: "#cc80ff"
        },
        4: {
            symbol: "Be",
            name: "Beryllium",
            mass: 9.0122,
            radius: .96,
            block: "s",
            role: "Matrix",
            color: "#c2ff00"
        },
        5: {
            symbol: "B",
            name: "Boron",
            mass: 10.81,
            radius: .84,
            block: "p",
            role: "Dopant",
            color: "#ffb5b5"
        },
        6: {
            symbol: "C",
            name: "Carbon",
            mass: 12.011,
            radius: .76,
            block: "p",
            role: "Framework",
            color: "#909090"
        },
        7: {
            symbol: "N",
            name: "Nitrogen",
            mass: 14.007,
            radius: .71,
            block: "p",
            role: "Ligand",
            color: "#3050f8"
        },
        8: {
            symbol: "O",
            name: "Oxygen",
            mass: 15.999,
            radius: .66,
            block: "p",
            role: "Framework",
            color: "#ff0d0d"
        },
        9: {
            symbol: "F",
            name: "Fluorine",
            mass: 18.998,
            radius: .57,
            block: "p",
            role: "Ligand",
            color: "#90e050"
        },
        10: {
            symbol: "Ne",
            name: "Neon",
            mass: 20.18,
            radius: .58,
            block: "p",
            role: "Inert Gas",
            color: "#b3e3f5"
        },
        11: {
            symbol: "Na",
            name: "Sodium",
            mass: 22.99,
            radius: 1.66,
            block: "s",
            role: "Intercalant",
            color: "#ab5cf2"
        },
        12: {
            symbol: "Mg",
            name: "Magnesium",
            mass: 24.305,
            radius: 1.41,
            block: "s",
            role: "Matrix",
            color: "#8aff00"
        },
        13: {
            symbol: "Al",
            name: "Aluminum",
            mass: 26.982,
            radius: 1.21,
            block: "p",
            role: "Framework",
            color: "#bfa6a6"
        },
        14: {
            symbol: "Si",
            name: "Silicon",
            mass: 28.085,
            radius: 1.11,
            block: "p",
            role: "Semiconductor",
            color: "#f0c8a0"
        },
        15: {
            symbol: "P",
            name: "Phosphorus",
            mass: 30.974,
            radius: 1.07,
            block: "p",
            role: "Dopant",
            color: "#ff8000"
        },
        16: {
            symbol: "S",
            name: "Sulfur",
            mass: 32.06,
            radius: 1.05,
            block: "p",
            role: "Ligand",
            color: "#ffff30"
        },
        17: {
            symbol: "Cl",
            name: "Chlorine",
            mass: 35.45,
            radius: 1.02,
            block: "p",
            role: "Ligand",
            color: "#1ff01f"
        },
        18: {
            symbol: "Ar",
            name: "Argon",
            mass: 39.95,
            radius: 1.06,
            block: "p",
            role: "Inert Gas",
            color: "#80d1e3"
        },
        19: {
            symbol: "K",
            name: "Potassium",
            mass: 39.098,
            radius: 2.03,
            block: "s",
            role: "Intercalant",
            color: "#8f40d4"
        },
        20: {
            symbol: "Ca",
            name: "Calcium",
            mass: 40.078,
            radius: 1.76,
            block: "s",
            role: "Matrix",
            color: "#3dff00"
        },
        22: {
            symbol: "Ti",
            name: "Titanium",
            mass: 47.867,
            radius: 1.6,
            block: "d",
            role: "Alloy Matrix",
            color: "#bfc2c7"
        },
        23: {
            symbol: "V",
            name: "Vanadium",
            mass: 50.942,
            radius: 1.53,
            block: "d",
            role: "Alloy Component",
            color: "#a6a6ab"
        },
        24: {
            symbol: "Cr",
            name: "Chromium",
            mass: 51.996,
            radius: 1.39,
            block: "d",
            role: "Alloy Component",
            color: "#8a99c7"
        },
        25: {
            symbol: "Mn",
            name: "Manganese",
            mass: 54.938,
            radius: 1.39,
            block: "d",
            role: "Alloy Component",
            color: "#9c7ac7"
        },
        26: {
            symbol: "Fe",
            name: "Iron",
            mass: 55.845,
            radius: 1.32,
            block: "d",
            role: "Magnetic Core",
            color: "#e06633"
        },
        27: {
            symbol: "Co",
            name: "Cobalt",
            mass: 58.933,
            radius: 1.26,
            block: "d",
            role: "Magnetic Core",
            color: "#f090a0"
        },
        28: {
            symbol: "Ni",
            name: "Nickel",
            mass: 58.693,
            radius: 1.24,
            block: "d",
            role: "Alloy Matrix",
            color: "#50d050"
        },
        29: {
            symbol: "Cu",
            name: "Copper",
            mass: 63.546,
            radius: 1.32,
            block: "d",
            role: "Conductor",
            color: "#c88033"
        },
        30: {
            symbol: "Zn",
            name: "Zinc",
            mass: 65.38,
            radius: 1.22,
            block: "d",
            role: "Alloy Component",
            color: "#7d80b0"
        },
        40: {
            symbol: "Zr",
            name: "Zirconium",
            mass: 91.224,
            radius: 1.75,
            block: "d",
            role: "Alloying Agent",
            color: "#94e0e0"
        },
        42: {
            symbol: "Mo",
            name: "Molybdenum",
            mass: 95.95,
            radius: 1.54,
            block: "d",
            role: "Alloying Agent",
            color: "#54b5b5"
        },
        46: {
            symbol: "Pd",
            name: "Palladium",
            mass: 106.42,
            radius: 1.39,
            block: "d",
            role: "Catalyst",
            color: "#006985"
        },
        47: {
            symbol: "Ag",
            name: "Silver",
            mass: 107.87,
            radius: 1.45,
            block: "d",
            role: "Conductor",
            color: "#c0c0c0"
        },
        54: {
            symbol: "Xe",
            name: "Xenon",
            mass: 131.29,
            radius: 1.4,
            block: "p",
            role: "Inert Gas",
            color: "#429eb0"
        },
        74: {
            symbol: "W",
            name: "Tungsten",
            mass: 183.84,
            radius: 1.62,
            block: "d",
            role: "Refractory",
            color: "#2194d6"
        },
        78: {
            symbol: "Pt",
            name: "Platinum",
            mass: 195.08,
            radius: 1.36,
            block: "d",
            role: "Catalyst",
            color: "#d0d0e0"
        },
        79: {
            symbol: "Au",
            name: "Gold",
            mass: 196.97,
            radius: 1.36,
            block: "d",
            role: "Conductor",
            color: "#ffd123"
        }
    };
    Cr = function(a) {
        if (ns[a]) return ns[a];
        const r = a * 137.508 % 360;
        return {
            symbol: `X${a}`,
            name: "Unknown Isotope",
            mass: 0,
            radius: 1,
            block: "?",
            role: "Unassigned",
            color: `hsl(${r}, 70%, 65%)`
        };
    };
    db = function(a) {
        if (a.startsWith("hsl")) return [
            .6,
            .6,
            .6
        ];
        const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(a);
        return r ? [
            parseInt(r[1], 16) / 255,
            parseInt(r[2], 16) / 255,
            parseInt(r[3], 16) / 255
        ] : [
            .6,
            .6,
            .6
        ];
    };
    const Pf = {};
    for (const [a, r] of Object.entries(ns)){
        const s = parseInt(a, 10);
        db(r.color), Pf[s] = r.radius;
    }
    const Ld = [
        .6,
        .6,
        .6
    ], os = {
        7: [
            .28,
            .38,
            .85
        ],
        1: [
            .97,
            .96,
            .9
        ],
        6: [
            .35,
            .28,
            .18
        ],
        9: [
            .22,
            .58,
            .2
        ],
        16: [
            .92,
            .78,
            .18
        ]
    }, fb = {
        7: .85,
        1: .55,
        6: .72,
        9: .65,
        16: .5
    };
    function xr(a, r, s) {
        return [
            a[0] + (r[0] - a[0]) * s,
            a[1] + (r[1] - a[1]) * s,
            a[2] + (r[2] - a[2]) * s
        ];
    }
    function zn(a, r, s, u) {
        return (d)=>(d = Math.max(0, Math.min(1, d)), d < .33 ? xr(a, r, d / .33) : d < .66 ? xr(r, s, (d - .33) / .33) : xr(s, u, (d - .66) / .34));
    }
    const Ro = {
        viridis: zn([
            .267,
            .004,
            .329
        ], [
            .282,
            .14,
            .458
        ], [
            .127,
            .566,
            .551
        ], [
            .993,
            .906,
            .144
        ]),
        inferno: zn([
            .001,
            0,
            .014
        ], [
            .416,
            .065,
            .432
        ], [
            .891,
            .298,
            .159
        ], [
            .988,
            .998,
            .644
        ]),
        coolwarm: (a)=>{
            a = Math.max(0, Math.min(1, a));
            const r = [
                .23,
                .299,
                .754
            ], s = [
                .865,
                .865,
                .865
            ], u = [
                .706,
                .016,
                .15
            ];
            return a < .5 ? xr(r, s, a * 2) : xr(s, u, (a - .5) * 2);
        },
        plasma: zn([
            .05,
            .03,
            .53
        ], [
            .494,
            .012,
            .658
        ], [
            .798,
            .28,
            .47
        ], [
            .94,
            .975,
            .131
        ]),
        magma: zn([
            .001,
            0,
            .014
        ], [
            .416,
            .065,
            .432
        ], [
            .871,
            .287,
            .381
        ], [
            .988,
            .991,
            .75
        ]),
        cividis: zn([
            0,
            .135,
            .305
        ], [
            .345,
            .376,
            .388
        ], [
            .725,
            .66,
            .32
        ], [
            .995,
            .883,
            .15
        ]),
        neon: zn([
            0,
            1,
            .4
        ], [
            0,
            .8,
            1
        ], [
            .6,
            0,
            1
        ], [
            1,
            0,
            .6
        ]),
        sunset: zn([
            .12,
            0,
            .3
        ], [
            .8,
            .15,
            .4
        ], [
            1,
            .55,
            .15
        ], [
            1,
            .92,
            .5
        ]),
        vaporwave: zn([
            .05,
            .85,
            .85
        ], [
            .55,
            .3,
            .95
        ], [
            1,
            .4,
            .7
        ], [
            1,
            .85,
            .4
        ])
    };
    function Di(a) {
        return Math.max(0, Math.min(255, Math.round(a))).toString(16).padStart(2, "0");
    }
    function Ud(a, r = 1) {
        return `#${Di(a[0] * 255 * r)}${Di(a[1] * 255 * r)}${Di(a[2] * 255 * r)}`;
    }
    function mb(a) {
        const r = Ro[a] ?? Ro.viridis, s = Ud(r(.05), .22), u = Ud(r(.65), .4);
        return {
            top: s,
            bottom: u
        };
    }
    function wa(a, r) {
        const u = Math.max(0, Math.min(1, (a - 1) / Math.max(7, 1)));
        return (Ro[r] ?? Ro.viridis)(u);
    }
    const pb = 5e4;
    function hb({ frame: a, nextFrame: r, interpolationFactor: s, colorMode: u = "type", colorProperty: d, colormap: m = "viridis", propRange: h, scale: v = 1, renderStyle: b = "standard", maxAtoms: C, onSpatialHash: g, highlightedAtoms: p, hiddenAtomTypes: M, atomTypeScales: S, botanicalMode: T = !1 }) {
        const j = y.useRef(null), F = y.useRef(new ts(3)), w = y.useRef(Math.max(pb, Math.ceil(a.natoms * 1.2)));
        a.natoms > w.current && (w.current = Math.max(w.current * 1.5, Math.ceil(a.natoms * 1.2)));
        let x = w.current;
        C !== void 0 && x > C && (x = C);
        const D = y.useMemo(()=>new Float32Array(x * 16), [
            x
        ]), k = y.useMemo(()=>new Float32Array(x * 3), [
            x
        ]), E = y.useMemo(()=>new ef, []), z = y.useMemo(()=>new Ae, []), G = y.useMemo(()=>new Ae, []), _ = y.useMemo(()=>new Wi, []), O = y.useMemo(()=>b === "toon" ? new hd(1, 1) : a.natoms > 1e5 ? new bd(1, 12, 8) : a.natoms > 25e3 ? new hd(1, 2) : new bd(1, 32, 32), [
            b,
            a.natoms > 1e5,
            a.natoms > 25e3
        ]), N = y.useRef({
            uTime: {
                value: 0
            }
        });
        mn((X)=>{
            T && (N.current.uTime.value = X.clock.elapsedTime);
        });
        const V = y.useMemo(()=>{
            if (T) {
                const X = new _a({
                    metalness: .1,
                    roughness: .4,
                    clearcoat: .4,
                    clearcoatRoughness: .25,
                    transmission: .4,
                    thickness: 2.5,
                    ior: 1.45
                });
                return X.onBeforeCompile = (ne)=>{
                    ne.uniforms.uTime = N.current.uTime, ne.vertexShader = `
          uniform float uTime;
          ${ne.vertexShader}
        `, ne.vertexShader = ne.vertexShader.replace("#include <begin_vertex>", `
          #include <begin_vertex>
          // Analytically compute the ground height at this instance's world position
          // This matches the Math.exp(-distSq / 600.0) from ProceduralLupine
          float distSq = instanceMatrix[3].x * instanceMatrix[3].x + instanceMatrix[3].z * instanceMatrix[3].z;
          float groundY = 15.0 * exp(-distSq / 600.0);
          
          // Compute local height relative to the hill surface
          float localY = instanceMatrix[3].y - groundY;
          
          // Organic wind sway based on local height.
          // The higher up the plant, the more it sways. Pin the roots to the ground.
          float heightFactor = max(0.0, localY + 8.0); // Stem base is around -10 localY, so we start sway above it
          float swayAmount = pow(heightFactor, 1.2) * 0.005; // Non-linear sway for realistic bending
          
          // Wave function based on world position and time
          float noise = sin(uTime * 1.5 + instanceMatrix[3].x * 0.3 + instanceMatrix[3].z * 0.3);
          
          transformed.x += noise * swayAmount;
          transformed.z += cos(uTime * 1.1 + instanceMatrix[3].x * 0.4) * swayAmount;
          `), ne.fragmentShader = `
          ${ne.fragmentShader}
        `, ne.fragmentShader = ne.fragmentShader.replace("#include <dithering_fragment>", `
          #include <dithering_fragment>
          // Velvet rim/fuzz (Schlick approximation)
          vec3 viewDir = normalize(vViewPosition);
          float ndotv = max(0.0, dot(geometryNormal, viewDir));
          float fresnel = pow(1.0 - ndotv, 4.0);
          
          // Subsurface Scattering Wrap Lighting
          vec3 lightDir = normalize(vec3(0.5, 0.8, 0.5)); // Fake directional light
          float wrap = 0.6;
          float NdotL = max(0.0, (dot(geometryNormal, lightDir) + wrap) / (1.0 + wrap));
          vec3 sssColor = gl_FragColor.rgb * vec3(1.2, 1.4, 0.8) * NdotL * 0.4;
          
          // Mix SSS and Fuzz
          gl_FragColor.rgb += sssColor;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.2, 0.25, 0.1), fresnel * 0.8);
          `);
                }, X;
            }
            if (b === "toon") {
                const X = new xh(new Uint8Array([
                    40,
                    40,
                    40,
                    255,
                    120,
                    120,
                    120,
                    255,
                    255,
                    255,
                    255,
                    255
                ]), 3, 1, Xd);
                return X.needsUpdate = !0, X.magFilter = gd, X.minFilter = gd, new nf({
                    gradientMap: X
                });
            }
            return new _a({
                metalness: .1,
                roughness: .5,
                clearcoat: .05,
                clearcoatRoughness: .5,
                envMapIntensity: .8
            });
        }, [
            b,
            T
        ]), K = y.useMemo(()=>u !== "property" || !d ? null : a.properties?.get(d) ?? null, [
            a,
            u,
            d
        ]), [Q, Z] = y.useMemo(()=>{
            if (!K) return [
                0,
                1
            ];
            let X = 1 / 0, ne = -1 / 0;
            for(let re = 0; re < K.length; re++)K[re] < X && (X = K[re]), K[re] > ne && (ne = K[re]);
            return [
                X === 1 / 0 ? 0 : X,
                ne === -1 / 0 ? 1 : ne
            ];
        }, [
            K
        ]), J = h?.[0] ?? Q, A = h?.[1] ?? Z, oe = Ro[m] ?? Ro.viridis, fe = y.useMemo(()=>{
            const X = new Set;
            for(let ae = 0; ae < a.natoms; ae++)X.add(a.types[ae]);
            const ne = Array.from(X).sort((ae, Se)=>ae - Se), re = new Map;
            for(let ae = 0; ae < ne.length; ae++){
                const Se = ne.length > 1 ? ae / (ne.length - 1) : .5;
                re.set(ne[ae], oe(Se));
            }
            return re;
        }, [
            a.types,
            a.natoms,
            oe
        ]);
        return y.useEffect(()=>{
            const X = j.current;
            if (!X) return;
            const ne = typeof requestIdleCallback < "u" ? requestIdleCallback : (se)=>setTimeout(se, 0), re = typeof cancelIdleCallback < "u" ? cancelIdleCallback : clearTimeout, ae = ne(()=>{
                F.current.build(a.positions, a.natoms), g?.(F.current);
            }), Se = ()=>re(ae), ye = a.positions, Me = a.types, Ue = s ?? 0, kt = r && r.natoms === a.natoms ? r.positions : null;
            for(let se = 0; se < a.natoms; se++){
                let nt = ye[se * 3], Re = ye[se * 3 + 1], qe = ye[se * 3 + 2];
                if (kt && Ue > 0) {
                    let xe = kt[se * 3] - nt, me = kt[se * 3 + 1] - Re, He = kt[se * 3 + 2] - qe;
                    if (a.boxBounds) {
                        const ut = a.boxBounds[1] - a.boxBounds[0], $e = a.boxBounds[3] - a.boxBounds[2], Ce = a.boxBounds[5] - a.boxBounds[4];
                        xe > ut / 2 && (xe -= ut), xe < -ut / 2 && (xe += ut), me > $e / 2 && (me -= $e), me < -$e / 2 && (me += $e), He > Ce / 2 && (He -= Ce), He < -Ce / 2 && (He += Ce);
                    }
                    nt += xe * Ue, Re += me * Ue, qe += He * Ue;
                }
                z.set(nt, Re, qe);
                const lt = M?.has(Me[se]) ?? !1, L = S?.[Me[se]] ?? 1;
                let te = 1.2;
                T ? te = fb[Me[se]] ?? te : te = Pf[Me[se]] ?? te;
                const Ie = lt ? 0 : te * v * L;
                if (G.setScalar(Ie), E.compose(z, _, G), E.toArray(D, se * 16), T) {
                    const xe = p?.has(se), me = os[Me[se]] ?? [
                        .3,
                        .5,
                        .2
                    ];
                    xe ? (k[se * 3] = Math.min(1, me[0] * 1.5), k[se * 3 + 1] = Math.min(1, me[1] * 1.5), k[se * 3 + 2] = Math.min(1, me[2] * 1.5)) : (k[se * 3] = me[0], k[se * 3 + 1] = me[1], k[se * 3 + 2] = me[2]);
                } else if (u === "property" && K) {
                    let xe = K[se];
                    if (r && Ue > 0 && r.properties && r.properties.has(d)) {
                        const Ce = r.properties.get(d);
                        Ce && Ce.length > se && (xe = xe + (Ce[se] - xe) * Ue);
                    }
                    const me = A > J ? (xe - J) / (A - J) : .5, [He, ut, $e] = oe(me);
                    k[se * 3] = He, k[se * 3 + 1] = ut, k[se * 3 + 2] = $e;
                } else {
                    const xe = p?.has(se);
                    let me = [
                        .6,
                        .6,
                        .6
                    ];
                    u === "uniform" ? me = oe(0) : me = fe.get(Me[se]) ?? [
                        .6,
                        .6,
                        .6
                    ], xe ? (k[se * 3] = Math.min(1, me[0] * 1.5), k[se * 3 + 1] = Math.min(1, me[1] * 1.5), k[se * 3 + 2] = Math.min(1, me[2] * 1.5)) : (k[se * 3] = me[0], k[se * 3 + 1] = me[1], k[se * 3 + 2] = me[2]);
                }
            }
            const je = Math.min(a.natoms, x);
            return X.instanceMatrix.array.set(D.subarray(0, je * 16)), X.instanceMatrix.needsUpdate = !0, X.instanceColor && (X.instanceColor.array.set(k.subarray(0, je * 3)), X.instanceColor.needsUpdate = !0), X.count = je, Se;
        }, [
            a,
            r,
            s,
            u,
            K,
            J,
            A,
            v,
            p,
            M,
            S,
            fe,
            T,
            D,
            k,
            E,
            z,
            G,
            _,
            oe,
            g
        ]), y.useEffect(()=>()=>{
                O.dispose(), V.dispose(), F.current.clear();
            }, [
            O,
            V
        ]), l.jsx("instancedMesh", {
            ref: j,
            args: [
                O,
                V,
                x
            ],
            frustumCulled: !1,
            children: l.jsx("instancedBufferAttribute", {
                attach: "instanceColor",
                args: [
                    k,
                    3
                ]
            })
        });
    }
    function bb({ frame: a, nextFrame: r, interpolationFactor: s, colormap: u = "viridis", colorMode: d = "type", maxBondLength: m = 2.5, typeCutoffs: h, periodic: v = !1, cellBounds: b, radius: C = .12, opacity: g = .85, renderStyle: p = "standard", botanicalMode: M = !1 }) {
        y.useRef(null);
        const S = y.useRef(new ts(m)), T = y.useMemo(()=>new Jd, []), j = y.useMemo(()=>new vh(1, 1, 1, 8, 1), []), F = y.useRef({
            uTime: {
                value: 0
            }
        });
        mn((_)=>{
            M && (F.current.uTime.value = _.clock.elapsedTime);
        });
        const w = y.useMemo(()=>{
            if (M) {
                const _ = new _a({
                    metalness: .05,
                    roughness: .65,
                    clearcoat: .2,
                    clearcoatRoughness: .3,
                    transmission: .3,
                    thickness: 1.5,
                    ior: 1.4
                });
                return _.onBeforeCompile = (O)=>{
                    O.uniforms.uTime = F.current.uTime, O.vertexShader = `
          uniform float uTime;
          ${O.vertexShader}
        `, O.vertexShader = O.vertexShader.replace("#include <begin_vertex>", `
          #include <begin_vertex>
          // Organic wind sway based on world height (instanceMatrix[3].y)
          float heightFactor = max(0.0, instanceMatrix[3].y - 2.0); 
          float swayAmount = heightFactor * 0.04;
          float noise = sin(uTime * 1.2 + instanceMatrix[3].x * 0.5 + instanceMatrix[3].z * 0.5);
          transformed.x += noise * swayAmount;
          transformed.z += cos(uTime * 0.9 + instanceMatrix[3].x) * swayAmount;
          `), O.fragmentShader = `
          ${O.fragmentShader}
        `, O.fragmentShader = O.fragmentShader.replace("#include <dithering_fragment>", `
          #include <dithering_fragment>
          // Velvet rim/fuzz (Schlick approximation)
          vec3 viewDir = normalize(vViewPosition);
          float ndotv = max(0.0, dot(geometryNormal, viewDir));
          float fresnel = pow(1.0 - ndotv, 3.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + vec3(0.15, 0.2, 0.05), fresnel * 0.6);
          `);
                }, _;
            }
            return p === "toon" ? new nf({
                transparent: g < 1,
                opacity: g
            }) : new _a({
                metalness: .1,
                roughness: .5,
                transparent: g < 1,
                opacity: g
            });
        }, [
            p,
            g,
            M
        ]);
        y.useEffect(()=>()=>{
                j.dispose();
            }, [
            j
        ]), y.useEffect(()=>()=>{
                w.dispose();
            }, [
            w
        ]);
        const x = y.useMemo(()=>{
            if (!a || a.natoms < 2) return [];
            if (a.bonds && a.bonds.length > 0) {
                const _ = [];
                for(let O = 0; O < a.bonds.length; O += 2)_.push([
                    a.bonds[O],
                    a.bonds[O + 1]
                ]);
                return _;
            }
            return S.current = new ts(m), S.current.build(a.positions, a.natoms), gb(a, S.current, m, h, v, b);
        }, [
            a,
            m,
            h,
            v,
            b
        ]), D = 2e4, k = x.length * 2, E = y.useRef(null), z = y.useRef(Math.max(D, Math.ceil(k * 1.2)));
        k > z.current && (z.current = Math.max(z.current * 1.5, Math.ceil(k * 1.2)));
        const G = z.current;
        return y.useEffect(()=>{
            const _ = E.current;
            if (!_ || k === 0 || !_.instanceMatrix) return;
            const O = Math.min(k, G);
            _.count = O;
            const N = new Ae, V = new Ae, K = new Ae, Q = new Ae, Z = new Ae(0, 1, 0), J = new Ae, A = new Ae(1, 0, 0), oe = new cs;
            for(let fe = 0; fe < O / 2; fe++){
                const [X, ne] = x[fe];
                let re = a.positions[X * 3], ae = a.positions[X * 3 + 1], Se = a.positions[X * 3 + 2], ye = a.positions[ne * 3], Me = a.positions[ne * 3 + 1], Ue = a.positions[ne * 3 + 2];
                const De = s ?? 0;
                if (r && De > 0 && r.positions && r.positions.length >= a.positions.length) {
                    let qe = r.positions[X * 3], lt = r.positions[X * 3 + 1], L = r.positions[X * 3 + 2], te = qe - re, Ie = lt - ae, xe = L - Se, me = r.positions[ne * 3], He = r.positions[ne * 3 + 1], ut = r.positions[ne * 3 + 2], $e = me - ye, Ce = He - Me, gt = ut - Ue;
                    if (a.boxBounds) {
                        const Pt = a.boxBounds[1] - a.boxBounds[0], Rt = a.boxBounds[3] - a.boxBounds[2], yt = a.boxBounds[5] - a.boxBounds[4];
                        te > Pt / 2 && (te -= Pt), te < -Pt / 2 && (te += Pt), $e > Pt / 2 && ($e -= Pt), $e < -Pt / 2 && ($e += Pt), Ie > Rt / 2 && (Ie -= Rt), Ie < -Rt / 2 && (Ie += Rt), Ce > Rt / 2 && (Ce -= Rt), Ce < -Rt / 2 && (Ce += Rt), xe > yt / 2 && (xe -= yt), xe < -yt / 2 && (xe += yt), gt > yt / 2 && (gt -= yt), gt < -yt / 2 && (gt += yt);
                    }
                    re += te * De, ae += Ie * De, Se += xe * De, ye += $e * De, Me += Ce * De, Ue += gt * De;
                }
                if (N.set(re, ae, Se), V.set(ye, Me, Ue), v && b) {
                    let qe = V.x - N.x, lt = V.y - N.y, L = V.z - N.z;
                    const te = b[1] - b[0], Ie = b[3] - b[2], xe = b[5] - b[4];
                    Math.abs(qe) > te * .5 && (qe -= Math.sign(qe) * te), Math.abs(lt) > Ie * .5 && (lt -= Math.sign(lt) * Ie), Math.abs(L) > xe * .5 && (L -= Math.sign(L) * xe), V.set(N.x + qe, N.y + lt, N.z + L);
                }
                K.lerpVectors(N, V, .5);
                const se = N.distanceTo(V) / 2;
                Q.subVectors(K, N).normalize(), J.lerpVectors(N, K, .5), T.position.copy(J), T.scale.set(C, se, C), Math.abs(Q.dot(Z)) < .9999 ? T.quaternion.setFromUnitVectors(Z, Q) : (T.quaternion.identity(), Q.y < 0 && T.quaternion.setFromAxisAngle(A, Math.PI)), T.updateMatrix(), _.setMatrixAt(fe * 2, T.matrix);
                let nt;
                M && a.types ? nt = os[a.types[X]] ?? [
                    .3,
                    .5,
                    .2
                ] : d === "uniform" ? nt = wa(1, u) : nt = a.types ? wa(a.types[X], u) : Ld, oe.setRGB(nt[0], nt[1], nt[2]), _.setColorAt(fe * 2, oe), Q.subVectors(V, K).normalize(), J.lerpVectors(K, V, .5), T.position.copy(J), T.scale.set(C, se, C), Math.abs(Q.dot(Z)) < .9999 ? T.quaternion.setFromUnitVectors(Z, Q) : (T.quaternion.identity(), Q.y < 0 && T.quaternion.setFromAxisAngle(A, Math.PI)), T.updateMatrix(), _.setMatrixAt(fe * 2 + 1, T.matrix);
                let Re;
                M && a.types ? Re = os[a.types[ne]] ?? [
                    .3,
                    .5,
                    .2
                ] : d === "uniform" ? Re = wa(1, u) : Re = a.types ? wa(a.types[ne], u) : Ld, oe.setRGB(Re[0], Re[1], Re[2]), _.setColorAt(fe * 2 + 1, oe);
            }
            _.instanceMatrix.needsUpdate = !0, _.instanceColor && (_.instanceColor.needsUpdate = !0);
        }, [
            x,
            a,
            r,
            s,
            u,
            d,
            v,
            b,
            C,
            T,
            M
        ]), l.jsx("instancedMesh", {
            ref: E,
            args: [
                j,
                w,
                G
            ],
            frustumCulled: !1,
            visible: k > 0
        });
    }
    function gb(a, r, s, u, d, m) {
        const h = [], v = new Set, [b, C, g, p, M, S] = m ?? [
            0,
            1,
            0,
            1,
            0,
            1
        ], T = C - b, j = p - g, F = S - M;
        for(let w = 0; w < a.natoms; w++){
            const x = a.positions[w * 3], D = a.positions[w * 3 + 1], k = a.positions[w * 3 + 2], E = a.types[w], z = r.query(x, D, k, s);
            for (const { index: G, dist: _ } of z){
                if (w >= G) continue;
                let O = s;
                if (u) {
                    const N = a.types[G], V = `${E}-${N}`, K = `${N}-${E}`;
                    O = u.get(V) ?? u.get(K) ?? s;
                }
                _ <= O && h.push([
                    w,
                    G
                ]);
            }
            if (d && m) {
                const G = [
                    [
                        T,
                        0,
                        0
                    ],
                    [
                        -T,
                        0,
                        0
                    ],
                    [
                        0,
                        j,
                        0
                    ],
                    [
                        0,
                        -j,
                        0
                    ],
                    [
                        0,
                        0,
                        F
                    ],
                    [
                        0,
                        0,
                        -F
                    ]
                ];
                for (const [_, O, N] of G){
                    const V = r.query(x + _, D + O, k + N, s);
                    for (const { index: K, dist: Q } of V){
                        if (Q > s) continue;
                        const Z = Math.min(w, K), J = Math.max(w, K), A = `${Z}-${J}`;
                        v.has(A) || (v.add(A), h.push([
                            w,
                            K
                        ]));
                    }
                }
            }
        }
        return h;
    }
    function yb(a, r) {
        const { frames: s, speed: u = 1, targetFPS: d = 60, loopMode: m = "loop", onFrame: h, onStats: v } = r, [b, C] = y.useState({
            frameIndex: 0,
            nextFrameIndex: 1,
            interpolationFactor: 0,
            isInterpolating: !1,
            effectiveFrame: 0
        }), g = y.useRef(void 0), p = y.useRef(void 0);
        y.useRef(0);
        const M = y.useRef(0), S = y.useRef(0), T = y.useRef(0), j = 1e3 / r.mdFrameRate, F = y.useCallback((k)=>{
            p.current === void 0 && (p.current = k);
            const E = k - p.current;
            p.current = k;
            const z = E * u / j;
            if (z > 0) {
                const G = performance.now();
                C((_)=>{
                    let O = _.effectiveFrame + z;
                    const N = s.length;
                    O >= N - 1 && (m === "loop" ? O = O % (N - 1) : O = N - 1);
                    const V = Math.floor(O), K = O - V, Q = Math.min(V + 1, N - 1), Z = {
                        frameIndex: V,
                        nextFrameIndex: Q,
                        interpolationFactor: K,
                        isInterpolating: K > 0 && K < 1,
                        effectiveFrame: O
                    };
                    return h(Z), Z;
                }), T.current += performance.now() - G, M.current++;
            }
            if (v && k - S.current >= 1e3) {
                const G = (k - S.current) / 1e3;
                v({
                    actualFPS: Math.round(M.current / G),
                    framesAdvanced: M.current,
                    interpolationTime: T.current
                }), M.current = 0, T.current = 0, S.current = k;
            }
            g.current = requestAnimationFrame(F);
        }, [
            s.length,
            u,
            d,
            m,
            h,
            v
        ]);
        y.useEffect(()=>{
            if (!a || s.length < 2) {
                g.current !== void 0 && (cancelAnimationFrame(g.current), g.current = void 0), p.current = void 0;
                return;
            }
            return g.current = requestAnimationFrame(F), ()=>{
                g.current !== void 0 && cancelAnimationFrame(g.current);
            };
        }, [
            a,
            s.length,
            F
        ]);
        const w = y.useCallback((k)=>{
            const E = Math.max(0, Math.min(s.length - 1, k));
            C({
                frameIndex: E,
                nextFrameIndex: Math.min(E + 1, s.length - 1),
                interpolationFactor: 0,
                isInterpolating: !1,
                effectiveFrame: E
            }), h({
                frameIndex: E,
                nextFrameIndex: Math.min(E + 1, s.length - 1),
                interpolationFactor: 0,
                isInterpolating: !1,
                effectiveFrame: E
            });
        }, [
            s.length,
            h
        ]), x = y.useCallback(()=>{
            C((k)=>{
                const E = Math.min(k.frameIndex + 1, s.length - 1), z = {
                    frameIndex: E,
                    nextFrameIndex: Math.min(E + 1, s.length - 1),
                    interpolationFactor: 0,
                    isInterpolating: !1,
                    effectiveFrame: E
                };
                return h(z), z;
            });
        }, [
            s.length,
            h
        ]), D = y.useCallback(()=>{
            C((k)=>{
                const E = Math.max(k.frameIndex - 1, 0), z = {
                    frameIndex: E,
                    nextFrameIndex: Math.min(E + 1, s.length - 1),
                    interpolationFactor: 0,
                    isInterpolating: !1,
                    effectiveFrame: E
                };
                return h(z), z;
            });
        }, [
            h
        ]);
        return {
            currentState: b,
            setFrame: w,
            nextFrame: x,
            prevFrame: D
        };
    }
    function xb({ bounds: a, color: r = "#1e2840", opacity: s = .4 }) {
        const u = y.useMemo(()=>{
            const [d, m, h, v, b, C] = a, g = m - d, p = v - h, M = C - b, S = (d + m) / 2, T = (h + v) / 2, j = (b + C) / 2, F = new Sh(g, p, M);
            return F.translate(S, T, j), new Ch(F);
        }, [
            a
        ]);
        return l.jsx("lineSegments", {
            geometry: u,
            children: l.jsx("lineBasicMaterial", {
                color: r,
                transparent: !0,
                opacity: s
            })
        });
    }
    const $d = [
        1,
        2,
        5,
        10,
        20,
        50,
        100,
        200,
        500,
        1e3
    ];
    function vb({ frame: a, cameraDistance: r, visible: s = !0, position: u = "bottom-left", color: d = "white" }) {
        const { length: m, label: h } = y.useMemo(()=>{
            const T = 2 * r * Math.tan(50 * Math.PI / 180 / 2) * .15;
            let j = $d[0];
            for (const w of $d)if (w <= T) j = w;
            else break;
            let F;
            return j >= 1e3 ? F = `${(j / 1e3).toFixed(1)} nm` : j >= 10 ? F = `${j} Å` : F = `${j} Å`, {
                length: j,
                label: F
            };
        }, [
            r
        ]);
        if (!s) return null;
        const v = {
            "bottom-left": {
                left: 24,
                bottom: 24
            },
            "bottom-right": {
                right: 24,
                bottom: 24
            },
            "top-left": {
                left: 24,
                top: 24
            },
            "top-right": {
                right: 24,
                top: 24
            }
        }, b = 4, C = 12, p = Math.max(60, m * 5);
        return l.jsxs("div", {
            style: {
                position: "absolute",
                ...v[u],
                display: "flex",
                flexDirection: "column",
                alignItems: u.includes("right") ? "flex-end" : "flex-start",
                gap: 4,
                pointerEvents: "none",
                zIndex: 50
            },
            children: [
                l.jsx("div", {
                    style: {
                        width: p,
                        height: b,
                        background: d,
                        borderRadius: 2,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.5)"
                    }
                }),
                l.jsx("span", {
                    style: {
                        fontSize: C,
                        fontWeight: 600,
                        color: d,
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        letterSpacing: "0.02em"
                    },
                    children: h
                })
            ]
        });
    }
    function Sb({ frame: a, spatialHash: r, enabled: s = !0, radius: u = 2, onHover: d, onClick: m, onSelect: h, selectionMode: v = "single" }) {
        const { camera: b, size: C, scene: g, raycaster: p } = ze(), M = y.useRef(new ss), S = y.useRef(new us), [T, j] = y.useState(null), [F, w] = y.useState(new Set), x = y.useRef([]), D = y.useRef(null), k = y.useCallback((_, O)=>{
            S.current.x = _ / C.width * 2 - 1, S.current.y = -(O / C.height) * 2 + 1, M.current.setFromCamera(S.current, b);
            const N = M.current.ray, V = .5, K = 1e3;
            for(let Q = 0; Q < K; Q += V){
                const Z = N.at(Q, new Ae), J = r.query(Z.x, Z.y, Z.z, u);
                if (J.length > 0) {
                    let A = null;
                    for (const { index: oe, dist: fe } of J){
                        const X = a.positions[oe * 3], ne = a.positions[oe * 3 + 1], re = a.positions[oe * 3 + 2], ae = new Ae(X, ne, re);
                        ae.project(b), Math.hypot(ae.x - S.current.x, ae.y - S.current.y) < .05 && (!A || fe < A.dist) && (A = {
                            index: oe,
                            dist: fe
                        });
                    }
                    if (A) return {
                        index: A.index,
                        distance: A.dist,
                        worldPosition: new Ae(a.positions[A.index * 3], a.positions[A.index * 3 + 1], a.positions[A.index * 3 + 2])
                    };
                }
            }
            return null;
        }, [
            b,
            a.positions,
            u,
            C,
            r
        ]), E = y.useCallback((_)=>{
            if (!s) return;
            const O = k(_.clientX, _.clientY);
            if (O?.index !== T) if (j(O?.index ?? null), d?.(O?.index ?? null), D.current && O) {
                D.current.position.copy(O.worldPosition), D.current.visible = !0;
                const N = a.types[O.index], V = [
                    1.28,
                    .73,
                    1.6,
                    1.44
                ][N - 1] ?? 1.2;
                D.current.scale.setScalar(V * 1.2);
            } else D.current && (D.current.visible = !1);
        }, [
            s,
            T,
            d,
            k,
            a.types
        ]), z = y.useCallback((_)=>{
            if (!s || !(_.target instanceof HTMLCanvasElement)) return;
            const N = k(_.clientX, _.clientY)?.index ?? null;
            m?.(N), N !== null ? w((V)=>{
                const K = new Set(V);
                switch(v){
                    case "single":
                        K.clear(), K.add(N);
                        break;
                    case "add":
                        K.add(N);
                        break;
                    case "remove":
                        K.delete(N);
                        break;
                    case "measure":
                        return x.current.push(N), x.current.length > 4 && x.current.shift(), h?.(x.current), new Set(x.current);
                }
                return h?.(Array.from(K)), K;
            }) : (v === "single" || v === "measure") && (w(new Set), x.current = [], h?.([]));
        }, [
            s,
            m,
            h,
            k,
            v
        ]), G = y.useCallback((_)=>{
            _.key === "Escape" && (w(new Set), x.current = [], h?.([])), _.key === "m" && !_.metaKey && !_.ctrlKey && (x.current = []);
        }, [
            h
        ]);
        return y.useEffect(()=>{
            if (s) return window.addEventListener("mousemove", E), window.addEventListener("click", z), window.addEventListener("keydown", G), ()=>{
                window.removeEventListener("mousemove", E), window.removeEventListener("click", z), window.removeEventListener("keydown", G);
            };
        }, [
            s,
            E,
            z,
            G
        ]), l.jsxs(l.Fragment, {
            children: [
                l.jsxs("mesh", {
                    ref: D,
                    visible: !1,
                    children: [
                        l.jsx("sphereGeometry", {
                            args: [
                                1,
                                16,
                                12
                            ]
                        }),
                        l.jsx("meshBasicMaterial", {
                            color: "#00c8f0",
                            transparent: !0,
                            opacity: .3,
                            depthTest: !1
                        })
                    ]
                }),
                Array.from(F).map((_)=>l.jsx(Cb, {
                        position: [
                            a.positions[_ * 3],
                            a.positions[_ * 3 + 1],
                            a.positions[_ * 3 + 2]
                        ],
                        index: _
                    }, _))
            ]
        });
    }
    function Cb({ position: a, index: r }) {
        return l.jsxs("mesh", {
            position: a,
            children: [
                l.jsx("sphereGeometry", {
                    args: [
                        1.3,
                        16,
                        12
                    ]
                }),
                l.jsx("meshBasicMaterial", {
                    color: "#00c8f0",
                    transparent: !0,
                    opacity: .15,
                    depthTest: !1
                }),
                l.jsxs("mesh", {
                    scale: 1.4,
                    children: [
                        l.jsx("ringGeometry", {
                            args: [
                                .9,
                                1,
                                32
                            ]
                        }),
                        l.jsx("meshBasicMaterial", {
                            color: "#00c8f0",
                            transparent: !0,
                            opacity: .8,
                            side: jh,
                            depthTest: !1
                        })
                    ]
                }),
                l.jsx("sprite", {
                    position: [
                        0,
                        2,
                        0
                    ],
                    children: l.jsx("spriteMaterial", {
                        attach: "material",
                        transparent: !0,
                        opacity: .9,
                        children: l.jsx("canvasTexture", {
                            attach: "map",
                            args: [
                                jb(`#${r + 1}`)
                            ]
                        })
                    })
                })
            ]
        });
    }
    function jb(a) {
        const r = document.createElement("canvas");
        r.width = 64, r.height = 32;
        const s = r.getContext("2d");
        return s.fillStyle = "rgba(0, 0, 0, 0.7)", s.fillRect(0, 0, 64, 32), s.font = "bold 14px monospace", s.fillStyle = "#00c8f0", s.textAlign = "center", s.textBaseline = "middle", s.fillText(a, 32, 16), r;
    }
    const Yn = ({ children: a, level: r = 1, interactive: s = !1, flush: u = !1, className: d = "", ...m })=>{
        const h = [
            "lupine-glass",
            `lupine-glass--${r}`,
            s && "lupine-glass--interactive",
            u && "lupine-glass--flush",
            d
        ].filter(Boolean).join(" ");
        return l.jsxs("div", {
            className: h,
            ...m,
            children: [
                l.jsx("div", {
                    className: "lupine-glass__edge",
                    "aria-hidden": "true"
                }),
                r >= 2 && l.jsx("div", {
                    className: "lupine-glass__grain",
                    "aria-hidden": "true"
                }),
                l.jsx("div", {
                    className: u ? "lupine-glass__content--flush" : "lupine-glass__content",
                    children: a
                })
            ]
        });
    }, Ai = ({ label: a, active: r, onClick: s, hint: u })=>l.jsxs("button", {
            className: `orbital ${r ? "orbital--active" : ""}`,
            onClick: s,
            type: "button",
            role: "switch",
            "aria-checked": r,
            children: [
                l.jsxs("div", {
                    className: "orbital__text",
                    children: [
                        l.jsx("span", {
                            className: "orbital__label",
                            children: a
                        }),
                        u && l.jsx("span", {
                            className: "orbital__hint",
                            children: u
                        })
                    ]
                }),
                l.jsxs("div", {
                    className: "orbital__indicator",
                    children: [
                        l.jsx("div", {
                            className: "orbital__nucleus"
                        }),
                        l.jsx("svg", {
                            className: "orbital__ring",
                            viewBox: "0 0 32 32",
                            "aria-hidden": "true",
                            children: l.jsx("ellipse", {
                                cx: "16",
                                cy: "16",
                                rx: "13",
                                ry: "5",
                                className: "orbital__path"
                            })
                        }),
                        l.jsx("svg", {
                            className: "orbital__ring orbital__ring--secondary",
                            viewBox: "0 0 32 32",
                            "aria-hidden": "true",
                            children: l.jsx("ellipse", {
                                cx: "16",
                                cy: "16",
                                rx: "13",
                                ry: "5",
                                className: "orbital__path"
                            })
                        }),
                        l.jsx("div", {
                            className: "orbital__electron"
                        })
                    ]
                })
            ]
        }), Gd = ({ children: a, columns: r = 3, gap: s = 12 })=>{
        const u = y.useRef(null), [d, m] = y.useState([]), [h, v] = y.useState({
            w: 0,
            h: 0
        }), b = y.useCallback(()=>{
            const C = u.current;
            if (!C) return;
            const g = C.querySelectorAll(".covalent__node");
            if (g.length === 0) return;
            const p = C.getBoundingClientRect();
            v({
                w: p.width,
                h: p.height
            });
            const M = [];
            g.forEach((S, T)=>{
                const j = S.getBoundingClientRect(), F = j.left + j.width / 2 - p.left, w = j.top + j.height / 2 - p.top;
                if ((T + 1) % r !== 0 && T + 1 < g.length) {
                    const x = g[T + 1].getBoundingClientRect();
                    x.left + x.width / 2 - p.left;
                    const D = x.top + x.height / 2 - p.top;
                    M.push({
                        x1: j.right - p.left,
                        y1: w,
                        x2: x.left - p.left,
                        y2: D
                    });
                }
                if (T + r < g.length) {
                    const x = g[T + r].getBoundingClientRect(), D = x.left + x.width / 2 - p.left;
                    M.push({
                        x1: F,
                        y1: j.bottom - p.top,
                        x2: D,
                        y2: x.top - p.top
                    });
                }
            }), m(M);
        }, [
            r
        ]);
        return y.useEffect(()=>{
            b();
            const C = new ResizeObserver(b);
            return u.current && C.observe(u.current), ()=>C.disconnect();
        }, [
            b,
            a
        ]), l.jsxs("div", {
            className: "covalent",
            ref: u,
            children: [
                d.length > 0 && l.jsx("svg", {
                    className: "covalent__bonds",
                    width: h.w,
                    height: h.h,
                    viewBox: `0 0 ${h.w} ${h.h}`,
                    "aria-hidden": "true",
                    children: d.map((C, g)=>l.jsx("line", {
                            x1: C.x1,
                            y1: C.y1,
                            x2: C.x2,
                            y2: C.y2,
                            className: "covalent__line"
                        }, g))
                }),
                l.jsx("div", {
                    className: "covalent__grid",
                    style: {
                        gridTemplateColumns: `repeat(${r}, 1fr)`,
                        gap: `${s}px`
                    },
                    children: y.Children.map(a, (C)=>l.jsx("div", {
                            className: "covalent__node",
                            children: C
                        }))
                })
            ]
        });
    }, Jn = ({ label: a, value: r, min: s, max: u, step: d, format: m, onChange: h, unit: v })=>{
        const b = (r - s) / (u - s) * 100, C = m ? m(r) : `${r}`;
        return l.jsxs("div", {
            className: "waveform",
            children: [
                l.jsxs("div", {
                    className: "waveform__header",
                    children: [
                        l.jsx("span", {
                            className: "waveform__label",
                            children: a
                        }),
                        l.jsxs("span", {
                            className: "waveform__readout",
                            children: [
                                C,
                                v && l.jsx("span", {
                                    className: "waveform__unit",
                                    children: v
                                })
                            ]
                        })
                    ]
                }),
                l.jsxs("div", {
                    className: "waveform__track-container",
                    children: [
                        l.jsx("div", {
                            className: "waveform__fill",
                            style: {
                                width: `${b}%`
                            }
                        }),
                        l.jsx("input", {
                            className: "waveform__input",
                            type: "range",
                            min: s,
                            max: u,
                            step: d,
                            value: r,
                            onChange: (g)=>h(+g.target.value)
                        })
                    ]
                })
            ]
        });
    }, bt = ({ label: a, children: r, defaultOpen: s = !0, accent: u, action: d })=>{
        const [m, h] = y.useState(s), v = y.useRef(null), [b, C] = y.useState("auto");
        return y.useEffect(()=>{
            v.current && C(m ? v.current.scrollHeight : 0);
        }, [
            m,
            r
        ]), l.jsxs("div", {
            className: `qsection ${m ? "qsection--open" : ""}`,
            children: [
                l.jsxs("button", {
                    className: "qsection__header",
                    onClick: ()=>h(!m),
                    type: "button",
                    children: [
                        l.jsxs("div", {
                            className: "qsection__label-row",
                            children: [
                                l.jsx("div", {
                                    className: "qsection__dot",
                                    style: u ? {
                                        background: u
                                    } : void 0
                                }),
                                l.jsx("span", {
                                    className: "qsection__label",
                                    children: a
                                })
                            ]
                        }),
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 12
                            },
                            children: [
                                d && l.jsx("div", {
                                    onClick: (g)=>g.stopPropagation(),
                                    children: d
                                }),
                                l.jsx("svg", {
                                    className: "qsection__chevron",
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    strokeWidth: "2",
                                    strokeLinecap: "round",
                                    strokeLinejoin: "round",
                                    children: l.jsx("polyline", {
                                        points: "6 9 12 15 18 9"
                                    })
                                })
                            ]
                        })
                    ]
                }),
                l.jsx("div", {
                    className: "qsection__body",
                    style: {
                        maxHeight: typeof b == "number" ? `${b}px` : void 0
                    },
                    children: l.jsx("div", {
                        className: "qsection__content",
                        ref: v,
                        children: r
                    })
                })
            ]
        });
    }, eo = ({ label: a, number: r, selected: s = !1, onClick: u, tag: d })=>l.jsxs("button", {
            className: `isotope ${s ? "isotope--selected" : ""}`,
            onClick: u,
            type: "button",
            children: [
                r !== void 0 && l.jsx("span", {
                    className: "isotope__number",
                    children: r
                }),
                l.jsx("span", {
                    className: "isotope__symbol",
                    children: a
                }),
                d && l.jsx("span", {
                    className: "isotope__tag",
                    children: d
                })
            ]
        }), wb = ()=>l.jsx("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M18 6L6 18M6 6l12 12"
            })
        }), kb = [
        {
            id: "viridis",
            label: "Viridis",
            gradient: "linear-gradient(90deg, #440154, #31688e, #35b779, #fde725)"
        },
        {
            id: "inferno",
            label: "Inferno",
            gradient: "linear-gradient(90deg, #000004, #6a176e, #e8461c, #fcffa4)"
        },
        {
            id: "coolwarm",
            label: "Coolwarm",
            gradient: "linear-gradient(90deg, #3b4cc0, #ddd, #b40426)"
        },
        {
            id: "plasma",
            label: "Plasma",
            gradient: "linear-gradient(90deg, #0d0887, #7e03a8, #cc4778, #f0f921)"
        },
        {
            id: "magma",
            label: "Magma",
            gradient: "linear-gradient(90deg, #000004, #6a176e, #de4968, #fcfdbf)"
        },
        {
            id: "cividis",
            label: "Cividis",
            gradient: "linear-gradient(90deg, #002051, #5d7a99, #cabb5b, #fde724)"
        },
        {
            id: "neon",
            label: "Neon",
            gradient: "linear-gradient(90deg, #00ff66, #00ccff, #9900ff, #ff0099)",
            tag: "NEW"
        },
        {
            id: "sunset",
            label: "Sunset",
            gradient: "linear-gradient(90deg, #1e004d, #cc2666, #ff8c26, #ffeb80)",
            tag: "NEW"
        },
        {
            id: "vaporwave",
            label: "Vaporwave",
            gradient: "linear-gradient(90deg, #0dd9d9, #8c4df2, #ff66b2, #ffd966)",
            tag: "NEW"
        }
    ];
    function Pb({ availableProperties: a, bgPresets: r }) {
        const { file: s, colorMode: u, colorProperty: d, colormap: m, atomScale: h, showCell: v, showAxes: b, showBonds: C, bondCutoff: g, backgroundPreset: p, setBackgroundPreset: M, backgroundStyle: S, setBackgroundStyle: T, setColorMode: j, setColorProperty: F, setColormap: w, setAtomScale: x, toggleCell: D, toggleAxes: k, toggleBonds: E, setBondCutoff: z, setRenderStyle: G } = $();
        return l.jsxs("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "var(--slate-900)",
                borderLeft: "1px solid var(--glass-border)",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.3), -2px 0 8px rgba(0,0,0,0.15)"
            },
            children: [
                l.jsxs("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--glass-border)",
                        background: "var(--glass-bg-2)",
                        flexShrink: 0
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 8
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 3,
                                        height: 14,
                                        borderRadius: 2,
                                        background: "linear-gradient(180deg, var(--lupine-400), var(--violet-500))"
                                    }
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 11,
                                        fontWeight: 700,
                                        fontFamily: "var(--font-mono)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.12em",
                                        color: "var(--lupine-300)"
                                    },
                                    children: "Style"
                                })
                            ]
                        }),
                        l.jsx("button", {
                            onClick: ()=>$.getState().setActivePanel(null),
                            className: "lupine-glass lupine-glass--1 lupine-glass--interactive",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 28,
                                height: 28,
                                background: "transparent",
                                border: "1px solid var(--glass-border)",
                                borderRadius: "var(--radius-xs)",
                                color: "var(--slate-500)",
                                cursor: "pointer"
                            },
                            children: l.jsx(wb, {})
                        })
                    ]
                }),
                l.jsx("div", {
                    className: "lupine-scroll",
                    style: {
                        flex: 1,
                        overflowY: "auto",
                        padding: "12px"
                    },
                    children: l.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 8
                        },
                        children: [
                            l.jsx(bt, {
                                label: "Quick Looks",
                                defaultOpen: !0,
                                children: l.jsxs(Gd, {
                                    columns: 2,
                                    gap: 8,
                                    children: [
                                        l.jsx(fr, {
                                            label: "Classic",
                                            onClick: ()=>{
                                                j("type"), w("viridis"), G("standard"), M("deep"), x(1);
                                            }
                                        }),
                                        l.jsx(fr, {
                                            label: "Neon",
                                            onClick: ()=>{
                                                j("type"), w("neon"), G("standard"), M("void"), x(1);
                                            }
                                        }),
                                        l.jsx(fr, {
                                            label: "Publication",
                                            onClick: ()=>{
                                                j("type"), w("coolwarm"), G("standard"), M("studio"), x(1);
                                            }
                                        }),
                                        l.jsx(fr, {
                                            label: "Minimal",
                                            onClick: ()=>{
                                                j("uniform"), w("viridis"), G("standard"), M("fog"), x(.9);
                                            }
                                        }),
                                        s?.name?.toLowerCase().includes("lupine") && l.jsx(fr, {
                                            label: "🌿 Botanical",
                                            onClick: ()=>{
                                                j("type"), w("viridis"), G("botanical"), M("studio"), x(1);
                                            }
                                        })
                                    ]
                                })
                            }),
                            l.jsxs(bt, {
                                label: "Color by",
                                defaultOpen: !0,
                                children: [
                                    l.jsx("div", {
                                        style: {
                                            display: "flex",
                                            gap: 4
                                        },
                                        children: [
                                            {
                                                id: "type",
                                                label: "Atom type"
                                            },
                                            {
                                                id: "property",
                                                label: "Property"
                                            },
                                            {
                                                id: "uniform",
                                                label: "Single"
                                            }
                                        ].map((_)=>l.jsx(eo, {
                                                label: _.label,
                                                selected: u === _.id,
                                                onClick: ()=>j(_.id)
                                            }, _.id))
                                    }),
                                    u === "property" && l.jsxs("div", {
                                        style: {
                                            marginTop: 10
                                        },
                                        children: [
                                            l.jsx("div", {
                                                style: {
                                                    fontSize: 10,
                                                    color: "var(--slate-500)",
                                                    fontFamily: "var(--font-mono)",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.08em",
                                                    marginBottom: 8
                                                },
                                                children: "Data Channel"
                                            }),
                                            l.jsx("div", {
                                                style: {
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: 6
                                                },
                                                children: a.length > 0 ? a.map((_, O)=>l.jsx(eo, {
                                                        label: _,
                                                        number: O + 1,
                                                        selected: d === _,
                                                        onClick: ()=>F(_)
                                                    }, _)) : l.jsx("div", {
                                                    style: {
                                                        fontSize: 11,
                                                        color: "var(--slate-600)",
                                                        fontStyle: "italic",
                                                        padding: "4px 0"
                                                    },
                                                    children: "No data channels in this file"
                                                })
                                            })
                                        ]
                                    })
                                ]
                            }),
                            l.jsx(bt, {
                                label: "Palette",
                                defaultOpen: !0,
                                children: l.jsx("div", {
                                    style: {
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: 6
                                    },
                                    children: kb.map((_, O)=>l.jsxs("button", {
                                            onClick: ()=>w(_.id),
                                            className: `isotope ${m === _.id ? "isotope--selected" : ""}`,
                                            style: {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                padding: "6px 10px",
                                                width: "100%",
                                                textAlign: "left"
                                            },
                                            children: [
                                                l.jsx("div", {
                                                    style: {
                                                        width: 24,
                                                        height: 24,
                                                        borderRadius: "var(--radius-xs)",
                                                        background: _.gradient,
                                                        flexShrink: 0,
                                                        border: "1px solid var(--glass-border-hi)"
                                                    }
                                                }),
                                                l.jsx("span", {
                                                    style: {
                                                        fontSize: 11,
                                                        fontWeight: m === _.id ? 600 : 400,
                                                        color: m === _.id ? "var(--slate-100)" : "var(--slate-400)",
                                                        fontFamily: "var(--font-sans)"
                                                    },
                                                    children: _.label
                                                }),
                                                _.tag && l.jsx("span", {
                                                    className: "isotope__tag",
                                                    children: _.tag
                                                })
                                            ]
                                        }, _.id))
                                })
                            }),
                            l.jsx(bt, {
                                label: "Atom Size",
                                defaultOpen: !0,
                                children: l.jsx(Jn, {
                                    label: "Scale factor",
                                    value: h,
                                    min: .1,
                                    max: 3,
                                    step: .05,
                                    format: (_)=>`${_.toFixed(2)}x`,
                                    onChange: x
                                })
                            }),
                            l.jsx(bt, {
                                label: "Show / Hide",
                                defaultOpen: !0,
                                children: l.jsxs("div", {
                                    style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 6
                                    },
                                    children: [
                                        l.jsx(Ai, {
                                            label: "Unit cell outline",
                                            active: v,
                                            onClick: D
                                        }),
                                        l.jsx(Ai, {
                                            label: "Crystallographic axes",
                                            active: b,
                                            onClick: k
                                        }),
                                        l.jsx(Ai, {
                                            label: "Interatomic bonds",
                                            active: C,
                                            onClick: E,
                                            hint: "covalent radii"
                                        }),
                                        C && l.jsx("div", {
                                            style: {
                                                paddingLeft: 16,
                                                paddingTop: 4
                                            },
                                            children: l.jsx(Jn, {
                                                label: "Bond cutoff",
                                                value: g,
                                                min: .5,
                                                max: 5,
                                                step: .1,
                                                format: (_)=>_.toFixed(1),
                                                unit: "Å",
                                                onChange: z
                                            })
                                        })
                                    ]
                                })
                            }),
                            l.jsxs(bt, {
                                label: "Background",
                                defaultOpen: !1,
                                children: [
                                    l.jsx("div", {
                                        style: {
                                            display: "flex",
                                            gap: 4,
                                            marginBottom: 12
                                        },
                                        children: [
                                            {
                                                id: "linear",
                                                label: "Linear"
                                            },
                                            {
                                                id: "radial",
                                                label: "Radial"
                                            },
                                            {
                                                id: "spotlight",
                                                label: "Spotlight"
                                            }
                                        ].map((_)=>l.jsx(eo, {
                                                label: _.label,
                                                selected: S === _.id,
                                                onClick: ()=>T(_.id)
                                            }, _.id))
                                    }),
                                    l.jsx(Gd, {
                                        columns: 2,
                                        gap: 8,
                                        children: Object.entries(r).map(([_, O])=>l.jsx(Yn, {
                                                level: 1,
                                                interactive: !0,
                                                flush: !0,
                                                onClick: ()=>M(_),
                                                style: {
                                                    borderColor: p === _ ? "rgba(85, 101, 212, 0.4)" : void 0,
                                                    boxShadow: p === _ ? "0 0 12px rgba(85, 101, 212, 0.15)" : void 0
                                                },
                                                children: l.jsx("div", {
                                                    style: {
                                                        padding: "16px 0",
                                                        background: `linear-gradient(180deg, ${O.top}, ${O.bottom})`,
                                                        borderRadius: "var(--radius-sm)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center"
                                                    },
                                                    children: l.jsx("span", {
                                                        style: {
                                                            fontSize: 10,
                                                            fontWeight: 600,
                                                            fontFamily: "var(--font-mono)",
                                                            textTransform: "uppercase",
                                                            letterSpacing: "0.1em",
                                                            color: p === _ ? "var(--lupine-300)" : "rgba(255,255,255,0.5)"
                                                        },
                                                        children: O.label
                                                    })
                                                })
                                            }, _))
                                    })
                                ]
                            })
                        ]
                    })
                })
            ]
        });
    }
    function fr({ label: a, onClick: r }) {
        return l.jsx(Yn, {
            level: 1,
            interactive: !0,
            onClick: r,
            children: l.jsx("div", {
                style: {
                    textAlign: "center",
                    padding: "2px 0"
                },
                children: l.jsx("span", {
                    style: {
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: "var(--font-sans)",
                        color: "var(--slate-300)"
                    },
                    children: a
                })
            })
        });
    }
    const Mb = ()=>l.jsx("svg", {
            width: "15",
            height: "15",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            children: l.jsx("path", {
                d: "M18 6L6 18M6 6l12 12"
            })
        });
    function Fb() {
        const a = $;
        return y.useMemo(()=>[
                {
                    id: "publication",
                    label: "Publication",
                    description: "Clean SSAO + ACES filmic. No bloom. Optimized for journal-quality figure export with accurate depth cues.",
                    apply: ()=>{
                        const r = a.getState();
                        r.ssao || r.toggleSSAO(), r.setSSAOIntensity(.6), r.bloom && r.toggleBloom(), r.dof && r.toggleDOF(), r.setToneMapping("aces");
                    }
                },
                {
                    id: "presentation",
                    label: "Presentation",
                    description: 'Moderate bloom + strong SSAO. Atoms "glow" under ambient lighting for dark-background slides and posters.',
                    apply: ()=>{
                        const r = a.getState();
                        r.ssao || r.toggleSSAO(), r.setSSAOIntensity(.5), r.bloom || r.toggleBloom(), r.setBloomIntensity(.4), r.dof && r.toggleDOF(), r.setToneMapping("aces");
                    }
                },
                {
                    id: "cinematic",
                    label: "Cinematic",
                    description: "Full pipeline: SSAO + Bloom + DOF. Shallow focus isolates structural features while bloom enhances contrast.",
                    apply: ()=>{
                        const r = a.getState();
                        r.ssao || r.toggleSSAO(), r.setSSAOIntensity(.7), r.bloom || r.toggleBloom(), r.setBloomIntensity(.5), r.dof || r.toggleDOF(), r.setDOFFocus(50), r.setToneMapping("aces");
                    }
                },
                {
                    id: "raw",
                    label: "Raw Data",
                    description: "All post-processing disabled. Linear color space. Shows atoms as the renderer computes them — useful for debugging.",
                    apply: ()=>{
                        const r = a.getState();
                        r.ssao && r.toggleSSAO(), r.bloom && r.toggleBloom(), r.dof && r.toggleDOF(), r.setToneMapping("none");
                    }
                }
            ], []);
    }
    function Tb() {
        const { ssao: a, ssaoIntensity: r, bloom: s, bloomIntensity: u, dof: d, dofFocus: m, toneMapping: h, toggleSSAO: v, toggleBloom: b, toggleDOF: C, setSSAOIntensity: g, setBloomIntensity: p, setDOFFocus: M, setToneMapping: S, setActivePanel: T } = $(), j = $((k)=>k.file), F = $((k)=>k.frame), w = Fb(), x = y.useMemo(()=>{
            if (!j) return null;
            const k = j.trajectory.frames[F];
            if (!k) return null;
            const E = j.trajectory.globalBounds;
            let z, G, _;
            E && isFinite(E.min[0]) && isFinite(E.max[0]) ? (z = E.max[0] - E.min[0], G = E.max[1] - E.min[1], _ = E.max[2] - E.min[2]) : k.boxBounds && k.boxBounds[1] - k.boxBounds[0] > 0 ? (z = k.boxBounds[1] - k.boxBounds[0], G = k.boxBounds[3] - k.boxBounds[2], _ = k.boxBounds[5] - k.boxBounds[4]) : z = G = _ = 0;
            const O = Math.sqrt(z * z + G * G + _ * _), N = new Map;
            for(let Z = 0; Z < k.natoms; Z++){
                const J = k.types[Z];
                N.set(J, (N.get(J) ?? 0) + 1);
            }
            let V = 1, K = 0;
            N.forEach((Z, J)=>{
                Z > K && (K = Z, V = J);
            });
            const Q = Cr(V);
            return {
                natoms: k.natoms,
                diag: O > 0 ? O.toFixed(1) : "—",
                maxDim: Math.max(z, G, _) > 0 ? Math.max(z, G, _).toFixed(1) : "—",
                dominantElement: Q.symbol,
                dominantRadius: Q.radius,
                suggestedFocus: O > 0 ? Math.round(O * .5) : 50,
                suggestedSSAORadius: Math.min(.5, Q.radius * .4)
            };
        }, [
            j,
            F
        ]), D = [
            a,
            s,
            d,
            h !== "none"
        ].filter(Boolean).length;
        return l.jsxs("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "#0a0a0c",
                borderLeft: "1px solid #1f2937"
            },
            children: [
                l.jsxs("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid #1f2937",
                        background: "#121318",
                        flexShrink: 0
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 10
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 4,
                                        height: 14,
                                        background: "#1edce0"
                                    }
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 12,
                                        fontWeight: 700,
                                        fontFamily: "Space Grotesk, sans-serif",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.15em",
                                        color: "#e2e8f0"
                                    },
                                    children: "Rendering"
                                }),
                                D > 0 && l.jsxs("span", {
                                    style: {
                                        fontSize: 10,
                                        fontWeight: 600,
                                        fontFamily: "var(--font-mono)",
                                        color: "#0a0a0c",
                                        background: "#1edce0",
                                        padding: "1px 6px",
                                        marginLeft: 4
                                    },
                                    children: [
                                        D,
                                        " active"
                                    ]
                                })
                            ]
                        }),
                        l.jsx("button", {
                            onClick: ()=>T(null),
                            style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 24,
                                height: 24,
                                background: "transparent",
                                border: "1px solid #334155",
                                borderRadius: 0,
                                color: "#94a3b8",
                                cursor: "pointer"
                            },
                            onMouseEnter: (k)=>{
                                k.currentTarget.style.color = "#fff", k.currentTarget.style.borderColor = "#1edce0";
                            },
                            onMouseLeave: (k)=>{
                                k.currentTarget.style.color = "#94a3b8", k.currentTarget.style.borderColor = "#334155";
                            },
                            children: l.jsx(Mb, {})
                        })
                    ]
                }),
                l.jsx("div", {
                    className: "lupine-scroll",
                    style: {
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px"
                    },
                    children: l.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 12
                        },
                        children: [
                            l.jsx(mr, {
                                title: "RENDERING PRESETS",
                                children: l.jsx("div", {
                                    style: {
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: 6
                                    },
                                    children: w.map((k)=>l.jsxs("button", {
                                            onClick: k.apply,
                                            title: k.description,
                                            style: {
                                                padding: "10px 12px",
                                                background: "#121418",
                                                border: "1px solid #334155",
                                                borderRadius: 0,
                                                cursor: "pointer",
                                                textAlign: "left",
                                                transition: "border-color 150ms"
                                            },
                                            onMouseEnter: (E)=>E.currentTarget.style.borderColor = "#1edce0",
                                            onMouseLeave: (E)=>E.currentTarget.style.borderColor = "#334155",
                                            children: [
                                                l.jsx("div", {
                                                    style: {
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        fontFamily: "Space Grotesk, sans-serif",
                                                        color: "#f8fafc",
                                                        marginBottom: 4
                                                    },
                                                    children: k.label
                                                }),
                                                l.jsx("div", {
                                                    style: {
                                                        fontSize: 10,
                                                        color: "#64748b",
                                                        lineHeight: "1.4",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden"
                                                    },
                                                    children: k.description
                                                })
                                            ]
                                        }, k.id))
                                })
                            }),
                            l.jsxs(mr, {
                                title: "AMBIENT OCCLUSION",
                                children: [
                                    l.jsxs(ka, {
                                        children: [
                                            "Simulates soft shadows in crevices between closely-packed atoms. Essential for reading 3D structure from 2D projections.",
                                            x && l.jsxs("span", {
                                                style: {
                                                    color: "#0ea5e9"
                                                },
                                                children: [
                                                    " ",
                                                    "Recommended for ",
                                                    x.dominantElement,
                                                    "-dominant lattice (r",
                                                    l.jsx("sub", {
                                                        children: "cov"
                                                    }),
                                                    " = ",
                                                    x.dominantRadius,
                                                    "Å)."
                                                ]
                                            })
                                        ]
                                    }),
                                    l.jsx(Ri, {
                                        label: "Screen-Space AO",
                                        active: a,
                                        onToggle: v
                                    }),
                                    a && l.jsxs("div", {
                                        style: {
                                            marginTop: 8
                                        },
                                        children: [
                                            l.jsx(Jn, {
                                                label: "OCCLUSION INTENSITY",
                                                value: r,
                                                min: .1,
                                                max: 2,
                                                step: .05,
                                                format: (k)=>k.toFixed(2),
                                                onChange: g
                                            }),
                                            l.jsx("div", {
                                                style: {
                                                    fontSize: 9,
                                                    color: "#475569",
                                                    marginTop: 4,
                                                    fontFamily: "var(--font-mono)"
                                                },
                                                children: "Low (0.1–0.3): subtle depth · Med (0.4–0.8): structural clarity · High (1.0+): dramatic"
                                            })
                                        ]
                                    })
                                ]
                            }),
                            l.jsxs(mr, {
                                title: "EMISSION BLOOM",
                                children: [
                                    l.jsx(ka, {
                                        children: "Adds luminous halos around bright atoms. Useful for highlighting high-energy sites, emissive dopants, or atoms with extreme property values."
                                    }),
                                    l.jsx(Ri, {
                                        label: "Bloom Filter",
                                        active: s,
                                        onToggle: b
                                    }),
                                    s && l.jsxs("div", {
                                        style: {
                                            marginTop: 8
                                        },
                                        children: [
                                            l.jsx(Jn, {
                                                label: "BLOOM INTENSITY",
                                                value: u,
                                                min: .05,
                                                max: 1.5,
                                                step: .05,
                                                format: (k)=>k.toFixed(2),
                                                onChange: p
                                            }),
                                            l.jsxs("div", {
                                                style: {
                                                    fontSize: 9,
                                                    color: "#475569",
                                                    marginTop: 4,
                                                    fontFamily: "var(--font-mono)"
                                                },
                                                children: [
                                                    "<",
                                                    "0.3: publication safe · 0.3–0.7: presentation · ",
                                                    ">",
                                                    "0.7: cinematic"
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }),
                            l.jsxs(mr, {
                                title: "DEPTH OF FIELD",
                                children: [
                                    l.jsxs(ka, {
                                        children: [
                                            "Optical blur simulates focal depth to isolate crystallographic planes or surface features. Focus distance is measured from camera origin.",
                                            x && l.jsxs("span", {
                                                style: {
                                                    color: "#0ea5e9"
                                                },
                                                children: [
                                                    " ",
                                                    "System diagonal: ",
                                                    x.diag,
                                                    "Å — suggested focus: ~",
                                                    x.suggestedFocus,
                                                    "Å."
                                                ]
                                            })
                                        ]
                                    }),
                                    l.jsx(Ri, {
                                        label: "Depth Blur",
                                        active: d,
                                        onToggle: C
                                    }),
                                    d && l.jsx("div", {
                                        style: {
                                            marginTop: 8
                                        },
                                        children: l.jsx(Jn, {
                                            label: "FOCUS DISTANCE",
                                            value: m,
                                            min: 1,
                                            max: 200,
                                            step: 1,
                                            format: (k)=>`${k.toFixed(0)}Å`,
                                            onChange: M
                                        })
                                    })
                                ]
                            }),
                            l.jsxs(mr, {
                                title: "TONE MAPPING",
                                children: [
                                    l.jsx(ka, {
                                        children: "Controls how HDR radiance values are compressed to display range. ACES preserves highlight rolloff (recommended for figures). Reinhard maximizes brightness."
                                    }),
                                    l.jsx("div", {
                                        style: {
                                            display: "flex",
                                            gap: 6
                                        },
                                        children: [
                                            {
                                                id: "none",
                                                label: "Linear",
                                                desc: "Raw HDR values, no compression"
                                            },
                                            {
                                                id: "aces",
                                                label: "ACES Filmic",
                                                desc: "Academy standard, highlight rolloff"
                                            },
                                            {
                                                id: "reinhard",
                                                label: "Reinhard",
                                                desc: "Simple luminance mapping"
                                            }
                                        ].map((k)=>l.jsx("button", {
                                                onClick: ()=>S(k.id),
                                                title: k.desc,
                                                style: {
                                                    flex: 1,
                                                    padding: "8px 6px",
                                                    background: h === k.id ? "rgba(30, 220, 224, 0.1)" : "#121418",
                                                    border: `1px solid ${h === k.id ? "rgba(30, 220, 224, 0.4)" : "#334155"}`,
                                                    borderRadius: 0,
                                                    cursor: "pointer",
                                                    textAlign: "center",
                                                    transition: "all 150ms"
                                                },
                                                children: l.jsx("div", {
                                                    style: {
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        fontFamily: "Space Grotesk, sans-serif",
                                                        color: h === k.id ? "#1edce0" : "#94a3b8"
                                                    },
                                                    children: k.label
                                                })
                                            }, k.id))
                                    })
                                ]
                            }),
                            x && l.jsxs("div", {
                                style: {
                                    background: "#0d1117",
                                    border: "1px solid #1f2937",
                                    padding: "12px",
                                    marginTop: 4
                                },
                                children: [
                                    l.jsx("div", {
                                        style: {
                                            fontSize: 10,
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.08em",
                                            color: "#64748b",
                                            textTransform: "uppercase",
                                            marginBottom: 8
                                        },
                                        children: "SYSTEM CONTEXT"
                                    }),
                                    l.jsxs("div", {
                                        style: {
                                            display: "grid",
                                            gridTemplateColumns: "1fr 1fr",
                                            gap: 6,
                                            fontSize: 11,
                                            fontFamily: "var(--font-mono)"
                                        },
                                        children: [
                                            l.jsxs("div", {
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#64748b"
                                                        },
                                                        children: "Atoms: "
                                                    }),
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#f8fafc"
                                                        },
                                                        children: x.natoms.toLocaleString()
                                                    })
                                                ]
                                            }),
                                            l.jsxs("div", {
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#64748b"
                                                        },
                                                        children: "Diagonal: "
                                                    }),
                                                    l.jsxs("span", {
                                                        style: {
                                                            color: "#f8fafc"
                                                        },
                                                        children: [
                                                            x.diag,
                                                            "Å"
                                                        ]
                                                    })
                                                ]
                                            }),
                                            l.jsxs("div", {
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#64748b"
                                                        },
                                                        children: "Max Dim: "
                                                    }),
                                                    l.jsxs("span", {
                                                        style: {
                                                            color: "#f8fafc"
                                                        },
                                                        children: [
                                                            x.maxDim,
                                                            "Å"
                                                        ]
                                                    })
                                                ]
                                            }),
                                            l.jsxs("div", {
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#64748b"
                                                        },
                                                        children: "Primary: "
                                                    }),
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#1edce0"
                                                        },
                                                        children: x.dominantElement
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    l.jsx("div", {
                                        style: {
                                            fontSize: 9,
                                            color: "#475569",
                                            marginTop: 8,
                                            fontFamily: "var(--font-mono)",
                                            lineHeight: "1.4"
                                        },
                                        children: "These values are derived from the loaded trajectory and inform recommended effect parameters (e.g., DOF focus, AO radius scaling)."
                                    })
                                ]
                            })
                        ]
                    })
                })
            ]
        });
    }
    function mr({ title: a, children: r }) {
        return l.jsxs("div", {
            style: {
                background: "#0d1117",
                border: "1px solid #1f2937",
                padding: "16px"
            },
            children: [
                l.jsx("h3", {
                    style: {
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: "Space Grotesk, sans-serif",
                        letterSpacing: "0.05em",
                        color: "#e2e8f0",
                        textTransform: "uppercase",
                        margin: "0 0 12px 0"
                    },
                    children: a
                }),
                r
            ]
        });
    }
    function ka({ summary: a, children: r }) {
        const [s, u] = y.useState(!1);
        return l.jsxs("div", {
            style: {
                marginBottom: 12
            },
            children: [
                l.jsxs("button", {
                    onClick: ()=>u(!s),
                    style: {
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "#1edce0",
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                    },
                    children: [
                        l.jsx("svg", {
                            width: "10",
                            height: "10",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "2",
                            style: {
                                transform: s ? "rotate(90deg)" : "none",
                                transition: "transform 150ms"
                            },
                            children: l.jsx("path", {
                                d: "M9 18l6-6-6-6"
                            })
                        }),
                        s ? "Hide details" : a || "Show details"
                    ]
                }),
                s && l.jsx("div", {
                    style: {
                        marginTop: 8,
                        padding: "8px 10px",
                        background: "rgba(30, 220, 224, 0.05)",
                        borderLeft: "2px solid rgba(30, 220, 224, 0.3)",
                        fontSize: 12,
                        color: "#94a3b8",
                        lineHeight: "1.5",
                        fontFamily: "Space Grotesk, sans-serif"
                    },
                    children: r
                })
            ]
        });
    }
    function Ri({ label: a, active: r, onToggle: s }) {
        return l.jsxs("button", {
            onClick: s,
            style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 10px",
                background: r ? "rgba(30, 220, 224, 0.06)" : "#121418",
                border: `1px solid ${r ? "rgba(30, 220, 224, 0.25)" : "#334155"}`,
                borderRadius: 0,
                cursor: "pointer",
                transition: "all 150ms"
            },
            children: [
                l.jsx("span", {
                    style: {
                        fontSize: 12,
                        fontWeight: 500,
                        fontFamily: "Space Grotesk, sans-serif",
                        color: r ? "#e2e8f0" : "#94a3b8"
                    },
                    children: a
                }),
                l.jsx("div", {
                    style: {
                        width: 32,
                        height: 16,
                        background: r ? "#1edce0" : "#334155",
                        position: "relative",
                        transition: "background 200ms"
                    },
                    children: l.jsx("div", {
                        style: {
                            width: 12,
                            height: 12,
                            background: r ? "#0a0a0c" : "#64748b",
                            position: "absolute",
                            top: 2,
                            left: r ? 18 : 2,
                            transition: "left 200ms, background 200ms"
                        }
                    })
                })
            ]
        });
    }
    const Wd = [
        {
            id: "nature-1col",
            name: "Nature 1-col",
            desc: "89 mm, 300 DPI",
            width: 1051,
            height: 1051,
            dpi: 300
        },
        {
            id: "nature-2col",
            name: "Nature 2-col",
            desc: "183 mm, 300 DPI",
            width: 2163,
            height: 2163,
            dpi: 300
        },
        {
            id: "science-1col",
            name: "Science 1-col",
            desc: "58 mm, 300 DPI",
            width: 685,
            height: 685,
            dpi: 300
        },
        {
            id: "acs-full",
            name: "ACS Full Page",
            desc: "170 mm, 300 DPI",
            width: 2008,
            height: 2008,
            dpi: 300
        },
        {
            id: "slide-16-9",
            name: "Slide 16:9",
            desc: "1920×1080",
            width: 1920,
            height: 1080,
            dpi: 150
        },
        {
            id: "social-sq",
            name: "Social Square",
            desc: "1080×1080",
            width: 1080,
            height: 1080,
            dpi: 150
        }
    ], Ni = [
        {
            label: "720p",
            width: 1280,
            height: 720
        },
        {
            label: "1080p",
            width: 1920,
            height: 1080
        },
        {
            label: "2K",
            width: 2560,
            height: 1440
        },
        {
            label: "4K",
            width: 3840,
            height: 2160
        }
    ], Eb = [
        3,
        5,
        10,
        30,
        60,
        120
    ], zb = ()=>l.jsx("svg", {
            width: "15",
            height: "15",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            children: l.jsx("path", {
                d: "M18 6L6 18M6 6l12 12"
            })
        }), Ib = ()=>l.jsxs("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            strokeLinejoin: "miter",
            children: [
                l.jsx("path", {
                    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                }),
                l.jsx("polyline", {
                    points: "7 10 12 15 17 10"
                }),
                l.jsx("line", {
                    x1: "12",
                    y1: "15",
                    x2: "12",
                    y2: "3"
                })
            ]
        }), _b = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "#1edce0",
            strokeWidth: "2.5",
            strokeLinecap: "square",
            children: l.jsx("polyline", {
                points: "20 6 9 17 4 12"
            })
        }), Db = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "#ef4444",
            stroke: "none",
            children: l.jsx("circle", {
                cx: "12",
                cy: "12",
                r: "7"
            })
        });
    function Ab() {
        const { setActivePanel: a, file: r, frame: s, triggerExport: u } = $(), [d, m] = y.useState("figure"), [h, v] = y.useState(Wd[0]), [b, C] = y.useState("png"), [g, p] = y.useState(!1), [M, S] = y.useState(Ni[1]), [T, j] = y.useState(5), [F, w] = y.useState(!0), [x, D] = y.useState(!1), [k, E] = y.useState(!1), [z, G] = y.useState(!1), [_, O] = y.useState(0);
        y.useEffect(()=>{
            if (z) {
                const A = setTimeout(()=>G(!1), 4e3);
                return ()=>clearTimeout(A);
            }
        }, [
            z
        ]), y.useEffect(()=>{
            if (!k) {
                O(0);
                return;
            }
            const A = setInterval(()=>{
                O((oe)=>Math.min(oe + 100 / (T * 10), 99));
            }, 100);
            return ()=>clearInterval(A);
        }, [
            k,
            T
        ]);
        const N = y.useMemo(()=>{
            if (!r) return null;
            const A = r.trajectory.frames[s];
            if (!A) return null;
            const oe = new Map;
            for(let X = 0; X < A.natoms; X++){
                const ne = A.types[X];
                oe.set(ne, (oe.get(ne) ?? 0) + 1);
            }
            const fe = [];
            return oe.forEach((X, ne)=>{
                const re = Cr(ne);
                fe.push(`${re.symbol}${X > 1 ? X : ""}`);
            }), {
                formula: fe.join(""),
                natoms: A.natoms,
                totalFrames: r.trajectory.totalFrames
            };
        }, [
            r,
            s
        ]), V = y.useCallback((A)=>{
            E(!1), O(100), G(A !== !1);
        }, []), K = y.useCallback(()=>{
            E(!0), G(!1), $.getState().setShowScaleBar(!0), u({
                type: "image",
                resolution: {
                    width: h.width,
                    height: h.height
                },
                format: g ? "png" : b,
                transparent: g,
                baseName: `glimPSE-${h.id}`,
                onComplete: V
            });
        }, [
            h,
            b,
            g,
            u,
            V
        ]), Q = y.useCallback(async ()=>{
            E(!0), G(!1), u({
                type: "video",
                resolution: {
                    width: M.width,
                    height: M.height
                },
                format: d === "gif" ? "gif" : "mp4",
                orbit: F,
                cinematic: x,
                durationSeconds: T,
                baseName: `glimPSE-${d === "gif" ? "anim" : "orbit"}-${M.label}`,
                fileStream: void 0,
                onComplete: V
            });
        }, [
            d,
            M,
            F,
            x,
            T,
            u,
            V
        ]), Z = y.useMemo(()=>{
            if (d === "figure") return `~${(h.width * h.height * (b === "png" ? 2 : .3) / (1024 * 1024)).toFixed(1)} MB`;
            if (d === "mp4") return `~${(80 * T / 8).toFixed(0)} MB`;
            if (d === "gif") {
                const oe = 30 * T, fe = M.width * M.height;
                return `~${(oe * fe * .12 / (1024 * 1024)).toFixed(0)} MB`;
            }
            return "";
        }, [
            d,
            h,
            b,
            M,
            T
        ]), J = typeof globalThis.VideoEncoder < "u";
        return l.jsxs("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "#0a0a0c",
                borderLeft: "1px solid #1f2937"
            },
            children: [
                l.jsxs("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid #1f2937",
                        background: "#121318",
                        flexShrink: 0
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 10
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 4,
                                        height: 14,
                                        background: "#1edce0"
                                    }
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 12,
                                        fontWeight: 700,
                                        fontFamily: "Space Grotesk, sans-serif",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.15em",
                                        color: "#e2e8f0"
                                    },
                                    children: "Export"
                                })
                            ]
                        }),
                        l.jsx("button", {
                            onClick: ()=>a(null),
                            style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 24,
                                height: 24,
                                background: "transparent",
                                border: "1px solid #334155",
                                borderRadius: 0,
                                color: "#94a3b8",
                                cursor: "pointer"
                            },
                            children: l.jsx(zb, {})
                        })
                    ]
                }),
                l.jsx("div", {
                    style: {
                        display: "flex",
                        borderBottom: "1px solid #1f2937",
                        flexShrink: 0
                    },
                    children: [
                        {
                            id: "figure",
                            label: "FIGURE",
                            icon: "📷"
                        },
                        {
                            id: "mp4",
                            label: "MP4",
                            icon: "🎬"
                        },
                        {
                            id: "gif",
                            label: "GIF",
                            icon: "✨"
                        }
                    ].map((A)=>l.jsx("button", {
                            onClick: ()=>m(A.id),
                            style: {
                                flex: 1,
                                padding: "10px 0",
                                background: d === A.id ? "rgba(30, 220, 224, 0.06)" : "transparent",
                                border: "none",
                                borderBottom: d === A.id ? "2px solid #1edce0" : "2px solid transparent",
                                cursor: "pointer",
                                transition: "all 150ms"
                            },
                            children: l.jsx("div", {
                                style: {
                                    fontSize: 11,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    letterSpacing: "0.1em",
                                    color: d === A.id ? "#1edce0" : "#64748b"
                                },
                                children: A.label
                            })
                        }, A.id))
                }),
                l.jsx("div", {
                    className: "lupine-scroll",
                    style: {
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px"
                    },
                    children: l.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 12
                        },
                        children: [
                            d === "figure" && l.jsxs(l.Fragment, {
                                children: [
                                    l.jsx(fn, {
                                        title: "JOURNAL PRESET",
                                        children: l.jsx("div", {
                                            style: {
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: 6
                                            },
                                            children: Wd.map((A)=>l.jsxs("button", {
                                                    onClick: ()=>v(A),
                                                    style: {
                                                        padding: "10px",
                                                        background: h.id === A.id ? "rgba(30, 220, 224, 0.08)" : "#121418",
                                                        border: `1px solid ${h.id === A.id ? "rgba(30, 220, 224, 0.3)" : "#334155"}`,
                                                        borderRadius: 0,
                                                        cursor: "pointer",
                                                        textAlign: "left",
                                                        transition: "border-color 150ms"
                                                    },
                                                    children: [
                                                        l.jsx("div", {
                                                            style: {
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                                fontFamily: "Space Grotesk, sans-serif",
                                                                color: h.id === A.id ? "#1edce0" : "#e2e8f0"
                                                            },
                                                            children: A.name
                                                        }),
                                                        l.jsxs("div", {
                                                            style: {
                                                                fontSize: 9,
                                                                color: "#64748b",
                                                                fontFamily: "var(--font-mono)",
                                                                marginTop: 3
                                                            },
                                                            children: [
                                                                A.width,
                                                                "×",
                                                                A.height,
                                                                " · ",
                                                                A.desc
                                                            ]
                                                        })
                                                    ]
                                                }, A.id))
                                        })
                                    }),
                                    l.jsx(fn, {
                                        title: "FORMAT",
                                        children: l.jsx("div", {
                                            style: {
                                                display: "flex",
                                                gap: 6
                                            },
                                            children: [
                                                "png",
                                                "jpeg",
                                                "webp"
                                            ].map((A)=>l.jsx(pr, {
                                                    label: A.toUpperCase(),
                                                    active: b === A,
                                                    onClick: ()=>C(A)
                                                }, A))
                                        })
                                    }),
                                    l.jsx(fn, {
                                        title: "OPTIONS",
                                        children: l.jsx(hr, {
                                            label: "Transparent Background",
                                            hint: "Enable for slides, disable for journals",
                                            active: g,
                                            onToggle: ()=>p(!g)
                                        })
                                    }),
                                    l.jsxs(Bi, {
                                        children: [
                                            l.jsx(jt, {
                                                label: "Output",
                                                value: `${h.width}×${h.height}px`
                                            }),
                                            l.jsx(jt, {
                                                label: "DPI",
                                                value: `${h.dpi}`
                                            }),
                                            l.jsx(jt, {
                                                label: "Format",
                                                value: g ? "PNG (alpha)" : b.toUpperCase()
                                            }),
                                            l.jsx(jt, {
                                                label: "Est. Size",
                                                value: Z
                                            })
                                        ]
                                    }),
                                    l.jsx(Oi, {
                                        onClick: K,
                                        exporting: k,
                                        success: z,
                                        label: "Export Figure"
                                    })
                                ]
                            }),
                            d === "mp4" && l.jsxs(l.Fragment, {
                                children: [
                                    !J && l.jsx("div", {
                                        style: {
                                            padding: "10px 12px",
                                            background: "rgba(239, 68, 68, 0.1)",
                                            border: "1px solid rgba(239, 68, 68, 0.3)",
                                            fontSize: 11,
                                            color: "#fca5a5",
                                            fontFamily: "var(--font-mono)",
                                            lineHeight: "1.5"
                                        },
                                        children: "⚠ WebCodecs API not available in this browser. MP4 encoding requires Chrome 94+ or Edge 94+. Firefox/Safari lack support."
                                    }),
                                    l.jsx(fn, {
                                        title: "RESOLUTION",
                                        children: l.jsx("div", {
                                            style: {
                                                display: "flex",
                                                gap: 6,
                                                flexWrap: "wrap"
                                            },
                                            children: Ni.map((A)=>l.jsx(pr, {
                                                    label: `${A.label}`,
                                                    sublabel: `${A.width}×${A.height}`,
                                                    active: M.label === A.label,
                                                    onClick: ()=>S(A)
                                                }, A.label))
                                        })
                                    }),
                                    l.jsx(fn, {
                                        title: "DURATION",
                                        children: l.jsx("div", {
                                            style: {
                                                display: "flex",
                                                gap: 6
                                            },
                                            children: Eb.map((A)=>l.jsx(pr, {
                                                    label: `${A}s`,
                                                    active: T === A,
                                                    onClick: ()=>j(A)
                                                }, A))
                                        })
                                    }),
                                    l.jsxs(fn, {
                                        title: "CAMERA & ANIMATION",
                                        children: [
                                            l.jsx(hr, {
                                                label: "360° Orbit",
                                                hint: "Spin around structure centroid",
                                                active: F,
                                                onToggle: ()=>w(!F)
                                            }),
                                            l.jsx(hr, {
                                                label: "Cinematic Sequence",
                                                hint: "Dynamically animate structure properties",
                                                active: x,
                                                onToggle: ()=>D(!x)
                                            })
                                        ]
                                    }),
                                    l.jsxs(Bi, {
                                        children: [
                                            l.jsx(jt, {
                                                label: "Codec",
                                                value: "H.264 High (avc1.640028)"
                                            }),
                                            l.jsx(jt, {
                                                label: "Bitrate",
                                                value: "80 Mbps (HQ)"
                                            }),
                                            l.jsx(jt, {
                                                label: "FPS",
                                                value: "60"
                                            }),
                                            l.jsx(jt, {
                                                label: "Frames",
                                                value: `${60 * T}`
                                            }),
                                            l.jsx(jt, {
                                                label: "Est. Size",
                                                value: Z
                                            })
                                        ]
                                    }),
                                    l.jsx(Oi, {
                                        onClick: Q,
                                        exporting: k,
                                        success: z,
                                        label: "Record MP4",
                                        recordMode: !0,
                                        progress: _
                                    })
                                ]
                            }),
                            d === "gif" && l.jsxs(l.Fragment, {
                                children: [
                                    l.jsxs(fn, {
                                        title: "RESOLUTION",
                                        children: [
                                            l.jsx("div", {
                                                style: {
                                                    display: "flex",
                                                    gap: 6,
                                                    flexWrap: "wrap"
                                                },
                                                children: Ni.slice(0, 2).map((A)=>l.jsx(pr, {
                                                        label: A.label,
                                                        sublabel: `${A.width}×${A.height}`,
                                                        active: M.label === A.label,
                                                        onClick: ()=>S(A)
                                                    }, A.label))
                                            }),
                                            l.jsx("div", {
                                                style: {
                                                    fontSize: 9,
                                                    color: "#475569",
                                                    marginTop: 6,
                                                    fontFamily: "var(--font-mono)"
                                                },
                                                children: "GIF capped at 1080p to prevent memory exhaustion. Use MP4 for higher resolutions."
                                            })
                                        ]
                                    }),
                                    l.jsx(fn, {
                                        title: "DURATION",
                                        children: l.jsx("div", {
                                            style: {
                                                display: "flex",
                                                gap: 6
                                            },
                                            children: [
                                                3,
                                                5,
                                                8
                                            ].map((A)=>l.jsx(pr, {
                                                    label: `${A}s`,
                                                    active: T === A,
                                                    onClick: ()=>j(A)
                                                }, A))
                                        })
                                    }),
                                    l.jsxs(fn, {
                                        title: "CAMERA PATH",
                                        children: [
                                            l.jsx(hr, {
                                                label: "360° Orbit",
                                                hint: "Spin around structure centroid",
                                                active: F,
                                                onToggle: ()=>w(!F)
                                            }),
                                            l.jsx(hr, {
                                                label: "Cinematic Sequence",
                                                hint: "Dynamically animate structure properties",
                                                active: x,
                                                onToggle: ()=>D(!x)
                                            })
                                        ]
                                    }),
                                    l.jsxs(Bi, {
                                        children: [
                                            l.jsx(jt, {
                                                label: "Pipeline",
                                                value: "MP4 → GIF"
                                            }),
                                            l.jsx(jt, {
                                                label: "Palette",
                                                value: "256 colors (adaptive)"
                                            }),
                                            l.jsx(jt, {
                                                label: "FPS",
                                                value: "30"
                                            }),
                                            l.jsx(jt, {
                                                label: "Frames",
                                                value: `${30 * T}`
                                            }),
                                            l.jsx(jt, {
                                                label: "Est. Size",
                                                value: Z
                                            })
                                        ]
                                    }),
                                    l.jsx(Oi, {
                                        onClick: Q,
                                        exporting: k,
                                        success: z,
                                        label: "Record GIF",
                                        recordMode: !0,
                                        progress: _
                                    })
                                ]
                            }),
                            N && l.jsxs("div", {
                                style: {
                                    background: "#0d1117",
                                    border: "1px solid #1f2937",
                                    padding: "10px",
                                    marginTop: 4
                                },
                                children: [
                                    l.jsx("div", {
                                        style: {
                                            fontSize: 9,
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.08em",
                                            color: "#64748b",
                                            textTransform: "uppercase",
                                            marginBottom: 6
                                        },
                                        children: "LOADED STRUCTURE"
                                    }),
                                    l.jsxs("div", {
                                        style: {
                                            fontSize: 11,
                                            fontFamily: "var(--font-mono)",
                                            display: "flex",
                                            gap: 12
                                        },
                                        children: [
                                            l.jsxs("span", {
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#64748b"
                                                        },
                                                        children: "Formula: "
                                                    }),
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#1edce0"
                                                        },
                                                        children: N.formula
                                                    })
                                                ]
                                            }),
                                            l.jsxs("span", {
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#64748b"
                                                        },
                                                        children: "N: "
                                                    }),
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#f8fafc"
                                                        },
                                                        children: N.natoms.toLocaleString()
                                                    })
                                                ]
                                            }),
                                            l.jsxs("span", {
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#64748b"
                                                        },
                                                        children: "Frames: "
                                                    }),
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "#f8fafc"
                                                        },
                                                        children: N.totalFrames
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                })
            ]
        });
    }
    function fn({ title: a, children: r }) {
        return l.jsxs("div", {
            style: {
                background: "#0d1117",
                border: "1px solid #1f2937",
                padding: "12px"
            },
            children: [
                l.jsx("h3", {
                    style: {
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.1em",
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        margin: "0 0 10px 0"
                    },
                    children: a
                }),
                r
            ]
        });
    }
    function pr({ label: a, sublabel: r, active: s, onClick: u }) {
        return l.jsxs("button", {
            onClick: u,
            style: {
                padding: r ? "8px 12px" : "6px 14px",
                background: s ? "rgba(30, 220, 224, 0.1)" : "#121418",
                border: `1px solid ${s ? "rgba(30, 220, 224, 0.4)" : "#334155"}`,
                borderRadius: 0,
                cursor: "pointer",
                transition: "all 150ms"
            },
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "Space Grotesk, sans-serif",
                        color: s ? "#1edce0" : "#94a3b8"
                    },
                    children: a
                }),
                r && l.jsx("div", {
                    style: {
                        fontSize: 9,
                        color: "#475569",
                        fontFamily: "var(--font-mono)",
                        marginTop: 2
                    },
                    children: r
                })
            ]
        });
    }
    function hr({ label: a, hint: r, active: s, onToggle: u }) {
        return l.jsxs("button", {
            onClick: u,
            style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 10px",
                background: s ? "rgba(30, 220, 224, 0.06)" : "#121418",
                border: `1px solid ${s ? "rgba(30, 220, 224, 0.25)" : "#334155"}`,
                borderRadius: 0,
                cursor: "pointer",
                transition: "all 150ms"
            },
            children: [
                l.jsxs("div", {
                    children: [
                        l.jsx("div", {
                            style: {
                                fontSize: 12,
                                fontWeight: 500,
                                fontFamily: "Space Grotesk, sans-serif",
                                color: s ? "#e2e8f0" : "#94a3b8"
                            },
                            children: a
                        }),
                        r && l.jsx("div", {
                            style: {
                                fontSize: 9,
                                color: "#475569",
                                marginTop: 2
                            },
                            children: r
                        })
                    ]
                }),
                l.jsx("div", {
                    style: {
                        width: 32,
                        height: 16,
                        background: s ? "#1edce0" : "#334155",
                        position: "relative",
                        transition: "background 200ms"
                    },
                    children: l.jsx("div", {
                        style: {
                            width: 12,
                            height: 12,
                            background: s ? "#0a0a0c" : "#64748b",
                            position: "absolute",
                            top: 2,
                            left: s ? 18 : 2,
                            transition: "left 200ms, background 200ms"
                        }
                    })
                })
            ]
        });
    }
    function Bi({ children: a }) {
        return l.jsx("div", {
            style: {
                background: "#0d1117",
                border: "1px solid #1f2937",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: 4
            },
            children: a
        });
    }
    function jt({ label: a, value: r }) {
        return l.jsxs("div", {
            style: {
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: "var(--font-mono)"
            },
            children: [
                l.jsx("span", {
                    style: {
                        color: "#64748b"
                    },
                    children: a
                }),
                l.jsx("span", {
                    style: {
                        color: "#f8fafc"
                    },
                    children: r
                })
            ]
        });
    }
    function Oi({ onClick: a, exporting: r, success: s, label: u, recordMode: d, progress: m }) {
        return l.jsxs("button", {
            onClick: a,
            disabled: r,
            style: {
                width: "100%",
                padding: "12px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "Space Grotesk, sans-serif",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: r ? "not-allowed" : "pointer",
                color: s ? "#1edce0" : r ? "#94a3b8" : "#0a0a0c",
                background: s ? "rgba(30, 220, 224, 0.1)" : r ? "#1f2937" : "#1edce0",
                border: `1px solid ${s ? "rgba(30, 220, 224, 0.3)" : r ? "#334155" : "#1edce0"}`,
                borderRadius: 0,
                position: "relative",
                overflow: "hidden",
                transition: "all 200ms"
            },
            children: [
                r && d && l.jsx("div", {
                    style: {
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${m || 0}%`,
                        background: "rgba(30, 220, 224, 0.15)",
                        transition: "width 100ms linear"
                    }
                }),
                l.jsx("span", {
                    style: {
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                    },
                    children: s ? l.jsxs(l.Fragment, {
                        children: [
                            l.jsx(_b, {}),
                            " Saved"
                        ]
                    }) : r ? l.jsxs(l.Fragment, {
                        children: [
                            l.jsx(Db, {}),
                            " Recording... ",
                            d && m ? `${Math.round(m)}%` : ""
                        ]
                    }) : l.jsxs(l.Fragment, {
                        children: [
                            l.jsx(Ib, {}),
                            " ",
                            u
                        ]
                    })
                })
            ]
        });
    }
    const no = ()=>l.jsxs("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("line", {
                    x1: "18",
                    y1: "20",
                    x2: "18",
                    y2: "10"
                }),
                l.jsx("line", {
                    x1: "12",
                    y1: "20",
                    x2: "12",
                    y2: "4"
                }),
                l.jsx("line", {
                    x1: "6",
                    y1: "20",
                    x2: "6",
                    y2: "14"
                })
            ]
        });
    function Rb() {
        const { colorMode: a, colorProperty: r, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = a === "property" && r === "rdf_local_density";
        return l.jsxs(bt, {
            label: "Radial Distribution Function",
            defaultOpen: !0,
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 11,
                        color: "var(--slate-400)",
                        marginBottom: 12,
                        lineHeight: 1.5
                    },
                    children: "Compute RDF (g(r)) in real-time via WebGPU compute shaders."
                }),
                l.jsxs("button", {
                    onClick: ()=>{
                        m ? s("type") : (s("property"), u("rdf_local_density"), d("viridis"));
                    },
                    style: {
                        width: "100%",
                        padding: "10px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: m ? "var(--slate-900)" : "white",
                        background: m ? "var(--lupine-400)" : "transparent",
                        border: "1px solid var(--lupine-400)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    },
                    children: [
                        l.jsx(no, {}),
                        " ",
                        m ? "Hide Local Density" : "Compute RDF"
                    ]
                })
            ]
        });
    }
    function Nb() {
        const { colorMode: a, colorProperty: r, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = a === "property" && r === "msd_displacement";
        return l.jsxs(bt, {
            label: "Mean Squared Displacement",
            defaultOpen: !0,
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 11,
                        color: "var(--slate-400)",
                        marginBottom: 12,
                        lineHeight: 1.5
                    },
                    children: "Hardware-accelerated MSD calculation over all trajectory frames."
                }),
                l.jsxs("button", {
                    onClick: ()=>{
                        m ? s("type") : (s("property"), u("msd_displacement"), d("coolwarm"));
                    },
                    style: {
                        width: "100%",
                        padding: "10px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: m ? "var(--slate-900)" : "white",
                        background: m ? "var(--lupine-400)" : "transparent",
                        border: "1px solid var(--lupine-400)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    },
                    children: [
                        l.jsx(no, {}),
                        " ",
                        m ? "Hide MSD" : "Compute MSD"
                    ]
                })
            ]
        });
    }
    function Bb() {
        const { colorMode: a, colorProperty: r, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = a === "property" && r === "voronoi_coordination";
        return l.jsxs(bt, {
            label: "Voronoi Tessellation",
            defaultOpen: !0,
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 11,
                        color: "var(--slate-400)",
                        marginBottom: 12,
                        lineHeight: 1.5
                    },
                    children: "Calculate coordination numbers via 3D Voronoi cells."
                }),
                l.jsxs("button", {
                    onClick: ()=>{
                        m ? s("type") : (s("property"), u("voronoi_coordination"), d("viridis"));
                    },
                    style: {
                        width: "100%",
                        padding: "10px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: m ? "var(--slate-900)" : "white",
                        background: m ? "var(--lupine-400)" : "transparent",
                        border: "1px solid var(--lupine-400)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    },
                    children: [
                        l.jsx(no, {}),
                        " ",
                        m ? "Hide Voronoi" : "Run Voronoi"
                    ]
                })
            ]
        });
    }
    function Ob() {
        const { colorMode: a, colorProperty: r, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = a === "property" && r === "pdos_amplitude";
        return l.jsxs(bt, {
            label: "Phonon Spectrum & PDOS",
            defaultOpen: !0,
            accent: "#bf5cf0",
            action: l.jsx(eo, {
                label: "EXP",
                tag: "BETA"
            }),
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 11,
                        color: "var(--slate-400)",
                        marginBottom: 12,
                        lineHeight: 1.5
                    },
                    children: "Compute Phonon Density of States (PDOS) at rest to benchmark potential stability and identify imaginary modes."
                }),
                l.jsxs("button", {
                    onClick: ()=>{
                        m ? s("type") : (s("property"), u("pdos_amplitude"), d("plasma"));
                    },
                    style: {
                        width: "100%",
                        padding: "10px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: m ? "var(--slate-900)" : "white",
                        background: m ? "var(--lupine-400)" : "transparent",
                        border: "1px solid var(--lupine-400)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    },
                    children: [
                        l.jsx(no, {}),
                        " ",
                        m ? "Hide PDOS" : "Compute PDOS"
                    ]
                })
            ]
        });
    }
    function Lb() {
        const { colorMode: a, colorProperty: r, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = a === "property" && r === "glimmer_uq_std";
        return l.jsxs(bt, {
            label: "Multi-Fidelity UQ (GlimMER)",
            defaultOpen: !0,
            accent: "#bf5cf0",
            action: l.jsx(eo, {
                label: "EXP",
                tag: "BETA"
            }),
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 11,
                        color: "var(--slate-400)",
                        marginBottom: 12,
                        lineHeight: 1.5
                    },
                    children: "Perform PCA on prediction errors across potential models to correct ensemble bias dynamically over time-series trajectories."
                }),
                l.jsxs("button", {
                    onClick: ()=>{
                        m ? s("type") : (s("property"), u("glimmer_uq_std"), d("viridis"));
                    },
                    style: {
                        width: "100%",
                        padding: "10px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: m ? "var(--slate-900)" : "white",
                        background: m ? "var(--lupine-400)" : "transparent",
                        border: "1px solid var(--lupine-400)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    },
                    children: [
                        l.jsx(no, {}),
                        " ",
                        m ? "Hide UQ Mapping" : "Run glimMER PCA"
                    ]
                })
            ]
        });
    }
    function Ub() {
        const { colorMode: a, colorProperty: r, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = a === "property" && r === "gnn_topology_err";
        return l.jsxs(bt, {
            label: "GNN Error Prediction",
            defaultOpen: !0,
            accent: "#bf5cf0",
            action: l.jsx(eo, {
                label: "EXP",
                tag: "BETA"
            }),
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 11,
                        color: "var(--slate-400)",
                        marginBottom: 12,
                        lineHeight: 1.5
                    },
                    children: "Use Graph Neural Networks to map potential error landscapes from dynamic crystal topology at rest and under strain."
                }),
                l.jsxs("button", {
                    onClick: ()=>{
                        m ? s("type") : (s("property"), u("gnn_topology_err"), d("inferno"));
                    },
                    style: {
                        width: "100%",
                        padding: "10px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: m ? "var(--slate-900)" : "white",
                        background: m ? "var(--lupine-400)" : "transparent",
                        border: "1px solid var(--lupine-400)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    },
                    children: [
                        l.jsx(no, {}),
                        " ",
                        m ? "Hide Topology Error" : "Analyze Topology"
                    ]
                })
            ]
        });
    }
    function $b() {
        const { colorMode: a, colorProperty: r, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = a === "property" && r === "pca_drift_bias";
        return l.jsxs(bt, {
            label: "Sloppy Model Analysis",
            defaultOpen: !0,
            accent: "#bf5cf0",
            action: l.jsx(eo, {
                label: "EXP",
                tag: "BETA"
            }),
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 11,
                        color: "var(--slate-400)",
                        marginBottom: 12,
                        lineHeight: 1.5
                    },
                    children: "Calculate Fisher Information Matrix (FIM) eigenvalues to identify stiff and sloppy parameter directions."
                }),
                l.jsxs("button", {
                    onClick: ()=>{
                        m ? s("type") : (s("property"), u("pca_drift_bias"), d("magma"));
                    },
                    style: {
                        width: "100%",
                        padding: "10px 0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        color: m ? "var(--slate-900)" : "white",
                        background: m ? "var(--lupine-400)" : "transparent",
                        border: "1px solid var(--lupine-400)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    },
                    children: [
                        l.jsx(no, {}),
                        " ",
                        m ? "Hide Drift Bias" : "Compute FIM"
                    ]
                })
            ]
        });
    }
    const Gb = ()=>l.jsx("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M18 6L6 18M6 6l12 12"
            })
        });
    function Wb() {
        const { setActivePanel: a } = $();
        return l.jsxs("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "var(--slate-900)",
                borderLeft: "1px solid var(--glass-border)",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.3)"
            },
            children: [
                l.jsxs("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--glass-border)",
                        background: "var(--glass-bg-2)",
                        flexShrink: 0
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 8
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 3,
                                        height: 14,
                                        borderRadius: 2,
                                        background: "linear-gradient(180deg, var(--lupine-400), var(--violet-500))"
                                    }
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 11,
                                        fontWeight: 700,
                                        fontFamily: "var(--font-mono)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.12em",
                                        color: "var(--lupine-300)"
                                    },
                                    children: "Analysis"
                                })
                            ]
                        }),
                        l.jsx("button", {
                            onClick: ()=>a(null),
                            className: "lupine-glass lupine-glass--1 lupine-glass--interactive",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 28,
                                height: 28,
                                background: "transparent",
                                border: "1px solid var(--glass-border)",
                                borderRadius: "var(--radius-xs)",
                                color: "var(--slate-500)",
                                cursor: "pointer"
                            },
                            children: l.jsx(Gb, {})
                        })
                    ]
                }),
                l.jsx("div", {
                    className: "lupine-scroll",
                    style: {
                        flex: 1,
                        overflowY: "auto",
                        padding: "12px"
                    },
                    children: l.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 8
                        },
                        children: [
                            l.jsx(Rb, {}),
                            l.jsx(Nb, {}),
                            l.jsx(Bb, {}),
                            l.jsx(Ob, {}),
                            l.jsx(Lb, {}),
                            l.jsx(Ub, {}),
                            l.jsx($b, {}),
                            l.jsx(Yn, {
                                level: 1,
                                flush: !0,
                                style: {
                                    marginTop: 12,
                                    padding: "12px",
                                    borderStyle: "dashed"
                                },
                                children: l.jsxs("div", {
                                    style: {
                                        fontSize: 11,
                                        color: "var(--slate-400)",
                                        lineHeight: 1.5
                                    },
                                    children: [
                                        "These analysis kernels run as ",
                                        l.jsx("strong", {
                                            style: {
                                                color: "var(--slate-200)"
                                            },
                                            children: "WebGPU compute shaders"
                                        }),
                                        " directly on your local hardware, bypassing CPU bottlenecks."
                                    ]
                                })
                            })
                        ]
                    })
                })
            ]
        });
    }
    const Qd = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M18 6L6 18M6 6l12 12"
            })
        }), Qb = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
            })
        }), Vb = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
            })
        });
    function qb(a, r) {
        const s = a.x - r.x, u = a.y - r.y, d = a.z - r.z;
        return Math.sqrt(s * s + u * u + d * d);
    }
    function Hb(a, r, s) {
        const u = {
            x: a.x - r.x,
            y: a.y - r.y,
            z: a.z - r.z
        }, d = {
            x: s.x - r.x,
            y: s.y - r.y,
            z: s.z - r.z
        }, m = u.x * d.x + u.y * d.y + u.z * d.z, h = Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z), v = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
        if (h === 0 || v === 0) return 0;
        const b = m / (h * v);
        return Math.acos(Math.max(-1, Math.min(1, b))) * (180 / Math.PI);
    }
    function Kb(a, r, s, u) {
        const d = (j, F)=>({
                x: j.y * F.z - j.z * F.y,
                y: j.z * F.x - j.x * F.z,
                z: j.x * F.y - j.y * F.x
            }), m = (j, F)=>j.x * F.x + j.y * F.y + j.z * F.z, h = {
            x: a.x - r.x,
            y: a.y - r.y,
            z: a.z - r.z
        }, v = {
            x: s.x - r.x,
            y: s.y - r.y,
            z: s.z - r.z
        }, b = {
            x: u.x - s.x,
            y: u.y - s.y,
            z: u.z - s.z
        }, C = (j)=>{
            const F = Math.sqrt(j.x * j.x + j.y * j.y + j.z * j.z);
            return F > 0 ? {
                x: j.x / F,
                y: j.y / F,
                z: j.z / F
            } : j;
        }, g = C(d(h, v)), p = C(d(v, b)), M = d(g, C(v)), S = m(g, p), T = m(M, p);
        return Math.atan2(T, S) * (180 / Math.PI);
    }
    function Yb(a, r) {
        const s = a.ids?.[r] ?? r + 1, u = a.types[r], d = a.positions[r * 3], m = a.positions[r * 3 + 1], h = a.positions[r * 3 + 2], v = {};
        return a.properties?.forEach((b, C)=>{
            v[C] = b[r];
        }), {
            index: r,
            id: s,
            type: u,
            x: d,
            y: m,
            z: h,
            properties: v
        };
    }
    function Xb() {
        const { file: a, frame: r, selectedAtoms: s, setSelectedAtoms: u } = $(), [d, m] = y.useState([]), h = a?.trajectory.frames[r], v = {
            1: "Cu",
            2: "O",
            3: "Zr"
        }, b = y.useMemo(()=>h ? s.map((j)=>Yb(h, j)) : [], [
            h,
            s
        ]), C = y.useMemo(()=>{
            if (b.length < 2) return null;
            if (b.length === 2) {
                const [j, F] = b;
                return {
                    type: "distance",
                    value: qb(j, F),
                    unit: "Å",
                    description: `d(${j.id}-${F.id})`
                };
            }
            if (b.length === 3) {
                const [j, F, w] = b;
                return {
                    type: "angle",
                    value: Hb(j, F, w),
                    unit: "°",
                    description: `∠(${j.id}-${F.id}-${w.id})`
                };
            }
            if (b.length >= 4) {
                const [j, F, w, x] = b;
                return {
                    type: "dihedral",
                    value: Kb(j, F, w, x),
                    unit: "°",
                    description: `φ(${j.id}-${F.id}-${w.id}-${x.id})`
                };
            }
            return null;
        }, [
            b
        ]), g = y.useCallback(()=>{
            if (!C || s.length < 2) return;
            const j = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: C.type,
                atoms: [
                    ...s
                ],
                value: C.value,
                unit: C.unit,
                frame: r,
                timestamp: Date.now()
            };
            m((F)=>[
                    j,
                    ...F
                ]);
        }, [
            C,
            s,
            r
        ]), p = y.useCallback((j)=>{
            m((F)=>F.filter((w)=>w.id !== j));
        }, []), M = y.useCallback(()=>{
            m([]);
        }, []), S = y.useCallback(()=>{
            if (!h || d.length === 0) return;
            const j = [
                "Type",
                "Atoms",
                "Value",
                "Unit",
                "Frame",
                "Timestamp"
            ], F = d.map((E)=>[
                    E.type,
                    E.atoms.map((z)=>h.ids?.[z] ?? z + 1).join("-"),
                    E.value.toFixed(4),
                    E.unit,
                    E.frame + 1,
                    new Date(E.timestamp).toISOString()
                ]), w = [
                j.join(","),
                ...F.map((E)=>E.join(","))
            ].join(`
`), x = new Blob([
                w
            ], {
                type: "text/csv"
            }), D = URL.createObjectURL(x), k = document.createElement("a");
            k.href = D, k.download = `measurements-${a?.name ?? "data"}.csv`, k.click(), URL.revokeObjectURL(D);
        }, [
            d,
            h,
            a?.name
        ]), T = y.useCallback(()=>{
            u([]);
        }, [
            u
        ]);
        return h ? l.jsxs("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "var(--slate-900)",
                borderLeft: "1px solid var(--glass-border)",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.3), -2px 0 8px rgba(0,0,0,0.15)"
            },
            children: [
                l.jsxs("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--glass-border)",
                        background: "var(--glass-bg-2)",
                        flexShrink: 0
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 8
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 3,
                                        height: 14,
                                        borderRadius: 2,
                                        background: "linear-gradient(180deg, var(--lupine-400), var(--violet-500))"
                                    }
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 11,
                                        fontWeight: 700,
                                        fontFamily: "var(--font-mono)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.12em",
                                        color: "var(--lupine-300)"
                                    },
                                    children: "Measure"
                                })
                            ]
                        }),
                        l.jsx("button", {
                            onClick: ()=>$.getState().setActivePanel(null),
                            className: "lupine-glass lupine-glass--1 lupine-glass--interactive",
                            style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 28,
                                height: 28,
                                background: "transparent",
                                border: "1px solid var(--glass-border)",
                                borderRadius: "var(--radius-xs)",
                                color: "var(--slate-500)",
                                cursor: "pointer"
                            },
                            children: l.jsx(Qd, {})
                        })
                    ]
                }),
                l.jsx("div", {
                    className: "lupine-scroll",
                    style: {
                        flex: 1,
                        overflowY: "auto",
                        padding: "12px"
                    },
                    children: l.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 12
                        },
                        children: [
                            l.jsx(Yn, {
                                level: 1,
                                flush: !0,
                                style: {
                                    padding: "12px",
                                    borderStyle: "dashed"
                                },
                                children: l.jsxs("div", {
                                    style: {
                                        fontSize: 11,
                                        color: "var(--slate-400)",
                                        lineHeight: 1.5
                                    },
                                    children: [
                                        "Click atoms to measure. ",
                                        l.jsx("strong", {
                                            style: {
                                                color: "var(--slate-200)"
                                            },
                                            children: "2 atoms"
                                        }),
                                        " = distance, ",
                                        l.jsx("strong", {
                                            style: {
                                                color: "var(--slate-200)"
                                            },
                                            children: "3"
                                        }),
                                        " = angle, ",
                                        l.jsx("strong", {
                                            style: {
                                                color: "var(--slate-200)"
                                            },
                                            children: "4"
                                        }),
                                        " = dihedral. Press ",
                                        l.jsx("strong", {
                                            style: {
                                                color: "var(--slate-200)"
                                            },
                                            children: "Esc"
                                        }),
                                        " to clear."
                                    ]
                                })
                            }),
                            C && l.jsxs(Yn, {
                                level: 2,
                                style: {
                                    textAlign: "center",
                                    padding: "20px 16px",
                                    borderColor: "rgba(85, 101, 212, 0.4)"
                                },
                                children: [
                                    l.jsx("div", {
                                        style: {
                                            fontSize: 10,
                                            color: "var(--slate-400)",
                                            fontFamily: "var(--font-mono)",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.08em",
                                            marginBottom: 8
                                        },
                                        children: C.type
                                    }),
                                    l.jsxs("div", {
                                        style: {
                                            fontSize: 36,
                                            fontWeight: 700,
                                            color: "var(--lupine-300)",
                                            fontFamily: "var(--font-mono)"
                                        },
                                        children: [
                                            C.value.toFixed(3),
                                            l.jsx("span", {
                                                style: {
                                                    fontSize: 16,
                                                    marginLeft: 6,
                                                    color: "var(--slate-400)",
                                                    fontWeight: 400
                                                },
                                                children: C.unit
                                            })
                                        ]
                                    }),
                                    l.jsx("div", {
                                        style: {
                                            fontSize: 12,
                                            color: "var(--slate-400)",
                                            fontFamily: "var(--font-mono)",
                                            marginTop: 8
                                        },
                                        children: C.description
                                    }),
                                    l.jsx("button", {
                                        onClick: g,
                                        style: {
                                            marginTop: 16,
                                            padding: "8px 20px",
                                            background: "rgba(85, 101, 212, 0.15)",
                                            border: "1px solid rgba(85, 101, 212, 0.4)",
                                            borderRadius: "var(--radius-sm)",
                                            color: "var(--lupine-300)",
                                            fontSize: 11,
                                            fontFamily: "var(--font-mono)",
                                            textTransform: "uppercase",
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            transition: "all 0.2s",
                                            boxShadow: "inset 0 0 12px rgba(85, 101, 212, 0.1)"
                                        },
                                        children: "Save Result"
                                    })
                                ]
                            }),
                            l.jsxs(bt, {
                                label: `Picked Atoms (${s.length}/4)`,
                                defaultOpen: !0,
                                children: [
                                    l.jsx("div", {
                                        style: {
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6
                                        },
                                        children: b.length === 0 ? l.jsx("div", {
                                            style: {
                                                fontSize: 11,
                                                color: "var(--slate-500)",
                                                fontStyle: "italic",
                                                padding: "4px 0"
                                            },
                                            children: "No atoms selected yet"
                                        }) : b.map((j, F)=>l.jsxs(Yn, {
                                                level: 1,
                                                flush: !0,
                                                style: {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    padding: "8px 10px"
                                                },
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            width: 20,
                                                            height: 20,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            background: "var(--glass-bg-2)",
                                                            border: "1px solid var(--lupine-500)",
                                                            borderRadius: "50%",
                                                            color: "var(--lupine-300)",
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            fontFamily: "var(--font-mono)"
                                                        },
                                                        children: F + 1
                                                    }),
                                                    l.jsx("span", {
                                                        style: {
                                                            color: "var(--slate-100)",
                                                            fontWeight: 600,
                                                            fontSize: 12
                                                        },
                                                        children: v[j.type] ?? `Type ${j.type}`
                                                    }),
                                                    l.jsxs("span", {
                                                        style: {
                                                            color: "var(--slate-500)",
                                                            fontFamily: "var(--font-mono)",
                                                            fontSize: 11
                                                        },
                                                        children: [
                                                            "#",
                                                            j.id
                                                        ]
                                                    })
                                                ]
                                            }, j.index))
                                    }),
                                    s.length > 0 && l.jsx("button", {
                                        onClick: T,
                                        style: {
                                            marginTop: 10,
                                            fontSize: 10,
                                            padding: "4px 10px",
                                            fontFamily: "var(--font-mono)",
                                            textTransform: "uppercase",
                                            background: "transparent",
                                            border: "1px solid var(--glass-border)",
                                            borderRadius: "var(--radius-sm)",
                                            color: "var(--slate-400)",
                                            cursor: "pointer"
                                        },
                                        children: "Clear Selection"
                                    })
                                ]
                            }),
                            l.jsx(bt, {
                                label: `Saved Measurements (${d.length})`,
                                defaultOpen: !0,
                                action: d.length > 0 && l.jsxs("div", {
                                    style: {
                                        display: "flex",
                                        gap: 6
                                    },
                                    children: [
                                        l.jsx("button", {
                                            onClick: S,
                                            className: "lupine-glass--interactive",
                                            style: {
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 24,
                                                height: 24,
                                                background: "var(--glass-bg-1)",
                                                border: "1px solid var(--glass-border)",
                                                borderRadius: "var(--radius-sm)",
                                                color: "var(--slate-400)",
                                                cursor: "pointer"
                                            },
                                            title: "Download CSV",
                                            children: l.jsx(Qb, {})
                                        }),
                                        l.jsx("button", {
                                            onClick: M,
                                            className: "lupine-glass--interactive",
                                            style: {
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 24,
                                                height: 24,
                                                background: "var(--glass-bg-1)",
                                                border: "1px solid var(--glass-border)",
                                                borderRadius: "var(--radius-sm)",
                                                color: "var(--slate-400)",
                                                cursor: "pointer"
                                            },
                                            title: "Clear all",
                                            children: l.jsx(Vb, {})
                                        })
                                    ]
                                }),
                                children: d.length === 0 ? l.jsx("div", {
                                    style: {
                                        fontSize: 11,
                                        color: "var(--slate-500)",
                                        fontStyle: "italic",
                                        padding: "4px 0"
                                    },
                                    children: "No saved measurements"
                                }) : l.jsx("div", {
                                    style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8
                                    },
                                    children: d.map((j)=>l.jsxs(Yn, {
                                            level: 1,
                                            flush: !0,
                                            style: {
                                                padding: 12
                                            },
                                            children: [
                                                l.jsxs("div", {
                                                    style: {
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center"
                                                    },
                                                    children: [
                                                        l.jsx("span", {
                                                            style: {
                                                                fontSize: 10,
                                                                fontFamily: "var(--font-mono)",
                                                                textTransform: "uppercase",
                                                                color: "var(--lupine-400)",
                                                                letterSpacing: "0.04em",
                                                                fontWeight: 600
                                                            },
                                                            children: j.type
                                                        }),
                                                        l.jsx("button", {
                                                            onClick: ()=>p(j.id),
                                                            style: {
                                                                background: "transparent",
                                                                border: "none",
                                                                color: "var(--slate-500)",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center"
                                                            },
                                                            children: l.jsx(Qd, {})
                                                        })
                                                    ]
                                                }),
                                                l.jsxs("div", {
                                                    style: {
                                                        fontSize: 16,
                                                        fontWeight: 700,
                                                        fontFamily: "var(--font-mono)",
                                                        color: "var(--slate-100)",
                                                        marginTop: 4
                                                    },
                                                    children: [
                                                        j.value.toFixed(3),
                                                        " ",
                                                        l.jsx("span", {
                                                            style: {
                                                                fontSize: 12,
                                                                color: "var(--slate-500)",
                                                                fontWeight: 400
                                                            },
                                                            children: j.unit
                                                        })
                                                    ]
                                                }),
                                                l.jsxs("div", {
                                                    style: {
                                                        fontSize: 10,
                                                        fontFamily: "var(--font-mono)",
                                                        color: "var(--slate-500)",
                                                        marginTop: 4
                                                    },
                                                    children: [
                                                        "ATOMS ",
                                                        j.atoms.map((F)=>h?.ids?.[F] ?? F + 1).join("-"),
                                                        " · FRAME ",
                                                        j.frame + 1
                                                    ]
                                                })
                                            ]
                                        }, j.id))
                                })
                            })
                        ]
                    })
                })
            ]
        }) : l.jsxs("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "var(--slate-900)",
                borderLeft: "1px solid var(--glass-border)",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.3)"
            },
            children: [
                l.jsx("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 18px",
                        borderBottom: "1px solid var(--glass-border)",
                        background: "var(--glass-bg-2)"
                    },
                    children: l.jsx("div", {
                        style: {
                            display: "flex",
                            alignItems: "center",
                            gap: 8
                        },
                        children: l.jsx("span", {
                            style: {
                                fontSize: 11,
                                fontWeight: 700,
                                fontFamily: "var(--font-mono)",
                                textTransform: "uppercase",
                                letterSpacing: "0.12em",
                                color: "var(--lupine-300)"
                            },
                            children: "Measure"
                        })
                    })
                }),
                l.jsx("div", {
                    style: {
                        padding: "40px 20px",
                        textAlign: "center",
                        color: "var(--slate-500)",
                        fontSize: 12
                    },
                    children: "Load a file to start measuring"
                })
            ]
        });
    }
    const Zb = ()=>l.jsx("svg", {
            width: "15",
            height: "15",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            children: l.jsx("path", {
                d: "M18 6L6 18M6 6l12 12"
            })
        }), Jb = ()=>l.jsxs("svg", {
            width: "15",
            height: "15",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            strokeLinejoin: "miter",
            children: [
                l.jsx("path", {
                    d: "M2 12L12 4l10 8-10 8-10-8z"
                }),
                l.jsx("circle", {
                    cx: "12",
                    cy: "12",
                    r: "3"
                })
            ]
        }), eg = ()=>l.jsxs("svg", {
            width: "15",
            height: "15",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            strokeLinejoin: "miter",
            children: [
                l.jsx("path", {
                    d: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                }),
                l.jsx("line", {
                    x1: "1",
                    y1: "1",
                    x2: "23",
                    y2: "23"
                })
            ]
        }), tg = ()=>l.jsxs("svg", {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            children: [
                l.jsx("rect", {
                    x: "3",
                    y: "3",
                    width: "18",
                    height: "18"
                }),
                l.jsx("rect", {
                    x: "9",
                    y: "9",
                    width: "6",
                    height: "6"
                }),
                l.jsx("line", {
                    x1: "12",
                    y1: "0",
                    x2: "12",
                    y2: "3"
                }),
                l.jsx("line", {
                    x1: "12",
                    y1: "21",
                    x2: "12",
                    y2: "24"
                }),
                l.jsx("line", {
                    x1: "0",
                    y1: "12",
                    x2: "3",
                    y2: "12"
                }),
                l.jsx("line", {
                    x1: "21",
                    y1: "12",
                    x2: "24",
                    y2: "12"
                })
            ]
        });
    function ng() {
        const a = $((w)=>w.file), r = $((w)=>w.frame), s = $((w)=>w.hiddenAtomTypes), u = $((w)=>w.atomTypeScales), d = $((w)=>w.atomScale), { toggleAtomType: m, showAllAtomTypes: h, soloAtomType: v, setAtomTypeScale: b, resetAtomTypeScales: C, setAtomScale: g } = $(), p = a?.trajectory.frames[r], M = y.useMemo(()=>{
            if (!p) return [];
            const w = new Map;
            for(let x = 0; x < p.natoms; x++){
                const D = p.types[x];
                w.set(D, (w.get(D) ?? 0) + 1);
            }
            return Array.from(w.entries()).sort((x, D)=>x[0] - D[0]).map(([x, D])=>{
                const k = Cr(x);
                return {
                    type: x,
                    count: D,
                    pct: D / p.natoms * 100,
                    ...k
                };
            });
        }, [
            p
        ]), S = y.useMemo(()=>{
            if (!p?.boxBounds) return null;
            const w = p.boxBounds;
            return {
                x: (w[1] - w[0]).toFixed(3),
                y: (w[3] - w[2]).toFixed(3),
                z: (w[5] - w[4]).toFixed(3)
            };
        }, [
            p
        ]), T = y.useMemo(()=>{
            if (!p) return 0;
            let w = 0;
            for(let x = 0; x < p.natoms; x++)s.has(p.types[x]) || w++;
            return w;
        }, [
            p,
            s
        ]), j = s.size === 0, F = Object.keys(u).length > 0;
        return l.jsxs("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "#0a0a0c",
                borderLeft: "1px solid #1f2937"
            },
            children: [
                l.jsxs("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid #1f2937",
                        background: "#121318",
                        flexShrink: 0
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 10
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 4,
                                        height: 14,
                                        borderRadius: 0,
                                        background: "#1edce0"
                                    }
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 12,
                                        fontWeight: 700,
                                        fontFamily: "Space Grotesk, sans-serif",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.15em",
                                        color: "#e2e8f0"
                                    },
                                    children: "Atoms & Elements"
                                })
                            ]
                        }),
                        l.jsx("button", {
                            onClick: ()=>$.getState().setActivePanel(null),
                            style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 24,
                                height: 24,
                                background: "transparent",
                                border: "1px solid #334155",
                                borderRadius: 0,
                                color: "#94a3b8",
                                cursor: "pointer"
                            },
                            onMouseEnter: (w)=>{
                                w.currentTarget.style.color = "#fff", w.currentTarget.style.borderColor = "#1edce0";
                            },
                            onMouseLeave: (w)=>{
                                w.currentTarget.style.color = "#94a3b8", w.currentTarget.style.borderColor = "#334155";
                            },
                            children: l.jsx(Zb, {})
                        })
                    ]
                }),
                l.jsx("div", {
                    className: "lupine-scroll",
                    style: {
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px"
                    },
                    children: l.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 12
                        },
                        children: [
                            l.jsxs("div", {
                                style: {
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: 6
                                },
                                children: [
                                    l.jsx(Pa, {
                                        label: "Total Atoms",
                                        value: p ? p.natoms.toLocaleString() : "—"
                                    }),
                                    l.jsx(Pa, {
                                        label: "Visible",
                                        value: T.toLocaleString(),
                                        accent: !j
                                    }),
                                    l.jsx(Pa, {
                                        label: "Unique Elements",
                                        value: M.length.toString()
                                    }),
                                    l.jsx(Pa, {
                                        label: "Trajectory Frame",
                                        value: `${r + 1} / ${a?.trajectory.totalFrames ?? 0}`
                                    })
                                ]
                            }),
                            S && l.jsxs("div", {
                                style: {
                                    background: "#0d1117",
                                    border: "1px solid #1f2937",
                                    padding: "12px",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: 11,
                                    marginTop: 4
                                },
                                children: [
                                    l.jsx("div", {
                                        style: {
                                            color: "#64748b",
                                            letterSpacing: "0.08em",
                                            marginBottom: 6
                                        },
                                        children: "LATTICE BOUNDARIES [Å]"
                                    }),
                                    l.jsxs("div", {
                                        style: {
                                            display: "flex",
                                            justifyContent: "space-between",
                                            color: "#e2e8f0"
                                        },
                                        children: [
                                            l.jsxs("span", {
                                                children: [
                                                    "X: ",
                                                    S.x
                                                ]
                                            }),
                                            l.jsxs("span", {
                                                children: [
                                                    "Y: ",
                                                    S.y
                                                ]
                                            }),
                                            l.jsxs("span", {
                                                children: [
                                                    "Z: ",
                                                    S.z
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            }),
                            l.jsxs("div", {
                                style: {
                                    marginTop: 8
                                },
                                children: [
                                    l.jsxs("div", {
                                        style: {
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 8
                                        },
                                        children: [
                                            l.jsx("h3", {
                                                style: {
                                                    fontSize: 10,
                                                    fontFamily: "var(--font-mono)",
                                                    letterSpacing: "0.1em",
                                                    color: "#94a3b8",
                                                    textTransform: "uppercase",
                                                    margin: 0
                                                },
                                                children: "Elemental Composition"
                                            }),
                                            l.jsxs("div", {
                                                style: {
                                                    display: "flex",
                                                    gap: 4
                                                },
                                                children: [
                                                    !j && l.jsx(Vd, {
                                                        label: "RESET VISIBILITY",
                                                        onClick: h
                                                    }),
                                                    F && l.jsx(Vd, {
                                                        label: "RESET SIZES",
                                                        onClick: C
                                                    })
                                                ]
                                            })
                                        ]
                                    }),
                                    l.jsx("div", {
                                        style: {
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6
                                        },
                                        children: M.map((w)=>{
                                            const x = s.has(w.type), D = u[w.type] ?? 1;
                                            return l.jsxs("div", {
                                                style: {
                                                    background: x ? "#0a0a0c" : "#121418",
                                                    border: `1px solid ${x ? "#1e293b" : "#334155"}`,
                                                    borderLeft: `3px solid ${x ? "#334155" : w.color}`,
                                                    padding: "12px",
                                                    opacity: x ? .5 : 1,
                                                    transition: "opacity 150ms ease"
                                                },
                                                children: [
                                                    l.jsxs("div", {
                                                        style: {
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "flex-start",
                                                            gap: 12
                                                        },
                                                        children: [
                                                            l.jsxs("div", {
                                                                style: {
                                                                    flex: 1
                                                                },
                                                                children: [
                                                                    l.jsxs("div", {
                                                                        style: {
                                                                            display: "flex",
                                                                            alignItems: "baseline",
                                                                            gap: 8
                                                                        },
                                                                        children: [
                                                                            l.jsx("span", {
                                                                                style: {
                                                                                    fontSize: 18,
                                                                                    fontWeight: 700,
                                                                                    fontFamily: "Space Grotesk, sans-serif",
                                                                                    color: "#f8fafc"
                                                                                },
                                                                                children: w.symbol
                                                                            }),
                                                                            l.jsx("span", {
                                                                                style: {
                                                                                    fontSize: 13,
                                                                                    color: "#94a3b8",
                                                                                    fontWeight: 500
                                                                                },
                                                                                children: w.name
                                                                            })
                                                                        ]
                                                                    }),
                                                                    l.jsxs("div", {
                                                                        style: {
                                                                            display: "flex",
                                                                            flexWrap: "wrap",
                                                                            gap: "8px",
                                                                            marginTop: 6,
                                                                            fontSize: 10,
                                                                            fontFamily: "var(--font-mono)",
                                                                            color: "#64748b"
                                                                        },
                                                                        children: [
                                                                            l.jsxs("span", {
                                                                                children: [
                                                                                    "M: ",
                                                                                    w.mass.toFixed(2)
                                                                                ]
                                                                            }),
                                                                            l.jsx("span", {
                                                                                children: "|"
                                                                            }),
                                                                            l.jsxs("span", {
                                                                                children: [
                                                                                    "Rc: ",
                                                                                    w.radius,
                                                                                    "Å"
                                                                                ]
                                                                            }),
                                                                            l.jsx("span", {
                                                                                children: "|"
                                                                            }),
                                                                            l.jsxs("span", {
                                                                                style: {
                                                                                    color: "#0ea5e9"
                                                                                },
                                                                                children: [
                                                                                    "[",
                                                                                    w.block,
                                                                                    "-block]"
                                                                                ]
                                                                            })
                                                                        ]
                                                                    })
                                                                ]
                                                            }),
                                                            l.jsxs("div", {
                                                                style: {
                                                                    display: "flex",
                                                                    gap: 4
                                                                },
                                                                children: [
                                                                    l.jsx("button", {
                                                                        onClick: ()=>v(w.type),
                                                                        title: "Isolate",
                                                                        style: {
                                                                            width: 24,
                                                                            height: 24,
                                                                            background: "#1e293b",
                                                                            border: "1px solid #334155",
                                                                            color: "#94a3b8",
                                                                            cursor: "pointer",
                                                                            display: "grid",
                                                                            placeItems: "center"
                                                                        },
                                                                        children: l.jsx(tg, {})
                                                                    }),
                                                                    l.jsx("button", {
                                                                        onClick: ()=>m(w.type),
                                                                        title: x ? "Show" : "Hide",
                                                                        style: {
                                                                            width: 24,
                                                                            height: 24,
                                                                            background: x ? "#0f172a" : "rgba(30, 220, 224, 0.1)",
                                                                            border: `1px solid ${x ? "#334155" : "rgba(30, 220, 224, 0.3)"}`,
                                                                            color: x ? "#64748b" : "#1edce0",
                                                                            cursor: "pointer",
                                                                            display: "grid",
                                                                            placeItems: "center"
                                                                        },
                                                                        children: x ? l.jsx(eg, {}) : l.jsx(Jb, {})
                                                                    })
                                                                ]
                                                            })
                                                        ]
                                                    }),
                                                    l.jsxs("div", {
                                                        style: {
                                                            display: "flex",
                                                            alignItems: "center",
                                                            marginTop: 12,
                                                            gap: 12
                                                        },
                                                        children: [
                                                            l.jsxs("div", {
                                                                style: {
                                                                    flexShrink: 0,
                                                                    fontSize: 11,
                                                                    fontFamily: "var(--font-mono)",
                                                                    fontWeight: 600,
                                                                    color: "#1edce0"
                                                                },
                                                                children: [
                                                                    w.pct.toFixed(1),
                                                                    "% ",
                                                                    l.jsxs("span", {
                                                                        style: {
                                                                            color: "#64748b",
                                                                            fontWeight: 400
                                                                        },
                                                                        children: [
                                                                            "(",
                                                                            w.count.toLocaleString(),
                                                                            ")"
                                                                        ]
                                                                    })
                                                                ]
                                                            }),
                                                            !x && l.jsx("div", {
                                                                style: {
                                                                    flex: 1,
                                                                    paddingLeft: 8,
                                                                    borderLeft: "1px solid #334155"
                                                                },
                                                                children: l.jsx(Jn, {
                                                                    label: "RADIUS MULTIPLIER",
                                                                    value: D,
                                                                    min: .1,
                                                                    max: 3,
                                                                    step: .05,
                                                                    format: (k)=>k.toFixed(2),
                                                                    onChange: (k)=>b(w.type, k)
                                                                })
                                                            })
                                                        ]
                                                    })
                                                ]
                                            }, w.type);
                                        })
                                    })
                                ]
                            }),
                            l.jsx("div", {
                                style: {
                                    height: 4
                                }
                            }),
                            l.jsxs("div", {
                                style: {
                                    background: "#0d1117",
                                    border: "1px solid #1f2937",
                                    padding: "12px"
                                },
                                children: [
                                    l.jsx("h3", {
                                        style: {
                                            fontSize: 10,
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.1em",
                                            color: "#94a3b8",
                                            textTransform: "uppercase",
                                            margin: "0 0 12px 0"
                                        },
                                        children: "Global Rendering Scale"
                                    }),
                                    l.jsx(Jn, {
                                        label: "Van der Waals Scaling",
                                        value: d,
                                        min: .1,
                                        max: 3,
                                        step: .05,
                                        format: (w)=>w.toFixed(2),
                                        onChange: g
                                    })
                                ]
                            }),
                            p && p.properties && p.properties.size > 0 && l.jsxs("div", {
                                style: {
                                    marginTop: 8
                                },
                                children: [
                                    l.jsx("h3", {
                                        style: {
                                            fontSize: 10,
                                            fontFamily: "var(--font-mono)",
                                            letterSpacing: "0.1em",
                                            color: "#94a3b8",
                                            textTransform: "uppercase",
                                            margin: "0 0 8px 0"
                                        },
                                        children: "Analyzed Atomic Properties"
                                    }),
                                    l.jsx("div", {
                                        style: {
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6
                                        },
                                        children: Array.from(p.properties.keys()).map((w)=>{
                                            const x = p.properties.get(w);
                                            let D = 1 / 0, k = -1 / 0;
                                            for(let E = 0; E < x.length; E++)x[E] < D && (D = x[E]), x[E] > k && (k = x[E]);
                                            return l.jsxs("button", {
                                                onClick: ()=>{
                                                    $.getState().setColorMode("property"), $.getState().setColorProperty(w);
                                                },
                                                style: {
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    width: "100%",
                                                    padding: "10px 12px",
                                                    background: "#121418",
                                                    border: "1px solid #334155",
                                                    borderRadius: 0,
                                                    cursor: "pointer",
                                                    textAlign: "left"
                                                },
                                                onMouseEnter: (E)=>E.currentTarget.style.borderColor = "#1edce0",
                                                onMouseLeave: (E)=>E.currentTarget.style.borderColor = "#334155",
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            color: "#e2e8f0"
                                                        },
                                                        children: w
                                                    }),
                                                    l.jsxs("span", {
                                                        style: {
                                                            fontFamily: "var(--font-mono)",
                                                            fontSize: 11,
                                                            color: "#1edce0"
                                                        },
                                                        children: [
                                                            D.toFixed(2),
                                                            " ",
                                                            l.jsx("span", {
                                                                style: {
                                                                    color: "#475569"
                                                                },
                                                                children: "→"
                                                            }),
                                                            " ",
                                                            k.toFixed(2)
                                                        ]
                                                    })
                                                ]
                                            }, w);
                                        })
                                    })
                                ]
                            })
                        ]
                    })
                })
            ]
        });
    }
    function Pa({ label: a, value: r, accent: s }) {
        return l.jsxs("div", {
            style: {
                background: "#0d1117",
                border: "1px solid #1f2937",
                padding: "8px 12px"
            },
            children: [
                l.jsx("div", {
                    style: {
                        fontSize: 10,
                        color: "#64748b",
                        fontFamily: "var(--font-mono)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 4
                    },
                    children: a
                }),
                l.jsx("div", {
                    style: {
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: s ? "#1edce0" : "#f8fafc",
                        fontVariantNumeric: "tabular-nums"
                    },
                    children: r
                })
            ]
        });
    }
    function Vd({ label: a, onClick: r }) {
        return l.jsx("button", {
            onClick: r,
            style: {
                padding: "4px 8px",
                fontSize: 9,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#94a3b8",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 0,
                cursor: "pointer"
            },
            onMouseEnter: (s)=>{
                s.currentTarget.style.color = "#1edce0", s.currentTarget.style.borderColor = "#1edce0";
            },
            onMouseLeave: (s)=>{
                s.currentTarget.style.color = "#94a3b8", s.currentTarget.style.borderColor = "#334155";
            },
            children: a
        });
    }
    const Mf = {
        linear: (a)=>a,
        "ease-in": (a)=>a * a * a,
        "ease-out": (a)=>1 - Math.pow(1 - a, 3),
        "ease-in-out": (a)=>a < .5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2,
        "slow-middle": (a)=>a < .5 ? .5 * (1 - Math.pow(1 - 2 * a, 3)) : .5 + .5 * Math.pow(2 * a - 1, 3),
        "fast-middle": (a)=>a < .5 ? Math.pow(2 * a, 4) / 2 : 1 - Math.pow(2 - 2 * a, 4) / 2
    }, Li = {
        linear: "Linear",
        "ease-in": "Ease In (Slow Start)",
        "ease-out": "Ease Out (Slow End)",
        "ease-in-out": "Ease In-Out",
        "slow-middle": "Slow Middle",
        "fast-middle": "Fast Middle"
    };
    function og(a, r, s) {
        return [
            a[0] + (r[0] - a[0]) * s,
            a[1] + (r[1] - a[1]) * s,
            a[2] + (r[2] - a[2]) * s
        ];
    }
    function rg(a, r, s, u, d, m = .5) {
        const h = d * d, v = h * d, b = [
            0,
            0,
            0
        ];
        for(let C = 0; C < 3; C++){
            const g = -m * a[C] + (2 - m) * r[C] + (m - 2) * s[C] + m * u[C], p = 2 * m * a[C] + (m - 3) * r[C] + (3 - 2 * m) * s[C] - m * u[C], M = -m * a[C] + m * s[C], S = r[C];
            b[C] = g * v + p * h + M * d + S;
        }
        return b;
    }
    function vr(a) {
        let r = 0;
        for(let s = 0; s < a.keyframes.length; s++){
            const u = a.keyframes[s];
            r += u.holdDuration, (s < a.keyframes.length - 1 || a.loop) && (r += u.transitionDuration);
        }
        return r;
    }
    function rs(a, r, s = 50) {
        const { keyframes: u, loop: d } = a;
        if (u.length < 2) return null;
        const m = vr(a);
        if (m <= 0) return null;
        let h = d ? (r % m + m) % m : Math.min(r, m), v = 0;
        const b = u.length;
        for(let g = 0; g < b; g++){
            const p = u[g], M = g === b - 1;
            if (h < v + p.holdDuration) return {
                position: [
                    ...p.position
                ],
                target: [
                    ...p.target
                ],
                fov: p.fov ?? s,
                segment: g,
                segmentProgress: 0,
                totalProgress: h / m
            };
            if (v += p.holdDuration, !M || d) {
                const S = (g + 1) % b;
                if (h < v + p.transitionDuration) {
                    const T = (h - v) / p.transitionDuration, j = Mf[p.easing](T), F = (g - 1 + b) % b, w = (g + 2) % b, x = g === 0 && !d ? p.position : u[F].position, D = p.position, k = u[S].position, E = S === b - 1 && !d ? k : u[w].position, z = rg(x, D, k, E, j), G = og(p.target, u[S].target, j), _ = p.fov ?? s, O = u[S].fov ?? s;
                    return {
                        position: z,
                        target: G,
                        fov: _ + (O - _) * j,
                        segment: g,
                        segmentProgress: T,
                        totalProgress: h / m
                    };
                }
                v += p.transitionDuration;
            }
        }
        const C = u[b - 1];
        return {
            position: [
                ...C.position
            ],
            target: [
                ...C.target
            ],
            fov: C.fov ?? s,
            segment: b - 1,
            segmentProgress: 1,
            totalProgress: 1
        };
    }
    const Ff = {
        linear: "L",
        "ease-in": "I",
        "ease-out": "O",
        "ease-in-out": "IO",
        "slow-middle": "SM",
        "fast-middle": "FM"
    }, ag = Object.fromEntries(Object.entries(Ff).map(([a, r])=>[
            r,
            a
        ])), br = (a)=>Math.round(a * 10) / 10;
    function lg(a) {
        const r = {
            l: a.loop ? 1 : 0,
            k: a.keyframes.map((u)=>({
                    p: u.position.map(br),
                    t: u.target.map(br),
                    f: u.fov !== null ? br(u.fov) : void 0,
                    d: br(u.transitionDuration),
                    e: Ff[u.easing],
                    h: u.holdDuration > 0 ? br(u.holdDuration) : void 0
                }))
        }, s = JSON.stringify(r);
        return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    function Tf(a) {
        try {
            let r = a.replace(/-/g, "+").replace(/_/g, "/");
            for(; r.length % 4;)r += "=";
            const s = JSON.parse(atob(r));
            return {
                loop: s.l === 1,
                keyframes: s.k.map((u, d)=>({
                        position: u.p,
                        target: u.t,
                        fov: u.f ?? null,
                        transitionDuration: u.d ?? 2,
                        easing: ag[u.e] ?? "ease-in-out",
                        holdDuration: u.h ?? 0,
                        label: `Stop ${d + 1}`
                    }))
            };
        } catch  {
            return console.warn("Failed to decode flythrough"), null;
        }
    }
    function as(a, r, s = null, u) {
        return {
            position: [
                ...a
            ],
            target: [
                ...r
            ],
            fov: s,
            transitionDuration: 2,
            easing: "ease-in-out",
            holdDuration: .5,
            label: u ?? "Stop"
        };
    }
    function ig(a, r) {
        const s = a[0] - r[0], u = a[2] - r[2], d = [
            r[0] - u,
            a[1],
            r[2] + s
        ];
        return {
            loop: !1,
            keyframes: [
                as(a, r, null, "Start"),
                as(d, r, null, "End")
            ]
        };
    }
    const sg = ()=>l.jsx("svg", {
            width: "15",
            height: "15",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            children: l.jsx("path", {
                d: "M18 6L6 18M6 6l12 12"
            })
        }), cg = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "square",
            children: l.jsx("path", {
                d: "M12 5v14M5 12h14"
            })
        }), ug = ()=>l.jsx("svg", {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "square",
            children: l.jsx("path", {
                d: "M3 6h18M8 6V4h8v2M5 6l1 14h12l1-14"
            })
        }), Ef = ()=>l.jsxs("svg", {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            children: [
                l.jsx("path", {
                    d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
                }),
                l.jsx("circle", {
                    cx: "12",
                    cy: "13",
                    r: "3"
                })
            ]
        }), dg = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "currentColor",
            children: l.jsx("path", {
                d: "M8 5v14l11-7L8 5z"
            })
        }), fg = ()=>l.jsxs("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "currentColor",
            children: [
                l.jsx("rect", {
                    x: "6",
                    y: "4",
                    width: "4",
                    height: "16",
                    rx: "1"
                }),
                l.jsx("rect", {
                    x: "14",
                    y: "4",
                    width: "4",
                    height: "16",
                    rx: "1"
                })
            ]
        }), mg = ()=>l.jsxs("svg", {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: [
                l.jsx("circle", {
                    cx: "18",
                    cy: "5",
                    r: "3"
                }),
                l.jsx("circle", {
                    cx: "6",
                    cy: "12",
                    r: "3"
                }),
                l.jsx("circle", {
                    cx: "18",
                    cy: "19",
                    r: "3"
                }),
                l.jsx("line", {
                    x1: "8.59",
                    y1: "13.51",
                    x2: "15.42",
                    y2: "17.49"
                }),
                l.jsx("line", {
                    x1: "15.41",
                    y1: "6.51",
                    x2: "8.59",
                    y2: "10.49"
                })
            ]
        }), pg = ()=>l.jsx("svg", {
            width: "12",
            height: "12",
            viewBox: "0 0 24 24",
            fill: "#ef4444",
            stroke: "none",
            children: l.jsx("circle", {
                cx: "12",
                cy: "12",
                r: "7"
            })
        });
    function hg({ easing: a }) {
        const r = Mf[a], s = [];
        for(let u = 0; u <= 20; u++){
            const d = u / 20, m = r(d);
            s.push(`${2 + d * 36},${38 - m * 36}`);
        }
        return l.jsxs("svg", {
            width: "40",
            height: "40",
            viewBox: "0 0 40 40",
            style: {
                display: "block"
            },
            children: [
                l.jsx("rect", {
                    x: "0",
                    y: "0",
                    width: "40",
                    height: "40",
                    fill: "rgba(30,220,224,0.03)"
                }),
                l.jsx("line", {
                    x1: "2",
                    y1: "38",
                    x2: "38",
                    y2: "38",
                    stroke: "#334155",
                    strokeWidth: "0.5"
                }),
                l.jsx("line", {
                    x1: "2",
                    y1: "2",
                    x2: "2",
                    y2: "38",
                    stroke: "#334155",
                    strokeWidth: "0.5"
                }),
                l.jsx("polyline", {
                    points: s.join(" "),
                    fill: "none",
                    stroke: "#1edce0",
                    strokeWidth: "1.5"
                })
            ]
        });
    }
    function bg() {
        const { setActivePanel: a, flythrough: r, cameraPosition: s, cameraTarget: u, cameraFov: d, triggerExport: m } = $(), h = $((A)=>A.setFlythrough), v = $((A)=>A.addFlythroughKeyframe), b = $((A)=>A.removeFlythroughKeyframe), C = $((A)=>A.updateFlythroughKeyframe), g = $((A)=>A.setFlythroughLoop), p = $((A)=>A.flythroughPreview), M = $((A)=>A.setFlythroughPreview), S = $((A)=>A.setFlythroughTime), T = $((A)=>A.flythroughTime), j = $((A)=>A.exportRequest.type === "video"), F = (p || j) && r ? rs(r, T, d) : null, [w, x] = y.useState(null), [D, k] = y.useState(""), [E, z] = y.useState(!1), G = y.useRef(0), _ = y.useRef(0);
        y.useEffect(()=>{
            if (!p || !r) return;
            const A = vr(r);
            if (A <= 0) return;
            _.current = performance.now();
            const oe = (fe)=>{
                const X = (fe - _.current) / 1e3, ne = r.loop ? X % A : Math.min(X, A);
                S(ne);
                const re = rs(r, ne, d);
                if (re && $.getState().setCameraState(re.position, re.target), !r.loop && X >= A) {
                    M(!1);
                    return;
                }
                G.current = requestAnimationFrame(oe);
            };
            return G.current = requestAnimationFrame(oe), ()=>cancelAnimationFrame(G.current);
        }, [
            p,
            r,
            d,
            M,
            S
        ]);
        const O = y.useCallback(()=>{
            const A = as([
                ...s
            ], [
                ...u
            ], null, `Stop ${(r?.keyframes.length ?? 0) + 1}`);
            if (r) v(A);
            else {
                const oe = ig([
                    ...s
                ], [
                    ...u
                ]);
                h(oe);
            }
        }, [
            s,
            u,
            r,
            h,
            v
        ]), N = y.useCallback(()=>{
            if (!r) return;
            const A = lg(r), oe = `${window.location.origin}${window.location.pathname}?fly=${encodeURIComponent(A)}`;
            navigator.clipboard.writeText(oe), alert("Flythrough link copied to clipboard!");
        }, [
            r
        ]), V = y.useCallback(()=>{
            if (!D.trim()) return;
            let A = D.trim();
            try {
                A = new URL(A).searchParams.get("fly") ?? A;
            } catch  {}
            const oe = Tf(A);
            oe ? (h(oe), z(!1), k("")) : alert("Invalid flythrough data");
        }, [
            D,
            h
        ]), K = y.useCallback(()=>{
            if (!r || r.keyframes.length < 2) return;
            const A = vr(r);
            m({
                type: "video",
                resolution: {
                    width: 1920,
                    height: 1080
                },
                format: "mp4",
                durationSeconds: Math.ceil(A),
                flythrough: r,
                baseName: "glimPSE-flythrough"
            });
        }, [
            r,
            m
        ]), Q = r ? vr(r) : 0, Z = r?.keyframes ?? [], J = Z.length < 5;
        return l.jsxs("div", {
            style: {
                display: "flex",
                flexDirection: "column",
                height: "100%",
                background: "#0a0a0c",
                borderLeft: "1px solid #1f2937"
            },
            children: [
                l.jsxs("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid #1f2937",
                        background: "#121318",
                        flexShrink: 0
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 10
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 4,
                                        height: 14,
                                        background: "#f59e0b"
                                    }
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 12,
                                        fontWeight: 700,
                                        fontFamily: "Space Grotesk, sans-serif",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.15em",
                                        color: "#e2e8f0"
                                    },
                                    children: "Flythrough"
                                }),
                                r && l.jsxs("span", {
                                    style: {
                                        fontSize: 10,
                                        color: "#64748b",
                                        fontFamily: "var(--font-mono)"
                                    },
                                    children: [
                                        Z.length,
                                        " stops · ",
                                        Q.toFixed(1),
                                        "s"
                                    ]
                                })
                            ]
                        }),
                        l.jsx("button", {
                            onClick: ()=>a(null),
                            style: {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 24,
                                height: 24,
                                background: "transparent",
                                border: "1px solid #334155",
                                borderRadius: 0,
                                color: "#94a3b8",
                                cursor: "pointer"
                            },
                            children: l.jsx(sg, {})
                        })
                    ]
                }),
                l.jsx("div", {
                    className: "lupine-scroll",
                    style: {
                        flex: 1,
                        overflowY: "auto",
                        padding: "16px"
                    },
                    children: l.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: 10
                        },
                        children: [
                            !r && l.jsxs("div", {
                                style: {
                                    padding: "24px 16px",
                                    textAlign: "center",
                                    background: "#0d1117",
                                    border: "1px solid #1f2937"
                                },
                                children: [
                                    l.jsx("div", {
                                        style: {
                                            fontSize: 13,
                                            fontWeight: 600,
                                            color: "#e2e8f0",
                                            fontFamily: "Space Grotesk, sans-serif",
                                            marginBottom: 8
                                        },
                                        children: "Create a Camera Flythrough"
                                    }),
                                    l.jsx("div", {
                                        style: {
                                            fontSize: 11,
                                            color: "#64748b",
                                            lineHeight: 1.5,
                                            marginBottom: 16
                                        },
                                        children: "Position your camera where you want the first stop, then click below. Add up to 5 keyframes with easing transitions."
                                    }),
                                    l.jsxs("button", {
                                        onClick: O,
                                        style: $i,
                                        children: [
                                            l.jsx(Ef, {}),
                                            " Capture First Stop"
                                        ]
                                    }),
                                    l.jsx("button", {
                                        onClick: ()=>z(!E),
                                        style: {
                                            ...gr,
                                            marginTop: 8,
                                            width: "100%"
                                        },
                                        children: "Import from Link"
                                    })
                                ]
                            }),
                            E && l.jsxs("div", {
                                style: {
                                    background: "#0d1117",
                                    border: "1px solid #1f2937",
                                    padding: 12
                                },
                                children: [
                                    l.jsx("div", {
                                        style: qd,
                                        children: "IMPORT FLYTHROUGH"
                                    }),
                                    l.jsx("input", {
                                        value: D,
                                        onChange: (A)=>k(A.target.value),
                                        placeholder: "Paste flythrough link or code...",
                                        style: zf
                                    }),
                                    l.jsx("button", {
                                        onClick: V,
                                        style: {
                                            ...$i,
                                            marginTop: 8
                                        },
                                        children: "Import"
                                    })
                                ]
                            }),
                            Z.map((A, oe)=>l.jsx(gg, {
                                    index: oe,
                                    keyframe: A,
                                    isLast: oe === Z.length - 1,
                                    expanded: w === oe,
                                    activeSample: F,
                                    onToggle: ()=>x(w === oe ? null : oe),
                                    onUpdate: (fe)=>C(oe, fe),
                                    onRemove: ()=>b(oe),
                                    onRecapture: ()=>{
                                        C(oe, {
                                            position: [
                                                ...$.getState().cameraPosition
                                            ],
                                            target: [
                                                ...$.getState().cameraTarget
                                            ]
                                        });
                                    },
                                    onJumpTo: ()=>{
                                        $.getState().setCameraState(A.position, A.target);
                                    }
                                }, oe)),
                            r && J && l.jsxs("button", {
                                onClick: O,
                                style: {
                                    ...gr,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    width: "100%"
                                },
                                children: [
                                    l.jsx(cg, {}),
                                    " Add Stop (",
                                    Z.length,
                                    "/5)"
                                ]
                            }),
                            r && Z.length >= 2 && l.jsxs(l.Fragment, {
                                children: [
                                    l.jsxs("div", {
                                        style: {
                                            background: "#0d1117",
                                            border: "1px solid #1f2937",
                                            padding: 12
                                        },
                                        children: [
                                            l.jsx("div", {
                                                style: qd,
                                                children: "PATH OPTIONS"
                                            }),
                                            l.jsx(yg, {
                                                label: "Loop Path",
                                                hint: "Return to first keyframe at end",
                                                active: r.loop,
                                                onToggle: ()=>g(!r.loop)
                                            })
                                        ]
                                    }),
                                    l.jsx("div", {
                                        style: {
                                            display: "flex",
                                            gap: 6
                                        },
                                        children: l.jsx("button", {
                                            onClick: ()=>M(!p),
                                            style: {
                                                ...$i,
                                                flex: 1,
                                                background: p ? "#334155" : "#f59e0b",
                                                borderColor: p ? "#475569" : "#f59e0b",
                                                color: p ? "#e2e8f0" : "#0a0a0c"
                                            },
                                            children: p ? l.jsxs(l.Fragment, {
                                                children: [
                                                    l.jsx(fg, {}),
                                                    " Stop"
                                                ]
                                            }) : l.jsxs(l.Fragment, {
                                                children: [
                                                    l.jsx(dg, {}),
                                                    " Preview"
                                                ]
                                            })
                                        })
                                    }),
                                    l.jsxs("div", {
                                        style: {
                                            display: "flex",
                                            gap: 6
                                        },
                                        children: [
                                            l.jsxs("button", {
                                                onClick: N,
                                                style: {
                                                    ...gr,
                                                    flex: 1
                                                },
                                                children: [
                                                    l.jsx(mg, {}),
                                                    " Share Link"
                                                ]
                                            }),
                                            l.jsxs("button", {
                                                onClick: K,
                                                style: {
                                                    ...gr,
                                                    flex: 1
                                                },
                                                children: [
                                                    l.jsx(pg, {}),
                                                    " Export MP4"
                                                ]
                                            })
                                        ]
                                    }),
                                    l.jsxs("div", {
                                        style: {
                                            background: "#0d1117",
                                            border: "1px solid #1f2937",
                                            padding: 10,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 4
                                        },
                                        children: [
                                            l.jsx(Ui, {
                                                label: "Total Duration",
                                                value: `${Q.toFixed(1)}s`
                                            }),
                                            l.jsx(Ui, {
                                                label: "Segments",
                                                value: `${Z.length - 1}${r.loop ? " + return" : ""}`
                                            }),
                                            l.jsx(Ui, {
                                                label: "Interpolation",
                                                value: "Catmull-Rom Spline"
                                            })
                                        ]
                                    }),
                                    l.jsx("button", {
                                        onClick: ()=>{
                                            h(null), M(!1);
                                        },
                                        style: {
                                            ...gr,
                                            color: "#ef4444",
                                            borderColor: "rgba(239,68,68,0.3)",
                                            width: "100%"
                                        },
                                        children: "Clear Flythrough"
                                    })
                                ]
                            })
                        ]
                    })
                })
            ]
        });
    }
    function gg({ index: a, keyframe: r, isLast: s, expanded: u, activeSample: d, onToggle: m, onUpdate: h, onRemove: v, onRecapture: b, onJumpTo: C }) {
        const g = (p)=>Math.round(p * 10) / 10;
        return l.jsxs("div", {
            style: {
                background: "#0d1117",
                border: "1px solid #1f2937",
                transition: "border-color 150ms"
            },
            children: [
                l.jsxs("button", {
                    onClick: m,
                    style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "10px 12px",
                        background: u ? "rgba(245,158,11,0.06)" : "transparent",
                        border: "none",
                        cursor: "pointer"
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 8
                            },
                            children: [
                                l.jsx("div", {
                                    style: {
                                        width: 20,
                                        height: 20,
                                        background: u ? "#f59e0b" : d?.segment === a ? "#1edce0" : "#334155",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: u || d?.segment === a ? "#0a0a0c" : "#94a3b8",
                                        fontFamily: "var(--font-mono)",
                                        transition: "background 150ms, color 150ms"
                                    },
                                    children: a + 1
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#e2e8f0",
                                        fontFamily: "Space Grotesk, sans-serif"
                                    },
                                    children: r.label
                                })
                            ]
                        }),
                        l.jsxs("span", {
                            style: {
                                fontSize: 9,
                                color: "#475569",
                                fontFamily: "var(--font-mono)"
                            },
                            children: [
                                "[",
                                g(r.position[0]),
                                ", ",
                                g(r.position[1]),
                                ", ",
                                g(r.position[2]),
                                "]"
                            ]
                        })
                    ]
                }),
                d?.segment === a && l.jsx("div", {
                    style: {
                        height: 2,
                        background: "rgba(30,220,224,0.1)",
                        width: "100%"
                    },
                    children: l.jsx("div", {
                        style: {
                            height: "100%",
                            background: "#1edce0",
                            width: `${Math.max(0, d.segmentProgress) * 100}%`
                        }
                    })
                }),
                u && l.jsxs("div", {
                    style: {
                        padding: "8px 12px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                    },
                    children: [
                        l.jsxs("div", {
                            children: [
                                l.jsx("div", {
                                    style: Ma,
                                    children: "LABEL"
                                }),
                                l.jsx("input", {
                                    value: r.label,
                                    onChange: (p)=>h({
                                            label: p.target.value
                                        }),
                                    style: zf
                                })
                            ]
                        }),
                        !s && l.jsxs("div", {
                            children: [
                                l.jsx("div", {
                                    style: Ma,
                                    children: "TRANSITION DURATION (s)"
                                }),
                                l.jsx("input", {
                                    type: "range",
                                    min: "0.5",
                                    max: "10",
                                    step: "0.5",
                                    value: r.transitionDuration,
                                    onChange: (p)=>h({
                                            transitionDuration: parseFloat(p.target.value)
                                        }),
                                    style: {
                                        width: "100%",
                                        accentColor: "#f59e0b"
                                    }
                                }),
                                l.jsxs("div", {
                                    style: {
                                        fontSize: 10,
                                        color: "#94a3b8",
                                        fontFamily: "var(--font-mono)",
                                        textAlign: "right"
                                    },
                                    children: [
                                        r.transitionDuration.toFixed(1),
                                        "s"
                                    ]
                                })
                            ]
                        }),
                        l.jsxs("div", {
                            children: [
                                l.jsx("div", {
                                    style: Ma,
                                    children: "HOLD AT STOP (s)"
                                }),
                                l.jsx("input", {
                                    type: "range",
                                    min: "0",
                                    max: "5",
                                    step: "0.25",
                                    value: r.holdDuration,
                                    onChange: (p)=>h({
                                            holdDuration: parseFloat(p.target.value)
                                        }),
                                    style: {
                                        width: "100%",
                                        accentColor: "#f59e0b"
                                    }
                                }),
                                l.jsxs("div", {
                                    style: {
                                        fontSize: 10,
                                        color: "#94a3b8",
                                        fontFamily: "var(--font-mono)",
                                        textAlign: "right"
                                    },
                                    children: [
                                        r.holdDuration.toFixed(2),
                                        "s"
                                    ]
                                })
                            ]
                        }),
                        !s && l.jsxs("div", {
                            children: [
                                l.jsx("div", {
                                    style: Ma,
                                    children: "EASING CURVE"
                                }),
                                l.jsx("div", {
                                    style: {
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr",
                                        gap: 4
                                    },
                                    children: Object.keys(Li).map((p)=>l.jsxs("button", {
                                            onClick: ()=>h({
                                                    easing: p
                                                }),
                                            style: {
                                                padding: "6px 4px",
                                                background: r.easing === p ? "rgba(245,158,11,0.12)" : "#121418",
                                                border: `1px solid ${r.easing === p ? "rgba(245,158,11,0.4)" : "#334155"}`,
                                                borderRadius: 0,
                                                cursor: "pointer",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 2
                                            },
                                            children: [
                                                l.jsx(hg, {
                                                    easing: p
                                                }),
                                                l.jsx("span", {
                                                    style: {
                                                        fontSize: 8,
                                                        color: r.easing === p ? "#f59e0b" : "#64748b",
                                                        fontFamily: "var(--font-mono)",
                                                        textAlign: "center"
                                                    },
                                                    children: Li[p]
                                                })
                                            ]
                                        }, p))
                                })
                            ]
                        }),
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                gap: 4,
                                marginTop: 4
                            },
                            children: [
                                l.jsx("button", {
                                    onClick: C,
                                    style: {
                                        ...Gi,
                                        flex: 1
                                    },
                                    children: "Jump To"
                                }),
                                l.jsxs("button", {
                                    onClick: b,
                                    style: {
                                        ...Gi,
                                        flex: 1
                                    },
                                    children: [
                                        l.jsx(Ef, {}),
                                        " Recapture"
                                    ]
                                }),
                                l.jsx("button", {
                                    onClick: v,
                                    style: {
                                        ...Gi,
                                        color: "#ef4444",
                                        borderColor: "rgba(239,68,68,0.3)"
                                    },
                                    children: l.jsx(ug, {})
                                })
                            ]
                        })
                    ]
                }),
                !s && !u && l.jsxs("div", {
                    style: {
                        padding: "2px 12px 6px",
                        fontSize: 9,
                        color: "#475569",
                        fontFamily: "var(--font-mono)",
                        display: "flex",
                        justifyContent: "space-between"
                    },
                    children: [
                        l.jsxs("span", {
                            children: [
                                "↓ ",
                                Li[r.easing]
                            ]
                        }),
                        l.jsxs("span", {
                            children: [
                                r.transitionDuration.toFixed(1),
                                "s"
                            ]
                        })
                    ]
                })
            ]
        });
    }
    function yg({ label: a, hint: r, active: s, onToggle: u }) {
        return l.jsxs("button", {
            onClick: u,
            style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 10px",
                background: s ? "rgba(245,158,11,0.06)" : "#121418",
                border: `1px solid ${s ? "rgba(245,158,11,0.25)" : "#334155"}`,
                borderRadius: 0,
                cursor: "pointer"
            },
            children: [
                l.jsxs("div", {
                    children: [
                        l.jsx("div", {
                            style: {
                                fontSize: 12,
                                fontWeight: 500,
                                fontFamily: "Space Grotesk, sans-serif",
                                color: s ? "#e2e8f0" : "#94a3b8"
                            },
                            children: a
                        }),
                        r && l.jsx("div", {
                            style: {
                                fontSize: 9,
                                color: "#475569",
                                marginTop: 2
                            },
                            children: r
                        })
                    ]
                }),
                l.jsx("div", {
                    style: {
                        width: 32,
                        height: 16,
                        background: s ? "#f59e0b" : "#334155",
                        position: "relative",
                        transition: "background 200ms"
                    },
                    children: l.jsx("div", {
                        style: {
                            width: 12,
                            height: 12,
                            background: s ? "#0a0a0c" : "#64748b",
                            position: "absolute",
                            top: 2,
                            left: s ? 18 : 2,
                            transition: "left 200ms, background 200ms"
                        }
                    })
                })
            ]
        });
    }
    function Ui({ label: a, value: r }) {
        return l.jsxs("div", {
            style: {
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: "var(--font-mono)"
            },
            children: [
                l.jsx("span", {
                    style: {
                        color: "#64748b"
                    },
                    children: a
                }),
                l.jsx("span", {
                    style: {
                        color: "#f8fafc"
                    },
                    children: r
                })
            ]
        });
    }
    const qd = {
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.1em",
        color: "#94a3b8",
        textTransform: "uppercase",
        marginBottom: 8
    }, Ma = {
        fontSize: 9,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.08em",
        color: "#64748b",
        textTransform: "uppercase",
        marginBottom: 4
    }, zf = {
        width: "100%",
        padding: "6px 8px",
        background: "#121418",
        border: "1px solid #334155",
        borderRadius: 0,
        color: "#e2e8f0",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        outline: "none"
    }, $i = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        padding: "10px 0",
        background: "#f59e0b",
        border: "1px solid #f59e0b",
        borderRadius: 0,
        color: "#0a0a0c",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "Space Grotesk, sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        cursor: "pointer"
    }, gr = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 12px",
        background: "transparent",
        border: "1px solid #334155",
        borderRadius: 0,
        color: "#94a3b8",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "Space Grotesk, sans-serif",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        cursor: "pointer"
    }, Gi = {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "5px 8px",
        background: "#121418",
        border: "1px solid #334155",
        borderRadius: 0,
        color: "#94a3b8",
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "var(--font-mono)",
        cursor: "pointer"
    };
    async function xg(a, r = 30) {
        const { GIFEncoder: s, quantize: u, applyPalette: d } = await Zn(async ()=>{
            const { GIFEncoder: F, quantize: w, applyPalette: x } = await import("./gifenc.esm-BWxMhepS.js");
            return {
                GIFEncoder: F,
                quantize: w,
                applyPalette: x
            };
        }, [], import.meta.url), m = URL.createObjectURL(a), h = document.createElement("video");
        h.muted = !0, h.playsInline = !0, h.preload = "auto", h.src = m, await new Promise((F, w)=>{
            h.onloadedmetadata = ()=>F(), h.onerror = ()=>w(new Error("Failed to load MP4 for GIF conversion")), setTimeout(()=>w(new Error("MP4 metadata load timeout")), 1e4);
        });
        const v = h.videoWidth, b = h.videoHeight, C = h.duration, g = 1 / r, p = Math.round(1e3 / r), M = Math.floor(C * r), S = document.createElement("canvas");
        S.width = v, S.height = b;
        const T = S.getContext("2d", {
            willReadFrequently: !0
        }), j = s();
        for(let F = 0; F < M; F++){
            const w = Math.min(F * g, C - .001);
            await new Promise((E)=>{
                const z = ()=>{
                    h.removeEventListener("seeked", z), E();
                };
                h.addEventListener("seeked", z), h.currentTime = w;
            }), T.drawImage(h, 0, 0, v, b);
            const x = T.getImageData(0, 0, v, b), D = u(x.data, 256), k = d(x.data, D);
            j.writeFrame(k, v, b, {
                palette: D,
                delay: p
            });
        }
        return j.finish(), URL.revokeObjectURL(m), h.remove(), new Blob([
            j.bytes().buffer
        ], {
            type: "image/gif"
        });
    }
    function vg({ encoderRef: a, muxerRef: r, requestRef: s, frameCount: u, totalFrames: d, originalCameraPosition: m, originalSize: h, originalPixelRatio: v, outputFormat: b, onCompleteRef: C, clearExportRequest: g, file: p, isRecording: M, setIsCapturing: S, originalStoreState: T }) {
        const { gl: j, camera: F } = ze();
        return mn(()=>{
            if (!M.current || !a.current || !r.current || a.current.encodeQueueSize > 4) return;
            const w = s.current;
            if (!w) return;
            const x = u.current, D = d.current, k = 60;
            try {
                const E = new VideoFrame(j.domElement, {
                    timestamp: x * 1e6 / k
                });
                a.current.encode(E, {
                    keyFrame: x % 60 === 0
                }), E.close();
            } catch (E) {
                console.error("Frame encode error", E);
            }
            if (u.current++, w.flythrough && w.flythrough.keyframes.length >= 2) {
                const E = vr(w.flythrough), z = u.current / D * E;
                $.getState().setFlythroughTime(z);
                const G = rs(w.flythrough, z);
                G && (F.position.set(...G.position), F.lookAt(...G.target), F instanceof Xn && G.fov && (F.fov = G.fov, F.updateProjectionMatrix()));
            } else if (w.orbit && m.current && p) {
                const { min: E, max: z } = p.trajectory.globalBounds, G = new Ae((E[0] + z[0]) / 2, (E[1] + z[1]) / 2, (E[2] + z[2]) / 2), _ = m.current.distanceTo(G), O = u.current / D * Math.PI * 2;
                F.position.x = G.x + Math.sin(O) * _, F.position.z = G.z + Math.cos(O) * _, F.position.y = m.current.y, F.lookAt(G);
            }
            if (w.cinematic && p) {
                const E = u.current / D;
                if (p.trajectory.totalFrames > 1) {
                    const G = Math.floor(E * p.trajectory.totalFrames), _ = Math.min(G, p.trajectory.totalFrames - 1);
                    $.getState().frame !== _ && $.getState().setFrame(_);
                }
                const z = Math.sin(E * Math.PI);
                $.getState().setBondCutoff(Math.max(0, z * 2.5)), $.getState().setAtomScale(.85 + z * .15);
            }
            u.current >= D && (M.current = !1, S(!1), (async ()=>{
                try {
                    await a.current.flush();
                    try {
                        r.current.finalize();
                    } catch (z) {
                        if (z?.message?.includes("colorSpace") || z?.message?.includes("null")) console.warn("[ExportManager] finalize() colorSpace fallback — salvaging buffer", z);
                        else throw z;
                    }
                    let E = !1;
                    if (w.fileStream) await w.fileStream.close(), E = !0;
                    else {
                        const z = r.current.target.buffer, G = new Blob([
                            z
                        ], {
                            type: "video/mp4"
                        }), _ = w.baseName || "glimPSE", O = b.current;
                        if (O === "mp4") Ia(G, `${_}.mp4`), E = !0;
                        else if (O === "gif") try {
                            const N = await xg(G, 30);
                            Ia(N, `${_}.gif`), E = !0;
                        } catch (N) {
                            console.error("GIF conversion failed, downloading pristine MP4 fallback:", N), Ia(G, `${_}.mp4`), E = !0;
                        }
                    }
                    C.current && C.current(E);
                } catch (E) {
                    console.error("Finalization failed", E), C.current && C.current(!1);
                } finally{
                    if (a.current = null, r.current = null, m.current && p) {
                        const { min: E, max: z } = p.trajectory.globalBounds, G = new Ae((E[0] + z[0]) / 2, (E[1] + z[1]) / 2, (E[2] + z[2]) / 2);
                        F.position.copy(m.current), F.lookAt(G), m.current = null;
                    }
                    h.current && (j.setSize(h.current.width, h.current.height, !1), F instanceof Xn && (F.aspect = h.current.aspect, F.updateProjectionMatrix()), h.current = null), v.current && j.setPixelRatio(v.current), T.current && ($.getState().setBondCutoff(T.current.bondCutoff), $.getState().setAtomScale(T.current.atomScale), $.getState().setFrame(T.current.frame), T.current = null), b.current = null, g();
                }
            })());
        }, 2), null;
    }
    function Sg() {
        const { gl: a, scene: r, camera: s, size: u } = ze(), d = $((N)=>N.exportRequest), m = $((N)=>N.clearExportRequest), h = $((N)=>N.file), v = $((N)=>N.frame), b = y.useRef(!1), [C, g] = y.useState(!1), p = y.useRef(null), M = y.useRef(null), S = y.useRef(null), T = y.useRef(null), j = y.useRef(null), F = y.useRef(0), w = y.useRef(0), x = y.useRef(1), D = y.useRef(null), k = y.useRef(null), E = y.useRef(null), z = y.useCallback(()=>{
            const N = d;
            if (!N) return;
            const V = u.width, K = u.height, Q = N.resolution?.width || V, Z = N.resolution?.height || K, J = N.format || "png", A = s.aspect;
            a.setSize(Q, Z, !1), s instanceof Xn && (s.aspect = Q / Z, s.updateProjectionMatrix());
            const oe = a.getClearAlpha();
            N.transparent ? a.setClearColor(0, 0) : a.setClearColor(new cs("#10131a"), 1);
            const fe = a.getRenderTarget();
            a.setRenderTarget(null), a.render(r, s);
            const X = `image/${J}`, ne = J === "png" ? void 0 : 1, re = J === "jpeg" ? "jpg" : J, ae = `${N.baseName || "glimPSE-export"}-frame${v + 1}.${re}`;
            a.domElement.toBlob((Se)=>{
                Se ? (Ia(Se, ae), N.onComplete && N.onComplete(!0)) : (console.error("[ExportManager] toBlob returned null — canvas may be tainted or context lost"), N.onComplete && N.onComplete(!1)), m();
            }, X, ne), a.setRenderTarget(fe), a.setSize(V, K, !1), s instanceof Xn && (s.aspect = A, s.updateProjectionMatrix()), a.setClearAlpha(oe);
        }, [
            d,
            a,
            r,
            s,
            u,
            m,
            v
        ]), G = y.useCallback(async ()=>{
            const N = d;
            if (!N || b.current) return;
            const V = N.format === "gif" ? "gif" : "mp4", K = N.resolution?.width || 1920, Q = N.resolution?.height || 1080, Z = 60, J = N.durationSeconds || 5;
            if (typeof VideoEncoder > "u") {
                console.error("WebCodecs VideoEncoder not available in this browser."), N.onComplete && N.onComplete(!1), m();
                return;
            }
            if (p.current = V, M.current = N.onComplete || null, j.current = N, N.orbit && (D.current = s.position.clone()), N.cinematic) {
                const A = $.getState();
                E.current = {
                    bondCutoff: A.bondCutoff,
                    atomScale: A.atomScale,
                    frame: A.frame
                };
            }
            k.current = {
                width: u.width,
                height: u.height,
                aspect: s.aspect
            }, x.current = a.getPixelRatio(), a.setPixelRatio(1), a.setSize(K, Q, !1), s instanceof Xn && (s.aspect = K / Q, s.updateProjectionMatrix());
            try {
                const A = await Zn(()=>import("./mp4-muxer-CR73arlb.js"), [], import.meta.url), oe = A.Muxer || A.default?.Muxer || A.default, fe = A.ArrayBufferTarget || A.default?.ArrayBufferTarget, X = A.FileSystemWritableFileStreamTarget || A.default?.FileSystemWritableFileStreamTarget, ne = N.fileStream ? new X(N.fileStream) : new fe, re = new oe({
                    target: ne,
                    video: {
                        codec: "avc",
                        width: K,
                        height: Q
                    },
                    fastStart: N.fileStream ? !1 : "in-memory"
                });
                T.current = re;
                let ae = !1;
                const Se = new VideoEncoder({
                    output: (ye, Me)=>{
                        ae || (ae = !0, Me?.decoderConfig ? Me.decoderConfig.colorSpace || (Me = {
                            ...Me,
                            decoderConfig: {
                                ...Me.decoderConfig,
                                colorSpace: {
                                    primaries: "bt709",
                                    transfer: "bt709",
                                    matrix: "bt709",
                                    fullRange: !1
                                }
                            }
                        }) : Me = {
                            ...Me || {},
                            decoderConfig: {
                                codec: "avc1.640028",
                                description: new Uint8Array(0),
                                colorSpace: {
                                    primaries: "bt709",
                                    transfer: "bt709",
                                    matrix: "bt709",
                                    fullRange: !1
                                }
                            }
                        }), T.current && T.current.addVideoChunk(ye, Me);
                    },
                    error: (ye)=>console.error("VideoEncoder error:", ye)
                });
                Se.configure({
                    codec: "avc1.640028",
                    width: K,
                    height: Q,
                    bitrate: 8e7,
                    framerate: Z,
                    hardwareAcceleration: "prefer-hardware"
                }), S.current = Se, F.current = Z * J, w.current = 0, b.current = !0, g(!0);
            } catch (A) {
                console.error("Failed to init WebCodecs video:", A), M.current && M.current(!1), b.current = !1, a.setPixelRatio(x.current), m();
            }
        }, [
            d,
            s,
            a,
            u,
            m
        ]), _ = y.useRef(z);
        _.current = z;
        const O = y.useRef(G);
        return O.current = G, y.useEffect(()=>{
            !d || !d.type || (d.type === "image" && _.current(), d.type === "video" && O.current());
        }, [
            d
        ]), C ? l.jsx(vg, {
            encoderRef: S,
            muxerRef: T,
            requestRef: j,
            frameCount: w,
            totalFrames: F,
            originalCameraPosition: D,
            originalSize: k,
            originalPixelRatio: x,
            outputFormat: p,
            onCompleteRef: M,
            clearExportRequest: m,
            file: h,
            isRecording: b,
            setIsCapturing: g,
            originalStoreState: E
        }) : null;
    }
    function Ia(a, r) {
        const s = URL.createObjectURL(a), u = document.createElement("a");
        u.download = r, u.href = s, document.body.appendChild(u), u.click(), document.body.removeChild(u), setTimeout(()=>URL.revokeObjectURL(s), 1e4);
    }
    const Cg = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M6 4v16M10 12l8-6v12l-8-6z"
            })
        }), jg = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M19 20L9 12l10-8v16z"
            })
        }), wg = ()=>l.jsx("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "currentColor",
            children: l.jsx("path", {
                d: "M8 5v14l11-7L8 5z"
            })
        }), kg = ()=>l.jsxs("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "currentColor",
            children: [
                l.jsx("rect", {
                    x: "6",
                    y: "4",
                    width: "4",
                    height: "16",
                    rx: "1"
                }),
                l.jsx("rect", {
                    x: "14",
                    y: "4",
                    width: "4",
                    height: "16",
                    rx: "1"
                })
            ]
        }), Pg = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M5 4l10 8-10 8V4z"
            })
        }), Mg = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M18 4v16M14 12L6 6v12l8-6z"
            })
        }), Fg = ()=>l.jsx("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            children: l.jsx("path", {
                d: "M18 6L6 18M6 6l12 12"
            })
        }), Tg = ()=>l.jsxs("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("circle", {
                    cx: "18",
                    cy: "5",
                    r: "3"
                }),
                l.jsx("circle", {
                    cx: "6",
                    cy: "12",
                    r: "3"
                }),
                l.jsx("circle", {
                    cx: "18",
                    cy: "19",
                    r: "3"
                }),
                l.jsx("line", {
                    x1: "8.59",
                    y1: "13.51",
                    x2: "15.42",
                    y2: "17.49"
                }),
                l.jsx("line", {
                    x1: "15.41",
                    y1: "6.51",
                    x2: "8.59",
                    y2: "10.49"
                })
            ]
        }), Eg = ()=>l.jsxs("svg", {
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("path", {
                    d: "M18.375 2.625a3.875 3.875 0 0 0-5.48 0l-9.27 9.27a3.875 3.875 0 0 0 0 5.48l.27.27a3.875 3.875 0 0 0 5.48 0l9.27-9.27a3.875 3.875 0 0 0 0-5.48l-.27-.27Z"
                }),
                l.jsx("path", {
                    d: "M14 6l4 4"
                }),
                l.jsx("path", {
                    d: "M8.5 15.5 4 20"
                })
            ]
        }), zg = ()=>l.jsxs("svg", {
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("path", {
                    d: "m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
                }),
                l.jsx("path", {
                    d: "M5 3v4"
                }),
                l.jsx("path", {
                    d: "M19 17v4"
                }),
                l.jsx("path", {
                    d: "M3 5h4"
                }),
                l.jsx("path", {
                    d: "M17 19h4"
                })
            ]
        }), Ig = ()=>l.jsxs("svg", {
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("path", {
                    d: "M21.3 15.3 2.7 2.7"
                }),
                l.jsx("path", {
                    d: "M15 21.3 2.7 2.7"
                }),
                l.jsx("path", {
                    d: "M21.3 9 2.7 2.7"
                }),
                l.jsx("path", {
                    d: "M9 21.3 2.7 2.7"
                })
            ]
        }), _g = ()=>l.jsxs("svg", {
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("path", {
                    d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
                }),
                l.jsx("circle", {
                    cx: "12",
                    cy: "13",
                    r: "3"
                })
            ]
        }), Dg = ()=>l.jsxs("svg", {
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("path", {
                    d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                }),
                l.jsx("path", {
                    d: "M3 3v5h5"
                })
            ]
        }), Ag = ()=>l.jsxs("svg", {
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("line", {
                    x1: "18",
                    y1: "20",
                    x2: "18",
                    y2: "10"
                }),
                l.jsx("line", {
                    x1: "12",
                    y1: "20",
                    x2: "12",
                    y2: "4"
                }),
                l.jsx("line", {
                    x1: "6",
                    y1: "20",
                    x2: "6",
                    y2: "14"
                })
            ]
        }), Rg = ()=>l.jsxs("svg", {
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("circle", {
                    cx: "12",
                    cy: "12",
                    r: "3"
                }),
                l.jsx("circle", {
                    cx: "12",
                    cy: "5",
                    r: "2"
                }),
                l.jsx("circle", {
                    cx: "19",
                    cy: "16",
                    r: "2"
                }),
                l.jsx("circle", {
                    cx: "5",
                    cy: "16",
                    r: "2"
                }),
                l.jsx("line", {
                    x1: "12",
                    y1: "7",
                    x2: "12",
                    y2: "9"
                }),
                l.jsx("line", {
                    x1: "16.9",
                    y1: "14.5",
                    x2: "14.6",
                    y2: "13.3"
                }),
                l.jsx("line", {
                    x1: "7.1",
                    y1: "14.5",
                    x2: "9.4",
                    y2: "13.3"
                })
            ]
        }), Ng = ()=>l.jsxs("svg", {
            width: "20",
            height: "20",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: [
                l.jsx("rect", {
                    x: "2",
                    y: "2",
                    width: "20",
                    height: "20",
                    rx: "2"
                }),
                l.jsx("path", {
                    d: "M7 2v20"
                }),
                l.jsx("path", {
                    d: "M17 2v20"
                }),
                l.jsx("path", {
                    d: "M2 12h20"
                }),
                l.jsx("path", {
                    d: "M2 7h5"
                }),
                l.jsx("path", {
                    d: "M2 17h5"
                }),
                l.jsx("path", {
                    d: "M17 7h5"
                }),
                l.jsx("path", {
                    d: "M17 17h5"
                })
            ]
        }), ls = {
        void: {
            top: "#06080d",
            bottom: "#06080d",
            label: "Void"
        },
        deep: {
            top: "#06080d",
            bottom: "#0c1220",
            label: "Deep Space"
        },
        midnight: {
            top: "#080c18",
            bottom: "#141e38",
            label: "Midnight"
        },
        studio: {
            top: "#1a1a2e",
            bottom: "#16213e",
            label: "Studio"
        },
        warm: {
            top: "#1a100c",
            bottom: "#0d0906",
            label: "Warm Dark"
        },
        fog: {
            top: "#101418",
            bottom: "#1c2028",
            label: "Fog"
        }
    };
    function Bg(a, r) {
        if (a.startsWith("palette:")) {
            const [, s] = a.split(":");
            return mb(s ?? r);
        }
        return ls[a] ?? ls.void;
    }
    function Og({ top: a, bottom: r, style: s = "linear" }) {
        const { scene: u } = ze();
        return y.useEffect(()=>{
            const d = document.createElement("canvas"), m = 1024;
            d.width = m, d.height = m;
            const h = d.getContext("2d");
            let v;
            s === "radial" ? (v = h.createRadialGradient(m / 2, m / 2, 0, m / 2, m / 2, m / 1.5), v.addColorStop(0, a), v.addColorStop(1, r)) : s === "spotlight" ? (v = h.createRadialGradient(m / 2, 0, 0, m / 2, 0, m / 1.2), v.addColorStop(0, a), v.addColorStop(1, r)) : (v = h.createLinearGradient(0, 0, 0, m), v.addColorStop(0, a), v.addColorStop(1, r)), h.fillStyle = v, h.fillRect(0, 0, m, m);
            const b = new tf(d);
            return b.mapping = wh, u.background = b, u.fog = new kh(r, .0015), ()=>{
                b.dispose(), u.background = null, u.fog = null;
            };
        }, [
            u,
            a,
            r,
            s
        ]), null;
    }
    class Lg extends y.Component {
        state = {
            error: null
        };
        static getDerivedStateFromError(r) {
            return {
                error: r.message
            };
        }
        render() {
            return this.state.error ? l.jsxs("div", {
                style: {
                    padding: 16,
                    color: "var(--danger)",
                    fontSize: "var(--fs-xs)",
                    fontFamily: "var(--font-mono)"
                },
                children: [
                    l.jsx("div", {
                        style: {
                            marginBottom: 8,
                            fontWeight: 600,
                            textTransform: "uppercase"
                        },
                        children: "Panel Error"
                    }),
                    this.state.error
                ]
            }) : this.props.children;
        }
    }
    function Ug(a) {
        const [r, s] = y.useState(!1);
        return y.useEffect(()=>{
            const u = window.matchMedia(a);
            u.matches !== r && s(u.matches);
            const d = ()=>s(u.matches);
            return u.addEventListener("change", d), ()=>u.removeEventListener("change", d);
        }, [
            r,
            a
        ]), r;
    }
    function $g({ fileId: a, center: r, distance: s }) {
        const { camera: u, controls: d } = ze((h)=>({
                camera: h.camera,
                controls: h.controls
            })), m = $((h)=>h.flythroughPreview);
        return mn(()=>{
            if (m) {
                const h = $.getState();
                u.position.set(...h.cameraPosition), u.lookAt(...h.cameraTarget), u instanceof Xn && (u.fov = h.cameraFov, u.updateProjectionMatrix()), d && d.target && (d.target.set(...h.cameraTarget), d.update());
            }
        }), y.useEffect(()=>{
            a && (u.position.set(r[0], r[1], r[2] + s), u.lookAt(r[0], r[1], r[2]), u.updateProjectionMatrix(), d && d.target && (d.target.set(r[0], r[1], r[2]), d.update()), $.getState().setCameraState(u.position.toArray(), r));
        }, [
            a,
            r,
            s,
            u,
            d
        ]), y.useEffect(()=>$.subscribe((v)=>v.cameraPreset, (v)=>{
                const { cameraPosition: b, cameraTarget: C } = $.getState();
                u.position.set(...b), u.lookAt(...C), u.updateProjectionMatrix(), d && d.target && (d.target.set(...C), d.update());
            }), [
            u,
            d
        ]), null;
    }
    function Gg() {
        const a = $((L)=>L.file), r = $((L)=>L.loading), s = $((L)=>L.frame), u = $((L)=>L.playing), d = $((L)=>L.playbackSpeed), m = $((L)=>L.colorMode), h = $((L)=>L.colorProperty), v = $((L)=>L.colormap), b = $((L)=>L.ssao), C = $((L)=>L.bloom), g = $((L)=>L.dof), p = $((L)=>L.dofFocus), M = $((L)=>L.toneMapping), S = $((L)=>L.showCell), T = $((L)=>L.showAxes), j = $((L)=>L.flythroughPreview), F = $((L)=>L.showBonds), w = $((L)=>L.bondCutoff), x = $((L)=>L.renderStyle), D = $((L)=>L.atomScale), k = $((L)=>L.activePanel), E = $((L)=>L.backgroundPreset), z = $((L)=>L.backgroundStyle), G = $((L)=>L.ssaoIntensity), _ = $((L)=>L.showScaleBar), O = $((L)=>L.cameraPreset), N = $((L)=>L.setCameraPreset), V = $((L)=>L.bloomIntensity), K = $((L)=>L.setFrame), Q = $((L)=>L.nextFrame), Z = $((L)=>L.togglePlay), J = $((L)=>L.setActivePanel), A = $((L)=>L.hoveredAtom), oe = $((L)=>L.setHoveredAtom), fe = $((L)=>L.selectedAtoms), X = $((L)=>L.setSelectedAtoms), ne = $((L)=>L.hiddenAtomTypes), re = $((L)=>L.atomTypeScales), [ae, Se] = y.useState(null), ye = Ug("(max-width: 768px)"), [Me, Ue] = y.useState({
            x: 0,
            y: 0
        });
        y.useEffect(()=>{
            const L = (te)=>Ue({
                    x: te.clientX,
                    y: te.clientY
                });
            return window.addEventListener("mousemove", L), ()=>window.removeEventListener("mousemove", L);
        }, []);
        const { currentState: De, setFrame: kt } = yb(u, {
            frames: a?.trajectory.frames ?? [],
            speed: d,
            targetFPS: 60,
            mdFrameRate: 30,
            onFrame: (L)=>{
                L.frameIndex !== $.getState().frame && $.getState().setFrame(L.frameIndex);
            }
        });
        y.useEffect(()=>{
            !u && De.frameIndex !== s && kt(s);
        }, [
            s,
            u,
            kt,
            De.frameIndex
        ]), y.useEffect(()=>{
            const L = (te)=>{
                te.target.tagName !== "INPUT" && (te.key === " " && (te.preventDefault(), Z()), te.key === "ArrowRight" && Q(), te.key === "ArrowLeft" && $.getState().prevFrame(), te.key === "Escape" && J(null), te.key === "s" && !te.metaKey && !te.ctrlKey && J("style"), te.key === "e" && !te.metaKey && !te.ctrlKey && J("effects"), te.key === "a" && !te.metaKey && !te.ctrlKey && J("analysis"), te.key === "x" && !te.metaKey && !te.ctrlKey && J("export"), te.key === "b" && !te.metaKey && !te.ctrlKey && $.getState().toggleBonds(), te.key === "m" && !te.metaKey && !te.ctrlKey && J("measurement"));
            };
            return window.addEventListener("keydown", L), ()=>window.removeEventListener("keydown", L);
        }, [
            Z,
            Q,
            J
        ]), y.useEffect(()=>{
            const L = new URLSearchParams(window.location.search), te = L.get("s");
            te && $.getState().decodeFromURL(te);
            const Ie = L.get("fly");
            if (Ie) {
                const me = Tf(Ie);
                me && ($.getState().setFlythrough(me), $.getState().setActivePanel("flythrough"));
            }
            const xe = L.get("load");
            xe && !a && (async ()=>{
                try {
                    $.getState().setLoading(!0, 0);
                    const me = await fetch(xe);
                    if (!me.ok) throw new Error(`Failed to fetch ${xe}: ${me.status}`);
                    const He = await me.blob(), ut = xe.split("/").pop() ?? "file.dump", $e = new File([
                        He
                    ], ut), { parseFile: Ce } = await Zn(async ()=>{
                        const { parseFile: Pt } = await Promise.resolve().then(()=>es);
                        return {
                            parseFile: Pt
                        };
                    }, void 0, import.meta.url), gt = await Ce($e);
                    if (gt.trajectory) $.getState().setFile({
                        name: ut,
                        size: He.size,
                        trajectory: gt.trajectory,
                        thermo: gt.thermo ?? null,
                        sourceUrl: xe
                    });
                    else throw new Error("No trajectory data found");
                } catch (me) {
                    $.getState().setError(me.message);
                }
            })();
        }, []);
        const je = a?.trajectory.frames[s], se = a?.trajectory.totalFrames ?? 0, nt = y.useMemo(()=>a ? (()=>{
                const { min: L, max: te } = a.trajectory.globalBounds, Ie = te[0] - L[0], xe = te[1] - L[1], me = te[2] - L[2];
                return Math.hypot(Ie, xe, me) * 1.4;
            })() : 50, [
            a?.name
        ]), Re = y.useMemo(()=>a ? a.trajectory.globalBounds.min.map((L, te)=>(L + a.trajectory.globalBounds.max[te]) / 2) : [
                0,
                0,
                0
            ], [
            a?.name
        ]), qe = je ? Array.from(je.properties?.keys() ?? []) : [], lt = Bg(E, v);
        return l.jsxs("div", {
            style: {
                width: "100vw",
                height: "100vh",
                background: `linear-gradient(180deg, ${lt.top}, ${lt.bottom})`,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
            },
            children: [
                l.jsxs("header", {
                    style: {
                        height: 56,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 20px",
                        borderBottom: "1px solid var(--border-subtle)",
                        background: "var(--bg-glass)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        zIndex: 200
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 12
                            },
                            children: [
                                l.jsxs("button", {
                                    onClick: ()=>{
                                        a && $.getState().clearFile();
                                    },
                                    style: {
                                        display: "flex",
                                        alignItems: "baseline",
                                        gap: 4,
                                        background: "none",
                                        border: "none",
                                        padding: 0,
                                        cursor: a ? "pointer" : "default"
                                    },
                                    children: [
                                        l.jsx("span", {
                                            style: {
                                                fontSize: 20,
                                                fontWeight: 700,
                                                color: "var(--text-primary)",
                                                letterSpacing: "-0.02em"
                                            },
                                            children: "glim"
                                        }),
                                        l.jsx("span", {
                                            style: {
                                                fontSize: 20,
                                                fontWeight: 500,
                                                color: "var(--accent)"
                                            },
                                            children: "PSE"
                                        })
                                    ]
                                }),
                                a && l.jsxs(l.Fragment, {
                                    children: [
                                        l.jsx("div", {
                                            style: {
                                                width: 1,
                                                height: 18,
                                                background: "var(--border-subtle)"
                                            }
                                        }),
                                        l.jsx("span", {
                                            style: {
                                                fontSize: 14,
                                                color: "var(--text-muted)",
                                                maxWidth: 280,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap"
                                            },
                                            children: a.name
                                        }),
                                        l.jsx("button", {
                                            onClick: ()=>$.getState().clearFile(),
                                            title: "Close",
                                            style: {
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                width: 24,
                                                height: 24,
                                                background: "transparent",
                                                border: "1px solid var(--border-subtle)",
                                                borderRadius: "var(--radius-sm)",
                                                color: "var(--text-dim)",
                                                cursor: "pointer"
                                            },
                                            children: l.jsx(Fg, {})
                                        })
                                    ]
                                })
                            ]
                        }),
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 8
                            },
                            children: [
                                a?.sourceUrl && l.jsxs("button", {
                                    onClick: ()=>{
                                        const L = $.getState().encodeToURL(), te = `${window.location.origin}${window.location.pathname}?load=${encodeURIComponent(a.sourceUrl)}&s=${encodeURIComponent(L)}`;
                                        navigator.clipboard.writeText(te), alert("View copied to clipboard! Anyone with this link can view the exact state and orientation.");
                                    },
                                    title: "Copy shareable link",
                                    style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        padding: "8px 12px",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: "var(--text-primary)",
                                        background: "var(--bg-elevated)",
                                        border: "1px solid var(--border-default)",
                                        borderRadius: "var(--radius-sm)",
                                        cursor: "pointer"
                                    },
                                    children: [
                                        l.jsx(Tg, {}),
                                        "Share"
                                    ]
                                }),
                                !a && l.jsx("button", {
                                    onClick: async ()=>{
                                        const { Gallery: L } = await Zn(async ()=>{
                                            const { Gallery: te } = await Promise.resolve().then(()=>lb);
                                            return {
                                                Gallery: te
                                            };
                                        }, void 0, import.meta.url);
                                        window.dispatchEvent(new CustomEvent("atlas:load-demo"));
                                    },
                                    style: {
                                        padding: "8px 14px",
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: "white",
                                        background: "var(--accent)",
                                        border: "none",
                                        borderRadius: "var(--radius-sm)",
                                        cursor: "pointer"
                                    },
                                    children: "Try a demo"
                                }),
                                l.jsx("a", {
                                    href: "https://lupine.science",
                                    style: {
                                        padding: "8px 12px",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: "var(--text-primary)",
                                        background: "transparent",
                                        border: "1px solid var(--border-default)",
                                        borderRadius: "var(--radius-sm)",
                                        textDecoration: "none"
                                    },
                                    children: "Lupine Home"
                                }),
                                l.jsx("a", {
                                    href: "https://github.com/alexwelcing/lupine",
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                    style: {
                                        padding: "8px 12px",
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: "var(--text-muted)",
                                        background: "transparent",
                                        border: "1px solid var(--border-default)",
                                        borderRadius: "var(--radius-sm)",
                                        textDecoration: "none"
                                    },
                                    children: "GitHub"
                                })
                            ]
                        })
                    ]
                }),
                l.jsxs("div", {
                    style: {
                        flex: 1,
                        display: "flex",
                        position: "relative",
                        minHeight: 0
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                flex: 1,
                                position: "relative"
                            },
                            children: [
                                l.jsxs(N0, {
                                    camera: {
                                        position: [
                                            Re[0],
                                            Re[1],
                                            Re[2] + nt
                                        ],
                                        fov: 50,
                                        near: .1,
                                        far: nt * 10
                                    },
                                    gl: {
                                        antialias: !0,
                                        preserveDrawingBuffer: !0
                                    },
                                    style: {
                                        background: "transparent"
                                    },
                                    onPointerMissed: ()=>$.getState().setSelectedAtoms([]),
                                    children: [
                                        l.jsx(Sg, {}),
                                        l.jsx(Og, {
                                            top: lt.top,
                                            bottom: lt.bottom,
                                            style: z
                                        }),
                                        l.jsx("ambientLight", {
                                            intensity: .35
                                        }),
                                        l.jsx("directionalLight", {
                                            position: [
                                                5,
                                                8,
                                                6
                                            ],
                                            intensity: 1.2
                                        }),
                                        l.jsx("directionalLight", {
                                            position: [
                                                -3,
                                                -2,
                                                4
                                            ],
                                            intensity: .35
                                        }),
                                        l.jsx("directionalLight", {
                                            position: [
                                                0,
                                                -5,
                                                -3
                                            ],
                                            intensity: .15,
                                            color: "#8888ff"
                                        }),
                                        l.jsx($g, {
                                            fileId: a?.name,
                                            center: Re,
                                            distance: nt
                                        }),
                                        l.jsx(U0, {
                                            makeDefault: !0,
                                            enabled: !j,
                                            target: Re,
                                            enableDamping: !0,
                                            dampingFactor: .08,
                                            rotateSpeed: .5,
                                            panSpeed: .4,
                                            zoomSpeed: .8,
                                            onEnd: (L)=>{
                                                L?.target?.object && L?.target?.target && $.getState().setCameraState(L.target.object.position.toArray(), L.target.target.toArray());
                                            }
                                        }),
                                        je && l.jsxs(l.Fragment, {
                                            children: [
                                                l.jsx(hb, {
                                                    frame: a.trajectory.frames[De.frameIndex],
                                                    nextFrame: De.isInterpolating ? a.trajectory.frames[De.nextFrameIndex] : void 0,
                                                    interpolationFactor: De.isInterpolating ? De.interpolationFactor : 0,
                                                    colorMode: m,
                                                    colorProperty: h ?? void 0,
                                                    colormap: v,
                                                    scale: D,
                                                    renderStyle: x,
                                                    onSpatialHash: Se,
                                                    highlightedAtoms: new Set(fe),
                                                    hiddenAtomTypes: ne,
                                                    atomTypeScales: re,
                                                    botanicalMode: x === "botanical"
                                                }),
                                                F && l.jsx(bb, {
                                                    frame: je,
                                                    nextFrame: De.isInterpolating ? a.trajectory.frames[De.nextFrameIndex] : void 0,
                                                    interpolationFactor: De.isInterpolating ? De.interpolationFactor : 0,
                                                    maxBondLength: w,
                                                    renderStyle: x,
                                                    colormap: v,
                                                    colorMode: m,
                                                    radius: .12,
                                                    opacity: .85,
                                                    botanicalMode: x === "botanical"
                                                }),
                                                S && l.jsx(xb, {
                                                    bounds: je.boxBounds,
                                                    color: "#1e3050",
                                                    opacity: .3
                                                })
                                            ]
                                        }),
                                        je && ae && l.jsx(Sb, {
                                            frame: je,
                                            spatialHash: ae,
                                            enabled: !r,
                                            selectionMode: k === "measurement" ? "measure" : "single",
                                            onHover: oe,
                                            onSelect: X
                                        }),
                                        T && l.jsx(q0, {
                                            alignment: "bottom-left",
                                            margin: [
                                                72,
                                                72
                                            ],
                                            children: l.jsx(H0, {
                                                axisColors: [
                                                    "#ff4060",
                                                    "#40ff80",
                                                    "#4080ff"
                                                ],
                                                labelColor: "white"
                                            })
                                        }),
                                        l.jsxs(K0, {
                                            enableNormalPass: b,
                                            multisampling: 4,
                                            children: [
                                                b && l.jsx(J0, {
                                                    radius: .3,
                                                    intensity: G * 70,
                                                    luminanceInfluence: .5,
                                                    worldDistanceThreshold: 100,
                                                    worldDistanceFalloff: 5,
                                                    worldProximityThreshold: .5,
                                                    worldProximityFalloff: .3
                                                }),
                                                C && l.jsx(Z0, {
                                                    intensity: V,
                                                    luminanceThreshold: .7,
                                                    luminanceSmoothing: .3,
                                                    mipmapBlur: !0
                                                }),
                                                g && l.jsx(X0, {
                                                    focusDistance: p / 100,
                                                    focalLength: .02,
                                                    bokehScale: 2,
                                                    height: 480
                                                }),
                                                M !== "none" && l.jsx(eb, {
                                                    mode: M === "aces" ? xd.ACES_FILMIC : xd.REINHARD
                                                }),
                                                l.jsx(tb, {
                                                    offset: .35,
                                                    darkness: .55,
                                                    blendFunction: Bh.NORMAL
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                l.jsx(cb, {}),
                                a && je && _ && l.jsx(vb, {
                                    frame: je,
                                    cameraDistance: nt,
                                    visible: _,
                                    position: "bottom-left"
                                }),
                                a && l.jsx("div", {
                                    style: {
                                        position: "absolute",
                                        top: 16,
                                        left: 16,
                                        pointerEvents: "none"
                                    },
                                    children: l.jsxs("div", {
                                        style: {
                                            background: "rgba(0,0,0,0.4)",
                                            borderRadius: 20,
                                            padding: "6px 14px",
                                            fontSize: 13,
                                            fontWeight: 500,
                                            color: "white",
                                            backdropFilter: "blur(8px)"
                                        },
                                        children: [
                                            "Frame ",
                                            s + 1,
                                            " / ",
                                            se
                                        ]
                                    })
                                }),
                                a && l.jsxs("div", {
                                    style: {
                                        position: "absolute",
                                        top: 72,
                                        left: 16,
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 6,
                                        zIndex: 150
                                    },
                                    children: [
                                        l.jsx(Fa, {
                                            label: "XY",
                                            active: O === "top",
                                            onClick: ()=>N("top"),
                                            title: "Top view (XY plane)"
                                        }),
                                        l.jsx(Fa, {
                                            label: "XZ",
                                            active: O === "side",
                                            onClick: ()=>N("side"),
                                            title: "Side view (XZ plane)"
                                        }),
                                        l.jsx(Fa, {
                                            label: "YZ",
                                            active: O === "front",
                                            onClick: ()=>N("front"),
                                            title: "Front view (YZ plane)"
                                        }),
                                        l.jsx(Fa, {
                                            label: "ISO",
                                            active: O === "iso",
                                            onClick: ()=>N("iso"),
                                            title: "Isometric view"
                                        })
                                    ]
                                }),
                                a && !k && l.jsx("div", {
                                    style: {
                                        position: "absolute",
                                        bottom: ye ? "max(24px, env(safe-area-inset-bottom))" : 84,
                                        left: 0,
                                        right: 0,
                                        display: "flex",
                                        justifyContent: "center",
                                        pointerEvents: "none",
                                        zIndex: 150,
                                        padding: "0 16px"
                                    },
                                    children: l.jsxs("div", {
                                        style: {
                                            pointerEvents: "auto",
                                            display: "flex",
                                            gap: 8,
                                            padding: 8,
                                            background: "rgba(0,0,0,0.5)",
                                            borderRadius: 16,
                                            backdropFilter: "blur(12px)",
                                            maxWidth: "100%",
                                            overflowX: "auto",
                                            WebkitOverflowScrolling: "touch",
                                            scrollbarWidth: "none",
                                            msOverflowStyle: "none"
                                        },
                                        children: [
                                            l.jsx(In, {
                                                icon: l.jsx(Eg, {}),
                                                label: "Style",
                                                active: k === "style",
                                                onClick: ()=>J("style")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Rg, {}),
                                                label: "Atoms",
                                                active: k === "atoms",
                                                onClick: ()=>J("atoms")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(zg, {}),
                                                label: "Effects",
                                                active: k === "effects",
                                                onClick: ()=>J("effects")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Ag, {}),
                                                label: "Analysis",
                                                active: k === "analysis",
                                                onClick: ()=>J("analysis")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Ig, {}),
                                                label: "Measure",
                                                active: k === "measurement",
                                                onClick: ()=>J("measurement")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(_g, {}),
                                                label: "Export",
                                                active: k === "export",
                                                onClick: ()=>J("export")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Ng, {}),
                                                label: "Path",
                                                active: k === "flythrough",
                                                onClick: ()=>J("flythrough")
                                            }),
                                            l.jsx("div", {
                                                style: {
                                                    width: 1,
                                                    minWidth: 1,
                                                    background: "rgba(255,255,255,0.15)",
                                                    margin: "4px 0"
                                                }
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Dg, {}),
                                                label: "Reset",
                                                onClick: ()=>{
                                                    $.getState().reset();
                                                }
                                            })
                                        ]
                                    })
                                }),
                                je && A !== null && l.jsxs("div", {
                                    style: {
                                        position: "fixed",
                                        left: Me.x + 16,
                                        top: Me.y + 16,
                                        zIndex: 300,
                                        pointerEvents: "none",
                                        background: "var(--bg-glass)",
                                        backdropFilter: "blur(12px)",
                                        WebkitBackdropFilter: "blur(12px)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        padding: "10px 14px",
                                        fontSize: "var(--fs-xs)",
                                        fontFamily: "var(--font-mono)",
                                        color: "var(--text-secondary)",
                                        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                        minWidth: 160
                                    },
                                    children: [
                                        l.jsx("div", {
                                            style: {
                                                color: "var(--accent)",
                                                fontWeight: 600,
                                                marginBottom: 4
                                            },
                                            children: (()=>{
                                                const L = Cr(je.types[A]);
                                                return `${L.symbol} — ${L.name}`;
                                            })()
                                        }),
                                        l.jsxs("div", {
                                            style: {
                                                color: "var(--text-muted)"
                                            },
                                            children: [
                                                "Atom #",
                                                je.ids?.[A] ?? A + 1,
                                                " · ",
                                                (()=>{
                                                    const L = Cr(je.types[A]);
                                                    return `${L.mass.toFixed(2)} u · ${L.role}`;
                                                })()
                                            ]
                                        }),
                                        l.jsxs("div", {
                                            style: {
                                                color: "var(--text-dim)",
                                                marginTop: 4
                                            },
                                            children: [
                                                "x: ",
                                                je.positions[A * 3].toFixed(2),
                                                l.jsx("br", {}),
                                                "y: ",
                                                je.positions[A * 3 + 1].toFixed(2),
                                                l.jsx("br", {}),
                                                "z: ",
                                                je.positions[A * 3 + 2].toFixed(2)
                                            ]
                                        }),
                                        Array.from(je.properties?.entries() ?? []).slice(0, 3).map(([L, te])=>l.jsxs("div", {
                                                style: {
                                                    color: "var(--text-dim)",
                                                    marginTop: 2
                                                },
                                                children: [
                                                    L,
                                                    ": ",
                                                    te[A].toFixed(3)
                                                ]
                                            }, L))
                                    ]
                                })
                            ]
                        }),
                        k && a && l.jsx("div", {
                            style: {
                                position: "absolute",
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: ye ? "100%" : k === "export" || k === "flythrough" ? 360 : 320,
                                borderLeft: "1px solid var(--border-subtle)",
                                background: "var(--bg-surface)",
                                overflowY: "auto",
                                zIndex: 100,
                                animation: "slideInRight 200ms ease-out forwards"
                            },
                            children: l.jsxs(Lg, {
                                children: [
                                    k === "style" && l.jsx(Pb, {
                                        availableProperties: qe,
                                        bgPresets: ls
                                    }),
                                    k === "effects" && l.jsx(Tb, {}),
                                    k === "atoms" && l.jsx(ng, {}),
                                    k === "analysis" && l.jsx(Wb, {}),
                                    k === "measurement" && l.jsx(Xb, {}),
                                    k === "export" && l.jsx(Ab, {}),
                                    k === "flythrough" && l.jsx(bg, {})
                                ]
                            })
                        })
                    ]
                }),
                a && !ye && l.jsxs("div", {
                    style: {
                        height: 60,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "0 20px",
                        borderTop: "1px solid var(--border-subtle)",
                        background: "var(--bg-glass)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)"
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                gap: 4
                            },
                            children: [
                                l.jsx(Ta, {
                                    onClick: ()=>$.getState().setFrame(0),
                                    title: "First frame",
                                    icon: l.jsx(Cg, {})
                                }),
                                l.jsx(Ta, {
                                    onClick: ()=>$.getState().prevFrame(),
                                    title: "Previous [←]",
                                    icon: l.jsx(jg, {})
                                }),
                                l.jsx("button", {
                                    onClick: Z,
                                    title: "Play/Pause [Space]",
                                    style: {
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 40,
                                        height: 32,
                                        background: u ? "var(--accent-soft)" : "var(--accent)",
                                        border: "1px solid var(--accent)",
                                        borderRadius: "var(--radius-sm)",
                                        color: u ? "var(--accent)" : "white",
                                        cursor: "pointer",
                                        transition: "all 100ms ease-out"
                                    },
                                    children: u ? l.jsx(kg, {}) : l.jsx(wg, {})
                                }),
                                l.jsx(Ta, {
                                    onClick: Q,
                                    title: "Next [→]",
                                    icon: l.jsx(Pg, {})
                                }),
                                l.jsx(Ta, {
                                    onClick: ()=>$.getState().setFrame(se - 1),
                                    title: "Last frame",
                                    icon: l.jsx(Mg, {})
                                })
                            ]
                        }),
                        l.jsx(ub, {
                            thermo: a?.thermo ?? null,
                            totalFrames: se,
                            currentFrame: s,
                            onFrameChange: (L)=>{
                                u && Z(), K(L);
                            }
                        }),
                        l.jsxs("div", {
                            style: {
                                fontSize: "var(--fs-sm)",
                                fontFamily: "var(--font-mono)",
                                color: "var(--text-muted)",
                                minWidth: 90,
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums"
                            },
                            children: [
                                l.jsx("span", {
                                    style: {
                                        color: "var(--text-primary)",
                                        fontWeight: 500
                                    },
                                    children: s + 1
                                }),
                                l.jsxs("span", {
                                    style: {
                                        color: "var(--text-dim)"
                                    },
                                    children: [
                                        " / ",
                                        se
                                    ]
                                })
                            ]
                        }),
                        l.jsx("div", {
                            style: {
                                display: "flex",
                                gap: 4
                            },
                            children: [
                                .25,
                                .5,
                                1,
                                2,
                                4
                            ].map((L)=>l.jsxs("button", {
                                    onClick: ()=>$.getState().setPlaybackSpeed(L),
                                    style: {
                                        padding: "6px 8px",
                                        minWidth: 36,
                                        fontSize: "var(--fs-xs)",
                                        fontFamily: "var(--font-mono)",
                                        fontWeight: d === L ? 500 : 400,
                                        color: d === L ? "var(--accent)" : "var(--text-muted)",
                                        background: d === L ? "var(--accent-soft)" : "transparent",
                                        border: `1px solid ${d === L ? "var(--accent)" : "var(--border-default)"}`,
                                        borderRadius: "var(--radius-sm)",
                                        cursor: "pointer",
                                        transition: "all 100ms ease-out"
                                    },
                                    children: [
                                        L,
                                        "×"
                                    ]
                                }, L))
                        })
                    ]
                })
            ]
        });
    }
    function In({ icon: a, label: r, active: s, onClick: u }) {
        return l.jsxs("button", {
            onClick: u,
            title: r,
            style: {
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 12,
                border: "none",
                background: s ? "var(--accent)" : "transparent",
                color: s ? "white" : "rgba(255,255,255,0.9)",
                cursor: "pointer",
                transition: "all 150ms ease-out",
                fontSize: 13,
                fontWeight: 500,
                flexShrink: 0
            },
            onMouseEnter: (d)=>{
                s || (d.currentTarget.style.background = "rgba(255,255,255,0.1)");
            },
            onMouseLeave: (d)=>{
                s || (d.currentTarget.style.background = "transparent");
            },
            children: [
                a,
                l.jsx("span", {
                    children: r
                })
            ]
        });
    }
    function Fa({ label: a, active: r, onClick: s, title: u }) {
        return l.jsx("button", {
            onClick: s,
            title: u,
            style: {
                width: 40,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 600,
                color: r ? "white" : "rgba(255,255,255,0.7)",
                background: r ? "var(--accent)" : "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                transition: "all 100ms ease-out"
            },
            onMouseEnter: (d)=>{
                r || (d.currentTarget.style.background = "rgba(255,255,255,0.1)");
            },
            onMouseLeave: (d)=>{
                r || (d.currentTarget.style.background = "rgba(0,0,0,0.4)");
            },
            children: a
        });
    }
    function Ta({ onClick: a, title: r, icon: s }) {
        return l.jsx("button", {
            onClick: a,
            title: r,
            style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                color: "var(--text-muted)",
                background: "transparent",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                transition: "all 100ms ease-out"
            },
            onMouseEnter: (u)=>{
                u.currentTarget.style.color = "var(--text-primary)", u.currentTarget.style.borderColor = "var(--text-muted)";
            },
            onMouseLeave: (u)=>{
                u.currentTarget.style.color = "var(--text-muted)", u.currentTarget.style.borderColor = "var(--border-default)";
            },
            children: s
        });
    }
    qg = Object.freeze(Object.defineProperty({
        __proto__: null,
        default: Gg
    }, Symbol.toStringTag, {
        value: "Module"
    }));
})();
export { qg as A, ns as E, Cr as g, db as h, __tla };
