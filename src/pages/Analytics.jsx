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
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Pie } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const expenseBreakdown = [
  { name: "Food & Dining", value: 1250, color: "hsl(var(--primary))" },
  { name: "Transportation", value: 890, color: "hsl(var(--accent))" },
  { name: "Shopping", value: 680, color: "hsl(var(--success))" },
  { name: "Entertainment", value: 420, color: "hsl(var(--warning))" },
  { name: "Bills & Utilities", value: 1200, color: "hsl(var(--destructive))" },
  { name: "Healthcare", value: 280, color: "hsl(var(--muted-foreground))" },
];

const monthlyTrend = [
  { month: "Jan", income: 4500, expenses: 3200, savings: 1300 },
  { month: "Feb", income: 4800, expenses: 3400, savings: 1400 },
  { month: "Mar", income: 4200, expenses: 3800, savings: 400 },
  { month: "Apr", income: 5100, expenses: 3600, savings: 1500 },
  { month: "May", income: 4900, expenses: 4200, savings: 700 },
  { month: "Jun", income: 5300, expenses: 3900, savings: 1400 },
];

const weeklySpending = [
  { week: "Week 1", amount: 520 },
  { week: "Week 2", amount: 890 },
  { week: "Week 3", amount: 640 },
  { week: "Week 4", amount: 750 },
];

const chartConfig = {
  income: { label: "Income", color: "hsl(var(--success))" },
  expenses: { label: "Expenses", color: "hsl(var(--destructive))" },
  savings: { label: "Savings", color: "hsl(var(--primary))" },
  amount: { label: "Amount", color: "hsl(var(--accent))" },
};

export default function Analytics() {
  const totalIncome = monthlyTrend.reduce((acc, curr) => acc + curr.income, 0);
  const totalExpenses = monthlyTrend.reduce((acc, curr) => acc + curr.expenses, 0);
  const totalSavings = totalIncome - totalExpenses;
  const savingsRate = ((totalSavings / totalIncome) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Detailed insights into your spending patterns</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="30days">
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="thismonth">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">${totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+8.2%</span> vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">${totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">+3.1%</span> vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalSavings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+12.8%</span> vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <PieChart className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{savingsRate}%</div>
            <p className="text-xs text-muted-foreground">
              of total income saved
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown Pie Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>Spending by category for the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <RechartsPieChart width={400} height={300}>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-2 shadow-md">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${data.value.toLocaleString()}
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
            <div className="grid grid-cols-2 gap-2 mt-4">
              {expenseBreakdown.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.name}</span>
                  <span className="text-muted-foreground ml-auto">${item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Income vs Expenses Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Income vs Expenses Trend</CardTitle>
            <CardDescription>Monthly comparison over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={monthlyTrend}>
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
                <Line 
                  type="monotone" 
                  dataKey="savings" 
                  stroke="var(--color-savings)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Spending Pattern */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Weekly Spending Pattern</CardTitle>
          <CardDescription>Your spending habits throughout the month</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart data={weeklySpending}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey="amount" 
                fill="var(--color-amount)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Top Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm font-medium text-success">Savings Increased</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your savings rate improved by 12.8% compared to last month
              </p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm font-medium text-warning">High Food Spending</p>
              <p className="text-xs text-muted-foreground mt-1">
                Food expenses are 23% higher than your average
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm font-medium text-primary">Best Week</p>
              <p className="text-xs text-muted-foreground mt-1">
                Week 1 had your lowest spending at $520
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Monthly Goals</CardTitle>
            <CardDescription>Track your financial objectives</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Save $2,000</span>
                <span className="text-success">$1,400 / $2,000</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: "70%" }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reduce Food Spending</span>
                <span className="text-warning">$1,250 / $1,000</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-warning h-2 rounded-full" style={{ width: "125%" }}></div>
              </div>
              <p className="text-xs text-warning">Over budget by $250</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Emergency Fund</span>
                <span className="text-primary">$8,500 / $10,000</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: "85%" }}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}