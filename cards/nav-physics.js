const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));

export function rubberBand(value,low,high,limit=28){
  const edge=clamp(value,low,high),overflow=value-edge;
  return edge+overflow*.32/(1+Math.abs(overflow)*.32/limit);
}

export function destinationIndex(position,velocity,step,count=3){
  // A short flick can cross a stop; a fast flick must not skip the entire bar.
  const projected=position+clamp(velocity*.10,-step*.64,step*.64);
  return clamp(Math.round(projected/step),0,count-1);
}

export function integrateSpring(channel,target,seconds,stiffness=380,damping=25){
  let remaining=Math.min(.064,Math.max(0,seconds));
  while(remaining>0){
    const dt=Math.min(1/120,remaining);
    channel.velocity+=(-stiffness*(channel.value-target)-damping*channel.velocity)*dt;
    channel.value+=channel.velocity*dt;
    remaining-=dt;
  }
  return channel;
}

export function createLensMotion(initial,onUpdate,{reducedMotion=()=>false,raf=requestAnimationFrame,caf=cancelAnimationFrame,now=()=>performance.now()}={}){
  const channel=value=>({value,velocity:0});
  const state={x:channel(initial),sx:channel(1),sy:channel(1)};
  let target=initial,frame=0,last=0,held=false,tracking=false,pulseUntil=0,dragVelocity=0,travelling=false,arrival=false,preparing=false,launchBy=0;
  const render=moving=>onUpdate({x:state.x.value,y:0,scaleX:state.sx.value,scaleY:state.sy.value,moving,held,tracking,phase:tracking?'drag':preparing?'inflate':travelling?'travel':'settle'});
  const close=(axis,to,tolerance=.03)=>Math.abs(axis.value-to)<tolerance&&Math.abs(axis.velocity)<tolerance*8;
  function arrive(){
    travelling=false;arrival=true;
    // The stretched liquid recoils on arrival, then rebounds past its resting
    // width. Height responds in the opposite phase instead of scaling uniformly.
    state.sx.velocity=Math.min(state.sx.velocity,-2.4);
  }
  function tick(time){
    frame=0;
    const dt=Math.min(.032,Math.max(.001,(time-last)/1000));last=time;
    const reduced=reducedMotion(),pulse=time<pulseUntil,previous=target-state.x.value;
    if(preparing&&(time>=launchBy||(state.sx.value>=1.20&&state.sy.value>=1.15)))preparing=false;
    if(!tracking&&!preparing)integrateSpring(state.x,target,dt,420,22);
    if(travelling&&!preparing&&(previous*(target-state.x.value)<=0||Math.abs(target-state.x.value)<1.5))arrive();
    if(pulseUntil&& !pulse){pulseUntil=0;if(!held&&!travelling&&!arrival)arrive();}
    const speed=Math.abs(tracking?dragVelocity:state.x.velocity);
    const stretch=Math.min(.14,speed/6500);
    const sx=reduced?1:travelling?1.35+stretch:held?1.34+stretch:pulse?1.34:1;
    // Engaged glass protrudes beyond the rail vertically, but its centre never
    // leaves that rail. Recoil compresses width and height in opposite phases.
    const sy=reduced?1:(held||travelling||pulse?1.43:1)-.32*(state.sx.value-1);
    integrateSpring(state.sx,sx,dt,340,14);
    integrateSpring(state.sy,sy,dt,460,20);
    const moving=preparing||(!tracking&&!close(state.x,target))||!close(state.sx,sx,.0007)||!close(state.sy,sy,.0007)||pulse;
    if(!moving&&!tracking){state.x.value=target;state.sx.value=1;state.sy.value=1;arrival=false;}
    render(moving);
    if(moving)frame=raf(tick);
  }
  function wake(){if(!frame){last=now();frame=raf(tick);}}
  function jump(next){
    if(frame)caf(frame);frame=0;target=next;held=tracking=travelling=arrival=preparing=false;pulseUntil=0;
    for(const [key,value]of Object.entries({x:next,sx:1,sy:1})){state[key].value=value;state[key].velocity=0;}
    render(false);
  }
  return {
    get value(){return state.x.value;},
    get y(){return 0;},
    get velocity(){return state.x.velocity;},
    get isHeld(){return held;},
    get isTracking(){return tracking;},
    press(){held=tracking=true;travelling=arrival=preparing=false;dragVelocity=0;pulseUntil=0;wake();},
    track(x,velocity=0){
      held=tracking=true;dragVelocity=velocity;
      state.x.value=x;state.x.velocity=0;
      // Position is written on this pointer event, without spring lag.
      render(true);wake();
    },
    goTo(next,{immediate=false,pulse=false,velocity}={}){
      if(immediate||reducedMotion()){jump(next);return;}
      if(next!==target||(!tracking&&pulse)){
        travelling=Math.abs(next-state.x.value)>2;arrival=false;
        // A tap visibly inflates before departing; a caught lens keeps its
        // existing momentum and does not restart an anticipation animation.
        preparing=travelling&&pulse&&Math.abs(state.x.velocity)<60&&state.sx.value<1.20;
        if(preparing)launchBy=now()+80;
      }
      target=next;
      if(Number.isFinite(velocity))state.x.velocity=clamp(velocity,-2400,2400);
      if(pulse&&!travelling)pulseUntil=now()+100;
      wake();
    },
    release(next,{velocity=0,pulse=true}={}){
      held=tracking=false;dragVelocity=0;
      this.goTo(next,{velocity,pulse});
    },
    jump,
    stop(){if(frame)caf(frame);frame=0;}
  };
}
