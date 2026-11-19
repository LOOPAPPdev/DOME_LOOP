import {useEffect,useRef,useState} from "react";
import type {ChangeEvent,FormEvent,PointerEvent as ReactPointerEvent} from "react";
import copy from "./arc-abap.copy.json";
import {createArcScene,LOOP_SECONDS,PHASE_STARTS,QUALITY_BUDGETS} from "./arc-abap-scene";
import type {CameraMode,SceneEngine,SceneOptions,SceneQuality} from "./arc-abap-scene";
import "./arc-abap.css";

type PhaseId=typeof copy.loop.phases[number]["id"];
const stageIds:{[key:string]:string}={Agents:"agents",Method:"method",Work:"work",About:"about",Contact:"contact"};
const MAX_FREE_IDLE=8000;
const EMAIL_PATTERN=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phaseIndex=(sec:number)=>{
  for(let i=copy.loop.phases.length-1;i>=0;i--)if(sec>=copy.loop.phases[i].start)return i;
  return 0;
};

function StaticPoster(){
  return <svg className="arc-still-poster" viewBox="0 0 1200 730" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Three agents made from dots on a 400 metre wire running track">
    <defs><linearGradient id="arcPosterFade" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#edf1f9"/><stop offset="1" stopColor="#dfe5f1"/></linearGradient></defs>
    <rect width="1200" height="730" fill="url(#arcPosterFade)"/>
    <g transform="translate(600 420) rotate(-14) scale(1 .48)" fill="none" stroke="#96a3bb" strokeWidth="1.4" opacity=".68">
      {Array.from({length:7},(_,i)=><ellipse key={i} cx="0" cy={i*23} rx={330+i*8} ry={160+i*8} strokeDasharray="5 8"/>)}
    </g>
    {Array.from({length:3},(_,i)=><g key={i} transform={"translate("+(470+i*115)+" "+(340-i*22)+")"} fill="#046cfe">
      {Array.from({length:64},(_,j)=>{
        const a=j*2.39996,r=Math.sqrt((j+1)/64),y=(Math.sin(a)*r*87);
        return <circle key={j} cx={Math.cos(a)*r*19} cy={y} r={j%4===0?2.1:1.25} opacity={.25+.7*j/64}/>;
      })}
    </g>)}
    <g fill="#1e2e48" fontFamily="monospace" fontSize="10" letterSpacing="4" opacity=".6">
      <text x="48" y="64">THE LOOP / THREE AGENTS / 400 M</text><text x="48" y="88">STATIC REFERENCE · T=12 S</text>
    </g>
  </svg>;
}
function HeaderNav(){
  return <nav className="arc-nav" aria-label="ABAP sections">
    {copy.navigation.map(name=><a key={name} href={"#"+stageIds[name]}>{name}</a>)}
  </nav>;
}
function SceneHero({onBook}:{onBook:()=>void}){
  const [role,setRole]=useState(copy.hero.heading_options[0]);
  const [playing,setPlaying]=useState(true);
  const [reduced,setReduced]=useState(false);
  const [visible,setVisible]=useState(true);
  const [phase,setPhase]=useState(0);
  const [mode,setMode]=useState<CameraMode>("chase");
  const [dark,setDark]=useState(false);
  const [dockOpen,setDockOpen]=useState(false);
  const [renderer,setRenderer]=useState<"loading"|"webgl2"|"canvas2d">("loading");
  const [quality,setQuality]=useState<SceneQuality>("high");
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const sectionRef=useRef<HTMLElement>(null);
  const scene=useRef<SceneEngine|null>(null);
  const clock=useRef(0);
  const last=useRef<number|null>(null);
  const latestDraw=useRef(0);
  const phaseRef=useRef(0);
  const playingRef=useRef(true);
  const visibleRef=useRef(true);
  const optionsRef=useRef<SceneOptions>({mode:"chase",dark:false,quality:"high",freeYaw:0});
  const startLoop=useRef<()=>void>(()=>{});
  const stopLoop=useRef<()=>void>(()=>{});
  const timeout=useRef<number|undefined>(undefined);
  const pointer=useRef<{x:number}|null>(null);
  const lowFrames=useRef(0);

  useEffect(()=>{
    const prefers=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(prefers);
    if(prefers){setPlaying(false);playingRef.current=false;clock.current=12;}
    const initialQuality:SceneQuality=window.innerWidth<=700?"low":"high";
    setQuality(initialQuality);optionsRef.current.quality=initialQuality;
    let disposed=false,frameId=0,bootId=0;
    const canvas=canvasRef.current,section=sectionRef.current;
    if(!canvas||!section)return;
    const paint=(time:number)=>{
      scene.current?.render(time,optionsRef.current);
      const index=phaseIndex(time);
      if(index!==phaseRef.current){phaseRef.current=index;setPhase(index);}
    };
    const stop=()=>{if(frameId)window.cancelAnimationFrame(frameId);frameId=0;last.current=null;};
    const tick=(stamp:number)=>{
      frameId=0;
      if(disposed||!playingRef.current||!visibleRef.current||document.hidden)return;
      const diff=last.current===null?0:Math.min(90,stamp-last.current);
      last.current=stamp;
      // Avoid excessive work on battery-constrained phones.
      if(stamp-latestDraw.current>=28){
        latestDraw.current=stamp;
        clock.current=(clock.current+diff/1000)%LOOP_SECONDS;
        paint(clock.current);
        if(diff>49){lowFrames.current++;} else lowFrames.current=Math.max(0,lowFrames.current-1);
        if(lowFrames.current>80){
          lowFrames.current=0;
          setQuality(q=>q==="high"?"medium":"low");
        }
      }
      frameId=window.requestAnimationFrame(tick);
    };
    const start=()=>{
      if(frameId||disposed||!scene.current||!playingRef.current||!visibleRef.current||document.hidden)return;
      last.current=null;frameId=window.requestAnimationFrame(tick);
    };
    startLoop.current=start;stopLoop.current=stop;
    const observer=new IntersectionObserver(entries=>{
      const yes=entries[0]?.isIntersecting??false;
      visibleRef.current=yes;setVisible(yes);
      if(yes)start();else stop();
    },{threshold:.08});
    observer.observe(section);
    const visibility=()=>{if(document.hidden)stop();else start();};
    document.addEventListener("visibilitychange",visibility);
    const resize=()=>{scene.current?.resize();if(!playingRef.current)paint(clock.current);};
    const watcher=new ResizeObserver(resize);watcher.observe(canvas);
    // First paint shows a static t=12s poster; then WebGL starts on the next frame.
    bootId=window.requestAnimationFrame(()=>{
      if(disposed)return;
      try{
        const engine=createArcScene(canvas);
        scene.current=engine;setRenderer(engine.renderer);
        paint(12); // Actual rendered t=12 still, including for reduced motion.
        if(!prefers){clock.current=0;start();}
      }catch(error){
        console.error("Arc scene initialization failed",error);
        setRenderer("canvas2d");setPlaying(false);
      }
    });
    return()=>{
      disposed=true;observer.disconnect();watcher.disconnect();
      document.removeEventListener("visibilitychange",visibility);
      window.cancelAnimationFrame(bootId);stop();scene.current?.destroy();scene.current=null;
    };
  },[]);
  useEffect(()=>{
    playingRef.current=playing;
    if(playing)startLoop.current();else stopLoop.current();
  },[playing]);
  useEffect(()=>{
    optionsRef.current={...optionsRef.current,mode,dark,quality};
    if(!playing)scene.current?.render(clock.current,optionsRef.current);
  },[mode,dark,quality,playing]);
  useEffect(()=>()=>{window.clearTimeout(timeout.current);},[]);
  function idleReset(){
    window.clearTimeout(timeout.current);
    timeout.current=window.setTimeout(()=>setMode("chase"),MAX_FREE_IDLE);
  }
  function changeCamera(next:CameraMode){
    setMode(next);
    if(next!=="chase")idleReset();
    else window.clearTimeout(timeout.current);
  }
  function jump(index:number){
    clock.current=copy.loop.phases[index].start;
    phaseRef.current=index;setPhase(index);
    scene.current?.render(clock.current,optionsRef.current);
  }
  function pointerDown(event:ReactPointerEvent<HTMLCanvasElement>){
    if(mode!=="free")return;
    pointer.current={x:event.clientX};
    event.currentTarget.setPointerCapture(event.pointerId);
    idleReset();
  }
  function pointerMove(event:ReactPointerEvent<HTMLCanvasElement>){
    if(mode!=="free"||!pointer.current)return;
    const dx=event.clientX-pointer.current.x;
    pointer.current.x=event.clientX;
    optionsRef.current.freeYaw+=dx*.008;
    if(!playing)scene.current?.render(clock.current,optionsRef.current);
    idleReset();
  }
  const active=copy.loop.phases[phase];
  return <section id="arc" ref={sectionRef} className={"arc-hero"+(dark?" arc-dark":"")}
    data-phase={active.id} data-playing={playing} data-visible={visible} data-renderer={renderer}
    data-quality={quality} data-camera={mode} data-reduced-motion={reduced}>
    <StaticPoster/>
    <canvas id="cv" ref={canvasRef} className={"arc-canvas"+(renderer!=="loading"?" arc-canvas-ready":"")}
      aria-label="Animated WebGL view of three point-cloud agents on lanes 3, 4 and 5"
      onPointerDown={pointerDown} onPointerMove={pointerMove}
      onPointerUp={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}}/>
    <div className="arc-hero-top">
      <a className="arc-wordmark" href="#arc">ABAP <small>· AI agents for business</small></a>
      <HeaderNav/>
      <button type="button" className="arc-header-cta" onClick={onBook}>{copy.primary_cta}</button>
    </div>
    <div className="arc-scene-hud" aria-label="Animation sequence">
      <span>400 M / 3 LANES / 36 S</span>
      <ol>{copy.loop.phases.map((item,i)=><li key={item.id}>
        <button type="button" aria-current={phase===i?"step":undefined} onClick={()=>jump(i)}
          aria-label={"Preview phase "+item.number+" "+item.title}>
          <span>{item.number}</span><strong>{item.title}</strong>
        </button>
      </li>)}</ol>
    </div>
    <div className="arc-hero-poster">
      <div className="arc-hero-eyebrow">{copy.eyebrow}</div>
      <p className="arc-loop-caption" aria-live="off">{active.number} / 06 — {active.title} · {active.caption}</p>
      <h1>{copy.hero.heading_prefix} <label className="arc-role-select" htmlFor="arc-role">
        <select id="arc-role" value={role} onChange={(e:ChangeEvent<HTMLSelectElement>)=>setRole(e.target.value)}
          aria-label="Choose an agent role">
          {copy.hero.heading_options.map(value=><option key={value} value={value}>{value}</option>)}
        </select>
        <span aria-hidden="true">⌄</span>
      </label>.</h1>
      <p className="arc-beat-copy">{active.poster}</p>
      <p className="arc-hero-sub">{copy.hero.subheading}</p>
      <div className="arc-hero-actions"><button type="button" className="arc-primary" onClick={onBook}>{copy.primary_cta}</button>
        <button type="button" className="arc-light-link" onClick={()=>{jump(2);setPlaying(true);}}>{copy.secondary_cta}</button></div>
    </div>
    <div className="arc-scene-controls">
      <button type="button" id="arc-play" aria-pressed={playing} onClick={()=>setPlaying(v=>!v)}>
        {playing?"Pause scene":"Play scene"}
      </button>
      <div className="arc-dock">
        <button type="button" id="arc-dock-toggle" aria-expanded={dockOpen} aria-controls="arc-dock-options"
          onClick={()=>setDockOpen(v=>!v)} aria-label={dockOpen?"Collapse scene controls":"Expand scene controls"}>{dockOpen?"›":"‹"}</button>
        {dockOpen&&<div id="arc-dock-options" className="arc-dock-options" role="group" aria-label="Scene camera">
          {(["chase","free","eye"] as const).map(value=><button type="button" key={value} aria-pressed={mode===value} onClick={()=>changeCamera(value)}>
            {value[0].toUpperCase()+value.slice(1)}
          </button>)}
          <button type="button" aria-pressed={dark} onClick={()=>setDark(v=>!v)}>Dark</button>
        </div>}
      </div>
    </div>
    <div className="arc-scene-footer" aria-live="off">
      {phase>=3&&phase<=4?<span>Tasks per hour [X] · Accuracy [X] · Response time [X] · demo readouts only</span>:
        <span>Support / Finance / Operations · point-cloud scene</span>}
      <span>{renderer==="loading"?"Assembling the scene…":reduced&&!playing?"Motion is paused. Play scene":renderer==="canvas2d"?"2D compatibility rendering":""}</span>
    </div>
  </section>;
}

function BriefForm(){
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [job,setJob]=useState("");
  const [error,setError]=useState("");
  const [result,setResult]=useState("");
  const [manual,setManual]=useState(false);
  const draft="ABAP · AI agents for business\nName: "+name+"\nWork email: "+email+"\nWhat should the agent do?\n"+job;
  function validate(){
    if(!name.trim()||job.trim().length<12){setError(copy.form.errors.empty);return false;}
    if(!EMAIL_PATTERN.test(email.trim())){setError(copy.form.errors.email);return false;}
    setError("");return true;
  }
  function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!validate())return;
    // There is no configured sending endpoint in the template.
    // Do not transmit leads silently or show the copy-deck success state.
    setResult("Submission is not configured. No brief has been sent. Copy the brief to share it.");
  }
  async function copyBrief(){
    if(!validate())return;
    if(!navigator.clipboard?.writeText){setManual(true);setResult("Clipboard unavailable. Select the draft text below.");return;}
    try{await navigator.clipboard.writeText(draft);setManual(false);setResult("Brief copied. No message was sent.");}
    catch{setManual(true);setResult("Clipboard access denied. Select the draft text below.");}
  }
  return <form id="arc-brief" className="arc-brief-form" onSubmit={submit} noValidate>
    <label htmlFor="arc-name">{copy.form.labels[0]}
      <input id="arc-name" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" maxLength={120}/>
    </label>
    <label htmlFor="arc-email">{copy.form.labels[1]}
      <input id="arc-email" value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" maxLength={200}/>
    </label>
    <label htmlFor="arc-job">{copy.form.labels[2]}
      <textarea id="arc-job" value={job} onChange={e=>setJob(e.target.value)} rows={4} maxLength={2000}
        placeholder={copy.form.hint}/>
    </label>
    <div className="arc-brief-actions">
      <button type="submit" className="arc-primary">{copy.form.submit}</button>
      <button type="button" onClick={copyBrief}>Copy brief</button>
    </div>
    <p className="arc-form-disclaimer">Form preview only. No delivery endpoint or reply email has been configured; this form does not send or store your personal details on a server.</p>
    {error&&<p role="alert" className="arc-error">{error}</p>}
    {result&&<p role="status" className="arc-copy-status">{result}</p>}
    {manual&&<textarea className="arc-manual" readOnly value={draft} aria-label="Brief text to copy" rows={6}/>}
  </form>;
}

export function ArcAbapLanding(){
  const [more,setMore]=useState(false);
  const scrollBrief=()=>document.getElementById("arc-brief")?.scrollIntoView({behavior:"smooth",block:"center"});
  return <div id="loop-project-runtime" className="loop-project-runtime arc-abap" data-status="ready" data-implementation="react-native">
    <main className="arc-page">
      <SceneHero onBook={scrollBrief}/>
      <section id="statement" className="arc-statement arc-section">
        <p className="arc-label">THE THESIS / ABAP</p>
        <h2>{copy.statement.heading}</h2>
        <p>{copy.statement.body}</p>
      </section>
      <section id="agents" className="arc-section arc-agents">
        <div className="arc-section-lead"><p className="arc-label">01 / AGENTS</p><h2>{copy.agents.heading}</h2></div>
        <div className="arc-grid-four">
          {copy.agents.entries.map((item,i)=><article key={item.team} className="arc-team-card">
            <span className="arc-mono">0{i+1} / {item.team.toUpperCase()}</span>
            <h3>{item.team}</h3><p>{item.description}</p>
            <a href="#method" className="arc-text-link">How it works <span aria-hidden="true">↗</span></a>
          </article>)}
        </div>
      </section>
      <section id="method" className="arc-section arc-method">
        <div className="arc-section-lead"><p className="arc-label">02 / METHOD</p><h2>{copy.method.heading}</h2></div>
        <ol className="arc-method-grid">{copy.method.steps.map((step,i)=><li key={step.title}>
          <span className="arc-mono">0{i+1} / 06</span><h3>{step.title}</h3><p>{step.description}</p>
        </li>)}</ol>
        <p className="arc-method-closing">{copy.method.closing}</p>
      </section>
      <section id="control" className="arc-section arc-control">
        <div className="arc-section-lead"><p className="arc-label">03 / CONTROL</p><h2>{copy.control.heading}</h2></div>
        <div className="arc-control-grid">
          <div className="arc-control-lines">{copy.control.lines.map((line,i)=><p key={line}><span>0{i+1}</span>{line}</p>)}</div>
          <div><p className="arc-control-body">{copy.control.body}</p>
            <p className="arc-caveat">{copy.control.qualification}</p></div>
        </div>
      </section>
      <section id="work" className="arc-section arc-work">
        <div className="arc-section-lead"><p className="arc-label">04 / WORK INDEX</p><h2>Agents at work</h2></div>
        <p className="arc-mono arc-work-caption">{copy.work.label}</p>
        <p className="arc-caveat">{copy.work.verification}</p>
        <div className="arc-work-list">{copy.work.entries.map((item,i)=><div key={i} className="arc-work-row">
          <span className="arc-work-number">0{i+1}</span><strong>{item.name}</strong><p>{item.description}</p><span>{item.sector}</span>
        </div>)}</div>
        <button type="button" className="arc-load-more" onClick={()=>setMore(v=>!v)}>{copy.work.more} <span aria-hidden="true">↗</span></button>
        {more&&<p role="status" className="arc-caveat">Additional verified case studies have not been supplied. No clients or results are invented.</p>}
      </section>
      <section id="start" className="arc-section arc-start">
        <div className="arc-section-lead"><p className="arc-label">05 / START</p><h2>{copy.start.heading}</h2></div>
        <div className="arc-start-grid">{copy.start.options.map((option,i)=><article key={option.title}>
          <span className="arc-mono">0{i+1}</span><h3>{option.title}</h3><p>{option.description}</p>
          <button type="button" onClick={scrollBrief}>Start a brief <span aria-hidden="true">↗</span></button>
        </article>)}</div>
        <p className="arc-start-honesty">{copy.start.line}</p>
      </section>
      <section id="faq" className="arc-section arc-faq">
        <div className="arc-section-lead"><p className="arc-label">06 / QUESTIONS</p><h2>Frequently asked questions</h2></div>
        <div className="arc-faq-list">{copy.faq.entries.map((item,i)=><details key={item.question}>
          <summary><span className="arc-mono">{String(i+1).padStart(2,"0")}</span><strong>{item.question}</strong><span className="arc-faq-toggle" aria-hidden="true">+</span></summary>
          <p>{item.answer}</p>
        </details>)}</div>
      </section>
      <section id="about" className="arc-section arc-about"><p className="arc-label">ABOUT / ABAP</p>
        <p>{copy.about.body}</p><span>{copy.about.placeholders}</span></section>
      <section id="contact" className="arc-section arc-contact">
        <div className="arc-contact-head"><p className="arc-label">READY / CONTACT</p><h2>{copy.closing.heading}</h2>
          <p>{copy.closing.body}</p>
          <div className="arc-contact-links"><a href="#arc-brief">{copy.closing.primary_cta}</a>
            <a href="#arc-brief">{copy.closing.secondary_cta}</a></div>
        </div>
        <BriefForm/>
      </section>
      <footer className="arc-footer">
        <div><strong>{copy.footer.brand}</strong><p>{copy.footer.contact}</p><span>{copy.footer.year}</span></div>
        <nav aria-label="Footer navigation">{copy.footer.navigation.map(name=><a key={name} href={"#"+stageIds[name]}>{name}</a>)}</nav>
        <div className="arc-footer-meta"><p>{copy.footer.legal.join(" · ")} (pages pending)</p>
          <p aria-label="Languages">EN · <span title="Translation pending">NL</span> · <span title="Translation pending">PT</span></p></div>
      </footer>
    </main>
  </div>;
}
export default ArcAbapLanding;
