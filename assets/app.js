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
  // 简单吉凶归向：按《渊海子平》合冲刑害的基础规则，只给三档倾向，不作具体应事断语。
  // 合（天干五合、六合）主和顺为“吉顺”；半三合力弱为“偏吉”；冲、害、刑主不和为“多阻”；自刑偏内耗为“自阻”。
  const relationOmen=(x)=>{
    const type=String(x&&x.type||'');
    const omenMap={
      '天干五合':['good','吉顺'],
      '天干相冲':['bad','多阻'],
      '六合':['good','吉顺'],
      '六冲':['bad','多阻'],
      '六害':['bad','多阻'],
      '相刑':['bad','多阻'],
      '自刑':['flat','自阻'],
      '半三合':['flat','偏吉']
    };
    const hit=omenMap[type];
    if(!hit) return {tone:'flat',label:'—'};
    return {tone:hit[0],label:hit[1]};
  };
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
    if(typeof engine.lichunOf!=='function'||typeof engine.yearProfile!=='function') return {year:null,profile:null,now,error:'当前流年资料暂不可用'};
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
        if(bi==null||!expected||engine.BRANCHES[bi]!==expected) throw new Error('当前流年资料校验未通过');
      }
      const profile=engine.yearProfile(year);
      if(!profile||!profile.ganzhi) throw new Error('当前流年资料暂不可用');
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
    const elementColorClass = (el) => 'el-' + (['木','火','土','金','水'].includes(el) ? el : '未知');
    // 五行符号：由 CSS/SVG 生成统一徽章（替换早期 emoji 图标，提升质感）
    const elementSymbol = (el) => ['木','火','土','金','水'].includes(el) ? '<i class="w5-sym w5-' + el + '" aria-hidden="true"></i>' : '<i class="w5-sym" aria-hidden="true"></i>';
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
      return '<span class="pillar-attr '+elementColorClass(attr.element)+'" aria-label="'+safe(title)+'属性：'+safe(label)+'">'+elementSymbol(attr.element)+'<b><span class="polarity polarity-'+(polarity === '阳' ? 'yang' : polarity === '阴' ? 'yin' : 'unknown')+'">'+safe(polarity || '—')+'</span><span class="attr-element">'+safe(element)+'</span></b></span>';
    };
    pillarsBox.classList.toggle('three-pillars', labels.length === 3);
    pillarsBox.innerHTML = labels.map(([key,label],i) => {
      const p = chart.pillars?.[key] || {};
      const gz = p.ganzhi || '';
      const stem = String(gz).charAt(0);
      const branch = String(gz).charAt(1);
      if (!stem || !branch) return '<article class="pillar"><div class="pillar-label">'+label+'</div><div class="empty">暂无该柱资料</div></article>';
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
    if (!entries.length) return '<section class="fy-final fy-final-empty">当前命盘暂时没有可显示的五行统计资料。</section>';

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
    if (!roles) return '<section class="fy-final fy-final-empty">日主五行资料暂不可用，暂时无法建立十神关系。</section>';

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
    const deDi = rootLabel !== '无根';

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
    const helpRanked = helpNames.slice().sort((a,b) => values[b] - values[a]);
    const pickTaboo = (pool) => {
      if (!pool.length) return [];
      const usable = pool.filter(e => !useElements.includes(e));
      if (!usable.length) return [];
      const top = values[usable[0]];
      return usable.filter(e => values[e] === top);
    };
    // 忌神与用神互斥，并按旺衰方向取对立阵营占比最高者：身旺忌帮扶（印比）、身弱忌克泄耗（食财官）；中和/待判断仍以克泄耗侧慎叠加参考。
    const tabooElements = strength === '偏强' ? pickTaboo(helpRanked) : pickTaboo(drainRanked);
    const useText = useElements.length ? useElements.join(' · ') : (strength === '偏弱' ? helpNames.join(' · ') : '以当前用神参考结果为准');
    const tabooText = tabooElements.length ? tabooElements.join(' · ') : '暂无明显忌神';
    const useRoleText = useElements.length ? useElements.map(e => relationOf(e).god).join(' · ') : (strength === '偏弱' ? '印 · 比劫（阵营参考）' : '以当前分析结果为准');
    const tabooRoleText = tabooElements.length ? tabooElements.map(e => relationOf(e).god).join(' · ') : '当前未见突出项';

    let basis = '目前尚无明确旺衰结论，以下阵营比例仅作五行关系参考。';
    if (strength === '偏弱') basis = (deLing ? '得令' : '失令') + '、' + (deDi ? '得地' : '失地') + '；虽有令根，但克泄耗占'+drainPct.toFixed(1)+'%、帮扶占'+helpPct.toFixed(1)+'%，克泄耗一方更重，故综合仍偏弱。';
    else if (strength === '偏强') basis = (deLing ? '得令' : '失令') + '、' + (deDi ? '得地' : '失地') + '；'+(deLing ? '得令且有根，帮扶基础较足' : '虽失令，但帮扶力量占'+helpPct.toFixed(1)+'%，整体支持较重')+'，故综合偏强，宜适度疏泄制衡。';
    else if (strength === '中和') basis = (deLing ? '得令' : '失令') + '、' + (deDi ? '得地' : '失地') + '；帮扶占'+helpPct.toFixed(1)+'%，克泄耗占'+drainPct.toFixed(1)+'%，整体较为均衡。';

    const leadDrain = drainRanked[0] || '';
    let keyInsight = leadDrain
      ? '关键：'+leadDrain+'占比'+pctText(values[leadDrain])+'，对应'+relationOf(leadDrain).god+'（'+(relationOf(leadDrain).effect)+'），属于克泄耗阵营；该五行数量增加并不等于日主变强。数量 ≠ 强弱。'
      : '关键：当前未统计到明显克泄耗五行；五行数量只表示分布，不直接等同日主旺衰。';
    if (strength === '偏弱' && leadDrain) keyInsight += ' 综合判断为身弱，宜优先扶身。';
    const advice = strength === '偏弱'
      ? '①补'+(useElements.length ? useElements.join('、') : '印比')+'（印生身、比劫助身）固本；②结合实际生活节奏沉淀积累；③慎叠加'+(tabooText === '暂无明显忌神' ? '克泄耗力量' : tabooText+'（'+tabooRoleText+'）')+'。'
      : strength === '偏强'
        ? '①优先参考用神方向疏泄制衡；②减少继续叠加印比帮扶；③结合完整命局与调候灵活取舍。'
        : strength === '中和'
          ? '①维持现有平衡；②结合季节调候作细节调整；③避免只按单一五行数量盲目增减。'
          : '①先观察五行分布与十神关系；②待旺衰结论明确后再定补益方向。';
    const climate = lastFavorable?.tiaoHou?.ruleCn || '暂无调候结果';
    const badge = (label,good) => '<span class="fy-final-badge '+(good?'good':'bad')+'">'+label+(good?' ✓':' ✗')+'</span>';
    const elementList = arr => arr.length ? arr.map(e=>'<b class="fy-final-pill el-'+e+'">'+e+'</b>').join('') : '<span class="fy-final-muted">暂无相关资料</span>';

    return '<section class="fy-final">'+
      '<header class="fy-final-heading"><div><span>五行结构 · 旺衰喜忌</span><h3>日主旺衰 · 喜用神诊断</h3><p>子平扶抑 · 身弱喜印比帮身，身旺喜财官食伤泄耗</p></div></header>'+
      '<div class="fy-final-anchor"><div class="fy-final-day"><small>日主</small><strong>'+safe(dayGan)+'</strong><em>'+safe(dayElement)+'</em></div><div class="fy-final-month"><small>月令</small><strong>'+safe(monthBranch||'—')+'</strong><em>'+safe(monthElement)+'</em></div><div class="fy-final-badges">'+badge(deLing?'得令':'失令',deLing)+badge(deDi?'得地':'失地',deDi)+badge(helpScore>drainScore?'得势':'失势',helpScore>drainScore)+'</div></div>'+
      '<div class="fy-final-verdict"><div class="fy-final-verdict-main"><span>日主旺衰</span><strong>'+safe(strength)+'</strong></div><p>'+safe(basis)+'</p></div>'+
      '<section class="fy-final-section"><div class="fy-final-section-title">力量对比 <small>五行阵营统计值</small></div><div class="fy-final-balance-labels"><strong class="help">帮扶 '+helpPct.toFixed(1)+'%</strong><strong class="drain">克泄耗 '+drainPct.toFixed(1)+'%</strong></div><div class="fy-final-bar"><i class="help" style="width:'+helpPct.toFixed(2)+'%"></i><i class="drain" style="width:'+drainPct.toFixed(2)+'%"></i></div><div class="fy-final-composition"><span class="help">帮扶：'+safe(helpNames.join(' · ')||'无')+'（'+safe([roles['印'],roles['比劫']].filter((e,i,arr)=>arr.indexOf(e)===i).map(e=>relationOf(e).god).join(' · '))+'）</span><span class="drain">克泄耗：'+safe(drainNames.join(' · ')||'无')+'（'+safe(drainNames.map(e=>relationOf(e).god).join(' · ')||'无')+'）</span></div></section>'+
      '<section class="fy-final-section"><div class="fy-final-section-title">五行 → 十神 → 阵营 <small>按五行点数由高到低</small></div><div class="fy-final-cause">'+causeRows+'</div><p class="fy-final-insight">'+safe(keyInsight)+'</p></section>'+
      '<div class="fy-final-gods"><article class="fy-final-god-card use"><span>用神 · 扶身参考</span><strong>'+safe(useText||'待进一步确认')+'</strong><small>'+safe(useRoleText)+' · 宜补益</small></article><article class="fy-final-god-card taboo"><span>忌神参考 · 慎叠加</span><strong>'+safe(tabooText)+'</strong><small>'+safe(tabooRoleText)+' · 宜适度控制</small></article></div>'+
      '<section class="fy-final-advice"><div><strong>行动建议</strong><p>'+safe(advice)+'</p></div><div class="fy-final-advice-meta"><small>调候参考：'+safe(climate)+'</small><footer>以上为传统流派规则推演，仅供文化研究参考，不作为人生决策依据。</footer></div></section>'+
      '</section>';
  }
  function renderTwelveStages() {
    const pillars = lastChart?.pillars || {};
    const rows = [['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']]
      .filter(([key]) => key !== 'time' || !(lastBirth && lastBirth.unknownTime));
    return '<h3 class="subhead">十二长生</h3><p class="muted">以各柱天干为参照，查看其与对应地支的阶段关系。</p><div class="twelve-stage-grid">'+rows.map(([key,label])=>{
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

    // 十神 × 宫位规则矩阵：调用引擎 tenGodPillarProfile，按本命日主取对应行。
    // 日柱为日主本身，不套用年/月/时柱位矩阵；表为规则参考，不对本命柱位下断语。
    function renderTenGodMatrix() {
      const engine=window.BaziEngine||{};
      if(typeof engine.tenGodPillarProfile!=='function'||!Array.isArray(engine.TEN_GOD_ORDER)||!Array.isArray(engine.PILLAR_POS)) return '';
      const dayGan=lastChart?.meta?.dayMaster||lastChart?.pillars?.day?.ganzhi?.charAt(0);
      if(!dayGan) return '';
      const presentGods=new Set();
      try{
        const ps=lastChart?.pillars||{};
        for(const k of ['year','month','day','time']){
          const p=ps[k]; if(!p) continue;
          if(p.shiShenGan) presentGods.add(p.shiShenGan);
          if(Array.isArray(p.hideGan)) p.hideGan.forEach(g=>{if(typeof engine.tenGodOf==='function'){const god=engine.tenGodOf(dayGan,g);if(god) presentGods.add(god);}});
        }
      }catch(_){}
      const posDefs=engine.PILLAR_POS;
      const cards=engine.TEN_GOD_ORDER.map(god=>{
        let groupCn='';
        let posRows='';
        posDefs.forEach((pd,pi)=>{
          let p2=null; try{p2=engine.tenGodPillarProfile(god,pd.id);}catch(_){}
          if(!p2||!Array.isArray(p2.rows)) return;
          if(pi===0) groupCn=p2.groupCn||'';
          const row=p2.rows.find(r=>r.dayGan===dayGan);
          if(!row) return;
          const el=['木','火','土','金','水'].includes(row.ganElement)?row.ganElement:'土';
          posRows+='<div class="tg-row"><span class="tg-pos">'+safe(pd.palaceCn||pd.cn||'—')+'</span><b class="tg-gan el-'+el+'">'+safe(row.gan)+'</b><small class="tg-attr">'+safe(row.ganElement||'—')+' · '+safe(row.ganPolarity||'—')+'</small><em class="tg-rel">'+safe(row.relation||'—')+'</em></div>';
        });
        if(!posRows) return null;
        return '<div class="data-card tg-card'+(presentGods.has(god)?' tg-present':'')+'"><h3>'+safe(god)+(groupCn?'<span class="chip">'+safe(groupCn)+'</span>':'')+(presentGods.has(god)?'<span class="chip tg-now">本命现</span>':'')+'</h3><div class="tg-rows">'+posRows+'</div></div>';
      }).filter(Boolean);
      if(!cards.length) return '';
      return '<details class="ten-god-matrix"><summary><span>十神 × 宫位资料矩阵</span><small>规则参考 · 以本命日主对照</small></summary><p class="muted">本表为引擎十神柱位规则查询矩阵：同一十神落在年、月、时柱的传统宫位含义对照，以本命日主'+safe(dayGan)+'为参照取对应天干。日柱为日主本身，不套用此矩阵。「本命现」表示该十神在当前命盘天干或藏干中实际出现。此表是规则资料，不是对本命柱位的直接断语。</p><div class="tg-grid">'+cards.join('')+'</div></details>';
    }

    return '<h3 class="subhead">藏干、十神与十二长生</h3><p class="muted">十二长生以日干为参照；以下为四柱相关的补充资料。</p><div class="data-grid">'+unknownNote+cards+dayCard+branchCards.join('')+kongWangCard+'</div>'+renderTenGodMatrix()+'<p class="muted">地支关系资料不代表命盘已构成相应组合；旬空按日柱统一计算。排盘资料在当前浏览器本地生成。</p>';
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
    const relationBuckets=[
      {id:'natal-internal',label:'本命内部关系',description:'四柱之间的两两关系',items:[]},
      {id:'natal-luck',label:'本命与大运关系',description:'本命四柱与当前所选大运的关系',items:[]},
      {id:'natal-annual',label:'本命与流年关系',description:'本命四柱与当前所选流年的关系',items:[]},
      {id:'luck-annual',label:'大运与流年关系',description:'所选大运与所选流年之间的关系',items:[]}
    ];
    const bucketFor=(a,b)=>{
      const natalA=a.id.startsWith('natal-'),natalB=b.id.startsWith('natal-');
      const luckA=a.id==='luck-selected',luckB=b.id==='luck-selected';
      const annualA=a.id==='annual-selected',annualB=b.id==='annual-selected';
      if(natalA&&natalB)return relationBuckets[0];
      if((natalA&&luckB)||(natalB&&luckA))return relationBuckets[1];
      if((natalA&&annualB)||(natalB&&annualA))return relationBuckets[2];
      if((luckA&&annualB)||(luckB&&annualA))return relationBuckets[3];
      return null;
    };
    for(let i=0;i<participants.length;i++) for(let j=i+1;j<participants.length;j++){
      const a=participants[i],b=participants[j];
      let sr=[],br=[];
      try{if(typeof engine.stemRelation==='function')sr=engine.stemRelation(a.gz[0],b.gz[0])||[];}catch(_){}
      try{if(typeof engine.branchRelations==='function')br=engine.branchRelations(a.gz[1],b.gz[1])||[];}catch(_){}
      const describeRelation=(x,layer)=>{
        const type=String(x.type||'');
        const element=x.element?'；对应五行：'+x.element:'';
        const kind=x.kind?'；细分类型：'+x.kind:'';
        const descriptions={
          '天干五合':'传统天干五合规则将这两个天干列为配对关系'+element+'。这只表示五合规则命中，不代表已经合化；按简化规则归向为和顺。',
          '天干相冲':'传统天干相冲规则将这两个天干列为相冲配对。这里只记录规则命中，按简化规则归向为多阻，不作具体应事断语。',
          '六合':'传统地支六合规则将这两个地支列为配对关系'+element+'。这里只表示六合规则命中，不代表已经合化；按简化规则归向为和顺。',
          '六冲':'传统地支六冲规则将这两个地支列为相冲配对。这里只记录规则命中，按简化规则归向为多阻，不作具体应事断语。',
          '六害':'传统地支六害规则将这两个地支列为相害配对。这里只记录规则命中，按简化规则归向为多阻，不作具体应事断语。',
          '相刑':'传统相刑分类将这两个地支归入同一刑组'+kind+'。这里只说明规则归组，按简化规则归向为多阻，不扩展为现实事件判断。',
          '自刑':'传统自刑规则包含该地支；此项表示同一地支触发自刑规则，按简化规则归向为自阻、宜自省，不作具体应事断语。',
          '半三合':'按传统三合分类，这两个不同地支同属一组三合，故标记为半三合'+element+'。此类规则在不同流派中存在争议；不等于三支齐全或合化成立，归向偏吉而力弱。'
        };
        const punishmentNameNote=type==='相刑'&&['恃势之刑','无恩之刑'].includes(x.kind)
          ?' 刑名提示：部分典籍与流派对寅巳申、丑戌未两组刑名存在互换说法；本站按所采用的规则名称展示，具体分组以实际成员为准。'
          :'';
        const source=layer==='天干'
          ?'规则说明：按传统天干关系分类整理；吉凶归向为简化参考。'
          :'规则说明：按传统地支关系分类整理；部分刑名与半合条件存在流派差异，吉凶归向为简化参考。';
        return {label:layer+' '+type+(x.kind?' · '+x.kind:'')+(x.element?' · '+x.element:''),description:(descriptions[type]||'本站识别到该关系类别；目前仅展示名称与简化归向。')+punishmentNameNote,source,omen:relationOmen(x)};
      };
      const items=sr.map(x=>describeRelation(x,'天干')).concat(br.map(x=>describeRelation(x,'地支')));
      const bucket=bucketFor(a,b);
      if(items.length&&bucket){
        bucket.items.push('<div class="data-card relation-result"><div class="relation-result-heading"><span class="relation-icon" aria-hidden="true">⟷</span><strong>命中关系</strong></div><div class="relation-participants">'+locateButton(a)+'<span class="relation-connector">与</span>'+locateButton(b)+'</div><div class="relation-result-items">'+items.map(x=>'<div class="relation-explanation">'+(x.omen&&x.omen.label&&x.omen.label!=='—'?'<span class="chip omen omen-'+safe(x.omen.tone)+'">'+safe(x.omen.label)+'</span>':'')+'<span class="chip">'+safe(x.label)+'</span><p>'+safe(x.description)+'</p><small>'+safe(x.source)+'</small></div>').join('')+'</div></div>');
      }
    }
    const pairCount=relationBuckets.reduce((sum,b)=>sum+b.items.length,0);
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
        groupCards.push('<div class="data-card relation-group-card"><h3>'+safe(name)+' · '+safe(g.element||'')+'</h3><p>组合成员：'+safe(members.join('、'))+'</p><div class="relation-group-members">'+sources.join('')+'</div><p class="muted">三个不同成员均在本命、所选大运或所选流年实际出现；这里只提示组合成员齐备，不判断合化或吉凶。</p><small class="relation-evidence">规则说明：本站按传统三合、三会组合分类识别；'+(g.element?'对应五行 '+safe(g.element)+'。':'')+(g.dirCn?'方位 '+safe(g.dirCn)+'。':'')+'此处说明的是组合成员是否齐备，不作为古籍原文或合化结论。</small></div>');
      });
    });
    const layerStatus=[
      '<span class="chip">本命 '+participants.filter(p=>p.layer==='本命').length+' 柱</span>',
      '<span class="chip">'+(selectedLuck?'已选大运 '+selectedLuck.ganzhi:(currentLuck?'当前大运未选':'当前未起运/无当前大运'))+'</span>',
      '<span class="chip">'+(selectedYearProfile?'已选流年 '+selectedYearProfile.ganzhi:'流年不可用')+'</span>'
    ].join('');
    const selectorYears=annualInfo.year==null?[]:Array.from({length:6},(_,i)=>annualInfo.year+i);
    const relationSections=relationBuckets.filter(b=>b.items.length).map(b=>'<section class="relation-category" id="relation-'+b.id+'"><div class="relation-category-heading"><div><h4>'+safe(b.label)+'</h4><p class="muted">'+safe(b.description)+'</p></div><span class="relation-count">'+b.items.length+' 项</span></div><div class="relation-category-grid">'+b.items.join('')+'</div></section>').join('');
    const overview=[
      {id:'natal-internal',label:'本命内部',count:relationBuckets[0].items.length},
      {id:'natal-luck',label:'本命 × 大运',count:relationBuckets[1].items.length},
      {id:'natal-annual',label:'本命 × 流年',count:relationBuckets[2].items.length},
      {id:'luck-annual',label:'大运 × 流年',count:relationBuckets[3].items.length},
      {id:'triads',label:'三合 / 三会',count:groupCards.length}
    ];
    const overviewHtml=overview.map(x=>'<button type="button" class="relation-overview-item" data-relation-jump="'+x.id+'" '+(x.count?'':'disabled')+'><span>'+safe(x.label)+'</span><strong>'+x.count+'</strong></button>').join('');
    return '<h3 class="subhead">本命 · 大运 · 流年关系</h3><p class="muted">本命四柱固定不变；通过下方选择器切换参与关系对照的大运与流年。默认定位当前大运和当前流年。未知时辰、未起运或无法确认的对象不会被补造；关系命中不代表合化成立，也不直接代表吉凶。</p>'+renderTimelineSelectors({luck:true,annual:true,annualYears:selectorYears})+'<div class="data-card"><div class="annual-relations">'+layerStatus+'</div>'+(currentYearError?'<p class="muted">当前流年资料暂不可用：'+safe(currentYearError)+'</p>':'')+'</div><div class="relation-overview"><div class="relation-overview-title"><strong>关系总览</strong><span class="muted">共 '+pairCount+' 项两两关系 · '+groupCards.length+' 组三支组合</span></div><div class="relation-overview-grid">'+overviewHtml+'</div></div>'+(relationSections||'<div class="empty">当前参与对象之间未命中已收录的两两干支关系。</div>')+(groupCards.length?'<section class="relation-category" id="relation-triads"><div class="relation-category-heading"><div><h4>三合 / 三会组合</h4><p class="muted">按实际出现的三个成员分组展示来源</p></div><span class="relation-count">'+groupCards.length+' 组</span></div><div class="relation-category-grid">'+groupCards.join('')+'</div></section>':'')+'<div class="customer-note"><span class="note-mark">金</span><div><strong>关系说明与依据</strong><p>两两关系按传统天干、地支分类规则识别；三合、三会则检查相应组合成员是否齐备。页面只展示符合条件的关系，不据此直接推断合化或吉凶。</p><p>本页的规则说明是对传统分类的简要整理，并非《渊海子平》原文逐字引述。古籍参考请查看本知识库对应条目的书名与篇目说明。</p></div></div>';
  }
  function renderShensha() {
    const engine=window.BaziEngine||{};
    if(typeof engine.shenshaScan!=='function') return '<div class="empty">当前版本暂时无法显示神煞资料，请以其他排盘信息为准。</div>';
    const labels=[['year','年柱'],['month','月柱'],['day','日柱'],['time','时柱']];
    const gz=labels.map(([key])=>{
      const p=lastChart.pillars&&lastChart.pillars[key];
      return p&&p.ganzhi?p.ganzhi:'';
    });
    let hits=[];
    try { hits=engine.shenshaScan(gz)||[]; } catch(e) { console.warn('神煞扫描失败：',e); }
    if(!Array.isArray(hits)) hits=[];
    const cards=hits.map(hit=>'<div class="data-card shensha-card"><div class="luck-card-top"><h3><span class="relation-icon" aria-hidden="true">✧</span>'+safe(hit.cn||hit.key||'未命名神煞')+'</h3><span class="chip">'+safe(hit.where||'命中位置未返回')+'</span></div><p>查法提示：'+safe(hit.anchor||'按传统干支条件查取')+'</p><p class="muted">此处仅列出符合条件的神煞名称与所在柱位，不单独据此判定吉凶。</p></div>').join('');
    return '<h3 class="subhead">神煞扫描</h3><p class="muted">本页按传统神煞规则整理四柱中的相关标记。不同典籍与流派对部分神煞的起法和名称存在差异，结果仅供查询参考，不单独作为吉凶结论。</p><div class="shensha-summary"><span>四柱已扫描</span><strong>'+gz.filter(Boolean).length+' / 4</strong><span>命中规则</span><strong>'+hits.length+'</strong></div><div class="data-grid">'+(cards||'<div class="empty">当前四柱没有显示符合条件的神煞标记。</div>')+'</div>';
  }
  function getBasicLuckTrend(p) {
    const unknown = (lastBirth && lastBirth.unknownTime) || (lastFavorable && lastFavorable.unknownTime);
    if (unknown) return {grade:'暂不判断',tone:'unknown',reason:'出生时辰未知，当前为三柱参考；免费版不提供趋势分级。'};
    if (!p || !lastFavorable || !lastFavorable.score || !lastFavorable.fuYang) return {grade:'暂不判断',tone:'unknown',reason:'基础扶抑参考或大运五行资料不完整，暂不生成趋势提示。'};
    const verdict=lastFavorable.score.verdict;
    if (verdict!=='strong' && verdict!=='weak') return {grade:'暂不判断',tone:'unknown',reason:'现有简化扶抑参考未给出明确方向，暂不生成有利或谨慎等级。'};
    const favorable=new Set((lastFavorable.fuYang.favorable||[]).map(x=>x&&x.element).filter(Boolean));
    const unfavorable=new Set((lastFavorable.fuYang.unfavorable||[]).map(x=>x&&x.element).filter(Boolean));
    const stemElement=p.element||elementFor[p.stem];
    const branchElement=p.branchElement||elementFor[p.branch];
    const valid=['木','火','土','金','水'];
    if (!valid.includes(stemElement) || !valid.includes(branchElement)) return {grade:'暂不判断',tone:'unknown',reason:'大运天干或地支五行资料不完整，暂不生成趋势提示。'};
    // ① 五行阵营方向（原有）：按喜用神元素判断有利/谨慎/中性
    const direction=element=>{const isFav=favorable.has(element),isUnfav=unfavorable.has(element);if(isFav===isUnfav)return 'none';return isFav?'favorable':'cautious';};
    const stemDirection=direction(stemElement),branchDirection=direction(branchElement);
    const stemText='天干'+p.stem+'（'+stemElement+'）';
    const branchText='地支'+p.branch+'（主气'+branchElement+'）';
    // ② 十神层面（子平扶抑）：身弱喜印比帮身、忌财官食伤耗身；身旺喜财官食伤泄耗、忌印比助旺。
    const helpGods=['正印','偏印','比肩','劫财'];
    const drainGods=['正财','偏财','正官','七杀','食神','伤官'];
    const stemGod=(p.stemTenGod&&p.stemTenGod.god)||'';
    const branchGod=(p.branchTenGod&&p.branchTenGod.god)||'';
    const strength=verdict==='weak'?'身弱':(verdict==='strong'?'身旺':'中和');
    const godSignal=god=>{
      if(!god) return 'none';
      const isHelp=helpGods.includes(god),isDrain=drainGods.includes(god);
      if(!isHelp&&!isDrain) return 'none';
      const helpful=(verdict==='weak'&&isHelp)||(verdict==='strong'&&isDrain);
      const harmful=(verdict==='weak'&&isDrain)||(verdict==='strong'&&isHelp);
      return helpful?'favorable':(harmful?'cautious':'none');
    };
    const stemGodSignal=godSignal(stemGod),branchGodSignal=godSignal(branchGod);
    const godParts=[];
    if(stemGod) godParts.push('天干十神'+stemGod+(stemGodSignal==='favorable'?'（'+strength+'喜用）':stemGodSignal==='cautious'?'（'+strength+'忌神）':'（不参与喜忌单判）'));
    if(branchGod) godParts.push('地支十神'+branchGod+(branchGodSignal==='favorable'?'（'+strength+'喜用）':branchGodSignal==='cautious'?'（'+strength+'忌神）':'（不参与喜忌单判）'));
    // ③ 汇总五行方向 + 十神喜忌信号，综合定档
    let favorableSignals=0,cautiousSignals=0;
    [stemDirection,branchDirection].forEach(d=>{if(d==='favorable')favorableSignals++;else if(d==='cautious')cautiousSignals++;});
    [stemGodSignal,branchGodSignal].forEach(d=>{if(d==='favorable')favorableSignals++;else if(d==='cautious')cautiousSignals++;});
    let grade,tone;
    if(favorableSignals>=3&&cautiousSignals===0){grade='明显偏有利';tone='favorable';}
    else if(favorableSignals>cautiousSignals&&favorableSignals>=2){grade='基础偏有利';tone='favorable';}
    else if(cautiousSignals>=3&&favorableSignals===0){grade='明显偏谨慎';tone='cautious';}
    else if(cautiousSignals>favorableSignals&&cautiousSignals>=2){grade='基础偏谨慎';tone='cautious';}
    else {grade='因素交错';tone='mixed';}
    const directionCn=d=>d==='favorable'?'偏喜用方向':d==='cautious'?'偏忌神方向':'方向中性';
    const detail=[stemText+'五行'+directionCn(stemDirection),branchText+'五行'+directionCn(branchDirection)].concat(godParts);
    const helpDrainCn=strength==='身弱'?'以印比帮身为喜、财官食伤为忌':'以财官食伤泄耗为喜、印比为忌';
    return {grade,tone,reason:'当前命局判定为'+strength+'（'+helpDrainCn+'）。综合五行方向与十神喜忌：'+detail.join('；')+'。据此给出一档倾向供传统文化参考，不作具体断语。'};
  }
  function renderLuck() {
    if (lastBirth.gender === null || lastBirth.gender === undefined) return '<div class="empty">请在上方选择性别并重新排盘，才能计算大运。</div>';
    if (!lastLuck) return '<div class="empty">当前暂时无法显示大运资料，请重新排盘或稍后再试。</div>';
    const s=lastLuck.start||{}, chosen=s.chosen||{}, pre=lastLuck.preLuck||{};
    const direction=lastLuck.direction&&typeof lastLuck.direction==='object'?(lastLuck.direction.forward?'顺排':'逆排'):(lastLuck.direction||'—');
    const items=Array.isArray(lastLuck.pillars)?lastLuck.pillars:[];
    const selectedLuck=getSelectedLuckPillar();
    const selector=renderTimelineSelectors({luck:true});
    const selectedLuckSummary=selectedLuck?'<div class="data-card selected-time-context"><h3>当前关系对照大运：第'+safe(selectedLuck.index)+'步 · '+safe(selectedLuck.ganzhi)+'</h3><p>时间范围：'+safe(selectedLuck.yearLabel||'年份未返回')+' · 虚岁 '+safe(selectedLuck.startAgeSui??'—')+'–'+safe(selectedLuck.endAgeSui??'—')+'</p><p>天干十神：'+safe(selectedLuck.stemTenGod&&selectedLuck.stemTenGod.god||'—')+'　地支十神：'+safe(selectedLuck.branchTenGod&&selectedLuck.branchTenGod.god||'—')+'</p><p>藏干：'+safe(Array.isArray(selectedLuck.hideGan)?selectedLuck.hideGan.join('、'):'—')+'　十二长生：'+safe(selectedLuck.stage||'—')+'</p><p class="muted">该大运将与本命及所选流年共同参与关系对照。</p></div>':'<div class="data-card selected-time-context"><h3>当前关系对照大运：未指定</h3><p class="muted">选择一部大运后，才会把它加入关系对照；本命和所选流年仍可单独参与。</p></div>';
    const selectedTrend=selectedLuck?getBasicLuckTrend(selectedLuck):null;
    const selectedTrendCard=selectedTrend?'<div class="data-card luck-trend-card"><div class="luck-trend-heading"><h3>基础大运趋势</h3><span class="luck-trend-label '+selectedTrend.tone+'">'+safe(selectedTrend.grade)+'</span></div><p>'+safe(selectedTrend.reason)+'</p><p class="muted">仅依据本站简化扶抑参考与大运天干、地支主气五行生成；不进行月令司令、格局、调候、通关及刑冲合会的综合分析；简化参考本身包含月柱权重。</p></div>':'';
    const cards=items.map(p=>{const picked=!!selectedLuck&&Number(selectedLuck.index)===Number(p.index);const trend=getBasicLuckTrend(p);const trendChip='<span class="luck-trend-mini '+trend.tone+'">'+safe(trend.grade)+'</span>';return '<button type="button" class="luck-item timeline-pick '+(p.isCurrent?'current ':'')+(picked?'selected':'')+'" data-pick-luck-index="'+safe(p.index)+'" aria-pressed="'+String(picked)+'" aria-label="选择第'+safe(p.index)+'步大运 '+safe(p.ganzhi||'')+'"><div class="data-card"><h3><span class="relation-icon" aria-hidden="true">⌁</span>'+safe(p.ganzhi||'—')+(p.isCurrent?' · 当前':'')+(picked?' · 关系已选':'')+'</h3><p class="luck-trend-mini-line">'+trendChip+'</p><p>第'+safe(p.index)+'步 · '+safe(p.yearLabel||'年份未知')+'</p><p>虚岁 '+safe(p.startAgeSui??'—')+'–'+safe(p.endAgeSui??'—')+'</p><p><span class="chip">天干 '+safe(p.stemTenGod&&p.stemTenGod.god||'—')+'</span></p><p><span class="chip">地支 '+safe(p.branchTenGod&&p.branchTenGod.god||'—')+'</span></p><p>藏干：'+safe(Array.isArray(p.hideGan)?p.hideGan.join('、'):'—')+'</p><p>十二长生：'+safe(p.stage||'—')+'</p></div></button>';}).join('');
    const unknown=lastBirth.unknownTime&&lastLuck.unknownTime;
    let unknownNote='';
    if(unknown){
      const lo=unknown.low&&unknown.low.traditional||{}, hi=unknown.high&&unknown.high.traditional||{};
      const fmt=x=>safe(x.years??'—')+'年 '+safe(x.months??'—')+'个月 '+safe(x.days??'—')+'天';
      unknownNote='<div class="data-card"><h3>未知时辰：起运范围提示</h3><p>上方起运日期与年龄按中午参考时刻计算，不应视为精确结果。</p><p>按当天时辰范围估算：较早端约 '+fmt(lo)+'；较晚端约 '+fmt(hi)+'。</p><p>节气是否跨界：'+(unknown.jieAmbiguous?'当天不同时间可能对应不同节气，年/月柱及起运依据需重点复核。':'当前扫描范围未发现前后节气名称变化，但起运时间仍可能随出生时刻变化。')+'</p><p class="muted">要缩小范围，请补充出生时辰；若出生时刻接近立春或节气交界，建议按准确时刻重新排盘。</p></div>';
    }
    const todayNote=lastLuck.today?'<p class="muted">当前大运判断日期：北京时间 '+safe(lastLuck.today)+'（按日期判断当前大运步，不使用当天具体时分）。</p>':'';
    return '<h3 class="subhead">起运信息</h3><div class="data-grid"><div class="data-card"><p>大运方向：'+safe(direction)+'</p><p>起运日期：'+safe(s.startDateTime||s.startDate||'—')+'</p><p>起运年龄：'+safe(chosen.years??'—')+'年 '+safe(chosen.months??0)+'个月 '+safe(chosen.days??0)+'天</p><p>起运前：'+safe(pre.startYear||'—')+' 至 '+safe(pre.endYear||'—')+' 年</p><p class="muted">起运日期和年龄会因出生时间及采用的起运方法不同而有所差异。</p></div>'+unknownNote+'</div>'+todayNote+selector+selectedLuckSummary+selectedTrendCard+'<h3 class="subhead" style="margin-top:20px">十年大运时间轴</h3><div class="luck-timeline">'+(cards||'<div class="empty">暂时没有可显示的大运序列。</div>')+'</div>';
  }
  function renderAnnual() {
    const engine=window.BaziEngine||{};
    if(typeof engine.yearProfile!=='function'||typeof engine.tenGodOf!=='function'||typeof engine.lichunOf!=='function') return '<div class="empty">当前版本暂时无法显示流年资料，请稍后重试。</div>';
    const dayGan=lastChart.meta&&lastChart.meta.dayMaster||lastChart.pillars&&lastChart.pillars.day&&lastChart.pillars.day.ganzhi&&lastChart.pillars.day.ganzhi.charAt(0);
    if(!dayGan) return '<div class="empty">命盘日主资料暂不可用，暂时无法生成流年对照。</div>';
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
      const isPicked=y===Number(selectedAnnualYear==null?currentYear:selectedAnnualYear);cards.push('<button type="button" class="data-card annual-card timeline-pick '+(isPicked?'annual-selected':'')+'" data-pick-annual-year="'+safe(y)+'" aria-pressed="'+String(isPicked)+'" aria-label="选择流年 '+safe(profile.year)+' '+safe(profile.ganzhi)+'"><div class="luck-card-top"><h3>'+safe(profile.year)+' · '+safe(profile.ganzhi)+'</h3><span class="chip">'+safe(profile.zodiacCn||profile.branch)+'</span>'+currentMark+selectedMark+'</div><div class="annual-meta"><span>流年天干十神</span><strong>'+safe(god)+'</strong><span>五行</span><strong>'+safe(profile.stemElement)+' / '+safe(profile.branchElement)+'</strong><span>纳音</span><strong>'+safe(profile.nayin||'—')+'</strong><span>立春交界</span><strong>'+safe(jie)+'</strong></div><div class="annual-relations"><span class="annual-relations-label">与本命干支的直接关系：</span>'+(relations.join('')||'<span class="muted">未发现符合条件的两两关系</span>')+'</div></button>');
    }
    let monthRows=[];
    try{
      if(selectedProfile&&Array.isArray(selectedProfile.months)) monthRows=selectedProfile.months.map(item=>'<div class="annual-month-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span>第'+safe(item.ordinal)+'节月 · '+safe(item.jie||'—')+'</span><strong>'+safe(item.ganzhi||'—')+'</strong><small>'+safe(item.month)+'月建</small></div>');
    }catch(_){}
    // 太岁关系：读取所选流年 yearProfile().relations，列出犯太岁生肖并与本命柱支比对。
    // 值/冲/刑/害/破五类为传统规则命中，仅作资料展示与本命柱位对应，不单独判定吉凶。
    const taiSuiSection=(()=>{
      if(!selectedProfile||!Array.isArray(selectedProfile.relations)) return '';
      const kindCn={'zhi':'值太岁','chong':'冲太岁','xing':'刑太岁','hai':'害太岁','po':'破太岁'};
      const yearBranch=selectedProfile.branch||'—';
      const yearAnimal=selectedProfile.zodiacCn||yearBranch;
      const offenders=selectedProfile.relations.filter(r=>Array.isArray(r.kinds)&&r.kinds.length);
      const natalBranchLabels=natal.filter(p=>p.gz&&p.gz[1]).map(p=>({branch:p.gz[1],label:p.label}));
      const offenderCards=offenders.map(r=>{
        const kindLabels=r.kinds.map(k=>'<span class="chip">'+safe(kindCn[k]||k)+'</span>').join('');
        const hit=natalBranchLabels.filter(x=>x.branch===r.branch);
        const hitNote=hit.length
          ? '<p class="tai-sui-hit">本命命中：'+hit.map(x=>'<span class="chip">'+safe(x.label)+'（'+safe(x.branch)+'）</span>').join('')+'</p>'
          : '<p class="muted">本命现有柱支未直接对应此生肖。</p>';
        return '<div class="data-card tai-sui-card"><div class="luck-card-top"><h3><span class="relation-icon" aria-hidden="true">☯</span>'+safe(r.animalCn||r.branch||'—')+'</h3><span class="chip">'+safe(r.branch||'—')+'</span></div><div class="tai-sui-kinds">'+kindLabels+'</div>'+hitNote+'</div>';
      });
      return '<section class="tai-sui-panel"><div class="module-heading"><span class="kicker">太岁与生肖</span><span>犯太岁关系 · 与本命柱位比对</span></div>'
        +'<div class="data-card tai-sui-head"><h3>流年太岁：'+safe(yearBranch)+' · '+safe(yearAnimal)+'</h3><p class="muted">太岁即流年地支所在方位；生肖与流年地支的关系按值、冲、刑、害、破五类规则整理。这里仅列出规则命中与命盘柱支对应情况，不据此单独判定吉凶或应事。</p></div>'
        +(offenderCards.length?'<div class="tai-sui-grid">'+offenderCards.join('')+'</div>':'<p class="muted">当前资料未返回犯太岁关系。</p>')
        +'</section>';
    })();
    // 流年简测·吉凶归向：按《渊海子平》合冲刑害与犯太岁的简化规则，汇总所选流年与本命的关系信号。
    const annualOmenSection=(()=>{
      if(!selectedProfile||!selectedProfile.ganzhi) return '';
      const k2={zhi:'值太岁',chong:'冲太岁',xing:'刑太岁',hai:'害太岁',po:'破太岁'};
      const taiSuiSignal={chong:'bad',xing:'bad',hai:'bad',zhi:'flat',po:'flat'};
      let good=0,bad=0;const signals=[];
      natal.forEach(p=>{
        if(!p.gz) return;
        let sr=[],br=[];try{sr=engine.stemRelation(p.gz[0],selectedProfile.stem)||[];}catch(_){}
        try{br=engine.branchRelations(p.gz[1],selectedProfile.branch)||[];}catch(_){}
        sr.concat(br).forEach(x=>{
          const o=relationOmen(x);
          if(o.tone==='good')good++;else if(o.tone==='bad')bad++;
          if(o.label&&o.label!=='—')signals.push(o.label);
        });
      });
      if(Array.isArray(selectedProfile.relations)){
        selectedProfile.relations.forEach(r=>{
          if(!Array.isArray(r.kinds))return;
          r.kinds.forEach(k=>{
            const t=taiSuiSignal[k];if(!t)return;
            if(t==='bad')bad++;
            signals.push(k2[k]||k);
          });
        });
      }
      // ③ 大运 × 流年关系：若已选大运，分析其与流年的天干地支两两关系，并单独检测天克地冲。
      const luckP=getSelectedLuckPillar();
      if(luckP&&luckP.ganzhi&&luckP.ganzhi.length>=2){
        let srL=[],brL=[];
        try{srL=engine.stemRelation(luckP.ganzhi[0],selectedProfile.stem)||[];}catch(_){}
        try{brL=engine.branchRelations(luckP.ganzhi[1],selectedProfile.branch)||[];}catch(_){}
        srL.concat(brL).forEach(x=>{
          const o=relationOmen(x);
          if(o.tone==='good')good++;else if(o.tone==='bad')bad++;
          if(o.label&&o.label!=='—')signals.push(o.label+'（大运×流年）');
        });
        const stemClash=srL.some(x=>x.type==='天干相冲');
        const branchClash=brL.some(x=>x.type==='六冲');
        if(stemClash&&branchClash){bad+=2;signals.push('天克地冲（大运×流年）');}
      }
      if(good+bad===0) return '';
      let tone='flat',head='平稳';
      if(bad>good&&bad>0){tone='bad';head='多阻';}
      else if(good>bad){tone='good';head='吉顺';}
      const note={
        good:'和合信号偏多，简化规则偏顺。宜顺势而为，仍以实际事态为准。',
        flat:'和顺与阻隔信号大致相抵或信号不多，简化规则判为平稳。宜守常行事。',
        bad:'阻隔信号偏多（多源于冲刑害或犯太岁），简化规则偏慎。宜静守审慎、不宜冒进。'
      }[tone];
      const unique=[...new Set(signals)].slice(0,6).join('、');
      return '<section class="annual-omen"><div class="module-heading"><span class="kicker">流年吉凶 · 简化参考</span><span>按《渊海子平》合冲刑害、犯太岁与大运×流年规则归向</span></div><div class="data-card omen-card omen-'+tone+'"><h3>'+safe(selectedProfile.year)+' · '+safe(selectedProfile.ganzhi)+' 简测：<strong>'+head+'</strong></h3><p>'+(unique?'相关信号：'+safe(unique)+'。':'当前未识别到明显关系信号。')+'</p><p>'+safe(note)+'</p><p class="muted">本小节按合冲刑害、犯太岁，以及本命/所选大运与流年的两两干支关系作简化倾向归向；天克地冲计为较强的阻隔信号。非古籍逐字结论，也不构成对财运、事业、健康等具体事件的判断；仅供娱乐参考。</p></div></section>';
    })();
    let selectedGod='—';
    if(selectedProfile){try{selectedGod=engine.tenGodOf(dayGan,selectedProfile.stem)||'—';}catch(_){}}
    const selectedAnnualSummary=selectedProfile?'<div class="data-card selected-time-context"><h3>当前关系对照流年：'+safe(selectedProfile.year)+' · '+safe(selectedProfile.ganzhi)+'</h3><p>天干十神：'+safe(selectedGod)+'　五行：'+safe(selectedProfile.stemElement)+' / '+safe(selectedProfile.branchElement)+'</p><p>纳音：'+safe(selectedProfile.nayin||'—')+'　生肖：'+safe(selectedProfile.zodiacCn||selectedProfile.branch||'—')+'</p><p>立春资料：'+safe(selectedProfile.lichun&&selectedProfile.lichun.text||'未返回')+'</p><p class="muted">该流年将与本命及所选大运共同参与关系对照。</p></div>':'<div class="data-card selected-time-context"><h3>所选流年资料暂不可用</h3><p class="muted">该年份的资料暂不完整，因此暂不加入关系对照。</p></div>';
    const timeText=beijingNow.year+'-'+String(beijingNow.month).padStart(2,'0')+'-'+String(beijingNow.day).padStart(2,'0')+' '+String(beijingNow.hour).padStart(2,'0')+':'+String(beijingNow.minute).padStart(2,'0');
    const annualSelector=renderTimelineSelectors({annual:true,annualYears:Array.from({length:6},(_,i)=>currentYear+i)});
    return '<h3 class="subhead">当前流年与未来五年</h3>'+annualSelector+selectedAnnualSummary+'<p class="muted">查询时刻：北京时间 '+safe(timeText)+'。当前干支年按立春时间判断；立春前仍归上一干支年。当前流年起点：'+safe(currentYear)+' 年。流年天干十神以本命日主为参照；关系区域仅列出本命与流年之间符合条件的干支关系。</p><div class="annual-timeline">'+(cards.join('')||'<div class="empty">暂时没有可显示的流年资料。</div>')+'</div>'+taiSuiSection+annualOmenSection+(monthRows.length?'<h3 class="subhead" style="margin-top:20px">所选流年 '+safe(activeYear)+' 的十二节月资料</h3><p class="muted">以下为所选流年的节月干支与节令名称。当前资料未提供十二个交节的精确时刻，因此不标记当前节月，也不把节月序号当作公历月份边界。</p><div class="annual-month-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">'+monthRows.join('')+'</div>':'');
  }
    function renderSidePanels() {
    // 五行总览保留在主命盘下方；大运与流年只在下方标签中按需展开。
    const overview = $('#overview-panel');
    if (overview) {
      // 每次排盘都彻底清空旧节点，再写入当前版本的五行扶抑分析。
      overview.replaceChildren();
      overview.dataset.renderVersion = '20261101d';
      overview.insertAdjacentHTML('afterbegin', renderOverview());
    }
  }
  function renderTab() {
    const tabGuides = {
      details: {text:'这里查看四柱中的藏干、十神与纳音资料；十神以日主为参照，可结合各柱位置对照。',links:[['十神资料','ten-gods'],['藏干与纳音','hidden-stems']]},
      relations: {text:'这里汇总本命、所选大运与所选流年之间的干支关系；点击关系来源可返回对应柱位或时间轴。',links:[['干支关系说明','relations']]},
      shensha: {text:'这里列出符合条件的神煞名称及所在柱位；不同流派的起法与名称差异请查看资料说明。',links:[['神煞资料','shensha']]},
      luck: {text:'这里查看起运信息和各步大运；选择某一步后，可与本命及所选流年进行关系对照。',links:[['大运与起运','luck'],['排盘时间规则','rules']]},
      annual: {text:'这里查看当前干支年及后续流年；选择年份后，可同步查看该年的节月资料和关系对照。',links:[['流年与节月','luck'],['立春换年规则','rules']]},
      twelve: {text:'这里查看十二长生在本命各柱上的对应资料；也可在大运详情中对照所选大运。',links:[['十二长生资料','twelve-stages']]}
    };
    const guide = tabGuides[activeTab];
    const guideBox = $('#tab-guide');
    if (guideBox) {
      guideBox.innerHTML = guide
        ? '<span class="tab-guide-text">'+guide.text+'</span><span class="tab-guide-links">'+guide.links.map(([label,topic])=>'<a href="./guide/category.html?topic='+topic+'">'+label+' <span aria-hidden="true">↗</span></a>').join('')+'</span>'
        : '';
      guideBox.hidden = !guide;
    }
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
    const relationJump=target.closest('[data-relation-jump]');
    if(relationJump&&content.contains(relationJump)&&!relationJump.disabled){
      const section=content.querySelector('#relation-'+relationJump.dataset.relationJump);
      if(section)section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
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
    // 新提交先清理旧命盘，避免新输入无效或计算失败时仍展示上一张命盘。
    lastBirth=null; lastChart=null; lastLuck=null; lastFavorable=null;
    selectedLuckIndex=null; selectedAnnualYear=null; activeTab='overview';
    results.hidden=true;
    pillarsBox.replaceChildren();
    pillarsBox.classList.remove('three-pillars');
    content.replaceChildren();
    const overviewPanel=$('#overview-panel');
    if(overviewPanel) overviewPanel.replaceChildren();
    const dayMasterLabel=$('#day-master');
    if(dayMasterLabel) dayMasterLabel.textContent='日主 —';
    if (!window.BaziEngine || typeof window.BaziEngine.computeBazi !== 'function') {
      showError('排盘功能暂时无法启动，请刷新页面后重试；如果仍无法使用，请联系维护者。'); return;
    }
    const fd=new FormData(form);
    // 出生日期使用 <input type="date">，值为 YYYY-MM-DD；空/格式非法直接拦截，不猜测补全。
    const birthdateRaw=String(fd.get('birthdate')||'').trim();
    const bdMatch=/^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdateRaw);
    const year=bdMatch?Number(bdMatch[1]):NaN,month=bdMatch?Number(bdMatch[2]):NaN,day=bdMatch?Number(bdMatch[3]):NaN;
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
      if (!chart || !chart.pillars) throw new Error('排盘资料不完整，请检查出生信息后重试。');
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
      results.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    } catch (e) {
      console.error(e); showError('排盘失败：'+(e && e.message ? e.message : '未知错误')+'。请检查出生信息是否正确；如果问题持续，请联系维护者。');
    }
  }
  form.addEventListener('submit',compute);
  // 出生城市快捷选择：选中即自动填好出生地经度与 UTC 时区偏移（仍可手动微调）。
  const citySelect=form.querySelector('[name="city"]');
  if(citySelect){
    citySelect.addEventListener('change',()=>{
      const val=String(citySelect.value||'');
      if(!val) return;
      const parts=val.split('|');
      if(parts.length<3) return;
      const lng=Number(parts[1]),tz=Number(parts[2]);
      const lngInput=form.querySelector('[name="longitude"]');
      const tzInput=form.querySelector('[name="tzOffsetHours"]');
      if(lngInput&&Number.isFinite(lng)) lngInput.value=lng;
      if(tzInput&&Number.isFinite(tz)) tzInput.value=tz;
      hideError();
    });
  }
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;renderTab();}));
  if (!window.BaziEngine) {
    window.addEventListener('load',()=>{if(!window.BaziEngine)showError('排盘功能暂时无法启动，请刷新页面后重试；如果仍无法使用，请联系维护者。');});
  }
})();