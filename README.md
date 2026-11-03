# bazi-paipan｜独立八字排盘站

> **线上部署唯一来源：`main` 分支。**
>
> 线上地址：<https://bazi.xiulian.lat/>
> GitHub：<https://github.com/bbaa2023/bazi-paipan>

这是独立静态前端站点，与 Halo 主程序分离。部署在 VPS1 宝塔站点目录 `/www/wwwroot/bazi.xiulian.lat`，浏览器在本地加载脚本并完成排盘。VPS2 / OpenCode 不参与该站点的线上运行，也不通过 Halo MCP 修改这里的文件。

---

## 1. 分支说明：以后不要混用

| 分支 | 用途 | 是否部署到线上 |
|---|---|---|
| `main` | 当前正式开发主线，也是线上唯一发布分支 | **是** |
| `backup/pre-fuyang-panel-2026-11-01` | 2026-11-01 扶抑面板改造前的安全备份点 | 否，仅用于对照/恢复 |
| `feat/gold-theme-customer-ui` | 独立的金色主题 UI 试验分支，与 main 已分叉 | 否，未经审查不可部署 |

### 当前分支关系（GitHub 实际查询）

- 默认分支：`main`。
- 备份分支 `backup/pre-fuyang-panel-2026-11-01` 指向提交 `dd2a203b26e366ddb4337bf1ee0c2d102c14a399`。
- 当前 main 在该备份点之后前进了 16 个提交；比较结果显示这段差异涉及 `assets/app.js`、`assets/style.css`、`index.html`。
- `feat/gold-theme-customer-ui` 与 main 已经分叉，不能把它当成 main 的“最新版本”，也不要在宝塔上切换到它。
- 本轮没有执行回滚、合并分支或切换线上分支。

**操作原则：** 日常修改只在 `main` 上完成；备份分支只读保留；主题试验分支先不合并。任何回滚先比较提交和文件差异，不直接执行 `git reset --hard`。

---

## 2. 文件地图：一个模块到底改哪里

| 文件/目录 | 负责内容 | 修改规则 |
|---|---|---|
| `index.html` | 页面骨架、出生信息表单、结果容器、CSS/JS 引用及版本号 | 只在确实需要调整页面结构或静态资源版本号时修改 |
| `assets/app.js` | 页面交互、排盘调用、各模块 HTML 渲染 | 具体功能按函数定位；避免整文件覆盖 |
| `assets/style.css` | 全站布局、颜色、卡片、响应式样式 | 优先追加有模块前缀的样式，避免影响其他区域 |
| `vendor/lunar.js` | 本地历法依赖 | 非必要不改 |
| `vendor/bazi-engine.web.js` | 上游 BaZi Engine 浏览器 bundle | 不在普通 UI 迭代中修改；引擎升级需单独评估和测试 |
| `vendor/LICENSE.bazi-engine` | 上游引擎许可证 | 必须保留 |
| `docs/BAOTA_DEPLOY.md` | VPS1 宝塔部署与更新说明 | 部署流程变更时同步维护 |
| `docs/CURRENT_FEATURE_AUDIT.md` | 功能盘点、接口接入情况和已知限制 | 模块功能变更后更新 |
| `docs/ACCURACY_TEST_CASES.md` | 排盘准确性和浏览器回归测试用例 | 新增/修复历法逻辑时更新 |

### 五行能量 / 扶抑法面板

**面板的 JS 入口：** `assets/app.js` → `renderOverview()`。

**面板的 CSS：** `assets/style.css` → 搜索 `.fy-final`。当前面板样式使用 `.fy-final` 前缀，原则上只影响五行能量面板。

该面板所在页面容器是 `index.html` 中的 `#overview-panel`。排盘后由既有渲染流程调用 `renderOverview()`，生成五行能量面板。

后续如果只调整：
- 五行行列、十神、阵营徽章、结论卡、用神/忌神卡、行动建议的外观：改 `assets/style.css` 的 `.fy-final...` 规则。
- 面板内显示的文字拼接：只定位修改 `renderOverview()`。
- 五行数值、十神关系、旺衰判断：这属于计算/判断逻辑，必须先提出明确需求并核对引擎接口，不可在纯视觉迭代中顺手改动。

**重要：** `得令/得根/得势`、五行阵营比例、引擎旺衰结论不是同一个概念。界面文案必须明确区分“引擎给出的旺衰结果”和“前端按五行统计做的辅助展示”，不能把辅助比例冒充引擎评分。

### 其他页面模块

`assets/app.js` 中的主要渲染函数可用以下命令快速定位：

```bash
grep -nE 'function (renderOverview|renderTwelveStages|render|drawPillars)' assets/app.js
```

- `drawPillars()`：本命四柱卡片。
- `renderOverview()`：五行能量与扶抑法总览。
- `renderTwelveStages()`：十二长生。
- 其他标签页内容由 `renderTab()` 及其相关渲染逻辑处理；改动前先在当前文件中搜索实际函数名，不要凭印象猜文件位置。

---

## 3. 当前 main 的五行面板改造记录

以下提交记录来自 GitHub 的 main 分支提交历史：

| 提交 | 内容 |
|---|---|
| `f78e25b` | 将五行能量模块改造成子平扶抑判断面板 |
| `488cae5` | 追加扶抑面板样式 |
| `b0dcb71` | 按完整实现替换 `renderOverview()` |
| `c78a545` | 按面板实现追加样式 |
| `d4ef03a` | 对齐函数格式 |
| `6ad2c66` | 清理重复注释 |
| `a9415f6` | 修复总览面板渲染并清理旧标记 |
| `94825de` | 五行总览改为彩色帮扶分析卡片 |
| `66d9af0` | 更新相关面板脚本 |
| `0d12d8b` | 刷新总览渲染标记 |
| `3f4edb9` | 更新 CSS/JS 静态资源缓存版本号 |
| `587574c`、`cc27bcb` | 扶抑面板第一轮结构/样式调整 |
| `aba6c5f`、`35c31c3` | 因果表、结论依据、卡片与建议区视觉微调 |

以上短 SHA 仅用于快速识别；以 GitHub 页面显示的完整 SHA 和文件内容为准。

### 当前线上版本需要特别核对的地方

最近一次静态资源版本号更新提交 `3f4edb9` 早于后续 app.js / style.css 修改。当前 `index.html` 中引用仍是：

- `assets/style.css?v=20261101d`
- `assets/app.js?v=20261101d`

但这两个文件在该版本号提交之后又有更新。因此，**当前 main 存在“文件内容已更新、URL 查询版本号未随之更新”的情况**。这会让浏览器或中间缓存继续复用旧的 CSS/JS 文件，不能简单排除缓存因素。

下一次发布静态资源修改时，必须同时检查 `index.html` 的 CSS/JS 查询版本号；每次改动对应资源后更新版本号（例如递增到新的唯一标记），并把这项检查纳入提交验收。不能只提交 CSS/JS 而漏掉资源版本号。

---

## 4. 从 GitHub 下载 / VPS1 更新

### 首次部署

首次部署说明见 [docs/BAOTA_DEPLOY.md](docs/BAOTA_DEPLOY.md)。站点目录必须独立于 Halo。

### 已经部署过的站点：只更新 main

在 VPS1 SSH 终端执行：

```bash
cd /www/wwwroot/bazi.xiulian.lat
git status
git branch --show-current
git pull --ff-only origin main
```

执行前必须确认：
- 当前目录确实是 `/www/wwwroot/bazi.xiulian.lat`；
- 当前分支是 `main`；
- `git status` 没有未提交的本地修改。

如果当前分支不是 `main`，或者工作区不是干净状态，**先停止，不要直接 pull、reset 或切换分支**，把终端输出发给维护者核对。

### 核对服务器实际版本

```bash
cd /www/wwwroot/bazi.xiulian.lat
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
```

将 `git rev-parse HEAD` 的完整 SHA 与 GitHub main 最新提交比较。两者一致，才表示服务器代码已更新到该提交。

### 浏览器实际加载版本

打开排盘页面，按 F12 → Network：
1. 勾选 Disable cache 后刷新；
2. 查看 `assets/app.js?v=...` 和 `assets/style.css?v=...`；
3. 确认请求返回成功，且 URL 查询版本号与当前 `index.html` 一致；
4. Console 检查是否有 JS 错误；
5. 使用固定测试命盘检查五行能量面板。

仅看到 Git pull 成功，不代表浏览器已经加载了新资源；仅看到页面能打开，也不代表新 JS/CSS 已经生效。

---

## 5. 后续修改与发布纪律

每次任务按这个顺序：

1. **先读当前 main 文件**，确认当前函数、CSS 选择器、资源版本号和最新提交，不从旧聊天记录或旧代码片段直接覆盖。
2. 明确本次允许改动的文件和函数；用户限定范围时严格遵守。
3. 小范围修改，优先局部补丁，不整文件重写。
4. 对比改动文件，确认没有误改其他模块。
5. 做可执行的静态检查；若没有真实浏览器环境，必须明确说明“未做浏览器实测”。
6. 若修改了 `assets/app.js` 或 `assets/style.css`，同时检查并更新 `index.html` 对应资源版本号。
7. 提交到 `main`，记录完整 commit SHA。
8. 用户在 VPS1 拉取后，核对服务器 HEAD 与 GitHub main 一致，再做浏览器验收。

### 禁止事项

- 不要把 `feat/gold-theme-customer-ui` 当成线上分支。
- 不要把 `backup/pre-fuyang-panel-2026-11-01` 当成最新代码下载。
- 不要在未比较差异前合并、重置或回滚分支。
- 不要在没有明确授权时改动 `vendor` 引擎文件。
- 不要把前端五行比例重新解释成引擎旺衰分数。
- 不要只改 CSS/JS 而忘记检查 `index.html` 的缓存版本号。
- 不要声称完成了浏览器实测，除非确实在目标浏览器和实际命盘上验证过。

---

## 6. 本地引擎与隐私边界

- 本项目使用仓库内的 `vendor/lunar.js` 与 `vendor/bazi-engine.web.js`。
- 正常排盘不需要 Node 常驻服务、Docker 或第三方排盘 API。
- 出生资料用于当前浏览器本地计算；不要添加会把出生日期、时辰、经纬度发送到外部服务的代码。
- 上游引擎来源：[bazi-atlas/bazi-engine](https://github.com/bazi-atlas/bazi-engine)。
- 必须保留 `vendor/LICENSE.bazi-engine` 和 bundle 原始版权声明。

## 7. 相关文档

- [宝塔部署说明](docs/BAOTA_DEPLOY.md)
- [当前功能盘点](docs/CURRENT_FEATURE_AUDIT.md)
- [排盘准确性回归测试](docs/ACCURACY_TEST_CASES.md)


### 知识库规划

- [知识库信息架构与排盘导航规范](docs/KNOWLEDGE_BASE_INFORMATION_ARCHITECTURE.md)

知识库是独立于排盘页面的静态资料区域；在页面框架实际开发前，不代表线上已经存在 `/guide/` 页面。
