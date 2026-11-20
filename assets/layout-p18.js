/* ===== P18 出生地址两级级联下拉 · 修正版 =====
   省份与地市严格按同一数据组联动；先选省份，再选地市。
   选择省份时不再擅自默认第一座城市，避免出现“省市对不上”的错觉。
   隐藏的原生 city 控件继续承接旧排盘逻辑，兼容经度与时区写回。 */
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
  function cityName(c) { return typeof c === 'string' ? c : c.name; }

  // 数据源优先使用独立城市表；回退时逐组读取原生下拉，不能误用上一组的经度。
  function buildFromData() {
    var d = window.CITY_DATA;
    if (!d || !Array.isArray(d.domestic) || !Array.isArray(d.overseas)) return null;
    var groups = d.domestic.filter(function (g) {
      return g && typeof g.p === 'string' && Array.isArray(g.c) && g.c.length;
    }).map(function (g) {
      return {
        type: 'dom',
        name: g.p,
        lng: Number(g.lng),
        tz: 8,
        cities: g.c.filter(function (c) { return typeof c === 'string' && c.trim(); })
      };
    }).filter(function (g) {
      return Number.isFinite(g.lng) && g.cities.length;
    });
    var overseas = d.overseas.filter(function (c) {
      return Array.isArray(c) && c.length >= 3 && typeof c[0] === 'string' &&
        Number.isFinite(Number(c[1])) && Number.isFinite(Number(c[2]));
    }).map(function (c) {
      return { name: c[0], lng: Number(c[1]), tz: Number(c[2]) };
    });
    if (overseas.length) groups.push({ type: 'ovr', name: '海外', lng: null, tz: null, cities: overseas });
    return groups.length ? groups : null;
  }
  function buildFromSelect() {
    var groups = [];
    Array.prototype.forEach.call(citySelect.querySelectorAll('optgroup'), function (optgroup) {
      var cities = [], lng = null, tz = 8;
      Array.prototype.forEach.call(optgroup.querySelectorAll('option'), function (option) {
        if (!option.value) return;
        var parts = option.value.split('|');
        if (parts.length < 3) return;
        var cityLng = Number(parts[1]), cityTz = Number(parts[2]);
        if (!Number.isFinite(cityLng) || !Number.isFinite(cityTz)) return;
        cities.push({ name: option.textContent.trim(), lng: cityLng, tz: cityTz });
        if (lng === null) { lng = cityLng; tz = cityTz; }
      });
      if (!cities.length) return;
      groups.push({
        type: optgroup.label === '海外' ? 'ovr' : 'dom',
        name: optgroup.label,
        lng: lng,
        tz: tz,
        cities: cities
      });
    });
    return groups;
  }

  var groups = buildFromData() || buildFromSelect();
  if (!groups || !groups.length) return;

  var cityLabel = citySelect.closest('label');
  if (cityLabel) cityLabel.classList.add('p18-hidden');

  var field = el('div', 'p18-field');
  field.appendChild(el('span', 'p18-field-title', '出生地（先选省份，再选地市）'));
  var row = el('div', 'p18-row');
  var provSel = el('select', 'p18-prov');
  var citySel = el('select', 'p18-city');
  provSel.setAttribute('aria-label', '出生省份或地区');
  citySel.setAttribute('aria-label', '出生地市或城市');
  provSel.id = 'birth-province';
  citySel.id = 'birth-city';

  var provPh = el('option', '', '请选择省份 / 地区');
  provPh.value = '';
  provSel.appendChild(provPh);
  groups.forEach(function (g, i) {
    var option = el('option', '', g.name);
    option.value = String(i);
    provSel.appendChild(option);
  });

  function setCityPlaceholder(label) {
    citySel.innerHTML = '';
    var option = el('option', '', label);
    option.value = '';
    citySel.appendChild(option);
  }
  setCityPlaceholder('请先选择省份 / 地区');
  citySel.disabled = true;

  row.appendChild(provSel);
  row.appendChild(citySel);
  field.appendChild(row);
  if (cityLabel && cityLabel.parentNode) cityLabel.parentNode.insertBefore(field, cityLabel);

  function currentGroup() {
    var index = provSel.value === '' ? -1 : Number(provSel.value);
    return Number.isInteger(index) && groups[index] ? groups[index] : null;
  }

  function clearNativeCity() {
    citySelect.value = '';
    var longitude = form.querySelector('[name="longitude"]');
    if (longitude) longitude.value = '';
    citySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function rebuildCities(selectedName) {
    var group = currentGroup();
    setCityPlaceholder(group ? '请选择地市 / 城市' : '请先选择省份 / 地区');
    citySel.disabled = !group;
    if (!group) return;
    group.cities.forEach(function (city, index) {
      var option = el('option', '', cityName(city));
      option.value = String(index);
      citySel.appendChild(option);
    });
    if (selectedName) {
      var found = group.cities.findIndex(function (city) { return cityName(city) === selectedName; });
      if (found >= 0) citySel.value = String(found);
    }
  }

  function ensureNativeOption(value, name) {
    var found = Array.prototype.find.call(citySelect.options, function (option) {
      return option.value === value;
    });
    if (!found) {
      var option = el('option');
      option.value = value;
      option.textContent = name;
      citySelect.appendChild(option);
    }
  }

  function commit() {
    var group = currentGroup();
    if (!group || citySel.value === '') {
      clearNativeCity();
      return;
    }
    var city = group.cities[Number(citySel.value)];
    if (!city) {
      clearNativeCity();
      return;
    }
    var name = cityName(city);
    var longitude = group.type === 'ovr' ? city.lng : group.lng;
    var timezone = group.type === 'ovr' ? city.tz : group.tz;
    if (!Number.isFinite(Number(longitude)) || !Number.isFinite(Number(timezone))) {
      clearNativeCity();
      return;
    }
    var value = name + '|' + Number(longitude) + '|' + Number(timezone);
    ensureNativeOption(value, name);
    citySelect.value = value;
    citySelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  provSel.addEventListener('change', function () {
    // 换省份必须清空旧城市与旧经度，避免把上一个省份的城市带入新省份。
    rebuildCities('');
    clearNativeCity();
  });
  citySel.addEventListener('change', commit);

  // 页面回显：仅当原生控件里的城市确实属于某个分组时才恢复选择。
  (function syncFromControl() {
    var value = String(citySelect.value || '');
    if (!value) return;
    var name = value.split('|')[0];
    var groupIndex = groups.findIndex(function (group) {
      return group.cities.some(function (city) { return cityName(city) === name; });
    });
    if (groupIndex < 0) return;
    provSel.value = String(groupIndex);
    rebuildCities(name);
    commit();
  })();
})();