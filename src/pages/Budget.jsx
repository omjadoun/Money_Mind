// Budget.jsx
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import AddBudgetModal from "@/components/modals/AddBudgetModal";
import { useBudgets } from "@/contexts/BudgetContext";
import { 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Target,
  DollarSign
} from "lucide-react";
import { formatINR } from "@/lib/utils";

const getCategoryColor = (index) => {
  const colors = [
    "bg-primary",
    "bg-accent", 
    "bg-success",
    "bg-warning",
    "bg-destructive",
    "bg-muted-foreground"
  ];
  return colors[index % colors.length];
};

export default function Budget() {
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const { addBudget, updateBudget, deleteBudget, getBudgetMetrics, loading } = useBudgets();

  const {
    totalBudget,
    totalSpent,
    remainingBudget,
    budgetUsedPercentage,
    overBudgetCategories,
    nearLimitCategories,
    budgetCategories
  } = getBudgetMetrics();

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setShowBudgetModal(true);
  };

  const handleCreateBudget = () => {
    setEditingBudget(null);
    setShowBudgetModal(true);
  };

  const handleSaveBudget = async (budgetIdOrData, budgetData = null) => {
    // Handle both calling patterns:
    // - onSave(budgetData) for new budgets
    // - onSave(id, budgetData) for editing budgets
    if (budgetData !== null) {
      // Editing: first param is ID, second is data
      await updateBudget(budgetIdOrData, budgetData);
    } else {
      // Creating: first param is data
      await addBudget(budgetIdOrData);
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      await deleteBudget(budgetId);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Budget Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Set spending limits and track your progress</p>
        </div>
        <Button onClick={handleCreateBudget} className="gap-2 touch-target-lg w-full sm:w-auto">
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">Add Budget</span>
        </Button>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-primary break-words">{formatINR(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly allocation</p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-destructive break-words">{formatINR(totalSpent)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {budgetUsedPercentage.toFixed(1)}% of budget used
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Remaining</CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-success break-words">{formatINR(remainingBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available to spend
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Over Budget</CardTitle>
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-warning break-words">{overBudgetCategories.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Categories exceed limit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(overBudgetCategories.length > 0 || nearLimitCategories.length > 0) && (
        <div className="space-y-4">
          {overBudgetCategories.length > 0 && (
            <Card className="shadow-card border-destructive">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-destructive text-base sm:text-lg">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                  Over Budget Alert
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  The following categories have exceeded their budget limits
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-2">
                  {overBudgetCategories.map(category => (
                    <div key={category.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-destructive/10">
                      <span className="font-medium text-sm sm:text-base truncate">{category.category}</span>
                      <span className="text-destructive text-xs sm:text-sm flex-shrink-0">
                        {formatINR(category.spentAmount)} / {formatINR(category.budget_limit)} 
                        (+{formatINR(category.spentAmount - category.budget_limit)})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {nearLimitCategories.length > 0 && (
            <Card className="shadow-card border-warning">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-warning text-base sm:text-lg">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                  Budget Warning
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  These categories are approaching their budget limits
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="space-y-2">
                  {nearLimitCategories.map(category => {
                    const percentage = ((category.spentAmount / category.budget_limit) * 100).toFixed(0);
                    return (
                      <div key={category.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 sm:p-3 rounded-lg bg-warning/10">
                        <span className="font-medium text-sm sm:text-base truncate">{category.category}</span>
                        <span className="text-warning text-xs sm:text-sm flex-shrink-0">
                          {percentage}% used ({formatINR(category.spentAmount)} / {formatINR(category.budget_limit)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Budget Categories */}
      <Card className="shadow-card">
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Budget Categories</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage your spending limits by category</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid gap-4 sm:gap-6">
            {budgetCategories.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-muted-foreground">
                <Target className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No budgets created yet</p>
                <p className="text-xs sm:text-sm mt-1">Click "Add Budget" to get started</p>
              </div>
            ) : (
              budgetCategories.map((category, index) => {
                const spent = parseFloat(category.spentAmount || 0);
                const budget = parseFloat(category.budget_limit || 0);
                const percentage = budget > 0 ? (spent / budget) * 100 : 0;
                const isOverBudget = percentage > 100;
                const isNearLimit = percentage >= 80 && percentage <= 100;

                return (
                  <div key={category.id} className="space-y-3 p-3 sm:p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${getCategoryColor(index)}`} />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm sm:text-base truncate">{category.category}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {new Date(category.start_date).toLocaleDateString()} - {new Date(category.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                        {isOverBudget && (
                          <Badge variant="destructive" className="text-xs">Over Budget</Badge>
                        )}
                        {isNearLimit && (
                          <Badge variant="secondary" className="text-xs">Near Limit</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBudget(category)}
                          className="h-10 w-10 sm:h-8 sm:w-8 touch-target"
                          aria-label="Edit budget"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 sm:h-8 sm:w-8 touch-target"
                          onClick={() => handleDeleteBudget(category.id)}
                          aria-label="Delete budget"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                        <span className="truncate">
                          {formatINR(spent)} spent
                        </span>
                        <span className="text-muted-foreground flex-shrink-0">
                          {formatINR(budget)} budget
                        </span>
                      </div>
                      <Progress
                        value={Math.min(percentage, 100)}
                        className={`h-2 sm:h-2.5 ${isOverBudget ? 'bg-destructive/20' : ''}`}
                      />
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 text-xs text-muted-foreground">
                        <span>{percentage.toFixed(0)}% used</span>
                        <span className="flex-shrink-0">
                          {formatINR(Math.max(0, budget - spent))} remaining
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Modal */}
      <AddBudgetModal 
        open={showBudgetModal} 
        onOpenChange={setShowBudgetModal}
        editingBudget={editingBudget}
        onSave={handleSaveBudget}
      />
    </div>
  );
}