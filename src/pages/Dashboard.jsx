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
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import heroImage from "@/assets/dashboard-hero.jpg";

const monthlyData = [
  { month: "Jan", income: 4500, expenses: 3200 },
  { month: "Feb", income: 4800, expenses: 3400 },
  { month: "Mar", income: 4200, expenses: 3800 },
  { month: "Apr", income: 5100, expenses: 3600 },
  { month: "May", income: 4900, expenses: 4200 },
  { month: "Jun", income: 5300, expenses: 3900 },
];

const budgetCategories = [
  { name: "Food & Dining", spent: 850, budget: 1000, color: "bg-primary" },
  { name: "Transportation", spent: 420, budget: 500, color: "bg-accent" },
  { name: "Shopping", spent: 680, budget: 800, color: "bg-success" },
  { name: "Entertainment", spent: 290, budget: 400, color: "bg-warning" },
];

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
  const totalIncome = 5300;
  const totalExpenses = 3900;
  const netSavings = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-primary text-white">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Financial Dashboard" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative p-8 space-y-4">
          <h1 className="text-4xl font-bold">Welcome back, om!</h1>
          <p className="text-lg opacity-90">Here's your financial overview for this month</p>
          <div className="flex gap-4 pt-4">
            <Button variant="secondary" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
            <Button variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10">
              <Receipt className="h-4 w-4" />
              Upload Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${netSavings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+18%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Used</CardTitle>
            <PieChart className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">73%</div>
            <p className="text-xs text-muted-foreground">
              $2,240 of $3,075 budget
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Monthly comparison for the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="var(--color-income)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="var(--color-expenses)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Budget Progress */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
            <CardDescription>Current month spending by category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgetCategories.map((category) => {
              const percentage = (category.spent / category.budget) * 100;
              const isOverBudget = percentage > 100;
              
              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className={isOverBudget ? "text-destructive" : "text-muted-foreground"}>
                      ${category.spent} / ${category.budget}
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className="h-2"
                  />
                  {isOverBudget && (
                    <p className="text-xs text-destructive">
                      Over budget by ${category.spent - category.budget}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your most recent spending activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { id: 1, description: "Grocery Shopping", amount: -85.99, category: "Food", date: "2 hours ago" },
              { id: 2, description: "Salary Deposit", amount: 2500.00, category: "Income", date: "1 day ago" },
              { id: 3, description: "Electric Bill", amount: -120.50, category: "Utilities", date: "2 days ago" },
              { id: 4, description: "Coffee Shop", amount: -12.75, category: "Food", date: "3 days ago" },
              { id: 5, description: "Freelance Work", amount: 800.00, category: "Income", date: "4 days ago" },
            ].map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${
                    transaction.amount > 0 ? "bg-success/20" : "bg-destructive/20"
                  }`}>
                    {transaction.amount > 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-sm text-muted-foreground">{transaction.category} • {transaction.date}</p>
                  </div>
                </div>
                <div className={`text-lg font-semibold ${
                  transaction.amount > 0 ? "text-success" : "text-destructive"
                }`}>
                  {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}