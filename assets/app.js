(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const form = $('#birth-form');
  const errorBox = $('#error');
  const results = $('#results');
  const pillarsBox = $('#pillars');
  const content = $('#tab-content');
  let lastBirth = null, lastChart = null, lastLuck = null, lastFavorable = null, activeTab = 'overview';
  const elementFor = {'甲':'木','乙':'木','寅':'木','卯':'木','丙':'火','丁':'火','巳':'火','午':'火','戊':'土','己':'土','辰':'土','戌':'土','丑':'土','未':'土','庚':'金','辛':'金','申':'金','酉':'金','壬':'水','癸':'水','子':'水','亥':'水'};
  const elementClass = (text) => 'el-' + (elementFor[text] || '土');
  const safe = (s) => String(s ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
  function hideError() { errorBox.hidden = true; errorBox.textContent = ''; }
  function objectEntries(obj) { return obj && typeof obj === 'object' ? Object.entries(obj) : []; }
  function drawPillars(chart) {
    // [规范 2/6] 未知时辰时不渲染虚构时柱；日柱使用独立高亮类。
    const labels = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']]
      .filter(([key]) => key !== 'time' || !(lastBirth && lastBirth.unknownTime));
    pillarsBox.classList.toggle('three-pillars', labels.length === 3);
    pillarsBox.innerHTML = labels.map(([key,label],i) => {
      const p = chart.pillars?.[key] || {};
      const gz = p.ganzhi || '—';
      const stem = String(gz).charAt(0) || '—';
      const branch = String(gz).charAt(1) || '—';
      const el = elementClass(stem);
      const dayClass = key === 'day' ? ' pillar-day-master' : '';
      const palace = ({year:'祖上宫',month:'父母事业宫',day:'自身',time:'子女宫'})[key] || '—';
      let stage='—';
      if(stem!=='—'&&branch!=='—'&&window.BaziEngine&&typeof window.BaziEngine.twelveStage==='function'){
        try{const stageResult=window.BaziEngine.twelveStage(stem,branch);stage=stageResult?.stage||'—';}catch(_){}
      }
      const tombBadge = ['辰','戌','丑','未'].includes(branch) ? '<span class="tomb-badge">墓库</span>' : '';
      return '<article class="pillar '+el+dayClass+'" style="animation-delay:'+i*65+'ms"><div class="pillar-label">'+label+tombBadge+'</div><div class="pillar-palace">'+palace+'</div><div class="pillar-god">'+safe(p.shiShenGan || (key==='day'?'日主':'—'))+'</div><div class="pillar-character '+elementClass(stem)+'"><small>天干</small><strong>'+safe(stem)+'</strong></div><div class="pillar-character '+elementClass(branch)+'"><small>地支</small><strong>'+safe(branch)+'</strong><em class="pillar-stage">'+safe(stage)+'</em></div><div class="pillar-hidden"><span>纳音</span><b>'+safe(p.naYin || '—')+'</b></div></article>';
    }).join('');
    const dm = chart.meta?.dayMaster || chart.pillars?.day?.ganzhi?.charAt(0) || '—';
    $('#day-master').textContent = '日主 ' + dm + (chart.meta?.dayElement ? ' · ' + chart.meta.dayElement : '');
  }
  function renderFavorableCard() {
    const data = lastFavorable || {};
    const score = data.score || {};
    const fuYang = data.fuYang || {};
    const favorable = Array.isArray(fuYang.favorable) ? fuYang.favorable : [];
    const elements = score.perElement && typeof score.perElement === 'object' ? score.perElement : null;
    const strength = score.verdict === 'strong' ? '偏强' : score.verdict === 'weak' ? '偏弱' : score.verdict === 'balanced' ? '中和' : '—';
    const strengthText = score.verdictCn || strength;
    const strengthValue = score.verdict ? strength : '—';
    const elementText = elements ? ['木','火','土','金','水'].map(k=>k+' '+(elements[k] ?? '—')).join('　·　') : '—';
    const favorableText = favorable.length ? favorable.map(x=>x&&x.element||'—').join('、') : (fuYang.favorable ? '—' : '—');
    const climate = data.tiaoHou && data.tiaoHou.ruleCn ? data.tiaoHou.ruleCn : '—';
    return '<section class="favorable-card" aria-label="喜用参考"><div class="favorable-heading"><span class="favorable-seal">参</span><div><h3>喜用参考</h3><p>传统规则参考 · 本地引擎计算</p></div></div><div class="favorable-grid"><div class="favorable-item"><span>日主旺衰</span><strong>'+safe(strengthValue)+'</strong></div><div class="favorable-item favorable-wide"><span>五行力量对比</span><p>'+safe(elementText)+'</p></div><div class="favorable-item favorable-wide"><span>扶抑用神参考</span><strong>'+safe(favorableText)+'</strong></div><div class="favorable-item favorable-wide"><span>调候参考</span><p>'+safe(climate)+'</p></div></div><small class="favorable-footnote">以上为传统流派规则推演，仅供文化参考，不作为人生决策依据</small></section>';
  }
  function renderOverview() {
    const data = lastChart.fiveElements || {};
    const selected = data.withHiddenHalfWeight || data.withHiddenStems || data.stemsBranchesOnly || {};
    const entries = objectEntries(selected);
    if (!entries.length) return '<div class="empty">当前引擎版本没有返回可识别的五行统计字段。</div>';
    const keys=['木','火','土','金','水'];
    const values=Object.fromEntries(keys.map(k=>[k,Math.max(0,Number(selected[k])||0)]));
    const total=keys.reduce((sum,k)=>sum+values[k],0)||1;
    const colors={'木':'#34865d','火':'#d95442','土':'#bd8a31','金':'#8c969e','水':'#367db3'};
    let cursor=0;
    const stops=keys.map(k=>{const end=cursor+values[k]/total*100;const stop=colors[k]+' '+cursor.toFixed(2)+'% '+end.toFixed(2)+'%';cursor=end;return stop;});
    const ranked=keys.slice().sort((a,b)=>values[b]-values[a]);
    const top=ranked[0], second=ranked[1], lower=ranked.slice(-2).filter(k=>values[k]<values[top]);
    const pct=k=>(values[k]/total*100).toFixed(1);
    const ring='<div class="element-visual element-visual-compact"><div class="element-wheel" role="img" aria-label="五行能量比例图" style="background:conic-gradient('+stops.join(',')+')"><div class="element-wheel-center"><small>五行能量</small><strong>'+safe(Number(total.toFixed(1)))+'</strong></div></div><div class="element-legend element-legend-visual">'+keys.map(k=>'<div class="legend-item '+elementClass(k)+'"><div class="legend-label"><i></i><span>'+k+'</span><b>'+safe(pct(k))+'%</b></div><div class="legend-bar"><span style="--pct:'+Math.max(0,Math.min(100,Number(pct(k))))+'%"></span></div><small>'+safe(values[k])+' 点</small></div>').join('')+'</div></div>';
    let firstText='当前五行分布中，'+top+'的占比最高（'+pct(top)+'%），其次是'+second+'（'+pct(second)+'%）。';
    firstText+=lower.length?'相对而言，'+lower.join('、')+'的占比较少。':'其余五行的占比与之接近。';
    const secondText='整体呈现出“'+top+'较显、'+(lower.length?lower.join('与')+'相对收敛':'其余五行相对均衡')+'”的分布特点。传统五行讲究相生相制，也可以结合木生火、火生土、土生金、金生水、水生木的流转关系来理解。';
    return '<h3 class="subhead">五行能量分布</h3>'+ring+'<section class="element-analysis"><div class="element-analysis-title"><span class="analysis-mark">简</span><h3>五行简析</h3></div><p>'+safe(firstText)+'</p><p>'+safe(secondText)+'</p></section>';
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
  function togglePresentationMode() {
    const enabled = document.body.classList.toggle('presentation-mode');
    const button = document.getElementById('presentation-toggle');
    if (button) {
      button.textContent = enabled ? '退出直播展示' : '直播展示模式';
      button.setAttribute('aria-pressed', String(enabled));
    }
  }
    function renderSidePanels() {
    // [直播简洁布局] 五行总览保留在主命盘下方；大运与流年只在下方标签中按需展开。
    const overview = $('#overview-panel');
    if (overview) overview.innerHTML = renderOverview();
  }
  function renderTab() {
    document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===activeTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    const renderers={details:renderDetails,relations:renderRelations,shensha:renderShensha,luck:renderLuck,annual:renderAnnual,overview:renderOverview};
    content.innerHTML=(renderers[activeTab]||renderDetails)();
    if (activeTab === 'overview') content.innerHTML = '<p class="muted">五行总览已固定显示在本命面板中。</p>';
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
      // computeBazi 返回四柱与五行；喜用/旺衰/调候由 v0.6.0 独立接口返回。
      console.log('[BaziEngine.computeBazi] 完整返回结构：', chart);
      lastFavorable = null;
      if (typeof window.BaziEngine.computeFavorableElement === 'function') {
        try {
          lastFavorable = window.BaziEngine.computeFavorableElement(birth);
          console.log('[BaziEngine.computeFavorableElement] 完整返回结构：', lastFavorable);
        } catch (favorableError) { console.warn('喜用参考计算暂不可用：', favorableError); }
      }
      lastBirth={...birth,gender:genderRaw===''?null:Number(genderRaw)};
      lastChart=chart; lastLuck=null;
      if (lastBirth.gender!==null && typeof window.BaziEngine.computeLuckPillars==='function') {
        try { lastLuck=window.BaziEngine.computeLuckPillars({...birth,gender:lastBirth.gender,count:10}); } catch (e) { console.warn('大运计算暂不可用：',e); }
      }
      drawPillars(chart);
      const chartFrame=pillarsBox.closest('.chart-frame');
      if(chartFrame){
        let card=document.getElementById('favorable-card');
        if(!card){card=document.createElement('div');card.id='favorable-card';chartFrame.insertAdjacentElement('afterend',card);}
        card.outerHTML=renderFavorableCard().replace('class="favorable-card"','id="favorable-card" class="favorable-card"');
      }
      results.hidden=false; activeTab='details'; renderSidePanels(); renderTab();
      const presentationButton=document.getElementById('presentation-toggle');
      if(presentationButton) presentationButton.hidden=true;
      results.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    } catch (e) {
      console.error(e); showError('排盘失败：'+(e && e.message ? e.message : '未知错误')+'。请检查输入范围，或把浏览器控制台错误发给维护者。');
    }
  }
  const presentationButton=document.getElementById('presentation-toggle');
  if(presentationButton){presentationButton.hidden=true;presentationButton.removeEventListener('click',togglePresentationMode);}
  form.addEventListener('submit',compute);
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;renderTab();}));
  if (!window.BaziEngine) {
    window.addEventListener('load',()=>{if(!window.BaziEngine)showError('本地排盘引擎没有加载。请先确认 vendor/bazi-engine.web.js 已存在。');});
  }
})();