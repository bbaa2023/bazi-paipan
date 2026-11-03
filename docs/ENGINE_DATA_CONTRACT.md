# 引擎数据契约审计（字段级阶段记录）

更新日期：2026-11-03

## 1. 审计范围与基线

本文件是源码静态审计记录，不代表浏览器或历法准确性验收通过。

| 文件 | 本轮读取的 blob SHA |
|---|---|
| `assets/app.js` | `e991d112e89efcab216a82d093900ac20e773852` |
| `vendor/bazi-engine.web.js` | `74e9e0eb4fa15c0ef08a5ce8d7a6879c958dd5f7` |

审计时 `main` 指向提交 `8efe773892b7ff1c5a2fa35d999781aa70a6d66c`。引擎运行时常量 `ENGINE_VERSION = 'v0.15.1'`；文件头部的 Web v0.13.0 注释不是运行时版本，产品记录应优先保存 `ENGINE_VERSION`。

## 2. 核心接口契约

### 2.1 computeBazi(opts)

**输入字段（源码实际读取）**
- `year`、`month`、`day`：公历年月日。
- `hour`：小时，可为 null；`minute`：分钟。
- `longitude`：可选经度。
- `tzCentralMeridian`：可选时区中央经线。
- `tzOffsetHours`：时区偏移；缺省按 8 小时处理。
- `unknownTime`：未知时辰标记。
- `sect`：换日口径；缺省按 1。

**返回字段**
- `input`：原始年月日时分、经度、时区、未知时辰、sect。
- `meta`：`dayMaster`、英文日主、日主五行/阴阳、`dstApplied`、`trueSolarOffsetMinutes`、`tzCentralMeridian`、`tzOffsetHours`、`trueSolarTime`、`absoluteInstantBeijing`、历算引擎标识及版本、sect 与口径说明。
- `pillars`：`year/month/day/time`；各非空柱包含 `ganzhi`、`hideGan`、`shiShenGan`、`naYin`。未知时辰时 `time=null`。
- `fiveElements`：`stemsBranchesOnly`、`withHiddenHalfWeight`、`withHiddenFull` 三种统计口径。
- `tenGodsEn`、`branchEn`、`stemEn`：英文映射资料。

**边界与注意**
- 未知时辰不会生成时柱，五行统计循环会跳过空柱。
- 中国历史夏令时逻辑仅对 UTC+8 应用；未知时辰不对 null 小时做减法。
- 真太阳时修正仅在提供经度且非未知时辰时执行。
- 年/月柱按换算后的北京绝对时刻取节气；日/时柱按本地（可含真太阳时修正）时刻计算。
- `withHiddenHalfWeight` 的实现是在天干、地支主气基础上，再给全部藏干各加 0.5；主气藏干也会再次计入 0.5。不能误写成“只有中气、余气半权重”。

### 2.2 computeFavorableElement(opts)

**输入**：与 `computeBazi` 相同的出生参数对象；函数内部重新调用 `computeBazi(opts)`。

**返回字段**
- `engineVersion`。
- `dayMaster`：日主干支属性。
- `chart`：年、月、日、时柱干支。
- `monthBranch`、`monthBranchEn`、`season`、`seasonEn`、`unknownTime`。
- `score`：`perElement`、逐项 `breakdown`、`support`、`drain`、`total`、`ratio`、`thresholds`、`verdict`、中英文结论。
- `fuYang`：`method`、`favorable[]`、`unfavorable[]`；每项含五行、十神阵营及理由字段。
- `tiaoHou`：`applicable`、调候五行、中英文规则。
- `synthesis`：调候与扶抑是否同向及说明。
- `fiveElements`：继承本命排盘的五行统计。
- `conventionNote`：英文计分口径说明。

**计分规则（按实现）**
- 月柱权重 ×2，其余柱 ×1。
- 日主天干不计分。
- 其他可用柱的天干计 1、地支主气计 1、每个藏干计 0.5。
- 帮扶 = 日主五行 + 生助日主五行；克泄耗 = 日主所生、日主所克、克日主五行。
- 阈值由 `STRENGTH_THRESHOLDS` 决定。

**产品表达限制**
- 这是引擎公开的加权规则模型，不应包装成不受流派影响的唯一旺衰标准。
- 页面目前把引擎 `score.verdict`、`fuYang.favorable` 与前端自行计算的阵营比例/根气提示拼在一起。未来应分别标注“引擎计分结果”和“页面分布参考”，不可暗示前端比例就是引擎计分明细。
- 调候简则只覆盖夏季取水、冬季取火；春秋季没有季节级简则，不能把它描述成完整的逐日主调候体系。

### 2.3 computeLuckPillars(opts)

**输入字段（源码实际读取）**
- 出生参数同 `computeBazi`。
- `gender`：性别标记；`count`：大运步数，缺省 10。
- `method`：仅 `precise` 选择精确算法，其余按 `traditional`。
- `frame`：仅 `true-solar` 选择真太阳时框架，其余按 `civil`。
- `today`：用于当前大运判定的日期；缺省使用 UTC ISO 日期。

**返回字段**
- `gender`、`genderLabel`、`direction`。
- `dayMaster`、`monthPillar`、`yearPillar`、`chart`。
- `instant`：框架、时区/真太阳时偏移、夏令时标记、出生时刻、出生时辰区间、所取节气及前后方向。
- `elapsed`：出生与节气之间的秒、小时、日及分解值。
- `start`：所选算法、traditional/precise 两套起运值、差值、起运日期时间、精确年龄和虚岁。
- `preLuck`：起运前年份与虚岁范围。
- `pillars[]`：每步大运的序号、干支、干支五行、天干/地支十神、藏干及藏干十神、十二长生、虚岁、年份区间、日期时间、当前标记。
- `current`、`today`、`frameAlt`、`sensitivity`。
- 未知时辰时另有 `unknownTime`：当天起止窗口、low/high 起运估算、节气是否跨界、午时假设的月柱。

**当前页面调用差异**
- 页面只传 `gender` 和 `count:10`，没有显式传 `method/frame/today`，所以采用引擎默认 traditional/civil/系统日期。
- 页面展示起运及大运卡片，但没有完整展示 `frameAlt`、`sensitivity` 等口径对照字段。
- 未知时辰页面展示 low/high 的 traditional 值；应避免让中午参考值看起来像精确起运结果。

## 3. 已核实的未充分使用接口

### dayPillarProfile(gz)
- 输入：两字符干支字符串；格式或干支无效返回 null。
- 返回：干支、索引、中英文干支/生肖、干支五行与阴阳、日柱坐支关系 `seat/seatCn/seatEn`、藏干十神明细、十二长生、纳音及配对索引。
- 用途：可用于日柱资料卡；不是对日柱吉凶的完整断语。

### branchProfile(branch)
- 输入：一个有效地支；无效返回 null。
- 返回：地支索引、五行/阴阳、中英文、生肖、方位、时辰范围、月建、节令、季节、藏干、六合、冲、害、三合、三会、刑、自刑、该地支下十天干十二长生、含该支的六十甲子列表。
- 注意：它提供关系资料，不代表命局中已经发生合化；页面需结合实际命盘成员判断。

### tenGodPillarProfile(god, pos)
- 输入：十神名称与柱位 ID；非法值返回 null。
- 柱位定义目前为 `year`、`month`、`hour`，不含 `day`。
- 返回：十神名称/阵营/关系、柱位定义，以及十个日干对应的天干、五行、阴阳、十神关系矩阵。
- 注意：这是规则查询矩阵，不是针对某个命盘的实际柱位结论。

### stageProfile(index)
- 输入：整数 0–11；越界或非整数返回 null。
- 返回：长生阶段、中英文名称、十天干对应地支/阴阳顺逆/起点/验证标记，以及处于该阶段的六十甲子列表。

### kongWangOf(jiaziIdx) / kongWangOfDayGz(gz)
- `kongWangOf` 输入六十甲子索引，按旬序计算两个空亡地支索引；源码未见显式参数范围校验。
- `kongWangOfDayGz` 输入日柱干支字符串，先查六十甲子；无效返回 null。有效时返回 `xunStart` 与两个空亡地支 `voids`。
- 页面尚未建立独立空亡展示。应优先调用按日柱干支的接口，避免前端自行维护旬空索引。

### yearMonthPillars(year) / lichunOf(year) / yearProfile(year)
- `lichunOf(year)` 返回该年立春的年月日时分与文本；数据表范围外返回 null。
- `yearMonthPillars(year)` 返回十二节月干支，每项包含序号、月建、干支、天干/地支索引及节令。
- `yearProfile(year)` 返回该公历年份对应干支、五行阴阳、纳音、生肖、立春节气、下一年立春、太岁关系、犯太岁筛选结果及十二月干支。
- 注意：`yearProfile(year)` 的 year 是公历年份索引，不自动代表任意查询时刻的“当前流年”。当前流年必须结合查询时刻与立春精确时刻判定。

## 4. 页面现状与关键差异

- 页面排盘时分别调用 `computeBazi`、`computeFavorableElement`、`computeLuckPillars`；后两个接口内部又各自调用 `computeBazi`。目前没有统一的单次计算上下文。
- `computeBazi` 原始结果保存在 `lastChart`；扶抑结果保存在 `lastFavorable`；大运结果保存在 `lastLuck`。
- 页面流年从浏览器公历当前年开始显示未来六年，虽展示立春文本，但未依据当前精确时刻给当前干支年打标。
- 页面扶抑卡片把引擎旺衰判定与前端五行阵营比例、简化根气判断混合展示。
- 未知时辰在核心命盘中是 null，但页面各模块仍需统一过滤规则，尤其神煞扫描、详情卡片和关系分析。
- `tenGodPillarProfile` 只定义年/月/时柱；日柱为日主，不应机械地套用同一矩阵。

## 5. 推荐的页面标准化数据契约（设计建议，当前不存在）

每次排盘成功后构造只读 `ChartContext`，保留引擎原始对象，不覆盖或重写：

- `schemaVersion`
- `engineVersion`
- `birthInput`：完整输入及未知时辰状态
- `calculationMeta`：绝对时刻、真太阳时修正、夏令时、sect、时区
- `raw.chart`：原始 `computeBazi` 返回
- `raw.favorable`：原始 `computeFavorableElement` 返回
- `raw.luck`：原始 `computeLuckPillars` 返回
- `profiles.dayPillar`、`profiles.branches`、`profiles.tenGodPillars`、`profiles.kongWang`
- `annual.queryInstant`、`annual.gregorianYear`、`annual.currentGanzhiYear`、`annual.monthPillars`
- `provenance`：展示字段的来源接口/路径，或前端派生规则及版本

约束：
1. 原始引擎返回与前端派生结果分层保存。
2. 未知时辰下时柱必须为 null；不得进入统计、关系、神煞或柱位剖面。
3. 当前流年必须有查询时刻及立春边界，不以公历年份直接代替。
4. 页面说明必须区分引擎算法结果、前端统计参考和人工解释。
5. 未来 AI 只读取版本化快照，不重新排盘。

## 6. 下一轮审计/验收顺序

1. 继续核查 `yearGanzhi`、`zodiacIndexFromDateTime`、`shenshaScan`、`branchRelations` 的参数与返回结构。
2. 为未知时辰建立跨模块边界表，逐项确认过滤行为。
3. 将页面每个展示字段映射到 ChartContext 的来源路径。
4. 为流年当前年、扶抑来源分层、未知时辰、旬空增加明确回归用例。
5. 之后才设计同一页面的模块组织与直播大屏展示；本阶段不创建独立直播课件。

## 7. 本轮未做事项

- 未修改页面、样式或引擎算法。
- 未部署 VPS1。
- 未进行真实浏览器测试。
- 未进行独立历书准确性核验。
- 未启用支付、会员、AI 解读、合盘或其他收费功能。


## 8. 第二轮源码核查补充（2026-11-03）

### 8.1 最新审计基线

本轮重新读取 GitHub main：
- 最新提交：d5f69c2002c414793b14ad2a2b77723ab8a6c356（docs: add engine data contract audit）。
- 本轮再次读取的 assets/app.js SHA：e991d112e89efcab216a82d093900ac20e773852。
- 本轮再次读取的 vendor/bazi-engine.web.js SHA：74e9e0eb4fa15c0ef08a5ce8d7a6879c958dd5f7。
- index.html SHA：245bd8b9cfbe1f62ffc0e0ef3ee4006cac59da12。

最新提交只新增本审计文档，没有修改页面或引擎源码。引擎公开常量确认：ENGINE_VERSION = 'v0.15.1'；文件头部 Web v0.13.0 是注释标识，不是运行时常量。

### 8.2 流年与立春接口的精确行为

#### yearGanzhiIndex(year) / yearGanzhi(year)
- 输入为公历年份数值；按 1984 甲子年为基准，对 60 取模。
- yearGanzhiIndex 返回 0–59 索引；yearGanzhi 返回对应干支字符串。
- 这两个函数只做年份干支映射，不判断一个具体时刻是否已经过立春。

#### zodiacIndexFromDateTime(year, month, day, hour, minute)
- 输入为年月日时分；省略 hour 时默认 12，省略 minute 时默认 0。
- 读取 lichunOf(year)，将传入的月日时分与该年立春的月日时分作数值比较。
- 立春之前取 year - 1，立春当刻及之后取 year，再映射为地支/生肖索引。
- 若该年份没有立春表数据，返回 null。
- 函数没有时区参数，也没有完整日期合法性校验；调用端必须先统一查询时刻与立春表所采用的时间口径，并验证输入。不能把浏览器本地时间未经转换就默认当成表内时间。

#### yearMonthPillars(year)
- 返回固定 12 项。
- 每项字段：ordinal、month、ganzhi、stem、branch、stemIndex、branchIndex、jie、jieEn。
- 该接口提供十二节月的干支和节令名称；没有返回每个月节气的精确年月日时分。

#### yearProfile(year)
- 参数是公历年份。
- 返回年干支、五行阴阳、纳音、生肖、lichun、nextLichun、太岁关系、犯太岁筛选和 months。
- months 即 yearMonthPillars(year) 的结果。
- 它不会根据当前查询时刻自动判断“当前流年”。页面要确定当前干支年，必须把查询时刻、时区口径和立春边界结合起来，不能只取 new Date().getFullYear()。

**页面实际情况：** renderAnnual() 从浏览器公历当前年开始，循环显示六个公历年份；只调用 yearProfile(y)，没有调用 zodiacIndexFromDateTime() 或读取 profile.months。当前标题是“未来六个公历年份”，不能将第一张卡片直接标记为已经完成立春切换的“当前流年”。

### 8.3 干支关系接口

#### stemRelation(s1, s2)
- 输入：两个天干字符。
- 返回数组；命中时包含 type、typeEn，天干五合另有 element。
- 当前实现只识别天干五合、天干相冲；不执行合化判断。

#### branchRelations(b1, b2)
- 输入：两个地支字符。
- 返回数组；可能包含六合、六冲、六害、相刑、自刑、半三合。
- 关系项按类型可能带 kind/kindEn 或 element/elementEn。
- 两支接口只判断两两关系；三合、三会完整组合需要额外组合成员检查，不能把半三合等同完整三合，更不能直接判为合化。
- 两个关系函数都没有完整的输入参数校验；调用端应只传有效天干/地支字符，空柱必须在调用前过滤。

**页面实际情况：**
- renderRelations() 只遍历本命现存柱的两两组合；三合、三会另用常量检查三支是否齐全。
- renderAnnual() 只把流年干支分别与本命柱两两比较。
- 页面没有把大运加入统一关系层，也没有把本命、大运、流年三层关系组织为同一结构。

### 8.4 shenshaScan(pillars) 的输入位置与返回边界

- 参数是按固定位置排列的四柱干支数组：索引 0 年柱、1 月柱、2 日柱、3 时柱。
- 每个有效位置传两字符干支字符串；缺失柱可传空字符串或空值。不能把只有三项的数组直接压缩成其他顺序。
- 函数内部以索引 2 取日干/日柱，以索引 0 取年支，以索引 1 取月支；位置错位会改变神煞起法。
- 返回数组，每项主要字段为 key、cn、where、anchor；同一神煞可能因锚点或命中位置不同出现不同记录。
- where 是描述性位置字符串，不是固定枚举；部分规则标注年支起/日干等锚点，部分规则可命中干或柱。

**页面实际情况：**
- drawPillars() 和 renderShensha() 都按四个固定位置传数组；未知时辰位置传空字符串，符合引擎的索引约定。
- renderShensha() 的“已扫描数量”按非空干支计数，因此未知时辰显示 3/4；这属于已知三柱，不是漏扫。
- 四柱卡片将 where 按包含“年支/月支/日支/时支”的文本归位；由于 where 还可能含“年柱”“日柱”或“干”等文字，当前卡片归位逻辑不保证覆盖所有命中类型。后续应使用结构化位置字段或明确解析规则，不应仅靠字符串包含判断。

### 8.5 未知时辰跨模块边界核查

| 模块 | 当前行为（源码静态核查） | 结论 |
|---|---|---|
| computeBazi | pillars.time = null；五行统计跳过空柱 | 核心结果边界正确 |
| 四柱卡片 drawPillars | 过滤时柱，不显示虚构时柱 | 正确 |
| 四柱卡片神煞扫描 | 固定四槽位，时柱传空字符串 | 保留位置，符合接口要求 |
| 详情 renderDetails | 仍生成时柱卡片，以“—”显示空值 | 没有伪造数据，但视觉上像一张空时柱；应统一为明确的“时辰未知”占位或隐藏 |
| 十二长生 renderTwelveStages | 过滤时柱 | 正确 |
| 干支关系 renderRelations | 只收集存在 ganzhi 的柱 | 正确 |
| 流年 renderAnnual | 只收集存在 ganzhi 的本命柱 | 正确 |
| 神煞总览 renderShensha | 时柱位置传空字符串，命中位置不应出现时支 | 输入槽位正确，需用回归用例确认全部规则 |
| 大运 computeLuckPillars | 仍生成大运结果，同时另给 unknownTime.low/high 两套边界估算；中午是参考锚点 | 页面当前已说明上方起运按中午参考时刻，并展示 low/high 的 traditional 范围；仍需真实浏览器验收说明是否清晰可见 |

补充：未知时辰的 computeLuckPillars 会以中午参考锚点构造大运序列，并额外返回当天起止窗口的 low/high 估算；若当天跨节气，jieAmbiguous 会提示边界歧义。它不是“未知时辰就完全不能算大运”，也不是“中午就是用户真实出生时刻”。

### 8.6 可复现性与页面调用差异

1. computeLuckPillars 的 today 缺省值来自 new Date().toISOString().slice(0, 10)，即 UTC 日期；页面没有显式传入 today。因此大运 isCurrent/current 的判定日期可能在用户本地午夜附近与本地日历日期不同。后续应明确以何种时区的“今天”为产品口径，并显式传参。
2. 页面大运调用只传 gender、count: 10，没有显式记录 method、frame、today；当前依赖引擎默认 traditional/civil/UTC today。
3. computeBazi 接受可选 tzCentralMeridian，但返回的 input 对象没有单独保存该原始参数；实际采用的中央经线保存在 meta.tzCentralMeridian。标准快照应保留用户原始输入与引擎最终采用值两者。
4. computeFavorableElement 的阈值源码为 strong >= 0.55、weak <= 0.45；中间为 balanced。其调候简则只覆盖夏季取水、冬季取火，春秋季明确标记没有季节级简则。
5. 当前页面分别调用三次计算入口；computeFavorableElement 与 computeLuckPillars 内部各自再次调用 computeBazi。这会重复计算，但本阶段不应为了优化而改写引擎；先定义只读上下文和契约，再评估安全复用方式。

### 8.7 下一批必须进入回归测试的边界

- 立春前一分钟、立春时刻、立春后一分钟：核对 zodiacIndexFromDateTime 与独立历书时间口径。
- UTC+8、UTC+9 和其他支持时区：确认传入查询时刻与立春表的转换方式。
- 未知时辰：确保神煞数组始终保留四个槽位，时柱不参与统计、关系、剖面和神煞命中。
- shenshaScan：检查固定柱表、日干起、年支起、月支起、空亡、天德/月德等规则在空时柱下不发生位置错位。
- branchRelations：分别覆盖六合、六冲、六害、相刑、自刑、半三合；完整三合/三会单独测试，不与两两关系混淆。
- 大运：明确 today 的时区口径；未知时辰跨节气时核对 low/high 与 jieAmbiguous。
- 流年月份：核对十二节月的干支序列及节令名称，注意接口不提供精确月界时刻。

## 9. 本轮结论与范围声明

本轮已完成以上接口的源码签名、关键分支、返回字段和页面调用行为静态核查，并将结果记录在本文件。当前最值得先处理的不是增加新菜单，而是统一“查询时刻/立春边界”“未知时辰”“大运 today 时区”和“神煞位置结构”四类数据边界。

本轮仍未修改页面、CSS、引擎算法或部署文件；未进行真实浏览器交互、移动端测试、独立历书准确性核验或 VPS1 部署。本文记录的是源码事实与待验证风险，不代表这些边界已经通过运行测试。


## 10. ChartContext 建议结构与页面字段映射（设计稿，尚未写入运行代码）

### 10.1 设计目标

ChartContext 是一次排盘成功后生成的只读页面上下文。它不取代引擎原始返回、不新增排盘算法，也不是服务端 API。它的任务是让本命、扶抑、大运、流年和各详情模块读取同一份输入与结果，避免每个模块自行猜测口径。

建议采用以下结构（示意契约，不是已实现 JSON）：

```js
{
  schemaVersion: "1.0",
  engine: {
    name: "BaZiEngine",
    version: "v0.15.1",
    calendarEngine: "lunar-javascript",
    calendarEngineVersion: "由 chart.meta.engineVersion 原样保留"
  },
  birthInput: {
    year, month, day, hour, minute,
    unknownTime,
    gender,
    longitude,
    tzOffsetHours,
    tzCentralMeridianInput,
    sect
  },
  calculationMeta: {
    absoluteInstantBeijing,
    trueSolarTime,
    trueSolarOffsetMinutes,
    dstApplied,
    tzOffsetHoursApplied,
    tzCentralMeridianApplied,
    sect,
    sectLabel
  },
  options: {
    luckMethod: "traditional",
    luckFrame: "civil",
    luckToday: "显式传入的日期及口径"
  },
  raw: {
    chart: "computeBazi 原始返回",
    favorable: "computeFavorableElement 原始返回",
    luck: "computeLuckPillars 原始返回"
  },
  profiles: {
    dayPillar: "dayPillarProfile 返回",
    branches: "按柱位保存 branchProfile 返回",
    kongWang: "kongWangOfDayGz 返回",
    twelveStages: "按明确参照天干生成的长生结果"
  },
  annual: {
    queryInstant,
    queryTimezone,
    queryInstantBeijing,
    gregorianYear,
    currentGanzhiYear,
    yearProfile,
    monthPillars
  },
  provenance: {}
}
```

字段要求：
- birthInput 保存用户实际输入；tzCentralMeridianInput 即使为空也要保留，不能用引擎推导值覆盖用户输入。
- calculationMeta 保存引擎最终采用值；实际中央经线以 chart.meta.tzCentralMeridian 为准。
- engine.version 应读取公开常量 BaziEngine.ENGINE_VERSION；不能从文件头注释推断。
- luckMethod、luckFrame、luckToday 必须显式记录。当前页面默认 traditional/civil，但未来不能只靠默认值维持历史报告可复现性。
- raw 下的三个对象必须保留原样；profiles 和 annual 是额外资料，不得覆盖 raw。
- 未知时辰时 birthInput.unknownTime=true、birthInput.hour=null、raw.chart.pillars.time=null；所有 profiles 和关系生成器必须跳过 time。
- annual 必须记录查询时刻与时区，并先转换为北京时间后再使用以北京时间为口径的立春表。
- provenance 只记录字段来源，不把解释文案伪装成引擎原始字段。

### 10.2 当前页面主要展示字段来源

| 页面区域 | 展示内容 | 建议来源路径/计算方式 | 来源类型 |
|---|---|---|---|
| 四柱主卡片 | 干支 | raw.chart.pillars.{year,month,day,time}.ganzhi | 引擎直出 |
| 四柱主卡片 | 天干十神 | pillar.shiShenGan；缺失时 tenGodOf(dayMaster, stem) | 引擎直出/引擎函数 |
| 四柱主卡片 | 藏干 | pillar.hideGan | 引擎直出 |
| 四柱主卡片 | 藏干十神 | tenGodOf(dayMaster, hiddenGan) | 引擎函数 |
| 四柱主卡片 | 纳音 | pillar.naYin | 引擎直出 |
| 四柱主卡片 | 阴阳五行标签 | STEMS/BRANCHES 与对应属性常量映射 | 引擎常量格式化 |
| 四柱主卡片 | 墓库角标 | 当前前端按辰戌丑未判断 | 前端展示规则；需明确标注，不冒充独立接口结果 |
| 四柱主卡片 | 神煞落柱 | shenshaScan 的 hits，按结构化位置归位 | 引擎函数 + 前端归位 |
| 五行分布 | 三种统计口径 | raw.chart.fiveElements.* | 引擎直出 |
| 扶抑摘要 | 旺衰、用神、不利五行 | raw.favorable.score / fuYang | 引擎直出 |
| 扶抑摘要 | 帮扶/克泄耗展示比例 | 从选定的五行统计口径与日主十神阵营推导 | 前端派生；不得冒充引擎 score.ratio |
| 扶抑摘要 | 根气提示 | 当前前端只检查藏干元素 | 前端简化派生；未完成完整根气规则前应保持“提示”定位 |
| 调候 | 调候规则 | raw.favorable.tiaoHou | 引擎直出；需说明春秋无季节级简则 |
| 详情 | 藏干、十神、纳音 | raw.chart.pillars + tenGodOf | 引擎直出/引擎函数 |
| 详情 | 十二长生 | twelveStage(dayMaster, branch) | 引擎函数；明确“以日干为参照” |
| 十二长生页 | 各柱天干坐支 | twelveStage(pillarStem, pillarBranch) | 引擎函数；与详情页参照口径不同 |
| 干支关系 | 两两关系 | stemRelation / branchRelations | 引擎函数；只代表规则命中，不代表合化 |
| 干支关系 | 三合、三会 | BRANCH_TRINE / BRANCH_MEETING + 成员检查 | 前端组合检查 |
| 神煞 | 神煞命中与起法 | shenshaScan 的 key/cn/where/anchor | 引擎函数；where 目前是描述文本 |
| 大运 | 起运、大运干支、十神、藏干、长生、当前标记 | raw.luck.start / pillars / current | 引擎直出 |
| 大运 | 未知时辰起运范围 | raw.luck.unknownTime.low/high | 引擎直出；页面应同时展示中午参考说明 |
| 流年 | 年干支、纳音、生肖、太岁关系、立春 | yearProfile(gregorianYear) | 引擎函数；公历年份资料，不自动等于当前流年 |
| 流年 | 当前干支年 | zodiacIndexFromDateTime(北京时间查询时刻) + yearGanzhi | 引擎函数；调用端负责时区转换 |
| 流年 | 十二节月 | yearMonthPillars(year) 或 yearProfile.months | 引擎函数；当前页面未展示 |

### 10.3 数据生成顺序

1. 校验并冻结 birthInput。
2. 调用 computeBazi，成功后保存 raw.chart。
3. 读取 ENGINE_VERSION，并从 chart.meta 保存历算、时区、真太阳时和换日口径。
4. 调用 computeFavorableElement，保存 raw.favorable；若失败，保留 chart 并将 favorable 标记为 unavailable，不伪造默认结果。
5. 若性别有效，调用 computeLuckPillars，显式传入 method、frame、today，保存 raw.luck；若失败，不影响本命排盘。
6. 基于 raw.chart 生成 dayPillar、branches、kongWang 等 profiles；未知时辰不生成 time profile。
7. 只有在用户打开流年模块或明确选择查询时刻时，生成 annual；先将查询时刻转换到北京时间，再调用立春相关接口。
8. 各 UI 模块只读取 ChartContext，不再自行重新排盘或偷偷改变计算口径。

### 10.4 当前阶段不做的事

- 不把 ChartContext 暴露为公网 API。
- 不上传出生资料到 VPS2、云模型或第三方。
- 不引入账号、会员、支付、订单或 AI 服务。
- 不把合盘、择日、姓名、八宅、六十四卦混进单人命盘上下文；未来按独立领域模块接入。
- 不在本轮为了减少重复计算而重写 computeFavorableElement 或 computeLuckPillars。


## 11. 第二批剖面接口字段级核查

### 11.1 dayPillarProfile(gz)

- 输入：有效六十甲子字符串，例如“甲子”；必须是长度为 2 的字符串，且天干、地支均在引擎表内，否则返回 null。
- 返回字段：
  - 基础：gz、stem、branch、stemIdx、branchIdx。
  - 英文/属性：stemEn、branchEn、animalEn、stemElement、branchElement、stemPolarity。
  - 日干坐支关系：seat、seatCn、seatEn。seat 由日干五行与地支五行的生克关系派生，属于引擎规则分类，不是吉凶结论。
  - 藏干：hidden[]，每项含 gan、ganEn、pos、posCn、element、god、godEn、group、groupCn、groupLabel、relation；十神以该日柱天干作为日主计算。
  - 长生：stage、stageEn、stageIndex；以该柱天干坐该柱地支计算。
  - 纳音：nayin、nayinEn、nayinPartner、nayinPairIndex。
- 该接口适合日柱详情卡，不应把其中“坐支关系”直接写成婚姻、性格或吉凶断语。

### 11.2 branchProfile(branch)

- 输入：单个有效地支字符；无效时返回 null。
- 返回字段：
  - 基础属性：branch、index、element、elementEn、polarity、branchEn、animalCn、animalEn、dirCn、dirEn。
  - 时间：hour（来自 branchHourRange，包含 start/end/text）、month、jie、jieEn、season、seasonEn。
  - 藏干：hidden[]，每项含 gan、ganEn、element、polarity、pos、posCn。
  - 关系：sixHe（branch/branchEn/element/elementEn）、clash（branch/branchEn）、harm（branch/branchEn）。
  - 组合：trine（element/elementEn/members/peers）、meeting（element/elementEn/dirCn/dirEn/members/peers）。
  - 刑：punishGroups[]（kind/kindEn/members/peers）、selfPunish。
  - 长生：stageOf[]，为十个天干分别在该地支上的 stage/stageEn/stageIndex。
  - 甲子列表：pillars[]，列出所有地支为该支的六十甲子。
- 注意：sixHe/clash/harm/trine/meeting 是该地支在规则表中的对应关系资料，不表示命盘中实际发生；只有将本命/大运/流年实际出现的地支集合与 members/peers 对照后，才可判定组合是否齐全。
- 该接口不返回藏干十神，因为十神必须依赖具体命盘日主；如需十神，使用 dayPillarProfile 的 hidden 或 tenGodOf(dayMaster, gan)。

### 11.3 stageProfile(index)

- 输入：0–11 的整数；无效时返回 null。
- 返回字段：index、stageCn、stageEn、rows、pillars、yangRows、yinRows。
- rows 每项对应一个天干，含 gan、ganEn、polarity、element、branch、branchEn、animalCn、animalEn、yangDirection、startBranch、startBranchEn、stageIndex、verified。
- pillars 列出六十甲子中落在该长生阶段的干支及 stemIdx、branchIdx。
- 该接口是十二长生规则查询表，不是某个命盘的直接分析结果。命盘中某柱的实际长生仍应调用 twelveStage(参照天干, 地支)。

### 11.4 tenGodPillarProfile(god, pos)

- god 必须属于 TEN_GOD_ORDER；pos 必须匹配 PILLAR_POS 中的柱位 id，否则返回 null。
- 返回：god、godEn、group、groupLabel、groupCn、relation、pos、posDef、rows。
- rows 固定十项，分别枚举十个可能的日主天干；每项含 dayGan、dayGanEn、dayElement、dayPolarity、gan、ganEn、ganElement、ganPolarity、god、godEn、group、groupLabel、groupCn、relation、samePolarity。
- posDef 是所选柱位的定义资料；接口结果是“某个十神在某柱位可能对应的干支/日主映射表”，不是当前命盘该柱的实时值。
- 当前接口不提供 day 柱位；日柱天干是日主本身，不能把日柱十神机械地套入此矩阵。

### 11.5 kongWangOfDayGz(gz)

- 输入有效六十甲子日柱字符串；无效时返回 null。
- 返回 xunStart（该旬首干支）和 voids（两个旬空地支）。
- 这是日柱旬空的直接接口；页面如果按每柱展示空亡，必须明确语义是“本日柱旬空落在哪些地支”，不能误写成每个柱各有一套独立旬空。
- 如需判断本命柱是否遇空亡，应将 voids 与本命年/月/日/时柱地支逐一比对；未知时辰不参与。

## 12. 核心计算函数输入与返回契约补充

### 12.1 computeBazi(opts)

主要输入：
- 必需：year、month、day。
- 可选：hour、minute、longitude、tzCentralMeridian、tzOffsetHours、unknownTime、sect。
- 默认：minute 为 0；tzOffsetHours 为 8；tzCentralMeridian 为 tzOffsetHours × 15；sect 为 1。
- unknownTime 为真时，time 柱为 null；未知时辰且中国历史夏令时命中时，不对未知小时执行减一小时。
- 绝对时刻年/月柱以转换后的北京时间计算；日/时柱按本地真太阳时（有经度时）或输入时间计算。
- 返回顶层字段：input、meta、pillars、fiveElements、tenGodsEn、branchEn、stemEn。
- input：year、month、day、hour、minute、longitude、tzOffsetHours、unknownTime、sect。注意不保存 tzCentralMeridian 原始输入。
- meta：dayMaster、dayMasterEn、dayElement、dayPolarity、dstApplied、trueSolarOffsetMinutes、tzCentralMeridian、tzOffsetHours、trueSolarTime、absoluteInstantBeijing、engine、engineVersion、sect、sectLabel、sectLabelEn。
- pillars：year/month/day/time；每个有效柱含 ganzhi、hideGan、shiShenGan、naYin；未知时辰 time 为 null。
- fiveElements：stemsBranchesOnly、withHiddenHalfWeight、withHiddenFull 三套计数。
- 重要口径：year/month 使用绝对时刻（北京时间）历法柱；day/hour 使用本地真太阳时口径。trueSolarTime 仅在输入经度且非 unknownTime 时生成。

### 12.2 computeFavorableElement(opts)

- 参数与 computeBazi 相同；内部重新调用 computeBazi(opts)。
- 返回顶层字段：engineVersion、dayMaster、chart、monthBranch、monthBranchEn、season、seasonEn、unknownTime、score、fuYang、tiaoHou、synthesis、fiveElements、conventionNote。
- score：perElement、breakdown、support、drain、total、ratio、thresholds、verdict、verdictEn、verdictCn。
- breakdown 每项含 pos、kind、char、element、weight、monthBoosted；月柱权重乘 2，日主天干不计入扶抑分。
- fuYang：method、favorable[]、unfavorable[]；每项含 element、elementEn、group、groupCn、groupLabel、reasonEn。
- tiaoHou：method、applicable、element、elementEn、rule、ruleCn。春秋简则不适用；夏季简则取水，冬季简则取火。
- synthesis：agree、noteEn；仅说明两种简则是否同向，不代表最终专业结论。
- fiveElements 是 computeBazi 的三种五行统计原样附带。
- 重要边界：扶抑分数是公开权重规则的计分结果；不能等同于对根气、合化、刑冲、调候、格局等全部因素综合后的权威旺衰结论。

### 12.3 computeLuckPillars(opts)

主要输入：
- 继承 computeBazi 的出生时间、时区、经度、未知时辰等参数。
- 额外：gender、count、method、frame、today。
- gender 识别 male/female、M/F、1/0、true/false 等当前实现值；不传或无法识别为 female 的值会按 male 处理，因此调用端必须要求用户明确选择性别，不能依赖默认。
- count 默认 10；method 仅 precise 会启用精确法，否则 traditional；frame 仅 true-solar 会启用真太阳时框架，否则 civil。
- today 默认 UTC 日期；页面应显式传入约定日期。
- 返回顶层：gender、genderLabel、direction、dayMaster、dayMasterEn、dayElement、monthPillar、yearPillar、chart、instant、elapsed、start、preLuck、pillars、current、frameAlt、today、sensitivity、unknownTime。
- pillars[] 每项含 index、ganzhi、stem、branch、stemEn、branchEn、element、branchElement、stemTenGod、branchTenGod、hideGan、hideGanTenGods、stage、stageEn、stageIndex、startAgeSui、endAgeSui、startYear、endYear、yearLabel、startDate、endDate、startDateTime、endDateTime、isCurrent。
- current 含 index、pill、today；today 同时在顶层重复。
- unknownTime 为未知时辰时包含 windowStart、windowEnd、low、high、jieAmbiguous、monthPillarAssumedNoon；已知时辰为 null。
- start 同时返回 traditional、precise、chosen、differenceDays 和起运日期/年龄；不能只保存 chosen 而丢弃另一种算法的对照结果。
- instant 记录出生、节气的北京时间/所选框架时间、节气方向和时间块；frameAlt 给出另一时间框架的结果。
- sensitivity 是参考时刻前后两小时的起运敏感性扫描；不是概率或误差置信区间。
- 性别不明时禁止调用或展示“默认男性”大运结果；前端应先要求明确性别。
- unknownTime 的 low/high 是当天时间窗口边界估算，不是统计置信区间；若 jieAmbiguous=true，月柱假设与起运节气必须特别提示。



## 13. 第二批接口与当前页面的接入状态

本轮重新检查 assets/app.js（SHA e991d112e89efcab216a82d093900ac20e773852），按页面对引擎对象的直接调用统计（包括局部变量 engine）：

| 引擎接口 | 当前页面直接调用次数 | 当前状态 |
|---|---:|---|
| dayPillarProfile | 0 | 已导出，未接入 |
| branchProfile | 0 | 已导出，未接入 |
| stageProfile | 0 | 已导出，未接入 |
| tenGodPillarProfile | 0 | 已导出，未接入 |
| kongWangOfDayGz | 0 | 已导出，未接入 |
| yearMonthPillars | 0 | 已导出，未接入 |
| zodiacIndexFromDateTime | 0 | 已导出，未接入 |
| yearProfile | 1（通过局部变量 engine 调用） | 已接入流年卡片；但只按公历当前年列六年，尚未用立春时刻确定当前干支年，也未展示 months |
| computeFavorableElement | 1 | 已接入 |
| computeLuckPillars | 1 | 已接入 |

说明：以上统计仅表示页面中对引擎对象的直接调用；不统计引擎函数内部互相调用，也不统计页面自有辅助函数或硬编码规则。

### 13.1 本命免费版接入优先级

P1 第一批应接入：
1. dayPillarProfile：补充日柱坐支关系、日柱藏干十神、日柱纳音配对等资料。
2. branchProfile：补充地支方位、时辰范围、节令、季节、藏干位置、六合/冲/害/刑/三合/三会规则资料。
3. kongWangOfDayGz：建立统一旬空结果，并与四柱地支比对后展示命盘中哪些柱遇旬空。
4. yearMonthPillars、zodiacIndexFromDateTime、yearGanzhi：完善当前干支年及十二节月资料；先统一查询时刻和北京时间转换。
5. stageProfile、tenGodPillarProfile：作为规则资料库或辅助说明，不应全部塞进命盘首页。用户需要理解某个十神/长生时，再在对应详情中按需展示。

### 13.2 不应误用的字段

- branchProfile.trine / meeting 是某个地支所属组合规则，不是当前命盘已经构成该局。
- branchProfile.sixHe / clash / harm 是规则映射，不是当前命盘已经发生关系。
- dayPillarProfile.seat 是五行生克关系标签，不是婚姻宫吉凶结论。
- stageProfile 是全局规则矩阵，不是本命每柱的长生结果。
- tenGodPillarProfile 是十神与柱位映射表，不是用户命盘当前十神结果。
- kongWangOfDayGz 的 voids 是日柱旬空地支；必须与命盘柱支比对后才形成哪柱遇旬空的展示结果。
- yearMonthPillars 返回节月资料，不含精确节气时刻；不能单独用于精确日期范围筛选。


## 14. 流年查询时刻与北京时间口径（2026-11-03）

### 已核实的引擎接口

- `lichunOf(year)`：输入公历年份，返回该年立春的 `year/month/day/hour/minute/text/dateText`；数据表范围外返回 `null`。时间按北京时间解释。
- `yearGanzhiIndex(year)` / `yearGanzhi(year)`：只按公历年份映射六十甲子，不判断具体时刻是否已过立春。
- `zodiacIndexFromDateTime(year, month, day, hour, minute)`：输入年月日时分，按该年立春时刻判断属于上一年还是本年，返回地支索引；无时区参数，缺省时分为 12:00。比较精度到分钟，不能承诺秒级切换。
- `yearMonthPillars(year)`：返回十二节月资料，每项含 `ordinal/month/ganzhi/stem/branch/stemIndex/branchIndex/jie/jieEn`；不包含十二个交节的精确时刻。
- `yearProfile(year)`：输入公历年份，返回该年份干支资料、`lichun/nextLichun`、太岁关系以及 `months`（即十二节月资料）。它不会自行判断某个查询时刻的当前干支年。

### 页面调用约束

1. 页面先把实际查询瞬间转换为 `Asia/Shanghai` 的年月日时分，再调用 `zodiacIndexFromDateTime`；不得把浏览器本地墙上时间原样传入。
2. 当前干支年以北京时间与 `lichunOf(北京时间年份)` 的年月日时分比较：立春前归上一干支年，立春当分钟及之后归本年。
3. 用 `yearProfile(当前干支年)` 作为当前年资料，再顺序展示后续年份；不能从公历当前年份直接起列。
4. `yearMonthPillars/yearProfile.months` 只展示十二节月干支与节令名称；没有交节时刻，不得标记当前节月或用它判断任意日期所属节月。
5. 页面应展示本次采用的北京时间查询时刻，且将流年直接关系说明为规则对照，不扩写成完整吉凶结论。
6. 引擎立春表只精确到分钟；若页面交叉核对失败或立春数据缺失，应停止标记当前流年并显示说明，不得猜测。



## 15. 大运当前步的 today 日期参数补充

`computeLuckPillars(opts).today` 是 `YYYY-MM-DD` 日期字符串。源码内部将其解析为该日期 UTC 零点，再与各步大运起始日期比较，确定 `current.index` 和 `pillars[].isCurrent`；它是日期级判断，不使用查询当天的小时和分钟。若不传该字段，引擎默认取 UTC 日期。

本产品页面采用北京时间日历日期：调用端先通过 `Asia/Shanghai` 时区取得当前日期，再显式传入 `today`。页面应同时展示该日期及“按日期判断当前大运步”的说明。此口径只决定当前大运标记，不改变起运日期、起运年龄或大运顺逆算法。


## 16. 本命—大运—流年关系接口字段审计

### 16.1 两两关系接口

- stemRelation(stemA, stemB) 返回数组；命中时包含 type/typeEn，天干五合另含 element。当前实现识别天干五合、天干相冲；未命中返回空数组。
- branchRelations(branchA, branchB) 返回数组；可能包含：
  - 六合：type/typeEn/element
  - 六冲、六害：type/typeEn
  - 相刑：type/typeEn/kind/kindEn
  - 自刑：type/typeEn
  - 半三合：type/typeEn/element/elementEn
- 该接口是两支之间的规则查询，不会单独判断三合/三会是否完整，也不会判断合化。

### 16.2 三层参与对象建议

页面关系层应以明确的来源对象组成，不覆盖原始引擎结果：
- 本命：年、月、日、时实际存在的柱；未知时辰时 time=null，必须跳过。
- 大运：只取 lastLuck.current.pill 对应的当前大运柱；若尚未起运或当前对象为空，不得拿第一步大运冒充当前大运。
- 流年：按北京时间与立春边界确定当前干支年，再取 yearProfile(currentGanzhiYear) 的年干、年支。

每个关系结果至少记录双方层级、柱位、干支字符、接口来源与关系字段。展示时区分同层关系和跨层关系，不得丢失“谁与谁发生关系”的定位。

### 16.3 完整组合边界

- 三合/三会必须收集所有实际参与对象的地支后，按引擎公开组合成员表检查成员是否齐全；只有两支时最多展示“半三合”规则命中。
- 不得把 branchProfile().trine/meeting 的规则资料当成已形成组合。
- 多个层级同时出现相同地支时，必须保留来源身份；不能先去重后再判断参与成员，否则会丢失组合来源。
- 关系命中只描述传统干支规则，不直接生成吉凶、合化、事件或百分比结论。
- 未知时辰、当前大运为空、流年时间无法确认时，对应对象必须缺席，而不是用占位字符参与关系计算。


## 17. 三层关系页面输出对象约定

关系页面参与者是页面层的只读包装对象，结构为 `{ id, layer, label, gz }`：
- `id` 标识具体来源（本命年/月/日/时、当前大运、当前流年），相同干支在不同层级出现时也保留为不同对象。
- `layer` 为“本命 / 当前大运 / 当前流年”；`label` 保留柱位或大运步序；`gz` 是引擎返回的两字干支。
- `stemRelation(gzA[0], gzB[0])` 与 `branchRelations(gzA[1], gzB[1])` 逐对计算；页面不改写引擎关系结果的含义。
- 当前大运只读取 `lastLuck.current.pill`；当前流年通过北京时间立春边界确定后调用 `yearProfile(year)`。
- 完整三合/三会检查三个不同地支成员是否分别存在于参与对象集合；同一成员可有多个来源，展示时全部保留。该成员齐备检查不是合化判定。
- 未知时辰、当前大运缺失或流年不可确定时，不创建相应参与对象。



## 18. P2 时间轴选择状态契约

### 18.1 页面状态

- `selectedLuckIndex`：用户当前选中用于关系对照的大运序号，取值只能来自 `lastLuck.pillars[].index`；`null` 表示不指定大运。
- `selectedAnnualYear`：用户当前选中用于关系对照的公历年份，取值范围为当前干支年及后续五年；年份资料必须通过 `yearProfile(year)` 获取。
- 重新提交出生资料并成功排盘时，两项选择状态都重置：大运优先选中 `lastLuck.current.pill.index`（若为空则为 null）；流年重置为北京时间立春口径确认的当前干支年。
- 切换选择器只更新页面关系上下文，不重新计算 `lastChart`、`lastLuck`、起运时间或四柱。

### 18.2 当前值与选中值

- `lastLuck.current.pill` 是引擎按 `today` 日期计算的当前大运步。
- `selectedLuckIndex` 是用户选择用于关系对照的大运步；可与当前步不同。不得把用户所选未来/过去大运标成“当前大运”。
- 当前流年由北京时间和立春边界确定；`selectedAnnualYear` 是关系对照所选流年。选中年份不改变当前流年定义。
- 关系参与者的 layer/label 应使用“所选大运”“所选流年”等中性标签；只有选中项恰好等于当前项时，才可附加当前标记。

### 18.3 缺失与边界

- 性别未指定或大运计算失败时，`lastLuck` 可能为空；不得生成虚构选项或默认男性大运。
- 当前大运为空时，选择状态保持 null；用户可从引擎真实返回的 `pillars[]` 中手动选择某一步。
- 未指定大运时，关系对象集合不加入大运；本命与所选流年关系仍可计算。
- 流年基准无法确认时，不能生成默认流年选择；应保留错误提示并跳过流年对象。
- 选择器的值只允许来自当前命盘对应的大运列表/流年范围，不能跨命盘沿用旧选择。


## 19. P2 第二批：选中时间层资料展示契约

- 大运摘要只能读取当前命盘的 `lastLuck.pillars[]) 中与 `selectedLuckIndex` 匹配的对象；不得从当前大运或第一步大运拼造摘要。
- 大运摘要字段为引擎真实返回的步序、干支、年份标签、虚岁范围、天干/地支十神、藏干和十二长生。字段缺失时显示“—”，不得自行推算。
- 流年摘要必须通过 `yearProfile(selectedAnnualYear)` 取得；天干十神以本命日主调用 `tenGodOf`，不得改变日主参照。
- 流年十二节月必须取同一个所选年份的 `yearProfile(selectedAnnualYear).months`；不能继续固定读取当前年份。
- 选择状态、摘要卡片、年度卡片高亮和关系页参与对象必须共享同一页面状态；不得出现摘要年份与关系计算年份不一致。
- 引擎未返回所选年份完整资料时，显示不可用提示，不生成伪造节月或五行资料。


## 20. P2 第三批：时间轴卡片选择契约

- 大运卡片只能提交当前 `lastLuck.pillars[]` 中真实存在的 `index`；前端再次校验索引后才更新 `selectedLuckIndex`。
- 流年卡片只能提交当前北京时间立春基准起连续六年范围内的整数年份；更新前再次校验范围。
- 卡片、下拉框、所选摘要、关系页参与对象必须共享 `selectedLuckIndex` / `selectedAnnualYear`，禁止另设卡片私有状态。
- 选择大运不重置流年；选择流年不重置大运；本命四柱始终不变。
- 时间轴卡片采用原生 `button`，通过 `aria-pressed` 暴露选择状态；不以普通 `div` 绑定点击替代键盘可访问交互。
- 卡片事件由 tab 内容容器委托处理，避免每次 `renderTab()` 重绘时重复注册父级事件。


## 21. P2 第四批：关系对象定位契约

- 本命参与对象定位键为 `pillar-year/month/day/time`；未知时辰不生成时柱定位入口。
- 大运关系对象必须携带真实 `selectedLuck.index`；定位前校验该索引仍存在于当前 `lastLuck.pillars[]`，随后同步选择状态并打开大运详情。
- 流年关系对象必须携带当前参与的 `selectedAnnualYear`；定位前校验它仍在北京时间当前干支年起连续六年范围内，随后同步选择状态并打开流年详情。
- 两两关系卡片的参与对象标签、三合/三会成员来源标签均指向同一个参与对象模型；不得只展示来源文字而无法定位。
- 定位动作只改变当前详情标签、所选时间层状态和页面滚动位置，不改变命盘四柱与引擎计算结果。


## 22. P2 第五批：关系分类契约

- 关系分类只依据参与对象 ID 类型，不依据关系名称或干支值推断：两个 `natal-*` 对象归入本命内部；本命对象与 `luck-selected` 归入本命与大运；本命对象与 `annual-selected` 归入本命与流年；`luck-selected` 与 `annual-selected` 归入大运与流年。
- 分类不改变 `stemRelation`、`branchRelations` 的调用参数、返回值或命中规则；一对对象命中的天干与地支关系仍合并显示在同一关系卡片中。
- 总览计数等于各分类内有命中关系的对象对数量；无命中关系的对象对不计数、不生成空关系卡片。
- 三合/三会组合独立计数，不计入两两关系数量；仅按当前参与对象实际地支成员是否齐备展示。
- 总览入口只导航到已有非空分类；零项分类禁用。分类跳转不改变当前所选大运、流年或命盘数据。


## 20. P2 第六批：干支关系解释的数据依据（2026-11-03）

- stemRelation(s1,s2) 返回数组项字段：type、typeEn；天干五合另有 element。当前引擎实现检查 STEM_COMBINE、STEM_COMBINE_ELEMENT 与 STEM_CLASH。
- branchRelations(b1,b2) 返回数组项字段：type、typeEn；视关系类型可能包含 element/elementEn 或 kind/kindEn。实现使用地支六合、六冲、六害、刑组、自刑及三合规则表。
- 半三合由两个不同成员同时属于同一 BRANCH_TRINE 组合触发；引擎英文类型标记为 half trine (contested)。页面不得将半三合表述为完整三合。
- 完整三合、三会使用 BRANCH_TRINE、BRANCH_MEETING 的 branches 数组检查三个不同成员；element 和 dirCn 只作规则表资料展示。
- 上述字段和规则表是当前 vendor 的实际代码依据，不是古籍引文；页面不得将其冒称《渊海子平》原文。
- 解释层不得自行推导合化、吉凶、应事或强弱；没有可靠字段时退回客观规则名称。
