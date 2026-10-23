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
  const json = (v) => JSON.stringify(v, null, 2);
  function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
  function hideError() { errorBox.hidden = true; errorBox.textContent = ''; }
  function objectEntries(obj) { return obj && typeof obj === 'object' ? Object.entries(obj) : []; }
  function drawPillars(chart) {
    const labels = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    pillarsBox.innerHTML = labels.map(([key,label],i) => {
      const p = chart.pillars?.[key] || {};
      const gz = p.ganzhi || (key === 'time' && chart.input?.unknownTime ? '未知' : '—');
      const el = elementClass(String(gz).charAt(0));
      return '<article class="pillar '+el+'" style="animation-delay:'+i*65+'ms"><div class="pillar-label">'+label+'</div><div class="pillar-gz">'+safe(gz)+'</div><div class="pillar-meta">天干：'+safe(String(gz).charAt(0) || '—')+'</div><div class="pillar-meta">地支：'+safe(String(gz).charAt(1) || '—')+'</div><div class="pillar-meta">'+safe(p.shiShenGan || '')+'</div><div class="pillar-meta">'+safe(p.naYin || '')+'</div></article>';
    }).join('');
    const dm = chart.meta?.dayMaster || chart.pillars?.day?.ganzhi?.charAt(0) || '—';
    $('#day-master').textContent = '日主 ' + dm + (chart.meta?.dayElement ? ' · ' + chart.meta.dayElement : '');
  }
  function renderOverview() {
    const data = lastChart.fiveElements || {};
    const selected = data.withHiddenHalfWeight || data.withHiddenStems || data.stemsBranchesOnly || {};
    const entries = objectEntries(selected);
    if (!entries.length) return '<div class="empty">当前引擎版本没有返回可识别的五行统计字段。请在“计算详情”查看原始结果。</div>';
    const max = Math.max(1,...entries.map(([,v])=>Number(v)||0));
    const keys=['木','火','土','金','水'];
    const labels={stemsBranchesOnly:'天干与地支主气',withHiddenHalfWeight:'藏干半权重',withHiddenFull:'藏干全权重'};
    const compare=Object.keys(labels).filter(k=>data[k]).map(k=>{
      const values=data[k]||{}, peak=Math.max(1,...keys.map(el=>Number(values[el])||0));
      return '<div class="data-card"><h3>'+labels[k]+'</h3><div class="mini-elements">'+keys.map(el=>'<div class="mini-element '+elementClass(el)+'"><span>'+el+'</span><b>'+safe(values[el]??0)+'</b><div class="bar"><span style="--pct:'+Math.max(0,Math.min(100,(Number(values[el])||0)/peak*100))+'%"></span></div></div>').join('')+'</div></div>';
    }).join('');
    return '<h3 class="subhead">五行力量分布</h3><p class="muted">默认口径：藏干半权重（天干与地支主气各计 1，藏干各计 0.5）。下方用图形对照引擎返回的三种统计口径；不同口径不可直接混为一谈。</p><div class="element-grid">'+entries.map(([name,value])=>'<div class="element-card '+elementClass(name)+'"><div class="element-name">'+safe(name)+'</div><div class="element-count">'+safe(value)+'</div><div class="bar"><span style="--pct:'+Math.max(0,Math.min(100,(Number(value)||0)/max*100))+'%"></span></div></div>').join('')+'</div><h3 class="subhead" style="margin-top:22px">统计口径对照</h3><div class="data-grid">'+compare+'</div>';
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
    const meta = lastChart.meta || {};
    const known = Object.fromEntries(Object.entries(meta).filter(([k])=>/trueSolarTime|sectLabel|engine|version|dstApplied|absoluteInstant/i.test(k)));
    const labels = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    const pillars = labels.map(([key,label]) => {
      const p = lastChart.pillars && lastChart.pillars[key];
      return p && p.ganzhi ? {label:label,gz:p.ganzhi} : null;
    }).filter(Boolean);
    const cards = [];
    for (let i=0;i<pillars.length;i++) {
      for (let j=i+1;j<pillars.length;j++) {
        const a=pillars[i], b=pillars[j];
        let sr=[], br=[];
        try { if(window.BaziEngine && typeof window.BaziEngine.stemRelation==='function') sr=window.BaziEngine.stemRelation(a.gz[0],b.gz[0])||[]; } catch (_) {}
        try { if(window.BaziEngine && typeof window.BaziEngine.branchRelations==='function') br=window.BaziEngine.branchRelations(a.gz[1],b.gz[1])||[]; } catch (_) {}
        const items=sr.map(x=>'天干 '+x.type+(x.element?' · '+x.element:'')).concat(br.map(x=>'地支 '+x.type+(x.kind?' · '+x.kind:'')+(x.element?' · '+x.element:'')));
        if(items.length) cards.push('<div class="data-card"><h3>'+a.label+' '+safe(a.gz)+' ↔ '+b.label+' '+safe(b.gz)+'</h3>'+items.map(x=>'<p>'+safe(x)+'</p>').join('')+'</div>');
      }
    }
    const presentBranches=pillars.map(p=>p.gz[1]);
    const groups=[];
    [['三合',window.BaziEngine&&window.BaziEngine.BRANCH_TRINE],['三会',window.BaziEngine&&window.BaziEngine.BRANCH_MEETING]].forEach(([name,defs])=>{
      if(!Array.isArray(defs)) return;
      defs.forEach(g=>{
        const members=Array.isArray(g.branches)?g.branches:[];
        if(members.length===3&&members.every(b=>presentBranches.indexOf(b)>=0)) groups.push('<div class="data-card"><h3>'+safe(name)+' · '+safe(g.element||'')+'</h3><p>组合：'+safe(members.join('、'))+'</p><p class="muted">三支齐全；这里只标记组合结构，不自动推断合化或吉凶。</p></div>');
      });
    });
    const relationHtml=(cards.length?cards.join(''):'<div class="empty">当前四柱之间没有命中已定义的两两关系。</div>')+(groups.length?'<h3 class="subhead" style="grid-column:1/-1;margin-top:10px">完整多支组合</h3>'+groups.join(''):'');
    return '<h3 class="subhead">干支关系</h3><p class="muted">逐对调用本地引擎公开函数，展示天干五合/相冲与地支六合/六冲/六害/相刑/自刑/半三合；同时识别四柱中三支齐全的三合、三会组合。这里只枚举规则，不直接判定吉凶。</p><div class="data-grid">'+relationHtml+'</div><h3 class="subhead" style="margin-top:22px">排盘口径与计算信息</h3><div class="data-grid"><div class="data-card"><h3>排盘输入</h3><pre class="raw">'+safe(json(lastChart.input||lastBirth))+'</pre></div><div class="data-card"><h3>引擎计算说明</h3><pre class="raw">'+safe(json(known))+'</pre></div></div>';
  }
  function renderShensha() {
    const engine=window.BaziEngine||{};
    const yearGz=lastChart.pillars&&lastChart.pillars.year&&lastChart.pillars.year.ganzhi||'';
    const branches=engine.BRANCHES||[];
    const yearBranch=yearGz.charAt(1);
    const yearIndex=branches.indexOf(yearBranch);
    if(yearIndex<0) return '<div class="empty">命盘年支不可用，暂时无法计算年支起神煞。</div>';
    const stars=[
      ['红鸾','shenshaHongLuan','感情类传统神煞之一'],
      ['天喜','shenshaTianXi','喜庆类传统神煞之一'],
      ['孤辰','shenshaGuChen','传统神煞之一'],
      ['寡宿','shenshaGuaSu','传统神煞之一']
    ];
    const pillars=[['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    const cards=stars.map(([name,fn,desc])=>{
      if(typeof engine[fn]!=='function') return '<div class="data-card"><h3>'+name+'</h3><p>当前本地引擎未公开此函数。</p></div>';
      let target=-1;
      try { target=engine[fn](yearIndex); } catch (_) {}
      const branch=branches[target]||'';
      const matches=pillars.filter(([key])=>{
        const p=lastChart.pillars&&lastChart.pillars[key];
        return branch&&p&&p.ganzhi&&p.ganzhi.charAt(1)===branch;
      }).map(([,label])=>label);
      return '<div class="data-card"><h3>'+name+'</h3><p>'+safe(desc)+'</p><p>起法：年支 '+safe(yearBranch)+'</p><p>对应地支：<span class="chip">'+safe(branch||'—')+'</span></p><p>命盘落点：'+safe(matches.length?matches.join('、'):'四柱未见对应地支')+'</p></div>';
    }).join('');
    return '<h3 class="subhead">神煞（第一批）</h3><p class="muted">先接入当前引擎明确公开的年支起法：红鸾、天喜、孤辰、寡宿。神煞存在不同流派与取法，本页只说明起法与落点，不据此直接作吉凶结论；其他神煞将在核实接口后逐项增加。</p><div class="data-grid">'+cards+'</div>';
  }
  function renderLuck() {
    if (lastBirth.gender === null || lastBirth.gender === undefined) return '<div class="empty">请在上方选择性别并重新排盘，才能计算大运。</div>';
    if (!lastLuck) return '<div class="empty">当前引擎没有成功返回大运结果，请查看“计算详情”。</div>';
    const s=lastLuck.start||{}, chosen=s.chosen||{}, pre=lastLuck.preLuck||{};
    const direction=lastLuck.direction&&typeof lastLuck.direction==='object'?(lastLuck.direction.forward?'顺排':'逆排'):(lastLuck.direction||'—');
    const items=Array.isArray(lastLuck.pillars)?lastLuck.pillars:[];
    const cards=items.map(p=>'<div class="data-card"><h3>第'+safe(p.index)+'步 · '+safe(p.ganzhi||'—')+(p.isCurrent?'（当前）':'')+'</h3><p>'+safe(p.yearLabel||'年份未知')+'</p><p>虚岁：'+safe(p.startAgeSui??'—')+'–'+safe(p.endAgeSui??'—')+'</p><p>天干十神：'+safe(p.stemTenGod&&p.stemTenGod.god||'—')+'</p><p>地支十神：'+safe(p.branchTenGod&&p.branchTenGod.god||'—')+'</p><p>藏干：'+safe(Array.isArray(p.hideGan)?p.hideGan.join('、'):'—')+'</p><p>十二长生：'+safe(p.stage||'—')+'</p></div>').join('');
    return '<h3 class="subhead">起运信息</h3><div class="data-grid"><div class="data-card"><p>大运方向：'+safe(direction)+'</p><p>起运日期：'+safe(s.startDateTime||s.startDate||'—')+'</p><p>起运年龄：'+safe(chosen.years??'—')+'年 '+safe(chosen.months??0)+'个月 '+safe(chosen.days??0)+'天</p><p>起运前：'+safe(pre.startYear||'—')+' 至 '+safe(pre.endYear||'—')+' 年</p><p class="muted">以上字段来自本地排盘引擎；不同起运口径可能产生差异。</p></div></div><h3 class="subhead" style="margin-top:20px">十年大运时间轴</h3><div class="data-grid">'+(cards||'<div class="empty">引擎没有返回大运序列。</div>')+'</div>';
  }
  function renderRaw() { return '<h3 class="subhead">引擎原始结果</h3><p class="muted">用于核对实际字段，后续功能以此结构为准。</p><pre class="raw">'+safe(json({chart:lastChart,luck:lastLuck}))+'</pre>'; }
  function renderTab() {
    document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===activeTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    const renderers={overview:renderOverview,details:renderDetails,relations:renderRelations,shensha:renderShensha,luck:renderLuck,raw:renderRaw};
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
    const longitudeRaw=fd.get('longitude'),genderRaw=fd.get('gender');
    const birth={year,month,day,hour,minute,longitude:longitudeRaw===''?null:Number(longitudeRaw),unknownTime:hour===null,sect:Number(fd.get('sect'))};
    if (![year,month,day,minute].every(Number.isFinite) || year<1900 || year>2100 || month<1 || month>12 || day<1 || day>31 || minute<0 || minute>59 || (birth.longitude!==null && (!Number.isFinite(birth.longitude)||birth.longitude < -180||birth.longitude>180))) {
      showError('请检查出生日期、时间和经度填写是否正确。'); return;
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