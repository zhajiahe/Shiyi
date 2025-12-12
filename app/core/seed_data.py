"""
内置模板和笔记类型种子数据

提供开箱即用的高质量模板
"""

# ==================== CSS 样式定义 ====================

BASIC_CSS = """
.card {
  font-family: 'Noto Sans SC', 'Segoe UI', system-ui, sans-serif;
  font-size: 1.25rem;
  text-align: center;
  color: #1a1a2e;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.front {
  font-size: 1.5rem;
  font-weight: 600;
  color: #16213e;
  margin-bottom: 1rem;
}

.back {
  font-size: 1.25rem;
  color: #4a4a4a;
  padding-top: 1rem;
  border-top: 2px solid #dee2e6;
}

.divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, #6c757d, transparent);
  margin: 1.5rem 0;
}
"""

VOCABULARY_CSS = """
.card {
  font-family: 'Noto Sans SC', 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.word {
  font-size: 2.5rem;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
  margin-bottom: 0.5rem;
}

.phonetic {
  font-size: 1.1rem;
  opacity: 0.9;
  font-style: italic;
  margin-bottom: 1rem;
}

.pos {
  display: inline-block;
  background: rgba(255,255,255,0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.meaning {
  font-size: 1.5rem;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255,255,255,0.1);
  border-radius: 0.5rem;
}

.example {
  font-size: 1.1rem;
  opacity: 0.9;
  font-style: italic;
  padding: 1rem;
  background: rgba(0,0,0,0.1);
  border-radius: 0.5rem;
  border-left: 4px solid rgba(255,255,255,0.5);
}

.mnemonic {
  font-size: 1rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(255,215,0,0.2);
  border-radius: 0.5rem;
  color: #fff9c4;
}

.divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  margin: 1.5rem 0;
}
"""

CLOZE_CSS = """
.card {
  font-family: 'Noto Sans SC', 'Segoe UI', system-ui, sans-serif;
  font-size: 1.25rem;
  text-align: left;
  color: #2d3436;
  background: #ffeaa7;
  padding: 2rem;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.content {
  font-size: 1.4rem;
  line-height: 1.8;
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.cloze {
  font-weight: 700;
  color: #e17055;
  background: rgba(225, 112, 85, 0.1);
  padding: 0.1rem 0.3rem;
  border-radius: 0.25rem;
}

.cloze-blank {
  display: inline-block;
  min-width: 4rem;
  border-bottom: 3px solid #e17055;
  color: transparent;
}

.extra {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255,255,255,0.7);
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #636e72;
}
"""

QA_CSS = """
.card {
  font-family: 'Noto Sans SC', 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  color: #fff;
  padding: 2rem;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.question-label {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #00d2d3;
  margin-bottom: 0.5rem;
}

.question {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.answer-label {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #ff9ff3;
  margin-bottom: 0.5rem;
}

.answer {
  font-size: 1.3rem;
  line-height: 1.6;
  padding: 1rem;
  background: rgba(255,255,255,0.1);
  border-radius: 0.5rem;
  border-left: 4px solid #ff9ff3;
}

.source {
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.6);
  font-style: italic;
}

.divider {
  height: 2px;
  background: linear-gradient(90deg, #00d2d3, #ff9ff3);
  margin: 1.5rem 0;
}
"""

LANGUAGE_CSS = """
.card {
  font-family: 'Noto Sans SC', 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  padding: 2rem;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.phrase {
  font-size: 2rem;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
  margin-bottom: 1rem;
}

.translation {
  font-size: 1.5rem;
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255,255,255,0.15);
  border-radius: 0.5rem;
}

.pronunciation {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-bottom: 1rem;
}

.context {
  font-size: 1.1rem;
  opacity: 0.9;
  padding: 1rem;
  background: rgba(0,0,0,0.15);
  border-radius: 0.5rem;
  border-left: 4px solid rgba(255,255,255,0.5);
  line-height: 1.6;
}

.notes {
  margin-top: 1rem;
  font-size: 1rem;
  padding: 0.75rem;
  background: rgba(255,255,255,0.1);
  border-radius: 0.5rem;
}

.divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
  margin: 1.5rem 0;
}
"""

# ==================== 内置笔记类型定义 ====================

BUILTIN_NOTE_MODELS = [
    {
        "id": "builtin-basic",
        "name": "Basic (基础)",
        "fields_schema": [
            {"name": "Front", "description": "正面内容（问题）"},
            {"name": "Back", "description": "背面内容（答案）"},
        ],
        "css": BASIC_CSS,
        "templates": [
            {
                "name": "正向卡片",
                "ord": 0,
                "question_template": '<div class="card"><div class="front">{{Front}}</div></div>',
                "answer_template": '<div class="card"><div class="front">{{Front}}</div><div class="divider"></div><div class="back">{{Back}}</div></div>',
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
        "css": BASIC_CSS,
        "templates": [
            {
                "name": "正向卡片",
                "ord": 0,
                "question_template": '<div class="card"><div class="front">{{Front}}</div></div>',
                "answer_template": '<div class="card"><div class="front">{{Front}}</div><div class="divider"></div><div class="back">{{Back}}</div></div>',
            },
            {
                "name": "反向卡片",
                "ord": 1,
                "question_template": '<div class="card"><div class="front">{{Back}}</div></div>',
                "answer_template": '<div class="card"><div class="front">{{Back}}</div><div class="divider"></div><div class="back">{{Front}}</div></div>',
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
        "css": VOCABULARY_CSS,
        "templates": [
            {
                "name": "单词 → 释义",
                "ord": 0,
                "question_template": '''<div class="card">
  <div class="word">{{Word}}</div>
  {{#Phonetic}}<div class="phonetic">[{{Phonetic}}]</div>{{/Phonetic}}
  {{#PartOfSpeech}}<div class="pos">{{PartOfSpeech}}</div>{{/PartOfSpeech}}
</div>''',
                "answer_template": '''<div class="card">
  <div class="word">{{Word}}</div>
  {{#Phonetic}}<div class="phonetic">[{{Phonetic}}]</div>{{/Phonetic}}
  {{#PartOfSpeech}}<div class="pos">{{PartOfSpeech}}</div>{{/PartOfSpeech}}
  <div class="divider"></div>
  <div class="meaning">{{Meaning}}</div>
  {{#Example}}<div class="example">{{Example}}</div>{{/Example}}
  {{#Mnemonic}}<div class="mnemonic">💡 {{Mnemonic}}</div>{{/Mnemonic}}
</div>''',
            },
            {
                "name": "释义 → 单词",
                "ord": 1,
                "question_template": '''<div class="card">
  {{#PartOfSpeech}}<div class="pos">{{PartOfSpeech}}</div>{{/PartOfSpeech}}
  <div class="meaning">{{Meaning}}</div>
  {{#Example}}<div class="example" style="color: transparent; background: rgba(0,0,0,0.3);">{{Example}}</div>{{/Example}}
</div>''',
                "answer_template": '''<div class="card">
  <div class="word">{{Word}}</div>
  {{#Phonetic}}<div class="phonetic">[{{Phonetic}}]</div>{{/Phonetic}}
  {{#PartOfSpeech}}<div class="pos">{{PartOfSpeech}}</div>{{/PartOfSpeech}}
  <div class="divider"></div>
  <div class="meaning">{{Meaning}}</div>
  {{#Example}}<div class="example">{{Example}}</div>{{/Example}}
</div>''',
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
        "css": CLOZE_CSS,
        "templates": [
            {
                "name": "填空卡片",
                "ord": 0,
                "question_template": '''<div class="card">
  <div class="content">{{cloze:Text}}</div>
</div>''',
                "answer_template": '''<div class="card">
  <div class="content">{{cloze:Text}}</div>
  {{#Extra}}<div class="extra">{{Extra}}</div>{{/Extra}}
</div>''',
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
        "css": QA_CSS,
        "templates": [
            {
                "name": "问答卡片",
                "ord": 0,
                "question_template": '''<div class="card">
  <div class="question-label">Question</div>
  <div class="question">{{Question}}</div>
</div>''',
                "answer_template": '''<div class="card">
  <div class="question-label">Question</div>
  <div class="question">{{Question}}</div>
  <div class="divider"></div>
  <div class="answer-label">Answer</div>
  <div class="answer">{{Answer}}</div>
  {{#Source}}<div class="source">📖 {{Source}}</div>{{/Source}}
</div>''',
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
        "css": LANGUAGE_CSS,
        "templates": [
            {
                "name": "外语 → 母语",
                "ord": 0,
                "question_template": '''<div class="card">
  <div class="phrase">{{Phrase}}</div>
  {{#Pronunciation}}<div class="pronunciation">{{Pronunciation}}</div>{{/Pronunciation}}
</div>''',
                "answer_template": '''<div class="card">
  <div class="phrase">{{Phrase}}</div>
  {{#Pronunciation}}<div class="pronunciation">{{Pronunciation}}</div>{{/Pronunciation}}
  <div class="divider"></div>
  <div class="translation">{{Translation}}</div>
  {{#Context}}<div class="context">{{Context}}</div>{{/Context}}
  {{#Notes}}<div class="notes">📝 {{Notes}}</div>{{/Notes}}
</div>''',
            },
            {
                "name": "母语 → 外语",
                "ord": 1,
                "question_template": '''<div class="card">
  <div class="translation">{{Translation}}</div>
</div>''',
                "answer_template": '''<div class="card">
  <div class="phrase">{{Phrase}}</div>
  {{#Pronunciation}}<div class="pronunciation">{{Pronunciation}}</div>{{/Pronunciation}}
  <div class="divider"></div>
  <div class="translation">{{Translation}}</div>
  {{#Context}}<div class="context">{{Context}}</div>{{/Context}}
</div>''',
            },
        ],
    },
]


# ==================== 内置主题定义 ====================

BUILTIN_TEMPLATE_SETS = [
    {
        "id": "theme-minimal",
        "name": "Minimal (简约)",
        "description": "简洁清爽的默认主题",
        "css": BASIC_CSS,
        "is_official": True,
    },
    {
        "id": "theme-dark",
        "name": "Dark (暗黑)",
        "description": "护眼暗色主题",
        "css": QA_CSS,
        "is_official": True,
    },
    {
        "id": "theme-vibrant",
        "name": "Vibrant (活力)",
        "description": "多彩渐变主题",
        "css": VOCABULARY_CSS,
        "is_official": True,
    },
    {
        "id": "theme-nature",
        "name": "Nature (自然)",
        "description": "清新绿色主题",
        "css": LANGUAGE_CSS,
        "is_official": True,
    },
]

