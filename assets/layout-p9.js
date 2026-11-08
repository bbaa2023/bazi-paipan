/* ===== P9 问真式四柱横表 · 重排逻辑 =====
   读取 app.js 渲染的 article.pillar 数据，生成横表替换竖向卡片视图。
   不改动 app.js，原始卡片保留在 DOM 中（隐藏）供事件绑定。 */
(function () {
  'use strict';
  var pillarsBox = document.getElementById('pillars');
  if (!pillarsBox) return;

  var GAN_ELEM = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
  var ZHI_ELEM = {寅:'木',卯:'木',巳:'火',午:'火',辰:'土',戌:'土',丑:'土',未:'土',申:'金',酉:'金',亥:'水',子:'水'};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function render() {
    var articles = pillarsBox.querySelectorAll('article.pillar');
    if (!articles.length) return;

    var data = [];
    Array.prototype.forEach.call(articles, function (a) {
      var key = (a.id || '').replace('pillar-', '');
      var labelEl = a.querySelector('.pillar-label');
      var godEl = a.querySelector('.pillar-stem-god');
      var chars = a.querySelectorAll('.pillar-character');
      var stem = (chars[0] && chars[0].querySelector('strong')) ? chars[0].querySelector('strong').textContent.trim() : '';
      var branch = (chars[1] && chars[1].querySelector('strong')) ? chars[1].querySelector('strong').textContent.trim() : '';
      var hiddenRows = a.querySelectorAll('.hidden-stem-row');
      var hidden = [];
      Array.prototype.forEach.call(hiddenRows, function (r) {
        var gan = r.querySelector('.hidden-stem-gan');
        if (gan) hidden.push(gan.textContent.trim());
      });
      var nayinEl = a.querySelector('.pillar-nayin b');
      var shenshaEls = a.querySelectorAll('.pillar-shensha-list em');
      var shensha = [];
      Array.prototype.forEach.call(shenshaEls, function (e) {
        var t = e.textContent.trim();
        if (t) shensha.push(t);
      });
      data.push({
        key: key,
        label: labelEl ? labelEl.textContent.trim() : key,
        god: godEl ? godEl.textContent.trim() : '',
        stem: stem,
        branch: branch,
        hidden: hidden,
        nayin: nayinEl ? nayinEl.textContent.trim() : '',
        shensha: shensha
      });
    });

    if (!data.length) return;

    function cell(d, inner) {
      return '<div class="pt-cell' + (d.key === 'day' ? ' pt-day' : '') + '">' + inner + '</div>';
    }
    function row(label, cellsHtml) {
      return '<div class="pt-row"><div class="pt-cell pt-rowlabel">' + label + '</div>' + cellsHtml + '</div>';
    }

    var html = '';
    // 列头
    html += '<div class="pt-row pt-head"><div class="pt-cell pt-rowlabel"></div>';
    data.forEach(function (d) { html += cell(d, esc(d.label)); });
    html += '</div>';
    // 主星（十神）
    html += row('主星', data.map(function (d) { return cell(d, esc(d.god || '—')); }).join(''));
    // 天干
    html += row('天干', data.map(function (d) {
      var el = GAN_ELEM[d.stem] || 'na';
      return cell(d, '<span class="pt-gz ps-e-' + el + '">' + esc(d.stem) + '</span>');
    }).join(''));
    // 地支
    html += row('地支', data.map(function (d) {
      var el = ZHI_ELEM[d.branch] || 'na';
      return cell(d, '<span class="pt-gz ps-e-' + el + '">' + esc(d.branch) + '</span>');
    }).join(''));
    // 藏干
    html += row('藏干', data.map(function (d) {
      var h = d.hidden.map(function (g) {
        var el = GAN_ELEM[g] || 'na';
        return '<span class="pt-hidden ps-e-' + el + '">' + esc(g) + '</span>';
      }).join('');
      return cell(d, h || '—');
    }).join(''));
    // 纳音
    html += row('纳音', data.map(function (d) { return cell(d, esc(d.nayin || '—')); }).join(''));
    // 神煞
    html += row('神煞', data.map(function (d) {
      var s = d.shensha.join('·');
      return cell(d, '<span class="pt-shensha">' + (s ? esc(s) : '—') + '</span>');
    }).join(''));

    var table = document.getElementById('pillars-table');
    if (!table) {
      table = document.createElement('div');
      table.id = 'pillars-table';
      pillarsBox.parentNode.insertBefore(table, pillarsBox);
    }
    table.innerHTML = '<div class="pt-table">' + html + '</div>';
  }

  // #pillars 内容变化 → 延迟重排横表
  if (window.MutationObserver) {
    try {
      new MutationObserver(function () {
        setTimeout(render, 0);
      }).observe(pillarsBox, { childList: true, subtree: true });
    } catch (e) { /* 降级 */ }
  }
  render();
})();
