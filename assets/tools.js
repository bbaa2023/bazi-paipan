(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const content = $('#tools-content');
  const safe = (s) => String(s ?? '—').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const E = () => window.BaziEngine || null;
  // 公历日期快捷选择字段（tools 页用 <input type="date">）
  const dateField = (name, value) => '<label>公历日期<input name="'+name+'" type="date" min="1900-01-01" max="2100-12-31" value="'+safe(value||'1990-06-15')+'"></label>';
  const parseDate = (raw) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw||'').trim());
    if (!m) return null;
    return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
  };
  const errBox = (id, msg) => '<div class="notice error" id="'+id+'" role="alert" style="margin-top:12px">'+safe(msg)+'</div>';
  const chip = (t) => '<span class="chip">'+safe(t)+'</span>';
  const elementClass = (t) => 'el-' + (['木','火','土','金','水'].includes(t) ? t : '土');

  const toolViews = {
    compat: {
      title: '合盘', icon: '☯',
      desc: '输入两个人的出生信息，对照双方日主、四柱干支两两关系、生肖关系与五行并集。全部按传统干支规则逐条列出，本站不给匹配分数、不做应事断语。',
      form: () => {
        const row = (tag, label, def) => '<fieldset class="tools-fieldset"><legend>'+safe(label)+'</legend><div class="tools-person-grid">'+dateField(tag+'-date', def)+'<label>时辰（24h，可空）<select name="'+tag+'-hour"><option value="">未知时辰</option>' + Array.from({length:24},(_,i)=>'<option value="'+i+'"'+(i===12?' selected':'')+'>'+String(i).padStart(2,'0')+':00</option>').join('')+'</select></label><label>性别<select name="'+tag+'-gender"><option value="1">男</option><option value="0">女</option></select></label><label>时区偏移<input name="'+tag+'-tz" type="number" min="-12" max="14" step="0.25" value="8"></label></div></fieldset>';
        return row('a','甲方（出生信息）','1990-06-15') + row('b','乙方（出生信息）','1992-08-20') + '<div class="tools-submit-row"><button class="primary" type="button" data-run="compat"><span>☯</span> 开始合盘</button></div><div id="compat-err"></div><div id="compat-out"></div>';
      },
      run: (form) => {
        const e = E();
        if (!e || typeof e.computeCompatibility !== 'function') { $('#compat-err').innerHTML = errBox('', '合盘功能暂不可用：当前引擎未加载或缺少该接口。'); return; }
        const mk = (tag) => {
          const d = parseDate(form.querySelector('[name="'+tag+'-date"]').value);
          if (!d) return null;
          return { year:d.y, month:d.mo, day:d.d, hour:form.querySelector('[name="'+tag+'-hour"]').value===''?null:Number(form.querySelector('[name="'+tag+'-hour"]').value), minute:0, tzOffsetHours:Number(form.querySelector('[name="'+tag+'-tz"]').value), gender:Number(form.querySelector('[name="'+tag+'-gender"]').value) };
        };
        const a = mk('a'), b = mk('b');
        if (!a || !b) { $('#compat-err').innerHTML = errBox('', '请填写双方完整且合法的出生日期。'); return; }
        let r;
        try { r = e.computeCompatibility(a, b); } catch (err) { $('#compat-err').innerHTML = errBox('', '合盘计算失败：'+safe(err&&err.message)); return; }
        if (!r) { $('#compat-err').innerHTML = errBox('', '合盘未返回结果，请检查出生信息。'); return; }
        const dm = r.dayMasters || {};
        const elTag = (el) => '<span class="chip '+elementClass(el)+'">'+safe(el)+'</span>';
        const z = r.zodiac || {};
        const zr = Array.isArray(z.relations)?z.relations:[];
        const tri = r.trines || {};
        const counts = r.counts || {};
        const union = (r.combinedElements && r.combinedElements.union) || {};
        const stemRows = Array.isArray(r.stems)?r.stems:[];
        const branchRows = Array.isArray(r.branches)?r.branches:[];
        const dayPair = r.dayPair;
        let stemHtml = stemRows.map(s => {
          const rels = Array.isArray(s.relations)?s.relations.map(x=>'<span class="chip">'+safe(x.type)+(x.kind?'（'+safe(x.kind)+'）':'')+'</span>').join(''):'';
          return '<tr><td>'+safe(s.aPosCn)+' '+safe(s.aStem)+'</td><td>'+safe(s.bPosCn)+' '+safe(s.bStem)+'</td><td>'+safe(s.tenGod||'—')+'</td><td>'+ (rels||'—') +'</td></tr>';
        }).join('');
        let branchHtml = branchRows.map(s => {
          const rels = Array.isArray(s.relations)?s.relations.map(x=>'<span class="chip">'+safe(x.type)+(x.kind?'（'+safe(x.kind)+'）':'')+'</span>').join(''):'';
          return '<tr><td>'+safe(s.aPosCn)+' '+safe(s.aBranch)+'</td><td>'+safe(s.bPosCn)+' '+safe(s.bBranch)+'</td><td>'+(s.involvesDayPalace?chip('涉日柱'):'—')+'</td><td>'+ (rels||'—') +'</td></tr>';
        }).join('');
        const triFull = Array.isArray(tri.full)?tri.full.map(t=>chip('三合'+safe(t.element)+'局')).join(''):'';
        const triHalf = Array.isArray(tri.half)?tri.half.map(t=>chip('半三合'+safe(t.element))).join(''):'';
        $('#compat-out').innerHTML =
          '<div class="tools-result">'+
          '<div class="tools-summary"><h3>日主互看</h3><p>甲方日主 '+safe(dm.a||'—')+'（'+safe((r.a&&r.a.dayElement)||'—')+'），乙方日主 '+safe(dm.b||'—')+'（'+safe((r.b&&r.b.dayElement)||'—')+'）</p><p>甲方看乙方：'+safe((dm.aSeesB&&dm.aSeesB.god)||'—')+'　·　乙方看甲方：'+safe((dm.bSeesA&&dm.bSeesA.god)||'—')+'</p><p>日主五行是否相同：'+(dm.sameElement?'是':'否')+'　'+elTag((dm.elements&&dm.elements[0])||'')+elTag((dm.elements&&dm.elements[1])||'')+'</p></div>'+
          '<div class="tools-summary"><h3>生肖关系</h3><p>甲方生肖 '+safe((z.a&&z.a.animal)||'—')+'，乙方生肖 '+safe((z.b&&z.b.animal)||'—')+'</p><p>'+(zr.length?zr.map(x=>'<span class="chip">'+safe(x.type)+(x.kind?'（'+safe(x.kind)+'）':'')+'</span>').join(''):'—')+'</p></div>'+
          '<div class="tools-summary"><h3>三合组合</h3><p>全三合：'+(triFull||'—')+'　半三合：'+(triHalf||'—')+'</p></div>'+
          '<div class="tools-summary"><h3>关系信号计数</h3><p>天干五合 '+safe(counts.stemCombine||0)+' · 天干相冲 '+safe(counts.stemClash||0)+' · 地支六合 '+safe(counts.sixHe||0)+' · 六冲 '+safe(counts.clash||0)+' · 六害 '+safe(counts.harm||0)+' · 刑 '+safe(counts.punishment||0)+' · 半三合 '+safe(counts.halfTrine||0)+'</p></div>'+
          '<h4 class="tools-subhead">四柱天干两两关系</h4><div class="tools-table-wrap"><table class="tools-table"><thead><tr><th>甲方</th><th>乙方</th><th>乙方干→甲方十神</th><th>关系</th></tr></thead><tbody>'+ (stemHtml||'<tr><td colspan="4">—</td></tr>') +'</tbody></table></div>'+
          '<h4 class="tools-subhead">四柱地支两两关系</h4><div class="tools-table-wrap"><table class="tools-table"><thead><tr><th>甲方</th><th>乙方</th><th>备注</th><th>关系</th></tr></thead><tbody>'+ (branchHtml||'<tr><td colspan="4">—</td></tr>') +'</tbody></table></div>'+
          '<div class="tools-summary"><h3>双方五行并集</h3><p>'+['木','火','土','金','水'].map(k=>elTag(k)+' '+safe(union[k]||0)).join('　')+'</p></div>'+
          '<p class="muted">说明：以上按传统干支关系逐条列出；本站不给匹配分数、不据此判断婚姻或现实事件。跨盘互动为现代合盘习惯，非古籍传统。</p>'+
          '</div>';
      }
    },
    wedding: {
      title: '嫁娶择日', icon: '喜',
      desc: '输入新郎、新娘的出生信息与想挑选的日期范围（默认只看周末），按建除、二十八宿、红鸾天喜、合冲孤寡逐日扫描，列出可核对的评分与硬性排除原因。',
      form: () => {
        const dateRange = '<div class="tools-person-grid">' + dateField('groom-date','1990-06-15') + dateField('bride-date','1992-08-20') + dateField('from-date','2026-11-15') + dateField('to-date','2027-03-15') + '<label>仅周末<select name="weekend"><option value="1">是（只看周六/日）</option><option value="0">否（全部日期）</option></select></label></div>';
        return dateRange + '<div class="tools-submit-row"><button class="primary" type="button" data-run="wedding"><span>喜</span> 扫描吉日</button></div><div id="wedding-err"></div><div id="wedding-out"></div>';
      },
      run: (form) => {
        const e = E();
        if (!e || typeof e.weddingScan !== 'function') { $('#wedding-err').innerHTML = errBox('', '嫁娶择日功能暂不可用：当前引擎未加载或缺少该接口。'); return; }
        const groom = parseDate(form.querySelector('[name="groom-date"]').value);
        const bride = parseDate(form.querySelector('[name="bride-date"]').value);
        const from = parseDate(form.querySelector('[name="from-date"]').value);
        const to = parseDate(form.querySelector('[name="to-date"]').value);
        if (!groom || !bride || !from || !to) { $('#wedding-err').innerHTML = errBox('', '请填写双方出生日期与合法的扫描范围。'); return; }
        const weekendOnly = form.querySelector('[name="weekend"]').value === '1';
        let r;
        try { r = e.weddingScan({ groom: { year:groom.y, month:groom.mo, day:groom.d }, bride: { year:bride.y, month:bride.mo, day:bride.d }, from: { y:from.y, m:from.mo, d:from.d }, to: { y:to.y, m:to.mo, d:to.d }, weekendOnly }); } catch (err) { $('#wedding-err').innerHTML = errBox('', '择日扫描失败：'+safe(err&&err.message)); return; }
        if (!r) { $('#wedding-err').innerHTML = errBox('', '未返回择日结果，请检查日期范围。'); return; }
        const days = Array.isArray(r.days)?r.days:[];
        const rejected = Array.isArray(r.rejected)?r.rejected:[];
        const byReason = r.byReason||{};
        const tierCnMap = { top:'优选', good:'吉', fair:'平', poor:'忌' };
        const best = days[0];
        const dayCard = (p) => {
          if (!p) return '';
          const tierCls = { top:'omen-good', good:'omen-good', fair:'omen-flat', poor:'omen-bad' }[p.tier] || 'omen-flat';
          const rels = Array.isArray(p.relations)?p.relations.map(x=>chip(x.cn)).join(''):'';
          return '<div class="data-card wedding-day">'+
            '<div class="luck-card-top"><h3>'+safe(p.dateCn)+' <span class="weekday">'+safe((p.weekday&&p.weekday.cn)||'')+'</span></h3><span class="chip omen '+tierCls+'">'+safe(tierCnMap[p.tier]||p.tier||'—')+' · 评分 '+safe(p.score)+'</span></div>'+
            '<p>干支：'+safe(p.yearGz||'')+' / '+safe(p.monthGz||'')+' / '+safe(p.dayGz||'')+'　建除：'+safe(p.officer&&p.officer.cn)+'　二十八宿：'+safe(p.xiu&&p.xiu.cn)+'　纳音：'+safe(p.naYinCn)+'</p>'+
            '<p>黄黑道两法一致：'+(p.huangDaoAgree?'是':'否（两套黄道口径不同）')+'</p>'+
            (rels?'<p>与新人关系：'+rels+'</p>':'')+
            (Array.isArray(p.signals)&&p.signals.length?'<div class="wedding-signals">'+p.signals.map(s=>'<span class="chip">'+safe(s.cn)+'</span>').join('')+'</div>':'')+
            '</div>';
        };
        const reasonList = Object.keys(byReason).map(k=>'<span class="chip">'+safe(k)+' × '+safe(byReason[k])+'</span>').join('');
        $('#wedding-out').innerHTML =
          '<div class="tools-result">'+
          '<div class="tools-summary"><h3>扫描概况</h3><p>范围：'+safe(r.from.y)+'/'+safe(r.from.m)+'/'+safe(r.from.d)+' 至 '+safe(r.to.y)+'/'+safe(r.to.m)+'/'+safe(r.to.d)+'（'+(weekendOnly?'仅周末':'全部日期')+'）</p><p>共扫 '+safe(r.total||0)+' 日，合格 '+safe(r.passed||0)+' 日，硬性排除 '+safe(r.excluded||0)+' 日'+(r.weekendSkipped?'（周末过滤跳过 '+safe(r.weekendSkipped)+'）':'')+'</p><p>'+(reasonList||'无排除原因')+'</p></div>'+
          (best?'<div class="tools-summary"><h3>当前最优建议</h3>'+dayCard(best)+'</div>':'')+
          '<h4 class="tools-subhead">合格吉日（按评分排序，最多展示 10 个）</h4><div class="wedding-grid">'+(days.slice(0,10).map(dayCard).join('')||'<div class="empty">当前范围没有合格日期。</div>')+'</div>'+
          (rejected.length?'<h4 class="tools-subhead">被硬性排除的日期（最多 6 个示例）</h4><div class="tools-summary"><p>'+rejected.slice(0,6).map(x=>'<span class="chip">'+safe(x.dateCn)+'：'+safe((x.rejects&&x.rejects[0]&&x.rejects[0].cn)||'排除')+'</span>').join('')+'</p></div>':'')+
          '<p class="muted">评分与硬性排除按本站公开权重加总，非传统定论；四离四绝未纳入（浏览器端无节气时刻算法）。本站不据此保证婚姻或现实事件。</p>'+
          '</div>';
      }
    },
    hexagram: {
      title: '六十四卦', icon: '卦',
      desc: '输入卦序（1–64），查看卦名、卦象、上下卦、六爻、所属宫位与纳甲、错/综/互卦。',
      form: () => '<div class="tools-person-grid"><label>卦序（1–64）<input name="hex-n" type="number" min="1" max="64" value="1"></label></div><div class="tools-submit-row"><button class="primary" type="button" data-run="hexagram"><span>卦</span> 起卦查卦</button></div><div id="hexagram-err"></div><div id="hexagram-out"></div>',
      run: (form) => {
        const e = E();
        if (!e || typeof e.hexagramProfile !== 'function') { $('#hexagram-err').innerHTML = errBox('', '六十四卦功能暂不可用：当前引擎未加载或缺少该接口。'); return; }
        const n = Number(form.querySelector('[name="hex-n"]').value);
        if (!Number.isInteger(n) || n < 1 || n > 64) { $('#hexagram-err').innerHTML = errBox('', '请输入 1–64 之间的卦序。'); return; }
        let h;
        try { h = e.hexagramProfile(n); } catch (err) { $('#hexagram-err').innerHTML = errBox('', '卦象读取失败：'+safe(err&&err.message)); return; }
        if (!h) { $('#hexagram-err').innerHTML = errBox('', '未找到该卦象。'); return; }
        const lineCn = Array.isArray(h.lines)?h.lines.join('').split(''):[];
        const lineHtml = h.lines && Array.isArray(h.lines) ? h.lines.map((l,i) => '<div class="hex-line '+(l==='1'?'yang':'yin')+'"><i></i><span>第'+safe(6-i)+'爻</span></div>').join('') : '';
        const palace = h.palace || {};
        const najia = Array.isArray(h.najia)?h.najia:[];
        const njHtml = najia.map(x => '<div class="najia-item"><span>'+safe(x.pos||'')+'</span><b>'+safe(x.stem||'')+safe(x.branch||'')+'</b><em>'+safe(x.liuqin&&x.liuqin.cn||'—')+'</em></div>').join('');
        $('#hexagram-out').innerHTML =
          '<div class="tools-result">'+
          '<div class="tools-summary hex-head"><div class="hex-glyph-big">'+safe(h.glyph||'')+'</div><div><h3>'+safe(h.fullCn||h.cn||'')+'</h3><p>卦序 '+safe(h.n)+' · '+safe(h.py||'')+' · '+safe(h.en||'')+(h.pure?' · 八纯卦':'')+(h.selfReversing?' · 自相综卦':'')+'</p><p>上卦 '+safe(h.upper&&h.upper.trigram||'')+'，下卦 '+safe(h.lower&&h.lower.trigram||'')+'</p></div></div>'+
          '<h4 class="tools-subhead">卦象（自下而上）</h4><div class="hex-lines">'+ (lineHtml||'—') +'</div>'+
          '<div class="tools-summary"><h3>宫位与世应</h3><p>所属宫：'+safe(palace.trigram||'')+'（'+safe(palace.element||'')+'）　世应：'+safe(palace.stageCn||'')+'</p><p>错卦 '+safe(h.cuo||'')+' · 综卦 '+safe(h.zong||'')+' · 互卦 '+safe(h.hu||'')+'</p></div>'+
          (njHtml?'<h4 class="tools-subhead">纳甲装卦</h4><div class="najia-grid">'+njHtml+'</div>':'')+
          '<p class="muted">卦象为传统易学资料查询，本站不据此占断具体人事吉凶。</p>'+
          '</div>';
      }
    },
    kua: {
      title: '八宅命卦', icon: '宅',
      desc: '按出生日期与性别计算八宅命卦（东四命 / 西四命），列出八个方位的吉凶星。',
      form: () => '<div class="tools-person-grid">'+dateField('kua-date','1990-06-15')+'<label>性别<select name="kua-gender"><option value="1">男</option><option value="0">女</option></select></label></div><div class="tools-submit-row"><button class="primary" type="button" data-run="kua"><span>宅</span> 计算命卦</button></div><div id="kua-err"></div><div id="kua-out"></div>',
      run: (form) => {
        const e = E();
        if (!e || typeof e.kuaProfile !== 'function') { $('#kua-err').innerHTML = errBox('', '八宅命卦功能暂不可用：当前引擎未加载或缺少该接口。'); return; }
        const d = parseDate(form.querySelector('[name="kua-date"]').value);
        if (!d) { $('#kua-err').innerHTML = errBox('', '请填写合法出生日期。'); return; }
        const gender = Number(form.querySelector('[name="kua-gender"]').value);
        let k;
        try { k = e.kuaProfile(d.y, d.mo, d.d, gender, 12, 0); } catch (err) { $('#kua-err').innerHTML = errBox('', '命卦计算失败：'+safe(err&&err.message)); return; }
        if (!k) { $('#kua-err').innerHTML = errBox('', '未返回命卦结果。'); return; }
        const dirs = Array.isArray(k.directions)?k.directions:[];
        const luckCn = { 1:'吉', '-1':'凶' };
        const dirHtml = dirs.map(dr => {
          const lk = dr.luck;
          const cls = lk === 1 ? 'omen-good' : lk === -1 ? 'omen-bad' : 'omen-flat';
          return '<div class="data-card kua-dir"><div class="luck-card-top"><h3>'+safe(dr.dirCn||'')+'</h3><span class="chip omen '+cls+'">'+safe(luckCn[lk]||'—')+'</span></div><p>星：'+safe(dr.starCn||'')+'　五行：'+safe(dr.elCn||'')+'</p></div>';
        }).join('');
        $('#kua-out').innerHTML =
          '<div class="tools-result">'+
          '<div class="tools-summary"><h3>命卦</h3><p>命卦 '+safe(k.gua||'')+'（'+safe(k.guaPy||'')+'）　·　'+safe(k.groupCn||'')+'　·　五行 '+safe(k.elCn||'')+'　·　宅 '+(k.houseCn?k.houseCn:'—')+'</p><p>风水年（立春换年）：'+safe(k.fsYear||'')+'（'+safe(k.fsYearGanzhi||'')+'）</p></div>'+
          '<h4 class="tools-subhead">八方向吉凶</h4><div class="data-grid">'+ (dirHtml||'<div class="empty">—</div>') +'</div>'+
          '<p class="muted">八宅方位吉凶为传统风水派别分类；本站仅按命卦查表列出，不据此断言住宅或人事结果。</p>'+
          '</div>';
      }
    },
    name: {
      title: '姓名五行', icon: '名',
      desc: '按康熙部首派与笔画派对照姓名中每个字的五行，展示两派是否一致、合计五行分布。',
      form: () => '<div class="tools-person-grid"><label class="tools-name-input">姓名<input name="name-input" type="text" placeholder="例如：张伟" value=""></label></div><div class="tools-submit-row"><button class="primary" type="button" data-run="name"><span>名</span> 查姓名五行</button></div><div id="name-err"></div><div id="name-out"></div>',
      run: (form) => {
        const e = E();
        if (!e || typeof e.nameWuxingProfile !== 'function') { $('#name-err').innerHTML = errBox('', '姓名五行功能暂不可用：当前引擎未加载或缺少该接口。'); return; }
        const nm = String(form.querySelector('[name="name-input"]').value||'').trim();
        if (!nm) { $('#name-err').innerHTML = errBox('', '请输入姓名。'); return; }
        let r;
        try { r = e.nameWuxingProfile(nm); } catch (err) { $('#name-err').innerHTML = errBox('', '姓名五行计算失败：'+safe(err&&err.message)); return; }
        const chars = Array.isArray(r.chars)?r.chars:[];
        const formCounts = r.formCounts||{}, strokeCounts = r.strokeCounts||{};
        const elSpan = (el,n) => '<span class="chip '+elementClass(el)+'">'+safe(el)+' '+safe(n||0)+'</span>';
        const rowHtml = chars.map(c => {
          if (!c.known) return '<tr><td>'+safe(c.c)+'</td><td colspan="4" class="muted">字表未收录，不猜测五行</td></tr>';
          return '<tr><td>'+safe(c.c)+'</td><td>'+safe(c.py||'')+'</td><td>'+safe(c.formEl||'—')+'<small>（部首）</small></td><td>'+safe(c.strokeEl||'—')+'<small>（笔画 '+safe(c.kangxi||'')+'）</small></td><td>'+(c.agree?'一致':'两派分歧')+'</td></tr>';
        }).join('');
        const unknown = Array.isArray(r.unknownChars)?r.unknownChars:[];
        $('#name-out').innerHTML =
          '<div class="tools-result">'+
          '<div class="tools-summary"><h3>姓名五行</h3><p>共 '+safe(r.total||0)+' 字，已知 '+safe(r.known||0)+' 字；两派一致 '+safe(r.agreeCount||0)+' 字，分歧 '+safe(r.disagreeCount||0)+' 字。</p>'+(unknown.length?'<p class="muted">未收录：'+safe(unknown.join('、'))+'</p>':'')+'</div>'+
          '<div class="tools-summary"><h3>合计五行分布</h3><p>字形派：'+['木','火','土','金','水'].map(k=>elSpan(k,formCounts[k])).join('')+'</p><p>笔画派：'+['木','火','土','金','水'].map(k=>elSpan(k,strokeCounts[k])).join('')+'</p></div>'+
          '<div class="tools-table-wrap"><table class="tools-table"><thead><tr><th>字</th><th>拼音</th><th>字形五行</th><th>笔画五行</th><th>两派</th></tr></thead><tbody>'+ (rowHtml||'<tr><td colspan="5">—</td></tr>') +'</tbody></table></div>'+
          '<p class="muted">字形五行（康熙部首派）与笔画五行（康熙笔画个位数派）为两套公开体系，本站并列展示、不替读者选一种；姓名不等于人生吉凶。</p>'+
          '</div>';
      }
    },
    daily: {
      title: '每日干支', icon: '历',
      desc: '输入任意公历日期，查看该日四柱干支、建除十二神、二十八宿、旬空、纳音与时辰。',
      form: () => '<div class="tools-person-grid">'+dateField('daily-date','2026-11-03')+'</div><div class="tools-submit-row"><button class="primary" type="button" data-run="daily"><span>历</span> 查每日干支</button></div><div id="daily-err"></div><div id="daily-out"></div>',
      run: (form) => {
        const e = E();
        if (!e || typeof e.dailyProfile !== 'function') { $('#daily-err').innerHTML = errBox('', '每日干支功能暂不可用：当前引擎未加载或缺少该接口。'); return; }
        const d = parseDate(form.querySelector('[name="daily-date"]').value);
        if (!d) { $('#daily-err').innerHTML = errBox('', '请填写合法日期。'); return; }
        let p;
        try { p = e.dailyProfile(d.y, d.mo, d.d, 12, 0); } catch (err) { $('#daily-err').innerHTML = errBox('', '每日干支计算失败：'+safe(err&&err.message)); return; }
        if (!p) { $('#daily-err').innerHTML = errBox('', '未返回干支结果。'); return; }
        const voids = Array.isArray(p.voids)?p.voids:[];
        $('#daily-out').innerHTML =
          '<div class="tools-result">'+
          '<div class="tools-summary"><h3>'+safe(d.y)+'年'+safe(d.mo)+'月'+safe(d.d)+'日 干支</h3><p>年柱 '+safe((p.pillars&&p.pillars.year)||'')+' · 月柱 '+safe(p.monthGz||'')+' · 日柱 '+safe(p.dayGz||'')+' · 时柱（午时参考）'+safe((p.pillars&&p.pillars.hour)||'')+'</p></div>'+
          '<div class="tools-summary"><h3>当日信息</h3><p>建除十二神：'+safe((p.officer&&p.officer.cn)||'')+((p.officer&&p.officer.noteCn)?'（'+safe(p.officer.noteCn)+'）':'')+'　纳音：'+safe(p.naYinCn||'')+'</p><p>日支冲：'+safe(p.clashBranch||'')+'（'+safe(p.clashAnimalCn||'')+'）　旬空：'+(voids.length?voids.map(safe).join('、'):'无')+'　旬首：'+safe(p.xunStart||'')+'</p><p>时辰范围：'+safe(p.hourRange||'')+'</p></div>'+
          '<p class="muted">每日干支按传统历法排定，属资料查询；本站不据此断言当日吉凶或特定事务宜忌。</p>'+
          '</div>';
      }
    }
  };

  // 渲染默认视图（合盘）
  function renderActive(tab) {
    document.querySelectorAll('.tools-tabs .tab').forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    const view = toolViews[tab];
    if (!view) return;
    content.innerHTML = '<div class="tools-intro"><div class="tools-intro-icon">'+safe(view.icon||'')+'</div><div><h3>'+safe(view.title||'')+'</h3><p class="muted">'+safe(view.desc||'')+'</p></div></div>' + view.form();
  }

  // 标签切换
  document.querySelectorAll('.tools-tabs .tab').forEach(b => b.addEventListener('click', () => renderActive(b.dataset.tab)));

  // 按钮运行（事件委托）
  content.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-run]');
    if (!btn || !content.contains(btn)) return;
    const run = toolViews[btn.dataset.run] && toolViews[btn.dataset.run].run;
    if (run) run(content);
  });

  // 启动：默认渲染合盘
  renderActive('compat');
})();
