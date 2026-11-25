// Optical engine: gentpan/liquidglass, MIT; see vendor/LIQUID-GLASS-LICENSE.txt.
import {createGlass,createSpring} from './vendor/liquid-glass.js';
import {createLensMotion,rubberBand,destinationIndex} from './nav-physics.js';

const nav=document.querySelector('.bottom-nav'),app=document.querySelector('#app');
const buttons=[...nav.querySelectorAll('[data-nav]')],selection=nav.querySelector('.nav-selection');
const opaque=matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
let selected=Math.max(0,buttons.findIndex(b=>b.getAttribute('aria-current')==='page'));
let geometry={step:0,height:0,width:0},drag=null,optics=null,sceneOptics=null,segment=null;
let ignoreNativeClickUntil=0,sceneFrame=0,rebuildNext=false;

// Both the optical map and the lens viewport have constant dimensions. The
// outside shell stretches with transform, so moving never regenerates a PNG map.
const surface=document.createElement('span');surface.className='nav-lens-surface';
const world=document.createElement('span');world.className='nav-lens-world';
const track=document.createElement('span');track.className='nav-lens-icons';
surface.append(world,track);selection.replaceChildren(surface);
selection.setAttribute('aria-hidden','true');selection.inert=true;
for(const button of buttons){
  const copy=document.createElement('span');copy.className='nav-copy-item';
  copy.innerHTML=button.innerHTML;
  copy.querySelectorAll('[data-icon]').forEach(el=>el.removeAttribute('data-icon'));
  track.append(copy);
}
const scene=document.createElement('div');scene.className='nav-scene';scene.inert=true;
scene.setAttribute('aria-hidden','true');nav.prepend(scene);

function paint({x,y,scaleX,scaleY,moving,held,tracking}){
  selection.style.transform=`translate3d(${x}px,${y}px,0) scale(${scaleX},${scaleY})`;
  // Keep letters at a readable size while the shell inflates around the finger.
  const magnification=opaque.matches?1:1.035;
  const ax=magnification/scaleX,ay=magnification/scaleY;
  const tx=geometry.step/2-(x+geometry.step/2)*ax;
  const ty=geometry.height/2*(1-ay);
  const matrix=`matrix(${ax},0,0,${ay},${tx},${ty})`;
  track.style.transform=matrix;world.style.transform=matrix;
  nav.classList.toggle('is-animating',moving);
  nav.classList.toggle('is-pressed',held);
  nav.classList.toggle('is-dragging',tracking);
}
const motion=createLensMotion(0,paint,{reducedMotion:()=>reduced.matches});

function cloneCard(source){
  const copy=source.cloneNode(true);
  copy.removeAttribute('id');copy.removeAttribute('tabindex');copy.removeAttribute('role');
  copy.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  copy.querySelectorAll('[tabindex],[role]').forEach(el=>{el.removeAttribute('tabindex');el.removeAttribute('role');});
  copy.querySelectorAll('[data-action],[data-nav],[data-edit],[data-kind]').forEach(el=>{
    ['data-action','data-nav','data-edit','data-kind'].forEach(a=>el.removeAttribute(a));
  });
  copy.querySelectorAll('img').forEach(el=>{el.loading='eager';el.draggable=false;});
  const fields=source.querySelectorAll('input,select,textarea');
  copy.querySelectorAll('input,select,textarea').forEach((el,i)=>{
    const original=fields[i],span=document.createElement('span');
    if(['radio','checkbox'].includes(original.type))span.hidden=true;
    else{span.textContent=original.value||original.placeholder||'';Object.assign(span.style,{flex:'1',minWidth:'0',textAlign:'right',fontSize:'15px'});}
    el.replaceWith(span);
  });
  copy.querySelectorAll('label[for]').forEach(el=>el.removeAttribute('for'));
  copy.querySelectorAll('button,a').forEach(el=>{
    const span=document.createElement('span');span.className=el.className;span.innerHTML=el.innerHTML;
    if(el.getAttribute('style'))span.setAttribute('style',el.getAttribute('style'));el.replaceWith(span);
  });
  Object.assign(copy.style,{position:'absolute',left:'0',top:'0',margin:'0',pointerEvents:'none'});
  return copy;
}
const clones=new Map();
function syncScene(rebuild=false){
  if(opaque.matches){scene.replaceChildren();world.replaceChildren();clones.clear();return;}
  const rect=nav.getBoundingClientRect(),matches=[];
  app.querySelectorAll('.plan-card,.task-card,.profile-hero,.form-group,.goal-option,.rest-state').forEach(source=>{
    const box=source.getBoundingClientRect();
    if(box.bottom>rect.top-40&&box.top<rect.bottom+40&&box.right>rect.left-30&&box.left<rect.right+30)matches.push({source,box});
  });
  const keep=new Set(matches.map(m=>m.source));
  for(const [source,nodes]of clones)if(rebuild||!keep.has(source)){nodes.base.remove();nodes.lens.remove();clones.delete(source);}
  for(const {source,box}of matches){
    let nodes=clones.get(source);
    if(!nodes){nodes={base:cloneCard(source),lens:cloneCard(source)};scene.append(nodes.base);world.append(nodes.lens);clones.set(source,nodes);}
    for(const [key,node]of Object.entries(nodes)){
      const inset=key==='lens'?5:0;
      const width=`${box.width}px`,height=`${box.height}px`;
      if(node.style.width!==width)node.style.width=width;
      if(node.style.height!==height)node.style.height=height;
      node.style.transform=`translate3d(${box.left-rect.left-inset}px,${box.top-rect.top-inset}px,0)`;
    }
  }
  nav.classList.toggle('has-scene',matches.length>0);
}
function scheduleScene(rebuild=false){
  rebuildNext||=rebuild;if(sceneFrame)return;
  sceneFrame=requestAnimationFrame(()=>{sceneFrame=0;syncScene(rebuildNext);rebuildNext=false;});
}
function measure(){
  const width=nav.clientWidth,height=nav.clientHeight-10,step=(width-10)/buttons.length;
  if(width===geometry.width&&height===geometry.height)return;
  if(drag)cancelGesture();
  geometry={width,height,step};
  Object.assign(selection.style,{width:`${step}px`,height:`${height}px`});
  Object.assign(track.style,{width:`${width-10}px`,height:`${height}px`});
  Object.assign(world.style,{width:`${width-10}px`,height:`${height}px`});
  optics?.update({radius:height/2});
  sceneOptics?.update({radius:nav.clientHeight/2});
  motion.jump(selected*step);scheduleScene(true);
}
function setSelected(index,{immediate=false}={}){
  const next=clamp(index,0,buttons.length-1),changed=next!==selected;
  selected=next;
  if(!drag)motion.goTo(next*geometry.step,{immediate,pulse:changed&&!immediate});
  scheduleScene(true);
}

// Preserve the existing push / pull / legs segmented glass control.
function refreshSegments(){
  if(opaque.matches){segment?.destroy();segment=null;return;}
  const host=app.querySelector('.segmented');
  if(segment?.host===host){segment.update();return;}
  segment?.destroy();segment=null;if(!host)return;
  const choices=[...host.querySelectorAll('[data-kind]')];
  const copy=document.createElement('div');copy.className='segment-lens-copy';copy.setAttribute('aria-hidden','true');copy.inert=true;
  choices.forEach(button=>{const span=document.createElement('span');span.textContent=button.textContent;copy.append(span);});
  const shadow=document.createElement('span');shadow.className='segment-lens-shadow';shadow.setAttribute('aria-hidden','true');
  host.append(shadow,copy);
  const glass=createGlass(copy,{clip:true,refraction:5,bezel:.58,curvature:3,chroma:0,specular:.4,specularWidth:1.2,mapScale:1});
  const step=()=>(host.clientWidth-8)/3;
  const index=()=>Math.max(0,choices.findIndex(b=>b.getAttribute('aria-selected')==='true'));
  const draw=x=>{const width=step(),height=host.clientHeight-8;shadow.style.width=width+'px';shadow.style.height=height+'px';shadow.style.transform=`translateX(${x}px)`;glass.update({x:x+4,y:4,width,height,radius:height/2});};
  const spring=createSpring(index()*step(),draw,{stiffness:520,damping:40});
  const update=()=>spring.set(index()*step(),{immediate:choices.some(b=>b.matches(':focus-visible'))});
  const onClick=e=>{const b=e.target.closest('[data-kind]');if(b)spring.set(choices.indexOf(b)*step(),{immediate:b.matches(':focus-visible')});};
  const sizing=new ResizeObserver(()=>spring.set(index()*step(),{immediate:true}));sizing.observe(host);
  host.addEventListener('click',onClick);spring.set(index()*step(),{immediate:true});
  segment={host,update,destroy(){glass.destroy();spring.stop();sizing.disconnect();host.removeEventListener('click',onClick);copy.remove();shadow.remove();}};
}
window.XunlianGlass={select:setSelected,refresh:refreshSegments};

function configure(){
  optics?.destroy();sceneOptics?.destroy();optics=sceneOptics=null;
  document.documentElement.classList.toggle('glass-solid',opaque.matches);
  if(!opaque.matches){
    // The engine's RGB-sum fringe requires an opaque source; this lens is
    // translucent. A single displacement pass keeps it clear instead of grey.
    optics=createGlass(surface,{fit:true,clip:true,radius:geometry.height/2,refraction:8,bezel:.65,curvature:3,chroma:0,specular:.50,specularWidth:1.4,mapScale:1});
    sceneOptics=createGlass(scene,{fit:true,clip:true,radius:35,refraction:9,bezel:.7,curvature:4,chroma:0,blur:5,specular:.24,mapScale:1});
  }
  motion.jump(selected*geometry.step);scheduleScene(true);refreshSegments();
}

function finish(event,cancelled=false){
  if(!drag||event.pointerId!==drag.id)return;
  const gesture=drag;drag=null;
  if(nav.hasPointerCapture(event.pointerId))nav.releasePointerCapture(event.pointerId);
  ignoreNativeClickUntil=performance.now()+400;
  const velocity=performance.now()-gesture.lastTime>90?0:gesture.velocity;
  const next=cancelled?selected:gesture.active?destinationIndex(motion.value,velocity,geometry.step,buttons.length):gesture.index;
  motion.release(next*geometry.step,{velocity:cancelled?0:velocity,pulse:!cancelled});
  if(!cancelled)buttons[next].click();
}
function cancelGesture(){if(drag)finish({pointerId:drag.id},true);}
nav.addEventListener('pointerdown',event=>{
  const button=event.target.closest('[data-nav]');
  if(event.button!==0||event.isPrimary===false||drag||!button)return;
  const rect=nav.getBoundingClientRect(),center=rect.left+5+motion.value+geometry.step/2;
  const grabbed=Math.abs(event.clientX-center)<geometry.step*.64;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,index:buttons.indexOf(button),rect,active:false,grabX:grabbed?event.clientX-center:0,baseY:motion.y,previousX:event.clientX,lastTime:performance.now(),velocity:0};
  motion.press();nav.setPointerCapture(event.pointerId);
  // Pointer focus must not be mistaken for keyboard navigation or snap the lens.
  event.preventDefault();
});
nav.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.active&&Math.hypot(dx,dy)<4)return;
  drag.active=true;
  const time=performance.now(),dt=Math.max(.008,(time-drag.lastTime)/1000);
  const velocity=clamp((event.clientX-drag.previousX)/dt,-2400,2400);
  drag.velocity=drag.velocity*.3+velocity*.7;drag.previousX=event.clientX;drag.lastTime=time;
  const x=event.clientX-drag.rect.left-5-geometry.step/2-drag.grabX;
  const y=rubberBand(drag.baseY+dy,-18,18,14);
  motion.track(rubberBand(x,0,geometry.step*(buttons.length-1)),y,drag.velocity);
  event.preventDefault();
});
nav.addEventListener('pointerup',event=>finish(event));
nav.addEventListener('pointercancel',event=>finish(event,true));
nav.addEventListener('lostpointercapture',event=>{if(drag)finish(event,true);});
window.addEventListener('blur',cancelGesture);
nav.addEventListener('click',event=>{
  if(event.isTrusted&&event.detail>0&&performance.now()<ignoreNativeClickUntil){event.preventDefault();event.stopImmediatePropagation();}
},true);
buttons.forEach((button,index)=>button.addEventListener('click',event=>{
  const keyboard=event.isTrusted&&event.detail===0;
  if(index===selected&&!motion.isHeld&&!keyboard)motion.goTo(index*geometry.step,{pulse:true});
  setSelected(index,{immediate:keyboard});
}));
nav.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const current=Math.max(0,buttons.indexOf(document.activeElement));
  const index=event.key==='Home'?0:event.key==='End'?buttons.length-1:clamp(current+(event.key==='ArrowRight'?1:-1),0,buttons.length-1);
  event.preventDefault();buttons[index].focus({preventScroll:true});
  buttons[index].click();motion.jump(index*geometry.step);
});

opaque.addEventListener('change',configure);
reduced.addEventListener('change',()=>{cancelGesture();motion.jump(selected*geometry.step);});
new MutationObserver(()=>scheduleScene(true)).observe(app,{childList:true,subtree:true,characterData:true});
app.addEventListener('input',()=>scheduleScene(true));app.addEventListener('load',()=>scheduleScene(true),true);
window.addEventListener('scroll',()=>scheduleScene(),{passive:true});
new ResizeObserver(measure).observe(nav);
document.fonts.ready.then(()=>scheduleScene(true));
measure();configure();
