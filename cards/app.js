(() => {
  'use strict';
  const $=s=>document.querySelector(s), clone=x=>JSON.parse(JSON.stringify(x));
  const KEY='xunlian-cards-v1', today=()=>Schedule.key(new Date());
  const kinds={push:{name:'推日',muscle:'胸 · 肩前束 · 肱三头肌'},pull:{name:'拉日',muscle:'背 · 肩后束 · 肱二头肌'},legs:{name:'蹲日',muscle:'腿 · 肩中束 · 核心'}};
  const paths={
    cards:'<rect x="7" y="5" width="13" height="16" rx="3"/><path d="M4 17V5a3 3 0 0 1 3-3h9M11 10h5M11 14h3"/>',
    plan:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h4"/>',
    person:'<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="4"/><path d="M7 3v4M17 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01"/>',
    leaf:'<path d="M20 3C8 2 3 6 4 13c1 6 10 8 14 0 2-4 2-10 2-10ZM3 21 15 9"/>',
    left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5Z"/>',
    trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    settings:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    dumbbell:'<g transform="rotate(-40 12 12)"><rect x="4" y="6" width="3" height="12" rx="1.2"/><rect x="17" y="6" width="3" height="12" rx="1.2"/><path d="M7 12h10M2 10v4M22 10v4M9 9v6M15 9v6"/></g>',
    camera:'<path d="M8 6l2-3h4l2 3h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',
    expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
    flame:'<path d="M12 2c2 5 7 8 7 13a7 7 0 0 1-14 0c0-3 2-6 4-8 0 4 2 5 3 5 2-2 2-5 0-10Z"/>',
    heart:'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-1 7 8 15C21 12 23 8 20 5Z"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
  };
  const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths[n]||paths.cards}</svg>`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const imageSrc=value=>/^(assets\/[\w-]+\.png|data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+)$/.test(value||'')?value:'icon.svg';
  const defaults=()=>({version:1,startDate:today(),order:['push','pull','legs'],cycleRest:1,restWeekdays:[],restDates:[],overrides:{},plans:clone(DEFAULT_PLANS),profile:{name:'',height:'',weight:'',goal:'减脂',targetWeight:'',avatar:''}});
  function load(){
    try{const x=JSON.parse(localStorage.getItem(KEY));if(!x)return defaults();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(x.startDate)||!Array.isArray(x.order)||x.order.length!==3||new Set(x.order).size!==3||x.order.some(k=>!kinds[k]))return defaults();
      return {...defaults(),...x,restWeekdays:[...new Set((x.restWeekdays||[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))],restDates:(x.restDates||[]).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)),profile:{...defaults().profile,...x.profile},plans:Object.fromEntries(Object.keys(kinds).map(k=>[k,Array.isArray(x.plans?.[k])?x.plans[k]:clone(DEFAULT_PLANS[k])]))};
    }catch{return defaults()}
  }
  let state=load(),view=['today','plan','profile'].includes(location.hash.slice(1))?location.hash.slice(1):'today',planKind='push',selectedDate=today(),cardIndex=0,calendarMonth=today().slice(0,7),toastTimer,undoAction=null,gestureCleanup=()=>{};
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{toast('存储空间不足，请减少自选图片');return false}}
  function toast(message,undo){clearTimeout(toastTimer);undoAction=undo||null;$('#toast').innerHTML=`<span>${esc(message)}</span>${undo?'<button data-action="undo">撤销</button>':''}`;$('#toast').classList.add('show');toastTimer=setTimeout(()=>{$('#toast').classList.remove('show');undoAction=null},undo?8000:2600)}
  const dateLabel=d=>Schedule.parse(d).toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
  const shortDate=d=>Schedule.parse(d).toLocaleDateString('zh-CN',{month:'long',day:'numeric'});
  function summary(e){return e.timed?e.reps:`${e.sets} 组 × ${e.reps} 次`}
  function header(title,sub,action='calendar',actionLabel='训练日历'){return `<header class="page-header"><div class="header-title">${sub?`<p class="eyebrow">${esc(sub)}</p>`:''}<h1>${title}</h1></div><button class="icon-button glass" data-action="${action}" aria-label="${actionLabel}">${icon(action==='settings'?'settings':'calendar')}</button></header>`}
  function render(){
    gestureCleanup();gestureCleanup=()=>{};
    document.body.dataset.view=view;
    document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
    document.querySelectorAll('[data-nav]').forEach(el=>{if(el.dataset.nav===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
    const navIndex=['today','plan','profile'].indexOf(view);
    if(window.XunlianGlass)window.XunlianGlass.select(navIndex);
    else $('.nav-selection').style.transform=`translateX(${navIndex*100}%)`;
    const existingSegments=view==='plan'?$('#app .segmented'):null;
    const focusedKind=document.activeElement?.dataset.kind;
    $('#app').innerHTML=view==='today'?renderToday():view==='plan'?renderPlan():renderProfile();
    if(existingSegments&&$('#app .segmented')){
      $('#app .segmented').replaceWith(existingSegments);
      existingSegments.querySelectorAll('[data-kind]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.kind===planKind)));
      if(focusedKind)existingSegments.querySelector(`[data-kind="${focusedKind}"]`)?.focus({preventScroll:true});
    }
    if(view==='today'&&$('#active-card'))bindDeck();
    if(view==='plan')bindPlanSwipes();
    if(view==='profile')bindProfile();
    window.XunlianGlass?.refresh();
    fitTrainingCard();
  }
  function renderTaskArt(e){
    return `<div class="task-illustration" role="button" tabindex="0" aria-label="查看${esc(e.name)}完整动作图"><img src="${imageSrc(e.image)}" alt="${esc(e.name)}完整动作示意图" draggable="false"><span class="image-expand" aria-hidden="true">${icon('expand')}</span></div>`;
  }
  function fitTrainingCard(){
    const deck=$('.today-shell .deck'),card=$('#active-card');if(!deck||!card)return;
    const top=deck.getBoundingClientRect().top+window.scrollY;
    const available=$('.bottom-nav').getBoundingClientRect().top-top-24;
    const fixedHeight=['.task-top','.task-copy','.deck-controls'].reduce((sum,selector)=>sum+card.querySelector(selector).getBoundingClientRect().height,0);
    const height=Math.max(Math.ceil(fixedHeight+116),Math.min(680,Math.floor(available)));
    deck.style.setProperty('--training-card-height',`${height}px`);
  }
  let fitFrame=0;
  function scheduleCardFit(){if(fitFrame)return;fitFrame=requestAnimationFrame(()=>{fitFrame=0;fitTrainingCard()})}
  function showFullImage(e){showModal(e.name,`<div class="image-viewer"><img src="${imageSrc(e.image)}" alt="${esc(e.name)}完整动作示意图"></div>`)}
  function renderToday(){
    const day=Schedule.getDay(state,selectedDate),isRest=day.kind==='rest',before=day.kind==='before',kind=kinds[day.kind],exercises=state.plans[day.kind]||[];
    cardIndex=Math.min(Math.max(cardIndex,0),Math.max(0,exercises.length-1));
    let content;
    if(isRest||before){const next=before?{date:state.startDate,kind:state.order[0]}:Schedule.nextTraining(state,selectedDate);
      content=`<section class="rest-state"><div class="rest-symbol">${icon('leaf')}</div><h2>${before?'计划即将开始':'今天，好好休息'}</h2><p>${next?`下一次：${shortDate(next.date)} · ${kinds[next.kind].name}`:''}</p>${day.reason==='manual'?'<button class="secondary" data-action="rest">恢复当天训练</button>':'<button class="secondary" data-action="settings">调整训练安排</button>'}</section>`;
    }else if(!exercises.length){content='<div class="empty">这一天还没有动作。<br><br><button class="secondary" data-nav="plan">去添加训练动作</button></div>'}
    else{const e=exercises[cardIndex];content=`<div class="day-line"><strong>${kind.name}</strong><span>${kind.muscle}</span><span class="day-cycle">第 ${day.cycle} 轮</span></div><div class="deck" aria-roledescription="轮播"><div class="deck-back far" aria-hidden="true"></div><div class="deck-back" aria-hidden="true"></div><article class="task-card" id="active-card" tabindex="0" aria-label="${esc(e.name)}，${cardIndex+1} / ${exercises.length}，左右方向键切换"><div class="task-top"><span class="task-type">${icon('dumbbell')}${e.optional?'自选动作':e.timed?'热身有氧':'力量训练'}</span><span>${String(cardIndex+1).padStart(2,'0')} / ${String(exercises.length).padStart(2,'0')}</span></div>${renderTaskArt(e)}<div class="task-copy"><h2>${esc(e.name)}</h2><p class="muscle">${esc(e.muscle)}</p><div class="prescription">${e.timed?`<strong>${esc(e.reps).replace(/\s*分钟/,'')}</strong><span class="unit">分钟</span>`:`<div><strong>${esc(e.sets)}</strong><span class="unit">组</span></div><span class="times">×</span><div><strong>${esc(e.reps)}</strong><span class="unit">次</span></div>`}<span class="rest">${esc(e.restLabel)}</span></div></div><div class="deck-controls"><button data-action="prev-card" aria-label="上一个任务" ${cardIndex===0?'disabled':''}>${icon('left')}</button><div class="dots" role="status" aria-label="第 ${cardIndex+1} 个，共 ${exercises.length} 个任务">${exercises.map((_,i)=>`<i class="${i===cardIndex?'active':''}"></i>`).join('')}</div><button data-action="next-card" aria-label="下一个任务" ${cardIndex===exercises.length-1?'disabled':''}>${icon('right')}</button></div></article></div>`}
    return `<div class="today-shell">${header(selectedDate===today()?'今日训练':shortDate(selectedDate),dateLabel(selectedDate))}<button class="rest-pill glass" data-action="rest" ${before?'disabled':''}><span class="rest-label">${icon('leaf')}${day.reason==='manual'?'已设为休息':'今日休息'}</span></button>${content}</div>`;
  }
  function renderPlan(){const list=state.plans[planKind];return `${header('训练计划','','settings','安排训练日期与顺序')}<div class="segmented glass" role="tablist" aria-label="训练日"><button role="tab" data-kind="push" aria-selected="${planKind==='push'}">推日</button><button role="tab" data-kind="pull" aria-selected="${planKind==='pull'}">拉日</button><button role="tab" data-kind="legs" aria-selected="${planKind==='legs'}">蹲日</button></div><div class="section-intro"><p>${kinds[planKind].muscle}</p><small>${list.length} 项动作</small></div><section class="plan-list">${list.length?list.map((e,i)=>`<div class="plan-wrap" data-plan-id="${esc(e.id)}"><div class="delete-reveal" aria-hidden="true">${icon('trash')}删除</div><article class="plan-card"><div class="plan-art"><span class="card-number">${String(i+1).padStart(2,'0')}</span><img src="${imageSrc(e.image)}" alt="${esc(e.name)}动作示意图" loading="lazy" draggable="false"></div><div class="plan-copy"><h3>${esc(e.name)}</h3><p>${esc(summary(e))}<br>${esc(e.restLabel||e.muscle)}</p></div><button class="plan-edit" data-edit="${esc(e.id)}" aria-label="编辑${esc(e.name)}">${icon('edit')}</button></article></div>`).join(''):'<div class="empty">暂无训练动作</div>'}</section><button class="add-button glass" data-action="add">${icon('plus')}添加训练动作</button>`}
  function avatarMarkup(p){return `${p.avatar?`<img src="${imageSrc(p.avatar)}" alt="我的头像">`:esc(p.name.trim().slice(0,1)||'循')}<span class="avatar-camera">${icon('camera')}</span>`}
  function renderProfile(){
    const p=state.profile,bmi=FitnessModel.bmi(+p.height,+p.weight);
    return `<div class="profile-page">
      <header class="page-header"><h1>我的</h1></header>
      <div class="profile-hero glass">
        <button type="button" class="avatar glass" data-action="avatar" aria-label="更换头像">${avatarMarkup(p)}</button>
        <div><h2>${esc(p.name.trim()||'你的名字')}</h2><p>${esc(p.goal)}</p></div>
      </div>
      <input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
      <form id="profile-form">
        <p class="section-label">个人资料</p>
        <div class="form-group glass">
          <div class="form-row"><label for="profile-name">昵称</label><input id="profile-name" name="name" value="${esc(p.name)}" maxlength="20" placeholder="怎么称呼你" autocomplete="nickname"></div>
          <div class="form-row"><label for="profile-height">身高</label><input id="profile-height" name="height" type="number" min="80" max="250" step="0.1" inputmode="decimal" placeholder="填写身高" value="${esc(p.height)}"><span>cm</span></div>
          <div class="form-row"><label for="profile-weight">体重</label><input id="profile-weight" name="weight" type="number" min="20" max="350" step="0.1" inputmode="decimal" placeholder="填写体重" value="${esc(p.weight)}"><span>kg</span></div>
          <div class="bmi-row"><div>BMI</div><strong id="bmi-value">${bmi??'—'}</strong></div>
        </div>
        <p class="section-label">我的健身目标</p>
        <div class="goal-options">${[['减脂','flame'],['增肌','dumbbell'],['保持状态','heart'],['提升体能','target']].map(([name,ic])=>`<label class="goal-option glass"><input type="radio" name="goal" value="${name}" ${p.goal===name?'checked':''}>${icon(ic)}${name}</label>`).join('')}</div>
        <div class="form-group glass"><div class="form-row"><label for="target-weight">目标体重</label><input id="target-weight" name="targetWeight" type="number" min="20" max="350" step="0.1" inputmode="decimal" placeholder="选填" value="${esc(p.targetWeight)}"><span>kg</span></div></div>
        <button class="primary glass" type="submit">保存更新</button>
      </form>
    </div>`;
  }
  function bindProfile(){
    const form=$('#profile-form');
    $('[data-action="avatar"]').addEventListener('click',()=>$('#avatar-file').click());
    $('#avatar-file').addEventListener('change',async event=>{
      const file=event.target.files[0];if(!file)return;
      const previous=state.profile.avatar;
      try{state.profile.avatar=await resizePhoto(file,384);if(save()){const avatarButton=$('[data-action="avatar"]');if(avatarButton)avatarButton.innerHTML=avatarMarkup(state.profile)}else state.profile.avatar=previous}
      catch{state.profile.avatar=previous;toast('图片无法读取，请换一张重试')}
      event.target.value='';
    });
    form.addEventListener('input',()=>{$('#bmi-value').textContent=FitnessModel.bmi(+form.elements.height.value,+form.elements.weight.value)??'—'});
    form.addEventListener('submit',event=>{
      event.preventDefault();const data=new FormData(form),previous=state.profile;
      state.profile={...previous,name:String(data.get('name')).trim(),height:data.get('height'),weight:data.get('weight'),goal:data.get('goal')||'减脂',targetWeight:data.get('targetWeight')};
      if(save()){render();toast('个人资料已更新')}else state.profile=previous;
    });
  }
  function showModal(title,body){$('#modal-content').innerHTML=`<div class="modal-head"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close" aria-label="关闭">${icon('close')}</button></div>${body}`;if(!$('#modal').open)$('#modal').showModal()}
  function settings(){showModal('训练安排',`<form id="settings-form"><label class="field">开始训练日期<input name="startDate" type="date" value="${state.startDate}" required></label><label class="field">训练顺序<select name="order">${[['push','pull','legs'],['push','legs','pull'],['pull','push','legs'],['pull','legs','push'],['legs','push','pull'],['legs','pull','push']].map(order=>`<option value="${order.join(',')}" ${order.join()===state.order.join()?'selected':''}>${order.map(k=>kinds[k].name).join(' → ')}</option>`).join('')}</select></label><label class="field">每轮训练后休息<select name="cycleRest">${[0,1,2,3].map(n=>`<option value="${n}" ${state.cycleRest===n?'selected':''}>${n===0?'不固定休息':`${n} 天`}</option>`).join('')}</select></label><p class="field">每周固定休息</p><div class="weekday-picker">${['一','二','三','四','五','六','日'].map((n,i)=>`<label><input type="checkbox" name="weekday" value="${(i+1)%7}" ${state.restWeekdays.includes((i+1)%7)?'checked':''} aria-label="星期${n}休息">${n}</label>`).join('')}</div><button class="primary" type="submit">保存安排</button></form>`);
    $('#settings-form').addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.target),weekdays=d.getAll('weekday').map(Number);if(weekdays.length===7){toast('至少留一天用于训练');return}state.startDate=d.get('startDate');state.order=d.get('order').split(',');state.cycleRest=+d.get('cycleRest');state.restWeekdays=weekdays;cardIndex=0;if(save()){$('#modal').close();render();toast('训练安排已更新')}})
  }
  function rest(){const day=Schedule.getDay(state,selectedDate);if(day.kind==='before')return;if(day.reason==='manual'){state.restDates=state.restDates.filter(d=>d!==selectedDate);save();cardIndex=0;render();toast('已恢复当天训练');return}if(day.kind==='rest'){toast('今天已经是休息日');return}state.restDates.push(selectedDate);const date=selectedDate;save();cardIndex=0;render();toast('今天休息，训练已顺延',()=>{state.restDates=state.restDates.filter(d=>d!==date);save();render()})}
  function calendar(){const first=calendarMonth+'-01',start=Schedule.parse(first),leading=(start.getDay()+6)%7,count=new Date(start.getFullYear(),start.getMonth()+1,0).getDate();const day=Schedule.getDay(state,selectedDate),kind=kinds[day.kind];showModal('训练日历',`<div class="calendar-head"><button data-action="prev-month" aria-label="上个月">${icon('left')}</button><strong>${start.getFullYear()} 年 ${start.getMonth()+1} 月</strong><button data-action="next-month" aria-label="下个月">${icon('right')}</button></div><div class="calendar-grid">${['一','二','三','四','五','六','日'].map(d=>`<span class="weekday">${d}</span>`).join('')}${'<span></span>'.repeat(leading)}${Array.from({length:count},(_,i)=>{const d=calendarMonth+'-'+String(i+1).padStart(2,'0'),k=Schedule.getDay(state,d).kind;return `<button class="calendar-day ${d===selectedDate?'selected':''} ${d===today()?'is-today':''}" data-date="${d}" aria-label="${d} ${kinds[k]?.name|| (k==='rest'?'休息':'尚未开始')}"><span>${i+1}</span><small>${kinds[k]?.name.slice(0,1)||(k==='rest'?'休':'—')}</small></button>`}).join('')}</div><div class="calendar-detail"><strong>${shortDate(selectedDate)} · ${kind?.name||(day.kind==='rest'?'休息日':'尚未开始')}</strong><p>${kind?`${kind.muscle} · ${state.plans[day.kind].length} 项动作`:''}</p></div><button class="primary" data-action="view-date">查看当天任务</button><button class="danger" style="color:var(--blue)" data-action="back-today">回到今天</button>`)}
  function editor(id){const e=state.plans[planKind].find(x=>x.id===id),isNew=!e;showModal(isNew?'添加训练动作':'编辑训练动作',`<form id="exercise-form"><label class="field">动作名称<input name="name" maxlength="50" required value="${esc(e?.name||'')}" placeholder="例如：哑铃卧推"></label><div class="field-pair"><label class="field">组数<input name="sets" type="number" min="1" max="30" value="${esc(e?.sets||3)}" required></label><label class="field">每组次数 / 时长<input name="reps" maxlength="25" value="${esc(e?.reps||'12')}" required></label></div><label class="field">动作类型<select name="timed"><option value="0" ${!e?.timed?'selected':''}>力量训练 · 按组数与次数</option><option value="1" ${e?.timed?'selected':''}>有氧训练 · 按分钟</option></select></label><label class="field">组间休息 / 强度提示<input name="restLabel" maxlength="50" placeholder="例如：休息 2–3 分钟" value="${esc(e?.restLabel||'休息 2 分钟')}"></label><label class="field">训练部位<input name="muscle" maxlength="50" value="${esc(e?.muscle||'')}" placeholder="例如：胸部"></label><label class="field">动作提示<textarea name="note" maxlength="200" placeholder="记录适合自己的动作要点">${esc(e?.note||'')}</textarea></label><label class="field">训练图片<select name="image">${[...Object.values(DEFAULT_PLANS).flat()].map(item=>`<option value="${item.image}" ${e?.image===item.image?'selected':''}>${esc(item.name)}</option>`).join('')}${e?.image?.startsWith('data:')?'<option value="custom" selected>当前自选图片</option>':''}</select></label><label class="field">或从相册选择图片<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label><button class="primary" type="submit">${isNew?'添加动作':'保存动作'}</button>${!isNew?'<button class="danger" type="button" data-action="delete-edit">删除动作</button>':''}</form>`);
    if(!isNew)$('[data-action="delete-edit"]').onclick=()=>{$('#modal').close();deleteExercise(planKind,id)};
    $('#exercise-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.target,data=new FormData(form),submit=form.querySelector('[type="submit"]');submit.disabled=true;
      try{let image=data.get('image')==='custom'?e.image:data.get('image'),file=form.elements.photo.files[0];if(file)image=await resizePhoto(file);
        const item={...(e||{}),id:e?.id||`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:String(data.get('name')).trim(),sets:+data.get('sets'),reps:String(data.get('reps')).trim().replace(/\s*分钟$/,''),timed:data.get('timed')==='1',restLabel:String(data.get('restLabel')).trim(),muscle:String(data.get('muscle')).trim(),note:String(data.get('note')).trim(),image};
        if(!item.name||!item.reps){toast('请填写动作名称与次数');submit.disabled=false;return}if(item.timed)item.reps+=' 分钟';
        const previous=clone(state.plans[planKind]);if(isNew)state.plans[planKind].push(item);else state.plans[planKind]=state.plans[planKind].map(x=>x.id===id?item:x);
        if(save()){$('#modal').close();render();toast(isNew?'动作已添加':'动作已更新')}else{state.plans[planKind]=previous;submit.disabled=false}
      }catch{toast('图片无法读取，请换一张重试');submit.disabled=false}
    })
  }
  async function resizePhoto(file,maxSide=1000){if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('type');const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,maxSide/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.8)}finally{URL.revokeObjectURL(url)}}
  function deleteExercise(kind,id){const index=state.plans[kind].findIndex(e=>e.id===id);if(index<0)return;const [removed]=state.plans[kind].splice(index,1);if(!save()){state.plans[kind].splice(index,0,removed);return}render();toast('已删除训练动作',()=>{if(state.plans[kind].some(e=>e.id===id))return;state.plans[kind].splice(Math.min(index,state.plans[kind].length),0,removed);save();render()})}
  // One position and velocity per card: a gesture can catch the release spring mid-flight.
  function swipeController(el,{resist=()=>false,onRelease,onClick=()=>{},rotate=false,initial=0}){
    let x=initial,v=0,target=0,frame=0,lastTime=0,drag=null,disposed=false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paint=()=>{el.style.transform=`translateX(${x}px)${rotate?` rotate(${x/45}deg)`:''}`};
    function tick(time){if(disposed)return;const dt=Math.min((time-lastTime)/1000||.016,.032);lastTime=time;const force=(target-x)*390-v*37;v+=force*dt;x+=v*dt;paint();if(Math.abs(target-x)>.3||Math.abs(v)>2)frame=requestAnimationFrame(tick);else{x=target;v=0;paint();frame=0}}
    function settle(to,velocity=0){target=to;v=velocity;if(reduced){x=to;paint();return}cancelAnimationFrame(frame);lastTime=performance.now();frame=requestAnimationFrame(tick)}
    const down=e=>{if(e.button!==0||e.target.closest('button,input,select,textarea'))return;cancelAnimationFrame(frame);drag={pointer:e.pointerId,origin:e.target,start:e.clientX,startY:e.clientY,base:x,last:e.clientX,time:performance.now(),velocity:0,intent:null,moved:false};el.setPointerCapture(e.pointerId)};
    const move=e=>{if(!drag||e.pointerId!==drag.pointer)return;const dx=e.clientX-drag.start,dy=e.clientY-drag.startY,time=performance.now();if(!drag.intent&&Math.max(Math.abs(dx),Math.abs(dy))>8)drag.intent=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';if(drag.intent!=='x')return;drag.moved=true;drag.velocity=(e.clientX-drag.last)/Math.max(time-drag.time,1)*1000;drag.last=e.clientX;drag.time=time;x=drag.base+dx;if(resist(x))x=x*.22;paint()};
    const end=(e,cancelled=false)=>{if(!drag||e.pointerId!==drag.pointer)return;const d=drag;drag=null;if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);const velocity=performance.now()-d.time<100?d.velocity:0;if(!cancelled&&d.intent==='x')onRelease(x,velocity,settle);else{settle(0);if(!cancelled&&!d.moved&&d.intent!=='y')onClick(d.origin)}};
    const up=e=>end(e),cancel=e=>end(e,true);el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',cancel);
    paint();
    return {settle,dispose(){disposed=true;cancelAnimationFrame(frame);el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel)}}
  }
  let deckController=null;
  function bindDeck(initial=0){const el=$('#active-card'),list=state.plans[Schedule.getDay(state,selectedDate).kind];deckController=swipeController(el,{initial,rotate:true,resist:x=>(cardIndex===0&&x>0)||(cardIndex===list.length-1&&x<0),onClick:target=>{if(target?.closest('.task-illustration'))showFullImage(list[cardIndex])},onRelease(x,v,settle){const direction=FitnessModel.swipe(x,v,el.clientWidth,cardIndex,list.length);if(direction){cardIndex+=direction;render();deckController.dispose();bindDeck(matchMedia('(prefers-reduced-motion: reduce)').matches?0:direction*el.clientWidth*.65);deckController.settle(0,v*.15)}else settle(0,v)}});el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.task-illustration')){e.preventDefault();showFullImage(list[cardIndex])}if(e.key==='ArrowLeft'){e.preventDefault();changeCard(1)}if(e.key==='ArrowRight'){e.preventDefault();changeCard(-1)}};gestureCleanup=()=>deckController?.dispose()}
  function changeCard(direction){const kind=Schedule.getDay(state,selectedDate).kind,list=state.plans[kind]||[];const next=cardIndex+direction;if(next<0||next>=list.length)return;cardIndex=next;render()}
  function bindPlanSwipes(){const controllers=[];document.querySelectorAll('.plan-wrap').forEach(wrap=>{const el=wrap.querySelector('.plan-card'),id=wrap.dataset.planId;controllers.push(swipeController(el,{resist:x=>x<0,onRelease(x,v,settle){if(x+v*.14>el.clientWidth*.35)deleteExercise(planKind,id);else settle(0,v)}}))});gestureCleanup=()=>controllers.forEach(c=>c.dispose())}
  function navigate(next){view=next;if(next==='today')selectedDate=today();location.hash=next;render();window.scrollTo({top:0,behavior:'instant'})}
  document.addEventListener('click',event=>{const nav=event.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return}const kind=event.target.closest('[data-kind]');if(kind){planKind=kind.dataset.kind;render();return}const edit=event.target.closest('[data-edit]');if(edit){editor(edit.dataset.edit);return}const date=event.target.closest('[data-date]');if(date){selectedDate=date.dataset.date;cardIndex=0;calendar();return}const button=event.target.closest('[data-action]');if(!button||button.disabled)return;switch(button.dataset.action){case 'calendar':calendarMonth=selectedDate.slice(0,7);calendar();break;case 'settings':settings();break;case 'rest':rest();break;case 'prev-card':changeCard(-1);break;case 'next-card':changeCard(1);break;case 'close':$('#modal').close();break;case 'add':editor();break;case 'undo':{const fn=undoAction;undoAction=null;$('#toast').classList.remove('show');if(fn)fn();break}case 'prev-month':case 'next-month':{const d=Schedule.parse(calendarMonth+'-01');d.setMonth(d.getMonth()+(button.dataset.action==='next-month'?1:-1));calendarMonth=Schedule.key(d).slice(0,7);calendar();break}case 'view-date':view='today';location.hash='today';$('#modal').close();render();break;case 'back-today':selectedDate=today();cardIndex=0;view='today';location.hash='today';$('#modal').close();render();break}});
  $('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#modal').close()}});
  window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(['today','plan','profile'].includes(next)&&next!==view){view=next;render()}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&view==='today'&&selectedDate!==today()){selectedDate=today();cardIndex=0;render()}});
  save(); // Persist the first start date so reopening tomorrow continues the cycle.
  render();
  window.addEventListener('resize',scheduleCardFit,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleCardFit,{passive:true});
  document.fonts.ready.then(scheduleCardFit);
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
})();

