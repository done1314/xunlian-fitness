import {createLensRenderer} from './nav-gpu.js?v=1.3.4';
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const el=document.createElementNS(NS,tag);for(const [name,value]of Object.entries(attrs))el.setAttribute(name,value);return el;};

export function createNavigationOptics(dock,nav,buttons){
  const canvas=document.createElement('canvas');canvas.className='nav-optics';canvas.setAttribute('aria-hidden','true');
  const source=node('svg',{xmlns:NS,class:'nav-optics-source','aria-hidden':'true',focusable:'false'});
  source.style.display='none';dock.append(source,canvas);
  let gpu=null,lost=false,solid=false,height=0,inset=0,step=0,width=0,surfaceHeight=0,lastFrame=null,generation=0,textureImage=null,uploads=0,draws=0,visible=null;
  function initialise(){
    try{gpu=createLensRenderer(canvas);}catch{gpu=null;}
    canvas.hidden=!gpu;source.style.display=gpu?'none':'block';canvas.dataset.renderer=gpu?'webgl':'vector-fallback';
  }
  initialise();
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.hidden=true;source.style.display='block';canvas.dataset.renderer='vector-fallback';if(lastFrame)draw(lastFrame);});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;initialise();if(gpu&&textureImage){upload();gpu.setSolid(solid);}if(lastFrame)draw(lastFrame);});
  function upload(){
    gpu.upload(textureImage,{width,height:surfaceHeight,dpr:Math.min(2,window.devicePixelRatio||1),inset,step,centreY:inset+height/2});
    canvas.dataset.textureUploads=String(++uploads);
  }
  function draw(frame){
    lastFrame=frame;
    const active=frame.moving||frame.held||frame.tracking;
    canvas.hidden=!active||!gpu||lost;
    source.style.display=active&&(!gpu||lost)?'block':'none';
    if(active!==visible){visible=active;canvas.dataset.active=String(active);}
    // At rest the actual DOM glyphs are the only ink on screen. Keeping even
    // an unblurred canvas copy would introduce font-rasterisation double edges.
    if(!active){canvas.dataset.drawCalls=String(draws);return;}
    if(!step)return;
    const hw=step*frame.scaleX/2,hh=height*frame.scaleY/2,cx=inset+frame.x+step/2,cy=inset+height/2;
    const zoom=1+Math.min(.08,(Math.abs(frame.scaleX-1)+Math.abs(frame.scaleY-1))*.16);
    const strength=frame.held||frame.tracking?1:Math.min(1,(Math.abs(frame.scaleX-1)+Math.abs(frame.scaleY-1))*7);
    if(gpu&&!lost){gpu.draw(cx,cy,hw,hh,zoom,strength);draws++;if(!frame.moving)canvas.dataset.drawCalls=String(draws);}
    else source.style.clipPath=`inset(${cy-hh+32}px ${width-cx-hw-32}px ${surfaceHeight-cy-hh-32}px ${cx-hw+32}px round ${hh}px)`;
  }
  function resize(size){
    ({height,inset,step}=size);width=nav.offsetWidth+64;surfaceHeight=nav.offsetHeight+64;
    for(const element of [source,canvas])Object.assign(element.style,{width:`${width}px`,height:`${surfaceHeight}px`});
    source.setAttribute('viewBox',`-32 -32 ${width} ${surfaceHeight}`);source.replaceChildren();
    const box=nav.getBoundingClientRect();
    for(const button of buttons){
      const b=button.getBoundingClientRect(),icon=button.querySelector('svg'),label=button.lastElementChild||button;
      const cx=b.left-box.left+b.width/2,cy=b.top-box.top+b.height/2;
      const item=node('g',{class:'nav-optic-item',color:'#007aff'});
      if(icon){
        const r=icon.getBoundingClientRect(),copy=icon.cloneNode(true);
        for(const [k,v]of Object.entries({x:r.left-box.left,y:r.top-box.top,width:r.width,height:r.height,fill:'none',stroke:'currentColor','stroke-width':1.8,'stroke-linecap':'round','stroke-linejoin':'round'}))copy.setAttribute(k,v);
        item.append(copy);
      }
      const labelBox=label.getBoundingClientRect(),style=getComputedStyle(label);
      const text=node('text',{x:cx,y:labelBox.top-box.top+labelBox.height/2,'text-anchor':'middle','dominant-baseline':'central',fill:'#007aff',stroke:'none','font-size':style.fontSize,'font-weight':style.fontWeight,'font-family':style.fontFamily});
      text.textContent=label.textContent;item.append(text);source.append(item);
    }
    const raster=source.cloneNode(true),dpr=Math.min(2,window.devicePixelRatio||1);
    raster.removeAttribute('class');raster.removeAttribute('style');raster.setAttribute('width',Math.round(width*dpr));raster.setAttribute('height',Math.round(surfaceHeight*dpr));
    const image=new Image(),version=++generation;
    image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(raster));
    image.decode().then(()=>{
      if(version!==generation)return;
      textureImage=image;
      if(gpu&&!lost){try{upload();}catch{gpu.destroy();gpu=null;canvas.hidden=true;source.style.display='block';canvas.dataset.renderer='vector-fallback';}}
      if(lastFrame)draw(lastFrame);
    }).catch(()=>{gpu?.destroy();gpu=null;canvas.hidden=true;source.style.display='block';canvas.dataset.renderer='vector-fallback';if(lastFrame)draw(lastFrame);});
    if(lastFrame)draw(lastFrame);
  }
  return {draw,resize,setSolid(value){solid=value;if(gpu&&!lost)gpu.setSolid(value);if(lastFrame)draw(lastFrame);}};
}
