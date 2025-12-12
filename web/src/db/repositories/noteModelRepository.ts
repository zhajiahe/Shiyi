/**
 * 笔记类型数据仓库
 */

import { db } from '@/db'
import type { NoteModel, CardTemplate } from '@/types'

export const noteModelRepository = {
  /**
   * 获取所有笔记类型
   */
  async getAll(): Promise<NoteModel[]> {
    const models = await db.noteModels
      .filter(m => !m.deletedAt)
      .toArray()
    
    // 加载模板
    for (const model of models) {
      model.templates = await db.cardTemplates
        .where('noteModelId')
        .equals(model.id)
        .filter(t => !t.deletedAt)
        .sortBy('ord')
    }
    
    return models
  },

  /**
   * 根据 ID 获取笔记类型
   */
  async getById(id: string): Promise<NoteModel | undefined> {
    const model = await db.noteModels.get(id)
    if (!model) return undefined
    
    model.templates = await db.cardTemplates
      .where('noteModelId')
      .equals(id)
      .filter(t => !t.deletedAt)
      .sortBy('ord')
    
    return model
  },

  /**
   * 批量插入/更新笔记类型（用于导入）
   */
  async upsertMany(models: NoteModel[], templates: CardTemplate[]): Promise<void> {
    await db.noteModels.bulkPut(models)
    await db.cardTemplates.bulkPut(templates)
  },

  /**
   * 获取内置笔记类型（以 builtin- 开头的）
   */
  async getBuiltins(): Promise<NoteModel[]> {
    const models = await db.noteModels
      .filter(m => m.id.startsWith('builtin-') && !m.deletedAt)
      .toArray()
    
    for (const model of models) {
      model.templates = await db.cardTemplates
        .where('noteModelId')
        .equals(model.id)
        .filter(t => !t.deletedAt)
        .sortBy('ord')
    }
    
    return models
  },
}

