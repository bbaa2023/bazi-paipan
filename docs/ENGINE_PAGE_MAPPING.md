# 引擎接口—页面实际调用映射审计

更新日期：2026-11-03  
仓库：bbaa2023/bazi-paipan  
审计分支：main  
性质：基于当前仓库源码的静态审计；不是浏览器实测、历法准确性认证或 VPS1 部署报告。

## 1. 本轮审计基线

| 文件 | 本轮读取 SHA | 用途 |
|---|---|---|
| `assets/app.js` | `e991d112e89efcab216a82d093900ac20e773852` | 页面状态、计算入口、各模块渲染 |
| `vendor/bazi-engine.web.js` | `74e9e0eb4fa15c0ef08a5ce8d7a6879c958dd5f7` | 引擎函数签名、实现和公开导出 |
| `index.html` | `245bd8b9cfbe1f62ffc0e0ef3ee4006cac59da12` | 表单字段、页面模块、资源加载 |
| `docs/ACCURACY_TEST_CASES.md` | `7a1777396e1ed0173df1c13e6ccaab6bf6d472ee` | 既有回归测试方案 |

引擎文件头部标识为 Web v0.13.0；公开导出对象中同时包含多个后续版本标记的功能分组。文件内部版本标识与产品目录中曾记录的版本信息不应混为一谈，后续应以实际 `ENGINE_VERSION` 值及部署文件为准。

## 2. 页面数据流现状

### 2.1 输入与状态

`index.html` 表单提供：
- 公历年月日、小时、分钟；
- UTC 时区偏移（0.25 小时步进）；
- 可选经度；
- 性别（用于大运）；
- 日柱换日口径 `sect`；
- 小时为空时表示未知时辰。

`assets/app.js` 当前主要状态：
- `lastBirth`：本次输入及性别；
- `lastChart`：`computeBazi` 的命盘返回；
- `lastLuck`：`computeLuckPillars` 的大运返回；
- `lastFavorable`：`computeFavorableElement` 的扶抑/调候返回；
- `activeTab`：当前详情标签。

当前并非严格意义上的单一标准化快照：三个计算接口分别调用，且大运、扶抑接口内部会再次执行排盘。当前优先保证口径一致，未来再考虑统一上下文和减少重复计算。

### 2.2 主调用链

1. 表单提交进入 `compute(event)`，校验日期、时分、时区和经度。
2. 调用 `BaziEngine.computeBazi(birth)`，返回 `lastChart`。
3. 若接口存在，调用 `computeFavorableElement(birth)`，返回 `lastFavorable`。
4. 若用户选择性别，调用 `computeLuckPillars({...birth, gender, count: 10})`，返回 `lastLuck`。
5. `drawPillars(chart)` 绘制四柱卡片。
6. `renderSidePanels()` 生成首屏扶抑摘要；`renderTab()` 根据标签渲染详情。

注意：前端没有将 `method`、`frame` 显式传入大运接口，因此实际使用引擎默认值。默认值必须在产品说明和后续测试中明确记录，不能误称为用户可选设置。

## 3. 已实际调用的引擎接口

| 引擎接口 | 实际调用位置 | 页面用途 | 当前缺口/注意事项 |
|---|---|---|---|
| `computeBazi(opts)` | `compute()` | 本命四柱、五行统计、meta 等基础命盘 | 主数据源；应继续核对完整返回字段和各统计口径 |
| `computeFavorableElement(opts)` | `compute()` | `renderOverview()` 使用 `score.verdict`、`fuYang.favorable`、`tiaoHou.ruleCn` | 计算与主排盘分开调用；当前前端还自行组合五行阵营比例，不等同引擎综合评分 |
| `computeLuckPillars(opts)` | `compute()` | `renderLuck()` 展示起运、顺逆、大运序列 | 仅选择性别后调用；未显式传 method/frame；未知时辰展示范围需专项核验 |
| `tenGodOf(dayGan, gan)` | `drawPillars()`、`renderDetails()`、`renderAnnual()` | 天干十神、藏干十神、流年天干十神 | 有多个前端重复调用点；建议未来统一剖面数据 |
| `stemRelation(s1, s2)` | `renderRelations()`、`renderAnnual()` | 本命柱两两天干关系、流年与本命天干关系 | 当前仅两两检查；未建立本命/大运/流年三层统一关系图 |
| `branchRelations(b1, b2)` | `renderRelations()`、`renderAnnual()` | 本命柱两两地支关系、流年与本命地支关系 | 关系命中不等于合化成立；未覆盖完整三层联动 |
| `twelveStage(dayGan, branch)` | `renderDetails()`、`renderTwelveStages()` | 详情页按日干看各柱长生；十二长生标签页按各柱天干坐支 | 两个页面的参照天干不同，属于不同问题，文案应明确区分 |
| `shenshaScan(pillars)` | `drawPillars()`、`renderShensha()` | 四柱卡片归柱神煞、神煞总览 | 卡片扫描传入四个位置，未知时辰用空字符串；总览同样传空位。需验证引擎空位处理及未知时辰无误命中 |
| `BRANCH_TRINE`、`BRANCH_MEETING` | `renderRelations()` | 本命地支三合、三会组合提示 | 前端以成员是否都出现来判断命中；没有在页面验证合化条件，文案必须保持“组合命中”而非“合化成功” |

## 4. 当前页面模块与真实数据来源

### 4.1 本命四柱卡片（`drawPillars`）
- 读取 `chart.pillars.year/month/day/time` 的 `ganzhi`、`shiShenGan`、`hideGan`、`naYin`。
- 通过引擎公开常量 `STEMS`、`BRANCHES`、`STEM_ELEMENT`、`BRANCH_ELEMENT`、`STEM_POLARITY` 映射阴阳五行。
- 藏干十神通过 `tenGodOf` 计算。
- 墓库标签由前端按辰戌丑未直接显示；这属于界面规则，不是本次调用的独立引擎判断接口。
- 神煞通过 `shenshaScan` 结果按 `where` 字符串归入各柱。
- 已知问题：未知时辰时卡片标签过滤时柱，但扫描仍构造四个槽位并给时柱传空字符串。需要确认引擎的空值边界，避免时柱神煞被误算。

### 4.2 五行与扶抑（`renderOverview`）
- 五行分布读取 `lastChart.fiveElements`，优先选择 `withHiddenHalfWeight`，其次 `withHiddenStems`、`stemsBranchesOnly`。
- 日主、日主五行、月支等读取 `lastChart.meta` 和 `lastChart.pillars`。
- 旺衰结论读取 `lastFavorable.score.verdict`。
- 用神参考读取 `lastFavorable.fuYang.favorable`。
- 调候文字读取 `lastFavorable.tiaoHou.ruleCn`。
- 帮扶/克泄耗比例、根气标签、部分解释文案由前端根据五行关系和数量自行组合。

**重要审计结论：** 当前扶抑卡片不是引擎原始结果的逐字段原样展示。它把引擎 verdict/favorable 与前端自行统计的五行阵营比例拼在一起。页面必须明确区分“引擎综合判定”和“前端分布参考”，不能把比例直接说成引擎评分依据。尤其根气判断当前只检查藏干元素，属于简化提示，不应包装成完整根气分析。

### 4.3 藏干十神详情（`renderDetails`）
- 读取 `lastChart.pillars`。
- 藏干来自每柱 `hideGan`，十神通过 `tenGodOf(dayGan, hiddenStem)` 计算。
- 纳音来自 `naYin`。
- 十二长生调用 `twelveStage(dayGan, branch)`，以日干为统一参照。
- 没有调用 `dayPillarProfile`、`branchProfile`、`tenGodPillarProfile`。

### 4.4 干支关系（`renderRelations`）
- 对当前存在的本命柱逐对调用 `stemRelation`、`branchRelations`。
- 读取 `BRANCH_TRINE`、`BRANCH_MEETING` 常量，按三支是否齐全展示组合。
- 未调用大运或流年干支参与同一关系计算。
- 未展示完整的关系解释、参与对象定位、合化条件链。

### 4.5 神煞（`renderShensha`）
- 调用 `shenshaScan(gz)`，展示 `cn/key/where/anchor`。
- 当前页面对引擎返回的 `where` 和 `anchor` 做文本展示，没有独立神煞资料页、筛选或规则详情。
- 需检查未知时辰、重复命中、固定柱表与空亡相关规则的具体边界。

### 4.6 大运（`renderLuck`）
- 读取 `lastLuck.direction`、`start`、`preLuck`、`pillars`。
- 每步展示 `ganzhi/index/yearLabel/startAgeSui/endAgeSui/stemTenGod/branchTenGod/hideGan/stage/isCurrent` 等字段。
- 未知时辰时读取 `lastLuck.unknownTime.low/high.traditional` 并提示中午只是参考时刻。
- 页面未提供 `method`、`frame` 选择，也没有展示本命与每步大运的完整干支关系、五行力量变化。
- 字段缺失时以“—”展示；不能据此推断引擎未计算该项。

### 4.7 流年（`renderAnnual`）
- 调用 `yearProfile(year)`，读取 `year/ganzhi/stem/branch/stemElement/branchElement/nayin/zodiacCn/lichun`。
- 调用 `tenGodOf(dayGan, profile.stem)`。
- 对每个流年干支与本命四柱逐一调用 `stemRelation`、`branchRelations`。
- 当前固定显示六个公历年份，起始值是浏览器 `new Date().getFullYear()`。
- 没有读取 `profile.months`，未展示逐月干支；没有将大运加入流年关系。

**高优先级时间边界问题：** 流年接口按公历年份构造 `yearProfile(y)`，页面从公历当前年开始列六年。立春前，当前实际流年可能仍属于上一干支年。当前页面说明文字提醒“立春前后需结合具体时刻判断”，但列表本身没有根据当前时刻自动切换当前流年标签。后续应以引擎立春时刻和明确的查询时刻决定当前流年，不可简单以公历年份代替。

### 4.8 十二长生（`renderTwelveStages`）
- 对年/月/日/时各柱调用 `twelveStage(该柱天干, 该柱地支)`，展示各柱天干坐支。
- 未知时辰时过滤时柱。
- 这与藏干十神详情中的“日干临各柱地支”不是同一参照口径，应在界面文案中解释清楚。

### 4.9 直播展示
- `index.html` 有 `#presentation-toggle` 按钮，初始 `hidden`。
- `app.js` 定义 `togglePresentationMode()`，但初始化时将按钮隐藏并移除其 click 监听；排盘后也再次隐藏。
- 因此从当前源码看，直播展示模式并未对用户开放，不能把它记为已实现功能。
- 这不改变产品原则：直播仍使用同一免费排盘页面，不另建独立课件。后续可在同页恢复经过设计的大屏展示入口。

## 5. 已导出但页面未调用的重点接口

| 接口 | 源码签名 | 当前返回/能力摘要 | 页面状态 | 建议优先级 |
|---|---|---|---|---|
| `dayPillarProfile(gz)` | 单参数 `gz` | 日柱干支的纳音、干支属性及日柱相关剖面资料 | 未调用 | P1 |
| `branchProfile(branch)` | 单参数地支 | 地支五行、阴阳、生肖、方位、季节、藏干、六合/冲/害、三合/三会、刑及该支可组成的六十甲子等 | 未调用 | P1 |
| `tenGodPillarProfile(god, pos)` | 十神名、柱位 ID | 给定十神与柱位的结构化资料矩阵 | 未调用 | P1 |
| `stageProfile(index)` | 十二长生序号 0–11 | 某一长生阶段对应的天干/地支行列及六十甲子列表 | 未调用 | P2 |
| `kongWangOf(jiaziIdx)` | 六十甲子索引 | 返回旬空地支索引对 | 未调用 | P1（先核对输入索引口径） |
| `kongWangOfDayGz(gz)` | 日柱干支 | 由日柱干支得到旬空资料 | 未调用 | P1 |
| `lichunOf(year)` | 公历年份 | 立春年月日时分结构及文本 | 仅间接经 `yearProfile` 展示文本 | P1 |
| `yearMonthPillars(year)` | 公历年份 | 返回该年十二节月干支、节令等 | 未调用 | P2 |
| `taiSuiRelations(yearBi)` | 太岁地支索引 | 太岁关系结构 | 仅间接经 `yearProfile` 返回，页面未展示完整关系 | P2 |
| `zodiacTaiSuiYears(bi, from, to)` | 生肖/地支及年份范围 | 指定范围的太岁年份资料 | 未调用 | P2 |
| `zodiacProfile(bi)` | 地支/生肖索引 | 生肖资料结构 | 未调用 | P3 |
| `computeCompatibility(aOpts, bOpts)` | 两份出生参数对象 | 合盘结果 | 未调用；本阶段不启用 | 未来独立模块 |
| `hexagramProfile(n)` | 卦序 1–64 | 卦名、上下卦、卦象、宫位/世应、纳甲等 | 未调用；本阶段不启用 | 未来资料库 |
| `kuaProfile(year, month, day, gender, hour, minute)` | 出生年月日、性别、时分 | 八宅命卦、方位等 | 未调用 | 未来独立工具 |
| `dailyProfile(year, month, day, hour, minute)` | 日期及时分 | 当日干支、建除、旬空、纳音、时辰等 | 未调用 | 未来独立工具 |
| `weddingDayProfile(y,m,d,couple)` | 日期与 couple 对象 | 单日嫁娶择日信号、排除项、评分等 | 未调用 | 未来独立工具 |
| `weddingScan(opts)` | groom/bride/from/to 等对象 | 日期范围扫描、候选日与排除原因 | 未调用 | 未来独立工具 |
| `nameWuxingProfile(name)` | 姓名字符串 | 字符逐字五行、字形/笔画口径计数及未知字 | 未调用 | 未来独立工具 |

说明：表格中的返回摘要来自本轮源码函数实现；它不是独立算法正确性认证。部分接口的完整字段、输入边界、异常行为仍需在后续逐项补齐测试。

## 6. 本轮发现的问题清单（按风险排序）

### P0：会影响用户对结果的理解
1. **流年当前年份边界**：页面按公历年开始列流年，未自动根据查询时刻是否已过立春确定当前干支年。
2. **扶抑说明混合了不同来源**：引擎 verdict 与前端五行阵营比例并列，可能让用户误以为比例就是引擎旺衰评分。需要拆分标签和解释口径。
3. **直播展示按钮不可用**：HTML 初始隐藏，JS 初始化又隐藏并移除点击监听；当前没有可操作的同页大屏开关。
4. **未知时辰全链路边界不统一**：四柱卡片、长生、神煞、大运、详情的过滤方式不同；`renderDetails()` 仍生成时柱卡片，且未明确隐藏/未知占位策略。

### P1：资料完整性与可追溯性
5. 未接入 `dayPillarProfile`、`branchProfile`、`tenGodPillarProfile`，使引擎已具备的结构化资料没有转化为用户可用内容。
6. 空亡接口没有独立展示；神煞结果虽可能含空亡相关规则，但不能替代完整旬空资料。
7. 大运没有与本命形成结构化关系联动；流年也没有纳入大运层。
8. 流年月份干支 `yearMonthPillars` 已存在但未展示。
9. 大运计算 method/frame 使用默认值，界面和记录未显式说明。

### P2：工程一致性与维护
10. `tenGodOf`、`twelveStage` 等在多个渲染器中重复调用；未来应建立一次生成、各模块复用的标准化视图数据。
11. 页面使用引擎原始字段和前端派生规则混合渲染，缺少“引擎直出/前端格式化/前端推导/人工解释”标识。
12. 资源引用版本号与当前文件状态应在部署前统一核对，避免浏览器缓存加载旧脚本。

## 7. 建议的统一数据契约（仅设计，不是当前代码）

一次成功排盘后，建立只读的页面上下文对象，至少包含：

- `schemaVersion`：页面数据结构版本；
- `engineVersion`：引擎实际版本；
- `birthInput`：公历输入、未知时辰、性别、UTC 偏移、经度、sect；
- `calculationMeta`：绝对时刻、真太阳时修正、DST 标记、采用的历法口径；
- `chart`：原始 `computeBazi` 返回，保持不改写；
- `favorable`：原始扶抑/调候返回；
- `luck`：原始大运返回；
- `derivedProfiles`：日柱、地支、十神、长生等基于原始结果计算的剖面；
- `provenance`：每个展示字段标记来源接口、字段路径或前端派生规则。

设计约束：
1. 不复制/重写引擎算法；前端只调用引擎公开接口并组织数据。
2. 原始引擎结果与前端派生结果分层保存，不能覆盖原始值。
3. 未知时辰在上下文中是明确状态；不存在的时柱不进入统计、关系和神煞计算。
4. 流年对象必须带查询时刻与立春边界，明确“公历年份”与“当前干支年”区别。
5. 后续 AI 如启用，只消费经过确认的标准化快照，不自行重新排盘。

## 8. 推荐实施顺序

1. **先补齐字段级 API 对照表**：对所有 P1 接口逐个核实参数、返回字段、空值和异常边界。
2. **先修正口径表达与边界设计**：流年立春当前年、扶抑来源标注、未知时辰统一策略。
3. **接入本命剖面中心**：日柱、地支、十神柱位、空亡；以现有命盘为数据源，不新增排盘算法。
4. **统一本命—大运—流年关系层**：先定义关系对象，再设计展示，不直接堆卡片。
5. **同页直播展示**：恢复同页大屏模式并验证桌面 16:9、手机普通模式；不开发独立课件。
6. 完成独立历书、真实浏览器和 VPS1 分开验收。

## 9. 明确未做事项

- 未修改任何网页、CSS、引擎或部署文件。
- 未修改引擎算法或计算口径。
- 未部署 VPS1。
- 未进行真实浏览器交互、移动端溢出或控制台验收。
- 未完成独立历书逐项准确性核验。
- 未启用合盘、六十四卦、择日、姓名、支付、会员或 AI 解读。


## 10. P1 第一批本命剖面接入更新（2026-11-03）

本节覆盖前文静态审计结论中“尚未接入”的状态。最新页面源码 SHA：`4331ef4f7033d97fcee3e8f39993791c23eba749`；对应引擎源码仍为 `74e9e0eb4fa15c0ef08a5ce8d7a6879c958dd5f7`。

### 10.1 已接入的接口

- `dayPillarProfile(dayGz)`：在“藏干十神”详情区域增加日柱剖面，展示日干坐支关系、日柱纳音及配对、日柱长生、日柱藏干十神。
- `branchProfile(branch)`：按本命实际存在的柱逐个读取地支剖面，展示五行阴阳、生肖、方位、时辰范围、节令季节、藏干位置和地支规则资料。
- `kongWangOfDayGz(dayGz)`：展示旬首、旬空地支，并将旬空地支与本命实际存在的柱支比对，标出命中柱位。
- 未知时辰：详情柱卡过滤时柱，增加“出生时辰未知”提示；地支剖面和旬空命中也不把不存在的时柱加入。

### 10.2 展示边界

- 地支剖面中的六合、六冲、六害、三合、三会是规则资料，不代表当前命盘已经构成；页面附有说明。
- 日干坐支是五行生克关系分类，不直接等同婚姻宫吉凶。
- 旬空以日柱所在旬统一计算，不把每一柱误算为各自独立旬空。
- 以上接口均为增强详情资料；如果单个接口缺失、抛错或返回 null，页面仍应保留四柱主排盘。

### 10.3 尚未接入

- `yearMonthPillars`：十二节月干支尚未展示。
- `zodiacIndexFromDateTime`：当前流年仍按公历当前年份起算，尚未按查询时刻/立春边界确定当前干支年。
- `stageProfile`、`tenGodPillarProfile`：仍作为后续规则资料库，不在本批接入。
- 本命—大运—流年三层统一关系尚未实现。
- 同页直播大屏入口仍被隐藏，尚未恢复。

### 10.4 验收状态

这是一次源码接入，不等于运行验收。尚未完成真实浏览器控制台检查、桌面/手机排版检查、未知时辰交互检查、独立历书核验或 VPS1 部署。


### 10.5 本轮局部代码检查

- 对新替换的 renderDetails 函数单独提取后执行 Node.js 语法检查：通过。
- 使用模拟引擎对象做未知时辰/已知时辰两组渲染检查：通过。
  - 未知时辰：只渲染三柱资料，未调用时柱地支剖面；显示未知时辰说明和旬空。
  - 已知时辰：四柱资料均显示，地支剖面调用四次。
- 这是局部函数语法与模拟数据检查，不等于完整 app.js 构建、真实浏览器、手机视口或 VPS1 线上验收。


## 11. P1 第二批：流年立春边界与十二节月展示（2026-11-03）

### 11.1 页面接入调整

- `renderAnnual()` 不再以 `new Date().getFullYear()` 直接作为流年起点。
- 使用浏览器 `Intl.DateTimeFormat` 将当前实际时刻转换为 `Asia/Shanghai` 年月日时分。
- 通过 `lichunOf(北京时间年份)` 判断立春前后；立春前当前干支年回退一年，立春当分钟及之后使用本年。
- 使用 `zodiacIndexFromDateTime` 返回的地支索引与 `yearGanzhi(当前干支年)` 的年支做交叉核对；若缺少立春资料、接口返回异常或结果冲突，页面停止给出当前年标记。
- 流年列表从当前干支年开始连续展示六个干支年（当前年 + 后续五年）。
- 当前干支年的 `yearProfile().months` 用于展示十二节月的节令名称、干支与月建资料；没有标记当前节月，因为接口不含精确交节时刻。
- 未知时辰命盘的流年关系列表过滤时柱，只比较实际存在的年、月、日柱。

### 11.2 时间口径与限制

- 页面显示查询时刻（北京时间），不依赖用户浏览器所在时区。
- 立春判断精度与引擎表一致，为分钟级，不作秒级承诺。
- 十二节月区只展示引擎资料，不推断每个节气的具体交接日期/时刻。
- 本批没有新增命盘计算、修改 vendor 引擎或改变四柱结果。
- 直接天干/地支关系仍只是两两规则命中，不等于完整三层关系或吉凶判断。

### 11.3 当前检查状态

- 已提交页面源码与 app.js 缓存版本更新。
- 对完整 assets/app.js 执行 V8/Node 兼容语法编译检查：通过。
- 使用仓库当前 vendor 引擎与模拟命盘运行 renderAnnual：返回 6 张流年卡、12 条节月资料，并显示北京时间与当前流年标记。
- 固定模拟 2026 年立春北京时间 04:01 / 04:02 / 04:03：当前干支年分别为 2025 / 2026 / 2026，与引擎分钟级边界一致。
- 以上为源码语法和实际引擎函数模拟检查；仍未完成真实浏览器时区环境、桌面/手机视觉检查、独立历书核验或 VPS1 部署。
