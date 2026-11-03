(() => {
  'use strict';
  const categories = {
    basics: {title:'入门基础',description:'认识四柱命盘的基本结构，以及阴阳、五行等常用基础概念。',topics:[['四柱结构','年柱、月柱、日柱、时柱分别是命盘的四个组成部分。'],['阴阳基础','了解阴阳作为传统分类方式时的基本用法。'],['五行基础','查看木、火、土、金、水的基本属性与相互关系。'],['命盘常用术语','整理排盘页面中经常出现的基础名称。']]},
    'stems-branches': {title:'天干地支',description:'查询十天干、十二地支，以及它们在排盘中使用的阴阳和五行属性。',topics:[['十天干','甲、乙、丙、丁、戊、己、庚、辛、壬、癸。'],['十二地支','子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥。'],['阴阳与五行属性','查看每个天干、地支对应的属性资料。'],['地支基础资料','了解地支与藏干、节气月份等资料的关联。']]},
    'ten-gods': {title:'十神体系',description:'十神以日主为参照，帮助标记命盘中其他天干与日主之间的五行生克和阴阳关系。',topics:[['十神名称','比肩、劫财、食神、伤官、偏财、正财、七杀、正官、偏印、正印。'],['日主与十神','了解十神为什么需要以日干作为参照。'],['四柱十神位置','查看年、月、日、时柱的天干与藏干十神资料。'],['十神查询方式','了解如何从排盘页面找到对应的十神资料。']]},
    'hidden-stems': {title:'藏干与纳音',description:'本分类整理地支藏干和纳音资料，帮助对照四柱卡片中的相关字段。',topics:[['地支藏干','查看十二地支所藏天干的对应资料。'],['本气、中气、余气','了解藏干列表中常见的位置名称。'],['藏干十神','藏干对应的十神仍以本命日主为参照。'],['纳音资料','查看六十甲子纳音名称及排盘中的显示位置。']]},
    'twelve-stages': {title:'十二长生',description:'整理十二长生的名称顺序，以及排盘页面中不同参照天干的展示方式。',topics:[['十二阶段名称','长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养。'],['排列与查询','查看十二阶段的顺序和对应地支资料。'],['本命参照','了解本命四柱中十二长生资料的参照方式。'],['大运参照','查看所选大运与日主阶段资料的对应关系。']]},
    relations: {title:'干支关系',description:'查询天干与地支的常见规则关系。关系命中是结构资料，不自动代表合化成立或吉凶结论。',topics:[['天干五合与相冲','查看天干之间的配对规则资料。'],['地支六合、六冲、六害','查看常见两两地支关系。'],['相刑与自刑','了解规则分组，并留意不同流派的名称差异。'],['半三合、三合与三会','区分两支同组、三支成员齐备等不同情况。'],['关系来源定位','从排盘关系结果返回对应本命柱位、大运或流年。']]},
    luck: {title:'大运与流年',description:'整理起运、大运时间轴、流年和节月资料，说明它们如何与本命命盘联动。',topics:[['起运资料','查看大运起运日期、年龄与计算口径说明。'],['大运时间轴','了解每一步大运的干支和时间范围。'],['流年资料','查看流年干支及立春换年的时间口径。'],['十二节月','了解流年资料中按节气划分的月份干支。']]},
    shensha: {title:'神煞资料',description:'查询排盘引擎识别的神煞名称、起法资料和命中柱位。神煞规则存在流派差异，不单独作为吉凶结论。',topics:[['神煞名称索引','整理常见神煞名称与别名。'],['起法与依据','记录具体神煞采用的起法及可核验来源。'],['命中柱位','了解排盘页面如何展示命中位置。'],['规则差异','区分不同流派的名称、起法和适用条件。']]},
    rules: {title:'排盘规则',description:'说明排盘时涉及的时间口径和边界规则，帮助用户正确填写出生资料并理解结果。',topics:[['立春换年','了解干支年与公历年份边界的关系。'],['节气换月','了解月柱按节气划分的基本口径。'],['时区与经度','查看 UTC 偏移、出生地经度和真太阳时相关说明。'],['未知时辰','了解缺少出生时辰时哪些资料会受到影响。'],['子时换日','查看不同换日口径的设置说明。']]}
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const categoryGrid = document.getElementById('guide-categories');
  if (categoryGrid) {
    const input = document.getElementById('guide-search');
    const status = document.getElementById('search-status');
    const empty = document.getElementById('no-results');
    const cards = [...categoryGrid.querySelectorAll('.guide-category')];
    input?.addEventListener('input', () => {
      const q = input.value.trim().toLocaleLowerCase();
      let shown = 0;
      cards.forEach(card => {
        const match = !q || card.textContent.toLocaleLowerCase().includes(q);
        card.hidden = !match;
        if (match) shown++;
      });
      empty.hidden = shown !== 0;
      status.textContent = q ? '找到 ' + shown + ' 个相关分类' : '输入关键词，查找相关分类与主题';
    });
    document.addEventListener('keydown', event => {
      if (event.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault(); input?.focus();
      }
    });
  }
  const title = document.getElementById('category-title');
  if (title) {
    const key = new URLSearchParams(location.search).get('topic') || '';
    const item = categories[key];
    if (!item) {
      title.textContent = '暂未找到该分类';
      document.getElementById('category-breadcrumb').textContent = '分类不存在';
      document.getElementById('category-description').textContent = '请返回知识库首页，从现有分类中选择需要查看的主题。';
      document.getElementById('category-topics').innerHTML = '<div class="topic-item"><a href="./">返回知识库首页</a></div>';
      return;
    }
    document.title = item.title + '｜八字知识库';
    title.textContent = item.title;
    document.getElementById('category-breadcrumb').textContent = item.title;
    document.getElementById('category-description').textContent = item.description;
    document.getElementById('category-topics').innerHTML = item.topics.map(([name,desc]) => '<article class="topic-item"><h3>'+escapeHtml(name)+'</h3><p>'+escapeHtml(desc)+'</p><span class="topic-status">主题目录 · 详细条目逐步整理</span></article>').join('');
  }
})();