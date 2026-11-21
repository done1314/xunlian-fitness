(function(root){
  'use strict';
  const bmi=(height,weight)=>height>0&&weight>0?Number((weight/(height/100)**2).toFixed(1)):null;
  const swipe=(offset,velocity,width,index,total)=>{
    const projected=offset+velocity*0.16;
    if(projected < -width*.24&&index<total-1)return 1;
    if(projected > width*.24&&index>0)return -1;
    return 0;
  };
  const api={bmi,swipe};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FitnessModel=api;
})(typeof window!=='undefined'?window:globalThis);
