import { useState, useEffect, useRef, useCallback } from "react";

// ── Data: Cu70Zr30 metallic glass, 87 atoms, 5 keyframes ──
const D={"n":87,"bx":21.69,"k":[{"t":0,"x":[0,1.81,0,1.81,0,1.81,0,1.81,0,1.81,0,1.81,0,1.81,0,5.42,3.62,5.42,3.62,5.42,3.62,5.42,3.62,5.42,3.62,5.42,3.62,5.42,3.62,9.04,7.23,9.04,7.23,9.04,7.23,9.04,7.23,9.04,7.23,9.04,7.23,9.04,7.23,9.04,10.85,12.65,10.85,12.65,10.85,12.65,10.85,12.65,10.85,12.65,10.85,12.65,10.85,12.65,14.46,16.27,14.46,16.27,14.46,16.27,14.46,16.27,14.46,16.27,14.46,16.27,14.46,16.27,18.07,19.88,18.07,19.88,18.07,19.88,18.07,19.88,18.07,19.88,18.07,19.88,18.07,19.88,18.07],"y":[0,0,0,3.62,3.62,7.23,7.23,7.23,10.85,10.85,14.46,14.46,18.07,18.07,18.07,0,0,3.62,3.62,3.62,7.23,7.23,10.85,10.85,14.46,14.46,14.46,18.07,18.07,0,0,0,3.62,3.62,7.23,7.23,10.85,10.85,10.85,14.46,14.46,18.07,18.07,18.07,0,0,3.62,3.62,7.23,7.23,7.23,10.85,10.85,14.46,14.46,14.46,18.07,18.07,0,0,3.62,3.62,3.62,7.23,7.23,10.85,10.85,10.85,14.46,14.46,18.07,18.07,0,0,0,3.62,3.62,7.23,7.23,7.23,10.85,10.85,14.46,14.46,18.07,18.07,18.07],"z":[0,9.04,18.07,5.42,14.46,1.81,10.85,19.88,7.23,16.27,3.62,12.65,0,9.04,18.07,5.42,14.46,1.81,10.85,19.88,7.23,16.27,3.62,12.65,0,9.04,18.07,5.42,14.46,1.81,10.85,19.88,7.23,16.27,3.62,12.65,0,9.04,18.07,5.42,14.46,1.81,10.85,19.88,7.23,16.27,3.62,12.65,0,9.04,18.07,5.42,14.46,1.81,10.85,19.88,7.23,16.27,3.62,12.65,0,9.04,18.07,5.42,14.46,1.81,10.85,19.88,7.23,16.27,3.62,12.65,0,9.04,18.07,5.42,14.46,1.81,10.85,19.88,7.23,16.27,3.62,12.65,0,9.04,18.07],"tp":[1,1,2,2,2,1,2,1,1,1,1,2,2,1,1,2,1,2,2,1,2,1,2,1,1,1,2,2,2,1,2,2,2,2,2,2,2,1,2,2,1,2,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1,2,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,2,1,2,2,1,1,2,2,1,2,2],"ke":[.046,.032,.018,.054,.024,.023,.047,.043,.039,.053,.016,.042,.047,.027,.041,.033,.02,.043,.036,.042,.038,.049,.039,.027,.062,.027,.059,.038,.044,.054,.015,.051,.04,.037,.054,.059,.026,.025,.048,.03,.025,.035,.021,.036,.052,.06,.051,.032,.05,.022,.036,.047,.036,.05,.036,.039,.047,.053,.025,.05,.036,.043,.034,.04,.037,.034,.044,.031,.041,.036,.047,.041,.044,.041,.042,.053,.042,.049,.031,.04,.029,.025,.026,.026,.039,.034,.022]},{"t":2500,"x":[21.71,1.99,.02,1.84,.07,1.95,.01,1.86,.06,1.85,.01,1.85,21.58,1.85,21.71,5.45,3.62,5.47,3.64,5.41,3.62,5.4,3.6,5.44,3.71,5.37,3.63,5.43,3.58,9.16,7.25,9.03,7.26,8.91,7.2,9.07,7.27,9.01,7.22,9.12,7.33,9.01,7.15,8.95,10.93,12.57,10.83,12.74,10.96,12.56,10.85,12.63,10.92,12.62,10.83,12.75,10.86,12.7,14.41,16.41,14.65,16.14,14.63,16.21,14.55,16.36,14.46,16.29,14.55,16.29,14.42,16.23,18.11,20.04,18.18,20.08,18.28,19.99,18.2,19.87,18.11,19.74,18.15,20.06,18.3,19.8,18.28],"y":[.06,21.61,.01,3.57,3.47,7.29,7.27,7.23,10.9,10.76,14.37,14.45,18.09,18.1,18.17,.05,21.71,3.64,3.63,3.56,7.45,7.06,10.83,10.93,14.46,14.54,14.39,18.21,18.1,21.71,.08,.11,3.58,3.62,7.22,7.32,10.88,10.89,10.96,14.35,14.58,18.15,18.12,18,21.64,21.68,3.55,3.48,7.17,7.29,7.22,10.88,10.9,14.5,14.53,14.51,18.12,18.17,21.67,.2,3.7,3.69,3.52,7.36,7.17,10.81,10.87,10.94,14.45,14.51,18.15,17.93,21.73,21.74,.05,3.59,3.6,7.22,7.09,7.27,10.92,10.72,14.52,14.62,18.06,18.02,18.09],"z":[.04,9.15,17.94,5.43,14.53,1.93,10.81,20,7.2,16.24,3.56,12.64,.04,9.04,17.97,5.51,14.5,1.83,10.91,19.92,7.3,16.28,3.7,12.73,.08,8.8,17.98,5.44,14.41,1.85,10.94,19.91,7.24,16.29,3.65,12.68,21.68,9.03,18.06,5.44,14.49,1.77,10.8,19.85,7.28,16.43,3.67,12.75,21.71,9.01,18.13,5.38,14.6,1.76,10.77,19.79,7.17,16.23,3.7,12.69,.15,8.91,18.14,5.4,14.42,1.64,10.89,19.76,7.23,16.18,3.65,12.86,.05,9.09,18.1,5.31,14.45,1.75,10.93,19.94,7.19,16.25,3.74,12.65,0,8.99,18.16],"tp":[1,1,2,2,2,1,2,1,1,1,1,2,2,1,1,2,1,2,2,1,2,1,2,1,1,1,2,2,2,1,2,2,2,2,2,2,2,1,2,2,1,2,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1,2,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,2,1,2,2,1,1,2,2,1,2,2],"ke":[.086,.108,.117,.107,.098,.084,.105,.088,.122,.093,.12,.09,.092,.107,.102,.099,.099,.108,.096,.102,.109,.083,.096,.095,.106,.087,.098,.107,.103,.092,.099,.088,.101,.095,.095,.094,.108,.091,.112,.105,.095,.089,.08,.092,.118,.067,.09,.111,.097,.092,.094,.098,.1,.116,.118,.086,.117,.098,.117,.095,.079,.096,.1,.099,.082,.077,.094,.088,.1,.093,.101,.082,.095,.102,.1,.079,.098,.094,.089,.103,.101,.098,.088,.102,.107,.1,.106]},{"t":5000,"x":[.03,1.77,.01,1.87,.04,1.71,21.76,1.62,.17,1.8,.07,1.95,.06,1.91,.1,5.44,3.54,5.39,3.46,5.3,3.51,5.39,3.55,5.44,3.86,5.51,3.39,5.57,3.74,9.11,7.33,9.27,7.42,9.13,7.26,9.14,7.21,9.16,7.24,9.01,7.3,9.15,7.19,9.02,10.9,12.63,10.93,12.89,10.86,12.82,10.86,12.69,10.94,12.54,10.93,12.6,10.76,12.82,14.55,16.41,14.74,16.37,14.43,16.42,14.56,16.44,14.5,16.36,14.62,16.21,14.53,16.38,18.13,19.99,18.23,19.93,18.12,20.04,18.14,20.05,18.39,19.92,18.15,19.94,18.05,20.02,18.05],"y":[21.77,21.76,.04,3.68,3.58,7.4,7.14,7.19,10.95,10.76,14.54,14.4,18.22,18.22,18.24,.03,21.79,3.53,3.61,3.47,7.12,7.24,11.14,10.68,14.54,14.43,14.5,18.1,18.21,21.77,.07,21.69,3.61,3.77,7.31,7.21,10.97,10.89,10.87,14.35,14.5,18.17,18.23,18.28,.2,.09,3.65,3.68,7.2,7.43,7.25,10.91,10.9,14.43,14.58,14.69,18.28,18.16,21.77,.05,3.65,3.48,3.5,7.41,7.22,10.9,10.87,10.85,14.46,14.73,18.17,18.14,21.76,21.7,.03,3.49,3.57,7.11,7.23,7.27,10.94,10.74,14.46,14.32,18.25,18.21,18.49],"z":[21.68,9.06,18.03,5.56,14.46,1.85,10.85,20.09,7.23,16.32,3.68,12.59,.06,9.05,18.19,5.56,14.53,1.73,10.97,20.01,7.23,16.23,3.79,12.58,.1,9.13,18.28,5.46,14.61,1.75,10.85,20,7.19,16.24,3.57,12.6,21.59,9.05,18.08,5.42,14.62,1.92,10.75,19.84,7.21,16.41,3.41,12.54,21.78,9.14,18.05,5.51,14.49,1.73,10.84,20.01,7.19,16.43,3.71,12.7,21.65,9.14,18.16,5.51,14.52,1.63,10.9,20.11,7.32,16.2,3.74,12.69,21.62,9.15,17.99,5.35,14.48,1.83,10.84,20.11,7.48,16.36,3.64,12.76,.06,9.07,17.97],"tp":[1,1,2,2,2,1,2,1,1,1,1,2,2,1,1,2,1,2,2,1,2,1,2,1,1,1,2,2,2,1,2,2,2,2,2,2,2,1,2,2,1,2,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1,2,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,2,1,2,2,1,1,2,2,1,2,2],"ke":[.151,.185,.138,.16,.155,.146,.17,.15,.154,.151,.159,.155,.161,.166,.149,.161,.169,.141,.15,.171,.159,.145,.149,.163,.166,.131,.158,.161,.156,.163,.134,.168,.14,.153,.153,.14,.166,.161,.143,.158,.151,.144,.155,.159,.161,.157,.157,.164,.167,.164,.141,.147,.137,.152,.158,.154,.17,.17,.157,.148,.168,.15,.156,.147,.154,.171,.176,.159,.162,.16,.167,.172,.184,.141,.146,.159,.155,.167,.144,.156,.156,.165,.159,.147,.164,.151,.137]},{"t":7500,"x":[.14,2.18,.17,1.38,.29,1.59,.26,1.91,.14,1.83,.46,1.97,.19,1.51,21.86,5.92,3.62,5.19,3.59,5.81,3.56,5.53,3.93,5.57,3.9,5.73,3.86,5.61,3.81,8.93,7.23,8.79,6.95,9.22,7.26,9.28,7.16,9.27,7.33,9.39,7.1,9.09,7.32,9.13,10.74,12.93,10.7,12.92,10.99,12.8,11.13,12.89,10.68,12.93,11.1,12.68,11.14,12.71,14.64,16.35,14.82,16.37,14.68,16.55,14.61,16.58,14.67,16.45,14.57,16.51,14.47,16.45,18.21,20.17,18.35,20.01,18.56,20.02,18.3,20.13,18.08,20.08,18.5,19.98,18.08,19.92,17.96],"y":[.05,.24,21.64,3.62,3.55,7.34,7.42,6.85,11.02,10.72,14.75,14.75,18.55,18.31,18.57,.3,.14,3.84,3.62,3.83,7.11,7.14,11.14,11.28,14.64,14.37,14.31,17.89,18.38,21.79,.07,.02,4.01,3.67,7.1,7.35,10.45,11.03,10.92,14.67,14.61,18.44,17.84,18.38,.27,.39,3.96,3.73,7.19,7.5,7.49,11.21,11.07,14.45,14.95,14.2,18.17,18.22,.13,21.79,3.55,3.56,3.64,7.18,7.48,11.11,11.02,10.82,14.28,14.11,18.12,18.24,.38,.04,21.74,3.56,3.76,7.53,7.88,6.96,11.06,10.61,14.35,14.33,18.15,18.01,18.4],"z":[21.54,9.38,18.42,5.36,14.11,1.8,10.86,20.2,7.05,15.91,3.78,13.06,.08,9.35,18.27,5.62,14.71,1.75,10.79,19.87,7.21,16.22,3.95,12.8,21.83,9.16,17.83,5.66,14.63,1.98,11.07,20.1,7.42,16.49,3.93,12.81,21.75,9.35,18.4,5.66,14.69,1.57,11,19.82,7.55,16.38,3.8,12.43,.2,9.31,18.22,5.39,14.73,1.76,10.99,19.95,7.32,16.5,4.05,12.64,21.69,9.13,18.23,5.11,14.37,1.63,10.97,19.84,7.33,16.39,3.54,12.82,.16,9.25,18.49,5.58,14.81,1.69,10.68,20.08,7.41,16.67,4,12.95,21.79,8.91,18],"tp":[1,1,2,2,2,1,2,1,1,1,1,2,2,1,1,2,1,2,2,1,2,1,2,1,1,1,2,2,2,1,2,2,2,2,2,2,2,1,2,2,1,2,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1,2,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,2,1,2,2,1,1,2,2,1,2,2],"ke":[.193,.208,.226,.217,.2,.204,.218,.193,.2,.223,.214,.208,.222,.218,.2,.234,.204,.209,.222,.197,.222,.211,.21,.217,.215,.216,.207,.22,.197,.211,.211,.208,.213,.199,.22,.189,.215,.219,.208,.208,.217,.196,.221,.212,.229,.203,.205,.217,.208,.226,.216,.216,.194,.224,.223,.216,.204,.214,.229,.206,.218,.209,.224,.221,.216,.198,.198,.211,.228,.217,.206,.216,.206,.194,.215,.211,.224,.222,.221,.225,.199,.221,.213,.22,.216,.212,.224]},{"t":9500,"x":[.18,1.57,.15,1.54,.57,1.84,.13,1.57,.4,2.02,21.38,1.45,.68,2.06,21.66,4.8,3.81,5.6,4.51,5.77,3.24,5.38,3.68,5.09,2.97,5.87,3.65,4.9,3.61,8.67,7.16,9.87,7.23,9.42,6.86,8.59,6.84,8.9,7.65,9.28,7.52,9.45,6.88,8.82,10.8,12.65,11.08,12.49,10.34,12.74,10.77,12.45,10.65,12.59,11.05,12.48,10.95,12.88,14.51,16.74,15.22,16.83,14.37,16.18,15.2,16.1,14.51,16.48,14.71,15.88,14.61,16.19,18.29,19.8,17.96,19.82,18.16,20.45,18.27,19.9,18.5,20.11,18.39,20.63,18.05,20.41,18.35],"y":[21.47,.8,21.82,4.11,3.78,7.29,7.86,7.33,11.11,11.23,14.22,14.31,18.65,18.69,18.41,21.31,21.38,3.93,3.67,4.11,7.48,6.79,10.8,10.38,14.78,14.39,14.58,18.78,18.43,.02,21.56,21.75,4.03,3.69,8.08,6.8,11.49,10.85,11.36,14.5,15.44,18.19,17.95,18.2,.09,21.88,4.27,3.63,7.76,7.42,7.46,11.01,10.6,14.63,15.87,14.54,18.31,17.74,21.39,21.62,4.44,3.4,3.71,7.31,7.34,11.02,10.62,10.6,14.37,14.74,17.99,18.67,.4,21.52,21.85,4.27,3.09,7.24,7.32,7.95,11.17,10.87,14.5,14.23,17.83,18.13,18.25],"z":[.26,9.38,18.63,5.25,15.23,1.88,10.94,20.09,7.27,16.19,3.38,12.73,21.61,9.19,18.56,5.5,14.46,1.79,10.3,20.07,7.74,16.86,3.52,12.58,.25,8.35,18.28,5.55,13.97,1.51,11.22,19.49,7.84,16.27,3.92,12.4,.38,9.54,18.22,5.37,14.78,1.63,11.31,19.83,6.93,16.22,3.73,12.96,21.88,9.12,18.44,5.83,14.5,1.44,10.81,20.68,7.22,16.4,3.63,12.74,.64,9.07,18.04,5.21,14.35,2.02,10.95,20.35,7.16,15.99,3.24,12.86,.39,9.25,17.96,5.28,15.25,1.94,10.94,19.97,7.1,16.43,3.45,13.1,21.64,9.07,18.26],"tp":[1,1,2,2,2,1,2,1,1,1,1,2,2,1,1,2,1,2,2,1,2,1,2,1,1,1,2,2,2,1,2,2,2,2,2,2,2,1,2,2,1,2,1,1,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1,2,1,1,1,2,2,1,1,1,1,2,1,1,1,1,1,1,2,1,2,2,1,1,2,2,1,2,2],"ke":[.247,.239,.26,.267,.266,.258,.254,.272,.248,.261,.262,.263,.26,.271,.259,.252,.265,.256,.26,.246,.264,.257,.251,.262,.244,.281,.236,.25,.242,.254,.267,.254,.267,.263,.268,.251,.264,.254,.266,.252,.258,.263,.253,.263,.245,.255,.247,.267,.265,.284,.252,.25,.247,.243,.257,.245,.264,.241,.243,.256,.251,.277,.258,.255,.252,.25,.254,.253,.268,.265,.253,.275,.243,.257,.265,.258,.255,.258,.256,.273,.271,.246,.255,.238,.256,.271,.262]}],"th":[{"T":300,"pe":-4.386,"ke":.038},{"T":389,"pe":-4.388,"ke":.05},{"T":479,"pe":-4.386,"ke":.062},{"T":568,"pe":-4.387,"ke":.074},{"T":658,"pe":-4.387,"ke":.085},{"T":747,"pe":-4.388,"ke":.097},{"T":837,"pe":-4.385,"ke":.108},{"T":926,"pe":-4.384,"ke":.12},{"T":1016,"pe":-4.386,"ke":.131},{"T":1105,"pe":-4.353,"ke":.143},{"T":1195,"pe":-4.325,"ke":.155},{"T":1284,"pe":-4.303,"ke":.166},{"T":1374,"pe":-4.275,"ke":.178},{"T":1463,"pe":-4.249,"ke":.189},{"T":1553,"pe":-4.22,"ke":.201},{"T":1642,"pe":-4.194,"ke":.212},{"T":1732,"pe":-4.165,"ke":.224},{"T":1821,"pe":-4.144,"ke":.235},{"T":1911,"pe":-4.113,"ke":.247},{"T":2000,"pe":-4.086,"ke":.258}]};

const NKF=5, BX=D.bx, CU=[77,184,255], ZR=[255,130,90];

function catmullRom(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3)}
function getAtoms(t){
  const seg=t*(NKF-1),ki=Math.min(Math.floor(seg),NKF-2),lt=seg-ki;
  const i0=Math.max(0,ki-1),i1=ki,i2=Math.min(NKF-1,ki+1),i3=Math.min(NKF-1,ki+2),K=D.k,o=[];
  for(let i=0;i<D.n;i++){
    let x=catmullRom(K[i0].x[i],K[i1].x[i],K[i2].x[i],K[i3].x[i],lt);
    let y=catmullRom(K[i0].y[i],K[i1].y[i],K[i2].y[i],K[i3].y[i],lt);
    let z=catmullRom(K[i0].z[i],K[i1].z[i],K[i2].z[i],K[i3].z[i],lt);
    const ke=catmullRom(K[i0].ke[i],K[i1].ke[i],K[i2].ke[i],K[i3].ke[i],lt);
    x=((x%BX)+BX)%BX;y=((y%BX)+BX)%BX;z=((z%BX)+BX)%BX;
    o.push({x,y,z,tp:K[i1].tp[i],ke:Math.max(0,ke)});
  }
  return o;
}
function getThermo(t){const s=t*(D.th.length-1),i=Math.min(Math.floor(s),D.th.length-2),l=s-i,a=D.th[i],b=D.th[i+1];
  return{T:a.T+(b.T-a.T)*l,pe:a.pe+(b.pe-a.pe)*l,ke:a.ke+(b.ke-a.ke)*l}}

// ── Camera presets ──
const VIEWS = {
  "3/4":     { rx: -.4,  ry: .6,  label: "3/4" },
  "front":   { rx: 0,    ry: 0,   label: "Front" },
  "top":     { rx: -1.57,ry: 0,   label: "Top" },
  "side":    { rx: 0,    ry: 1.57,label: "Side" },
  "[110]":   { rx: -.45, ry: .78, label: "[110]" },
  "[111]":   { rx: -.62, ry: .52, label: "[111]" },
};

const BKGS = ["#030508","#0a0f1a","#141820","#1a1a1a","#f5f0e8","#ffffff"];
const PALETTES = {
  "Cu/Zr": {c1:[77,184,255],c2:[255,130,90]},
  "CPK":   {c1:[200,120,50],c2:[120,200,100]},
  "Mono":  {c1:[180,190,200],c2:[100,110,120]},
  "Print": {c1:[40,60,120],c2:[180,60,40]},
};

// ── Rendering ──
function renderScene(ctx,W,H,atoms,cfg){
  const{bg,pal,lightDir,lightInt,ambient,specPow,colorBy}=cfg;
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  const cx=BX/2,cy=BX/2,cz=BX/2,{rx,ry}=cfg.angle;
  const cRx=Math.cos(rx),sRx=Math.sin(rx),cRy=Math.cos(ry),sRy=Math.sin(ry);
  const dist=42;
  const projected=[];
  const keMin=Math.min(...atoms.map(a=>a.ke)),keMax=Math.max(...atoms.map(a=>a.ke)),keRng=keMax-keMin||.01;
  const lx=lightDir[0],ly=lightDir[1],lz=lightDir[2],lLen=Math.sqrt(lx*lx+ly*ly+lz*lz)||1;
  const lnx=lx/lLen,lny=ly/lLen,lnz=lz/lLen;

  for(const a of atoms){
    let x=a.x-cx,y=a.y-cy,z=a.z-cz;
    let x2=x*cRy-z*sRy,z2=x*sRy+z*cRy;
    let y2=y*cRx-z2*sRx,z3=y*sRx+z2*cRx;
    const d=dist-z3,scale=280/d;
    const nx2=(x/(BX*.5))||0,ny2=(y/(BX*.5))||0; // crude normal approx for color
    projected.push({px:W/2+x2*scale,py:H/2+y2*scale,depth:z3,scale,tp:a.tp,ke:a.ke,r:((a.tp===1?1.28:1.6)*.85)*scale,z3});
  }
  projected.sort((a,b)=>a.depth-b.depth);

  const c1=pal.c1,c2=pal.c2;
  const isLight=bg==="#f5f0e8"||bg==="#ffffff";
  const shadowColor=isLight?"rgba(0,0,0,.08)":"#000";
  const shadowAlpha=isLight?.1:.2;
  const highlightAlpha=isLight?.15:.3;

  for(const p of projected){
    if(p.px<-p.r*3||p.px>W+p.r*3||p.py<-p.r*3||p.py>H+p.r*3)continue;
    let cr,cg,cb;
    if(colorBy==="ke"){
      const t2=Math.max(0,Math.min(1,(p.ke-keMin)/keRng));
      cr=Math.min(255,68+t2*187-t2*t2*90|0);cg=Math.min(255,2+t2*230|0);cb=Math.min(255,84+(1-t2)*130*t2*2.8+t2*(37-84)|0);
    } else { [cr,cg,cb]=p.tp===1?c1:c2; }

    // Lighting: simple directional
    const nz_approx = 1 - (p.depth / 15) * .15; // fake forward-facing normal
    const diffuse = Math.max(0, lnz * nz_approx) * lightInt;
    const lit = ambient + diffuse;
    cr = Math.min(255, cr * lit | 0); cg = Math.min(255, cg * lit | 0); cb = Math.min(255, cb * lit | 0);

    const df=Math.max(.35,Math.min(1,1-(p.depth/22)*.2));
    ctx.globalAlpha=shadowAlpha*df;ctx.fillStyle=shadowColor;
    ctx.beginPath();ctx.arc(p.px+.5,p.py+1,p.r*1.5,0,Math.PI*2);ctx.fill();

    ctx.globalAlpha=.93*df;
    const g=ctx.createRadialGradient(p.px-p.r*.2,p.py-p.r*.23,p.r*.04,p.px,p.py,p.r);
    g.addColorStop(0,`rgba(255,255,255,${highlightAlpha})`);
    g.addColorStop(.28,`rgb(${cr},${cg},${cb})`);
    g.addColorStop(.82,`rgb(${cr*.48|0},${cg*.48|0},${cb*.48|0})`);
    g.addColorStop(1,`rgba(${cr*.22|0},${cg*.22|0},${cb*.22|0},.5)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.px,p.py,p.r,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}

// ── Tiny icon button ──
const Ib=({children,active,onClick,title})=>(
  <button onClick={onClick} title={title} style={{
    fontSize:10,padding:"4px 8px",borderRadius:4,cursor:"pointer",border:"none",
    background:active?"rgba(0,200,240,.12)":"rgba(255,255,255,.04)",
    color:active?"#00c8f0":"#5a6a82",lineHeight:1,whiteSpace:"nowrap",
  }}>{children}</button>
);

export default function PubView(){
  const cvs=useRef(null),wrap=useRef(null);
  const [playing,setPlaying]=useState(true);
  const [colorBy,setColorBy]=useState("type");
  const [bg,setBg]=useState("#030508");
  const [palName,setPalName]=useState("Cu/Zr");
  const [lightDir,setLightDir]=useState([.5,.8,.6]);
  const [lightInt,setLightInt]=useState(.7);
  const [ambient,setAmbient]=useState(.35);
  const [specPow]=useState(32);
  const [panel,setPanel]=useState(null); // "view"|"style"|"export"
  const [recording,setRecording]=useState(false);
  const [recFrames,setRecFrames]=useState([]);
  const tRef=useRef(0);
  const angleRef=useRef({rx:-.4,ry:.6});
  const dragRef=useRef(null);
  const rafRef=useRef(null);
  const [dt,setDt]=useState(0);

  const onDown=useCallback(e=>{dragRef.current={x:e.clientX,y:e.clientY,...angleRef.current}},[]);
  const onMove=useCallback(e=>{if(!dragRef.current)return;
    angleRef.current={rx:Math.max(-1.5,Math.min(1.5,dragRef.current.rx+(e.clientY-dragRef.current.y)*.007)),
      ry:dragRef.current.ry+(e.clientX-dragRef.current.x)*.007}},[]);
  const onUp=useCallback(()=>{dragRef.current=null},[]);

  const cfg=useRef({bg,pal:PALETTES[palName],lightDir,lightInt,ambient,specPow,colorBy,angle:angleRef.current});
  useEffect(()=>{cfg.current={bg,pal:PALETTES[palName],lightDir,lightInt,ambient,specPow,colorBy,angle:angleRef.current}});

  // 60fps loop
  useEffect(()=>{
    let lastUI=0;
    const tick=()=>{
      if(playing&&!dragRef.current){tRef.current+=.0012;if(tRef.current>=1)tRef.current=0;angleRef.current.ry+=.003}
      cfg.current.angle=angleRef.current;
      const c=cvs.current,w=wrap.current;
      if(c&&w){
        const W=w.offsetWidth,H=w.offsetHeight,dpr=Math.min(devicePixelRatio||2,3);
        if(c.width!==W*dpr){c.width=W*dpr;c.height=H*dpr;c.style.width=W+"px";c.style.height=H+"px"}
        const ctx=c.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
        renderScene(ctx,W,H,getAtoms(tRef.current),cfg.current);
      }
      const now=performance.now();if(now-lastUI>50){setDt(tRef.current);lastUI=now}
      rafRef.current=requestAnimationFrame(tick);
    };
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[playing]);

  // ── Export PNG ──
  const exportPNG=useCallback(()=>{
    const c=document.createElement("canvas");c.width=2048;c.height=2048;
    const ctx=c.getContext("2d");
    renderScene(ctx,2048,2048,getAtoms(tRef.current),{...cfg.current,angle:angleRef.current});
    c.toBlob(blob=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`atlas-view-${Date.now()}.png`;a.click()},"image/png");
  },[]);

  // ── Export video (capture frames then encode) ──
  const startRecord=useCallback(()=>{setRecording(true);setRecFrames([]);
    const frames=[]; const steps=120; // ~4 sec at 30fps
    const c2=document.createElement("canvas");c2.width=1024;c2.height=1024;const ctx2=c2.getContext("2d");
    for(let i=0;i<steps;i++){
      const t=i/steps,a={...angleRef.current,ry:angleRef.current.ry+t*Math.PI*.5};
      renderScene(ctx2,1024,1024,getAtoms(t),{...cfg.current,angle:a});
      frames.push(c2.toDataURL("image/webp",.85));
    }
    // Encode as WebM via MediaRecorder on a temp canvas
    const oc=document.createElement("canvas");oc.width=1024;oc.height=1024;
    const stream=oc.captureStream(30);
    const mr=new MediaRecorder(stream,{mimeType:"video/webm;codecs=vp9",videoBitsPerSecond:4e6});
    const chunks=[];mr.ondataavailable=e=>chunks.push(e.data);
    mr.onstop=()=>{
      const blob=new Blob(chunks,{type:"video/webm"});
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`atlas-view-${Date.now()}.webm`;a.click();
      setRecording(false);
    };
    mr.start();
    const octx=oc.getContext("2d");
    let fi=0;
    const drawFrame=()=>{
      if(fi>=frames.length){mr.stop();return}
      const img=new Image();img.onload=()=>{octx.drawImage(img,0,0);fi++;setTimeout(drawFrame,33)};img.src=frames[fi];
    };
    drawFrame();
  },[]);

  const th=getThermo(dt);
  const isLight=bg==="#f5f0e8"||bg==="#ffffff";
  const tc=isLight?"#333":"#7888a5";
  const tc2=isLight?"#666":"#4a5a70";
  const border=isLight?"#ddd":"#0e1320";

  return(
    <div style={{position:"fixed",inset:0,background:bg,display:"flex",flexDirection:"column",
      fontFamily:"-apple-system,'Helvetica Neue',sans-serif",color:tc,userSelect:"none",overflow:"hidden"}}>

      {/* ── Toolbar: icons only, no heavy text ── */}
      <div style={{height:36,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px",
        borderBottom:`1px solid ${border}`,background:isLight?"rgba(255,255,255,.8)":"rgba(6,8,16,.8)",
        backdropFilter:"blur(8px)",flexShrink:0,zIndex:20,gap:4}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:12,fontWeight:700,color:isLight?"#222":"#d0daea",letterSpacing:-.3,marginRight:4}}>
            A<span style={{color:"#00c8f0"}}>V</span>
          </span>
          {/* View presets */}
          {Object.entries(VIEWS).map(([k,v])=>(
            <Ib key={k} title={v.label} onClick={()=>{angleRef.current={rx:v.rx,ry:v.ry}}}
              active={false}>{v.label}</Ib>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:3}}>
          <Ib onClick={()=>setPanel(p=>p==="style"?null:"style")} active={panel==="style"} title="Style">◐</Ib>
          <Ib onClick={()=>setPanel(p=>p==="export"?null:"export")} active={panel==="export"} title="Export">↓</Ib>
          <div style={{width:1,height:16,background:border,margin:"0 2px"}}/>
          <span style={{fontSize:9,color:tc2,fontVariantNumeric:"tabular-nums"}}>{th.T.toFixed(0)}K</span>
        </div>
      </div>

      <div style={{flex:1,display:"flex",position:"relative",minHeight:0}}>
        {/* Viewport */}
        <div ref={wrap} style={{flex:1,position:"relative",cursor:"grab",touchAction:"none"}}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          <canvas ref={cvs} style={{position:"absolute",inset:0}}/>
        </div>

        {/* ── Side panel (compact) ── */}
        {panel&&(
          <div style={{width:180,background:isLight?"#faf8f4":"#080c14",borderLeft:`1px solid ${border}`,
            padding:10,overflow:"auto",flexShrink:0,fontSize:10}}>
            
            {panel==="style"&&<>
              <Sec t="Color">
                <Row>
                  {["type","ke"].map(m=><Ib key={m} active={colorBy===m} onClick={()=>setColorBy(m)}>{m==="type"?"Type":"KE"}</Ib>)}
                </Row>
              </Sec>
              <Sec t="Palette">
                <Row>{Object.keys(PALETTES).map(p=>(
                  <Ib key={p} active={palName===p} onClick={()=>setPalName(p)}>{p}</Ib>
                ))}</Row>
              </Sec>
              <Sec t="Background">
                <Row>{BKGS.map(b=>(
                  <div key={b} onClick={()=>setBg(b)} style={{width:20,height:20,borderRadius:4,cursor:"pointer",
                    background:b,border:`2px solid ${bg===b?"#00c8f0":"transparent"}`,
                    boxShadow:b==="#ffffff"?"inset 0 0 0 1px #ddd":"none"}}/>
                ))}</Row>
              </Sec>
              <Sec t="Light Direction">
                <Slider label="X" value={lightDir[0]} min={-1} max={1} onChange={v=>setLightDir([v,lightDir[1],lightDir[2]])}/>
                <Slider label="Y" value={lightDir[1]} min={-1} max={1} onChange={v=>setLightDir([lightDir[0],v,lightDir[2]])}/>
                <Slider label="Z" value={lightDir[2]} min={-1} max={1} onChange={v=>setLightDir([lightDir[0],lightDir[1],v])}/>
              </Sec>
              <Sec t="Intensity">
                <Slider label="Direct" value={lightInt} min={0} max={1.5} onChange={setLightInt}/>
                <Slider label="Ambient" value={ambient} min={0} max={1} onChange={setAmbient}/>
              </Sec>
            </>}

            {panel==="export"&&<>
              <Sec t="Image">
                <button onClick={exportPNG} style={expBtn}>Export PNG 2048×2048</button>
              </Sec>
              <Sec t="Video">
                <button onClick={startRecord} disabled={recording} style={{...expBtn,opacity:recording?.5:1}}>
                  {recording?"Recording...":"Record 4s WebM"}
                </button>
                <div style={{fontSize:8,color:tc2,marginTop:4}}>1024×1024 · 30fps · VP9</div>
              </Sec>
              <Sec t="Current View">
                <div style={{fontSize:8,color:tc2,lineHeight:1.6,fontFamily:"monospace"}}>
                  rx: {angleRef.current.rx.toFixed(2)}<br/>
                  ry: {angleRef.current.ry.toFixed(2)}<br/>
                  t: {dt.toFixed(3)}<br/>
                  T: {th.T.toFixed(0)} K
                </div>
              </Sec>
            </>}
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      <div style={{height:44,flexShrink:0,display:"flex",alignItems:"center",padding:"0 10px",gap:8,
        borderTop:`1px solid ${border}`,background:isLight?"rgba(255,255,255,.6)":"rgba(4,6,10,.8)",
        paddingBottom:"max(env(safe-area-inset-bottom,4px),4px)"}}>
        <button onClick={()=>setPlaying(p=>!p)} style={{
          width:28,height:28,borderRadius:14,border:"none",cursor:"pointer",flexShrink:0,
          background:playing?"rgba(255,100,80,.1)":"rgba(0,200,240,.1)",
          color:playing?"rgb(255,100,80)":"#00c8f0",fontSize:12,
          display:"flex",alignItems:"center",justifyContent:"center",
        }}>{playing?"■":"▶"}</button>
        <div style={{flex:1,height:28,position:"relative",cursor:"pointer"}}
          onClick={e=>{const r=e.currentTarget.getBoundingClientRect();tRef.current=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));setDt(tRef.current)}}>
          <div style={{position:"absolute",top:12,left:0,right:0,height:3,borderRadius:2,background:isLight?"#e0dcd4":"#0c1020"}}/>
          <div style={{position:"absolute",top:12,left:0,height:3,borderRadius:2,width:`${dt*100}%`,
            background:"linear-gradient(90deg,rgba(77,184,255,.5),rgba(255,130,90,.5))"}}/>
          <div style={{position:"absolute",top:8,width:11,height:11,borderRadius:6,
            left:`calc(${dt*100}% - 5px)`,background:"#00c8f0",border:`2px solid ${bg}`,
            boxShadow:"0 0 6px rgba(0,200,240,.3)"}}/>
        </div>
        <span style={{fontSize:9,color:tc2,fontVariantNumeric:"tabular-nums",minWidth:38,textAlign:"right"}}>
          {th.T.toFixed(0)} K
        </span>
      </div>
    </div>
  );
}

// ── Tiny UI helpers ──
const Sec=({t,children})=>(
  <div style={{marginBottom:10}}>
    <div style={{fontSize:8,fontWeight:600,letterSpacing:1,textTransform:"uppercase",color:"#4a5a70",marginBottom:5}}>{t}</div>
    {children}
  </div>
);
const Row=({children})=><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{children}</div>;
const Slider=({label,value,min,max,onChange})=>(
  <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
    <span style={{fontSize:8,color:"#4a5a70",width:28}}>{label}</span>
    <input type="range" min={min*100} max={max*100} value={value*100}
      onChange={e=>onChange(+e.target.value/100)}
      style={{flex:1,height:16,WebkitAppearance:"none",background:"transparent",cursor:"pointer"}}/>
    <span style={{fontSize:8,color:"#5a6a82",width:24,textAlign:"right"}}>{value.toFixed(1)}</span>
  </div>
);
const expBtn={width:"100%",padding:"7px 0",borderRadius:4,border:"1px solid rgba(0,200,240,.3)",
  background:"rgba(0,200,240,.08)",color:"#00c8f0",fontSize:10,cursor:"pointer",fontWeight:500};
