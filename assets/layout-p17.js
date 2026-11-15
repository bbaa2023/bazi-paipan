/* ===== P17 出生时间滚轮选择器 · 独立脚本 =====
   不改 app.js：保留隐藏的原生 birthdate / hour / minute 控件作为排盘数据载体，
   表单上合并为一个“出生时间”入口，点击弹出年/月/日/时/分五列上下滚轮。
   顶部仅 公历 / 农历 两个入口；农历经 lunar 库转成公历后写回原生控件。 */
(function () {
  'use strict';
  var form = document.getElementById('birth-form');
  if (!form) return;

  var Solar = window.Solar, Lunar = window.Lunar;
  var ITEM_H = 36, VISIBLE = 5;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---- 原生控件读取 / 写回（排盘、P13、P14 仍从 FormData 读这些 name） ----
  function ctrl(name) { return form.querySelector('[name="' + name + '"]'); }
  function readControls() {
    var bd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ctrl('birthdate').value || ''));
    var hRaw = ctrl('hour').value;
    var h = (hRaw === '' || hRaw == null) ? null : Number(hRaw);
    var mi = Number(ctrl('minute').value);
    return {
      y: bd ? +bd[1] : 1990, m: bd ? +bd[2] : 1, d: bd ? +bd[3] : 15,
      h: h == null ? 12 : h, mi: Number.isFinite(mi) ? mi : 0
    };
  }
  function writeControls(sy, sm, sd, h, mi) {
    var bd = ctrl('birthdate');
    if (bd) bd.value = sy + '-' + pad2(sm) + '-' + pad2(sd);
    var hr = ctrl('hour'); if (hr) hr.value = String(h);
    var mr = ctrl('minute'); if (mr) mr.value = String(mi);
  }

  // ---- 公历 / 农历互转（容错，失败返回 null） ----
  function solarToLunar(y, m, d) {
    if (!Solar || !Lunar) return null;
    try {
      var l = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar();
      return { y: l.getYear(), m: l.getMonth(), d: l.getDay() };
    } catch (e) { return null; }
  }
  function lunarToSolar(ly, lm, ld) {
    if (!Lunar) return null;
    try {
      var s = Lunar.fromYmd(ly, lm, ld).getSolar();
      var back = s.getLunar();
      if (back.getYear() !== ly || back.getMonth() !== lm || back.getDay() !== ld) return null;
      return { y: s.getYear(), m: s.getMonth(), d: s.getDay() };
    } catch (e) { return null; }
  }
  function daysInSolar(y, m) { return new Date(y, m, 0).getDate(); }

  // ---- 状态 ----
  var init = readControls();
  var state = {
    cal: 'solar',
    y: init.y, m: init.m, d: init.d, h: init.h, mi: init.mi,
    ly: init.y, lm: init.m, ld: init.d
  };
  var ln = solarToLunar(init.y, init.m, init.d);
  if (ln) { state.ly = ln.y; state.lm = ln.m; state.ld = ln.d; }

  var COLS = [
    { key: 'y', label: '年' },
    { key: 'm', label: '月' },
    { key: 'd', label: '日', dyn: true },
    { key: 'h', label: '时' },
    { key: 'mi', label: '分' }
  ];

  // ---- 构建 DOM ----
  var birthLabel = ctrl('birthdate').closest('label');
  var hourLabel = ctrl('hour').closest('label');
  var minuteLabel = ctrl('minute').closest('label');
  [birthLabel, hourLabel, minuteLabel].forEach(function (lb) { if (lb) lb.classList.add('p17-hidden'); });

  var field = el('div', 'p17-field');
  var fieldTitle = el('span', 'p17-field-title', '出生时间');
  var timeBtn = el('button', 'p17-time-btn');
  timeBtn.type = 'button';
  var timeText = el('span', 'p17-time-text');
  var timeArrow = el('span', 'p17-time-arrow', '▾');
  timeBtn.appendChild(timeText); timeBtn.appendChild(timeArrow);
  field.appendChild(fieldTitle); field.appendChild(timeBtn);
  if (birthLabel && birthLabel.parentNode) birthLabel.parentNode.insertBefore(field, birthLabel);

  var modal = el('div', 'p17-modal'); modal.id = 'p17-modal'; modal.hidden = true;
  var mask = el('div', 'p17-mask'); mask.setAttribute('data-close', '1');
  var sheet = el('div', 'p17-sheet');

  var tabs = el('div', 'p17-tabs');
  var tabSolar = el('button', 'p17-tab active', '公历'); tabSolar.type = 'button'; tabSolar.setAttribute('data-cal', 'solar');
  var tabLunar = el('button', 'p17-tab', '农历'); tabLunar.type = 'button'; tabLunar.setAttribute('data-cal', 'lunar');
  var closeBtn = el('button', 'p17-close', '×'); closeBtn.type = 'button'; closeBtn.setAttribute('data-close', '1');
  tabs.appendChild(tabSolar); tabs.appendChild(tabLunar); tabs.appendChild(closeBtn);

  var colsBox = el('div', 'p17-cols');
  var colLists = {};
  COLS.forEach(function (c) {
    var col = el('div', 'p17-col');
    col.appendChild(el('div', 'p17-col-label', c.label));
    var list = el('div', 'p17-col-list');
    col.appendChild(list);
    colsBox.appendChild(col);
    colLists[c.key] = list;
  });

  var actions = el('div', 'p17-actions');
  var cancelBtn = el('button', 'p17-btn p17-cancel', '取消'); cancelBtn.type = 'button'; cancelBtn.setAttribute('data-close', '1');
  var okBtn = el('button', 'p17-btn p17-ok', '确定'); okBtn.type = 'button'; okBtn.id = 'p17-ok';
  actions.appendChild(cancelBtn); actions.appendChild(okBtn);

  sheet.appendChild(tabs); sheet.appendChild(colsBox); sheet.appendChild(actions);
  modal.appendChild(mask); modal.appendChild(sheet);
  document.body.appendChild(modal);

  // ---- 列数据 ----
  function colValues(key) {
    if (key === 'y') {
      var arr = []; for (var y = 1900; y <= 2100; y++) arr.push(y); return arr;
    }
    if (key === 'm') { var a = []; for (var m = 1; m <= 12; m++) a.push(m); return a; }
    if (key === 'h') { var b = []; for (var h = 0; h <= 23; h++) b.push(h); return b; }
    if (key === 'mi') { var c = []; for (var x = 0; x <= 59; x++) c.push(x); return c; }
    // 日：按当前年/月给天数
    if (state.cal === 'lunar') {
      var ld = []; for (var i = 1; i <= 30; i++) ld.push(i); return ld;
    }
    var n = daysInSolar(state.y, state.m);
    var dd = []; for (var j = 1; j <= n; j++) dd.push(j); return dd;
  }
  function currentVal(key) {
    if (state.cal === 'lunar') {
      if (key === 'y') return state.ly;
      if (key === 'm') return state.lm;
      if (key === 'd') return state.ld;
      if (key === 'h') return state.h;
      return state.mi;
    }
    return state[key];
  }
  function setVal(key, v) {
    if (state.cal === 'lunar') {
      if (key === 'y') state.ly = v;
      else if (key === 'm') state.lm = v;
      else if (key === 'd') state.ld = v;
      else if (key === 'h') state.h = v;
      else state.mi = v;
    } else {
      state[key] = v;
    }
  }

  // ---- 渲染单列 ----
  var silent = false;
  function renderCol(key) {
    var list = colLists[key];
    var values = colValues(key);
    var cur = currentVal(key);
    if (values.indexOf(cur) < 0) { cur = values[0]; setVal(key, cur); }
    list.innerHTML = '';
    values.forEach(function (v) {
      var opt = el('div', 'p17-opt' + (v === cur ? ' active' : ''), String(v));
      opt.setAttribute('data-v', v);
      list.appendChild(opt);
    });
    var idx = values.indexOf(cur);
    silent = true;
    list.scrollTop = idx * ITEM_H;
    silent = false;
  }
  function renderAll() { COLS.forEach(function (c) { renderCol(c.key); }); }

  function bindCol(key, list) {
    // 滚轮：每个滚动事件只走一项，避免惯性一次跳两项；点击选项直达定位。
    list.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var values = colValues(key);
      var idx = values.indexOf(currentVal(key));
      if (idx < 0) idx = 0;
      var dir = ev.deltaY > 0 ? 1 : -1;
      var n = Math.max(0, Math.min(values.length - 1, idx + dir));
      if (n === idx) return;
      setVal(key, values[n]);
      markActive(key);
      silent = true; list.scrollTop = n * ITEM_H; silent = false;
      if (key === 'y' || key === 'm') renderCol('d');
    }, { passive: false });
    list.addEventListener('click', function (ev) {
      var opt = ev.target.closest('.p17-opt'); if (!opt) return;
      var v = Number(opt.getAttribute('data-v'));
      var values = colValues(key);
      if (values.indexOf(v) < 0) return;
      setVal(key, v);
      var idx = values.indexOf(v);
      silent = true; list.scrollTop = idx * ITEM_H; silent = false;
      markActive(key);
      if (key === 'y' || key === 'm') renderCol('d');
    });
  }
  function markActive(key) {
    var list = colLists[key], values = colValues(key), cur = currentVal(key);
    [...list.children].forEach(function (o) {
      o.classList.toggle('active', Number(o.getAttribute('data-v')) === cur);
    });
  }
  COLS.forEach(function (c) { bindCol(c.key, colLists[c.key]); });

  // ---- 公历 / 农历切换 ----
  function switchCal(cal) {
    if (state.cal === cal) return;
    if (cal === 'lunar') {
      var ln2 = solarToLunar(state.y, state.m, state.d);
      if (ln2) { state.ly = ln2.y; state.lm = ln2.m; state.ld = ln2.d; }
    } else {
      var sol = lunarToSolar(state.ly, state.lm, state.ld);
      if (sol) { state.y = sol.y; state.m = sol.m; state.d = sol.d; }
    }
    state.cal = cal;
    tabSolar.classList.toggle('active', cal === 'solar');
    tabLunar.classList.toggle('active', cal === 'lunar');
    renderAll();
  }
  tabs.addEventListener('click', function (ev) {
    var t = ev.target.closest('.p17-tab'); if (!t) return;
    switchCal(t.getAttribute('data-cal'));
  });

  // ---- 打开 / 关闭 ----
  function timeLabel(y, m, d, h, mi) {
    return y + '年' + pad2(m) + '月' + pad2(d) + '日 ' + pad2(h) + ':' + pad2(mi);
  }
  function refreshLabel() {
    var c = readControls();
    timeText.textContent = timeLabel(c.y, c.m, c.d, c.h, c.mi);
  }
  function openModal() {
    var c = readControls();
    state.y = c.y; state.m = c.m; state.d = c.d; state.h = c.h; state.mi = c.mi;
    var ln3 = solarToLunar(c.y, c.m, c.d);
    if (ln3) { state.ly = ln3.y; state.lm = ln3.m; state.ld = ln3.d; }
    state.cal = 'solar';
    tabSolar.classList.add('active'); tabLunar.classList.remove('active');
    renderAll();
    modal.hidden = false;
    document.body.classList.add('p17-locked');
  }
  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('p17-locked');
  }
  timeBtn.addEventListener('click', openModal);
  modal.addEventListener('click', function (ev) { if (ev.target.getAttribute('data-close')) closeModal(); });

  okBtn.addEventListener('click', function () {
    var sy, sm, sd;
    if (state.cal === 'lunar') {
      var sol = lunarToSolar(state.ly, state.lm, state.ld);
      if (!sol) { closeModal(); return; }
      sy = sol.y; sm = sol.m; sd = sol.d;
    } else {
      sy = state.y; sm = state.m; sd = state.d;
    }
    writeControls(sy, sm, sd, state.h, state.mi);
    refreshLabel();
    closeModal();
  });

  refreshLabel();
})();
