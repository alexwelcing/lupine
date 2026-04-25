const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-BcKtio0W.js","./vendor-three-DXS2DCSU.js","./vendor-postprocess-Bo_Yp5T4.js"])))=>i.map(i=>d[i]);
import { I as Xp, J as is, K as Zp, Q as Jp, X as eh, H as y, G as l, Y as th, Z as ss, O as nh, P as Xn, i as Kd, $ as wi, a0 as oh, a1 as rh, a2 as ah, a3 as lh, d as ih, S as Yd, a4 as Xd, a5 as sh, a6 as md, C as cs, R as Zd, U as ch, V as us, h as Ae, a7 as uh, a8 as dh, a9 as fh, W as mh, aa as Jd, L as pd, D as ph, F as hh, ab as Zt, ac as bh, ad as ef, ae as Wi, r as tf, af as nf, ag as gh, ah as yh, _ as Ao, ai as hd, aj as bd, ak as Da, s as xh, N as gd, al as of, am as vh, an as Sh, ao as jh, l as Ch, ap as wh, aq as kh } from "./vendor-three-DXS2DCSU.js";
import { E as Ph, R as Mh, N as Fh, D as Th, a as yd, b as Eh, S as zh, c as Ih, M as _h, P as Dh, B as Ah, T as Rh, V as Nh, d as xd, e as Bh } from "./vendor-postprocess-Bo_Yp5T4.js";
let Vg, ns, Cr, ub;
let __tla = (async ()=>{
    const { useSyncExternalStoreWithSelector: Lh } = Zp, Oh = (r)=>r;
    function Uh(r, a = Oh, s) {
        const u = Lh(r.subscribe, r.getState, r.getInitialState, a, s);
        return is.useDebugValue(u), u;
    }
    const vd = (r, a)=>{
        const s = Xp(r), u = (d, m = a)=>Uh(s, d, m);
        return Object.assign(u, s), u;
    }, rf = ((r, a)=>r ? vd(r, a) : vd);
    var Qi = Jp();
    const $h = eh(Qi);
    function ds(r, a, s) {
        if (!r) return;
        if (s(r) === !0) return r;
        let u = a ? r.return : r.child;
        for(; u;){
            const d = ds(u, a, s);
            if (d) return d;
            u = a ? null : u.sibling;
        }
    }
    function af(r) {
        try {
            return Object.defineProperties(r, {
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
            return r;
        }
    }
    const fs = af(y.createContext(null));
    class lf extends y.Component {
        render() {
            return y.createElement(fs.Provider, {
                value: this._reactInternals
            }, this.props.children);
        }
    }
    function sf() {
        const r = y.useContext(fs);
        if (r === null) throw new Error("its-fine: useFiber must be called within a <FiberProvider />!");
        const a = y.useId();
        return y.useMemo(()=>{
            for (const s of [
                r,
                r?.alternate
            ]){
                if (!s) continue;
                const u = ds(s, !1, (d)=>{
                    let m = d.memoizedState;
                    for(; m;){
                        if (m.memoizedState === a) return !0;
                        m = m.next;
                    }
                });
                if (u) return u;
            }
        }, [
            r,
            a
        ]);
    }
    const Gh = Symbol.for("react.context"), Wh = (r)=>r !== null && typeof r == "object" && "$$typeof" in r && r.$$typeof === Gh;
    function Qh() {
        const r = sf(), [a] = y.useState(()=>new Map);
        a.clear();
        let s = r;
        for(; s;){
            const u = s.type;
            Wh(u) && u !== fs && !a.has(u) && a.set(u, y.use(af(u))), s = s.return;
        }
        return a;
    }
    function Vh() {
        const r = Qh();
        return y.useMemo(()=>Array.from(r.keys()).reduce((a, s)=>(u)=>y.createElement(a, null, y.createElement(s.Provider, {
                        ...u,
                        value: r.get(s)
                    })), (a)=>y.createElement(lf, {
                    ...a
                })), [
            r
        ]);
    }
    function cf(r) {
        let a = r.root;
        for(; a.getState().previousRoot;)a = a.getState().previousRoot;
        return a;
    }
    const uf = (r)=>r && r.isOrthographicCamera, qh = (r)=>r && r.hasOwnProperty("current"), Hh = (r)=>r != null && (typeof r == "string" || typeof r == "number" || r.isColor), wr = ((r, a)=>typeof window < "u" && (((r = window.document) == null ? void 0 : r.createElement) || ((a = window.navigator) == null ? void 0 : a.product) === "ReactNative"))() ? y.useLayoutEffect : y.useEffect;
    function ms(r) {
        const a = y.useRef(r);
        return wr(()=>void (a.current = r), [
            r
        ]), a;
    }
    function Kh() {
        const r = sf(), a = Vh();
        return y.useMemo(()=>({ children: s })=>{
                const d = !!ds(r, !0, (m)=>m.type === y.StrictMode) ? y.StrictMode : y.Fragment;
                return l.jsx(d, {
                    children: l.jsx(a, {
                        children: s
                    })
                });
            }, [
            r,
            a
        ]);
    }
    function Yh({ set: r }) {
        return wr(()=>(r(new Promise(()=>null)), ()=>r(!1)), [
            r
        ]), null;
    }
    const Xh = ((r)=>(r = class extends y.Component {
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
        }, r.getDerivedStateFromError = ()=>({
                error: !0
            }), r))();
    function df(r) {
        var a;
        const s = typeof window < "u" ? (a = window.devicePixelRatio) != null ? a : 2 : 1;
        return Array.isArray(r) ? Math.min(Math.max(r[0], s), r[1]) : r;
    }
    function To(r) {
        var a;
        return (a = r.__r3f) == null ? void 0 : a.root.getState();
    }
    const Oe = {
        obj: (r)=>r === Object(r) && !Oe.arr(r) && typeof r != "function",
        fun: (r)=>typeof r == "function",
        str: (r)=>typeof r == "string",
        num: (r)=>typeof r == "number",
        boo: (r)=>typeof r == "boolean",
        und: (r)=>r === void 0,
        nul: (r)=>r === null,
        arr: (r)=>Array.isArray(r),
        equ (r, a, { arrays: s = "shallow", objects: u = "reference", strict: d = !0 } = {}) {
            if (typeof r != typeof a || !!r != !!a) return !1;
            if (Oe.str(r) || Oe.num(r) || Oe.boo(r)) return r === a;
            const m = Oe.obj(r);
            if (m && u === "reference") return r === a;
            const h = Oe.arr(r);
            if (h && s === "reference") return r === a;
            if ((h || m) && r === a) return !0;
            let v;
            for(v in r)if (!(v in a)) return !1;
            if (m && s === "shallow" && u === "shallow") {
                for(v in d ? a : r)if (!Oe.equ(r[v], a[v], {
                    strict: d,
                    objects: "reference"
                })) return !1;
            } else for(v in d ? a : r)if (r[v] !== a[v]) return !1;
            if (Oe.und(v)) {
                if (h && r.length === 0 && a.length === 0 || m && Object.keys(r).length === 0 && Object.keys(a).length === 0) return !0;
                if (r !== a) return !1;
            }
            return !0;
        }
    };
    function Zh(r) {
        r.type !== "Scene" && (r.dispose == null || r.dispose());
        for(const a in r){
            const s = r[a];
            s?.type !== "Scene" && (s == null || s.dispose == null || s.dispose());
        }
    }
    const ff = [
        "children",
        "key",
        "ref"
    ];
    function Jh(r) {
        const a = {};
        for(const s in r)ff.includes(s) || (a[s] = r[s]);
        return a;
    }
    function Aa(r, a, s, u) {
        const d = r;
        let m = d?.__r3f;
        return m || (m = {
            root: a,
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
    function jr(r, a) {
        if (!a.includes("-")) return {
            root: r,
            key: a,
            target: r[a]
        };
        if (a in r) return {
            root: r,
            key: a,
            target: r[a]
        };
        let s = r;
        const u = a.split("-");
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
                    root: r,
                    key: a,
                    target: void 0
                };
            }
            a = d, r = s, s = s[a];
        }
        return {
            root: r,
            key: a,
            target: s
        };
    }
    const Sd = /-\d+$/;
    function Ra(r, a) {
        if (Oe.str(a.props.attach)) {
            if (Sd.test(a.props.attach)) {
                const d = a.props.attach.replace(Sd, ""), { root: m, key: h } = jr(r.object, d);
                Array.isArray(m[h]) || (m[h] = []);
            }
            const { root: s, key: u } = jr(r.object, a.props.attach);
            a.previousAttach = s[u], s[u] = a.object;
        } else Oe.fun(a.props.attach) && (a.previousAttach = a.props.attach(r.object, a.object));
    }
    function Na(r, a) {
        if (Oe.str(a.props.attach)) {
            const { root: s, key: u } = jr(r.object, a.props.attach), d = a.previousAttach;
            d === void 0 ? delete s[u] : s[u] = d;
        } else a.previousAttach == null || a.previousAttach(r.object, a.object);
        delete a.previousAttach;
    }
    const Vi = [
        ...ff,
        "args",
        "dispose",
        "attach",
        "object",
        "onUpdate",
        "dispose"
    ], jd = new Map;
    function e0(r) {
        let a = jd.get(r.constructor);
        try {
            a || (a = new r.constructor, jd.set(r.constructor, a));
        } catch  {}
        return a;
    }
    function t0(r, a) {
        const s = {};
        for(const u in a)if (!Vi.includes(u) && !Oe.equ(a[u], r.props[u])) {
            s[u] = a[u];
            for(const d in a)d.startsWith(`${u}-`) && (s[d] = a[d]);
        }
        for(const u in r.props){
            if (Vi.includes(u) || a.hasOwnProperty(u)) continue;
            const { root: d, key: m } = jr(r.object, u);
            if (d.constructor && d.constructor.length === 0) {
                const h = e0(d);
                Oe.und(h) || (s[m] = h[m]);
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
    function _n(r, a) {
        var s;
        const u = r.__r3f, d = u && cf(u).getState(), m = u?.eventCount;
        for(const v in a){
            let b = a[v];
            if (Vi.includes(v)) continue;
            if (u && o0.test(v)) {
                typeof b == "function" ? u.handlers[v] = b : delete u.handlers[v], u.eventCount = Object.keys(u.handlers).length;
                continue;
            }
            if (b === void 0) continue;
            let { root: x, key: g, target: p } = jr(r, v);
            if (p === void 0 && (typeof x != "object" || x === null)) throw Error(`R3F: Cannot set "${v}". Ensure it is an object before setting "${g}".`);
            if (p instanceof md && b instanceof md) p.mask = b.mask;
            else if (p instanceof cs && Hh(b)) p.set(b);
            else if (p !== null && typeof p == "object" && typeof p.set == "function" && typeof p.copy == "function" && b != null && b.constructor && p.constructor === b.constructor) p.copy(b);
            else if (p !== null && typeof p == "object" && typeof p.set == "function" && Array.isArray(b)) typeof p.fromArray == "function" ? p.fromArray(b) : p.set(...b);
            else if (p !== null && typeof p == "object" && typeof p.set == "function" && typeof b == "number") typeof p.setScalar == "function" ? p.setScalar(b) : p.set(b);
            else {
                var h;
                x[g] = b, d && !d.linear && n0.includes(g) && (h = x[g]) != null && h.isTexture && x[g].format === Zd && x[g].type === ch && (x[g].colorSpace = Yd);
            }
        }
        if (u != null && u.parent && d != null && d.internal && (s = u.object) != null && s.isObject3D && m !== u.eventCount) {
            const v = u.object, b = d.internal.interaction.indexOf(v);
            b > -1 && d.internal.interaction.splice(b, 1), u.eventCount && v.raycast !== null && d.internal.interaction.push(v);
        }
        return u && u.props.attach === void 0 && (u.object.isBufferGeometry ? u.props.attach = "geometry" : u.object.isMaterial && (u.props.attach = "material")), u && Bo(u), r;
    }
    function Bo(r) {
        var a;
        if (!r.parent) return;
        r.props.onUpdate == null || r.props.onUpdate(r.object);
        const s = (a = r.root) == null || a.getState == null ? void 0 : a.getState();
        s && s.internal.frames === 0 && s.invalidate();
    }
    function mf(r, a) {
        r.manual || (uf(r) ? (r.left = a.width / -2, r.right = a.width / 2, r.top = a.height / 2, r.bottom = a.height / -2) : r.aspect = a.width / a.height, r.updateProjectionMatrix());
    }
    const wt = (r)=>r?.isObject3D;
    function ja(r) {
        return (r.eventObject || r.object).uuid + "/" + r.index + r.instanceId;
    }
    function pf(r, a, s, u) {
        const d = s.get(a);
        d && (s.delete(a), s.size === 0 && (r.delete(u), d.target.releasePointerCapture(u)));
    }
    function r0(r, a) {
        const { internal: s } = r.getState();
        s.interaction = s.interaction.filter((u)=>u !== a), s.initialHits = s.initialHits.filter((u)=>u !== a), s.hovered.forEach((u, d)=>{
            (u.eventObject === a || u.object === a) && s.hovered.delete(d);
        }), s.capturedMap.forEach((u, d)=>{
            pf(s.capturedMap, a, u, d);
        });
    }
    function a0(r) {
        function a(b) {
            const { internal: x } = r.getState(), g = b.offsetX - x.initialClick[0], p = b.offsetY - x.initialClick[1];
            return Math.round(Math.sqrt(g * g + p * p));
        }
        function s(b) {
            return b.filter((x)=>[
                    "Move",
                    "Over",
                    "Enter",
                    "Out",
                    "Leave"
                ].some((g)=>{
                    var p;
                    return (p = x.__r3f) == null ? void 0 : p.handlers["onPointer" + g];
                }));
        }
        function u(b, x) {
            const g = r.getState(), p = new Set, P = [], j = x ? x(g.internal.interaction) : g.internal.interaction;
            for(let C = 0; C < j.length; C++){
                const S = To(j[C]);
                S && (S.raycaster.camera = void 0);
            }
            g.previousRoot || g.events.compute == null || g.events.compute(b, g);
            function E(C) {
                const S = To(C);
                if (!S || !S.events.enabled || S.raycaster.camera === null) return [];
                if (S.raycaster.camera === void 0) {
                    var D;
                    S.events.compute == null || S.events.compute(b, S, (D = S.previousRoot) == null ? void 0 : D.getState()), S.raycaster.camera === void 0 && (S.raycaster.camera = null);
                }
                return S.raycaster.camera ? S.raycaster.intersectObject(C, !0) : [];
            }
            let w = j.flatMap(E).sort((C, S)=>{
                const D = To(C.object), k = To(S.object);
                return !D || !k ? C.distance - S.distance : k.events.priority - D.events.priority || C.distance - S.distance;
            }).filter((C)=>{
                const S = ja(C);
                return p.has(S) ? !1 : (p.add(S), !0);
            });
            g.events.filter && (w = g.events.filter(w, g));
            for (const C of w){
                let S = C.object;
                for(; S;){
                    var F;
                    (F = S.__r3f) != null && F.eventCount && P.push({
                        ...C,
                        eventObject: S
                    }), S = S.parent;
                }
            }
            if ("pointerId" in b && g.internal.capturedMap.has(b.pointerId)) for (let C of g.internal.capturedMap.get(b.pointerId).values())p.has(ja(C.intersection)) || P.push(C.intersection);
            return P;
        }
        function d(b, x, g, p) {
            if (b.length) {
                const P = {
                    stopped: !1
                };
                for (const j of b){
                    let E = To(j.object);
                    if (E || j.object.traverseAncestors((w)=>{
                        const F = To(w);
                        if (F) return E = F, !1;
                    }), E) {
                        const { raycaster: w, pointer: F, camera: C, internal: S } = E, D = new Ae(F.x, F.y, 0).unproject(C), k = (O)=>{
                            var R, K;
                            return (R = (K = S.capturedMap.get(O)) == null ? void 0 : K.has(j.eventObject)) != null ? R : !1;
                        }, T = (O)=>{
                            const R = {
                                intersection: j,
                                target: x.target
                            };
                            S.capturedMap.has(O) ? S.capturedMap.get(O).set(j.eventObject, R) : S.capturedMap.set(O, new Map([
                                [
                                    j.eventObject,
                                    R
                                ]
                            ])), x.target.setPointerCapture(O);
                        }, z = (O)=>{
                            const R = S.capturedMap.get(O);
                            R && pf(S.capturedMap, j.eventObject, R, O);
                        };
                        let G = {};
                        for(let O in x){
                            let R = x[O];
                            typeof R != "function" && (G[O] = R);
                        }
                        let _ = {
                            ...j,
                            ...G,
                            pointer: F,
                            intersections: b,
                            stopped: P.stopped,
                            delta: g,
                            unprojectedPoint: D,
                            ray: w.ray,
                            camera: C,
                            stopPropagation () {
                                const O = "pointerId" in x && S.capturedMap.get(x.pointerId);
                                if ((!O || O.has(j.eventObject)) && (_.stopped = P.stopped = !0, S.hovered.size && Array.from(S.hovered.values()).find((R)=>R.eventObject === j.eventObject))) {
                                    const R = b.slice(0, b.indexOf(j));
                                    m([
                                        ...R,
                                        j
                                    ]);
                                }
                            },
                            target: {
                                hasPointerCapture: k,
                                setPointerCapture: T,
                                releasePointerCapture: z
                            },
                            currentTarget: {
                                hasPointerCapture: k,
                                setPointerCapture: T,
                                releasePointerCapture: z
                            },
                            nativeEvent: x
                        };
                        if (p(_), P.stopped === !0) break;
                    }
                }
            }
            return b;
        }
        function m(b) {
            const { internal: x } = r.getState();
            for (const g of x.hovered.values())if (!b.length || !b.find((p)=>p.object === g.object && p.index === g.index && p.instanceId === g.instanceId)) {
                const P = g.eventObject.__r3f;
                if (x.hovered.delete(ja(g)), P != null && P.eventCount) {
                    const j = P.handlers, E = {
                        ...g,
                        intersections: b
                    };
                    j.onPointerOut == null || j.onPointerOut(E), j.onPointerLeave == null || j.onPointerLeave(E);
                }
            }
        }
        function h(b, x) {
            for(let g = 0; g < x.length; g++){
                const p = x[g].__r3f;
                p == null || p.handlers.onPointerMissed == null || p.handlers.onPointerMissed(b);
            }
        }
        function v(b) {
            switch(b){
                case "onPointerLeave":
                case "onPointerCancel":
                    return ()=>m([]);
                case "onLostPointerCapture":
                    return (x)=>{
                        const { internal: g } = r.getState();
                        "pointerId" in x && g.capturedMap.has(x.pointerId) && requestAnimationFrame(()=>{
                            g.capturedMap.has(x.pointerId) && (g.capturedMap.delete(x.pointerId), m([]));
                        });
                    };
            }
            return function(g) {
                const { onPointerMissed: p, internal: P } = r.getState();
                P.lastEvent.current = g;
                const j = b === "onPointerMove", E = b === "onClick" || b === "onContextMenu" || b === "onDoubleClick", F = u(g, j ? s : void 0), C = E ? a(g) : 0;
                b === "onPointerDown" && (P.initialClick = [
                    g.offsetX,
                    g.offsetY
                ], P.initialHits = F.map((D)=>D.eventObject)), E && !F.length && C <= 2 && (h(g, P.interaction), p && p(g)), j && m(F);
                function S(D) {
                    const k = D.eventObject, T = k.__r3f;
                    if (!(T != null && T.eventCount)) return;
                    const z = T.handlers;
                    if (j) {
                        if (z.onPointerOver || z.onPointerEnter || z.onPointerOut || z.onPointerLeave) {
                            const G = ja(D), _ = P.hovered.get(G);
                            _ ? _.stopped && D.stopPropagation() : (P.hovered.set(G, D), z.onPointerOver == null || z.onPointerOver(D), z.onPointerEnter == null || z.onPointerEnter(D));
                        }
                        z.onPointerMove == null || z.onPointerMove(D);
                    } else {
                        const G = z[b];
                        G ? (!E || P.initialHits.includes(k)) && (h(g, P.interaction.filter((_)=>!P.initialHits.includes(_))), G(D)) : E && P.initialHits.includes(k) && h(g, P.interaction.filter((_)=>!P.initialHits.includes(_)));
                    }
                }
                d(F, g, C, S);
            };
        }
        return {
            handlePointer: v
        };
    }
    const Cd = (r)=>!!(r != null && r.render), ps = y.createContext(null), l0 = (r, a)=>{
        const s = rf((v, b)=>{
            const x = new Ae, g = new Ae, p = new Ae;
            function P(C = b().camera, S = g, D = b().size) {
                const { width: k, height: T, top: z, left: G } = D, _ = k / T;
                S.isVector3 ? p.copy(S) : p.set(...S);
                const O = C.getWorldPosition(x).distanceTo(p);
                if (uf(C)) return {
                    width: k / C.zoom,
                    height: T / C.zoom,
                    top: z,
                    left: G,
                    factor: 1,
                    distance: O,
                    aspect: _
                };
                {
                    const R = C.fov * Math.PI / 180, K = 2 * Math.tan(R / 2) * O, X = K * (k / T);
                    return {
                        width: X,
                        height: K,
                        top: z,
                        left: G,
                        factor: k / X,
                        distance: O,
                        aspect: _
                    };
                }
            }
            let j;
            const E = (C)=>v((S)=>({
                        performance: {
                            ...S.performance,
                            current: C
                        }
                    })), w = new us;
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
                invalidate: (C = 1)=>r(b(), C),
                advance: (C, S)=>a(C, S, b()),
                legacy: !1,
                linear: !1,
                flat: !1,
                controls: null,
                clock: new uh,
                pointer: w,
                mouse: w,
                frameloop: "always",
                onPointerMissed: void 0,
                performance: {
                    current: 1,
                    min: .5,
                    max: 1,
                    debounce: 200,
                    regress: ()=>{
                        const C = b();
                        j && clearTimeout(j), C.performance.current !== C.performance.min && E(C.performance.min), j = setTimeout(()=>E(b().performance.max), C.performance.debounce);
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
                    getCurrentViewport: P
                },
                setEvents: (C)=>v((S)=>({
                            ...S,
                            events: {
                                ...S.events,
                                ...C
                            }
                        })),
                setSize: (C, S, D = 0, k = 0)=>{
                    const T = b().camera, z = {
                        width: C,
                        height: S,
                        top: D,
                        left: k
                    };
                    v((G)=>({
                            size: z,
                            viewport: {
                                ...G.viewport,
                                ...P(T, g, z)
                            }
                        }));
                },
                setDpr: (C)=>v((S)=>{
                        const D = df(C);
                        return {
                            viewport: {
                                ...S.viewport,
                                dpr: D,
                                initialDpr: S.viewport.initialDpr || D
                            }
                        };
                    }),
                setFrameloop: (C = "always")=>{
                    const S = b().clock;
                    S.stop(), S.elapsedTime = 0, C !== "never" && (S.start(), S.elapsedTime = 0), v(()=>({
                            frameloop: C
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
                    subscribe: (C, S, D)=>{
                        const k = b().internal;
                        return k.priority = k.priority + (S > 0 ? 1 : 0), k.subscribers.push({
                            ref: C,
                            priority: S,
                            store: D
                        }), k.subscribers = k.subscribers.sort((T, z)=>T.priority - z.priority), ()=>{
                            const T = b().internal;
                            T != null && T.subscribers && (T.priority = T.priority - (S > 0 ? 1 : 0), T.subscribers = T.subscribers.filter((z)=>z.ref !== C));
                        };
                    }
                }
            };
        }), u = s.getState();
        let d = u.size, m = u.viewport.dpr, h = u.camera;
        return s.subscribe(()=>{
            const { camera: v, size: b, viewport: x, gl: g, set: p } = s.getState();
            if (b.width !== d.width || b.height !== d.height || x.dpr !== m) {
                d = b, m = x.dpr, mf(v, b), x.dpr > 0 && g.setPixelRatio(x.dpr);
                const P = typeof HTMLCanvasElement < "u" && g.domElement instanceof HTMLCanvasElement;
                g.setSize(b.width, b.height, P);
            }
            v !== h && (h = v, p((P)=>({
                    viewport: {
                        ...P.viewport,
                        ...P.viewport.getCurrentViewport(v)
                    }
                })));
        }), s.subscribe((v)=>r(v)), s;
    };
    function hs() {
        const r = y.useContext(ps);
        if (!r) throw new Error("R3F: Hooks can only be used within the Canvas component!");
        return r;
    }
    function ze(r = (s)=>s, a) {
        return hs()(r, a);
    }
    function mn(r, a = 0) {
        const s = hs(), u = s.getState().internal.subscribe, d = ms(r);
        return wr(()=>u(d, a, s), [
            a,
            u,
            s
        ]), null;
    }
    const i0 = 1, s0 = 8, c0 = 32, u0 = 2;
    var d0 = {
        version: "9.5.0"
    };
    function f0(r) {
        return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
    }
    var wd = {
        exports: {}
    }, kd = {
        exports: {}
    }, Pd;
    function m0() {
        return Pd || (Pd = 1, (function(r) {
            r.exports = function(a) {
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
                            for(var f = !1, M = i.child; M;){
                                if (M === n) {
                                    f = !0, n = i, o = c;
                                    break;
                                }
                                if (M === o) {
                                    f = !0, o = i, n = c;
                                    break;
                                }
                                M = M.sibling;
                            }
                            if (!f) {
                                for(M = c.child; M;){
                                    if (M === n) {
                                        f = !0, n = c, o = i;
                                        break;
                                    }
                                    if (M === o) {
                                        f = !0, o = c, n = i;
                                        break;
                                    }
                                    M = M.sibling;
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
                function x(e) {
                    var t = e.tag;
                    if (t === 5 || t === 26 || t === 27 || t === 6) return e;
                    for(e = e.child; e !== null;){
                        if (e.tag !== 4 && (t = x(e), t !== null)) return t;
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
                        case so:
                            return "Fragment";
                        case Wl:
                            return "Profiler";
                        case Eu:
                            return "StrictMode";
                        case Vl:
                            return "Suspense";
                        case ql:
                            return "SuspenseList";
                        case Kl:
                            return "Activity";
                    }
                    if (typeof e == "object") switch(e.$$typeof){
                        case io:
                            return "Portal";
                        case vn:
                            return e.displayName || "Context";
                        case zu:
                            return (e._context.displayName || "Context") + ".Consumer";
                        case Ql:
                            var t = e.render;
                            return e = e.displayName, e || (e = t.displayName || t.name || "", e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef"), e;
                        case Hl:
                            return t = e.displayName || null, t !== null ? t : p(e.type) || "Memo";
                        case Sn:
                            t = e._payload, e = e._init;
                            try {
                                return p(e(t));
                            } catch  {}
                    }
                    return null;
                }
                function P(e) {
                    return {
                        current: e
                    };
                }
                function j(e) {
                    0 > fo || (e.current = ti[fo], ti[fo] = null, fo--);
                }
                function E(e, t) {
                    fo++, ti[fo] = e.current, e.current = t;
                }
                function w(e) {
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
                function C(e, t, n) {
                    var o = e.pendingLanes;
                    if (o === 0) return 0;
                    var i = 0, c = e.suspendedLanes, f = e.pingedLanes;
                    e = e.warmLanes;
                    var M = o & 134217727;
                    return M !== 0 ? (o = M & ~c, o !== 0 ? i = F(o) : (f &= M, f !== 0 ? i = F(f) : n || (n = M & ~e, n !== 0 && (i = F(n))))) : (M = o & ~c, M !== 0 ? i = F(M) : f !== 0 ? i = F(f) : n || (n = o & ~e, n !== 0 && (i = F(n)))), i === 0 ? 0 : t !== 0 && t !== i && (t & c) === 0 && (c = i & -i, n = t & -t, c >= n || c === 32 && (n & 4194048) !== 0) ? t : i;
                }
                function S(e, t) {
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
                    var e = oa;
                    return oa <<= 1, (oa & 62914560) === 0 && (oa = 4194304), e;
                }
                function T(e) {
                    for(var t = [], n = 0; 31 > n; n++)t.push(e);
                    return t;
                }
                function z(e, t) {
                    e.pendingLanes |= t, t !== 268435456 && (e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0);
                }
                function G(e, t, n, o, i, c) {
                    var f = e.pendingLanes;
                    e.pendingLanes = n, e.suspendedLanes = 0, e.pingedLanes = 0, e.warmLanes = 0, e.expiredLanes &= n, e.entangledLanes &= n, e.errorRecoveryDisabledLanes &= n, e.shellSuspendCounter = 0;
                    var M = e.entanglements, L = e.expirationTimes, W = e.hiddenUpdates;
                    for(n = f & ~n; 0 < n;){
                        var Y = 31 - Et(n), q = 1 << Y;
                        M[Y] = 0, L[Y] = -1;
                        var oe = W[Y];
                        if (oe !== null) for(W[Y] = null, Y = 0; Y < oe.length; Y++){
                            var de = oe[Y];
                            de !== null && (de.lane &= -536870913);
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
                function R(e, t) {
                    var n = t & -t;
                    return n = (n & 42) !== 0 ? 1 : K(n), (n & (e.suspendedLanes | t)) !== 0 ? 0 : n;
                }
                function K(e) {
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
                function X(e) {
                    return e &= -e, 2 < e ? 8 < e ? (e & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
                }
                function Q(e) {
                    if (typeof Up == "function" && $p(e), zt && typeof zt.setStrictMode == "function") try {
                        zt.setStrictMode(tr, e);
                    } catch  {}
                }
                function Z(e, t) {
                    return e === t && (e !== 0 || 1 / e === 1 / t) || e !== e && t !== t;
                }
                function te(e) {
                    if (ri === void 0) try {
                        throw Error();
                    } catch (n) {
                        var t = n.stack.trim().match(/\n( *(at )?)/);
                        ri = t && t[1] || "", rd = -1 < n.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < n.stack.indexOf("@") ? "@unknown:0:0" : "";
                    }
                    return `
` + ri + e + rd;
                }
                function V(e, t) {
                    if (!e || ai) return "";
                    ai = !0;
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
                                            } catch (de) {
                                                var oe = de;
                                            }
                                            Reflect.construct(e, [], q);
                                        } else {
                                            try {
                                                q.call();
                                            } catch (de) {
                                                oe = de;
                                            }
                                            e.call(q.prototype);
                                        }
                                    } else {
                                        try {
                                            throw Error();
                                        } catch (de) {
                                            oe = de;
                                        }
                                        (q = e()) && typeof q.catch == "function" && q.catch(function() {});
                                    }
                                } catch (de) {
                                    if (de && oe && typeof de.stack == "string") return [
                                        de.stack,
                                        oe.stack
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
                        var c = o.DetermineComponentFrameRoot(), f = c[0], M = c[1];
                        if (f && M) {
                            var L = f.split(`
`), W = M.split(`
`);
                            for(i = o = 0; o < L.length && !L[o].includes("DetermineComponentFrameRoot");)o++;
                            for(; i < W.length && !W[i].includes("DetermineComponentFrameRoot");)i++;
                            if (o === L.length || i === W.length) for(o = L.length - 1, i = W.length - 1; 1 <= o && 0 <= i && L[o] !== W[i];)i--;
                            for(; 1 <= o && 0 <= i; o--, i--)if (L[o] !== W[i]) {
                                if (o !== 1 || i !== 1) do if (o--, i--, 0 > i || L[o] !== W[i]) {
                                    var Y = `
` + L[o].replace(" at new ", " at ");
                                    return e.displayName && Y.includes("<anonymous>") && (Y = Y.replace("<anonymous>", e.displayName)), Y;
                                }
                                while (1 <= o && 0 <= i);
                                break;
                            }
                        }
                    } finally{
                        ai = !1, Error.prepareStackTrace = n;
                    }
                    return (n = e ? e.displayName || e.name : "") ? te(n) : "";
                }
                function ae(e, t) {
                    switch(e.tag){
                        case 26:
                        case 27:
                        case 5:
                            return te(e.type);
                        case 16:
                            return te("Lazy");
                        case 13:
                            return e.child !== t && t !== null ? te("Suspense Fallback") : te("Suspense");
                        case 19:
                            return te("SuspenseList");
                        case 0:
                        case 15:
                            return V(e.type, !1);
                        case 11:
                            return V(e.type.render, !1);
                        case 1:
                            return V(e.type, !0);
                        case 31:
                            return te("Activity");
                        default:
                            return "";
                    }
                }
                function pe(e) {
                    try {
                        var t = "", n = null;
                        do t += ae(e, n), n = e, e = e.return;
                        while (e);
                        return t;
                    } catch (o) {
                        return `
Error generating stack: ` + o.message + `
` + o.stack;
                    }
                }
                function U(e, t) {
                    if (typeof e == "object" && e !== null) {
                        var n = ad.get(e);
                        return n !== void 0 ? n : (t = {
                            value: e,
                            source: t,
                            stack: pe(t)
                        }, ad.set(e, t), t);
                    }
                    return {
                        value: e,
                        source: t,
                        stack: pe(t)
                    };
                }
                function J(e, t) {
                    po[ho++] = nr, po[ho++] = aa, aa = e, nr = t;
                }
                function ee(e, t, n) {
                    Nt[Bt++] = Yt, Nt[Bt++] = Xt, Nt[Bt++] = jn, jn = e;
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
                function ne(e) {
                    e.return !== null && (J(e, 1), ee(e, 1, 0));
                }
                function ue(e) {
                    for(; e === aa;)aa = po[--ho], po[ho] = null, nr = po[--ho], po[ho] = null;
                    for(; e === jn;)jn = Nt[--Bt], Nt[Bt] = null, Xt = Nt[--Bt], Nt[Bt] = null, Yt = Nt[--Bt], Nt[Bt] = null;
                }
                function he(e, t) {
                    Nt[Bt++] = Yt, Nt[Bt++] = Xt, Nt[Bt++] = jn, Yt = t.id, Xt = t.overflow, jn = e;
                }
                function Me(e, t) {
                    E(Cn, t), E(or, e), E(st, null), e = um(t), j(st), E(st, e);
                }
                function Ue() {
                    j(st), j(or), j(Cn);
                }
                function De(e) {
                    e.memoizedState !== null && E(la, e);
                    var t = st.current, n = dm(t, e.type);
                    t !== n && (E(or, e), E(st, n));
                }
                function kt(e) {
                    or.current === e && (j(st), j(or)), la.current === e && (j(la), rn ? Un._currentValue = co : Un._currentValue2 = co);
                }
                function Ce(e) {
                    var t = Error(d(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", ""));
                    throw N(U(t, e)), li;
                }
                function se(e, t) {
                    if (!mt) throw Error(d(175));
                    dp(e.stateNode, e.type, e.memoizedProps, t, e) || Ce(e, !0);
                }
                function nt(e) {
                    for(ct = e.return; ct;)switch(ct.tag){
                        case 5:
                        case 31:
                        case 13:
                            Lt = !1;
                            return;
                        case 27:
                        case 3:
                            Lt = !0;
                            return;
                        default:
                            ct = ct.return;
                    }
                }
                function Re(e) {
                    if (!mt || e !== ct) return !1;
                    if (!Se) return nt(e), Se = !0, !1;
                    var t = e.tag;
                    if (et ? t !== 3 && t !== 27 && (t !== 5 || Qu(e.type) && !ea(e.type, e.memoizedProps)) && Ne && Ce(e) : t !== 3 && (t !== 5 || Qu(e.type) && !ea(e.type, e.memoizedProps)) && Ne && Ce(e), nt(e), t === 13) {
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
                    mt && (Ne = ct = null, Se = !1);
                }
                function lt() {
                    var e = wn;
                    return e !== null && (jt === null ? jt = e : jt.push.apply(jt, e), wn = null), e;
                }
                function N(e) {
                    wn === null ? wn = [
                        e
                    ] : wn.push(e);
                }
                function re(e, t, n) {
                    rn ? (E(ia, t._currentValue), t._currentValue = n) : (E(ia, t._currentValue2), t._currentValue2 = n);
                }
                function Ie(e) {
                    var t = ia.current;
                    rn ? e._currentValue = t : e._currentValue2 = t, j(ia);
                }
                function ve(e, t, n) {
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
                                var M = c;
                                c = i;
                                for(var L = 0; L < t.length; L++)if (M.context === t[L]) {
                                    c.lanes |= n, M = c.alternate, M !== null && (M.lanes |= n), ve(c.return, n, e), o || (f = null);
                                    break e;
                                }
                                c = M.next;
                            }
                        } else if (i.tag === 18) {
                            if (f = i.return, f === null) throw Error(d(341));
                            f.lanes |= n, c = f.alternate, c !== null && (c.lanes |= n), ve(f, n, e), f = null;
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
                                var M = i.type;
                                It(i.pendingProps.value, f.value) || (e !== null ? e.push(M) : e = [
                                    M
                                ]);
                            }
                        } else if (i === la.current) {
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
                function je(e) {
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
                function kr() {}
                function qt(e) {
                    e !== bo && e.next === null && (bo === null ? sa = bo = e : bo = bo.next = e), ca = !0, ii || (ii = !0, If());
                }
                function no(e, t) {
                    if (!si && ca) {
                        si = !0;
                        do for(var n = !1, o = sa; o !== null;){
                            if (e !== 0) {
                                var i = o.pendingLanes;
                                if (i === 0) var c = 0;
                                else {
                                    var f = o.suspendedLanes, M = o.pingedLanes;
                                    c = (1 << 31 - Et(42 | e) + 1) - 1, c &= i & ~(f & ~M), c = c & 201326741 ? c & 201326741 | 1 : c ? c | 2 : 0;
                                }
                                c !== 0 && (n = !0, Cs(o, c));
                            } else c = xe, c = C(o, o === Ee ? c : 0, o.cancelPendingCommit !== null || o.timeoutHandle !== On), (c & 3) === 0 || S(o, c) || (n = !0, Cs(o, c));
                            o = o.next;
                        }
                        while (n);
                        si = !1;
                    }
                }
                function xs() {
                    vs();
                }
                function vs() {
                    ca = ii = !1;
                    var e = 0;
                    Gn !== 0 && vm() && (e = Gn);
                    for(var t = vt(), n = null, o = sa; o !== null;){
                        var i = o.next, c = Ss(o, t);
                        c === 0 ? (o.next = null, n === null ? sa = i : n.next = i, i === null && (bo = n)) : (n = o, (e !== 0 || (c & 3) !== 0) && (ca = !0)), o = i;
                    }
                    tt !== 0 && tt !== 5 || no(e), Gn !== 0 && (Gn = 0);
                }
                function Ss(e, t) {
                    for(var n = e.suspendedLanes, o = e.pingedLanes, i = e.expirationTimes, c = e.pendingLanes & -62914561; 0 < c;){
                        var f = 31 - Et(c), M = 1 << f, L = i[f];
                        L === -1 ? ((M & n) === 0 || (M & o) !== 0) && (i[f] = D(M, t)) : L <= t && (e.expiredLanes |= M), c &= ~M;
                    }
                    if (t = Ee, n = xe, n = C(e, e === t ? n : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== On), o = e.callbackNode, n === 0 || e === t && (Fe === 2 || Fe === 9) || e.cancelPendingCommit !== null) return o !== null && o !== null && ni(o), e.callbackNode = null, e.callbackPriority = 0;
                    if ((n & 3) === 0 || S(e, n)) {
                        if (t = n & -n, t === e.callbackPriority) return t;
                        switch(o !== null && ni(o), X(n)){
                            case 2:
                            case 8:
                                n = Lp;
                                break;
                            case 32:
                                n = oi;
                                break;
                            case 268435456:
                                n = Op;
                                break;
                            default:
                                n = oi;
                        }
                        return o = js.bind(null, e), n = ra(n, o), e.callbackPriority = t, e.callbackNode = n, t;
                    }
                    return o !== null && o !== null && ni(o), e.callbackPriority = 2, e.callbackNode = null, 2;
                }
                function js(e, t) {
                    if (tt !== 0 && tt !== 5) return e.callbackNode = null, e.callbackPriority = 0, null;
                    var n = e.callbackNode;
                    if (Xo() && e.callbackNode !== n) return null;
                    var o = xe;
                    return o = C(e, e === Ee ? o : 0, e.cancelPendingCommit !== null || e.timeoutHandle !== On), o === 0 ? null : (au(e, o, t), Ss(e, vt()), e.callbackNode != null && e.callbackNode === n ? js.bind(null, e) : null);
                }
                function Cs(e, t) {
                    if (Xo()) return null;
                    au(e, t, !0);
                }
                function If() {
                    Mm ? Fm(function() {
                        (ge & 6) !== 0 ? ra(nd, xs) : vs();
                    }) : ra(nd, xs);
                }
                function Wa() {
                    if (Gn === 0) {
                        var e = go;
                        e === 0 && (e = ta, ta <<= 1, (ta & 261888) === 0 && (ta = 256)), Gn = e;
                    }
                    return Gn;
                }
                function _f(e, t) {
                    if (rr === null) {
                        var n = rr = [];
                        ci = 0, go = Wa(), yo = {
                            status: "pending",
                            value: void 0,
                            then: function(o) {
                                n.push(o);
                            }
                        };
                    }
                    return ci++, t.then(ws, ws), t;
                }
                function ws() {
                    if (--ci === 0 && rr !== null) {
                        yo !== null && (yo.status = "fulfilled");
                        var e = rr;
                        rr = null, go = 0, yo = null;
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
                function Qa() {
                    var e = Wn.current;
                    return e !== null ? e : Ee.pooledCache;
                }
                function Pr(e, t) {
                    t === null ? E(Wn, Wn.current) : E(Wn, t.pool);
                }
                function ks() {
                    var e = Qa();
                    return e === null ? null : {
                        parent: rn ? Be._currentValue : Be._currentValue2,
                        pool: e
                    };
                }
                function Mr(e, t) {
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
                    switch(n = e[n], n === void 0 ? e.push(t) : n !== t && (t.then(kr, kr), t = n), t.status){
                        case "fulfilled":
                            return t.value;
                        case "rejected":
                            throw e = t.reason, Ts(e), e;
                        default:
                            if (typeof t.status == "string") t.then(kr, kr);
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
                            throw Qn = t, xo;
                    }
                }
                function Dn(e) {
                    try {
                        var t = e._init;
                        return t(e._payload);
                    } catch (n) {
                        throw n !== null && typeof n == "object" && typeof n.then == "function" ? (Qn = n, xo) : n;
                    }
                }
                function Fs() {
                    if (Qn === null) throw Error(d(459));
                    var e = Qn;
                    return Qn = null, e;
                }
                function Ts(e) {
                    if (e === xo || e === ua) throw Error(d(483));
                }
                function Fr(e) {
                    var t = ar;
                    return ar += 1, vo === null && (vo = []), Ms(vo, e, t);
                }
                function Lo(e, t) {
                    t = t.props.ref, e.ref = t !== void 0 ? t : null;
                }
                function Tr(e, t) {
                    throw t.$$typeof === am ? Error(d(525)) : (e = Object.prototype.toString.call(t), Error(d(31, e === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : e)));
                }
                function Es(e) {
                    function t(A, I) {
                        if (e) {
                            var B = A.deletions;
                            B === null ? (A.deletions = [
                                I
                            ], A.flags |= 16) : B.push(I);
                        }
                    }
                    function n(A, I) {
                        if (!e) return null;
                        for(; I !== null;)t(A, I), I = I.sibling;
                        return null;
                    }
                    function o(A) {
                        for(var I = new Map; A !== null;)A.key !== null ? I.set(A.key, A) : I.set(A.index, A), A = A.sibling;
                        return I;
                    }
                    function i(A, I) {
                        return A = on(A, I), A.index = 0, A.sibling = null, A;
                    }
                    function c(A, I, B) {
                        return A.index = B, e ? (B = A.alternate, B !== null ? (B = B.index, B < I ? (A.flags |= 67108866, I) : B) : (A.flags |= 67108866, I)) : (A.flags |= 1048576, I);
                    }
                    function f(A) {
                        return e && A.alternate === null && (A.flags |= 67108866), A;
                    }
                    function M(A, I, B, H) {
                        return I === null || I.tag !== 6 ? (I = Ol(B, A.mode, H), I.return = A, I) : (I = i(I, B), I.return = A, I);
                    }
                    function L(A, I, B, H) {
                        var ie = B.type;
                        return ie === so ? Y(A, I, B.props.children, H, B.key) : I !== null && (I.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === Sn && Dn(ie) === I.type) ? (I = i(I, B.props), Lo(I, B), I.return = A, I) : (I = Xr(B.type, B.key, B.props, null, A.mode, H), Lo(I, B), I.return = A, I);
                    }
                    function W(A, I, B, H) {
                        return I === null || I.tag !== 4 || I.stateNode.containerInfo !== B.containerInfo || I.stateNode.implementation !== B.implementation ? (I = Ul(B, A.mode, H), I.return = A, I) : (I = i(I, B.children || []), I.return = A, I);
                    }
                    function Y(A, I, B, H, ie) {
                        return I === null || I.tag !== 7 ? (I = Ln(B, A.mode, H, ie), I.return = A, I) : (I = i(I, B), I.return = A, I);
                    }
                    function q(A, I, B) {
                        if (typeof I == "string" && I !== "" || typeof I == "number" || typeof I == "bigint") return I = Ol("" + I, A.mode, B), I.return = A, I;
                        if (typeof I == "object" && I !== null) {
                            switch(I.$$typeof){
                                case Zr:
                                    return B = Xr(I.type, I.key, I.props, null, A.mode, B), Lo(B, I), B.return = A, B;
                                case io:
                                    return I = Ul(I, A.mode, B), I.return = A, I;
                                case Sn:
                                    return I = Dn(I), q(A, I, B);
                            }
                            if (Jr(I) || g(I)) return I = Ln(I, A.mode, B, null), I.return = A, I;
                            if (typeof I.then == "function") return q(A, Fr(I), B);
                            if (I.$$typeof === vn) return q(A, gt(A, I), B);
                            Tr(A, I);
                        }
                        return null;
                    }
                    function oe(A, I, B, H) {
                        var ie = I !== null ? I.key : null;
                        if (typeof B == "string" && B !== "" || typeof B == "number" || typeof B == "bigint") return ie !== null ? null : M(A, I, "" + B, H);
                        if (typeof B == "object" && B !== null) {
                            switch(B.$$typeof){
                                case Zr:
                                    return B.key === ie ? L(A, I, B, H) : null;
                                case io:
                                    return B.key === ie ? W(A, I, B, H) : null;
                                case Sn:
                                    return B = Dn(B), oe(A, I, B, H);
                            }
                            if (Jr(B) || g(B)) return ie !== null ? null : Y(A, I, B, H, null);
                            if (typeof B.then == "function") return oe(A, I, Fr(B), H);
                            if (B.$$typeof === vn) return oe(A, I, gt(A, B), H);
                            Tr(A, B);
                        }
                        return null;
                    }
                    function de(A, I, B, H, ie) {
                        if (typeof H == "string" && H !== "" || typeof H == "number" || typeof H == "bigint") return A = A.get(B) || null, M(I, A, "" + H, ie);
                        if (typeof H == "object" && H !== null) {
                            switch(H.$$typeof){
                                case Zr:
                                    return A = A.get(H.key === null ? B : H.key) || null, L(I, A, H, ie);
                                case io:
                                    return A = A.get(H.key === null ? B : H.key) || null, W(I, A, H, ie);
                                case Sn:
                                    return H = Dn(H), de(A, I, B, H, ie);
                            }
                            if (Jr(H) || g(H)) return A = A.get(B) || null, Y(I, A, H, ie, null);
                            if (typeof H.then == "function") return de(A, I, B, Fr(H), ie);
                            if (H.$$typeof === vn) return de(A, I, B, gt(I, H), ie);
                            Tr(I, H);
                        }
                        return null;
                    }
                    function Je(A, I, B, H) {
                        for(var ie = null, Le = null, ce = I, ke = I = 0, at = null; ce !== null && ke < B.length; ke++){
                            ce.index > ke ? (at = ce, ce = null) : at = ce.sibling;
                            var Pe = oe(A, ce, B[ke], H);
                            if (Pe === null) {
                                ce === null && (ce = at);
                                break;
                            }
                            e && ce && Pe.alternate === null && t(A, ce), I = c(Pe, I, ke), Le === null ? ie = Pe : Le.sibling = Pe, Le = Pe, ce = at;
                        }
                        if (ke === B.length) return n(A, ce), Se && J(A, ke), ie;
                        if (ce === null) {
                            for(; ke < B.length; ke++)ce = q(A, B[ke], H), ce !== null && (I = c(ce, I, ke), Le === null ? ie = ce : Le.sibling = ce, Le = ce);
                            return Se && J(A, ke), ie;
                        }
                        for(ce = o(ce); ke < B.length; ke++)at = de(ce, A, ke, B[ke], H), at !== null && (e && at.alternate !== null && ce.delete(at.key === null ? ke : at.key), I = c(at, I, ke), Le === null ? ie = at : Le.sibling = at, Le = at);
                        return e && ce.forEach(function(En) {
                            return t(A, En);
                        }), Se && J(A, ke), ie;
                    }
                    function fr(A, I, B, H) {
                        if (B == null) throw Error(d(151));
                        for(var ie = null, Le = null, ce = I, ke = I = 0, at = null, Pe = B.next(); ce !== null && !Pe.done; ke++, Pe = B.next()){
                            ce.index > ke ? (at = ce, ce = null) : at = ce.sibling;
                            var En = oe(A, ce, Pe.value, H);
                            if (En === null) {
                                ce === null && (ce = at);
                                break;
                            }
                            e && ce && En.alternate === null && t(A, ce), I = c(En, I, ke), Le === null ? ie = En : Le.sibling = En, Le = En, ce = at;
                        }
                        if (Pe.done) return n(A, ce), Se && J(A, ke), ie;
                        if (ce === null) {
                            for(; !Pe.done; ke++, Pe = B.next())Pe = q(A, Pe.value, H), Pe !== null && (I = c(Pe, I, ke), Le === null ? ie = Pe : Le.sibling = Pe, Le = Pe);
                            return Se && J(A, ke), ie;
                        }
                        for(ce = o(ce); !Pe.done; ke++, Pe = B.next())Pe = de(ce, A, ke, Pe.value, H), Pe !== null && (e && Pe.alternate !== null && ce.delete(Pe.key === null ? ke : Pe.key), I = c(Pe, I, ke), Le === null ? ie = Pe : Le.sibling = Pe, Le = Pe);
                        return e && ce.forEach(function(Yp) {
                            return t(A, Yp);
                        }), Se && J(A, ke), ie;
                    }
                    function Kn(A, I, B, H) {
                        if (typeof B == "object" && B !== null && B.type === so && B.key === null && (B = B.props.children), typeof B == "object" && B !== null) {
                            switch(B.$$typeof){
                                case Zr:
                                    e: {
                                        for(var ie = B.key; I !== null;){
                                            if (I.key === ie) {
                                                if (ie = B.type, ie === so) {
                                                    if (I.tag === 7) {
                                                        n(A, I.sibling), H = i(I, B.props.children), H.return = A, A = H;
                                                        break e;
                                                    }
                                                } else if (I.elementType === ie || typeof ie == "object" && ie !== null && ie.$$typeof === Sn && Dn(ie) === I.type) {
                                                    n(A, I.sibling), H = i(I, B.props), Lo(H, B), H.return = A, A = H;
                                                    break e;
                                                }
                                                n(A, I);
                                                break;
                                            } else t(A, I);
                                            I = I.sibling;
                                        }
                                        B.type === so ? (H = Ln(B.props.children, A.mode, H, B.key), H.return = A, A = H) : (H = Xr(B.type, B.key, B.props, null, A.mode, H), Lo(H, B), H.return = A, A = H);
                                    }
                                    return f(A);
                                case io:
                                    e: {
                                        for(ie = B.key; I !== null;){
                                            if (I.key === ie) if (I.tag === 4 && I.stateNode.containerInfo === B.containerInfo && I.stateNode.implementation === B.implementation) {
                                                n(A, I.sibling), H = i(I, B.children || []), H.return = A, A = H;
                                                break e;
                                            } else {
                                                n(A, I);
                                                break;
                                            }
                                            else t(A, I);
                                            I = I.sibling;
                                        }
                                        H = Ul(B, A.mode, H), H.return = A, A = H;
                                    }
                                    return f(A);
                                case Sn:
                                    return B = Dn(B), Kn(A, I, B, H);
                            }
                            if (Jr(B)) return Je(A, I, B, H);
                            if (g(B)) {
                                if (ie = g(B), typeof ie != "function") throw Error(d(150));
                                return B = ie.call(B), fr(A, I, B, H);
                            }
                            if (typeof B.then == "function") return Kn(A, I, Fr(B), H);
                            if (B.$$typeof === vn) return Kn(A, I, gt(A, B), H);
                            Tr(A, B);
                        }
                        return typeof B == "string" && B !== "" || typeof B == "number" || typeof B == "bigint" ? (B = "" + B, I !== null && I.tag === 6 ? (n(A, I.sibling), H = i(I, B), H.return = A, A = H) : (n(A, I), H = Ol(B, A.mode, H), H.return = A, A = H), f(A)) : n(A, I);
                    }
                    return function(A, I, B, H) {
                        try {
                            ar = 0;
                            var ie = Kn(A, I, B, H);
                            return vo = null, ie;
                        } catch (ce) {
                            if (ce === xo || ce === ua) throw ce;
                            var Le = s(29, ce, null, A.mode);
                            return Le.lanes = H, Le.return = A, Le;
                        } finally{}
                    };
                }
                function Er() {
                    for(var e = So, t = di = So = 0; t < e;){
                        var n = Ot[t];
                        Ot[t++] = null;
                        var o = Ot[t];
                        Ot[t++] = null;
                        var i = Ot[t];
                        Ot[t++] = null;
                        var c = Ot[t];
                        if (Ot[t++] = null, o !== null && i !== null) {
                            var f = o.pending;
                            f === null ? i.next = i : (i.next = f.next, f.next = i), o.pending = i;
                        }
                        c !== 0 && zs(n, i, c);
                    }
                }
                function zr(e, t, n, o) {
                    Ot[So++] = e, Ot[So++] = t, Ot[So++] = n, Ot[So++] = o, di |= o, e.lanes |= o, e = e.alternate, e !== null && (e.lanes |= o);
                }
                function Va(e, t, n, o) {
                    return zr(e, t, n, o), Ir(e);
                }
                function An(e, t) {
                    return zr(e, null, null, t), Ir(e);
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
                function Ir(e) {
                    if (50 < dr) throw dr = 0, Ci = null, Error(d(185));
                    for(var t = e.return; t !== null;)e = t, t = e.return;
                    return e.tag === 3 ? e.stateNode : null;
                }
                function qa(e) {
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
                function Ha(e, t) {
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
                    if (o = o.shared, (ge & 2) !== 0) {
                        var i = o.pending;
                        return i === null ? t.next = t : (t.next = i.next, i.next = t), o.pending = t, t = Ir(e), zs(e, null, n), t;
                    }
                    return zr(e, o, t, n), Ir(e);
                }
                function Oo(e, t, n) {
                    if (t = t.updateQueue, t !== null && (t = t.shared, (n & 4194048) !== 0)) {
                        var o = t.lanes;
                        o &= e.pendingLanes, n |= o, t.lanes = n, O(e, n);
                    }
                }
                function Ka(e, t) {
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
                function Uo() {
                    if (fi) {
                        var e = yo;
                        if (e !== null) throw e;
                    }
                }
                function $o(e, t, n, o) {
                    fi = !1;
                    var i = e.updateQueue;
                    kn = !1;
                    var c = i.firstBaseUpdate, f = i.lastBaseUpdate, M = i.shared.pending;
                    if (M !== null) {
                        i.shared.pending = null;
                        var L = M, W = L.next;
                        L.next = null, f === null ? c = W : f.next = W, f = L;
                        var Y = e.alternate;
                        Y !== null && (Y = Y.updateQueue, M = Y.lastBaseUpdate, M !== f && (M === null ? Y.firstBaseUpdate = W : M.next = W, Y.lastBaseUpdate = L));
                    }
                    if (c !== null) {
                        var q = i.baseState;
                        f = 0, Y = W = L = null, M = c;
                        do {
                            var oe = M.lane & -536870913, de = oe !== M.lane;
                            if (de ? (xe & oe) === oe : (o & oe) === oe) {
                                oe !== 0 && oe === go && (fi = !0), Y !== null && (Y = Y.next = {
                                    lane: 0,
                                    tag: M.tag,
                                    payload: M.payload,
                                    callback: null,
                                    next: null
                                });
                                e: {
                                    var Je = e, fr = M;
                                    oe = t;
                                    var Kn = n;
                                    switch(fr.tag){
                                        case 1:
                                            if (Je = fr.payload, typeof Je == "function") {
                                                q = Je.call(Kn, q, oe);
                                                break e;
                                            }
                                            q = Je;
                                            break e;
                                        case 3:
                                            Je.flags = Je.flags & -65537 | 128;
                                        case 0:
                                            if (Je = fr.payload, oe = typeof Je == "function" ? Je.call(Kn, q, oe) : Je, oe == null) break e;
                                            q = Gl({}, q, oe);
                                            break e;
                                        case 2:
                                            kn = !0;
                                    }
                                }
                                oe = M.callback, oe !== null && (e.flags |= 64, de && (e.flags |= 8192), de = i.callbacks, de === null ? i.callbacks = [
                                    oe
                                ] : de.push(oe));
                            } else de = {
                                lane: oe,
                                tag: M.tag,
                                payload: M.payload,
                                callback: M.callback,
                                next: null
                            }, Y === null ? (W = Y = de, L = q) : Y = Y.next = de, f |= oe;
                            if (M = M.next, M === null) {
                                if (M = i.shared.pending, M === null) break;
                                de = M, M = de.next, de.next = null, i.lastBaseUpdate = de, i.shared.pending = null;
                            }
                        }while (!0);
                        Y === null && (L = q), i.baseState = L, i.firstBaseUpdate = W, i.lastBaseUpdate = Y, c === null && (i.shared.lanes = 0), Mn |= f, e.lanes = f, e.memoizedState = q;
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
                    e = un, E(fa, e), E(jo, t), un = e | t.baseLanes;
                }
                function Ya() {
                    E(fa, un), E(jo, jo.current);
                }
                function Xa() {
                    un = fa.current, j(jo), j(fa);
                }
                function bn(e) {
                    var t = e.alternate;
                    E(Ve, Ve.current & 1), E(_t, e), Qt === null && (t === null || jo.current !== null || t.memoizedState !== null) && (Qt = e);
                }
                function Za(e) {
                    E(Ve, Ve.current), E(_t, e), Qt === null && (Qt = e);
                }
                function As(e) {
                    e.tag === 22 ? (E(Ve, Ve.current), E(_t, e), Qt === null && (Qt = e)) : gn();
                }
                function gn() {
                    E(Ve, Ve.current), E(_t, _t.current);
                }
                function Mt(e) {
                    j(_t), Qt === e && (Qt = null), j(Ve);
                }
                function _r(e) {
                    for(var t = e; t !== null;){
                        if (t.tag === 13) {
                            var n = t.memoizedState;
                            if (n !== null && (n = n.dehydrated, n === null || Zl(n) || Jl(n))) return t;
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
                function Ja(e, t) {
                    if (t === null) return !1;
                    for(var n = 0; n < t.length && n < e.length; n++)if (!It(e[n], t[n])) return !1;
                    return !0;
                }
                function el(e, t, n, o, i, c) {
                    return sn = c, fe = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, le.H = e === null || e.memoizedState === null ? sd : mi, qn = !1, c = n(o, i), qn = !1, Co && (c = Ns(t, n, o, i)), Rs(e), c;
                }
                function Rs(e) {
                    le.H = ir;
                    var t = Te !== null && Te.next !== null;
                    if (sn = 0, Ke = Te = fe = null, ma = !1, lr = 0, wo = null, t) throw Error(d(300));
                    e === null || Ye || (e = e.dependencies, e !== null && ut(e) && (Ye = !0));
                }
                function Ns(e, t, n, o) {
                    fe = e;
                    var i = 0;
                    do {
                        if (Co && (wo = null), lr = 0, Co = !1, 25 <= i) throw Error(d(301));
                        if (i += 1, Ke = Te = null, e.updateQueue != null) {
                            var c = e.updateQueue;
                            c.lastEffect = null, c.events = null, c.stores = null, c.memoCache != null && (c.memoCache.index = 0);
                        }
                        le.H = cd, c = t(n, o);
                    }while (Co);
                    return c;
                }
                function Af() {
                    var e = le.H, t = e.useState()[0];
                    return t = typeof t.then == "function" ? Go(t) : t, e = e.useState()[0], (Te !== null ? Te.memoizedState : null) !== e && (fe.flags |= 1024), t;
                }
                function tl() {
                    var e = pa !== 0;
                    return pa = 0, e;
                }
                function nl(e, t, n) {
                    t.updateQueue = e.updateQueue, t.flags &= -2053, e.lanes &= ~n;
                }
                function ol(e) {
                    if (ma) {
                        for(e = e.memoizedState; e !== null;){
                            var t = e.queue;
                            t !== null && (t.pending = null), e = e.next;
                        }
                        ma = !1;
                    }
                    sn = 0, Ke = Te = fe = null, Co = !1, lr = pa = 0, wo = null;
                }
                function pt() {
                    var e = {
                        memoizedState: null,
                        baseState: null,
                        baseQueue: null,
                        queue: null,
                        next: null
                    };
                    return Ke === null ? fe.memoizedState = Ke = e : Ke = Ke.next = e, Ke;
                }
                function Qe() {
                    if (Te === null) {
                        var e = fe.alternate;
                        e = e !== null ? e.memoizedState : null;
                    } else e = Te.next;
                    var t = Ke === null ? fe.memoizedState : Ke.next;
                    if (t !== null) Ke = t, Te = e;
                    else {
                        if (e === null) throw fe.alternate === null ? Error(d(467)) : Error(d(310));
                        Te = e, e = {
                            memoizedState: Te.memoizedState,
                            baseState: Te.baseState,
                            baseQueue: Te.baseQueue,
                            queue: Te.queue,
                            next: null
                        }, Ke === null ? fe.memoizedState = Ke = e : Ke = Ke.next = e;
                    }
                    return Ke;
                }
                function Dr() {
                    return {
                        lastEffect: null,
                        events: null,
                        stores: null,
                        memoCache: null
                    };
                }
                function Go(e) {
                    var t = lr;
                    return lr += 1, wo === null && (wo = []), e = Ms(wo, e, t), t = fe, (Ke === null ? t.memoizedState : Ke.next) === null && (t = t.alternate, le.H = t === null || t.memoizedState === null ? sd : mi), e;
                }
                function Ar(e) {
                    if (e !== null && typeof e == "object") {
                        if (typeof e.then == "function") return Go(e);
                        if (e.$$typeof === vn) return je(e);
                    }
                    throw Error(d(438, String(e)));
                }
                function rl(e) {
                    var t = null, n = fe.updateQueue;
                    if (n !== null && (t = n.memoCache), t == null) {
                        var o = fe.alternate;
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
                    }), n === null && (n = Dr(), fe.updateQueue = n), n.memoCache = t, n = t.data[t.index], n === void 0) for(n = t.data[t.index] = Array(e), o = 0; o < e; o++)n[o] = lm;
                    return t.index++, n;
                }
                function Jt(e, t) {
                    return typeof t == "function" ? t(e) : t;
                }
                function Rr(e) {
                    var t = Qe();
                    return al(t, Te, e);
                }
                function al(e, t, n) {
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
                        var M = f = null, L = null, W = t, Y = !1;
                        do {
                            var q = W.lane & -536870913;
                            if (q !== W.lane ? (xe & q) === q : (sn & q) === q) {
                                var oe = W.revertLane;
                                if (oe === 0) L !== null && (L = L.next = {
                                    lane: 0,
                                    revertLane: 0,
                                    gesture: null,
                                    action: W.action,
                                    hasEagerState: W.hasEagerState,
                                    eagerState: W.eagerState,
                                    next: null
                                }), q === go && (Y = !0);
                                else if ((sn & oe) === oe) {
                                    W = W.next, oe === go && (Y = !0);
                                    continue;
                                } else q = {
                                    lane: 0,
                                    revertLane: W.revertLane,
                                    gesture: null,
                                    action: W.action,
                                    hasEagerState: W.hasEagerState,
                                    eagerState: W.eagerState,
                                    next: null
                                }, L === null ? (M = L = q, f = c) : L = L.next = q, fe.lanes |= oe, Mn |= oe;
                                q = W.action, qn && n(c, q), c = W.hasEagerState ? W.eagerState : n(c, q);
                            } else oe = {
                                lane: q,
                                revertLane: W.revertLane,
                                gesture: W.gesture,
                                action: W.action,
                                hasEagerState: W.hasEagerState,
                                eagerState: W.eagerState,
                                next: null
                            }, L === null ? (M = L = oe, f = c) : L = L.next = oe, fe.lanes |= q, Mn |= q;
                            W = W.next;
                        }while (W !== null && W !== t);
                        if (L === null ? f = c : L.next = M, !It(c, e.memoizedState) && (Ye = !0, Y && (n = yo, n !== null))) throw n;
                        e.memoizedState = c, e.baseState = f, e.baseQueue = L, o.lastRenderedState = c;
                    }
                    return i === null && (o.lanes = 0), [
                        e.memoizedState,
                        o.dispatch
                    ];
                }
                function ll(e) {
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
                    var o = fe, i = Qe(), c = Se;
                    if (c) {
                        if (n === void 0) throw Error(d(407));
                        n = n();
                    } else n = t();
                    var f = !It((Te || i).memoizedState, n);
                    if (f && (i.memoizedState = n, Ye = !0), i = i.queue, cl(Us.bind(null, o, i, e), [
                        e
                    ]), i.getSnapshot !== t || f || Ke !== null && Ke.memoizedState.tag & 1) {
                        if (o.flags |= 2048, oo(9, {
                            destroy: void 0
                        }, Os.bind(null, o, i, n, t), null), Ee === null) throw Error(d(349));
                        c || (sn & 127) !== 0 || Ls(o, t, n);
                    }
                    return n;
                }
                function Ls(e, t, n) {
                    e.flags |= 16384, e = {
                        getSnapshot: t,
                        value: n
                    }, t = fe.updateQueue, t === null ? (t = Dr(), fe.updateQueue = t, t.stores = [
                        e
                    ]) : (n = t.stores, n === null ? t.stores = [
                        e
                    ] : n.push(e));
                }
                function Os(e, t, n, o) {
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
                function il(e) {
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
                    return e.baseState = n, al(e, Te, typeof o == "function" ? o : Jt);
                }
                function Rf(e, t, n, o, i) {
                    if (Lr(e)) throw Error(d(485));
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
                            var M = n(i, o), L = le.S;
                            L !== null && L(f, M), Vs(e, t, M);
                        } catch (W) {
                            sl(e, t, W);
                        } finally{
                            c !== null && f.types !== null && (c.types = f.types), le.T = c;
                        }
                    } else try {
                        c = n(i, o), Vs(e, t, c);
                    } catch (W) {
                        sl(e, t, W);
                    }
                }
                function Vs(e, t, n) {
                    n !== null && typeof n == "object" && typeof n.then == "function" ? n.then(function(o) {
                        qs(e, t, o);
                    }, function(o) {
                        return sl(e, t, o);
                    }) : qs(e, t, n);
                }
                function qs(e, t, n) {
                    t.status = "fulfilled", t.value = n, Hs(t), e.state = n, t = e.pending, t !== null && (n = t.next, n === t ? e.pending = null : (n = n.next, t.next = n, Qs(e, n)));
                }
                function sl(e, t, n) {
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
                    if (Se) {
                        var n = Ee.formState;
                        if (n !== null) {
                            e: {
                                var o = fe;
                                if (Se) {
                                    if (Ne) {
                                        var i = Jm(Ne, Lt);
                                        if (i) {
                                            Ne = Wu(i), o = ep(i);
                                            break e;
                                        }
                                    }
                                    Ce(o);
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
                    }, n.queue = o, n = pc.bind(null, fe, o), o.dispatch = n, o = il(!1);
                    var c = ml.bind(null, fe, !1, o.queue);
                    return o = pt(), i = {
                        state: t,
                        dispatch: null,
                        action: e,
                        pending: null
                    }, o.queue = i, n = Rf.bind(null, fe, i, c, n), i.dispatch = n, o.memoizedState = e, [
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
                    if (t = al(e, t, Ks)[0], e = Rr(Jt)[0], typeof t == "object" && t !== null && typeof t.then == "function") try {
                        var o = Go(t);
                    } catch (f) {
                        throw f === xo ? ua : f;
                    }
                    else o = t;
                    t = Qe();
                    var i = t.queue, c = i.dispatch;
                    return n !== t.memoizedState && (fe.flags |= 2048, oo(9, {
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
                function oo(e, t, n, o) {
                    return e = {
                        tag: e,
                        create: n,
                        deps: o,
                        inst: t,
                        next: null
                    }, t = fe.updateQueue, t === null && (t = Dr(), fe.updateQueue = t), n = t.lastEffect, n === null ? t.lastEffect = e.next = e : (o = n.next, n.next = e, e.next = o, t.lastEffect = e), e;
                }
                function ec() {
                    return Qe().memoizedState;
                }
                function Nr(e, t, n, o) {
                    var i = pt();
                    fe.flags |= e, i.memoizedState = oo(1 | t, {
                        destroy: void 0
                    }, n, o === void 0 ? null : o);
                }
                function Br(e, t, n, o) {
                    var i = Qe();
                    o = o === void 0 ? null : o;
                    var c = i.memoizedState.inst;
                    Te !== null && o !== null && Ja(o, Te.memoizedState.deps) ? i.memoizedState = oo(t, c, n, o) : (fe.flags |= e, i.memoizedState = oo(1 | t, c, n, o));
                }
                function tc(e, t) {
                    Nr(8390656, 8, e, t);
                }
                function cl(e, t) {
                    Br(2048, 8, e, t);
                }
                function Bf(e) {
                    fe.flags |= 4;
                    var t = fe.updateQueue;
                    if (t === null) t = Dr(), fe.updateQueue = t, t.events = [
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
                        if ((ge & 2) !== 0) throw Error(d(440));
                        return t.impl.apply(void 0, arguments);
                    };
                }
                function oc(e, t) {
                    return Br(4, 2, e, t);
                }
                function rc(e, t) {
                    return Br(4, 4, e, t);
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
                    ]) : null, Br(4, 4, ac.bind(null, t, e), n);
                }
                function ul() {}
                function ic(e, t) {
                    var n = Qe();
                    t = t === void 0 ? null : t;
                    var o = n.memoizedState;
                    return t !== null && Ja(t, o[1]) ? o[0] : (n.memoizedState = [
                        e,
                        t
                    ], e);
                }
                function sc(e, t) {
                    var n = Qe();
                    t = t === void 0 ? null : t;
                    var o = n.memoizedState;
                    if (t !== null && Ja(t, o[1])) return o[0];
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
                function dl(e, t, n) {
                    return n === void 0 || (sn & 1073741824) !== 0 && (xe & 261930) === 0 ? e.memoizedState = t : (e.memoizedState = n, e = ru(), fe.lanes |= e, Mn |= e, n);
                }
                function cc(e, t, n, o) {
                    return It(n, t) ? n : jo.current !== null ? (e = dl(e, n, o), It(e, t) || (Ye = !0), e) : (sn & 42) === 0 || (sn & 1073741824) !== 0 && (xe & 261930) === 0 ? (Ye = !0, e.memoizedState = n) : (e = ru(), fe.lanes |= e, Mn |= e, t);
                }
                function uc(e, t, n, o, i) {
                    var c = an();
                    ot(c !== 0 && 8 > c ? c : 8);
                    var f = le.T, M = {};
                    le.T = M, ml(e, !1, t, n);
                    try {
                        var L = i(), W = le.S;
                        if (W !== null && W(M, L), L !== null && typeof L == "object" && typeof L.then == "function") {
                            var Y = Df(L, o);
                            Wo(e, t, Y, Ft(e));
                        } else Wo(e, t, o, Ft(e));
                    } catch (q) {
                        Wo(e, t, {
                            then: function() {},
                            status: "rejected",
                            reason: q
                        }, Ft());
                    } finally{
                        ot(c), f !== null && M.types !== null && (f.types = M.types), le.T = f;
                    }
                }
                function dc(e) {
                    var t = e.memoizedState;
                    if (t !== null) return t;
                    t = {
                        memoizedState: co,
                        baseState: co,
                        baseQueue: null,
                        queue: {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: Jt,
                            lastRenderedState: co
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
                function fl() {
                    return je(Un);
                }
                function fc() {
                    return Qe().memoizedState;
                }
                function mc() {
                    return Qe().memoizedState;
                }
                function Lf(e) {
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
                function Of(e, t, n) {
                    var o = Ft();
                    n = {
                        lane: o,
                        revertLane: 0,
                        gesture: null,
                        action: n,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    }, Lr(e) ? hc(t, n) : (n = Va(e, t, n, o), n !== null && (xt(n, e, o), bc(n, t, o)));
                }
                function pc(e, t, n) {
                    var o = Ft();
                    Wo(e, t, n, o);
                }
                function Wo(e, t, n, o) {
                    var i = {
                        lane: o,
                        revertLane: 0,
                        gesture: null,
                        action: n,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    };
                    if (Lr(e)) hc(t, i);
                    else {
                        var c = e.alternate;
                        if (e.lanes === 0 && (c === null || c.lanes === 0) && (c = t.lastRenderedReducer, c !== null)) try {
                            var f = t.lastRenderedState, M = c(f, n);
                            if (i.hasEagerState = !0, i.eagerState = M, It(M, f)) return zr(e, t, i, 0), Ee === null && Er(), !1;
                        } catch  {} finally{}
                        if (n = Va(e, t, i, o), n !== null) return xt(n, e, o), bc(n, t, o), !0;
                    }
                    return !1;
                }
                function ml(e, t, n, o) {
                    if (o = {
                        lane: 2,
                        revertLane: Wa(),
                        gesture: null,
                        action: o,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    }, Lr(e)) {
                        if (t) throw Error(d(479));
                    } else t = Va(e, n, o, 2), t !== null && xt(t, e, 2);
                }
                function Lr(e) {
                    var t = e.alternate;
                    return e === fe || t !== null && t === fe;
                }
                function hc(e, t) {
                    Co = ma = !0;
                    var n = e.pending;
                    n === null ? t.next = t : (t.next = n.next, n.next = t), e.pending = t;
                }
                function bc(e, t, n) {
                    if ((n & 4194048) !== 0) {
                        var o = t.lanes;
                        o &= e.pendingLanes, n |= o, t.lanes = n, O(e, n);
                    }
                }
                function pl(e, t, n, o) {
                    t = e.memoizedState, n = n(o, t), n = n == null ? t : Gl({}, t, n), e.memoizedState = n, e.lanes === 0 && (e.updateQueue.baseState = n);
                }
                function gc(e, t, n, o, i, c, f) {
                    return e = e.stateNode, typeof e.shouldComponentUpdate == "function" ? e.shouldComponentUpdate(o, c, f) : t.prototype && t.prototype.isPureReactComponent ? !Mr(n, o) || !Mr(i, c) : !0;
                }
                function yc(e, t, n, o) {
                    e = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(n, o), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(n, o), t.state !== e && pi.enqueueReplaceState(t, t.state, null);
                }
                function Rn(e, t) {
                    var n = t;
                    if ("ref" in t) {
                        n = {};
                        for(var o in t)o !== "ref" && (n[o] = t[o]);
                    }
                    if (e = e.defaultProps) {
                        n === t && (n = Gl({}, n));
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
                function hl(e, t, n) {
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
                        var M = o.stack;
                        this.componentDidCatch(o.value, {
                            componentStack: M !== null ? M : ""
                        });
                    });
                }
                function Uf(e, t, n, o, i) {
                    if (n.flags |= 32768, o !== null && typeof o == "object" && typeof o.then == "function") {
                        if (t = n.alternate, t !== null && He(t, n, i, !0), n = _t.current, n !== null) {
                            switch(n.tag){
                                case 31:
                                case 13:
                                    return Qt === null ? Kr() : n.alternate === null && We === 0 && (We = 3), n.flags &= -257, n.flags |= 65536, n.lanes = i, o === da ? n.flags |= 16384 : (t = n.updateQueue, t === null ? n.updateQueue = new Set([
                                        o
                                    ]) : t.add(o), Bl(e, o, i)), !1;
                                case 22:
                                    return n.flags |= 65536, o === da ? n.flags |= 16384 : (t = n.updateQueue, t === null ? (t = {
                                        transitions: null,
                                        markerInstances: null,
                                        retryQueue: new Set([
                                            o
                                        ])
                                    }, n.updateQueue = t) : (n = t.retryQueue, n === null ? t.retryQueue = new Set([
                                        o
                                    ]) : n.add(o)), Bl(e, o, i)), !1;
                            }
                            throw Error(d(435, n.tag));
                        }
                        return Bl(e, o, i), Kr(), !1;
                    }
                    if (Se) return t = _t.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = i, o !== li && (e = Error(d(422), {
                        cause: o
                    }), N(U(e, n)))) : (o !== li && (t = Error(d(423), {
                        cause: o
                    }), N(U(t, n))), e = e.current.alternate, e.flags |= 65536, i &= -i, e.lanes |= i, o = U(o, n), i = hl(e.stateNode, o, i), Ka(e, i), We !== 4 && (We = 2)), !1;
                    var c = Error(d(520), {
                        cause: o
                    });
                    if (c = U(c, n), cr === null ? cr = [
                        c
                    ] : cr.push(c), We !== 4 && (We = 2), t === null) return !0;
                    o = U(o, n), n = t;
                    do {
                        switch(n.tag){
                            case 3:
                                return n.flags |= 65536, e = i & -i, n.lanes |= e, e = hl(n.stateNode, o, e), Ka(n, e), !1;
                            case 1:
                                if (t = n.type, c = n.stateNode, (n.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || c !== null && typeof c.componentDidCatch == "function" && (Fn === null || !Fn.has(c)))) return n.flags |= 65536, i &= -i, n.lanes |= i, i = vc(i), Sc(i, e, n, o), Ka(n, i), !1;
                        }
                        n = n.return;
                    }while (n !== null);
                    return !1;
                }
                function it(e, t, n, o) {
                    t.child = e === null ? id(t, null, n, o) : Vn(t, e.child, n, o);
                }
                function jc(e, t, n, o, i) {
                    n = n.render;
                    var c = t.ref;
                    if ("ref" in o) {
                        var f = {};
                        for(var M in o)M !== "ref" && (f[M] = o[M]);
                    } else f = o;
                    return $e(t), o = el(e, t, n, f, c, i), M = tl(), e !== null && !Ye ? (nl(e, t, i), en(e, t, i)) : (Se && M && ne(t), t.flags |= 1, it(e, t, o, i), t.child);
                }
                function Cc(e, t, n, o, i) {
                    if (e === null) {
                        var c = n.type;
                        return typeof c == "function" && !Ll(c) && c.defaultProps === void 0 && n.compare === null ? (t.tag = 15, t.type = c, wc(e, t, c, o, i)) : (e = Xr(n.type, null, o, t, t.mode, i), e.ref = t.ref, e.return = t, t.child = e);
                    }
                    if (c = e.child, !jl(e, i)) {
                        var f = c.memoizedProps;
                        if (n = n.compare, n = n !== null ? n : Mr, n(f, o) && e.ref === t.ref) return en(e, t, i);
                    }
                    return t.flags |= 1, e = on(c, o), e.ref = t.ref, e.return = t, t.child = e;
                }
                function wc(e, t, n, o, i) {
                    if (e !== null) {
                        var c = e.memoizedProps;
                        if (Mr(c, o) && e.ref === t.ref) if (Ye = !1, t.pendingProps = o = c, jl(e, i)) (e.flags & 131072) !== 0 && (Ye = !0);
                        else return t.lanes = e.lanes, en(e, t, i);
                    }
                    return bl(e, t, n, o, i);
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
                        }, e !== null && Pr(t, c !== null ? c.cachePool : null), c !== null ? Ds(t, c) : Ya(), As(t);
                        else return o = t.lanes = 536870912, Pc(e, t, c !== null ? c.baseLanes | n : n, n, o);
                    } else c !== null ? (Pr(t, c.cachePool), Ds(t, c), gn(), t.memoizedState = null) : (e !== null && Pr(t, null), Ya(), gn());
                    return it(e, t, i, n), t.child;
                }
                function Qo(e, t) {
                    return e !== null && e.tag === 22 || t.stateNode !== null || (t.stateNode = {
                        _visibility: 1,
                        _pendingMarkers: null,
                        _retryCache: null,
                        _transitions: null
                    }), t.sibling;
                }
                function Pc(e, t, n, o, i) {
                    var c = Qa();
                    return c = c === null ? null : {
                        parent: rn ? Be._currentValue : Be._currentValue2,
                        pool: c
                    }, t.memoizedState = {
                        baseLanes: n,
                        cachePool: c
                    }, e !== null && Pr(t, null), Ya(), As(t), e !== null && He(e, t, o, !0), t.childLanes = i, null;
                }
                function Ur(e, t) {
                    return t = Gr({
                        mode: t.mode,
                        children: t.children
                    }, e.mode), t.ref = e.ref, e.child = t, t.return = e, t;
                }
                function Mc(e, t, n) {
                    return Vn(t, e.child, null, n), e = Ur(t, t.pendingProps), e.flags |= 2, Mt(t), t.memoizedState = null, e;
                }
                function $f(e, t, n) {
                    var o = t.pendingProps, i = (t.flags & 128) !== 0;
                    if (t.flags &= -129, e === null) {
                        if (Se) {
                            if (o.mode === "hidden") return e = Ur(t, o), t.lanes = 536870912, Qo(null, e);
                            if (Za(t), (e = Ne) ? (e = cp(e, Lt), e !== null && (t.memoizedState = {
                                dehydrated: e,
                                treeContext: jn !== null ? {
                                    id: Yt,
                                    overflow: Xt
                                } : null,
                                retryLane: 536870912,
                                hydrationErrors: null
                            }, n = wu(e), n.return = t, t.child = n, ct = t, Ne = null)) : e = null, e === null) throw Ce(t);
                            return t.lanes = 536870912, null;
                        }
                        return Ur(t, o);
                    }
                    var c = e.memoizedState;
                    if (c !== null) {
                        var f = c.dehydrated;
                        if (Za(t), i) if (t.flags & 256) t.flags &= -257, t = Mc(e, t, n);
                        else if (t.memoizedState !== null) t.child = e.child, t.flags |= 128, t = null;
                        else throw Error(d(558));
                        else if (Ye || He(e, t, n, !1), i = (n & e.childLanes) !== 0, Ye || i) {
                            if (o = Ee, o !== null && (f = R(o, n), f !== 0 && f !== c.retryLane)) throw c.retryLane = f, An(e, f), xt(o, e, f), hi;
                            Kr(), t = Mc(e, t, n);
                        } else e = c.treeContext, mt && (Ne = rp(f), ct = t, Se = !0, wn = null, Lt = !1, e !== null && he(t, e)), t = Ur(t, o), t.flags |= 4096;
                        return t;
                    }
                    return e = on(e.child, {
                        mode: o.mode,
                        children: o.children
                    }), e.ref = t.ref, t.child = e, e.return = t, e;
                }
                function $r(e, t) {
                    var n = t.ref;
                    if (n === null) e !== null && e.ref !== null && (t.flags |= 4194816);
                    else {
                        if (typeof n != "function" && typeof n != "object") throw Error(d(284));
                        (e === null || e.ref !== n) && (t.flags |= 4194816);
                    }
                }
                function bl(e, t, n, o, i) {
                    return $e(t), n = el(e, t, n, o, void 0, i), o = tl(), e !== null && !Ye ? (nl(e, t, i), en(e, t, i)) : (Se && o && ne(t), t.flags |= 1, it(e, t, n, i), t.child);
                }
                function Fc(e, t, n, o, i, c) {
                    return $e(t), t.updateQueue = null, n = Ns(t, o, n, i), Rs(e), o = tl(), e !== null && !Ye ? (nl(e, t, c), en(e, t, c)) : (Se && o && ne(t), t.flags |= 1, it(e, t, n, c), t.child);
                }
                function Tc(e, t, n, o, i) {
                    if ($e(t), t.stateNode === null) {
                        var c = mo, f = n.contextType;
                        typeof f == "object" && f !== null && (c = je(f)), c = new n(o, c), t.memoizedState = c.state !== null && c.state !== void 0 ? c.state : null, c.updater = pi, t.stateNode = c, c._reactInternals = t, c = t.stateNode, c.props = o, c.state = t.memoizedState, c.refs = {}, qa(t), f = n.contextType, c.context = typeof f == "object" && f !== null ? je(f) : mo, c.state = t.memoizedState, f = n.getDerivedStateFromProps, typeof f == "function" && (pl(t, n, f, o), c.state = t.memoizedState), typeof n.getDerivedStateFromProps == "function" || typeof c.getSnapshotBeforeUpdate == "function" || typeof c.UNSAFE_componentWillMount != "function" && typeof c.componentWillMount != "function" || (f = c.state, typeof c.componentWillMount == "function" && c.componentWillMount(), typeof c.UNSAFE_componentWillMount == "function" && c.UNSAFE_componentWillMount(), f !== c.state && pi.enqueueReplaceState(c, c.state, null), $o(t, o, c, i), Uo(), c.state = t.memoizedState), typeof c.componentDidMount == "function" && (t.flags |= 4194308), o = !0;
                    } else if (e === null) {
                        c = t.stateNode;
                        var M = t.memoizedProps, L = Rn(n, M);
                        c.props = L;
                        var W = c.context, Y = n.contextType;
                        f = mo, typeof Y == "object" && Y !== null && (f = je(Y));
                        var q = n.getDerivedStateFromProps;
                        Y = typeof q == "function" || typeof c.getSnapshotBeforeUpdate == "function", M = t.pendingProps !== M, Y || typeof c.UNSAFE_componentWillReceiveProps != "function" && typeof c.componentWillReceiveProps != "function" || (M || W !== f) && yc(t, c, o, f), kn = !1;
                        var oe = t.memoizedState;
                        c.state = oe, $o(t, o, c, i), Uo(), W = t.memoizedState, M || oe !== W || kn ? (typeof q == "function" && (pl(t, n, q, o), W = t.memoizedState), (L = kn || gc(t, n, L, o, oe, W, f)) ? (Y || typeof c.UNSAFE_componentWillMount != "function" && typeof c.componentWillMount != "function" || (typeof c.componentWillMount == "function" && c.componentWillMount(), typeof c.UNSAFE_componentWillMount == "function" && c.UNSAFE_componentWillMount()), typeof c.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof c.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = o, t.memoizedState = W), c.props = o, c.state = W, c.context = f, o = L) : (typeof c.componentDidMount == "function" && (t.flags |= 4194308), o = !1);
                    } else {
                        c = t.stateNode, Ha(e, t), f = t.memoizedProps, Y = Rn(n, f), c.props = Y, q = t.pendingProps, oe = c.context, W = n.contextType, L = mo, typeof W == "object" && W !== null && (L = je(W)), M = n.getDerivedStateFromProps, (W = typeof M == "function" || typeof c.getSnapshotBeforeUpdate == "function") || typeof c.UNSAFE_componentWillReceiveProps != "function" && typeof c.componentWillReceiveProps != "function" || (f !== q || oe !== L) && yc(t, c, o, L), kn = !1, oe = t.memoizedState, c.state = oe, $o(t, o, c, i), Uo();
                        var de = t.memoizedState;
                        f !== q || oe !== de || kn || e !== null && e.dependencies !== null && ut(e.dependencies) ? (typeof M == "function" && (pl(t, n, M, o), de = t.memoizedState), (Y = kn || gc(t, n, Y, o, oe, de, L) || e !== null && e.dependencies !== null && ut(e.dependencies)) ? (W || typeof c.UNSAFE_componentWillUpdate != "function" && typeof c.componentWillUpdate != "function" || (typeof c.componentWillUpdate == "function" && c.componentWillUpdate(o, de, L), typeof c.UNSAFE_componentWillUpdate == "function" && c.UNSAFE_componentWillUpdate(o, de, L)), typeof c.componentDidUpdate == "function" && (t.flags |= 4), typeof c.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof c.componentDidUpdate != "function" || f === e.memoizedProps && oe === e.memoizedState || (t.flags |= 4), typeof c.getSnapshotBeforeUpdate != "function" || f === e.memoizedProps && oe === e.memoizedState || (t.flags |= 1024), t.memoizedProps = o, t.memoizedState = de), c.props = o, c.state = de, c.context = L, o = Y) : (typeof c.componentDidUpdate != "function" || f === e.memoizedProps && oe === e.memoizedState || (t.flags |= 4), typeof c.getSnapshotBeforeUpdate != "function" || f === e.memoizedProps && oe === e.memoizedState || (t.flags |= 1024), o = !1);
                    }
                    return c = o, $r(e, t), o = (t.flags & 128) !== 0, c || o ? (c = t.stateNode, n = o && typeof n.getDerivedStateFromError != "function" ? null : c.render(), t.flags |= 1, e !== null && o ? (t.child = Vn(t, e.child, null, i), t.child = Vn(t, null, n, i)) : it(e, t, n, i), t.memoizedState = c.state, e = t.child) : e = en(e, t, i), e;
                }
                function Ec(e, t, n, o) {
                    return qe(), t.flags |= 256, it(e, t, n, o), t.child;
                }
                function gl(e) {
                    return {
                        baseLanes: e,
                        cachePool: ks()
                    };
                }
                function yl(e, t, n) {
                    return e = e !== null ? e.childLanes & ~n : 0, t && (e |= At), e;
                }
                function zc(e, t, n) {
                    var o = t.pendingProps, i = !1, c = (t.flags & 128) !== 0, f;
                    if ((f = c) || (f = e !== null && e.memoizedState === null ? !1 : (Ve.current & 2) !== 0), f && (i = !0, t.flags &= -129), f = (t.flags & 32) !== 0, t.flags &= -33, e === null) {
                        if (Se) {
                            if (i ? bn(t) : gn(), (e = Ne) ? (e = up(e, Lt), e !== null && (t.memoizedState = {
                                dehydrated: e,
                                treeContext: jn !== null ? {
                                    id: Yt,
                                    overflow: Xt
                                } : null,
                                retryLane: 536870912,
                                hydrationErrors: null
                            }, n = wu(e), n.return = t, t.child = n, ct = t, Ne = null)) : e = null, e === null) throw Ce(t);
                            return Jl(e) ? t.lanes = 32 : t.lanes = 536870912, null;
                        }
                        var M = o.children;
                        return o = o.fallback, i ? (gn(), i = t.mode, M = Gr({
                            mode: "hidden",
                            children: M
                        }, i), o = Ln(o, i, n, null), M.return = t, o.return = t, M.sibling = o, t.child = M, o = t.child, o.memoizedState = gl(n), o.childLanes = yl(e, f, n), t.memoizedState = bi, Qo(null, o)) : (bn(t), xl(t, M));
                    }
                    var L = e.memoizedState;
                    if (L !== null && (M = L.dehydrated, M !== null)) {
                        if (c) t.flags & 256 ? (bn(t), t.flags &= -257, t = vl(e, t, n)) : t.memoizedState !== null ? (gn(), t.child = e.child, t.flags |= 128, t = null) : (gn(), M = o.fallback, i = t.mode, o = Gr({
                            mode: "visible",
                            children: o.children
                        }, i), M = Ln(M, i, n, null), M.flags |= 2, o.return = t, M.return = t, o.sibling = M, t.child = o, Vn(t, e.child, null, n), o = t.child, o.memoizedState = gl(n), o.childLanes = yl(e, f, n), t.memoizedState = bi, t = Qo(null, o));
                        else if (bn(t), Jl(M)) f = Xm(M).digest, o = Error(d(419)), o.stack = "", o.digest = f, N({
                            value: o,
                            source: null,
                            stack: null
                        }), t = vl(e, t, n);
                        else if (Ye || He(e, t, n, !1), f = (n & e.childLanes) !== 0, Ye || f) {
                            if (f = Ee, f !== null && (o = R(f, n), o !== 0 && o !== L.retryLane)) throw L.retryLane = o, An(e, o), xt(f, e, o), hi;
                            Zl(M) || Kr(), t = vl(e, t, n);
                        } else Zl(M) ? (t.flags |= 192, t.child = e.child, t = null) : (e = L.treeContext, mt && (Ne = ap(M), ct = t, Se = !0, wn = null, Lt = !1, e !== null && he(t, e)), t = xl(t, o.children), t.flags |= 4096);
                        return t;
                    }
                    return i ? (gn(), M = o.fallback, i = t.mode, L = e.child, c = L.sibling, o = on(L, {
                        mode: "hidden",
                        children: o.children
                    }), o.subtreeFlags = L.subtreeFlags & 65011712, c !== null ? M = on(c, M) : (M = Ln(M, i, n, null), M.flags |= 2), M.return = t, o.return = t, o.sibling = M, t.child = o, Qo(null, o), o = t.child, M = e.child.memoizedState, M === null ? M = gl(n) : (i = M.cachePool, i !== null ? (L = rn ? Be._currentValue : Be._currentValue2, i = i.parent !== L ? {
                        parent: L,
                        pool: L
                    } : i) : i = ks(), M = {
                        baseLanes: M.baseLanes | n,
                        cachePool: i
                    }), o.memoizedState = M, o.childLanes = yl(e, f, n), t.memoizedState = bi, Qo(e.child, o)) : (bn(t), n = e.child, e = n.sibling, n = on(n, {
                        mode: "visible",
                        children: o.children
                    }), n.return = t, n.sibling = null, e !== null && (f = t.deletions, f === null ? (t.deletions = [
                        e
                    ], t.flags |= 16) : f.push(e)), t.child = n, t.memoizedState = null, n);
                }
                function xl(e, t) {
                    return t = Gr({
                        mode: "visible",
                        children: t
                    }, e.mode), t.return = e, e.child = t;
                }
                function Gr(e, t) {
                    return e = s(22, e, null, t), e.lanes = 0, e;
                }
                function vl(e, t, n) {
                    return Vn(t, e.child, null, n), e = xl(t, t.pendingProps.children), e.flags |= 2, t.memoizedState = null, e;
                }
                function Ic(e, t, n) {
                    e.lanes |= t;
                    var o = e.alternate;
                    o !== null && (o.lanes |= t), ve(e.return, t, n);
                }
                function Sl(e, t, n, o, i, c) {
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
                    var f = Ve.current, M = (f & 2) !== 0;
                    if (M ? (f = f & 1 | 2, t.flags |= 128) : f &= 1, E(Ve, f), it(e, t, o, n), o = Se ? nr : 0, !M && e !== null && (e.flags & 128) !== 0) e: for(e = t.child; e !== null;){
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
                            for(n = t.child, i = null; n !== null;)e = n.alternate, e !== null && _r(e) === null && (i = n), n = n.sibling;
                            n = i, n === null ? (i = t.child, t.child = null) : (i = n.sibling, n.sibling = null), Sl(t, !1, i, n, c, o);
                            break;
                        case "backwards":
                        case "unstable_legacy-backwards":
                            for(n = null, i = t.child, t.child = null; i !== null;){
                                if (e = i.alternate, e !== null && _r(e) === null) {
                                    t.child = i;
                                    break;
                                }
                                e = i.sibling, i.sibling = n, n = i, i = e;
                            }
                            Sl(t, !0, n, null, c, o);
                            break;
                        case "together":
                            Sl(t, !1, null, null, void 0, o);
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
                function jl(e, t) {
                    return (e.lanes & t) !== 0 ? !0 : (e = e.dependencies, !!(e !== null && ut(e)));
                }
                function Gf(e, t, n) {
                    switch(t.tag){
                        case 3:
                            Me(t, t.stateNode.containerInfo), re(t, Be, e.memoizedState.cache), qe();
                            break;
                        case 27:
                        case 5:
                            De(t);
                            break;
                        case 4:
                            Me(t, t.stateNode.containerInfo);
                            break;
                        case 10:
                            re(t, t.type, t.memoizedProps.value);
                            break;
                        case 31:
                            if (t.memoizedState !== null) return t.flags |= 128, Za(t), null;
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
                            if (i = t.memoizedState, i !== null && (i.rendering = null, i.tail = null, i.lastEffect = null), E(Ve, Ve.current), o) break;
                            return null;
                        case 22:
                            return t.lanes = 0, kc(e, t, n, t.pendingProps);
                        case 24:
                            re(t, Be, e.memoizedState.cache);
                    }
                    return en(e, t, n);
                }
                function Dc(e, t, n) {
                    if (e !== null) if (e.memoizedProps !== t.pendingProps) Ye = !0;
                    else {
                        if (!jl(e, n) && (t.flags & 128) === 0) return Ye = !1, Gf(e, t, n);
                        Ye = (e.flags & 131072) !== 0;
                    }
                    else Ye = !1, Se && (t.flags & 1048576) !== 0 && ee(t, nr, t.index);
                    switch(t.lanes = 0, t.tag){
                        case 16:
                            e: {
                                var o = t.pendingProps;
                                if (e = Dn(t.elementType), t.type = e, typeof e == "function") Ll(e) ? (o = Rn(e, o), t.tag = 1, t = Tc(null, t, e, o, n)) : (t.tag = 0, t = bl(null, t, e, o, n));
                                else {
                                    if (e != null) {
                                        var i = e.$$typeof;
                                        if (i === Ql) {
                                            t.tag = 11, t = jc(null, t, e, o, n);
                                            break e;
                                        } else if (i === Hl) {
                                            t.tag = 14, t = Cc(null, t, e, o, n);
                                            break e;
                                        }
                                    }
                                    throw t = p(e) || e, Error(d(306, t, ""));
                                }
                            }
                            return t;
                        case 0:
                            return bl(e, t, t.type, t.pendingProps, n);
                        case 1:
                            return o = t.type, i = Rn(o, t.pendingProps), Tc(e, t, o, i, n);
                        case 3:
                            e: {
                                if (Me(t, t.stateNode.containerInfo), e === null) throw Error(d(387));
                                var c = t.pendingProps;
                                i = t.memoizedState, o = i.element, Ha(e, t), $o(t, c, null, n);
                                var f = t.memoizedState;
                                if (c = f.cache, re(t, Be, c), c !== i.cache && me(t, [
                                    Be
                                ], n, !0), Uo(), c = f.element, mt && i.isDehydrated) if (i = {
                                    element: c,
                                    isDehydrated: !1,
                                    cache: f.cache
                                }, t.updateQueue.baseState = i, t.memoizedState = i, t.flags & 256) {
                                    t = Ec(e, t, c, n);
                                    break e;
                                } else if (c !== o) {
                                    o = U(Error(d(424)), t), N(o), t = Ec(e, t, c, n);
                                    break e;
                                } else for(mt && (Ne = op(t.stateNode.containerInfo), ct = t, Se = !0, wn = null, Lt = !0), n = id(t, null, c, n), t.child = n; n;)n.flags = n.flags & -3 | 4096, n = n.sibling;
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
                            if (Wt) return $r(e, t), e === null ? (n = qu(t.type, null, t.pendingProps, null)) ? t.memoizedState = n : Se || (t.stateNode = Ep(t.type, t.pendingProps, Cn.current, t)) : t.memoizedState = qu(t.type, e.memoizedProps, t.pendingProps, e.memoizedState), null;
                        case 27:
                            if (et) return De(t), e === null && et && Se && (o = t.stateNode = Ju(t.type, t.pendingProps, Cn.current, st.current, !1), ct = t, Lt = !0, Ne = lp(t.type, o, Ne)), it(e, t, t.pendingProps.children, n), $r(e, t), e === null && (t.flags |= 4194304), t.child;
                        case 5:
                            return e === null && Se && (Mp(t.type, t.pendingProps, st.current), (i = o = Ne) && (o = ip(o, t.type, t.pendingProps, Lt), o !== null ? (t.stateNode = o, ct = t, Ne = np(o), Lt = !1, i = !0) : i = !1), i || Ce(t)), De(t), i = t.type, c = t.pendingProps, f = e !== null ? e.memoizedProps : null, o = c.children, ea(i, c) ? o = null : f !== null && ea(i, f) && (t.flags |= 32), t.memoizedState !== null && (i = el(e, t, Af, null, null, n), rn ? Un._currentValue = i : Un._currentValue2 = i), $r(e, t), it(e, t, o, n), t.child;
                        case 6:
                            return e === null && Se && (Fp(t.pendingProps, st.current), (e = n = Ne) && (n = sp(n, t.pendingProps, Lt), n !== null ? (t.stateNode = n, ct = t, Ne = null, e = !0) : e = !1), e || Ce(t)), null;
                        case 13:
                            return zc(e, t, n);
                        case 4:
                            return Me(t, t.stateNode.containerInfo), o = t.pendingProps, e === null ? t.child = Vn(t, null, o, n) : it(e, t, o, n), t.child;
                        case 11:
                            return jc(e, t, t.type, t.pendingProps, n);
                        case 7:
                            return it(e, t, t.pendingProps, n), t.child;
                        case 8:
                            return it(e, t, t.pendingProps.children, n), t.child;
                        case 12:
                            return it(e, t, t.pendingProps.children, n), t.child;
                        case 10:
                            return o = t.pendingProps, re(t, t.type, o.value), it(e, t, o.children, n), t.child;
                        case 9:
                            return i = t.type._context, o = t.pendingProps.children, $e(t), i = je(i), o = o(i), t.flags |= 1, it(e, t, o, n), t.child;
                        case 14:
                            return Cc(e, t, t.type, t.pendingProps, n);
                        case 15:
                            return wc(e, t, t.type, t.pendingProps, n);
                        case 19:
                            return _c(e, t, n);
                        case 31:
                            return $f(e, t, n);
                        case 22:
                            return kc(e, t, n, t.pendingProps);
                        case 24:
                            return $e(t), o = je(Be), e === null ? (i = Qa(), i === null && (i = Ee, c = Rt(), i.pooledCache = c, c.refCount++, c !== null && (i.pooledCacheLanes |= n), i = c), t.memoizedState = {
                                parent: o,
                                cache: i
                            }, qa(t), re(t, Be, i)) : ((e.lanes & n) !== 0 && (Ha(e, t), $o(t, null, null, n), Uo()), i = e.memoizedState, c = t.memoizedState, i.parent !== o ? (i = {
                                parent: o,
                                cache: o
                            }, t.memoizedState = i, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = i), re(t, Be, o)) : (o = c.cache, re(t, Be, o), o !== i.cache && me(t, [
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
                function Wr(e) {
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
                        if (n.tag === 5 || n.tag === 6) Yl(e, n.stateNode);
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
                            n && o && (c = $u(c, i.type, i.memoizedProps)), Yl(e, c);
                        } else if (i.tag === 6) c = i.stateNode, n && o && (c = Gu(c, i.memoizedProps)), Yl(e, c);
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
                            n && o && (f = $u(f, c.type, c.memoizedProps)), Ou(e, f);
                        } else if (c.tag === 6) f = c.stateNode, n && o && (f = Gu(f, c.memoizedProps)), Ou(e, f);
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
                        var n = e.containerInfo, o = Lu();
                        Rc(o, t, !1, !1), e.pendingChildren = o, Ut(t), Ym(n, o);
                    }
                }
                function wl(e, t, n, o) {
                    if (ft) e.memoizedProps !== o && Ut(t);
                    else if (Kt) {
                        var i = e.stateNode, c = e.memoizedProps;
                        if ((e = Ac(e, t)) || c !== o) {
                            var f = st.current;
                            c = Km(i, n, c, o, !e, null), c === i ? t.stateNode = i : (Wr(t), Du(c, n, o, f) && Ut(t), t.stateNode = c, e && Cl(c, t, !1, !1));
                        } else t.stateNode = i;
                    }
                }
                function kl(e, t, n, o, i) {
                    if ((e.mode & 32) !== 0 && (n === null ? jm(t, o) : Cm(t, n, o))) {
                        if (e.flags |= 16777216, (i & 335544128) === i || Xl(t, o)) if (Ru(e.stateNode, t, o)) e.flags |= 8192;
                        else if (cu()) e.flags |= 8192;
                        else throw Qn = da, ui;
                    } else e.flags &= -16777217;
                }
                function Bc(e, t) {
                    if (Ip(t)) {
                        if (e.flags |= 16777216, !Zu(t)) if (cu()) e.flags |= 8192;
                        else throw Qn = da, ui;
                    } else e.flags &= -16777217;
                }
                function Qr(e, t) {
                    t !== null && (e.flags |= 4), e.flags & 16384 && (t = e.tag !== 22 ? k() : 536870912, e.lanes |= t, Mo |= t);
                }
                function Vo(e, t) {
                    if (!Se) switch(e.tailMode){
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
                    switch(ue(t), t.tag){
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
                                return e === null ? (Ut(t), c !== null ? (_e(t), Bc(t, c)) : (_e(t), kl(t, i, null, o, n))) : c ? c !== e.memoizedState ? (Ut(t), _e(t), Bc(t, c)) : (_e(t), t.flags &= -16777217) : (c = e.memoizedProps, ft ? c !== o && Ut(t) : wl(e, t, i, o), _e(t), kl(t, i, c, o, n)), null;
                            }
                        case 27:
                            if (et) {
                                if (kt(t), n = Cn.current, i = t.type, e !== null && t.stateNode != null) ft ? e.memoizedProps !== o && Ut(t) : wl(e, t, i, o);
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
                            if (kt(t), i = t.type, e !== null && t.stateNode != null) wl(e, t, i, o);
                            else {
                                if (!o) {
                                    if (t.stateNode === null) throw Error(d(166));
                                    return _e(t), null;
                                }
                                if (c = st.current, Re(t)) se(t, c), Sp(t.stateNode, i, o, c) && (t.flags |= 64);
                                else {
                                    var f = pm(i, o, Cn.current, c, t);
                                    Wr(t), Cl(f, t, !1, !1), t.stateNode = f, Du(f, i, o, c) && Ut(t);
                                }
                            }
                            return _e(t), kl(t, t.type, e === null ? null : e.memoizedProps, t.pendingProps, n), null;
                        case 6:
                            if (e && t.stateNode != null) n = e.memoizedProps, ft ? n !== o && Ut(t) : Kt && (n !== o ? (e = Cn.current, n = st.current, Wr(t), t.stateNode = Au(o, e, n, t)) : t.stateNode = e.stateNode);
                            else {
                                if (typeof o != "string" && t.stateNode === null) throw Error(d(166));
                                if (e = Cn.current, n = st.current, Re(t)) {
                                    if (!mt) throw Error(d(176));
                                    if (e = t.stateNode, n = t.memoizedProps, o = null, i = ct, i !== null) switch(i.tag){
                                        case 27:
                                        case 5:
                                            o = i.memoizedProps;
                                    }
                                    fp(e, n, t, o) || Ce(t, !0);
                                } else Wr(t), t.stateNode = Au(o, e, n, t);
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
                            return Mt(t), (t.flags & 128) !== 0 ? (t.lanes = n, t) : (n = o !== null, e = e !== null && e.memoizedState !== null, n && (o = t.child, i = null, o.alternate !== null && o.alternate.memoizedState !== null && o.alternate.memoizedState.cachePool !== null && (i = o.alternate.memoizedState.cachePool.pool), c = null, o.memoizedState !== null && o.memoizedState.cachePool !== null && (c = o.memoizedState.cachePool.pool), c !== i && (o.flags |= 2048)), n !== e && n && (t.child.flags |= 8192), Qr(t, t.updateQueue), _e(t), null);
                        case 4:
                            return Ue(), Nc(e, t), e === null && ym(t.stateNode.containerInfo), _e(t), null;
                        case 10:
                            return Ie(t.type), _e(t), null;
                        case 19:
                            if (j(Ve), o = t.memoizedState, o === null) return _e(t), null;
                            if (i = (t.flags & 128) !== 0, c = o.rendering, c === null) if (i) Vo(o, !1);
                            else {
                                if (We !== 0 || e !== null && (e.flags & 128) !== 0) for(e = t.child; e !== null;){
                                    if (c = _r(e), c !== null) {
                                        for(t.flags |= 128, Vo(o, !1), e = c.updateQueue, t.updateQueue = e, Qr(t, e), t.subtreeFlags = 0, e = n, n = t.child; n !== null;)Cu(n, e), n = n.sibling;
                                        return E(Ve, Ve.current & 1 | 2), Se && J(t, o.treeForkCount), t.child;
                                    }
                                    e = e.sibling;
                                }
                                o.tail !== null && vt() > ur && (t.flags |= 128, i = !0, Vo(o, !1), t.lanes = 4194304);
                            }
                            else {
                                if (!i) if (e = _r(c), e !== null) {
                                    if (t.flags |= 128, i = !0, e = e.updateQueue, t.updateQueue = e, Qr(t, e), Vo(o, !0), o.tail === null && o.tailMode === "hidden" && !c.alternate && !Se) return _e(t), null;
                                } else 2 * vt() - o.renderingStartTime > ur && n !== 536870912 && (t.flags |= 128, i = !0, Vo(o, !1), t.lanes = 4194304);
                                o.isBackwards ? (c.sibling = t.child, t.child = c) : (e = o.last, e !== null ? e.sibling = c : t.child = c, o.last = c);
                            }
                            return o.tail !== null ? (e = o.tail, o.rendering = e, o.tail = e.sibling, o.renderingStartTime = vt(), e.sibling = null, n = Ve.current, E(Ve, i ? n & 1 | 2 : n & 1), Se && J(t, o.treeForkCount), e) : (_e(t), null);
                        case 22:
                        case 23:
                            return Mt(t), Xa(), o = t.memoizedState !== null, e !== null ? e.memoizedState !== null !== o && (t.flags |= 8192) : o && (t.flags |= 8192), o ? (n & 536870912) !== 0 && (t.flags & 128) === 0 && (_e(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : _e(t), n = t.updateQueue, n !== null && Qr(t, n.retryQueue), n = null, e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), o = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (o = t.memoizedState.cachePool.pool), o !== n && (t.flags |= 2048), e !== null && j(Wn), null;
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
                    switch(ue(t), t.tag){
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
                            return j(Ve), null;
                        case 4:
                            return Ue(), null;
                        case 10:
                            return Ie(t.type), null;
                        case 22:
                        case 23:
                            return Mt(t), Xa(), e !== null && j(Wn), e = t.flags, e & 65536 ? (t.flags = e & -65537 | 128, t) : null;
                        case 24:
                            return Ie(Be), null;
                        case 25:
                            return null;
                        default:
                            return null;
                    }
                }
                function Lc(e, t) {
                    switch(ue(t), t.tag){
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
                            j(Ve);
                            break;
                        case 10:
                            Ie(t.type);
                            break;
                        case 22:
                        case 23:
                            Mt(t), Xa(), e !== null && j(Wn);
                            break;
                        case 24:
                            Ie(Be);
                    }
                }
                function qo(e, t) {
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
                    } catch (M) {
                        we(t, t.return, M);
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
                                    var f = o.inst, M = f.destroy;
                                    if (M !== void 0) {
                                        f.destroy = void 0, i = t;
                                        var L = n, W = M;
                                        try {
                                            W();
                                        } catch (Y) {
                                            we(i, L, Y);
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
                function Oc(e) {
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
                function Ho(e, t) {
                    try {
                        var n = e.ref;
                        if (n !== null) {
                            switch(e.tag){
                                case 26:
                                case 27:
                                case 5:
                                    var o = Zo(e.stateNode);
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
                function Pl(e, t, n) {
                    try {
                        Lm(e.stateNode, e.type, n, t, e);
                    } catch (o) {
                        we(e, e.return, o);
                    }
                }
                function Gc(e) {
                    return e.tag === 5 || e.tag === 3 || (Wt ? e.tag === 26 : !1) || (et ? e.tag === 27 && uo(e.type) : !1) || e.tag === 4;
                }
                function Ml(e) {
                    e: for(;;){
                        for(; e.sibling === null;){
                            if (e.return === null || Gc(e.return)) return null;
                            e = e.return;
                        }
                        for(e.sibling.return = e.return, e = e.sibling; e.tag !== 5 && e.tag !== 6 && e.tag !== 18;){
                            if (et && e.tag === 27 && uo(e.type) || e.flags & 2 || e.child === null || e.tag === 4) continue e;
                            e.child.return = e, e = e.child;
                        }
                        if (!(e.flags & 2)) return e.stateNode;
                    }
                }
                function Fl(e, t, n) {
                    var o = e.tag;
                    if (o === 5 || o === 6) e = e.stateNode, t ? Um(n, e, t) : Rm(n, e);
                    else if (o !== 4 && (et && o === 27 && uo(e.type) && (n = e.stateNode, t = null), e = e.child, e !== null)) for(Fl(e, t, n), e = e.sibling; e !== null;)Fl(e, t, n), e = e.sibling;
                }
                function Vr(e, t, n) {
                    var o = e.tag;
                    if (o === 5 || o === 6) e = e.stateNode, t ? Om(n, e, t) : Am(n, e);
                    else if (o !== 4 && (et && o === 27 && uo(e.type) && (n = e.stateNode), e = e.child, e !== null)) for(Vr(e, t, n), e = e.sibling; e !== null;)Vr(e, t, n), e = e.sibling;
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
                                    } catch (M) {
                                        we(o, o.return, M);
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
                            tn(e, n), o & 4 && qo(5, n);
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
                            o & 64 && Oc(n), o & 512 && Ho(n, n.return);
                            break;
                        case 3:
                            if (tn(e, n), o & 64 && (o = n.updateQueue, o !== null)) {
                                if (e = null, n.child !== null) switch(n.child.tag){
                                    case 27:
                                    case 5:
                                        e = Zo(n.child.stateNode);
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
                            o & 512 && Ho(n, n.return);
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
                    for(n = n.child; n !== null;)Tl(e, t, n), n = n.sibling;
                }
                function Tl(e, t, n) {
                    if (zt && typeof zt.onCommitFiberUnmount == "function") try {
                        zt.onCommitFiberUnmount(tr, n);
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
                                uo(n.type) && (Ze = n.stateNode, St = !1), $t(e, t, n), ed(n.stateNode), Ze = o, St = i;
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
                            ft && Ze !== null && (St ? wp(Ze, n.stateNode) : Cp(Ze, n.stateNode));
                            break;
                        case 4:
                            ft ? (o = Ze, i = St, Ze = n.stateNode.containerInfo, St = !0, $t(e, t, n), Ze = o, St = i) : (Kt && Wc(n.stateNode, n, Lu()), $t(e, t, n));
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
                function qr(e, t) {
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
                            var M = f;
                            e: for(; M !== null;){
                                switch(M.tag){
                                    case 27:
                                        if (et) {
                                            if (uo(M.type)) {
                                                Ze = M.stateNode, St = !1;
                                                break e;
                                            }
                                            break;
                                        }
                                    case 5:
                                        Ze = M.stateNode, St = !1;
                                        break e;
                                    case 3:
                                    case 4:
                                        Ze = M.stateNode.containerInfo, St = !0;
                                        break e;
                                }
                                M = M.return;
                            }
                            if (Ze === null) throw Error(d(160));
                            Tl(c, f, i), Ze = null, St = !1;
                        } else Tl(c, f, i);
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
                            dt(t, e), ht(e), o & 4 && (yn(3, e, e.return), qo(3, e), yn(5, e, e.return));
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
                                    n === null ? c === null ? e.stateNode === null ? e.stateNode = Tp(i, e.type, e.memoizedProps, e) : Yu(i, e.type, e.stateNode) : e.stateNode = Hu(i, c, e.memoizedProps) : o !== c ? (o === null ? n.stateNode !== null && Xu(n.stateNode) : Ku(o), c === null ? Yu(i, e.type, e.stateNode) : Hu(i, c, e.memoizedProps)) : c === null && e.stateNode !== null && Pl(e, e.memoizedProps, n.memoizedProps);
                                }
                                break;
                            }
                        case 27:
                            if (et) {
                                dt(t, e), ht(e), o & 512 && (Xe || n === null || Ht(n, n.return)), n !== null && o & 4 && Pl(e, e.memoizedProps, n.memoizedProps);
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
                                o & 4 && e.stateNode != null && (i = e.memoizedProps, Pl(e, i, n !== null ? n.memoizedProps : i)), o & 1024 && (gi = !0);
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
                            if (Wt ? (zp(), i = Vt, Vt = ei(t.containerInfo), dt(t, e), Vt = i) : dt(t, e), ht(e), o & 4) {
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
                            gi && (gi = !1, Xc(e));
                            break;
                        case 4:
                            Wt ? (n = Vt, Vt = ei(e.stateNode.containerInfo), dt(t, e), ht(e), Vt = n) : (dt(t, e), ht(e)), o & 4 && Kt && Wc(e.stateNode, e, e.stateNode.pendingChildren);
                            break;
                        case 12:
                            dt(t, e), ht(e);
                            break;
                        case 31:
                            dt(t, e), ht(e), o & 4 && (o = e.updateQueue, o !== null && (e.updateQueue = null, qr(e, o)));
                            break;
                        case 13:
                            dt(t, e), ht(e), e.child.flags & 8192 && e.memoizedState !== null != (n !== null && n.memoizedState !== null) && (va = vt()), o & 4 && (o = e.updateQueue, o !== null && (e.updateQueue = null, qr(e, o)));
                            break;
                        case 22:
                            i = e.memoizedState !== null;
                            var f = n !== null && n.memoizedState !== null, M = cn, L = Xe;
                            if (cn = M || i, Xe = L || f, dt(t, e), Xe = L, cn = M, ht(e), o & 8192 && (t = e.stateNode, t._visibility = i ? t._visibility & -2 : t._visibility | 1, i && (n === null || f || cn || Xe || Nn(e)), ft)) {
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
                            o & 4 && (o = e.updateQueue, o !== null && (n = o.retryQueue, n !== null && (o.retryQueue = null, qr(e, n))));
                            break;
                        case 19:
                            dt(t, e), ht(e), o & 4 && (o = e.updateQueue, o !== null && (e.updateQueue = null, qr(e, o)));
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
                                            var i = n.stateNode, c = Ml(e);
                                            Vr(e, c, i);
                                            break;
                                        }
                                    case 5:
                                        var f = n.stateNode;
                                        n.flags & 32 && (Bu(f), n.flags &= -33);
                                        var M = Ml(e);
                                        Vr(e, M, f);
                                        break;
                                    case 3:
                                    case 4:
                                        var L = n.stateNode.containerInfo, W = Ml(e);
                                        Fl(e, W, L);
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
                                nn(i, c, n), qo(4, c);
                                break;
                            case 1:
                                if (nn(i, c, n), o = c, i = o.stateNode, typeof i.componentDidMount == "function") try {
                                    i.componentDidMount();
                                } catch (W) {
                                    we(o, o.return, W);
                                }
                                if (o = c, i = o.updateQueue, i !== null) {
                                    var M = o.stateNode;
                                    try {
                                        var L = i.shared.hiddenCallbacks;
                                        if (L !== null) for(i.shared.hiddenCallbacks = null, i = 0; i < L.length; i++)Is(L[i], M);
                                    } catch (W) {
                                        we(o, o.return, W);
                                    }
                                }
                                n && f & 64 && Oc(c), Ho(c, c.return);
                                break;
                            case 27:
                                et && Qc(c);
                            case 26:
                            case 5:
                                nn(i, c, n), n && o === null && f & 4 && $c(c), Ho(c, c.return);
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
                                c.memoizedState === null && nn(i, c, n), Ho(c, c.return);
                                break;
                            case 30:
                                break;
                            default:
                                nn(i, c, n);
                        }
                        t = t.sibling;
                    }
                }
                function El(e, t) {
                    var n = null;
                    e !== null && e.memoizedState !== null && e.memoizedState.cachePool !== null && (n = e.memoizedState.cachePool.pool), e = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (e = t.memoizedState.cachePool.pool), e !== n && (e != null && e.refCount++, n != null && yt(n));
                }
                function zl(e, t) {
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
                            Gt(e, t, n, o), i & 2048 && qo(9, t);
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
                                    var c = t.memoizedProps, f = c.id, M = c.onPostCommit;
                                    typeof M == "function" && M(f, t.alternate === null ? "mount" : "update", e.passiveEffectDuration, -0);
                                } catch (L) {
                                    we(t, t.return, L);
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
                            c = t.stateNode, f = t.alternate, t.memoizedState !== null ? c._visibility & 2 ? Gt(e, t, n, o) : Ko(e, t) : c._visibility & 2 ? Gt(e, t, n, o) : (c._visibility |= 2, ro(e, t, n, o, (t.subtreeFlags & 10256) !== 0 || !1)), i & 2048 && El(f, t);
                            break;
                        case 24:
                            Gt(e, t, n, o), i & 2048 && zl(t.alternate, t);
                            break;
                        default:
                            Gt(e, t, n, o);
                    }
                }
                function ro(e, t, n, o, i) {
                    for(i = i && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null;){
                        var c = e, f = t, M = n, L = o, W = f.flags;
                        switch(f.tag){
                            case 0:
                            case 11:
                            case 15:
                                ro(c, f, M, L, i), qo(8, f);
                                break;
                            case 23:
                                break;
                            case 22:
                                var Y = f.stateNode;
                                f.memoizedState !== null ? Y._visibility & 2 ? ro(c, f, M, L, i) : Ko(c, f) : (Y._visibility |= 2, ro(c, f, M, L, i)), i && W & 2048 && El(f.alternate, f);
                                break;
                            case 24:
                                ro(c, f, M, L, i), i && W & 2048 && zl(f.alternate, f);
                                break;
                            default:
                                ro(c, f, M, L, i);
                        }
                        t = t.sibling;
                    }
                }
                function Ko(e, t) {
                    if (t.subtreeFlags & 10256) for(t = t.child; t !== null;){
                        var n = e, o = t, i = o.flags;
                        switch(o.tag){
                            case 22:
                                Ko(n, o), i & 2048 && El(o.alternate, o);
                                break;
                            case 24:
                                Ko(n, o), i & 2048 && zl(o.alternate, o);
                                break;
                            default:
                                Ko(n, o);
                        }
                        t = t.sibling;
                    }
                }
                function Bn(e, t, n) {
                    if (e.subtreeFlags & ko) for(e = e.child; e !== null;)Jc(e, t, n), e = e.sibling;
                }
                function Jc(e, t, n) {
                    switch(e.tag){
                        case 26:
                            if (Bn(e, t, n), e.flags & ko) if (e.memoizedState !== null) _p(n, Vt, e.memoizedState, e.memoizedProps);
                            else {
                                var o = e.stateNode, i = e.type;
                                e = e.memoizedProps, ((t & 335544128) === t || Xl(i, e)) && Nu(n, o, i, e);
                            }
                            break;
                        case 5:
                            Bn(e, t, n), e.flags & ko && (o = e.stateNode, i = e.type, e = e.memoizedProps, ((t & 335544128) === t || Xl(i, e)) && Nu(n, o, i, e));
                            break;
                        case 3:
                        case 4:
                            Wt ? (o = Vt, Vt = ei(e.stateNode.containerInfo), Bn(e, t, n), Vt = o) : Bn(e, t, n);
                            break;
                        case 22:
                            e.memoizedState === null && (o = e.alternate, o !== null && o.memoizedState !== null ? (o = ko, ko = 16777216, Bn(e, t, n), ko = o) : Bn(e, t, n));
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
                function Yo(e) {
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
                            Yo(e), e.flags & 2048 && yn(9, e, e.return);
                            break;
                        case 3:
                            Yo(e);
                            break;
                        case 12:
                            Yo(e);
                            break;
                        case 22:
                            var t = e.stateNode;
                            e.memoizedState !== null && t._visibility & 2 && (e.return === null || e.return.tag !== 13) ? (t._visibility &= -3, Hr(e)) : Yo(e);
                            break;
                        default:
                            Yo(e);
                    }
                }
                function Hr(e) {
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
                                yn(8, t, t.return), Hr(t);
                                break;
                            case 22:
                                n = t.stateNode, n._visibility & 2 && (n._visibility &= -3, Hr(t));
                                break;
                            default:
                                Hr(t);
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
                function Il(e) {
                    var t = gm(e);
                    if (t != null) {
                        if (typeof t.memoizedProps["data-testname"] != "string") throw Error(d(364));
                        return t;
                    }
                    if (e = Tm(e), e === null) throw Error(d(362));
                    return e.stateNode.current;
                }
                function _l(e, t) {
                    var n = e.tag;
                    switch(t.$$typeof){
                        case ha:
                            if (e.type === t.value) return !0;
                            break;
                        case ba:
                            e: {
                                for(t = t.value, e = [
                                    e,
                                    0
                                ], n = 0; n < e.length;){
                                    var o = e[n++], i = o.tag, c = e[n++], f = t[c];
                                    if (i !== 5 && i !== 26 && i !== 27 || !er(o)) {
                                        for(; f != null && _l(o, f);)c++, f = t[c];
                                        if (c === t.length) {
                                            t = !0;
                                            break e;
                                        } else for(o = o.child; o !== null;)e.push(o, c), o = o.sibling;
                                    }
                                }
                                t = !1;
                            }
                            return t;
                        case ga:
                            if ((n === 5 || n === 26 || n === 27) && Im(e.stateNode, t.value)) return !0;
                            break;
                        case xa:
                            if ((n === 5 || n === 6 || n === 26 || n === 27) && (e = zm(e), e !== null && 0 <= e.indexOf(t.value))) return !0;
                            break;
                        case ya:
                            if ((n === 5 || n === 26 || n === 27) && (e = e.memoizedProps["data-testname"], typeof e == "string" && e.toLowerCase() === t.value.toLowerCase())) return !0;
                            break;
                        default:
                            throw Error(d(365));
                    }
                    return !1;
                }
                function Dl(e) {
                    switch(e.$$typeof){
                        case ha:
                            return "<" + (p(e.value) || "Unknown") + ">";
                        case ba:
                            return ":has(" + (Dl(e) || "") + ")";
                        case ga:
                            return '[role="' + e.value + '"]';
                        case xa:
                            return '"' + e.value + '"';
                        case ya:
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
                        var i = e[o++], c = i.tag, f = e[o++], M = t[f];
                        if (c !== 5 && c !== 26 && c !== 27 || !er(i)) {
                            for(; M != null && _l(i, M);)f++, M = t[f];
                            if (f === t.length) n.push(i);
                            else for(i = i.child; i !== null;)e.push(i, f), i = i.sibling;
                        }
                    }
                    return n;
                }
                function Al(e, t) {
                    if (!Jo) throw Error(d(363));
                    e = Il(e), e = ou(e, t), t = [], e = Array.from(e);
                    for(var n = 0; n < e.length;){
                        var o = e[n++], i = o.tag;
                        if (i === 5 || i === 26 || i === 27) er(o) || t.push(o.stateNode);
                        else for(o = o.child; o !== null;)e.push(o), o = o.sibling;
                    }
                    return t;
                }
                function Ft() {
                    return (ge & 2) !== 0 && xe !== 0 ? xe & -xe : le.T !== null ? Wa() : xm();
                }
                function ru() {
                    if (At === 0) if ((xe & 536870912) === 0 || Se) {
                        var e = na;
                        na <<= 1, (na & 3932160) === 0 && (na = 262144), At = e;
                    } else At = 536870912;
                    return e = _t.current, e !== null && (e.flags |= 32), At;
                }
                function xt(e, t, n) {
                    (e === Ee && (Fe === 2 || Fe === 9) || e.cancelPendingCommit !== null) && (ao(e, 0), xn(e, xe, At, !1)), z(e, n), ((ge & 2) === 0 || e !== Ee) && (e === Ee && ((ge & 2) === 0 && (Hn |= n), We === 4 && xn(e, xe, At, !1)), qt(e));
                }
                function au(e, t, n) {
                    if ((ge & 6) !== 0) throw Error(d(327));
                    var o = !n && (t & 127) === 0 && (t & e.expiredLanes) === 0 || S(e, t), i = o ? Yf(e, t) : Nl(e, t, !0), c = o;
                    do {
                        if (i === 0) {
                            Po && !o && xn(e, t, 0, !1);
                            break;
                        } else {
                            if (n = e.current.alternate, c && !Hf(n)) {
                                i = Nl(e, t, !1), c = !1;
                                continue;
                            }
                            if (i === 2) {
                                if (c = t, e.errorRecoveryDisabledLanes & c) var f = 0;
                                else f = e.pendingLanes & -536870913, f = f !== 0 ? f : f & 536870912 ? 536870912 : 0;
                                if (f !== 0) {
                                    t = f;
                                    e: {
                                        var M = e;
                                        i = cr;
                                        var L = mt && M.current.memoizedState.isDehydrated;
                                        if (L && (ao(M, f).flags |= 256), f = Nl(M, f, !1), f !== 2) {
                                            if (yi && !L) {
                                                M.errorRecoveryDisabledLanes |= c, Hn |= c, i = 4;
                                                break e;
                                            }
                                            c = jt, jt = i, c !== null && (jt === null ? jt = c : jt.push.apply(jt, c));
                                        }
                                        i = f;
                                    }
                                    if (c = !1, i !== 2) continue;
                                }
                            }
                            if (i === 1) {
                                ao(e, 0), xn(e, t, 0, !0);
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
                                        jt = null;
                                        break;
                                    case 3:
                                    case 5:
                                        break;
                                    default:
                                        throw Error(d(329));
                                }
                                if ((t & 62914560) === t && (i = va + 300 - vt(), 10 < i)) {
                                    if (xn(o, t, At, !Pn), C(o, 0, !0) !== 0) break e;
                                    dn = t, o.timeoutHandle = hm(lu.bind(null, o, n, jt, Sa, vi, t, At, Hn, Mo, Pn, c, "Throttled", -0, 0), i);
                                    break e;
                                }
                                lu(o, n, jt, Sa, vi, t, At, Hn, Mo, Pn, c, null, -0, 0);
                            }
                        }
                        break;
                    }while (!0);
                    qt(e);
                }
                function lu(e, t, n, o, i, c, f, M, L, W, Y, q, oe, de) {
                    if (e.timeoutHandle = On, q = t.subtreeFlags, q & 8192 || (q & 16785408) === 16785408) {
                        q = wm(), Jc(t, c, q);
                        var Je = (c & 62914560) === c ? va - vt() : (c & 4194048) === c ? dd - vt() : 0;
                        if (Je = km(q, Je), Je !== null) {
                            dn = c, e.cancelPendingCommit = Je(hu.bind(null, e, t, c, n, o, i, f, M, L, Y, q, null, oe, de)), xn(e, c, f, !W);
                            return;
                        }
                    }
                    hu(e, t, c, n, o, i, f, M, L);
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
                    t &= ~xi, t &= ~Hn, e.suspendedLanes |= t, e.pingedLanes &= ~t, o && (e.warmLanes |= t), o = e.expirationTimes;
                    for(var i = t; 0 < i;){
                        var c = 31 - Et(i), f = 1 << c;
                        o[c] = -1, i &= ~f;
                    }
                    n !== 0 && _(e, n, t);
                }
                function iu() {
                    return (ge & 6) === 0 ? (no(0), !1) : !0;
                }
                function Rl() {
                    if (ye !== null) {
                        if (Fe === 0) var e = ye.return;
                        else e = ye, ln = $n = null, ol(e), vo = null, ar = 0, e = ye;
                        for(; e !== null;)Lc(e.alternate, e), e = e.return;
                        ye = null;
                    }
                }
                function ao(e, t) {
                    var n = e.timeoutHandle;
                    n !== On && (e.timeoutHandle = On, bm(n)), n = e.cancelPendingCommit, n !== null && (e.cancelPendingCommit = null, n()), dn = 0, Rl(), Ee = e, ye = n = on(e.current, null), xe = t, Fe = 0, Dt = null, Pn = !1, Po = S(e, t), yi = !1, Mo = At = xi = Hn = Mn = We = 0, jt = cr = null, vi = !1, (t & 8) !== 0 && (t |= t & 32);
                    var o = e.entangledLanes;
                    if (o !== 0) for(e = e.entanglements, o &= t; 0 < o;){
                        var i = 31 - Et(o), c = 1 << i;
                        t |= e[i], o &= ~c;
                    }
                    return un = t, Er(), n;
                }
                function su(e, t) {
                    fe = null, le.H = ir, t === xo || t === ua ? (t = Fs(), Fe = 3) : t === ui ? (t = Fs(), Fe = 4) : Fe = t === hi ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, Dt = t, ye === null && (We = 1, Or(e, U(t, e.current)));
                }
                function cu() {
                    var e = _t.current;
                    return e === null ? !0 : (xe & 4194048) === xe ? Qt === null : (xe & 62914560) === xe || (xe & 536870912) !== 0 ? e === Qt : !1;
                }
                function uu() {
                    var e = le.H;
                    return le.H = ir, e === null ? ir : e;
                }
                function du() {
                    var e = le.A;
                    return le.A = Hp, e;
                }
                function Kr() {
                    We = 4, Pn || (xe & 4194048) !== xe && _t.current !== null || (Po = !0), (Mn & 134217727) === 0 && (Hn & 134217727) === 0 || Ee === null || xn(Ee, xe, At, !1);
                }
                function Nl(e, t, n) {
                    var o = ge;
                    ge |= 2;
                    var i = uu(), c = du();
                    (Ee !== e || xe !== t) && (Sa = null, ao(e, t)), t = !1;
                    var f = We;
                    e: do try {
                        if (Fe !== 0 && ye !== null) {
                            var M = ye, L = Dt;
                            switch(Fe){
                                case 8:
                                    Rl(), f = 6;
                                    break e;
                                case 3:
                                case 2:
                                case 9:
                                case 6:
                                    _t.current === null && (t = !0);
                                    var W = Fe;
                                    if (Fe = 0, Dt = null, lo(e, M, L, W), n && Po) {
                                        f = 0;
                                        break e;
                                    }
                                    break;
                                default:
                                    W = Fe, Fe = 0, Dt = null, lo(e, M, L, W);
                            }
                        }
                        Kf(), f = We;
                        break;
                    } catch (Y) {
                        su(e, Y);
                    }
                    while (!0);
                    return t && e.shellSuspendCounter++, ln = $n = null, ge = o, le.H = i, le.A = c, ye === null && (Ee = null, xe = 0, Er()), f;
                }
                function Kf() {
                    for(; ye !== null;)fu(ye);
                }
                function Yf(e, t) {
                    var n = ge;
                    ge |= 2;
                    var o = uu(), i = du();
                    Ee !== e || xe !== t ? (Sa = null, ur = vt() + 500, ao(e, t)) : Po = S(e, t);
                    e: do try {
                        if (Fe !== 0 && ye !== null) {
                            t = ye;
                            var c = Dt;
                            t: switch(Fe){
                                case 1:
                                    Fe = 0, Dt = null, lo(e, t, c, 1);
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
                                    Ps(c) ? (Fe = 0, Dt = null, mu(t)) : (Fe = 0, Dt = null, lo(e, t, c, 7));
                                    break;
                                case 5:
                                    var f = null;
                                    switch(ye.tag){
                                        case 26:
                                            f = ye.memoizedState;
                                        case 5:
                                        case 27:
                                            var M = ye, L = M.type, W = M.pendingProps;
                                            if (f ? Zu(f) : Ru(M.stateNode, L, W)) {
                                                Fe = 0, Dt = null;
                                                var Y = M.sibling;
                                                if (Y !== null) ye = Y;
                                                else {
                                                    var q = M.return;
                                                    q !== null ? (ye = q, Yr(q)) : ye = null;
                                                }
                                                break t;
                                            }
                                    }
                                    Fe = 0, Dt = null, lo(e, t, c, 5);
                                    break;
                                case 6:
                                    Fe = 0, Dt = null, lo(e, t, c, 6);
                                    break;
                                case 8:
                                    Rl(), We = 6;
                                    break e;
                                default:
                                    throw Error(d(462));
                            }
                        }
                        Xf();
                        break;
                    } catch (oe) {
                        su(e, oe);
                    }
                    while (!0);
                    return ln = $n = null, le.H = o, le.A = i, ge = n, ye !== null ? 0 : (Ee = null, xe = 0, Er(), We);
                }
                function Xf() {
                    for(; ye !== null && !Np();)fu(ye);
                }
                function fu(e) {
                    var t = Dc(e.alternate, e, un);
                    e.memoizedProps = e.pendingProps, t === null ? Yr(e) : ye = t;
                }
                function mu(e) {
                    var t = e, n = t.alternate;
                    switch(t.tag){
                        case 15:
                        case 0:
                            t = Fc(n, t, t.pendingProps, t.type, void 0, xe);
                            break;
                        case 11:
                            t = Fc(n, t, t.pendingProps, t.type.render, t.ref, xe);
                            break;
                        case 5:
                            ol(t);
                        default:
                            Lc(n, t), t = ye = Cu(t, un), t = Dc(n, t, un);
                    }
                    e.memoizedProps = e.pendingProps, t === null ? Yr(e) : ye = t;
                }
                function lo(e, t, n, o) {
                    ln = $n = null, ol(t), vo = null, ar = 0;
                    var i = t.return;
                    try {
                        if (Uf(e, i, t, n, xe)) {
                            We = 1, Or(e, U(n, e.current)), ye = null;
                            return;
                        }
                    } catch (c) {
                        if (i !== null) throw ye = i, c;
                        We = 1, Or(e, U(n, e.current)), ye = null;
                        return;
                    }
                    t.flags & 32768 ? (Se || o === 1 ? e = !0 : Po || (xe & 536870912) !== 0 ? e = !1 : (Pn = e = !0, (o === 2 || o === 9 || o === 3 || o === 6) && (o = _t.current, o !== null && o.tag === 13 && (o.flags |= 16384))), pu(t, e)) : Yr(t);
                }
                function Yr(e) {
                    var t = e;
                    do {
                        if ((t.flags & 32768) !== 0) {
                            pu(t, Pn);
                            return;
                        }
                        e = t.return;
                        var n = Wf(t.alternate, t, un);
                        if (n !== null) {
                            ye = n;
                            return;
                        }
                        if (t = t.sibling, t !== null) {
                            ye = t;
                            return;
                        }
                        ye = t = e;
                    }while (t !== null);
                    We === 0 && (We = 5);
                }
                function pu(e, t) {
                    do {
                        var n = Qf(e.alternate, e);
                        if (n !== null) {
                            n.flags &= 32767, ye = n;
                            return;
                        }
                        if (n = e.return, n !== null && (n.flags |= 32768, n.subtreeFlags = 0, n.deletions = null), !t && (e = e.sibling, e !== null)) {
                            ye = e;
                            return;
                        }
                        ye = e = n;
                    }while (e !== null);
                    We = 6, ye = null;
                }
                function hu(e, t, n, o, i, c, f, M, L) {
                    e.cancelPendingCommit = null;
                    do Xo();
                    while (tt !== 0);
                    if ((ge & 6) !== 0) throw Error(d(327));
                    if (t !== null) {
                        if (t === e.current) throw Error(d(177));
                        if (c = t.lanes | t.childLanes, c |= di, G(e, n, c, f, M, L), e === Ee && (ye = Ee = null, xe = 0), Fo = t, Tn = e, dn = n, Si = c, ji = i, fd = o, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (e.callbackNode = null, e.callbackPriority = 0, tm(oi, function() {
                            return vu(), null;
                        })) : (e.callbackNode = null, e.callbackPriority = 0), o = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || o) {
                            o = le.T, le.T = null, i = an(), ot(2), f = ge, ge |= 4;
                            try {
                                Vf(e, t, n);
                            } finally{
                                ge = f, ot(i), le.T = o;
                            }
                        }
                        tt = 1, bu(), gu(), yu();
                    }
                }
                function bu() {
                    if (tt === 1) {
                        tt = 0;
                        var e = Tn, t = Fo, n = (t.flags & 13878) !== 0;
                        if ((t.subtreeFlags & 13878) !== 0 || n) {
                            n = le.T, le.T = null;
                            var o = an();
                            ot(2);
                            var i = ge;
                            ge |= 4;
                            try {
                                Yc(t, e), mm(e.containerInfo);
                            } finally{
                                ge = i, ot(o), le.T = n;
                            }
                        }
                        e.current = t, tt = 2;
                    }
                }
                function gu() {
                    if (tt === 2) {
                        tt = 0;
                        var e = Tn, t = Fo, n = (t.flags & 8772) !== 0;
                        if ((t.subtreeFlags & 8772) !== 0 || n) {
                            n = le.T, le.T = null;
                            var o = an();
                            ot(2);
                            var i = ge;
                            ge |= 4;
                            try {
                                Vc(e, t.alternate, t);
                            } finally{
                                ge = i, ot(o), le.T = n;
                            }
                        }
                        tt = 3;
                    }
                }
                function yu() {
                    if (tt === 4 || tt === 3) {
                        tt = 0, Bp();
                        var e = Tn, t = Fo, n = dn, o = fd;
                        (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? tt = 5 : (tt = 0, Fo = Tn = null, xu(e, e.pendingLanes));
                        var i = e.pendingLanes;
                        if (i === 0 && (Fn = null), X(n), t = t.stateNode, zt && typeof zt.onCommitFiberRoot == "function") try {
                            zt.onCommitFiberRoot(tr, t, void 0, (t.current.flags & 128) === 128);
                        } catch  {}
                        if (o !== null) {
                            t = le.T, i = an(), ot(2), le.T = null;
                            try {
                                for(var c = e.onRecoverableError, f = 0; f < o.length; f++){
                                    var M = o[f];
                                    c(M.value, {
                                        componentStack: M.stack
                                    });
                                }
                            } finally{
                                le.T = t, ot(i);
                            }
                        }
                        (dn & 3) !== 0 && Xo(), qt(e), i = e.pendingLanes, (n & 261930) !== 0 && (i & 42) !== 0 ? e === Ci ? dr++ : (dr = 0, Ci = e) : dr = 0, mt && jp(), no(0);
                    }
                }
                function xu(e, t) {
                    (e.pooledCacheLanes &= t) === 0 && (t = e.pooledCache, t != null && (e.pooledCache = null, yt(t)));
                }
                function Xo() {
                    return bu(), gu(), yu(), vu();
                }
                function vu() {
                    if (tt !== 5) return !1;
                    var e = Tn, t = Si;
                    Si = 0;
                    var n = X(dn), o = 32 > n ? 32 : n;
                    n = le.T;
                    var i = an();
                    try {
                        ot(o), le.T = null, o = ji, ji = null;
                        var c = Tn, f = dn;
                        if (tt = 0, Fo = Tn = null, dn = 0, (ge & 6) !== 0) throw Error(d(331));
                        var M = ge;
                        if (ge |= 4, tu(c.current), Zc(c, c.current, f, o), ge = M, no(0, !1), zt && typeof zt.onPostCommitFiberRoot == "function") try {
                            zt.onPostCommitFiberRoot(tr, c);
                        } catch  {}
                        return !0;
                    } finally{
                        ot(i), le.T = n, xu(e, t);
                    }
                }
                function Su(e, t, n) {
                    t = U(n, t), t = hl(e.stateNode, t, 2), e = hn(e, t, 2), e !== null && (z(e, 2), qt(e));
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
                                e = U(n, e), n = vc(2), o = hn(t, n, 2), o !== null && (Sc(n, o, t, e), z(o, 2), qt(o));
                                break;
                            }
                        }
                        t = t.return;
                    }
                }
                function Bl(e, t, n) {
                    var o = e.pingCache;
                    if (o === null) {
                        o = e.pingCache = new Kp;
                        var i = new Set;
                        o.set(t, i);
                    } else i = o.get(t), i === void 0 && (i = new Set, o.set(t, i));
                    i.has(n) || (yi = !0, i.add(n), e = Zf.bind(null, e, t, n), t.then(e, e));
                }
                function Zf(e, t, n) {
                    var o = e.pingCache;
                    o !== null && o.delete(t), e.pingedLanes |= e.suspendedLanes & n, e.warmLanes &= ~n, Ee === e && (xe & n) === n && (We === 4 || We === 3 && (xe & 62914560) === xe && 300 > vt() - va ? (ge & 2) === 0 && ao(e, 0) : xi |= n, Mo === xe && (Mo = 0)), qt(e);
                }
                function ju(e, t) {
                    t === 0 && (t = k()), e = An(e, t), e !== null && (z(e, t), qt(e));
                }
                function Jf(e) {
                    var t = e.memoizedState, n = 0;
                    t !== null && (n = t.retryLane), ju(e, n);
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
                    o !== null && o.delete(t), ju(e, n);
                }
                function tm(e, t) {
                    return ra(e, t);
                }
                function nm(e, t, n, o) {
                    this.tag = e, this.key = n, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = o, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
                }
                function Ll(e) {
                    return e = e.prototype, !(!e || !e.isReactComponent);
                }
                function on(e, t) {
                    var n = e.alternate;
                    return n === null ? (n = s(e.tag, t, e.key, e.mode), n.elementType = e.elementType, n.type = e.type, n.stateNode = e.stateNode, n.alternate = e, e.alternate = n) : (n.pendingProps = t, n.type = e.type, n.flags = 0, n.subtreeFlags = 0, n.deletions = null), n.flags = e.flags & 65011712, n.childLanes = e.childLanes, n.lanes = e.lanes, n.child = e.child, n.memoizedProps = e.memoizedProps, n.memoizedState = e.memoizedState, n.updateQueue = e.updateQueue, t = e.dependencies, n.dependencies = t === null ? null : {
                        lanes: t.lanes,
                        firstContext: t.firstContext
                    }, n.sibling = e.sibling, n.index = e.index, n.ref = e.ref, n.refCleanup = e.refCleanup, n;
                }
                function Cu(e, t) {
                    e.flags &= 65011714;
                    var n = e.alternate;
                    return n === null ? (e.childLanes = 0, e.lanes = t, e.child = null, e.subtreeFlags = 0, e.memoizedProps = null, e.memoizedState = null, e.updateQueue = null, e.dependencies = null, e.stateNode = null) : (e.childLanes = n.childLanes, e.lanes = n.lanes, e.child = n.child, e.subtreeFlags = 0, e.deletions = null, e.memoizedProps = n.memoizedProps, e.memoizedState = n.memoizedState, e.updateQueue = n.updateQueue, e.type = n.type, t = n.dependencies, e.dependencies = t === null ? null : {
                        lanes: t.lanes,
                        firstContext: t.firstContext
                    }), e;
                }
                function Xr(e, t, n, o, i, c) {
                    var f = 0;
                    if (o = e, typeof e == "function") Ll(e) && (f = 1);
                    else if (typeof e == "string") f = Wt && et ? Vu(e, n, st.current) ? 26 : td(e) ? 27 : 5 : Wt ? Vu(e, n, st.current) ? 26 : 5 : et && td(e) ? 27 : 5;
                    else e: switch(e){
                        case Kl:
                            return e = s(31, n, t, i), e.elementType = Kl, e.lanes = c, e;
                        case so:
                            return Ln(n.children, i, c, t);
                        case Eu:
                            f = 8, i |= 24;
                            break;
                        case Wl:
                            return e = s(12, n, t, i | 2), e.elementType = Wl, e.lanes = c, e;
                        case Vl:
                            return e = s(13, n, t, i), e.elementType = Vl, e.lanes = c, e;
                        case ql:
                            return e = s(19, n, t, i), e.elementType = ql, e.lanes = c, e;
                        default:
                            if (typeof e == "object" && e !== null) switch(e.$$typeof){
                                case vn:
                                    f = 10;
                                    break e;
                                case zu:
                                    f = 9;
                                    break e;
                                case Ql:
                                    f = 11;
                                    break e;
                                case Hl:
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
                function Ln(e, t, n, o) {
                    return e = s(7, e, o, t), e.lanes = n, e;
                }
                function Ol(e, t, n) {
                    return e = s(6, e, null, t), e.lanes = n, e;
                }
                function wu(e) {
                    var t = s(18, null, null, 0);
                    return t.stateNode = e, t;
                }
                function Ul(e, t, n) {
                    return t = s(4, e.children !== null ? e.children : [], e.key, t), t.lanes = n, t.stateNode = {
                        containerInfo: e.containerInfo,
                        pendingChildren: null,
                        implementation: e.implementation
                    }, t;
                }
                function om(e, t, n, o, i, c, f, M, L) {
                    this.tag = 1, this.containerInfo = e, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = On, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = T(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = T(0), this.hiddenUpdates = T(null), this.identifierPrefix = o, this.onUncaughtError = i, this.onCaughtError = c, this.onRecoverableError = f, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = L, this.incompleteTransitions = new Map;
                }
                function ku(e, t, n, o, i, c, f, M, L, W, Y, q) {
                    return e = new om(e, t, n, f, L, W, Y, q, M), t = 1, c === !0 && (t |= 24), c = s(3, null, null, t), e.current = c, c.stateNode = e, t = Rt(), t.refCount++, e.pooledCache = t, t.refCount++, c.memoizedState = {
                        element: o,
                        isDehydrated: n,
                        cache: t
                    }, qa(c), e;
                }
                function Pu(e) {
                    return e ? (e = mo, e) : mo;
                }
                function Mu(e) {
                    var t = e._reactInternals;
                    if (t === void 0) throw typeof e.render == "function" ? Error(d(188)) : (e = Object.keys(e).join(","), Error(d(268, e)));
                    return e = v(t), e = e !== null ? b(e) : null, e === null ? null : Zo(e.stateNode);
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
                function $l(e, t) {
                    Tu(e, t), (e = e.alternate) && Tu(e, t);
                }
                var be = {}, rm = is, Tt = $h, Gl = Object.assign, am = Symbol.for("react.element"), Zr = Symbol.for("react.transitional.element"), io = Symbol.for("react.portal"), so = Symbol.for("react.fragment"), Eu = Symbol.for("react.strict_mode"), Wl = Symbol.for("react.profiler"), zu = Symbol.for("react.consumer"), vn = Symbol.for("react.context"), Ql = Symbol.for("react.forward_ref"), Vl = Symbol.for("react.suspense"), ql = Symbol.for("react.suspense_list"), Hl = Symbol.for("react.memo"), Sn = Symbol.for("react.lazy"), Kl = Symbol.for("react.activity"), lm = Symbol.for("react.memo_cache_sentinel"), Iu = Symbol.iterator, im = Symbol.for("react.client.reference"), Jr = Array.isArray, le = rm.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, sm = a.rendererVersion, cm = a.rendererPackageName, _u = a.extraDevToolsConfig, Zo = a.getPublicInstance, um = a.getRootHostContext, dm = a.getChildHostContext, fm = a.prepareForCommit, mm = a.resetAfterCommit, pm = a.createInstance;
                a.cloneMutableInstance;
                var Yl = a.appendInitialChild, Du = a.finalizeInitialChildren, ea = a.shouldSetTextContent, Au = a.createTextInstance;
                a.cloneMutableTextInstance;
                var hm = a.scheduleTimeout, bm = a.cancelTimeout, On = a.noTimeout, rn = a.isPrimaryRenderer;
                a.warnsIfNotActing;
                var ft = a.supportsMutation, Kt = a.supportsPersistence, mt = a.supportsHydration, gm = a.getInstanceFromNode;
                a.beforeActiveInstanceBlur;
                var ym = a.preparePortalMount;
                a.prepareScopeUpdate, a.getInstanceFromScope;
                var ot = a.setCurrentUpdatePriority, an = a.getCurrentUpdatePriority, xm = a.resolveUpdatePriority;
                a.trackSchedulerEvent, a.resolveEventType, a.resolveEventTimeStamp;
                var vm = a.shouldAttemptEagerTransition, Sm = a.detachDeletedInstance;
                a.requestPostPaintCallback;
                var jm = a.maySuspendCommit, Cm = a.maySuspendCommitOnUpdate, Xl = a.maySuspendCommitInSyncRender, Ru = a.preloadInstance, wm = a.startSuspendingCommit, Nu = a.suspendInstance;
                a.suspendOnActiveViewTransition;
                var km = a.waitForCommitToBeReady;
                a.getSuspendedCommitReason;
                var co = a.NotPendingTransition, Un = a.HostTransitionContext, Pm = a.resetFormInstance;
                a.bindToConsole;
                var Mm = a.supportsMicrotasks, Fm = a.scheduleMicrotask, Jo = a.supportsTestSelectors, Tm = a.findFiberRoot, Em = a.getBoundingRect, zm = a.getTextContent, er = a.isHiddenSubtree, Im = a.matchAccessibilityRole, _m = a.setFocusIfFocusable, Dm = a.setupIntersectionObserver, Am = a.appendChild, Rm = a.appendChildToContainer, Nm = a.commitTextUpdate, Bm = a.commitMount, Lm = a.commitUpdate, Om = a.insertBefore, Um = a.insertInContainerBefore, $m = a.removeChild, Gm = a.removeChildFromContainer, Bu = a.resetTextContent, Wm = a.hideInstance, Qm = a.hideTextInstance, Vm = a.unhideInstance, qm = a.unhideTextInstance;
                a.cancelViewTransitionName, a.cancelRootViewTransitionName, a.restoreRootViewTransitionName, a.cloneRootViewTransitionContainer, a.removeRootViewTransitionClone, a.measureClonedInstance, a.hasInstanceChanged, a.hasInstanceAffectedParent, a.startViewTransition, a.startGestureTransition, a.stopViewTransition, a.getCurrentGestureOffset, a.createViewTransitionInstance;
                var Hm = a.clearContainer;
                a.createFragmentInstance, a.updateFragmentInstanceFiber, a.commitNewChildToFragmentInstance, a.deleteChildFromFragmentInstance;
                var Km = a.cloneInstance, Lu = a.createContainerChildSet, Ou = a.appendChildToContainerChildSet, Ym = a.finalizeContainerChildren, Uu = a.replaceContainerChildren, $u = a.cloneHiddenInstance, Gu = a.cloneHiddenTextInstance, Zl = a.isSuspenseInstancePending, Jl = a.isSuspenseInstanceFallback, Xm = a.getSuspenseInstanceFallbackErrorDetails, Zm = a.registerSuspenseInstanceRetry, Jm = a.canHydrateFormStateMarker, ep = a.isFormStateMarkerMatching, Wu = a.getNextHydratableSibling, tp = a.getNextHydratableSiblingAfterSingleton, np = a.getFirstHydratableChild, op = a.getFirstHydratableChildWithinContainer, rp = a.getFirstHydratableChildWithinActivityInstance, ap = a.getFirstHydratableChildWithinSuspenseInstance, lp = a.getFirstHydratableChildWithinSingleton, ip = a.canHydrateInstance, sp = a.canHydrateTextInstance, cp = a.canHydrateActivityInstance, up = a.canHydrateSuspenseInstance, dp = a.hydrateInstance, fp = a.hydrateTextInstance, mp = a.hydrateActivityInstance, pp = a.hydrateSuspenseInstance, hp = a.getNextHydratableInstanceAfterActivityInstance, bp = a.getNextHydratableInstanceAfterSuspenseInstance, gp = a.commitHydratedInstance, yp = a.commitHydratedContainer, xp = a.commitHydratedActivityInstance, vp = a.commitHydratedSuspenseInstance, Sp = a.finalizeHydratedChildren, jp = a.flushHydrationEvents;
                a.clearActivityBoundary;
                var Cp = a.clearSuspenseBoundary;
                a.clearActivityBoundaryFromContainer;
                var wp = a.clearSuspenseBoundaryFromContainer, kp = a.hideDehydratedBoundary, Pp = a.unhideDehydratedBoundary, Qu = a.shouldDeleteUnhydratedTailInstances;
                a.diffHydratedPropsForDevWarnings, a.diffHydratedTextForDevWarnings, a.describeHydratableInstanceForDevWarnings;
                var Mp = a.validateHydratableInstance, Fp = a.validateHydratableTextInstance, Wt = a.supportsResources, Vu = a.isHostHoistableType, ei = a.getHoistableRoot, qu = a.getResource, Hu = a.acquireResource, Ku = a.releaseResource, Tp = a.hydrateHoistable, Yu = a.mountHoistable, Xu = a.unmountHoistable, Ep = a.createHoistableInstance, zp = a.prepareToCommitHoistables, Ip = a.mayResourceSuspendCommit, Zu = a.preloadResource, _p = a.suspendResource, et = a.supportsSingletons, Ju = a.resolveSingletonInstance, Dp = a.acquireSingletonInstance, ed = a.releaseSingletonInstance, td = a.isHostSingletonType, uo = a.isSingletonScope, ti = [], fo = -1, mo = {}, Et = Math.clz32 ? Math.clz32 : w, Ap = Math.log, Rp = Math.LN2, ta = 256, na = 262144, oa = 4194304, ra = Tt.unstable_scheduleCallback, ni = Tt.unstable_cancelCallback, Np = Tt.unstable_shouldYield, Bp = Tt.unstable_requestPaint, vt = Tt.unstable_now, nd = Tt.unstable_ImmediatePriority, Lp = Tt.unstable_UserBlockingPriority, oi = Tt.unstable_NormalPriority, Op = Tt.unstable_IdlePriority, Up = Tt.log, $p = Tt.unstable_setDisableYieldValue, tr = null, zt = null, It = typeof Object.is == "function" ? Object.is : Z, od = typeof reportError == "function" ? reportError : function(e) {
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
                }, Gp = Object.prototype.hasOwnProperty, ri, rd, ai = !1, ad = new WeakMap, po = [], ho = 0, aa = null, nr = 0, Nt = [], Bt = 0, jn = null, Yt = 1, Xt = "", st = P(null), or = P(null), Cn = P(null), la = P(null), ct = null, Ne = null, Se = !1, wn = null, Lt = !1, li = Error(d(519)), ia = P(null), $n = null, ln = null, Wp = typeof AbortController < "u" ? AbortController : function() {
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
                }, sa = null, bo = null, ii = !1, ca = !1, si = !1, Gn = 0, rr = null, ci = 0, go = 0, yo = null, ld = le.S;
                le.S = function(e, t) {
                    dd = vt(), typeof t == "object" && t !== null && typeof t.then == "function" && _f(e, t), ld !== null && ld(e, t);
                };
                var Wn = P(null), xo = Error(d(460)), ui = Error(d(474)), ua = Error(d(542)), da = {
                    then: function() {}
                }, Qn = null, vo = null, ar = 0, Vn = Es(!0), id = Es(!1), Ot = [], So = 0, di = 0, kn = !1, fi = !1, jo = P(null), fa = P(0), _t = P(null), Qt = null, Ve = P(0), sn = 0, fe = null, Te = null, Ke = null, ma = !1, Co = !1, qn = !1, pa = 0, lr = 0, wo = null, qp = 0, ir = {
                    readContext: je,
                    use: Ar,
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
                ir.useEffectEvent = Ge;
                var sd = {
                    readContext: je,
                    use: Ar,
                    useCallback: function(e, t) {
                        return pt().memoizedState = [
                            e,
                            t === void 0 ? null : t
                        ], e;
                    },
                    useContext: je,
                    useEffect: tc,
                    useImperativeHandle: function(e, t, n) {
                        n = n != null ? n.concat([
                            e
                        ]) : null, Nr(4194308, 4, ac.bind(null, t, e), n);
                    },
                    useLayoutEffect: function(e, t) {
                        return Nr(4194308, 4, e, t);
                    },
                    useInsertionEffect: function(e, t) {
                        Nr(4, 2, e, t);
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
                        }, o.queue = e, e = e.dispatch = Of.bind(null, fe, e), [
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
                        e = il(e);
                        var t = e.queue, n = pc.bind(null, fe, t);
                        return t.dispatch = n, [
                            e.memoizedState,
                            n
                        ];
                    },
                    useDebugValue: ul,
                    useDeferredValue: function(e, t) {
                        var n = pt();
                        return dl(n, e, t);
                    },
                    useTransition: function() {
                        var e = il(!1);
                        return e = uc.bind(null, fe, e.queue, !0, !1), pt().memoizedState = e, [
                            !1,
                            e
                        ];
                    },
                    useSyncExternalStore: function(e, t, n) {
                        var o = fe, i = pt();
                        if (Se) {
                            if (n === void 0) throw Error(d(407));
                            n = n();
                        } else {
                            if (n = t(), Ee === null) throw Error(d(349));
                            (xe & 127) !== 0 || Ls(o, t, n);
                        }
                        i.memoizedState = n;
                        var c = {
                            value: n,
                            getSnapshot: t
                        };
                        return i.queue = c, tc(Us.bind(null, o, c, e), [
                            e
                        ]), o.flags |= 2048, oo(9, {
                            destroy: void 0
                        }, Os.bind(null, o, c, n, t), null), n;
                    },
                    useId: function() {
                        var e = pt(), t = Ee.identifierPrefix;
                        if (Se) {
                            var n = Xt, o = Yt;
                            n = (o & ~(1 << 32 - Et(o) - 1)).toString(32) + n, t = "_" + t + "R_" + n, n = pa++, 0 < n && (t += "H" + n.toString(32)), t += "_";
                        } else n = qp++, t = "_" + t + "r_" + n.toString(32) + "_";
                        return e.memoizedState = t;
                    },
                    useHostTransitionStatus: fl,
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
                        return t.queue = n, t = ml.bind(null, fe, !0, n), n.dispatch = t, [
                            e,
                            t
                        ];
                    },
                    useMemoCache: rl,
                    useCacheRefresh: function() {
                        return pt().memoizedState = Lf.bind(null, fe);
                    },
                    useEffectEvent: function(e) {
                        var t = pt(), n = {
                            impl: e
                        };
                        return t.memoizedState = n, function() {
                            if ((ge & 2) !== 0) throw Error(d(440));
                            return n.impl.apply(void 0, arguments);
                        };
                    }
                }, mi = {
                    readContext: je,
                    use: Ar,
                    useCallback: ic,
                    useContext: je,
                    useEffect: cl,
                    useImperativeHandle: lc,
                    useInsertionEffect: oc,
                    useLayoutEffect: rc,
                    useMemo: sc,
                    useReducer: Rr,
                    useRef: ec,
                    useState: function() {
                        return Rr(Jt);
                    },
                    useDebugValue: ul,
                    useDeferredValue: function(e, t) {
                        var n = Qe();
                        return cc(n, Te.memoizedState, e, t);
                    },
                    useTransition: function() {
                        var e = Rr(Jt)[0], t = Qe().memoizedState;
                        return [
                            typeof e == "boolean" ? e : Go(e),
                            t
                        ];
                    },
                    useSyncExternalStore: Bs,
                    useId: fc,
                    useHostTransitionStatus: fl,
                    useFormState: Xs,
                    useActionState: Xs,
                    useOptimistic: function(e, t) {
                        var n = Qe();
                        return Ws(n, Te, e, t);
                    },
                    useMemoCache: rl,
                    useCacheRefresh: mc
                };
                mi.useEffectEvent = nc;
                var cd = {
                    readContext: je,
                    use: Ar,
                    useCallback: ic,
                    useContext: je,
                    useEffect: cl,
                    useImperativeHandle: lc,
                    useInsertionEffect: oc,
                    useLayoutEffect: rc,
                    useMemo: sc,
                    useReducer: ll,
                    useRef: ec,
                    useState: function() {
                        return ll(Jt);
                    },
                    useDebugValue: ul,
                    useDeferredValue: function(e, t) {
                        var n = Qe();
                        return Te === null ? dl(n, e, t) : cc(n, Te.memoizedState, e, t);
                    },
                    useTransition: function() {
                        var e = ll(Jt)[0], t = Qe().memoizedState;
                        return [
                            typeof e == "boolean" ? e : Go(e),
                            t
                        ];
                    },
                    useSyncExternalStore: Bs,
                    useId: fc,
                    useHostTransitionStatus: fl,
                    useFormState: Js,
                    useActionState: Js,
                    useOptimistic: function(e, t) {
                        var n = Qe();
                        return Te !== null ? Ws(n, Te, e, t) : (n.baseState = e, [
                            e,
                            n.queue.dispatch
                        ]);
                    },
                    useMemoCache: rl,
                    useCacheRefresh: mc
                };
                cd.useEffectEvent = nc;
                var pi = {
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
                }, hi = Error(d(461)), Ye = !1, bi = {
                    dehydrated: null,
                    treeContext: null,
                    retryLane: 0,
                    hydrationErrors: null
                }, cn = !1, Xe = !1, gi = !1, ud = typeof WeakSet == "function" ? WeakSet : Set, rt = null, Ze = null, St = !1, Vt = null, ko = 8192, Hp = {
                    getCacheForType: function(e) {
                        var t = je(Be), n = t.data.get(e);
                        return n === void 0 && (n = e(), t.data.set(e, n)), n;
                    },
                    cacheSignal: function() {
                        return je(Be).controller.signal;
                    }
                }, ha = 0, ba = 1, ga = 2, ya = 3, xa = 4;
                if (typeof Symbol == "function" && Symbol.for) {
                    var sr = Symbol.for;
                    ha = sr("selector.component"), ba = sr("selector.has_pseudo_class"), ga = sr("selector.role"), ya = sr("selector.test_id"), xa = sr("selector.text");
                }
                var Kp = typeof WeakMap == "function" ? WeakMap : Map, ge = 0, Ee = null, ye = null, xe = 0, Fe = 0, Dt = null, Pn = !1, Po = !1, yi = !1, un = 0, We = 0, Mn = 0, Hn = 0, xi = 0, At = 0, Mo = 0, cr = null, jt = null, vi = !1, va = 0, dd = 0, ur = 1 / 0, Sa = null, Fn = null, tt = 0, Tn = null, Fo = null, dn = 0, Si = 0, ji = null, fd = null, dr = 0, Ci = null;
                return be.attemptContinuousHydration = function(e) {
                    if (e.tag === 13 || e.tag === 31) {
                        var t = An(e, 67108864);
                        t !== null && xt(t, e, 67108864), $l(e, 67108864);
                    }
                }, be.attemptHydrationAtCurrentPriority = function(e) {
                    if (e.tag === 13 || e.tag === 31) {
                        var t = Ft();
                        t = K(t);
                        var n = An(e, t);
                        n !== null && xt(n, e, t), $l(e, t);
                    }
                }, be.attemptSynchronousHydration = function(e) {
                    switch(e.tag){
                        case 3:
                            if (e = e.stateNode, e.current.memoizedState.isDehydrated) {
                                var t = F(e.pendingLanes);
                                if (t !== 0) {
                                    for(e.pendingLanes |= 2, e.entangledLanes |= 2; t;){
                                        var n = 1 << 31 - Et(t);
                                        e.entanglements[1] |= n, t &= ~n;
                                    }
                                    qt(e), (ge & 6) === 0 && (ur = vt() + 500, no(0));
                                }
                            }
                            break;
                        case 31:
                        case 13:
                            t = An(e, 2), t !== null && xt(t, e, 2), iu(), $l(e, 2);
                    }
                }, be.batchedUpdates = function(e, t) {
                    return e(t);
                }, be.createComponentSelector = function(e) {
                    return {
                        $$typeof: ha,
                        value: e
                    };
                }, be.createContainer = function(e, t, n, o, i, c, f, M, L, W) {
                    return ku(e, t, !1, null, n, o, c, null, f, M, L, W);
                }, be.createHasPseudoClassSelector = function(e) {
                    return {
                        $$typeof: ba,
                        value: e
                    };
                }, be.createHydrationContainer = function(e, t, n, o, i, c, f, M, L, W, Y, q, oe, de) {
                    var Je;
                    return e = ku(n, o, !0, e, i, c, M, de, L, W, Y, q), e.context = Pu(null), n = e.current, o = Ft(), o = K(o), i = pn(o), i.callback = (Je = t) != null ? Je : null, hn(n, i, o), t = o, e.current.lanes = t, z(e, t), qt(e), e;
                }, be.createPortal = function(e, t, n) {
                    var o = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
                    return {
                        $$typeof: io,
                        key: o == null ? null : "" + o,
                        children: e,
                        containerInfo: t,
                        implementation: n
                    };
                }, be.createRoleSelector = function(e) {
                    return {
                        $$typeof: ga,
                        value: e
                    };
                }, be.createTestNameSelector = function(e) {
                    return {
                        $$typeof: ya,
                        value: e
                    };
                }, be.createTextSelector = function(e) {
                    return {
                        $$typeof: xa,
                        value: e
                    };
                }, be.defaultOnCaughtError = function(e) {
                    console.error(e);
                }, be.defaultOnRecoverableError = function(e) {
                    od(e);
                }, be.defaultOnUncaughtError = function(e) {
                    od(e);
                }, be.deferredUpdates = function(e) {
                    var t = le.T, n = an();
                    try {
                        return ot(32), le.T = null, e();
                    } finally{
                        ot(n), le.T = t;
                    }
                }, be.discreteUpdates = function(e, t, n, o, i) {
                    var c = le.T, f = an();
                    try {
                        return ot(2), le.T = null, e(t, n, o, i);
                    } finally{
                        ot(f), le.T = c, ge === 0 && (ur = vt() + 500);
                    }
                }, be.findAllNodes = Al, be.findBoundingRects = function(e, t) {
                    if (!Jo) throw Error(d(363));
                    t = Al(e, t), e = [];
                    for(var n = 0; n < t.length; n++)e.push(Em(t[n]));
                    for(t = e.length - 1; 0 < t; t--){
                        n = e[t];
                        for(var o = n.x, i = o + n.width, c = n.y, f = c + n.height, M = t - 1; 0 <= M; M--)if (t !== M) {
                            var L = e[M], W = L.x, Y = W + L.width, q = L.y, oe = q + L.height;
                            if (o >= W && c >= q && i <= Y && f <= oe) {
                                e.splice(t, 1);
                                break;
                            } else if (o !== W || n.width !== L.width || oe < c || q > f) {
                                if (!(c !== q || n.height !== L.height || Y < o || W > i)) {
                                    W > o && (L.width += W - o, L.x = o), Y < i && (L.width = i - W), e.splice(t, 1);
                                    break;
                                }
                            } else {
                                q > c && (L.height += q - c, L.y = c), oe < f && (L.height = f - q), e.splice(t, 1);
                                break;
                            }
                        }
                    }
                    return e;
                }, be.findHostInstance = Mu, be.findHostInstanceWithNoPortals = function(e) {
                    return e = v(e), e = e !== null ? x(e) : null, e === null ? null : Zo(e.stateNode);
                }, be.findHostInstanceWithWarning = function(e) {
                    return Mu(e);
                }, be.flushPassiveEffects = Xo, be.flushSyncFromReconciler = function(e) {
                    var t = ge;
                    ge |= 1;
                    var n = le.T, o = an();
                    try {
                        if (ot(2), le.T = null, e) return e();
                    } finally{
                        ot(o), le.T = n, ge = t, (ge & 6) === 0 && no(0);
                    }
                }, be.flushSyncWork = iu, be.focusWithin = function(e, t) {
                    if (!Jo) throw Error(d(363));
                    for(e = Il(e), t = ou(e, t), t = Array.from(t), e = 0; e < t.length;){
                        var n = t[e++], o = n.tag;
                        if (!er(n)) {
                            if ((o === 5 || o === 26 || o === 27) && _m(n.stateNode)) return !0;
                            for(n = n.child; n !== null;)t.push(n), n = n.sibling;
                        }
                    }
                    return !1;
                }, be.getFindAllNodesFailureDescription = function(e, t) {
                    if (!Jo) throw Error(d(363));
                    var n = 0, o = [];
                    e = [
                        Il(e),
                        0
                    ];
                    for(var i = 0; i < e.length;){
                        var c = e[i++], f = c.tag, M = e[i++], L = t[M];
                        if ((f !== 5 && f !== 26 && f !== 27 || !er(c)) && (_l(c, L) && (o.push(Dl(L)), M++, M > n && (n = M)), M < t.length)) for(c = c.child; c !== null;)e.push(c, M), c = c.sibling;
                    }
                    if (n < t.length) {
                        for(e = []; n < t.length; n++)e.push(Dl(t[n]));
                        return `findAllNodes was able to match part of the selector:
  ` + (o.join(" > ") + `

No matching component was found for:
  `) + e.join(" > ");
                    }
                    return null;
                }, be.getPublicRootInstance = function(e) {
                    if (e = e.current, !e.child) return null;
                    switch(e.child.tag){
                        case 27:
                        case 5:
                            return Zo(e.child.stateNode);
                        default:
                            return e.child.stateNode;
                    }
                }, be.injectIntoDevTools = function() {
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
                                tr = t.inject(e), zt = t;
                            } catch  {}
                            e = !!t.checkDCE;
                        }
                    }
                    return e;
                }, be.isAlreadyRendering = function() {
                    return (ge & 6) !== 0;
                }, be.observeVisibleRects = function(e, t, n, o) {
                    if (!Jo) throw Error(d(363));
                    e = Al(e, t);
                    var i = Dm(e, n, o).disconnect;
                    return {
                        disconnect: function() {
                            i();
                        }
                    };
                }, be.shouldError = function() {
                    return null;
                }, be.shouldSuspend = function() {
                    return !1;
                }, be.startHostTransition = function(e, t, n, o) {
                    if (e.tag !== 5) throw Error(d(476));
                    var i = dc(e).queue;
                    uc(e, i, t, co, n === null ? u : function() {
                        var c = dc(e);
                        return c.next === null && (c = e.alternate.memoizedState), Wo(e, c.next.queue, {}, Ft()), n(o);
                    });
                }, be.updateContainer = function(e, t, n, o) {
                    var i = t.current, c = Ft();
                    return Fu(i, c, e, t, n, o), c;
                }, be.updateContainerSync = function(e, t, n, o) {
                    return Fu(t.current, 2, e, t, n, o), 2;
                }, be;
            }, r.exports.default = r.exports, Object.defineProperty(r.exports, "__esModule", {
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
    function g0(r) {
        const a = b0(r);
        return a.injectIntoDevTools(), a;
    }
    const hf = 0, Ro = {}, y0 = /^three(?=[A-Z])/, Ua = (r)=>`${r[0].toUpperCase()}${r.slice(1)}`;
    let x0 = 0;
    const v0 = (r)=>typeof r == "function";
    function bf(r) {
        if (v0(r)) {
            const a = `${x0++}`;
            return Ro[a] = r, a;
        } else Object.assign(Ro, r);
    }
    function gf(r, a) {
        const s = Ua(r), u = Ro[s];
        if (r !== "primitive" && !u) throw new Error(`R3F: ${s} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`);
        if (r === "primitive" && !a.object) throw new Error("R3F: Primitives without 'object' are invalid!");
        if (a.args !== void 0 && !Array.isArray(a.args)) throw new Error("R3F: The args prop must be an array!");
    }
    function S0(r, a, s) {
        var u;
        return r = Ua(r) in Ro ? r : r.replace(y0, ""), gf(r, a), r === "primitive" && (u = a.object) != null && u.__r3f && delete a.object.__r3f, Aa(a.object, s, r, a);
    }
    function j0(r) {
        if (!r.isHidden) {
            var a;
            r.props.attach && (a = r.parent) != null && a.object ? Na(r.parent, r) : wt(r.object) && (r.object.visible = !1), r.isHidden = !0, Bo(r);
        }
    }
    function yf(r) {
        if (r.isHidden) {
            var a;
            r.props.attach && (a = r.parent) != null && a.object ? Ra(r.parent, r) : wt(r.object) && r.props.visible !== !1 && (r.object.visible = !0), r.isHidden = !1, Bo(r);
        }
    }
    function bs(r, a, s) {
        const u = a.root.getState();
        if (!(!r.parent && r.object !== u.scene)) {
            if (!a.object) {
                var d, m;
                const h = Ro[Ua(a.type)];
                a.object = (d = a.props.object) != null ? d : new h(...(m = a.props.args) != null ? m : []), a.object.__r3f = a;
            }
            if (_n(a.object, a.props), a.props.attach) Ra(r, a);
            else if (wt(a.object) && wt(r.object)) {
                const h = r.object.children.indexOf(s?.object);
                if (s && h !== -1) {
                    const v = r.object.children.indexOf(a.object);
                    if (v !== -1) {
                        r.object.children.splice(v, 1);
                        const b = v < h ? h - 1 : h;
                        r.object.children.splice(b, 0, a.object);
                    } else a.object.parent = r.object, r.object.children.splice(h, 0, a.object), a.object.dispatchEvent({
                        type: "added"
                    }), r.object.dispatchEvent({
                        type: "childadded",
                        child: a.object
                    });
                } else r.object.add(a.object);
            }
            for (const h of a.children)bs(a, h);
            Bo(a);
        }
    }
    function ki(r, a) {
        a && (a.parent = r, r.children.push(a), bs(r, a));
    }
    function Fd(r, a, s) {
        if (!a || !s) return;
        a.parent = r;
        const u = r.children.indexOf(s);
        u !== -1 ? r.children.splice(u, 0, a) : r.children.push(a), bs(r, a, s);
    }
    function xf(r) {
        if (typeof r.dispose == "function") {
            const a = ()=>{
                try {
                    r.dispose();
                } catch  {}
            };
            typeof IS_REACT_ACT_ENVIRONMENT < "u" ? a() : Qi.unstable_scheduleCallback(Qi.unstable_IdlePriority, a);
        }
    }
    function qi(r, a, s) {
        if (!a) return;
        a.parent = null;
        const u = r.children.indexOf(a);
        u !== -1 && r.children.splice(u, 1), a.props.attach ? Na(r, a) : wt(a.object) && wt(r.object) && (r.object.remove(a.object), r0(cf(a), a.object));
        const d = a.props.dispose !== null && s !== !1;
        for(let m = a.children.length - 1; m >= 0; m--){
            const h = a.children[m];
            qi(a, h, d);
        }
        a.children.length = 0, delete a.object.__r3f, d && a.type !== "primitive" && a.object.type !== "Scene" && xf(a.object), s === void 0 && Bo(a);
    }
    function C0(r, a) {
        for (const s of [
            r,
            r.alternate
        ])if (s !== null) if (typeof s.ref == "function") {
            s.refCleanup == null || s.refCleanup();
            const u = s.ref(a);
            typeof u == "function" && (s.refCleanup = u);
        } else s.ref && (s.ref.current = a);
    }
    const za = [];
    function w0() {
        for (const [s] of za){
            const u = s.parent;
            if (u) {
                s.props.attach ? Na(u, s) : wt(s.object) && wt(u.object) && u.object.remove(s.object);
                for (const d of s.children)d.props.attach ? Na(s, d) : wt(d.object) && wt(s.object) && s.object.remove(d.object);
            }
            s.isHidden && yf(s), s.object.__r3f && delete s.object.__r3f, s.type !== "primitive" && xf(s.object);
        }
        for (const [s, u, d] of za){
            s.props = u;
            const m = s.parent;
            if (m) {
                var r, a;
                const h = Ro[Ua(s.type)];
                s.object = (r = s.props.object) != null ? r : new h(...(a = s.props.args) != null ? a : []), s.object.__r3f = s, C0(d, s.object), _n(s.object, s.props), s.props.attach ? Ra(m, s) : wt(s.object) && wt(m.object) && m.object.add(s.object);
                for (const v of s.children)v.props.attach ? Ra(s, v) : wt(v.object) && wt(s.object) && s.object.add(v.object);
                Bo(s);
            }
        }
        za.length = 0;
    }
    const Pi = ()=>{}, Td = {};
    let Ca = hf;
    const k0 = 0, P0 = 4, Ba = g0({
        isPrimaryRenderer: !1,
        warnsIfNotActing: !1,
        supportsMutation: !0,
        supportsPersistence: !1,
        supportsHydration: !1,
        createInstance: S0,
        removeChild: qi,
        appendChild: ki,
        appendInitialChild: ki,
        insertBefore: Fd,
        appendChildToContainer (r, a) {
            const s = r.getState().scene.__r3f;
            !a || !s || ki(s, a);
        },
        removeChildFromContainer (r, a) {
            const s = r.getState().scene.__r3f;
            !a || !s || qi(s, a);
        },
        insertInContainerBefore (r, a, s) {
            const u = r.getState().scene.__r3f;
            !a || !s || !u || Fd(u, a, s);
        },
        getRootHostContext: ()=>Td,
        getChildHostContext: ()=>Td,
        commitUpdate (r, a, s, u, d) {
            var m, h, v;
            gf(a, u);
            let b = !1;
            if ((r.type === "primitive" && s.object !== u.object || ((m = u.args) == null ? void 0 : m.length) !== ((h = s.args) == null ? void 0 : h.length) || (v = u.args) != null && v.some((g, p)=>{
                var P;
                return g !== ((P = s.args) == null ? void 0 : P[p]);
            })) && (b = !0), b) za.push([
                r,
                {
                    ...u
                },
                d
            ]);
            else {
                const g = t0(r, u);
                Object.keys(g).length && (Object.assign(r.props, g), _n(r.object, g));
            }
            (d.sibling === null || (d.flags & P0) === k0) && w0();
        },
        finalizeInitialChildren: ()=>!1,
        commitMount () {},
        getPublicInstance: (r)=>r?.object,
        prepareForCommit: ()=>null,
        preparePortalMount: (r)=>Aa(r.getState().scene, r, "", {}),
        resetAfterCommit: ()=>{},
        shouldSetTextContent: ()=>!1,
        clearContainer: ()=>!1,
        hideInstance: j0,
        unhideInstance: yf,
        createTextInstance: Pi,
        hideTextInstance: Pi,
        unhideTextInstance: Pi,
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
        setCurrentUpdatePriority (r) {
            Ca = r;
        },
        getCurrentUpdatePriority () {
            return Ca;
        },
        resolveUpdatePriority () {
            var r;
            if (Ca !== hf) return Ca;
            switch(typeof window < "u" && ((r = window.event) == null ? void 0 : r.type)){
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
        applyViewTransitionName (r, a, s) {},
        restoreViewTransitionName (r, a) {},
        cancelViewTransitionName (r, a, s) {},
        cancelRootViewTransitionName (r) {},
        restoreRootViewTransitionName (r) {},
        InstanceMeasurement: null,
        measureInstance: (r)=>null,
        wasInstanceInViewport: (r)=>!0,
        hasInstanceChanged: (r, a)=>!1,
        hasInstanceAffectedParent: (r, a)=>!1,
        suspendOnActiveViewTransition (r, a) {},
        startGestureTransition: ()=>null,
        startViewTransition: ()=>null,
        stopViewTransition (r) {},
        createViewTransitionInstance: (r)=>null,
        getCurrentGestureOffset (r) {
            throw new Error("startGestureTransition is not yet supported in react-three-fiber.");
        },
        cloneMutableInstance (r, a) {
            return r;
        },
        cloneMutableTextInstance (r) {
            return r;
        },
        cloneRootViewTransitionContainer (r) {
            throw new Error("Not implemented.");
        },
        removeRootViewTransitionClone (r, a) {
            throw new Error("Not implemented.");
        },
        createFragmentInstance: (r)=>null,
        updateFragmentInstanceFiber (r, a) {},
        commitNewChildToFragmentInstance (r, a) {},
        deleteChildFromFragmentInstance (r, a) {},
        measureClonedInstance: (r)=>null,
        maySuspendCommitOnUpdate: (r, a, s)=>!1,
        maySuspendCommitInSyncRender: (r, a)=>!1,
        startSuspendingCommit: ()=>null,
        getSuspendedCommitReason: (r, a)=>null
    }), eo = new Map, Eo = {
        objects: "shallow",
        strict: !1
    };
    function M0(r, a) {
        if (!a && typeof HTMLCanvasElement < "u" && r instanceof HTMLCanvasElement && r.parentElement) {
            const { width: s, height: u, top: d, left: m } = r.parentElement.getBoundingClientRect();
            return {
                width: s,
                height: u,
                top: d,
                left: m
            };
        } else if (!a && typeof OffscreenCanvas < "u" && r instanceof OffscreenCanvas) return {
            width: r.width,
            height: r.height,
            top: 0,
            left: 0
        };
        return {
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            ...a
        };
    }
    function F0(r) {
        const a = eo.get(r), s = a?.fiber, u = a?.store;
        a && console.warn("R3F.createRoot should only be called once!");
        const d = typeof reportError == "function" ? reportError : console.error, m = u || l0(Yi, zd), h = s || Ba.createContainer(m, i0, null, !1, null, "", d, d, d, null);
        a || eo.set(r, {
            fiber: h,
            store: m
        });
        let v, b, x = !1, g = null;
        return {
            async configure (p = {}) {
                let P;
                g = new Promise((ee)=>P = ee);
                let { gl: j, size: E, scene: w, events: F, onCreated: C, shadows: S = !1, linear: D = !1, flat: k = !1, legacy: T = !1, orthographic: z = !1, frameloop: G = "always", dpr: _ = [
                    1,
                    2
                ], performance: O, raycaster: R, camera: K, onPointerMissed: X } = p, Q = m.getState(), Z = Q.gl;
                if (!Q.gl) {
                    const ee = {
                        canvas: r,
                        powerPreference: "high-performance",
                        antialias: !0,
                        alpha: !0
                    }, ne = typeof j == "function" ? await j(ee) : j;
                    Cd(ne) ? Z = ne : Z = new th({
                        ...ee,
                        ...j
                    }), Q.set({
                        gl: Z
                    });
                }
                let te = Q.raycaster;
                te || Q.set({
                    raycaster: te = new ss
                });
                const { params: V, ...ae } = R || {};
                if (Oe.equ(ae, te, Eo) || _n(te, {
                    ...ae
                }), Oe.equ(V, te.params, Eo) || _n(te, {
                    params: {
                        ...te.params,
                        ...V
                    }
                }), !Q.camera || Q.camera === b && !Oe.equ(b, K, Eo)) {
                    b = K;
                    const ee = K?.isCamera, ne = ee ? K : z ? new nh(0, 0, 0, 0, .1, 1e3) : new Xn(75, 0, .1, 1e3);
                    ee || (ne.position.z = 5, K && (_n(ne, K), ne.manual || ("aspect" in K || "left" in K || "right" in K || "bottom" in K || "top" in K) && (ne.manual = !0, ne.updateProjectionMatrix())), !Q.camera && !(K != null && K.rotation) && ne.lookAt(0, 0, 0)), Q.set({
                        camera: ne
                    }), te.camera = ne;
                }
                if (!Q.scene) {
                    let ee;
                    w != null && w.isScene ? (ee = w, Aa(ee, m, "", {})) : (ee = new Kd, Aa(ee, m, "", {}), w && _n(ee, w)), Q.set({
                        scene: ee
                    });
                }
                F && !Q.events.handlers && Q.set({
                    events: F(m)
                });
                const pe = M0(r, E);
                if (Oe.equ(pe, Q.size, Eo) || Q.setSize(pe.width, pe.height, pe.top, pe.left), _ && Q.viewport.dpr !== df(_) && Q.setDpr(_), Q.frameloop !== G && Q.setFrameloop(G), Q.onPointerMissed || Q.set({
                    onPointerMissed: X
                }), O && !Oe.equ(O, Q.performance, Eo) && Q.set((ee)=>({
                        performance: {
                            ...ee.performance,
                            ...O
                        }
                    })), !Q.xr) {
                    var U;
                    const ee = (he, Me)=>{
                        const Ue = m.getState();
                        Ue.frameloop !== "never" && zd(he, !0, Ue, Me);
                    }, ne = ()=>{
                        const he = m.getState();
                        he.gl.xr.enabled = he.gl.xr.isPresenting, he.gl.xr.setAnimationLoop(he.gl.xr.isPresenting ? ee : null), he.gl.xr.isPresenting || Yi(he);
                    }, ue = {
                        connect () {
                            const he = m.getState().gl;
                            he.xr.addEventListener("sessionstart", ne), he.xr.addEventListener("sessionend", ne);
                        },
                        disconnect () {
                            const he = m.getState().gl;
                            he.xr.removeEventListener("sessionstart", ne), he.xr.removeEventListener("sessionend", ne);
                        }
                    };
                    typeof ((U = Z.xr) == null ? void 0 : U.addEventListener) == "function" && ue.connect(), Q.set({
                        xr: ue
                    });
                }
                if (Z.shadowMap) {
                    const ee = Z.shadowMap.enabled, ne = Z.shadowMap.type;
                    if (Z.shadowMap.enabled = !!S, Oe.boo(S)) Z.shadowMap.type = wi;
                    else if (Oe.str(S)) {
                        var J;
                        const ue = {
                            basic: ah,
                            percentage: rh,
                            soft: wi,
                            variance: oh
                        };
                        Z.shadowMap.type = (J = ue[S]) != null ? J : wi;
                    } else Oe.obj(S) && Object.assign(Z.shadowMap, S);
                    (ee !== Z.shadowMap.enabled || ne !== Z.shadowMap.type) && (Z.shadowMap.needsUpdate = !0);
                }
                return lh.enabled = !T, x || (Z.outputColorSpace = D ? ih : Yd, Z.toneMapping = k ? Xd : sh), Q.legacy !== T && Q.set(()=>({
                        legacy: T
                    })), Q.linear !== D && Q.set(()=>({
                        linear: D
                    })), Q.flat !== k && Q.set(()=>({
                        flat: k
                    })), j && !Oe.fun(j) && !Cd(j) && !Oe.equ(j, Z, Eo) && _n(Z, j), v = C, x = !0, P(), this;
            },
            render (p) {
                return !x && !g && this.configure(), g.then(()=>{
                    Ba.updateContainer(l.jsx(T0, {
                        store: m,
                        children: p,
                        onCreated: v,
                        rootElement: r
                    }), h, null, ()=>{});
                }), m;
            },
            unmount () {
                vf(r);
            }
        };
    }
    function T0({ store: r, children: a, onCreated: s, rootElement: u }) {
        return wr(()=>{
            const d = r.getState();
            d.set((m)=>({
                    internal: {
                        ...m.internal,
                        active: !0
                    }
                })), s && s(d), r.getState().events.connected || d.events.connect == null || d.events.connect(u);
        }, []), l.jsx(ps.Provider, {
            value: r,
            children: a
        });
    }
    function vf(r, a) {
        const s = eo.get(r), u = s?.fiber;
        if (u) {
            const d = s?.store.getState();
            d && (d.internal.active = !1), Ba.updateContainer(null, u, null, ()=>{
                d && setTimeout(()=>{
                    try {
                        var m, h, v, b;
                        d.events.disconnect == null || d.events.disconnect(), (m = d.gl) == null || (h = m.renderLists) == null || h.dispose == null || h.dispose(), (v = d.gl) == null || v.forceContextLoss == null || v.forceContextLoss(), (b = d.gl) != null && b.xr && d.xr.disconnect(), Zh(d.scene), eo.delete(r);
                    } catch  {}
                }, 500);
            });
        }
    }
    function E0(r, a, s) {
        return l.jsx(z0, {
            children: r,
            container: a,
            state: s
        });
    }
    function z0({ state: r = {}, children: a, container: s }) {
        const { events: u, size: d, ...m } = r, h = hs(), [v] = y.useState(()=>new ss), [b] = y.useState(()=>new us), x = ms((p, P)=>{
            let j;
            if (P.camera && d) {
                const E = P.camera;
                j = p.viewport.getCurrentViewport(E, new Ae, d), E !== p.camera && mf(E, d);
            }
            return {
                ...p,
                ...P,
                scene: s,
                raycaster: v,
                pointer: b,
                mouse: b,
                previousRoot: h,
                events: {
                    ...p.events,
                    ...P.events,
                    ...u
                },
                size: {
                    ...p.size,
                    ...d
                },
                viewport: {
                    ...p.viewport,
                    ...j
                },
                setEvents: (E)=>P.set((w)=>({
                            ...w,
                            events: {
                                ...w.events,
                                ...E
                            }
                        }))
            };
        }), g = y.useMemo(()=>{
            const p = rf((j, E)=>({
                    ...m,
                    set: j,
                    get: E
                })), P = (j)=>p.setState((E)=>x.current(j, E));
            return P(h.getState()), h.subscribe(P), p;
        }, [
            h,
            s
        ]);
        return l.jsx(l.Fragment, {
            children: Ba.createPortal(l.jsx(ps.Provider, {
                value: g,
                children: a
            }), g, null)
        });
    }
    const I0 = new Set, _0 = new Set, D0 = new Set;
    function Mi(r, a) {
        if (r.size) for (const { callback: s } of r.values())s(a);
    }
    function xr(r, a) {
        switch(r){
            case "before":
                return Mi(I0, a);
            case "after":
                return Mi(_0, a);
            case "tail":
                return Mi(D0, a);
        }
    }
    let Fi, Ti;
    function Hi(r, a, s) {
        let u = a.clock.getDelta();
        a.frameloop === "never" && typeof r == "number" && (u = r - a.clock.elapsedTime, a.clock.oldTime = a.clock.elapsedTime, a.clock.elapsedTime = r), Fi = a.internal.subscribers;
        for(let d = 0; d < Fi.length; d++)Ti = Fi[d], Ti.ref.current(Ti.store.getState(), u, s);
        return !a.internal.priority && a.gl.render && a.gl.render(a.scene, a.camera), a.internal.frames = Math.max(0, a.internal.frames - 1), a.frameloop === "always" ? 1 : a.internal.frames;
    }
    let La = !1, Ki = !1, Ei, Ed, zo;
    function Sf(r) {
        Ed = requestAnimationFrame(Sf), La = !0, Ei = 0, xr("before", r), Ki = !0;
        for (const s of eo.values()){
            var a;
            zo = s.store.getState(), zo.internal.active && (zo.frameloop === "always" || zo.internal.frames > 0) && !((a = zo.gl.xr) != null && a.isPresenting) && (Ei += Hi(r, zo));
        }
        if (Ki = !1, xr("after", r), Ei === 0) return xr("tail", r), La = !1, cancelAnimationFrame(Ed);
    }
    function Yi(r, a = 1) {
        var s;
        if (!r) return eo.forEach((u)=>Yi(u.store.getState(), a));
        (s = r.gl.xr) != null && s.isPresenting || !r.internal.active || r.frameloop === "never" || (a > 1 ? r.internal.frames = Math.min(60, r.internal.frames + a) : Ki ? r.internal.frames = 2 : r.internal.frames = 1, La || (La = !0, requestAnimationFrame(Sf)));
    }
    function zd(r, a = !0, s, u) {
        if (a && xr("before", r), s) Hi(r, s, u);
        else for (const d of eo.values())Hi(r, d.store.getState());
        a && xr("after", r);
    }
    const zi = {
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
    function A0(r) {
        const { handlePointer: a } = a0(r);
        return {
            priority: 1,
            enabled: !0,
            compute (s, u, d) {
                u.pointer.set(s.offsetX / u.size.width * 2 - 1, -(s.offsetY / u.size.height) * 2 + 1), u.raycaster.setFromCamera(u.pointer, u.camera);
            },
            connected: void 0,
            handlers: Object.keys(zi).reduce((s, u)=>({
                    ...s,
                    [u]: a(u)
                }), {}),
            update: ()=>{
                var s;
                const { events: u, internal: d } = r.getState();
                (s = d.lastEvent) != null && s.current && u.handlers && u.handlers.onPointerMove(d.lastEvent.current);
            },
            connect: (s)=>{
                const { set: u, events: d } = r.getState();
                if (d.disconnect == null || d.disconnect(), u((m)=>({
                        events: {
                            ...m.events,
                            connected: s
                        }
                    })), d.handlers) for(const m in d.handlers){
                    const h = d.handlers[m], [v, b] = zi[m];
                    s.addEventListener(v, h, {
                        passive: b
                    });
                }
            },
            disconnect: ()=>{
                const { set: s, events: u } = r.getState();
                if (u.connected) {
                    if (u.handlers) for(const d in u.handlers){
                        const m = u.handlers[d], [h] = zi[d];
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
    function R0({ ref: r, children: a, fallback: s, resize: u, style: d, gl: m, events: h = A0, eventSource: v, eventPrefix: b, shadows: x, linear: g, flat: p, legacy: P, orthographic: j, frameloop: E, dpr: w, performance: F, raycaster: C, camera: S, scene: D, onPointerMissed: k, onCreated: T, ...z }) {
        y.useMemo(()=>bf(fh), []);
        const G = Kh(), [_, O] = dh({
            scroll: !0,
            debounce: {
                scroll: 50,
                resize: 0
            },
            ...u
        }), R = y.useRef(null), K = y.useRef(null);
        y.useImperativeHandle(r, ()=>R.current);
        const X = ms(k), [Q, Z] = y.useState(!1), [te, V] = y.useState(!1);
        if (Q) throw Q;
        if (te) throw te;
        const ae = y.useRef(null);
        wr(()=>{
            const U = R.current;
            if (O.width > 0 && O.height > 0 && U) {
                ae.current || (ae.current = F0(U));
                async function J() {
                    await ae.current.configure({
                        gl: m,
                        scene: D,
                        events: h,
                        shadows: x,
                        linear: g,
                        flat: p,
                        legacy: P,
                        orthographic: j,
                        frameloop: E,
                        dpr: w,
                        performance: F,
                        raycaster: C,
                        camera: S,
                        size: O,
                        onPointerMissed: (...ee)=>X.current == null ? void 0 : X.current(...ee),
                        onCreated: (ee)=>{
                            ee.events.connect == null || ee.events.connect(v ? qh(v) ? v.current : v : K.current), b && ee.setEvents({
                                compute: (ne, ue)=>{
                                    const he = ne[b + "X"], Me = ne[b + "Y"];
                                    ue.pointer.set(he / ue.size.width * 2 - 1, -(Me / ue.size.height) * 2 + 1), ue.raycaster.setFromCamera(ue.pointer, ue.camera);
                                }
                            }), T?.(ee);
                        }
                    }), ae.current.render(l.jsx(G, {
                        children: l.jsx(Xh, {
                            set: V,
                            children: l.jsx(y.Suspense, {
                                fallback: l.jsx(Yh, {
                                    set: Z
                                }),
                                children: a ?? null
                            })
                        })
                    }));
                }
                J();
            }
        }), y.useEffect(()=>{
            const U = R.current;
            if (U) return ()=>vf(U);
        }, []);
        const pe = v ? "none" : "auto";
        return l.jsx("div", {
            ref: K,
            style: {
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                pointerEvents: pe,
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
                    ref: R,
                    style: {
                        display: "block"
                    },
                    children: s
                })
            })
        });
    }
    function N0(r) {
        return l.jsx(lf, {
            children: l.jsx(R0, {
                ...r
            })
        });
    }
    function B0(r, a, s) {
        const u = ze((j)=>j.size), d = ze((j)=>j.viewport), m = typeof r == "number" ? r : u.width * d.dpr, h = u.height * d.dpr, v = (typeof r == "number" ? s : r) || {}, { samples: b = 0, depth: x, ...g } = v, p = x ?? v.depthBuffer, P = y.useMemo(()=>{
            const j = new mh(m, h, {
                minFilter: pd,
                magFilter: pd,
                type: Jd,
                ...g
            });
            return p && (j.depthTexture = new ph(m, h, hh)), j.samples = b, j;
        }, []);
        return y.useLayoutEffect(()=>{
            P.setSize(m, h), b && (P.samples = b);
        }, [
            b,
            P,
            m,
            h
        ]), y.useEffect(()=>()=>P.dispose(), []), P;
    }
    const L0 = (r)=>typeof r == "function", O0 = y.forwardRef(({ envMap: r, resolution: a = 256, frames: s = 1 / 0, children: u, makeDefault: d, ...m }, h)=>{
        const v = ze(({ set: F })=>F), b = ze(({ camera: F })=>F), x = ze(({ size: F })=>F), g = y.useRef(null);
        y.useImperativeHandle(h, ()=>g.current, []);
        const p = y.useRef(null), P = B0(a);
        y.useLayoutEffect(()=>{
            m.manual || g.current.updateProjectionMatrix();
        }, [
            x,
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
        let j = 0, E = null;
        const w = L0(u);
        return mn((F)=>{
            w && (s === 1 / 0 || j < s) && (p.current.visible = !1, F.gl.setRenderTarget(P), E = F.scene.background, r && (F.scene.background = r), F.gl.render(F.scene, g.current), F.scene.background = E, F.gl.setRenderTarget(null), p.current.visible = !0, j++);
        }), y.createElement(y.Fragment, null, y.createElement("orthographicCamera", Zt({
            left: x.width / -2,
            right: x.width / 2,
            top: x.height / 2,
            bottom: x.height / -2,
            ref: g
        }, m), !w && u), y.createElement("group", {
            ref: p
        }, w && u(P.texture)));
    }), U0 = y.forwardRef(({ makeDefault: r, camera: a, regress: s, domElement: u, enableDamping: d = !0, keyEvents: m = !1, onChange: h, onStart: v, onEnd: b, ...x }, g)=>{
        const p = ze((z)=>z.invalidate), P = ze((z)=>z.camera), j = ze((z)=>z.gl), E = ze((z)=>z.events), w = ze((z)=>z.setEvents), F = ze((z)=>z.set), C = ze((z)=>z.get), S = ze((z)=>z.performance), D = a || P, k = u || E.connected || j.domElement, T = y.useMemo(()=>new bh(D), [
            D
        ]);
        return mn(()=>{
            T.enabled && T.update();
        }, -1), y.useEffect(()=>(m && T.connect(m === !0 ? k : m), T.connect(k), ()=>void T.dispose()), [
            m,
            k,
            s,
            T,
            p
        ]), y.useEffect(()=>{
            const z = (O)=>{
                p(), s && S.regress(), h && h(O);
            }, G = (O)=>{
                v && v(O);
            }, _ = (O)=>{
                b && b(O);
            };
            return T.addEventListener("change", z), T.addEventListener("start", G), T.addEventListener("end", _), ()=>{
                T.removeEventListener("start", G), T.removeEventListener("end", _), T.removeEventListener("change", z);
            };
        }, [
            h,
            v,
            b,
            T,
            p,
            w
        ]), y.useEffect(()=>{
            if (r) {
                const z = C().controls;
                return F({
                    controls: T
                }), ()=>F({
                        controls: z
                    });
            }
        }, [
            r,
            T
        ]), y.createElement("primitive", Zt({
            ref: g,
            object: T,
            enableDamping: d
        }, x));
    });
    function $0({ defaultScene: r, defaultCamera: a, renderPriority: s = 1 }) {
        const { gl: u, scene: d, camera: m } = ze();
        let h;
        return mn(()=>{
            h = u.autoClear, s === 1 && (u.autoClear = !0, u.render(r, a)), u.autoClear = !1, u.clearDepth(), u.render(d, m), u.autoClear = h;
        }, s), y.createElement("group", {
            onPointerOver: ()=>null
        });
    }
    function G0({ children: r, renderPriority: a = 1 }) {
        const { scene: s, camera: u } = ze(), [d] = y.useState(()=>new Kd);
        return y.createElement(y.Fragment, null, E0(y.createElement(y.Fragment, null, r, y.createElement($0, {
            defaultScene: s,
            defaultCamera: u,
            renderPriority: a
        })), d, {
            events: {
                priority: a + 1
            }
        }));
    }
    const jf = y.createContext({}), W0 = ()=>y.useContext(jf), Q0 = 2 * Math.PI, Ii = new ef, Id = new tf, [Io, _i] = [
        new Wi,
        new Wi
    ], _d = new Ae, Dd = new Ae, V0 = (r)=>"minPolarAngle" in r, Ad = (r)=>"getTarget" in r, q0 = ({ alignment: r = "bottom-right", margin: a = [
        80,
        80
    ], renderPriority: s = 1, onUpdate: u, onTarget: d, children: m })=>{
        const h = ze((z)=>z.size), v = ze((z)=>z.camera), b = ze((z)=>z.controls), x = ze((z)=>z.invalidate), g = y.useRef(null), p = y.useRef(null), P = y.useRef(!1), j = y.useRef(0), E = y.useRef(new Ae(0, 0, 0)), w = y.useRef(new Ae(0, 0, 0));
        y.useEffect(()=>{
            w.current.copy(v.up), Ii.up.copy(v.up);
        }, [
            v
        ]);
        const F = y.useCallback((z)=>{
            P.current = !0, (b || d) && (E.current = d?.() || (Ad(b) ? b.getTarget(E.current) : b?.target)), j.current = v.position.distanceTo(_d), Io.copy(v.quaternion), Dd.copy(z).multiplyScalar(j.current).add(_d), Ii.lookAt(Dd), _i.copy(Ii.quaternion), x();
        }, [
            b,
            v,
            d,
            x
        ]);
        mn((z, G)=>{
            if (p.current && g.current) {
                var _;
                if (P.current) if (Io.angleTo(_i) < .01) P.current = !1, V0(b) && v.up.copy(w.current);
                else {
                    const O = G * Q0;
                    Io.rotateTowards(_i, O), v.position.set(0, 0, 1).applyQuaternion(Io).multiplyScalar(j.current).add(E.current), v.up.set(0, 1, 0).applyQuaternion(Io).normalize(), v.quaternion.copy(Io), Ad(b) && b.setPosition(v.position.x, v.position.y, v.position.z), u ? u() : b && b.update(G), x();
                }
                Id.copy(v.matrix).invert(), (_ = g.current) == null || _.quaternion.setFromRotationMatrix(Id);
            }
        });
        const C = y.useMemo(()=>({
                tweenCamera: F
            }), [
            F
        ]), [S, D] = a, k = r.endsWith("-center") ? 0 : r.endsWith("-left") ? -h.width / 2 + S : h.width / 2 - S, T = r.startsWith("center-") ? 0 : r.startsWith("top-") ? h.height / 2 - D : -h.height / 2 + D;
        return y.createElement(G0, {
            renderPriority: s
        }, y.createElement(jf.Provider, {
            value: C
        }, y.createElement(O0, {
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
                T,
                0
            ]
        }, m)));
    };
    function Di({ scale: r = [
        .8,
        .05,
        .05
    ], color: a, rotation: s }) {
        return y.createElement("group", {
            rotation: s
        }, y.createElement("mesh", {
            position: [
                .4,
                0,
                0
            ]
        }, y.createElement("boxGeometry", {
            args: r
        }), y.createElement("meshBasicMaterial", {
            color: a,
            toneMapped: !1
        })));
    }
    function _o({ onClick: r, font: a, disabled: s, arcStyle: u, label: d, labelColor: m, axisHeadScale: h = 1, ...v }) {
        const b = ze((w)=>w.gl), x = y.useMemo(()=>{
            const w = document.createElement("canvas");
            w.width = 64, w.height = 64;
            const F = w.getContext("2d");
            return F.beginPath(), F.arc(32, 32, 16, 0, 2 * Math.PI), F.closePath(), F.fillStyle = u, F.fill(), d && (F.font = a, F.textAlign = "center", F.fillStyle = m, F.fillText(d, 32, 41)), new nf(w);
        }, [
            u,
            d,
            m,
            a
        ]), [g, p] = y.useState(!1), P = (d ? 1 : .75) * (g ? 1.2 : 1) * h, j = (w)=>{
            w.stopPropagation(), p(!0);
        }, E = (w)=>{
            w.stopPropagation(), p(!1);
        };
        return y.createElement("sprite", Zt({
            scale: P,
            onPointerOver: s ? void 0 : j,
            onPointerOut: s ? void 0 : r || E
        }, v), y.createElement("spriteMaterial", {
            map: x,
            "map-anisotropy": b.capabilities.getMaxAnisotropy() || 1,
            alphaTest: .3,
            opacity: d ? 1 : .75,
            toneMapped: !1
        }));
    }
    const H0 = ({ hideNegativeAxes: r, hideAxisHeads: a, disabled: s, font: u = "18px Inter var, Arial, sans-serif", axisColors: d = [
        "#ff2060",
        "#20df80",
        "#2080ff"
    ], axisHeadScale: m = 1, axisScale: h, labels: v = [
        "X",
        "Y",
        "Z"
    ], labelColor: b = "#000", onClick: x, ...g })=>{
        const [p, P, j] = d, { tweenCamera: E } = W0(), w = {
            font: u,
            disabled: s,
            labelColor: b,
            onClick: x,
            axisHeadScale: m,
            onPointerDown: s ? void 0 : (F)=>{
                E(F.object.position), F.stopPropagation();
            }
        };
        return y.createElement("group", Zt({
            scale: 40
        }, g), y.createElement(Di, {
            color: p,
            rotation: [
                0,
                0,
                0
            ],
            scale: h
        }), y.createElement(Di, {
            color: P,
            rotation: [
                0,
                0,
                Math.PI / 2
            ],
            scale: h
        }), y.createElement(Di, {
            color: j,
            rotation: [
                0,
                -Math.PI / 2,
                0
            ],
            scale: h
        }), !a && y.createElement(y.Fragment, null, y.createElement(_o, Zt({
            arcStyle: p,
            position: [
                1,
                0,
                0
            ],
            label: v[0]
        }, w)), y.createElement(_o, Zt({
            arcStyle: P,
            position: [
                0,
                1,
                0
            ],
            label: v[1]
        }, w)), y.createElement(_o, Zt({
            arcStyle: j,
            position: [
                0,
                0,
                1
            ],
            label: v[2]
        }, w)), !r && y.createElement(y.Fragment, null, y.createElement(_o, Zt({
            arcStyle: p,
            position: [
                -1,
                0,
                0
            ]
        }, w)), y.createElement(_o, Zt({
            arcStyle: P,
            position: [
                0,
                -1,
                0
            ]
        }, w)), y.createElement(_o, Zt({
            arcStyle: j,
            position: [
                0,
                0,
                -1
            ]
        }, w)))));
    }, gs = y.createContext(null), Rd = (r)=>(r.getAttributes() & 2) === 2, K0 = y.memo(y.forwardRef(({ children: r, camera: a, scene: s, resolutionScale: u, enabled: d = !0, renderPriority: m = 1, autoClear: h = !0, depthBuffer: v, enableNormalPass: b, stencilBuffer: x, multisampling: g = 8, frameBufferType: p = Jd }, P)=>{
        const { gl: j, scene: E, camera: w, size: F } = ze(), C = s || E, S = a || w, [D, k, T] = y.useMemo(()=>{
            const _ = new Ph(j, {
                depthBuffer: v,
                stencilBuffer: x,
                multisampling: g,
                frameBufferType: p
            });
            _.addPass(new Mh(C, S));
            let O = null, R = null;
            return b && (R = new Fh(C, S), R.enabled = !1, _.addPass(R), u !== void 0 && (O = new Th({
                normalBuffer: R.texture,
                resolutionScale: u
            }), O.enabled = !1, _.addPass(O))), [
                _,
                R,
                O
            ];
        }, [
            S,
            j,
            v,
            x,
            g,
            p,
            C,
            b,
            u
        ]);
        y.useEffect(()=>D?.setSize(F.width, F.height), [
            D,
            F
        ]), mn((_, O)=>{
            if (d) {
                const R = j.autoClear;
                j.autoClear = h, x && !h && j.clearStencil(), D.render(O), j.autoClear = R;
            }
        }, d ? m : 0);
        const z = y.useRef(null);
        y.useLayoutEffect(()=>{
            const _ = [], O = z.current.__r3f;
            if (O && D) {
                const R = O.children;
                for(let K = 0; K < R.length; K++){
                    const X = R[K].object;
                    if (X instanceof yd) {
                        const Q = [
                            X
                        ];
                        if (!Rd(X)) {
                            let te = null;
                            for(; (te = R[K + 1]?.object) instanceof yd && !Rd(te);)Q.push(te), K++;
                        }
                        const Z = new Eh(S, ...Q);
                        _.push(Z);
                    } else X instanceof Dh && _.push(X);
                }
                for (const K of _)D?.addPass(K);
                k && (k.enabled = !0), T && (T.enabled = !0);
            }
            return ()=>{
                for (const R of _)D?.removePass(R);
                k && (k.enabled = !1), T && (T.enabled = !1);
            };
        }, [
            D,
            r,
            S,
            k,
            T
        ]), y.useEffect(()=>{
            const _ = j.toneMapping;
            return j.toneMapping = Xd, ()=>{
                j.toneMapping = _;
            };
        }, [
            j
        ]);
        const G = y.useMemo(()=>({
                composer: D,
                normalPass: k,
                downSamplingPass: T,
                resolutionScale: u,
                camera: S,
                scene: C
            }), [
            D,
            k,
            T,
            u,
            S,
            C
        ]);
        return y.useImperativeHandle(P, ()=>D, [
            D
        ]), l.jsx(gs.Provider, {
            value: G,
            children: l.jsx("group", {
                ref: z,
                children: r
            })
        });
    }));
    let Y0 = 0;
    const Nd = new WeakMap, ys = (r, a)=>function({ blendFunction: s = a?.blendFunction, opacity: u = a?.opacity, ...d }) {
            let m = Nd.get(r);
            if (!m) {
                const b = `@react-three/postprocessing/${r.name}-${Y0++}`;
                bf({
                    [b]: r
                }), Nd.set(r, m = b);
            }
            const h = ze((b)=>b.camera), v = is.useMemo(()=>[
                    ...a?.args ?? [],
                    ...d.args ?? [
                        {
                            ...a,
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
        }, X0 = y.forwardRef(function({ blendFunction: r, worldFocusDistance: a, worldFocusRange: s, focusDistance: u, focusRange: d, focalLength: m, bokehScale: h, resolutionScale: v, resolutionX: b, resolutionY: x, width: g, height: p, target: P, depthTexture: j, ...E }, w) {
        const { camera: F } = y.useContext(gs), C = P != null, S = y.useMemo(()=>{
            const D = new Ih(F, {
                blendFunction: r,
                worldFocusDistance: a,
                worldFocusRange: s,
                focusDistance: u,
                focusRange: d,
                focalLength: m,
                bokehScale: h,
                resolutionScale: v,
                resolutionX: b,
                resolutionY: x,
                width: g,
                height: p
            });
            C && (D.target = new Ae), j && D.setDepthTexture(j.texture, j.packing);
            const k = D.maskPass;
            return k.maskFunction = _h.MULTIPLY_RGB_SET_ALPHA, D;
        }, [
            F,
            r,
            a,
            s,
            u,
            d,
            m,
            h,
            v,
            b,
            x,
            g,
            p,
            C,
            j
        ]);
        return y.useEffect(()=>()=>{
                S.dispose();
            }, [
            S
        ]), l.jsx("primitive", {
            ...E,
            ref: w,
            object: S,
            target: P
        });
    }), Z0 = ys(Ah, {
        blendFunction: 0
    }), J0 = y.forwardRef(function(r, a) {
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
                ...r
            }), [
            s,
            d,
            u,
            m
        ]);
        return l.jsx("primitive", {
            ref: a,
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
    }, $ = gh()(yh((r, a)=>({
            ...Bd,
            setFile: (s)=>r({
                    file: s,
                    frame: 0,
                    playing: !1,
                    error: null,
                    loading: !1,
                    loadProgress: 1
                }),
            setLoading: (s, u)=>r({
                    loading: s,
                    loadProgress: u ?? (s ? 0 : 1)
                }),
            setError: (s)=>r({
                    error: s,
                    loading: !1
                }),
            setViewportMode: (s)=>r({
                    viewportMode: s
                }),
            setFrame: (s)=>{
                const u = a().file;
                if (!u) return;
                const d = u.trajectory.totalFrames - 1;
                r({
                    frame: Math.max(0, Math.min(s, d))
                });
            },
            nextFrame: ()=>{
                const { file: s, frame: u, loopMode: d } = a();
                if (!s) return;
                const m = s.trajectory.totalFrames - 1;
                u >= m ? d === "loop" ? r({
                    frame: 0
                }) : d === "once" && r({
                    playing: !1
                }) : r({
                    frame: u + 1
                });
            },
            prevFrame: ()=>{
                const { file: s, frame: u } = a();
                if (!s) return;
                const d = s.trajectory.totalFrames - 1;
                r({
                    frame: u <= 0 ? d : u - 1
                });
            },
            togglePlay: ()=>r((s)=>({
                        playing: !s.playing
                    })),
            setPlaybackSpeed: (s)=>r({
                    playbackSpeed: s
                }),
            setColorMode: (s)=>r({
                    colorMode: s
                }),
            setColorProperty: (s)=>r({
                    colorProperty: s
                }),
            setColormap: (s)=>r({
                    colormap: s,
                    backgroundPreset: `palette:${s}`
                }),
            toggleSSAO: ()=>r((s)=>({
                        ssao: !s.ssao
                    })),
            toggleBloom: ()=>r((s)=>({
                        bloom: !s.bloom
                    })),
            toggleDOF: ()=>r((s)=>({
                        dof: !s.dof
                    })),
            setSSAOIntensity: (s)=>r({
                    ssaoIntensity: s
                }),
            setBloomIntensity: (s)=>r({
                    bloomIntensity: s
                }),
            setDOFFocus: (s)=>r({
                    dofFocus: s
                }),
            setToneMapping: (s)=>r({
                    toneMapping: s
                }),
            toggleCell: ()=>r((s)=>({
                        showCell: !s.showCell
                    })),
            toggleAxes: ()=>r((s)=>({
                        showAxes: !s.showAxes
                    })),
            toggleBonds: ()=>r((s)=>({
                        showBonds: !s.showBonds
                    })),
            setBondCutoff: (s)=>r({
                    bondCutoff: s
                }),
            setRenderStyle: (s)=>r({
                    renderStyle: s
                }),
            setAtomScale: (s)=>r({
                    atomScale: s
                }),
            setBackgroundPreset: (s)=>r({
                    backgroundPreset: s
                }),
            setBackgroundStyle: (s)=>r({
                    backgroundStyle: s
                }),
            setActivePanel: (s)=>r((u)=>({
                        activePanel: u.activePanel === s ? null : s
                    })),
            clearFile: ()=>r({
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
            triggerExport: (s)=>r((u)=>({
                        exportRequest: {
                            ...s,
                            type: s.type ?? null
                        }
                    })),
            clearExportRequest: ()=>r({
                    exportRequest: {
                        type: null
                    }
                }),
            setFlythrough: (s)=>r({
                    flythrough: s
                }),
            setFlythroughPreview: (s)=>r({
                    flythroughPreview: s
                }),
            setFlythroughTime: (s)=>r({
                    flythroughTime: s
                }),
            addFlythroughKeyframe: (s)=>r((u)=>u.flythrough ? u.flythrough.keyframes.length >= 5 ? {} : {
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
            removeFlythroughKeyframe: (s)=>r((u)=>{
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
            updateFlythroughKeyframe: (s, u)=>r((d)=>{
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
            setFlythroughLoop: (s)=>r((u)=>u.flythrough ? {
                        flythrough: {
                            ...u.flythrough,
                            loop: s
                        }
                    } : {}),
            reset: ()=>r(Bd),
            setSelectedAtoms: (s)=>r((u)=>({
                        selectedAtoms: typeof s == "function" ? s(u.selectedAtoms) : s
                    })),
            setHoveredAtom: (s)=>r({
                    hoveredAtom: s
                }),
            toggleAtomType: (s)=>r((u)=>{
                    const d = new Set(u.hiddenAtomTypes);
                    return d.has(s) ? d.delete(s) : d.add(s), {
                        hiddenAtomTypes: d
                    };
                }),
            showAllAtomTypes: ()=>r({
                    hiddenAtomTypes: new Set
                }),
            soloAtomType: (s)=>r((u)=>{
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
            setAtomTypeScale: (s, u)=>r((d)=>({
                        atomTypeScales: {
                            ...d.atomTypeScales,
                            [s]: u
                        }
                    })),
            resetAtomTypeScales: ()=>r({
                    atomTypeScales: {}
                }),
            setCameraState: (s, u)=>r({
                    cameraPosition: s,
                    cameraTarget: u
                }),
            setCameraPreset: (s)=>{
                const u = a();
                if (!u.file) return;
                const { min: d, max: m } = u.file.trajectory.globalBounds, h = [
                    (d[0] + m[0]) / 2,
                    (d[1] + m[1]) / 2,
                    (d[2] + m[2]) / 2
                ], v = m[0] - d[0], b = m[1] - d[1], x = m[2] - d[2], p = Math.max(v, b, x) * 1.5;
                let P;
                switch(s){
                    case "front":
                        P = [
                            h[0],
                            h[1],
                            h[2] + p
                        ];
                        break;
                    case "side":
                        P = [
                            h[0] + p,
                            h[1],
                            h[2]
                        ];
                        break;
                    case "top":
                        P = [
                            h[0],
                            h[1] + p,
                            h[2]
                        ];
                        break;
                    case "iso":
                        P = [
                            h[0] + p * .7,
                            h[1] + p * .7,
                            h[2] + p * .7
                        ];
                        break;
                    default:
                        return;
                }
                r({
                    cameraPreset: s,
                    cameraPosition: P,
                    cameraTarget: h
                });
            },
            setShowScaleBar: (s)=>r({
                    showScaleBar: s
                }),
            setColorblindMode: (s)=>{
                r(s ? {
                    colorblindMode: s,
                    colormap: "viridis"
                } : {
                    colorblindMode: s
                });
            },
            encodeToURL: ()=>{
                const s = a(), u = {}, d = (b)=>Math.round(b * 100) / 100, m = (b)=>b.map(d), h = (b, x)=>b.length === x.length && b.every((g, p)=>Math.abs(g - x[p]) < .01);
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
                    r({
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
    let wa = null, nb = 0;
    const Xi = new Map;
    function ob() {
        return wa || (wa = new Worker(new URL("" + new URL("parse.worker-D6ORZDg7.js", import.meta.url).href, import.meta.url), {
            type: "module"
        }), wa.onmessage = (r)=>{
            const { type: a, id: s } = r.data;
            if (a === "progress") {
                window.dispatchEvent(new CustomEvent("atlas:parse-progress", {
                    detail: {
                        total: r.data.total,
                        parsed: r.data.parsed
                    }
                }));
                return;
            }
            const u = Xi.get(s);
            u && (a === "error" ? u.reject(new Error(r.data.message)) : u.resolve(r.data), Xi.delete(s));
        }), wa;
    }
    function $a(r, a) {
        return new Promise((s, u)=>{
            const d = ++nb;
            Xi.set(d, {
                resolve: s,
                reject: u
            }), ob().postMessage({
                type: r,
                payload: a,
                id: d
            });
        });
    }
    async function Ga(r) {
        if (r.name.endsWith(".gz")) {
            const s = await r.arrayBuffer(), u = new DecompressionStream("gzip"), d = new Blob([
                s
            ]).stream().pipeThrough(u).getReader(), m = [];
            for(;;){
                const { done: h, value: v } = await d.read();
                if (h) break;
                m.push(v);
            }
            return new TextDecoder().decode(new Uint8Array(m.reduce((h, v)=>h + v.length, 0)).map((h, v)=>{
                let b = 0;
                for (const x of m){
                    if (v < b + x.length) return x[v - b];
                    b += x.length;
                }
                return 0;
            }));
        }
        const a = await r.text();
        if (a.trim().toLowerCase().startsWith("<html") || a.trim().toLowerCase().startsWith("<!doctype html>")) throw new Error("Received HTML instead of molecular data (file not found on server).");
        return a;
    }
    async function Cf(r) {
        const a = await Ga(r), s = await $a("parse-dump", a);
        if (!s.frames || s.frames.length === 0) throw new Error("No frames parsed; possibly wrong format.");
        const u = s.frames.map((j)=>({
                timestep: j.timestep,
                natoms: j.natoms,
                boxBounds: new Float64Array(j.boxBounds),
                boxTilt: new Float64Array(j.boxTilt),
                triclinic: j.triclinic,
                columns: j.columns,
                ids: new Int32Array(j.ids),
                types: new Int32Array(j.types),
                positions: new Float32Array(j.positions),
                bonds: new Int32Array(j.bonds),
                properties: new Map(j.properties.map((E)=>[
                        E.name,
                        new Float32Array(E.data)
                    ]))
            }));
        let d = 1 / 0, m = 1 / 0, h = 1 / 0, v = -1 / 0, b = -1 / 0, x = -1 / 0;
        const g = new Set, p = u[0], P = new Map;
        if (p) for(let j = 0; j < p.natoms; j++)P.set(p.ids[j], j);
        for (const j of u){
            const E = new Float32Array(j.natoms);
            for(let w = 0; w < j.natoms; w++){
                const F = j.positions[w * 3], C = j.positions[w * 3 + 1], S = j.positions[w * 3 + 2];
                F < d && (d = F), F > v && (v = F), C < m && (m = C), C > b && (b = C), S < h && (h = S), S > x && (x = S), g.add(j.types[w]);
                const D = P.get(j.ids[w]);
                if (D !== void 0 && p) {
                    const k = F - p.positions[D * 3], T = C - p.positions[D * 3 + 1], z = S - p.positions[D * 3 + 2];
                    E[w] = Math.sqrt(k * k + T * T + z * z);
                } else E[w] = 0;
            }
            j.properties || (j.properties = new Map), j.properties.set("Displacement", E);
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
                    x
                ]
            }
        };
    }
    async function Zi(r) {
        const a = await Ga(r), s = await $a("parse-log", a);
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
    function Oa(r) {
        const a = r.toLowerCase();
        return a.endsWith(".lammpstrj") || a.includes("dump.") || a.endsWith(".dump") || a.endsWith(".lammpstrj.gz") ? "dump" : a.startsWith("log.") || a.endsWith(".log") ? "log" : a.startsWith("data.") || a.endsWith(".data") || a.endsWith(".lmp") ? "data" : a.endsWith(".xyz") ? "xyz" : "unknown";
    }
    async function Ji(r) {
        const a = await Ga(r), s = await $a("parse-xyz", a);
        if (!s.frames || s.frames.length === 0) throw new Error("No frames parsed; possibly wrong format.");
        const u = s.frames.map((j)=>({
                timestep: j.timestep,
                natoms: j.natoms,
                boxBounds: new Float64Array(j.boxBounds),
                boxTilt: new Float64Array(j.boxTilt),
                triclinic: j.triclinic,
                columns: j.columns,
                ids: new Int32Array(j.ids),
                types: new Int32Array(j.types),
                positions: new Float32Array(j.positions),
                bonds: new Int32Array(j.bonds),
                properties: new Map(j.properties.map((E)=>[
                        E.name,
                        new Float32Array(E.data)
                    ]))
            }));
        let d = 1 / 0, m = 1 / 0, h = 1 / 0, v = -1 / 0, b = -1 / 0, x = -1 / 0;
        const g = new Set, p = u[0], P = new Map;
        if (p) for(let j = 0; j < p.natoms; j++)P.set(p.ids[j], j);
        for (const j of u){
            const E = new Float32Array(j.natoms);
            for(let w = 0; w < j.natoms; w++){
                const F = j.positions[w * 3], C = j.positions[w * 3 + 1], S = j.positions[w * 3 + 2];
                F < d && (d = F), F > v && (v = F), C < m && (m = C), C > b && (b = C), S < h && (h = S), S > x && (x = S), g.add(j.types[w]);
                const D = P.get(j.ids[w]);
                if (D !== void 0 && p) {
                    const k = F - p.positions[D * 3], T = C - p.positions[D * 3 + 1], z = S - p.positions[D * 3 + 2];
                    E[w] = Math.sqrt(k * k + T * T + z * z);
                } else E[w] = 0;
            }
            j.properties || (j.properties = new Map), j.properties.set("Displacement", E);
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
                    x
                ]
            }
        };
    }
    async function wf(r) {
        const a = await Ga(r), s = await $a("parse-data", a);
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
                properties: new Map(p.properties.map((P)=>[
                        P.name,
                        new Float32Array(P.data)
                    ]))
            }));
        let d = 1 / 0, m = 1 / 0, h = 1 / 0, v = -1 / 0, b = -1 / 0, x = -1 / 0;
        const g = new Set;
        for (const p of u)for(let P = 0; P < p.natoms; P++){
            const j = p.positions[P * 3], E = p.positions[P * 3 + 1], w = p.positions[P * 3 + 2];
            j < d && (d = j), j > v && (v = j), E < m && (m = E), E > b && (b = E), w < h && (h = w), w > x && (x = w), g.add(p.types[P]);
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
                    x
                ]
            }
        };
    }
    async function kf(r) {
        const a = Oa(r.name);
        if (a === "xyz") return {
            trajectory: await Ji(r)
        };
        if (a === "dump" || a === "unknown") try {
            return {
                trajectory: await Cf(r)
            };
        } catch  {
            try {
                return {
                    thermo: await Zi(r)
                };
            } catch  {
                return {
                    trajectory: await Ji(r)
                };
            }
        }
        if (a === "log") return {
            thermo: await Zi(r)
        };
        if (a === "data") return {
            trajectory: await wf(r)
        };
        throw new Error(`Unsupported file type: ${r.name}`);
    }
    const es = Object.freeze(Object.defineProperty({
        __proto__: null,
        detectFileType: Oa,
        parseDataFile: wf,
        parseDumpFile: Cf,
        parseFile: kf,
        parseLogFile: Zi,
        parseXyzFile: Ji
    }, Symbol.toStringTag, {
        value: "Module"
    })), rb = JSON.parse('[{"id":"lupine_brand_asset","title":"Lupine Brand Asset (Procedural Hill)","subtitle":"Procedurally generated rolling hill of Texas state flowers with dynamic GPU wind sway.","domain":"Nanomaterials","atoms":"150,000+","frames":"1","file":"procedural","available":true,"colors":["#3050f8","#1ff01f","#ffffff"],"metadata":{"method":"Procedural Math Sculpture","potential":"Brand Identity Architecture","temperature":"0 K","reference":"Lupine Materials Science — lupine.science"},"featured":true},{"id":"lupine_bluebonnet","title":"Lupine Bluebonnet (Scientific)","subtitle":"Lupinus texensis scientific molecular model (.xyz dataset) showing strict atomic arrangement.","domain":"Nanomaterials","atoms":"930","frames":"1","file":"gallery/curated/lupine_bluebonnet.xyz","available":true,"colors":["#3050f8","#1ff01f","#ffffff"],"metadata":{"method":"Ab Initio Assembly","potential":"Lennard-Jones","temperature":"0 K","reference":"Lupine Materials Science — lupine.science"},"featured":true},{"id":"oscillation_timeseries","title":"Time-Series Oscillation","subtitle":"Test dataset for 60fps property interpolation","domain":"Advanced Theory & Validation","atoms":"1,000","frames":"30","file":"archive/oscillation_timeseries.lammpstrj","available":true,"colors":["#f542d4","#87247a","#c78aba"],"metadata":{"method":"Synthetic Oscillation","potential":"N/A","temperature":"Oscillating","ensemble":"N/A","reference":"Used to validate playback extrapolation logic."},"featured":true},{"id":"dang_cu_dislocation","title":"FCC Cu Dislocation-GB Tracking","subtitle":"Khanh Dang et al. (Sci Data 2025): Dislocation–grain-boundary interactions matrix","domain":"Advanced Theory & Validation","atoms":"Variable","frames":"100+","file":"archive/DisGB_data.lammpstrj","available":true,"colors":["#4287f5","#244a87","#8aa1c7"],"metadata":{"method":"Dislocation-GB dynamics MD","potential":"EAM (Mishin/Cu)","temperature":"Analytical Time-Series","ensemble":"NPT / Dynamic Strain","reference":"Perfect testbed for GNN Topology Error Mapping to characterize complex GB network transitions.","doi":"10.1038/s41597-025-05256-6"},"featured":true},{"id":"chen_ti_grip","title":"hcp Ti Grand-Canonical GB Optimization","subtitle":"Enze Chen et al. (Nat Commun 2024): Automated phase discovery using GRIP","domain":"Advanced Theory & Validation","atoms":"Variable","frames":"Multi-phase","file":"archive/GRIP_snapshot.lammpstrj","available":true,"colors":["#87f542","#40751f","#abd68b"],"metadata":{"method":"Grand-canonical evolutionary optimization","potential":"MEAM","temperature":"Variable","ensemble":"SGC","reference":"Requires Phonon Benchmarking (PDOS) to validate the dynamical stability of newly discovered hcp Ti GB phases.","doi":"10.1038/s41467-024-51330-9"},"featured":true},{"id":"devulapalli_segregation","title":"Topological GB Segregation Transitions","subtitle":"Vivek Devulapalli et al. (Science 2024): SGC MD/MC thermodynamic excess mapping","domain":"Advanced Theory & Validation","atoms":"Variable","frames":"Phase Transition","file":"archive/MDMC-SGC.lammpstrj","available":true,"colors":["#f54242","#802121","#c28080"],"metadata":{"method":"Semi-grand canonical MD/MC workflow","potential":"Multi-component EAM","temperature":"Variable","ensemble":"SGC / MDMC","reference":"Candidate for Multi-Fidelity UQ (glimMER) to correct biases in the calculated segregation thermodynamic excess properties.","doi":"10.1126/science.adq4147"},"featured":true},{"id":"curtin_hea_dislocation","title":"Cantor Alloy Dislocation Glide","subtitle":"W. Curtin et al. (Nature 2023): Edge dislocation mobility in CoCrFeMnNi High-Entropy Alloy using MLIP.","domain":"Metals & Alloys","atoms":"2,500,000","frames":"250","file":"archive/curtin_hea_dislocation.lammpstrj","available":true,"colors":["#e6194b","#f58231","#ffe119"],"metadata":{"method":"Machine-Learning MD (MACE)","potential":"NequIP/MACE (High-Entropy)","temperature":"300 K","ensemble":"NPT / Shear","reference":"Deep learning potential reveals cross-slip mechanisms in Cantor alloy.","doi":"10.1038/s41586-022-05582-8"},"featured":true},{"id":"ceder_llzo_diffusion","title":"LLZO Solid Electrolyte Ion Dynamics","subtitle":"G. Ceder et al. (Nature Materials 2024): Correlated Li-ion diffusion pathways in garnet-type solid electrolytes.","domain":"Energy Materials","atoms":"12,000","frames":"500","file":"archive/llzo_diffusion.lammpstrj","available":true,"colors":["#3cb44b","#aaffc3","#008080"],"metadata":{"method":"Ab Initio Molecular Dynamics (AIMD)","potential":"DFT-trained NNP","temperature":"600 K","ensemble":"NVT","reference":"Analysis of concerted migration events in Li7La3Zr2O12.","doi":"10.1038/s41563-023-01700-1"},"featured":true},{"id":"coudert_mof_flexibility","title":"ZIF-8 Gate-Opening Transition","subtitle":"F.X. Coudert et al. (Science 2023): Mechanical flexibility and gas-induced phase transition in Metal-Organic Frameworks.","domain":"Polymers & Soft Matter","atoms":"8,500","frames":"120","file":"archive/zif8_gate_opening.lammpstrj","available":true,"colors":["#4363d8","#911eb4","#e6beff"],"metadata":{"method":"Classical MD with flexible force field","potential":"MOF-FF","temperature":"298 K","ensemble":"NPT","reference":"Adsorption-induced breathing and swing transitions in ZIF-8.","doi":"10.1126/science.ade1469"},"featured":true},{"id":"sand_w_cascade","title":"Tungsten Collision Cascade","subtitle":"A.E. Sand et al. (PRL 2022): Primary radiation damage and defect clustering in plasma-facing materials.","domain":"Defects & Mechanics","atoms":"4,000,000","frames":"100","file":"archive/w_cascade_150keV.lammpstrj","available":true,"colors":["#808080","#a9a9a9","#ffffff"],"metadata":{"method":"Radiation Damage MD","potential":"EAM-ZBL","temperature":"10 K","ensemble":"NVE","reference":"150 keV primary knock-on atom (PKA) cascade evolution over 20 ps.","doi":"10.1103/PhysRevLett.128.015501"},"featured":true},{"id":"elliott_gst_crystallization","title":"GST Phase-Change Crystallization","subtitle":"S.R. Elliott et al. (Nature Comms 2024): Ultrafast nucleation in Ge2Sb2Te5 memory materials.","domain":"Ceramics & Oxides","atoms":"32,000","frames":"300","file":"archive/gst_crystallization.lammpstrj","available":true,"colors":["#800000","#9a6324","#ffd8b1"],"metadata":{"method":"Melt-Quench & Anneal MD","potential":"Machine Learning (GAP)","temperature":"600 K","ensemble":"NVT","reference":"Tracking the amorphous-to-cubic phase transition via homonuclear bonds.","doi":"10.1038/s41467-024-11000-0"},"featured":true},{"id":"c60_buckyball","title":"Buckminsterfullerene","subtitle":"C60 Truncated Icosahedron: The iconic carbon allotrope discovered by Kroto, Smalley, and Curl.","domain":"Nanomaterials","atoms":"60","frames":"1","file":"gallery/curated/c60_buckyball.xyz","available":true,"colors":["#444444","#444444","#444444"],"metadata":{"method":"Theoretical Geometry","potential":"DFT Optimized","temperature":"0 K","reference":"Nobel Prize in Chemistry 1996."},"featured":true},{"id":"cnt_6_6","title":"Carbon Nanotube","subtitle":"(6,6) Armchair Single-Walled Carbon Nanotube.","domain":"Nanomaterials","atoms":"96","frames":"1","file":"gallery/curated/carbon_nanotube.xyz","available":true,"colors":["#333333","#333333","#333333"],"metadata":{"method":"Geometry Construction","potential":"ASE Builder","chirality":"(6,6) Armchair"},"featured":true},{"id":"graphene_ribbon","title":"Graphene Nanoribbon","subtitle":"Armchair Graphene Nanoribbon with Hydrogen-passivated edges.","domain":"Nanomaterials","atoms":"86","frames":"1","file":"gallery/curated/graphene_ribbon.xyz","available":true,"colors":["#222222","#cccccc","#222222"],"metadata":{"method":"Geometry Construction","potential":"ASE Builder"},"featured":true},{"id":"au_nanocluster","title":"Gold Nanocluster","subtitle":"Au FCC 3x3x3 Bulk Supercell representing a tiny nanocluster fragment.","domain":"Metals & Alloys","atoms":"108","frames":"1","file":"gallery/curated/gold_nanocluster.xyz","available":true,"colors":["#ffd700","#ffd700","#ffd700"],"metadata":{"method":"Crystallography","potential":"FCC Lattice"},"featured":true},{"id":"water_cluster_64","title":"Ice/Water Cluster","subtitle":"A generated cluster of 64 water molecules.","domain":"Fluids & Solvents","atoms":"192","frames":"1","file":"gallery/curated/water_cluster.xyz","available":true,"colors":["#0000ff","#ffaaaa","#0000ff"],"metadata":{"method":"Geometry Construction","potential":"ASE Builder"},"featured":true},{"id":"cuzr_melt","title":"Cu₆₄Zr₃₆ Metallic Glass","subtitle":"Melt-quench simulation showing glass transition and short-range order","domain":"Metals & Alloys","atoms":"5,000","frames":"100","file":"dump.CuZr_melt.lammpstrj","available":true,"colors":["#4da6ff","#40ff80","#4d4dff"],"metadata":{"method":"Molecular Dynamics","potential":"EAM (Mendelev et al.)","temperature":"300-2000 K","ensemble":"NPT","reference":"Standard melt-quench protocol"},"featured":true},{"id":"al_polycrystal","title":"Al Polycrystal (Voronoi)","subtitle":"Grain boundary structure in FCC aluminum with Σ5 misorientation","domain":"Metals & Alloys","atoms":"32,000","frames":"50","file":"gallery/al_polycrystal_32k.lammpstrj","available":true,"colors":["#c0c0c0","#a0a0a0","#ff6b6b"],"metadata":{"method":"MD with grain boundary analysis","potential":"EAM (Mishin et al.)","temperature":"300 K","ensemble":"NVT","reference":"Cubic polycrystal with 8 grains"},"featured":true},{"id":"ni_superalloy","title":"Ni-Based Superalloy","subtitle":"γ/γ′ microstructure with cuboidal precipitates","domain":"Metals & Alloys","atoms":"108,000","frames":"1","file":"gallery/ni_superalloy_gamma_prime_8k.lammpstrj","available":true,"colors":["#4a90d9","#f5a623","#d0021b"],"metadata":{"method":"Monte Carlo + MD hybrid","potential":"MEAM","temperature":"1273 K","reference":"CMSX-4 inspired composition"}},{"id":"ti_hcp","title":"Titanium HCP Deformation","subtitle":"Basal slip and twinning under uniaxial tension","domain":"Metals & Alloys","atoms":"24,000","frames":"200","file":"gallery/ti_hcp_tension_13k.lammpstrj","available":true,"colors":["#7ed321","#50e3c2","#b8e986"],"metadata":{"method":"Deformation MD","potential":"MEAM (Hennig et al.)","temperature":"300 K","ensemble":"NPT with strain rate","reference":"HCP Ti single crystal"},"featured":true},{"id":"crack2d","title":"Brittle Fracture (2D)","subtitle":"Dynamic crack propagation with elastic-plastic zone","domain":"Defects & Mechanics","atoms":"1,800","frames":"100","file":"dump.crack2d.lammpstrj","available":true,"colors":["#ff4060","#ff8040","#ffd040"],"metadata":{"method":"MD with velocity loading","potential":"LJ (brittle parameterization)","temperature":"0.01 K","reference":"Griffith-Irwin fracture mechanics"}},{"id":"dislocation_cu","title":"Cu Edge Dislocation","subtitle":"1/2⟨110⟩ dislocation on (111) plane with stacking fault","domain":"Defects & Mechanics","atoms":"28,800","frames":"1","file":"gallery/cu_dislocation_28k.lammpstrj","available":true,"colors":["#b87333","#cd853f","#d4af37"],"metadata":{"method":"Energy minimization + MD","potential":"EAM (Mishin)","reference":"FCC edge dislocation dipole"}},{"id":"nanoindentation","title":"Nanoindentation Al","subtitle":"Spherical indenter penetration with dislocation nucleation","domain":"Defects & Mechanics","atoms":"256,000","frames":"150","file":"gallery/al_nanoindent_256k.lammpstrj","available":true,"colors":["#c0c0c0","#808080","#ff6b6b"],"metadata":{"method":"Indenter MD","potential":"EAM","temperature":"300 K","reference":"Hertzian contact + dislocation plasticity"}},{"id":"void_growth","title":"Void Growth & Coalescence","subtitle":"Ductile failure under triaxial tension","domain":"Defects & Mechanics","atoms":"64,000","frames":"100","file":"gallery/cu_void_growth_64k.lammpstrj","available":true,"colors":["#ff6b6b","#ffa500","#ffff00"],"metadata":{"method":"Cavitation MD","potential":"EAM","temperature":"600 K","ensemble":"NPT with negative pressure"}},{"id":"multielement_nanoparticle","title":"High-Entropy Alloy Nanoparticle","subtitle":"Multi-element open dataset (Ni-Co-Cr-Fe-Mn) showing composition gradients","domain":"Nanomaterials","atoms":"85,000+","frames":"Multi-frame","file":"advanced_samples/dump.multielement_nanoparticle.lammpstrj","available":true,"colors":["#f5a623","#4a90d9","#d0021b"],"metadata":{"method":"MD Open Dataset","potential":"EAM (High-Entropy)","temperature":"300 K","reference":"Public Open Data Repository"},"featured":true},{"id":"cnt_bond_pull","title":"Carbon Nanotube Tensile Pull","subtitle":"Mechanics of a SWCNT structural failure under extreme load","domain":"Nanomaterials","atoms":"12,000","frames":"Multi-frame","file":"advanced_samples/dump.bondstrength_nanotube.lammpstrj","available":true,"colors":["#333333","#666666","#999999"],"metadata":{"method":"Tensile MD open dataset","potential":"REBO/AIREBO","temperature":"300 K","reference":"Public Open Data Repository"}},{"id":"cnt_bundle","title":"Carbon Nanotube Bundle","subtitle":"(10,10) SWCNT rope with hexagonal packing","domain":"Nanomaterials","atoms":"1,200","frames":"1","file":"cnt_bundle_12k.xyz","available":true,"colors":["#333333","#666666","#999999"],"metadata":{"method":"AIREBO potential MD","potential":"AIREBO (Stuart)","temperature":"300 K","reference":"7-tube bundle with vdW interactions"},"featured":true},{"id":"graphene_ribbon","title":"Graphene Nanoribbon","subtitle":"Armchair-edge GNR under uniaxial strain","domain":"Nanomaterials","atoms":"800","frames":"1","file":"graphene_ribbon_8k.xyz","available":true,"colors":["#2d2d2d","#4a4a4a","#7d7d7d"],"metadata":{"method":"Tensile MD","potential":"AIREBO","temperature":"300 K","reference":"Armchair GNR, width ~5nm"}},{"id":"au_nanoparticle","title":"Gold Nanoparticle Melt","subtitle":"Size-dependent melting of Au147 (Mackay icosahedron)","domain":"Nanomaterials","atoms":"147","frames":"200","file":"gallery/au147_melt.lammpstrj","available":true,"colors":["#ffd700","#ffb700","#ff8c00"],"metadata":{"method":"Caloric curve MD","potential":"EAM (Foiles)","temperature":"100-1500 K","reference":"Lindemann criterion melting"}},{"id":"mos2_sheet","title":"MoS₂ Monolayer","subtitle":"2D semiconductor with puckered structure","domain":"Nanomaterials","atoms":"24,000","frames":"50","file":"gallery/mos2_monolayer_24k.lammpstrj","available":true,"colors":["#4a90d9","#f5a623","#7ed321"],"metadata":{"method":"2D materials MD","potential":"SW-like (Liang)","temperature":"300 K","reference":"Hexagonal TMD monolayer"}},{"id":"sio2_glass","title":"SiO₂ Amorphous Silica","subtitle":"Vitreous silica with tetrahedral network structure","domain":"Ceramics & Oxides","atoms":"24,000","frames":"100","file":"gallery/sio2_glass_24k.lammpstrj","available":true,"colors":["#87ceeb","#b0e0e6","#ffd700"],"metadata":{"method":"Melt-quench with Vashishta potential","potential":"Vashishta (SiO₂)","temperature":"300-4000 K","reference":"Continuous random network"},"featured":true},{"id":"al2o3_sapphire","title":"α-Al₂O₃ (Sapphire)","subtitle":"Corundum structure with basal plane surface","domain":"Ceramics & Oxides","atoms":"18,000","frames":"1","file":"gallery/al2o3_sapphire_18k.lammpstrj","available":true,"colors":["#e6e6fa","#d8bfd8","#dda0dd"],"metadata":{"method":"Crystal structure","potential":"Buckingham + Coulomb","reference":"Rhombohedral corundum"}},{"id":"zro2_tetragonal","title":"ZrO₂ Tetragonal","subtitle":"Yttria-stabilized zirconia (YSZ) with oxygen vacancies","domain":"Ceramics & Oxides","atoms":"32,768","frames":"50","file":"gallery/zro2_ysz_32k.lammpstrj","available":true,"colors":["#f0e68c","#daa520","#b8860b"],"metadata":{"method":"Oxide MD","potential":"Buckingham","temperature":"1200 K","reference":"8% Y₂O₃ stabilized"}},{"id":"pe_chain","title":"Polyethylene Chain","subtitle":"Single C₁₀₀₀H₂₀₀₂ chain with united-atom model","domain":"Polymers & Soft Matter","atoms":"3,000","frames":"200","file":"gallery/pe_chain_3k.lammpstrj","available":true,"colors":["#ff69b4","#ff1493","#dc143c"],"metadata":{"method":"Polymer MD","potential":"TraPPE-UA","temperature":"450 K","ensemble":"NVT","reference":"Melt-state polyethylene"},"featured":true},{"id":"pe_crystal","title":"Polyethylene Crystal","subtitle":"Orthorhombic crystal with chain folding","domain":"Polymers & Soft Matter","atoms":"12,000","frames":"50","file":"gallery/pe_crystal_12k.lammpstrj","available":true,"colors":["#ffb6c1","#ffc0cb","#ff69b4"],"metadata":{"method":"Crystal MD","potential":"TraPPE-UA","temperature":"300 K","reference":"Orthorhombic PE unit cell"}},{"id":"li_metal","title":"Lithium Metal Anode","subtitle":"Dendrite nucleation at electrode-electrolyte interface","domain":"Energy Materials","atoms":"16,384","frames":"150","file":"gallery/li_dendrite_16k.lammpstrj","available":true,"colors":["#c0c0c0","#a9a9a9","#808080"],"metadata":{"method":"Electrodeposition MD","potential":"EAM (Daw)","temperature":"300 K","reference":"BCC Li with surface diffusion"}},{"id":"sulfur_cathode","title":"Li-S Cathode","subtitle":"Sulfur nanoparticle with Li₂S coating","domain":"Energy Materials","atoms":"8,000","frames":"100","file":"gallery/li_s_cathode_8k.lammpstrj","available":true,"colors":["#ffff00","#ffd700","#ffa500"],"metadata":{"method":"Reactive MD","potential":"ReaxFF","temperature":"400 K","reference":"Sulfur conversion cathode"}},{"id":"water_box","title":"TIP4P/2005 Water","subtitle":"Equilibrated water box with H-bond network","domain":"Biomolecules","atoms":"12,000","frames":"100","file":"gallery/water_tip4p_12k.lammpstrj","available":true,"colors":["#4169e1","#1e90ff","#87cefa"],"metadata":{"method":"Liquid MD","potential":"TIP4P/2005","temperature":"300 K","density":"0.997 g/cm³","reference":"Standard water model"}},{"id":"alanine_dipeptide","title":"Alanine Dipeptide","subtitle":"Ace-Ala-Nme with CHARMM potential","domain":"Biomolecules","atoms":"66","frames":"1000","file":"gallery/ala_dipeptide.lammpstrj","available":true,"colors":["#ff6347","#ff4500","#ffd700"],"metadata":{"method":"Biomolecular MD","potential":"CHARMM36","temperature":"300 K","ensemble":"NVT","reference":"Ramachandran sampling"},"featured":true},{"id":"pubchem_aspirin","title":"Aspirin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"21","frames":"1","file":"gallery/pubchem/aspirin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_caffeine","title":"Caffeine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/caffeine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_adenosine","title":"Adenosine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"32","frames":"1","file":"gallery/pubchem/adenosine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_serotonin","title":"Serotonin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"25","frames":"1","file":"gallery/pubchem/serotonin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_dopamine","title":"Dopamine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"22","frames":"1","file":"gallery/pubchem/dopamine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_penicillin_g","title":"Penicillin G","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"41","frames":"1","file":"gallery/pubchem/penicillin_g.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_glucose","title":"Glucose","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/glucose.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cholesterol","title":"Cholesterol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"74","frames":"1","file":"gallery/pubchem/cholesterol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_testosterone","title":"Testosterone","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"49","frames":"1","file":"gallery/pubchem/testosterone.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_estradiol","title":"Estradiol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"44","frames":"1","file":"gallery/pubchem/estradiol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_adrenaline","title":"Adrenaline","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/adrenaline.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_melatonin","title":"Melatonin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"33","frames":"1","file":"gallery/pubchem/melatonin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cortisol","title":"Cortisol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"56","frames":"1","file":"gallery/pubchem/cortisol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_nicotine","title":"Nicotine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/nicotine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_morphine","title":"Morphine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"40","frames":"1","file":"gallery/pubchem/morphine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cannabidiol","title":"Cannabidiol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"53","frames":"1","file":"gallery/pubchem/cannabidiol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_menthol","title":"Menthol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"31","frames":"1","file":"gallery/pubchem/menthol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_vanillin","title":"Vanillin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"19","frames":"1","file":"gallery/pubchem/vanillin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_eugenol","title":"Eugenol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/eugenol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_capsaicin","title":"Capsaicin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"49","frames":"1","file":"gallery/pubchem/capsaicin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cinnamaldehyde","title":"Cinnamaldehyde","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"18","frames":"1","file":"gallery/pubchem/cinnamaldehyde.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_limonene","title":"Limonene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/limonene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_linalool","title":"Linalool","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"29","frames":"1","file":"gallery/pubchem/linalool.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_pinene","title":"Pinene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/pinene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_citral","title":"Citral","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"27","frames":"1","file":"gallery/pubchem/citral.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_myrcene","title":"Myrcene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/myrcene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_geraniol","title":"Geraniol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"29","frames":"1","file":"gallery/pubchem/geraniol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_citronellol","title":"Citronellol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"31","frames":"1","file":"gallery/pubchem/citronellol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_camphor","title":"Camphor","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"27","frames":"1","file":"gallery/pubchem/camphor.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_thymol","title":"Thymol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"25","frames":"1","file":"gallery/pubchem/thymol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_carvacrol","title":"Carvacrol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"25","frames":"1","file":"gallery/pubchem/carvacrol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_eucalyptol","title":"Eucalyptol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"29","frames":"1","file":"gallery/pubchem/eucalyptol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_farnesene","title":"Farnesene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"39","frames":"1","file":"gallery/pubchem/farnesene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_nerolidol","title":"Nerolidol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"42","frames":"1","file":"gallery/pubchem/nerolidol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_bisabolol","title":"Bisabolol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"42","frames":"1","file":"gallery/pubchem/bisabolol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_humulene","title":"Humulene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"39","frames":"1","file":"gallery/pubchem/humulene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_caryophyllene","title":"Caryophyllene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"39","frames":"1","file":"gallery/pubchem/caryophyllene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_squalene","title":"Squalene","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"80","frames":"1","file":"gallery/pubchem/squalene.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_retinol","title":"Retinol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"51","frames":"1","file":"gallery/pubchem/retinol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_ergocalciferol","title":"Ergocalciferol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"73","frames":"1","file":"gallery/pubchem/ergocalciferol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_tocopherol","title":"Tocopherol","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"78","frames":"1","file":"gallery/pubchem/tocopherol.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_phylloquinone","title":"Phylloquinone","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"79","frames":"1","file":"gallery/pubchem/phylloquinone.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_thiamine","title":"Thiamine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"35","frames":"1","file":"gallery/pubchem/thiamine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_riboflavin","title":"Riboflavin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"47","frames":"1","file":"gallery/pubchem/riboflavin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_niacin","title":"Niacin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/niacin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_pantothenic_acid","title":"Pantothenic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"32","frames":"1","file":"gallery/pubchem/pantothenic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_pyridoxine","title":"Pyridoxine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"23","frames":"1","file":"gallery/pubchem/pyridoxine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_biotin","title":"Biotin","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"32","frames":"1","file":"gallery/pubchem/biotin.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_folic_acid","title":"Folic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"51","frames":"1","file":"gallery/pubchem/folic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_ascorbic_acid","title":"Ascorbic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/ascorbic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_citric_acid","title":"Citric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"21","frames":"1","file":"gallery/pubchem/citric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_malic_acid","title":"Malic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"15","frames":"1","file":"gallery/pubchem/malic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_fumaric_acid","title":"Fumaric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"12","frames":"1","file":"gallery/pubchem/fumaric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_succinic_acid","title":"Succinic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/succinic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_oxaloacetic_acid","title":"Oxaloacetic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"13","frames":"1","file":"gallery/pubchem/oxaloacetic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_pyruvic_acid","title":"Pyruvic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"10","frames":"1","file":"gallery/pubchem/pyruvic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_lactic_acid","title":"Lactic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"12","frames":"1","file":"gallery/pubchem/lactic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_acetic_acid","title":"Acetic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"8","frames":"1","file":"gallery/pubchem/acetic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_formic_acid","title":"Formic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"5","frames":"1","file":"gallery/pubchem/formic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_propionic_acid","title":"Propionic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"11","frames":"1","file":"gallery/pubchem/propionic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_butyric_acid","title":"Butyric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/butyric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_valeric_acid","title":"Valeric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"17","frames":"1","file":"gallery/pubchem/valeric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_caproic_acid","title":"Caproic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/caproic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_caprylic_acid","title":"Caprylic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/caprylic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_capric_acid","title":"Capric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"32","frames":"1","file":"gallery/pubchem/capric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_lauric_acid","title":"Lauric acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"38","frames":"1","file":"gallery/pubchem/lauric_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_myristic_acid","title":"Myristic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"44","frames":"1","file":"gallery/pubchem/myristic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_palmitic_acid","title":"Palmitic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"50","frames":"1","file":"gallery/pubchem/palmitic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_oleic_acid","title":"Oleic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"54","frames":"1","file":"gallery/pubchem/oleic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_linoleic_acid","title":"Linoleic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"52","frames":"1","file":"gallery/pubchem/linoleic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_linolenic_acid","title":"Linolenic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"50","frames":"1","file":"gallery/pubchem/linolenic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_arachidonic_acid","title":"Arachidonic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"54","frames":"1","file":"gallery/pubchem/arachidonic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_eicosapentaenoic_acid","title":"Eicosapentaenoic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"52","frames":"1","file":"gallery/pubchem/eicosapentaenoic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_docosahexaenoic_acid","title":"Docosahexaenoic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"56","frames":"1","file":"gallery/pubchem/docosahexaenoic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_glycine","title":"Glycine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"10","frames":"1","file":"gallery/pubchem/glycine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_alanine","title":"Alanine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"13","frames":"1","file":"gallery/pubchem/alanine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_valine","title":"Valine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"19","frames":"1","file":"gallery/pubchem/valine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_leucine","title":"Leucine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"22","frames":"1","file":"gallery/pubchem/leucine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_isoleucine","title":"Isoleucine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"22","frames":"1","file":"gallery/pubchem/isoleucine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_proline","title":"Proline","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"17","frames":"1","file":"gallery/pubchem/proline.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_phenylalanine","title":"Phenylalanine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"23","frames":"1","file":"gallery/pubchem/phenylalanine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_tyrosine","title":"Tyrosine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/tyrosine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_tryptophan","title":"Tryptophan","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"27","frames":"1","file":"gallery/pubchem/tryptophan.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_serine","title":"Serine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/serine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_threonine","title":"Threonine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"17","frames":"1","file":"gallery/pubchem/threonine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cysteine","title":"Cysteine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"14","frames":"1","file":"gallery/pubchem/cysteine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_methionine","title":"Methionine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/methionine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_asparagine","title":"Asparagine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"17","frames":"1","file":"gallery/pubchem/asparagine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_glutamine","title":"Glutamine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/glutamine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_aspartic_acid","title":"Aspartic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"16","frames":"1","file":"gallery/pubchem/aspartic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_glutamic_acid","title":"Glutamic acid","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"19","frames":"1","file":"gallery/pubchem/glutamic_acid.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_lysine","title":"Lysine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"24","frames":"1","file":"gallery/pubchem/lysine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_arginine","title":"Arginine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"26","frames":"1","file":"gallery/pubchem/arginine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_histidine","title":"Histidine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"20","frames":"1","file":"gallery/pubchem/histidine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_uracil","title":"Uracil","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"12","frames":"1","file":"gallery/pubchem/uracil.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_thymine","title":"Thymine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"15","frames":"1","file":"gallery/pubchem/thymine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_cytosine","title":"Cytosine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"13","frames":"1","file":"gallery/pubchem/cytosine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_adenine","title":"Adenine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"15","frames":"1","file":"gallery/pubchem/adenine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"pubchem_guanine","title":"Guanine","subtitle":"PubChem Open Database 3D Conformer","domain":"Biomolecules","atoms":"16","frames":"1","file":"gallery/pubchem/guanine.xyz","available":true,"colors":["#3eb3ff","#ff3eb3","#b3ff3e"],"metadata":{"method":"Quantum Mechanics (DFT/Forcefield)","reference":"PubChem PUG REST API"}},{"id":"lj_melt","title":"Lennard-Jones Fluid","subtitle":"Argon-like system near triple point","domain":"Methods","atoms":"32,768","frames":"100","file":"dump.lj_melt.lammpstrj","available":true,"colors":["#00ff7f","#00fa9a","#40e0d0"],"metadata":{"method":"Benchmark MD","potential":"LJ (σ=3.4Å, ε=0.238kcal)","temperature":"85 K","reference":"Standard benchmark system"}},{"id":"fcc_perf","title":"1M Atom FCC Benchmark","subtitle":"Performance test — pure copper crystal","domain":"Methods","atoms":"1,000,000","frames":"10","file":"scale_tests/dump.large_100k.lammpstrj","available":true,"colors":["#ff00ff","#ff1493","#ff69b4"],"metadata":{"method":"Performance benchmark","potential":"EAM","temperature":"300 K","reference":"WebGPU scaling test"}}]'), Ia = {
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
    }, Ld = rb;
    function ab() {
        const [r, a] = y.useState(null), [s, u] = y.useState(null), [d, m] = y.useState("All"), [h, v] = y.useState(""), b = Ld.filter((g)=>{
            if (d !== "All" && g.domain !== d) return !1;
            if (h) {
                const p = h.toLowerCase();
                return g.title.toLowerCase().includes(p) || g.subtitle.toLowerCase().includes(p) || g.domain.toLowerCase().includes(p);
            }
            return !0;
        }), x = y.useCallback(async (g, p = !1)=>{
            if (g.available) {
                if (!p) {
                    const P = new URL(window.location.href);
                    P.searchParams.set("sim", g.id), window.history.pushState({}, "", P);
                }
                u(g.id), $.getState().setLoading(!0, 0);
                try {
                    const j = g.file.replace(/^\/+/, ""), E = "./".endsWith("/") ? "./" : ".//", w = `${E}${j}`;
                    if (g.id === "lupine_brand_asset") {
                        const T = `${E}gallery/curated/lupine_bluebonnet.xyz`.replace(/([^:]\/)\/+/g, "$1"), G = await (await fetch(T)).blob(), _ = new File([
                            G
                        ], "lupine_bluebonnet.xyz"), { parseFile: O } = await Ao(async ()=>{
                            const { parseFile: Z } = await Promise.resolve().then(()=>es);
                            return {
                                parseFile: Z
                            };
                        }, void 0, import.meta.url), R = await O(_);
                        if (!R.trajectory) throw new Error("No trajectory found in scientific prefab");
                        const K = R.trajectory.frames[0], { generateLupineFrame: X } = await Ao(async ()=>{
                            const { generateLupineFrame: Z } = await import("./index-BcKtio0W.js");
                            return {
                                generateLupineFrame: Z
                            };
                        }, __vite__mapDeps([0,1,2]), import.meta.url), Q = X(K);
                        $.getState().setFile({
                            name: g.title,
                            size: 1024,
                            trajectory: {
                                frames: [
                                    Q
                                ],
                                totalFrames: 1,
                                atomTypes: R.trajectory.atomTypes,
                                globalBounds: {
                                    min: [
                                        Q.boxBounds[0],
                                        Q.boxBounds[2],
                                        Q.boxBounds[4]
                                    ],
                                    max: [
                                        Q.boxBounds[1],
                                        Q.boxBounds[3],
                                        Q.boxBounds[5]
                                    ]
                                }
                            },
                            thermo: null,
                            sourceUrl: "procedural"
                        }), $.getState().setRenderStyle("botanical"), $.getState().setAtomScale(1.4), u(null);
                        return;
                    }
                    const F = await fetch(w);
                    if (!F.ok) throw new Error(`Failed to fetch: ${F.status}`);
                    const C = await F.blob(), S = new File([
                        C
                    ], g.file.split("/").pop() ?? "file.dump"), { parseFile: D } = await Ao(async ()=>{
                        const { parseFile: T } = await Promise.resolve().then(()=>es);
                        return {
                            parseFile: T
                        };
                    }, void 0, import.meta.url), k = await D(S);
                    k.trajectory && $.getState().setFile({
                        name: g.title,
                        size: C.size,
                        trajectory: k.trajectory,
                        thermo: k.thermo ?? null,
                        sourceUrl: w
                    });
                } catch (P) {
                    console.warn(`Gallery load failed for ${g.id}:`, P.message), $.getState().setError(`Could not load "${g.title}" — try dragging the file directly.`);
                } finally{
                    u(null);
                }
            }
        }, []);
        return y.useEffect(()=>{
            const g = ()=>{
                const P = new URLSearchParams(window.location.search).get("sim");
                if (P) {
                    const j = Ld.find((E)=>E.id === P);
                    j && j.available && x(j, !0);
                } else $.getState().clearFile();
            };
            return g(), window.addEventListener("popstate", g), ()=>window.removeEventListener("popstate", g);
        }, [
            x
        ]), l.jsxs("div", {
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
                                ...Object.keys(Ia)
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
                    children: Object.keys(Ia).map((g)=>{
                        const p = b.filter((E)=>E.domain === g);
                        if (p.length === 0) return null;
                        const P = p.length > 6, j = P ? p.slice(0, 6) : p;
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
                                                background: Ia[g]
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
                                        P && l.jsxs("button", {
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
                                    children: j.map((E, w)=>l.jsx(Od, {
                                            example: E,
                                            hovered: r === E.id,
                                            loading: s === E.id,
                                            onHover: ()=>a(E.id),
                                            onLeave: ()=>a(null),
                                            onClick: ()=>x(E, !1)
                                        }, E.id))
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
                            hovered: r === g.id,
                            loading: s === g.id,
                            onHover: ()=>a(g.id),
                            onLeave: ()=>a(null),
                            onClick: ()=>x(g, !1),
                            dataDemo: p === 0 ? "crack2d" : void 0
                        }, g.id))
                })
            ]
        });
    }
    function Od({ example: r, hovered: a, loading: s, onHover: u, onLeave: d, onClick: m, dataDemo: h }) {
        const v = y.useRef(null), b = Ia[r.domain];
        return y.useEffect(()=>{
            const x = v.current;
            if (!x) return;
            const g = x.getContext("2d");
            if (!g) return;
            const p = x.width, P = x.height, j = r.colors[0] || "#444444", E = r.colors[1] || j, w = r.colors[2] || j, F = g.createRadialGradient(p / 2, P / 2, 0, p / 2, P / 2, p * .7);
            F.addColorStop(0, "#0a0d14"), F.addColorStop(1, "#040608"), g.fillStyle = F, g.fillRect(0, 0, p, P);
            const C = r.id.split("").reduce((T, z)=>T + z.charCodeAt(0), 0), S = (T)=>{
                const z = Math.sin(C * 9301 + T * 49297) * 49297;
                return z - Math.floor(z);
            }, D = 50 + Math.floor(S(0) * 40);
            for(let T = 0; T < D; T++){
                const z = S(T * 3 + 1) * p, G = S(T * 3 + 2) * P, _ = 2 + S(T * 3 + 3) * 5, R = [
                    j,
                    E,
                    w
                ][Math.floor(S(T * 7) * 3)], K = g.createRadialGradient(z, G, 0, z, G, _ * 3);
                K.addColorStop(0, R + "40"), K.addColorStop(1, R + "00"), g.fillStyle = K, g.fillRect(z - _ * 3, G - _ * 3, _ * 6, _ * 6), g.beginPath(), g.arc(z, G, _, 0, Math.PI * 2), g.fillStyle = R, g.fill();
            }
            g.strokeStyle = j + "20", g.lineWidth = 1;
            const k = [];
            for(let T = 0; T < Math.min(D, 30); T++)k.push([
                S(T * 3 + 1) * p,
                S(T * 3 + 2) * P
            ]);
            for(let T = 0; T < k.length; T++)for(let z = T + 1; z < k.length; z++){
                const G = k[T][0] - k[z][0], _ = k[T][1] - k[z][1];
                G * G + _ * _ < 2500 && (g.beginPath(), g.moveTo(k[T][0], k[T][1]), g.lineTo(k[z][0], k[z][1]), g.stroke());
            }
        }, [
            r
        ]), l.jsxs("button", {
            "data-demo": h,
            onClick: m,
            onMouseEnter: u,
            onMouseLeave: d,
            disabled: s || !r.available,
            style: {
                position: "relative",
                opacity: r.available ? 1 : .5,
                display: "flex",
                flexDirection: "column",
                background: a ? "var(--bg-elevated)" : "var(--bg-glass)",
                border: `1px solid ${a ? b : "var(--border-subtle)"}`,
                borderRadius: 12,
                overflow: "hidden",
                cursor: s ? "wait" : r.available ? "pointer" : "default",
                transition: "all 200ms ease-out",
                transform: a ? "translateY(-2px)" : "none",
                boxShadow: a ? `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px ${b}40` : "none",
                textAlign: "left",
                padding: 0,
                color: "inherit",
                font: "inherit"
            },
            children: [
                l.jsx("img", {
                    src: `/gallery/snapshots/${r.id}.jpg`,
                    alt: r.title,
                    onError: (x)=>{
                        x.currentTarget.style.display = "none", v.current && (v.current.style.display = "block");
                    },
                    style: {
                        width: "100%",
                        height: 130,
                        objectFit: "cover",
                        display: "block",
                        borderBottom: "1px solid var(--border-subtle)"
                    }
                }),
                l.jsx("canvas", {
                    ref: v,
                    width: 300,
                    height: 130,
                    style: {
                        width: "100%",
                        height: 130,
                        display: "none",
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
                                r.domain,
                                !r.available && " · Coming soon"
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
                            children: r.title
                        }),
                        l.jsx("div", {
                            style: {
                                fontSize: 12,
                                color: "var(--text-dim)",
                                lineHeight: 1.4,
                                marginBottom: 12,
                                minHeight: 34
                            },
                            children: r.subtitle
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
                                        r.atoms,
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
                                        r.frames,
                                        " frames"
                                    ]
                                })
                            ]
                        }),
                        a && r.metadata && l.jsxs("div", {
                            style: {
                                marginTop: 12,
                                paddingTop: 12,
                                borderTop: "1px solid var(--border-subtle)",
                                fontSize: 11,
                                color: "var(--text-dim)",
                                lineHeight: 1.5
                            },
                            children: [
                                r.metadata.potential && l.jsxs("div", {
                                    children: [
                                        "Potential: ",
                                        r.metadata.potential
                                    ]
                                }),
                                r.metadata.temperature && l.jsxs("div", {
                                    children: [
                                        "Temperature: ",
                                        r.metadata.temperature
                                    ]
                                }),
                                r.metadata.method && l.jsxs("div", {
                                    children: [
                                        "Method: ",
                                        r.metadata.method
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
    const lb = ()=>l.jsxs("svg", {
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
        }), ib = ()=>l.jsxs("svg", {
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
    function sb() {
        const r = y.useRef(null), [a, s] = y.useState(!1), { file: u, loading: d, loadProgress: m, error: h, setFile: v, setLoading: b, setError: x } = $();
        y.useEffect(()=>{
            const w = (F)=>{
                const { total: C, parsed: S } = F.detail;
                C > 0 && b(!0, S / C);
            };
            return window.addEventListener("atlas:parse-progress", w), ()=>window.removeEventListener("atlas:parse-progress", w);
        }, [
            b
        ]);
        const g = y.useCallback(async (w)=>{
            if (w.length === 0) return;
            const F = Array.from(w).sort((C, S)=>{
                const D = Oa(C.name), k = Oa(S.name);
                return D === "dump" && k !== "dump" ? -1 : D !== "dump" && k === "dump" ? 1 : 0;
            });
            b(!0, 0), x(null);
            try {
                let C = null, S = null;
                for (const D of F){
                    const k = await kf(D);
                    k.trajectory && (C = k.trajectory), k.thermo && (S = k.thermo);
                }
                if (C) v({
                    name: F[0].name,
                    size: F.reduce((D, k)=>D + k.size, 0),
                    trajectory: C,
                    thermo: S
                });
                else throw new Error("No valid trajectory data found in the uploaded files.");
            } catch (C) {
                x(C.message || "Failed to parse file");
            }
        }, [
            v,
            b,
            x
        ]), p = y.useCallback((w)=>{
            w.preventDefault(), s(!1), g(w.dataTransfer.files);
        }, [
            g
        ]), P = y.useCallback((w)=>{
            w.preventDefault(), s(!0);
        }, []), j = y.useCallback(()=>s(!1), []), E = y.useCallback(()=>r.current?.click(), []);
        return u && !d ? null : l.jsxs("div", {
            onDrop: p,
            onDragOver: P,
            onDragLeave: j,
            onClick: d ? void 0 : E,
            style: {
                position: "relative",
                width: "100%",
                minHeight: "calc(100vh - 56px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: u || d ? "center" : "flex-start",
                paddingTop: u || d ? 0 : 80,
                paddingBottom: 80,
                background: a ? "radial-gradient(ellipse at center, rgba(15,98,254,0.08) 0%, rgba(0,0,0,0.96) 70%)" : "radial-gradient(ellipse at center, rgba(15,98,254,0.02) 0%, rgba(0,0,0,0.98) 70%)",
                cursor: d ? "wait" : "pointer",
                transition: "background 300ms ease-out",
                zIndex: 100
            },
            children: [
                l.jsx("input", {
                    ref: r,
                    type: "file",
                    accept: ".lammpstrj,.dump,.gz,.log,.data,.lmp,.xyz",
                    multiple: !0,
                    onChange: (w)=>w.target.files && g(w.target.files),
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
                            children: l.jsx(ib, {})
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
                                border: `1px solid ${a ? "var(--accent)" : "rgba(255,255,255,0.15)"}`,
                                background: a ? "rgba(15,98,254,0.12)" : "rgba(30, 30, 40, 0.4)",
                                backdropFilter: "blur(32px)",
                                WebkitBackdropFilter: "blur(32px)",
                                boxShadow: a ? "0 0 40px rgba(15,98,254,0.3), inset 0 0 20px rgba(15,98,254,0.1)" : "0 24px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
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
                                                transform: a ? "scale(1.1)" : "scale(1)",
                                                transition: "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                                            },
                                            children: l.jsx(lb, {})
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
                                            onClick: (w)=>{
                                                w.stopPropagation(), r.current?.click();
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
                                            onMouseEnter: (w)=>{
                                                w.currentTarget.style.background = "rgba(255,255,255,0.12)", w.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                                            },
                                            onMouseLeave: (w)=>{
                                                w.currentTarget.style.background = "rgba(255,255,255,0.06)", w.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                                            },
                                            children: "Browse Files"
                                        })
                                    ]
                                })
                            ]
                        }),
                        l.jsx("div", {
                            onClick: (w)=>w.stopPropagation(),
                            style: {
                                cursor: "default"
                            },
                            children: l.jsx(ab, {})
                        })
                    ]
                })
            ]
        });
    }
    function cb({ thermo: r, totalFrames: a, currentFrame: s, onFrameChange: u, height: d = 28 }) {
        const m = y.useRef(null), h = y.useRef(null), v = y.useMemo(()=>{
            if (!r || r.runs.length === 0) return null;
            const x = r.runs[0];
            let g = x.getColumn("Temp");
            if (!g && x.columns.length > 0) for (const p of x.columns){
                const P = x.getColumn(p);
                if (P && P.length > 0) {
                    g = P;
                    break;
                }
            }
            return g;
        }, [
            r
        ]);
        y.useEffect(()=>{
            const x = m.current;
            if (!x || !v) return;
            const g = x.getContext("2d");
            if (!g) return;
            const p = window.devicePixelRatio || 1, P = x.clientWidth;
            x.width = Math.floor(P * p), x.height = Math.floor(d * p), g.scale(p, p), g.clearRect(0, 0, P, d);
            let j = 1 / 0, E = -1 / 0;
            for(let S = 0; S < v.length; S++)v[S] < j && (j = v[S]), v[S] > E && (E = v[S]);
            j === 1 / 0 && (j = 0, E = 1);
            const w = E - j || 1, F = Math.max(1, P / a);
            for(let S = 0; S < a; S++){
                const D = Math.floor(S / Math.max(1, a - 1) * (v.length - 1)), T = 240 - (v[D] - j) / w * 240;
                g.fillStyle = `hsl(${T}, 80%, 50%)`, g.fillRect(Math.floor(S * F), 0, Math.ceil(F), d);
            }
            const C = s / Math.max(1, a - 1) * P;
            g.fillStyle = "white", g.fillRect(Math.floor(C), 0, 2, d);
        }, [
            v,
            a,
            s,
            d
        ]);
        const b = y.useCallback((x)=>{
            const g = h.current?.getBoundingClientRect();
            if (!g || a <= 1) return;
            const p = x.clientX - g.left, P = Math.round(p / g.width * (a - 1));
            u(Math.max(0, Math.min(P, a - 1)));
        }, [
            a,
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
                    max: Math.max(a - 1, 0),
                    value: s,
                    onChange: (x)=>u(+x.target.value),
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
                max: Math.max(a - 1, 0),
                value: s,
                onChange: (x)=>u(+x.target.value),
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
        constructor(a = 3){
            this.cellSize = a;
        }
        build(a, s) {
            this.cells.clear(), this.positions = a;
            for(let u = 0; u < s; u++){
                const d = a[u * 3], m = a[u * 3 + 1], h = a[u * 3 + 2], v = this.key(d, m, h);
                this.cells.has(v) || this.cells.set(v, []), this.cells.get(v).push(u);
            }
        }
        query(a, s, u, d) {
            const m = [], h = Math.ceil(d / this.cellSize), v = Math.floor(a / this.cellSize), b = Math.floor(s / this.cellSize), x = Math.floor(u / this.cellSize);
            for(let g = -h; g <= h; g++)for(let p = -h; p <= h; p++)for(let P = -h; P <= h; P++){
                const j = `${v + g},${b + p},${x + P}`, E = this.cells.get(j);
                if (E) for (const w of E){
                    const F = this.positions[w * 3], C = this.positions[w * 3 + 1], S = this.positions[w * 3 + 2], D = F - a, k = C - s, T = S - u, z = D * D + k * k + T * T;
                    z < d * d && m.push({
                        index: w,
                        dist: Math.sqrt(z)
                    });
                }
            }
            return m.sort((g, p)=>g.dist - p.dist);
        }
        closest(a, s, u, d = 10) {
            let m = this.cellSize;
            for(; m <= d;){
                const h = this.query(a, s, u, m);
                if (h.length > 0) return h[0];
                m *= 2;
            }
            return null;
        }
        getCell(a, s, u) {
            const d = this.key(a, s, u);
            return this.cells.get(d) ?? [];
        }
        findBonds(a, s) {
            const u = [], d = new Set, m = Math.ceil(a / this.cellSize);
            for (const [h, v] of this.cells){
                const [b, x, g] = h.split(",").map(Number);
                for (const p of v){
                    const P = this.positions[p * 3], j = this.positions[p * 3 + 1], E = this.positions[p * 3 + 2];
                    for(let w = -m; w <= m; w++)for(let F = -m; F <= m; F++)for(let C = -m; C <= m; C++){
                        const S = `${b + w},${x + F},${g + C}`, D = this.cells.get(S);
                        if (D) for (const k of D){
                            if (p >= k) continue;
                            const T = `${p}-${k}`;
                            if (d.has(T)) continue;
                            d.add(T);
                            const z = this.positions[k * 3], G = this.positions[k * 3 + 1], _ = this.positions[k * 3 + 2], O = z - P, R = G - j, K = _ - E, X = O * O + R * R + K * K;
                            let Q = a;
                            X < Q * Q && u.push([
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
            let a = 0, s = 0;
            for (const u of this.cells.values())a += u.length, s = Math.max(s, u.length);
            return {
                numCells: this.cells.size,
                totalAtoms: a,
                avgPerCell: a / (this.cells.size || 1),
                maxInCell: s
            };
        }
        key(a, s, u) {
            return `${Math.floor(a / this.cellSize)},${Math.floor(s / this.cellSize)},${Math.floor(u / this.cellSize)}`;
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
    Cr = function(r) {
        if (ns[r]) return ns[r];
        const a = r * 137.508 % 360;
        return {
            symbol: `X${r}`,
            name: "Unknown Isotope",
            mass: 0,
            radius: 1,
            block: "?",
            role: "Unassigned",
            color: `hsl(${a}, 70%, 65%)`
        };
    };
    ub = function(r) {
        if (r.startsWith("hsl")) return [
            .6,
            .6,
            .6
        ];
        const a = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(r);
        return a ? [
            parseInt(a[1], 16) / 255,
            parseInt(a[2], 16) / 255,
            parseInt(a[3], 16) / 255
        ] : [
            .6,
            .6,
            .6
        ];
    };
    const Pf = {};
    for (const [r, a] of Object.entries(ns)){
        const s = parseInt(r, 10);
        ub(a.color), Pf[s] = a.radius;
    }
    const Ud = [
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
    }, db = {
        7: .85,
        1: .55,
        6: .72,
        9: .65,
        16: .5
    };
    function vr(r, a, s) {
        return [
            r[0] + (a[0] - r[0]) * s,
            r[1] + (a[1] - r[1]) * s,
            r[2] + (a[2] - r[2]) * s
        ];
    }
    function zn(r, a, s, u) {
        return (d)=>(d = Math.max(0, Math.min(1, d)), d < .33 ? vr(r, a, d / .33) : d < .66 ? vr(a, s, (d - .33) / .33) : vr(s, u, (d - .66) / .34));
    }
    const No = {
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
        coolwarm: (r)=>{
            r = Math.max(0, Math.min(1, r));
            const a = [
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
            return r < .5 ? vr(a, s, r * 2) : vr(s, u, (r - .5) * 2);
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
    function Ai(r) {
        return Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, "0");
    }
    function $d(r, a = 1) {
        return `#${Ai(r[0] * 255 * a)}${Ai(r[1] * 255 * a)}${Ai(r[2] * 255 * a)}`;
    }
    function fb(r) {
        const a = No[r] ?? No.viridis, s = $d(a(.05), .22), u = $d(a(.65), .4);
        return {
            top: s,
            bottom: u
        };
    }
    function ka(r, a) {
        const u = Math.max(0, Math.min(1, (r - 1) / Math.max(7, 1)));
        return (No[a] ?? No.viridis)(u);
    }
    const mb = 5e4;
    function pb({ frame: r, nextFrame: a, interpolationFactor: s, colorMode: u = "type", colorProperty: d, colormap: m = "viridis", propRange: h, scale: v = 1, renderStyle: b = "standard", maxAtoms: x, onSpatialHash: g, highlightedAtoms: p, hiddenAtomTypes: P, atomTypeScales: j, botanicalMode: E = !1 }) {
        const w = y.useRef(null), F = y.useRef(new ts(3)), C = y.useRef(Math.max(mb, Math.ceil(r.natoms * 1.2)));
        r.natoms > C.current && (C.current = Math.max(C.current * 1.5, Math.ceil(r.natoms * 1.2)));
        let S = C.current;
        x !== void 0 && S > x && (S = x);
        const D = y.useMemo(()=>new Float32Array(S * 16), [
            S
        ]), k = y.useMemo(()=>new Float32Array(S * 3), [
            S
        ]), T = y.useMemo(()=>new tf, []), z = y.useMemo(()=>new Ae, []), G = y.useMemo(()=>new Ae, []), _ = y.useMemo(()=>new Wi, []), O = y.useMemo(()=>b === "toon" ? new hd(1, 1) : r.natoms > 1e5 ? new bd(1, 12, 8) : r.natoms > 25e3 ? new hd(1, 2) : new bd(1, 32, 32), [
            b,
            r.natoms > 1e5,
            r.natoms > 25e3
        ]), R = y.useRef({
            uTime: {
                value: 0
            }
        });
        mn((U)=>{
            E && (R.current.uTime.value = U.clock.elapsedTime);
        });
        const K = y.useMemo(()=>{
            if (E) {
                const U = new Da({
                    metalness: .1,
                    roughness: .4,
                    clearcoat: .4,
                    clearcoatRoughness: .25,
                    transmission: .4,
                    thickness: 2.5,
                    ior: 1.45
                });
                return U.onBeforeCompile = (J)=>{
                    J.uniforms.uTime = R.current.uTime, J.vertexShader = `
          uniform float uTime;
          ${J.vertexShader}
        `, J.vertexShader = J.vertexShader.replace("#include <begin_vertex>", `
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
          `), J.fragmentShader = `
          ${J.fragmentShader}
        `, J.fragmentShader = J.fragmentShader.replace("#include <dithering_fragment>", `
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
                }, U;
            }
            if (b === "toon") {
                const U = new xh(new Uint8Array([
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
                ]), 3, 1, Zd);
                return U.needsUpdate = !0, U.magFilter = gd, U.minFilter = gd, new of({
                    gradientMap: U
                });
            }
            return new Da({
                metalness: .1,
                roughness: .5,
                clearcoat: .05,
                clearcoatRoughness: .5,
                envMapIntensity: .8
            });
        }, [
            b,
            E
        ]), X = y.useMemo(()=>u !== "property" || !d ? null : r.properties?.get(d) ?? null, [
            r,
            u,
            d
        ]), [Q, Z] = y.useMemo(()=>{
            if (!X) return [
                0,
                1
            ];
            let U = 1 / 0, J = -1 / 0;
            for(let ee = 0; ee < X.length; ee++)X[ee] < U && (U = X[ee]), X[ee] > J && (J = X[ee]);
            return [
                U === 1 / 0 ? 0 : U,
                J === -1 / 0 ? 1 : J
            ];
        }, [
            X
        ]), te = h?.[0] ?? Q, V = h?.[1] ?? Z, ae = No[m] ?? No.viridis, pe = y.useMemo(()=>{
            const U = new Set;
            for(let ne = 0; ne < r.natoms; ne++)U.add(r.types[ne]);
            const J = Array.from(U).sort((ne, ue)=>ne - ue), ee = new Map;
            for(let ne = 0; ne < J.length; ne++){
                const ue = J.length > 1 ? ne / (J.length - 1) : .5;
                ee.set(J[ne], ae(ue));
            }
            return ee;
        }, [
            r.types,
            r.natoms,
            ae
        ]);
        return y.useEffect(()=>{
            const U = w.current;
            if (!U) return;
            const J = typeof requestIdleCallback < "u" ? requestIdleCallback : (se)=>setTimeout(se, 0), ee = typeof cancelIdleCallback < "u" ? cancelIdleCallback : clearTimeout, ne = J(()=>{
                F.current.build(r.positions, r.natoms), g?.(F.current);
            }), ue = ()=>ee(ne), he = r.positions, Me = r.types, Ue = s ?? 0, kt = a && a.natoms === r.natoms ? a.positions : null;
            for(let se = 0; se < r.natoms; se++){
                let nt = he[se * 3], Re = he[se * 3 + 1], qe = he[se * 3 + 2];
                if (kt && Ue > 0) {
                    let ve = kt[se * 3] - nt, me = kt[se * 3 + 1] - Re, He = kt[se * 3 + 2] - qe;
                    if (r.boxBounds) {
                        const ut = r.boxBounds[1] - r.boxBounds[0], $e = r.boxBounds[3] - r.boxBounds[2], je = r.boxBounds[5] - r.boxBounds[4];
                        ve > ut / 2 && (ve -= ut), ve < -ut / 2 && (ve += ut), me > $e / 2 && (me -= $e), me < -$e / 2 && (me += $e), He > je / 2 && (He -= je), He < -je / 2 && (He += je);
                    }
                    nt += ve * Ue, Re += me * Ue, qe += He * Ue;
                }
                z.set(nt, Re, qe);
                const lt = P?.has(Me[se]) ?? !1, N = j?.[Me[se]] ?? 1;
                let re = 1.2;
                E ? re = db[Me[se]] ?? re : re = Pf[Me[se]] ?? re;
                const Ie = lt ? 0 : re * v * N;
                if (G.setScalar(Ie), T.compose(z, _, G), T.toArray(D, se * 16), E) {
                    const ve = p?.has(se), me = os[Me[se]] ?? [
                        .3,
                        .5,
                        .2
                    ];
                    ve ? (k[se * 3] = Math.min(1, me[0] * 1.5), k[se * 3 + 1] = Math.min(1, me[1] * 1.5), k[se * 3 + 2] = Math.min(1, me[2] * 1.5)) : (k[se * 3] = me[0], k[se * 3 + 1] = me[1], k[se * 3 + 2] = me[2]);
                } else if (u === "property" && X) {
                    let ve = X[se];
                    if (a && Ue > 0 && a.properties && a.properties.has(d)) {
                        const je = a.properties.get(d);
                        je && je.length > se && (ve = ve + (je[se] - ve) * Ue);
                    }
                    const me = V > te ? (ve - te) / (V - te) : .5, [He, ut, $e] = ae(me);
                    k[se * 3] = He, k[se * 3 + 1] = ut, k[se * 3 + 2] = $e;
                } else {
                    const ve = p?.has(se);
                    let me = [
                        .6,
                        .6,
                        .6
                    ];
                    u === "uniform" ? me = ae(0) : me = pe.get(Me[se]) ?? [
                        .6,
                        .6,
                        .6
                    ], ve ? (k[se * 3] = Math.min(1, me[0] * 1.5), k[se * 3 + 1] = Math.min(1, me[1] * 1.5), k[se * 3 + 2] = Math.min(1, me[2] * 1.5)) : (k[se * 3] = me[0], k[se * 3 + 1] = me[1], k[se * 3 + 2] = me[2]);
                }
            }
            const Ce = Math.min(r.natoms, S);
            return U.instanceMatrix.array.set(D.subarray(0, Ce * 16)), U.instanceMatrix.needsUpdate = !0, U.instanceColor && (U.instanceColor.array.set(k.subarray(0, Ce * 3)), U.instanceColor.needsUpdate = !0), U.count = Ce, ue;
        }, [
            r,
            a,
            s,
            u,
            X,
            te,
            V,
            v,
            p,
            P,
            j,
            pe,
            E,
            D,
            k,
            T,
            z,
            G,
            _,
            ae,
            g
        ]), y.useEffect(()=>()=>{
                O.dispose(), K.dispose(), F.current.clear();
            }, [
            O,
            K
        ]), l.jsx("instancedMesh", {
            ref: w,
            args: [
                O,
                K,
                S
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
    function hb({ frame: r, nextFrame: a, interpolationFactor: s, colormap: u = "viridis", colorMode: d = "type", maxBondLength: m = 2.5, typeCutoffs: h, periodic: v = !1, cellBounds: b, radius: x = .12, opacity: g = .85, renderStyle: p = "standard", botanicalMode: P = !1 }) {
        y.useRef(null);
        const j = y.useRef(new ts(m)), E = y.useMemo(()=>new ef, []), w = y.useMemo(()=>new vh(1, 1, 1, 8, 1), []), F = y.useRef({
            uTime: {
                value: 0
            }
        });
        mn((_)=>{
            P && (F.current.uTime.value = _.clock.elapsedTime);
        });
        const C = y.useMemo(()=>{
            if (P) {
                const _ = new Da({
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
            return p === "toon" ? new of({
                transparent: g < 1,
                opacity: g
            }) : new Da({
                metalness: .1,
                roughness: .5,
                transparent: g < 1,
                opacity: g
            });
        }, [
            p,
            g,
            P
        ]);
        y.useEffect(()=>()=>{
                w.dispose();
            }, [
            w
        ]), y.useEffect(()=>()=>{
                C.dispose();
            }, [
            C
        ]);
        const S = y.useMemo(()=>{
            if (!r || r.natoms < 2) return [];
            if (r.bonds && r.bonds.length > 0) {
                const _ = [];
                for(let O = 0; O < r.bonds.length; O += 2)_.push([
                    r.bonds[O],
                    r.bonds[O + 1]
                ]);
                return _;
            }
            return j.current = new ts(m), j.current.build(r.positions, r.natoms), bb(r, j.current, m, h, v, b);
        }, [
            r,
            m,
            h,
            v,
            b
        ]), D = 2e4, k = S.length * 2, T = y.useRef(null), z = y.useRef(Math.max(D, Math.ceil(k * 1.2)));
        k > z.current && (z.current = Math.max(z.current * 1.5, Math.ceil(k * 1.2)));
        const G = z.current;
        return y.useEffect(()=>{
            const _ = T.current;
            if (!_ || k === 0 || !_.instanceMatrix) return;
            const O = Math.min(k, G);
            _.count = O;
            const R = new Ae, K = new Ae, X = new Ae, Q = new Ae, Z = new Ae(0, 1, 0), te = new Ae, V = new Ae(1, 0, 0), ae = new cs;
            for(let pe = 0; pe < O / 2; pe++){
                const [U, J] = S[pe];
                let ee = r.positions[U * 3], ne = r.positions[U * 3 + 1], ue = r.positions[U * 3 + 2], he = r.positions[J * 3], Me = r.positions[J * 3 + 1], Ue = r.positions[J * 3 + 2];
                const De = s ?? 0;
                if (a && De > 0 && a.positions && a.positions.length >= r.positions.length) {
                    let qe = a.positions[U * 3], lt = a.positions[U * 3 + 1], N = a.positions[U * 3 + 2], re = qe - ee, Ie = lt - ne, ve = N - ue, me = a.positions[J * 3], He = a.positions[J * 3 + 1], ut = a.positions[J * 3 + 2], $e = me - he, je = He - Me, gt = ut - Ue;
                    if (r.boxBounds) {
                        const Pt = r.boxBounds[1] - r.boxBounds[0], Rt = r.boxBounds[3] - r.boxBounds[2], yt = r.boxBounds[5] - r.boxBounds[4];
                        re > Pt / 2 && (re -= Pt), re < -Pt / 2 && (re += Pt), $e > Pt / 2 && ($e -= Pt), $e < -Pt / 2 && ($e += Pt), Ie > Rt / 2 && (Ie -= Rt), Ie < -Rt / 2 && (Ie += Rt), je > Rt / 2 && (je -= Rt), je < -Rt / 2 && (je += Rt), ve > yt / 2 && (ve -= yt), ve < -yt / 2 && (ve += yt), gt > yt / 2 && (gt -= yt), gt < -yt / 2 && (gt += yt);
                    }
                    ee += re * De, ne += Ie * De, ue += ve * De, he += $e * De, Me += je * De, Ue += gt * De;
                }
                if (R.set(ee, ne, ue), K.set(he, Me, Ue), v && b) {
                    let qe = K.x - R.x, lt = K.y - R.y, N = K.z - R.z;
                    const re = b[1] - b[0], Ie = b[3] - b[2], ve = b[5] - b[4];
                    Math.abs(qe) > re * .5 && (qe -= Math.sign(qe) * re), Math.abs(lt) > Ie * .5 && (lt -= Math.sign(lt) * Ie), Math.abs(N) > ve * .5 && (N -= Math.sign(N) * ve), K.set(R.x + qe, R.y + lt, R.z + N);
                }
                X.lerpVectors(R, K, .5);
                const se = R.distanceTo(K) / 2;
                Q.subVectors(X, R).normalize(), te.lerpVectors(R, X, .5), E.position.copy(te), E.scale.set(x, se, x), Math.abs(Q.dot(Z)) < .9999 ? E.quaternion.setFromUnitVectors(Z, Q) : (E.quaternion.identity(), Q.y < 0 && E.quaternion.setFromAxisAngle(V, Math.PI)), E.updateMatrix(), _.setMatrixAt(pe * 2, E.matrix);
                let nt;
                P && r.types ? nt = os[r.types[U]] ?? [
                    .3,
                    .5,
                    .2
                ] : d === "uniform" ? nt = ka(1, u) : nt = r.types ? ka(r.types[U], u) : Ud, ae.setRGB(nt[0], nt[1], nt[2]), _.setColorAt(pe * 2, ae), Q.subVectors(K, X).normalize(), te.lerpVectors(X, K, .5), E.position.copy(te), E.scale.set(x, se, x), Math.abs(Q.dot(Z)) < .9999 ? E.quaternion.setFromUnitVectors(Z, Q) : (E.quaternion.identity(), Q.y < 0 && E.quaternion.setFromAxisAngle(V, Math.PI)), E.updateMatrix(), _.setMatrixAt(pe * 2 + 1, E.matrix);
                let Re;
                P && r.types ? Re = os[r.types[J]] ?? [
                    .3,
                    .5,
                    .2
                ] : d === "uniform" ? Re = ka(1, u) : Re = r.types ? ka(r.types[J], u) : Ud, ae.setRGB(Re[0], Re[1], Re[2]), _.setColorAt(pe * 2 + 1, ae);
            }
            _.instanceMatrix.needsUpdate = !0, _.instanceColor && (_.instanceColor.needsUpdate = !0);
        }, [
            S,
            r,
            a,
            s,
            u,
            d,
            v,
            b,
            x,
            E,
            P
        ]), l.jsx("instancedMesh", {
            ref: T,
            args: [
                w,
                C,
                G
            ],
            frustumCulled: !1,
            visible: k > 0
        });
    }
    function bb(r, a, s, u, d, m) {
        const h = [], v = new Set, [b, x, g, p, P, j] = m ?? [
            0,
            1,
            0,
            1,
            0,
            1
        ], E = x - b, w = p - g, F = j - P;
        for(let C = 0; C < r.natoms; C++){
            const S = r.positions[C * 3], D = r.positions[C * 3 + 1], k = r.positions[C * 3 + 2], T = r.types[C], z = a.query(S, D, k, s);
            for (const { index: G, dist: _ } of z){
                if (C >= G) continue;
                let O = s;
                if (u) {
                    const R = r.types[G], K = `${T}-${R}`, X = `${R}-${T}`;
                    O = u.get(K) ?? u.get(X) ?? s;
                }
                _ <= O && h.push([
                    C,
                    G
                ]);
            }
            if (d && m) {
                const G = [
                    [
                        E,
                        0,
                        0
                    ],
                    [
                        -E,
                        0,
                        0
                    ],
                    [
                        0,
                        w,
                        0
                    ],
                    [
                        0,
                        -w,
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
                for (const [_, O, R] of G){
                    const K = a.query(S + _, D + O, k + R, s);
                    for (const { index: X, dist: Q } of K){
                        if (Q > s) continue;
                        const Z = Math.min(C, X), te = Math.max(C, X), V = `${Z}-${te}`;
                        v.has(V) || (v.add(V), h.push([
                            C,
                            X
                        ]));
                    }
                }
            }
        }
        return h;
    }
    function gb(r, a) {
        const { frames: s, speed: u = 1, targetFPS: d = 60, loopMode: m = "loop", onFrame: h, onStats: v } = a, [b, x] = y.useState({
            frameIndex: 0,
            nextFrameIndex: 1,
            interpolationFactor: 0,
            isInterpolating: !1,
            effectiveFrame: 0
        }), g = y.useRef(void 0), p = y.useRef(void 0);
        y.useRef(0);
        const P = y.useRef(0), j = y.useRef(0), E = y.useRef(0), w = 1e3 / a.mdFrameRate, F = y.useCallback((k)=>{
            p.current === void 0 && (p.current = k);
            const T = k - p.current;
            p.current = k;
            const z = T * u / w;
            if (z > 0) {
                const G = performance.now();
                x((_)=>{
                    let O = _.effectiveFrame + z;
                    const R = s.length;
                    O >= R - 1 && (m === "loop" ? O = O % (R - 1) : O = R - 1);
                    const K = Math.floor(O), X = O - K, Q = Math.min(K + 1, R - 1), Z = {
                        frameIndex: K,
                        nextFrameIndex: Q,
                        interpolationFactor: X,
                        isInterpolating: X > 0 && X < 1,
                        effectiveFrame: O
                    };
                    return h(Z), Z;
                }), E.current += performance.now() - G, P.current++;
            }
            if (v && k - j.current >= 1e3) {
                const G = (k - j.current) / 1e3;
                v({
                    actualFPS: Math.round(P.current / G),
                    framesAdvanced: P.current,
                    interpolationTime: E.current
                }), P.current = 0, E.current = 0, j.current = k;
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
            if (!r || s.length < 2) {
                g.current !== void 0 && (cancelAnimationFrame(g.current), g.current = void 0), p.current = void 0;
                return;
            }
            return g.current = requestAnimationFrame(F), ()=>{
                g.current !== void 0 && cancelAnimationFrame(g.current);
            };
        }, [
            r,
            s.length,
            F
        ]);
        const C = y.useCallback((k)=>{
            const T = Math.max(0, Math.min(s.length - 1, k));
            x({
                frameIndex: T,
                nextFrameIndex: Math.min(T + 1, s.length - 1),
                interpolationFactor: 0,
                isInterpolating: !1,
                effectiveFrame: T
            }), h({
                frameIndex: T,
                nextFrameIndex: Math.min(T + 1, s.length - 1),
                interpolationFactor: 0,
                isInterpolating: !1,
                effectiveFrame: T
            });
        }, [
            s.length,
            h
        ]), S = y.useCallback(()=>{
            x((k)=>{
                const T = Math.min(k.frameIndex + 1, s.length - 1), z = {
                    frameIndex: T,
                    nextFrameIndex: Math.min(T + 1, s.length - 1),
                    interpolationFactor: 0,
                    isInterpolating: !1,
                    effectiveFrame: T
                };
                return h(z), z;
            });
        }, [
            s.length,
            h
        ]), D = y.useCallback(()=>{
            x((k)=>{
                const T = Math.max(k.frameIndex - 1, 0), z = {
                    frameIndex: T,
                    nextFrameIndex: Math.min(T + 1, s.length - 1),
                    interpolationFactor: 0,
                    isInterpolating: !1,
                    effectiveFrame: T
                };
                return h(z), z;
            });
        }, [
            h
        ]);
        return {
            currentState: b,
            setFrame: C,
            nextFrame: S,
            prevFrame: D
        };
    }
    function yb({ bounds: r, color: a = "#1e2840", opacity: s = .4 }) {
        const u = y.useMemo(()=>{
            const [d, m, h, v, b, x] = r, g = m - d, p = v - h, P = x - b, j = (d + m) / 2, E = (h + v) / 2, w = (b + x) / 2, F = new Sh(g, p, P);
            return F.translate(j, E, w), new jh(F);
        }, [
            r
        ]);
        return l.jsx("lineSegments", {
            geometry: u,
            children: l.jsx("lineBasicMaterial", {
                color: a,
                transparent: !0,
                opacity: s
            })
        });
    }
    const Gd = [
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
    function xb({ frame: r, cameraDistance: a, visible: s = !0, position: u = "bottom-left", color: d = "white" }) {
        const { length: m, label: h } = y.useMemo(()=>{
            const E = 2 * a * Math.tan(50 * Math.PI / 180 / 2) * .15;
            let w = Gd[0];
            for (const C of Gd)if (C <= E) w = C;
            else break;
            let F;
            return w >= 1e3 ? F = `${(w / 1e3).toFixed(1)} nm` : w >= 10 ? F = `${w} Å` : F = `${w} Å`, {
                length: w,
                label: F
            };
        }, [
            a
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
        }, b = 4, x = 12, p = Math.max(60, m * 5);
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
                        fontSize: x,
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
    function vb({ frame: r, spatialHash: a, enabled: s = !0, radius: u = 2, onHover: d, onClick: m, onSelect: h, selectionMode: v = "single" }) {
        const { camera: b, size: x, scene: g, raycaster: p } = ze(), P = y.useRef(new ss), j = y.useRef(new us), [E, w] = y.useState(null), [F, C] = y.useState(new Set), S = y.useRef([]), D = y.useRef(null), k = y.useCallback((_, O)=>{
            j.current.x = _ / x.width * 2 - 1, j.current.y = -(O / x.height) * 2 + 1, P.current.setFromCamera(j.current, b);
            const R = P.current.ray, K = .5, X = 1e3;
            for(let Q = 0; Q < X; Q += K){
                const Z = R.at(Q, new Ae), te = a.query(Z.x, Z.y, Z.z, u);
                if (te.length > 0) {
                    let V = null;
                    for (const { index: ae, dist: pe } of te){
                        const U = r.positions[ae * 3], J = r.positions[ae * 3 + 1], ee = r.positions[ae * 3 + 2], ne = new Ae(U, J, ee);
                        ne.project(b), Math.hypot(ne.x - j.current.x, ne.y - j.current.y) < .05 && (!V || pe < V.dist) && (V = {
                            index: ae,
                            dist: pe
                        });
                    }
                    if (V) return {
                        index: V.index,
                        distance: V.dist,
                        worldPosition: new Ae(r.positions[V.index * 3], r.positions[V.index * 3 + 1], r.positions[V.index * 3 + 2])
                    };
                }
            }
            return null;
        }, [
            b,
            r.positions,
            u,
            x,
            a
        ]), T = y.useCallback((_)=>{
            if (!s) return;
            const O = k(_.clientX, _.clientY);
            if (O?.index !== E) if (w(O?.index ?? null), d?.(O?.index ?? null), D.current && O) {
                D.current.position.copy(O.worldPosition), D.current.visible = !0;
                const R = r.types[O.index], K = [
                    1.28,
                    .73,
                    1.6,
                    1.44
                ][R - 1] ?? 1.2;
                D.current.scale.setScalar(K * 1.2);
            } else D.current && (D.current.visible = !1);
        }, [
            s,
            E,
            d,
            k,
            r.types
        ]), z = y.useCallback((_)=>{
            if (!s || !(_.target instanceof HTMLCanvasElement)) return;
            const R = k(_.clientX, _.clientY)?.index ?? null;
            m?.(R), R !== null ? C((K)=>{
                const X = new Set(K);
                switch(v){
                    case "single":
                        X.clear(), X.add(R);
                        break;
                    case "add":
                        X.add(R);
                        break;
                    case "remove":
                        X.delete(R);
                        break;
                    case "measure":
                        return S.current.push(R), S.current.length > 4 && S.current.shift(), h?.(S.current), new Set(S.current);
                }
                return h?.(Array.from(X)), X;
            }) : (v === "single" || v === "measure") && (C(new Set), S.current = [], h?.([]));
        }, [
            s,
            m,
            h,
            k,
            v
        ]), G = y.useCallback((_)=>{
            _.key === "Escape" && (C(new Set), S.current = [], h?.([])), _.key === "m" && !_.metaKey && !_.ctrlKey && (S.current = []);
        }, [
            h
        ]);
        return y.useEffect(()=>{
            if (s) return window.addEventListener("mousemove", T), window.addEventListener("click", z), window.addEventListener("keydown", G), ()=>{
                window.removeEventListener("mousemove", T), window.removeEventListener("click", z), window.removeEventListener("keydown", G);
            };
        }, [
            s,
            T,
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
                Array.from(F).map((_)=>l.jsx(Sb, {
                        position: [
                            r.positions[_ * 3],
                            r.positions[_ * 3 + 1],
                            r.positions[_ * 3 + 2]
                        ],
                        index: _
                    }, _))
            ]
        });
    }
    function Sb({ position: r, index: a }) {
        return l.jsxs("mesh", {
            position: r,
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
                            side: Ch,
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
                                jb(`#${a + 1}`)
                            ]
                        })
                    })
                })
            ]
        });
    }
    function jb(r) {
        const a = document.createElement("canvas");
        a.width = 64, a.height = 32;
        const s = a.getContext("2d");
        return s.fillStyle = "rgba(0, 0, 0, 0.7)", s.fillRect(0, 0, 64, 32), s.font = "bold 14px monospace", s.fillStyle = "#00c8f0", s.textAlign = "center", s.textBaseline = "middle", s.fillText(r, 32, 16), a;
    }
    const Yn = ({ children: r, level: a = 1, interactive: s = !1, flush: u = !1, className: d = "", ...m })=>{
        const h = [
            "lupine-glass",
            `lupine-glass--${a}`,
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
                a >= 2 && l.jsx("div", {
                    className: "lupine-glass__grain",
                    "aria-hidden": "true"
                }),
                l.jsx("div", {
                    className: u ? "lupine-glass__content--flush" : "lupine-glass__content",
                    children: r
                })
            ]
        });
    }, Ri = ({ label: r, active: a, onClick: s, hint: u })=>l.jsxs("button", {
            className: `orbital ${a ? "orbital--active" : ""}`,
            onClick: s,
            type: "button",
            role: "switch",
            "aria-checked": a,
            children: [
                l.jsxs("div", {
                    className: "orbital__text",
                    children: [
                        l.jsx("span", {
                            className: "orbital__label",
                            children: r
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
        }), Wd = ({ children: r, columns: a = 3, gap: s = 12 })=>{
        const u = y.useRef(null), [d, m] = y.useState([]), [h, v] = y.useState({
            w: 0,
            h: 0
        }), b = y.useCallback(()=>{
            const x = u.current;
            if (!x) return;
            const g = x.querySelectorAll(".covalent__node");
            if (g.length === 0) return;
            const p = x.getBoundingClientRect();
            v({
                w: p.width,
                h: p.height
            });
            const P = [];
            g.forEach((j, E)=>{
                const w = j.getBoundingClientRect(), F = w.left + w.width / 2 - p.left, C = w.top + w.height / 2 - p.top;
                if ((E + 1) % a !== 0 && E + 1 < g.length) {
                    const S = g[E + 1].getBoundingClientRect();
                    S.left + S.width / 2 - p.left;
                    const D = S.top + S.height / 2 - p.top;
                    P.push({
                        x1: w.right - p.left,
                        y1: C,
                        x2: S.left - p.left,
                        y2: D
                    });
                }
                if (E + a < g.length) {
                    const S = g[E + a].getBoundingClientRect(), D = S.left + S.width / 2 - p.left;
                    P.push({
                        x1: F,
                        y1: w.bottom - p.top,
                        x2: D,
                        y2: S.top - p.top
                    });
                }
            }), m(P);
        }, [
            a
        ]);
        return y.useEffect(()=>{
            b();
            const x = new ResizeObserver(b);
            return u.current && x.observe(u.current), ()=>x.disconnect();
        }, [
            b,
            r
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
                    children: d.map((x, g)=>l.jsx("line", {
                            x1: x.x1,
                            y1: x.y1,
                            x2: x.x2,
                            y2: x.y2,
                            className: "covalent__line"
                        }, g))
                }),
                l.jsx("div", {
                    className: "covalent__grid",
                    style: {
                        gridTemplateColumns: `repeat(${a}, 1fr)`,
                        gap: `${s}px`
                    },
                    children: y.Children.map(r, (x)=>l.jsx("div", {
                            className: "covalent__node",
                            children: x
                        }))
                })
            ]
        });
    }, Zn = ({ label: r, value: a, min: s, max: u, step: d, format: m, onChange: h, unit: v })=>{
        const b = (a - s) / (u - s) * 100, x = m ? m(a) : `${a}`;
        return l.jsxs("div", {
            className: "waveform",
            children: [
                l.jsxs("div", {
                    className: "waveform__header",
                    children: [
                        l.jsx("span", {
                            className: "waveform__label",
                            children: r
                        }),
                        l.jsxs("span", {
                            className: "waveform__readout",
                            children: [
                                x,
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
                            value: a,
                            onChange: (g)=>h(+g.target.value)
                        })
                    ]
                })
            ]
        });
    }, bt = ({ label: r, children: a, defaultOpen: s = !0, accent: u, action: d })=>{
        const [m, h] = y.useState(s), v = y.useRef(null), [b, x] = y.useState("auto");
        return y.useEffect(()=>{
            v.current && x(m ? v.current.scrollHeight : 0);
        }, [
            m,
            a
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
                                    children: r
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
                        children: a
                    })
                })
            ]
        });
    }, Jn = ({ label: r, number: a, selected: s = !1, onClick: u, tag: d })=>l.jsxs("button", {
            className: `isotope ${s ? "isotope--selected" : ""}`,
            onClick: u,
            type: "button",
            children: [
                a !== void 0 && l.jsx("span", {
                    className: "isotope__number",
                    children: a
                }),
                l.jsx("span", {
                    className: "isotope__symbol",
                    children: r
                }),
                d && l.jsx("span", {
                    className: "isotope__tag",
                    children: d
                })
            ]
        }), Cb = ()=>l.jsx("svg", {
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
        }), wb = [
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
    function kb({ availableProperties: r, bgPresets: a }) {
        const { file: s, colorMode: u, colorProperty: d, colormap: m, atomScale: h, showCell: v, showAxes: b, showBonds: x, bondCutoff: g, backgroundPreset: p, setBackgroundPreset: P, backgroundStyle: j, setBackgroundStyle: E, setColorMode: w, setColorProperty: F, setColormap: C, setAtomScale: S, toggleCell: D, toggleAxes: k, toggleBonds: T, setBondCutoff: z, setRenderStyle: G } = $();
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
                            children: l.jsx(Cb, {})
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
                                children: l.jsxs(Wd, {
                                    columns: 2,
                                    gap: 8,
                                    children: [
                                        l.jsx(mr, {
                                            label: "Classic",
                                            onClick: ()=>{
                                                w("type"), C("viridis"), G("standard"), P("deep"), S(1);
                                            }
                                        }),
                                        l.jsx(mr, {
                                            label: "Neon",
                                            onClick: ()=>{
                                                w("type"), C("neon"), G("standard"), P("void"), S(1);
                                            }
                                        }),
                                        l.jsx(mr, {
                                            label: "Publication",
                                            onClick: ()=>{
                                                w("type"), C("coolwarm"), G("standard"), P("studio"), S(1);
                                            }
                                        }),
                                        l.jsx(mr, {
                                            label: "Minimal",
                                            onClick: ()=>{
                                                w("uniform"), C("viridis"), G("standard"), P("fog"), S(.9);
                                            }
                                        }),
                                        s?.name?.toLowerCase().includes("lupine") && l.jsx(mr, {
                                            label: "🌿 Botanical",
                                            onClick: ()=>{
                                                w("type"), C("viridis"), G("botanical"), P("studio"), S(1);
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
                                        ].map((_)=>l.jsx(Jn, {
                                                label: _.label,
                                                selected: u === _.id,
                                                onClick: ()=>w(_.id)
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
                                                children: r.length > 0 ? r.map((_, O)=>l.jsx(Jn, {
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
                                    children: wb.map((_, O)=>l.jsxs("button", {
                                            onClick: ()=>C(_.id),
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
                                children: l.jsx(Zn, {
                                    label: "Scale factor",
                                    value: h,
                                    min: .1,
                                    max: 3,
                                    step: .05,
                                    format: (_)=>`${_.toFixed(2)}x`,
                                    onChange: S
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
                                        l.jsx(Ri, {
                                            label: "Unit cell outline",
                                            active: v,
                                            onClick: D
                                        }),
                                        l.jsx(Ri, {
                                            label: "Crystallographic axes",
                                            active: b,
                                            onClick: k
                                        }),
                                        l.jsx(Ri, {
                                            label: "Interatomic bonds",
                                            active: x,
                                            onClick: T,
                                            hint: "covalent radii"
                                        }),
                                        x && l.jsx("div", {
                                            style: {
                                                paddingLeft: 16,
                                                paddingTop: 4
                                            },
                                            children: l.jsx(Zn, {
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
                                        ].map((_)=>l.jsx(Jn, {
                                                label: _.label,
                                                selected: j === _.id,
                                                onClick: ()=>E(_.id)
                                            }, _.id))
                                    }),
                                    l.jsx(Wd, {
                                        columns: 2,
                                        gap: 8,
                                        children: Object.entries(a).map(([_, O])=>l.jsx(Yn, {
                                                level: 1,
                                                interactive: !0,
                                                flush: !0,
                                                onClick: ()=>P(_),
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
    function mr({ label: r, onClick: a }) {
        return l.jsx(Yn, {
            level: 1,
            interactive: !0,
            onClick: a,
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
                    children: r
                })
            })
        });
    }
    const Pb = ()=>l.jsx("svg", {
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
    function Mb() {
        const r = $;
        return y.useMemo(()=>[
                {
                    id: "publication",
                    label: "Publication",
                    description: "Clean SSAO + ACES filmic. No bloom. Optimized for journal-quality figure export with accurate depth cues.",
                    apply: ()=>{
                        const a = r.getState();
                        a.ssao || a.toggleSSAO(), a.setSSAOIntensity(.6), a.bloom && a.toggleBloom(), a.dof && a.toggleDOF(), a.setToneMapping("aces");
                    }
                },
                {
                    id: "presentation",
                    label: "Presentation",
                    description: 'Moderate bloom + strong SSAO. Atoms "glow" under ambient lighting for dark-background slides and posters.',
                    apply: ()=>{
                        const a = r.getState();
                        a.ssao || a.toggleSSAO(), a.setSSAOIntensity(.5), a.bloom || a.toggleBloom(), a.setBloomIntensity(.4), a.dof && a.toggleDOF(), a.setToneMapping("aces");
                    }
                },
                {
                    id: "cinematic",
                    label: "Cinematic",
                    description: "Full pipeline: SSAO + Bloom + DOF. Shallow focus isolates structural features while bloom enhances contrast.",
                    apply: ()=>{
                        const a = r.getState();
                        a.ssao || a.toggleSSAO(), a.setSSAOIntensity(.7), a.bloom || a.toggleBloom(), a.setBloomIntensity(.5), a.dof || a.toggleDOF(), a.setDOFFocus(50), a.setToneMapping("aces");
                    }
                },
                {
                    id: "raw",
                    label: "Raw Data",
                    description: "All post-processing disabled. Linear color space. Shows atoms as the renderer computes them — useful for debugging.",
                    apply: ()=>{
                        const a = r.getState();
                        a.ssao && a.toggleSSAO(), a.bloom && a.toggleBloom(), a.dof && a.toggleDOF(), a.setToneMapping("none");
                    }
                }
            ], []);
    }
    function Fb() {
        const { ssao: r, ssaoIntensity: a, bloom: s, bloomIntensity: u, dof: d, dofFocus: m, toneMapping: h, toggleSSAO: v, toggleBloom: b, toggleDOF: x, setSSAOIntensity: g, setBloomIntensity: p, setDOFFocus: P, setToneMapping: j, setActivePanel: E } = $(), w = $((k)=>k.file), F = $((k)=>k.frame), C = Mb(), S = y.useMemo(()=>{
            if (!w) return null;
            const k = w.trajectory.frames[F];
            if (!k) return null;
            const T = w.trajectory.globalBounds;
            let z, G, _;
            T && isFinite(T.min[0]) && isFinite(T.max[0]) ? (z = T.max[0] - T.min[0], G = T.max[1] - T.min[1], _ = T.max[2] - T.min[2]) : k.boxBounds && k.boxBounds[1] - k.boxBounds[0] > 0 ? (z = k.boxBounds[1] - k.boxBounds[0], G = k.boxBounds[3] - k.boxBounds[2], _ = k.boxBounds[5] - k.boxBounds[4]) : z = G = _ = 0;
            const O = Math.sqrt(z * z + G * G + _ * _), R = new Map;
            for(let Z = 0; Z < k.natoms; Z++){
                const te = k.types[Z];
                R.set(te, (R.get(te) ?? 0) + 1);
            }
            let K = 1, X = 0;
            R.forEach((Z, te)=>{
                Z > X && (X = Z, K = te);
            });
            const Q = Cr(K);
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
            w,
            F
        ]), D = [
            r,
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
                            onClick: ()=>E(null),
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
                            children: l.jsx(Pb, {})
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
                            l.jsx(pr, {
                                title: "RENDERING PRESETS",
                                children: l.jsx("div", {
                                    style: {
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: 6
                                    },
                                    children: C.map((k)=>l.jsxs("button", {
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
                                            onMouseEnter: (T)=>T.currentTarget.style.borderColor = "#1edce0",
                                            onMouseLeave: (T)=>T.currentTarget.style.borderColor = "#334155",
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
                            l.jsxs(pr, {
                                title: "AMBIENT OCCLUSION",
                                children: [
                                    l.jsxs(Pa, {
                                        children: [
                                            "Simulates soft shadows in crevices between closely-packed atoms. Essential for reading 3D structure from 2D projections.",
                                            S && l.jsxs("span", {
                                                style: {
                                                    color: "#0ea5e9"
                                                },
                                                children: [
                                                    " ",
                                                    "Recommended for ",
                                                    S.dominantElement,
                                                    "-dominant lattice (r",
                                                    l.jsx("sub", {
                                                        children: "cov"
                                                    }),
                                                    " = ",
                                                    S.dominantRadius,
                                                    "Å)."
                                                ]
                                            })
                                        ]
                                    }),
                                    l.jsx(Ni, {
                                        label: "Screen-Space AO",
                                        active: r,
                                        onToggle: v
                                    }),
                                    r && l.jsxs("div", {
                                        style: {
                                            marginTop: 8
                                        },
                                        children: [
                                            l.jsx(Zn, {
                                                label: "OCCLUSION INTENSITY",
                                                value: a,
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
                            l.jsxs(pr, {
                                title: "EMISSION BLOOM",
                                children: [
                                    l.jsx(Pa, {
                                        children: "Adds luminous halos around bright atoms. Useful for highlighting high-energy sites, emissive dopants, or atoms with extreme property values."
                                    }),
                                    l.jsx(Ni, {
                                        label: "Bloom Filter",
                                        active: s,
                                        onToggle: b
                                    }),
                                    s && l.jsxs("div", {
                                        style: {
                                            marginTop: 8
                                        },
                                        children: [
                                            l.jsx(Zn, {
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
                            l.jsxs(pr, {
                                title: "DEPTH OF FIELD",
                                children: [
                                    l.jsxs(Pa, {
                                        children: [
                                            "Optical blur simulates focal depth to isolate crystallographic planes or surface features. Focus distance is measured from camera origin.",
                                            S && l.jsxs("span", {
                                                style: {
                                                    color: "#0ea5e9"
                                                },
                                                children: [
                                                    " ",
                                                    "System diagonal: ",
                                                    S.diag,
                                                    "Å — suggested focus: ~",
                                                    S.suggestedFocus,
                                                    "Å."
                                                ]
                                            })
                                        ]
                                    }),
                                    l.jsx(Ni, {
                                        label: "Depth Blur",
                                        active: d,
                                        onToggle: x
                                    }),
                                    d && l.jsx("div", {
                                        style: {
                                            marginTop: 8
                                        },
                                        children: l.jsx(Zn, {
                                            label: "FOCUS DISTANCE",
                                            value: m,
                                            min: 1,
                                            max: 200,
                                            step: 1,
                                            format: (k)=>`${k.toFixed(0)}Å`,
                                            onChange: P
                                        })
                                    })
                                ]
                            }),
                            l.jsxs(pr, {
                                title: "TONE MAPPING",
                                children: [
                                    l.jsx(Pa, {
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
                                                onClick: ()=>j(k.id),
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
                            S && l.jsxs("div", {
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
                                                        children: S.natoms.toLocaleString()
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
                                                            S.diag,
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
                                                            S.maxDim,
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
                                                        children: S.dominantElement
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
    function pr({ title: r, children: a }) {
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
                    children: r
                }),
                a
            ]
        });
    }
    function Pa({ summary: r, children: a }) {
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
                        s ? "Hide details" : r || "Show details"
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
                    children: a
                })
            ]
        });
    }
    function Ni({ label: r, active: a, onToggle: s }) {
        return l.jsxs("button", {
            onClick: s,
            style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "8px 10px",
                background: a ? "rgba(30, 220, 224, 0.06)" : "#121418",
                border: `1px solid ${a ? "rgba(30, 220, 224, 0.25)" : "#334155"}`,
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
                        color: a ? "#e2e8f0" : "#94a3b8"
                    },
                    children: r
                }),
                l.jsx("div", {
                    style: {
                        width: 32,
                        height: 16,
                        background: a ? "#1edce0" : "#334155",
                        position: "relative",
                        transition: "background 200ms"
                    },
                    children: l.jsx("div", {
                        style: {
                            width: 12,
                            height: 12,
                            background: a ? "#0a0a0c" : "#64748b",
                            position: "absolute",
                            top: 2,
                            left: a ? 18 : 2,
                            transition: "left 200ms, background 200ms"
                        }
                    })
                })
            ]
        });
    }
    const Qd = [
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
    ], Bi = [
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
    ], Tb = [
        3,
        5,
        10,
        30,
        60,
        120
    ], Eb = ()=>l.jsx("svg", {
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
        }), zb = ()=>l.jsxs("svg", {
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
        }), Ib = ()=>l.jsx("svg", {
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
        }), _b = ()=>l.jsx("svg", {
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
    function Db() {
        const { setActivePanel: r, file: a, frame: s, triggerExport: u } = $(), [d, m] = y.useState("figure"), [h, v] = y.useState(Qd[0]), [b, x] = y.useState("png"), [g, p] = y.useState(!1), [P, j] = y.useState(Bi[1]), [E, w] = y.useState(5), [F, C] = y.useState(!0), [S, D] = y.useState(!1), [k, T] = y.useState(!1), [z, G] = y.useState(!1), [_, O] = y.useState(0), [R, K] = y.useState(null);
        y.useEffect(()=>{
            if (z && !R) {
                const U = setTimeout(()=>G(!1), 4e3);
                return ()=>clearTimeout(U);
            }
        }, [
            z,
            R
        ]), y.useEffect(()=>{
            if (!k) {
                O(0);
                return;
            }
            const U = setInterval(()=>{
                O((J)=>Math.min(J + 100 / (E * 10), 99));
            }, 100);
            return ()=>clearInterval(U);
        }, [
            k,
            E
        ]);
        const X = y.useMemo(()=>{
            if (!a) return null;
            const U = a.trajectory.frames[s];
            if (!U) return null;
            const J = new Map;
            for(let ne = 0; ne < U.natoms; ne++){
                const ue = U.types[ne];
                J.set(ue, (J.get(ue) ?? 0) + 1);
            }
            const ee = [];
            return J.forEach((ne, ue)=>{
                const he = Cr(ue);
                ee.push(`${he.symbol}${ne > 1 ? ne : ""}`);
            }), {
                formula: ee.join(""),
                natoms: U.natoms,
                totalFrames: a.trajectory.totalFrames
            };
        }, [
            a,
            s
        ]), Q = y.useCallback((U, J, ee)=>{
            T(!1), O(100), G(U !== !1), U && J && ee && K({
                blob: J,
                name: ee
            });
        }, []), Z = y.useCallback(async ()=>{
            if (!R) return;
            const { blob: U, name: J } = R;
            if (navigator.share) {
                const ue = new File([
                    U
                ], J, {
                    type: U.type
                });
                if (navigator.canShare && navigator.canShare({
                    files: [
                        ue
                    ]
                })) try {
                    await navigator.share({
                        files: [
                            ue
                        ],
                        title: J
                    }), K(null), G(!0), setTimeout(()=>G(!1), 4e3);
                    return;
                } catch (he) {
                    console.warn("Web Share failed or cancelled:", he);
                }
            }
            const ee = URL.createObjectURL(U), ne = document.createElement("a");
            ne.download = J, ne.href = ee, document.body.appendChild(ne), ne.click(), document.body.removeChild(ne), setTimeout(()=>URL.revokeObjectURL(ee), 1e4), K(null), G(!0), setTimeout(()=>G(!1), 4e3);
        }, [
            R
        ]), te = y.useCallback(()=>{
            T(!0), G(!1), $.getState().setShowScaleBar(!0), u({
                type: "image",
                resolution: {
                    width: h.width,
                    height: h.height
                },
                format: g ? "png" : b,
                transparent: g,
                baseName: `glimPSE-${h.id}`,
                onComplete: Q
            });
        }, [
            h,
            b,
            g,
            u,
            Q
        ]), V = y.useCallback(async ()=>{
            T(!0), G(!1), u({
                type: "video",
                resolution: {
                    width: P.width,
                    height: P.height
                },
                format: d === "gif" ? "gif" : "mp4",
                orbit: F,
                cinematic: S,
                durationSeconds: E,
                baseName: `glimPSE-${d === "gif" ? "anim" : "orbit"}-${P.label}`,
                fileStream: void 0,
                onComplete: Q
            });
        }, [
            d,
            P,
            F,
            S,
            E,
            u,
            Q
        ]), ae = y.useMemo(()=>{
            if (d === "figure") return `~${(h.width * h.height * (b === "png" ? 2 : .3) / (1024 * 1024)).toFixed(1)} MB`;
            if (d === "mp4") return `~${(80 * E / 8).toFixed(0)} MB`;
            if (d === "gif") {
                const J = 30 * E, ee = P.width * P.height;
                return `~${(J * ee * .12 / (1024 * 1024)).toFixed(0)} MB`;
            }
            return "";
        }, [
            d,
            h,
            b,
            P,
            E
        ]), pe = typeof globalThis.VideoEncoder < "u";
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
                            onClick: ()=>r(null),
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
                            children: l.jsx(Eb, {})
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
                    ].map((U)=>l.jsx("button", {
                            onClick: ()=>m(U.id),
                            style: {
                                flex: 1,
                                padding: "10px 0",
                                background: d === U.id ? "rgba(30, 220, 224, 0.06)" : "transparent",
                                border: "none",
                                borderBottom: d === U.id ? "2px solid #1edce0" : "2px solid transparent",
                                cursor: "pointer",
                                transition: "all 150ms"
                            },
                            children: l.jsx("div", {
                                style: {
                                    fontSize: 11,
                                    fontWeight: 700,
                                    fontFamily: "var(--font-mono)",
                                    letterSpacing: "0.1em",
                                    color: d === U.id ? "#1edce0" : "#64748b"
                                },
                                children: U.label
                            })
                        }, U.id))
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
                                            children: Qd.map((U)=>l.jsxs("button", {
                                                    onClick: ()=>v(U),
                                                    style: {
                                                        padding: "10px",
                                                        background: h.id === U.id ? "rgba(30, 220, 224, 0.08)" : "#121418",
                                                        border: `1px solid ${h.id === U.id ? "rgba(30, 220, 224, 0.3)" : "#334155"}`,
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
                                                                color: h.id === U.id ? "#1edce0" : "#e2e8f0"
                                                            },
                                                            children: U.name
                                                        }),
                                                        l.jsxs("div", {
                                                            style: {
                                                                fontSize: 9,
                                                                color: "#64748b",
                                                                fontFamily: "var(--font-mono)",
                                                                marginTop: 3
                                                            },
                                                            children: [
                                                                U.width,
                                                                "×",
                                                                U.height,
                                                                " · ",
                                                                U.desc
                                                            ]
                                                        })
                                                    ]
                                                }, U.id))
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
                                            ].map((U)=>l.jsx(hr, {
                                                    label: U.toUpperCase(),
                                                    active: b === U,
                                                    onClick: ()=>x(U)
                                                }, U))
                                        })
                                    }),
                                    l.jsx(fn, {
                                        title: "OPTIONS",
                                        children: l.jsx(br, {
                                            label: "Transparent Background",
                                            hint: "Enable for slides, disable for journals",
                                            active: g,
                                            onToggle: ()=>p(!g)
                                        })
                                    }),
                                    l.jsxs(Li, {
                                        children: [
                                            l.jsx(Ct, {
                                                label: "Output",
                                                value: `${h.width}×${h.height}px`
                                            }),
                                            l.jsx(Ct, {
                                                label: "DPI",
                                                value: `${h.dpi}`
                                            }),
                                            l.jsx(Ct, {
                                                label: "Format",
                                                value: g ? "PNG (alpha)" : b.toUpperCase()
                                            }),
                                            l.jsx(Ct, {
                                                label: "Est. Size",
                                                value: ae
                                            })
                                        ]
                                    }),
                                    R ? l.jsx(Do, {
                                        onClick: Z,
                                        exporting: !1,
                                        success: !1,
                                        label: "Save to Device"
                                    }) : l.jsx(Do, {
                                        onClick: te,
                                        exporting: k,
                                        success: z,
                                        label: "Export Figure"
                                    })
                                ]
                            }),
                            d === "mp4" && l.jsxs(l.Fragment, {
                                children: [
                                    !pe && l.jsx("div", {
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
                                            children: Bi.map((U)=>l.jsx(hr, {
                                                    label: `${U.label}`,
                                                    sublabel: `${U.width}×${U.height}`,
                                                    active: P.label === U.label,
                                                    onClick: ()=>j(U)
                                                }, U.label))
                                        })
                                    }),
                                    l.jsx(fn, {
                                        title: "DURATION",
                                        children: l.jsx("div", {
                                            style: {
                                                display: "flex",
                                                gap: 6
                                            },
                                            children: Tb.map((U)=>l.jsx(hr, {
                                                    label: `${U}s`,
                                                    active: E === U,
                                                    onClick: ()=>w(U)
                                                }, U))
                                        })
                                    }),
                                    l.jsxs(fn, {
                                        title: "CAMERA & ANIMATION",
                                        children: [
                                            l.jsx(br, {
                                                label: "360° Orbit",
                                                hint: "Spin around structure centroid",
                                                active: F,
                                                onToggle: ()=>C(!F)
                                            }),
                                            l.jsx(br, {
                                                label: "Cinematic Sequence",
                                                hint: "Dynamically animate structure properties",
                                                active: S,
                                                onToggle: ()=>D(!S)
                                            })
                                        ]
                                    }),
                                    l.jsxs(Li, {
                                        children: [
                                            l.jsx(Ct, {
                                                label: "Codec",
                                                value: "H.264 High (avc1.640028)"
                                            }),
                                            l.jsx(Ct, {
                                                label: "Bitrate",
                                                value: "80 Mbps (HQ)"
                                            }),
                                            l.jsx(Ct, {
                                                label: "FPS",
                                                value: "60"
                                            }),
                                            l.jsx(Ct, {
                                                label: "Frames",
                                                value: `${60 * E}`
                                            }),
                                            l.jsx(Ct, {
                                                label: "Est. Size",
                                                value: ae
                                            })
                                        ]
                                    }),
                                    R ? l.jsx(Do, {
                                        onClick: Z,
                                        exporting: !1,
                                        success: !1,
                                        label: "Save to Device"
                                    }) : l.jsx(Do, {
                                        onClick: V,
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
                                                children: Bi.slice(0, 2).map((U)=>l.jsx(hr, {
                                                        label: U.label,
                                                        sublabel: `${U.width}×${U.height}`,
                                                        active: P.label === U.label,
                                                        onClick: ()=>j(U)
                                                    }, U.label))
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
                                            ].map((U)=>l.jsx(hr, {
                                                    label: `${U}s`,
                                                    active: E === U,
                                                    onClick: ()=>w(U)
                                                }, U))
                                        })
                                    }),
                                    l.jsxs(fn, {
                                        title: "CAMERA PATH",
                                        children: [
                                            l.jsx(br, {
                                                label: "360° Orbit",
                                                hint: "Spin around structure centroid",
                                                active: F,
                                                onToggle: ()=>C(!F)
                                            }),
                                            l.jsx(br, {
                                                label: "Cinematic Sequence",
                                                hint: "Dynamically animate structure properties",
                                                active: S,
                                                onToggle: ()=>D(!S)
                                            })
                                        ]
                                    }),
                                    l.jsxs(Li, {
                                        children: [
                                            l.jsx(Ct, {
                                                label: "Pipeline",
                                                value: "MP4 → GIF"
                                            }),
                                            l.jsx(Ct, {
                                                label: "Palette",
                                                value: "256 colors (adaptive)"
                                            }),
                                            l.jsx(Ct, {
                                                label: "FPS",
                                                value: "30"
                                            }),
                                            l.jsx(Ct, {
                                                label: "Frames",
                                                value: `${30 * E}`
                                            }),
                                            l.jsx(Ct, {
                                                label: "Est. Size",
                                                value: ae
                                            })
                                        ]
                                    }),
                                    R ? l.jsx(Do, {
                                        onClick: Z,
                                        exporting: !1,
                                        success: !1,
                                        label: "Save to Device"
                                    }) : l.jsx(Do, {
                                        onClick: V,
                                        exporting: k,
                                        success: z,
                                        label: "Record GIF",
                                        recordMode: !0,
                                        progress: _
                                    })
                                ]
                            }),
                            X && l.jsxs("div", {
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
                                                        children: X.formula
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
                                                        children: X.natoms.toLocaleString()
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
                                                        children: X.totalFrames
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
    function fn({ title: r, children: a }) {
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
                    children: r
                }),
                a
            ]
        });
    }
    function hr({ label: r, sublabel: a, active: s, onClick: u }) {
        return l.jsxs("button", {
            onClick: u,
            style: {
                padding: a ? "8px 12px" : "6px 14px",
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
                    children: r
                }),
                a && l.jsx("div", {
                    style: {
                        fontSize: 9,
                        color: "#475569",
                        fontFamily: "var(--font-mono)",
                        marginTop: 2
                    },
                    children: a
                })
            ]
        });
    }
    function br({ label: r, hint: a, active: s, onToggle: u }) {
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
                            children: r
                        }),
                        a && l.jsx("div", {
                            style: {
                                fontSize: 9,
                                color: "#475569",
                                marginTop: 2
                            },
                            children: a
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
    function Li({ children: r }) {
        return l.jsx("div", {
            style: {
                background: "#0d1117",
                border: "1px solid #1f2937",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: 4
            },
            children: r
        });
    }
    function Ct({ label: r, value: a }) {
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
                    children: r
                }),
                l.jsx("span", {
                    style: {
                        color: "#f8fafc"
                    },
                    children: a
                })
            ]
        });
    }
    function Do({ onClick: r, exporting: a, success: s, label: u, recordMode: d, progress: m }) {
        return l.jsxs("button", {
            onClick: r,
            disabled: a,
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
                cursor: a ? "not-allowed" : "pointer",
                color: s ? "#1edce0" : a ? "#94a3b8" : "#0a0a0c",
                background: s ? "rgba(30, 220, 224, 0.1)" : a ? "#1f2937" : "#1edce0",
                border: `1px solid ${s ? "rgba(30, 220, 224, 0.3)" : a ? "#334155" : "#1edce0"}`,
                borderRadius: 0,
                position: "relative",
                overflow: "hidden",
                transition: "all 200ms"
            },
            children: [
                a && d && l.jsx("div", {
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
                            l.jsx(Ib, {}),
                            " Saved"
                        ]
                    }) : a ? l.jsxs(l.Fragment, {
                        children: [
                            l.jsx(_b, {}),
                            " Recording... ",
                            d && m ? `${Math.round(m)}%` : ""
                        ]
                    }) : l.jsxs(l.Fragment, {
                        children: [
                            l.jsx(zb, {}),
                            " ",
                            u
                        ]
                    })
                })
            ]
        });
    }
    const to = ()=>l.jsxs("svg", {
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
    function Ab() {
        const { colorMode: r, colorProperty: a, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = r === "property" && a === "rdf_local_density";
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
                        l.jsx(to, {}),
                        " ",
                        m ? "Hide Local Density" : "Compute RDF"
                    ]
                })
            ]
        });
    }
    function Rb() {
        const { colorMode: r, colorProperty: a, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = r === "property" && a === "msd_displacement";
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
                        l.jsx(to, {}),
                        " ",
                        m ? "Hide MSD" : "Compute MSD"
                    ]
                })
            ]
        });
    }
    function Nb() {
        const { colorMode: r, colorProperty: a, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = r === "property" && a === "voronoi_coordination";
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
                        l.jsx(to, {}),
                        " ",
                        m ? "Hide Voronoi" : "Run Voronoi"
                    ]
                })
            ]
        });
    }
    function Bb() {
        const { colorMode: r, colorProperty: a, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = r === "property" && a === "pdos_amplitude";
        return l.jsxs(bt, {
            label: "Phonon Spectrum & PDOS",
            defaultOpen: !0,
            accent: "#bf5cf0",
            action: l.jsx(Jn, {
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
                        l.jsx(to, {}),
                        " ",
                        m ? "Hide PDOS" : "Compute PDOS"
                    ]
                })
            ]
        });
    }
    function Lb() {
        const { colorMode: r, colorProperty: a, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = r === "property" && a === "glimmer_uq_std";
        return l.jsxs(bt, {
            label: "Multi-Fidelity UQ (GlimMER)",
            defaultOpen: !0,
            accent: "#bf5cf0",
            action: l.jsx(Jn, {
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
                        l.jsx(to, {}),
                        " ",
                        m ? "Hide UQ Mapping" : "Run glimMER PCA"
                    ]
                })
            ]
        });
    }
    function Ob() {
        const { colorMode: r, colorProperty: a, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = r === "property" && a === "gnn_topology_err";
        return l.jsxs(bt, {
            label: "GNN Error Prediction",
            defaultOpen: !0,
            accent: "#bf5cf0",
            action: l.jsx(Jn, {
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
                        l.jsx(to, {}),
                        " ",
                        m ? "Hide Topology Error" : "Analyze Topology"
                    ]
                })
            ]
        });
    }
    function Ub() {
        const { colorMode: r, colorProperty: a, setColorMode: s, setColorProperty: u, setColormap: d } = $(), m = r === "property" && a === "pca_drift_bias";
        return l.jsxs(bt, {
            label: "Sloppy Model Analysis",
            defaultOpen: !0,
            accent: "#bf5cf0",
            action: l.jsx(Jn, {
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
                        l.jsx(to, {}),
                        " ",
                        m ? "Hide Drift Bias" : "Compute FIM"
                    ]
                })
            ]
        });
    }
    const $b = ()=>l.jsx("svg", {
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
    function Gb() {
        const { setActivePanel: r } = $();
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
                            onClick: ()=>r(null),
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
                            children: l.jsx($b, {})
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
                            l.jsx(Ab, {}),
                            l.jsx(Rb, {}),
                            l.jsx(Nb, {}),
                            l.jsx(Bb, {}),
                            l.jsx(Lb, {}),
                            l.jsx(Ob, {}),
                            l.jsx(Ub, {}),
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
    const Vd = ()=>l.jsx("svg", {
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
        }), Wb = ()=>l.jsx("svg", {
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
        }), Qb = ()=>l.jsx("svg", {
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
    function Vb(r, a) {
        const s = r.x - a.x, u = r.y - a.y, d = r.z - a.z;
        return Math.sqrt(s * s + u * u + d * d);
    }
    function qb(r, a, s) {
        const u = {
            x: r.x - a.x,
            y: r.y - a.y,
            z: r.z - a.z
        }, d = {
            x: s.x - a.x,
            y: s.y - a.y,
            z: s.z - a.z
        }, m = u.x * d.x + u.y * d.y + u.z * d.z, h = Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z), v = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z);
        if (h === 0 || v === 0) return 0;
        const b = m / (h * v);
        return Math.acos(Math.max(-1, Math.min(1, b))) * (180 / Math.PI);
    }
    function Hb(r, a, s, u) {
        const d = (w, F)=>({
                x: w.y * F.z - w.z * F.y,
                y: w.z * F.x - w.x * F.z,
                z: w.x * F.y - w.y * F.x
            }), m = (w, F)=>w.x * F.x + w.y * F.y + w.z * F.z, h = {
            x: r.x - a.x,
            y: r.y - a.y,
            z: r.z - a.z
        }, v = {
            x: s.x - a.x,
            y: s.y - a.y,
            z: s.z - a.z
        }, b = {
            x: u.x - s.x,
            y: u.y - s.y,
            z: u.z - s.z
        }, x = (w)=>{
            const F = Math.sqrt(w.x * w.x + w.y * w.y + w.z * w.z);
            return F > 0 ? {
                x: w.x / F,
                y: w.y / F,
                z: w.z / F
            } : w;
        }, g = x(d(h, v)), p = x(d(v, b)), P = d(g, x(v)), j = m(g, p), E = m(P, p);
        return Math.atan2(E, j) * (180 / Math.PI);
    }
    function Kb(r, a) {
        const s = r.ids?.[a] ?? a + 1, u = r.types[a], d = r.positions[a * 3], m = r.positions[a * 3 + 1], h = r.positions[a * 3 + 2], v = {};
        return r.properties?.forEach((b, x)=>{
            v[x] = b[a];
        }), {
            index: a,
            id: s,
            type: u,
            x: d,
            y: m,
            z: h,
            properties: v
        };
    }
    function Yb() {
        const { file: r, frame: a, selectedAtoms: s, setSelectedAtoms: u } = $(), [d, m] = y.useState([]), h = r?.trajectory.frames[a], v = {
            1: "Cu",
            2: "O",
            3: "Zr"
        }, b = y.useMemo(()=>h ? s.map((w)=>Kb(h, w)) : [], [
            h,
            s
        ]), x = y.useMemo(()=>{
            if (b.length < 2) return null;
            if (b.length === 2) {
                const [w, F] = b;
                return {
                    type: "distance",
                    value: Vb(w, F),
                    unit: "Å",
                    description: `d(${w.id}-${F.id})`
                };
            }
            if (b.length === 3) {
                const [w, F, C] = b;
                return {
                    type: "angle",
                    value: qb(w, F, C),
                    unit: "°",
                    description: `∠(${w.id}-${F.id}-${C.id})`
                };
            }
            if (b.length >= 4) {
                const [w, F, C, S] = b;
                return {
                    type: "dihedral",
                    value: Hb(w, F, C, S),
                    unit: "°",
                    description: `φ(${w.id}-${F.id}-${C.id}-${S.id})`
                };
            }
            return null;
        }, [
            b
        ]), g = y.useCallback(()=>{
            if (!x || s.length < 2) return;
            const w = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: x.type,
                atoms: [
                    ...s
                ],
                value: x.value,
                unit: x.unit,
                frame: a,
                timestamp: Date.now()
            };
            m((F)=>[
                    w,
                    ...F
                ]);
        }, [
            x,
            s,
            a
        ]), p = y.useCallback((w)=>{
            m((F)=>F.filter((C)=>C.id !== w));
        }, []), P = y.useCallback(()=>{
            m([]);
        }, []), j = y.useCallback(()=>{
            if (!h || d.length === 0) return;
            const w = [
                "Type",
                "Atoms",
                "Value",
                "Unit",
                "Frame",
                "Timestamp"
            ], F = d.map((T)=>[
                    T.type,
                    T.atoms.map((z)=>h.ids?.[z] ?? z + 1).join("-"),
                    T.value.toFixed(4),
                    T.unit,
                    T.frame + 1,
                    new Date(T.timestamp).toISOString()
                ]), C = [
                w.join(","),
                ...F.map((T)=>T.join(","))
            ].join(`
`), S = new Blob([
                C
            ], {
                type: "text/csv"
            }), D = URL.createObjectURL(S), k = document.createElement("a");
            k.href = D, k.download = `measurements-${r?.name ?? "data"}.csv`, k.click(), URL.revokeObjectURL(D);
        }, [
            d,
            h,
            r?.name
        ]), E = y.useCallback(()=>{
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
                            children: l.jsx(Vd, {})
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
                            x && l.jsxs(Yn, {
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
                                        children: x.type
                                    }),
                                    l.jsxs("div", {
                                        style: {
                                            fontSize: 36,
                                            fontWeight: 700,
                                            color: "var(--lupine-300)",
                                            fontFamily: "var(--font-mono)"
                                        },
                                        children: [
                                            x.value.toFixed(3),
                                            l.jsx("span", {
                                                style: {
                                                    fontSize: 16,
                                                    marginLeft: 6,
                                                    color: "var(--slate-400)",
                                                    fontWeight: 400
                                                },
                                                children: x.unit
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
                                        children: x.description
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
                                        }) : b.map((w, F)=>l.jsxs(Yn, {
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
                                                        children: v[w.type] ?? `Type ${w.type}`
                                                    }),
                                                    l.jsxs("span", {
                                                        style: {
                                                            color: "var(--slate-500)",
                                                            fontFamily: "var(--font-mono)",
                                                            fontSize: 11
                                                        },
                                                        children: [
                                                            "#",
                                                            w.id
                                                        ]
                                                    })
                                                ]
                                            }, w.index))
                                    }),
                                    s.length > 0 && l.jsx("button", {
                                        onClick: E,
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
                                            onClick: j,
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
                                            children: l.jsx(Wb, {})
                                        }),
                                        l.jsx("button", {
                                            onClick: P,
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
                                            children: l.jsx(Qb, {})
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
                                    children: d.map((w)=>l.jsxs(Yn, {
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
                                                            children: w.type
                                                        }),
                                                        l.jsx("button", {
                                                            onClick: ()=>p(w.id),
                                                            style: {
                                                                background: "transparent",
                                                                border: "none",
                                                                color: "var(--slate-500)",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center"
                                                            },
                                                            children: l.jsx(Vd, {})
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
                                                        w.value.toFixed(3),
                                                        " ",
                                                        l.jsx("span", {
                                                            style: {
                                                                fontSize: 12,
                                                                color: "var(--slate-500)",
                                                                fontWeight: 400
                                                            },
                                                            children: w.unit
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
                                                        w.atoms.map((F)=>h?.ids?.[F] ?? F + 1).join("-"),
                                                        " · FRAME ",
                                                        w.frame + 1
                                                    ]
                                                })
                                            ]
                                        }, w.id))
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
    const Xb = ()=>l.jsx("svg", {
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
        }), Zb = ()=>l.jsxs("svg", {
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
                    d: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                }),
                l.jsx("line", {
                    x1: "1",
                    y1: "1",
                    x2: "23",
                    y2: "23"
                })
            ]
        }), eg = ()=>l.jsxs("svg", {
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
    function tg() {
        const r = $((C)=>C.file), a = $((C)=>C.frame), s = $((C)=>C.hiddenAtomTypes), u = $((C)=>C.atomTypeScales), d = $((C)=>C.atomScale), { toggleAtomType: m, showAllAtomTypes: h, soloAtomType: v, setAtomTypeScale: b, resetAtomTypeScales: x, setAtomScale: g } = $(), p = r?.trajectory.frames[a], P = y.useMemo(()=>{
            if (!p) return [];
            const C = new Map;
            for(let S = 0; S < p.natoms; S++){
                const D = p.types[S];
                C.set(D, (C.get(D) ?? 0) + 1);
            }
            return Array.from(C.entries()).sort((S, D)=>S[0] - D[0]).map(([S, D])=>{
                const k = Cr(S);
                return {
                    type: S,
                    count: D,
                    pct: D / p.natoms * 100,
                    ...k
                };
            });
        }, [
            p
        ]), j = y.useMemo(()=>{
            if (!p?.boxBounds) return null;
            const C = p.boxBounds;
            return {
                x: (C[1] - C[0]).toFixed(3),
                y: (C[3] - C[2]).toFixed(3),
                z: (C[5] - C[4]).toFixed(3)
            };
        }, [
            p
        ]), E = y.useMemo(()=>{
            if (!p) return 0;
            let C = 0;
            for(let S = 0; S < p.natoms; S++)s.has(p.types[S]) || C++;
            return C;
        }, [
            p,
            s
        ]), w = s.size === 0, F = Object.keys(u).length > 0;
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
                            onMouseEnter: (C)=>{
                                C.currentTarget.style.color = "#fff", C.currentTarget.style.borderColor = "#1edce0";
                            },
                            onMouseLeave: (C)=>{
                                C.currentTarget.style.color = "#94a3b8", C.currentTarget.style.borderColor = "#334155";
                            },
                            children: l.jsx(Xb, {})
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
                                    l.jsx(Ma, {
                                        label: "Total Atoms",
                                        value: p ? p.natoms.toLocaleString() : "—"
                                    }),
                                    l.jsx(Ma, {
                                        label: "Visible",
                                        value: E.toLocaleString(),
                                        accent: !w
                                    }),
                                    l.jsx(Ma, {
                                        label: "Unique Elements",
                                        value: P.length.toString()
                                    }),
                                    l.jsx(Ma, {
                                        label: "Trajectory Frame",
                                        value: `${a + 1} / ${r?.trajectory.totalFrames ?? 0}`
                                    })
                                ]
                            }),
                            j && l.jsxs("div", {
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
                                                    j.x
                                                ]
                                            }),
                                            l.jsxs("span", {
                                                children: [
                                                    "Y: ",
                                                    j.y
                                                ]
                                            }),
                                            l.jsxs("span", {
                                                children: [
                                                    "Z: ",
                                                    j.z
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
                                                    !w && l.jsx(qd, {
                                                        label: "RESET VISIBILITY",
                                                        onClick: h
                                                    }),
                                                    F && l.jsx(qd, {
                                                        label: "RESET SIZES",
                                                        onClick: x
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
                                        children: P.map((C)=>{
                                            const S = s.has(C.type), D = u[C.type] ?? 1;
                                            return l.jsxs("div", {
                                                style: {
                                                    background: S ? "#0a0a0c" : "#121418",
                                                    border: `1px solid ${S ? "#1e293b" : "#334155"}`,
                                                    borderLeft: `3px solid ${S ? "#334155" : C.color}`,
                                                    padding: "12px",
                                                    opacity: S ? .5 : 1,
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
                                                                                children: C.symbol
                                                                            }),
                                                                            l.jsx("span", {
                                                                                style: {
                                                                                    fontSize: 13,
                                                                                    color: "#94a3b8",
                                                                                    fontWeight: 500
                                                                                },
                                                                                children: C.name
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
                                                                                    C.mass.toFixed(2)
                                                                                ]
                                                                            }),
                                                                            l.jsx("span", {
                                                                                children: "|"
                                                                            }),
                                                                            l.jsxs("span", {
                                                                                children: [
                                                                                    "Rc: ",
                                                                                    C.radius,
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
                                                                                    C.block,
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
                                                                        onClick: ()=>v(C.type),
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
                                                                        children: l.jsx(eg, {})
                                                                    }),
                                                                    l.jsx("button", {
                                                                        onClick: ()=>m(C.type),
                                                                        title: S ? "Show" : "Hide",
                                                                        style: {
                                                                            width: 24,
                                                                            height: 24,
                                                                            background: S ? "#0f172a" : "rgba(30, 220, 224, 0.1)",
                                                                            border: `1px solid ${S ? "#334155" : "rgba(30, 220, 224, 0.3)"}`,
                                                                            color: S ? "#64748b" : "#1edce0",
                                                                            cursor: "pointer",
                                                                            display: "grid",
                                                                            placeItems: "center"
                                                                        },
                                                                        children: S ? l.jsx(Jb, {}) : l.jsx(Zb, {})
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
                                                                    C.pct.toFixed(1),
                                                                    "% ",
                                                                    l.jsxs("span", {
                                                                        style: {
                                                                            color: "#64748b",
                                                                            fontWeight: 400
                                                                        },
                                                                        children: [
                                                                            "(",
                                                                            C.count.toLocaleString(),
                                                                            ")"
                                                                        ]
                                                                    })
                                                                ]
                                                            }),
                                                            !S && l.jsx("div", {
                                                                style: {
                                                                    flex: 1,
                                                                    paddingLeft: 8,
                                                                    borderLeft: "1px solid #334155"
                                                                },
                                                                children: l.jsx(Zn, {
                                                                    label: "RADIUS MULTIPLIER",
                                                                    value: D,
                                                                    min: .1,
                                                                    max: 3,
                                                                    step: .05,
                                                                    format: (k)=>k.toFixed(2),
                                                                    onChange: (k)=>b(C.type, k)
                                                                })
                                                            })
                                                        ]
                                                    })
                                                ]
                                            }, C.type);
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
                                    l.jsx(Zn, {
                                        label: "Van der Waals Scaling",
                                        value: d,
                                        min: .1,
                                        max: 3,
                                        step: .05,
                                        format: (C)=>C.toFixed(2),
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
                                        children: Array.from(p.properties.keys()).map((C)=>{
                                            const S = p.properties.get(C);
                                            let D = 1 / 0, k = -1 / 0;
                                            for(let T = 0; T < S.length; T++)S[T] < D && (D = S[T]), S[T] > k && (k = S[T]);
                                            return l.jsxs("button", {
                                                onClick: ()=>{
                                                    $.getState().setColorMode("property"), $.getState().setColorProperty(C);
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
                                                onMouseEnter: (T)=>T.currentTarget.style.borderColor = "#1edce0",
                                                onMouseLeave: (T)=>T.currentTarget.style.borderColor = "#334155",
                                                children: [
                                                    l.jsx("span", {
                                                        style: {
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            color: "#e2e8f0"
                                                        },
                                                        children: C
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
                                            }, C);
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
    function Ma({ label: r, value: a, accent: s }) {
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
                    children: r
                }),
                l.jsx("div", {
                    style: {
                        fontSize: 16,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: s ? "#1edce0" : "#f8fafc",
                        fontVariantNumeric: "tabular-nums"
                    },
                    children: a
                })
            ]
        });
    }
    function qd({ label: r, onClick: a }) {
        return l.jsx("button", {
            onClick: a,
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
            children: r
        });
    }
    const Mf = {
        linear: (r)=>r,
        "ease-in": (r)=>r * r * r,
        "ease-out": (r)=>1 - Math.pow(1 - r, 3),
        "ease-in-out": (r)=>r < .5 ? 4 * r * r * r : 1 - Math.pow(-2 * r + 2, 3) / 2,
        "slow-middle": (r)=>r < .5 ? .5 * (1 - Math.pow(1 - 2 * r, 3)) : .5 + .5 * Math.pow(2 * r - 1, 3),
        "fast-middle": (r)=>r < .5 ? Math.pow(2 * r, 4) / 2 : 1 - Math.pow(2 - 2 * r, 4) / 2
    }, Oi = {
        linear: "Linear",
        "ease-in": "Ease In (Slow Start)",
        "ease-out": "Ease Out (Slow End)",
        "ease-in-out": "Ease In-Out",
        "slow-middle": "Slow Middle",
        "fast-middle": "Fast Middle"
    };
    function ng(r, a, s) {
        return [
            r[0] + (a[0] - r[0]) * s,
            r[1] + (a[1] - r[1]) * s,
            r[2] + (a[2] - r[2]) * s
        ];
    }
    function og(r, a, s, u, d, m = .5) {
        const h = d * d, v = h * d, b = [
            0,
            0,
            0
        ];
        for(let x = 0; x < 3; x++){
            const g = -m * r[x] + (2 - m) * a[x] + (m - 2) * s[x] + m * u[x], p = 2 * m * r[x] + (m - 3) * a[x] + (3 - 2 * m) * s[x] - m * u[x], P = -m * r[x] + m * s[x], j = a[x];
            b[x] = g * v + p * h + P * d + j;
        }
        return b;
    }
    function Sr(r) {
        let a = 0;
        for(let s = 0; s < r.keyframes.length; s++){
            const u = r.keyframes[s];
            a += u.holdDuration, (s < r.keyframes.length - 1 || r.loop) && (a += u.transitionDuration);
        }
        return a;
    }
    function rs(r, a, s = 50) {
        const { keyframes: u, loop: d } = r;
        if (u.length < 2) return null;
        const m = Sr(r);
        if (m <= 0) return null;
        let h = d ? (a % m + m) % m : Math.min(a, m), v = 0;
        const b = u.length;
        for(let g = 0; g < b; g++){
            const p = u[g], P = g === b - 1;
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
            if (v += p.holdDuration, !P || d) {
                const j = (g + 1) % b;
                if (h < v + p.transitionDuration) {
                    const E = (h - v) / p.transitionDuration, w = Mf[p.easing](E), F = (g - 1 + b) % b, C = (g + 2) % b, S = g === 0 && !d ? p.position : u[F].position, D = p.position, k = u[j].position, T = j === b - 1 && !d ? k : u[C].position, z = og(S, D, k, T, w), G = ng(p.target, u[j].target, w), _ = p.fov ?? s, O = u[j].fov ?? s;
                    return {
                        position: z,
                        target: G,
                        fov: _ + (O - _) * w,
                        segment: g,
                        segmentProgress: E,
                        totalProgress: h / m
                    };
                }
                v += p.transitionDuration;
            }
        }
        const x = u[b - 1];
        return {
            position: [
                ...x.position
            ],
            target: [
                ...x.target
            ],
            fov: x.fov ?? s,
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
    }, rg = Object.fromEntries(Object.entries(Ff).map(([r, a])=>[
            a,
            r
        ])), gr = (r)=>Math.round(r * 10) / 10;
    function ag(r) {
        const a = {
            l: r.loop ? 1 : 0,
            k: r.keyframes.map((u)=>({
                    p: u.position.map(gr),
                    t: u.target.map(gr),
                    f: u.fov !== null ? gr(u.fov) : void 0,
                    d: gr(u.transitionDuration),
                    e: Ff[u.easing],
                    h: u.holdDuration > 0 ? gr(u.holdDuration) : void 0
                }))
        }, s = JSON.stringify(a);
        return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    function Tf(r) {
        try {
            let a = r.replace(/-/g, "+").replace(/_/g, "/");
            for(; a.length % 4;)a += "=";
            const s = JSON.parse(atob(a));
            return {
                loop: s.l === 1,
                keyframes: s.k.map((u, d)=>({
                        position: u.p,
                        target: u.t,
                        fov: u.f ?? null,
                        transitionDuration: u.d ?? 2,
                        easing: rg[u.e] ?? "ease-in-out",
                        holdDuration: u.h ?? 0,
                        label: `Stop ${d + 1}`
                    }))
            };
        } catch  {
            return console.warn("Failed to decode flythrough"), null;
        }
    }
    function as(r, a, s = null, u) {
        return {
            position: [
                ...r
            ],
            target: [
                ...a
            ],
            fov: s,
            transitionDuration: 2,
            easing: "ease-in-out",
            holdDuration: .5,
            label: u ?? "Stop"
        };
    }
    function lg(r, a) {
        const s = r[0] - a[0], u = r[2] - a[2], d = [
            a[0] - u,
            r[1],
            a[2] + s
        ];
        return {
            loop: !1,
            keyframes: [
                as(r, a, null, "Start"),
                as(d, a, null, "End")
            ]
        };
    }
    const ig = ()=>l.jsx("svg", {
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
        }), sg = ()=>l.jsx("svg", {
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
        }), cg = ()=>l.jsx("svg", {
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
        }), ug = ()=>l.jsx("svg", {
            width: "14",
            height: "14",
            viewBox: "0 0 24 24",
            fill: "currentColor",
            children: l.jsx("path", {
                d: "M8 5v14l11-7L8 5z"
            })
        }), dg = ()=>l.jsxs("svg", {
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
        }), fg = ()=>l.jsxs("svg", {
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
        }), mg = ()=>l.jsx("svg", {
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
    function pg({ easing: r }) {
        const a = Mf[r], s = [];
        for(let u = 0; u <= 20; u++){
            const d = u / 20, m = a(d);
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
    function hg() {
        const { setActivePanel: r, flythrough: a, cameraPosition: s, cameraTarget: u, cameraFov: d, triggerExport: m } = $(), h = $((V)=>V.setFlythrough), v = $((V)=>V.addFlythroughKeyframe), b = $((V)=>V.removeFlythroughKeyframe), x = $((V)=>V.updateFlythroughKeyframe), g = $((V)=>V.setFlythroughLoop), p = $((V)=>V.flythroughPreview), P = $((V)=>V.setFlythroughPreview), j = $((V)=>V.setFlythroughTime), E = $((V)=>V.flythroughTime), w = $((V)=>V.exportRequest.type === "video"), F = (p || w) && a ? rs(a, E, d) : null, [C, S] = y.useState(null), [D, k] = y.useState(""), [T, z] = y.useState(!1), G = y.useRef(0), _ = y.useRef(0);
        y.useEffect(()=>{
            if (!p || !a) return;
            const V = Sr(a);
            if (V <= 0) return;
            _.current = performance.now();
            const ae = (pe)=>{
                const U = (pe - _.current) / 1e3, J = a.loop ? U % V : Math.min(U, V);
                j(J);
                const ee = rs(a, J, d);
                if (ee && $.getState().setCameraState(ee.position, ee.target), !a.loop && U >= V) {
                    P(!1);
                    return;
                }
                G.current = requestAnimationFrame(ae);
            };
            return G.current = requestAnimationFrame(ae), ()=>cancelAnimationFrame(G.current);
        }, [
            p,
            a,
            d,
            P,
            j
        ]);
        const O = y.useCallback(()=>{
            const V = as([
                ...s
            ], [
                ...u
            ], null, `Stop ${(a?.keyframes.length ?? 0) + 1}`);
            if (a) v(V);
            else {
                const ae = lg([
                    ...s
                ], [
                    ...u
                ]);
                h(ae);
            }
        }, [
            s,
            u,
            a,
            h,
            v
        ]), R = y.useCallback(()=>{
            if (!a) return;
            const V = ag(a), ae = `${window.location.origin}${window.location.pathname}?fly=${encodeURIComponent(V)}`;
            navigator.clipboard.writeText(ae), alert("Flythrough link copied to clipboard!");
        }, [
            a
        ]), K = y.useCallback(()=>{
            if (!D.trim()) return;
            let V = D.trim();
            try {
                V = new URL(V).searchParams.get("fly") ?? V;
            } catch  {}
            const ae = Tf(V);
            ae ? (h(ae), z(!1), k("")) : alert("Invalid flythrough data");
        }, [
            D,
            h
        ]), X = y.useCallback(()=>{
            if (!a || a.keyframes.length < 2) return;
            const V = Sr(a);
            m({
                type: "video",
                resolution: {
                    width: 1920,
                    height: 1080
                },
                format: "mp4",
                durationSeconds: Math.ceil(V),
                flythrough: a,
                baseName: "glimPSE-flythrough"
            });
        }, [
            a,
            m
        ]), Q = a ? Sr(a) : 0, Z = a?.keyframes ?? [], te = Z.length < 5;
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
                                a && l.jsxs("span", {
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
                            onClick: ()=>r(null),
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
                            children: l.jsx(ig, {})
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
                            !a && l.jsxs("div", {
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
                                        onClick: ()=>z(!T),
                                        style: {
                                            ...yr,
                                            marginTop: 8,
                                            width: "100%"
                                        },
                                        children: "Import from Link"
                                    })
                                ]
                            }),
                            T && l.jsxs("div", {
                                style: {
                                    background: "#0d1117",
                                    border: "1px solid #1f2937",
                                    padding: 12
                                },
                                children: [
                                    l.jsx("div", {
                                        style: Hd,
                                        children: "IMPORT FLYTHROUGH"
                                    }),
                                    l.jsx("input", {
                                        value: D,
                                        onChange: (V)=>k(V.target.value),
                                        placeholder: "Paste flythrough link or code...",
                                        style: zf
                                    }),
                                    l.jsx("button", {
                                        onClick: K,
                                        style: {
                                            ...$i,
                                            marginTop: 8
                                        },
                                        children: "Import"
                                    })
                                ]
                            }),
                            Z.map((V, ae)=>l.jsx(bg, {
                                    index: ae,
                                    keyframe: V,
                                    isLast: ae === Z.length - 1,
                                    expanded: C === ae,
                                    activeSample: F,
                                    onToggle: ()=>S(C === ae ? null : ae),
                                    onUpdate: (pe)=>x(ae, pe),
                                    onRemove: ()=>b(ae),
                                    onRecapture: ()=>{
                                        x(ae, {
                                            position: [
                                                ...$.getState().cameraPosition
                                            ],
                                            target: [
                                                ...$.getState().cameraTarget
                                            ]
                                        });
                                    },
                                    onJumpTo: ()=>{
                                        $.getState().setCameraState(V.position, V.target);
                                    }
                                }, ae)),
                            a && te && l.jsxs("button", {
                                onClick: O,
                                style: {
                                    ...yr,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 6,
                                    width: "100%"
                                },
                                children: [
                                    l.jsx(sg, {}),
                                    " Add Stop (",
                                    Z.length,
                                    "/5)"
                                ]
                            }),
                            a && Z.length >= 2 && l.jsxs(l.Fragment, {
                                children: [
                                    l.jsxs("div", {
                                        style: {
                                            background: "#0d1117",
                                            border: "1px solid #1f2937",
                                            padding: 12
                                        },
                                        children: [
                                            l.jsx("div", {
                                                style: Hd,
                                                children: "PATH OPTIONS"
                                            }),
                                            l.jsx(gg, {
                                                label: "Loop Path",
                                                hint: "Return to first keyframe at end",
                                                active: a.loop,
                                                onToggle: ()=>g(!a.loop)
                                            })
                                        ]
                                    }),
                                    l.jsx("div", {
                                        style: {
                                            display: "flex",
                                            gap: 6
                                        },
                                        children: l.jsx("button", {
                                            onClick: ()=>P(!p),
                                            style: {
                                                ...$i,
                                                flex: 1,
                                                background: p ? "#334155" : "#f59e0b",
                                                borderColor: p ? "#475569" : "#f59e0b",
                                                color: p ? "#e2e8f0" : "#0a0a0c"
                                            },
                                            children: p ? l.jsxs(l.Fragment, {
                                                children: [
                                                    l.jsx(dg, {}),
                                                    " Stop"
                                                ]
                                            }) : l.jsxs(l.Fragment, {
                                                children: [
                                                    l.jsx(ug, {}),
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
                                                onClick: R,
                                                style: {
                                                    ...yr,
                                                    flex: 1
                                                },
                                                children: [
                                                    l.jsx(fg, {}),
                                                    " Share Link"
                                                ]
                                            }),
                                            l.jsxs("button", {
                                                onClick: X,
                                                style: {
                                                    ...yr,
                                                    flex: 1
                                                },
                                                children: [
                                                    l.jsx(mg, {}),
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
                                                value: `${Z.length - 1}${a.loop ? " + return" : ""}`
                                            }),
                                            l.jsx(Ui, {
                                                label: "Interpolation",
                                                value: "Catmull-Rom Spline"
                                            })
                                        ]
                                    }),
                                    l.jsx("button", {
                                        onClick: ()=>{
                                            h(null), P(!1);
                                        },
                                        style: {
                                            ...yr,
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
    function bg({ index: r, keyframe: a, isLast: s, expanded: u, activeSample: d, onToggle: m, onUpdate: h, onRemove: v, onRecapture: b, onJumpTo: x }) {
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
                                        background: u ? "#f59e0b" : d?.segment === r ? "#1edce0" : "#334155",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: u || d?.segment === r ? "#0a0a0c" : "#94a3b8",
                                        fontFamily: "var(--font-mono)",
                                        transition: "background 150ms, color 150ms"
                                    },
                                    children: r + 1
                                }),
                                l.jsx("span", {
                                    style: {
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#e2e8f0",
                                        fontFamily: "Space Grotesk, sans-serif"
                                    },
                                    children: a.label
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
                                g(a.position[0]),
                                ", ",
                                g(a.position[1]),
                                ", ",
                                g(a.position[2]),
                                "]"
                            ]
                        })
                    ]
                }),
                d?.segment === r && l.jsx("div", {
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
                                    style: Fa,
                                    children: "LABEL"
                                }),
                                l.jsx("input", {
                                    value: a.label,
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
                                    style: Fa,
                                    children: "TRANSITION DURATION (s)"
                                }),
                                l.jsx("input", {
                                    type: "range",
                                    min: "0.5",
                                    max: "10",
                                    step: "0.5",
                                    value: a.transitionDuration,
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
                                        a.transitionDuration.toFixed(1),
                                        "s"
                                    ]
                                })
                            ]
                        }),
                        l.jsxs("div", {
                            children: [
                                l.jsx("div", {
                                    style: Fa,
                                    children: "HOLD AT STOP (s)"
                                }),
                                l.jsx("input", {
                                    type: "range",
                                    min: "0",
                                    max: "5",
                                    step: "0.25",
                                    value: a.holdDuration,
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
                                        a.holdDuration.toFixed(2),
                                        "s"
                                    ]
                                })
                            ]
                        }),
                        !s && l.jsxs("div", {
                            children: [
                                l.jsx("div", {
                                    style: Fa,
                                    children: "EASING CURVE"
                                }),
                                l.jsx("div", {
                                    style: {
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr 1fr",
                                        gap: 4
                                    },
                                    children: Object.keys(Oi).map((p)=>l.jsxs("button", {
                                            onClick: ()=>h({
                                                    easing: p
                                                }),
                                            style: {
                                                padding: "6px 4px",
                                                background: a.easing === p ? "rgba(245,158,11,0.12)" : "#121418",
                                                border: `1px solid ${a.easing === p ? "rgba(245,158,11,0.4)" : "#334155"}`,
                                                borderRadius: 0,
                                                cursor: "pointer",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                gap: 2
                                            },
                                            children: [
                                                l.jsx(pg, {
                                                    easing: p
                                                }),
                                                l.jsx("span", {
                                                    style: {
                                                        fontSize: 8,
                                                        color: a.easing === p ? "#f59e0b" : "#64748b",
                                                        fontFamily: "var(--font-mono)",
                                                        textAlign: "center"
                                                    },
                                                    children: Oi[p]
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
                                    onClick: x,
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
                                    children: l.jsx(cg, {})
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
                                Oi[a.easing]
                            ]
                        }),
                        l.jsxs("span", {
                            children: [
                                a.transitionDuration.toFixed(1),
                                "s"
                            ]
                        })
                    ]
                })
            ]
        });
    }
    function gg({ label: r, hint: a, active: s, onToggle: u }) {
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
                            children: r
                        }),
                        a && l.jsx("div", {
                            style: {
                                fontSize: 9,
                                color: "#475569",
                                marginTop: 2
                            },
                            children: a
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
    function Ui({ label: r, value: a }) {
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
                    children: r
                }),
                l.jsx("span", {
                    style: {
                        color: "#f8fafc"
                    },
                    children: a
                })
            ]
        });
    }
    const Hd = {
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.1em",
        color: "#94a3b8",
        textTransform: "uppercase",
        marginBottom: 8
    }, Fa = {
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
    }, yr = {
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
    async function yg(r, a = 30) {
        const { GIFEncoder: s, quantize: u, applyPalette: d } = await Ao(async ()=>{
            const { GIFEncoder: F, quantize: C, applyPalette: S } = await import("./gifenc.esm-BWxMhepS.js");
            return {
                GIFEncoder: F,
                quantize: C,
                applyPalette: S
            };
        }, [], import.meta.url), m = URL.createObjectURL(r), h = document.createElement("video");
        h.muted = !0, h.playsInline = !0, h.preload = "auto", h.src = m, await new Promise((F, C)=>{
            h.onloadedmetadata = ()=>F(), h.onerror = ()=>C(new Error("Failed to load MP4 for GIF conversion")), setTimeout(()=>C(new Error("MP4 metadata load timeout")), 1e4);
        });
        const v = h.videoWidth, b = h.videoHeight, x = h.duration, g = 1 / a, p = Math.round(1e3 / a), P = Math.floor(x * a), j = document.createElement("canvas");
        j.width = v, j.height = b;
        const E = j.getContext("2d", {
            willReadFrequently: !0
        }), w = s();
        for(let F = 0; F < P; F++){
            const C = Math.min(F * g, x - .001);
            await new Promise((T)=>{
                const z = ()=>{
                    h.removeEventListener("seeked", z), T();
                };
                h.addEventListener("seeked", z), h.currentTime = C;
            }), E.drawImage(h, 0, 0, v, b);
            const S = E.getImageData(0, 0, v, b), D = u(S.data, 256), k = d(S.data, D);
            w.writeFrame(k, v, b, {
                palette: D,
                delay: p
            });
        }
        return w.finish(), URL.revokeObjectURL(m), h.remove(), new Blob([
            w.bytes().buffer
        ], {
            type: "image/gif"
        });
    }
    function xg({ encoderRef: r, muxerRef: a, requestRef: s, frameCount: u, totalFrames: d, originalCameraPosition: m, originalSize: h, originalPixelRatio: v, outputFormat: b, onCompleteRef: x, clearExportRequest: g, file: p, isRecording: P, setIsCapturing: j, originalStoreState: E }) {
        const { gl: w, camera: F } = ze();
        return mn(()=>{
            if (!P.current || !r.current || !a.current || r.current.encodeQueueSize > 4) return;
            const C = s.current;
            if (!C) return;
            const S = u.current, D = d.current, k = 60;
            try {
                const T = new VideoFrame(w.domElement, {
                    timestamp: S * 1e6 / k
                });
                r.current.encode(T, {
                    keyFrame: S % 60 === 0
                }), T.close();
            } catch (T) {
                console.error("Frame encode error", T);
            }
            if (u.current++, C.flythrough && C.flythrough.keyframes.length >= 2) {
                const T = Sr(C.flythrough), z = u.current / D * T;
                $.getState().setFlythroughTime(z);
                const G = rs(C.flythrough, z);
                G && (F.position.set(...G.position), F.lookAt(...G.target), F instanceof Xn && G.fov && (F.fov = G.fov, F.updateProjectionMatrix()));
            } else if (C.orbit && m.current && p) {
                const { min: T, max: z } = p.trajectory.globalBounds, G = new Ae((T[0] + z[0]) / 2, (T[1] + z[1]) / 2, (T[2] + z[2]) / 2), _ = m.current.distanceTo(G), O = u.current / D * Math.PI * 2;
                F.position.x = G.x + Math.sin(O) * _, F.position.z = G.z + Math.cos(O) * _, F.position.y = m.current.y, F.lookAt(G);
            }
            if (C.cinematic && p) {
                const T = u.current / D;
                if (p.trajectory.totalFrames > 1) {
                    const G = Math.floor(T * p.trajectory.totalFrames), _ = Math.min(G, p.trajectory.totalFrames - 1);
                    $.getState().frame !== _ && $.getState().setFrame(_);
                }
                const z = Math.sin(T * Math.PI);
                $.getState().setBondCutoff(Math.max(0, z * 2.5)), $.getState().setAtomScale(.85 + z * .15);
            }
            u.current >= D && (P.current = !1, j(!1), (async ()=>{
                try {
                    await r.current.flush();
                    try {
                        a.current.finalize();
                    } catch (z) {
                        if (z?.message?.includes("colorSpace") || z?.message?.includes("null")) console.warn("[ExportManager] finalize() colorSpace fallback — salvaging buffer", z);
                        else throw z;
                    }
                    let T = !1;
                    if (C.fileStream) await C.fileStream.close(), T = !0;
                    else {
                        const z = a.current.target.buffer, G = new Blob([
                            z
                        ], {
                            type: "video/mp4"
                        }), _ = C.baseName || "glimPSE", O = b.current;
                        if (O === "mp4") x.current && x.current.length > 1 ? x.current(!0, G, `${_}.mp4`) : (_a(G, `${_}.mp4`), x.current && x.current(!0)), T = !0;
                        else if (O === "gif") try {
                            const R = await yg(G, 30);
                            x.current && x.current.length > 1 ? x.current(!0, R, `${_}.gif`) : (_a(R, `${_}.gif`), x.current && x.current(!0)), T = !0;
                        } catch (R) {
                            console.error("GIF conversion failed, downloading pristine MP4 fallback:", R), x.current && x.current.length > 1 ? x.current(!0, G, `${_}.mp4`) : (_a(G, `${_}.mp4`), x.current && x.current(!0)), T = !0;
                        }
                    }
                    T || x.current && x.current(!1);
                } catch (T) {
                    console.error("Finalization failed", T), x.current && x.current(!1);
                } finally{
                    if (r.current = null, a.current = null, m.current && p) {
                        const { min: T, max: z } = p.trajectory.globalBounds, G = new Ae((T[0] + z[0]) / 2, (T[1] + z[1]) / 2, (T[2] + z[2]) / 2);
                        F.position.copy(m.current), F.lookAt(G), m.current = null;
                    }
                    h.current && (w.setSize(h.current.width, h.current.height, !1), F instanceof Xn && (F.aspect = h.current.aspect, F.updateProjectionMatrix()), h.current = null), v.current && w.setPixelRatio(v.current), E.current && ($.getState().setBondCutoff(E.current.bondCutoff), $.getState().setAtomScale(E.current.atomScale), $.getState().setFrame(E.current.frame), E.current = null), b.current = null, g();
                }
            })());
        }, 2), null;
    }
    function vg() {
        const { gl: r, scene: a, camera: s, size: u } = ze(), d = $((R)=>R.exportRequest), m = $((R)=>R.clearExportRequest), h = $((R)=>R.file), v = $((R)=>R.frame), b = y.useRef(!1), [x, g] = y.useState(!1), p = y.useRef(null), P = y.useRef(null), j = y.useRef(null), E = y.useRef(null), w = y.useRef(null), F = y.useRef(0), C = y.useRef(0), S = y.useRef(1), D = y.useRef(null), k = y.useRef(null), T = y.useRef(null), z = y.useCallback(()=>{
            const R = d;
            if (!R) return;
            const K = u.width, X = u.height, Q = R.resolution?.width || K, Z = R.resolution?.height || X, te = R.format || "png", V = s.aspect;
            r.setSize(Q, Z, !1), s instanceof Xn && (s.aspect = Q / Z, s.updateProjectionMatrix());
            const ae = r.getClearAlpha();
            R.transparent ? r.setClearColor(0, 0) : r.setClearColor(new cs("#10131a"), 1);
            const pe = r.getRenderTarget();
            r.setRenderTarget(null), r.render(a, s);
            const U = `image/${te}`, J = te === "png" ? void 0 : 1, ee = te === "jpeg" ? "jpg" : te, ne = `${R.baseName || "glimPSE-export"}-frame${v + 1}.${ee}`;
            r.domElement.toBlob((ue)=>{
                ue ? R.onComplete && R.onComplete.length > 1 ? R.onComplete(!0, ue, ne) : (_a(ue, ne), R.onComplete && R.onComplete(!0)) : (console.error("[ExportManager] toBlob returned null — canvas may be tainted or context lost"), R.onComplete && R.onComplete(!1)), m();
            }, U, J), r.setRenderTarget(pe), r.setSize(K, X, !1), s instanceof Xn && (s.aspect = V, s.updateProjectionMatrix()), r.setClearAlpha(ae);
        }, [
            d,
            r,
            a,
            s,
            u,
            m,
            v
        ]), G = y.useCallback(async ()=>{
            const R = d;
            if (!R || b.current) return;
            const K = R.format === "gif" ? "gif" : "mp4", X = R.resolution?.width || 1920, Q = R.resolution?.height || 1080, Z = 60, te = R.durationSeconds || 5;
            if (typeof VideoEncoder > "u") {
                console.error("WebCodecs VideoEncoder not available in this browser."), R.onComplete && R.onComplete(!1), m();
                return;
            }
            if (p.current = K, P.current = R.onComplete || null, w.current = R, R.orbit && (D.current = s.position.clone()), R.cinematic) {
                const V = $.getState();
                T.current = {
                    bondCutoff: V.bondCutoff,
                    atomScale: V.atomScale,
                    frame: V.frame
                };
            }
            k.current = {
                width: u.width,
                height: u.height,
                aspect: s.aspect
            }, S.current = r.getPixelRatio(), r.setPixelRatio(1), r.setSize(X, Q, !1), s instanceof Xn && (s.aspect = X / Q, s.updateProjectionMatrix());
            try {
                const V = await Ao(()=>import("./mp4-muxer-CR73arlb.js"), [], import.meta.url), ae = V.Muxer || V.default?.Muxer || V.default, pe = V.ArrayBufferTarget || V.default?.ArrayBufferTarget, U = V.FileSystemWritableFileStreamTarget || V.default?.FileSystemWritableFileStreamTarget, J = R.fileStream ? new U(R.fileStream) : new pe, ee = new ae({
                    target: J,
                    video: {
                        codec: "avc",
                        width: X,
                        height: Q
                    },
                    fastStart: R.fileStream ? !1 : "in-memory"
                });
                E.current = ee;
                let ne = !1;
                const ue = new VideoEncoder({
                    output: (he, Me)=>{
                        ne || (ne = !0, Me?.decoderConfig ? Me.decoderConfig.colorSpace || (Me = {
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
                        }), E.current && E.current.addVideoChunk(he, Me);
                    },
                    error: (he)=>console.error("VideoEncoder error:", he)
                });
                ue.configure({
                    codec: "avc1.640028",
                    width: X,
                    height: Q,
                    bitrate: 8e7,
                    framerate: Z,
                    hardwareAcceleration: "prefer-hardware"
                }), j.current = ue, F.current = Z * te, C.current = 0, b.current = !0, g(!0);
            } catch (V) {
                console.error("Failed to init WebCodecs video:", V), P.current && P.current(!1), b.current = !1, r.setPixelRatio(S.current), m();
            }
        }, [
            d,
            s,
            r,
            u,
            m
        ]), _ = y.useRef(z);
        _.current = z;
        const O = y.useRef(G);
        return O.current = G, y.useEffect(()=>{
            !d || !d.type || (d.type === "image" && _.current(), d.type === "video" && O.current());
        }, [
            d
        ]), x ? l.jsx(xg, {
            encoderRef: j,
            muxerRef: E,
            requestRef: w,
            frameCount: C,
            totalFrames: F,
            originalCameraPosition: D,
            originalSize: k,
            originalPixelRatio: S,
            outputFormat: p,
            onCompleteRef: P,
            clearExportRequest: m,
            file: h,
            isRecording: b,
            setIsCapturing: g,
            originalStoreState: T
        }) : null;
    }
    function _a(r, a) {
        const s = URL.createObjectURL(r), u = document.createElement("a");
        u.download = a, u.href = s, document.body.appendChild(u), u.click(), document.body.removeChild(u), setTimeout(()=>URL.revokeObjectURL(s), 1e4);
    }
    const Sg = ()=>l.jsx("svg", {
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
        }), Cg = ()=>l.jsx("svg", {
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "currentColor",
            children: l.jsx("path", {
                d: "M8 5v14l11-7L8 5z"
            })
        }), wg = ()=>l.jsxs("svg", {
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
        }), kg = ()=>l.jsx("svg", {
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
        }), Pg = ()=>l.jsx("svg", {
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
        }), Mg = ()=>l.jsx("svg", {
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
        }), Fg = ()=>l.jsxs("svg", {
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
        }), Tg = ()=>l.jsxs("svg", {
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
                    d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
                }),
                l.jsx("circle", {
                    cx: "12",
                    cy: "13",
                    r: "3"
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
                    d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
                }),
                l.jsx("path", {
                    d: "M3 3v5h5"
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
    function Ng(r, a) {
        if (r.startsWith("palette:")) {
            const [, s] = r.split(":");
            return fb(s ?? a);
        }
        return ls[r] ?? ls.void;
    }
    function Bg({ top: r, bottom: a, style: s = "linear" }) {
        const { scene: u } = ze();
        return y.useEffect(()=>{
            const d = document.createElement("canvas"), m = 1024;
            d.width = m, d.height = m;
            const h = d.getContext("2d");
            let v;
            s === "radial" ? (v = h.createRadialGradient(m / 2, m / 2, 0, m / 2, m / 2, m / 1.5), v.addColorStop(0, r), v.addColorStop(1, a)) : s === "spotlight" ? (v = h.createRadialGradient(m / 2, 0, 0, m / 2, 0, m / 1.2), v.addColorStop(0, r), v.addColorStop(1, a)) : (v = h.createLinearGradient(0, 0, 0, m), v.addColorStop(0, r), v.addColorStop(1, a)), h.fillStyle = v, h.fillRect(0, 0, m, m);
            const b = new nf(d);
            return b.mapping = wh, u.background = b, u.fog = new kh(a, .0015), ()=>{
                b.dispose(), u.background = null, u.fog = null;
            };
        }, [
            u,
            r,
            a,
            s
        ]), null;
    }
    class Lg extends y.Component {
        state = {
            error: null
        };
        static getDerivedStateFromError(a) {
            return {
                error: a.message
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
    function Og(r) {
        const [a, s] = y.useState(!1);
        return y.useEffect(()=>{
            const u = window.matchMedia(r);
            u.matches !== a && s(u.matches);
            const d = ()=>s(u.matches);
            return u.addEventListener("change", d), ()=>u.removeEventListener("change", d);
        }, [
            a,
            r
        ]), a;
    }
    function Ug({ fileId: r, center: a, distance: s }) {
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
            r && (u.position.set(a[0], a[1], a[2] + s), u.lookAt(a[0], a[1], a[2]), u.updateProjectionMatrix(), d && d.target && (d.target.set(a[0], a[1], a[2]), d.update()), $.getState().setCameraState(u.position.toArray(), a));
        }, [
            r,
            a,
            s,
            u,
            d
        ]), y.useEffect(()=>$.subscribe((v)=>v.cameraPreset, (v)=>{
                const { cameraPosition: b, cameraTarget: x } = $.getState();
                u.position.set(...b), u.lookAt(...x), u.updateProjectionMatrix(), d && d.target && (d.target.set(...x), d.update());
            }), [
            u,
            d
        ]), null;
    }
    function $g() {
        const r = $((N)=>N.file), a = $((N)=>N.loading), s = $((N)=>N.frame), u = $((N)=>N.playing), d = $((N)=>N.playbackSpeed), m = $((N)=>N.colorMode), h = $((N)=>N.colorProperty), v = $((N)=>N.colormap), b = $((N)=>N.ssao), x = $((N)=>N.bloom), g = $((N)=>N.dof), p = $((N)=>N.dofFocus), P = $((N)=>N.toneMapping), j = $((N)=>N.showCell), E = $((N)=>N.showAxes), w = $((N)=>N.flythroughPreview), F = $((N)=>N.showBonds), C = $((N)=>N.bondCutoff), S = $((N)=>N.renderStyle), D = $((N)=>N.atomScale), k = $((N)=>N.activePanel), T = $((N)=>N.backgroundPreset), z = $((N)=>N.backgroundStyle), G = $((N)=>N.ssaoIntensity), _ = $((N)=>N.showScaleBar), O = $((N)=>N.cameraPreset), R = $((N)=>N.setCameraPreset), K = $((N)=>N.bloomIntensity), X = $((N)=>N.setFrame), Q = $((N)=>N.nextFrame), Z = $((N)=>N.togglePlay), te = $((N)=>N.setActivePanel), V = $((N)=>N.hoveredAtom), ae = $((N)=>N.setHoveredAtom), pe = $((N)=>N.selectedAtoms), U = $((N)=>N.setSelectedAtoms), J = $((N)=>N.hiddenAtomTypes), ee = $((N)=>N.atomTypeScales), [ne, ue] = y.useState(null), he = Og("(max-width: 768px)"), [Me, Ue] = y.useState({
            x: 0,
            y: 0
        });
        y.useEffect(()=>{
            const N = (re)=>Ue({
                    x: re.clientX,
                    y: re.clientY
                });
            return window.addEventListener("mousemove", N), ()=>window.removeEventListener("mousemove", N);
        }, []);
        const { currentState: De, setFrame: kt } = gb(u, {
            frames: r?.trajectory.frames ?? [],
            speed: d,
            targetFPS: 60,
            mdFrameRate: 30,
            onFrame: (N)=>{
                N.frameIndex !== $.getState().frame && $.getState().setFrame(N.frameIndex);
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
            const N = (re)=>{
                re.target.tagName !== "INPUT" && (re.key === " " && (re.preventDefault(), Z()), re.key === "ArrowRight" && Q(), re.key === "ArrowLeft" && $.getState().prevFrame(), re.key === "Escape" && te(null), re.key === "s" && !re.metaKey && !re.ctrlKey && te("style"), re.key === "e" && !re.metaKey && !re.ctrlKey && te("effects"), re.key === "a" && !re.metaKey && !re.ctrlKey && te("analysis"), re.key === "x" && !re.metaKey && !re.ctrlKey && te("export"), re.key === "b" && !re.metaKey && !re.ctrlKey && $.getState().toggleBonds(), re.key === "m" && !re.metaKey && !re.ctrlKey && te("measurement"));
            };
            return window.addEventListener("keydown", N), ()=>window.removeEventListener("keydown", N);
        }, [
            Z,
            Q,
            te
        ]), y.useEffect(()=>{
            const N = new URLSearchParams(window.location.search), re = N.get("s");
            re && $.getState().decodeFromURL(re);
            const Ie = N.get("fly");
            if (Ie) {
                const me = Tf(Ie);
                me && ($.getState().setFlythrough(me), $.getState().setActivePanel("flythrough"));
            }
            const ve = N.get("load");
            ve && !r && (async ()=>{
                try {
                    $.getState().setLoading(!0, 0);
                    const me = await fetch(ve);
                    if (!me.ok) throw new Error(`Failed to fetch ${ve}: ${me.status}`);
                    const He = await me.blob(), ut = ve.split("/").pop() ?? "file.dump", $e = new File([
                        He
                    ], ut), { parseFile: je } = await Ao(async ()=>{
                        const { parseFile: Pt } = await Promise.resolve().then(()=>es);
                        return {
                            parseFile: Pt
                        };
                    }, void 0, import.meta.url), gt = await je($e);
                    if (gt.trajectory) $.getState().setFile({
                        name: ut,
                        size: He.size,
                        trajectory: gt.trajectory,
                        thermo: gt.thermo ?? null,
                        sourceUrl: ve
                    });
                    else throw new Error("No trajectory data found");
                } catch (me) {
                    $.getState().setError(me.message);
                }
            })();
        }, []);
        const Ce = r?.trajectory.frames[s], se = r?.trajectory.totalFrames ?? 0, nt = y.useMemo(()=>r ? (()=>{
                const { min: N, max: re } = r.trajectory.globalBounds, Ie = re[0] - N[0], ve = re[1] - N[1], me = re[2] - N[2];
                return Math.hypot(Ie, ve, me) * 1.4;
            })() : 50, [
            r?.name
        ]), Re = y.useMemo(()=>r ? r.trajectory.globalBounds.min.map((N, re)=>(N + r.trajectory.globalBounds.max[re]) / 2) : [
                0,
                0,
                0
            ], [
            r?.name
        ]), qe = Ce ? Array.from(Ce.properties?.keys() ?? []) : [], lt = Ng(T, v);
        return l.jsxs("div", {
            style: {
                width: "100%",
                minHeight: "100vh",
                height: r ? "100vh" : "auto",
                overflow: r ? "hidden" : "visible",
                background: `linear-gradient(180deg, ${lt.top}, ${lt.bottom})`,
                display: "flex",
                flexDirection: "column"
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
                                        if (r) {
                                            $.getState().clearFile();
                                            const N = new URL(window.location.href);
                                            N.searchParams.delete("sim"), window.history.pushState({}, "", N);
                                        }
                                    },
                                    style: {
                                        display: "flex",
                                        alignItems: "baseline",
                                        gap: 4,
                                        background: "none",
                                        border: "none",
                                        padding: 0,
                                        cursor: r ? "pointer" : "default"
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
                                r && l.jsxs(l.Fragment, {
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
                                            children: r.name
                                        }),
                                        l.jsx("button", {
                                            onClick: ()=>{
                                                $.getState().clearFile();
                                                const N = new URL(window.location.href);
                                                N.searchParams.delete("sim"), window.history.pushState({}, "", N);
                                            },
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
                                            children: l.jsx(Mg, {})
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
                                r?.sourceUrl && l.jsxs("button", {
                                    onClick: ()=>{
                                        const N = $.getState().encodeToURL(), re = `${window.location.origin}${window.location.pathname}?load=${encodeURIComponent(r.sourceUrl)}&s=${encodeURIComponent(N)}`;
                                        navigator.clipboard.writeText(re), alert("View copied to clipboard! Anyone with this link can view the exact state and orientation.");
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
                                        l.jsx(Fg, {}),
                                        "Share"
                                    ]
                                }),
                                !r && l.jsx("button", {
                                    onClick: ()=>{
                                        const N = new URL(window.location.href);
                                        N.searchParams.set("sim", "au_nanocluster"), window.history.pushState({}, "", N), window.dispatchEvent(new PopStateEvent("popstate"));
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
                        position: "relative"
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                position: r ? "absolute" : "fixed",
                                inset: 0,
                                top: r ? 0 : 56,
                                zIndex: 0
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
                                        l.jsx(vg, {}),
                                        l.jsx(Bg, {
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
                                        l.jsx(Ug, {
                                            fileId: r?.name,
                                            center: Re,
                                            distance: nt
                                        }),
                                        l.jsx(U0, {
                                            makeDefault: !0,
                                            enabled: !w,
                                            target: Re,
                                            enableDamping: !0,
                                            dampingFactor: .08,
                                            rotateSpeed: .5,
                                            panSpeed: .4,
                                            zoomSpeed: .8,
                                            onEnd: (N)=>{
                                                N?.target?.object && N?.target?.target && $.getState().setCameraState(N.target.object.position.toArray(), N.target.target.toArray());
                                            }
                                        }),
                                        Ce && l.jsxs(l.Fragment, {
                                            children: [
                                                l.jsx(pb, {
                                                    frame: r.trajectory.frames[De.frameIndex],
                                                    nextFrame: De.isInterpolating ? r.trajectory.frames[De.nextFrameIndex] : void 0,
                                                    interpolationFactor: De.isInterpolating ? De.interpolationFactor : 0,
                                                    colorMode: m,
                                                    colorProperty: h ?? void 0,
                                                    colormap: v,
                                                    scale: D,
                                                    renderStyle: S,
                                                    onSpatialHash: ue,
                                                    highlightedAtoms: new Set(pe),
                                                    hiddenAtomTypes: J,
                                                    atomTypeScales: ee,
                                                    botanicalMode: S === "botanical"
                                                }),
                                                F && l.jsx(hb, {
                                                    frame: Ce,
                                                    nextFrame: De.isInterpolating ? r.trajectory.frames[De.nextFrameIndex] : void 0,
                                                    interpolationFactor: De.isInterpolating ? De.interpolationFactor : 0,
                                                    maxBondLength: C,
                                                    renderStyle: S,
                                                    colormap: v,
                                                    colorMode: m,
                                                    radius: .12,
                                                    opacity: .85,
                                                    botanicalMode: S === "botanical"
                                                }),
                                                j && l.jsx(yb, {
                                                    bounds: Ce.boxBounds,
                                                    color: "#1e3050",
                                                    opacity: .3
                                                })
                                            ]
                                        }),
                                        Ce && ne && l.jsx(vb, {
                                            frame: Ce,
                                            spatialHash: ne,
                                            enabled: !a,
                                            selectionMode: k === "measurement" ? "measure" : "single",
                                            onHover: ae,
                                            onSelect: U
                                        }),
                                        E && l.jsx(q0, {
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
                                                x && l.jsx(Z0, {
                                                    intensity: K,
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
                                                P !== "none" && l.jsx(eb, {
                                                    mode: P === "aces" ? xd.ACES_FILMIC : xd.REINHARD
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
                                r && Ce && _ && l.jsx(xb, {
                                    frame: Ce,
                                    cameraDistance: nt,
                                    visible: _,
                                    position: "bottom-left"
                                }),
                                r && l.jsx("div", {
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
                                r && l.jsxs("div", {
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
                                        l.jsx(Ta, {
                                            label: "XY",
                                            active: O === "top",
                                            onClick: ()=>R("top"),
                                            title: "Top view (XY plane)"
                                        }),
                                        l.jsx(Ta, {
                                            label: "XZ",
                                            active: O === "side",
                                            onClick: ()=>R("side"),
                                            title: "Side view (XZ plane)"
                                        }),
                                        l.jsx(Ta, {
                                            label: "YZ",
                                            active: O === "front",
                                            onClick: ()=>R("front"),
                                            title: "Front view (YZ plane)"
                                        }),
                                        l.jsx(Ta, {
                                            label: "ISO",
                                            active: O === "iso",
                                            onClick: ()=>R("iso"),
                                            title: "Isometric view"
                                        })
                                    ]
                                }),
                                r && !k && l.jsx("div", {
                                    style: {
                                        position: "absolute",
                                        bottom: 84,
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
                                                icon: l.jsx(Tg, {}),
                                                label: "Style",
                                                active: k === "style",
                                                onClick: ()=>te("style")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Ag, {}),
                                                label: "Atoms",
                                                active: k === "atoms",
                                                onClick: ()=>te("atoms")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Eg, {}),
                                                label: "Effects",
                                                active: k === "effects",
                                                onClick: ()=>te("effects")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Dg, {}),
                                                label: "Analysis",
                                                active: k === "analysis",
                                                onClick: ()=>te("analysis")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(zg, {}),
                                                label: "Measure",
                                                active: k === "measurement",
                                                onClick: ()=>te("measurement")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Ig, {}),
                                                label: "Export",
                                                active: k === "export",
                                                onClick: ()=>te("export")
                                            }),
                                            l.jsx(In, {
                                                icon: l.jsx(Rg, {}),
                                                label: "Path",
                                                active: k === "flythrough",
                                                onClick: ()=>te("flythrough")
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
                                                icon: l.jsx(_g, {}),
                                                label: "Reset",
                                                onClick: ()=>{
                                                    $.getState().reset();
                                                }
                                            })
                                        ]
                                    })
                                }),
                                Ce && V !== null && l.jsxs("div", {
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
                                                const N = Cr(Ce.types[V]);
                                                return `${N.symbol} — ${N.name}`;
                                            })()
                                        }),
                                        l.jsxs("div", {
                                            style: {
                                                color: "var(--text-muted)"
                                            },
                                            children: [
                                                "Atom #",
                                                Ce.ids?.[V] ?? V + 1,
                                                " · ",
                                                (()=>{
                                                    const N = Cr(Ce.types[V]);
                                                    return `${N.mass.toFixed(2)} u · ${N.role}`;
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
                                                Ce.positions[V * 3].toFixed(2),
                                                l.jsx("br", {}),
                                                "y: ",
                                                Ce.positions[V * 3 + 1].toFixed(2),
                                                l.jsx("br", {}),
                                                "z: ",
                                                Ce.positions[V * 3 + 2].toFixed(2)
                                            ]
                                        }),
                                        Array.from(Ce.properties?.entries() ?? []).slice(0, 3).map(([N, re])=>l.jsxs("div", {
                                                style: {
                                                    color: "var(--text-dim)",
                                                    marginTop: 2
                                                },
                                                children: [
                                                    N,
                                                    ": ",
                                                    re[V].toFixed(3)
                                                ]
                                            }, N))
                                    ]
                                })
                            ]
                        }),
                        k && r && l.jsx("div", {
                            style: {
                                position: "absolute",
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: he ? "100%" : k === "export" || k === "flythrough" ? 360 : 320,
                                borderLeft: "1px solid var(--border-subtle)",
                                background: "var(--bg-surface)",
                                overflowY: "auto",
                                zIndex: 100,
                                animation: "slideInRight 200ms ease-out forwards"
                            },
                            children: l.jsxs(Lg, {
                                children: [
                                    k === "style" && l.jsx(kb, {
                                        availableProperties: qe,
                                        bgPresets: ls
                                    }),
                                    k === "effects" && l.jsx(Fb, {}),
                                    k === "atoms" && l.jsx(tg, {}),
                                    k === "analysis" && l.jsx(Gb, {}),
                                    k === "measurement" && l.jsx(Yb, {}),
                                    k === "export" && l.jsx(Db, {}),
                                    k === "flythrough" && l.jsx(hg, {})
                                ]
                            })
                        }),
                        l.jsx("div", {
                            style: {
                                position: "relative",
                                width: "100%",
                                zIndex: 10,
                                pointerEvents: r ? "none" : "auto"
                            },
                            children: l.jsx(sb, {})
                        })
                    ]
                }),
                r && l.jsxs("div", {
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
                        WebkitBackdropFilter: "blur(12px)",
                        overflowX: "auto",
                        scrollbarWidth: "none"
                    },
                    children: [
                        l.jsxs("div", {
                            style: {
                                display: "flex",
                                gap: 4
                            },
                            children: [
                                l.jsx(Ea, {
                                    onClick: ()=>$.getState().setFrame(0),
                                    title: "First frame",
                                    icon: l.jsx(Sg, {})
                                }),
                                l.jsx(Ea, {
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
                                    children: u ? l.jsx(wg, {}) : l.jsx(Cg, {})
                                }),
                                l.jsx(Ea, {
                                    onClick: Q,
                                    title: "Next [→]",
                                    icon: l.jsx(kg, {})
                                }),
                                l.jsx(Ea, {
                                    onClick: ()=>$.getState().setFrame(se - 1),
                                    title: "Last frame",
                                    icon: l.jsx(Pg, {})
                                })
                            ]
                        }),
                        l.jsx(cb, {
                            thermo: r?.thermo ?? null,
                            totalFrames: se,
                            currentFrame: s,
                            onFrameChange: (N)=>{
                                u && Z(), X(N);
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
                            ].map((N)=>l.jsxs("button", {
                                    onClick: ()=>$.getState().setPlaybackSpeed(N),
                                    style: {
                                        padding: "6px 8px",
                                        minWidth: 36,
                                        fontSize: "var(--fs-xs)",
                                        fontFamily: "var(--font-mono)",
                                        fontWeight: d === N ? 500 : 400,
                                        color: d === N ? "var(--accent)" : "var(--text-muted)",
                                        background: d === N ? "var(--accent-soft)" : "transparent",
                                        border: `1px solid ${d === N ? "var(--accent)" : "var(--border-default)"}`,
                                        borderRadius: "var(--radius-sm)",
                                        cursor: "pointer",
                                        transition: "all 100ms ease-out"
                                    },
                                    children: [
                                        N,
                                        "×"
                                    ]
                                }, N))
                        })
                    ]
                })
            ]
        });
    }
    function In({ icon: r, label: a, active: s, onClick: u }) {
        return l.jsxs("button", {
            onClick: u,
            title: a,
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
                r,
                l.jsx("span", {
                    children: a
                })
            ]
        });
    }
    function Ta({ label: r, active: a, onClick: s, title: u }) {
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
                color: a ? "white" : "rgba(255,255,255,0.7)",
                background: a ? "var(--accent)" : "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                transition: "all 100ms ease-out"
            },
            onMouseEnter: (d)=>{
                a || (d.currentTarget.style.background = "rgba(255,255,255,0.1)");
            },
            onMouseLeave: (d)=>{
                a || (d.currentTarget.style.background = "rgba(0,0,0,0.4)");
            },
            children: r
        });
    }
    function Ea({ onClick: r, title: a, icon: s }) {
        return l.jsx("button", {
            onClick: r,
            title: a,
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
    Vg = Object.freeze(Object.defineProperty({
        __proto__: null,
        default: $g
    }, Symbol.toStringTag, {
        value: "Module"
    }));
})();
export { Vg as A, ns as E, Cr as g, ub as h, __tla };
