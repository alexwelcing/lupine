import{b as v,j as uo}from"./vendor-react-OtmnRBTN.js";import{J as mo,l as He,Y as z,b4 as j,f as fo,D as po,e as Oe,i as $,z as ho,ad as we,g as Ae,aJ as me,t as ze}from"./vendor-three-Bam-DO-L.js";import{u as bo,a as yo}from"./vendor-react-three-BEavodTA.js";function Ce(e,o){if(o<=0)return e;const s=o*.5;return e>s?e-o:e<-s?e+o:e}class vo{cells=new Map;cellSize;positions=new Float32Array(0);constructor(o=3){this.cellSize=o}build(o,s){this.cells.clear(),this.positions=o;for(let t=0;t<s;t++){const r=o[t*3],l=o[t*3+1],c=o[t*3+2],k=this.key(r,l,c);this.cells.has(k)||this.cells.set(k,[]),this.cells.get(k).push(t)}}query(o,s,t,r){const l=[],c=Math.ceil(r/this.cellSize),k=Math.floor(o/this.cellSize),Q=Math.floor(s/this.cellSize),F=Math.floor(t/this.cellSize);for(let x=-c;x<=c;x++)for(let g=-c;g<=c;g++)for(let N=-c;N<=c;N++){const V=`${k+x},${Q+g},${F+N}`,L=this.cells.get(V);if(L)for(const w of L){const _=this.positions[w*3],R=this.positions[w*3+1],G=this.positions[w*3+2],A=_-o,C=R-s,U=G-t,B=A*A+C*C+U*U;B<r*r&&l.push({index:w,dist:Math.sqrt(B)})}}return l.sort((x,g)=>x.dist-g.dist)}closest(o,s,t,r=10){let l=this.cellSize;for(;l<=r;){const c=this.query(o,s,t,l);if(c.length>0)return c[0];l*=2}return null}getCell(o,s,t){const r=this.key(o,s,t);return this.cells.get(r)??[]}findBonds(o,s){const t=[],r=new Set,l=Math.ceil(o/this.cellSize);for(const[c,k]of this.cells){const[Q,F,x]=c.split(",").map(Number);for(const g of k){const N=this.positions[g*3],V=this.positions[g*3+1],L=this.positions[g*3+2];for(let w=-l;w<=l;w++)for(let _=-l;_<=l;_++)for(let R=-l;R<=l;R++){const G=`${Q+w},${F+_},${x+R}`,A=this.cells.get(G);if(A)for(const C of A){if(g>=C)continue;const U=`${g}-${C}`;if(r.has(U))continue;r.add(U);const B=this.positions[C*3],ee=this.positions[C*3+1],fe=this.positions[C*3+2],Y=B-N,q=ee-V,X=fe-L,oe=Y*Y+q*q+X*X;let W=o;oe<W*W&&t.push([g,C])}}}}return t}clear(){this.cells.clear(),this.positions=new Float32Array(0)}stats(){let o=0,s=0;for(const t of this.cells.values())o+=t.length,s=Math.max(s,t.length);return{numCells:this.cells.size,totalAtoms:o,avgPerCell:o/(this.cells.size||1),maxInCell:s}}key(o,s,t){return`${Math.floor(o/this.cellSize)},${Math.floor(s/this.cellSize)},${Math.floor(t/this.cellSize)}`}}function Xe(e){return Math.min(.7,Math.max(.3,e*.5))}const go={1:{symbol:"H",name:"Hydrogen",mass:1.008,radius:.31,block:"s",role:"Terminator",color:"#ffffff"},2:{symbol:"He",name:"Helium",mass:4.0026,radius:.28,block:"s",role:"Inert Gas",color:"#d9ffff"},3:{symbol:"Li",name:"Lithium",mass:6.94,radius:1.28,block:"s",role:"Intercalant",color:"#cc80ff"},4:{symbol:"Be",name:"Beryllium",mass:9.0122,radius:.96,block:"s",role:"Matrix",color:"#c2ff00"},5:{symbol:"B",name:"Boron",mass:10.81,radius:.84,block:"p",role:"Dopant",color:"#ffb5b5"},6:{symbol:"C",name:"Carbon",mass:12.011,radius:.76,block:"p",role:"Framework",color:"#909090"},7:{symbol:"N",name:"Nitrogen",mass:14.007,radius:.71,block:"p",role:"Ligand",color:"#3050f8"},8:{symbol:"O",name:"Oxygen",mass:15.999,radius:.66,block:"p",role:"Framework",color:"#ff0d0d"},9:{symbol:"F",name:"Fluorine",mass:18.998,radius:.57,block:"p",role:"Ligand",color:"#90e050"},10:{symbol:"Ne",name:"Neon",mass:20.18,radius:.58,block:"p",role:"Inert Gas",color:"#b3e3f5"},11:{symbol:"Na",name:"Sodium",mass:22.99,radius:1.66,block:"s",role:"Intercalant",color:"#ab5cf2"},12:{symbol:"Mg",name:"Magnesium",mass:24.305,radius:1.41,block:"s",role:"Matrix",color:"#8aff00"},13:{symbol:"Al",name:"Aluminum",mass:26.982,radius:1.21,block:"p",role:"Framework",color:"#bfa6a6"},14:{symbol:"Si",name:"Silicon",mass:28.085,radius:1.11,block:"p",role:"Semiconductor",color:"#f0c8a0"},15:{symbol:"P",name:"Phosphorus",mass:30.974,radius:1.07,block:"p",role:"Dopant",color:"#ff8000"},16:{symbol:"S",name:"Sulfur",mass:32.06,radius:1.05,block:"p",role:"Ligand",color:"#ffff30"},17:{symbol:"Cl",name:"Chlorine",mass:35.45,radius:1.02,block:"p",role:"Ligand",color:"#1ff01f"},18:{symbol:"Ar",name:"Argon",mass:39.95,radius:1.06,block:"p",role:"Inert Gas",color:"#80d1e3"},19:{symbol:"K",name:"Potassium",mass:39.098,radius:2.03,block:"s",role:"Intercalant",color:"#8f40d4"},20:{symbol:"Ca",name:"Calcium",mass:40.078,radius:1.76,block:"s",role:"Matrix",color:"#3dff00"},21:{symbol:"Sc",name:"Scandium",mass:44.956,radius:1.7,block:"d",role:"Alloy Component",color:"#e6e6e6"},22:{symbol:"Ti",name:"Titanium",mass:47.867,radius:1.6,block:"d",role:"Alloy Matrix",color:"#bfc2c7"},23:{symbol:"V",name:"Vanadium",mass:50.942,radius:1.53,block:"d",role:"Alloy Component",color:"#a6a6ab"},24:{symbol:"Cr",name:"Chromium",mass:51.996,radius:1.39,block:"d",role:"Alloy Component",color:"#8a99c7"},25:{symbol:"Mn",name:"Manganese",mass:54.938,radius:1.39,block:"d",role:"Alloy Component",color:"#9c7ac7"},26:{symbol:"Fe",name:"Iron",mass:55.845,radius:1.32,block:"d",role:"Magnetic Core",color:"#e06633"},27:{symbol:"Co",name:"Cobalt",mass:58.933,radius:1.26,block:"d",role:"Magnetic Core",color:"#f090a0"},28:{symbol:"Ni",name:"Nickel",mass:58.693,radius:1.24,block:"d",role:"Alloy Matrix",color:"#50d050"},29:{symbol:"Cu",name:"Copper",mass:63.546,radius:1.32,block:"d",role:"Conductor",color:"#c88033"},30:{symbol:"Zn",name:"Zinc",mass:65.38,radius:1.22,block:"d",role:"Alloy Component",color:"#7d80b0"},31:{symbol:"Ga",name:"Gallium",mass:69.723,radius:1.22,block:"p",role:"Semiconductor",color:"#c28f8f"},32:{symbol:"Ge",name:"Germanium",mass:72.63,radius:1.2,block:"p",role:"Semiconductor",color:"#668f8f"},33:{symbol:"As",name:"Arsenic",mass:74.922,radius:1.19,block:"p",role:"Dopant",color:"#bd80e3"},34:{symbol:"Se",name:"Selenium",mass:78.971,radius:1.2,block:"p",role:"Chalcogen",color:"#ffa100"},35:{symbol:"Br",name:"Bromine",mass:79.904,radius:1.2,block:"p",role:"Ligand",color:"#a62929"},36:{symbol:"Kr",name:"Krypton",mass:83.798,radius:1.16,block:"p",role:"Inert Gas",color:"#5cb8d1"},37:{symbol:"Rb",name:"Rubidium",mass:85.468,radius:2.2,block:"s",role:"Intercalant",color:"#702eb0"},38:{symbol:"Sr",name:"Strontium",mass:87.62,radius:1.95,block:"s",role:"Matrix",color:"#00ff00"},39:{symbol:"Y",name:"Yttrium",mass:88.906,radius:1.9,block:"d",role:"Alloy Component",color:"#94ffff"},40:{symbol:"Zr",name:"Zirconium",mass:91.224,radius:1.75,block:"d",role:"Alloying Agent",color:"#94e0e0"},41:{symbol:"Nb",name:"Niobium",mass:92.906,radius:1.64,block:"d",role:"Refractory",color:"#73c2c9"},42:{symbol:"Mo",name:"Molybdenum",mass:95.95,radius:1.54,block:"d",role:"Alloying Agent",color:"#54b5b5"},43:{symbol:"Tc",name:"Technetium",mass:98,radius:1.47,block:"d",role:"Radioisotope",color:"#3b9e9e"},44:{symbol:"Ru",name:"Ruthenium",mass:101.07,radius:1.46,block:"d",role:"Catalyst",color:"#248f8f"},45:{symbol:"Rh",name:"Rhodium",mass:102.91,radius:1.42,block:"d",role:"Catalyst",color:"#0a7d8c"},46:{symbol:"Pd",name:"Palladium",mass:106.42,radius:1.39,block:"d",role:"Catalyst",color:"#006985"},47:{symbol:"Ag",name:"Silver",mass:107.87,radius:1.45,block:"d",role:"Conductor",color:"#c0c0c0"},48:{symbol:"Cd",name:"Cadmium",mass:112.41,radius:1.44,block:"d",role:"Semiconductor",color:"#ffd98f"},49:{symbol:"In",name:"Indium",mass:114.82,radius:1.42,block:"p",role:"Semiconductor",color:"#a67573"},50:{symbol:"Sn",name:"Tin",mass:118.71,radius:1.39,block:"p",role:"Solder",color:"#668080"},51:{symbol:"Sb",name:"Antimony",mass:121.76,radius:1.39,block:"p",role:"Dopant",color:"#9e63b5"},52:{symbol:"Te",name:"Tellurium",mass:127.6,radius:1.38,block:"p",role:"Chalcogen",color:"#d47a00"},53:{symbol:"I",name:"Iodine",mass:126.9,radius:1.39,block:"p",role:"Ligand",color:"#940094"},54:{symbol:"Xe",name:"Xenon",mass:131.29,radius:1.4,block:"p",role:"Inert Gas",color:"#429eb0"},55:{symbol:"Cs",name:"Cesium",mass:132.91,radius:2.44,block:"s",role:"Intercalant",color:"#57178f"},56:{symbol:"Ba",name:"Barium",mass:137.33,radius:2.15,block:"s",role:"Matrix",color:"#00c900"},57:{symbol:"La",name:"Lanthanum",mass:138.91,radius:2.07,block:"f",role:"Garnet Cation",color:"#70d4ff"},58:{symbol:"Ce",name:"Cerium",mass:140.12,radius:2.04,block:"f",role:"Catalyst",color:"#ffffc7"},59:{symbol:"Pr",name:"Praseodymium",mass:140.91,radius:2.03,block:"f",role:"Magnet Component",color:"#d9ffc7"},60:{symbol:"Nd",name:"Neodymium",mass:144.24,radius:2.01,block:"f",role:"Magnet Component",color:"#c7ffc7"},61:{symbol:"Pm",name:"Promethium",mass:145,radius:1.99,block:"f",role:"Radioisotope",color:"#a3ffc7"},62:{symbol:"Sm",name:"Samarium",mass:150.36,radius:1.98,block:"f",role:"Magnet Component",color:"#8fffc7"},63:{symbol:"Eu",name:"Europium",mass:151.96,radius:1.98,block:"f",role:"Phosphor",color:"#61ffc7"},64:{symbol:"Gd",name:"Gadolinium",mass:157.25,radius:1.96,block:"f",role:"Contrast Agent",color:"#45ffc7"},65:{symbol:"Tb",name:"Terbium",mass:158.93,radius:1.94,block:"f",role:"Phosphor",color:"#30ffc7"},66:{symbol:"Dy",name:"Dysprosium",mass:162.5,radius:1.92,block:"f",role:"Magnet Component",color:"#1fffc7"},67:{symbol:"Ho",name:"Holmium",mass:164.93,radius:1.92,block:"f",role:"Magnet Component",color:"#00ff9c"},68:{symbol:"Er",name:"Erbium",mass:167.26,radius:1.89,block:"f",role:"Phosphor",color:"#00e675"},69:{symbol:"Tm",name:"Thulium",mass:168.93,radius:1.9,block:"f",role:"Phosphor",color:"#00d452"},70:{symbol:"Yb",name:"Ytterbium",mass:173.05,radius:1.87,block:"f",role:"Laser Dopant",color:"#00bf38"},71:{symbol:"Lu",name:"Lutetium",mass:174.97,radius:1.87,block:"d",role:"Catalyst",color:"#00ab24"},72:{symbol:"Hf",name:"Hafnium",mass:178.49,radius:1.75,block:"d",role:"High-K Dielectric",color:"#4dc2ff"},73:{symbol:"Ta",name:"Tantalum",mass:180.95,radius:1.7,block:"d",role:"Capacitor",color:"#4da6ff"},74:{symbol:"W",name:"Tungsten",mass:183.84,radius:1.62,block:"d",role:"Refractory",color:"#2194d6"},75:{symbol:"Re",name:"Rhenium",mass:186.21,radius:1.51,block:"d",role:"Catalyst",color:"#267dab"},76:{symbol:"Os",name:"Osmium",mass:190.23,radius:1.44,block:"d",role:"Refractory",color:"#266696"},77:{symbol:"Ir",name:"Iridium",mass:192.22,radius:1.41,block:"d",role:"Catalyst",color:"#175487"},78:{symbol:"Pt",name:"Platinum",mass:195.08,radius:1.36,block:"d",role:"Catalyst",color:"#d0d0e0"},79:{symbol:"Au",name:"Gold",mass:196.97,radius:1.36,block:"d",role:"Conductor",color:"#ffd123"},80:{symbol:"Hg",name:"Mercury",mass:200.59,radius:1.32,block:"d",role:"Liquid Metal",color:"#b8b8d0"},81:{symbol:"Tl",name:"Thallium",mass:204.38,radius:1.45,block:"p",role:"Dopant",color:"#a6544d"},82:{symbol:"Pb",name:"Lead",mass:207.2,radius:1.46,block:"p",role:"Heavy Shield",color:"#575961"},83:{symbol:"Bi",name:"Bismuth",mass:208.98,radius:1.48,block:"p",role:"Topological Solid",color:"#9e4fb5"},84:{symbol:"Po",name:"Polonium",mass:209,radius:1.4,block:"p",role:"Radioisotope",color:"#ab5c00"},85:{symbol:"At",name:"Astatine",mass:210,radius:1.5,block:"p",role:"Halogen",color:"#754f45"},86:{symbol:"Rn",name:"Radon",mass:222,radius:1.5,block:"p",role:"Inert Gas",color:"#428296"},88:{symbol:"Ra",name:"Radium",mass:226,radius:2.21,block:"s",role:"Radioisotope",color:"#42d046"},90:{symbol:"Th",name:"Thorium",mass:232.04,radius:2.06,block:"f",role:"Reactor Fuel",color:"#00baff"},92:{symbol:"U",name:"Uranium",mass:238.03,radius:1.96,block:"f",role:"Reactor Fuel",color:"#008fff"},94:{symbol:"Pu",name:"Plutonium",mass:244,radius:1.87,block:"f",role:"Reactor Fuel",color:"#006bff"}},J=(()=>{const e={};for(const[o,s]of Object.entries(go))e[Number(o)]={...s,displayRadius:s.displayRadius??Xe(s.radius)};return e})();function ko(e){if(J[e])return J[e];const o=e*137.508%360,s=1.4;return{symbol:`X${e}`,name:"Unknown Isotope",mass:0,radius:s,displayRadius:Xe(s),block:"?",role:"Unassigned",color:`hsl(${o}, 70%, 65%)`}}const Co=(()=>{const e={};for(const o of Object.values(J))e[o.symbol]=o;return e})(),Mo=(()=>{const e={};for(const[o,s]of Object.entries(J))e[s.symbol]=Number(o);return e})();function Jo(e){return Co[e]}function Qo(e){return Mo[e]}function We(e){if(e.startsWith("hsl"))return[.6,.6,.6];const o=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return o?[parseInt(o[1],16)/255,parseInt(o[2],16)/255,parseInt(o[3],16)/255]:[.6,.6,.6]}const wo={},Ke={};for(const[e,o]of Object.entries(J)){const s=parseInt(e,10);wo[s]=We(o.color),Ke[s]=o.displayRadius,o.radius}const Ao=[.6,.6,.6],So={7:[.28,.38,.85],1:[.97,.96,.9],6:[.35,.28,.18],9:[.22,.58,.2],16:[.92,.78,.18]},Io={7:.85,1:.55,6:.72,9:.65,16:.5};function Z(e,o,s){return[e[0]+(o[0]-e[0])*s,e[1]+(o[1]-e[1])*s,e[2]+(o[2]-e[2])*s]}function b(e,o,s,t){return r=>(r=Math.max(0,Math.min(1,r)),r<.33?Z(e,o,r/.33):r<.66?Z(o,s,(r-.33)/.33):Z(s,t,(r-.66)/.34))}const de={viridis:b([.267,.004,.329],[.282,.14,.458],[.127,.566,.551],[.993,.906,.144]),inferno:b([.001,0,.014],[.416,.065,.432],[.891,.298,.159],[.988,.998,.644]),coolwarm:e=>{e=Math.max(0,Math.min(1,e));const o=[.23,.299,.754],s=[.865,.865,.865],t=[.706,.016,.15];return e<.5?Z(o,s,e*2):Z(s,t,(e-.5)*2)},plasma:b([.05,.03,.53],[.494,.012,.658],[.798,.28,.47],[.94,.975,.131]),magma:b([.001,0,.014],[.416,.065,.432],[.871,.287,.381],[.988,.991,.75]),cividis:b([0,.135,.305],[.345,.376,.388],[.725,.66,.32],[.995,.883,.15]),neon:b([0,1,.4],[0,.8,1],[.6,0,1],[1,0,.6]),sunset:b([.12,0,.3],[.8,.15,.4],[1,.55,.15],[1,.92,.5]),vaporwave:b([.05,.85,.85],[.55,.3,.95],[1,.4,.7],[1,.85,.4]),ocean:b([0,.2,.4],[0,.5,.6],[.2,.8,.8],[.8,.95,1]),fire:b([.1,0,0],[.8,.2,0],[1,.7,0],[1,1,.8]),ice:b([0,.05,.2],[0,.3,.7],[.4,.7,.9],[.9,.95,1]),forest:b([.05,.15,.05],[.1,.4,.1],[.4,.7,.2],[.8,.9,.5]),cyberpunk:b([.1,0,.3],[.6,0,.6],[0,.8,.9],[1,.1,.6]),autumn:b([.2,0,0],[.6,.1,0],[.9,.5,.1],[1,.9,.4]),grayscale:b([0,0,0],[.33,.33,.33],[.66,.66,.66],[1,1,1]),turbo:b([.18,.07,.4],[.12,.66,.72],[.85,.88,.18],[.85,.15,.11])};function Me(e){return Math.max(0,Math.min(255,Math.round(e))).toString(16).padStart(2,"0")}function je(e,o=1){return`#${Me(e[0]*255*o)}${Me(e[1]*255*o)}${Me(e[2]*255*o)}`}function es(e){const o=de[e]??de.viridis,s=je(o(.05),.22),t=je(o(.65),.4);return{top:s,bottom:t}}const xo={metalness:.15,roughness:.55,anisotropy:0,subsurface:0,emission:[0,0,0],emissionIntensity:0},Ro={hydrogen:{metalness:0,roughness:.15,anisotropy:0,subsurface:.85,emission:[0,0,0],emissionIntensity:0},noble_gas:{metalness:0,roughness:.18,anisotropy:.35,subsurface:.75,emission:[0,0,0],emissionIntensity:0},alkali:{metalness:.55,roughness:.55,anisotropy:.05,subsurface:.05,emission:[0,0,0],emissionIntensity:0},alkaline_earth:{metalness:.7,roughness:.45,anisotropy:.1,subsurface:0,emission:[0,0,0],emissionIntensity:0},transition_warm:{metalness:.92,roughness:.28,anisotropy:.25,subsurface:0,emission:[0,0,0],emissionIntensity:0},transition_cool:{metalness:.95,roughness:.18,anisotropy:.15,subsurface:0,emission:[0,0,0],emissionIntensity:0},transition_dull:{metalness:.85,roughness:.6,anisotropy:.05,subsurface:0,emission:[0,0,0],emissionIntensity:0},post_transition:{metalness:.8,roughness:.4,anisotropy:.15,subsurface:0,emission:[0,0,0],emissionIntensity:0},metalloid:{metalness:.1,roughness:.2,anisotropy:.1,subsurface:.55,emission:[0,0,0],emissionIntensity:0},nonmetal:{metalness:.05,roughness:.5,anisotropy:0,subsurface:.2,emission:[0,0,0],emissionIntensity:0},halogen:{metalness:0,roughness:.25,anisotropy:.1,subsurface:.65,emission:[0,0,0],emissionIntensity:0},rare_earth:{metalness:.9,roughness:.35,anisotropy:.2,subsurface:0,emission:[.15,.55,.45],emissionIntensity:.18},unknown:{metalness:.3,roughness:.5,anisotropy:0,subsurface:.1,emission:[0,0,0],emissionIntensity:0}},Po=new Set([2,10,18,36,54,86,118]),To=new Set([3,11,19,37,55,87]),Eo=new Set([4,12,20,38,56,88]),Lo=new Set([9,17,35,53,85,117]),_o=new Set([26,27,28,29]),Do=new Set([22,44,45,46,47,77,78]),No=new Set([23,24,25,30,41,42,43,73,74,75]),Uo=new Set([13,31,49,50,81,82,83,84,113,114,115,116]),Fo=new Set([5,14,32,33,51,52]),Vo=new Set([6,7,8,15,16,34]),$e=[57,71],Ye=[89,103],Bo=[[21,21],[39,40],[72,72],[76,76],[104,112]];function Go(e){if(e===1)return"hydrogen";if(Po.has(e))return"noble_gas";if(To.has(e))return"alkali";if(Eo.has(e))return"alkaline_earth";if(Lo.has(e))return"halogen";if(_o.has(e))return"transition_warm";if(Do.has(e))return"transition_cool";if(No.has(e))return"transition_dull";if(Uo.has(e))return"post_transition";if(Fo.has(e))return"metalloid";if(Vo.has(e))return"nonmetal";if(e>=$e[0]&&e<=$e[1]||e>=Ye[0]&&e<=Ye[1])return"rare_earth";for(const[o,s]of Bo)if(e>=o&&e<=s)return e===76||e>=104?"transition_dull":"transition_cool";return"unknown"}const Ho={6:{metalness:0,roughness:.7,anisotropy:.4,subsurface:0,emission:[0,0,0],emissionIntensity:0},8:{metalness:0,roughness:.18,anisotropy:0,subsurface:.7,emission:[0,0,0],emissionIntensity:0},13:{metalness:.85,roughness:.35,anisotropy:.2,subsurface:0,emission:[0,0,0],emissionIntensity:0},14:{metalness:.2,roughness:.15,anisotropy:.15,subsurface:.6,emission:[0,0,0],emissionIntensity:0},22:{metalness:.95,roughness:.2,anisotropy:.15,subsurface:0,emission:[0,0,0],emissionIntensity:0},26:{metalness:.9,roughness:.4,anisotropy:.3,subsurface:0,emission:[0,0,0],emissionIntensity:0},27:{metalness:.92,roughness:.32,anisotropy:.25,subsurface:0,emission:[0,0,0],emissionIntensity:0},28:{metalness:.93,roughness:.25,anisotropy:.2,subsurface:0,emission:[0,0,0],emissionIntensity:0},29:{metalness:.95,roughness:.22,anisotropy:.35,subsurface:0,emission:[0,0,0],emissionIntensity:0},46:{metalness:.95,roughness:.18,anisotropy:.1,subsurface:0,emission:[0,0,0],emissionIntensity:0},47:{metalness:.98,roughness:.12,anisotropy:.15,subsurface:0,emission:[0,0,0],emissionIntensity:0},78:{metalness:.96,roughness:.15,anisotropy:.15,subsurface:0,emission:[0,0,0],emissionIntensity:0},79:{metalness:.98,roughness:.15,anisotropy:.25,subsurface:0,emission:[0,0,0],emissionIntensity:0},88:{metalness:.7,roughness:.45,anisotropy:.1,subsurface:0,emission:[.2,.85,.4],emissionIntensity:.3},92:{metalness:.85,roughness:.4,anisotropy:.15,subsurface:0,emission:[.3,.6,1],emissionIntensity:.25},94:{metalness:.85,roughness:.4,anisotropy:.15,subsurface:0,emission:[1,.4,.2],emissionIntensity:.25}};function Oo(e){const o=Ho[e];if(o)return o;const s=Go(e);return Ro[s]??xo}function zo(){const e=new Float32Array(2048);for(let o=0;o<256;o++){const s=Oo(o);e[o*4+0]=s.metalness,e[o*4+1]=s.roughness,e[o*4+2]=s.anisotropy,e[o*4+3]=s.subsurface;const t=256*4;e[t+o*4+0]=s.emission[0],e[t+o*4+1]=s.emission[1],e[t+o*4+2]=s.emission[2],e[t+o*4+3]=s.emissionIntensity}return e}const jo=`
  // Per-instance attributes
  attribute vec3 instancePosition;
  attribute vec3 instanceTargetPosition;
  attribute float instanceRadius;
  attribute float instanceTypeId;
  attribute float instancePropValue;
  // Original atom index in the loaded frame. Used by the etched-label
  // path so a single atom can be picked out of the instanced batch and
  // get its annotation text engraved on its surface.
  attribute float instanceAtomId;

  // Uniforms for GPU color lookup
  uniform sampler2D uPalette;   // 256×1: typeId → color
  uniform sampler2D uColormap;  // 256×1: propValue [0,1] → color
  uniform int uColorMode;       // 0=type, 1=uniform, 2=property
  uniform vec3 uUniformColor;
  uniform float uProgress;      // 0..1 GPU lerp: instancePosition -> instanceTargetPosition

  // Passed to fragment
  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vViewCenter;
  varying float vRadius;
  varying float vViewRadius;
  varying float vTypeId;
  varying float vPropValue;
  varying float vAtomId;

  void main() {
    vTypeId = instanceTypeId;
    vPropValue = instancePropValue;
    vAtomId = instanceAtomId;

    // ─── GPU-side color lookup ───
    if (uColorMode == 2) {
      // Property mode: sample colormap by normalized property value
      vColor = texture2D(uColormap, vec2(instancePropValue, 0.5)).rgb;
    } else if (uColorMode == 1) {
      // Uniform mode
      vColor = uUniformColor;
    } else {
      // Type mode: sample palette by typeId
      float u = (instanceTypeId + 0.5) / 256.0;
      vColor = texture2D(uPalette, vec2(u, 0.5)).rgb;
    }

    vUv = position.xy;
    vRadius = instanceRadius;

    // GPU-side frame interpolation: lerp current -> target by the global progress
    // uniform. The CPU re-uploads the two position buffers only on a frame change,
    // not per interpolation substep — uProgress alone sweeps the motion.
    vec3 lerpedPos = mix(instancePosition, instanceTargetPosition, uProgress);

    // Transform sphere center to view space
    vec4 viewCenter4 = modelViewMatrix * vec4(lerpedPos, 1.0);
    vViewCenter = viewCenter4.xyz;
    vViewRadius = instanceRadius;

    // Billboard: offset the quad corner in view space
    vec3 viewPos = viewCenter4.xyz;
    float expand = instanceRadius * 1.3;
    viewPos.xy += position.xy * expand;

    gl_Position = projectionMatrix * vec4(viewPos, 1.0);
  }
`,$o=ho.cube_uv_reflection_fragment,Yo=`
  precision highp float;

  varying vec3 vColor;
  varying vec2 vUv;
  varying vec3 vViewCenter;
  varying float vRadius;
  varying float vViewRadius;
  varying float vTypeId;
  varying float vPropValue;
  varying float vAtomId;

  uniform mat4 projectionMatrix;
  // Etched annotation: a Canvas2D-rasterized text texture stamped onto the
  // facing hemisphere of a single targeted atom. Activated when uHasEtch=1
  // and the fragment's vAtomId matches uEtchAtomId. Uses the view-space
  // normal as the stamp UV so the text always reads to camera (it follows
  // the silhouette, not the world). The alpha channel of the texture
  // darkens the surface to give an engraved feel.
  uniform sampler2D tEtchTexture;
  uniform float uEtchAtomId;
  uniform int uHasEtch;
  uniform int uTextureMode; // 0: none, 1: noise, 2: scratched
  uniform int uColorMode; // 0=type, 1=uniform, 2=property — same scheme as vertex
  uniform int uMaterialPreset; // 0: per-element (default), 1: matte, 2: metallic, 3: glass, 4: plastic
  // 0..1: blend between per-element identity (0) and preset override (1).
  // Lets Material Scenes partially preserve element character while
  // applying a global look.
  uniform float uMaterialIntensity;
  // User-controllable rim light boost (additive over the material-driven rim).
  uniform float uRimLight;
  // Granular Surface Character overrides.
  // uSurfaceRoughness and uSurfacePolish act as offsets to the active material profile.
  uniform float uSurfaceRoughness;
  uniform float uSurfacePolish;
  uniform float uSurfaceClearcoat;
  uniform vec3 uLightDir;
  uniform vec3 uFillLightDir;
  uniform vec3 uRimLightDir;
  uniform vec3 uFillLightColor;
  uniform vec3 uRimLightColor;
  // 256×2 RGBA: row 0 = (metalness, roughness, anisotropy, subsurface),
  //             row 1 = (emission r, emission g, emission b, intensity).
  uniform sampler2D uMaterialPalette;
  // IBL — single source of truth. tEnvMap is drei's <Environment> output:
  // a PMREM-prefiltered, octahedral-packed cubeUV atlas (Three.js's
  // CubeUVReflectionMapping). textureCubeUV (provided by the
  // cube_uv_reflection_fragment chunk injected below) decodes it correctly,
  // including roughness-based mip selection. uHasEnv=0 ('diagram' preset)
  // falls back to neutral grey so atoms still read.
  uniform sampler2D tEnvMap;
  uniform float uEnvIntensity;
  uniform int uHasEnv;
  // ENVMAP_TYPE_CUBE_UV gates Three.js's cube_uv_reflection_fragment chunk
  // so its textureCubeUV() definition is visible to us. CUBEUV_TEXEL_*
  // and CUBEUV_MAX_MIP are sized for PMREMGenerator's default 256-pixel
  // base resolution (drei's default). The chunk also requires the uniform
  // be named "envMap" (not tEnvMap) — alias it.
  #define ENVMAP_TYPE_CUBE_UV
  #define CUBEUV_TEXEL_WIDTH 0.0009765625
  #define CUBEUV_TEXEL_HEIGHT 0.001953125
  #define CUBEUV_MAX_MIP 8.0
  #define envMap tEnvMap
  ${$o}
  // Property-driven emission strength. 0 disables; >0 makes atoms glow
  // proportional to their normalized property value × colormap-mapped color.
  uniform float uPropEmission;

  // Three-light setup in view space
  // Key, fill, and rim light dirs are dynamic and passed via uniforms.

  // Simple pseudo-random noise function
  float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
  }

  void main() {
    // Ray-sphere intersection in view space
    float expand = vRadius * 1.3;
    vec3 fragViewPos = vViewCenter + vec3(vUv * expand, 0.0);

    vec3 rayDir = normalize(fragViewPos);
    vec3 oc = -vViewCenter;

    float b = dot(oc, rayDir);
    float c = dot(oc, oc) - vViewRadius * vViewRadius;
    float discriminant = b * b - c;

    if (discriminant < 0.0) {
      discard;
    }

    float t = -b - sqrt(discriminant);
    vec3 hitPoint = rayDir * t;
    vec3 normal = normalize(hitPoint - vViewCenter);

    // ─── Material lookup ────────────────────────────────────────────
    // Always sample per-element profile from the material palette first.
    // Then, if a preset override is active (uMaterialPreset > 0), blend
    // between per-element and preset based on uMaterialIntensity.
    // This is the key upgrade: Material Scenes can partially preserve
    // element character (Au still looks gold-ish on a partial Forge blend).
    float metalness, roughness, anisotropy, subsurface;
    vec3 emissionColor = vec3(0.0);
    float emissionIntensity = 0.0;

    // Step 1: per-element identity (always sampled)
    vec2 paletteUv = vec2((vTypeId + 0.5) / 256.0, 0.25);
    vec4 elemMat = texture2D(uMaterialPalette, paletteUv);
    float elemMetal = elemMat.r;
    float elemRough = elemMat.g;
    float elemAniso = elemMat.b;
    float elemSSS   = elemMat.a;

    vec4 e = texture2D(uMaterialPalette, vec2(paletteUv.x, 0.75));
    emissionColor = e.rgb;
    emissionIntensity = e.a;

    // Step 2: preset override values
    float presetMetal, presetRough, presetAniso, presetSSS;
    if (uMaterialPreset == 1)      { presetMetal = 0.05; presetRough = 0.85; presetAniso = 0.0; presetSSS = 0.0; }
    else if (uMaterialPreset == 2) { presetMetal = 0.8;  presetRough = 0.2;  presetAniso = 0.0; presetSSS = 0.0; }
    else if (uMaterialPreset == 3) { presetMetal = 0.1;  presetRough = 0.1;  presetAniso = 0.0; presetSSS = 0.4; }
    else if (uMaterialPreset == 4) { presetMetal = 0.0;  presetRough = 0.4;  presetAniso = 0.0; presetSSS = 0.0; }
    else                           { presetMetal = elemMetal; presetRough = elemRough; presetAniso = elemAniso; presetSSS = elemSSS; }

    // Step 3: blend by materialIntensity
    metalness  = mix(elemMetal, presetMetal, uMaterialIntensity);
    roughness  = mix(elemRough, presetRough, uMaterialIntensity);
    anisotropy = mix(elemAniso, presetAniso, uMaterialIntensity);
    subsurface = mix(elemSSS,   presetSSS,   uMaterialIntensity);

    // Step 4: apply granular user offsets (Polish/Roughness)
    metalness = clamp(metalness + uSurfacePolish, 0.0, 1.0);
    roughness = clamp(roughness + uSurfaceRoughness, 0.0, 1.0);

    // ─── Cook-Torrance microfacet shading (Tier 1 polish) ───────────
    // Replaces the Blinn-Phong baseline. Same 4 per-element inputs
    // (metalness/roughness/anisotropy/subsurface), much more material identity.
    //
    //   - GGX D + Smith G + Schlick F microfacet specular
    //   - Burley-style wrap diffuse for soft shadow rolloff
    //   - Subsurface backlight: light "transmits" to the shadow side for
    //     translucent atoms (H, O, noble gases) — they read as dewdrops
    //     not painted balls
    //   - Schlick fresnel ramps reflectivity at grazing — gives Cu/Au/Ag
    //     the chrome-edge that distinguishes them from plastic
    //   - Anisotropic D-term widens the highlight along screen-space y,
    //     reads as "brushed" for high-anisotropy metals
    //
    // We're in view space here, so the camera direction is +z from any
    // fragment. That simplifies F/G calculations.
    vec3 V = vec3(0.0, 0.0, 1.0); // view direction in view space, fragment-relative
    vec3 L = uLightDir;
    vec3 H = normalize(L + V);
    float NoL = max(dot(normal, L), 0.0);
    float NoV = max(dot(normal, V), 0.0);
    float NoH = max(dot(normal, H), 0.0);
    float LoH = max(dot(L, H), 0.0);

    // GGX normal distribution. alpha grows with roughness² (the standard
    // perceptually-linear remap). Anisotropy stretches the lobe along
    // screen-space y by reducing alpha in that direction — a placeholder
    // until atoms get a real tangent attribute (impostor spheres are
    // direction-less, so this is the best approximation without a per-
    // atom orientation hint).
    // Isotropic GGX. The former anisotropy term stretched the lobe in
    // SCREEN space (a self-described placeholder) — it wobbled as the
    // camera moved. Removed for stable, consistent highlights; matches
    // the bonds going isotropic.
    float alpha = roughness * roughness;
    float a2 = alpha * alpha;
    float D_denom = (NoH * NoH) * (a2 - 1.0) + 1.0;
    float D = a2 / max(3.14159 * D_denom * D_denom, 1e-6);

    // Smith G (height-correlated approximation). Cheap.
    float k = (alpha + 1.0) * (alpha + 1.0) / 8.0;
    float G_V = NoV / (NoV * (1.0 - k) + k);
    float G_L = NoL / (NoL * (1.0 - k) + k);
    float G = G_V * G_L;

    // Schlick fresnel. F0 is 0.04 for dielectrics (typical glass/plastic),
    // base color for metals. The (1-F0)*(1-LoH)^5 ramp gives chrome the
    // bright edge.
    vec3 F0 = mix(vec3(0.04), vColor, metalness);
    float fresnelRamp = pow(1.0 - LoH, 5.0);
    vec3 F = F0 + (vec3(1.0) - F0) * fresnelRamp;

    // Cook-Torrance specular term. The 4 NoL NoV in the denominator is
    // standard; the max protects against divide-by-zero at silhouettes.
    vec3 specular = (D * G) * F / max(4.0 * NoL * NoV, 1e-6);

    // ─── Clearcoat (Tier 2 polish) ──────────────────────────────────
    // A secondary specular lobe on top of the base material.
    // Fixed low roughness, high F0 to simulate a polished resin/varnish layer.
    float clearcoat = uSurfaceClearcoat;
    if (clearcoat > 0.0) {
      float ccRoughness = 0.1;
      float ccAlpha = ccRoughness * ccRoughness;
      float ccAlphaSq = ccAlpha * ccAlpha;
      float ccD_denom = (NoH * NoH) * (ccAlphaSq - 1.0) + 1.0;
      float ccD = ccAlphaSq / max(3.14159 * ccD_denom * ccD_denom, 1e-6);

      float cck = (ccAlpha + 1.0) * (ccAlpha + 1.0) / 8.0;
      float ccG_V = NoV / (NoV * (1.0 - cck) + cck);
      float ccG_L = NoL / (NoL * (1.0 - cck) + cck);
      float ccG = ccG_V * ccG_L;

      // Clearcoat F0 is fixed at 0.04 (IOR ~1.5)
      vec3 ccF0 = vec3(0.04);
      vec3 ccF = ccF0 + (vec3(1.0) - ccF0) * fresnelRamp;

      vec3 ccSpecular = (ccD * ccG) * ccF / max(4.0 * NoL * NoV, 1e-6);

      // Add clearcoat specular, and energy conserve the base layer
      specular = specular * (1.0 - ccF * clearcoat) + ccSpecular * clearcoat;
    }

    // ─── Diffuse with subsurface ──────────────────────────────────────
    // Burley wrap: smooths the shadow terminator. wrapHalf=1 is half-Lambert.
    float wrapHalf = 0.5; // tuneable; higher = softer transition
    float wrapNoL = max((dot(normal, L) + wrapHalf) / (1.0 + wrapHalf), 0.0);

    // Subsurface backlight: when the normal points away from the light,
    // simulate light transmitting through the material to the shadow side.
    // This is what makes a dewdrop, milky glass, or noble-gas atom read as
    // "lit from within" rather than as a painted shadow.
    float backLight = max(dot(-normal, L), 0.0);
    backLight = pow(backLight, 3.0) * subsurface;

    // Combine: dielectric portion uses (1-F) energy conservation; metalness
    // attenuates the diffuse term entirely (metals don't have diffuse).
    vec3 kD = (vec3(1.0) - F) * (1.0 - metalness);

    // Secondary fill light — wrap-shaded for consistency.
    float wrapNoL2 = max((dot(normal, uFillLightDir) + wrapHalf) / (1.0 + wrapHalf), 0.0) * 0.3;

    // Ambient floor — raised for metals since they have near-zero kD
    // (no diffuse channel) and depend entirely on env reflections.
    // When the PMREM probe is missing, metals would be invisible.
    float ambient = 0.15 + subsurface * 0.15 + metalness * 0.25;

    // Rim — Schlick-style fresnel rim for visual depth. Material-driven
    // base + user-controllable uRimLight additive boost for depth separation.
    float rim = pow(1.0 - NoV, 4.0);
    float rimDirMask = max(dot(normal, uRimLightDir), 0.0);
    float rimBase = mix(0.15, 0.5, metalness) + subsurface * 0.4;
    // Base rim comes from all sides (white/vColor), extra rim light is directional and tinted
    vec3 rimBaseColor = mix(vec3(1.0), vColor, metalness) * rim * rimBase;
    vec3 rimDirColor = uRimLightColor * rim * uRimLight * rimDirMask;
    vec3 rimColor = rimBaseColor + rimDirColor;

    // Apply texture based on uniform
    vec3 texColor = vColor;
    if (uTextureMode == 1) {
      // Noise
      float noiseVal = rand(vUv * 500.0);
      texColor *= mix(0.7, 1.0, noiseVal);
    } else if (uTextureMode == 2) {
      // Scratched (procedural lines)
      float line = rand(floor(vUv * 100.0));
      if (line > 0.95 && rand(vUv * 50.0) > 0.5) {
        texColor *= 0.5;
      }
    }

    // ─── PMREM IBL — sample the real environment cube ────────────────
    // tEnvMap is drei's <Environment>, processed by Three's PMREMGenerator.
    // textureCubeUV (from cube_uv_reflection_fragment) decodes the
    // octahedral-packed atlas and selects the right mip from roughness.
    // Specular probe: along reflection vector. Diffuse irradiance: along
    // surface normal at near-max roughness (acts as a tinted ambient).
    vec3 reflectVec = reflect(-V, normal);
    vec3 envSpec;
    vec3 envAvg;
    if (uHasEnv == 1) {
      // Roughness floor for the mip select: impostor-sphere normals vary
      // fast across a pixel, so sampling the sharpest env mips on low-
      // roughness metals aliased into a crawling shimmer under motion.
      // Clamping to ~0.18 costs negligible sharpness, kills the strobe.
      envSpec = textureCubeUV(tEnvMap, reflectVec, max(roughness, 0.18)).rgb * uEnvIntensity;
      envAvg  = textureCubeUV(tEnvMap, normal,     1.0).rgb * uEnvIntensity;
    } else {
      // No PMREM env — use brighter fallback so atoms are always visible.
      // Metals depend entirely on env reflections; without a probe,
      // specular is the only light path that survives (kD≈0). The
      // directional-dependent specular from LIGHT_DIR alone can leave
      // shadow-side fragments at pixel values [2,3,6]. Fix: strong
      // fallback probe that guarantees readability.
      envSpec = vec3(0.8);
      envAvg  = vec3(0.6);
    }

    // Final combine — Cook-Torrance + Burley diffuse + subsurface backlight + rim + IBL + emission.
    //   - Diffuse uses Burley wrap (wrapNoL) which softens the shadow line.
    //   - kD = (1-F)(1-metalness) implements energy conservation: metals
    //     have no diffuse contribution, dielectrics share energy with spec.
    //   - IBL specular: F0 * envSpec gives metals a real-feeling environment
    //     reflection that varies with viewing angle. Replaces the flat
    //     F0 * (ambient + 0.4) baseline.
    //   - IBL diffuse: envAvg as the ambient-irradiance color (tinted!).
    //   - Specular is the full Cook-Torrance term × NoL.
    //   - backLight × texColor gives translucent atoms a subtle glow on
    //     the shadow side — dewdrop / glass / noble gas read.
    //   - Rim is fresnel-driven, color-tinted by metalness.
    //   - Emission: per-element baseline glow from the palette row 1.
    vec3 envIrradiance = envAvg * (ambient + 0.4);
    // Main directional light is considered white, fill light is tinted
    vec3 diffuseIrradiance = envIrradiance + vec3(1.0) * wrapNoL * 0.7 + uFillLightColor * wrapNoL2;
    vec3 diffuseTerm = kD * texColor * diffuseIrradiance;
    vec3 iblSpecular = F0 * envSpec * (0.5 + 0.5 * (1.0 - roughness));
    vec3 specularTerm = specular * NoL * 1.5;
    vec3 backTerm = texColor * backLight * 0.6;
    // Per-element emission baseline + property-driven emission boost.
    //   - Baseline: per-element emission × intensity (radioactives glow).
    //   - Property-driven: when in property color mode, atoms with high
    //     normalized property emit additional light tinted by the colormap-
    //     mapped color. Reads as "this atom is doing something."
    vec3 emissive = emissionColor * emissionIntensity;
    if (uColorMode == 2 && uPropEmission > 0.0) {
      emissive += vColor * vPropValue * uPropEmission;
    }
    vec3 color = diffuseTerm + iblSpecular + specularTerm + backTerm + rimColor + emissive;

    // ─── Minimum visibility floor ──────────────────────────────────
    // Guarantee atoms are always distinguishable from the background,
    // even when the env map fails to load or metallic BRDF zeroes out
    // the diffuse channel. This is a perceptual safety net, not a
    // physical term — it adds a tiny amount of base color so no atom
    // ever renders as pure black.
    vec3 minFloor = texColor * 0.08;
    color = max(color, minFloor);

    // ─── Etched annotation overlay ────────────────────────────────────
    // Only the targeted atom executes this branch. We project the
    // view-space normal into a stamp UV: the camera-facing pole maps to
    // (0.5, 0.5), edges of the visible hemisphere fall outside [0,1].
    // etchScale > 1.0 keeps the text inside a small central patch of the
    // silhouette so it reads as a label, not a tattoo wrapping around.
    if (uHasEtch == 1 && abs(vAtomId - uEtchAtomId) < 0.5) {
      float etchScale = 1.5;
      vec2 etchUv = vec2(normal.x * etchScale + 0.5, -normal.y * etchScale + 0.5);
      if (etchUv.x > 0.0 && etchUv.x < 1.0 && etchUv.y > 0.0 && etchUv.y < 1.0) {
        float etchAlpha = texture2D(tEtchTexture, etchUv).a;
        // Darken where text is (engraved depth) plus a subtle warm tint so
        // it reads as a stamped marker rather than a paint splotch.
        vec3 engraved = color * 0.32;
        color = mix(color, engraved, etchAlpha);
      }
    }

    // Correct depth via projected hit point
    vec4 clipPos = projectionMatrix * vec4(hitPoint, 1.0);
    float ndcDepth = clipPos.z / clipPos.w;
    gl_FragDepth = ndcDepth * 0.5 + 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`;function ue(e){const o=new Uint8Array(1024);for(let t=0;t<256;t++){const[r,l,c]=e(t);o[t*4]=Math.round(r*255),o[t*4+1]=Math.round(l*255),o[t*4+2]=Math.round(c*255),o[t*4+3]=255}const s=new we(o,256,1,Ae);return s.minFilter=me,s.magFilter=me,s.needsUpdate=!0,s}function qo(){const e=zo(),o=new Uint8Array(256*2*4);for(let t=0;t<o.length;t++)o[t]=Math.max(0,Math.min(255,Math.round(e[t]*255)));const s=new we(o,256,2,Ae);return s.minFilter=me,s.magFilter=me,s.needsUpdate=!0,s}function qe(e){const o=new Uint8Array(1024);for(let t=0;t<256;t++){const r=t/255,[l,c,k]=e(r);o[t*4]=Math.round(l*255),o[t*4+1]=Math.round(c*255),o[t*4+2]=Math.round(k*255),o[t*4+3]=255}const s=new we(o,256,1,Ae);return s.minFilter=ze,s.magFilter=ze,s.needsUpdate=!0,s}const Xo=5e4;function os({frame:e,nextFrame:o,interpolationFactor:s,colorMode:t="type",colorProperty:r,colormap:l="viridis",propRange:c,scale:k=1,renderStyle:Q="standard",maxAtoms:F,onSpatialHash:x,highlightedAtoms:g,hiddenAtomTypes:N,atomTypeScales:V,botanicalMode:L=!1,atomColorSource:w="colormap",etchTexture:_=null,etchAtomId:R=null,propertyEmissionStrength:G=0,materialPreset:A="default",materialIntensity:C=0,rimLightIntensity:U=0,surfaceRoughness:B=0,surfacePolish:ee=0,surfaceClearcoat:fe=0,keyLightAzimuth:Y=40,keyLightElevation:q=45,fillLightAzimuth:X=-120,fillLightElevation:oe=10,rimLightAzimuth:W=160,rimLightElevation:Se=30,fillLightColor:Ie="#8888ff",rimLightColor:xe="#ffffff",atomTexture:pe="none",loadedAtomCount:Ze,frameIndex:Re,liveStateRef:Je}){const Qe=v.useRef(null),he=v.useRef(new vo(3)),eo=v.useRef(0),{scene:oo}=bo(),se=v.useRef(Math.max(Xo,Math.ceil(e.natoms*1.2)));e.natoms>se.current&&(se.current=Math.max(se.current*1.5,Math.ceil(e.natoms*1.2)));let S=se.current;F!==void 0&&S>F&&(S=F);const f=v.useMemo(()=>{const a=new mo,u=new Float32Array([-1,-1,0,1,-1,0,1,1,0,-1,1,0]),n=new Uint16Array([0,1,2,0,2,3]);a.setAttribute("position",new He(u,3)),a.setIndex(new He(n,1));const d=new z(new Float32Array(S*3),3);d.setUsage(j),a.setAttribute("instancePosition",d);const p=new z(new Float32Array(S*3),3);p.setUsage(j),a.setAttribute("instanceTargetPosition",p);const I=new z(new Float32Array(S),1);I.setUsage(j),a.setAttribute("instanceRadius",I);const M=new z(new Float32Array(S),1);M.setUsage(j),a.setAttribute("instanceTypeId",M);const m=new z(new Float32Array(S),1);m.setUsage(j),a.setAttribute("instancePropValue",m);const E=new z(new Float32Array(S),1);return E.setUsage(j),a.setAttribute("instanceAtomId",E),a.instanceCount=0,a},[S]),P=v.useMemo(()=>{const a=ue(d=>Ao),u=qe(d=>[d,d,d]),n=qo();return new fo({vertexShader:jo,fragmentShader:Yo,uniforms:{uPalette:{value:a},uColormap:{value:u},uColorMode:{value:0},uUniformColor:{value:new $(.6,.6,.6)},uTextureMode:{value:0},uMaterialPreset:{value:0},uMaterialIntensity:{value:0},uRimLight:{value:0},uSurfaceRoughness:{value:0},uSurfacePolish:{value:0},uSurfaceClearcoat:{value:0},uLightDir:{value:new $(.4,.7,.6)},uProgress:{value:0},uFillLightDir:{value:new $(-.3,-.2,.8)},uRimLightDir:{value:new $(0,0,-1)},uFillLightColor:{value:new Oe("#8888ff")},uRimLightColor:{value:new Oe("#ffffff")},uMaterialPalette:{value:n},tEnvMap:{value:null},uEnvIntensity:{value:1},uHasEnv:{value:0},tEtchTexture:{value:null},uEtchAtomId:{value:-1},uHasEtch:{value:0},uPropEmission:{value:0}},depthWrite:!0,depthTest:!0,transparent:!1,side:po})},[]),T=v.useMemo(()=>t!=="property"||!r?null:e.properties?.get(r)??null,[e,t,r]),[so,to]=v.useMemo(()=>{if(!T)return[0,1];let a=1/0,u=-1/0;for(let n=0;n<T.length;n++)T[n]<a&&(a=T[n]),T[n]>u&&(u=T[n]);return[a===1/0?0:a,u===-1/0?1:u]},[T]),te=c?.[0]??so,be=c?.[1]??to,ae=de[l]??de.viridis;v.useEffect(()=>{const a=P.uniforms;a.uColorMode.value=t==="property"?2:t==="uniform"?1:0;let u=0;pe==="noise"&&(u=1),pe==="scratched"&&(u=2),a.uTextureMode.value=u;let n=0;if(A==="matte"&&(n=1),A==="metallic"&&(n=2),A==="glass"&&(n=3),A==="plastic"&&(n=4),a.uMaterialPreset.value=n,a.uMaterialIntensity.value=C??0,a.uRimLight.value=U??0,a.uSurfaceRoughness.value=B??0,a.uSurfacePolish.value=ee??0,a.uPropEmission.value=G,a.uFillLightColor.value.set(Ie),a.uRimLightColor.value.set(xe),a.tEtchTexture.value=_??null,a.uEtchAtomId.value=R??-1,a.uHasEtch.value=_&&R!=null&&R>=0?1:0,t==="uniform"){const[M,m,E]=ae(0);a.uUniformColor.value.set(M,m,E)}const d=a.uPalette.value,p=L?"botanical":w;if(p==="botanical")a.uPalette.value=ue(M=>{const m=So[M]??[.3,.5,.2];return[m[0],m[1],m[2]]});else if(p==="element")a.uPalette.value=ue(M=>{const m=ko(M);return We(m.color)});else{const M=new Set;for(let y=0;y<e.natoms;y++)M.add(e.types[y]);const m=Array.from(M).sort((y,H)=>y-H),E=new Map;for(let y=0;y<m.length;y++)E.set(m[y],m.length>1?y/(m.length-1):.5);a.uPalette.value=ue(y=>{const H=E.get(y)??.5;return ae(H)})}d.dispose();const I=a.uColormap.value;a.uColormap.value=qe(ae),I.dispose()},[t,l,ae,L,w,P,e.types,e.natoms,pe,A,G,_,R,C,U,B,ee,fe,Ie,xe]);const ye=v.useMemo(()=>{const a=(u,n)=>{const d=u*Math.PI/180,p=n*Math.PI/180;return new $(Math.cos(p)*Math.sin(d),Math.sin(p),Math.cos(p)*Math.cos(d)).normalize()};return{key:a(Y??40,q??45),fill:a(X??-120,oe??10),rim:a(W??160,Se??30)}},[Y,q,X,oe,W,Se]),ve=v.useMemo(()=>new $,[]);yo(({camera:a})=>{const u=oo.environment,n=P.uniforms;u!==n.tEnvMap.value&&(n.tEnvMap.value=u,n.uHasEnv.value=u?1:0);const d=a.matrixWorldInverse;n.uLightDir.value.copy(ve.copy(ye.key).transformDirection(d)),n.uFillLightDir.value.copy(ve.copy(ye.fill).transformDirection(d)),n.uRimLightDir.value.copy(ve.copy(ye.rim).transformDirection(d));const p=Je?.current,I=p&&Re!=null?p.effectiveFrame-Re:s??0;n.uProgress.value=I<0?0:I>1?1:I});const Pe=v.useCallback(()=>{const a=typeof requestIdleCallback<"u"?requestIdleCallback:i=>setTimeout(i,0),u=typeof cancelIdleCallback<"u"?cancelIdleCallback:clearTimeout,n=a(()=>{he.current.build(e.positions,e.natoms),x?.(he.current)}),d=()=>u(n),p=e.positions,I=e.types,m=o&&o.natoms===e.natoms?o.positions:null;let E=0,y=0,H=0;const re=!!e.boxBounds;re&&(E=e.boxBounds[1]-e.boxBounds[0],y=e.boxBounds[3]-e.boxBounds[2],H=e.boxBounds[5]-e.boxBounds[4]);const K=256,Te=new Float32Array(K).fill(1.2),Ee=new Uint8Array(K),Le=new Float32Array(K).fill(1);for(let i=0;i<K;i++)Te[i]=L?Io[i]??1.2:Ke[i]??1.2,N?.has(i)&&(Ee[i]=1),V?.[i]!==void 0&&(Le[i]=V[i]);const ge=f.attributes.instancePosition.array,O=f.attributes.instanceTargetPosition.array,ao=f.attributes.instanceRadius.array,ro=f.attributes.instanceTypeId.array,_e=f.attributes.instancePropValue.array,no=f.attributes.instanceAtomId.array;let h=0;const io=Ze??e.natoms;for(let i=0;i<io;i++){const ne=I[i]<K?I[i]:0,Ge=Ee[ne]?0:Te[ne]*k*Le[ne];if(Ge===0)continue;if(h>=S)break;const ie=p[i*3],le=p[i*3+1],ce=p[i*3+2],D=h*3;if(ge[D]=ie,ge[D+1]=le,ge[D+2]=ce,m){const ke=re?E:0,lo=re?y:0,co=re?H:0;O[D]=ie+Ce(m[i*3]-ie,ke),O[D+1]=le+Ce(m[i*3+1]-le,lo),O[D+2]=ce+Ce(m[i*3+2]-ce,co)}else O[D]=ie,O[D+1]=le,O[D+2]=ce;if(ao[h]=Ge,ro[h]=ne,T){const ke=T[i];_e[h]=be>te?(ke-te)/(be-te):.5}else _e[h]=0;no[h]=i,h++}eo.current=h,f.instanceCount=h;const De=f.attributes.instancePosition,Ne=f.attributes.instanceTargetPosition,Ue=f.attributes.instanceRadius,Fe=f.attributes.instanceTypeId,Ve=f.attributes.instancePropValue,Be=f.attributes.instanceAtomId;return De.needsUpdate=!0,Ne.needsUpdate=!0,Ue.needsUpdate=!0,Fe.needsUpdate=!0,Ve.needsUpdate=!0,Be.needsUpdate=!0,De.updateRange={offset:0,count:h*3},Ne.updateRange={offset:0,count:h*3},Ue.updateRange={offset:0,count:h},Fe.updateRange={offset:0,count:h},Ve.updateRange={offset:0,count:h},Be.updateRange={offset:0,count:h},d},[e,o,k,T,te,be,N,V,L,x,S,r,f]);return v.useEffect(()=>Pe(),[Pe]),v.useEffect(()=>()=>{f.dispose(),P.dispose(),P.uniforms.uPalette.value&&P.uniforms.uPalette.value.dispose(),P.uniforms.uColormap.value&&P.uniforms.uColormap.value.dispose(),he.current.clear()},[f,P]),uo.jsx("mesh",{ref:Qe,geometry:f,material:P,frustumCulled:!1})}export{os as A,So as B,de as C,Ao as D,J as E,vo as S,wo as T,Qo as a,ko as b,Ke as c,es as d,Jo as g,We as h};
