/* ===== P18 出生地址三列滚轮选择器 · 独立脚本 =====
   不改 app.js：保留隐藏的原生 city 下拉作为数据载体，
   表单上合并为一个“出生地址”入口，弹窗内 省份 / 城市 / 区县 三列滚轮，
   分 国内 / 海外 两个页签并支持城市搜索。城市经纬度来自 city-data.js。
   滚轮按整项步进：每个滚动事件只移动一项，避免惯性一次跳两项；点击选项直达定位。 */
(function () {
  'use strict';
  var form = document.getElementById('birth-form');
  if (!form) return;
  var citySelect = form.querySelector('[name="city"]');
  if (!citySelect) return;

  var ITEM_H = 36;
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---- 数据：优先 city-data.js；回退解析既有下拉 ----
  function buildFromData() {
    var d = window.CITY_DATA;
    if (!d) return null;
    var domestic = d.domestic.map(function (g) {
      return {
        name: g.p,
        cities: g.c.map(function (x) {
          return { name: x[0], lng: x[1], tz: 8, value: x[0] + '|' + x[1] + '|8' };
        })
      };
    });
    var overseas = [{
      name: '海外',
      cities: d.overseas.map(function (x) {
        return { name: x[0], lng: x[1], tz: x[2], value: x[0] + '|' + x[1] + '|' + x[2] };
      })
    }];
    return { domestic: domestic, overseas: overseas };
  }
  function buildFromSelect() {
    var domestic = [], overseas = [];
    Array.prototype.forEach.call(citySelect.querySelectorAll('optgroup'), function (g) {
      var cities = Array.prototype.map.call(g.querySelectorAll('option'), function (o) {
        if (!o.value) return null;
        var p = o.value.split('|');
        return { name: o.textContent.trim(), value: o.value, lng: Number(p[1]), tz: Number(p[2]) };
      }).filter(Boolean);
      if (g.label === '海外') overseas.push({ name: '海外', cities: cities });
      else domestic.push({ name: g.label, cities: cities });
    });
    return { domestic: domestic, overseas: overseas };
  }
  var data = buildFromData() || buildFromSelect();
  var domestic = data.domestic, overseas = data.overseas;
  if (!overseas.length) overseas.push({ name: '海外', cities: [] });

  var DISTRICTS = ['全市'];
  var state = { tab: 'domestic', prov: 0, city: 0, district: 0, kw: '' };

  // ---- 隐藏原城市下拉，插入地址展示框 ----
  var cityLabel = citySelect.closest('label');
  if (cityLabel) cityLabel.classList.add('p18-hidden');

  var field = el('div', 'p18-field');
  field.appendChild(el('span', 'p18-field-title', '出生地址'));
  var addrBtn = el('button', 'p18-addr-btn'); addrBtn.type = 'button';
  var addrText = el('span', 'p18-addr-text');
  var addrArrow = el('span', 'p18-addr-arrow', '▾');
  addrBtn.appendChild(addrText); addrBtn.appendChild(addrArrow);
  field.appendChild(addrBtn);
  if (cityLabel && cityLabel.parentNode) cityLabel.parentNode.insertBefore(field, cityLabel);

  // ---- 弹窗 ----
  var modal = el('div', 'p18-modal'); modal.id = 'p18-modal'; modal.hidden = true;
  var mask = el('div', 'p18-mask'); mask.setAttribute('data-close', '1');
  var sheet = el('div', 'p18-sheet');

  var tabs = el('div', 'p18-tabs');
  var tabDom = el('button', 'p18-tab active', '国内'); tabDom.type = 'button'; tabDom.setAttribute('data-cal', 'domestic');
  var tabOvr = el('button', 'p18-tab', '海外'); tabOvr.type = 'button'; tabOvr.setAttribute('data-cal', 'overseas');
  var closeBtn = el('button', 'p18-close', '×'); closeBtn.type = 'button'; closeBtn.setAttribute('data-close', '1');
  tabs.appendChild(tabDom); tabs.appendChild(tabOvr); tabs.appendChild(closeBtn);

  var searchWrap = el('div', 'p18-search-wrap');
  var searchIcon = el('span', 'p18-search-icon', '⌕');
  var searchInput = el('input', 'p18-search');
  searchInput.type = 'text'; searchInput.placeholder = '搜索全国城市及地区';
  searchWrap.appendChild(searchIcon); searchWrap.appendChild(searchInput);

  var colsBox = el('div', 'p18-cols');
  var colP = el('div', 'p18-col'); colP.appendChild(el('div', 'p18-col-label', '省份'));
  var colC = el('div', 'p18-col'); colC.appendChild(el('div', 'p18-col-label', '城市'));
  var colD = el('div', 'p18-col'); colD.appendChild(el('div', 'p18-col-label', '区县'));
  var listP = el('div', 'p18-col-list'), listC = el('div', 'p18-col-list'), listD = el('div', 'p18-col-list');
  colP.appendChild(listP); colC.appendChild(listC); colD.appendChild(listD);
  colsBox.appendChild(colP); colsBox.appendChild(colC); colsBox.appendChild(colD);

  var actions = el('div', 'p18-actions');
  var cancelBtn = el('button', 'p18-btn p18-cancel', '取消'); cancelBtn.type = 'button'; cancelBtn.setAttribute('data-close', '1');
  var okBtn = el('button', 'p18-btn p18-ok', '确定'); okBtn.type = 'button'; okBtn.id = 'p18-ok';
  actions.appendChild(cancelBtn); actions.appendChild(okBtn);

  sheet.appendChild(tabs); sheet.appendChild(searchWrap); sheet.appendChild(colsBox); sheet.appendChild(actions);
  modal.appendChild(mask); modal.appendChild(sheet);
  document.body.appendChild(modal);

  // ---- 数据访问 ----
  function groups() { return state.tab === 'overseas' ? overseas : domestic; }
  function visibleGroups() {
    var gs = groups();
    if (!state.kw) return gs;
    return gs.map(function (g) {
      return { name: g.name, cities: g.cities.filter(function (c) {
        return c.name.indexOf(state.kw) >= 0 || g.name.indexOf(state.kw) >= 0;
      }) };
    }).filter(function (g) { return g.cities.length; });
  }
  function curGroup() { var gs = visibleGroups(); return gs[state.prov] || gs[0] || { name: '', cities: [] }; }
  function curCity() { var g = curGroup(); return g.cities[state.city] || g.cities[0] || null; }
  function provNames() { return visibleGroups().map(function (g) { return g.name; }); }
  function cityNames() { return curGroup().cities.map(function (c) { return c.name; }); }

  // ---- 渲染 ----
  function renderList(list, values, idx) {
    list.innerHTML = '';
    values.forEach(function (v) {
      var opt = el('div', 'p18-opt' + (v === values[idx] ? ' active' : ''), String(v));
      opt.setAttribute('data-v', v);
      list.appendChild(opt);
    });
    if (idx < 0) idx = 0;
    list.scrollTop = idx * ITEM_H;
  }
  function renderProv() {
    var names = provNames();
    if (state.prov >= names.length) state.prov = 0;
    renderList(listP, names, state.prov);
  }
  function renderCity() {
    var names = cityNames();
    if (state.city >= names.length) state.city = 0;
    renderList(listC, names, state.city);
  }
  function renderDistrict() { renderList(listD, DISTRICTS, state.district); }
  function renderAll() { renderProv(); renderCity(); renderDistrict(); }

  // 滚轮：每个滚动事件只走一项，避免惯性跳项；点击选项直达。
  function bindList(list, getValues, getIdx, setIdx, onPick, renderSelf) {
    list.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var len = getValues().length;
      if (!len) return;
      var dir = ev.deltaY > 0 ? 1 : -1;
      var n = Math.max(0, Math.min(len - 1, getIdx() + dir));
      if (n !== getIdx()) { setIdx(n); renderSelf(); onPick(n); }
    }, { passive: false });
    list.addEventListener('click', function (ev) {
      var opt = ev.target.closest('.p18-opt'); if (!opt) return;
      var vals = getValues();
      var idx = vals.indexOf(opt.getAttribute('data-v'));
      if (idx < 0) return;
      setIdx(idx); renderSelf(); onPick(idx);
    });
  }
  bindList(listP, provNames, function () { return state.prov; }, function (i) { state.prov = i; }, function () {
    state.city = 0; renderCity(); renderDistrict();
  }, renderProv);
  bindList(listC, cityNames, function () { return state.city; }, function (i) { state.city = i; }, function () {
    renderDistrict();
  }, renderCity);
  bindList(listD, function () { return DISTRICTS; }, function () { return state.district; }, function (i) { state.district = i; }, function () {}, renderDistrict);

  // ---- 页签 / 搜索 ----
  tabs.addEventListener('click', function (ev) {
    var t = ev.target.closest('.p18-tab'); if (!t) return;
    state.tab = t.getAttribute('data-cal');
    state.prov = 0; state.city = 0; state.kw = ''; searchInput.value = '';
    tabDom.classList.toggle('active', state.tab === 'domestic');
    tabOvr.classList.toggle('active', state.tab === 'overseas');
    renderAll();
  });
  searchInput.addEventListener('input', function () {
    state.kw = searchInput.value.trim();
    state.prov = 0; state.city = 0;
    renderAll();
  });

  // ---- 打开 / 关闭 ----
  function findByValue(v) {
    var all = domestic.concat(overseas);
    for (var i = 0; i < all.length; i++) {
      var hit = all[i].cities.find(function (c) { return c.value === v; });
      if (hit) return { prov: all[i].name, city: hit };
    }
    return null;
  }
  function refreshLabel() {
    var cur = findByValue(citySelect.value);
    addrText.textContent = cur ? cur.prov + ' · ' + cur.city.name : '未知地';
  }
  function openModal() {
    var cur = findByValue(citySelect.value);
    var inOvr = overseas.some(function (g) { return g.cities.some(function (c) { return c.value === citySelect.value; }); });
    state.tab = inOvr ? 'overseas' : 'domestic';
    tabDom.classList.toggle('active', state.tab === 'domestic');
    tabOvr.classList.toggle('active', state.tab === 'overseas');
    var gs = groups();
    state.prov = cur ? Math.max(0, gs.findIndex(function (g) { return g.name === cur.prov; })) : 0;
    var g = gs[state.prov];
    state.city = cur && g ? Math.max(0, g.cities.findIndex(function (c) { return c.value === citySelect.value; })) : 0;
    state.kw = ''; searchInput.value = '';
    renderAll();
    modal.hidden = false;
    document.body.classList.add('p18-locked');
  }
  function closeModal() { modal.hidden = true; document.body.classList.remove('p18-locked'); }
  addrBtn.addEventListener('click', openModal);
  modal.addEventListener('click', function (ev) { if (ev.target.getAttribute('data-close')) closeModal(); });

  okBtn.addEventListener('click', function () {
    var c = curCity();
    if (!c) { closeModal(); return; }
    // 原生 select 只接受已有 option 的值；新数据城市先补齐对应 option 再写回
    var hit = Array.prototype.find.call(citySelect.options, function (o) { return o.value === c.value; });
    if (!hit) {
      var opt = el('option'); opt.value = c.value; opt.textContent = c.name;
      citySelect.appendChild(opt);
    }
    citySelect.value = c.value;
    // 派发 change：复用既有 app.js 逻辑自动填入经度与时区
    citySelect.dispatchEvent(new Event('change', { bubbles: true }));
    refreshLabel();
    closeModal();
  });

  refreshLabel();
})();
