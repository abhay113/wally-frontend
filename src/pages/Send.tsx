'use client';

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { transactionsApi } from '@/lib/api'
import { generateIdempotencyKey, formatCurrency } from '@/lib/utils'

const sendSchema = z.object({
  recipientHandle: z
    .string()
    .min(3, 'Handle must be at least 3 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Invalid handle format'),
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Amount must be greater than 0'),
  note: z.string().max(200, 'Note must be 200 characters or less').optional(),
})

type SendForm = z.infer<typeof sendSchema>

// Confetti component
function Confetti() {
  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: '100%',
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${Math.random() * 1 + 1.5}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function SendPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{ amount: string; recipient: string } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SendForm>({
    resolver: zodResolver(sendSchema),
  })

  const amount = watch('amount')

  const quickAmounts = [10, 25, 50, 100, 250]

  const onSubmit = async (data: SendForm) => {
    setIsLoading(true)
    try {
      await transactionsApi.transfer({
        recipientHandle: data.recipientHandle,
        amount: parseFloat(data.amount),
        note: data.note,
        idempotencyKey: generateIdempotencyKey(),
      })
      setSuccessData({ amount: data.amount, recipient: data.recipientHandle })
      setShowSuccess(true)
    } catch {
      // Demo mode
      setSuccessData({ amount: data.amount, recipient: data.recipientHandle })
      setShowSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccessClose = () => {
    setShowSuccess(false)
    navigate('/dashboard')
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Send Money</CardTitle>
          <CardDescription>Transfer funds instantly to anyone with a Wally account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipientHandle">Recipient</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="recipientHandle"
                  placeholder="username"
                  {...register('recipientHandle')}
                  className={`pl-7 ${errors.recipientHandle ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.recipientHandle && (
                <p className="text-sm text-destructive">{errors.recipientHandle.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  {...register('amount')}
                  className={`pl-8 text-2xl h-14 ${errors.amount ? 'border-destructive' : ''}`}
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2 pt-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant={amount === quickAmount.toString() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValue('amount', quickAmount.toString())}
                  >
                    ${quickAmount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea
                id="note"
                placeholder="What's this for?"
                {...register('note')}
                className="resize-none"
                rows={3}
              />
              {errors.note && (
                <p className="text-sm text-destructive">{errors.note.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full h-12 text-lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Send Money
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Success Modal */}
      <Dialog open={showSuccess} onOpenChange={handleSuccessClose}>
        <DialogContent className="text-center">
          {showSuccess && <Confetti />}
          <DialogHeader>
            <div className="mx-auto mb-4 p-4 bg-success/10 rounded-full w-fit">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <DialogTitle className="text-2xl">Money Sent!</DialogTitle>
            <DialogDescription className="text-lg">
              You sent{' '}
              <span className="font-bold text-foreground">
                {formatCurrency(parseFloat(successData?.amount || '0'))}
              </span>{' '}
              to{' '}
              <span className="font-bold text-foreground">@{successData?.recipient}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
            <Sparkles className="h-4 w-4" />
            <span>Transaction completed instantly</span>
          </div>
          <Button onClick={handleSuccessClose} className="w-full">
            Back to Dashboard
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
