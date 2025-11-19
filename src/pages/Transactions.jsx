//Transactions.jsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddTransactionModal from "@/components/modals/AddTransactionModal";
import { useTransactions } from "@/contexts/TransactionContext";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Edit,
  Trash2,
  Receipt
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";

export default function Transactions() {
  const { transactions, deleteTransaction, categories, paymentMethods } = useTransactions();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Convert transactions to display format
  const displayTransactions = transactions.map(t => ({
    id: t.id,
    description: t.description,
    amount: t.type === 'income' ? t.amount : -t.amount,
    category: t.category,
    date: t.date,
    type: t.type,
    account: t.paymentMethod,
    status: "completed"
  }));

  const filteredTransactions = displayTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || transaction.category === selectedCategory;
    const matchesType = selectedType === "all" || transaction.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleEditTransaction = (transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleCreateTransaction = () => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  };

  const handleDeleteTransaction = async (id) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      try {
        await deleteTransaction(id);
      } catch (error) {
        console.error("Failed to delete transaction:", error);
      }
    }
  };

  const exportTransactions = () => {
    const csvData = [
      ['Date', 'Description', 'Category', 'Type', 'Amount', 'Payment Method'],
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.description,
        t.category,
        t.type,
        Math.abs(t.amount).toFixed(2),
        t.account
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: "success",
      pending: "warning",
      failed: "destructive"
    };
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Transactions</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Track and manage your financial transactions</p>
        </div>
        <Button onClick={handleCreateTransaction} className="gap-2 touch-target-lg w-full sm:w-auto">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">Add Transaction</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="w-full">
              <Label htmlFor="search" className="sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  className="pl-10 h-11 sm:h-10 text-base sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[140px] h-11 sm:h-10 text-base sm:text-sm">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-[120px] h-11 sm:h-10 text-base sm:text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2 touch-target-lg w-full sm:w-auto" onClick={exportTransactions}>
                <Download className="h-4 w-4" />
                <span className="text-sm sm:text-base">Export</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="shadow-card">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Transaction History</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {filteredTransactions.length} transactions found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <Receipt className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-base sm:text-lg font-medium">No transactions found</p>
                <p className="text-xs sm:text-sm mt-1">
                  {searchTerm || selectedCategory !== "all" || selectedType !== "all" 
                    ? "Try adjusting your filters or search term" 
                    : "Add your first transaction to get started"
                  }
                </p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className={`p-2 sm:p-3 rounded-full flex-shrink-0 ${
                      transaction.type === "income" ? "bg-success/20" : "bg-destructive/20"
                    }`}>
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                      )}
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{transaction.description || "No description"}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <span className="truncate">{transaction.category}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">{transaction.account}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
                    <div className={`text-base sm:text-lg font-semibold flex-shrink-0 ${
                      transaction.type === "income" ? "text-success" : "text-destructive"
                    }`}>
                      {transaction.type === "income" ? "+" : "-"}{formatINR(Math.abs(transaction.amount))}
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTransaction(transaction)}
                        className="h-10 w-10 sm:h-8 sm:w-8 touch-target"
                        aria-label="Edit transaction"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 sm:h-8 sm:w-8 hover:text-destructive touch-target"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        aria-label="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Modal */}
      <AddTransactionModal 
        open={showTransactionModal} 
        onOpenChange={setShowTransactionModal}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}
