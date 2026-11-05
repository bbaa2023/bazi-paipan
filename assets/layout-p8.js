/* ===== P8 四柱内嵌条 · 联动逻辑 =====
   独立于 app.js 运行：排盘渲染后从 #pillars 提取四柱干支，
   内嵌到旺衰/格局/喜忌板块（#overview-panel）顶部，随板块滚动对照；点击回完整命盘。 */
(function () {
  'use strict';
  var frame = document.getElementById('pillars');
  var inline = document.getElementById('pillars-inline');
  if (!frame || !inline) return;

  var LABEL_MAP = { year: '年柱', month: '月柱', day: '日柱', time: '时柱' };
  // 天干 / 地支 → 五行，用于内嵌条干支按五行着色
  var GAN_ELEM = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
  var ZHI_ELEM = {寅:'木',卯:'木',巳:'火',午:'火',辰:'土',戌:'土',丑:'土',未:'土',申:'金',酉:'金',亥:'水',子:'水'};
  function psColor(el) {
    return (el === '木' || el === '火' || el === '土' || el === '金' || el === '水') ? 'ps-e-' + el : 'ps-e-na';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fill() {
    var articles = frame.querySelectorAll('article.pillar');
    if (!articles.length) { inline.hidden = true; return; }
    var html = '';
    Array.prototype.forEach.call(articles, function (a) {
      var key = String(a.id || '').replace('pillar-', '');
      var chars = a.querySelectorAll('.pillar-character strong');
      var stem = chars[0] ? chars[0].textContent : '';
      var branch = chars[1] ? chars[1].textContent : '';
      var godEl = a.querySelector('.pillar-stem-god');
      var god = godEl ? godEl.textContent.trim() : '';
      var isDay = a.classList.contains('pillar-day-master');
      html += '<div class="ps-pillar' + (isDay ? ' ps-day' : '') + '" data-key="' + esc(key) + '" title="点击回到完整命盘">' +
        '<span class="ps-label">' + esc(LABEL_MAP[key] || (key + '柱')) + '</span>' +
        '<strong class="ps-gz"><span class="ps-gz-c ' + psColor(GAN_ELEM[stem]) + '">' + esc(stem) + '</span><span class="ps-gz-c ' + psColor(ZHI_ELEM[branch]) + '">' + esc(branch) + '</span></strong>' +
        '<span class="ps-god">' + esc(god || '—') + '</span></div>';
    });
    inline.innerHTML = html +
      '<button class="ps-back" type="button" title="回到完整命盘"><span class="ps-up">↑</span><span>命盘</span></button>';
    inline.hidden = false;
  }

  // 排盘渲染（#pillars 内容变化）→ 重新填充内嵌条
  if (window.MutationObserver) {
    try { new MutationObserver(fill).observe(frame, { childList: true, subtree: true }); } catch (e) { /* 降级：不监听 */ }
  }

  // 点击内嵌条任意处（含某柱）平滑回到完整命盘
  inline.addEventListener('click', function () {
    if (frame.scrollIntoView) frame.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 初始兜底
  fill();
})();
