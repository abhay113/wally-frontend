"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  RefreshCw,
  Send,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Transaction, Wallet as WalletType } from "@/lib/types";
import { walletApi, transactionsApi } from "@/lib/api";

// Animated counter component with High Precision Support
function AnimatedCounter({
  value,
  duration = 1000,
}: {
  value: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;

    const animate = (currentTime: number) => {
      if (startTime.current === null) {
        startTime.current = currentTime;
      }

      const elapsed = currentTime - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      const current =
        startValue.current + (value - startValue.current) * easeOutQuart;
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  // Use inline formatter to support high precision (up to 8 decimals)
  return (
    <span>
      {displayValue.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      })}
    </span>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [isSyncing, setIsSyncing] = useState(true);
  const [fundAmount, setFundAmount] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsSyncing(true);

    try {
      const [walletResponse, transactionsResponse] = await Promise.all([
        walletApi.getWallet(),
        transactionsApi.getHistory({ limit: 5 }),
      ]);
      console.log("wallet response data : ", walletResponse);

      // --- Handle Wallet Response ---
      const walletApiData = (walletResponse as any).data || walletResponse;

      if (walletApiData?.wallet) {
        const walletInfo = walletApiData.wallet;
        setWallet({
          id: walletInfo.id,
          userId: walletApiData.id,
          balance: parseFloat(walletInfo.balance),
          currency: "USD",
          updatedAt: new Date().toISOString(),
        });
      }

      // --- Handle Transactions Response ---
      // Expected API Structure: { success: true, data: { transactions: [...], pagination: {...} } }
      const txApiData =
        (transactionsResponse as any).data || transactionsResponse;
      const rawTransactions =
        txApiData?.data?.transactions || txApiData?.transactions;

      if (Array.isArray(rawTransactions)) {
        const mappedTransactions: Transaction[] = rawTransactions.map(
          (t: any) => {
            // Logic to map API "SENT/RECEIVED" type to senderHandle/receiverHandle
            const isSent = t.type === "SENT";

            return {
              id: t.id,
              // If sent, current user is sender. If received, counterparty is sender.
              senderHandle: isSent
                ? user?.handle || "Me"
                : t.counterparty.handle,
              senderId: "", // Not provided in list view, optional
              // If sent, counterparty is receiver. If received, current user is receiver.
              receiverHandle: isSent
                ? t.counterparty.handle
                : user?.handle || "Me",
              receiverId: "", // Not provided in list view, optional

              amount: parseFloat(t.amount),
              currency: "USD",
              note: t.note || "", // API might not have note in list view
              // Map "SUCCESS" to "completed" for UI styling
              status:
                t.status === "SUCCESS" ? "completed" : t.status.toLowerCase(),
              createdAt: t.createdAt,
            };
          },
        );
        setTransactions(mappedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Fetch error:", error);
        toast.error("Failed to load dashboard data");
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsSyncing(false);
      }
    }
  }, [user?.handle]); // Dependency added so handles update if user loads late

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const handleSync = useCallback(() => {
    toast.promise(fetchData(), {
      loading: "Syncing...",
      success: "Wallet synced!",
      error: "Failed to sync",
    });
  }, [fetchData]);

  const handleFund = async () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > 10000) {
      toast.error("Maximum funding amount is $10,000");
      return;
    }

    setIsFunding(true);
    try {
      const updated = await walletApi.fund({ amount });

      // Optimistically update or re-fetch
      const apiData = (updated as any).data || updated;
      if (apiData?.wallet) {
        setWallet((prev) =>
          prev
            ? {
                ...prev,
                balance: parseFloat(apiData.wallet.balance),
              }
            : null,
        );
      } else {
        fetchData();
      }

      toast.success(`Successfully added ${formatCurrency(amount)}`);
      setFundDialogOpen(false);
      setFundAmount("");
    } catch (error: any) {
      console.error("Fund error:", error);
      const message =
        error.response?.data?.message ||
        "Failed to add funds. Please try again.";
      toast.error(message);
    } finally {
      setIsFunding(false);
    }
  };

  const isOutgoing = (tx: Transaction) =>
    tx.senderHandle === user?.handle || tx.senderHandle === "Me";

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.handle || "User"}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your wallet
        </p>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary to-accent text-primary-foreground overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium opacity-90">
              Total Balance
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-white/20"
              onClick={handleSync}
              disabled={isSyncing}
              aria-label="Sync wallet"
            >
              <RefreshCw
                className={cn("h-5 w-5", isSyncing && "animate-spin")}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {wallet ? (
            <div className="text-4xl font-bold mb-4">
              <AnimatedCounter value={wallet.balance} />
            </div>
          ) : (
            // Loading Skeleton for Balance
            <div className="h-10 w-48 bg-white/20 animate-pulse rounded mb-4" />
          )}

          <div className="flex gap-3">
            <Dialog open={fundDialogOpen} onOpenChange={setFundDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  className="flex-1 bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Funds to Wallet</DialogTitle>
                  <DialogDescription>
                    Enter the amount you want to add to your wallet
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                        className="pl-7"
                        min="0"
                        step="0.01"
                        max="10000"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[50, 100, 250, 500].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        onClick={() => setFundAmount(amount.toString())}
                        className="flex-1"
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleFund}
                    disabled={isFunding}
                  >
                    {isFunding ? "Processing..." : "Add Funds"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="secondary"
              className="flex-1 bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
              onClick={() => navigate("/send")}
            >
              <Send className="mr-2 h-4 w-4" />
              Send Money
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/send")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ArrowUpRight className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Send</p>
              <p className="text-sm text-muted-foreground">Transfer money</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/history")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-success/10 rounded-lg">
              <ArrowDownLeft className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="font-medium">History</p>
              <p className="text-sm text-muted-foreground">View transactions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Transactions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/history")}
            >
              View all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isSyncing && transactions.length === 0 ? (
            // Loading Skeleton for Transactions
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-2 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                  </div>
                  <div className="h-4 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : safeTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Start by sending money to someone</p>
            </div>
          ) : (
            <div className="space-y-4">
              {safeTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/history/${tx.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/history/${tx.id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-full",
                        isOutgoing(tx) ? "bg-destructive/10" : "bg-success/10",
                      )}
                    >
                      {isOutgoing(tx) ? (
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-success" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {isOutgoing(tx)
                          ? `To @${tx.receiverHandle}`
                          : `From @${tx.senderHandle}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.note || "No note"} • {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-semibold",
                        isOutgoing(tx) ? "text-destructive" : "text-success",
                      )}
                    >
                      {isOutgoing(tx) ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full inline-block mt-1",
                        tx.status === "completed"
                          ? "bg-success/10 text-success"
                          : tx.status === "failed"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-yellow-500/10 text-yellow-600",
                      )}
                    >
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
