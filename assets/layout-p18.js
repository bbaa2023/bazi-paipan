/* ===== P18 出生地址三列滚轮选择器 · 独立脚本 =====
   不改 app.js：保留隐藏的原生 city 下拉作为数据载体，
   表单上合并为一个“出生地址”入口，弹窗内 省份 / 城市 / 区县 三列上下滚轮，
   分 国内 / 海外 两个页签并支持城市搜索。选定后写回 city 下拉并派发 change，
   由既有逻辑自动填入经度与 UTC 时区；经纬度沿用内置城市级数据。 */
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

  // ---- 从既有下拉解析 省/组 -> 城市（含经度、时区），不重复硬编码 ----
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

  // ---- 渲染 ----
  function fillList(list, values, cur, onPick) {
    list.innerHTML = '';
    values.forEach(function (v) {
      var opt = el('div', 'p18-opt' + (v === cur ? ' active' : ''), String(v));
      opt.setAttribute('data-v', v);
      list.appendChild(opt);
    });
    var idx = values.indexOf(cur);
    list.scrollTop = (idx < 0 ? 0 : idx) * ITEM_H;
    list.onpick = onPick;
  }
  function renderProv() {
    var gs = visibleGroups();
    if (state.prov >= gs.length) state.prov = 0;
    var names = gs.map(function (g) { return g.name; });
    fillList(listP, names, names[state.prov], function (v) {
      state.prov = names.indexOf(v); state.city = 0; renderCity(); renderDistrict();
    });
  }
  function renderCity() {
    var g = curGroup();
    var names = g.cities.map(function (c) { return c.name; });
    if (state.city >= names.length) state.city = 0;
    fillList(listC, names, names[state.city], function (v) {
      state.city = names.indexOf(v); renderDistrict();
    });
  }
  function renderDistrict() {
    fillList(listD, DISTRICTS, DISTRICTS[state.district], function (v) {
      state.district = DISTRICTS.indexOf(v);
    });
  }
  function renderAll() { renderProv(); renderCity(); renderDistrict(); }

  function bindList(list) {
    var timer = null;
    function pick() {
      var opts = [...list.children];
      var idx = Math.max(0, Math.min(opts.length - 1, Math.round(list.scrollTop / ITEM_H)));
      var v = opts[idx] ? opts[idx].getAttribute('data-v') : null;
      if (v != null && typeof list.onpick === 'function') list.onpick(v);
    }
    list.addEventListener('scroll', function () { clearTimeout(timer); timer = setTimeout(pick, 80); });
    list.addEventListener('click', function (ev) {
      var opt = ev.target.closest('.p18-opt'); if (!opt) return;
      var v = opt.getAttribute('data-v');
      var vals = [...list.children].map(function (o) { return o.getAttribute('data-v'); });
      var idx = vals.indexOf(v);
      list.scrollTop = idx * ITEM_H;
      if (typeof list.onpick === 'function') list.onpick(v);
    });
  }
  bindList(listP); bindList(listC); bindList(listD);

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
    citySelect.value = c.value;
    // 派发 change：复用既有 app.js 逻辑自动填入经度与时区
    citySelect.dispatchEvent(new Event('change', { bubbles: true }));
    refreshLabel();
    closeModal();
  });

  refreshLabel();
})();
