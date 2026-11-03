(() => {
  'use strict';
  const categories = {
    basics: {title:'入门基础',description:'认识四柱命盘的基本结构，以及阴阳、五行等常用基础概念。',topics:[['four-pillars','四柱结构','年、月、日、时四组干支构成命盘主体。'],['five-elements','五行基础','查看木、火、土、金、水的基本属性与相互关系。']]},
    'stems-branches': {title:'天干地支',description:'查询十天干、十二地支，以及它们在排盘中使用的阴阳和五行属性。',topics:[['stems-branches','天干地支基础','十天干、十二地支及阴阳五行属性。'],['five-elements','五行基础','五行生克作为传统分类和关系框架。']]},
    'ten-gods': {title:'十神体系',description:'十神以日主为参照，帮助标记命盘中其他天干与日主之间的五行生克和阴阳关系。',topics:[['ten-gods','十神是什么','十神的参照方式、分类方法与排盘位置。']]},
    'hidden-stems': {title:'藏干与纳音',description:'本分类整理地支藏干和纳音资料，帮助对照四柱卡片中的相关字段。',topics:[['hidden-stems','地支藏干','十二地支所藏天干，以及本气、中气、余气的常见标记。'],['nayin','纳音五行','查看六十甲子各组干支对应的纳音名称及其在排盘中的位置。']]},
    'twelve-stages': {title:'十二长生',description:'整理十二长生的名称顺序，以及排盘页面中不同参照天干的展示方式。',topics:[['twelve-stages','十二长生基础','十二阶段名称、顺序和排盘参照方式。']]},
    relations: {title:'干支关系',description:'查询天干与地支的常见规则关系。关系命中是结构资料，不自动代表合化成立或吉凶结论。',topics:[['branch-relations','地支关系概览','六合、六冲、六害、刑、三合与三会的规则入口。']]},
    luck: {title:'大运与流年',description:'整理起运、大运时间轴、流年和节月资料，说明它们如何与本命命盘联动。',topics:[['luck-cycle','大运与流年','大运、流年与本命命盘的时间层次。']]},
    shensha: {title:'神煞资料',description:'查询排盘引擎识别的神煞名称、起法资料和命中柱位。神煞规则存在流派差异，不单独作为吉凶结论。',topics:[['shensha-index','神煞资料索引','神煞条目、起法来源与流派差异整理中。']]},
    rules: {title:'排盘规则',description:'说明排盘时涉及的时间口径和边界规则，帮助用户正确填写出生资料并理解结果。',topics:[['time-rules','排盘时间规则','立春换年、节气换月、时区、真太阳时与换日口径。']]}
  };
  const articles = {
    'four-pillars': {
      title:'四柱命盘的基本结构',category:'basics',categoryName:'入门基础',summary:'四柱由出生年、月、日、时对应的四组干支组成，是排盘结果的主体结构。',
      sections:[
        ['什么是四柱','四柱分别称为年柱、月柱、日柱、时柱。每一柱由一个天干和一个地支组成，四柱合计八个字，因此也称“八字”。'],
        ['日主是什么','日柱的天干通常称为日主或日元。在子平体系中，十神等关系以日干为参照。它是排盘中的一个计算基准，不等于对个人性格或命运的直接结论。'],
        ['在排盘页面怎么看','排盘主页的四柱区域展示年、月、日、时四柱。每柱下方还可能列出藏干、十神、纳音等补充资料；未知出生时辰时，时柱相关内容应按页面提示处理。']
      ],
      note:'年柱、月柱、日柱、时柱是命盘结构名称。传统文献对各柱象义另有论述，不能仅凭柱位标签直接推断现实事件。',
      sources:[['《渊海子平·论日为主》（维基文库录文）','https://zh.wikisource.org/zh-hans/淵海子平'],['《渊海子平》电子整理本及版本说明','https://changxianyi.com/guji/yuanhai/']]
    },
    'five-elements': {
      title:'五行基础与生克关系',category:'basics',categoryName:'入门基础',summary:'五行是木、火、土、金、水五类传统属性，排盘会用它们标记干支及相关关系。',
      sections:[
        ['五行是什么','五行分别为木、火、土、金、水。天干、地支及部分排盘资料会对应五行属性，便于归类和查看。'],
        ['相生与相克','常见相生次序为木生火、火生土、土生金、金生水、水生木；常见相克次序为木克土、土克水、水克火、火克金、金克木。'],
        ['排盘中如何使用','五行属性可用于查看四柱分布、干支关系和其他资料。页面中的五行数量或力量展示属于特定统计口径，不应把简单数量直接等同于旺衰或喜用结论。']
      ],
      note:'五行相生相克是基础关系框架。具体命局判断还涉及月令、季节、干支组合和采用的分析方法，不能只看某一项统计。',
      sources:[['《渊海子平·论五行生克制化》（维基文库录文）','https://zh.wikisource.org/zh-hans/淵海子平']]
    },
    'stems-branches': {
      title:'天干与地支基础',category:'stems-branches',categoryName:'天干地支',summary:'天干有十位，地支有十二位，两者依次配合形成六十甲子。',
      sections:[
        ['十天干','甲、乙、丙、丁、戊、己、庚、辛、壬、癸，共十位。传统排盘还会为天干标注阴阳与五行属性。'],
        ['十二地支','子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥，共十二位。地支除阴阳五行属性外，还关联藏干、节令和多种地支关系。'],
        ['干支如何组成四柱','天干与地支按固定次序配合，形成甲子、乙丑等六十组干支。出生年、月、日、时各取一组，构成四柱。'],
        ['排盘中怎么看','四柱卡片中每柱上方或前部显示天干，地支与之配对显示。点击干支关系功能，可查看本命、大运和流年之间被规则识别的关系。']
      ],
      note:'天干地支同时用于历法纪时和传统术数表达。属性标记是分类资料，不单独构成吉凶判断。',
      sources:[['《渊海子平》卷一相关篇目目录与电子整理说明','https://nkg.best/knowledge/classics/yuan-hai-zi-ping'],['《渊海子平》（维基文库）','https://zh.wikisource.org/zh-hans/淵海子平']]
    },
    'ten-gods': {
      title:'十神是什么',category:'ten-gods',categoryName:'十神体系',summary:'十神以日主为参照，根据其他天干与日主之间的五行关系及阴阳属性进行分类。',
      sections:[
        ['十神的参照点','十神不是固定贴在某个天干上的标签，而是相对于命盘日干计算。同一个天干，遇到不同日主时，十神名称可能不同。'],
        ['五类关系','传统分类先区分同我、我生、生我、我克、克我五类，再结合阴阳差别，形成比肩、劫财、食神、伤官、正财、偏财、正官、七杀、正印、偏印十种名称。'],
        ['排盘中怎么看','四柱天干旁边及地支藏干下方显示的十神，均应以本命日主为参照。查看时可先确认日柱天干，再对照其他柱位。']
      ],
      note:'十神是关系分类术语，不是对一个人的固定人格标签，也不能单独据此断定现实中的好坏。',
      sources:[['《渊海子平·论日为主》（其中列出官杀、财、印绶、食伤、同类五类关系）','https://zh.wikisource.org/zh-hans/淵海子平']]
    },
    'hidden-stems': {
      title:'地支藏干',category:'hidden-stems',categoryName:'藏干与纳音',summary:'藏干是传统排盘中地支所对应的内部天干资料，常用于补充查看地支包含的五行信息。',
      sections:[
        ['什么是藏干','地支除自身的阴阳五行属性外，传统体系还为每个地支列出所藏天干。排盘页面通常把这些天干列在对应地支下方。'],
        ['本气、中气、余气','部分排盘体系会按藏干在该地支中的主次位置标注本气、中气、余气。不同资料的分日用事、权重和显示口径可能不同，本站展示应以实际引擎输出为准。'],
        ['与十神的关系','藏干本身是天干资料；将藏干换算为十神时，仍以本命日主为参照。因此同一藏干在不同命盘中的十神名称可能不同。'],
        ['排盘中怎么看','在四柱卡片的地支下方查看藏干列表；旁边的十神标记用于说明这些藏干相对于日主的关系。']
      ],
      note:'古籍中的藏干歌诀与后世整理表存在版本和分日用事口径差异。本站不把不同流派的藏干权重说法混为同一套计算规则。',
      sources:[['《渊海子平·又地支藏遁歌》（维基文库录文）','https://zh.wikisource.org/zh-hans/淵海子平'],['《渊海子平》目录中的“论天地干支暗藏总诀”“地支藏遁歌”','https://nkg.best/knowledge/classics/yuan-hai-zi-ping']]
    },
    'nayin': {
      title:'纳音是什么',category:'hidden-stems',categoryName:'藏干与纳音',summary:'纳音是六十甲子体系中的另一套五行名称，排盘中通常作为每柱干支的补充资料显示。',
      sections:[
        ['纳音的基本含义','六十甲子中的干支组合，按传统纳音体系对应金、木、水、火、土五类，并配有海中金、炉中火、长流水等具体名称。每一组相邻的干支共享一个纳音名称。'],
        ['与天干地支五行有什么不同','天干、地支各自有五行属性；纳音则是以一组干支为单位的另一套传统分类。比如查看某柱时，天干五行、地支五行与该柱纳音是不同层次的资料，不能互相替代。'],
        ['排盘中怎么看','纳音显示在四柱对应位置，通常以年柱、月柱、日柱、时柱各自的干支组合查得。可以把它作为命盘资料索引，与四柱干支一并查看。'],
        ['阅读时注意什么','古籍对纳音有取象和解释，但不同命理体系对纳音的使用侧重点并不一致。本站先提供名称与对应资料，不把单柱纳音直接解释为个人性格、吉凶或现实事件。']
      ],
      note:'《渊海子平》卷一设有“论六十花甲子纳音并注解”篇。本文为现代简要整理，不是古籍原文逐字注释；古籍版本及后世夹注应分别辨读。',
      sources:[['《渊海子平·论六十花甲子纳音并注解》（古籍馆录文）','https://nkg.best/knowledge/classics/yuan-hai-zi-ping'],['《渊海子平》版本与整理说明','https://changxianyi.com/guji/yuanhai/']]
    },
    'twelve-stages': {
      title:'十二长生基础',category:'twelve-stages',categoryName:'十二长生',summary:'十二长生是一组描述天干在十二地支上所处阶段的传统术数资料。',
      sections:[
        ['十二阶段名称','常见顺序为长生、沐浴、冠带、临官、帝旺、衰、病、死、墓、绝、胎、养。'],
        ['它如何对应命盘','十二长生需要先明确参照天干，再查看该天干与不同地支的对应阶段。因此不同天干在同一个地支上，显示结果可能不同。'],
        ['排盘中怎么看','本命十二长生区域按页面指定的参照方式展示各柱资料；选择大运后，也可在大运详情中查看对应阶段。查看时应留意页面标注的参照天干。']
      ],
      note:'十二长生是传统阶段名称体系，不应将“长生”“帝旺”“死”“墓”等字面含义直接解释为现实寿命或事件。',
      sources:[['《渊海子平》卷一“论天干生旺死绝”及卷五相关诗诀目录','https://nkg.best/knowledge/classics/yuan-hai-zi-ping'],['《渊海子平》（维基文库）','https://zh.wikisource.org/zh-hans/淵海子平']]
    },
    'branch-relations': {
      title:'地支关系概览',category:'relations',categoryName:'干支关系',summary:'地支关系是传统规则中对地支组合方式的分类，排盘页面展示的是规则命中，不自动代表合化或吉凶。',
      sections:[
        ['常见关系类别','常见类别包括六合、六冲、六害、相刑、自刑，以及三合、三会等。不同关系的参与数量和规则条件并不相同。'],
        ['两支关系与三支组合','六合、六冲、六害等通常按两支组合识别；三合、三会需要检查相应组合成员是否齐备。半三合等规则另有适用口径，且存在流派差异。'],
        ['如何理解排盘结果','本站关系页面显示引擎识别到的规则类型和参与对象来源。规则命中不等于已经发生合化，也不直接推导现实事件或吉凶。'],
        ['如何定位来源','在关系总览中选择类别，再点击关系双方或组合成员的来源入口，可返回本命柱位、大运时间轴或流年时间轴。']
      ],
      note:'本站按传统地支关系分类整理展示；不同典籍与流派对部分刑名、半合条件有不同说法。页面只提示规则命中和组合成员，不直接推断合化或吉凶。',
      sources:[['《渊海子平》目录：六合、三合、相冲、相穿、相刑相关篇目','https://nkg.best/knowledge/classics/yuan-hai-zi-ping'],['《渊海子平》电子整理本版本说明','https://changxianyi.com/guji/yuanhai/']]
    },
    'luck-cycle': {
      title:'大运与流年',category:'luck',categoryName:'大运与流年',summary:'大运和流年是命盘时间层次中的两类资料，可与本命四柱并列查看。',
      sections:[
        ['大运是什么','大运通常以月柱为起点按既定顺逆规则排列，并结合起运时间形成阶段序列。具体起运计算需要明确出生时间、性别和采用的历法口径。'],
        ['流年是什么','流年通常指某一干支年份。排盘页面按本站采用的立春换年口径确定干支年，并提供当前年份及后续年份资料。'],
        ['两者如何与本命对照','本命四柱是出生时的固定命盘资料；大运和流年是时间层。本站关系页面可将本命、所选大运和所选流年放在一起检查干支规则关系。'],
        ['排盘中怎么看','在大运详情选择某一步，在流年详情选择年份；选择状态会同步影响时间层摘要和关系页面。页面显示的判断日期以北京时间口径为准。']
      ],
      note:'古籍中关于大运的论述属于传统命理观点；现代排盘软件在起运细节、时间边界和历法换算上可能采用不同算法，应以工具明确标注的计算口径为准。',
      sources:[['《渊海子平·论大运》（维基文库录文）','https://zh.wikisource.org/zh-hans/淵海子平'],['《渊海子平》目录中的“论起大运法”','https://nkg.best/knowledge/classics/yuan-hai-zi-ping']]
    },
    'time-rules': {
      title:'排盘时间规则',category:'rules',categoryName:'排盘规则',summary:'排盘结果依赖出生时间、时区、经度以及年柱、月柱、日柱的历法切换口径。',
      sections:[
        ['立春换年与节气换月','部分排盘口径以立春作为干支年切换点，以节气作为月柱切换依据，因此公历元旦或农历初一不一定就是干支年、月柱的切换点。'],
        ['时区与真太阳时','出生地经度会影响地方太阳时校正。若启用真太阳时，时柱边界可能与直接使用标准时不同。应确认出生地和时间资料是否准确。'],
        ['未知时辰','缺少出生时刻时，时柱及依赖时柱的部分资料无法确定。排盘工具应明确显示未知状态，不应擅自补出一个时柱。'],
        ['本站口径','本站的年、月柱按北京时间绝对时刻和节气边界处理；日、时柱按本地真太阳时（提供经度时）或输入时间处理。详细边界以排盘页面和准确性测试文档为准。']
      ],
      note:'时间规则属于排盘计算口径，不同工具可能采用不同的子时换日、真太阳时和节气精度设置。比较结果时应先确认双方口径。',
      sources:[['《渊海子平》目录中的节候、节气及起运相关篇目','https://nkg.best/knowledge/classics/yuan-hai-zi-ping'],['本站排盘规则说明','./category.html?topic=rules']]
    },
    'shensha-index': {
      title:'神煞资料索引',category:'shensha',categoryName:'神煞资料',summary:'神煞是传统命理中按特定干支条件查取的一类辅助标记。',
      sections:[
        ['神煞是什么','神煞通常依据年、月、日、时的干支条件，按特定查表或推算规则标记。不同神煞可能采用不同的参照柱位。'],
        ['如何查看','排盘页面的神煞区域会列出引擎实际命中的项目和对应柱位。具体起法、别名和适用条件需要逐项核对来源。'],
        ['阅读注意','不同典籍和流派对部分神煞的名称、起法和解释存在差异。神煞列表是规则资料，不应脱离四柱结构单独作吉凶结论。']
      ],
      note:'本条目前为索引说明。各神煞的详细起法需逐项核验本站引擎规则及经典来源后再发布。',
      sources:[['《渊海子平》目录中的贵人、禄、驿马、华盖等相关篇目','https://nkg.best/knowledge/classics/yuan-hai-zi-ping']]
    }
  };
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const categoryGrid = document.getElementById('guide-categories');
  if (categoryGrid) {
    const input = document.getElementById('guide-search');
    const status = document.getElementById('search-status');
    const empty = document.getElementById('no-results');
    const cards = [...categoryGrid.querySelectorAll('.guide-category')];
    const results = document.getElementById('guide-search-results');
    input?.addEventListener('input', () => {
      const q = input.value.trim().toLocaleLowerCase();
      let shown = 0;
      cards.forEach(card => {
        const key = new URL(card.href).searchParams.get('topic') || '';
        const category = categories[key];
        const topicText = category ? category.topics.map(([id,name,desc]) => {
          const article = articles[id];
          return name + ' ' + desc + ' ' + (article ? article.title + ' ' + article.summary : '');
        }).join(' ') : '';
        const haystack = (card.textContent + ' ' + (category?.description || '') + ' ' + topicText).toLocaleLowerCase();
        const match = !q || haystack.includes(q);
        card.hidden = !match;
        if (match) shown++;
      });
      const matches = q ? Object.entries(articles).filter(([,article]) =>
        (article.title + ' ' + article.summary + ' ' + article.categoryName + ' ' + article.sections.map(section=>section.join(' ')).join(' ')).toLocaleLowerCase().includes(q)
      ) : [];
      if (results) {
        results.innerHTML = matches.slice(0,8).map(([id,article]) =>
          '<a class="search-result" href="./article.html?id='+encodeURIComponent(id)+'"><b>'+escapeHtml(article.title)+'</b><span>'+escapeHtml(article.categoryName+' · '+article.summary)+'</span></a>'
        ).join('');
        results.hidden = matches.length === 0;
      }
      empty.hidden = shown !== 0 || matches.length !== 0;
      status.textContent = q ? '匹配到 ' + matches.length + ' 篇条目，涉及 ' + shown + ' 个分类' : '输入关键词，查找相关分类与主题';
    });
    document.addEventListener('keydown', event => {
      if (event.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault(); input?.focus();
      }
    });
  }
  const categoryTitle = document.getElementById('category-title');
  if (categoryTitle) {
    const key = new URLSearchParams(location.search).get('topic') || '';
    const item = categories[key];
    if (!item) {
      categoryTitle.textContent = '暂未找到该分类';
      document.getElementById('category-breadcrumb').textContent = '分类不存在';
      document.getElementById('category-description').textContent = '请返回知识库首页，从现有分类中选择需要查看的主题。';
      document.getElementById('category-topics').innerHTML = '<div class="topic-item"><a href="./">返回知识库首页</a></div>';
    } else {
      document.title = item.title + '｜八字知识库';
      categoryTitle.textContent = item.title;
      document.getElementById('category-breadcrumb').textContent = item.title;
      document.getElementById('category-description').textContent = item.description;
      document.getElementById('category-topics').innerHTML = item.topics.map(([id,name,desc]) => '<a class="topic-item topic-link" href="./article.html?id='+encodeURIComponent(id)+'"><h3>'+escapeHtml(name)+'</h3><p>'+escapeHtml(desc)+'</p><span class="topic-status">阅读条目 ↗</span></a>').join('');
    }
  }
  const articleTitle = document.getElementById('article-title');
  if (articleTitle) {
    const id = new URLSearchParams(location.search).get('id') || '';
    const article = articles[id];
    if (!article) {
      articleTitle.textContent = '暂未找到该条目';
      document.getElementById('article-summary').textContent = '请返回知识库分类目录，选择已有的知识条目。';
      document.getElementById('article-content').innerHTML = '<div class="article-panel"><a href="./">返回知识库首页</a></div>';
    } else {
      document.title = article.title + '｜八字知识库';
      articleTitle.textContent = article.title;
      document.getElementById('article-category').textContent = article.categoryName;
      document.getElementById('article-category').href = './category.html?topic='+encodeURIComponent(article.category);
      document.getElementById('article-summary').textContent = article.summary;
      const sections = article.sections.map(([heading,body]) => '<section class="article-section"><h2>'+escapeHtml(heading)+'</h2><p>'+escapeHtml(body)+'</p></section>').join('');
      const sources = article.sources.map(([label,url]) => '<li><a href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(label)+' ↗</a></li>').join('');
      document.getElementById('article-content').innerHTML = sections + '<aside class="article-note"><b>阅读提示</b><p>'+escapeHtml(article.note)+'</p></aside><section class="article-sources"><h2>参考来源</h2><ul>'+sources+'</ul></section>';
    }
  }
})();