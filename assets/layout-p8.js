/* ===== P8 吸顶迷你四柱条 · 联动逻辑 =====
   独立于 app.js 运行：排盘渲染后从 #pillars 提取四柱干支，
   滚动到分析区时顶部滑入一条四柱常驻，点击回完整命盘。 */
(function () {
  'use strict';
  var results = document.getElementById('results');
  var frame = document.getElementById('pillars');
  var sticky = document.getElementById('pillars-sticky');
  if (!results || !frame || !sticky) return;

  var LABEL_MAP = { year: '年柱', month: '月柱', day: '日柱', time: '时柱' };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fill() {
    var articles = frame.querySelectorAll('article.pillar');
    if (!articles.length) { sticky.hidden = true; return; }
    var html = '';
    Array.prototype.forEach.call(articles, function (a) {
      var key = String(a.id || '').replace('pillar-', '');
      var chars = a.querySelectorAll('.pillar-character strong');
      var gz = (chars[0] ? chars[0].textContent : '') + (chars[1] ? chars[1].textContent : '');
      var godEl = a.querySelector('.pillar-stem-god');
      var god = godEl ? godEl.textContent.trim() : '';
      var isDay = a.classList.contains('pillar-day-master');
      html += '<div class="ps-pillar' + (isDay ? ' ps-day' : '') + '" data-key="' + esc(key) + '" title="点击回到完整命盘">' +
        '<span class="ps-label">' + esc(LABEL_MAP[key] || (key + '柱')) + '</span>' +
        '<strong class="ps-gz">' + esc(gz) + '</strong>' +
        '<span class="ps-god">' + esc(god || '—') + '</span></div>';
    });
    sticky.innerHTML = html +
      '<button class="ps-back" type="button" title="回到完整命盘"><span class="ps-up">↑</span><span>命盘</span></button>';
    sticky.hidden = false;
  }

  function topbarHeight() {
    var tb = document.querySelector('.topbar');
    if (!tb) return 0;
    var r = tb.getBoundingClientRect();
    return (r && typeof r.bottom === 'number') ? r.bottom : 0;
  }

  function compute() {
    if (results.hidden || sticky.hidden) { sticky.classList.remove('ps-visible'); return; }
    var r = frame.getBoundingClientRect();
    // 完整命盘已滚出顶部（其底部越过顶栏之下）时才吸顶，回到顶部即收起
    var show = (typeof r.bottom === 'number') && (r.bottom < topbarHeight() + 30);
    sticky.style.top = topbarHeight() + 'px';
    sticky.classList.toggle('ps-visible', show);
  }

  // 排盘渲染（#pillars 内容变化）→ 重新填充；结果显隐变化 → 重新计算吸顶。
  // 注意：fill 会修改吸顶条（不在 #pillars 子树内），故不会自我触发；compute 只监听 hidden 属性。
  if (window.MutationObserver) {
    try {
      new MutationObserver(fill).observe(frame, { childList: true, subtree: true });
      new MutationObserver(compute).observe(results, { attributes: true, attributeFilter: ['hidden'] });
    } catch (e) { /* 降级：不监听 */ }
  }

  // 滚动 / 窗口变化联动
  if (window.addEventListener) {
    window.addEventListener('scroll', compute, { passive: true });
    window.addEventListener('resize', compute);
  }

  // 点击吸顶条任意处（含某柱）平滑回到完整命盘
  sticky.addEventListener('click', function () {
    if (frame.scrollIntoView) frame.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // 初始兜底
  fill();
  compute();
})();
