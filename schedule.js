(function(root){
  'use strict';
  const dayMs=86400000;
  // Date helpers adapted from the user's study-guardian-webapp project.
  const key=date=>typeof date==='string'?date:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const parse=s=>new Date(s+'T12:00:00');
  const add=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return key(d)};
  const days=(a,b)=>Math.round((Date.UTC(...b.split('-').map((v,i)=>i===1?+v-1:+v))-Date.UTC(...a.split('-').map((v,i)=>i===1?+v-1:+v)))/dayMs);
  function scheduledRest(state,date){return state.restDates.includes(date)||state.restWeekdays.includes(parse(date).getDay())}
  function getDay(state,date){
    if(date<state.startDate)return{kind:'before',index:-1,cycle:0};
    const span=days(state.startDate,date),weeks=Math.floor(span/7),tail=span%7;
    let count=span-weeks*state.restWeekdays.length;
    for(let n=0;n<tail;n++)if(state.restWeekdays.includes(parse(add(state.startDate,weeks*7+n)).getDay()))count--;
    count-=new Set(state.restDates.filter(d=>d>=state.startDate&&d<date&&!state.restWeekdays.includes(parse(d).getDay()))).size;
    const length=state.order.length+(state.cycleRest||0),index=count%length;
    const planned=index>=state.order.length?'rest':state.order[index];
    const reason=state.restDates.includes(date)?'manual':state.restWeekdays.includes(parse(date).getDay())?'weekday':planned==='rest'?'cycle':null;
    return{kind:reason?'rest':state.overrides[date]||planned,index,cycle:Math.floor(count/length)+1,planned,reason};
  }
  function nextTraining(state,date){for(let n=1;n<=400;n++){const d=add(date,n),plan=getDay(state,d);if(plan.kind!=='rest'&&plan.kind!=='before')return{date:d,...plan}}return null}
  const api={key,parse,add,days,getDay,nextTraining,scheduledRest};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Schedule=api;
})(typeof window!=='undefined'?window:globalThis);
