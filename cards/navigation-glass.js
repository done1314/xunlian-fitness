import {createGlassRail} from './nav-rail.js?v=1.3.3';

const opaque=matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
const setSurfacePreference=()=>document.documentElement.classList.toggle('glass-solid',opaque.matches);
setSurfacePreference();opaque.addEventListener('change',setSurfacePreference);

const nav=document.querySelector('.bottom-nav'),app=document.querySelector('#app');
const navButtons=[...nav.querySelectorAll('[data-nav]')];
const navigation=createGlassRail(nav,navButtons,nav.querySelector('.nav-selection'),{initial:Math.max(0,navButtons.findIndex(button=>button.getAttribute('aria-current')==='page'))});
let segment=null;

function refreshSegments(){
  const host=app.querySelector('.segmented');
  if(!host){segment?.rail.suspend();return;}
  const selected=Math.max(0,[...host.querySelectorAll('[data-kind]')].findIndex(button=>button.getAttribute('aria-selected')==='true'));
  if(segment){
    if(host!==segment.host){
      host.replaceWith(segment.shell);
      segment.buttons.forEach((button,index)=>button.setAttribute('aria-selected',String(index===selected)));
      segment.rail.resume();
    }
    segment.rail.select(selected);return;
  }
  const shell=document.createElement('div');shell.className='segment-shell';host.before(shell);shell.append(host);
  const lens=document.createElement('span');lens.className='nav-selection segment-selection';lens.setAttribute('aria-hidden','true');host.prepend(lens);
  const buttons=[...host.querySelectorAll('[data-kind]')];
  segment={host,shell,buttons,rail:createGlassRail(host,buttons,lens,{initial:selected,dock:shell})};
}
window.XunlianGlass={select:(index,options)=>navigation.select(index,options),refresh:refreshSegments};
refreshSegments();
