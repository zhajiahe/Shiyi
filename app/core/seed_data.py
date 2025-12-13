"""
内置模板和笔记类型种子数据

使用 daisyUI 组件设计卡片模板
"""

# ==================== 内置笔记类型定义 (使用 daisyUI) ====================

BUILTIN_NOTE_MODELS = [
    {
        "id": "builtin-basic",
        "name": "Basic (基础)",
        "fields_schema": [
            {"name": "Front", "description": "正面内容（问题）"},
            {"name": "Back", "description": "背面内容（答案）"},
        ],
        "css": "",
        "templates": [
            {
                "name": "正向卡片",
                "ord": 0,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-10">
    <p class="text-2xl font-medium text-base-content">{{Front}}</p>
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-6">
    <p class="text-xl text-base-content/70">{{Front}}</p>
    <div class="divider my-3"></div>
    <p class="text-2xl font-medium text-base-content">{{Back}}</p>
  </div>
</div>""",
            },
        ],
    },
    {
        "id": "builtin-basic-reversed",
        "name": "Basic (双向)",
        "fields_schema": [
            {"name": "Front", "description": "正面内容"},
            {"name": "Back", "description": "背面内容"},
        ],
        "css": "",
        "templates": [
            {
                "name": "正向卡片",
                "ord": 0,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-10">
    <p class="text-2xl font-medium text-base-content">{{Front}}</p>
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-6">
    <p class="text-xl text-base-content/70">{{Front}}</p>
    <div class="divider my-3"></div>
    <p class="text-2xl font-medium text-base-content">{{Back}}</p>
  </div>
</div>""",
            },
            {
                "name": "反向卡片",
                "ord": 1,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-10">
    <p class="text-2xl font-medium text-base-content">{{Back}}</p>
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-6">
    <p class="text-xl text-base-content/70">{{Back}}</p>
    <div class="divider my-3"></div>
    <p class="text-2xl font-medium text-base-content">{{Front}}</p>
  </div>
</div>""",
            },
        ],
    },
    {
        "id": "builtin-vocabulary",
        "name": "Vocabulary (词汇)",
        "fields_schema": [
            {"name": "Word", "description": "单词"},
            {"name": "Phonetic", "description": "音标"},
            {"name": "PartOfSpeech", "description": "词性 (n./v./adj./adv.)"},
            {"name": "Meaning", "description": "释义"},
            {"name": "Example", "description": "例句"},
            {"name": "Mnemonic", "description": "助记（可选）"},
        ],
        "css": "",
        "templates": [
            {
                "name": "单词 → 释义",
                "ord": 0,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-8">
    <h2 class="text-4xl font-bold text-base-content">{{Word}}</h2>
    {{#Phonetic}}<p class="text-base text-base-content/70 mt-2">[{{Phonetic}}]</p>{{/Phonetic}}
    {{#PartOfSpeech}}<div class="badge badge-outline badge-lg mt-3">{{PartOfSpeech}}</div>{{/PartOfSpeech}}
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-6">
    <h2 class="text-3xl font-bold text-base-content">{{Word}}</h2>
    {{#Phonetic}}<p class="text-sm text-base-content/60">[{{Phonetic}}]</p>{{/Phonetic}}
    {{#PartOfSpeech}}<div class="badge badge-outline mt-2">{{PartOfSpeech}}</div>{{/PartOfSpeech}}
    <div class="divider my-3"></div>
    <p class="text-xl text-base-content font-medium">{{Meaning}}</p>
    {{#Example}}<div class="bg-base-200 rounded-lg p-4 mt-4 w-full">
      <p class="text-sm italic text-base-content/80">{{Example}}</p>
    </div>{{/Example}}
    {{#Mnemonic}}<div class="bg-warning/20 rounded-lg p-3 mt-3 w-full">
      <p class="text-sm text-warning-content">💡 {{Mnemonic}}</p>
    </div>{{/Mnemonic}}
  </div>
</div>""",
            },
            {
                "name": "释义 → 单词",
                "ord": 1,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-8">
    {{#PartOfSpeech}}<div class="badge badge-outline badge-lg mb-4">{{PartOfSpeech}}</div>{{/PartOfSpeech}}
    <p class="text-2xl font-medium text-base-content">{{Meaning}}</p>
    {{#Example}}<div class="bg-base-200 rounded-lg p-4 mt-4 w-full">
      <p class="text-sm italic text-base-content/60">提示: {{Example}}</p>
    </div>{{/Example}}
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-6">
    <h2 class="text-3xl font-bold text-primary">{{Word}}</h2>
    {{#Phonetic}}<p class="text-sm text-base-content/60">[{{Phonetic}}]</p>{{/Phonetic}}
    {{#PartOfSpeech}}<div class="badge badge-outline mt-2">{{PartOfSpeech}}</div>{{/PartOfSpeech}}
    <div class="divider my-3"></div>
    <p class="text-xl text-base-content font-medium">{{Meaning}}</p>
    {{#Example}}<div class="bg-base-200 rounded-lg p-4 mt-4 w-full">
      <p class="text-sm italic text-base-content/80">{{Example}}</p>
    </div>{{/Example}}
  </div>
</div>""",
            },
        ],
    },
    {
        "id": "builtin-cloze",
        "name": "Cloze (填空)",
        "fields_schema": [
            {"name": "Text", "description": "填空文本，使用 {{c1::答案}} 格式"},
            {"name": "Extra", "description": "补充说明（可选）"},
        ],
        "css": """
.cloze {
  font-weight: 700;
  color: oklch(var(--p));
  background: oklch(var(--p) / 0.1);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  border-bottom: 2px solid oklch(var(--p));
}
.cloze-blank {
  display: inline-block;
  min-width: 4rem;
  border-bottom: 2px dashed oklch(var(--p));
  color: transparent;
}
""",
        "templates": [
            {
                "name": "填空卡片",
                "ord": 0,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body py-8">
    <div class="prose prose-lg max-w-none text-base-content">{{cloze:Text}}</div>
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body py-6">
    <div class="prose prose-lg max-w-none text-base-content">{{cloze:Text}}</div>
    {{#Extra}}<div class="divider my-3"></div>
    <div class="bg-base-200 rounded-lg p-4">
      <p class="text-sm text-base-content/80">{{Extra}}</p>
    </div>{{/Extra}}
  </div>
</div>""",
            },
        ],
    },
    {
        "id": "builtin-qa",
        "name": "Q&A (问答)",
        "fields_schema": [
            {"name": "Question", "description": "问题"},
            {"name": "Answer", "description": "答案"},
            {"name": "Source", "description": "来源/出处（可选）"},
        ],
        "css": "",
        "templates": [
            {
                "name": "问答卡片",
                "ord": 0,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body py-8">
    <div class="badge badge-outline mb-3">❓ Question</div>
    <p class="text-xl font-medium text-base-content">{{Question}}</p>
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body py-6">
    <div class="badge badge-outline mb-2">❓ Question</div>
    <p class="text-lg text-base-content/80">{{Question}}</p>
    <div class="divider my-3"></div>
    <div class="badge badge-primary mb-2">💡 Answer</div>
    <p class="text-xl font-medium text-base-content">{{Answer}}</p>
    {{#Source}}<p class="text-sm text-base-content/50 mt-4">📖 {{Source}}</p>{{/Source}}
  </div>
</div>""",
            },
        ],
    },
    {
        "id": "builtin-language",
        "name": "Language (语言学习)",
        "fields_schema": [
            {"name": "Phrase", "description": "短语/句子"},
            {"name": "Translation", "description": "翻译"},
            {"name": "Pronunciation", "description": "发音/注音（可选）"},
            {"name": "Context", "description": "语境/对话（可选）"},
            {"name": "Notes", "description": "语法/用法说明（可选）"},
        ],
        "css": "",
        "templates": [
            {
                "name": "外语 → 母语",
                "ord": 0,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-8">
    <p class="text-2xl font-bold text-base-content">{{Phrase}}</p>
    {{#Pronunciation}}<p class="text-sm text-base-content/60 mt-2">{{Pronunciation}}</p>{{/Pronunciation}}
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-6">
    <p class="text-xl font-bold text-base-content">{{Phrase}}</p>
    {{#Pronunciation}}<p class="text-sm text-base-content/60">{{Pronunciation}}</p>{{/Pronunciation}}
    <div class="divider my-3"></div>
    <p class="text-xl font-medium text-primary">{{Translation}}</p>
    {{#Context}}<div class="bg-base-200 rounded-lg p-4 mt-4 w-full">
      <p class="text-sm text-base-content/80">{{Context}}</p>
    </div>{{/Context}}
    {{#Notes}}<div class="bg-info/10 rounded-lg p-3 mt-3 w-full">
      <p class="text-sm text-base-content">📝 {{Notes}}</p>
    </div>{{/Notes}}
  </div>
</div>""",
            },
            {
                "name": "母语 → 外语",
                "ord": 1,
                "question_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-8">
    <p class="text-2xl font-medium text-base-content">{{Translation}}</p>
  </div>
</div>""",
                "answer_template": """<div class="card bg-base-100 shadow-lg border border-base-300">
  <div class="card-body items-center text-center py-6">
    <p class="text-2xl font-bold text-primary">{{Phrase}}</p>
    {{#Pronunciation}}<p class="text-sm text-base-content/60">{{Pronunciation}}</p>{{/Pronunciation}}
    <div class="divider my-3"></div>
    <p class="text-lg text-base-content">{{Translation}}</p>
    {{#Context}}<div class="bg-base-200 rounded-lg p-4 mt-4 w-full">
      <p class="text-sm text-base-content/80">{{Context}}</p>
    </div>{{/Context}}
  </div>
</div>""",
            },
        ],
    },
]


# ==================== 内置主题定义 ====================

BUILTIN_TEMPLATE_SETS = [
    {
        "id": "theme-cupcake",
        "name": "Cupcake (柔和)",
        "description": "柔和甜美的浅色主题",
        "css": "",
        "is_official": True,
    },
    {
        "id": "theme-dark",
        "name": "Dark (暗黑)",
        "description": "护眼暗色主题",
        "css": "",
        "is_official": True,
    },
    {
        "id": "theme-emerald",
        "name": "Emerald (翠绿)",
        "description": "清新绿色主题",
        "css": "",
        "is_official": True,
    },
    {
        "id": "theme-corporate",
        "name": "Corporate (商务)",
        "description": "专业商务风格",
        "css": "",
        "is_official": True,
    },
    {
        "id": "theme-dracula",
        "name": "Dracula (德古拉)",
        "description": "流行的深色开发者主题",
        "css": "",
        "is_official": True,
    },
    {
        "id": "theme-nord",
        "name": "Nord (北极)",
        "description": "北欧风格冷色调",
        "css": "",
        "is_official": True,
    },
]


# ==================== 示例共享牌组数据 ====================

SAMPLE_SHARED_DECKS = [
    {
        "id": "shared-programming-terms",
        "slug": "programming-terms",
        "title": "编程术语入门",
        "description": "程序员必备的基础编程术语，适合初学者快速了解计算机领域常用词汇。",
        "language": "en",
        "tags": ["编程", "计算机", "入门", "术语"],
        "note_model_id": "builtin-vocabulary",
        "template_set_id": "theme-cupcake",
        "is_featured": True,
        "is_official": True,
        "notes": [
            {
                "Word": "Algorithm",
                "Phonetic": "ˈælɡərɪðəm",
                "PartOfSpeech": "n.",
                "Meaning": "算法；一组解决问题的步骤",
                "Example": "This sorting algorithm has O(n log n) complexity.",
                "Mnemonic": "Al-go-rhythm: 像节奏一样按步骤执行",
            },
            {
                "Word": "Variable",
                "Phonetic": "ˈveəriəbl",
                "PartOfSpeech": "n.",
                "Meaning": "变量；存储数据的容器",
                "Example": "Declare a variable to store the user's name.",
                "Mnemonic": "Vary + able: 可以变化的",
            },
            {
                "Word": "Function",
                "Phonetic": "ˈfʌŋkʃn",
                "PartOfSpeech": "n.",
                "Meaning": "函数；可重复调用的代码块",
                "Example": "This function returns the sum of two numbers.",
                "Mnemonic": "功能 = Function",
            },
            {
                "Word": "Loop",
                "Phonetic": "luːp",
                "PartOfSpeech": "n.",
                "Meaning": "循环；重复执行的代码块",
                "Example": "Use a for loop to iterate through the array.",
                "Mnemonic": "Loop 像绳圈一样循环往复",
            },
            {
                "Word": "Array",
                "Phonetic": "əˈreɪ",
                "PartOfSpeech": "n.",
                "Meaning": "数组；有序的数据集合",
                "Example": "Store the scores in an array.",
                "Mnemonic": "A-ray: 一排排的数据",
            },
            {
                "Word": "Object",
                "Phonetic": "ˈɒbdʒɪkt",
                "PartOfSpeech": "n.",
                "Meaning": "对象；包含属性和方法的实体",
                "Example": "Create an object to represent a user.",
                "Mnemonic": "Object = 对象，现实世界的抽象",
            },
            {
                "Word": "Class",
                "Phonetic": "klɑːs",
                "PartOfSpeech": "n.",
                "Meaning": "类；对象的蓝图或模板",
                "Example": "Define a class for the Student entity.",
                "Mnemonic": "Class = 班级 → 模板",
            },
            {
                "Word": "Method",
                "Phonetic": "ˈmeθəd",
                "PartOfSpeech": "n.",
                "Meaning": "方法；对象的行为/函数",
                "Example": "Call the save() method to store data.",
                "Mnemonic": "方法论 = Method",
            },
            {
                "Word": "Debug",
                "Phonetic": "diːˈbʌɡ",
                "PartOfSpeech": "v.",
                "Meaning": "调试；查找并修复错误",
                "Example": "I spent hours debugging this code.",
                "Mnemonic": "De-bug: 去除bug",
            },
            {
                "Word": "Compile",
                "Phonetic": "kəmˈpaɪl",
                "PartOfSpeech": "v.",
                "Meaning": "编译；将代码转换为机器语言",
                "Example": "Compile the source code before running.",
                "Mnemonic": "Com-pile: 把代码堆在一起处理",
            },
            {
                "Word": "API",
                "Phonetic": "ˌeɪ piː ˈaɪ",
                "PartOfSpeech": "n.",
                "Meaning": "应用程序接口；程序间通信的接口",
                "Example": "Use the REST API to fetch user data.",
                "Mnemonic": "Application Programming Interface",
            },
            {
                "Word": "Database",
                "Phonetic": "ˈdeɪtəbeɪs",
                "PartOfSpeech": "n.",
                "Meaning": "数据库；存储和管理数据的系统",
                "Example": "Store user information in the database.",
                "Mnemonic": "Data + base: 数据的基地",
            },
        ],
    },
    {
        "id": "shared-daily-english",
        "slug": "daily-english-phrases",
        "title": "日常英语口语100句",
        "description": "精选日常生活中最常用的英语口语表达，附带中文翻译和使用场景。",
        "language": "en",
        "tags": ["英语", "口语", "日常", "实用"],
        "note_model_id": "builtin-language",
        "template_set_id": "theme-emerald",
        "is_featured": True,
        "is_official": True,
        "notes": [
            {
                "Phrase": "What's up?",
                "Translation": "怎么了？/最近怎么样？",
                "Pronunciation": "/wɒts ʌp/",
                "Context": "非正式问候，用于朋友之间",
                "Notes": "可以回答 'Not much' 或 'Nothing special'",
            },
            {
                "Phrase": "I couldn't agree more.",
                "Translation": "我完全同意。",
                "Pronunciation": "/aɪ ˈkʊdnt əˈɡriː mɔːr/",
                "Context": "表示强烈赞同对方观点",
                "Notes": "比 'I agree' 更强调",
            },
            {
                "Phrase": "Let me think about it.",
                "Translation": "让我想想。",
                "Pronunciation": "/let miː θɪŋk əˈbaʊt ɪt/",
                "Context": "需要时间考虑时使用",
                "Notes": "礼貌地推迟回答",
            },
            {
                "Phrase": "It's not a big deal.",
                "Translation": "没什么大不了的。",
                "Pronunciation": "/ɪts nɒt ə bɪɡ diːl/",
                "Context": "安慰他人或淡化问题",
                "Notes": "= It's nothing serious",
            },
            {
                "Phrase": "I'm running late.",
                "Translation": "我要迟到了。",
                "Pronunciation": "/aɪm ˈrʌnɪŋ leɪt/",
                "Context": "告知他人自己会晚到",
                "Notes": "常用于约会或会议前",
            },
            {
                "Phrase": "Can you give me a hand?",
                "Translation": "你能帮我一下吗？",
                "Pronunciation": "/kæn juː ɡɪv miː ə hænd/",
                "Context": "请求帮助的礼貌表达",
                "Notes": "比 'Help me' 更礼貌",
            },
            {
                "Phrase": "That makes sense.",
                "Translation": "有道理。/说得通。",
                "Pronunciation": "/ðæt meɪks sens/",
                "Context": "表示理解对方的解释",
                "Notes": "常用于讨论或学习场景",
            },
            {
                "Phrase": "I'm looking forward to it.",
                "Translation": "我很期待。",
                "Pronunciation": "/aɪm ˈlʊkɪŋ ˈfɔːwəd tuː ɪt/",
                "Context": "表达对未来事件的期待",
                "Notes": "正式和非正式场合均可使用",
            },
            {
                "Phrase": "Take your time.",
                "Translation": "慢慢来，不着急。",
                "Pronunciation": "/teɪk jɔːr taɪm/",
                "Context": "告诉对方不用着急",
                "Notes": "表达耐心和体贴",
            },
            {
                "Phrase": "I have no idea.",
                "Translation": "我不知道。/我没有头绪。",
                "Pronunciation": "/aɪ hæv nəʊ aɪˈdɪə/",
                "Context": "表示完全不知道",
                "Notes": "比 'I don't know' 更强调",
            },
            {
                "Phrase": "It's on me.",
                "Translation": "我请客。",
                "Pronunciation": "/ɪts ɒn miː/",
                "Context": "主动付账时使用",
                "Notes": "= I'll pay for it",
            },
            {
                "Phrase": "Keep in touch.",
                "Translation": "保持联系。",
                "Pronunciation": "/kiːp ɪn tʌtʃ/",
                "Context": "道别时使用",
                "Notes": "= Let's stay connected",
            },
            {
                "Phrase": "It slipped my mind.",
                "Translation": "我忘了。",
                "Pronunciation": "/ɪt slɪpt maɪ maɪnd/",
                "Context": "表示忘记某事",
                "Notes": "比 'I forgot' 更委婉",
            },
            {
                "Phrase": "I'm on my way.",
                "Translation": "我在路上了。",
                "Pronunciation": "/aɪm ɒn maɪ weɪ/",
                "Context": "告知对方正在前往",
                "Notes": "常用于回复 'Where are you?'",
            },
            {
                "Phrase": "No worries.",
                "Translation": "没关系。/不用担心。",
                "Pronunciation": "/nəʊ ˈwʌriz/",
                "Context": "回应道歉或感谢",
                "Notes": "澳洲英语常用，现已全球流行",
            },
        ],
    },
    {
        "id": "shared-cs-basics",
        "slug": "cs-fundamentals",
        "title": "计算机科学基础概念",
        "description": "计算机科学核心概念的问答卡片，帮助理解底层原理。适合计算机专业学生或自学者。",
        "language": "zh-CN",
        "tags": ["计算机科学", "基础", "面试", "概念"],
        "note_model_id": "builtin-qa",
        "template_set_id": "theme-dark",
        "is_featured": True,
        "is_official": True,
        "notes": [
            {
                "Question": "什么是时间复杂度？",
                "Answer": "时间复杂度是算法执行时间随输入规模增长的变化趋势，通常用大 O 表示法描述。常见的有 O(1)、O(log n)、O(n)、O(n log n)、O(n²) 等。",
                "Source": "算法导论",
            },
            {
                "Question": "什么是空间复杂度？",
                "Answer": "空间复杂度是算法执行过程中所需内存空间随输入规模增长的变化趋势。包括输入数据占用空间和算法执行过程中的辅助空间。",
                "Source": "算法导论",
            },
            {
                "Question": "什么是递归？",
                "Answer": "递归是函数直接或间接调用自身的编程技术。包含两个要素：基准情况（终止条件）和递归情况（问题分解）。",
                "Source": "程序设计基础",
            },
            {
                "Question": "栈和队列有什么区别？",
                "Answer": "栈是后进先出（LIFO）的数据结构，只能在一端进行插入和删除。队列是先进先出（FIFO）的数据结构，一端插入，另一端删除。",
                "Source": "数据结构",
            },
            {
                "Question": "什么是哈希表？",
                "Answer": "哈希表是通过哈希函数将键映射到数组索引的数据结构，支持 O(1) 平均时间复杂度的查找、插入和删除操作。需要处理哈希冲突。",
                "Source": "数据结构",
            },
            {
                "Question": "什么是二叉搜索树？",
                "Answer": "二叉搜索树是一种二叉树，其中每个节点的左子树所有节点值小于该节点，右子树所有节点值大于该节点。支持 O(log n) 的查找操作。",
                "Source": "数据结构",
            },
            {
                "Question": "什么是操作系统的进程和线程？",
                "Answer": "进程是程序的执行实例，拥有独立的内存空间。线程是进程内的执行单元，共享进程的内存空间。线程切换开销比进程小。",
                "Source": "操作系统原理",
            },
            {
                "Question": "什么是死锁？如何避免？",
                "Answer": "死锁是多个进程互相等待对方持有的资源而无法继续执行的状态。避免方法：破坏互斥、占有等待、不可抢占、循环等待四个条件之一。",
                "Source": "操作系统原理",
            },
            {
                "Question": "HTTP 和 HTTPS 有什么区别？",
                "Answer": "HTTPS 是 HTTP 的安全版本，使用 SSL/TLS 加密传输数据。HTTPS 默认端口是 443，HTTP 是 80。HTTPS 提供数据加密、身份验证和完整性校验。",
                "Source": "计算机网络",
            },
            {
                "Question": "什么是 TCP 三次握手？",
                "Answer": "TCP 建立连接的过程：1) 客户端发送 SYN；2) 服务器回复 SYN+ACK；3) 客户端发送 ACK。三次握手确保双方都能发送和接收数据。",
                "Source": "计算机网络",
            },
            {
                "Question": "什么是 RESTful API？",
                "Answer": "REST 是一种 Web 服务架构风格，使用 HTTP 方法（GET/POST/PUT/DELETE）操作资源。RESTful API 具有无状态、统一接口、可缓存等特点。",
                "Source": "Web 开发",
            },
            {
                "Question": "什么是数据库索引？",
                "Answer": "索引是提高数据库查询效率的数据结构（通常是 B+ 树）。通过建立字段值到记录位置的映射，避免全表扫描。但会增加写入开销和存储空间。",
                "Source": "数据库系统",
            },
        ],
    },
]
