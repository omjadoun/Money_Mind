// Dashboard.jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Plus,
  Receipt,
  PieChart
} from "lucide-react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/contexts/TransactionContext";
import { useBudgets } from "@/contexts/BudgetContext";
import { useState } from "react";
import heroImage from "@/assets/dashboard-hero.jpg";
import AddTransactionModal from "@/components/modals/AddTransactionModal";
import UploadReceiptModal from "@/components/modals/UploadReceiptModal";
import { formatINR } from "@/lib/utils";

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--success))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--destructive))",
  },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { transactions, getFinancialMetrics, getSpendingByCategory } = useTransactions();
  const { getBudgetMetrics } = useBudgets();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  const metrics = getFinancialMetrics();
  const { totalIncome, totalExpenses, netSavings, savingsRate } = metrics;
  const budgetMetrics = getBudgetMetrics();
  const { budgetCategories, budgetUsedPercentage, totalBudget, totalSpent } = budgetMetrics;
  
  // Get recent transactions (last 5)
  const recentTransactions = transactions.slice(0, 5).map(t => ({
    id: t.id,
    description: t.description,
    amount: t.type === 'income' ? t.amount : -t.amount,
    category: t.category,
    date: new Date(t.date).toLocaleDateString(),
    type: t.type
  }));

  // Parse dates safely as local to avoid timezone edge cases (e.g., YYYY-MM-DD becoming previous day in UTC)
  const parseLocalDate = (input) => {
    if (input instanceof Date) return input;
    if (typeof input === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.test(input)) {
      const [y, m, d] = input.split('T')[0].split('-').map((n) => parseInt(n, 10));
      return new Date(y, m - 1, d);
    }
    return new Date(input);
  };

  // Generate monthly data from actual transactions (last 6 months)
  const generateMonthlyData = () => {
    const monthlyData = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const monthNum = date.getMonth();
      
      const monthTransactions = transactions.filter(t => {
        const transactionDate = parseLocalDate(t.date);
        return transactionDate.getMonth() === monthNum && 
               transactionDate.getFullYear() === year;
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      monthlyData.push({
        month,
        income: Math.round(income),
        expenses: Math.round(expenses)
      });
    }
    
    return monthlyData;
  };

  const monthlyData = generateMonthlyData();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-lg sm:rounded-xl overflow-hidden bg-gradient-primary text-white">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Financial Dashboard" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Welcome back, {user?.email?.split('@')[0] || 'User'}!</h1>
          <p className="text-sm sm:text-base md:text-lg opacity-90">Here's your financial overview for this month</p>    
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
            {/* Add Transaction */}
            <Button 
              variant="secondary" 
              className="gap-2 touch-target-lg w-full sm:w-auto" 
              onClick={() => setShowTransactionModal(true)}
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Add Transaction</span>
            </Button>

            {/* Upload Receipt */}
            <Button 
              variant="secondary" 
              className="gap-2 touch-target-lg w-full sm:w-auto" 
              onClick={() => setShowReceiptModal(true)}
            >
              <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Upload Receipt</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Top Insights removed from Dashboard (moved to Analytics) */}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-success break-words">{formatINR(totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month's income
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-destructive break-words">{formatINR(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month's expenses
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Net Savings</CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold break-words ${netSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatINR(netSavings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Savings rate: {savingsRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Budget Used</CardTitle>
            <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-accent flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className={`text-xl sm:text-2xl font-bold break-words ${budgetUsedPercentage > 90 ? 'text-destructive' : budgetUsedPercentage > 75 ? 'text-warning' : 'text-accent'}`}>
              {budgetUsedPercentage.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              {formatINR(totalSpent)} of {formatINR(totalBudget)} budget
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Income vs Expenses Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Income vs Expenses</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Monthly comparison for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ChartContainer config={chartConfig} className="chart-container-responsive w-full">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  label={{ value: "Month", position: "insideBottom", offset: -5, style: { fontSize: 12, fontWeight: "bold" } }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ value: "Amount (₹)", angle: -90, position: "insideLeft", style: { fontSize: 12, fontWeight: "bold" } }}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="var(--color-income)" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="var(--color-expenses)" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <Card className="shadow-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Budget Overview</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Current month spending by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
            {budgetCategories.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <p className="text-sm sm:text-base">No budgets set yet.</p>
                <p className="text-xs sm:text-sm mt-1">Create budgets to track your spending!</p>
              </div>
            ) : (
              budgetCategories.map((budget) => {
                const spent = parseFloat(budget.spentAmount || 0);
                const limit = parseFloat(budget.budget_limit || 0);
                const percentage = limit > 0 ? (spent / limit) * 100 : 0;
                const isOverBudget = percentage > 100;
                
                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                      <span className="font-medium truncate">{budget.category}</span>
                      <span className={`flex-shrink-0 ${isOverBudget ? "text-destructive" : "text-muted-foreground"}`}>
                        {formatINR(spent)} / {formatINR(limit)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(percentage, 100)} 
                      className="h-2 sm:h-2.5"
                    />
                    {isOverBudget && (
                      <p className="text-xs text-destructive">
                        Over budget by {formatINR(spent - limit)}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-card">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Recent Transactions</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your most recent spending activity</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4">
            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <p className="text-sm sm:text-base">No transactions yet.</p>
                <p className="text-xs sm:text-sm mt-1">Add your first transaction to see it here!</p>
              </div>
            ) : (
              recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className={`p-2 sm:p-2.5 rounded-full flex-shrink-0 ${
                      transaction.amount > 0 ? "bg-success/20" : "bg-destructive/20"
                    }`}>
                      {transaction.amount > 0 ? (
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{transaction.description || "No description"}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{transaction.category} • {transaction.date}</p>
                    </div>
                  </div>
                  <div className={`text-base sm:text-lg font-semibold flex-shrink-0 ${
                    transaction.amount > 0 ? "text-success" : "text-destructive"
                  }`}>
                    {transaction.amount > 0 ? "+" : ""}{formatINR(Math.abs(transaction.amount))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <AddTransactionModal 
        open={showTransactionModal} 
        onOpenChange={setShowTransactionModal} 
      />
      <UploadReceiptModal 
        open={showReceiptModal} 
        onOpenChange={setShowReceiptModal} 
      />
    </div>
  );
}