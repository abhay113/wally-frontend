"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/lib/store";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Transaction } from "@/lib/types";
import { transactionsApi } from "@/lib/api";
import { useDebounce } from "@/hooks";

// Interface matching the specific API response structure
interface HistoryApiResponse {
  success: boolean;
  data: {
    transactions: Array<{
      id: string;
      type: "SENT" | "RECEIVED";
      counterparty: {
        handle: string;
      };
      amount: string;
      status: string;
      createdAt: string;
      note?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Loading skeleton component
function TransactionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading transactions">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-lg animate-pulse"
        >
          <div className="flex items-center gap-4 flex-1">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded ml-auto" />
            <div className="h-3 w-16 bg-muted rounded ml-auto" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const filter = searchParams.get("filter") || "all";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Debounce search input to avoid excessive API calls
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update URL params when debounced search changes
  useEffect(() => {
    setSearchParams((params) => {
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      } else {
        params.delete("search");
      }
      params.set("page", "1"); // Reset to page 1 on search
      return params;
    });
  }, [debouncedSearch, setSearchParams]);

  const fetchTransactions = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      // We cast the response to unknown first, then to our expected type
      // because the generic api return type might differ from the specific structure
      const response = (await transactionsApi.getHistory({
        page,
        limit: 10,
        search: debouncedSearch,
        filter: filter !== "all" ? filter : undefined,
      })) as unknown as HistoryApiResponse;

      // Validate response data structure
      if (
        response?.data?.transactions &&
        Array.isArray(response.data.transactions)
      ) {
        const mappedTransactions: Transaction[] =
          response.data.transactions.map((tx) => {
            const isSent = tx.type === "SENT";
            const currentUserHandle = user?.handle || "Me";

            return {
              id: tx.id,
              // Map sender/receiver based on SENT/RECEIVED type
              senderHandle: isSent ? currentUserHandle : tx.counterparty.handle,
              senderId: "", // Not provided in list view
              receiverHandle: isSent
                ? tx.counterparty.handle
                : currentUserHandle,
              receiverId: "", // Not provided in list view
              amount: parseFloat(tx.amount),
              currency: "XLM",
              note: tx.note || "",
              // Standardize status for UI
              status:
                tx.status === "SUCCESS"
                  ? "completed"
                  : (tx.status.toLowerCase() as
                      | "pending"
                      | "completed"
                      | "failed"),
              createdAt: tx.createdAt,
            };
          });

        setTransactions(mappedTransactions);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } else {
        setTransactions([]);
        setTotalPages(1);
      }
    } catch (error: unknown) {
      // Type guard for AbortError
      const isAbortError =
        error instanceof Error && error.name === "AbortError";

      if (!isAbortError) {
        console.error("Fetch transactions error:", error);
        toast.error("Failed to load transactions.");
        setTransactions([]);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [page, debouncedSearch, filter, user?.handle]);

  useEffect(() => {
    fetchTransactions();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTransactions]);

  const handleFilterChange = (value: string) => {
    setSearchParams((params) => {
      if (value !== "all") {
        params.set("filter", value);
      } else {
        params.delete("filter");
      }
      params.set("page", "1");
      return params;
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    setSearchParams((params) => {
      params.set("page", newPage.toString());
      return params;
    });

    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isOutgoing = (tx: Transaction) =>
    tx.senderHandle === user?.handle || tx.senderHandle === "Me";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Transaction History
        </h1>
        <p className="text-muted-foreground">View all your past transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search transactions"
          />
        </div>
        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger
            className="w-full sm:w-40"
            aria-label="Filter transactions"
          >
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
            {filter === "sent"
              ? "Sent Transactions"
              : filter === "received"
                ? "Received Transactions"
                : "All Transactions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TransactionSkeleton count={5} />
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">No transactions found</p>
              <p className="text-sm">
                {debouncedSearch || filter !== "all"
                  ? "Try adjusting your search or filter"
                  : "You haven't made any transactions yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors animate-fade-in focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/history/${tx.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/history/${tx.id}`);
                    }
                  }}
                  aria-label={`Transaction: ${isOutgoing(tx) ? "Sent" : "Received"} ${formatCurrency(tx.amount)} ${isOutgoing(tx) ? "to" : "from"} @${isOutgoing(tx) ? tx.receiverHandle : tx.senderHandle}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "p-2.5 rounded-full",
                        isOutgoing(tx) ? "bg-destructive/10" : "bg-success/10",
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
                        {isOutgoing(tx)
                          ? `To @${tx.receiverHandle}`
                          : `From @${tx.senderHandle}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.note || "No note"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-semibold text-lg",
                        isOutgoing(tx) ? "text-destructive" : "text-success",
                      )}
                    >
                      {isOutgoing(tx) ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full inline-block",
                        tx.status === "completed"
                          ? "bg-success/10 text-success"
                          : tx.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-600"
                            : "bg-destructive/10 text-destructive",
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
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
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
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
