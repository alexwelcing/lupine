import { R as se, b as $, j as h, c as go } from "./vendor-react-OtmnRBTN.js";
import { P as U, __tla as __tla_0 } from "./App-C1_E5cpR.js";
import { c as Pa, m as Hu, _ as pi, __tla as __tla_1 } from "./vendor-react-three-BEavodTA.js";
import { i as M, G as yt, Q as X, aE as re, q as Oa, ar as Wu, a7 as Ia, e as Bc, b5 as jc, a3 as ka, b6 as Uc, b2 as Vc, aT as Te, O as qu, E as Me, M as ce, aB as ji, ay as Kn, b7 as Rr, b8 as La, au as Xu, S as Gc, P as $c, b0 as Yu, aO as Zu, W as Hc, h as xo, $ as Qu, l as yo, b9 as Ku, ba as Ju, R as eh, _ as th, bb as nh } from "./vendor-three-Bam-DO-L.js";
import "./vendor-postprocess-qWgy7zq_.js";
import "./AtomsOptimized-DaI6y2ng.js";
let F5;
let __tla = Promise.all([
    (()=>{
        try {
            return __tla_0;
        } catch  {}
    })(),
    (()=>{
        try {
            return __tla_1;
        } catch  {}
    })()
]).then(async ()=>{
    const vo = ()=>{};
    let Ca = {}, Wc = {}, qc = null, Xc = {
        mark: vo,
        measure: vo
    };
    try {
        typeof window < "u" && (Ca = window), typeof document < "u" && (Wc = document), typeof MutationObserver < "u" && (qc = MutationObserver), typeof performance < "u" && (Xc = performance);
    } catch  {}
    const { userAgent: wo = "" } = Ca.navigator || {}, Vt = Ca, ie = Wc, bo = qc, sr = Xc;
    Vt.document;
    const vt = !!ie.documentElement && !!ie.head && typeof ie.addEventListener == "function" && typeof ie.createElement == "function", Yc = ~wo.indexOf("MSIE") || ~wo.indexOf("Trident/");
    var ae = "classic", Zc = "duotone", ze = "sharp", De = "sharp-duotone", ih = [
        ae,
        Zc,
        ze,
        De
    ], rh = {
        classic: {
            900: "fas",
            400: "far",
            normal: "far",
            300: "fal",
            100: "fat"
        },
        sharp: {
            900: "fass",
            400: "fasr",
            300: "fasl",
            100: "fast"
        },
        "sharp-duotone": {
            900: "fasds"
        }
    }, To = {
        kit: {
            fak: "kit",
            "fa-kit": "kit"
        },
        "kit-duotone": {
            fakd: "kit-duotone",
            "fa-kit-duotone": "kit-duotone"
        }
    }, sh = [
        "kit"
    ], ah = /fa(s|r|l|t|d|b|k|kd|ss|sr|sl|st|sds)?[\-\ ]/, oh = /Font ?Awesome ?([56 ]*)(Solid|Regular|Light|Thin|Duotone|Brands|Free|Pro|Sharp Duotone|Sharp|Kit)?.*/i, lh = {
        "Font Awesome 5 Free": {
            900: "fas",
            400: "far"
        },
        "Font Awesome 5 Pro": {
            900: "fas",
            400: "far",
            normal: "far",
            300: "fal"
        },
        "Font Awesome 5 Brands": {
            400: "fab",
            normal: "fab"
        },
        "Font Awesome 5 Duotone": {
            900: "fad"
        }
    }, ch = {
        "Font Awesome 6 Free": {
            900: "fas",
            400: "far"
        },
        "Font Awesome 6 Pro": {
            900: "fas",
            400: "far",
            normal: "far",
            300: "fal",
            100: "fat"
        },
        "Font Awesome 6 Brands": {
            400: "fab",
            normal: "fab"
        },
        "Font Awesome 6 Duotone": {
            900: "fad"
        },
        "Font Awesome 6 Sharp": {
            900: "fass",
            400: "fasr",
            normal: "fasr",
            300: "fasl",
            100: "fast"
        },
        "Font Awesome 6 Sharp Duotone": {
            900: "fasds"
        }
    }, uh = {
        classic: {
            "fa-brands": "fab",
            "fa-duotone": "fad",
            "fa-light": "fal",
            "fa-regular": "far",
            "fa-solid": "fas",
            "fa-thin": "fat"
        },
        sharp: {
            "fa-solid": "fass",
            "fa-regular": "fasr",
            "fa-light": "fasl",
            "fa-thin": "fast"
        },
        "sharp-duotone": {
            "fa-solid": "fasds"
        }
    }, hh = {
        classic: [
            "fas",
            "far",
            "fal",
            "fat"
        ],
        sharp: [
            "fass",
            "fasr",
            "fasl",
            "fast"
        ],
        "sharp-duotone": [
            "fasds"
        ]
    }, dh = {
        classic: {
            fab: "fa-brands",
            fad: "fa-duotone",
            fal: "fa-light",
            far: "fa-regular",
            fas: "fa-solid",
            fat: "fa-thin"
        },
        sharp: {
            fass: "fa-solid",
            fasr: "fa-regular",
            fasl: "fa-light",
            fast: "fa-thin"
        },
        "sharp-duotone": {
            fasds: "fa-solid"
        }
    }, fh = {
        classic: {
            solid: "fas",
            regular: "far",
            light: "fal",
            thin: "fat",
            duotone: "fad",
            brands: "fab"
        },
        sharp: {
            solid: "fass",
            regular: "fasr",
            light: "fasl",
            thin: "fast"
        },
        "sharp-duotone": {
            solid: "fasds"
        }
    }, Qc = {
        classic: {
            fa: "solid",
            fas: "solid",
            "fa-solid": "solid",
            far: "regular",
            "fa-regular": "regular",
            fal: "light",
            "fa-light": "light",
            fat: "thin",
            "fa-thin": "thin",
            fad: "duotone",
            "fa-duotone": "duotone",
            fab: "brands",
            "fa-brands": "brands"
        },
        sharp: {
            fa: "solid",
            fass: "solid",
            "fa-solid": "solid",
            fasr: "regular",
            "fa-regular": "regular",
            fasl: "light",
            "fa-light": "light",
            fast: "thin",
            "fa-thin": "thin"
        },
        "sharp-duotone": {
            fa: "solid",
            fasds: "solid",
            "fa-solid": "solid"
        }
    }, ph = [
        "solid",
        "regular",
        "light",
        "thin",
        "duotone",
        "brands"
    ], Kc = [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10
    ], mh = Kc.concat([
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20
    ]), Ri = {
        GROUP: "duotone-group",
        SWAP_OPACITY: "swap-opacity",
        PRIMARY: "primary",
        SECONDARY: "secondary"
    }, gh = [
        ...Object.keys(hh),
        ...ph,
        "2xs",
        "xs",
        "sm",
        "lg",
        "xl",
        "2xl",
        "beat",
        "border",
        "fade",
        "beat-fade",
        "bounce",
        "flip-both",
        "flip-horizontal",
        "flip-vertical",
        "flip",
        "fw",
        "inverse",
        "layers-counter",
        "layers-text",
        "layers",
        "li",
        "pull-left",
        "pull-right",
        "pulse",
        "rotate-180",
        "rotate-270",
        "rotate-90",
        "rotate-by",
        "shake",
        "spin-pulse",
        "spin-reverse",
        "spin",
        "stack-1x",
        "stack-2x",
        "stack",
        "ul",
        Ri.GROUP,
        Ri.SWAP_OPACITY,
        Ri.PRIMARY,
        Ri.SECONDARY
    ].concat(Kc.map((t)=>"".concat(t, "x"))).concat(mh.map((t)=>"w-".concat(t))), xh = {
        "Font Awesome Kit": {
            400: "fak",
            normal: "fak"
        },
        "Font Awesome Kit Duotone": {
            400: "fakd",
            normal: "fakd"
        }
    }, yh = {
        kit: {
            "fa-kit": "fak"
        }
    }, vh = {
        kit: {
            fak: "fa-kit"
        }
    }, Eo = {
        kit: {
            kit: "fak"
        },
        "kit-duotone": {
            "kit-duotone": "fakd"
        }
    };
    const gt = "___FONT_AWESOME___", $s = 16, Jc = "fa", e0 = "svg-inline--fa", dn = "data-fa-i2svg", Hs = "data-fa-pseudo-element", wh = "data-fa-pseudo-element-pending", Na = "data-prefix", Fa = "data-icon", _o = "fontawesome-i2svg", bh = "async", Th = [
        "HTML",
        "HEAD",
        "STYLE",
        "SCRIPT"
    ], t0 = (()=>{
        try {
            return !0;
        } catch  {
            return !1;
        }
    })(), n0 = [
        ae,
        ze,
        De
    ];
    function Ji(t) {
        return new Proxy(t, {
            get (e, n) {
                return n in e ? e[n] : e[ae];
            }
        });
    }
    const i0 = {
        ...Qc
    };
    i0[ae] = {
        ...Qc[ae],
        ...To.kit,
        ...To["kit-duotone"]
    };
    const sn = Ji(i0), Ws = {
        ...fh
    };
    Ws[ae] = {
        ...Ws[ae],
        ...Eo.kit,
        ...Eo["kit-duotone"]
    };
    const Ui = Ji(Ws), qs = {
        ...dh
    };
    qs[ae] = {
        ...qs[ae],
        ...vh.kit
    };
    const an = Ji(qs), Xs = {
        ...uh
    };
    Xs[ae] = {
        ...Xs[ae],
        ...yh.kit
    };
    const Eh = Ji(Xs), _h = ah, r0 = "fa-layers-text", Sh = oh, Mh = {
        ...rh
    };
    Ji(Mh);
    const Ah = [
        "class",
        "data-prefix",
        "data-icon",
        "data-fa-transform",
        "data-fa-mask"
    ], cs = Ri, Jn = new Set;
    Object.keys(Ui[ae]).map(Jn.add.bind(Jn));
    Object.keys(Ui[ze]).map(Jn.add.bind(Jn));
    Object.keys(Ui[De]).map(Jn.add.bind(Jn));
    const Rh = [
        ...sh,
        ...gh
    ], Ci = Vt.FontAwesomeConfig || {};
    function Ph(t) {
        var e = ie.querySelector("script[" + t + "]");
        if (e) return e.getAttribute(t);
    }
    function Oh(t) {
        return t === "" ? !0 : t === "false" ? !1 : t === "true" ? !0 : t;
    }
    ie && typeof ie.querySelector == "function" && [
        [
            "data-family-prefix",
            "familyPrefix"
        ],
        [
            "data-css-prefix",
            "cssPrefix"
        ],
        [
            "data-family-default",
            "familyDefault"
        ],
        [
            "data-style-default",
            "styleDefault"
        ],
        [
            "data-replacement-class",
            "replacementClass"
        ],
        [
            "data-auto-replace-svg",
            "autoReplaceSvg"
        ],
        [
            "data-auto-add-css",
            "autoAddCss"
        ],
        [
            "data-auto-a11y",
            "autoA11y"
        ],
        [
            "data-search-pseudo-elements",
            "searchPseudoElements"
        ],
        [
            "data-observe-mutations",
            "observeMutations"
        ],
        [
            "data-mutate-approach",
            "mutateApproach"
        ],
        [
            "data-keep-original-source",
            "keepOriginalSource"
        ],
        [
            "data-measure-performance",
            "measurePerformance"
        ],
        [
            "data-show-missing-icons",
            "showMissingIcons"
        ]
    ].forEach((e)=>{
        let [n, i] = e;
        const r = Oh(Ph(n));
        r != null && (Ci[i] = r);
    });
    const s0 = {
        styleDefault: "solid",
        familyDefault: "classic",
        cssPrefix: Jc,
        replacementClass: e0,
        autoReplaceSvg: !0,
        autoAddCss: !0,
        autoA11y: !0,
        searchPseudoElements: !1,
        observeMutations: !0,
        mutateApproach: "async",
        keepOriginalSource: !0,
        measurePerformance: !1,
        showMissingIcons: !0
    };
    Ci.familyPrefix && (Ci.cssPrefix = Ci.familyPrefix);
    const ei = {
        ...s0,
        ...Ci
    };
    ei.autoReplaceSvg || (ei.observeMutations = !1);
    const I = {};
    Object.keys(s0).forEach((t)=>{
        Object.defineProperty(I, t, {
            enumerable: !0,
            set: function(e) {
                ei[t] = e, Ni.forEach((n)=>n(I));
            },
            get: function() {
                return ei[t];
            }
        });
    });
    Object.defineProperty(I, "familyPrefix", {
        enumerable: !0,
        set: function(t) {
            ei.cssPrefix = t, Ni.forEach((e)=>e(I));
        },
        get: function() {
            return ei.cssPrefix;
        }
    });
    Vt.FontAwesomeConfig = I;
    const Ni = [];
    function Ih(t) {
        return Ni.push(t), ()=>{
            Ni.splice(Ni.indexOf(t), 1);
        };
    }
    const St = $s, ct = {
        size: 16,
        x: 0,
        y: 0,
        rotate: 0,
        flipX: !1,
        flipY: !1
    };
    function kh(t) {
        if (!t || !vt) return;
        const e = ie.createElement("style");
        e.setAttribute("type", "text/css"), e.innerHTML = t;
        const n = ie.head.childNodes;
        let i = null;
        for(let r = n.length - 1; r > -1; r--){
            const s = n[r], a = (s.tagName || "").toUpperCase();
            [
                "STYLE",
                "LINK"
            ].indexOf(a) > -1 && (i = s);
        }
        return ie.head.insertBefore(e, i), t;
    }
    const Lh = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    function Vi() {
        let t = 12, e = "";
        for(; t-- > 0;)e += Lh[Math.random() * 62 | 0];
        return e;
    }
    function ci(t) {
        const e = [];
        for(let n = (t || []).length >>> 0; n--;)e[n] = t[n];
        return e;
    }
    function za(t) {
        return t.classList ? ci(t.classList) : (t.getAttribute("class") || "").split(" ").filter((e)=>e);
    }
    function a0(t) {
        return "".concat(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    function Ch(t) {
        return Object.keys(t || {}).reduce((e, n)=>e + "".concat(n, '="').concat(a0(t[n]), '" '), "").trim();
    }
    function Ur(t) {
        return Object.keys(t || {}).reduce((e, n)=>e + "".concat(n, ": ").concat(t[n].trim(), ";"), "");
    }
    function Da(t) {
        return t.size !== ct.size || t.x !== ct.x || t.y !== ct.y || t.rotate !== ct.rotate || t.flipX || t.flipY;
    }
    function Nh(t) {
        let { transform: e, containerWidth: n, iconWidth: i } = t;
        const r = {
            transform: "translate(".concat(n / 2, " 256)")
        }, s = "translate(".concat(e.x * 32, ", ").concat(e.y * 32, ") "), a = "scale(".concat(e.size / 16 * (e.flipX ? -1 : 1), ", ").concat(e.size / 16 * (e.flipY ? -1 : 1), ") "), o = "rotate(".concat(e.rotate, " 0 0)"), l = {
            transform: "".concat(s, " ").concat(a, " ").concat(o)
        }, c = {
            transform: "translate(".concat(i / 2 * -1, " -256)")
        };
        return {
            outer: r,
            inner: l,
            path: c
        };
    }
    function Fh(t) {
        let { transform: e, width: n = $s, height: i = $s, startCentered: r = !1 } = t, s = "";
        return r && Yc ? s += "translate(".concat(e.x / St - n / 2, "em, ").concat(e.y / St - i / 2, "em) ") : r ? s += "translate(calc(-50% + ".concat(e.x / St, "em), calc(-50% + ").concat(e.y / St, "em)) ") : s += "translate(".concat(e.x / St, "em, ").concat(e.y / St, "em) "), s += "scale(".concat(e.size / St * (e.flipX ? -1 : 1), ", ").concat(e.size / St * (e.flipY ? -1 : 1), ") "), s += "rotate(".concat(e.rotate, "deg) "), s;
    }
    var zh = `:root, :host {
  --fa-font-solid: normal 900 1em/1 "Font Awesome 6 Free";
  --fa-font-regular: normal 400 1em/1 "Font Awesome 6 Free";
  --fa-font-light: normal 300 1em/1 "Font Awesome 6 Pro";
  --fa-font-thin: normal 100 1em/1 "Font Awesome 6 Pro";
  --fa-font-duotone: normal 900 1em/1 "Font Awesome 6 Duotone";
  --fa-font-brands: normal 400 1em/1 "Font Awesome 6 Brands";
  --fa-font-sharp-solid: normal 900 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-regular: normal 400 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-light: normal 300 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-thin: normal 100 1em/1 "Font Awesome 6 Sharp";
  --fa-font-sharp-duotone-solid: normal 900 1em/1 "Font Awesome 6 Sharp Duotone";
}

svg:not(:root).svg-inline--fa, svg:not(:host).svg-inline--fa {
  overflow: visible;
  box-sizing: content-box;
}

.svg-inline--fa {
  display: var(--fa-display, inline-block);
  height: 1em;
  overflow: visible;
  vertical-align: -0.125em;
}
.svg-inline--fa.fa-2xs {
  vertical-align: 0.1em;
}
.svg-inline--fa.fa-xs {
  vertical-align: 0em;
}
.svg-inline--fa.fa-sm {
  vertical-align: -0.0714285705em;
}
.svg-inline--fa.fa-lg {
  vertical-align: -0.2em;
}
.svg-inline--fa.fa-xl {
  vertical-align: -0.25em;
}
.svg-inline--fa.fa-2xl {
  vertical-align: -0.3125em;
}
.svg-inline--fa.fa-pull-left {
  margin-right: var(--fa-pull-margin, 0.3em);
  width: auto;
}
.svg-inline--fa.fa-pull-right {
  margin-left: var(--fa-pull-margin, 0.3em);
  width: auto;
}
.svg-inline--fa.fa-li {
  width: var(--fa-li-width, 2em);
  top: 0.25em;
}
.svg-inline--fa.fa-fw {
  width: var(--fa-fw-width, 1.25em);
}

.fa-layers svg.svg-inline--fa {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
}

.fa-layers-counter, .fa-layers-text {
  display: inline-block;
  position: absolute;
  text-align: center;
}

.fa-layers {
  display: inline-block;
  height: 1em;
  position: relative;
  text-align: center;
  vertical-align: -0.125em;
  width: 1em;
}
.fa-layers svg.svg-inline--fa {
  transform-origin: center center;
}

.fa-layers-text {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
}

.fa-layers-counter {
  background-color: var(--fa-counter-background-color, #ff253a);
  border-radius: var(--fa-counter-border-radius, 1em);
  box-sizing: border-box;
  color: var(--fa-inverse, #fff);
  line-height: var(--fa-counter-line-height, 1);
  max-width: var(--fa-counter-max-width, 5em);
  min-width: var(--fa-counter-min-width, 1.5em);
  overflow: hidden;
  padding: var(--fa-counter-padding, 0.25em 0.5em);
  right: var(--fa-right, 0);
  text-overflow: ellipsis;
  top: var(--fa-top, 0);
  transform: scale(var(--fa-counter-scale, 0.25));
  transform-origin: top right;
}

.fa-layers-bottom-right {
  bottom: var(--fa-bottom, 0);
  right: var(--fa-right, 0);
  top: auto;
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: bottom right;
}

.fa-layers-bottom-left {
  bottom: var(--fa-bottom, 0);
  left: var(--fa-left, 0);
  right: auto;
  top: auto;
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: bottom left;
}

.fa-layers-top-right {
  top: var(--fa-top, 0);
  right: var(--fa-right, 0);
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: top right;
}

.fa-layers-top-left {
  left: var(--fa-left, 0);
  right: auto;
  top: var(--fa-top, 0);
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: top left;
}

.fa-1x {
  font-size: 1em;
}

.fa-2x {
  font-size: 2em;
}

.fa-3x {
  font-size: 3em;
}

.fa-4x {
  font-size: 4em;
}

.fa-5x {
  font-size: 5em;
}

.fa-6x {
  font-size: 6em;
}

.fa-7x {
  font-size: 7em;
}

.fa-8x {
  font-size: 8em;
}

.fa-9x {
  font-size: 9em;
}

.fa-10x {
  font-size: 10em;
}

.fa-2xs {
  font-size: 0.625em;
  line-height: 0.1em;
  vertical-align: 0.225em;
}

.fa-xs {
  font-size: 0.75em;
  line-height: 0.0833333337em;
  vertical-align: 0.125em;
}

.fa-sm {
  font-size: 0.875em;
  line-height: 0.0714285718em;
  vertical-align: 0.0535714295em;
}

.fa-lg {
  font-size: 1.25em;
  line-height: 0.05em;
  vertical-align: -0.075em;
}

.fa-xl {
  font-size: 1.5em;
  line-height: 0.0416666682em;
  vertical-align: -0.125em;
}

.fa-2xl {
  font-size: 2em;
  line-height: 0.03125em;
  vertical-align: -0.1875em;
}

.fa-fw {
  text-align: center;
  width: 1.25em;
}

.fa-ul {
  list-style-type: none;
  margin-left: var(--fa-li-margin, 2.5em);
  padding-left: 0;
}
.fa-ul > li {
  position: relative;
}

.fa-li {
  left: calc(-1 * var(--fa-li-width, 2em));
  position: absolute;
  text-align: center;
  width: var(--fa-li-width, 2em);
  line-height: inherit;
}

.fa-border {
  border-color: var(--fa-border-color, #eee);
  border-radius: var(--fa-border-radius, 0.1em);
  border-style: var(--fa-border-style, solid);
  border-width: var(--fa-border-width, 0.08em);
  padding: var(--fa-border-padding, 0.2em 0.25em 0.15em);
}

.fa-pull-left {
  float: left;
  margin-right: var(--fa-pull-margin, 0.3em);
}

.fa-pull-right {
  float: right;
  margin-left: var(--fa-pull-margin, 0.3em);
}

.fa-beat {
  animation-name: fa-beat;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-bounce {
  animation-name: fa-bounce;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.28, 0.84, 0.42, 1));
}

.fa-fade {
  animation-name: fa-fade;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-beat-fade {
  animation-name: fa-beat-fade;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.4, 0, 0.6, 1));
}

.fa-flip {
  animation-name: fa-flip;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-shake {
  animation-name: fa-shake;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin {
  animation-name: fa-spin;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 2s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin-reverse {
  --fa-animation-direction: reverse;
}

.fa-pulse,
.fa-spin-pulse {
  animation-name: fa-spin;
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, steps(8));
}

@media (prefers-reduced-motion: reduce) {
  .fa-beat,
.fa-bounce,
.fa-fade,
.fa-beat-fade,
.fa-flip,
.fa-pulse,
.fa-shake,
.fa-spin,
.fa-spin-pulse {
    animation-delay: -1ms;
    animation-duration: 1ms;
    animation-iteration-count: 1;
    transition-delay: 0s;
    transition-duration: 0s;
  }
}
@keyframes fa-beat {
  0%, 90% {
    transform: scale(1);
  }
  45% {
    transform: scale(var(--fa-beat-scale, 1.25));
  }
}
@keyframes fa-bounce {
  0% {
    transform: scale(1, 1) translateY(0);
  }
  10% {
    transform: scale(var(--fa-bounce-start-scale-x, 1.1), var(--fa-bounce-start-scale-y, 0.9)) translateY(0);
  }
  30% {
    transform: scale(var(--fa-bounce-jump-scale-x, 0.9), var(--fa-bounce-jump-scale-y, 1.1)) translateY(var(--fa-bounce-height, -0.5em));
  }
  50% {
    transform: scale(var(--fa-bounce-land-scale-x, 1.05), var(--fa-bounce-land-scale-y, 0.95)) translateY(0);
  }
  57% {
    transform: scale(1, 1) translateY(var(--fa-bounce-rebound, -0.125em));
  }
  64% {
    transform: scale(1, 1) translateY(0);
  }
  100% {
    transform: scale(1, 1) translateY(0);
  }
}
@keyframes fa-fade {
  50% {
    opacity: var(--fa-fade-opacity, 0.4);
  }
}
@keyframes fa-beat-fade {
  0%, 100% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(var(--fa-beat-fade-scale, 1.125));
  }
}
@keyframes fa-flip {
  50% {
    transform: rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -180deg));
  }
}
@keyframes fa-shake {
  0% {
    transform: rotate(-15deg);
  }
  4% {
    transform: rotate(15deg);
  }
  8%, 24% {
    transform: rotate(-18deg);
  }
  12%, 28% {
    transform: rotate(18deg);
  }
  16% {
    transform: rotate(-22deg);
  }
  20% {
    transform: rotate(22deg);
  }
  32% {
    transform: rotate(-12deg);
  }
  36% {
    transform: rotate(12deg);
  }
  40%, 100% {
    transform: rotate(0deg);
  }
}
@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.fa-rotate-90 {
  transform: rotate(90deg);
}

.fa-rotate-180 {
  transform: rotate(180deg);
}

.fa-rotate-270 {
  transform: rotate(270deg);
}

.fa-flip-horizontal {
  transform: scale(-1, 1);
}

.fa-flip-vertical {
  transform: scale(1, -1);
}

.fa-flip-both,
.fa-flip-horizontal.fa-flip-vertical {
  transform: scale(-1, -1);
}

.fa-rotate-by {
  transform: rotate(var(--fa-rotate-angle, 0));
}

.fa-stack {
  display: inline-block;
  vertical-align: middle;
  height: 2em;
  position: relative;
  width: 2.5em;
}

.fa-stack-1x,
.fa-stack-2x {
  bottom: 0;
  left: 0;
  margin: auto;
  position: absolute;
  right: 0;
  top: 0;
  z-index: var(--fa-stack-z-index, auto);
}

.svg-inline--fa.fa-stack-1x {
  height: 1em;
  width: 1.25em;
}
.svg-inline--fa.fa-stack-2x {
  height: 2em;
  width: 2.5em;
}

.fa-inverse {
  color: var(--fa-inverse, #fff);
}

.sr-only,
.fa-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.sr-only-focusable:not(:focus),
.fa-sr-only-focusable:not(:focus) {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

.svg-inline--fa .fa-primary {
  fill: var(--fa-primary-color, currentColor);
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa .fa-secondary {
  fill: var(--fa-secondary-color, currentColor);
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-primary {
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-secondary {
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa mask .fa-primary,
.svg-inline--fa mask .fa-secondary {
  fill: black;
}

.fad.fa-inverse,
.fa-duotone.fa-inverse {
  color: var(--fa-inverse, #fff);
}`;
    function o0() {
        const t = Jc, e = e0, n = I.cssPrefix, i = I.replacementClass;
        let r = zh;
        if (n !== t || i !== e) {
            const s = new RegExp("\\.".concat(t, "\\-"), "g"), a = new RegExp("\\--".concat(t, "\\-"), "g"), o = new RegExp("\\.".concat(e), "g");
            r = r.replace(s, ".".concat(n, "-")).replace(a, "--".concat(n, "-")).replace(o, ".".concat(i));
        }
        return r;
    }
    let So = !1;
    function us() {
        I.autoAddCss && !So && (kh(o0()), So = !0);
    }
    var Dh = {
        mixout () {
            return {
                dom: {
                    css: o0,
                    insertCss: us
                }
            };
        },
        hooks () {
            return {
                beforeDOMElementCreation () {
                    us();
                },
                beforeI2svg () {
                    us();
                }
            };
        }
    };
    const xt = Vt || {};
    xt[gt] || (xt[gt] = {});
    xt[gt].styles || (xt[gt].styles = {});
    xt[gt].hooks || (xt[gt].hooks = {});
    xt[gt].shims || (xt[gt].shims = []);
    var ut = xt[gt];
    const l0 = [], c0 = function() {
        ie.removeEventListener("DOMContentLoaded", c0), Pr = 1, l0.map((t)=>t());
    };
    let Pr = !1;
    vt && (Pr = (ie.documentElement.doScroll ? /^loaded|^c/ : /^loaded|^i|^c/).test(ie.readyState), Pr || ie.addEventListener("DOMContentLoaded", c0));
    function Bh(t) {
        vt && (Pr ? setTimeout(t, 0) : l0.push(t));
    }
    function er(t) {
        const { tag: e, attributes: n = {}, children: i = [] } = t;
        return typeof t == "string" ? a0(t) : "<".concat(e, " ").concat(Ch(n), ">").concat(i.map(er).join(""), "</").concat(e, ">");
    }
    function Mo(t, e, n) {
        if (t && t[e] && t[e][n]) return {
            prefix: e,
            iconName: n,
            icon: t[e][n]
        };
    }
    var hs = function(e, n, i, r) {
        var s = Object.keys(e), a = s.length, o = n, l, c, u;
        for(i === void 0 ? (l = 1, u = e[s[0]]) : (l = 0, u = i); l < a; l++)c = s[l], u = o(u, e[c], c, e);
        return u;
    };
    function jh(t) {
        const e = [];
        let n = 0;
        const i = t.length;
        for(; n < i;){
            const r = t.charCodeAt(n++);
            if (r >= 55296 && r <= 56319 && n < i) {
                const s = t.charCodeAt(n++);
                (s & 64512) == 56320 ? e.push(((r & 1023) << 10) + (s & 1023) + 65536) : (e.push(r), n--);
            } else e.push(r);
        }
        return e;
    }
    function Ys(t) {
        const e = jh(t);
        return e.length === 1 ? e[0].toString(16) : null;
    }
    function Uh(t, e) {
        const n = t.length;
        let i = t.charCodeAt(e), r;
        return i >= 55296 && i <= 56319 && n > e + 1 && (r = t.charCodeAt(e + 1), r >= 56320 && r <= 57343) ? (i - 55296) * 1024 + r - 56320 + 65536 : i;
    }
    function Ao(t) {
        return Object.keys(t).reduce((e, n)=>{
            const i = t[n];
            return !!i.icon ? e[i.iconName] = i.icon : e[n] = i, e;
        }, {});
    }
    function Zs(t, e) {
        let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        const { skipHooks: i = !1 } = n, r = Ao(e);
        typeof ut.hooks.addPack == "function" && !i ? ut.hooks.addPack(t, Ao(e)) : ut.styles[t] = {
            ...ut.styles[t] || {},
            ...r
        }, t === "fas" && Zs("fa", e);
    }
    const { styles: tn, shims: Vh } = ut, Gh = {
        [ae]: Object.values(an[ae]),
        [ze]: Object.values(an[ze]),
        [De]: Object.values(an[De])
    };
    let Ba = null, u0 = {}, h0 = {}, d0 = {}, f0 = {}, p0 = {};
    const $h = {
        [ae]: Object.keys(sn[ae]),
        [ze]: Object.keys(sn[ze]),
        [De]: Object.keys(sn[De])
    };
    function Hh(t) {
        return ~Rh.indexOf(t);
    }
    function Wh(t, e) {
        const n = e.split("-"), i = n[0], r = n.slice(1).join("-");
        return i === t && r !== "" && !Hh(r) ? r : null;
    }
    const m0 = ()=>{
        const t = (i)=>hs(tn, (r, s, a)=>(r[a] = hs(s, i, {}), r), {});
        u0 = t((i, r, s)=>(r[3] && (i[r[3]] = s), r[2] && r[2].filter((o)=>typeof o == "number").forEach((o)=>{
                i[o.toString(16)] = s;
            }), i)), h0 = t((i, r, s)=>(i[s] = s, r[2] && r[2].filter((o)=>typeof o == "string").forEach((o)=>{
                i[o] = s;
            }), i)), p0 = t((i, r, s)=>{
            const a = r[2];
            return i[s] = s, a.forEach((o)=>{
                i[o] = s;
            }), i;
        });
        const e = "far" in tn || I.autoFetchSvg, n = hs(Vh, (i, r)=>{
            const s = r[0];
            let a = r[1];
            const o = r[2];
            return a === "far" && !e && (a = "fas"), typeof s == "string" && (i.names[s] = {
                prefix: a,
                iconName: o
            }), typeof s == "number" && (i.unicodes[s.toString(16)] = {
                prefix: a,
                iconName: o
            }), i;
        }, {
            names: {},
            unicodes: {}
        });
        d0 = n.names, f0 = n.unicodes, Ba = Vr(I.styleDefault, {
            family: I.familyDefault
        });
    };
    Ih((t)=>{
        Ba = Vr(t.styleDefault, {
            family: I.familyDefault
        });
    });
    m0();
    function ja(t, e) {
        return (u0[t] || {})[e];
    }
    function qh(t, e) {
        return (h0[t] || {})[e];
    }
    function zt(t, e) {
        return (p0[t] || {})[e];
    }
    function g0(t) {
        return d0[t] || {
            prefix: null,
            iconName: null
        };
    }
    function Xh(t) {
        const e = f0[t], n = ja("fas", t);
        return e || (n ? {
            prefix: "fas",
            iconName: n
        } : null) || {
            prefix: null,
            iconName: null
        };
    }
    function Gt() {
        return Ba;
    }
    const Ua = ()=>({
            prefix: null,
            iconName: null,
            rest: []
        });
    function Vr(t) {
        let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        const { family: n = ae } = e, i = sn[n][t], r = Ui[n][t] || Ui[n][i], s = t in ut.styles ? t : null;
        return r || s || null;
    }
    const Yh = {
        [ae]: Object.keys(an[ae]),
        [ze]: Object.keys(an[ze]),
        [De]: Object.keys(an[De])
    };
    function Gr(t) {
        let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        const { skipLookups: n = !1 } = e, i = {
            [ae]: "".concat(I.cssPrefix, "-").concat(ae),
            [ze]: "".concat(I.cssPrefix, "-").concat(ze),
            [De]: "".concat(I.cssPrefix, "-").concat(De)
        };
        let r = null, s = ae;
        const a = ih.filter((l)=>l !== Zc);
        a.forEach((l)=>{
            (t.includes(i[l]) || t.some((c)=>Yh[l].includes(c))) && (s = l);
        });
        const o = t.reduce((l, c)=>{
            const u = Wh(I.cssPrefix, c);
            if (tn[c] ? (c = Gh[s].includes(c) ? Eh[s][c] : c, r = c, l.prefix = c) : $h[s].indexOf(c) > -1 ? (r = c, l.prefix = Vr(c, {
                family: s
            })) : u ? l.iconName = u : c !== I.replacementClass && !a.some((d)=>c === i[d]) && l.rest.push(c), !n && l.prefix && l.iconName) {
                const d = r === "fa" ? g0(l.iconName) : {}, f = zt(l.prefix, l.iconName);
                d.prefix && (r = null), l.iconName = d.iconName || f || l.iconName, l.prefix = d.prefix || l.prefix, l.prefix === "far" && !tn.far && tn.fas && !I.autoFetchSvg && (l.prefix = "fas");
            }
            return l;
        }, Ua());
        return (t.includes("fa-brands") || t.includes("fab")) && (o.prefix = "fab"), (t.includes("fa-duotone") || t.includes("fad")) && (o.prefix = "fad"), !o.prefix && s === ze && (tn.fass || I.autoFetchSvg) && (o.prefix = "fass", o.iconName = zt(o.prefix, o.iconName) || o.iconName), !o.prefix && s === De && (tn.fasds || I.autoFetchSvg) && (o.prefix = "fasds", o.iconName = zt(o.prefix, o.iconName) || o.iconName), (o.prefix === "fa" || r === "fa") && (o.prefix = Gt() || "fas"), o;
    }
    class Zh {
        constructor(){
            this.definitions = {};
        }
        add() {
            for(var e = arguments.length, n = new Array(e), i = 0; i < e; i++)n[i] = arguments[i];
            const r = n.reduce(this._pullDefinitions, {});
            Object.keys(r).forEach((s)=>{
                this.definitions[s] = {
                    ...this.definitions[s] || {},
                    ...r[s]
                }, Zs(s, r[s]);
                const a = an[ae][s];
                a && Zs(a, r[s]), m0();
            });
        }
        reset() {
            this.definitions = {};
        }
        _pullDefinitions(e, n) {
            const i = n.prefix && n.iconName && n.icon ? {
                0: n
            } : n;
            return Object.keys(i).map((r)=>{
                const { prefix: s, iconName: a, icon: o } = i[r], l = o[2];
                e[s] || (e[s] = {}), l.length > 0 && l.forEach((c)=>{
                    typeof c == "string" && (e[s][c] = o);
                }), e[s][a] = o;
            }), e;
        }
    }
    let Ro = [], Wn = {};
    const Xn = {}, Qh = Object.keys(Xn);
    function Kh(t, e) {
        let { mixoutsTo: n } = e;
        return Ro = t, Wn = {}, Object.keys(Xn).forEach((i)=>{
            Qh.indexOf(i) === -1 && delete Xn[i];
        }), Ro.forEach((i)=>{
            const r = i.mixout ? i.mixout() : {};
            if (Object.keys(r).forEach((s)=>{
                typeof r[s] == "function" && (n[s] = r[s]), typeof r[s] == "object" && Object.keys(r[s]).forEach((a)=>{
                    n[s] || (n[s] = {}), n[s][a] = r[s][a];
                });
            }), i.hooks) {
                const s = i.hooks();
                Object.keys(s).forEach((a)=>{
                    Wn[a] || (Wn[a] = []), Wn[a].push(s[a]);
                });
            }
            i.provides && i.provides(Xn);
        }), n;
    }
    function Qs(t, e) {
        for(var n = arguments.length, i = new Array(n > 2 ? n - 2 : 0), r = 2; r < n; r++)i[r - 2] = arguments[r];
        return (Wn[t] || []).forEach((a)=>{
            e = a.apply(null, [
                e,
                ...i
            ]);
        }), e;
    }
    function fn(t) {
        for(var e = arguments.length, n = new Array(e > 1 ? e - 1 : 0), i = 1; i < e; i++)n[i - 1] = arguments[i];
        (Wn[t] || []).forEach((s)=>{
            s.apply(null, n);
        });
    }
    function $t() {
        const t = arguments[0], e = Array.prototype.slice.call(arguments, 1);
        return Xn[t] ? Xn[t].apply(null, e) : void 0;
    }
    function Ks(t) {
        t.prefix === "fa" && (t.prefix = "fas");
        let { iconName: e } = t;
        const n = t.prefix || Gt();
        if (e) return e = zt(n, e) || e, Mo(x0.definitions, n, e) || Mo(ut.styles, n, e);
    }
    const x0 = new Zh, Jh = ()=>{
        I.autoReplaceSvg = !1, I.observeMutations = !1, fn("noAuto");
    }, ed = {
        i2svg: function() {
            let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            return vt ? (fn("beforeI2svg", t), $t("pseudoElements2svg", t), $t("i2svg", t)) : Promise.reject(new Error("Operation requires a DOM of some kind."));
        },
        watch: function() {
            let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
            const { autoReplaceSvgRoot: e } = t;
            I.autoReplaceSvg === !1 && (I.autoReplaceSvg = !0), I.observeMutations = !0, Bh(()=>{
                nd({
                    autoReplaceSvgRoot: e
                }), fn("watch", t);
            });
        }
    }, td = {
        icon: (t)=>{
            if (t === null) return null;
            if (typeof t == "object" && t.prefix && t.iconName) return {
                prefix: t.prefix,
                iconName: zt(t.prefix, t.iconName) || t.iconName
            };
            if (Array.isArray(t) && t.length === 2) {
                const e = t[1].indexOf("fa-") === 0 ? t[1].slice(3) : t[1], n = Vr(t[0]);
                return {
                    prefix: n,
                    iconName: zt(n, e) || e
                };
            }
            if (typeof t == "string" && (t.indexOf("".concat(I.cssPrefix, "-")) > -1 || t.match(_h))) {
                const e = Gr(t.split(" "), {
                    skipLookups: !0
                });
                return {
                    prefix: e.prefix || Gt(),
                    iconName: zt(e.prefix, e.iconName) || e.iconName
                };
            }
            if (typeof t == "string") {
                const e = Gt();
                return {
                    prefix: e,
                    iconName: zt(e, t) || t
                };
            }
        }
    }, Be = {
        noAuto: Jh,
        config: I,
        dom: ed,
        parse: td,
        library: x0,
        findIconDefinition: Ks,
        toHtml: er
    }, nd = function() {
        let t = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
        const { autoReplaceSvgRoot: e = ie } = t;
        (Object.keys(ut.styles).length > 0 || I.autoFetchSvg) && vt && I.autoReplaceSvg && Be.dom.i2svg({
            node: e
        });
    };
    function $r(t, e) {
        return Object.defineProperty(t, "abstract", {
            get: e
        }), Object.defineProperty(t, "html", {
            get: function() {
                return t.abstract.map((n)=>er(n));
            }
        }), Object.defineProperty(t, "node", {
            get: function() {
                if (!vt) return;
                const n = ie.createElement("div");
                return n.innerHTML = t.html, n.children;
            }
        }), t;
    }
    function id(t) {
        let { children: e, main: n, mask: i, attributes: r, styles: s, transform: a } = t;
        if (Da(a) && n.found && !i.found) {
            const { width: o, height: l } = n, c = {
                x: o / l / 2,
                y: .5
            };
            r.style = Ur({
                ...s,
                "transform-origin": "".concat(c.x + a.x / 16, "em ").concat(c.y + a.y / 16, "em")
            });
        }
        return [
            {
                tag: "svg",
                attributes: r,
                children: e
            }
        ];
    }
    function rd(t) {
        let { prefix: e, iconName: n, children: i, attributes: r, symbol: s } = t;
        const a = s === !0 ? "".concat(e, "-").concat(I.cssPrefix, "-").concat(n) : s;
        return [
            {
                tag: "svg",
                attributes: {
                    style: "display: none;"
                },
                children: [
                    {
                        tag: "symbol",
                        attributes: {
                            ...r,
                            id: a
                        },
                        children: i
                    }
                ]
            }
        ];
    }
    function Va(t) {
        const { icons: { main: e, mask: n }, prefix: i, iconName: r, transform: s, symbol: a, title: o, maskId: l, titleId: c, extra: u, watchable: d = !1 } = t, { width: f, height: g } = n.found ? n : e, p = i === "fak", x = [
            I.replacementClass,
            r ? "".concat(I.cssPrefix, "-").concat(r) : ""
        ].filter((E)=>u.classes.indexOf(E) === -1).filter((E)=>E !== "" || !!E).concat(u.classes).join(" ");
        let y = {
            children: [],
            attributes: {
                ...u.attributes,
                "data-prefix": i,
                "data-icon": r,
                class: x,
                role: u.attributes.role || "img",
                xmlns: "http://www.w3.org/2000/svg",
                viewBox: "0 0 ".concat(f, " ").concat(g)
            }
        };
        const v = p && !~u.classes.indexOf("fa-fw") ? {
            width: "".concat(f / g * 16 * .0625, "em")
        } : {};
        d && (y.attributes[dn] = ""), o && (y.children.push({
            tag: "title",
            attributes: {
                id: y.attributes["aria-labelledby"] || "title-".concat(c || Vi())
            },
            children: [
                o
            ]
        }), delete y.attributes.title);
        const w = {
            ...y,
            prefix: i,
            iconName: r,
            main: e,
            mask: n,
            maskId: l,
            transform: s,
            symbol: a,
            styles: {
                ...v,
                ...u.styles
            }
        }, { children: T, attributes: S } = n.found && e.found ? $t("generateAbstractMask", w) || {
            children: [],
            attributes: {}
        } : $t("generateAbstractIcon", w) || {
            children: [],
            attributes: {}
        };
        return w.children = T, w.attributes = S, a ? rd(w) : id(w);
    }
    function Po(t) {
        const { content: e, width: n, height: i, transform: r, title: s, extra: a, watchable: o = !1 } = t, l = {
            ...a.attributes,
            ...s ? {
                title: s
            } : {},
            class: a.classes.join(" ")
        };
        o && (l[dn] = "");
        const c = {
            ...a.styles
        };
        Da(r) && (c.transform = Fh({
            transform: r,
            startCentered: !0,
            width: n,
            height: i
        }), c["-webkit-transform"] = c.transform);
        const u = Ur(c);
        u.length > 0 && (l.style = u);
        const d = [];
        return d.push({
            tag: "span",
            attributes: l,
            children: [
                e
            ]
        }), s && d.push({
            tag: "span",
            attributes: {
                class: "sr-only"
            },
            children: [
                s
            ]
        }), d;
    }
    function sd(t) {
        const { content: e, title: n, extra: i } = t, r = {
            ...i.attributes,
            ...n ? {
                title: n
            } : {},
            class: i.classes.join(" ")
        }, s = Ur(i.styles);
        s.length > 0 && (r.style = s);
        const a = [];
        return a.push({
            tag: "span",
            attributes: r,
            children: [
                e
            ]
        }), n && a.push({
            tag: "span",
            attributes: {
                class: "sr-only"
            },
            children: [
                n
            ]
        }), a;
    }
    const { styles: ds } = ut;
    function Js(t) {
        const e = t[0], n = t[1], [i] = t.slice(4);
        let r = null;
        return Array.isArray(i) ? r = {
            tag: "g",
            attributes: {
                class: "".concat(I.cssPrefix, "-").concat(cs.GROUP)
            },
            children: [
                {
                    tag: "path",
                    attributes: {
                        class: "".concat(I.cssPrefix, "-").concat(cs.SECONDARY),
                        fill: "currentColor",
                        d: i[0]
                    }
                },
                {
                    tag: "path",
                    attributes: {
                        class: "".concat(I.cssPrefix, "-").concat(cs.PRIMARY),
                        fill: "currentColor",
                        d: i[1]
                    }
                }
            ]
        } : r = {
            tag: "path",
            attributes: {
                fill: "currentColor",
                d: i
            }
        }, {
            found: !0,
            width: e,
            height: n,
            icon: r
        };
    }
    const ad = {
        found: !1,
        width: 512,
        height: 512
    };
    function od(t, e) {
        !t0 && !I.showMissingIcons && t && console.error('Icon with name "'.concat(t, '" and prefix "').concat(e, '" is missing.'));
    }
    function ea(t, e) {
        let n = e;
        return e === "fa" && I.styleDefault !== null && (e = Gt()), new Promise((i, r)=>{
            if (n === "fa") {
                const s = g0(t) || {};
                t = s.iconName || t, e = s.prefix || e;
            }
            if (t && e && ds[e] && ds[e][t]) {
                const s = ds[e][t];
                return i(Js(s));
            }
            od(t, e), i({
                ...ad,
                icon: I.showMissingIcons && t ? $t("missingIconAbstract") || {} : {}
            });
        });
    }
    const Oo = ()=>{}, ta = I.measurePerformance && sr && sr.mark && sr.measure ? sr : {
        mark: Oo,
        measure: Oo
    }, Pi = 'FA "6.6.0"', ld = (t)=>(ta.mark("".concat(Pi, " ").concat(t, " begins")), ()=>y0(t)), y0 = (t)=>{
        ta.mark("".concat(Pi, " ").concat(t, " ends")), ta.measure("".concat(Pi, " ").concat(t), "".concat(Pi, " ").concat(t, " begins"), "".concat(Pi, " ").concat(t, " ends"));
    };
    var Ga = {
        begin: ld,
        end: y0
    };
    const gr = ()=>{};
    function Io(t) {
        return typeof (t.getAttribute ? t.getAttribute(dn) : null) == "string";
    }
    function cd(t) {
        const e = t.getAttribute ? t.getAttribute(Na) : null, n = t.getAttribute ? t.getAttribute(Fa) : null;
        return e && n;
    }
    function ud(t) {
        return t && t.classList && t.classList.contains && t.classList.contains(I.replacementClass);
    }
    function hd() {
        return I.autoReplaceSvg === !0 ? xr.replace : xr[I.autoReplaceSvg] || xr.replace;
    }
    function dd(t) {
        return ie.createElementNS("http://www.w3.org/2000/svg", t);
    }
    function fd(t) {
        return ie.createElement(t);
    }
    function v0(t) {
        let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        const { ceFn: n = t.tag === "svg" ? dd : fd } = e;
        if (typeof t == "string") return ie.createTextNode(t);
        const i = n(t.tag);
        return Object.keys(t.attributes || []).forEach(function(s) {
            i.setAttribute(s, t.attributes[s]);
        }), (t.children || []).forEach(function(s) {
            i.appendChild(v0(s, {
                ceFn: n
            }));
        }), i;
    }
    function pd(t) {
        let e = " ".concat(t.outerHTML, " ");
        return e = "".concat(e, "Font Awesome fontawesome.com "), e;
    }
    const xr = {
        replace: function(t) {
            const e = t[0];
            if (e.parentNode) if (t[1].forEach((n)=>{
                e.parentNode.insertBefore(v0(n), e);
            }), e.getAttribute(dn) === null && I.keepOriginalSource) {
                let n = ie.createComment(pd(e));
                e.parentNode.replaceChild(n, e);
            } else e.remove();
        },
        nest: function(t) {
            const e = t[0], n = t[1];
            if (~za(e).indexOf(I.replacementClass)) return xr.replace(t);
            const i = new RegExp("".concat(I.cssPrefix, "-.*"));
            if (delete n[0].attributes.id, n[0].attributes.class) {
                const s = n[0].attributes.class.split(" ").reduce((a, o)=>(o === I.replacementClass || o.match(i) ? a.toSvg.push(o) : a.toNode.push(o), a), {
                    toNode: [],
                    toSvg: []
                });
                n[0].attributes.class = s.toSvg.join(" "), s.toNode.length === 0 ? e.removeAttribute("class") : e.setAttribute("class", s.toNode.join(" "));
            }
            const r = n.map((s)=>er(s)).join(`
`);
            e.setAttribute(dn, ""), e.innerHTML = r;
        }
    };
    function ko(t) {
        t();
    }
    function w0(t, e) {
        const n = typeof e == "function" ? e : gr;
        if (t.length === 0) n();
        else {
            let i = ko;
            I.mutateApproach === bh && (i = Vt.requestAnimationFrame || ko), i(()=>{
                const r = hd(), s = Ga.begin("mutate");
                t.map(r), s(), n();
            });
        }
    }
    let $a = !1;
    function b0() {
        $a = !0;
    }
    function na() {
        $a = !1;
    }
    let Or = null;
    function Lo(t) {
        if (!bo || !I.observeMutations) return;
        const { treeCallback: e = gr, nodeCallback: n = gr, pseudoElementsCallback: i = gr, observeMutationsRoot: r = ie } = t;
        Or = new bo((s)=>{
            if ($a) return;
            const a = Gt();
            ci(s).forEach((o)=>{
                if (o.type === "childList" && o.addedNodes.length > 0 && !Io(o.addedNodes[0]) && (I.searchPseudoElements && i(o.target), e(o.target)), o.type === "attributes" && o.target.parentNode && I.searchPseudoElements && i(o.target.parentNode), o.type === "attributes" && Io(o.target) && ~Ah.indexOf(o.attributeName)) if (o.attributeName === "class" && cd(o.target)) {
                    const { prefix: l, iconName: c } = Gr(za(o.target));
                    o.target.setAttribute(Na, l || a), c && o.target.setAttribute(Fa, c);
                } else ud(o.target) && n(o.target);
            });
        }), vt && Or.observe(r, {
            childList: !0,
            attributes: !0,
            characterData: !0,
            subtree: !0
        });
    }
    function md() {
        Or && Or.disconnect();
    }
    function gd(t) {
        const e = t.getAttribute("style");
        let n = [];
        return e && (n = e.split(";").reduce((i, r)=>{
            const s = r.split(":"), a = s[0], o = s.slice(1);
            return a && o.length > 0 && (i[a] = o.join(":").trim()), i;
        }, {})), n;
    }
    function xd(t) {
        const e = t.getAttribute("data-prefix"), n = t.getAttribute("data-icon"), i = t.innerText !== void 0 ? t.innerText.trim() : "";
        let r = Gr(za(t));
        return r.prefix || (r.prefix = Gt()), e && n && (r.prefix = e, r.iconName = n), r.iconName && r.prefix || (r.prefix && i.length > 0 && (r.iconName = qh(r.prefix, t.innerText) || ja(r.prefix, Ys(t.innerText))), !r.iconName && I.autoFetchSvg && t.firstChild && t.firstChild.nodeType === Node.TEXT_NODE && (r.iconName = t.firstChild.data)), r;
    }
    function yd(t) {
        const e = ci(t.attributes).reduce((r, s)=>(r.name !== "class" && r.name !== "style" && (r[s.name] = s.value), r), {}), n = t.getAttribute("title"), i = t.getAttribute("data-fa-title-id");
        return I.autoA11y && (n ? e["aria-labelledby"] = "".concat(I.replacementClass, "-title-").concat(i || Vi()) : (e["aria-hidden"] = "true", e.focusable = "false")), e;
    }
    function vd() {
        return {
            iconName: null,
            title: null,
            titleId: null,
            prefix: null,
            transform: ct,
            symbol: !1,
            mask: {
                iconName: null,
                prefix: null,
                rest: []
            },
            maskId: null,
            extra: {
                classes: [],
                styles: {},
                attributes: {}
            }
        };
    }
    function Co(t) {
        let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
            styleParser: !0
        };
        const { iconName: n, prefix: i, rest: r } = xd(t), s = yd(t), a = Qs("parseNodeAttributes", {}, t);
        let o = e.styleParser ? gd(t) : [];
        return {
            iconName: n,
            title: t.getAttribute("title"),
            titleId: t.getAttribute("data-fa-title-id"),
            prefix: i,
            transform: ct,
            mask: {
                iconName: null,
                prefix: null,
                rest: []
            },
            maskId: null,
            symbol: !1,
            extra: {
                classes: r,
                styles: o,
                attributes: s
            },
            ...a
        };
    }
    const { styles: wd } = ut;
    function T0(t) {
        const e = I.autoReplaceSvg === "nest" ? Co(t, {
            styleParser: !1
        }) : Co(t);
        return ~e.extra.classes.indexOf(r0) ? $t("generateLayersText", t, e) : $t("generateSvgReplacementMutation", t, e);
    }
    let ht = new Set;
    n0.map((t)=>{
        ht.add("fa-".concat(t));
    });
    Object.keys(sn[ae]).map(ht.add.bind(ht));
    Object.keys(sn[ze]).map(ht.add.bind(ht));
    Object.keys(sn[De]).map(ht.add.bind(ht));
    ht = [
        ...ht
    ];
    function No(t) {
        let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null;
        if (!vt) return Promise.resolve();
        const n = ie.documentElement.classList, i = (u)=>n.add("".concat(_o, "-").concat(u)), r = (u)=>n.remove("".concat(_o, "-").concat(u)), s = I.autoFetchSvg ? ht : n0.map((u)=>"fa-".concat(u)).concat(Object.keys(wd));
        s.includes("fa") || s.push("fa");
        const a = [
            ".".concat(r0, ":not([").concat(dn, "])")
        ].concat(s.map((u)=>".".concat(u, ":not([").concat(dn, "])"))).join(", ");
        if (a.length === 0) return Promise.resolve();
        let o = [];
        try {
            o = ci(t.querySelectorAll(a));
        } catch  {}
        if (o.length > 0) i("pending"), r("complete");
        else return Promise.resolve();
        const l = Ga.begin("onTree"), c = o.reduce((u, d)=>{
            try {
                const f = T0(d);
                f && u.push(f);
            } catch (f) {
                t0 || f.name === "MissingIcon" && console.error(f);
            }
            return u;
        }, []);
        return new Promise((u, d)=>{
            Promise.all(c).then((f)=>{
                w0(f, ()=>{
                    i("active"), i("complete"), r("pending"), typeof e == "function" && e(), l(), u();
                });
            }).catch((f)=>{
                l(), d(f);
            });
        });
    }
    function bd(t) {
        let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : null;
        T0(t).then((n)=>{
            n && w0([
                n
            ], e);
        });
    }
    function Td(t) {
        return function(e) {
            let n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
            const i = (e || {}).icon ? e : Ks(e || {});
            let { mask: r } = n;
            return r && (r = (r || {}).icon ? r : Ks(r || {})), t(i, {
                ...n,
                mask: r
            });
        };
    }
    const Ed = function(t) {
        let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
        const { transform: n = ct, symbol: i = !1, mask: r = null, maskId: s = null, title: a = null, titleId: o = null, classes: l = [], attributes: c = {}, styles: u = {} } = e;
        if (!t) return;
        const { prefix: d, iconName: f, icon: g } = t;
        return $r({
            type: "icon",
            ...t
        }, ()=>(fn("beforeDOMElementCreation", {
                iconDefinition: t,
                params: e
            }), I.autoA11y && (a ? c["aria-labelledby"] = "".concat(I.replacementClass, "-title-").concat(o || Vi()) : (c["aria-hidden"] = "true", c.focusable = "false")), Va({
                icons: {
                    main: Js(g),
                    mask: r ? Js(r.icon) : {
                        found: !1,
                        width: null,
                        height: null,
                        icon: {}
                    }
                },
                prefix: d,
                iconName: f,
                transform: {
                    ...ct,
                    ...n
                },
                symbol: i,
                title: a,
                maskId: s,
                titleId: o,
                extra: {
                    attributes: c,
                    styles: u,
                    classes: l
                }
            })));
    };
    var _d = {
        mixout () {
            return {
                icon: Td(Ed)
            };
        },
        hooks () {
            return {
                mutationObserverCallbacks (t) {
                    return t.treeCallback = No, t.nodeCallback = bd, t;
                }
            };
        },
        provides (t) {
            t.i2svg = function(e) {
                const { node: n = ie, callback: i = ()=>{} } = e;
                return No(n, i);
            }, t.generateSvgReplacementMutation = function(e, n) {
                const { iconName: i, title: r, titleId: s, prefix: a, transform: o, symbol: l, mask: c, maskId: u, extra: d } = n;
                return new Promise((f, g)=>{
                    Promise.all([
                        ea(i, a),
                        c.iconName ? ea(c.iconName, c.prefix) : Promise.resolve({
                            found: !1,
                            width: 512,
                            height: 512,
                            icon: {}
                        })
                    ]).then((p)=>{
                        let [x, y] = p;
                        f([
                            e,
                            Va({
                                icons: {
                                    main: x,
                                    mask: y
                                },
                                prefix: a,
                                iconName: i,
                                transform: o,
                                symbol: l,
                                maskId: u,
                                title: r,
                                titleId: s,
                                extra: d,
                                watchable: !0
                            })
                        ]);
                    }).catch(g);
                });
            }, t.generateAbstractIcon = function(e) {
                let { children: n, attributes: i, main: r, transform: s, styles: a } = e;
                const o = Ur(a);
                o.length > 0 && (i.style = o);
                let l;
                return Da(s) && (l = $t("generateAbstractTransformGrouping", {
                    main: r,
                    transform: s,
                    containerWidth: r.width,
                    iconWidth: r.width
                })), n.push(l || r.icon), {
                    children: n,
                    attributes: i
                };
            };
        }
    }, Sd = {
        mixout () {
            return {
                layer (t) {
                    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
                    const { classes: n = [] } = e;
                    return $r({
                        type: "layer"
                    }, ()=>{
                        fn("beforeDOMElementCreation", {
                            assembler: t,
                            params: e
                        });
                        let i = [];
                        return t((r)=>{
                            Array.isArray(r) ? r.map((s)=>{
                                i = i.concat(s.abstract);
                            }) : i = i.concat(r.abstract);
                        }), [
                            {
                                tag: "span",
                                attributes: {
                                    class: [
                                        "".concat(I.cssPrefix, "-layers"),
                                        ...n
                                    ].join(" ")
                                },
                                children: i
                            }
                        ];
                    });
                }
            };
        }
    }, Md = {
        mixout () {
            return {
                counter (t) {
                    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
                    const { title: n = null, classes: i = [], attributes: r = {}, styles: s = {} } = e;
                    return $r({
                        type: "counter",
                        content: t
                    }, ()=>(fn("beforeDOMElementCreation", {
                            content: t,
                            params: e
                        }), sd({
                            content: t.toString(),
                            title: n,
                            extra: {
                                attributes: r,
                                styles: s,
                                classes: [
                                    "".concat(I.cssPrefix, "-layers-counter"),
                                    ...i
                                ]
                            }
                        })));
                }
            };
        }
    }, Ad = {
        mixout () {
            return {
                text (t) {
                    let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
                    const { transform: n = ct, title: i = null, classes: r = [], attributes: s = {}, styles: a = {} } = e;
                    return $r({
                        type: "text",
                        content: t
                    }, ()=>(fn("beforeDOMElementCreation", {
                            content: t,
                            params: e
                        }), Po({
                            content: t,
                            transform: {
                                ...ct,
                                ...n
                            },
                            title: i,
                            extra: {
                                attributes: s,
                                styles: a,
                                classes: [
                                    "".concat(I.cssPrefix, "-layers-text"),
                                    ...r
                                ]
                            }
                        })));
                }
            };
        },
        provides (t) {
            t.generateLayersText = function(e, n) {
                const { title: i, transform: r, extra: s } = n;
                let a = null, o = null;
                if (Yc) {
                    const l = parseInt(getComputedStyle(e).fontSize, 10), c = e.getBoundingClientRect();
                    a = c.width / l, o = c.height / l;
                }
                return I.autoA11y && !i && (s.attributes["aria-hidden"] = "true"), Promise.resolve([
                    e,
                    Po({
                        content: e.innerHTML,
                        width: a,
                        height: o,
                        transform: r,
                        title: i,
                        extra: s,
                        watchable: !0
                    })
                ]);
            };
        }
    };
    const Rd = new RegExp('"', "ug"), Fo = [
        1105920,
        1112319
    ], zo = {
        FontAwesome: {
            normal: "fas",
            400: "fas"
        },
        ...ch,
        ...lh,
        ...xh
    }, ia = Object.keys(zo).reduce((t, e)=>(t[e.toLowerCase()] = zo[e], t), {}), Pd = Object.keys(ia).reduce((t, e)=>{
        const n = ia[e];
        return t[e] = n[900] || [
            ...Object.entries(n)
        ][0][1], t;
    }, {});
    function Od(t) {
        const e = t.replace(Rd, ""), n = Uh(e, 0), i = n >= Fo[0] && n <= Fo[1], r = e.length === 2 ? e[0] === e[1] : !1;
        return {
            value: Ys(r ? e[0] : e),
            isSecondary: i || r
        };
    }
    function Id(t, e) {
        const n = t.replace(/^['"]|['"]$/g, "").toLowerCase(), i = parseInt(e), r = isNaN(i) ? "normal" : i;
        return (ia[n] || {})[r] || Pd[n];
    }
    function Do(t, e) {
        const n = "".concat(wh).concat(e.replace(":", "-"));
        return new Promise((i, r)=>{
            if (t.getAttribute(n) !== null) return i();
            const a = ci(t.children).filter((f)=>f.getAttribute(Hs) === e)[0], o = Vt.getComputedStyle(t, e), l = o.getPropertyValue("font-family"), c = l.match(Sh), u = o.getPropertyValue("font-weight"), d = o.getPropertyValue("content");
            if (a && !c) return t.removeChild(a), i();
            if (c && d !== "none" && d !== "") {
                const f = o.getPropertyValue("content");
                let g = Id(l, u);
                const { value: p, isSecondary: x } = Od(f), y = c[0].startsWith("FontAwesome");
                let v = ja(g, p), w = v;
                if (y) {
                    const T = Xh(p);
                    T.iconName && T.prefix && (v = T.iconName, g = T.prefix);
                }
                if (v && !x && (!a || a.getAttribute(Na) !== g || a.getAttribute(Fa) !== w)) {
                    t.setAttribute(n, w), a && t.removeChild(a);
                    const T = vd(), { extra: S } = T;
                    S.attributes[Hs] = e, ea(v, g).then((E)=>{
                        const _ = Va({
                            ...T,
                            icons: {
                                main: E,
                                mask: Ua()
                            },
                            prefix: g,
                            iconName: w,
                            extra: S,
                            watchable: !0
                        }), k = ie.createElementNS("http://www.w3.org/2000/svg", "svg");
                        e === "::before" ? t.insertBefore(k, t.firstChild) : t.appendChild(k), k.outerHTML = _.map((N)=>er(N)).join(`
`), t.removeAttribute(n), i();
                    }).catch(r);
                } else i();
            } else i();
        });
    }
    function kd(t) {
        return Promise.all([
            Do(t, "::before"),
            Do(t, "::after")
        ]);
    }
    function Ld(t) {
        return t.parentNode !== document.head && !~Th.indexOf(t.tagName.toUpperCase()) && !t.getAttribute(Hs) && (!t.parentNode || t.parentNode.tagName !== "svg");
    }
    function Bo(t) {
        if (vt) return new Promise((e, n)=>{
            const i = ci(t.querySelectorAll("*")).filter(Ld).map(kd), r = Ga.begin("searchPseudoElements");
            b0(), Promise.all(i).then(()=>{
                r(), na(), e();
            }).catch(()=>{
                r(), na(), n();
            });
        });
    }
    var Cd = {
        hooks () {
            return {
                mutationObserverCallbacks (t) {
                    return t.pseudoElementsCallback = Bo, t;
                }
            };
        },
        provides (t) {
            t.pseudoElements2svg = function(e) {
                const { node: n = ie } = e;
                I.searchPseudoElements && Bo(n);
            };
        }
    };
    let jo = !1;
    var Nd = {
        mixout () {
            return {
                dom: {
                    unwatch () {
                        b0(), jo = !0;
                    }
                }
            };
        },
        hooks () {
            return {
                bootstrap () {
                    Lo(Qs("mutationObserverCallbacks", {}));
                },
                noAuto () {
                    md();
                },
                watch (t) {
                    const { observeMutationsRoot: e } = t;
                    jo ? na() : Lo(Qs("mutationObserverCallbacks", {
                        observeMutationsRoot: e
                    }));
                }
            };
        }
    };
    const Uo = (t)=>{
        let e = {
            size: 16,
            x: 0,
            y: 0,
            flipX: !1,
            flipY: !1,
            rotate: 0
        };
        return t.toLowerCase().split(" ").reduce((n, i)=>{
            const r = i.toLowerCase().split("-"), s = r[0];
            let a = r.slice(1).join("-");
            if (s && a === "h") return n.flipX = !0, n;
            if (s && a === "v") return n.flipY = !0, n;
            if (a = parseFloat(a), isNaN(a)) return n;
            switch(s){
                case "grow":
                    n.size = n.size + a;
                    break;
                case "shrink":
                    n.size = n.size - a;
                    break;
                case "left":
                    n.x = n.x - a;
                    break;
                case "right":
                    n.x = n.x + a;
                    break;
                case "up":
                    n.y = n.y - a;
                    break;
                case "down":
                    n.y = n.y + a;
                    break;
                case "rotate":
                    n.rotate = n.rotate + a;
                    break;
            }
            return n;
        }, e);
    };
    var Fd = {
        mixout () {
            return {
                parse: {
                    transform: (t)=>Uo(t)
                }
            };
        },
        hooks () {
            return {
                parseNodeAttributes (t, e) {
                    const n = e.getAttribute("data-fa-transform");
                    return n && (t.transform = Uo(n)), t;
                }
            };
        },
        provides (t) {
            t.generateAbstractTransformGrouping = function(e) {
                let { main: n, transform: i, containerWidth: r, iconWidth: s } = e;
                const a = {
                    transform: "translate(".concat(r / 2, " 256)")
                }, o = "translate(".concat(i.x * 32, ", ").concat(i.y * 32, ") "), l = "scale(".concat(i.size / 16 * (i.flipX ? -1 : 1), ", ").concat(i.size / 16 * (i.flipY ? -1 : 1), ") "), c = "rotate(".concat(i.rotate, " 0 0)"), u = {
                    transform: "".concat(o, " ").concat(l, " ").concat(c)
                }, d = {
                    transform: "translate(".concat(s / 2 * -1, " -256)")
                }, f = {
                    outer: a,
                    inner: u,
                    path: d
                };
                return {
                    tag: "g",
                    attributes: {
                        ...f.outer
                    },
                    children: [
                        {
                            tag: "g",
                            attributes: {
                                ...f.inner
                            },
                            children: [
                                {
                                    tag: n.icon.tag,
                                    children: n.icon.children,
                                    attributes: {
                                        ...n.icon.attributes,
                                        ...f.path
                                    }
                                }
                            ]
                        }
                    ]
                };
            };
        }
    };
    const fs = {
        x: 0,
        y: 0,
        width: "100%",
        height: "100%"
    };
    function Vo(t) {
        let e = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
        return t.attributes && (t.attributes.fill || e) && (t.attributes.fill = "black"), t;
    }
    function zd(t) {
        return t.tag === "g" ? t.children : [
            t
        ];
    }
    var Dd = {
        hooks () {
            return {
                parseNodeAttributes (t, e) {
                    const n = e.getAttribute("data-fa-mask"), i = n ? Gr(n.split(" ").map((r)=>r.trim())) : Ua();
                    return i.prefix || (i.prefix = Gt()), t.mask = i, t.maskId = e.getAttribute("data-fa-mask-id"), t;
                }
            };
        },
        provides (t) {
            t.generateAbstractMask = function(e) {
                let { children: n, attributes: i, main: r, mask: s, maskId: a, transform: o } = e;
                const { width: l, icon: c } = r, { width: u, icon: d } = s, f = Nh({
                    transform: o,
                    containerWidth: u,
                    iconWidth: l
                }), g = {
                    tag: "rect",
                    attributes: {
                        ...fs,
                        fill: "white"
                    }
                }, p = c.children ? {
                    children: c.children.map(Vo)
                } : {}, x = {
                    tag: "g",
                    attributes: {
                        ...f.inner
                    },
                    children: [
                        Vo({
                            tag: c.tag,
                            attributes: {
                                ...c.attributes,
                                ...f.path
                            },
                            ...p
                        })
                    ]
                }, y = {
                    tag: "g",
                    attributes: {
                        ...f.outer
                    },
                    children: [
                        x
                    ]
                }, v = "mask-".concat(a || Vi()), w = "clip-".concat(a || Vi()), T = {
                    tag: "mask",
                    attributes: {
                        ...fs,
                        id: v,
                        maskUnits: "userSpaceOnUse",
                        maskContentUnits: "userSpaceOnUse"
                    },
                    children: [
                        g,
                        y
                    ]
                }, S = {
                    tag: "defs",
                    children: [
                        {
                            tag: "clipPath",
                            attributes: {
                                id: w
                            },
                            children: zd(d)
                        },
                        T
                    ]
                };
                return n.push(S, {
                    tag: "rect",
                    attributes: {
                        fill: "currentColor",
                        "clip-path": "url(#".concat(w, ")"),
                        mask: "url(#".concat(v, ")"),
                        ...fs
                    }
                }), {
                    children: n,
                    attributes: i
                };
            };
        }
    }, Bd = {
        provides (t) {
            let e = !1;
            Vt.matchMedia && (e = Vt.matchMedia("(prefers-reduced-motion: reduce)").matches), t.missingIconAbstract = function() {
                const n = [], i = {
                    fill: "currentColor"
                }, r = {
                    attributeType: "XML",
                    repeatCount: "indefinite",
                    dur: "2s"
                };
                n.push({
                    tag: "path",
                    attributes: {
                        ...i,
                        d: "M156.5,447.7l-12.6,29.5c-18.7-9.5-35.9-21.2-51.5-34.9l22.7-22.7C127.6,430.5,141.5,440,156.5,447.7z M40.6,272H8.5 c1.4,21.2,5.4,41.7,11.7,61.1L50,321.2C45.1,305.5,41.8,289,40.6,272z M40.6,240c1.4-18.8,5.2-37,11.1-54.1l-29.5-12.6 C14.7,194.3,10,216.7,8.5,240H40.6z M64.3,156.5c7.8-14.9,17.2-28.8,28.1-41.5L69.7,92.3c-13.7,15.6-25.5,32.8-34.9,51.5 L64.3,156.5z M397,419.6c-13.9,12-29.4,22.3-46.1,30.4l11.9,29.8c20.7-9.9,39.8-22.6,56.9-37.6L397,419.6z M115,92.4 c13.9-12,29.4-22.3,46.1-30.4l-11.9-29.8c-20.7,9.9-39.8,22.6-56.8,37.6L115,92.4z M447.7,355.5c-7.8,14.9-17.2,28.8-28.1,41.5 l22.7,22.7c13.7-15.6,25.5-32.9,34.9-51.5L447.7,355.5z M471.4,272c-1.4,18.8-5.2,37-11.1,54.1l29.5,12.6 c7.5-21.1,12.2-43.5,13.6-66.8H471.4z M321.2,462c-15.7,5-32.2,8.2-49.2,9.4v32.1c21.2-1.4,41.7-5.4,61.1-11.7L321.2,462z M240,471.4c-18.8-1.4-37-5.2-54.1-11.1l-12.6,29.5c21.1,7.5,43.5,12.2,66.8,13.6V471.4z M462,190.8c5,15.7,8.2,32.2,9.4,49.2h32.1 c-1.4-21.2-5.4-41.7-11.7-61.1L462,190.8z M92.4,397c-12-13.9-22.3-29.4-30.4-46.1l-29.8,11.9c9.9,20.7,22.6,39.8,37.6,56.9 L92.4,397z M272,40.6c18.8,1.4,36.9,5.2,54.1,11.1l12.6-29.5C317.7,14.7,295.3,10,272,8.5V40.6z M190.8,50 c15.7-5,32.2-8.2,49.2-9.4V8.5c-21.2,1.4-41.7,5.4-61.1,11.7L190.8,50z M442.3,92.3L419.6,115c12,13.9,22.3,29.4,30.5,46.1 l29.8-11.9C470,128.5,457.3,109.4,442.3,92.3z M397,92.4l22.7-22.7c-15.6-13.7-32.8-25.5-51.5-34.9l-12.6,29.5 C370.4,72.1,384.4,81.5,397,92.4z"
                    }
                });
                const s = {
                    ...r,
                    attributeName: "opacity"
                }, a = {
                    tag: "circle",
                    attributes: {
                        ...i,
                        cx: "256",
                        cy: "364",
                        r: "28"
                    },
                    children: []
                };
                return e || a.children.push({
                    tag: "animate",
                    attributes: {
                        ...r,
                        attributeName: "r",
                        values: "28;14;28;28;14;28;"
                    }
                }, {
                    tag: "animate",
                    attributes: {
                        ...s,
                        values: "1;0;1;1;0;1;"
                    }
                }), n.push(a), n.push({
                    tag: "path",
                    attributes: {
                        ...i,
                        opacity: "1",
                        d: "M263.7,312h-16c-6.6,0-12-5.4-12-12c0-71,77.4-63.9,77.4-107.8c0-20-17.8-40.2-57.4-40.2c-29.1,0-44.3,9.6-59.2,28.7 c-3.9,5-11.1,6-16.2,2.4l-13.1-9.2c-5.6-3.9-6.9-11.8-2.6-17.2c21.2-27.2,46.4-44.7,91.2-44.7c52.3,0,97.4,29.8,97.4,80.2 c0,67.6-77.4,63.5-77.4,107.8C275.7,306.6,270.3,312,263.7,312z"
                    },
                    children: e ? [] : [
                        {
                            tag: "animate",
                            attributes: {
                                ...s,
                                values: "1;0;0;0;0;1;"
                            }
                        }
                    ]
                }), e || n.push({
                    tag: "path",
                    attributes: {
                        ...i,
                        opacity: "0",
                        d: "M232.5,134.5l7,168c0.3,6.4,5.6,11.5,12,11.5h9c6.4,0,11.7-5.1,12-11.5l7-168c0.3-6.8-5.2-12.5-12-12.5h-23 C237.7,122,232.2,127.7,232.5,134.5z"
                    },
                    children: [
                        {
                            tag: "animate",
                            attributes: {
                                ...s,
                                values: "0;0;1;1;0;0;"
                            }
                        }
                    ]
                }), {
                    tag: "g",
                    attributes: {
                        class: "missing"
                    },
                    children: n
                };
            };
        }
    }, jd = {
        hooks () {
            return {
                parseNodeAttributes (t, e) {
                    const n = e.getAttribute("data-fa-symbol"), i = n === null ? !1 : n === "" ? !0 : n;
                    return t.symbol = i, t;
                }
            };
        }
    }, Ud = [
        Dh,
        _d,
        Sd,
        Md,
        Ad,
        Cd,
        Nd,
        Fd,
        Dd,
        Bd,
        jd
    ];
    Kh(Ud, {
        mixoutsTo: Be
    });
    Be.noAuto;
    Be.config;
    Be.library;
    Be.dom;
    const ra = Be.parse;
    Be.findIconDefinition;
    Be.toHtml;
    const Vd = Be.icon;
    Be.layer;
    Be.text;
    Be.counter;
    function Go(t, e) {
        var n = Object.keys(t);
        if (Object.getOwnPropertySymbols) {
            var i = Object.getOwnPropertySymbols(t);
            e && (i = i.filter(function(r) {
                return Object.getOwnPropertyDescriptor(t, r).enumerable;
            })), n.push.apply(n, i);
        }
        return n;
    }
    function ot(t) {
        for(var e = 1; e < arguments.length; e++){
            var n = arguments[e] != null ? arguments[e] : {};
            e % 2 ? Go(Object(n), !0).forEach(function(i) {
                qn(t, i, n[i]);
            }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : Go(Object(n)).forEach(function(i) {
                Object.defineProperty(t, i, Object.getOwnPropertyDescriptor(n, i));
            });
        }
        return t;
    }
    function Ir(t) {
        "@babel/helpers - typeof";
        return Ir = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
            return typeof e;
        } : function(e) {
            return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
        }, Ir(t);
    }
    function qn(t, e, n) {
        return e in t ? Object.defineProperty(t, e, {
            value: n,
            enumerable: !0,
            configurable: !0,
            writable: !0
        }) : t[e] = n, t;
    }
    function Gd(t, e) {
        if (t == null) return {};
        var n = {}, i = Object.keys(t), r, s;
        for(s = 0; s < i.length; s++)r = i[s], !(e.indexOf(r) >= 0) && (n[r] = t[r]);
        return n;
    }
    function $d(t, e) {
        if (t == null) return {};
        var n = Gd(t, e), i, r;
        if (Object.getOwnPropertySymbols) {
            var s = Object.getOwnPropertySymbols(t);
            for(r = 0; r < s.length; r++)i = s[r], !(e.indexOf(i) >= 0) && Object.prototype.propertyIsEnumerable.call(t, i) && (n[i] = t[i]);
        }
        return n;
    }
    function sa(t) {
        return Hd(t) || Wd(t) || qd(t) || Xd();
    }
    function Hd(t) {
        if (Array.isArray(t)) return aa(t);
    }
    function Wd(t) {
        if (typeof Symbol < "u" && t[Symbol.iterator] != null || t["@@iterator"] != null) return Array.from(t);
    }
    function qd(t, e) {
        if (t) {
            if (typeof t == "string") return aa(t, e);
            var n = Object.prototype.toString.call(t).slice(8, -1);
            if (n === "Object" && t.constructor && (n = t.constructor.name), n === "Map" || n === "Set") return Array.from(t);
            if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return aa(t, e);
        }
    }
    function aa(t, e) {
        (e == null || e > t.length) && (e = t.length);
        for(var n = 0, i = new Array(e); n < e; n++)i[n] = t[n];
        return i;
    }
    function Xd() {
        throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`);
    }
    function Yd(t) {
        var e, n = t.beat, i = t.fade, r = t.beatFade, s = t.bounce, a = t.shake, o = t.flash, l = t.spin, c = t.spinPulse, u = t.spinReverse, d = t.pulse, f = t.fixedWidth, g = t.inverse, p = t.border, x = t.listItem, y = t.flip, v = t.size, w = t.rotation, T = t.pull, S = (e = {
            "fa-beat": n,
            "fa-fade": i,
            "fa-beat-fade": r,
            "fa-bounce": s,
            "fa-shake": a,
            "fa-flash": o,
            "fa-spin": l,
            "fa-spin-reverse": u,
            "fa-spin-pulse": c,
            "fa-pulse": d,
            "fa-fw": f,
            "fa-inverse": g,
            "fa-border": p,
            "fa-li": x,
            "fa-flip": y === !0,
            "fa-flip-horizontal": y === "horizontal" || y === "both",
            "fa-flip-vertical": y === "vertical" || y === "both"
        }, qn(e, "fa-".concat(v), typeof v < "u" && v !== null), qn(e, "fa-rotate-".concat(w), typeof w < "u" && w !== null && w !== 0), qn(e, "fa-pull-".concat(T), typeof T < "u" && T !== null), qn(e, "fa-swap-opacity", t.swapOpacity), e);
        return Object.keys(S).map(function(E) {
            return S[E] ? E : null;
        }).filter(function(E) {
            return E;
        });
    }
    function Zd(t) {
        return t = t - 0, t === t;
    }
    function E0(t) {
        return Zd(t) ? t : (t = t.replace(/[\-_\s]+(.)?/g, function(e, n) {
            return n ? n.toUpperCase() : "";
        }), t.substr(0, 1).toLowerCase() + t.substr(1));
    }
    var Qd = [
        "style"
    ];
    function Kd(t) {
        return t.charAt(0).toUpperCase() + t.slice(1);
    }
    function Jd(t) {
        return t.split(";").map(function(e) {
            return e.trim();
        }).filter(function(e) {
            return e;
        }).reduce(function(e, n) {
            var i = n.indexOf(":"), r = E0(n.slice(0, i)), s = n.slice(i + 1).trim();
            return r.startsWith("webkit") ? e[Kd(r)] = s : e[r] = s, e;
        }, {});
    }
    function _0(t, e) {
        var n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
        if (typeof e == "string") return e;
        var i = (e.children || []).map(function(l) {
            return _0(t, l);
        }), r = Object.keys(e.attributes || {}).reduce(function(l, c) {
            var u = e.attributes[c];
            switch(c){
                case "class":
                    l.attrs.className = u, delete e.attributes.class;
                    break;
                case "style":
                    l.attrs.style = Jd(u);
                    break;
                default:
                    c.indexOf("aria-") === 0 || c.indexOf("data-") === 0 ? l.attrs[c.toLowerCase()] = u : l.attrs[E0(c)] = u;
            }
            return l;
        }, {
            attrs: {}
        }), s = n.style, a = s === void 0 ? {} : s, o = $d(n, Qd);
        return r.attrs.style = ot(ot({}, r.attrs.style), a), t.apply(void 0, [
            e.tag,
            ot(ot({}, r.attrs), o)
        ].concat(sa(i)));
    }
    var S0 = !1;
    try {
        S0 = !0;
    } catch  {}
    function ef() {
        if (!S0 && console && typeof console.error == "function") {
            var t;
            (t = console).error.apply(t, arguments);
        }
    }
    function $o(t) {
        if (t && Ir(t) === "object" && t.prefix && t.iconName && t.icon) return t;
        if (ra.icon) return ra.icon(t);
        if (t === null) return null;
        if (t && Ir(t) === "object" && t.prefix && t.iconName) return t;
        if (Array.isArray(t) && t.length === 2) return {
            prefix: t[0],
            iconName: t[1]
        };
        if (typeof t == "string") return {
            prefix: "fas",
            iconName: t
        };
    }
    function ps(t, e) {
        return Array.isArray(e) && e.length > 0 || !Array.isArray(e) && e ? qn({}, t, e) : {};
    }
    var Ho = {
        border: !1,
        className: "",
        mask: null,
        maskId: null,
        fixedWidth: !1,
        inverse: !1,
        flip: !1,
        icon: null,
        listItem: !1,
        pull: null,
        pulse: !1,
        rotation: null,
        size: null,
        spin: !1,
        spinPulse: !1,
        spinReverse: !1,
        beat: !1,
        fade: !1,
        beatFade: !1,
        bounce: !1,
        shake: !1,
        symbol: !1,
        title: "",
        titleId: null,
        transform: null,
        swapOpacity: !1
    }, tr = se.forwardRef(function(t, e) {
        var n = ot(ot({}, Ho), t), i = n.icon, r = n.mask, s = n.symbol, a = n.className, o = n.title, l = n.titleId, c = n.maskId, u = $o(i), d = ps("classes", [].concat(sa(Yd(n)), sa((a || "").split(" ")))), f = ps("transform", typeof n.transform == "string" ? ra.transform(n.transform) : n.transform), g = ps("mask", $o(r)), p = Vd(u, ot(ot(ot(ot({}, d), f), g), {}, {
            symbol: s,
            title: o,
            titleId: l,
            maskId: c
        }));
        if (!p) return ef("Could not find icon", u), null;
        var x = p.abstract, y = {
            ref: e
        };
        return Object.keys(n).forEach(function(v) {
            Ho.hasOwnProperty(v) || (y[v] = n[v]);
        }), tf(x[0], y);
    });
    tr.displayName = "FontAwesomeIcon";
    tr.propTypes = {
        beat: U.bool,
        border: U.bool,
        beatFade: U.bool,
        bounce: U.bool,
        className: U.string,
        fade: U.bool,
        flash: U.bool,
        mask: U.oneOfType([
            U.object,
            U.array,
            U.string
        ]),
        maskId: U.string,
        fixedWidth: U.bool,
        inverse: U.bool,
        flip: U.oneOf([
            !0,
            !1,
            "horizontal",
            "vertical",
            "both"
        ]),
        icon: U.oneOfType([
            U.object,
            U.array,
            U.string
        ]),
        listItem: U.bool,
        pull: U.oneOf([
            "right",
            "left"
        ]),
        pulse: U.bool,
        rotation: U.oneOf([
            0,
            90,
            180,
            270
        ]),
        shake: U.bool,
        size: U.oneOf([
            "2xs",
            "xs",
            "sm",
            "lg",
            "xl",
            "2xl",
            "1x",
            "2x",
            "3x",
            "4x",
            "5x",
            "6x",
            "7x",
            "8x",
            "9x",
            "10x"
        ]),
        spin: U.bool,
        spinPulse: U.bool,
        spinReverse: U.bool,
        symbol: U.oneOfType([
            U.bool,
            U.string
        ]),
        title: U.string,
        titleId: U.string,
        transform: U.oneOfType([
            U.string,
            U.object
        ]),
        swapOpacity: U.bool
    };
    var tf = _0.bind(null, se.createElement), ne = "-ms-", Fi = "-moz-", W = "-webkit-", M0 = "comm", Hr = "rule", Ha = "decl", nf = "@import", rf = "@namespace", A0 = "@keyframes", sf = "@layer", R0 = Math.abs, Wa = String.fromCharCode, oa = Object.assign;
    function af(t, e) {
        return me(t, 0) ^ 45 ? (((e << 2 ^ me(t, 0)) << 2 ^ me(t, 1)) << 2 ^ me(t, 2)) << 2 ^ me(t, 3) : 0;
    }
    function P0(t) {
        return t.trim();
    }
    function ft(t, e) {
        return (t = e.exec(t)) ? t[0] : t;
    }
    function F(t, e, n) {
        return t.replace(e, n);
    }
    function yr(t, e, n) {
        return t.indexOf(e, n);
    }
    function me(t, e) {
        return t.charCodeAt(e) | 0;
    }
    function pn(t, e, n) {
        return t.slice(e, n);
    }
    function Ze(t) {
        return t.length;
    }
    function O0(t) {
        return t.length;
    }
    function Oi(t, e) {
        return e.push(t), t;
    }
    function of(t, e) {
        return t.map(e).join("");
    }
    function Wo(t, e) {
        return t.filter(function(n) {
            return !ft(n, e);
        });
    }
    var Wr = 1, ti = 1, I0 = 0, We = 0, de = 0, ui = "";
    function qr(t, e, n, i, r, s, a, o) {
        return {
            value: t,
            root: e,
            parent: n,
            type: i,
            props: r,
            children: s,
            line: Wr,
            column: ti,
            length: a,
            return: "",
            siblings: o
        };
    }
    function Ot(t, e) {
        return oa(qr("", null, null, "", null, null, 0, t.siblings), t, {
            length: -t.length
        }, e);
    }
    function wn(t) {
        for(; t.root;)t = Ot(t.root, {
            children: [
                t
            ]
        });
        Oi(t, t.siblings);
    }
    function lf() {
        return de;
    }
    function cf() {
        return de = We > 0 ? me(ui, --We) : 0, ti--, de === 10 && (ti = 1, Wr--), de;
    }
    function et() {
        return de = We < I0 ? me(ui, We++) : 0, ti++, de === 10 && (ti = 1, Wr++), de;
    }
    function Dt() {
        return me(ui, We);
    }
    function vr() {
        return We;
    }
    function Xr(t, e) {
        return pn(ui, t, e);
    }
    function Gi(t) {
        switch(t){
            case 0:
            case 9:
            case 10:
            case 13:
            case 32:
                return 5;
            case 33:
            case 43:
            case 44:
            case 47:
            case 62:
            case 64:
            case 126:
            case 59:
            case 123:
            case 125:
                return 4;
            case 58:
                return 3;
            case 34:
            case 39:
            case 40:
            case 91:
                return 2;
            case 41:
            case 93:
                return 1;
        }
        return 0;
    }
    function uf(t) {
        return Wr = ti = 1, I0 = Ze(ui = t), We = 0, [];
    }
    function hf(t) {
        return ui = "", t;
    }
    function ms(t) {
        return P0(Xr(We - 1, la(t === 91 ? t + 2 : t === 40 ? t + 1 : t)));
    }
    function df(t) {
        for(; (de = Dt()) && de < 33;)et();
        return Gi(t) > 2 || Gi(de) > 3 ? "" : " ";
    }
    function ff(t, e) {
        for(; --e && et() && !(de < 48 || de > 102 || de > 57 && de < 65 || de > 70 && de < 97););
        return Xr(t, vr() + (e < 6 && Dt() == 32 && et() == 32));
    }
    function la(t) {
        for(; et();)switch(de){
            case t:
                return We;
            case 34:
            case 39:
                t !== 34 && t !== 39 && la(de);
                break;
            case 40:
                t === 41 && la(t);
                break;
            case 92:
                et();
                break;
        }
        return We;
    }
    function pf(t, e) {
        for(; et() && t + de !== 57;)if (t + de === 84 && Dt() === 47) break;
        return "/*" + Xr(e, We - 1) + "*" + Wa(t === 47 ? t : et());
    }
    function mf(t) {
        for(; !Gi(Dt());)et();
        return Xr(t, We);
    }
    function gf(t) {
        return hf(wr("", null, null, null, [
            ""
        ], t = uf(t), 0, [
            0
        ], t));
    }
    function wr(t, e, n, i, r, s, a, o, l) {
        for(var c = 0, u = 0, d = a, f = 0, g = 0, p = 0, x = 1, y = 1, v = 1, w = 0, T = "", S = r, E = s, _ = i, k = T; y;)switch(p = w, w = et()){
            case 40:
                if (p != 108 && me(k, d - 1) == 58) {
                    yr(k += F(ms(w), "&", "&\f"), "&\f", R0(c ? o[c - 1] : 0)) != -1 && (v = -1);
                    break;
                }
            case 34:
            case 39:
            case 91:
                k += ms(w);
                break;
            case 9:
            case 10:
            case 13:
            case 32:
                k += df(p);
                break;
            case 92:
                k += ff(vr() - 1, 7);
                continue;
            case 47:
                switch(Dt()){
                    case 42:
                    case 47:
                        Oi(xf(pf(et(), vr()), e, n, l), l), (Gi(p || 1) == 5 || Gi(Dt() || 1) == 5) && Ze(k) && pn(k, -1, void 0) !== " " && (k += " ");
                        break;
                    default:
                        k += "/";
                }
                break;
            case 123 * x:
                o[c++] = Ze(k) * v;
            case 125 * x:
            case 59:
            case 0:
                switch(w){
                    case 0:
                    case 125:
                        y = 0;
                    case 59 + u:
                        v == -1 && (k = F(k, /\f/g, "")), g > 0 && (Ze(k) - d || x === 0 && p === 47) && Oi(g > 32 ? Xo(k + ";", i, n, d - 1, l) : Xo(F(k, " ", "") + ";", i, n, d - 2, l), l);
                        break;
                    case 59:
                        k += ";";
                    default:
                        if (Oi(_ = qo(k, e, n, c, u, r, o, T, S = [], E = [], d, s), s), w === 123) if (u === 0) wr(k, e, _, _, S, s, d, o, E);
                        else {
                            switch(f){
                                case 99:
                                    if (me(k, 3) === 110) break;
                                case 108:
                                    if (me(k, 2) === 97) break;
                                default:
                                    u = 0;
                                case 100:
                                case 109:
                                case 115:
                            }
                            u ? wr(t, _, _, i && Oi(qo(t, _, _, 0, 0, r, o, T, r, S = [], d, E), E), r, E, d, o, i ? S : E) : wr(k, _, _, _, [
                                ""
                            ], E, 0, o, E);
                        }
                }
                c = u = g = 0, x = v = 1, T = k = "", d = a;
                break;
            case 58:
                d = 1 + Ze(k), g = p;
            default:
                if (x < 1) {
                    if (w == 123) --x;
                    else if (w == 125 && x++ == 0 && cf() == 125) continue;
                }
                switch(k += Wa(w), w * x){
                    case 38:
                        v = u > 0 ? 1 : (k += "\f", -1);
                        break;
                    case 44:
                        o[c++] = (Ze(k) - 1) * v, v = 1;
                        break;
                    case 64:
                        Dt() === 45 && (k += ms(et())), f = Dt(), u = d = Ze(T = k += mf(vr())), w++;
                        break;
                    case 45:
                        p === 45 && Ze(k) == 2 && (x = 0);
                }
        }
        return s;
    }
    function qo(t, e, n, i, r, s, a, o, l, c, u, d) {
        for(var f = r - 1, g = r === 0 ? s : [
            ""
        ], p = O0(g), x = 0, y = 0, v = 0; x < i; ++x)for(var w = 0, T = pn(t, f + 1, f = R0(y = a[x])), S = t; w < p; ++w)(S = P0(y > 0 ? g[w] + " " + T : F(T, /&\f/g, g[w]))) && (l[v++] = S);
        return qr(t, e, n, r === 0 ? Hr : o, l, c, u, d);
    }
    function xf(t, e, n, i) {
        return qr(t, e, n, M0, Wa(lf()), pn(t, 2, -2), 0, i);
    }
    function Xo(t, e, n, i, r) {
        return qr(t, e, n, Ha, pn(t, 0, i), pn(t, i + 1, -1), i, r);
    }
    function k0(t, e, n) {
        switch(af(t, e)){
            case 5103:
                return W + "print-" + t + t;
            case 5737:
            case 4201:
            case 3177:
            case 3433:
            case 1641:
            case 4457:
            case 2921:
            case 5572:
            case 6356:
            case 5844:
            case 3191:
            case 6645:
            case 3005:
            case 4215:
            case 6389:
            case 5109:
            case 5365:
            case 5621:
            case 3829:
            case 6391:
            case 5879:
            case 5623:
            case 6135:
            case 4599:
                return W + t + t;
            case 4855:
                return W + t.replace("add", "source-over").replace("substract", "source-out").replace("intersect", "source-in").replace("exclude", "xor") + t;
            case 4789:
                return Fi + t + t;
            case 5349:
            case 4246:
            case 4810:
            case 6968:
            case 2756:
                return W + t + Fi + t + ne + t + t;
            case 5936:
                switch(me(t, e + 11)){
                    case 114:
                        return W + t + ne + F(t, /[svh]\w+-[tblr]{2}/, "tb") + t;
                    case 108:
                        return W + t + ne + F(t, /[svh]\w+-[tblr]{2}/, "tb-rl") + t;
                    case 45:
                        return W + t + ne + F(t, /[svh]\w+-[tblr]{2}/, "lr") + t;
                }
            case 6828:
            case 4268:
            case 2903:
                return W + t + ne + t + t;
            case 6165:
                return W + t + ne + "flex-" + t + t;
            case 5187:
                return W + t + F(t, /(\w+).+(:[^]+)/, W + "box-$1$2" + ne + "flex-$1$2") + t;
            case 5443:
                return W + t + ne + "flex-item-" + F(t, /flex-|-self/g, "") + (ft(t, /flex-|baseline/) ? "" : ne + "grid-row-" + F(t, /flex-|-self/g, "")) + t;
            case 4675:
                return W + t + ne + "flex-line-pack" + F(t, /align-content|flex-|-self/g, "") + t;
            case 5548:
                return W + t + ne + F(t, "shrink", "negative") + t;
            case 5292:
                return W + t + ne + F(t, "basis", "preferred-size") + t;
            case 6060:
                return W + "box-" + F(t, "-grow", "") + W + t + ne + F(t, "grow", "positive") + t;
            case 4554:
                return W + F(t, /([^-])(transform)/g, "$1" + W + "$2") + t;
            case 6187:
                return F(F(F(t, /(zoom-|grab)/, W + "$1"), /(image-set)/, W + "$1"), t, "") + t;
            case 5495:
            case 3959:
                return F(t, /(image-set\([^]*)/, W + "$1$`$1");
            case 4968:
                return F(F(t, /(.+:)(flex-)?(.*)/, W + "box-pack:$3" + ne + "flex-pack:$3"), /space-between/, "justify") + W + t + t;
            case 4200:
                if (!ft(t, /flex-|baseline/)) return ne + "grid-column-align" + pn(t, e) + t;
                break;
            case 2592:
            case 3360:
                return ne + F(t, "template-", "") + t;
            case 4384:
            case 3616:
                return n && n.some(function(i, r) {
                    return e = r, ft(i.props, /grid-\w+-end/);
                }) ? ~yr(t + (n = n[e].value), "span", 0) ? t : ne + F(t, "-start", "") + t + ne + "grid-row-span:" + (~yr(n, "span", 0) ? ft(n, /\d+/) : +ft(n, /\d+/) - +ft(t, /\d+/)) + ";" : ne + F(t, "-start", "") + t;
            case 4896:
            case 4128:
                return n && n.some(function(i) {
                    return ft(i.props, /grid-\w+-start/);
                }) ? t : ne + F(F(t, "-end", "-span"), "span ", "") + t;
            case 4095:
            case 3583:
            case 4068:
            case 2532:
                return F(t, /(.+)-inline(.+)/, W + "$1$2") + t;
            case 8116:
            case 7059:
            case 5753:
            case 5535:
            case 5445:
            case 5701:
            case 4933:
            case 4677:
            case 5533:
            case 5789:
            case 5021:
            case 4765:
                if (Ze(t) - 1 - e > 6) switch(me(t, e + 1)){
                    case 109:
                        if (me(t, e + 4) !== 45) break;
                    case 102:
                        return F(t, /(.+:)(.+)-([^]+)/, "$1" + W + "$2-$3$1" + Fi + (me(t, e + 3) == 108 ? "$3" : "$2-$3")) + t;
                    case 115:
                        return ~yr(t, "stretch", 0) ? k0(F(t, "stretch", "fill-available"), e, n) + t : t;
                }
                break;
            case 5152:
            case 5920:
                return F(t, /(.+?):(\d+)(\s*\/\s*(span)?\s*(\d+))?(.*)/, function(i, r, s, a, o, l, c) {
                    return ne + r + ":" + s + c + (a ? ne + r + "-span:" + (o ? l : +l - +s) + c : "") + t;
                });
            case 4949:
                if (me(t, e + 6) === 121) return F(t, ":", ":" + W) + t;
                break;
            case 6444:
                switch(me(t, me(t, 14) === 45 ? 18 : 11)){
                    case 120:
                        return F(t, /(.+:)([^;\s!]+)(;|(\s+)?!.+)?/, "$1" + W + (me(t, 14) === 45 ? "inline-" : "") + "box$3$1" + W + "$2$3$1" + ne + "$2box$3") + t;
                    case 100:
                        return F(t, ":", ":" + ne) + t;
                }
                break;
            case 5719:
            case 2647:
            case 2135:
            case 3927:
            case 2391:
                return F(t, "scroll-", "scroll-snap-") + t;
        }
        return t;
    }
    function kr(t, e) {
        for(var n = "", i = 0; i < t.length; i++)n += e(t[i], i, t, e) || "";
        return n;
    }
    function yf(t, e, n, i) {
        switch(t.type){
            case sf:
                if (t.children.length) break;
            case nf:
            case rf:
            case Ha:
                return t.return = t.return || t.value;
            case M0:
                return "";
            case A0:
                return t.return = t.value + "{" + kr(t.children, i) + "}";
            case Hr:
                if (!Ze(t.value = t.props.join(","))) return "";
        }
        return Ze(n = kr(t.children, i)) ? t.return = t.value + "{" + n + "}" : "";
    }
    function vf(t) {
        var e = O0(t);
        return function(n, i, r, s) {
            for(var a = "", o = 0; o < e; o++)a += t[o](n, i, r, s) || "";
            return a;
        };
    }
    function wf(t) {
        return function(e) {
            e.root || (e = e.return) && t(e);
        };
    }
    function bf(t, e, n, i) {
        if (t.length > -1 && !t.return) switch(t.type){
            case Ha:
                t.return = k0(t.value, t.length, n);
                return;
            case A0:
                return kr([
                    Ot(t, {
                        value: F(t.value, "@", "@" + W)
                    })
                ], i);
            case Hr:
                if (t.length) return of(n = t.props, function(r) {
                    switch(ft(r, i = /(::plac\w+|:read-\w+)/)){
                        case ":read-only":
                        case ":read-write":
                            wn(Ot(t, {
                                props: [
                                    F(r, /:(read-\w+)/, ":" + Fi + "$1")
                                ]
                            })), wn(Ot(t, {
                                props: [
                                    r
                                ]
                            })), oa(t, {
                                props: Wo(n, i)
                            });
                            break;
                        case "::placeholder":
                            wn(Ot(t, {
                                props: [
                                    F(r, /:(plac\w+)/, ":" + W + "input-$1")
                                ]
                            })), wn(Ot(t, {
                                props: [
                                    F(r, /:(plac\w+)/, ":" + Fi + "$1")
                                ]
                            })), wn(Ot(t, {
                                props: [
                                    F(r, /:(plac\w+)/, ne + "input-$1")
                                ]
                            })), wn(Ot(t, {
                                props: [
                                    r
                                ]
                            })), oa(t, {
                                props: Wo(n, i)
                            });
                            break;
                    }
                    return "";
                });
        }
    }
    var Yn = {}, gs, xs;
    const ni = typeof process < "u" && Yn !== void 0 && (Yn.REACT_APP_SC_ATTR || Yn.SC_ATTR) || "data-styled", L0 = "active", C0 = "data-styled-version", Yr = "6.4.1", qa = `/*!sc*/
`, zi = typeof window < "u" && typeof document < "u";
    function Yo(t) {
        if (typeof process < "u" && Yn !== void 0) {
            const e = Yn[t];
            if (e !== void 0 && e !== "") return e !== "false";
        }
    }
    const Tf = !!(typeof SC_DISABLE_SPEEDY == "boolean" ? SC_DISABLE_SPEEDY : (xs = (gs = Yo("REACT_APP_SC_DISABLE_SPEEDY")) !== null && gs !== void 0 ? gs : Yo("SC_DISABLE_SPEEDY")) !== null && xs !== void 0 ? xs : typeof process > "u" || Yn === void 0), Ef = "sc-keyframes-";
    function Zr(t, ...e) {
        return new Error(`An error occurred. See https://github.com/styled-components/styled-components/blob/main/packages/styled-components/src/utils/errors.md#${t} for more information.${e.length > 0 ? ` Args: ${e.join(", ")}` : ""}`);
    }
    let br = new Map, Lr = new Map, Tr = 1;
    const ar = (t)=>{
        if (br.has(t)) return br.get(t);
        for(; Lr.has(Tr);)Tr++;
        const e = Tr++;
        return br.set(t, e), Lr.set(e, t), e;
    }, _f = (t)=>Lr.get(t), Sf = (t, e)=>{
        Tr = e + 1, br.set(t, e), Lr.set(e, t);
    }, Xa = Object.freeze([]), ii = Object.freeze({});
    function Mf(t, e, n = ii) {
        return t.theme !== n.theme && t.theme || e || n.theme;
    }
    const Af = /[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~-]+/g, Rf = /(^-|-$)/g;
    function N0(t) {
        return t.replace(Af, "-").replace(Rf, "");
    }
    const Pf = /(a)(d)/gi, Zo = (t)=>String.fromCharCode(t + (t > 25 ? 39 : 97));
    function F0(t) {
        let e, n = "";
        for(e = Math.abs(t); e > 52; e = e / 52 | 0)n = Zo(e % 52) + n;
        return (Zo(e % 52) + n).replace(Pf, "$1-$2");
    }
    const ca = 5381, on = (t, e)=>{
        let n = e.length;
        for(; n;)t = 33 * t ^ e.charCodeAt(--n);
        return t;
    }, z0 = (t)=>on(ca, t);
    function Of(t) {
        return F0(z0(t) >>> 0);
    }
    function If(t) {
        return t.displayName || t.name || "Component";
    }
    function ua(t) {
        return typeof t == "string" && !0;
    }
    function kf(t) {
        return ua(t) ? `styled.${t}` : `Styled(${If(t)})`;
    }
    const D0 = Symbol.for("react.memo"), Lf = Symbol.for("react.forward_ref"), Cf = {
        contextType: !0,
        defaultProps: !0,
        displayName: !0,
        getDerivedStateFromError: !0,
        getDerivedStateFromProps: !0,
        propTypes: !0,
        type: !0
    }, Nf = {
        name: !0,
        length: !0,
        prototype: !0,
        caller: !0,
        callee: !0,
        arguments: !0,
        arity: !0
    }, B0 = {
        $$typeof: !0,
        compare: !0,
        defaultProps: !0,
        displayName: !0,
        propTypes: !0,
        type: !0
    }, Ff = {
        [Lf]: {
            $$typeof: !0,
            render: !0,
            defaultProps: !0,
            displayName: !0,
            propTypes: !0
        },
        [D0]: B0
    };
    function Qo(t) {
        return ("type" in (e = t) && e.type.$$typeof) === D0 ? B0 : "$$typeof" in t ? Ff[t.$$typeof] : Cf;
        var e;
    }
    const zf = Object.defineProperty, Df = Object.getOwnPropertyNames, Bf = Object.getOwnPropertySymbols, jf = Object.getOwnPropertyDescriptor, Uf = Object.getPrototypeOf, Vf = Object.prototype;
    function j0(t, e, n) {
        if (typeof e != "string") {
            const i = Uf(e);
            i && i !== Vf && j0(t, i, n);
            const r = Df(e).concat(Bf(e)), s = Qo(t), a = Qo(e);
            for(let o = 0; o < r.length; ++o){
                const l = r[o];
                if (!(l in Nf || n && n[l] || a && l in a || s && l in s)) {
                    const c = jf(e, l);
                    try {
                        zf(t, l, c);
                    } catch  {}
                }
            }
        }
        return t;
    }
    function Qr(t) {
        return typeof t == "function";
    }
    function U0(t) {
        return typeof t == "object" && "styledComponentId" in t;
    }
    function Ii(t, e) {
        return t && e ? t + " " + e : t || e || "";
    }
    function Ko(t, e) {
        return t.join("");
    }
    function $i(t) {
        return t !== null && typeof t == "object" && t.constructor.name === Object.name && !("props" in t && t.$$typeof);
    }
    function ha(t, e, n = !1) {
        if (!n && !$i(t) && !Array.isArray(t)) return e;
        if (Array.isArray(e)) for(let i = 0; i < e.length; i++)t[i] = ha(t[i], e[i]);
        else if ($i(e)) for(const i in e)t[i] = ha(t[i], e[i]);
        return t;
    }
    function V0(t, e) {
        Object.defineProperty(t, "toString", {
            value: e
        });
    }
    const Gf = class {
        constructor(t){
            this.groupSizes = new Uint32Array(512), this.length = 512, this.tag = t, this._cGroup = 0, this._cIndex = 0;
        }
        indexOfGroup(t) {
            if (t === this._cGroup) return this._cIndex;
            let e = this._cIndex;
            if (t > this._cGroup) for(let n = this._cGroup; n < t; n++)e += this.groupSizes[n];
            else for(let n = this._cGroup - 1; n >= t; n--)e -= this.groupSizes[n];
            return this._cGroup = t, this._cIndex = e, e;
        }
        insertRules(t, e) {
            if (t >= this.groupSizes.length) {
                const r = this.groupSizes, s = r.length;
                let a = s;
                for(; t >= a;)if (a <<= 1, a < 0) throw Zr(16, `${t}`);
                this.groupSizes = new Uint32Array(a), this.groupSizes.set(r), this.length = a;
                for(let o = s; o < a; o++)this.groupSizes[o] = 0;
            }
            let n = this.indexOfGroup(t + 1), i = 0;
            for(let r = 0, s = e.length; r < s; r++)this.tag.insertRule(n, e[r]) && (this.groupSizes[t]++, n++, i++);
            i > 0 && this._cGroup > t && (this._cIndex += i);
        }
        clearGroup(t) {
            if (t < this.length) {
                const e = this.groupSizes[t], n = this.indexOfGroup(t), i = n + e;
                this.groupSizes[t] = 0;
                for(let r = n; r < i; r++)this.tag.deleteRule(n);
                e > 0 && this._cGroup > t && (this._cIndex -= e);
            }
        }
        getGroup(t) {
            let e = "";
            if (t >= this.length || this.groupSizes[t] === 0) return e;
            const n = this.groupSizes[t], i = this.indexOfGroup(t), r = i + n;
            for(let s = i; s < r; s++)e += this.tag.getRule(s) + qa;
            return e;
        }
    }, $f = `style[${ni}][${C0}="${Yr}"]`, Hf = new RegExp(`^${ni}\\.g(\\d+)\\[id="([\\w\\d-]+)"\\].*?"([^"]*)`), Jo = (t)=>typeof ShadowRoot < "u" && t instanceof ShadowRoot || "host" in t && t.nodeType === 11, da = (t)=>{
        if (!t) return document;
        if (Jo(t)) return t;
        if ("getRootNode" in t) {
            const e = t.getRootNode();
            if (Jo(e)) return e;
        }
        return document;
    }, Wf = (t, e, n)=>{
        const i = n.split(",");
        let r;
        for(let s = 0, a = i.length; s < a; s++)(r = i[s]) && t.registerName(e, r);
    }, qf = (t, e)=>{
        var n;
        const i = ((n = e.textContent) !== null && n !== void 0 ? n : "").split(qa), r = [];
        for(let s = 0, a = i.length; s < a; s++){
            const o = i[s].trim();
            if (!o) continue;
            const l = o.match(Hf);
            if (l) {
                const c = 0 | parseInt(l[1], 10), u = l[2];
                c !== 0 && (Sf(u, c), Wf(t, u, l[3]), t.getTag().insertRules(c, r)), r.length = 0;
            } else r.push(o);
        }
    }, ys = (t)=>{
        const e = da(t.options.target).querySelectorAll($f);
        for(let n = 0, i = e.length; n < i; n++){
            const r = e[n];
            r && r.getAttribute(ni) !== L0 && (qf(t, r), r.parentNode && r.parentNode.removeChild(r));
        }
    };
    let mi = !1;
    function Xf() {
        if (mi !== !1) return mi;
        if (typeof document < "u") {
            const t = document.head.querySelector('meta[property="csp-nonce"]');
            if (t) return mi = t.nonce || t.getAttribute("content") || void 0;
            const e = document.head.querySelector('meta[name="sc-nonce"]');
            if (e) return mi = e.getAttribute("content") || void 0;
        }
        return mi = typeof __webpack_nonce__ < "u" ? __webpack_nonce__ : void 0;
    }
    const G0 = (t, e)=>{
        const n = document.head, i = t || n, r = document.createElement("style"), s = ((l)=>{
            const c = Array.from(l.querySelectorAll(`style[${ni}]`));
            return c[c.length - 1];
        })(i), a = s !== void 0 ? s.nextSibling : null;
        r.setAttribute(ni, L0), r.setAttribute(C0, Yr);
        const o = e || Xf();
        return o && r.setAttribute("nonce", o), i.insertBefore(r, a), r;
    }, Yf = class {
        constructor(t, e){
            this.element = G0(t, e), this.element.appendChild(document.createTextNode("")), this.sheet = ((n)=>{
                var i;
                if (n.sheet) return n.sheet;
                const r = (i = n.getRootNode().styleSheets) !== null && i !== void 0 ? i : document.styleSheets;
                for(let s = 0, a = r.length; s < a; s++){
                    const o = r[s];
                    if (o.ownerNode === n) return o;
                }
                throw Zr(17);
            })(this.element), this.length = 0;
        }
        insertRule(t, e) {
            try {
                return this.sheet.insertRule(e, t), this.length++, !0;
            } catch  {
                return !1;
            }
        }
        deleteRule(t) {
            this.sheet.deleteRule(t), this.length--;
        }
        getRule(t) {
            const e = this.sheet.cssRules[t];
            return e && e.cssText ? e.cssText : "";
        }
    }, Zf = class {
        constructor(t, e){
            this.element = G0(t, e), this.nodes = this.element.childNodes, this.length = 0;
        }
        insertRule(t, e) {
            if (t <= this.length && t >= 0) {
                const n = document.createTextNode(e);
                return this.element.insertBefore(n, this.nodes[t] || null), this.length++, !0;
            }
            return !1;
        }
        deleteRule(t) {
            this.element.removeChild(this.nodes[t]), this.length--;
        }
        getRule(t) {
            return t < this.length ? this.nodes[t].textContent : "";
        }
    };
    let el = zi;
    const Qf = {
        isServer: !zi,
        useCSSOMInjection: !Tf
    };
    class Kr {
        static registerId(e) {
            return ar(e);
        }
        constructor(e = ii, n = {}, i){
            this.options = Object.assign(Object.assign({}, Qf), e), this.gs = n, this.keyframeIds = new Set, this.names = new Map(i), this.server = !!e.isServer, !this.server && zi && el && (el = !1, ys(this)), V0(this, ()=>((r)=>{
                    const s = r.getTag(), { length: a } = s;
                    let o = "";
                    for(let l = 0; l < a; l++){
                        const c = _f(l);
                        if (c === void 0) continue;
                        const u = r.names.get(c);
                        if (u === void 0 || !u.size) continue;
                        const d = s.getGroup(l);
                        if (d.length === 0) continue;
                        const f = ni + ".g" + l + '[id="' + c + '"]';
                        let g = "";
                        for (const p of u)p.length > 0 && (g += p + ",");
                        o += d + f + '{content:"' + g + '"}' + qa;
                    }
                    return o;
                })(this));
        }
        rehydrate() {
            !this.server && zi && ys(this);
        }
        reconstructWithOptions(e, n = !0) {
            const i = new Kr(Object.assign(Object.assign({}, this.options), e), this.gs, n && this.names || void 0);
            return i.keyframeIds = new Set(this.keyframeIds), !this.server && zi && e.target !== this.options.target && da(this.options.target) !== da(e.target) && ys(i), i;
        }
        allocateGSInstance(e) {
            return this.gs[e] = (this.gs[e] || 0) + 1;
        }
        getTag() {
            return this.tag || (this.tag = (e = (({ useCSSOMInjection: n, target: i, nonce: r })=>n ? new Yf(i, r) : new Zf(i, r))(this.options), new Gf(e)));
            var e;
        }
        hasNameForId(e, n) {
            var i, r;
            return (r = (i = this.names.get(e)) === null || i === void 0 ? void 0 : i.has(n)) !== null && r !== void 0 && r;
        }
        registerName(e, n) {
            ar(e), e.startsWith(Ef) && this.keyframeIds.add(e);
            const i = this.names.get(e);
            i ? i.add(n) : this.names.set(e, new Set([
                n
            ]));
        }
        insertRules(e, n, i) {
            this.registerName(e, n), this.getTag().insertRules(ar(e), i);
        }
        clearNames(e) {
            this.names.has(e) && this.names.get(e).clear();
        }
        clearRules(e) {
            this.getTag().clearGroup(ar(e)), this.clearNames(e);
        }
        clearTag() {
            this.tag = void 0;
        }
    }
    const $0 = new WeakSet, Kf = {
        animationIterationCount: 1,
        aspectRatio: 1,
        borderImageOutset: 1,
        borderImageSlice: 1,
        borderImageWidth: 1,
        columnCount: 1,
        columns: 1,
        flex: 1,
        flexGrow: 1,
        flexShrink: 1,
        gridRow: 1,
        gridRowEnd: 1,
        gridRowSpan: 1,
        gridRowStart: 1,
        gridColumn: 1,
        gridColumnEnd: 1,
        gridColumnSpan: 1,
        gridColumnStart: 1,
        fontWeight: 1,
        lineHeight: 1,
        opacity: 1,
        order: 1,
        orphans: 1,
        scale: 1,
        tabSize: 1,
        widows: 1,
        zIndex: 1,
        zoom: 1,
        WebkitLineClamp: 1,
        fillOpacity: 1,
        floodOpacity: 1,
        stopOpacity: 1,
        strokeDasharray: 1,
        strokeDashoffset: 1,
        strokeMiterlimit: 1,
        strokeOpacity: 1,
        strokeWidth: 1
    };
    function Jf(t, e) {
        return e == null || typeof e == "boolean" || e === "" ? "" : typeof e != "number" || e === 0 || t in Kf || t.startsWith("--") ? String(e).trim() : e + "px";
    }
    const nn = 47;
    function tl(t) {
        if (t.charCodeAt(0) === 45 && t.charCodeAt(1) === 45) return t;
        let e = "";
        for(let n = 0; n < t.length; n++){
            const i = t.charCodeAt(n);
            e += i >= 65 && i <= 90 ? "-" + String.fromCharCode(i + 32) : t[n];
        }
        return e.startsWith("ms-") ? "-" + e : e;
    }
    const e1 = Symbol.for("sc-keyframes");
    function t1(t) {
        return typeof t == "object" && t !== null && e1 in t;
    }
    function H0(t) {
        return Qr(t) && !(t.prototype && t.prototype.isReactComponent);
    }
    const W0 = (t)=>t == null || t === !1 || t === "", n1 = Symbol.for("react.client.reference");
    function nl(t) {
        return t.$$typeof === n1;
    }
    function q0(t, e) {
        for(const n in t){
            const i = t[n];
            t.hasOwnProperty(n) && !W0(i) && (Array.isArray(i) && $0.has(i) || Qr(i) ? e.push(tl(n) + ":", i, ";") : $i(i) ? (e.push(n + " {"), q0(i, e), e.push("}")) : e.push(tl(n) + ": " + Jf(n, i) + ";"));
        }
    }
    function ln(t, e, n, i, r = []) {
        if (W0(t)) return r;
        const s = typeof t;
        if (s === "string") return r.push(t), r;
        if (s === "function") {
            if (nl(t)) return r;
            if (H0(t) && e) {
                const a = t(e);
                return ln(a, e, n, i, r);
            }
            return r.push(t), r;
        }
        if (Array.isArray(t)) {
            for(let a = 0; a < t.length; a++)ln(t[a], e, n, i, r);
            return r;
        }
        return U0(t) ? (r.push(`.${t.styledComponentId}`), r) : t1(t) ? (n ? (t.inject(n, i), r.push(t.getName(i))) : r.push(t), r) : nl(t) ? r : $i(t) ? (q0(t, r), r) : (r.push(t.toString()), r);
    }
    const i1 = z0(Yr);
    class r1 {
        constructor(e, n, i){
            this.rules = e, this.componentId = n, this.baseHash = on(i1, n), this.baseStyle = i, Kr.registerId(n);
        }
        generateAndInjectStyles(e, n, i) {
            let r = this.baseStyle ? this.baseStyle.generateAndInjectStyles(e, n, i) : "";
            {
                let s = "";
                for(let a = 0; a < this.rules.length; a++){
                    const o = this.rules[a];
                    if (typeof o == "string") s += o;
                    else if (o) if (H0(o)) {
                        const l = o(e);
                        typeof l == "string" ? s += l : l != null && l !== !1 && (s += Ko(ln(l, e, n, i)));
                    } else s += Ko(ln(o, e, n, i));
                }
                if (s) {
                    this.dynamicNameCache || (this.dynamicNameCache = new Map);
                    const a = i.hash ? i.hash + s : s;
                    let o = this.dynamicNameCache.get(a);
                    if (!o) {
                        if (o = F0(on(on(this.baseHash, i.hash), s) >>> 0), this.dynamicNameCache.size >= 200) {
                            const l = this.dynamicNameCache.keys().next().value;
                            l !== void 0 && this.dynamicNameCache.delete(l);
                        }
                        this.dynamicNameCache.set(a, o);
                    }
                    if (!n.hasNameForId(this.componentId, o)) {
                        const l = i(s, "." + o, void 0, this.componentId);
                        n.insertRules(this.componentId, o, l);
                    }
                    r = Ii(r, o);
                }
            }
            return r;
        }
    }
    const s1 = /&/g;
    function X0(t, e) {
        let n = 0;
        for(; --e >= 0 && t.charCodeAt(e) === 92;)n++;
        return !(1 & ~n);
    }
    function vs(t) {
        const e = t.length;
        let n = "", i = 0, r = 0, s = 0, a = !1, o = !1;
        for(let l = 0; l < e; l++){
            const c = t.charCodeAt(l);
            if (s !== 0 || a || c !== nn || t.charCodeAt(l + 1) !== 42) if (a) c === 42 && t.charCodeAt(l + 1) === nn && (a = !1, l++);
            else if (c !== 34 && c !== 39 || X0(t, l)) {
                if (s === 0) if (c === 123) r++;
                else if (c === 125) {
                    if (r--, r < 0) {
                        o = !0;
                        let u = l + 1;
                        for(; u < e;){
                            const d = t.charCodeAt(u);
                            if (d === 59 || d === 10) break;
                            u++;
                        }
                        u < e && t.charCodeAt(u) === 59 && u++, r = 0, l = u - 1, i = u;
                        continue;
                    }
                    r === 0 && (n += t.substring(i, l + 1), i = l + 1);
                } else c === 59 && r === 0 && (n += t.substring(i, l + 1), i = l + 1);
            } else s === 0 ? s = c : s === c && (s = 0);
            else a = !0, l++;
        }
        return o || r !== 0 || s !== 0 ? (i < e && r === 0 && s === 0 && (n += t.substring(i)), n) : t;
    }
    function Y0(t, e) {
        const n = e + " ", i = "," + n;
        for(let r = 0; r < t.length; r++){
            const s = t[r];
            if (s.type === "rule") {
                s.value = (n + s.value).replaceAll(",", i);
                const a = s.props, o = [];
                for(let l = 0; l < a.length; l++)o[l] = n + a[l];
                s.props = o;
            }
            Array.isArray(s.children) && s.type !== "@keyframes" && Y0(s.children, e);
        }
        return t;
    }
    function Z0({ options: t = ii, plugins: e = Xa } = ii) {
        let n, i, r;
        const s = (f, g, p)=>p.startsWith(i) && p.endsWith(i) && p.replaceAll(i, "").length > 0 ? `.${n}` : f, a = e.slice();
        a.push((f)=>{
            f.type === Hr && f.value.includes("&") && (r || (r = new RegExp(`\\${i}\\b`, "g")), f.props[0] = f.props[0].replace(s1, i).replace(r, s));
        }), t.prefix && a.push(bf), a.push(yf);
        let o = [];
        const l = vf(a.concat(wf((f)=>o.push(f)))), c = (f, g = "", p = "", x = "&")=>{
            n = x, i = g, r = void 0;
            const y = (function(w) {
                const T = w.indexOf("//") !== -1, S = w.indexOf("}") !== -1;
                if (!T && !S) return w;
                if (!T) return vs(w);
                const E = w.length;
                let _ = "", k = 0, N = 0, te = 0, ue = 0, ee = 0, q = !1;
                for(; N < E;){
                    const C = w.charCodeAt(N);
                    if (C !== 34 && C !== 39 || X0(w, N)) if (te === 0) if (C === nn && N + 1 < E && w.charCodeAt(N + 1) === 42) {
                        for(N += 2; N + 1 < E && (w.charCodeAt(N) !== 42 || w.charCodeAt(N + 1) !== nn);)N++;
                        N += 2;
                    } else if (C !== 40) if (C !== 41) if (ue > 0) N++;
                    else if (C === 42 && N + 1 < E && w.charCodeAt(N + 1) === nn) _ += w.substring(k, N), N += 2, k = N, q = !0;
                    else if (C === nn && N + 1 < E && w.charCodeAt(N + 1) === nn) {
                        for(_ += w.substring(k, N); N < E && w.charCodeAt(N) !== 10;)N++;
                        k = N, q = !0;
                    } else C === 123 ? ee++ : C === 125 && ee--, N++;
                    else ue > 0 && ue--, N++;
                    else ue++, N++;
                    else N++;
                    else te === 0 ? te = C : te === C && (te = 0), N++;
                }
                return q ? (k < E && (_ += w.substring(k)), ee === 0 ? _ : vs(_)) : ee === 0 ? w : vs(w);
            })(f);
            let v = gf(p || g ? p + " " + g + " { " + y + " }" : y);
            return t.namespace && (v = Y0(v, t.namespace)), o = [], kr(v, l), o;
        }, u = t;
        let d = ca;
        for(let f = 0; f < e.length; f++)e[f].name || Zr(15), d = on(d, e[f].name);
        return u?.namespace && (d = on(d, u.namespace)), u?.prefix && (d = on(d, "p")), c.hash = d !== ca ? d.toString() : "", c;
    }
    const a1 = new Kr, o1 = Z0(), Ya = se.createContext({
        shouldForwardProp: void 0,
        styleSheet: a1,
        stylis: o1,
        stylisPlugins: void 0
    });
    Ya.Consumer;
    function Q0() {
        return se.useContext(Ya);
    }
    function K0(t) {
        var e;
        const n = Q0(), { styleSheet: i } = n, r = se.useMemo(()=>{
            let c = i;
            return t.sheet ? c = t.sheet : t.target ? c = c.reconstructWithOptions(t.nonce !== void 0 ? {
                target: t.target,
                nonce: t.nonce
            } : {
                target: t.target
            }, !1) : t.nonce !== void 0 && (c = c.reconstructWithOptions({
                nonce: t.nonce
            })), t.disableCSSOMInjection && (c = c.reconstructWithOptions({
                useCSSOMInjection: !1
            })), c;
        }, [
            t.disableCSSOMInjection,
            t.nonce,
            t.sheet,
            t.target,
            i
        ]), s = se.useMemo(()=>{
            var c;
            return t.stylisPlugins === void 0 && t.namespace === void 0 && t.enableVendorPrefixes === void 0 ? n.stylis : Z0({
                options: {
                    namespace: t.namespace,
                    prefix: t.enableVendorPrefixes
                },
                plugins: (c = t.stylisPlugins) !== null && c !== void 0 ? c : n.stylisPlugins
            });
        }, [
            t.enableVendorPrefixes,
            t.namespace,
            t.stylisPlugins,
            n.stylis,
            n.stylisPlugins
        ]), a = "shouldForwardProp" in t ? t.shouldForwardProp : n.shouldForwardProp, o = (e = t.stylisPlugins) !== null && e !== void 0 ? e : n.stylisPlugins, l = se.useMemo(()=>({
                shouldForwardProp: a,
                styleSheet: r,
                stylis: s,
                stylisPlugins: o
            }), [
            a,
            r,
            s,
            o
        ]);
        return se.createElement(Ya.Provider, {
            value: l
        }, t.children);
    }
    const J0 = se.createContext(void 0);
    J0.Consumer;
    const il = Object.prototype.hasOwnProperty, ws = {};
    function l1(t, e) {
        const n = typeof t != "string" ? "sc" : N0(t);
        ws[n] = (ws[n] || 0) + 1;
        const i = n + "-" + Of(Yr + n + ws[n]);
        return e ? e + "-" + i : i;
    }
    function c1(t, e, n) {
        const i = U0(t), r = t, s = !ua(t), { attrs: a = Xa, componentId: o = l1(e.displayName, e.parentComponentId), displayName: l = kf(t) } = e, c = e.displayName && e.componentId ? N0(e.displayName) + "-" + e.componentId : e.componentId || o, u = i && r.attrs ? r.attrs.concat(a).filter(Boolean) : a;
        let { shouldForwardProp: d } = e;
        if (i && r.shouldForwardProp) {
            const x = r.shouldForwardProp;
            if (e.shouldForwardProp) {
                const y = e.shouldForwardProp;
                d = (v, w)=>x(v, w) && y(v, w);
            } else d = x;
        }
        const f = new r1(n, c, i ? r.componentStyle : void 0);
        function g(x, y) {
            return (function(v, w, T) {
                const { attrs: S, componentStyle: E, defaultProps: _, foldedComponentIds: k, styledComponentId: N, target: te } = v, ue = se.useContext(J0), ee = Q0(), q = v.shouldForwardProp || ee.shouldForwardProp, C = Mf(w, ue, _) || ii;
                let j, Ae;
                {
                    const Et = se.useRef(null), qe = Et.current;
                    if (qe !== null && qe[1] === C && qe[2] === ee.styleSheet && qe[3] === ee.stylis && qe[7] === E && (function(vn, ke, Re) {
                        const Pe = vn, ve = ke;
                        let fi = 0;
                        for(const qt in ve)if (il.call(ve, qt) && (fi++, Pe[qt] !== ve[qt])) return !1;
                        return fi === Re;
                    })(qe[0], w, qe[4])) j = qe[5], Ae = qe[6];
                    else {
                        j = (function(ke, Re, Pe) {
                            const ve = Object.assign(Object.assign({}, Re), {
                                className: void 0,
                                theme: Pe
                            }), fi = ke.length > 1;
                            for(let qt = 0; qt < ke.length; qt++){
                                const ls = ke[qt], rr = Qr(ls) ? ls(fi ? Object.assign({}, ve) : ve) : ls;
                                for(const _t in rr)_t === "className" ? ve.className = Ii(ve.className, rr[_t]) : _t === "style" ? ve.style = Object.assign(Object.assign({}, ve.style), rr[_t]) : _t in Re && Re[_t] === void 0 || (ve[_t] = rr[_t]);
                            }
                            return "className" in Re && typeof Re.className == "string" && (ve.className = Ii(ve.className, Re.className)), ve;
                        })(S, w, C), Ae = (function(ke, Re, Pe, ve) {
                            return ke.generateAndInjectStyles(Re, Pe, ve);
                        })(E, j, ee.styleSheet, ee.stylis);
                        let vn = 0;
                        for(const ke in w)il.call(w, ke) && vn++;
                        Et.current = [
                            w,
                            C,
                            ee.styleSheet,
                            ee.stylis,
                            vn,
                            j,
                            Ae,
                            E
                        ];
                    }
                }
                const Tt = j.as || te, Wt = (function(Et, qe, vn, ke) {
                    const Re = {};
                    for(const Pe in Et)Et[Pe] === void 0 || Pe[0] === "$" || Pe === "as" || Pe === "theme" && Et.theme === vn || (Pe === "forwardedAs" ? Re.as = Et.forwardedAs : ke && !ke(Pe, qe) || (Re[Pe] = Et[Pe]));
                    return Re;
                })(j, Tt, C, q);
                let yn = Ii(k, N);
                return Ae && (yn += " " + Ae), j.className && (yn += " " + j.className), Wt[ua(Tt) && Tt.includes("-") ? "class" : "className"] = yn, T && (Wt.ref = T), $.createElement(Tt, Wt);
            })(p, x, y);
        }
        g.displayName = l;
        let p = se.forwardRef(g);
        return p.attrs = u, p.componentStyle = f, p.displayName = l, p.shouldForwardProp = d, p.foldedComponentIds = i ? Ii(r.foldedComponentIds, r.styledComponentId) : "", p.styledComponentId = c, p.target = i ? r.target : t, Object.defineProperty(p, "defaultProps", {
            get () {
                return this._foldedDefaultProps;
            },
            set (x) {
                this._foldedDefaultProps = i ? (function(y, ...v) {
                    for (const w of v)ha(y, w, !0);
                    return y;
                })({}, r.defaultProps, x) : x;
            }
        }), V0(p, ()=>`.${p.styledComponentId}`), s && j0(p, t, {
            attrs: !0,
            componentStyle: !0,
            displayName: !0,
            foldedComponentIds: !0,
            shouldForwardProp: !0,
            styledComponentId: !0,
            target: !0
        }), p;
    }
    var u1 = new Set([
        "a",
        "abbr",
        "address",
        "area",
        "article",
        "aside",
        "audio",
        "b",
        "bdi",
        "bdo",
        "blockquote",
        "body",
        "button",
        "br",
        "canvas",
        "caption",
        "cite",
        "code",
        "col",
        "colgroup",
        "data",
        "datalist",
        "dd",
        "del",
        "details",
        "dfn",
        "dialog",
        "div",
        "dl",
        "dt",
        "em",
        "embed",
        "fieldset",
        "figcaption",
        "figure",
        "footer",
        "form",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hgroup",
        "hr",
        "html",
        "i",
        "iframe",
        "img",
        "input",
        "ins",
        "kbd",
        "label",
        "legend",
        "li",
        "main",
        "map",
        "mark",
        "menu",
        "meter",
        "nav",
        "object",
        "ol",
        "optgroup",
        "option",
        "output",
        "p",
        "picture",
        "pre",
        "progress",
        "q",
        "rp",
        "rt",
        "ruby",
        "s",
        "samp",
        "search",
        "section",
        "select",
        "slot",
        "small",
        "span",
        "strong",
        "sub",
        "summary",
        "sup",
        "table",
        "tbody",
        "td",
        "template",
        "textarea",
        "tfoot",
        "th",
        "thead",
        "time",
        "tr",
        "u",
        "ul",
        "var",
        "video",
        "wbr",
        "circle",
        "clipPath",
        "defs",
        "ellipse",
        "feBlend",
        "feColorMatrix",
        "feComponentTransfer",
        "feComposite",
        "feConvolveMatrix",
        "feDiffuseLighting",
        "feDisplacementMap",
        "feDistantLight",
        "feDropShadow",
        "feFlood",
        "feFuncA",
        "feFuncB",
        "feFuncG",
        "feFuncR",
        "feGaussianBlur",
        "feImage",
        "feMerge",
        "feMergeNode",
        "feMorphology",
        "feOffset",
        "fePointLight",
        "feSpecularLighting",
        "feSpotLight",
        "feTile",
        "feTurbulence",
        "filter",
        "foreignObject",
        "g",
        "image",
        "line",
        "linearGradient",
        "marker",
        "mask",
        "path",
        "pattern",
        "polygon",
        "polyline",
        "radialGradient",
        "rect",
        "stop",
        "svg",
        "switch",
        "symbol",
        "text",
        "textPath",
        "tspan",
        "use"
    ]);
    function rl(t, e) {
        const n = [
            t[0]
        ];
        for(let i = 0, r = e.length; i < r; i += 1)n.push(e[i], t[i + 1]);
        return n;
    }
    const sl = (t)=>($0.add(t), t);
    function h1(t, ...e) {
        if (Qr(t) || $i(t)) return sl(ln(rl(Xa, [
            t,
            ...e
        ])));
        const n = t;
        return e.length === 0 && n.length === 1 && typeof n[0] == "string" ? ln(n) : sl(ln(rl(n, e)));
    }
    function fa(t, e, n = ii) {
        if (!e) throw Zr(1, e);
        const i = (r, ...s)=>t(e, n, h1(r, ...s));
        return i.attrs = (r)=>fa(t, e, Object.assign(Object.assign({}, n), {
                attrs: Array.prototype.concat(n.attrs, r).filter(Boolean)
            })), i.withConfig = (r)=>fa(t, e, Object.assign(Object.assign({}, n), r)), i;
    }
    const eu = (t)=>fa(c1, t), Y = eu;
    u1.forEach((t)=>{
        Y[t] = eu(t);
    });
    const R = {
        textWhite: "rgba(223, 223, 223, 1)",
        textGrey: "rgba(156, 156, 156, 1)",
        dangerRed: "rgba(243, 151, 143, 1)",
        dangerRedPressed: "rgba(240, 97, 84,1)",
        panelBackground: "rgba(38, 38, 38, 0.7)",
        panelBorder: "rgba(61, 61, 63, 0.7)",
        buttonBackground: "rgba(61, 61, 63, 0.6)",
        buttonPressed: "rgba(61, 61, 63, 1)",
        gradientGrey: "linear-gradient(to bottom, #343434, #393939)",
        gradientGreyTranslucent: "linear-gradient(to bottom, rgba(52, 52, 52, 0.75), rgba(57, 57, 57, 0.75))",
        gradientLightGreyTranslucent: "linear-gradient(to bottom, rgba(75, 75, 75, 0.75), rgba(80, 80, 80, 0.75))"
    }, L = {
        height: "30px",
        minWidth: "30px",
        fontSize: "14px",
        radiusMiddle: "3px",
        radiusSolo: "10px",
        radiusFirst: "10px 3px 3px 10px",
        radiusLast: "3px 10px 10px 3px",
        widthLong: "70px",
        widthShort: "30px",
        gap: "3px"
    }, _e = Y.button`
	background: ${R.gradientGreyTranslucent};
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: ${R.textWhite};
	border: 1px solid transparent;
	border-radius: ${L.radiusMiddle};
	font-size: ${L.fontSize};
	height: ${L.height};
	min-width: ${L.minWidth};
	transition: all 0.2s ease-in-out;
	text-transform: none;
	box-shadow: none;
	font-family: Arial, sans-serif;

	&:first-child {
		border-radius: ${({ $reverse: t })=>t ? L.radiusLast : L.radiusFirst};
	}

	&:last-child {
		border-radius: ${({ $reverse: t })=>t ? L.radiusFirst : L.radiusLast};
	}

	&:first-child:last-child {
		border-radius: ${L.radiusSolo};
	}
`, pa = Y.div`
	padding: 2px;
	display: flex;
	background-color: ${R.panelBackground};
	border: 1px solid ${R.panelBorder};
	backdrop-filter: blur(40px);
	-webkit-backdrop-filter: blur(40px);
	justify-content: center;
	pointer-events: all;
	border-radius: 14px;
	align-items: center;
	height: 24px;
`, Ve = Y.button`
	background-color: transparent;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: ${R.textWhite};
	border-radius: 4px;
	font-size: 16px;
	height: 24px;
	min-width: 24px;
	transition: all 0.2s ease-in-out;
	text-transform: none;
	box-shadow: none;
	padding: 1px 5px;
	font-family: Arial, sans-serif;

	&:hover {
		background-color: ${R.buttonPressed};
	}

	&:active {
		background-color: ${R.buttonPressed};
	}

	&:focus {
		outline: none;
	}

	&:first-child {
		border-radius: 12px 4px 4px 12px;
	}

	&:last-child {
		border-radius: 4px 12px 12px 4px;
	}

	&:first-child:last-child {
		border-radius: 12px;
	}
`, pt = Y.div`
	background-color: ${({ $pressed: t })=>t ? R.buttonPressed : R.buttonBackground};
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	color: ${R.textWhite};
	border-radius: 8px;
	font-size: 14px;
	font-family: Arial, sans-serif;
	height: 30px;
	width: 30px;
	transition: all 0.2s ease-in-out;
`, ri = Y.div`
	display: flex;
	align-items: center;
	height: 30px;
	margin-bottom: 3px;
	justify-content: flex-start;
	flex-direction: ${({ $reverse: t })=>t ? "row-reverse" : "row"};

	&:last-child {
		margin-bottom: 0;
	}
`, jt = Y.div`
	display: flex;
	flex-direction: ${({ $reverse: t })=>t ? "row-reverse" : "row"};
	height: 100%;
	justify-content: space-between;
	align-items: center;
	margin: ${({ $reverse: t })=>t ? "0 5px 0 0" : "0 0 0 5px"};
	gap: 3px;
`;
    Y.button`
	background-color: rgba(255, 255, 255, 0.3);
	border: none;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 0;
	pointer-events: none;
	width: 50px;
	height: 50px;
	border-radius: 50%;
	position: relative;
	margin: 0 5px;
	backdrop-filter: blur(10px);
	-webkit-backdrop-filter: blur(10px);
`;
    Y.div`
	position: absolute;
	background-color: ${R.textWhite};
	border-radius: 50%;
	width: 36px;
	height: 36px;
	cursor: pointer;
	pointer-events: auto;
`;
    const tu = Y.input.attrs({
        type: "range"
    })`
	-webkit-appearance: none;
	appearance: none;
	background: ${R.gradientGreyTranslucent};
	border: none;
	height: 100%;
	width: ${L.widthLong};
	cursor: pointer;
	margin: 0;
	transition: all 0.2s ease-in-out;
	border-radius: ${({ $reverse: t })=>t ? L.radiusFirst : L.radiusLast};

	&::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 8px;
		height: 30px;
		background-color: ${R.textWhite};
		border-radius: ${L.radiusMiddle};
	}

	&::-moz-range-thumb {
		width: 10px;
		height: 30px;
		background-color: ${R.textWhite};
		border-radius: ${L.radiusMiddle};
	}

	&::-ms-thumb {
		width: 8px;
		height: 24px;
		background-color: ${R.textWhite};
		border-radius: ${L.radiusMiddle};
	}
`;
    Y.div`
	display: flex;
	flex-direction: column;
	align-items: ${({ $reverse: t })=>t ? "flex-start" : "flex-end"};
	justify-content: center;
	margin: ${({ $reverse: t })=>t ? "2px -26px 0 0" : "2px 0 0 -26px"};
`;
    Y.div`
	display: flex;
	flex-direction: ${({ $reverse: t })=>t ? "row-reverse" : "row"};
	align-items: center;
	justify-content: center;
`;
    const H = Y(tr)`
	height: ${({ $size: t = 14 })=>`${t}px`};
	min-height: ${({ $size: t = 14 })=>`${t}px`};
	max-height: ${({ $size: t = 14 })=>`${t}px`};
	width: ${({ $size: t = 14 })=>`${t}px`};
	min-width: ${({ $size: t = 14 })=>`${t}px`};
	max-width: ${({ $size: t = 14 })=>`${t}px`};
	transform: ${({ $reverse: t })=>t ? "scaleX(-1)" : "unset"};
`, hi = Y(tr)`
	height: 18px;
	min-height: 18px;
	max-height: 18px;
	width: 18px;
	min-width: 18px;
	max-width: 18px;
	margin: 6px;
	transform: ${({ $reverse: t })=>t ? "scaleX(-1)" : "unset"};
`, Hi = Y.div`
	position: fixed;
	padding: 5px;
	font-family: Arial, sans-serif;
	color: ${R.textWhite};
	pointer-events: all;
	background-color: ${R.panelBackground};
	border: 1px solid ${R.panelBorder};
	backdrop-filter: blur(40px);
	-webkit-backdrop-filter: blur(40px);
	border-radius: 12px;
	box-shadow: 0 5px 10px rgba(0, 0, 0, 0.3);
	overflow: hidden;
	display: flex;
	flex-direction: column;
`, mn = Y.hr`
	width: ${({ $horizontal: t = !0 })=>t ? "unset" : "1px"};
	height: ${({ $horizontal: t = !0 })=>t ? "1px" : "unset"};
	background-color: ${R.panelBorder};
	margin: 5px 3px;
	border: none;
`, cn = Y.button`
	background-color: transparent;
	border: none;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: ${({ $isRed: t })=>t ? R.dangerRed : R.textWhite};
	font-size: 12px;
	padding: 3px;
	text-transform: none;
	box-shadow: none;

	&:hover {
		color: ${({ $isRed: t })=>t ? R.dangerRedPressed : "#ffffff"};
	}

	&:active {
		color: ${({ $isRed: t })=>t ? R.dangerRedPressed : "#ffffff"};
	}

	&:focus {
		outline: none;
	}
`, nu = Y.div`
	display: flex;
	flex-direction: row;
	gap: ${L.gap};
	height: 25px;
`, iu = Y.input.attrs({
        type: "text"
    })`
	width: 50px;
	outline: none;
	background: ${R.gradientGrey};
	border: 1px solid transparent;
	border-radius: 5px;
	height: 25px;
	color: ${R.textWhite};
	padding: 0 10px 0 5px;
	box-sizing: border-box;
	font-size: 10px;

	&:read-only {
		background: ${R.gradientGreyTranslucent};
	}

	&:invalid {
		background-color: ${R.dangerRed};
	}
`, ru = Y.span`
	position: absolute;
	right: 5px;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	color: ${R.textGrey};
	font-size: 10px;
`, d1 = {
        prefix: "fas",
        iconName: "right-from-bracket",
        icon: [
            512,
            512,
            [
                "sign-out-alt"
            ],
            "f2f5",
            "M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"
        ]
    }, Za = {
        prefix: "fas",
        iconName: "fingerprint",
        icon: [
            512,
            512,
            [],
            "f577",
            "M48 256C48 141.1 141.1 48 256 48c63.1 0 119.6 28.1 157.8 72.5c8.6 10.1 23.8 11.2 33.8 2.6s11.2-23.8 2.6-33.8C403.3 34.6 333.7 0 256 0C114.6 0 0 114.6 0 256l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40zm458.5-52.9c-2.7-13-15.5-21.3-28.4-18.5s-21.3 15.5-18.5 28.4c2.9 13.9 4.5 28.3 4.5 43.1l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40c0-18.1-1.9-35.8-5.5-52.9zM256 80c-19 0-37.4 3-54.5 8.6c-15.2 5-18.7 23.7-8.3 35.9c7.1 8.3 18.8 10.8 29.4 7.9c10.6-2.9 21.8-4.4 33.4-4.4c70.7 0 128 57.3 128 128l0 24.9c0 25.2-1.5 50.3-4.4 75.3c-1.7 14.6 9.4 27.8 24.2 27.8c11.8 0 21.9-8.6 23.3-20.3c3.3-27.4 5-55 5-82.7l0-24.9c0-97.2-78.8-176-176-176zM150.7 148.7c-9.1-10.6-25.3-11.4-33.9-.4C93.7 178 80 215.4 80 256l0 24.9c0 24.2-2.6 48.4-7.8 71.9C68.8 368.4 80.1 384 96.1 384c10.5 0 19.9-7 22.2-17.3c6.4-28.1 9.7-56.8 9.7-85.8l0-24.9c0-27.2 8.5-52.4 22.9-73.1c7.2-10.4 8-24.6-.2-34.2zM256 160c-53 0-96 43-96 96l0 24.9c0 35.9-4.6 71.5-13.8 106.1c-3.8 14.3 6.7 29 21.5 29c9.5 0 17.9-6.2 20.4-15.4c10.5-39 15.9-79.2 15.9-119.7l0-24.9c0-28.7 23.3-52 52-52s52 23.3 52 52l0 24.9c0 36.3-3.5 72.4-10.4 107.9c-2.7 13.9 7.7 27.2 21.8 27.2c10.2 0 19-7 21-17c7.7-38.8 11.6-78.3 11.6-118.1l0-24.9c0-53-43-96-96-96zm24 96c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 24.9c0 59.9-11 119.3-32.5 175.2l-5.9 15.3c-4.8 12.4 1.4 26.3 13.8 31s26.3-1.4 31-13.8l5.9-15.3C267.9 411.9 280 346.7 280 280.9l0-24.9z"
        ]
    }, f1 = {
        prefix: "fas",
        iconName: "caret-right",
        icon: [
            256,
            512,
            [],
            "f0da",
            "M246.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-9.2-9.2-22.9-11.9-34.9-6.9s-19.8 16.6-19.8 29.6l0 256c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l128-128z"
        ]
    }, p1 = {
        prefix: "fas",
        iconName: "caret-left",
        icon: [
            256,
            512,
            [],
            "f0d9",
            "M9.4 278.6c-12.5-12.5-12.5-32.8 0-45.3l128-128c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 256c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-128-128z"
        ]
    }, su = {
        prefix: "fas",
        iconName: "gamepad",
        icon: [
            640,
            512,
            [],
            "f11b",
            "M192 64C86 64 0 150 0 256S86 448 192 448l256 0c106 0 192-86 192-192s-86-192-192-192L192 64zM496 168a40 40 0 1 1 0 80 40 40 0 1 1 0-80zM392 304a40 40 0 1 1 80 0 40 40 0 1 1 -80 0zM168 200c0-13.3 10.7-24 24-24s24 10.7 24 24l0 32 32 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-32 0 0 32c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-32-32 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l32 0 0-32z"
        ]
    }, au = {
        prefix: "fas",
        iconName: "hand",
        icon: [
            512,
            512,
            [
                129306,
                9995,
                "hand-paper"
            ],
            "f256",
            "M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-176c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 272c0 1.5 0 3.1 .1 4.6L67.6 283c-16-15.2-41.3-14.6-56.6 1.4s-14.6 41.3 1.4 56.6L124.8 448c43.1 41.1 100.4 64 160 64l19.2 0c97.2 0 176-78.8 176-176l0-208c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-176c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 176c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208z"
        ]
    }, ou = {
        prefix: "fas",
        iconName: "plug",
        icon: [
            384,
            512,
            [
                128268
            ],
            "f1e6",
            "M96 0C78.3 0 64 14.3 64 32l0 96 64 0 0-96c0-17.7-14.3-32-32-32zM288 0c-17.7 0-32 14.3-32 32l0 96 64 0 0-96c0-17.7-14.3-32-32-32zM32 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l0 32c0 77.4 55 142 128 156.8l0 67.2c0 17.7 14.3 32 32 32s32-14.3 32-32l0-67.2C297 398 352 333.4 352 256l0-32c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 160z"
        ]
    }, m1 = {
        prefix: "fas",
        iconName: "ban",
        icon: [
            512,
            512,
            [
                128683,
                "cancel"
            ],
            "f05e",
            "M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"
        ]
    }, g1 = {
        prefix: "fas",
        iconName: "arrow-right-to-bracket",
        icon: [
            512,
            512,
            [
                "sign-in"
            ],
            "f090",
            "M352 96l64 0c17.7 0 32 14.3 32 32l0 256c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c53 0 96-43 96-96l0-256c0-53-43-96-96-96l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32zm-9.4 182.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z"
        ]
    }, x1 = {
        prefix: "fas",
        iconName: "caret-up",
        icon: [
            320,
            512,
            [],
            "f0d8",
            "M182.6 137.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-9.2 9.2-11.9 22.9-6.9 34.9s16.6 19.8 29.6 19.8l256 0c12.9 0 24.6-7.8 29.6-19.8s2.2-25.7-6.9-34.9l-128-128z"
        ]
    }, y1 = {
        prefix: "fas",
        iconName: "rotate-left",
        icon: [
            512,
            512,
            [
                "rotate-back",
                "rotate-backward",
                "undo-alt"
            ],
            "f2ea",
            "M48.5 224L40 224c-13.3 0-24-10.7-24-24L16 72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2L98.6 96.6c87.6-86.5 228.7-86.2 315.8 1c87.5 87.5 87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3c-62.2-62.2-162.7-62.5-225.3-1L185 183c6.9 6.9 8.9 17.2 5.2 26.2s-12.5 14.8-22.2 14.8L48.5 224z"
        ]
    }, v1 = {
        prefix: "fas",
        iconName: "circle-play",
        icon: [
            512,
            512,
            [
                61469,
                "play-circle"
            ],
            "f144",
            "M0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zM188.3 147.1c-7.6 4.2-12.3 12.3-12.3 20.9l0 176c0 8.7 4.7 16.7 12.3 20.9s16.8 4.1 24.3-.5l144-88c7.1-4.4 11.5-12.1 11.5-20.5s-4.4-16.1-11.5-20.5l-144-88c-7.4-4.5-16.7-4.7-24.3-.5z"
        ]
    }, w1 = {
        prefix: "fas",
        iconName: "person-shelter",
        icon: [
            512,
            512,
            [],
            "e54f",
            "M271.9 4.2c-9.8-5.6-21.9-5.6-31.8 0l-224 128C6.2 137.9 0 148.5 0 160L0 480c0 17.7 14.3 32 32 32s32-14.3 32-32l0-301.4L256 68.9 448 178.6 448 480c0 17.7 14.3 32 32 32s32-14.3 32-32l0-320c0-11.5-6.2-22.1-16.1-27.8l-224-128zM256 208a40 40 0 1 0 0-80 40 40 0 1 0 0 80zm-8 280l0-88 16 0 0 88c0 13.3 10.7 24 24 24s24-10.7 24-24l0-174.5 26.9 49.9c6.3 11.7 20.8 16 32.5 9.8s16-20.8 9.8-32.5l-37.9-70.3c-15.3-28.5-45.1-46.3-77.5-46.3l-19.5 0c-32.4 0-62.1 17.8-77.5 46.3l-37.9 70.3c-6.3 11.7-1.9 26.2 9.8 32.5s26.2 1.9 32.5-9.8L200 313.5 200 488c0 13.3 10.7 24 24 24s24-10.7 24-24z"
        ]
    }, Qa = {
        prefix: "fas",
        iconName: "hand-scissors",
        icon: [
            512,
            512,
            [],
            "f257",
            "M40 208c-22.1 0-40 17.9-40 40s17.9 40 40 40l180.2 0c-7.6 8.5-12.2 19.7-12.2 32c0 25.3 19.5 46 44.3 47.9c-7.7 8.5-12.3 19.8-12.3 32.1c0 26.5 21.5 48 48 48l32 0 64 0c70.7 0 128-57.3 128-128l0-113.1c0-40.2-16-78.8-44.4-107.3C444.8 76.8 413.9 64 381.7 64L336 64c-21.3 0-39.3 13.9-45.6 33.1l74.5 23.7c8.4 2.7 13.1 11.7 10.4 20.1s-11.7 13.1-20.1 10.4L288 129.9c0 0 0 .1 0 .1L84 65.8C62.9 59.2 40.5 70.9 33.8 92s5.1 43.5 26.2 50.2L269.5 208 40 208z"
        ]
    }, b1 = {
        prefix: "fas",
        iconName: "street-view",
        icon: [
            512,
            512,
            [],
            "f21d",
            "M320 64A64 64 0 1 0 192 64a64 64 0 1 0 128 0zm-96 96c-35.3 0-64 28.7-64 64l0 48c0 17.7 14.3 32 32 32l1.8 0 11.1 99.5c1.8 16.2 15.5 28.5 31.8 28.5l38.7 0c16.3 0 30-12.3 31.8-28.5L318.2 304l1.8 0c17.7 0 32-14.3 32-32l0-48c0-35.3-28.7-64-64-64l-64 0zM132.3 394.2c13-2.4 21.7-14.9 19.3-27.9s-14.9-21.7-27.9-19.3c-32.4 5.9-60.9 14.2-82 24.8c-10.5 5.3-20.3 11.7-27.8 19.6C6.4 399.5 0 410.5 0 424c0 21.4 15.5 36.1 29.1 45c14.7 9.6 34.3 17.3 56.4 23.4C130.2 504.7 190.4 512 256 512s125.8-7.3 170.4-19.6c22.1-6.1 41.8-13.8 56.4-23.4c13.7-8.9 29.1-23.6 29.1-45c0-13.5-6.4-24.5-14-32.6c-7.5-7.9-17.3-14.3-27.8-19.6c-21-10.6-49.5-18.9-82-24.8c-13-2.4-25.5 6.3-27.9 19.3s6.3 25.5 19.3 27.9c30.2 5.5 53.7 12.8 69 20.5c3.2 1.6 5.8 3.1 7.9 4.5c3.6 2.4 3.6 7.2 0 9.6c-8.8 5.7-23.1 11.8-43 17.3C374.3 457 318.5 464 256 464s-118.3-7-157.7-17.9c-19.9-5.5-34.2-11.6-43-17.3c-3.6-2.4-3.6-7.2 0-9.6c2.1-1.4 4.8-2.9 7.9-4.5c15.3-7.7 38.8-14.9 69-20.5z"
        ]
    }, lu = {
        prefix: "fas",
        iconName: "gear",
        icon: [
            512,
            512,
            [
                9881,
                "cog"
            ],
            "f013",
            "M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"
        ]
    }, T1 = {
        prefix: "fas",
        iconName: "caret-down",
        icon: [
            320,
            512,
            [],
            "f0d7",
            "M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"
        ]
    }, E1 = {
        prefix: "fas",
        iconName: "delete-left",
        icon: [
            576,
            512,
            [
                9003,
                "backspace"
            ],
            "f55a",
            "M576 128c0-35.3-28.7-64-64-64L205.3 64c-17 0-33.3 6.7-45.3 18.7L9.4 233.4c-6 6-9.4 14.1-9.4 22.6s3.4 16.6 9.4 22.6L160 429.3c12 12 28.3 18.7 45.3 18.7L512 448c35.3 0 64-28.7 64-64l0-256zM271 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"
        ]
    }, _1 = {
        prefix: "fas",
        iconName: "bug",
        icon: [
            512,
            512,
            [],
            "f188",
            "M256 0c53 0 96 43 96 96l0 3.6c0 15.7-12.7 28.4-28.4 28.4l-135.1 0c-15.7 0-28.4-12.7-28.4-28.4l0-3.6c0-53 43-96 96-96zM41.4 105.4c12.5-12.5 32.8-12.5 45.3 0l64 64c.7 .7 1.3 1.4 1.9 2.1c14.2-7.3 30.4-11.4 47.5-11.4l112 0c17.1 0 33.2 4.1 47.5 11.4c.6-.7 1.2-1.4 1.9-2.1l64-64c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3l-64 64c-.7 .7-1.4 1.3-2.1 1.9c6.2 12 10.1 25.3 11.1 39.5l64.3 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c0 24.6-5.5 47.8-15.4 68.6c2.2 1.3 4.2 2.9 6 4.8l64 64c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0l-63.1-63.1c-24.5 21.8-55.8 36.2-90.3 39.6L272 240c0-8.8-7.2-16-16-16s-16 7.2-16 16l0 239.2c-34.5-3.4-65.8-17.8-90.3-39.6L86.6 502.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l64-64c1.9-1.9 3.9-3.4 6-4.8C101.5 367.8 96 344.6 96 320l-64 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l64.3 0c1.1-14.1 5-27.5 11.1-39.5c-.7-.6-1.4-1.2-2.1-1.9l-64-64c-12.5-12.5-12.5-32.8 0-45.3z"
        ]
    }, al = {
        prefix: "fas",
        iconName: "angle-up",
        icon: [
            448,
            512,
            [
                8963
            ],
            "f106",
            "M201.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L224 205.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z"
        ]
    }, ol = {
        prefix: "fas",
        iconName: "chevron-left",
        icon: [
            320,
            512,
            [
                9001
            ],
            "f053",
            "M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"
        ]
    }, Ka = {
        prefix: "fas",
        iconName: "hand-lizard",
        icon: [
            512,
            512,
            [],
            "f258",
            "M0 112C0 85.5 21.5 64 48 64l112 0 80 0 46.5 0c36.8 0 71.2 18 92.1 48.2l113.5 164c13 18.7 19.9 41 19.9 63.8l0 12 0 16 0 48c0 17.7-14.3 32-32 32l-96 0c-17.7 0-32-14.3-32-32l0-13.8L273.9 352 240 352l-80 0-48 0c-26.5 0-48-21.5-48-48s21.5-48 48-48l48 0 80 0c26.5 0 48-21.5 48-48s-21.5-48-48-48l-80 0L48 160c-26.5 0-48-21.5-48-48z"
        ]
    }, ll = {
        prefix: "fas",
        iconName: "chevron-right",
        icon: [
            320,
            512,
            [
                9002
            ],
            "f054",
            "M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"
        ]
    }, S1 = {
        prefix: "fas",
        iconName: "vr-cardboard",
        icon: [
            640,
            512,
            [],
            "f729",
            "M576 64L64 64C28.7 64 0 92.7 0 128L0 384c0 35.3 28.7 64 64 64l120.4 0c24.2 0 46.4-13.7 57.2-35.4l32-64c8.8-17.5 26.7-28.6 46.3-28.6s37.5 11.1 46.3 28.6l32 64c10.8 21.7 33 35.4 57.2 35.4L576 448c35.3 0 64-28.7 64-64l0-256c0-35.3-28.7-64-64-64zM96 240a64 64 0 1 1 128 0A64 64 0 1 1 96 240zm384-64a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"
        ]
    }, M1 = {
        prefix: "fas",
        iconName: "arrow-turn-down",
        icon: [
            384,
            512,
            [
                "level-down"
            ],
            "f149",
            "M32 64C14.3 64 0 49.7 0 32S14.3 0 32 0l96 0c53 0 96 43 96 96l0 306.7 73.4-73.4c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3l-128 128c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 402.7 160 96c0-17.7-14.3-32-32-32L32 64z"
        ]
    }, Jr = {
        prefix: "fas",
        iconName: "circle-xmark",
        icon: [
            512,
            512,
            [
                61532,
                "times-circle",
                "xmark-circle"
            ],
            "f057",
            "M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"
        ]
    }, A1 = {
        prefix: "fas",
        iconName: "video",
        icon: [
            576,
            512,
            [
                "video-camera"
            ],
            "f03d",
            "M0 128C0 92.7 28.7 64 64 64l256 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64L64 448c-35.3 0-64-28.7-64-64L0 128zM559.1 99.8c10.4 5.6 16.9 16.4 16.9 28.2l0 256c0 11.8-6.5 22.6-16.9 28.2s-23 5-32.9-1.6l-96-64L416 337.1l0-17.1 0-128 0-17.1 14.2-9.5 96-64c9.8-6.5 22.4-7.2 32.9-1.6z"
        ]
    }, z = L.height, R1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M7 13.125a7 7 0 1 0 14 0v1.75a7 7 0 0 1-14 0v-1.75Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .55,
                    d: "M14 19.863a6.738 6.738 0 1 0 0-13.476 6.738 6.738 0 0 0 0 13.476Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M16.529 16.1h-.893l-1.653-2.713-1.68 2.713h-.832l2.074-3.255-1.942-2.992h.875l1.531 2.45 1.54-2.45h.831l-1.933 2.975 2.082 3.272Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), P1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M7 13.125a7 7 0 1 0 14 0v1.75a7 7 0 0 1-14 0v-1.75Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .55,
                    d: "M14 19.863a6.738 6.738 0 1 0 0-13.476 6.738 6.738 0 0 0 0 13.476Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "m14.086 12.924 1.627-3.071h.849l-2.083 3.823V16.1h-.787v-2.389L11.61 9.853h.857l1.619 3.07Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), O1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M7 13.125a7 7 0 1 0 14 0v1.75a7 7 0 0 1-14 0v-1.75Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .55,
                    d: "M14 19.863a6.738 6.738 0 1 0 0-13.476 6.738 6.738 0 0 0 0 13.476Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "m15.975 16.1-.753-1.934h-2.476l-.744 1.934h-.796l2.441-6.274h.709l2.432 6.274h-.813Zm-1.69-4.524a29.052 29.052 0 0 1-.21-.63 5.175 5.175 0 0 0-.087-.306c-.029.117-.06.236-.096.359-.03.116-.061.224-.096.323-.03.1-.056.184-.079.254l-.709 1.89h1.978l-.7-1.89Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), I1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M7 13.125a7 7 0 1 0 14 0v1.75a7 7 0 0 1-14 0v-1.75Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .55,
                    d: "M14 19.863a6.738 6.738 0 1 0 0-13.476 6.738 6.738 0 0 0 0 13.476Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M13.876 9.853c.519 0 .954.05 1.304.148.355.1.62.263.796.49.18.228.271.531.271.91 0 .245-.047.464-.14.656a1.198 1.198 0 0 1-.402.473 1.62 1.62 0 0 1-.648.254v.043c.262.041.499.117.709.228.216.11.385.268.507.473.123.204.184.47.184.796 0 .379-.088.703-.262.971a1.663 1.663 0 0 1-.753.604c-.32.134-.706.201-1.155.201h-2.196V9.853h1.785Zm.157 2.66c.537 0 .905-.085 1.103-.254.198-.175.297-.432.297-.77 0-.344-.122-.59-.367-.735-.24-.152-.624-.228-1.155-.228h-1.033v1.986h1.155Zm-1.155.656v2.266h1.26c.555 0 .94-.108 1.155-.324.216-.216.324-.498.324-.849 0-.221-.05-.414-.149-.577-.093-.163-.254-.289-.481-.376-.222-.093-.525-.14-.91-.14h-1.199Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), k1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .5,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M12.642 17.325v-6.247h.787v5.547h2.73v.7h-3.517ZM14.479 6.389a.525.525 0 0 1-.782 0l-2.235-2.495a.525.525 0 0 1 .39-.875h4.47c.454 0 .694.537.391.875L14.478 6.39Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "m13.045 6.711-1.093-1.22a8.75 8.75 0 1 0 4.24.036L15.11 6.733A7.352 7.352 0 0 1 14 21.35a7.35 7.35 0 0 1-.955-14.639Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), L1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .7,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M13.938 11.077c.52 0 .945.068 1.278.202.338.128.59.323.752.586.164.262.245.592.245.989 0 .332-.06.61-.183.83-.123.223-.28.4-.473.535a2.61 2.61 0 0 1-.595.306l1.715 2.8h-.919l-1.513-2.581h-1.243v2.58h-.787v-6.247h1.723Zm-.043.683h-.893v2.319h.936c.339 0 .616-.044.832-.132a.956.956 0 0 0 .472-.402c.105-.175.158-.394.158-.656 0-.274-.056-.493-.167-.657a.905.905 0 0 0-.49-.358c-.221-.076-.504-.114-.848-.114ZM14.479 6.389a.525.525 0 0 1-.782 0l-2.235-2.495a.525.525 0 0 1 .39-.875h4.47c.454 0 .694.537.391.875L14.478 6.39Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "m13.045 6.711-1.093-1.22a8.75 8.75 0 1 0 4.24.036L15.11 6.733A7.352 7.352 0 0 1 14 21.35a7.35 7.35 0 0 1-.955-14.639Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), C1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    d: "M14 22.05a8.05 8.05 0 1 0 0-16.1 8.05 8.05 0 0 0 0 16.1Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .75,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M12.642 17.325v-6.248h.787v5.548h2.73v.7h-3.517ZM13.697.611a.525.525 0 0 1 .782 0l2.234 2.495a.525.525 0 0 1-.39.875h-4.47a.525.525 0 0 1-.391-.875L13.697.61Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), N1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    d: "M14 22.05a8.05 8.05 0 1 0 0-16.1 8.05 8.05 0 0 0 0 16.1Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .75,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M12.642 17.325v-6.248h.787v5.548h2.73v.7h-3.517ZM14.479 27.389a.525.525 0 0 1-.782 0l-2.235-2.495a.525.525 0 0 1 .39-.875h4.47c.454 0 .694.537.391.875l-2.235 2.495Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), F1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    d: "M14 22.05a8.05 8.05 0 1 0 0-16.1 8.05 8.05 0 0 0 0 16.1Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .75,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M12.642 17.325v-6.248h.787v5.548h2.73v.7h-3.517ZM.611 14.303a.525.525 0 0 1 0-.782l2.495-2.234a.525.525 0 0 1 .875.39v4.47a.525.525 0 0 1-.875.391L.61 14.303Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), z1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    d: "M14 22.05a8.05 8.05 0 1 0 0-16.1 8.05 8.05 0 0 0 0 16.1Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .75,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M12.642 17.325v-6.248h.787v5.548h2.73v.7h-3.517ZM27.389 13.521a.525.525 0 0 1 0 .782l-2.495 2.235a.525.525 0 0 1-.875-.39v-4.47c0-.454.537-.694.875-.391l2.495 2.234Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), D1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    d: "M14 22.05a8.05 8.05 0 1 0 0-16.1 8.05 8.05 0 0 0 0 16.1Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .75,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M13.938 11.077c.52 0 .945.068 1.278.202.338.128.59.323.752.586.164.262.245.592.245.989 0 .332-.06.61-.183.83-.123.223-.28.4-.473.535a2.61 2.61 0 0 1-.595.306l1.715 2.8h-.919l-1.513-2.581h-1.243v2.58h-.787v-6.247h1.723Zm-.043.683h-.893v2.319h.936c.339 0 .616-.044.832-.132a.956.956 0 0 0 .472-.402c.105-.175.158-.394.158-.656 0-.274-.056-.493-.167-.657a.905.905 0 0 0-.49-.358c-.221-.076-.504-.114-.848-.114ZM13.697.611a.525.525 0 0 1 .782 0l2.234 2.495a.525.525 0 0 1-.39.875h-4.47a.525.525 0 0 1-.391-.875L13.697.61Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), B1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    d: "M14 22.05a8.05 8.05 0 1 0 0-16.1 8.05 8.05 0 0 0 0 16.1Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .75,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M13.938 11.077c.52 0 .945.068 1.278.202.338.128.59.323.752.586.164.262.245.592.245.989 0 .332-.06.61-.183.83-.123.223-.28.4-.473.535a2.61 2.61 0 0 1-.595.306l1.715 2.8h-.919l-1.513-2.581h-1.243v2.58h-.787v-6.247h1.723Zm-.043.683h-.893v2.319h.936c.339 0 .616-.044.832-.132a.956.956 0 0 0 .472-.402c.105-.175.158-.394.158-.656 0-.274-.056-.493-.167-.657a.905.905 0 0 0-.49-.358c-.221-.076-.504-.114-.848-.114ZM14.479 27.389a.525.525 0 0 1-.782 0l-2.235-2.495a.525.525 0 0 1 .39-.875h4.47c.454 0 .694.537.391.875l-2.235 2.495Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), j1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    d: "M14 22.05a8.05 8.05 0 1 0 0-16.1 8.05 8.05 0 0 0 0 16.1Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .75,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M13.938 11.077c.52 0 .945.068 1.278.202.338.128.59.323.752.586.164.262.245.592.245.989 0 .332-.06.61-.183.83-.123.223-.28.4-.473.535a2.61 2.61 0 0 1-.595.306l1.715 2.8h-.919l-1.513-2.581h-1.243v2.58h-.787v-6.247h1.723Zm-.043.683h-.893v2.319h.936c.339 0 .616-.044.832-.132a.956.956 0 0 0 .472-.402c.105-.175.158-.394.158-.656 0-.274-.056-.493-.167-.657a.905.905 0 0 0-.49-.358c-.221-.076-.504-.114-.848-.114ZM.611 14.303a.525.525 0 0 1 0-.782l2.495-2.234a.525.525 0 0 1 .875.39v4.47a.525.525 0 0 1-.875.391L.61 14.303Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), U1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: 1.5,
                    d: "M14 22.05a8.05 8.05 0 1 0 0-16.1 8.05 8.05 0 0 0 0 16.1Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .75,
                    d: "M14 19.95a5.95 5.95 0 1 0 0-11.9 5.95 5.95 0 0 0 0 11.9Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M13.938 11.077c.52 0 .945.068 1.278.202.338.128.59.323.752.586.164.262.245.592.245.989 0 .332-.06.61-.183.83-.123.223-.28.4-.473.535a2.61 2.61 0 0 1-.595.306l1.715 2.8h-.919l-1.513-2.581h-1.243v2.58h-.787v-6.247h1.723Zm-.043.683h-.893v2.319h.936c.339 0 .616-.044.832-.132a.956.956 0 0 0 .472-.402c.105-.175.158-.394.158-.656 0-.274-.056-.493-.167-.657a.905.905 0 0 0-.49-.358c-.221-.076-.504-.114-.848-.114ZM27.389 13.521a.525.525 0 0 1 0 .782l-2.495 2.235a.525.525 0 0 1-.875-.39v-4.47c0-.454.537-.694.875-.391l2.495 2.234Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), V1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M7.525 7.875c-2.283 1.22-3.82 3.507-3.82 6.125s1.537 4.904 3.82 6.125C4.405 19.425 2.1 16.948 2.1 14s2.306-5.425 5.425-6.125Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .7,
                    d: "M24.702 10.954a2.187 2.187 0 0 0-2.095-2.817H11.025a5.863 5.863 0 0 0 0 11.726h9.377c.966 0 1.818-.634 2.095-1.56l2.205-7.35Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M10.594 17.15v-6.248h.788v5.548h2.73v.7h-3.518Zm7.13-3.299h2.162v3.063c-.338.11-.68.192-1.024.245a7.837 7.837 0 0 1-1.172.078c-.648 0-1.193-.128-1.637-.385a2.567 2.567 0 0 1-1.015-1.11c-.227-.485-.34-1.057-.34-1.716 0-.653.127-1.219.384-1.697a2.699 2.699 0 0 1 1.103-1.112c.484-.268 1.067-.402 1.75-.402.35 0 .68.032.988.096.315.064.607.155.875.271l-.297.683a4.55 4.55 0 0 0-.753-.254 3.453 3.453 0 0 0-.857-.105c-.496 0-.922.102-1.278.306a2.004 2.004 0 0 0-.813.875c-.187.374-.28.82-.28 1.34 0 .495.078.935.236 1.32.163.38.417.677.761.893.344.21.796.315 1.356.315.187 0 .35-.006.49-.018.146-.017.277-.037.394-.06.123-.024.236-.047.341-.07V14.55h-1.373v-.7Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), G1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M20.441 7.875c2.283 1.22 3.82 3.507 3.82 6.125s-1.537 4.904-3.82 6.125c3.12-.7 5.425-3.177 5.425-6.125s-2.305-5.425-5.425-6.125Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .7,
                    d: "M3.264 10.954a2.187 2.187 0 0 1 2.095-2.817h11.582a5.862 5.862 0 0 1 0 11.726H7.564a2.188 2.188 0 0 1-2.095-1.56l-2.205-7.35Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M9.497 10.902c.519 0 .945.068 1.277.202.339.128.59.323.753.586.163.262.245.592.245.989 0 .332-.062.61-.184.83-.122.223-.28.4-.472.535-.187.128-.386.23-.595.306l1.714 2.8h-.918l-1.514-2.581H8.56v2.58h-.787v-6.247h1.724Zm-.044.683H8.56v2.319h.937c.338 0 .615-.044.831-.132a.956.956 0 0 0 .473-.402c.104-.175.157-.394.157-.656 0-.274-.055-.493-.166-.657a.905.905 0 0 0-.49-.358c-.222-.076-.505-.114-.849-.114Zm6.476 2.266h2.16v3.063c-.337.11-.679.192-1.023.245a7.837 7.837 0 0 1-1.172.078c-.648 0-1.193-.128-1.637-.385a2.568 2.568 0 0 1-1.015-1.11c-.227-.485-.34-1.057-.34-1.716 0-.653.127-1.219.384-1.697a2.699 2.699 0 0 1 1.103-1.112c.484-.268 1.067-.402 1.75-.402.35 0 .68.032.988.096.315.064.607.155.875.271l-.297.683a4.551 4.551 0 0 0-.753-.254 3.453 3.453 0 0 0-.857-.105c-.496 0-.922.102-1.278.306a2.004 2.004 0 0 0-.813.875c-.187.374-.28.82-.28 1.34 0 .495.078.935.236 1.32.163.38.417.677.761.893.344.21.796.315 1.356.315.187 0 .35-.006.49-.018a5.17 5.17 0 0 0 .394-.06c.123-.024.236-.047.341-.07V14.55H15.93v-.7Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), $1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .7,
                    d: "M14 20.212a7.612 7.612 0 1 0 0-15.224 7.612 7.612 0 0 0 0 15.224Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M10.209 15.662V9.415h.787v5.548h2.73v.7H10.21Zm6.395 0h-.787v-5.556h-1.952v-.691h4.682v.691h-1.943v5.556Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M21.235 17.5a8.31 8.31 0 0 1-7.205 4.165A8.31 8.31 0 0 1 6.825 17.5c.823 3.4 3.737 5.915 7.205 5.915 3.469 0 6.382-2.514 7.205-5.915Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), H1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    strokeWidth: .7,
                    d: "M14 20.212a7.612 7.612 0 1 0 0-15.224 7.612 7.612 0 0 0 0 15.224Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M11.42 9.415c.52 0 .945.067 1.277.201.339.129.59.324.753.587.163.262.245.592.245.988 0 .333-.061.61-.184.832-.122.221-.28.4-.472.533-.187.129-.385.23-.595.307l1.715 2.8h-.92l-1.513-2.582h-1.242v2.582h-.788V9.415h1.724Zm-.044.683h-.892v2.318h.936c.338 0 .615-.043.831-.131a.956.956 0 0 0 .473-.402c.105-.175.157-.394.157-.657 0-.274-.055-.493-.166-.656a.905.905 0 0 0-.49-.359c-.222-.075-.505-.114-.849-.114Zm5.74 5.564h-.787v-5.556h-1.951v-.691h4.681v.691h-1.942v5.556Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M21.235 17.5a8.31 8.31 0 0 1-7.205 4.165A8.31 8.31 0 0 1 6.825 17.5c.823 3.4 3.737 5.915 7.205 5.915 3.469 0 6.382-2.514 7.205-5.915Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), W1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    d: "m20.01 15.768-4.242 4.242a5.5 5.5 0 1 1-7.778-7.778l4.242-4.242a5.5 5.5 0 1 1 7.778 7.778Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M11.172 16.828a1 1 0 0 0 1.414 0L15.414 14l.707.707-2.828 2.828a2 2 0 1 1-2.829-2.828l.708.707a1 1 0 0 0 0 1.414ZM12.586 14l2.828-2.829a1 1 0 1 1 1.414 1.415l.708.707a2 2 0 0 0-2.829-2.829l-2.828 2.829.707.707Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M15.414 16.828 18.243 14a3 3 0 0 0-2.289-5.117l-.869-.869a4 4 0 0 1 3.864 6.693l-2.828 2.828-.707-.707Zm-.707 2.122a4 4 0 1 1-5.657-5.657l4.243-4.243.707.707L9.757 14A3 3 0 1 0 14 18.242l.707.708Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), q1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: z,
            height: z,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("path", {
                    stroke: "#fff",
                    d: "m15.768 7.99 4.242 4.242a5.5 5.5 0 1 1-7.778 7.778L7.99 15.768a5.5 5.5 0 1 1 7.778-7.778Z",
                    style: {
                        stroke: "#fff",
                        strokeOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M16.828 16.828a1 1 0 0 0 0-1.414L14 12.586l.707-.707 2.828 2.828a2 2 0 1 1-2.828 2.828l.707-.707a1 1 0 0 0 1.414 0ZM14 15.414l-2.828-2.828a1 1 0 0 1 1.414-1.414l.707-.708a2 2 0 0 0-2.829 2.829l2.829 2.828.707-.707Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: "#fff",
                    fillRule: "evenodd",
                    d: "M16.828 12.586 14 9.757a3 3 0 0 0-5.117 2.289l-.869.869a4 4 0 0 1 6.693-3.864l2.828 2.828-.707.707Zm2.122.707a4 4 0 1 1-5.657 5.657L9.05 14.707 9.757 14 14 18.243A3 3 0 1 0 18.243 14l.707-.707Z",
                    clipRule: "evenodd",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                })
            ]
        }), X1 = ()=>h.jsx(hi, {
            icon: Qa,
            $reverse: !0
        }), Y1 = ()=>h.jsx(hi, {
            icon: Qa,
            $reverse: !1
        }), Z1 = ()=>h.jsx(hi, {
            icon: Ka,
            $reverse: !0
        }), Q1 = ()=>h.jsx(hi, {
            icon: Ka,
            $reverse: !1
        }), K1 = {
        "x-button-left": R1,
        "y-button-left": P1,
        "a-button-right": O1,
        "b-button-right": I1,
        "thumbstick-left": k1,
        "thumbstick-up-left": C1,
        "thumbstick-down-left": N1,
        "thumbstick-right-left": z1,
        "thumbstick-left-left": F1,
        "pose-left": X1,
        "pinch-left": Z1,
        "thumbstick-right": L1,
        "thumbstick-up-right": D1,
        "thumbstick-down-right": B1,
        "thumbstick-right-right": U1,
        "thumbstick-left-right": j1,
        "trigger-left": $1,
        "trigger-right": H1,
        "squeeze-left": V1,
        "squeeze-right": G1,
        "thumbrest-left": W1,
        "thumbrest-right": q1,
        "pose-right": Y1,
        "pinch-right": Q1
    }, Wi = ({ buttonName: t, handedness: e })=>{
        const n = `${t}-${e}`, i = K1[n];
        return i ? h.jsx(i, {}) : h.jsx("div", {
            style: {
                width: L.height,
                height: L.height
            }
        });
    }, J1 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: 12,
            height: 16,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("g", {
                    clipPath: "url(#a)",
                    children: h.jsx("path", {
                        stroke: "#fff",
                        d: "M.5 6.5H6m-5.5 0V5C.5 2.237 2.237.5 5 .5h1m-5.5 6V11c0 2.762 1.737 4.5 4.5 4.5h2c2.762 0 4.5-1.738 4.5-4.5V6.5M6 6.5v-6m0 6h5.5M6 .5h1c2.762 0 4.5 1.737 4.5 4.5v1.5",
                        style: {
                            stroke: "#fff",
                            strokeOpacity: 1
                        }
                    })
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M.5 6.5H6v-6H5C2.237.5.5 2.237.5 5v1.5Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("defs", {
                    children: h.jsx("clipPath", {
                        id: "a",
                        children: h.jsx("path", {
                            fill: "#fff",
                            d: "M0 0h12v16H0z",
                            style: {
                                fill: "#fff",
                                fillOpacity: 1
                            }
                        })
                    })
                })
            ]
        }), e2 = ({ scale: t = 1.2 })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: 12,
            height: 16,
            fill: "none",
            transform: `scale(${t}, ${t})`,
            children: [
                h.jsx("g", {
                    clipPath: "url(#a)",
                    children: h.jsx("path", {
                        stroke: "#fff",
                        d: "M.5 6.5H6m-5.5 0V5C.5 2.237 2.237.5 5 .5h1m-5.5 6V11c0 2.762 1.737 4.5 4.5 4.5h2c2.762 0 4.5-1.738 4.5-4.5V6.5M6 6.5v-6m0 6h5.5M6 .5h1c2.762 0 4.5 1.737 4.5 4.5v1.5",
                        style: {
                            stroke: "#fff",
                            strokeOpacity: 1
                        }
                    })
                }),
                h.jsx("path", {
                    fill: "#fff",
                    d: "M11.5 6.5H6v-6h1c2.762 0 4.5 1.737 4.5 4.5v1.5Z",
                    style: {
                        fill: "#fff",
                        fillOpacity: 1
                    }
                }),
                h.jsx("defs", {
                    children: h.jsx("clipPath", {
                        id: "a",
                        children: h.jsx("path", {
                            fill: "#fff",
                            d: "M0 0h12v16H0z",
                            style: {
                                fill: "#fff",
                                fillOpacity: 1
                            }
                        })
                    })
                })
            ]
        }), t2 = ({ size: t = 14, color: e = R.textWhite })=>h.jsx("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: t,
            height: t,
            viewBox: "0 0 14 14",
            fill: "none",
            children: h.jsx("path", {
                stroke: e,
                strokeWidth: 1.5,
                d: "M7 13.037V5.512m-.324.289 6.3-2.275m-11.952 0 6.3 2.275m.23 6.937 4.233-1.528a1.627 1.627 0 0 0 1.076-1.53V4.396c0-.685-.43-1.297-1.076-1.53L7.553 1.339a1.63 1.63 0 0 0-1.106 0L2.213 2.867a1.627 1.627 0 0 0-1.075 1.53V9.68c0 .686.43 1.298 1.075 1.53l4.234 1.529a1.63 1.63 0 0 0 1.106 0Z",
                style: {
                    stroke: e,
                    strokeOpacity: 1
                }
            })
        }), n2 = ({ size: t = 14, color: e = R.textWhite })=>h.jsx("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: t,
            height: t,
            viewBox: "0 0 14 14",
            fill: "none",
            children: h.jsx("path", {
                stroke: e,
                strokeWidth: 1.2,
                d: "M7 13.037V5.512M3.937 11.9V4.375m6.126 7.525V4.375M6.675 5.8l6.3-2.275m-9.275.962 6.3-2.275M1.024 3.526l6.3 2.275M6.85 9.388l6.3-2.275m-12.302 0 6.3 2.276m-3.15-7.176 6.3 2.276m-2.746 8.248 4.234-1.527a1.627 1.627 0 0 0 1.075-1.53V4.396c0-.685-.43-1.297-1.075-1.53L7.553 1.339a1.63 1.63 0 0 0-1.106 0L2.213 2.867a1.627 1.627 0 0 0-1.076 1.53V9.68c0 .686.43 1.298 1.076 1.53l4.234 1.529a1.63 1.63 0 0 0 1.106 0Z",
                style: {
                    stroke: e,
                    strokeOpacity: 1
                }
            })
        }), i2 = ({ size: t = 14, color: e = R.textWhite })=>h.jsx("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: t,
            height: t,
            viewBox: "0 0 14 14",
            fill: "none",
            children: h.jsx("path", {
                stroke: e,
                strokeWidth: 1.2,
                d: "M1.225 8.225h11.55M2.1 5.075h9.8m-7 7L5.6 2.1m3.5 9.975L8.4 2.1m-5.708 9.712h8.617a1.75 1.75 0 0 0 1.696-2.183l-1.567-6.125a1.75 1.75 0 0 0-1.695-1.317H4.258c-.8 0-1.498.542-1.696 1.317L.996 9.629a1.75 1.75 0 0 0 1.696 2.183Z",
                style: {
                    stroke: e,
                    strokeOpacity: 1
                }
            })
        }), ma = ({ size: t = 14, color: e = R.textWhite })=>h.jsxs("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            width: t,
            height: t,
            viewBox: "0 0 14 14",
            fill: "none",
            children: [
                h.jsx("path", {
                    fill: e,
                    d: "M10.5 8.367a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z",
                    style: {
                        fill: e,
                        fillOpacity: 1
                    }
                }),
                h.jsx("path", {
                    fill: e,
                    fillRule: "evenodd",
                    d: "M0 5.8A2.8 2.8 0 0 1 2.8 3h8.4A2.8 2.8 0 0 1 14 5.8v2.8a2.8 2.8 0 0 1-2.8 2.8H9.526c-.619 0-1.184-.35-1.46-.903l-.108-.214a.933.933 0 0 0-.835-.516h-.246c-.354 0-.677.2-.835.516l-.107.214a1.633 1.633 0 0 1-1.461.903H2.8A2.8 2.8 0 0 1 0 8.6V5.8Zm4.9 1.167a1.4 1.4 0 1 1-2.8 0 1.4 1.4 0 0 1 2.8 0Zm8.367-.768a.268.268 0 0 0 .076-.292 2.942 2.942 0 0 0-.187-.407l-.055-.096a3.012 3.012 0 0 0-.262-.37.27.27 0 0 0-.29-.08l-.66.21a2.279 2.279 0 0 0-.522-.302l-.148-.676a.268.268 0 0 0-.215-.211 3.062 3.062 0 0 0-1.008.001.268.268 0 0 0-.215.21l-.148.677a2.28 2.28 0 0 0-.522.301l-.66-.21a.268.268 0 0 0-.29.081c-.096.116-.184.24-.262.37l-.056.096c-.072.13-.135.265-.187.406a.268.268 0 0 0 .076.292l.513.467a2.293 2.293 0 0 0 0 .603l-.513.467a.268.268 0 0 0-.076.291c.052.141.115.276.187.407l.056.096c.078.13.166.253.262.37a.27.27 0 0 0 .29.08l.66-.211c.158.122.333.224.52.3l.149.677a.268.268 0 0 0 .215.211 3.06 3.06 0 0 0 1.007 0 .268.268 0 0 0 .216-.21l.148-.677a2.28 2.28 0 0 0 .521-.301l.66.21c.105.033.22.004.29-.08.097-.117.184-.24.263-.37l.055-.097c.073-.13.135-.265.188-.406a.268.268 0 0 0-.076-.292l-.513-.466a2.299 2.299 0 0 0 0-.602l.513-.467Z",
                    clipRule: "evenodd",
                    style: {
                        fill: e,
                        fillOpacity: 1
                    }
                })
            ]
        }), Ke = {
        KeyA: "A",
        KeyB: "B",
        KeyC: "C",
        KeyD: "D",
        KeyE: "E",
        KeyF: "F",
        KeyG: "G",
        KeyH: "H",
        KeyI: "I",
        KeyJ: "J",
        KeyK: "K",
        KeyL: "L",
        KeyM: "M",
        KeyN: "N",
        KeyO: "O",
        KeyP: "P",
        KeyQ: "Q",
        KeyR: "R",
        KeyS: "S",
        KeyT: "T",
        KeyU: "U",
        KeyV: "V",
        KeyW: "W",
        KeyX: "X",
        KeyY: "Y",
        KeyZ: "Z",
        Digit0: "0",
        Digit1: "1",
        Digit2: "2",
        Digit3: "3",
        Digit4: "4",
        Digit5: "5",
        Digit6: "6",
        Digit7: "7",
        Digit8: "8",
        Digit9: "9",
        Tab: h.jsx(H, {
            icon: g1
        }),
        Backspace: h.jsx(H, {
            icon: E1
        }),
        Enter: h.jsx(H, {
            style: {
                transform: "rotate(90deg)"
            },
            icon: M1
        }),
        ShiftLeft: h.jsx(H, {
            icon: al
        }),
        ShiftRight: h.jsx(H, {
            icon: al
        }),
        Space: " ",
        ArrowUp: h.jsx(H, {
            icon: x1
        }),
        ArrowDown: h.jsx(H, {
            icon: T1
        }),
        ArrowLeft: h.jsx(H, {
            icon: p1
        }),
        ArrowRight: h.jsx(H, {
            icon: f1
        }),
        Semicolon: ";",
        Equal: "=",
        Comma: ",",
        Minus: "-",
        Period: ".",
        Slash: "/",
        Backquote: "`",
        BracketLeft: "[",
        Backslash: "\\",
        BracketRight: "]",
        Quote: "'",
        MouseLeft: h.jsx(J1, {}),
        MouseRight: h.jsx(e2, {})
    }, r2 = {
        left: {
            "thumbstick-up": "KeyW",
            "thumbstick-down": "KeyS",
            "thumbstick-left": "KeyA",
            "thumbstick-right": "KeyD",
            thumbstick: "KeyR",
            "x-button": "KeyX",
            "y-button": "KeyZ",
            trigger: "KeyQ",
            squeeze: "KeyE",
            pinch: "MouseLeft",
            pose: "KeyF"
        },
        right: {
            "thumbstick-up": "ArrowUp",
            "thumbstick-down": "ArrowDown",
            "thumbstick-left": "ArrowLeft",
            "thumbstick-right": "ArrowRight",
            thumbstick: "Slash",
            "a-button": "Enter",
            "b-button": "ShiftRight",
            trigger: "MouseLeft",
            squeeze: "MouseRight",
            pinch: "MouseRight",
            pose: "Backslash"
        }
    }, Ja = Pa((t)=>({
            keyMap: r2,
            bindKey: (e, n, i = "Unmapped")=>t((r)=>({
                        keyMap: {
                            ...r.keyMap,
                            [e]: {
                                ...r.keyMap[e],
                                [n]: i
                            }
                        }
                    }))
        })), s2 = Y.div`
	display: flex;
	height: ${L.height};
	align-items: center;
	justify-content: space-between;
	margin-bottom: ${L.gap};

	&:last-child {
		margin-bottom: 0;
	}
`, cu = ({ handedness: t, actions: e })=>{
        const { keyMap: n, bindKey: i } = Ja(), [r, s] = $.useState(null), a = (o)=>{
            s({
                action: o
            });
        };
        return $.useEffect(()=>{
            const o = (u)=>{
                r && Ke[u.code] && (i(t, r.action, u.code), s(null));
            }, l = (u)=>{
                if (r) {
                    const d = u.button === 0 ? "MouseLeft" : u.button === 2 ? "MouseRight" : null;
                    d && Ke[d] && (i(t, r.action, d), s(null));
                }
            }, c = (u)=>{
                u.preventDefault();
            };
            return window.addEventListener("keydown", o), window.addEventListener("mousedown", l), window.addEventListener("contextmenu", c), ()=>{
                window.removeEventListener("keydown", o), window.removeEventListener("mousedown", l), window.removeEventListener("contextmenu", c);
            };
        }, [
            r
        ]), Object.keys(n[t]).filter((o)=>e.includes(o)).map((o)=>h.jsxs(s2, {
                children: [
                    h.jsx(Wi, {
                        buttonName: o === "up" ? "thumbstick" : o,
                        handedness: t
                    }),
                    h.jsxs(jt, {
                        $reverse: !1,
                        children: [
                            h.jsx(_e, {
                                $reverse: !1,
                                style: {
                                    width: "100px",
                                    background: r && r.action === o ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent
                                },
                                onClick: ()=>a(o),
                                onContextMenu: (l)=>l.preventDefault(),
                                children: n[t][o]
                            }),
                            h.jsx(_e, {
                                style: {
                                    width: L.widthShort
                                },
                                $reverse: !1,
                                onClick: ()=>i(t, o),
                                onContextMenu: (l)=>l.preventDefault(),
                                children: h.jsx(tr, {
                                    icon: m1
                                })
                            })
                        ]
                    })
                ]
            }, o));
    }, a2 = ({ xrController: t, buttonId: e, pointerLocked: n, mappedKey: i })=>{
        const [r, s] = $.useState(!1), [a, o] = $.useState(!1), [l, c] = $.useState(!1), [u, d] = $.useState(0), f = t.inputSource.handedness;
        return $.useEffect(()=>{
            const g = (v)=>{
                v.code === i && (t.updateButtonValue(e, 1), c(!0));
            }, p = (v)=>{
                v.code === i && (t.updateButtonValue(e, 0), c(!1));
            }, x = (v)=>{
                (i === "MouseLeft" && v.button === 0 || i === "MouseRight" && v.button === 2) && (t.updateButtonValue(e, 1), c(!0));
            }, y = (v)=>{
                (i === "MouseLeft" && v.button === 0 || i === "MouseRight" && v.button === 2) && (t.updateButtonValue(e, 0), c(!1));
            };
            return n ? i === "MouseLeft" || i === "MouseRight" ? (window.addEventListener("mousedown", x), window.addEventListener("mouseup", y)) : (window.addEventListener("keydown", g), window.addEventListener("keyup", p)) : i === "MouseLeft" || i === "MouseRight" ? (window.removeEventListener("mousedown", x), window.removeEventListener("mouseup", y)) : (window.removeEventListener("keydown", g), window.removeEventListener("keyup", p)), ()=>{
                i === "MouseLeft" || i === "MouseRight" ? (window.removeEventListener("mousedown", x), window.removeEventListener("mouseup", y)) : (window.removeEventListener("keydown", g), window.removeEventListener("keyup", p));
            };
        }, [
            i,
            n,
            e,
            t
        ]), h.jsxs(ri, {
            $reverse: f === "right",
            children: [
                h.jsx(Wi, {
                    buttonName: e,
                    handedness: f
                }),
                h.jsx(jt, {
                    $reverse: f === "right",
                    children: n ? h.jsx(pt, {
                        $pressed: l,
                        children: Ke[i]
                    }) : h.jsxs(h.Fragment, {
                        children: [
                            h.jsx(_e, {
                                $reverse: f === "right",
                                style: {
                                    background: a ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                    width: L.widthLong
                                },
                                onClick: ()=>{
                                    o(!0), t.updateButtonValue(e, 1), setTimeout(()=>{
                                        o(!1), t.updateButtonValue(e, 0);
                                    }, 250);
                                },
                                children: "Press"
                            }),
                            h.jsx(_e, {
                                title: "Click to toggle touch state",
                                $reverse: f === "right",
                                style: {
                                    background: r ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                    width: L.widthShort
                                },
                                onClick: ()=>{
                                    s(!r), t.updateButtonTouch(e, !r);
                                },
                                children: h.jsx(H, {
                                    icon: Za
                                })
                            }),
                            h.jsx(tu, {
                                $reverse: f === "right",
                                value: u,
                                onChange: (g)=>{
                                    const p = Number(g.target.value);
                                    d(p), t.updateButtonValue(e, p / 100);
                                },
                                min: "0",
                                max: "100"
                            })
                        ]
                    })
                })
            ]
        });
    }, o2 = ({ xrController: t, buttonId: e, pointerLocked: n, mappedKey: i })=>{
        const [r, s] = $.useState(!1), [a, o] = $.useState(!1), [l, c] = $.useState(!1), [u, d] = $.useState(!1), f = t.inputSource.handedness;
        return $.useEffect(()=>{
            const g = (x)=>{
                x.code === i && (t.updateButtonValue(e, 1), d(!0));
            }, p = (x)=>{
                x.code === i && (t.updateButtonValue(e, 0), d(!1));
            };
            return n ? (window.addEventListener("keydown", g), window.addEventListener("keyup", p)) : (window.removeEventListener("keydown", g), window.removeEventListener("keyup", p)), ()=>{
                window.removeEventListener("keydown", g), window.removeEventListener("keyup", p);
            };
        }, [
            i,
            n,
            e,
            t
        ]), h.jsxs(ri, {
            $reverse: f === "right",
            children: [
                h.jsx(Wi, {
                    buttonName: e,
                    handedness: f
                }),
                h.jsx(jt, {
                    $reverse: f === "right",
                    children: n ? h.jsx(pt, {
                        $pressed: u,
                        children: Ke[i]
                    }) : h.jsxs(h.Fragment, {
                        children: [
                            h.jsx(_e, {
                                $reverse: f === "right",
                                style: {
                                    background: l ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                    width: L.widthLong
                                },
                                onClick: ()=>{
                                    c(!0), t.updateButtonValue(e, 1), setTimeout(()=>{
                                        c(!1), t.updateButtonValue(e, 0);
                                    }, 250);
                                },
                                children: "Press"
                            }),
                            h.jsx(_e, {
                                title: "Click to toggle touch state",
                                $reverse: f === "right",
                                style: {
                                    background: r ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                    width: L.widthShort
                                },
                                onClick: ()=>{
                                    s(!r), t.updateButtonTouch(e, !r);
                                },
                                children: h.jsx(H, {
                                    icon: Za
                                })
                            }),
                            h.jsx(_e, {
                                $reverse: f === "right",
                                style: {
                                    background: a ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                    width: L.widthLong
                                },
                                onClick: ()=>{
                                    o(!a), t.updateButtonValue(e, a ? 0 : 1);
                                },
                                children: "Hold"
                            })
                        ]
                    })
                })
            ]
        });
    }, l2 = Y.div`
	display: flex;
	align-items: center;
	margin-bottom: ${L.gap};
`, cl = `calc(2 * ${L.height} + ${L.gap})`, c2 = Y.button`
	background: ${R.gradientGreyTranslucent};
	border: none;
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 0;
	pointer-events: none;
	width: ${cl};
	height: ${cl};
	border-radius: 50%;
	position: relative;
	margin: 0 5px;
`, u2 = Y.div`
	position: absolute;
	font-size: 50px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: ${R.textWhite};
	cursor: pointer;
	pointer-events: auto;
`, ul = Y(_e)`
	width: ${L.widthLong};
	font-size: ${L.fontSize};

	${({ $reverse: t })=>t ? `
    &:first-child {
      border-radius: ${L.radiusLast};
    }

    &:last-child {
      border-radius: ${L.radiusFirst};
    }
  ` : `
    &:first-child {
      border-radius: ${L.radiusFirst};
    }

    &:last-child {
      border-radius: ${L.radiusLast};
    }
  `}
`, h2 = ({ xrController: t, pointerLocked: e, buttonId: n, mappedKeyUp: i, mappedKeyDown: r, mappedKeyLeft: s, mappedKeyRight: a, mappedKeyPressed: o })=>{
        const l = $.useRef(null), [c, u] = $.useState(!1), [d, f] = $.useState(!1), [g, p] = $.useState(!1), [x, y] = $.useState(!1), [v, w] = $.useState({
            x: 0,
            y: 0
        }), [T, S] = $.useState({
            up: !1,
            down: !1,
            left: !1,
            right: !1,
            pressed: !1
        }), E = t.inputSource.handedness, _ = ()=>{
            if (l.current) {
                const te = l.current.getBoundingClientRect();
                w({
                    x: te.left + te.width / 2,
                    y: te.top + te.height / 2
                }), u(!0);
            }
        }, k = (te)=>{
            if (c && l.current) {
                const ue = te.clientX - v.x, ee = te.clientY - v.y, q = Math.sqrt(ue * ue + ee * ee), C = 12;
                let j, Ae;
                if (q < C) j = ue, Ae = ee;
                else {
                    const yn = Math.atan2(ee, ue);
                    j = Math.cos(yn) * C, Ae = Math.sin(yn) * C;
                }
                l.current.style.transform = `translate(${j}px, ${Ae}px)`;
                const Tt = j / C, Wt = Ae / C;
                t.updateAxes(n, Tt, Wt);
            }
        }, N = ()=>{
            u(!1), l.current && (l.current.style.transform = "translate(0, 0)", t.updateAxes(n, 0, 0));
        };
        return $.useEffect(()=>{
            const te = (q)=>{
                const C = {
                    ...T
                };
                q.code === i && (C.up = !0), q.code === r && (C.down = !0), q.code === s && (C.left = !0), q.code === a && (C.right = !0), q.code === o && (C.pressed = !0, t.updateButtonValue(n, 1)), S(C), ee(C);
            }, ue = (q)=>{
                const C = {
                    ...T
                };
                q.code === i && (C.up = !1), q.code === r && (C.down = !1), q.code === s && (C.left = !1), q.code === a && (C.right = !1), q.code === o && (C.pressed = !1, t.updateButtonValue(n, 0)), S(C), ee(C);
            }, ee = (q)=>{
                const C = (q.right ? 1 : 0) - (q.left ? 1 : 0), j = (q.down ? 1 : 0) - (q.up ? 1 : 0), Ae = Math.sqrt(C * C + j * j);
                if (Ae === 0) {
                    t.updateAxes(n, 0, 0);
                    return;
                }
                const Tt = C / Ae, Wt = j / Ae;
                t.updateAxes(n, Tt, Wt);
            };
            return e ? (window.addEventListener("keydown", te), window.addEventListener("keyup", ue)) : (window.removeEventListener("keydown", te), window.removeEventListener("keyup", ue)), ()=>{
                window.removeEventListener("keydown", te), window.removeEventListener("keyup", ue);
            };
        }, [
            i,
            r,
            s,
            a,
            e,
            T
        ]), $.useEffect(()=>(document.addEventListener("mousemove", k), document.addEventListener("mouseup", N), ()=>{
                document.removeEventListener("mousemove", k), document.removeEventListener("mouseup", N);
            }), [
            c,
            v
        ]), e ? h.jsxs(h.Fragment, {
            children: [
                h.jsxs(ri, {
                    $reverse: E === "right",
                    children: [
                        h.jsx(Wi, {
                            buttonName: "thumbstick",
                            handedness: t.inputSource.handedness
                        }),
                        h.jsxs(jt, {
                            $reverse: E === "right",
                            children: [
                                h.jsx(pt, {
                                    $pressed: T.up,
                                    children: Ke[i]
                                }),
                                h.jsx(pt, {
                                    $pressed: T.pressed,
                                    children: Ke[o]
                                })
                            ]
                        })
                    ]
                }),
                h.jsx(ri, {
                    $reverse: E === "right",
                    style: E === "right" ? {
                        marginRight: "2px"
                    } : {
                        marginLeft: "2px"
                    },
                    children: h.jsxs(jt, {
                        $reverse: !1,
                        style: {
                            margin: 0
                        },
                        children: [
                            h.jsx(pt, {
                                $pressed: T.left,
                                children: Ke[s]
                            }),
                            h.jsx(pt, {
                                $pressed: T.down,
                                children: Ke[r]
                            }),
                            h.jsx(pt, {
                                $pressed: T.right,
                                children: Ke[a]
                            })
                        ]
                    })
                })
            ]
        }) : h.jsx(l2, {
            style: {
                flexDirection: t.inputSource.handedness === "left" ? "row" : "row-reverse",
                alignItems: "flex-start"
            },
            children: h.jsxs(h.Fragment, {
                children: [
                    h.jsx(Wi, {
                        buttonName: "thumbstick",
                        handedness: t.inputSource.handedness
                    }),
                    h.jsx(c2, {
                        style: {
                            margin: "0 5px"
                        },
                        children: h.jsx(u2, {
                            ref: l,
                            onMouseDown: _,
                            children: h.jsx(H, {
                                icon: Jr,
                                $size: 50
                            })
                        })
                    }),
                    h.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: E === "right" ? "start" : "end"
                        },
                        children: [
                            h.jsx(_e, {
                                $reverse: E === "right",
                                style: {
                                    background: x ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                    width: `calc(${L.widthLong} + ${L.widthShort} + ${L.gap})`,
                                    marginBottom: L.gap,
                                    borderRadius: L.radiusSolo
                                },
                                onClick: ()=>{
                                    y(!0), t.updateButtonValue(n, 1), setTimeout(()=>{
                                        y(!1), t.updateButtonValue(n, 0);
                                    }, 250);
                                },
                                children: "Press"
                            }),
                            h.jsxs(jt, {
                                $reverse: E === "right",
                                children: [
                                    h.jsx(ul, {
                                        title: "Click to toggle touch state",
                                        $reverse: t.inputSource.handedness !== "left",
                                        style: {
                                            background: d ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                            width: L.widthShort
                                        },
                                        onClick: ()=>{
                                            f(!d), t.updateButtonTouch(n, !d);
                                        },
                                        children: h.jsx(H, {
                                            icon: Za
                                        })
                                    }),
                                    h.jsx(ul, {
                                        $reverse: t.inputSource.handedness !== "left",
                                        style: {
                                            background: g ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                            width: L.widthLong
                                        },
                                        onClick: ()=>{
                                            p(!g), t.updateButtonValue(n, g ? 0 : 1);
                                        },
                                        children: "Hold"
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        });
    };
    function bn(t, e) {
        const n = Math.pow(10, e);
        return Math.round(t * n) / n;
    }
    const d2 = Y.div`
	width: 100%;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin: 0;
	font-size: 12px;
`, qi = ({ vector: t, label: e = "", icon: n, multiplier: i = 1, precision: r = 2, onValidInput: s = ()=>{}, marginBottom: a = "0" })=>{
        const [o, l] = $.useState({
            x: (t.x / i).toFixed(r),
            y: (t.y / i).toFixed(r),
            z: (t.z / i).toFixed(r)
        }), c = $.useRef({
            x: bn(t.x / i, r),
            y: bn(t.y / i, r),
            z: bn(t.z / i, r)
        }), u = $.useRef(null), d = ()=>{
            const g = {
                x: bn(t.x / i, r),
                y: bn(t.y / i, r),
                z: bn(t.z / i, r)
            }, { x: p, y: x, z: y } = c.current;
            (g.x !== p || g.y !== x || g.z !== y) && (c.current = g, l({
                x: g.x.toFixed(r),
                y: g.y.toFixed(r),
                z: g.z.toFixed(r)
            })), u.current = requestAnimationFrame(d);
        };
        $.useEffect(()=>(u.current = requestAnimationFrame(d), ()=>{
                u.current && cancelAnimationFrame(u.current);
            }), [
            t,
            i,
            r
        ]);
        const f = (g)=>(p)=>{
                const x = p.target.value, y = parseFloat(x);
                l((v)=>({
                        ...v,
                        [g]: x
                    })), isNaN(y) || (c.current[g] = y, t[g] = y * i, s());
            };
        return h.jsxs(d2, {
            style: {
                marginBottom: a
            },
            children: [
                n ? h.jsx(H, {
                    icon: n,
                    style: {
                        marginRight: "5px"
                    }
                }) : h.jsx("span", {
                    style: {
                        marginRight: "5px"
                    },
                    children: e
                }),
                h.jsx(nu, {
                    children: [
                        "x",
                        "y",
                        "z"
                    ].map((g)=>h.jsxs("div", {
                            style: {
                                position: "relative",
                                display: "inline-block",
                                height: "25px"
                            },
                            children: [
                                h.jsx(iu, {
                                    value: o[g],
                                    onChange: f(g),
                                    className: parseFloat(o[g]) !== c.current[g] ? "invalid" : void 0
                                }),
                                h.jsx(ru, {
                                    children: g.toUpperCase()
                                })
                            ]
                        }, `${e}-${g}`))
                })
            ]
        });
    };
    function f2(t) {
        const e = new Set;
        for (const i of t.axes)i && i.id && e.add(i.id);
        const n = t.buttons.filter((i)=>i !== null).map((i)=>({
                id: i.id,
                type: i.type,
                hasAxes: e.has(i.id)
            }));
        return n.sort((i, r)=>i.hasAxes && !r.hasAxes ? -1 : !i.hasAxes && r.hasAxes ? 1 : 0), n;
    }
    const p2 = ({ controller: t, handle: e, handedness: n, pointerLocked: i })=>{
        const { keyMap: r } = Ja(), [s, a] = se.useState(t.connected), [o, l] = se.useState(!1), c = f2(t.gamepadConfig), u = c.flatMap((d)=>d.hasAxes ? [
                `${d.id}-left`,
                `${d.id}-right`,
                `${d.id}-up`,
                `${d.id}-down`,
                d.id
            ] : d.id);
        return se.useEffect(()=>{
            i && l(!1);
        }, [
            i
        ]), h.jsxs(Hi, {
            style: n === "left" ? {
                left: "8px",
                bottom: "8px"
            } : {
                right: "8px",
                bottom: "8px"
            },
            children: [
                !i && h.jsx(h.Fragment, {
                    children: h.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center"
                        },
                        children: [
                            h.jsxs("div", {
                                style: {
                                    fontSize: "13px",
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center"
                                },
                                children: [
                                    h.jsx(H, {
                                        icon: su,
                                        style: {
                                            marginRight: "5px"
                                        }
                                    }),
                                    "Controller ",
                                    h.jsxs("span", {
                                        style: {
                                            fontWeight: "bold"
                                        },
                                        children: [
                                            "[",
                                            n === "left" ? "L" : "R",
                                            "]"
                                        ]
                                    })
                                ]
                            }),
                            h.jsx("div", {
                                style: {
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: "1px"
                                },
                                children: s ? h.jsxs(h.Fragment, {
                                    children: [
                                        h.jsx(cn, {
                                            title: `Click to ${o ? "close" : "change"} key bindings`,
                                            onClick: ()=>{
                                                l(!o);
                                            },
                                            children: h.jsx(H, {
                                                icon: lu
                                            })
                                        }),
                                        h.jsx(cn, {
                                            title: `Click to disconnect ${n} controller`,
                                            $isRed: !0,
                                            onClick: ()=>{
                                                t.connected = !1, a(!1);
                                            },
                                            children: h.jsx(H, {
                                                icon: Jr
                                            })
                                        })
                                    ]
                                }) : h.jsx(cn, {
                                    title: `Click to reconnect ${n} controller`,
                                    onClick: ()=>{
                                        t.connected = !0, a(!0);
                                    },
                                    style: {
                                        marginLeft: "5px"
                                    },
                                    children: h.jsx(H, {
                                        icon: ou
                                    })
                                })
                            })
                        ]
                    })
                }),
                s && !i && h.jsxs(h.Fragment, {
                    children: [
                        !o && h.jsxs(h.Fragment, {
                            children: [
                                h.jsx(mn, {}),
                                h.jsx(qi, {
                                    vector: e.position,
                                    label: "Position",
                                    marginBottom: L.gap
                                }),
                                h.jsx(qi, {
                                    vector: e.rotation,
                                    label: "Rotation"
                                })
                            ]
                        }),
                        h.jsx(mn, {})
                    ]
                }),
                s && (o ? h.jsx(cu, {
                    handedness: n,
                    actions: u
                }) : c.map((d)=>{
                    const f = r[n];
                    return d.hasAxes ? h.jsx(h2, {
                        xrController: t,
                        pointerLocked: i,
                        buttonId: d.id,
                        mappedKeyUp: r[n][`${d.id}-up`],
                        mappedKeyDown: f[`${d.id}-down`],
                        mappedKeyLeft: f[`${d.id}-left`],
                        mappedKeyRight: f[`${d.id}-right`],
                        mappedKeyPressed: f[d.id]
                    }, d.id) : d.type === "analog" ? h.jsx(a2, {
                        xrController: t,
                        buttonId: d.id,
                        mappedKey: f[d.id],
                        pointerLocked: i
                    }, d.id) : h.jsx(o2, {
                        xrController: t,
                        buttonId: d.id,
                        mappedKey: f[d.id],
                        pointerLocked: i
                    }, d.id);
                }))
            ]
        }, n);
    }, m2 = `calc(${L.widthLong} + ${L.widthShort} + ${L.gap})`, g2 = ({ hand: t, pointerLocked: e, mappedKey: n })=>{
        const [i, r] = $.useState(!1), [s, a] = $.useState(!1), [o, l] = $.useState(0), c = t.inputSource.handedness;
        return $.useEffect(()=>{
            const u = (p)=>{
                p.code === n && (t.updatePinchValue(1), a(!0));
            }, d = (p)=>{
                p.code === n && (t.updatePinchValue(0), a(!1));
            }, f = (p)=>{
                (n === "MouseLeft" && p.button === 0 || n === "MouseRight" && p.button === 2) && (t.updatePinchValue(1), a(!0));
            }, g = (p)=>{
                (n === "MouseLeft" && p.button === 0 || n === "MouseRight" && p.button === 2) && (t.updatePinchValue(0), a(!1));
            };
            return e ? n === "MouseLeft" || n === "MouseRight" ? (window.addEventListener("mousedown", f), window.addEventListener("mouseup", g)) : (window.addEventListener("keydown", u), window.addEventListener("keyup", d)) : n === "MouseLeft" || n === "MouseRight" ? (window.removeEventListener("mousedown", f), window.removeEventListener("mouseup", g)) : (window.removeEventListener("keydown", u), window.removeEventListener("keyup", d)), ()=>{
                n === "MouseLeft" || n === "MouseRight" ? (window.removeEventListener("mousedown", f), window.removeEventListener("mouseup", g)) : (window.removeEventListener("keydown", u), window.removeEventListener("keyup", d));
            };
        }, [
            n,
            e,
            t
        ]), h.jsxs(ri, {
            $reverse: c === "right",
            children: [
                h.jsx(hi, {
                    icon: Ka,
                    $reverse: c === "left"
                }),
                h.jsx(jt, {
                    $reverse: c === "right",
                    children: e ? h.jsx(pt, {
                        $pressed: s,
                        children: Ke[n]
                    }) : h.jsxs(h.Fragment, {
                        children: [
                            h.jsx(_e, {
                                $reverse: c === "right",
                                style: {
                                    background: i ? R.gradientLightGreyTranslucent : R.gradientGreyTranslucent,
                                    width: L.widthLong
                                },
                                onClick: ()=>{
                                    r(!0), t.updatePinchValue(1), setTimeout(()=>{
                                        r(!1), t.updatePinchValue(0);
                                    }, 250);
                                },
                                children: "Pinch"
                            }),
                            h.jsx(tu, {
                                $reverse: c === "right",
                                value: o,
                                onChange: (u)=>{
                                    const d = Number(u.target.value);
                                    l(d), t.updatePinchValue(d / 100);
                                },
                                style: {
                                    width: m2
                                },
                                min: "0",
                                max: "100"
                            })
                        ]
                    })
                })
            ]
        });
    }, gi = [
        "default",
        "point"
    ], x2 = `calc(2 * ${L.widthLong} - ${L.widthShort})`, y2 = ({ hand: t, pointerLocked: e, mappedKey: n })=>{
        const [i, r] = $.useState(t.poseId), [s, a] = $.useState(!1), o = t.inputSource.handedness, l = (u)=>{
            const f = (gi.indexOf(t.poseId) + gi.length + u) % gi.length;
            r(gi[f]), t.poseId = gi[f];
        }, c = o === "right";
        return $.useEffect(()=>{
            const u = (f)=>{
                f.code === n && (l(1), a(!0));
            }, d = (f)=>{
                f.code === n && a(!1);
            };
            return e ? (window.addEventListener("keydown", u), window.addEventListener("keyup", d)) : (window.removeEventListener("keydown", u), window.removeEventListener("keyup", d)), ()=>{
                window.removeEventListener("keydown", u), window.removeEventListener("keyup", d);
            };
        }, [
            n,
            e,
            t
        ]), h.jsxs(ri, {
            $reverse: c,
            children: [
                h.jsx(hi, {
                    icon: Qa,
                    $reverse: o === "left"
                }),
                h.jsx(jt, {
                    $reverse: c,
                    children: e ? h.jsx(pt, {
                        $pressed: s,
                        children: Ke[n]
                    }) : h.jsxs(h.Fragment, {
                        children: [
                            h.jsx(_e, {
                                $reverse: c,
                                style: {
                                    width: L.widthShort
                                },
                                onClick: ()=>{
                                    l(c ? 1 : -1);
                                },
                                children: h.jsx(H, {
                                    icon: c ? ll : ol
                                })
                            }),
                            h.jsxs(_e, {
                                $reverse: c,
                                style: {
                                    width: x2
                                },
                                disabled: !0,
                                children: [
                                    "Pose: ",
                                    i
                                ]
                            }),
                            h.jsx(_e, {
                                $reverse: c,
                                style: {
                                    width: L.widthShort
                                },
                                onClick: ()=>{
                                    l(c ? -1 : 1);
                                },
                                children: h.jsx(H, {
                                    icon: c ? ol : ll
                                })
                            })
                        ]
                    })
                })
            ]
        });
    }, v2 = ({ hand: t, handle: e, handedness: n, pointerLocked: i })=>{
        const { keyMap: r } = Ja(), [s, a] = se.useState(t.connected), [o, l] = se.useState(!1);
        return se.useEffect(()=>{
            i && l(!1);
        }, [
            i
        ]), h.jsxs(Hi, {
            style: n === "left" ? {
                left: "8px",
                bottom: "8px"
            } : {
                right: "8px",
                bottom: "8px"
            },
            children: [
                !i && h.jsx(h.Fragment, {
                    children: h.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center"
                        },
                        children: [
                            h.jsxs("div", {
                                style: {
                                    fontSize: "13px",
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center"
                                },
                                children: [
                                    h.jsx(H, {
                                        icon: au,
                                        $reverse: n === "left",
                                        style: {
                                            marginRight: "5px"
                                        }
                                    }),
                                    "Hand ",
                                    h.jsxs("span", {
                                        style: {
                                            fontWeight: "bold"
                                        },
                                        children: [
                                            "[",
                                            n === "left" ? "L" : "R",
                                            "]"
                                        ]
                                    })
                                ]
                            }),
                            h.jsx("div", {
                                style: {
                                    display: "flex",
                                    flexDirection: "row",
                                    gap: "1px"
                                },
                                children: s ? h.jsxs(h.Fragment, {
                                    children: [
                                        h.jsx(cn, {
                                            title: `Click to ${o ? "close" : "change"} key bindings`,
                                            onClick: ()=>{
                                                l(!o);
                                            },
                                            children: h.jsx(H, {
                                                icon: lu
                                            })
                                        }),
                                        h.jsx(cn, {
                                            title: `Click to disconnect ${n} controller`,
                                            $isRed: !0,
                                            onClick: ()=>{
                                                t.connected = !1, a(!1);
                                            },
                                            children: h.jsx(H, {
                                                icon: Jr
                                            })
                                        })
                                    ]
                                }) : h.jsx(cn, {
                                    title: `Click to reconnect ${n} controller`,
                                    onClick: ()=>{
                                        t.connected = !0, a(!0);
                                    },
                                    style: {
                                        marginLeft: "5px"
                                    },
                                    children: h.jsx(H, {
                                        icon: ou
                                    })
                                })
                            })
                        ]
                    })
                }),
                s && !i && h.jsxs(h.Fragment, {
                    children: [
                        !o && h.jsxs(h.Fragment, {
                            children: [
                                h.jsx(mn, {}),
                                h.jsx(qi, {
                                    vector: e.position,
                                    label: "Position",
                                    marginBottom: L.gap
                                }),
                                h.jsx(qi, {
                                    vector: e.rotation,
                                    label: "Rotation"
                                })
                            ]
                        }),
                        h.jsx(mn, {})
                    ]
                }),
                s && (o ? h.jsx(cu, {
                    handedness: n,
                    actions: [
                        "pose",
                        "pinch"
                    ]
                }) : h.jsxs(h.Fragment, {
                    children: [
                        h.jsx(y2, {
                            hand: t,
                            pointerLocked: i,
                            mappedKey: r[n].pose
                        }),
                        h.jsx(g2, {
                            hand: t,
                            pointerLocked: i,
                            mappedKey: r[n].pinch
                        })
                    ]
                }))
            ]
        }, n);
    }, eo = Pa((t)=>({
            inputMode: "controller",
            setInputMode: (e)=>t(()=>({
                        inputMode: e
                    }))
        })), w2 = ({ xrDevice: t, inputLayer: e, pointerLocked: n })=>{
        const { inputMode: i } = eo();
        return h.jsx(h.Fragment, {
            children: i === "controller" ? Object.entries(t.controllers).map(([r, s])=>h.jsx(p2, {
                    controller: s,
                    handle: e.transformHandles.get(r),
                    handedness: r,
                    pointerLocked: n
                }, `controller-${r}`)) : Object.entries(t.hands).map(([r, s])=>h.jsx(v2, {
                    hand: s,
                    handle: e.transformHandles.get(r),
                    handedness: r,
                    pointerLocked: n
                }, `hand-${r}`))
        });
    }, bs = Y.td`
	text-align: right;
	color: ${R.textWhite};
	padding: 0 8px 0 0;
	font-weight: bold;
`, Ts = Y.td`
	text-align: left;
	color: ${R.textGrey};
	padding: 0;
`, b2 = [
        "meeting_room",
        "living_room",
        "music_room",
        "office_large",
        "office_small"
    ], T2 = Pa((t)=>({
            infoPanelOpen: !1,
            envDropDownOpen: !1,
            setInfoPanelOpen: (e)=>t(()=>({
                        infoPanelOpen: e
                    })),
            setEnvDropDownOpen: (e)=>t(()=>({
                        envDropDownOpen: e
                    }))
        }));
    function E2(t) {
        return t.split("_").map((e)=>e.charAt(0).toUpperCase() + e.slice(1)).join(" ");
    }
    const _2 = ({ xrDevice: t, inputLayer: e })=>{
        var n, i, r;
        const [s, a] = se.useState(!!(!((n = t.sem) === null || n === void 0) && n.planesVisible)), [o, l] = se.useState(!!(!((i = t.sem) === null || i === void 0) && i.boundingBoxesVisible)), [c, u] = se.useState(!!(!((r = t.sem) === null || r === void 0) && r.meshesVisible)), { inputMode: d, setInputMode: f } = eo(), { infoPanelOpen: g, setInfoPanelOpen: p, envDropDownOpen: x, setEnvDropDownOpen: y } = T2();
        return h.jsxs("div", {
            style: {
                display: "flex",
                justifyContent: "center",
                flexDirection: "row",
                alignItems: "center",
                gap: "6px",
                padding: "8px"
            },
            children: [
                h.jsx(pa, {
                    children: h.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "row",
                            gap: "1px"
                        },
                        children: [
                            h.jsx(Ve, {
                                title: "Click to reset device transforms",
                                onClick: ()=>{
                                    e.resetDeviceTransforms();
                                },
                                children: h.jsx(H, {
                                    icon: y1,
                                    $size: 16
                                })
                            }),
                            h.jsx(Ve, {
                                title: "Click to activate play mode",
                                onClick: ()=>{
                                    e.lockPointer(), y(!1), p(!1);
                                },
                                children: h.jsx(H, {
                                    icon: v1,
                                    $size: 16
                                })
                            }),
                            h.jsx(Ve, {
                                title: "Click to toggle input mode",
                                onClick: ()=>{
                                    d === "controller" ? (f("hand"), t.primaryInputMode = "hand") : (f("controller"), t.primaryInputMode = "controller");
                                },
                                children: h.jsx(H, {
                                    icon: d === "controller" ? su : au,
                                    $size: 16
                                })
                            }),
                            t.sem && h.jsxs(h.Fragment, {
                                children: [
                                    h.jsx(mn, {
                                        $horizontal: !1
                                    }),
                                    h.jsx(Ve, {
                                        title: "Click to select/change emulated environment",
                                        onClick: ()=>y(!x),
                                        children: h.jsx(H, {
                                            icon: w1,
                                            $size: 16
                                        })
                                    }),
                                    h.jsx(Ve, {
                                        title: "Click to toggle visibility of planes",
                                        onClick: ()=>{
                                            t.sem.planesVisible = !s, a(!s);
                                        },
                                        children: h.jsx(i2, {
                                            size: 16,
                                            color: s ? R.textWhite : R.textGrey
                                        })
                                    }),
                                    h.jsx(Ve, {
                                        title: "Click to toggle visibility of bounding boxes",
                                        onClick: ()=>{
                                            t.sem.boundingBoxesVisible = !o, l(!o);
                                        },
                                        children: h.jsx(t2, {
                                            size: 16,
                                            color: o ? R.textWhite : R.textGrey
                                        })
                                    }),
                                    h.jsx(Ve, {
                                        title: "Click to toggle visibility of meshes",
                                        onClick: ()=>{
                                            t.sem.meshesVisible = !c, u(!c);
                                        },
                                        children: h.jsx(n2, {
                                            size: 16,
                                            color: c ? R.textWhite : R.textGrey
                                        })
                                    })
                                ]
                            }),
                            h.jsx(mn, {
                                $horizontal: !1
                            }),
                            h.jsx(Ve, {
                                title: "Click to exit XR session",
                                onClick: ()=>{
                                    const v = t.activeSession;
                                    v?.end();
                                },
                                children: h.jsx(H, {
                                    icon: d1,
                                    $size: 16
                                })
                            })
                        ]
                    })
                }),
                h.jsx(pa, {
                    children: h.jsxs("div", {
                        style: {
                            display: "flex",
                            flexDirection: "row",
                            gap: "1px"
                        },
                        children: [
                            h.jsx(Ve, {
                                title: "About IWER",
                                onClick: ()=>{
                                    p(!g);
                                },
                                children: h.jsx(ma, {
                                    size: 16
                                })
                            }),
                            h.jsx(Ve, {
                                title: "Report issues",
                                onClick: ()=>{
                                    window.open("https://github.com/meta-quest/immersive-web-emulation-runtime/issues", "_blank");
                                },
                                children: h.jsx(H, {
                                    icon: _1,
                                    $size: 16
                                })
                            })
                        ]
                    })
                }),
                g && h.jsxs(Hi, {
                    style: {
                        top: "50vh",
                        left: "50vw",
                        transform: "translate(-50%, -50%)",
                        maxWidth: "240px",
                        gap: "4px"
                    },
                    children: [
                        h.jsx("div", {
                            style: {
                                display: "flex",
                                justifyContent: "end"
                            },
                            children: h.jsx(cn, {
                                $isRed: !0,
                                onClick: ()=>{
                                    p(!1);
                                },
                                children: h.jsx(H, {
                                    icon: Jr
                                })
                            })
                        }),
                        h.jsx("div", {
                            style: {
                                display: "flex",
                                justifyContent: "center"
                            },
                            children: h.jsx(ma, {
                                size: 100
                            })
                        }),
                        h.jsxs("p", {
                            style: {
                                textAlign: "center",
                                padding: "0 5px",
                                margin: "0"
                            },
                            children: [
                                h.jsx("b", {
                                    children: "Immersive Web Emulation Runtime"
                                }),
                                " (IWER) is a free, open-source WebXR developer tool created by Meta Platforms, Inc."
                            ]
                        }),
                        h.jsx("table", {
                            style: {
                                width: "100%",
                                borderCollapse: "collapse",
                                display: "flex",
                                justifyContent: "center",
                                fontSize: "12px",
                                padding: "8px"
                            },
                            children: h.jsxs("tbody", {
                                children: [
                                    h.jsxs("tr", {
                                        children: [
                                            h.jsx(bs, {
                                                children: "IWER"
                                            }),
                                            h.jsxs(Ts, {
                                                children: [
                                                    "v",
                                                    t.version
                                                ]
                                            })
                                        ]
                                    }),
                                    h.jsxs("tr", {
                                        children: [
                                            h.jsx(bs, {
                                                children: "DevUI"
                                            }),
                                            h.jsxs(Ts, {
                                                children: [
                                                    "v",
                                                    t.devui.version
                                                ]
                                            })
                                        ]
                                    }),
                                    t.sem && h.jsxs("tr", {
                                        children: [
                                            h.jsx(bs, {
                                                children: "SEM"
                                            }),
                                            h.jsxs(Ts, {
                                                children: [
                                                    "v",
                                                    t.sem.version
                                                ]
                                            })
                                        ]
                                    })
                                ]
                            })
                        }),
                        h.jsx(_e, {
                            style: {
                                borderRadius: L.radiusSolo
                            },
                            onClick: ()=>{
                                window.open("https://github.com/meta-quest/immersive-web-emulation-runtime/blob/main/LICENSE", "_blank");
                            },
                            children: "MIT License"
                        }),
                        h.jsx(_e, {
                            style: {
                                borderRadius: L.radiusSolo
                            },
                            onClick: ()=>{
                                window.open("https://github.com/meta-quest/immersive-web-emulation-runtime", "_blank");
                            },
                            children: "View Source on GitHub"
                        })
                    ]
                }),
                x && h.jsx(Hi, {
                    style: {
                        position: "absolute",
                        top: "40px"
                    },
                    children: b2.map((v)=>h.jsx("div", {
                            children: h.jsx(Ve, {
                                style: {
                                    fontSize: "12px",
                                    width: "100%",
                                    justifyContent: "start",
                                    borderRadius: "8px"
                                },
                                onClick: ()=>{
                                    t.sem.loadDefaultEnvironment(v);
                                },
                                children: E2(v)
                            })
                        }, v))
                })
            ]
        });
    }, S2 = Y.div`
	width: 100%;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-top: ${L.gap};
	font-size: 12px;
`, M2 = Y.input.attrs({
        type: "range"
    })`
	-webkit-appearance: none;
	appearance: none;
	background: ${R.gradientGrey};
	border: 1px solid transparent;
	height: 25px;
	color: ${R.textWhite};
	width: ${L.widthLong};
	cursor: pointer;
	margin: 0;
	border-radius: 5px;
	padding: 0 10px 0 5px;
	box-sizing: border-box;
	font-size: 10px;

	&::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 8px;
		height: 25px;
		background-color: ${R.textWhite};
		border-radius: ${L.radiusMiddle};
	}

	&::-moz-range-thumb {
		width: 8px;
		height: 25px;
		background-color: ${R.textWhite};
		border-radius: ${L.radiusMiddle};
	}

	&::-ms-thumb {
		width: 8px;
		height: 25px;
		background-color: ${R.textWhite};
		border-radius: ${L.radiusMiddle};
	}
`, A2 = ({ xrDevice: t, inputLayer: e, pointerLocked: n })=>{
        const [i, r] = se.useState(t.fovy);
        return h.jsxs(Hi, {
            style: {
                left: "8px",
                top: "8px"
            },
            children: [
                h.jsxs("div", {
                    style: {
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        height: "20px"
                    },
                    children: [
                        h.jsxs("div", {
                            style: {
                                fontSize: "13px",
                                display: "flex",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyItems: "start"
                            },
                            children: [
                                h.jsx(H, {
                                    icon: S1,
                                    style: {
                                        marginRight: "5px"
                                    }
                                }),
                                h.jsx("div", {
                                    style: {
                                        alignItems: "end"
                                    },
                                    children: t.name
                                })
                            ]
                        }),
                        h.jsx("div", {
                            style: {
                                display: "flex",
                                flexDirection: "row",
                                gap: "1px"
                            }
                        })
                    ]
                }),
                h.jsx(mn, {}),
                h.jsx(qi, {
                    vector: e.combinedCameraPosition,
                    icon: b1
                }),
                !n && h.jsxs(S2, {
                    children: [
                        h.jsx(H, {
                            icon: A1,
                            style: {
                                marginRight: "5px"
                            }
                        }),
                        h.jsxs(nu, {
                            children: [
                                h.jsxs("div", {
                                    style: {
                                        position: "relative",
                                        display: "inline-block",
                                        height: "25px"
                                    },
                                    children: [
                                        h.jsx(iu, {
                                            type: "text",
                                            value: (i / Math.PI * 180).toFixed(0) + "°",
                                            readOnly: !0,
                                            style: {
                                                width: "73px"
                                            }
                                        }),
                                        h.jsx(ru, {
                                            children: "FOV-Y"
                                        })
                                    ]
                                }),
                                h.jsx("div", {
                                    style: {
                                        position: "relative",
                                        display: "inline-block"
                                    },
                                    children: h.jsx(M2, {
                                        value: i,
                                        onChange: (s)=>{
                                            const a = Number(s.target.value);
                                            r(a), t.fovy = a;
                                        },
                                        min: Math.PI / 6,
                                        max: Math.PI / 1.5,
                                        step: Math.PI / 48,
                                        style: {
                                            width: "80px"
                                        }
                                    })
                                })
                            ]
                        })
                    ]
                })
            ]
        });
    }, Es = new yt, R2 = new yt, P2 = {
        x: "XYZ",
        y: "YXZ",
        z: "ZXY"
    };
    function to(t, e, n, i, r, s) {
        Es.copy(n), r != null && Es.premultiply(R2.copy(r).invert());
        const a = new M, o = new X, l = new M;
        Es.decompose(a, o, l), fl(a, i.initialTargetPosition, s.translate ?? !0);
        let c;
        const u = s.rotate ?? !0;
        if (u === !1) o.copy(i.initialTargetQuaternion), c = i.initialTargetRotation.clone();
        else if (Array.isArray(u) || u === !0 || typeof u != "string" && !Array.isArray(u) && u.x === !0 && u.y === !0 && u.z === !0) c = new re().setFromQuaternion(o, i.initialTargetRotation.order);
        else if (typeof u == "string") {
            const d = P2[u];
            c = new re().setFromQuaternion(o, d);
            for (const f of d){
                const g = f.toLowerCase();
                g !== u && (c[g] = 0);
            }
            c.order = i.initialTargetRotation.order, o.setFromEuler(c);
        } else c = L2(o, i.initialTargetRotation, u);
        return (typeof s.scale != "object" || !s.scale.uniform) && fl(l, i.initialTargetScale, s.scale ?? !0), {
            pointerAmount: e,
            position: a,
            quaternion: o,
            rotation: c,
            scale: l,
            time: t
        };
    }
    const Tn = new Oa, En = new M, _n = new M, O2 = new M, I2 = new X;
    function hl(t, e, n) {
        return Tn.normal.copy(t), Tn.constant = 0, k2(En, Tn.normal), _n.copy(En), _n.applyQuaternion(I2.copy(e).invert().premultiply(n)), Tn.projectPoint(En, En).normalize(), Tn.projectPoint(_n, _n).normalize(), (O2.crossVectors(En, Tn.normal).dot(_n) < 0 ? 1 : -1) * En.angleTo(_n);
    }
    function k2(t, e) {
        if (e.x === 0) {
            t.set(1, 0, 0);
            return;
        }
        if (e.y === 0) {
            t.set(0, 1, 0);
            return;
        }
        if (e.z === 0) {
            t.set(0, 0, 1);
            return;
        }
        t.set(-e.y, e.x, 0);
    }
    function L2(t, e, n) {
        let i = "", r = "";
        for (const o of e.order)n[o.toLowerCase()] === !1 ? r += o : i += o;
        const s = i + r, a = new re().setFromQuaternion(t, s);
        for (const o of s){
            const l = o.toLowerCase();
            a[l] = Er(l, a[l], e[l], n);
        }
        return t.setFromEuler(a), a;
    }
    const _s = new M, dl = new Oa, C2 = new M, N2 = new M;
    function fl(t, e, n) {
        if (Array.isArray(n)) {
            switch(n.length){
                case 0:
                    t.copy(e);
                    return;
                case 1:
                    t.sub(e), uu(t, n[0] instanceof M ? n[0] : _s.fromArray(n[0])), t.add(e);
                    return;
                case 2:
                    _s.crossVectors(n[0] instanceof M ? n[0] : C2.fromArray(n[0]), n[1] instanceof M ? n[1] : N2.fromArray(n[1])), dl.setFromNormalAndCoplanarPoint(_s, e), dl.projectPoint(t, t);
                    return;
            }
            return;
        }
        t.x = Er("x", t.x, e.x, n), t.y = Er("y", t.y, e.y, n), t.z = Er("z", t.z, e.z, n);
    }
    function Er(t, e, n, i) {
        if (typeof i == "boolean") return i ? e : n;
        if (typeof i == "string") return i === t ? e : n;
        const r = i[t];
        return r === !1 ? n : Array.isArray(r) ? Wu(e, ...r) : e;
    }
    function Zn(t = !0, e, n, i, r, s) {
        if (t) {
            switch(e.length){
                case 0:
                case 3:
                    return;
                case 1:
                    z2(n, ...e, i, r, s);
                    return;
                case 2:
                    F2(...e, n, i, r, s);
                    return;
            }
            throw new Error(`space cannot be ${e.length}D but received (${e.map((a)=>a.toArray().join("/")).join("; ")})`);
        }
    }
    const _r = {
        x: new M(1, 0, 0),
        y: new M(0, 1, 0),
        z: new M(0, 0, 1)
    };
    function Qn(t, e, n, i, r) {
        if (i !== !1) {
            if (i === !0) {
                t[0] = _r.x, t[1] = _r.y, t[2] = _r.z;
                return;
            }
            if (typeof i == "string") {
                xi(t, e, n, i, r);
                return;
            }
            if (Array.isArray(i)) {
                for (const s of i)xi(t, e, n, s, r);
                return;
            }
            i.x !== !1 && xi(t, e, n, "x", r), i.y !== !1 && xi(t, e, n, "y", r), i.z !== !1 && xi(t, e, n, "z", r);
        }
    }
    const Xt = new X, or = new re, Xe = new M, Sn = new M, Yt = new M;
    function xi(t, e, n, i, r) {
        if (Array.isArray(i) ? Xe.set(...i) : i instanceof M ? Xe.copy(i) : Xe.copy(_r[i]), r === "translate") {
            Xe.applyQuaternion(e), lr(t, Xe);
            return;
        }
        if (r === "scale") {
            Array.isArray(i) ? Xt.identity() : Xt.setFromEuler(n), Xt.premultiply(e), Xe.applyQuaternion(Xt), lr(t, Xe);
            return;
        }
        if (Array.isArray(i)) or.set(0, 0, 0);
        else {
            or.copy(n);
            for(let s = 2; s >= 0; s--){
                const a = n.order[s].toLowerCase();
                if (or[a] = 0, a === i) break;
            }
        }
        Xt.setFromEuler(or).premultiply(e), Xe.normalize(), Sn.set(0, 1, 0), Xe.dot(Sn) > .99 && Sn.set(0, 0, 1), Yt.crossVectors(Xe, Sn).normalize(), Sn.copy(Yt), Yt.applyQuaternion(Xt), lr(t, Yt), Yt.crossVectors(Xe, Sn).normalize(), Yt.applyQuaternion(Xt), lr(t, Yt);
    }
    const pl = new M;
    function lr(t, e) {
        if (t.length !== 3) {
            if (t.length === 0) {
                t.push(e.clone());
                return;
            }
            if (t.length === 1) {
                Math.abs(t[0].dot(e)) < .999 && t.push(e.clone());
                return;
            }
            pl.crossVectors(t[0], t[1]), !(Math.abs(pl.dot(e)) < .001) && t.push(e.clone());
        }
    }
    const yi = new Oa, Ss = new M, ki = new M;
    function F2(t, e, n, i, r, s) {
        Ss.crossVectors(t, e).normalize(), yi.setFromNormalAndCoplanarPoint(Ss, n);
        const a = s == null ? 0 : Math.abs(Ss.dot(s));
        if (s == null || a < .01) {
            yi.projectPoint(r, r);
            return;
        }
        const l = -yi.distanceToPoint(i) / s.dot(yi.normal);
        if (l < 0) {
            yi.projectPoint(r, r);
            return;
        }
        ki.copy(r), r.copy(i).addScaledVector(s, l);
    }
    function z2(t, e, n, i, r) {
        const s = r == null ? 0 : 1 - Math.abs(e.dot(r));
        if (r == null || s < .001) {
            ml(i, t, e);
            return;
        }
        ki.subVectors(n, t);
        const a = e.dot(r), o = e.dot(ki), l = r.dot(ki), c = 1 - a * a, u = (o - a * l) / c;
        if ((a * o - l) / c < 0) {
            ml(i, t, e);
            return;
        }
        ki.copy(i), i.copy(t).addScaledVector(e, u);
    }
    function ml(t, e, n) {
        t.sub(e), uu(t, n), t.add(e);
    }
    function uu(t, e) {
        const n = t.dot(e);
        t.copy(e).multiplyScalar(n);
    }
    const Ms = new yt, cr = new yt, ur = new M, D2 = new M, Zt = new X, B2 = new M(1, 1, 1), As = [];
    function j2(t, e, n, i, r) {
        return i == null ? Zt.identity() : i.decompose(ur, Zt, D2), As.length = 0, Qn(As, Zt, n.initialTargetRotation, r.translate ?? !0, "translate"), cr.makeRotationFromQuaternion(Zt.copy(e.initialPointerWorldQuaternion).invert()).multiply(Ms.makeTranslation(ur.copy(e.initialPointerWorldPoint).negate())), n.initialTargetParentWorldMatrix != null && cr.multiply(n.initialTargetParentWorldMatrix), Zn(r.projectRays, As, e.initialPointerWorldPoint, e.pointerWorldOrigin, ur.copy(e.pointerWorldPoint), e.pointerWorldDirection), Zt.copy(e.pointerWorldQuaternion), (r.rotate ?? !0) === !1 && Zt.copy(e.initialPointerWorldQuaternion), Ms.compose(ur, Zt, B2).multiply(cr).multiply(cr.compose(n.initialTargetPosition, n.initialTargetQuaternion, n.initialTargetScale)), to(t, 1, Ms, n, i, r);
    }
    const Mn = new M, vi = new M, pe = new M, Mt = new M, U2 = new M, gl = new M, An = new M, xl = new yt, wi = new yt, hr = new yt, rt = new X, bi = new X, Rn = [];
    function V2(t, e, n, i, r, s) {
        r == null ? rt.identity() : r.decompose(pe, rt, Mt), Rn.length = 0, Qn(Rn, rt, i.initialTargetRotation, s.translate ?? !0, "translate"), Qn(Rn, rt, i.initialTargetRotation, s.rotate ?? !0, "rotate"), Qn(Rn, rt, i.initialTargetRotation, s.scale ?? !0, "scale"), Zn(s.projectRays, Rn, e.initialPointerWorldPoint, e.pointerWorldOrigin, pe.copy(e.pointerWorldPoint), e.pointerWorldDirection), Zn(s.projectRays, Rn, n.initialPointerWorldPoint, n.pointerWorldOrigin, Mt.copy(n.pointerWorldPoint), n.pointerWorldDirection), Mn.copy(n.initialPointerWorldPoint).sub(e.initialPointerWorldPoint), vi.copy(Mt).sub(pe), pe.copy(Mn), i.prevTwoPointerDeltaRotation != null && pe.applyQuaternion(i.prevTwoPointerDeltaRotation), pe.normalize(), Mt.copy(vi).normalize(), rt.setFromUnitVectors(pe, Mt), i.prevTwoPointerDeltaRotation == null ? i.prevTwoPointerDeltaRotation = new X : rt.multiply(i.prevTwoPointerDeltaRotation), i.prevTwoPointerDeltaRotation.copy(rt);
        const a = (hl(Mt, e.prevPointerWorldQuaternion, e.pointerWorldQuaternion) + hl(Mt, n.prevPointerWorldQuaternion, n.pointerWorldQuaternion)) * .5 + (i.prevAngle ?? 0);
        if (i.prevAngle = a, rt.premultiply(bi.setFromAxisAngle(Mt, a)), hr.compose(i.initialTargetPosition, i.initialTargetQuaternion, i.initialTargetScale), i.initialTargetParentWorldMatrix != null && hr.premultiply(i.initialTargetParentWorldMatrix), typeof s.scale == "object" && (s.scale.uniform ?? !1)) An.setScalar(vi.length() / Mn.length());
        else {
            hr.decompose(U2, bi, gl), pe.copy(Mn).applyQuaternion(bi.invert()).divide(gl), pe.x = Math.abs(pe.x), pe.y = Math.abs(pe.y), pe.z = Math.abs(pe.z);
            const o = Math.max(...pe.toArray());
            pe.divideScalar(o), An.set(1, 1, 1), An.addScaledVector(pe, vi.length() / Mn.length() - 1);
        }
        return xl.makeTranslation(pe.copy(vi).multiplyScalar(.5).add(e.pointerWorldPoint)).multiply(wi.makeRotationFromQuaternion(rt)).multiply(wi.makeRotationFromQuaternion(bi.invert())).multiply(wi.makeScale(An.x, An.y, An.z)).multiply(wi.makeRotationFromQuaternion(bi.invert())).multiply(wi.makeTranslation(pe.copy(Mn).multiplyScalar(.5).add(e.initialPointerWorldPoint).negate())).multiply(hr), to(t, 2, xl, i, r, s);
    }
    const oe = new M, je = new M, Rs = new M, At = new M, Qt = new M, Ue = new X, Le = new X, Rt = new yt, dt = new M, Pn = [];
    function G2(t, e, n, i, r, s) {
        if (r == null ? Ue.identity() : r.decompose(oe, Ue, je), Pn.length = 0, s.translate === "as-scale" && Qn(Pn, Ue, n.initialTargetRotation, s.scale ?? !0, "scale"), s.translate != "as-scale" && Qn(Pn, Ue, n.initialTargetRotation, s.rotate ?? !0, "rotate"), Rt.makeTranslation(n.initialTargetPosition), n.initialTargetParentWorldMatrix != null && Rt.premultiply(n.initialTargetParentWorldMatrix), At.setFromMatrixPosition(Rt), Zn(s.projectRays, Pn, e.initialPointerWorldPoint, e.pointerWorldOrigin, At, void 0), At.negate().add(e.initialPointerWorldPoint), Qt.setFromMatrixPosition(i), Zn(s.projectRays, Pn, e.initialPointerWorldPoint, e.pointerWorldOrigin, Qt, void 0), Zn(s.projectRays, Pn, e.initialPointerWorldPoint, e.pointerWorldOrigin, je.copy(e.pointerWorldPoint), e.pointerWorldDirection), Qt.negate().add(je), s.translate === "as-scale" ? Ue.copy(n.initialTargetQuaternion) : (oe.copy(At), n.prevTranslateAsDeltaRotation != null && oe.applyQuaternion(n.prevTranslateAsDeltaRotation), oe.normalize(), je.copy(Qt).normalize(), Ue.setFromUnitVectors(oe, je), n.prevTranslateAsDeltaRotation == null ? n.prevTranslateAsDeltaRotation = new X : Ue.multiply(n.prevTranslateAsDeltaRotation), n.prevTranslateAsDeltaRotation.copy(Ue), n.initialTargetParentWorldMatrix != null && (Le.setFromRotationMatrix(n.initialTargetParentWorldMatrix), Ue.multiply(Le.normalize()), Ue.premultiply(Le.invert())), Ue.multiply(n.initialTargetQuaternion)), s.translate === "as-rotate") dt.set(1, 1, 1);
        else if (typeof s.scale == "object" && (s.scale.uniform ?? !1)) dt.setScalar(Qt.length() / At.length());
        else if (s.translate === "as-rotate-and-scale") {
            Rt.compose(n.initialTargetPosition, n.initialTargetQuaternion, n.initialTargetScale), n.initialTargetParentWorldMatrix != null && Rt.premultiply(n.initialTargetParentWorldMatrix), Rt.decompose(je, Le, Rs), oe.copy(At).applyQuaternion(Le.invert()).divide(Rs), oe.x = Math.abs(oe.x), oe.y = Math.abs(oe.y), oe.z = Math.abs(oe.z);
            const a = Math.max(...oe.toArray());
            oe.divideScalar(a), dt.set(1, 1, 1), dt.addScaledVector(oe, Qt.length() / At.length() - 1);
        } else n.initialTargetParentWorldMatrix != null ? (n.initialTargetParentWorldMatrix.decompose(oe, Le, je), Le.multiply(n.initialTargetQuaternion)) : Le.copy(n.initialTargetQuaternion), oe.copy(At).applyQuaternion(Le.invert()), r != null ? (r.decompose(je, Le, Rs), Le.multiply(n.initialTargetQuaternion)) : Le.copy(n.initialTargetQuaternion), je.copy(Qt).applyQuaternion(Le.invert()), dt.x = Math.abs(oe.x) < .001 ? 1 : Math.abs(je.x / oe.x), dt.y = Math.abs(oe.y) < .001 ? 1 : Math.abs(je.y / oe.y), dt.z = Math.abs(oe.z) < .001 ? 1 : Math.abs(je.z / oe.z);
        return dt.multiply(n.initialTargetScale), Rt.compose(n.initialTargetPosition, Ue, dt), to(t, 1, Rt, n, void 0, s);
    }
    class yl {
        t1;
        t2;
        _position;
        _quaternion;
        _rotation;
        _scale;
        constructor(e, n){
            this.t1 = e, this.t2 = n;
        }
        get time() {
            return this.t1.time - this.t2.time;
        }
        get position() {
            return this._position ??= this.t1.position.clone().sub(this.t2.position);
        }
        get quaternion() {
            return this._quaternion ??= this.t2.quaternion.clone().invert().premultiply(this.t1.quaternion);
        }
        get rotation() {
            return this._rotation ??= new re().setFromQuaternion(this.quaternion);
        }
        get scale() {
            return this._scale ??= this.t1.scale.clone().sub(this.t2.scale);
        }
    }
    class $2 {
        cancel;
        previous;
        memo;
        event;
        initial;
        current;
        first;
        last;
        _delta;
        _offset;
        constructor(e){
            this.cancel = e;
        }
        start(e, n) {
            this.event = e, this.previous = void 0, this.current = n, this.initial = n, this.first = !0, this.last = !1, this.memo = void 0, this._delta = void 0, this._offset = void 0;
        }
        update(e, n) {
            this.event = e, this.previous = this.current, this.current = n, this.first = !1, this.last = !1, this._delta = void 0, this._offset = void 0;
        }
        end(e) {
            this.event = e, this.first = !1, this.last = !0, this._delta = void 0, this._offset = void 0;
        }
        get delta() {
            if (this.previous != null) return this._delta ??= new yl(this.current, this.previous);
        }
        get offset() {
            return this._offset ??= new yl(this.current, this.initial);
        }
    }
    function vl(t, e) {
        if (t.details.type === "sphere") return !1;
        if (t.details.type === "lines") {
            const { line: n } = t.details;
            return e.copy(n.end).sub(n.start).normalize(), !0;
        }
        return t.details.type === "screen-ray" ? (e.copy(t.details.direction), !0) : (e.set(0, 0, -1).applyQuaternion(t.pointerQuaternion), !0);
    }
    const wl = new M;
    class H2 {
        target;
        getOptions;
        outputState;
        latestMoveEvent;
        inputState = new Map;
        capturedObjects = new Map;
        initialTargetPosition = new M;
        initialTargetQuaternion = new X;
        initialTargetRotation = new re;
        initialTargetScale = new M;
        initialTargetParentWorldMatrix;
        prevTwoPointerDeltaRotation;
        prevTranslateAsDeltaRotation;
        prevAngle;
        handlers = {
            onPointerDown: this.onPointerDown.bind(this),
            onPointerMove: this.onPointerMove.bind(this),
            onPointerUp: this.onPointerUp.bind(this)
        };
        constructor(e, n = ()=>({})){
            this.target = e, this.getOptions = n, this.outputState = new $2(this.cancel.bind(this));
        }
        firstOnPointer(e) {
            const n = this.getTarget();
            if (n == null) return;
            const i = vl(e, wl) ? wl.clone() : void 0;
            e.intersection.details.type, this.inputState.set(e.pointerId, {
                pointerWorldDirection: i,
                pointerWorldPoint: e.point,
                pointerWorldOrigin: e.pointerPosition,
                pointerWorldQuaternion: e.pointerQuaternion,
                initialPointerWorldPoint: e.point.clone(),
                initialPointerWorldDirection: i?.clone(),
                initialPointerWorldQuaternion: e.pointerQuaternion.clone(),
                prevPointerWorldQuaternion: e.pointerQuaternion
            }), this.save(), this.inputState.size === 1 && this.outputState.start(e, {
                pointerAmount: 1,
                time: e.timeStamp,
                position: this.initialTargetPosition.clone(),
                quaternion: this.initialTargetQuaternion.clone(),
                rotation: this.initialTargetRotation.clone(),
                scale: this.initialTargetScale.clone()
            }), this.outputState.memo = this.apply(n);
        }
        onPointerDown(e) {
            this.getOptions().filter?.(e) !== !1 && (this.stopPropagation(e), this.capturePointer(e.pointerId, e.object) && this.firstOnPointer(e));
        }
        onPointerMove(e) {
            if (!this.capturedObjects.has(e.pointerId)) return;
            this.stopPropagation(e);
            const n = this.inputState.get(e.pointerId);
            if (n == null) {
                this.firstOnPointer(e);
                return;
            }
            this.latestMoveEvent = e, n.pointerWorldPoint = e.point, n.prevPointerWorldQuaternion = n.pointerWorldQuaternion, n.pointerWorldQuaternion = e.pointerQuaternion, n.pointerWorldOrigin = e.pointerPosition, n.pointerWorldDirection != null && vl(e, n.pointerWorldDirection);
        }
        cancel() {
            if (this.capturedObjects.size === 0) return;
            for (const [n, i] of this.capturedObjects)i.releasePointerCapture(n);
            this.capturedObjects.clear(), this.inputState.clear(), this.outputState.end(void 0);
            const e = this.getTarget();
            e != null && this.apply(e);
        }
        onPointerUp(e) {
            this.capturedObjects.has(e.pointerId) && (this.stopPropagation(e), this.releasePointer(e.pointerId, e.object, e));
        }
        update(e) {
            const n = this.getTarget();
            if (n == null || this.inputState.size === 0 || this.latestMoveEvent == null && (this.getOptions().alwaysUpdate ?? !1) === !1) return;
            const i = this.getOptions();
            let r;
            if (i.translate === "as-rotate" || i.translate === "as-rotate-and-scale" || i.translate === "as-scale") {
                i.translate, this.prevTwoPointerDeltaRotation = void 0, this.prevAngle = void 0;
                const [s] = this.inputState.values(), a = n.matrixWorld, o = n.parent?.matrixWorld;
                r = G2(e, s, this, a, o, i);
            } else if (this.inputState.size === 1) {
                this.prevTwoPointerDeltaRotation = void 0, this.prevAngle = void 0, this.prevTranslateAsDeltaRotation = void 0;
                const [s] = this.inputState.values();
                r = j2(e, s, this, n.parent?.matrixWorld, i);
            } else {
                this.prevTranslateAsDeltaRotation = void 0;
                const [s, a] = this.inputState.values();
                r = V2(e, s, a, this, n.parent?.matrixWorld, i);
            }
            this.outputState.update(this.latestMoveEvent, r), this.outputState.memo = this.apply(n), this.latestMoveEvent = void 0;
        }
        getTarget() {
            return this.target instanceof Ia ? this.target : this.target?.current;
        }
        capturePointer(e, n) {
            if (this.capturedObjects.has(e)) return !1;
            const { multitouch: i, translate: r } = this.getOptions();
            return ((i ?? !0) === !1 || typeof r == "string") && this.capturedObjects.size === 1 ? !1 : (this.capturedObjects.set(e, n), n.setPointerCapture(e), !0);
        }
        releasePointer(e, n, i) {
            const r = this.getTarget();
            if (!(r == null || !this.capturedObjects.delete(e))) {
                if (this.inputState.delete(e), n.releasePointerCapture(e), this.inputState.size > 0) {
                    this.save();
                    return;
                }
                this.outputState.end(i), this.apply(r);
            }
        }
        stopPropagation(e) {
            e == null || !(this.getOptions()?.stopPropagation ?? !0) || e.stopPropagation();
        }
        apply(e) {
            return (this.getOptions().apply ?? hu)(this.outputState, e);
        }
        getState() {
            return this.inputState.size === 0 ? void 0 : this.outputState;
        }
        save() {
            const e = this.getTarget();
            if (e != null) {
                e.updateWorldMatrix(!0, !1), this.prevAngle = void 0, this.prevTwoPointerDeltaRotation = void 0, this.prevTranslateAsDeltaRotation = void 0, this.initialTargetParentWorldMatrix = e.parent?.matrixWorld.clone(), e.matrixAutoUpdate ? (this.initialTargetPosition.copy(e.position), this.initialTargetQuaternion.copy(e.quaternion), this.initialTargetRotation.copy(e.rotation), this.initialTargetScale.copy(e.scale)) : (e.matrix.decompose(this.initialTargetPosition, this.initialTargetQuaternion, this.initialTargetScale), this.initialTargetRotation.setFromQuaternion(this.initialTargetQuaternion, e.rotation.order));
                for (const n of this.inputState.values())n.pointerWorldDirection != null && n.initialPointerWorldDirection?.copy(n.pointerWorldDirection), n.initialPointerWorldPoint.copy(n.pointerWorldPoint), n.initialPointerWorldQuaternion.copy(n.pointerWorldQuaternion);
            }
        }
        bind(e) {
            const { onPointerDown: n, onPointerMove: i, onPointerUp: r } = this.handlers;
            return e.addEventListener("pointerdown", n), e.addEventListener("pointermove", i), e.addEventListener("pointerup", r), ()=>{
                e.removeEventListener("pointerdown", n), e.removeEventListener("pointermove", i), e.removeEventListener("pointerup", r), this.cancel();
            };
        }
        capture(e, n) {
            return this.capturePointer(e, n) ? ()=>this.releasePointer(e, n, void 0) : W2;
        }
    }
    function W2() {}
    function hu(t, e) {
        e.position.copy(t.current.position), e.rotation.order = t.current.rotation.order, e.quaternion.copy(t.current.quaternion), e.scale.copy(t.current.scale);
    }
    class q2 {
        target;
        getOptions;
        handles = [];
        hoveredTagMap = new Map;
        hoverSubscriptions = [];
        applySubscriptions = [];
        space;
        constructor(e, n){
            this.target = e, this.getOptions = n;
        }
        getSpace() {
            return this.space ?? "world";
        }
        getTarget() {
            return this.target instanceof Ia ? this.target : this.target.current;
        }
        getHandleOptions(e, n) {
            const i = this.getOptions?.(), r = n?.();
            return {
                ...i,
                ...r,
                apply: (s, a)=>(this.onApply(e, s, a), (r?.apply ?? i?.apply ?? hu)?.(s, a))
            };
        }
        registerHandle(e, n, i) {
            const r = {
                object: n,
                store: e,
                tag: i
            };
            this.handles.push(r);
            const s = e.bind(n), a = this.onPointerEnter.bind(this, i), o = this.onPointerLeave.bind(this);
            return n.addEventListener("pointerenter", a), n.addEventListener("pointerleave", o), ()=>{
                const l = this.handles.indexOf(r);
                l != -1 && this.handles.splice(l, 1), s(), e.cancel();
            };
        }
        subscribeHover(e) {
            return this.hoverSubscriptions.push(e), e(Array.from(this.hoveredTagMap.values())), ()=>{
                const n = this.hoverSubscriptions.indexOf(e);
                n !== -1 && this.hoverSubscriptions.splice(n, 1);
            };
        }
        subscribeApply(e) {
            return this.applySubscriptions.push(e), ()=>{
                const n = this.applySubscriptions.indexOf(e);
                n !== -1 && this.applySubscriptions.splice(n, 1);
            };
        }
        update(e) {
            for (const { store: n } of this.handles)n.update(e);
        }
        onPointerEnter(e, n) {
            this.hoveredTagMap.set(n.pointerId, e), this.updateHover();
        }
        onPointerLeave(e) {
            this.hoveredTagMap.delete(e.pointerId), this.updateHover();
        }
        updateHover() {
            const e = Array.from(this.hoveredTagMap.values());
            for (const n of this.hoverSubscriptions)n(e);
        }
        onApply(e, n, i) {
            for (const r of this.applySubscriptions)r(e, n, i);
        }
    }
    const Se = {
        depthTest: !1,
        depthWrite: !1,
        fog: !1,
        toneMapped: !1,
        transparent: !0
    };
    function nt(t, e, n, { color: i, hoverColor: r, hoverOpacity: s, opacity: a, disabled: o = !1 }) {
        if (r == null && s == null || o) {
            e.color.set(i), e.opacity = a ?? 1, o && (e.opacity *= .5, e.color.lerp(new Bc(1, 1, 1), .5));
            return;
        }
        return r ??= i, t.subscribeHover((l)=>{
            const c = l.some((u)=>u.includes(n));
            e.color.set(c ? r : i), e.opacity = (c ? s : a) ?? 1;
        });
    }
    const dr = new X, du = new ka;
    du.setAttribute("position", new Vc([
        -1e3,
        0,
        0,
        1e3,
        0,
        0
    ], 3));
    class Ps extends jc {
        context;
        rotationOffset;
        constructor(e, n){
            super(du), this.context = e, this.rotationOffset = n, this.renderOrder = 1 / 0;
        }
        update() {
            this.quaternion.setFromEuler(this.rotationOffset);
            const e = this.context.getTarget();
            this.context.getSpace() === "world" && e != null && (e.getWorldQuaternion(dr).invert(), this.quaternion.premultiply(dr));
        }
        bind(e) {
            this.material = new Uc({
                ...Se,
                color: this.material.color ?? "white",
                opacity: this.material.opacity ?? 1
            });
            const n = this.context.subscribeHover((r)=>{
                const s = r.some((a)=>a.includes(e));
                this.visible = s;
            }), i = this.context.subscribeApply((r, s)=>{
                if (s.last) {
                    this.position.set(0, 0, 0);
                    return;
                }
                this.position.copy(s.initial.position).sub(s.current.position);
                const a = this.context.getTarget();
                a != null && (dr.copy(a.quaternion).invert(), this.position.applyQuaternion(dr));
            });
            return ()=>{
                this.material.dispose(), n(), i();
            };
        }
    }
    class wt extends Te {
        context;
        axis;
        store;
        options;
        tag;
        constructor(e, n, i, r){
            super(), this.context = e, this.axis = n, this.tag = (i ?? "") + n, this.store = new H2(e.target, ()=>e.getHandleOptions(this.tag, r));
        }
    }
    function bt(t, e = !0) {
        if (e === !1) return {
            options: !1,
            disabled: !0
        };
        if (e === !0) {
            const r = {
                x: !1,
                y: !1,
                z: !1,
                e: !1
            };
            for (const s of t)r[s] = !0;
            return {
                options: r,
                disabled: !1
            };
        }
        if (e === "disabled") return {
            options: {
                x: !0,
                y: !0,
                z: !0,
                e: !0
            },
            disabled: !0
        };
        if (typeof e == "string") return {
            options: e === t ? {
                x: !1,
                y: !1,
                z: !1,
                e: !1,
                [t]: !0
            } : !1,
            disabled: !1
        };
        const n = {
            x: !1,
            y: !1,
            z: !1,
            e: !1
        };
        let i = !1;
        for (const r of t){
            let s = e[r] ?? !0;
            if (s === !1) return {
                options: !1,
                disabled: !0
            };
            s === "disabled" && (i = !0, s = !0), n[r] = s;
        }
        return {
            options: n,
            disabled: i
        };
    }
    const bl = new M, Tl = new M;
    function no(t, e, n, i) {
        if (!n) return i;
        let r;
        return e instanceof qu ? r = (e.top - e.bottom) / e.zoom : (e.getWorldPosition(bl), t.getWorldPosition(Tl), r = bl.distanceTo(Tl) * Math.min(1.9 * Math.tan(Math.PI * e.fov / 360) / e.zoom, 7)), r * i / 4;
    }
    const fu = new ji(0, .04, .1, 12);
    fu.translate(0, .05, 0);
    const pu = new ji(.0075, .0075, .5, 3);
    pu.translate(0, .25, 0);
    const X2 = new re(0, 0, -Math.PI / 2), Y2 = new re(0, 0, Math.PI / 2);
    class On extends wt {
        invert;
        showArrowBody;
        constructor(e, n, i = "", r, s = !1, a = !0){
            super(e, n, i, ()=>({
                    scale: !1,
                    rotate: !1,
                    translate: r != null ? [
                        r
                    ] : this.options,
                    multitouch: !1
                })), this.invert = s, this.showArrowBody = a;
        }
        bind(e, n, i) {
            const { options: r, disabled: s } = bt(this.axis, i);
            if (r === !1) return;
            this.options = r;
            const a = this.invert ? Y2 : X2, o = new Me(Se), l = nt(this.context, o, this.tag, {
                color: e,
                hoverColor: n,
                disabled: s
            }), c = new ce(fu, o);
            c.renderOrder = 1 / 0, c.position.x = this.invert ? -.5 : .5, c.rotation.copy(a), this.add(c);
            let u, d;
            if (this.showArrowBody) {
                const p = new Me(Se);
                u = nt(this.context, p, this.tag, {
                    color: e,
                    hoverColor: 16777024,
                    disabled: s
                }), d = new ce(pu, p), d.renderOrder = 1 / 0, d.rotation.copy(a), this.add(d);
            }
            const f = new ce(new ji(.13, 0, .6, 4));
            f.pointerEventsOrder = 1 / 0, f.position.x = this.invert ? -.3 : .3, f.rotation.copy(a), f.visible = !1, this.add(f);
            const g = s ? void 0 : this.context.registerHandle(this.store, f, this.tag);
            return ()=>{
                o.dispose(), g?.(), l?.(), u?.(), this.remove(c), d != null && this.remove(d), this.remove(f);
            };
        }
    }
    class Os extends wt {
        constructor(e, n, i = "", r){
            super(e, n, i, ()=>({
                    translate: r ?? this.options,
                    scale: !1,
                    rotate: !1,
                    multitouch: !1
                }));
        }
        bind(e, n, i) {
            const { options: r, disabled: s } = bt(this.axis, i);
            if (r === !1) return;
            this.options = r;
            const a = new Me(Se), o = nt(this.context, a, this.tag, {
                opacity: .5,
                hoverOpacity: 1,
                color: e,
                hoverColor: n,
                disabled: s
            }), l = new ce(new Kn(.2, .2, .01), a);
            l.renderOrder = 1 / 0, l.pointerEventsOrder = 1 / 0, l.position.set(.15, .15, 0);
            const c = s ? void 0 : this.context.registerHandle(this.store, l, this.tag);
            return this.add(l), ()=>{
                a.dispose(), l.geometry.dispose(), c?.(), o?.(), this.remove(l);
            };
        }
    }
    const El = new X;
    function Z2(t, e) {
        const n = new ce(new Rr(.01, 2), new Me(Se));
        n.renderOrder = 1 / 0, n.visible = !1, t.add(n);
        const i = new ce(new Rr(.01, 2), new Me(Se));
        i.renderOrder = 1 / 0, i.visible = !1, t.add(i);
        const r = new ka;
        r.setAttribute("position", new Vc([
            0,
            0,
            0,
            1,
            1,
            1
        ], 3));
        const s = new jc(r, new Uc(Se));
        s.renderOrder = 1 / 0, s.visible = !1, t.add(s);
        const a = e.subscribeApply((o, l)=>{
            i.position.set(0, 0, 0), n.position.copy(l.initial.position).sub(l.current.position);
            const c = e.getTarget();
            c != null && (El.copy(c.quaternion).invert(), n.position.applyQuaternion(El)), s.position.set(0, 0, 0), s.scale.copy(n.position), n.visible = !l.last, s.visible = !l.last, i.visible = !l.last;
        });
        return ()=>{
            n.geometry.dispose(), n.material.dispose(), i.geometry.dispose(), i.material.dispose(), s.geometry.dispose(), s.material.dispose(), t.remove(n), t.remove(i), t.remove(s), a();
        };
    }
    class Q2 extends wt {
        constructor(e){
            super(e, "xyz", "", ()=>({
                    translate: this.options,
                    scale: !1,
                    rotate: !1,
                    multitouch: !1
                }));
        }
        bind(e) {
            const { options: n, disabled: i } = bt(this.axis, e);
            if (n === !1) return;
            this.options = n;
            const r = new Me(Se), s = nt(this.context, r, this.tag, {
                color: 16777215,
                hoverColor: 16776960,
                opacity: .25,
                hoverOpacity: 1,
                disabled: i
            }), a = new ce(new Rr(.1, 0), r);
            a.renderOrder = 1 / 0, this.add(a);
            const o = new ce(new Rr(.2, 0));
            o.pointerEventsOrder = 1 / 0, o.visible = !1, this.add(o);
            const l = i ? void 0 : this.context.registerHandle(this.store, o, this.tag);
            return ()=>{
                r.dispose(), a.geometry.dispose(), o.geometry.dispose(), l?.(), s?.(), this.remove(a), this.remove(o);
            };
        }
    }
    const _l = new M, Ee = new X, Sl = new X, Ml = new X().setFromEuler(new re(0, 0, Math.PI / 2)), Al = new X().setFromEuler(new re(0, -Math.PI / 2, 0)), K2 = new X, J2 = new X().setFromEuler(new re(0, -Math.PI / 2, 0)), ep = new X().setFromEuler(new re(Math.PI / 2, 0, 0));
    class tp extends Te {
        context;
        size;
        fixed;
        free;
        translationX;
        translationY;
        translationZ;
        translationNegX;
        translationNegY;
        translationNegZ;
        translationXY;
        translationYZ;
        translationXZ;
        scaleGroup = new Te;
        xAxis = new M;
        yAxis = new M;
        zAxis = new M;
        negXAxis = new M;
        negYAxis = new M;
        negZAxis = new M;
        constructor(e, n, i){
            super(), this.context = e, this.size = n, this.fixed = i, this.add(this.scaleGroup), this.free = new Q2(this.context), this.scaleGroup.add(this.free), this.translationX = new On(this.context, "x", void 0, this.xAxis), this.scaleGroup.add(this.translationX), this.translationY = new On(this.context, "y", void 0, this.yAxis), this.scaleGroup.add(this.translationY), this.translationZ = new On(this.context, "z", void 0, this.zAxis), this.scaleGroup.add(this.translationZ), this.translationNegX = new On(this.context, "x", void 0, this.negXAxis, !0, !1), this.scaleGroup.add(this.translationNegX), this.translationNegY = new On(this.context, "y", void 0, this.negYAxis, !0, !1), this.scaleGroup.add(this.translationNegY), this.translationNegZ = new On(this.context, "z", void 0, this.negZAxis, !0, !1), this.scaleGroup.add(this.translationNegZ), this.translationXY = new Os(this.context, "xy", void 0, [
                this.xAxis,
                this.yAxis
            ]), this.scaleGroup.add(this.translationXY), this.translationXZ = new Os(this.context, "xz", void 0, [
                this.xAxis,
                this.zAxis
            ]), this.scaleGroup.add(this.translationXZ), this.translationYZ = new Os(this.context, "yz", void 0, [
                this.yAxis,
                this.zAxis
            ]), this.scaleGroup.add(this.translationYZ);
        }
        update(e) {
            this.updateWorldMatrix(!0, !1), this.xAxis.set(1, 0, 0), this.yAxis.set(0, 1, 0), this.zAxis.set(0, 0, 1), this.free.quaternion.identity(), this.translationX.quaternion.copy(Sl), this.translationY.quaternion.copy(Ml), this.translationZ.quaternion.copy(Al), this.translationNegX.quaternion.copy(Sl), this.translationNegY.quaternion.copy(Ml), this.translationNegZ.quaternion.copy(Al), this.translationXY.quaternion.copy(K2), this.translationYZ.quaternion.copy(J2), this.translationXZ.quaternion.copy(ep);
            const n = this.context.getSpace(), i = this.context.getTarget();
            n == "world" && i != null ? (i.getWorldQuaternion(Ee).invert(), this.free.quaternion.premultiply(Ee), this.translationX.quaternion.premultiply(Ee), this.translationY.quaternion.premultiply(Ee), this.translationZ.quaternion.premultiply(Ee), this.translationNegX.quaternion.premultiply(Ee), this.translationNegY.quaternion.premultiply(Ee), this.translationNegZ.quaternion.premultiply(Ee), this.translationXY.quaternion.premultiply(Ee), this.translationYZ.quaternion.premultiply(Ee), this.translationXZ.quaternion.premultiply(Ee), i.parent != null && (i.parent.getWorldQuaternion(Ee).invert(), this.xAxis.applyQuaternion(Ee), this.yAxis.applyQuaternion(Ee), this.zAxis.applyQuaternion(Ee))) : i != null && (this.xAxis.applyQuaternion(i.quaternion), this.yAxis.applyQuaternion(i.quaternion), this.zAxis.applyQuaternion(i.quaternion)), this.negXAxis.copy(this.xAxis).negate(), this.negYAxis.copy(this.yAxis).negate(), this.negZAxis.copy(this.zAxis).negate(), this.scaleGroup.scale.setScalar(1), i != null && (i.getWorldScale(_l), this.scaleGroup.scale.divide(_l)), this.scaleGroup.scale.multiplyScalar(no(this, e, this.fixed ?? !0, this.size ?? 1));
        }
        bind(e) {
            const n = Z2(this, this.context), i = this.translationX.bind(16711680, 16776960, e), r = this.translationY.bind(65280, 16776960, e), s = this.translationZ.bind(255, 16776960, e), a = this.translationNegX.bind(16711680, 16776960, e), o = this.translationNegY.bind(65280, 16776960, e), l = this.translationNegZ.bind(255, 16776960, e), c = this.translationXY.bind(255, 16776960, e), u = this.translationYZ.bind(16711680, 16776960, e), d = this.translationXZ.bind(65280, 16776960, e), f = this.free.bind(e);
            return ()=>{
                n(), i?.(), r?.(), s?.(), a?.(), o?.(), l?.(), c?.(), u?.(), d?.(), f?.();
            };
        }
    }
    const np = new re(0, 0, -Math.PI / 2), ip = new re(0, 0, Math.PI / 2);
    class In extends wt {
        invert;
        showHandleLine;
        constructor(e, n, i = "", r = !1, s = !0){
            super(e, n, i, ()=>({
                    scale: this.options,
                    rotate: !1,
                    translate: "as-scale",
                    multitouch: !1
                })), this.invert = r, this.showHandleLine = s;
        }
        bind(e, n, i) {
            const { options: r, disabled: s } = bt(this.axis, i);
            if (r === !1) return;
            this.options = r;
            const a = this.invert ? ip : np, o = new Te;
            o.position.x = this.invert ? -.5 : .5, o.rotation.copy(a), this.add(o);
            const l = new Me(Se), c = nt(this.context, l, this.tag, {
                color: e,
                hoverColor: n,
                disabled: s
            }), u = new ce(new Kn(.08, .08, .08), l);
            u.renderOrder = 1 / 0, u.rotation.copy(a), o.add(u);
            let d, f, g;
            if (this.showHandleLine) {
                g = new Te, g.rotation.copy(a), this.add(g);
                const v = new Me(Se);
                d = nt(this.context, v, this.tag, {
                    color: e,
                    hoverColor: n,
                    disabled: s
                }), f = new ce(new ji(.0075, .0075, .5, 3), v), f.renderOrder = 1 / 0, f.position.y = .25, g.add(f);
            }
            const p = new Te;
            p.visible = !1, p.rotation.copy(a), p.position.x = this.invert ? -.3 : .3, this.add(p);
            const x = new ce(new ji(.2, 0, .5, 4));
            x.pointerEventsOrder = 1 / 0, x.position.y = .04, p.add(x);
            const y = s ? void 0 : this.context.registerHandle(this.store, x, this.tag);
            return ()=>{
                l.dispose(), x.geometry.dispose(), u.geometry.dispose(), f?.geometry.dispose(), y?.(), c?.(), d?.(), g != null && this.remove(g), this.remove(p), this.remove(o);
            };
        }
    }
    class Is extends wt {
        constructor(e, n, i = ""){
            super(e, n, i, ()=>({
                    translate: "as-scale",
                    scale: this.options,
                    rotate: !1,
                    multitouch: !1
                }));
        }
        bind(e, n, i) {
            const { options: r, disabled: s } = bt(this.axis, i);
            if (r === !1) return;
            this.options = r;
            const a = new Me(Se), o = nt(this.context, a, this.tag, {
                opacity: .5,
                hoverOpacity: 1,
                color: e,
                hoverColor: n,
                disabled: s
            }), l = new ce(new Kn(.2, .2, .01), a);
            l.renderOrder = 1 / 0, l.pointerEventsOrder = 1 / 0, l.position.set(.15, .15, 0);
            const c = s ? void 0 : this.context.registerHandle(this.store, l, this.tag);
            return this.add(l), ()=>{
                a.dispose(), l.geometry.dispose(), c?.(), o?.(), this.remove(l);
            };
        }
    }
    const rp = new re(0, 0, -Math.PI / 2), sp = new re(0, 0, Math.PI / 2);
    class kn extends wt {
        actualAxis;
        invert;
        constructor(e, n = "", i, r = !1){
            super(e, "xyz", n, ()=>({
                    scale: {
                        uniform: !0,
                        ...this.options
                    },
                    rotate: !1,
                    translate: "as-scale",
                    multitouch: !1
                })), this.actualAxis = i, this.invert = r;
        }
        bind(e, n, i) {
            const { options: r, disabled: s } = bt(this.actualAxis, i);
            if (r === !1) return;
            this.options = r;
            const a = this.invert ? sp : rp, o = new Te;
            o.position.x = this.invert ? -.7 : .7, o.rotation.copy(a), this.add(o);
            const l = new Me(Se), c = nt(this.context, l, this.tag, {
                color: e,
                hoverColor: n,
                opacity: .5,
                hoverOpacity: 1,
                disabled: s
            }), u = new ce(new Kn(.08, .08, .08), l);
            u.renderOrder = 1 / 0, u.rotation.copy(a), o.add(u);
            const d = new ce(new Kn(.15, .15, .15), l);
            d.visible = !1, d.pointerEventsOrder = 1 / 0, d.rotation.copy(a), o.add(d);
            const f = s ? void 0 : this.context.registerHandle(this.store, d, this.tag);
            return ()=>{
                l.dispose(), u.geometry.dispose(), f?.(), c?.(), this.remove(o);
            };
        }
    }
    const Rl = new M;
    class ap extends Te {
        context;
        size;
        fixed;
        scaleX;
        scaleY;
        scaleZ;
        scaleNegX;
        scaleNegY;
        scaleNegZ;
        translationX;
        translationY;
        translationZ;
        translationNegX;
        translationNegY;
        translationNegZ;
        translationXY;
        translationYZ;
        translationXZ;
        constructor(e, n, i){
            super(), this.context = e, this.size = n, this.fixed = i, this.scaleX = new kn(this.context, void 0, "x"), this.add(this.scaleX), this.scaleY = new kn(this.context, void 0, "y"), this.scaleY.rotation.z = Math.PI / 2, this.add(this.scaleY), this.scaleZ = new kn(this.context, void 0, "z"), this.scaleZ.rotation.y = -Math.PI / 2, this.add(this.scaleZ), this.scaleNegX = new kn(this.context, void 0, "x", !0), this.add(this.scaleNegX), this.scaleNegY = new kn(this.context, void 0, "y", !0), this.scaleNegY.rotation.z = Math.PI / 2, this.add(this.scaleNegY), this.scaleNegZ = new kn(this.context, void 0, "z", !0), this.scaleNegZ.rotation.y = -Math.PI / 2, this.add(this.scaleNegZ), this.translationX = new In(this.context, "x"), this.add(this.translationX), this.translationY = new In(this.context, "y"), this.translationY.rotation.z = Math.PI / 2, this.add(this.translationY), this.translationZ = new In(this.context, "z"), this.translationZ.rotation.y = -Math.PI / 2, this.add(this.translationZ), this.translationNegX = new In(this.context, "x", void 0, !0, !1), this.add(this.translationNegX), this.translationNegY = new In(this.context, "y", void 0, !0, !1), this.translationNegY.rotation.z = Math.PI / 2, this.add(this.translationNegY), this.translationNegZ = new In(this.context, "z", void 0, !0, !1), this.translationNegZ.rotation.y = -Math.PI / 2, this.add(this.translationNegZ), this.translationXY = new Is(this.context, "xy"), this.add(this.translationXY), this.translationXZ = new Is(this.context, "xz"), this.translationXZ.rotation.x = Math.PI / 2, this.add(this.translationXZ), this.translationYZ = new Is(this.context, "yz"), this.translationYZ.rotation.y = -Math.PI / 2, this.add(this.translationYZ);
        }
        update(e) {
            this.updateWorldMatrix(!0, !1), this.scale.setScalar(1);
            const n = this.context.getTarget();
            n != null && (n.getWorldScale(Rl), this.scale.divide(Rl)), this.scale.multiplyScalar(no(this, e, this.fixed ?? !0, this.size ?? 1));
        }
        bind(e) {
            const n = this.scaleX.bind(16777215, 16776960, e), i = this.scaleY.bind(16777215, 16776960, e), r = this.scaleZ.bind(16777215, 16776960, e), s = this.scaleNegX.bind(16777215, 16776960, e), a = this.scaleNegY.bind(16777215, 16776960, e), o = this.scaleNegZ.bind(16777215, 16776960, e), l = this.translationX.bind(16711680, 16776960, e), c = this.translationY.bind(65280, 16776960, e), u = this.translationZ.bind(255, 16776960, e), d = this.translationNegX.bind(16711680, 16776960, e), f = this.translationNegY.bind(65280, 16776960, e), g = this.translationNegZ.bind(255, 16776960, e), p = this.translationXY.bind(255, 16776960, e), x = this.translationYZ.bind(16711680, 16776960, e), y = this.translationXZ.bind(65280, 16776960, e);
            return ()=>{
                l?.(), c?.(), u?.(), d?.(), f?.(), g?.(), p?.(), x?.(), y?.(), n?.(), i?.(), r?.(), s?.(), a?.(), o?.();
            };
        }
    }
    const Pl = {
        x: {
            vector1: new M(0, 0, -1),
            vector2: new M(0, -1, 0),
            rotationOffset: new X,
            axis: [
                1,
                0,
                0
            ]
        },
        y: {
            vector1: new M(0, 0, -1),
            vector2: new M(-1, 0, -1),
            rotationOffset: new X().setFromEuler(new re(0, 0, Math.PI / 2)),
            axis: [
                0,
                1,
                0
            ]
        },
        z: {
            vector1: new M(-1, 0, 0),
            vector2: new M(0, -1, 0),
            rotationOffset: new X().setFromEuler(new re(0, Math.PI / 2, 0)),
            axis: [
                0,
                0,
                1
            ]
        }
    }, ks = new M, Ti = new M, fr = new M, Kt = new M, Ye = new X;
    class Ls extends wt {
        direction = new M(1, 0, 0);
        constructor(e, n, i = ""){
            super(e, n, i, ()=>({
                    scale: !1,
                    translate: "as-rotate",
                    rotate: [
                        this.direction
                    ],
                    multitouch: !1
                }));
        }
        update(e) {
            const { rotationOffset: n, vector1: i, vector2: r } = Pl[this.axis];
            e.getWorldPosition(ks), this.getWorldPosition(Ti).sub(ks), fr.copy(i), Kt.copy(r);
            const s = this.context.getTarget(), a = this.context.getSpace();
            a === "local" && s != null && (s.getWorldQuaternion(Ye), fr.applyQuaternion(Ye), Kt.applyQuaternion(Ye)), Kt.crossVectors(fr, Kt);
            const o = Ti.dot(Kt);
            Kt.multiplyScalar(o), Ti.sub(Kt), this.quaternion.setFromUnitVectors(fr, Ti.normalize()), a === "local" && s != null && (s.getWorldQuaternion(Ye), this.quaternion.multiply(Ye)), this.quaternion.multiply(n), s?.parent != null ? (s.parent.matrixWorld.decompose(ks, Ye, Ti), Ye.invert(), this.quaternion.premultiply(Ye)) : Ye.identity(), this.store.getState() == null && (this.direction.fromArray(Pl[this.axis].axis), this.direction.applyQuaternion(a === "local" && s != null ? s?.quaternion : Ye)), s != null && this.quaternion.premultiply(Ye.copy(s.quaternion).invert());
        }
        bind(e, n) {
            const { options: i, disabled: r } = bt(this.axis, n);
            if (i === !1) return;
            this.options = i;
            const s = new Me(Se), a = nt(this.context, s, this.tag, {
                color: e,
                hoverColor: 16776960,
                disabled: r
            }), o = new ce(io(.5, .5), s);
            o.renderOrder = 1 / 0, this.add(o);
            const l = new ce(new La(.5, .1, 4, 24));
            l.visible = !1, l.pointerEventsOrder = 1 / 0, l.rotation.set(0, -Math.PI / 2, -Math.PI / 2), this.add(l);
            const c = r ? void 0 : this.context.registerHandle(this.store, l, this.tag);
            return ()=>{
                s.dispose(), l.geometry.dispose(), o.geometry.dispose(), c?.(), a?.(), this.remove(l), this.remove(o);
            };
        }
    }
    const Cs = new M, Ns = new M, op = new M(1, 0, 0), Ei = new X;
    class lp extends wt {
        constructor(e, n = ""){
            super(e, "xyz", n, ()=>({
                    scale: !1,
                    translate: "as-rotate",
                    rotate: this.options,
                    multitouch: !1
                }));
        }
        update(e) {
            e.getWorldPosition(Cs), this.getWorldPosition(Ns).sub(Cs), this.quaternion.setFromUnitVectors(op, Ns.normalize());
            const n = this.context.getTarget();
            n?.parent != null && (n.parent.matrixWorld.decompose(Cs, Ei, Ns), Ei.invert(), this.quaternion.premultiply(Ei)), n != null && (Ei.copy(n.quaternion).invert(), this.quaternion.premultiply(Ei));
        }
        bind(e) {
            const { options: n, disabled: i } = bt(this.axis, e);
            if (n === !1) return;
            this.options = n;
            const r = new Me(Se), s = nt(this.context, r, this.tag, {
                color: 16777215,
                hoverColor: 16776960,
                opacity: .25,
                disabled: i
            }), a = new ce(io(.5, 1), r);
            a.renderOrder = 1 / 0, this.add(a);
            const o = new ce(new Xu(.25, 10, 8));
            o.visible = !1, o.pointerEventsOrder = 1 / 0, this.add(o);
            const l = i ? void 0 : this.context.registerHandle(this.store, o, this.tag);
            return ()=>{
                this.pointerEvents = "none", r.dispose(), o.geometry.dispose(), a.geometry.dispose(), l?.(), s?.(), this.remove(o), this.remove(a);
            };
        }
    }
    const Fs = new M, cp = new M, up = new M(1, 0, 0), Ln = new X;
    class hp extends wt {
        direction = new M(1, 0, 0);
        constructor(e, n = ""){
            super(e, "e", n, ()=>({
                    scale: !1,
                    translate: "as-rotate",
                    rotate: [
                        this.direction
                    ],
                    multitouch: !1
                }));
        }
        update(e) {
            e.getWorldPosition(Fs), this.getWorldPosition(this.direction).sub(Fs).normalize(), this.quaternion.setFromUnitVectors(up, this.direction);
            const n = this.context.getTarget();
            n?.parent != null && (n.parent.matrixWorld.decompose(Fs, Ln, cp), Ln.invert(), this.quaternion.premultiply(Ln), this.direction.applyQuaternion(Ln)), n != null && (Ln.copy(n.quaternion).invert(), this.quaternion.premultiply(Ln)), this.direction.negate();
        }
        bind(e) {
            const { options: n, disabled: i } = bt(this.axis, e);
            if (n === !1) return;
            this.options = n;
            const r = new Me(Se), s = nt(this.context, r, this.tag, {
                color: 16776960,
                hoverColor: 16776960,
                opacity: .5,
                disabled: i
            }), a = new ce(io(.75, 1), r);
            a.renderOrder = 1 / 0, this.add(a);
            const o = new ce(new La(.75, .1, 2, 24), new Me({
                color: "white"
            }));
            o.visible = !1, o.rotation.y = Math.PI / 2, o.pointerEventsOrder = 1 / 0, this.add(o);
            const l = i ? void 0 : this.context.registerHandle(this.store, o, this.tag);
            return ()=>{
                r.dispose(), o.geometry.dispose(), a.geometry.dispose(), l?.(), s?.(), this.remove(o), this.remove(a);
            };
        }
    }
    function io(t, e) {
        const n = new La(t, .0075, 3, 64, e * Math.PI * 2);
        return n.rotateY(Math.PI / 2), n.rotateX(Math.PI / 2), n;
    }
    const Ol = new M;
    class dp extends Te {
        context;
        fixed;
        size;
        rotationX;
        rotationY;
        rotationZ;
        free;
        screen;
        constructor(e, n, i){
            super(), this.context = e, this.fixed = n, this.size = i, this.rotationX = new Ls(this.context, "x"), this.add(this.rotationX), this.rotationY = new Ls(this.context, "y"), this.add(this.rotationY), this.rotationZ = new Ls(this.context, "z"), this.add(this.rotationZ), this.free = new lp(this.context), this.add(this.free), this.screen = new hp(this.context), this.add(this.screen);
        }
        update(e) {
            this.updateWorldMatrix(!0, !1), this.rotationX.update(e), this.rotationY.update(e), this.rotationZ.update(e), this.free.update(e), this.screen.update(e), this.scale.setScalar(1);
            const n = this.context.getTarget();
            n != null && (n.getWorldScale(Ol), this.scale.divide(Ol)), this.scale.multiplyScalar(no(this, e, this.fixed ?? !0, this.size ?? 1));
        }
        bind(e) {
            const n = this.rotationX.bind(16711680, e), i = this.rotationY.bind(65280, e), r = this.rotationZ.bind(255, e), s = this.screen.bind(e), a = this.free.bind(e);
            return ()=>{
                n?.(), i?.(), r?.(), s?.(), a?.();
            };
        }
    }
    const fp = new re, pp = new re(0, 0, Math.PI / 2), mp = new re(0, -Math.PI / 2, 0);
    class gp extends Te {
        xAxisHighlight;
        yAxisHighlight;
        zAxisHighlight;
        handles;
        context;
        constructor(e){
            super(), this.context = new q2(this, e), this.xAxisHighlight = new Ps(this.context, fp), this.add(this.xAxisHighlight), this.yAxisHighlight = new Ps(this.context, pp), this.add(this.yAxisHighlight), this.zAxisHighlight = new Ps(this.context, mp), this.add(this.zAxisHighlight);
        }
        set space(e) {
            this.context.space = e;
        }
        get space() {
            return this.context.space;
        }
        update(e, n) {
            this.context.update(e), this.xAxisHighlight.update(), this.yAxisHighlight.update(), this.zAxisHighlight.update(), this.handles?.update(n);
        }
        bind(e, n) {
            const i = this.xAxisHighlight.bind("x"), r = this.yAxisHighlight.bind("y"), s = this.zAxisHighlight.bind("z");
            switch(e){
                case "rotate":
                    this.handles = new dp(this.context);
                    break;
                case "scale":
                    this.handles = new ap(this.context);
                    break;
                case "translate":
                    this.handles = new tp(this.context);
                    break;
            }
            this.add(this.handles);
            const a = this.handles.bind(n);
            return ()=>{
                this.handles != null && this.remove(this.handles), this.handles = void 0, a(), i(), r(), s();
            };
        }
    }
    new re;
    const xp = 2;
    class yp {
        constructor(e){
            this.xrDevice = e, this.combinedCameraPosition = new M, this.isPointerLocked = !1, this.vec3 = new M, this.quat = new X, this.keyState = {
                ShiftLeft: !1,
                KeyW: !1,
                KeyA: !1,
                KeyS: !1,
                KeyD: !1,
                ArrowUp: !1,
                ArrowDown: !1
            }, this.lastTime = 0, this.scene = new Gc, this.camera = new $c(50, window.innerWidth / window.innerHeight, .1, 40), this.playerRig = new Te, this.cameraRig = new Te, this.scene.add(this.playerRig), this.playerRig.add(this.cameraRig), this.cameraRig.position.fromArray(e.position.vec3), this.cameraRig.quaternion.fromArray(e.quaternion.quat), this.cameraRig.add(this.camera), this.camera.position.x -= e.ipd / 2;
            const n = new ce(new Yu(.25, .27, 32), new Me({
                color: 16777215,
                side: Zu
            }));
            n.rotateX(-Math.PI / 2), this.scene.add(n), this.renderer = new Hc({
                alpha: !0
            }), this.renderer.setPixelRatio(window.devicePixelRatio), this.renderer.setSize(window.innerWidth, window.innerHeight), this.renderer.setClearColor(0, 0), this.renderer.domElement.style.position = "fixed", this.renderer.domElement.style.top = "50vh", this.renderer.domElement.style.left = "50vw", this.renderer.domElement.style.transform = "translate(-50%, -50%)", this.transformHandles = new Map, [
                "left",
                "right"
            ].forEach((i)=>{
                const r = new gp;
                r.scale.setScalar(.1), r.position.fromArray(e.controllers[i].position.vec3), r.quaternion.fromArray(e.controllers[i].quaternion.quat), this.cameraRig.attach(r), r.userData = {
                    defaultPosition: r.position.toArray(),
                    defaultQuaternion: r.quaternion.toArray()
                }, r.userData.setMode = (s)=>{
                    var a, o;
                    (o = (a = r.userData).modeCleanup) === null || o === void 0 || o.call(a), r.userData.modeCleanup = r.bind(s), r.userData.mode = s;
                }, r.userData.setMode("translate"), r.space = "local", this.transformHandles.set(i, r), r.addEventListener("click", ()=>{
                    r.userData.mode === "translate" ? r.userData.setMode("rotate") : r.userData.setMode("translate");
                });
            }), window.transformHandles = this.transformHandles, this.mouseMoveHandler = (i)=>{
                if (!this.isPointerLocked) return;
                const r = i.movementX || i.mozMovementX || i.webkitMovementX || 0, s = i.movementY || i.mozMovementY || i.webkitMovementY || 0;
                this.playerRig.rotation.y -= r * .002, this.cameraRig.rotation.x -= s * .002, e.quaternion.copy(this.cameraRig.getWorldQuaternion(new X));
            }, this.cameraRig.getWorldPosition(this.combinedCameraPosition), this.headsetDefaultPosition = this.cameraRig.position.clone(), this.headsetDefaultQuaternion = this.cameraRig.quaternion.clone(), this.forwardHtmlEvents = Hu(this.renderer.domElement, ()=>this.camera, this.scene).update, document.addEventListener("pointerlockchange", this.pointerLockChangeHandler.bind(this), !1), document.addEventListener("mozpointerlockchange", this.pointerLockChangeHandler.bind(this), !1), document.addEventListener("webkitpointerlockchange", this.pointerLockChangeHandler.bind(this), !1), document.addEventListener("keydown", this.keyDownHandler.bind(this), !1), document.addEventListener("keyup", this.keyUpHandler.bind(this), !1);
        }
        lockPointer() {
            this.renderer.domElement.requestPointerLock = this.renderer.domElement.requestPointerLock || this.renderer.domElement.mozRequestPointerLock || this.renderer.domElement.webkitRequestPointerLock, this.renderer.domElement.requestPointerLock();
        }
        pointerLockChangeHandler() {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement || document.mozPointerLockElement === this.renderer.domElement || document.webkitPointerLockElement === this.renderer.domElement, this.isPointerLocked ? (document.addEventListener("mousemove", this.mouseMoveHandler, !1), Object.values(this.transformHandles).forEach((e)=>{
                e.visible = !1;
            })) : (document.removeEventListener("mousemove", this.mouseMoveHandler, !1), Object.values(this.transformHandles).forEach((e)=>{
                e.visible = !0;
            }));
        }
        keyDownHandler(e) {
            const { keyState: n } = this;
            e.code in n && (n[e.code] = !0), n.ShiftLeft && n.ArrowUp && (this.cameraRig.position.y += .05), n.ShiftLeft && n.ArrowDown && (this.cameraRig.position.y -= .05);
        }
        keyUpHandler(e) {
            const { keyState: n } = this;
            e.code in n && (n[e.code] = !1);
        }
        movePlayerRig(e) {
            const { playerRig: n, keyState: i, vec3: r } = this;
            r.set((i.KeyD ? 1 : 0) - (i.KeyA ? 1 : 0), 0, (i.KeyS ? 1 : 0) - (i.KeyW ? 1 : 0)), r.lengthSq() > 0 && i.ShiftLeft && (r.normalize().multiplyScalar(xp * e).applyQuaternion(n.quaternion), n.position.add(r));
        }
        resetDeviceTransforms() {
            const { playerRig: e, cameraRig: n, transformHandles: i } = this;
            n.position.copy(this.headsetDefaultPosition), n.quaternion.copy(this.headsetDefaultQuaternion), e.position.set(0, 0, 0), e.quaternion.set(0, 0, 0, 1), i.forEach((r)=>{
                r.position.fromArray(r.userData.defaultPosition), r.quaternion.fromArray(r.userData.defaultQuaternion);
            });
        }
        syncDeviceTransforms() {
            const { xrDevice: e, cameraRig: n, transformHandles: i } = this;
            e.position.copy(n.getWorldPosition(this.vec3)), e.quaternion.copy(n.getWorldQuaternion(this.quat)), i.forEach((r, s)=>{
                const a = e.primaryInputMode === "controller" ? e.controllers[s] : e.hands[s];
                a.position.copy(r.getWorldPosition(this.vec3)), a.quaternion.copy(r.getWorldQuaternion(this.quat));
            });
        }
        renderScene(e) {
            const n = this.xrDevice.fovy / Math.PI * 180;
            let i = !1;
            this.camera.fov !== n && (this.camera.fov = n, i = !0);
            const r = this.xrDevice.canvasDimensions;
            if (r) {
                const a = this.renderer.domElement;
                (a.width !== r.width || a.height !== r.height) && (this.camera.aspect = r.width / r.height, this.renderer.setSize(r.width, r.height), i = !0);
            }
            i && this.camera.updateProjectionMatrix(), this.isPointerLocked ? this.cameraRig.getWorldPosition(this.combinedCameraPosition) : (this.cameraRig.position.y = this.combinedCameraPosition.y, this.playerRig.position.x = this.combinedCameraPosition.x, this.playerRig.position.z = this.combinedCameraPosition.z), this.forwardHtmlEvents(), this.transformHandles.forEach((a, o)=>{
                var l;
                const c = !!(!((l = this.xrDevice.controllers[o]) === null || l === void 0) && l.connected);
                a.visible = c && !this.isPointerLocked, c && a.update(e, this.camera);
            });
            const s = Math.min((e - this.lastTime) / 1e3, .1);
            this.movePlayerRig(s), this.syncDeviceTransforms(), this.renderer.render(this.scene, this.camera), this.lastTime = e;
        }
        get domElement() {
            return this.renderer.domElement;
        }
        dispose() {
            this.renderer.dispose(), document.removeEventListener("pointerlockchange", this.pointerLockChangeHandler.bind(this), !1), document.removeEventListener("mozpointerlockchange", this.pointerLockChangeHandler.bind(this), !1), document.removeEventListener("webkitpointerlockchange", this.pointerLockChangeHandler.bind(this), !1), document.removeEventListener("mousemove", this.mouseMoveHandler, !1), document.removeEventListener("keydown", this.keyDownHandler.bind(this), !1), document.removeEventListener("keyup", this.keyUpHandler.bind(this), !1);
        }
    }
    const vp = "1.1.1";
    class wp {
        constructor(e){
            this.version = vp, e.ipd = 0, eo.getState().setInputMode(e.primaryInputMode), this.devUIContainer = document.createElement("div"), this.devUIContainer.style.position = "fixed", this.devUIContainer.style.width = "100vw", this.devUIContainer.style.height = "100vh", this.devUIContainer.style.top = "50vh", this.devUIContainer.style.left = "50vw", this.devUIContainer.style.transform = "translate(-50%, -50%)", this.devUIContainer.style.pointerEvents = "none";
            const n = this.devUIContainer.attachShadow({
                mode: "open"
            });
            this.inputLayer = new yp(e), go.createRoot(n).render(h.jsx(bp, {
                xrDevice: e,
                inputLayer: this.inputLayer,
                shadowRoot: n
            }));
            const r = ()=>{
                const s = document.createElement("div");
                document.body.appendChild(s);
                const a = s.attachShadow({
                    mode: "open"
                });
                go.createRoot(a).render(h.jsx(Tp, {
                    xrDevice: e,
                    shadowRoot: a
                }));
            };
            document.body ? r() : window.onload = r;
        }
        render(e) {
            this.inputLayer.renderScene(e);
        }
        get devUICanvas() {
            return this.inputLayer.domElement;
        }
    }
    const bp = ({ xrDevice: t, inputLayer: e, shadowRoot: n })=>{
        const [i, r] = $.useState(!1);
        return $.useEffect(()=>{
            const s = ()=>{
                const a = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement;
                r(!!a);
            };
            return document.addEventListener("pointerlockchange", s, !1), document.addEventListener("mozpointerlockchange", s, !1), document.addEventListener("webkitpointerlockchange", s, !1), ()=>{
                document.removeEventListener("pointerlockchange", s, !1), document.removeEventListener("mozpointerlockchange", s, !1), document.removeEventListener("webkitpointerlockchange", s, !1);
            };
        }, []), h.jsx(K0, {
            target: n,
            disableCSSOMInjection: !0,
            children: h.jsxs("div", {
                style: {
                    width: "100vw",
                    height: "100vh",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    pointerEvents: "none"
                },
                children: [
                    h.jsx(_2, {
                        xrDevice: t,
                        inputLayer: e
                    }),
                    h.jsx(A2, {
                        xrDevice: t,
                        inputLayer: e,
                        pointerLocked: i
                    }),
                    h.jsx(w2, {
                        xrDevice: t,
                        inputLayer: e,
                        pointerLocked: i
                    })
                ]
            })
        });
    }, Tp = ({ xrDevice: t, shadowRoot: e })=>{
        const [n, i] = se.useState(t.sessionOffered && !t.activeSession);
        return se.useEffect(()=>{
            setInterval(()=>{
                i(t.sessionOffered && !t.activeSession);
            }, 1e3);
        }, []), h.jsx(K0, {
            target: e,
            disableCSSOMInjection: !0,
            children: h.jsxs(pa, {
                style: {
                    zIndex: 899,
                    position: "fixed",
                    top: n ? "8px" : "-30px",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyItems: "space-between",
                    left: "50vw",
                    transform: "translateX(-50%)",
                    transition: "all 0.2s ease-in-out",
                    paddingLeft: "5px",
                    gap: "3px"
                },
                children: [
                    h.jsx(ma, {
                        size: 24
                    }),
                    h.jsx(Ve, {
                        onClick: ()=>{
                            t.grantOfferedSession();
                        },
                        style: {
                            fontSize: "16px"
                        },
                        children: "Enter XR"
                    })
                ]
            })
        });
    };
    var mu = 1e-6, Oe = typeof Float32Array < "u" ? Float32Array : Array;
    function Ep() {
        var t = new Oe(9);
        return Oe != Float32Array && (t[1] = 0, t[2] = 0, t[3] = 0, t[5] = 0, t[6] = 0, t[7] = 0), t[0] = 1, t[4] = 1, t[8] = 1, t;
    }
    function ge() {
        var t = new Oe(16);
        return Oe != Float32Array && (t[1] = 0, t[2] = 0, t[3] = 0, t[4] = 0, t[6] = 0, t[7] = 0, t[8] = 0, t[9] = 0, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0), t[0] = 1, t[5] = 1, t[10] = 1, t[15] = 1, t;
    }
    function _p(t) {
        var e = new Oe(16);
        return e[0] = t[0], e[1] = t[1], e[2] = t[2], e[3] = t[3], e[4] = t[4], e[5] = t[5], e[6] = t[6], e[7] = t[7], e[8] = t[8], e[9] = t[9], e[10] = t[10], e[11] = t[11], e[12] = t[12], e[13] = t[13], e[14] = t[14], e[15] = t[15], e;
    }
    function gu(t, e) {
        return t[0] = e[0], t[1] = e[1], t[2] = e[2], t[3] = e[3], t[4] = e[4], t[5] = e[5], t[6] = e[6], t[7] = e[7], t[8] = e[8], t[9] = e[9], t[10] = e[10], t[11] = e[11], t[12] = e[12], t[13] = e[13], t[14] = e[14], t[15] = e[15], t;
    }
    function Sp(t) {
        return t[0] = 1, t[1] = 0, t[2] = 0, t[3] = 0, t[4] = 0, t[5] = 1, t[6] = 0, t[7] = 0, t[8] = 0, t[9] = 0, t[10] = 1, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, t;
    }
    function ro(t, e) {
        var n = e[0], i = e[1], r = e[2], s = e[3], a = e[4], o = e[5], l = e[6], c = e[7], u = e[8], d = e[9], f = e[10], g = e[11], p = e[12], x = e[13], y = e[14], v = e[15], w = n * o - i * a, T = n * l - r * a, S = n * c - s * a, E = i * l - r * o, _ = i * c - s * o, k = r * c - s * l, N = u * x - d * p, te = u * y - f * p, ue = u * v - g * p, ee = d * y - f * x, q = d * v - g * x, C = f * v - g * y, j = w * C - T * q + S * ee + E * ue - _ * te + k * N;
        return j ? (j = 1 / j, t[0] = (o * C - l * q + c * ee) * j, t[1] = (r * q - i * C - s * ee) * j, t[2] = (x * k - y * _ + v * E) * j, t[3] = (f * _ - d * k - g * E) * j, t[4] = (l * ue - a * C - c * te) * j, t[5] = (n * C - r * ue + s * te) * j, t[6] = (y * S - p * k - v * T) * j, t[7] = (u * k - f * S + g * T) * j, t[8] = (a * q - o * ue + c * N) * j, t[9] = (i * ue - n * q - s * N) * j, t[10] = (p * _ - x * S + v * w) * j, t[11] = (d * S - u * _ - g * w) * j, t[12] = (o * te - a * ee - l * N) * j, t[13] = (n * ee - i * te + r * N) * j, t[14] = (x * T - p * E - y * w) * j, t[15] = (u * E - d * T + f * w) * j, t) : null;
    }
    function es(t, e, n) {
        var i = e[0], r = e[1], s = e[2], a = e[3], o = e[4], l = e[5], c = e[6], u = e[7], d = e[8], f = e[9], g = e[10], p = e[11], x = e[12], y = e[13], v = e[14], w = e[15], T = n[0], S = n[1], E = n[2], _ = n[3];
        return t[0] = T * i + S * o + E * d + _ * x, t[1] = T * r + S * l + E * f + _ * y, t[2] = T * s + S * c + E * g + _ * v, t[3] = T * a + S * u + E * p + _ * w, T = n[4], S = n[5], E = n[6], _ = n[7], t[4] = T * i + S * o + E * d + _ * x, t[5] = T * r + S * l + E * f + _ * y, t[6] = T * s + S * c + E * g + _ * v, t[7] = T * a + S * u + E * p + _ * w, T = n[8], S = n[9], E = n[10], _ = n[11], t[8] = T * i + S * o + E * d + _ * x, t[9] = T * r + S * l + E * f + _ * y, t[10] = T * s + S * c + E * g + _ * v, t[11] = T * a + S * u + E * p + _ * w, T = n[12], S = n[13], E = n[14], _ = n[15], t[12] = T * i + S * o + E * d + _ * x, t[13] = T * r + S * l + E * f + _ * y, t[14] = T * s + S * c + E * g + _ * v, t[15] = T * a + S * u + E * p + _ * w, t;
    }
    function si(t, e) {
        return t[0] = 1, t[1] = 0, t[2] = 0, t[3] = 0, t[4] = 0, t[5] = 1, t[6] = 0, t[7] = 0, t[8] = 0, t[9] = 0, t[10] = 1, t[11] = 0, t[12] = e[0], t[13] = e[1], t[14] = e[2], t[15] = 1, t;
    }
    function Il(t, e, n) {
        var i = n[0], r = n[1], s = n[2], a = Math.sqrt(i * i + r * r + s * s), o, l, c;
        return a < mu ? null : (a = 1 / a, i *= a, r *= a, s *= a, o = Math.sin(e), l = Math.cos(e), c = 1 - l, t[0] = i * i * c + l, t[1] = r * i * c + s * o, t[2] = s * i * c - r * o, t[3] = 0, t[4] = i * r * c - s * o, t[5] = r * r * c + l, t[6] = s * r * c + i * o, t[7] = 0, t[8] = i * s * c + r * o, t[9] = r * s * c - i * o, t[10] = s * s * c + l, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, t);
    }
    function nr(t, e, n) {
        var i = e[0], r = e[1], s = e[2], a = e[3], o = i + i, l = r + r, c = s + s, u = i * o, d = i * l, f = i * c, g = r * l, p = r * c, x = s * c, y = a * o, v = a * l, w = a * c;
        return t[0] = 1 - (g + x), t[1] = d + w, t[2] = f - v, t[3] = 0, t[4] = d - w, t[5] = 1 - (u + x), t[6] = p + y, t[7] = 0, t[8] = f + v, t[9] = p - y, t[10] = 1 - (u + g), t[11] = 0, t[12] = n[0], t[13] = n[1], t[14] = n[2], t[15] = 1, t;
    }
    function Xi(t, e) {
        return t[0] = e[12], t[1] = e[13], t[2] = e[14], t;
    }
    function ga(t, e) {
        var n = e[0], i = e[1], r = e[2], s = e[4], a = e[5], o = e[6], l = e[8], c = e[9], u = e[10];
        return t[0] = Math.sqrt(n * n + i * i + r * r), t[1] = Math.sqrt(s * s + a * a + o * o), t[2] = Math.sqrt(l * l + c * c + u * u), t;
    }
    function Cr(t, e) {
        var n = new Oe(3);
        ga(n, e);
        var i = 1 / n[0], r = 1 / n[1], s = 1 / n[2], a = e[0] * i, o = e[1] * r, l = e[2] * s, c = e[4] * i, u = e[5] * r, d = e[6] * s, f = e[8] * i, g = e[9] * r, p = e[10] * s, x = a + u + p, y = 0;
        return x > 0 ? (y = Math.sqrt(x + 1) * 2, t[3] = .25 * y, t[0] = (d - g) / y, t[1] = (f - l) / y, t[2] = (o - c) / y) : a > u && a > p ? (y = Math.sqrt(1 + a - u - p) * 2, t[3] = (d - g) / y, t[0] = .25 * y, t[1] = (o + c) / y, t[2] = (f + l) / y) : u > p ? (y = Math.sqrt(1 + u - a - p) * 2, t[3] = (f - l) / y, t[0] = (o + c) / y, t[1] = .25 * y, t[2] = (d + g) / y) : (y = Math.sqrt(1 + p - a - u) * 2, t[3] = (o - c) / y, t[0] = (f + l) / y, t[1] = (d + g) / y, t[2] = .25 * y), t;
    }
    function Mp(t, e, n, i) {
        var r = e[0], s = e[1], a = e[2], o = e[3], l = r + r, c = s + s, u = a + a, d = r * l, f = r * c, g = r * u, p = s * c, x = s * u, y = a * u, v = o * l, w = o * c, T = o * u, S = i[0], E = i[1], _ = i[2];
        return t[0] = (1 - (p + y)) * S, t[1] = (f + T) * S, t[2] = (g - w) * S, t[3] = 0, t[4] = (f - T) * E, t[5] = (1 - (d + y)) * E, t[6] = (x + v) * E, t[7] = 0, t[8] = (g + w) * _, t[9] = (x - v) * _, t[10] = (1 - (d + p)) * _, t[11] = 0, t[12] = n[0], t[13] = n[1], t[14] = n[2], t[15] = 1, t;
    }
    function Ap(t, e, n, i, r) {
        var s = 1 / Math.tan(e / 2);
        if (t[0] = s / n, t[1] = 0, t[2] = 0, t[3] = 0, t[4] = 0, t[5] = s, t[6] = 0, t[7] = 0, t[8] = 0, t[9] = 0, t[11] = -1, t[12] = 0, t[13] = 0, t[15] = 0, r != null && r !== 1 / 0) {
            var a = 1 / (i - r);
            t[10] = (r + i) * a, t[14] = 2 * r * i * a;
        } else t[10] = -1, t[14] = -2 * i;
        return t;
    }
    var kl = Ap;
    function ye() {
        var t = new Oe(3);
        return Oe != Float32Array && (t[0] = 0, t[1] = 0, t[2] = 0), t;
    }
    function Rp(t) {
        var e = t[0], n = t[1], i = t[2];
        return Math.sqrt(e * e + n * n + i * i);
    }
    function He(t, e, n) {
        var i = new Oe(3);
        return i[0] = t, i[1] = e, i[2] = n, i;
    }
    function zs(t, e) {
        return t[0] = e[0], t[1] = e[1], t[2] = e[2], t;
    }
    function Li(t, e, n, i) {
        return t[0] = e, t[1] = n, t[2] = i, t;
    }
    function Pp(t, e, n) {
        return t[0] = e[0] + n[0], t[1] = e[1] + n[1], t[2] = e[2] + n[2], t;
    }
    function xu(t, e) {
        var n = e[0], i = e[1], r = e[2], s = n * n + i * i + r * r;
        return s > 0 && (s = 1 / Math.sqrt(s)), t[0] = e[0] * s, t[1] = e[1] * s, t[2] = e[2] * s, t;
    }
    function yu(t, e) {
        return t[0] * e[0] + t[1] * e[1] + t[2] * e[2];
    }
    function Sr(t, e, n) {
        var i = e[0], r = e[1], s = e[2], a = n[0], o = n[1], l = n[2];
        return t[0] = r * l - s * o, t[1] = s * a - i * l, t[2] = i * o - r * a, t;
    }
    function xa(t, e, n, i) {
        var r = e[0], s = e[1], a = e[2];
        return t[0] = r + i * (n[0] - r), t[1] = s + i * (n[1] - s), t[2] = a + i * (n[2] - a), t;
    }
    function Op(t, e, n) {
        var i = e[0], r = e[1], s = e[2], a = n[3] * i + n[7] * r + n[11] * s + n[15];
        return a = a || 1, t[0] = (n[0] * i + n[4] * r + n[8] * s + n[12]) / a, t[1] = (n[1] * i + n[5] * r + n[9] * s + n[13]) / a, t[2] = (n[2] * i + n[6] * r + n[10] * s + n[14]) / a, t;
    }
    function Ip(t, e, n) {
        var i = n[0], r = n[1], s = n[2], a = n[3], o = e[0], l = e[1], c = e[2], u = r * c - s * l, d = s * o - i * c, f = i * l - r * o;
        return u = u + u, d = d + d, f = f + f, t[0] = o + a * u + r * f - s * d, t[1] = l + a * d + s * u - i * f, t[2] = c + a * f + i * d - r * u, t;
    }
    var kp = Rp;
    (function() {
        var t = ye();
        return function(e, n, i, r, s, a) {
            var o, l;
            for(n || (n = 3), i || (i = 0), r ? l = Math.min(r * n + i, e.length) : l = e.length, o = i; o < l; o += n)t[0] = e[o], t[1] = e[o + 1], t[2] = e[o + 2], s(t, t, a), e[o] = t[0], e[o + 1] = t[1], e[o + 2] = t[2];
            return e;
        };
    })();
    function ya() {
        var t = new Oe(4);
        return Oe != Float32Array && (t[0] = 0, t[1] = 0, t[2] = 0, t[3] = 0), t;
    }
    function Lp(t, e, n, i) {
        var r = new Oe(4);
        return r[0] = t, r[1] = e, r[2] = n, r[3] = i, r;
    }
    function Cp(t, e) {
        return t[0] = e[0], t[1] = e[1], t[2] = e[2], t[3] = e[3], t;
    }
    function va(t, e, n, i, r) {
        return t[0] = e, t[1] = n, t[2] = i, t[3] = r, t;
    }
    function Np(t, e) {
        var n = e[0], i = e[1], r = e[2], s = e[3], a = n * n + i * i + r * r + s * s;
        return a > 0 && (a = 1 / Math.sqrt(a)), t[0] = n * a, t[1] = i * a, t[2] = r * a, t[3] = s * a, t;
    }
    function Ll(t, e, n) {
        var i = e[0], r = e[1], s = e[2], a = e[3];
        return t[0] = n[0] * i + n[4] * r + n[8] * s + n[12] * a, t[1] = n[1] * i + n[5] * r + n[9] * s + n[13] * a, t[2] = n[2] * i + n[6] * r + n[10] * s + n[14] * a, t[3] = n[3] * i + n[7] * r + n[11] * s + n[15] * a, t;
    }
    (function() {
        var t = ya();
        return function(e, n, i, r, s, a) {
            var o, l;
            for(n || (n = 4), i || (i = 0), r ? l = Math.min(r * n + i, e.length) : l = e.length, o = i; o < l; o += n)t[0] = e[o], t[1] = e[o + 1], t[2] = e[o + 2], t[3] = e[o + 3], s(t, t, a), e[o] = t[0], e[o + 1] = t[1], e[o + 2] = t[2], e[o + 3] = t[3];
            return e;
        };
    })();
    function tt() {
        var t = new Oe(4);
        return Oe != Float32Array && (t[0] = 0, t[1] = 0, t[2] = 0), t[3] = 1, t;
    }
    function vu(t, e, n) {
        n = n * .5;
        var i = Math.sin(n);
        return t[0] = i * e[0], t[1] = i * e[1], t[2] = i * e[2], t[3] = Math.cos(n), t;
    }
    function Fp(t, e, n) {
        var i = e[0], r = e[1], s = e[2], a = e[3], o = n[0], l = n[1], c = n[2], u = n[3];
        return t[0] = i * u + a * o + r * c - s * l, t[1] = r * u + a * l + s * o - i * c, t[2] = s * u + a * c + i * l - r * o, t[3] = a * u - i * o - r * l - s * c, t;
    }
    function Di(t, e, n, i) {
        var r = e[0], s = e[1], a = e[2], o = e[3], l = n[0], c = n[1], u = n[2], d = n[3], f, g, p, x, y;
        return g = r * l + s * c + a * u + o * d, g < 0 && (g = -g, l = -l, c = -c, u = -u, d = -d), 1 - g > mu ? (f = Math.acos(g), p = Math.sin(f), x = Math.sin((1 - i) * f) / p, y = Math.sin(i * f) / p) : (x = 1 - i, y = i), t[0] = x * r + y * l, t[1] = x * s + y * c, t[2] = x * a + y * u, t[3] = x * o + y * d, t;
    }
    function zp(t, e) {
        return t[0] = -e[0], t[1] = -e[1], t[2] = -e[2], t[3] = e[3], t;
    }
    function Dp(t, e) {
        var n = e[0] + e[4] + e[8], i;
        if (n > 0) i = Math.sqrt(n + 1), t[3] = .5 * i, i = .5 / i, t[0] = (e[5] - e[7]) * i, t[1] = (e[6] - e[2]) * i, t[2] = (e[1] - e[3]) * i;
        else {
            var r = 0;
            e[4] > e[0] && (r = 1), e[8] > e[r * 3 + r] && (r = 2);
            var s = (r + 1) % 3, a = (r + 2) % 3;
            i = Math.sqrt(e[r * 3 + r] - e[s * 3 + s] - e[a * 3 + a] + 1), t[r] = .5 * i, i = .5 / i, t[3] = (e[s * 3 + a] - e[a * 3 + s]) * i, t[s] = (e[s * 3 + r] + e[r * 3 + s]) * i, t[a] = (e[a * 3 + r] + e[r * 3 + a]) * i;
        }
        return t;
    }
    var Nr = Lp, Ds = Cp, Cl = va, ts = Np;
    (function() {
        var t = ye(), e = He(1, 0, 0), n = He(0, 1, 0);
        return function(i, r, s) {
            var a = yu(r, s);
            return a < -.999999 ? (Sr(t, e, r), kp(t) < 1e-6 && Sr(t, n, r), xu(t, t), vu(i, t, Math.PI), i) : a > .999999 ? (i[0] = 0, i[1] = 0, i[2] = 0, i[3] = 1, i) : (Sr(t, r, s), i[0] = t[0], i[1] = t[1], i[2] = t[2], i[3] = 1 + a, ts(i, i));
        };
    })();
    (function() {
        var t = tt(), e = tt();
        return function(n, i, r, s, a, o) {
            return Di(t, i, a, o), Di(e, r, s, o), Di(n, t, e, 2 * o * (1 - o)), n;
        };
    })();
    (function() {
        var t = Ep();
        return function(e, n, i, r) {
            return t[0] = i[0], t[3] = i[1], t[6] = i[2], t[1] = r[0], t[4] = r[1], t[7] = r[2], t[2] = -n[0], t[5] = -n[1], t[8] = -n[2], ts(e, Dp(e, t));
        };
    })();
    const D = Symbol("@iwer/action-player"), Ge = Symbol("@iwer/xr-anchor"), Bs = Symbol("@iwer/xr-controller"), b = Symbol("@iwer/xr-device"), Jt = Symbol("@iwer/xr-hand-input"), J = Symbol("@iwer/xr-tracked-input"), G = Symbol("@iwer/xr-frame"), P = Symbol("@iwer/gamepad"), $e = Symbol("@iwer/xr-system"), Pt = Symbol("@iwer/xr-input-source"), It = Symbol("@iwer/xr-webgl-layer"), kt = Symbol("@iwer/xr-mesh"), Lt = Symbol("@iwer/xr-plane"), Nl = Symbol("@iwer/xr-joint-pose"), _i = Symbol("@iwer/xr-pose"), Fl = Symbol("@iwer/xr-viewer-pose"), Ce = Symbol("@iwer/xr-rigid-transform"), Si = Symbol("@iwer/xr-render-state"), m = Symbol("@iwer/xr-session"), un = Symbol("@iwer/xr-joint-space"), Ct = Symbol("@iwer/xr-reference-space"), he = Symbol("@iwer/xr-space"), Nt = Symbol("@iwer/xr-view"), Mi = Symbol("@iwer/xr-viewport"), Ne = Symbol("@iwer/xr-ray"), en = Symbol("@iwer/xr-depth-info"), mt = Symbol("@iwer/xr-hit-test");
    class le extends EventTarget {
        constructor(e, n){
            super(), this[he] = {
                parentSpace: e,
                offsetMatrix: n ? _p(n) : ge(),
                emulated: !0
            };
        }
    }
    class Bp extends le {
        constructor(){
            super(void 0, ge());
        }
    }
    class gn {
        static updateOffsetPosition(e, n) {
            const i = e[he].offsetMatrix;
            si(i, n);
        }
        static updateOffsetQuaternion(e, n) {
            const i = e[he].offsetMatrix, r = ye();
            Xi(r, i), nr(i, n, r);
        }
        static updateOffsetMatrix(e, n) {
            const i = e[he].offsetMatrix;
            gu(i, n);
        }
        static calculateGlobalOffsetMatrix(e, n = ge()) {
            const i = e[he].parentSpace ? gn.calculateGlobalOffsetMatrix(e[he].parentSpace) : ge();
            return es(n, i, e[he].offsetMatrix), n;
        }
    }
    let hn = class wu {
        constructor(e = 0, n = 0, i = 0){
            this.vec3 = He(e, n, i), this.tempVec3 = ye();
        }
        get x() {
            return this.vec3[0];
        }
        set x(e) {
            this.vec3[0] = e;
        }
        get y() {
            return this.vec3[1];
        }
        set y(e) {
            this.vec3[1] = e;
        }
        get z() {
            return this.vec3[2];
        }
        set z(e) {
            this.vec3[2] = e;
        }
        set(e, n, i) {
            return Li(this.vec3, e, n, i), this;
        }
        clone() {
            return new wu(this.x, this.y, this.z);
        }
        copy(e) {
            return this.x = e.x, this.y = e.y, this.z = e.z, this;
        }
        round() {
            return this.x = Math.round(this.x), this.y = Math.round(this.y), this.z = Math.round(this.z), this;
        }
        normalize() {
            return zs(this.tempVec3, this.vec3), xu(this.vec3, this.tempVec3), this;
        }
        add(e) {
            return zs(this.tempVec3, this.vec3), Pp(this.vec3, this.tempVec3, e.vec3), this;
        }
        applyQuaternion(e) {
            return zs(this.tempVec3, this.vec3), Ip(this.vec3, this.tempVec3, e.quat), this;
        }
    }, Bi = class bu {
        constructor(e = 0, n = 0, i = 0, r = 1){
            this.quat = Nr(e, n, i, r), this.tempQuat = tt();
        }
        get x() {
            return this.quat[0];
        }
        set x(e) {
            this.quat[0] = e;
        }
        get y() {
            return this.quat[1];
        }
        set y(e) {
            this.quat[1] = e;
        }
        get z() {
            return this.quat[2];
        }
        set z(e) {
            this.quat[2] = e;
        }
        get w() {
            return this.quat[3];
        }
        set w(e) {
            this.quat[3] = e;
        }
        set(e, n, i, r) {
            return Cl(this.quat, e, n, i, r), this;
        }
        clone() {
            return new bu(this.x, this.y, this.z, this.w);
        }
        copy(e) {
            return Cl(this.quat, e.x, e.y, e.z, e.w), this;
        }
        normalize() {
            return Ds(this.tempQuat, this.quat), ts(this.quat, this.tempQuat), this;
        }
        invert() {
            return Ds(this.tempQuat, this.quat), zp(this.quat, this.tempQuat), this;
        }
        multiply(e) {
            return Ds(this.tempQuat, this.quat), Fp(this.quat, this.tempQuat, e.quat), this;
        }
        setFromAxisAngle(e, n) {
            return vu(this.quat, e.vec3, n), this;
        }
    };
    function st(t) {
        return {
            x: t.x,
            y: t.y,
            z: t.z
        };
    }
    function at(t) {
        return {
            x: t.x,
            y: t.y,
            z: t.z,
            w: t.w
        };
    }
    function jp(t) {
        const { x: e, y: n, z: i, w: r } = t, s = 180 / Math.PI, a = Math.max(-1, Math.min(1, 2 * (r * e - n * i)));
        let o;
        Math.abs(a) >= 1 ? o = Math.sign(a) * Math.PI / 2 : o = Math.asin(a);
        const l = 2 * (r * n + e * i), c = 1 - 2 * (e * e + n * n), u = Math.atan2(l, c), d = 2 * (r * i + e * n), f = 1 - 2 * (e * e + i * i), g = Math.atan2(d, f);
        return {
            pitch: o * s,
            yaw: u * s,
            roll: g * s
        };
    }
    function Tu(t) {
        var e, n, i;
        const r = Math.PI / 180, s = ((e = t.pitch) !== null && e !== void 0 ? e : 0) * r, a = ((n = t.yaw) !== null && n !== void 0 ? n : 0) * r, o = ((i = t.roll) !== null && i !== void 0 ? i : 0) * r, l = Math.cos(s * .5), c = Math.sin(s * .5), u = Math.cos(a * .5), d = Math.sin(a * .5), f = Math.cos(o * .5), g = Math.sin(o * .5);
        return {
            w: l * u * f + c * d * g,
            x: c * u * f + l * d * g,
            y: l * d * f - c * u * g,
            z: l * u * g - c * d * f
        };
    }
    function Up(t, e) {
        const n = e.x - t.x, i = e.y - t.y, r = e.z - t.z, s = Math.sqrt(n * n + i * i + r * r);
        return s === 0 ? {
            x: 0,
            y: 0,
            z: -1
        } : {
            x: n / s,
            y: i / s,
            z: r / s
        };
    }
    function Vp(t) {
        const e = Math.sqrt(t.x * t.x + t.z * t.z);
        let n = 0;
        e > 1e-4 && (n = Math.atan2(-t.x, -t.z));
        const i = Math.atan2(t.y, e), r = 180 / Math.PI;
        return Tu({
            pitch: i * r,
            yaw: n * r,
            roll: 0
        });
    }
    function Gp(t, e = {
        x: 0,
        y: 1,
        z: 0
    }) {
        const n = Math.sqrt(t.x * t.x + t.y * t.y + t.z * t.z);
        if (n === 0) return {
            x: 0,
            y: 0,
            z: 0,
            w: 1
        };
        const i = {
            x: t.x / n,
            y: t.y / n,
            z: t.z / n
        }, r = {
            x: i.y * e.z - i.z * e.y,
            y: i.z * e.x - i.x * e.z,
            z: i.x * e.y - i.y * e.x
        }, s = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
        if (s === 0) {
            const _ = {
                x: 1,
                y: 0,
                z: 0
            };
            r.x = i.y * _.z - i.z * _.y, r.y = i.z * _.x - i.x * _.z, r.z = i.x * _.y - i.y * _.x;
            const k = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
            r.x /= k, r.y /= k, r.z /= k;
        } else r.x /= s, r.y /= s, r.z /= s;
        const a = {
            x: r.y * i.z - r.z * i.y,
            y: r.z * i.x - r.x * i.z,
            z: r.x * i.y - r.y * i.x
        }, o = r.x, l = a.x, c = -i.x, u = r.y, d = a.y, f = -i.y, g = r.z, p = a.z, x = -i.z, y = o + d + x;
        let v, w, T, S;
        if (y > 0) {
            const _ = .5 / Math.sqrt(y + 1);
            v = .25 / _, w = (p - f) * _, T = (c - g) * _, S = (u - l) * _;
        } else if (o > d && o > x) {
            const _ = 2 * Math.sqrt(1 + o - d - x);
            v = (p - f) / _, w = .25 * _, T = (l + u) / _, S = (c + g) / _;
        } else if (d > x) {
            const _ = 2 * Math.sqrt(1 + d - o - x);
            v = (c - g) / _, w = (l + u) / _, T = .25 * _, S = (f + p) / _;
        } else {
            const _ = 2 * Math.sqrt(1 + x - o - d);
            v = (u - l) / _, w = (c + g) / _, T = (f + p) / _, S = .25 * _;
        }
        const E = Math.sqrt(w * w + T * T + S * S + v * v);
        return E > 0 && (w /= E, T /= E, S /= E, v /= E), {
            x: w,
            y: T,
            z: S,
            w: v
        };
    }
    function $p(t, e = 5e3) {
        return new Promise((n, i)=>{
            const r = Date.now(), s = ()=>{
                t() ? n() : Date.now() - r > e ? i(new Error("Timeout waiting for condition")) : requestAnimationFrame(s);
            };
            s();
        });
    }
    function Hp(t) {
        return "pitch" in t || "yaw" in t || "roll" in t;
    }
    function zl(t) {
        return Hp(t) ? Tu(t) : t;
    }
    function rn(t, e, n) {
        return t + (e - t) * n;
    }
    function Wp(t, e, n) {
        return {
            x: rn(t.x, e.x, n),
            y: rn(t.y, e.y, n),
            z: rn(t.z, e.z, n)
        };
    }
    function qp(t, e, n) {
        let i = t.x * e.x + t.y * e.y + t.z * e.z + t.w * e.w, r = e.x, s = e.y, a = e.z, o = e.w;
        if (i < 0 && (i = -i, r = -r, s = -s, a = -a, o = -o), i > .9995) {
            const p = {
                x: rn(t.x, r, n),
                y: rn(t.y, s, n),
                z: rn(t.z, a, n),
                w: rn(t.w, o, n)
            }, x = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z + p.w * p.w);
            return {
                x: p.x / x,
                y: p.y / x,
                z: p.z / x,
                w: p.w / x
            };
        }
        const l = Math.acos(i), c = l * n, u = Math.sin(c), d = Math.sin(l), f = Math.cos(c) - i * u / d, g = u / d;
        return {
            x: f * t.x + g * r,
            y: f * t.y + g * s,
            z: f * t.z + g * a,
            w: f * t.w + g * o
        };
    }
    const Xp = {
        right: "controller-right",
        left: "controller-left",
        "right-controller": "controller-right",
        "left-controller": "controller-left",
        "controllers.right": "controller-right",
        "controllers.left": "controller-left",
        rightController: "controller-right",
        leftController: "controller-left",
        "right-hand": "hand-right",
        "left-hand": "hand-left",
        "hands.right": "hand-right",
        "hands.left": "hand-left",
        rightHand: "hand-right",
        leftHand: "hand-left"
    };
    function Yp(t) {
        var e;
        return (e = Xp[t]) !== null && e !== void 0 ? e : t;
    }
    class Ut {
        constructor(e){
            this.commandQueue = [], this._isCaptured = !1, this.releaseTimer = null, this.actionIdCounter = 0, this.RELEASE_TIMEOUT_MS = 3e4, this.device = e;
        }
        generateActionId() {
            return `action_${++this.actionIdCounter}`;
        }
        get isCaptured() {
            return this._isCaptured;
        }
        get queueLength() {
            return this.commandQueue.length;
        }
        enqueueDiscrete(e, n) {
            return new Promise((i, r)=>{
                const s = {
                    type: "discrete",
                    id: this.generateActionId(),
                    method: e,
                    params: n,
                    resolve: i,
                    reject: r
                };
                this.commandQueue.push(s);
            });
        }
        enqueueDuration(e, n, i, r, s) {
            return new Promise((a, o)=>{
                const l = {
                    type: "duration",
                    id: this.generateActionId(),
                    method: e,
                    params: n,
                    durationMs: i,
                    elapsedMs: 0,
                    startState: r,
                    targetState: s,
                    resolve: a,
                    reject: o
                };
                this.commandQueue.push(l);
            });
        }
        update(e) {
            if (this.commandQueue.length !== 0) {
                for(this.cancelReleaseTimer(), this._isCaptured || (this._isCaptured = !0, this.device.controlMode = "programmatic"); this.commandQueue.length > 0;){
                    const n = this.commandQueue[0];
                    if (n.type === "discrete") {
                        try {
                            const i = this.executeDiscreteAction(n);
                            n.resolve(i);
                        } catch (i) {
                            n.reject(i);
                        }
                        this.commandQueue.shift();
                    } else if (n.elapsedMs += e, n.elapsedMs >= n.durationMs) {
                        try {
                            this.applyDurationFinalState(n), n.resolve(this.getDurationResult(n));
                        } catch (i) {
                            n.reject(i);
                        }
                        this.commandQueue.shift();
                    } else {
                        try {
                            const i = n.elapsedMs / n.durationMs;
                            this.applyDurationLerpState(n, i);
                        } catch (i) {
                            n.reject(i), this.commandQueue.shift();
                            continue;
                        }
                        break;
                    }
                }
                this.device.notifyStateChange(), this.commandQueue.length === 0 && this.startReleaseTimer();
            }
        }
        startReleaseTimer() {
            this.cancelReleaseTimer(), this.releaseTimer = setTimeout(()=>{
                this._isCaptured = !1, this.device.controlMode = "manual", this.releaseTimer = null;
            }, this.RELEASE_TIMEOUT_MS);
        }
        cancelReleaseTimer() {
            this.releaseTimer !== null && (clearTimeout(this.releaseTimer), this.releaseTimer = null);
        }
        getDeviceTransform(e) {
            switch(e){
                case "headset":
                    return {
                        position: st(this.device.position),
                        orientation: at(this.device.quaternion)
                    };
                case "controller-left":
                    {
                        const n = this.device.controllers.left;
                        if (!n) throw new Error("Left controller not available");
                        return {
                            position: st(n.position),
                            orientation: at(n.quaternion)
                        };
                    }
                case "controller-right":
                    {
                        const n = this.device.controllers.right;
                        if (!n) throw new Error("Right controller not available");
                        return {
                            position: st(n.position),
                            orientation: at(n.quaternion)
                        };
                    }
                case "hand-left":
                    {
                        const n = this.device.hands.left;
                        if (!n) throw new Error("Left hand not available");
                        return {
                            position: st(n.position),
                            orientation: at(n.quaternion)
                        };
                    }
                case "hand-right":
                    {
                        const n = this.device.hands.right;
                        if (!n) throw new Error("Right hand not available");
                        return {
                            position: st(n.position),
                            orientation: at(n.quaternion)
                        };
                    }
                default:
                    throw new Error(`Unknown device: ${e}`);
            }
        }
        setDeviceTransform(e, n, i) {
            switch(e){
                case "headset":
                    n && this.device.position.set(n.x, n.y, n.z), i && this.device.quaternion.set(i.x, i.y, i.z, i.w);
                    break;
                case "controller-left":
                    {
                        const r = this.device.controllers.left;
                        if (!r) throw new Error("Left controller not available");
                        n && r.position.set(n.x, n.y, n.z), i && r.quaternion.set(i.x, i.y, i.z, i.w);
                        break;
                    }
                case "controller-right":
                    {
                        const r = this.device.controllers.right;
                        if (!r) throw new Error("Right controller not available");
                        n && r.position.set(n.x, n.y, n.z), i && r.quaternion.set(i.x, i.y, i.z, i.w);
                        break;
                    }
                case "hand-left":
                    {
                        const r = this.device.hands.left;
                        if (!r) throw new Error("Left hand not available");
                        n && r.position.set(n.x, n.y, n.z), i && r.quaternion.set(i.x, i.y, i.z, i.w);
                        break;
                    }
                case "hand-right":
                    {
                        const r = this.device.hands.right;
                        if (!r) throw new Error("Right hand not available");
                        n && r.position.set(n.x, n.y, n.z), i && r.quaternion.set(i.x, i.y, i.z, i.w);
                        break;
                    }
                default:
                    throw new Error(`Unknown device: ${e}`);
            }
        }
        transformXROriginToGlobal(e) {
            var n, i;
            const r = this.device.activeSession;
            if (!r) return e;
            const s = (n = r[m]) === null || n === void 0 ? void 0 : n.referenceSpaces;
            if (!s || s.length === 0) return e;
            const o = (i = s[0][he]) === null || i === void 0 ? void 0 : i.offsetMatrix;
            if (!o) return e;
            const l = He(e.x, e.y, e.z);
            return Op(l, l, o), {
                x: l[0],
                y: l[1],
                z: l[2]
            };
        }
        getDeviceSelectValue(e) {
            var n, i, r, s, a, o, l, c;
            switch(e){
                case "controller-left":
                    return (i = (n = this.device.controllers.left) === null || n === void 0 ? void 0 : n.getButtonValue("trigger")) !== null && i !== void 0 ? i : 0;
                case "controller-right":
                    return (s = (r = this.device.controllers.right) === null || r === void 0 ? void 0 : r.getButtonValue("trigger")) !== null && s !== void 0 ? s : 0;
                case "hand-left":
                    return (o = (a = this.device.hands.left) === null || a === void 0 ? void 0 : a.pinchValue) !== null && o !== void 0 ? o : 0;
                case "hand-right":
                    return (c = (l = this.device.hands.right) === null || l === void 0 ? void 0 : l.pinchValue) !== null && c !== void 0 ? c : 0;
                default:
                    throw new Error(`Unknown input device: ${e}`);
            }
        }
        setDeviceSelectValue(e, n) {
            var i, r, s, a;
            switch(e){
                case "controller-left":
                    (i = this.device.controllers.left) === null || i === void 0 || i.updateButtonValue("trigger", n);
                    break;
                case "controller-right":
                    (r = this.device.controllers.right) === null || r === void 0 || r.updateButtonValue("trigger", n);
                    break;
                case "hand-left":
                    (s = this.device.hands.left) === null || s === void 0 || s.updatePinchValue(n);
                    break;
                case "hand-right":
                    (a = this.device.hands.right) === null || a === void 0 || a.updatePinchValue(n);
                    break;
                default:
                    throw new Error(`Unknown input device: ${e}`);
            }
        }
        setDeviceConnected(e, n) {
            switch(e){
                case "controller-left":
                    this.device.controllers.left && (this.device.controllers.left.connected = n);
                    break;
                case "controller-right":
                    this.device.controllers.right && (this.device.controllers.right.connected = n);
                    break;
                case "hand-left":
                    this.device.hands.left && (this.device.hands.left.connected = n);
                    break;
                case "hand-right":
                    this.device.hands.right && (this.device.hands.right.connected = n);
                    break;
                default:
                    throw new Error(`Unknown input device: ${e}`);
            }
        }
        executeDiscreteAction(e) {
            const { method: n, params: i } = e;
            switch(n){
                case "get_session_status":
                    return this.executeGetSessionStatus();
                case "accept_session":
                    return this.executeAcceptSession();
                case "end_session":
                    return this.executeEndSession();
                case "get_transform":
                    return this.executeGetTransform(i);
                case "set_transform":
                    return this.executeSetTransform(i);
                case "look_at":
                    return this.executeLookAt(i);
                case "set_input_mode":
                    return this.executeSetInputMode(i);
                case "set_connected":
                    return this.executeSetConnected(i);
                case "get_select_value":
                    return this.executeGetSelectValue(i);
                case "set_select_value":
                    return this.executeSetSelectValue(i);
                case "get_gamepad_state":
                    return this.executeGetGamepadState(i);
                case "set_gamepad_state":
                    return this.executeSetGamepadState(i);
                case "get_device_state":
                    return this.executeGetDeviceState();
                case "set_device_state":
                    return this.executeSetDeviceState(i);
                case "capture_canvas":
                    return this.executeCaptureCanvas(i);
                case "_select_press":
                    {
                        const r = i.device;
                        this.setDeviceSelectValue(r, 1);
                        return;
                    }
                case "_select_release":
                    {
                        const r = i.device;
                        this.setDeviceSelectValue(r, 0);
                        return;
                    }
                default:
                    throw new Error(`Unknown method: ${n}`);
            }
        }
        executeGetSessionStatus() {
            const e = this.device.activeSession;
            return {
                deviceName: this.device.name,
                isRuntimeInstalled: !0,
                sessionActive: !!e,
                sessionOffered: this.device.sessionOffered,
                sessionMode: e ? e.mode : null,
                enabledFeatures: e ? Array.from(e.enabledFeatures || []) : [],
                visibilityState: this.device.visibilityState
            };
        }
        executeAcceptSession() {
            if (!this.device.sessionOffered) throw new Error("No session has been offered");
            return this.device.grantOfferedSession(), {
                success: !0
            };
        }
        executeEndSession() {
            const e = this.device.activeSession;
            if (!e) throw new Error("No active session");
            return e.end(), {
                success: !0
            };
        }
        executeGetTransform(e) {
            const { device: n } = e, i = this.getDeviceTransform(n);
            return {
                device: n,
                position: i.position,
                orientation: i.orientation,
                euler: jp(i.orientation)
            };
        }
        executeSetTransform(e) {
            const { device: n, position: i, orientation: r } = e, s = r ? zl(r) : void 0;
            this.setDeviceTransform(n, i, s);
            const a = this.getDeviceTransform(n);
            return {
                device: n,
                position: a.position,
                orientation: a.orientation
            };
        }
        executeLookAt(e) {
            const { device: n, target: i, moveToDistance: r } = e, s = this.getDeviceTransform(n), a = this.transformXROriginToGlobal(i), o = Up(s.position, a), l = n === "headset" ? Vp(o) : Gp(o);
            let c;
            r !== void 0 && (c = {
                x: a.x - o.x * r,
                y: a.y - o.y * r,
                z: a.z - o.z * r
            }), this.setDeviceTransform(n, c, l);
            const u = this.getDeviceTransform(n);
            return {
                device: n,
                position: u.position,
                orientation: u.orientation
            };
        }
        executeSetInputMode(e) {
            var n, i, r, s;
            const { mode: a } = e;
            this.device.primaryInputMode = a;
            const o = [];
            return a === "controller" ? (!((n = this.device.controllers.left) === null || n === void 0) && n.connected && o.push("controller-left"), !((i = this.device.controllers.right) === null || i === void 0) && i.connected && o.push("controller-right")) : (!((r = this.device.hands.left) === null || r === void 0) && r.connected && o.push("hand-left"), !((s = this.device.hands.right) === null || s === void 0) && s.connected && o.push("hand-right")), {
                mode: a,
                activeDevices: o
            };
        }
        executeSetConnected(e) {
            const { device: n, connected: i } = e;
            return this.setDeviceConnected(n, i), {
                device: n,
                connected: i
            };
        }
        executeGetSelectValue(e) {
            const { device: n } = e, i = this.getDeviceSelectValue(n);
            return {
                device: n,
                value: i
            };
        }
        executeSetSelectValue(e) {
            const { device: n, value: i } = e;
            return this.setDeviceSelectValue(n, i), {
                device: n,
                value: i
            };
        }
        executeGetGamepadState(e) {
            const { device: n } = e, i = n === "controller-left" ? "left" : "right", r = this.device.controllers[i];
            if (!r) throw new Error(`Controller ${i} not available`);
            const a = [
                "trigger",
                "squeeze",
                "thumbstick",
                i === "left" ? "x-button" : "a-button",
                i === "left" ? "y-button" : "b-button",
                "thumbrest"
            ].map((c, u)=>({
                    index: u,
                    name: c.replace("x-button", "x").replace("y-button", "y").replace("a-button", "a").replace("b-button", "b"),
                    value: r.getButtonValue(c),
                    touched: r.getButtonTouched(c),
                    pressed: r.getButtonValue(c) > .5
                })), o = r.getAxes(), l = [
                {
                    index: 0,
                    name: "thumbstick-x",
                    value: o.x
                },
                {
                    index: 1,
                    name: "thumbstick-y",
                    value: o.y
                }
            ];
            return {
                device: n,
                connected: r.connected,
                buttons: a,
                axes: l
            };
        }
        executeSetGamepadState(e) {
            const { device: n, buttons: i, axes: r } = e, s = n === "controller-left" ? "left" : "right", a = this.device.controllers[s];
            if (!a) throw new Error(`Controller ${s} not available`);
            let o = 0, l = 0;
            const c = [
                "trigger",
                "squeeze",
                "thumbstick",
                s === "left" ? "x-button" : "a-button",
                s === "left" ? "y-button" : "b-button",
                "thumbrest"
            ];
            if (i) for (const u of i){
                const d = c[u.index];
                d && (a.updateButtonValue(d, u.value), u.touched !== void 0 && a.updateButtonTouch(d, u.touched), o++);
            }
            if (r) {
                let u, d;
                for (const f of r)f.index === 0 ? (u = f.value, l++) : f.index === 1 && (d = f.value, l++);
                if (u !== void 0 || d !== void 0) {
                    const f = a.getAxes();
                    a.updateAxes("thumbstick", u ?? f.x, d ?? f.y);
                }
            }
            return {
                device: n,
                buttonsSet: o,
                axesSet: l
            };
        }
        executeGetDeviceState() {
            var e, n, i, r, s, a, o, l, c, u, d, f, g, p, x, y, v, w, T, S, E, _, k, N;
            return {
                headset: {
                    position: st(this.device.position),
                    orientation: at(this.device.quaternion)
                },
                inputMode: this.device.primaryInputMode,
                controllers: {
                    left: {
                        connected: (n = (e = this.device.controllers.left) === null || e === void 0 ? void 0 : e.connected) !== null && n !== void 0 ? n : !1,
                        position: st((r = (i = this.device.controllers.left) === null || i === void 0 ? void 0 : i.position) !== null && r !== void 0 ? r : {
                            x: 0,
                            y: 0,
                            z: 0
                        }),
                        orientation: at((a = (s = this.device.controllers.left) === null || s === void 0 ? void 0 : s.quaternion) !== null && a !== void 0 ? a : {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1
                        })
                    },
                    right: {
                        connected: (l = (o = this.device.controllers.right) === null || o === void 0 ? void 0 : o.connected) !== null && l !== void 0 ? l : !1,
                        position: st((u = (c = this.device.controllers.right) === null || c === void 0 ? void 0 : c.position) !== null && u !== void 0 ? u : {
                            x: 0,
                            y: 0,
                            z: 0
                        }),
                        orientation: at((f = (d = this.device.controllers.right) === null || d === void 0 ? void 0 : d.quaternion) !== null && f !== void 0 ? f : {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1
                        })
                    }
                },
                hands: {
                    left: {
                        connected: (p = (g = this.device.hands.left) === null || g === void 0 ? void 0 : g.connected) !== null && p !== void 0 ? p : !1,
                        position: st((y = (x = this.device.hands.left) === null || x === void 0 ? void 0 : x.position) !== null && y !== void 0 ? y : {
                            x: 0,
                            y: 0,
                            z: 0
                        }),
                        orientation: at((w = (v = this.device.hands.left) === null || v === void 0 ? void 0 : v.quaternion) !== null && w !== void 0 ? w : {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1
                        })
                    },
                    right: {
                        connected: (S = (T = this.device.hands.right) === null || T === void 0 ? void 0 : T.connected) !== null && S !== void 0 ? S : !1,
                        position: st((_ = (E = this.device.hands.right) === null || E === void 0 ? void 0 : E.position) !== null && _ !== void 0 ? _ : {
                            x: 0,
                            y: 0,
                            z: 0
                        }),
                        orientation: at((N = (k = this.device.hands.right) === null || k === void 0 ? void 0 : k.quaternion) !== null && N !== void 0 ? N : {
                            x: 0,
                            y: 0,
                            z: 0,
                            w: 1
                        })
                    }
                },
                stereoEnabled: this.device.stereoEnabled,
                fov: this.device.fovy * (180 / Math.PI)
            };
        }
        executeSetDeviceState(e) {
            const { state: n } = e;
            return n ? (n.headset && (n.headset.position && this.device.position.set(n.headset.position.x, n.headset.position.y, n.headset.position.z), n.headset.orientation && this.device.quaternion.set(n.headset.orientation.x, n.headset.orientation.y, n.headset.orientation.z, n.headset.orientation.w)), n.inputMode !== void 0 && (this.device.primaryInputMode = n.inputMode), n.stereoEnabled !== void 0 && (this.device.stereoEnabled = n.stereoEnabled), n.fov !== void 0 && (this.device.fovy = n.fov * (Math.PI / 180)), n.controllers && (this.applyInputState("controller-left", n.controllers.left), this.applyInputState("controller-right", n.controllers.right)), n.hands && (this.applyInputState("hand-left", n.hands.left), this.applyInputState("hand-right", n.hands.right))) : (this.device.position.set(0, 1.6, 0), this.device.quaternion.set(0, 0, 0, 1), this.device.primaryInputMode = "controller", this.device.stereoEnabled = !1, this.device.controllers.left && (this.device.controllers.left.position.set(-.2, 1.4, -.3), this.device.controllers.left.quaternion.set(0, 0, 0, 1), this.device.controllers.left.connected = !0), this.device.controllers.right && (this.device.controllers.right.position.set(.2, 1.4, -.3), this.device.controllers.right.quaternion.set(0, 0, 0, 1), this.device.controllers.right.connected = !0), this.device.hands.left && (this.device.hands.left.position.set(-.15, 1.3, -.4), this.device.hands.left.quaternion.set(0, 0, 0, 1), this.device.hands.left.connected = !0), this.device.hands.right && (this.device.hands.right.position.set(.15, 1.3, -.4), this.device.hands.right.quaternion.set(0, 0, 0, 1), this.device.hands.right.connected = !0)), {
                state: this.executeGetDeviceState()
            };
        }
        applyInputState(e, n) {
            n && (n.connected !== void 0 && this.setDeviceConnected(e, n.connected), (n.position || n.orientation) && this.setDeviceTransform(e, n.position, n.orientation));
        }
        executeCaptureCanvas(e) {
            const { maxWidth: n = 800, format: i = "png", quality: r = .92 } = e;
            let s = this.device.appCanvas;
            if (!s) {
                const p = document.querySelectorAll("canvas");
                if (p.length === 1) s = p[0];
                else if (p.length > 1) {
                    let x = null, y = 0;
                    p.forEach((v)=>{
                        const w = v.getBoundingClientRect(), T = w.width * w.height;
                        T > y && w.width > 0 && w.height > 0 && (y = T, x = v);
                    }), s = x;
                }
            }
            if (!s) throw new Error("No canvas available. Either start an XR session or ensure an app canvas is in the DOM.");
            const a = document.createElement("canvas"), o = a.getContext("2d");
            if (!o) throw new Error("Failed to create canvas context");
            const l = s.height / s.width, c = Math.min(s.width, n), u = Math.round(c * l);
            a.width = c, a.height = u, o.drawImage(s, 0, 0, c, u);
            const d = `image/${i}`;
            return {
                imageData: a.toDataURL(d, r).split(",")[1],
                width: c,
                height: u,
                format: i,
                timestamp: Date.now()
            };
        }
        applyDurationLerpState(e, n) {
            const { startState: i, targetState: r, params: s } = e, a = s.device;
            let o, l;
            i.position && r.position && (o = Wp(i.position, r.position, n)), i.orientation && r.orientation && (l = qp(i.orientation, r.orientation, n)), this.setDeviceTransform(a, o, l);
        }
        applyDurationFinalState(e) {
            const { targetState: n, params: i } = e, r = i.device;
            this.setDeviceTransform(r, n.position, n.orientation);
        }
        getDurationResult(e) {
            const { params: n, elapsedMs: i } = e, r = n.device, s = this.getDeviceTransform(r);
            return {
                device: r,
                position: s.position,
                orientation: s.orientation,
                actualDuration: i / 1e3
            };
        }
        activateCaptureMode() {
            this._isCaptured || (this._isCaptured = !0, this.cancelReleaseTimer(), this.device.controlMode = "programmatic"), this.startReleaseTimer();
        }
        async dispatch(e, n = {}) {
            var i;
            if (typeof n.device == "string" && (n.device = Yp(n.device)), Ut.IMMEDIATE_METHODS.has(e)) return Ut.ACTIVE_IMMEDIATE_METHODS.has(e) && this.activateCaptureMode(), this.executeImmediateMethod(e, n);
            if (Ut.SESSION_REQUIRED_METHODS.has(e) && !this.device.activeSession) throw new Error(`Cannot execute '${e}': No active XR session. Use 'get_session_status' to check session state, and 'accept_session' to start a session.`);
            if (e === "animate_to") {
                const r = n, s = this.getDeviceTransform(r.device), a = ((i = r.duration) !== null && i !== void 0 ? i : .5) * 1e3, o = r.orientation ? zl(r.orientation) : void 0, l = r.position ? this.transformXROriginToGlobal(r.position) : void 0;
                return this.enqueueDuration(e, n, a, {
                    position: r.position ? s.position : void 0,
                    orientation: o ? s.orientation : void 0
                }, {
                    position: l,
                    orientation: o
                });
            }
            if (e === "select") {
                const r = n;
                return this.executeSelectSequence(r);
            }
            return this.enqueueDiscrete(e, n);
        }
        executeImmediateMethod(e, n) {
            switch(e){
                case "get_session_status":
                    return this.executeGetSessionStatus();
                case "accept_session":
                    return this.executeAcceptSession();
                case "end_session":
                    return this.executeEndSession();
                case "get_transform":
                    return this.executeGetTransform(n);
                case "get_select_value":
                    return this.executeGetSelectValue(n);
                case "get_gamepad_state":
                    return this.executeGetGamepadState(n);
                case "get_device_state":
                    return this.executeGetDeviceState();
                case "capture_canvas":
                    return this.executeCaptureCanvas(n);
                default:
                    throw new Error(`Unknown immediate method: ${e}`);
            }
        }
        executeSelectSequence(e) {
            const { device: n, duration: i = .15 } = e;
            return this.getDeviceSelectValue(n), new Promise((r, s)=>{
                let a = 0;
                const o = 3, l = ()=>{
                    a++, a === o && r({
                        device: n,
                        duration: i
                    });
                }, c = {
                    type: "discrete",
                    id: this.generateActionId(),
                    method: "_select_press",
                    params: {
                        device: n
                    },
                    resolve: l,
                    reject: s
                }, u = {
                    type: "duration",
                    id: this.generateActionId(),
                    method: "_select_wait",
                    params: {
                        device: n
                    },
                    durationMs: i * 1e3,
                    elapsedMs: 0,
                    startState: {},
                    targetState: {},
                    resolve: l,
                    reject: s
                }, d = {
                    type: "discrete",
                    id: this.generateActionId(),
                    method: "_select_release",
                    params: {
                        device: n
                    },
                    resolve: l,
                    reject: s
                };
                this.commandQueue.push(c, u, d);
            });
        }
        async acceptSession() {
            if (!this.device.sessionOffered) throw new Error("No session has been offered");
            return this.device.grantOfferedSession(), await $p(()=>!!this.device.activeSession, 5e3), {
                success: !0
            };
        }
        forceRelease() {
            this.cancelReleaseTimer(), this._isCaptured = !1, this.device.controlMode = "manual";
            for (const e of this.commandQueue)e.reject(new Error("Capture released"));
            this.commandQueue = [];
            for (const e of [
                "left",
                "right"
            ]){
                const n = this.device.controllers[e];
                n && (n.updateButtonValue("trigger", 0), n.updateButtonValue("squeeze", 0));
            }
        }
    }
    Ut.IMMEDIATE_METHODS = new Set([
        "get_session_status",
        "accept_session",
        "end_session",
        "get_transform",
        "get_select_value",
        "get_gamepad_state",
        "get_device_state",
        "capture_canvas"
    ]);
    Ut.ACTIVE_IMMEDIATE_METHODS = new Set([
        "accept_session",
        "end_session"
    ]);
    Ut.SESSION_REQUIRED_METHODS = new Set([
        "set_transform",
        "look_at",
        "animate_to",
        "set_input_mode",
        "set_connected",
        "set_select_value",
        "select",
        "set_gamepad_state",
        "set_device_state"
    ]);
    var Yi;
    (function(t) {
        t.None = "", t.Standard = "standard", t.XRStandard = "xr-standard";
    })(Yi || (Yi = {}));
    class Eu {
        constructor(e, n){
            this[P] = {
                type: e,
                eventTrigger: n,
                pressed: !1,
                touched: !1,
                value: 0,
                lastFrameValue: 0,
                pendingValue: null
            };
        }
        get pressed() {
            return this[P].type === "manual" ? this[P].pressed : this[P].value > 0;
        }
        get touched() {
            return this[P].type === "manual" ? this[P].touched : this[P].touched || this.pressed;
        }
        get value() {
            return this[P].value;
        }
    }
    class Zp {
        constructor(){
            this.pressed = !1, this.touched = !1, this.value = 0;
        }
    }
    class so {
        constructor(e, n = "", i = -1){
            this[P] = {
                id: n,
                index: i,
                connected: !1,
                timestamp: performance.now(),
                mapping: e.mapping,
                buttonsMap: {},
                buttonsSequence: [],
                axesMap: {},
                axesSequence: [],
                hapticActuators: []
            }, e.buttons.forEach((r)=>{
                var s;
                r === null ? this[P].buttonsSequence.push(null) : (this[P].buttonsSequence.push(r.id), this[P].buttonsMap[r.id] = new Eu(r.type, (s = r.eventTrigger) !== null && s !== void 0 ? s : null));
            }), e.axes.forEach((r)=>{
                r === null ? this[P].axesSequence.push(null) : (this[P].axesSequence.push(r.id + r.type), this[P].axesMap[r.id] || (this[P].axesMap[r.id] = {
                    x: 0,
                    y: 0
                }));
            });
        }
        get id() {
            return this[P].id;
        }
        get index() {
            return this[P].index;
        }
        get connected() {
            return this[P].connected;
        }
        get timestamp() {
            return this[P].timestamp;
        }
        get mapping() {
            return this[P].mapping;
        }
        get axes() {
            const e = [];
            return this[P].axesSequence.forEach((n)=>{
                if (n === null) e.push(null);
                else {
                    const i = n.substring(0, n.length - 6), r = n.substring(n.length - 6);
                    e.push(r === "y-axis" ? this[P].axesMap[i].y : this[P].axesMap[i].x);
                }
            }), e;
        }
        get buttons() {
            return this[P].buttonsSequence.map((e)=>e === null ? new Zp : this[P].buttonsMap[e]);
        }
        get hapticActuators() {
            return this[P].hapticActuators;
        }
        get vibrationActuator() {
            return null;
        }
    }
    var Fe;
    (function(t) {
        t.None = "none", t.Left = "left", t.Right = "right";
    })(Fe || (Fe = {}));
    var Fr;
    (function(t) {
        t.Gaze = "gaze", t.TrackedPointer = "tracked-pointer", t.Screen = "screen", t.TransientPointer = "transient-pointer";
    })(Fr || (Fr = {}));
    class Qp extends Array {
    }
    class ns {
        constructor(e, n, i, r, s, a, o){
            this[Pt] = {
                handedness: e,
                targetRayMode: n,
                targetRaySpace: r,
                gripSpace: a,
                profiles: i,
                gamepad: s,
                hand: o
            };
        }
        get handedness() {
            return this[Pt].handedness;
        }
        get targetRayMode() {
            return this[Pt].targetRayMode;
        }
        get targetRaySpace() {
            return this[Pt].targetRaySpace;
        }
        get gripSpace() {
            return this[Pt].gripSpace;
        }
        get profiles() {
            return this[Pt].profiles;
        }
        get gamepad() {
            return this[Pt].gamepad;
        }
        get hand() {
            return this[Pt].hand;
        }
    }
    class Mr extends Event {
        constructor(e, n){
            if (super(e, n), !n.frame) throw new Error("XRInputSourceEventInit.frame is required");
            if (!n.inputSource) throw new Error("XRInputSourceEventInit.inputSource is required");
            this.frame = n.frame, this.inputSource = n.inputSource;
        }
    }
    const Dl = {
        [Fe.Left]: {
            position: new hn(-.25, 1.5, -.4),
            quaternion: new Bi
        },
        [Fe.Right]: {
            position: new hn(.25, 1.5, -.4),
            quaternion: new Bi
        },
        [Fe.None]: {
            position: new hn(.25, 1.5, -.4),
            quaternion: new Bi
        }
    };
    class _u {
        constructor(e){
            this[J] = {
                inputSource: e,
                position: Dl[e.handedness].position.clone(),
                quaternion: Dl[e.handedness].quaternion.clone(),
                connected: !0,
                lastFrameConnected: !1,
                inputSourceChanged: !0
            };
        }
        get position() {
            return this[J].position;
        }
        get quaternion() {
            return this[J].quaternion;
        }
        get inputSource() {
            return this[J].inputSource;
        }
        get connected() {
            return this[J].connected;
        }
        set connected(e) {
            this[J].connected = e, this[J].inputSource.gamepad[P].connected = e;
        }
        onFrameStart(e) {
            const n = this[J].inputSource.targetRaySpace;
            nr(n[he].offsetMatrix, this[J].quaternion.quat, this[J].position.vec3);
            const i = e.session;
            this[J].inputSource.gamepad.buttons.forEach((r)=>{
                r instanceof Eu && (r[P].lastFrameValue = r[P].value, r[P].pendingValue != null && (r[P].value = r[P].pendingValue, r[P].pendingValue = null), r[P].eventTrigger != null && (r[P].lastFrameValue === 0 && r[P].value > 0 ? (i.dispatchEvent(new Mr(r[P].eventTrigger, {
                    frame: e,
                    inputSource: this[J].inputSource
                })), i.dispatchEvent(new Mr(r[P].eventTrigger + "start", {
                    frame: e,
                    inputSource: this[J].inputSource
                }))) : r[P].lastFrameValue > 0 && r[P].value === 0 && i.dispatchEvent(new Mr(r[P].eventTrigger + "end", {
                    frame: e,
                    inputSource: this[J].inputSource
                }))));
            }), this[J].inputSourceChanged = this.connected !== this[J].lastFrameConnected, this[J].lastFrameConnected = this.connected;
        }
    }
    class Kp extends _u {
        constructor(e, n, i){
            if (!e.layout[n]) throw new DOMException("Handedness not supported", "InvalidStateError");
            const r = new le(i), s = e.layout[n].gripOffsetMatrix ? new le(r, e.layout[n].gripOffsetMatrix) : void 0, a = [
                e.profileId,
                ...e.fallbackProfileIds
            ], o = new ns(n, Fr.TrackedPointer, a, r, new so(e.layout[n].gamepad), s);
            super(o), this[Bs] = {
                profileId: e.profileId,
                gamepadConfig: e.layout[n].gamepad
            };
        }
        get gamepadConfig() {
            return this[Bs].gamepadConfig;
        }
        get profileId() {
            return this[Bs].profileId;
        }
        updateButtonValue(e, n) {
            if (n > 1 || n < 0) {
                console.warn(`Out-of-range value ${n} provided for button ${e}.`);
                return;
            }
            const i = this[J].inputSource.gamepad[P].buttonsMap[e];
            if (i) {
                if (i[P].type === "binary" && n != 1 && n != 0) {
                    console.warn(`Non-binary value ${n} provided for binary button ${e}.`);
                    return;
                }
                i[P].pendingValue = n;
            } else console.warn(`Current controller does not have button ${e}.`);
        }
        setButtonValueImmediate(e, n) {
            if (n > 1 || n < 0) {
                console.warn(`Out-of-range value ${n} provided for button ${e}.`);
                return;
            }
            const i = this[J].inputSource.gamepad[P].buttonsMap[e];
            if (i) {
                if (i[P].type === "binary" && n != 1 && n != 0) {
                    console.warn(`Non-binary value ${n} provided for binary button ${e}.`);
                    return;
                }
                i[P].value = n, i[P].pendingValue = n;
            } else console.warn(`Current controller does not have button ${e}.`);
        }
        updateButtonTouch(e, n) {
            const i = this[J].inputSource.gamepad[P].buttonsMap[e];
            i ? i[P].touched = n : console.warn(`Current controller does not have button ${e}.`);
        }
        updateAxis(e, n, i) {
            if (i > 1 || i < -1) {
                console.warn(`Out-of-range value ${i} provided for ${e} axes.`);
                return;
            }
            const r = this[J].inputSource.gamepad[P].axesMap[e];
            r ? n === "x-axis" ? r.x = i : n === "y-axis" && (r.y = i) : console.warn(`Current controller does not have ${e} axes.`);
        }
        updateAxes(e, n, i) {
            if (n > 1 || n < -1 || i > 1 || i < -1) {
                console.warn(`Out-of-range value x:${n}, y:${i} provided for ${e} axes.`);
                return;
            }
            const r = this[J].inputSource.gamepad[P].axesMap[e];
            r ? (r.x = n, r.y = i) : console.warn(`Current controller does not have ${e} axes.`);
        }
        getButtonValue(e) {
            var n;
            const i = this[J].inputSource.gamepad[P].buttonsMap[e];
            return i ? (n = i[P].pendingValue) !== null && n !== void 0 ? n : i.value : 0;
        }
        getButtonTouched(e) {
            const n = this[J].inputSource.gamepad[P].buttonsMap[e];
            return n ? n.touched : !1;
        }
        getAxes(e = "thumbstick") {
            const n = this[J].inputSource.gamepad[P].axesMap[e];
            return n ? {
                x: n.x,
                y: n.y
            } : {
                x: 0,
                y: 0
            };
        }
    }
    class Jp {
        constructor(e, n, i, r, s){
            this[kt] = {
                nativeMesh: e,
                frame: void 0,
                meshSpace: n,
                vertices: i,
                indices: r,
                lastChangedTime: performance.now(),
                semanticLabel: s
            };
        }
        get meshSpace() {
            return this[kt].meshSpace;
        }
        get vertices() {
            return this[kt].vertices;
        }
        get indices() {
            return this[kt].indices;
        }
        get lastChangedTime() {
            return this[kt].lastChangedTime;
        }
        get semanticLabel() {
            return this[kt].semanticLabel;
        }
    }
    class e3 extends Set {
    }
    class t3 {
        constructor(e, n, i, r){
            this.transform = e, this.vertices = n, this.indices = i, this.semanticLabel = r;
        }
    }
    var B;
    (function(t) {
        t.Desk = "desk", t.Couch = "couch", t.Floor = "floor", t.Ceiling = "ceiling", t.Wall = "wall", t.Door = "door", t.Window = "window", t.Table = "table", t.Shelf = "shelf", t.Bed = "bed", t.Screen = "screen", t.Lamp = "lamp", t.Plant = "plant", t.WallArt = "wall art", t.GlobalMesh = "global mesh", t.Other = "other";
    })(B || (B = {}));
    var we;
    (function(t) {
        t.Horizontal = "horizontal", t.Vertical = "vertical";
    })(we || (we = {}));
    const n3 = {
        [B.Desk]: we.Horizontal,
        [B.Couch]: we.Horizontal,
        [B.Floor]: we.Horizontal,
        [B.Ceiling]: we.Horizontal,
        [B.Wall]: we.Vertical,
        [B.Door]: we.Vertical,
        [B.Window]: we.Vertical,
        [B.Table]: we.Horizontal,
        [B.Shelf]: we.Horizontal,
        [B.Bed]: we.Horizontal,
        [B.Screen]: we.Horizontal,
        [B.Lamp]: we.Horizontal,
        [B.Plant]: we.Horizontal,
        [B.WallArt]: we.Vertical
    };
    class i3 {
        constructor(e, n, i, r){
            this[Lt] = {
                nativePlane: e,
                frame: void 0,
                planeSpace: n,
                polygon: i,
                lastChangedTime: performance.now(),
                semanticLabel: r,
                orientation: r ? n3[r] : void 0
            };
        }
        get planeSpace() {
            return this[Lt].planeSpace;
        }
        get polygon() {
            return this[Lt].polygon;
        }
        get orientation() {
            return this[Lt].orientation;
        }
        get lastChangedTime() {
            return this[Lt].lastChangedTime;
        }
        get semanticLabel() {
            return this[Lt].semanticLabel;
        }
    }
    class r3 extends Set {
    }
    class s3 {
        constructor(e, n, i){
            this.transform = e, this.polygon = n, this.semanticLabel = i;
        }
    }
    class a3 {
        constructor(e, n, i, r, s, a){
            this[en] = {
                data: e,
                width: n,
                height: i,
                normDepthBufferFromNormView: r,
                rawValueToMeters: s,
                dataFormat: a
            };
        }
        get data() {
            return this[en].data;
        }
        get width() {
            return this[en].width;
        }
        get height() {
            return this[en].height;
        }
        get normDepthBufferFromNormView() {
            return this[en].normDepthBufferFromNormView;
        }
        get rawValueToMeters() {
            return this[en].rawValueToMeters;
        }
        getDepthInMeters(e, n) {
            const { width: i, height: r, rawValueToMeters: s, data: a, dataFormat: o } = this[en];
            if (e < 0 || e >= 1 || n < 0 || n >= 1) throw new RangeError("Normalized coordinates must be in [0, 1) range.");
            const l = Math.floor(e * i), c = Math.floor(n * r);
            if (o === "float32") {
                const u = new Float32Array(a), d = c * i + l;
                return u[d] * s;
            } else {
                const u = new Uint8Array(a), d = (c * i + l) * 2;
                return (u[d] + u[d + 1] * 256) * s;
            }
        }
    }
    class Su {
        constructor(e, n){
            this[Ge] = {
                anchorSpace: e,
                session: n,
                deleted: !1
            }, n[m].trackedAnchors.add(this);
        }
        get anchorSpace() {
            if (this[Ge].deleted) throw new DOMException("XRAnchor has already been deleted.", "InvalidStateError");
            return this[Ge].anchorSpace;
        }
        requestPersistentHandle() {
            return new Promise((e, n)=>{
                if (this[Ge].deleted) n(new DOMException("XRAnchor has already been deleted.", "InvalidStateError"));
                else {
                    const i = this[Ge].session[m].persistentAnchors;
                    for (const [s, a] of i.entries())if (a === this) {
                        e(s);
                        return;
                    }
                    const r = crypto.randomUUID();
                    Mu.createPersistentAnchor(this[Ge].session, this, r), e(r);
                }
            });
        }
        delete() {
            this[Ge].deleted || (this[Ge].anchorSpace = null, this[Ge].deleted = !0, this[Ge].session[m].trackedAnchors.delete(this));
        }
    }
    class Bl extends Set {
    }
    const js = "@immersive-web-emulation-runtime/persistent-anchors";
    class Mu {
        static recoverPersistentAnchorsFromStorage(e) {
            const n = JSON.parse(localStorage.getItem(js) || "{}");
            Object.entries(n).forEach(([i, r])=>{
                const s = e[m].device[b].globalSpace, a = new le(s, r), o = new Su(a, e);
                e[m].persistentAnchors.set(i, o);
            });
        }
        static createPersistentAnchor(e, n, i) {
            e[m].trackedAnchors.add(n), e[m].persistentAnchors.set(i, n);
            const r = JSON.parse(localStorage.getItem(js) || "{}");
            r[i] = Array.from(n[Ge].anchorSpace[he].offsetMatrix), localStorage.setItem(js, JSON.stringify(r));
        }
    }
    class Ht {
        constructor(e, n){
            const i = He(0, 0, 0), r = tt();
            this[Ce] = {
                matrix: ge(),
                position: e ? He(e.x, e.y, e.z) : i,
                orientation: n ? ts(tt(), Nr(n.x, n.y, n.z, n.w)) : r,
                inverse: null
            }, this.updateMatrix();
        }
        updateMatrix() {
            nr(this[Ce].matrix, this[Ce].orientation, this[Ce].position);
        }
        get matrix() {
            return this[Ce].matrix;
        }
        get position() {
            const e = this[Ce].position;
            return new DOMPointReadOnly(e[0], e[1], e[2], 1);
        }
        get orientation() {
            const e = this[Ce].orientation;
            return new DOMPointReadOnly(e[0], e[1], e[2], e[3]);
        }
        get inverse() {
            if (!this[Ce].inverse) {
                const e = ge();
                if (!ro(e, this[Ce].matrix)) throw new Error("Matrix is not invertible.");
                let n = ye();
                Xi(n, e);
                let i = tt();
                Cr(i, e), this[Ce].inverse = new Ht(new DOMPointReadOnly(n[0], n[1], n[2], 1), new DOMPointReadOnly(i[0], i[1], i[2], i[3])), this[Ce].inverse[Ce].inverse = this;
            }
            return this[Ce].inverse;
        }
    }
    let jl = class {
        constructor(e = 0, n = 0, i = 0, r = 1){
            this.x = e, this.y = n, this.z = i, this.w = r;
        }
    };
    class o3 {
        constructor(e, n){
            const i = {
                x: 0,
                y: 0,
                z: 0,
                w: 1
            }, r = {
                x: 0,
                y: 0,
                z: -1,
                w: 0
            };
            if (e instanceof Ht) {
                const o = e.matrix, l = va(ya(), i.x, i.y, i.z, i.w), c = va(ya(), r.x, r.y, r.z, r.w);
                Ll(l, l, o), Ll(c, c, o), i.x = l[0], i.y = l[1], i.z = l[2], i.w = l[3], r.x = c[0], r.y = c[1], r.z = c[2], r.w = c[3];
            } else if (e && (i.x = e.x, i.y = e.y, i.z = e.z, i.w = e.w), n) {
                if (n.x === 0 && n.y === 0 && n.z === 0 || n.w !== 0) throw new DOMException("Invalid direction value to construct XRRay", "TypeError");
                r.x = n.x, r.y = n.y, r.z = n.z, r.w = n.w;
            }
            const s = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z) || 1;
            r.x = r.x / s, r.y = r.y / s, r.z = r.z / s, this[Ne] = {
                origin: new jl(i.x, i.y, i.z, i.w),
                direction: new jl(r.x, r.y, r.z, r.w),
                matrix: null
            };
        }
        get origin() {
            return this[Ne].origin;
        }
        get direction() {
            return this[Ne].direction;
        }
        get matrix() {
            if (this[Ne].matrix) return this[Ne].matrix;
            const e = Li(ye(), 0, 0, -1), n = Li(ye(), this[Ne].origin.x, this[Ne].origin.y, this[Ne].origin.z), i = Li(ye(), this[Ne].direction.x, this[Ne].direction.y, this[Ne].direction.z), r = Sr(ye(), i, e), s = yu(i, e), a = ge();
            s > -1 && s < 1 ? Il(a, Math.acos(s), r) : s === -1 ? Il(a, Math.acos(s), Li(ye(), 1, 0, 0)) : Sp(a);
            const o = si(ge(), n), l = es(ge(), o, a);
            return this[Ne].matrix = new Float32Array(l), this[Ne].matrix;
        }
    }
    class l3 {
        constructor(e, n){
            var i;
            this[mt] = {
                session: e,
                space: n.space,
                offsetRay: (i = n.offsetRay) !== null && i !== void 0 ? i : new o3
            };
        }
        cancel() {
            this[mt].session[m].hitTestSources.delete(this);
        }
    }
    class c3 {
        constructor(e, n){
            this[mt] = {
                frame: e,
                offsetSpace: n
            };
        }
        getPose(e) {
            return this[mt].frame.getPose(this[mt].offsetSpace, e);
        }
        createAnchor() {
            return this[mt].frame.createAnchor(new Ht, this[mt].offsetSpace);
        }
    }
    class Au extends Event {
        constructor(e, n){
            if (super(e, n), !n.session) throw new Error("XRInputSourcesChangeEventInit.session is required");
            if (!n.added) throw new Error("XRInputSourcesChangeEventInit.added is required");
            if (!n.removed) throw new Error("XRInputSourcesChangeEventInit.removed is required");
            this.session = n.session, this.added = n.added, this.removed = n.removed;
        }
    }
    var Ru, xe;
    (function(t) {
        t.Viewer = "viewer", t.Local = "local", t.LocalFloor = "local-floor", t.BoundedFloor = "bounded-floor", t.Unbounded = "unbounded";
    })(xe || (xe = {}));
    class xn extends le {
        constructor(e, n, i){
            super(n, i), this[Ru] = {
                type: null,
                onreset: ()=>{}
            }, this[Ct].type = e;
        }
        get onreset() {
            var e;
            return (e = this[Ct].onreset) !== null && e !== void 0 ? e : (()=>{});
        }
        set onreset(e) {
            this[Ct].onreset && this.removeEventListener("reset", this[Ct].onreset), this[Ct].onreset = e, e && this.addEventListener("reset", e);
        }
        getOffsetReferenceSpace(e) {
            return new xn(this[Ct].type, this, e);
        }
    }
    Ru = Ct;
    class wa {
        constructor(e = {}, n){
            this[Si] = {
                depthNear: e.depthNear || n?.depthNear || .1,
                depthFar: e.depthFar || n?.depthFar || 1e3,
                inlineVerticalFieldOfView: e.inlineVerticalFieldOfView || n?.inlineVerticalFieldOfView || null,
                baseLayer: e.baseLayer || n?.baseLayer || null
            };
        }
        get depthNear() {
            return this[Si].depthNear;
        }
        get depthFar() {
            return this[Si].depthFar;
        }
        get inlineVerticalFieldOfView() {
            return this[Si].inlineVerticalFieldOfView;
        }
        get baseLayer() {
            return this[Si].baseLayer;
        }
    }
    class zr extends Event {
        constructor(e, n){
            if (super(e, n), !n.session) throw new Error("XRSessionEventInit.session is required");
            this.session = n.session;
        }
    }
    var Z;
    (function(t) {
        t.None = "none", t.Left = "left", t.Right = "right";
    })(Z || (Z = {}));
    class Pu {
        constructor(e, n, i, r){
            this[Nt] = {
                eye: e,
                projectionMatrix: n,
                transform: i,
                recommendedViewportScale: null,
                requestedViewportScale: 1,
                session: r
            };
        }
        get eye() {
            return this[Nt].eye;
        }
        get projectionMatrix() {
            return this[Nt].projectionMatrix;
        }
        get transform() {
            return this[Nt].transform;
        }
        get recommendedViewportScale() {
            return this[Nt].recommendedViewportScale;
        }
        requestViewportScale(e) {
            if (e === null || e <= 0 || e > 1) {
                console.warn("Invalid scale value. Scale must be > 0 and <= 1.");
                return;
            }
            this[Nt].requestedViewportScale = e;
        }
    }
    class is {
        constructor(e, n = !1, i = void 0, r = void 0){
            this[_i] = {
                transform: e,
                emulatedPosition: n,
                linearVelocity: i,
                angularVelocity: r
            };
        }
        get transform() {
            return this[_i].transform;
        }
        get emulatedPosition() {
            return this[_i].emulatedPosition;
        }
        get linearVelocity() {
            return this[_i].linearVelocity;
        }
        get angularVelocity() {
            return this[_i].angularVelocity;
        }
    }
    class Ou extends is {
        constructor(e, n, i = !1, r = void 0, s = void 0){
            super(e, i, r, s), this[Nl] = {
                radius: n
            };
        }
        get radius() {
            return this[Nl].radius;
        }
    }
    class Iu extends is {
        constructor(e, n, i = !1, r = void 0, s = void 0){
            super(e, i, r, s), this[Fl] = {
                views: Object.freeze(n)
            };
        }
        get views() {
            return this[Fl].views;
        }
    }
    const Ul = ge(), Vl = ge(), Gl = ge(), $l = (t, e, n)=>{
        gn.calculateGlobalOffsetMatrix(e, Ul), gn.calculateGlobalOffsetMatrix(n, Vl), ro(Gl, Vl), es(t, Gl, Ul);
    };
    class ku {
        constructor(e, n, i, r, s){
            this[G] = {
                session: e,
                id: n,
                active: i,
                animationFrame: r,
                predictedDisplayTime: s,
                tempMat4: ge(),
                detectedPlanes: new r3,
                detectedMeshes: new e3,
                trackedAnchors: e[m].frameTrackedAnchors,
                hitTestResultsMap: new Map,
                depthDataMap: new Map
            };
        }
        get session() {
            return this[G].session;
        }
        get predictedDisplayTime() {
            return this[G].predictedDisplayTime;
        }
        getPose(e, n) {
            if (!this[G].active) throw new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError");
            $l(this[G].tempMat4, e, n);
            const i = ye();
            Xi(i, this[G].tempMat4);
            const r = tt();
            return Cr(r, this[G].tempMat4), new is(new Ht({
                x: i[0],
                y: i[1],
                z: i[2],
                w: 1
            }, {
                x: r[0],
                y: r[1],
                z: r[2],
                w: r[3]
            }), e[he].emulated);
        }
        getViewerPose(e) {
            if (!this[G].animationFrame) throw new DOMException("getViewerPose can only be called on XRFrame objects passed to XRSession.requestAnimationFrame callbacks.", "InvalidStateError");
            const n = this[G].session, i = n[m].device, r = this.getPose(i.viewerSpace, e), s = n[m].mode === "inline" ? [
                Z.None
            ] : [
                Z.Left,
                Z.Right
            ], a = [];
            return s.forEach((o)=>{
                const l = i.viewSpaces[o], c = this.getPose(l, e), u = n[m].getProjectionMatrix(o), d = new Pu(o, new Float32Array(u), c.transform, n);
                a.push(d);
            }), new Iu(r.transform, a, !1);
        }
        getJointPose(e, n) {
            const i = this.getPose(e, n), r = e[un].radius;
            return new Ou(i.transform, r, !1);
        }
        fillJointRadii(e, n) {
            if (e = Array.from(e), !this[G].active) throw new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError");
            if (e.length > n.length) throw new DOMException("The length of jointSpaces is larger than the number of elements in radii", "TypeError");
            let i = !0;
            for(let r = 0; r < e.length; r++)e[r][un].radius ? n[r] = e[r][un].radius : (n[r] = NaN, i = !1);
            return i;
        }
        fillPoses(e, n, i) {
            if (e = Array.from(e), !this[G].active) throw new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError");
            if (e.length * 16 > i.length) throw new DOMException("The length of spaces multiplied by 16 is larger than the number of elements in transforms", "TypeError");
            return e.forEach((r, s)=>{
                $l(this[G].tempMat4, r, n);
                for(let a = 0; a < 16; a++)i[s * 16 + a] = this[G].tempMat4[a];
            }), !0;
        }
        get detectedPlanes() {
            if (!this[G].active) throw new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError");
            return this[G].detectedPlanes;
        }
        get detectedMeshes() {
            if (!this[G].active) throw new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError");
            return this[G].detectedMeshes;
        }
        get trackedAnchors() {
            if (!this[G].active) throw new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError");
            return this[G].trackedAnchors;
        }
        createAnchor(e, n) {
            return new Promise((i, r)=>{
                if (!this[G].active) r(new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError"));
                else {
                    const s = this[G].session[m].device[b].globalSpace, a = new le(n, e.matrix), o = gn.calculateGlobalOffsetMatrix(a), l = new le(s, o), c = new Su(l, this[G].session);
                    this[G].session[m].trackedAnchors.add(c), this[G].session[m].newAnchors.set(c, {
                        resolve: i,
                        reject: r
                    });
                }
            });
        }
        getHitTestResults(e) {
            if (this[G].active) {
                if (this[G].hitTestResultsMap.has(e)) return [
                    ...this[G].hitTestResultsMap.get(e)
                ];
                throw new DOMException("Requested hit test results are not available for current frame.", "InvalidStateError");
            } else throw new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError");
        }
        getDepthInformation(e) {
            var n;
            if (!this[G].active) throw new DOMException("XRFrame access outside the callback that produced it is invalid.", "InvalidStateError");
            if (!this[G].session[m].enabledFeatures.includes("depth-sensing")) throw new DOMException("depth-sensing feature is not enabled on this session.", "InvalidStateError");
            return (n = this[G].depthDataMap.get(e[Nt].eye)) !== null && n !== void 0 ? n : null;
        }
    }
    var it;
    (function(t) {
        t.Opaque = "opaque", t.AlphaBlend = "alpha-blend", t.Additive = "additive";
    })(it || (it = {}));
    var ai;
    (function(t) {
        t.ScreenSpace = "screen-space", t.WorldSpace = "world-space";
    })(ai || (ai = {}));
    class ao extends EventTarget {
        constructor(e, n, i){
            super(), this[m] = {
                device: e,
                mode: n,
                renderState: new wa,
                pendingRenderState: null,
                enabledFeatures: i,
                isSystemKeyboardSupported: !1,
                ended: !1,
                projectionMatrices: {
                    [Z.Left]: ge(),
                    [Z.Right]: ge(),
                    [Z.None]: ge()
                },
                getProjectionMatrix: (r)=>this[m].projectionMatrices[r],
                referenceSpaceIsSupported: (r)=>{
                    if (!this[m].enabledFeatures.includes(r)) return !1;
                    switch(r){
                        case xe.Viewer:
                            return !0;
                        case xe.Local:
                        case xe.LocalFloor:
                        case xe.BoundedFloor:
                        case xe.Unbounded:
                            return this[m].mode != "inline";
                    }
                },
                frameHandle: 0,
                frameCallbacks: [],
                currentFrameCallbacks: null,
                onDeviceFrame: ()=>{
                    if (this[m].ended) return;
                    this[m].deviceFrameHandle = globalThis.requestAnimationFrame(this[m].onDeviceFrame), this[m].pendingRenderState != null && (this[m].renderState = this[m].pendingRenderState, this[m].pendingRenderState = null, this[m].device[b].onBaseLayerSet(this[m].renderState.baseLayer));
                    const r = this[m].renderState.baseLayer;
                    if (r === null) return;
                    const s = r.context, a = s.canvas;
                    if (this[m].mode != "inline") {
                        const y = s.getParameter(s.COLOR_CLEAR_VALUE), v = s.getParameter(s.DEPTH_CLEAR_VALUE), w = s.getParameter(s.STENCIL_CLEAR_VALUE);
                        s.clearColor(0, 0, 0, 0), s.clearDepth(1), s.clearStencil(0), s.clear(s.DEPTH_BUFFER_BIT | s.COLOR_BUFFER_BIT | s.STENCIL_BUFFER_BIT), s.clearColor(y[0], y[1], y[2], y[3]), s.clearDepth(v), s.clearStencil(w);
                    }
                    const { depthNear: o, depthFar: l } = this[m].renderState, { width: c, height: u } = a;
                    if (this[m].mode !== "inline") {
                        const y = c * (this[m].device.stereoEnabled ? .5 : 1) / u;
                        kl(this[m].projectionMatrices[Z.Left], this[m].device.fovy, y, o, l), gu(this[m].projectionMatrices[Z.Right], this[m].projectionMatrices[Z.Left]);
                    } else {
                        const y = c / u;
                        kl(this[m].projectionMatrices[Z.None], this[m].renderState.inlineVerticalFieldOfView, y, o, l);
                    }
                    const d = new ku(this, this[m].frameHandle, !0, !0, performance.now()), f = performance.now(), g = this[m].device[b].devui;
                    if (g && g.render(f), this[m].mode === "immersive-ar") {
                        const y = this[m].device[b].sem;
                        y && y.render(f);
                    }
                    this[m].enabledFeatures.includes("anchors") && this[m].updateTrackedAnchors(), this[m].enabledFeatures.includes("plane-detection") && this[m].updateTrackedPlanes(d), this[m].enabledFeatures.includes("mesh-detection") && this[m].updateTrackedMeshes(d), this[m].enabledFeatures.includes("depth-sensing") && this[m].computeDepthSensing(d), this[m].enabledFeatures.includes("hit-test") && this[m].computeHitTestResults(d), this[m].device[b].onFrameStart(d), this[m].updateActiveInputSources();
                    const p = this[m].currentFrameCallbacks = this[m].frameCallbacks;
                    this[m].frameCallbacks = [];
                    const x = performance.now();
                    for(let y = 0; y < p.length; y++)try {
                        p[y].cancelled || p[y].callback(x, d);
                    } catch (v) {
                        console.error(v);
                    }
                    this[m].currentFrameCallbacks = null, d[G].active = !1;
                },
                nominalFrameRate: e.internalNominalFrameRate,
                referenceSpaces: [],
                inputSourceArray: [],
                activeInputSources: [],
                updateActiveInputSources: ()=>{
                    const r = this[m].enabledFeatures.includes("hand-tracking"), s = this[m].activeInputSources, a = this[m].device.inputSources.filter((c)=>!c.hand || r), o = a.filter((c)=>!s.includes(c)), l = s.filter((c)=>!a.includes(c));
                    this[m].activeInputSources = a, (o.length > 0 || l.length > 0) && this.dispatchEvent(new Au("inputsourceschange", {
                        session: this,
                        added: o,
                        removed: l
                    }));
                },
                trackedAnchors: new Bl,
                persistentAnchors: new Map,
                newAnchors: new Map,
                frameTrackedAnchors: new Bl,
                updateTrackedAnchors: ()=>{
                    this[m].enabledFeatures.includes("anchors") && (this[m].frameTrackedAnchors.clear(), Array.from(this[m].trackedAnchors).forEach((r)=>{
                        if (r[Ge].deleted) {
                            if (this[m].trackedAnchors.delete(r), this[m].newAnchors.has(r)) {
                                const { reject: s } = this[m].newAnchors.get(r);
                                s(new DOMException("Anchor is no longer tracked", "InvalidStateError"));
                            }
                        } else if (this[m].frameTrackedAnchors.add(r), this[m].newAnchors.has(r)) {
                            const { resolve: s } = this[m].newAnchors.get(r);
                            s(r), this[m].newAnchors.delete(r);
                        }
                    }));
                },
                trackedPlanes: new Map,
                updateTrackedPlanes: (r)=>{
                    const s = this[m].device[b].sem;
                    if (!s) return;
                    Array.from(this[m].trackedPlanes.keys()).forEach((o)=>{
                        s.trackedPlanes.has(o) || this[m].trackedPlanes.delete(o);
                    }), s.trackedPlanes.forEach((o)=>{
                        let l = this[m].trackedPlanes.get(o);
                        if (!l) {
                            const c = new le(this[m].device[b].globalSpace, o.transform.matrix);
                            l = new i3(o, c, o.polygon, o.semanticLabel), this[m].trackedPlanes.set(o, l);
                        }
                        l[Lt].lastChangedTime = r.predictedDisplayTime, l[Lt].frame = r, r[G].detectedPlanes.add(l);
                    });
                },
                trackedMeshes: new Map,
                updateTrackedMeshes: (r)=>{
                    const s = this[m].device[b].sem;
                    if (!s) return;
                    Array.from(this[m].trackedMeshes.keys()).forEach((o)=>{
                        s.trackedMeshes.has(o) || this[m].trackedMeshes.delete(o);
                    }), s.trackedMeshes.forEach((o)=>{
                        let l = this[m].trackedMeshes.get(o);
                        if (!l) {
                            const c = new le(this[m].device[b].globalSpace, o.transform.matrix);
                            l = new Jp(o, c, o.vertices, o.indices, o.semanticLabel), this[m].trackedMeshes.set(o, l);
                        }
                        l[kt].lastChangedTime = r.predictedDisplayTime, l[kt].frame = r, r[G].detectedMeshes.add(l);
                    });
                },
                depthSensingUsage: "cpu-optimized",
                depthSensingDataFormat: "float32",
                computeDepthSensing: (r)=>{
                    const s = this[m].device[b].sem;
                    if (!s) return;
                    const { depthNear: a, depthFar: o } = this[m].renderState, l = this[m].renderState.baseLayer;
                    if (!l) return;
                    const c = l.context.canvas, u = Math.max(1, Math.floor(c.width / 4)), d = Math.max(1, Math.floor(c.height / 4)), f = this[m].mode === "inline" ? [
                        Z.None
                    ] : [
                        Z.Left,
                        Z.Right
                    ];
                    for (const g of f){
                        const p = this[m].getProjectionMatrix(g), x = this[m].device.viewSpaces[g], y = gn.calculateGlobalOffsetMatrix(x), v = ge();
                        ro(v, y);
                        const w = s.computeDepthBuffer(v, p, u, d, a, o);
                        if (w) {
                            const T = new a3(w.data, w.width, w.height, new Ht, w.rawValueToMeters, this[m].depthSensingDataFormat);
                            r[G].depthDataMap.set(g, T);
                        }
                    }
                },
                hitTestSources: new Set,
                computeHitTestResults: (r)=>{
                    const s = this[m].device[b].sem;
                    if (!s) return;
                    const a = this[m].device[b].globalSpace;
                    this[m].hitTestSources.forEach((o)=>{
                        const l = o[mt].space, c = gn.calculateGlobalOffsetMatrix(l), u = o[mt].offsetRay.matrix, d = ge();
                        es(d, c, u);
                        const f = [];
                        s.computeHitTestResults(d).forEach((g)=>{
                            const p = new le(a, g), x = new c3(r, p);
                            f.push(x);
                        }), r[G].hitTestResultsMap.set(o, f);
                    });
                },
                onend: null,
                oninputsourceschange: null,
                onselect: null,
                onselectstart: null,
                onselectend: null,
                onsqueeze: null,
                onsqueezestart: null,
                onsqueezeend: null,
                onvisibilitychange: null,
                onframeratechange: null
            }, Mu.recoverPersistentAnchorsFromStorage(this), this[m].onDeviceFrame();
        }
        get visibilityState() {
            return this[m].device.visibilityState;
        }
        get frameRate() {
            return this[m].nominalFrameRate;
        }
        get supportedFrameRates() {
            return new Float32Array(this[m].device.supportedFrameRates);
        }
        get renderState() {
            return this[m].renderState;
        }
        get inputSources() {
            return this[m].inputSourceArray.length = 0, !this[m].ended && this[m].mode !== "inline" && this[m].inputSourceArray.push(...this[m].activeInputSources), this[m].inputSourceArray;
        }
        get enabledFeatures() {
            return this[m].enabledFeatures;
        }
        get isSystemKeyboardSupported() {
            return this[m].isSystemKeyboardSupported;
        }
        get environmentBlendMode() {
            var e;
            return (e = this[m].device[b].environmentBlendModes[this[m].mode]) !== null && e !== void 0 ? e : it.Opaque;
        }
        get interactionMode() {
            return this[m].device[b].interactionMode;
        }
        get depthUsage() {
            return this[m].depthSensingUsage;
        }
        get depthDataFormat() {
            return this[m].depthSensingDataFormat;
        }
        updateRenderState(e = {}) {
            var n, i, r, s;
            if (this[m].ended) throw new DOMException("XRSession has already ended.", "InvalidStateError");
            if (e.baseLayer && e.baseLayer[It].session !== this) throw new DOMException("Base layer was created by a different XRSession", "InvalidStateError");
            if (e.inlineVerticalFieldOfView != null && this[m].mode !== "inline") throw new DOMException("InlineVerticalFieldOfView must not be set for an immersive session", "InvalidStateError");
            const a = {
                baseLayer: e.baseLayer || ((n = this[m].pendingRenderState) === null || n === void 0 ? void 0 : n.baseLayer) || void 0,
                depthFar: e.depthFar || ((i = this[m].pendingRenderState) === null || i === void 0 ? void 0 : i.depthFar) || void 0,
                depthNear: e.depthNear || ((r = this[m].pendingRenderState) === null || r === void 0 ? void 0 : r.depthNear) || void 0,
                inlineVerticalFieldOfView: e.inlineVerticalFieldOfView || ((s = this[m].pendingRenderState) === null || s === void 0 ? void 0 : s.inlineVerticalFieldOfView) || void 0
            };
            this[m].pendingRenderState = new wa(a, this[m].renderState);
        }
        async updateTargetFrameRate(e) {
            return new Promise((n, i)=>{
                this[m].ended ? i(new DOMException("XRSession has already ended.", "InvalidStateError")) : this[m].device.supportedFrameRates.includes(e) ? (this[m].nominalFrameRate === e ? console.log("Requested frame rate is the same as the current nominal frame rate, no update made") : (this[m].nominalFrameRate = e, this.dispatchEvent(new zr("frameratechange", {
                    session: this
                })), console.log(`Nominal frame rate updated to ${e}`)), n()) : i(new DOMException("Requested frame rate not supported.", "InvalidStateError"));
            });
        }
        async requestReferenceSpace(e) {
            return new Promise((n, i)=>{
                if (this[m].ended || !this[m].referenceSpaceIsSupported(e)) {
                    i(new DOMException("The requested reference space type is not supported.", "NotSupportedError"));
                    return;
                }
                let r;
                switch(e){
                    case xe.Viewer:
                        r = this[m].device.viewerSpace;
                        break;
                    case xe.Local:
                        r = new xn(e, this[m].device[b].globalSpace, this[m].device.viewerSpace[he].offsetMatrix);
                        break;
                    case xe.LocalFloor:
                    case xe.BoundedFloor:
                    case xe.Unbounded:
                        r = new xn(e, this[m].device[b].globalSpace);
                        break;
                }
                this[m].referenceSpaces.push(r), n(r);
            });
        }
        requestAnimationFrame(e) {
            if (this[m].ended) return 0;
            const n = ++this[m].frameHandle;
            return this[m].frameCallbacks.push({
                handle: n,
                callback: e,
                cancelled: !1
            }), n;
        }
        cancelAnimationFrame(e) {
            let n = this[m].frameCallbacks, i = n.findIndex((r)=>r && r.handle === e);
            i > -1 && (n[i].cancelled = !0, n.splice(i, 1)), n = this[m].currentFrameCallbacks, n && (i = n.findIndex((r)=>r && r.handle === e), i > -1 && (n[i].cancelled = !0));
        }
        async end() {
            return new Promise((e, n)=>{
                this[m].ended || this[m].deviceFrameHandle === null ? n(new DOMException("XRSession has already ended.", "InvalidStateError")) : (globalThis.cancelAnimationFrame(this[m].deviceFrameHandle), this[m].device[b].onSessionEnd(), this.dispatchEvent(new zr("end", {
                    session: this
                })), e());
            });
        }
        get persistentAnchors() {
            return Array.from(this[m].persistentAnchors.keys());
        }
        restorePersistentAnchor(e) {
            return new Promise((n, i)=>{
                if (!this[m].persistentAnchors.has(e)) i(new DOMException(`Persistent anchor with uuid ${e} not found.`, "InvalidStateError"));
                else if (this[m].ended) i(new DOMException("XRSession has already ended.", "InvalidStateError"));
                else {
                    const r = this[m].persistentAnchors.get(e);
                    this[m].newAnchors.has(r) ? i(new DOMException(`Multiple concurrent attempts detected to restore the anchor with UUID: ${e}.`, "InvalidStateError")) : (this[m].trackedAnchors.add(r), this[m].newAnchors.set(r, {
                        resolve: n,
                        reject: i
                    }));
                }
            });
        }
        deletePersistentAnchor(e) {
            return new Promise((n, i)=>{
                if (!this[m].persistentAnchors.has(e)) i(new DOMException(`Persistent anchor with uuid ${e} not found.`, "InvalidStateError"));
                else {
                    const r = this[m].persistentAnchors.get(e);
                    this[m].persistentAnchors.delete(e), r.delete(), n(void 0);
                }
            });
        }
        requestHitTestSource(e) {
            return new Promise((n, i)=>{
                if (!this[m].enabledFeatures.includes("hit-test")) i(new DOMException('WebXR feature "hit-test" is not supported by current session', "NotSupportedError"));
                else if (this[m].ended) i(new DOMException("XRSession has already ended.", "InvalidStateError"));
                else if (!this[m].device[b].sem) i(new DOMException("Synthethic Environment Module required for emulating hit-test", "OperationError"));
                else {
                    const r = new l3(this, e);
                    this[m].hitTestSources.add(r), n(r);
                }
            });
        }
        get onend() {
            var e;
            return (e = this[m].onend) !== null && e !== void 0 ? e : (()=>{});
        }
        set onend(e) {
            this[m].onend && this.removeEventListener("end", this[m].onend), this[m].onend = e, e && this.addEventListener("end", e);
        }
        get oninputsourceschange() {
            var e;
            return (e = this[m].oninputsourceschange) !== null && e !== void 0 ? e : (()=>{});
        }
        set oninputsourceschange(e) {
            this[m].oninputsourceschange && this.removeEventListener("inputsourceschange", this[m].oninputsourceschange), this[m].oninputsourceschange = e, e && this.addEventListener("inputsourceschange", e);
        }
        get onselect() {
            var e;
            return (e = this[m].onselect) !== null && e !== void 0 ? e : (()=>{});
        }
        set onselect(e) {
            this[m].onselect && this.removeEventListener("select", this[m].onselect), this[m].onselect = e, e && this.addEventListener("select", e);
        }
        get onselectstart() {
            var e;
            return (e = this[m].onselectstart) !== null && e !== void 0 ? e : (()=>{});
        }
        set onselectstart(e) {
            this[m].onselectstart && this.removeEventListener("selectstart", this[m].onselectstart), this[m].onselectstart = e, e && this.addEventListener("selectstart", e);
        }
        get onselectend() {
            var e;
            return (e = this[m].onselectend) !== null && e !== void 0 ? e : (()=>{});
        }
        set onselectend(e) {
            this[m].onselectend && this.removeEventListener("selectend", this[m].onselectend), this[m].onselectend = e, e && this.addEventListener("selectend", e);
        }
        get onsqueeze() {
            var e;
            return (e = this[m].onsqueeze) !== null && e !== void 0 ? e : (()=>{});
        }
        set onsqueeze(e) {
            this[m].onsqueeze && this.removeEventListener("squeeze", this[m].onsqueeze), this[m].onsqueeze = e, e && this.addEventListener("squeeze", e);
        }
        get onsqueezestart() {
            var e;
            return (e = this[m].onsqueezestart) !== null && e !== void 0 ? e : (()=>{});
        }
        set onsqueezestart(e) {
            this[m].onsqueezestart && this.removeEventListener("squeezestart", this[m].onsqueezestart), this[m].onsqueezestart = e, e && this.addEventListener("squeezestart", e);
        }
        get onsqueezeend() {
            var e;
            return (e = this[m].onsqueezeend) !== null && e !== void 0 ? e : (()=>{});
        }
        set onsqueezeend(e) {
            this[m].onsqueezeend && this.removeEventListener("squeezeend", this[m].onsqueezeend), this[m].onsqueezeend = e, e && this.addEventListener("squeezeend", e);
        }
        get onvisibilitychange() {
            var e;
            return (e = this[m].onvisibilitychange) !== null && e !== void 0 ? e : (()=>{});
        }
        set onvisibilitychange(e) {
            this[m].onvisibilitychange && this.removeEventListener("visibilitychange", this[m].onvisibilitychange), this[m].onvisibilitychange = e, e && this.addEventListener("visibilitychange", e);
        }
        get onframeratechange() {
            var e;
            return (e = this[m].onframeratechange) !== null && e !== void 0 ? e : (()=>{});
        }
        set onframeratechange(e) {
            this[m].onframeratechange && this.removeEventListener("frameratechange", this[m].onframeratechange), this[m].onframeratechange = e, e && this.addEventListener("frameratechange", e);
        }
    }
    var Zi;
    (function(t) {
        t.Wrist = "wrist", t.ThumbMetacarpal = "thumb-metacarpal", t.ThumbPhalanxProximal = "thumb-phalanx-proximal", t.ThumbPhalanxDistal = "thumb-phalanx-distal", t.ThumbTip = "thumb-tip", t.IndexFingerMetacarpal = "index-finger-metacarpal", t.IndexFingerPhalanxProximal = "index-finger-phalanx-proximal", t.IndexFingerPhalanxIntermediate = "index-finger-phalanx-intermediate", t.IndexFingerPhalanxDistal = "index-finger-phalanx-distal", t.IndexFingerTip = "index-finger-tip", t.MiddleFingerMetacarpal = "middle-finger-metacarpal", t.MiddleFingerPhalanxProximal = "middle-finger-phalanx-proximal", t.MiddleFingerPhalanxIntermediate = "middle-finger-phalanx-intermediate", t.MiddleFingerPhalanxDistal = "middle-finger-phalanx-distal", t.MiddleFingerTip = "middle-finger-tip", t.RingFingerMetacarpal = "ring-finger-metacarpal", t.RingFingerPhalanxProximal = "ring-finger-phalanx-proximal", t.RingFingerPhalanxIntermediate = "ring-finger-phalanx-intermediate", t.RingFingerPhalanxDistal = "ring-finger-phalanx-distal", t.RingFingerTip = "ring-finger-tip", t.PinkyFingerMetacarpal = "pinky-finger-metacarpal", t.PinkyFingerPhalanxProximal = "pinky-finger-phalanx-proximal", t.PinkyFingerPhalanxIntermediate = "pinky-finger-phalanx-intermediate", t.PinkyFingerPhalanxDistal = "pinky-finger-phalanx-distal", t.PinkyFingerTip = "pinky-finger-tip";
    })(Zi || (Zi = {}));
    class oo extends Map {
    }
    class lo extends le {
        constructor(e, n, i){
            super(n, i), this[un] = {
                jointName: e,
                radius: 0
            };
        }
        get jointName() {
            return this[un].jointName;
        }
    }
    const u3 = {
        jointTransforms: {
            wrist: {
                offsetMatrix: [
                    .9060805439949036,
                    -.1844543218612671,
                    .3807799518108368,
                    0,
                    -.08027800172567368,
                    .8086723685264587,
                    .5827555656433105,
                    0,
                    -.4154181182384491,
                    -.5585917234420776,
                    .7179155349731445,
                    0,
                    -.06867414712905884,
                    -.009423808194696903,
                    .10627774149179459,
                    1
                ],
                radius: .021460847929120064
            },
            "thumb-metacarpal": {
                offsetMatrix: [
                    -.5012241005897522,
                    -.8650535345077515,
                    -.0213695727288723,
                    0,
                    .7415963411331177,
                    -.4421543478965759,
                    .5045139193534851,
                    0,
                    -.44587990641593933,
                    .23702676594257355,
                    .8631392121315002,
                    0,
                    -.032122574746608734,
                    -.01196830440312624,
                    .07194234430789948,
                    1
                ],
                radius: .019382517784833908
            },
            "thumb-phalanx-proximal": {
                offsetMatrix: [
                    -.3175753057003021,
                    -.9460570216178894,
                    -.06419729441404343,
                    0,
                    .8958902955055237,
                    -.32153913378715515,
                    .30658137798309326,
                    0,
                    -.3106854259967804,
                    .03984907269477844,
                    .9496771097183228,
                    0,
                    -.017625702545046806,
                    -.01967475935816765,
                    .04387917369604111,
                    1
                ],
                radius: .01228295173496008
            },
            "thumb-phalanx-distal": {
                offsetMatrix: [
                    -.4944636821746826,
                    -.8691971898078918,
                    .001086252392269671,
                    0,
                    .8307800889015198,
                    -.4722411036491394,
                    .2946045398712158,
                    0,
                    -.25555649399757385,
                    .14657381176948547,
                    .9556186199188232,
                    0,
                    -.007126678712666035,
                    -.021021386608481407,
                    .011786630377173424,
                    1
                ],
                radius: .009768804535269737
            },
            "thumb-tip": {
                offsetMatrix: [
                    -.4944636821746826,
                    -.8691971898078918,
                    .001086252392269671,
                    0,
                    .8307800889015198,
                    -.4722411036491394,
                    .2946045398712158,
                    0,
                    -.25555649399757385,
                    .14657381176948547,
                    .9556186199188232,
                    0,
                    .0003423091256991029,
                    -.024528030306100845,
                    -.011410919018089771,
                    1
                ],
                radius: .008768804371356964
            },
            "index-finger-metacarpal": {
                offsetMatrix: [
                    .9060805439949036,
                    -.1844543218612671,
                    .3807799518108368,
                    0,
                    -.08027800172567368,
                    .8086723685264587,
                    .5827555656433105,
                    0,
                    -.4154181182384491,
                    -.5585917234420776,
                    .7179155349731445,
                    0,
                    -.038037415593862534,
                    -.0020236473064869642,
                    .07626739144325256,
                    1
                ],
                radius: .021228281781077385
            },
            "index-finger-phalanx-proximal": {
                offsetMatrix: [
                    .7986818552017212,
                    -.35985732078552246,
                    .48229536414146423,
                    0,
                    .538311243057251,
                    .7854709625244141,
                    -.30537736415863037,
                    0,
                    -.2689369022846222,
                    .5035246014595032,
                    .8210577368736267,
                    0,
                    -.006869405973702669,
                    .033938243985176086,
                    .04206443578004837,
                    1
                ],
                radius: .010295259766280651
            },
            "index-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .8285930156707764,
                    -.32672837376594543,
                    .4546217918395996,
                    0,
                    .5577570199966431,
                    .4116027057170868,
                    -.7207564115524292,
                    0,
                    .04836784675717354,
                    .8507823944091797,
                    .5232869386672974,
                    0,
                    .0033306588884443045,
                    .014840902760624886,
                    .010923954658210278,
                    1
                ],
                radius: .00853810179978609
            },
            "index-finger-phalanx-distal": {
                offsetMatrix: [
                    .8412464261054993,
                    -.35794928669929504,
                    .4051857888698578,
                    0,
                    .5139996409416199,
                    .29711154103279114,
                    -.8046918511390686,
                    0,
                    .16765329241752625,
                    .8852096796035767,
                    .4339304566383362,
                    0,
                    .0021551470272243023,
                    -.0058362227864563465,
                    -.0017938464879989624,
                    1
                ],
                radius: .007636196445673704
            },
            "index-finger-tip": {
                offsetMatrix: [
                    .8412464261054993,
                    -.35794928669929504,
                    .4051857888698578,
                    0,
                    .5139996409416199,
                    .29711154103279114,
                    -.8046918511390686,
                    0,
                    .16765329241752625,
                    .8852096796035767,
                    .4339304566383362,
                    0,
                    -.00131594471167773,
                    -.025222131982445717,
                    -.012442642822861671,
                    1
                ],
                radius: .006636196281760931
            },
            "middle-finger-metacarpal": {
                offsetMatrix: [
                    .9060805439949036,
                    -.1844543218612671,
                    .3807799518108368,
                    0,
                    -.08027800172567368,
                    .8086723685264587,
                    .5827555656433105,
                    0,
                    -.4154181182384491,
                    -.5585917234420776,
                    .7179155349731445,
                    0,
                    -.05395089089870453,
                    .003063359996303916,
                    .07402937114238739,
                    1
                ],
                radius: .021231964230537415
            },
            "middle-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9187911748886108,
                    -.1530158370733261,
                    .36387869715690613,
                    0,
                    .038666240870952606,
                    .9522662162780762,
                    .302808940410614,
                    0,
                    -.3928440511226654,
                    -.26414817571640015,
                    .8808513283729553,
                    0,
                    -.02717282809317112,
                    .04162866622209549,
                    .03678669035434723,
                    1
                ],
                radius: .01117393933236599
            },
            "middle-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9228746294975281,
                    -.12856416404247284,
                    .36300456523895264,
                    0,
                    .14524033665657043,
                    .9892153143882751,
                    -.01890045404434204,
                    0,
                    -.3566599190235138,
                    .07016586512327194,
                    .9315956234931946,
                    0,
                    -.01030921470373869,
                    .05296773463487625,
                    -.0010256498353555799,
                    1
                ],
                radius: .008030958473682404
            },
            "middle-finger-phalanx-distal": {
                offsetMatrix: [
                    .9325166344642639,
                    -.040404170751571655,
                    .35885775089263916,
                    0,
                    .06836572289466858,
                    .995502769947052,
                    -.0655682161450386,
                    0,
                    -.3545948565006256,
                    .08567725121974945,
                    .9310863614082336,
                    0,
                    -.0004833847051486373,
                    .05103470757603645,
                    -.026690717786550522,
                    1
                ],
                radius: .007629410829395056
            },
            "middle-finger-tip": {
                offsetMatrix: [
                    .9325166344642639,
                    -.040404170751571655,
                    .35885775089263916,
                    0,
                    .06836572289466858,
                    .995502769947052,
                    -.0655682161450386,
                    0,
                    -.3545948565006256,
                    .08567725121974945,
                    .9310863614082336,
                    0,
                    .008158999495208263,
                    .05004044249653816,
                    -.050120558589696884,
                    1
                ],
                radius: .006629410665482283
            },
            "ring-finger-metacarpal": {
                offsetMatrix: [
                    .9060805439949036,
                    -.1844543218612671,
                    .3807799518108368,
                    0,
                    -.08027800172567368,
                    .8086723685264587,
                    .5827555656433105,
                    0,
                    -.4154181182384491,
                    -.5585917234420776,
                    .7179155349731445,
                    0,
                    -.06732909381389618,
                    .007902119308710098,
                    .07209732383489609,
                    1
                ],
                radius: .019088275730609894
            },
            "ring-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9391821026802063,
                    -.027994679287075996,
                    .34227466583251953,
                    0,
                    -.18282271921634674,
                    .8029410243034363,
                    .5673282742500305,
                    0,
                    -.2907087206840515,
                    -.5954000353813171,
                    .7489906549453735,
                    0,
                    -.047129884362220764,
                    .03806127607822418,
                    .032147664576768875,
                    1
                ],
                radius: .00992213748395443
            },
            "ring-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9249380826950073,
                    .03699534013867378,
                    .3783116042613983,
                    0,
                    -.12898847460746765,
                    .9667453765869141,
                    .2208271026611328,
                    0,
                    -.3575615882873535,
                    -.25304901599884033,
                    .8989526629447937,
                    0,
                    -.03579339757561684,
                    .06127955764532089,
                    .002939916681498289,
                    1
                ],
                radius: .007611672393977642
            },
            "ring-finger-phalanx-distal": {
                offsetMatrix: [
                    .9001164436340332,
                    .03983335196971893,
                    .4338230490684509,
                    0,
                    -.09662467986345291,
                    .9892624020576477,
                    .10964841395616531,
                    0,
                    -.4247973561286926,
                    -.14061418175697327,
                    .8943013548851013,
                    0,
                    -.026291755959391594,
                    .06800390034914017,
                    -.02094830758869648,
                    1
                ],
                radius: .007231088820844889
            },
            "ring-finger-tip": {
                offsetMatrix: [
                    .9001164436340332,
                    .03983335196971893,
                    .4338230490684509,
                    0,
                    -.09662467986345291,
                    .9892624020576477,
                    .10964841395616531,
                    0,
                    -.4247973561286926,
                    -.14061418175697327,
                    .8943013548851013,
                    0,
                    -.016345610842108727,
                    .07300511747598648,
                    -.04263874143362045,
                    1
                ],
                radius: .0062310886569321156
            },
            "pinky-finger-metacarpal": {
                offsetMatrix: [
                    .8769711852073669,
                    .31462907791137695,
                    .36322021484375,
                    0,
                    -.4506046175956726,
                    .801031768321991,
                    .39408499002456665,
                    0,
                    -.16696058213710785,
                    -.5092697143554688,
                    .8442559838294983,
                    0,
                    -.07460174709558487,
                    .0062340241856873035,
                    .06756893545389175,
                    1
                ],
                radius: .01808827556669712
            },
            "pinky-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9498357176780701,
                    .1553308218717575,
                    .2714462876319885,
                    0,
                    -.3019258379936218,
                    .6817675232887268,
                    .6663586497306824,
                    0,
                    -.08155745267868042,
                    -.7148879170417786,
                    .694466233253479,
                    0,
                    -.06697750836610794,
                    .029482364654541016,
                    .02902858518064022,
                    1
                ],
                radius: .008483353070914745
            },
            "pinky-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9214097261428833,
                    .27928245067596436,
                    .2701927423477173,
                    0,
                    -.3670244514942169,
                    .8538867831230164,
                    .36901235580444336,
                    0,
                    -.12765564024448395,
                    -.43917882442474365,
                    .8892839550971985,
                    0,
                    -.06447203457355499,
                    .05144399777054787,
                    .0076942890882492065,
                    1
                ],
                radius: .0067641944624483585
            },
            "pinky-finger-phalanx-distal": {
                offsetMatrix: [
                    .9038633704185486,
                    .23618005216121674,
                    .3567195236682892,
                    0,
                    -.3532794713973999,
                    .8823202252388,
                    .3109731376171112,
                    0,
                    -.24129553139209747,
                    -.4070987403392792,
                    .8809353709220886,
                    0,
                    -.06187915802001953,
                    .060364335775375366,
                    -.010368337854743004,
                    1
                ],
                radius: .0064259846694767475
            },
            "pinky-finger-tip": {
                offsetMatrix: [
                    .9038633704185486,
                    .23618005216121674,
                    .3567195236682892,
                    0,
                    -.3532794713973999,
                    .8823202252388,
                    .3109731376171112,
                    0,
                    -.24129553139209747,
                    -.4070987403392792,
                    .8809353709220886,
                    0,
                    -.056796226650476456,
                    .07042007893323898,
                    -.02921444922685623,
                    1
                ],
                radius: .005425984505563974
            }
        },
        gripOffsetMatrix: [
            .08027800917625427,
            -.8086723685264587,
            -.5827556252479553,
            0,
            -.4154181480407715,
            -.5585916638374329,
            .7179154753684998,
            0,
            -.9060805439949036,
            .1844543218612671,
            -.3807799518108368,
            0,
            -.038054611533880234,
            -.002910431008785963,
            .03720742464065552,
            1
        ]
    }, h3 = {
        jointTransforms: {
            wrist: {
                offsetMatrix: [
                    .9340395331382751,
                    -.13936476409435272,
                    .32885703444480896,
                    0,
                    -.005510995630174875,
                    .914999783039093,
                    .40341612696647644,
                    0,
                    -.3571262061595917,
                    -.37861889600753784,
                    .8538784384727478,
                    0,
                    -.05789132043719292,
                    .01670890860259533,
                    .11183350533246994,
                    1
                ],
                radius: .021460847929120064
            },
            "thumb-metacarpal": {
                offsetMatrix: [
                    .02145560085773468,
                    -.9978390336036682,
                    .0621047280728817,
                    0,
                    .41311800479888916,
                    .06541631370782852,
                    .9083252549171448,
                    0,
                    -.9104245901107788,
                    .006167683284729719,
                    .4136286973953247,
                    0,
                    -.016488194465637207,
                    .012708572670817375,
                    .08862338215112686,
                    1
                ],
                radius: .019382517784833908
            },
            "thumb-phalanx-proximal": {
                offsetMatrix: [
                    .21270370483398438,
                    -.966137707233429,
                    .14606566727161407,
                    0,
                    .49890995025634766,
                    .2359165996313095,
                    .8339261412620544,
                    0,
                    -.8401462435722351,
                    -.10450579971075058,
                    .5321959853172302,
                    0,
                    .013112368993461132,
                    .012508046813309193,
                    .07517509907484055,
                    1
                ],
                radius: .01228295173496008
            },
            "thumb-phalanx-distal": {
                offsetMatrix: [
                    .01653280481696129,
                    -.9986647963523865,
                    .048943229019641876,
                    0,
                    .26313456892967224,
                    .051570065319538116,
                    .9633802771568298,
                    0,
                    -.9646173715591431,
                    -.0030490627977997065,
                    .26363563537597656,
                    0,
                    .04150351136922836,
                    .016039609909057617,
                    .05719054117798805,
                    1
                ],
                radius: .009768804535269737
            },
            "thumb-tip": {
                offsetMatrix: [
                    .01653280481696129,
                    -.9986647963523865,
                    .048943229019641876,
                    0,
                    .26313456892967224,
                    .051570065319538116,
                    .9633802771568298,
                    0,
                    -.9646173715591431,
                    -.0030490627977997065,
                    .26363563537597656,
                    0,
                    .06548332422971725,
                    .01683700829744339,
                    .0516640841960907,
                    1
                ],
                radius: .008768804371356964
            },
            "index-finger-metacarpal": {
                offsetMatrix: [
                    .9340395331382751,
                    -.13936476409435272,
                    .32885703444480896,
                    0,
                    -.005510995630174875,
                    .914999783039093,
                    .40341612696647644,
                    0,
                    -.3571262061595917,
                    -.37861889600753784,
                    .8538784384727478,
                    0,
                    -.02592567168176174,
                    .019982583820819855,
                    .08479326963424683,
                    1
                ],
                radius: .021228281781077385
            },
            "index-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9063700437545776,
                    -.21756279468536377,
                    .3621589243412018,
                    0,
                    .0970839336514473,
                    .9415287375450134,
                    .3226419687271118,
                    0,
                    -.41117796301841736,
                    -.2572731077671051,
                    .8744958639144897,
                    0,
                    -.0015709538711234927,
                    .043078210204839706,
                    .034657616168260574,
                    1
                ],
                radius: .010295259766280651
            },
            "index-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9159826040267944,
                    -.1651475727558136,
                    .36565208435058594,
                    0,
                    .09755707532167435,
                    .9756820797920227,
                    .1962820291519165,
                    0,
                    -.3891757130622864,
                    -.14411886036396027,
                    .9098196625709534,
                    0,
                    .014023927971720695,
                    .052835866808891296,
                    .0014903299743309617,
                    1
                ],
                radius: .00853810179978609
            },
            "index-finger-phalanx-distal": {
                offsetMatrix: [
                    .9378057718276978,
                    -.12329639494419098,
                    .3245268166065216,
                    0,
                    .032558172941207886,
                    .9619227051734924,
                    .2713746726512909,
                    0,
                    -.3456292748451233,
                    -.2439306229352951,
                    .9061115384101868,
                    0,
                    .023482320830225945,
                    .05633850023150444,
                    -.020621655508875847,
                    1
                ],
                radius: .007636196445673704
            },
            "index-finger-tip": {
                offsetMatrix: [
                    .9378057718276978,
                    -.12329639494419098,
                    .3245268166065216,
                    0,
                    .032558172941207886,
                    .9619227051734924,
                    .2713746726512909,
                    0,
                    -.3456292748451233,
                    -.2439306229352951,
                    .9061115384101868,
                    0,
                    .03096788562834263,
                    .06281610578298569,
                    -.040703095495700836,
                    1
                ],
                radius: .006636196281760931
            },
            "middle-finger-metacarpal": {
                offsetMatrix: [
                    .9340395331382751,
                    -.13936476409435272,
                    .32885703444480896,
                    0,
                    -.005510995630174875,
                    .914999783039093,
                    .40341612696647644,
                    0,
                    -.3571262061595917,
                    -.37861889600753784,
                    .8538784384727478,
                    0,
                    -.04184452444314957,
                    .022474845871329308,
                    .08177298307418823,
                    1
                ],
                radius: .021231964230537415
            },
            "middle-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9720265865325928,
                    -.08313076198101044,
                    .21966552734375,
                    0,
                    .20477405190467834,
                    .7580050826072693,
                    -.6192700862884521,
                    0,
                    -.11502730846405029,
                    .6469289064407349,
                    .7538246512413025,
                    0,
                    -.022107340395450592,
                    .05035499855875969,
                    .02970452979207039,
                    1
                ],
                radius: .01117393933236599
            },
            "middle-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9779140949249268,
                    -.07129573822021484,
                    .19646917283535004,
                    0,
                    .1287083923816681,
                    -.5352076292037964,
                    -.8348574042320251,
                    0,
                    .1646735966205597,
                    .8417060971260071,
                    -.5142109394073486,
                    0,
                    -.017169542610645294,
                    .022584279999136925,
                    -.00265491777099669,
                    1
                ],
                radius: .008030958473682404
            },
            "middle-finger-phalanx-distal": {
                offsetMatrix: [
                    .9774913787841797,
                    -.19657190144062042,
                    .07661263644695282,
                    0,
                    -.1924918293952942,
                    -.9796126484870911,
                    -.05749811604619026,
                    0,
                    .08635343611240387,
                    .041456472128629684,
                    -.995401918888092,
                    0,
                    -.02170622907578945,
                    -.0006043742760084569,
                    .011511396616697311,
                    1
                ],
                radius: .007629410829395056
            },
            "middle-finger-tip": {
                offsetMatrix: [
                    .9774913787841797,
                    -.19657190144062042,
                    .07661263644695282,
                    0,
                    -.1924918293952942,
                    -.9796126484870911,
                    -.05749811604619026,
                    0,
                    .08635343611240387,
                    .041456472128629684,
                    -.995401918888092,
                    0,
                    -.02438267692923546,
                    -.0026927536819130182,
                    .03627248480916023,
                    1
                ],
                radius: .006629410665482283
            },
            "ring-finger-metacarpal": {
                offsetMatrix: [
                    .9340395331382751,
                    -.13936476409435272,
                    .32885703444480896,
                    0,
                    -.005510995630174875,
                    .914999783039093,
                    .40341612696647644,
                    0,
                    -.3571262061595917,
                    -.37861889600753784,
                    .8538784384727478,
                    0,
                    -.05944233387708664,
                    .0264605600386858,
                    .07478221505880356,
                    1
                ],
                radius: .019088275730609894
            },
            "ring-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9842101335525513,
                    .024470895528793335,
                    .1753024309873581,
                    0,
                    .12200043350458145,
                    .6237703561782837,
                    -.7720272541046143,
                    0,
                    -.12824076414108276,
                    .7812241315841675,
                    .610936164855957,
                    0,
                    -.04249368980526924,
                    .0467497780919075,
                    .027722163125872612,
                    1
                ],
                radius: .00992213748395443
            },
            "ring-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9941774606704712,
                    .05949164181947708,
                    .08983955532312393,
                    0,
                    .10504482686519623,
                    -.7208291888237,
                    -.6851072907447815,
                    0,
                    .024001073092222214,
                    .6905553936958313,
                    -.7228817939758301,
                    0,
                    -.0374927744269371,
                    .016285063698887825,
                    .0038980208337306976,
                    1
                ],
                radius: .007611672393977642
            },
            "ring-finger-phalanx-distal": {
                offsetMatrix: [
                    .9995742440223694,
                    .01638498157262802,
                    .02412819117307663,
                    0,
                    .007813597097992897,
                    -.9474818110466003,
                    .31971633434295654,
                    0,
                    .028100071474909782,
                    -.31939181685447693,
                    -.9472070932388306,
                    0,
                    -.038130562752485275,
                    -.0020653479732573032,
                    .02310742810368538,
                    1
                ],
                radius: .007231088820844889
            },
            "ring-finger-tip": {
                offsetMatrix: [
                    .9995742440223694,
                    .01638498157262802,
                    .02412819117307663,
                    0,
                    .007813597097992897,
                    -.9474818110466003,
                    .31971633434295654,
                    0,
                    .028100071474909782,
                    -.31939181685447693,
                    -.9472070932388306,
                    0,
                    -.0390593595802784,
                    .004176302347332239,
                    .0466572530567646,
                    1
                ],
                radius: .0062310886569321156
            },
            "pinky-finger-metacarpal": {
                offsetMatrix: [
                    .9147363901138306,
                    .3458845317363739,
                    .20885537564754486,
                    0,
                    -.3923271894454956,
                    .8839452862739563,
                    .2544005811214447,
                    0,
                    -.09662359952926636,
                    -.3146490156650543,
                    .9442773461341858,
                    0,
                    -.06715242564678192,
                    .024195827543735504,
                    .07137546688318253,
                    1
                ],
                radius: .01808827556669712
            },
            "pinky-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9613109827041626,
                    .22439135611057281,
                    .15977802872657776,
                    0,
                    .01002211682498455,
                    .5511574745178223,
                    -.8343409299850464,
                    0,
                    -.27528178691864014,
                    .8036624789237976,
                    .5275853276252747,
                    0,
                    -.06273911893367767,
                    .038559623062610626,
                    .028268879279494286,
                    1
                ],
                radius: .008483353070914745
            },
            "pinky-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9820972084999084,
                    .18811029195785522,
                    -.00995189044624567,
                    0,
                    .14063723385334015,
                    -.7673450708389282,
                    -.6256227493286133,
                    0,
                    -.12532226741313934,
                    .6130226850509644,
                    -.7800630927085876,
                    0,
                    -.05428232625126839,
                    .013870777562260628,
                    .012061242014169693,
                    1
                ],
                radius: .0067641944624483585
            },
            "pinky-finger-phalanx-distal": {
                offsetMatrix: [
                    .9744614362716675,
                    .20454788208007812,
                    -.09265263378620148,
                    0,
                    .22429193556308746,
                    -.9065253138542175,
                    .35764020681381226,
                    0,
                    -.010836843401193619,
                    -.3692878782749176,
                    -.9292529225349426,
                    0,
                    -.05173685774207115,
                    .0014194445684552193,
                    .02790539152920246,
                    1
                ],
                radius: .0064259846694767475
            },
            "pinky-finger-tip": {
                offsetMatrix: [
                    .9744614362716675,
                    .20454788208007812,
                    -.09265263378620148,
                    0,
                    .22429193556308746,
                    -.9065253138542175,
                    .35764020681381226,
                    0,
                    -.010836843401193619,
                    -.3692878782749176,
                    -.9292529225349426,
                    0,
                    -.05098633095622063,
                    .008463085629045963,
                    .048688892275094986,
                    1
                ],
                radius: .005425984505563974
            }
        },
        gripOffsetMatrix: [
            .005510995630174875,
            -.9149997234344482,
            -.40341615676879883,
            0,
            -.3571262061595917,
            -.37861889600753784,
            .8538784384727478,
            0,
            -.9340395331382751,
            .13936474919319153,
            -.32885703444480896,
            0,
            -.031803809106349945,
            .007837686687707901,
            .04313928261399269,
            1
        ]
    }, d3 = {
        jointTransforms: {
            wrist: {
                offsetMatrix: [
                    .9616971015930176,
                    -.13805118203163147,
                    .2368120402097702,
                    0,
                    .0005348679260350764,
                    .8648636937141418,
                    .5020061135292053,
                    0,
                    -.2741127610206604,
                    -.48265108466148376,
                    .8318111300468445,
                    0,
                    -.04913589730858803,
                    .0021463718730956316,
                    .11701996624469757,
                    1
                ],
                radius: .021460847929120064
            },
            "thumb-metacarpal": {
                offsetMatrix: [
                    -.07536252588033676,
                    -.9959676265716553,
                    -.04867160692811012,
                    0,
                    .5877083539962769,
                    -.08379616588354111,
                    .8047218918800354,
                    0,
                    -.8055551648139954,
                    .032041035592556,
                    .5916536450386047,
                    0,
                    -.010643752291798592,
                    .0006936835707165301,
                    .08736639469861984,
                    1
                ],
                radius: .019382517784833908
            },
            "thumb-phalanx-proximal": {
                offsetMatrix: [
                    .1374533325433731,
                    -.9904957413673401,
                    .004982374142855406,
                    0,
                    .5534393787384033,
                    .08097179979085922,
                    .8289443850517273,
                    0,
                    -.8214688897132874,
                    -.11118389666080475,
                    .559309184551239,
                    0,
                    .015547193586826324,
                    -.0003480653394944966,
                    .0681300163269043,
                    1
                ],
                radius: .01228295173496008
            },
            "thumb-phalanx-distal": {
                offsetMatrix: [
                    -.04659227654337883,
                    -.9974699020385742,
                    -.05369402840733528,
                    0,
                    .6812446117401123,
                    -.07104194164276123,
                    .728600800037384,
                    0,
                    -.7305715084075928,
                    -.002631746232509613,
                    .6828309893608093,
                    0,
                    .04330715537071228,
                    .003409178927540779,
                    .0492292083799839,
                    1
                ],
                radius: .009768804535269737
            },
            "thumb-tip": {
                offsetMatrix: [
                    -.04659227654337883,
                    -.9974699020385742,
                    -.05369402840733528,
                    0,
                    .6812446117401123,
                    -.07104194164276123,
                    .728600800037384,
                    0,
                    -.7305715084075928,
                    -.002631746232509613,
                    .6828309893608093,
                    0,
                    .062003348022699356,
                    .004069602582603693,
                    .03322213143110275,
                    1
                ],
                radius: .008768804371356964
            },
            "index-finger-metacarpal": {
                offsetMatrix: [
                    .9616971015930176,
                    -.13805118203163147,
                    .2368120402097702,
                    0,
                    .0005348679260350764,
                    .8648636937141418,
                    .5020061135292053,
                    0,
                    -.2741127610206604,
                    -.48265108466148376,
                    .8318111300468445,
                    0,
                    -.02009812369942665,
                    .008770795539021492,
                    .08660387247800827,
                    1
                ],
                radius: .021228281781077385
            },
            "index-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9001791477203369,
                    -.2598813474178314,
                    .3494834005832672,
                    0,
                    .06073702871799469,
                    .8695210218429565,
                    .490146666765213,
                    0,
                    -.4312632381916046,
                    -.41999316215515137,
                    .7985095381736755,
                    0,
                    -.00017739279428496957,
                    .03890012577176094,
                    .039073407649993896,
                    1
                ],
                radius: .010295259766280651
            },
            "index-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9082008600234985,
                    -.20898112654685974,
                    .36262574791908264,
                    0,
                    .11045389622449875,
                    .9553793668746948,
                    .27395179867744446,
                    0,
                    -.40369608998298645,
                    -.20874978601932526,
                    .8907597661018372,
                    0,
                    .01617925800383091,
                    .05482936650514603,
                    .008788082748651505,
                    1
                ],
                radius: .00853810179978609
            },
            "index-finger-phalanx-distal": {
                offsetMatrix: [
                    .9309692978858948,
                    -.16783711314201355,
                    .32423174381256104,
                    0,
                    .1080828532576561,
                    .9749603867530823,
                    .1943446695804596,
                    0,
                    -.34873148798942566,
                    -.14588497579097748,
                    .9257990717887878,
                    0,
                    .02599053829908371,
                    .059902746230363846,
                    -.012860597111284733,
                    1
                ],
                radius: .007636196445673704
            },
            "index-finger-tip": {
                offsetMatrix: [
                    .9309692978858948,
                    -.16783711314201355,
                    .32423174381256104,
                    0,
                    .1080828532576561,
                    .9749603867530823,
                    .1943446695804596,
                    0,
                    -.34873148798942566,
                    -.14588497579097748,
                    .9257990717887878,
                    0,
                    .03362493962049484,
                    .06421422213315964,
                    -.033461250364780426,
                    1
                ],
                radius: .006636196281760931
            },
            "middle-finger-metacarpal": {
                offsetMatrix: [
                    .9616971015930176,
                    -.13805118203163147,
                    .2368120402097702,
                    0,
                    .0005348679260350764,
                    .8648636937141418,
                    .5020061135292053,
                    0,
                    -.2741127610206604,
                    -.48265108466148376,
                    .8318111300468445,
                    0,
                    -.03627845644950867,
                    .011579737067222595,
                    .08550142496824265,
                    1
                ],
                radius: .021231964230537415
            },
            "middle-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9876697659492493,
                    -.06786545366048813,
                    .1410750150680542,
                    0,
                    -.015095947310328484,
                    .855663537979126,
                    .5173118710517883,
                    0,
                    -.15582047402858734,
                    -.5130629539489746,
                    .8440889716148376,
                    0,
                    -.021259509027004242,
                    .04587256908416748,
                    .03659208118915558,
                    1
                ],
                radius: .01117393933236599
            },
            "middle-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .988391637802124,
                    -.04354291781783104,
                    .14555205404758453,
                    0,
                    .008894841186702251,
                    .9729899168014526,
                    .23067504167556763,
                    0,
                    -.15166506171226501,
                    -.22670257091522217,
                    .9620829224586487,
                    0,
                    -.014570588245987892,
                    .06789684295654297,
                    .0003578895702958107,
                    1
                ],
                radius: .008030958473682404
            },
            "middle-finger-phalanx-distal": {
                offsetMatrix: [
                    .9853697419166565,
                    .044260796159505844,
                    .16458062827587128,
                    0,
                    -.0757969319820404,
                    .9787378311157227,
                    .19059516489505768,
                    0,
                    -.1526455283164978,
                    -.20028135180473328,
                    .9677740931510925,
                    0,
                    -.010392282158136368,
                    .07414241135120392,
                    -.026147106662392616,
                    1
                ],
                radius: .007629410829395056
            },
            "middle-finger-tip": {
                offsetMatrix: [
                    .9853697419166565,
                    .044260796159505844,
                    .16458062827587128,
                    0,
                    -.0757969319820404,
                    .9787378311157227,
                    .19059516489505768,
                    0,
                    -.1526455283164978,
                    -.20028135180473328,
                    .9677740931510925,
                    0,
                    -.0069718430750072,
                    .08024183660745621,
                    -.05014154314994812,
                    1
                ],
                radius: .006629410665482283
            },
            "ring-finger-metacarpal": {
                offsetMatrix: [
                    .9616971015930176,
                    -.13805118203163147,
                    .2368120402097702,
                    0,
                    .0005348679260350764,
                    .8648636937141418,
                    .5020061135292053,
                    0,
                    -.2741127610206604,
                    -.48265108466148376,
                    .8318111300468445,
                    0,
                    -.05402477830648422,
                    .015797706320881844,
                    .08152295649051666,
                    1
                ],
                radius: .019088275730609894
            },
            "ring-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9940828680992126,
                    .05735103040933609,
                    .09224652498960495,
                    0,
                    -.10022822767496109,
                    .8116500377655029,
                    .5754809379577637,
                    0,
                    -.041867565363645554,
                    -.5813214182853699,
                    .8125960826873779,
                    0,
                    -.041623555123806,
                    .04171867296099663,
                    .03582974523305893,
                    1
                ],
                radius: .00992213748395443
            },
            "ring-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9843675494194031,
                    .12044742703437805,
                    .12850022315979004,
                    0,
                    -.15629759430885315,
                    .9337108135223389,
                    .3221098482608795,
                    0,
                    -.08118485659360886,
                    -.3371586799621582,
                    .937940776348114,
                    0,
                    -.039990875869989395,
                    .06438793987035751,
                    .004141641780734062,
                    1
                ],
                radius: .007611672393977642
            },
            "ring-finger-phalanx-distal": {
                offsetMatrix: [
                    .9748351573944092,
                    .11857274919748306,
                    .18877571821212769,
                    0,
                    -.15575434267520905,
                    .9681083559989929,
                    .19623035192489624,
                    0,
                    -.15948788821697235,
                    -.22069483995437622,
                    .9622148275375366,
                    0,
                    -.03783353418111801,
                    .07334739714860916,
                    -.020782606676220894,
                    1
                ],
                radius: .007231088820844889
            },
            "ring-finger-tip": {
                offsetMatrix: [
                    .9748351573944092,
                    .11857274919748306,
                    .18877571821212769,
                    0,
                    -.15575434267520905,
                    .9681083559989929,
                    .19623035192489624,
                    0,
                    -.15948788821697235,
                    -.22069483995437622,
                    .9622148275375366,
                    0,
                    -.03445569798350334,
                    .0802423357963562,
                    -.04392268508672714,
                    1
                ],
                radius: .0062310886569321156
            },
            "pinky-finger-metacarpal": {
                offsetMatrix: [
                    .9181402921676636,
                    .35625091195106506,
                    .17350243031978607,
                    0,
                    -.39615097641944885,
                    .8352503180503845,
                    .38134080171585083,
                    0,
                    -.009065053425729275,
                    -.41885748505592346,
                    .9080066680908203,
                    0,
                    -.06191859766840935,
                    .013620133511722088,
                    .07850203663110733,
                    1
                ],
                radius: .01808827556669712
            },
            "pinky-finger-phalanx-proximal": {
                offsetMatrix: [
                    .9714386463165283,
                    .236698180437088,
                    -.016745081171393394,
                    0,
                    -.18462024629116058,
                    .7982627749443054,
                    .5733163952827454,
                    0,
                    .14906984567642212,
                    -.5538501739501953,
                    .8191629648208618,
                    0,
                    -.061502378433942795,
                    .032741155475378036,
                    .03705105185508728,
                    1
                ],
                radius: .008483353070914745
            },
            "pinky-finger-phalanx-intermediate": {
                offsetMatrix: [
                    .9337416291236877,
                    .35620439052581787,
                    -.03527557849884033,
                    0,
                    -.33203884959220886,
                    .8987522721290588,
                    .28634607791900635,
                    0,
                    .13370157778263092,
                    -.2556603252887726,
                    .9574766755104065,
                    0,
                    -.06608185172080994,
                    .049755651503801346,
                    .011886020191013813,
                    1
                ],
                radius: .0067641944624483585
            },
            "pinky-finger-phalanx-distal": {
                offsetMatrix: [
                    .9419984817504883,
                    .3303581774234772,
                    .059175245463848114,
                    0,
                    -.33483216166496277,
                    .9130291938781738,
                    .23294763267040253,
                    0,
                    .02292730286717415,
                    -.2392500638961792,
                    .970687210559845,
                    0,
                    -.0687975287437439,
                    .054948460310697556,
                    -.007561664097011089,
                    1
                ],
                radius: .0064259846694767475
            },
            "pinky-finger-tip": {
                offsetMatrix: [
                    .9419984817504883,
                    .3303581774234772,
                    .059175245463848114,
                    0,
                    -.33483216166496277,
                    .9130291938781738,
                    .23294763267040253,
                    0,
                    .02292730286717415,
                    -.2392500638961792,
                    .970687210559845,
                    0,
                    -.06947512179613113,
                    .0613851435482502,
                    -.028543535619974136,
                    1
                ],
                radius: .005425984505563974
            }
        },
        gripOffsetMatrix: [
            -.0005348679260350764,
            -.8648636937141418,
            -.5020061135292053,
            0,
            -.2741127908229828,
            -.48265108466148376,
            .8318111896514893,
            0,
            -.9616971015930176,
            .13805119693279266,
            -.2368120402097702,
            0,
            -.02878567762672901,
            .0017147823236882687,
            .04536811262369156,
            1
        ]
    }, Hl = {
        profileId: "oculus-hand",
        fallbackProfileIds: [
            "generic-hand",
            "generic-hand-select",
            "generic-trigger"
        ],
        poses: {
            default: d3,
            pinch: u3,
            point: h3
        }
    }, f3 = {
        mapping: Yi.None,
        buttons: [
            {
                id: "pinch",
                type: "analog",
                eventTrigger: "select"
            }
        ],
        axes: []
    }, Wl = ye(), ql = tt(), Xl = ye(), Yl = ye(), Zl = tt(), Ql = ye(), Kl = ye(), Jl = tt(), ec = ye(), tc = (t, e, n, i)=>(Xi(Wl, e), Cr(ql, e), ga(Xl, e), Xi(Yl, n), Cr(Zl, n), ga(Ql, n), xa(Kl, Wl, Yl, i), Di(Jl, ql, Zl, i), xa(ec, Xl, Ql, i), Mp(t, Jl, Kl, ec), t), p3 = [
        1,
        -1,
        -1,
        0,
        -1,
        1,
        1,
        0,
        -1,
        1,
        1,
        0,
        -1,
        1,
        1,
        1
    ], m3 = (t)=>{
        for(let e = 0; e < 16; e++)t[e] *= p3[e];
    };
    class nc extends _u {
        constructor(e, n, i){
            if (n !== Fe.Left && n !== Fe.Right) throw new DOMException('handedness for XRHandInput must be either "left" or "right"', "InvalidStateError");
            if (!e.poses.default || !e.poses.pinch) throw new DOMException('"default" and "pinch" hand pose configs are required', "InvalidStateError");
            const r = new le(i), s = new le(r), a = [
                e.profileId,
                ...e.fallbackProfileIds
            ], o = new oo;
            Object.values(Zi).forEach((c)=>{
                o.set(c, new lo(c, r));
            });
            const l = new ns(n, Fr.TrackedPointer, a, r, new so(f3), s, o);
            super(l), this[Jt] = {
                poseId: "default",
                poses: e.poses
            }, this.updateHandPose();
        }
        get poseId() {
            return this[Jt].poseId;
        }
        set poseId(e) {
            if (!this[Jt].poses[e]) {
                console.warn(`Pose config ${e} not found`);
                return;
            }
            this[Jt].poseId = e;
        }
        updateHandPose() {
            const e = this[Jt].poses[this[Jt].poseId], n = this[Jt].poses.pinch;
            Object.values(Zi).forEach((i)=>{
                const r = e.jointTransforms[i].offsetMatrix, s = n.jointTransforms[i].offsetMatrix, a = this.inputSource.hand.get(i);
                tc(a[he].offsetMatrix, r, s, this.pinchValue), this.inputSource.handedness === Fe.Right && m3(a[he].offsetMatrix), a[un].radius = (1 - this.pinchValue) * e.jointTransforms[i].radius + this.pinchValue * n.jointTransforms[i].radius;
            }), e.gripOffsetMatrix && n.gripOffsetMatrix && tc(this.inputSource.gripSpace[he].offsetMatrix, e.gripOffsetMatrix, n.gripOffsetMatrix, this.pinchValue);
        }
        get pinchValue() {
            return this[J].inputSource.gamepad[P].buttonsMap.pinch.value;
        }
        updatePinchValue(e) {
            if (e > 1 || e < 0) {
                console.warn(`Out-of-range value ${e} provided for pinch`);
                return;
            }
            const n = this[J].inputSource.gamepad[P].buttonsMap.pinch;
            n[P].pendingValue = e;
        }
        onFrameStart(e) {
            super.onFrameStart(e), this.updateHandPose();
        }
    }
    class Lu extends EventTarget {
    }
    const g3 = {
        antialias: !0,
        depth: !0,
        stencil: !1,
        alpha: !0,
        ignoreDepthValues: !1,
        framebufferScaleFactor: 1
    };
    class x3 extends Lu {
        constructor(e, n, i = {}){
            if (super(), e[m].ended) throw new DOMException("Session has ended", "InvalidStateError");
            const r = {
                ...g3,
                ...i
            };
            this[It] = {
                session: e,
                context: n,
                antialias: r.antialias
            };
        }
        get context() {
            return this[It].context;
        }
        get antialias() {
            return this[It].antialias;
        }
        get ignoreDepthValues() {
            return !0;
        }
        get framebuffer() {
            return null;
        }
        get framebufferWidth() {
            return this[It].context.drawingBufferWidth;
        }
        get framebufferHeight() {
            return this[It].context.drawingBufferHeight;
        }
        getViewport(e) {
            if (e[Nt].session !== this[It].session) throw new DOMException("View's session differs from Layer's session", "InvalidStateError");
            return this[It].session[m].device[b].getViewport(this, e);
        }
        static getNativeFramebufferScaleFactor(e) {
            if (!(e instanceof ao)) throw new TypeError("getNativeFramebufferScaleFactor must be passed a session.");
            return e[m].ended ? 0 : 1;
        }
    }
    class y3 {
        constructor(e, n, i){
            const { schema: r, frames: s } = n;
            if (!s || !r || s.length === 0) throw new DOMException("wrong recording format", "NotSupportedError");
            const a = new xn(xe.Viewer, e), o = {
                [Z.Left]: new le(a),
                [Z.Right]: new le(a),
                [Z.None]: new le(a)
            };
            this[D] = {
                refSpace: e,
                inputSources: new Map,
                inputSchemas: new Map,
                frames: s,
                recordedFramePointer: 0,
                startingTimeStamp: s[0][0],
                endingTimeStamp: s[s.length - 1][0],
                playbackTime: s[0][0],
                playing: !1,
                viewerSpace: a,
                viewSpaces: o,
                vec3: ye(),
                quat: tt()
            }, si(this[D].viewSpaces[Z.Left][he].offsetMatrix, He(-i / 2, 0, 0)), si(this[D].viewSpaces[Z.Right][he].offsetMatrix, He(i / 2, 0, 0)), r.forEach((l)=>{
                const c = l[0], u = l[1];
                let d;
                if (u.hasGamepad) {
                    const x = [];
                    for(let v = 0; v < u.numButtons; v++)x.push({
                        id: v.toString(),
                        type: "manual"
                    });
                    const y = [];
                    for(let v = 0; v < u.numAxes; v++)y.push({
                        id: v.toString(),
                        type: "manual"
                    });
                    d = new so({
                        mapping: u.mapping,
                        buttons: x,
                        axes: y
                    });
                }
                const f = new le(e);
                let g;
                u.hasHand && (g = new oo, Object.values(Zi).forEach((x)=>{
                    g.set(x, new lo(x, f));
                }));
                const p = new ns(u.handedness, u.targetRayMode, u.profiles, f, d, u.hasGrip ? new le(e) : void 0, u.hasHand ? g : void 0);
                this[D].inputSources.set(c, {
                    active: !1,
                    source: p
                }), this[D].inputSchemas.set(c, u);
            });
        }
        play() {
            this[D].recordedFramePointer = 0, this[D].playbackTime = this[D].startingTimeStamp, this[D].playing = !0, this[D].actualTimeStamp = performance.now();
        }
        stop() {
            this[D].playing = !1;
        }
        get playing() {
            return this[D].playing;
        }
        get viewerSpace() {
            return this[D].viewerSpace;
        }
        get viewSpaces() {
            return this[D].viewSpaces;
        }
        get inputSources() {
            return Array.from(this[D].inputSources.values()).filter((e)=>e.active).map((e)=>e.source);
        }
        playFrame() {
            const e = performance.now(), n = e - this[D].actualTimeStamp;
            if (this[D].actualTimeStamp = e, this[D].playbackTime += n, this[D].playbackTime > this[D].endingTimeStamp) {
                this.stop();
                return;
            }
            for(; this[D].frames[this[D].recordedFramePointer + 1][0] < this[D].playbackTime;)this[D].recordedFramePointer++;
            const i = this[D].frames[this[D].recordedFramePointer], r = this[D].frames[this[D].recordedFramePointer + 1], s = (this[D].playbackTime - i[0]) / (r[0] - i[0]);
            this.updateXRSpaceFromMergedFrames(this[D].viewerSpace, i.slice(1, 8), r.slice(1, 8), s);
            const a = new Map;
            for(let l = 8; l < i.length; l++){
                const { index: c, inputData: u } = this.processRawInputData(i[l]);
                a.set(c, u);
            }
            const o = new Map;
            for(let l = 8; l < r.length; l++){
                const { index: c, inputData: u } = this.processRawInputData(r[l]);
                o.set(c, u);
            }
            this[D].inputSources.forEach((l)=>{
                l.active = !1;
            }), o.forEach((l, c)=>{
                this[D].inputSources.get(c).active = !0;
                const u = this[D].inputSources.get(c).source, d = this[D].inputSchemas.get(c);
                this.updateInputSource(u, d, a.has(c) ? a.get(c) : l, l, s);
            });
        }
        updateInputSource(e, n, i, r, s) {
            if (this.updateXRSpaceFromMergedFrames(e.targetRaySpace, i.targetRayTransform, r.targetRayTransform, s), n.hasGrip && this.updateXRSpaceFromMergedFrames(e.gripSpace, i.gripTransform, r.gripTransform, s), n.hasHand) for(let a = 0; a < 25; a++){
                const o = i.handTransforms.slice(a * 8, a * 8 + 7), l = r.handTransforms.slice(a * 8, a * 8 + 7), c = i.handTransforms[a * 8 + 7], u = r.handTransforms[a * 8 + 7], d = e.hand.get(n.jointSequence[a]);
                this.updateXRSpaceFromMergedFrames(d, o, l, s), d[un].radius = (u - c) * s + c;
            }
            if (n.hasGamepad) {
                const a = e.gamepad;
                r.buttons.forEach((o, l)=>{
                    const c = a.buttons[l];
                    c[P].pressed = o[0] === 1, c[P].touched = o[1] === 1;
                    const u = i.buttons[l][2], d = o[2];
                    c[P].value = (d - u) * s + u;
                }), r.axes.forEach((o, l)=>{
                    const c = i.axes[l];
                    a[P].axesMap[l.toString()].x = (o - c) * s + c;
                });
            }
        }
        updateXRSpaceFromMergedFrames(e, n, i, r) {
            const s = He(n[0], n[1], n[2]), a = Nr(n[3], n[4], n[5], n[6]), o = He(i[0], i[1], i[2]), l = Nr(i[3], i[4], i[5], i[6]);
            xa(this[D].vec3, s, o, r), Di(this[D].quat, a, l, r), nr(e[he].offsetMatrix, this[D].quat, this[D].vec3);
        }
        processRawInputData(e) {
            const n = e[0], i = this[D].inputSchemas.get(n), s = {
                targetRayTransform: e.slice(1, 8)
            };
            let a = 8;
            if (i.hasGrip && (s.gripTransform = e[a++]), i.hasHand && (s.handTransforms = e[a++]), i.hasGamepad) {
                const o = e[a];
                s.buttons = o.slice(0, i.numButtons), s.axes = o.slice(i.numButtons);
            }
            return {
                index: n,
                inputData: s
            };
        }
    }
    const ic = "2.2.1";
    class rc extends Event {
        constructor(e, n){
            if (super(e, n), !n.referenceSpace) throw new Error("XRReferenceSpaceEventInit.referenceSpace is required");
            this.referenceSpace = n.referenceSpace, this.transform = n.transform;
        }
    }
    class sc extends EventTarget {
        constructor(e){
            super(), this[$e] = {
                device: e,
                grantSession: ({ resolve: n, reject: i, mode: r, options: s })=>{
                    if (this[$e].activeSession) {
                        i(new DOMException("An active XRSession already exists.", "InvalidStateError"));
                        return;
                    }
                    const { requiredFeatures: a = [], optionalFeatures: o = [] } = s, { supportedFeatures: l } = this[$e].device;
                    if (!a.every((g)=>l.includes(g))) {
                        i(new Error("One or more required features are not supported by the device."));
                        return;
                    }
                    const u = o.filter((g)=>l.includes(g)), d = Array.from(new Set([
                        ...a,
                        ...u,
                        "viewer",
                        "local"
                    ])), f = new ao(this[$e].device, r, d);
                    this[$e].activeSession = f, f.addEventListener("end", ()=>{
                        this[$e].activeSession = void 0;
                    }), n(f);
                }
            };
        }
        isSessionSupported(e) {
            return new Promise((n, i)=>{
                n(e === "inline" ? !0 : this[$e].device.supportedSessionModes.includes(e));
            });
        }
        requestSession(e, n = {}) {
            return new Promise((i, r)=>{
                this.isSessionSupported(e).then((s)=>{
                    if (!s) {
                        r(new DOMException("The requested XRSession mode is not supported.", "NotSupportedError"));
                        return;
                    }
                    const a = {
                        resolve: i,
                        reject: r,
                        mode: e,
                        options: n
                    };
                    this[$e].grantSession(a);
                }).catch(r);
            });
        }
        offerSession(e, n = {}) {
            return new Promise((i, r)=>{
                this.isSessionSupported(e).then((s)=>{
                    if (!s) {
                        r(new DOMException("The requested XRSession mode is not supported.", "NotSupportedError"));
                        return;
                    }
                    this[$e].offeredSessionConfig = {
                        resolve: i,
                        reject: r,
                        mode: e,
                        options: n
                    };
                }).catch(r);
            });
        }
    }
    class pr {
        constructor(e, n, i, r){
            this[Mi] = {
                x: e,
                y: n,
                width: i,
                height: r
            };
        }
        get x() {
            return this[Mi].x;
        }
        get y() {
            return this[Mi].y;
        }
        get width() {
            return this[Mi].width;
        }
        get height() {
            return this[Mi].height;
        }
    }
    var V;
    (function(t) {
        t.texture = "texture", t["texture-array"] = "texture-array";
    })(V || (V = {}));
    var O;
    (function(t) {
        t.default = "default", t.mono = "mono", t.stereo = "stereo", t["stereo-left-right"] = "stereo-left-right", t["stereo-top-bottom"] = "stereo-top-bottom";
    })(O || (O = {}));
    const Qi = (t)=>t && typeof t.getOffsetReferenceSpace == "function", oi = ()=>typeof global < "u" ? global : typeof self < "u" ? self : typeof window < "u" ? window : {}, ba = (t, e)=>{
        switch(e){
            case t.RGBA8:
            case t.RGB5_A1:
            case t.RGBA4:
            case t.SRGB8_ALPHA8:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA,
                    type: t.UNSIGNED_BYTE
                };
            case t.RGBA8_SNORM:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA,
                    type: t.BYTE
                };
            case t.RGB10_A2:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA,
                    type: t.UNSIGNED_INT_2_10_10_10_REV
                };
            case t.RGBA16F:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA,
                    type: t.HALF_FLOAT
                };
            case t.RGBA32F:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA,
                    type: t.FLOAT
                };
            case t.RGBA8UI:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA_INTEGER,
                    type: t.UNSIGNED_BYTE
                };
            case t.RGBA8I:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA_INTEGER,
                    type: t.BYTE
                };
            case t.RGBA16UI:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA_INTEGER,
                    type: t.UNSIGNED_SHORT
                };
            case t.RGBA16I:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA_INTEGER,
                    type: t.SHORT
                };
            case t.RGBA32UI:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA_INTEGER,
                    type: t.UNSIGNED_INT
                };
            case t.RGBA32I:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA_INTEGER,
                    type: t.INT
                };
            case t.RGB10_A2UI:
                return {
                    internalFormat: e,
                    textureFormat: t.RGBA_INTEGER,
                    type: t.UNSIGNED_INT_2_10_10_10_REV
                };
            case t.RGB8:
            case t.RGB565:
            case t.SRGB8:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB,
                    type: t.UNSIGNED_BYTE
                };
            case t.RGB8_SNORM:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB,
                    type: t.BYTE
                };
            case t.RGB16F:
            case t.R11F_G11F_B10F:
            case t.RGB9_E5:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB,
                    type: t.HALF_FLOAT
                };
            case t.RGB32F:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB,
                    type: t.FLOAT
                };
            case t.RGB8UI:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB_INTEGER,
                    type: t.UNSIGNED_BYTE
                };
            case t.RGB8I:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB_INTEGER,
                    type: t.BYTE
                };
            case t.RGB16UI:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB_INTEGER,
                    type: t.UNSIGNED_SHORT
                };
            case t.RGB16I:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB_INTEGER,
                    type: t.SHORT
                };
            case t.RGB32UI:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB_INTEGER,
                    type: t.UNSIGNED_INT
                };
            case t.RGB32I:
                return {
                    internalFormat: e,
                    textureFormat: t.RGB_INTEGER,
                    type: t.INT
                };
            case t.DEPTH_COMPONENT16:
                return {
                    internalFormat: e,
                    textureFormat: t.DEPTH_COMPONENT,
                    type: t.UNSIGNED_SHORT
                };
            case t.DEPTH_COMPONENT24:
                return {
                    internalFormat: e,
                    textureFormat: t.DEPTH_COMPONENT,
                    type: t.UNSIGNED_INT
                };
            case t.DEPTH_COMPONENT32F:
                return {
                    internalFormat: e,
                    textureFormat: t.DEPTH_COMPONENT,
                    type: t.FLOAT
                };
            case t.DEPTH24_STENCIL8:
                return {
                    internalFormat: e,
                    textureFormat: t.DEPTH_STENCIL,
                    type: t.UNSIGNED_INT_24_8
                };
            case t.DEPTH32F_STENCIL8:
                return {
                    internalFormat: e,
                    textureFormat: t.DEPTH_STENCIL,
                    type: t.FLOAT_32_UNSIGNED_INT_24_8_REV
                };
            case t.DEPTH_COMPONENT:
                return ba(t, t.DEPTH_COMPONENT24);
            case t.DEPTH_STENCIL:
                return ba(t, t.DEPTH24_STENCIL8);
            case t.RGBA:
            case t.RGB:
            case t.LUMINANCE_ALPHA:
            case t.LUMINANCE:
            case t.ALPHA:
                return {
                    internalFormat: e,
                    textureFormat: e,
                    type: t.UNSIGNED_BYTE
                };
            default:
                throw new Error("Attempted to create polyfill with unsupported format.");
        }
    };
    class di {
        constructor(){
            this._hasRunDeferredInitialize = !1, this._media = null;
        }
        initialize(e, n) {
            this.session = e, n && (this.context = n), this.blendTextureSourceAlpha = !0;
        }
        destroy() {
            this._colorTextures = [], this._depthStencilTextures = [];
        }
        addEventListener(e, n, i) {}
        dispatchEvent(e) {
            return !1;
        }
        removeEventListener(e, n, i) {}
        getContext() {
            return this.context;
        }
        getTextureType() {
            throw new Error("Unimplemented");
        }
        get colorTextures() {
            return this._colorTextures;
        }
        get depthStencilTextures() {
            return this._depthStencilTextures;
        }
        get colorTexturesMeta() {
            return this._texturesMeta;
        }
        get media() {
            return this.isMediaLayer() || console.warn("Attempted to retrieve media from a non-media layer"), this._media;
        }
        determineLayoutAttribute(e, n, i) {
            if (!(n instanceof WebGL2RenderingContext) && e === V["texture-array"]) throw new TypeError;
            if (i === O.mono) return i;
            if (i === O.default) {
                if (this.session.internalViews && this.session.internalViews.length === 1) return O.mono;
                if (e === V["texture-array"]) return i;
            }
            return i === O.default || i === O.stereo ? O["stereo-left-right"] : i;
        }
        isMediaLayer() {
            return this._media !== null;
        }
        _deferredInitialize() {}
        initializeIfNeeded() {
            this._hasRunDeferredInitialize || (this._hasRunDeferredInitialize = !0, this._deferredInitialize());
        }
        _allocateColorTexturesInternal(e, n) {
            let r = this.session.internalViews;
            if (!r || r.length === 0) {
                console.warn("We can't allocate color textures without views");
                return;
            }
            if (this.initializeIfNeeded(), this.layout === O.mono) if (e === V["texture-array"]) {
                const s = this._createNewColorTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.colorFormat);
                this._texturesMeta = [
                    s
                ], this._colorTextures = [
                    s.texture
                ];
                return;
            } else {
                const s = this._createNewColorTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.colorFormat);
                this._texturesMeta = [
                    s
                ], this._colorTextures = [
                    s.texture
                ];
                return;
            }
            else if (this.layout === O.stereo) if (e === V["texture-array"]) {
                const s = this._createNewColorTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.colorFormat, 2);
                this._texturesMeta = [
                    s
                ], this._colorTextures = [
                    s.texture
                ];
                return;
            } else {
                const s = this._createNewColorTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.colorFormat), a = this._createNewColorTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.colorFormat);
                this._texturesMeta = [
                    s,
                    a
                ], this._colorTextures = [
                    s.texture,
                    a.texture
                ];
                return;
            }
            else if (this.layout === O["stereo-left-right"]) {
                const s = this._createNewColorTexture(n.viewPixelWidth * 2, n.viewPixelHeight, e, n.colorFormat);
                this._texturesMeta = [
                    s
                ], this._colorTextures = [
                    s.texture
                ];
                return;
            } else if (this.layout === O["stereo-top-bottom"]) {
                const s = this._createNewColorTexture(n.viewPixelWidth, n.viewPixelHeight * 2, e, n.colorFormat);
                this._texturesMeta = [
                    s
                ], this._colorTextures = [
                    s.texture
                ];
                return;
            }
        }
        _allocateDepthStencilTexturesInternal(e, n) {
            if (!n.depthFormat) {
                this._depthStencilTextures = [];
                return;
            }
            if (this._getSupportedDepthFormats().indexOf(n.depthFormat) < 0) throw new Error("Depth format provided is not supported in non-projection layers.");
            if (n.mipLevels < 1) throw new Error("Invalid miplevel. Miplevel needs to be >= 1");
            if (this.layout === O.mono) if (e === V["texture-array"]) {
                const i = this._createNewDepthStencilTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.depthFormat);
                this._depthStencilTextures = [
                    i.texture
                ];
                return;
            } else {
                const i = this._createNewColorTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.depthFormat);
                this._depthStencilTextures = [
                    i.texture
                ];
                return;
            }
            else if (this.layout === O.stereo) if (e === V["texture-array"]) {
                const i = this._createNewDepthStencilTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.depthFormat, 2);
                this._depthStencilTextures = [
                    i.texture
                ];
                return;
            } else {
                const i = this._createNewDepthStencilTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.depthFormat), r = this._createNewDepthStencilTexture(n.viewPixelWidth, n.viewPixelHeight, e, n.depthFormat);
                this._depthStencilTextures = [
                    i.texture,
                    r.texture
                ];
                return;
            }
            else if (this.layout === O["stereo-left-right"]) {
                const i = this._createNewDepthStencilTexture(n.viewPixelWidth * 2, n.viewPixelHeight, e, n.depthFormat);
                this._depthStencilTextures = [
                    i.texture
                ];
                return;
            } else if (this.layout === O["stereo-top-bottom"]) {
                const i = this._createNewDepthStencilTexture(n.viewPixelWidth, n.viewPixelHeight * 2, e, n.depthFormat);
                this._depthStencilTextures = [
                    i.texture
                ];
                return;
            }
        }
        _createNewColorTexture(e, n, i, r, s = 1) {
            return this._createGenericPolyfillTexture(i, e, n, r, 0, s);
        }
        _createNewDepthStencilTexture(e, n, i, r, s = 1) {
            return this._createGenericPolyfillTexture(i, e, n, r, 0, s);
        }
        _createGenericPolyfillTexture(e, n, i, r, s = 0, a = 1) {
            if (e === V["texture-array"] && a <= 1 && console.warn("creating a texture array with a single layer..."), e === V["texture-array"] && this.context instanceof WebGLRenderingContext) throw new Error("WebGL 1 does not support texture array");
            let o = this.context.createTexture(), l = {
                width: n,
                height: i,
                layers: a,
                type: e,
                textureFormat: r,
                texture: o
            }, c = r, u = this.context.UNSIGNED_BYTE;
            if (this.context instanceof WebGL2RenderingContext) {
                const d = ba(this.context, r);
                c = d.internalFormat, r = d.textureFormat, u = d.type;
            } else r === this.context.DEPTH_COMPONENT && (u = this.context.UNSIGNED_INT), r === this.context.DEPTH_STENCIL && (u = this.context.UNSIGNED_INT_24_8_WEBGL);
            if (e === V["texture-array"] && this.context instanceof WebGL2RenderingContext) {
                console.warn("texture-array layers are supported...questionably in the polyfill at the moment. Use at your own risk.");
                const d = this.context.getParameter(this.context.TEXTURE_BINDING_2D_ARRAY);
                this.context.bindTexture(this.context.TEXTURE_2D_ARRAY, o), this._getSupportedDepthFormats().indexOf(r) >= 0 ? this.context.texStorage3D(this.context.TEXTURE_2D_ARRAY, 1, c, n, i, a) : this.context.texImage3D(this.context.TEXTURE_2D_ARRAY, 0, c, n, i, a, 0, r, u, null), this.context.bindTexture(this.context.TEXTURE_2D_ARRAY, d);
            } else {
                const d = this.context.getParameter(this.context.TEXTURE_BINDING_2D);
                this.context.bindTexture(this.context.TEXTURE_2D, o), this.context.texImage2D(this.context.TEXTURE_2D, 0, c, n, i, 0, r, u, null), this.context.bindTexture(this.context.TEXTURE_2D, d);
            }
            return l;
        }
        _getSupportedDepthFormats() {
            const e = [];
            return this.context instanceof WebGLRenderingContext && !this.context.getExtension("WEBGL_depth_texture") || (e.push(this.context.DEPTH_COMPONENT, this.context.DEPTH_STENCIL), this.context instanceof WebGL2RenderingContext && e.push(this.context.DEPTH_COMPONENT24, this.context.DEPTH24_STENCIL8)), e;
        }
    }
    const Cu = {
        colorFormat: 6408,
        mipLevels: 1,
        layout: O.mono,
        isStatic: !1,
        space: null,
        viewPixelHeight: 0,
        viewPixelWidth: 0,
        textureType: V.texture,
        radius: 2,
        centralAngle: .78539,
        aspectRatio: 2
    }, v3 = {
        layout: O.mono,
        invertStereo: !1,
        space: null,
        radius: 2,
        centralAngle: .78539
    };
    class co extends di {
        constructor(e, n){
            super(), this._media = n ?? null, this.isMediaLayer() ? this.init = Object.assign(Object.assign({}, v3), e) : this.init = Object.assign(Object.assign({}, Cu), e), this.radius = this.init.radius, this.centralAngle = this.init.centralAngle, this.aspectRatio = this.init.aspectRatio, this.space = this.init.space, this.layout = this.init.layout;
            const i = oi();
            this.init.transform ? this.transform = new i.XRRigidTransform(e.transform.position, e.transform.orientation) : this.transform = new i.XRRigidTransform({
                x: 0,
                y: 0,
                z: 0,
                w: 1
            }), this.isMediaLayer() || (this.isStatic = e.isStatic);
        }
        getTextureType() {
            return this.isMediaLayer() ? V.texture : this.init.textureType;
        }
        _deferredInitialize() {
            let e = this.determineLayoutAttribute(this.init.textureType, this.context, this.init.layout);
            this.layout = e, this.needsRedraw = !0;
        }
        get colorTextures() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._colorTextures || !this._colorTextures.length) && this._allocateColorTexturesInternal(this.getTextureType(), this.init), this._colorTextures;
        }
        get depthStencilTextures() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._depthStencilTextures || !this._depthStencilTextures.length) && this._allocateDepthStencilTexturesInternal(this.getTextureType(), this.init), this._depthStencilTextures;
        }
        get colorTexturesMeta() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._colorTextures || !this._colorTextures.length) && this._allocateColorTexturesInternal(this.getTextureType(), this.init), this._texturesMeta;
        }
        get width() {
            const e = 2 * this.radius * Math.PI, n = this.centralAngle / (2 * Math.PI);
            return e * n;
        }
        get height() {
            return this.width / this.aspectRatio;
        }
    }
    const Nu = {
        colorFormat: 6408,
        mipLevels: 1,
        layout: O.mono,
        isStatic: !1,
        space: null,
        viewPixelHeight: 0,
        viewPixelWidth: 0,
        textureType: V.texture,
        radius: 0,
        centralHorizontalAngle: 6.28318,
        upperVerticalAngle: 1.570795,
        lowerVerticalAngle: -1.570795
    }, w3 = {
        space: null,
        layout: O.mono,
        invertStereo: !1,
        radius: 0,
        centralHorizontalAngle: 6.28318,
        upperVerticalAngle: 1.570795,
        lowerVerticalAngle: -1.570795
    };
    class uo extends di {
        constructor(e, n){
            if (super(), this._media = n ?? null, this.isMediaLayer() ? this.init = Object.assign(Object.assign({}, w3), e) : this.init = Object.assign(Object.assign({}, Nu), e), !Qi(this.init.space)) throw new TypeError("Equirect layer's space needs to be an XRReferenceSpace");
            this.radius = this.init.radius, this.centralHorizontalAngle = this.init.centralHorizontalAngle, this.upperVerticalAngle = this.init.upperVerticalAngle, this.lowerVerticalAngle = this.init.lowerVerticalAngle, this.space = this.init.space, this.layout = this.init.layout;
            const i = oi();
            e.transform ? this.transform = new i.XRRigidTransform(e.transform.position, e.transform.orientation) : this.transform = new i.XRRigidTransform({
                x: 0,
                y: 0,
                z: 0,
                w: 1
            }), this.isMediaLayer() || (this.isStatic = e.isStatic);
        }
        getTextureType() {
            return this.isMediaLayer() ? V.texture : this.init.textureType;
        }
        _deferredInitialize() {
            let e = this.determineLayoutAttribute(this.init.textureType, this.context, this.init.layout);
            this.layout = e, this.needsRedraw = !0;
        }
        get colorTextures() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._colorTextures || !this._colorTextures.length) && this._allocateColorTexturesInternal(this.getTextureType(), this.init), this._colorTextures;
        }
        get depthStencilTextures() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._depthStencilTextures || !this._depthStencilTextures.length) && this._allocateDepthStencilTexturesInternal(this.getTextureType(), this.init), this._depthStencilTextures;
        }
        get colorTexturesMeta() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._colorTextures || !this._colorTextures.length) && this._allocateColorTexturesInternal(this.getTextureType(), this.init), this._texturesMeta;
        }
    }
    const Fu = {
        colorFormat: 6408,
        mipLevels: 1,
        layout: O.mono,
        isStatic: !1,
        space: null,
        viewPixelHeight: 0,
        viewPixelWidth: 0,
        textureType: V.texture,
        width: 1,
        height: 1
    }, b3 = {
        space: null,
        layout: O.mono,
        invertStereo: !1
    };
    class ho extends di {
        constructor(e, n){
            super(), this._media = n ?? null, this.isMediaLayer() ? this.init = Object.assign(Object.assign({}, b3), e) : this.init = Object.assign(Object.assign({}, Fu), e), this.width = this.init.width, this.height = this.init.height, this.space = this.init.space, this.layout = this.init.layout;
            const i = oi();
            this.init.transform ? this.transform = new i.XRRigidTransform(e.transform.position, e.transform.orientation) : this.transform = new i.XRRigidTransform({
                x: 0,
                y: 0,
                z: 0,
                w: 1
            }), this.isMediaLayer() || (this.isStatic = e.isStatic);
        }
        getTextureType() {
            return this.isMediaLayer() ? V.texture : this.init.textureType;
        }
        _deferredInitialize() {
            let e = this.determineLayoutAttribute(this.init.textureType, this.context, this.init.layout);
            this.layout = e, this.needsRedraw = !0;
        }
        get colorTextures() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._colorTextures || !this._colorTextures.length) && this._allocateColorTexturesInternal(this.getTextureType(), this.init), this._colorTextures;
        }
        get depthStencilTextures() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._depthStencilTextures || !this._depthStencilTextures.length) && this._allocateDepthStencilTexturesInternal(this.getTextureType(), this.init), this._depthStencilTextures;
        }
        get colorTexturesMeta() {
            if (this.isMediaLayer()) throw new Error("Media layers do not have associated textures");
            return (!this._colorTextures || !this._colorTextures.length) && this._allocateColorTexturesInternal(this.getTextureType(), this.init), this._texturesMeta;
        }
    }
    class T3 {
        constructor(e){
            if (this.session = e, this.session.ended) throw new Error("Session has ended");
        }
        createQuadLayer(e, n) {
            if (this.session.ended) throw new Error("Session has ended");
            if (n.layout === O.default) throw new TypeError("Media Quad layer cannot be created with layout of default");
            let i = this.calculateAspectRatio(e, n.layout);
            n.width === void 0 && n.height === void 0 && (n.width = 1), n.height === void 0 && (n.height = n.width / i), n.width === void 0 && (n.width = n.height / i);
            let r = new ho(n, e);
            return r.needsRedraw = !1, r.initialize(this.session), r;
        }
        createCylinderLayer(e, n) {
            if (this.session.ended) throw new Error("Session has ended");
            if (n.layout === O.default) throw new TypeError("Media Cylinder layer cannot be created with layout of default");
            let i = this.calculateAspectRatio(e, n.layout);
            n.aspectRatio === void 0 && (n.aspectRatio = i);
            let r = new co(n, e);
            return r.needsRedraw = !1, r.initialize(this.session), r;
        }
        createEquirectLayer(e, n) {
            if (this.session.ended) throw new Error("Session has ended");
            if (n.layout === O.default) throw new TypeError("Media Equirect layer cannot be created with layout of default");
            if (!Qi(n.space)) throw new Error("Media Equirect layer's space must be of type XRReferenceSpace");
            let i = new uo(n, e);
            return i.needsRedraw = !1, i.initialize(this.session), i;
        }
        calculateAspectRatio(e, n) {
            let i = e.videoWidth, r = e.videoHeight;
            return n === O["stereo-left-right"] && (i /= 2), n === O["stereo-top-bottom"] && (r /= 2), i / r;
        }
    }
    const Ta = {
        textureType: V.texture,
        colorFormat: 6408,
        depthFormat: 6402,
        scaleFactor: 1
    };
    class Dr extends di {
        constructor(e = Ta){
            super(), this.init = Object.assign(Object.assign({}, Ta), e);
        }
        initialize(e, n) {
            super.initialize(e, n), this.initializeIfNeeded();
            let i = e.getBaseLayer();
            this.textureWidth = i.framebufferWidth * this.init.scaleFactor, this.textureHeight = i.framebufferHeight * this.init.scaleFactor;
        }
        _allocateProjectionColorTextures() {
            let e = [], n = [];
            const i = ()=>{
                e = [];
                for (let u of n)e.push(u.texture);
            };
            let r = this.session, s = r.internalViews;
            if (!s || s.length === 0) {
                console.warn("We can't allocate color textures without views");
                return;
            }
            let a = r.getBaseLayer(), o = s.length, l = a.framebufferWidth * this.init.scaleFactor / s.length, c = a.framebufferHeight * this.init.scaleFactor;
            if (this.layout === O.mono || this.layout === O.default) {
                if (this.init.textureType === V["texture-array"]) n = [
                    this._createNewColorTexture(l, c, V["texture-array"], this.init.colorFormat, o)
                ];
                else for (let u of s){
                    let d = this._createNewColorTexture(l, c, V.texture, this.init.colorFormat);
                    n.push(d);
                }
                i(), this._colorTexturesMeta = n, this._colorTextures = e;
                return;
            }
            this.layout === O["stereo-left-right"] ? n = [
                this._createNewColorTexture(l * o, c, this.init.textureType, this.init.colorFormat)
            ] : this.layout === O["stereo-top-bottom"] && (n = [
                this._createNewColorTexture(l, c * o, this.init.textureType, this.init.colorFormat)
            ]), i(), this._colorTexturesMeta = n, this._colorTextures = e;
        }
        _allocateProjectionDepthStencilTextures() {
            let e = this.session, n = e.internalViews;
            if (!n || n.length === 0) return;
            if (this.init.depthFormat === 0) {
                this._depthStencilTextures = [];
                return;
            }
            if (this.context instanceof WebGLRenderingContext && !this.context.getExtension("WEBGL_depth_texture")) {
                this._depthStencilTextures = [];
                return;
            }
            let i = [], r = [];
            const s = ()=>{
                i = [];
                for (let u of r)i.push(u.texture);
            };
            this.initializeIfNeeded();
            let a = e.getBaseLayer(), o = n.length, l = a.framebufferWidth * this.init.scaleFactor / n.length, c = a.framebufferHeight * this.init.scaleFactor;
            if (this.layout === O.mono || this.layout === O.default) {
                if (this.init.textureType === V["texture-array"]) r = [
                    this._createNewDepthStencilTexture(l, c, this.init.textureType, this.init.depthFormat, o)
                ];
                else for (let u of n){
                    let d = this._createNewDepthStencilTexture(l, c, this.init.textureType, this.init.depthFormat);
                    r.push(d);
                }
                s(), this._depthStencilTextures = i;
                return;
            }
            this.layout === O["stereo-left-right"] ? r = [
                this._createNewDepthStencilTexture(l * o, c, this.init.textureType, this.init.depthFormat)
            ] : this.layout === O["stereo-top-bottom"] && (r = [
                this._createNewDepthStencilTexture(l, c * o, this.init.textureType, this.init.depthFormat)
            ]), s(), this._depthStencilTextures = i;
        }
        get colorTextures() {
            return (!this._colorTextures || !this._colorTextures.length) && this._allocateProjectionColorTextures(), this._colorTextures;
        }
        get depthStencilTextures() {
            return this._depthStencilTextures === void 0 && this._allocateProjectionDepthStencilTextures(), this._depthStencilTextures || [];
        }
        get colorTexturesMeta() {
            return (!this._colorTextures || !this._colorTextures.length) && this._allocateProjectionColorTextures(), this._colorTexturesMeta;
        }
        getTextureType() {
            return this.init.textureType;
        }
        _deferredInitialize() {
            this.isStatic = !1, this.ignoreDepthValues = !1, this.fixedFoveation = 0;
            let e = this.determineLayoutAttribute(this.init.textureType, this.context, O.default);
            this.layout = e, this.needsRedraw = !0;
            let n = this.determineMaximumScaleFactor(), i = Math.min(this.init.scaleFactor, n);
            this.init.scaleFactor = i;
        }
        determineMaximumScaleFactor() {
            let e = this.session.getBaseLayer(this.context), n = e.framebufferWidth, i = e.framebufferHeight;
            this.layout === O["stereo-left-right"] && (n *= 2), this.layout === O["stereo-top-bottom"] && (i *= 2);
            let r = Math.max(n, i);
            return this.context.getParameter(this.context.MAX_TEXTURE_SIZE) / r;
        }
    }
    const Bt = (t, e, n, i, r)=>{
        let s = 0, a = 0, o = e.width, l = e.height;
        n === O["stereo-left-right"] ? (s = e.width * i / r, o = e.width / r) : n === O["stereo-top-bottom"] && (a = e.height * i / r, l = e.height / r), t.x = s, t.y = a, t.width = o, t.height = l;
    }, ac = (t, e, n)=>{
        var i = t.createShader(n);
        t.shaderSource(i, e), t.compileShader(i);
        var r = t.getShaderParameter(i, t.COMPILE_STATUS);
        if (!r) throw "could not compile shader:" + t.getShaderInfoLog(i);
        return i;
    }, Ki = (t, e, n)=>{
        const i = t.createProgram(), r = ac(t, e, t.VERTEX_SHADER), s = ac(t, n, t.FRAGMENT_SHADER);
        t.attachShader(i, r), t.attachShader(i, s), t.deleteShader(r), t.deleteShader(s), t.linkProgram(i);
        var a = t.getProgramParameter(i, t.LINK_STATUS);
        if (!a) throw "program failed to link:" + t.getProgramInfoLog(i);
        return i;
    }, E3 = (t, e, n, i, r)=>{
        var s = e, a = e + i, o = n, l = n + r;
        t.bufferData(t.ARRAY_BUFFER, new Float32Array([
            s,
            o,
            a,
            o,
            s,
            l,
            s,
            l,
            a,
            o,
            a,
            l
        ]), t.DYNAMIC_DRAW);
    }, fo = (t)=>{
        if (t instanceof WebGL2RenderingContext) return t;
        const e = t.getExtension("OES_vertex_array_object");
        if (!e) throw new Error("Cannot use VAOs.");
        return {
            VERTEX_ARRAY_BINDING: e.VERTEX_ARRAY_BINDING_OES,
            bindVertexArray: e.bindVertexArrayOES.bind(e),
            createVertexArray: e.createVertexArrayOES.bind(e),
            deleteVertexArray: e.deleteVertexArrayOES.bind(e),
            isVertexArray: e.isVertexArrayOES.bind(e)
        };
    }, rs = (t)=>t, _3 = rs`
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
   // convert the rectangle from pixels to 0.0 to 1.0
   vec2 zeroToOne = a_position;

   // convert from 0->1 to 0->2
   vec2 zeroToTwo = zeroToOne * 2.0;

   // convert from 0->2 to -1->+1 (clipspace)
   vec2 clipSpace = zeroToTwo - 1.0;

   gl_Position = vec4(clipSpace * vec2(1, 1), 0, 1);

   // pass the texCoord to the fragment shader
   // The GPU will interpolate this value between points.
   v_texCoord = a_texCoord;
}
`, S3 = rs`
precision mediump float;

// our texture
uniform sampler2D u_image;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
   	vec4 tex = texture2D(u_image, v_texCoord);
	gl_FragColor = vec4(tex.rgb, tex.a);
}
`;
    class zu {
        constructor(e, n){
            this.gl = n, this.layer = e, this.program = Ki(this.gl, _3, S3), this.programInfo = {
                attribLocations: {
                    a_position: this.gl.getAttribLocation(this.program, "a_position"),
                    a_texCoord: this.gl.getAttribLocation(this.program, "a_texCoord")
                }
            }, this._createVAOs();
        }
        render(e) {
            let n = this.gl, i = e.getBaseLayer();
            n.viewport(0, 0, i.framebufferWidth, i.framebufferHeight);
            const r = this.layer.getTextureType(), s = n.getParameter(n.TEXTURE_BINDING_2D), a = n.getParameter(n.ACTIVE_TEXTURE);
            if (r === V.texture) n.activeTexture(n.TEXTURE0), n.bindTexture(n.TEXTURE_2D, this.layer.colorTextures[0]), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_S, n.CLAMP_TO_EDGE), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_WRAP_T, n.CLAMP_TO_EDGE), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MIN_FILTER, n.NEAREST), n.texParameteri(n.TEXTURE_2D, n.TEXTURE_MAG_FILTER, n.NEAREST);
            else throw new Error(`Created a texture projection renderer instead of a texture-array projection renderer for a texture-array layer.
This is probably an error with the polyfill itself; please file an issue on Github if you run into this.`);
            for (let o of e.internalViews){
                let l = i.getViewport(o);
                n.viewport(l.x, l.y, l.width, l.height), this._shouldUseStereoTexturePoints() ? this._renderInternalStereo(o) : this._renderInternal();
            }
            n.activeTexture(a), n.bindTexture(n.TEXTURE_2D, s);
        }
        _renderInternal() {
            let e = this.gl;
            const n = e.getParameter(e.CURRENT_PROGRAM);
            e.useProgram(this.program), this.vaoGl.bindVertexArray(this.vao);
            var i = e.TRIANGLES, r = 0, s = 6;
            e.drawArrays(i, r, s), this.vaoGl.bindVertexArray(null), e.useProgram(n);
        }
        _renderInternalStereo(e) {
            if (e.eye === "none") return this._renderInternal();
            let n = this.gl;
            this.vaoGl.bindVertexArray(this.vao);
            const i = n.getParameter(n.CURRENT_PROGRAM);
            n.useProgram(this.program), this._setStereoTextureBuffer(e.eye === "right" ? 1 : 0);
            var r = n.TRIANGLES, s = 0, a = 6;
            n.drawArrays(r, s, a), this.vaoGl.bindVertexArray(null), n.useProgram(i);
        }
        _createVAOs() {
            this._createTextureUVs();
            let e = this.gl;
            this.vaoGl = fo(e);
            let n = e.createBuffer();
            this.vao = this.vaoGl.createVertexArray(), this.vaoGl.bindVertexArray(this.vao), e.enableVertexAttribArray(this.programInfo.attribLocations.a_position), e.bindBuffer(e.ARRAY_BUFFER, n), E3(e, 0, 0, 1, 1);
            let i = 2, r = e.FLOAT, s = !1, a = 0, o = 0;
            e.vertexAttribPointer(this.programInfo.attribLocations.a_position, i, r, s, a, o), this.texcoordBuffer = e.createBuffer(), e.enableVertexAttribArray(this.programInfo.attribLocations.a_texCoord), e.bindBuffer(e.ARRAY_BUFFER, this.texcoordBuffer), e.bufferData(e.ARRAY_BUFFER, this.texturePoints, e.DYNAMIC_DRAW), e.vertexAttribPointer(this.programInfo.attribLocations.a_texCoord, i, r, s, a, o), this.vaoGl.bindVertexArray(null), e.bindBuffer(e.ARRAY_BUFFER, null);
        }
        _setStereoTextureBuffer(e) {
            let n = this.gl;
            n.enableVertexAttribArray(this.programInfo.attribLocations.a_texCoord), n.bindBuffer(n.ARRAY_BUFFER, this.texcoordBuffer), n.bufferData(n.ARRAY_BUFFER, this.stereoTexturePoints[e], n.STATIC_DRAW);
            var i = 2, r = n.FLOAT, s = !1, a = 0, o = 0;
            n.vertexAttribPointer(this.programInfo.attribLocations.a_texCoord, i, r, s, a, o), n.bindBuffer(n.ARRAY_BUFFER, null);
        }
        _createTextureUVs() {
            this.texturePoints = new Float32Array([
                0,
                0,
                1,
                0,
                0,
                1,
                0,
                1,
                1,
                0,
                1,
                1
            ]);
            const e = {
                x: 0,
                y: 0,
                width: 1,
                height: 1
            };
            this._shouldUseStereoTexturePoints() && (this.stereoTexturePoints = [], Bt(e, this.layer.colorTexturesMeta[0], this.layer.layout, 0, 2), this.stereoTexturePoints[0] = this._offsetTextureUVsByRect(this.layer.colorTexturesMeta[0], this.texturePoints, e), Bt(e, this.layer.colorTexturesMeta[0], this.layer.layout, 1, 2), this.stereoTexturePoints[1] = this._offsetTextureUVsByRect(this.layer.colorTexturesMeta[0], this.texturePoints, e));
        }
        _offsetTextureUVsByRect(e, n, i) {
            i = i ?? {
                x: 0,
                y: 0,
                width: e.width,
                height: e.height
            };
            const r = i.x / e.width, s = i.y / e.height, a = i.width / e.width, o = i.height / e.height, l = [];
            for(let c = 0; c < n.length; c += 2){
                let u = n[c], d = n[c + 1], f = u * a + r, g = d * o + s;
                l[c] = f, l[c + 1] = g;
            }
            return new Float32Array(l);
        }
        _shouldUseStereoTexturePoints() {
            return this.layer.layout === O["stereo-left-right"] || this.layer.layout === O["stereo-top-bottom"];
        }
    }
    const M3 = rs`#version 300 es

in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
	// convert the rectangle from pixels to 0.0 to 1.0
	vec2 zeroToOne = a_position;

	// convert from 0->1 to 0->2
	vec2 zeroToTwo = zeroToOne * 2.0;

	// convert from 0->2 to -1->+1 (clipspace)
	vec2 clipSpace = zeroToTwo - 1.0;

	gl_Position = vec4(clipSpace * vec2(1, 1), 0, 1);

	// pass the texCoord to the fragment shader
	// The GPU will interpolate this value between points.
	v_texCoord = a_texCoord;
}
`, A3 = rs`#version 300 es
precision mediump float;
precision mediump int;
precision mediump sampler2DArray;

uniform sampler2DArray u_image;
uniform int u_layer;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
	vec4 tex = texture(u_image, vec3(v_texCoord.x, v_texCoord.y, u_layer));
 	fragColor = vec4(tex.rgb, tex.a);
}

`;
    class R3 extends zu {
        constructor(e, n){
            super(e, n), this.program = Ki(this.gl, M3, A3), this._createVAOs(), this.u_layerInfo = this.gl.getUniformLocation(this.program, "u_layer");
        }
        render(e) {
            let n = this.gl;
            if (this.layer.getTextureType() === V.texture) throw new Error("Using texture array projection renderer on a layer without texture array.");
            let r = e.getBaseLayer();
            const s = n.getParameter(n.TEXTURE_BINDING_2D_ARRAY);
            n.bindTexture(n.TEXTURE_2D_ARRAY, this.layer.colorTextures[0]), n.texParameteri(n.TEXTURE_2D_ARRAY, n.TEXTURE_MAG_FILTER, n.LINEAR), n.texParameteri(n.TEXTURE_2D_ARRAY, n.TEXTURE_MIN_FILTER, n.LINEAR);
            for (let a of e.internalViews){
                let o = e.getViewIndex(a), l = r.getViewport(a);
                n.viewport(l.x, l.y, l.width, l.height), this._renderInternal(o);
            }
            n.bindTexture(n.TEXTURE_2D_ARRAY, s);
        }
        _renderInternal(e = 0) {
            let n = this.gl;
            const i = n.getParameter(n.CURRENT_PROGRAM);
            n.useProgram(this.program), n.bindVertexArray(this.vao), n.uniform1i(this.u_layerInfo, e);
            var r = n.TRIANGLES, s = 0, a = 6;
            n.drawArrays(r, s, a), n.bindVertexArray(null), n.useProgram(i);
        }
    }
    const P3 = (t, e)=>t.getTextureType() === V["texture-array"] && e instanceof WebGL2RenderingContext ? new R3(t, e) : new zu(t, e);
    var Br = typeof Float32Array < "u" ? Float32Array : Array;
    Math.hypot || (Math.hypot = function() {
        for(var t = 0, e = arguments.length; e--;)t += arguments[e] * arguments[e];
        return Math.sqrt(t);
    });
    function Ea() {
        var t = new Br(16);
        return Br != Float32Array && (t[1] = 0, t[2] = 0, t[3] = 0, t[4] = 0, t[6] = 0, t[7] = 0, t[8] = 0, t[9] = 0, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0), t[0] = 1, t[5] = 1, t[10] = 1, t[15] = 1, t;
    }
    function _a(t, e, n) {
        var i = e[0], r = e[1], s = e[2], a = e[3], o = e[4], l = e[5], c = e[6], u = e[7], d = e[8], f = e[9], g = e[10], p = e[11], x = e[12], y = e[13], v = e[14], w = e[15], T = n[0], S = n[1], E = n[2], _ = n[3];
        return t[0] = T * i + S * o + E * d + _ * x, t[1] = T * r + S * l + E * f + _ * y, t[2] = T * s + S * c + E * g + _ * v, t[3] = T * a + S * u + E * p + _ * w, T = n[4], S = n[5], E = n[6], _ = n[7], t[4] = T * i + S * o + E * d + _ * x, t[5] = T * r + S * l + E * f + _ * y, t[6] = T * s + S * c + E * g + _ * v, t[7] = T * a + S * u + E * p + _ * w, T = n[8], S = n[9], E = n[10], _ = n[11], t[8] = T * i + S * o + E * d + _ * x, t[9] = T * r + S * l + E * f + _ * y, t[10] = T * s + S * c + E * g + _ * v, t[11] = T * a + S * u + E * p + _ * w, T = n[12], S = n[13], E = n[14], _ = n[15], t[12] = T * i + S * o + E * d + _ * x, t[13] = T * r + S * l + E * f + _ * y, t[14] = T * s + S * c + E * g + _ * v, t[15] = T * a + S * u + E * p + _ * w, t;
    }
    function oc(t, e) {
        var n = e[0], i = e[1], r = e[2], s = e[3], a = n + n, o = i + i, l = r + r, c = n * a, u = i * a, d = i * o, f = r * a, g = r * o, p = r * l, x = s * a, y = s * o, v = s * l;
        return t[0] = 1 - d - p, t[1] = u + v, t[2] = f - y, t[3] = 0, t[4] = u - v, t[5] = 1 - c - p, t[6] = g + x, t[7] = 0, t[8] = f + y, t[9] = g - x, t[10] = 1 - c - d, t[11] = 0, t[12] = 0, t[13] = 0, t[14] = 0, t[15] = 1, t;
    }
    function Sa() {
        var t = new Br(2);
        return Br != Float32Array && (t[0] = 0, t[1] = 0), t;
    }
    (function() {
        var t = Sa();
        return function(e, n, i, r, s, a) {
            var o, l;
            for(n || (n = 2), i || (i = 0), r ? l = Math.min(r * n + i, e.length) : l = e.length, o = i; o < l; o += n)t[0] = e[o], t[1] = e[o + 1], s(t, t, a), e[o] = t[0], e[o + 1] = t[1];
            return e;
        };
    })();
    const ss = (t)=>t, O3 = ss`
attribute vec4 a_position;
attribute vec2 a_texCoord;

uniform mat4 u_matrix;
uniform mat4 u_projectionMatrix;

varying vec2 v_texCoord;

void main() {
  // Multiply the position by the matrix.
  gl_Position = u_projectionMatrix * u_matrix * a_position;

   // pass the texCoord to the fragment shader
   // The GPU will interpolate this value between points.
   v_texCoord = a_texCoord;
}
`, I3 = ss`
precision mediump float;

// our texture
uniform sampler2D u_image;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
   	vec4 tex = texture2D(u_image, v_texCoord);
	gl_FragColor = vec4(tex.rgb, tex.a);
	// gl_FragColor = vec4(1.0, 0, 0, 1.0);
}
`, k3 = ss`#version 300 es

in vec4 a_position;
in vec2 a_texCoord;

uniform mat4 u_matrix;
uniform mat4 u_projectionMatrix;

out vec2 v_texCoord;

void main() {
	// Multiply the position by the matrix.
    gl_Position = u_projectionMatrix * u_matrix * a_position;

	// pass the texCoord to the fragment shader
	// The GPU will interpolate this value between points.
	v_texCoord = a_texCoord;
}
`, L3 = ss`#version 300 es
precision mediump float;
precision mediump int;
precision mediump sampler2DArray;

uniform sampler2DArray u_image;
uniform int u_layer;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
	vec4 tex = texture(u_image, vec3(v_texCoord.x, v_texCoord.y, u_layer));
 	fragColor = vec4(tex.rgb, tex.a);
}

`;
    class po {
        constructor(e, n){
            this.usesTextureArrayShaders = !1, this.savedVaoState = {
                vao: null,
                arrayBuffer: null
            }, this.hasMipmap = !1, this.gl = n, this.layer = e;
            let i = this.gl;
            this.transformMatrix = Ea(), n instanceof WebGL2RenderingContext && this.layer.getTextureType() === V["texture-array"] && (this.usesTextureArrayShaders = !0), this.usesTextureArrayShaders ? this.program = Ki(i, k3, L3) : this.program = Ki(i, O3, I3), this.programInfo = {
                attribLocations: {
                    a_position: i.getAttribLocation(this.program, "a_position"),
                    a_texCoord: i.getAttribLocation(this.program, "a_texCoord")
                },
                uniformLocations: {
                    u_matrix: i.getUniformLocation(this.program, "u_matrix"),
                    u_projectionMatrix: i.getUniformLocation(this.program, "u_projectionMatrix")
                }
            }, this.usesTextureArrayShaders && (this.programInfo.uniformLocations.u_layer = i.getUniformLocation(this.program, "u_layer"));
        }
        saveVaoState() {
            this.savedVaoState.vao = this.gl.getParameter(this.vaoGl.VERTEX_ARRAY_BINDING), this.savedVaoState.arrayBuffer = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING);
        }
        restoreVaoState() {
            this.vaoGl.bindVertexArray(this.savedVaoState.vao), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.savedVaoState.arrayBuffer), this.savedVaoState.vao = this.savedVaoState.arrayBuffer = null;
        }
        initialize() {
            let e = this.gl;
            if (this.layer.isMediaLayer()) {
                this.mediaTexture = e.createTexture(), this.mediaTexturePolyfill = {
                    texture: this.mediaTexture,
                    textureFormat: e.RGBA,
                    width: this.layer.media.videoWidth,
                    height: this.layer.media.videoHeight,
                    type: V.texture
                };
                const n = e.getParameter(e.TEXTURE_BINDING_2D);
                e.bindTexture(e.TEXTURE_2D, this.mediaTexture), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, this.layer.media.videoWidth, this.layer.media.videoHeight, 0, e.RGBA, e.UNSIGNED_BYTE, null), e.bindTexture(e.TEXTURE_2D, n);
            }
            this._createVAOs();
        }
        render(e, n) {
            this.saveVaoState();
            let i = this.gl, r = e.getBaseLayer(), s = n.getViewerPose(e.getReferenceSpace());
            const a = i.getParameter(i.ACTIVE_TEXTURE);
            for (let o of s.views){
                let l = r.getViewport(o);
                if (i.viewport(l.x, l.y, l.width, l.height), i.activeTexture(i.TEXTURE0), this.usesTextureArrayShaders) {
                    if (i instanceof WebGLRenderingContext) throw new Error("This should never happen; texture-arrays only supported on WebGL2.");
                    if (this.layer.isMediaLayer()) throw new Error("This should never happen. Media layers should never be created with texture-array");
                    const c = i.getParameter(i.TEXTURE_BINDING_2D_ARRAY);
                    i.bindTexture(i.TEXTURE_2D_ARRAY, this.layer.colorTextures[0]), this.layer.isStatic ? (this.layer.needsRedraw === !0 && i.generateMipmap(i.TEXTURE_2D_ARRAY), this.hasMipmap = !0) : this.hasMipmap = this.layer.mipLevels > 0, i.texParameteri(i.TEXTURE_2D_ARRAY, i.TEXTURE_MAG_FILTER, this.hasMipmap ? i.LINEAR_MIPMAP_LINEAR : i.LINEAR), i.texParameteri(i.TEXTURE_2D_ARRAY, i.TEXTURE_MIN_FILTER, this.hasMipmap ? i.LINEAR_MIPMAP_LINEAR : i.LINEAR);
                    let u = 0;
                    if (this.layer.layout === O.stereo) switch(o.eye){
                        case "right":
                            u = 1;
                            break;
                    }
                    this._shouldUseStereoTexturePoints() ? this._renderInternalStereo(e, n, o, u) : this._renderInternal(e, n, o, u), i.activeTexture(a), i.bindTexture(i.TEXTURE_2D_ARRAY, c);
                } else {
                    const c = i.getParameter(i.TEXTURE_BINDING_2D);
                    if (this.layer.isMediaLayer()) i.bindTexture(i.TEXTURE_2D, this.mediaTexture), i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL, !0), i.texSubImage2D(i.TEXTURE_2D, 0, 0, 0, this.layer.media.videoWidth, this.layer.media.videoHeight, i.RGBA, i.UNSIGNED_BYTE, this.layer.media);
                    else if (this.layer.layout === O.stereo) switch(o.eye){
                        case "right":
                            i.bindTexture(i.TEXTURE_2D, this.layer.colorTextures[1]);
                            break;
                        default:
                            i.bindTexture(i.TEXTURE_2D, this.layer.colorTextures[0]);
                    }
                    else i.bindTexture(i.TEXTURE_2D, this.layer.colorTextures[0]);
                    this.layer.isStatic ? (this.layer.needsRedraw === !0 && i.generateMipmap(i.TEXTURE_2D), this.hasMipmap = !0) : this.hasMipmap = this.layer.mipLevels > 0, i.texParameteri(i.TEXTURE_2D, i.TEXTURE_WRAP_S, i.CLAMP_TO_EDGE), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_WRAP_T, i.CLAMP_TO_EDGE), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MIN_FILTER, this.hasMipmap ? i.LINEAR_MIPMAP_LINEAR : i.LINEAR), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MAG_FILTER, this.hasMipmap ? i.LINEAR_MIPMAP_LINEAR : i.LINEAR), this._shouldUseStereoTexturePoints() ? this._renderInternalStereo(e, n, o) : this._renderInternal(e, n, o), i.activeTexture(a), i.bindTexture(i.TEXTURE_2D, c);
                }
            }
            this.restoreVaoState();
        }
        createPositionPoints() {
            return new Float32Array([]);
        }
        createTextureUVs() {
            return new Float32Array([]);
        }
        _offsetTextureUVsByRect(e, n, i) {
            i = i ?? {
                x: 0,
                y: 0,
                width: e.width,
                height: e.height
            };
            const r = i.x / e.width, s = i.y / e.height, a = i.width / e.width, o = i.height / e.height, l = [];
            for(let c = 0; c < n.length; c += 2){
                let u = n[c], d = n[c + 1], f = u * a + r, g = d * o + s;
                l[c] = f, l[c + 1] = g;
            }
            return new Float32Array(l);
        }
        _shouldUseStereoTexturePoints() {
            return this.layer.layout === O["stereo-left-right"] || this.layer.layout === O["stereo-top-bottom"];
        }
        _setStereoTextureBuffer(e) {
            let n = this.gl;
            n.enableVertexAttribArray(this.programInfo.attribLocations.a_texCoord), n.bindBuffer(n.ARRAY_BUFFER, this.texcoordBuffer), n.bufferData(n.ARRAY_BUFFER, this.stereoTexturePoints[e], n.STATIC_DRAW);
            var i = 2, r = n.FLOAT, s = !1, a = 0, o = 0;
            n.vertexAttribPointer(this.programInfo.attribLocations.a_texCoord, i, r, s, a, o), n.bindBuffer(n.ARRAY_BUFFER, null);
        }
        _recalculateVertices() {
            this.positionPoints = this.createPositionPoints(), this.texturePoints = this.createTextureUVs();
            const e = {
                x: 0,
                y: 0,
                width: 1,
                height: 1
            };
            if (this._shouldUseStereoTexturePoints()) {
                if (this.stereoTexturePoints = [], this.layer.isMediaLayer()) {
                    Bt(e, this.mediaTexturePolyfill, this.layer.layout, 0, 2), this.stereoTexturePoints[0] = this._offsetTextureUVsByRect(this.mediaTexturePolyfill, this.texturePoints, e), Bt(e, this.mediaTexturePolyfill, this.layer.layout, 1, 2), this.stereoTexturePoints[1] = this._offsetTextureUVsByRect(this.mediaTexturePolyfill, this.texturePoints, e), this.layer.layout === O["stereo-top-bottom"] && ([this.stereoTexturePoints[0], this.stereoTexturePoints[1]] = [
                        this.stereoTexturePoints[1],
                        this.stereoTexturePoints[0]
                    ]);
                    return;
                }
                Bt(e, this.layer.colorTexturesMeta[0], this.layer.layout, 0, 2), this.stereoTexturePoints[0] = this._offsetTextureUVsByRect(this.layer.colorTexturesMeta[0], this.texturePoints, e), Bt(e, this.layer.colorTexturesMeta[0], this.layer.layout, 1, 2), this.stereoTexturePoints[1] = this._offsetTextureUVsByRect(this.layer.colorTexturesMeta[0], this.texturePoints, e), this.layer.layout === O["stereo-top-bottom"] && ([this.stereoTexturePoints[0], this.stereoTexturePoints[1]] = [
                    this.stereoTexturePoints[1],
                    this.stereoTexturePoints[0]
                ]);
            }
        }
        _createVAOs() {
            this._recalculateVertices();
            let e = this.gl;
            this.vaoGl = fo(e), this.saveVaoState();
            let n = e.createBuffer();
            this.vao = this.vaoGl.createVertexArray(), this.vaoGl.bindVertexArray(this.vao), e.enableVertexAttribArray(this.programInfo.attribLocations.a_position), e.bindBuffer(e.ARRAY_BUFFER, n);
            const i = this.positionPoints;
            e.bufferData(e.ARRAY_BUFFER, i, e.STATIC_DRAW);
            var r = 3, s = e.FLOAT, a = !1, o = 0, l = 0;
            e.vertexAttribPointer(this.programInfo.attribLocations.a_position, r, s, a, o, l), e.enableVertexAttribArray(this.programInfo.attribLocations.a_texCoord), this.texcoordBuffer = e.createBuffer(), e.bindBuffer(e.ARRAY_BUFFER, this.texcoordBuffer), e.bufferData(e.ARRAY_BUFFER, this.texturePoints, e.STATIC_DRAW);
            var r = 2, s = e.FLOAT, a = !1, o = 0, l = 0;
            e.vertexAttribPointer(this.programInfo.attribLocations.a_texCoord, r, s, a, o, l), this.restoreVaoState();
        }
        _renderInternal(e, n, i, r) {
            let s = this.gl;
            const a = s.getParameter(s.CURRENT_PROGRAM);
            s.useProgram(this.program), this.vaoGl.bindVertexArray(this.vao), this.usesTextureArrayShaders && s.uniform1i(this.programInfo.uniformLocations.u_layer, r), this._setTransformMatrix(e, n, i), s.uniformMatrix4fv(this.programInfo.uniformLocations.u_matrix, !1, this.transformMatrix), s.uniformMatrix4fv(this.programInfo.uniformLocations.u_projectionMatrix, !1, i.projectionMatrix);
            var o = s.TRIANGLES, l = 0, c = this.positionPoints.length / 3;
            s.drawArrays(o, l, c), this.vaoGl.bindVertexArray(null), s.useProgram(a);
        }
        _renderInternalStereo(e, n, i, r) {
            if (i.eye === "none") return this._renderInternal(e, n, i);
            let s = this.gl;
            this.vaoGl.bindVertexArray(this.vao);
            const a = s.getParameter(s.CURRENT_PROGRAM);
            s.useProgram(this.program), this._setStereoTextureBuffer(i.eye === "right" ? 1 : 0), this.usesTextureArrayShaders && s.uniform1i(this.programInfo.uniformLocations.u_layer, r), this._setTransformMatrix(e, n, i), s.uniformMatrix4fv(this.programInfo.uniformLocations.u_matrix, !1, this.transformMatrix), s.uniformMatrix4fv(this.programInfo.uniformLocations.u_projectionMatrix, !1, i.projectionMatrix);
            var o = s.TRIANGLES, l = 0, c = this.positionPoints.length / 3;
            s.drawArrays(o, l, c), this.vaoGl.bindVertexArray(null), s.useProgram(a);
        }
        _setTransformMatrix(e, n, i) {
            let r = n.getPose(this.layer.space, e.getReferenceSpace());
            _a(this.transformMatrix, r.transform.matrix, this.layer.transform.matrix), _a(this.transformMatrix, i.transform.inverse.matrix, this.transformMatrix);
        }
    }
    class C3 extends po {
        constructor(e, n){
            super(e, n), this.initialize();
        }
        createPositionPoints() {
            const e = this.layer.width, n = this.layer.height, i = 0, r = [
                -e,
                -n,
                i,
                e,
                -n,
                i,
                -e,
                n,
                i,
                -e,
                n,
                i,
                e,
                -n,
                i,
                e,
                n,
                i
            ];
            return new Float32Array(r);
        }
        createTextureUVs() {
            return new Float32Array([
                0,
                0,
                1,
                0,
                0,
                1,
                0,
                1,
                1,
                0,
                1,
                1
            ]);
        }
    }
    class N3 extends po {
        constructor(e, n){
            super(e, n), this.segments = 16, this.initialize();
        }
        createPositionPoints() {
            const e = [], n = this.layer.centralAngle, i = this.layer.height, r = this.layer.radius, s = n / this.segments, a = Math.PI / 2 - n / 2, o = [], l = Sa();
            l[0] = r * Math.cos(a), l[1] = -r * Math.sin(a), o.push(l);
            for(let c = 0; c < this.segments; c++){
                const u = Sa();
                u[0] = r * Math.cos(a + s * (c + 1)), u[1] = -r * Math.sin(a + s * (c + 1)), o.push(u);
            }
            o.reverse();
            for(let c = 0; c < this.segments; c++){
                const u = o[c], d = o[c + 1];
                e.push(u[0], -i / 2, u[1]), e.push(d[0], -i / 2, d[1]), e.push(u[0], i / 2, u[1]), e.push(u[0], i / 2, u[1]), e.push(d[0], -i / 2, d[1]), e.push(d[0], i / 2, d[1]);
            }
            return new Float32Array(e);
        }
        createTextureUVs() {
            let e = [];
            const n = 1 / this.segments;
            for(let i = 0; i < this.segments; i++){
                let r = n * i, s = n * (i + 1);
                e.push(r, 0), e.push(s, 0), e.push(r, 1), e.push(r, 1), e.push(s, 0), e.push(s, 1);
            }
            return new Float32Array(e);
        }
    }
    class F3 extends po {
        constructor(e, n){
            super(e, n), this.segmentsPerAxis = 40, this.initialize();
        }
        createPositionPoints() {
            const e = [];
            let n = this.layer.radius;
            n === 0 && (n = 25), n > 25 && (n = 25);
            const i = this.layer.centralHorizontalAngle, r = this.layer.upperVerticalAngle + Math.PI / 2, s = this.layer.lowerVerticalAngle + Math.PI / 2, a = r, o = s, l = Math.PI / 2 - i / 2, c = l + i, u = o - a, d = c - l, f = [];
            for(let p = 0; p <= this.segmentsPerAxis; p++)for(let x = 0; x <= this.segmentsPerAxis; x++){
                const y = x / this.segmentsPerAxis, v = p / this.segmentsPerAxis;
                let w = n, T = c - d * y, S = u * v + a;
                const E = Math.cos(T) * Math.sin(S), _ = Math.cos(S), k = -Math.sin(T) * Math.sin(S);
                f.push([
                    w * E,
                    w * _,
                    w * k
                ]);
            }
            const g = this.segmentsPerAxis + 1;
            for(let p = 0; p < this.segmentsPerAxis; p++)for(let x = 0; x < this.segmentsPerAxis; x++)e.push(...f[x * g + p]), e.push(...f[x * g + p + 1]), e.push(...f[(x + 1) * g + p]), e.push(...f[(x + 1) * g + p]), e.push(...f[x * g + p + 1]), e.push(...f[(x + 1) * g + p + 1]);
            return new Float32Array(e);
        }
        createTextureUVs() {
            const e = [], n = [];
            for(let r = 0; r <= this.segmentsPerAxis; r++)for(let s = 0; s <= this.segmentsPerAxis; s++){
                const a = s / this.segmentsPerAxis, o = r / this.segmentsPerAxis;
                n.push([
                    a,
                    o
                ]);
            }
            const i = this.segmentsPerAxis + 1;
            for(let r = 0; r < this.segmentsPerAxis; r++)for(let s = 0; s < this.segmentsPerAxis; s++)e.push(...n[s * i + r]), e.push(...n[s * i + r + 1]), e.push(...n[(s + 1) * i + r]), e.push(...n[(s + 1) * i + r]), e.push(...n[s * i + r + 1]), e.push(...n[(s + 1) * i + r + 1]);
            return new Float32Array(e);
        }
    }
    const lc = {
        colorFormat: 6408,
        mipLevels: 1,
        layout: O.mono,
        isStatic: !1,
        space: null,
        viewPixelHeight: 0,
        viewPixelWidth: 0
    };
    class Du extends di {
        constructor(e = lc){
            if (super(), !Qi(e.space)) throw new TypeError("XRCubeLayer's space needs to be an XRReferenceSpace");
            switch(this.init = Object.assign(Object.assign({}, lc), e), this.space = this.init.space, this.isStatic = this.init.isStatic, this.init.orientation ? this.orientation = DOMPointReadOnly.fromPoint(this.init.orientation) : this.orientation = new DOMPointReadOnly, this.init.layout){
                case O.default:
                case O["stereo-left-right"]:
                case O["stereo-top-bottom"]:
                    throw new TypeError("Invalid layout format for XRCubeLayer");
            }
            this.layout = this.init.layout, this.needsRedraw = !0;
        }
        initialize(e, n) {
            super.initialize(e, n), this._allocateColorTexturesInternal(), this._allocateDepthStencilTexturesInternal();
        }
        _allocateColorTexturesInternal() {
            if (this._colorTextures = [], this._texturesMeta = [], this.layout === O.mono) {
                const e = this._createCubeColorTexture();
                this._texturesMeta.push(e), this._colorTextures.push(e.texture);
                return;
            } else {
                const e = this._createCubeColorTexture(), n = this._createCubeColorTexture();
                this._texturesMeta.push(e, n), this._colorTextures.push(e.texture, n.texture);
                return;
            }
        }
        _allocateDepthStencilTexturesInternal() {
            if (this._depthStencilTextures = [], !!this.init.depthFormat) {
                if (this.context instanceof WebGLRenderingContext && !this.context.getExtension("WEBGL_depth_texture")) throw new TypeError("Depth textures not supported in the current context");
                if (this.layout === O.mono) {
                    const e = this._createCubeDepthTexture();
                    this._depthStencilTextures.push(e.texture);
                    return;
                } else {
                    const e = this._createCubeDepthTexture(), n = this._createCubeDepthTexture();
                    this._depthStencilTextures.push(e.texture, n.texture);
                    return;
                }
            }
        }
        _createCubeColorTexture() {
            let e = this.context.createTexture(), n = {
                width: this.init.viewPixelWidth,
                height: this.init.viewPixelHeight,
                layers: 1,
                type: V.texture,
                textureFormat: this.init.colorFormat,
                texture: e
            };
            const i = this.context.getParameter(this.context.TEXTURE_BINDING_CUBE_MAP);
            this.context.bindTexture(this.context.TEXTURE_CUBE_MAP, e);
            for(let r = 0; r < 6; r++)this.context.texImage2D(this.context.TEXTURE_CUBE_MAP_POSITIVE_X + r, 0, n.textureFormat, n.width, n.height, 0, n.textureFormat, this.context.UNSIGNED_BYTE, null);
            return this.context.bindTexture(this.context.TEXTURE_CUBE_MAP, i), n;
        }
        _createCubeDepthTexture() {
            let e = this.context.createTexture(), n = {
                width: this.init.viewPixelWidth,
                height: this.init.viewPixelHeight,
                layers: 1,
                type: V.texture,
                textureFormat: this.init.depthFormat,
                texture: e
            };
            const i = this.context.getParameter(this.context.TEXTURE_BINDING_CUBE_MAP);
            this.context.bindTexture(this.context.TEXTURE_CUBE_MAP, e);
            let r = this.init.depthFormat;
            this.context instanceof WebGL2RenderingContext && (r === this.context.DEPTH_COMPONENT && (r = this.context.DEPTH_COMPONENT24), r === this.context.DEPTH_STENCIL && (r = this.context.DEPTH24_STENCIL8));
            for(let s = 0; s < 6; s++)this.context.texImage2D(this.context.TEXTURE_CUBE_MAP_POSITIVE_X + s, 0, r, n.width, n.height, 0, n.textureFormat, this.context.UNSIGNED_INT, null);
            return this.context.bindTexture(this.context.TEXTURE_CUBE_MAP, i), n;
        }
        getTextureType() {
            return V.texture;
        }
    }
    const Bu = (t)=>t, z3 = Bu`
attribute vec4 a_position;
uniform mat4 u_projectionMatrix;
uniform mat4 u_matrix;
varying vec3 v_normal;

void main() {
   gl_Position = u_projectionMatrix * u_matrix * a_position;

   v_normal = normalize(a_position.xyz);
}
`, D3 = Bu`
precision mediump float;

varying vec3 v_normal;

uniform samplerCube u_texture;

void main() {
   gl_FragColor = textureCube(u_texture, normalize(v_normal));
}
`;
    class B3 {
        constructor(e, n){
            this.savedVaoState = {
                vao: null,
                arrayBuffer: null
            }, this.hasMipmap = !1, this.layer = e, this.gl = n, this.transformMatrix = Ea(), this.program = Ki(n, z3, D3), this.programInfo = {
                attribLocations: {
                    a_position: n.getAttribLocation(this.program, "a_position")
                },
                uniformLocations: {
                    u_matrix: n.getUniformLocation(this.program, "u_matrix"),
                    u_texture: n.getUniformLocation(this.program, "u_texture"),
                    u_projectionMatrix: n.getUniformLocation(this.program, "u_projectionMatrix")
                }
            }, this._createVAOs();
        }
        saveVaoState() {
            this.savedVaoState.vao = this.gl.getParameter(this.vaoGl.VERTEX_ARRAY_BINDING), this.savedVaoState.arrayBuffer = this.gl.getParameter(this.gl.ARRAY_BUFFER_BINDING);
        }
        restoreVaoState() {
            this.vaoGl.bindVertexArray(this.savedVaoState.vao), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.savedVaoState.arrayBuffer), this.savedVaoState.vao = this.savedVaoState.arrayBuffer = null;
        }
        render(e, n) {
            this.saveVaoState();
            let i = this.gl, r = e.getBaseLayer(), s = n.getViewerPose(e.getReferenceSpace());
            const a = i.getParameter(i.ACTIVE_TEXTURE);
            for (let o of s.views){
                let l = r.getViewport(o);
                i.viewport(l.x, l.y, l.width, l.height), i.activeTexture(i.TEXTURE0);
                const c = i.getParameter(i.TEXTURE_BINDING_CUBE_MAP);
                if (this.layer.layout === O.stereo) {
                    const u = o.eye === "right" ? 1 : 0;
                    i.bindTexture(i.TEXTURE_CUBE_MAP, this.layer.colorTextures[u]);
                } else i.bindTexture(i.TEXTURE_CUBE_MAP, this.layer.colorTextures[0]);
                this.layer.isStatic ? (this.layer.needsRedraw === !0 && i.generateMipmap(i.TEXTURE_CUBE_MAP), this.hasMipmap = !0) : this.hasMipmap = this.layer.mipLevels > 0, i.texParameteri(i.TEXTURE_CUBE_MAP, i.TEXTURE_MAG_FILTER, this.hasMipmap ? i.LINEAR_MIPMAP_LINEAR : i.LINEAR), i.texParameteri(i.TEXTURE_CUBE_MAP, i.TEXTURE_MIN_FILTER, this.hasMipmap ? i.LINEAR_MIPMAP_LINEAR : i.LINEAR), this._renderInternal(this.layer.orientation, o), i.activeTexture(a), i.bindTexture(i.TEXTURE_CUBE_MAP, c);
            }
            this.restoreVaoState();
        }
        createPositionPoints() {
            const n = [
                -.5,
                -.5,
                -.5,
                -.5,
                .5,
                -.5,
                .5,
                -.5,
                -.5,
                -.5,
                .5,
                -.5,
                .5,
                .5,
                -.5,
                .5,
                -.5,
                -.5,
                -.5,
                -.5,
                .5,
                .5,
                -.5,
                .5,
                -.5,
                .5,
                .5,
                -.5,
                .5,
                .5,
                .5,
                -.5,
                .5,
                .5,
                .5,
                .5,
                -.5,
                .5,
                -.5,
                -.5,
                .5,
                .5,
                .5,
                .5,
                -.5,
                -.5,
                .5,
                .5,
                .5,
                .5,
                .5,
                .5,
                .5,
                -.5,
                -.5,
                -.5,
                -.5,
                .5,
                -.5,
                -.5,
                -.5,
                -.5,
                .5,
                -.5,
                -.5,
                .5,
                .5,
                -.5,
                -.5,
                .5,
                -.5,
                .5,
                -.5,
                -.5,
                -.5,
                -.5,
                -.5,
                .5,
                -.5,
                .5,
                -.5,
                -.5,
                -.5,
                .5,
                -.5,
                .5,
                .5,
                -.5,
                .5,
                -.5,
                .5,
                -.5,
                -.5,
                .5,
                .5,
                -.5,
                .5,
                -.5,
                .5,
                .5,
                -.5,
                .5,
                .5,
                .5,
                -.5,
                .5,
                .5,
                .5
            ];
            return new Float32Array(n);
        }
        _renderInternal(e, n) {
            let i = this.gl;
            const r = i.getParameter(i.CURRENT_PROGRAM);
            i.useProgram(this.program), this.vaoGl.bindVertexArray(this.vao), oc(this.transformMatrix, [
                e.x,
                e.y,
                e.z,
                e.w
            ]), this._poseOrientationMatrix || (this._poseOrientationMatrix = Ea()), oc(this._poseOrientationMatrix, [
                n.transform.inverse.orientation.x,
                n.transform.inverse.orientation.y,
                n.transform.inverse.orientation.z,
                n.transform.inverse.orientation.w
            ]), _a(this.transformMatrix, this.transformMatrix, this._poseOrientationMatrix), i.uniformMatrix4fv(this.programInfo.uniformLocations.u_matrix, !1, this.transformMatrix), i.uniformMatrix4fv(this.programInfo.uniformLocations.u_projectionMatrix, !1, n.projectionMatrix), i.uniform1i(this.programInfo.uniformLocations.u_texture, 0);
            var s = i.TRIANGLES, a = 0, o = this.positionPoints.length / 3;
            i.drawArrays(s, a, o), this.vaoGl.bindVertexArray(null), i.useProgram(r);
        }
        _recalculateVertices() {
            this.positionPoints = this.createPositionPoints();
        }
        _createVAOs() {
            this._recalculateVertices();
            let e = this.gl;
            this.vaoGl = fo(e), this.saveVaoState();
            let n = e.createBuffer();
            this.vao = this.vaoGl.createVertexArray(), this.vaoGl.bindVertexArray(this.vao), e.enableVertexAttribArray(this.programInfo.attribLocations.a_position), e.bindBuffer(e.ARRAY_BUFFER, n);
            const i = this.positionPoints;
            e.bufferData(e.ARRAY_BUFFER, i, e.STATIC_DRAW);
            var r = 3, s = e.FLOAT, a = !1, o = 0, l = 0;
            e.vertexAttribPointer(this.programInfo.attribLocations.a_position, r, s, a, o, l), this.restoreVaoState();
        }
    }
    class mr {
        constructor(){
            this.mode = "inline", this.layers = [], this.views = [], this.initializedViews = !1, this.isPolyfillActive = !1, this.taskQueue = [];
        }
        requestAnimationFrame(e) {
            this.injectedFrameCallback || (this.injectedFrameCallback = (n, i)=>{
                let r = this.context;
                if (!this.initializedViews && this.referenceSpace) {
                    let s = i.getViewerPose(this.referenceSpace);
                    s && (this.views = s.views, this.initializedViews = !0);
                }
                if (this.isPolyfillActive && this.initializedViews) {
                    this.tempFramebuffer || (this.tempFramebuffer = r.createFramebuffer()), r.bindFramebuffer(r.FRAMEBUFFER, this.tempFramebuffer);
                    const s = r.getParameter(r.COLOR_CLEAR_VALUE), a = r.getParameter(r.FRAMEBUFFER_BINDING);
                    r.clearColor(0, 0, 0, 0);
                    for (let o of this.layers)if (o instanceof Dr) for(let l = 0; l < o.colorTextures.length; l++)o.colorTexturesMeta[l].type === V["texture-array"] || (r.framebufferTexture2D(r.FRAMEBUFFER, r.COLOR_ATTACHMENT0, r.TEXTURE_2D, o.colorTextures[l], 0), o.depthStencilTextures && l < o.depthStencilTextures.length ? r.framebufferTexture2D(r.FRAMEBUFFER, r.DEPTH_ATTACHMENT, r.TEXTURE_2D, o.depthStencilTextures[l], 0) : r.framebufferTexture2D(r.FRAMEBUFFER, r.DEPTH_ATTACHMENT, r.TEXTURE_2D, null, 0), r.clear(r.COLOR_BUFFER_BIT | r.DEPTH_BUFFER_BIT));
                    r.bindFramebuffer(r.FRAMEBUFFER, a), r.clearColor(s[0], s[1], s[2], s[3]);
                }
                if (e(n, i), this.isPolyfillActive && this.initializedViews) {
                    let s = r.isEnabled(r.BLEND), a = r.isEnabled(r.DEPTH_TEST), o = r.isEnabled(r.CULL_FACE);
                    const l = r.getParameter(r.FRAMEBUFFER_BINDING), c = r.getParameter(r.COLOR_CLEAR_VALUE);
                    r.bindFramebuffer(r.FRAMEBUFFER, this.getBaseLayer().framebuffer), r.clear(r.COLOR_BUFFER_BIT | r.DEPTH_BUFFER_BIT), r.clearColor(c[0], c[1], c[2], c[3]), r.enable(r.BLEND), r.disable(r.DEPTH_TEST), r.disable(r.CULL_FACE);
                    let u = r.getParameter(r.BLEND_SRC_RGB), d = r.getParameter(r.BLEND_SRC_ALPHA), f = r.getParameter(r.BLEND_DST_RGB), g = r.getParameter(r.BLEND_DST_ALPHA);
                    r.blendFunc(r.SRC_ALPHA, r.ONE_MINUS_SRC_ALPHA);
                    for (let p of this.layers)if (this.renderers || (this.renderers = new WeakMap), p instanceof Dr) this.renderers.has(p) || this.renderers.set(p, P3(p, this.context)), this.renderers.get(p).render(this);
                    else if (p instanceof ho) this.renderers.has(p) || this.renderers.set(p, new C3(p, this.context)), this.renderers.get(p).render(this, i);
                    else if (p instanceof co) this.renderers.has(p) || this.renderers.set(p, new N3(p, this.context)), this.renderers.get(p).render(this, i);
                    else if (p instanceof uo) this.renderers.has(p) || this.renderers.set(p, new F3(p, this.context)), this.renderers.get(p).render(this, i);
                    else if (p instanceof Du) this.renderers.has(p) || this.renderers.set(p, new B3(p, this.context)), this.renderers.get(p).render(this, i);
                    else {
                        const x = p;
                        if (x.framebuffer === null) continue;
                        r instanceof WebGL2RenderingContext ? (r.bindFramebuffer(r.READ_FRAMEBUFFER, x.framebuffer), r.bindFramebuffer(r.DRAW_FRAMEBUFFER, this.getBaseLayer().framebuffer), r.blitFramebuffer(0, 0, x.framebufferWidth, x.framebufferHeight, 0, 0, this.getBaseLayer().framebufferWidth, this.getBaseLayer().framebufferHeight, r.COLOR_BUFFER_BIT | r.DEPTH_BUFFER_BIT, r.LINEAR)) : console.warn("GL blitFramebuffer is not supported on WebGL1, so XRWebGLLayers may not show up properly when polyfilled.");
                    }
                    for(s || r.disable(r.BLEND), a && r.enable(r.DEPTH_TEST), o && r.enable(r.CULL_FACE), r.blendFuncSeparate(u, f, d, g), r.bindFramebuffer(r.FRAMEBUFFER, l); this.taskQueue.length > 0;)this.taskQueue.shift()();
                }
            }), this._requestAnimationFrame(this.injectedFrameCallback);
        }
        updateRenderState(e) {
            if (this.existingBaseLayer = e.baseLayer, e.layers && (this.layers = e.layers), this.activeRenderState || this.createActiveRenderState(), this.activeRenderState = Object.assign(Object.assign({}, this.activeRenderState), e), !e.layers) {
                this._updateRenderState(e);
                return;
            }
            let n = Object.assign({}, e);
            delete n.layers;
            let i;
            for (let r of this.layers)if (r instanceof di) {
                i = r.getContext();
                break;
            }
            if (!i && !this.context) {
                let s = function() {
                    i.canvas.width = i.canvas.clientWidth * window.devicePixelRatio, i.canvas.height = i.canvas.clientHeight * window.devicePixelRatio;
                };
                console.log("No existing context! Have the session make one");
                const r = document.createElement("canvas");
                if (i = r.getContext("webgl2", {
                    xrCompatible: !0
                }), i || (i = r.getContext("webgl", {
                    xrCompatible: !0
                })), !i) throw new Error("No webGL support detected.");
                document.body.appendChild(i.canvas), window.addEventListener("resize", s), s();
            }
            this.createInternalLayer(i), this.isPolyfillActive = !0, this._updateRenderState(Object.assign(Object.assign({}, n), {
                baseLayer: this.internalLayer
            }));
        }
        initializeSession(e) {
            this.mode = e, this.requestReferenceSpace("local").then((n)=>{
                this.referenceSpace = n;
            }).catch((n)=>{}), this.requestReferenceSpace("viewer").then((n)=>{
                this.viewerSpace = n;
            });
        }
        getBaseLayer(e) {
            return !this.internalLayer && !this.existingBaseLayer && e && this.createInternalLayer(e), this.internalLayer || this.existingBaseLayer;
        }
        getReferenceSpace() {
            return this.referenceSpace ? this.referenceSpace : this.viewerSpace;
        }
        getViewerSpace() {
            return this.viewerSpace;
        }
        queueTask(e) {
            this.taskQueue.push(e);
        }
        get renderState() {
            return this.activeRenderState || this.createActiveRenderState(), this.activeRenderState;
        }
        get internalViews() {
            return this.views;
        }
        getViewIndex(e) {
            for(let n = 0; n < this.views.length; n++){
                let i = this.views[n];
                if (e.eye === i.eye && e.recommendedViewportScale === i.recommendedViewportScale) return n;
            }
            return -1;
        }
        createInternalLayer(e) {
            if (!e && this.internalLayer) return this.internalLayer;
            if (e === this.context && this.internalLayer) return this.internalLayer;
            const n = oi();
            return this.internalLayer = new n.XRWebGLLayer(this, e), this.setContext(e), this.internalLayer;
        }
        setContext(e) {
            this.context = e, this.tempFramebuffer = e.createFramebuffer(), this.renderers = new WeakMap;
        }
        createActiveRenderState() {
            const e = oi();
            let n = Object.getOwnPropertyNames(e.XRRenderState.prototype);
            const i = {};
            for (let r of n)i[r] = this._renderState[r];
            i.layers = [], this.activeRenderState = i;
        }
    }
    class cc {
        constructor(){
            this.viewport = {
                x: 0,
                y: 0,
                width: 0,
                height: 0
            };
        }
    }
    class j3 {
        constructor(e, n){
            this.session = e, this.context = n, this.subImageCache = new U3;
        }
        createProjectionLayer(e = Ta) {
            const n = new Dr(e);
            if (this.session.ended) throw new Error("Session has ended");
            if (this.context.isContextLost()) throw new Error("context is lost");
            return n.initialize(this.session, this.context), n;
        }
        createQuadLayer(e = Fu) {
            if (this.session.ended) throw new Error("Session has ended");
            if (this.context.isContextLost()) throw new Error("context is lost");
            if (e.layout === O.default) throw new TypeError("Trying to create a quad layer with default layout");
            const n = new ho(e);
            return n.initialize(this.session, this.context), n;
        }
        createCylinderLayer(e = Cu) {
            if (this.session.ended) throw new Error("Session has ended");
            if (this.context.isContextLost()) throw new Error("context is lost");
            if (e.layout === O.default) throw new TypeError("Cylinder Layer cannot have a default layout");
            const n = new co(e);
            return n.initialize(this.session, this.context), n;
        }
        createEquirectLayer(e = Nu) {
            if (this.session.ended) throw new Error("Session has ended");
            if (this.context.isContextLost()) throw new Error("context is lost");
            if (e.layout === O.default) throw new TypeError("Equirect Layer cannot have a default layout");
            if (!Qi(e.space)) throw new TypeError("Equirect layer requires an XRReferenceSpace");
            let n = new uo(e);
            return n.initialize(this.session, this.context), n;
        }
        createCubeLayer(e) {
            if (this.session.ended) throw new Error("Session has ended");
            if (this.context.isContextLost()) throw new Error("context is lost");
            if (!(this.context instanceof WebGL2RenderingContext)) throw new Error("XRCubeLayer only work on WebGL2");
            if (!Qi(e.space)) throw new TypeError("XRCubeLayer requires a space of type XRReferenceSpace");
            let n = new Du(e);
            return n.initialize(this.session, this.context), n;
        }
        getSubImage(e, n, i = "none") {
            if (e.isStatic && e.needsRedraw === !1) throw new Error("Invalid state for subimage creation");
            let r = this.subImageCache.tryGetCachedSubImage(this.context, e, i);
            if (r) return r;
            let s = new cc;
            if (e instanceof Dr) throw new TypeError;
            if (e.layout === O.default) throw new TypeError;
            if (!this.validateStateofSubImageCreation(e, n)) throw new Error("Invalid state for subimage creation");
            let a = 0;
            if (e.layout === O.stereo) {
                if (i === "none") throw new TypeError;
                i === "right" && (a = 1);
            }
            e.getTextureType() === V["texture-array"] ? s.imageIndex = a : s.imageIndex = 0;
            let o = 0;
            e.getTextureType() === V.texture ? (s.colorTexture = e.colorTextures[a], o = a) : (s.colorTexture = e.colorTextures[0], o = 0), !e.depthStencilTextures || !e.depthStencilTextures.length ? s.depthStencilTexture = null : e.getTextureType() === V.texture ? s.depthStencilTexture = e.depthStencilTextures[a] : s.depthStencilTexture = e.depthStencilTextures[0];
            const l = e.colorTexturesMeta[o];
            s.textureWidth = l.width, s.textureHeight = l.height;
            let c = 1;
            return (e.layout === O["stereo-left-right"] || e.layout === O["stereo-top-bottom"]) && (c = 2), Bt(s.viewport, l, e.layout, a, c), this.session.queueTask(()=>{
                e.needsRedraw = !1;
            }), this.subImageCache.cacheSubImage(s, this.context, e, i), s;
        }
        getViewSubImage(e, n) {
            let i = this.subImageCache.tryGetCachedViewSubImage(this.context, e, n);
            if (i) return i;
            let r = new cc, s = this.session;
            if (!s.internalViews || !s.internalViews.length) return console.warn("Tried to get view sub image before we have any views"), r;
            let a = s.getViewIndex(n), o = 0;
            return e.getTextureType() === V["texture-array"] ? r.imageIndex = a : r.imageIndex = 0, e.layout === O.default && e.getTextureType() === V.texture ? (r.colorTexture = e.colorTextures[a], o = a) : (r.colorTexture = e.colorTextures[0], o = 0), e.depthStencilTextures.length === 0 ? r.depthStencilTexture = null : e.layout === O.default && e.getTextureType() === V.texture ? r.depthStencilTexture = e.depthStencilTextures[a] : r.depthStencilTexture = e.depthStencilTextures[0], r.textureWidth = e.colorTexturesMeta[o].width, r.textureHeight = e.colorTexturesMeta[o].height, Bt(r.viewport, e.colorTexturesMeta[o], e.layout, a, s.internalViews.length), e.needsRedraw = !1, this.subImageCache.cacheViewSubImage(r, this.context, e, n), r;
        }
        validateStateofSubImageCreation(e, n) {
            return !(n.session !== e.session || this.session !== e.session || this.context !== e.context || !e.colorTextures || !e.colorTextures.length || e.isStatic && e.needsRedraw === !1);
        }
    }
    class U3 {
        constructor(){
            this.cache = new Map, this.viewCache = new Map;
        }
        cacheSubImage(e, n, i, r) {
            let s = new Map;
            s.set(r, e);
            let a = new Map;
            a.set(i, s), this.cache.set(n, a);
        }
        tryGetCachedSubImage(e, n, i) {
            var r, s;
            return (s = (r = this.cache.get(e)) === null || r === void 0 ? void 0 : r.get(n)) === null || s === void 0 ? void 0 : s.get(i);
        }
        cacheViewSubImage(e, n, i, r) {
            let s = new Map;
            s.set(r, e);
            let a = new Map;
            a.set(i, s), this.viewCache.set(n, a);
        }
        tryGetCachedViewSubImage(e, n, i) {
            var r, s;
            return (s = (r = this.viewCache.get(e)) === null || r === void 0 ? void 0 : r.get(n)) === null || s === void 0 ? void 0 : s.get(i);
        }
    }
    const V3 = (t)=>t.navigator.xr ? !!(t.XRMediaBinding && t.XRWebGLBinding) : !1;
    class G3 {
        constructor(){
            this.injected = !1;
            const e = oi();
            this._injectPolyfill(e);
        }
        _injectPolyfill(e) {
            if (!("xr" in e.navigator)) throw new Error("WebXR Layers polyfill requires WebXR support.");
            this.injected === !0 && console.warn("Polyfill has already been injected..."), !V3(e) && (this._polyfillRequiredLayersFeature(e), this._polyfillXRSession(e), e.XRWebGLBinding = j3, e.XRMediaBinding = T3, this.injected = !0, console.log("Injected Layers Polyfill"));
        }
        _polyfillXRSession(e) {
            e.XRSession.prototype._updateRenderState = e.XRSession.prototype.updateRenderState, e.XRSession.prototype._requestAnimationFrame = e.XRSession.prototype.requestAnimationFrame;
            let n = Object.getOwnPropertyDescriptor(e.XRSession.prototype, "renderState");
            Object.defineProperty(e.XRSession.prototype, "_renderState", n);
            let i = Object.getOwnPropertyDescriptor(mr.prototype, "renderState");
            Object.defineProperty(e.XRSession.prototype, "renderState", i);
            let r = Object.getOwnPropertyNames(mr.prototype);
            for (let s of r){
                let a = Object.getOwnPropertyDescriptor(mr.prototype, s);
                Object.defineProperty(e.XRSession.prototype, s, a);
            }
        }
        _polyfillRequiredLayersFeature(e) {
            const n = e.navigator.xr.requestSession;
            Object.defineProperty(e.navigator.xr, "requestSessionInternal", {
                writable: !0
            }), e.navigator.xr.requestSessionInternal = n;
            const i = (r, s)=>{
                const a = (o, l)=>e.navigator.xr.requestSessionInternal(o, l).then((c)=>{
                        Object.assign(c, new mr);
                        let u = c;
                        return u.initializeSession(r), Promise.resolve(u);
                    });
                if (r !== "immersive-vr" || !s) return a(r, s);
                if (s.requiredFeatures && s.requiredFeatures.indexOf("layers") > -1) {
                    const o = Object.assign({}, s), l = [
                        ...s.requiredFeatures
                    ], c = l.indexOf("layers");
                    return l.splice(c, 1), o.requiredFeatures = l, a(r, o);
                }
                return a(r, s);
            };
            Object.defineProperty(e.navigator.xr, "requestSession", {
                writable: !0
            }), e.navigator.xr.requestSession = i;
        }
    }
    const Ai = {
        ipd: .063,
        fovy: Math.PI / 2,
        headsetPosition: new hn(0, 1.6, 0),
        headsetQuaternion: new Bi,
        stereoEnabled: !1
    }, $3 = 1, H3 = 2, W3 = 3, q3 = 4;
    class X3 {
        constructor(e, n = {}){
            var i, r, s, a, o, l;
            this.version = ic;
            const c = new Bp, u = new xn(xe.Viewer, c), d = {
                [Z.Left]: new le(u),
                [Z.Right]: new le(u),
                [Z.None]: new le(u)
            }, f = e.controllerConfig, g = {};
            f && Object.values(Fe).forEach((y)=>{
                f.layout[y] && (g[y] = new Kp(f, y, c));
            });
            const p = {
                [Fe.Left]: new nc(Hl, Fe.Left, c),
                [Fe.Right]: new nc(Hl, Fe.Right, c)
            }, x = (i = n.canvasContainer) !== null && i !== void 0 ? i : document.createElement("div");
            x.dataset.webxr_runtime = `Immersive Web Emulation Runtime v${ic}`, x.style.position = "fixed", x.style.width = "100%", x.style.height = "100%", x.style.top = "0", x.style.left = "0", x.style.display = "flex", x.style.justifyContent = "center", x.style.alignItems = "center", x.style.overflow = "hidden", x.style.zIndex = "999", this[b] = {
                name: e.name,
                supportedSessionModes: e.supportedSessionModes,
                supportedFeatures: e.supportedFeatures,
                supportedFrameRates: e.supportedFrameRates,
                isSystemKeyboardSupported: e.isSystemKeyboardSupported,
                internalNominalFrameRate: e.internalNominalFrameRate,
                environmentBlendModes: e.environmentBlendModes,
                interactionMode: e.interactionMode,
                userAgent: e.userAgent,
                position: (r = n.headsetPosition) !== null && r !== void 0 ? r : Ai.headsetPosition.clone(),
                quaternion: (s = n.headsetQuaternion) !== null && s !== void 0 ? s : Ai.headsetQuaternion.clone(),
                stereoEnabled: (a = n.stereoEnabled) !== null && a !== void 0 ? a : Ai.stereoEnabled,
                ipd: (o = n.ipd) !== null && o !== void 0 ? o : Ai.ipd,
                fovy: (l = n.fovy) !== null && l !== void 0 ? l : Ai.fovy,
                controllers: g,
                hands: p,
                primaryInputMode: "controller",
                pendingReferenceSpaceReset: !1,
                visibilityState: "visible",
                pendingVisibilityState: null,
                xrSystem: null,
                matrix: ge(),
                globalSpace: c,
                viewerSpace: u,
                viewSpaces: d,
                canvasContainer: x,
                getViewport: (y, v)=>{
                    const w = y.context.canvas, { width: T, height: S } = w;
                    switch(v.eye){
                        case Z.None:
                            return new pr(0, 0, T, S);
                        case Z.Left:
                            return new pr(0, 0, this[b].stereoEnabled ? T / 2 : T, S);
                        case Z.Right:
                            return new pr(T / 2, 0, this[b].stereoEnabled ? T / 2 : 0, S);
                    }
                },
                updateViews: ()=>{
                    const y = this[b].viewerSpace;
                    nr(y[he].offsetMatrix, this[b].quaternion.quat, this[b].position.vec3), si(this[b].viewSpaces[Z.Left][he].offsetMatrix, He(-this[b].ipd / 2, 0, 0)), si(this[b].viewSpaces[Z.Right][he].offsetMatrix, He(this[b].ipd / 2, 0, 0));
                },
                onBaseLayerSet: (y)=>{
                    if (!y) return;
                    const v = y.context.canvas;
                    if (v.parentElement !== this[b].canvasContainer) {
                        const w = this[b].devui;
                        if (w) {
                            const { devUICanvas: S, devUIContainer: E } = w;
                            S.style.zIndex = W3.toString(), E.style.zIndex = q3.toString(), this[b].canvasContainer.appendChild(w.devUICanvas), this[b].canvasContainer.appendChild(w.devUIContainer);
                        }
                        const T = this[b].sem;
                        T && (T.environmentCanvas.style.zIndex = $3.toString(), this[b].canvasContainer.appendChild(T.environmentCanvas)), this[b].canvasData = {
                            canvas: v,
                            parent: v.parentElement,
                            width: v.width,
                            height: v.height,
                            zIndex: v.style.zIndex
                        }, v.style.zIndex = H3.toString(), this[b].canvasContainer.appendChild(v), document.body.appendChild(this[b].canvasContainer);
                    }
                    v.width = window.innerWidth, v.height = window.innerHeight;
                },
                onSessionEnd: ()=>{
                    if (this[b].canvasData) {
                        const { canvas: y, parent: v, width: w, height: T, zIndex: S } = this[b].canvasData;
                        y.width = w, y.height = T, y.style.zIndex = S, v ? v.appendChild(y) : this[b].canvasContainer.removeChild(y);
                        const E = this[b].devui;
                        E && (this[b].canvasContainer.removeChild(E.devUICanvas), this[b].canvasContainer.removeChild(E.devUIContainer));
                        const _ = this[b].sem;
                        _ && this[b].canvasContainer.removeChild(_.environmentCanvas), document.body.removeChild(this[b].canvasContainer), this[b].canvasData = void 0, window.dispatchEvent(new Event("resize"));
                    }
                },
                onFrameStart: (y)=>{
                    var v;
                    const w = performance.now(), T = this[b].lastFrameTime > 0 ? w - this[b].lastFrameTime : 16.67;
                    if (this[b].lastFrameTime = w, this[b].remote && this[b].remote.update(T), !((v = this[b].actionPlayer) === null || v === void 0) && v.playing) this[b].actionPlayer.playFrame();
                    else {
                        const S = y.session;
                        this[b].updateViews(), this[b].pendingVisibilityState && (this[b].visibilityState = this[b].pendingVisibilityState, this[b].pendingVisibilityState = null, S.dispatchEvent(new zr("visibilitychange", {
                            session: S
                        }))), this[b].visibilityState === "visible" && this.activeInputs.forEach((E)=>{
                            E.onFrameStart(y);
                        }), this[b].pendingReferenceSpaceReset && (S[m].referenceSpaces.forEach((E)=>{
                            switch(E[Ct].type){
                                case xe.Local:
                                case xe.LocalFloor:
                                case xe.BoundedFloor:
                                case xe.Unbounded:
                                    E.dispatchEvent(new rc("reset", {
                                        referenceSpace: E
                                    }));
                                    break;
                            }
                        }), this[b].pendingReferenceSpaceReset = !1);
                    }
                    this[b].updateViews();
                },
                controlMode: "manual",
                controlModeListeners: new Set,
                stateChangeListeners: new Set,
                remote: null,
                lastFrameTime: 0
            }, this[b].remote = new Ut(this), this[b].updateViews();
        }
        installRuntime(e) {
            var n;
            const i = (n = e?.globalObject) !== null && n !== void 0 ? n : globalThis, r = e?.polyfillLayers;
            Object.defineProperty(WebGL2RenderingContext.prototype, "makeXRCompatible", {
                value: function() {
                    return new Promise((s, a)=>{
                        s(!0);
                    });
                },
                configurable: !0
            }), this[b].xrSystem = new sc(this), Object.defineProperty(globalThis.navigator, "xr", {
                value: this[b].xrSystem,
                configurable: !0
            }), Object.defineProperty(navigator, "userAgent", {
                value: this[b].userAgent,
                writable: !1,
                configurable: !1,
                enumerable: !0
            }), i.XRSystem = sc, i.XRSession = ao, i.XRRenderState = wa, i.XRFrame = ku, i.XRSpace = le, i.XRReferenceSpace = xn, i.XRJointSpace = lo, i.XRView = Pu, i.XRViewport = pr, i.XRRigidTransform = Ht, i.XRPose = is, i.XRViewerPose = Iu, i.XRJointPose = Ou, i.XRInputSource = ns, i.XRInputSourceArray = Qp, i.XRHand = oo, i.XRLayer = Lu, i.XRWebGLLayer = x3, i.XRSessionEvent = zr, i.XRInputSourceEvent = Mr, i.XRInputSourcesChangeEvent = Au, i.XRReferenceSpaceEvent = rc, r ? new G3 : (i.XRMediaBinding = void 0, i.XRWebGLBinding = void 0);
        }
        installDevUI(e) {
            this[b].devui = new e(this);
        }
        installSEM(e) {
            this[b].sem = new e(this);
        }
        get supportedSessionModes() {
            return this[b].supportedSessionModes;
        }
        get supportedFeatures() {
            return this[b].supportedFeatures;
        }
        get supportedFrameRates() {
            return this[b].supportedFrameRates;
        }
        get isSystemKeyboardSupported() {
            return this[b].isSystemKeyboardSupported;
        }
        get internalNominalFrameRate() {
            return this[b].internalNominalFrameRate;
        }
        get stereoEnabled() {
            return this[b].stereoEnabled;
        }
        set stereoEnabled(e) {
            this[b].stereoEnabled = e;
        }
        get ipd() {
            return this[b].ipd;
        }
        set ipd(e) {
            this[b].ipd = e;
        }
        get fovy() {
            return this[b].fovy;
        }
        set fovy(e) {
            this[b].fovy = e;
        }
        get position() {
            return this[b].position;
        }
        get quaternion() {
            return this[b].quaternion;
        }
        get viewerSpace() {
            var e;
            return !((e = this[b].actionPlayer) === null || e === void 0) && e.playing ? this[b].actionPlayer.viewerSpace : this[b].viewerSpace;
        }
        get viewSpaces() {
            var e;
            return !((e = this[b].actionPlayer) === null || e === void 0) && e.playing ? this[b].actionPlayer.viewSpaces : this[b].viewSpaces;
        }
        get controllers() {
            return this[b].controllers;
        }
        get hands() {
            return this[b].hands;
        }
        get primaryInputMode() {
            return this[b].primaryInputMode;
        }
        set primaryInputMode(e) {
            if (e !== "controller" && e !== "hand") {
                console.warn('primary input mode can only be "controller" or "hand"');
                return;
            }
            this[b].primaryInputMode = e;
        }
        get activeInputs() {
            return this[b].visibilityState !== "visible" ? [] : (this[b].primaryInputMode === "controller" ? Object.values(this[b].controllers) : Object.values(this[b].hands)).filter((n)=>n.connected);
        }
        get inputSources() {
            var e;
            return !((e = this[b].actionPlayer) === null || e === void 0) && e.playing ? this[b].actionPlayer.inputSources : this.activeInputs.map((n)=>n.inputSource);
        }
        get canvasContainer() {
            return this[b].canvasContainer;
        }
        get canvasDimensions() {
            if (this[b].canvasData) {
                const { width: e, height: n } = this[b].canvasData.canvas;
                return {
                    width: e,
                    height: n
                };
            }
        }
        get appCanvas() {
            var e;
            return (e = this[b].canvasData) === null || e === void 0 ? void 0 : e.canvas;
        }
        get activeSession() {
            var e;
            return (e = this[b].xrSystem) === null || e === void 0 ? void 0 : e[$e].activeSession;
        }
        get sessionOffered() {
            var e;
            return !!(!((e = this[b].xrSystem) === null || e === void 0) && e[$e].offeredSessionConfig);
        }
        get name() {
            return this[b].name;
        }
        grantOfferedSession() {
            const e = this[b].xrSystem, n = e?.[$e];
            if (n && n.offeredSessionConfig) {
                const { resolve: i, reject: r, mode: s, options: a } = n.offeredSessionConfig;
                n.offeredSessionConfig = void 0, e.requestSession(s, a).then(i).catch(r);
            }
        }
        recenter() {
            const e = new hn(-this.position.x, 0, -this.position.z), n = new hn(0, 0, -1).applyQuaternion(this.quaternion);
            n.y = 0, n.normalize();
            const i = Math.atan2(n.x, -n.z), r = new Bi().setFromAxisAngle(new hn(0, 1, 0), i);
            this.position.add(e), this.quaternion.multiply(r), [
                ...Object.values(this[b].controllers),
                ...Object.values(this[b].hands)
            ].forEach((s)=>{
                s.position.add(e), s.quaternion.multiply(r), s.position.applyQuaternion(r);
            }), this[b].pendingReferenceSpaceReset = !0;
        }
        get visibilityState() {
            return this[b].visibilityState;
        }
        updateVisibilityState(e) {
            if (!Object.values([
                "visible",
                "visible-blurred",
                "hidden"
            ]).includes(e)) throw new DOMException("Invalid XRVisibilityState value", "NotSupportedError");
            e !== this[b].visibilityState && (this[b].pendingVisibilityState = e);
        }
        createActionPlayer(e, n) {
            return this[b].actionPlayer = new y3(e, n, this[b].ipd), this[b].actionPlayer;
        }
        get devui() {
            return this[b].devui;
        }
        get sem() {
            return this[b].sem;
        }
        get remote() {
            return this[b].remote;
        }
        get controlMode() {
            return this[b].controlMode;
        }
        set controlMode(e) {
            if (e !== "manual" && e !== "programmatic") {
                console.warn('control mode can only be "manual" or "programmatic"');
                return;
            }
            this[b].controlMode !== e && (this[b].controlMode = e, this[b].controlModeListeners.forEach((i)=>i(e)));
        }
        onControlModeChange(e) {
            return this[b].controlModeListeners.add(e), ()=>{
                this[b].controlModeListeners.delete(e);
            };
        }
        onStateChange(e) {
            return this[b].stateChangeListeners.add(e), ()=>{
                this[b].stateChangeListeners.delete(e);
            };
        }
        notifyStateChange() {
            this[b].stateChangeListeners.forEach((e)=>e());
        }
    }
    const as = {
        mapping: Yi.XRStandard,
        buttons: [
            {
                id: "trigger",
                type: "analog",
                eventTrigger: "select"
            },
            {
                id: "squeeze",
                type: "analog",
                eventTrigger: "squeeze"
            },
            null,
            {
                id: "thumbstick",
                type: "binary"
            },
            {
                id: "x-button",
                type: "binary"
            },
            {
                id: "y-button",
                type: "binary"
            },
            {
                id: "thumbrest",
                type: "binary"
            }
        ],
        axes: [
            null,
            null,
            {
                id: "thumbstick",
                type: "x-axis"
            },
            {
                id: "thumbstick",
                type: "y-axis"
            }
        ]
    }, os = {
        mapping: Yi.XRStandard,
        buttons: [
            {
                id: "trigger",
                type: "analog",
                eventTrigger: "select"
            },
            {
                id: "squeeze",
                type: "analog",
                eventTrigger: "squeeze"
            },
            null,
            {
                id: "thumbstick",
                type: "binary"
            },
            {
                id: "a-button",
                type: "binary"
            },
            {
                id: "b-button",
                type: "binary"
            },
            {
                id: "thumbrest",
                type: "binary"
            }
        ],
        axes: [
            null,
            null,
            {
                id: "thumbstick",
                type: "x-axis"
            },
            {
                id: "thumbstick",
                type: "y-axis"
            }
        ]
    }, Y3 = {
        profileId: "oculus-touch-v2",
        fallbackProfileIds: [
            "oculus-touch",
            "generic-trigger-squeeze-thumbstick"
        ],
        layout: {
            left: {
                gamepad: as,
                gripOffsetMatrix: [
                    .9925461411476135,
                    4673031295254759e-24,
                    -.12186938524246216,
                    0,
                    .08617470413446426,
                    .7071065306663513,
                    .7018362283706665,
                    0,
                    .0861746296286583,
                    -.70710688829422,
                    .7018358707427979,
                    0,
                    -.003979847766458988,
                    -.01585787907242775,
                    .04964185878634453,
                    1
                ],
                numHapticActuators: 1
            },
            right: {
                gamepad: os,
                gripOffsetMatrix: [
                    .9925461411476135,
                    3688163374704345e-23,
                    .12186937034130096,
                    0,
                    -.08617469668388367,
                    .7071066498756409,
                    .7018361687660217,
                    0,
                    -.0861746147274971,
                    -.7071068286895752,
                    .7018359899520874,
                    0,
                    .003979853354394436,
                    -.01585787907242775,
                    .04964182525873184,
                    1
                ],
                numHapticActuators: 1
            }
        }
    }, Z3 = {
        profileId: "oculus-touch-v3",
        fallbackProfileIds: [
            "oculus-touch",
            "generic-trigger-squeeze-thumbstick"
        ],
        layout: {
            left: {
                gamepad: as,
                gripOffsetMatrix: [
                    .9925461411476135,
                    20823669899527886e-24,
                    -.12186937034130096,
                    0,
                    .08617465198040009,
                    .7071067094802856,
                    .701836109161377,
                    0,
                    .08617466688156128,
                    -.7071067690849304,
                    .7018360495567322,
                    0,
                    -.003979838453233242,
                    -.015857907012104988,
                    .04964181408286095,
                    1
                ],
                numHapticActuators: 1
            },
            right: {
                gamepad: os,
                gripOffsetMatrix: [
                    .9925461411476135,
                    -8329467959811154e-23,
                    .12186941504478455,
                    0,
                    -.08617465943098068,
                    .7071066498756409,
                    .7018361687660217,
                    0,
                    -.08617471158504486,
                    -.7071068286895752,
                    .7018359303474426,
                    0,
                    .003979798872023821,
                    -.015857888385653496,
                    .049641866236925125,
                    1
                ],
                numHapticActuators: 1
            }
        }
    }, Q3 = {
        profileId: "meta-quest-touch-pro",
        fallbackProfileIds: [
            "oculus-touch-v2",
            "oculus-touch",
            "generic-trigger-squeeze-thumbstick"
        ],
        layout: {
            left: {
                gamepad: as,
                gripOffsetMatrix: [
                    .9925461411476135,
                    -15779937356796836e-24,
                    -.12186935544013977,
                    0,
                    .08617467433214188,
                    .7071067094802856,
                    .701836109161377,
                    0,
                    .0861746296286583,
                    -.7071067690849304,
                    .7018360495567322,
                    0,
                    -.003979836590588093,
                    -.015857847407460213,
                    .049641840159893036,
                    1
                ],
                numHapticActuators: 3
            },
            right: {
                gamepad: os,
                gripOffsetMatrix: [
                    .9925461411476135,
                    9267653311439972e-26,
                    .12186937034130096,
                    0,
                    -.08617467433214188,
                    .7071067094802856,
                    .7018361687660217,
                    0,
                    -.08617464452981949,
                    -.7071067690849304,
                    .7018360495567322,
                    0,
                    .003979847766458988,
                    -.01585782691836357,
                    .04964186251163483,
                    1
                ],
                numHapticActuators: 3
            }
        }
    }, K3 = {
        profileId: "meta-quest-touch-plus",
        fallbackProfileIds: [
            "oculus-touch-v3",
            "oculus-touch",
            "generic-trigger-squeeze-thumbstick"
        ],
        layout: {
            left: {
                gamepad: as,
                gripOffsetMatrix: [
                    .9925461411476135,
                    10736208366779465e-24,
                    -.12186933308839798,
                    0,
                    .08617459982633591,
                    .70710688829422,
                    .7018360495567322,
                    0,
                    .08617466688156128,
                    -.7071067094802856,
                    .7018362283706665,
                    0,
                    -.003979803062975407,
                    -.015857873484492302,
                    .04964187368750572,
                    1
                ],
                numHapticActuators: 1
            },
            right: {
                gamepad: os,
                gripOffsetMatrix: [
                    .9925461411476135,
                    -26238110351073374e-24,
                    .12186934053897858,
                    0,
                    -.0861746147274971,
                    .7071067690849304,
                    .7018360495567322,
                    0,
                    -.08617465943098068,
                    -.7071067094802856,
                    .701836109161377,
                    0,
                    .003979838453233242,
                    -.015857869759202003,
                    .04964182525873184,
                    1
                ],
                numHapticActuators: 1
            }
        }
    }, J3 = {
        name: "Oculus Quest 1",
        controllerConfig: Y3,
        supportedSessionModes: [
            "inline",
            "immersive-vr",
            "immersive-ar"
        ],
        supportedFeatures: [
            "viewer",
            "local",
            "local-floor",
            "bounded-floor",
            "unbounded",
            "anchors",
            "plane-detection",
            "hand-tracking"
        ],
        supportedFrameRates: [
            72,
            80,
            90
        ],
        isSystemKeyboardSupported: !0,
        internalNominalFrameRate: 72,
        environmentBlendModes: {
            "immersive-vr": it.Opaque,
            "immersive-ar": it.AlphaBlend
        },
        interactionMode: ai.WorldSpace,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64; Quest 1) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0.0.x.x.x Chrome/126.0.6478.122 VR Safari/537.36"
    }, e5 = {
        name: "Meta Quest 2",
        controllerConfig: Z3,
        supportedSessionModes: [
            "inline",
            "immersive-vr",
            "immersive-ar"
        ],
        supportedFeatures: [
            "viewer",
            "local",
            "local-floor",
            "bounded-floor",
            "unbounded",
            "anchors",
            "plane-detection",
            "mesh-detection",
            "hit-test",
            "hand-tracking"
        ],
        supportedFrameRates: [
            72,
            80,
            90,
            120
        ],
        isSystemKeyboardSupported: !0,
        internalNominalFrameRate: 72,
        environmentBlendModes: {
            "immersive-vr": it.Opaque,
            "immersive-ar": it.AlphaBlend
        },
        interactionMode: ai.WorldSpace,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0.0.x.x.x Chrome/126.0.6478.122 VR Safari/537.36"
    }, t5 = {
        name: "Meta Quest Pro",
        controllerConfig: Q3,
        supportedSessionModes: [
            "inline",
            "immersive-vr",
            "immersive-ar"
        ],
        supportedFeatures: [
            "viewer",
            "local",
            "local-floor",
            "bounded-floor",
            "unbounded",
            "anchors",
            "plane-detection",
            "mesh-detection",
            "hit-test",
            "hand-tracking"
        ],
        supportedFrameRates: [
            72,
            80,
            90,
            120
        ],
        isSystemKeyboardSupported: !0,
        internalNominalFrameRate: 90,
        environmentBlendModes: {
            "immersive-vr": it.Opaque,
            "immersive-ar": it.AlphaBlend
        },
        interactionMode: ai.WorldSpace,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64; Quest Pro) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0.0.x.x.x Chrome/126.0.6478.122 VR Safari/537.36"
    }, n5 = {
        name: "Meta Quest 3",
        controllerConfig: K3,
        supportedSessionModes: [
            "inline",
            "immersive-vr",
            "immersive-ar"
        ],
        supportedFeatures: [
            "viewer",
            "local",
            "local-floor",
            "bounded-floor",
            "unbounded",
            "anchors",
            "plane-detection",
            "mesh-detection",
            "hit-test",
            "hand-tracking",
            "depth-sensing"
        ],
        supportedFrameRates: [
            72,
            80,
            90,
            120
        ],
        isSystemKeyboardSupported: !0,
        internalNominalFrameRate: 90,
        environmentBlendModes: {
            "immersive-vr": it.Opaque,
            "immersive-ar": it.AlphaBlend
        },
        interactionMode: ai.WorldSpace,
        userAgent: "Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0.0.x.x.x Chrome/126.0.6478.122 VR Safari/537.36"
    };
    function i5() {
        let t = 0, e = 0;
        for(let i = 0; i < 28; i += 7){
            let r = this.buf[this.pos++];
            if (t |= (r & 127) << i, (r & 128) == 0) return this.assertBounds(), [
                t,
                e
            ];
        }
        let n = this.buf[this.pos++];
        if (t |= (n & 15) << 28, e = (n & 112) >> 4, (n & 128) == 0) return this.assertBounds(), [
            t,
            e
        ];
        for(let i = 3; i <= 31; i += 7){
            let r = this.buf[this.pos++];
            if (e |= (r & 127) << i, (r & 128) == 0) return this.assertBounds(), [
                t,
                e
            ];
        }
        throw new Error("invalid varint");
    }
    function Us(t, e, n) {
        for(let s = 0; s < 28; s = s + 7){
            const a = t >>> s, o = !(!(a >>> 7) && e == 0), l = (o ? a | 128 : a) & 255;
            if (n.push(l), !o) return;
        }
        const i = t >>> 28 & 15 | (e & 7) << 4, r = e >> 3 != 0;
        if (n.push((r ? i | 128 : i) & 255), !!r) {
            for(let s = 3; s < 31; s = s + 7){
                const a = e >>> s, o = !!(a >>> 7), l = (o ? a | 128 : a) & 255;
                if (n.push(l), !o) return;
            }
            n.push(e >>> 31 & 1);
        }
    }
    const Ar = 4294967296;
    function uc(t) {
        const e = t[0] === "-";
        e && (t = t.slice(1));
        const n = 1e6;
        let i = 0, r = 0;
        function s(a, o) {
            const l = Number(t.slice(a, o));
            r *= n, i = i * n + l, i >= Ar && (r = r + (i / Ar | 0), i = i % Ar);
        }
        return s(-24, -18), s(-18, -12), s(-12, -6), s(-6), e ? Uu(i, r) : mo(i, r);
    }
    function r5(t, e) {
        let n = mo(t, e);
        const i = n.hi & 2147483648;
        i && (n = Uu(n.lo, n.hi));
        const r = ju(n.lo, n.hi);
        return i ? "-" + r : r;
    }
    function ju(t, e) {
        if ({ lo: t, hi: e } = s5(t, e), e <= 2097151) return String(Ar * e + t);
        const n = t & 16777215, i = (t >>> 24 | e << 8) & 16777215, r = e >> 16 & 65535;
        let s = n + i * 6777216 + r * 6710656, a = i + r * 8147497, o = r * 2;
        const l = 1e7;
        return s >= l && (a += Math.floor(s / l), s %= l), a >= l && (o += Math.floor(a / l), a %= l), o.toString() + hc(a) + hc(s);
    }
    function s5(t, e) {
        return {
            lo: t >>> 0,
            hi: e >>> 0
        };
    }
    function mo(t, e) {
        return {
            lo: t | 0,
            hi: e | 0
        };
    }
    function Uu(t, e) {
        return e = ~e, t ? t = ~t + 1 : e += 1, mo(t, e);
    }
    const hc = (t)=>{
        const e = String(t);
        return "0000000".slice(e.length) + e;
    };
    function dc(t, e) {
        if (t >= 0) {
            for(; t > 127;)e.push(t & 127 | 128), t = t >>> 7;
            e.push(t);
        } else {
            for(let n = 0; n < 9; n++)e.push(t & 127 | 128), t = t >> 7;
            e.push(1);
        }
    }
    function a5() {
        let t = this.buf[this.pos++], e = t & 127;
        if ((t & 128) == 0) return this.assertBounds(), e;
        if (t = this.buf[this.pos++], e |= (t & 127) << 7, (t & 128) == 0) return this.assertBounds(), e;
        if (t = this.buf[this.pos++], e |= (t & 127) << 14, (t & 128) == 0) return this.assertBounds(), e;
        if (t = this.buf[this.pos++], e |= (t & 127) << 21, (t & 128) == 0) return this.assertBounds(), e;
        t = this.buf[this.pos++], e |= (t & 15) << 28;
        for(let n = 5; (t & 128) !== 0 && n < 10; n++)t = this.buf[this.pos++];
        if ((t & 128) != 0) throw new Error("invalid varint");
        return this.assertBounds(), e >>> 0;
    }
    var fc = {};
    const lt = o5();
    function o5() {
        const t = new DataView(new ArrayBuffer(8));
        if (typeof BigInt == "function" && typeof t.getBigInt64 == "function" && typeof t.getBigUint64 == "function" && typeof t.setBigInt64 == "function" && typeof t.setBigUint64 == "function" && (!!globalThis.Deno || typeof process != "object" || typeof fc != "object" || fc.BUF_BIGINT_DISABLE !== "1")) {
            const n = BigInt("-9223372036854775808"), i = BigInt("9223372036854775807"), r = BigInt("0"), s = BigInt("18446744073709551615");
            return {
                zero: BigInt(0),
                supported: !0,
                parse (a) {
                    const o = typeof a == "bigint" ? a : BigInt(a);
                    if (o > i || o < n) throw new Error(`invalid int64: ${a}`);
                    return o;
                },
                uParse (a) {
                    const o = typeof a == "bigint" ? a : BigInt(a);
                    if (o > s || o < r) throw new Error(`invalid uint64: ${a}`);
                    return o;
                },
                enc (a) {
                    return t.setBigInt64(0, this.parse(a), !0), {
                        lo: t.getInt32(0, !0),
                        hi: t.getInt32(4, !0)
                    };
                },
                uEnc (a) {
                    return t.setBigInt64(0, this.uParse(a), !0), {
                        lo: t.getInt32(0, !0),
                        hi: t.getInt32(4, !0)
                    };
                },
                dec (a, o) {
                    return t.setInt32(0, a, !0), t.setInt32(4, o, !0), t.getBigInt64(0, !0);
                },
                uDec (a, o) {
                    return t.setInt32(0, a, !0), t.setInt32(4, o, !0), t.getBigUint64(0, !0);
                }
            };
        }
        return {
            zero: "0",
            supported: !1,
            parse (n) {
                return typeof n != "string" && (n = n.toString()), pc(n), n;
            },
            uParse (n) {
                return typeof n != "string" && (n = n.toString()), mc(n), n;
            },
            enc (n) {
                return typeof n != "string" && (n = n.toString()), pc(n), uc(n);
            },
            uEnc (n) {
                return typeof n != "string" && (n = n.toString()), mc(n), uc(n);
            },
            dec (n, i) {
                return r5(n, i);
            },
            uDec (n, i) {
                return ju(n, i);
            }
        };
    }
    function pc(t) {
        if (!/^-?[0-9]+$/.test(t)) throw new Error("invalid int64: " + t);
    }
    function mc(t) {
        if (!/^[0-9]+$/.test(t)) throw new Error("invalid uint64: " + t);
    }
    const Vs = Symbol.for("@bufbuild/protobuf/text-encoding");
    function Vu() {
        if (globalThis[Vs] == null) {
            const t = new globalThis.TextEncoder, e = new globalThis.TextDecoder;
            let n;
            globalThis[Vs] = {
                encodeUtf8 (i) {
                    return t.encode(i);
                },
                decodeUtf8 (i, r) {
                    return r ? (n === void 0 && (n = new globalThis.TextDecoder("utf-8", {
                        fatal: !0
                    })), n.decode(i)) : e.decode(i);
                },
                checkUtf8 (i) {
                    try {
                        return encodeURIComponent(i), !0;
                    } catch  {
                        return !1;
                    }
                }
            };
        }
        return globalThis[Vs];
    }
    var Ft;
    (function(t) {
        t[t.Varint = 0] = "Varint", t[t.Bit64 = 1] = "Bit64", t[t.LengthDelimited = 2] = "LengthDelimited", t[t.StartGroup = 3] = "StartGroup", t[t.EndGroup = 4] = "EndGroup", t[t.Bit32 = 5] = "Bit32";
    })(Ft || (Ft = {}));
    const l5 = 34028234663852886e22, c5 = -34028234663852886e22, u5 = 4294967295, h5 = 2147483647, d5 = -2147483648;
    class Ie {
        constructor(e = Vu().encodeUtf8){
            this.encodeUtf8 = e, this.stack = [], this.chunks = [], this.buf = [];
        }
        finish() {
            this.buf.length && (this.chunks.push(new Uint8Array(this.buf)), this.buf = []);
            let e = 0;
            for(let r = 0; r < this.chunks.length; r++)e += this.chunks[r].length;
            let n = new Uint8Array(e), i = 0;
            for(let r = 0; r < this.chunks.length; r++)n.set(this.chunks[r], i), i += this.chunks[r].length;
            return this.chunks = [], n;
        }
        fork() {
            return this.stack.push({
                chunks: this.chunks,
                buf: this.buf
            }), this.chunks = [], this.buf = [], this;
        }
        join() {
            let e = this.finish(), n = this.stack.pop();
            if (!n) throw new Error("invalid state, fork stack empty");
            return this.chunks = n.chunks, this.buf = n.buf, this.uint32(e.byteLength), this.raw(e);
        }
        tag(e, n) {
            return this.uint32((e << 3 | n) >>> 0);
        }
        raw(e) {
            return this.buf.length && (this.chunks.push(new Uint8Array(this.buf)), this.buf = []), this.chunks.push(e), this;
        }
        uint32(e) {
            for(gc(e); e > 127;)this.buf.push(e & 127 | 128), e = e >>> 7;
            return this.buf.push(e), this;
        }
        int32(e) {
            return Gs(e), dc(e, this.buf), this;
        }
        bool(e) {
            return this.buf.push(e ? 1 : 0), this;
        }
        bytes(e) {
            return this.uint32(e.byteLength), this.raw(e);
        }
        string(e) {
            let n = this.encodeUtf8(e);
            return this.uint32(n.byteLength), this.raw(n);
        }
        float(e) {
            f5(e);
            let n = new Uint8Array(4);
            return new DataView(n.buffer).setFloat32(0, e, !0), this.raw(n);
        }
        double(e) {
            let n = new Uint8Array(8);
            return new DataView(n.buffer).setFloat64(0, e, !0), this.raw(n);
        }
        fixed32(e) {
            gc(e);
            let n = new Uint8Array(4);
            return new DataView(n.buffer).setUint32(0, e, !0), this.raw(n);
        }
        sfixed32(e) {
            Gs(e);
            let n = new Uint8Array(4);
            return new DataView(n.buffer).setInt32(0, e, !0), this.raw(n);
        }
        sint32(e) {
            return Gs(e), e = (e << 1 ^ e >> 31) >>> 0, dc(e, this.buf), this;
        }
        sfixed64(e) {
            let n = new Uint8Array(8), i = new DataView(n.buffer), r = lt.enc(e);
            return i.setInt32(0, r.lo, !0), i.setInt32(4, r.hi, !0), this.raw(n);
        }
        fixed64(e) {
            let n = new Uint8Array(8), i = new DataView(n.buffer), r = lt.uEnc(e);
            return i.setInt32(0, r.lo, !0), i.setInt32(4, r.hi, !0), this.raw(n);
        }
        int64(e) {
            let n = lt.enc(e);
            return Us(n.lo, n.hi, this.buf), this;
        }
        sint64(e) {
            const n = lt.enc(e), i = n.hi >> 31, r = n.lo << 1 ^ i, s = (n.hi << 1 | n.lo >>> 31) ^ i;
            return Us(r, s, this.buf), this;
        }
        uint64(e) {
            const n = lt.uEnc(e);
            return Us(n.lo, n.hi, this.buf), this;
        }
    }
    class Q {
        constructor(e, n = Vu().decodeUtf8){
            this.decodeUtf8 = n, this.varint64 = i5, this.uint32 = a5, this.buf = e, this.len = e.length, this.pos = 0, this.view = new DataView(e.buffer, e.byteOffset, e.byteLength);
        }
        tag() {
            const e = this.pos, n = this.uint32(), i = this.pos - e;
            if (i > 5 || i == 5 && this.buf[this.pos - 1] > 15) throw new Error("illegal tag: varint overflows uint32");
            const r = n >>> 3, s = n & 7;
            if (r <= 0 || s > 5) throw new Error("illegal tag: field no " + r + " wire type " + s);
            return [
                r,
                s
            ];
        }
        skip(e, n) {
            let i = this.pos;
            switch(e){
                case Ft.Varint:
                    for(; this.buf[this.pos++] & 128;);
                    break;
                case Ft.Bit64:
                    this.pos += 4;
                case Ft.Bit32:
                    this.pos += 4;
                    break;
                case Ft.LengthDelimited:
                    let r = this.uint32();
                    this.pos += r;
                    break;
                case Ft.StartGroup:
                    for(;;){
                        const [s, a] = this.tag();
                        if (a === Ft.EndGroup) {
                            if (n !== void 0 && s !== n) throw new Error("invalid end group tag");
                            break;
                        }
                        this.skip(a, s);
                    }
                    break;
                default:
                    throw new Error("cant skip wire type " + e);
            }
            return this.assertBounds(), this.buf.subarray(i, this.pos);
        }
        assertBounds() {
            if (this.pos > this.len) throw new RangeError("premature EOF");
        }
        int32() {
            return this.uint32() | 0;
        }
        sint32() {
            let e = this.uint32();
            return e >>> 1 ^ -(e & 1);
        }
        int64() {
            return lt.dec(...this.varint64());
        }
        uint64() {
            return lt.uDec(...this.varint64());
        }
        sint64() {
            let [e, n] = this.varint64(), i = -(e & 1);
            return e = (e >>> 1 | (n & 1) << 31) ^ i, n = n >>> 1 ^ i, lt.dec(e, n);
        }
        bool() {
            let [e, n] = this.varint64();
            return e !== 0 || n !== 0;
        }
        fixed32() {
            return this.view.getUint32((this.pos += 4) - 4, !0);
        }
        sfixed32() {
            return this.view.getInt32((this.pos += 4) - 4, !0);
        }
        fixed64() {
            return lt.uDec(this.sfixed32(), this.sfixed32());
        }
        sfixed64() {
            return lt.dec(this.sfixed32(), this.sfixed32());
        }
        float() {
            return this.view.getFloat32((this.pos += 4) - 4, !0);
        }
        double() {
            return this.view.getFloat64((this.pos += 8) - 8, !0);
        }
        bytes() {
            let e = this.uint32(), n = this.pos;
            return this.pos += e, this.assertBounds(), this.buf.subarray(n, n + e);
        }
        string(e) {
            return this.decodeUtf8(this.bytes(), e);
        }
    }
    function Gs(t) {
        if (typeof t == "string") t = Number(t);
        else if (typeof t != "number") throw new Error("invalid int32: " + typeof t);
        if (!Number.isInteger(t) || t > h5 || t < d5) throw new Error("invalid int32: " + t);
    }
    function gc(t) {
        if (typeof t == "string") t = Number(t);
        else if (typeof t != "number") throw new Error("invalid uint32: " + typeof t);
        if (!Number.isInteger(t) || t > u5 || t < 0) throw new Error("invalid uint32: " + t);
    }
    function f5(t) {
        if (typeof t == "string") {
            const e = t;
            if (t = Number(t), Number.isNaN(t) && e !== "NaN") throw new Error("invalid float32: " + e);
        } else if (typeof t != "number") throw new Error("invalid float32: " + typeof t);
        if (Number.isFinite(t) && (t > l5 || t < c5)) throw new Error("invalid float32: " + t);
    }
    function xc() {
        return {
            x: 0,
            y: 0
        };
    }
    const Cn = {
        encode (t, e = new Ie) {
            return t.x !== 0 && e.uint32(13).float(t.x), t.y !== 0 && e.uint32(21).float(t.y), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = xc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 13) break;
                            r.x = n.float();
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 21) break;
                            r.y = n.float();
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                x: fe(t.x) ? globalThis.Number(t.x) : 0,
                y: fe(t.y) ? globalThis.Number(t.y) : 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.x !== 0 && (e.x = t.x), t.y !== 0 && (e.y = t.y), e;
        },
        create (t) {
            return Cn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e, n;
            const i = xc();
            return i.x = (e = t.x) !== null && e !== void 0 ? e : 0, i.y = (n = t.y) !== null && n !== void 0 ? n : 0, i;
        }
    };
    function yc() {
        return {
            width: 0,
            height: 0
        };
    }
    const Nn = {
        encode (t, e = new Ie) {
            return t.width !== 0 && e.uint32(13).float(t.width), t.height !== 0 && e.uint32(21).float(t.height), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = yc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 13) break;
                            r.width = n.float();
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 21) break;
                            r.height = n.float();
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                width: fe(t.width) ? globalThis.Number(t.width) : 0,
                height: fe(t.height) ? globalThis.Number(t.height) : 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.width !== 0 && (e.width = t.width), t.height !== 0 && (e.height = t.height), e;
        },
        create (t) {
            return Nn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e, n;
            const i = yc();
            return i.width = (e = t.width) !== null && e !== void 0 ? e : 0, i.height = (n = t.height) !== null && n !== void 0 ? n : 0, i;
        }
    };
    function vc() {
        return {
            x: 0,
            y: 0,
            z: 0
        };
    }
    const Je = {
        encode (t, e = new Ie) {
            return t.x !== 0 && e.uint32(13).float(t.x), t.y !== 0 && e.uint32(21).float(t.y), t.z !== 0 && e.uint32(29).float(t.z), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = vc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 13) break;
                            r.x = n.float();
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 21) break;
                            r.y = n.float();
                            continue;
                        }
                    case 3:
                        {
                            if (s !== 29) break;
                            r.z = n.float();
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                x: fe(t.x) ? globalThis.Number(t.x) : 0,
                y: fe(t.y) ? globalThis.Number(t.y) : 0,
                z: fe(t.z) ? globalThis.Number(t.z) : 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.x !== 0 && (e.x = t.x), t.y !== 0 && (e.y = t.y), t.z !== 0 && (e.z = t.z), e;
        },
        create (t) {
            return Je.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e, n, i;
            const r = vc();
            return r.x = (e = t.x) !== null && e !== void 0 ? e : 0, r.y = (n = t.y) !== null && n !== void 0 ? n : 0, r.z = (i = t.z) !== null && i !== void 0 ? i : 0, r;
        }
    };
    function wc() {
        return {
            width: 0,
            height: 0,
            depth: 0
        };
    }
    const Fn = {
        encode (t, e = new Ie) {
            return t.width !== 0 && e.uint32(13).float(t.width), t.height !== 0 && e.uint32(21).float(t.height), t.depth !== 0 && e.uint32(29).float(t.depth), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = wc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 13) break;
                            r.width = n.float();
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 21) break;
                            r.height = n.float();
                            continue;
                        }
                    case 3:
                        {
                            if (s !== 29) break;
                            r.depth = n.float();
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                width: fe(t.width) ? globalThis.Number(t.width) : 0,
                height: fe(t.height) ? globalThis.Number(t.height) : 0,
                depth: fe(t.depth) ? globalThis.Number(t.depth) : 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.width !== 0 && (e.width = t.width), t.height !== 0 && (e.height = t.height), t.depth !== 0 && (e.depth = t.depth), e;
        },
        create (t) {
            return Fn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e, n, i;
            const r = wc();
            return r.width = (e = t.width) !== null && e !== void 0 ? e : 0, r.height = (n = t.height) !== null && n !== void 0 ? n : 0, r.depth = (i = t.depth) !== null && i !== void 0 ? i : 0, r;
        }
    };
    function bc() {
        return {
            x: 0,
            y: 0,
            z: 0,
            w: 0
        };
    }
    const zn = {
        encode (t, e = new Ie) {
            return t.x !== 0 && e.uint32(13).float(t.x), t.y !== 0 && e.uint32(21).float(t.y), t.z !== 0 && e.uint32(29).float(t.z), t.w !== 0 && e.uint32(37).float(t.w), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = bc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 13) break;
                            r.x = n.float();
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 21) break;
                            r.y = n.float();
                            continue;
                        }
                    case 3:
                        {
                            if (s !== 29) break;
                            r.z = n.float();
                            continue;
                        }
                    case 4:
                        {
                            if (s !== 37) break;
                            r.w = n.float();
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                x: fe(t.x) ? globalThis.Number(t.x) : 0,
                y: fe(t.y) ? globalThis.Number(t.y) : 0,
                z: fe(t.z) ? globalThis.Number(t.z) : 0,
                w: fe(t.w) ? globalThis.Number(t.w) : 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.x !== 0 && (e.x = t.x), t.y !== 0 && (e.y = t.y), t.z !== 0 && (e.z = t.z), t.w !== 0 && (e.w = t.w), e;
        },
        create (t) {
            return zn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e, n, i, r;
            const s = bc();
            return s.x = (e = t.x) !== null && e !== void 0 ? e : 0, s.y = (n = t.y) !== null && n !== void 0 ? n : 0, s.z = (i = t.z) !== null && i !== void 0 ? i : 0, s.w = (r = t.w) !== null && r !== void 0 ? r : 0, s;
        }
    };
    function Tc() {
        return {
            offset: void 0,
            extent: void 0
        };
    }
    const Dn = {
        encode (t, e = new Ie) {
            return t.offset !== void 0 && Cn.encode(t.offset, e.uint32(10).fork()).join(), t.extent !== void 0 && Nn.encode(t.extent, e.uint32(18).fork()).join(), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = Tc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 10) break;
                            r.offset = Cn.decode(n, n.uint32());
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 18) break;
                            r.extent = Nn.decode(n, n.uint32());
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                offset: fe(t.offset) ? Cn.fromJSON(t.offset) : void 0,
                extent: fe(t.extent) ? Nn.fromJSON(t.extent) : void 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.offset !== void 0 && (e.offset = Cn.toJSON(t.offset)), t.extent !== void 0 && (e.extent = Nn.toJSON(t.extent)), e;
        },
        create (t) {
            return Dn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            const e = Tc();
            return e.offset = t.offset !== void 0 && t.offset !== null ? Cn.fromPartial(t.offset) : void 0, e.extent = t.extent !== void 0 && t.extent !== null ? Nn.fromPartial(t.extent) : void 0, e;
        }
    };
    function Ec() {
        return {
            offset: void 0,
            extent: void 0
        };
    }
    const Bn = {
        encode (t, e = new Ie) {
            return t.offset !== void 0 && Je.encode(t.offset, e.uint32(10).fork()).join(), t.extent !== void 0 && Fn.encode(t.extent, e.uint32(18).fork()).join(), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = Ec();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 10) break;
                            r.offset = Je.decode(n, n.uint32());
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 18) break;
                            r.extent = Fn.decode(n, n.uint32());
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                offset: fe(t.offset) ? Je.fromJSON(t.offset) : void 0,
                extent: fe(t.extent) ? Fn.fromJSON(t.extent) : void 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.offset !== void 0 && (e.offset = Je.toJSON(t.offset)), t.extent !== void 0 && (e.extent = Fn.toJSON(t.extent)), e;
        },
        create (t) {
            return Bn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            const e = Ec();
            return e.offset = t.offset !== void 0 && t.offset !== null ? Je.fromPartial(t.offset) : void 0, e.extent = t.extent !== void 0 && t.extent !== null ? Fn.fromPartial(t.extent) : void 0, e;
        }
    };
    function _c() {
        return {
            orientation: void 0,
            position: void 0
        };
    }
    const jn = {
        encode (t, e = new Ie) {
            return t.orientation !== void 0 && zn.encode(t.orientation, e.uint32(10).fork()).join(), t.position !== void 0 && Je.encode(t.position, e.uint32(18).fork()).join(), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = _c();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 10) break;
                            r.orientation = zn.decode(n, n.uint32());
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 18) break;
                            r.position = Je.decode(n, n.uint32());
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                orientation: fe(t.orientation) ? zn.fromJSON(t.orientation) : void 0,
                position: fe(t.position) ? Je.fromJSON(t.position) : void 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.orientation !== void 0 && (e.orientation = zn.toJSON(t.orientation)), t.position !== void 0 && (e.position = Je.toJSON(t.position)), e;
        },
        create (t) {
            return jn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            const e = _c();
            return e.orientation = t.orientation !== void 0 && t.orientation !== null ? zn.fromPartial(t.orientation) : void 0, e.position = t.position !== void 0 && t.position !== null ? Je.fromPartial(t.position) : void 0, e;
        }
    };
    function fe(t) {
        return t != null;
    }
    var li;
    (function(t) {
        t[t.Keyboard = 0] = "Keyboard", t[t.UNRECOGNIZED = -1] = "UNRECOGNIZED";
    })(li || (li = {}));
    function p5(t) {
        switch(t){
            case 0:
            case "Keyboard":
                return li.Keyboard;
            case -1:
            case "UNRECOGNIZED":
            default:
                return li.UNRECOGNIZED;
        }
    }
    function m5(t) {
        switch(t){
            case li.Keyboard:
                return "Keyboard";
            case li.UNRECOGNIZED:
            default:
                return "UNRECOGNIZED";
        }
    }
    var A;
    (function(t) {
        t[t.UNKNOWN = 0] = "UNKNOWN", t[t.FLOOR = 1] = "FLOOR", t[t.CEILING = 2] = "CEILING", t[t.WALL_FACE = 3] = "WALL_FACE", t[t.TABLE = 4] = "TABLE", t[t.COUCH = 5] = "COUCH", t[t.DOOR_FRAME = 6] = "DOOR_FRAME", t[t.WINDOW_FRAME = 7] = "WINDOW_FRAME", t[t.OTHER = 8] = "OTHER", t[t.STORAGE = 9] = "STORAGE", t[t.BED = 10] = "BED", t[t.SCREEN = 11] = "SCREEN", t[t.LAMP = 12] = "LAMP", t[t.PLANT = 13] = "PLANT", t[t.WALL_ART = 14] = "WALL_ART", t[t.GLOBAL_MESH = 15] = "GLOBAL_MESH", t[t.INVISIBLE_WALL_FACE = 16] = "INVISIBLE_WALL_FACE", t[t.CHAIR = 17] = "CHAIR", t[t.INNER_WALL_FACE = 18] = "INNER_WALL_FACE", t[t.OTHER_ROOM_FACE = 19] = "OTHER_ROOM_FACE", t[t.OPENING = 20] = "OPENING", t[t.UNRECOGNIZED = -1] = "UNRECOGNIZED";
    })(A || (A = {}));
    function g5(t) {
        switch(t){
            case 0:
            case "UNKNOWN":
                return A.UNKNOWN;
            case 1:
            case "FLOOR":
                return A.FLOOR;
            case 2:
            case "CEILING":
                return A.CEILING;
            case 3:
            case "WALL_FACE":
                return A.WALL_FACE;
            case 4:
            case "TABLE":
                return A.TABLE;
            case 5:
            case "COUCH":
                return A.COUCH;
            case 6:
            case "DOOR_FRAME":
                return A.DOOR_FRAME;
            case 7:
            case "WINDOW_FRAME":
                return A.WINDOW_FRAME;
            case 8:
            case "OTHER":
                return A.OTHER;
            case 9:
            case "STORAGE":
                return A.STORAGE;
            case 10:
            case "BED":
                return A.BED;
            case 11:
            case "SCREEN":
                return A.SCREEN;
            case 12:
            case "LAMP":
                return A.LAMP;
            case 13:
            case "PLANT":
                return A.PLANT;
            case 14:
            case "WALL_ART":
                return A.WALL_ART;
            case 15:
            case "GLOBAL_MESH":
                return A.GLOBAL_MESH;
            case 16:
            case "INVISIBLE_WALL_FACE":
                return A.INVISIBLE_WALL_FACE;
            case 17:
            case "CHAIR":
                return A.CHAIR;
            case 18:
            case "INNER_WALL_FACE":
                return A.INNER_WALL_FACE;
            case 19:
            case "OTHER_ROOM_FACE":
                return A.OTHER_ROOM_FACE;
            case 20:
            case "OPENING":
                return A.OPENING;
            case -1:
            case "UNRECOGNIZED":
            default:
                return A.UNRECOGNIZED;
        }
    }
    function Ma(t) {
        switch(t){
            case A.UNKNOWN:
                return "UNKNOWN";
            case A.FLOOR:
                return "FLOOR";
            case A.CEILING:
                return "CEILING";
            case A.WALL_FACE:
                return "WALL_FACE";
            case A.TABLE:
                return "TABLE";
            case A.COUCH:
                return "COUCH";
            case A.DOOR_FRAME:
                return "DOOR_FRAME";
            case A.WINDOW_FRAME:
                return "WINDOW_FRAME";
            case A.OTHER:
                return "OTHER";
            case A.STORAGE:
                return "STORAGE";
            case A.BED:
                return "BED";
            case A.SCREEN:
                return "SCREEN";
            case A.LAMP:
                return "LAMP";
            case A.PLANT:
                return "PLANT";
            case A.WALL_ART:
                return "WALL_ART";
            case A.GLOBAL_MESH:
                return "GLOBAL_MESH";
            case A.INVISIBLE_WALL_FACE:
                return "INVISIBLE_WALL_FACE";
            case A.CHAIR:
                return "CHAIR";
            case A.INNER_WALL_FACE:
                return "INNER_WALL_FACE";
            case A.OTHER_ROOM_FACE:
                return "OTHER_ROOM_FACE";
            case A.OPENING:
                return "OPENING";
            case A.UNRECOGNIZED:
            default:
                return "UNRECOGNIZED";
        }
    }
    function Sc() {
        return {
            floorUuid: "",
            ceilingUuid: "",
            wallUuids: []
        };
    }
    const Un = {
        encode (t, e = new Ie) {
            t.floorUuid !== "" && e.uint32(10).string(t.floorUuid), t.ceilingUuid !== "" && e.uint32(18).string(t.ceilingUuid);
            for (const n of t.wallUuids)e.uint32(26).string(n);
            return e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = Sc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 10) break;
                            r.floorUuid = n.string();
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 18) break;
                            r.ceilingUuid = n.string();
                            continue;
                        }
                    case 3:
                        {
                            if (s !== 26) break;
                            r.wallUuids.push(n.string());
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                floorUuid: be(t.floorUuid) ? globalThis.String(t.floorUuid) : "",
                ceilingUuid: be(t.ceilingUuid) ? globalThis.String(t.ceilingUuid) : "",
                wallUuids: globalThis.Array.isArray(t?.wallUuids) ? t.wallUuids.map((e)=>globalThis.String(e)) : []
            };
        },
        toJSON (t) {
            var e;
            const n = {};
            return t.floorUuid !== "" && (n.floorUuid = t.floorUuid), t.ceilingUuid !== "" && (n.ceilingUuid = t.ceilingUuid), !((e = t.wallUuids) === null || e === void 0) && e.length && (n.wallUuids = t.wallUuids), n;
        },
        create (t) {
            return Un.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e, n, i;
            const r = Sc();
            return r.floorUuid = (e = t.floorUuid) !== null && e !== void 0 ? e : "", r.ceilingUuid = (n = t.ceilingUuid) !== null && n !== void 0 ? n : "", r.wallUuids = ((i = t.wallUuids) === null || i === void 0 ? void 0 : i.map((s)=>s)) || [], r;
        }
    };
    function Mc() {
        return {
            uuids: []
        };
    }
    const Vn = {
        encode (t, e = new Ie) {
            for (const n of t.uuids)e.uint32(10).string(n);
            return e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = Mc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 10) break;
                            r.uuids.push(n.string());
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                uuids: globalThis.Array.isArray(t?.uuids) ? t.uuids.map((e)=>globalThis.String(e)) : []
            };
        },
        toJSON (t) {
            var e;
            const n = {};
            return !((e = t.uuids) === null || e === void 0) && e.length && (n.uuids = t.uuids), n;
        },
        create (t) {
            return Vn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e;
            const n = Mc();
            return n.uuids = ((e = t.uuids) === null || e === void 0 ? void 0 : e.map((i)=>i)) || [], n;
        }
    };
    function Ac() {
        return {
            vertices: new Uint8Array(0)
        };
    }
    const Gn = {
        encode (t, e = new Ie) {
            return t.vertices.length !== 0 && e.uint32(10).bytes(t.vertices), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = Ac();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 10) break;
                            r.vertices = n.bytes();
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                vertices: be(t.vertices) ? Aa(t.vertices) : new Uint8Array(0)
            };
        },
        toJSON (t) {
            const e = {};
            return t.vertices.length !== 0 && (e.vertices = Ra(t.vertices)), e;
        },
        create (t) {
            return Gn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e;
            const n = Ac();
            return n.vertices = (e = t.vertices) !== null && e !== void 0 ? e : new Uint8Array(0), n;
        }
    };
    function Rc() {
        return {
            vertices: new Uint8Array(0),
            indices: new Uint8Array(0)
        };
    }
    const $n = {
        encode (t, e = new Ie) {
            return t.vertices.length !== 0 && e.uint32(10).bytes(t.vertices), t.indices.length !== 0 && e.uint32(18).bytes(t.indices), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = Rc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 10) break;
                            r.vertices = n.bytes();
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 18) break;
                            r.indices = n.bytes();
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                vertices: be(t.vertices) ? Aa(t.vertices) : new Uint8Array(0),
                indices: be(t.indices) ? Aa(t.indices) : new Uint8Array(0)
            };
        },
        toJSON (t) {
            const e = {};
            return t.vertices.length !== 0 && (e.vertices = Ra(t.vertices)), t.indices.length !== 0 && (e.indices = Ra(t.indices)), e;
        },
        create (t) {
            return $n.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e, n;
            const i = Rc();
            return i.vertices = (e = t.vertices) !== null && e !== void 0 ? e : new Uint8Array(0), i.indices = (n = t.indices) !== null && n !== void 0 ? n : new Uint8Array(0), i;
        }
    };
    function Pc() {
        return {
            classType: 0
        };
    }
    const Hn = {
        encode (t, e = new Ie) {
            return t.classType !== 0 && e.uint32(8).int32(t.classType), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = Pc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 8) break;
                            r.classType = n.int32();
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                classType: be(t.classType) ? p5(t.classType) : 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.classType !== 0 && (e.classType = m5(t.classType)), e;
        },
        create (t) {
            return Hn.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e;
            const n = Pc();
            return n.classType = (e = t.classType) !== null && e !== void 0 ? e : 0, n;
        }
    };
    function Oc() {
        return {
            uuid: "",
            semanticLabel_META: void 0,
            locatable_META: void 0,
            boundary2D_META: void 0,
            bounded2D_META: void 0,
            bounded3D_META: void 0,
            roomLayout_META: void 0,
            spaceContainer_META: void 0,
            triangleMesh_META: void 0,
            dynamicObject_META: void 0
        };
    }
    const Gu = {
        encode (t, e = new Ie) {
            return t.uuid !== "" && e.uint32(10).string(t.uuid), t.semanticLabel_META !== void 0 && e.uint32(16).int32(t.semanticLabel_META), t.locatable_META !== void 0 && jn.encode(t.locatable_META, e.uint32(26).fork()).join(), t.boundary2D_META !== void 0 && Gn.encode(t.boundary2D_META, e.uint32(34).fork()).join(), t.bounded2D_META !== void 0 && Dn.encode(t.bounded2D_META, e.uint32(42).fork()).join(), t.bounded3D_META !== void 0 && Bn.encode(t.bounded3D_META, e.uint32(50).fork()).join(), t.roomLayout_META !== void 0 && Un.encode(t.roomLayout_META, e.uint32(58).fork()).join(), t.spaceContainer_META !== void 0 && Vn.encode(t.spaceContainer_META, e.uint32(66).fork()).join(), t.triangleMesh_META !== void 0 && $n.encode(t.triangleMesh_META, e.uint32(74).fork()).join(), t.dynamicObject_META !== void 0 && Hn.encode(t.dynamicObject_META, e.uint32(82).fork()).join(), e;
        },
        decode (t, e) {
            const n = t instanceof Q ? t : new Q(t);
            let i = e === void 0 ? n.len : n.pos + e;
            const r = Oc();
            for(; n.pos < i;){
                const s = n.uint32();
                switch(s >>> 3){
                    case 1:
                        {
                            if (s !== 10) break;
                            r.uuid = n.string();
                            continue;
                        }
                    case 2:
                        {
                            if (s !== 16) break;
                            r.semanticLabel_META = n.int32();
                            continue;
                        }
                    case 3:
                        {
                            if (s !== 26) break;
                            r.locatable_META = jn.decode(n, n.uint32());
                            continue;
                        }
                    case 4:
                        {
                            if (s !== 34) break;
                            r.boundary2D_META = Gn.decode(n, n.uint32());
                            continue;
                        }
                    case 5:
                        {
                            if (s !== 42) break;
                            r.bounded2D_META = Dn.decode(n, n.uint32());
                            continue;
                        }
                    case 6:
                        {
                            if (s !== 50) break;
                            r.bounded3D_META = Bn.decode(n, n.uint32());
                            continue;
                        }
                    case 7:
                        {
                            if (s !== 58) break;
                            r.roomLayout_META = Un.decode(n, n.uint32());
                            continue;
                        }
                    case 8:
                        {
                            if (s !== 66) break;
                            r.spaceContainer_META = Vn.decode(n, n.uint32());
                            continue;
                        }
                    case 9:
                        {
                            if (s !== 74) break;
                            r.triangleMesh_META = $n.decode(n, n.uint32());
                            continue;
                        }
                    case 10:
                        {
                            if (s !== 82) break;
                            r.dynamicObject_META = Hn.decode(n, n.uint32());
                            continue;
                        }
                }
                if ((s & 7) === 4 || s === 0) break;
                n.skip(s & 7);
            }
            return r;
        },
        fromJSON (t) {
            return {
                uuid: be(t.uuid) ? globalThis.String(t.uuid) : "",
                semanticLabel_META: be(t.semanticLabel_META) ? g5(t.semanticLabel_META) : void 0,
                locatable_META: be(t.locatable_META) ? jn.fromJSON(t.locatable_META) : void 0,
                boundary2D_META: be(t.boundary2D_META) ? Gn.fromJSON(t.boundary2D_META) : void 0,
                bounded2D_META: be(t.bounded2D_META) ? Dn.fromJSON(t.bounded2D_META) : void 0,
                bounded3D_META: be(t.bounded3D_META) ? Bn.fromJSON(t.bounded3D_META) : void 0,
                roomLayout_META: be(t.roomLayout_META) ? Un.fromJSON(t.roomLayout_META) : void 0,
                spaceContainer_META: be(t.spaceContainer_META) ? Vn.fromJSON(t.spaceContainer_META) : void 0,
                triangleMesh_META: be(t.triangleMesh_META) ? $n.fromJSON(t.triangleMesh_META) : void 0,
                dynamicObject_META: be(t.dynamicObject_META) ? Hn.fromJSON(t.dynamicObject_META) : void 0
            };
        },
        toJSON (t) {
            const e = {};
            return t.uuid !== "" && (e.uuid = t.uuid), t.semanticLabel_META !== void 0 && (e.semanticLabel_META = Ma(t.semanticLabel_META)), t.locatable_META !== void 0 && (e.locatable_META = jn.toJSON(t.locatable_META)), t.boundary2D_META !== void 0 && (e.boundary2D_META = Gn.toJSON(t.boundary2D_META)), t.bounded2D_META !== void 0 && (e.bounded2D_META = Dn.toJSON(t.bounded2D_META)), t.bounded3D_META !== void 0 && (e.bounded3D_META = Bn.toJSON(t.bounded3D_META)), t.roomLayout_META !== void 0 && (e.roomLayout_META = Un.toJSON(t.roomLayout_META)), t.spaceContainer_META !== void 0 && (e.spaceContainer_META = Vn.toJSON(t.spaceContainer_META)), t.triangleMesh_META !== void 0 && (e.triangleMesh_META = $n.toJSON(t.triangleMesh_META)), t.dynamicObject_META !== void 0 && (e.dynamicObject_META = Hn.toJSON(t.dynamicObject_META)), e;
        },
        create (t) {
            return Gu.fromPartial(t ?? {});
        },
        fromPartial (t) {
            var e, n;
            const i = Oc();
            return i.uuid = (e = t.uuid) !== null && e !== void 0 ? e : "", i.semanticLabel_META = (n = t.semanticLabel_META) !== null && n !== void 0 ? n : void 0, i.locatable_META = t.locatable_META !== void 0 && t.locatable_META !== null ? jn.fromPartial(t.locatable_META) : void 0, i.boundary2D_META = t.boundary2D_META !== void 0 && t.boundary2D_META !== null ? Gn.fromPartial(t.boundary2D_META) : void 0, i.bounded2D_META = t.bounded2D_META !== void 0 && t.bounded2D_META !== null ? Dn.fromPartial(t.bounded2D_META) : void 0, i.bounded3D_META = t.bounded3D_META !== void 0 && t.bounded3D_META !== null ? Bn.fromPartial(t.bounded3D_META) : void 0, i.roomLayout_META = t.roomLayout_META !== void 0 && t.roomLayout_META !== null ? Un.fromPartial(t.roomLayout_META) : void 0, i.spaceContainer_META = t.spaceContainer_META !== void 0 && t.spaceContainer_META !== null ? Vn.fromPartial(t.spaceContainer_META) : void 0, i.triangleMesh_META = t.triangleMesh_META !== void 0 && t.triangleMesh_META !== null ? $n.fromPartial(t.triangleMesh_META) : void 0, i.dynamicObject_META = t.dynamicObject_META !== void 0 && t.dynamicObject_META !== null ? Hn.fromPartial(t.dynamicObject_META) : void 0, i;
        }
    };
    function Aa(t) {
        if (globalThis.Buffer) return Uint8Array.from(globalThis.Buffer.from(t, "base64"));
        {
            const e = globalThis.atob(t), n = new Uint8Array(e.length);
            for(let i = 0; i < e.length; ++i)n[i] = e.charCodeAt(i);
            return n;
        }
    }
    function Ra(t) {
        if (globalThis.Buffer) return globalThis.Buffer.from(t).toString("base64");
        {
            const e = [];
            return t.forEach((n)=>{
                e.push(globalThis.String.fromCharCode(n));
            }), globalThis.btoa(e.join(""));
        }
    }
    function be(t) {
        return t != null;
    }
    var K;
    (function(t) {
        t.Locatable = "locatable", t.Bounded3D = "bounded3D", t.Bounded2D = "bounded2D", t.TriangleMesh = "triangleMesh", t.SemanticLabel = "semanticLabel";
    })(K || (K = {}));
    class ir extends EventTarget {
        constructor(e){
            super(), this._spatialEntity = e;
        }
    }
    class x5 extends ir {
        constructor(e, n){
            super(e), this._offset = new xo, this._extent = new xo, this.type = K.Bounded2D;
            const { offset: i, extent: r } = n;
            this._offset.set(i.x, i.y), this._extent.set(r.width, r.height), this.buildGeometry();
        }
        buildGeometry() {
            var e;
            const n = new Qu(this._extent.x, this._extent.y);
            n.translate(this._offset.x + this._extent.x / 2, this._offset.y + this._extent.y / 2, 0), n.rotateX(Math.PI / 2), (e = this._spatialEntity.geometry) === null || e === void 0 || e.dispose(), this._spatialEntity.geometry = n;
        }
        get offset() {
            return this._offset;
        }
        get extent() {
            return this._extent;
        }
        get initData() {
            return {
                offset: this.offset,
                extent: this.extent
            };
        }
        get pbData() {
            return {
                offset: {
                    x: this._offset.x,
                    y: this._offset.y
                },
                extent: {
                    width: this._extent.x,
                    height: this._extent.y
                }
            };
        }
    }
    class y5 extends ir {
        constructor(e, n){
            super(e), this._offset = new M, this._extent = new M, this.type = K.Bounded3D;
            const { offset: i, extent: r } = n;
            this._offset.set(i.x, i.y, i.z), this._extent.set(r.width, r.height, r.depth), this.buildGeometry();
        }
        buildGeometry() {
            var e;
            const n = new Kn(this._extent.x, this._extent.y, this._extent.z);
            n.translate(this._offset.x + this._extent.x / 2, this._offset.y + this._extent.y / 2, this._offset.z + this._extent.z / 2), (e = this._spatialEntity.geometry) === null || e === void 0 || e.dispose(), this._spatialEntity.geometry = n;
        }
        get offset() {
            return this._offset;
        }
        get extent() {
            return this._extent;
        }
        get initData() {
            return {
                offset: this.offset,
                extent: this.extent
            };
        }
        get pbData() {
            return {
                offset: {
                    x: this._offset.x,
                    y: this._offset.y,
                    z: this._offset.z
                },
                extent: {
                    width: this._extent.x,
                    height: this._extent.y,
                    depth: this._extent.z
                }
            };
        }
    }
    class v5 extends ir {
        constructor(e, n){
            super(e), this.type = K.Locatable, n.position && this.position.copy(n.position), n.orientation && this.orientation.copy(n.orientation);
        }
        get position() {
            return this._spatialEntity.position;
        }
        get rotation() {
            return this._spatialEntity.rotation;
        }
        get orientation() {
            return this._spatialEntity.quaternion;
        }
        get initData() {
            return {
                position: {
                    x: this.position.x,
                    y: this.position.y,
                    z: this.position.z
                },
                orientation: {
                    x: this.orientation.x,
                    y: this.orientation.y,
                    z: this.orientation.z,
                    w: this.orientation.w
                }
            };
        }
        get pbData() {
            return {
                position: {
                    x: this._spatialEntity.position.x,
                    y: this._spatialEntity.position.y,
                    z: this._spatialEntity.position.z
                },
                orientation: {
                    x: this._spatialEntity.quaternion.x,
                    y: this._spatialEntity.quaternion.y,
                    z: this._spatialEntity.quaternion.z,
                    w: this._spatialEntity.quaternion.w
                }
            };
        }
    }
    function Ic(t) {
        return t.toLowerCase().replace(/_/g, " ").trim();
    }
    class w5 extends ir {
        constructor(e, n){
            super(e), this._semanticLabel = n, this.type = K.SemanticLabel, this._spatialEntity.name = Ic(Ma(n));
        }
        get semanticLabel() {
            return this._semanticLabel;
        }
        set semanticLabel(e) {
            Object.values(A).includes(e) ? this._semanticLabel = e : this._semanticLabel = A.UNRECOGNIZED, this._spatialEntity.name = Ic(Ma(this._semanticLabel));
        }
        get initData() {
            return this._semanticLabel;
        }
        get pbData() {
            return this._semanticLabel;
        }
    }
    function kc(t) {
        const e = new Float32Array(t.length * 3);
        let n = 0;
        for (const i of t)e[n++] = i.x, e[n++] = i.y, e[n++] = i.z;
        return e;
    }
    class b5 extends ir {
        constructor(e, n){
            super(e), this._polygonCount = 0, this._vertexCount = 0, this._dimensions = {
                x: 0,
                y: 0,
                z: 0
            }, this.type = K.TriangleMesh;
            const { vertices: i, indices: r } = n, s = new Float32Array(i.buffer), a = new Uint32Array(r.buffer), o = [];
            for(let c = 0; c < s.length / 3; c++)o.push({
                x: s[3 * c],
                y: s[3 * c + 1],
                z: s[3 * c + 2]
            });
            this._vertices = o, this._indices = [
                ...a
            ], this.buildGeometry();
            const l = e.material;
            l.polygonOffset = !0, l.polygonOffsetFactor = 1, l.polygonOffsetUnits = .005, l.color.setHex(13948116), e.renderOrder = 999;
        }
        buildGeometry() {
            var e;
            const n = new ka, i = kc(this._vertices);
            n.setAttribute("position", new yo(i, 3)), n.setIndex(new yo(new Uint16Array(this._indices), 1)), (e = this._spatialEntity.geometry) === null || e === void 0 || e.dispose(), this._spatialEntity.geometry = n, n.computeVertexNormals(), this._vertexCount = n.attributes.position.count, this._polygonCount = n.index ? n.index.count / 3 : this._vertexCount / 3, n.computeBoundingBox();
            const r = n.boundingBox;
            this._dimensions = {
                x: r.max.x - r.min.x,
                y: r.max.y - r.min.y,
                z: r.max.z - r.min.z
            };
        }
        get vertexCount() {
            return this._vertexCount;
        }
        get polygonCount() {
            return this._polygonCount;
        }
        get dimensions() {
            return this._dimensions;
        }
        get initData() {
            return {
                vertices: this._vertices,
                indices: this._indices
            };
        }
        get pbData() {
            const e = kc(this._vertices), n = new Uint32Array(this._indices);
            return {
                vertices: new Uint8Array(e.buffer),
                indices: new Uint8Array(n.buffer)
            };
        }
    }
    var Qe;
    (function(t) {
        t.Plane = "plane", t.Box = "box", t.Mesh = "mesh";
    })(Qe || (Qe = {}));
    const T5 = {
        [A.OTHER]: B.Other,
        [A.TABLE]: B.Table,
        [A.COUCH]: B.Couch,
        [A.FLOOR]: B.Floor,
        [A.CEILING]: B.Ceiling,
        [A.WALL_FACE]: B.Wall,
        [A.INVISIBLE_WALL_FACE]: B.Window,
        [A.INNER_WALL_FACE]: B.Wall,
        [A.DOOR_FRAME]: B.Door,
        [A.WINDOW_FRAME]: B.Window,
        [A.WALL_ART]: B.WallArt,
        [A.STORAGE]: B.Shelf,
        [A.BED]: B.Bed,
        [A.LAMP]: B.Lamp,
        [A.SCREEN]: B.Screen,
        [A.PLANT]: B.Plant,
        [A.GLOBAL_MESH]: B.GlobalMesh,
        [A.CHAIR]: B.Couch,
        [A.UNKNOWN]: B.Other,
        [A.OTHER_ROOM_FACE]: B.Other,
        [A.OPENING]: B.Other,
        [A.UNRECOGNIZED]: B.Other
    };
    class jr extends ce {
        constructor(e = Ju()){
            super(void 0, new Ku({
                color: 16777215 * Math.random(),
                flatShading: !0
            })), this.name = "generic spatial entity", this.isSpatialEntity = !0, this._componentMap = new Map, this._spatialUUID = e;
        }
        get spatialUUID() {
            return this._spatialUUID;
        }
        updateMatrixWorld(e) {
            super.updateMatrixWorld(e);
        }
        addComponent(e, n) {
            let i = null;
            switch(e){
                case K.Locatable:
                    i = new v5(this, n);
                    break;
                case K.Bounded3D:
                    i = new y5(this, n);
                    break;
                case K.Bounded2D:
                    i = new x5(this, n);
                    break;
                case K.TriangleMesh:
                    i = new b5(this, n);
                    break;
                case K.SemanticLabel:
                    i = new w5(this, n);
                    break;
            }
            i && this._componentMap.set(e, i);
        }
        getComponent(e) {
            return this._componentMap.get(e);
        }
        duplicate() {
            const e = new jr;
            return this._componentMap.forEach((n, i, r)=>{
                e.addComponent(n.type, n.initData);
            }), e;
        }
        get nativeEntity() {
            if (!this._nativeEntity) {
                const e = new Ht({
                    x: this.position.x,
                    y: this.position.y,
                    z: this.position.z,
                    w: 1
                }, {
                    x: this.quaternion.x,
                    y: this.quaternion.y,
                    z: this.quaternion.z,
                    w: this.quaternion.w
                }), n = T5[this.getComponent(K.SemanticLabel).semanticLabel];
                if (this.entityType === Qe.Plane) {
                    const { offset: i, extent: r } = this.getComponent(K.Bounded2D), s = [
                        new DOMPointReadOnly(i.x, 0, i.y),
                        new DOMPointReadOnly(i.x + r.x, 0, i.y),
                        new DOMPointReadOnly(i.x + r.x, 0, i.y + r.y),
                        new DOMPointReadOnly(i.x, 0, i.y + r.y),
                        new DOMPointReadOnly(i.x, 0, i.y)
                    ];
                    this._nativeEntity = new s3(e, s, n);
                } else if (this.entityType === Qe.Box || this.entityType === Qe.Mesh) {
                    const i = this.geometry.getAttribute("position").array, r = new Uint32Array(this.geometry.index.array);
                    this._nativeEntity = new t3(e, i, r, n);
                }
            }
            return this._nativeEntity;
        }
        static fromPBJSON(e) {
            const n = Gu.fromJSON(e);
            if (n.locatable_META) {
                const i = new jr(n.uuid);
                return i.addComponent(K.Locatable, n.locatable_META), n.semanticLabel_META && i.addComponent(K.SemanticLabel, n.semanticLabel_META), n.bounded2D_META ? i.addComponent(K.Bounded2D, n.bounded2D_META) : n.bounded3D_META ? i.addComponent(K.Bounded3D, n.bounded3D_META) : n.triangleMesh_META && i.addComponent(K.TriangleMesh, n.triangleMesh_META), i;
            }
        }
        get entityType() {
            if (this.getComponent(K.Bounded2D)) return Qe.Plane;
            if (this.getComponent(K.Bounded3D)) return Qe.Box;
            if (this.getComponent(K.TriangleMesh)) return Qe.Mesh;
        }
        static toPBJSON(e) {
            var n, i, r, s, a;
            return {
                uuid: e.spatialUUID,
                locatable_META: (n = e.getComponent(K.Locatable)) === null || n === void 0 ? void 0 : n.pbData,
                boundary2D_META: void 0,
                bounded2D_META: (i = e.getComponent(K.Bounded2D)) === null || i === void 0 ? void 0 : i.pbData,
                bounded3D_META: (r = e.getComponent(K.Bounded3D)) === null || r === void 0 ? void 0 : r.pbData,
                semanticLabel_META: (s = e.getComponent(K.SemanticLabel)) === null || s === void 0 ? void 0 : s.pbData,
                roomLayout_META: void 0,
                spaceContainer_META: void 0,
                triangleMesh_META: (a = e.getComponent(K.TriangleMesh)) === null || a === void 0 ? void 0 : a.pbData,
                dynamicObject_META: void 0
            };
        }
    }
    const E5 = {
        living_room: ()=>pi(()=>import("./env-living-room-CVCYIB7e.js"), [], import.meta.url),
        meeting_room: ()=>pi(()=>import("./meeting_room-COtFIOij.js"), [], import.meta.url),
        music_room: ()=>pi(()=>import("./env-music-room-DAOruTFO.js"), [], import.meta.url),
        office_large: ()=>pi(()=>import("./office_large-DoJFWIAy.js"), [], import.meta.url),
        office_small: ()=>pi(()=>import("./office_small-BStFvcdU.js"), [], import.meta.url)
    }, Lc = "0.2.4", _5 = new M(0, 0, -1);
    class S5 extends EventTarget {
        constructor(e){
            super(), this.xrDevice = e, this.trackedPlanes = new Set, this.trackedMeshes = new Set, this.version = Lc, this.objectMap = new Map, this.planes = new Te, this.boxes = new Te, this.meshes = new Te, this.tempPosition = new M, this.tempQuaternion = new X, this.tempDirection = new M, this.tempScale = new M, this.tempMatrix = new yt, this.raycaster = new eh, this.hitTestTarget = new Te, this.hitTestMarker = new Ia, this.worldNormal = new M, this.normalMatrix = new th, this.scene = new Gc, this.scene.background = new Bc(4079166), this.camera = new $c(50, window.innerWidth / window.innerHeight, .1, 40), this.camera.position.set(0, 1.6, 5);
            const n = new nh(50, 50);
            this.scene.add(n), this.scene.add(this.planes, this.boxes, this.meshes), this.planes.renderOrder = 1, this.boxes.renderOrder = 2, this.meshes.renderOrder = 3, this.planes.visible = !1, this.boxes.visible = !1, this.renderer = new Hc({
                antialias: !0,
                alpha: !0
            }), this.renderer.setPixelRatio(window.devicePixelRatio), this.renderer.setSize(window.innerWidth, window.innerHeight), this.renderer.domElement.style.position = "fixed", this.renderer.domElement.style.top = "50vh", this.renderer.domElement.style.left = "50vw", this.renderer.domElement.style.transform = "translate(-50%, -50%)", this.hitTestTarget.add(this.hitTestMarker), this.hitTestMarker.rotateX(Math.PI / 2);
        }
        get environmentCanvas() {
            return this.renderer.domElement;
        }
        get planesVisible() {
            return this.planes.visible;
        }
        set planesVisible(e) {
            this.planes.visible = e;
        }
        get boundingBoxesVisible() {
            return this.boxes.visible;
        }
        set boundingBoxesVisible(e) {
            this.boxes.visible = e;
        }
        get meshesVisible() {
            return this.meshes.visible;
        }
        set meshesVisible(e) {
            this.meshes.visible = e;
        }
        render() {
            this.camera.position.copy(this.xrDevice.position), this.camera.quaternion.copy(this.xrDevice.quaternion);
            const e = this.xrDevice.fovy / Math.PI * 180;
            let n = !1;
            this.camera.fov !== e && (this.camera.fov = e, n = !0);
            const i = this.xrDevice.canvasDimensions;
            if (i) {
                const r = this.renderer.domElement;
                (r.width !== i.width || r.height !== i.height) && (this.camera.aspect = i.width / i.height, this.renderer.setSize(i.width, i.height), n = !0);
            }
            n && this.camera.updateProjectionMatrix(), this.renderer.render(this.scene, this.camera);
        }
        deleteAll() {
            [
                ...this.objectMap.values()
            ].forEach((e)=>{
                e.removeFromParent();
            }), this.objectMap.clear(), this.trackedMeshes.clear(), this.trackedPlanes.clear();
        }
        loadEnvironment(e) {
            this.deleteAll(), e.spatialEntities.forEach((n)=>{
                const i = jr.fromPBJSON(n);
                if (i) {
                    switch(i.entityType){
                        case Qe.Box:
                            this.boxes.add(i), this.trackedMeshes.add(i.nativeEntity);
                            break;
                        case Qe.Plane:
                            this.planes.add(i), this.trackedPlanes.add(i.nativeEntity);
                            break;
                        case Qe.Mesh:
                            this.meshes.add(i), this.trackedMeshes.add(i.nativeEntity);
                            break;
                    }
                    const r = this.objectMap.get(n.uuid);
                    r && r.removeFromParent(), this.objectMap.set(n.uuid, i);
                }
            });
        }
        loadDefaultEnvironment(e) {
            if (typeof __IS_UMD__ < "u" && __IS_UMD__) {
                const n = `https://www.unpkg.com/@iwer/sem@${Lc}/captures/${e}.json`;
                fetch(n).then((i)=>{
                    if (!i.ok) throw new Error(`Network response was not ok: ${i.statusText}`);
                    return i.json();
                }).then((i)=>{
                    this.loadEnvironment(i);
                }).catch((i)=>{
                    console.error(`Error loading environment ${e} from CDN`, i);
                });
            } else {
                const n = E5[e];
                if (!n) {
                    console.error(`Requested environment ${e} does not exist`);
                    return;
                }
                n().then((i)=>{
                    const r = i.default;
                    this.loadEnvironment(r);
                }).catch((i)=>{
                    console.error(`Error loading environment ${e} locally`, i);
                });
            }
        }
        computeHitTestResults(e) {
            return this.tempMatrix.fromArray(e), this.tempMatrix.decompose(this.tempPosition, this.tempQuaternion, this.tempScale), this.tempDirection.copy(_5).applyQuaternion(this.tempQuaternion).normalize(), this.raycaster.set(this.tempPosition, this.tempDirection), this.raycaster.intersectObject(this.meshes, !0).map((r)=>{
                var s;
                const a = r.point;
                if (this.hitTestTarget.position.copy(a), !((s = r.face) === null || s === void 0) && s.normal) {
                    this.worldNormal.copy(r.face.normal);
                    const o = r.object;
                    this.worldNormal.applyMatrix3(this.normalMatrix.getNormalMatrix(o.matrixWorld)).normalize(), this.hitTestTarget.lookAt(this.tempPosition.addVectors(a, this.worldNormal));
                } else this.hitTestTarget.quaternion.set(0, 0, 0, 1);
                return this.hitTestTarget.updateMatrixWorld(!0), this.hitTestMarker.matrixWorld.toArray();
            });
        }
    }
    const M5 = {
        metaQuest3: n5,
        metaQuest2: e5,
        metaQuestPro: t5,
        oculusQuest1: J3
    }, Cc = [
        "office_small",
        "meeting_room",
        "living_room",
        "music_room",
        "office_large"
    ], A5 = [
        "left",
        "none",
        "right"
    ];
    F5 = function(t) {
        const e = typeof t == "string" ? t : t.type ?? "metaQuest3", n = new X3(M5[e], typeof t == "string" ? void 0 : t);
        typeof t != "string" && ($u(n, t.headset), Fc(n.hands, t.hand), Fc(n.controllers, t.controller), n.primaryInputMode = t.primaryInputMode ?? "controller"), n.ipd = typeof t == "string" ? 0 : t.ipd ?? 0, n.installRuntime(), n.installDevUI(wp);
        const i = typeof t == "string" ? !0 : t.syntheticEnvironment;
        return i === !1 || (n.installSEM(S5), i === null) ? n : typeof i == "string" && Cc.includes(i) ? (n.sem?.loadDefaultEnvironment(i), n) : i === !0 || i === void 0 ? (n.sem?.loadDefaultEnvironment(Cc[0]), n) : typeof i == "object" ? (n.sem?.loadEnvironment(i), n) : (fetch(i).then((r)=>r.json()).then((r)=>n.sem?.loadEnvironment(r)).catch(console.error), n);
    };
    const Nc = new re, R5 = new X;
    function Fc(t, e) {
        if (e != null) for (const n of A5)$u(t[n], e[n]);
    }
    function $u(t, e) {
        t == null || e == null || (zc(t.position, e.position), zc(Nc, e.rotation), Dc(t.quaternion, R5.setFromEuler(Nc)), Dc(t.quaternion, e.quaternion));
    }
    function zc(t, e) {
        if (e != null) {
            if (e instanceof re && t instanceof re && t.copy(e), Array.isArray(e)) {
                t.x = e[0], t.y = e[1], t.z = e[2];
                return;
            }
            t.x = e.x, t.y = e.y, t.z = e.z;
        }
    }
    function Dc(t, e) {
        if (e != null) {
            if (Array.isArray(e)) {
                t.x = e[0], t.y = e[1], t.z = e[2], t.w = e[3];
                return;
            }
            t.x = e.x, t.y = e.y, t.z = e.z, t.w = e.w;
        }
    }
});
export { F5 as emulate, __tla };
