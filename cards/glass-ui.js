// Optical engine: gentpan/liquidglass, MIT. See vendor/LIQUID-GLASS-LICENSE.txt.
// Only small control surfaces are filtered; training cards stay on the content layer.
import { createGlass, createSpring } from './vendor/liquid-glass.js';

const nav=document.querySelector('.bottom-nav');
const buttons=[...nav.querySelectorAll('[data-nav]')];
const selection=nav.querySelector('.nav-selection');
const app=document.querySelector('#app');
const opaque=matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
let selected=Math.max(0,buttons.findIndex(b=>b.getAttribute('aria-current')==='page'));
let pressed=false,drag=null,copyGlass=null,sceneGlass=null,frame=0;

// A tinted copy is visible only inside the moving lens. This uses filter:url(),
// including on WebKit, rather than relying on Chromium-only backdrop SVG filters.
const copy=document.createElement('div');
copy.className='nav-lens-copy';
copy.setAttribute('aria-hidden','true');
copy.inert=true;
for(const button of buttons){
  const item=document.createElement('span');
  item.className='nav-copy-item';
  item.innerHTML=button.innerHTML;
  item.querySelectorAll('[data-icon]').forEach(el=>el.removeAttribute('data-icon'));
  copy.append(item);
}
nav.append(copy);

// Refraction of the real content passing under the fixed bottom bar. Reproduce
// only the intersecting cards (usually one), never the full scrolling page.
const scene=document.createElement('div');
scene.className='nav-scene';
scene.setAttribute('aria-hidden','true');
scene.inert=true;
nav.prepend(scene);
let clones=new Map();
function cloneCard(source){
  const node=source.cloneNode(true);
  node.removeAttribute('id');
  node.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  node.querySelectorAll('[data-action],[data-nav],[data-edit],[data-kind]').forEach(el=>{
    ['data-action','data-nav','data-edit','data-kind'].forEach(attr=>el.removeAttribute(attr));
  });
  node.querySelectorAll('button,input,select,textarea,a').forEach(el=>{el.tabIndex=-1;el.setAttribute('aria-hidden','true')});
  node.querySelectorAll('img').forEach(el=>{el.loading='eager';el.draggable=false});
  const originals=source.querySelectorAll('input,select,textarea');
  node.querySelectorAll('input,select,textarea').forEach((el,i)=>{el.value=originals[i].value;if('checked'in el)el.checked=originals[i].checked});
  Object.assign(node.style,{position:'absolute',margin:'0',transform:'none',pointerEvents:'none'});
  return node;
}
function syncScene(rebuild=false){
  if(opaque.matches)return;
  const rect=nav.getBoundingClientRect(),matches=[];
  app.querySelectorAll('.plan-card,.task-card,.profile-hero,.form-group,.goal-option,.rest-state').forEach(source=>{
    const box=source.getBoundingClientRect();
    if(box.bottom>rect.top-15&&box.top<rect.bottom+15&&box.right>rect.left&&box.left<rect.right)matches.push({source,box});
  });
  const keep=new Set(matches.map(x=>x.source));
  for(const [source,node]of clones){if(rebuild||!keep.has(source)){node.remove();clones.delete(source)}}
  for(const {source,box}of matches){
    let node=clones.get(source);
    if(!node){node=cloneCard(source);scene.append(node);clones.set(source,node)}
    Object.assign(node.style,{left:`${box.left-rect.left}px`,top:`${box.top-rect.top}px`,width:`${box.width}px`,height:`${box.height}px`});
  }
  nav.classList.toggle('has-scene',matches.length>0);
}
let rebuildNext=false;
function scheduleScene(rebuild=false){rebuildNext||=rebuild;if(frame)return;frame=requestAnimationFrame(()=>{frame=0;syncScene(rebuildNext);rebuildNext=false})}

function metrics(){return {step:(nav.clientWidth-10)/3,height:nav.clientHeight-10}}
function paint(x){
  const {step,height}=metrics(),inflate=pressed&&!motion.matches?6:0;
  const left=clamp(x,0,2*step)+5-inflate/2;
  selection.style.width=`${step+inflate}px`;
  selection.style.height=`${height}px`;
  selection.style.transform=`translateX(${left-5}px)`;
  copyGlass?.update({x:left,y:5,width:step+inflate,height,radius:height/2});
}
const spring=createSpring(selected*metrics().step,paint,{stiffness:520,damping:40});
function move(index,immediate=false){spring.set(index*metrics().step,{immediate});if(immediate)paint(index*metrics().step)}
function setSelected(index,{immediate=false}={}){selected=clamp(index,0,2);if(!drag)move(selected,immediate);scheduleScene(true)}
window.XunlianGlass={select:setSelected};

function configure(){
  copyGlass?.destroy();sceneGlass?.destroy();copyGlass=sceneGlass=null;
  document.documentElement.classList.toggle('glass-solid',opaque.matches);
  if(!opaque.matches){
    copyGlass=createGlass(copy,{clip:true,refraction:6,bezel:.58,curvature:3,chroma:0,specular:.42,specularWidth:1.2,mapScale:1});
    sceneGlass=createGlass(scene,{fit:true,clip:true,radius:35,refraction:8,bezel:.7,curvature:4,chroma:0,blur:6,specular:.2,mapScale:1});
  }
  move(selected,true);scheduleScene(true);
}
opaque.addEventListener('change',configure);

nav.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.target.closest('[data-nav]'))return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,active:false,index:buttons.indexOf(event.target.closest('[data-nav]'))};
  pressed=true;nav.classList.add('is-pressed');paint(spring.value);
});
nav.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.id)return;
  const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.active){
    if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){finish(event,true);return}
    if(Math.abs(dx)<5)return;
    drag.active=true;nav.setPointerCapture(event.pointerId);
  }
  const rect=nav.getBoundingClientRect(),{step}=metrics();
  spring.set(clamp(event.clientX-rect.left-5-step/2,0,step*2),{immediate:true});
});
function finish(event,cancelled=false){
  if(!drag||event.pointerId!==drag.id)return;
  const current=drag;drag=null;pressed=false;nav.classList.remove('is-pressed');
  if(nav.hasPointerCapture(event.pointerId))nav.releasePointerCapture(event.pointerId);
  if(current.active&&!cancelled){
    const next=clamp(Math.round(spring.value/metrics().step),0,2);
    setSelected(next);buttons[next].click();
  }else move(selected);
}
nav.addEventListener('pointerup',event=>finish(event));
nav.addEventListener('pointercancel',event=>finish(event,true));
window.addEventListener('pointerup',event=>finish(event));
window.addEventListener('pointercancel',event=>finish(event,true));
window.addEventListener('blur',()=>{if(drag)finish({pointerId:drag.id},true)});
nav.addEventListener('lostpointercapture',event=>{if(drag)finish(event,true)});
buttons.forEach((button,index)=>{
  button.addEventListener('click',()=>setSelected(index,{immediate:button.matches(':focus-visible')}));
  button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&!drag)move(index)});
  button.addEventListener('focus',()=>move(index,true));
});
nav.addEventListener('pointerleave',()=>{if(!drag)move(selected)});
nav.addEventListener('focusout',event=>{if(!nav.contains(event.relatedTarget)&&!drag)move(selected,true)});

const observer=new MutationObserver(()=>scheduleScene(true));
observer.observe(app,{childList:true,subtree:true,characterData:true});
app.addEventListener('input',()=>scheduleScene(true));
app.addEventListener('load',()=>scheduleScene(true),true);
window.addEventListener('scroll',()=>scheduleScene(),{passive:true});
const resize=new ResizeObserver(()=>{move(selected,true);sceneGlass?.update({radius:nav.clientHeight/2});scheduleScene()});
resize.observe(nav);
document.fonts.ready.then(()=>scheduleScene(true));
configure();
