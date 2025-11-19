// Analytics.jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, TrendingDown, TrendingUp, DollarSign, PieChart } from "lucide-react";
import TopInsights from "@/components/TopInsights";
import { PieChart as RechartsPieChart, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Pie } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { useTransactions } from "@/contexts/TransactionContext";
import { useState } from "react";
import { useWeeklySpendingData } from "@/hooks/use-weekly-spending";
import { formatINR } from "@/lib/utils";


const chartConfig = {
  income: { label: "Income", color: "hsl(var(--success))" },
  expenses: { label: "Expenses", color: "hsl(var(--destructive))" },
  savings: { label: "Savings", color: "hsl(var(--primary))" },
  amount: { label: "Amount", color: "hsl(var(--accent))" },
};

export default function Analytics() {
  const { transactions, getFinancialMetrics, getSpendingByCategory } = useTransactions();
  const [dateRange, setDateRange] = useState("30days");
  
  // Filter transactions based on date range
  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(dateRange) {
      case "7days":
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        break;
      case "thismonth":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
    }
    
    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      return transactionDate >= startDate && transactionDate <= today;
    });
  };

  const filteredTransactions = getFilteredTransactions();
  
  // Calculate metrics from filtered transactions
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
  const totalSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;
  
  // Get expense breakdown with colors from filtered transactions
  const getSpendingByCategoryFiltered = () => {
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenseTransactions.forEach(transaction => {
      const category = transaction.category || 'Other';
      const amount = parseFloat(transaction.amount || 0);
      if (categoryTotals[category]) {
        categoryTotals[category] += amount;
      } else {
        categoryTotals[category] = amount;
      }
    });
    
    return Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: Math.round(value)
    }));
  };
  
  const expenseData = getSpendingByCategoryFiltered().map((item, index) => ({
    ...item,
    color: [
      "hsl(var(--primary))",
      "hsl(var(--accent))", 
      "hsl(var(--success))",
      "hsl(var(--warning))",
      "hsl(var(--destructive))",
      "hsl(var(--muted-foreground))"
    ][index % 6]
  }));

  // Generate monthly trend from filtered transactions
  const getMonthlyTrend = () => {
    const months = [];
    const now = new Date();
    
    // Get last 6 months or appropriate range based on filter
    const monthsToShow = dateRange === "7days" ? 1 : dateRange === "thismonth" ? 1 : 6;
    
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(now.getMonth() - i);
      const monthName = date.toLocaleDateString('en', { month: 'short' });
      
      const monthTransactions = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === date.getMonth() && 
               transactionDate.getFullYear() === date.getFullYear();
      });
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
      const expenses = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
      months.push({
        month: monthName,
        income,
        expenses,
        savings: income - expenses
      });
    }
    
    return months;
  };
  
  const monthlyTrend = getMonthlyTrend();

  // Weekly spending from shared hook (auto-updates on transaction changes)
  const { weeklySpending } = useWeeklySpendingData();

  // Export functionality
  const exportAnalyticsData = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Income', totalIncome.toFixed(2)],
      ['Total Expenses', totalExpenses.toFixed(2)],
      ['Net Savings', totalSavings.toFixed(2)],
      ['Savings Rate', `${savingsRate.toFixed(1)}%`],
      [''],
      ['Monthly Trend', ''],
      ['Month', 'Income', 'Expenses', 'Savings'],
      ...monthlyTrend.map(m => [m.month, m.income.toFixed(2), m.expenses.toFixed(2), m.savings.toFixed(2)]),
      [''],
      ['Expense Breakdown', ''],
      ['Category', 'Amount'],
      ...expenseData.map(e => [e.name, e.value.toFixed(2)])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Detailed insights into your spending patterns</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full sm:w-[180px] h-11 sm:h-10 text-base sm:text-sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="thismonth">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalyticsData} className="touch-target-lg w-full sm:w-auto text-sm sm:text-base">Export Report</Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-success break-words">{formatINR(totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-success">+8.2%</span> vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-destructive break-words">{formatINR(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-destructive">+3.1%</span> vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Net Savings</CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-primary break-words">{formatINR(totalSavings)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-success">+12.8%</span> vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Savings Rate</CardTitle>
            <PieChart className="h-4 w-4 sm:h-5 sm:w-5 text-accent flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-accent break-words">{savingsRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              of total income saved
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Expense Breakdown Pie Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Expense Breakdown</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Spending by category for the selected period</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ChartContainer config={{}} className="chart-container-responsive w-full">
              <RechartsPieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  dataKey="value"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-md text-xs sm:text-sm">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-muted-foreground">
                            {formatINR(data.value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RechartsPieChart>
            </ChartContainer>
            
            {/* Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
              {expenseData.length === 0 ? (
                <p className="col-span-2 text-center text-xs sm:text-sm text-muted-foreground py-4">
                  No expense data available
                </p>
              ) : (
                expenseData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs sm:text-sm">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                    <span className="text-muted-foreground ml-auto flex-shrink-0">{formatINR(item.value)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income vs Expenses Trend */}
        <Card className="shadow-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Income vs Expenses Trend</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Monthly comparison over time</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ChartContainer config={chartConfig} className="chart-container-responsive w-full">
              <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
                <Line 
                  type="monotone" 
                  dataKey="savings" 
                  stroke="var(--color-savings)" 
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Spending Pattern */}
      <Card className="shadow-card">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Weekly Spending Pattern</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your spending habits throughout the month</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden p-3 sm:p-6">
          <div className="w-full min-w-0">
            <ChartContainer
              config={chartConfig}
              className="chart-container-responsive w-full"
            >
              <BarChart
                data={weeklySpending}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" interval="preserveStartEnd" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="amount"
                  fill="var(--color-amount)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Insights below weekly chart, above Monthly Goals */}
      <TopInsights />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Monthly Goals</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Track your financial objectives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                <span className="truncate">Save {formatINR(2000)}</span>
                <span className="text-success flex-shrink-0">{formatINR(1400)} / {formatINR(2000)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 sm:h-2.5 overflow-hidden">
                <div className="bg-success h-full rounded-full" style={{ width: "70%" }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                <span className="truncate">Reduce Food Spending</span>
                <span className="text-warning flex-shrink-0">{formatINR(1250)} / {formatINR(1000)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 sm:h-2.5 overflow-hidden">
                <div className="bg-warning h-full rounded-full" style={{ width: "100%" }}></div>
              </div>
              <p className="text-xs text-destructive font-medium"> Over budget by {formatINR(250)} </p>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                <span className="truncate">Emergency Fund</span>
                <span className="text-primary flex-shrink-0">{formatINR(8500)} / {formatINR(10000)}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 sm:h-2.5 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{ width: "85%" }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}