(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const form = $('#birth-form');
  const errorBox = $('#error');
  const results = $('#results');
  const pillarsBox = $('#pillars');
  const content = $('#tab-content');
  let lastBirth = null, lastChart = null, lastLuck = null, activeTab = 'overview';
  const elementFor = {'甲':'木','乙':'木','寅':'木','卯':'木','丙':'火','丁':'火','巳':'火','午':'火','戊':'土','己':'土','辰':'土','戌':'土','丑':'土','未':'土','庚':'金','辛':'金','申':'金','酉':'金','壬':'水','癸':'水','子':'水','亥':'水'};
  const elementClass = (text) => 'el-' + (elementFor[text] || '土');
  const safe = (s) => String(s ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
  function hideError() { errorBox.hidden = true; errorBox.textContent = ''; }
  function objectEntries(obj) { return obj && typeof obj === 'object' ? Object.entries(obj) : []; }
  function drawPillars(chart) {
    const labels = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    pillarsBox.innerHTML = labels.map(([key,label],i) => {
      const p = chart.pillars?.[key] || {};
      const gz = p.ganzhi || (key === 'time' && chart.input?.unknownTime ? '未知' : '—');
      const stem = String(gz).charAt(0) || '—';
      const branch = String(gz).charAt(1) || '—';
      const el = elementClass(stem);
      return '<article class="pillar '+el+'" style="animation-delay:'+i*65+'ms"><div class="pillar-label">'+label+'</div><span class="pillar-icon '+el+'" aria-hidden="true">'+(elementFor[stem]||'土')+'</span><div class="pillar-god">'+safe(p.shiShenGan || (key==='day'?'日主':'—'))+'</div><div class="pillar-character '+elementClass(stem)+'"><small>天干</small><strong>'+safe(stem)+'</strong></div><div class="pillar-character '+elementClass(branch)+'"><small>地支</small><strong>'+safe(branch)+'</strong></div><div class="pillar-hidden"><span>纳音</span><b>'+safe(p.naYin || '—')+'</b></div></article>';
    }).join('');
    const dm = chart.meta?.dayMaster || chart.pillars?.day?.ganzhi?.charAt(0) || '—';
    $('#day-master').textContent = '日主 ' + dm + (chart.meta?.dayElement ? ' · ' + chart.meta.dayElement : '');
  }
  function renderOverview() {
    const data = lastChart.fiveElements || {};
    const selected = data.withHiddenHalfWeight || data.withHiddenStems || data.stemsBranchesOnly || {};
    const entries = objectEntries(selected);
    if (!entries.length) return '<div class="empty">当前引擎版本没有返回可识别的五行统计字段。请重新排盘；如果问题持续，请联系维护者。</div>';
    const max = Math.max(1,...entries.map(([,v])=>Number(v)||0));
    const keys=['木','火','土','金','水'];
    const total=keys.reduce((sum,k)=>sum+(Number(selected[k])||0),0)||1;
    const colors={'木':'var(--wood)','火':'var(--fire)','土':'var(--earth)','金':'var(--metal)','水':'var(--water)'};
    let cursor=0;const stops=keys.map(k=>{const end=cursor+(Number(selected[k])||0)/total*100;const stop=colors[k]+' '+cursor.toFixed(2)+'% '+end.toFixed(2)+'%';cursor=end;return stop;});
    const ring='<div class="element-visual"><div class="element-wheel" role="img" aria-label="五行比例图" style="background:conic-gradient('+stops.join(',')+')"><div class="element-wheel-center"><small>五行总量</small><strong>'+safe(Number(total.toFixed(1)))+'</strong><span>统计参考</span></div></div><div class="element-legend">'+keys.map(k=>'<div class="legend-item '+elementClass(k)+'"><i></i><span>'+k+'</span><b>'+safe(selected[k]??0)+'</b></div>').join('')+'</div></div>';
    const labels={stemsBranchesOnly:'天干与地支主气',withHiddenHalfWeight:'藏干半权重',withHiddenFull:'藏干全权重'};
    const compare=Object.keys(labels).filter(k=>data[k]).map(k=>{
      const values=data[k]||{}, peak=Math.max(1,...keys.map(el=>Number(values[el])||0));
      return '<div class="data-card"><h3>'+labels[k]+'</h3><div class="mini-elements">'+keys.map(el=>'<div class="mini-element '+elementClass(el)+'"><span>'+el+'</span><b>'+safe(values[el]??0)+'</b><div class="bar"><span style="--pct:'+Math.max(0,Math.min(100,(Number(values[el])||0)/peak*100))+'%"></span></div></div>').join('')+'</div></div>';
    }).join('');
    return '<h3 class="subhead">五行力量分布</h3><p class="muted">默认口径：藏干半权重（天干与地支主气各计 1，藏干各计 0.5）。环形图与下方色卡呈现同一组引擎统计值；不同统计口径不可直接混为一谈。</p>'+ring+'<div class="element-grid">'+entries.map(([name,value])=>'<div class="element-card '+elementClass(name)+'"><div class="element-name">'+safe(name)+'</div><div class="element-count">'+safe(value)+'</div><div class="bar"><span style="--pct:'+Math.max(0,Math.min(100,(Number(value)||0)/max*100))+'%"></span></div></div>').join('')+'</div><h3 class="subhead" style="margin-top:22px">统计口径对照</h3><div class="data-grid">'+compare+'</div>';
  }
  function renderDetails() {
    const ps = lastChart.pillars || {};
    const dayGan = lastChart.meta?.dayMaster || ps.day?.ganzhi?.charAt(0);
    const labels = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    const cards = labels.map(([key,label])=>{
      const p=ps[key]||{};
      const branch=String(p.ganzhi||'').charAt(1);
      let stage='—';
      if (branch && dayGan && window.BaziEngine && typeof window.BaziEngine.twelveStage==='function') {
        try { const result=window.BaziEngine.twelveStage(dayGan,branch); stage=result?.stage||'—'; } catch (_) {}
      }
      return '<div class="data-card"><h3>'+label+' · '+safe(p.ganzhi||'—')+'</h3><p>天干十神：'+safe(p.shiShenGan||'—')+'</p><p>藏干：'+(Array.isArray(p.hideGan)?p.hideGan.map(x=>{let god='';try{if(dayGan&&window.BaziEngine&&typeof window.BaziEngine.tenGodOf==='function')god=window.BaziEngine.tenGodOf(dayGan,x)||'';}catch(_){}return '<span class="chip '+elementClass(x)+'">'+safe(x)+(god?' · '+safe(god):'')+'</span>';}).join(''):'—')+'</p><p>纳音：'+safe(p.naYin||'—')+'</p><p>十二长生：<span class="chip '+elementClass(dayGan||'')+'">'+safe(stage)+'</span></p></div>';
    }).join('');
    return '<h3 class="subhead">藏干、十神与十二长生</h3><p class="muted">十二长生以日干为参照，按本地引擎公开函数计算。</p><div class="data-grid">'+cards+'</div><p class="muted">仅展示引擎实际返回或通过引擎公开函数计算的数据；未支持的项目不会用固定文案伪造。</p>';
  }
  function renderRelations() {
    const labels = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    const pillars = labels.map(([key,label]) => { const p=lastChart.pillars&&lastChart.pillars[key]; return p&&p.ganzhi?{label,gz:p.ganzhi}:null; }).filter(Boolean);
    const cards=[];
    for(let i=0;i<pillars.length;i++) for(let j=i+1;j<pillars.length;j++){
      const a=pillars[i],b=pillars[j]; let sr=[],br=[];
      try{if(window.BaziEngine&&typeof window.BaziEngine.stemRelation==='function')sr=window.BaziEngine.stemRelation(a.gz[0],b.gz[0])||[];}catch(_){}
      try{if(window.BaziEngine&&typeof window.BaziEngine.branchRelations==='function')br=window.BaziEngine.branchRelations(a.gz[1],b.gz[1])||[];}catch(_){}
      const items=sr.map(x=>'天干'+x.type+(x.element?' · '+x.element:'')).concat(br.map(x=>'地支'+x.type+(x.kind?' · '+x.kind:'')+(x.element?' · '+x.element:'')));
      if(items.length)cards.push('<div class="data-card"><h3><span class="relation-icon" aria-hidden="true">⟷</span>'+safe(a.label)+' '+safe(a.gz)+'　与　'+safe(b.label)+' '+safe(b.gz)+'</h3>'+items.map(x=>'<p><span class="chip">'+safe(x)+'</span></p>').join('')+'</div>');
    }
    const present=pillars.map(p=>p.gz[1]),groups=[];
    [['三合',window.BaziEngine&&window.BaziEngine.BRANCH_TRINE],['三会',window.BaziEngine&&window.BaziEngine.BRANCH_MEETING]].forEach(([name,defs])=>{
      if(!Array.isArray(defs))return;defs.forEach(g=>{const m=Array.isArray(g.branches)?g.branches:[];if(m.length===3&&m.every(b=>present.includes(b)))groups.push('<div class="data-card"><h3>'+safe(name)+' · '+safe(g.element||'')+'</h3><p>组合：'+safe(m.join('、'))+'</p><p class="muted">仅提示命中传统组合规则，不直接判定吉凶。</p></div>');});
    });
    return '<h3 class="subhead">干支关系</h3><p class="muted">查看四柱之间的合、冲、刑、害及三合、三会等传统关系。不同流派对部分规则的取法可能不同，本页仅展示命中关系，不单独据此断吉凶。</p><div class="data-grid">'+(cards.length?cards.join(''):'<div class="empty">当前四柱之间未命中已收录的两两关系。</div>')+(groups.length?'<h3 class="subhead" style="grid-column:1/-1;margin-top:10px">三支组合</h3>'+groups.join(''):'')+'</div><div class="customer-note"><span class="note-mark">金</span><div><strong>排盘说明</strong><p>命盘依据所填写的出生时间、时区与可选经度计算。若出生时间不确定，或接近节气、换日交界，建议结合可靠历书进一步核对。</p></div></div>';
  }
  function renderShensha() {
    const engine=window.BaziEngine||{};
    if(typeof engine.shenshaScan!=='function') return '<div class="empty">当前本地引擎未公开神煞扫描接口；为避免另写算法，本页暂不推算。</div>';
    const labels=[['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    const gz=labels.map(([key])=>{
      const p=lastChart.pillars&&lastChart.pillars[key];
      return p&&p.ganzhi?p.ganzhi:'';
    });
    let hits=[];
    try { hits=engine.shenshaScan(gz)||[]; } catch(e) { console.warn('神煞扫描失败：',e); }
    if(!Array.isArray(hits)) hits=[];
    const cards=hits.map(hit=>'<div class="data-card shensha-card"><div class="luck-card-top"><h3><span class="relation-icon" aria-hidden="true">✧</span>'+safe(hit.cn||hit.key||'未命名神煞')+'</h3><span class="chip">'+safe(hit.where||'命中位置未返回')+'</span></div><p>起法依据：'+safe(hit.anchor||'固定柱表/引擎规则')+'</p><p class="muted">此处仅记录本地引擎识别到的规则与落点，不单独据此判定吉凶。</p></div>').join('');
    return '<h3 class="subhead">神煞扫描</h3><p class="muted">调用仓库内排盘引擎的 shenshaScan 接口，按引擎内置规则检查四柱。涵盖日干起、年支起、月支起、三合组星、固定柱表、空亡等多类规则。神煞流派存在差异，结果用于传统规则参考，不作为单独的吉凶结论。</p><div class="shensha-summary"><span>四柱已扫描</span><strong>'+gz.filter(Boolean).length+' / 4</strong><span>命中规则</span><strong>'+hits.length+'</strong></div><div class="data-grid">'+(cards||'<div class="empty">当前四柱未命中本地引擎所定义的神煞规则，或引擎返回空结果。</div>')+'</div>';
  }
  function renderLuck() {
    if (lastBirth.gender === null || lastBirth.gender === undefined) return '<div class="empty">请在上方选择性别并重新排盘，才能计算大运。</div>';
    if (!lastLuck) return '<div class="empty">当前引擎没有成功返回大运结果，请重新排盘或稍后再试。</div>';
    const s=lastLuck.start||{}, chosen=s.chosen||{}, pre=lastLuck.preLuck||{};
    const direction=lastLuck.direction&&typeof lastLuck.direction==='object'?(lastLuck.direction.forward?'顺排':'逆排'):(lastLuck.direction||'—');
    const items=Array.isArray(lastLuck.pillars)?lastLuck.pillars:[];
    const cards=items.map(p=>'<div class="luck-item '+(p.isCurrent?'current':'')+'"><div class="data-card"><h3><span class="relation-icon" aria-hidden="true">⌁</span>'+safe(p.ganzhi||'—')+(p.isCurrent?' · 当前':'')+'</h3><p>第'+safe(p.index)+'步 · '+safe(p.yearLabel||'年份未知')+'</p><p>虚岁 '+safe(p.startAgeSui??'—')+'–'+safe(p.endAgeSui??'—')+'</p><p><span class="chip">天干 '+safe(p.stemTenGod&&p.stemTenGod.god||'—')+'</span></p><p><span class="chip">地支 '+safe(p.branchTenGod&&p.branchTenGod.god||'—')+'</span></p><p>藏干：'+safe(Array.isArray(p.hideGan)?p.hideGan.join('、'):'—')+'</p><p>十二长生：'+safe(p.stage||'—')+'</p></div></div>').join('');
    const unknown=lastBirth.unknownTime&&lastLuck.unknownTime;
    let unknownNote='';
    if(unknown){
      const lo=unknown.low&&unknown.low.traditional||{}, hi=unknown.high&&unknown.high.traditional||{};
      const fmt=x=>safe(x.years??'—')+'年 '+safe(x.months??'—')+'个月 '+safe(x.days??'—')+'天';
      unknownNote='<div class="data-card"><h3>未知时辰：起运范围提示</h3><p>上方起运日期与年龄按中午参考时刻计算，不应视为精确结果。</p><p>按当天时辰范围估算：较早端约 '+fmt(lo)+'；较晚端约 '+fmt(hi)+'。</p><p>节气是否跨界：'+(unknown.jieAmbiguous?'当天不同时间可能对应不同节气，年/月柱及起运依据需重点复核。':'当前扫描范围未发现前后节气名称变化，但起运时间仍可能随出生时刻变化。')+'</p><p class="muted">要缩小范围，请补充出生时辰；若出生时刻接近立春或节气交界，建议按准确时刻重新排盘。</p></div>';
    }
    return '<h3 class="subhead">起运信息</h3><div class="data-grid"><div class="data-card"><p>大运方向：'+safe(direction)+'</p><p>起运日期：'+safe(s.startDateTime||s.startDate||'—')+'</p><p>起运年龄：'+safe(chosen.years??'—')+'年 '+safe(chosen.months??0)+'个月 '+safe(chosen.days??0)+'天</p><p>起运前：'+safe(pre.startYear||'—')+' 至 '+safe(pre.endYear||'—')+' 年</p><p class="muted">以上字段来自本地排盘引擎；不同起运口径可能产生差异。</p></div>'+unknownNote+'</div><h3 class="subhead" style="margin-top:20px">十年大运时间轴</h3><div class="luck-timeline">'+(cards||'<div class="empty">引擎没有返回大运序列。</div>')+'</div>';
  }
  function renderAnnual() {
    const engine=window.BaziEngine||{};
    if(typeof engine.yearProfile!=='function'||typeof engine.tenGodOf!=='function') return '<div class="empty">当前本地引擎未公开流年分析所需接口。</div>';
    const dayGan=lastChart.meta&&lastChart.meta.dayMaster||lastChart.pillars&&lastChart.pillars.day&&lastChart.pillars.day.ganzhi&&lastChart.pillars.day.ganzhi.charAt(0);
    if(!dayGan) return '<div class="empty">命盘日主不可用，暂时无法生成流年对照。</div>';
    const natal=[['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']].map(([key,label])=>{
      const p=lastChart.pillars&&lastChart.pillars[key];
      return p&&p.ganzhi?{label,gz:p.ganzhi}:null;
    }).filter(Boolean);
    const startYear=new Date().getFullYear();
    const cards=[];
    for(let y=startYear;y<startYear+6;y++){
      let profile;
      try{profile=engine.yearProfile(y);}catch(_){profile=null;}
      if(!profile) continue;
      let god='—';
      try{god=engine.tenGodOf(dayGan,profile.stem)||'—';}catch(_){}
      const relations=[];
      natal.forEach(p=>{
        let sr=[],br=[];
        try{sr=engine.stemRelation(p.gz[0],profile.stem)||[];}catch(_){}
        try{br=engine.branchRelations(p.gz[1],profile.branch)||[];}catch(_){}
        const all=sr.map(x=>'天干'+x.type).concat(br.map(x=>'地支'+x.type+(x.kind?'（'+x.kind+'）':'')));
        if(all.length) relations.push('<span class="chip">'+safe(p.label)+'：'+safe(all.join('、'))+'</span>');
      });
      const jie=profile.lichun&&profile.lichun.text||'立春日期未返回';
      cards.push('<div class="data-card annual-card"><div class="luck-card-top"><h3>'+safe(profile.year)+' · '+safe(profile.ganzhi)+'</h3><span class="chip">'+safe(profile.zodiacCn||profile.branch)+'</span></div><div class="annual-meta"><span>流年天干十神</span><strong>'+safe(god)+'</strong><span>五行</span><strong>'+safe(profile.stemElement)+' / '+safe(profile.branchElement)+'</strong><span>纳音</span><strong>'+safe(profile.nayin||'—')+'</strong><span>立春交界</span><strong>'+safe(jie)+'</strong></div><p>与本命干支的直接关系：</p><div class="annual-relations">'+(relations.join('')||'<span class="muted">未命中引擎定义的两两关系</span>')+'</div></div>');
    }
    return '<h3 class="subhead">未来六个公历年份的流年干支</h3><p class="muted">使用本地引擎的年柱资料，列出流年干支、流年天干对日主的十神、五行、纳音、立春交界，以及与本命四柱命中的直接干支关系。此页是传统历法与规则对照，不是完整的流年吉凶解读；立春前后换年需要结合具体出生/查询时刻判断。</p><div class="annual-timeline">'+(cards.join('')||'<div class="empty">本地引擎没有返回流年资料。</div>')+'</div>';
  }
  function renderTab() {
    document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===activeTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    const renderers={overview:renderOverview,details:renderDetails,relations:renderRelations,shensha:renderShensha,luck:renderLuck,annual:renderAnnual};
    content.innerHTML=(renderers[activeTab]||renderOverview)();
  }
  function compute(event) {
    event.preventDefault(); hideError();
    if (!window.BaziEngine || typeof window.BaziEngine.computeBazi !== 'function') {
      showError('本地排盘引擎未加载。请确认 vendor/bazi-engine.web.js 已部署在本站，并刷新页面。此页面不会调用第三方 API 作为替代。'); return;
    }
    const fd=new FormData(form);
    const year=Number(fd.get('year')),month=Number(fd.get('month')),day=Number(fd.get('day'));
    const hourRaw=fd.get('hour'),hour=hourRaw===''?null:Number(hourRaw),minute=Number(fd.get('minute'));
    const longitudeRaw=fd.get('longitude'),genderRaw=fd.get('gender'),tzOffsetHours=Number(fd.get('tzOffsetHours'));
    const birth={year,month,day,hour,minute,longitude:longitudeRaw===''?null:Number(longitudeRaw),tzOffsetHours,unknownTime:hour===null,sect:Number(fd.get('sect'))};
    const validDate=Number.isInteger(year)&&Number.isInteger(month)&&Number.isInteger(day)&&(()=>{const d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;})();
    const validHour=hour===null||(Number.isInteger(hour)&&hour>=0&&hour<=23);
    if (![year,month,day,minute].every(Number.isFinite) || year<1900 || year>2100 || month<1 || month>12 || day<1 || day>31 || !validDate || !validHour || minute<0 || minute>59 || !Number.isFinite(tzOffsetHours) || tzOffsetHours < -12 || tzOffsetHours > 14 || Math.abs(tzOffsetHours*4-Math.round(tzOffsetHours*4))>1e-8 || (birth.longitude!==null && (!Number.isFinite(birth.longitude)||birth.longitude < -180||birth.longitude>180))) {
      showError('请检查出生日期是否真实有效（包括闰年与每月天数），并确认时分、UTC 时区偏移和经度范围正确。'); return;
    }
    try {
      const chart=window.BaziEngine.computeBazi(birth);
      if (!chart || !chart.pillars) throw new Error('引擎未返回有效命盘数据。');
      lastBirth={...birth,gender:genderRaw===''?null:Number(genderRaw)};
      lastChart=chart; lastLuck=null;
      if (lastBirth.gender!==null && typeof window.BaziEngine.computeLuckPillars==='function') {
        try { lastLuck=window.BaziEngine.computeLuckPillars({...birth,gender:lastBirth.gender,count:10}); } catch (e) { console.warn('大运计算暂不可用：',e); }
      }
      drawPillars(chart); results.hidden=false; activeTab='overview'; renderTab();
      results.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    } catch (e) {
      console.error(e); showError('排盘失败：'+(e && e.message ? e.message : '未知错误')+'。请检查输入范围，或把浏览器控制台错误发给维护者。');
    }
  }
  form.addEventListener('submit',compute);
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;renderTab();}));
  if (!window.BaziEngine) {
    window.addEventListener('load',()=>{if(!window.BaziEngine)showError('本地排盘引擎没有加载。请先确认 vendor/bazi-engine.web.js 已存在。');});
  }
})();