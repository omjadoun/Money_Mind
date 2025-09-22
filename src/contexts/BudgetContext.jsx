import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTransactions } from './TransactionContext';

const BudgetContext = createContext();

// Budget service for localStorage operations
class BudgetService {
  static STORAGE_KEY = 'moneyMind_budgets';

  static getBudgets() {
    try {
      const budgets = localStorage.getItem(this.STORAGE_KEY);
      return budgets ? JSON.parse(budgets) : [];
    } catch (error) {
      console.error('Error loading budgets:', error);
      return [];
    }
  }

  static saveBudgets(budgets) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(budgets));
    } catch (error) {
      console.error('Error saving budgets:', error);
      throw new Error('Failed to save budget');
    }
  }

  static addBudget(budgetData) {
    const budgets = this.getBudgets();
    const newBudget = {
      id: Date.now().toString(),
      ...budgetData,
      createdAt: new Date().toISOString(),
    };
    
    budgets.push(newBudget);
    this.saveBudgets(budgets);
    return newBudget;
  }

  static updateBudget(id, updateData) {
    const budgets = this.getBudgets();
    const index = budgets.findIndex(b => b.id === id);
    
    if (index === -1) {
      throw new Error('Budget not found');
    }
    
    budgets[index] = { ...budgets[index], ...updateData };
    this.saveBudgets(budgets);
    return budgets[index];
  }

  static deleteBudget(id) {
    const budgets = this.getBudgets();
    const filteredBudgets = budgets.filter(b => b.id !== id);
    this.saveBudgets(filteredBudgets);
  }
}

export function BudgetProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getSpendingByCategory } = useTransactions();

  // Load budgets on mount
  useEffect(() => {
    try {
      const loadedBudgets = BudgetService.getBudgets();
      setBudgets(loadedBudgets);
    } catch (error) {
      console.error('Failed to load budgets:', error);
      toast({
        title: "Error",
        description: "Failed to load budgets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const addBudget = async (budgetData) => {
    try {
      const newBudget = BudgetService.addBudget(budgetData);
      setBudgets(prev => [...prev, newBudget]);
      
      toast({
        title: "Success",
        description: "Budget added successfully",
      });
      
      return newBudget;
    } catch (error) {
      console.error('Failed to add budget:', error);
      toast({
        title: "Error", 
        description: "Failed to add budget",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateBudget = async (id, updateData) => {
    try {
      const updatedBudget = BudgetService.updateBudget(id, updateData);
      setBudgets(prev => 
        prev.map(b => b.id === id ? updatedBudget : b)
      );
      
      toast({
        title: "Success",
        description: "Budget updated successfully",
      });
      
      return updatedBudget;
    } catch (error) {
      console.error('Failed to update budget:', error);
      toast({
        title: "Error",
        description: "Failed to update budget", 
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteBudget = async (id) => {
    try {
      BudgetService.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
      
      toast({
        title: "Success",
        description: "Budget deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete budget:', error);
      toast({
        title: "Error",
        description: "Failed to delete budget",
        variant: "destructive", 
      });
      throw error;
    }
  };

  // Get budget categories with actual spending data
  const getBudgetCategories = () => {
    const spendingData = getSpendingByCategory('current-month');
    const spendingMap = {};
    spendingData.forEach(item => {
      spendingMap[item.name] = item.value;
    });

    return budgets.map(budget => ({
      ...budget,
      spentAmount: spendingMap[budget.category] || 0,
    }));
  };

  // Calculate budget metrics
  const getBudgetMetrics = () => {
    const budgetCategories = getBudgetCategories();
    
    const totalBudget = budgetCategories.reduce((acc, cat) => acc + parseFloat(cat.budgetLimit || 0), 0);
    const totalSpent = budgetCategories.reduce((acc, cat) => acc + parseFloat(cat.spentAmount || 0), 0);
    const remainingBudget = totalBudget - totalSpent;
    const budgetUsedPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const overBudgetCategories = budgetCategories.filter(cat => 
      parseFloat(cat.spentAmount || 0) > parseFloat(cat.budgetLimit || 0)
    );
    
    const nearLimitCategories = budgetCategories.filter(cat => {
      const spent = parseFloat(cat.spentAmount || 0);
      const limit = parseFloat(cat.budgetLimit || 0);
      if (limit === 0) return false;
      const percentage = (spent / limit) * 100;
      return percentage >= 80 && percentage <= 100;
    });

    return {
      totalBudget,
      totalSpent,
      remainingBudget,
      budgetUsedPercentage,
      overBudgetCategories,
      nearLimitCategories,
      budgetCategories
    };
  };

  const value = {
    budgets,
    loading,
    addBudget,
    updateBudget,
    deleteBudget,
    getBudgetCategories,
    getBudgetMetrics
  };

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgets() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudgets must be used within a BudgetProvider');
  }
  return context;
}