'use client';

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Calendar, Shield, Edit2, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuthStore } from '@/lib/store'
import { userApi } from '@/lib/api'
import { formatDate, cn } from '@/lib/utils'

const handleSchema = z.object({
  handle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .max(20, 'Handle must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Handle can only contain letters, numbers, and underscores'),
})

type HandleForm = z.infer<typeof handleSchema>

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HandleForm>({
    resolver: zodResolver(handleSchema),
    defaultValues: {
      handle: user?.handle || '',
    },
  })

  const onSubmit = async (data: HandleForm) => {
    setIsLoading(true)
    try {
      const updated = await userApi.updateHandle(data.handle)
      setUser(updated)
      toast.success('Handle updated successfully!')
      setIsEditing(false)
    } catch {
      // Demo mode - update locally
      if (user) {
        setUser({ ...user, handle: data.handle })
        toast.success('Handle updated! (Demo Mode)')
        setIsEditing(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    reset({ handle: user?.handle || '' })
    setIsEditing(false)
  }

  const getInitials = (handle: string) => {
    return handle.slice(0, 2).toUpperCase()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {user?.handle ? getInitials(user.handle) : 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">@{user?.handle}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Handle Edit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Handle
            </Label>
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      {...register('handle')}
                      className={cn('pl-7', errors.handle && 'border-destructive')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.handle && (
                    <p className="text-sm text-destructive mt-1">{errors.handle.message}</p>
                  )}
                </div>
                <Button type="submit" size="icon" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={handleCancel} disabled={isLoading}>
                  <X className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">@{user?.handle}</span>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <div className="p-3 bg-muted rounded-lg">
              <span className="font-medium">{user?.email}</span>
            </div>
          </div>

          {/* Account Status */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Account Status
            </Label>
            <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  user?.status === 'active'
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'
                )}
              >
                {user?.status === 'active' ? 'Active' : 'Blocked'}
              </span>
              {user?.role === 'admin' && (
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* Member Since */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Member Since
            </Label>
            <div className="p-3 bg-muted rounded-lg">
              <span className="font-medium">
                {user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security</CardTitle>
          <CardDescription>Manage your security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start bg-transparent" disabled>
            <Shield className="mr-2 h-4 w-4" />
            Change Password
            <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
          </Button>
          <Button variant="outline" className="w-full justify-start bg-transparent" disabled>
            <Shield className="mr-2 h-4 w-4" />
            Two-Factor Authentication
            <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
