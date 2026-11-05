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
  // 天干 / 地支 → 五行，用于吸顶条干支按五行着色
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
    if (!articles.length) { sticky.hidden = true; return; }
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
    // 到旺衰/格局/喜忌（#overview-panel）顶部进入视口后才浮现，避免与命盘同屏显得乱
    var ov = document.getElementById('overview-panel');
    if (!ov) { sticky.classList.remove('ps-visible'); return; }
    var ovTop = ov.getBoundingClientRect().top;
    var show = (typeof ovTop === 'number') && (ovTop < topbarHeight() + 40);
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
