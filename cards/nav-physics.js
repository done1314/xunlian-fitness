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
  const state={x:channel(initial),y:channel(0),sx:channel(1),sy:channel(1)};
  let target=initial,frame=0,last=0,held=false,tracking=false,pulseUntil=0,dragVelocity=0;
  const render=moving=>onUpdate({x:state.x.value,y:state.y.value,scaleX:state.sx.value,scaleY:state.sy.value,moving,held,tracking});
  const close=(axis,to,tolerance=.03)=>Math.abs(axis.value-to)<tolerance&&Math.abs(axis.velocity)<tolerance*8;
  function tick(time){
    frame=0;
    const dt=Math.min(.032,Math.max(.001,(time-last)/1000));last=time;
    const reduced=reducedMotion(),pulse=time<pulseUntil;
    const travel=Math.min(.17,Math.abs(tracking?dragVelocity:state.x.velocity)/5800);
    const sx=reduced?1:(held||pulse?1.20:1)+travel;
    const sy=reduced?1:(held||pulse?1.36:1)-travel*.24;
    const y=held&&!tracking&&!reduced?-3:0;
    if(!tracking){integrateSpring(state.x,target,dt);integrateSpring(state.y,y,dt,440,27);}
    integrateSpring(state.sx,sx,dt,460,23);
    integrateSpring(state.sy,sy,dt,420,22);
    const moving=(!tracking&&(!close(state.x,target)||!close(state.y,y)))||!close(state.sx,sx,.0007)||!close(state.sy,sy,.0007)||pulse;
    if(!moving&&!tracking){state.x.value=target;state.y.value=y;state.sx.value=sx;state.sy.value=sy;}
    render(moving);
    if(moving)frame=raf(tick);
  }
  function wake(){if(!frame){last=now();frame=raf(tick);}}
  function jump(next){
    if(frame)caf(frame);frame=0;target=next;held=tracking=false;pulseUntil=0;
    for(const [key,value]of Object.entries({x:next,y:0,sx:1,sy:1})){state[key].value=value;state[key].velocity=0;}
    render(false);
  }
  return {
    get value(){return state.x.value;},
    get y(){return state.y.value;},
    get velocity(){return state.x.velocity;},
    get isHeld(){return held;},
    get isTracking(){return tracking;},
    press(){held=true;pulseUntil=0;wake();},
    track(x,y,velocity=0){
      held=tracking=true;dragVelocity=velocity;
      state.x.value=x;state.x.velocity=0;state.y.value=y;state.y.velocity=0;
      // Position is written on this pointer event, without spring lag.
      render(true);wake();
    },
    goTo(next,{immediate=false,pulse=false,velocity}={}){
      target=next;
      if(immediate||reducedMotion()){jump(next);return;}
      if(Number.isFinite(velocity))state.x.velocity=clamp(velocity,-2400,2400);
      if(pulse)pulseUntil=now()+105;
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
