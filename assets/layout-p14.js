/* ===== P14 五行个数比例条 · 独立脚本 =====
   不改 app.js：从表单重算本命，取主气天干地支个数（stemsBranchesOnly，整数）。
   对标问真「五行个数」：五行横条 + 右侧「N个 + 十神」，不再显示百分比；
   阵营力量对比（帮扶 / 克泄耗）同步改用个数。旺衰喜忌其余模块保持原位。 */
(function () {
  'use strict';
  var results = document.getElementById('results');
  var form = document.getElementById('birth-form');
  if (!results || !form) return;

  var KEYS = ['木', '火', '土', '金', '水'];
  var SHENG = ['木', '火', '土', '金', '水']; // 相生：木→火→土→金→水
  var KE = ['木', '土', '水', '火', '金'];    // 相克：木→土→水→火→金

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function readBirth() {
    var fd = new FormData(form);
    var bd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fd.get('birthdate') || ''));
    if (!bd) return null;
    var hourRaw = fd.get('hour');
    return {
      year: +bd[1], month: +bd[2], day: +bd[3],
      hour: hourRaw === '' ? null : Number(hourRaw),
      minute: Number(fd.get('minute')),
      longitude: fd.get('longitude') === '' ? null : Number(fd.get('longitude')),
      tzOffsetHours: Number(fd.get('tzOffsetHours')),
      unknownTime: hourRaw === '',
      sect: Number(fd.get('sect')),
      gender: fd.get('gender') === '' ? null : Number(fd.get('gender'))
    };
  }

  function getChart() {
    var eng = window.BaziEngine || {};
    var b = readBirth();
    if (!b || typeof eng.computeBazi !== 'function') return null;
    try { return eng.computeBazi(b); } catch (e) { return null; }
  }

  // 由日主五行推十神角色：印（生我）/ 比劫（同我）/ 食伤（我生）/ 财（我克）/ 官杀（克我）
  function rolesOf(dayElement) {
    var si = SHENG.indexOf(dayElement), ki = KE.indexOf(dayElement);
    if (si < 0 || ki < 0) return null;
    return {
      '印': SHENG[(si + 4) % 5],
      '比劫': dayElement,
      '食伤': SHENG[(si + 1) % 5],
      '财': KE[(ki + 1) % 5],
      '官杀': KE[(ki + 4) % 5]
    };
  }
  function godOf(roles, el) {
    for (var g in roles) if (roles[g] === el) return g;
    return '—';
  }

  function patch() {
    var overview = document.getElementById('overview-panel');
    if (!overview || results.hidden) return;
    var chart = getChart();
    if (!chart || !chart.fiveElements) return;

    // 主气天干地支个数（整数，对应问真「五行个数」口径）
    var fe = chart.fiveElements;
    var selected = fe.stemsBranchesOnly || fe.withHiddenHalfWeight || fe.withHiddenStems || {};
    var values = {};
    KEYS.forEach(function (k) { values[k] = Math.max(0, Number(selected[k]) || 0); });

    var dayElement = (chart.meta && chart.meta.dayElement) || '—';
    var roles = rolesOf(dayElement);

    // 1) 五行 → 个数 → 十神 比例条
    var cause = overview.querySelector('.fy-final-cause');
    if (cause) {
      var max = KEYS.reduce(function (m, k) { return Math.max(m, values[k]); }, 0);
      var rows = KEYS.map(function (el) {
        var n = values[el];
        var width = n > 0 ? Math.max(max > 0 ? Math.round(n / max * 100) : 0, 6) : 0;
        var god = roles ? godOf(roles, el) : '—';
        return '<div class="p14-row">' +
          '<span class="p14-el el-' + el + '">' + esc(el) + '</span>' +
          '<span class="p14-track"><i class="p14-fill el-' + el + '" style="width:' + width + '%"></i></span>' +
          '<span class="p14-count">' + n + '个 <b>' + esc(god) + '</b></span>' +
          '</div>';
      }).join('');
      cause.innerHTML = rows;
    }

    // 2) 阵营力量对比：帮扶 / 克泄耗 改用个数，不再显示百分比
    var helpElements = roles ? [roles['印'], roles['比劫']] : [];
    var drainElements = roles ? [roles['食伤'], roles['财'], roles['官杀']] : [];
    var helpScore = helpElements.reduce(function (s, e) { return s + (values[e] || 0); }, 0);
    var drainScore = drainElements.reduce(function (s, e) { return s + (values[e] || 0); }, 0);

    var labels = overview.querySelector('.fy-final-balance-labels');
    if (labels) {
      var h = labels.querySelector('.help'), d = labels.querySelector('.drain');
      if (h) h.textContent = '帮扶 ' + helpScore + ' 个';
      if (d) d.textContent = '克泄耗 ' + drainScore + ' 个';
    }
    var bar = overview.querySelector('.fy-final-bar');
    if (bar) {
      var total = helpScore + drainScore;
      var hi = bar.querySelector('.help'), di = bar.querySelector('.drain');
      if (hi) hi.style.width = (total > 0 ? (helpScore / total * 100) : 0).toFixed(2) + '%';
      if (di) di.style.width = (total > 0 ? (drainScore / total * 100) : 0).toFixed(2) + '%';
    }
  }

  function init() { setTimeout(patch, 0); }
  if (window.MutationObserver) {
    try {
      new MutationObserver(init).observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
    } catch (e) {}
  }
  init();
})();
