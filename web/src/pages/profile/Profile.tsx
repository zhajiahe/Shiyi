import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/useAuthStore'
import { api } from '@/api/client'
import { toast } from 'sonner'

export function ProfilePage() {
  const { user, fetchCurrentUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    email: user?.email || '',
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await api.put('/auth/me', formData)
      await fetchCurrentUser()
      setIsEditing(false)
      toast.success('个人信息已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
          <CardDescription>管理您的账户信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">用户名</label>
            <Input value={user.username} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">用户名不可修改</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">邮箱</label>
            {isEditing ? (
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            ) : (
              <Input value={user.email} disabled className="bg-muted" />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">昵称</label>
            {isEditing ? (
              <Input
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              />
            ) : (
              <Input value={user.nickname} disabled className="bg-muted" />
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? '保存中...' : '保存'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  取消
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>编辑</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>账号安全</CardTitle>
          <CardDescription>修改密码</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  )
}

function PasswordChangeForm() {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.newPassword !== formData.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setIsLoading(true)
    try {
      await api.put('/auth/password', {
        old_password: formData.oldPassword,
        new_password: formData.newPassword,
      })
      toast.success('密码修改成功')
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">当前密码</label>
        <Input
          type="password"
          value={formData.oldPassword}
          onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">新密码</label>
        <Input
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          required
          minLength={6}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">确认新密码</label>
        <Input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
          minLength={6}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? '修改中...' : '修改密码'}
      </Button>
    </form>
  )
}
