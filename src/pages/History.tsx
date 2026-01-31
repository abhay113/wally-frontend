'use client';

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, ArrowDownLeft, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/store'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import { transactionsApi } from '@/lib/api'

// Mock transactions for demo
const mockTransactions: Transaction[] = [
  {
    id: '1',
    senderId: '1',
    senderHandle: 'johndoe',
    receiverId: '2',
    receiverHandle: 'janedoe',
    amount: 150.00,
    currency: 'USD',
    note: 'Dinner split',
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    senderId: '3',
    senderHandle: 'mike_wilson',
    receiverId: '1',
    receiverHandle: 'johndoe',
    amount: 500.00,
    currency: 'USD',
    note: 'Project payment',
    status: 'completed',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    senderId: '1',
    senderHandle: 'johndoe',
    receiverId: '4',
    receiverHandle: 'sarah_smith',
    amount: 75.00,
    currency: 'USD',
    note: 'Coffee supplies',
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    senderId: '5',
    senderHandle: 'alex_brown',
    receiverId: '1',
    receiverHandle: 'johndoe',
    amount: 200.00,
    currency: 'USD',
    note: 'Birthday gift',
    status: 'completed',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    senderId: '1',
    senderHandle: 'johndoe',
    receiverId: '6',
    receiverHandle: 'emily_davis',
    amount: 50.00,
    currency: 'USD',
    note: 'Movie tickets',
    status: 'completed',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    senderId: '7',
    senderHandle: 'chris_lee',
    receiverId: '1',
    receiverHandle: 'johndoe',
    amount: 1000.00,
    currency: 'USD',
    note: 'Rent payment',
    status: 'completed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export default function HistoryPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions)
  const [isLoading, setIsLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(1)

  const search = searchParams.get('search') || ''
  const filter = searchParams.get('filter') || 'all'
  const page = parseInt(searchParams.get('page') || '1', 10)

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true)
      try {
        const response = await transactionsApi.getHistory({
          page,
          limit: 10,
          search,
          filter,
        })
        setTransactions(response.data)
        setTotalPages(response.totalPages)
      } catch {
        // Use mock data filtered
        let filtered = mockTransactions
        if (filter === 'sent') {
          filtered = mockTransactions.filter((tx) => tx.senderHandle === user?.handle)
        } else if (filter === 'received') {
          filtered = mockTransactions.filter((tx) => tx.receiverHandle === user?.handle)
        }
        if (search) {
          filtered = filtered.filter(
            (tx) =>
              tx.senderHandle.includes(search) ||
              tx.receiverHandle.includes(search) ||
              tx.note?.includes(search)
          )
        }
        setTransactions(filtered)
        setTotalPages(1)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransactions()
  }, [page, search, filter, user?.handle])

  const handleSearch = (value: string) => {
    setSearchParams((params) => {
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      params.set('page', '1')
      return params
    })
  }

  const handleFilterChange = (value: string) => {
    setSearchParams((params) => {
      if (value !== 'all') {
        params.set('filter', value)
      } else {
        params.delete('filter')
      }
      params.set('page', '1')
      return params
    })
  }

  const handlePageChange = (newPage: number) => {
    setSearchParams((params) => {
      params.set('page', newPage.toString())
      return params
    })
  }

  const isOutgoing = (tx: Transaction) => tx.senderHandle === user?.handle

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
        <p className="text-muted-foreground">View all your past transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="received">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filter === 'sent' ? 'Sent Transactions' : filter === 'received' ? 'Received Transactions' : 'All Transactions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No transactions found</p>
              <p className="text-sm">Try adjusting your search or filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/history/${tx.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'p-2.5 rounded-full',
                        isOutgoing(tx) ? 'bg-destructive/10' : 'bg-success/10'
                      )}
                    >
                      {isOutgoing(tx) ? (
                        <ArrowUpRight className="h-5 w-5 text-destructive" />
                      ) : (
                        <ArrowDownLeft className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {isOutgoing(tx) ? `To @${tx.receiverHandle}` : `From @${tx.senderHandle}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.note || 'No note'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        'font-semibold text-lg',
                        isOutgoing(tx) ? 'text-destructive' : 'text-success'
                      )}
                    >
                      {isOutgoing(tx) ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full inline-block',
                        tx.status === 'completed'
                          ? 'bg-success/10 text-success'
                          : tx.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-600'
                          : 'bg-destructive/10 text-destructive'
                      )}
                    >
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
