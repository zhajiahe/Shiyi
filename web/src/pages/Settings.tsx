import { useState, useEffect, useCallback } from 'react'
import {
  Save,
  Loader2,
  Download,
  Upload,
  Trash2,
  HardDrive,
  AlertTriangle,
  Bot,
  Eye,
  EyeOff,
  Brain,
  Palette,
  Info,
  RefreshCw,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAIConfigStore, POPULAR_MODELS } from '@/stores/useAIConfigStore'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useTheme } from '@/components/theme-provider'
import { db, getStorageEstimate } from '@/db'

interface UserSettings {
  scheduler: 'sm2' | 'fsrs_v4' | 'fsrs_v5'
  newCardsPerDay: number
  maxReviewsPerDay: number
  learningSteps: number[]
  graduatingInterval: number
  easyInterval: number
}

const DEFAULT_SETTINGS: UserSettings = {
  scheduler: 'sm2',
  newCardsPerDay: 20,
  maxReviewsPerDay: 200,
  learningSteps: [1, 10],
  graduatingInterval: 1,
  easyInterval: 4,
}

const STORAGE_KEY = 'shiyi-settings'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // AI 配置
  const { config: aiConfig, setConfig: setAIConfig } = useAIConfigStore()
  const [showApiKey, setShowApiKey] = useState(false)
  const [fetchedModels, setFetchedModels] = useState<string[]>([])
  const [isFetchingModels, setIsFetchingModels] = useState(false)
  const [modelsFetchError, setModelsFetchError] = useState<string | null>(null)

  // 获取模型列表
  const fetchModels = useCallback(async () => {
    if (!aiConfig.apiKey || !aiConfig.baseUrl) {
      return
    }

    setIsFetchingModels(true)
    setModelsFetchError(null)
    setFetchedModels([])

    try {
      const response = await fetch(`${aiConfig.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error?.message || `请求失败: ${response.status}`)
      }

      const data = await response.json()
      // OpenAI 格式: { data: [{ id: "gpt-4o", ... }] }
      const models = (data.data || [])
        .map((m: { id: string }) => m.id)
        .filter((id: string) => id)
        .sort((a: string, b: string) => a.localeCompare(b))

      setFetchedModels(models)

      // 如果当前选择的模型不在列表中，自动选择第一个
      if (models.length > 0 && !models.includes(aiConfig.model)) {
        setAIConfig({ model: models[0] })
      }

      toast.success(`获取到 ${models.length} 个模型`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取模型列表失败'
      setModelsFetchError(message)
      toast.error(message)
    } finally {
      setIsFetchingModels(false)
    }
  }, [aiConfig.apiKey, aiConfig.baseUrl, aiConfig.model, setAIConfig])

  // 存储相关状态
  const [storageInfo, setStorageInfo] = useState<{
    usage: number
    quota: number
    usagePercent: number
  } | null>(null)
  const [dataStats, setDataStats] = useState({
    decks: 0,
    notes: 0,
    cards: 0,
    reviewLogs: 0,
  })
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)

  // 导入确认对话框状态
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<{
    data: unknown
    deckCount: number
    noteCount: number
    cardCount: number
  } | null>(null)

  useEffect(() => {
    // 从 localStorage 加载设置
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
      } catch {
        // 忽略解析错误
      }
    }

    // 加载存储信息
    loadStorageInfo()
    loadDataStats()
  }, [])

  const loadStorageInfo = async () => {
    const info = await getStorageEstimate()
    setStorageInfo(info)
  }

  const loadDataStats = async () => {
    const decks = await db.decks.filter((d) => !d.deletedAt).count()
    const notes = await db.notes.filter((n) => !n.deletedAt).count()
    const cards = await db.cards.filter((c) => !c.deletedAt).count()
    const reviewLogs = await db.reviewLogs.count()
    setDataStats({ decks, notes, cards, reviewLogs })
  }

  // 格式化存储大小
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 导出全部数据
  const handleExportAll = async () => {
    try {
      setExporting(true)

      const exportData = {
        version: 1,
        exportDate: new Date().toISOString(),
        settings: settings,
        data: {
          noteModels: await db.noteModels.toArray(),
          cardTemplates: await db.cardTemplates.toArray(),
          decks: await db.decks.toArray(),
          notes: await db.notes.toArray(),
          cards: await db.cards.toArray(),
          reviewLogs: await db.reviewLogs.toArray(),
        },
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shiyi-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('导出成功', {
        description: '备份文件已下载到本地',
      })
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('导出失败', {
        description: '请重试或检查浏览器权限',
      })
    } finally {
      setExporting(false)
    }
  }

  // 导入数据 - 第一步：选择文件
  const handleImportAll = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        setImporting(true)
        const text = await file.text()
        const importData = JSON.parse(text)

        if (!importData.version || !importData.data) {
          throw new Error('无效的备份文件格式')
        }

        // 设置待导入数据并打开确认对话框
        setPendingImportData({
          data: importData,
          deckCount: importData.data.decks?.length || 0,
          noteCount: importData.data.notes?.length || 0,
          cardCount: importData.data.cards?.length || 0,
        })
        setImportDialogOpen(true)
      } catch (error) {
        console.error('Import parse failed:', error)
        toast.error('导入失败', {
          description: error instanceof Error ? error.message : '文件格式无效',
        })
        setImporting(false)
      }
    }
    input.click()
  }

  // 导入数据 - 第二步：确认导入
  const confirmImport = async () => {
    if (!pendingImportData) return

    try {
      const importData = pendingImportData.data as {
        settings?: UserSettings
        data: {
          noteModels?: unknown[]
          cardTemplates?: unknown[]
          decks?: unknown[]
          notes?: unknown[]
          cards?: unknown[]
          reviewLogs?: unknown[]
        }
      }

      // 清空现有数据
      await db.noteModels.clear()
      await db.cardTemplates.clear()
      await db.decks.clear()
      await db.notes.clear()
      await db.cards.clear()
      await db.reviewLogs.clear()

      // 导入新数据
      if (importData.data.noteModels?.length) {
        await db.noteModels.bulkAdd(importData.data.noteModels as never[])
      }
      if (importData.data.cardTemplates?.length) {
        await db.cardTemplates.bulkAdd(importData.data.cardTemplates as never[])
      }
      if (importData.data.decks?.length) {
        await db.decks.bulkAdd(importData.data.decks as never[])
      }
      if (importData.data.notes?.length) {
        await db.notes.bulkAdd(importData.data.notes as never[])
      }
      if (importData.data.cards?.length) {
        await db.cards.bulkAdd(importData.data.cards as never[])
      }
      if (importData.data.reviewLogs?.length) {
        await db.reviewLogs.bulkAdd(importData.data.reviewLogs as never[])
      }

      // 导入设置
      if (importData.settings) {
        setSettings(importData.settings)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(importData.settings))
      }

      toast.success('导入成功', {
        description: `已恢复 ${pendingImportData.deckCount} 个牌组、${pendingImportData.noteCount} 条笔记`,
      })
      loadStorageInfo()
      loadDataStats()
    } catch (error) {
      console.error('Import failed:', error)
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : '未知错误',
      })
    } finally {
      setImporting(false)
      setPendingImportData(null)
      setImportDialogOpen(false)
    }
  }

  // 清空所有数据
  const handleClearAll = async () => {
    try {
      setClearing(true)
      await db.noteModels.clear()
      await db.cardTemplates.clear()
      await db.decks.clear()
      await db.notes.clear()
      await db.cards.clear()
      await db.reviewLogs.clear()

      toast.success('数据已清空', {
        description: '所有学习数据已被删除',
      })
      loadStorageInfo()
      loadDataStats()
    } catch (error) {
      console.error('Clear failed:', error)
      toast.error('清空失败', {
        description: '请重试',
      })
    } finally {
      setClearing(false)
    }
  }

  const handleSave = () => {
    setSaving(true)
    // 保存到 localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      toast.success('设置已保存')
      setTimeout(() => setSaved(false), 2000)
    }, 300)
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem(STORAGE_KEY)
    toast.success('已恢复默认设置')
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground mt-1">管理您的学习偏好和应用配置</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* 左侧主要内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 学习设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                学习设置
              </CardTitle>
              <CardDescription>调整复习算法和每日学习目标</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 调度算法 */}
              <div>
                <label className="block text-sm font-medium mb-3">调度算法</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'sm2', label: 'SM-2', desc: '经典' },
                    { value: 'fsrs_v4', label: 'FSRS v4', desc: '现代' },
                    { value: 'fsrs_v5', label: 'FSRS v5', desc: '最新' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          scheduler: opt.value as UserSettings['scheduler'],
                        }))
                      }
                      className={`p-3 rounded-lg border-2 transition-all text-center ${
                        settings.scheduler === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 每日限制 - 双栏 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">每日新卡片</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={999}
                      value={settings.newCardsPerDay}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          newCardsPerDay: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">张/天</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">最大复习数</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={9999}
                      value={settings.maxReviewsPerDay}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          maxReviewsPerDay: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">张/天</span>
                  </div>
                </div>
              </div>

              {/* 学习步骤 */}
              <div>
                <label className="block text-sm font-medium mb-2">学习步骤（分钟）</label>
                <Input
                  value={settings.learningSteps.join(', ')}
                  onChange={(e) => {
                    const steps = e.target.value
                      .split(',')
                      .map((s) => parseInt(s.trim()))
                      .filter((n) => !isNaN(n) && n > 0)
                    if (steps.length > 0) {
                      setSettings((s) => ({ ...s, learningSteps: steps }))
                    }
                  }}
                  placeholder="1, 10"
                  className="max-w-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  用逗号分隔，如：1, 10 表示 1分钟后、10分钟后各复习一次
                </p>
              </div>

              {/* 毕业间隔 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">毕业间隔</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={settings.graduatingInterval}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          graduatingInterval: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">天</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">简单间隔</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={settings.easyInterval}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, easyInterval: parseInt(e.target.value) || 1 }))
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">天</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI 配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI 配置
              </CardTitle>
              <CardDescription>配置 OpenAI 兼容 API 用于智能生成笔记</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 启用开关 */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="text-sm font-medium">启用 AI 功能</label>
                  <p className="text-xs text-muted-foreground">开启后可在牌组中使用 AI 生成笔记</p>
                </div>
                <button
                  onClick={() => setAIConfig({ enabled: !aiConfig.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    aiConfig.enabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      aiConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {aiConfig.enabled && (
                <div className="space-y-4 pt-2 border-t">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      API Key <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="sk-xxxxxxxxxxxxxxxx"
                        value={aiConfig.apiKey}
                        onChange={(e) => setAIConfig({ apiKey: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      仅存储在本地浏览器，不会上传服务器
                    </p>
                  </div>

                  {/* Base URL */}
                  <div>
                    <label className="block text-sm font-medium mb-2">API Base URL</label>
                    <Input
                      placeholder="https://api.openai.com/v1"
                      value={aiConfig.baseUrl}
                      onChange={(e) => {
                        setAIConfig({ baseUrl: e.target.value })
                        setFetchedModels([]) // 清空已获取的模型
                      }}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      支持 OpenAI、DeepSeek、通义千问等兼容接口
                    </p>
                  </div>

                  {/* 模型选择 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">
                        模型 <span className="text-destructive">*</span>
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchModels}
                        disabled={!aiConfig.apiKey || !aiConfig.baseUrl || isFetchingModels}
                      >
                        {isFetchingModels ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            获取中...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            获取模型列表
                          </>
                        )}
                      </Button>
                    </div>

                    {/* 模型列表 */}
                    {fetchedModels.length > 0 ? (
                      <div className="space-y-2">
                        <select
                          className="w-full h-10 px-3 py-2 border rounded-md bg-background"
                          value={aiConfig.model}
                          onChange={(e) => setAIConfig({ model: e.target.value })}
                        >
                          {fetchedModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-500" />
                          已获取 {fetchedModels.length} 个可用模型
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* 常用模型下拉 + 自定义输入 */}
                        <div className="flex gap-2">
                          <select
                            className="flex-1 h-10 px-3 py-2 border rounded-md bg-background"
                            value={
                              POPULAR_MODELS.some((m) => m.value === aiConfig.model)
                                ? aiConfig.model
                                : ''
                            }
                            onChange={(e) => {
                              if (e.target.value) {
                                setAIConfig({ model: e.target.value })
                              }
                            }}
                          >
                            <option value="">选择常用模型...</option>
                            {POPULAR_MODELS.map((model) => (
                              <option key={model.value} value={model.value}>
                                {model.label} ({model.provider})
                              </option>
                            ))}
                          </select>
                        </div>
                        <Input
                          placeholder="或输入自定义模型名称"
                          value={
                            POPULAR_MODELS.some((m) => m.value === aiConfig.model)
                              ? ''
                              : aiConfig.model
                          }
                          onChange={(e) => setAIConfig({ model: e.target.value })}
                        />
                        {modelsFetchError && (
                          <p className="text-xs text-destructive">{modelsFetchError}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          填写 API Key 和 Base URL 后可点击上方按钮获取可用模型
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 配置状态 */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    {aiConfig.apiKey && aiConfig.baseUrl && aiConfig.model ? (
                      <>
                        <Badge variant="default" className="bg-green-600">
                          已配置
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          使用 {aiConfig.model} 模型
                        </span>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary">未完成</Badge>
                        <span className="text-sm text-muted-foreground">请填写所有必填项</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 数据管理 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                数据管理
              </CardTitle>
              <CardDescription>备份、恢复和管理您的学习数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 存储和统计 */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* 存储空间 */}
                <div className="p-4 rounded-lg bg-muted/30">
                  <label className="block text-sm font-medium mb-2">存储空间</label>
                  {storageInfo ? (
                    <>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full transition-all ${
                            storageInfo.usagePercent > 80 ? 'bg-destructive' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(storageInfo.usagePercent, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)} (
                        {storageInfo.usagePercent.toFixed(1)}%)
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">无法获取</p>
                  )}
                </div>

                {/* 数据统计 */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '牌组', value: dataStats.decks },
                    { label: '笔记', value: dataStats.notes },
                    { label: '卡片', value: dataStats.cards },
                    { label: '复习', value: dataStats.reviewLogs },
                  ].map((stat) => (
                    <div key={stat.label} className="p-3 bg-muted/30 rounded-lg text-center">
                      <div className="text-xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 导出/导入 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleExportAll}
                  disabled={exporting}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  导出数据
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleImportAll}
                  disabled={importing}
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  导入数据
                </Button>
              </div>

              {/* 危险区域 */}
              <div className="pt-4 border-t">
                <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-destructive text-sm">危险区域</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      清空所有数据将删除您的牌组、笔记、卡片和复习记录
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="mt-2"
                          disabled={clearing}
                        >
                          {clearing ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          清空所有数据
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确定要清空所有数据吗？</AlertDialogTitle>
                          <AlertDialogDescription>
                            此操作将永久删除您的所有学习数据：
                            <br />• {dataStats.decks} 个牌组、{dataStats.notes} 条笔记
                            <br />• {dataStats.cards} 张卡片、{dataStats.reviewLogs} 条复习记录
                            <br />
                            <br />
                            <strong>此操作不可撤销！</strong>建议先导出备份。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearAll}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            确认清空
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-6">
          {/* 外观设置 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                外观
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                  { value: 'system', label: '系统' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value as 'light' | 'dark' | 'system')}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border-2 transition-all ${
                      theme === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 保存操作 */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存设置
                  </>
                )}
              </Button>
              {saved && (
                <div className="text-center">
                  <Badge variant="secondary" className="animate-pulse">
                    ✓ 已保存
                  </Badge>
                </div>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    恢复默认
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>恢复默认设置？</AlertDialogTitle>
                    <AlertDialogDescription>
                      这将把所有设置恢复为默认值。您的学习数据不会受到影响。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>确认恢复</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* 关于 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4" />
                关于
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">拾遗 Shiyi</p>
              <p>现代化间隔重复记忆系统</p>
              <p>Local-First 架构</p>
              <p>支持 SM-2 和 FSRS 算法</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 导入确认对话框 */}
      <AlertDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认导入数据？</AlertDialogTitle>
            <AlertDialogDescription>
              即将导入备份数据，这将覆盖现有数据：
              <br />• {pendingImportData?.deckCount || 0} 个牌组
              <br />• {pendingImportData?.noteCount || 0} 条笔记
              <br />• {pendingImportData?.cardCount || 0} 张卡片
              <br />
              <br />
              现有数据将被替换，建议先导出当前数据作为备份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setImporting(false)
                setPendingImportData(null)
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>确认导入</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
