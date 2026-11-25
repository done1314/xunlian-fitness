import {renderLensMap} from './vendor/liquid-glass.js';

const NS='http://www.w3.org/2000/svg';
let sequence=0;
const node=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [name,value]of Object.entries(attrs))el.setAttribute(name,value);return el;};

// Native SVG ink and filters, in a sibling of the backdrop-filter surface.
// No foreignObject or backdrop-filter:url(): Safari can render this path too.
// The ink plane never moves. Only the lens aperture and its displacement map do.
export function createNavigationOptics(dock,nav,buttons){
  const prefix=`nav-optics-${++sequence}`;
  const svg=node('svg',{'aria-hidden':'true',class:'nav-optics',focusable:'false'}),defs=node('defs');
  const ink=node('g',{id:`${prefix}-ink`});
  const aperture=node('clipPath',{id:`${prefix}-aperture`,clipPathUnits:'userSpaceOnUse'}),clip=node('rect');aperture.append(clip);
  const rim=node('mask',{id:`${prefix}-rim`,maskUnits:'userSpaceOnUse',x:-80,y:-40,width:600,height:160});
  const outer=node('rect',{fill:'white'}),inner=node('rect',{fill:'black'});rim.append(outer,inner);
  const filter=node('filter',{id:`${prefix}-bend`,filterUnits:'userSpaceOnUse',x:-40,y:-30,width:600,height:140,'color-interpolation-filters':'sRGB'});
  const neutral=node('feFlood',{'flood-color':'rgb(128,128,128)',result:'neutral'});
  const image=node('feImage',{preserveAspectRatio:'none',result:'map'});
  filter.append(neutral,image,node('feComposite',{in:'map',in2:'neutral',operator:'over',result:'field'}),node('feDisplacementMap',{in:'SourceGraphic',in2:'field',scale:15,xChannelSelector:'R',yChannelSelector:'G',result:'bent'}),node('feGaussianBlur',{in:'bent',stdDeviation:'.16'}));
  const soft=node('filter',{id:`${prefix}-soft`,x:'-30%',y:'-60%',width:'160%',height:'220%'});soft.append(node('feGaussianBlur',{stdDeviation:'1.25'}));
  defs.append(ink,aperture,rim,filter,soft);svg.append(defs);
  const window=node('g',{'clip-path':`url(#${prefix}-aperture)`});
  const clear=node('use',{href:`#${prefix}-ink`,color:'#007aff',filter:`url(#${prefix}-bend)`});
  const fringe=node('g',{mask:`url(#${prefix}-rim)`,filter:`url(#${prefix}-soft)`});
  const cyan=node('use',{href:`#${prefix}-ink`,color:'#55cfff',opacity:'.7',transform:'translate(-.7 0)',filter:`url(#${prefix}-bend)`});
  const violet=node('use',{href:`#${prefix}-ink`,color:'#697aff',opacity:'.5',transform:'translate(.8 .2)',filter:`url(#${prefix}-bend)`});
  fringe.append(cyan,violet);window.append(fringe,clear);svg.append(window);dock.append(svg);
  let height=0,inset=0,step=0,mapGeneration=0,lastFrame=null,version=0,settleTimers=[];
  const rect=(el,x,y,w,h,r)=>{for(const [key,value]of Object.entries({x,y,width:w,height:h,rx:r}))el.setAttribute(key,value);};
  function draw(frame){
    lastFrame=frame;if(!step)return;
    const w=step*frame.scaleX,h=height*frame.scaleY;
    const x=inset+frame.x+(step-w)/2,y=inset+(height-h)/2;
    rect(clip,x,y,w,h,h/2);rect(outer,x,y,w,h,h/2);rect(inner,x+9,y+8,Math.max(0,w-18),Math.max(0,h-16),Math.max(0,h/2-8));
    for(const [key,value]of Object.entries({x,y,width:w,height:h}))image.setAttribute(key,value);
    // WebKit may retain a stale filter result when only primitive coordinates
    // change; a fresh reference invalidates that small SVG surface explicitly.
    filter.id=`${prefix}-bend-${++version}`;
    for(const use of [clear,cyan,violet])use.setAttribute('filter',`url(#${filter.id})`);
  }
  function resize(size){
    ({height,inset,step}=size);
    svg.setAttribute('viewBox',`0 0 ${nav.offsetWidth} ${nav.offsetHeight}`);
    ink.replaceChildren();
    const box=nav.getBoundingClientRect();
    for(const button of buttons){
      const b=button.getBoundingClientRect(),icon=button.querySelector('svg'),label=button.lastElementChild;
      const cx=b.left-box.left+b.width/2,cy=b.top-box.top+b.height/2;
      const item=node('g',{class:'nav-optic-item',transform:`translate(${cx} ${cy}) scale(1.08) translate(${-cx} ${-cy})`});
      if(icon){const r=icon.getBoundingClientRect(),copy=icon.cloneNode(true);for(const [k,v]of Object.entries({x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height}))copy.setAttribute(k,v);item.append(copy);}
      const labelBox=label.getBoundingClientRect(),style=getComputedStyle(label);
      const text=node('text',{x:cx,y:labelBox.top-box.top+labelBox.height/2,'text-anchor':'middle','dominant-baseline':'central',fill:'currentColor','font-size':style.fontSize,'font-weight':style.fontWeight,'font-family':style.fontFamily});
      text.textContent=label.textContent;item.append(text);ink.append(item);
    }
    // One map per resize, never one PNG per animation frame.
    const url=renderLensMap({width:step,height,radius:height/2,bezel:.72,curvature:3,specular:0},1.5).canvas.toDataURL('image/png');
    const generation=++mapGeneration,preload=new Image();preload.src=url;
    settleTimers.forEach(clearTimeout);
    preload.decode().catch(()=>{}).then(()=>{
      if(generation!==mapGeneration)return;
      image.setAttribute('href',url);image.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',url);
      if(lastFrame)draw(lastFrame);
      // Safari decodes feImage separately from the preloader. Refresh the
      // reference after that decode even when the lens is already at rest.
      settleTimers=[60,250].map(delay=>setTimeout(()=>{if(generation===mapGeneration&&lastFrame)draw(lastFrame);},delay));
    });
    if(lastFrame)draw(lastFrame);
  }
  return {draw,resize,setSolid(value){svg.classList.toggle('is-solid',value);filter.querySelector('feDisplacementMap').setAttribute('scale',value?0:15);fringe.setAttribute('opacity',value?0:1);}};
}
