"""
内置模板和笔记类型种子数据

使用 daisyUI 组件设计卡片模板
"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# 系统用户 ID（用于内置模板）
SYSTEM_USER_ID = UUID("00000000-0000-0000-0000-000000000000")


# ==================== 内置笔记类型定义 (使用 daisyUI) ====================

BUILTIN_NOTE_MODELS: list[dict[str, Any]] = [
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


# ==================== 示例共享牌组数据（已清空） ====================

# 用户可以通过发布功能自行创建共享牌组
SAMPLE_SHARED_DECKS: list[dict[str, Any]] = []


# ==================== 种子数据初始化 ====================


async def init_builtin_note_models(db: AsyncSession) -> int:
    """
    初始化内置笔记类型

    检查每个内置模板是否存在，如不存在则创建。
    如果已存在但 is_builtin=False，则更新为 True。

    Args:
        db: 数据库会话

    Returns:
        创建或更新的模板数量
    """
    from app.models.note_model import CardTemplate, NoteModel

    changed_count = 0
    now = datetime.now(UTC)

    for model_data in BUILTIN_NOTE_MODELS:
        model_id = model_data["id"]

        # 检查是否已存在
        result = await db.execute(select(NoteModel).where(NoteModel.id == model_id))
        existing = result.scalar_one_or_none()

        if existing:
            # 如果存在但 is_builtin=False，更新它
            if not existing.is_builtin:
                existing.is_builtin = True
                existing.updated_at = now
                changed_count += 1
            continue

        # 创建笔记类型
        note_model = NoteModel(
            id=model_id,
            user_id=str(SYSTEM_USER_ID),
            name=model_data["name"],
            fields_schema=model_data["fields_schema"],
            css=model_data.get("css", ""),
            is_builtin=True,
            created_at=now,
            updated_at=now,
        )
        db.add(note_model)

        # 创建卡片模板
        for idx, tpl_data in enumerate(model_data["templates"]):
            template = CardTemplate(
                id=f"{model_id}-tpl-{idx}",
                note_model_id=model_id,
                name=tpl_data["name"],
                ord=tpl_data["ord"],
                question_template=tpl_data["question_template"],
                answer_template=tpl_data["answer_template"],
                created_at=now,
                updated_at=now,
            )
            db.add(template)

        changed_count += 1

    if changed_count > 0:
        await db.commit()

    return changed_count
