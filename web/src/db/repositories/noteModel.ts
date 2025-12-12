/**
 * NoteModel 本地存储操作
 */

import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { NoteModel, CardTemplate, FieldDefinition } from '@/types'

export const noteModelRepo = {
  /**
   * 获取所有笔记类型
   */
  async getAll(userId: string): Promise<NoteModel[]> {
    return db.noteModels
      .where('userId')
      .equals(userId)
      .and((nm) => !nm.deletedAt)
      .toArray()
  },

  /**
   * 根据 ID 获取笔记类型
   */
  async getById(id: string): Promise<NoteModel | undefined> {
    const noteModel = await db.noteModels.get(id)
    if (noteModel && !noteModel.deletedAt) {
      // 加载关联的模板
      const templates = await db.cardTemplates
        .where('noteModelId')
        .equals(id)
        .and((t) => !t.deletedAt)
        .sortBy('ord')
      noteModel.templates = templates
      return noteModel
    }
    return undefined
  },

  /**
   * 创建笔记类型
   */
  async create(
    userId: string,
    name: string,
    fieldsSchema: FieldDefinition[],
    templates: Omit<CardTemplate, 'id' | 'noteModelId' | 'createdAt' | 'updatedAt'>[],
    css?: string
  ): Promise<NoteModel> {
    const now = Date.now()
    const noteModelId = nanoid()

    const noteModel: NoteModel = {
      id: noteModelId,
      userId,
      name,
      fieldsSchema,
      css,
      templates: [],
      createdAt: now,
      updatedAt: now,
    }

    // 创建模板
    const cardTemplates: CardTemplate[] = templates.map((t, index) => ({
      id: nanoid(),
      noteModelId,
      name: t.name,
      ord: t.ord ?? index,
      questionTemplate: t.questionTemplate,
      answerTemplate: t.answerTemplate,
      createdAt: now,
      updatedAt: now,
    }))

    await db.transaction('rw', [db.noteModels, db.cardTemplates], async () => {
      await db.noteModels.add(noteModel)
      await db.cardTemplates.bulkAdd(cardTemplates)
    })

    noteModel.templates = cardTemplates
    return noteModel
  },

  /**
   * 更新笔记类型
   */
  async update(
    id: string,
    data: Partial<Pick<NoteModel, 'name' | 'fieldsSchema' | 'css'>>
  ): Promise<void> {
    await db.noteModels.update(id, {
      ...data,
      updatedAt: Date.now(),
    })
  },

  /**
   * 删除笔记类型（软删除）
   */
  async delete(id: string): Promise<void> {
    const now = Date.now()
    await db.transaction('rw', [db.noteModels, db.cardTemplates], async () => {
      await db.noteModels.update(id, { deletedAt: now, updatedAt: now })
      await db.cardTemplates
        .where('noteModelId')
        .equals(id)
        .modify({ deletedAt: now, updatedAt: now })
    })
  },

  /**
   * 创建默认的 Basic 笔记类型
   */
  async createDefaultBasic(userId: string): Promise<NoteModel> {
    return this.create(
      userId,
      'Basic',
      [{ name: 'Front' }, { name: 'Back' }],
      [
        {
          name: '正向',
          ord: 0,
          questionTemplate: '<div class="card-front">{{Front}}</div>',
          answerTemplate: '<div class="card-front">{{Front}}</div><hr><div class="card-back">{{Back}}</div>',
        },
      ],
      `.card-front { font-size: 1.5rem; text-align: center; }
.card-back { font-size: 1.2rem; text-align: center; color: #666; }`
    )
  },
}



