'use client';

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Activity, DollarSign, UserCheck, Search, Shield, ShieldOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { User, AdminStats } from '@/lib/types'
import { adminApi } from '@/lib/api'

// Animated counter for stats
function AnimatedStat({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0)
  const startTime = useRef<number | null>(null)

  useEffect(() => {
    startTime.current = null
    const animate = (currentTime: number) => {
      if (startTime.current === null) {
        startTime.current = currentTime
      }
      const elapsed = currentTime - startTime.current
      const progress = Math.min(elapsed / 1000, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.floor(value * easeOut))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [value])

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  )
}

// Mock data
const mockStats: AdminStats = {
  totalUsers: 1234,
  totalTransactions: 5678,
  totalVolume: 125000,
  activeUsers: 987,
}

const mockUsers: User[] = [
  { id: '1', email: 'john@example.com', handle: 'johndoe', role: 'user', status: 'active', createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '2', email: 'jane@example.com', handle: 'janedoe', role: 'user', status: 'active', createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '3', email: 'mike@example.com', handle: 'mike_wilson', role: 'user', status: 'blocked', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '4', email: 'sarah@example.com', handle: 'sarah_smith', role: 'user', status: 'active', createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: '5', email: 'admin@example.com', handle: 'admin', role: 'admin', status: 'active', createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
]

export default function AdminPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [stats, setStats] = useState<AdminStats>(mockStats)
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const search = searchParams.get('search') || ''
  const tab = searchParams.get('tab') || 'overview'

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [statsData, usersData] = await Promise.all([
          adminApi.getStats(),
          adminApi.getUsers({ search }),
        ])
        setStats(statsData)
        setUsers(usersData.data)
      } catch {
        // Use mock data filtered
        if (search) {
          setUsers(mockUsers.filter(u => 
            u.handle.includes(search) || u.email.includes(search)
          ))
        } else {
          setUsers(mockUsers)
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [search])

  const handleSearch = (value: string) => {
    setSearchParams(params => {
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      return params
    })
  }

  const handleTabChange = (value: string) => {
    setSearchParams(params => {
      params.set('tab', value)
      return params
    })
  }

  const handleBlockUser = async (userId: string) => {
    setActionLoading(userId)
    try {
      await adminApi.blockUser(userId)
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'blocked' } : u))
      toast.success('User blocked successfully')
    } catch {
      // Demo mode
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'blocked' } : u))
      toast.success('User blocked! (Demo Mode)')
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnblockUser = async (userId: string) => {
    setActionLoading(userId)
    try {
      await adminApi.unblockUser(userId)
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'active' } : u))
      toast.success('User unblocked successfully')
    } catch {
      // Demo mode
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'active' } : u))
      toast.success('User unblocked! (Demo Mode)')
    } finally {
      setActionLoading(null)
    }
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
    { title: 'Active Users', value: stats.activeUsers, icon: UserCheck, color: 'text-success' },
    { title: 'Total Transactions', value: stats.totalTransactions, icon: Activity, color: 'text-accent' },
    { title: 'Total Volume', value: stats.totalVolume, icon: DollarSign, color: 'text-primary', isCurrency: true },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and view platform statistics</p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <Card key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stat.isCurrency ? (
                      formatCurrency(stats.totalVolume)
                    ) : (
                      <AnimatedStat value={stat.value} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Users Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-medium">
                          {user.handle.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">@{user.handle}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        user.status === 'active'
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                      )}
                    >
                      {user.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6 mt-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by handle or email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary text-sm font-medium">
                                {user.handle.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">@{user.handle}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              user.role === 'admin'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              user.status === 'active'
                                ? 'bg-success/10 text-success'
                                : 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {user.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(user.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.role !== 'admin' && (
                            user.status === 'active' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBlockUser(user.id)}
                                disabled={actionLoading === user.id}
                                className="text-destructive hover:text-destructive"
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <ShieldOff className="h-4 w-4 mr-1" />
                                    Block
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnblockUser(user.id)}
                                disabled={actionLoading === user.id}
                                className="text-success hover:text-success"
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Shield className="h-4 w-4 mr-1" />
                                    Unblock
                                  </>
                                )}
                              </Button>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
