const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./emulate-BDTSyNlg.js","./vendor-react-OtmnRBTN.js","./App-CAGJ73pY.js","./vendor-postprocess-WgxrzeKQ.js","./vendor-three-D2ym6CsH.js","./App-CNCQb1kB.css"])))=>i.map(i=>d[i]);
import { r as Wm, g as Vm, R as Ar, a as V1, b as M, j as ne, c as Xm } from "./vendor-react-OtmnRBTN.js";
import { W as Ym, R as co, O as Di, P as la, S as fs, a as xc, V as X1, b as Y1, B as q1, C as Z1, L as Rl, c as Yl, N as qm, A as Q1, d as $h, e as Fr, f as Oi, g as oo, U as Il, h as Ft, i as ke, j as K1, T as $1, D as xf, k as _f, l as wr, M as Xn, I as J1, m as Jh, Q as Vn, n as Ya, o as qa, p as Al, q as fo, r as Zm, H as Qn, F as Br, s as no, t as Hn, u as ey, v as ty, w as Qm, x as ny, y as Km, z as ry, E as ql, G as Yn, J as iy, K as Ef, X as ay, Y as oy, Z as Ii, _ as sy, $ as Li, a0 as Fl, a1 as ly, a2 as uy, a3 as Zl, a4 as cy, a5 as Gr, a6 as $m, a7 as Ql, a8 as fy, a9 as dy, aa as Jm, ab as Ai, ac as Dl, ad as hy, ae as py, af as my, ag as gy, ah as vy, ai as yy, aj as by, ak as ep, al as El, am as wy, an as Sy, ao as xy, ap as _y, aq as Ey, ar as Ml, as as My, at as eg, au as tg, av as ng, aw as nf, ax as Cy, ay as Ty, az as Py, aA as ky, aB as Ry, aC as Iy, aD as Ay, aE as rg, aF as ig } from "./vendor-three-D2ym6CsH.js";
import { E as Fy, R as Dy, N as Uy, D as Oy, a as tp, b as Ly, S as zy, c as Ny, M as jy, P as By, B as Gy, T as Hy, V as Wy } from "./vendor-postprocess-WgxrzeKQ.js";
let _M, AM, IM, kM, vM, OM, CM, RM, MM, LM, Yy, Et, Wt, Df, FM, DM, bM, xM, gM, GM, BM, TM, PM, NM, zM, yM, wM, cn, UM;
let __tla = (async ()=>{
    let Vy, Xy, np;
    Vy = "modulepreload";
    Xy = function(r, e) {
        return new URL(r, e).href;
    };
    np = {};
    Yy = function(e, a, s) {
        let i = Promise.resolve();
        if (a && a.length > 0) {
            let u = function(p) {
                return Promise.all(p.map((v)=>Promise.resolve(v).then((y)=>({
                            status: "fulfilled",
                            value: y
                        }), (y)=>({
                            status: "rejected",
                            reason: y
                        }))));
            };
            const d = document.getElementsByTagName("link"), c = document.querySelector("meta[property=csp-nonce]"), h = c?.nonce || c?.getAttribute("nonce");
            i = u(a.map((p)=>{
                if (p = Xy(p, s), p in np) return;
                np[p] = !0;
                const v = p.endsWith(".css"), y = v ? '[rel="stylesheet"]' : "";
                if (!!s) for(let _ = d.length - 1; _ >= 0; _--){
                    const x = d[_];
                    if (x.href === p && (!v || x.rel === "stylesheet")) return;
                }
                else if (document.querySelector(`link[href="${p}"]${y}`)) return;
                const S = document.createElement("link");
                if (S.rel = v ? "stylesheet" : Vy, v || (S.as = "script"), S.crossOrigin = "", S.href = p, h && S.setAttribute("nonce", h), document.head.appendChild(S), v) return new Promise((_, x)=>{
                    S.addEventListener("load", _), S.addEventListener("error", ()=>x(new Error(`Unable to preload CSS for ${p}`)));
                });
            }));
        }
        function o(u) {
            const d = new Event("vite:preloadError", {
                cancelable: !0
            });
            if (d.payload = u, window.dispatchEvent(d), !d.defaultPrevented) throw u;
        }
        return i.then((u)=>{
            for (const d of u || [])d.status === "rejected" && o(d.reason);
            return e().catch(o);
        });
    };
    var _c = {
        exports: {}
    }, Ec = {}, Mc = {
        exports: {}
    }, Cc = {};
    var rp;
    function qy() {
        if (rp) return Cc;
        rp = 1;
        var r = Wm();
        function e(v, y) {
            return v === y && (v !== 0 || 1 / v === 1 / y) || v !== v && y !== y;
        }
        var a = typeof Object.is == "function" ? Object.is : e, s = r.useState, i = r.useEffect, o = r.useLayoutEffect, u = r.useDebugValue;
        function d(v, y) {
            var b = y(), S = s({
                inst: {
                    value: b,
                    getSnapshot: y
                }
            }), _ = S[0].inst, x = S[1];
            return o(function() {
                _.value = b, _.getSnapshot = y, c(_) && x({
                    inst: _
                });
            }, [
                v,
                b,
                y
            ]), i(function() {
                return c(_) && x({
                    inst: _
                }), v(function() {
                    c(_) && x({
                        inst: _
                    });
                });
            }, [
                v
            ]), u(b), b;
        }
        function c(v) {
            var y = v.getSnapshot;
            v = v.value;
            try {
                var b = y();
                return !a(v, b);
            } catch  {
                return !0;
            }
        }
        function h(v, y) {
            return y();
        }
        var p = typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u" ? h : d;
        return Cc.useSyncExternalStore = r.useSyncExternalStore !== void 0 ? r.useSyncExternalStore : p, Cc;
    }
    var ip;
    function Zy() {
        return ip || (ip = 1, Mc.exports = qy()), Mc.exports;
    }
    var ap;
    function Qy() {
        if (ap) return Ec;
        ap = 1;
        var r = Wm(), e = Zy();
        function a(h, p) {
            return h === p && (h !== 0 || 1 / h === 1 / p) || h !== h && p !== p;
        }
        var s = typeof Object.is == "function" ? Object.is : a, i = e.useSyncExternalStore, o = r.useRef, u = r.useEffect, d = r.useMemo, c = r.useDebugValue;
        return Ec.useSyncExternalStoreWithSelector = function(h, p, v, y, b) {
            var S = o(null);
            if (S.current === null) {
                var _ = {
                    hasValue: !1,
                    value: null
                };
                S.current = _;
            } else _ = S.current;
            S = d(function() {
                function k(R) {
                    if (!T) {
                        if (T = !0, A = R, R = y(R), b !== void 0 && _.hasValue) {
                            var N = _.value;
                            if (b(N, R)) return U = N;
                        }
                        return U = R;
                    }
                    if (N = U, s(A, R)) return N;
                    var P = y(R);
                    return b !== void 0 && b(N, P) ? (A = R, N) : (A = R, U = P);
                }
                var T = !1, A, U, D = v === void 0 ? null : v;
                return [
                    function() {
                        return k(p());
                    },
                    D === null ? void 0 : function() {
                        return k(D());
                    }
                ];
            }, [
                p,
                v,
                y,
                b
            ]);
            var x = i(h, S[0], S[1]);
            return u(function() {
                _.hasValue = !0, _.value = x;
            }, [
                x
            ]), c(x), x;
        }, Ec;
    }
    var op;
    function Ky() {
        return op || (op = 1, _c.exports = Qy()), _c.exports;
    }
    var $y = Ky();
    const ag = Vm($y), Jy = {}, sp = (r)=>{
        let e;
        const a = new Set, s = (p, v)=>{
            const y = typeof p == "function" ? p(e) : p;
            if (!Object.is(y, e)) {
                const b = e;
                e = v ?? (typeof y != "object" || y === null) ? y : Object.assign({}, e, y), a.forEach((S)=>S(e, b));
            }
        }, i = ()=>e, c = {
            setState: s,
            getState: i,
            getInitialState: ()=>h,
            subscribe: (p)=>(a.add(p), ()=>a.delete(p)),
            destroy: ()=>{
                (Jy ? "production" : void 0) !== "production" && console.warn("[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."), a.clear();
            }
        }, h = e = r(s, i, c);
        return c;
    }, Mf = (r)=>r ? sp(r) : sp, { useDebugValue: eb } = Ar, { useSyncExternalStoreWithSelector: tb } = ag, nb = (r)=>r;
    function rb(r, e = nb, a) {
        const s = tb(r.subscribe, r.getState, r.getServerState || r.getInitialState, e, a);
        return eb(s), s;
    }
    const lp = (r, e)=>{
        const a = Mf(r), s = (i, o = e)=>rb(a, i, o);
        return Object.assign(s, a), s;
    }, og = (r, e)=>r ? lp(r, e) : lp, ib = (r)=>typeof r == "object" && typeof r.then == "function", oa = [];
    function sg(r, e, a = (s, i)=>s === i) {
        if (r === e) return !0;
        if (!r || !e) return !1;
        const s = r.length;
        if (e.length !== s) return !1;
        for(let i = 0; i < s; i++)if (!a(r[i], e[i])) return !1;
        return !0;
    }
    function lg(r, e = null, a = !1, s = {}) {
        e === null && (e = [
            r
        ]);
        for (const o of oa)if (sg(e, o.keys, o.equal)) {
            if (a) return;
            if (Object.prototype.hasOwnProperty.call(o, "error")) throw o.error;
            if (Object.prototype.hasOwnProperty.call(o, "response")) return s.lifespan && s.lifespan > 0 && (o.timeout && clearTimeout(o.timeout), o.timeout = setTimeout(o.remove, s.lifespan)), o.response;
            if (!a) throw o.promise;
        }
        const i = {
            keys: e,
            equal: s.equal,
            remove: ()=>{
                const o = oa.indexOf(i);
                o !== -1 && oa.splice(o, 1);
            },
            promise: (ib(r) ? r : r(...e)).then((o)=>{
                i.response = o, s.lifespan && s.lifespan > 0 && (i.timeout = setTimeout(i.remove, s.lifespan));
            }).catch((o)=>i.error = o)
        };
        if (oa.push(i), !a) throw i.promise;
    }
    const Cf = (r, e, a)=>lg(r, e, !1, a), ab = (r, e, a)=>void lg(r, e, !0, a), ob = (r)=>{
        if (r === void 0 || r.length === 0) oa.splice(0, oa.length);
        else {
            const e = oa.find((a)=>sg(r, a.keys, a.equal));
            e && e.remove();
        }
    };
    var rf = V1();
    const sb = Vm(rf);
    function Tf(r, e, a) {
        if (!r) return;
        if (a(r) === !0) return r;
        let s = e ? r.return : r.child;
        for(; s;){
            const i = Tf(s, e, a);
            if (i) return i;
            s = e ? null : s.sibling;
        }
    }
    function ug(r) {
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
    const Pf = ug(M.createContext(null));
    class cg extends M.Component {
        render() {
            return M.createElement(Pf.Provider, {
                value: this._reactInternals
            }, this.props.children);
        }
    }
    function fg() {
        const r = M.useContext(Pf);
        if (r === null) throw new Error("its-fine: useFiber must be called within a <FiberProvider />!");
        const e = M.useId();
        return M.useMemo(()=>{
            for (const a of [
                r,
                r?.alternate
            ]){
                if (!a) continue;
                const s = Tf(a, !1, (i)=>{
                    let o = i.memoizedState;
                    for(; o;){
                        if (o.memoizedState === e) return !0;
                        o = o.next;
                    }
                });
                if (s) return s;
            }
        }, [
            r,
            e
        ]);
    }
    const lb = Symbol.for("react.context"), ub = (r)=>r !== null && typeof r == "object" && "$$typeof" in r && r.$$typeof === lb;
    function cb() {
        const r = fg(), [e] = M.useState(()=>new Map);
        e.clear();
        let a = r;
        for(; a;){
            const s = a.type;
            ub(s) && s !== Pf && !e.has(s) && e.set(s, M.use(ug(s))), a = a.return;
        }
        return e;
    }
    function fb() {
        const r = cb();
        return M.useMemo(()=>Array.from(r.keys()).reduce((e, a)=>(s)=>M.createElement(e, null, M.createElement(a.Provider, {
                        ...s,
                        value: r.get(a)
                    })), (e)=>M.createElement(cg, {
                    ...e
                })), [
            r
        ]);
    }
    function kf(r) {
        let e = r.root;
        for(; e.getState().previousRoot;)e = e.getState().previousRoot;
        return e;
    }
    const dg = (r)=>r && r.isOrthographicCamera, db = (r)=>r && r.hasOwnProperty("current"), hb = (r)=>r != null && (typeof r == "string" || typeof r == "number" || r.isColor), ds = ((r, e)=>typeof window < "u" && (((r = window.document) == null ? void 0 : r.createElement) || ((e = window.navigator) == null ? void 0 : e.product) === "ReactNative"))() ? M.useLayoutEffect : M.useEffect;
    function Rf(r) {
        const e = M.useRef(r);
        return ds(()=>void (e.current = r), [
            r
        ]), e;
    }
    function pb() {
        const r = fg(), e = fb();
        return M.useMemo(()=>({ children: a })=>{
                const i = !!Tf(r, !0, (o)=>o.type === M.StrictMode) ? M.StrictMode : M.Fragment;
                return ne.jsx(i, {
                    children: ne.jsx(e, {
                        children: a
                    })
                });
            }, [
            r,
            e
        ]);
    }
    function mb({ set: r }) {
        return ds(()=>(r(new Promise(()=>null)), ()=>r(!1)), [
            r
        ]), null;
    }
    const gb = ((r)=>(r = class extends M.Component {
            constructor(...a){
                super(...a), this.state = {
                    error: !1
                };
            }
            componentDidCatch(a) {
                this.props.set(a);
            }
            render() {
                return this.state.error ? null : this.props.children;
            }
        }, r.getDerivedStateFromError = ()=>({
                error: !0
            }), r))();
    function hg(r) {
        var e;
        const a = typeof window < "u" ? (e = window.devicePixelRatio) != null ? e : 2 : 1;
        return Array.isArray(r) ? Math.min(Math.max(r[0], a), r[1]) : r;
    }
    function Za(r) {
        var e;
        return (e = r.__r3f) == null ? void 0 : e.root.getState();
    }
    const qt = {
        obj: (r)=>r === Object(r) && !qt.arr(r) && typeof r != "function",
        fun: (r)=>typeof r == "function",
        str: (r)=>typeof r == "string",
        num: (r)=>typeof r == "number",
        boo: (r)=>typeof r == "boolean",
        und: (r)=>r === void 0,
        nul: (r)=>r === null,
        arr: (r)=>Array.isArray(r),
        equ (r, e, { arrays: a = "shallow", objects: s = "reference", strict: i = !0 } = {}) {
            if (typeof r != typeof e || !!r != !!e) return !1;
            if (qt.str(r) || qt.num(r) || qt.boo(r)) return r === e;
            const o = qt.obj(r);
            if (o && s === "reference") return r === e;
            const u = qt.arr(r);
            if (u && a === "reference") return r === e;
            if ((u || o) && r === e) return !0;
            let d;
            for(d in r)if (!(d in e)) return !1;
            if (o && a === "shallow" && s === "shallow") {
                for(d in i ? e : r)if (!qt.equ(r[d], e[d], {
                    strict: i,
                    objects: "reference"
                })) return !1;
            } else for(d in i ? e : r)if (r[d] !== e[d]) return !1;
            if (qt.und(d)) {
                if (u && r.length === 0 && e.length === 0 || o && Object.keys(r).length === 0 && Object.keys(e).length === 0) return !0;
                if (r !== e) return !1;
            }
            return !0;
        }
    };
    function vb(r) {
        const e = {
            nodes: {},
            materials: {},
            meshes: {}
        };
        return r && r.traverse((a)=>{
            a.name && (e.nodes[a.name] = a), a.material && !e.materials[a.material.name] && (e.materials[a.material.name] = a.material), a.isMesh && !e.meshes[a.name] && (e.meshes[a.name] = a);
        }), e;
    }
    function yb(r) {
        r.type !== "Scene" && (r.dispose == null || r.dispose());
        for(const e in r){
            const a = r[e];
            a?.type !== "Scene" && (a == null || a.dispose == null || a.dispose());
        }
    }
    const pg = [
        "children",
        "key",
        "ref"
    ];
    function bb(r) {
        const e = {};
        for(const a in r)pg.includes(a) || (e[a] = r[a]);
        return e;
    }
    function Ul(r, e, a, s) {
        const i = r;
        let o = i?.__r3f;
        return o || (o = {
            root: e,
            type: a,
            parent: null,
            children: [],
            props: bb(s),
            object: i,
            eventCount: 0,
            handlers: {},
            isHidden: !1
        }, i && (i.__r3f = o)), o;
    }
    function us(r, e) {
        if (!e.includes("-")) return {
            root: r,
            key: e,
            target: r[e]
        };
        if (e in r) return {
            root: r,
            key: e,
            target: r[e]
        };
        let a = r;
        const s = e.split("-");
        for (const i of s){
            if (typeof a != "object" || a === null) {
                if (a !== void 0) {
                    const o = s.slice(s.indexOf(i)).join("-");
                    return {
                        root: a,
                        key: o,
                        target: void 0
                    };
                }
                return {
                    root: r,
                    key: e,
                    target: void 0
                };
            }
            e = i, r = a, a = a[e];
        }
        return {
            root: r,
            key: e,
            target: a
        };
    }
    const up = /-\d+$/;
    function Ol(r, e) {
        if (qt.str(e.props.attach)) {
            if (up.test(e.props.attach)) {
                const i = e.props.attach.replace(up, ""), { root: o, key: u } = us(r.object, i);
                Array.isArray(o[u]) || (o[u] = []);
            }
            const { root: a, key: s } = us(r.object, e.props.attach);
            e.previousAttach = a[s], a[s] = e.object;
        } else qt.fun(e.props.attach) && (e.previousAttach = e.props.attach(r.object, e.object));
    }
    function Ll(r, e) {
        if (qt.str(e.props.attach)) {
            const { root: a, key: s } = us(r.object, e.props.attach), i = e.previousAttach;
            i === void 0 ? delete a[s] : a[s] = i;
        } else e.previousAttach == null || e.previousAttach(r.object, e.object);
        delete e.previousAttach;
    }
    const af = [
        ...pg,
        "args",
        "dispose",
        "attach",
        "object",
        "onUpdate",
        "dispose"
    ], cp = new Map;
    function wb(r) {
        let e = cp.get(r.constructor);
        try {
            e || (e = new r.constructor, cp.set(r.constructor, e));
        } catch  {}
        return e;
    }
    function Sb(r, e) {
        const a = {};
        for(const s in e)if (!af.includes(s) && !qt.equ(e[s], r.props[s])) {
            a[s] = e[s];
            for(const i in e)i.startsWith(`${s}-`) && (a[i] = e[i]);
        }
        for(const s in r.props){
            if (af.includes(s) || e.hasOwnProperty(s)) continue;
            const { root: i, key: o } = us(r.object, s);
            if (i.constructor && i.constructor.length === 0) {
                const u = wb(i);
                qt.und(u) || (a[o] = u[o]);
            } else a[o] = 0;
        }
        return a;
    }
    const xb = [
        "map",
        "emissiveMap",
        "sheenColorMap",
        "specularColorMap",
        "envMap"
    ], _b = /^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/;
    function jr(r, e) {
        var a;
        const s = r.__r3f, i = s && kf(s).getState(), o = s?.eventCount;
        for(const d in e){
            let c = e[d];
            if (af.includes(d)) continue;
            if (s && _b.test(d)) {
                typeof c == "function" ? s.handlers[d] = c : delete s.handlers[d], s.eventCount = Object.keys(s.handlers).length;
                continue;
            }
            if (c === void 0) continue;
            let { root: h, key: p, target: v } = us(r, d);
            if (v === void 0 && (typeof h != "object" || h === null)) throw Error(`R3F: Cannot set "${d}". Ensure it is an object before setting "${p}".`);
            if (v instanceof $h && c instanceof $h) v.mask = c.mask;
            else if (v instanceof Fr && hb(c)) v.set(c);
            else if (v !== null && typeof v == "object" && typeof v.set == "function" && typeof v.copy == "function" && c != null && c.constructor && v.constructor === c.constructor) v.copy(c);
            else if (v !== null && typeof v == "object" && typeof v.set == "function" && Array.isArray(c)) typeof v.fromArray == "function" ? v.fromArray(c) : v.set(...c);
            else if (v !== null && typeof v == "object" && typeof v.set == "function" && typeof c == "number") typeof v.setScalar == "function" ? v.setScalar(c) : v.set(c);
            else if (h instanceof Oi && p === "uniforms" && qt.obj(c)) {
                qt.obj(h.uniforms) || (h.uniforms = {});
                const y = h.uniforms, b = c;
                for(const S in b){
                    const _ = b[S], x = y[S];
                    x ? Object.assign(x, _) : y[S] = {
                        ..._
                    };
                }
            } else {
                var u;
                h[p] = c, i && !i.linear && xb.includes(p) && (u = h[p]) != null && u.isTexture && h[p].format === oo && h[p].type === Il && (h[p].colorSpace = Yl);
            }
        }
        if (s != null && s.parent && i != null && i.internal && (a = s.object) != null && a.isObject3D && o !== s.eventCount) {
            const d = s.object, c = i.internal.interaction.indexOf(d);
            c > -1 && i.internal.interaction.splice(c, 1), s.eventCount && d.raycast !== null && i.internal.interaction.push(d);
        }
        return s && s.props.attach === void 0 && (s.object.isBufferGeometry ? s.props.attach = "geometry" : s.object.isMaterial && (s.props.attach = "material")), s && ho(s), r;
    }
    function ho(r) {
        var e;
        if (!r.parent) return;
        r.props.onUpdate == null || r.props.onUpdate(r.object);
        const a = (e = r.root) == null || e.getState == null ? void 0 : e.getState();
        a && a.internal.frames === 0 && a.invalidate();
    }
    function mg(r, e) {
        r.manual || (dg(r) ? (r.left = e.width / -2, r.right = e.width / 2, r.top = e.height / 2, r.bottom = e.height / -2) : r.aspect = e.width / e.height, r.updateProjectionMatrix());
    }
    const Zn = (r)=>r?.isObject3D;
    function ns(r) {
        return (r.eventObject || r.object).uuid + "/" + r.index + r.instanceId;
    }
    function gg(r, e, a, s) {
        const i = a.get(e);
        i && (a.delete(e), a.size === 0 && (r.delete(s), i.target.releasePointerCapture(s)));
    }
    function Eb(r, e, a) {
        const { internal: s } = r.getState();
        for(let i = 0; i < s.interaction.length; i++)s.interaction[i] === e && (s.interaction[i] = a);
        for(let i = 0; i < s.initialHits.length; i++)s.initialHits[i] === e && (s.initialHits[i] = a);
        s.hovered.forEach((i, o)=>{
            if (i.eventObject === e || i.object === e) {
                s.hovered.delete(o);
                const u = {
                    ...i,
                    eventObject: i.eventObject === e ? a : i.eventObject,
                    object: i.object === e ? a : i.object
                };
                s.hovered.set(ns(u), u);
            }
        }), s.capturedMap.forEach((i)=>{
            const o = i.get(e);
            o && (i.delete(e), i.set(a, o));
        });
    }
    function Mb(r, e) {
        const { internal: a } = r.getState();
        a.interaction = a.interaction.filter((s)=>s !== e), a.initialHits = a.initialHits.filter((s)=>s !== e), a.hovered.forEach((s, i)=>{
            (s.eventObject === e || s.object === e) && a.hovered.delete(i);
        }), a.capturedMap.forEach((s, i)=>{
            gg(a.capturedMap, e, s, i);
        });
    }
    function Cb(r) {
        function e(c) {
            const { internal: h } = r.getState(), p = c.offsetX - h.initialClick[0], v = c.offsetY - h.initialClick[1];
            return Math.round(Math.sqrt(p * p + v * v));
        }
        function a(c) {
            return c.filter((h)=>[
                    "Move",
                    "Over",
                    "Enter",
                    "Out",
                    "Leave"
                ].some((p)=>{
                    var v;
                    return (v = h.__r3f) == null ? void 0 : v.handlers["onPointer" + p];
                }));
        }
        function s(c, h) {
            const p = r.getState(), v = new Set, y = [], b = h ? h(p.internal.interaction) : p.internal.interaction;
            for(let k = 0; k < b.length; k++){
                const T = Za(b[k]);
                T && (T.raycaster.camera = void 0);
            }
            p.previousRoot || p.events.compute == null || p.events.compute(c, p);
            function S(k) {
                const T = Za(k);
                if (!T || !T.events.enabled || T.raycaster.camera === null) return [];
                if (T.raycaster.camera === void 0) {
                    var A;
                    T.events.compute == null || T.events.compute(c, T, (A = T.previousRoot) == null ? void 0 : A.getState()), T.raycaster.camera === void 0 && (T.raycaster.camera = null);
                }
                return T.raycaster.camera ? T.raycaster.intersectObject(k, !0) : [];
            }
            let _ = b.flatMap(S).sort((k, T)=>{
                const A = Za(k.object), U = Za(T.object);
                return !A || !U ? k.distance - T.distance : U.events.priority - A.events.priority || k.distance - T.distance;
            }).filter((k)=>{
                const T = ns(k);
                return v.has(T) ? !1 : (v.add(T), !0);
            });
            p.events.filter && (_ = p.events.filter(_, p));
            for (const k of _){
                let T = k.object;
                for(; T;){
                    var x;
                    (x = T.__r3f) != null && x.eventCount && y.push({
                        ...k,
                        eventObject: T
                    }), T = T.parent;
                }
            }
            if ("pointerId" in c && p.internal.capturedMap.has(c.pointerId)) for (let k of p.internal.capturedMap.get(c.pointerId).values())v.has(ns(k.intersection)) || y.push(k.intersection);
            return y;
        }
        function i(c, h, p, v) {
            if (c.length) {
                const y = {
                    stopped: !1
                };
                for (const b of c){
                    let S = Za(b.object);
                    if (S || b.object.traverseAncestors((_)=>{
                        const x = Za(_);
                        if (x) return S = x, !1;
                    }), S) {
                        const { raycaster: _, pointer: x, camera: k, internal: T } = S, A = new ke(x.x, x.y, 0).unproject(k), U = (I)=>{
                            var F, Y;
                            return (F = (Y = T.capturedMap.get(I)) == null ? void 0 : Y.has(b.eventObject)) != null ? F : !1;
                        }, D = (I)=>{
                            const F = {
                                intersection: b,
                                target: h.target
                            };
                            T.capturedMap.has(I) ? T.capturedMap.get(I).set(b.eventObject, F) : T.capturedMap.set(I, new Map([
                                [
                                    b.eventObject,
                                    F
                                ]
                            ])), h.target.setPointerCapture(I);
                        }, R = (I)=>{
                            const F = T.capturedMap.get(I);
                            F && gg(T.capturedMap, b.eventObject, F, I);
                        };
                        let N = {};
                        for(let I in h){
                            let F = h[I];
                            typeof F != "function" && (N[I] = F);
                        }
                        let P = {
                            ...b,
                            ...N,
                            pointer: x,
                            intersections: c,
                            stopped: y.stopped,
                            delta: p,
                            unprojectedPoint: A,
                            ray: _.ray,
                            camera: k,
                            stopPropagation () {
                                const I = "pointerId" in h && T.capturedMap.get(h.pointerId);
                                if ((!I || I.has(b.eventObject)) && (P.stopped = y.stopped = !0, T.hovered.size && Array.from(T.hovered.values()).find((F)=>F.eventObject === b.eventObject))) {
                                    const F = c.slice(0, c.indexOf(b));
                                    o([
                                        ...F,
                                        b
                                    ]);
                                }
                            },
                            target: {
                                hasPointerCapture: U,
                                setPointerCapture: D,
                                releasePointerCapture: R
                            },
                            currentTarget: {
                                hasPointerCapture: U,
                                setPointerCapture: D,
                                releasePointerCapture: R
                            },
                            nativeEvent: h
                        };
                        if (v(P), y.stopped === !0) break;
                    }
                }
            }
            return c;
        }
        function o(c) {
            const { internal: h } = r.getState();
            for (const p of h.hovered.values())if (!c.length || !c.find((v)=>v.object === p.object && v.index === p.index && v.instanceId === p.instanceId)) {
                const y = p.eventObject.__r3f;
                if (h.hovered.delete(ns(p)), y != null && y.eventCount) {
                    const b = y.handlers, S = {
                        ...p,
                        intersections: c
                    };
                    b.onPointerOut == null || b.onPointerOut(S), b.onPointerLeave == null || b.onPointerLeave(S);
                }
            }
        }
        function u(c, h) {
            for(let p = 0; p < h.length; p++){
                const v = h[p].__r3f;
                v == null || v.handlers.onPointerMissed == null || v.handlers.onPointerMissed(c);
            }
        }
        function d(c) {
            switch(c){
                case "onPointerLeave":
                case "onPointerCancel":
                    return ()=>o([]);
                case "onLostPointerCapture":
                    return (h)=>{
                        const { internal: p } = r.getState();
                        "pointerId" in h && p.capturedMap.has(h.pointerId) && requestAnimationFrame(()=>{
                            p.capturedMap.has(h.pointerId) && (p.capturedMap.delete(h.pointerId), o([]));
                        });
                    };
            }
            return function(p) {
                const { onPointerMissed: v, internal: y } = r.getState();
                y.lastEvent.current = p;
                const b = c === "onPointerMove", S = c === "onClick" || c === "onContextMenu" || c === "onDoubleClick", x = s(p, b ? a : void 0), k = S ? e(p) : 0;
                c === "onPointerDown" && (y.initialClick = [
                    p.offsetX,
                    p.offsetY
                ], y.initialHits = x.map((A)=>A.eventObject)), S && !x.length && k <= 2 && (u(p, y.interaction), v && v(p)), b && o(x);
                function T(A) {
                    const U = A.eventObject, D = U.__r3f;
                    if (!(D != null && D.eventCount)) return;
                    const R = D.handlers;
                    if (b) {
                        if (R.onPointerOver || R.onPointerEnter || R.onPointerOut || R.onPointerLeave) {
                            const N = ns(A), P = y.hovered.get(N);
                            P ? P.stopped && A.stopPropagation() : (y.hovered.set(N, A), R.onPointerOver == null || R.onPointerOver(A), R.onPointerEnter == null || R.onPointerEnter(A));
                        }
                        R.onPointerMove == null || R.onPointerMove(A);
                    } else {
                        const N = R[c];
                        N ? (!S || y.initialHits.includes(U)) && (u(p, y.interaction.filter((P)=>!y.initialHits.includes(P))), N(A)) : S && y.initialHits.includes(U) && u(p, y.interaction.filter((P)=>!y.initialHits.includes(P)));
                    }
                }
                i(x, p, k, T);
            };
        }
        return {
            handlePointer: d
        };
    }
    const fp = (r)=>!!(r != null && r.render), hs = M.createContext(null), Tb = (r, e)=>{
        const a = og((d, c)=>{
            const h = new ke, p = new ke, v = new ke;
            function y(k = c().camera, T = p, A = c().size) {
                const { width: U, height: D, top: R, left: N } = A, P = U / D;
                T.isVector3 ? v.copy(T) : v.set(...T);
                const I = k.getWorldPosition(h).distanceTo(v);
                if (dg(k)) return {
                    width: U / k.zoom,
                    height: D / k.zoom,
                    top: R,
                    left: N,
                    factor: 1,
                    distance: I,
                    aspect: P
                };
                {
                    const F = k.fov * Math.PI / 180, Y = 2 * Math.tan(F / 2) * I, L = Y * (U / D);
                    return {
                        width: L,
                        height: Y,
                        top: R,
                        left: N,
                        factor: U / L,
                        distance: I,
                        aspect: P
                    };
                }
            }
            let b;
            const S = (k)=>d((T)=>({
                        performance: {
                            ...T.performance,
                            current: k
                        }
                    })), _ = new Ft;
            return {
                set: d,
                get: c,
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
                invalidate: (k = 1)=>r(c(), k),
                advance: (k, T)=>e(k, T, c()),
                legacy: !1,
                linear: !1,
                flat: !1,
                controls: null,
                clock: new K1,
                pointer: _,
                mouse: _,
                frameloop: "always",
                onPointerMissed: void 0,
                performance: {
                    current: 1,
                    min: .5,
                    max: 1,
                    debounce: 200,
                    regress: ()=>{
                        const k = c();
                        b && clearTimeout(b), k.performance.current !== k.performance.min && S(k.performance.min), b = setTimeout(()=>S(c().performance.max), k.performance.debounce);
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
                    getCurrentViewport: y
                },
                setEvents: (k)=>d((T)=>({
                            ...T,
                            events: {
                                ...T.events,
                                ...k
                            }
                        })),
                setSize: (k, T, A = 0, U = 0)=>{
                    const D = c().camera, R = {
                        width: k,
                        height: T,
                        top: A,
                        left: U
                    };
                    d((N)=>({
                            size: R,
                            viewport: {
                                ...N.viewport,
                                ...y(D, p, R)
                            }
                        }));
                },
                setDpr: (k)=>d((T)=>{
                        const A = hg(k);
                        return {
                            viewport: {
                                ...T.viewport,
                                dpr: A,
                                initialDpr: T.viewport.initialDpr || A
                            }
                        };
                    }),
                setFrameloop: (k = "always")=>{
                    const T = c().clock;
                    T.stop(), T.elapsedTime = 0, k !== "never" && (T.start(), T.elapsedTime = 0), d(()=>({
                            frameloop: k
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
                    lastEvent: M.createRef(),
                    active: !1,
                    frames: 0,
                    priority: 0,
                    subscribe: (k, T, A)=>{
                        const U = c().internal;
                        return U.priority = U.priority + (T > 0 ? 1 : 0), U.subscribers.push({
                            ref: k,
                            priority: T,
                            store: A
                        }), U.subscribers = U.subscribers.sort((D, R)=>D.priority - R.priority), ()=>{
                            const D = c().internal;
                            D != null && D.subscribers && (D.priority = D.priority - (T > 0 ? 1 : 0), D.subscribers = D.subscribers.filter((R)=>R.ref !== k));
                        };
                    }
                }
            };
        }), s = a.getState();
        let i = s.size, o = s.viewport.dpr, u = s.camera;
        return a.subscribe(()=>{
            const { camera: d, size: c, viewport: h, gl: p, set: v } = a.getState();
            if (c.width !== i.width || c.height !== i.height || h.dpr !== o) {
                i = c, o = h.dpr, mg(d, c), h.dpr > 0 && p.setPixelRatio(h.dpr);
                const y = typeof HTMLCanvasElement < "u" && p.domElement instanceof HTMLCanvasElement;
                p.setSize(c.width, c.height, y);
            }
            d !== u && (u = d, v((y)=>({
                    viewport: {
                        ...y.viewport,
                        ...y.viewport.getCurrentViewport(d)
                    }
                })));
        }), a.subscribe((d)=>r(d)), a;
    };
    function Hr() {
        const r = M.useContext(hs);
        if (!r) throw new Error("R3F: Hooks can only be used within the Canvas component!");
        return r;
    }
    Et = function(r = (a)=>a, e) {
        return Hr()(r, e);
    };
    Wt = function(r, e = 0) {
        const a = Hr(), s = a.getState().internal.subscribe, i = Rf(r);
        return ds(()=>s(i, e, a), [
            e,
            s,
            a
        ]), null;
    };
    const dp = new WeakMap, Pb = (r)=>{
        var e;
        return typeof r == "function" && (r == null || (e = r.prototype) == null ? void 0 : e.constructor) === r;
    };
    function vg(r, e) {
        return function(a, ...s) {
            let i;
            return Pb(a) ? (i = dp.get(a), i || (i = new a, dp.set(a, i))) : i = a, r && r(i), Promise.all(s.map((o)=>new Promise((u, d)=>i.load(o, (c)=>{
                        Zn(c?.scene) && Object.assign(c, vb(c.scene)), u(c);
                    }, e, (c)=>d(new Error(`Could not load ${o}: ${c?.message}`))))));
        };
    }
    function ca(r, e, a, s) {
        const i = Array.isArray(e) ? e : [
            e
        ], o = Cf(vg(a, s), [
            r,
            ...i
        ], {
            equal: qt.equ
        });
        return Array.isArray(e) ? o : o[0];
    }
    ca.preload = function(r, e, a) {
        const s = Array.isArray(e) ? e : [
            e
        ];
        return ab(vg(a), [
            r,
            ...s
        ]);
    };
    ca.clear = function(r, e) {
        const a = Array.isArray(e) ? e : [
            e
        ];
        return ob([
            r,
            ...a
        ]);
    };
    const kb = 1, Rb = 8, Ib = 32, Ab = 2;
    var Fb = {
        version: "9.6.1"
    };
    function Db(r) {
        return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
    }
    var hp = {
        exports: {}
    }, pp = {
        exports: {}
    }, mp;
    function Ub() {
        return mp || (mp = 1, (function(r) {
            r.exports = function(e) {
                function a(t, n, l, f) {
                    return new Qv(t, n, l, f);
                }
                function s() {}
                function i(t) {
                    var n = "https://react.dev/errors/" + t;
                    if (1 < arguments.length) {
                        n += "?args[]=" + encodeURIComponent(arguments[1]);
                        for(var l = 2; l < arguments.length; l++)n += "&args[]=" + encodeURIComponent(arguments[l]);
                    }
                    return "Minified React error #" + t + "; visit " + n + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
                }
                function o(t) {
                    var n = t, l = t;
                    if (t.alternate) for(; n.return;)n = n.return;
                    else {
                        t = n;
                        do n = t, (n.flags & 4098) !== 0 && (l = n.return), t = n.return;
                        while (t);
                    }
                    return n.tag === 3 ? l : null;
                }
                function u(t) {
                    if (o(t) !== t) throw Error(i(188));
                }
                function d(t) {
                    var n = t.alternate;
                    if (!n) {
                        if (n = o(t), n === null) throw Error(i(188));
                        return n !== t ? null : t;
                    }
                    for(var l = t, f = n;;){
                        var m = l.return;
                        if (m === null) break;
                        var g = m.alternate;
                        if (g === null) {
                            if (f = m.return, f !== null) {
                                l = f;
                                continue;
                            }
                            break;
                        }
                        if (m.child === g.child) {
                            for(g = m.child; g;){
                                if (g === l) return u(m), t;
                                if (g === f) return u(m), n;
                                g = g.sibling;
                            }
                            throw Error(i(188));
                        }
                        if (l.return !== f.return) l = m, f = g;
                        else {
                            for(var E = !1, j = m.child; j;){
                                if (j === l) {
                                    E = !0, l = m, f = g;
                                    break;
                                }
                                if (j === f) {
                                    E = !0, f = m, l = g;
                                    break;
                                }
                                j = j.sibling;
                            }
                            if (!E) {
                                for(j = g.child; j;){
                                    if (j === l) {
                                        E = !0, l = g, f = m;
                                        break;
                                    }
                                    if (j === f) {
                                        E = !0, f = g, l = m;
                                        break;
                                    }
                                    j = j.sibling;
                                }
                                if (!E) throw Error(i(189));
                            }
                        }
                        if (l.alternate !== f) throw Error(i(190));
                    }
                    if (l.tag !== 3) throw Error(i(188));
                    return l.stateNode.current === l ? t : n;
                }
                function c(t) {
                    var n = t.tag;
                    if (n === 5 || n === 26 || n === 27 || n === 6) return t;
                    for(t = t.child; t !== null;){
                        if (n = c(t), n !== null) return n;
                        t = t.sibling;
                    }
                    return null;
                }
                function h(t) {
                    var n = t.tag;
                    if (n === 5 || n === 26 || n === 27 || n === 6) return t;
                    for(t = t.child; t !== null;){
                        if (t.tag !== 4 && (n = h(t), n !== null)) return n;
                        t = t.sibling;
                    }
                    return null;
                }
                function p(t) {
                    return t === null || typeof t != "object" ? null : (t = vh && t[vh] || t["@@iterator"], typeof t == "function" ? t : null);
                }
                function v(t) {
                    if (t == null) return null;
                    if (typeof t == "function") return t.$$typeof === t0 ? null : t.displayName || t.name || null;
                    if (typeof t == "string") return t;
                    switch(t){
                        case Ta:
                            return "Fragment";
                        case Gu:
                            return "Profiler";
                        case mh:
                            return "StrictMode";
                        case Wu:
                            return "Suspense";
                        case Vu:
                            return "SuspenseList";
                        case Yu:
                            return "Activity";
                    }
                    if (typeof t == "object") switch(t.$$typeof){
                        case Ca:
                            return "Portal";
                        case bi:
                            return t.displayName || "Context";
                        case gh:
                            return (t._context.displayName || "Context") + ".Consumer";
                        case Hu:
                            var n = t.render;
                            return t = t.displayName, t || (t = n.displayName || n.name || "", t = t !== "" ? "ForwardRef(" + t + ")" : "ForwardRef"), t;
                        case Xu:
                            return n = t.displayName || null, n !== null ? n : v(t.type) || "Memo";
                        case wi:
                            n = t._payload, t = t._init;
                            try {
                                return v(t(n));
                            } catch  {}
                    }
                    return null;
                }
                function y(t) {
                    return {
                        current: t
                    };
                }
                function b(t) {
                    0 > Ra || (t.current = Ju[Ra], Ju[Ra] = null, Ra--);
                }
                function S(t, n) {
                    Ra++, Ju[Ra] = t.current, t.current = n;
                }
                function _(t) {
                    return t >>>= 0, t === 0 ? 32 : 31 - (k1(t) / R1 | 0) | 0;
                }
                function x(t) {
                    var n = t & 42;
                    if (n !== 0) return n;
                    switch(t & -t){
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
                            return t & 261888;
                        case 262144:
                        case 524288:
                        case 1048576:
                        case 2097152:
                            return t & 3932160;
                        case 4194304:
                        case 8388608:
                        case 16777216:
                        case 33554432:
                            return t & 62914560;
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
                            return t;
                    }
                }
                function k(t, n, l) {
                    var f = t.pendingLanes;
                    if (f === 0) return 0;
                    var m = 0, g = t.suspendedLanes, E = t.pingedLanes;
                    t = t.warmLanes;
                    var j = f & 134217727;
                    return j !== 0 ? (f = j & ~g, f !== 0 ? m = x(f) : (E &= j, E !== 0 ? m = x(E) : l || (l = j & ~t, l !== 0 && (m = x(l))))) : (j = f & ~g, j !== 0 ? m = x(j) : E !== 0 ? m = x(E) : l || (l = f & ~t, l !== 0 && (m = x(l)))), m === 0 ? 0 : n !== 0 && n !== m && (n & g) === 0 && (g = m & -m, l = n & -n, g >= l || g === 32 && (l & 4194048) !== 0) ? n : m;
                }
                function T(t, n) {
                    return (t.pendingLanes & ~(t.suspendedLanes & ~t.pingedLanes) & n) === 0;
                }
                function A(t, n) {
                    switch(t){
                        case 1:
                        case 2:
                        case 4:
                        case 8:
                        case 64:
                            return n + 250;
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
                            return n + 5e3;
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
                function U() {
                    var t = Ws;
                    return Ws <<= 1, (Ws & 62914560) === 0 && (Ws = 4194304), t;
                }
                function D(t) {
                    for(var n = [], l = 0; 31 > l; l++)n.push(t);
                    return n;
                }
                function R(t, n) {
                    t.pendingLanes |= n, n !== 268435456 && (t.suspendedLanes = 0, t.pingedLanes = 0, t.warmLanes = 0);
                }
                function N(t, n, l, f, m, g) {
                    var E = t.pendingLanes;
                    t.pendingLanes = l, t.suspendedLanes = 0, t.pingedLanes = 0, t.warmLanes = 0, t.expiredLanes &= l, t.entangledLanes &= l, t.errorRecoveryDisabledLanes &= l, t.shellSuspendCounter = 0;
                    var j = t.entanglements, le = t.expirationTimes, ve = t.hiddenUpdates;
                    for(l = E & ~l; 0 < l;){
                        var De = 31 - ur(l), _e = 1 << De;
                        j[De] = 0, le[De] = -1;
                        var We = ve[De];
                        if (We !== null) for(ve[De] = null, De = 0; De < We.length; De++){
                            var pt = We[De];
                            pt !== null && (pt.lane &= -536870913);
                        }
                        l &= ~_e;
                    }
                    f !== 0 && P(t, f, 0), g !== 0 && m === 0 && t.tag !== 0 && (t.suspendedLanes |= g & ~(E & ~n));
                }
                function P(t, n, l) {
                    t.pendingLanes |= n, t.suspendedLanes &= ~n;
                    var f = 31 - ur(n);
                    t.entangledLanes |= n, t.entanglements[f] = t.entanglements[f] | 1073741824 | l & 261930;
                }
                function I(t, n) {
                    var l = t.entangledLanes |= n;
                    for(t = t.entanglements; l;){
                        var f = 31 - ur(l), m = 1 << f;
                        m & n | t[f] & n && (t[f] |= n), l &= ~m;
                    }
                }
                function F(t, n) {
                    var l = n & -n;
                    return l = (l & 42) !== 0 ? 1 : Y(l), (l & (t.suspendedLanes | n)) !== 0 ? 0 : l;
                }
                function Y(t) {
                    switch(t){
                        case 2:
                            t = 1;
                            break;
                        case 8:
                            t = 4;
                            break;
                        case 32:
                            t = 16;
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
                            t = 128;
                            break;
                        case 268435456:
                            t = 134217728;
                            break;
                        default:
                            t = 0;
                    }
                    return t;
                }
                function L(t) {
                    return t &= -t, 2 < t ? 8 < t ? (t & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
                }
                function G(t) {
                    if (typeof U1 == "function" && O1(t), cr && typeof cr.setStrictMode == "function") try {
                        cr.setStrictMode(Oo, t);
                    } catch  {}
                }
                function B(t, n) {
                    return t === n && (t !== 0 || 1 / t === 1 / n) || t !== t && n !== n;
                }
                function K(t) {
                    if (nc === void 0) try {
                        throw Error();
                    } catch (l) {
                        var n = l.stack.trim().match(/\n( *(at )?)/);
                        nc = n && n[1] || "", Hh = -1 < l.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < l.stack.indexOf("@") ? "@unknown:0:0" : "";
                    }
                    return `
` + nc + t + Hh;
                }
                function ee(t, n) {
                    if (!t || rc) return "";
                    rc = !0;
                    var l = Error.prepareStackTrace;
                    Error.prepareStackTrace = void 0;
                    try {
                        var f = {
                            DetermineComponentFrameRoot: function() {
                                try {
                                    if (n) {
                                        var _e = function() {
                                            throw Error();
                                        };
                                        if (Object.defineProperty(_e.prototype, "props", {
                                            set: function() {
                                                throw Error();
                                            }
                                        }), typeof Reflect == "object" && Reflect.construct) {
                                            try {
                                                Reflect.construct(_e, []);
                                            } catch (pt) {
                                                var We = pt;
                                            }
                                            Reflect.construct(t, [], _e);
                                        } else {
                                            try {
                                                _e.call();
                                            } catch (pt) {
                                                We = pt;
                                            }
                                            t.call(_e.prototype);
                                        }
                                    } else {
                                        try {
                                            throw Error();
                                        } catch (pt) {
                                            We = pt;
                                        }
                                        (_e = t()) && typeof _e.catch == "function" && _e.catch(function() {});
                                    }
                                } catch (pt) {
                                    if (pt && We && typeof pt.stack == "string") return [
                                        pt.stack,
                                        We.stack
                                    ];
                                }
                                return [
                                    null,
                                    null
                                ];
                            }
                        };
                        f.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
                        var m = Object.getOwnPropertyDescriptor(f.DetermineComponentFrameRoot, "name");
                        m && m.configurable && Object.defineProperty(f.DetermineComponentFrameRoot, "name", {
                            value: "DetermineComponentFrameRoot"
                        });
                        var g = f.DetermineComponentFrameRoot(), E = g[0], j = g[1];
                        if (E && j) {
                            var le = E.split(`
`), ve = j.split(`
`);
                            for(m = f = 0; f < le.length && !le[f].includes("DetermineComponentFrameRoot");)f++;
                            for(; m < ve.length && !ve[m].includes("DetermineComponentFrameRoot");)m++;
                            if (f === le.length || m === ve.length) for(f = le.length - 1, m = ve.length - 1; 1 <= f && 0 <= m && le[f] !== ve[m];)m--;
                            for(; 1 <= f && 0 <= m; f--, m--)if (le[f] !== ve[m]) {
                                if (f !== 1 || m !== 1) do if (f--, m--, 0 > m || le[f] !== ve[m]) {
                                    var De = `
` + le[f].replace(" at new ", " at ");
                                    return t.displayName && De.includes("<anonymous>") && (De = De.replace("<anonymous>", t.displayName)), De;
                                }
                                while (1 <= f && 0 <= m);
                                break;
                            }
                        }
                    } finally{
                        rc = !1, Error.prepareStackTrace = l;
                    }
                    return (l = t ? t.displayName || t.name : "") ? K(l) : "";
                }
                function ye(t, n) {
                    switch(t.tag){
                        case 26:
                        case 27:
                        case 5:
                            return K(t.type);
                        case 16:
                            return K("Lazy");
                        case 13:
                            return t.child !== n && n !== null ? K("Suspense Fallback") : K("Suspense");
                        case 19:
                            return K("SuspenseList");
                        case 0:
                        case 15:
                            return ee(t.type, !1);
                        case 11:
                            return ee(t.type.render, !1);
                        case 1:
                            return ee(t.type, !0);
                        case 31:
                            return K("Activity");
                        default:
                            return "";
                    }
                }
                function xe(t) {
                    try {
                        var n = "", l = null;
                        do n += ye(t, l), l = t, t = t.return;
                        while (t);
                        return n;
                    } catch (f) {
                        return `
Error generating stack: ` + f.message + `
` + f.stack;
                    }
                }
                function te(t, n) {
                    if (typeof t == "object" && t !== null) {
                        var l = Wh.get(t);
                        return l !== void 0 ? l : (n = {
                            value: t,
                            source: n,
                            stack: xe(n)
                        }, Wh.set(t, n), n);
                    }
                    return {
                        value: t,
                        source: n,
                        stack: xe(n)
                    };
                }
                function q(t, n) {
                    Aa[Fa++] = Lo, Aa[Fa++] = Xs, Xs = t, Lo = n;
                }
                function O(t, n, l) {
                    mr[gr++] = Lr, mr[gr++] = zr, mr[gr++] = Si, Si = t;
                    var f = Lr;
                    t = zr;
                    var m = 32 - ur(f) - 1;
                    f &= ~(1 << m), l += 1;
                    var g = 32 - ur(n) + m;
                    if (30 < g) {
                        var E = m - m % 5;
                        g = (f & (1 << E) - 1).toString(32), f >>= E, m -= E, Lr = 1 << 32 - ur(n) + m | l << m | f, zr = g + t;
                    } else Lr = 1 << g | l << m | f, zr = t;
                }
                function H(t) {
                    t.return !== null && (q(t, 1), O(t, 1, 0));
                }
                function X(t) {
                    for(; t === Xs;)Xs = Aa[--Fa], Aa[Fa] = null, Lo = Aa[--Fa], Aa[Fa] = null;
                    for(; t === Si;)Si = mr[--gr], mr[gr] = null, zr = mr[--gr], mr[gr] = null, Lr = mr[--gr], mr[gr] = null;
                }
                function Z(t, n) {
                    mr[gr++] = Lr, mr[gr++] = zr, mr[gr++] = Si, Lr = n.id, zr = n.overflow, Si = t;
                }
                function $(t, n) {
                    S(xi, n), S(zo, t), S(kn, null), t = i0(n), b(kn), S(kn, t);
                }
                function oe() {
                    b(kn), b(zo), b(xi);
                }
                function ce(t) {
                    t.memoizedState !== null && S(Ys, t);
                    var n = kn.current, l = a0(n, t.type);
                    n !== l && (S(zo, t), S(kn, l));
                }
                function fe(t) {
                    zo.current === t && (b(kn), b(zo)), Ys.current === t && (b(Ys), Kr ? Qi._currentValue = Pa : Qi._currentValue2 = Pa);
                }
                function Pe(t) {
                    var n = Error(i(418, 1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML", ""));
                    throw Ae(te(n, t)), ic;
                }
                function Ie(t, n) {
                    if (!Gn) throw Error(i(175));
                    a1(t.stateNode, t.type, t.memoizedProps, n, t) || Pe(t, !0);
                }
                function he(t) {
                    for(Rn = t.return; Rn;)switch(Rn.tag){
                        case 5:
                        case 31:
                        case 13:
                            vr = !1;
                            return;
                        case 27:
                        case 3:
                            vr = !0;
                            return;
                        default:
                            Rn = Rn.return;
                    }
                }
                function pe(t) {
                    if (!Gn || t !== Rn) return !1;
                    if (!Pt) return he(t), Pt = !0, !1;
                    var n = t.tag;
                    if (bn ? n !== 3 && n !== 27 && (n !== 5 || Rh(t.type) && !Bs(t.type, t.memoizedProps)) && en && Pe(t) : n !== 3 && (n !== 5 || Rh(t.type) && !Bs(t.type, t.memoizedProps)) && en && Pe(t), he(t), n === 13) {
                        if (!Gn) throw Error(i(316));
                        if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(i(317));
                        en = c1(t);
                    } else if (n === 31) {
                        if (t = t.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(i(317));
                        en = u1(t);
                    } else en = bn && n === 27 ? Z0(t.type, en) : Rn ? kh(t.stateNode) : null;
                    return !0;
                }
                function Ve() {
                    Gn && (en = Rn = null, Pt = !1);
                }
                function Xe() {
                    var t = _i;
                    return t !== null && (tr === null ? tr = t : tr.push.apply(tr, t), _i = null), t;
                }
                function Ae(t) {
                    _i === null ? _i = [
                        t
                    ] : _i.push(t);
                }
                function ze(t, n, l) {
                    Kr ? (S(qs, n._currentValue), n._currentValue = l) : (S(qs, n._currentValue2), n._currentValue2 = l);
                }
                function Ue(t) {
                    var n = qs.current;
                    Kr ? t._currentValue = n : t._currentValue2 = n, b(qs);
                }
                function be(t, n, l) {
                    for(; t !== null;){
                        var f = t.alternate;
                        if ((t.childLanes & n) !== n ? (t.childLanes |= n, f !== null && (f.childLanes |= n)) : f !== null && (f.childLanes & n) !== n && (f.childLanes |= n), t === l) break;
                        t = t.return;
                    }
                }
                function Ne(t, n, l, f) {
                    var m = t.child;
                    for(m !== null && (m.return = t); m !== null;){
                        var g = m.dependencies;
                        if (g !== null) {
                            var E = m.child;
                            g = g.firstContext;
                            e: for(; g !== null;){
                                var j = g;
                                g = m;
                                for(var le = 0; le < n.length; le++)if (j.context === n[le]) {
                                    g.lanes |= l, j = g.alternate, j !== null && (j.lanes |= l), be(g.return, l, t), f || (E = null);
                                    break e;
                                }
                                g = j.next;
                            }
                        } else if (m.tag === 18) {
                            if (E = m.return, E === null) throw Error(i(341));
                            E.lanes |= l, g = E.alternate, g !== null && (g.lanes |= l), be(E, l, t), E = null;
                        } else E = m.child;
                        if (E !== null) E.return = m;
                        else for(E = m; E !== null;){
                            if (E === t) {
                                E = null;
                                break;
                            }
                            if (m = E.sibling, m !== null) {
                                m.return = E.return, E = m;
                                break;
                            }
                            E = E.return;
                        }
                        m = E;
                    }
                }
                function Le(t, n, l, f) {
                    t = null;
                    for(var m = n, g = !1; m !== null;){
                        if (!g) {
                            if ((m.flags & 524288) !== 0) g = !0;
                            else if ((m.flags & 262144) !== 0) break;
                        }
                        if (m.tag === 10) {
                            var E = m.alternate;
                            if (E === null) throw Error(i(387));
                            if (E = E.memoizedProps, E !== null) {
                                var j = m.type;
                                fr(m.pendingProps.value, E.value) || (t !== null ? t.push(j) : t = [
                                    j
                                ]);
                            }
                        } else if (m === Ys.current) {
                            if (E = m.alternate, E === null) throw Error(i(387));
                            E.memoizedState.memoizedState !== m.memoizedState.memoizedState && (t !== null ? t.push(Qi) : t = [
                                Qi
                            ]);
                        }
                        m = m.return;
                    }
                    t !== null && Ne(n, t, l, f), n.flags |= 262144;
                }
                function me(t) {
                    for(t = t.firstContext; t !== null;){
                        var n = t.context;
                        if (!fr(Kr ? n._currentValue : n._currentValue2, t.memoizedValue)) return !0;
                        t = t.next;
                    }
                    return !1;
                }
                function Ke(t) {
                    Ki = t, Jr = null, t = t.dependencies, t !== null && (t.firstContext = null);
                }
                function Se(t) {
                    return Fe(Ki, t);
                }
                function je(t, n) {
                    return Ki === null && Ke(t), Fe(t, n);
                }
                function Fe(t, n) {
                    var l = Kr ? n._currentValue : n._currentValue2;
                    if (n = {
                        context: n,
                        memoizedValue: l,
                        next: null
                    }, Jr === null) {
                        if (t === null) throw Error(i(308));
                        Jr = n, t.dependencies = {
                            lanes: 0,
                            firstContext: n
                        }, t.flags |= 524288;
                    } else Jr = Jr.next = n;
                    return l;
                }
                function vt() {
                    return {
                        controller: new z1,
                        data: new Map,
                        refCount: 0
                    };
                }
                function Oe(t) {
                    t.refCount--, t.refCount === 0 && N1(j1, function() {
                        t.controller.abort();
                    });
                }
                function Ge() {}
                function Be(t) {
                    t !== Da && t.next === null && (Da === null ? Zs = Da = t : Da = Da.next = t), Qs = !0, ac || (ac = !0, W());
                }
                function et(t, n) {
                    if (!oc && Qs) {
                        oc = !0;
                        do for(var l = !1, f = Zs; f !== null;){
                            if (t !== 0) {
                                var m = f.pendingLanes;
                                if (m === 0) var g = 0;
                                else {
                                    var E = f.suspendedLanes, j = f.pingedLanes;
                                    g = (1 << 31 - ur(42 | t) + 1) - 1, g &= m & ~(E & ~j), g = g & 201326741 ? g & 201326741 | 1 : g ? g | 2 : 0;
                                }
                                g !== 0 && (l = !0, Ze(f, g));
                            } else g = _t, g = k(f, f === Xt ? g : 0, f.cancelPendingCommit !== null || f.timeoutHandle !== Zi), (g & 3) === 0 || T(f, g) || (l = !0, Ze(f, g));
                            f = f.next;
                        }
                        while (l);
                        oc = !1;
                    }
                }
                function kt() {
                    Nt();
                }
                function Nt() {
                    Qs = ac = !1;
                    var t = 0;
                    $i !== 0 && p0() && (t = $i);
                    for(var n = Jn(), l = null, f = Zs; f !== null;){
                        var m = f.next, g = st(f, n);
                        g === 0 ? (f.next = null, l === null ? Zs = m : l.next = m, m === null && (Da = l)) : (l = f, (t !== 0 || (g & 3) !== 0) && (Qs = !0)), f = m;
                    }
                    wn !== 0 && wn !== 5 || et(t), $i !== 0 && ($i = 0);
                }
                function st(t, n) {
                    for(var l = t.suspendedLanes, f = t.pingedLanes, m = t.expirationTimes, g = t.pendingLanes & -62914561; 0 < g;){
                        var E = 31 - ur(g), j = 1 << E, le = m[E];
                        le === -1 ? ((j & l) === 0 || (j & f) !== 0) && (m[E] = A(j, n)) : le <= n && (t.expiredLanes |= j), g &= ~j;
                    }
                    if (n = Xt, l = _t, l = k(t, t === n ? l : 0, t.cancelPendingCommit !== null || t.timeoutHandle !== Zi), f = t.callbackNode, l === 0 || t === n && (Bt === 2 || Bt === 9) || t.cancelPendingCommit !== null) return f !== null && f !== null && ec(f), t.callbackNode = null, t.callbackPriority = 0;
                    if ((l & 3) === 0 || T(t, l)) {
                        if (n = l & -l, n === t.callbackPriority) return n;
                        switch(f !== null && ec(f), L(l)){
                            case 2:
                            case 8:
                                l = F1;
                                break;
                            case 32:
                                l = tc;
                                break;
                            case 268435456:
                                l = D1;
                                break;
                            default:
                                l = tc;
                        }
                        return f = Qe.bind(null, t), l = Vs(l, f), t.callbackPriority = n, t.callbackNode = l, n;
                    }
                    return f !== null && f !== null && ec(f), t.callbackPriority = 2, t.callbackNode = null, 2;
                }
                function Qe(t, n) {
                    if (wn !== 0 && wn !== 5) return t.callbackNode = null, t.callbackPriority = 0, null;
                    var l = t.callbackNode;
                    if (Ao() && t.callbackNode !== l) return null;
                    var f = _t;
                    return f = k(t, t === Xt ? f : 0, t.cancelPendingCommit !== null || t.timeoutHandle !== Zi), f === 0 ? null : (Wd(t, f, n), st(t, Jn()), t.callbackNode != null && t.callbackNode === l ? Qe.bind(null, t) : null);
                }
                function Ze(t, n) {
                    if (Ao()) return null;
                    Wd(t, n, !0);
                }
                function W() {
                    S0 ? x0(function() {
                        (wt & 6) !== 0 ? Vs(Bh, kt) : Nt();
                    }) : Vs(Bh, kt);
                }
                function de() {
                    if ($i === 0) {
                        var t = Ua;
                        t === 0 && (t = Gs, Gs <<= 1, (Gs & 261888) === 0 && (Gs = 256)), $i = t;
                    }
                    return $i;
                }
                function Re(t, n) {
                    if (No === null) {
                        var l = No = [];
                        sc = 0, Ua = de(), Oa = {
                            status: "pending",
                            value: void 0,
                            then: function(f) {
                                l.push(f);
                            }
                        };
                    }
                    return sc++, n.then(qe, qe), n;
                }
                function qe() {
                    if (--sc === 0 && No !== null) {
                        Oa !== null && (Oa.status = "fulfilled");
                        var t = No;
                        No = null, Ua = 0, Oa = null;
                        for(var n = 0; n < t.length; n++)(0, t[n])();
                    }
                }
                function ue(t, n) {
                    var l = [], f = {
                        status: "pending",
                        value: null,
                        reason: null,
                        then: function(m) {
                            l.push(m);
                        }
                    };
                    return t.then(function() {
                        f.status = "fulfilled", f.value = n;
                        for(var m = 0; m < l.length; m++)(0, l[m])(n);
                    }, function(m) {
                        for(f.status = "rejected", f.reason = m, m = 0; m < l.length; m++)(0, l[m])(void 0);
                    }), f;
                }
                function ot() {
                    var t = Ji.current;
                    return t !== null ? t : Xt.pooledCache;
                }
                function Kt(t, n) {
                    n === null ? S(Ji, Ji.current) : S(Ji, n.pool);
                }
                function Rt() {
                    var t = ot();
                    return t === null ? null : {
                        parent: Kr ? tn._currentValue : tn._currentValue2,
                        pool: t
                    };
                }
                function ft(t, n) {
                    if (fr(t, n)) return !0;
                    if (typeof t != "object" || t === null || typeof n != "object" || n === null) return !1;
                    var l = Object.keys(t), f = Object.keys(n);
                    if (l.length !== f.length) return !1;
                    for(f = 0; f < l.length; f++){
                        var m = l[f];
                        if (!L1.call(n, m) || !fr(t[m], n[m])) return !1;
                    }
                    return !0;
                }
                function Mt(t) {
                    return t = t.status, t === "fulfilled" || t === "rejected";
                }
                function yt(t, n, l) {
                    switch(l = t[l], l === void 0 ? t.push(n) : l !== n && (n.then(Ge, Ge), n = l), n.status){
                        case "fulfilled":
                            return n.value;
                        case "rejected":
                            throw t = n.reason, Yt(t), t;
                        default:
                            if (typeof n.status == "string") n.then(Ge, Ge);
                            else {
                                if (t = Xt, t !== null && 100 < t.shellSuspendCounter) throw Error(i(482));
                                t = n, t.status = "pending", t.then(function(f) {
                                    if (n.status === "pending") {
                                        var m = n;
                                        m.status = "fulfilled", m.value = f;
                                    }
                                }, function(f) {
                                    if (n.status === "pending") {
                                        var m = n;
                                        m.status = "rejected", m.reason = f;
                                    }
                                });
                            }
                            switch(n.status){
                                case "fulfilled":
                                    return n.value;
                                case "rejected":
                                    throw t = n.reason, Yt(t), t;
                            }
                            throw ea = n, La;
                    }
                }
                function $e(t) {
                    try {
                        var n = t._init;
                        return n(t._payload);
                    } catch (l) {
                        throw l !== null && typeof l == "object" && typeof l.then == "function" ? (ea = l, La) : l;
                    }
                }
                function Ct() {
                    if (ea === null) throw Error(i(459));
                    var t = ea;
                    return ea = null, t;
                }
                function Yt(t) {
                    if (t === La || t === Ks) throw Error(i(483));
                }
                function Gt(t) {
                    var n = jo;
                    return jo += 1, za === null && (za = []), yt(za, t, n);
                }
                function Vt(t, n) {
                    n = n.props.ref, t.ref = n !== void 0 ? n : null;
                }
                function Sn(t, n) {
                    throw n.$$typeof === Jv ? Error(i(525)) : (t = Object.prototype.toString.call(n), Error(i(31, t === "[object Object]" ? "object with keys {" + Object.keys(n).join(", ") + "}" : t)));
                }
                function Dn(t) {
                    function n(J, V) {
                        if (t) {
                            var ie = J.deletions;
                            ie === null ? (J.deletions = [
                                V
                            ], J.flags |= 16) : ie.push(V);
                        }
                    }
                    function l(J, V) {
                        if (!t) return null;
                        for(; V !== null;)n(J, V), V = V.sibling;
                        return null;
                    }
                    function f(J) {
                        for(var V = new Map; J !== null;)J.key !== null ? V.set(J.key, J) : V.set(J.index, J), J = J.sibling;
                        return V;
                    }
                    function m(J, V) {
                        return J = Qr(J, V), J.index = 0, J.sibling = null, J;
                    }
                    function g(J, V, ie) {
                        return J.index = ie, t ? (ie = J.alternate, ie !== null ? (ie = ie.index, ie < V ? (J.flags |= 67108866, V) : ie) : (J.flags |= 67108866, V)) : (J.flags |= 1048576, V);
                    }
                    function E(J) {
                        return t && J.alternate === null && (J.flags |= 67108866), J;
                    }
                    function j(J, V, ie, Ee) {
                        return V === null || V.tag !== 6 ? (V = zu(ie, J.mode, Ee), V.return = J, V) : (V = m(V, ie), V.return = J, V);
                    }
                    function le(J, V, ie, Ee) {
                        var rt = ie.type;
                        return rt === Ta ? De(J, V, ie.props.children, Ee, ie.key) : V !== null && (V.elementType === rt || typeof rt == "object" && rt !== null && rt.$$typeof === wi && $e(rt) === V.type) ? (V = m(V, ie.props), Vt(V, ie), V.return = J, V) : (V = zs(ie.type, ie.key, ie.props, null, J.mode, Ee), Vt(V, ie), V.return = J, V);
                    }
                    function ve(J, V, ie, Ee) {
                        return V === null || V.tag !== 4 || V.stateNode.containerInfo !== ie.containerInfo || V.stateNode.implementation !== ie.implementation ? (V = Nu(ie, J.mode, Ee), V.return = J, V) : (V = m(V, ie.children || []), V.return = J, V);
                    }
                    function De(J, V, ie, Ee, rt) {
                        return V === null || V.tag !== 7 ? (V = qi(ie, J.mode, Ee, rt), V.return = J, V) : (V = m(V, ie), V.return = J, V);
                    }
                    function _e(J, V, ie) {
                        if (typeof V == "string" && V !== "" || typeof V == "number" || typeof V == "bigint") return V = zu("" + V, J.mode, ie), V.return = J, V;
                        if (typeof V == "object" && V !== null) {
                            switch(V.$$typeof){
                                case Ns:
                                    return ie = zs(V.type, V.key, V.props, null, J.mode, ie), Vt(ie, V), ie.return = J, ie;
                                case Ca:
                                    return V = Nu(V, J.mode, ie), V.return = J, V;
                                case wi:
                                    return V = $e(V), _e(J, V, ie);
                            }
                            if (js(V) || p(V)) return V = qi(V, J.mode, ie, null), V.return = J, V;
                            if (typeof V.then == "function") return _e(J, Gt(V), ie);
                            if (V.$$typeof === bi) return _e(J, je(J, V), ie);
                            Sn(J, V);
                        }
                        return null;
                    }
                    function We(J, V, ie, Ee) {
                        var rt = V !== null ? V.key : null;
                        if (typeof ie == "string" && ie !== "" || typeof ie == "number" || typeof ie == "bigint") return rt !== null ? null : j(J, V, "" + ie, Ee);
                        if (typeof ie == "object" && ie !== null) {
                            switch(ie.$$typeof){
                                case Ns:
                                    return ie.key === rt ? le(J, V, ie, Ee) : null;
                                case Ca:
                                    return ie.key === rt ? ve(J, V, ie, Ee) : null;
                                case wi:
                                    return ie = $e(ie), We(J, V, ie, Ee);
                            }
                            if (js(ie) || p(ie)) return rt !== null ? null : De(J, V, ie, Ee, null);
                            if (typeof ie.then == "function") return We(J, V, Gt(ie), Ee);
                            if (ie.$$typeof === bi) return We(J, V, je(J, ie), Ee);
                            Sn(J, ie);
                        }
                        return null;
                    }
                    function pt(J, V, ie, Ee, rt) {
                        if (typeof Ee == "string" && Ee !== "" || typeof Ee == "number" || typeof Ee == "bigint") return J = J.get(ie) || null, j(V, J, "" + Ee, rt);
                        if (typeof Ee == "object" && Ee !== null) {
                            switch(Ee.$$typeof){
                                case Ns:
                                    return J = J.get(Ee.key === null ? ie : Ee.key) || null, le(V, J, Ee, rt);
                                case Ca:
                                    return J = J.get(Ee.key === null ? ie : Ee.key) || null, ve(V, J, Ee, rt);
                                case wi:
                                    return Ee = $e(Ee), pt(J, V, ie, Ee, rt);
                            }
                            if (js(Ee) || p(Ee)) return J = J.get(ie) || null, De(V, J, Ee, rt, null);
                            if (typeof Ee.then == "function") return pt(J, V, ie, Gt(Ee), rt);
                            if (Ee.$$typeof === bi) return pt(J, V, ie, je(V, Ee), rt);
                            Sn(V, Ee);
                        }
                        return null;
                    }
                    function mn(J, V, ie, Ee) {
                        for(var rt = null, nn = null, lt = V, Ot = V = 0, En = null; lt !== null && Ot < ie.length; Ot++){
                            lt.index > Ot ? (En = lt, lt = null) : En = lt.sibling;
                            var Lt = We(J, lt, ie[Ot], Ee);
                            if (Lt === null) {
                                lt === null && (lt = En);
                                break;
                            }
                            t && lt && Lt.alternate === null && n(J, lt), V = g(Lt, V, Ot), nn === null ? rt = Lt : nn.sibling = Lt, nn = Lt, lt = En;
                        }
                        if (Ot === ie.length) return l(J, lt), Pt && q(J, Ot), rt;
                        if (lt === null) {
                            for(; Ot < ie.length; Ot++)lt = _e(J, ie[Ot], Ee), lt !== null && (V = g(lt, V, Ot), nn === null ? rt = lt : nn.sibling = lt, nn = lt);
                            return Pt && q(J, Ot), rt;
                        }
                        for(lt = f(lt); Ot < ie.length; Ot++)En = pt(lt, J, Ot, ie[Ot], Ee), En !== null && (t && En.alternate !== null && lt.delete(En.key === null ? Ot : En.key), V = g(En, V, Ot), nn === null ? rt = En : nn.sibling = En, nn = En);
                        return t && lt.forEach(function(ki) {
                            return n(J, ki);
                        }), Pt && q(J, Ot), rt;
                    }
                    function Yo(J, V, ie, Ee) {
                        if (ie == null) throw Error(i(151));
                        for(var rt = null, nn = null, lt = V, Ot = V = 0, En = null, Lt = ie.next(); lt !== null && !Lt.done; Ot++, Lt = ie.next()){
                            lt.index > Ot ? (En = lt, lt = null) : En = lt.sibling;
                            var ki = We(J, lt, Lt.value, Ee);
                            if (ki === null) {
                                lt === null && (lt = En);
                                break;
                            }
                            t && lt && ki.alternate === null && n(J, lt), V = g(ki, V, Ot), nn === null ? rt = ki : nn.sibling = ki, nn = ki, lt = En;
                        }
                        if (Lt.done) return l(J, lt), Pt && q(J, Ot), rt;
                        if (lt === null) {
                            for(; !Lt.done; Ot++, Lt = ie.next())Lt = _e(J, Lt.value, Ee), Lt !== null && (V = g(Lt, V, Ot), nn === null ? rt = Lt : nn.sibling = Lt, nn = Lt);
                            return Pt && q(J, Ot), rt;
                        }
                        for(lt = f(lt); !Lt.done; Ot++, Lt = ie.next())Lt = pt(lt, J, Ot, Lt.value, Ee), Lt !== null && (t && Lt.alternate !== null && lt.delete(Lt.key === null ? Ot : Lt.key), V = g(Lt, V, Ot), nn === null ? rt = Lt : nn.sibling = Lt, nn = Lt);
                        return t && lt.forEach(function(W1) {
                            return n(J, W1);
                        }), Pt && q(J, Ot), rt;
                    }
                    function ia(J, V, ie, Ee) {
                        if (typeof ie == "object" && ie !== null && ie.type === Ta && ie.key === null && (ie = ie.props.children), typeof ie == "object" && ie !== null) {
                            switch(ie.$$typeof){
                                case Ns:
                                    e: {
                                        for(var rt = ie.key; V !== null;){
                                            if (V.key === rt) {
                                                if (rt = ie.type, rt === Ta) {
                                                    if (V.tag === 7) {
                                                        l(J, V.sibling), Ee = m(V, ie.props.children), Ee.return = J, J = Ee;
                                                        break e;
                                                    }
                                                } else if (V.elementType === rt || typeof rt == "object" && rt !== null && rt.$$typeof === wi && $e(rt) === V.type) {
                                                    l(J, V.sibling), Ee = m(V, ie.props), Vt(Ee, ie), Ee.return = J, J = Ee;
                                                    break e;
                                                }
                                                l(J, V);
                                                break;
                                            } else n(J, V);
                                            V = V.sibling;
                                        }
                                        ie.type === Ta ? (Ee = qi(ie.props.children, J.mode, Ee, ie.key), Ee.return = J, J = Ee) : (Ee = zs(ie.type, ie.key, ie.props, null, J.mode, Ee), Vt(Ee, ie), Ee.return = J, J = Ee);
                                    }
                                    return E(J);
                                case Ca:
                                    e: {
                                        for(rt = ie.key; V !== null;){
                                            if (V.key === rt) if (V.tag === 4 && V.stateNode.containerInfo === ie.containerInfo && V.stateNode.implementation === ie.implementation) {
                                                l(J, V.sibling), Ee = m(V, ie.children || []), Ee.return = J, J = Ee;
                                                break e;
                                            } else {
                                                l(J, V);
                                                break;
                                            }
                                            else n(J, V);
                                            V = V.sibling;
                                        }
                                        Ee = Nu(ie, J.mode, Ee), Ee.return = J, J = Ee;
                                    }
                                    return E(J);
                                case wi:
                                    return ie = $e(ie), ia(J, V, ie, Ee);
                            }
                            if (js(ie)) return mn(J, V, ie, Ee);
                            if (p(ie)) {
                                if (rt = p(ie), typeof rt != "function") throw Error(i(150));
                                return ie = rt.call(ie), Yo(J, V, ie, Ee);
                            }
                            if (typeof ie.then == "function") return ia(J, V, Gt(ie), Ee);
                            if (ie.$$typeof === bi) return ia(J, V, je(J, ie), Ee);
                            Sn(J, ie);
                        }
                        return typeof ie == "string" && ie !== "" || typeof ie == "number" || typeof ie == "bigint" ? (ie = "" + ie, V !== null && V.tag === 6 ? (l(J, V.sibling), Ee = m(V, ie), Ee.return = J, J = Ee) : (l(J, V), Ee = zu(ie, J.mode, Ee), Ee.return = J, J = Ee), E(J)) : l(J, V);
                    }
                    return function(J, V, ie, Ee) {
                        try {
                            jo = 0;
                            var rt = ia(J, V, ie, Ee);
                            return za = null, rt;
                        } catch (lt) {
                            if (lt === La || lt === Ks) throw lt;
                            var nn = a(29, lt, null, J.mode);
                            return nn.lanes = Ee, nn.return = J, nn;
                        } finally{}
                    };
                }
                function Un() {
                    for(var t = Na, n = uc = Na = 0; n < t;){
                        var l = yr[n];
                        yr[n++] = null;
                        var f = yr[n];
                        yr[n++] = null;
                        var m = yr[n];
                        yr[n++] = null;
                        var g = yr[n];
                        if (yr[n++] = null, f !== null && m !== null) {
                            var E = f.pending;
                            E === null ? m.next = m : (m.next = E.next, E.next = m), f.pending = m;
                        }
                        g !== 0 && sn(l, m, g);
                    }
                }
                function gn(t, n, l, f) {
                    yr[Na++] = t, yr[Na++] = n, yr[Na++] = l, yr[Na++] = f, uc |= f, t.lanes |= f, t = t.alternate, t !== null && (t.lanes |= f);
                }
                function Mn(t, n, l, f) {
                    return gn(t, n, l, f), Kn(t);
                }
                function Je(t, n) {
                    return gn(t, null, null, n), Kn(t);
                }
                function sn(t, n, l) {
                    t.lanes |= l;
                    var f = t.alternate;
                    f !== null && (f.lanes |= l);
                    for(var m = !1, g = t.return; g !== null;)g.childLanes |= l, f = g.alternate, f !== null && (f.childLanes |= l), g.tag === 22 && (t = g.stateNode, t === null || t._visibility & 1 || (m = !0)), t = g, g = g.return;
                    return t.tag === 3 ? (g = t.stateNode, m && n !== null && (m = 31 - ur(l), t = g.hiddenUpdates, f = t[m], f === null ? t[m] = [
                        n
                    ] : f.push(n), n.lane = l | 536870912), g) : null;
                }
                function Kn(t) {
                    if (50 < Xo) throw Xo = 0, Sc = null, Error(i(185));
                    for(var n = t.return; n !== null;)t = n, n = t.return;
                    return t.tag === 3 ? t.stateNode : null;
                }
                function w(t) {
                    t.updateQueue = {
                        baseState: t.memoizedState,
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
                function C(t, n) {
                    t = t.updateQueue, n.updateQueue === t && (n.updateQueue = {
                        baseState: t.baseState,
                        firstBaseUpdate: t.firstBaseUpdate,
                        lastBaseUpdate: t.lastBaseUpdate,
                        shared: t.shared,
                        callbacks: null
                    });
                }
                function z(t) {
                    return {
                        lane: t,
                        tag: 0,
                        payload: null,
                        callback: null,
                        next: null
                    };
                }
                function Q(t, n, l) {
                    var f = t.updateQueue;
                    if (f === null) return null;
                    if (f = f.shared, (wt & 2) !== 0) {
                        var m = f.pending;
                        return m === null ? n.next = n : (n.next = m.next, m.next = n), f.pending = n, n = Kn(t), sn(t, null, l), n;
                    }
                    return gn(t, f, n, l), Kn(t);
                }
                function ae(t, n, l) {
                    if (n = n.updateQueue, n !== null && (n = n.shared, (l & 4194048) !== 0)) {
                        var f = n.lanes;
                        f &= t.pendingLanes, l |= f, n.lanes = l, I(t, l);
                    }
                }
                function se(t, n) {
                    var l = t.updateQueue, f = t.alternate;
                    if (f !== null && (f = f.updateQueue, l === f)) {
                        var m = null, g = null;
                        if (l = l.firstBaseUpdate, l !== null) {
                            do {
                                var E = {
                                    lane: l.lane,
                                    tag: l.tag,
                                    payload: l.payload,
                                    callback: null,
                                    next: null
                                };
                                g === null ? m = g = E : g = g.next = E, l = l.next;
                            }while (l !== null);
                            g === null ? m = g = n : g = g.next = n;
                        } else m = g = n;
                        l = {
                            baseState: f.baseState,
                            firstBaseUpdate: m,
                            lastBaseUpdate: g,
                            shared: f.shared,
                            callbacks: f.callbacks
                        }, t.updateQueue = l;
                        return;
                    }
                    t = l.lastBaseUpdate, t === null ? l.firstBaseUpdate = n : t.next = n, l.lastBaseUpdate = n;
                }
                function we() {
                    if (cc) {
                        var t = Oa;
                        if (t !== null) throw t;
                    }
                }
                function ge(t, n, l, f) {
                    cc = !1;
                    var m = t.updateQueue;
                    Ei = !1;
                    var g = m.firstBaseUpdate, E = m.lastBaseUpdate, j = m.shared.pending;
                    if (j !== null) {
                        m.shared.pending = null;
                        var le = j, ve = le.next;
                        le.next = null, E === null ? g = ve : E.next = ve, E = le;
                        var De = t.alternate;
                        De !== null && (De = De.updateQueue, j = De.lastBaseUpdate, j !== E && (j === null ? De.firstBaseUpdate = ve : j.next = ve, De.lastBaseUpdate = le));
                    }
                    if (g !== null) {
                        var _e = m.baseState;
                        E = 0, De = ve = le = null, j = g;
                        do {
                            var We = j.lane & -536870913, pt = We !== j.lane;
                            if (pt ? (_t & We) === We : (f & We) === We) {
                                We !== 0 && We === Ua && (cc = !0), De !== null && (De = De.next = {
                                    lane: 0,
                                    tag: j.tag,
                                    payload: j.payload,
                                    callback: null,
                                    next: null
                                });
                                e: {
                                    var mn = t, Yo = j;
                                    We = n;
                                    var ia = l;
                                    switch(Yo.tag){
                                        case 1:
                                            if (mn = Yo.payload, typeof mn == "function") {
                                                _e = mn.call(ia, _e, We);
                                                break e;
                                            }
                                            _e = mn;
                                            break e;
                                        case 3:
                                            mn.flags = mn.flags & -65537 | 128;
                                        case 0:
                                            if (mn = Yo.payload, We = typeof mn == "function" ? mn.call(ia, _e, We) : mn, We == null) break e;
                                            _e = Bu({}, _e, We);
                                            break e;
                                        case 2:
                                            Ei = !0;
                                    }
                                }
                                We = j.callback, We !== null && (t.flags |= 64, pt && (t.flags |= 8192), pt = m.callbacks, pt === null ? m.callbacks = [
                                    We
                                ] : pt.push(We));
                            } else pt = {
                                lane: We,
                                tag: j.tag,
                                payload: j.payload,
                                callback: j.callback,
                                next: null
                            }, De === null ? (ve = De = pt, le = _e) : De = De.next = pt, E |= We;
                            if (j = j.next, j === null) {
                                if (j = m.shared.pending, j === null) break;
                                pt = j, j = pt.next, pt.next = null, m.lastBaseUpdate = pt, m.shared.pending = null;
                            }
                        }while (!0);
                        De === null && (le = _e), m.baseState = le, m.firstBaseUpdate = ve, m.lastBaseUpdate = De, g === null && (m.shared.lanes = 0), Ci |= E, t.lanes = E, t.memoizedState = _e;
                    }
                }
                function Me(t, n) {
                    if (typeof t != "function") throw Error(i(191, t));
                    t.call(n);
                }
                function Ce(t, n) {
                    var l = t.callbacks;
                    if (l !== null) for(t.callbacks = null, t = 0; t < l.length; t++)Me(l[t], n);
                }
                function Te(t, n) {
                    t = ni, S(Js, t), S(ja, n), ni = t | n.baseLanes;
                }
                function re() {
                    S(Js, ni), S(ja, ja.current);
                }
                function It() {
                    ni = Js.current, b(ja), b(Js);
                }
                function He(t) {
                    var n = t.alternate;
                    S(ln, ln.current & 1), S(dr, t), kr === null && (n === null || ja.current !== null || n.memoizedState !== null) && (kr = t);
                }
                function Ye(t) {
                    S(ln, ln.current), S(dr, t), kr === null && (kr = t);
                }
                function it(t) {
                    t.tag === 22 ? (S(ln, ln.current), S(dr, t), kr === null && (kr = t)) : at();
                }
                function at() {
                    S(ln, ln.current), S(dr, dr.current);
                }
                function ht(t) {
                    b(dr), kr === t && (kr = null), b(ln);
                }
                function xt(t) {
                    for(var n = t; n !== null;){
                        if (n.tag === 13) {
                            var l = n.memoizedState;
                            if (l !== null && (l = l.dehydrated, l === null || Qu(l) || Ku(l))) return n;
                        } else if (n.tag === 19 && (n.memoizedProps.revealOrder === "forwards" || n.memoizedProps.revealOrder === "backwards" || n.memoizedProps.revealOrder === "unstable_legacy-backwards" || n.memoizedProps.revealOrder === "together")) {
                            if ((n.flags & 128) !== 0) return n;
                        } else if (n.child !== null) {
                            n.child.return = n, n = n.child;
                            continue;
                        }
                        if (n === t) break;
                        for(; n.sibling === null;){
                            if (n.return === null || n.return === t) return null;
                            n = n.return;
                        }
                        n.sibling.return = n.return, n = n.sibling;
                    }
                    return null;
                }
                function ut() {
                    throw Error(i(321));
                }
                function an(t, n) {
                    if (n === null) return !1;
                    for(var l = 0; l < n.length && l < t.length; l++)if (!fr(t[l], n[l])) return !1;
                    return !0;
                }
                function Tt(t, n, l, f, m, g) {
                    return ei = g, gt = n, n.memoizedState = null, n.updateQueue = null, n.lanes = 0, nt.H = t === null || t.memoizedState === null ? Yh : fc, na = !1, g = l(f, m), na = !1, Ba && (g = Dt(n, l, f, m)), On(t), g;
                }
                function On(t) {
                    nt.H = Go;
                    var n = Ht !== null && Ht.next !== null;
                    if (ei = 0, fn = Ht = gt = null, el = !1, Bo = 0, Ga = null, n) throw Error(i(300));
                    t === null || dn || (t = t.dependencies, t !== null && me(t) && (dn = !0));
                }
                function Dt(t, n, l, f) {
                    gt = t;
                    var m = 0;
                    do {
                        if (Ba && (Ga = null), Bo = 0, Ba = !1, 25 <= m) throw Error(i(301));
                        if (m += 1, fn = Ht = null, t.updateQueue != null) {
                            var g = t.updateQueue;
                            g.lastEffect = null, g.events = null, g.stores = null, g.memoCache != null && (g.memoCache.index = 0);
                        }
                        nt.H = qh, g = n(l, f);
                    }while (Ba);
                    return g;
                }
                function $t() {
                    var t = nt.H, n = t.useState()[0];
                    return n = typeof n.then == "function" ? dt(n) : n, t = t.useState()[0], (Ht !== null ? Ht.memoizedState : null) !== t && (gt.flags |= 1024), n;
                }
                function vn() {
                    var t = tl !== 0;
                    return tl = 0, t;
                }
                function ir(t, n, l) {
                    n.updateQueue = t.updateQueue, n.flags &= -2053, t.lanes &= ~l;
                }
                function Jt(t) {
                    if (el) {
                        for(t = t.memoizedState; t !== null;){
                            var n = t.queue;
                            n !== null && (n.pending = null), t = t.next;
                        }
                        el = !1;
                    }
                    ei = 0, fn = Ht = gt = null, Ba = !1, Bo = tl = 0, Ga = null;
                }
                function ct() {
                    var t = {
                        memoizedState: null,
                        baseState: null,
                        baseQueue: null,
                        queue: null,
                        next: null
                    };
                    return fn === null ? gt.memoizedState = fn = t : fn = fn.next = t, fn;
                }
                function mt() {
                    if (Ht === null) {
                        var t = gt.alternate;
                        t = t !== null ? t.memoizedState : null;
                    } else t = Ht.next;
                    var n = fn === null ? gt.memoizedState : fn.next;
                    if (n !== null) fn = n, Ht = t;
                    else {
                        if (t === null) throw gt.alternate === null ? Error(i(467)) : Error(i(310));
                        Ht = t, t = {
                            memoizedState: Ht.memoizedState,
                            baseState: Ht.baseState,
                            baseQueue: Ht.baseQueue,
                            queue: Ht.queue,
                            next: null
                        }, fn === null ? gt.memoizedState = fn = t : fn = fn.next = t;
                    }
                    return fn;
                }
                function At() {
                    return {
                        lastEffect: null,
                        events: null,
                        stores: null,
                        memoCache: null
                    };
                }
                function dt(t) {
                    var n = Bo;
                    return Bo += 1, Ga === null && (Ga = []), t = yt(Ga, t, n), n = gt, (fn === null ? n.memoizedState : fn.next) === null && (n = n.alternate, nt.H = n === null || n.memoizedState === null ? Yh : fc), t;
                }
                function yn(t) {
                    if (t !== null && typeof t == "object") {
                        if (typeof t.then == "function") return dt(t);
                        if (t.$$typeof === bi) return Se(t);
                    }
                    throw Error(i(438, String(t)));
                }
                function Ln(t) {
                    var n = null, l = gt.updateQueue;
                    if (l !== null && (n = l.memoCache), n == null) {
                        var f = gt.alternate;
                        f !== null && (f = f.updateQueue, f !== null && (f = f.memoCache, f != null && (n = {
                            data: f.data.map(function(m) {
                                return m.slice();
                            }),
                            index: 0
                        })));
                    }
                    if (n == null && (n = {
                        data: [],
                        index: 0
                    }), l === null && (l = At(), gt.updateQueue = l), l.memoCache = n, l = n.data[n.index], l === void 0) for(l = n.data[n.index] = Array(t), f = 0; f < t; f++)l[f] = e0;
                    return n.index++, l;
                }
                function jt(t, n) {
                    return typeof n == "function" ? n(t) : n;
                }
                function zn(t) {
                    var n = mt();
                    return oi(n, Ht, t);
                }
                function oi(t, n, l) {
                    var f = t.queue;
                    if (f === null) throw Error(i(311));
                    f.lastRenderedReducer = l;
                    var m = t.baseQueue, g = f.pending;
                    if (g !== null) {
                        if (m !== null) {
                            var E = m.next;
                            m.next = g.next, g.next = E;
                        }
                        n.baseQueue = m = g, f.pending = null;
                    }
                    if (g = t.baseState, m === null) t.memoizedState = g;
                    else {
                        n = m.next;
                        var j = E = null, le = null, ve = n, De = !1;
                        do {
                            var _e = ve.lane & -536870913;
                            if (_e !== ve.lane ? (_t & _e) === _e : (ei & _e) === _e) {
                                var We = ve.revertLane;
                                if (We === 0) le !== null && (le = le.next = {
                                    lane: 0,
                                    revertLane: 0,
                                    gesture: null,
                                    action: ve.action,
                                    hasEagerState: ve.hasEagerState,
                                    eagerState: ve.eagerState,
                                    next: null
                                }), _e === Ua && (De = !0);
                                else if ((ei & We) === We) {
                                    ve = ve.next, We === Ua && (De = !0);
                                    continue;
                                } else _e = {
                                    lane: 0,
                                    revertLane: ve.revertLane,
                                    gesture: null,
                                    action: ve.action,
                                    hasEagerState: ve.hasEagerState,
                                    eagerState: ve.eagerState,
                                    next: null
                                }, le === null ? (j = le = _e, E = g) : le = le.next = _e, gt.lanes |= We, Ci |= We;
                                _e = ve.action, na && l(g, _e), g = ve.hasEagerState ? ve.eagerState : l(g, _e);
                            } else We = {
                                lane: _e,
                                revertLane: ve.revertLane,
                                gesture: ve.gesture,
                                action: ve.action,
                                hasEagerState: ve.hasEagerState,
                                eagerState: ve.eagerState,
                                next: null
                            }, le === null ? (j = le = We, E = g) : le = le.next = We, gt.lanes |= _e, Ci |= _e;
                            ve = ve.next;
                        }while (ve !== null && ve !== n);
                        if (le === null ? E = g : le.next = j, !fr(g, t.memoizedState) && (dn = !0, De && (l = Oa, l !== null))) throw l;
                        t.memoizedState = g, t.baseState = E, t.baseQueue = le, f.lastRenderedState = g;
                    }
                    return m === null && (f.lanes = 0), [
                        t.memoizedState,
                        f.dispatch
                    ];
                }
                function si(t) {
                    var n = mt(), l = n.queue;
                    if (l === null) throw Error(i(311));
                    l.lastRenderedReducer = t;
                    var f = l.dispatch, m = l.pending, g = n.memoizedState;
                    if (m !== null) {
                        l.pending = null;
                        var E = m = m.next;
                        do g = t(g, E.action), E = E.next;
                        while (E !== m);
                        fr(g, n.memoizedState) || (dn = !0), n.memoizedState = g, n.baseQueue === null && (n.baseState = g), l.lastRenderedState = g;
                    }
                    return [
                        g,
                        f
                    ];
                }
                function ha(t, n, l) {
                    var f = gt, m = mt(), g = Pt;
                    if (g) {
                        if (l === void 0) throw Error(i(407));
                        l = l();
                    } else l = n();
                    var E = !fr((Ht || m).memoizedState, l);
                    if (E && (m.memoizedState = l, dn = !0), m = m.queue, Xr(pa.bind(null, f, m, t), [
                        t
                    ]), m.getSnapshot !== n || E || fn !== null && fn.memoizedState.tag & 1) {
                        if (f.flags |= 2048, Vr(9, {
                            destroy: void 0
                        }, yo.bind(null, f, m, l, n), null), Xt === null) throw Error(i(349));
                        g || (ei & 127) !== 0 || vo(f, n, l);
                    }
                    return l;
                }
                function vo(t, n, l) {
                    t.flags |= 16384, t = {
                        getSnapshot: n,
                        value: l
                    }, n = gt.updateQueue, n === null ? (n = At(), gt.updateQueue = n, n.stores = [
                        t
                    ]) : (l = n.stores, l === null ? n.stores = [
                        t
                    ] : l.push(t));
                }
                function yo(t, n, l, f) {
                    n.value = l, n.getSnapshot = f, li(n) && bo(t);
                }
                function pa(t, n, l) {
                    return l(function() {
                        li(n) && bo(t);
                    });
                }
                function li(t) {
                    var n = t.getSnapshot;
                    t = t.value;
                    try {
                        var l = n();
                        return !fr(t, l);
                    } catch  {
                        return !0;
                    }
                }
                function bo(t) {
                    var n = Je(t, 2);
                    n !== null && $n(n, t, 2);
                }
                function ui(t) {
                    var n = ct();
                    if (typeof t == "function") {
                        var l = t;
                        if (t = l(), na) {
                            G(!0);
                            try {
                                l();
                            } finally{
                                G(!1);
                            }
                        }
                    }
                    return n.memoizedState = n.baseState = t, n.queue = {
                        pending: null,
                        lanes: 0,
                        dispatch: null,
                        lastRenderedReducer: jt,
                        lastRenderedState: t
                    }, n;
                }
                function Wr(t, n, l, f) {
                    return t.baseState = l, oi(t, Ht, typeof f == "function" ? f : jt);
                }
                function ci(t, n, l, f, m) {
                    if (Cs(t)) throw Error(i(485));
                    if (t = n.action, t !== null) {
                        var g = {
                            payload: m,
                            action: t,
                            next: null,
                            isTransition: !0,
                            status: "pending",
                            value: null,
                            reason: null,
                            listeners: [],
                            then: function(E) {
                                g.listeners.push(E);
                            }
                        };
                        nt.T !== null ? l(!0) : g.isTransition = !1, f(g), l = n.pending, l === null ? (g.next = n.pending = g, fi(n, g)) : (g.next = l.next, n.pending = l.next = g);
                    }
                }
                function fi(t, n) {
                    var l = n.action, f = n.payload, m = t.state;
                    if (n.isTransition) {
                        var g = nt.T, E = {};
                        nt.T = E;
                        try {
                            var j = l(m, f), le = nt.S;
                            le !== null && le(E, j), wo(t, n, j);
                        } catch (ve) {
                            Ni(t, n, ve);
                        } finally{
                            g !== null && E.types !== null && (g.types = E.types), nt.T = g;
                        }
                    } else try {
                        g = l(m, f), wo(t, n, g);
                    } catch (ve) {
                        Ni(t, n, ve);
                    }
                }
                function wo(t, n, l) {
                    l !== null && typeof l == "object" && typeof l.then == "function" ? l.then(function(f) {
                        di(t, n, f);
                    }, function(f) {
                        return Ni(t, n, f);
                    }) : di(t, n, l);
                }
                function di(t, n, l) {
                    n.status = "fulfilled", n.value = l, ma(n), t.state = l, n = t.pending, n !== null && (l = n.next, l === n ? t.pending = null : (l = l.next, n.next = l, fi(t, l)));
                }
                function Ni(t, n, l) {
                    var f = t.pending;
                    if (t.pending = null, f !== null) {
                        f = f.next;
                        do n.status = "rejected", n.reason = l, ma(n), n = n.next;
                        while (n !== f);
                    }
                    t.action = null;
                }
                function ma(t) {
                    t = t.listeners;
                    for(var n = 0; n < t.length; n++)(0, t[n])();
                }
                function So(t, n) {
                    return n;
                }
                function ji(t, n) {
                    if (Pt) {
                        var l = Xt.formState;
                        if (l !== null) {
                            e: {
                                var f = gt;
                                if (Pt) {
                                    if (en) {
                                        var m = Y0(en, vr);
                                        if (m) {
                                            en = kh(m), f = q0(m);
                                            break e;
                                        }
                                    }
                                    Pe(f);
                                }
                                f = !1;
                            }
                            f && (n = l[0]);
                        }
                    }
                    l = ct(), l.memoizedState = l.baseState = n, f = {
                        pending: null,
                        lanes: 0,
                        dispatch: null,
                        lastRenderedReducer: So,
                        lastRenderedState: n
                    }, l.queue = f, l = Er.bind(null, gt, f), f.dispatch = l, f = ui(!1);
                    var g = fu.bind(null, gt, !1, f.queue);
                    return f = ct(), m = {
                        state: n,
                        dispatch: null,
                        action: t,
                        pending: null
                    }, f.queue = m, l = ci.bind(null, gt, m, g, l), m.dispatch = l, f.memoizedState = t, [
                        n,
                        l,
                        !1
                    ];
                }
                function ga(t) {
                    var n = mt();
                    return xo(n, Ht, t);
                }
                function xo(t, n, l) {
                    if (n = oi(t, n, So)[0], t = zn(jt)[0], typeof n == "object" && n !== null && typeof n.then == "function") try {
                        var f = dt(n);
                    } catch (E) {
                        throw E === La ? Ks : E;
                    }
                    else f = n;
                    n = mt();
                    var m = n.queue, g = m.dispatch;
                    return l !== n.memoizedState && (gt.flags |= 2048, Vr(9, {
                        destroy: void 0
                    }, ar.bind(null, m, l), null)), [
                        f,
                        g,
                        t
                    ];
                }
                function ar(t, n) {
                    t.action = n;
                }
                function va(t) {
                    var n = mt(), l = Ht;
                    if (l !== null) return xo(n, l, t);
                    mt(), n = n.memoizedState, l = mt();
                    var f = l.queue.dispatch;
                    return l.memoizedState = t, [
                        n,
                        f,
                        !1
                    ];
                }
                function Vr(t, n, l, f) {
                    return t = {
                        tag: t,
                        create: l,
                        deps: f,
                        inst: n,
                        next: null
                    }, n = gt.updateQueue, n === null && (n = At(), gt.updateQueue = n), l = n.lastEffect, l === null ? n.lastEffect = t.next = t : (f = l.next, l.next = t, t.next = f, n.lastEffect = t), t;
                }
                function _o() {
                    return mt().memoizedState;
                }
                function hi(t, n, l, f) {
                    var m = ct();
                    gt.flags |= t, m.memoizedState = Vr(1 | n, {
                        destroy: void 0
                    }, l, f === void 0 ? null : f);
                }
                function Bi(t, n, l, f) {
                    var m = mt();
                    f = f === void 0 ? null : f;
                    var g = m.memoizedState.inst;
                    Ht !== null && f !== null && an(f, Ht.memoizedState.deps) ? m.memoizedState = Vr(n, g, l, f) : (gt.flags |= t, m.memoizedState = Vr(1 | n, g, l, f));
                }
                function Eo(t, n) {
                    hi(8390656, 8, t, n);
                }
                function Xr(t, n) {
                    Bi(2048, 8, t, n);
                }
                function Gi(t) {
                    gt.flags |= 4;
                    var n = gt.updateQueue;
                    if (n === null) n = At(), gt.updateQueue = n, n.events = [
                        t
                    ];
                    else {
                        var l = n.events;
                        l === null ? n.events = [
                            t
                        ] : l.push(t);
                    }
                }
                function _r(t) {
                    var n = mt().memoizedState;
                    return Gi({
                        ref: n,
                        nextImpl: t
                    }), function() {
                        if ((wt & 2) !== 0) throw Error(i(440));
                        return n.impl.apply(void 0, arguments);
                    };
                }
                function Mo(t, n) {
                    return Bi(4, 2, t, n);
                }
                function ya(t, n) {
                    return Bi(4, 4, t, n);
                }
                function ba(t, n) {
                    if (typeof n == "function") {
                        t = t();
                        var l = n(t);
                        return function() {
                            typeof l == "function" ? l() : n(null);
                        };
                    }
                    if (n != null) return t = t(), n.current = t, function() {
                        n.current = null;
                    };
                }
                function pi(t, n, l) {
                    l = l != null ? l.concat([
                        t
                    ]) : null, Bi(4, 4, ba.bind(null, n, t), l);
                }
                function wa() {}
                function mi(t, n) {
                    var l = mt();
                    n = n === void 0 ? null : n;
                    var f = l.memoizedState;
                    return n !== null && an(n, f[1]) ? f[0] : (l.memoizedState = [
                        t,
                        n
                    ], t);
                }
                function Sa(t, n) {
                    var l = mt();
                    n = n === void 0 ? null : n;
                    var f = l.memoizedState;
                    if (n !== null && an(n, f[1])) return f[0];
                    if (f = t(), na) {
                        G(!0);
                        try {
                            t();
                        } finally{
                            G(!1);
                        }
                    }
                    return l.memoizedState = [
                        f,
                        n
                    ], f;
                }
                function Cn(t, n, l) {
                    return l === void 0 || (ei & 1073741824) !== 0 && (_t & 261930) === 0 ? t.memoizedState = n : (t.memoizedState = l, t = Hd(), gt.lanes |= t, Ci |= t, l);
                }
                function Es(t, n, l, f) {
                    return fr(l, n) ? l : ja.current !== null ? (t = Cn(t, l, f), fr(t, n) || (dn = !0), t) : (ei & 42) === 0 || (ei & 1073741824) !== 0 && (_t & 261930) === 0 ? (dn = !0, t.memoizedState = l) : (t = Hd(), gt.lanes |= t, Ci |= t, n);
                }
                function Hi(t, n, l, f, m) {
                    var g = $r();
                    xn(g !== 0 && 8 > g ? g : 8);
                    var E = nt.T, j = {};
                    nt.T = j, fu(t, !1, n, l);
                    try {
                        var le = m(), ve = nt.S;
                        if (ve !== null && ve(j, le), le !== null && typeof le == "object" && typeof le.then == "function") {
                            var De = ue(le, f);
                            gi(t, n, De, sr(t));
                        } else gi(t, n, f, sr(t));
                    } catch (_e) {
                        gi(t, n, {
                            then: function() {},
                            status: "rejected",
                            reason: _e
                        }, sr());
                    } finally{
                        xn(g), E !== null && j.types !== null && (E.types = j.types), nt.T = E;
                    }
                }
                function Wi(t) {
                    var n = t.memoizedState;
                    if (n !== null) return n;
                    n = {
                        memoizedState: Pa,
                        baseState: Pa,
                        baseQueue: null,
                        queue: {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: jt,
                            lastRenderedState: Pa
                        },
                        next: null
                    };
                    var l = {};
                    return n.next = {
                        memoizedState: l,
                        baseState: l,
                        baseQueue: null,
                        queue: {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: jt,
                            lastRenderedState: l
                        },
                        next: null
                    }, t.memoizedState = n, t = t.alternate, t !== null && (t.memoizedState = n), n;
                }
                function xa() {
                    return Se(Qi);
                }
                function Ms() {
                    return mt().memoizedState;
                }
                function Tn() {
                    return mt().memoizedState;
                }
                function or(t) {
                    for(var n = t.return; n !== null;){
                        switch(n.tag){
                            case 24:
                            case 3:
                                var l = sr();
                                t = z(l);
                                var f = Q(n, t, l);
                                f !== null && ($n(f, n, l), ae(f, n, l)), n = {
                                    cache: vt()
                                }, t.payload = n;
                                return;
                        }
                        n = n.return;
                    }
                }
                function Nn(t, n, l) {
                    var f = sr();
                    l = {
                        lane: f,
                        revertLane: 0,
                        gesture: null,
                        action: l,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    }, Cs(t) ? ed(n, l) : (l = Mn(t, n, l, f), l !== null && ($n(l, t, f), td(l, n, f)));
                }
                function Er(t, n, l) {
                    var f = sr();
                    gi(t, n, l, f);
                }
                function gi(t, n, l, f) {
                    var m = {
                        lane: f,
                        revertLane: 0,
                        gesture: null,
                        action: l,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    };
                    if (Cs(t)) ed(n, m);
                    else {
                        var g = t.alternate;
                        if (t.lanes === 0 && (g === null || g.lanes === 0) && (g = n.lastRenderedReducer, g !== null)) try {
                            var E = n.lastRenderedState, j = g(E, l);
                            if (m.hasEagerState = !0, m.eagerState = j, fr(j, E)) return gn(t, n, m, 0), Xt === null && Un(), !1;
                        } catch  {} finally{}
                        if (l = Mn(t, n, m, f), l !== null) return $n(l, t, f), td(l, n, f), !0;
                    }
                    return !1;
                }
                function fu(t, n, l, f) {
                    if (f = {
                        lane: 2,
                        revertLane: de(),
                        gesture: null,
                        action: f,
                        hasEagerState: !1,
                        eagerState: null,
                        next: null
                    }, Cs(t)) {
                        if (n) throw Error(i(479));
                    } else n = Mn(t, l, f, 2), n !== null && $n(n, t, 2);
                }
                function Cs(t) {
                    var n = t.alternate;
                    return t === gt || n !== null && n === gt;
                }
                function ed(t, n) {
                    Ba = el = !0;
                    var l = t.pending;
                    l === null ? n.next = n : (n.next = l.next, l.next = n), t.pending = n;
                }
                function td(t, n, l) {
                    if ((l & 4194048) !== 0) {
                        var f = n.lanes;
                        f &= t.pendingLanes, l |= f, n.lanes = l, I(t, l);
                    }
                }
                function du(t, n, l, f) {
                    n = t.memoizedState, l = l(f, n), l = l == null ? n : Bu({}, n, l), t.memoizedState = l, t.lanes === 0 && (t.updateQueue.baseState = l);
                }
                function nd(t, n, l, f, m, g, E) {
                    return t = t.stateNode, typeof t.shouldComponentUpdate == "function" ? t.shouldComponentUpdate(f, g, E) : n.prototype && n.prototype.isPureReactComponent ? !ft(l, f) || !ft(m, g) : !0;
                }
                function rd(t, n, l, f) {
                    t = n.state, typeof n.componentWillReceiveProps == "function" && n.componentWillReceiveProps(l, f), typeof n.UNSAFE_componentWillReceiveProps == "function" && n.UNSAFE_componentWillReceiveProps(l, f), n.state !== t && dc.enqueueReplaceState(n, n.state, null);
                }
                function Vi(t, n) {
                    var l = n;
                    if ("ref" in n) {
                        l = {};
                        for(var f in n)f !== "ref" && (l[f] = n[f]);
                    }
                    if (t = t.defaultProps) {
                        l === n && (l = Bu({}, l));
                        for(var m in t)l[m] === void 0 && (l[m] = t[m]);
                    }
                    return l;
                }
                function Ts(t, n) {
                    try {
                        var l = t.onUncaughtError;
                        l(n.value, {
                            componentStack: n.stack
                        });
                    } catch (f) {
                        setTimeout(function() {
                            throw f;
                        });
                    }
                }
                function id(t, n, l) {
                    try {
                        var f = t.onCaughtError;
                        f(l.value, {
                            componentStack: l.stack,
                            errorBoundary: n.tag === 1 ? n.stateNode : null
                        });
                    } catch (m) {
                        setTimeout(function() {
                            throw m;
                        });
                    }
                }
                function hu(t, n, l) {
                    return l = z(l), l.tag = 3, l.payload = {
                        element: null
                    }, l.callback = function() {
                        Ts(t, n);
                    }, l;
                }
                function ad(t) {
                    return t = z(t), t.tag = 3, t;
                }
                function od(t, n, l, f) {
                    var m = l.type.getDerivedStateFromError;
                    if (typeof m == "function") {
                        var g = f.value;
                        t.payload = function() {
                            return m(g);
                        }, t.callback = function() {
                            id(n, l, f);
                        };
                    }
                    var E = l.stateNode;
                    E !== null && typeof E.componentDidCatch == "function" && (t.callback = function() {
                        id(n, l, f), typeof m != "function" && (Ti === null ? Ti = new Set([
                            this
                        ]) : Ti.add(this));
                        var j = f.stack;
                        this.componentDidCatch(f.value, {
                            componentStack: j !== null ? j : ""
                        });
                    });
                }
                function Uv(t, n, l, f, m) {
                    if (l.flags |= 32768, f !== null && typeof f == "object" && typeof f.then == "function") {
                        if (n = l.alternate, n !== null && Le(n, l, m, !0), l = dr.current, l !== null) {
                            switch(l.tag){
                                case 31:
                                case 13:
                                    return kr === null ? Os() : l.alternate === null && on === 0 && (on = 3), l.flags &= -257, l.flags |= 65536, l.lanes = m, f === $s ? l.flags |= 16384 : (n = l.updateQueue, n === null ? l.updateQueue = new Set([
                                        f
                                    ]) : n.add(f), Ou(t, f, m)), !1;
                                case 22:
                                    return l.flags |= 65536, f === $s ? l.flags |= 16384 : (n = l.updateQueue, n === null ? (n = {
                                        transitions: null,
                                        markerInstances: null,
                                        retryQueue: new Set([
                                            f
                                        ])
                                    }, l.updateQueue = n) : (l = n.retryQueue, l === null ? n.retryQueue = new Set([
                                        f
                                    ]) : l.add(f)), Ou(t, f, m)), !1;
                            }
                            throw Error(i(435, l.tag));
                        }
                        return Ou(t, f, m), Os(), !1;
                    }
                    if (Pt) return n = dr.current, n !== null ? ((n.flags & 65536) === 0 && (n.flags |= 256), n.flags |= 65536, n.lanes = m, f !== ic && (t = Error(i(422), {
                        cause: f
                    }), Ae(te(t, l)))) : (f !== ic && (n = Error(i(423), {
                        cause: f
                    }), Ae(te(n, l))), t = t.current.alternate, t.flags |= 65536, m &= -m, t.lanes |= m, f = te(f, l), m = hu(t.stateNode, f, m), se(t, m), on !== 4 && (on = 2)), !1;
                    var g = Error(i(520), {
                        cause: f
                    });
                    if (g = te(g, l), Wo === null ? Wo = [
                        g
                    ] : Wo.push(g), on !== 4 && (on = 2), n === null) return !0;
                    f = te(f, l), l = n;
                    do {
                        switch(l.tag){
                            case 3:
                                return l.flags |= 65536, t = m & -m, l.lanes |= t, t = hu(l.stateNode, f, t), se(l, t), !1;
                            case 1:
                                if (n = l.type, g = l.stateNode, (l.flags & 128) === 0 && (typeof n.getDerivedStateFromError == "function" || g !== null && typeof g.componentDidCatch == "function" && (Ti === null || !Ti.has(g)))) return l.flags |= 65536, m &= -m, l.lanes |= m, m = ad(m), od(m, t, l, f), se(l, m), !1;
                        }
                        l = l.return;
                    }while (l !== null);
                    return !1;
                }
                function Pn(t, n, l, f) {
                    n.child = t === null ? Xh(n, null, l, f) : ta(n, t.child, l, f);
                }
                function sd(t, n, l, f, m) {
                    l = l.render;
                    var g = n.ref;
                    if ("ref" in f) {
                        var E = {};
                        for(var j in f)j !== "ref" && (E[j] = f[j]);
                    } else E = f;
                    return Ke(n), f = Tt(t, n, l, E, g, m), j = vn(), t !== null && !dn ? (ir(t, n, m), Yr(t, n, m)) : (Pt && j && H(n), n.flags |= 1, Pn(t, n, f, m), n.child);
                }
                function ld(t, n, l, f, m) {
                    if (t === null) {
                        var g = l.type;
                        return typeof g == "function" && !Lu(g) && g.defaultProps === void 0 && l.compare === null ? (n.tag = 15, n.type = g, ud(t, n, g, f, m)) : (t = zs(l.type, null, f, n, n.mode, m), t.ref = n.ref, t.return = n, n.child = t);
                    }
                    if (g = t.child, !wu(t, m)) {
                        var E = g.memoizedProps;
                        if (l = l.compare, l = l !== null ? l : ft, l(E, f) && t.ref === n.ref) return Yr(t, n, m);
                    }
                    return n.flags |= 1, t = Qr(g, f), t.ref = n.ref, t.return = n, n.child = t;
                }
                function ud(t, n, l, f, m) {
                    if (t !== null) {
                        var g = t.memoizedProps;
                        if (ft(g, f) && t.ref === n.ref) if (dn = !1, n.pendingProps = f = g, wu(t, m)) (t.flags & 131072) !== 0 && (dn = !0);
                        else return n.lanes = t.lanes, Yr(t, n, m);
                    }
                    return pu(t, n, l, f, m);
                }
                function cd(t, n, l, f) {
                    var m = f.children, g = t !== null ? t.memoizedState : null;
                    if (t === null && n.stateNode === null && (n.stateNode = {
                        _visibility: 1,
                        _pendingMarkers: null,
                        _retryCache: null,
                        _transitions: null
                    }), f.mode === "hidden") {
                        if ((n.flags & 128) !== 0) {
                            if (g = g !== null ? g.baseLanes | l : l, t !== null) {
                                for(f = n.child = t.child, m = 0; f !== null;)m = m | f.lanes | f.childLanes, f = f.sibling;
                                f = m & ~g;
                            } else f = 0, n.child = null;
                            return fd(t, n, g, l, f);
                        }
                        if ((l & 536870912) !== 0) n.memoizedState = {
                            baseLanes: 0,
                            cachePool: null
                        }, t !== null && Kt(n, g !== null ? g.cachePool : null), g !== null ? Te(n, g) : re(), it(n);
                        else return f = n.lanes = 536870912, fd(t, n, g !== null ? g.baseLanes | l : l, l, f);
                    } else g !== null ? (Kt(n, g.cachePool), Te(n, g), at(), n.memoizedState = null) : (t !== null && Kt(n, null), re(), at());
                    return Pn(t, n, m, l), n.child;
                }
                function Co(t, n) {
                    return t !== null && t.tag === 22 || n.stateNode !== null || (n.stateNode = {
                        _visibility: 1,
                        _pendingMarkers: null,
                        _retryCache: null,
                        _transitions: null
                    }), n.sibling;
                }
                function fd(t, n, l, f, m) {
                    var g = ot();
                    return g = g === null ? null : {
                        parent: Kr ? tn._currentValue : tn._currentValue2,
                        pool: g
                    }, n.memoizedState = {
                        baseLanes: l,
                        cachePool: g
                    }, t !== null && Kt(n, null), re(), it(n), t !== null && Le(t, n, f, !0), n.childLanes = m, null;
                }
                function Ps(t, n) {
                    return n = Rs({
                        mode: n.mode,
                        children: n.children
                    }, t.mode), n.ref = t.ref, t.child = n, n.return = t, n;
                }
                function dd(t, n, l) {
                    return ta(n, t.child, null, l), t = Ps(n, n.pendingProps), t.flags |= 2, ht(n), n.memoizedState = null, t;
                }
                function Ov(t, n, l) {
                    var f = n.pendingProps, m = (n.flags & 128) !== 0;
                    if (n.flags &= -129, t === null) {
                        if (Pt) {
                            if (f.mode === "hidden") return t = Ps(n, f), n.lanes = 536870912, Co(null, t);
                            if (Ye(n), (t = en) ? (t = r1(t, vr), t !== null && (n.memoizedState = {
                                dehydrated: t,
                                treeContext: Si !== null ? {
                                    id: Lr,
                                    overflow: zr
                                } : null,
                                retryLane: 536870912,
                                hydrationErrors: null
                            }, l = uh(t), l.return = n, n.child = l, Rn = n, en = null)) : t = null, t === null) throw Pe(n);
                            return n.lanes = 536870912, null;
                        }
                        return Ps(n, f);
                    }
                    var g = t.memoizedState;
                    if (g !== null) {
                        var E = g.dehydrated;
                        if (Ye(n), m) if (n.flags & 256) n.flags &= -257, n = dd(t, n, l);
                        else if (n.memoizedState !== null) n.child = t.child, n.flags |= 128, n = null;
                        else throw Error(i(558));
                        else if (dn || Le(t, n, l, !1), m = (l & t.childLanes) !== 0, dn || m) {
                            if (f = Xt, f !== null && (E = F(f, l), E !== 0 && E !== g.retryLane)) throw g.retryLane = E, Je(t, E), $n(f, t, E), hc;
                            Os(), n = dd(t, n, l);
                        } else t = g.treeContext, Gn && (en = $0(E), Rn = n, Pt = !0, _i = null, vr = !1, t !== null && Z(n, t)), n = Ps(n, f), n.flags |= 4096;
                        return n;
                    }
                    return t = Qr(t.child, {
                        mode: f.mode,
                        children: f.children
                    }), t.ref = n.ref, n.child = t, t.return = n, t;
                }
                function ks(t, n) {
                    var l = n.ref;
                    if (l === null) t !== null && t.ref !== null && (n.flags |= 4194816);
                    else {
                        if (typeof l != "function" && typeof l != "object") throw Error(i(284));
                        (t === null || t.ref !== l) && (n.flags |= 4194816);
                    }
                }
                function pu(t, n, l, f, m) {
                    return Ke(n), l = Tt(t, n, l, f, void 0, m), f = vn(), t !== null && !dn ? (ir(t, n, m), Yr(t, n, m)) : (Pt && f && H(n), n.flags |= 1, Pn(t, n, l, m), n.child);
                }
                function hd(t, n, l, f, m, g) {
                    return Ke(n), n.updateQueue = null, l = Dt(n, f, l, m), On(t), f = vn(), t !== null && !dn ? (ir(t, n, g), Yr(t, n, g)) : (Pt && f && H(n), n.flags |= 1, Pn(t, n, l, g), n.child);
                }
                function pd(t, n, l, f, m) {
                    if (Ke(n), n.stateNode === null) {
                        var g = Ia, E = l.contextType;
                        typeof E == "object" && E !== null && (g = Se(E)), g = new l(f, g), n.memoizedState = g.state !== null && g.state !== void 0 ? g.state : null, g.updater = dc, n.stateNode = g, g._reactInternals = n, g = n.stateNode, g.props = f, g.state = n.memoizedState, g.refs = {}, w(n), E = l.contextType, g.context = typeof E == "object" && E !== null ? Se(E) : Ia, g.state = n.memoizedState, E = l.getDerivedStateFromProps, typeof E == "function" && (du(n, l, E, f), g.state = n.memoizedState), typeof l.getDerivedStateFromProps == "function" || typeof g.getSnapshotBeforeUpdate == "function" || typeof g.UNSAFE_componentWillMount != "function" && typeof g.componentWillMount != "function" || (E = g.state, typeof g.componentWillMount == "function" && g.componentWillMount(), typeof g.UNSAFE_componentWillMount == "function" && g.UNSAFE_componentWillMount(), E !== g.state && dc.enqueueReplaceState(g, g.state, null), ge(n, f, g, m), we(), g.state = n.memoizedState), typeof g.componentDidMount == "function" && (n.flags |= 4194308), f = !0;
                    } else if (t === null) {
                        g = n.stateNode;
                        var j = n.memoizedProps, le = Vi(l, j);
                        g.props = le;
                        var ve = g.context, De = l.contextType;
                        E = Ia, typeof De == "object" && De !== null && (E = Se(De));
                        var _e = l.getDerivedStateFromProps;
                        De = typeof _e == "function" || typeof g.getSnapshotBeforeUpdate == "function", j = n.pendingProps !== j, De || typeof g.UNSAFE_componentWillReceiveProps != "function" && typeof g.componentWillReceiveProps != "function" || (j || ve !== E) && rd(n, g, f, E), Ei = !1;
                        var We = n.memoizedState;
                        g.state = We, ge(n, f, g, m), we(), ve = n.memoizedState, j || We !== ve || Ei ? (typeof _e == "function" && (du(n, l, _e, f), ve = n.memoizedState), (le = Ei || nd(n, l, le, f, We, ve, E)) ? (De || typeof g.UNSAFE_componentWillMount != "function" && typeof g.componentWillMount != "function" || (typeof g.componentWillMount == "function" && g.componentWillMount(), typeof g.UNSAFE_componentWillMount == "function" && g.UNSAFE_componentWillMount()), typeof g.componentDidMount == "function" && (n.flags |= 4194308)) : (typeof g.componentDidMount == "function" && (n.flags |= 4194308), n.memoizedProps = f, n.memoizedState = ve), g.props = f, g.state = ve, g.context = E, f = le) : (typeof g.componentDidMount == "function" && (n.flags |= 4194308), f = !1);
                    } else {
                        g = n.stateNode, C(t, n), E = n.memoizedProps, De = Vi(l, E), g.props = De, _e = n.pendingProps, We = g.context, ve = l.contextType, le = Ia, typeof ve == "object" && ve !== null && (le = Se(ve)), j = l.getDerivedStateFromProps, (ve = typeof j == "function" || typeof g.getSnapshotBeforeUpdate == "function") || typeof g.UNSAFE_componentWillReceiveProps != "function" && typeof g.componentWillReceiveProps != "function" || (E !== _e || We !== le) && rd(n, g, f, le), Ei = !1, We = n.memoizedState, g.state = We, ge(n, f, g, m), we();
                        var pt = n.memoizedState;
                        E !== _e || We !== pt || Ei || t !== null && t.dependencies !== null && me(t.dependencies) ? (typeof j == "function" && (du(n, l, j, f), pt = n.memoizedState), (De = Ei || nd(n, l, De, f, We, pt, le) || t !== null && t.dependencies !== null && me(t.dependencies)) ? (ve || typeof g.UNSAFE_componentWillUpdate != "function" && typeof g.componentWillUpdate != "function" || (typeof g.componentWillUpdate == "function" && g.componentWillUpdate(f, pt, le), typeof g.UNSAFE_componentWillUpdate == "function" && g.UNSAFE_componentWillUpdate(f, pt, le)), typeof g.componentDidUpdate == "function" && (n.flags |= 4), typeof g.getSnapshotBeforeUpdate == "function" && (n.flags |= 1024)) : (typeof g.componentDidUpdate != "function" || E === t.memoizedProps && We === t.memoizedState || (n.flags |= 4), typeof g.getSnapshotBeforeUpdate != "function" || E === t.memoizedProps && We === t.memoizedState || (n.flags |= 1024), n.memoizedProps = f, n.memoizedState = pt), g.props = f, g.state = pt, g.context = le, f = De) : (typeof g.componentDidUpdate != "function" || E === t.memoizedProps && We === t.memoizedState || (n.flags |= 4), typeof g.getSnapshotBeforeUpdate != "function" || E === t.memoizedProps && We === t.memoizedState || (n.flags |= 1024), f = !1);
                    }
                    return g = f, ks(t, n), f = (n.flags & 128) !== 0, g || f ? (g = n.stateNode, l = f && typeof l.getDerivedStateFromError != "function" ? null : g.render(), n.flags |= 1, t !== null && f ? (n.child = ta(n, t.child, null, m), n.child = ta(n, null, l, m)) : Pn(t, n, l, m), n.memoizedState = g.state, t = n.child) : t = Yr(t, n, m), t;
                }
                function md(t, n, l, f) {
                    return Ve(), n.flags |= 256, Pn(t, n, l, f), n.child;
                }
                function mu(t) {
                    return {
                        baseLanes: t,
                        cachePool: Rt()
                    };
                }
                function gu(t, n, l) {
                    return t = t !== null ? t.childLanes & ~l : 0, n && (t |= pr), t;
                }
                function gd(t, n, l) {
                    var f = n.pendingProps, m = !1, g = (n.flags & 128) !== 0, E;
                    if ((E = g) || (E = t !== null && t.memoizedState === null ? !1 : (ln.current & 2) !== 0), E && (m = !0, n.flags &= -129), E = (n.flags & 32) !== 0, n.flags &= -33, t === null) {
                        if (Pt) {
                            if (m ? He(n) : at(), (t = en) ? (t = i1(t, vr), t !== null && (n.memoizedState = {
                                dehydrated: t,
                                treeContext: Si !== null ? {
                                    id: Lr,
                                    overflow: zr
                                } : null,
                                retryLane: 536870912,
                                hydrationErrors: null
                            }, l = uh(t), l.return = n, n.child = l, Rn = n, en = null)) : t = null, t === null) throw Pe(n);
                            return Ku(t) ? n.lanes = 32 : n.lanes = 536870912, null;
                        }
                        var j = f.children;
                        return f = f.fallback, m ? (at(), m = n.mode, j = Rs({
                            mode: "hidden",
                            children: j
                        }, m), f = qi(f, m, l, null), j.return = n, f.return = n, j.sibling = f, n.child = j, f = n.child, f.memoizedState = mu(l), f.childLanes = gu(t, E, l), n.memoizedState = pc, Co(null, f)) : (He(n), vu(n, j));
                    }
                    var le = t.memoizedState;
                    if (le !== null && (j = le.dehydrated, j !== null)) {
                        if (g) n.flags & 256 ? (He(n), n.flags &= -257, n = yu(t, n, l)) : n.memoizedState !== null ? (at(), n.child = t.child, n.flags |= 128, n = null) : (at(), j = f.fallback, m = n.mode, f = Rs({
                            mode: "visible",
                            children: f.children
                        }, m), j = qi(j, m, l, null), j.flags |= 2, f.return = n, j.return = n, f.sibling = j, n.child = f, ta(n, t.child, null, l), f = n.child, f.memoizedState = mu(l), f.childLanes = gu(t, E, l), n.memoizedState = pc, n = Co(null, f));
                        else if (He(n), Ku(j)) E = V0(j).digest, f = Error(i(419)), f.stack = "", f.digest = E, Ae({
                            value: f,
                            source: null,
                            stack: null
                        }), n = yu(t, n, l);
                        else if (dn || Le(t, n, l, !1), E = (l & t.childLanes) !== 0, dn || E) {
                            if (E = Xt, E !== null && (f = F(E, l), f !== 0 && f !== le.retryLane)) throw le.retryLane = f, Je(t, f), $n(E, t, f), hc;
                            Qu(j) || Os(), n = yu(t, n, l);
                        } else Qu(j) ? (n.flags |= 192, n.child = t.child, n = null) : (t = le.treeContext, Gn && (en = J0(j), Rn = n, Pt = !0, _i = null, vr = !1, t !== null && Z(n, t)), n = vu(n, f.children), n.flags |= 4096);
                        return n;
                    }
                    return m ? (at(), j = f.fallback, m = n.mode, le = t.child, g = le.sibling, f = Qr(le, {
                        mode: "hidden",
                        children: f.children
                    }), f.subtreeFlags = le.subtreeFlags & 65011712, g !== null ? j = Qr(g, j) : (j = qi(j, m, l, null), j.flags |= 2), j.return = n, f.return = n, f.sibling = j, n.child = f, Co(null, f), f = n.child, j = t.child.memoizedState, j === null ? j = mu(l) : (m = j.cachePool, m !== null ? (le = Kr ? tn._currentValue : tn._currentValue2, m = m.parent !== le ? {
                        parent: le,
                        pool: le
                    } : m) : m = Rt(), j = {
                        baseLanes: j.baseLanes | l,
                        cachePool: m
                    }), f.memoizedState = j, f.childLanes = gu(t, E, l), n.memoizedState = pc, Co(t.child, f)) : (He(n), l = t.child, t = l.sibling, l = Qr(l, {
                        mode: "visible",
                        children: f.children
                    }), l.return = n, l.sibling = null, t !== null && (E = n.deletions, E === null ? (n.deletions = [
                        t
                    ], n.flags |= 16) : E.push(t)), n.child = l, n.memoizedState = null, l);
                }
                function vu(t, n) {
                    return n = Rs({
                        mode: "visible",
                        children: n
                    }, t.mode), n.return = t, t.child = n;
                }
                function Rs(t, n) {
                    return t = a(22, t, null, n), t.lanes = 0, t;
                }
                function yu(t, n, l) {
                    return ta(n, t.child, null, l), t = vu(n, n.pendingProps.children), t.flags |= 2, n.memoizedState = null, t;
                }
                function vd(t, n, l) {
                    t.lanes |= n;
                    var f = t.alternate;
                    f !== null && (f.lanes |= n), be(t.return, n, l);
                }
                function bu(t, n, l, f, m, g) {
                    var E = t.memoizedState;
                    E === null ? t.memoizedState = {
                        isBackwards: n,
                        rendering: null,
                        renderingStartTime: 0,
                        last: f,
                        tail: l,
                        tailMode: m,
                        treeForkCount: g
                    } : (E.isBackwards = n, E.rendering = null, E.renderingStartTime = 0, E.last = f, E.tail = l, E.tailMode = m, E.treeForkCount = g);
                }
                function yd(t, n, l) {
                    var f = n.pendingProps, m = f.revealOrder, g = f.tail;
                    f = f.children;
                    var E = ln.current, j = (E & 2) !== 0;
                    if (j ? (E = E & 1 | 2, n.flags |= 128) : E &= 1, S(ln, E), Pn(t, n, f, l), f = Pt ? Lo : 0, !j && t !== null && (t.flags & 128) !== 0) e: for(t = n.child; t !== null;){
                        if (t.tag === 13) t.memoizedState !== null && vd(t, l, n);
                        else if (t.tag === 19) vd(t, l, n);
                        else if (t.child !== null) {
                            t.child.return = t, t = t.child;
                            continue;
                        }
                        if (t === n) break e;
                        for(; t.sibling === null;){
                            if (t.return === null || t.return === n) break e;
                            t = t.return;
                        }
                        t.sibling.return = t.return, t = t.sibling;
                    }
                    switch(m){
                        case "forwards":
                            for(l = n.child, m = null; l !== null;)t = l.alternate, t !== null && xt(t) === null && (m = l), l = l.sibling;
                            l = m, l === null ? (m = n.child, n.child = null) : (m = l.sibling, l.sibling = null), bu(n, !1, m, l, g, f);
                            break;
                        case "backwards":
                        case "unstable_legacy-backwards":
                            for(l = null, m = n.child, n.child = null; m !== null;){
                                if (t = m.alternate, t !== null && xt(t) === null) {
                                    n.child = m;
                                    break;
                                }
                                t = m.sibling, m.sibling = l, l = m, m = t;
                            }
                            bu(n, !0, l, null, g, f);
                            break;
                        case "together":
                            bu(n, !1, null, null, void 0, f);
                            break;
                        default:
                            n.memoizedState = null;
                    }
                    return n.child;
                }
                function Yr(t, n, l) {
                    if (t !== null && (n.dependencies = t.dependencies), Ci |= n.lanes, (l & n.childLanes) === 0) if (t !== null) {
                        if (Le(t, n, l, !1), (l & n.childLanes) === 0) return null;
                    } else return null;
                    if (t !== null && n.child !== t.child) throw Error(i(153));
                    if (n.child !== null) {
                        for(t = n.child, l = Qr(t, t.pendingProps), n.child = l, l.return = n; t.sibling !== null;)t = t.sibling, l = l.sibling = Qr(t, t.pendingProps), l.return = n;
                        l.sibling = null;
                    }
                    return n.child;
                }
                function wu(t, n) {
                    return (t.lanes & n) !== 0 ? !0 : (t = t.dependencies, !!(t !== null && me(t)));
                }
                function Lv(t, n, l) {
                    switch(n.tag){
                        case 3:
                            $(n, n.stateNode.containerInfo), ze(n, tn, t.memoizedState.cache), Ve();
                            break;
                        case 27:
                        case 5:
                            ce(n);
                            break;
                        case 4:
                            $(n, n.stateNode.containerInfo);
                            break;
                        case 10:
                            ze(n, n.type, n.memoizedProps.value);
                            break;
                        case 31:
                            if (n.memoizedState !== null) return n.flags |= 128, Ye(n), null;
                            break;
                        case 13:
                            var f = n.memoizedState;
                            if (f !== null) return f.dehydrated !== null ? (He(n), n.flags |= 128, null) : (l & n.child.childLanes) !== 0 ? gd(t, n, l) : (He(n), t = Yr(t, n, l), t !== null ? t.sibling : null);
                            He(n);
                            break;
                        case 19:
                            var m = (t.flags & 128) !== 0;
                            if (f = (l & n.childLanes) !== 0, f || (Le(t, n, l, !1), f = (l & n.childLanes) !== 0), m) {
                                if (f) return yd(t, n, l);
                                n.flags |= 128;
                            }
                            if (m = n.memoizedState, m !== null && (m.rendering = null, m.tail = null, m.lastEffect = null), S(ln, ln.current), f) break;
                            return null;
                        case 22:
                            return n.lanes = 0, cd(t, n, l, n.pendingProps);
                        case 24:
                            ze(n, tn, t.memoizedState.cache);
                    }
                    return Yr(t, n, l);
                }
                function bd(t, n, l) {
                    if (t !== null) if (t.memoizedProps !== n.pendingProps) dn = !0;
                    else {
                        if (!wu(t, l) && (n.flags & 128) === 0) return dn = !1, Lv(t, n, l);
                        dn = (t.flags & 131072) !== 0;
                    }
                    else dn = !1, Pt && (n.flags & 1048576) !== 0 && O(n, Lo, n.index);
                    switch(n.lanes = 0, n.tag){
                        case 16:
                            e: {
                                var f = n.pendingProps;
                                if (t = $e(n.elementType), n.type = t, typeof t == "function") Lu(t) ? (f = Vi(t, f), n.tag = 1, n = pd(null, n, t, f, l)) : (n.tag = 0, n = pu(null, n, t, f, l));
                                else {
                                    if (t != null) {
                                        var m = t.$$typeof;
                                        if (m === Hu) {
                                            n.tag = 11, n = sd(null, n, t, f, l);
                                            break e;
                                        } else if (m === Xu) {
                                            n.tag = 14, n = ld(null, n, t, f, l);
                                            break e;
                                        }
                                    }
                                    throw n = v(t) || t, Error(i(306, n, ""));
                                }
                            }
                            return n;
                        case 0:
                            return pu(t, n, n.type, n.pendingProps, l);
                        case 1:
                            return f = n.type, m = Vi(f, n.pendingProps), pd(t, n, f, m, l);
                        case 3:
                            e: {
                                if ($(n, n.stateNode.containerInfo), t === null) throw Error(i(387));
                                var g = n.pendingProps;
                                m = n.memoizedState, f = m.element, C(t, n), ge(n, g, null, l);
                                var E = n.memoizedState;
                                if (g = E.cache, ze(n, tn, g), g !== m.cache && Ne(n, [
                                    tn
                                ], l, !0), we(), g = E.element, Gn && m.isDehydrated) if (m = {
                                    element: g,
                                    isDehydrated: !1,
                                    cache: E.cache
                                }, n.updateQueue.baseState = m, n.memoizedState = m, n.flags & 256) {
                                    n = md(t, n, g, l);
                                    break e;
                                } else if (g !== f) {
                                    f = te(Error(i(424)), n), Ae(f), n = md(t, n, g, l);
                                    break e;
                                } else for(Gn && (en = K0(n.stateNode.containerInfo), Rn = n, Pt = !0, _i = null, vr = !0), l = Xh(n, null, g, l), n.child = l; l;)l.flags = l.flags & -3 | 4096, l = l.sibling;
                                else {
                                    if (Ve(), g === f) {
                                        n = Yr(t, n, l);
                                        break e;
                                    }
                                    Pn(t, n, g, l);
                                }
                                n = n.child;
                            }
                            return n;
                        case 26:
                            if (Pr) return ks(t, n), t === null ? (l = Ah(n.type, null, n.pendingProps, null)) ? n.memoizedState = l : Pt || (n.stateNode = E1(n.type, n.pendingProps, xi.current, n)) : n.memoizedState = Ah(n.type, t.memoizedProps, n.pendingProps, t.memoizedState), null;
                        case 27:
                            if (bn) return ce(n), t === null && bn && Pt && (f = n.stateNode = zh(n.type, n.pendingProps, xi.current, kn.current, !1), Rn = n, vr = !0, en = e1(n.type, f, en)), Pn(t, n, n.pendingProps.children, l), ks(t, n), t === null && (n.flags |= 4194304), n.child;
                        case 5:
                            return t === null && Pt && (S1(n.type, n.pendingProps, kn.current), (m = f = en) && (f = t1(f, n.type, n.pendingProps, vr), f !== null ? (n.stateNode = f, Rn = n, en = Q0(f), vr = !1, m = !0) : m = !1), m || Pe(n)), ce(n), m = n.type, g = n.pendingProps, E = t !== null ? t.memoizedProps : null, f = g.children, Bs(m, g) ? f = null : E !== null && Bs(m, E) && (n.flags |= 32), n.memoizedState !== null && (m = Tt(t, n, $t, null, null, l), Kr ? Qi._currentValue = m : Qi._currentValue2 = m), ks(t, n), Pn(t, n, f, l), n.child;
                        case 6:
                            return t === null && Pt && (x1(n.pendingProps, kn.current), (t = l = en) && (l = n1(l, n.pendingProps, vr), l !== null ? (n.stateNode = l, Rn = n, en = null, t = !0) : t = !1), t || Pe(n)), null;
                        case 13:
                            return gd(t, n, l);
                        case 4:
                            return $(n, n.stateNode.containerInfo), f = n.pendingProps, t === null ? n.child = ta(n, null, f, l) : Pn(t, n, f, l), n.child;
                        case 11:
                            return sd(t, n, n.type, n.pendingProps, l);
                        case 7:
                            return Pn(t, n, n.pendingProps, l), n.child;
                        case 8:
                            return Pn(t, n, n.pendingProps.children, l), n.child;
                        case 12:
                            return Pn(t, n, n.pendingProps.children, l), n.child;
                        case 10:
                            return f = n.pendingProps, ze(n, n.type, f.value), Pn(t, n, f.children, l), n.child;
                        case 9:
                            return m = n.type._context, f = n.pendingProps.children, Ke(n), m = Se(m), f = f(m), n.flags |= 1, Pn(t, n, f, l), n.child;
                        case 14:
                            return ld(t, n, n.type, n.pendingProps, l);
                        case 15:
                            return ud(t, n, n.type, n.pendingProps, l);
                        case 19:
                            return yd(t, n, l);
                        case 31:
                            return Ov(t, n, l);
                        case 22:
                            return cd(t, n, l, n.pendingProps);
                        case 24:
                            return Ke(n), f = Se(tn), t === null ? (m = ot(), m === null && (m = Xt, g = vt(), m.pooledCache = g, g.refCount++, g !== null && (m.pooledCacheLanes |= l), m = g), n.memoizedState = {
                                parent: f,
                                cache: m
                            }, w(n), ze(n, tn, m)) : ((t.lanes & l) !== 0 && (C(t, n), ge(n, null, null, l), we()), m = t.memoizedState, g = n.memoizedState, m.parent !== f ? (m = {
                                parent: f,
                                cache: f
                            }, n.memoizedState = m, n.lanes === 0 && (n.memoizedState = n.updateQueue.baseState = m), ze(n, tn, f)) : (f = g.cache, ze(n, tn, f), f !== m.cache && Ne(n, [
                                tn
                            ], l, !0))), Pn(t, n, n.pendingProps.children, l), n.child;
                        case 29:
                            throw n.pendingProps;
                    }
                    throw Error(i(156, n.tag));
                }
                function Mr(t) {
                    t.flags |= 4;
                }
                function Is(t) {
                    Or && (t.flags |= 8);
                }
                function wd(t, n) {
                    if (t !== null && t.child === n.child) return !1;
                    if ((n.flags & 16) !== 0) return !0;
                    for(t = n.child; t !== null;){
                        if ((t.flags & 8218) !== 0 || (t.subtreeFlags & 8218) !== 0) return !0;
                        t = t.sibling;
                    }
                    return !1;
                }
                function Su(t, n, l, f) {
                    if (Bn) for(l = n.child; l !== null;){
                        if (l.tag === 5 || l.tag === 6) qu(t, l.stateNode);
                        else if (!(l.tag === 4 || bn && l.tag === 27) && l.child !== null) {
                            l.child.return = l, l = l.child;
                            continue;
                        }
                        if (l === n) break;
                        for(; l.sibling === null;){
                            if (l.return === null || l.return === n) return;
                            l = l.return;
                        }
                        l.sibling.return = l.return, l = l.sibling;
                    }
                    else if (Or) for(var m = n.child; m !== null;){
                        if (m.tag === 5) {
                            var g = m.stateNode;
                            l && f && (g = Th(g, m.type, m.memoizedProps)), qu(t, g);
                        } else if (m.tag === 6) g = m.stateNode, l && f && (g = Ph(g, m.memoizedProps)), qu(t, g);
                        else if (m.tag !== 4) {
                            if (m.tag === 22 && m.memoizedState !== null) g = m.child, g !== null && (g.return = m), Su(t, m, !0, !0);
                            else if (m.child !== null) {
                                m.child.return = m, m = m.child;
                                continue;
                            }
                        }
                        if (m === n) break;
                        for(; m.sibling === null;){
                            if (m.return === null || m.return === n) return;
                            m = m.return;
                        }
                        m.sibling.return = m.return, m = m.sibling;
                    }
                }
                function Sd(t, n, l, f) {
                    var m = !1;
                    if (Or) for(var g = n.child; g !== null;){
                        if (g.tag === 5) {
                            var E = g.stateNode;
                            l && f && (E = Th(E, g.type, g.memoizedProps)), Mh(t, E);
                        } else if (g.tag === 6) E = g.stateNode, l && f && (E = Ph(E, g.memoizedProps)), Mh(t, E);
                        else if (g.tag !== 4) {
                            if (g.tag === 22 && g.memoizedState !== null) m = g.child, m !== null && (m.return = g), Sd(t, g, !0, !0), m = !0;
                            else if (g.child !== null) {
                                g.child.return = g, g = g.child;
                                continue;
                            }
                        }
                        if (g === n) break;
                        for(; g.sibling === null;){
                            if (g.return === null || g.return === n) return m;
                            g = g.return;
                        }
                        g.sibling.return = g.return, g = g.sibling;
                    }
                    return m;
                }
                function xd(t, n) {
                    if (Or && wd(t, n)) {
                        t = n.stateNode;
                        var l = t.containerInfo, f = Eh();
                        Sd(f, n, !1, !1), t.pendingChildren = f, Mr(n), W0(l, f);
                    }
                }
                function xu(t, n, l, f) {
                    if (Bn) t.memoizedProps !== f && Mr(n);
                    else if (Or) {
                        var m = t.stateNode, g = t.memoizedProps;
                        if ((t = wd(t, n)) || g !== f) {
                            var E = kn.current;
                            g = H0(m, l, g, f, !t, null), g === m ? n.stateNode = m : (Is(n), bh(g, l, f, E) && Mr(n), n.stateNode = g, t && Su(g, n, !1, !1));
                        } else n.stateNode = m;
                    }
                }
                function _u(t, n, l, f, m) {
                    if ((t.mode & 32) !== 0 && (l === null ? g0(n, f) : v0(n, l, f))) {
                        if (t.flags |= 16777216, (m & 335544128) === m || Zu(n, f)) if (Sh(t.stateNode, n, f)) t.flags |= 8192;
                        else if (qd()) t.flags |= 8192;
                        else throw ea = $s, lc;
                    } else t.flags &= -16777217;
                }
                function _d(t, n) {
                    if (C1(n)) {
                        if (t.flags |= 16777216, !Lh(n)) if (qd()) t.flags |= 8192;
                        else throw ea = $s, lc;
                    } else t.flags &= -16777217;
                }
                function As(t, n) {
                    n !== null && (t.flags |= 4), t.flags & 16384 && (n = t.tag !== 22 ? U() : 536870912, t.lanes |= n, Va |= n);
                }
                function To(t, n) {
                    if (!Pt) switch(t.tailMode){
                        case "hidden":
                            n = t.tail;
                            for(var l = null; n !== null;)n.alternate !== null && (l = n), n = n.sibling;
                            l === null ? t.tail = null : l.sibling = null;
                            break;
                        case "collapsed":
                            l = t.tail;
                            for(var f = null; l !== null;)l.alternate !== null && (f = l), l = l.sibling;
                            f === null ? n || t.tail === null ? t.tail = null : t.tail.sibling = null : f.sibling = null;
                    }
                }
                function Zt(t) {
                    var n = t.alternate !== null && t.alternate.child === t.child, l = 0, f = 0;
                    if (n) for(var m = t.child; m !== null;)l |= m.lanes | m.childLanes, f |= m.subtreeFlags & 65011712, f |= m.flags & 65011712, m.return = t, m = m.sibling;
                    else for(m = t.child; m !== null;)l |= m.lanes | m.childLanes, f |= m.subtreeFlags, f |= m.flags, m.return = t, m = m.sibling;
                    return t.subtreeFlags |= f, t.childLanes = l, n;
                }
                function zv(t, n, l) {
                    var f = n.pendingProps;
                    switch(X(n), n.tag){
                        case 16:
                        case 15:
                        case 0:
                        case 11:
                        case 7:
                        case 8:
                        case 12:
                        case 9:
                        case 14:
                            return Zt(n), null;
                        case 1:
                            return Zt(n), null;
                        case 3:
                            return l = n.stateNode, f = null, t !== null && (f = t.memoizedState.cache), n.memoizedState.cache !== f && (n.flags |= 2048), Ue(tn), oe(), l.pendingContext && (l.context = l.pendingContext, l.pendingContext = null), (t === null || t.child === null) && (pe(n) ? Mr(n) : t === null || t.memoizedState.isDehydrated && (n.flags & 256) === 0 || (n.flags |= 1024, Xe())), xd(t, n), Zt(n), null;
                        case 26:
                            if (Pr) {
                                var m = n.type, g = n.memoizedState;
                                return t === null ? (Mr(n), g !== null ? (Zt(n), _d(n, g)) : (Zt(n), _u(n, m, null, f, l))) : g ? g !== t.memoizedState ? (Mr(n), Zt(n), _d(n, g)) : (Zt(n), n.flags &= -16777217) : (g = t.memoizedProps, Bn ? g !== f && Mr(n) : xu(t, n, m, f), Zt(n), _u(n, m, g, f, l)), null;
                            }
                        case 27:
                            if (bn) {
                                if (fe(n), l = xi.current, m = n.type, t !== null && n.stateNode != null) Bn ? t.memoizedProps !== f && Mr(n) : xu(t, n, m, f);
                                else {
                                    if (!f) {
                                        if (n.stateNode === null) throw Error(i(166));
                                        return Zt(n), null;
                                    }
                                    t = kn.current, pe(n) ? Ie(n, t) : (t = zh(m, f, l, t, !0), n.stateNode = t, Mr(n));
                                }
                                return Zt(n), null;
                            }
                        case 5:
                            if (fe(n), m = n.type, t !== null && n.stateNode != null) xu(t, n, m, f);
                            else {
                                if (!f) {
                                    if (n.stateNode === null) throw Error(i(166));
                                    return Zt(n), null;
                                }
                                if (g = kn.current, pe(n)) Ie(n, g), m1(n.stateNode, m, f, g) && (n.flags |= 64);
                                else {
                                    var E = l0(m, f, xi.current, g, n);
                                    Is(n), Su(E, n, !1, !1), n.stateNode = E, bh(E, m, f, g) && Mr(n);
                                }
                            }
                            return Zt(n), _u(n, n.type, t === null ? null : t.memoizedProps, n.pendingProps, l), null;
                        case 6:
                            if (t && n.stateNode != null) l = t.memoizedProps, Bn ? l !== f && Mr(n) : Or && (l !== f ? (t = xi.current, l = kn.current, Is(n), n.stateNode = wh(f, t, l, n)) : n.stateNode = t.stateNode);
                            else {
                                if (typeof f != "string" && n.stateNode === null) throw Error(i(166));
                                if (t = xi.current, l = kn.current, pe(n)) {
                                    if (!Gn) throw Error(i(176));
                                    if (t = n.stateNode, l = n.memoizedProps, f = null, m = Rn, m !== null) switch(m.tag){
                                        case 27:
                                        case 5:
                                            f = m.memoizedProps;
                                    }
                                    o1(t, l, n, f) || Pe(n, !0);
                                } else Is(n), n.stateNode = wh(f, t, l, n);
                            }
                            return Zt(n), null;
                        case 31:
                            if (l = n.memoizedState, t === null || t.memoizedState !== null) {
                                if (f = pe(n), l !== null) {
                                    if (t === null) {
                                        if (!f) throw Error(i(318));
                                        if (!Gn) throw Error(i(556));
                                        if (t = n.memoizedState, t = t !== null ? t.dehydrated : null, !t) throw Error(i(557));
                                        s1(t, n);
                                    } else Ve(), (n.flags & 128) === 0 && (n.memoizedState = null), n.flags |= 4;
                                    Zt(n), t = !1;
                                } else l = Xe(), t !== null && t.memoizedState !== null && (t.memoizedState.hydrationErrors = l), t = !0;
                                if (!t) return n.flags & 256 ? (ht(n), n) : (ht(n), null);
                                if ((n.flags & 128) !== 0) throw Error(i(558));
                            }
                            return Zt(n), null;
                        case 13:
                            if (f = n.memoizedState, t === null || t.memoizedState !== null && t.memoizedState.dehydrated !== null) {
                                if (m = pe(n), f !== null && f.dehydrated !== null) {
                                    if (t === null) {
                                        if (!m) throw Error(i(318));
                                        if (!Gn) throw Error(i(344));
                                        if (m = n.memoizedState, m = m !== null ? m.dehydrated : null, !m) throw Error(i(317));
                                        l1(m, n);
                                    } else Ve(), (n.flags & 128) === 0 && (n.memoizedState = null), n.flags |= 4;
                                    Zt(n), m = !1;
                                } else m = Xe(), t !== null && t.memoizedState !== null && (t.memoizedState.hydrationErrors = m), m = !0;
                                if (!m) return n.flags & 256 ? (ht(n), n) : (ht(n), null);
                            }
                            return ht(n), (n.flags & 128) !== 0 ? (n.lanes = l, n) : (l = f !== null, t = t !== null && t.memoizedState !== null, l && (f = n.child, m = null, f.alternate !== null && f.alternate.memoizedState !== null && f.alternate.memoizedState.cachePool !== null && (m = f.alternate.memoizedState.cachePool.pool), g = null, f.memoizedState !== null && f.memoizedState.cachePool !== null && (g = f.memoizedState.cachePool.pool), g !== m && (f.flags |= 2048)), l !== t && l && (n.child.flags |= 8192), As(n, n.updateQueue), Zt(n), null);
                        case 4:
                            return oe(), xd(t, n), t === null && d0(n.stateNode.containerInfo), Zt(n), null;
                        case 10:
                            return Ue(n.type), Zt(n), null;
                        case 19:
                            if (b(ln), f = n.memoizedState, f === null) return Zt(n), null;
                            if (m = (n.flags & 128) !== 0, g = f.rendering, g === null) if (m) To(f, !1);
                            else {
                                if (on !== 0 || t !== null && (t.flags & 128) !== 0) for(t = n.child; t !== null;){
                                    if (g = xt(t), g !== null) {
                                        for(n.flags |= 128, To(f, !1), t = g.updateQueue, n.updateQueue = t, As(n, t), n.subtreeFlags = 0, t = l, l = n.child; l !== null;)lh(l, t), l = l.sibling;
                                        return S(ln, ln.current & 1 | 2), Pt && q(n, f.treeForkCount), n.child;
                                    }
                                    t = t.sibling;
                                }
                                f.tail !== null && Jn() > Vo && (n.flags |= 128, m = !0, To(f, !1), n.lanes = 4194304);
                            }
                            else {
                                if (!m) if (t = xt(g), t !== null) {
                                    if (n.flags |= 128, m = !0, t = t.updateQueue, n.updateQueue = t, As(n, t), To(f, !0), f.tail === null && f.tailMode === "hidden" && !g.alternate && !Pt) return Zt(n), null;
                                } else 2 * Jn() - f.renderingStartTime > Vo && l !== 536870912 && (n.flags |= 128, m = !0, To(f, !1), n.lanes = 4194304);
                                f.isBackwards ? (g.sibling = n.child, n.child = g) : (t = f.last, t !== null ? t.sibling = g : n.child = g, f.last = g);
                            }
                            return f.tail !== null ? (t = f.tail, f.rendering = t, f.tail = t.sibling, f.renderingStartTime = Jn(), t.sibling = null, l = ln.current, S(ln, m ? l & 1 | 2 : l & 1), Pt && q(n, f.treeForkCount), t) : (Zt(n), null);
                        case 22:
                        case 23:
                            return ht(n), It(), f = n.memoizedState !== null, t !== null ? t.memoizedState !== null !== f && (n.flags |= 8192) : f && (n.flags |= 8192), f ? (l & 536870912) !== 0 && (n.flags & 128) === 0 && (Zt(n), n.subtreeFlags & 6 && (n.flags |= 8192)) : Zt(n), l = n.updateQueue, l !== null && As(n, l.retryQueue), l = null, t !== null && t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), f = null, n.memoizedState !== null && n.memoizedState.cachePool !== null && (f = n.memoizedState.cachePool.pool), f !== l && (n.flags |= 2048), t !== null && b(Ji), null;
                        case 24:
                            return l = null, t !== null && (l = t.memoizedState.cache), n.memoizedState.cache !== l && (n.flags |= 2048), Ue(tn), Zt(n), null;
                        case 25:
                            return null;
                        case 30:
                            return null;
                    }
                    throw Error(i(156, n.tag));
                }
                function Nv(t, n) {
                    switch(X(n), n.tag){
                        case 1:
                            return t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, n) : null;
                        case 3:
                            return Ue(tn), oe(), t = n.flags, (t & 65536) !== 0 && (t & 128) === 0 ? (n.flags = t & -65537 | 128, n) : null;
                        case 26:
                        case 27:
                        case 5:
                            return fe(n), null;
                        case 31:
                            if (n.memoizedState !== null) {
                                if (ht(n), n.alternate === null) throw Error(i(340));
                                Ve();
                            }
                            return t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, n) : null;
                        case 13:
                            if (ht(n), t = n.memoizedState, t !== null && t.dehydrated !== null) {
                                if (n.alternate === null) throw Error(i(340));
                                Ve();
                            }
                            return t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, n) : null;
                        case 19:
                            return b(ln), null;
                        case 4:
                            return oe(), null;
                        case 10:
                            return Ue(n.type), null;
                        case 22:
                        case 23:
                            return ht(n), It(), t !== null && b(Ji), t = n.flags, t & 65536 ? (n.flags = t & -65537 | 128, n) : null;
                        case 24:
                            return Ue(tn), null;
                        case 25:
                            return null;
                        default:
                            return null;
                    }
                }
                function Ed(t, n) {
                    switch(X(n), n.tag){
                        case 3:
                            Ue(tn), oe();
                            break;
                        case 26:
                        case 27:
                        case 5:
                            fe(n);
                            break;
                        case 4:
                            oe();
                            break;
                        case 31:
                            n.memoizedState !== null && ht(n);
                            break;
                        case 13:
                            ht(n);
                            break;
                        case 19:
                            b(ln);
                            break;
                        case 10:
                            Ue(n.type);
                            break;
                        case 22:
                        case 23:
                            ht(n), It(), t !== null && b(Ji);
                            break;
                        case 24:
                            Ue(tn);
                    }
                }
                function Po(t, n) {
                    try {
                        var l = n.updateQueue, f = l !== null ? l.lastEffect : null;
                        if (f !== null) {
                            var m = f.next;
                            l = m;
                            do {
                                if ((l.tag & t) === t) {
                                    f = void 0;
                                    var g = l.create, E = l.inst;
                                    f = g(), E.destroy = f;
                                }
                                l = l.next;
                            }while (l !== m);
                        }
                    } catch (j) {
                        Ut(n, n.return, j);
                    }
                }
                function vi(t, n, l) {
                    try {
                        var f = n.updateQueue, m = f !== null ? f.lastEffect : null;
                        if (m !== null) {
                            var g = m.next;
                            f = g;
                            do {
                                if ((f.tag & t) === t) {
                                    var E = f.inst, j = E.destroy;
                                    if (j !== void 0) {
                                        E.destroy = void 0, m = n;
                                        var le = l, ve = j;
                                        try {
                                            ve();
                                        } catch (De) {
                                            Ut(m, le, De);
                                        }
                                    }
                                }
                                f = f.next;
                            }while (f !== g);
                        }
                    } catch (De) {
                        Ut(n, n.return, De);
                    }
                }
                function Md(t) {
                    var n = t.updateQueue;
                    if (n !== null) {
                        var l = t.stateNode;
                        try {
                            Ce(n, l);
                        } catch (f) {
                            Ut(t, t.return, f);
                        }
                    }
                }
                function Cd(t, n, l) {
                    l.props = Vi(t.type, t.memoizedProps), l.state = t.memoizedState;
                    try {
                        l.componentWillUnmount();
                    } catch (f) {
                        Ut(t, n, f);
                    }
                }
                function ko(t, n) {
                    try {
                        var l = t.ref;
                        if (l !== null) {
                            switch(t.tag){
                                case 26:
                                case 27:
                                case 5:
                                    var f = Fo(t.stateNode);
                                    break;
                                case 30:
                                    f = t.stateNode;
                                    break;
                                default:
                                    f = t.stateNode;
                            }
                            typeof l == "function" ? t.refCleanup = l(f) : l.current = f;
                        }
                    } catch (m) {
                        Ut(t, n, m);
                    }
                }
                function Ur(t, n) {
                    var l = t.ref, f = t.refCleanup;
                    if (l !== null) if (typeof f == "function") try {
                        f();
                    } catch (m) {
                        Ut(t, n, m);
                    } finally{
                        t.refCleanup = null, t = t.alternate, t != null && (t.refCleanup = null);
                    }
                    else if (typeof l == "function") try {
                        l(null);
                    } catch (m) {
                        Ut(t, n, m);
                    }
                    else l.current = null;
                }
                function Td(t) {
                    var n = t.type, l = t.memoizedProps, f = t.stateNode;
                    try {
                        A0(f, n, l, t);
                    } catch (m) {
                        Ut(t, t.return, m);
                    }
                }
                function Eu(t, n, l) {
                    try {
                        F0(t.stateNode, t.type, l, n, t);
                    } catch (f) {
                        Ut(t, t.return, f);
                    }
                }
                function Pd(t) {
                    return t.tag === 5 || t.tag === 3 || (Pr ? t.tag === 26 : !1) || (bn ? t.tag === 27 && ka(t.type) : !1) || t.tag === 4;
                }
                function Mu(t) {
                    e: for(;;){
                        for(; t.sibling === null;){
                            if (t.return === null || Pd(t.return)) return null;
                            t = t.return;
                        }
                        for(t.sibling.return = t.return, t = t.sibling; t.tag !== 5 && t.tag !== 6 && t.tag !== 18;){
                            if (bn && t.tag === 27 && ka(t.type) || t.flags & 2 || t.child === null || t.tag === 4) continue e;
                            t.child.return = t, t = t.child;
                        }
                        if (!(t.flags & 2)) return t.stateNode;
                    }
                }
                function Cu(t, n, l) {
                    var f = t.tag;
                    if (f === 5 || f === 6) t = t.stateNode, n ? U0(l, t, n) : R0(l, t);
                    else if (f !== 4 && (bn && f === 27 && ka(t.type) && (l = t.stateNode, n = null), t = t.child, t !== null)) for(Cu(t, n, l), t = t.sibling; t !== null;)Cu(t, n, l), t = t.sibling;
                }
                function Fs(t, n, l) {
                    var f = t.tag;
                    if (f === 5 || f === 6) t = t.stateNode, n ? D0(l, t, n) : k0(l, t);
                    else if (f !== 4 && (bn && f === 27 && ka(t.type) && (l = t.stateNode), t = t.child, t !== null)) for(Fs(t, n, l), t = t.sibling; t !== null;)Fs(t, n, l), t = t.sibling;
                }
                function kd(t, n, l) {
                    t = t.containerInfo;
                    try {
                        Ch(t, l);
                    } catch (f) {
                        Ut(n, n.return, f);
                    }
                }
                function Rd(t) {
                    var n = t.stateNode, l = t.memoizedProps;
                    try {
                        P1(t.type, l, n, t);
                    } catch (f) {
                        Ut(t, t.return, f);
                    }
                }
                function jv(t, n) {
                    for(o0(t.containerInfo), _n = n; _n !== null;)if (t = _n, n = t.child, (t.subtreeFlags & 1028) !== 0 && n !== null) n.return = t, _n = n;
                    else for(; _n !== null;){
                        t = _n;
                        var l = t.alternate;
                        switch(n = t.flags, t.tag){
                            case 0:
                                if ((n & 4) !== 0 && (n = t.updateQueue, n = n !== null ? n.events : null, n !== null)) for(var f = 0; f < n.length; f++){
                                    var m = n[f];
                                    m.ref.impl = m.nextImpl;
                                }
                                break;
                            case 11:
                            case 15:
                                break;
                            case 1:
                                if ((n & 1024) !== 0 && l !== null) {
                                    n = void 0, f = t, m = l.memoizedProps, l = l.memoizedState;
                                    var g = f.stateNode;
                                    try {
                                        var E = Vi(f.type, m);
                                        n = g.getSnapshotBeforeUpdate(E, l), g.__reactInternalSnapshotBeforeUpdate = n;
                                    } catch (j) {
                                        Ut(f, f.return, j);
                                    }
                                }
                                break;
                            case 3:
                                (n & 1024) !== 0 && Bn && G0(t.stateNode.containerInfo);
                                break;
                            case 5:
                            case 26:
                            case 27:
                            case 6:
                            case 4:
                            case 17:
                                break;
                            default:
                                if ((n & 1024) !== 0) throw Error(i(163));
                        }
                        if (n = t.sibling, n !== null) {
                            n.return = t.return, _n = n;
                            break;
                        }
                        _n = t.return;
                    }
                }
                function Id(t, n, l) {
                    var f = l.flags;
                    switch(l.tag){
                        case 0:
                        case 11:
                        case 15:
                            qr(t, l), f & 4 && Po(5, l);
                            break;
                        case 1:
                            if (qr(t, l), f & 4) if (t = l.stateNode, n === null) try {
                                t.componentDidMount();
                            } catch (E) {
                                Ut(l, l.return, E);
                            }
                            else {
                                var m = Vi(l.type, n.memoizedProps);
                                n = n.memoizedState;
                                try {
                                    t.componentDidUpdate(m, n, t.__reactInternalSnapshotBeforeUpdate);
                                } catch (E) {
                                    Ut(l, l.return, E);
                                }
                            }
                            f & 64 && Md(l), f & 512 && ko(l, l.return);
                            break;
                        case 3:
                            if (qr(t, l), f & 64 && (f = l.updateQueue, f !== null)) {
                                if (t = null, l.child !== null) switch(l.child.tag){
                                    case 27:
                                    case 5:
                                        t = Fo(l.child.stateNode);
                                        break;
                                    case 1:
                                        t = l.child.stateNode;
                                }
                                try {
                                    Ce(f, t);
                                } catch (E) {
                                    Ut(l, l.return, E);
                                }
                            }
                            break;
                        case 27:
                            bn && n === null && f & 4 && Rd(l);
                        case 26:
                        case 5:
                            if (qr(t, l), n === null) {
                                if (f & 4) Td(l);
                                else if (f & 64) {
                                    t = l.type, n = l.memoizedProps, m = l.stateNode;
                                    try {
                                        f1(m, t, n, l);
                                    } catch (E) {
                                        Ut(l, l.return, E);
                                    }
                                }
                            }
                            f & 512 && ko(l, l.return);
                            break;
                        case 12:
                            qr(t, l);
                            break;
                        case 31:
                            qr(t, l), f & 4 && Fd(t, l);
                            break;
                        case 13:
                            qr(t, l), f & 4 && Dd(t, l), f & 64 && (f = l.memoizedState, f !== null && (f = f.dehydrated, f !== null && (l = Yv.bind(null, l), X0(f, l))));
                            break;
                        case 22:
                            if (f = l.memoizedState !== null || ti, !f) {
                                n = n !== null && n.memoizedState !== null || hn, m = ti;
                                var g = hn;
                                ti = f, (hn = n) && !g ? Zr(t, l, (l.subtreeFlags & 8772) !== 0) : qr(t, l), ti = m, hn = g;
                            }
                            break;
                        case 30:
                            break;
                        default:
                            qr(t, l);
                    }
                }
                function Ad(t) {
                    var n = t.alternate;
                    n !== null && (t.alternate = null, Ad(n)), t.child = null, t.deletions = null, t.sibling = null, t.tag === 5 && (n = t.stateNode, n !== null && m0(n)), t.stateNode = null, t.return = null, t.dependencies = null, t.memoizedProps = null, t.memoizedState = null, t.pendingProps = null, t.stateNode = null, t.updateQueue = null;
                }
                function Cr(t, n, l) {
                    for(l = l.child; l !== null;)Tu(t, n, l), l = l.sibling;
                }
                function Tu(t, n, l) {
                    if (cr && typeof cr.onCommitFiberUnmount == "function") try {
                        cr.onCommitFiberUnmount(Oo, l);
                    } catch  {}
                    switch(l.tag){
                        case 26:
                            if (Pr) {
                                hn || Ur(l, n), Cr(t, n, l), l.memoizedState ? Dh(l.memoizedState) : l.stateNode && Oh(l.stateNode);
                                break;
                            }
                        case 27:
                            if (bn) {
                                hn || Ur(l, n);
                                var f = pn, m = er;
                                ka(l.type) && (pn = l.stateNode, er = !1), Cr(t, n, l), Nh(l.stateNode), pn = f, er = m;
                                break;
                            }
                        case 5:
                            hn || Ur(l, n);
                        case 6:
                            if (Bn) {
                                if (f = pn, m = er, pn = null, Cr(t, n, l), pn = f, er = m, pn !== null) if (er) try {
                                    L0(pn, l.stateNode);
                                } catch (g) {
                                    Ut(l, n, g);
                                }
                                else try {
                                    O0(pn, l.stateNode);
                                } catch (g) {
                                    Ut(l, n, g);
                                }
                            } else Cr(t, n, l);
                            break;
                        case 18:
                            Bn && pn !== null && (er ? y1(pn, l.stateNode) : v1(pn, l.stateNode));
                            break;
                        case 4:
                            Bn ? (f = pn, m = er, pn = l.stateNode.containerInfo, er = !0, Cr(t, n, l), pn = f, er = m) : (Or && kd(l.stateNode, l, Eh()), Cr(t, n, l));
                            break;
                        case 0:
                        case 11:
                        case 14:
                        case 15:
                            vi(2, l, n), hn || vi(4, l, n), Cr(t, n, l);
                            break;
                        case 1:
                            hn || (Ur(l, n), f = l.stateNode, typeof f.componentWillUnmount == "function" && Cd(l, n, f)), Cr(t, n, l);
                            break;
                        case 21:
                            Cr(t, n, l);
                            break;
                        case 22:
                            hn = (f = hn) || l.memoizedState !== null, Cr(t, n, l), hn = f;
                            break;
                        default:
                            Cr(t, n, l);
                    }
                }
                function Fd(t, n) {
                    if (Gn && n.memoizedState === null && (t = n.alternate, t !== null && (t = t.memoizedState, t !== null))) {
                        t = t.dehydrated;
                        try {
                            h1(t);
                        } catch (l) {
                            Ut(n, n.return, l);
                        }
                    }
                }
                function Dd(t, n) {
                    if (Gn && n.memoizedState === null && (t = n.alternate, t !== null && (t = t.memoizedState, t !== null && (t = t.dehydrated, t !== null)))) try {
                        p1(t);
                    } catch (l) {
                        Ut(n, n.return, l);
                    }
                }
                function Bv(t) {
                    switch(t.tag){
                        case 31:
                        case 13:
                        case 19:
                            var n = t.stateNode;
                            return n === null && (n = t.stateNode = new Zh), n;
                        case 22:
                            return t = t.stateNode, n = t._retryCache, n === null && (n = t._retryCache = new Zh), n;
                        default:
                            throw Error(i(435, t.tag));
                    }
                }
                function Ds(t, n) {
                    var l = Bv(t);
                    n.forEach(function(f) {
                        if (!l.has(f)) {
                            l.add(f);
                            var m = qv.bind(null, t, f);
                            f.then(m, m);
                        }
                    });
                }
                function jn(t, n) {
                    var l = n.deletions;
                    if (l !== null) for(var f = 0; f < l.length; f++){
                        var m = l[f], g = t, E = n;
                        if (Bn) {
                            var j = E;
                            e: for(; j !== null;){
                                switch(j.tag){
                                    case 27:
                                        if (bn) {
                                            if (ka(j.type)) {
                                                pn = j.stateNode, er = !1;
                                                break e;
                                            }
                                            break;
                                        }
                                    case 5:
                                        pn = j.stateNode, er = !1;
                                        break e;
                                    case 3:
                                    case 4:
                                        pn = j.stateNode.containerInfo, er = !0;
                                        break e;
                                }
                                j = j.return;
                            }
                            if (pn === null) throw Error(i(160));
                            Tu(g, E, m), pn = null, er = !1;
                        } else Tu(g, E, m);
                        g = m.alternate, g !== null && (g.return = null), m.return = null;
                    }
                    if (n.subtreeFlags & 13886) for(n = n.child; n !== null;)Ud(n, t), n = n.sibling;
                }
                function Ud(t, n) {
                    var l = t.alternate, f = t.flags;
                    switch(t.tag){
                        case 0:
                        case 11:
                        case 14:
                        case 15:
                            jn(n, t), qn(t), f & 4 && (vi(3, t, t.return), Po(3, t), vi(5, t, t.return));
                            break;
                        case 1:
                            jn(n, t), qn(t), f & 512 && (hn || l === null || Ur(l, l.return)), f & 64 && ti && (t = t.updateQueue, t !== null && (f = t.callbacks, f !== null && (l = t.shared.hiddenCallbacks, t.shared.hiddenCallbacks = l === null ? f : l.concat(f))));
                            break;
                        case 26:
                            if (Pr) {
                                var m = Rr;
                                if (jn(n, t), qn(t), f & 512 && (hn || l === null || Ur(l, l.return)), f & 4) {
                                    f = l !== null ? l.memoizedState : null;
                                    var g = t.memoizedState;
                                    l === null ? g === null ? t.stateNode === null ? t.stateNode = _1(m, t.type, t.memoizedProps, t) : Uh(m, t.type, t.stateNode) : t.stateNode = Fh(m, g, t.memoizedProps) : f !== g ? (f === null ? l.stateNode !== null && Oh(l.stateNode) : Dh(f), g === null ? Uh(m, t.type, t.stateNode) : Fh(m, g, t.memoizedProps)) : g === null && t.stateNode !== null && Eu(t, t.memoizedProps, l.memoizedProps);
                                }
                                break;
                            }
                        case 27:
                            if (bn) {
                                jn(n, t), qn(t), f & 512 && (hn || l === null || Ur(l, l.return)), l !== null && f & 4 && Eu(t, t.memoizedProps, l.memoizedProps);
                                break;
                            }
                        case 5:
                            if (jn(n, t), qn(t), f & 512 && (hn || l === null || Ur(l, l.return)), Bn) {
                                if (t.flags & 32) {
                                    m = t.stateNode;
                                    try {
                                        _h(m);
                                    } catch (_e) {
                                        Ut(t, t.return, _e);
                                    }
                                }
                                f & 4 && t.stateNode != null && (m = t.memoizedProps, Eu(t, m, l !== null ? l.memoizedProps : m)), f & 1024 && (mc = !0);
                            } else Or && t.alternate !== null && (t.alternate.stateNode = t.stateNode);
                            break;
                        case 6:
                            if (jn(n, t), qn(t), f & 4 && Bn) {
                                if (t.stateNode === null) throw Error(i(162));
                                f = t.memoizedProps, l = l !== null ? l.memoizedProps : f, m = t.stateNode;
                                try {
                                    I0(m, l, f);
                                } catch (_e) {
                                    Ut(t, t.return, _e);
                                }
                            }
                            break;
                        case 3:
                            if (Pr ? (M1(), m = Rr, Rr = $u(n.containerInfo), jn(n, t), Rr = m) : jn(n, t), qn(t), f & 4) {
                                if (Bn && Gn && l !== null && l.memoizedState.isDehydrated) try {
                                    d1(n.containerInfo);
                                } catch (_e) {
                                    Ut(t, t.return, _e);
                                }
                                if (Or) {
                                    f = n.containerInfo, l = n.pendingChildren;
                                    try {
                                        Ch(f, l);
                                    } catch (_e) {
                                        Ut(t, t.return, _e);
                                    }
                                }
                            }
                            mc && (mc = !1, Od(t));
                            break;
                        case 4:
                            Pr ? (l = Rr, Rr = $u(t.stateNode.containerInfo), jn(n, t), qn(t), Rr = l) : (jn(n, t), qn(t)), f & 4 && Or && kd(t.stateNode, t, t.stateNode.pendingChildren);
                            break;
                        case 12:
                            jn(n, t), qn(t);
                            break;
                        case 31:
                            jn(n, t), qn(t), f & 4 && (f = t.updateQueue, f !== null && (t.updateQueue = null, Ds(t, f)));
                            break;
                        case 13:
                            jn(n, t), qn(t), t.child.flags & 8192 && t.memoizedState !== null != (l !== null && l.memoizedState !== null) && (sl = Jn()), f & 4 && (f = t.updateQueue, f !== null && (t.updateQueue = null, Ds(t, f)));
                            break;
                        case 22:
                            m = t.memoizedState !== null;
                            var E = l !== null && l.memoizedState !== null, j = ti, le = hn;
                            if (ti = j || m, hn = le || E, jn(n, t), hn = le, ti = j, qn(t), f & 8192 && (n = t.stateNode, n._visibility = m ? n._visibility & -2 : n._visibility | 1, m && (l === null || E || ti || hn || Xi(t)), Bn)) {
                                e: if (l = null, Bn) for(n = t;;){
                                    if (n.tag === 5 || Pr && n.tag === 26) {
                                        if (l === null) {
                                            E = l = n;
                                            try {
                                                g = E.stateNode, m ? z0(g) : j0(E.stateNode, E.memoizedProps);
                                            } catch (_e) {
                                                Ut(E, E.return, _e);
                                            }
                                        }
                                    } else if (n.tag === 6) {
                                        if (l === null) {
                                            E = n;
                                            try {
                                                var ve = E.stateNode;
                                                m ? N0(ve) : B0(ve, E.memoizedProps);
                                            } catch (_e) {
                                                Ut(E, E.return, _e);
                                            }
                                        }
                                    } else if (n.tag === 18) {
                                        if (l === null) {
                                            E = n;
                                            try {
                                                var De = E.stateNode;
                                                m ? b1(De) : w1(E.stateNode);
                                            } catch (_e) {
                                                Ut(E, E.return, _e);
                                            }
                                        }
                                    } else if ((n.tag !== 22 && n.tag !== 23 || n.memoizedState === null || n === t) && n.child !== null) {
                                        n.child.return = n, n = n.child;
                                        continue;
                                    }
                                    if (n === t) break e;
                                    for(; n.sibling === null;){
                                        if (n.return === null || n.return === t) break e;
                                        l === n && (l = null), n = n.return;
                                    }
                                    l === n && (l = null), n.sibling.return = n.return, n = n.sibling;
                                }
                            }
                            f & 4 && (f = t.updateQueue, f !== null && (l = f.retryQueue, l !== null && (f.retryQueue = null, Ds(t, l))));
                            break;
                        case 19:
                            jn(n, t), qn(t), f & 4 && (f = t.updateQueue, f !== null && (t.updateQueue = null, Ds(t, f)));
                            break;
                        case 30:
                            break;
                        case 21:
                            break;
                        default:
                            jn(n, t), qn(t);
                    }
                }
                function qn(t) {
                    var n = t.flags;
                    if (n & 2) {
                        try {
                            for(var l, f = t.return; f !== null;){
                                if (Pd(f)) {
                                    l = f;
                                    break;
                                }
                                f = f.return;
                            }
                            if (Bn) {
                                if (l == null) throw Error(i(160));
                                switch(l.tag){
                                    case 27:
                                        if (bn) {
                                            var m = l.stateNode, g = Mu(t);
                                            Fs(t, g, m);
                                            break;
                                        }
                                    case 5:
                                        var E = l.stateNode;
                                        l.flags & 32 && (_h(E), l.flags &= -33);
                                        var j = Mu(t);
                                        Fs(t, j, E);
                                        break;
                                    case 3:
                                    case 4:
                                        var le = l.stateNode.containerInfo, ve = Mu(t);
                                        Cu(t, ve, le);
                                        break;
                                    default:
                                        throw Error(i(161));
                                }
                            }
                        } catch (De) {
                            Ut(t, t.return, De);
                        }
                        t.flags &= -3;
                    }
                    n & 4096 && (t.flags &= -4097);
                }
                function Od(t) {
                    if (t.subtreeFlags & 1024) for(t = t.child; t !== null;){
                        var n = t;
                        Od(n), n.tag === 5 && n.flags & 1024 && w0(n.stateNode), t = t.sibling;
                    }
                }
                function qr(t, n) {
                    if (n.subtreeFlags & 8772) for(n = n.child; n !== null;)Id(t, n.alternate, n), n = n.sibling;
                }
                function Xi(t) {
                    for(t = t.child; t !== null;){
                        var n = t;
                        switch(n.tag){
                            case 0:
                            case 11:
                            case 14:
                            case 15:
                                vi(4, n, n.return), Xi(n);
                                break;
                            case 1:
                                Ur(n, n.return);
                                var l = n.stateNode;
                                typeof l.componentWillUnmount == "function" && Cd(n, n.return, l), Xi(n);
                                break;
                            case 27:
                                bn && Nh(n.stateNode);
                            case 26:
                            case 5:
                                Ur(n, n.return), Xi(n);
                                break;
                            case 22:
                                n.memoizedState === null && Xi(n);
                                break;
                            case 30:
                                Xi(n);
                                break;
                            default:
                                Xi(n);
                        }
                        t = t.sibling;
                    }
                }
                function Zr(t, n, l) {
                    for(l = l && (n.subtreeFlags & 8772) !== 0, n = n.child; n !== null;){
                        var f = n.alternate, m = t, g = n, E = g.flags;
                        switch(g.tag){
                            case 0:
                            case 11:
                            case 15:
                                Zr(m, g, l), Po(4, g);
                                break;
                            case 1:
                                if (Zr(m, g, l), f = g, m = f.stateNode, typeof m.componentDidMount == "function") try {
                                    m.componentDidMount();
                                } catch (ve) {
                                    Ut(f, f.return, ve);
                                }
                                if (f = g, m = f.updateQueue, m !== null) {
                                    var j = f.stateNode;
                                    try {
                                        var le = m.shared.hiddenCallbacks;
                                        if (le !== null) for(m.shared.hiddenCallbacks = null, m = 0; m < le.length; m++)Me(le[m], j);
                                    } catch (ve) {
                                        Ut(f, f.return, ve);
                                    }
                                }
                                l && E & 64 && Md(g), ko(g, g.return);
                                break;
                            case 27:
                                bn && Rd(g);
                            case 26:
                            case 5:
                                Zr(m, g, l), l && f === null && E & 4 && Td(g), ko(g, g.return);
                                break;
                            case 12:
                                Zr(m, g, l);
                                break;
                            case 31:
                                Zr(m, g, l), l && E & 4 && Fd(m, g);
                                break;
                            case 13:
                                Zr(m, g, l), l && E & 4 && Dd(m, g);
                                break;
                            case 22:
                                g.memoizedState === null && Zr(m, g, l), ko(g, g.return);
                                break;
                            case 30:
                                break;
                            default:
                                Zr(m, g, l);
                        }
                        n = n.sibling;
                    }
                }
                function Pu(t, n) {
                    var l = null;
                    t !== null && t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), t = null, n.memoizedState !== null && n.memoizedState.cachePool !== null && (t = n.memoizedState.cachePool.pool), t !== l && (t != null && t.refCount++, l != null && Oe(l));
                }
                function ku(t, n) {
                    t = null, n.alternate !== null && (t = n.alternate.memoizedState.cache), n = n.memoizedState.cache, n !== t && (n.refCount++, t != null && Oe(t));
                }
                function Tr(t, n, l, f) {
                    if (n.subtreeFlags & 10256) for(n = n.child; n !== null;)Ld(t, n, l, f), n = n.sibling;
                }
                function Ld(t, n, l, f) {
                    var m = n.flags;
                    switch(n.tag){
                        case 0:
                        case 11:
                        case 15:
                            Tr(t, n, l, f), m & 2048 && Po(9, n);
                            break;
                        case 1:
                            Tr(t, n, l, f);
                            break;
                        case 3:
                            Tr(t, n, l, f), m & 2048 && (t = null, n.alternate !== null && (t = n.alternate.memoizedState.cache), n = n.memoizedState.cache, n !== t && (n.refCount++, t != null && Oe(t)));
                            break;
                        case 12:
                            if (m & 2048) {
                                Tr(t, n, l, f), t = n.stateNode;
                                try {
                                    var g = n.memoizedProps, E = g.id, j = g.onPostCommit;
                                    typeof j == "function" && j(E, n.alternate === null ? "mount" : "update", t.passiveEffectDuration, -0);
                                } catch (le) {
                                    Ut(n, n.return, le);
                                }
                            } else Tr(t, n, l, f);
                            break;
                        case 31:
                            Tr(t, n, l, f);
                            break;
                        case 13:
                            Tr(t, n, l, f);
                            break;
                        case 23:
                            break;
                        case 22:
                            g = n.stateNode, E = n.alternate, n.memoizedState !== null ? g._visibility & 2 ? Tr(t, n, l, f) : Ro(t, n) : g._visibility & 2 ? Tr(t, n, l, f) : (g._visibility |= 2, _a(t, n, l, f, (n.subtreeFlags & 10256) !== 0 || !1)), m & 2048 && Pu(E, n);
                            break;
                        case 24:
                            Tr(t, n, l, f), m & 2048 && ku(n.alternate, n);
                            break;
                        default:
                            Tr(t, n, l, f);
                    }
                }
                function _a(t, n, l, f, m) {
                    for(m = m && ((n.subtreeFlags & 10256) !== 0 || !1), n = n.child; n !== null;){
                        var g = t, E = n, j = l, le = f, ve = E.flags;
                        switch(E.tag){
                            case 0:
                            case 11:
                            case 15:
                                _a(g, E, j, le, m), Po(8, E);
                                break;
                            case 23:
                                break;
                            case 22:
                                var De = E.stateNode;
                                E.memoizedState !== null ? De._visibility & 2 ? _a(g, E, j, le, m) : Ro(g, E) : (De._visibility |= 2, _a(g, E, j, le, m)), m && ve & 2048 && Pu(E.alternate, E);
                                break;
                            case 24:
                                _a(g, E, j, le, m), m && ve & 2048 && ku(E.alternate, E);
                                break;
                            default:
                                _a(g, E, j, le, m);
                        }
                        n = n.sibling;
                    }
                }
                function Ro(t, n) {
                    if (n.subtreeFlags & 10256) for(n = n.child; n !== null;){
                        var l = t, f = n, m = f.flags;
                        switch(f.tag){
                            case 22:
                                Ro(l, f), m & 2048 && Pu(f.alternate, f);
                                break;
                            case 24:
                                Ro(l, f), m & 2048 && ku(f.alternate, f);
                                break;
                            default:
                                Ro(l, f);
                        }
                        n = n.sibling;
                    }
                }
                function Yi(t, n, l) {
                    if (t.subtreeFlags & Ha) for(t = t.child; t !== null;)zd(t, n, l), t = t.sibling;
                }
                function zd(t, n, l) {
                    switch(t.tag){
                        case 26:
                            if (Yi(t, n, l), t.flags & Ha) if (t.memoizedState !== null) T1(l, Rr, t.memoizedState, t.memoizedProps);
                            else {
                                var f = t.stateNode, m = t.type;
                                t = t.memoizedProps, ((n & 335544128) === n || Zu(m, t)) && xh(l, f, m, t);
                            }
                            break;
                        case 5:
                            Yi(t, n, l), t.flags & Ha && (f = t.stateNode, m = t.type, t = t.memoizedProps, ((n & 335544128) === n || Zu(m, t)) && xh(l, f, m, t));
                            break;
                        case 3:
                        case 4:
                            Pr ? (f = Rr, Rr = $u(t.stateNode.containerInfo), Yi(t, n, l), Rr = f) : Yi(t, n, l);
                            break;
                        case 22:
                            t.memoizedState === null && (f = t.alternate, f !== null && f.memoizedState !== null ? (f = Ha, Ha = 16777216, Yi(t, n, l), Ha = f) : Yi(t, n, l));
                            break;
                        default:
                            Yi(t, n, l);
                    }
                }
                function Nd(t) {
                    var n = t.alternate;
                    if (n !== null && (t = n.child, t !== null)) {
                        n.child = null;
                        do n = t.sibling, t.sibling = null, t = n;
                        while (t !== null);
                    }
                }
                function Io(t) {
                    var n = t.deletions;
                    if ((t.flags & 16) !== 0) {
                        if (n !== null) for(var l = 0; l < n.length; l++){
                            var f = n[l];
                            _n = f, Bd(f, t);
                        }
                        Nd(t);
                    }
                    if (t.subtreeFlags & 10256) for(t = t.child; t !== null;)jd(t), t = t.sibling;
                }
                function jd(t) {
                    switch(t.tag){
                        case 0:
                        case 11:
                        case 15:
                            Io(t), t.flags & 2048 && vi(9, t, t.return);
                            break;
                        case 3:
                            Io(t);
                            break;
                        case 12:
                            Io(t);
                            break;
                        case 22:
                            var n = t.stateNode;
                            t.memoizedState !== null && n._visibility & 2 && (t.return === null || t.return.tag !== 13) ? (n._visibility &= -3, Us(t)) : Io(t);
                            break;
                        default:
                            Io(t);
                    }
                }
                function Us(t) {
                    var n = t.deletions;
                    if ((t.flags & 16) !== 0) {
                        if (n !== null) for(var l = 0; l < n.length; l++){
                            var f = n[l];
                            _n = f, Bd(f, t);
                        }
                        Nd(t);
                    }
                    for(t = t.child; t !== null;){
                        switch(n = t, n.tag){
                            case 0:
                            case 11:
                            case 15:
                                vi(8, n, n.return), Us(n);
                                break;
                            case 22:
                                l = n.stateNode, l._visibility & 2 && (l._visibility &= -3, Us(n));
                                break;
                            default:
                                Us(n);
                        }
                        t = t.sibling;
                    }
                }
                function Bd(t, n) {
                    for(; _n !== null;){
                        var l = _n;
                        switch(l.tag){
                            case 0:
                            case 11:
                            case 15:
                                vi(8, l, n);
                                break;
                            case 23:
                            case 22:
                                if (l.memoizedState !== null && l.memoizedState.cachePool !== null) {
                                    var f = l.memoizedState.cachePool.pool;
                                    f != null && f.refCount++;
                                }
                                break;
                            case 24:
                                Oe(l.memoizedState.cache);
                        }
                        if (f = l.child, f !== null) f.return = l, _n = f;
                        else e: for(l = t; _n !== null;){
                            f = _n;
                            var m = f.sibling, g = f.return;
                            if (Ad(f), f === l) {
                                _n = null;
                                break e;
                            }
                            if (m !== null) {
                                m.return = g, _n = m;
                                break e;
                            }
                            _n = g;
                        }
                    }
                }
                function Ru(t) {
                    var n = f0(t);
                    if (n != null) {
                        if (typeof n.memoizedProps["data-testname"] != "string") throw Error(i(364));
                        return n;
                    }
                    if (t = _0(t), t === null) throw Error(i(362));
                    return t.stateNode.current;
                }
                function Iu(t, n) {
                    var l = t.tag;
                    switch(n.$$typeof){
                        case nl:
                            if (t.type === n.value) return !0;
                            break;
                        case rl:
                            e: {
                                for(n = n.value, t = [
                                    t,
                                    0
                                ], l = 0; l < t.length;){
                                    var f = t[l++], m = f.tag, g = t[l++], E = n[g];
                                    if (m !== 5 && m !== 26 && m !== 27 || !Uo(f)) {
                                        for(; E != null && Iu(f, E);)g++, E = n[g];
                                        if (g === n.length) {
                                            n = !0;
                                            break e;
                                        } else for(f = f.child; f !== null;)t.push(f, g), f = f.sibling;
                                    }
                                }
                                n = !1;
                            }
                            return n;
                        case il:
                            if ((l === 5 || l === 26 || l === 27) && C0(t.stateNode, n.value)) return !0;
                            break;
                        case ol:
                            if ((l === 5 || l === 6 || l === 26 || l === 27) && (t = M0(t), t !== null && 0 <= t.indexOf(n.value))) return !0;
                            break;
                        case al:
                            if ((l === 5 || l === 26 || l === 27) && (t = t.memoizedProps["data-testname"], typeof t == "string" && t.toLowerCase() === n.value.toLowerCase())) return !0;
                            break;
                        default:
                            throw Error(i(365));
                    }
                    return !1;
                }
                function Au(t) {
                    switch(t.$$typeof){
                        case nl:
                            return "<" + (v(t.value) || "Unknown") + ">";
                        case rl:
                            return ":has(" + (Au(t) || "") + ")";
                        case il:
                            return '[role="' + t.value + '"]';
                        case ol:
                            return '"' + t.value + '"';
                        case al:
                            return '[data-testname="' + t.value + '"]';
                        default:
                            throw Error(i(365));
                    }
                }
                function Gd(t, n) {
                    var l = [];
                    t = [
                        t,
                        0
                    ];
                    for(var f = 0; f < t.length;){
                        var m = t[f++], g = m.tag, E = t[f++], j = n[E];
                        if (g !== 5 && g !== 26 && g !== 27 || !Uo(m)) {
                            for(; j != null && Iu(m, j);)E++, j = n[E];
                            if (E === n.length) l.push(m);
                            else for(m = m.child; m !== null;)t.push(m, E), m = m.sibling;
                        }
                    }
                    return l;
                }
                function Fu(t, n) {
                    if (!Do) throw Error(i(363));
                    t = Ru(t), t = Gd(t, n), n = [], t = Array.from(t);
                    for(var l = 0; l < t.length;){
                        var f = t[l++], m = f.tag;
                        if (m === 5 || m === 26 || m === 27) Uo(f) || n.push(f.stateNode);
                        else for(f = f.child; f !== null;)t.push(f), f = f.sibling;
                    }
                    return n;
                }
                function sr() {
                    return (wt & 2) !== 0 && _t !== 0 ? _t & -_t : nt.T !== null ? de() : h0();
                }
                function Hd() {
                    if (pr === 0) if ((_t & 536870912) === 0 || Pt) {
                        var t = Hs;
                        Hs <<= 1, (Hs & 3932160) === 0 && (Hs = 262144), pr = t;
                    } else pr = 536870912;
                    return t = dr.current, t !== null && (t.flags |= 32), pr;
                }
                function $n(t, n, l) {
                    (t === Xt && (Bt === 2 || Bt === 9) || t.cancelPendingCommit !== null) && (Ea(t, 0), yi(t, _t, pr, !1)), R(t, l), ((wt & 2) === 0 || t !== Xt) && (t === Xt && ((wt & 2) === 0 && (ra |= l), on === 4 && yi(t, _t, pr, !1)), Be(t));
                }
                function Wd(t, n, l) {
                    if ((wt & 6) !== 0) throw Error(i(327));
                    var f = !l && (n & 127) === 0 && (n & t.expiredLanes) === 0 || T(t, n), m = f ? Wv(t, n) : Uu(t, n, !0), g = f;
                    do {
                        if (m === 0) {
                            Wa && !f && yi(t, n, 0, !1);
                            break;
                        } else {
                            if (l = t.current.alternate, g && !Gv(l)) {
                                m = Uu(t, n, !1), g = !1;
                                continue;
                            }
                            if (m === 2) {
                                if (g = n, t.errorRecoveryDisabledLanes & g) var E = 0;
                                else E = t.pendingLanes & -536870913, E = E !== 0 ? E : E & 536870912 ? 536870912 : 0;
                                if (E !== 0) {
                                    n = E;
                                    e: {
                                        var j = t;
                                        m = Wo;
                                        var le = Gn && j.current.memoizedState.isDehydrated;
                                        if (le && (Ea(j, E).flags |= 256), E = Uu(j, E, !1), E !== 2) {
                                            if (gc && !le) {
                                                j.errorRecoveryDisabledLanes |= g, ra |= g, m = 4;
                                                break e;
                                            }
                                            g = tr, tr = m, g !== null && (tr === null ? tr = g : tr.push.apply(tr, g));
                                        }
                                        m = E;
                                    }
                                    if (g = !1, m !== 2) continue;
                                }
                            }
                            if (m === 1) {
                                Ea(t, 0), yi(t, n, 0, !0);
                                break;
                            }
                            e: {
                                switch(f = t, g = m, g){
                                    case 0:
                                    case 1:
                                        throw Error(i(345));
                                    case 4:
                                        if ((n & 4194048) !== n) break;
                                    case 6:
                                        yi(f, n, pr, !Mi);
                                        break e;
                                    case 2:
                                        tr = null;
                                        break;
                                    case 3:
                                    case 5:
                                        break;
                                    default:
                                        throw Error(i(329));
                                }
                                if ((n & 62914560) === n && (m = sl + 300 - Jn(), 10 < m)) {
                                    if (yi(f, n, pr, !Mi), k(f, 0, !0) !== 0) break e;
                                    ri = n, f.timeoutHandle = u0(Vd.bind(null, f, l, tr, ll, yc, n, pr, ra, Va, Mi, g, "Throttled", -0, 0), m);
                                    break e;
                                }
                                Vd(f, l, tr, ll, yc, n, pr, ra, Va, Mi, g, null, -0, 0);
                            }
                        }
                        break;
                    }while (!0);
                    Be(t);
                }
                function Vd(t, n, l, f, m, g, E, j, le, ve, De, _e, We, pt) {
                    if (t.timeoutHandle = Zi, _e = n.subtreeFlags, _e & 8192 || (_e & 16785408) === 16785408) {
                        _e = y0(), zd(n, g, _e);
                        var mn = (g & 62914560) === g ? sl - Jn() : (g & 4194048) === g ? Qh - Jn() : 0;
                        if (mn = b0(_e, mn), mn !== null) {
                            ri = g, t.cancelPendingCommit = mn(eh.bind(null, t, n, g, l, f, m, E, j, le, De, _e, null, We, pt)), yi(t, g, E, !ve);
                            return;
                        }
                    }
                    eh(t, n, g, l, f, m, E, j, le);
                }
                function Gv(t) {
                    for(var n = t;;){
                        var l = n.tag;
                        if ((l === 0 || l === 11 || l === 15) && n.flags & 16384 && (l = n.updateQueue, l !== null && (l = l.stores, l !== null))) for(var f = 0; f < l.length; f++){
                            var m = l[f], g = m.getSnapshot;
                            m = m.value;
                            try {
                                if (!fr(g(), m)) return !1;
                            } catch  {
                                return !1;
                            }
                        }
                        if (l = n.child, n.subtreeFlags & 16384 && l !== null) l.return = n, n = l;
                        else {
                            if (n === t) break;
                            for(; n.sibling === null;){
                                if (n.return === null || n.return === t) return !0;
                                n = n.return;
                            }
                            n.sibling.return = n.return, n = n.sibling;
                        }
                    }
                    return !0;
                }
                function yi(t, n, l, f) {
                    n &= ~vc, n &= ~ra, t.suspendedLanes |= n, t.pingedLanes &= ~n, f && (t.warmLanes |= n), f = t.expirationTimes;
                    for(var m = n; 0 < m;){
                        var g = 31 - ur(m), E = 1 << g;
                        f[g] = -1, m &= ~E;
                    }
                    l !== 0 && P(t, l, n);
                }
                function Xd() {
                    return (wt & 6) === 0 ? (et(0), !1) : !0;
                }
                function Du() {
                    if (St !== null) {
                        if (Bt === 0) var t = St.return;
                        else t = St, Jr = Ki = null, Jt(t), za = null, jo = 0, t = St;
                        for(; t !== null;)Ed(t.alternate, t), t = t.return;
                        St = null;
                    }
                }
                function Ea(t, n) {
                    var l = t.timeoutHandle;
                    l !== Zi && (t.timeoutHandle = Zi, c0(l)), l = t.cancelPendingCommit, l !== null && (t.cancelPendingCommit = null, l()), ri = 0, Du(), Xt = t, St = l = Qr(t.current, null), _t = n, Bt = 0, hr = null, Mi = !1, Wa = T(t, n), gc = !1, Va = pr = vc = ra = Ci = on = 0, tr = Wo = null, yc = !1, (n & 8) !== 0 && (n |= n & 32);
                    var f = t.entangledLanes;
                    if (f !== 0) for(t = t.entanglements, f &= n; 0 < f;){
                        var m = 31 - ur(f), g = 1 << m;
                        n |= t[m], f &= ~g;
                    }
                    return ni = n, Un(), l;
                }
                function Yd(t, n) {
                    gt = null, nt.H = Go, n === La || n === Ks ? (n = Ct(), Bt = 3) : n === lc ? (n = Ct(), Bt = 4) : Bt = n === hc ? 8 : n !== null && typeof n == "object" && typeof n.then == "function" ? 6 : 1, hr = n, St === null && (on = 1, Ts(t, te(n, t.current)));
                }
                function qd() {
                    var t = dr.current;
                    return t === null ? !0 : (_t & 4194048) === _t ? kr === null : (_t & 62914560) === _t || (_t & 536870912) !== 0 ? t === kr : !1;
                }
                function Zd() {
                    var t = nt.H;
                    return nt.H = Go, t === null ? Go : t;
                }
                function Qd() {
                    var t = nt.A;
                    return nt.A = G1, t;
                }
                function Os() {
                    on = 4, Mi || (_t & 4194048) !== _t && dr.current !== null || (Wa = !0), (Ci & 134217727) === 0 && (ra & 134217727) === 0 || Xt === null || yi(Xt, _t, pr, !1);
                }
                function Uu(t, n, l) {
                    var f = wt;
                    wt |= 2;
                    var m = Zd(), g = Qd();
                    (Xt !== t || _t !== n) && (ll = null, Ea(t, n)), n = !1;
                    var E = on;
                    e: do try {
                        if (Bt !== 0 && St !== null) {
                            var j = St, le = hr;
                            switch(Bt){
                                case 8:
                                    Du(), E = 6;
                                    break e;
                                case 3:
                                case 2:
                                case 9:
                                case 6:
                                    dr.current === null && (n = !0);
                                    var ve = Bt;
                                    if (Bt = 0, hr = null, Ma(t, j, le, ve), l && Wa) {
                                        E = 0;
                                        break e;
                                    }
                                    break;
                                default:
                                    ve = Bt, Bt = 0, hr = null, Ma(t, j, le, ve);
                            }
                        }
                        Hv(), E = on;
                        break;
                    } catch (De) {
                        Yd(t, De);
                    }
                    while (!0);
                    return n && t.shellSuspendCounter++, Jr = Ki = null, wt = f, nt.H = m, nt.A = g, St === null && (Xt = null, _t = 0, Un()), E;
                }
                function Hv() {
                    for(; St !== null;)Kd(St);
                }
                function Wv(t, n) {
                    var l = wt;
                    wt |= 2;
                    var f = Zd(), m = Qd();
                    Xt !== t || _t !== n ? (ll = null, Vo = Jn() + 500, Ea(t, n)) : Wa = T(t, n);
                    e: do try {
                        if (Bt !== 0 && St !== null) {
                            n = St;
                            var g = hr;
                            t: switch(Bt){
                                case 1:
                                    Bt = 0, hr = null, Ma(t, n, g, 1);
                                    break;
                                case 2:
                                case 9:
                                    if (Mt(g)) {
                                        Bt = 0, hr = null, $d(n);
                                        break;
                                    }
                                    n = function() {
                                        Bt !== 2 && Bt !== 9 || Xt !== t || (Bt = 7), Be(t);
                                    }, g.then(n, n);
                                    break e;
                                case 3:
                                    Bt = 7;
                                    break e;
                                case 4:
                                    Bt = 5;
                                    break e;
                                case 7:
                                    Mt(g) ? (Bt = 0, hr = null, $d(n)) : (Bt = 0, hr = null, Ma(t, n, g, 7));
                                    break;
                                case 5:
                                    var E = null;
                                    switch(St.tag){
                                        case 26:
                                            E = St.memoizedState;
                                        case 5:
                                        case 27:
                                            var j = St, le = j.type, ve = j.pendingProps;
                                            if (E ? Lh(E) : Sh(j.stateNode, le, ve)) {
                                                Bt = 0, hr = null;
                                                var De = j.sibling;
                                                if (De !== null) St = De;
                                                else {
                                                    var _e = j.return;
                                                    _e !== null ? (St = _e, Ls(_e)) : St = null;
                                                }
                                                break t;
                                            }
                                    }
                                    Bt = 0, hr = null, Ma(t, n, g, 5);
                                    break;
                                case 6:
                                    Bt = 0, hr = null, Ma(t, n, g, 6);
                                    break;
                                case 8:
                                    Du(), on = 6;
                                    break e;
                                default:
                                    throw Error(i(462));
                            }
                        }
                        Vv();
                        break;
                    } catch (We) {
                        Yd(t, We);
                    }
                    while (!0);
                    return Jr = Ki = null, nt.H = f, nt.A = m, wt = l, St !== null ? 0 : (Xt = null, _t = 0, Un(), on);
                }
                function Vv() {
                    for(; St !== null && !I1();)Kd(St);
                }
                function Kd(t) {
                    var n = bd(t.alternate, t, ni);
                    t.memoizedProps = t.pendingProps, n === null ? Ls(t) : St = n;
                }
                function $d(t) {
                    var n = t, l = n.alternate;
                    switch(n.tag){
                        case 15:
                        case 0:
                            n = hd(l, n, n.pendingProps, n.type, void 0, _t);
                            break;
                        case 11:
                            n = hd(l, n, n.pendingProps, n.type.render, n.ref, _t);
                            break;
                        case 5:
                            Jt(n);
                        default:
                            Ed(l, n), n = St = lh(n, ni), n = bd(l, n, ni);
                    }
                    t.memoizedProps = t.pendingProps, n === null ? Ls(t) : St = n;
                }
                function Ma(t, n, l, f) {
                    Jr = Ki = null, Jt(n), za = null, jo = 0;
                    var m = n.return;
                    try {
                        if (Uv(t, m, n, l, _t)) {
                            on = 1, Ts(t, te(l, t.current)), St = null;
                            return;
                        }
                    } catch (g) {
                        if (m !== null) throw St = m, g;
                        on = 1, Ts(t, te(l, t.current)), St = null;
                        return;
                    }
                    n.flags & 32768 ? (Pt || f === 1 ? t = !0 : Wa || (_t & 536870912) !== 0 ? t = !1 : (Mi = t = !0, (f === 2 || f === 9 || f === 3 || f === 6) && (f = dr.current, f !== null && f.tag === 13 && (f.flags |= 16384))), Jd(n, t)) : Ls(n);
                }
                function Ls(t) {
                    var n = t;
                    do {
                        if ((n.flags & 32768) !== 0) {
                            Jd(n, Mi);
                            return;
                        }
                        t = n.return;
                        var l = zv(n.alternate, n, ni);
                        if (l !== null) {
                            St = l;
                            return;
                        }
                        if (n = n.sibling, n !== null) {
                            St = n;
                            return;
                        }
                        St = n = t;
                    }while (n !== null);
                    on === 0 && (on = 5);
                }
                function Jd(t, n) {
                    do {
                        var l = Nv(t.alternate, t);
                        if (l !== null) {
                            l.flags &= 32767, St = l;
                            return;
                        }
                        if (l = t.return, l !== null && (l.flags |= 32768, l.subtreeFlags = 0, l.deletions = null), !n && (t = t.sibling, t !== null)) {
                            St = t;
                            return;
                        }
                        St = t = l;
                    }while (t !== null);
                    on = 6, St = null;
                }
                function eh(t, n, l, f, m, g, E, j, le) {
                    t.cancelPendingCommit = null;
                    do Ao();
                    while (wn !== 0);
                    if ((wt & 6) !== 0) throw Error(i(327));
                    if (n !== null) {
                        if (n === t.current) throw Error(i(177));
                        if (g = n.lanes | n.childLanes, g |= uc, N(t, l, g, E, j, le), t === Xt && (St = Xt = null, _t = 0), Xa = n, Pi = t, ri = l, bc = g, wc = m, Kh = f, (n.subtreeFlags & 10256) !== 0 || (n.flags & 10256) !== 0 ? (t.callbackNode = null, t.callbackPriority = 0, Zv(tc, function() {
                            return ah(), null;
                        })) : (t.callbackNode = null, t.callbackPriority = 0), f = (n.flags & 13878) !== 0, (n.subtreeFlags & 13878) !== 0 || f) {
                            f = nt.T, nt.T = null, m = $r(), xn(2), E = wt, wt |= 4;
                            try {
                                jv(t, n, l);
                            } finally{
                                wt = E, xn(m), nt.T = f;
                            }
                        }
                        wn = 1, th(), nh(), rh();
                    }
                }
                function th() {
                    if (wn === 1) {
                        wn = 0;
                        var t = Pi, n = Xa, l = (n.flags & 13878) !== 0;
                        if ((n.subtreeFlags & 13878) !== 0 || l) {
                            l = nt.T, nt.T = null;
                            var f = $r();
                            xn(2);
                            var m = wt;
                            wt |= 4;
                            try {
                                Ud(n, t), s0(t.containerInfo);
                            } finally{
                                wt = m, xn(f), nt.T = l;
                            }
                        }
                        t.current = n, wn = 2;
                    }
                }
                function nh() {
                    if (wn === 2) {
                        wn = 0;
                        var t = Pi, n = Xa, l = (n.flags & 8772) !== 0;
                        if ((n.subtreeFlags & 8772) !== 0 || l) {
                            l = nt.T, nt.T = null;
                            var f = $r();
                            xn(2);
                            var m = wt;
                            wt |= 4;
                            try {
                                Id(t, n.alternate, n);
                            } finally{
                                wt = m, xn(f), nt.T = l;
                            }
                        }
                        wn = 3;
                    }
                }
                function rh() {
                    if (wn === 4 || wn === 3) {
                        wn = 0, A1();
                        var t = Pi, n = Xa, l = ri, f = Kh;
                        (n.subtreeFlags & 10256) !== 0 || (n.flags & 10256) !== 0 ? wn = 5 : (wn = 0, Xa = Pi = null, ih(t, t.pendingLanes));
                        var m = t.pendingLanes;
                        if (m === 0 && (Ti = null), L(l), n = n.stateNode, cr && typeof cr.onCommitFiberRoot == "function") try {
                            cr.onCommitFiberRoot(Oo, n, void 0, (n.current.flags & 128) === 128);
                        } catch  {}
                        if (f !== null) {
                            n = nt.T, m = $r(), xn(2), nt.T = null;
                            try {
                                for(var g = t.onRecoverableError, E = 0; E < f.length; E++){
                                    var j = f[E];
                                    g(j.value, {
                                        componentStack: j.stack
                                    });
                                }
                            } finally{
                                nt.T = n, xn(m);
                            }
                        }
                        (ri & 3) !== 0 && Ao(), Be(t), m = t.pendingLanes, (l & 261930) !== 0 && (m & 42) !== 0 ? t === Sc ? Xo++ : (Xo = 0, Sc = t) : Xo = 0, Gn && g1(), et(0);
                    }
                }
                function ih(t, n) {
                    (t.pooledCacheLanes &= n) === 0 && (n = t.pooledCache, n != null && (t.pooledCache = null, Oe(n)));
                }
                function Ao() {
                    return th(), nh(), rh(), ah();
                }
                function ah() {
                    if (wn !== 5) return !1;
                    var t = Pi, n = bc;
                    bc = 0;
                    var l = L(ri), f = 32 > l ? 32 : l;
                    l = nt.T;
                    var m = $r();
                    try {
                        xn(f), nt.T = null, f = wc, wc = null;
                        var g = Pi, E = ri;
                        if (wn = 0, Xa = Pi = null, ri = 0, (wt & 6) !== 0) throw Error(i(331));
                        var j = wt;
                        if (wt |= 4, jd(g.current), Ld(g, g.current, E, f), wt = j, et(0, !1), cr && typeof cr.onPostCommitFiberRoot == "function") try {
                            cr.onPostCommitFiberRoot(Oo, g);
                        } catch  {}
                        return !0;
                    } finally{
                        xn(m), nt.T = l, ih(t, n);
                    }
                }
                function oh(t, n, l) {
                    n = te(l, n), n = hu(t.stateNode, n, 2), t = Q(t, n, 2), t !== null && (R(t, 2), Be(t));
                }
                function Ut(t, n, l) {
                    if (t.tag === 3) oh(t, t, l);
                    else for(; n !== null;){
                        if (n.tag === 3) {
                            oh(n, t, l);
                            break;
                        } else if (n.tag === 1) {
                            var f = n.stateNode;
                            if (typeof n.type.getDerivedStateFromError == "function" || typeof f.componentDidCatch == "function" && (Ti === null || !Ti.has(f))) {
                                t = te(l, t), l = ad(2), f = Q(n, l, 2), f !== null && (od(l, f, n, t), R(f, 2), Be(f));
                                break;
                            }
                        }
                        n = n.return;
                    }
                }
                function Ou(t, n, l) {
                    var f = t.pingCache;
                    if (f === null) {
                        f = t.pingCache = new H1;
                        var m = new Set;
                        f.set(n, m);
                    } else m = f.get(n), m === void 0 && (m = new Set, f.set(n, m));
                    m.has(l) || (gc = !0, m.add(l), t = Xv.bind(null, t, n, l), n.then(t, t));
                }
                function Xv(t, n, l) {
                    var f = t.pingCache;
                    f !== null && f.delete(n), t.pingedLanes |= t.suspendedLanes & l, t.warmLanes &= ~l, Xt === t && (_t & l) === l && (on === 4 || on === 3 && (_t & 62914560) === _t && 300 > Jn() - sl ? (wt & 2) === 0 && Ea(t, 0) : vc |= l, Va === _t && (Va = 0)), Be(t);
                }
                function sh(t, n) {
                    n === 0 && (n = U()), t = Je(t, n), t !== null && (R(t, n), Be(t));
                }
                function Yv(t) {
                    var n = t.memoizedState, l = 0;
                    n !== null && (l = n.retryLane), sh(t, l);
                }
                function qv(t, n) {
                    var l = 0;
                    switch(t.tag){
                        case 31:
                        case 13:
                            var f = t.stateNode, m = t.memoizedState;
                            m !== null && (l = m.retryLane);
                            break;
                        case 19:
                            f = t.stateNode;
                            break;
                        case 22:
                            f = t.stateNode._retryCache;
                            break;
                        default:
                            throw Error(i(314));
                    }
                    f !== null && f.delete(n), sh(t, l);
                }
                function Zv(t, n) {
                    return Vs(t, n);
                }
                function Qv(t, n, l, f) {
                    this.tag = t, this.key = l, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = n, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = f, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
                }
                function Lu(t) {
                    return t = t.prototype, !(!t || !t.isReactComponent);
                }
                function Qr(t, n) {
                    var l = t.alternate;
                    return l === null ? (l = a(t.tag, n, t.key, t.mode), l.elementType = t.elementType, l.type = t.type, l.stateNode = t.stateNode, l.alternate = t, t.alternate = l) : (l.pendingProps = n, l.type = t.type, l.flags = 0, l.subtreeFlags = 0, l.deletions = null), l.flags = t.flags & 65011712, l.childLanes = t.childLanes, l.lanes = t.lanes, l.child = t.child, l.memoizedProps = t.memoizedProps, l.memoizedState = t.memoizedState, l.updateQueue = t.updateQueue, n = t.dependencies, l.dependencies = n === null ? null : {
                        lanes: n.lanes,
                        firstContext: n.firstContext
                    }, l.sibling = t.sibling, l.index = t.index, l.ref = t.ref, l.refCleanup = t.refCleanup, l;
                }
                function lh(t, n) {
                    t.flags &= 65011714;
                    var l = t.alternate;
                    return l === null ? (t.childLanes = 0, t.lanes = n, t.child = null, t.subtreeFlags = 0, t.memoizedProps = null, t.memoizedState = null, t.updateQueue = null, t.dependencies = null, t.stateNode = null) : (t.childLanes = l.childLanes, t.lanes = l.lanes, t.child = l.child, t.subtreeFlags = 0, t.deletions = null, t.memoizedProps = l.memoizedProps, t.memoizedState = l.memoizedState, t.updateQueue = l.updateQueue, t.type = l.type, n = l.dependencies, t.dependencies = n === null ? null : {
                        lanes: n.lanes,
                        firstContext: n.firstContext
                    }), t;
                }
                function zs(t, n, l, f, m, g) {
                    var E = 0;
                    if (f = t, typeof t == "function") Lu(t) && (E = 1);
                    else if (typeof t == "string") E = Pr && bn ? Ih(t, l, kn.current) ? 26 : jh(t) ? 27 : 5 : Pr ? Ih(t, l, kn.current) ? 26 : 5 : bn && jh(t) ? 27 : 5;
                    else e: switch(t){
                        case Yu:
                            return t = a(31, l, n, m), t.elementType = Yu, t.lanes = g, t;
                        case Ta:
                            return qi(l.children, m, g, n);
                        case mh:
                            E = 8, m |= 24;
                            break;
                        case Gu:
                            return t = a(12, l, n, m | 2), t.elementType = Gu, t.lanes = g, t;
                        case Wu:
                            return t = a(13, l, n, m), t.elementType = Wu, t.lanes = g, t;
                        case Vu:
                            return t = a(19, l, n, m), t.elementType = Vu, t.lanes = g, t;
                        default:
                            if (typeof t == "object" && t !== null) switch(t.$$typeof){
                                case bi:
                                    E = 10;
                                    break e;
                                case gh:
                                    E = 9;
                                    break e;
                                case Hu:
                                    E = 11;
                                    break e;
                                case Xu:
                                    E = 14;
                                    break e;
                                case wi:
                                    E = 16, f = null;
                                    break e;
                            }
                            E = 29, l = Error(i(130, t === null ? "null" : typeof t, "")), f = null;
                    }
                    return n = a(E, l, n, m), n.elementType = t, n.type = f, n.lanes = g, n;
                }
                function qi(t, n, l, f) {
                    return t = a(7, t, f, n), t.lanes = l, t;
                }
                function zu(t, n, l) {
                    return t = a(6, t, null, n), t.lanes = l, t;
                }
                function uh(t) {
                    var n = a(18, null, null, 0);
                    return n.stateNode = t, n;
                }
                function Nu(t, n, l) {
                    return n = a(4, t.children !== null ? t.children : [], t.key, n), n.lanes = l, n.stateNode = {
                        containerInfo: t.containerInfo,
                        pendingChildren: null,
                        implementation: t.implementation
                    }, n;
                }
                function Kv(t, n, l, f, m, g, E, j, le) {
                    this.tag = 1, this.containerInfo = t, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = Zi, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = D(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = D(0), this.hiddenUpdates = D(null), this.identifierPrefix = f, this.onUncaughtError = m, this.onCaughtError = g, this.onRecoverableError = E, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = le, this.incompleteTransitions = new Map;
                }
                function ch(t, n, l, f, m, g, E, j, le, ve, De, _e) {
                    return t = new Kv(t, n, l, E, le, ve, De, _e, j), n = 1, g === !0 && (n |= 24), g = a(3, null, null, n), t.current = g, g.stateNode = t, n = vt(), n.refCount++, t.pooledCache = n, n.refCount++, g.memoizedState = {
                        element: f,
                        isDehydrated: l,
                        cache: n
                    }, w(g), t;
                }
                function fh(t) {
                    return t ? (t = Ia, t) : Ia;
                }
                function dh(t) {
                    var n = t._reactInternals;
                    if (n === void 0) throw typeof t.render == "function" ? Error(i(188)) : (t = Object.keys(t).join(","), Error(i(268, t)));
                    return t = d(n), t = t !== null ? c(t) : null, t === null ? null : Fo(t.stateNode);
                }
                function hh(t, n, l, f, m, g) {
                    m = fh(m), f.context === null ? f.context = m : f.pendingContext = m, f = z(n), f.payload = {
                        element: l
                    }, g = g === void 0 ? null : g, g !== null && (f.callback = g), l = Q(t, f, n), l !== null && ($n(l, t, n), ae(l, t, n));
                }
                function ph(t, n) {
                    if (t = t.memoizedState, t !== null && t.dehydrated !== null) {
                        var l = t.retryLane;
                        t.retryLane = l !== 0 && l < n ? l : n;
                    }
                }
                function ju(t, n) {
                    ph(t, n), (t = t.alternate) && ph(t, n);
                }
                var bt = {}, $v = Ar, lr = sb, Bu = Object.assign, Jv = Symbol.for("react.element"), Ns = Symbol.for("react.transitional.element"), Ca = Symbol.for("react.portal"), Ta = Symbol.for("react.fragment"), mh = Symbol.for("react.strict_mode"), Gu = Symbol.for("react.profiler"), gh = Symbol.for("react.consumer"), bi = Symbol.for("react.context"), Hu = Symbol.for("react.forward_ref"), Wu = Symbol.for("react.suspense"), Vu = Symbol.for("react.suspense_list"), Xu = Symbol.for("react.memo"), wi = Symbol.for("react.lazy"), Yu = Symbol.for("react.activity"), e0 = Symbol.for("react.memo_cache_sentinel"), vh = Symbol.iterator, t0 = Symbol.for("react.client.reference"), js = Array.isArray, nt = $v.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, n0 = e.rendererVersion, r0 = e.rendererPackageName, yh = e.extraDevToolsConfig, Fo = e.getPublicInstance, i0 = e.getRootHostContext, a0 = e.getChildHostContext, o0 = e.prepareForCommit, s0 = e.resetAfterCommit, l0 = e.createInstance;
                e.cloneMutableInstance;
                var qu = e.appendInitialChild, bh = e.finalizeInitialChildren, Bs = e.shouldSetTextContent, wh = e.createTextInstance;
                e.cloneMutableTextInstance;
                var u0 = e.scheduleTimeout, c0 = e.cancelTimeout, Zi = e.noTimeout, Kr = e.isPrimaryRenderer;
                e.warnsIfNotActing;
                var Bn = e.supportsMutation, Or = e.supportsPersistence, Gn = e.supportsHydration, f0 = e.getInstanceFromNode;
                e.beforeActiveInstanceBlur;
                var d0 = e.preparePortalMount;
                e.prepareScopeUpdate, e.getInstanceFromScope;
                var xn = e.setCurrentUpdatePriority, $r = e.getCurrentUpdatePriority, h0 = e.resolveUpdatePriority;
                e.trackSchedulerEvent, e.resolveEventType, e.resolveEventTimeStamp;
                var p0 = e.shouldAttemptEagerTransition, m0 = e.detachDeletedInstance;
                e.requestPostPaintCallback;
                var g0 = e.maySuspendCommit, v0 = e.maySuspendCommitOnUpdate, Zu = e.maySuspendCommitInSyncRender, Sh = e.preloadInstance, y0 = e.startSuspendingCommit, xh = e.suspendInstance;
                e.suspendOnActiveViewTransition;
                var b0 = e.waitForCommitToBeReady;
                e.getSuspendedCommitReason;
                var Pa = e.NotPendingTransition, Qi = e.HostTransitionContext, w0 = e.resetFormInstance;
                e.bindToConsole;
                var S0 = e.supportsMicrotasks, x0 = e.scheduleMicrotask, Do = e.supportsTestSelectors, _0 = e.findFiberRoot, E0 = e.getBoundingRect, M0 = e.getTextContent, Uo = e.isHiddenSubtree, C0 = e.matchAccessibilityRole, T0 = e.setFocusIfFocusable, P0 = e.setupIntersectionObserver, k0 = e.appendChild, R0 = e.appendChildToContainer, I0 = e.commitTextUpdate, A0 = e.commitMount, F0 = e.commitUpdate, D0 = e.insertBefore, U0 = e.insertInContainerBefore, O0 = e.removeChild, L0 = e.removeChildFromContainer, _h = e.resetTextContent, z0 = e.hideInstance, N0 = e.hideTextInstance, j0 = e.unhideInstance, B0 = e.unhideTextInstance;
                e.cancelViewTransitionName, e.cancelRootViewTransitionName, e.restoreRootViewTransitionName, e.cloneRootViewTransitionContainer, e.removeRootViewTransitionClone, e.measureClonedInstance, e.hasInstanceChanged, e.hasInstanceAffectedParent, e.startViewTransition, e.startGestureTransition, e.stopViewTransition, e.getCurrentGestureOffset, e.createViewTransitionInstance;
                var G0 = e.clearContainer;
                e.createFragmentInstance, e.updateFragmentInstanceFiber, e.commitNewChildToFragmentInstance, e.deleteChildFromFragmentInstance;
                var H0 = e.cloneInstance, Eh = e.createContainerChildSet, Mh = e.appendChildToContainerChildSet, W0 = e.finalizeContainerChildren, Ch = e.replaceContainerChildren, Th = e.cloneHiddenInstance, Ph = e.cloneHiddenTextInstance, Qu = e.isSuspenseInstancePending, Ku = e.isSuspenseInstanceFallback, V0 = e.getSuspenseInstanceFallbackErrorDetails, X0 = e.registerSuspenseInstanceRetry, Y0 = e.canHydrateFormStateMarker, q0 = e.isFormStateMarkerMatching, kh = e.getNextHydratableSibling, Z0 = e.getNextHydratableSiblingAfterSingleton, Q0 = e.getFirstHydratableChild, K0 = e.getFirstHydratableChildWithinContainer, $0 = e.getFirstHydratableChildWithinActivityInstance, J0 = e.getFirstHydratableChildWithinSuspenseInstance, e1 = e.getFirstHydratableChildWithinSingleton, t1 = e.canHydrateInstance, n1 = e.canHydrateTextInstance, r1 = e.canHydrateActivityInstance, i1 = e.canHydrateSuspenseInstance, a1 = e.hydrateInstance, o1 = e.hydrateTextInstance, s1 = e.hydrateActivityInstance, l1 = e.hydrateSuspenseInstance, u1 = e.getNextHydratableInstanceAfterActivityInstance, c1 = e.getNextHydratableInstanceAfterSuspenseInstance, f1 = e.commitHydratedInstance, d1 = e.commitHydratedContainer, h1 = e.commitHydratedActivityInstance, p1 = e.commitHydratedSuspenseInstance, m1 = e.finalizeHydratedChildren, g1 = e.flushHydrationEvents;
                e.clearActivityBoundary;
                var v1 = e.clearSuspenseBoundary;
                e.clearActivityBoundaryFromContainer;
                var y1 = e.clearSuspenseBoundaryFromContainer, b1 = e.hideDehydratedBoundary, w1 = e.unhideDehydratedBoundary, Rh = e.shouldDeleteUnhydratedTailInstances;
                e.diffHydratedPropsForDevWarnings, e.diffHydratedTextForDevWarnings, e.describeHydratableInstanceForDevWarnings;
                var S1 = e.validateHydratableInstance, x1 = e.validateHydratableTextInstance, Pr = e.supportsResources, Ih = e.isHostHoistableType, $u = e.getHoistableRoot, Ah = e.getResource, Fh = e.acquireResource, Dh = e.releaseResource, _1 = e.hydrateHoistable, Uh = e.mountHoistable, Oh = e.unmountHoistable, E1 = e.createHoistableInstance, M1 = e.prepareToCommitHoistables, C1 = e.mayResourceSuspendCommit, Lh = e.preloadResource, T1 = e.suspendResource, bn = e.supportsSingletons, zh = e.resolveSingletonInstance, P1 = e.acquireSingletonInstance, Nh = e.releaseSingletonInstance, jh = e.isHostSingletonType, ka = e.isSingletonScope, Ju = [], Ra = -1, Ia = {}, ur = Math.clz32 ? Math.clz32 : _, k1 = Math.log, R1 = Math.LN2, Gs = 256, Hs = 262144, Ws = 4194304, Vs = lr.unstable_scheduleCallback, ec = lr.unstable_cancelCallback, I1 = lr.unstable_shouldYield, A1 = lr.unstable_requestPaint, Jn = lr.unstable_now, Bh = lr.unstable_ImmediatePriority, F1 = lr.unstable_UserBlockingPriority, tc = lr.unstable_NormalPriority, D1 = lr.unstable_IdlePriority, U1 = lr.log, O1 = lr.unstable_setDisableYieldValue, Oo = null, cr = null, fr = typeof Object.is == "function" ? Object.is : B, Gh = typeof reportError == "function" ? reportError : function(t) {
                    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
                        var n = new window.ErrorEvent("error", {
                            bubbles: !0,
                            cancelable: !0,
                            message: typeof t == "object" && t !== null && typeof t.message == "string" ? String(t.message) : String(t),
                            error: t
                        });
                        if (!window.dispatchEvent(n)) return;
                    } else if (typeof process == "object" && typeof process.emit == "function") {
                        process.emit("uncaughtException", t);
                        return;
                    }
                    console.error(t);
                }, L1 = Object.prototype.hasOwnProperty, nc, Hh, rc = !1, Wh = new WeakMap, Aa = [], Fa = 0, Xs = null, Lo = 0, mr = [], gr = 0, Si = null, Lr = 1, zr = "", kn = y(null), zo = y(null), xi = y(null), Ys = y(null), Rn = null, en = null, Pt = !1, _i = null, vr = !1, ic = Error(i(519)), qs = y(null), Ki = null, Jr = null, z1 = typeof AbortController < "u" ? AbortController : function() {
                    var t = [], n = this.signal = {
                        aborted: !1,
                        addEventListener: function(l, f) {
                            t.push(f);
                        }
                    };
                    this.abort = function() {
                        n.aborted = !0, t.forEach(function(l) {
                            return l();
                        });
                    };
                }, N1 = lr.unstable_scheduleCallback, j1 = lr.unstable_NormalPriority, tn = {
                    $$typeof: bi,
                    Consumer: null,
                    Provider: null,
                    _currentValue: null,
                    _currentValue2: null,
                    _threadCount: 0
                }, Zs = null, Da = null, ac = !1, Qs = !1, oc = !1, $i = 0, No = null, sc = 0, Ua = 0, Oa = null, Vh = nt.S;
                nt.S = function(t, n) {
                    Qh = Jn(), typeof n == "object" && n !== null && typeof n.then == "function" && Re(t, n), Vh !== null && Vh(t, n);
                };
                var Ji = y(null), La = Error(i(460)), lc = Error(i(474)), Ks = Error(i(542)), $s = {
                    then: function() {}
                }, ea = null, za = null, jo = 0, ta = Dn(!0), Xh = Dn(!1), yr = [], Na = 0, uc = 0, Ei = !1, cc = !1, ja = y(null), Js = y(0), dr = y(null), kr = null, ln = y(0), ei = 0, gt = null, Ht = null, fn = null, el = !1, Ba = !1, na = !1, tl = 0, Bo = 0, Ga = null, B1 = 0, Go = {
                    readContext: Se,
                    use: yn,
                    useCallback: ut,
                    useContext: ut,
                    useEffect: ut,
                    useImperativeHandle: ut,
                    useLayoutEffect: ut,
                    useInsertionEffect: ut,
                    useMemo: ut,
                    useReducer: ut,
                    useRef: ut,
                    useState: ut,
                    useDebugValue: ut,
                    useDeferredValue: ut,
                    useTransition: ut,
                    useSyncExternalStore: ut,
                    useId: ut,
                    useHostTransitionStatus: ut,
                    useFormState: ut,
                    useActionState: ut,
                    useOptimistic: ut,
                    useMemoCache: ut,
                    useCacheRefresh: ut
                };
                Go.useEffectEvent = ut;
                var Yh = {
                    readContext: Se,
                    use: yn,
                    useCallback: function(t, n) {
                        return ct().memoizedState = [
                            t,
                            n === void 0 ? null : n
                        ], t;
                    },
                    useContext: Se,
                    useEffect: Eo,
                    useImperativeHandle: function(t, n, l) {
                        l = l != null ? l.concat([
                            t
                        ]) : null, hi(4194308, 4, ba.bind(null, n, t), l);
                    },
                    useLayoutEffect: function(t, n) {
                        return hi(4194308, 4, t, n);
                    },
                    useInsertionEffect: function(t, n) {
                        hi(4, 2, t, n);
                    },
                    useMemo: function(t, n) {
                        var l = ct();
                        n = n === void 0 ? null : n;
                        var f = t();
                        if (na) {
                            G(!0);
                            try {
                                t();
                            } finally{
                                G(!1);
                            }
                        }
                        return l.memoizedState = [
                            f,
                            n
                        ], f;
                    },
                    useReducer: function(t, n, l) {
                        var f = ct();
                        if (l !== void 0) {
                            var m = l(n);
                            if (na) {
                                G(!0);
                                try {
                                    l(n);
                                } finally{
                                    G(!1);
                                }
                            }
                        } else m = n;
                        return f.memoizedState = f.baseState = m, t = {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: t,
                            lastRenderedState: m
                        }, f.queue = t, t = t.dispatch = Nn.bind(null, gt, t), [
                            f.memoizedState,
                            t
                        ];
                    },
                    useRef: function(t) {
                        var n = ct();
                        return t = {
                            current: t
                        }, n.memoizedState = t;
                    },
                    useState: function(t) {
                        t = ui(t);
                        var n = t.queue, l = Er.bind(null, gt, n);
                        return n.dispatch = l, [
                            t.memoizedState,
                            l
                        ];
                    },
                    useDebugValue: wa,
                    useDeferredValue: function(t, n) {
                        var l = ct();
                        return Cn(l, t, n);
                    },
                    useTransition: function() {
                        var t = ui(!1);
                        return t = Hi.bind(null, gt, t.queue, !0, !1), ct().memoizedState = t, [
                            !1,
                            t
                        ];
                    },
                    useSyncExternalStore: function(t, n, l) {
                        var f = gt, m = ct();
                        if (Pt) {
                            if (l === void 0) throw Error(i(407));
                            l = l();
                        } else {
                            if (l = n(), Xt === null) throw Error(i(349));
                            (_t & 127) !== 0 || vo(f, n, l);
                        }
                        m.memoizedState = l;
                        var g = {
                            value: l,
                            getSnapshot: n
                        };
                        return m.queue = g, Eo(pa.bind(null, f, g, t), [
                            t
                        ]), f.flags |= 2048, Vr(9, {
                            destroy: void 0
                        }, yo.bind(null, f, g, l, n), null), l;
                    },
                    useId: function() {
                        var t = ct(), n = Xt.identifierPrefix;
                        if (Pt) {
                            var l = zr, f = Lr;
                            l = (f & ~(1 << 32 - ur(f) - 1)).toString(32) + l, n = "_" + n + "R_" + l, l = tl++, 0 < l && (n += "H" + l.toString(32)), n += "_";
                        } else l = B1++, n = "_" + n + "r_" + l.toString(32) + "_";
                        return t.memoizedState = n;
                    },
                    useHostTransitionStatus: xa,
                    useFormState: ji,
                    useActionState: ji,
                    useOptimistic: function(t) {
                        var n = ct();
                        n.memoizedState = n.baseState = t;
                        var l = {
                            pending: null,
                            lanes: 0,
                            dispatch: null,
                            lastRenderedReducer: null,
                            lastRenderedState: null
                        };
                        return n.queue = l, n = fu.bind(null, gt, !0, l), l.dispatch = n, [
                            t,
                            n
                        ];
                    },
                    useMemoCache: Ln,
                    useCacheRefresh: function() {
                        return ct().memoizedState = or.bind(null, gt);
                    },
                    useEffectEvent: function(t) {
                        var n = ct(), l = {
                            impl: t
                        };
                        return n.memoizedState = l, function() {
                            if ((wt & 2) !== 0) throw Error(i(440));
                            return l.impl.apply(void 0, arguments);
                        };
                    }
                }, fc = {
                    readContext: Se,
                    use: yn,
                    useCallback: mi,
                    useContext: Se,
                    useEffect: Xr,
                    useImperativeHandle: pi,
                    useInsertionEffect: Mo,
                    useLayoutEffect: ya,
                    useMemo: Sa,
                    useReducer: zn,
                    useRef: _o,
                    useState: function() {
                        return zn(jt);
                    },
                    useDebugValue: wa,
                    useDeferredValue: function(t, n) {
                        var l = mt();
                        return Es(l, Ht.memoizedState, t, n);
                    },
                    useTransition: function() {
                        var t = zn(jt)[0], n = mt().memoizedState;
                        return [
                            typeof t == "boolean" ? t : dt(t),
                            n
                        ];
                    },
                    useSyncExternalStore: ha,
                    useId: Ms,
                    useHostTransitionStatus: xa,
                    useFormState: ga,
                    useActionState: ga,
                    useOptimistic: function(t, n) {
                        var l = mt();
                        return Wr(l, Ht, t, n);
                    },
                    useMemoCache: Ln,
                    useCacheRefresh: Tn
                };
                fc.useEffectEvent = _r;
                var qh = {
                    readContext: Se,
                    use: yn,
                    useCallback: mi,
                    useContext: Se,
                    useEffect: Xr,
                    useImperativeHandle: pi,
                    useInsertionEffect: Mo,
                    useLayoutEffect: ya,
                    useMemo: Sa,
                    useReducer: si,
                    useRef: _o,
                    useState: function() {
                        return si(jt);
                    },
                    useDebugValue: wa,
                    useDeferredValue: function(t, n) {
                        var l = mt();
                        return Ht === null ? Cn(l, t, n) : Es(l, Ht.memoizedState, t, n);
                    },
                    useTransition: function() {
                        var t = si(jt)[0], n = mt().memoizedState;
                        return [
                            typeof t == "boolean" ? t : dt(t),
                            n
                        ];
                    },
                    useSyncExternalStore: ha,
                    useId: Ms,
                    useHostTransitionStatus: xa,
                    useFormState: va,
                    useActionState: va,
                    useOptimistic: function(t, n) {
                        var l = mt();
                        return Ht !== null ? Wr(l, Ht, t, n) : (l.baseState = t, [
                            t,
                            l.queue.dispatch
                        ]);
                    },
                    useMemoCache: Ln,
                    useCacheRefresh: Tn
                };
                qh.useEffectEvent = _r;
                var dc = {
                    enqueueSetState: function(t, n, l) {
                        t = t._reactInternals;
                        var f = sr(), m = z(f);
                        m.payload = n, l != null && (m.callback = l), n = Q(t, m, f), n !== null && ($n(n, t, f), ae(n, t, f));
                    },
                    enqueueReplaceState: function(t, n, l) {
                        t = t._reactInternals;
                        var f = sr(), m = z(f);
                        m.tag = 1, m.payload = n, l != null && (m.callback = l), n = Q(t, m, f), n !== null && ($n(n, t, f), ae(n, t, f));
                    },
                    enqueueForceUpdate: function(t, n) {
                        t = t._reactInternals;
                        var l = sr(), f = z(l);
                        f.tag = 2, n != null && (f.callback = n), n = Q(t, f, l), n !== null && ($n(n, t, l), ae(n, t, l));
                    }
                }, hc = Error(i(461)), dn = !1, pc = {
                    dehydrated: null,
                    treeContext: null,
                    retryLane: 0,
                    hydrationErrors: null
                }, ti = !1, hn = !1, mc = !1, Zh = typeof WeakSet == "function" ? WeakSet : Set, _n = null, pn = null, er = !1, Rr = null, Ha = 8192, G1 = {
                    getCacheForType: function(t) {
                        var n = Se(tn), l = n.data.get(t);
                        return l === void 0 && (l = t(), n.data.set(t, l)), l;
                    },
                    cacheSignal: function() {
                        return Se(tn).controller.signal;
                    }
                }, nl = 0, rl = 1, il = 2, al = 3, ol = 4;
                if (typeof Symbol == "function" && Symbol.for) {
                    var Ho = Symbol.for;
                    nl = Ho("selector.component"), rl = Ho("selector.has_pseudo_class"), il = Ho("selector.role"), al = Ho("selector.test_id"), ol = Ho("selector.text");
                }
                var H1 = typeof WeakMap == "function" ? WeakMap : Map, wt = 0, Xt = null, St = null, _t = 0, Bt = 0, hr = null, Mi = !1, Wa = !1, gc = !1, ni = 0, on = 0, Ci = 0, ra = 0, vc = 0, pr = 0, Va = 0, Wo = null, tr = null, yc = !1, sl = 0, Qh = 0, Vo = 1 / 0, ll = null, Ti = null, wn = 0, Pi = null, Xa = null, ri = 0, bc = 0, wc = null, Kh = null, Xo = 0, Sc = null;
                return bt.attemptContinuousHydration = function(t) {
                    if (t.tag === 13 || t.tag === 31) {
                        var n = Je(t, 67108864);
                        n !== null && $n(n, t, 67108864), ju(t, 67108864);
                    }
                }, bt.attemptHydrationAtCurrentPriority = function(t) {
                    if (t.tag === 13 || t.tag === 31) {
                        var n = sr();
                        n = Y(n);
                        var l = Je(t, n);
                        l !== null && $n(l, t, n), ju(t, n);
                    }
                }, bt.attemptSynchronousHydration = function(t) {
                    switch(t.tag){
                        case 3:
                            if (t = t.stateNode, t.current.memoizedState.isDehydrated) {
                                var n = x(t.pendingLanes);
                                if (n !== 0) {
                                    for(t.pendingLanes |= 2, t.entangledLanes |= 2; n;){
                                        var l = 1 << 31 - ur(n);
                                        t.entanglements[1] |= l, n &= ~l;
                                    }
                                    Be(t), (wt & 6) === 0 && (Vo = Jn() + 500, et(0));
                                }
                            }
                            break;
                        case 31:
                        case 13:
                            n = Je(t, 2), n !== null && $n(n, t, 2), Xd(), ju(t, 2);
                    }
                }, bt.batchedUpdates = function(t, n) {
                    return t(n);
                }, bt.createComponentSelector = function(t) {
                    return {
                        $$typeof: nl,
                        value: t
                    };
                }, bt.createContainer = function(t, n, l, f, m, g, E, j, le, ve) {
                    return ch(t, n, !1, null, l, f, g, null, E, j, le, ve);
                }, bt.createHasPseudoClassSelector = function(t) {
                    return {
                        $$typeof: rl,
                        value: t
                    };
                }, bt.createHydrationContainer = function(t, n, l, f, m, g, E, j, le, ve, De, _e, We, pt) {
                    var mn;
                    return t = ch(l, f, !0, t, m, g, j, pt, le, ve, De, _e), t.context = fh(null), l = t.current, f = sr(), f = Y(f), m = z(f), m.callback = (mn = n) != null ? mn : null, Q(l, m, f), n = f, t.current.lanes = n, R(t, n), Be(t), t;
                }, bt.createPortal = function(t, n, l) {
                    var f = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
                    return {
                        $$typeof: Ca,
                        key: f == null ? null : "" + f,
                        children: t,
                        containerInfo: n,
                        implementation: l
                    };
                }, bt.createRoleSelector = function(t) {
                    return {
                        $$typeof: il,
                        value: t
                    };
                }, bt.createTestNameSelector = function(t) {
                    return {
                        $$typeof: al,
                        value: t
                    };
                }, bt.createTextSelector = function(t) {
                    return {
                        $$typeof: ol,
                        value: t
                    };
                }, bt.defaultOnCaughtError = function(t) {
                    console.error(t);
                }, bt.defaultOnRecoverableError = function(t) {
                    Gh(t);
                }, bt.defaultOnUncaughtError = function(t) {
                    Gh(t);
                }, bt.deferredUpdates = function(t) {
                    var n = nt.T, l = $r();
                    try {
                        return xn(32), nt.T = null, t();
                    } finally{
                        xn(l), nt.T = n;
                    }
                }, bt.discreteUpdates = function(t, n, l, f, m) {
                    var g = nt.T, E = $r();
                    try {
                        return xn(2), nt.T = null, t(n, l, f, m);
                    } finally{
                        xn(E), nt.T = g, wt === 0 && (Vo = Jn() + 500);
                    }
                }, bt.findAllNodes = Fu, bt.findBoundingRects = function(t, n) {
                    if (!Do) throw Error(i(363));
                    n = Fu(t, n), t = [];
                    for(var l = 0; l < n.length; l++)t.push(E0(n[l]));
                    for(n = t.length - 1; 0 < n; n--){
                        l = t[n];
                        for(var f = l.x, m = f + l.width, g = l.y, E = g + l.height, j = n - 1; 0 <= j; j--)if (n !== j) {
                            var le = t[j], ve = le.x, De = ve + le.width, _e = le.y, We = _e + le.height;
                            if (f >= ve && g >= _e && m <= De && E <= We) {
                                t.splice(n, 1);
                                break;
                            } else if (f !== ve || l.width !== le.width || We < g || _e > E) {
                                if (!(g !== _e || l.height !== le.height || De < f || ve > m)) {
                                    ve > f && (le.width += ve - f, le.x = f), De < m && (le.width = m - ve), t.splice(n, 1);
                                    break;
                                }
                            } else {
                                _e > g && (le.height += _e - g, le.y = g), We < E && (le.height = E - _e), t.splice(n, 1);
                                break;
                            }
                        }
                    }
                    return t;
                }, bt.findHostInstance = dh, bt.findHostInstanceWithNoPortals = function(t) {
                    return t = d(t), t = t !== null ? h(t) : null, t === null ? null : Fo(t.stateNode);
                }, bt.findHostInstanceWithWarning = function(t) {
                    return dh(t);
                }, bt.flushPassiveEffects = Ao, bt.flushSyncFromReconciler = function(t) {
                    var n = wt;
                    wt |= 1;
                    var l = nt.T, f = $r();
                    try {
                        if (xn(2), nt.T = null, t) return t();
                    } finally{
                        xn(f), nt.T = l, wt = n, (wt & 6) === 0 && et(0);
                    }
                }, bt.flushSyncWork = Xd, bt.focusWithin = function(t, n) {
                    if (!Do) throw Error(i(363));
                    for(t = Ru(t), n = Gd(t, n), n = Array.from(n), t = 0; t < n.length;){
                        var l = n[t++], f = l.tag;
                        if (!Uo(l)) {
                            if ((f === 5 || f === 26 || f === 27) && T0(l.stateNode)) return !0;
                            for(l = l.child; l !== null;)n.push(l), l = l.sibling;
                        }
                    }
                    return !1;
                }, bt.getFindAllNodesFailureDescription = function(t, n) {
                    if (!Do) throw Error(i(363));
                    var l = 0, f = [];
                    t = [
                        Ru(t),
                        0
                    ];
                    for(var m = 0; m < t.length;){
                        var g = t[m++], E = g.tag, j = t[m++], le = n[j];
                        if ((E !== 5 && E !== 26 && E !== 27 || !Uo(g)) && (Iu(g, le) && (f.push(Au(le)), j++, j > l && (l = j)), j < n.length)) for(g = g.child; g !== null;)t.push(g, j), g = g.sibling;
                    }
                    if (l < n.length) {
                        for(t = []; l < n.length; l++)t.push(Au(n[l]));
                        return `findAllNodes was able to match part of the selector:
  ` + (f.join(" > ") + `

No matching component was found for:
  `) + t.join(" > ");
                    }
                    return null;
                }, bt.getPublicRootInstance = function(t) {
                    if (t = t.current, !t.child) return null;
                    switch(t.child.tag){
                        case 27:
                        case 5:
                            return Fo(t.child.stateNode);
                        default:
                            return t.child.stateNode;
                    }
                }, bt.injectIntoDevTools = function() {
                    var t = {
                        bundleType: 0,
                        version: n0,
                        rendererPackageName: r0,
                        currentDispatcherRef: nt,
                        reconcilerVersion: "19.2.0"
                    };
                    if (yh !== null && (t.rendererConfig = yh), typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u") t = !1;
                    else {
                        var n = __REACT_DEVTOOLS_GLOBAL_HOOK__;
                        if (n.isDisabled || !n.supportsFiber) t = !0;
                        else {
                            try {
                                Oo = n.inject(t), cr = n;
                            } catch  {}
                            t = !!n.checkDCE;
                        }
                    }
                    return t;
                }, bt.isAlreadyRendering = function() {
                    return (wt & 6) !== 0;
                }, bt.observeVisibleRects = function(t, n, l, f) {
                    if (!Do) throw Error(i(363));
                    t = Fu(t, n);
                    var m = P0(t, l, f).disconnect;
                    return {
                        disconnect: function() {
                            m();
                        }
                    };
                }, bt.shouldError = function() {
                    return null;
                }, bt.shouldSuspend = function() {
                    return !1;
                }, bt.startHostTransition = function(t, n, l, f) {
                    if (t.tag !== 5) throw Error(i(476));
                    var m = Wi(t).queue;
                    Hi(t, m, n, Pa, l === null ? s : function() {
                        var g = Wi(t);
                        return g.next === null && (g = t.alternate.memoizedState), gi(t, g.next.queue, {}, sr()), l(f);
                    });
                }, bt.updateContainer = function(t, n, l, f) {
                    var m = n.current, g = sr();
                    return hh(m, g, t, n, l, f), g;
                }, bt.updateContainerSync = function(t, n, l, f) {
                    return hh(n.current, 2, t, n, l, f), 2;
                }, bt;
            }, r.exports.default = r.exports, Object.defineProperty(r.exports, "__esModule", {
                value: !0
            });
        })(pp)), pp.exports;
    }
    var gp;
    function Ob() {
        return gp || (gp = 1, hp.exports = Ub()), hp.exports;
    }
    var Lb = Ob();
    const zb = Db(Lb);
    function Nb(r) {
        const e = zb(r);
        return e.injectIntoDevTools(), e;
    }
    const yg = 0, so = {}, jb = /^three(?=[A-Z])/, Kl = (r)=>`${r[0].toUpperCase()}${r.slice(1)}`;
    let Bb = 0;
    const Gb = (r)=>typeof r == "function";
    function $l(r) {
        if (Gb(r)) {
            const e = `${Bb++}`;
            return so[e] = r, e;
        } else Object.assign(so, r);
    }
    function bg(r, e) {
        const a = Kl(r), s = so[a];
        if (r !== "primitive" && !s) throw new Error(`R3F: ${a} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`);
        if (r === "primitive" && !e.object) throw new Error("R3F: Primitives without 'object' are invalid!");
        if (e.args !== void 0 && !Array.isArray(e.args)) throw new Error("R3F: The args prop must be an array!");
    }
    function Hb(r, e, a) {
        var s;
        return r = Kl(r) in so ? r : r.replace(jb, ""), bg(r, e), r === "primitive" && (s = e.object) != null && s.__r3f && delete e.object.__r3f, Ul(e.object, a, r, e);
    }
    function Wb(r) {
        if (!r.isHidden) {
            var e;
            r.props.attach && (e = r.parent) != null && e.object ? Ll(r.parent, r) : Zn(r.object) && (r.object.visible = !1), r.isHidden = !0, ho(r);
        }
    }
    function wg(r) {
        if (r.isHidden) {
            var e;
            r.props.attach && (e = r.parent) != null && e.object ? Ol(r.parent, r) : Zn(r.object) && r.props.visible !== !1 && (r.object.visible = !0), r.isHidden = !1, ho(r);
        }
    }
    function If(r, e, a) {
        const s = e.root.getState();
        if (!(!r.parent && r.object !== s.scene)) {
            if (!e.object) {
                var i, o;
                const u = so[Kl(e.type)];
                e.object = (i = e.props.object) != null ? i : new u(...(o = e.props.args) != null ? o : []), e.object.__r3f = e;
            }
            if (jr(e.object, e.props), e.props.attach) Ol(r, e);
            else if (Zn(e.object) && Zn(r.object)) {
                const u = r.object.children.indexOf(a?.object);
                if (a && u !== -1) {
                    const d = r.object.children.indexOf(e.object);
                    if (d !== -1) {
                        r.object.children.splice(d, 1);
                        const c = d < u ? u - 1 : u;
                        r.object.children.splice(c, 0, e.object);
                    } else e.object.parent = r.object, r.object.children.splice(u, 0, e.object), e.object.dispatchEvent({
                        type: "added"
                    }), r.object.dispatchEvent({
                        type: "childadded",
                        child: e.object
                    });
                } else r.object.add(e.object);
            }
            for (const u of e.children)If(e, u);
            ho(e);
        }
    }
    function Tc(r, e) {
        e && (e.parent = r, r.children.push(e), If(r, e));
    }
    function vp(r, e, a) {
        if (!e || !a) return;
        e.parent = r;
        const s = r.children.indexOf(a);
        s !== -1 ? r.children.splice(s, 0, e) : r.children.push(e), If(r, e, a);
    }
    function Sg(r) {
        if (typeof r.dispose == "function") {
            const e = ()=>{
                try {
                    r.dispose();
                } catch  {}
            };
            typeof IS_REACT_ACT_ENVIRONMENT < "u" ? e() : rf.unstable_scheduleCallback(rf.unstable_IdlePriority, e);
        }
    }
    function of(r, e, a) {
        if (!e) return;
        e.parent = null;
        const s = r.children.indexOf(e);
        s !== -1 && r.children.splice(s, 1), e.props.attach ? Ll(r, e) : Zn(e.object) && Zn(r.object) && (r.object.remove(e.object), Mb(kf(e), e.object));
        const i = e.props.dispose !== null && a !== !1;
        for(let o = e.children.length - 1; o >= 0; o--){
            const u = e.children[o];
            of(e, u, i);
        }
        e.children.length = 0, delete e.object.__r3f, i && e.type !== "primitive" && e.object.type !== "Scene" && Sg(e.object), a === void 0 && ho(e);
    }
    function Vb(r, e) {
        for (const a of [
            r,
            r.alternate
        ])if (a !== null) if (typeof a.ref == "function") {
            a.refCleanup == null || a.refCleanup();
            const s = a.ref(e);
            typeof s == "function" && (a.refCleanup = s);
        } else a.ref && (a.ref.current = e);
    }
    const Cl = [];
    function Xb() {
        for (const [a] of Cl){
            const s = a.parent;
            if (s) {
                a.props.attach ? Ll(s, a) : Zn(a.object) && Zn(s.object) && s.object.remove(a.object);
                for (const i of a.children)i.props.attach ? Ll(a, i) : Zn(i.object) && Zn(a.object) && a.object.remove(i.object);
            }
            a.isHidden && wg(a), a.object.__r3f && delete a.object.__r3f, a.type !== "primitive" && Sg(a.object);
        }
        for (const [a, s, i] of Cl){
            a.props = s;
            const o = a.parent;
            if (o) {
                var r, e;
                const u = so[Kl(a.type)], d = a.object;
                a.object = (r = a.props.object) != null ? r : new u(...(e = a.props.args) != null ? e : []), a.object.__r3f = a, Vb(i, a.object), Eb(kf(a), d, a.object), jr(a.object, a.props), a.props.attach ? Ol(o, a) : Zn(a.object) && Zn(o.object) && o.object.add(a.object);
                for (const c of a.children)c.props.attach ? Ol(a, c) : Zn(c.object) && Zn(a.object) && a.object.add(c.object);
                ho(a);
            }
        }
        Cl.length = 0;
    }
    const Pc = ()=>{}, yp = {};
    let ul = yg;
    const Yb = 0, qb = 4, lo = Nb({
        isPrimaryRenderer: !1,
        warnsIfNotActing: !1,
        supportsMutation: !0,
        supportsPersistence: !1,
        supportsHydration: !1,
        createInstance: Hb,
        removeChild: of,
        appendChild: Tc,
        appendInitialChild: Tc,
        insertBefore: vp,
        appendChildToContainer (r, e) {
            const a = r.getState().scene.__r3f;
            !e || !a || Tc(a, e);
        },
        removeChildFromContainer (r, e) {
            const a = r.getState().scene.__r3f;
            !e || !a || of(a, e);
        },
        insertInContainerBefore (r, e, a) {
            const s = r.getState().scene.__r3f;
            !e || !a || !s || vp(s, e, a);
        },
        getRootHostContext: ()=>yp,
        getChildHostContext: ()=>yp,
        commitUpdate (r, e, a, s, i) {
            var o, u, d;
            bg(e, s);
            let c = !1;
            if ((r.type === "primitive" && a.object !== s.object || ((o = s.args) == null ? void 0 : o.length) !== ((u = a.args) == null ? void 0 : u.length) || (d = s.args) != null && d.some((p, v)=>{
                var y;
                return p !== ((y = a.args) == null ? void 0 : y[v]);
            })) && (c = !0), c) Cl.push([
                r,
                {
                    ...s
                },
                i
            ]);
            else {
                const p = Sb(r, s);
                Object.keys(p).length && (Object.assign(r.props, p), jr(r.object, p));
            }
            (i.sibling === null || (i.flags & qb) === Yb) && Xb();
        },
        finalizeInitialChildren: ()=>!1,
        commitMount () {},
        getPublicInstance: (r)=>r?.object,
        prepareForCommit: ()=>null,
        preparePortalMount: (r)=>Ul(r.getState().scene, r, "", {}),
        resetAfterCommit: ()=>{},
        shouldSetTextContent: ()=>!1,
        clearContainer: ()=>!1,
        hideInstance: Wb,
        unhideInstance: wg,
        createTextInstance: Pc,
        hideTextInstance: Pc,
        unhideTextInstance: Pc,
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
        HostTransitionContext: M.createContext(null),
        setCurrentUpdatePriority (r) {
            ul = r;
        },
        getCurrentUpdatePriority () {
            return ul;
        },
        resolveUpdatePriority () {
            var r;
            if (ul !== yg) return ul;
            switch(typeof window < "u" && ((r = window.event) == null ? void 0 : r.type)){
                case "click":
                case "contextmenu":
                case "dblclick":
                case "pointercancel":
                case "pointerdown":
                case "pointerup":
                    return Ab;
                case "pointermove":
                case "pointerout":
                case "pointerover":
                case "pointerenter":
                case "pointerleave":
                case "wheel":
                    return Rb;
                default:
                    return Ib;
            }
        },
        resetFormInstance () {},
        rendererPackageName: "@react-three/fiber",
        rendererVersion: Fb.version,
        applyViewTransitionName (r, e, a) {},
        restoreViewTransitionName (r, e) {},
        cancelViewTransitionName (r, e, a) {},
        cancelRootViewTransitionName (r) {},
        restoreRootViewTransitionName (r) {},
        InstanceMeasurement: null,
        measureInstance: (r)=>null,
        wasInstanceInViewport: (r)=>!0,
        hasInstanceChanged: (r, e)=>!1,
        hasInstanceAffectedParent: (r, e)=>!1,
        suspendOnActiveViewTransition (r, e) {},
        startGestureTransition: ()=>null,
        startViewTransition: ()=>null,
        stopViewTransition (r) {},
        createViewTransitionInstance: (r)=>null,
        getCurrentGestureOffset (r) {
            throw new Error("startGestureTransition is not yet supported in react-three-fiber.");
        },
        cloneMutableInstance (r, e) {
            return r;
        },
        cloneMutableTextInstance (r) {
            return r;
        },
        cloneRootViewTransitionContainer (r) {
            throw new Error("Not implemented.");
        },
        removeRootViewTransitionClone (r, e) {
            throw new Error("Not implemented.");
        },
        createFragmentInstance: (r)=>null,
        updateFragmentInstanceFiber (r, e) {},
        commitNewChildToFragmentInstance (r, e) {},
        deleteChildFromFragmentInstance (r, e) {},
        measureClonedInstance: (r)=>null,
        maySuspendCommitOnUpdate: (r, e, a)=>!1,
        maySuspendCommitInSyncRender: (r, e)=>!1,
        startSuspendingCommit: ()=>null,
        getSuspendedCommitReason: (r, e)=>null
    }), fa = new Map, Qa = {
        objects: "shallow",
        strict: !1
    };
    function Zb(r, e) {
        if (!e && typeof HTMLCanvasElement < "u" && r instanceof HTMLCanvasElement && r.parentElement) {
            const { width: a, height: s, top: i, left: o } = r.parentElement.getBoundingClientRect();
            return {
                width: a,
                height: s,
                top: i,
                left: o
            };
        } else if (!e && typeof OffscreenCanvas < "u" && r instanceof OffscreenCanvas) return {
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
            ...e
        };
    }
    function Qb(r) {
        const e = fa.get(r), a = e?.fiber, s = e?.store;
        e && console.warn("R3F.createRoot should only be called once!");
        const i = typeof reportError == "function" ? reportError : console.error, o = s || Tb(uf, wp), u = a || lo.createContainer(o, kb, null, !1, null, "", i, i, i, null);
        e || fa.set(r, {
            fiber: u,
            store: o
        });
        let d, c, h = !1, p = null;
        return {
            async configure (v = {}) {
                let y;
                p = new Promise((O)=>y = O);
                let { gl: b, size: S, scene: _, events: x, onCreated: k, shadows: T = !1, linear: A = !1, flat: U = !1, legacy: D = !1, orthographic: R = !1, frameloop: N = "always", dpr: P = [
                    1,
                    2
                ], performance: I, raycaster: F, camera: Y, onPointerMissed: L } = v, G = o.getState(), B = G.gl;
                if (!G.gl) {
                    const O = {
                        canvas: r,
                        powerPreference: "high-performance",
                        antialias: !0,
                        alpha: !0
                    }, H = typeof b == "function" ? await b(O) : b;
                    fp(H) ? B = H : B = new Ym({
                        ...O,
                        ...b
                    }), G.set({
                        gl: B
                    });
                }
                let K = G.raycaster;
                K || G.set({
                    raycaster: K = new co
                });
                const { params: ee, ...ye } = F || {};
                if (qt.equ(ye, K, Qa) || jr(K, {
                    ...ye
                }), qt.equ(ee, K.params, Qa) || jr(K, {
                    params: {
                        ...K.params,
                        ...ee
                    }
                }), !G.camera || G.camera === c && !qt.equ(c, Y, Qa)) {
                    c = Y;
                    const O = Y?.isCamera, H = O ? Y : R ? new Di(0, 0, 0, 0, .1, 1e3) : new la(75, 0, .1, 1e3);
                    O || (H.position.z = 5, Y && (jr(H, Y), H.manual || ("aspect" in Y || "left" in Y || "right" in Y || "bottom" in Y || "top" in Y) && (H.manual = !0, H.updateProjectionMatrix())), !G.camera && !(Y != null && Y.rotation) && H.lookAt(0, 0, 0)), G.set({
                        camera: H
                    }), K.camera = H;
                }
                if (!G.scene) {
                    let O;
                    _ != null && _.isScene ? (O = _, Ul(O, o, "", {})) : (O = new fs, Ul(O, o, "", {}), _ && jr(O, _)), G.set({
                        scene: O
                    });
                }
                x && !G.events.handlers && G.set({
                    events: x(o)
                });
                const xe = Zb(r, S);
                if (qt.equ(xe, G.size, Qa) || G.setSize(xe.width, xe.height, xe.top, xe.left), P && G.viewport.dpr !== hg(P) && G.setDpr(P), G.frameloop !== N && G.setFrameloop(N), G.onPointerMissed || G.set({
                    onPointerMissed: L
                }), I && !qt.equ(I, G.performance, Qa) && G.set((O)=>({
                        performance: {
                            ...O.performance,
                            ...I
                        }
                    })), !G.xr) {
                    var te;
                    const O = (Z, $)=>{
                        const oe = o.getState();
                        oe.frameloop !== "never" && wp(Z, !0, oe, $);
                    }, H = ()=>{
                        const Z = o.getState();
                        Z.gl.xr.enabled = Z.gl.xr.isPresenting, Z.gl.xr.setAnimationLoop(Z.gl.xr.isPresenting ? O : null), Z.gl.xr.isPresenting || uf(Z);
                    }, X = {
                        connect () {
                            const Z = o.getState().gl;
                            Z.xr.addEventListener("sessionstart", H), Z.xr.addEventListener("sessionend", H);
                        },
                        disconnect () {
                            const Z = o.getState().gl;
                            Z.xr.removeEventListener("sessionstart", H), Z.xr.removeEventListener("sessionend", H);
                        }
                    };
                    typeof ((te = B.xr) == null ? void 0 : te.addEventListener) == "function" && X.connect(), G.set({
                        xr: X
                    });
                }
                if (B.shadowMap) {
                    const O = B.shadowMap.enabled, H = B.shadowMap.type;
                    if (B.shadowMap.enabled = !!T, qt.boo(T)) B.shadowMap.type = xc;
                    else if (qt.str(T)) {
                        var q;
                        const X = {
                            basic: q1,
                            percentage: Y1,
                            soft: xc,
                            variance: X1
                        };
                        B.shadowMap.type = (q = X[T]) != null ? q : xc;
                    } else qt.obj(T) && Object.assign(B.shadowMap, T);
                    (O !== B.shadowMap.enabled || H !== B.shadowMap.type) && (B.shadowMap.needsUpdate = !0);
                }
                return Z1.enabled = !D, h || (B.outputColorSpace = A ? Rl : Yl, B.toneMapping = U ? qm : Q1), G.legacy !== D && G.set(()=>({
                        legacy: D
                    })), G.linear !== A && G.set(()=>({
                        linear: A
                    })), G.flat !== U && G.set(()=>({
                        flat: U
                    })), b && !qt.fun(b) && !fp(b) && !qt.equ(b, B, Qa) && jr(B, b), d = k, h = !0, y(), this;
            },
            render (v) {
                return !h && !p && this.configure(), p.then(()=>{
                    lo.updateContainer(ne.jsx(Kb, {
                        store: o,
                        children: v,
                        onCreated: d,
                        rootElement: r
                    }), u, null, ()=>{});
                }), o;
            },
            unmount () {
                xg(r);
            }
        };
    }
    function Kb({ store: r, children: e, onCreated: a, rootElement: s }) {
        return ds(()=>{
            const i = r.getState();
            i.set((o)=>({
                    internal: {
                        ...o.internal,
                        active: !0
                    }
                })), a && a(i), r.getState().events.connected || i.events.connect == null || i.events.connect(s);
        }, []), ne.jsx(hs.Provider, {
            value: r,
            children: e
        });
    }
    function xg(r, e) {
        const a = fa.get(r), s = a?.fiber;
        if (s) {
            const i = a?.store.getState();
            i && (i.internal.active = !1), lo.updateContainer(null, s, null, ()=>{
                i && setTimeout(()=>{
                    try {
                        var o, u, d, c;
                        i.events.disconnect == null || i.events.disconnect(), (o = i.gl) == null || (u = o.renderLists) == null || u.dispose == null || u.dispose(), (d = i.gl) == null || d.forceContextLoss == null || d.forceContextLoss(), (c = i.gl) != null && c.xr && i.xr.disconnect(), yb(i.scene), fa.delete(r);
                    } catch  {}
                }, 500);
            });
        }
    }
    function ps(r, e, a) {
        return ne.jsx($b, {
            children: r,
            container: e,
            state: a
        });
    }
    function $b({ state: r = {}, children: e, container: a }) {
        const { events: s, size: i, ...o } = r, u = Hr(), [d] = M.useState(()=>new co), [c] = M.useState(()=>new Ft), h = Rf((v, y)=>{
            let b;
            if (y.camera && i) {
                const S = y.camera;
                b = v.viewport.getCurrentViewport(S, new ke, i), S !== v.camera && mg(S, i);
            }
            return {
                ...v,
                ...y,
                scene: a,
                raycaster: d,
                pointer: c,
                mouse: c,
                previousRoot: u,
                events: {
                    ...v.events,
                    ...y.events,
                    ...s
                },
                size: {
                    ...v.size,
                    ...i
                },
                viewport: {
                    ...v.viewport,
                    ...b
                },
                setEvents: (S)=>y.set((_)=>({
                            ..._,
                            events: {
                                ..._.events,
                                ...S
                            }
                        }))
            };
        }), p = M.useMemo(()=>{
            const v = og((b, S)=>({
                    ...o,
                    set: b,
                    get: S
                })), y = (b)=>v.setState((S)=>h.current(b, S));
            return y(u.getState()), u.subscribe(y), v;
        }, [
            u,
            a
        ]);
        return ne.jsx(ne.Fragment, {
            children: lo.createPortal(ne.jsx(hs.Provider, {
                value: p,
                children: e
            }), p, null)
        });
    }
    function Jb(r, e) {
        const a = {
            callback: r
        };
        return e.add(a), ()=>void e.delete(a);
    }
    const _g = new Set, ew = new Set, tw = new Set, nw = (r)=>Jb(r, _g);
    function kc(r, e) {
        if (r.size) for (const { callback: a } of r.values())a(e);
    }
    function is(r, e) {
        switch(r){
            case "before":
                return kc(_g, e);
            case "after":
                return kc(ew, e);
            case "tail":
                return kc(tw, e);
        }
    }
    let Rc, Ic;
    function sf(r, e, a) {
        let s = e.clock.getDelta();
        e.frameloop === "never" && typeof r == "number" && (s = r - e.clock.elapsedTime, e.clock.oldTime = e.clock.elapsedTime, e.clock.elapsedTime = r), Rc = e.internal.subscribers;
        for(let i = 0; i < Rc.length; i++)Ic = Rc[i], Ic.ref.current(Ic.store.getState(), s, a);
        return !e.internal.priority && e.gl.render && e.gl.render(e.scene, e.camera), e.internal.frames = Math.max(0, e.internal.frames - 1), e.frameloop === "always" ? 1 : e.internal.frames;
    }
    let zl = !1, lf = !1, Ac, bp, Ka;
    function Eg(r) {
        bp = requestAnimationFrame(Eg), zl = !0, Ac = 0, is("before", r), lf = !0;
        for (const a of fa.values()){
            var e;
            Ka = a.store.getState(), Ka.internal.active && (Ka.frameloop === "always" || Ka.internal.frames > 0) && !((e = Ka.gl.xr) != null && e.isPresenting) && (Ac += sf(r, Ka));
        }
        if (lf = !1, is("after", r), Ac === 0) return is("tail", r), zl = !1, cancelAnimationFrame(bp);
    }
    function uf(r, e = 1) {
        var a;
        if (!r) return fa.forEach((s)=>uf(s.store.getState(), e));
        (a = r.gl.xr) != null && a.isPresenting || !r.internal.active || r.frameloop === "never" || (e > 1 ? r.internal.frames = Math.min(60, r.internal.frames + e) : lf ? r.internal.frames = 2 : r.internal.frames = 1, zl || (zl = !0, requestAnimationFrame(Eg)));
    }
    function wp(r, e = !0, a, s) {
        if (e && is("before", r), a) sf(r, a, s);
        else for (const i of fa.values())sf(r, i.store.getState());
        e && is("after", r);
    }
    const Fc = {
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
    function rw(r) {
        const { handlePointer: e } = Cb(r);
        return {
            priority: 1,
            enabled: !0,
            compute (a, s, i) {
                s.pointer.set(a.offsetX / s.size.width * 2 - 1, -(a.offsetY / s.size.height) * 2 + 1), s.raycaster.setFromCamera(s.pointer, s.camera);
            },
            connected: void 0,
            handlers: Object.keys(Fc).reduce((a, s)=>({
                    ...a,
                    [s]: e(s)
                }), {}),
            update: ()=>{
                var a;
                const { events: s, internal: i } = r.getState();
                (a = i.lastEvent) != null && a.current && s.handlers && s.handlers.onPointerMove(i.lastEvent.current);
            },
            connect: (a)=>{
                const { set: s, events: i } = r.getState();
                if (i.disconnect == null || i.disconnect(), s((o)=>({
                        events: {
                            ...o.events,
                            connected: a
                        }
                    })), i.handlers) for(const o in i.handlers){
                    const u = i.handlers[o], [d, c] = Fc[o];
                    a.addEventListener(d, u, {
                        passive: c
                    });
                }
            },
            disconnect: ()=>{
                const { set: a, events: s } = r.getState();
                if (s.connected) {
                    if (s.handlers) for(const i in s.handlers){
                        const o = s.handlers[i], [u] = Fc[i];
                        s.connected.removeEventListener(u, o);
                    }
                    a((i)=>({
                            events: {
                                ...i.events,
                                connected: void 0
                            }
                        }));
                }
            }
        };
    }
    function Sp(r, e) {
        let a;
        return (...s)=>{
            window.clearTimeout(a), a = window.setTimeout(()=>r(...s), e);
        };
    }
    function iw({ debounce: r, scroll: e, polyfill: a, offsetSize: s } = {
        debounce: 0,
        scroll: !1,
        offsetSize: !1
    }) {
        const i = a || (typeof window > "u" ? class {
        } : window.ResizeObserver);
        if (!i) throw new Error("This browser does not support ResizeObserver out of the box. See: https://github.com/react-spring/react-use-measure/#resize-observer-polyfills");
        const [o, u] = M.useState({
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            bottom: 0,
            right: 0,
            x: 0,
            y: 0
        }), d = M.useRef({
            element: null,
            scrollContainers: null,
            resizeObserver: null,
            lastBounds: o,
            orientationHandler: null
        }), c = r ? typeof r == "number" ? r : r.scroll : null, h = r ? typeof r == "number" ? r : r.resize : null, p = M.useRef(!1);
        M.useEffect(()=>(p.current = !0, ()=>void (p.current = !1)));
        const [v, y, b] = M.useMemo(()=>{
            const k = ()=>{
                if (!d.current.element) return;
                const { left: T, top: A, width: U, height: D, bottom: R, right: N, x: P, y: I } = d.current.element.getBoundingClientRect(), F = {
                    left: T,
                    top: A,
                    width: U,
                    height: D,
                    bottom: R,
                    right: N,
                    x: P,
                    y: I
                };
                d.current.element instanceof HTMLElement && s && (F.height = d.current.element.offsetHeight, F.width = d.current.element.offsetWidth), Object.freeze(F), p.current && !lw(d.current.lastBounds, F) && u(d.current.lastBounds = F);
            };
            return [
                k,
                h ? Sp(k, h) : k,
                c ? Sp(k, c) : k
            ];
        }, [
            u,
            s,
            c,
            h
        ]);
        function S() {
            d.current.scrollContainers && (d.current.scrollContainers.forEach((k)=>k.removeEventListener("scroll", b, !0)), d.current.scrollContainers = null), d.current.resizeObserver && (d.current.resizeObserver.disconnect(), d.current.resizeObserver = null), d.current.orientationHandler && ("orientation" in screen && "removeEventListener" in screen.orientation ? screen.orientation.removeEventListener("change", d.current.orientationHandler) : "onorientationchange" in window && window.removeEventListener("orientationchange", d.current.orientationHandler));
        }
        function _() {
            d.current.element && (d.current.resizeObserver = new i(b), d.current.resizeObserver.observe(d.current.element), e && d.current.scrollContainers && d.current.scrollContainers.forEach((k)=>k.addEventListener("scroll", b, {
                    capture: !0,
                    passive: !0
                })), d.current.orientationHandler = ()=>{
                b();
            }, "orientation" in screen && "addEventListener" in screen.orientation ? screen.orientation.addEventListener("change", d.current.orientationHandler) : "onorientationchange" in window && window.addEventListener("orientationchange", d.current.orientationHandler));
        }
        const x = (k)=>{
            !k || k === d.current.element || (S(), d.current.element = k, d.current.scrollContainers = Mg(k), _());
        };
        return ow(b, !!e), aw(y), M.useEffect(()=>{
            S(), _();
        }, [
            e,
            b,
            y
        ]), M.useEffect(()=>S, []), [
            x,
            o,
            v
        ];
    }
    function aw(r) {
        M.useEffect(()=>{
            const e = r;
            return window.addEventListener("resize", e), ()=>void window.removeEventListener("resize", e);
        }, [
            r
        ]);
    }
    function ow(r, e) {
        M.useEffect(()=>{
            if (e) {
                const a = r;
                return window.addEventListener("scroll", a, {
                    capture: !0,
                    passive: !0
                }), ()=>void window.removeEventListener("scroll", a, !0);
            }
        }, [
            r,
            e
        ]);
    }
    function Mg(r) {
        const e = [];
        if (!r || r === document.body) return e;
        const { overflow: a, overflowX: s, overflowY: i } = window.getComputedStyle(r);
        return [
            a,
            s,
            i
        ].some((o)=>o === "auto" || o === "scroll") && e.push(r), [
            ...e,
            ...Mg(r.parentElement)
        ];
    }
    const sw = [
        "x",
        "y",
        "top",
        "bottom",
        "left",
        "right",
        "width",
        "height"
    ], lw = (r, e)=>sw.every((a)=>r[a] === e[a]);
    function uw({ ref: r, children: e, fallback: a, resize: s, style: i, gl: o, events: u = rw, eventSource: d, eventPrefix: c, shadows: h, linear: p, flat: v, legacy: y, orthographic: b, frameloop: S, dpr: _, performance: x, raycaster: k, camera: T, scene: A, onPointerMissed: U, onCreated: D, ...R }) {
        M.useMemo(()=>$l($1), []);
        const N = pb(), [P, I] = iw({
            scroll: !0,
            debounce: {
                scroll: 50,
                resize: 0
            },
            ...s
        }), F = M.useRef(null), Y = M.useRef(null);
        M.useImperativeHandle(r, ()=>F.current);
        const L = Rf(U), [G, B] = M.useState(!1), [K, ee] = M.useState(!1);
        if (G) throw G;
        if (K) throw K;
        const ye = M.useRef(null);
        ds(()=>{
            const te = F.current;
            if (I.width > 0 && I.height > 0 && te) {
                ye.current || (ye.current = Qb(te));
                async function q() {
                    await ye.current.configure({
                        gl: o,
                        scene: A,
                        events: u,
                        shadows: h,
                        linear: p,
                        flat: v,
                        legacy: y,
                        orthographic: b,
                        frameloop: S,
                        dpr: _,
                        performance: x,
                        raycaster: k,
                        camera: T,
                        size: I,
                        onPointerMissed: (...O)=>L.current == null ? void 0 : L.current(...O),
                        onCreated: (O)=>{
                            O.events.connect == null || O.events.connect(d ? db(d) ? d.current : d : Y.current), c && O.setEvents({
                                compute: (H, X)=>{
                                    const Z = H[c + "X"], $ = H[c + "Y"];
                                    X.pointer.set(Z / X.size.width * 2 - 1, -($ / X.size.height) * 2 + 1), X.raycaster.setFromCamera(X.pointer, X.camera);
                                }
                            }), D?.(O);
                        }
                    }), ye.current.render(ne.jsx(N, {
                        children: ne.jsx(gb, {
                            set: ee,
                            children: ne.jsx(M.Suspense, {
                                fallback: ne.jsx(mb, {
                                    set: B
                                }),
                                children: e ?? null
                            })
                        })
                    }));
                }
                q();
            }
        }), M.useEffect(()=>{
            const te = F.current;
            if (te) return ()=>xg(te);
        }, []);
        const xe = d ? "none" : "auto";
        return ne.jsx("div", {
            ref: Y,
            style: {
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                pointerEvents: xe,
                ...i
            },
            ...R,
            children: ne.jsx("div", {
                ref: P,
                style: {
                    width: "100%",
                    height: "100%"
                },
                children: ne.jsx("canvas", {
                    ref: F,
                    style: {
                        display: "block"
                    },
                    children: a
                })
            })
        });
    }
    gM = function(r) {
        return ne.jsx(cg, {
            children: ne.jsx(uw, {
                ...r
            })
        });
    };
    function un() {
        return un = Object.assign ? Object.assign.bind() : function(r) {
            for(var e = 1; e < arguments.length; e++){
                var a = arguments[e];
                for(var s in a)({}).hasOwnProperty.call(a, s) && (r[s] = a[s]);
            }
            return r;
        }, un.apply(null, arguments);
    }
    const ms = new ke, Af = new ke, cw = new ke, xp = new Ft;
    function fw(r, e, a) {
        const s = ms.setFromMatrixPosition(r.matrixWorld);
        s.project(e);
        const i = a.width / 2, o = a.height / 2;
        return [
            s.x * i + i,
            -(s.y * o) + o
        ];
    }
    function dw(r, e) {
        const a = ms.setFromMatrixPosition(r.matrixWorld), s = Af.setFromMatrixPosition(e.matrixWorld), i = a.sub(s), o = e.getWorldDirection(cw);
        return i.angleTo(o) > Math.PI / 2;
    }
    function hw(r, e, a, s) {
        const i = ms.setFromMatrixPosition(r.matrixWorld), o = i.clone();
        o.project(e), xp.set(o.x, o.y), a.setFromCamera(xp, e);
        const u = a.intersectObjects(s, !0);
        if (u.length) {
            const d = u[0].distance;
            return i.distanceTo(a.ray.origin) < d;
        }
        return !0;
    }
    function pw(r, e) {
        if (e instanceof Di) return e.zoom;
        if (e instanceof la) {
            const a = ms.setFromMatrixPosition(r.matrixWorld), s = Af.setFromMatrixPosition(e.matrixWorld), i = e.fov * Math.PI / 180, o = a.distanceTo(s);
            return 1 / (2 * Math.tan(i / 2) * o);
        } else return 1;
    }
    function mw(r, e, a) {
        if (e instanceof la || e instanceof Di) {
            const s = ms.setFromMatrixPosition(r.matrixWorld), i = Af.setFromMatrixPosition(e.matrixWorld), o = s.distanceTo(i), u = (a[1] - a[0]) / (e.far - e.near), d = a[1] - u * e.far;
            return Math.round(u * o + d);
        }
    }
    const cf = (r)=>Math.abs(r) < 1e-10 ? 0 : r;
    function Cg(r, e, a = "") {
        let s = "matrix3d(";
        for(let i = 0; i !== 16; i++)s += cf(e[i] * r.elements[i]) + (i !== 15 ? "," : ")");
        return a + s;
    }
    const gw = ((r)=>(e)=>Cg(e, r))([
        1,
        -1,
        1,
        1,
        1,
        -1,
        1,
        1,
        1,
        -1,
        1,
        1,
        1,
        -1,
        1,
        1
    ]), vw = ((r)=>(e, a)=>Cg(e, r(a), "translate(-50%,-50%)"))((r)=>[
            1 / r,
            1 / r,
            1 / r,
            1,
            -1 / r,
            -1 / r,
            -1 / r,
            -1,
            1 / r,
            1 / r,
            1 / r,
            1,
            1,
            1,
            1,
            1
        ]);
    function yw(r) {
        return r && typeof r == "object" && "current" in r;
    }
    let Ff, bw, ww;
    vM = M.forwardRef(({ children: r, eps: e = .001, style: a, className: s, prepend: i, center: o, fullscreen: u, portal: d, distanceFactor: c, sprite: h = !1, transform: p = !1, occlude: v, onOcclude: y, castShadow: b, receiveShadow: S, material: _, geometry: x, zIndexRange: k = [
        16777271,
        0
    ], calculatePosition: T = fw, as: A = "div", wrapperClass: U, pointerEvents: D = "auto", ...R }, N)=>{
        const { gl: P, camera: I, scene: F, size: Y, raycaster: L, events: G, viewport: B } = Et(), [K] = M.useState(()=>document.createElement(A)), ee = M.useRef(null), ye = M.useRef(null), xe = M.useRef(0), te = M.useRef([
            0,
            0
        ]), q = M.useRef(null), O = M.useRef(null), H = d?.current || G.connected || P.domElement.parentNode, X = M.useRef(null), Z = M.useRef(!1), $ = M.useMemo(()=>v && v !== "blending" || Array.isArray(v) && v.length && yw(v[0]), [
            v
        ]);
        M.useLayoutEffect(()=>{
            const Ie = P.domElement;
            v && v === "blending" ? (Ie.style.zIndex = `${Math.floor(k[0] / 2)}`, Ie.style.position = "absolute", Ie.style.pointerEvents = "none") : (Ie.style.zIndex = null, Ie.style.position = null, Ie.style.pointerEvents = null);
        }, [
            v
        ]), M.useLayoutEffect(()=>{
            if (ye.current) {
                const Ie = ee.current = Xm.createRoot(K);
                if (F.updateMatrixWorld(), p) K.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";
                else {
                    const he = T(ye.current, I, Y);
                    K.style.cssText = `position:absolute;top:0;left:0;transform:translate3d(${he[0]}px,${he[1]}px,0);transform-origin:0 0;`;
                }
                return H && (i ? H.prepend(K) : H.appendChild(K)), ()=>{
                    H && H.removeChild(K), Ie.unmount();
                };
            }
        }, [
            H,
            p
        ]), M.useLayoutEffect(()=>{
            U && (K.className = U);
        }, [
            U
        ]);
        const oe = M.useMemo(()=>p ? {
                position: "absolute",
                top: 0,
                left: 0,
                width: Y.width,
                height: Y.height,
                transformStyle: "preserve-3d",
                pointerEvents: "none"
            } : {
                position: "absolute",
                transform: o ? "translate3d(-50%,-50%,0)" : "none",
                ...u && {
                    top: -Y.height / 2,
                    left: -Y.width / 2,
                    width: Y.width,
                    height: Y.height
                },
                ...a
            }, [
            a,
            o,
            u,
            Y,
            p
        ]), ce = M.useMemo(()=>({
                position: "absolute",
                pointerEvents: D
            }), [
            D
        ]);
        M.useLayoutEffect(()=>{
            if (Z.current = !1, p) {
                var Ie;
                (Ie = ee.current) == null || Ie.render(M.createElement("div", {
                    ref: q,
                    style: oe
                }, M.createElement("div", {
                    ref: O,
                    style: ce
                }, M.createElement("div", {
                    ref: N,
                    className: s,
                    style: a,
                    children: r
                }))));
            } else {
                var he;
                (he = ee.current) == null || he.render(M.createElement("div", {
                    ref: N,
                    style: oe,
                    className: s,
                    children: r
                }));
            }
        });
        const fe = M.useRef(!0);
        Wt((Ie)=>{
            if (ye.current) {
                I.updateMatrixWorld(), ye.current.updateWorldMatrix(!0, !1);
                const he = p ? te.current : T(ye.current, I, Y);
                if (p || Math.abs(xe.current - I.zoom) > e || Math.abs(te.current[0] - he[0]) > e || Math.abs(te.current[1] - he[1]) > e) {
                    const pe = dw(ye.current, I);
                    let Ve = !1;
                    $ && (Array.isArray(v) ? Ve = v.map((Ue)=>Ue.current) : v !== "blending" && (Ve = [
                        F
                    ]));
                    const Xe = fe.current;
                    if (Ve) {
                        const Ue = hw(ye.current, I, L, Ve);
                        fe.current = Ue && !pe;
                    } else fe.current = !pe;
                    Xe !== fe.current && (y ? y(!fe.current) : K.style.display = fe.current ? "block" : "none");
                    const Ae = Math.floor(k[0] / 2), ze = v ? $ ? [
                        k[0],
                        Ae
                    ] : [
                        Ae - 1,
                        0
                    ] : k;
                    if (K.style.zIndex = `${mw(ye.current, I, ze)}`, p) {
                        const [Ue, be] = [
                            Y.width / 2,
                            Y.height / 2
                        ], Ne = I.projectionMatrix.elements[5] * be, { isOrthographicCamera: Le, top: me, left: Ke, bottom: Se, right: je } = I, Fe = gw(I.matrixWorldInverse), vt = Le ? `scale(${Ne})translate(${cf(-(je + Ke) / 2)}px,${cf((me + Se) / 2)}px)` : `translateZ(${Ne}px)`;
                        let Oe = ye.current.matrixWorld;
                        h && (Oe = I.matrixWorldInverse.clone().transpose().copyPosition(Oe).scale(ye.current.scale), Oe.elements[3] = Oe.elements[7] = Oe.elements[11] = 0, Oe.elements[15] = 1), K.style.width = Y.width + "px", K.style.height = Y.height + "px", K.style.perspective = Le ? "" : `${Ne}px`, q.current && O.current && (q.current.style.transform = `${vt}${Fe}translate(${Ue}px,${be}px)`, O.current.style.transform = vw(Oe, 1 / ((c || 10) / 400)));
                    } else {
                        const Ue = c === void 0 ? 1 : pw(ye.current, I) * c;
                        K.style.transform = `translate3d(${he[0]}px,${he[1]}px,0) scale(${Ue})`;
                    }
                    te.current = he, xe.current = I.zoom;
                }
            }
            if (!$ && X.current && !Z.current) if (p) {
                if (q.current) {
                    const he = q.current.children[0];
                    if (he != null && he.clientWidth && he != null && he.clientHeight) {
                        const { isOrthographicCamera: pe } = I;
                        if (pe || x) R.scale && (Array.isArray(R.scale) ? R.scale instanceof ke ? X.current.scale.copy(R.scale.clone().divideScalar(1)) : X.current.scale.set(1 / R.scale[0], 1 / R.scale[1], 1 / R.scale[2]) : X.current.scale.setScalar(1 / R.scale));
                        else {
                            const Ve = (c || 10) / 400, Xe = he.clientWidth * Ve, Ae = he.clientHeight * Ve;
                            X.current.scale.set(Xe, Ae, 1);
                        }
                        Z.current = !0;
                    }
                }
            } else {
                const he = K.children[0];
                if (he != null && he.clientWidth && he != null && he.clientHeight) {
                    const pe = 1 / B.factor, Ve = he.clientWidth * pe, Xe = he.clientHeight * pe;
                    X.current.scale.set(Ve, Xe, 1), Z.current = !0;
                }
                X.current.lookAt(Ie.camera.position);
            }
        });
        const Pe = M.useMemo(()=>({
                vertexShader: p ? void 0 : `
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,
                fragmentShader: `
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `
            }), [
            p
        ]);
        return M.createElement("group", un({}, R, {
            ref: ye
        }), v && !$ && M.createElement("mesh", {
            castShadow: b,
            receiveShadow: S,
            ref: X
        }, x || M.createElement("planeGeometry", null), _ || M.createElement("shaderMaterial", {
            side: xf,
            vertexShader: Pe.vertexShader,
            fragmentShader: Pe.fragmentShader
        })));
    });
    Ff = {};
    ({ useDebugValue: bw } = Ar);
    ({ useSyncExternalStoreWithSelector: ww } = ag);
    let _p = !1;
    const Sw = (r)=>r;
    function Jl(r, e = Sw, a) {
        (Ff ? "production" : void 0) !== "production" && a && !_p && (console.warn("[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"), _p = !0);
        const s = ww(r.subscribe, r.getState, r.getServerState || r.getInitialState, e, a);
        return bw(s), s;
    }
    let Ep;
    Ep = (r)=>{
        (Ff ? "production" : void 0) !== "production" && typeof r != "function" && console.warn("[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.");
        const e = typeof r == "function" ? Mf(r) : r, a = (s, i)=>Jl(e, s, i);
        return Object.assign(a, e), a;
    };
    Df = (r)=>r ? Ep(r) : Ep;
    yM = (r)=>((Ff ? "production" : void 0) !== "production" && console.warn("[DEPRECATED] Default export is deprecated. Instead use `import { create } from 'zustand'`."), Df(r));
    function xw(r, e, a) {
        return Math.max(e, Math.min(r, a));
    }
    const Wn = {
        toVector (r, e) {
            return r === void 0 && (r = e), Array.isArray(r) ? r : [
                r,
                r
            ];
        },
        add (r, e) {
            return [
                r[0] + e[0],
                r[1] + e[1]
            ];
        },
        sub (r, e) {
            return [
                r[0] - e[0],
                r[1] - e[1]
            ];
        },
        addTo (r, e) {
            r[0] += e[0], r[1] += e[1];
        },
        subTo (r, e) {
            r[0] -= e[0], r[1] -= e[1];
        }
    };
    function Mp(r, e, a) {
        return e === 0 || Math.abs(e) === 1 / 0 ? Math.pow(r, a * 5) : r * e * a / (e + a * r);
    }
    function Cp(r, e, a, s = .15) {
        return s === 0 ? xw(r, e, a) : r < e ? -Mp(e - r, a - e, s) + e : r > a ? +Mp(r - a, a - e, s) + a : r;
    }
    function _w(r, [e, a], [s, i]) {
        const [[o, u], [d, c]] = r;
        return [
            Cp(e, o, u, s),
            Cp(a, d, c, i)
        ];
    }
    function Ew(r, e) {
        if (typeof r != "object" || r === null) return r;
        var a = r[Symbol.toPrimitive];
        if (a !== void 0) {
            var s = a.call(r, e);
            if (typeof s != "object") return s;
            throw new TypeError("@@toPrimitive must return a primitive value.");
        }
        return (e === "string" ? String : Number)(r);
    }
    function Mw(r) {
        var e = Ew(r, "string");
        return typeof e == "symbol" ? e : String(e);
    }
    function rr(r, e, a) {
        return e = Mw(e), e in r ? Object.defineProperty(r, e, {
            value: a,
            enumerable: !0,
            configurable: !0,
            writable: !0
        }) : r[e] = a, r;
    }
    function Tp(r, e) {
        var a = Object.keys(r);
        if (Object.getOwnPropertySymbols) {
            var s = Object.getOwnPropertySymbols(r);
            e && (s = s.filter(function(i) {
                return Object.getOwnPropertyDescriptor(r, i).enumerable;
            })), a.push.apply(a, s);
        }
        return a;
    }
    function rn(r) {
        for(var e = 1; e < arguments.length; e++){
            var a = arguments[e] != null ? arguments[e] : {};
            e % 2 ? Tp(Object(a), !0).forEach(function(s) {
                rr(r, s, a[s]);
            }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(r, Object.getOwnPropertyDescriptors(a)) : Tp(Object(a)).forEach(function(s) {
                Object.defineProperty(r, s, Object.getOwnPropertyDescriptor(a, s));
            });
        }
        return r;
    }
    const Tg = {
        pointer: {
            start: "down",
            change: "move",
            end: "up"
        },
        mouse: {
            start: "down",
            change: "move",
            end: "up"
        },
        touch: {
            start: "start",
            change: "move",
            end: "end"
        },
        gesture: {
            start: "start",
            change: "change",
            end: "end"
        }
    };
    function Pp(r) {
        return r ? r[0].toUpperCase() + r.slice(1) : "";
    }
    const Cw = [
        "enter",
        "leave"
    ];
    function Tw(r = !1, e) {
        return r && !Cw.includes(e);
    }
    function Pw(r, e = "", a = !1) {
        const s = Tg[r], i = s && s[e] || e;
        return "on" + Pp(r) + Pp(i) + (Tw(a, i) ? "Capture" : "");
    }
    const kw = [
        "gotpointercapture",
        "lostpointercapture"
    ];
    function Rw(r) {
        let e = r.substring(2).toLowerCase();
        const a = !!~e.indexOf("passive");
        a && (e = e.replace("passive", ""));
        const s = kw.includes(e) ? "capturecapture" : "capture", i = !!~e.indexOf(s);
        return i && (e = e.replace("capture", "")), {
            device: e,
            capture: i,
            passive: a
        };
    }
    function Iw(r, e = "") {
        const a = Tg[r], s = a && a[e] || e;
        return r + s;
    }
    function eu(r) {
        return "touches" in r;
    }
    function Pg(r) {
        return eu(r) ? "touch" : "pointerType" in r ? r.pointerType : "mouse";
    }
    function Aw(r) {
        return Array.from(r.touches).filter((e)=>{
            var a, s;
            return e.target === r.currentTarget || ((a = r.currentTarget) === null || a === void 0 || (s = a.contains) === null || s === void 0 ? void 0 : s.call(a, e.target));
        });
    }
    function Fw(r) {
        return r.type === "touchend" || r.type === "touchcancel" ? r.changedTouches : r.targetTouches;
    }
    function kg(r) {
        return eu(r) ? Fw(r)[0] : r;
    }
    function Dw(r) {
        return Aw(r).map((e)=>e.identifier);
    }
    function Dc(r) {
        const e = kg(r);
        return eu(r) ? e.identifier : e.pointerId;
    }
    function kp(r) {
        const e = kg(r);
        return [
            e.clientX,
            e.clientY
        ];
    }
    function Uw(r) {
        const e = {};
        if ("buttons" in r && (e.buttons = r.buttons), "shiftKey" in r) {
            const { shiftKey: a, altKey: s, metaKey: i, ctrlKey: o } = r;
            Object.assign(e, {
                shiftKey: a,
                altKey: s,
                metaKey: i,
                ctrlKey: o
            });
        }
        return e;
    }
    function Nl(r, ...e) {
        return typeof r == "function" ? r(...e) : r;
    }
    function Ow() {}
    function Lw(...r) {
        return r.length === 0 ? Ow : r.length === 1 ? r[0] : function() {
            let e;
            for (const a of r)e = a.apply(this, arguments) || e;
            return e;
        };
    }
    function Rp(r, e) {
        return Object.assign({}, e, r || {});
    }
    const zw = 32;
    class Nw {
        constructor(e, a, s){
            this.ctrl = e, this.args = a, this.key = s, this.state || (this.state = {}, this.computeValues([
                0,
                0
            ]), this.computeInitial(), this.init && this.init(), this.reset());
        }
        get state() {
            return this.ctrl.state[this.key];
        }
        set state(e) {
            this.ctrl.state[this.key] = e;
        }
        get shared() {
            return this.ctrl.state.shared;
        }
        get eventStore() {
            return this.ctrl.gestureEventStores[this.key];
        }
        get timeoutStore() {
            return this.ctrl.gestureTimeoutStores[this.key];
        }
        get config() {
            return this.ctrl.config[this.key];
        }
        get sharedConfig() {
            return this.ctrl.config.shared;
        }
        get handler() {
            return this.ctrl.handlers[this.key];
        }
        reset() {
            const { state: e, shared: a, ingKey: s, args: i } = this;
            a[s] = e._active = e.active = e._blocked = e._force = !1, e._step = [
                !1,
                !1
            ], e.intentional = !1, e._movement = [
                0,
                0
            ], e._distance = [
                0,
                0
            ], e._direction = [
                0,
                0
            ], e._delta = [
                0,
                0
            ], e._bounds = [
                [
                    -1 / 0,
                    1 / 0
                ],
                [
                    -1 / 0,
                    1 / 0
                ]
            ], e.args = i, e.axis = void 0, e.memo = void 0, e.elapsedTime = e.timeDelta = 0, e.direction = [
                0,
                0
            ], e.distance = [
                0,
                0
            ], e.overflow = [
                0,
                0
            ], e._movementBound = [
                !1,
                !1
            ], e.velocity = [
                0,
                0
            ], e.movement = [
                0,
                0
            ], e.delta = [
                0,
                0
            ], e.timeStamp = 0;
        }
        start(e) {
            const a = this.state, s = this.config;
            a._active || (this.reset(), this.computeInitial(), a._active = !0, a.target = e.target, a.currentTarget = e.currentTarget, a.lastOffset = s.from ? Nl(s.from, a) : a.offset, a.offset = a.lastOffset, a.startTime = a.timeStamp = e.timeStamp);
        }
        computeValues(e) {
            const a = this.state;
            a._values = e, a.values = this.config.transform(e);
        }
        computeInitial() {
            const e = this.state;
            e._initial = e._values, e.initial = e.values;
        }
        compute(e) {
            const { state: a, config: s, shared: i } = this;
            a.args = this.args;
            let o = 0;
            if (e && (a.event = e, s.preventDefault && e.cancelable && a.event.preventDefault(), a.type = e.type, i.touches = this.ctrl.pointerIds.size || this.ctrl.touchIds.size, i.locked = !!document.pointerLockElement, Object.assign(i, Uw(e)), i.down = i.pressed = i.buttons % 2 === 1 || i.touches > 0, o = e.timeStamp - a.timeStamp, a.timeStamp = e.timeStamp, a.elapsedTime = a.timeStamp - a.startTime), a._active) {
                const R = a._delta.map(Math.abs);
                Wn.addTo(a._distance, R);
            }
            this.axisIntent && this.axisIntent(e);
            const [u, d] = a._movement, [c, h] = s.threshold, { _step: p, values: v } = a;
            if (s.hasCustomTransform ? (p[0] === !1 && (p[0] = Math.abs(u) >= c && v[0]), p[1] === !1 && (p[1] = Math.abs(d) >= h && v[1])) : (p[0] === !1 && (p[0] = Math.abs(u) >= c && Math.sign(u) * c), p[1] === !1 && (p[1] = Math.abs(d) >= h && Math.sign(d) * h)), a.intentional = p[0] !== !1 || p[1] !== !1, !a.intentional) return;
            const y = [
                0,
                0
            ];
            if (s.hasCustomTransform) {
                const [R, N] = v;
                y[0] = p[0] !== !1 ? R - p[0] : 0, y[1] = p[1] !== !1 ? N - p[1] : 0;
            } else y[0] = p[0] !== !1 ? u - p[0] : 0, y[1] = p[1] !== !1 ? d - p[1] : 0;
            this.restrictToAxis && !a._blocked && this.restrictToAxis(y);
            const b = a.offset, S = a._active && !a._blocked || a.active;
            S && (a.first = a._active && !a.active, a.last = !a._active && a.active, a.active = i[this.ingKey] = a._active, e && (a.first && ("bounds" in s && (a._bounds = Nl(s.bounds, a)), this.setup && this.setup()), a.movement = y, this.computeOffset()));
            const [_, x] = a.offset, [[k, T], [A, U]] = a._bounds;
            a.overflow = [
                _ < k ? -1 : _ > T ? 1 : 0,
                x < A ? -1 : x > U ? 1 : 0
            ], a._movementBound[0] = a.overflow[0] ? a._movementBound[0] === !1 ? a._movement[0] : a._movementBound[0] : !1, a._movementBound[1] = a.overflow[1] ? a._movementBound[1] === !1 ? a._movement[1] : a._movementBound[1] : !1;
            const D = a._active ? s.rubberband || [
                0,
                0
            ] : [
                0,
                0
            ];
            if (a.offset = _w(a._bounds, a.offset, D), a.delta = Wn.sub(a.offset, b), this.computeMovement(), S && (!a.last || o > zw)) {
                a.delta = Wn.sub(a.offset, b);
                const R = a.delta.map(Math.abs);
                Wn.addTo(a.distance, R), a.direction = a.delta.map(Math.sign), a._direction = a._delta.map(Math.sign), !a.first && o > 0 && (a.velocity = [
                    R[0] / o,
                    R[1] / o
                ], a.timeDelta = o);
            }
        }
        emit() {
            const e = this.state, a = this.shared, s = this.config;
            if (e._active || this.clean(), (e._blocked || !e.intentional) && !e._force && !s.triggerAllEvents) return;
            const i = this.handler(rn(rn(rn({}, a), e), {}, {
                [this.aliasKey]: e.values
            }));
            i !== void 0 && (e.memo = i);
        }
        clean() {
            this.eventStore.clean(), this.timeoutStore.clean();
        }
    }
    function jw([r, e], a) {
        const s = Math.abs(r), i = Math.abs(e);
        if (s > i && s > a) return "x";
        if (i > s && i > a) return "y";
    }
    class Bw extends Nw {
        constructor(...e){
            super(...e), rr(this, "aliasKey", "xy");
        }
        reset() {
            super.reset(), this.state.axis = void 0;
        }
        init() {
            this.state.offset = [
                0,
                0
            ], this.state.lastOffset = [
                0,
                0
            ];
        }
        computeOffset() {
            this.state.offset = Wn.add(this.state.lastOffset, this.state.movement);
        }
        computeMovement() {
            this.state.movement = Wn.sub(this.state.offset, this.state.lastOffset);
        }
        axisIntent(e) {
            const a = this.state, s = this.config;
            if (!a.axis && e) {
                const i = typeof s.axisThreshold == "object" ? s.axisThreshold[Pg(e)] : s.axisThreshold;
                a.axis = jw(a._movement, i);
            }
            a._blocked = (s.lockDirection || !!s.axis) && !a.axis || !!s.axis && s.axis !== a.axis;
        }
        restrictToAxis(e) {
            if (this.config.axis || this.config.lockDirection) switch(this.state.axis){
                case "x":
                    e[1] = 0;
                    break;
                case "y":
                    e[0] = 0;
                    break;
            }
        }
    }
    const Gw = (r)=>r, Ip = .15, Rg = {
        enabled (r = !0) {
            return r;
        },
        eventOptions (r, e, a) {
            return rn(rn({}, a.shared.eventOptions), r);
        },
        preventDefault (r = !1) {
            return r;
        },
        triggerAllEvents (r = !1) {
            return r;
        },
        rubberband (r = 0) {
            switch(r){
                case !0:
                    return [
                        Ip,
                        Ip
                    ];
                case !1:
                    return [
                        0,
                        0
                    ];
                default:
                    return Wn.toVector(r);
            }
        },
        from (r) {
            if (typeof r == "function") return r;
            if (r != null) return Wn.toVector(r);
        },
        transform (r, e, a) {
            const s = r || a.shared.transform;
            return this.hasCustomTransform = !!s, s || Gw;
        },
        threshold (r) {
            return Wn.toVector(r, 0);
        }
    }, Hw = 0, gs = rn(rn({}, Rg), {}, {
        axis (r, e, { axis: a }) {
            if (this.lockDirection = a === "lock", !this.lockDirection) return a;
        },
        axisThreshold (r = Hw) {
            return r;
        },
        bounds (r = {}) {
            if (typeof r == "function") return (o)=>gs.bounds(r(o));
            if ("current" in r) return ()=>r.current;
            if (typeof HTMLElement == "function" && r instanceof HTMLElement) return r;
            const { left: e = -1 / 0, right: a = 1 / 0, top: s = -1 / 0, bottom: i = 1 / 0 } = r;
            return [
                [
                    e,
                    a
                ],
                [
                    s,
                    i
                ]
            ];
        }
    }), Ap = {
        ArrowRight: (r, e = 1)=>[
                r * e,
                0
            ],
        ArrowLeft: (r, e = 1)=>[
                -1 * r * e,
                0
            ],
        ArrowUp: (r, e = 1)=>[
                0,
                -1 * r * e
            ],
        ArrowDown: (r, e = 1)=>[
                0,
                r * e
            ]
    };
    class Ww extends Bw {
        constructor(...e){
            super(...e), rr(this, "ingKey", "dragging");
        }
        reset() {
            super.reset();
            const e = this.state;
            e._pointerId = void 0, e._pointerActive = !1, e._keyboardActive = !1, e._preventScroll = !1, e._delayed = !1, e.swipe = [
                0,
                0
            ], e.tap = !1, e.canceled = !1, e.cancel = this.cancel.bind(this);
        }
        setup() {
            const e = this.state;
            if (e._bounds instanceof HTMLElement) {
                const a = e._bounds.getBoundingClientRect(), s = e.currentTarget.getBoundingClientRect(), i = {
                    left: a.left - s.left + e.offset[0],
                    right: a.right - s.right + e.offset[0],
                    top: a.top - s.top + e.offset[1],
                    bottom: a.bottom - s.bottom + e.offset[1]
                };
                e._bounds = gs.bounds(i);
            }
        }
        cancel() {
            const e = this.state;
            e.canceled || (e.canceled = !0, e._active = !1, setTimeout(()=>{
                this.compute(), this.emit();
            }, 0));
        }
        setActive() {
            this.state._active = this.state._pointerActive || this.state._keyboardActive;
        }
        clean() {
            this.pointerClean(), this.state._pointerActive = !1, this.state._keyboardActive = !1, super.clean();
        }
        pointerDown(e) {
            const a = this.config, s = this.state;
            if (e.buttons != null && (Array.isArray(a.pointerButtons) ? !a.pointerButtons.includes(e.buttons) : a.pointerButtons !== -1 && a.pointerButtons !== e.buttons)) return;
            const i = this.ctrl.setEventIds(e);
            a.pointerCapture && e.target.setPointerCapture(e.pointerId), !(i && i.size > 1 && s._pointerActive) && (this.start(e), this.setupPointer(e), s._pointerId = Dc(e), s._pointerActive = !0, this.computeValues(kp(e)), this.computeInitial(), a.preventScrollAxis && Pg(e) !== "mouse" ? (s._active = !1, this.setupScrollPrevention(e)) : a.delay > 0 ? (this.setupDelayTrigger(e), a.triggerAllEvents && (this.compute(e), this.emit())) : this.startPointerDrag(e));
        }
        startPointerDrag(e) {
            const a = this.state;
            a._active = !0, a._preventScroll = !0, a._delayed = !1, this.compute(e), this.emit();
        }
        pointerMove(e) {
            const a = this.state, s = this.config;
            if (!a._pointerActive) return;
            const i = Dc(e);
            if (a._pointerId !== void 0 && i !== a._pointerId) return;
            const o = kp(e);
            if (document.pointerLockElement === e.target ? a._delta = [
                e.movementX,
                e.movementY
            ] : (a._delta = Wn.sub(o, a._values), this.computeValues(o)), Wn.addTo(a._movement, a._delta), this.compute(e), a._delayed && a.intentional) {
                this.timeoutStore.remove("dragDelay"), a.active = !1, this.startPointerDrag(e);
                return;
            }
            if (s.preventScrollAxis && !a._preventScroll) if (a.axis) if (a.axis === s.preventScrollAxis || s.preventScrollAxis === "xy") {
                a._active = !1, this.clean();
                return;
            } else {
                this.timeoutStore.remove("startPointerDrag"), this.startPointerDrag(e);
                return;
            }
            else return;
            this.emit();
        }
        pointerUp(e) {
            this.ctrl.setEventIds(e);
            try {
                this.config.pointerCapture && e.target.hasPointerCapture(e.pointerId) && e.target.releasePointerCapture(e.pointerId);
            } catch  {}
            const a = this.state, s = this.config;
            if (!a._active || !a._pointerActive) return;
            const i = Dc(e);
            if (a._pointerId !== void 0 && i !== a._pointerId) return;
            this.state._pointerActive = !1, this.setActive(), this.compute(e);
            const [o, u] = a._distance;
            if (a.tap = o <= s.tapsThreshold && u <= s.tapsThreshold, a.tap && s.filterTaps) a._force = !0;
            else {
                const [d, c] = a._delta, [h, p] = a._movement, [v, y] = s.swipe.velocity, [b, S] = s.swipe.distance, _ = s.swipe.duration;
                if (a.elapsedTime < _) {
                    const x = Math.abs(d / a.timeDelta), k = Math.abs(c / a.timeDelta);
                    x > v && Math.abs(h) > b && (a.swipe[0] = Math.sign(d)), k > y && Math.abs(p) > S && (a.swipe[1] = Math.sign(c));
                }
            }
            this.emit();
        }
        pointerClick(e) {
            !this.state.tap && e.detail > 0 && (e.preventDefault(), e.stopPropagation());
        }
        setupPointer(e) {
            const a = this.config, s = a.device;
            a.pointerLock && e.currentTarget.requestPointerLock(), a.pointerCapture || (this.eventStore.add(this.sharedConfig.window, s, "change", this.pointerMove.bind(this)), this.eventStore.add(this.sharedConfig.window, s, "end", this.pointerUp.bind(this)), this.eventStore.add(this.sharedConfig.window, s, "cancel", this.pointerUp.bind(this)));
        }
        pointerClean() {
            this.config.pointerLock && document.pointerLockElement === this.state.currentTarget && document.exitPointerLock();
        }
        preventScroll(e) {
            this.state._preventScroll && e.cancelable && e.preventDefault();
        }
        setupScrollPrevention(e) {
            this.state._preventScroll = !1, Vw(e);
            const a = this.eventStore.add(this.sharedConfig.window, "touch", "change", this.preventScroll.bind(this), {
                passive: !1
            });
            this.eventStore.add(this.sharedConfig.window, "touch", "end", a), this.eventStore.add(this.sharedConfig.window, "touch", "cancel", a), this.timeoutStore.add("startPointerDrag", this.startPointerDrag.bind(this), this.config.preventScrollDelay, e);
        }
        setupDelayTrigger(e) {
            this.state._delayed = !0, this.timeoutStore.add("dragDelay", ()=>{
                this.state._step = [
                    0,
                    0
                ], this.startPointerDrag(e);
            }, this.config.delay);
        }
        keyDown(e) {
            const a = Ap[e.key];
            if (a) {
                const s = this.state, i = e.shiftKey ? 10 : e.altKey ? .1 : 1;
                this.start(e), s._delta = a(this.config.keyboardDisplacement, i), s._keyboardActive = !0, Wn.addTo(s._movement, s._delta), this.compute(e), this.emit();
            }
        }
        keyUp(e) {
            e.key in Ap && (this.state._keyboardActive = !1, this.setActive(), this.compute(e), this.emit());
        }
        bind(e) {
            const a = this.config.device;
            e(a, "start", this.pointerDown.bind(this)), this.config.pointerCapture && (e(a, "change", this.pointerMove.bind(this)), e(a, "end", this.pointerUp.bind(this)), e(a, "cancel", this.pointerUp.bind(this)), e("lostPointerCapture", "", this.pointerUp.bind(this))), this.config.keys && (e("key", "down", this.keyDown.bind(this)), e("key", "up", this.keyUp.bind(this))), this.config.filterTaps && e("click", "", this.pointerClick.bind(this), {
                capture: !0,
                passive: !1
            });
        }
    }
    function Vw(r) {
        "persist" in r && typeof r.persist == "function" && r.persist();
    }
    const vs = typeof window < "u" && window.document && window.document.createElement;
    function Ig() {
        return vs && "ontouchstart" in window;
    }
    function Xw() {
        return Ig() || vs && window.navigator.maxTouchPoints > 1;
    }
    function Yw() {
        return vs && "onpointerdown" in window;
    }
    function qw() {
        return vs && "exitPointerLock" in window.document;
    }
    function Zw() {
        try {
            return "constructor" in GestureEvent;
        } catch  {
            return !1;
        }
    }
    const Sr = {
        isBrowser: vs,
        gesture: Zw(),
        touch: Ig(),
        touchscreen: Xw(),
        pointer: Yw(),
        pointerLock: qw()
    }, Qw = 250, Kw = 180, $w = .5, Jw = 50, eS = 250, tS = 10, Fp = {
        mouse: 0,
        touch: 0,
        pen: 8
    }, nS = rn(rn({}, gs), {}, {
        device (r, e, { pointer: { touch: a = !1, lock: s = !1, mouse: i = !1 } = {} }) {
            return this.pointerLock = s && Sr.pointerLock, Sr.touch && a ? "touch" : this.pointerLock ? "mouse" : Sr.pointer && !i ? "pointer" : Sr.touch ? "touch" : "mouse";
        },
        preventScrollAxis (r, e, { preventScroll: a }) {
            if (this.preventScrollDelay = typeof a == "number" ? a : a || a === void 0 && r ? Qw : void 0, !(!Sr.touchscreen || a === !1)) return r || (a !== void 0 ? "y" : void 0);
        },
        pointerCapture (r, e, { pointer: { capture: a = !0, buttons: s = 1, keys: i = !0 } = {} }) {
            return this.pointerButtons = s, this.keys = i, !this.pointerLock && this.device === "pointer" && a;
        },
        threshold (r, e, { filterTaps: a = !1, tapsThreshold: s = 3, axis: i = void 0 }) {
            const o = Wn.toVector(r, a ? s : i ? 1 : 0);
            return this.filterTaps = a, this.tapsThreshold = s, o;
        },
        swipe ({ velocity: r = $w, distance: e = Jw, duration: a = eS } = {}) {
            return {
                velocity: this.transform(Wn.toVector(r)),
                distance: this.transform(Wn.toVector(e)),
                duration: a
            };
        },
        delay (r = 0) {
            switch(r){
                case !0:
                    return Kw;
                case !1:
                    return 0;
                default:
                    return r;
            }
        },
        axisThreshold (r) {
            return r ? rn(rn({}, Fp), r) : Fp;
        },
        keyboardDisplacement (r = tS) {
            return r;
        }
    });
    rn(rn({}, Rg), {}, {
        device (r, e, { shared: a, pointer: { touch: s = !1 } = {} }) {
            if (a.target && !Sr.touch && Sr.gesture) return "gesture";
            if (Sr.touch && s) return "touch";
            if (Sr.touchscreen) {
                if (Sr.pointer) return "pointer";
                if (Sr.touch) return "touch";
            }
        },
        bounds (r, e, { scaleBounds: a = {}, angleBounds: s = {} }) {
            const i = (u)=>{
                const d = Rp(Nl(a, u), {
                    min: -1 / 0,
                    max: 1 / 0
                });
                return [
                    d.min,
                    d.max
                ];
            }, o = (u)=>{
                const d = Rp(Nl(s, u), {
                    min: -1 / 0,
                    max: 1 / 0
                });
                return [
                    d.min,
                    d.max
                ];
            };
            return typeof a != "function" && typeof s != "function" ? [
                i(),
                o()
            ] : (u)=>[
                    i(u),
                    o(u)
                ];
        },
        threshold (r, e, a) {
            return this.lockDirection = a.axis === "lock", Wn.toVector(r, this.lockDirection ? [
                .1,
                3
            ] : 0);
        },
        modifierKey (r) {
            return r === void 0 ? "ctrlKey" : r;
        },
        pinchOnWheel (r = !0) {
            return r;
        }
    });
    rn(rn({}, gs), {}, {
        mouseOnly: (r = !0)=>r
    });
    rn(rn({}, gs), {}, {
        mouseOnly: (r = !0)=>r
    });
    const Ag = new Map, ff = new Map;
    function rS(r) {
        Ag.set(r.key, r.engine), ff.set(r.key, r.resolver);
    }
    const iS = {
        key: "drag",
        engine: Ww,
        resolver: nS
    };
    function aS(r, e) {
        if (r == null) return {};
        var a = {}, s = Object.keys(r), i, o;
        for(o = 0; o < s.length; o++)i = s[o], !(e.indexOf(i) >= 0) && (a[i] = r[i]);
        return a;
    }
    function oS(r, e) {
        if (r == null) return {};
        var a = aS(r, e), s, i;
        if (Object.getOwnPropertySymbols) {
            var o = Object.getOwnPropertySymbols(r);
            for(i = 0; i < o.length; i++)s = o[i], !(e.indexOf(s) >= 0) && Object.prototype.propertyIsEnumerable.call(r, s) && (a[s] = r[s]);
        }
        return a;
    }
    const sS = {
        target (r) {
            if (r) return ()=>"current" in r ? r.current : r;
        },
        enabled (r = !0) {
            return r;
        },
        window (r = Sr.isBrowser ? window : void 0) {
            return r;
        },
        eventOptions ({ passive: r = !0, capture: e = !1 } = {}) {
            return {
                passive: r,
                capture: e
            };
        },
        transform (r) {
            return r;
        }
    }, lS = [
        "target",
        "eventOptions",
        "window",
        "enabled",
        "transform"
    ];
    function Tl(r = {}, e) {
        const a = {};
        for (const [s, i] of Object.entries(e))switch(typeof i){
            case "function":
                a[s] = i.call(a, r[s], s, r);
                break;
            case "object":
                a[s] = Tl(r[s], i);
                break;
            case "boolean":
                i && (a[s] = r[s]);
                break;
        }
        return a;
    }
    function uS(r, e, a = {}) {
        const s = r, { target: i, eventOptions: o, window: u, enabled: d, transform: c } = s, h = oS(s, lS);
        if (a.shared = Tl({
            target: i,
            eventOptions: o,
            window: u,
            enabled: d,
            transform: c
        }, sS), e) {
            const p = ff.get(e);
            a[e] = Tl(rn({
                shared: a.shared
            }, h), p);
        } else for(const p in h){
            const v = ff.get(p);
            v && (a[p] = Tl(rn({
                shared: a.shared
            }, h[p]), v));
        }
        return a;
    }
    class Fg {
        constructor(e, a){
            rr(this, "_listeners", new Set), this._ctrl = e, this._gestureKey = a;
        }
        add(e, a, s, i, o) {
            const u = this._listeners, d = Iw(a, s), c = this._gestureKey ? this._ctrl.config[this._gestureKey].eventOptions : {}, h = rn(rn({}, c), o);
            e.addEventListener(d, i, h);
            const p = ()=>{
                e.removeEventListener(d, i, h), u.delete(p);
            };
            return u.add(p), p;
        }
        clean() {
            this._listeners.forEach((e)=>e()), this._listeners.clear();
        }
    }
    class cS {
        constructor(){
            rr(this, "_timeouts", new Map);
        }
        add(e, a, s = 140, ...i) {
            this.remove(e), this._timeouts.set(e, window.setTimeout(a, s, ...i));
        }
        remove(e) {
            const a = this._timeouts.get(e);
            a && window.clearTimeout(a);
        }
        clean() {
            this._timeouts.forEach((e)=>void window.clearTimeout(e)), this._timeouts.clear();
        }
    }
    class fS {
        constructor(e){
            rr(this, "gestures", new Set), rr(this, "_targetEventStore", new Fg(this)), rr(this, "gestureEventStores", {}), rr(this, "gestureTimeoutStores", {}), rr(this, "handlers", {}), rr(this, "config", {}), rr(this, "pointerIds", new Set), rr(this, "touchIds", new Set), rr(this, "state", {
                shared: {
                    shiftKey: !1,
                    metaKey: !1,
                    ctrlKey: !1,
                    altKey: !1
                }
            }), dS(this, e);
        }
        setEventIds(e) {
            if (eu(e)) return this.touchIds = new Set(Dw(e)), this.touchIds;
            if ("pointerId" in e) return e.type === "pointerup" || e.type === "pointercancel" ? this.pointerIds.delete(e.pointerId) : e.type === "pointerdown" && this.pointerIds.add(e.pointerId), this.pointerIds;
        }
        applyHandlers(e, a) {
            this.handlers = e, this.nativeHandlers = a;
        }
        applyConfig(e, a) {
            this.config = uS(e, a, this.config);
        }
        clean() {
            this._targetEventStore.clean();
            for (const e of this.gestures)this.gestureEventStores[e].clean(), this.gestureTimeoutStores[e].clean();
        }
        effect() {
            return this.config.shared.target && this.bind(), ()=>this._targetEventStore.clean();
        }
        bind(...e) {
            const a = this.config.shared, s = {};
            let i;
            if (!(a.target && (i = a.target(), !i))) {
                if (a.enabled) {
                    for (const u of this.gestures){
                        const d = this.config[u], c = Dp(s, d.eventOptions, !!i);
                        if (d.enabled) {
                            const h = Ag.get(u);
                            new h(this, e, u).bind(c);
                        }
                    }
                    const o = Dp(s, a.eventOptions, !!i);
                    for(const u in this.nativeHandlers)o(u, "", (d)=>this.nativeHandlers[u](rn(rn({}, this.state.shared), {}, {
                            event: d,
                            args: e
                        })), void 0, !0);
                }
                for(const o in s)s[o] = Lw(...s[o]);
                if (!i) return s;
                for(const o in s){
                    const { device: u, capture: d, passive: c } = Rw(o);
                    this._targetEventStore.add(i, u, "", s[o], {
                        capture: d,
                        passive: c
                    });
                }
            }
        }
    }
    function $a(r, e) {
        r.gestures.add(e), r.gestureEventStores[e] = new Fg(r, e), r.gestureTimeoutStores[e] = new cS;
    }
    function dS(r, e) {
        e.drag && $a(r, "drag"), e.wheel && $a(r, "wheel"), e.scroll && $a(r, "scroll"), e.move && $a(r, "move"), e.pinch && $a(r, "pinch"), e.hover && $a(r, "hover");
    }
    const Dp = (r, e, a)=>(s, i, o, u = {}, d = !1)=>{
            var c, h;
            const p = (c = u.capture) !== null && c !== void 0 ? c : e.capture, v = (h = u.passive) !== null && h !== void 0 ? h : e.passive;
            let y = d ? s : Pw(s, i, p);
            a && v && (y += "Passive"), r[y] = r[y] || [], r[y].push(o);
        };
    function hS(r, e = {}, a, s) {
        const i = Ar.useMemo(()=>new fS(r), []);
        if (i.applyHandlers(r, s), i.applyConfig(e, a), Ar.useEffect(i.effect.bind(i)), Ar.useEffect(()=>i.clean.bind(i), []), e.target === void 0) return i.bind.bind(i);
    }
    bM = function(r, e) {
        return rS(iS), hS({
            drag: r
        }, e || {}, "drag");
    };
    let pS, Dg;
    pS = (r)=>(e, a, s)=>{
            const i = s.subscribe;
            return s.subscribe = (u, d, c)=>{
                let h = u;
                if (d) {
                    const p = c?.equalityFn || Object.is;
                    let v = u(s.getState());
                    h = (y)=>{
                        const b = u(y);
                        if (!p(v, b)) {
                            const S = v;
                            d(v = b, S);
                        }
                    }, c?.fireImmediately && d(v, v);
                }
                return i(h);
            }, r(e, a, s);
        };
    wM = pS;
    Dg = parseInt(_f.replace(/\D+/g, ""));
    function mS(r, e = Math.PI / 3) {
        const a = Math.cos(e), s = (1 + 1e-10) * 100, i = [
            new ke,
            new ke,
            new ke
        ], o = new ke, u = new ke, d = new ke, c = new ke;
        function h(_) {
            const x = ~~(_.x * s), k = ~~(_.y * s), T = ~~(_.z * s);
            return `${x},${k},${T}`;
        }
        const p = r.index ? r.toNonIndexed() : r, v = p.attributes.position, y = {};
        for(let _ = 0, x = v.count / 3; _ < x; _++){
            const k = 3 * _, T = i[0].fromBufferAttribute(v, k + 0), A = i[1].fromBufferAttribute(v, k + 1), U = i[2].fromBufferAttribute(v, k + 2);
            o.subVectors(U, A), u.subVectors(T, A);
            const D = new ke().crossVectors(o, u).normalize();
            for(let R = 0; R < 3; R++){
                const N = i[R], P = h(N);
                P in y || (y[P] = []), y[P].push(D);
            }
        }
        const b = new Float32Array(v.count * 3), S = new wr(b, 3, !1);
        for(let _ = 0, x = v.count / 3; _ < x; _++){
            const k = 3 * _, T = i[0].fromBufferAttribute(v, k + 0), A = i[1].fromBufferAttribute(v, k + 1), U = i[2].fromBufferAttribute(v, k + 2);
            o.subVectors(U, A), u.subVectors(T, A), d.crossVectors(o, u).normalize();
            for(let D = 0; D < 3; D++){
                const R = i[D], N = h(R), P = y[N];
                c.set(0, 0, 0);
                for(let I = 0, F = P.length; I < F; I++){
                    const Y = P[I];
                    d.dot(Y) > a && c.add(Y);
                }
                c.normalize(), S.setXYZ(k + D, c.x, c.y, c.z);
            }
        }
        return p.setAttribute("normal", S), p;
    }
    var xr = Uint8Array, Fi = Uint16Array, df = Uint32Array, Ug = new xr([
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        1,
        2,
        2,
        2,
        2,
        3,
        3,
        3,
        3,
        4,
        4,
        4,
        4,
        5,
        5,
        5,
        5,
        0,
        0,
        0,
        0
    ]), Og = new xr([
        0,
        0,
        0,
        0,
        1,
        1,
        2,
        2,
        3,
        3,
        4,
        4,
        5,
        5,
        6,
        6,
        7,
        7,
        8,
        8,
        9,
        9,
        10,
        10,
        11,
        11,
        12,
        12,
        13,
        13,
        0,
        0
    ]), gS = new xr([
        16,
        17,
        18,
        0,
        8,
        7,
        9,
        6,
        10,
        5,
        11,
        4,
        12,
        3,
        13,
        2,
        14,
        1,
        15
    ]), Lg = function(r, e) {
        for(var a = new Fi(31), s = 0; s < 31; ++s)a[s] = e += 1 << r[s - 1];
        for(var i = new df(a[30]), s = 1; s < 30; ++s)for(var o = a[s]; o < a[s + 1]; ++o)i[o] = o - a[s] << 5 | s;
        return [
            a,
            i
        ];
    }, zg = Lg(Ug, 2), Ng = zg[0], vS = zg[1];
    Ng[28] = 258, vS[258] = 28;
    var yS = Lg(Og, 0), bS = yS[0], hf = new Fi(32768);
    for(var Qt = 0; Qt < 32768; ++Qt){
        var Ri = (Qt & 43690) >>> 1 | (Qt & 21845) << 1;
        Ri = (Ri & 52428) >>> 2 | (Ri & 13107) << 2, Ri = (Ri & 61680) >>> 4 | (Ri & 3855) << 4, hf[Qt] = ((Ri & 65280) >>> 8 | (Ri & 255) << 8) >>> 1;
    }
    var as = (function(r, e, a) {
        for(var s = r.length, i = 0, o = new Fi(e); i < s; ++i)++o[r[i] - 1];
        var u = new Fi(e);
        for(i = 0; i < e; ++i)u[i] = u[i - 1] + o[i - 1] << 1;
        var d;
        if (a) {
            d = new Fi(1 << e);
            var c = 15 - e;
            for(i = 0; i < s; ++i)if (r[i]) for(var h = i << 4 | r[i], p = e - r[i], v = u[r[i] - 1]++ << p, y = v | (1 << p) - 1; v <= y; ++v)d[hf[v] >>> c] = h;
        } else for(d = new Fi(s), i = 0; i < s; ++i)r[i] && (d[i] = hf[u[r[i] - 1]++] >>> 15 - r[i]);
        return d;
    }), ys = new xr(288);
    for(var Qt = 0; Qt < 144; ++Qt)ys[Qt] = 8;
    for(var Qt = 144; Qt < 256; ++Qt)ys[Qt] = 9;
    for(var Qt = 256; Qt < 280; ++Qt)ys[Qt] = 7;
    for(var Qt = 280; Qt < 288; ++Qt)ys[Qt] = 8;
    var jg = new xr(32);
    for(var Qt = 0; Qt < 32; ++Qt)jg[Qt] = 5;
    var wS = as(ys, 9, 1), SS = as(jg, 5, 1), Uc = function(r) {
        for(var e = r[0], a = 1; a < r.length; ++a)r[a] > e && (e = r[a]);
        return e;
    }, Ir = function(r, e, a) {
        var s = e / 8 | 0;
        return (r[s] | r[s + 1] << 8) >> (e & 7) & a;
    }, Oc = function(r, e) {
        var a = e / 8 | 0;
        return (r[a] | r[a + 1] << 8 | r[a + 2] << 16) >> (e & 7);
    }, xS = function(r) {
        return (r / 8 | 0) + (r & 7 && 1);
    }, _S = function(r, e, a) {
        (a == null || a > r.length) && (a = r.length);
        var s = new (r instanceof Fi ? Fi : r instanceof df ? df : xr)(a - e);
        return s.set(r.subarray(e, a)), s;
    }, ES = function(r, e, a) {
        var s = r.length;
        if (!s || a && !a.l && s < 5) return e || new xr(0);
        var i = !e || a, o = !a || a.i;
        a || (a = {}), e || (e = new xr(s * 3));
        var u = function(oe) {
            var ce = e.length;
            if (oe > ce) {
                var fe = new xr(Math.max(ce * 2, oe));
                fe.set(e), e = fe;
            }
        }, d = a.f || 0, c = a.p || 0, h = a.b || 0, p = a.l, v = a.d, y = a.m, b = a.n, S = s * 8;
        do {
            if (!p) {
                a.f = d = Ir(r, c, 1);
                var _ = Ir(r, c + 1, 3);
                if (c += 3, _) if (_ == 1) p = wS, v = SS, y = 9, b = 5;
                else if (_ == 2) {
                    var A = Ir(r, c, 31) + 257, U = Ir(r, c + 10, 15) + 4, D = A + Ir(r, c + 5, 31) + 1;
                    c += 14;
                    for(var R = new xr(D), N = new xr(19), P = 0; P < U; ++P)N[gS[P]] = Ir(r, c + P * 3, 7);
                    c += U * 3;
                    for(var I = Uc(N), F = (1 << I) - 1, Y = as(N, I, 1), P = 0; P < D;){
                        var L = Y[Ir(r, c, F)];
                        c += L & 15;
                        var x = L >>> 4;
                        if (x < 16) R[P++] = x;
                        else {
                            var G = 0, B = 0;
                            for(x == 16 ? (B = 3 + Ir(r, c, 3), c += 2, G = R[P - 1]) : x == 17 ? (B = 3 + Ir(r, c, 7), c += 3) : x == 18 && (B = 11 + Ir(r, c, 127), c += 7); B--;)R[P++] = G;
                        }
                    }
                    var K = R.subarray(0, A), ee = R.subarray(A);
                    y = Uc(K), b = Uc(ee), p = as(K, y, 1), v = as(ee, b, 1);
                } else throw "invalid block type";
                else {
                    var x = xS(c) + 4, k = r[x - 4] | r[x - 3] << 8, T = x + k;
                    if (T > s) {
                        if (o) throw "unexpected EOF";
                        break;
                    }
                    i && u(h + k), e.set(r.subarray(x, T), h), a.b = h += k, a.p = c = T * 8;
                    continue;
                }
                if (c > S) {
                    if (o) throw "unexpected EOF";
                    break;
                }
            }
            i && u(h + 131072);
            for(var ye = (1 << y) - 1, xe = (1 << b) - 1, te = c;; te = c){
                var G = p[Oc(r, c) & ye], q = G >>> 4;
                if (c += G & 15, c > S) {
                    if (o) throw "unexpected EOF";
                    break;
                }
                if (!G) throw "invalid length/literal";
                if (q < 256) e[h++] = q;
                else if (q == 256) {
                    te = c, p = null;
                    break;
                } else {
                    var O = q - 254;
                    if (q > 264) {
                        var P = q - 257, H = Ug[P];
                        O = Ir(r, c, (1 << H) - 1) + Ng[P], c += H;
                    }
                    var X = v[Oc(r, c) & xe], Z = X >>> 4;
                    if (!X) throw "invalid distance";
                    c += X & 15;
                    var ee = bS[Z];
                    if (Z > 3) {
                        var H = Og[Z];
                        ee += Oc(r, c) & (1 << H) - 1, c += H;
                    }
                    if (c > S) {
                        if (o) throw "unexpected EOF";
                        break;
                    }
                    i && u(h + 131072);
                    for(var $ = h + O; h < $; h += 4)e[h] = e[h - ee], e[h + 1] = e[h + 1 - ee], e[h + 2] = e[h + 2 - ee], e[h + 3] = e[h + 3 - ee];
                    h = $;
                }
            }
            a.l = p, a.p = te, a.b = h, p && (d = 1, a.m = y, a.d = v, a.n = b);
        }while (!d);
        return h == e.length ? e : _S(e, 0, h);
    }, MS = new xr(0), CS = function(r) {
        if ((r[0] & 15) != 8 || r[0] >>> 4 > 7 || (r[0] << 8 | r[1]) % 31) throw "invalid zlib data";
        if (r[1] & 32) throw "invalid zlib data: preset dictionaries not supported";
    };
    function cl(r, e) {
        return ES((CS(r), r.subarray(2, -4)), e);
    }
    var TS = typeof TextDecoder < "u" && new TextDecoder, PS = 0;
    try {
        TS.decode(MS, {
            stream: !0
        }), PS = 1;
    } catch  {}
    const kS = (r)=>r && r.isCubeTexture;
    class RS extends Xn {
        constructor(e, a){
            var s, i;
            const o = kS(e), d = ((i = o ? (s = e.image[0]) == null ? void 0 : s.width : e.image.width) != null ? i : 1024) / 4, c = Math.floor(Math.log2(d)), h = Math.pow(2, c), p = 3 * Math.max(h, 112), v = 4 * h, y = [
                o ? "#define ENVMAP_TYPE_CUBE" : "",
                `#define CUBEUV_TEXEL_WIDTH ${1 / p}`,
                `#define CUBEUV_TEXEL_HEIGHT ${1 / v}`,
                `#define CUBEUV_MAX_MIP ${c}.0`
            ], b = `
        varying vec3 vWorldPosition;
        void main() 
        {
            vec4 worldPosition = ( modelMatrix * vec4( position, 1.0 ) );
            vWorldPosition = worldPosition.xyz;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `, S = y.join(`
`) + `
        #define ENVMAP_TYPE_CUBE_UV
        varying vec3 vWorldPosition;
        uniform float radius;
        uniform float height;
        uniform float angle;
        #ifdef ENVMAP_TYPE_CUBE
            uniform samplerCube map;
        #else
            uniform sampler2D map;
        #endif
        // From: https://www.shadertoy.com/view/4tsBD7
        float diskIntersectWithBackFaceCulling( vec3 ro, vec3 rd, vec3 c, vec3 n, float r ) 
        {
            float d = dot ( rd, n );
            
            if( d > 0.0 ) { return 1e6; }
            
            vec3  o = ro - c;
            float t = - dot( n, o ) / d;
            vec3  q = o + rd * t;
            
            return ( dot( q, q ) < r * r ) ? t : 1e6;
        }
        // From: https://www.iquilezles.org/www/articles/intersectors/intersectors.htm
        float sphereIntersect( vec3 ro, vec3 rd, vec3 ce, float ra ) 
        {
            vec3 oc = ro - ce;
            float b = dot( oc, rd );
            float c = dot( oc, oc ) - ra * ra;
            float h = b * b - c;
            
            if( h < 0.0 ) { return -1.0; }
            
            h = sqrt( h );
            
            return - b + h;
        }
        vec3 project() 
        {
            vec3 p = normalize( vWorldPosition );
            vec3 camPos = cameraPosition;
            camPos.y -= height;
            float intersection = sphereIntersect( camPos, p, vec3( 0.0 ), radius );
            if( intersection > 0.0 ) {
                
                vec3 h = vec3( 0.0, - height, 0.0 );
                float intersection2 = diskIntersectWithBackFaceCulling( camPos, p, h, vec3( 0.0, 1.0, 0.0 ), radius );
                p = ( camPos + min( intersection, intersection2 ) * p ) / radius;
            } else {
                p = vec3( 0.0, 1.0, 0.0 );
            }
            return p;
        }
        #include <common>
        #include <cube_uv_reflection_fragment>
        void main() 
        {
            vec3 projectedWorldPosition = project();
            
            #ifdef ENVMAP_TYPE_CUBE
                vec3 outcolor = textureCube( map, projectedWorldPosition ).rgb;
            #else
                vec3 direction = normalize( projectedWorldPosition );
                vec2 uv = equirectUv( direction );
                vec3 outcolor = texture2D( map, uv ).rgb;
            #endif
            gl_FragColor = vec4( outcolor, 1.0 );
            #include <tonemapping_fragment>
            #include <${Dg >= 154 ? "colorspace_fragment" : "encodings_fragment"}>
        }
        `, _ = {
                map: {
                    value: e
                },
                height: {
                    value: a?.height || 15
                },
                radius: {
                    value: a?.radius || 100
                }
            }, x = new J1(1, 16), k = new Oi({
                uniforms: _,
                fragmentShader: S,
                vertexShader: b,
                side: xf
            });
            super(x, k);
        }
        set radius(e) {
            this.material.uniforms.radius.value = e;
        }
        get radius() {
            return this.material.uniforms.radius.value;
        }
        set height(e) {
            this.material.uniforms.height.value = e;
        }
        get height() {
            return this.material.uniforms.height.value;
        }
    }
    var IS = Object.defineProperty, AS = (r, e, a)=>e in r ? IS(r, e, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: a
        }) : r[e] = a, FS = (r, e, a)=>(AS(r, e + "", a), a);
    class DS {
        constructor(){
            FS(this, "_listeners");
        }
        addEventListener(e, a) {
            this._listeners === void 0 && (this._listeners = {});
            const s = this._listeners;
            s[e] === void 0 && (s[e] = []), s[e].indexOf(a) === -1 && s[e].push(a);
        }
        hasEventListener(e, a) {
            if (this._listeners === void 0) return !1;
            const s = this._listeners;
            return s[e] !== void 0 && s[e].indexOf(a) !== -1;
        }
        removeEventListener(e, a) {
            if (this._listeners === void 0) return;
            const i = this._listeners[e];
            if (i !== void 0) {
                const o = i.indexOf(a);
                o !== -1 && i.splice(o, 1);
            }
        }
        dispatchEvent(e) {
            if (this._listeners === void 0) return;
            const s = this._listeners[e.type];
            if (s !== void 0) {
                e.target = this;
                const i = s.slice(0);
                for(let o = 0, u = i.length; o < u; o++)i[o].call(this, e);
                e.target = null;
            }
        }
    }
    var US = Object.defineProperty, OS = (r, e, a)=>e in r ? US(r, e, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: a
        }) : r[e] = a, tt = (r, e, a)=>(OS(r, typeof e != "symbol" ? e + "" : e, a), a);
    const fl = new Al, Up = new fo, LS = Math.cos(70 * (Math.PI / 180)), Op = (r, e)=>(r % e + e) % e;
    let zS = class extends DS {
        constructor(e, a){
            super(), tt(this, "object"), tt(this, "domElement"), tt(this, "enabled", !0), tt(this, "target", new ke), tt(this, "minDistance", 0), tt(this, "maxDistance", 1 / 0), tt(this, "minZoom", 0), tt(this, "maxZoom", 1 / 0), tt(this, "minPolarAngle", 0), tt(this, "maxPolarAngle", Math.PI), tt(this, "minAzimuthAngle", -1 / 0), tt(this, "maxAzimuthAngle", 1 / 0), tt(this, "enableDamping", !1), tt(this, "dampingFactor", .05), tt(this, "enableZoom", !0), tt(this, "zoomSpeed", 1), tt(this, "enableRotate", !0), tt(this, "rotateSpeed", 1), tt(this, "enablePan", !0), tt(this, "panSpeed", 1), tt(this, "screenSpacePanning", !0), tt(this, "keyPanSpeed", 7), tt(this, "zoomToCursor", !1), tt(this, "autoRotate", !1), tt(this, "autoRotateSpeed", 2), tt(this, "reverseOrbit", !1), tt(this, "reverseHorizontalOrbit", !1), tt(this, "reverseVerticalOrbit", !1), tt(this, "keys", {
                LEFT: "ArrowLeft",
                UP: "ArrowUp",
                RIGHT: "ArrowRight",
                BOTTOM: "ArrowDown"
            }), tt(this, "mouseButtons", {
                LEFT: Ya.ROTATE,
                MIDDLE: Ya.DOLLY,
                RIGHT: Ya.PAN
            }), tt(this, "touches", {
                ONE: qa.ROTATE,
                TWO: qa.DOLLY_PAN
            }), tt(this, "target0"), tt(this, "position0"), tt(this, "zoom0"), tt(this, "_domElementKeyEvents", null), tt(this, "getPolarAngle"), tt(this, "getAzimuthalAngle"), tt(this, "setPolarAngle"), tt(this, "setAzimuthalAngle"), tt(this, "getDistance"), tt(this, "getZoomScale"), tt(this, "listenToKeyEvents"), tt(this, "stopListenToKeyEvents"), tt(this, "saveState"), tt(this, "reset"), tt(this, "update"), tt(this, "connect"), tt(this, "dispose"), tt(this, "dollyIn"), tt(this, "dollyOut"), tt(this, "getScale"), tt(this, "setScale"), this.object = e, this.domElement = a, this.target0 = this.target.clone(), this.position0 = this.object.position.clone(), this.zoom0 = this.object.zoom, this.getPolarAngle = ()=>p.phi, this.getAzimuthalAngle = ()=>p.theta, this.setPolarAngle = (W)=>{
                let de = Op(W, 2 * Math.PI), Re = p.phi;
                Re < 0 && (Re += 2 * Math.PI), de < 0 && (de += 2 * Math.PI);
                let qe = Math.abs(de - Re);
                2 * Math.PI - qe < qe && (de < Re ? de += 2 * Math.PI : Re += 2 * Math.PI), v.phi = de - Re, s.update();
            }, this.setAzimuthalAngle = (W)=>{
                let de = Op(W, 2 * Math.PI), Re = p.theta;
                Re < 0 && (Re += 2 * Math.PI), de < 0 && (de += 2 * Math.PI);
                let qe = Math.abs(de - Re);
                2 * Math.PI - qe < qe && (de < Re ? de += 2 * Math.PI : Re += 2 * Math.PI), v.theta = de - Re, s.update();
            }, this.getDistance = ()=>s.object.position.distanceTo(s.target), this.listenToKeyEvents = (W)=>{
                W.addEventListener("keydown", Ge), this._domElementKeyEvents = W;
            }, this.stopListenToKeyEvents = ()=>{
                this._domElementKeyEvents.removeEventListener("keydown", Ge), this._domElementKeyEvents = null;
            }, this.saveState = ()=>{
                s.target0.copy(s.target), s.position0.copy(s.object.position), s.zoom0 = s.object.zoom;
            }, this.reset = ()=>{
                s.target.copy(s.target0), s.object.position.copy(s.position0), s.object.zoom = s.zoom0, s.object.updateProjectionMatrix(), s.dispatchEvent(i), s.update(), c = d.NONE;
            }, this.update = (()=>{
                const W = new ke, de = new ke(0, 1, 0), Re = new Vn().setFromUnitVectors(e.up, de), qe = Re.clone().invert(), ue = new ke, ot = new Vn, Kt = 2 * Math.PI;
                return function() {
                    const ft = s.object.position;
                    Re.setFromUnitVectors(e.up, de), qe.copy(Re).invert(), W.copy(ft).sub(s.target), W.applyQuaternion(Re), p.setFromVector3(W), s.autoRotate && c === d.NONE && B(L()), s.enableDamping ? (p.theta += v.theta * s.dampingFactor, p.phi += v.phi * s.dampingFactor) : (p.theta += v.theta, p.phi += v.phi);
                    let Mt = s.minAzimuthAngle, yt = s.maxAzimuthAngle;
                    isFinite(Mt) && isFinite(yt) && (Mt < -Math.PI ? Mt += Kt : Mt > Math.PI && (Mt -= Kt), yt < -Math.PI ? yt += Kt : yt > Math.PI && (yt -= Kt), Mt <= yt ? p.theta = Math.max(Mt, Math.min(yt, p.theta)) : p.theta = p.theta > (Mt + yt) / 2 ? Math.max(Mt, p.theta) : Math.min(yt, p.theta)), p.phi = Math.max(s.minPolarAngle, Math.min(s.maxPolarAngle, p.phi)), p.makeSafe(), s.enableDamping === !0 ? s.target.addScaledVector(b, s.dampingFactor) : s.target.add(b), s.zoomToCursor && I || s.object.isOrthographicCamera ? p.radius = X(p.radius) : p.radius = X(p.radius * y), W.setFromSpherical(p), W.applyQuaternion(qe), ft.copy(s.target).add(W), s.object.matrixAutoUpdate || s.object.updateMatrix(), s.object.lookAt(s.target), s.enableDamping === !0 ? (v.theta *= 1 - s.dampingFactor, v.phi *= 1 - s.dampingFactor, b.multiplyScalar(1 - s.dampingFactor)) : (v.set(0, 0, 0), b.set(0, 0, 0));
                    let $e = !1;
                    if (s.zoomToCursor && I) {
                        let Ct = null;
                        if (s.object instanceof la && s.object.isPerspectiveCamera) {
                            const Yt = W.length();
                            Ct = X(Yt * y);
                            const Gt = Yt - Ct;
                            s.object.position.addScaledVector(N, Gt), s.object.updateMatrixWorld();
                        } else if (s.object.isOrthographicCamera) {
                            const Yt = new ke(P.x, P.y, 0);
                            Yt.unproject(s.object), s.object.zoom = Math.max(s.minZoom, Math.min(s.maxZoom, s.object.zoom / y)), s.object.updateProjectionMatrix(), $e = !0;
                            const Gt = new ke(P.x, P.y, 0);
                            Gt.unproject(s.object), s.object.position.sub(Gt).add(Yt), s.object.updateMatrixWorld(), Ct = W.length();
                        } else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."), s.zoomToCursor = !1;
                        Ct !== null && (s.screenSpacePanning ? s.target.set(0, 0, -1).transformDirection(s.object.matrix).multiplyScalar(Ct).add(s.object.position) : (fl.origin.copy(s.object.position), fl.direction.set(0, 0, -1).transformDirection(s.object.matrix), Math.abs(s.object.up.dot(fl.direction)) < LS ? e.lookAt(s.target) : (Up.setFromNormalAndCoplanarPoint(s.object.up, s.target), fl.intersectPlane(Up, s.target))));
                    } else s.object instanceof Di && s.object.isOrthographicCamera && ($e = y !== 1, $e && (s.object.zoom = Math.max(s.minZoom, Math.min(s.maxZoom, s.object.zoom / y)), s.object.updateProjectionMatrix()));
                    return y = 1, I = !1, $e || ue.distanceToSquared(s.object.position) > h || 8 * (1 - ot.dot(s.object.quaternion)) > h ? (s.dispatchEvent(i), ue.copy(s.object.position), ot.copy(s.object.quaternion), $e = !1, !0) : !1;
                };
            })(), this.connect = (W)=>{
                s.domElement = W, s.domElement.style.touchAction = "none", s.domElement.addEventListener("contextmenu", kt), s.domElement.addEventListener("pointerdown", Ke), s.domElement.addEventListener("pointercancel", je), s.domElement.addEventListener("wheel", Oe);
            }, this.dispose = ()=>{
                var W, de, Re, qe, ue, ot;
                s.domElement && (s.domElement.style.touchAction = "auto"), (W = s.domElement) == null || W.removeEventListener("contextmenu", kt), (de = s.domElement) == null || de.removeEventListener("pointerdown", Ke), (Re = s.domElement) == null || Re.removeEventListener("pointercancel", je), (qe = s.domElement) == null || qe.removeEventListener("wheel", Oe), (ue = s.domElement) == null || ue.ownerDocument.removeEventListener("pointermove", Se), (ot = s.domElement) == null || ot.ownerDocument.removeEventListener("pointerup", je), s._domElementKeyEvents !== null && s._domElementKeyEvents.removeEventListener("keydown", Ge);
            };
            const s = this, i = {
                type: "change"
            }, o = {
                type: "start"
            }, u = {
                type: "end"
            }, d = {
                NONE: -1,
                ROTATE: 0,
                DOLLY: 1,
                PAN: 2,
                TOUCH_ROTATE: 3,
                TOUCH_PAN: 4,
                TOUCH_DOLLY_PAN: 5,
                TOUCH_DOLLY_ROTATE: 6
            };
            let c = d.NONE;
            const h = 1e-6, p = new Jh, v = new Jh;
            let y = 1;
            const b = new ke, S = new Ft, _ = new Ft, x = new Ft, k = new Ft, T = new Ft, A = new Ft, U = new Ft, D = new Ft, R = new Ft, N = new ke, P = new Ft;
            let I = !1;
            const F = [], Y = {};
            function L() {
                return 2 * Math.PI / 60 / 60 * s.autoRotateSpeed;
            }
            function G() {
                return Math.pow(.95, s.zoomSpeed);
            }
            function B(W) {
                s.reverseOrbit || s.reverseHorizontalOrbit ? v.theta += W : v.theta -= W;
            }
            function K(W) {
                s.reverseOrbit || s.reverseVerticalOrbit ? v.phi += W : v.phi -= W;
            }
            const ee = (()=>{
                const W = new ke;
                return function(Re, qe) {
                    W.setFromMatrixColumn(qe, 0), W.multiplyScalar(-Re), b.add(W);
                };
            })(), ye = (()=>{
                const W = new ke;
                return function(Re, qe) {
                    s.screenSpacePanning === !0 ? W.setFromMatrixColumn(qe, 1) : (W.setFromMatrixColumn(qe, 0), W.crossVectors(s.object.up, W)), W.multiplyScalar(Re), b.add(W);
                };
            })(), xe = (()=>{
                const W = new ke;
                return function(Re, qe) {
                    const ue = s.domElement;
                    if (ue && s.object instanceof la && s.object.isPerspectiveCamera) {
                        const ot = s.object.position;
                        W.copy(ot).sub(s.target);
                        let Kt = W.length();
                        Kt *= Math.tan(s.object.fov / 2 * Math.PI / 180), ee(2 * Re * Kt / ue.clientHeight, s.object.matrix), ye(2 * qe * Kt / ue.clientHeight, s.object.matrix);
                    } else ue && s.object instanceof Di && s.object.isOrthographicCamera ? (ee(Re * (s.object.right - s.object.left) / s.object.zoom / ue.clientWidth, s.object.matrix), ye(qe * (s.object.top - s.object.bottom) / s.object.zoom / ue.clientHeight, s.object.matrix)) : (console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."), s.enablePan = !1);
                };
            })();
            function te(W) {
                s.object instanceof la && s.object.isPerspectiveCamera || s.object instanceof Di && s.object.isOrthographicCamera ? y = W : (console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."), s.enableZoom = !1);
            }
            function q(W) {
                te(y / W);
            }
            function O(W) {
                te(y * W);
            }
            function H(W) {
                if (!s.zoomToCursor || !s.domElement) return;
                I = !0;
                const de = s.domElement.getBoundingClientRect(), Re = W.clientX - de.left, qe = W.clientY - de.top, ue = de.width, ot = de.height;
                P.x = Re / ue * 2 - 1, P.y = -(qe / ot) * 2 + 1, N.set(P.x, P.y, 1).unproject(s.object).sub(s.object.position).normalize();
            }
            function X(W) {
                return Math.max(s.minDistance, Math.min(s.maxDistance, W));
            }
            function Z(W) {
                S.set(W.clientX, W.clientY);
            }
            function $(W) {
                H(W), U.set(W.clientX, W.clientY);
            }
            function oe(W) {
                k.set(W.clientX, W.clientY);
            }
            function ce(W) {
                _.set(W.clientX, W.clientY), x.subVectors(_, S).multiplyScalar(s.rotateSpeed);
                const de = s.domElement;
                de && (B(2 * Math.PI * x.x / de.clientHeight), K(2 * Math.PI * x.y / de.clientHeight)), S.copy(_), s.update();
            }
            function fe(W) {
                D.set(W.clientX, W.clientY), R.subVectors(D, U), R.y > 0 ? q(G()) : R.y < 0 && O(G()), U.copy(D), s.update();
            }
            function Pe(W) {
                T.set(W.clientX, W.clientY), A.subVectors(T, k).multiplyScalar(s.panSpeed), xe(A.x, A.y), k.copy(T), s.update();
            }
            function Ie(W) {
                H(W), W.deltaY < 0 ? O(G()) : W.deltaY > 0 && q(G()), s.update();
            }
            function he(W) {
                let de = !1;
                switch(W.code){
                    case s.keys.UP:
                        xe(0, s.keyPanSpeed), de = !0;
                        break;
                    case s.keys.BOTTOM:
                        xe(0, -s.keyPanSpeed), de = !0;
                        break;
                    case s.keys.LEFT:
                        xe(s.keyPanSpeed, 0), de = !0;
                        break;
                    case s.keys.RIGHT:
                        xe(-s.keyPanSpeed, 0), de = !0;
                        break;
                }
                de && (W.preventDefault(), s.update());
            }
            function pe() {
                if (F.length == 1) S.set(F[0].pageX, F[0].pageY);
                else {
                    const W = .5 * (F[0].pageX + F[1].pageX), de = .5 * (F[0].pageY + F[1].pageY);
                    S.set(W, de);
                }
            }
            function Ve() {
                if (F.length == 1) k.set(F[0].pageX, F[0].pageY);
                else {
                    const W = .5 * (F[0].pageX + F[1].pageX), de = .5 * (F[0].pageY + F[1].pageY);
                    k.set(W, de);
                }
            }
            function Xe() {
                const W = F[0].pageX - F[1].pageX, de = F[0].pageY - F[1].pageY, Re = Math.sqrt(W * W + de * de);
                U.set(0, Re);
            }
            function Ae() {
                s.enableZoom && Xe(), s.enablePan && Ve();
            }
            function ze() {
                s.enableZoom && Xe(), s.enableRotate && pe();
            }
            function Ue(W) {
                if (F.length == 1) _.set(W.pageX, W.pageY);
                else {
                    const Re = Ze(W), qe = .5 * (W.pageX + Re.x), ue = .5 * (W.pageY + Re.y);
                    _.set(qe, ue);
                }
                x.subVectors(_, S).multiplyScalar(s.rotateSpeed);
                const de = s.domElement;
                de && (B(2 * Math.PI * x.x / de.clientHeight), K(2 * Math.PI * x.y / de.clientHeight)), S.copy(_);
            }
            function be(W) {
                if (F.length == 1) T.set(W.pageX, W.pageY);
                else {
                    const de = Ze(W), Re = .5 * (W.pageX + de.x), qe = .5 * (W.pageY + de.y);
                    T.set(Re, qe);
                }
                A.subVectors(T, k).multiplyScalar(s.panSpeed), xe(A.x, A.y), k.copy(T);
            }
            function Ne(W) {
                const de = Ze(W), Re = W.pageX - de.x, qe = W.pageY - de.y, ue = Math.sqrt(Re * Re + qe * qe);
                D.set(0, ue), R.set(0, Math.pow(D.y / U.y, s.zoomSpeed)), q(R.y), U.copy(D);
            }
            function Le(W) {
                s.enableZoom && Ne(W), s.enablePan && be(W);
            }
            function me(W) {
                s.enableZoom && Ne(W), s.enableRotate && Ue(W);
            }
            function Ke(W) {
                var de, Re;
                s.enabled !== !1 && (F.length === 0 && ((de = s.domElement) == null || de.ownerDocument.addEventListener("pointermove", Se), (Re = s.domElement) == null || Re.ownerDocument.addEventListener("pointerup", je)), Nt(W), W.pointerType === "touch" ? Be(W) : Fe(W));
            }
            function Se(W) {
                s.enabled !== !1 && (W.pointerType === "touch" ? et(W) : vt(W));
            }
            function je(W) {
                var de, Re, qe;
                st(W), F.length === 0 && ((de = s.domElement) == null || de.releasePointerCapture(W.pointerId), (Re = s.domElement) == null || Re.ownerDocument.removeEventListener("pointermove", Se), (qe = s.domElement) == null || qe.ownerDocument.removeEventListener("pointerup", je)), s.dispatchEvent(u), c = d.NONE;
            }
            function Fe(W) {
                let de;
                switch(W.button){
                    case 0:
                        de = s.mouseButtons.LEFT;
                        break;
                    case 1:
                        de = s.mouseButtons.MIDDLE;
                        break;
                    case 2:
                        de = s.mouseButtons.RIGHT;
                        break;
                    default:
                        de = -1;
                }
                switch(de){
                    case Ya.DOLLY:
                        if (s.enableZoom === !1) return;
                        $(W), c = d.DOLLY;
                        break;
                    case Ya.ROTATE:
                        if (W.ctrlKey || W.metaKey || W.shiftKey) {
                            if (s.enablePan === !1) return;
                            oe(W), c = d.PAN;
                        } else {
                            if (s.enableRotate === !1) return;
                            Z(W), c = d.ROTATE;
                        }
                        break;
                    case Ya.PAN:
                        if (W.ctrlKey || W.metaKey || W.shiftKey) {
                            if (s.enableRotate === !1) return;
                            Z(W), c = d.ROTATE;
                        } else {
                            if (s.enablePan === !1) return;
                            oe(W), c = d.PAN;
                        }
                        break;
                    default:
                        c = d.NONE;
                }
                c !== d.NONE && s.dispatchEvent(o);
            }
            function vt(W) {
                if (s.enabled !== !1) switch(c){
                    case d.ROTATE:
                        if (s.enableRotate === !1) return;
                        ce(W);
                        break;
                    case d.DOLLY:
                        if (s.enableZoom === !1) return;
                        fe(W);
                        break;
                    case d.PAN:
                        if (s.enablePan === !1) return;
                        Pe(W);
                        break;
                }
            }
            function Oe(W) {
                s.enabled === !1 || s.enableZoom === !1 || c !== d.NONE && c !== d.ROTATE || (W.preventDefault(), s.dispatchEvent(o), Ie(W), s.dispatchEvent(u));
            }
            function Ge(W) {
                s.enabled === !1 || s.enablePan === !1 || he(W);
            }
            function Be(W) {
                switch(Qe(W), F.length){
                    case 1:
                        switch(s.touches.ONE){
                            case qa.ROTATE:
                                if (s.enableRotate === !1) return;
                                pe(), c = d.TOUCH_ROTATE;
                                break;
                            case qa.PAN:
                                if (s.enablePan === !1) return;
                                Ve(), c = d.TOUCH_PAN;
                                break;
                            default:
                                c = d.NONE;
                        }
                        break;
                    case 2:
                        switch(s.touches.TWO){
                            case qa.DOLLY_PAN:
                                if (s.enableZoom === !1 && s.enablePan === !1) return;
                                Ae(), c = d.TOUCH_DOLLY_PAN;
                                break;
                            case qa.DOLLY_ROTATE:
                                if (s.enableZoom === !1 && s.enableRotate === !1) return;
                                ze(), c = d.TOUCH_DOLLY_ROTATE;
                                break;
                            default:
                                c = d.NONE;
                        }
                        break;
                    default:
                        c = d.NONE;
                }
                c !== d.NONE && s.dispatchEvent(o);
            }
            function et(W) {
                switch(Qe(W), c){
                    case d.TOUCH_ROTATE:
                        if (s.enableRotate === !1) return;
                        Ue(W), s.update();
                        break;
                    case d.TOUCH_PAN:
                        if (s.enablePan === !1) return;
                        be(W), s.update();
                        break;
                    case d.TOUCH_DOLLY_PAN:
                        if (s.enableZoom === !1 && s.enablePan === !1) return;
                        Le(W), s.update();
                        break;
                    case d.TOUCH_DOLLY_ROTATE:
                        if (s.enableZoom === !1 && s.enableRotate === !1) return;
                        me(W), s.update();
                        break;
                    default:
                        c = d.NONE;
                }
            }
            function kt(W) {
                s.enabled !== !1 && W.preventDefault();
            }
            function Nt(W) {
                F.push(W);
            }
            function st(W) {
                delete Y[W.pointerId];
                for(let de = 0; de < F.length; de++)if (F[de].pointerId == W.pointerId) {
                    F.splice(de, 1);
                    return;
                }
            }
            function Qe(W) {
                let de = Y[W.pointerId];
                de === void 0 && (de = new Ft, Y[W.pointerId] = de), de.set(W.pageX, W.pageY);
            }
            function Ze(W) {
                const de = W.pointerId === F[0].pointerId ? F[1] : F[0];
                return Y[de.pointerId];
            }
            this.dollyIn = (W = G())=>{
                O(W), s.update();
            }, this.dollyOut = (W = G())=>{
                q(W), s.update();
            }, this.getScale = ()=>y, this.setScale = (W)=>{
                te(W), s.update();
            }, this.getZoomScale = ()=>G(), a !== void 0 && this.connect(a), this.update();
        }
    };
    const NS = {
        uniforms: {
            tDiffuse: {
                value: null
            },
            h: {
                value: 1 / 512
            }
        },
        vertexShader: `
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,
        fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `
    }, jS = {
        uniforms: {
            tDiffuse: {
                value: null
            },
            v: {
                value: 1 / 512
            }
        },
        vertexShader: `
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,
        fragmentShader: `

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `
    };
    class BS extends Zm {
        constructor(e){
            super(e), this.type = Qn;
        }
        parse(e) {
            const u = function(P, I) {
                switch(P){
                    case 1:
                        throw new Error("THREE.RGBELoader: Read Error: " + (I || ""));
                    case 2:
                        throw new Error("THREE.RGBELoader: Write Error: " + (I || ""));
                    case 3:
                        throw new Error("THREE.RGBELoader: Bad File Format: " + (I || ""));
                    default:
                    case 4:
                        throw new Error("THREE.RGBELoader: Memory Error: " + (I || ""));
                }
            }, v = function(P, I, F) {
                I = I || 1024;
                let L = P.pos, G = -1, B = 0, K = "", ee = String.fromCharCode.apply(null, new Uint16Array(P.subarray(L, L + 128)));
                for(; 0 > (G = ee.indexOf(`
`)) && B < I && L < P.byteLength;)K += ee, B += ee.length, L += 128, ee += String.fromCharCode.apply(null, new Uint16Array(P.subarray(L, L + 128)));
                return -1 < G ? (P.pos += B + G + 1, K + ee.slice(0, G)) : !1;
            }, y = function(P) {
                const I = /^#\?(\S+)/, F = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/, Y = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/, L = /^\s*FORMAT=(\S+)\s*$/, G = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/, B = {
                    valid: 0,
                    string: "",
                    comments: "",
                    programtype: "RGBE",
                    format: "",
                    gamma: 1,
                    exposure: 1,
                    width: 0,
                    height: 0
                };
                let K, ee;
                for((P.pos >= P.byteLength || !(K = v(P))) && u(1, "no header found"), (ee = K.match(I)) || u(3, "bad initial token"), B.valid |= 1, B.programtype = ee[1], B.string += K + `
`; K = v(P), K !== !1;){
                    if (B.string += K + `
`, K.charAt(0) === "#") {
                        B.comments += K + `
`;
                        continue;
                    }
                    if ((ee = K.match(F)) && (B.gamma = parseFloat(ee[1])), (ee = K.match(Y)) && (B.exposure = parseFloat(ee[1])), (ee = K.match(L)) && (B.valid |= 2, B.format = ee[1]), (ee = K.match(G)) && (B.valid |= 4, B.height = parseInt(ee[1], 10), B.width = parseInt(ee[2], 10)), B.valid & 2 && B.valid & 4) break;
                }
                return B.valid & 2 || u(3, "missing format specifier"), B.valid & 4 || u(3, "missing image size specifier"), B;
            }, b = function(P, I, F) {
                const Y = I;
                if (Y < 8 || Y > 32767 || P[0] !== 2 || P[1] !== 2 || P[2] & 128) return new Uint8Array(P);
                Y !== (P[2] << 8 | P[3]) && u(3, "wrong scanline width");
                const L = new Uint8Array(4 * I * F);
                L.length || u(4, "unable to allocate buffer space");
                let G = 0, B = 0;
                const K = 4 * Y, ee = new Uint8Array(4), ye = new Uint8Array(K);
                let xe = F;
                for(; xe > 0 && B < P.byteLength;){
                    B + 4 > P.byteLength && u(1), ee[0] = P[B++], ee[1] = P[B++], ee[2] = P[B++], ee[3] = P[B++], (ee[0] != 2 || ee[1] != 2 || (ee[2] << 8 | ee[3]) != Y) && u(3, "bad rgbe scanline format");
                    let te = 0, q;
                    for(; te < K && B < P.byteLength;){
                        q = P[B++];
                        const H = q > 128;
                        if (H && (q -= 128), (q === 0 || te + q > K) && u(3, "bad scanline data"), H) {
                            const X = P[B++];
                            for(let Z = 0; Z < q; Z++)ye[te++] = X;
                        } else ye.set(P.subarray(B, B + q), te), te += q, B += q;
                    }
                    const O = Y;
                    for(let H = 0; H < O; H++){
                        let X = 0;
                        L[G] = ye[H + X], X += Y, L[G + 1] = ye[H + X], X += Y, L[G + 2] = ye[H + X], X += Y, L[G + 3] = ye[H + X], G += 4;
                    }
                    xe--;
                }
                return L;
            }, S = function(P, I, F, Y) {
                const L = P[I + 3], G = Math.pow(2, L - 128) / 255;
                F[Y + 0] = P[I + 0] * G, F[Y + 1] = P[I + 1] * G, F[Y + 2] = P[I + 2] * G, F[Y + 3] = 1;
            }, _ = function(P, I, F, Y) {
                const L = P[I + 3], G = Math.pow(2, L - 128) / 255;
                F[Y + 0] = no.toHalfFloat(Math.min(P[I + 0] * G, 65504)), F[Y + 1] = no.toHalfFloat(Math.min(P[I + 1] * G, 65504)), F[Y + 2] = no.toHalfFloat(Math.min(P[I + 2] * G, 65504)), F[Y + 3] = no.toHalfFloat(1);
            }, x = new Uint8Array(e);
            x.pos = 0;
            const k = y(x), T = k.width, A = k.height, U = b(x.subarray(x.pos), T, A);
            let D, R, N;
            switch(this.type){
                case Br:
                    N = U.length / 4;
                    const P = new Float32Array(N * 4);
                    for(let F = 0; F < N; F++)S(U, F * 4, P, F * 4);
                    D = P, R = Br;
                    break;
                case Qn:
                    N = U.length / 4;
                    const I = new Uint16Array(N * 4);
                    for(let F = 0; F < N; F++)_(U, F * 4, I, F * 4);
                    D = I, R = Qn;
                    break;
                default:
                    throw new Error("THREE.RGBELoader: Unsupported type: " + this.type);
            }
            return {
                width: T,
                height: A,
                data: D,
                header: k.string,
                gamma: k.gamma,
                exposure: k.exposure,
                type: R
            };
        }
        setDataType(e) {
            return this.type = e, this;
        }
        load(e, a, s, i) {
            function o(u, d) {
                switch(u.type){
                    case Br:
                    case Qn:
                        "colorSpace" in u ? u.colorSpace = "srgb-linear" : u.encoding = 3e3, u.minFilter = Hn, u.magFilter = Hn, u.generateMipmaps = !1, u.flipY = !0;
                        break;
                }
                a && a(u, d);
            }
            return super.load(e, o, s, i);
        }
    }
    const qo = Dg >= 152;
    class GS extends Zm {
        constructor(e){
            super(e), this.type = Qn;
        }
        parse(e) {
            const I = Math.pow(2.7182818, 2.2);
            function F(w, C) {
                for(var z = 0, Q = 0; Q < 65536; ++Q)(Q == 0 || w[Q >> 3] & 1 << (Q & 7)) && (C[z++] = Q);
                for(var ae = z - 1; z < 65536;)C[z++] = 0;
                return ae;
            }
            function Y(w) {
                for(var C = 0; C < 16384; C++)w[C] = {}, w[C].len = 0, w[C].lit = 0, w[C].p = null;
            }
            const L = {
                l: 0,
                c: 0,
                lc: 0
            };
            function G(w, C, z, Q, ae) {
                for(; z < w;)C = C << 8 | Ze(Q, ae), z += 8;
                z -= w, L.l = C >> z & (1 << w) - 1, L.c = C, L.lc = z;
            }
            const B = new Array(59);
            function K(w) {
                for(var C = 0; C <= 58; ++C)B[C] = 0;
                for(var C = 0; C < 65537; ++C)B[w[C]] += 1;
                for(var z = 0, C = 58; C > 0; --C){
                    var Q = z + B[C] >> 1;
                    B[C] = z, z = Q;
                }
                for(var C = 0; C < 65537; ++C){
                    var ae = w[C];
                    ae > 0 && (w[C] = ae | B[ae]++ << 6);
                }
            }
            function ee(w, C, z, Q, ae, se, we) {
                for(var ge = z, Me = 0, Ce = 0; ae <= se; ae++){
                    if (ge.value - z.value > Q) return !1;
                    G(6, Me, Ce, w, ge);
                    var Te = L.l;
                    if (Me = L.c, Ce = L.lc, we[ae] = Te, Te == 63) {
                        if (ge.value - z.value > Q) throw "Something wrong with hufUnpackEncTable";
                        G(8, Me, Ce, w, ge);
                        var re = L.l + 6;
                        if (Me = L.c, Ce = L.lc, ae + re > se + 1) throw "Something wrong with hufUnpackEncTable";
                        for(; re--;)we[ae++] = 0;
                        ae--;
                    } else if (Te >= 59) {
                        var re = Te - 59 + 2;
                        if (ae + re > se + 1) throw "Something wrong with hufUnpackEncTable";
                        for(; re--;)we[ae++] = 0;
                        ae--;
                    }
                }
                K(we);
            }
            function ye(w) {
                return w & 63;
            }
            function xe(w) {
                return w >> 6;
            }
            function te(w, C, z, Q) {
                for(; C <= z; C++){
                    var ae = xe(w[C]), se = ye(w[C]);
                    if (ae >> se) throw "Invalid table entry";
                    if (se > 14) {
                        var we = Q[ae >> se - 14];
                        if (we.len) throw "Invalid table entry";
                        if (we.lit++, we.p) {
                            var ge = we.p;
                            we.p = new Array(we.lit);
                            for(var Me = 0; Me < we.lit - 1; ++Me)we.p[Me] = ge[Me];
                        } else we.p = new Array(1);
                        we.p[we.lit - 1] = C;
                    } else if (se) for(var Ce = 0, Me = 1 << 14 - se; Me > 0; Me--){
                        var we = Q[(ae << 14 - se) + Ce];
                        if (we.len || we.p) throw "Invalid table entry";
                        we.len = se, we.lit = C, Ce++;
                    }
                }
                return !0;
            }
            const q = {
                c: 0,
                lc: 0
            };
            function O(w, C, z, Q) {
                w = w << 8 | Ze(z, Q), C += 8, q.c = w, q.lc = C;
            }
            const H = {
                c: 0,
                lc: 0
            };
            function X(w, C, z, Q, ae, se, we, ge, Me, Ce) {
                if (w == C) {
                    Q < 8 && (O(z, Q, ae, we), z = q.c, Q = q.lc), Q -= 8;
                    var Te = z >> Q, Te = new Uint8Array([
                        Te
                    ])[0];
                    if (Me.value + Te > Ce) return !1;
                    for(var re = ge[Me.value - 1]; Te-- > 0;)ge[Me.value++] = re;
                } else if (Me.value < Ce) ge[Me.value++] = w;
                else return !1;
                H.c = z, H.lc = Q;
            }
            function Z(w) {
                return w & 65535;
            }
            function $(w) {
                var C = Z(w);
                return C > 32767 ? C - 65536 : C;
            }
            const oe = {
                a: 0,
                b: 0
            };
            function ce(w, C) {
                var z = $(w), Q = $(C), ae = Q, se = z + (ae & 1) + (ae >> 1), we = se, ge = se - ae;
                oe.a = we, oe.b = ge;
            }
            function fe(w, C) {
                var z = Z(w), Q = Z(C), ae = z - (Q >> 1) & 65535, se = Q + ae - 32768 & 65535;
                oe.a = se, oe.b = ae;
            }
            function Pe(w, C, z, Q, ae, se, we) {
                for(var ge = we < 16384, Me = z > ae ? ae : z, Ce = 1, Te; Ce <= Me;)Ce <<= 1;
                for(Ce >>= 1, Te = Ce, Ce >>= 1; Ce >= 1;){
                    for(var re = 0, It = re + se * (ae - Te), He = se * Ce, Ye = se * Te, it = Q * Ce, at = Q * Te, ht, xt, ut, an; re <= It; re += Ye){
                        for(var Tt = re, On = re + Q * (z - Te); Tt <= On; Tt += at){
                            var Dt = Tt + it, $t = Tt + He, vn = $t + it;
                            ge ? (ce(w[Tt + C], w[$t + C]), ht = oe.a, ut = oe.b, ce(w[Dt + C], w[vn + C]), xt = oe.a, an = oe.b, ce(ht, xt), w[Tt + C] = oe.a, w[Dt + C] = oe.b, ce(ut, an), w[$t + C] = oe.a, w[vn + C] = oe.b) : (fe(w[Tt + C], w[$t + C]), ht = oe.a, ut = oe.b, fe(w[Dt + C], w[vn + C]), xt = oe.a, an = oe.b, fe(ht, xt), w[Tt + C] = oe.a, w[Dt + C] = oe.b, fe(ut, an), w[$t + C] = oe.a, w[vn + C] = oe.b);
                        }
                        if (z & Ce) {
                            var $t = Tt + He;
                            ge ? ce(w[Tt + C], w[$t + C]) : fe(w[Tt + C], w[$t + C]), ht = oe.a, w[$t + C] = oe.b, w[Tt + C] = ht;
                        }
                    }
                    if (ae & Ce) for(var Tt = re, On = re + Q * (z - Te); Tt <= On; Tt += at){
                        var Dt = Tt + it;
                        ge ? ce(w[Tt + C], w[Dt + C]) : fe(w[Tt + C], w[Dt + C]), ht = oe.a, w[Dt + C] = oe.b, w[Tt + C] = ht;
                    }
                    Te = Ce, Ce >>= 1;
                }
                return re;
            }
            function Ie(w, C, z, Q, ae, se, we, ge, Me, Ce) {
                for(var Te = 0, re = 0, It = ge, He = Math.trunc(ae.value + (se + 7) / 8); ae.value < He;)for(O(Te, re, z, ae), Te = q.c, re = q.lc; re >= 14;){
                    var Ye = Te >> re - 14 & 16383, it = C[Ye];
                    if (it.len) re -= it.len, X(it.lit, we, Te, re, z, Q, ae, Me, Ce, It), Te = H.c, re = H.lc;
                    else {
                        if (!it.p) throw "hufDecode issues";
                        var at;
                        for(at = 0; at < it.lit; at++){
                            for(var ht = ye(w[it.p[at]]); re < ht && ae.value < He;)O(Te, re, z, ae), Te = q.c, re = q.lc;
                            if (re >= ht && xe(w[it.p[at]]) == (Te >> re - ht & (1 << ht) - 1)) {
                                re -= ht, X(it.p[at], we, Te, re, z, Q, ae, Me, Ce, It), Te = H.c, re = H.lc;
                                break;
                            }
                        }
                        if (at == it.lit) throw "hufDecode issues";
                    }
                }
                var xt = 8 - se & 7;
                for(Te >>= xt, re -= xt; re > 0;){
                    var it = C[Te << 14 - re & 16383];
                    if (it.len) re -= it.len, X(it.lit, we, Te, re, z, Q, ae, Me, Ce, It), Te = H.c, re = H.lc;
                    else throw "hufDecode issues";
                }
                return !0;
            }
            function he(w, C, z, Q, ae, se) {
                var we = {
                    value: 0
                }, ge = z.value, Me = Qe(C, z), Ce = Qe(C, z);
                z.value += 4;
                var Te = Qe(C, z);
                if (z.value += 4, Me < 0 || Me >= 65537 || Ce < 0 || Ce >= 65537) throw "Something wrong with HUF_ENCSIZE";
                var re = new Array(65537), It = new Array(16384);
                Y(It);
                var He = Q - (z.value - ge);
                if (ee(w, C, z, He, Me, Ce, re), Te > 8 * (Q - (z.value - ge))) throw "Something wrong with hufUncompress";
                te(re, Me, Ce, It), Ie(re, It, w, C, z, Te, Ce, se, ae, we);
            }
            function pe(w, C, z) {
                for(var Q = 0; Q < z; ++Q)C[Q] = w[C[Q]];
            }
            function Ve(w) {
                for(var C = 1; C < w.length; C++){
                    var z = w[C - 1] + w[C] - 128;
                    w[C] = z;
                }
            }
            function Xe(w, C) {
                for(var z = 0, Q = Math.floor((w.length + 1) / 2), ae = 0, se = w.length - 1; !(ae > se || (C[ae++] = w[z++], ae > se));)C[ae++] = w[Q++];
            }
            function Ae(w) {
                for(var C = w.byteLength, z = new Array, Q = 0, ae = new DataView(w); C > 0;){
                    var se = ae.getInt8(Q++);
                    if (se < 0) {
                        var we = -se;
                        C -= we + 1;
                        for(var ge = 0; ge < we; ge++)z.push(ae.getUint8(Q++));
                    } else {
                        var we = se;
                        C -= 2;
                        for(var Me = ae.getUint8(Q++), ge = 0; ge < we + 1; ge++)z.push(Me);
                    }
                }
                return z;
            }
            function ze(w, C, z, Q, ae, se) {
                var Dt = new DataView(se.buffer), we = z[w.idx[0]].width, ge = z[w.idx[0]].height, Me = 3, Ce = Math.floor(we / 8), Te = Math.ceil(we / 8), re = Math.ceil(ge / 8), It = we - (Te - 1) * 8, He = ge - (re - 1) * 8, Ye = {
                    value: 0
                }, it = new Array(Me), at = new Array(Me), ht = new Array(Me), xt = new Array(Me), ut = new Array(Me);
                for(let ct = 0; ct < Me; ++ct)ut[ct] = C[w.idx[ct]], it[ct] = ct < 1 ? 0 : it[ct - 1] + Te * re, at[ct] = new Float32Array(64), ht[ct] = new Uint16Array(64), xt[ct] = new Uint16Array(Te * 64);
                for(let ct = 0; ct < re; ++ct){
                    var an = 8;
                    ct == re - 1 && (an = He);
                    var Tt = 8;
                    for(let At = 0; At < Te; ++At){
                        At == Te - 1 && (Tt = It);
                        for(let dt = 0; dt < Me; ++dt)ht[dt].fill(0), ht[dt][0] = ae[it[dt]++], Ue(Ye, Q, ht[dt]), be(ht[dt], at[dt]), Ne(at[dt]);
                        Le(at);
                        for(let dt = 0; dt < Me; ++dt)me(at[dt], xt[dt], At * 64);
                    }
                    let mt = 0;
                    for(let At = 0; At < Me; ++At){
                        const dt = z[w.idx[At]].type;
                        for(let yn = 8 * ct; yn < 8 * ct + an; ++yn){
                            mt = ut[At][yn];
                            for(let Ln = 0; Ln < Ce; ++Ln){
                                const jt = Ln * 64 + (yn & 7) * 8;
                                Dt.setUint16(mt + 0 * dt, xt[At][jt + 0], !0), Dt.setUint16(mt + 2 * dt, xt[At][jt + 1], !0), Dt.setUint16(mt + 4 * dt, xt[At][jt + 2], !0), Dt.setUint16(mt + 6 * dt, xt[At][jt + 3], !0), Dt.setUint16(mt + 8 * dt, xt[At][jt + 4], !0), Dt.setUint16(mt + 10 * dt, xt[At][jt + 5], !0), Dt.setUint16(mt + 12 * dt, xt[At][jt + 6], !0), Dt.setUint16(mt + 14 * dt, xt[At][jt + 7], !0), mt += 16 * dt;
                            }
                        }
                        if (Ce != Te) for(let yn = 8 * ct; yn < 8 * ct + an; ++yn){
                            const Ln = ut[At][yn] + 8 * Ce * 2 * dt, jt = Ce * 64 + (yn & 7) * 8;
                            for(let zn = 0; zn < Tt; ++zn)Dt.setUint16(Ln + zn * 2 * dt, xt[At][jt + zn], !0);
                        }
                    }
                }
                for(var On = new Uint16Array(we), Dt = new DataView(se.buffer), $t = 0; $t < Me; ++$t){
                    z[w.idx[$t]].decoded = !0;
                    var vn = z[w.idx[$t]].type;
                    if (z[$t].type == 2) for(var ir = 0; ir < ge; ++ir){
                        const ct = ut[$t][ir];
                        for(var Jt = 0; Jt < we; ++Jt)On[Jt] = Dt.getUint16(ct + Jt * 2 * vn, !0);
                        for(var Jt = 0; Jt < we; ++Jt)Dt.setFloat32(ct + Jt * 2 * vn, ue(On[Jt]), !0);
                    }
                }
            }
            function Ue(w, C, z) {
                for(var Q, ae = 1; ae < 64;)Q = C[w.value], Q == 65280 ? ae = 64 : Q >> 8 == 255 ? ae += Q & 255 : (z[ae] = Q, ae++), w.value++;
            }
            function be(w, C) {
                C[0] = ue(w[0]), C[1] = ue(w[1]), C[2] = ue(w[5]), C[3] = ue(w[6]), C[4] = ue(w[14]), C[5] = ue(w[15]), C[6] = ue(w[27]), C[7] = ue(w[28]), C[8] = ue(w[2]), C[9] = ue(w[4]), C[10] = ue(w[7]), C[11] = ue(w[13]), C[12] = ue(w[16]), C[13] = ue(w[26]), C[14] = ue(w[29]), C[15] = ue(w[42]), C[16] = ue(w[3]), C[17] = ue(w[8]), C[18] = ue(w[12]), C[19] = ue(w[17]), C[20] = ue(w[25]), C[21] = ue(w[30]), C[22] = ue(w[41]), C[23] = ue(w[43]), C[24] = ue(w[9]), C[25] = ue(w[11]), C[26] = ue(w[18]), C[27] = ue(w[24]), C[28] = ue(w[31]), C[29] = ue(w[40]), C[30] = ue(w[44]), C[31] = ue(w[53]), C[32] = ue(w[10]), C[33] = ue(w[19]), C[34] = ue(w[23]), C[35] = ue(w[32]), C[36] = ue(w[39]), C[37] = ue(w[45]), C[38] = ue(w[52]), C[39] = ue(w[54]), C[40] = ue(w[20]), C[41] = ue(w[22]), C[42] = ue(w[33]), C[43] = ue(w[38]), C[44] = ue(w[46]), C[45] = ue(w[51]), C[46] = ue(w[55]), C[47] = ue(w[60]), C[48] = ue(w[21]), C[49] = ue(w[34]), C[50] = ue(w[37]), C[51] = ue(w[47]), C[52] = ue(w[50]), C[53] = ue(w[56]), C[54] = ue(w[59]), C[55] = ue(w[61]), C[56] = ue(w[35]), C[57] = ue(w[36]), C[58] = ue(w[48]), C[59] = ue(w[49]), C[60] = ue(w[57]), C[61] = ue(w[58]), C[62] = ue(w[62]), C[63] = ue(w[63]);
            }
            function Ne(w) {
                const C = .5 * Math.cos(.7853975), z = .5 * Math.cos(3.14159 / 16), Q = .5 * Math.cos(3.14159 / 8), ae = .5 * Math.cos(3 * 3.14159 / 16), se = .5 * Math.cos(5 * 3.14159 / 16), we = .5 * Math.cos(3 * 3.14159 / 8), ge = .5 * Math.cos(7 * 3.14159 / 16);
                for(var Me = new Array(4), Ce = new Array(4), Te = new Array(4), re = new Array(4), It = 0; It < 8; ++It){
                    var He = It * 8;
                    Me[0] = Q * w[He + 2], Me[1] = we * w[He + 2], Me[2] = Q * w[He + 6], Me[3] = we * w[He + 6], Ce[0] = z * w[He + 1] + ae * w[He + 3] + se * w[He + 5] + ge * w[He + 7], Ce[1] = ae * w[He + 1] - ge * w[He + 3] - z * w[He + 5] - se * w[He + 7], Ce[2] = se * w[He + 1] - z * w[He + 3] + ge * w[He + 5] + ae * w[He + 7], Ce[3] = ge * w[He + 1] - se * w[He + 3] + ae * w[He + 5] - z * w[He + 7], Te[0] = C * (w[He + 0] + w[He + 4]), Te[3] = C * (w[He + 0] - w[He + 4]), Te[1] = Me[0] + Me[3], Te[2] = Me[1] - Me[2], re[0] = Te[0] + Te[1], re[1] = Te[3] + Te[2], re[2] = Te[3] - Te[2], re[3] = Te[0] - Te[1], w[He + 0] = re[0] + Ce[0], w[He + 1] = re[1] + Ce[1], w[He + 2] = re[2] + Ce[2], w[He + 3] = re[3] + Ce[3], w[He + 4] = re[3] - Ce[3], w[He + 5] = re[2] - Ce[2], w[He + 6] = re[1] - Ce[1], w[He + 7] = re[0] - Ce[0];
                }
                for(var Ye = 0; Ye < 8; ++Ye)Me[0] = Q * w[16 + Ye], Me[1] = we * w[16 + Ye], Me[2] = Q * w[48 + Ye], Me[3] = we * w[48 + Ye], Ce[0] = z * w[8 + Ye] + ae * w[24 + Ye] + se * w[40 + Ye] + ge * w[56 + Ye], Ce[1] = ae * w[8 + Ye] - ge * w[24 + Ye] - z * w[40 + Ye] - se * w[56 + Ye], Ce[2] = se * w[8 + Ye] - z * w[24 + Ye] + ge * w[40 + Ye] + ae * w[56 + Ye], Ce[3] = ge * w[8 + Ye] - se * w[24 + Ye] + ae * w[40 + Ye] - z * w[56 + Ye], Te[0] = C * (w[Ye] + w[32 + Ye]), Te[3] = C * (w[Ye] - w[32 + Ye]), Te[1] = Me[0] + Me[3], Te[2] = Me[1] - Me[2], re[0] = Te[0] + Te[1], re[1] = Te[3] + Te[2], re[2] = Te[3] - Te[2], re[3] = Te[0] - Te[1], w[0 + Ye] = re[0] + Ce[0], w[8 + Ye] = re[1] + Ce[1], w[16 + Ye] = re[2] + Ce[2], w[24 + Ye] = re[3] + Ce[3], w[32 + Ye] = re[3] - Ce[3], w[40 + Ye] = re[2] - Ce[2], w[48 + Ye] = re[1] - Ce[1], w[56 + Ye] = re[0] - Ce[0];
            }
            function Le(w) {
                for(var C = 0; C < 64; ++C){
                    var z = w[0][C], Q = w[1][C], ae = w[2][C];
                    w[0][C] = z + 1.5747 * ae, w[1][C] = z - .1873 * Q - .4682 * ae, w[2][C] = z + 1.8556 * Q;
                }
            }
            function me(w, C, z) {
                for(var Q = 0; Q < 64; ++Q)C[z + Q] = no.toHalfFloat(Ke(w[Q]));
            }
            function Ke(w) {
                return w <= 1 ? Math.sign(w) * Math.pow(Math.abs(w), 2.2) : Math.sign(w) * Math.pow(I, Math.abs(w) - 1);
            }
            function Se(w) {
                return new DataView(w.array.buffer, w.offset.value, w.size);
            }
            function je(w) {
                var C = w.viewer.buffer.slice(w.offset.value, w.offset.value + w.size), z = new Uint8Array(Ae(C)), Q = new Uint8Array(z.length);
                return Ve(z), Xe(z, Q), new DataView(Q.buffer);
            }
            function Fe(w) {
                var C = w.array.slice(w.offset.value, w.offset.value + w.size), z = cl(C), Q = new Uint8Array(z.length);
                return Ve(z), Xe(z, Q), new DataView(Q.buffer);
            }
            function vt(w) {
                for(var C = w.viewer, z = {
                    value: w.offset.value
                }, Q = new Uint16Array(w.width * w.scanlineBlockSize * (w.channels * w.type)), ae = new Uint8Array(8192), se = 0, we = new Array(w.channels), ge = 0; ge < w.channels; ge++)we[ge] = {}, we[ge].start = se, we[ge].end = we[ge].start, we[ge].nx = w.width, we[ge].ny = w.lines, we[ge].size = w.type, se += we[ge].nx * we[ge].ny * we[ge].size;
                var Me = ot(C, z), Ce = ot(C, z);
                if (Ce >= 8192) throw "Something is wrong with PIZ_COMPRESSION BITMAP_SIZE";
                if (Me <= Ce) for(var ge = 0; ge < Ce - Me + 1; ge++)ae[ge + Me] = W(C, z);
                var Te = new Uint16Array(65536), re = F(ae, Te), It = Qe(C, z);
                he(w.array, C, z, It, Q, se);
                for(var ge = 0; ge < w.channels; ++ge)for(var He = we[ge], Ye = 0; Ye < we[ge].size; ++Ye)Pe(Q, He.start + Ye, He.nx, He.size, He.ny, He.nx * He.size, re);
                pe(Te, Q, se);
                for(var it = 0, at = new Uint8Array(Q.buffer.byteLength), ht = 0; ht < w.lines; ht++)for(var xt = 0; xt < w.channels; xt++){
                    var He = we[xt], ut = He.nx * He.size, an = new Uint8Array(Q.buffer, He.end * 2, ut * 2);
                    at.set(an, it), it += ut * 2, He.end += ut;
                }
                return new DataView(at.buffer);
            }
            function Oe(w) {
                var C = w.array.slice(w.offset.value, w.offset.value + w.size), z = cl(C);
                const Q = w.lines * w.channels * w.width, ae = w.type == 1 ? new Uint16Array(Q) : new Uint32Array(Q);
                let se = 0, we = 0;
                const ge = new Array(4);
                for(let Me = 0; Me < w.lines; Me++)for(let Ce = 0; Ce < w.channels; Ce++){
                    let Te = 0;
                    switch(w.type){
                        case 1:
                            ge[0] = se, ge[1] = ge[0] + w.width, se = ge[1] + w.width;
                            for(let re = 0; re < w.width; ++re){
                                const It = z[ge[0]++] << 8 | z[ge[1]++];
                                Te += It, ae[we] = Te, we++;
                            }
                            break;
                        case 2:
                            ge[0] = se, ge[1] = ge[0] + w.width, ge[2] = ge[1] + w.width, se = ge[2] + w.width;
                            for(let re = 0; re < w.width; ++re){
                                const It = z[ge[0]++] << 24 | z[ge[1]++] << 16 | z[ge[2]++] << 8;
                                Te += It, ae[we] = Te, we++;
                            }
                            break;
                    }
                }
                return new DataView(ae.buffer);
            }
            function Ge(w) {
                var C = w.viewer, z = {
                    value: w.offset.value
                }, Q = new Uint8Array(w.width * w.lines * (w.channels * w.type * 2)), ae = {
                    version: de(C, z),
                    unknownUncompressedSize: de(C, z),
                    unknownCompressedSize: de(C, z),
                    acCompressedSize: de(C, z),
                    dcCompressedSize: de(C, z),
                    rleCompressedSize: de(C, z),
                    rleUncompressedSize: de(C, z),
                    rleRawSize: de(C, z),
                    totalAcUncompressedCount: de(C, z),
                    totalDcUncompressedCount: de(C, z),
                    acCompression: de(C, z)
                };
                if (ae.version < 2) throw "EXRLoader.parse: " + Mn.compression + " version " + ae.version + " is unsupported";
                for(var se = new Array, we = ot(C, z) - 2; we > 0;){
                    var ge = Be(C.buffer, z), Me = W(C, z), Ce = Me >> 2 & 3, Te = (Me >> 4) - 1, re = new Int8Array([
                        Te
                    ])[0], It = W(C, z);
                    se.push({
                        name: ge,
                        index: re,
                        type: It,
                        compression: Ce
                    }), we -= ge.length + 3;
                }
                for(var He = Mn.channels, Ye = new Array(w.channels), it = 0; it < w.channels; ++it){
                    var at = Ye[it] = {}, ht = He[it];
                    at.name = ht.name, at.compression = 0, at.decoded = !1, at.type = ht.pixelType, at.pLinear = ht.pLinear, at.width = w.width, at.height = w.lines;
                }
                for(var xt = {
                    idx: new Array(3)
                }, ut = 0; ut < w.channels; ++ut)for(var at = Ye[ut], it = 0; it < se.length; ++it){
                    var an = se[it];
                    at.name == an.name && (at.compression = an.compression, an.index >= 0 && (xt.idx[an.index] = ut), at.offset = ut);
                }
                if (ae.acCompressedSize > 0) switch(ae.acCompression){
                    case 0:
                        var Dt = new Uint16Array(ae.totalAcUncompressedCount);
                        he(w.array, C, z, ae.acCompressedSize, Dt, ae.totalAcUncompressedCount);
                        break;
                    case 1:
                        var Tt = w.array.slice(z.value, z.value + ae.totalAcUncompressedCount), On = cl(Tt), Dt = new Uint16Array(On.buffer);
                        z.value += ae.totalAcUncompressedCount;
                        break;
                }
                if (ae.dcCompressedSize > 0) {
                    var $t = {
                        array: w.array,
                        offset: z,
                        size: ae.dcCompressedSize
                    }, vn = new Uint16Array(Fe($t).buffer);
                    z.value += ae.dcCompressedSize;
                }
                if (ae.rleRawSize > 0) {
                    var Tt = w.array.slice(z.value, z.value + ae.rleCompressedSize), On = cl(Tt), ir = Ae(On.buffer);
                    z.value += ae.rleCompressedSize;
                }
                for(var Jt = 0, ct = new Array(Ye.length), it = 0; it < ct.length; ++it)ct[it] = new Array;
                for(var mt = 0; mt < w.lines; ++mt)for(var At = 0; At < Ye.length; ++At)ct[At].push(Jt), Jt += Ye[At].width * w.type * 2;
                ze(xt, ct, Ye, Dt, vn, Q);
                for(var it = 0; it < Ye.length; ++it){
                    var at = Ye[it];
                    if (!at.decoded) switch(at.compression){
                        case 2:
                            for(var dt = 0, yn = 0, mt = 0; mt < w.lines; ++mt){
                                for(var Ln = ct[it][dt], jt = 0; jt < at.width; ++jt){
                                    for(var zn = 0; zn < 2 * at.type; ++zn)Q[Ln++] = ir[yn + zn * at.width * at.height];
                                    yn++;
                                }
                                dt++;
                            }
                            break;
                        case 1:
                        default:
                            throw "EXRLoader.parse: unsupported channel compression";
                    }
                }
                return new DataView(Q.buffer);
            }
            function Be(w, C) {
                for(var z = new Uint8Array(w), Q = 0; z[C.value + Q] != 0;)Q += 1;
                var ae = new TextDecoder().decode(z.slice(C.value, C.value + Q));
                return C.value = C.value + Q + 1, ae;
            }
            function et(w, C, z) {
                var Q = new TextDecoder().decode(new Uint8Array(w).slice(C.value, C.value + z));
                return C.value = C.value + z, Q;
            }
            function kt(w, C) {
                var z = st(w, C), Q = Qe(w, C);
                return [
                    z,
                    Q
                ];
            }
            function Nt(w, C) {
                var z = Qe(w, C), Q = Qe(w, C);
                return [
                    z,
                    Q
                ];
            }
            function st(w, C) {
                var z = w.getInt32(C.value, !0);
                return C.value = C.value + 4, z;
            }
            function Qe(w, C) {
                var z = w.getUint32(C.value, !0);
                return C.value = C.value + 4, z;
            }
            function Ze(w, C) {
                var z = w[C.value];
                return C.value = C.value + 1, z;
            }
            function W(w, C) {
                var z = w.getUint8(C.value);
                return C.value = C.value + 1, z;
            }
            const de = function(w, C) {
                let z;
                return "getBigInt64" in DataView.prototype ? z = Number(w.getBigInt64(C.value, !0)) : z = w.getUint32(C.value + 4, !0) + Number(w.getUint32(C.value, !0) << 32), C.value += 8, z;
            };
            function Re(w, C) {
                var z = w.getFloat32(C.value, !0);
                return C.value += 4, z;
            }
            function qe(w, C) {
                return no.toHalfFloat(Re(w, C));
            }
            function ue(w) {
                var C = (w & 31744) >> 10, z = w & 1023;
                return (w >> 15 ? -1 : 1) * (C ? C === 31 ? z ? NaN : 1 / 0 : Math.pow(2, C - 15) * (1 + z / 1024) : 6103515625e-14 * (z / 1024));
            }
            function ot(w, C) {
                var z = w.getUint16(C.value, !0);
                return C.value += 2, z;
            }
            function Kt(w, C) {
                return ue(ot(w, C));
            }
            function Rt(w, C, z, Q) {
                for(var ae = z.value, se = []; z.value < ae + Q - 1;){
                    var we = Be(C, z), ge = st(w, z), Me = W(w, z);
                    z.value += 3;
                    var Ce = st(w, z), Te = st(w, z);
                    se.push({
                        name: we,
                        pixelType: ge,
                        pLinear: Me,
                        xSampling: Ce,
                        ySampling: Te
                    });
                }
                return z.value += 1, se;
            }
            function ft(w, C) {
                var z = Re(w, C), Q = Re(w, C), ae = Re(w, C), se = Re(w, C), we = Re(w, C), ge = Re(w, C), Me = Re(w, C), Ce = Re(w, C);
                return {
                    redX: z,
                    redY: Q,
                    greenX: ae,
                    greenY: se,
                    blueX: we,
                    blueY: ge,
                    whiteX: Me,
                    whiteY: Ce
                };
            }
            function Mt(w, C) {
                var z = [
                    "NO_COMPRESSION",
                    "RLE_COMPRESSION",
                    "ZIPS_COMPRESSION",
                    "ZIP_COMPRESSION",
                    "PIZ_COMPRESSION",
                    "PXR24_COMPRESSION",
                    "B44_COMPRESSION",
                    "B44A_COMPRESSION",
                    "DWAA_COMPRESSION",
                    "DWAB_COMPRESSION"
                ], Q = W(w, C);
                return z[Q];
            }
            function yt(w, C) {
                var z = Qe(w, C), Q = Qe(w, C), ae = Qe(w, C), se = Qe(w, C);
                return {
                    xMin: z,
                    yMin: Q,
                    xMax: ae,
                    yMax: se
                };
            }
            function $e(w, C) {
                var z = [
                    "INCREASING_Y"
                ], Q = W(w, C);
                return z[Q];
            }
            function Ct(w, C) {
                var z = Re(w, C), Q = Re(w, C);
                return [
                    z,
                    Q
                ];
            }
            function Yt(w, C) {
                var z = Re(w, C), Q = Re(w, C), ae = Re(w, C);
                return [
                    z,
                    Q,
                    ae
                ];
            }
            function Gt(w, C, z, Q, ae) {
                if (Q === "string" || Q === "stringvector" || Q === "iccProfile") return et(C, z, ae);
                if (Q === "chlist") return Rt(w, C, z, ae);
                if (Q === "chromaticities") return ft(w, z);
                if (Q === "compression") return Mt(w, z);
                if (Q === "box2i") return yt(w, z);
                if (Q === "lineOrder") return $e(w, z);
                if (Q === "float") return Re(w, z);
                if (Q === "v2f") return Ct(w, z);
                if (Q === "v3f") return Yt(w, z);
                if (Q === "int") return st(w, z);
                if (Q === "rational") return kt(w, z);
                if (Q === "timecode") return Nt(w, z);
                if (Q === "preview") return z.value += ae, "skipped";
                z.value += ae;
            }
            function Vt(w, C, z) {
                const Q = {};
                if (w.getUint32(0, !0) != 20000630) throw "THREE.EXRLoader: provided file doesn't appear to be in OpenEXR format.";
                Q.version = w.getUint8(4);
                const ae = w.getUint8(5);
                Q.spec = {
                    singleTile: !!(ae & 2),
                    longName: !!(ae & 4),
                    deepFormat: !!(ae & 8),
                    multiPart: !!(ae & 16)
                }, z.value = 8;
                for(var se = !0; se;){
                    var we = Be(C, z);
                    if (we == 0) se = !1;
                    else {
                        var ge = Be(C, z), Me = Qe(w, z), Ce = Gt(w, C, z, ge, Me);
                        Ce === void 0 ? console.warn(`EXRLoader.parse: skipped unknown header attribute type '${ge}'.`) : Q[we] = Ce;
                    }
                }
                if ((ae & -5) != 0) throw console.error("EXRHeader:", Q), "THREE.EXRLoader: provided file is currently unsupported.";
                return Q;
            }
            function Sn(w, C, z, Q, ae) {
                const se = {
                    size: 0,
                    viewer: C,
                    array: z,
                    offset: Q,
                    width: w.dataWindow.xMax - w.dataWindow.xMin + 1,
                    height: w.dataWindow.yMax - w.dataWindow.yMin + 1,
                    channels: w.channels.length,
                    bytesPerLine: null,
                    lines: null,
                    inputSize: null,
                    type: w.channels[0].pixelType,
                    uncompress: null,
                    getter: null,
                    format: null,
                    [qo ? "colorSpace" : "encoding"]: null
                };
                switch(w.compression){
                    case "NO_COMPRESSION":
                        se.lines = 1, se.uncompress = Se;
                        break;
                    case "RLE_COMPRESSION":
                        se.lines = 1, se.uncompress = je;
                        break;
                    case "ZIPS_COMPRESSION":
                        se.lines = 1, se.uncompress = Fe;
                        break;
                    case "ZIP_COMPRESSION":
                        se.lines = 16, se.uncompress = Fe;
                        break;
                    case "PIZ_COMPRESSION":
                        se.lines = 32, se.uncompress = vt;
                        break;
                    case "PXR24_COMPRESSION":
                        se.lines = 16, se.uncompress = Oe;
                        break;
                    case "DWAA_COMPRESSION":
                        se.lines = 32, se.uncompress = Ge;
                        break;
                    case "DWAB_COMPRESSION":
                        se.lines = 256, se.uncompress = Ge;
                        break;
                    default:
                        throw "EXRLoader.parse: " + w.compression + " is unsupported";
                }
                if (se.scanlineBlockSize = se.lines, se.type == 1) switch(ae){
                    case Br:
                        se.getter = Kt, se.inputSize = 2;
                        break;
                    case Qn:
                        se.getter = ot, se.inputSize = 2;
                        break;
                }
                else if (se.type == 2) switch(ae){
                    case Br:
                        se.getter = Re, se.inputSize = 4;
                        break;
                    case Qn:
                        se.getter = qe, se.inputSize = 4;
                }
                else throw "EXRLoader.parse: unsupported pixelType " + se.type + " for " + w.compression + ".";
                se.blockCount = (w.dataWindow.yMax + 1) / se.scanlineBlockSize;
                for(var we = 0; we < se.blockCount; we++)de(C, Q);
                se.outputChannels = se.channels == 3 ? 4 : se.channels;
                const ge = se.width * se.height * se.outputChannels;
                switch(ae){
                    case Br:
                        se.byteArray = new Float32Array(ge), se.channels < se.outputChannels && se.byteArray.fill(1, 0, ge);
                        break;
                    case Qn:
                        se.byteArray = new Uint16Array(ge), se.channels < se.outputChannels && se.byteArray.fill(15360, 0, ge);
                        break;
                    default:
                        console.error("THREE.EXRLoader: unsupported type: ", ae);
                        break;
                }
                return se.bytesPerLine = se.width * se.inputSize * se.channels, se.outputChannels == 4 ? se.format = oo : se.format = ey, qo ? se.colorSpace = "srgb-linear" : se.encoding = 3e3, se;
            }
            const Dn = new DataView(e), Un = new Uint8Array(e), gn = {
                value: 0
            }, Mn = Vt(Dn, e, gn), Je = Sn(Mn, Dn, Un, gn, this.type), sn = {
                value: 0
            }, Kn = {
                R: 0,
                G: 1,
                B: 2,
                A: 3,
                Y: 0
            };
            for(let w = 0; w < Je.height / Je.scanlineBlockSize; w++){
                const C = Qe(Dn, gn);
                Je.size = Qe(Dn, gn), Je.lines = C + Je.scanlineBlockSize > Je.height ? Je.height - C : Je.scanlineBlockSize;
                const Q = Je.size < Je.lines * Je.bytesPerLine ? Je.uncompress(Je) : Se(Je);
                gn.value += Je.size;
                for(let ae = 0; ae < Je.scanlineBlockSize; ae++){
                    const se = ae + w * Je.scanlineBlockSize;
                    if (se >= Je.height) break;
                    for(let we = 0; we < Je.channels; we++){
                        const ge = Kn[Mn.channels[we].name];
                        for(let Me = 0; Me < Je.width; Me++){
                            sn.value = (ae * (Je.channels * Je.width) + we * Je.width + Me) * Je.inputSize;
                            const Ce = (Je.height - 1 - se) * (Je.width * Je.outputChannels) + Me * Je.outputChannels + ge;
                            Je.byteArray[Ce] = Je.getter(Q, sn);
                        }
                    }
                }
            }
            return {
                header: Mn,
                width: Je.width,
                height: Je.height,
                data: Je.byteArray,
                format: Je.format,
                [qo ? "colorSpace" : "encoding"]: Je[qo ? "colorSpace" : "encoding"],
                type: this.type
            };
        }
        setDataType(e) {
            return this.type = e, this;
        }
        load(e, a, s, i) {
            function o(u, d) {
                qo ? u.colorSpace = d.colorSpace : u.encoding = d.encoding, u.minFilter = Hn, u.magFilter = Hn, u.generateMipmaps = !1, u.flipY = !1, a && a(u, d);
            }
            return super.load(e, o, s, i);
        }
    }
    const HS = {};
    function po(r, e) {
        if (Object.is(r, e)) return !0;
        if (typeof r != "object" || r === null || typeof e != "object" || e === null) return !1;
        if (r instanceof Map && e instanceof Map) {
            if (r.size !== e.size) return !1;
            for (const [s, i] of r)if (!Object.is(i, e.get(s))) return !1;
            return !0;
        }
        if (r instanceof Set && e instanceof Set) {
            if (r.size !== e.size) return !1;
            for (const s of r)if (!e.has(s)) return !1;
            return !0;
        }
        const a = Object.keys(r);
        if (a.length !== Object.keys(e).length) return !1;
        for (const s of a)if (!Object.prototype.hasOwnProperty.call(e, s) || !Object.is(r[s], e[s])) return !1;
        return !0;
    }
    xM = (r, e)=>((HS ? "production" : void 0) !== "production" && console.warn("[DEPRECATED] Default export is deprecated. Instead use `import { shallow } from 'zustand/shallow'`."), po(r, e));
    _M = M.forwardRef(function({ children: e, follow: a = !0, lockX: s = !1, lockY: i = !1, lockZ: o = !1, ...u }, d) {
        const c = M.useRef(null), h = M.useRef(null), p = new Vn;
        return Wt(({ camera: v })=>{
            if (!a || !h.current) return;
            const y = c.current.rotation.clone();
            h.current.updateMatrix(), h.current.updateWorldMatrix(!1, !1), h.current.getWorldQuaternion(p), v.getWorldQuaternion(c.current.quaternion).premultiply(p.invert()), s && (c.current.rotation.x = y.x), i && (c.current.rotation.y = y.y), o && (c.current.rotation.z = y.z);
        }), M.useImperativeHandle(d, ()=>h.current, []), M.createElement("group", un({
            ref: h
        }, u), M.createElement("group", {
            ref: c
        }, e));
    });
    function WS() {
        var r = Object.create(null);
        function e(i, o) {
            var u = i.id, d = i.name, c = i.dependencies;
            c === void 0 && (c = []);
            var h = i.init;
            h === void 0 && (h = function() {});
            var p = i.getTransferables;
            if (p === void 0 && (p = null), !r[u]) try {
                c = c.map(function(y) {
                    return y && y.isWorkerModule && (e(y, function(b) {
                        if (b instanceof Error) throw b;
                    }), y = r[y.id].value), y;
                }), h = s("<" + d + ">.init", h), p && (p = s("<" + d + ">.getTransferables", p));
                var v = null;
                typeof h == "function" ? v = h.apply(void 0, c) : console.error("worker module init function failed to rehydrate"), r[u] = {
                    id: u,
                    value: v,
                    getTransferables: p
                }, o(v);
            } catch (y) {
                y && y.noLog || console.error(y), o(y);
            }
        }
        function a(i, o) {
            var u, d = i.id, c = i.args;
            (!r[d] || typeof r[d].value != "function") && o(new Error("Worker module " + d + ": not found or its 'init' did not return a function"));
            try {
                var h = (u = r[d]).value.apply(u, c);
                h && typeof h.then == "function" ? h.then(p, function(v) {
                    return o(v instanceof Error ? v : new Error("" + v));
                }) : p(h);
            } catch (v) {
                o(v);
            }
            function p(v) {
                try {
                    var y = r[d].getTransferables && r[d].getTransferables(v);
                    (!y || !Array.isArray(y) || !y.length) && (y = void 0), o(v, y);
                } catch (b) {
                    console.error(b), o(b);
                }
            }
        }
        function s(i, o) {
            var u = void 0;
            self.troikaDefine = function(c) {
                return u = c;
            };
            var d = URL.createObjectURL(new Blob([
                "/** " + i.replace(/\*/g, "") + ` **/

troikaDefine(
` + o + `
)`
            ], {
                type: "application/javascript"
            }));
            try {
                importScripts(d);
            } catch (c) {
                console.error(c);
            }
            return URL.revokeObjectURL(d), delete self.troikaDefine, u;
        }
        self.addEventListener("message", function(i) {
            var o = i.data, u = o.messageId, d = o.action, c = o.data;
            try {
                d === "registerModule" && e(c, function(h) {
                    h instanceof Error ? postMessage({
                        messageId: u,
                        success: !1,
                        error: h.message
                    }) : postMessage({
                        messageId: u,
                        success: !0,
                        result: {
                            isCallable: typeof h == "function"
                        }
                    });
                }), d === "callModule" && a(c, function(h, p) {
                    h instanceof Error ? postMessage({
                        messageId: u,
                        success: !1,
                        error: h.message
                    }) : postMessage({
                        messageId: u,
                        success: !0,
                        result: h
                    }, p || void 0);
                });
            } catch (h) {
                postMessage({
                    messageId: u,
                    success: !1,
                    error: h.stack
                });
            }
        });
    }
    function VS(r) {
        var e = function() {
            for(var a = [], s = arguments.length; s--;)a[s] = arguments[s];
            return e._getInitResult().then(function(i) {
                if (typeof i == "function") return i.apply(void 0, a);
                throw new Error("Worker module function was called but `init` did not return a callable function");
            });
        };
        return e._getInitResult = function() {
            var a = r.dependencies, s = r.init;
            a = Array.isArray(a) ? a.map(function(o) {
                return o && (o = o.onMainThread || o, o._getInitResult && (o = o._getInitResult())), o;
            }) : [];
            var i = Promise.all(a).then(function(o) {
                return s.apply(null, o);
            });
            return e._getInitResult = function() {
                return i;
            }, i;
        }, e;
    }
    var Bg = function() {
        var r = !1;
        if (typeof window < "u" && typeof window.document < "u") try {
            var e = new Worker(URL.createObjectURL(new Blob([
                ""
            ], {
                type: "application/javascript"
            })));
            e.terminate(), r = !0;
        } catch (a) {
            console.log("Troika createWorkerModule: web workers not allowed; falling back to main thread execution. Cause: [" + a.message + "]");
        }
        return Bg = function() {
            return r;
        }, r;
    }, XS = 0, YS = 0, Lc = !1, os = Object.create(null), ss = Object.create(null), pf = Object.create(null);
    function mo(r) {
        if ((!r || typeof r.init != "function") && !Lc) throw new Error("requires `options.init` function");
        var e = r.dependencies, a = r.init, s = r.getTransferables, i = r.workerId, o = VS(r);
        i == null && (i = "#default");
        var u = "workerModule" + ++XS, d = r.name || u, c = null;
        e = e && e.map(function(p) {
            return typeof p == "function" && !p.workerModuleData && (Lc = !0, p = mo({
                workerId: i,
                name: "<" + d + "> function dependency: " + p.name,
                init: `function(){return (
` + Pl(p) + `
)}`
            }), Lc = !1), p && p.workerModuleData && (p = p.workerModuleData), p;
        });
        function h() {
            for(var p = [], v = arguments.length; v--;)p[v] = arguments[v];
            if (!Bg()) return o.apply(void 0, p);
            if (!c) {
                c = Lp(i, "registerModule", h.workerModuleData);
                var y = function() {
                    c = null, ss[i].delete(y);
                };
                (ss[i] || (ss[i] = new Set)).add(y);
            }
            return c.then(function(b) {
                var S = b.isCallable;
                if (S) return Lp(i, "callModule", {
                    id: u,
                    args: p
                });
                throw new Error("Worker module function was called but `init` did not return a callable function");
            });
        }
        return h.workerModuleData = {
            isWorkerModule: !0,
            id: u,
            name: d,
            dependencies: e,
            init: Pl(a),
            getTransferables: s && Pl(s)
        }, h.onMainThread = o, h;
    }
    function qS(r) {
        ss[r] && ss[r].forEach(function(e) {
            e();
        }), os[r] && (os[r].terminate(), delete os[r]);
    }
    function Pl(r) {
        var e = r.toString();
        return !/^function/.test(e) && /^\w+\s*\(/.test(e) && (e = "function " + e), e;
    }
    function ZS(r) {
        var e = os[r];
        if (!e) {
            var a = Pl(WS);
            e = os[r] = new Worker(URL.createObjectURL(new Blob([
                "/** Worker Module Bootstrap: " + r.replace(/\*/g, "") + ` **/

;(` + a + ")()"
            ], {
                type: "application/javascript"
            }))), e.onmessage = function(s) {
                var i = s.data, o = i.messageId, u = pf[o];
                if (!u) throw new Error("WorkerModule response with empty or unknown messageId");
                delete pf[o], u(i);
            };
        }
        return e;
    }
    function Lp(r, e, a) {
        return new Promise(function(s, i) {
            var o = ++YS;
            pf[o] = function(u) {
                u.success ? s(u.result) : i(new Error("Error in worker " + e + " call: " + u.error));
            }, ZS(r).postMessage({
                messageId: o,
                action: e,
                data: a
            });
        });
    }
    function Gg() {
        var r = (function(e) {
            function a(te, q, O, H, X, Z, $, oe) {
                var ce = 1 - $;
                oe.x = ce * ce * te + 2 * ce * $ * O + $ * $ * X, oe.y = ce * ce * q + 2 * ce * $ * H + $ * $ * Z;
            }
            function s(te, q, O, H, X, Z, $, oe, ce, fe) {
                var Pe = 1 - ce;
                fe.x = Pe * Pe * Pe * te + 3 * Pe * Pe * ce * O + 3 * Pe * ce * ce * X + ce * ce * ce * $, fe.y = Pe * Pe * Pe * q + 3 * Pe * Pe * ce * H + 3 * Pe * ce * ce * Z + ce * ce * ce * oe;
            }
            function i(te, q) {
                for(var O = /([MLQCZ])([^MLQCZ]*)/g, H, X, Z, $, oe; H = O.exec(te);){
                    var ce = H[2].replace(/^\s*|\s*$/g, "").split(/[,\s]+/).map(function(fe) {
                        return parseFloat(fe);
                    });
                    switch(H[1]){
                        case "M":
                            $ = X = ce[0], oe = Z = ce[1];
                            break;
                        case "L":
                            (ce[0] !== $ || ce[1] !== oe) && q("L", $, oe, $ = ce[0], oe = ce[1]);
                            break;
                        case "Q":
                            {
                                q("Q", $, oe, $ = ce[2], oe = ce[3], ce[0], ce[1]);
                                break;
                            }
                        case "C":
                            {
                                q("C", $, oe, $ = ce[4], oe = ce[5], ce[0], ce[1], ce[2], ce[3]);
                                break;
                            }
                        case "Z":
                            ($ !== X || oe !== Z) && q("L", $, oe, X, Z);
                            break;
                    }
                }
            }
            function o(te, q, O) {
                O === void 0 && (O = 16);
                var H = {
                    x: 0,
                    y: 0
                };
                i(te, function(X, Z, $, oe, ce, fe, Pe, Ie, he) {
                    switch(X){
                        case "L":
                            q(Z, $, oe, ce);
                            break;
                        case "Q":
                            {
                                for(var pe = Z, Ve = $, Xe = 1; Xe < O; Xe++)a(Z, $, fe, Pe, oe, ce, Xe / (O - 1), H), q(pe, Ve, H.x, H.y), pe = H.x, Ve = H.y;
                                break;
                            }
                        case "C":
                            {
                                for(var Ae = Z, ze = $, Ue = 1; Ue < O; Ue++)s(Z, $, fe, Pe, Ie, he, oe, ce, Ue / (O - 1), H), q(Ae, ze, H.x, H.y), Ae = H.x, ze = H.y;
                                break;
                            }
                    }
                });
            }
            var u = "precision highp float;attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}", d = "precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){gl_FragColor=texture2D(tex,vUV);}", c = new WeakMap, h = {
                premultipliedAlpha: !1,
                preserveDrawingBuffer: !0,
                antialias: !1,
                depth: !1
            };
            function p(te, q) {
                var O = te.getContext ? te.getContext("webgl", h) : te, H = c.get(O);
                if (!H) {
                    let Pe = function(Ae) {
                        var ze = Z[Ae];
                        if (!ze && (ze = Z[Ae] = O.getExtension(Ae), !ze)) throw new Error(Ae + " not supported");
                        return ze;
                    }, Ie = function(Ae, ze) {
                        var Ue = O.createShader(ze);
                        return O.shaderSource(Ue, Ae), O.compileShader(Ue), Ue;
                    }, he = function(Ae, ze, Ue, be) {
                        if (!$[Ae]) {
                            var Ne = {}, Le = {}, me = O.createProgram();
                            O.attachShader(me, Ie(ze, O.VERTEX_SHADER)), O.attachShader(me, Ie(Ue, O.FRAGMENT_SHADER)), O.linkProgram(me), $[Ae] = {
                                program: me,
                                transaction: function(Se) {
                                    O.useProgram(me), Se({
                                        setUniform: function(Fe, vt) {
                                            for(var Oe = [], Ge = arguments.length - 2; Ge-- > 0;)Oe[Ge] = arguments[Ge + 2];
                                            var Be = Le[vt] || (Le[vt] = O.getUniformLocation(me, vt));
                                            O["uniform" + Fe].apply(O, [
                                                Be
                                            ].concat(Oe));
                                        },
                                        setAttribute: function(Fe, vt, Oe, Ge, Be) {
                                            var et = Ne[Fe];
                                            et || (et = Ne[Fe] = {
                                                buf: O.createBuffer(),
                                                loc: O.getAttribLocation(me, Fe),
                                                data: null
                                            }), O.bindBuffer(O.ARRAY_BUFFER, et.buf), O.vertexAttribPointer(et.loc, vt, O.FLOAT, !1, 0, 0), O.enableVertexAttribArray(et.loc), X ? O.vertexAttribDivisor(et.loc, Ge) : Pe("ANGLE_instanced_arrays").vertexAttribDivisorANGLE(et.loc, Ge), Be !== et.data && (O.bufferData(O.ARRAY_BUFFER, Be, Oe), et.data = Be);
                                        }
                                    });
                                }
                            };
                        }
                        $[Ae].transaction(be);
                    }, pe = function(Ae, ze) {
                        ce++;
                        try {
                            O.activeTexture(O.TEXTURE0 + ce);
                            var Ue = oe[Ae];
                            Ue || (Ue = oe[Ae] = O.createTexture(), O.bindTexture(O.TEXTURE_2D, Ue), O.texParameteri(O.TEXTURE_2D, O.TEXTURE_MIN_FILTER, O.NEAREST), O.texParameteri(O.TEXTURE_2D, O.TEXTURE_MAG_FILTER, O.NEAREST)), O.bindTexture(O.TEXTURE_2D, Ue), ze(Ue, ce);
                        } finally{
                            ce--;
                        }
                    }, Ve = function(Ae, ze, Ue) {
                        var be = O.createFramebuffer();
                        fe.push(be), O.bindFramebuffer(O.FRAMEBUFFER, be), O.activeTexture(O.TEXTURE0 + ze), O.bindTexture(O.TEXTURE_2D, Ae), O.framebufferTexture2D(O.FRAMEBUFFER, O.COLOR_ATTACHMENT0, O.TEXTURE_2D, Ae, 0);
                        try {
                            Ue(be);
                        } finally{
                            O.deleteFramebuffer(be), O.bindFramebuffer(O.FRAMEBUFFER, fe[--fe.length - 1] || null);
                        }
                    }, Xe = function() {
                        Z = {}, $ = {}, oe = {}, ce = -1, fe.length = 0;
                    };
                    var X = typeof WebGL2RenderingContext < "u" && O instanceof WebGL2RenderingContext, Z = {}, $ = {}, oe = {}, ce = -1, fe = [];
                    O.canvas.addEventListener("webglcontextlost", function(Ae) {
                        Xe(), Ae.preventDefault();
                    }, !1), c.set(O, H = {
                        gl: O,
                        isWebGL2: X,
                        getExtension: Pe,
                        withProgram: he,
                        withTexture: pe,
                        withTextureFramebuffer: Ve,
                        handleContextLoss: Xe
                    });
                }
                q(H);
            }
            function v(te, q, O, H, X, Z, $, oe) {
                $ === void 0 && ($ = 15), oe === void 0 && (oe = null), p(te, function(ce) {
                    var fe = ce.gl, Pe = ce.withProgram, Ie = ce.withTexture;
                    Ie("copy", function(he, pe) {
                        fe.texImage2D(fe.TEXTURE_2D, 0, fe.RGBA, X, Z, 0, fe.RGBA, fe.UNSIGNED_BYTE, q), Pe("copy", u, d, function(Ve) {
                            var Xe = Ve.setUniform, Ae = Ve.setAttribute;
                            Ae("aUV", 2, fe.STATIC_DRAW, 0, new Float32Array([
                                0,
                                0,
                                2,
                                0,
                                0,
                                2
                            ])), Xe("1i", "image", pe), fe.bindFramebuffer(fe.FRAMEBUFFER, oe || null), fe.disable(fe.BLEND), fe.colorMask($ & 8, $ & 4, $ & 2, $ & 1), fe.viewport(O, H, X, Z), fe.scissor(O, H, X, Z), fe.drawArrays(fe.TRIANGLES, 0, 3);
                        });
                    });
                });
            }
            function y(te, q, O) {
                var H = te.width, X = te.height;
                p(te, function(Z) {
                    var $ = Z.gl, oe = new Uint8Array(H * X * 4);
                    $.readPixels(0, 0, H, X, $.RGBA, $.UNSIGNED_BYTE, oe), te.width = q, te.height = O, v($, oe, 0, 0, H, X);
                });
            }
            var b = Object.freeze({
                __proto__: null,
                withWebGLContext: p,
                renderImageData: v,
                resizeWebGLCanvasWithoutClearing: y
            });
            function S(te, q, O, H, X, Z) {
                Z === void 0 && (Z = 1);
                var $ = new Uint8Array(te * q), oe = H[2] - H[0], ce = H[3] - H[1], fe = [];
                o(O, function(Ae, ze, Ue, be) {
                    fe.push({
                        x1: Ae,
                        y1: ze,
                        x2: Ue,
                        y2: be,
                        minX: Math.min(Ae, Ue),
                        minY: Math.min(ze, be),
                        maxX: Math.max(Ae, Ue),
                        maxY: Math.max(ze, be)
                    });
                }), fe.sort(function(Ae, ze) {
                    return Ae.maxX - ze.maxX;
                });
                for(var Pe = 0; Pe < te; Pe++)for(var Ie = 0; Ie < q; Ie++){
                    var he = Ve(H[0] + oe * (Pe + .5) / te, H[1] + ce * (Ie + .5) / q), pe = Math.pow(1 - Math.abs(he) / X, Z) / 2;
                    he < 0 && (pe = 1 - pe), pe = Math.max(0, Math.min(255, Math.round(pe * 255))), $[Ie * te + Pe] = pe;
                }
                return $;
                function Ve(Ae, ze) {
                    for(var Ue = 1 / 0, be = 1 / 0, Ne = fe.length; Ne--;){
                        var Le = fe[Ne];
                        if (Le.maxX + be <= Ae) break;
                        if (Ae + be > Le.minX && ze - be < Le.maxY && ze + be > Le.minY) {
                            var me = k(Ae, ze, Le.x1, Le.y1, Le.x2, Le.y2);
                            me < Ue && (Ue = me, be = Math.sqrt(Ue));
                        }
                    }
                    return Xe(Ae, ze) && (be = -be), be;
                }
                function Xe(Ae, ze) {
                    for(var Ue = 0, be = fe.length; be--;){
                        var Ne = fe[be];
                        if (Ne.maxX <= Ae) break;
                        var Le = Ne.y1 > ze != Ne.y2 > ze && Ae < (Ne.x2 - Ne.x1) * (ze - Ne.y1) / (Ne.y2 - Ne.y1) + Ne.x1;
                        Le && (Ue += Ne.y1 < Ne.y2 ? 1 : -1);
                    }
                    return Ue !== 0;
                }
            }
            function _(te, q, O, H, X, Z, $, oe, ce, fe) {
                Z === void 0 && (Z = 1), oe === void 0 && (oe = 0), ce === void 0 && (ce = 0), fe === void 0 && (fe = 0), x(te, q, O, H, X, Z, $, null, oe, ce, fe);
            }
            function x(te, q, O, H, X, Z, $, oe, ce, fe, Pe) {
                Z === void 0 && (Z = 1), ce === void 0 && (ce = 0), fe === void 0 && (fe = 0), Pe === void 0 && (Pe = 0);
                for(var Ie = S(te, q, O, H, X, Z), he = new Uint8Array(Ie.length * 4), pe = 0; pe < Ie.length; pe++)he[pe * 4 + Pe] = Ie[pe];
                v($, he, ce, fe, te, q, 1 << 3 - Pe, oe);
            }
            function k(te, q, O, H, X, Z) {
                var $ = X - O, oe = Z - H, ce = $ * $ + oe * oe, fe = ce ? Math.max(0, Math.min(1, ((te - O) * $ + (q - H) * oe) / ce)) : 0, Pe = te - (O + fe * $), Ie = q - (H + fe * oe);
                return Pe * Pe + Ie * Ie;
            }
            var T = Object.freeze({
                __proto__: null,
                generate: S,
                generateIntoCanvas: _,
                generateIntoFramebuffer: x
            }), A = "precision highp float;uniform vec4 uGlyphBounds;attribute vec2 aUV;attribute vec4 aLineSegment;varying vec4 vLineSegment;varying vec2 vGlyphXY;void main(){vLineSegment=aLineSegment;vGlyphXY=mix(uGlyphBounds.xy,uGlyphBounds.zw,aUV);gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}", U = "precision highp float;uniform vec4 uGlyphBounds;uniform float uMaxDistance;uniform float uExponent;varying vec4 vLineSegment;varying vec2 vGlyphXY;float absDistToSegment(vec2 point,vec2 lineA,vec2 lineB){vec2 lineDir=lineB-lineA;float lenSq=dot(lineDir,lineDir);float t=lenSq==0.0 ? 0.0 : clamp(dot(point-lineA,lineDir)/lenSq,0.0,1.0);vec2 linePt=lineA+t*lineDir;return distance(point,linePt);}void main(){vec4 seg=vLineSegment;vec2 p=vGlyphXY;float dist=absDistToSegment(p,seg.xy,seg.zw);float val=pow(1.0-clamp(dist/uMaxDistance,0.0,1.0),uExponent)*0.5;bool crossing=(seg.y>p.y!=seg.w>p.y)&&(p.x<(seg.z-seg.x)*(p.y-seg.y)/(seg.w-seg.y)+seg.x);bool crossingUp=crossing&&vLineSegment.y<vLineSegment.w;gl_FragColor=vec4(crossingUp ? 1.0/255.0 : 0.0,crossing&&!crossingUp ? 1.0/255.0 : 0.0,0.0,val);}", D = "precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){vec4 color=texture2D(tex,vUV);bool inside=color.r!=color.g;float val=inside ? 1.0-color.a : color.a;gl_FragColor=vec4(val);}", R = new Float32Array([
                0,
                0,
                2,
                0,
                0,
                2
            ]), N = null, P = !1, I = {}, F = new WeakMap;
            function Y(te) {
                if (!P && !K(te)) throw new Error("WebGL generation not supported");
            }
            function L(te, q, O, H, X, Z, $) {
                if (Z === void 0 && (Z = 1), $ === void 0 && ($ = null), !$ && ($ = N, !$)) {
                    var oe = typeof OffscreenCanvas == "function" ? new OffscreenCanvas(1, 1) : typeof document < "u" ? document.createElement("canvas") : null;
                    if (!oe) throw new Error("OffscreenCanvas or DOM canvas not supported");
                    $ = N = oe.getContext("webgl", {
                        depth: !1
                    });
                }
                Y($);
                var ce = new Uint8Array(te * q * 4);
                p($, function(he) {
                    var pe = he.gl, Ve = he.withTexture, Xe = he.withTextureFramebuffer;
                    Ve("readable", function(Ae, ze) {
                        pe.texImage2D(pe.TEXTURE_2D, 0, pe.RGBA, te, q, 0, pe.RGBA, pe.UNSIGNED_BYTE, null), Xe(Ae, ze, function(Ue) {
                            B(te, q, O, H, X, Z, pe, Ue, 0, 0, 0), pe.readPixels(0, 0, te, q, pe.RGBA, pe.UNSIGNED_BYTE, ce);
                        });
                    });
                });
                for(var fe = new Uint8Array(te * q), Pe = 0, Ie = 0; Pe < ce.length; Pe += 4)fe[Ie++] = ce[Pe];
                return fe;
            }
            function G(te, q, O, H, X, Z, $, oe, ce, fe) {
                Z === void 0 && (Z = 1), oe === void 0 && (oe = 0), ce === void 0 && (ce = 0), fe === void 0 && (fe = 0), B(te, q, O, H, X, Z, $, null, oe, ce, fe);
            }
            function B(te, q, O, H, X, Z, $, oe, ce, fe, Pe) {
                Z === void 0 && (Z = 1), ce === void 0 && (ce = 0), fe === void 0 && (fe = 0), Pe === void 0 && (Pe = 0), Y($);
                var Ie = [];
                o(O, function(he, pe, Ve, Xe) {
                    Ie.push(he, pe, Ve, Xe);
                }), Ie = new Float32Array(Ie), p($, function(he) {
                    var pe = he.gl, Ve = he.isWebGL2, Xe = he.getExtension, Ae = he.withProgram, ze = he.withTexture, Ue = he.withTextureFramebuffer, be = he.handleContextLoss;
                    if (ze("rawDistances", function(Ne, Le) {
                        (te !== Ne._lastWidth || q !== Ne._lastHeight) && pe.texImage2D(pe.TEXTURE_2D, 0, pe.RGBA, Ne._lastWidth = te, Ne._lastHeight = q, 0, pe.RGBA, pe.UNSIGNED_BYTE, null), Ae("main", A, U, function(me) {
                            var Ke = me.setAttribute, Se = me.setUniform, je = !Ve && Xe("ANGLE_instanced_arrays"), Fe = !Ve && Xe("EXT_blend_minmax");
                            Ke("aUV", 2, pe.STATIC_DRAW, 0, R), Ke("aLineSegment", 4, pe.DYNAMIC_DRAW, 1, Ie), Se.apply(void 0, [
                                "4f",
                                "uGlyphBounds"
                            ].concat(H)), Se("1f", "uMaxDistance", X), Se("1f", "uExponent", Z), Ue(Ne, Le, function(vt) {
                                pe.enable(pe.BLEND), pe.colorMask(!0, !0, !0, !0), pe.viewport(0, 0, te, q), pe.scissor(0, 0, te, q), pe.blendFunc(pe.ONE, pe.ONE), pe.blendEquationSeparate(pe.FUNC_ADD, Ve ? pe.MAX : Fe.MAX_EXT), pe.clear(pe.COLOR_BUFFER_BIT), Ve ? pe.drawArraysInstanced(pe.TRIANGLES, 0, 3, Ie.length / 4) : je.drawArraysInstancedANGLE(pe.TRIANGLES, 0, 3, Ie.length / 4);
                            });
                        }), Ae("post", u, D, function(me) {
                            me.setAttribute("aUV", 2, pe.STATIC_DRAW, 0, R), me.setUniform("1i", "tex", Le), pe.bindFramebuffer(pe.FRAMEBUFFER, oe), pe.disable(pe.BLEND), pe.colorMask(Pe === 0, Pe === 1, Pe === 2, Pe === 3), pe.viewport(ce, fe, te, q), pe.scissor(ce, fe, te, q), pe.drawArrays(pe.TRIANGLES, 0, 3);
                        });
                    }), pe.isContextLost()) throw be(), new Error("webgl context lost");
                });
            }
            function K(te) {
                var q = !te || te === N ? I : te.canvas || te, O = F.get(q);
                if (O === void 0) {
                    P = !0;
                    var H = null;
                    try {
                        var X = [
                            97,
                            106,
                            97,
                            61,
                            99,
                            137,
                            118,
                            80,
                            80,
                            118,
                            137,
                            99,
                            61,
                            97,
                            106,
                            97
                        ], Z = L(4, 4, "M8,8L16,8L24,24L16,24Z", [
                            0,
                            0,
                            32,
                            32
                        ], 24, 1, te);
                        O = Z && X.length === Z.length && Z.every(function($, oe) {
                            return $ === X[oe];
                        }), O || (H = "bad trial run results", console.info(X, Z));
                    } catch ($) {
                        O = !1, H = $.message;
                    }
                    H && console.warn("WebGL SDF generation not supported:", H), P = !1, F.set(q, O);
                }
                return O;
            }
            var ee = Object.freeze({
                __proto__: null,
                generate: L,
                generateIntoCanvas: G,
                generateIntoFramebuffer: B,
                isSupported: K
            });
            function ye(te, q, O, H, X, Z) {
                X === void 0 && (X = Math.max(H[2] - H[0], H[3] - H[1]) / 2), Z === void 0 && (Z = 1);
                try {
                    return L.apply(ee, arguments);
                } catch ($) {
                    return console.info("WebGL SDF generation failed, falling back to JS", $), S.apply(T, arguments);
                }
            }
            function xe(te, q, O, H, X, Z, $, oe, ce, fe) {
                X === void 0 && (X = Math.max(H[2] - H[0], H[3] - H[1]) / 2), Z === void 0 && (Z = 1), oe === void 0 && (oe = 0), ce === void 0 && (ce = 0), fe === void 0 && (fe = 0);
                try {
                    return G.apply(ee, arguments);
                } catch (Pe) {
                    return console.info("WebGL SDF generation failed, falling back to JS", Pe), _.apply(T, arguments);
                }
            }
            return e.forEachPathCommand = i, e.generate = ye, e.generateIntoCanvas = xe, e.javascript = T, e.pathToLineSegments = o, e.webgl = ee, e.webglUtils = b, Object.defineProperty(e, "__esModule", {
                value: !0
            }), e;
        })({});
        return r;
    }
    function QS() {
        var r = (function(e) {
            var a = {
                R: "13k,1a,2,3,3,2+1j,ch+16,a+1,5+2,2+n,5,a,4,6+16,4+3,h+1b,4mo,179q,2+9,2+11,2i9+7y,2+68,4,3+4,5+13,4+3,2+4k,3+29,8+cf,1t+7z,w+17,3+3m,1t+3z,16o1+5r,8+30,8+mc,29+1r,29+4v,75+73",
                EN: "1c+9,3d+1,6,187+9,513,4+5,7+9,sf+j,175h+9,qw+q,161f+1d,4xt+a,25i+9",
                ES: "17,2,6dp+1,f+1,av,16vr,mx+1,4o,2",
                ET: "z+2,3h+3,b+1,ym,3e+1,2o,p4+1,8,6u,7c,g6,1wc,1n9+4,30+1b,2n,6d,qhx+1,h0m,a+1,49+2,63+1,4+1,6bb+3,12jj",
                AN: "16o+5,2j+9,2+1,35,ed,1ff2+9,87+u",
                CS: "18,2+1,b,2u,12k,55v,l,17v0,2,3,53,2+1,b",
                B: "a,3,f+2,2v,690",
                S: "9,2,k",
                WS: "c,k,4f4,1vk+a,u,1j,335",
                ON: "x+1,4+4,h+5,r+5,r+3,z,5+3,2+1,2+1,5,2+2,3+4,o,w,ci+1,8+d,3+d,6+8,2+g,39+1,9,6+1,2,33,b8,3+1,3c+1,7+1,5r,b,7h+3,sa+5,2,3i+6,jg+3,ur+9,2v,ij+1,9g+9,7+a,8m,4+1,49+x,14u,2+2,c+2,e+2,e+2,e+1,i+n,e+e,2+p,u+2,e+2,36+1,2+3,2+1,b,2+2,6+5,2,2,2,h+1,5+4,6+3,3+f,16+2,5+3l,3+81,1y+p,2+40,q+a,m+13,2r+ch,2+9e,75+hf,3+v,2+2w,6e+5,f+6,75+2a,1a+p,2+2g,d+5x,r+b,6+3,4+o,g,6+1,6+2,2k+1,4,2j,5h+z,1m+1,1e+f,t+2,1f+e,d+3,4o+3,2s+1,w,535+1r,h3l+1i,93+2,2s,b+1,3l+x,2v,4g+3,21+3,kz+1,g5v+1,5a,j+9,n+v,2,3,2+8,2+1,3+2,2,3,46+1,4+4,h+5,r+5,r+a,3h+2,4+6,b+4,78,1r+24,4+c,4,1hb,ey+6,103+j,16j+c,1ux+7,5+g,fsh,jdq+1t,4,57+2e,p1,1m,1m,1m,1m,4kt+1,7j+17,5+2r,d+e,3+e,2+e,2+10,m+4,w,1n+5,1q,4z+5,4b+rb,9+c,4+c,4+37,d+2g,8+b,l+b,5+1j,9+9,7+13,9+t,3+1,27+3c,2+29,2+3q,d+d,3+4,4+2,6+6,a+o,8+6,a+2,e+6,16+42,2+1i",
                BN: "0+8,6+d,2s+5,2+p,e,4m9,1kt+2,2b+5,5+5,17q9+v,7k,6p+8,6+1,119d+3,440+7,96s+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+75,6p+2rz,1ben+1,1ekf+1,1ekf+1",
                NSM: "lc+33,7o+6,7c+18,2,2+1,2+1,2,21+a,1d+k,h,2u+6,3+5,3+1,2+3,10,v+q,2k+a,1n+8,a,p+3,2+8,2+2,2+4,18+2,3c+e,2+v,1k,2,5+7,5,4+6,b+1,u,1n,5+3,9,l+1,r,3+1,1m,5+1,5+1,3+2,4,v+1,4,c+1,1m,5+4,2+1,5,l+1,n+5,2,1n,3,2+3,9,8+1,c+1,v,1q,d,1f,4,1m+2,6+2,2+3,8+1,c+1,u,1n,g+1,l+1,t+1,1m+1,5+3,9,l+1,u,21,8+2,2,2j,3+6,d+7,2r,3+8,c+5,23+1,s,2,2,1k+d,2+4,2+1,6+a,2+z,a,2v+3,2+5,2+1,3+1,q+1,5+2,h+3,e,3+1,7,g,jk+2,qb+2,u+2,u+1,v+1,1t+1,2+6,9,3+a,a,1a+2,3c+1,z,3b+2,5+1,a,7+2,64+1,3,1n,2+6,2,2,3+7,7+9,3,1d+g,1s+3,1d,2+4,2,6,15+8,d+1,x+3,3+1,2+2,1l,2+1,4,2+2,1n+7,3+1,49+2,2+c,2+6,5,7,4+1,5j+1l,2+4,k1+w,2db+2,3y,2p+v,ff+3,30+1,n9x+3,2+9,x+1,29+1,7l,4,5,q+1,6,48+1,r+h,e,13+7,q+a,1b+2,1d,3+3,3+1,14,1w+5,3+1,3+1,d,9,1c,1g,2+2,3+1,6+1,2,17+1,9,6n,3,5,fn5,ki+f,h+f,r2,6b,46+4,1af+2,2+1,6+3,15+2,5,4m+1,fy+3,as+1,4a+a,4x,1j+e,1l+2,1e+3,3+1,1y+2,11+4,2+7,1r,d+1,1h+8,b+3,3,2o+2,3,2+1,7,4h,4+7,m+1,1m+1,4,12+6,4+4,5g+7,3+2,2,o,2d+5,2,5+1,2+1,6n+3,7+1,2+1,s+1,2e+7,3,2+1,2z,2,3+5,2,2u+2,3+3,2+4,78+8,2+1,75+1,2,5,41+3,3+1,5,x+5,3+1,15+5,3+3,9,a+5,3+2,1b+c,2+1,bb+6,2+5,2d+l,3+6,2+1,2+1,3f+5,4,2+1,2+6,2,21+1,4,2,9o+1,f0c+4,1o+6,t5,1s+3,2a,f5l+1,43t+2,i+7,3+6,v+3,45+2,1j0+1i,5+1d,9,f,n+4,2+e,11t+6,2+g,3+6,2+1,2+4,7a+6,c6+3,15t+6,32+6,gzhy+6n",
                AL: "16w,3,2,e+1b,z+2,2+2s,g+1,8+1,b+m,2+t,s+2i,c+e,4h+f,1d+1e,1bwe+dp,3+3z,x+c,2+1,35+3y,2rm+z,5+7,b+5,dt+l,c+u,17nl+27,1t+27,4x+6n,3+d",
                LRO: "6ct",
                RLO: "6cu",
                LRE: "6cq",
                RLE: "6cr",
                PDF: "6cs",
                LRI: "6ee",
                RLI: "6ef",
                FSI: "6eg",
                PDI: "6eh"
            }, s = {}, i = {};
            s.L = 1, i[1] = "L", Object.keys(a).forEach(function(be, Ne) {
                s[be] = 1 << Ne + 1, i[s[be]] = be;
            }), Object.freeze(s);
            var o = s.LRI | s.RLI | s.FSI, u = s.L | s.R | s.AL, d = s.B | s.S | s.WS | s.ON | s.FSI | s.LRI | s.RLI | s.PDI, c = s.BN | s.RLE | s.LRE | s.RLO | s.LRO | s.PDF, h = s.S | s.WS | s.B | o | s.PDI | c, p = null;
            function v() {
                if (!p) {
                    p = new Map;
                    var be = function(Le) {
                        if (a.hasOwnProperty(Le)) {
                            var me = 0;
                            a[Le].split(",").forEach(function(Ke) {
                                var Se = Ke.split("+"), je = Se[0], Fe = Se[1];
                                je = parseInt(je, 36), Fe = Fe ? parseInt(Fe, 36) : 0, p.set(me += je, s[Le]);
                                for(var vt = 0; vt < Fe; vt++)p.set(++me, s[Le]);
                            });
                        }
                    };
                    for(var Ne in a)be(Ne);
                }
            }
            function y(be) {
                return v(), p.get(be.codePointAt(0)) || s.L;
            }
            function b(be) {
                return i[y(be)];
            }
            var S = {
                pairs: "14>1,1e>2,u>2,2wt>1,1>1,1ge>1,1wp>1,1j>1,f>1,hm>1,1>1,u>1,u6>1,1>1,+5,28>1,w>1,1>1,+3,b8>1,1>1,+3,1>3,-1>-1,3>1,1>1,+2,1s>1,1>1,x>1,th>1,1>1,+2,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,4q>1,1e>2,u>2,2>1,+1",
                canonical: "6f1>-6dx,6dy>-6dx,6ec>-6ed,6ee>-6ed,6ww>2jj,-2ji>2jj,14r4>-1e7l,1e7m>-1e7l,1e7m>-1e5c,1e5d>-1e5b,1e5c>-14qx,14qy>-14qx,14vn>-1ecg,1ech>-1ecg,1edu>-1ecg,1eci>-1ecg,1eda>-1ecg,1eci>-1ecg,1eci>-168q,168r>-168q,168s>-14ye,14yf>-14ye"
            };
            function _(be, Ne) {
                var Le = 36, me = 0, Ke = new Map, Se = Ne && new Map, je;
                return be.split(",").forEach(function Fe(vt) {
                    if (vt.indexOf("+") !== -1) for(var Oe = +vt; Oe--;)Fe(je);
                    else {
                        je = vt;
                        var Ge = vt.split(">"), Be = Ge[0], et = Ge[1];
                        Be = String.fromCodePoint(me += parseInt(Be, Le)), et = String.fromCodePoint(me += parseInt(et, Le)), Ke.set(Be, et), Ne && Se.set(et, Be);
                    }
                }), {
                    map: Ke,
                    reverseMap: Se
                };
            }
            var x, k, T;
            function A() {
                if (!x) {
                    var be = _(S.pairs, !0), Ne = be.map, Le = be.reverseMap;
                    x = Ne, k = Le, T = _(S.canonical, !1).map;
                }
            }
            function U(be) {
                return A(), x.get(be) || null;
            }
            function D(be) {
                return A(), k.get(be) || null;
            }
            function R(be) {
                return A(), T.get(be) || null;
            }
            var N = s.L, P = s.R, I = s.EN, F = s.ES, Y = s.ET, L = s.AN, G = s.CS, B = s.B, K = s.S, ee = s.ON, ye = s.BN, xe = s.NSM, te = s.AL, q = s.LRO, O = s.RLO, H = s.LRE, X = s.RLE, Z = s.PDF, $ = s.LRI, oe = s.RLI, ce = s.FSI, fe = s.PDI;
            function Pe(be, Ne) {
                for(var Le = 125, me = new Uint32Array(be.length), Ke = 0; Ke < be.length; Ke++)me[Ke] = y(be[Ke]);
                var Se = new Map;
                function je(Tn, or) {
                    var Nn = me[Tn];
                    me[Tn] = or, Se.set(Nn, Se.get(Nn) - 1), Nn & d && Se.set(d, Se.get(d) - 1), Se.set(or, (Se.get(or) || 0) + 1), or & d && Se.set(d, (Se.get(d) || 0) + 1);
                }
                for(var Fe = new Uint8Array(be.length), vt = new Map, Oe = [], Ge = null, Be = 0; Be < be.length; Be++)Ge || Oe.push(Ge = {
                    start: Be,
                    end: be.length - 1,
                    level: Ne === "rtl" ? 1 : Ne === "ltr" ? 0 : xa(Be, !1)
                }), me[Be] & B && (Ge.end = Be, Ge = null);
                for(var et = X | H | O | q | o | fe | Z | B, kt = function(Tn) {
                    return Tn + (Tn & 1 ? 1 : 2);
                }, Nt = function(Tn) {
                    return Tn + (Tn & 1 ? 2 : 1);
                }, st = 0; st < Oe.length; st++){
                    Ge = Oe[st];
                    var Qe = [
                        {
                            _level: Ge.level,
                            _override: 0,
                            _isolate: 0
                        }
                    ], Ze = void 0, W = 0, de = 0, Re = 0;
                    Se.clear();
                    for(var qe = Ge.start; qe <= Ge.end; qe++){
                        var ue = me[qe];
                        if (Ze = Qe[Qe.length - 1], Se.set(ue, (Se.get(ue) || 0) + 1), ue & d && Se.set(d, (Se.get(d) || 0) + 1), ue & et) if (ue & (X | H)) {
                            Fe[qe] = Ze._level;
                            var ot = (ue === X ? Nt : kt)(Ze._level);
                            ot <= Le && !W && !de ? Qe.push({
                                _level: ot,
                                _override: 0,
                                _isolate: 0
                            }) : W || de++;
                        } else if (ue & (O | q)) {
                            Fe[qe] = Ze._level;
                            var Kt = (ue === O ? Nt : kt)(Ze._level);
                            Kt <= Le && !W && !de ? Qe.push({
                                _level: Kt,
                                _override: ue & O ? P : N,
                                _isolate: 0
                            }) : W || de++;
                        } else if (ue & o) {
                            ue & ce && (ue = xa(qe + 1, !0) === 1 ? oe : $), Fe[qe] = Ze._level, Ze._override && je(qe, Ze._override);
                            var Rt = (ue === oe ? Nt : kt)(Ze._level);
                            Rt <= Le && W === 0 && de === 0 ? (Re++, Qe.push({
                                _level: Rt,
                                _override: 0,
                                _isolate: 1,
                                _isolInitIndex: qe
                            })) : W++;
                        } else if (ue & fe) {
                            if (W > 0) W--;
                            else if (Re > 0) {
                                for(de = 0; !Qe[Qe.length - 1]._isolate;)Qe.pop();
                                var ft = Qe[Qe.length - 1]._isolInitIndex;
                                ft != null && (vt.set(ft, qe), vt.set(qe, ft)), Qe.pop(), Re--;
                            }
                            Ze = Qe[Qe.length - 1], Fe[qe] = Ze._level, Ze._override && je(qe, Ze._override);
                        } else ue & Z ? (W === 0 && (de > 0 ? de-- : !Ze._isolate && Qe.length > 1 && (Qe.pop(), Ze = Qe[Qe.length - 1])), Fe[qe] = Ze._level) : ue & B && (Fe[qe] = Ge.level);
                        else Fe[qe] = Ze._level, Ze._override && ue !== ye && je(qe, Ze._override);
                    }
                    for(var Mt = [], yt = null, $e = Ge.start; $e <= Ge.end; $e++){
                        var Ct = me[$e];
                        if (!(Ct & c)) {
                            var Yt = Fe[$e], Gt = Ct & o, Vt = Ct === fe;
                            yt && Yt === yt._level ? (yt._end = $e, yt._endsWithIsolInit = Gt) : Mt.push(yt = {
                                _start: $e,
                                _end: $e,
                                _level: Yt,
                                _startsWithPDI: Vt,
                                _endsWithIsolInit: Gt
                            });
                        }
                    }
                    for(var Sn = [], Dn = 0; Dn < Mt.length; Dn++){
                        var Un = Mt[Dn];
                        if (!Un._startsWithPDI || Un._startsWithPDI && !vt.has(Un._start)) {
                            for(var gn = [
                                yt = Un
                            ], Mn = void 0; yt && yt._endsWithIsolInit && (Mn = vt.get(yt._end)) != null;)for(var Je = Dn + 1; Je < Mt.length; Je++)if (Mt[Je]._start === Mn) {
                                gn.push(yt = Mt[Je]);
                                break;
                            }
                            for(var sn = [], Kn = 0; Kn < gn.length; Kn++)for(var w = gn[Kn], C = w._start; C <= w._end; C++)sn.push(C);
                            for(var z = Fe[sn[0]], Q = Ge.level, ae = sn[0] - 1; ae >= 0; ae--)if (!(me[ae] & c)) {
                                Q = Fe[ae];
                                break;
                            }
                            var se = sn[sn.length - 1], we = Fe[se], ge = Ge.level;
                            if (!(me[se] & o)) {
                                for(var Me = se + 1; Me <= Ge.end; Me++)if (!(me[Me] & c)) {
                                    ge = Fe[Me];
                                    break;
                                }
                            }
                            Sn.push({
                                _seqIndices: sn,
                                _sosType: Math.max(Q, z) % 2 ? P : N,
                                _eosType: Math.max(ge, we) % 2 ? P : N
                            });
                        }
                    }
                    for(var Ce = 0; Ce < Sn.length; Ce++){
                        var Te = Sn[Ce], re = Te._seqIndices, It = Te._sosType, He = Te._eosType, Ye = Fe[re[0]] & 1 ? P : N;
                        if (Se.get(xe)) for(var it = 0; it < re.length; it++){
                            var at = re[it];
                            if (me[at] & xe) {
                                for(var ht = It, xt = it - 1; xt >= 0; xt--)if (!(me[re[xt]] & c)) {
                                    ht = me[re[xt]];
                                    break;
                                }
                                je(at, ht & (o | fe) ? ee : ht);
                            }
                        }
                        if (Se.get(I)) for(var ut = 0; ut < re.length; ut++){
                            var an = re[ut];
                            if (me[an] & I) for(var Tt = ut - 1; Tt >= -1; Tt--){
                                var On = Tt === -1 ? It : me[re[Tt]];
                                if (On & u) {
                                    On === te && je(an, L);
                                    break;
                                }
                            }
                        }
                        if (Se.get(te)) for(var Dt = 0; Dt < re.length; Dt++){
                            var $t = re[Dt];
                            me[$t] & te && je($t, P);
                        }
                        if (Se.get(F) || Se.get(G)) for(var vn = 1; vn < re.length - 1; vn++){
                            var ir = re[vn];
                            if (me[ir] & (F | G)) {
                                for(var Jt = 0, ct = 0, mt = vn - 1; mt >= 0 && (Jt = me[re[mt]], !!(Jt & c)); mt--);
                                for(var At = vn + 1; At < re.length && (ct = me[re[At]], !!(ct & c)); At++);
                                Jt === ct && (me[ir] === F ? Jt === I : Jt & (I | L)) && je(ir, Jt);
                            }
                        }
                        if (Se.get(I)) for(var dt = 0; dt < re.length; dt++){
                            var yn = re[dt];
                            if (me[yn] & I) {
                                for(var Ln = dt - 1; Ln >= 0 && me[re[Ln]] & (Y | c); Ln--)je(re[Ln], I);
                                for(dt++; dt < re.length && me[re[dt]] & (Y | c | I); dt++)me[re[dt]] !== I && je(re[dt], I);
                            }
                        }
                        if (Se.get(Y) || Se.get(F) || Se.get(G)) for(var jt = 0; jt < re.length; jt++){
                            var zn = re[jt];
                            if (me[zn] & (Y | F | G)) {
                                je(zn, ee);
                                for(var oi = jt - 1; oi >= 0 && me[re[oi]] & c; oi--)je(re[oi], ee);
                                for(var si = jt + 1; si < re.length && me[re[si]] & c; si++)je(re[si], ee);
                            }
                        }
                        if (Se.get(I)) for(var ha = 0, vo = It; ha < re.length; ha++){
                            var yo = re[ha], pa = me[yo];
                            pa & I ? vo === N && je(yo, N) : pa & u && (vo = pa);
                        }
                        if (Se.get(d)) {
                            var li = P | I | L, bo = li | N, ui = [];
                            {
                                for(var Wr = [], ci = 0; ci < re.length; ci++)if (me[re[ci]] & d) {
                                    var fi = be[re[ci]], wo = void 0;
                                    if (U(fi) !== null) if (Wr.length < 63) Wr.push({
                                        char: fi,
                                        seqIndex: ci
                                    });
                                    else break;
                                    else if ((wo = D(fi)) !== null) for(var di = Wr.length - 1; di >= 0; di--){
                                        var Ni = Wr[di].char;
                                        if (Ni === wo || Ni === D(R(fi)) || U(R(Ni)) === fi) {
                                            ui.push([
                                                Wr[di].seqIndex,
                                                ci
                                            ]), Wr.length = di;
                                            break;
                                        }
                                    }
                                }
                                ui.sort(function(Tn, or) {
                                    return Tn[0] - or[0];
                                });
                            }
                            for(var ma = 0; ma < ui.length; ma++){
                                for(var So = ui[ma], ji = So[0], ga = So[1], xo = !1, ar = 0, va = ji + 1; va < ga; va++){
                                    var Vr = re[va];
                                    if (me[Vr] & bo) {
                                        xo = !0;
                                        var _o = me[Vr] & li ? P : N;
                                        if (_o === Ye) {
                                            ar = _o;
                                            break;
                                        }
                                    }
                                }
                                if (xo && !ar) {
                                    ar = It;
                                    for(var hi = ji - 1; hi >= 0; hi--){
                                        var Bi = re[hi];
                                        if (me[Bi] & bo) {
                                            var Eo = me[Bi] & li ? P : N;
                                            Eo !== Ye ? ar = Eo : ar = Ye;
                                            break;
                                        }
                                    }
                                }
                                if (ar) {
                                    if (me[re[ji]] = me[re[ga]] = ar, ar !== Ye) {
                                        for(var Xr = ji + 1; Xr < re.length; Xr++)if (!(me[re[Xr]] & c)) {
                                            y(be[re[Xr]]) & xe && (me[re[Xr]] = ar);
                                            break;
                                        }
                                    }
                                    if (ar !== Ye) {
                                        for(var Gi = ga + 1; Gi < re.length; Gi++)if (!(me[re[Gi]] & c)) {
                                            y(be[re[Gi]]) & xe && (me[re[Gi]] = ar);
                                            break;
                                        }
                                    }
                                }
                            }
                            for(var _r = 0; _r < re.length; _r++)if (me[re[_r]] & d) {
                                for(var Mo = _r, ya = _r, ba = It, pi = _r - 1; pi >= 0; pi--)if (me[re[pi]] & c) Mo = pi;
                                else {
                                    ba = me[re[pi]] & li ? P : N;
                                    break;
                                }
                                for(var wa = He, mi = _r + 1; mi < re.length; mi++)if (me[re[mi]] & (d | c)) ya = mi;
                                else {
                                    wa = me[re[mi]] & li ? P : N;
                                    break;
                                }
                                for(var Sa = Mo; Sa <= ya; Sa++)me[re[Sa]] = ba === wa ? ba : Ye;
                                _r = ya;
                            }
                        }
                    }
                    for(var Cn = Ge.start; Cn <= Ge.end; Cn++){
                        var Es = Fe[Cn], Hi = me[Cn];
                        if (Es & 1 ? Hi & (N | I | L) && Fe[Cn]++ : Hi & P ? Fe[Cn]++ : Hi & (L | I) && (Fe[Cn] += 2), Hi & c && (Fe[Cn] = Cn === 0 ? Ge.level : Fe[Cn - 1]), Cn === Ge.end || y(be[Cn]) & (K | B)) for(var Wi = Cn; Wi >= 0 && y(be[Wi]) & h; Wi--)Fe[Wi] = Ge.level;
                    }
                }
                return {
                    levels: Fe,
                    paragraphs: Oe
                };
                function xa(Tn, or) {
                    for(var Nn = Tn; Nn < be.length; Nn++){
                        var Er = me[Nn];
                        if (Er & (P | te)) return 1;
                        if (Er & (B | N) || or && Er === fe) return 0;
                        if (Er & o) {
                            var gi = Ms(Nn);
                            Nn = gi === -1 ? be.length : gi;
                        }
                    }
                    return 0;
                }
                function Ms(Tn) {
                    for(var or = 1, Nn = Tn + 1; Nn < be.length; Nn++){
                        var Er = me[Nn];
                        if (Er & B) break;
                        if (Er & fe) {
                            if (--or === 0) return Nn;
                        } else Er & o && or++;
                    }
                    return -1;
                }
            }
            var Ie = "14>1,j>2,t>2,u>2,1a>g,2v3>1,1>1,1ge>1,1wd>1,b>1,1j>1,f>1,ai>3,-2>3,+1,8>1k0,-1jq>1y7,-1y6>1hf,-1he>1h6,-1h5>1ha,-1h8>1qi,-1pu>1,6>3u,-3s>7,6>1,1>1,f>1,1>1,+2,3>1,1>1,+13,4>1,1>1,6>1eo,-1ee>1,3>1mg,-1me>1mk,-1mj>1mi,-1mg>1mi,-1md>1,1>1,+2,1>10k,-103>1,1>1,4>1,5>1,1>1,+10,3>1,1>8,-7>8,+1,-6>7,+1,a>1,1>1,u>1,u6>1,1>1,+5,26>1,1>1,2>1,2>2,8>1,7>1,4>1,1>1,+5,b8>1,1>1,+3,1>3,-2>1,2>1,1>1,+2,c>1,3>1,1>1,+2,h>1,3>1,a>1,1>1,2>1,3>1,1>1,d>1,f>1,3>1,1a>1,1>1,6>1,7>1,13>1,k>1,1>1,+19,4>1,1>1,+2,2>1,1>1,+18,m>1,a>1,1>1,lk>1,1>1,4>1,2>1,f>1,3>1,1>1,+3,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,6>1,4j>1,j>2,t>2,u>2,2>1,+1", he;
            function pe() {
                if (!he) {
                    var be = _(Ie, !0), Ne = be.map, Le = be.reverseMap;
                    Le.forEach(function(me, Ke) {
                        Ne.set(Ke, me);
                    }), he = Ne;
                }
            }
            function Ve(be) {
                return pe(), he.get(be) || null;
            }
            function Xe(be, Ne, Le, me) {
                var Ke = be.length;
                Le = Math.max(0, Le == null ? 0 : +Le), me = Math.min(Ke - 1, me == null ? Ke - 1 : +me);
                for(var Se = new Map, je = Le; je <= me; je++)if (Ne[je] & 1) {
                    var Fe = Ve(be[je]);
                    Fe !== null && Se.set(je, Fe);
                }
                return Se;
            }
            function Ae(be, Ne, Le, me) {
                var Ke = be.length;
                Le = Math.max(0, Le == null ? 0 : +Le), me = Math.min(Ke - 1, me == null ? Ke - 1 : +me);
                var Se = [];
                return Ne.paragraphs.forEach(function(je) {
                    var Fe = Math.max(Le, je.start), vt = Math.min(me, je.end);
                    if (Fe < vt) {
                        for(var Oe = Ne.levels.slice(Fe, vt + 1), Ge = vt; Ge >= Fe && y(be[Ge]) & h; Ge--)Oe[Ge] = je.level;
                        for(var Be = je.level, et = 1 / 0, kt = 0; kt < Oe.length; kt++){
                            var Nt = Oe[kt];
                            Nt > Be && (Be = Nt), Nt < et && (et = Nt | 1);
                        }
                        for(var st = Be; st >= et; st--)for(var Qe = 0; Qe < Oe.length; Qe++)if (Oe[Qe] >= st) {
                            for(var Ze = Qe; Qe + 1 < Oe.length && Oe[Qe + 1] >= st;)Qe++;
                            Qe > Ze && Se.push([
                                Ze + Fe,
                                Qe + Fe
                            ]);
                        }
                    }
                }), Se;
            }
            function ze(be, Ne, Le, me) {
                var Ke = Ue(be, Ne, Le, me), Se = [].concat(be);
                return Ke.forEach(function(je, Fe) {
                    Se[Fe] = (Ne.levels[je] & 1 ? Ve(be[je]) : null) || be[je];
                }), Se.join("");
            }
            function Ue(be, Ne, Le, me) {
                for(var Ke = Ae(be, Ne, Le, me), Se = [], je = 0; je < be.length; je++)Se[je] = je;
                return Ke.forEach(function(Fe) {
                    for(var vt = Fe[0], Oe = Fe[1], Ge = Se.slice(vt, Oe + 1), Be = Ge.length; Be--;)Se[Oe - Be] = Ge[Be];
                }), Se;
            }
            return e.closingToOpeningBracket = D, e.getBidiCharType = y, e.getBidiCharTypeName = b, e.getCanonicalBracket = R, e.getEmbeddingLevels = Pe, e.getMirroredCharacter = Ve, e.getMirroredCharactersMap = Xe, e.getReorderSegments = Ae, e.getReorderedIndices = Ue, e.getReorderedString = ze, e.openingToClosingBracket = U, Object.defineProperty(e, "__esModule", {
                value: !0
            }), e;
        })({});
        return r;
    }
    const Hg = /\bvoid\s+main\s*\(\s*\)\s*{/g;
    function mf(r) {
        const e = /^[ \t]*#include +<([\w\d./]+)>/gm;
        function a(s, i) {
            let o = ry[i];
            return o ? mf(o) : s;
        }
        return r.replace(e, a);
    }
    const In = [];
    for(let r = 0; r < 256; r++)In[r] = (r < 16 ? "0" : "") + r.toString(16);
    function KS() {
        const r = Math.random() * 4294967295 | 0, e = Math.random() * 4294967295 | 0, a = Math.random() * 4294967295 | 0, s = Math.random() * 4294967295 | 0;
        return (In[r & 255] + In[r >> 8 & 255] + In[r >> 16 & 255] + In[r >> 24 & 255] + "-" + In[e & 255] + In[e >> 8 & 255] + "-" + In[e >> 16 & 15 | 64] + In[e >> 24 & 255] + "-" + In[a & 63 | 128] + In[a >> 8 & 255] + "-" + In[a >> 16 & 255] + In[a >> 24 & 255] + In[s & 255] + In[s >> 8 & 255] + In[s >> 16 & 255] + In[s >> 24 & 255]).toUpperCase();
    }
    const aa = Object.assign || function() {
        let r = arguments[0];
        for(let e = 1, a = arguments.length; e < a; e++){
            let s = arguments[e];
            if (s) for(let i in s)Object.prototype.hasOwnProperty.call(s, i) && (r[i] = s[i]);
        }
        return r;
    }, $S = Date.now(), zp = new WeakMap, Np = new Map;
    let JS = 1e10;
    function gf(r, e) {
        const a = rx(e);
        let s = zp.get(r);
        if (s || zp.set(r, s = Object.create(null)), s[a]) return new s[a];
        const i = `_onBeforeCompile${a}`, o = function(h, p) {
            r.onBeforeCompile.call(this, h, p);
            const v = this.customProgramCacheKey() + "|" + h.vertexShader + "|" + h.fragmentShader;
            let y = Np[v];
            if (!y) {
                const b = ex(this, h, e, a);
                y = Np[v] = b;
            }
            h.vertexShader = y.vertexShader, h.fragmentShader = y.fragmentShader, aa(h.uniforms, this.uniforms), e.timeUniform && (h.uniforms[e.timeUniform] = {
                get value () {
                    return Date.now() - $S;
                }
            }), this[i] && this[i](h);
        }, u = function() {
            return d(e.chained ? r : r.clone());
        }, d = function(h) {
            const p = Object.create(h, c);
            return Object.defineProperty(p, "baseMaterial", {
                value: r
            }), Object.defineProperty(p, "id", {
                value: JS++
            }), p.uuid = KS(), p.uniforms = aa({}, h.uniforms, e.uniforms), p.defines = aa({}, h.defines, e.defines), p.defines[`TROIKA_DERIVED_MATERIAL_${a}`] = "", p.extensions = aa({}, h.extensions, e.extensions), p._listeners = void 0, p;
        }, c = {
            constructor: {
                value: u
            },
            isDerivedMaterial: {
                value: !0
            },
            type: {
                get: ()=>r.type,
                set: (h)=>{
                    r.type = h;
                }
            },
            isDerivedFrom: {
                writable: !0,
                configurable: !0,
                value: function(h) {
                    const p = this.baseMaterial;
                    return h === p || p.isDerivedMaterial && p.isDerivedFrom(h) || !1;
                }
            },
            customProgramCacheKey: {
                writable: !0,
                configurable: !0,
                value: function() {
                    return r.customProgramCacheKey() + "|" + a;
                }
            },
            onBeforeCompile: {
                get () {
                    return o;
                },
                set (h) {
                    this[i] = h;
                }
            },
            copy: {
                writable: !0,
                configurable: !0,
                value: function(h) {
                    return r.copy.call(this, h), !r.isShaderMaterial && !r.isDerivedMaterial && (aa(this.extensions, h.extensions), aa(this.defines, h.defines), aa(this.uniforms, Km.clone(h.uniforms))), this;
                }
            },
            clone: {
                writable: !0,
                configurable: !0,
                value: function() {
                    const h = new r.constructor;
                    return d(h).copy(this);
                }
            },
            getDepthMaterial: {
                writable: !0,
                configurable: !0,
                value: function() {
                    let h = this._depthMaterial;
                    return h || (h = this._depthMaterial = gf(r.isDerivedMaterial ? r.getDepthMaterial() : new Qm({
                        depthPacking: ny
                    }), e), h.defines.IS_DEPTH_MATERIAL = "", h.uniforms = this.uniforms), h;
                }
            },
            getDistanceMaterial: {
                writable: !0,
                configurable: !0,
                value: function() {
                    let h = this._distanceMaterial;
                    return h || (h = this._distanceMaterial = gf(r.isDerivedMaterial ? r.getDistanceMaterial() : new ty, e), h.defines.IS_DISTANCE_MATERIAL = "", h.uniforms = this.uniforms), h;
                }
            },
            dispose: {
                writable: !0,
                configurable: !0,
                value () {
                    const { _depthMaterial: h, _distanceMaterial: p } = this;
                    h && h.dispose(), p && p.dispose(), r.dispose.call(this);
                }
            }
        };
        return s[a] = u, new u;
    }
    function ex(r, { vertexShader: e, fragmentShader: a }, s, i) {
        let { vertexDefs: o, vertexMainIntro: u, vertexMainOutro: d, vertexTransform: c, fragmentDefs: h, fragmentMainIntro: p, fragmentMainOutro: v, fragmentColorTransform: y, customRewriter: b, timeUniform: S } = s;
        if (o = o || "", u = u || "", d = d || "", h = h || "", p = p || "", v = v || "", (c || b) && (e = mf(e)), (y || b) && (a = a.replace(/^[ \t]*#include <((?:tonemapping|encodings|colorspace|fog|premultiplied_alpha|dithering)_fragment)>/gm, `
//!BEGIN_POST_CHUNK $1
$&
//!END_POST_CHUNK
`), a = mf(a)), b) {
            let _ = b({
                vertexShader: e,
                fragmentShader: a
            });
            e = _.vertexShader, a = _.fragmentShader;
        }
        if (y) {
            let _ = [];
            a = a.replace(/^\/\/!BEGIN_POST_CHUNK[^]+?^\/\/!END_POST_CHUNK/gm, (x)=>(_.push(x), "")), v = `${y}
${_.join(`
`)}
${v}`;
        }
        if (S) {
            const _ = `
uniform float ${S};
`;
            o = _ + o, h = _ + h;
        }
        return c && (e = `vec3 troika_position_${i};
vec3 troika_normal_${i};
vec2 troika_uv_${i};
${e}
`, o = `${o}
void troikaVertexTransform${i}(inout vec3 position, inout vec3 normal, inout vec2 uv) {
  ${c}
}
`, u = `
troika_position_${i} = vec3(position);
troika_normal_${i} = vec3(normal);
troika_uv_${i} = vec2(uv);
troikaVertexTransform${i}(troika_position_${i}, troika_normal_${i}, troika_uv_${i});
${u}
`, e = e.replace(/\b(position|normal|uv)\b/g, (_, x, k, T)=>/\battribute\s+vec[23]\s+$/.test(T.substr(0, k)) ? x : `troika_${x}_${i}`), r.map && r.map.channel > 0 || (e = e.replace(/\bMAP_UV\b/g, `troika_uv_${i}`))), e = jp(e, i, o, u, d), a = jp(a, i, h, p, v), {
            vertexShader: e,
            fragmentShader: a
        };
    }
    function jp(r, e, a, s, i) {
        return (s || i || a) && (r = r.replace(Hg, `
${a}
void troikaOrigMain${e}() {`), r += `
void main() {
  ${s}
  troikaOrigMain${e}();
  ${i}
}`), r;
    }
    function tx(r, e) {
        return r === "uniforms" ? void 0 : typeof e == "function" ? e.toString() : e;
    }
    let nx = 0;
    const Bp = new Map;
    function rx(r) {
        const e = JSON.stringify(r, tx);
        let a = Bp.get(e);
        return a == null && Bp.set(e, a = ++nx), a;
    }
    function ix() {
        return typeof window > "u" && (self.window = self), (function(r) {
            var e = {
                parse: function(i) {
                    var o = e._bin, u = new Uint8Array(i);
                    if (o.readASCII(u, 0, 4) == "ttcf") {
                        var d = 4;
                        o.readUshort(u, d), d += 2, o.readUshort(u, d), d += 2;
                        var c = o.readUint(u, d);
                        d += 4;
                        for(var h = [], p = 0; p < c; p++){
                            var v = o.readUint(u, d);
                            d += 4, h.push(e._readFont(u, v));
                        }
                        return h;
                    }
                    return [
                        e._readFont(u, 0)
                    ];
                },
                _readFont: function(i, o) {
                    var u = e._bin, d = o;
                    u.readFixed(i, o), o += 4;
                    var c = u.readUshort(i, o);
                    o += 2, u.readUshort(i, o), o += 2, u.readUshort(i, o), o += 2, u.readUshort(i, o), o += 2;
                    for(var h = [
                        "cmap",
                        "head",
                        "hhea",
                        "maxp",
                        "hmtx",
                        "name",
                        "OS/2",
                        "post",
                        "loca",
                        "glyf",
                        "kern",
                        "CFF ",
                        "GDEF",
                        "GPOS",
                        "GSUB",
                        "SVG "
                    ], p = {
                        _data: i,
                        _offset: d
                    }, v = {}, y = 0; y < c; y++){
                        var b = u.readASCII(i, o, 4);
                        o += 4, u.readUint(i, o), o += 4;
                        var S = u.readUint(i, o);
                        o += 4;
                        var _ = u.readUint(i, o);
                        o += 4, v[b] = {
                            offset: S,
                            length: _
                        };
                    }
                    for(y = 0; y < h.length; y++){
                        var x = h[y];
                        v[x] && (p[x.trim()] = e[x.trim()].parse(i, v[x].offset, v[x].length, p));
                    }
                    return p;
                },
                _tabOffset: function(i, o, u) {
                    for(var d = e._bin, c = d.readUshort(i, u + 4), h = u + 12, p = 0; p < c; p++){
                        var v = d.readASCII(i, h, 4);
                        h += 4, d.readUint(i, h), h += 4;
                        var y = d.readUint(i, h);
                        if (h += 4, d.readUint(i, h), h += 4, v == o) return y;
                    }
                    return 0;
                }
            };
            e._bin = {
                readFixed: function(i, o) {
                    return (i[o] << 8 | i[o + 1]) + (i[o + 2] << 8 | i[o + 3]) / 65540;
                },
                readF2dot14: function(i, o) {
                    return e._bin.readShort(i, o) / 16384;
                },
                readInt: function(i, o) {
                    return e._bin._view(i).getInt32(o);
                },
                readInt8: function(i, o) {
                    return e._bin._view(i).getInt8(o);
                },
                readShort: function(i, o) {
                    return e._bin._view(i).getInt16(o);
                },
                readUshort: function(i, o) {
                    return e._bin._view(i).getUint16(o);
                },
                readUshorts: function(i, o, u) {
                    for(var d = [], c = 0; c < u; c++)d.push(e._bin.readUshort(i, o + 2 * c));
                    return d;
                },
                readUint: function(i, o) {
                    return e._bin._view(i).getUint32(o);
                },
                readUint64: function(i, o) {
                    return 4294967296 * e._bin.readUint(i, o) + e._bin.readUint(i, o + 4);
                },
                readASCII: function(i, o, u) {
                    for(var d = "", c = 0; c < u; c++)d += String.fromCharCode(i[o + c]);
                    return d;
                },
                readUnicode: function(i, o, u) {
                    for(var d = "", c = 0; c < u; c++){
                        var h = i[o++] << 8 | i[o++];
                        d += String.fromCharCode(h);
                    }
                    return d;
                },
                _tdec: typeof window < "u" && window.TextDecoder ? new window.TextDecoder : null,
                readUTF8: function(i, o, u) {
                    var d = e._bin._tdec;
                    return d && o == 0 && u == i.length ? d.decode(i) : e._bin.readASCII(i, o, u);
                },
                readBytes: function(i, o, u) {
                    for(var d = [], c = 0; c < u; c++)d.push(i[o + c]);
                    return d;
                },
                readASCIIArray: function(i, o, u) {
                    for(var d = [], c = 0; c < u; c++)d.push(String.fromCharCode(i[o + c]));
                    return d;
                },
                _view: function(i) {
                    return i._dataView || (i._dataView = i.buffer ? new DataView(i.buffer, i.byteOffset, i.byteLength) : new DataView(new Uint8Array(i).buffer));
                }
            }, e._lctf = {}, e._lctf.parse = function(i, o, u, d, c) {
                var h = e._bin, p = {}, v = o;
                h.readFixed(i, o), o += 4;
                var y = h.readUshort(i, o);
                o += 2;
                var b = h.readUshort(i, o);
                o += 2;
                var S = h.readUshort(i, o);
                return o += 2, p.scriptList = e._lctf.readScriptList(i, v + y), p.featureList = e._lctf.readFeatureList(i, v + b), p.lookupList = e._lctf.readLookupList(i, v + S, c), p;
            }, e._lctf.readLookupList = function(i, o, u) {
                var d = e._bin, c = o, h = [], p = d.readUshort(i, o);
                o += 2;
                for(var v = 0; v < p; v++){
                    var y = d.readUshort(i, o);
                    o += 2;
                    var b = e._lctf.readLookupTable(i, c + y, u);
                    h.push(b);
                }
                return h;
            }, e._lctf.readLookupTable = function(i, o, u) {
                var d = e._bin, c = o, h = {
                    tabs: []
                };
                h.ltype = d.readUshort(i, o), o += 2, h.flag = d.readUshort(i, o), o += 2;
                var p = d.readUshort(i, o);
                o += 2;
                for(var v = h.ltype, y = 0; y < p; y++){
                    var b = d.readUshort(i, o);
                    o += 2;
                    var S = u(i, v, c + b, h);
                    h.tabs.push(S);
                }
                return h;
            }, e._lctf.numOfOnes = function(i) {
                for(var o = 0, u = 0; u < 32; u++)(i >>> u & 1) != 0 && o++;
                return o;
            }, e._lctf.readClassDef = function(i, o) {
                var u = e._bin, d = [], c = u.readUshort(i, o);
                if (o += 2, c == 1) {
                    var h = u.readUshort(i, o);
                    o += 2;
                    var p = u.readUshort(i, o);
                    o += 2;
                    for(var v = 0; v < p; v++)d.push(h + v), d.push(h + v), d.push(u.readUshort(i, o)), o += 2;
                }
                if (c == 2) {
                    var y = u.readUshort(i, o);
                    for(o += 2, v = 0; v < y; v++)d.push(u.readUshort(i, o)), o += 2, d.push(u.readUshort(i, o)), o += 2, d.push(u.readUshort(i, o)), o += 2;
                }
                return d;
            }, e._lctf.getInterval = function(i, o) {
                for(var u = 0; u < i.length; u += 3){
                    var d = i[u], c = i[u + 1];
                    if (i[u + 2], d <= o && o <= c) return u;
                }
                return -1;
            }, e._lctf.readCoverage = function(i, o) {
                var u = e._bin, d = {};
                d.fmt = u.readUshort(i, o), o += 2;
                var c = u.readUshort(i, o);
                return o += 2, d.fmt == 1 && (d.tab = u.readUshorts(i, o, c)), d.fmt == 2 && (d.tab = u.readUshorts(i, o, 3 * c)), d;
            }, e._lctf.coverageIndex = function(i, o) {
                var u = i.tab;
                if (i.fmt == 1) return u.indexOf(o);
                if (i.fmt == 2) {
                    var d = e._lctf.getInterval(u, o);
                    if (d != -1) return u[d + 2] + (o - u[d]);
                }
                return -1;
            }, e._lctf.readFeatureList = function(i, o) {
                var u = e._bin, d = o, c = [], h = u.readUshort(i, o);
                o += 2;
                for(var p = 0; p < h; p++){
                    var v = u.readASCII(i, o, 4);
                    o += 4;
                    var y = u.readUshort(i, o);
                    o += 2;
                    var b = e._lctf.readFeatureTable(i, d + y);
                    b.tag = v.trim(), c.push(b);
                }
                return c;
            }, e._lctf.readFeatureTable = function(i, o) {
                var u = e._bin, d = o, c = {}, h = u.readUshort(i, o);
                o += 2, h > 0 && (c.featureParams = d + h);
                var p = u.readUshort(i, o);
                o += 2, c.tab = [];
                for(var v = 0; v < p; v++)c.tab.push(u.readUshort(i, o + 2 * v));
                return c;
            }, e._lctf.readScriptList = function(i, o) {
                var u = e._bin, d = o, c = {}, h = u.readUshort(i, o);
                o += 2;
                for(var p = 0; p < h; p++){
                    var v = u.readASCII(i, o, 4);
                    o += 4;
                    var y = u.readUshort(i, o);
                    o += 2, c[v.trim()] = e._lctf.readScriptTable(i, d + y);
                }
                return c;
            }, e._lctf.readScriptTable = function(i, o) {
                var u = e._bin, d = o, c = {}, h = u.readUshort(i, o);
                o += 2, h > 0 && (c.default = e._lctf.readLangSysTable(i, d + h));
                var p = u.readUshort(i, o);
                o += 2;
                for(var v = 0; v < p; v++){
                    var y = u.readASCII(i, o, 4);
                    o += 4;
                    var b = u.readUshort(i, o);
                    o += 2, c[y.trim()] = e._lctf.readLangSysTable(i, d + b);
                }
                return c;
            }, e._lctf.readLangSysTable = function(i, o) {
                var u = e._bin, d = {};
                u.readUshort(i, o), o += 2, d.reqFeature = u.readUshort(i, o), o += 2;
                var c = u.readUshort(i, o);
                return o += 2, d.features = u.readUshorts(i, o, c), d;
            }, e.CFF = {}, e.CFF.parse = function(i, o, u) {
                var d = e._bin;
                (i = new Uint8Array(i.buffer, o, u))[o = 0], i[++o], i[++o], i[++o], o++;
                var c = [];
                o = e.CFF.readIndex(i, o, c);
                for(var h = [], p = 0; p < c.length - 1; p++)h.push(d.readASCII(i, o + c[p], c[p + 1] - c[p]));
                o += c[c.length - 1];
                var v = [];
                o = e.CFF.readIndex(i, o, v);
                var y = [];
                for(p = 0; p < v.length - 1; p++)y.push(e.CFF.readDict(i, o + v[p], o + v[p + 1]));
                o += v[v.length - 1];
                var b = y[0], S = [];
                o = e.CFF.readIndex(i, o, S);
                var _ = [];
                for(p = 0; p < S.length - 1; p++)_.push(d.readASCII(i, o + S[p], S[p + 1] - S[p]));
                if (o += S[S.length - 1], e.CFF.readSubrs(i, o, b), b.CharStrings) {
                    o = b.CharStrings, S = [], o = e.CFF.readIndex(i, o, S);
                    var x = [];
                    for(p = 0; p < S.length - 1; p++)x.push(d.readBytes(i, o + S[p], S[p + 1] - S[p]));
                    b.CharStrings = x;
                }
                if (b.ROS) {
                    o = b.FDArray;
                    var k = [];
                    for(o = e.CFF.readIndex(i, o, k), b.FDArray = [], p = 0; p < k.length - 1; p++){
                        var T = e.CFF.readDict(i, o + k[p], o + k[p + 1]);
                        e.CFF._readFDict(i, T, _), b.FDArray.push(T);
                    }
                    o += k[k.length - 1], o = b.FDSelect, b.FDSelect = [];
                    var A = i[o];
                    if (o++, A != 3) throw A;
                    var U = d.readUshort(i, o);
                    for(o += 2, p = 0; p < U + 1; p++)b.FDSelect.push(d.readUshort(i, o), i[o + 2]), o += 3;
                }
                return b.Encoding && (b.Encoding = e.CFF.readEncoding(i, b.Encoding, b.CharStrings.length)), b.charset && (b.charset = e.CFF.readCharset(i, b.charset, b.CharStrings.length)), e.CFF._readFDict(i, b, _), b;
            }, e.CFF._readFDict = function(i, o, u) {
                var d;
                for(var c in o.Private && (d = o.Private[1], o.Private = e.CFF.readDict(i, d, d + o.Private[0]), o.Private.Subrs && e.CFF.readSubrs(i, d + o.Private.Subrs, o.Private)), o)[
                    "FamilyName",
                    "FontName",
                    "FullName",
                    "Notice",
                    "version",
                    "Copyright"
                ].indexOf(c) != -1 && (o[c] = u[o[c] - 426 + 35]);
            }, e.CFF.readSubrs = function(i, o, u) {
                var d = e._bin, c = [];
                o = e.CFF.readIndex(i, o, c);
                var h, p = c.length;
                h = p < 1240 ? 107 : p < 33900 ? 1131 : 32768, u.Bias = h, u.Subrs = [];
                for(var v = 0; v < c.length - 1; v++)u.Subrs.push(d.readBytes(i, o + c[v], c[v + 1] - c[v]));
            }, e.CFF.tableSE = [
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9,
                10,
                11,
                12,
                13,
                14,
                15,
                16,
                17,
                18,
                19,
                20,
                21,
                22,
                23,
                24,
                25,
                26,
                27,
                28,
                29,
                30,
                31,
                32,
                33,
                34,
                35,
                36,
                37,
                38,
                39,
                40,
                41,
                42,
                43,
                44,
                45,
                46,
                47,
                48,
                49,
                50,
                51,
                52,
                53,
                54,
                55,
                56,
                57,
                58,
                59,
                60,
                61,
                62,
                63,
                64,
                65,
                66,
                67,
                68,
                69,
                70,
                71,
                72,
                73,
                74,
                75,
                76,
                77,
                78,
                79,
                80,
                81,
                82,
                83,
                84,
                85,
                86,
                87,
                88,
                89,
                90,
                91,
                92,
                93,
                94,
                95,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                96,
                97,
                98,
                99,
                100,
                101,
                102,
                103,
                104,
                105,
                106,
                107,
                108,
                109,
                110,
                0,
                111,
                112,
                113,
                114,
                0,
                115,
                116,
                117,
                118,
                119,
                120,
                121,
                122,
                0,
                123,
                0,
                124,
                125,
                126,
                127,
                128,
                129,
                130,
                131,
                0,
                132,
                133,
                0,
                134,
                135,
                136,
                137,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                138,
                0,
                139,
                0,
                0,
                0,
                0,
                140,
                141,
                142,
                143,
                0,
                0,
                0,
                0,
                0,
                144,
                0,
                0,
                0,
                145,
                0,
                0,
                146,
                147,
                148,
                149,
                0,
                0,
                0,
                0
            ], e.CFF.glyphByUnicode = function(i, o) {
                for(var u = 0; u < i.charset.length; u++)if (i.charset[u] == o) return u;
                return -1;
            }, e.CFF.glyphBySE = function(i, o) {
                return o < 0 || o > 255 ? -1 : e.CFF.glyphByUnicode(i, e.CFF.tableSE[o]);
            }, e.CFF.readEncoding = function(i, o, u) {
                e._bin;
                var d = [
                    ".notdef"
                ], c = i[o];
                if (o++, c != 0) throw "error: unknown encoding format: " + c;
                var h = i[o];
                o++;
                for(var p = 0; p < h; p++)d.push(i[o + p]);
                return d;
            }, e.CFF.readCharset = function(i, o, u) {
                var d = e._bin, c = [
                    ".notdef"
                ], h = i[o];
                if (o++, h == 0) for(var p = 0; p < u; p++){
                    var v = d.readUshort(i, o);
                    o += 2, c.push(v);
                }
                else {
                    if (h != 1 && h != 2) throw "error: format: " + h;
                    for(; c.length < u;){
                        v = d.readUshort(i, o), o += 2;
                        var y = 0;
                        for(h == 1 ? (y = i[o], o++) : (y = d.readUshort(i, o), o += 2), p = 0; p <= y; p++)c.push(v), v++;
                    }
                }
                return c;
            }, e.CFF.readIndex = function(i, o, u) {
                var d = e._bin, c = d.readUshort(i, o) + 1, h = i[o += 2];
                if (o++, h == 1) for(var p = 0; p < c; p++)u.push(i[o + p]);
                else if (h == 2) for(p = 0; p < c; p++)u.push(d.readUshort(i, o + 2 * p));
                else if (h == 3) for(p = 0; p < c; p++)u.push(16777215 & d.readUint(i, o + 3 * p - 1));
                else if (c != 1) throw "unsupported offset size: " + h + ", count: " + c;
                return (o += c * h) - 1;
            }, e.CFF.getCharString = function(i, o, u) {
                var d = e._bin, c = i[o], h = i[o + 1];
                i[o + 2], i[o + 3], i[o + 4];
                var p = 1, v = null, y = null;
                c <= 20 && (v = c, p = 1), c == 12 && (v = 100 * c + h, p = 2), 21 <= c && c <= 27 && (v = c, p = 1), c == 28 && (y = d.readShort(i, o + 1), p = 3), 29 <= c && c <= 31 && (v = c, p = 1), 32 <= c && c <= 246 && (y = c - 139, p = 1), 247 <= c && c <= 250 && (y = 256 * (c - 247) + h + 108, p = 2), 251 <= c && c <= 254 && (y = 256 * -(c - 251) - h - 108, p = 2), c == 255 && (y = d.readInt(i, o + 1) / 65535, p = 5), u.val = y ?? "o" + v, u.size = p;
            }, e.CFF.readCharString = function(i, o, u) {
                for(var d = o + u, c = e._bin, h = []; o < d;){
                    var p = i[o], v = i[o + 1];
                    i[o + 2], i[o + 3], i[o + 4];
                    var y = 1, b = null, S = null;
                    p <= 20 && (b = p, y = 1), p == 12 && (b = 100 * p + v, y = 2), p != 19 && p != 20 || (b = p, y = 2), 21 <= p && p <= 27 && (b = p, y = 1), p == 28 && (S = c.readShort(i, o + 1), y = 3), 29 <= p && p <= 31 && (b = p, y = 1), 32 <= p && p <= 246 && (S = p - 139, y = 1), 247 <= p && p <= 250 && (S = 256 * (p - 247) + v + 108, y = 2), 251 <= p && p <= 254 && (S = 256 * -(p - 251) - v - 108, y = 2), p == 255 && (S = c.readInt(i, o + 1) / 65535, y = 5), h.push(S ?? "o" + b), o += y;
                }
                return h;
            }, e.CFF.readDict = function(i, o, u) {
                for(var d = e._bin, c = {}, h = []; o < u;){
                    var p = i[o], v = i[o + 1];
                    i[o + 2], i[o + 3], i[o + 4];
                    var y = 1, b = null, S = null;
                    if (p == 28 && (S = d.readShort(i, o + 1), y = 3), p == 29 && (S = d.readInt(i, o + 1), y = 5), 32 <= p && p <= 246 && (S = p - 139, y = 1), 247 <= p && p <= 250 && (S = 256 * (p - 247) + v + 108, y = 2), 251 <= p && p <= 254 && (S = 256 * -(p - 251) - v - 108, y = 2), p == 255) throw S = d.readInt(i, o + 1) / 65535, y = 5, "unknown number";
                    if (p == 30) {
                        var _ = [];
                        for(y = 1;;){
                            var x = i[o + y];
                            y++;
                            var k = x >> 4, T = 15 & x;
                            if (k != 15 && _.push(k), T != 15 && _.push(T), T == 15) break;
                        }
                        for(var A = "", U = [
                            0,
                            1,
                            2,
                            3,
                            4,
                            5,
                            6,
                            7,
                            8,
                            9,
                            ".",
                            "e",
                            "e-",
                            "reserved",
                            "-",
                            "endOfNumber"
                        ], D = 0; D < _.length; D++)A += U[_[D]];
                        S = parseFloat(A);
                    }
                    p <= 21 && (b = [
                        "version",
                        "Notice",
                        "FullName",
                        "FamilyName",
                        "Weight",
                        "FontBBox",
                        "BlueValues",
                        "OtherBlues",
                        "FamilyBlues",
                        "FamilyOtherBlues",
                        "StdHW",
                        "StdVW",
                        "escape",
                        "UniqueID",
                        "XUID",
                        "charset",
                        "Encoding",
                        "CharStrings",
                        "Private",
                        "Subrs",
                        "defaultWidthX",
                        "nominalWidthX"
                    ][p], y = 1, p == 12 && (b = [
                        "Copyright",
                        "isFixedPitch",
                        "ItalicAngle",
                        "UnderlinePosition",
                        "UnderlineThickness",
                        "PaintType",
                        "CharstringType",
                        "FontMatrix",
                        "StrokeWidth",
                        "BlueScale",
                        "BlueShift",
                        "BlueFuzz",
                        "StemSnapH",
                        "StemSnapV",
                        "ForceBold",
                        0,
                        0,
                        "LanguageGroup",
                        "ExpansionFactor",
                        "initialRandomSeed",
                        "SyntheticBase",
                        "PostScript",
                        "BaseFontName",
                        "BaseFontBlend",
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        "ROS",
                        "CIDFontVersion",
                        "CIDFontRevision",
                        "CIDFontType",
                        "CIDCount",
                        "UIDBase",
                        "FDArray",
                        "FDSelect",
                        "FontName"
                    ][v], y = 2)), b != null ? (c[b] = h.length == 1 ? h[0] : h, h = []) : h.push(S), o += y;
                }
                return c;
            }, e.cmap = {}, e.cmap.parse = function(i, o, u) {
                i = new Uint8Array(i.buffer, o, u), o = 0;
                var d = e._bin, c = {};
                d.readUshort(i, o), o += 2;
                var h = d.readUshort(i, o);
                o += 2;
                var p = [];
                c.tables = [];
                for(var v = 0; v < h; v++){
                    var y = d.readUshort(i, o);
                    o += 2;
                    var b = d.readUshort(i, o);
                    o += 2;
                    var S = d.readUint(i, o);
                    o += 4;
                    var _ = "p" + y + "e" + b, x = p.indexOf(S);
                    if (x == -1) {
                        var k;
                        x = c.tables.length, p.push(S);
                        var T = d.readUshort(i, S);
                        T == 0 ? k = e.cmap.parse0(i, S) : T == 4 ? k = e.cmap.parse4(i, S) : T == 6 ? k = e.cmap.parse6(i, S) : T == 12 ? k = e.cmap.parse12(i, S) : console.debug("unknown format: " + T, y, b, S), c.tables.push(k);
                    }
                    if (c[_] != null) throw "multiple tables for one platform+encoding";
                    c[_] = x;
                }
                return c;
            }, e.cmap.parse0 = function(i, o) {
                var u = e._bin, d = {};
                d.format = u.readUshort(i, o), o += 2;
                var c = u.readUshort(i, o);
                o += 2, u.readUshort(i, o), o += 2, d.map = [];
                for(var h = 0; h < c - 6; h++)d.map.push(i[o + h]);
                return d;
            }, e.cmap.parse4 = function(i, o) {
                var u = e._bin, d = o, c = {};
                c.format = u.readUshort(i, o), o += 2;
                var h = u.readUshort(i, o);
                o += 2, u.readUshort(i, o), o += 2;
                var p = u.readUshort(i, o);
                o += 2;
                var v = p / 2;
                c.searchRange = u.readUshort(i, o), o += 2, c.entrySelector = u.readUshort(i, o), o += 2, c.rangeShift = u.readUshort(i, o), o += 2, c.endCount = u.readUshorts(i, o, v), o += 2 * v, o += 2, c.startCount = u.readUshorts(i, o, v), o += 2 * v, c.idDelta = [];
                for(var y = 0; y < v; y++)c.idDelta.push(u.readShort(i, o)), o += 2;
                for(c.idRangeOffset = u.readUshorts(i, o, v), o += 2 * v, c.glyphIdArray = []; o < d + h;)c.glyphIdArray.push(u.readUshort(i, o)), o += 2;
                return c;
            }, e.cmap.parse6 = function(i, o) {
                var u = e._bin, d = {};
                d.format = u.readUshort(i, o), o += 2, u.readUshort(i, o), o += 2, u.readUshort(i, o), o += 2, d.firstCode = u.readUshort(i, o), o += 2;
                var c = u.readUshort(i, o);
                o += 2, d.glyphIdArray = [];
                for(var h = 0; h < c; h++)d.glyphIdArray.push(u.readUshort(i, o)), o += 2;
                return d;
            }, e.cmap.parse12 = function(i, o) {
                var u = e._bin, d = {};
                d.format = u.readUshort(i, o), o += 2, o += 2, u.readUint(i, o), o += 4, u.readUint(i, o), o += 4;
                var c = u.readUint(i, o);
                o += 4, d.groups = [];
                for(var h = 0; h < c; h++){
                    var p = o + 12 * h, v = u.readUint(i, p + 0), y = u.readUint(i, p + 4), b = u.readUint(i, p + 8);
                    d.groups.push([
                        v,
                        y,
                        b
                    ]);
                }
                return d;
            }, e.glyf = {}, e.glyf.parse = function(i, o, u, d) {
                for(var c = [], h = 0; h < d.maxp.numGlyphs; h++)c.push(null);
                return c;
            }, e.glyf._parseGlyf = function(i, o) {
                var u = e._bin, d = i._data, c = e._tabOffset(d, "glyf", i._offset) + i.loca[o];
                if (i.loca[o] == i.loca[o + 1]) return null;
                var h = {};
                if (h.noc = u.readShort(d, c), c += 2, h.xMin = u.readShort(d, c), c += 2, h.yMin = u.readShort(d, c), c += 2, h.xMax = u.readShort(d, c), c += 2, h.yMax = u.readShort(d, c), c += 2, h.xMin >= h.xMax || h.yMin >= h.yMax) return null;
                if (h.noc > 0) {
                    h.endPts = [];
                    for(var p = 0; p < h.noc; p++)h.endPts.push(u.readUshort(d, c)), c += 2;
                    var v = u.readUshort(d, c);
                    if (c += 2, d.length - c < v) return null;
                    h.instructions = u.readBytes(d, c, v), c += v;
                    var y = h.endPts[h.noc - 1] + 1;
                    for(h.flags = [], p = 0; p < y; p++){
                        var b = d[c];
                        if (c++, h.flags.push(b), (8 & b) != 0) {
                            var S = d[c];
                            c++;
                            for(var _ = 0; _ < S; _++)h.flags.push(b), p++;
                        }
                    }
                    for(h.xs = [], p = 0; p < y; p++){
                        var x = (2 & h.flags[p]) != 0, k = (16 & h.flags[p]) != 0;
                        x ? (h.xs.push(k ? d[c] : -d[c]), c++) : k ? h.xs.push(0) : (h.xs.push(u.readShort(d, c)), c += 2);
                    }
                    for(h.ys = [], p = 0; p < y; p++)x = (4 & h.flags[p]) != 0, k = (32 & h.flags[p]) != 0, x ? (h.ys.push(k ? d[c] : -d[c]), c++) : k ? h.ys.push(0) : (h.ys.push(u.readShort(d, c)), c += 2);
                    var T = 0, A = 0;
                    for(p = 0; p < y; p++)T += h.xs[p], A += h.ys[p], h.xs[p] = T, h.ys[p] = A;
                } else {
                    var U;
                    h.parts = [];
                    do {
                        U = u.readUshort(d, c), c += 2;
                        var D = {
                            m: {
                                a: 1,
                                b: 0,
                                c: 0,
                                d: 1,
                                tx: 0,
                                ty: 0
                            },
                            p1: -1,
                            p2: -1
                        };
                        if (h.parts.push(D), D.glyphIndex = u.readUshort(d, c), c += 2, 1 & U) {
                            var R = u.readShort(d, c);
                            c += 2;
                            var N = u.readShort(d, c);
                            c += 2;
                        } else R = u.readInt8(d, c), c++, N = u.readInt8(d, c), c++;
                        2 & U ? (D.m.tx = R, D.m.ty = N) : (D.p1 = R, D.p2 = N), 8 & U ? (D.m.a = D.m.d = u.readF2dot14(d, c), c += 2) : 64 & U ? (D.m.a = u.readF2dot14(d, c), c += 2, D.m.d = u.readF2dot14(d, c), c += 2) : 128 & U && (D.m.a = u.readF2dot14(d, c), c += 2, D.m.b = u.readF2dot14(d, c), c += 2, D.m.c = u.readF2dot14(d, c), c += 2, D.m.d = u.readF2dot14(d, c), c += 2);
                    }while (32 & U);
                    if (256 & U) {
                        var P = u.readUshort(d, c);
                        for(c += 2, h.instr = [], p = 0; p < P; p++)h.instr.push(d[c]), c++;
                    }
                }
                return h;
            }, e.GDEF = {}, e.GDEF.parse = function(i, o, u, d) {
                var c = o;
                o += 4;
                var h = e._bin.readUshort(i, o);
                return {
                    glyphClassDef: h === 0 ? null : e._lctf.readClassDef(i, c + h)
                };
            }, e.GPOS = {}, e.GPOS.parse = function(i, o, u, d) {
                return e._lctf.parse(i, o, u, d, e.GPOS.subt);
            }, e.GPOS.subt = function(i, o, u, d) {
                var c = e._bin, h = u, p = {};
                if (p.fmt = c.readUshort(i, u), u += 2, o == 1 || o == 2 || o == 3 || o == 7 || o == 8 && p.fmt <= 2) {
                    var v = c.readUshort(i, u);
                    u += 2, p.coverage = e._lctf.readCoverage(i, v + h);
                }
                if (o == 1 && p.fmt == 1) {
                    var y = c.readUshort(i, u);
                    u += 2, y != 0 && (p.pos = e.GPOS.readValueRecord(i, u, y));
                } else if (o == 2 && p.fmt >= 1 && p.fmt <= 2) {
                    y = c.readUshort(i, u), u += 2;
                    var b = c.readUshort(i, u);
                    u += 2;
                    var S = e._lctf.numOfOnes(y), _ = e._lctf.numOfOnes(b);
                    if (p.fmt == 1) {
                        p.pairsets = [];
                        var x = c.readUshort(i, u);
                        u += 2;
                        for(var k = 0; k < x; k++){
                            var T = h + c.readUshort(i, u);
                            u += 2;
                            var A = c.readUshort(i, T);
                            T += 2;
                            for(var U = [], D = 0; D < A; D++){
                                var R = c.readUshort(i, T);
                                T += 2, y != 0 && (L = e.GPOS.readValueRecord(i, T, y), T += 2 * S), b != 0 && (G = e.GPOS.readValueRecord(i, T, b), T += 2 * _), U.push({
                                    gid2: R,
                                    val1: L,
                                    val2: G
                                });
                            }
                            p.pairsets.push(U);
                        }
                    }
                    if (p.fmt == 2) {
                        var N = c.readUshort(i, u);
                        u += 2;
                        var P = c.readUshort(i, u);
                        u += 2;
                        var I = c.readUshort(i, u);
                        u += 2;
                        var F = c.readUshort(i, u);
                        for(u += 2, p.classDef1 = e._lctf.readClassDef(i, h + N), p.classDef2 = e._lctf.readClassDef(i, h + P), p.matrix = [], k = 0; k < I; k++){
                            var Y = [];
                            for(D = 0; D < F; D++){
                                var L = null, G = null;
                                y != 0 && (L = e.GPOS.readValueRecord(i, u, y), u += 2 * S), b != 0 && (G = e.GPOS.readValueRecord(i, u, b), u += 2 * _), Y.push({
                                    val1: L,
                                    val2: G
                                });
                            }
                            p.matrix.push(Y);
                        }
                    }
                } else if (o == 4 && p.fmt == 1) p.markCoverage = e._lctf.readCoverage(i, c.readUshort(i, u) + h), p.baseCoverage = e._lctf.readCoverage(i, c.readUshort(i, u + 2) + h), p.markClassCount = c.readUshort(i, u + 4), p.markArray = e.GPOS.readMarkArray(i, c.readUshort(i, u + 6) + h), p.baseArray = e.GPOS.readBaseArray(i, c.readUshort(i, u + 8) + h, p.markClassCount);
                else if (o == 6 && p.fmt == 1) p.mark1Coverage = e._lctf.readCoverage(i, c.readUshort(i, u) + h), p.mark2Coverage = e._lctf.readCoverage(i, c.readUshort(i, u + 2) + h), p.markClassCount = c.readUshort(i, u + 4), p.mark1Array = e.GPOS.readMarkArray(i, c.readUshort(i, u + 6) + h), p.mark2Array = e.GPOS.readBaseArray(i, c.readUshort(i, u + 8) + h, p.markClassCount);
                else {
                    if (o == 9 && p.fmt == 1) {
                        var B = c.readUshort(i, u);
                        u += 2;
                        var K = c.readUint(i, u);
                        if (u += 4, d.ltype == 9) d.ltype = B;
                        else if (d.ltype != B) throw "invalid extension substitution";
                        return e.GPOS.subt(i, d.ltype, h + K);
                    }
                    console.debug("unsupported GPOS table LookupType", o, "format", p.fmt);
                }
                return p;
            }, e.GPOS.readValueRecord = function(i, o, u) {
                var d = e._bin, c = [];
                return c.push(1 & u ? d.readShort(i, o) : 0), o += 1 & u ? 2 : 0, c.push(2 & u ? d.readShort(i, o) : 0), o += 2 & u ? 2 : 0, c.push(4 & u ? d.readShort(i, o) : 0), o += 4 & u ? 2 : 0, c.push(8 & u ? d.readShort(i, o) : 0), o += 8 & u ? 2 : 0, c;
            }, e.GPOS.readBaseArray = function(i, o, u) {
                var d = e._bin, c = [], h = o, p = d.readUshort(i, o);
                o += 2;
                for(var v = 0; v < p; v++){
                    for(var y = [], b = 0; b < u; b++)y.push(e.GPOS.readAnchorRecord(i, h + d.readUshort(i, o))), o += 2;
                    c.push(y);
                }
                return c;
            }, e.GPOS.readMarkArray = function(i, o) {
                var u = e._bin, d = [], c = o, h = u.readUshort(i, o);
                o += 2;
                for(var p = 0; p < h; p++){
                    var v = e.GPOS.readAnchorRecord(i, u.readUshort(i, o + 2) + c);
                    v.markClass = u.readUshort(i, o), d.push(v), o += 4;
                }
                return d;
            }, e.GPOS.readAnchorRecord = function(i, o) {
                var u = e._bin, d = {};
                return d.fmt = u.readUshort(i, o), d.x = u.readShort(i, o + 2), d.y = u.readShort(i, o + 4), d;
            }, e.GSUB = {}, e.GSUB.parse = function(i, o, u, d) {
                return e._lctf.parse(i, o, u, d, e.GSUB.subt);
            }, e.GSUB.subt = function(i, o, u, d) {
                var c = e._bin, h = u, p = {};
                if (p.fmt = c.readUshort(i, u), u += 2, o != 1 && o != 2 && o != 4 && o != 5 && o != 6) return null;
                if (o == 1 || o == 2 || o == 4 || o == 5 && p.fmt <= 2 || o == 6 && p.fmt <= 2) {
                    var v = c.readUshort(i, u);
                    u += 2, p.coverage = e._lctf.readCoverage(i, h + v);
                }
                if (o == 1 && p.fmt >= 1 && p.fmt <= 2) {
                    if (p.fmt == 1) p.delta = c.readShort(i, u), u += 2;
                    else if (p.fmt == 2) {
                        var y = c.readUshort(i, u);
                        u += 2, p.newg = c.readUshorts(i, u, y), u += 2 * p.newg.length;
                    }
                } else if (o == 2 && p.fmt == 1) {
                    y = c.readUshort(i, u), u += 2, p.seqs = [];
                    for(var b = 0; b < y; b++){
                        var S = c.readUshort(i, u) + h;
                        u += 2;
                        var _ = c.readUshort(i, S);
                        p.seqs.push(c.readUshorts(i, S + 2, _));
                    }
                } else if (o == 4) for(p.vals = [], y = c.readUshort(i, u), u += 2, b = 0; b < y; b++){
                    var x = c.readUshort(i, u);
                    u += 2, p.vals.push(e.GSUB.readLigatureSet(i, h + x));
                }
                else if (o == 5 && p.fmt == 2) {
                    if (p.fmt == 2) {
                        var k = c.readUshort(i, u);
                        u += 2, p.cDef = e._lctf.readClassDef(i, h + k), p.scset = [];
                        var T = c.readUshort(i, u);
                        for(u += 2, b = 0; b < T; b++){
                            var A = c.readUshort(i, u);
                            u += 2, p.scset.push(A == 0 ? null : e.GSUB.readSubClassSet(i, h + A));
                        }
                    }
                } else if (o == 6 && p.fmt == 3) {
                    if (p.fmt == 3) {
                        for(b = 0; b < 3; b++){
                            y = c.readUshort(i, u), u += 2;
                            for(var U = [], D = 0; D < y; D++)U.push(e._lctf.readCoverage(i, h + c.readUshort(i, u + 2 * D)));
                            u += 2 * y, b == 0 && (p.backCvg = U), b == 1 && (p.inptCvg = U), b == 2 && (p.ahedCvg = U);
                        }
                        y = c.readUshort(i, u), u += 2, p.lookupRec = e.GSUB.readSubstLookupRecords(i, u, y);
                    }
                } else {
                    if (o == 7 && p.fmt == 1) {
                        var R = c.readUshort(i, u);
                        u += 2;
                        var N = c.readUint(i, u);
                        if (u += 4, d.ltype == 9) d.ltype = R;
                        else if (d.ltype != R) throw "invalid extension substitution";
                        return e.GSUB.subt(i, d.ltype, h + N);
                    }
                    console.debug("unsupported GSUB table LookupType", o, "format", p.fmt);
                }
                return p;
            }, e.GSUB.readSubClassSet = function(i, o) {
                var u = e._bin.readUshort, d = o, c = [], h = u(i, o);
                o += 2;
                for(var p = 0; p < h; p++){
                    var v = u(i, o);
                    o += 2, c.push(e.GSUB.readSubClassRule(i, d + v));
                }
                return c;
            }, e.GSUB.readSubClassRule = function(i, o) {
                var u = e._bin.readUshort, d = {}, c = u(i, o), h = u(i, o += 2);
                o += 2, d.input = [];
                for(var p = 0; p < c - 1; p++)d.input.push(u(i, o)), o += 2;
                return d.substLookupRecords = e.GSUB.readSubstLookupRecords(i, o, h), d;
            }, e.GSUB.readSubstLookupRecords = function(i, o, u) {
                for(var d = e._bin.readUshort, c = [], h = 0; h < u; h++)c.push(d(i, o), d(i, o + 2)), o += 4;
                return c;
            }, e.GSUB.readChainSubClassSet = function(i, o) {
                var u = e._bin, d = o, c = [], h = u.readUshort(i, o);
                o += 2;
                for(var p = 0; p < h; p++){
                    var v = u.readUshort(i, o);
                    o += 2, c.push(e.GSUB.readChainSubClassRule(i, d + v));
                }
                return c;
            }, e.GSUB.readChainSubClassRule = function(i, o) {
                for(var u = e._bin, d = {}, c = [
                    "backtrack",
                    "input",
                    "lookahead"
                ], h = 0; h < c.length; h++){
                    var p = u.readUshort(i, o);
                    o += 2, h == 1 && p--, d[c[h]] = u.readUshorts(i, o, p), o += 2 * d[c[h]].length;
                }
                return p = u.readUshort(i, o), o += 2, d.subst = u.readUshorts(i, o, 2 * p), o += 2 * d.subst.length, d;
            }, e.GSUB.readLigatureSet = function(i, o) {
                var u = e._bin, d = o, c = [], h = u.readUshort(i, o);
                o += 2;
                for(var p = 0; p < h; p++){
                    var v = u.readUshort(i, o);
                    o += 2, c.push(e.GSUB.readLigature(i, d + v));
                }
                return c;
            }, e.GSUB.readLigature = function(i, o) {
                var u = e._bin, d = {
                    chain: []
                };
                d.nglyph = u.readUshort(i, o), o += 2;
                var c = u.readUshort(i, o);
                o += 2;
                for(var h = 0; h < c - 1; h++)d.chain.push(u.readUshort(i, o)), o += 2;
                return d;
            }, e.head = {}, e.head.parse = function(i, o, u) {
                var d = e._bin, c = {};
                return d.readFixed(i, o), o += 4, c.fontRevision = d.readFixed(i, o), o += 4, d.readUint(i, o), o += 4, d.readUint(i, o), o += 4, c.flags = d.readUshort(i, o), o += 2, c.unitsPerEm = d.readUshort(i, o), o += 2, c.created = d.readUint64(i, o), o += 8, c.modified = d.readUint64(i, o), o += 8, c.xMin = d.readShort(i, o), o += 2, c.yMin = d.readShort(i, o), o += 2, c.xMax = d.readShort(i, o), o += 2, c.yMax = d.readShort(i, o), o += 2, c.macStyle = d.readUshort(i, o), o += 2, c.lowestRecPPEM = d.readUshort(i, o), o += 2, c.fontDirectionHint = d.readShort(i, o), o += 2, c.indexToLocFormat = d.readShort(i, o), o += 2, c.glyphDataFormat = d.readShort(i, o), o += 2, c;
            }, e.hhea = {}, e.hhea.parse = function(i, o, u) {
                var d = e._bin, c = {};
                return d.readFixed(i, o), o += 4, c.ascender = d.readShort(i, o), o += 2, c.descender = d.readShort(i, o), o += 2, c.lineGap = d.readShort(i, o), o += 2, c.advanceWidthMax = d.readUshort(i, o), o += 2, c.minLeftSideBearing = d.readShort(i, o), o += 2, c.minRightSideBearing = d.readShort(i, o), o += 2, c.xMaxExtent = d.readShort(i, o), o += 2, c.caretSlopeRise = d.readShort(i, o), o += 2, c.caretSlopeRun = d.readShort(i, o), o += 2, c.caretOffset = d.readShort(i, o), o += 2, o += 8, c.metricDataFormat = d.readShort(i, o), o += 2, c.numberOfHMetrics = d.readUshort(i, o), o += 2, c;
            }, e.hmtx = {}, e.hmtx.parse = function(i, o, u, d) {
                for(var c = e._bin, h = {
                    aWidth: [],
                    lsBearing: []
                }, p = 0, v = 0, y = 0; y < d.maxp.numGlyphs; y++)y < d.hhea.numberOfHMetrics && (p = c.readUshort(i, o), o += 2, v = c.readShort(i, o), o += 2), h.aWidth.push(p), h.lsBearing.push(v);
                return h;
            }, e.kern = {}, e.kern.parse = function(i, o, u, d) {
                var c = e._bin, h = c.readUshort(i, o);
                if (o += 2, h == 1) return e.kern.parseV1(i, o - 2, u, d);
                var p = c.readUshort(i, o);
                o += 2;
                for(var v = {
                    glyph1: [],
                    rval: []
                }, y = 0; y < p; y++){
                    o += 2, u = c.readUshort(i, o), o += 2;
                    var b = c.readUshort(i, o);
                    o += 2;
                    var S = b >>> 8;
                    if ((S &= 15) != 0) throw "unknown kern table format: " + S;
                    o = e.kern.readFormat0(i, o, v);
                }
                return v;
            }, e.kern.parseV1 = function(i, o, u, d) {
                var c = e._bin;
                c.readFixed(i, o), o += 4;
                var h = c.readUint(i, o);
                o += 4;
                for(var p = {
                    glyph1: [],
                    rval: []
                }, v = 0; v < h; v++){
                    c.readUint(i, o), o += 4;
                    var y = c.readUshort(i, o);
                    o += 2, c.readUshort(i, o), o += 2;
                    var b = y >>> 8;
                    if ((b &= 15) != 0) throw "unknown kern table format: " + b;
                    o = e.kern.readFormat0(i, o, p);
                }
                return p;
            }, e.kern.readFormat0 = function(i, o, u) {
                var d = e._bin, c = -1, h = d.readUshort(i, o);
                o += 2, d.readUshort(i, o), o += 2, d.readUshort(i, o), o += 2, d.readUshort(i, o), o += 2;
                for(var p = 0; p < h; p++){
                    var v = d.readUshort(i, o);
                    o += 2;
                    var y = d.readUshort(i, o);
                    o += 2;
                    var b = d.readShort(i, o);
                    o += 2, v != c && (u.glyph1.push(v), u.rval.push({
                        glyph2: [],
                        vals: []
                    }));
                    var S = u.rval[u.rval.length - 1];
                    S.glyph2.push(y), S.vals.push(b), c = v;
                }
                return o;
            }, e.loca = {}, e.loca.parse = function(i, o, u, d) {
                var c = e._bin, h = [], p = d.head.indexToLocFormat, v = d.maxp.numGlyphs + 1;
                if (p == 0) for(var y = 0; y < v; y++)h.push(c.readUshort(i, o + (y << 1)) << 1);
                if (p == 1) for(y = 0; y < v; y++)h.push(c.readUint(i, o + (y << 2)));
                return h;
            }, e.maxp = {}, e.maxp.parse = function(i, o, u) {
                var d = e._bin, c = {}, h = d.readUint(i, o);
                return o += 4, c.numGlyphs = d.readUshort(i, o), o += 2, h == 65536 && (c.maxPoints = d.readUshort(i, o), o += 2, c.maxContours = d.readUshort(i, o), o += 2, c.maxCompositePoints = d.readUshort(i, o), o += 2, c.maxCompositeContours = d.readUshort(i, o), o += 2, c.maxZones = d.readUshort(i, o), o += 2, c.maxTwilightPoints = d.readUshort(i, o), o += 2, c.maxStorage = d.readUshort(i, o), o += 2, c.maxFunctionDefs = d.readUshort(i, o), o += 2, c.maxInstructionDefs = d.readUshort(i, o), o += 2, c.maxStackElements = d.readUshort(i, o), o += 2, c.maxSizeOfInstructions = d.readUshort(i, o), o += 2, c.maxComponentElements = d.readUshort(i, o), o += 2, c.maxComponentDepth = d.readUshort(i, o), o += 2), c;
            }, e.name = {}, e.name.parse = function(i, o, u) {
                var d = e._bin, c = {};
                d.readUshort(i, o), o += 2;
                var h = d.readUshort(i, o);
                o += 2, d.readUshort(i, o);
                for(var p, v = [
                    "copyright",
                    "fontFamily",
                    "fontSubfamily",
                    "ID",
                    "fullName",
                    "version",
                    "postScriptName",
                    "trademark",
                    "manufacturer",
                    "designer",
                    "description",
                    "urlVendor",
                    "urlDesigner",
                    "licence",
                    "licenceURL",
                    "---",
                    "typoFamilyName",
                    "typoSubfamilyName",
                    "compatibleFull",
                    "sampleText",
                    "postScriptCID",
                    "wwsFamilyName",
                    "wwsSubfamilyName",
                    "lightPalette",
                    "darkPalette"
                ], y = o += 2, b = 0; b < h; b++){
                    var S = d.readUshort(i, o);
                    o += 2;
                    var _ = d.readUshort(i, o);
                    o += 2;
                    var x = d.readUshort(i, o);
                    o += 2;
                    var k = d.readUshort(i, o);
                    o += 2;
                    var T = d.readUshort(i, o);
                    o += 2;
                    var A = d.readUshort(i, o);
                    o += 2;
                    var U, D = v[k], R = y + 12 * h + A;
                    if (S == 0) U = d.readUnicode(i, R, T / 2);
                    else if (S == 3 && _ == 0) U = d.readUnicode(i, R, T / 2);
                    else if (_ == 0) U = d.readASCII(i, R, T);
                    else if (_ == 1) U = d.readUnicode(i, R, T / 2);
                    else if (_ == 3) U = d.readUnicode(i, R, T / 2);
                    else {
                        if (S != 1) throw "unknown encoding " + _ + ", platformID: " + S;
                        U = d.readASCII(i, R, T), console.debug("reading unknown MAC encoding " + _ + " as ASCII");
                    }
                    var N = "p" + S + "," + x.toString(16);
                    c[N] == null && (c[N] = {}), c[N][D !== void 0 ? D : k] = U, c[N]._lang = x;
                }
                for(var P in c)if (c[P].postScriptName != null && c[P]._lang == 1033) return c[P];
                for(var P in c)if (c[P].postScriptName != null && c[P]._lang == 0) return c[P];
                for(var P in c)if (c[P].postScriptName != null && c[P]._lang == 3084) return c[P];
                for(var P in c)if (c[P].postScriptName != null) return c[P];
                for(var P in c){
                    p = P;
                    break;
                }
                return console.debug("returning name table with languageID " + c[p]._lang), c[p];
            }, e["OS/2"] = {}, e["OS/2"].parse = function(i, o, u) {
                var d = e._bin.readUshort(i, o);
                o += 2;
                var c = {};
                if (d == 0) e["OS/2"].version0(i, o, c);
                else if (d == 1) e["OS/2"].version1(i, o, c);
                else if (d == 2 || d == 3 || d == 4) e["OS/2"].version2(i, o, c);
                else {
                    if (d != 5) throw "unknown OS/2 table version: " + d;
                    e["OS/2"].version5(i, o, c);
                }
                return c;
            }, e["OS/2"].version0 = function(i, o, u) {
                var d = e._bin;
                return u.xAvgCharWidth = d.readShort(i, o), o += 2, u.usWeightClass = d.readUshort(i, o), o += 2, u.usWidthClass = d.readUshort(i, o), o += 2, u.fsType = d.readUshort(i, o), o += 2, u.ySubscriptXSize = d.readShort(i, o), o += 2, u.ySubscriptYSize = d.readShort(i, o), o += 2, u.ySubscriptXOffset = d.readShort(i, o), o += 2, u.ySubscriptYOffset = d.readShort(i, o), o += 2, u.ySuperscriptXSize = d.readShort(i, o), o += 2, u.ySuperscriptYSize = d.readShort(i, o), o += 2, u.ySuperscriptXOffset = d.readShort(i, o), o += 2, u.ySuperscriptYOffset = d.readShort(i, o), o += 2, u.yStrikeoutSize = d.readShort(i, o), o += 2, u.yStrikeoutPosition = d.readShort(i, o), o += 2, u.sFamilyClass = d.readShort(i, o), o += 2, u.panose = d.readBytes(i, o, 10), o += 10, u.ulUnicodeRange1 = d.readUint(i, o), o += 4, u.ulUnicodeRange2 = d.readUint(i, o), o += 4, u.ulUnicodeRange3 = d.readUint(i, o), o += 4, u.ulUnicodeRange4 = d.readUint(i, o), o += 4, u.achVendID = [
                    d.readInt8(i, o),
                    d.readInt8(i, o + 1),
                    d.readInt8(i, o + 2),
                    d.readInt8(i, o + 3)
                ], o += 4, u.fsSelection = d.readUshort(i, o), o += 2, u.usFirstCharIndex = d.readUshort(i, o), o += 2, u.usLastCharIndex = d.readUshort(i, o), o += 2, u.sTypoAscender = d.readShort(i, o), o += 2, u.sTypoDescender = d.readShort(i, o), o += 2, u.sTypoLineGap = d.readShort(i, o), o += 2, u.usWinAscent = d.readUshort(i, o), o += 2, u.usWinDescent = d.readUshort(i, o), o += 2;
            }, e["OS/2"].version1 = function(i, o, u) {
                var d = e._bin;
                return o = e["OS/2"].version0(i, o, u), u.ulCodePageRange1 = d.readUint(i, o), o += 4, u.ulCodePageRange2 = d.readUint(i, o), o += 4;
            }, e["OS/2"].version2 = function(i, o, u) {
                var d = e._bin;
                return o = e["OS/2"].version1(i, o, u), u.sxHeight = d.readShort(i, o), o += 2, u.sCapHeight = d.readShort(i, o), o += 2, u.usDefault = d.readUshort(i, o), o += 2, u.usBreak = d.readUshort(i, o), o += 2, u.usMaxContext = d.readUshort(i, o), o += 2;
            }, e["OS/2"].version5 = function(i, o, u) {
                var d = e._bin;
                return o = e["OS/2"].version2(i, o, u), u.usLowerOpticalPointSize = d.readUshort(i, o), o += 2, u.usUpperOpticalPointSize = d.readUshort(i, o), o += 2;
            }, e.post = {}, e.post.parse = function(i, o, u) {
                var d = e._bin, c = {};
                return c.version = d.readFixed(i, o), o += 4, c.italicAngle = d.readFixed(i, o), o += 4, c.underlinePosition = d.readShort(i, o), o += 2, c.underlineThickness = d.readShort(i, o), o += 2, c;
            }, e == null && (e = {}), e.U == null && (e.U = {}), e.U.codeToGlyph = function(i, o) {
                var u = i.cmap, d = -1;
                if (u.p0e4 != null ? d = u.p0e4 : u.p3e1 != null ? d = u.p3e1 : u.p1e0 != null ? d = u.p1e0 : u.p0e3 != null && (d = u.p0e3), d == -1) throw "no familiar platform and encoding!";
                var c = u.tables[d];
                if (c.format == 0) return o >= c.map.length ? 0 : c.map[o];
                if (c.format == 4) {
                    for(var h = -1, p = 0; p < c.endCount.length; p++)if (o <= c.endCount[p]) {
                        h = p;
                        break;
                    }
                    return h == -1 || c.startCount[h] > o ? 0 : 65535 & (c.idRangeOffset[h] != 0 ? c.glyphIdArray[o - c.startCount[h] + (c.idRangeOffset[h] >> 1) - (c.idRangeOffset.length - h)] : o + c.idDelta[h]);
                }
                if (c.format == 12) {
                    if (o > c.groups[c.groups.length - 1][1]) return 0;
                    for(p = 0; p < c.groups.length; p++){
                        var v = c.groups[p];
                        if (v[0] <= o && o <= v[1]) return v[2] + (o - v[0]);
                    }
                    return 0;
                }
                throw "unknown cmap table format " + c.format;
            }, e.U.glyphToPath = function(i, o) {
                var u = {
                    cmds: [],
                    crds: []
                };
                if (i.SVG && i.SVG.entries[o]) {
                    var d = i.SVG.entries[o];
                    return d == null ? u : (typeof d == "string" && (d = e.SVG.toPath(d), i.SVG.entries[o] = d), d);
                }
                if (i.CFF) {
                    var c = {
                        x: 0,
                        y: 0,
                        stack: [],
                        nStems: 0,
                        haveWidth: !1,
                        width: i.CFF.Private ? i.CFF.Private.defaultWidthX : 0,
                        open: !1
                    }, h = i.CFF, p = i.CFF.Private;
                    if (h.ROS) {
                        for(var v = 0; h.FDSelect[v + 2] <= o;)v += 2;
                        p = h.FDArray[h.FDSelect[v + 1]].Private;
                    }
                    e.U._drawCFF(i.CFF.CharStrings[o], c, h, p, u);
                } else i.glyf && e.U._drawGlyf(o, i, u);
                return u;
            }, e.U._drawGlyf = function(i, o, u) {
                var d = o.glyf[i];
                d == null && (d = o.glyf[i] = e.glyf._parseGlyf(o, i)), d != null && (d.noc > -1 ? e.U._simpleGlyph(d, u) : e.U._compoGlyph(d, o, u));
            }, e.U._simpleGlyph = function(i, o) {
                for(var u = 0; u < i.noc; u++){
                    for(var d = u == 0 ? 0 : i.endPts[u - 1] + 1, c = i.endPts[u], h = d; h <= c; h++){
                        var p = h == d ? c : h - 1, v = h == c ? d : h + 1, y = 1 & i.flags[h], b = 1 & i.flags[p], S = 1 & i.flags[v], _ = i.xs[h], x = i.ys[h];
                        if (h == d) if (y) {
                            if (!b) {
                                e.U.P.moveTo(o, _, x);
                                continue;
                            }
                            e.U.P.moveTo(o, i.xs[p], i.ys[p]);
                        } else b ? e.U.P.moveTo(o, i.xs[p], i.ys[p]) : e.U.P.moveTo(o, (i.xs[p] + _) / 2, (i.ys[p] + x) / 2);
                        y ? b && e.U.P.lineTo(o, _, x) : S ? e.U.P.qcurveTo(o, _, x, i.xs[v], i.ys[v]) : e.U.P.qcurveTo(o, _, x, (_ + i.xs[v]) / 2, (x + i.ys[v]) / 2);
                    }
                    e.U.P.closePath(o);
                }
            }, e.U._compoGlyph = function(i, o, u) {
                for(var d = 0; d < i.parts.length; d++){
                    var c = {
                        cmds: [],
                        crds: []
                    }, h = i.parts[d];
                    e.U._drawGlyf(h.glyphIndex, o, c);
                    for(var p = h.m, v = 0; v < c.crds.length; v += 2){
                        var y = c.crds[v], b = c.crds[v + 1];
                        u.crds.push(y * p.a + b * p.b + p.tx), u.crds.push(y * p.c + b * p.d + p.ty);
                    }
                    for(v = 0; v < c.cmds.length; v++)u.cmds.push(c.cmds[v]);
                }
            }, e.U._getGlyphClass = function(i, o) {
                var u = e._lctf.getInterval(o, i);
                return u == -1 ? 0 : o[u + 2];
            }, e.U._applySubs = function(i, o, u, d) {
                for(var c = i.length - o - 1, h = 0; h < u.tabs.length; h++)if (u.tabs[h] != null) {
                    var p, v = u.tabs[h];
                    if (!v.coverage || (p = e._lctf.coverageIndex(v.coverage, i[o])) != -1) {
                        if (u.ltype == 1) i[o], v.fmt == 1 ? i[o] = i[o] + v.delta : i[o] = v.newg[p];
                        else if (u.ltype == 4) for(var y = v.vals[p], b = 0; b < y.length; b++){
                            var S = y[b], _ = S.chain.length;
                            if (!(_ > c)) {
                                for(var x = !0, k = 0, T = 0; T < _; T++){
                                    for(; i[o + k + (1 + T)] == -1;)k++;
                                    S.chain[T] != i[o + k + (1 + T)] && (x = !1);
                                }
                                if (x) {
                                    for(i[o] = S.nglyph, T = 0; T < _ + k; T++)i[o + T + 1] = -1;
                                    break;
                                }
                            }
                        }
                        else if (u.ltype == 5 && v.fmt == 2) for(var A = e._lctf.getInterval(v.cDef, i[o]), U = v.cDef[A + 2], D = v.scset[U], R = 0; R < D.length; R++){
                            var N = D[R], P = N.input;
                            if (!(P.length > c)) {
                                for(x = !0, T = 0; T < P.length; T++){
                                    var I = e._lctf.getInterval(v.cDef, i[o + 1 + T]);
                                    if (A == -1 && v.cDef[I + 2] != P[T]) {
                                        x = !1;
                                        break;
                                    }
                                }
                                if (x) {
                                    var F = N.substLookupRecords;
                                    for(b = 0; b < F.length; b += 2)F[b], F[b + 1];
                                }
                            }
                        }
                        else if (u.ltype == 6 && v.fmt == 3) {
                            if (!e.U._glsCovered(i, v.backCvg, o - v.backCvg.length) || !e.U._glsCovered(i, v.inptCvg, o) || !e.U._glsCovered(i, v.ahedCvg, o + v.inptCvg.length)) continue;
                            var Y = v.lookupRec;
                            for(R = 0; R < Y.length; R += 2){
                                A = Y[R];
                                var L = d[Y[R + 1]];
                                e.U._applySubs(i, o + A, L, d);
                            }
                        }
                    }
                }
            }, e.U._glsCovered = function(i, o, u) {
                for(var d = 0; d < o.length; d++)if (e._lctf.coverageIndex(o[d], i[u + d]) == -1) return !1;
                return !0;
            }, e.U.glyphsToPath = function(i, o, u) {
                for(var d = {
                    cmds: [],
                    crds: []
                }, c = 0, h = 0; h < o.length; h++){
                    var p = o[h];
                    if (p != -1) {
                        for(var v = h < o.length - 1 && o[h + 1] != -1 ? o[h + 1] : 0, y = e.U.glyphToPath(i, p), b = 0; b < y.crds.length; b += 2)d.crds.push(y.crds[b] + c), d.crds.push(y.crds[b + 1]);
                        for(u && d.cmds.push(u), b = 0; b < y.cmds.length; b++)d.cmds.push(y.cmds[b]);
                        u && d.cmds.push("X"), c += i.hmtx.aWidth[p], h < o.length - 1 && (c += e.U.getPairAdjustment(i, p, v));
                    }
                }
                return d;
            }, e.U.P = {}, e.U.P.moveTo = function(i, o, u) {
                i.cmds.push("M"), i.crds.push(o, u);
            }, e.U.P.lineTo = function(i, o, u) {
                i.cmds.push("L"), i.crds.push(o, u);
            }, e.U.P.curveTo = function(i, o, u, d, c, h, p) {
                i.cmds.push("C"), i.crds.push(o, u, d, c, h, p);
            }, e.U.P.qcurveTo = function(i, o, u, d, c) {
                i.cmds.push("Q"), i.crds.push(o, u, d, c);
            }, e.U.P.closePath = function(i) {
                i.cmds.push("Z");
            }, e.U._drawCFF = function(i, o, u, d, c) {
                for(var h = o.stack, p = o.nStems, v = o.haveWidth, y = o.width, b = o.open, S = 0, _ = o.x, x = o.y, k = 0, T = 0, A = 0, U = 0, D = 0, R = 0, N = 0, P = 0, I = 0, F = 0, Y = {
                    val: 0,
                    size: 0
                }; S < i.length;){
                    e.CFF.getCharString(i, S, Y);
                    var L = Y.val;
                    if (S += Y.size, L == "o1" || L == "o18") h.length % 2 != 0 && !v && (y = h.shift() + d.nominalWidthX), p += h.length >> 1, h.length = 0, v = !0;
                    else if (L == "o3" || L == "o23") h.length % 2 != 0 && !v && (y = h.shift() + d.nominalWidthX), p += h.length >> 1, h.length = 0, v = !0;
                    else if (L == "o4") h.length > 1 && !v && (y = h.shift() + d.nominalWidthX, v = !0), b && e.U.P.closePath(c), x += h.pop(), e.U.P.moveTo(c, _, x), b = !0;
                    else if (L == "o5") for(; h.length > 0;)_ += h.shift(), x += h.shift(), e.U.P.lineTo(c, _, x);
                    else if (L == "o6" || L == "o7") for(var G = h.length, B = L == "o6", K = 0; K < G; K++){
                        var ee = h.shift();
                        B ? _ += ee : x += ee, B = !B, e.U.P.lineTo(c, _, x);
                    }
                    else if (L == "o8" || L == "o24") {
                        G = h.length;
                        for(var ye = 0; ye + 6 <= G;)k = _ + h.shift(), T = x + h.shift(), A = k + h.shift(), U = T + h.shift(), _ = A + h.shift(), x = U + h.shift(), e.U.P.curveTo(c, k, T, A, U, _, x), ye += 6;
                        L == "o24" && (_ += h.shift(), x += h.shift(), e.U.P.lineTo(c, _, x));
                    } else {
                        if (L == "o11") break;
                        if (L == "o1234" || L == "o1235" || L == "o1236" || L == "o1237") L == "o1234" && (T = x, A = (k = _ + h.shift()) + h.shift(), F = U = T + h.shift(), R = U, P = x, _ = (N = (D = (I = A + h.shift()) + h.shift()) + h.shift()) + h.shift(), e.U.P.curveTo(c, k, T, A, U, I, F), e.U.P.curveTo(c, D, R, N, P, _, x)), L == "o1235" && (k = _ + h.shift(), T = x + h.shift(), A = k + h.shift(), U = T + h.shift(), I = A + h.shift(), F = U + h.shift(), D = I + h.shift(), R = F + h.shift(), N = D + h.shift(), P = R + h.shift(), _ = N + h.shift(), x = P + h.shift(), h.shift(), e.U.P.curveTo(c, k, T, A, U, I, F), e.U.P.curveTo(c, D, R, N, P, _, x)), L == "o1236" && (k = _ + h.shift(), T = x + h.shift(), A = k + h.shift(), F = U = T + h.shift(), R = U, N = (D = (I = A + h.shift()) + h.shift()) + h.shift(), P = R + h.shift(), _ = N + h.shift(), e.U.P.curveTo(c, k, T, A, U, I, F), e.U.P.curveTo(c, D, R, N, P, _, x)), L == "o1237" && (k = _ + h.shift(), T = x + h.shift(), A = k + h.shift(), U = T + h.shift(), I = A + h.shift(), F = U + h.shift(), D = I + h.shift(), R = F + h.shift(), N = D + h.shift(), P = R + h.shift(), Math.abs(N - _) > Math.abs(P - x) ? _ = N + h.shift() : x = P + h.shift(), e.U.P.curveTo(c, k, T, A, U, I, F), e.U.P.curveTo(c, D, R, N, P, _, x));
                        else if (L == "o14") {
                            if (h.length > 0 && !v && (y = h.shift() + u.nominalWidthX, v = !0), h.length == 4) {
                                var xe = h.shift(), te = h.shift(), q = h.shift(), O = h.shift(), H = e.CFF.glyphBySE(u, q), X = e.CFF.glyphBySE(u, O);
                                e.U._drawCFF(u.CharStrings[H], o, u, d, c), o.x = xe, o.y = te, e.U._drawCFF(u.CharStrings[X], o, u, d, c);
                            }
                            b && (e.U.P.closePath(c), b = !1);
                        } else if (L == "o19" || L == "o20") h.length % 2 != 0 && !v && (y = h.shift() + d.nominalWidthX), p += h.length >> 1, h.length = 0, v = !0, S += p + 7 >> 3;
                        else if (L == "o21") h.length > 2 && !v && (y = h.shift() + d.nominalWidthX, v = !0), x += h.pop(), _ += h.pop(), b && e.U.P.closePath(c), e.U.P.moveTo(c, _, x), b = !0;
                        else if (L == "o22") h.length > 1 && !v && (y = h.shift() + d.nominalWidthX, v = !0), _ += h.pop(), b && e.U.P.closePath(c), e.U.P.moveTo(c, _, x), b = !0;
                        else if (L == "o25") {
                            for(; h.length > 6;)_ += h.shift(), x += h.shift(), e.U.P.lineTo(c, _, x);
                            k = _ + h.shift(), T = x + h.shift(), A = k + h.shift(), U = T + h.shift(), _ = A + h.shift(), x = U + h.shift(), e.U.P.curveTo(c, k, T, A, U, _, x);
                        } else if (L == "o26") for(h.length % 2 && (_ += h.shift()); h.length > 0;)k = _, T = x + h.shift(), _ = A = k + h.shift(), x = (U = T + h.shift()) + h.shift(), e.U.P.curveTo(c, k, T, A, U, _, x);
                        else if (L == "o27") for(h.length % 2 && (x += h.shift()); h.length > 0;)T = x, A = (k = _ + h.shift()) + h.shift(), U = T + h.shift(), _ = A + h.shift(), x = U, e.U.P.curveTo(c, k, T, A, U, _, x);
                        else if (L == "o10" || L == "o29") {
                            var Z = L == "o10" ? d : u;
                            if (h.length == 0) console.debug("error: empty stack");
                            else {
                                var $ = h.pop(), oe = Z.Subrs[$ + Z.Bias];
                                o.x = _, o.y = x, o.nStems = p, o.haveWidth = v, o.width = y, o.open = b, e.U._drawCFF(oe, o, u, d, c), _ = o.x, x = o.y, p = o.nStems, v = o.haveWidth, y = o.width, b = o.open;
                            }
                        } else if (L == "o30" || L == "o31") {
                            var ce = h.length, fe = (ye = 0, L == "o31");
                            for(ye += ce - (G = -3 & ce); ye < G;)fe ? (T = x, A = (k = _ + h.shift()) + h.shift(), x = (U = T + h.shift()) + h.shift(), G - ye == 5 ? (_ = A + h.shift(), ye++) : _ = A, fe = !1) : (k = _, T = x + h.shift(), A = k + h.shift(), U = T + h.shift(), _ = A + h.shift(), G - ye == 5 ? (x = U + h.shift(), ye++) : x = U, fe = !0), e.U.P.curveTo(c, k, T, A, U, _, x), ye += 4;
                        } else {
                            if ((L + "").charAt(0) == "o") throw console.debug("Unknown operation: " + L, i), L;
                            h.push(L);
                        }
                    }
                }
                o.x = _, o.y = x, o.nStems = p, o.haveWidth = v, o.width = y, o.open = b;
            };
            var a = e, s = {
                Typr: a
            };
            return r.Typr = a, r.default = s, Object.defineProperty(r, "__esModule", {
                value: !0
            }), r;
        })({}).Typr;
    }
    function ax() {
        return (function(r) {
            var e = Uint8Array, a = Uint16Array, s = Uint32Array, i = new e([
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                1,
                1,
                1,
                1,
                2,
                2,
                2,
                2,
                3,
                3,
                3,
                3,
                4,
                4,
                4,
                4,
                5,
                5,
                5,
                5,
                0,
                0,
                0,
                0
            ]), o = new e([
                0,
                0,
                0,
                0,
                1,
                1,
                2,
                2,
                3,
                3,
                4,
                4,
                5,
                5,
                6,
                6,
                7,
                7,
                8,
                8,
                9,
                9,
                10,
                10,
                11,
                11,
                12,
                12,
                13,
                13,
                0,
                0
            ]), u = new e([
                16,
                17,
                18,
                0,
                8,
                7,
                9,
                6,
                10,
                5,
                11,
                4,
                12,
                3,
                13,
                2,
                14,
                1,
                15
            ]), d = function(L, G) {
                for(var B = new a(31), K = 0; K < 31; ++K)B[K] = G += 1 << L[K - 1];
                var ee = new s(B[30]);
                for(K = 1; K < 30; ++K)for(var ye = B[K]; ye < B[K + 1]; ++ye)ee[ye] = ye - B[K] << 5 | K;
                return [
                    B,
                    ee
                ];
            }, c = d(i, 2), h = c[0], p = c[1];
            h[28] = 258, p[258] = 28;
            for(var v = d(o, 0)[0], y = new a(32768), b = 0; b < 32768; ++b){
                var S = (43690 & b) >>> 1 | (21845 & b) << 1;
                S = (61680 & (S = (52428 & S) >>> 2 | (13107 & S) << 2)) >>> 4 | (3855 & S) << 4, y[b] = ((65280 & S) >>> 8 | (255 & S) << 8) >>> 1;
            }
            var _ = function(L, G, B) {
                for(var K = L.length, ee = 0, ye = new a(G); ee < K; ++ee)++ye[L[ee] - 1];
                var xe, te = new a(G);
                for(ee = 0; ee < G; ++ee)te[ee] = te[ee - 1] + ye[ee - 1] << 1;
                {
                    xe = new a(1 << G);
                    var q = 15 - G;
                    for(ee = 0; ee < K; ++ee)if (L[ee]) for(var O = ee << 4 | L[ee], H = G - L[ee], X = te[L[ee] - 1]++ << H, Z = X | (1 << H) - 1; X <= Z; ++X)xe[y[X] >>> q] = O;
                }
                return xe;
            }, x = new e(288);
            for(b = 0; b < 144; ++b)x[b] = 8;
            for(b = 144; b < 256; ++b)x[b] = 9;
            for(b = 256; b < 280; ++b)x[b] = 7;
            for(b = 280; b < 288; ++b)x[b] = 8;
            var k = new e(32);
            for(b = 0; b < 32; ++b)k[b] = 5;
            var T = _(x, 9), A = _(k, 5), U = function(L) {
                for(var G = L[0], B = 1; B < L.length; ++B)L[B] > G && (G = L[B]);
                return G;
            }, D = function(L, G, B) {
                var K = G / 8 | 0;
                return (L[K] | L[K + 1] << 8) >> (7 & G) & B;
            }, R = function(L, G) {
                var B = G / 8 | 0;
                return (L[B] | L[B + 1] << 8 | L[B + 2] << 16) >> (7 & G);
            }, N = [
                "unexpected EOF",
                "invalid block type",
                "invalid length/literal",
                "invalid distance",
                "stream finished",
                "no stream handler",
                ,
                "no callback",
                "invalid UTF-8 data",
                "extra field too long",
                "date not in range 1980-2099",
                "filename too long",
                "stream finishing",
                "invalid zip data"
            ], P = function(L, G, B) {
                var K = new Error(G || N[L]);
                if (K.code = L, Error.captureStackTrace && Error.captureStackTrace(K, P), !B) throw K;
                return K;
            }, I = function(L, G, B) {
                var K = L.length;
                if (!K || B && !B.l && K < 5) return G || new e(0);
                var ee = !G || B, ye = !B || B.i;
                B || (B = {}), G || (G = new e(3 * K));
                var xe, te = function(Ze) {
                    var W = G.length;
                    if (Ze > W) {
                        var de = new e(Math.max(2 * W, Ze));
                        de.set(G), G = de;
                    }
                }, q = B.f || 0, O = B.p || 0, H = B.b || 0, X = B.l, Z = B.d, $ = B.m, oe = B.n, ce = 8 * K;
                do {
                    if (!X) {
                        B.f = q = D(L, O, 1);
                        var fe = D(L, O + 1, 3);
                        if (O += 3, !fe) {
                            var Pe = L[(Le = ((xe = O) / 8 | 0) + (7 & xe && 1) + 4) - 4] | L[Le - 3] << 8, Ie = Le + Pe;
                            if (Ie > K) {
                                ye && P(0);
                                break;
                            }
                            ee && te(H + Pe), G.set(L.subarray(Le, Ie), H), B.b = H += Pe, B.p = O = 8 * Ie;
                            continue;
                        }
                        if (fe == 1) X = T, Z = A, $ = 9, oe = 5;
                        else if (fe == 2) {
                            var he = D(L, O, 31) + 257, pe = D(L, O + 10, 15) + 4, Ve = he + D(L, O + 5, 31) + 1;
                            O += 14;
                            for(var Xe = new e(Ve), Ae = new e(19), ze = 0; ze < pe; ++ze)Ae[u[ze]] = D(L, O + 3 * ze, 7);
                            O += 3 * pe;
                            var Ue = U(Ae), be = (1 << Ue) - 1, Ne = _(Ae, Ue);
                            for(ze = 0; ze < Ve;){
                                var Le, me = Ne[D(L, O, be)];
                                if (O += 15 & me, (Le = me >>> 4) < 16) Xe[ze++] = Le;
                                else {
                                    var Ke = 0, Se = 0;
                                    for(Le == 16 ? (Se = 3 + D(L, O, 3), O += 2, Ke = Xe[ze - 1]) : Le == 17 ? (Se = 3 + D(L, O, 7), O += 3) : Le == 18 && (Se = 11 + D(L, O, 127), O += 7); Se--;)Xe[ze++] = Ke;
                                }
                            }
                            var je = Xe.subarray(0, he), Fe = Xe.subarray(he);
                            $ = U(je), oe = U(Fe), X = _(je, $), Z = _(Fe, oe);
                        } else P(1);
                        if (O > ce) {
                            ye && P(0);
                            break;
                        }
                    }
                    ee && te(H + 131072);
                    for(var vt = (1 << $) - 1, Oe = (1 << oe) - 1, Ge = O;; Ge = O){
                        var Be = (Ke = X[R(L, O) & vt]) >>> 4;
                        if ((O += 15 & Ke) > ce) {
                            ye && P(0);
                            break;
                        }
                        if (Ke || P(2), Be < 256) G[H++] = Be;
                        else {
                            if (Be == 256) {
                                Ge = O, X = null;
                                break;
                            }
                            var et = Be - 254;
                            if (Be > 264) {
                                var kt = i[ze = Be - 257];
                                et = D(L, O, (1 << kt) - 1) + h[ze], O += kt;
                            }
                            var Nt = Z[R(L, O) & Oe], st = Nt >>> 4;
                            if (Nt || P(3), O += 15 & Nt, Fe = v[st], st > 3 && (kt = o[st], Fe += R(L, O) & (1 << kt) - 1, O += kt), O > ce) {
                                ye && P(0);
                                break;
                            }
                            ee && te(H + 131072);
                            for(var Qe = H + et; H < Qe; H += 4)G[H] = G[H - Fe], G[H + 1] = G[H + 1 - Fe], G[H + 2] = G[H + 2 - Fe], G[H + 3] = G[H + 3 - Fe];
                            H = Qe;
                        }
                    }
                    B.l = X, B.p = Ge, B.b = H, X && (q = 1, B.m = $, B.d = Z, B.n = oe);
                }while (!q);
                return H == G.length ? G : (function(Ze, W, de) {
                    (de == null || de > Ze.length) && (de = Ze.length);
                    var Re = new (Ze instanceof a ? a : Ze instanceof s ? s : e)(de - W);
                    return Re.set(Ze.subarray(W, de)), Re;
                })(G, 0, H);
            }, F = new e(0), Y = typeof TextDecoder < "u" && new TextDecoder;
            try {
                Y.decode(F, {
                    stream: !0
                });
            } catch  {}
            return r.convert_streams = function(L) {
                var G = new DataView(L), B = 0;
                function K() {
                    var he = G.getUint16(B);
                    return B += 2, he;
                }
                function ee() {
                    var he = G.getUint32(B);
                    return B += 4, he;
                }
                function ye(he) {
                    Pe.setUint16(Ie, he), Ie += 2;
                }
                function xe(he) {
                    Pe.setUint32(Ie, he), Ie += 4;
                }
                for(var te = {
                    signature: ee(),
                    flavor: ee(),
                    length: ee(),
                    numTables: K(),
                    reserved: K(),
                    totalSfntSize: ee(),
                    majorVersion: K(),
                    minorVersion: K(),
                    metaOffset: ee(),
                    metaLength: ee(),
                    metaOrigLength: ee(),
                    privOffset: ee(),
                    privLength: ee()
                }, q = 0; Math.pow(2, q) <= te.numTables;)q++;
                q--;
                for(var O = 16 * Math.pow(2, q), H = 16 * te.numTables - O, X = 12, Z = [], $ = 0; $ < te.numTables; $++)Z.push({
                    tag: ee(),
                    offset: ee(),
                    compLength: ee(),
                    origLength: ee(),
                    origChecksum: ee()
                }), X += 16;
                var oe, ce = new Uint8Array(12 + 16 * Z.length + Z.reduce((function(he, pe) {
                    return he + pe.origLength + 4;
                }), 0)), fe = ce.buffer, Pe = new DataView(fe), Ie = 0;
                return xe(te.flavor), ye(te.numTables), ye(O), ye(q), ye(H), Z.forEach((function(he) {
                    xe(he.tag), xe(he.origChecksum), xe(X), xe(he.origLength), he.outOffset = X, (X += he.origLength) % 4 != 0 && (X += 4 - X % 4);
                })), Z.forEach((function(he) {
                    var pe, Ve = L.slice(he.offset, he.offset + he.compLength);
                    if (he.compLength != he.origLength) {
                        var Xe = new Uint8Array(he.origLength);
                        pe = new Uint8Array(Ve, 2), I(pe, Xe);
                    } else Xe = new Uint8Array(Ve);
                    ce.set(Xe, he.outOffset);
                    var Ae = 0;
                    (X = he.outOffset + he.origLength) % 4 != 0 && (Ae = 4 - X % 4), ce.set(new Uint8Array(Ae).buffer, he.outOffset + he.origLength), oe = X + Ae;
                })), fe.slice(0, oe);
            }, Object.defineProperty(r, "__esModule", {
                value: !0
            }), r;
        })({}).convert_streams;
    }
    function ox(r, e) {
        const a = {
            M: 2,
            L: 2,
            Q: 4,
            C: 6,
            Z: 0
        }, s = {
            C: "18g,ca,368,1kz",
            D: "17k,6,2,2+4,5+c,2+6,2+1,10+1,9+f,j+11,2+1,a,2,2+1,15+2,3,j+2,6+3,2+8,2,2,2+1,w+a,4+e,3+3,2,3+2,3+5,23+w,2f+4,3,2+9,2,b,2+3,3,1k+9,6+1,3+1,2+2,2+d,30g,p+y,1,1+1g,f+x,2,sd2+1d,jf3+4,f+3,2+4,2+2,b+3,42,2,4+2,2+1,2,3,t+1,9f+w,2,el+2,2+g,d+2,2l,2+1,5,3+1,2+1,2,3,6,16wm+1v",
            R: "17m+3,2,2,6+3,m,15+2,2+2,h+h,13,3+8,2,2,3+1,2,p+1,x,5+4,5,a,2,2,3,u,c+2,g+1,5,2+1,4+1,5j,6+1,2,b,2+2,f,2+1,1s+2,2,3+1,7,1ez0,2,2+1,4+4,b,4,3,b,42,2+2,4,3,2+1,2,o+3,ae,ep,x,2o+2,3+1,3,5+1,6",
            L: "x9u,jff,a,fd,jv",
            T: "4t,gj+33,7o+4,1+1,7c+18,2,2+1,2+1,2,21+a,2,1b+k,h,2u+6,3+5,3+1,2+3,y,2,v+q,2k+a,1n+8,a,p+3,2+8,2+2,2+4,18+2,3c+e,2+v,1k,2,5+7,5,4+6,b+1,u,1n,5+3,9,l+1,r,3+1,1m,5+1,5+1,3+2,4,v+1,4,c+1,1m,5+4,2+1,5,l+1,n+5,2,1n,3,2+3,9,8+1,c+1,v,1q,d,1f,4,1m+2,6+2,2+3,8+1,c+1,u,1n,3,7,6+1,l+1,t+1,1m+1,5+3,9,l+1,u,21,8+2,2,2j,3+6,d+7,2r,3+8,c+5,23+1,s,2,2,1k+d,2+4,2+1,6+a,2+z,a,2v+3,2+5,2+1,3+1,q+1,5+2,h+3,e,3+1,7,g,jk+2,qb+2,u+2,u+1,v+1,1t+1,2+6,9,3+a,a,1a+2,3c+1,z,3b+2,5+1,a,7+2,64+1,3,1n,2+6,2,2,3+7,7+9,3,1d+d,1,1+1,1s+3,1d,2+4,2,6,15+8,d+1,x+3,3+1,2+2,1l,2+1,4,2+2,1n+7,3+1,49+2,2+c,2+6,5,7,4+1,5j+1l,2+4,ek,3+1,r+4,1e+4,6+5,2p+c,1+3,1,1+2,1+b,2db+2,3y,2p+v,ff+3,30+1,n9x,1+2,2+9,x+1,29+1,7l,4,5,q+1,6,48+1,r+h,e,13+7,q+a,1b+2,1d,3+3,3+1,14,1w+5,3+1,3+1,d,9,1c,1g,2+2,3+1,6+1,2,17+1,9,6n,3,5,fn5,ki+f,h+f,5s,6y+2,ea,6b,46+4,1af+2,2+1,6+3,15+2,5,4m+1,fy+3,as+1,4a+a,4x,1j+e,1l+2,1e+3,3+1,1y+2,11+4,2+7,1r,d+1,1h+8,b+3,3,2o+2,3,2+1,7,4h,4+7,m+1,1m+1,4,12+6,4+4,5g+7,3+2,2,o,2d+5,2,5+1,2+1,6n+3,7+1,2+1,s+1,2e+7,3,2+1,2z,2,3+5,2,2u+2,3+3,2+4,78+8,2+1,75+1,2,5,41+3,3+1,5,x+9,15+5,3+3,9,a+5,3+2,1b+c,2+1,bb+6,2+5,2,2b+l,3+6,2+1,2+1,3f+5,4,2+1,2+6,2,21+1,4,2,9o+1,470+8,at4+4,1o+6,t5,1s+3,2a,f5l+1,2+3,43o+2,a+7,1+7,3+6,v+3,45+2,1j0+1i,5+1d,9,f,n+4,2+e,11t+6,2+g,3+6,2+1,2+4,7a+6,c6+3,15t+6,32+6,1,gzau,v+2n,3l+6n"
        }, i = 1, o = 2, u = 4, d = 8, c = 16, h = 32;
        let p;
        function v(N) {
            if (!p) {
                const P = {
                    R: o,
                    L: i,
                    D: u,
                    C: c,
                    U: h,
                    T: d
                };
                p = new Map;
                for(let I in s){
                    let F = 0;
                    s[I].split(",").forEach((Y)=>{
                        let [L, G] = Y.split("+");
                        L = parseInt(L, 36), G = G ? parseInt(G, 36) : 0, p.set(F += L, P[I]);
                        for(let B = G; B--;)p.set(++F, P[I]);
                    });
                }
            }
            return p.get(N) || h;
        }
        const y = 1, b = 2, S = 3, _ = 4, x = [
            null,
            "isol",
            "init",
            "fina",
            "medi"
        ];
        function k(N) {
            const P = new Uint8Array(N.length);
            let I = h, F = y, Y = -1;
            for(let L = 0; L < N.length; L++){
                const G = N.codePointAt(L);
                let B = v(G) | 0, K = y;
                B & d || (I & (i | u | c) ? B & (o | u | c) ? (K = S, (F === y || F === S) && P[Y]++) : B & (i | h) && (F === b || F === _) && P[Y]-- : I & (o | h) && (F === b || F === _) && P[Y]--, F = P[L] = K, I = B, Y = L, G > 65535 && L++);
            }
            return P;
        }
        function T(N, P) {
            const I = [];
            for(let Y = 0; Y < P.length; Y++){
                const L = P.codePointAt(Y);
                L > 65535 && Y++, I.push(r.U.codeToGlyph(N, L));
            }
            const F = N.GSUB;
            if (F) {
                const { lookupList: Y, featureList: L } = F;
                let G;
                const B = /^(rlig|liga|mset|isol|init|fina|medi|half|pres|blws|ccmp)$/, K = [];
                L.forEach((ee)=>{
                    if (B.test(ee.tag)) for(let ye = 0; ye < ee.tab.length; ye++){
                        if (K[ee.tab[ye]]) continue;
                        K[ee.tab[ye]] = !0;
                        const xe = Y[ee.tab[ye]], te = /^(isol|init|fina|medi)$/.test(ee.tag);
                        te && !G && (G = k(P));
                        for(let q = 0; q < I.length; q++)(!G || !te || x[G[q]] === ee.tag) && r.U._applySubs(I, q, xe, Y);
                    }
                });
            }
            return I;
        }
        function A(N, P) {
            const I = new Int16Array(P.length * 3);
            let F = 0;
            for(; F < P.length; F++){
                const B = P[F];
                if (B === -1) continue;
                I[F * 3 + 2] = N.hmtx.aWidth[B];
                const K = N.GPOS;
                if (K) {
                    const ee = K.lookupList;
                    for(let ye = 0; ye < ee.length; ye++){
                        const xe = ee[ye];
                        for(let te = 0; te < xe.tabs.length; te++){
                            const q = xe.tabs[te];
                            if (xe.ltype === 1) {
                                if (r._lctf.coverageIndex(q.coverage, B) !== -1 && q.pos) {
                                    G(q.pos, F);
                                    break;
                                }
                            } else if (xe.ltype === 2) {
                                let O = null, H = Y();
                                if (H !== -1) {
                                    const X = r._lctf.coverageIndex(q.coverage, P[H]);
                                    if (X !== -1) {
                                        if (q.fmt === 1) {
                                            const Z = q.pairsets[X];
                                            for(let $ = 0; $ < Z.length; $++)Z[$].gid2 === B && (O = Z[$]);
                                        } else if (q.fmt === 2) {
                                            const Z = r.U._getGlyphClass(P[H], q.classDef1), $ = r.U._getGlyphClass(B, q.classDef2);
                                            O = q.matrix[Z][$];
                                        }
                                        if (O) {
                                            O.val1 && G(O.val1, H), O.val2 && G(O.val2, F);
                                            break;
                                        }
                                    }
                                }
                            } else if (xe.ltype === 4) {
                                const O = r._lctf.coverageIndex(q.markCoverage, B);
                                if (O !== -1) {
                                    const H = Y(L), X = H === -1 ? -1 : r._lctf.coverageIndex(q.baseCoverage, P[H]);
                                    if (X !== -1) {
                                        const Z = q.markArray[O], $ = q.baseArray[X][Z.markClass];
                                        I[F * 3] = $.x - Z.x + I[H * 3] - I[H * 3 + 2], I[F * 3 + 1] = $.y - Z.y + I[H * 3 + 1];
                                        break;
                                    }
                                }
                            } else if (xe.ltype === 6) {
                                const O = r._lctf.coverageIndex(q.mark1Coverage, B);
                                if (O !== -1) {
                                    const H = Y();
                                    if (H !== -1) {
                                        const X = P[H];
                                        if (U(N, X) === 3) {
                                            const Z = r._lctf.coverageIndex(q.mark2Coverage, X);
                                            if (Z !== -1) {
                                                const $ = q.mark1Array[O], oe = q.mark2Array[Z][$.markClass];
                                                I[F * 3] = oe.x - $.x + I[H * 3] - I[H * 3 + 2], I[F * 3 + 1] = oe.y - $.y + I[H * 3 + 1];
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (N.kern && !N.cff) {
                    const ee = Y();
                    if (ee !== -1) {
                        const ye = N.kern.glyph1.indexOf(P[ee]);
                        if (ye !== -1) {
                            const xe = N.kern.rval[ye].glyph2.indexOf(B);
                            xe !== -1 && (I[ee * 3 + 2] += N.kern.rval[ye].vals[xe]);
                        }
                    }
                }
            }
            return I;
            function Y(B) {
                for(let K = F - 1; K >= 0; K--)if (P[K] !== -1 && (!B || B(P[K]))) return K;
                return -1;
            }
            function L(B) {
                return U(N, B) === 1;
            }
            function G(B, K) {
                for(let ee = 0; ee < 3; ee++)I[K * 3 + ee] += B[ee] || 0;
            }
        }
        function U(N, P) {
            const I = N.GDEF && N.GDEF.glyphClassDef;
            return I ? r.U._getGlyphClass(P, I) : 0;
        }
        function D(...N) {
            for(let P = 0; P < N.length; P++)if (typeof N[P] == "number") return N[P];
        }
        function R(N) {
            const P = Object.create(null), I = N["OS/2"], F = N.hhea, Y = N.head.unitsPerEm, L = D(I && I.sTypoAscender, F && F.ascender, Y), G = {
                unitsPerEm: Y,
                ascender: L,
                descender: D(I && I.sTypoDescender, F && F.descender, 0),
                capHeight: D(I && I.sCapHeight, L),
                xHeight: D(I && I.sxHeight, L),
                lineGap: D(I && I.sTypoLineGap, F && F.lineGap),
                supportsCodePoint (B) {
                    return r.U.codeToGlyph(N, B) > 0;
                },
                forEachGlyph (B, K, ee, ye) {
                    let xe = 0;
                    const te = 1 / G.unitsPerEm * K, q = T(N, B);
                    let O = 0;
                    const H = A(N, q);
                    return q.forEach((X, Z)=>{
                        if (X !== -1) {
                            let $ = P[X];
                            if (!$) {
                                const { cmds: oe, crds: ce } = r.U.glyphToPath(N, X);
                                let fe = "", Pe = 0;
                                for(let Xe = 0, Ae = oe.length; Xe < Ae; Xe++){
                                    const ze = a[oe[Xe]];
                                    fe += oe[Xe];
                                    for(let Ue = 1; Ue <= ze; Ue++)fe += (Ue > 1 ? "," : "") + ce[Pe++];
                                }
                                let Ie, he, pe, Ve;
                                if (ce.length) {
                                    Ie = he = 1 / 0, pe = Ve = -1 / 0;
                                    for(let Xe = 0, Ae = ce.length; Xe < Ae; Xe += 2){
                                        let ze = ce[Xe], Ue = ce[Xe + 1];
                                        ze < Ie && (Ie = ze), Ue < he && (he = Ue), ze > pe && (pe = ze), Ue > Ve && (Ve = Ue);
                                    }
                                } else Ie = pe = he = Ve = 0;
                                $ = P[X] = {
                                    index: X,
                                    advanceWidth: N.hmtx.aWidth[X],
                                    xMin: Ie,
                                    yMin: he,
                                    xMax: pe,
                                    yMax: Ve,
                                    path: fe
                                };
                            }
                            ye.call(null, $, xe + H[Z * 3] * te, H[Z * 3 + 1] * te, O), xe += H[Z * 3 + 2] * te, ee && (xe += ee * K);
                        }
                        O += B.codePointAt(O) > 65535 ? 2 : 1;
                    }), xe;
                }
            };
            return G;
        }
        return function(P) {
            const I = new Uint8Array(P, 0, 4), F = r._bin.readASCII(I, 0, 4);
            if (F === "wOFF") P = e(P);
            else if (F === "wOF2") throw new Error("woff2 fonts not supported");
            return R(r.parse(P)[0]);
        };
    }
    const sx = mo({
        name: "Typr Font Parser",
        dependencies: [
            ix,
            ax,
            ox
        ],
        init (r, e, a) {
            const s = r(), i = e();
            return a(s, i);
        }
    });
    function lx() {
        return (function(r) {
            var e = function() {
                this.buckets = new Map;
            };
            e.prototype.add = function(A) {
                var U = A >> 5;
                this.buckets.set(U, (this.buckets.get(U) || 0) | 1 << (31 & A));
            }, e.prototype.has = function(A) {
                var U = this.buckets.get(A >> 5);
                return U !== void 0 && (U & 1 << (31 & A)) != 0;
            }, e.prototype.serialize = function() {
                var A = [];
                return this.buckets.forEach((function(U, D) {
                    A.push((+D).toString(36) + ":" + U.toString(36));
                })), A.join(",");
            }, e.prototype.deserialize = function(A) {
                var U = this;
                this.buckets.clear(), A.split(",").forEach((function(D) {
                    var R = D.split(":");
                    U.buckets.set(parseInt(R[0], 36), parseInt(R[1], 36));
                }));
            };
            var a = Math.pow(2, 8), s = a - 1, i = ~s;
            function o(A) {
                var U = (function(R) {
                    return R & i;
                })(A).toString(16), D = (function(R) {
                    return (R & i) + a - 1;
                })(A).toString(16);
                return "codepoint-index/plane" + (A >> 16) + "/" + U + "-" + D + ".json";
            }
            function u(A, U) {
                var D = A & s, R = U.codePointAt(D / 6 | 0);
                return ((R = (R || 48) - 48) & 1 << D % 6) != 0;
            }
            function d(A, U) {
                var D;
                (D = A, D.replace(/U\+/gi, "").replace(/^,+|,+$/g, "").split(/,+/).map((function(R) {
                    return R.split("-").map((function(N) {
                        return parseInt(N.trim(), 16);
                    }));
                }))).forEach((function(R) {
                    var N = R[0], P = R[1];
                    P === void 0 && (P = N), U(N, P);
                }));
            }
            function c(A, U) {
                d(A, (function(D, R) {
                    for(var N = D; N <= R; N++)U(N);
                }));
            }
            var h = {}, p = {}, v = new WeakMap, y = "https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data";
            function b(A) {
                var U = v.get(A);
                return U || (U = new e, c(A.ranges, (function(D) {
                    return U.add(D);
                })), v.set(A, U)), U;
            }
            var S, _ = new Map;
            function x(A, U, D) {
                return A[U] ? U : A[D] ? D : (function(R) {
                    for(var N in R)return N;
                })(A);
            }
            function k(A, U) {
                var D = U;
                if (!A.includes(D)) {
                    D = 1 / 0;
                    for(var R = 0; R < A.length; R++)Math.abs(A[R] - U) < Math.abs(D - U) && (D = A[R]);
                }
                return D;
            }
            function T(A) {
                return S || (S = new Set, c("9-D,20,85,A0,1680,2000-200A,2028-202F,205F,3000", (function(U) {
                    S.add(U);
                }))), S.has(A);
            }
            return r.CodePointSet = e, r.clearCache = function() {
                h = {}, p = {};
            }, r.getFontsForString = function(A, U) {
                U === void 0 && (U = {});
                var D, R = U.lang;
                R === void 0 && (R = /\p{Script=Hangul}/u.test(D = A) ? "ko" : /\p{Script=Hiragana}|\p{Script=Katakana}/u.test(D) ? "ja" : "en");
                var N = U.category;
                N === void 0 && (N = "sans-serif");
                var P = U.style;
                P === void 0 && (P = "normal");
                var I = U.weight;
                I === void 0 && (I = 400);
                var F = (U.dataUrl || y).replace(/\/$/g, ""), Y = new Map, L = new Uint8Array(A.length), G = {}, B = {}, K = new Array(A.length), ee = new Map, ye = !1;
                function xe(O) {
                    var H = _.get(O);
                    return H || (H = fetch(F + "/" + O).then((function(X) {
                        if (!X.ok) throw new Error(X.statusText);
                        return X.json().then((function(Z) {
                            if (!Array.isArray(Z) || Z[0] !== 1) throw new Error("Incorrect schema version; need 1, got " + Z[0]);
                            return Z[1];
                        }));
                    })).catch((function(X) {
                        if (F !== y) return ye || (console.error('unicode-font-resolver: Failed loading from dataUrl "' + F + '", trying default CDN. ' + X.message), ye = !0), F = y, _.delete(O), xe(O);
                        throw X;
                    })), _.set(O, H)), H;
                }
                for(var te = function(O) {
                    var H = A.codePointAt(O), X = o(H);
                    K[O] = X, h[X] || ee.has(X) || ee.set(X, xe(X).then((function(Z) {
                        h[X] = Z;
                    }))), H > 65535 && (O++, q = O);
                }, q = 0; q < A.length; q++)te(q);
                return Promise.all(ee.values()).then((function() {
                    ee.clear();
                    for(var O = function(X) {
                        var Z = A.codePointAt(X), $ = null, oe = h[K[X]], ce = void 0;
                        for(var fe in oe){
                            var Pe = B[fe];
                            if (Pe === void 0 && (Pe = B[fe] = new RegExp(fe).test(R || "en")), Pe) {
                                for(var Ie in ce = fe, oe[fe])if (u(Z, oe[fe][Ie])) {
                                    $ = Ie;
                                    break;
                                }
                                break;
                            }
                        }
                        if (!$) {
                            e: for(var he in oe)if (he !== ce) {
                                for(var pe in oe[he])if (u(Z, oe[he][pe])) {
                                    $ = pe;
                                    break e;
                                }
                            }
                        }
                        $ || (console.debug("No font coverage for U+" + Z.toString(16)), $ = "latin"), K[X] = $, p[$] || ee.has($) || ee.set($, xe("font-meta/" + $ + ".json").then((function(Ve) {
                            p[$] = Ve;
                        }))), Z > 65535 && (X++, H = X);
                    }, H = 0; H < A.length; H++)O(H);
                    return Promise.all(ee.values());
                })).then((function() {
                    for(var O, H = null, X = 0; X < A.length; X++){
                        var Z = A.codePointAt(X);
                        if (H && (T(Z) || b(H).has(Z))) L[X] = L[X - 1];
                        else {
                            H = p[K[X]];
                            var $ = G[H.id];
                            if (!$) {
                                var oe = H.typeforms, ce = x(oe, N, "sans-serif"), fe = x(oe[ce], P, "normal"), Pe = k((O = oe[ce]) === null || O === void 0 ? void 0 : O[fe], I);
                                $ = G[H.id] = F + "/font-files/" + H.id + "/" + ce + "." + fe + "." + Pe + ".woff";
                            }
                            var Ie = Y.get($);
                            Ie == null && (Ie = Y.size, Y.set($, Ie)), L[X] = Ie;
                        }
                        Z > 65535 && (X++, L[X] = L[X - 1]);
                    }
                    return {
                        fontUrls: Array.from(Y.keys()),
                        chars: L
                    };
                }));
            }, Object.defineProperty(r, "__esModule", {
                value: !0
            }), r;
        })({});
    }
    function ux(r, e) {
        const a = Object.create(null), s = Object.create(null);
        function i(u, d) {
            const c = (h)=>{
                console.error(`Failure loading font ${u}`, h);
            };
            try {
                const h = new XMLHttpRequest;
                h.open("get", u, !0), h.responseType = "arraybuffer", h.onload = function() {
                    if (h.status >= 400) c(new Error(h.statusText));
                    else if (h.status > 0) try {
                        const p = r(h.response);
                        p.src = u, d(p);
                    } catch (p) {
                        c(p);
                    }
                }, h.onerror = c, h.send();
            } catch (h) {
                c(h);
            }
        }
        function o(u, d) {
            let c = a[u];
            c ? d(c) : s[u] ? s[u].push(d) : (s[u] = [
                d
            ], i(u, (h)=>{
                h.src = u, a[u] = h, s[u].forEach((p)=>p(h)), delete s[u];
            }));
        }
        return function(u, d, { lang: c, fonts: h = [], style: p = "normal", weight: v = "normal", unicodeFontsURL: y } = {}) {
            const b = new Uint8Array(u.length), S = [];
            u.length || T();
            const _ = new Map, x = [];
            if (p !== "italic" && (p = "normal"), typeof v != "number" && (v = v === "bold" ? 700 : 400), h && !Array.isArray(h) && (h = [
                h
            ]), h = h.slice().filter((U)=>!U.lang || U.lang.test(c)).reverse(), h.length) {
                let N = 0;
                (function P(I = 0) {
                    for(let F = I, Y = u.length; F < Y; F++){
                        const L = u.codePointAt(F);
                        if (N === 1 && S[b[F - 1]].supportsCodePoint(L) || F > 0 && /\s/.test(u[F])) b[F] = b[F - 1], N === 2 && (x[x.length - 1][1] = F);
                        else for(let G = b[F], B = h.length; G <= B; G++)if (G === B) {
                            const K = N === 2 ? x[x.length - 1] : x[x.length] = [
                                F,
                                F
                            ];
                            K[1] = F, N = 2;
                        } else {
                            b[F] = G;
                            const { src: K, unicodeRange: ee } = h[G];
                            if (!ee || A(L, ee)) {
                                const ye = a[K];
                                if (!ye) {
                                    o(K, ()=>{
                                        P(F);
                                    });
                                    return;
                                }
                                if (ye.supportsCodePoint(L)) {
                                    let xe = _.get(ye);
                                    typeof xe != "number" && (xe = S.length, S.push(ye), _.set(ye, xe)), b[F] = xe, N = 1;
                                    break;
                                }
                            }
                        }
                        L > 65535 && F + 1 < Y && (b[F + 1] = b[F], F++, N === 2 && (x[x.length - 1][1] = F));
                    }
                    k();
                })();
            } else x.push([
                0,
                u.length - 1
            ]), k();
            function k() {
                if (x.length) {
                    const U = x.map((D)=>u.substring(D[0], D[1] + 1)).join(`
`);
                    e.getFontsForString(U, {
                        lang: c || void 0,
                        style: p,
                        weight: v,
                        dataUrl: y
                    }).then(({ fontUrls: D, chars: R })=>{
                        const N = S.length;
                        let P = 0;
                        x.forEach((F)=>{
                            for(let Y = 0, L = F[1] - F[0]; Y <= L; Y++)b[F[0] + Y] = R[P++] + N;
                            P++;
                        });
                        let I = 0;
                        D.forEach((F, Y)=>{
                            o(F, (L)=>{
                                S[Y + N] = L, ++I === D.length && T();
                            });
                        });
                    });
                } else T();
            }
            function T() {
                d({
                    chars: b,
                    fonts: S
                });
            }
            function A(U, D) {
                for(let R = 0; R < D.length; R++){
                    const [N, P = N] = D[R];
                    if (N <= U && U <= P) return !0;
                }
                return !1;
            }
        };
    }
    const cx = mo({
        name: "FontResolver",
        dependencies: [
            ux,
            sx,
            lx
        ],
        init (r, e, a) {
            return r(e, a());
        }
    });
    function fx(r, e) {
        const s = /[\u00AD\u034F\u061C\u115F-\u1160\u17B4-\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF0-\uFFF8]/, i = "[^\\S\\u00A0]", o = new RegExp(`${i}|[\\-\\u007C\\u00AD\\u2010\\u2012-\\u2014\\u2027\\u2056\\u2E17\\u2E40]`);
        function u({ text: S, lang: _, fonts: x, style: k, weight: T, preResolvedFonts: A, unicodeFontsURL: U }, D) {
            const R = ({ chars: N, fonts: P })=>{
                let I, F;
                const Y = [];
                for(let L = 0; L < N.length; L++)N[L] !== F ? (F = N[L], Y.push(I = {
                    start: L,
                    end: L,
                    fontObj: P[N[L]]
                })) : I.end = L;
                D(Y);
            };
            A ? R(A) : r(S, R, {
                lang: _,
                fonts: x,
                style: k,
                weight: T,
                unicodeFontsURL: U
            });
        }
        function d({ text: S = "", font: _, lang: x, sdfGlyphSize: k = 64, fontSize: T = 400, fontWeight: A = 1, fontStyle: U = "normal", letterSpacing: D = 0, lineHeight: R = "normal", maxWidth: N = 1 / 0, direction: P, textAlign: I = "left", textIndent: F = 0, whiteSpace: Y = "normal", overflowWrap: L = "normal", anchorX: G = 0, anchorY: B = 0, metricsOnly: K = !1, unicodeFontsURL: ee, preResolvedFonts: ye = null, includeCaretPositions: xe = !1, chunkedBoundsSize: te = 8192, colorRanges: q = null }, O) {
            const H = v(), X = {
                fontLoad: 0,
                typesetting: 0
            };
            S.indexOf("\r") > -1 && (console.info("Typesetter: got text with \\r chars; normalizing to \\n"), S = S.replace(/\r\n/g, `
`).replace(/\r/g, `
`)), T = +T, D = +D, N = +N, R = R || "normal", F = +F, u({
                text: S,
                lang: x,
                style: U,
                weight: A,
                fonts: typeof _ == "string" ? [
                    {
                        src: _
                    }
                ] : _,
                unicodeFontsURL: ee,
                preResolvedFonts: ye
            }, (Z)=>{
                X.fontLoad = v() - H;
                const $ = isFinite(N);
                let oe = null, ce = null, fe = null, Pe = null, Ie = null, he = null, pe = null, Ve = null, Xe = 0, Ae = 0, ze = Y !== "nowrap";
                const Ue = new Map, be = v();
                let Ne = F, Le = 0, me = new y;
                const Ke = [
                    me
                ];
                Z.forEach((Oe)=>{
                    const { fontObj: Ge } = Oe, { ascender: Be, descender: et, unitsPerEm: kt, lineGap: Nt, capHeight: st, xHeight: Qe } = Ge;
                    let Ze = Ue.get(Ge);
                    if (!Ze) {
                        const ue = T / kt, ot = R === "normal" ? (Be - et + Nt) * ue : R * T, Kt = (ot - (Be - et) * ue) / 2, Rt = Math.min(ot, (Be - et) * ue), ft = (Be + et) / 2 * ue + Rt / 2;
                        Ze = {
                            index: Ue.size,
                            src: Ge.src,
                            fontObj: Ge,
                            fontSizeMult: ue,
                            unitsPerEm: kt,
                            ascender: Be * ue,
                            descender: et * ue,
                            capHeight: st * ue,
                            xHeight: Qe * ue,
                            lineHeight: ot,
                            baseline: -Kt - Be * ue,
                            caretTop: ft,
                            caretBottom: ft - Rt
                        }, Ue.set(Ge, Ze);
                    }
                    const { fontSizeMult: W } = Ze, de = S.slice(Oe.start, Oe.end + 1);
                    let Re, qe;
                    Ge.forEachGlyph(de, T, D, (ue, ot, Kt, Rt)=>{
                        ot += Le, Rt += Oe.start, Re = ot, qe = ue;
                        const ft = S.charAt(Rt), Mt = ue.advanceWidth * W, yt = me.count;
                        let $e;
                        if ("isEmpty" in ue || (ue.isWhitespace = !!ft && new RegExp(i).test(ft), ue.canBreakAfter = !!ft && o.test(ft), ue.isEmpty = ue.xMin === ue.xMax || ue.yMin === ue.yMax || s.test(ft)), !ue.isWhitespace && !ue.isEmpty && Ae++, ze && $ && !ue.isWhitespace && ot + Mt + Ne > N && yt) {
                            if (me.glyphAt(yt - 1).glyphObj.canBreakAfter) $e = new y, Ne = -ot;
                            else for(let Yt = yt; Yt--;)if (Yt === 0 && L === "break-word") {
                                $e = new y, Ne = -ot;
                                break;
                            } else if (me.glyphAt(Yt).glyphObj.canBreakAfter) {
                                $e = me.splitAt(Yt + 1);
                                const Gt = $e.glyphAt(0).x;
                                Ne -= Gt;
                                for(let Vt = $e.count; Vt--;)$e.glyphAt(Vt).x -= Gt;
                                break;
                            }
                            $e && (me.isSoftWrapped = !0, me = $e, Ke.push(me), Xe = N);
                        }
                        let Ct = me.glyphAt(me.count);
                        Ct.glyphObj = ue, Ct.x = ot + Ne, Ct.y = Kt, Ct.width = Mt, Ct.charIndex = Rt, Ct.fontData = Ze, ft === `
` && (me = new y, Ke.push(me), Ne = -(ot + Mt + D * T) + F);
                    }), Le = Re + qe.advanceWidth * W + D * T;
                });
                let Se = 0;
                Ke.forEach((Oe)=>{
                    let Ge = !0;
                    for(let Be = Oe.count; Be--;){
                        const et = Oe.glyphAt(Be);
                        Ge && !et.glyphObj.isWhitespace && (Oe.width = et.x + et.width, Oe.width > Xe && (Xe = Oe.width), Ge = !1);
                        let { lineHeight: kt, capHeight: Nt, xHeight: st, baseline: Qe } = et.fontData;
                        kt > Oe.lineHeight && (Oe.lineHeight = kt);
                        const Ze = Qe - Oe.baseline;
                        Ze < 0 && (Oe.baseline += Ze, Oe.cap += Ze, Oe.ex += Ze), Oe.cap = Math.max(Oe.cap, Oe.baseline + Nt), Oe.ex = Math.max(Oe.ex, Oe.baseline + st);
                    }
                    Oe.baseline -= Se, Oe.cap -= Se, Oe.ex -= Se, Se += Oe.lineHeight;
                });
                let je = 0, Fe = 0;
                if (G && (typeof G == "number" ? je = -G : typeof G == "string" && (je = -Xe * (G === "left" ? 0 : G === "center" ? .5 : G === "right" ? 1 : h(G)))), B && (typeof B == "number" ? Fe = -B : typeof B == "string" && (Fe = B === "top" ? 0 : B === "top-baseline" ? -Ke[0].baseline : B === "top-cap" ? -Ke[0].cap : B === "top-ex" ? -Ke[0].ex : B === "middle" ? Se / 2 : B === "bottom" ? Se : B === "bottom-baseline" ? -Ke[Ke.length - 1].baseline : h(B) * Se)), !K) {
                    const Oe = e.getEmbeddingLevels(S, P);
                    oe = new Uint16Array(Ae), ce = new Uint8Array(Ae), fe = new Float32Array(Ae * 2), Pe = {}, pe = [
                        1 / 0,
                        1 / 0,
                        -1 / 0,
                        -1 / 0
                    ], Ve = [], xe && (he = new Float32Array(S.length * 4)), q && (Ie = new Uint8Array(Ae * 3));
                    let Ge = 0, Be = -1, et = -1, kt, Nt;
                    if (Ke.forEach((st, Qe)=>{
                        let { count: Ze, width: W } = st;
                        if (Ze > 0) {
                            let de = 0;
                            for(let Rt = Ze; Rt-- && st.glyphAt(Rt).glyphObj.isWhitespace;)de++;
                            let Re = 0, qe = 0;
                            if (I === "center") Re = (Xe - W) / 2;
                            else if (I === "right") Re = Xe - W;
                            else if (I === "justify" && st.isSoftWrapped) {
                                let Rt = 0;
                                for(let ft = Ze - de; ft--;)st.glyphAt(ft).glyphObj.isWhitespace && Rt++;
                                qe = (Xe - W) / Rt;
                            }
                            if (qe || Re) {
                                let Rt = 0;
                                for(let ft = 0; ft < Ze; ft++){
                                    let Mt = st.glyphAt(ft);
                                    const yt = Mt.glyphObj;
                                    Mt.x += Re + Rt, qe !== 0 && yt.isWhitespace && ft < Ze - de && (Rt += qe, Mt.width += qe);
                                }
                            }
                            const ue = e.getReorderSegments(S, Oe, st.glyphAt(0).charIndex, st.glyphAt(st.count - 1).charIndex);
                            for(let Rt = 0; Rt < ue.length; Rt++){
                                const [ft, Mt] = ue[Rt];
                                let yt = 1 / 0, $e = -1 / 0;
                                for(let Ct = 0; Ct < Ze; Ct++)if (st.glyphAt(Ct).charIndex >= ft) {
                                    let Yt = Ct, Gt = Ct;
                                    for(; Gt < Ze; Gt++){
                                        let Vt = st.glyphAt(Gt);
                                        if (Vt.charIndex > Mt) break;
                                        Gt < Ze - de && (yt = Math.min(yt, Vt.x), $e = Math.max($e, Vt.x + Vt.width));
                                    }
                                    for(let Vt = Yt; Vt < Gt; Vt++){
                                        const Sn = st.glyphAt(Vt);
                                        Sn.x = $e - (Sn.x + Sn.width - yt);
                                    }
                                    break;
                                }
                            }
                            let ot;
                            const Kt = (Rt)=>ot = Rt;
                            for(let Rt = 0; Rt < Ze; Rt++){
                                const ft = st.glyphAt(Rt);
                                ot = ft.glyphObj;
                                const Mt = ot.index, yt = Oe.levels[ft.charIndex] & 1;
                                if (yt) {
                                    const $e = e.getMirroredCharacter(S[ft.charIndex]);
                                    $e && ft.fontData.fontObj.forEachGlyph($e, 0, 0, Kt);
                                }
                                if (xe) {
                                    const { charIndex: $e, fontData: Ct } = ft, Yt = ft.x + je, Gt = ft.x + ft.width + je;
                                    he[$e * 4] = yt ? Gt : Yt, he[$e * 4 + 1] = yt ? Yt : Gt, he[$e * 4 + 2] = st.baseline + Ct.caretBottom + Fe, he[$e * 4 + 3] = st.baseline + Ct.caretTop + Fe;
                                    const Vt = $e - Be;
                                    Vt > 1 && p(he, Be, Vt), Be = $e;
                                }
                                if (q) {
                                    const { charIndex: $e } = ft;
                                    for(; $e > et;)et++, q.hasOwnProperty(et) && (Nt = q[et]);
                                }
                                if (!ot.isWhitespace && !ot.isEmpty) {
                                    const $e = Ge++, { fontSizeMult: Ct, src: Yt, index: Gt } = ft.fontData, Vt = Pe[Yt] || (Pe[Yt] = {});
                                    Vt[Mt] || (Vt[Mt] = {
                                        path: ot.path,
                                        pathBounds: [
                                            ot.xMin,
                                            ot.yMin,
                                            ot.xMax,
                                            ot.yMax
                                        ]
                                    });
                                    const Sn = ft.x + je, Dn = ft.y + st.baseline + Fe;
                                    fe[$e * 2] = Sn, fe[$e * 2 + 1] = Dn;
                                    const Un = Sn + ot.xMin * Ct, gn = Dn + ot.yMin * Ct, Mn = Sn + ot.xMax * Ct, Je = Dn + ot.yMax * Ct;
                                    Un < pe[0] && (pe[0] = Un), gn < pe[1] && (pe[1] = gn), Mn > pe[2] && (pe[2] = Mn), Je > pe[3] && (pe[3] = Je), $e % te === 0 && (kt = {
                                        start: $e,
                                        end: $e,
                                        rect: [
                                            1 / 0,
                                            1 / 0,
                                            -1 / 0,
                                            -1 / 0
                                        ]
                                    }, Ve.push(kt)), kt.end++;
                                    const sn = kt.rect;
                                    if (Un < sn[0] && (sn[0] = Un), gn < sn[1] && (sn[1] = gn), Mn > sn[2] && (sn[2] = Mn), Je > sn[3] && (sn[3] = Je), oe[$e] = Mt, ce[$e] = Gt, q) {
                                        const Kn = $e * 3;
                                        Ie[Kn] = Nt >> 16 & 255, Ie[Kn + 1] = Nt >> 8 & 255, Ie[Kn + 2] = Nt & 255;
                                    }
                                }
                            }
                        }
                    }), he) {
                        const st = S.length - Be;
                        st > 1 && p(he, Be, st);
                    }
                }
                const vt = [];
                Ue.forEach(({ index: Oe, src: Ge, unitsPerEm: Be, ascender: et, descender: kt, lineHeight: Nt, capHeight: st, xHeight: Qe })=>{
                    vt[Oe] = {
                        src: Ge,
                        unitsPerEm: Be,
                        ascender: et,
                        descender: kt,
                        lineHeight: Nt,
                        capHeight: st,
                        xHeight: Qe
                    };
                }), X.typesetting = v() - be, O({
                    glyphIds: oe,
                    glyphFontIndices: ce,
                    glyphPositions: fe,
                    glyphData: Pe,
                    fontData: vt,
                    caretPositions: he,
                    glyphColors: Ie,
                    chunkedBounds: Ve,
                    fontSize: T,
                    topBaseline: Fe + Ke[0].baseline,
                    blockBounds: [
                        je,
                        Fe - Se,
                        je + Xe,
                        Fe
                    ],
                    visibleBounds: pe,
                    timings: X
                });
            });
        }
        function c(S, _) {
            d({
                ...S,
                metricsOnly: !0
            }, (x)=>{
                const [k, T, A, U] = x.blockBounds;
                _({
                    width: A - k,
                    height: U - T
                });
            });
        }
        function h(S) {
            let _ = S.match(/^([\d.]+)%$/), x = _ ? parseFloat(_[1]) : NaN;
            return isNaN(x) ? 0 : x / 100;
        }
        function p(S, _, x) {
            const k = S[_ * 4], T = S[_ * 4 + 1], A = S[_ * 4 + 2], U = S[_ * 4 + 3], D = (T - k) / x;
            for(let R = 0; R < x; R++){
                const N = (_ + R) * 4;
                S[N] = k + D * R, S[N + 1] = k + D * (R + 1), S[N + 2] = A, S[N + 3] = U;
            }
        }
        function v() {
            return (self.performance || Date).now();
        }
        function y() {
            this.data = [];
        }
        const b = [
            "glyphObj",
            "x",
            "y",
            "width",
            "charIndex",
            "fontData"
        ];
        return y.prototype = {
            width: 0,
            lineHeight: 0,
            baseline: 0,
            cap: 0,
            ex: 0,
            isSoftWrapped: !1,
            get count () {
                return Math.ceil(this.data.length / b.length);
            },
            glyphAt (S) {
                let _ = y.flyweight;
                return _.data = this.data, _.index = S, _;
            },
            splitAt (S) {
                let _ = new y;
                return _.data = this.data.splice(S * b.length), _;
            }
        }, y.flyweight = b.reduce((S, _, x, k)=>(Object.defineProperty(S, _, {
                get () {
                    return this.data[this.index * b.length + x];
                },
                set (T) {
                    this.data[this.index * b.length + x] = T;
                }
            }), S), {
            data: null,
            index: 0
        }), {
            typeset: d,
            measure: c
        };
    }
    const ua = ()=>(self.performance || Date).now(), tu = Gg();
    let Gp;
    function dx(r, e, a, s, i, o, u, d, c, h, p = !0) {
        return p ? px(r, e, a, s, i, o, u, d, c, h).then(null, (v)=>(Gp || (console.warn("WebGL SDF generation failed, falling back to JS", v), Gp = !0), Wp(r, e, a, s, i, o, u, d, c, h))) : Wp(r, e, a, s, i, o, u, d, c, h);
    }
    const kl = [], hx = 5;
    let vf = 0;
    function Wg() {
        const r = ua();
        for(; kl.length && ua() - r < hx;)kl.shift()();
        vf = kl.length ? setTimeout(Wg, 0) : 0;
    }
    const px = (...r)=>new Promise((e, a)=>{
            kl.push(()=>{
                const s = ua();
                try {
                    tu.webgl.generateIntoCanvas(...r), e({
                        timing: ua() - s
                    });
                } catch (i) {
                    a(i);
                }
            }), vf || (vf = setTimeout(Wg, 0));
        }), mx = 4, gx = 2e3, Hp = {};
    let vx = 0;
    function Wp(r, e, a, s, i, o, u, d, c, h) {
        const p = "TroikaTextSDFGenerator_JS_" + vx++ % mx;
        let v = Hp[p];
        return v || (v = Hp[p] = {
            workerModule: mo({
                name: p,
                workerId: p,
                dependencies: [
                    Gg,
                    ua
                ],
                init (y, b) {
                    const S = y().javascript.generate;
                    return function(..._) {
                        const x = b();
                        return {
                            textureData: S(..._),
                            timing: b() - x
                        };
                    };
                },
                getTransferables (y) {
                    return [
                        y.textureData.buffer
                    ];
                }
            }),
            requests: 0,
            idleTimer: null
        }), v.requests++, clearTimeout(v.idleTimer), v.workerModule(r, e, a, s, i, o).then(({ textureData: y, timing: b })=>{
            const S = ua(), _ = new Uint8Array(y.length * 4);
            for(let x = 0; x < y.length; x++)_[x * 4 + h] = y[x];
            return tu.webglUtils.renderImageData(u, _, d, c, r, e, 1 << 3 - h), b += ua() - S, --v.requests === 0 && (v.idleTimer = setTimeout(()=>{
                qS(p);
            }, gx)), {
                timing: b
            };
        });
    }
    function yx(r) {
        r._warm || (tu.webgl.isSupported(r), r._warm = !0);
    }
    const bx = tu.webglUtils.resizeWebGLCanvasWithoutClearing, rs = {
        unicodeFontsURL: null,
        sdfGlyphSize: 64,
        sdfMargin: 1 / 16,
        sdfExponent: 9,
        textureWidth: 2048
    }, wx = new Fr;
    function Ja() {
        return (self.performance || Date).now();
    }
    const Vp = Object.create(null);
    function Vg(r, e) {
        r = _x({}, r);
        const a = Ja(), s = [];
        if (r.font && s.push({
            label: "user",
            src: Ex(r.font)
        }), r.font = s, r.text = "" + r.text, r.sdfGlyphSize = r.sdfGlyphSize || rs.sdfGlyphSize, r.unicodeFontsURL = r.unicodeFontsURL || rs.unicodeFontsURL, r.colorRanges != null) {
            let y = {};
            for(let b in r.colorRanges)if (r.colorRanges.hasOwnProperty(b)) {
                let S = r.colorRanges[b];
                typeof S != "number" && (S = wx.set(S).getHex()), y[b] = S;
            }
            r.colorRanges = y;
        }
        Object.freeze(r);
        const { textureWidth: i, sdfExponent: o } = rs, { sdfGlyphSize: u } = r, d = i / u * 4;
        let c = Vp[u];
        if (!c) {
            const y = document.createElement("canvas");
            y.width = i, y.height = u * 256 / d, c = Vp[u] = {
                glyphCount: 0,
                sdfGlyphSize: u,
                sdfCanvas: y,
                sdfTexture: new Ii(y, void 0, void 0, void 0, Hn, Hn),
                contextLost: !1,
                glyphsByFont: new Map
            }, c.sdfTexture.generateMipmaps = !1, Sx(c);
        }
        const { sdfTexture: h, sdfCanvas: p } = c;
        qg(r).then((y)=>{
            const { glyphIds: b, glyphFontIndices: S, fontData: _, glyphPositions: x, fontSize: k, timings: T } = y, A = [], U = new Float32Array(b.length * 4);
            let D = 0, R = 0;
            const N = Ja(), P = _.map((G)=>{
                let B = c.glyphsByFont.get(G.src);
                return B || c.glyphsByFont.set(G.src, B = new Map), B;
            });
            b.forEach((G, B)=>{
                const K = S[B], { src: ee, unitsPerEm: ye } = _[K];
                let xe = P[K].get(G);
                if (!xe) {
                    const { path: X, pathBounds: Z } = y.glyphData[ee][G], $ = Math.max(Z[2] - Z[0], Z[3] - Z[1]) / u * (rs.sdfMargin * u + .5), oe = c.glyphCount++, ce = [
                        Z[0] - $,
                        Z[1] - $,
                        Z[2] + $,
                        Z[3] + $
                    ];
                    P[K].set(G, xe = {
                        path: X,
                        atlasIndex: oe,
                        sdfViewBox: ce
                    }), A.push(xe);
                }
                const { sdfViewBox: te } = xe, q = x[R++], O = x[R++], H = k / ye;
                U[D++] = q + te[0] * H, U[D++] = O + te[1] * H, U[D++] = q + te[2] * H, U[D++] = O + te[3] * H, b[B] = xe.atlasIndex;
            }), T.quads = (T.quads || 0) + (Ja() - N);
            const I = Ja();
            T.sdf = {};
            const F = p.height, Y = Math.ceil(c.glyphCount / d), L = Math.pow(2, Math.ceil(Math.log2(Y * u)));
            L > F && (console.info(`Increasing SDF texture size ${F}->${L}`), bx(p, i, L), h.dispose()), Promise.all(A.map((G)=>Xg(G, c, r.gpuAccelerateSDF).then(({ timing: B })=>{
                    T.sdf[G.atlasIndex] = B;
                }))).then(()=>{
                A.length && !c.contextLost && (Yg(c), h.needsUpdate = !0), T.sdfTotal = Ja() - I, T.total = Ja() - a, e(Object.freeze({
                    parameters: r,
                    sdfTexture: h,
                    sdfGlyphSize: u,
                    sdfExponent: o,
                    glyphBounds: U,
                    glyphAtlasIndices: b,
                    glyphColors: y.glyphColors,
                    caretPositions: y.caretPositions,
                    chunkedBounds: y.chunkedBounds,
                    ascender: y.ascender,
                    descender: y.descender,
                    lineHeight: y.lineHeight,
                    capHeight: y.capHeight,
                    xHeight: y.xHeight,
                    topBaseline: y.topBaseline,
                    blockBounds: y.blockBounds,
                    visibleBounds: y.visibleBounds,
                    timings: y.timings
                }));
            });
        }), Promise.resolve().then(()=>{
            c.contextLost || yx(p);
        });
    }
    function Xg({ path: r, atlasIndex: e, sdfViewBox: a }, { sdfGlyphSize: s, sdfCanvas: i, contextLost: o }, u) {
        if (o) return Promise.resolve({
            timing: -1
        });
        const { textureWidth: d, sdfExponent: c } = rs, h = Math.max(a[2] - a[0], a[3] - a[1]), p = Math.floor(e / 4), v = p % (d / s) * s, y = Math.floor(p / (d / s)) * s, b = e % 4;
        return dx(s, s, r, a, h, c, i, v, y, b, u);
    }
    function Sx(r) {
        const e = r.sdfCanvas;
        e.addEventListener("webglcontextlost", (a)=>{
            console.log("Context Lost", a), a.preventDefault(), r.contextLost = !0;
        }), e.addEventListener("webglcontextrestored", (a)=>{
            console.log("Context Restored", a), r.contextLost = !1;
            const s = [];
            r.glyphsByFont.forEach((i)=>{
                i.forEach((o)=>{
                    s.push(Xg(o, r, !0));
                });
            }), Promise.all(s).then(()=>{
                Yg(r), r.sdfTexture.needsUpdate = !0;
            });
        });
    }
    function xx({ font: r, characters: e, sdfGlyphSize: a }, s) {
        let i = Array.isArray(e) ? e.join(`
`) : "" + e;
        Vg({
            font: r,
            sdfGlyphSize: a,
            text: i
        }, s);
    }
    function _x(r, e) {
        for(let a in e)e.hasOwnProperty(a) && (r[a] = e[a]);
        return r;
    }
    let dl;
    function Ex(r) {
        return dl || (dl = typeof document > "u" ? {} : document.createElement("a")), dl.href = r, dl.href;
    }
    function Yg(r) {
        if (typeof createImageBitmap != "function") {
            console.info("Safari<15: applying SDF canvas workaround");
            const { sdfCanvas: e, sdfTexture: a } = r, { width: s, height: i } = e, o = r.sdfCanvas.getContext("webgl");
            let u = a.image.data;
            (!u || u.length !== s * i * 4) && (u = new Uint8Array(s * i * 4), a.image = {
                width: s,
                height: i,
                data: u
            }, a.flipY = !1, a.isDataTexture = !0), o.readPixels(0, 0, s, i, o.RGBA, o.UNSIGNED_BYTE, u);
        }
    }
    const Mx = mo({
        name: "Typesetter",
        dependencies: [
            fx,
            cx,
            QS
        ],
        init (r, e, a) {
            return r(e, a());
        }
    }), qg = mo({
        name: "Typesetter",
        dependencies: [
            Mx
        ],
        init (r) {
            return function(e) {
                return new Promise((a)=>{
                    r.typeset(e, a);
                });
            };
        },
        getTransferables (r) {
            const e = [];
            for(let a in r)r[a] && r[a].buffer && e.push(r[a].buffer);
            return e;
        }
    });
    qg.onMainThread;
    const Xp = {};
    function Cx(r) {
        let e = Xp[r];
        return e || (e = Xp[r] = new Li(1, 1, r, r).translate(.5, .5, 0)), e;
    }
    const Tx = "aTroikaGlyphBounds", Yp = "aTroikaGlyphIndex", Px = "aTroikaGlyphColor";
    class kx extends iy {
        constructor(){
            super(), this.detail = 1, this.curveRadius = 0, this.groups = [
                {
                    start: 0,
                    count: 1 / 0,
                    materialIndex: 0
                },
                {
                    start: 0,
                    count: 1 / 0,
                    materialIndex: 1
                }
            ], this.boundingSphere = new Ef, this.boundingBox = new ay;
        }
        computeBoundingSphere() {}
        computeBoundingBox() {}
        set detail(e) {
            if (e !== this._detail) {
                this._detail = e, (typeof e != "number" || e < 1) && (e = 1);
                let a = Cx(e);
                [
                    "position",
                    "normal",
                    "uv"
                ].forEach((s)=>{
                    this.attributes[s] = a.attributes[s].clone();
                }), this.setIndex(a.getIndex().clone());
            }
        }
        get detail() {
            return this._detail;
        }
        set curveRadius(e) {
            e !== this._curveRadius && (this._curveRadius = e, this._updateBounds());
        }
        get curveRadius() {
            return this._curveRadius;
        }
        updateGlyphs(e, a, s, i, o) {
            this.updateAttributeData(Tx, e, 4), this.updateAttributeData(Yp, a, 1), this.updateAttributeData(Px, o, 3), this._blockBounds = s, this._chunkedBounds = i, this.instanceCount = a.length, this._updateBounds();
        }
        _updateBounds() {
            const e = this._blockBounds;
            if (e) {
                const { curveRadius: a, boundingBox: s } = this;
                if (a) {
                    const { PI: i, floor: o, min: u, max: d, sin: c, cos: h } = Math, p = i / 2, v = i * 2, y = Math.abs(a), b = e[0] / y, S = e[2] / y, _ = o((b + p) / v) !== o((S + p) / v) ? -y : u(c(b) * y, c(S) * y), x = o((b - p) / v) !== o((S - p) / v) ? y : d(c(b) * y, c(S) * y), k = o((b + i) / v) !== o((S + i) / v) ? y * 2 : d(y - h(b) * y, y - h(S) * y);
                    s.min.set(_, e[1], a < 0 ? -k : 0), s.max.set(x, e[3], a < 0 ? 0 : k);
                } else s.min.set(e[0], e[1], 0), s.max.set(e[2], e[3], 0);
                s.getBoundingSphere(this.boundingSphere);
            }
        }
        applyClipRect(e) {
            let a = this.getAttribute(Yp).count, s = this._chunkedBounds;
            if (s) for(let i = s.length; i--;){
                a = s[i].end;
                let o = s[i].rect;
                if (o[1] < e.w && o[3] > e.y && o[0] < e.z && o[2] > e.x) break;
            }
            this.instanceCount = a;
        }
        updateAttributeData(e, a, s) {
            const i = this.getAttribute(e);
            a ? i && i.array.length === a.length ? (i.array.set(a), i.needsUpdate = !0) : (this.setAttribute(e, new oy(a, s)), delete this._maxInstanceCount, this.dispose()) : i && this.deleteAttribute(e);
        }
    }
    const Rx = `
uniform vec2 uTroikaSDFTextureSize;
uniform float uTroikaSDFGlyphSize;
uniform vec4 uTroikaTotalBounds;
uniform vec4 uTroikaClipRect;
uniform mat3 uTroikaOrient;
uniform bool uTroikaUseGlyphColors;
uniform float uTroikaEdgeOffset;
uniform float uTroikaBlurRadius;
uniform vec2 uTroikaPositionOffset;
uniform float uTroikaCurveRadius;
attribute vec4 aTroikaGlyphBounds;
attribute float aTroikaGlyphIndex;
attribute vec3 aTroikaGlyphColor;
varying vec2 vTroikaGlyphUV;
varying vec4 vTroikaTextureUVBounds;
varying float vTroikaTextureChannel;
varying vec3 vTroikaGlyphColor;
varying vec2 vTroikaGlyphDimensions;
`, Ix = `
vec4 bounds = aTroikaGlyphBounds;
bounds.xz += uTroikaPositionOffset.x;
bounds.yw -= uTroikaPositionOffset.y;

vec4 outlineBounds = vec4(
  bounds.xy - uTroikaEdgeOffset - uTroikaBlurRadius,
  bounds.zw + uTroikaEdgeOffset + uTroikaBlurRadius
);
vec4 clippedBounds = vec4(
  clamp(outlineBounds.xy, uTroikaClipRect.xy, uTroikaClipRect.zw),
  clamp(outlineBounds.zw, uTroikaClipRect.xy, uTroikaClipRect.zw)
);

vec2 clippedXY = (mix(clippedBounds.xy, clippedBounds.zw, position.xy) - bounds.xy) / (bounds.zw - bounds.xy);

position.xy = mix(bounds.xy, bounds.zw, clippedXY);

uv = (position.xy - uTroikaTotalBounds.xy) / (uTroikaTotalBounds.zw - uTroikaTotalBounds.xy);

float rad = uTroikaCurveRadius;
if (rad != 0.0) {
  float angle = position.x / rad;
  position.xz = vec2(sin(angle) * rad, rad - cos(angle) * rad);
  normal.xz = vec2(sin(angle), cos(angle));
}
  
position = uTroikaOrient * position;
normal = uTroikaOrient * normal;

vTroikaGlyphUV = clippedXY.xy;
vTroikaGlyphDimensions = vec2(bounds[2] - bounds[0], bounds[3] - bounds[1]);


float txCols = uTroikaSDFTextureSize.x / uTroikaSDFGlyphSize;
vec2 txUvPerSquare = uTroikaSDFGlyphSize / uTroikaSDFTextureSize;
vec2 txStartUV = txUvPerSquare * vec2(
  mod(floor(aTroikaGlyphIndex / 4.0), txCols),
  floor(floor(aTroikaGlyphIndex / 4.0) / txCols)
);
vTroikaTextureUVBounds = vec4(txStartUV, vec2(txStartUV) + txUvPerSquare);
vTroikaTextureChannel = mod(aTroikaGlyphIndex, 4.0);
`, Ax = `
uniform sampler2D uTroikaSDFTexture;
uniform vec2 uTroikaSDFTextureSize;
uniform float uTroikaSDFGlyphSize;
uniform float uTroikaSDFExponent;
uniform float uTroikaEdgeOffset;
uniform float uTroikaFillOpacity;
uniform float uTroikaBlurRadius;
uniform vec3 uTroikaStrokeColor;
uniform float uTroikaStrokeWidth;
uniform float uTroikaStrokeOpacity;
uniform bool uTroikaSDFDebug;
varying vec2 vTroikaGlyphUV;
varying vec4 vTroikaTextureUVBounds;
varying float vTroikaTextureChannel;
varying vec2 vTroikaGlyphDimensions;

float troikaSdfValueToSignedDistance(float alpha) {
  // Inverse of exponential encoding in webgl-sdf-generator
  
  float maxDimension = max(vTroikaGlyphDimensions.x, vTroikaGlyphDimensions.y);
  float absDist = (1.0 - pow(2.0 * (alpha > 0.5 ? 1.0 - alpha : alpha), 1.0 / uTroikaSDFExponent)) * maxDimension;
  float signedDist = absDist * (alpha > 0.5 ? -1.0 : 1.0);
  return signedDist;
}

float troikaGlyphUvToSdfValue(vec2 glyphUV) {
  vec2 textureUV = mix(vTroikaTextureUVBounds.xy, vTroikaTextureUVBounds.zw, glyphUV);
  vec4 rgba = texture2D(uTroikaSDFTexture, textureUV);
  float ch = floor(vTroikaTextureChannel + 0.5); //NOTE: can't use round() in WebGL1
  return ch == 0.0 ? rgba.r : ch == 1.0 ? rgba.g : ch == 2.0 ? rgba.b : rgba.a;
}

float troikaGlyphUvToDistance(vec2 uv) {
  return troikaSdfValueToSignedDistance(troikaGlyphUvToSdfValue(uv));
}

float troikaGetAADist() {
  
  #if defined(GL_OES_standard_derivatives) || __VERSION__ >= 300
  return length(fwidth(vTroikaGlyphUV * vTroikaGlyphDimensions)) * 0.5;
  #else
  return vTroikaGlyphDimensions.x / 64.0;
  #endif
}

float troikaGetFragDistValue() {
  vec2 clampedGlyphUV = clamp(vTroikaGlyphUV, 0.5 / uTroikaSDFGlyphSize, 1.0 - 0.5 / uTroikaSDFGlyphSize);
  float distance = troikaGlyphUvToDistance(clampedGlyphUV);
 
  // Extrapolate distance when outside bounds:
  distance += clampedGlyphUV == vTroikaGlyphUV ? 0.0 : 
    length((vTroikaGlyphUV - clampedGlyphUV) * vTroikaGlyphDimensions);

  

  return distance;
}

float troikaGetEdgeAlpha(float distance, float distanceOffset, float aaDist) {
  #if defined(IS_DEPTH_MATERIAL) || defined(IS_DISTANCE_MATERIAL)
  float alpha = step(-distanceOffset, -distance);
  #else

  float alpha = smoothstep(
    distanceOffset + aaDist,
    distanceOffset - aaDist,
    distance
  );
  #endif

  return alpha;
}
`, Fx = `
float aaDist = troikaGetAADist();
float fragDistance = troikaGetFragDistValue();
float edgeAlpha = uTroikaSDFDebug ?
  troikaGlyphUvToSdfValue(vTroikaGlyphUV) :
  troikaGetEdgeAlpha(fragDistance, uTroikaEdgeOffset, max(aaDist, uTroikaBlurRadius));

#if !defined(IS_DEPTH_MATERIAL) && !defined(IS_DISTANCE_MATERIAL)
vec4 fillRGBA = gl_FragColor;
fillRGBA.a *= uTroikaFillOpacity;
vec4 strokeRGBA = uTroikaStrokeWidth == 0.0 ? fillRGBA : vec4(uTroikaStrokeColor, uTroikaStrokeOpacity);
if (fillRGBA.a == 0.0) fillRGBA.rgb = strokeRGBA.rgb;
gl_FragColor = mix(fillRGBA, strokeRGBA, smoothstep(
  -uTroikaStrokeWidth - aaDist,
  -uTroikaStrokeWidth + aaDist,
  fragDistance
));
gl_FragColor.a *= edgeAlpha;
#endif

if (edgeAlpha == 0.0) {
  discard;
}
`;
    function Dx(r) {
        const e = gf(r, {
            chained: !0,
            extensions: {
                derivatives: !0
            },
            uniforms: {
                uTroikaSDFTexture: {
                    value: null
                },
                uTroikaSDFTextureSize: {
                    value: new Ft
                },
                uTroikaSDFGlyphSize: {
                    value: 0
                },
                uTroikaSDFExponent: {
                    value: 0
                },
                uTroikaTotalBounds: {
                    value: new Fl(0, 0, 0, 0)
                },
                uTroikaClipRect: {
                    value: new Fl(0, 0, 0, 0)
                },
                uTroikaEdgeOffset: {
                    value: 0
                },
                uTroikaFillOpacity: {
                    value: 1
                },
                uTroikaPositionOffset: {
                    value: new Ft
                },
                uTroikaCurveRadius: {
                    value: 0
                },
                uTroikaBlurRadius: {
                    value: 0
                },
                uTroikaStrokeWidth: {
                    value: 0
                },
                uTroikaStrokeColor: {
                    value: new Fr
                },
                uTroikaStrokeOpacity: {
                    value: 1
                },
                uTroikaOrient: {
                    value: new sy
                },
                uTroikaUseGlyphColors: {
                    value: !0
                },
                uTroikaSDFDebug: {
                    value: !1
                }
            },
            vertexDefs: Rx,
            vertexTransform: Ix,
            fragmentDefs: Ax,
            fragmentColorTransform: Fx,
            customRewriter ({ vertexShader: a, fragmentShader: s }) {
                let i = /\buniform\s+vec3\s+diffuse\b/;
                return i.test(s) && (s = s.replace(i, "varying vec3 vTroikaGlyphColor").replace(/\bdiffuse\b/g, "vTroikaGlyphColor"), i.test(a) || (a = a.replace(Hg, `uniform vec3 diffuse;
$&
vTroikaGlyphColor = uTroikaUseGlyphColors ? aTroikaGlyphColor / 255.0 : diffuse;
`))), {
                    vertexShader: a,
                    fragmentShader: s
                };
            }
        });
        return e.transparent = !0, e.forceSinglePass = !0, Object.defineProperties(e, {
            isTroikaTextMaterial: {
                value: !0
            },
            shadowSide: {
                get () {
                    return this.side;
                },
                set () {}
            }
        }), e;
    }
    const Uf = new ql({
        color: 16777215,
        side: xf,
        transparent: !0
    }), qp = 8421504, Zp = new Yn, hl = new ke, zc = new ke, Zo = [], Ux = new ke, Nc = "+x+y";
    function Qp(r) {
        return Array.isArray(r) ? r[0] : r;
    }
    let Zg = ()=>{
        const r = new Xn(new Li(1, 1), Uf);
        return Zg = ()=>r, r;
    }, Qg = ()=>{
        const r = new Xn(new Li(1, 1, 32, 1), Uf);
        return Qg = ()=>r, r;
    };
    const Ox = {
        type: "syncstart"
    }, Lx = {
        type: "synccomplete"
    }, Kg = [
        "font",
        "fontSize",
        "fontStyle",
        "fontWeight",
        "lang",
        "letterSpacing",
        "lineHeight",
        "maxWidth",
        "overflowWrap",
        "text",
        "direction",
        "textAlign",
        "textIndent",
        "whiteSpace",
        "anchorX",
        "anchorY",
        "colorRanges",
        "sdfGlyphSize"
    ], zx = Kg.concat("material", "color", "depthOffset", "clipRect", "curveRadius", "orientation", "glyphGeometryDetail");
    let $g = class extends Xn {
        constructor(){
            const e = new kx;
            super(e, null), this.text = "", this.anchorX = 0, this.anchorY = 0, this.curveRadius = 0, this.direction = "auto", this.font = null, this.unicodeFontsURL = null, this.fontSize = .1, this.fontWeight = "normal", this.fontStyle = "normal", this.lang = null, this.letterSpacing = 0, this.lineHeight = "normal", this.maxWidth = 1 / 0, this.overflowWrap = "normal", this.textAlign = "left", this.textIndent = 0, this.whiteSpace = "normal", this.material = null, this.color = null, this.colorRanges = null, this.outlineWidth = 0, this.outlineColor = 0, this.outlineOpacity = 1, this.outlineBlur = 0, this.outlineOffsetX = 0, this.outlineOffsetY = 0, this.strokeWidth = 0, this.strokeColor = qp, this.strokeOpacity = 1, this.fillOpacity = 1, this.depthOffset = 0, this.clipRect = null, this.orientation = Nc, this.glyphGeometryDetail = 1, this.sdfGlyphSize = null, this.gpuAccelerateSDF = !0, this.debugSDF = !1;
        }
        sync(e) {
            this._needsSync && (this._needsSync = !1, this._isSyncing ? (this._queuedSyncs || (this._queuedSyncs = [])).push(e) : (this._isSyncing = !0, this.dispatchEvent(Ox), Vg({
                text: this.text,
                font: this.font,
                lang: this.lang,
                fontSize: this.fontSize || .1,
                fontWeight: this.fontWeight || "normal",
                fontStyle: this.fontStyle || "normal",
                letterSpacing: this.letterSpacing || 0,
                lineHeight: this.lineHeight || "normal",
                maxWidth: this.maxWidth,
                direction: this.direction || "auto",
                textAlign: this.textAlign,
                textIndent: this.textIndent,
                whiteSpace: this.whiteSpace,
                overflowWrap: this.overflowWrap,
                anchorX: this.anchorX,
                anchorY: this.anchorY,
                colorRanges: this.colorRanges,
                includeCaretPositions: !0,
                sdfGlyphSize: this.sdfGlyphSize,
                gpuAccelerateSDF: this.gpuAccelerateSDF,
                unicodeFontsURL: this.unicodeFontsURL
            }, (a)=>{
                this._isSyncing = !1, this._textRenderInfo = a, this.geometry.updateGlyphs(a.glyphBounds, a.glyphAtlasIndices, a.blockBounds, a.chunkedBounds, a.glyphColors);
                const s = this._queuedSyncs;
                s && (this._queuedSyncs = null, this._needsSync = !0, this.sync(()=>{
                    s.forEach((i)=>i && i());
                })), this.dispatchEvent(Lx), e && e();
            })));
        }
        onBeforeRender(e, a, s, i, o, u) {
            this.sync(), o.isTroikaTextMaterial && this._prepareForRender(o);
        }
        dispose() {
            this.geometry.dispose();
        }
        get textRenderInfo() {
            return this._textRenderInfo || null;
        }
        createDerivedMaterial(e) {
            return Dx(e);
        }
        get material() {
            let e = this._derivedMaterial;
            const a = this._baseMaterial || this._defaultMaterial || (this._defaultMaterial = Uf.clone());
            if ((!e || !e.isDerivedFrom(a)) && (e = this._derivedMaterial = this.createDerivedMaterial(a), a.addEventListener("dispose", function s() {
                a.removeEventListener("dispose", s), e.dispose();
            })), this.hasOutline()) {
                let s = e._outlineMtl;
                return s || (s = e._outlineMtl = Object.create(e, {
                    id: {
                        value: e.id + .1
                    }
                }), s.isTextOutlineMaterial = !0, s.depthWrite = !1, s.map = null, e.addEventListener("dispose", function i() {
                    e.removeEventListener("dispose", i), s.dispose();
                })), [
                    s,
                    e
                ];
            } else return e;
        }
        set material(e) {
            e && e.isTroikaTextMaterial ? (this._derivedMaterial = e, this._baseMaterial = e.baseMaterial) : this._baseMaterial = e;
        }
        hasOutline() {
            return !!(this.outlineWidth || this.outlineBlur || this.outlineOffsetX || this.outlineOffsetY);
        }
        get glyphGeometryDetail() {
            return this.geometry.detail;
        }
        set glyphGeometryDetail(e) {
            this.geometry.detail = e;
        }
        get curveRadius() {
            return this.geometry.curveRadius;
        }
        set curveRadius(e) {
            this.geometry.curveRadius = e;
        }
        get customDepthMaterial() {
            return Qp(this.material).getDepthMaterial();
        }
        set customDepthMaterial(e) {}
        get customDistanceMaterial() {
            return Qp(this.material).getDistanceMaterial();
        }
        set customDistanceMaterial(e) {}
        _prepareForRender(e) {
            const a = e.isTextOutlineMaterial, s = e.uniforms, i = this.textRenderInfo;
            if (i) {
                const { sdfTexture: d, blockBounds: c } = i;
                s.uTroikaSDFTexture.value = d, s.uTroikaSDFTextureSize.value.set(d.image.width, d.image.height), s.uTroikaSDFGlyphSize.value = i.sdfGlyphSize, s.uTroikaSDFExponent.value = i.sdfExponent, s.uTroikaTotalBounds.value.fromArray(c), s.uTroikaUseGlyphColors.value = !a && !!i.glyphColors;
                let h = 0, p = 0, v = 0, y, b, S, _ = 0, x = 0;
                if (a) {
                    let { outlineWidth: T, outlineOffsetX: A, outlineOffsetY: U, outlineBlur: D, outlineOpacity: R } = this;
                    h = this._parsePercent(T) || 0, p = Math.max(0, this._parsePercent(D) || 0), y = R, _ = this._parsePercent(A) || 0, x = this._parsePercent(U) || 0;
                } else v = Math.max(0, this._parsePercent(this.strokeWidth) || 0), v && (S = this.strokeColor, s.uTroikaStrokeColor.value.set(S ?? qp), b = this.strokeOpacity, b == null && (b = 1)), y = this.fillOpacity;
                s.uTroikaEdgeOffset.value = h, s.uTroikaPositionOffset.value.set(_, x), s.uTroikaBlurRadius.value = p, s.uTroikaStrokeWidth.value = v, s.uTroikaStrokeOpacity.value = b, s.uTroikaFillOpacity.value = y ?? 1, s.uTroikaCurveRadius.value = this.curveRadius || 0;
                let k = this.clipRect;
                if (k && Array.isArray(k) && k.length === 4) s.uTroikaClipRect.value.fromArray(k);
                else {
                    const T = (this.fontSize || .1) * 100;
                    s.uTroikaClipRect.value.set(c[0] - T, c[1] - T, c[2] + T, c[3] + T);
                }
                this.geometry.applyClipRect(s.uTroikaClipRect.value);
            }
            s.uTroikaSDFDebug.value = !!this.debugSDF, e.polygonOffset = !!this.depthOffset, e.polygonOffsetFactor = e.polygonOffsetUnits = this.depthOffset || 0;
            const o = a ? this.outlineColor || 0 : this.color;
            if (o == null) delete e.color;
            else {
                const d = e.hasOwnProperty("color") ? e.color : e.color = new Fr;
                (o !== d._input || typeof o == "object") && d.set(d._input = o);
            }
            let u = this.orientation || Nc;
            if (u !== e._orientation) {
                let d = s.uTroikaOrient.value;
                u = u.replace(/[^-+xyz]/g, "");
                let c = u !== Nc && u.match(/^([-+])([xyz])([-+])([xyz])$/);
                if (c) {
                    let [, h, p, v, y] = c;
                    hl.set(0, 0, 0)[p] = h === "-" ? 1 : -1, zc.set(0, 0, 0)[y] = v === "-" ? -1 : 1, Zp.lookAt(Ux, hl.cross(zc), zc), d.setFromMatrix4(Zp);
                } else d.identity();
                e._orientation = u;
            }
        }
        _parsePercent(e) {
            if (typeof e == "string") {
                let a = e.match(/^(-?[\d.]+)%$/), s = a ? parseFloat(a[1]) : NaN;
                e = (isNaN(s) ? 0 : s / 100) * this.fontSize;
            }
            return e;
        }
        localPositionToTextCoords(e, a = new Ft) {
            a.copy(e);
            const s = this.curveRadius;
            return s && (a.x = Math.atan2(e.x, Math.abs(s) - Math.abs(e.z)) * Math.abs(s)), a;
        }
        worldPositionToTextCoords(e, a = new Ft) {
            return hl.copy(e), this.localPositionToTextCoords(this.worldToLocal(hl), a);
        }
        raycast(e, a) {
            const { textRenderInfo: s, curveRadius: i } = this;
            if (s) {
                const o = s.blockBounds, u = i ? Qg() : Zg(), d = u.geometry, { position: c, uv: h } = d.attributes;
                for(let p = 0; p < h.count; p++){
                    let v = o[0] + h.getX(p) * (o[2] - o[0]);
                    const y = o[1] + h.getY(p) * (o[3] - o[1]);
                    let b = 0;
                    i && (b = i - Math.cos(v / i) * i, v = Math.sin(v / i) * i), c.setXYZ(p, v, y, b);
                }
                d.boundingSphere = this.geometry.boundingSphere, d.boundingBox = this.geometry.boundingBox, u.matrixWorld = this.matrixWorld, u.material.side = this.material.side, Zo.length = 0, u.raycast(e, Zo);
                for(let p = 0; p < Zo.length; p++)Zo[p].object = this, a.push(Zo[p]);
            }
        }
        copy(e) {
            const a = this.geometry;
            return super.copy(e), this.geometry = a, zx.forEach((s)=>{
                this[s] = e[s];
            }), this;
        }
        clone() {
            return new this.constructor().copy(this);
        }
    };
    Kg.forEach((r)=>{
        const e = "_private_" + r;
        Object.defineProperty($g.prototype, r, {
            get () {
                return this[e];
            },
            set (a) {
                a !== this[e] && (this[e] = a, this._needsSync = !0);
            }
        });
    });
    new Fr;
    MM = M.forwardRef(({ sdfGlyphSize: r = 64, anchorX: e = "center", anchorY: a = "middle", font: s, fontSize: i = 1, children: o, characters: u, onSync: d, ...c }, h)=>{
        const p = Et(({ invalidate: S })=>S), [v] = M.useState(()=>new $g), [y, b] = M.useMemo(()=>{
            const S = [];
            let _ = "";
            return M.Children.forEach(o, (x)=>{
                typeof x == "string" || typeof x == "number" ? _ += x : S.push(x);
            }), [
                S,
                _
            ];
        }, [
            o
        ]);
        return Cf(()=>new Promise((S)=>xx({
                    font: s,
                    characters: u
                }, S)), [
            "troika-text",
            s,
            u
        ]), M.useLayoutEffect(()=>void v.sync(()=>{
                p(), d && d(v);
            })), M.useEffect(()=>()=>v.dispose(), [
            v
        ]), M.createElement("primitive", un({
            object: v,
            ref: h,
            font: s,
            text: b,
            anchorX: e,
            anchorY: a,
            fontSize: i,
            sdfGlyphSize: r
        }, c), y);
    });
    function Nx(r, e, a, s) {
        var i;
        return i = class extends Oi {
            constructor(o){
                super({
                    vertexShader: e,
                    fragmentShader: a,
                    ...o
                });
                for(const u in r)this.uniforms[u] = new ly(r[u]), Object.defineProperty(this, u, {
                    get () {
                        return this.uniforms[u].value;
                    },
                    set (d) {
                        this.uniforms[u].value = d;
                    }
                });
                this.uniforms = Km.clone(this.uniforms);
            }
        }, i.key = uy.generateUUID(), i;
    }
    const jx = ()=>parseInt(_f.replace(/\D+/g, "")), Bx = jx();
    var Gx = Object.defineProperty, Hx = (r, e, a)=>e in r ? Gx(r, e, {
            enumerable: !0,
            configurable: !0,
            writable: !0,
            value: a
        }) : r[e] = a, zt = (r, e, a)=>(Hx(r, typeof e != "symbol" ? e + "" : e, a), a);
    function jc(r, e, a, s, i) {
        let o;
        if (r = r.subarray || r.slice ? r : r.buffer, a = a.subarray || a.slice ? a : a.buffer, r = e ? r.subarray ? r.subarray(e, i && e + i) : r.slice(e, i && e + i) : r, a.set) a.set(r, s);
        else for(o = 0; o < r.length; o++)a[o + s] = r[o];
        return a;
    }
    function Wx(r) {
        return r instanceof Float32Array ? r : r instanceof Zl ? r.getAttribute("position").array : r.map((e)=>{
            const a = Array.isArray(e);
            return e instanceof ke ? [
                e.x,
                e.y,
                e.z
            ] : e instanceof Ft ? [
                e.x,
                e.y,
                0
            ] : a && e.length === 3 ? [
                e[0],
                e[1],
                e[2]
            ] : a && e.length === 2 ? [
                e[0],
                e[1],
                0
            ] : e;
        }).flat();
    }
    class Vx extends Zl {
        constructor(){
            super(), zt(this, "type", "MeshLine"), zt(this, "isMeshLine", !0), zt(this, "positions", []), zt(this, "previous", []), zt(this, "next", []), zt(this, "side", []), zt(this, "width", []), zt(this, "indices_array", []), zt(this, "uvs", []), zt(this, "counters", []), zt(this, "widthCallback", null), zt(this, "_attributes"), zt(this, "_points", []), zt(this, "points"), zt(this, "matrixWorld", new Yn), Object.defineProperties(this, {
                points: {
                    enumerable: !0,
                    get () {
                        return this._points;
                    },
                    set (e) {
                        this.setPoints(e, this.widthCallback);
                    }
                }
            });
        }
        setMatrixWorld(e) {
            this.matrixWorld = e;
        }
        setPoints(e, a) {
            if (e = Wx(e), this._points = e, this.widthCallback = a ?? null, this.positions = [], this.counters = [], e.length && e[0] instanceof ke) for(let s = 0; s < e.length; s++){
                const i = e[s], o = s / (e.length - 1);
                this.positions.push(i.x, i.y, i.z), this.positions.push(i.x, i.y, i.z), this.counters.push(o), this.counters.push(o);
            }
            else for(let s = 0; s < e.length; s += 3){
                const i = s / (e.length - 1);
                this.positions.push(e[s], e[s + 1], e[s + 2]), this.positions.push(e[s], e[s + 1], e[s + 2]), this.counters.push(i), this.counters.push(i);
            }
            this.process();
        }
        compareV3(e, a) {
            const s = e * 6, i = a * 6;
            return this.positions[s] === this.positions[i] && this.positions[s + 1] === this.positions[i + 1] && this.positions[s + 2] === this.positions[i + 2];
        }
        copyV3(e) {
            const a = e * 6;
            return [
                this.positions[a],
                this.positions[a + 1],
                this.positions[a + 2]
            ];
        }
        process() {
            const e = this.positions.length / 6;
            this.previous = [], this.next = [], this.side = [], this.width = [], this.indices_array = [], this.uvs = [];
            let a, s;
            this.compareV3(0, e - 1) ? s = this.copyV3(e - 2) : s = this.copyV3(0), this.previous.push(s[0], s[1], s[2]), this.previous.push(s[0], s[1], s[2]);
            for(let i = 0; i < e; i++){
                if (this.side.push(1), this.side.push(-1), this.widthCallback ? a = this.widthCallback(i / (e - 1)) : a = 1, this.width.push(a), this.width.push(a), this.uvs.push(i / (e - 1), 0), this.uvs.push(i / (e - 1), 1), i < e - 1) {
                    s = this.copyV3(i), this.previous.push(s[0], s[1], s[2]), this.previous.push(s[0], s[1], s[2]);
                    const o = i * 2;
                    this.indices_array.push(o, o + 1, o + 2), this.indices_array.push(o + 2, o + 1, o + 3);
                }
                i > 0 && (s = this.copyV3(i), this.next.push(s[0], s[1], s[2]), this.next.push(s[0], s[1], s[2]));
            }
            this.compareV3(e - 1, 0) ? s = this.copyV3(1) : s = this.copyV3(e - 1), this.next.push(s[0], s[1], s[2]), this.next.push(s[0], s[1], s[2]), !this._attributes || this._attributes.position.count !== this.counters.length ? this._attributes = {
                position: new wr(new Float32Array(this.positions), 3),
                previous: new wr(new Float32Array(this.previous), 3),
                next: new wr(new Float32Array(this.next), 3),
                side: new wr(new Float32Array(this.side), 1),
                width: new wr(new Float32Array(this.width), 1),
                uv: new wr(new Float32Array(this.uvs), 2),
                index: new wr(new Uint16Array(this.indices_array), 1),
                counters: new wr(new Float32Array(this.counters), 1)
            } : (this._attributes.position.copyArray(new Float32Array(this.positions)), this._attributes.position.needsUpdate = !0, this._attributes.previous.copyArray(new Float32Array(this.previous)), this._attributes.previous.needsUpdate = !0, this._attributes.next.copyArray(new Float32Array(this.next)), this._attributes.next.needsUpdate = !0, this._attributes.side.copyArray(new Float32Array(this.side)), this._attributes.side.needsUpdate = !0, this._attributes.width.copyArray(new Float32Array(this.width)), this._attributes.width.needsUpdate = !0, this._attributes.uv.copyArray(new Float32Array(this.uvs)), this._attributes.uv.needsUpdate = !0, this._attributes.index.copyArray(new Uint16Array(this.indices_array)), this._attributes.index.needsUpdate = !0), this.setAttribute("position", this._attributes.position), this.setAttribute("previous", this._attributes.previous), this.setAttribute("next", this._attributes.next), this.setAttribute("side", this._attributes.side), this.setAttribute("width", this._attributes.width), this.setAttribute("uv", this._attributes.uv), this.setAttribute("counters", this._attributes.counters), this.setAttribute("position", this._attributes.position), this.setAttribute("previous", this._attributes.previous), this.setAttribute("next", this._attributes.next), this.setAttribute("side", this._attributes.side), this.setAttribute("width", this._attributes.width), this.setAttribute("uv", this._attributes.uv), this.setAttribute("counters", this._attributes.counters), this.setIndex(this._attributes.index), this.computeBoundingSphere(), this.computeBoundingBox();
        }
        advance({ x: e, y: a, z: s }) {
            const i = this._attributes.position.array, o = this._attributes.previous.array, u = this._attributes.next.array, d = i.length;
            jc(i, 0, o, 0, d), jc(i, 6, i, 0, d - 6), i[d - 6] = e, i[d - 5] = a, i[d - 4] = s, i[d - 3] = e, i[d - 2] = a, i[d - 1] = s, jc(i, 6, u, 0, d - 6), u[d - 6] = e, u[d - 5] = a, u[d - 4] = s, u[d - 3] = e, u[d - 2] = a, u[d - 1] = s, this._attributes.position.needsUpdate = !0, this._attributes.previous.needsUpdate = !0, this._attributes.next.needsUpdate = !0;
        }
    }
    const Xx = `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  #include <fog_pars_vertex>
  #include <clipping_planes_pars_vertex>

  attribute vec3 previous;
  attribute vec3 next;
  attribute float side;
  attribute float width;
  attribute float counters;
  
  uniform vec2 resolution;
  uniform float lineWidth;
  uniform vec3 color;
  uniform float opacity;
  uniform float sizeAttenuation;
  
  varying vec2 vUV;
  varying vec4 vColor;
  varying float vCounters;
  
  vec2 fix(vec4 i, float aspect) {
    vec2 res = i.xy / i.w;
    res.x *= aspect;
    return res;
  }
  
  void main() {
    float aspect = resolution.x / resolution.y;
    vColor = vec4(color, opacity);
    vUV = uv;
    vCounters = counters;
  
    mat4 m = projectionMatrix * modelViewMatrix;
    vec4 finalPosition = m * vec4(position, 1.0) * aspect;
    vec4 prevPos = m * vec4(previous, 1.0);
    vec4 nextPos = m * vec4(next, 1.0);
  
    vec2 currentP = fix(finalPosition, aspect);
    vec2 prevP = fix(prevPos, aspect);
    vec2 nextP = fix(nextPos, aspect);
  
    float w = lineWidth * width;
  
    vec2 dir;
    if (nextP == currentP) dir = normalize(currentP - prevP);
    else if (prevP == currentP) dir = normalize(nextP - currentP);
    else {
      vec2 dir1 = normalize(currentP - prevP);
      vec2 dir2 = normalize(nextP - currentP);
      dir = normalize(dir1 + dir2);
  
      vec2 perp = vec2(-dir1.y, dir1.x);
      vec2 miter = vec2(-dir.y, dir.x);
      //w = clamp(w / dot(miter, perp), 0., 4. * lineWidth * width);
    }
  
    //vec2 normal = (cross(vec3(dir, 0.), vec3(0., 0., 1.))).xy;
    vec4 normal = vec4(-dir.y, dir.x, 0., 1.);
    normal.xy *= .5 * w;
    //normal *= projectionMatrix;
    if (sizeAttenuation == 0.) {
      normal.xy *= finalPosition.w;
      normal.xy /= (vec4(resolution, 0., 1.) * projectionMatrix).xy * aspect;
    }
  
    finalPosition.xy += normal.xy * side;
    gl_Position = finalPosition;
    #include <logdepthbuf_vertex>
    #include <fog_vertex>
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    #include <clipping_planes_vertex>
    #include <fog_vertex>
  }
`, Yx = parseInt(_f.replace(/\D+/g, "")), qx = Yx >= 154 ? "colorspace_fragment" : "encodings_fragment", Zx = `
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  #include <clipping_planes_pars_fragment>
  
  uniform sampler2D map;
  uniform sampler2D alphaMap;
  uniform float useGradient;
  uniform float useMap;
  uniform float useAlphaMap;
  uniform float useDash;
  uniform float dashArray;
  uniform float dashOffset;
  uniform float dashRatio;
  uniform float visibility;
  uniform float alphaTest;
  uniform vec2 repeat;
  uniform vec3 gradient[2];
  
  varying vec2 vUV;
  varying vec4 vColor;
  varying float vCounters;
  
  void main() {
    #include <logdepthbuf_fragment>
    vec4 diffuseColor = vColor;
    if (useGradient == 1.) diffuseColor = vec4(mix(gradient[0], gradient[1], vCounters), 1.0);
    if (useMap == 1.) diffuseColor *= texture2D(map, vUV * repeat);
    if (useAlphaMap == 1.) diffuseColor.a *= texture2D(alphaMap, vUV * repeat).a;
    if (diffuseColor.a < alphaTest) discard;
    if (useDash == 1.) diffuseColor.a *= ceil(mod(vCounters + dashOffset, dashArray) - (dashArray * dashRatio));
    diffuseColor.a *= step(vCounters, visibility);
    #include <clipping_planes_fragment>
    gl_FragColor = diffuseColor;     
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <${qx}>
  }
`;
    class Qx extends Oi {
        constructor(e){
            super({
                uniforms: {
                    ...cy.fog,
                    lineWidth: {
                        value: 1
                    },
                    map: {
                        value: null
                    },
                    useMap: {
                        value: 0
                    },
                    alphaMap: {
                        value: null
                    },
                    useAlphaMap: {
                        value: 0
                    },
                    color: {
                        value: new Fr(16777215)
                    },
                    gradient: {
                        value: [
                            new Fr(16711680),
                            new Fr(65280)
                        ]
                    },
                    opacity: {
                        value: 1
                    },
                    resolution: {
                        value: new Ft(1, 1)
                    },
                    sizeAttenuation: {
                        value: 1
                    },
                    dashArray: {
                        value: 0
                    },
                    dashOffset: {
                        value: 0
                    },
                    dashRatio: {
                        value: .5
                    },
                    useDash: {
                        value: 0
                    },
                    useGradient: {
                        value: 0
                    },
                    visibility: {
                        value: 1
                    },
                    alphaTest: {
                        value: 0
                    },
                    repeat: {
                        value: new Ft(1, 1)
                    }
                },
                vertexShader: Xx,
                fragmentShader: Zx
            }), zt(this, "lineWidth"), zt(this, "map"), zt(this, "useMap"), zt(this, "alphaMap"), zt(this, "useAlphaMap"), zt(this, "color"), zt(this, "gradient"), zt(this, "resolution"), zt(this, "sizeAttenuation"), zt(this, "dashArray"), zt(this, "dashOffset"), zt(this, "dashRatio"), zt(this, "useDash"), zt(this, "useGradient"), zt(this, "visibility"), zt(this, "repeat"), this.type = "MeshLineMaterial", Object.defineProperties(this, {
                lineWidth: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.lineWidth.value;
                    },
                    set (a) {
                        this.uniforms.lineWidth.value = a;
                    }
                },
                map: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.map.value;
                    },
                    set (a) {
                        this.uniforms.map.value = a;
                    }
                },
                useMap: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.useMap.value;
                    },
                    set (a) {
                        this.uniforms.useMap.value = a;
                    }
                },
                alphaMap: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.alphaMap.value;
                    },
                    set (a) {
                        this.uniforms.alphaMap.value = a;
                    }
                },
                useAlphaMap: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.useAlphaMap.value;
                    },
                    set (a) {
                        this.uniforms.useAlphaMap.value = a;
                    }
                },
                color: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.color.value;
                    },
                    set (a) {
                        this.uniforms.color.value = a;
                    }
                },
                gradient: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.gradient.value;
                    },
                    set (a) {
                        this.uniforms.gradient.value = a;
                    }
                },
                opacity: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.opacity.value;
                    },
                    set (a) {
                        this.uniforms.opacity.value = a;
                    }
                },
                resolution: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.resolution.value;
                    },
                    set (a) {
                        this.uniforms.resolution.value.copy(a);
                    }
                },
                sizeAttenuation: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.sizeAttenuation.value;
                    },
                    set (a) {
                        this.uniforms.sizeAttenuation.value = a;
                    }
                },
                dashArray: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.dashArray.value;
                    },
                    set (a) {
                        this.uniforms.dashArray.value = a, this.useDash = a !== 0 ? 1 : 0;
                    }
                },
                dashOffset: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.dashOffset.value;
                    },
                    set (a) {
                        this.uniforms.dashOffset.value = a;
                    }
                },
                dashRatio: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.dashRatio.value;
                    },
                    set (a) {
                        this.uniforms.dashRatio.value = a;
                    }
                },
                useDash: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.useDash.value;
                    },
                    set (a) {
                        this.uniforms.useDash.value = a;
                    }
                },
                useGradient: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.useGradient.value;
                    },
                    set (a) {
                        this.uniforms.useGradient.value = a;
                    }
                },
                visibility: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.visibility.value;
                    },
                    set (a) {
                        this.uniforms.visibility.value = a;
                    }
                },
                alphaTest: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.alphaTest.value;
                    },
                    set (a) {
                        this.uniforms.alphaTest.value = a;
                    }
                },
                repeat: {
                    enumerable: !0,
                    get () {
                        return this.uniforms.repeat.value;
                    },
                    set (a) {
                        this.uniforms.repeat.value.copy(a);
                    }
                }
            }), this.setValues(e);
        }
        copy(e) {
            return super.copy(e), this.lineWidth = e.lineWidth, this.map = e.map, this.useMap = e.useMap, this.alphaMap = e.alphaMap, this.useAlphaMap = e.useAlphaMap, this.color.copy(e.color), this.gradient = e.gradient, this.opacity = e.opacity, this.resolution.copy(e.resolution), this.sizeAttenuation = e.sizeAttenuation, this.dashArray = e.dashArray, this.dashOffset = e.dashOffset, this.dashRatio = e.dashRatio, this.useDash = e.useDash, this.useGradient = e.useGradient, this.visibility = e.visibility, this.alphaTest = e.alphaTest, this.repeat.copy(e.repeat), this;
        }
    }
    function Kx(r, e, a) {
        const s = Et((b)=>b.size), i = Et((b)=>b.viewport), o = typeof r == "number" ? r : s.width * i.dpr, u = s.height * i.dpr, d = (typeof r == "number" ? a : r) || {}, { samples: c = 0, depth: h, ...p } = d, v = h ?? d.depthBuffer, y = M.useMemo(()=>{
            const b = new Gr(o, u, {
                minFilter: Hn,
                magFilter: Hn,
                type: Qn,
                ...p
            });
            return v && (b.depthTexture = new $m(o, u, Br)), b.samples = c, b;
        }, []);
        return M.useLayoutEffect(()=>{
            y.setSize(o, u), c && (y.samples = c);
        }, [
            c,
            y,
            o,
            u
        ]), M.useEffect(()=>()=>y.dispose(), []), y;
    }
    let $x, Jx;
    $x = (r)=>typeof r == "function";
    Jx = M.forwardRef(({ envMap: r, resolution: e = 256, frames: a = 1 / 0, children: s, makeDefault: i, ...o }, u)=>{
        const d = Et(({ set: x })=>x), c = Et(({ camera: x })=>x), h = Et(({ size: x })=>x), p = M.useRef(null);
        M.useImperativeHandle(u, ()=>p.current, []);
        const v = M.useRef(null), y = Kx(e);
        M.useLayoutEffect(()=>{
            o.manual || p.current.updateProjectionMatrix();
        }, [
            h,
            o
        ]), M.useLayoutEffect(()=>{
            p.current.updateProjectionMatrix();
        }), M.useLayoutEffect(()=>{
            if (i) {
                const x = c;
                return d(()=>({
                        camera: p.current
                    })), ()=>d(()=>({
                            camera: x
                        }));
            }
        }, [
            p,
            i,
            d
        ]);
        let b = 0, S = null;
        const _ = $x(s);
        return Wt((x)=>{
            _ && (a === 1 / 0 || b < a) && (v.current.visible = !1, x.gl.setRenderTarget(y), S = x.scene.background, r && (x.scene.background = r), x.gl.render(x.scene, p.current), x.scene.background = S, x.gl.setRenderTarget(null), v.current.visible = !0, b++);
        }), M.createElement(M.Fragment, null, M.createElement("orthographicCamera", un({
            left: h.width / -2,
            right: h.width / 2,
            top: h.height / 2,
            bottom: h.height / -2,
            ref: p
        }, o), !_ && s), M.createElement("group", {
            ref: v
        }, _ && s(y.texture)));
    });
    CM = M.forwardRef(({ makeDefault: r, camera: e, regress: a, domElement: s, enableDamping: i = !0, keyEvents: o = !1, onChange: u, onStart: d, onEnd: c, ...h }, p)=>{
        const v = Et((R)=>R.invalidate), y = Et((R)=>R.camera), b = Et((R)=>R.gl), S = Et((R)=>R.events), _ = Et((R)=>R.setEvents), x = Et((R)=>R.set), k = Et((R)=>R.get), T = Et((R)=>R.performance), A = e || y, U = s || S.connected || b.domElement, D = M.useMemo(()=>new zS(A), [
            A
        ]);
        return Wt(()=>{
            D.enabled && D.update();
        }, -1), M.useEffect(()=>(o && D.connect(o === !0 ? U : o), D.connect(U), ()=>void D.dispose()), [
            o,
            U,
            a,
            D,
            v
        ]), M.useEffect(()=>{
            const R = (I)=>{
                v(), a && T.regress(), u && u(I);
            }, N = (I)=>{
                d && d(I);
            }, P = (I)=>{
                c && c(I);
            };
            return D.addEventListener("change", R), D.addEventListener("start", N), D.addEventListener("end", P), ()=>{
                D.removeEventListener("start", N), D.removeEventListener("end", P), D.removeEventListener("change", R);
            };
        }, [
            u,
            d,
            c,
            D,
            v,
            _
        ]), M.useEffect(()=>{
            if (r) {
                const R = k().controls;
                return x({
                    controls: D
                }), ()=>x({
                        controls: R
                    });
            }
        }, [
            r,
            D
        ]), M.createElement("primitive", un({
            ref: p,
            object: D,
            enableDamping: i
        }, h));
    });
    function e_({ defaultScene: r, defaultCamera: e, renderPriority: a = 1 }) {
        const { gl: s, scene: i, camera: o } = Et();
        let u;
        return Wt(()=>{
            u = s.autoClear, a === 1 && (s.autoClear = !0, s.render(r, e)), s.autoClear = !1, s.clearDepth(), s.render(i, o), s.autoClear = u;
        }, a), M.createElement("group", {
            onPointerOver: ()=>null
        });
    }
    function t_({ children: r, renderPriority: e = 1 }) {
        const { scene: a, camera: s } = Et(), [i] = M.useState(()=>new fs);
        return M.createElement(M.Fragment, null, ps(M.createElement(M.Fragment, null, r, M.createElement(e_, {
            defaultScene: a,
            defaultCamera: s,
            renderPriority: e
        })), i, {
            events: {
                priority: e + 1
            }
        }));
    }
    let Jg, n_, r_, Bc, Kp, eo, Gc, $p, Jp, i_, em;
    Jg = M.createContext({});
    n_ = ()=>M.useContext(Jg);
    r_ = 2 * Math.PI;
    Bc = new Ql;
    Kp = new Yn;
    [eo, Gc] = [
        new Vn,
        new Vn
    ];
    $p = new ke;
    Jp = new ke;
    i_ = (r)=>"minPolarAngle" in r;
    em = (r)=>"getTarget" in r;
    TM = ({ alignment: r = "bottom-right", margin: e = [
        80,
        80
    ], renderPriority: a = 1, onUpdate: s, onTarget: i, children: o })=>{
        const u = Et((R)=>R.size), d = Et((R)=>R.camera), c = Et((R)=>R.controls), h = Et((R)=>R.invalidate), p = M.useRef(null), v = M.useRef(null), y = M.useRef(!1), b = M.useRef(0), S = M.useRef(new ke(0, 0, 0)), _ = M.useRef(new ke(0, 0, 0));
        M.useEffect(()=>{
            _.current.copy(d.up), Bc.up.copy(d.up);
        }, [
            d
        ]);
        const x = M.useCallback((R)=>{
            y.current = !0, (c || i) && (S.current = i?.() || (em(c) ? c.getTarget(S.current) : c?.target)), b.current = d.position.distanceTo($p), eo.copy(d.quaternion), Jp.copy(R).multiplyScalar(b.current).add($p), Bc.lookAt(Jp), Gc.copy(Bc.quaternion), h();
        }, [
            c,
            d,
            i,
            h
        ]);
        Wt((R, N)=>{
            if (v.current && p.current) {
                var P;
                if (y.current) if (eo.angleTo(Gc) < .01) y.current = !1, i_(c) && d.up.copy(_.current);
                else {
                    const I = N * r_;
                    eo.rotateTowards(Gc, I), d.position.set(0, 0, 1).applyQuaternion(eo).multiplyScalar(b.current).add(S.current), d.up.set(0, 1, 0).applyQuaternion(eo).normalize(), d.quaternion.copy(eo), em(c) && c.setPosition(d.position.x, d.position.y, d.position.z), s ? s() : c && c.update(N), h();
                }
                Kp.copy(d.matrix).invert(), (P = p.current) == null || P.quaternion.setFromRotationMatrix(Kp);
            }
        });
        const k = M.useMemo(()=>({
                tweenCamera: x
            }), [
            x
        ]), [T, A] = e, U = r.endsWith("-center") ? 0 : r.endsWith("-left") ? -u.width / 2 + T : u.width / 2 - T, D = r.startsWith("center-") ? 0 : r.startsWith("top-") ? u.height / 2 - A : -u.height / 2 + A;
        return M.createElement(t_, {
            renderPriority: a
        }, M.createElement(Jg.Provider, {
            value: k
        }, M.createElement(Jx, {
            makeDefault: !0,
            ref: v,
            position: [
                0,
                0,
                200
            ]
        }), M.createElement("group", {
            ref: p,
            position: [
                U,
                D,
                0
            ]
        }, o)));
    };
    function Hc({ scale: r = [
        .8,
        .05,
        .05
    ], color: e, rotation: a }) {
        return M.createElement("group", {
            rotation: a
        }, M.createElement("mesh", {
            position: [
                .4,
                0,
                0
            ]
        }, M.createElement("boxGeometry", {
            args: r
        }), M.createElement("meshBasicMaterial", {
            color: e,
            toneMapped: !1
        })));
    }
    function to({ onClick: r, font: e, disabled: a, arcStyle: s, label: i, labelColor: o, axisHeadScale: u = 1, ...d }) {
        const c = Et((_)=>_.gl), h = M.useMemo(()=>{
            const _ = document.createElement("canvas");
            _.width = 64, _.height = 64;
            const x = _.getContext("2d");
            return x.beginPath(), x.arc(32, 32, 16, 0, 2 * Math.PI), x.closePath(), x.fillStyle = s, x.fill(), i && (x.font = e, x.textAlign = "center", x.fillStyle = o, x.fillText(i, 32, 41)), new fy(_);
        }, [
            s,
            i,
            o,
            e
        ]), [p, v] = M.useState(!1), y = (i ? 1 : .75) * (p ? 1.2 : 1) * u, b = (_)=>{
            _.stopPropagation(), v(!0);
        }, S = (_)=>{
            _.stopPropagation(), v(!1);
        };
        return M.createElement("sprite", un({
            scale: y,
            onPointerOver: a ? void 0 : b,
            onPointerOut: a ? void 0 : r || S
        }, d), M.createElement("spriteMaterial", {
            map: h,
            "map-anisotropy": c.capabilities.getMaxAnisotropy() || 1,
            alphaTest: .3,
            opacity: i ? 1 : .75,
            toneMapped: !1
        }));
    }
    let a_, Nr;
    PM = ({ hideNegativeAxes: r, hideAxisHeads: e, disabled: a, font: s = "18px Inter var, Arial, sans-serif", axisColors: i = [
        "#ff2060",
        "#20df80",
        "#2080ff"
    ], axisHeadScale: o = 1, axisScale: u, labels: d = [
        "X",
        "Y",
        "Z"
    ], labelColor: c = "#000", onClick: h, ...p })=>{
        const [v, y, b] = i, { tweenCamera: S } = n_(), _ = {
            font: s,
            disabled: a,
            labelColor: c,
            onClick: h,
            axisHeadScale: o,
            onPointerDown: a ? void 0 : (x)=>{
                S(x.object.position), x.stopPropagation();
            }
        };
        return M.createElement("group", un({
            scale: 40
        }, p), M.createElement(Hc, {
            color: v,
            rotation: [
                0,
                0,
                0
            ],
            scale: u
        }), M.createElement(Hc, {
            color: y,
            rotation: [
                0,
                0,
                Math.PI / 2
            ],
            scale: u
        }), M.createElement(Hc, {
            color: b,
            rotation: [
                0,
                -Math.PI / 2,
                0
            ],
            scale: u
        }), !e && M.createElement(M.Fragment, null, M.createElement(to, un({
            arcStyle: v,
            position: [
                1,
                0,
                0
            ],
            label: d[0]
        }, _)), M.createElement(to, un({
            arcStyle: y,
            position: [
                0,
                1,
                0
            ],
            label: d[1]
        }, _)), M.createElement(to, un({
            arcStyle: b,
            position: [
                0,
                0,
                1
            ],
            label: d[2]
        }, _)), !r && M.createElement(M.Fragment, null, M.createElement(to, un({
            arcStyle: v,
            position: [
                -1,
                0,
                0
            ]
        }, _)), M.createElement(to, un({
            arcStyle: y,
            position: [
                0,
                -1,
                0
            ]
        }, _)), M.createElement(to, un({
            arcStyle: b,
            position: [
                0,
                0,
                -1
            ]
        }, _)))));
    };
    a_ = Nx({
        cellSize: .5,
        sectionSize: 1,
        fadeDistance: 100,
        fadeStrength: 1,
        fadeFrom: 1,
        cellThickness: .5,
        sectionThickness: 1,
        cellColor: new Fr,
        sectionColor: new Fr,
        infiniteGrid: !1,
        followCamera: !1,
        worldCamProjPosition: new ke,
        worldPlanePosition: new ke
    }, `
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform vec3 worldPlanePosition;
    uniform float fadeDistance;
    uniform bool infiniteGrid;
    uniform bool followCamera;

    void main() {
      localPosition = position.xzy;
      if (infiniteGrid) localPosition *= 1.0 + fadeDistance;
      
      worldPosition = modelMatrix * vec4(localPosition, 1.0);
      if (followCamera) {
        worldPosition.xyz += (worldCamProjPosition - worldPlanePosition);
        localPosition = (inverse(modelMatrix) * worldPosition).xyz;
      }

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `, `
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform float cellSize;
    uniform float sectionSize;
    uniform vec3 cellColor;
    uniform vec3 sectionColor;
    uniform float fadeDistance;
    uniform float fadeStrength;
    uniform float fadeFrom;
    uniform float cellThickness;
    uniform float sectionThickness;

    float getGrid(float size, float thickness) {
      vec2 r = localPosition.xz / size;
      vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
      float line = min(grid.x, grid.y) + 1.0 - thickness;
      return 1.0 - min(line, 1.0);
    }

    void main() {
      float g1 = getGrid(cellSize, cellThickness);
      float g2 = getGrid(sectionSize, sectionThickness);

      vec3 from = worldCamProjPosition*vec3(fadeFrom);
      float dist = distance(from, worldPosition.xyz);
      float d = 1.0 - min(dist / fadeDistance, 1.0);
      vec3 color = mix(cellColor, sectionColor, min(1.0, sectionThickness * g2));

      gl_FragColor = vec4(color, (g1 + g2) * pow(d, fadeStrength));
      gl_FragColor.a = mix(0.75 * gl_FragColor.a, gl_FragColor.a, g2);
      if (gl_FragColor.a <= 0.0) discard;

      #include <tonemapping_fragment>
      #include <${Bx >= 154 ? "colorspace_fragment" : "encodings_fragment"}>
    }
  `);
    kM = M.forwardRef(({ args: r, cellColor: e = "#000000", sectionColor: a = "#2080ff", cellSize: s = .5, sectionSize: i = 1, followCamera: o = !1, infiniteGrid: u = !1, fadeDistance: d = 100, fadeStrength: c = 1, fadeFrom: h = 1, cellThickness: p = .5, sectionThickness: v = 1, side: y = dy, ...b }, S)=>{
        $l({
            GridMaterial: a_
        });
        const _ = M.useRef(null);
        M.useImperativeHandle(S, ()=>_.current, []);
        const x = new fo, k = new ke(0, 1, 0), T = new ke(0, 0, 0);
        Wt((D)=>{
            x.setFromNormalAndCoplanarPoint(k, T).applyMatrix4(_.current.matrixWorld);
            const R = _.current.material, N = R.uniforms.worldCamProjPosition, P = R.uniforms.worldPlanePosition;
            x.projectPoint(D.camera.position, N.value), P.value.set(0, 0, 0).applyMatrix4(_.current.matrixWorld);
        });
        const A = {
            cellSize: s,
            sectionSize: i,
            cellColor: e,
            sectionColor: a,
            cellThickness: p,
            sectionThickness: v
        }, U = {
            fadeDistance: d,
            fadeStrength: c,
            fadeFrom: h,
            infiniteGrid: u,
            followCamera: o
        };
        return M.createElement("mesh", un({
            ref: _,
            frustumCulled: !1
        }, b), M.createElement("gridMaterial", un({
            transparent: !0,
            "extensions-derivatives": !0,
            side: y
        }, A, U)), M.createElement("planeGeometry", {
            args: r
        }));
    });
    Nr = 1e-5;
    function o_(r, e, a) {
        const s = new Jm, i = a - Nr;
        return s.absarc(Nr, Nr, Nr, -Math.PI / 2, -Math.PI, !0), s.absarc(Nr, e - i * 2, Nr, Math.PI, Math.PI / 2, !0), s.absarc(r - i * 2, e - i * 2, Nr, Math.PI / 2, 0, !0), s.absarc(r - i * 2, Nr, Nr, 0, -Math.PI / 2, !0), s;
    }
    let s_, ev;
    RM = M.forwardRef(function({ args: [e = 1, a = 1, s = 1] = [], radius: i = .05, steps: o = 1, smoothness: u = 4, bevelSegments: d = 4, creaseAngle: c = .4, children: h, ...p }, v) {
        return M.createElement("mesh", un({
            ref: v
        }, p), M.createElement(s_, {
            args: [
                e,
                a,
                s
            ],
            radius: i,
            steps: o,
            smoothness: u,
            bevelSegments: d,
            creaseAngle: c
        }), h);
    });
    s_ = M.forwardRef(function({ args: [e = 1, a = 1, s = 1] = [], radius: i = .05, steps: o = 1, smoothness: u = 4, bevelSegments: d = 4, creaseAngle: c = .4, ...h }, p) {
        const v = M.useMemo(()=>o_(e, a, i), [
            e,
            a,
            i
        ]), y = M.useMemo(()=>({
                depth: s - i * 2,
                bevelEnabled: !0,
                bevelSegments: d * 2,
                steps: o,
                bevelSize: i - Nr,
                bevelThickness: i,
                curveSegments: u
            }), [
            s,
            i,
            u,
            d,
            o
        ]), b = M.useRef(null);
        return M.useLayoutEffect(()=>{
            b.current && (b.current.center(), mS(b.current, c));
        }, [
            v,
            y,
            c
        ]), M.useImperativeHandle(p, ()=>b.current), M.createElement("extrudeGeometry", un({
            ref: b,
            args: [
                v,
                y
            ]
        }, h));
    });
    ev = (r, e, a)=>{
        let s;
        switch(r){
            case Il:
                s = new Uint8ClampedArray(e * a * 4);
                break;
            case Qn:
                s = new Uint16Array(e * a * 4);
                break;
            case vy:
                s = new Uint32Array(e * a * 4);
                break;
            case gy:
                s = new Int8Array(e * a * 4);
                break;
            case my:
                s = new Int16Array(e * a * 4);
                break;
            case py:
                s = new Int32Array(e * a * 4);
                break;
            case Br:
                s = new Float32Array(e * a * 4);
                break;
            default:
                throw new Error("Unsupported data type");
        }
        return s;
    };
    let pl;
    const l_ = (r, e, a, s)=>{
        if (pl !== void 0) return pl;
        const i = new Gr(1, 1, s);
        e.setRenderTarget(i);
        const o = new Xn(new Li, new ql({
            color: 16777215
        }));
        e.render(o, a), e.setRenderTarget(null);
        const u = ev(r, i.width, i.height);
        return e.readRenderTargetPixels(i, 0, 0, i.width, i.height, u), i.dispose(), o.geometry.dispose(), o.material.dispose(), pl = u[0] !== 0, pl;
    };
    class Of {
        _renderer;
        _rendererIsDisposable = !1;
        _material;
        _scene;
        _camera;
        _quad;
        _renderTarget;
        _width;
        _height;
        _type;
        _colorSpace;
        _supportsReadPixels = !0;
        constructor(e){
            this._width = e.width, this._height = e.height, this._type = e.type, this._colorSpace = e.colorSpace;
            const a = {
                format: oo,
                depthBuffer: !1,
                stencilBuffer: !1,
                type: this._type,
                colorSpace: this._colorSpace,
                anisotropy: e.renderTargetOptions?.anisotropy !== void 0 ? e.renderTargetOptions?.anisotropy : 1,
                generateMipmaps: e.renderTargetOptions?.generateMipmaps !== void 0 ? e.renderTargetOptions?.generateMipmaps : !1,
                magFilter: e.renderTargetOptions?.magFilter !== void 0 ? e.renderTargetOptions?.magFilter : Hn,
                minFilter: e.renderTargetOptions?.minFilter !== void 0 ? e.renderTargetOptions?.minFilter : Hn,
                samples: e.renderTargetOptions?.samples !== void 0 ? e.renderTargetOptions?.samples : void 0,
                wrapS: e.renderTargetOptions?.wrapS !== void 0 ? e.renderTargetOptions?.wrapS : Ai,
                wrapT: e.renderTargetOptions?.wrapT !== void 0 ? e.renderTargetOptions?.wrapT : Ai
            };
            if (this._material = e.material, e.renderer ? this._renderer = e.renderer : (this._renderer = Of.instantiateRenderer(), this._rendererIsDisposable = !0), this._scene = new fs, this._camera = new Di, this._camera.position.set(0, 0, 10), this._camera.left = -.5, this._camera.right = .5, this._camera.top = .5, this._camera.bottom = -.5, this._camera.updateProjectionMatrix(), !l_(this._type, this._renderer, this._camera, a)) {
                let s;
                switch(this._type){
                    case Qn:
                        s = this._renderer.extensions.has("EXT_color_buffer_float") ? Br : void 0;
                        break;
                }
                s !== void 0 ? (console.warn(`This browser does not support reading pixels from ${this._type} RenderTargets, switching to ${Br}`), this._type = s) : (this._supportsReadPixels = !1, console.warn("This browser dos not support toArray or toDataTexture, calls to those methods will result in an error thrown"));
            }
            this._quad = new Xn(new Li, this._material), this._quad.geometry.computeBoundingBox(), this._scene.add(this._quad), this._renderTarget = new Gr(this.width, this.height, a), this._renderTarget.texture.mapping = e.renderTargetOptions?.mapping !== void 0 ? e.renderTargetOptions?.mapping : Dl;
        }
        static instantiateRenderer() {
            const e = new Ym;
            return e.setSize(128, 128), e;
        }
        render = ()=>{
            this._renderer.setRenderTarget(this._renderTarget);
            try {
                this._renderer.render(this._scene, this._camera);
            } catch (e) {
                throw this._renderer.setRenderTarget(null), e;
            }
            this._renderer.setRenderTarget(null);
        };
        toArray() {
            if (!this._supportsReadPixels) throw new Error("Can't read pixels in this browser");
            const e = ev(this._type, this._width, this._height);
            return this._renderer.readRenderTargetPixels(this._renderTarget, 0, 0, this._width, this._height, e), e;
        }
        toDataTexture(e) {
            const a = new hy(this.toArray(), this.width, this.height, oo, this._type, e?.mapping || Dl, e?.wrapS || Ai, e?.wrapT || Ai, e?.magFilter || Hn, e?.minFilter || Hn, e?.anisotropy || 1, Rl);
            return a.generateMipmaps = e?.generateMipmaps !== void 0 ? e?.generateMipmaps : !1, a;
        }
        disposeOnDemandRenderer() {
            this._renderer.setRenderTarget(null), this._rendererIsDisposable && (this._renderer.dispose(), this._renderer.forceContextLoss());
        }
        dispose(e) {
            this.disposeOnDemandRenderer(), e && this.renderTarget.dispose(), this.material instanceof Oi && Object.values(this.material.uniforms).forEach((a)=>{
                a.value instanceof Ii && a.value.dispose();
            }), Object.values(this.material).forEach((a)=>{
                a instanceof Ii && a.dispose();
            }), this.material.dispose(), this._quad.geometry.dispose();
        }
        get width() {
            return this._width;
        }
        set width(e) {
            this._width = e, this._renderTarget.setSize(this._width, this._height);
        }
        get height() {
            return this._height;
        }
        set height(e) {
            this._height = e, this._renderTarget.setSize(this._width, this._height);
        }
        get renderer() {
            return this._renderer;
        }
        get renderTarget() {
            return this._renderTarget;
        }
        set renderTarget(e) {
            this._renderTarget = e, this._width = e.width, this._height = e.height;
        }
        get material() {
            return this._material;
        }
        get type() {
            return this._type;
        }
        get colorSpace() {
            return this._colorSpace;
        }
    }
    class tv extends Error {
    }
    class nv extends Error {
    }
    const Qo = (r, e, a)=>{
        const s = new RegExp(`${e}="([^"]*)"`, "i").exec(r);
        if (s) return s[1];
        const i = new RegExp(`<${e}[^>]*>([\\s\\S]*?)</${e}>`, "i").exec(r);
        if (i) {
            const o = i[1].match(/<rdf:li>([^<]*)<\/rdf:li>/g);
            return o && o.length === 3 ? o.map((u)=>u.replace(/<\/?rdf:li>/g, "")) : i[1].trim();
        }
        if (a !== void 0) return a;
        throw new Error(`Can't find ${e} in gainmap metadata`);
    }, u_ = (r)=>{
        let e;
        typeof TextDecoder < "u" ? e = new TextDecoder().decode(r) : e = r.toString();
        let a = e.indexOf("<x:xmpmeta");
        for(; a !== -1;){
            const s = e.indexOf("x:xmpmeta>", a), i = e.slice(a, s + 10);
            try {
                const o = Qo(i, "hdrgm:GainMapMin", "0"), u = Qo(i, "hdrgm:GainMapMax"), d = Qo(i, "hdrgm:Gamma", "1"), c = Qo(i, "hdrgm:OffsetSDR", "0.015625"), h = Qo(i, "hdrgm:OffsetHDR", "0.015625"), p = /hdrgm:HDRCapacityMin="([^"]*)"/.exec(i), v = p ? p[1] : "0", y = /hdrgm:HDRCapacityMax="([^"]*)"/.exec(i);
                if (!y) throw new Error("Incomplete gainmap metadata");
                const b = y[1];
                return {
                    gainMapMin: Array.isArray(o) ? o.map((S)=>parseFloat(S)) : [
                        parseFloat(o),
                        parseFloat(o),
                        parseFloat(o)
                    ],
                    gainMapMax: Array.isArray(u) ? u.map((S)=>parseFloat(S)) : [
                        parseFloat(u),
                        parseFloat(u),
                        parseFloat(u)
                    ],
                    gamma: Array.isArray(d) ? d.map((S)=>parseFloat(S)) : [
                        parseFloat(d),
                        parseFloat(d),
                        parseFloat(d)
                    ],
                    offsetSdr: Array.isArray(c) ? c.map((S)=>parseFloat(S)) : [
                        parseFloat(c),
                        parseFloat(c),
                        parseFloat(c)
                    ],
                    offsetHdr: Array.isArray(h) ? h.map((S)=>parseFloat(S)) : [
                        parseFloat(h),
                        parseFloat(h),
                        parseFloat(h)
                    ],
                    hdrCapacityMin: parseFloat(v),
                    hdrCapacityMax: parseFloat(b)
                };
            } catch  {}
            a = e.indexOf("<x:xmpmeta", s);
        }
    };
    class c_ {
        options;
        constructor(e){
            this.options = {
                debug: e && e.debug !== void 0 ? e.debug : !1,
                extractFII: e && e.extractFII !== void 0 ? e.extractFII : !0,
                extractNonFII: e && e.extractNonFII !== void 0 ? e.extractNonFII : !0
            };
        }
        extract(e) {
            return new Promise((a, s)=>{
                const i = this.options.debug, o = new DataView(e.buffer);
                if (o.getUint16(0) !== 65496) {
                    s(new Error("Not a valid jpeg"));
                    return;
                }
                const u = o.byteLength;
                let d = 2, c = 0, h;
                for(; d < u;){
                    if (++c > 250) {
                        s(new Error(`Found no marker after ${c} loops 😵`));
                        return;
                    }
                    if (o.getUint8(d) !== 255) {
                        s(new Error(`Not a valid marker at offset 0x${d.toString(16)}, found: 0x${o.getUint8(d).toString(16)}`));
                        return;
                    }
                    if (h = o.getUint8(d + 1), i && console.log(`Marker: ${h.toString(16)}`), h === 226) {
                        i && console.log("Found APP2 marker (0xffe2)");
                        const p = d + 4;
                        if (o.getUint32(p) === 1297106432) {
                            const v = p + 4;
                            let y;
                            if (o.getUint16(v) === 18761) y = !1;
                            else if (o.getUint16(v) === 19789) y = !0;
                            else {
                                s(new Error("No valid endianness marker found in TIFF header"));
                                return;
                            }
                            if (o.getUint16(v + 2, !y) !== 42) {
                                s(new Error("Not valid TIFF data! (no 0x002A marker)"));
                                return;
                            }
                            const b = o.getUint32(v + 4, !y);
                            if (b < 8) {
                                s(new Error("Not valid TIFF data! (First offset less than 8)"));
                                return;
                            }
                            const S = v + b, _ = o.getUint16(S, !y), x = S + 2;
                            let k = 0;
                            for(let D = x; D < x + 12 * _; D += 12)o.getUint16(D, !y) === 45057 && (k = o.getUint32(D + 8, !y));
                            const A = S + 2 + _ * 12 + 4, U = [];
                            for(let D = A; D < A + k * 16; D += 16){
                                const R = {
                                    MPType: o.getUint32(D, !y),
                                    size: o.getUint32(D + 4, !y),
                                    dataOffset: o.getUint32(D + 8, !y),
                                    dependantImages: o.getUint32(D + 12, !y),
                                    start: -1,
                                    end: -1,
                                    isFII: !1
                                };
                                R.dataOffset ? (R.start = v + R.dataOffset, R.isFII = !1) : (R.start = 0, R.isFII = !0), R.end = R.start + R.size, U.push(R);
                            }
                            if (this.options.extractNonFII && U.length) {
                                const D = new Blob([
                                    o
                                ]), R = [];
                                for (const N of U){
                                    if (N.isFII && !this.options.extractFII) continue;
                                    const P = D.slice(N.start, N.end + 1, "image/jpeg");
                                    R.push(P);
                                }
                                a(R);
                            }
                        }
                    }
                    d += 2 + o.getUint16(d + 2);
                }
            });
        }
    }
    const f_ = async (r)=>{
        const e = u_(r);
        if (!e) throw new nv("Gain map XMP metadata not found");
        const s = await new c_({
            extractFII: !0,
            extractNonFII: !0
        }).extract(r);
        if (s.length !== 2) throw new tv("Gain map recovery image not found");
        return {
            sdr: new Uint8Array(await s[0].arrayBuffer()),
            gainMap: new Uint8Array(await s[1].arrayBuffer()),
            metadata: e
        };
    }, tm = (r)=>new Promise((e, a)=>{
            const s = document.createElement("img");
            s.onload = ()=>{
                e(s);
            }, s.onerror = (i)=>{
                a(i);
            }, s.src = URL.createObjectURL(r);
        });
    class d_ extends yy {
        _renderer;
        _renderTargetOptions;
        _internalLoadingManager;
        _config;
        constructor(e, a){
            super(a), this._config = e, e.renderer && (this._renderer = e.renderer), this._internalLoadingManager = new by;
        }
        setRenderer(e) {
            return this._renderer = e, this;
        }
        setRenderTargetOptions(e) {
            return this._renderTargetOptions = e, this;
        }
        prepareQuadRenderer() {
            this._renderer || console.warn("WARNING: A Renderer was not passed to this Loader constructor or in setRenderer, the result of this Loader will need to be converted to a Data Texture with toDataTexture() before you can use it in your renderer.");
            const e = this._config.createMaterial({
                gainMapMax: [
                    1,
                    1,
                    1
                ],
                gainMapMin: [
                    0,
                    0,
                    0
                ],
                gamma: [
                    1,
                    1,
                    1
                ],
                offsetHdr: [
                    1,
                    1,
                    1
                ],
                offsetSdr: [
                    1,
                    1,
                    1
                ],
                hdrCapacityMax: 1,
                hdrCapacityMin: 0,
                maxDisplayBoost: 1,
                gainMap: new Ii,
                sdr: new Ii
            });
            return this._config.createQuadRenderer({
                width: 16,
                height: 16,
                type: Qn,
                colorSpace: Rl,
                material: e,
                renderer: this._renderer,
                renderTargetOptions: this._renderTargetOptions
            });
        }
        async processImages(e, a, s) {
            const i = a ? new Blob([
                a
            ], {
                type: "image/jpeg"
            }) : void 0, o = new Blob([
                e
            ], {
                type: "image/jpeg"
            });
            let u, d, c = !1;
            if (typeof createImageBitmap > "u") {
                const h = await Promise.all([
                    i ? tm(i) : Promise.resolve(void 0),
                    tm(o)
                ]);
                d = h[0], u = h[1], c = s === "flipY";
            } else {
                const h = await Promise.all([
                    i ? createImageBitmap(i, {
                        imageOrientation: s || "flipY"
                    }) : Promise.resolve(void 0),
                    createImageBitmap(o, {
                        imageOrientation: s || "flipY"
                    })
                ]);
                d = h[0], u = h[1];
            }
            return {
                sdrImage: u,
                gainMapImage: d,
                needsFlip: c
            };
        }
        createTextures(e, a, s) {
            const i = new Ii(a || new ImageData(2, 2), Dl, Ai, Ai, Hn, ep, oo, Il, 1, Rl);
            i.flipY = s, i.needsUpdate = !0;
            const o = new Ii(e, Dl, Ai, Ai, Hn, ep, oo, Il, 1, Yl);
            return o.flipY = s, o.needsUpdate = !0, {
                gainMap: i,
                sdr: o
            };
        }
        updateQuadRenderer(e, a, s, i, o) {
            e.width = a.width, e.height = a.height, e.material.gainMap = s, e.material.sdr = i, e.material.gainMapMin = o.gainMapMin, e.material.gainMapMax = o.gainMapMax, e.material.offsetHdr = o.offsetHdr, e.material.offsetSdr = o.offsetSdr, e.material.gamma = o.gamma, e.material.hdrCapacityMin = o.hdrCapacityMin, e.material.hdrCapacityMax = o.hdrCapacityMax, e.material.maxDisplayBoost = Math.pow(2, o.hdrCapacityMax), e.material.needsUpdate = !0;
        }
    }
    const h_ = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`, p_ = `
// min half float value
#define HALF_FLOAT_MIN vec3( -65504, -65504, -65504 )
// max half float value
#define HALF_FLOAT_MAX vec3( 65504, 65504, 65504 )

uniform sampler2D sdr;
uniform sampler2D gainMap;
uniform vec3 gamma;
uniform vec3 offsetHdr;
uniform vec3 offsetSdr;
uniform vec3 gainMapMin;
uniform vec3 gainMapMax;
uniform float weightFactor;

varying vec2 vUv;

void main() {
  vec3 rgb = texture2D( sdr, vUv ).rgb;
  vec3 recovery = texture2D( gainMap, vUv ).rgb;
  vec3 logRecovery = pow( recovery, gamma );
  vec3 logBoost = gainMapMin * ( 1.0 - logRecovery ) + gainMapMax * logRecovery;
  vec3 hdrColor = (rgb + offsetSdr) * exp2( logBoost * weightFactor ) - offsetHdr;
  vec3 clampedHdrColor = max( HALF_FLOAT_MIN, min( HALF_FLOAT_MAX, hdrColor ));
  gl_FragColor = vec4( clampedHdrColor , 1.0 );
}
`;
    class m_ extends Oi {
        _maxDisplayBoost;
        _hdrCapacityMin;
        _hdrCapacityMax;
        constructor({ gamma: e, offsetHdr: a, offsetSdr: s, gainMapMin: i, gainMapMax: o, maxDisplayBoost: u, hdrCapacityMin: d, hdrCapacityMax: c, sdr: h, gainMap: p }){
            super({
                name: "GainMapDecoderMaterial",
                vertexShader: h_,
                fragmentShader: p_,
                uniforms: {
                    sdr: {
                        value: h
                    },
                    gainMap: {
                        value: p
                    },
                    gamma: {
                        value: new ke(1 / e[0], 1 / e[1], 1 / e[2])
                    },
                    offsetHdr: {
                        value: new ke().fromArray(a)
                    },
                    offsetSdr: {
                        value: new ke().fromArray(s)
                    },
                    gainMapMin: {
                        value: new ke().fromArray(i)
                    },
                    gainMapMax: {
                        value: new ke().fromArray(o)
                    },
                    weightFactor: {
                        value: (Math.log2(u) - d) / (c - d)
                    }
                },
                blending: wy,
                depthTest: !1,
                depthWrite: !1
            }), this._maxDisplayBoost = u, this._hdrCapacityMin = d, this._hdrCapacityMax = c, this.needsUpdate = !0, this.uniformsNeedUpdate = !0;
        }
        get sdr() {
            return this.uniforms.sdr.value;
        }
        set sdr(e) {
            this.uniforms.sdr.value = e;
        }
        get gainMap() {
            return this.uniforms.gainMap.value;
        }
        set gainMap(e) {
            this.uniforms.gainMap.value = e;
        }
        get offsetHdr() {
            return this.uniforms.offsetHdr.value.toArray();
        }
        set offsetHdr(e) {
            this.uniforms.offsetHdr.value.fromArray(e);
        }
        get offsetSdr() {
            return this.uniforms.offsetSdr.value.toArray();
        }
        set offsetSdr(e) {
            this.uniforms.offsetSdr.value.fromArray(e);
        }
        get gainMapMin() {
            return this.uniforms.gainMapMin.value.toArray();
        }
        set gainMapMin(e) {
            this.uniforms.gainMapMin.value.fromArray(e);
        }
        get gainMapMax() {
            return this.uniforms.gainMapMax.value.toArray();
        }
        set gainMapMax(e) {
            this.uniforms.gainMapMax.value.fromArray(e);
        }
        get gamma() {
            const e = this.uniforms.gamma.value;
            return [
                1 / e.x,
                1 / e.y,
                1 / e.z
            ];
        }
        set gamma(e) {
            const a = this.uniforms.gamma.value;
            a.x = 1 / e[0], a.y = 1 / e[1], a.z = 1 / e[2];
        }
        get hdrCapacityMin() {
            return this._hdrCapacityMin;
        }
        set hdrCapacityMin(e) {
            this._hdrCapacityMin = e, this.calculateWeight();
        }
        get hdrCapacityMax() {
            return this._hdrCapacityMax;
        }
        set hdrCapacityMax(e) {
            this._hdrCapacityMax = e, this.calculateWeight();
        }
        get maxDisplayBoost() {
            return this._maxDisplayBoost;
        }
        set maxDisplayBoost(e) {
            this._maxDisplayBoost = Math.max(1, Math.min(65504, e)), this.calculateWeight();
        }
        calculateWeight() {
            const e = (Math.log2(this._maxDisplayBoost) - this._hdrCapacityMin) / (this._hdrCapacityMax - this._hdrCapacityMin);
            this.uniforms.weightFactor.value = Math.max(0, Math.min(1, e));
        }
    }
    class rv extends d_ {
        constructor(e, a){
            super({
                renderer: e,
                createMaterial: (s)=>new m_(s),
                createQuadRenderer: (s)=>new Of(s)
            }, a);
        }
        async render(e, a, s, i) {
            const { sdrImage: o, gainMapImage: u, needsFlip: d } = await this.processImages(s, i, "flipY"), { gainMap: c, sdr: h } = this.createTextures(o, u, d);
            this.updateQuadRenderer(e, o, c, h, a), e.render();
        }
    }
    class g_ extends rv {
        load([e, a, s], i, o, u) {
            const d = this.prepareQuadRenderer();
            let c, h, p;
            const v = async ()=>{
                if (c && h && p) {
                    try {
                        await this.render(d, p, c, h);
                    } catch (I) {
                        this.manager.itemError(e), this.manager.itemError(a), this.manager.itemError(s), typeof u == "function" && u(I), d.disposeOnDemandRenderer();
                        return;
                    }
                    typeof i == "function" && i(d), this.manager.itemEnd(e), this.manager.itemEnd(a), this.manager.itemEnd(s), d.disposeOnDemandRenderer();
                }
            };
            let y = !0, b = 0, S = 0, _ = !0, x = 0, k = 0, T = !0, A = 0, U = 0;
            const D = ()=>{
                if (typeof o == "function") {
                    const I = b + x + A, F = S + k + U, Y = y && _ && T;
                    o(new ProgressEvent("progress", {
                        lengthComputable: Y,
                        loaded: F,
                        total: I
                    }));
                }
            };
            this.manager.itemStart(e), this.manager.itemStart(a), this.manager.itemStart(s);
            const R = new El(this._internalLoadingManager);
            R.setResponseType("arraybuffer"), R.setRequestHeader(this.requestHeader), R.setPath(this.path), R.setWithCredentials(this.withCredentials), R.load(e, async (I)=>{
                if (typeof I == "string") throw new Error("Invalid sdr buffer");
                c = I, await v();
            }, (I)=>{
                y = I.lengthComputable, S = I.loaded, b = I.total, D();
            }, (I)=>{
                this.manager.itemError(e), typeof u == "function" && u(I);
            });
            const N = new El(this._internalLoadingManager);
            N.setResponseType("arraybuffer"), N.setRequestHeader(this.requestHeader), N.setPath(this.path), N.setWithCredentials(this.withCredentials), N.load(a, async (I)=>{
                if (typeof I == "string") throw new Error("Invalid gainmap buffer");
                h = I, await v();
            }, (I)=>{
                _ = I.lengthComputable, k = I.loaded, x = I.total, D();
            }, (I)=>{
                this.manager.itemError(a), typeof u == "function" && u(I);
            });
            const P = new El(this._internalLoadingManager);
            return P.setRequestHeader(this.requestHeader), P.setPath(this.path), P.setWithCredentials(this.withCredentials), P.load(s, async (I)=>{
                if (typeof I != "string") throw new Error("Invalid metadata string");
                p = JSON.parse(I), await v();
            }, (I)=>{
                T = I.lengthComputable, U = I.loaded, A = I.total, D();
            }, (I)=>{
                this.manager.itemError(s), typeof u == "function" && u(I);
            }), d;
        }
    }
    class v_ extends rv {
        load(e, a, s, i) {
            const o = this.prepareQuadRenderer(), u = new El(this._internalLoadingManager);
            return u.setResponseType("arraybuffer"), u.setRequestHeader(this.requestHeader), u.setPath(this.path), u.setWithCredentials(this.withCredentials), this.manager.itemStart(e), u.load(e, async (d)=>{
                if (typeof d == "string") throw new Error("Invalid buffer, received [string], was expecting [ArrayBuffer]");
                const c = new Uint8Array(d);
                let h, p, v;
                try {
                    const y = await f_(c);
                    h = y.sdr, p = y.gainMap, v = y.metadata;
                } catch (y) {
                    if (y instanceof nv || y instanceof tv) console.warn(`Failure to reconstruct an HDR image from ${e}: Gain map metadata not found in the file, HDRJPGLoader will render the SDR jpeg`), v = {
                        gainMapMin: [
                            0,
                            0,
                            0
                        ],
                        gainMapMax: [
                            1,
                            1,
                            1
                        ],
                        gamma: [
                            1,
                            1,
                            1
                        ],
                        hdrCapacityMin: 0,
                        hdrCapacityMax: 1,
                        offsetHdr: [
                            0,
                            0,
                            0
                        ],
                        offsetSdr: [
                            0,
                            0,
                            0
                        ]
                    }, h = c;
                    else throw y;
                }
                try {
                    await this.render(o, v, h.buffer, p?.buffer);
                } catch (y) {
                    this.manager.itemError(e), typeof i == "function" && i(y), o.disposeOnDemandRenderer();
                    return;
                }
                typeof a == "function" && a(o), this.manager.itemEnd(e), o.disposeOnDemandRenderer();
            }, s, (d)=>{
                this.manager.itemError(e), typeof i == "function" && i(d);
            }), o;
        }
    }
    const cs = {
        apartment: "lebombo_1k.hdr",
        city: "potsdamer_platz_1k.hdr",
        dawn: "kiara_1_dawn_1k.hdr",
        forest: "forest_slope_1k.hdr",
        lobby: "st_fagans_interior_1k.hdr",
        night: "dikhololo_night_1k.hdr",
        park: "rooitou_park_1k.hdr",
        studio: "studio_small_03_1k.hdr",
        sunset: "venice_sunset_1k.hdr",
        warehouse: "empty_warehouse_01_1k.hdr"
    }, iv = "https://raw.githack.com/pmndrs/drei-assets/456060a26bbeb8fdf79326f224b6d99b8bcce736/hdri/", ro = (r)=>Array.isArray(r), Lf = [
        "/px.png",
        "/nx.png",
        "/py.png",
        "/ny.png",
        "/pz.png",
        "/nz.png"
    ];
    function nu({ files: r = Lf, path: e = "", preset: a = void 0, colorSpace: s = void 0, extensions: i } = {}) {
        a && (zf(a), r = cs[a], e = iv);
        const o = ro(r), { extension: u, isCubemap: d } = Nf(r), c = jf(u);
        if (!c) throw new Error("useEnvironment: Unrecognized file extension: " + r);
        const h = Et((b)=>b.gl);
        M.useLayoutEffect(()=>{
            if (u !== "webp" && u !== "jpg" && u !== "jpeg") return;
            function b() {
                ca.clear(c, o ? [
                    r
                ] : r);
            }
            h.domElement.addEventListener("webglcontextlost", b, {
                once: !0
            });
        }, [
            r,
            h.domElement
        ]);
        const p = ca(c, o ? [
            r
        ] : r, (b)=>{
            (u === "webp" || u === "jpg" || u === "jpeg") && b.setRenderer(h), b.setPath == null || b.setPath(e), i && i(b);
        });
        let v = o ? p[0] : p;
        if (u === "jpg" || u === "jpeg" || u === "webp") {
            var y;
            v = (y = v.renderTarget) == null ? void 0 : y.texture;
        }
        return v.mapping = d ? Sy : xy, v.colorSpace = s ?? (d ? "srgb" : "srgb-linear"), v;
    }
    const y_ = {
        files: Lf,
        path: "",
        preset: void 0,
        extensions: void 0
    };
    nu.preload = (r)=>{
        const e = {
            ...y_,
            ...r
        };
        let { files: a, path: s = "" } = e;
        const { preset: i, extensions: o } = e;
        i && (zf(i), a = cs[i], s = iv);
        const { extension: u } = Nf(a);
        if (u === "webp" || u === "jpg" || u === "jpeg") throw new Error("useEnvironment: Preloading gainmaps is not supported");
        const d = jf(u);
        if (!d) throw new Error("useEnvironment: Unrecognized file extension: " + a);
        ca.preload(d, ro(a) ? [
            a
        ] : a, (c)=>{
            c.setPath == null || c.setPath(s), o && o(c);
        });
    };
    const b_ = {
        files: Lf,
        preset: void 0
    };
    nu.clear = (r)=>{
        const e = {
            ...b_,
            ...r
        };
        let { files: a } = e;
        const { preset: s } = e;
        s && (zf(s), a = cs[s]);
        const { extension: i } = Nf(a), o = jf(i);
        if (!o) throw new Error("useEnvironment: Unrecognized file extension: " + a);
        ca.clear(o, ro(a) ? [
            a
        ] : a);
    };
    function zf(r) {
        if (!(r in cs)) throw new Error("Preset must be one of: " + Object.keys(cs).join(", "));
    }
    function Nf(r) {
        var e;
        const a = ro(r) && r.length === 6, s = ro(r) && r.length === 3 && r.some((u)=>u.endsWith("json")), i = ro(r) ? r[0] : r;
        return {
            extension: a ? "cube" : s ? "webp" : i.startsWith("data:application/exr") ? "exr" : i.startsWith("data:application/hdr") ? "hdr" : i.startsWith("data:image/jpeg") ? "jpg" : (e = i.split(".").pop()) == null || (e = e.split("?")) == null || (e = e.shift()) == null ? void 0 : e.toLowerCase(),
            isCubemap: a,
            isGainmap: s
        };
    }
    function jf(r) {
        return r === "cube" ? _y : r === "hdr" ? BS : r === "exr" ? GS : r === "jpg" || r === "jpeg" ? v_ : r === "webp" ? g_ : null;
    }
    const w_ = (r)=>r.current && r.current.isScene, S_ = (r)=>w_(r) ? r.current : r;
    function Bf(r, e, a, s, i = {}) {
        var o, u, d, c;
        i = {
            backgroundBlurriness: 0,
            backgroundIntensity: 1,
            backgroundRotation: [
                0,
                0,
                0
            ],
            environmentIntensity: 1,
            environmentRotation: [
                0,
                0,
                0
            ],
            ...i
        };
        const h = S_(e || a), p = h.background, v = h.environment, y = {
            backgroundBlurriness: h.backgroundBlurriness,
            backgroundIntensity: h.backgroundIntensity,
            backgroundRotation: (o = (u = h.backgroundRotation) == null || u.clone == null ? void 0 : u.clone()) !== null && o !== void 0 ? o : [
                0,
                0,
                0
            ],
            environmentIntensity: h.environmentIntensity,
            environmentRotation: (d = (c = h.environmentRotation) == null || c.clone == null ? void 0 : c.clone()) !== null && d !== void 0 ? d : [
                0,
                0,
                0
            ]
        };
        return r !== "only" && (h.environment = s), r && (h.background = s), jr(h, i), ()=>{
            r !== "only" && (h.environment = v), r && (h.background = p), jr(h, y);
        };
    }
    function Gf({ scene: r, background: e = !1, map: a, ...s }) {
        const i = Et((o)=>o.scene);
        return M.useLayoutEffect(()=>{
            if (a) return Bf(e, r, i, a, s);
        }), null;
    }
    function av({ background: r = !1, scene: e, blur: a, backgroundBlurriness: s, backgroundIntensity: i, backgroundRotation: o, environmentIntensity: u, environmentRotation: d, ...c }) {
        const h = nu(c), p = Et((v)=>v.scene);
        return M.useLayoutEffect(()=>Bf(r, e, p, h, {
                backgroundBlurriness: a ?? s,
                backgroundIntensity: i,
                backgroundRotation: o,
                environmentIntensity: u,
                environmentRotation: d
            })), M.useEffect(()=>()=>{
                h.dispose();
            }, [
            h
        ]), null;
    }
    function x_({ children: r, near: e = .1, far: a = 1e3, resolution: s = 256, frames: i = 1, map: o, background: u = !1, blur: d, backgroundBlurriness: c, backgroundIntensity: h, backgroundRotation: p, environmentIntensity: v, environmentRotation: y, scene: b, files: S, path: _, preset: x = void 0, extensions: k }) {
        const T = Et((P)=>P.gl), A = Et((P)=>P.scene), U = M.useRef(null), [D] = M.useState(()=>new fs), R = M.useMemo(()=>{
            const P = new Ey(s);
            return P.texture.type = Qn, P;
        }, [
            s
        ]);
        M.useEffect(()=>()=>{
                R.dispose();
            }, [
            R
        ]), M.useLayoutEffect(()=>{
            if (i === 1) {
                const P = T.autoClear;
                T.autoClear = !0, U.current.update(T, D), T.autoClear = P;
            }
            return Bf(u, b, A, R.texture, {
                backgroundBlurriness: d ?? c,
                backgroundIntensity: h,
                backgroundRotation: p,
                environmentIntensity: v,
                environmentRotation: y
            });
        }, [
            r,
            D,
            R.texture,
            b,
            A,
            u,
            i,
            T
        ]);
        let N = 1;
        return Wt(()=>{
            if (i === 1 / 0 || N < i) {
                const P = T.autoClear;
                T.autoClear = !0, U.current.update(T, D), T.autoClear = P, N++;
            }
        }), M.createElement(M.Fragment, null, ps(M.createElement(M.Fragment, null, r, M.createElement("cubeCamera", {
            ref: U,
            args: [
                e,
                a,
                R
            ]
        }), S || x ? M.createElement(av, {
            background: !0,
            files: S,
            preset: x,
            path: _,
            extensions: k
        }) : o ? M.createElement(Gf, {
            background: !0,
            map: o,
            extensions: k
        }) : null), D));
    }
    function __(r) {
        var e, a, s, i;
        const o = nu(r), u = r.map || o;
        M.useMemo(()=>$l({
                GroundProjectedEnvImpl: RS
            }), []), M.useEffect(()=>()=>{
                o.dispose();
            }, [
            o
        ]);
        const d = M.useMemo(()=>[
                u
            ], [
            u
        ]), c = (e = r.ground) == null ? void 0 : e.height, h = (a = r.ground) == null ? void 0 : a.radius, p = (s = (i = r.ground) == null ? void 0 : i.scale) !== null && s !== void 0 ? s : 1e3;
        return M.createElement(M.Fragment, null, M.createElement(Gf, un({}, r, {
            map: u
        })), M.createElement("groundProjectedEnvImpl", {
            args: d,
            scale: p,
            height: c,
            radius: h
        }));
    }
    IM = function(r) {
        return r.ground ? M.createElement(__, r) : r.map ? M.createElement(Gf, r) : r.children ? M.createElement(x_, r) : M.createElement(av, r);
    };
    AM = M.forwardRef(({ scale: r = 10, frames: e = 1 / 0, opacity: a = 1, width: s = 1, height: i = 1, blur: o = 1, near: u = 0, far: d = 10, resolution: c = 512, smooth: h = !0, color: p = "#000000", depthWrite: v = !1, renderOrder: y, ...b }, S)=>{
        const _ = M.useRef(null), x = Et((B)=>B.scene), k = Et((B)=>B.gl), T = M.useRef(null);
        s = s * (Array.isArray(r) ? r[0] : r || 1), i = i * (Array.isArray(r) ? r[1] : r || 1);
        const [A, U, D, R, N, P, I] = M.useMemo(()=>{
            const B = new Gr(c, c), K = new Gr(c, c);
            K.texture.generateMipmaps = B.texture.generateMipmaps = !1;
            const ee = new Li(s, i).rotateX(Math.PI / 2), ye = new Xn(ee), xe = new Qm;
            xe.depthTest = xe.depthWrite = !1, xe.onBeforeCompile = (O)=>{
                O.uniforms = {
                    ...O.uniforms,
                    ucolor: {
                        value: new Fr(p)
                    }
                }, O.fragmentShader = O.fragmentShader.replace("void main() {", `uniform vec3 ucolor;
           void main() {
          `), O.fragmentShader = O.fragmentShader.replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );", "vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );");
            };
            const te = new Oi(NS), q = new Oi(jS);
            return q.depthTest = te.depthTest = !1, [
                B,
                ee,
                xe,
                ye,
                te,
                q,
                K
            ];
        }, [
            c,
            s,
            i,
            r,
            p
        ]), F = (B)=>{
            R.visible = !0, R.material = N, N.uniforms.tDiffuse.value = A.texture, N.uniforms.h.value = B * 1 / 256, k.setRenderTarget(I), k.render(R, T.current), R.material = P, P.uniforms.tDiffuse.value = I.texture, P.uniforms.v.value = B * 1 / 256, k.setRenderTarget(A), k.render(R, T.current), R.visible = !1;
        };
        let Y = 0, L, G;
        return Wt(()=>{
            T.current && (e === 1 / 0 || Y < e) && (Y++, L = x.background, G = x.overrideMaterial, _.current.visible = !1, x.background = null, x.overrideMaterial = D, k.setRenderTarget(A), k.render(x, T.current), F(o), h && F(o * .4), k.setRenderTarget(null), _.current.visible = !0, x.overrideMaterial = G, x.background = L);
        }), M.useImperativeHandle(S, ()=>_.current, []), M.createElement("group", un({
            "rotation-x": Math.PI / 2
        }, b, {
            ref: _
        }), M.createElement("mesh", {
            renderOrder: y,
            geometry: U,
            scale: [
                1,
                -1,
                1
            ],
            rotation: [
                -Math.PI / 2,
                0,
                0
            ]
        }, M.createElement("meshBasicMaterial", {
            transparent: !0,
            map: A.texture,
            opacity: a,
            depthWrite: v
        })), M.createElement("orthographicCamera", {
            ref: T,
            args: [
                -s / 2,
                s / 2,
                i / 2,
                -i / 2,
                u,
                d
            ]
        }));
    });
    var nm, rm;
    const im = typeof window < "u" && ((nm = window.document) != null && nm.createElement || ((rm = window.navigator) == null ? void 0 : rm.product) === "ReactNative") ? Ar.useLayoutEffect : Ar.useEffect;
    function E_() {
        const r = Df((e)=>({
                current: new Array,
                version: 0,
                set: e
            }));
        return {
            In: ({ children: e })=>{
                const a = r((i)=>i.set), s = r((i)=>i.version);
                return im(()=>{
                    a((i)=>({
                            version: i.version + 1
                        }));
                }, []), im(()=>(a(({ current: i })=>({
                            current: [
                                ...i,
                                e
                            ]
                        })), ()=>a(({ current: i })=>({
                                current: i.filter((o)=>o !== e)
                            }))), [
                    e,
                    s
                ]), null;
            },
            Out: ()=>{
                const e = r((a)=>a.current);
                return Ar.createElement(Ar.Fragment, null, e);
            }
        };
    }
    function ls(r, e, a) {
        return e in r ? Object.defineProperty(r, e, {
            value: a,
            enumerable: !0,
            configurable: !0,
            writable: !0
        }) : r[e] = a, r;
    }
    function ov(r, e) {
        if (!(r instanceof e)) throw new TypeError("Cannot call a class as a function");
    }
    var br = function r(e, a, s) {
        var i = this;
        ov(this, r), ls(this, "dot2", function(o, u) {
            return i.x * o + i.y * u;
        }), ls(this, "dot3", function(o, u, d) {
            return i.x * o + i.y * u + i.z * d;
        }), this.x = e, this.y = a, this.z = s;
    }, M_ = [
        new br(1, 1, 0),
        new br(-1, 1, 0),
        new br(1, -1, 0),
        new br(-1, -1, 0),
        new br(1, 0, 1),
        new br(-1, 0, 1),
        new br(1, 0, -1),
        new br(-1, 0, -1),
        new br(0, 1, 1),
        new br(0, -1, 1),
        new br(0, 1, -1),
        new br(0, -1, -1)
    ], am = [
        151,
        160,
        137,
        91,
        90,
        15,
        131,
        13,
        201,
        95,
        96,
        53,
        194,
        233,
        7,
        225,
        140,
        36,
        103,
        30,
        69,
        142,
        8,
        99,
        37,
        240,
        21,
        10,
        23,
        190,
        6,
        148,
        247,
        120,
        234,
        75,
        0,
        26,
        197,
        62,
        94,
        252,
        219,
        203,
        117,
        35,
        11,
        32,
        57,
        177,
        33,
        88,
        237,
        149,
        56,
        87,
        174,
        20,
        125,
        136,
        171,
        168,
        68,
        175,
        74,
        165,
        71,
        134,
        139,
        48,
        27,
        166,
        77,
        146,
        158,
        231,
        83,
        111,
        229,
        122,
        60,
        211,
        133,
        230,
        220,
        105,
        92,
        41,
        55,
        46,
        245,
        40,
        244,
        102,
        143,
        54,
        65,
        25,
        63,
        161,
        1,
        216,
        80,
        73,
        209,
        76,
        132,
        187,
        208,
        89,
        18,
        169,
        200,
        196,
        135,
        130,
        116,
        188,
        159,
        86,
        164,
        100,
        109,
        198,
        173,
        186,
        3,
        64,
        52,
        217,
        226,
        250,
        124,
        123,
        5,
        202,
        38,
        147,
        118,
        126,
        255,
        82,
        85,
        212,
        207,
        206,
        59,
        227,
        47,
        16,
        58,
        17,
        182,
        189,
        28,
        42,
        223,
        183,
        170,
        213,
        119,
        248,
        152,
        2,
        44,
        154,
        163,
        70,
        221,
        153,
        101,
        155,
        167,
        43,
        172,
        9,
        129,
        22,
        39,
        253,
        19,
        98,
        108,
        110,
        79,
        113,
        224,
        232,
        178,
        185,
        112,
        104,
        218,
        246,
        97,
        228,
        251,
        34,
        242,
        193,
        238,
        210,
        144,
        12,
        191,
        179,
        162,
        241,
        81,
        51,
        145,
        235,
        249,
        14,
        239,
        107,
        49,
        192,
        214,
        31,
        181,
        199,
        106,
        157,
        184,
        84,
        204,
        176,
        115,
        121,
        50,
        45,
        127,
        4,
        150,
        254,
        138,
        236,
        205,
        93,
        222,
        114,
        67,
        29,
        24,
        72,
        243,
        141,
        128,
        195,
        78,
        66,
        215,
        61,
        156,
        180
    ], om = new Array(512), sm = new Array(512), C_ = function(e) {
        e > 0 && e < 1 && (e *= 65536), e = Math.floor(e), e < 256 && (e |= e << 8);
        for(var a = 0; a < 256; a++){
            var s;
            a & 1 ? s = am[a] ^ e & 255 : s = am[a] ^ e >> 8 & 255, om[a] = om[a + 256] = s, sm[a] = sm[a + 256] = M_[s % 12];
        }
    };
    C_(0);
    function T_(r) {
        if (typeof r == "number") r = Math.abs(r);
        else if (typeof r == "string") {
            var e = r;
            r = 0;
            for(var a = 0; a < e.length; a++)r = (r + (a + 1) * (e.charCodeAt(a) % 96)) % 2147483647;
        }
        return r === 0 && (r = 311), r;
    }
    function lm(r) {
        var e = T_(r);
        return function() {
            var a = e * 48271 % 2147483647;
            return e = a, a / 2147483647;
        };
    }
    var P_ = function r(e) {
        var a = this;
        ov(this, r), ls(this, "seed", 0), ls(this, "init", function(s) {
            a.seed = s, a.value = lm(s);
        }), ls(this, "value", lm(this.seed)), this.init(e);
    };
    new P_(Math.random());
    let Hf, um;
    Hf = M.createContext(null);
    um = (r)=>(r.getAttributes() & 2) === 2;
    FM = M.memo(M.forwardRef(({ children: r, camera: e, scene: a, resolutionScale: s, enabled: i = !0, renderPriority: o = 1, autoClear: u = !0, depthBuffer: d, enableNormalPass: c, stencilBuffer: h, multisampling: p = 8, frameBufferType: v = Qn }, y)=>{
        const { gl: b, scene: S, camera: _, size: x } = Et(), k = a || S, T = e || _, [A, U, D] = M.useMemo(()=>{
            const P = new Fy(b, {
                depthBuffer: d,
                stencilBuffer: h,
                multisampling: p,
                frameBufferType: v
            });
            P.addPass(new Dy(k, T));
            let I = null, F = null;
            return c && (F = new Uy(k, T), F.enabled = !1, P.addPass(F), s !== void 0 && (I = new Oy({
                normalBuffer: F.texture,
                resolutionScale: s
            }), I.enabled = !1, P.addPass(I))), [
                P,
                F,
                I
            ];
        }, [
            T,
            b,
            d,
            h,
            p,
            v,
            k,
            c,
            s
        ]);
        M.useEffect(()=>A?.setSize(x.width, x.height), [
            A,
            x
        ]), Wt((P, I)=>{
            if (i) {
                const F = b.autoClear;
                b.autoClear = u, h && !u && b.clearStencil(), A.render(I), b.autoClear = F;
            }
        }, i ? o : 0);
        const R = M.useRef(null);
        M.useLayoutEffect(()=>{
            const P = [], I = R.current.__r3f;
            if (I && A) {
                const F = I.children;
                for(let Y = 0; Y < F.length; Y++){
                    const L = F[Y].object;
                    if (L instanceof tp) {
                        const G = [
                            L
                        ];
                        if (!um(L)) {
                            let K = null;
                            for(; (K = F[Y + 1]?.object) instanceof tp && !um(K);)G.push(K), Y++;
                        }
                        const B = new Ly(T, ...G);
                        P.push(B);
                    } else L instanceof By && P.push(L);
                }
                for (const Y of P)A?.addPass(Y);
                U && (U.enabled = !0), D && (D.enabled = !0);
            }
            return ()=>{
                for (const F of P)A?.removePass(F);
                U && (U.enabled = !1), D && (D.enabled = !1);
            };
        }, [
            A,
            r,
            T,
            U,
            D
        ]), M.useEffect(()=>{
            const P = b.toneMapping;
            return b.toneMapping = qm, ()=>{
                b.toneMapping = P;
            };
        }, [
            b
        ]);
        const N = M.useMemo(()=>({
                composer: A,
                normalPass: U,
                downSamplingPass: D,
                resolutionScale: s,
                camera: T,
                scene: k
            }), [
            A,
            U,
            D,
            s,
            T,
            k
        ]);
        return M.useImperativeHandle(y, ()=>A, [
            A
        ]), ne.jsx(Hf.Provider, {
            value: N,
            children: ne.jsx("group", {
                ref: R,
                children: r
            })
        });
    }));
    let k_ = 0;
    let cm, Wf, R_, fm;
    cm = new WeakMap;
    Wf = (r, e)=>function({ blendFunction: a = e?.blendFunction, opacity: s = e?.opacity, ...i }) {
            let o = cm.get(r);
            if (!o) {
                const c = `@react-three/postprocessing/${r.name}-${k_++}`;
                $l({
                    [c]: r
                }), cm.set(r, o = c);
            }
            const u = Et((c)=>c.camera), d = Ar.useMemo(()=>[
                    ...e?.args ?? [],
                    ...i.args ?? [
                        {
                            ...e,
                            ...i
                        }
                    ]
                ], [
                JSON.stringify(i)
            ]);
            return ne.jsx(o, {
                camera: u,
                "blendMode-blendFunction": a,
                "blendMode-opacity-value": s,
                ...i,
                args: d
            });
        };
    DM = M.forwardRef(function({ blendFunction: r, worldFocusDistance: e, worldFocusRange: a, focusDistance: s, focusRange: i, focalLength: o, bokehScale: u, resolutionScale: d, resolutionX: c, resolutionY: h, width: p, height: v, target: y, depthTexture: b, ...S }, _) {
        const { camera: x } = M.useContext(Hf), k = y != null, T = M.useMemo(()=>{
            const A = new Ny(x, {
                blendFunction: r,
                worldFocusDistance: e,
                worldFocusRange: a,
                focusDistance: s,
                focusRange: i,
                focalLength: o,
                bokehScale: u,
                resolutionScale: d,
                resolutionX: c,
                resolutionY: h,
                width: p,
                height: v
            });
            k && (A.target = new ke), b && A.setDepthTexture(b.texture, b.packing);
            const U = A.maskPass;
            return U.maskFunction = jy.MULTIPLY_RGB_SET_ALPHA, A;
        }, [
            x,
            r,
            e,
            a,
            s,
            i,
            o,
            u,
            d,
            c,
            h,
            p,
            v,
            k,
            b
        ]);
        return M.useEffect(()=>()=>{
                T.dispose();
            }, [
            T
        ]), ne.jsx("primitive", {
            ...S,
            ref: _,
            object: T,
            target: y
        });
    });
    UM = Wf(Gy, {
        blendFunction: 0
    });
    OM = M.forwardRef(function(r, e) {
        const { camera: a, normalPass: s, downSamplingPass: i, resolutionScale: o } = M.useContext(Hf), u = M.useMemo(()=>s === null && i === null ? (console.error("Please enable the NormalPass in the EffectComposer in order to use SSAO."), {}) : new zy(a, s && !i ? s.texture : null, {
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
                normalDepthBuffer: i ? i.texture : null,
                resolutionScale: o ?? 1,
                depthAwareUpsampling: !0,
                ...r
            }), [
            a,
            i,
            s,
            o
        ]);
        return ne.jsx("primitive", {
            ref: e,
            object: u,
            dispose: null
        });
    });
    LM = Wf(Hy);
    zM = Wf(Wy);
    R_ = .05;
    fm = .1;
    function sv(r, e, a) {
        const s = e.gamepad;
        if (s == null) return;
        const i = a.components;
        for(const o in i){
            let u = r[o];
            u == null && (r[o] = u = {});
            const { gamepadIndices: d } = i[o];
            let c = !1, h = !1;
            if (d.button != null && d.button < s.buttons.length) {
                const p = s.buttons[d.button];
                u.button = Ml(p.value, 0, 1), c ||= p.pressed || u.button === 1, h ||= p.touched || u.button > R_;
            }
            d.xAxis != null && d.xAxis < s.axes.length && (u.xAxis = Ml(s.axes[d.xAxis], -1, 1), h ||= Math.abs(u.xAxis) > fm), d.yAxis != null && d.yAxis < s.axes.length && (u.yAxis = Ml(s.axes[d.yAxis], -1, 1), h ||= Math.abs(u.yAxis) > fm), u.state = c ? "pressed" : h ? "touched" : "default";
        }
    }
    function I_(r) {
        return {
            data: new Float32Array(r.size * 16)
        };
    }
    function A_(r, e, a, s, i) {
        const o = s.getReferenceSpace();
        o == null || e == null || e.session.visibilityState === "visible-blurred" || e.session.visibilityState === "hidden" || F_(e, o, a, r.data);
    }
    const Wc = new Yn, Vc = new Yn;
    function F_(r, e, a, s) {
        if (!r.fillPoses(a.values(), e, s)) return !1;
        Wc.fromArray(s, 0), Wc.invert();
        for(let o = 0; o < s.length; o += 16)Vc.fromArray(s, o), Vc.premultiply(Wc), Vc.toArray(s, o);
        return !0;
    }
    const D_ = "generic-hand";
    function U_(r, e) {
        const a = e?.baseAssetPath ?? Tv, s = e?.defaultXRHandProfileId ?? D_;
        return new URL(`${s}/${r}.glb`, a).href;
    }
    function O_({ scene: r }) {
        const e = My(r), a = e.getObjectByProperty("type", "SkinnedMesh");
        if (a == null) throw new Error("missing SkinnedMesh in loaded XRHand model");
        return a.frustumCulled = !1, e;
    }
    function L_(r, e) {
        r.renderOrder = e?.renderOrder ?? 0, r.traverse((a)=>{
            a instanceof Xn && a.material instanceof eg && (a.material.colorWrite = e?.colorWrite ?? !0);
        });
    }
    function z_(r, e, a, s, i) {
        return {
            id: r,
            isPrimary: i,
            type: "hand",
            inputSource: e,
            pose: I_(e.hand),
            assetPath: U_(e.handedness, a),
            events: s
        };
    }
    function N_({ inputSource: r, pose: e }, a, s) {
        A_(e, a, r.hand, s, r.handedness);
    }
    const j_ = [
        "wrist",
        "thumb-metacarpal",
        "thumb-phalanx-proximal",
        "thumb-phalanx-distal",
        "thumb-tip",
        "index-finger-metacarpal",
        "index-finger-phalanx-proximal",
        "index-finger-phalanx-intermediate",
        "index-finger-phalanx-distal",
        "index-finger-tip",
        "middle-finger-metacarpal",
        "middle-finger-phalanx-proximal",
        "middle-finger-phalanx-intermediate",
        "middle-finger-phalanx-distal",
        "middle-finger-tip",
        "ring-finger-metacarpal",
        "ring-finger-phalanx-proximal",
        "ring-finger-phalanx-intermediate",
        "ring-finger-phalanx-distal",
        "ring-finger-tip",
        "pinky-finger-metacarpal",
        "pinky-finger-phalanx-proximal",
        "pinky-finger-phalanx-intermediate",
        "pinky-finger-phalanx-distal",
        "pinky-finger-tip"
    ];
    function B_(r, e, a) {
        const s = new Float32Array(r.size * 16), i = j_.map((o)=>{
            const u = e.getObjectByName(o);
            if (u == null) throw new Error(`missing joint "${o}" in hand model`);
            return u.matrixAutoUpdate = !1, u;
        });
        return (o)=>{
            const u = typeof a == "function" ? a() : a;
            if (o == null || u == null) return;
            o.fillPoses(r.values(), u, s);
            const d = i.length;
            for(let c = 0; c < d; c++)i[c].matrix.fromArray(s, c * 16);
        };
    }
    function G_(r) {
        return r != null && typeof r == "object" && "inputSource" in r;
    }
    function H_(r, e) {
        const a = (s)=>e.push(s);
        return r.addEventListener("selectstart", a), r.addEventListener("selectend", a), r.addEventListener("select", a), r.addEventListener("squeeze", a), r.addEventListener("squeezestart", a), r.addEventListener("squeezeend", a), ()=>{
            r.removeEventListener("selectstart", a), r.removeEventListener("selectend", a), r.removeEventListener("select", a), r.removeEventListener("squeeze", a), r.removeEventListener("squeezestart", a), r.removeEventListener("squeezeend", a);
        };
    }
    let W_ = 0;
    function V_(r, e) {
        const a = new Map, s = new w3(e), i = new Map;
        return (o, u, d)=>{
            if (d === "remove-all") {
                for (const h of a.values())h();
                return u;
            }
            const c = [
                ...u
            ];
            for (const { added: h, isPrimary: p, removed: v } of d){
                if (v != null) for (const y of v){
                    const b = c.findIndex(({ inputSource: S, isPrimary: _ })=>_ === p && S === y);
                    b !== -1 && (c.splice(b, 1), a.get(y)?.(), a.delete(y));
                }
                if (h != null) for (const y of h){
                    const b = [];
                    let S = H_(o, b);
                    const _ = `${y.handedness}-${y.hand ? "hand" : "nohand"}-${y.targetRayMode}-${y.profiles.join(",")}`;
                    let x;
                    if ((x = i.get(_)) == null && i.set(_, x = `${W_++}`), y.hand != null) c.push(z_(x, y, e, b, p));
                    else switch(y.targetRayMode){
                        case "gaze":
                            c.push({
                                id: x,
                                isPrimary: p,
                                type: "gaze",
                                inputSource: y,
                                events: b
                            });
                            break;
                        case "screen":
                            c.push({
                                id: x,
                                isPrimary: p,
                                type: "screenInput",
                                inputSource: y,
                                events: b
                            });
                            break;
                        case "transient-pointer":
                            c.push({
                                id: x,
                                isPrimary: p,
                                type: "transientPointer",
                                inputSource: y,
                                events: b
                            });
                            break;
                        case "tracked-pointer":
                            let k = !1;
                            const T = S;
                            S = ()=>{
                                T(), k = !0;
                            };
                            const A = S3(x, y, s, b, p);
                            A instanceof Promise ? A.then((U)=>!k && r(U)).catch(console.error) : c.push(A);
                            break;
                    }
                    a.set(y, S);
                }
            }
            return c;
        };
    }
    function X_(r, e) {
        const a = (s, i)=>{
            i != null && s.visibilityState === i.visibilityState || e(s.visibilityState === "visible");
        };
        return a(r.getState()), r.subscribe(a);
    }
    class Y_ extends ql {
        constructor(){
            super({
                transparent: !0,
                toneMapped: !1,
                depthWrite: !1
            });
        }
        onBeforeCompile(e, a) {
            super.onBeforeCompile(e, a), e.vertexShader = `varying vec2 vLocalPosition;
` + e.vertexShader, e.vertexShader = e.vertexShader.replace("#include <color_vertex>", `#include <color_vertex>
        vLocalPosition = position.xy * 2.0;`), e.fragmentShader = `varying vec2 vLocalPosition;
` + e.fragmentShader, e.fragmentShader = e.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
          float value = max(0.0, 1.0 - sqrt(dot(vLocalPosition, vLocalPosition)));
          diffuseColor.a = diffuseColor.a * value * value;`);
        }
    }
    const q_ = new ke(0, 0, 1), dm = new Vn, Xc = new ke;
    function Z_(r, e, a, s, i) {
        const o = s.getIntersection();
        if (o == null || !s.getEnabled() || o.object.isVoidObject === !0 || !lv(r)) {
            e.visible = !1;
            return;
        }
        e.visible = !0;
        const u = typeof i.color == "function" ? i.color(s) : i.color;
        Array.isArray(u) ? a.color.set(...u) : a.color.set(u ?? "white"), a.opacity = typeof i.opacity == "function" ? i.opacity(s) : i.opacity ?? .4, e.position.copy(o.pointOnFace), e.scale.setScalar(i.size ?? .1);
        const d = o.normal ?? o.face?.normal;
        d != null && (dm.setFromUnitVectors(q_, d), o.object.getWorldQuaternion(e.quaternion), e.quaternion.multiply(dm), Xc.set(0, 0, i.cursorOffset ?? .01), Xc.applyQuaternion(e.quaternion), e.position.add(Xc)), e.updateMatrix();
    }
    function lv({ visible: r, parent: e }) {
        return r ? e == null ? !0 : lv(e) : !1;
    }
    class Q_ extends ql {
        constructor(){
            super({
                transparent: !0,
                toneMapped: !1
            });
        }
        onBeforeCompile(e, a) {
            super.onBeforeCompile(e, a), e.vertexShader = `varying float vFade;
` + e.vertexShader, e.vertexShader = e.vertexShader.replace("#include <color_vertex>", `#include <color_vertex>
            vFade = position.z + 0.5;`), e.fragmentShader = `varying float vFade;
` + e.fragmentShader, e.fragmentShader = e.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
              diffuseColor.a *= vFade;`);
        }
    }
    function K_(r, e, a, s) {
        const i = a.getIntersection();
        if (!a.getEnabled() || i == null) {
            r.visible = !1;
            return;
        }
        r.visible = !0;
        const o = typeof s.color == "function" ? s.color(a) : s.color;
        Array.isArray(o) ? e.color.set(...o) : e.color.set(o ?? "white"), e.opacity = typeof s.opacity == "function" ? s.opacity(a) : s.opacity ?? .4;
        const u = Math.min(s.maxLength ?? 1, i.distance);
        r.position.z = -u / 2;
        const d = s.size ?? .005;
        r.scale.set(d, d, u), r.updateMatrix();
    }
    function $_(r, e, a, s, i, o = {}) {
        const u = (v)=>{
            v.inputSource === a && r.down(Object.assign(v, {
                button: o.button ?? 0
            }));
        }, d = (v)=>{
            v.inputSource === a && r.up(Object.assign(v, {
                button: o.button ?? 0
            }));
        }, c = `${s}start`, h = `${s}end`, p = i.length;
        for(let v = 0; v < p; v++){
            const y = i[v];
            switch(y.type){
                case c:
                    u(y);
                    break;
                case h:
                    d(y);
                    break;
            }
        }
        return e.addEventListener(c, u), e.addEventListener(h, d), ()=>{
            e.removeEventListener(c, u), e.removeEventListener(h, d);
        };
    }
    function J_(r) {
        return r.getButtonsDown().size > 0 ? .6 : uv(r.getIntersection()?.distance ?? 1 / 0, .07, 0, .2, .4);
    }
    function jl(r) {
        return r.getButtonsDown().size > 0 ? .6 : .4;
    }
    function eE(r) {
        return uv(r.getIntersection()?.distance ?? 1 / 0, .1, .03, .2, .6);
    }
    function uv(r, e, a, s, i) {
        return s + Math.max(0, Math.min(1, (r - e) / (a - e))) * (i - s);
    }
    function tE(r, e) {
        return (a, s)=>{
            if (r === e) return a.identity(), !0;
            const i = typeof e == "function" ? e() : e;
            if (i == null) return !1;
            const o = s?.getPose(r, i);
            return o == null ? !1 : (a.fromArray(o.transform.matrix), !0);
        };
    }
    function ru(r, e, a, s) {
        r.updateWorldMatrix(!0, !1), s?.copy(r.matrix);
        const i = cv(r.parent, r, s);
        return i ?? (s != null && nE(r, e, s), a);
    }
    function nE(r, e, a) {
        if (r.updateWorldMatrix(!0, !1), e == null) {
            a.copy(r.matrixWorld);
            return;
        }
        e.updateWorldMatrix(!0, !1), a.copy(e.matrixWorld).invert().multiply(r.matrixWorld);
    }
    function cv(r, e, a) {
        if (r != null) return r.xrSpace != null ? (a?.copy(r.matrixWorld).invert().multiply(e.matrixWorld), r.xrSpace) : cv(r.parent, e, a);
    }
    class rE {
        nativeEvent;
        NONE = 0;
        CAPTURING_PHASE = 1;
        AT_TARGET = 2;
        BUBBLING_PHASE = 3;
        relatedTarget = null;
        get altKey() {
            return this.getFromNative("altKey", !1);
        }
        get button() {
            return this.getFromNative("button", 0);
        }
        get buttons() {
            return this.getFromNative("buttons", 0);
        }
        get clientX() {
            return this.getFromNative("clientX", 0);
        }
        get clientY() {
            return this.getFromNative("clientY", 0);
        }
        get ctrlKey() {
            return this.getFromNative("ctrlKey", !1);
        }
        get layerX() {
            return this.getFromNative("layerX", 0);
        }
        get layerY() {
            return this.getFromNative("layerY", 0);
        }
        get metaKey() {
            return this.getFromNative("metaKey", !1);
        }
        get movementX() {
            return this.getFromNative("movementX", 0);
        }
        get movementY() {
            return this.getFromNative("movementY", 0);
        }
        get offsetX() {
            return this.getFromNative("offsetX", 0);
        }
        get offsetY() {
            return this.getFromNative("offsetY", 0);
        }
        get pageX() {
            return this.getFromNative("pageX", 0);
        }
        get pageY() {
            return this.getFromNative("pageY", 0);
        }
        get screenX() {
            return this.getFromNative("screenX", 0);
        }
        get screenY() {
            return this.getFromNative("screenY", 0);
        }
        get shiftKey() {
            return this.getFromNative("shiftKey", !1);
        }
        get x() {
            return this.getFromNative("x", 0);
        }
        get y() {
            return this.getFromNative("y", 0);
        }
        get detail() {
            return this.getFromNative("detail", 0);
        }
        get view() {
            return this.getFromNative("view", null);
        }
        get which() {
            return this.getFromNative("which", 0);
        }
        get cancelBubble() {
            return this.getFromNative("cancelBubble", !1);
        }
        get composed() {
            return this.getFromNative("composed", !1);
        }
        get eventPhase() {
            return this.getFromNative("eventPhase", 0);
        }
        get isTrusted() {
            return this.getFromNative("isTrusted", !1);
        }
        get returnValue() {
            return this.getFromNative("returnValue", !1);
        }
        get timeStamp() {
            return this.getFromNative("timeStamp", 0);
        }
        get cancelable() {
            return this.getFromNative("cancelable", !1);
        }
        get defaultPrevented() {
            return this.getFromNative("defaultPrevented", !1);
        }
        constructor(e){
            this.nativeEvent = e;
        }
        getFromNative(e, a) {
            return e in this.nativeEvent ? this.nativeEvent[e] : a;
        }
    }
    const Yc = new ke;
    class An extends rE {
        type;
        bubbles;
        internalPointer;
        intersection;
        camera;
        currentObject;
        object;
        propagationState;
        get pointerId() {
            return this.internalPointer.id;
        }
        get pointerType() {
            return this.internalPointer.type;
        }
        get pointerState() {
            return this.internalPointer.state;
        }
        get distance() {
            return this.intersection.distance;
        }
        get distanceToRay() {
            return this.intersection.distanceToRay;
        }
        get point() {
            return this.intersection.point;
        }
        get index() {
            return this.intersection.index;
        }
        get face() {
            return this.intersection.face;
        }
        get faceIndex() {
            return this.intersection.faceIndex;
        }
        get uv() {
            return this.intersection.uv;
        }
        get uv1() {
            return this.intersection.uv1;
        }
        get normal() {
            return this.intersection.normal;
        }
        get instanceId() {
            return this.intersection.instanceId;
        }
        get pointOnLine() {
            return this.intersection.pointOnLine;
        }
        get batchId() {
            return this.intersection.batchId;
        }
        get pointerPosition() {
            return this.intersection.pointerPosition;
        }
        get pointerQuaternion() {
            return this.intersection.pointerQuaternion;
        }
        get pointOnFace() {
            return this.intersection.pointOnFace;
        }
        get localPoint() {
            return this.intersection.localPoint;
        }
        get details() {
            return this.intersection.details;
        }
        get target() {
            return this.object;
        }
        get currentTarget() {
            return this.currentObject;
        }
        get eventObject() {
            return this.currentObject;
        }
        get srcElement() {
            return this.currentObject;
        }
        _pointer;
        get pointer() {
            return this._pointer == null && (Yc.copy(this.intersection.point).project(this.camera), this._pointer = new Ft(Yc.x, Yc.y)), this._pointer;
        }
        _ray;
        get ray() {
            if (this._ray != null) return this._ray;
            switch(this.intersection.details.type){
                case "screen-ray":
                case "ray":
                case "sphere":
                    return this._ray = new Al(this.intersection.pointerPosition, new ke(0, 0, -1).applyQuaternion(this.intersection.pointerQuaternion));
                case "lines":
                    return this._ray = new Al(this.intersection.details.line.start, this.intersection.details.line.end.clone().sub(this.intersection.details.line.start).normalize());
            }
        }
        _intersections = [];
        get intersections() {
            return this._intersections == null && (this._intersections = [
                {
                    ...this.intersection,
                    eventObject: this.currentObject
                }
            ]), this._intersections;
        }
        _unprojectedPoint;
        get unprojectedPoint() {
            if (this._unprojectedPoint == null) {
                const e = this.pointer;
                this._unprojectedPoint = new ke(e.x, e.y, 0).unproject(this.camera);
            }
            return this._unprojectedPoint;
        }
        get stopped() {
            return this.propagationState.stoppedImmediate || this.propagationState.stopped;
        }
        get stoppedImmediate() {
            return this.propagationState.stoppedImmediate;
        }
        get delta() {
            throw new Error("not supported");
        }
        constructor(e, a, s, i, o, u, d = o.object, c = d, h = {
            stopped: !a,
            stoppedImmediate: !1
        }){
            super(s), this.type = e, this.bubbles = a, this.internalPointer = i, this.intersection = o, this.camera = u, this.currentObject = d, this.object = c, this.propagationState = h;
        }
        stopPropagation() {
            this.propagationState.stopped = !0;
        }
        stopImmediatePropagation() {
            this.propagationState.stoppedImmediate = !0;
        }
        retarget(e) {
            return new An(this.type, this.bubbles, this.nativeEvent, this.internalPointer, this.intersection, this.camera, e, this.target, this.propagationState);
        }
    }
    class Bl extends An {
        get deltaX() {
            return this.nativeEvent.deltaX;
        }
        get deltaY() {
            return this.nativeEvent.deltaY;
        }
        get deltaZ() {
            return this.nativeEvent.deltaZ;
        }
        constructor(e, a, s, i, o, u){
            super("wheel", !0, e, a, s, i, o, u);
        }
        retarget(e) {
            return new Bl(this.nativeEvent, this.internalPointer, this.intersection, this.camera, e, this.target);
        }
    }
    function nr(r) {
        fv(r, r.currentObject);
    }
    function fv(r, e) {
        if (e == null) return;
        const a = aE(e, r.type);
        if (a != null && a.length > 0) {
            const s = r.retarget(e), i = a.length;
            for(let o = 0; o < i && !s.stoppedImmediate; o++)a[o](s);
        }
        r.stopped || fv(r, e.parent);
    }
    const dv = {
        click: "onClick",
        contextmenu: "onContextMenu",
        dblclick: "onDoubleClick",
        pointercancel: "onPointerCancel",
        pointerdown: "onPointerDown",
        pointerenter: "onPointerEnter",
        pointerleave: "onPointerLeave",
        pointermove: "onPointerMove",
        pointerout: "onPointerOut",
        pointerover: "onPointerOver",
        pointerup: "onPointerUp",
        wheel: "onWheel"
    }, iE = Object.keys(dv);
    function aE(r, e) {
        if (r._listeners != null && e in r._listeners) return r._listeners[e];
        let a;
        if (r.isVoidObject && e === "click" && r.parent?.__r3f != null && (a = r.parent.__r3f.root.getState().onPointerMissed), r.__r3f != null && (a = r.__r3f.handlers[dv[e]]), a != null) return [
            a
        ];
    }
    const oE = 1e10, sE = new tg(oE), hm = new Map;
    function hv(r) {
        let e = hm.get(r);
        return e == null && (e = new Xn(sE), e.isVoidObject = !0, e.parent = r, e.pointerEventsOrder = -1 / 0, hm.set(r, e)), e;
    }
    function iu(r, e, a) {
        const s = e.normal ?? e.face?.normal;
        return s == null ? !1 : (r.setFromNormalAndCoplanarPoint(s, e.localPoint), r.applyMatrix4(a), !0);
    }
    function lE(r, e, a) {
        if (e === "none" || e === "listener" && !r) return !1;
        if (a === "all") return !0;
        if (typeof a == "function") return ({ id: o, type: u, state: d })=>a(o, u, d);
        let s, i;
        return "deny" in a ? (i = !0, s = a.deny) : (i = !1, s = a.allow), Array.isArray(s) ? (o)=>pm(s.includes(o.type), i) : (o)=>pm(s === o.type, i);
    }
    function pm(r, e) {
        return e ? !r : r;
    }
    function Vf(r, e, a, s = !1, i, o, u) {
        const d = s || uE(r, e), c = e.pointerEvents ?? i, h = c ?? e.defaultPointerEvents ?? "listener", p = e.pointerEventsType ?? o ?? "all", v = e.pointerEventsOrder ?? u ?? 0, y = lE(d, h, p), b = a.length;
        if (b === 1) (y === !0 || typeof y == "function" && y(a[0])) && qc(a[0], e, h, p, v);
        else if (y === !0) for(let x = 0; x < b; x++)qc(a[x], e, h, p, v);
        else if (typeof y == "function") for(let x = 0; x < b; x++){
            const k = a[x];
            y(k) && qc(k, e, h, p, v);
        }
        if (e.children.length === 0 || e.intersectChildren === !1) return;
        const S = e.interactableDescendants ?? e.children, _ = S.length;
        for(let x = 0; x < _; x++)Vf(r, S[x], a, d, c, p, v);
    }
    function uE(r, e) {
        if (e.ancestorsHaveListeners || r === "pointer" && e.ancestorsHavePointerListeners || r === "wheel" && e.ancestorsHaveWheelListeners || e.__r3f != null && e.__r3f?.eventCount > 0 && (r === "wheel" && e.__r3f.handlers.onWheel != null || r === "pointer" && Object.keys(e.__r3f.handlers).some((i)=>i != "onWheel"))) return !0;
        if (e._listeners == null) return !1;
        if (r === "wheel") {
            const i = e._listeners.wheel;
            return i != null && i.length > 0;
        }
        const a = Object.entries(e._listeners), s = a.length;
        for(let i = 0; i < s; i++){
            const o = a[i];
            if (o[0] !== "wheel" && iE.includes(o[0]) && o[1] != null && o[1].length > 0) return !0;
        }
        return !1;
    }
    function qc({ intersector: r, options: e }, a, s, i, o) {
        e.filter?.(a, s, i, o) !== !1 && r.executeIntersection(a, o);
    }
    function au(r, e, { customSort: a = cE } = {}, s) {
        let i, o, u;
        const d = r.length;
        for(let c = 0; c < d; c++){
            const h = r[c];
            if (s?.(h) === !1) continue;
            const p = e?.[c];
            (i == null || a(h, p, i, o) < 0) && (u = c, i = h, o = p);
        }
        return u;
    }
    function cE(r, e = 0, a, s = 0) {
        return e != s ? s - e : r.distance - a.distance;
    }
    const mm = 1e7;
    function Xf(r, e, a, s, i, o = 0) {
        const u = e.direction.clone().multiplyScalar(mm), d = mm;
        return {
            distance: d + o,
            object: hv(r),
            point: u,
            normal: e.origin.clone().sub(u).normalize(),
            details: a(u, d),
            pointerPosition: s,
            pointerQuaternion: i,
            pointOnFace: u,
            localPoint: u
        };
    }
    function Gl(r, e, a) {
        for(; a > 0;)r.push(e), --a;
    }
    const Zc = Symbol("buttonsDownTime"), fE = Symbol("buttonsClickTime");
    globalThis.pointerEventspointerMap ??= new Map;
    Ql.prototype.setPointerCapture = function(r) {
        Yf(r)?.setCapture(this);
    };
    Ql.prototype.releasePointerCapture = function(r) {
        const e = Yf(r);
        e == null || !e.hasCaptured(this) || e.setCapture(void 0);
    };
    Ql.prototype.hasPointerCapture = function(r) {
        return Yf(r)?.hasCaptured(this) ?? !1;
    };
    function Yf(r) {
        return globalThis.pointerEventspointerMap?.get(r);
    }
    class go {
        id;
        type;
        state;
        intersector;
        getCamera;
        onMoveCommited;
        parentSetPointerCapture;
        parentReleasePointerCapture;
        options;
        prevIntersection;
        intersection;
        prevEnabled = !0;
        enabled = !0;
        wheelIntersection;
        pointerEntered = [];
        pointerEnteredHelper = [];
        pointerCapture;
        buttonsDownTime = new Map;
        buttonsDown = new Set;
        wasMoved = !1;
        onFirstMove = [];
        constructor(e, a, s, i, o, u, d, c, h = {}){
            this.id = e, this.type = a, this.state = s, this.intersector = i, this.getCamera = o, this.onMoveCommited = u, this.parentSetPointerCapture = d, this.parentReleasePointerCapture = c, this.options = h, globalThis.pointerEventspointerMap?.set(e, this);
        }
        getPointerCapture() {
            return this.pointerCapture;
        }
        hasCaptured(e) {
            return this.pointerCapture?.object === e;
        }
        setCapture(e) {
            this.pointerCapture?.object !== e && (this.pointerCapture != null && (this.parentReleasePointerCapture?.(), this.pointerCapture = void 0), e != null && this.intersection != null && (this.pointerCapture = {
                object: e,
                intersection: this.intersection
            }, this.parentSetPointerCapture?.()));
        }
        getButtonsDown() {
            return this.buttonsDown;
        }
        getIntersection() {
            return this.intersection;
        }
        getEnabled() {
            return this.enabled;
        }
        setEnabled(e, a, s = !0) {
            this.enabled !== e && (!e && this.pointerCapture != null && (this.parentReleasePointerCapture?.(), this.pointerCapture = void 0), this.enabled = e, s && this.commit(a, !1));
        }
        computeIntersection(e, a, s) {
            return this.pointerCapture != null ? this.intersector.intersectPointerCapture(this.pointerCapture, s) : (this.intersector.startIntersection(s), Vf(e, a, [
                this
            ]), this.intersector.finalizeIntersection(a));
        }
        setIntersection(e) {
            this.intersection = e;
        }
        commit(e, a) {
            const s = this.getCamera(), i = this.prevEnabled ? this.prevIntersection : void 0, o = this.enabled ? this.intersection : void 0;
            i != null && i.object != o?.object && nr(new An("pointerout", !0, e, this, i, s));
            const u = this.pointerEntered;
            this.pointerEntered = [], this.pointerEnteredHelper.length = 0, pv(o?.object, this.pointerEntered, u, this.pointerEnteredHelper);
            const d = u.length;
            for(let c = 0; c < d; c++){
                const h = u[c];
                nr(new An("pointerleave", !1, e, this, i, s, h));
            }
            o != null && i?.object != o.object && nr(new An("pointerover", !0, e, this, o, s));
            for(let c = this.pointerEnteredHelper.length - 1; c >= 0; c--){
                const h = this.pointerEnteredHelper[c];
                nr(new An("pointerenter", !1, e, this, o, s, h));
            }
            if (a && o != null && nr(new An("pointermove", !0, e, this, o, s)), this.prevIntersection = this.intersection, this.prevEnabled = this.enabled, !this.wasMoved && this.intersector.isReady()) {
                this.wasMoved = !0;
                const c = this.onFirstMove.length;
                for(let h = 0; h < c; h++)this.onFirstMove[h](s);
                this.onFirstMove.length = 0;
            }
            this.onMoveCommited?.(this);
        }
        move(e, a) {
            this.intersection = this.computeIntersection("pointer", e, a), this.commit(a, !0);
        }
        over(e, a) {
            this.wasMoved || (this.intersection = this.computeIntersection("pointer", e, a), this.commit(a, !1));
        }
        emitMove(e) {
            this.intersection != null && nr(new An("pointermove", !0, e, this, this.intersection, this.getCamera()));
        }
        down(e) {
            if (this.buttonsDown.add(e.button), !this.enabled) return;
            if (!this.wasMoved) {
                this.onFirstMove.push(this.down.bind(this, e));
                return;
            }
            if (this.intersection == null) return;
            nr(new An("pointerdown", !0, e, this, this.intersection, this.getCamera()));
            const { object: a } = this.intersection;
            a[Zc] ??= new Map, a[Zc].set(e.button, e.timeStamp), this.buttonsDownTime.set(e.button, e.timeStamp);
        }
        up(e) {
            if (this.buttonsDown.delete(e.button), !this.enabled) return;
            if (!this.wasMoved) {
                this.onFirstMove.push(this.up.bind(this, e));
                return;
            }
            if (this.intersection == null) return;
            const { clickThesholdMs: a, contextMenuButton: s = 2, dblClickThresholdMs: i = 500, clickThresholdMs: o = a ?? 300 } = this.options;
            this.pointerCapture = void 0;
            const u = dE(this.buttonsDownTime, this.intersection.object[Zc], e.button, e.timeStamp, o), d = this.getCamera();
            if (u && e.button === s && nr(new An("contextmenu", !0, e, this, this.intersection, d)), nr(new An("pointerup", !0, e, this, this.intersection, d)), !u || e.button === s) return;
            nr(new An("click", !0, e, this, this.intersection, d));
            const { object: c } = this.intersection, h = c[fE] ??= new Map, p = h.get(e.button);
            if (p == null || e.timeStamp - p > i) {
                h.set(e.button, e.timeStamp);
                return;
            }
            nr(new An("dblclick", !0, e, this, this.intersection, d)), h.delete(e.button);
        }
        cancel(e) {
            if (this.enabled) {
                if (!this.wasMoved) {
                    this.onFirstMove.push(this.cancel.bind(this, e));
                    return;
                }
                this.intersection != null && nr(new An("pointercancel", !0, e, this, this.intersection, this.getCamera()));
            }
        }
        wheel(e, a, s = !1) {
            if (!this.enabled) return;
            if (!this.wasMoved && s) {
                this.onFirstMove.push(this.wheel.bind(this, e, a, s));
                return;
            }
            s || (this.wheelIntersection = this.computeIntersection("wheel", e, a));
            const i = s ? this.intersection : this.wheelIntersection;
            i != null && nr(new Bl(a, this, i, this.getCamera()));
        }
        emitWheel(e, a = !1) {
            if (!this.enabled) return;
            if (!this.wasMoved && a) {
                this.onFirstMove.push(this.emitWheel.bind(this, e, a));
                return;
            }
            const s = a ? this.intersection : this.wheelIntersection;
            s != null && nr(new Bl(e, this, s, this.getCamera()));
        }
        exit(e) {
            this.wasMoved && (this.pointerCapture != null && (this.parentReleasePointerCapture?.(), this.pointerCapture = void 0), this.intersection = void 0, this.commit(e, !1)), this.onFirstMove.length = 0, this.wasMoved = !1;
        }
    }
    function pv(r, e, a, s) {
        if (r == null) return;
        const i = a.indexOf(r);
        i != -1 ? a.splice(i, 1) : s.push(r), e.push(r), pv(r.parent, e, a, s);
    }
    function dE(r, e, a, s, i) {
        if (e == null) return !1;
        const o = e.get(a);
        return !(o == null || s - o > i || o != r.get(a));
    }
    function ou(r) {
        return r.transformReady === !1 ? !1 : r.parent == null ? (r.matrixWorld.copy(r.matrix), !0) : ou(r.parent) ? (r.matrixWorld.multiplyMatrices(r.parent.matrixWorld, r.matrix), !0) : !1;
    }
    const Ko = new ng, Qc = new ng, gm = new Ft, vm = new Ft, ym = new Ft, Kc = new ke, hE = new Yn, ml = new ke;
    function bs(r, e, a) {
        ml.copy(e).applyMatrix4(hE.copy(a.matrixWorld).invert());
        const s = a.geometry.attributes.uv;
        if (s == null || !(s instanceof wr)) return !1;
        let i;
        return pE(a, (o, u, d)=>{
            a.getVertexPosition(o, Ko.a), a.getVertexPosition(u, Ko.b), a.getVertexPosition(d, Ko.c);
            const c = Ko.closestPointToPoint(ml, Kc).distanceTo(ml);
            i != null && c >= i || (i = c, Qc.copy(Ko), gm.fromBufferAttribute(s, o), vm.fromBufferAttribute(s, u), ym.fromBufferAttribute(s, d));
        }), i == null ? !1 : (Qc.closestPointToPoint(ml, Kc), Qc.getInterpolation(Kc, gm, vm, ym, r), !0);
    }
    function pE(r, e) {
        const a = r.geometry.drawRange;
        if (r.geometry.index != null) {
            const u = r.geometry.index, d = Math.max(0, a.start), c = Math.min(u.count, a.start + a.count);
            for(let h = d; h < c; h += 3)e(u.getX(h), u.getX(h + 1), u.getX(h + 2));
            return;
        }
        const s = r.geometry.attributes.position;
        if (s == null) return;
        const i = Math.max(0, a.start), o = Math.min(s.count, a.start + a.count);
        for(let u = i; u < o; u += 3)e(u, u + 1, u + 2);
    }
    const mE = new Yn, $c = new nf, gE = new ke, bm = new fo, vE = new Al, wm = new Ft, Sm = [
        new ke(0, 0, 0),
        new ke(0, 0, 1)
    ];
    class yE {
        space;
        options;
        raycasters = [];
        fromMatrixWorld = new Yn;
        ready;
        intersects = [];
        pointerEventsOrders = [];
        raycasterIndices = [];
        constructor(e, a){
            this.space = e, this.options = a;
        }
        isReady() {
            return this.ready ?? this.prepareTransformation();
        }
        prepareTransformation() {
            const e = this.space.current;
            return e == null ? this.ready = !1 : (this.ready = ou(e), this.ready ? (this.fromMatrixWorld.copy(e.matrixWorld), !0) : !1);
        }
        intersectPointerCapture({ intersection: e, object: a }) {
            const s = e.details;
            if (s.type != "lines") throw new Error(`unable to process a pointer capture of type "${e.details.type}" with a lines intersector`);
            if (!this.prepareTransformation()) return e;
            const i = this.options.linePoints ?? Sm;
            $c.set(i[s.lineIndex], i[s.lineIndex + 1]).applyMatrix4(this.fromMatrixWorld);
            const o = $c.at(s.distanceOnLine / $c.distance(), new ke);
            e.object.updateWorldMatrix(!0, !1), iu(bm, e, e.object.matrixWorld);
            const u = vE.intersectPlane(bm, new ke) ?? o, d = new ke, c = new Vn;
            this.fromMatrixWorld.decompose(d, c, gE);
            let h = e.uv;
            return e.object instanceof Xn && bs(wm, o, e.object) && (h = wm.clone()), {
                ...e,
                object: a,
                uv: h,
                pointOnFace: u,
                point: o,
                pointerPosition: d,
                pointerQuaternion: c
            };
        }
        startIntersection() {
            if (!this.prepareTransformation()) return;
            const e = this.options.linePoints ?? Sm, a = e.length - 1;
            for(let s = 0; s < a; s++){
                const i = e[s], o = e[s + 1], u = this.raycasters[s] ?? (this.raycasters[s] = new co);
                u.ray.origin.copy(i).applyMatrix4(this.fromMatrixWorld), u.ray.direction.copy(o).applyMatrix4(this.fromMatrixWorld), u.ray.direction.sub(u.ray.origin);
                const d = u.ray.direction.length();
                u.ray.direction.divideScalar(d), u.far = d;
            }
            this.raycasters.length = a;
        }
        executeIntersection(e, a) {
            if (!this.isReady()) return;
            const s = this.intersects.length, i = this.raycasters.length;
            for(let o = 0; o < i; o++){
                const u = this.raycasters[o], d = this.intersects.length;
                e.raycast(u, this.intersects), Gl(this.raycasterIndices, o, this.intersects.length - d);
            }
            Gl(this.pointerEventsOrders, a, this.intersects.length - s);
        }
        finalizeIntersection(e) {
            const a = new ke().setFromMatrixPosition(this.fromMatrixWorld), s = new Vn().setFromRotationMatrix(this.fromMatrixWorld), i = au(this.intersects, this.pointerEventsOrders, this.options), o = i == null ? void 0 : this.intersects[i], u = i == null ? void 0 : this.raycasterIndices[i];
            if (this.intersects.length = 0, this.raycasterIndices.length = 0, this.pointerEventsOrders.length = 0, o == null || u == null) {
                const h = this.raycasters.length - 1, p = this.raycasters.reduce((y, b, S)=>S === h ? y : y + b.far, 0), v = this.raycasters[h];
                return Xf(e, v.ray, (y, b)=>({
                        line: new nf(v.ray.origin.clone(), y),
                        lineIndex: this.raycasters.length - 1,
                        distanceOnLine: b,
                        type: "lines"
                    }), a, s, p);
            }
            let d = o.distance;
            for(let h = 0; h < u; h++)d += this.raycasters[h].far;
            o.object.updateWorldMatrix(!0, !1);
            const c = this.raycasters[u];
            return Object.assign(o, {
                details: {
                    lineIndex: u,
                    distanceOnLine: o.distance,
                    type: "lines",
                    line: new nf(c.ray.origin.clone(), c.ray.direction.clone().multiplyScalar(c.far).add(c.ray.origin))
                },
                distance: d,
                pointerPosition: a,
                pointerQuaternion: s,
                pointOnFace: o.point,
                localPoint: o.point.clone().applyMatrix4(mE.copy(o.object.matrixWorld).invert())
            });
        }
    }
    const yf = new Yn, bf = new ke, bE = new ke(0, 0, -1), xm = new fo, Hl = new Ft;
    class wE {
        space;
        options;
        raycaster = new co;
        raycasterQuaternion = new Vn;
        worldScale = 0;
        ready;
        intersects = [];
        pointerEventsOrders = [];
        constructor(e, a){
            this.space = e, this.options = a;
        }
        isReady() {
            return this.ready ?? this.prepareTransformation();
        }
        prepareTransformation() {
            const e = this.space.current;
            return e == null ? this.ready = !1 : (this.ready = ou(e), this.ready ? (e.matrixWorld.decompose(this.raycaster.ray.origin, this.raycasterQuaternion, bf), this.worldScale = bf.x, this.raycaster.ray.direction.copy(this.options?.direction ?? bE).applyQuaternion(this.raycasterQuaternion), !0) : !1);
        }
        intersectPointerCapture({ intersection: e, object: a }) {
            if (e.details.type != "ray") throw new Error(`unable to process a pointer capture of type "${e.details.type}" with a ray intersector`);
            if (!this.prepareTransformation()) return e;
            e.object.updateWorldMatrix(!0, !1), iu(xm, e, e.object.matrixWorld);
            const { ray: s } = this.raycaster, i = s.intersectPlane(xm, new ke) ?? e.point, o = s.direction.clone().multiplyScalar(e.pointerPosition.distanceTo(e.point)).add(s.origin);
            let u = e.uv;
            return e.object instanceof Xn && bs(Hl, o, e.object) && (u = Hl.clone()), {
                ...e,
                uv: u,
                object: a,
                pointOnFace: i,
                point: o,
                pointerPosition: s.origin.clone(),
                pointerQuaternion: this.raycasterQuaternion.clone()
            };
        }
        startIntersection() {
            this.prepareTransformation();
        }
        executeIntersection(e, a) {
            if (!this.isReady()) return;
            const s = this.intersects.length;
            e.raycast(this.raycaster, this.intersects), Gl(this.pointerEventsOrders, a, this.intersects.length - s);
        }
        finalizeIntersection(e) {
            const a = this.raycaster.ray.origin.clone(), s = this.raycasterQuaternion.clone();
            let i;
            if (this.options.minDistance != null) {
                const d = this.options.minDistance / this.worldScale;
                i = (c)=>c.distance >= d;
            }
            const o = au(this.intersects, this.pointerEventsOrders, this.options, i), u = o == null ? void 0 : this.intersects[o];
            return this.intersects.length = 0, this.pointerEventsOrders.length = 0, u == null ? Xf(e, this.raycaster.ray, ()=>({
                    type: "ray"
                }), a, s) : (u.object.updateWorldMatrix(!0, !1), Object.assign(u, {
                details: {
                    type: "ray"
                },
                pointerPosition: a,
                pointerQuaternion: s,
                pointOnFace: u.point,
                localPoint: u.point.clone().applyMatrix4(yf.copy(u.object.matrixWorld).invert())
            }));
        }
    }
    const SE = new ke;
    class xE {
        prepareTransformation;
        options;
        raycaster = new co;
        cameraQuaternion = new Vn;
        fromPosition = new ke;
        fromQuaternion = new Vn;
        coords = new Ft;
        viewPlane = new fo;
        intersects = [];
        pointerEventsOrders = [];
        constructor(e, a){
            this.prepareTransformation = e, this.options = a;
        }
        isReady() {
            return !0;
        }
        intersectPointerCapture({ intersection: e, object: a }, s) {
            const i = e.details;
            if (i.type != "screen-ray") throw new Error(`unable to process a pointer capture of type "${e.details.type}" with a camera ray intersector`);
            if (!this.startIntersection(s)) return e;
            this.viewPlane.constant -= i.distanceViewPlane;
            const o = this.raycaster.ray.intersectPlane(this.viewPlane, new ke);
            if (o == null) return e;
            e.object.updateWorldMatrix(!0, !1), iu(this.viewPlane, e, e.object.matrixWorld);
            let u = e.uv;
            return e.object instanceof Xn && bs(Hl, o, e.object) && (u = Hl.clone()), {
                ...e,
                details: {
                    ...i,
                    direction: this.raycaster.ray.direction.clone(),
                    screenPoint: this.coords.clone()
                },
                uv: u,
                object: a,
                point: o,
                pointOnFace: o,
                pointerPosition: this.raycaster.ray.origin.clone(),
                pointerQuaternion: this.cameraQuaternion.clone()
            };
        }
        startIntersection(e) {
            const a = this.prepareTransformation(e, this.coords);
            return a == null ? !1 : (a.updateWorldMatrix(!0, !1), a.matrixWorld.decompose(this.fromPosition, this.fromQuaternion, bf), this.raycaster.setFromCamera(this.coords, a), this.viewPlane.setFromNormalAndCoplanarPoint(a.getWorldDirection(SE), this.raycaster.ray.origin), !0);
        }
        executeIntersection(e, a) {
            const s = this.intersects.length;
            e.raycast(this.raycaster, this.intersects), Gl(this.pointerEventsOrders, a, this.intersects.length - s);
        }
        finalizeIntersection(e) {
            const a = this.fromPosition.clone(), s = this.cameraQuaternion.clone(), i = this.raycaster.ray.direction.clone(), o = au(this.intersects, this.pointerEventsOrders, this.options), u = o == null ? void 0 : this.intersects[o];
            return this.intersects.length = 0, this.pointerEventsOrders.length = 0, u == null ? Xf(e, this.raycaster.ray, (d, c)=>({
                    type: "screen-ray",
                    distanceViewPlane: c,
                    screenPoint: this.coords.clone(),
                    direction: i
                }), a, s) : (u.object.updateWorldMatrix(!0, !1), yf.copy(u.object.matrixWorld).invert(), Object.assign(u, {
                details: {
                    type: "screen-ray",
                    distanceViewPlane: this.viewPlane.distanceToPoint(u.point),
                    screenPoint: this.coords.clone(),
                    direction: i
                },
                pointOnFace: u.point,
                pointerPosition: a,
                pointerQuaternion: s,
                localPoint: u.point.clone().applyMatrix4(yf)
            }));
        }
    }
    const _E = new ke, Wl = new Ft;
    class mv {
        space;
        getSphereRadius;
        options;
        fromPosition = new ke;
        fromQuaternion = new Vn;
        collisionSphere = new Ef;
        ready;
        intersects = [];
        constructor(e, a, s){
            this.space = e, this.getSphereRadius = a, this.options = s;
        }
        isReady() {
            return this.ready ?? this.prepareTransformation();
        }
        prepareTransformation() {
            const e = this.space.current;
            return e == null ? this.ready = !1 : (this.ready = ou(e), this.ready ? (e.matrixWorld.decompose(this.fromPosition, this.fromQuaternion, _E), !0) : !1);
        }
        intersectPointerCapture({ intersection: e, object: a }) {
            if (e.details.type != "sphere") throw new Error(`unable to process a pointer capture of type "${e.details.type}" with a sphere intersector`);
            if (!this.prepareTransformation()) return e;
            _m.copy(e.point).sub(e.pointerPosition), Em.copy(e.pointerQuaternion).invert().multiply(this.fromQuaternion);
            const s = _m.clone().applyQuaternion(Em).add(this.fromPosition);
            e.object.updateWorldMatrix(!0, !1), iu(Mm, e, e.object.matrixWorld);
            const i = Mm.projectPoint(this.fromPosition, new ke);
            let o = e.uv;
            return e.object instanceof Xn && bs(Wl, s, e.object) && (o = Wl.clone()), {
                details: {
                    type: "sphere"
                },
                uv: o,
                distance: s.distanceTo(i),
                pointerPosition: this.fromPosition.clone(),
                pointerQuaternion: this.fromQuaternion.clone(),
                object: a,
                point: s,
                pointOnFace: i,
                face: e.face,
                localPoint: e.localPoint
            };
        }
        startIntersection() {
            this.prepareTransformation() && (this.collisionSphere.center.copy(this.fromPosition), this.collisionSphere.radius = this.getSphereRadius());
        }
        executeIntersection(e) {
            this.isReady() && EE(this.collisionSphere, e, this.intersects);
        }
        finalizeIntersection(e) {
            const a = this.fromPosition.clone(), s = this.fromQuaternion.clone(), i = au(this.intersects, void 0, this.options), o = i == null ? void 0 : this.intersects[i];
            return this.intersects.length = 0, o == null ? {
                details: {
                    type: "sphere"
                },
                distance: 0,
                point: a,
                object: hv(e),
                pointerPosition: a,
                pointerQuaternion: s,
                pointOnFace: a,
                localPoint: a
            } : (o.object.updateWorldMatrix(!0, !1), Object.assign(o, {
                details: {
                    type: "sphere"
                },
                pointOnFace: o.point,
                pointerPosition: this.fromPosition.clone(),
                pointerQuaternion: this.fromQuaternion.clone(),
                localPoint: o.point.clone().applyMatrix4(Vl.copy(o.object.matrixWorld).invert())
            }));
        }
    }
    const gl = new Yn;
    function EE(r, e, a) {
        if (e.updateWorldMatrix(!0, !1), e.spherecast != null) {
            e.spherecast(r, a);
            return;
        }
        if (e instanceof Cy) {
            e.geometry.boundingSphere == null && e.geometry.computeBoundingSphere(), e.geometry.boundingBox == null && e.geometry.computeBoundingBox();
            for(let i = 0; i < e.count; i++){
                if (e.getMatrixAt(i, gl), gl.premultiply(e.matrixWorld), !Cm(r, e, gl)) continue;
                const o = Pm(r, e, gl, i);
                o != null && a.push(o);
            }
        }
        if (!(e instanceof Xn) || !Cm(r, e, e.matrixWorld)) return;
        Vl.copy(e.matrixWorld).invert();
        const s = Pm(r, e, e.matrixWorld);
        s != null && a.push(s);
    }
    const _m = new ke, Em = new Vn, Mm = new fo, io = new Ef;
    function Cm(r, { geometry: e }, a) {
        return e.boundingSphere == null && e.computeBoundingSphere(), io.copy(e.boundingSphere).applyMatrix4(a), io.center.distanceToSquared(r.center) < (r.radius + io.radius) ** 2;
    }
    const vl = new ke, Jc = new ke, Tm = new ke, ME = new ke(1e-4, 1e-4, 1e-4), Vl = new Yn;
    function Pm(r, e, a, s) {
        Vl.copy(a).invert(), io.copy(r).applyMatrix4(Vl);
        const { geometry: i } = e;
        i.boundingBox == null && i.computeBoundingBox(), i.boundingBox.getSize(Jc), i.boundingBox.getCenter(Tm), i.boundingBox.clampPoint(io.center, vl), vl.applyMatrix4(a);
        const o = vl.distanceToSquared(r.center);
        if (o > r.radius * r.radius) return;
        Jc.max(ME);
        const u = io.center.clone().sub(Tm);
        u.divide(Jc), CE(u);
        const d = vl.clone();
        let c;
        return bs(Wl, d, e) && (c = Wl.clone()), {
            distance: Math.sqrt(o),
            face: {
                a: 0,
                b: 0,
                c: 0,
                materialIndex: 0,
                normal: u
            },
            uv: c,
            normal: u,
            point: d,
            instanceId: s,
            object: e
        };
    }
    function CE(r) {
        const e = Math.abs(r.x), a = Math.abs(r.y), s = Math.abs(r.z);
        if (e >= a && e >= s) {
            r.set(r.x < 0 ? -1 : 1, 0, 0);
            return;
        }
        if (a >= e && a >= s) {
            r.set(0, r.y < 0 ? -1 : 1, 0);
            return;
        }
        r.set(0, 0, r.z < 0 ? -1 : 1);
    }
    function TE(r, e, a, s = {}, i = "grab") {
        return new go(ws(), i, a, new mv(e, ()=>s.radius ?? .07, s), r, void 0, void 0, void 0, s);
    }
    function PE(r, e, a, s = {}, i = "ray") {
        return new go(ws(), i, a, new wE(e, s), r, void 0, void 0, void 0, s);
    }
    function kE(r, e, a, s = {}, i = "lines") {
        return new go(ws(), i, a, new yE(e, s), r, void 0, void 0, void 0, s);
    }
    function RE(r, e, a, s = {}, i = "touch") {
        return new go(ws(), i, a, new mv(e, ()=>s.hoverRadius ?? .1, s), r, IE(s), void 0, void 0, s);
    }
    function IE(r) {
        let e = !1;
        return (a)=>{
            if (!a.getEnabled()) return;
            const s = a.getIntersection(), i = AE(s, r.downRadius ?? .03);
            if (i === e) return;
            const o = {
                timeStamp: performance.now(),
                button: r.button ?? 0
            };
            i ? a.down(o) : a.up(o), e = i;
        };
    }
    function AE(r, e) {
        return r == null ? !1 : r.distance <= e;
    }
    let FE = 23412;
    function ws() {
        return FE++;
    }
    function DE(r, e, a) {
        if (!(e instanceof globalThis.MouseEvent)) return a.set(0, 0);
        const { width: s, height: i, top: o, left: u } = r.getBoundingClientRect(), d = e.clientX - u, c = e.clientY - o;
        return a.set(d / s * 2 - 1, -(c / i) * 2 + 1);
    }
    NM = function(r, e, a, s) {
        return gv(r, typeof e == "function" ? e : ()=>e, a, DE.bind(null, r), r.setPointerCapture.bind(r), (i)=>{
            r.hasPointerCapture(i) && r.releasePointerCapture(i);
        }, {
            pointerTypePrefix: "screen-",
            ...s
        });
    };
    function UE(r, e) {
        return !(r instanceof An) || r.uv == null ? e.set(0, 0) : e.copy(r.uv).multiplyScalar(2).addScalar(-1);
    }
    function OE(r, e, a, s) {
        return gv(r, e, a, UE, r.setPointerCapture.bind(r), r.releasePointerCapture.bind(r), s);
    }
    function gv(r, e, a, s, i, o, u = {}) {
        const d = u?.forwardPointerCapture ?? !0, c = new Map, h = u.pointerTypePrefix ?? "forward-", p = (P, I)=>{
            let F = c.get(P.pointerId);
            return F != null || (F = new go(ws(), `${h}${P.pointerType}`, P.pointerState, new xE((Y, L)=>(s(Y, L), e()), u), e, void 0, d ? i.bind(null, P.pointerId) : void 0, d ? o.bind(null, P.pointerId) : void 0, u), I != "move" && I != "wheel" && (F.setIntersection(F.computeIntersection("pointer", a, P)), F.commit(P, !1)), c.set(P.pointerId, F)), F;
        }, v = new Map, y = new Map, b = [], S = [], _ = (P, I, F)=>{
            switch(P){
                case "move":
                    F.move(a, I);
                    return;
                case "over":
                    F.move(a, I);
                    return;
                case "wheel":
                    F.wheel(a, I);
                    return;
                case "cancel":
                    F.cancel(I);
                    return;
                case "down":
                    if (!km(I)) return;
                    F.down(I);
                    return;
                case "up":
                    if (!km(I)) return;
                    F.up(I);
                    return;
                case "exit":
                    y.delete(F), v.delete(F), F.exit(I);
                    return;
            }
        }, x = (P, I)=>{
            const F = p(I, P);
            P === "move" && y.set(F, I), P === "wheel" && v.set(F, I), u.batchEvents ?? !0 ? S.push({
                type: P,
                event: I
            }) : _(P, I, F);
        }, k = x.bind(null, "move"), T = x.bind(null, "over"), A = x.bind(null, "cancel"), U = x.bind(null, "down"), D = x.bind(null, "up"), R = x.bind(null, "wheel"), N = x.bind(null, "exit");
        return r.addEventListener("pointermove", k), r.addEventListener("pointerover", T), r.addEventListener("pointercancel", A), r.addEventListener("pointerdown", U), r.addEventListener("pointerup", D), r.addEventListener("wheel", R), r.addEventListener("pointerleave", N), {
            destroy () {
                r.removeEventListener("pointermove", k), r.removeEventListener("pointerover", T), r.removeEventListener("pointercancel", A), r.removeEventListener("pointerdown", U), r.removeEventListener("pointerup", D), r.removeEventListener("wheel", R), r.removeEventListener("pointerleave", N), y.clear(), v.clear();
            },
            update () {
                const P = S.length;
                for(let I = 0; I < P; I++){
                    const { type: F, event: Y } = S[I], L = p(Y, F);
                    if (F === "move" && (b.push(L), y.get(L) != Y)) {
                        L.emitMove(Y);
                        continue;
                    }
                    if (F === "wheel" && v.get(L) != Y) {
                        L.emitWheel(Y);
                        continue;
                    }
                    _(F, Y, L);
                }
                if (S.length = 0, u.intersectEveryFrame ?? !1) for (const [I, F] of y.entries())b.includes(I) || I.move(a, F);
                b.length = 0;
            }
        };
    }
    function km(r) {
        return r.button != null;
    }
    let vv = class wf {
        enableMultiplePointers;
        pointers = [];
        isDefaults = [];
        enabled = !0;
        activePointer;
        nonCapturedPointers = [];
        constructor(e){
            this.enableMultiplePointers = e;
        }
        register(e, a = !1) {
            return this.pointers.push(e), this.isDefaults.push(a), this.unregister.bind(this, e);
        }
        unregister(e) {
            const a = this.pointers.indexOf(e);
            a !== -1 && (this.isDefaults.splice(a, 1), this.pointers.splice(a, 1));
        }
        startIntersection(e, a) {
            const s = this.pointers.length;
            let i = !1;
            for(let o = 0; o < s; o++){
                const u = this.pointers[o];
                if (u instanceof wf) {
                    u.startIntersection(e, a);
                    continue;
                }
                const d = u.getPointerCapture();
                if (d != null) {
                    i = !0, u.setIntersection(u.intersector.intersectPointerCapture(d, a));
                    continue;
                }
                e.push(u), u.intersector.startIntersection(a);
            }
            return i;
        }
        getIntersection() {
            return this.activePointer?.getIntersection();
        }
        getPointerCapture() {
            return this.activePointer?.getPointerCapture();
        }
        computeActivePointer() {
            let e;
            this.activePointer = void 0;
            const a = this.pointers.length;
            for(let s = 0; s < a; s++){
                const i = this.pointers[s];
                i instanceof wf && i.computeActivePointer();
                const o = i.getIntersection(), u = i.getPointerCapture() != null ? -1 / 0 : o?.object.isVoidObject ? 1 / 0 : o?.distance ?? 1 / 0, d = this.isDefaults[s];
                (e == null || d && u === e || u < e) && (this.activePointer = i, e = u);
            }
        }
        commit(e, a, s = !0) {
            if (this.enableMultiplePointers) {
                const o = this.pointers.length;
                for(let u = 0; u < o; u++)this.pointers[u].commit(e, a);
                return;
            }
            s && this.computeActivePointer();
            const i = this.pointers.length;
            for(let o = 0; o < i; o++){
                const u = this.pointers[o];
                u.setEnabled(u === this.activePointer, e, !1), u.commit(e, a, !1);
            }
        }
        move(e, a) {
            if (!this.enabled) return;
            if (this.nonCapturedPointers.length = 0, !this.startIntersection(this.nonCapturedPointers, a) || this.enableMultiplePointers) {
                Vf("pointer", e, this.nonCapturedPointers);
                const i = this.nonCapturedPointers.length;
                for(let o = 0; o < i; o++){
                    const u = this.nonCapturedPointers[o];
                    u.setIntersection(u.intersector.finalizeIntersection(e));
                }
            }
            this.commit(a, !0);
        }
        setEnabled(e, a) {
            this.enabled = e;
            const s = this.pointers.length;
            for(let i = 0; i < s; i++){
                const o = this.pointers[i];
                o.setEnabled(e && (this.enableMultiplePointers || o == this.activePointer), a);
            }
        }
    };
    function LE() {
        return navigator.userAgent.includes("Macintosh") && navigator.xr != null;
    }
    function yv(r, e, { anchors: a = !0, handTracking: s = !LE(), layers: i = !0, meshDetection: o = !0, planeDetection: u = !0, customSessionInit: d, depthSensing: c = !1, hitTest: h = !0, domOverlay: p = !0, bodyTracking: v = !1, bounded: y } = {}) {
        if (d != null) return d;
        const b = y == null ? [
            "local-floor"
        ] : y ? [
            "bounded-floor"
        ] : [
            "unbounded",
            "local-floor"
        ], S = [];
        p instanceof Element && (p = !0), ii(a, "anchors", b, S), ii(s, "hand-tracking", b, S), ii(i, "layers", b, S), ii(o, "mesh-detection", b, S), ii(u, "plane-detection", b, S), ii(c, "depth-sensing", b, S), ii(p, "dom-overlay", b, S), ii(h, "hit-test", b, S), ii(v, "body-tracking", b, S);
        const _ = {
            requiredFeatures: b,
            optionalFeatures: S
        };
        return e != null && (_.domOverlay = {
            root: e
        }), c && Object.assign(_, {
            depthSensing: {
                usagePreference: [
                    "gpu-optimized"
                ],
                dataFormatPreference: []
            }
        }), _;
    }
    function ii(r, e, a, s) {
        if (r !== !1) {
            if (r === !0) {
                s.push(e);
                return;
            }
            a.push(e);
        }
    }
    function ao(r, e, a) {
        return typeof r == "function" ? r : (typeof r == "object" && (e != null && zE(r, e) ? r = r[e] : "default" in r && (r = r.default)), r === !1 ? !1 : r === !0 ? a : r ?? a);
    }
    function zE(r, e) {
        return e in r;
    }
    const bv = {
        session: void 0,
        mediaBinding: void 0,
        originReferenceSpace: void 0,
        visibilityState: void 0,
        mode: null,
        frameRate: void 0,
        inputSourceStates: [],
        detectedMeshes: [],
        detectedPlanes: [],
        layerEntries: []
    };
    async function Rm(r, e, a) {
        if (typeof navigator > "u") return !1;
        const [s, i] = await Promise.all([
            navigator.xr?.isSessionSupported("immersive-vr").catch((u)=>(console.error(u), !1)),
            navigator.xr?.isSessionSupported("immersive-ar").catch((u)=>(console.error(u), !1))
        ]);
        if (i || s) return !1;
        const { emulate: o } = await Yy(async ()=>{
            const { emulate: u } = await import("./emulate-BDTSyNlg.js").then(async (m)=>{
                await m.__tla;
                return m;
            });
            return {
                emulate: u
            };
        }, __vite__mapDeps([0,1,2,3,4,5]), import.meta.url);
        return a && window.alert("emulator started"), r.setState({
            emulator: o(e === !0 ? "metaQuest3" : e)
        }), !0;
    }
    const ef = new ke, yl = new ke;
    function NE(r) {
        const e = typeof HTMLElement > "u" ? void 0 : r?.domOverlay instanceof HTMLElement ? r.domOverlay : document.createElement("div"), a = Mf(()=>({
                ...bv,
                controller: r?.controller,
                hand: r?.hand,
                gaze: r?.gaze,
                screenInput: r?.screenInput,
                transientPointer: r?.transientPointer,
                domOverlayRoot: e
            })), s = a.subscribe(({ session: b }, { session: S })=>{
            S != null && b == null && v != null && bl(v, r, e).catch(console.error);
        }), i = r?.emulate ?? "metaQuest3";
        let o;
        if (typeof window < "u" && i != !1) {
            const b = (typeof i == "object" ? i.inject : void 0) ?? {
                hostname: "localhost"
            };
            (b === !0 || typeof b != "boolean" && window.location.hostname === b.hostname) && Rm(a, i, !1).then((_)=>{
                !_ || v == null || bl(v, r, e);
            });
            const S = (_)=>{
                _.altKey && _.metaKey && _.code === "KeyE" && Rm(a, i, !0).then((x)=>{
                    !x || v == null || bl(v, r, e);
                });
            };
            window.addEventListener("keydown", S), o = ()=>window.removeEventListener("keydown", S);
        }
        let u;
        if (e != null) {
            if (e.parentNode == null) {
                const b = (_)=>{
                    e.style.display = _.session != null ? "block" : "none";
                }, S = a.subscribe(b);
                b(a.getState()), document.body.appendChild(e), u = ()=>{
                    e.remove(), S();
                };
            }
            document.body.append(e);
        }
        const d = V_((b)=>a.setState({
                inputSourceStates: [
                    ...a.getState().inputSourceStates,
                    b
                ]
            }), r), c = GE(a, d, r?.secondaryInputSources ?? !1), h = BE(r?.enterGrantedSession, (b)=>wl(e, b, r, v)), p = [];
        let v;
        const y = ()=>{
            a.setState(c(v.getSession()));
        };
        return Object.assign(a, {
            addLayerEntry (b) {
                a.getState().session != null && a.setState({
                    layerEntries: [
                        ...a.getState().layerEntries,
                        b
                    ]
                });
            },
            removeLayerEntry (b) {
                a.getState().session != null && a.setState({
                    layerEntries: a.getState().layerEntries.filter((S)=>S != b)
                });
            },
            requestFrame () {
                return new Promise((b)=>p.push(b));
            },
            setWebXRManager (b) {
                if (v === b) return;
                v?.removeEventListener("sessionstart", y), v = b, v.addEventListener("sessionstart", y);
                const { foveation: S, bounded: _ } = r ?? {};
                v.setReferenceSpaceType(_ ? "bounded-floor" : "local-floor"), S != null && v.setFoveation(S), bl(v, r, e).catch(console.error);
            },
            setFrameRate (b) {
                const { session: S } = a.getState();
                S != null && wv(S, b);
            },
            setHand (b, S) {
                if (S == null) {
                    a.setState({
                        hand: b
                    });
                    return;
                }
                const _ = a.getState().hand, x = {};
                typeof _ == "object" && Object.assign(x, _), Object.assign(x, {
                    default: ao(_, void 0, {}),
                    [S]: b
                }), a.setState({
                    hand: x
                });
            },
            setController (b, S) {
                if (S == null) {
                    a.setState({
                        controller: b
                    });
                    return;
                }
                const _ = a.getState().controller, x = {};
                typeof _ == "object" && Object.assign(x, _), Object.assign(x, {
                    default: ao(_, void 0, {}),
                    [S]: b
                }), a.setState({
                    controller: x
                });
            },
            setTransientPointer (b, S) {
                if (S == null) {
                    a.setState({
                        transientPointer: b
                    });
                    return;
                }
                const _ = a.getState().transientPointer, x = {};
                typeof _ == "object" && Object.assign(x, _), Object.assign(x, {
                    default: ao(_, void 0, {}),
                    [S]: b
                }), a.setState({
                    transientPointer: x
                });
            },
            setGaze (b) {
                a.setState({
                    gaze: b
                });
            },
            setScreenInput (b) {
                a.setState({
                    screenInput: b
                });
            },
            destroy () {
                v?.removeEventListener("sessionstart", y), o?.(), u?.(), h?.(), s(), c(void 0);
            },
            enterXR: (b)=>wl(e, b, r, v),
            enterAR: ()=>wl(e, "immersive-ar", r, v),
            enterVR: ()=>wl(e, "immersive-vr", r, v),
            onBeforeFrame (b, S, _) {
                let x;
                const k = v?.getReferenceSpace() ?? void 0, T = a.getState(), A = S.parent ?? b;
                if (T.origin != A && (x ??= {}, x.origin = A), k != T.originReferenceSpace && (x ??= {}, x.originReferenceSpace = k), A.xrSpace = k, T.origin != A && T.origin != null && (T.origin.xrSpace = void 0), _ != null && (v != null && HE(a, _, v), T.body != _.body && (x ??= {}, x.body = _.body)), x != null && a.setState(x), _ != null) {
                    const U = p.length;
                    for(let D = 0; D < U; D++)p[D](_);
                    p.length = 0;
                }
            },
            onBeforeRender () {
                const { session: b, layerEntries: S } = a.getState();
                if (b == null || v == null) return;
                const _ = v.getCamera();
                _.aspect = _.projectionMatrix.elements[5] / _.projectionMatrix.elements[0];
                const x = b?.renderState.layers;
                if (x == null) return;
                _.getWorldPosition(ef), S.sort((A, U)=>{
                    const D = A.renderOrder - U.renderOrder;
                    if (D !== 0) return D;
                    A.object3D.getWorldPosition(yl);
                    const R = yl.distanceToSquared(ef);
                    return U.object3D.getWorldPosition(yl), yl.distanceToSquared(ef) - R;
                });
                let k = !1;
                const T = S.map(({ layer: A }, U)=>(A != x[U] && (k = !0), A));
                k && (T.push(v.getBaseLayer()), b.updateRenderState({
                    layers: T
                }));
            }
        });
    }
    async function bl(r, e, a) {
        const s = e?.offerSession ?? !0;
        if (navigator.xr?.offerSession == null || s === !1) return;
        let i;
        s === !0 ? i = await navigator.xr.isSessionSupported("immersive-ar") ?? !1 ? "immersive-ar" : "immersive-vr" : i = s;
        const o = await navigator.xr.offerSession(i, yv(i, a, e));
        Sv(o, r, e);
    }
    async function wv(r, e) {
        if (e === !1) return;
        const { supportedFrameRates: a } = r;
        if (a == null || a.length === 0) return;
        if (typeof e == "function") {
            const i = e(a);
            if (i === !1) return;
            await r.updateTargetFrameRate(i);
            return;
        }
        const s = e === "high" ? 1 : e === "mid" ? .5 : 0;
        await r.updateTargetFrameRate(a[Math.ceil((a.length - 1) * s)]);
    }
    async function wl(r, e, a, s) {
        if (typeof navigator > "u" || navigator.xr == null) return Promise.reject(new Error("WebXR not supported"));
        if (s == null) return Promise.reject(new Error("not connected to three.js. You either might be missing the <XR> component or the canvas is not yet loaded?"));
        const i = await navigator.xr.requestSession(e, yv(e, r, a));
        return await Sv(i, s, a), i;
    }
    async function Sv(r, e, a) {
        await Promise.all([
            wv(r, a?.frameRate ?? "high"),
            jE(e, r, a)
        ]);
    }
    async function jE(r, e, a) {
        if (r == null) return;
        const s = XRWebGLLayer.getNativeFramebufferScaleFactor(e);
        let i = a?.frameBufferScaling;
        typeof i == "function" && (i = i(s)), typeof i == "string" && (i = i === "high" ? s : i === "mid" ? 1 : .5), i != null && r?.setFramebufferScaleFactor(i), await r?.setSession(e);
    }
    const Im = [
        "immersive-ar",
        "immersive-vr",
        "inline"
    ];
    function BE(r = Im, e) {
        if (typeof navigator > "u" || r === !1) return;
        r === !0 && (r = Im);
        const a = async ()=>{
            for (const s of r)await navigator.xr?.isSessionSupported(s) && e(s);
        };
        return navigator.xr?.addEventListener("sessiongranted", a), ()=>navigator.xr?.removeEventListener("sessiongranted", a);
    }
    function GE(r, e, a) {
        let s;
        return (i)=>{
            if (s?.(), i == null) return {};
            const o = [];
            let u;
            const d = ()=>{
                u = void 0, r.setState({
                    inputSourceStates: e(i, r.getState().inputSourceStates, o)
                }), o.length = 0;
            }, c = (_, x)=>{
                o.push({
                    isPrimary: _,
                    added: x.added,
                    removed: x.removed
                }), u == null && (a ? u = setTimeout(d, 100) : d());
            }, h = c.bind(null, !0);
            i.addEventListener("inputsourceschange", h);
            let p;
            if (a) {
                const _ = c.bind(null, !1);
                i.addEventListener("trackedsourceschange", _), p = ()=>i.removeEventListener("trackedsourceschange", _);
            }
            const v = ()=>r.setState({
                    frameRate: i.frameRate,
                    visibilityState: i.visibilityState
                });
            i.addEventListener("frameratechange", v), i.addEventListener("visibilitychange", v);
            const y = ()=>{
                s?.(), s = void 0, r.setState({
                    emulator: r.getState().emulator,
                    ...bv
                });
            };
            i.addEventListener("end", y);
            const b = [
                {
                    isPrimary: !0,
                    added: i.inputSources
                }
            ];
            a && b.push({
                isPrimary: !1,
                added: i.trackedSources
            });
            const S = e(i, [], b);
            return s = ()=>{
                p?.(), clearTimeout(u), e(i, r.getState().inputSourceStates, "remove-all"), i.removeEventListener("end", y), i.removeEventListener("frameratechange", v), i.removeEventListener("visibilitychange", v), i.removeEventListener("inputsourceschange", h);
            }, {
                inputSourceStates: S,
                frameRate: i.frameRate,
                visibilityState: i.visibilityState,
                detectedMeshes: [],
                detectedPlanes: [],
                mode: i.environmentBlendMode === "opaque" ? "immersive-vr" : "immersive-ar",
                session: i,
                mediaBinding: typeof XRMediaBinding > "u" ? void 0 : new XRMediaBinding(i)
            };
        };
    }
    function HE(r, e, a) {
        const s = a.getReferenceSpace(), { detectedMeshes: i, detectedPlanes: o, session: u, inputSourceStates: d } = r.getState();
        if (s == null || u == null) return;
        const c = Am(o, e.detectedPlanes), h = Am(i, e.detectedMeshes);
        (o != c || i != h) && r.setState({
            detectedPlanes: c,
            detectedMeshes: h
        });
        const p = d.length;
        for(let v = 0; v < p; v++){
            const y = d[v];
            switch(y.type){
                case "controller":
                    x3(y);
                    break;
                case "hand":
                    N_(y, e, a);
                    break;
            }
        }
    }
    const WE = [];
    function Am(r, e) {
        return e == null ? WE : r != null && VE(e, r) ? r : Array.from(e);
    }
    function VE(r, e) {
        if (r.size != e.length) return !1;
        for (const a of e)if (!r.has(a)) return !1;
        return !0;
    }
    new Ty;
    new Li;
    async function XE(r, e = y3) {
        const { scene: a } = await e.loadAsync(r.assetPath);
        return a.clone(!0);
    }
    function YE(r, e) {
        r.renderOrder = e?.renderOrder ?? 0, r.traverse((a)=>{
            a instanceof Xn && a.material instanceof eg && (a.material.colorWrite = e?.colorWrite ?? !0);
        });
    }
    function qE(r, e, a) {
        const s = [];
        for(const i in e.components){
            const o = e.components[i];
            let u = a[i];
            u == null && (a[i] = u = {
                state: "default"
            }), s.push(...Object.values(o.visualResponses).map((d)=>ZE(r, u, d)));
        }
        return ()=>{
            const i = s.length;
            for(let o = 0; o < i; o++)s[o]();
        };
    }
    function ZE(r, e, a) {
        const s = r.getObjectByName(a.valueNodeName);
        if (e.object = s, s == null) return ()=>{};
        if (a.valueNodeProperty === "visibility") return ()=>s.visible = a.states.includes(e.state);
        const i = r.getObjectByName(a.minNodeName), o = r.getObjectByName(a.maxNodeName);
        return i == null || o == null ? ()=>{} : ()=>{
            const u = QE(e, a);
            s.quaternion.slerpQuaternions(i.quaternion, o.quaternion, u), s.position.lerpVectors(i.position, o.position, u), s.updateMatrix();
        };
    }
    function QE(r, { componentProperty: e, states: a }) {
        const s = a.includes(r.state);
        switch(e){
            case "xAxis":
                return s ? Fm(r).x : .5;
            case "yAxis":
                return s ? Fm(r).y : .5;
            case "button":
                return s ? r.button ?? 0 : 0;
            case "state":
                return s ? 1 : 0;
        }
    }
    const $o = new Ft;
    function Fm({ xAxis: r = 0, yAxis: e = 0 }) {
        if ($o.lengthSq() > 1) {
            const s = Math.atan2(e, r);
            $o.set(Math.cos(s), Math.sin(s));
        } else $o.set(r, e);
        return $o.multiplyScalar(.5).addScalar(.5), $o;
    }
    function Dm(r, e) {
        if (e != null && e.createdAt != null && e.createdAt >= r.lastChangedTime) return e;
        const a = new Zl;
        return a.setIndex(new wr(r.indices, 1)), a.setAttribute("position", new wr(r.vertices, 3)), Object.assign(a, {
            creationTime: r.lastChangedTime
        });
    }
    function Um(r, e) {
        return e != null && e.createdAt != null && e.createdAt >= r.lastChangedTime ? e : Object.assign(KE(r.polygon), {
            createdAt: r.lastChangedTime
        });
    }
    const Jo = new Py, Sl = new Ft;
    function KE(r) {
        if (r.length === 0) return new Zl;
        const e = new Jm, a = r.map(({ x: i, z: o })=>new Ft(i, o));
        Jo.setFromPoints(a), Jo.getSize(Sl);
        for (const i of a)i.sub(Jo.min), i.divide(Sl);
        e.setFromPoints(a);
        const s = new ky(e);
        return s.scale(Sl.x, Sl.y, 1), s.translate(Jo.min.x, Jo.min.y, 0), s.rotateX(Math.PI / 2), s;
    }
    function Xl(r, e = 1) {
        if (r != null) return {
            x: sa(r.x),
            y: sa(r.y),
            z: sa(r.z),
            w: "w" in r ? sa(r.w, e) : e
        };
    }
    function sa(r, e = 0) {
        return isNaN(r) ? e : r;
    }
    const qf = 60 / 180 * Math.PI, xv = 60 / 180 * Math.PI, _v = -30 / 180 * Math.PI, Ev = 30 / 180 * Math.PI;
    function $E(r, e, a, s, i, o, u) {
        return r instanceof HTMLVideoElement ? JE(r, e, a, i, o, u) : e3(r, e.origin, a, s, i, o, u);
    }
    function JE(r, e, a, s, { invertStereo: i, layout: o, shape: u = "quad" }, d = {}) {
        const c = ru(s, e.origin, a, uo), h = Zf(uo, da), p = {
            invertStereo: i,
            layout: o,
            space: c,
            transform: h
        };
        Kf(u, p, d.centralAngle, da);
        const v = `create${Mv(u)}Layer`, y = e.mediaBinding?.[v](r, p);
        if (y != null) return Qf(y, d), y;
    }
    function e3(r, e, a, s, i, { shape: o = "quad", ...u }, d = {}) {
        const c = ru(i, e, a, uo), h = Zf(uo, da), p = {
            ...u,
            isStatic: !(r instanceof Gr),
            textureType: "texture",
            viewPixelWidth: u.layout === "stereo-left-right" ? r.width / 2 : r.width,
            viewPixelHeight: u.layout === "stereo-top-bottom" ? r.height / 2 : r.height,
            space: c,
            transform: h
        };
        Kf(o, p, d.centralAngle, da);
        const v = `create${Mv(o)}Layer`, y = s.getBinding()?.[v](p);
        if (y != null) return Qf(y, d), y;
    }
    const uo = new Yn, Om = new ke, Lm = new Vn, da = new ke;
    function Zf(r, e = da) {
        return r.decompose(Om, Lm, e), e.x = sa(e.x), e.y = sa(e.y), e.z = sa(e.z), new XRRigidTransform(Xl(Om), Xl(Lm));
    }
    const t3 = 64 / Math.PI;
    function tf(r) {
        return Math.ceil(r * t3);
    }
    function n3(r, e, a, s) {
        if (a != null && s != null) {
            const i = r.xr.getBinding().getSubImage(a.layer, s);
            r.setRenderTargetTextures(e, i.colorTexture);
        }
        r.setRenderTarget(e);
    }
    function r3(r, e) {
        switch(r){
            case "cylinder":
                const a = e.centralAngle ?? qf;
                return new Ry(1, 1, 1, tf(a), 1, !0, Math.PI - a / 2, a).scale(-1, 1, 1);
            case "equirect":
                {
                    const s = e.centralHorizontalAngle ?? xv, i = e.upperVerticalAngle ?? Ev, o = e.lowerVerticalAngle ?? _v, u = i - o;
                    return new tg(1, tf(s), tf(u), -Math.PI / 2 - s / 2, s, Math.PI / 2 - i, u).scale(-1, 1, 1);
                }
            case "quad":
                return new Li;
        }
    }
    function Mv(r) {
        return `${r[0].toUpperCase()}${r.slice(1)}`;
    }
    function Qf(r, e = {}) {
        if (r.chromaticAberrationCorrection = e.chromaticAberrationCorrection, r.quality = e.quality ?? "default", r.blendTextureSourceAlpha = e.blendTextureSourceAlpha ?? !1, r instanceof XRCylinderLayer) {
            r.centralAngle = e?.centralAngle ?? qf;
            return;
        }
        r instanceof XREquirectLayer && (r.centralHorizontalAngle = e?.centralHorizontalAngle ?? xv, r.lowerVerticalAngle = e?.lowerVerticalAngle ?? _v, r.upperVerticalAngle = e?.upperVerticalAngle ?? Ev);
    }
    function i3(r, e, a, s) {
        let i = !1;
        const o = async ()=>{
            const u = await e.requestFrame();
            i || s3(r, a, u, s);
        };
        return a.addEventListener("redraw", o), o(), ()=>{
            i = !0, a.removeEventListener("redraw", o);
        };
    }
    async function a3(r) {
        if (r instanceof HTMLImageElement && !r.complete && await new Promise((e)=>{
            const a = ()=>{
                e(), r.removeEventListener("load", a);
            };
            r.addEventListener("load", a);
        }), r instanceof HTMLVideoElement && r.readyState < 1) return new Promise((e)=>{
            const a = ()=>{
                e(), r.removeEventListener("loadedmetadata", a);
            };
            r.addEventListener("loadedmetadata", a);
        });
    }
    function o3(r) {
        if (r instanceof Gr) return r.texture;
        const e = r instanceof HTMLVideoElement ? new Iy(r) : new Ii(r);
        return e.colorSpace = Yl, e.needsUpdate = !0, e;
    }
    function s3(r, e, a, s) {
        const i = r.getContext(), o = r.xr.getBinding().getSubImage(e, a);
        r.state.bindTexture(i.TEXTURE_2D, o.colorTexture), i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, !0), i.texSubImage2D(i.TEXTURE_2D, 0, 0, 0, s.width, s.height, i.RGBA, i.UNSIGNED_BYTE, s);
    }
    function l3(r, e, a, s) {
        r.originReferenceSpace != null && (e.space = ru(s, r.origin, r.originReferenceSpace, uo), e.transform = Zf(uo, da), Kf(u3(e), e, a, da));
    }
    function Kf(r, e, a, s) {
        if (r === "cylinder") {
            const o = (s.x + s.z) / 2, u = o * (a ?? qf);
            e.radius = o, e.aspectRatio = s.y === 0 ? 1 : u / s.y;
        } else r === "quad" ? (e.width = s.x / 2, e.height = s.y / 2) : e.radius = (s.x + s.y + s.z) / 3;
    }
    function u3(r) {
        return r instanceof XRCylinderLayer ? "cylinder" : r instanceof XREquirectLayer ? "equirect" : "quad";
    }
    function Cv(r, e, a) {
        return new Gr(r * a, e * a, {
            minFilter: Hn,
            magFilter: Hn,
            type: Qn,
            depthTexture: new $m(r, e)
        });
    }
    const es = new rg(0, 0, 0, "YXZ"), xl = new Vn;
    function c3(r, e, a) {
        r.updateWorldMatrix(!0, !1), r.matrixWorld.decompose(e.position, xl, e.scale), es.setFromQuaternion(xl), es.z = 0, es.x = Ml(es.x - 10 * Math.PI / 180, -Math.PI / 2, 1.1 * Math.PI / 4), xl.setFromEuler(es), e.quaternion.slerp(xl, a / 100);
    }
    function f3(r) {
        return r.userData.teleportTarget === !0;
    }
    function d3(r = {}) {
        return (e, a, s, i)=>!(!f3(e) || r.filter != null && !r.filter(e, a, s, i));
    }
    function h3() {
        return new Ay(new ke(0, 0, 0), new ke(0, 0, -8), new ke(0, -20, -15)).getPoints(20);
    }
    let p3 = class extends Xn {
        multiplier;
        lineLengths;
        options = {};
        constructor(e){
            const a = new Vx, s = new Float32Array(e.length * 3);
            for(let u = 0; u < e.length; u++)e[u].toArray(s, u * 3);
            a.setPoints(s);
            const i = (e.length * 3 - 3) / (e.length * 3 - 1), o = new Qx({
                lineWidth: .1,
                resolution: void 0,
                visibility: i
            });
            super(a, o), this.material.transparent = !0, this.multiplier = i, this.material = o, this.lineLengths = e.slice(0, -1).map((u, d)=>u.distanceTo(e[d + 1]));
        }
        update(e) {
            const a = e.getEnabled(), s = e.getIntersection();
            if (!a || e.getButtonsDown().size === 0 || s == null) {
                this.visible = !1;
                return;
            }
            if (this.visible = !0, s.details.type != "lines") {
                this.material.visibility = this.multiplier;
                return;
            }
            const { distanceOnLine: i, lineIndex: o } = s.details, u = this.lineLengths[o];
            this.material.visibility = this.multiplier * (o + i / u) / this.lineLengths.length;
            const { color: d = "white", opacity: c = .4, size: h = .01 } = this.options;
            this.material.lineWidth = h, this.material.opacity = typeof c == "function" ? c(e) : c;
            const p = typeof d == "function" ? d(e) : d;
            Array.isArray(p) ? this.material.color.set(...p) : this.material.color.set(p);
        }
    };
    const zm = new Yn, _l = new ke, m3 = new ke, Nm = new Vn;
    async function g3(r, e, a, s = [
        "point",
        "plane",
        "mesh"
    ]) {
        typeof a == "string" && (a = await e.requestReferenceSpace(a));
        const i = Array.isArray(s) ? s : [
            s
        ];
        let o, u, d;
        const c = r.getState();
        if (a instanceof XRSpace) o = {
            space: a,
            entityTypes: i
        }, d = c.origin;
        else {
            const p = ru(a, c.origin, c.originReferenceSpace, zm);
            if (p == null) return;
            zm.decompose(_l, Nm, m3);
            const v = Xl(_l);
            _l.set(0, 0, -1).applyQuaternion(Nm);
            const y = new XRRay(v, Xl(_l, 0));
            d = a, o = {
                space: p,
                offsetRay: y,
                entityTypes: i
            }, u = p;
        }
        const h = await e?.requestHitTestSource?.(o);
        if (h != null) return {
            source: h,
            getWorldMatrix: v3.bind(null, r, u, d)
        };
    }
    function v3(r, e, a, s, i) {
        if (e ??= r.getState().originReferenceSpace, e == null) return !1;
        const o = i.getPose(e);
        return o == null ? !1 : (s.fromArray(o.transform.matrix), a != null && (a.updateWorldMatrix(!0, !1), s.premultiply(a.matrixWorld)), !0);
    }
    new Yn;
    new Yn;
    new rg;
    const y3 = new ig, Tv = "https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles/";
    function Sf(r, ...e) {
        let a = r();
        for (const s of e)a instanceof Promise ? a = a.then(s) : a = s(a);
        return a;
    }
    const b3 = "generic-trigger";
    class w3 {
        baseAssetPath;
        defaultProfileId;
        profilesListCache;
        profileCacheMap = new Map;
        constructor(e){
            this.baseAssetPath = e?.baseAssetPath ?? Tv, this.defaultProfileId = e?.defaultControllerProfileId ?? b3;
        }
        load(e, a) {
            return Sf(()=>this.loadProfile(e), (s)=>{
                for(const i in s.layouts)if (i.includes(a)) return s.layouts[i];
                throw new Error(`No matching layout for "${a}", in profile ${s.profileId} with layouts ${Object.keys(s.layouts).join(", ")}.`);
            });
        }
        loadAsync = this.load;
        loadProfile(e) {
            return Sf(()=>this.profilesListCache ?? jm(new URL("profilesList.json", this.baseAssetPath).href).then((a)=>this.profilesListCache = a), (a)=>{
                const s = e.length;
                let i;
                for(let o = 0; o < s && (i = a[e[o]], i == null); o++);
                if (i ??= a[this.defaultProfileId], i == null) throw new Error(`no matching profile found for profiles "${e.join(", ")}" in profile list ${JSON.stringify(a)}`);
                return this.loadProfileFromPath(i.path);
            });
        }
        loadProfileFromPath(e) {
            const a = this.profileCacheMap.get(e);
            if (a != null) return a;
            const s = new URL(e, this.baseAssetPath).href;
            return jm(s).then((i)=>{
                for(const o in i.layouts){
                    const u = i.layouts[o];
                    u != null && (u.assetPath = new URL(u.assetPath, s).href);
                }
                return this.profileCacheMap.set(e, i), i;
            });
        }
    }
    async function jm(r) {
        let e = await fetch(r);
        return e.ok ? e.json() : Promise.reject(new Error(e.statusText));
    }
    function S3(r, e, a, s, i) {
        return Sf(()=>a.load(e.profiles, e.handedness), (o)=>{
            const u = {};
            return sv(u, e, o), {
                id: r,
                isPrimary: i,
                events: s,
                type: "controller",
                inputSource: e,
                gamepad: u,
                layout: o
            };
        });
    }
    function x3({ gamepad: r, inputSource: e, layout: a }) {
        sv(r, e, a);
    }
    const Pv = M.createContext(void 0), zi = M.createContext(void 0), Ss = M.createContext(void 0), $f = M.createContext(void 0);
    M.forwardRef(({ id: r, children: e, onPress: a, onRelease: s }, i)=>{
        const o = Ui("controller"), [u, d] = M.useState(void 0);
        if (M.useImperativeHandle(i, ()=>u, [
            u
        ]), _3(o, r, (c)=>c === "pressed" ? a?.() : s?.()), Wt(()=>d(o.gamepad[r]?.object)), u != null) return ps(e, u);
    });
    function _3(r, e, a) {
        const s = M.useRef(void 0);
        Wt(()=>{
            const i = r?.gamepad[e]?.state;
            i != null && i != s.current && a(i), s.current = i;
        });
    }
    const E3 = Symbol("loadXRControllerModel"), M3 = M.forwardRef((r, e)=>{
        const a = Ui("controller"), s = Cf(XE, [
            a.layout,
            void 0,
            E3
        ]);
        YE(s, r), a.object = s, M.useImperativeHandle(e, ()=>s, [
            s
        ]);
        const i = M.useMemo(()=>qE(s, a.layout, a.gamepad), [
            s,
            a.layout,
            a.gamepad
        ]);
        return Wt(i), ne.jsx(Dr, {
            space: "grip-space",
            children: ne.jsx("primitive", {
                object: s
            })
        });
    }), C3 = M.forwardRef((r, e)=>{
        const a = Ui("hand"), s = ca(ig, a.assetPath), i = M.useMemo(()=>O_(s), [
            s
        ]);
        L_(i, r), a.object = i, M.useImperativeHandle(e, ()=>i, [
            i
        ]);
        const o = Fv(), u = M.useMemo(()=>B_(a.inputSource.hand, i, o), [
            a.inputSource,
            i,
            o
        ]);
        return Wt((d, c, h)=>u(h)), ne.jsx("primitive", {
            object: i
        });
    });
    M.forwardRef(({ joint: r, children: e }, a)=>ne.jsx(Dr, {
            ref: a,
            space: r,
            children: e
        }));
    function kv({ children: r }) {
        const e = M.useMemo(()=>new vv(!1), []);
        return xs(e), ne.jsx($f.Provider, {
            value: e,
            children: r
        });
    }
    function su(r) {
        for (const e of Object.keys(r))delete r[e];
    }
    function T3(r, e, a, s) {
        const i = M.useMemo(()=>({}), []);
        su(i), Object.assign(i, a);
        const o = Hr(), u = M.useMemo(()=>TE(()=>o.getState().camera, r, e, i, s), [
            o,
            r,
            e,
            i,
            s
        ]);
        return xs(u, a?.makeDefault), u;
    }
    function P3(r, e, a, s) {
        const i = M.useMemo(()=>({}), []);
        su(i), Object.assign(i, a);
        const o = Hr(), u = M.useMemo(()=>PE(()=>o.getState().camera, r, e, i, s), [
            o,
            r,
            e,
            i,
            s
        ]);
        return xs(u, a?.makeDefault), u;
    }
    function k3(r, e, a, s) {
        const i = M.useMemo(()=>({}), []);
        su(i), Object.assign(i, a);
        const o = Hr(), u = M.useMemo(()=>kE(()=>o.getState().camera, r, e, i, s), [
            o,
            r,
            e,
            i,
            s
        ]);
        return xs(u, a?.makeDefault), u;
    }
    function R3(r, e, a, s) {
        const i = M.useMemo(()=>({}), []);
        su(i), Object.assign(i, a);
        const o = Hr(), u = M.useMemo(()=>RE(()=>o.getState().camera, r, e, i, s), [
            o,
            r,
            e,
            i,
            s
        ]);
        return xs(u, a?.makeDefault), u;
    }
    const I3 = M.forwardRef((r, e)=>{
        const a = M.useMemo(()=>{
            const i = r.materialClass ?? Q_;
            return new i;
        }, [
            r.materialClass
        ]), s = M.useRef(null);
        return M.useImperativeHandle(e, ()=>s.current, []), Wt(()=>s.current != null && K_(s.current, a, r.pointer, r)), ne.jsx("mesh", {
            matrixAutoUpdate: !1,
            renderOrder: r.renderOrder ?? 2,
            ref: s,
            material: a,
            children: ne.jsx("boxGeometry", {})
        });
    }), lu = M.forwardRef((r, e)=>{
        const a = M.useMemo(()=>{
            const u = r.materialClass ?? Y_;
            return new u;
        }, [
            r.materialClass
        ]), s = M.useRef(null), i = M.useRef(null);
        M.useImperativeHandle(e, ()=>s.current, []), Wt(()=>s.current != null && i.current != null && Z_(i.current, s.current, a, r.pointer, r));
        const o = Et((u)=>u.scene);
        return ne.jsxs(ne.Fragment, {
            children: [
                ne.jsx("group", {
                    ref: i
                }),
                ps(ne.jsx("mesh", {
                    renderOrder: r.renderOrder ?? 1,
                    ref: s,
                    matrixAutoUpdate: !1,
                    material: a,
                    children: ne.jsx("planeGeometry", {})
                }), o)
            ]
        });
    });
    function Jf(r, e, a, s) {
        const i = cn((o)=>o.session);
        M.useEffect(()=>{
            if (i != null) return $_(r, i, e, a, s);
        }, [
            a,
            e,
            r,
            i,
            s
        ]);
    }
    function xs(r, e = !1) {
        const a = M.useContext($f);
        if (a == null) throw new Error("xr pointers can only be used inside the XR component");
        M.useEffect(()=>{
            const s = a.register(r, e);
            return ()=>{
                s();
            };
        }, [
            a,
            r,
            e
        ]), M.useEffect(()=>{
            if (r instanceof go) return ()=>r.exit({
                    timeStamp: performance.now()
                });
        }, [
            r
        ]);
    }
    const A3 = M.forwardRef(({ pointer: r, linePoints: e, ...a }, s)=>{
        const i = M.useMemo(()=>new p3(e), [
            e
        ]);
        return M.useImperativeHandle(s, ()=>i, [
            i
        ]), i.options = a, Wt(()=>i.update(r)), ne.jsx("primitive", {
            object: i
        });
    });
    function Rv(r, e, a) {
        const s = M.useContext(zi);
        if (s == null) throw new Error("DefaultXRInputSourceGrabPointer can only be used inside a XRInputSource");
        const i = M.useRef(null), o = T3(i, s, a);
        Jf(o, s.inputSource, r, s.events);
        const u = a.cursorModel;
        return ne.jsx(Dr, {
            ref: i,
            space: e,
            children: u !== !1 && ne.jsx(lu, {
                pointer: o,
                opacity: J_,
                ...Fn(u)
            })
        });
    }
    const F3 = Rv.bind(null, "select", "index-finger-tip"), D3 = Rv.bind(null, "squeeze", "grip-space");
    function _s(r) {
        const e = Ui(), a = M.useRef(null), s = P3(a, e, r);
        Jf(s, e.inputSource, "select", e.events);
        const i = r.rayModel, o = r.cursorModel;
        return ne.jsxs(Dr, {
            ref: a,
            space: "target-ray-space",
            children: [
                i !== !1 && ne.jsx(I3, {
                    pointer: s,
                    opacity: jl,
                    ...Fn(i)
                }),
                o !== !1 && ne.jsx(lu, {
                    pointer: s,
                    opacity: jl,
                    ...Fn(o)
                })
            ]
        });
    }
    function U3(r) {
        const e = Ui("hand"), a = M.useRef(null), s = R3(a, e, r), i = r.cursorModel;
        return ne.jsx(Dr, {
            ref: a,
            space: e.inputSource.hand.get("index-finger-tip"),
            children: i !== !1 && ne.jsx(lu, {
                pointer: s,
                opacity: eE,
                ...Fn(i)
            })
        });
    }
    function O3(r) {
        const e = r.model, a = r.grabPointer, s = r.rayPointer, i = r.teleportPointer ?? !1;
        return ne.jsxs(ne.Fragment, {
            children: [
                e !== !1 && ne.jsx(M.Suspense, {
                    children: ne.jsx(M3, {
                        ...Fn(e)
                    })
                }),
                ne.jsxs(kv, {
                    children: [
                        a !== !1 && ne.jsx(D3, {
                            ...Fn(a)
                        }),
                        s !== !1 && ne.jsx(_s, {
                            makeDefault: !0,
                            minDistance: .2,
                            ...Fn(s)
                        }),
                        i !== !1 && ne.jsx(Iv, {
                            ...Fn(i)
                        })
                    ]
                })
            ]
        });
    }
    function L3(r) {
        const e = r.model, a = r.grabPointer, s = r.rayPointer, i = r.touchPointer, o = r.teleportPointer ?? !1, u = s === !1 ? !1 : Fn(s)?.rayModel;
        return ne.jsxs(ne.Fragment, {
            children: [
                e !== !1 && ne.jsx(M.Suspense, {
                    children: ne.jsx(C3, {
                        ...Fn(e)
                    })
                }),
                ne.jsxs(kv, {
                    children: [
                        a !== !1 && ne.jsx(F3, {
                            ...Fn(a)
                        }),
                        i !== !1 && ne.jsx(U3, {
                            ...Fn(i)
                        }),
                        s !== !1 && ne.jsx(_s, {
                            makeDefault: !0,
                            minDistance: .2,
                            ...Fn(s),
                            rayModel: u === !1 ? !1 : {
                                maxLength: .2,
                                ...Fn(u)
                            }
                        }),
                        o !== !1 && ne.jsx(Iv, {
                            ...Fn(o)
                        })
                    ]
                })
            ]
        });
    }
    function z3(r) {
        return ne.jsx(_s, {
            ...r,
            rayModel: !1
        });
    }
    function N3(r) {
        return ne.jsx(_s, {
            ...r,
            rayModel: !1
        });
    }
    function j3(r) {
        return ne.jsx(_s, {
            ...r,
            cursorModel: !1,
            rayModel: !1
        });
    }
    function Iv(r) {
        const e = M.useContext(zi);
        if (e == null) throw new Error("DefaultXRInputSourceRayPointer can only be used inside a XRInputSource");
        const a = M.useRef(null), s = M.useRef(null), i = M.useMemo(()=>h3(), []), o = k3(s, e, {
            ...r,
            linePoints: i,
            filter: d3(r)
        }, "teleport");
        Jf(o, e.inputSource, "select", e.events);
        const u = r.rayModel, d = r.cursorModel, c = Et((p)=>p.scene), h = M.useRef(null);
        return Wt((p, v)=>{
            h.current != null && (h.current.visible = o.getEnabled() && o.getButtonsDown().size > 0);
            const y = s.current, b = a.current;
            y == null || b == null || c3(b, y, v * 1e3);
        }), ne.jsxs(ne.Fragment, {
            children: [
                ne.jsx(Dr, {
                    ref: a,
                    space: "target-ray-space"
                }),
                ps(ne.jsxs("group", {
                    ref: s,
                    children: [
                        u !== !1 && ne.jsx(A3, {
                            linePoints: i,
                            pointer: o,
                            opacity: jl,
                            ...Fn(u)
                        }),
                        d !== !1 && ne.jsx(lu, {
                            ref: h,
                            pointer: o,
                            opacity: jl,
                            ...Fn(d)
                        })
                    ]
                }), c)
            ]
        });
    }
    function Fn(r) {
        if (r !== !0) return r;
    }
    function B3() {
        return cn((r)=>r.visibilityState);
    }
    function G3(r, e) {
        const a = M.useRef(e);
        a.current = e;
        const [s, i] = M.useMemo(()=>{
            let o;
            return [
                (u)=>{
                    let d = !1;
                    return typeof navigator > "u" || navigator.xr == null ? (o = !1, ()=>{}) : (navigator.xr.isSessionSupported(r).then((c)=>{
                        o = c, !d && u();
                    }).catch((c)=>{
                        d || a.current?.(c);
                    }), ()=>d = !0);
                },
                ()=>o
            ];
        }, [
            r
        ]);
        return M.useSyncExternalStore(s, i);
    }
    function H3(r) {
        return cn(({ session: e })=>e?.enabledFeatures?.includes(r) ?? !1);
    }
    let W3 = 0;
    const Bm = new Map;
    function uu(r) {
        let e = Bm.get(r);
        return e == null && Bm.set(r, e = W3++), e;
    }
    function V3({ children: r }) {
        const e = cn((u)=>u.originReferenceSpace), a = cn((u)=>u.origin), s = B3() === "visible", i = Hr(), o = M.useMemo(()=>Object.assign({}, i, {
                getState () {
                    return {
                        ...i.getState(),
                        scene: a
                    };
                }
            }), [
            a,
            i
        ]);
        return a == null || e == null ? null : ne.jsx(ne.Fragment, {
            children: lo.createPortal(ne.jsx(hs.Provider, {
                value: i,
                children: ne.jsxs(Ss.Provider, {
                    value: e,
                    children: [
                        ne.jsxs("group", {
                            matrixAutoUpdate: !1,
                            visible: s,
                            children: [
                                ne.jsx(X3, {}),
                                ne.jsx(Y3, {}),
                                ne.jsx(q3, {}),
                                ne.jsx(Z3, {}),
                                ne.jsx(Q3, {})
                            ]
                        }),
                        r
                    ]
                })
            }), o, null)
        });
    }
    function X3() {
        const r = cn((a)=>a.inputSourceStates.filter((s)=>s.type === "controller"), po);
        let e = cn((a)=>a.controller);
        return e === !1 ? null : ne.jsx(ne.Fragment, {
            children: r.map((a)=>{
                const s = ao(e, a.inputSource.handedness, {});
                return s === !1 ? null : ne.jsx(zi.Provider, {
                    value: a,
                    children: ne.jsx(Dr, {
                        space: "target-ray-space",
                        children: ne.jsx(M.Suspense, {
                            children: typeof s == "function" ? ne.jsx(s, {}) : ne.jsx(O3, {
                                ...s
                            })
                        })
                    })
                }, a.id);
            })
        });
    }
    function Y3() {
        const r = cn((a)=>a.inputSourceStates.filter((s)=>s.type === "hand"), po), e = cn((a)=>a.hand);
        return e === !1 ? null : ne.jsx(ne.Fragment, {
            children: r.map((a)=>{
                const s = ao(e, a.inputSource.handedness, {});
                return s === !1 ? null : ne.jsx(zi.Provider, {
                    value: a,
                    children: ne.jsx(Dr, {
                        space: "target-ray-space",
                        children: ne.jsx(M.Suspense, {
                            children: typeof s == "function" ? ne.jsx(s, {}) : ne.jsx(L3, {
                                ...s
                            })
                        })
                    })
                }, uu(a));
            })
        });
    }
    function q3() {
        const r = cn((a)=>a.inputSourceStates.filter((s)=>s.type === "transientPointer"), po), e = cn((a)=>a.transientPointer);
        return e === !1 ? null : ne.jsx(ne.Fragment, {
            children: r.map((a)=>{
                const s = ao(e, a.inputSource.handedness, {});
                return s === !1 ? null : ne.jsx(zi.Provider, {
                    value: a,
                    children: ne.jsx(Dr, {
                        space: "target-ray-space",
                        children: ne.jsx(M.Suspense, {
                            children: typeof s == "function" ? ne.jsx(s, {}) : ne.jsx(z3, {
                                ...s
                            })
                        })
                    })
                }, uu(a));
            })
        });
    }
    function Z3() {
        const r = cn((a)=>a.inputSourceStates.filter((s)=>s.type === "gaze"), po), e = cn((a)=>a.gaze);
        return e === !1 ? null : ne.jsx(ne.Fragment, {
            children: r.map((a)=>ne.jsx(zi.Provider, {
                    value: a,
                    children: ne.jsx(Dr, {
                        space: "target-ray-space",
                        children: ne.jsx(M.Suspense, {
                            children: typeof e == "function" ? ne.jsx(e, {}) : ne.jsx(N3, {
                                ...Av(e)
                            })
                        })
                    })
                }, uu(a)))
        });
    }
    function Q3() {
        const r = cn((a)=>a.inputSourceStates.filter((s)=>s.type === "screenInput"), po), e = cn((a)=>a.screenInput);
        return e === !1 ? null : ne.jsx(ne.Fragment, {
            children: r.map((a)=>ne.jsx(zi.Provider, {
                    value: a,
                    children: ne.jsx(Dr, {
                        space: "target-ray-space",
                        children: ne.jsx(M.Suspense, {
                            children: typeof e == "function" ? ne.jsx(e, {}) : ne.jsx(j3, {
                                ...Av(e)
                            })
                        })
                    })
                }, uu(a)))
        });
    }
    function Av(r) {
        if (r !== !0) return r;
    }
    BM = function(r) {
        return NE(r);
    };
    GM = function({ children: r, store: e }) {
        e.setWebXRManager(Et((s)=>s.gl.xr));
        const a = Hr();
        return M.useEffect(()=>{
            let s;
            return e.subscribe((i, o)=>{
                if (i.session !== o.session) {
                    if (i.session != null) {
                        const { camera: u, gl: d } = a.getState();
                        s = u, a.setState({
                            camera: d.xr.getCamera()
                        });
                        return;
                    }
                    s != null && a.setState({
                        camera: s
                    });
                }
            });
        }, [
            a,
            e
        ]), Wt((s, i, o)=>e.onBeforeFrame(s.scene, s.camera, o), -1e3), Wt(()=>e.onBeforeRender()), ne.jsx(Pv.Provider, {
            value: e,
            children: ne.jsxs(K3, {
                children: [
                    ne.jsx(V3, {}),
                    r
                ]
            })
        });
    };
    function K3({ children: r }) {
        const e = cu(), a = M.useMemo(()=>new vv(!0), []);
        return M.useEffect(()=>X_(e, (s)=>a.setEnabled(s, {
                    timeStamp: performance.now()
                })), [
            e,
            a
        ]), Wt((s)=>a.move(s.scene, {
                timeStamp: performance.now()
            }), -50), ne.jsx($f.Provider, {
            value: a,
            children: r
        });
    }
    function cu() {
        const r = M.useContext(Pv);
        if (r == null) throw new Error("XR features can only be used inside the <XR> component");
        return r;
    }
    cn = function(r = (a)=>a, e) {
        return Jl(cu(), r, e);
    };
    function Ui(r) {
        const e = M.useContext(zi);
        if (e == null) throw new Error("useXRInputSourceStateContext() can only be used inside the xr store config");
        if (r != null && e.type != r) throw new Error(`useXRInputSourceStateContext(${r}) can not be used inside a component for input type "${e.type}"`);
        return e;
    }
    const Dr = M.forwardRef(({ space: r, children: e }, a)=>{
        const s = M.useRef(null), i = typeof r == "string" ? Fv(r) : r;
        M.useImperativeHandle(a, ()=>s.current, []), J3(s, i);
        const o = M.useCallback((u)=>{
            u != null && (u.transformReady = !1, u.visible = !1), s.current = u;
        }, []);
        return ne.jsx("group", {
            xrSpace: i,
            matrixAutoUpdate: !1,
            ref: o,
            children: i && ne.jsx(Ss.Provider, {
                value: i,
                children: e
            })
        });
    });
    function Fv(r) {
        switch(r){
            case "grip-space":
                return Ui().inputSource.gripSpace;
            case "target-ray-space":
                return Ui().inputSource.targetRaySpace;
            case "wrist":
            case "thumb-metacarpal":
            case "thumb-phalanx-proximal":
            case "thumb-phalanx-distal":
            case "thumb-tip":
            case "index-finger-metacarpal":
            case "index-finger-phalanx-proximal":
            case "index-finger-phalanx-intermediate":
            case "index-finger-phalanx-distal":
            case "index-finger-tip":
            case "middle-finger-metacarpal":
            case "middle-finger-phalanx-proximal":
            case "middle-finger-phalanx-intermediate":
            case "middle-finger-phalanx-distal":
            case "middle-finger-tip":
            case "ring-finger-metacarpal":
            case "ring-finger-phalanx-proximal":
            case "ring-finger-phalanx-intermediate":
            case "ring-finger-phalanx-distal":
            case "ring-finger-tip":
            case "pinky-finger-metacarpal":
            case "pinky-finger-phalanx-proximal":
            case "pinky-finger-phalanx-intermediate":
            case "pinky-finger-phalanx-distal":
            case "pinky-finger-tip":
                return Ui("hand").inputSource.hand.get(r);
            case "root":
            case "hips":
            case "spine-lower":
            case "spine-middle":
            case "spine-upper":
            case "chest":
            case "neck":
            case "head":
            case "left-shoulder":
            case "left-scapula":
            case "left-arm-upper":
            case "left-arm-lower":
            case "left-hand-wrist-twist":
            case "right-shoulder":
            case "right-scapula":
            case "right-arm-upper":
            case "right-arm-lower":
            case "right-hand-wrist-twist":
            case "left-hand-palm":
            case "left-hand-wrist":
            case "left-hand-thumb-metacarpal":
            case "left-hand-thumb-phalanx-proximal":
            case "left-hand-thumb-phalanx-distal":
            case "left-hand-thumb-tip":
            case "left-hand-index-metacarpal":
            case "left-hand-index-phalanx-proximal":
            case "left-hand-index-phalanx-intermediate":
            case "left-hand-index-phalanx-distal":
            case "left-hand-index-tip":
            case "left-hand-middle-metacarpal":
            case "left-hand-middle-phalanx-proximal":
            case "left-hand-middle-phalanx-intermediate":
            case "left-hand-middle-phalanx-distal":
            case "left-hand-middle-tip":
            case "left-hand-ring-metacarpal":
            case "left-hand-ring-phalanx-proximal":
            case "left-hand-ring-phalanx-intermediate":
            case "left-hand-ring-phalanx-distal":
            case "left-hand-ring-tip":
            case "left-hand-little-metacarpal":
            case "left-hand-little-phalanx-proximal":
            case "left-hand-little-phalanx-intermediate":
            case "left-hand-little-phalanx-distal":
            case "left-hand-little-tip":
            case "right-hand-palm":
            case "right-hand-wrist":
            case "right-hand-thumb-metacarpal":
            case "right-hand-thumb-phalanx-proximal":
            case "right-hand-thumb-phalanx-distal":
            case "right-hand-thumb-tip":
            case "right-hand-index-metacarpal":
            case "right-hand-index-phalanx-proximal":
            case "right-hand-index-phalanx-intermediate":
            case "right-hand-index-phalanx-distal":
            case "right-hand-index-tip":
            case "right-hand-middle-metacarpal":
            case "right-hand-middle-phalanx-proximal":
            case "right-hand-middle-phalanx-intermediate":
            case "right-hand-middle-phalanx-distal":
            case "right-hand-middle-tip":
            case "right-hand-ring-metacarpal":
            case "right-hand-ring-phalanx-proximal":
            case "right-hand-ring-phalanx-intermediate":
            case "right-hand-ring-phalanx-distal":
            case "right-hand-ring-tip":
            case "right-hand-little-metacarpal":
            case "right-hand-little-phalanx-proximal":
            case "right-hand-little-phalanx-intermediate":
            case "right-hand-little-phalanx-distal":
            case "right-hand-little-tip":
            case "left-upper-leg":
            case "left-lower-leg":
            case "left-foot-ankle-twist":
            case "left-foot-ankle":
            case "left-foot-subtalar":
            case "left-foot-transverse":
            case "left-foot-ball":
            case "right-upper-leg":
            case "right-lower-leg":
            case "right-foot-ankle-twist":
            case "right-foot-ankle":
            case "right-foot-subtalar":
            case "right-foot-transverse":
            case "right-foot-ball":
                return cn((i)=>i.body)?.get(r);
        }
        if (r == null) {
            const i = M.useContext(Ss);
            if (i == null) throw new Error("XR objects must be placed inside the XROrigin");
            return i;
        }
        const [e, a] = M.useState(void 0), s = cn((i)=>i.session);
        return M.useEffect(()=>{
            if (s == null) return;
            let i = !1;
            return s.requestReferenceSpace(r).then((o)=>{
                i || a(o);
            }), ()=>void (i = !0);
        }, [
            s,
            r
        ]), e;
    }
    function $3(r) {
        const e = M.useContext(Ss), a = cn((s)=>e ?? s.originReferenceSpace);
        return M.useMemo(()=>r == null || a == null ? void 0 : tE(r, a), [
            r,
            a
        ]);
    }
    function J3(r, e, a) {
        const s = $3(e);
        Wt((i, o, u)=>{
            r.current != null && (r.current.visible = r.current.transformReady = s?.(r.current.matrix, u) ?? !1);
        }, -100);
    }
    M.forwardRef(({ mesh: r, ...e }, a)=>{
        const s = eM(r);
        return ne.jsx("mesh", {
            ref: a,
            geometry: s,
            ...e
        });
    });
    function eM(r, e = !0) {
        const [a, s] = M.useState(Dm(r, void 0));
        return Wt(()=>s((i)=>Dm(r, i))), M.useEffect(()=>{
            if (e) return ()=>a.dispose();
        }, [
            a
        ]), a;
    }
    M.forwardRef(({ plane: r, ...e }, a)=>{
        const s = tM(r);
        return ne.jsx("mesh", {
            ref: a,
            geometry: s,
            ...e
        });
    });
    function tM(r, e = !0) {
        const [a, s] = M.useState(Um(r, void 0));
        return Wt(()=>s((i)=>Um(r, i))), M.useEffect(()=>{
            if (e) return ()=>a.dispose();
        }, [
            a
        ]), a;
    }
    M.forwardRef(({ children: r, disabled: e, ...a }, s)=>{
        const i = Et((d)=>d.gl.xr.getCamera()), o = M.useRef(null), u = cn((d)=>d.originReferenceSpace);
        return M.useImperativeHandle(s, ()=>o.current, []), M.useEffect(()=>{
            const d = o.current;
            if (!(d == null || e)) return d.add(i), ()=>void d.remove(i);
        }, [
            e,
            i
        ]), ne.jsx("group", {
            ref: o,
            ...a,
            children: ne.jsx(Ss.Provider, {
                value: u,
                children: r
            })
        });
    });
    function nM(r, e, a) {
        const s = M.useRef(void 0);
        rM(e, a, M.useCallback((i)=>s.current = i, [])), Wt((i, o, u)=>{
            r == null || u == null || s.current == null || r(u.getHitTestResults(s.current.source), s.current.getWorldMatrix);
        });
    }
    function rM(r, e, a) {
        const s = cu(), i = Jl(s, (o)=>o.session);
        M.useEffect(()=>{
            if (i == null) return;
            let o, u = !1;
            const d = r instanceof XRSpace || typeof r == "string" ? r : r?.current;
            if (d != null) return g3(s, i, d, e).then((c)=>{
                u || (o = c, a(c));
            }), ()=>{
                a(void 0), u = !0, o?.source.cancel();
            };
        }, [
            i,
            s,
            r,
            e,
            a
        ]);
    }
    M.forwardRef(({ trackableType: r, onResults: e, space: a, ...s }, i)=>{
        const o = M.useRef(null);
        return M.useImperativeHandle(i, ()=>o.current), nM(e, a ?? o, r), ne.jsx("group", {
            ...s,
            ref: o
        });
    });
    M.forwardRef((r, e)=>{
        const a = cn((o)=>o.domOverlayRoot), { In: s, Out: i } = M.useMemo(E_, []);
        return M.useEffect(()=>{
            if (a == null) return;
            const o = Xm.createRoot(a);
            return o.render(ne.jsx(i, {})), ()=>o.unmount();
        }, [
            a,
            i
        ]), ne.jsx(s, {
            children: ne.jsx("div", {
                ...r,
                ref: e
            })
        });
    });
    M.forwardRef(function({ src: e, pixelWidth: a = 1024, pixelHeight: s = 1024, dpr: i = 1, renderPriority: o = 0, children: u, customRender: d, ...c }, h) {
        const [p, v] = M.useState(!1), y = M.useRef(null), b = M.useRef(void 0), S = M.useRef(void 0);
        M.useEffect(()=>{
            v(!1);
            let T = !1;
            return a3(e).then(()=>!T && v(!0)), ()=>void (T = !0);
        }, [
            e
        ]);
        const _ = H3("layers"), x = M.useMemo(()=>r3(c.shape ?? "quad", {
                centralAngle: c.centralAngle,
                centralHorizontalAngle: c.centralHorizontalAngle,
                lowerVerticalAngle: c.lowerVerticalAngle,
                upperVerticalAngle: c.upperVerticalAngle
            }), [
            c.centralAngle,
            c.centralHorizontalAngle,
            c.lowerVerticalAngle,
            c.shape,
            c.upperVerticalAngle
        ]), k = lM(a, s, i);
        return oM(k, y, [
            p,
            _
        ]), M.useImperativeHandle(h, ()=>y.current, [
            p,
            _
        ]), p ? ne.jsxs(ne.Fragment, {
            children: [
                e == null && ne.jsx(uM, {
                    customRender: d,
                    store: k,
                    renderPriority: o,
                    renderTargetRef: b,
                    layerEntryRef: _ ? S : void 0,
                    children: u
                }),
                _ ? ne.jsx(iM, {
                    renderTargetRef: b,
                    layerEntryRef: S,
                    pixelWidth: a,
                    pixelHeight: s,
                    dpr: i,
                    ref: y,
                    ...c,
                    src: e,
                    geometry: x
                }) : ne.jsx(aM, {
                    renderTargetRef: b,
                    ref: y,
                    ...c,
                    src: e,
                    pixelWidth: a,
                    pixelHeight: s,
                    dpr: i,
                    geometry: x
                })
            ]
        }) : null;
    });
    const iM = M.forwardRef(({ src: r, shape: e, colorFormat: a, depthFormat: s, layout: i, mipLevels: o, renderOrder: u = 0, blendTextureSourceAlpha: d, centralAngle: c, centralHorizontalAngle: h, chromaticAberrationCorrection: p, lowerVerticalAngle: v, quality: y, upperVerticalAngle: b, invertStereo: S, pixelWidth: _, pixelHeight: x, dpr: k, renderTargetRef: T, layerEntryRef: A, ...U }, D)=>{
        const R = M.useRef(null), N = Et((G)=>G.gl), P = cu(), I = {
            blendTextureSourceAlpha: d,
            centralAngle: c,
            centralHorizontalAngle: h,
            chromaticAberrationCorrection: p,
            lowerVerticalAngle: v,
            quality: y,
            upperVerticalAngle: b
        }, F = M.useRef(I);
        F.current = I;
        const Y = M.useRef(u);
        Y.current = u;
        const L = cn((G)=>G.originReferenceSpace);
        return M.useEffect(()=>{
            if (R.current == null || L == null) return;
            const G = r ?? (T.current = Cv(_, x, k)), B = $E(G, P.getState(), L, N.xr, R.current, {
                colorFormat: a,
                depthFormat: s,
                invertStereo: S,
                layout: i,
                mipLevels: o,
                shape: e
            }, F.current);
            if (B == null) return;
            const K = A.current = {
                layer: B,
                renderOrder: Y.current,
                object3D: R.current
            };
            if (P.addLayerEntry(K), G instanceof HTMLVideoElement || G instanceof Gr) return ()=>{
                P.removeLayerEntry(K), B.destroy();
            };
            const ee = i3(N, P, B, G);
            return ()=>{
                P.removeLayerEntry(K), ee(), B.destroy();
            };
        }, [
            L,
            a,
            s,
            S,
            A,
            i,
            o,
            x,
            _,
            k,
            T,
            N,
            e,
            r,
            P
        ]), A.current != null && (A.current.renderOrder = u), A.current != null && Qf(A.current.layer, F.current), Wt(()=>{
            A.current == null || R.current == null || l3(P.getState(), A.current.layer, F.current.centralAngle, R.current);
        }), M.useImperativeHandle(D, ()=>R.current, []), ne.jsx("mesh", {
            ...U,
            renderOrder: -1 / 0,
            ref: R,
            children: ne.jsx("meshBasicMaterial", {
                colorWrite: !1
            })
        });
    }), aM = M.forwardRef(({ src: r, renderTargetRef: e, dpr: a, renderOrder: s, pixelWidth: i, pixelHeight: o, ...u }, d)=>{
        const c = M.useRef(null);
        return M.useEffect(()=>{
            if (c.current == null) return;
            const h = r ?? (e.current = Cv(i, o, a)), p = o3(h);
            return c.current.map = p, c.current.needsUpdate = !0, ()=>{
                if (h instanceof Gr) {
                    h.dispose();
                    return;
                }
                p.dispose();
            };
        }, [
            r,
            i,
            o,
            a,
            e
        ]), ne.jsx("mesh", {
            ref: d,
            ...u,
            children: ne.jsx("meshBasicMaterial", {
                ref: c,
                toneMapped: !1
            })
        });
    });
    function oM(r, e, a) {
        M.useEffect(()=>{
            const { current: s } = e;
            if (s == null) return;
            let i;
            const o = (d, c)=>{
                if (d.camera === c?.camera && d.scene === c.scene) return;
                i?.();
                const { destroy: h, update: p } = OE(s, ()=>d.camera, d.scene), v = nw(p);
                i = ()=>{
                    h(), v();
                };
            };
            o(r.getState());
            const u = r.subscribe(o);
            return ()=>{
                u(), i?.();
            };
        }, [
            r,
            e,
            ...a
        ]);
    }
    const sM = [
        "set",
        "get",
        "setSize",
        "setFrameloop",
        "setDpr",
        "events",
        "invalidate",
        "advance",
        "size",
        "viewport"
    ];
    function lM(r, e, a) {
        const s = Hr(), i = M.useMemo(()=>{
            let o = s.getState();
            const u = new la(50, 1, .1, 1e3);
            u.position.set(0, 0, 5);
            const d = new Ft;
            let c = {
                events: {
                    enabled: !1,
                    priority: 0
                },
                size: {
                    width: 1,
                    height: 1,
                    left: 0,
                    top: 0
                },
                camera: u,
                scene: new fs,
                raycaster: new co,
                pointer: d,
                mouse: d,
                previousRoot: s
            };
            const h = Df((p, v)=>{
                const y = ()=>{
                    const S = {};
                    for(const _ in o)sM.includes(_) || (S[_] = o[_]);
                    return Object.assign(S, c, {
                        events: {
                            ...o.events,
                            ...c.events
                        },
                        viewport: Object.assign({}, o.viewport, o.viewport.getCurrentViewport(u, new ke, c.size))
                    });
                }, b = ()=>p(y());
                return {
                    ...o,
                    set (S) {
                        typeof S == "function" && (S = S(v())), Object.assign(c, S), b();
                    },
                    setPreviousState (S) {
                        o = S, b();
                    },
                    get: v,
                    setEvents () {},
                    ...y()
                };
            });
            return Object.assign(h, {
                setState (p) {
                    h.getState().set(p);
                }
            });
        }, [
            s
        ]);
        return M.useEffect(()=>s.subscribe(i.getState().setPreviousState), [
            s,
            i
        ]), M.useEffect(()=>{
            const o = {
                factor: 1,
                distance: 0,
                dpr: a,
                initialDpr: a,
                left: 0,
                top: 0,
                getCurrentViewport: ()=>o,
                width: r,
                height: e,
                aspect: r / e
            };
            i.setState({
                size: {
                    width: r,
                    height: e,
                    top: 0,
                    left: 0
                },
                viewport: o
            });
        }, [
            r,
            e,
            a,
            i,
            s
        ]), i;
    }
    const ts = new Fl;
    function Gm(r) {
        return this.getViewport(ts), r.x = ts.z - ts.x, r.y = ts.w - ts.y, r;
    }
    const Hm = new Fl;
    function uM({ renderPriority: r, children: e, layerEntryRef: a, renderTargetRef: s, store: i, customRender: o }) {
        M.useEffect(()=>{
            const y = (b, S)=>{
                const { size: _, camera: x } = b;
                x instanceof Di ? (x.left = _.width / -2, x.right = _.width / 2, x.top = _.height / 2, x.bottom = _.height / -2) : x.aspect = _.width / _.height, (_ !== S?.size || x !== S.camera) && (x.updateProjectionMatrix(), x.updateMatrixWorld());
            };
            return y(i.getState()), i.subscribe(y);
        }, [
            i
        ]);
        let u, d, c, h, p, v;
        return Wt((y, b, S)=>{
            if (s.current == null || a != null && (a.current == null || S == null)) return;
            const _ = i.getState(), { gl: x, scene: k, camera: T } = _;
            u = x.autoClear, d = x.xr.enabled, c = x.xr.isPresenting, h = x.getRenderTarget(), v = x.getSize, p = x.getDrawingBufferSize, x.getViewport(Hm), x.autoClear = !0, x.xr.enabled = !1, x.xr.isPresenting = !1;
            const A = s.current;
            x.setViewport(0, 0, A.width, A.height), x.getSize = Gm, x.getDrawingBufferSize = Gm, n3(x, A, a?.current, S), o != null ? o(A, _, b, S) : x.render(k, T), x.setRenderTarget(h), x.setViewport(Hm), x.autoClear = u, x.xr.enabled = d, x.xr.isPresenting = c, x.getSize = v, x.getDrawingBufferSize = p;
        }, r), ne.jsx(ne.Fragment, {
            children: lo.createPortal(ne.jsx(hs.Provider, {
                value: i,
                children: e
            }), i, null)
        });
    }
    const Dv = M.forwardRef(({ store: r, mode: e, onError: a, children: s, ...i }, o)=>{
        const u = Jl(r, (c)=>c.session), d = G3(e, a);
        return ne.jsx("button", {
            ref: o,
            ...i,
            onClick: ()=>u != null ? u.end() : r.enterXR(e).catch(a),
            children: typeof s == "function" ? s(d ? u != null ? "entered" : "exited" : "unsupported") : s
        });
    });
    M.forwardRef((r, e)=>ne.jsx(Dv, {
            ref: e,
            mode: "immersive-ar",
            ...r
        }));
    M.forwardRef((r, e)=>ne.jsx(Dv, {
            ref: e,
            mode: "immersive-vr",
            ...r
        }));
    const cM = {
        onBlur: "pointerleave",
        onHover: "pointerenter",
        onMove: "pointermove",
        onSelect: {
            type: "click",
            filter: (r)=>r.pointerType === "ray"
        },
        onSelectEnd: {
            type: "pointerup",
            filter: (r)=>r.pointerType === "ray"
        },
        onSelectStart: {
            type: "pointerdown",
            filter: (r)=>r.pointerType === "ray"
        },
        onSqueeze: {
            type: "click",
            filter: (r)=>r.pointerType === "grab"
        },
        onSqueezeEnd: {
            type: "pointerup",
            filter: (r)=>r.pointerType === "grab"
        },
        onSqueezeStart: {
            type: "pointerdown",
            filter: (r)=>r.pointerType === "grab"
        }
    };
    function ai(r, e, a) {
        const s = M.useRef(a);
        s.current = a, M.useEffect(()=>{
            const { current: i } = r;
            if (i == null) return;
            const o = cM[e], u = typeof o == "string" ? (c)=>s.current?.({
                    intersection: c,
                    intersections: [
                        c
                    ],
                    target: c.pointerState
                }) : (c)=>{
                c instanceof An && !o.filter(c) || s.current?.({
                    intersection: c,
                    intersections: [
                        c
                    ],
                    target: c.pointerState
                });
            }, d = typeof o == "string" ? o : o.type;
            return i.addEventListener(d, u), ()=>i.removeEventListener(d, u);
        }, [
            r,
            e
        ]);
    }
    const fM = M.forwardRef(({ onHover: r, onBlur: e, onSelectStart: a, onSelectEnd: s, onSelect: i, onSqueezeStart: o, onSqueezeEnd: u, onSqueeze: d, onMove: c, children: h }, p)=>{
        const v = M.useRef(null);
        return M.useImperativeHandle(p, ()=>v.current), ai(v, "onHover", r), ai(v, "onBlur", e), ai(v, "onSelectStart", a), ai(v, "onSelectEnd", s), ai(v, "onSelect", i), ai(v, "onSqueezeStart", o), ai(v, "onSqueezeEnd", u), ai(v, "onSqueeze", d), ai(v, "onMove", c), ne.jsx("group", {
            ref: v,
            children: h
        });
    });
    M.forwardRef(function({ onSelectStart: e, onSelectEnd: a, children: s, ...i }, o) {
        const u = M.useRef(void 0), d = M.useRef(null), c = M.useMemo(()=>new Yn, []);
        return M.useImperativeHandle(o, ()=>d.current), Wt(()=>{
            const h = u.current, p = d.current;
            !p || !h || (p.applyMatrix4(c), h.updateWorldMatrix(!0, !1), p.applyMatrix4(h.matrixWorld), p.updateMatrixWorld(), c.copy(h.matrixWorld).invert());
        }), ne.jsx(fM, {
            ref: d,
            onSelectStart: (h)=>{
                G_(h.target) && (h.target.type === "controller" || h.target.type === "hand") && h.target.object != null && (u.current = h.target.object, h.target.object.updateWorldMatrix(!0, !1), c.copy(h.target.object.matrixWorld).invert(), e?.(h));
            },
            onSelectEnd: (h)=>{
                h.target.controller === u.current && (u.current = void 0), a?.(h);
            },
            ...i,
            children: s
        });
    });
})();
export { _M as B, AM as C, IM as E, kM as G, vM as H, OM as I, CM as O, RM as R, MM as T, LM as X, Yy as _, Et as a, Wt as b, Df as c, FM as d, DM as e, bM as f, xM as g, gM as h, GM as i, BM as j, TM as k, PM as l, NM as m, zM as q, yM as r, wM as s, cn as u, UM as w, __tla };
