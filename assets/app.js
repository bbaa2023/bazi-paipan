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
    // 四柱只渲染引擎真实返回的干支；属性由引擎公开常量/函数映射，不另造命理结果。
    const engine = window.BaziEngine || {};
    const labels = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']]
      .filter(([key]) => key !== 'time' || !(lastBirth && lastBirth.unknownTime));
    // 神煞只取本地引擎真实扫描结果，按命中地支归入对应四柱卡片。
    const shenshaWhere = {year:'年支',month:'月支',day:'日支',time:'时支'};
    let pillarShenshaHits = [];
    if (typeof engine.shenshaScan === 'function') {
      try {
        const scanPillars = ['year','month','day','time'].map(k => chart.pillars?.[k]?.ganzhi || '');
        const scanned = engine.shenshaScan(scanPillars);
        pillarShenshaHits = Array.isArray(scanned) ? scanned : [];
      } catch (e) { console.warn('四柱卡片神煞扫描失败：', e); }
    }
    const elementIcon = {'木':'🌳','火':'🔥','土':'🟫','金':'⚙️','水':'💧'};
    const elementColorClass = (el) => 'el-' + (['木','火','土','金','水'].includes(el) ? el : '未知');
    const stemAttr = (gan) => {
      const i = Array.isArray(engine.STEMS) ? engine.STEMS.indexOf(gan) : -1;
      if (i < 0) return {element:'—',polarity:'—'};
      return {element:engine.STEM_ELEMENT?.[i] || '—',polarity:engine.STEM_POLARITY?.[i] || '—'};
    };
    const branchAttr = (zhi) => {
      const i = Array.isArray(engine.BRANCHES) ? engine.BRANCHES.indexOf(zhi) : -1;
      if (i < 0) return {element:'—',polarity:'—'};
      return {element:engine.BRANCH_ELEMENT?.[i] || '—',polarity:i % 2 === 0 ? '阳' : '阴'};
    };
    // 阴阳与五行合并显示为“阳木 / 阴火”等直观标签；仅格式化引擎属性，不改变排盘结果。
    const attrTag = (attr, kind) => {
      const polarity = attr.polarity === '阳' ? '阳' : attr.polarity === '阴' ? '阴' : '';
      const element = ['木','火','土','金','水'].includes(attr.element) ? attr.element : '未知';
      const label = polarity && element !== '未知' ? polarity + element : '—';
      const title = kind === '干' ? '天干' : '地支';
      return '<span class="pillar-attr '+elementColorClass(attr.element)+'" aria-label="'+safe(title)+'属性：'+safe(label)+'"><i aria-hidden="true">'+(elementIcon[attr.element] || '◇')+'</i><b><span class="polarity polarity-'+(polarity === '阳' ? 'yang' : polarity === '阴' ? 'yin' : 'unknown')+'">'+safe(polarity || '—')+'</span><span class="attr-element">'+safe(element)+'</span></b></span>';
    };
    pillarsBox.classList.toggle('three-pillars', labels.length === 3);
    pillarsBox.innerHTML = labels.map(([key,label],i) => {
      const p = chart.pillars?.[key] || {};
      const gz = p.ganzhi || '';
      const stem = String(gz).charAt(0);
      const branch = String(gz).charAt(1);
      if (!stem || !branch) return '<article class="pillar"><div class="pillar-label">'+label+'</div><div class="empty">引擎未返回此柱</div></article>';
      const stemInfo = stemAttr(stem), branchInfo = branchAttr(branch);
      const dayClass = key === 'day' ? ' pillar-day-master' : '';
      const palace = ({year:'祖上宫',month:'父母事业宫',day:'自身',time:'子女宫'})[key] || '—';
      let stemGod = p.shiShenGan || (key === 'day' ? '日主' : '');
      if (!stemGod && key !== 'day' && typeof engine.tenGodOf === 'function') {
        try { stemGod = engine.tenGodOf(chart.meta?.dayMaster || chart.pillars?.day?.ganzhi?.charAt(0), stem) || ''; } catch (_) {}
      }
      const tombBadge = ['辰','戌','丑','未'].includes(branch) ? '<span class="tomb-badge">墓库</span>' : '';
      const hidden = Array.isArray(p.hideGan) ? p.hideGan : [];
      const hiddenHtml = hidden.map((gan,idx) => {
        const info = stemAttr(gan);
        let god = '';
        if (typeof engine.tenGodOf === 'function') {
          try { god = engine.tenGodOf(chart.meta?.dayMaster || chart.pillars?.day?.ganzhi?.charAt(0), gan) || ''; } catch (_) {}
        }
        const pos = idx === 0 ? '本气' : idx === 1 ? '中气' : '余气';
        return '<div class="hidden-stem-row '+elementColorClass(info.element)+'"><b class="hidden-stem-gan">'+safe(gan)+'</b><span class="hidden-stem-attr"><span class="polarity polarity-'+(info.polarity === '阳' ? 'yang' : info.polarity === '阴' ? 'yin' : 'unknown')+'">'+safe(info.polarity || '—')+'</span><span class="hidden-stem-element '+elementColorClass(info.element)+'">'+safe(info.element)+'</span></span><em class="hidden-stem-god">'+safe(god || '—')+'</em><small class="hidden-stem-pos">'+pos+'</small></div>';
      }).join('');
      return '<article class="pillar'+dayClass+'" style="animation-delay:'+i*65+'ms">'+
        '<div class="pillar-label">'+label+tombBadge+'</div><div class="pillar-palace">'+palace+'</div>'+
        '<div class="pillar-stem-god">'+safe(stemGod || '—')+'</div>'+
        '<div class="pillar-character '+elementColorClass(stemInfo.element)+'"><strong>'+safe(stem)+'</strong><div class="pillar-attrs">'+attrTag(stemInfo,'干')+'</div></div>'+
        '<div class="pillar-character '+elementColorClass(branchInfo.element)+'"><strong>'+safe(branch)+'</strong><div class="pillar-attrs">'+attrTag(branchInfo,'支')+'</div></div>'+
        '<div class="pillar-hidden"><div class="pillar-hidden-group"><span class="pillar-hidden-title">藏干 · 十神</span><div class="hidden-stem-list">'+(hiddenHtml || '<span class="muted">—</span>')+'</div></div><div class="pillar-nayin"><span>纳音</span><b>'+safe(p.naYin || '—')+'</b></div><div class="pillar-shensha"><span>神煞</span><div class="pillar-shensha-list">'+(pillarShenshaHits.filter(hit=>String(hit.where||'').includes(shenshaWhere[key])).map(hit=>'<em>'+safe(hit.cn||hit.key||'神煞')+'</em>').join('')||'<small>—</small>')+'</div></div></div></article>';
    }).join('');
    const dm = chart.meta?.dayMaster || chart.pillars?.day?.ganzhi?.charAt(0) || '—';
    $('#day-master').textContent = '日主 ' + dm + (chart.meta?.dayElement ? ' · ' + chart.meta.dayElement : '');
  }
  function renderOverview() {
    const data = lastChart?.fiveElements || {};
    const selected = data.withHiddenHalfWeight || data.withHiddenStems || data.stemsBranchesOnly || {};
    const entries = objectEntries(selected);
    if (!entries.length) return '<section class="support-panel support-panel-empty">当前引擎没有返回可识别的五行统计字段。</section>';

    const keys = ['木','火','土','金','水'];
    const values = Object.fromEntries(keys.map(k => [k, Math.max(0, Number(selected[k]) || 0)]));
    const total = keys.reduce((s,k) => s + values[k], 0) || 1;
    const pct = k => (values[k] / total * 100).toFixed(1);

    const rolesOf = me => {
      const sheng=['木','火','土','金','水'], ke=['木','土','水','火','金'];
      const si=sheng.indexOf(me), ki=ke.indexOf(me);
      if(si<0||ki<0) return null;
      return {印:sheng[(si+4)%5],比劫:me,食伤:sheng[(si+1)%5],财:ke[(ki+1)%5],官杀:ke[(ki+4)%5]};
    };

    const dayGan=lastChart.meta?.dayMaster||lastChart.pillars?.day?.ganzhi?.charAt(0)||'—';
    const dayElement=lastChart.meta?.dayElement||elementFor[dayGan]||'—';
    const monthBranch=String(lastChart.pillars?.month?.ganzhi||'').charAt(1)||'';
    const monthElement=monthBranch?(elementFor[monthBranch]||'—'):'—';
    const roles=rolesOf(dayElement);
    const deLing=!!(roles&&(monthElement===roles['印']||monthElement===roles['比劫']));

    // 根气：本气优先；没有本气根但中气/余气同五行，则记为余气根。
    let rootLabel='无根';
    if(dayElement!=='—'){
      let hasResidualRoot=false;
      for(const k of ['year','month','day','time']){
        const p=lastChart.pillars?.[k]; if(!p) continue;
        const hide=Array.isArray(p.hideGan)?p.hideGan:[];
        if(hide.length&&elementFor[hide[0]]===dayElement){rootLabel='有本气根';break;}
        if(hide.slice(1).some(g=>elementFor[g]===dayElement)) hasResidualRoot=true;
      }
      if(rootLabel==='无根'&&hasResidualRoot) rootLabel='有余气根';
    }

    let helpScore=0,drainScore=0,helpList=[],drainList=[];
    if(roles){
      const hs=[roles['印'],roles['比劫']], ds=[roles['食伤'],roles['财'],roles['官杀']];
      keys.forEach(k=>{
        if(hs.includes(k)){helpScore+=values[k];helpList.push(k);}
        if(ds.includes(k)){drainScore+=values[k];drainList.push(k);}
      });
    }
    const helpPct=helpScore/total*100, drainPct=drainScore/total*100;
    const fav=lastFavorable||{}, score=fav.score||{}, fy=fav.fuYang||{};
    const favItems=Array.isArray(fy.favorable)?fy.favorable:[];
    const strength=score.verdict==='strong'?'偏强':score.verdict==='weak'?'偏弱':score.verdict==='balanced'?'中和':'待判断';
    const useEls=favItems.map(x=>x&&x.element||'').filter(Boolean);
    const jiEls=roles?drainList.filter(e=>values[e]===Math.max(...drainList.map(x=>values[x]),0)&&values[e]>0):[];
    const climate=fav.tiaoHou?.ruleCn||'暂无调候结果';

    let verdictNote='旺衰结果暂缺，以下展示五行关系与阵营分布供参考。';
    if(roles){
      const rootTxt=rootLabel==='无根'?'未见同类藏干根气':rootLabel;
      if(strength==='偏弱') verdictNote='月令属'+monthElement+'，'+rootTxt+'；结合引擎旺衰结果，日主偏弱，宜参考扶助方向。';
      else if(strength==='偏强') verdictNote='月令属'+monthElement+'，'+rootTxt+'；结合引擎旺衰结果，日主偏强，宜参考疏泄方向。';
      else if(strength==='中和') verdictNote='月令属'+monthElement+'，'+rootTxt+'；引擎判断日主中和，可结合调候继续观察。';
    }
    const supportClass=helpScore>=drainScore?'is-support':'is-drain';
    const drainClass=drainScore>helpScore?'is-drain':'is-support';
    const elementChips=(arr)=>arr.length?arr.map(e=>'<span class="support-element-chip el-'+e+'">'+safe(e)+'</span>').join(''):'<span class="support-no-data">暂无数据</span>';

    return '<section class="support-panel fy-card">'+
      '<div class="support-anchor"><div><span class="support-eyebrow">DAY MASTER · STRENGTH ANALYSIS</span><strong>日主扶抑分析 <i>'+safe(dayGan)+' · '+safe(dayElement)+'</i></strong></div>'+
      '<div class="support-month"><span>月令</span><b>'+safe(monthBranch||'—')+' · '+safe(monthElement)+'</b><span class="'+(deLing?'is-support':'is-drain')+'">'+(deLing?'得令':'失令')+'</span></div></div>'+
      '<div class="support-balance"><div class="support-camp-head">'+
      '<div class="support-camp support-camp-help"><span class="support-camp-name">帮扶力量</span><strong>'+helpPct.toFixed(1)+'<small>%</small></strong><em>'+safe(helpList.join(' · ')||'—')+'</em><small>生我、同我之五行</small></div>'+
      '<div class="support-camp support-camp-drain"><span class="support-camp-name">克泄耗力量</span><strong>'+drainPct.toFixed(1)+'<small>%</small></strong><em>'+safe(drainList.join(' · ')||'—')+'</em><small>我生、我克、克我之五行</small></div></div>'+
      '<div class="support-balance-track"><div class="support-track-help" style="width:'+helpPct.toFixed(2)+'%"></div><div class="support-track-drain" style="width:'+drainPct.toFixed(2)+'%"></div><i></i></div>'+
      '<div class="support-balance-caption"><span>帮扶 '+helpPct.toFixed(1)+'%</span><span>阵营比例为五行统计值换算，不等同于完整旺衰评分</span><span>克泄耗 '+drainPct.toFixed(1)+'%</span></div></div>'+
      '<div class="support-three-metrics">'+
      '<div class="support-metric"><span class="support-metric-icon">令</span><div><small>得令</small><strong class="'+(deLing?'is-support':'is-drain')+'">'+(deLing?'得令':'失令')+'</strong><em>月支对日主的生扶关系</em></div></div>'+
      '<div class="support-metric"><span class="support-metric-icon">根</span><div><small>得根</small><strong>'+safe(rootLabel)+'</strong><em>检查四支藏干根气</em></div></div>'+
      '<div class="support-metric"><span class="support-metric-icon">势</span><div><small>得势</small><strong class="'+supportClass+'">'+(helpScore>drainScore?'帮扶占优':drainScore>helpScore?'克泄耗占优':'两方接近')+'</strong><em>按五行阵营统计比较</em></div></div></div>'+
      '<div class="support-verdict '+(strength==='偏强'?'support-verdict-strong':strength==='偏弱'?'support-verdict-weak':'support-verdict-balanced')+'"><div><span>引擎旺衰判断</span><strong>'+safe(strength)+'</strong></div><p>'+safe(verdictNote)+'</p></div>'+
      '<div class="support-gods"><div class="support-god-item"><div class="support-god-title"><span>用神参考 · 扶抑</span><small>来自排盘引擎结果</small></div><div class="support-element-list">'+elementChips(useEls)+'</div></div>'+
      '<div class="support-god-item"><div class="support-god-title"><span>克泄耗较显五行</span><small>仅按当前分布排序</small></div><div class="support-element-list">'+elementChips(jiEls)+'</div></div></div>'+
      '<div class="support-climate"><span>调候参考</span><p>'+safe(climate)+'</p></div>'+
      '<div class="support-footnote">说明：五行阵营比例用于辅助理解，不直接代替专业旺衰判断；用神与调候仅在本地引擎返回相应结果时展示。传统命理流派取法存在差异，内容仅供文化研究参考。</div>'+
      '</section>';
  }
  function renderTwelveStages() {
    const pillars = lastChart?.pillars || {};
    const rows = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']]
      .filter(([key]) => key !== 'time' || !(lastBirth && lastBirth.unknownTime));
    return '<h3 class="subhead">十二长生</h3><p class="muted">以各柱天干为参照，按本地排盘引擎计算。</p><div class="twelve-stage-grid">'+rows.map(([key,label])=>{
      const p=pillars[key]||{};
      const gz=String(p.ganzhi||'');
      const stem=gz.charAt(0), branch=gz.charAt(1);
      let stage='—';
      if(stem&&branch&&window.BaziEngine&&typeof window.BaziEngine.twelveStage==='function'){
        try{const result=window.BaziEngine.twelveStage(stem,branch);stage=result?.stage||'—';}catch(_){}
      }
      return '<article class="twelve-stage-card"><span>'+label+'</span><div class="twelve-stage-gz">'+safe(gz||'—')+'</div><strong>'+safe(stage)+'</strong><small>天干坐支</small></article>';
    }).join('')+'</div>';
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
    if (overview) {
      // 每次排盘都彻底清空旧节点，再写入当前版本的五行扶抑分析。
      overview.replaceChildren();
      overview.dataset.renderVersion = '20261101b';
      overview.insertAdjacentHTML('afterbegin', renderOverview());
    }
  }
  function renderTab() {
    document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===activeTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    const renderers={details:renderDetails,relations:renderRelations,shensha:renderShensha,luck:renderLuck,annual:renderAnnual,twelve:renderTwelveStages,overview:renderOverview};
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