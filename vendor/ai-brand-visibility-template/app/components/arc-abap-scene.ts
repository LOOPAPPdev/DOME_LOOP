/** Native WebGL2 point-cloud scene. Real 3D geometry; no external assets or network requests. */
export type CameraMode="chase"|"free"|"eye";
export type SceneQuality="high"|"medium"|"low";
export const LOOP_SECONDS=36;
export const QUALITY_BUDGETS={high:1_500_000,medium:750_000,low:250_000} as const;
export const PHASE_STARTS=[0,4,10,18,25,31,36] as const;
export type SceneOptions={mode:CameraMode;dark:boolean;quality:SceneQuality;freeYaw:number};
export type SceneEngine={renderer:"webgl2"|"canvas2d";render:(time:number,options:SceneOptions)=>void;resize:()=>void;destroy:()=>void};
type Vec=[number,number,number];
const PI=Math.PI,TWO_PI=2*PI,L=84.39,R=36.8,SPEED=4.5;
const clamp=(v:number,min=0,max=1)=>Math.min(max,Math.max(min,v));
const smooth=(v:number)=>{const x=clamp(v);return x*x*(3-2*x);};
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const add=(a:Vec,b:Vec):Vec=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const sub=(a:Vec,b:Vec):Vec=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const mul=(a:Vec,n:number):Vec=>[a[0]*n,a[1]*n,a[2]*n];
const blend=(a:Vec,b:Vec,t:number):Vec=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
const dot=(a:Vec,b:Vec)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:Vec,b:Vec):Vec=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=(a:Vec)=>Math.hypot(a[0],a[1],a[2]);
const norm=(a:Vec)=>mul(a,1/Math.max(length(a),1e-8));
const random=(n:number,k=1)=>{const t=Math.sin(n*127.1+k*311.7)*43758.5453;return t-Math.floor(t);};

/** 400m reference oval (2×84.39m straights and 2 semicircles of radius 36.8m). */
export function ovalAt(meters:number,lane:number):{point:Vec;tangent:Vec}{
  const r=R+(lane-1)*1.22,arc=PI*r,perimeter=2*L+2*arc;
  const s=((meters%perimeter)+perimeter)%perimeter;
  if(s<L)return{point:[-L/2+s,0,-r],tangent:[1,0,0]};
  if(s<L+arc){const a=(s-L)/r;return{point:[L/2+r*Math.sin(a),0,-r*Math.cos(a)],tangent:[Math.cos(a),0,Math.sin(a)]};}
  if(s<2*L+arc)return{point:[L/2-(s-L-arc),0,r],tangent:[-1,0,0]};
  const a=(s-2*L-arc)/r;
  return{point:[-L/2-r*Math.sin(a),0,r*Math.cos(a)],tangent:[-Math.cos(a),0,-Math.sin(a)]};
}
function wireTrack(quality:SceneQuality){
  const count=quality==="high"?2600:quality==="medium"?1500:730;
  const ambient=quality==="high"?34000:quality==="medium"?17000:7500;
  const pts:number[]=[];
  for(let lane=1;lane<=7;lane++){
    const d=2*L+2*PI*(R+(lane-1)*1.22);
    for(let i=0;i<count;i++){const p=ovalAt(i*d/count,lane).point;pts.push(p[0],-.03,p[2]);}
  }
  for(let s=0;s<400;s+=10)for(let lane=1;lane<=7;lane+=.14){
    const p=ovalAt(s,lane).point;pts.push(p[0],-.02,p[2]);
  }
  for(let i=0;i<ambient;i++){
    const at=ovalAt(random(i,1)*400,3.5),side=(random(i,2)-.5)*30;
    pts.push(at.point[0]-at.tangent[2]*side,-.055,at.point[2]+at.tangent[0]*side);
  }
  return new Float32Array(pts);
}
type Sample={part:number;u:number;a:number;r:number;seed:number};
const PARTS:[number,number,number][]=[
  [0,200,.14],[1,440,.17],[2,120,.075],[3,110,.07],[4,120,.075],[5,110,.07],
  [6,190,.12],[7,180,.09],[8,190,.12],[9,180,.09],[10,95,.065],[11,95,.065],
  [12,185,.02],[13,185,.02],[14,220,.02]
];
const SAMPLES:Sample[]=PARTS.flatMap(([part,count,r])=>Array.from({length:count},(_,i)=>({
  part,u:random(i+part*47,4),a:random(i+part*59,5)*TWO_PI,r:r*(.7+.3*random(i,part+8)),seed:i+part*1000
})));
const N=SAMPLES.length;
type Pose={segments:Record<number,[Vec,Vec]>;head:Vec};
function knee(hip:Vec,foot:Vec):Vec{
  const d=sub(foot,hip),distance=clamp(length(d),.1,1.12),u=norm(d);
  const h=Math.sqrt(Math.max(0,.57*.57-distance*distance/4));
  const perp=norm([0,-u[2],u[1]]);
  return add(add(hip,mul(u,distance/2)),mul(perp,h));
}
function footAt(phase:number,x:number):Vec{
  const q=((phase%1)+1)%1,stance=q<.6,u=stance?q/.6:(q-.6)/.4;
  return[x,stance?.1:.1+.29*Math.sin(PI*u),stance?.62-1.24*u:lerp(-.62,.62,smooth(u))];
}
function pose(t:number,cycling:boolean):Pose{
  const cycle=t*SPEED/1.24,hipY=cycling?1.0:.99;
  const neck:Vec=[0,cycling?1.42:1.52,cycling?.35:.08];
  const segments:Record<number,[Vec,Vec]>={1:[[0,hipY,0],neck]};
  for(let n=0;n<2;n++){
    const side=n===0?-1:1,phase=cycle+n*.5,shift=Math.sin(phase*TWO_PI);
    const shoulder:Vec=[side*.255,1.43,cycling?.27:.08];
    const elbow:Vec=[side*.31,1.12,cycling?.51:-.13-.24*shift];
    const hand:Vec=[side*.31,cycling?1.03:.88,cycling?.77:.08-.4*shift];
    segments[2+n*2]=[shoulder,elbow];segments[3+n*2]=[elbow,hand];
    const hip:Vec=[side*.14,hipY,0];
    const foot:Vec=cycling?
      [side*.15,.54+.15*Math.sin(TWO_PI*phase),-.12+.15*Math.cos(TWO_PI*phase)]:
      footAt(phase,side*.145);
    const joint=knee(hip,foot);
    segments[6+n*2]=[hip,joint];segments[7+n*2]=[joint,foot];
    segments[10+n]=[foot,[foot[0],foot[1]-.02,foot[2]+.2]];
  }
  return{segments,head:[0,cycling?1.65:1.74,cycling?.46:.14]};
}
function along(a:Vec,b:Vec,s:Sample):Vec{
  const axis=norm(sub(b,a)),ref:Vec=Math.abs(axis[1])<.9?[0,1,0]:[1,0,0];
  const u=norm(cross(axis,ref)),v=norm(cross(axis,u));
  return add(add(blend(a,b,s.u),mul(u,Math.cos(s.a)*s.r)),mul(v,Math.sin(s.a)*s.r));
}
function localDot(sample:Sample,skeleton:Pose,cycling:boolean):Vec{
  const s=sample;
  if(s.part===0){
    const polar=Math.acos(clamp(2*s.u-1,-1,1));
    return add(skeleton.head,[.14*Math.sin(polar)*Math.cos(s.a),.16*Math.cos(polar),.14*Math.sin(polar)*Math.sin(s.a)]);
  }
  if(s.part===12||s.part===13){
    if(!cycling)return along(...skeleton.segments[1],s);
    const z=s.part===12?-.67:.7;
    return[.04*Math.sin(s.a),.39+.35*Math.sin(s.a),z+.35*Math.cos(s.a)];
  }
  if(s.part===14){
    if(!cycling)return along(...skeleton.segments[1],s);
    const frames:[Vec,Vec][]=[
      [[0,.39,-.67],[0,1.02,-.13]],[[0,1.02,-.13],[0,.39,.7]],
      [[0,.39,.7],[0,.39,-.67]],[[0,.39,.7],[0,1.03,.72]],[[0,1.03,.72],[0,1.04,.5]]
    ];
    const index=Math.min(frames.length-1,Math.floor(s.u*frames.length));
    return along(frames[index][0],frames[index][1],{...s,u:(s.u*frames.length)%1});
  }
  return along(...skeleton.segments[s.part],s);
}
function fillAgent(out:Float32Array,agent:number,t:number){
  const track=ovalAt(SPEED*t+.9*agent,agent+3),side:Vec=[-track.tangent[2],0,track.tangent[0]];
  const runPose=pose(t+.2*agent,false),cyclePose=pose(t+.2*agent,true);
  const assembly=smooth(t/4),dissolve=smooth((t-34.4)/1.6),morph=agent===0?smooth((t-31)/3):0;
  for(let i=0;i<N;i++){
    const sample=SAMPLES[i],one=localDot(sample,runPose,false);
    const local=morph?blend(one,localDot(sample,cyclePose,true),morph):one;
    const world=add(track.point,add(mul(side,local[0]),add([0,local[1],0],mul(track.tangent,local[2]))));
    const scatter:Vec=[-L/2+4+(random(sample.seed,4)-.5)*22,random(sample.seed,6)*5,
      -R-4+(random(sample.seed,8)-.5)*19];
    const p=blend(blend(scatter,world,assembly),add(scatter,[0,random(sample.seed,9)*2,0]),dissolve);
    const base=(agent*N+i)*3;
    out[base]=p[0];out[base+1]=p[1];out[base+2]=p[2];
  }
}
function perspective(deg:number,aspect:number):Float32Array{
  const f=1/Math.tan(deg*PI/360),near=.1,far=650;
  return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(near+far)/(near-far),-1,
    0,0,2*near*far/(near-far),0]);
}
function lookAt(eye:Vec,target:Vec):Float32Array{
  const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,
    -dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function matmul(a:Float32Array,b:Float32Array){
  const out=new Float32Array(16);
  for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)
    out[col*4+row]+=a[k*4+row]*b[col*4+k];
  return out;
}
function chaseCamera(t:number):{eye:Vec;target:Vec;fov:number}{
  const lead=ovalAt(SPEED*t,3),side:Vec=[-lead.tangent[2],0,lead.tangent[0]];
  const target=add(lead.point,add(mul(lead.tangent,4),[0,1.3,0]));
  const keys=[
    [0,-6,0,35,36],[4,-11,3,22,38],[10,-12,4,7,40],[18,-9,4,6,40],
    [25,-1,15,3.4,39],[31,-2,17,3.4,40],[36,-6,0,35,36]
  ];
  let k=0;while(k<keys.length-2&&t>=keys[k+1][0])k++;
  const a=keys[k],b=keys[k+1],p=smooth((t-a[0])/(b[0]-a[0]));
  let back=lerp(a[1],b[1],p),offset=lerp(a[2],b[2],p),height=lerp(a[3],b[3],p);
  const fov=lerp(a[4],b[4],p);
  if(t>=18&&t<25){
    const angle=(t-18)/7*140*PI/180;
    back=-5*Math.cos(angle)-1;offset=5*Math.sin(angle)+2;height=1.6+.4*Math.sin(angle);
  }
  const eye=add(target,add(mul(lead.tangent,back),add(mul(side,offset),[0,height,0])));
  // Phase 35–36 is visually dissolved; restore absolute starting camera for a periodic seam.
  if(t>=34){
    const q=smooth((t-34)/2),first=chaseCamera(0);
    return{eye:blend(eye,first.eye,q),target:blend(target,first.target,q),fov:lerp(fov,first.fov,q)};
  }
  return{eye,target,fov};
}
function cameraFor(t:number,options:SceneOptions){
  const base=chaseCamera(t),lead=ovalAt(SPEED*t,3),side:Vec=[-lead.tangent[2],0,lead.tangent[0]];
  if(options.mode==="eye")return{
    eye:add(lead.point,add([0,1.65,0],mul(lead.tangent,.3))),
    target:add(lead.point,add([0,1.65,0],mul(lead.tangent,16))),fov:42
  };
  if(options.mode==="free"){
    const r=15,yaw=options.freeYaw;
    return{eye:add(base.target,add(mul(lead.tangent,Math.cos(yaw)*r),add(mul(side,Math.sin(yaw)*r),[0,5,0]))),
      target:base.target,fov:40};
  }
  return base;
}
const VERTEX=[
  "#version 300 es","precision highp float;","in vec3 aPosition;","uniform mat4 uVP;",
  "uniform vec3 uEye;","uniform float uDot;","out float vNear;",
  "void main(){ vec4 p=vec4(aPosition,1.); gl_Position=uVP*p;",
  "float d=distance(uEye,aPosition);vNear=smoothstep(.6,2.5,d);",
  "gl_PointSize=clamp(uDot/max(d,1.0),1.0,5.5);}"
].join("\n");
const FRAGMENT=[
  "#version 300 es","precision highp float;","in float vNear;","uniform vec4 uColor;","out vec4 color;",
  "void main(){ vec2 p=gl_PointCoord*2.0-1.0;float r=dot(p,p);if(r>1.0) discard;",
  "color=vec4(uColor.rgb,uColor.a*vNear*(1.0-smoothstep(.5,1.0,r)));}"
].join("\n");
function shader(gl:WebGL2RenderingContext,type:number,text:string){
  const s=gl.createShader(type);if(!s)throw Error("WebGL shader unavailable");
  gl.shaderSource(s,text);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(e||"Shader compile failed");}
  return s;
}
function fallback(canvas:HTMLCanvasElement):SceneEngine{
  const context=canvas.getContext("2d");
  const resize=()=>{
    const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));
  };
  resize();
  return{renderer:"canvas2d",resize,render(t,opt){
    if(!context)return;
    const w=canvas.width,h=canvas.height;
    context.fillStyle=opt.dark?"#101217":"#edf1f7";context.fillRect(0,0,w,h);
    context.strokeStyle=opt.dark?"#58647e":"#b3becf";
    for(let i=0;i<7;i++){context.beginPath();context.ellipse(w/2,h*.68+i*7,w*.36+i*3,h*.12+i*1.5,0,0,TWO_PI);context.stroke();}
    const fade=smooth(t/4)*(1-smooth((t-34.4)/1.6));
    context.fillStyle=opt.dark?"#98acff":"#046cfe";
    for(let a=0;a<3;a++)for(let i=0;i<250;i++){
      if(random(i+a*100,9)>fade)continue;
      const theta=random(i,2)*TWO_PI,rad=random(i,3);
      context.fillRect(w*.36+a*w*.14+Math.cos(theta)*rad*9,h*.53+Math.sin(theta)*rad*35,2.1,2.1);
    }
  },destroy(){}};
}
export function createArcScene(canvas:HTMLCanvasElement):SceneEngine{
  let gl:WebGL2RenderingContext|null=null;
  try{gl=canvas.getContext("webgl2",{alpha:false,antialias:false,depth:true,powerPreference:"high-performance"});}
  catch{return fallback(canvas);}
  if(!gl)return fallback(canvas);
  const context=gl;
  let program=context.createProgram(),buffer=context.createBuffer();
  if(!program||!buffer)return fallback(canvas);
  try{
    const vert=shader(context,context.VERTEX_SHADER,VERTEX),frag=shader(context,context.FRAGMENT_SHADER,FRAGMENT);
    context.attachShader(program,vert);context.attachShader(program,frag);context.linkProgram(program);
    context.deleteShader(vert);context.deleteShader(frag);
    if(!context.getProgramParameter(program,context.LINK_STATUS))throw Error(context.getProgramInfoLog(program)||"WebGL program link failed");
  }catch{
    context.deleteProgram(program);context.deleteBuffer(buffer);
    return fallback(canvas);
  }
  const p=program,b=buffer;
  const attr=context.getAttribLocation(p,"aPosition"),uVP=context.getUniformLocation(p,"uVP");
  const uEye=context.getUniformLocation(p,"uEye"),uDot=context.getUniformLocation(p,"uDot");
  const uColor=context.getUniformLocation(p,"uColor");
  const positions=new Float32Array(N*3*3);
  let track=wireTrack("low"),currentQuality:SceneQuality="low";
  let cameraEye:Vec|null=null,cameraTarget:Vec|null=null,previousTime:number|null=null,disposed=false;
  context.enable(context.BLEND);context.blendFunc(context.SRC_ALPHA,context.ONE_MINUS_SRC_ALPHA);
  context.enable(context.DEPTH_TEST);context.depthFunc(context.LEQUAL);
  const resize=()=>{
    const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
    if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}
    context.viewport(0,0,canvas.width,canvas.height);
  };
  resize();
  function draw(points:Float32Array,matrix:Float32Array,eye:Vec,color:[number,number,number,number],size:number){
    context.uniformMatrix4fv(uVP,false,matrix);context.uniform3fv(uEye,eye);
    context.uniform1f(uDot,size);context.uniform4fv(uColor,new Float32Array(color));
    context.bindBuffer(context.ARRAY_BUFFER,b);context.bufferData(context.ARRAY_BUFFER,points,context.DYNAMIC_DRAW);
    context.enableVertexAttribArray(attr);context.vertexAttribPointer(attr,3,context.FLOAT,false,0,0);
    context.drawArrays(context.POINTS,0,points.length/3);
  }
  return{
    renderer:"webgl2",resize,
    render(rawTime,options){
      if(disposed)return;
      const t=((rawTime%36)+36)%36;
      if(options.quality!==currentQuality){track=wireTrack(options.quality);currentQuality=options.quality;}
      const cam=cameraFor(t,options);
      const dt=previousTime===null||t<previousTime?1/60:Math.min(.08,t-previousTime);
      previousTime=t;
      const alpha=1-Math.exp(-dt/.4);
      cameraEye=cameraEye?blend(cameraEye,cam.eye,alpha):cam.eye;
      cameraTarget=cameraTarget?blend(cameraTarget,cam.target,alpha):cam.target;
      if(t<.06){cameraEye=cam.eye;cameraTarget=cam.target;}
      const matrix=matmul(perspective(cam.fov,canvas.width/canvas.height),lookAt(cameraEye,cameraTarget));
      context.clearColor(options.dark ? .045 : .946,options.dark ? .055 : .955,options.dark ? .08 : .975,1);
      context.clear(context.COLOR_BUFFER_BIT|context.DEPTH_BUFFER_BIT);
      context.useProgram(p);
      const trackFade=smooth(t/3.8)*(1-smooth((t-34.2)/1.8));
      draw(track,matrix,cameraEye,options.dark?[.48,.56,.68,.48*trackFade]:[.43,.51,.65,.36*trackFade],34);
      for(let a=0;a<3;a++)fillAgent(positions,a,t);
      const fade=1-smooth((t-34.4)/1.6);
      for(let a=0;a<3;a++)draw(positions.subarray(a*N*3,(a+1)*N*3),matrix,cameraEye,
        options.dark?[.56,.7,1,(.9-a*.07)*fade]:[.03,.37+a*.07,.95,(.94-a*.07)*fade],90);
    },
    destroy(){disposed=true;context.deleteProgram(p);context.deleteBuffer(b);track=new Float32Array(0);}
  };
}
