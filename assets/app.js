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
    return '<h3 class="subhead">五行力量分布</h3><p class="muted">以下数值直接来自排盘引擎；不同统计口径可能产生不同结果。</p><div class="element-grid">'+entries.map(([name,value])=>'<div class="element-card '+elementClass(name)+'"><div class="element-name">'+safe(name)+'</div><div class="element-count">'+safe(value)+'</div><div class="bar"><span style="--pct:'+Math.max(0,Math.min(100,(Number(value)||0)/max*100))+'%"></span></div></div>').join('')+'</div><div class="data-grid" style="margin-top:14px">'+objectEntries(data).map(([k,v])=>'<div class="data-card"><h3>'+safe(k)+'</h3><pre class="raw">'+safe(json(v))+'</pre></div>').join('')+'</div>';
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
      return '<div class="data-card"><h3>'+label+' · '+safe(p.ganzhi||'—')+'</h3><p>天干十神：'+safe(p.shiShenGan||'—')+'</p><p>藏干：'+(Array.isArray(p.hideGan)?p.hideGan.map(x=>'<span class="chip '+elementClass(x)+'">'+safe(x)+'</span>').join(''):'—')+'</p><p>纳音：'+safe(p.naYin||'—')+'</p><p>十二长生：<span class="chip '+elementClass(dayGan||'')+'">'+safe(stage)+'</span></p></div>';
    }).join('');
    return '<h3 class="subhead">藏干、十神与十二长生</h3><p class="muted">十二长生以日干为参照，按本地引擎公开函数计算。</p><div class="data-grid">'+cards+'</div><p class="muted">仅展示引擎实际返回或通过引擎公开函数计算的数据；未支持的项目不会用固定文案伪造。</p>';
  }
  function renderRelations() {
    const meta = lastChart.meta || {};
    const known = Object.fromEntries(Object.entries(meta).filter(([k])=>/trueSolarTime|sectLabel|engine|version|dstApplied|absoluteInstant/i.test(k)));
    return '<h3 class="subhead">排盘口径与干支信息</h3><div class="data-grid"><div class="data-card"><h3>排盘输入</h3><pre class="raw">'+safe(json(lastChart.input||lastBirth))+'</pre></div><div class="data-card"><h3>引擎计算说明</h3><pre class="raw">'+safe(json(known))+'</pre></div></div><div class="empty" style="margin-top:12px">地支合冲刑害、十二长生和神煞的完整可视化将在确认本地引擎返回结构后逐项接入。本版本不自行猜算这些数据。</div>';
  }
  function renderLuck() {
    if (lastBirth.gender === null || lastBirth.gender === undefined) return '<div class="empty">请在上方选择性别并重新排盘，才能尝试计算大运。</div>';
    if (!lastLuck) return '<div class="empty">当前引擎没有成功返回大运结果。请查看“计算详情”并确认引擎版本的 API。</div>';
    const pillars = Array.isArray(lastLuck.pillars) ? lastLuck.pillars : [];
    return '<h3 class="subhead">大运信息</h3><div class="data-grid"><div class="data-card"><h3>起运与方向</h3><p>方向：'+safe(lastLuck.direction||'—')+'</p><p>起运：'+safe(json(lastLuck.start||'—'))+'</p><p>起运前：'+safe(json(lastLuck.preLuck||'—'))+'</p><p class="muted">详细口径：'+safe(lastLuck.frame||'以引擎返回为准')+'</p></div><div class="data-card"><h3>大运序列</h3>'+ (pillars.length ? pillars.map((p,i)=>'<span class="chip">'+safe(p.ganzhi||p.name||json(p))+'</span>').join('') : '<pre class="raw">'+safe(json(lastLuck))+'</pre>')+'</div></div>';
  }
  function renderRaw() { return '<h3 class="subhead">引擎原始结果</h3><p class="muted">用于核对实际字段，后续功能以此结构为准。</p><pre class="raw">'+safe(json({chart:lastChart,luck:lastLuck}))+'</pre>'; }
  function renderTab() {
    document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===activeTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    const renderers={overview:renderOverview,details:renderDetails,relations:renderRelations,luck:renderLuck,raw:renderRaw};
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