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
