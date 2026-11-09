/* ===== P13 联动细盘 · 独立脚本 =====
   不改 app.js：从表单读出生参数，直接调用 BaziEngine 重算本命/大运/流年/流月。
   上方横表 = 大运 / 流年 / 流月 / 年 / 月 / 日 / 时 七列；
   下方三段横滚栏可点击，选中项联动更新对应运柱列并高亮。
   旺衰喜忌模块保持原位，本板块仅做运柱对照展示。 */
(function () {
  'use strict';
  var results = document.getElementById('results');
  var form = document.getElementById('birth-form');
  if (!results || !form) return;

  var GAN_ELEM = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
  var ZHI_ELEM = {寅:'木',卯:'木',巳:'火',午:'火',辰:'土',戌:'土',丑:'土',未:'土',申:'金',酉:'金',亥:'水',子:'水'};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function elemClass(gan, map) {
    var e = map[gan];
    return (e === '木' || e === '火' || e === '土' || e === '金' || e === '水') ? 'ps-e-' + e : 'ps-e-na';
  }

  function readBirth() {
    var fd = new FormData(form);
    var bd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fd.get('birthdate') || ''));
    if (!bd) return null;
    var year = +bd[1], month = +bd[2], day = +bd[3];
    var hourRaw = fd.get('hour'), hour = hourRaw === '' ? null : Number(hourRaw);
    var minute = Number(fd.get('minute'));
    var lngRaw = fd.get('longitude');
    var genderRaw = fd.get('gender');
    return {
      year: year, month: month, day: day, hour: hour, minute: minute,
      longitude: lngRaw === '' ? null : Number(lngRaw),
      tzOffsetHours: Number(fd.get('tzOffsetHours')),
      unknownTime: hour === null,
      sect: Number(fd.get('sect')),
      gender: genderRaw === '' ? null : Number(genderRaw)
    };
  }

  function beijingNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var v = Object.fromEntries(parts.filter(function (x) { return x.type !== 'literal'; }).map(function (x) { return [x.type, Number(x.value)]; }));
      return (v.year && v.month && v.day) ? v : null;
    } catch (e) { return null; }
  }

  var state = { birth: null, chart: null, luck: null, dayMaster: '—', selLuck: null, selAnnual: null, selMonth: 1, years: [], months: [] };

  function currentLunarYear(engine) {
    var now = beijingNow();
    if (!now) return new Date().getFullYear();
    try {
      var lc = engine.lichunOf(now.year);
      var before = now.month < lc.month ||
        (now.month === lc.month && now.day < lc.day) ||
        (now.month === lc.month && now.day === lc.day && now.hour < lc.hour) ||
        (now.month === lc.month && now.day === lc.day && now.hour === lc.hour && now.minute < lc.minute);
      return now.year - (before ? 1 : 0);
    } catch (e) { return now.year; }
  }

  function computeAll() {
    var engine = window.BaziEngine || {};
    var birth = readBirth();
    if (!birth || typeof engine.computeBazi !== 'function') return false;
    var chart;
    try { chart = engine.computeBazi(birth); } catch (e) { return false; }
    if (!chart || !chart.pillars) return false;

    var dayMaster = (chart.meta && chart.meta.dayMaster) || (chart.pillars.day && chart.pillars.day.ganzhi && chart.pillars.day.ganzhi.charAt(0)) || '—';
    var luck = null;
    if (birth.gender !== null && typeof engine.computeLuckPillars === 'function') {
      var now = beijingNow();
      var today = now ? now.year + '-' + String(now.month).padStart(2, '0') + '-' + String(now.day).padStart(2, '0') : undefined;
      try { luck = engine.computeLuckPillars({ year: birth.year, month: birth.month, day: birth.day, hour: birth.hour, minute: birth.minute, longitude: birth.longitude, tzOffsetHours: birth.tzOffsetHours, unknownTime: birth.unknownTime, sect: birth.sect, gender: birth.gender, count: 10, today: today }); } catch (e) { luck = null; }
    }

    var curYear = currentLunarYear(engine);
    var years = [];
    for (var y = curYear; y < curYear + 6; y++) {
      var prof = null;
      try { prof = engine.yearProfile(y); } catch (e) { prof = null; }
      if (prof && prof.ganzhi) years.push({ year: y, profile: prof });
    }

    state.birth = birth;
    state.chart = chart;
    state.luck = luck;
    state.dayMaster = dayMaster;
    state.years = years;
    state.selAnnual = state.selAnnual == null ? (years.length ? years[0].year : null) : state.selAnnual;

    // 默认大运：当前步，否则第一步
    var lp = luck && Array.isArray(luck.pillars) ? luck.pillars : [];
    if (state.selLuck == null) {
      var cur = luck && luck.current && luck.current.pill ? luck.current.pill.index : null;
      state.selLuck = cur != null ? cur : (lp.length ? lp[0].index : null);
    }
    // 默认流月：按公历月份粗略映射节气月
    var now = beijingNow();
    if (now && state.selMonth == null) state.selMonth = ((now.month + 10) % 12) + 1;
    refreshMonths();
    return true;
  }

  function refreshMonths() {
    var engine = window.BaziEngine || {};
    var found = state.years.find(function (x) { return x.year === state.selAnnual; });
    var months = found && found.profile && Array.isArray(found.profile.months) ? found.profile.months : [];
    state.months = months;
    if (state.selMonth < 1 || state.selMonth > months.length) state.selMonth = months.length ? 1 : 1;
  }

  // ---- 取各列数据 ----
  function natalColumns() {
    var chart = state.chart;
    var defs = [['year', '年柱'], ['month', '月柱'], ['day', '日柱'], ['time', '时柱']];
    var out = [];
    defs.forEach(function (d) {
      var key = d[0], label = d[1];
      var p = chart.pillars[key];
      if (!p || !p.ganzhi) return;
      var gz = p.ganzhi, stem = gz.charAt(0), branch = gz.charAt(1);
      var god = p.shiShenGan || (key === 'day' ? '日主' : '');
      out.push({ label: label, stem: stem, branch: branch, god: god, hidden: Array.isArray(p.hideGan) ? p.hideGan : [], nayin: p.naYin || '—', isDay: key === 'day' });
    });
    return out;
  }

  function luckColumn() {
    var lp = state.luck && Array.isArray(state.luck.pillars) ? state.luck.pillars : [];
    var p = lp.find(function (x) { return Number(x.index) === Number(state.selLuck); }) || lp[0];
    if (!p || !p.ganzhi) return null;
    var gz = p.ganzhi, stem = gz.charAt(0), branch = gz.charAt(1);
    var god = (p.stemTenGod && p.stemTenGod.god) || '—';
    return { label: '大运', stem: stem, branch: branch, god: god, hidden: Array.isArray(p.hideGan) ? p.hideGan : [], nayin: nayin(gz), meta: p.yearLabel || '' };
  }

  function annualColumn() {
    var engine = window.BaziEngine || {};
    var found = state.years.find(function (x) { return x.year === state.selAnnual; });
    if (!found) return null;
    var pr = found.profile, gz = pr.ganzhi, stem = pr.stem, branch = pr.branch;
    var god = tenGod(stem);
    return { label: '流年', stem: stem, branch: branch, god: god, hidden: branchHidden(branch), nayin: pr.nayin || nayin(gz), meta: String(found.year) };
  }

  function monthColumn() {
    var engine = window.BaziEngine || {};
    var m = state.months[state.selMonth - 1];
    if (!m || !m.ganzhi) return null;
    var gz = m.ganzhi, stem = m.stem, branch = m.branch;
    var god = tenGod(stem);
    return { label: '流月', stem: stem, branch: branch, god: god, hidden: branchHidden(branch), nayin: nayin(gz), meta: m.jie || '' };
  }

  function tenGod(stem) {
    var engine = window.BaziEngine || {};
    if (typeof engine.tenGodOf !== 'function' || !state.dayMaster) return '—';
    try { return engine.tenGodOf(state.dayMaster, stem) || '—'; } catch (e) { return '—'; }
  }
  function branchHidden(branch) {
    var engine = window.BaziEngine || {};
    if (typeof engine.branchProfile !== 'function') return [];
    try {
      var bp = engine.branchProfile(branch);
      return bp && Array.isArray(bp.hidden) ? bp.hidden.map(function (h) { return h.gan; }) : [];
    } catch (e) { return []; }
  }
  function nayin(gz) {
    var engine = window.BaziEngine || {};
    if (typeof engine.nayinOf !== 'function') return '—';
    try { var n = engine.nayinOf(gz); return n ? n.cn : '—'; } catch (e) { return '—'; }
  }

  // ---- 渲染 ----
  function gzSpan(gan, map) { return '<span class="' + elemClass(gan, map) + '">' + esc(gan) + '</span>'; }

  function cell(col, rowKey, active) {
    var inner = '—';
    if (!col) return '<div class="p13-cell' + (active ? ' p13-active' : '') + '">' + inner + '</div>';
    if (rowKey === 'god') inner = '<span class="p13-god">' + esc(col.god || '—') + '</span>';
    else if (rowKey === 'stem') inner = '<span class="p13-gz">' + gzSpan(col.stem, GAN_ELEM) + '</span>';
    else if (rowKey === 'branch') inner = '<span class="p13-gz">' + gzSpan(col.branch, ZHI_ELEM) + '</span>';
    else if (rowKey === 'hidden') {
      inner = col.hidden.length ? col.hidden.map(function (g) { return '<span class="p13-hidden ' + elemClass(g, GAN_ELEM) + '">' + esc(g) + '</span>'; }).join('') : '—';
    } else if (rowKey === 'nayin') inner = '<span class="p13-na">' + esc(col.nayin || '—') + '</span>';
    return '<div class="p13-cell' + (active ? ' p13-active' : '') + '">' + inner + '</div>';
  }

  function renderTable() {
    var luck = luckColumn(), annual = annualColumn(), month = monthColumn();
    var natal = natalColumns();
    var cols = [
      { col: luck, active: state.selLuck != null },
      { col: annual, active: true },
      { col: month, active: true, dash: true }
    ].concat(natal.map(function (c) { return { col: c, active: false }; }));

    var rows = [
      ['god', '主星'], ['stem', '天干'], ['branch', '地支'], ['hidden', '藏干'], ['nayin', '纳音']
    ];
    var head = '<div class="p13-row p13-headrow"><div class="p13-cell p13-rowlabel"></div>';
    cols.forEach(function (c, i) {
      var label = c.col ? c.col.label : '—';
      var meta = c.col && c.col.meta ? '<span class="p13-item-meta">' + esc(c.col.meta) + '</span>' : '';
      head += '<div class="p13-cell' + (c.dash ? ' p13-col-month' : '') + '">' + esc(label) + meta + '</div>';
    });
    head += '</div>';

    var body = rows.map(function (r) {
      var line = '<div class="p13-row"><div class="p13-cell p13-rowlabel">' + esc(r[1]) + '</div>';
      cols.forEach(function (c) { line += cell(c.col, r[0], c.active); });
      line += '</div>';
      return line;
    }).join('');

    var wrap = document.getElementById('p13-table');
    if (wrap) wrap.innerHTML = '<div class="p13-table">' + head + body + '</div>';
  }

  function renderTracks() {
    // 大运
    var lp = state.luck && Array.isArray(state.luck.pillars) ? state.luck.pillars : [];
    var luckTrack = document.getElementById('p13-luck');
    if (luckTrack) {
      luckTrack.innerHTML = lp.length ? lp.map(function (p) {
        var sel = Number(p.index) === Number(state.selLuck);
        var cur = p.isCurrent ? ' current' : '';
        var meta = [p.yearLabel || '', (p.startAgeSui != null ? '虚岁 ' + p.startAgeSui + '–' + (p.endAgeSui != null ? p.endAgeSui : '') : '')].filter(Boolean).join(' · ');
        return '<button type="button" class="p13-item' + (sel ? ' selected' : '') + cur + '" data-zone="luck" data-value="' + esc(p.index) + '">' +
          '<span class="p13-item-gz">' + esc(p.ganzhi || '—') + '</span>' +
          (meta ? '<span class="p13-item-meta">' + esc(meta) + '</span>' : '') + '</button>';
      }).join('') : '<span class="p13-item-meta">指定性别后显示大运</span>';
    }
    // 流年
    var annualTrack = document.getElementById('p13-annual');
    if (annualTrack) {
      annualTrack.innerHTML = state.years.length ? state.years.map(function (x) {
        var sel = x.year === state.selAnnual;
        return '<button type="button" class="p13-item' + (sel ? ' selected' : '') + '" data-zone="annual" data-value="' + esc(x.year) + '">' +
          '<span class="p13-item-gz">' + esc(x.profile.ganzhi) + '</span>' +
          '<span class="p13-item-meta">' + esc(x.year) + ' · ' + esc(x.profile.zodiacCn || '') + '</span></button>';
      }).join('') : '<span class="p13-item-meta">暂无可选流年</span>';
    }
    // 流月
    var monthTrack = document.getElementById('p13-month');
    if (monthTrack) {
      monthTrack.innerHTML = state.months.length ? state.months.map(function (m, i) {
        var sel = (i + 1) === state.selMonth;
        return '<button type="button" class="p13-item' + (sel ? ' selected' : '') + '" data-zone="month" data-value="' + esc(i + 1) + '">' +
          '<span class="p13-item-gz">' + esc(m.ganzhi) + '</span>' +
          '<span class="p13-item-meta">' + esc(m.jie || '') + '</span></button>';
      }).join('') : '<span class="p13-item-meta">暂无可选流月</span>';
    }
  }

  function renderBanner() {
    var banner = document.getElementById('p13-banner');
    if (!banner) return;
    var b = state.birth;
    var dateText = b.year + '-' + String(b.month).padStart(2, '0') + '-' + String(b.day).padStart(2, '0');
    if (b.hour != null) dateText += ' ' + String(b.hour).padStart(2, '0') + ':' + String(b.minute).padStart(2, '0');
    var genderText = b.gender === 1 ? '乾造' : b.gender === 0 ? '坤造' : '未注明';
    var sx = '—', lunarText = '—';
    try {
      if (window.Solar) {
        var s = window.Solar.fromYmdHms(b.year, b.month, b.day, b.hour == null ? 12 : b.hour, b.minute, 0);
        var l = s.getLunar();
        lunarText = l.getYearInGanZhi() + '年 ' + l.getMonthInChinese() + '月' + l.getDayInChinese();
        sx = l.getYearShengXiao() || '—';
      }
    } catch (e) { lunarText = '—'; }
    if (sx === '—') {
      try { sx = (window.BaziEngine.yearProfile(b.year).zodiacCn) || '—'; } catch (e) {}
    }
    banner.innerHTML =
      '<span class="p13-b-title">命盘信息</span>' +
      '<span class="p13-b-item"><span class="p13-b-label">阳历</span><b>' + esc(dateText) + '</b></span>' +
      '<span class="p13-b-item"><span class="p13-b-label">农历</span><b>' + esc(lunarText) + '</b></span>' +
      '<span class="p13-b-item"><span class="p13-b-label">生肖</span><b>' + esc(sx) + '</b></span>' +
      '<span class="p13-b-gender">' + esc(genderText) + '</span>';
  }

  function buildPanel() {
    var primary = results.querySelector('.results-primary');
    if (!primary) return;
    // 信息条（锚点 .result-title 位于 #results 下，不属于 primary）
    var title = results.querySelector('.result-title');
    var banner = document.getElementById('p13-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'p13-banner';
      if (title && title.nextSibling) results.insertBefore(banner, title.nextSibling);
      else results.insertBefore(banner, results.firstChild);
    }
    // 联动面板
    var panel = document.getElementById('p13-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'p13-panel';
      panel.className = 'p13-panel';
      panel.innerHTML =
        '<div class="p13-head"><h3>大运流年联动细盘</h3><span class="p13-hint">点击下方大运 / 流年 / 流月，上方对应运柱随之变化</span></div>' +
        '<div class="p13-table-wrap" id="p13-table"></div>' +
        '<div class="p13-scrolls">' +
        '<div class="p13-group"><span class="p13-group-label">大运</span><div class="p13-track" id="p13-luck"></div></div>' +
        '<div class="p13-group"><span class="p13-group-label">流年</span><div class="p13-track" id="p13-annual"></div></div>' +
        '<div class="p13-group"><span class="p13-group-label">流月</span><div class="p13-track" id="p13-month"></div></div>' +
        '</div>';
      var anchor = primary.querySelector('.side-panel');
      if (anchor && anchor.nextSibling) primary.insertBefore(panel, anchor.nextSibling);
      else {
        var overview = primary.querySelector('#overview-panel');
        if (overview && overview.nextSibling) primary.insertBefore(panel, overview.nextSibling);
        else primary.appendChild(panel);
      }
      panel.addEventListener('click', onTrackClick);
    }
    renderBanner();
    renderTable();
    renderTracks();
  }

  function onTrackClick(ev) {
    var btn = ev.target.closest('.p13-item');
    if (!btn || btn.disabled) return;
    var zone = btn.dataset.zone, val = btn.dataset.value;
    if (zone === 'luck') state.selLuck = Number(val);
    else if (zone === 'annual') { state.selAnnual = Number(val); state.selMonth = 1; refreshMonths(); }
    else if (zone === 'month') state.selMonth = Number(val);
    renderTable();
    renderTracks();
  }

  function clearPanel() {
    ['p13-banner', 'p13-panel'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.parentNode.removeChild(el);
    });
    state.selLuck = null; state.selAnnual = null; state.selMonth = 1;
  }

  function init() {
    try {
      if (results.hidden) { clearPanel(); return; }
      if (!document.getElementById('pillars-table')) return;
      var ok = computeAll();
      if (!ok) { clearPanel(); return; }
      buildPanel();
    } catch (e) {
      if (window.console && console.warn) console.warn('[P13] 初始化跳过：', e && e.message);
    }
  }

  if (window.MutationObserver) {
    try {
      new MutationObserver(function () { setTimeout(init, 0); }).observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    } catch (e) {}
  }
  init();
})();
