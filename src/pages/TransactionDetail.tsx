'use client';

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Copy, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/lib/store'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import { transactionsApi } from '@/lib/api'

// Mock transaction detail
const mockTransaction: Transaction = {
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
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchTransaction = async () => {
      setIsLoading(true)
      try {
        if (id) {
          const data = await transactionsApi.getById(id)
          setTransaction(data)
        }
      } catch {
        // Use mock data
        setTransaction({ ...mockTransaction, id: id || '1' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTransaction()
  }, [id])

  const handleCopyId = () => {
    if (transaction) {
      navigator.clipboard.writeText(transaction.id)
      setCopied(true)
      toast.success('Transaction ID copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto animate-pulse">
        <div className="h-8 w-32 bg-muted rounded mb-6" />
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="h-20 bg-muted rounded-full w-20 mx-auto" />
            <div className="h-8 w-32 bg-muted rounded mx-auto" />
            <div className="space-y-4">
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-full bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-muted-foreground">Transaction not found</p>
        <Button variant="outline" onClick={() => navigate('/history')} className="mt-4">
          Back to History
        </Button>
      </div>
    )
  }

  const isOutgoing = transaction.senderHandle === user?.handle

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <Button
        variant="ghost"
        onClick={() => navigate('/history')}
        className="mb-6 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to History
      </Button>

      <Card>
        <CardHeader className="text-center pb-2">
          <div
            className={cn(
              'w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center',
              isOutgoing ? 'bg-destructive/10' : 'bg-success/10'
            )}
          >
            {isOutgoing ? (
              <ArrowUpRight className="h-10 w-10 text-destructive" />
            ) : (
              <ArrowDownLeft className="h-10 w-10 text-success" />
            )}
          </div>
          <CardTitle className="text-3xl">
            <span className={isOutgoing ? 'text-destructive' : 'text-success'}>
              {isOutgoing ? '-' : '+'}
              {formatCurrency(transaction.amount)}
            </span>
          </CardTitle>
          <p className="text-muted-foreground">
            {isOutgoing ? 'Sent' : 'Received'}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex justify-center">
            <span
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2',
                transaction.status === 'completed'
                  ? 'bg-success/10 text-success'
                  : transaction.status === 'pending'
                  ? 'bg-yellow-500/10 text-yellow-600'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {transaction.status === 'completed' && <CheckCircle2 className="h-4 w-4" />}
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">From</span>
              <span className="font-medium">@{transaction.senderHandle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">To</span>
              <span className="font-medium">@{transaction.receiverHandle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{formatDate(transaction.createdAt)}</span>
            </div>
            {transaction.note && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Note</span>
                <span className="font-medium text-right max-w-[200px]">{transaction.note}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Transaction ID</span>
              <button
                onClick={handleCopyId}
                className="flex items-center gap-2 font-mono text-sm hover:text-primary transition-colors"
              >
                {transaction.id.slice(0, 8)}...
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t space-y-3">
            {!isOutgoing && (
              <Button
                className="w-full"
                onClick={() => navigate(`/send?to=${transaction.senderHandle}`)}
              >
                Send Money Back
              </Button>
            )}
            <Button variant="outline" className="w-full bg-transparent" onClick={() => navigate('/history')}>
              View All Transactions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
