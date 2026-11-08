/* ===== P11 主题切换 =====
   默认暗色（跟主站一致）；用户可切回亮色。
   内联脚本已在 head 加 html.dark class，这里只负责切换按钮。 */
(function () {
  'use strict';

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function applyLabel(btn) {
    btn.textContent = isDark() ? '☀️ 亮色' : '🌙 暗色';
    btn.title = isDark() ? '切换到亮色' : '切换到暗色';
  }

  function addToggle() {
    var tools = document.querySelector('.topbar-tools');
    if (!tools || tools.querySelector('.theme-toggle')) return;
    var btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    applyLabel(btn);
    btn.addEventListener('click', function () {
      document.documentElement.classList.toggle('dark');
      var dark = isDark();
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
      applyLabel(btn);
    });
    tools.insertBefore(btn, tools.firstChild);
  }

  // defer 脚本执行时 DOM 已解析，直接执行；若 topbar 尚未就绪则重试一次
  addToggle();
  if (!document.querySelector('.theme-toggle')) {
    setTimeout(addToggle, 100);
  }
})();
