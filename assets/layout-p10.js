/* ===== P10 问真式三栏布局 · DOM 重组 =====
   左侧边栏 = 现有 tab 按钮迁移；右侧面板 = 临时切 luck tab 提取起运交运+大运数据。
   不改 app.js，旺衰喜忌模块保留在中间主列。 */
(function () {
  'use strict';
  var results = document.getElementById('results');
  if (!results) return;

  function setup() {
    var layout = results.querySelector('.results-layout');
    if (!layout || layout.dataset.p10) return;
    layout.dataset.p10 = '1';

    var primary = layout.querySelector('.results-primary');
    if (!primary) return;
    primary.classList.add('results-center');

    // 左侧边栏：迁移 tabs
    var sideNav = document.createElement('div');
    sideNav.className = 'side-nav';
    var tabs = primary.querySelector('.tabs');
    if (tabs) {
      layout.insertBefore(sideNav, layout.firstChild);
      sideNav.appendChild(tabs);
    }

    // 右侧面板
    var sidePanel = document.createElement('aside');
    sidePanel.className = 'side-panel';
    sidePanel.innerHTML = '<div class="sp-inner"><div class="sp-loading">正在加载起运信息…</div></div>';
    layout.appendChild(sidePanel);
  }

  // 从大运 tab 提取数据到右侧面板
  function extractLuck() {
    var spInner = document.querySelector('.side-panel .sp-inner');
    if (!spInner) return;

    var luckTab = document.querySelector('.tab[data-tab="luck"]');
    if (!luckTab) {
      spInner.innerHTML = '<div class="sp-empty">暂无可选大运 tab</div>';
      return;
    }

    var tabContent = document.getElementById('tab-content');
    if (!tabContent) return;

    var currentTab = document.querySelector('.tab.active');
    var currentName = currentTab ? currentTab.dataset.tab : 'details';

    // 切到 luck
    luckTab.click();

    setTimeout(function () {
      try {
        // 提取起运信息卡（第一个 data-card）
        var startCard = tabContent.querySelector('.data-card');
        // 提取大运卡片
        var luckItems = tabContent.querySelectorAll('.luck-item');

        var html = '';

        if (startCard) {
          // 只取起运信息的文本行，避免复制整个交互卡
          var paras = startCard.querySelectorAll('p');
          var lines = [];
          paras.forEach(function (p) {
            var t = p.textContent.trim();
            if (t && !p.classList.contains('muted')) lines.push(t);
          });
          html += '<div class="sp-card"><h4>起运交运</h4>';
          lines.forEach(function (l) { html += '<p>' + escapeHtml(l) + '</p>'; });
          html += '</div>';
        }

        if (luckItems.length) {
          html += '<div class="sp-card"><h4>大运时间轴</h4><div class="sp-luck-scroll">';
          luckItems.forEach(function (item) {
            var isCurrent = item.classList.contains('current');
            // 取干支和年份
            var h3 = item.querySelector('h3');
            var p = item.querySelectorAll('p');
            var gz = h3 ? h3.textContent.trim() : '';
            var yr = p && p[1] ? p[1].textContent.trim() : '';
            var label = gz.replace(' · 当前', '').replace(' · 关系已选', '');
            html += '<div class="sp-luck-item' + (isCurrent ? ' current' : '') + '">' +
                    '<b>' + escapeHtml(label) + '</b>' +
                    (yr ? '<small> ' + escapeHtml(yr) + '</small>' : '') +
                    '</div>';
          });
          html += '</div></div>';
        }

        if (!html) {
          html = '<div class="sp-empty">暂无大运信息（请在上方选择性别后重新排盘）</div>';
        }

        spInner.innerHTML = html;
      } catch (e) {
        spInner.innerHTML = '<div class="sp-empty">面板加载失败：' + escapeHtml(e.message) + '</div>';
      }

      // 切回原 tab
      if (currentName === 'luck') {
        luckTab.click();
      } else {
        var back = document.querySelector('.tab[data-tab="' + currentName + '"]');
        if (back) back.click();
      }
    }, 400);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 排盘完成 → setup + 提取大运
  var didExtract = false;
  var mo = new MutationObserver(function () {
    setup();
    if (!results.hidden && document.getElementById('pillars-table') && !didExtract) {
      didExtract = true;
      setTimeout(extractLuck, 600);
    }
  });
  mo.observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  setup();
})();
