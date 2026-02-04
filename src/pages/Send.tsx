"use client";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { transactionsApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { generateIdempotencyKey, formatCurrency } from "@/lib/utils";
import { AxiosError } from "axios";

const sendSchema = z.object({
  recipientHandle: z
    .string()
    .min(3, "Handle must be at least 3 characters")
    .max(20, "Handle must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Handle can only contain letters, numbers, and underscores",
    ),
  amount: z
    .string()
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      "Amount must be greater than 0",
    )
    .refine((val) => {
      const num = parseFloat(val);
      return num <= 1000000; // Max 1 million
    }, "Amount cannot exceed $1,000,000"),
  note: z
    .string()
    .max(200, "Note must be 200 characters or less")
    .optional()
    .or(z.literal("")),
});

type SendForm = z.infer<typeof sendSchema>;

// Confetti component
function Confetti() {
  const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: "100%",
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${Math.random() * 1 + 1.5}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function SendPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    amount: string;
    recipient: string;
  } | null>(null);

  const prefilledRecipient = searchParams.get("to") || "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SendForm>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      recipientHandle: prefilledRecipient,
    },
  });

  const amount = watch("amount");
  const quickAmounts = [10, 25, 50, 100, 250];

  const onSubmit = async (data: SendForm) => {
    setIsLoading(true);
    try {
      const transferAmount = parseFloat(data.amount);

      // Client-side validations
      if (transferAmount <= 0) {
        toast.error("Amount must be greater than zero");
        setIsLoading(false);
        return;
      }

      // Check if sending to self
      if (data.recipientHandle.toLowerCase() === user?.handle.toLowerCase()) {
        toast.error("You cannot send money to yourself");
        setIsLoading(false);
        return;
      }

      // Round to 2 decimal places
      const roundedAmount = Math.round(transferAmount * 100) / 100;

      await transactionsApi.transfer({
        recipientHandle: data.recipientHandle,
        amount: roundedAmount,
        note: data.note || undefined,
        idempotencyKey: generateIdempotencyKey(),
      });

      setSuccessData({
        amount: roundedAmount.toString(),
        recipient: data.recipientHandle,
      });
      setShowSuccess(true);
      toast.success("Transaction completed successfully!");
    } catch (error: unknown) {
      console.error("Transfer error:", error);

      let message = "Failed to send money. Please try again.";

      if (error instanceof AxiosError) {
        message =
          error.response?.data?.message ||
          error.response?.data?.error ||
          message;

        switch (error.response?.status) {
          case 400:
            toast.error(message);
            return;

          case 404:
            toast.error("Recipient not found. Please check the handle.");
            return;

          case 422:
            toast.error(
              "Invalid transaction details. Please check your input.",
            );
            return;
        }
      }

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/dashboard");
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Send Money</CardTitle>
          <CardDescription>
            Transfer funds instantly to anyone with a Wally account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipientHandle">
                Recipient <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                >
                  @
                </span>
                <Input
                  id="recipientHandle"
                  placeholder="username"
                  aria-required="true"
                  aria-invalid={!!errors.recipientHandle}
                  aria-describedby={
                    errors.recipientHandle ? "recipient-error" : undefined
                  }
                  {...register("recipientHandle")}
                  className={`pl-7 ${errors.recipientHandle ? "border-destructive" : ""}`}
                />
              </div>
              {errors.recipientHandle && (
                <p
                  id="recipient-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.recipientHandle.message}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg"
                  aria-hidden="true"
                >
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  aria-required="true"
                  aria-invalid={!!errors.amount}
                  aria-describedby={errors.amount ? "amount-error" : undefined}
                  {...register("amount")}
                  className={`pl-8 text-2xl h-14 ${errors.amount ? "border-destructive" : ""}`}
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.amount && (
                <p
                  id="amount-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.amount.message}
                </p>
              )}

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2 pt-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant={
                      amount === quickAmount.toString() ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setValue("amount", quickAmount.toString())}
                    aria-label={`Set amount to ${quickAmount} dollars`}
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
                aria-describedby={errors.note ? "note-error" : undefined}
                {...register("note")}
                className="resize-none"
                rows={3}
                maxLength={200}
              />
              {errors.note && (
                <p
                  id="note-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {errors.note.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 text-lg"
              disabled={isLoading}
            >
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
              You sent{" "}
              <span className="font-bold text-foreground">
                {formatCurrency(parseFloat(successData?.amount || "0"))}
              </span>{" "}
              to{" "}
              <span className="font-bold text-foreground">
                @{successData?.recipient}
              </span>
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
  );
}
