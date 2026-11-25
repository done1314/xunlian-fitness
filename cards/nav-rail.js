import {createLensMotion,rubberBand,destinationIndex} from './nav-physics.js?v=1.3.3';
import {createNavigationOptics} from './navigation-optics.js?v=1.3.3';

const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
export function createGlassRail(host,buttons,lens,{initial=0,dock=host.parentElement}={}){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),opaque=matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
  const optics=createNavigationOptics(dock,host,buttons);
  const padding=parseFloat(getComputedStyle(host).paddingLeft)||0;
  let selected=initial,geometry={width:0,height:0,step:0,inset:0},drag=null,ignoreClickUntil=0;
  host.classList.add('glass-rail');lens.inert=true;
  const motion=createLensMotion(0,frame=>{
    lens.style.transform=`translate3d(${frame.x}px,0,0) scale(${frame.scaleX},${frame.scaleY})`;
    optics.draw(frame);
    host.classList.toggle('is-animating',frame.moving);host.classList.toggle('is-pressed',frame.held);host.classList.toggle('is-dragging',frame.tracking);
  },{reducedMotion:()=>reduced.matches});
  function select(index,{immediate=false}={}){
    const next=clamp(index,0,buttons.length-1),changed=next!==selected;selected=next;
    if(!drag)motion.goTo(next*geometry.step,{immediate,pulse:changed&&!immediate});
  }
  function measure(){
    const width=host.clientWidth,height=host.clientHeight-padding*2,step=(width-padding*2)/buttons.length;
    if(width<1||height<1||(width===geometry.width&&height===geometry.height))return;
    if(drag)finish({pointerId:drag.id},true);
    geometry={width,height,step,inset:host.clientLeft+padding};
    lens.style.width=step+'px';lens.style.height=height+'px';
    optics.resize(geometry);motion.jump(selected*step);
  }
  function finish(event,cancelled=false){
    if(!drag||event.pointerId!==drag.id)return;
    const gesture=drag;drag=null;
    if(host.hasPointerCapture(event.pointerId))host.releasePointerCapture(event.pointerId);
    ignoreClickUntil=performance.now()+400;
    const velocity=performance.now()-gesture.lastTime>90?0:gesture.velocity;
    const next=cancelled?selected:gesture.active?destinationIndex(motion.value,velocity,geometry.step,buttons.length):gesture.index;
    motion.release(next*geometry.step,{velocity:cancelled?0:velocity,pulse:!cancelled});
    if(!cancelled)buttons[next].click();
  }
  host.addEventListener('pointerdown',event=>{
    const button=buttons.find(button=>button.contains(event.target));
    if(event.button!==0||event.isPrimary===false||drag||!button)return;
    const rect=host.getBoundingClientRect(),centre=rect.left+geometry.inset+motion.value+geometry.step/2;
    const grabbed=Math.abs(event.clientX-centre)<geometry.step*.64;
    drag={id:event.pointerId,x:event.clientX,index:buttons.indexOf(button),rect,active:false,grabX:grabbed?event.clientX-centre:0,previousX:event.clientX,lastTime:performance.now(),velocity:0};
    motion.press();host.setPointerCapture(event.pointerId);event.preventDefault();
  });
  host.addEventListener('pointermove',event=>{
    if(!drag||event.pointerId!==drag.id||(!drag.active&&Math.abs(event.clientX-drag.x)<4))return;
    drag.active=true;
    const time=performance.now(),dt=Math.max(.008,(time-drag.lastTime)/1000);
    const velocity=clamp((event.clientX-drag.previousX)/dt,-2400,2400);
    drag.velocity=drag.velocity*.3+velocity*.7;drag.previousX=event.clientX;drag.lastTime=time;
    const x=event.clientX-drag.rect.left-geometry.inset-geometry.step/2-drag.grabX;
    motion.track(rubberBand(x,0,geometry.step*(buttons.length-1)),drag.velocity);event.preventDefault();
  });
  host.addEventListener('pointerup',event=>finish(event));host.addEventListener('pointercancel',event=>finish(event,true));
  host.addEventListener('lostpointercapture',event=>{if(drag)finish(event,true);});
  host.addEventListener('click',event=>{
    if(event.isTrusted&&event.detail>0&&performance.now()<ignoreClickUntil){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  buttons.forEach((button,index)=>button.addEventListener('click',event=>{
    const keyboard=event.isTrusted&&event.detail===0;
    if(index===selected&&!motion.isHeld&&!keyboard)motion.goTo(index*geometry.step,{pulse:true});
    select(index,{immediate:keyboard});
  }));
  host.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const current=Math.max(0,buttons.indexOf(document.activeElement));
    const index=event.key==='Home'?0:event.key==='End'?buttons.length-1:clamp(current+(event.key==='ArrowRight'?1:-1),0,buttons.length-1);
    event.preventDefault();buttons[index].focus({preventScroll:true});buttons[index].click();motion.jump(index*geometry.step);
  });
  const cancel=()=>{if(drag)finish({pointerId:drag.id},true);};
  window.addEventListener('blur',cancel);
  reduced.addEventListener('change',()=>{cancel();motion.jump(selected*geometry.step);});
  opaque.addEventListener('change',()=>{optics.setSolid(opaque.matches);motion.jump(selected*geometry.step);});
  new ResizeObserver(measure).observe(host);
  measure();optics.setSolid(opaque.matches);
  document.fonts.ready.then(()=>{if(host.isConnected)optics.resize(geometry);});
  return {select,suspend(){cancel();motion.stop();},resume(){measure();motion.jump(selected*geometry.step);}};
}
