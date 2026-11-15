/* ===== P18 出生地址两级级联下拉 · 独立脚本 =====
   不改 app.js：保留隐藏的原生 city 下拉作为数据载体，
   表单上替换为“省份 + 城市”两级下拉，选省后联动出该省市。
   经度按省级大块（省会）取值，国内时区 UTC+8；海外城市带独立时区。
   选定后写回 city 下拉并派发 change，由既有逻辑自动填入经度与时区。 */
(function () {
  'use strict';
  var form = document.getElementById('birth-form');
  if (!form) return;
  var citySelect = form.querySelector('[name="city"]');
  if (!citySelect) return;

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
    var groups = d.domestic.map(function (g) {
      return { type: 'dom', name: g.p, lng: g.lng, tz: 8, cities: g.c.slice() };
    });
    groups.push({
      type: 'ovr', name: '海外', lng: null, tz: null,
      cities: d.overseas.map(function (x) { return { name: x[0], lng: x[1], tz: x[2] }; })
    });
    return groups;
  }
  function buildFromSelect() {
    var groups = [];
    Array.prototype.forEach.call(citySelect.querySelectorAll('optgroup'), function (g) {
      var cities = [], lng = 8;
      Array.prototype.forEach.call(g.querySelectorAll('option'), function (o) {
        if (!o.value) return;
        var p = o.value.split('|');
        cities.push(o.textContent.trim());
        if (groups.length === 0) lng = Number(p[1]);
      });
      if (g.label === '海外') {
        groups.push({ type: 'ovr', name: '海外', lng: null, tz: null, cities: cities });
      } else if (cities.length) {
        groups.push({ type: 'dom', name: g.label, lng: lng, tz: 8, cities: cities });
      }
    });
    return groups;
  }
  var groups = buildFromData() || buildFromSelect();

  // ---- 隐藏原城市下拉，注入两级下拉 ----
  var cityLabel = citySelect.closest('label');
  if (cityLabel) cityLabel.classList.add('p18-hidden');

  var field = el('div', 'p18-field');
  field.appendChild(el('span', 'p18-field-title', '出生地址'));
  var row = el('div', 'p18-row');

  var provSel = el('select', 'p18-prov');
  var citySel = el('select', 'p18-city');
  var provPh = el('option', '', '省份'); provPh.value = '';
  provSel.appendChild(provPh);
  groups.forEach(function (g, i) {
    var o = el('option', '', g.name); o.value = String(i); provSel.appendChild(o);
  });
  var cityPh = el('option', '', '城市'); cityPh.value = '';
  citySel.appendChild(cityPh);
  row.appendChild(provSel); row.appendChild(citySel);
  field.appendChild(row);
  if (cityLabel && cityLabel.parentNode) cityLabel.parentNode.insertBefore(field, cityLabel);

  function currentGroup() {
    var i = Number(provSel.value);
    return Number.isFinite(i) && groups[i] ? groups[i] : null;
  }
  function cityName(c) { return typeof c === 'string' ? c : c.name; }

  function rebuildCities(selectName) {
    var g = currentGroup();
    citySel.innerHTML = '';
    var ph = el('option', '', '城市'); ph.value = ''; citySel.appendChild(ph);
    if (!g) return;
    g.cities.forEach(function (c, i) {
      var o = el('option', '', cityName(c)); o.value = String(i);
      citySel.appendChild(o);
    });
    var idx = selectName ? g.cities.findIndex(function (c) { return cityName(c) === selectName; }) : 0;
    citySel.value = String(idx >= 0 ? idx : 0);
  }

  function ensureOption(value, name) {
    var hit = Array.prototype.find.call(citySelect.options, function (o) { return o.value === value; });
    if (!hit) {
      var opt = el('option'); opt.value = value; opt.textContent = name;
      citySelect.appendChild(opt);
    }
  }

  function commit() {
    var g = currentGroup();
    if (!g || !citySel.value) {
      citySelect.value = '';
      citySelect.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    var c = g.cities[Number(citySel.value)];
    if (!c) return;
    var name = cityName(c);
    var lng = g.type === 'ovr' ? c.lng : g.lng;
    var tz = g.type === 'ovr' ? c.tz : g.tz;
    var value = name + '|' + lng + '|' + tz;
    ensureOption(value, name);
    citySelect.value = value;
    // 派发 change：复用既有 app.js 逻辑自动填入经度与时区
    citySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  provSel.addEventListener('change', function () { rebuildCities(); commit(); });
  citySel.addEventListener('change', commit);

  // ---- 初始回显：从隐藏控件反推省 / 市 ----
  (function syncFromControl() {
    var v = String(citySelect.value || '');
    if (!v) return;
    var name = v.split('|')[0];
    var ovIdx = groups.findIndex(function (g) {
      return g.type === 'ovr' && g.cities.some(function (c) { return cityName(c) === name; });
    });
    if (ovIdx >= 0) {
      provSel.value = String(ovIdx); rebuildCities(name); return;
    }
    var domIdx = groups.findIndex(function (g) {
      return g.type === 'dom' && g.cities.indexOf(name) >= 0;
    });
    if (domIdx >= 0) {
      provSel.value = String(domIdx); rebuildCities(name);
    }
  })();
})();
