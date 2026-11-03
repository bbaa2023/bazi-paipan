(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const form = $('#birth-form');
  const errorBox = $('#error');
  const results = $('#results');
  const pillarsBox = $('#pillars');
  const content = $('#tab-content');
  let lastBirth = null, lastChart = null, lastLuck = null, lastFavorable = null, activeTab = 'overview';
  // P2 时间轴选择状态：默认在排盘完成后定位到当前大运与当前流年。
  let selectedLuckIndex = null, selectedAnnualYear = null;
  const elementFor = {'甲':'木','乙':'木','寅':'木','卯':'木','丙':'火','丁':'火','巳':'火','午':'火','戊':'土','己':'土','辰':'土','戌':'土','丑':'土','未':'土','庚':'金','辛':'金','申':'金','酉':'金','壬':'水','癸':'水','子':'水','亥':'水'};
  const elementClass = (text) => 'el-' + (elementFor[text] || '土');
  const safe = (s) => String(s ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function getBeijingNow() {
    try {
      const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
      const values=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
      const result={year:values.year,month:values.month,day:values.day,hour:values.hour,minute:values.minute};
      return Object.values(result).every(Number.isFinite)?result:null;
    } catch (_) { return null; }
  }
  function getCurrentAnnualInfo() {
    const engine=window.BaziEngine||{};
    const now=getBeijingNow();
    if(!now) return {year:null,profile:null,now:null,error:'无法取得北京时间'};
    if(typeof engine.lichunOf!=='function'||typeof engine.yearProfile!=='function') return {year:null,profile:null,now,error:'本地引擎缺少流年接口'};
    try{
      const lichun=engine.lichunOf(now.year);
      if(!lichun) throw new Error('缺少当前年份立春资料');
      const before=now.month<lichun.month||
        (now.month===lichun.month&&now.day<lichun.day)||
        (now.month===lichun.month&&now.day===lichun.day&&now.hour<lichun.hour)||
        (now.month===lichun.month&&now.day===lichun.day&&now.hour===lichun.hour&&now.minute<lichun.minute);
      const year=now.year-(before?1:0);
      if(typeof engine.zodiacIndexFromDateTime==='function'&&Array.isArray(engine.BRANCHES)){
        const bi=engine.zodiacIndexFromDateTime(now.year,now.month,now.day,now.hour,now.minute);
        const expected=typeof engine.yearGanzhi==='function'?engine.yearGanzhi(year).charAt(1):'';
        if(bi==null||!expected||engine.BRANCHES[bi]!==expected) throw new Error('流年接口交叉核对不一致');
      }
      const profile=engine.yearProfile(year);
      if(!profile||!profile.ganzhi) throw new Error('引擎未返回当前流年干支');
      return {year,profile,now,error:''};
    }catch(e){return {year:null,profile:null,now,error:e&&e.message?e.message:'当前流年不可用'};}
  }
  function getSelectedLuckPillar() {
    const items=Array.isArray(lastLuck?.pillars)?lastLuck.pillars:[];
    if(!items.length) return null;
    const found=items.find(p=>Number(p.index)===Number(selectedLuckIndex));
    return found||null;
  }
  function renderTimelineSelectors(options) {
    const engine=window.BaziEngine||{};
    const items=Array.isArray(lastLuck?.pillars)?lastLuck.pillars:[];
    const luckSelect=options.luck?'<label class="timeline-select-label">参与关系的大运<select data-select-luck><option value="">不指定大运</option>'+items.map(p=>'<option value="'+safe(p.index)+'" '+(Number(p.index)===Number(selectedLuckIndex)?'selected':'')+'>第'+safe(p.index)+'步 · '+safe(p.ganzhi)+'（'+safe(p.yearLabel||'年份未知')+'）</option>').join('')+'</select></label>':'';
    const annualYears=Array.isArray(options.annualYears)?options.annualYears:[];
    const annualSelect=options.annual&&annualYears.length?'<label class="timeline-select-label">参与关系的流年<select data-select-annual>'+annualYears.map(y=>{
      let profile=null;try{profile=engine.yearProfile(y);}catch(_){}
      return '<option value="'+safe(y)+'" '+(Number(y)===Number(selectedAnnualYear)?'selected':'')+'>'+safe(y)+' · '+safe(profile?.ganzhi||'干支资料不可用')+'</option>';
    }).join('')+'</select></label>':'';
    return '<div class="timeline-controls">'+luckSelect+annualSelect+'</div>';
  }
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
      return '<article id="pillar-'+key+'" class="pillar'+dayClass+'" style="animation-delay:'+i*65+'ms">'+
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
    if (!entries.length) return '<section class="fy-final fy-final-empty">当前引擎没有返回可识别的五行统计数据。</section>';

    const keys = ['木','火','土','金','水'];
    const values = Object.fromEntries(keys.map(k => [k, Math.max(0, Number(selected[k]) || 0)]));
    const total = keys.reduce((sum,k) => sum + values[k], 0);
    if (!total) return '<section class="fy-final fy-final-empty">当前命盘的五行统计值为零，暂时无法生成扶抑分析。</section>';
    const percent = n => (n / total * 100);
    const pctText = n => percent(n).toFixed(1) + '%';

    // 五行生克环：相生 木火土金水；相克 木土水火金。
    const sheng = ['木','火','土','金','水'];
    const ke = ['木','土','水','火','金'];
    const dayGan = lastChart.meta?.dayMaster || lastChart.pillars?.day?.ganzhi?.charAt(0) || '—';
    const dayElement = lastChart.meta?.dayElement || elementFor[dayGan] || '—';
    const monthBranch = String(lastChart.pillars?.month?.ganzhi || '').charAt(1) || '';
    const monthElement = monthBranch ? (elementFor[monthBranch] || '—') : '—';
    const si = sheng.indexOf(dayElement), ki = ke.indexOf(dayElement);
    const roles = si < 0 || ki < 0 ? null : {
      '印': sheng[(si + 4) % 5],
      '比劫': dayElement,
      '食伤': sheng[(si + 1) % 5],
      '财': ke[(ki + 1) % 5],
      '官杀': ke[(ki + 4) % 5]
    };
    if (!roles) return '<section class="fy-final fy-final-empty">引擎未返回可识别的日主五行，暂时无法建立十神关系。</section>';

    const helpElements = [roles['印'], roles['比劫']];
    const drainElements = [roles['食伤'], roles['财'], roles['官杀']];
    const helpScore = helpElements.reduce((sum,e) => sum + values[e], 0);
    const drainScore = drainElements.reduce((sum,e) => sum + values[e], 0);
    const helpPct = percent(helpScore), drainPct = percent(drainScore);
    const helpNames = helpElements.filter((e,i,arr) => arr.indexOf(e) === i && values[e] > 0);
    const drainNames = drainElements.filter((e,i,arr) => arr.indexOf(e) === i && values[e] > 0);
    const deLing = monthElement === roles['印'] || monthElement === roles['比劫'];

    let rootLabel = '无根';
    let residualRoot = false;
    for (const key of ['year','month','day','time']) {
      const pillar = lastChart.pillars?.[key];
      if (!pillar) continue;
      const hidden = Array.isArray(pillar.hideGan) ? pillar.hideGan : [];
      if (hidden[0] && elementFor[hidden[0]] === dayElement) { rootLabel = '有根'; break; }
      if (hidden.slice(1).some(stem => elementFor[stem] === dayElement)) residualRoot = true;
    }
    if (rootLabel === '无根' && residualRoot) rootLabel = '有余气根';

    const favorable = Array.isArray(lastFavorable?.fuYang?.favorable) ? lastFavorable.fuYang.favorable : [];
    const useElements = [...new Set(favorable.map(item => item?.element).filter(e => keys.includes(e)))];
    const strengthMap = {strong:'偏强',weak:'偏弱',balanced:'中和'};
    const strength = strengthMap[lastFavorable?.score?.verdict] || '待判断';
    const sortedElements = keys.slice().sort((a,b) => values[b] - values[a]);
    const relationOf = element => {
      if (element === roles['印']) return {god:'印',camp:'帮扶',effect:'生身',tone:'help'};
      if (element === roles['比劫']) return {god:'比劫',camp:'帮扶',effect:'助身',tone:'help'};
      if (element === roles['食伤']) return {god:'食伤',camp:'克泄耗',effect:'泄身',tone:'drain'};
      if (element === roles['财']) return {god:'财',camp:'克泄耗',effect:'耗身',tone:'drain'};
      return {god:'官杀',camp:'克泄耗',effect:'克身',tone:'drain'};
    };
    const causeRows = sortedElements.map(element => {
      const relation = relationOf(element);
      const action = relation.god === '印' ? '生我' : relation.god === '比劫' ? '同我' : relation.god === '食伤' ? '我生' : relation.god === '财' ? '我克' : '克我';
      return '<div class="fy-final-row"><span class="fy-final-element el-'+element+'"><b>'+element+'</b><small>'+pctText(values[element])+'</small></span><span class="fy-final-god">'+relation.god+'<small>'+action+'</small></span><span class="fy-final-camp '+relation.tone+'">'+relation.camp+' · '+relation.effect+'</span></div>';
    }).join('');

    const drainRanked = drainNames.slice().sort((a,b) => values[b] - values[a]);
    const tabooElements = drainRanked.length ? drainRanked.filter(e => values[e] === values[drainRanked[0]]) : [];
    const useText = useElements.length ? useElements.join(' · ') : (strength === '偏弱' ? helpNames.join(' · ') : '以引擎用神结果为准');
    const tabooText = tabooElements.length ? tabooElements.join(' · ') : '暂无明显克泄耗五行';
    const useRoleText = useElements.length ? useElements.map(e => relationOf(e).god).join(' · ') : (strength === '偏弱' ? '印 · 比劫（阵营参考）' : '以引擎返回为准');
    const tabooRoleText = tabooElements.length ? tabooElements.map(e => relationOf(e).god).join(' · ') : '当前未见突出项';

    let basis = '引擎暂未给出明确旺衰结论，以下阵营比例仅作五行关系参考。';
    if (strength === '偏弱') basis = (deLing ? '得令' : '失令') + '、' + rootLabel + '；虽有令根，但克泄耗占'+drainPct.toFixed(1)+'%、帮扶占'+helpPct.toFixed(1)+'%，克泄耗一方更重，故综合仍偏弱。';
    else if (strength === '偏强') basis = (deLing ? '得令' : '失令') + '、' + rootLabel + '；'+(deLing ? '得令且有根，帮扶基础较足' : '虽失令，但帮扶力量占'+helpPct.toFixed(1)+'%，整体支持较重')+'，故综合偏强，宜适度疏泄制衡。';
    else if (strength === '中和') basis = (deLing ? '得令' : '失令') + '、' + rootLabel + '；帮扶占'+helpPct.toFixed(1)+'%，克泄耗占'+drainPct.toFixed(1)+'%，整体较为均衡。';

    const leadDrain = drainRanked[0] || '';
    let keyInsight = leadDrain
      ? '关键：'+leadDrain+'占比'+pctText(values[leadDrain])+'，对应'+relationOf(leadDrain).god+'（'+(relationOf(leadDrain).effect)+'），属于克泄耗阵营；该五行数量增加并不等于日主变强。数量 ≠ 强弱。'
      : '关键：当前未统计到明显克泄耗五行；五行数量只表示分布，不直接等同日主旺衰。';
    if (strength === '偏弱' && leadDrain) keyInsight += ' 引擎综合判为身弱，宜优先扶身。';
    const advice = strength === '偏弱'
      ? '①补'+(useElements.length ? useElements.join('、') : '印比')+'（印生身、比劫助身）固本；②结合实际生活节奏沉淀积累；③慎叠加'+(tabooText === '暂无明显克泄耗五行' ? '克泄耗力量' : tabooText+'（'+tabooRoleText+'）')+'。'
      : strength === '偏强'
        ? '①优先参考引擎用神方向疏泄制衡；②减少继续叠加印比帮扶；③结合完整命局与调候灵活取舍。'
        : strength === '中和'
          ? '①维持现有平衡；②结合季节调候作细节调整；③避免只按单一五行数量盲目增减。'
          : '①先观察五行分布与十神关系；②待引擎旺衰结论明确后再定补益方向。';
    const climate = lastFavorable?.tiaoHou?.ruleCn || '暂无调候结果';
    const badge = (label,good) => '<span class="fy-final-badge '+(good?'good':'bad')+'">'+label+(good?' ✓':' ✗')+'</span>';
    const elementList = arr => arr.length ? arr.map(e=>'<b class="fy-final-pill el-'+e+'">'+e+'</b>').join('') : '<span class="fy-final-muted">暂无引擎返回数据</span>';

    return '<section class="fy-final">'+
      '<header class="fy-final-heading"><div><span>五行结构 · 子平扶抑</span><h3>五行能量 · 扶抑法诊断</h3><p>子平扶抑 · 身旺宜抑，身弱宜扶</p></div></header>'+
      '<div class="fy-final-anchor"><div class="fy-final-day"><small>日主</small><strong>'+safe(dayGan)+'</strong><em>'+safe(dayElement)+'</em></div><div class="fy-final-month"><small>月令</small><strong>'+safe(monthBranch||'—')+'</strong><em>'+safe(monthElement)+'</em></div><div class="fy-final-badges">'+badge(deLing?'得令':'失令',deLing)+badge(rootLabel,rootLabel!=='无根')+badge(helpScore>drainScore?'得势':'失势',helpScore>drainScore)+'</div></div>'+
      '<div class="fy-final-verdict"><div class="fy-final-verdict-main"><span>日主旺衰</span><strong>'+safe(strength)+'</strong></div><p>'+safe(basis)+'</p></div>'+
      '<section class="fy-final-section"><div class="fy-final-section-title">力量对比 <small>五行阵营统计值</small></div><div class="fy-final-balance-labels"><strong class="help">帮扶 '+helpPct.toFixed(1)+'%</strong><strong class="drain">克泄耗 '+drainPct.toFixed(1)+'%</strong></div><div class="fy-final-bar"><i class="help" style="width:'+helpPct.toFixed(2)+'%"></i><i class="drain" style="width:'+drainPct.toFixed(2)+'%"></i></div><div class="fy-final-composition"><span class="help">帮扶：'+safe(helpNames.join(' · ')||'无')+'（'+safe([roles['印'],roles['比劫']].filter((e,i,arr)=>arr.indexOf(e)===i).map(e=>relationOf(e).god).join(' · '))+'）</span><span class="drain">克泄耗：'+safe(drainNames.join(' · ')||'无')+'（'+safe(drainNames.map(e=>relationOf(e).god).join(' · ')||'无')+'）</span></div></section>'+
      '<section class="fy-final-section"><div class="fy-final-section-title">五行 → 十神 → 阵营 <small>按五行点数由高到低</small></div><div class="fy-final-cause">'+causeRows+'</div><p class="fy-final-insight">'+safe(keyInsight)+'</p></section>'+
      '<div class="fy-final-gods"><article class="fy-final-god-card use"><span>用神 · 扶身参考</span><strong>'+safe(useText||'待引擎确认')+'</strong><small>'+safe(useRoleText)+' · 宜补益</small></article><article class="fy-final-god-card taboo"><span>忌神参考 · 慎叠加</span><strong>'+safe(tabooText)+'</strong><small>'+safe(tabooRoleText)+' · 宜适度控制</small></article></div>'+
      '<section class="fy-final-advice"><div><strong>行动建议</strong><p>'+safe(advice)+'</p></div><div class="fy-final-advice-meta"><small>调候参考：'+safe(climate)+'</small><footer>以上为传统流派规则推演，仅供文化研究参考，不作为人生决策依据。</footer></div></section>'+
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
    const engine=window.BaziEngine||{};
    const ps=lastChart.pillars||{};
    const dayGan=lastChart.meta?.dayMaster||ps.day?.ganzhi?.charAt(0);
    const labels=[['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    const cards=labels.filter(([key])=>key!=='time'||!lastBirth?.unknownTime).map(([key,label])=>{
      const p=ps[key]||{};
      const branch=String(p.ganzhi||'').charAt(1);
      let stage='—';
      if(branch&&dayGan&&typeof engine.twelveStage==='function'){
        try{const result=engine.twelveStage(dayGan,branch);stage=result?.stage||'—';}catch(_){}
      }
      return '<div class="data-card"><h3>'+label+' · '+safe(p.ganzhi||'—')+'</h3><p>天干十神：'+safe(p.shiShenGan||'—')+'</p><p>藏干：'+(Array.isArray(p.hideGan)?p.hideGan.map(x=>{let god='';try{if(dayGan&&typeof engine.tenGodOf==='function')god=engine.tenGodOf(dayGan,x)||'';}catch(_){}return '<span class="chip '+elementClass(x)+'">'+safe(x)+(god?' · '+safe(god):'')+'</span>';}).join(''):'—')+'</p><p>纳音：'+safe(p.naYin||'—')+'</p><p>十二长生（以日干为参照）：<span class="chip '+elementClass(dayGan||'')+'">'+safe(stage)+'</span></p></div>';
    }).join('');
    const unknownNote=lastBirth?.unknownTime?'<div class="empty">出生时辰未知：本页不生成时柱，也不会把中午参考时刻当作真实时柱。</div>':'';

    let dayCard='';
    const dayGz=ps.day?.ganzhi;
    if(dayGz&&typeof engine.dayPillarProfile==='function'){
      try{
        const d=engine.dayPillarProfile(dayGz);
        if(d){
          const hidden=Array.isArray(d.hidden)?d.hidden.map(x=>'<span class="chip">'+safe(x.gan)+' · '+safe(x.god||'—')+'（'+safe(x.posCn)+'）</span>').join(''):'—';
          dayCard='<div class="data-card"><h3>日柱剖面 · '+safe(d.gz)+'</h3><p>日干坐支：'+safe(d.seatCn||'—')+'</p><p>日柱纳音：'+safe(d.nayin||'—')+' · 配对：'+safe(d.nayinPartner||'—')+'</p><p>日干坐支长生：'+safe(d.stage||'—')+'</p><p>日柱藏干十神：'+(hidden||'—')+'</p><p class="muted">坐支关系是五行生克分类，不直接等同婚姻或吉凶判断。</p></div>';
        }
      }catch(e){console.warn('日柱剖面读取失败：',e);}
    }

    const branchCards=[];
    if(typeof engine.branchProfile==='function'){
      labels.filter(([key])=>key!=='time'||!lastBirth?.unknownTime).forEach(([key,label])=>{
        const p=ps[key];
        const branch=p?.ganzhi?.charAt(1);
        if(!branch)return;
        try{
          const b=engine.branchProfile(branch);
          if(!b)return;
          const hidden=Array.isArray(b.hidden)?b.hidden.map(x=>'<span class="chip">'+safe(x.gan)+'（'+safe(x.posCn)+'）</span>').join(''):'—';
          const rules=[
            b.sixHe?.branch?'六合 '+b.sixHe.branch:'',
            b.clash?.branch?'六冲 '+b.clash.branch:'',
            b.harm?.branch?'六害 '+b.harm.branch:'',
            b.trine?.members?.length?'三合组 '+b.trine.members.join('、'):'',
            b.meeting?.members?.length?'三会组 '+b.meeting.members.join('、'):''
          ].filter(Boolean);
          branchCards.push('<div class="data-card"><h3>'+label+'地支 · '+safe(branch)+'</h3><p>五行 / 阴阳：'+safe(b.element||'—')+' / '+safe(b.polarity||'—')+'</p><p>生肖 / 方位：'+safe(b.animalCn||'—')+' / '+safe(b.dirCn||'—')+'</p><p>时辰范围：'+safe(b.hour?.text||'—')+' · 节令：'+safe(b.jie||'—')+' · '+safe(b.season||'—')+'</p><p>藏干：'+(hidden||'—')+'</p><p>地支规则资料：'+(rules.length?rules.map(x=>'<span class="chip">'+safe(x)+'</span>').join(''):'—')+'</p><p class="muted">以上合冲刑害与三合三会为该地支的规则资料；是否在命盘中实际构成，仍需结合参与地支判断。</p></div>');
        }catch(e){console.warn('地支剖面读取失败：',e);}
      });
    }

    let kongWangCard='';
    if(dayGz&&typeof engine.kongWangOfDayGz==='function'){
      try{
        const kw=engine.kongWangOfDayGz(dayGz);
        if(kw&&Array.isArray(kw.voids)){
          const matched=labels.filter(([key])=>key!=='time'||!lastBirth?.unknownTime).map(([key,label])=>{
            const branch=ps[key]?.ganzhi?.charAt(1);
            return branch&&kw.voids.includes(branch)?label+'（'+branch+'）':null;
          }).filter(Boolean);
          kongWangCard='<div class="data-card"><h3>日柱旬空</h3><p>旬首：'+safe(kw.xunStart||'—')+'</p><p>旬空地支：'+kw.voids.map(safe).join('、')+'</p><p>本命命中：'+(matched.length?matched.map(safe).join('、'):'本命已知柱未见旬空地支')+'</p><p class="muted">旬空以日柱所在旬计算；未知时辰不参与命中判断。</p></div>';
        }
      }catch(e){console.warn('日柱旬空读取失败：',e);}
    }

    return '<h3 class="subhead">藏干、十神与十二长生</h3><p class="muted">十二长生以日干为参照；以下剖面资料来自本地引擎公开接口。</p><div class="data-grid">'+unknownNote+cards+dayCard+branchCards.join('')+kongWangCard+'</div><p class="muted">地支关系资料不代表命盘已构成相应组合；旬空按日柱统一计算。所有资料均在当前浏览器本地生成。</p>';
  }
  function renderRelations() {
    const engine=window.BaziEngine||{};
    const natalLabels=[['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    const participants=natalLabels
      .filter(([key])=>key!=='time'||!(lastBirth&&lastBirth.unknownTime))
      .map(([key,label])=>{
        const p=lastChart.pillars&&lastChart.pillars[key];
        return p&&p.ganzhi?{id:'natal-'+key,layer:'本命',label,gz:p.ganzhi,key}:null;
      }).filter(Boolean);
    const currentLuck=lastLuck&&lastLuck.current&&lastLuck.current.pill;
    const selectedLuck=getSelectedLuckPillar();
    if(selectedLuck&&selectedLuck.ganzhi&&selectedLuck.ganzhi.length>=2){
      participants.push({id:'luck-selected',layer:'所选大运',label:'第'+selectedLuck.index+'步大运',gz:selectedLuck.ganzhi,index:selectedLuck.index});
    }
    const annualInfo=getCurrentAnnualInfo();
    const currentYearError=annualInfo.error;
    const activeAnnualYear=selectedAnnualYear==null?annualInfo.year:selectedAnnualYear;
    let selectedYearProfile=null;
    if(activeAnnualYear!=null){try{selectedYearProfile=engine.yearProfile(activeAnnualYear);}catch(_){}}
    if(selectedYearProfile&&selectedYearProfile.ganzhi){
      participants.push({id:'annual-selected',layer:'所选流年',label:'流年 '+selectedYearProfile.year,gz:selectedYearProfile.ganzhi,year:activeAnnualYear});
    }
    const cards=[];
    for(let i=0;i<participants.length;i++) for(let j=i+1;j<participants.length;j++){
      const a=participants[i],b=participants[j];
      let sr=[],br=[];
      try{if(typeof engine.stemRelation==='function')sr=engine.stemRelation(a.gz[0],b.gz[0])||[];}catch(_){}
      try{if(typeof engine.branchRelations==='function')br=engine.branchRelations(a.gz[1],b.gz[1])||[];}catch(_){}
      const items=sr.map(x=>'天干 '+x.type+(x.element?' · '+x.element:'')).concat(br.map(x=>'地支 '+x.type+(x.kind?' · '+x.kind:'')+(x.element?' · '+x.element:'')));
      if(items.length){
        cards.push('<div class="data-card relation-result"><div class="relation-result-heading"><span class="relation-icon" aria-hidden="true">⟷</span><strong>命中关系</strong></div><div class="relation-participants">'+locateButton(a)+'<span class="relation-connector">与</span>'+locateButton(b)+'</div><div class="relation-result-items">'+items.map(x=>'<span class="chip">'+safe(x)+'</span>').join('')+'</div></div>');
      }
    }
    function locateButton(p){let attrs='';if(p.id.startsWith('natal-'))attrs=' data-locate-kind="natal" data-locate-key="'+safe(p.key)+'"';else if(p.id==='luck-selected')attrs=' data-locate-kind="luck" data-locate-value="'+safe(p.index)+'"';else if(p.id==='annual-selected')attrs=' data-locate-kind="annual" data-locate-value="'+safe(p.year)+'"';return '<button type="button" class="relation-locator"'+attrs+'>'+safe(p.layer)+' · '+safe(p.label)+' '+safe(p.gz)+'<span aria-hidden="true"> ↗</span></button>';}
    const branches=participants.map(p=>({branch:p.gz[1],participant:p}));
    const groupCards=[];
    [['三合',engine.BRANCH_TRINE],['三会',engine.BRANCH_MEETING]].forEach(([name,defs])=>{
      if(!Array.isArray(defs))return;
      defs.forEach(g=>{
        const members=Array.isArray(g.branches)?g.branches:[];
        if(members.length!==3||!members.every(branch=>branches.some(x=>x.branch===branch)))return;
        const sources=members.map(branch=>{
          const found=branches.filter(x=>x.branch===branch);
          return '<div class="relation-group-member"><strong>'+safe(branch)+'</strong>'+found.map(x=>locateButton(x.participant)).join('')+'</div>';
        });
        groupCards.push('<div class="data-card relation-group-card"><h3>'+safe(name)+' · '+safe(g.element||'')+'</h3><p>组合成员：'+safe(members.join('、'))+'</p><div class="relation-group-members">'+sources.join('')+'</div><p class="muted">三个地支均在本命、所选大运或所选流年实际出现；这里只提示组合成员齐备，不判断合化或吉凶。</p></div>');
      });
    });
    const layerStatus=[
      '<span class="chip">本命 '+participants.filter(p=>p.layer==='本命').length+' 柱</span>',
      '<span class="chip">'+(selectedLuck?'已选大运 '+selectedLuck.ganzhi:(currentLuck?'当前大运未选':'当前未起运/无当前大运'))+'</span>',
      '<span class="chip">'+(selectedYearProfile?'已选流年 '+selectedYearProfile.ganzhi:'流年不可用')+'</span>'
    ].join('');
    const selectorYears=annualInfo.year==null?[]:Array.from({length:6},(_,i)=>annualInfo.year+i);
    return '<h3 class="subhead">本命 · 大运 · 流年关系</h3><p class="muted">本命四柱固定不变；通过下方选择器切换参与关系对照的大运与流年。默认定位当前大运和当前流年。未知时辰、未起运或无法确认的对象不会被补造；关系命中不代表合化或吉凶。</p>'+renderTimelineSelectors({luck:true,annual:true,annualYears:selectorYears})+'<div class="data-card"><div class="annual-relations">'+layerStatus+'</div>'+(currentYearError?'<p class="muted">当前流年基准暂不可用：'+safe(currentYearError)+'</p>':'')+'</div><div class="data-grid">'+(cards.length?cards.join(''):'<div class="empty">当前参与对象之间未命中已收录的两两干支关系。</div>')+(groupCards.length?'<h3 class="subhead" style="grid-column:1/-1;margin-top:10px">完整三支组合提示</h3>'+groupCards.join(''):'')+'</div><div class="customer-note"><span class="note-mark">金</span><div><strong>关系说明</strong><p>两两关系按引擎规则逐对检查，并保留双方层级和柱位。三合、三会仅按成员是否齐全提示，不等同于合化成立。不同传统流派对部分规则的取法可能不同，本页不据此单独断吉凶。</p></div></div>';
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
    const selectedLuck=getSelectedLuckPillar();
    const selector=renderTimelineSelectors({luck:true});
    const selectedLuckSummary=selectedLuck?'<div class="data-card selected-time-context"><h3>当前关系对照大运：第'+safe(selectedLuck.index)+'步 · '+safe(selectedLuck.ganzhi)+'</h3><p>时间范围：'+safe(selectedLuck.yearLabel||'年份未返回')+' · 虚岁 '+safe(selectedLuck.startAgeSui??'—')+'–'+safe(selectedLuck.endAgeSui??'—')+'</p><p>天干十神：'+safe(selectedLuck.stemTenGod&&selectedLuck.stemTenGod.god||'—')+'　地支十神：'+safe(selectedLuck.branchTenGod&&selectedLuck.branchTenGod.god||'—')+'</p><p>藏干：'+safe(Array.isArray(selectedLuck.hideGan)?selectedLuck.hideGan.join('、'):'—')+'　十二长生：'+safe(selectedLuck.stage||'—')+'</p><p class="muted">该大运将与本命及所选流年共同参与关系对照。</p></div>':'<div class="data-card selected-time-context"><h3>当前关系对照大运：未指定</h3><p class="muted">选择一部大运后，才会把它加入关系对照；本命和所选流年仍可单独参与。</p></div>';
    const cards=items.map(p=>{const picked=!!selectedLuck&&Number(selectedLuck.index)===Number(p.index);return '<button type="button" class="luck-item timeline-pick '+(p.isCurrent?'current ':'')+(picked?'selected':'')+'" data-pick-luck-index="'+safe(p.index)+'" aria-pressed="'+String(picked)+'" aria-label="选择第'+safe(p.index)+'步大运 '+safe(p.ganzhi||'')+'"><div class="data-card"><h3><span class="relation-icon" aria-hidden="true">⌁</span>'+safe(p.ganzhi||'—')+(p.isCurrent?' · 当前':'')+(picked?' · 关系已选':'')+'</h3><p>第'+safe(p.index)+'步 · '+safe(p.yearLabel||'年份未知')+'</p><p>虚岁 '+safe(p.startAgeSui??'—')+'–'+safe(p.endAgeSui??'—')+'</p><p><span class="chip">天干 '+safe(p.stemTenGod&&p.stemTenGod.god||'—')+'</span></p><p><span class="chip">地支 '+safe(p.branchTenGod&&p.branchTenGod.god||'—')+'</span></p><p>藏干：'+safe(Array.isArray(p.hideGan)?p.hideGan.join('、'):'—')+'</p><p>十二长生：'+safe(p.stage||'—')+'</p></div></button>';}).join('');
    const unknown=lastBirth.unknownTime&&lastLuck.unknownTime;
    let unknownNote='';
    if(unknown){
      const lo=unknown.low&&unknown.low.traditional||{}, hi=unknown.high&&unknown.high.traditional||{};
      const fmt=x=>safe(x.years??'—')+'年 '+safe(x.months??'—')+'个月 '+safe(x.days??'—')+'天';
      unknownNote='<div class="data-card"><h3>未知时辰：起运范围提示</h3><p>上方起运日期与年龄按中午参考时刻计算，不应视为精确结果。</p><p>按当天时辰范围估算：较早端约 '+fmt(lo)+'；较晚端约 '+fmt(hi)+'。</p><p>节气是否跨界：'+(unknown.jieAmbiguous?'当天不同时间可能对应不同节气，年/月柱及起运依据需重点复核。':'当前扫描范围未发现前后节气名称变化，但起运时间仍可能随出生时刻变化。')+'</p><p class="muted">要缩小范围，请补充出生时辰；若出生时刻接近立春或节气交界，建议按准确时刻重新排盘。</p></div>';
    }
    const todayNote=lastLuck.today?'<p class="muted">当前大运判断日期：北京时间 '+safe(lastLuck.today)+'（引擎按日期判断当前大运步，不使用当天具体时分）。</p>':'';
    return '<h3 class="subhead">起运信息</h3><div class="data-grid"><div class="data-card"><p>大运方向：'+safe(direction)+'</p><p>起运日期：'+safe(s.startDateTime||s.startDate||'—')+'</p><p>起运年龄：'+safe(chosen.years??'—')+'年 '+safe(chosen.months??0)+'个月 '+safe(chosen.days??0)+'天</p><p>起运前：'+safe(pre.startYear||'—')+' 至 '+safe(pre.endYear||'—')+' 年</p><p class="muted">以上字段来自本地排盘引擎；不同起运口径可能产生差异。</p></div>'+unknownNote+'</div>'+todayNote+selector+selectedLuckSummary+'<h3 class="subhead" style="margin-top:20px">十年大运时间轴</h3><div class="luck-timeline">'+(cards||'<div class="empty">引擎没有返回大运序列。</div>')+'</div>';
  }
  function renderAnnual() {
    const engine=window.BaziEngine||{};
    if(typeof engine.yearProfile!=='function'||typeof engine.tenGodOf!=='function'||typeof engine.lichunOf!=='function') return '<div class="empty">当前本地引擎未公开流年分析所需接口。</div>';
    const dayGan=lastChart.meta&&lastChart.meta.dayMaster||lastChart.pillars&&lastChart.pillars.day&&lastChart.pillars.day.ganzhi&&lastChart.pillars.day.ganzhi.charAt(0);
    if(!dayGan) return '<div class="empty">命盘日主不可用，暂时无法生成流年对照。</div>';
    const annualInfo=getCurrentAnnualInfo();
    const beijingNow=annualInfo.now;
    const currentYear=annualInfo.year;
    if(!beijingNow||currentYear==null) return '<div class="empty">'+safe(annualInfo.error||'当前流年不可用')+'，已暂停展示，避免给出错误年份。</div>';
    let activeYear=selectedAnnualYear==null?currentYear:selectedAnnualYear;
    if(!Number.isInteger(Number(activeYear))||Number(activeYear)<currentYear||Number(activeYear)>=currentYear+6){selectedAnnualYear=currentYear;activeYear=currentYear;}
    let selectedProfile=null;try{selectedProfile=engine.yearProfile(activeYear);}catch(_){}
    if(!selectedProfile||!selectedProfile.ganzhi) selectedProfile=null;
    const natal=[['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']]
      .filter(([key])=>key!=='time'||!(lastBirth&&lastBirth.unknownTime))
      .map(([key,label])=>{const p=lastChart.pillars&&lastChart.pillars[key];return p&&p.ganzhi?{label,gz:p.ganzhi}:null;}).filter(Boolean);
    const cards=[];
    for(let y=currentYear;y<currentYear+6;y++){
      let profile;try{profile=engine.yearProfile(y);}catch(_){profile=null;}
      if(!profile) continue;
      let god='—';try{god=engine.tenGodOf(dayGan,profile.stem)||'—';}catch(_){}
      const relations=[];
      natal.forEach(p=>{
        let sr=[],br=[];try{sr=engine.stemRelation(p.gz[0],profile.stem)||[];}catch(_){}
        try{br=engine.branchRelations(p.gz[1],profile.branch)||[];}catch(_){}
        const all=sr.map(x=>'天干'+x.type).concat(br.map(x=>'地支'+x.type+(x.kind?'（'+x.kind+'）':'')));
        if(all.length) relations.push('<span class="chip">'+safe(p.label)+'：'+safe(all.join('、'))+'</span>');
      });
      const jie=profile.lichun&&profile.lichun.text||'立春日期未返回';
      const currentMark=y===currentYear?'<span class="chip">当前流年</span>':'';
      const selectedMark=y===Number(selectedAnnualYear==null?currentYear:selectedAnnualYear)?'<span class="chip">关系已选</span>':'';
      const isPicked=y===Number(selectedAnnualYear==null?currentYear:selectedAnnualYear);cards.push('<button type="button" class="data-card annual-card timeline-pick '+(isPicked?'annual-selected':'')+'" data-pick-annual-year="'+safe(y)+'" aria-pressed="'+String(isPicked)+'" aria-label="选择流年 '+safe(profile.year)+' '+safe(profile.ganzhi)+'"><div class="luck-card-top"><h3>'+safe(profile.year)+' · '+safe(profile.ganzhi)+'</h3><span class="chip">'+safe(profile.zodiacCn||profile.branch)+'</span>'+currentMark+selectedMark+'</div><div class="annual-meta"><span>流年天干十神</span><strong>'+safe(god)+'</strong><span>五行</span><strong>'+safe(profile.stemElement)+' / '+safe(profile.branchElement)+'</strong><span>纳音</span><strong>'+safe(profile.nayin||'—')+'</strong><span>立春交界</span><strong>'+safe(jie)+'</strong></div><div class="annual-relations"><span class="annual-relations-label">与本命干支的直接关系：</span>'+(relations.join('')||'<span class="muted">未命中引擎定义的两两关系</span>')+'</div></button>');
    }
    let monthRows=[];
    try{
      if(selectedProfile&&Array.isArray(selectedProfile.months)) monthRows=selectedProfile.months.map(item=>'<div class="annual-month-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span>第'+safe(item.ordinal)+'节月 · '+safe(item.jie||'—')+'</span><strong>'+safe(item.ganzhi||'—')+'</strong><small>'+safe(item.month)+'月建</small></div>');
    }catch(_){}
    let selectedGod='—';
    if(selectedProfile){try{selectedGod=engine.tenGodOf(dayGan,selectedProfile.stem)||'—';}catch(_){}}
    const selectedAnnualSummary=selectedProfile?'<div class="data-card selected-time-context"><h3>当前关系对照流年：'+safe(selectedProfile.year)+' · '+safe(selectedProfile.ganzhi)+'</h3><p>天干十神：'+safe(selectedGod)+'　五行：'+safe(selectedProfile.stemElement)+' / '+safe(selectedProfile.branchElement)+'</p><p>纳音：'+safe(selectedProfile.nayin||'—')+'　生肖：'+safe(selectedProfile.zodiacCn||selectedProfile.branch||'—')+'</p><p>立春资料：'+safe(selectedProfile.lichun&&selectedProfile.lichun.text||'未返回')+'</p><p class="muted">该流年将与本命及所选大运共同参与关系对照。</p></div>':'<div class="data-card selected-time-context"><h3>所选流年资料暂不可用</h3><p class="muted">本地引擎未返回该年份完整资料，因此不生成关系对照。</p></div>';
    const timeText=beijingNow.year+'-'+String(beijingNow.month).padStart(2,'0')+'-'+String(beijingNow.day).padStart(2,'0')+' '+String(beijingNow.hour).padStart(2,'0')+':'+String(beijingNow.minute).padStart(2,'0');
    const annualSelector=renderTimelineSelectors({annual:true,annualYears:Array.from({length:6},(_,i)=>currentYear+i)});
    return '<h3 class="subhead">当前流年与未来五年</h3>'+annualSelector+selectedAnnualSummary+'<p class="muted">查询时刻：北京时间 '+safe(timeText)+'。当前干支年按本地引擎立春表判断；立春前仍归上一干支年。当前流年起点：'+safe(currentYear)+' 年。流年天干十神以本命日主为参照，关系只列出引擎定义的直接两两关系，不代表完整吉凶结论。</p><div class="annual-timeline">'+(cards.join('')||'<div class="empty">本地引擎没有返回流年资料。</div>')+'</div>'+(monthRows.length?'<h3 class="subhead" style="margin-top:20px">所选流年 '+safe(activeYear)+' 的十二节月资料</h3><p class="muted">以下为所选流年的节月干支与节令名称。引擎没有提供十二个交节的精确时刻，因此不标记当前节月，也不把节月序号当作公历月份边界。</p><div class="annual-month-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">'+monthRows.join('')+'</div>':'');
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
      overview.dataset.renderVersion = '20261101d';
      overview.insertAdjacentHTML('afterbegin', renderOverview());
    }
  }
  function renderTab() {
    document.querySelectorAll('.tab').forEach(b=>{const on=b.dataset.tab===activeTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));});
    const renderers={details:renderDetails,relations:renderRelations,shensha:renderShensha,luck:renderLuck,annual:renderAnnual,twelve:renderTwelveStages,overview:renderOverview};
    content.innerHTML=(renderers[activeTab]||renderDetails)();
    if (activeTab === 'overview') content.innerHTML = '<p class="muted">五行总览已固定显示在本命面板中。</p>';
    content.querySelectorAll('[data-select-luck]').forEach(el=>el.addEventListener('change',()=>{selectedLuckIndex=el.value===''?null:Number(el.value);renderTab();}));
    content.querySelectorAll('[data-select-annual]').forEach(el=>el.addEventListener('change',()=>{selectedAnnualYear=Number(el.value);renderTab();}));
  }
  // 时间轴卡片使用按钮语义；父容器事件委托在重绘后仍然有效。
  content.addEventListener('click',event=>{
    const target=event.target;
    if(!target||typeof target.closest!=='function') return;
    const luckButton=target.closest('[data-pick-luck-index]');
    if(luckButton&&content.contains(luckButton)){
      const index=Number(luckButton.dataset.pickLuckIndex);
      if(Number.isFinite(index)&&Array.isArray(lastLuck?.pillars)&&lastLuck.pillars.some(p=>Number(p.index)===index)){
        selectedLuckIndex=index;renderTab();
      }
      return;
    }
    const annualButton=target.closest('[data-pick-annual-year]');
    if(annualButton&&content.contains(annualButton)){
      const year=Number(annualButton.dataset.pickAnnualYear);
      const current=getCurrentAnnualInfo().year;
      if(Number.isInteger(year)&&current!=null&&year>=current&&year<current+6){selectedAnnualYear=year;renderTab();}
      return;
    }
    const locator=target.closest('[data-locate-kind]');
    if(locator&&content.contains(locator)){
      const kind=locator.dataset.locateKind;
      let destination=null;
      if(kind==='natal') destination=document.getElementById('pillar-'+locator.dataset.locateKey);
      else if(kind==='luck'){
        const index=Number(locator.dataset.locateValue);
        if(Array.isArray(lastLuck?.pillars)&&lastLuck.pillars.some(p=>Number(p.index)===index)){
          selectedLuckIndex=index;activeTab='luck';renderTab();destination=content.querySelector('[data-pick-luck-index="'+index+'"]');
        }
      }else if(kind==='annual'){
        const year=Number(locator.dataset.locateValue),current=getCurrentAnnualInfo().year;
        if(Number.isInteger(year)&&current!=null&&year>=current&&year<current+6){
          selectedAnnualYear=year;activeTab='annual';renderTab();destination=content.querySelector('[data-pick-annual-year="'+year+'"]');
        }
      }
      if(destination){
        document.querySelectorAll('.relation-target-focus').forEach(el=>el.classList.remove('relation-target-focus'));
        destination.classList.add('relation-target-focus');
        destination.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
      }
    }
  });
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
      lastChart=chart; lastLuck=null; selectedLuckIndex=null; selectedAnnualYear=null;
      if (lastBirth.gender!==null && typeof window.BaziEngine.computeLuckPillars==='function') {
        try {
          const beijingNow=getBeijingNow();
          if(!beijingNow) throw new Error('无法取得北京时间，不能确定当前大运日期');
          const today=beijingNow.year+'-'+String(beijingNow.month).padStart(2,'0')+'-'+String(beijingNow.day).padStart(2,'0');
          lastLuck=window.BaziEngine.computeLuckPillars({...birth,gender:lastBirth.gender,count:10,today});
          selectedLuckIndex=lastLuck?.current?.pill?.index??null;
        } catch (e) { console.warn('大运计算暂不可用：',e); }
      }
      const annualInfo=getCurrentAnnualInfo();
      selectedAnnualYear=annualInfo.year;
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