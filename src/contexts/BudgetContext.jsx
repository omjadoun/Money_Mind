import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTransactions } from './TransactionContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

const BudgetContext = createContext();

// Budget service for Supabase operations
class BudgetService {
  static async getBudgets() {
    // Add timeout promise to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Budget fetch timed out. Please check your connection and try again.')), 10000);
    });
    
    try {
      const { data, error } = await Promise.race([
        supabase
          .from('budgets')
          .select('*')
          .order('created_at', { ascending: false }),
        timeoutPromise
      ]);
      
      if (error) {
        console.error('Error loading budgets:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      throw error;
    }
  }

  static async addBudget(budgetData, userId) {
    if (!userId) {
      throw new Error('User ID is required to add budget');
    }
    
    const { data, error } = await supabase
      .from('budgets')
      .insert([{
        ...budgetData,
        user_id: userId
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding budget:', error);
      throw error;
    }
    
    return data;
  }

  static async updateBudget(id, updateData, userId) {
    if (!userId) {
      throw new Error('User ID is required to update budget');
    }

    console.log('Updating budget:', { id, updateData, userId });

    const { data, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId) // Ensure we only update budgets belonging to the current user
      .select()
      .single();
    
    if (error) {
      console.error('Error updating budget:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
    if (!data) {
      throw new Error('Budget not found or you do not have permission to update it');
    }
    
    return data;
  }

  static async deleteBudget(id) {
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  }
}

export function BudgetProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getSpendingByCategory } = useTransactions();
  const { user } = useAuth();

  // Load budgets on mount and when user changes
  useEffect(() => {
    if (!user) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    // Set loading to false immediately, load data in background
    setLoading(false);
    
    const loadBudgets = async () => {
      try {
        const loadedBudgets = await BudgetService.getBudgets();
        setBudgets(loadedBudgets);
      } catch (error) {
        console.error('Failed to load budgets:', error);
        toast({
          title: "Error",
          description: "Failed to load budgets",
          variant: "destructive",
        });
      }
    };

    // Load in background without blocking UI
    loadBudgets();
  }, [user]);

  const addBudget = async (budgetData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add budgets",
        variant: "destructive",
      });
      return;
    }

    try {
      const newBudget = await BudgetService.addBudget(budgetData, user.id);
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
        description: error.message || "Failed to add budget",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateBudget = async (id, updateData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update budgets",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // First, check if updateData exists
      if (!updateData || typeof updateData !== 'object') {
        console.error('updateData is invalid:', updateData);
        throw new Error('Invalid update data provided');
      }

      console.log('Validating updateData:', JSON.stringify(updateData, null, 2));

      // Validate required fields with better error messages
      const missingFields = [];
      
      // Check category
      const category = updateData.category;
      if (!category || (typeof category === 'string' && category.trim() === '')) {
        missingFields.push('category');
        console.log('Category missing or empty:', category);
      }
      
      // Check budget_limit - allow 0 as valid
      const budgetLimit = updateData.budget_limit;
      if (budgetLimit === undefined || budgetLimit === null || 
          (typeof budgetLimit === 'string' && budgetLimit.trim() === '')) {
        missingFields.push('budget_limit');
        console.log('Budget limit missing or empty:', budgetLimit);
      }
      
      // Check dates
      const startDate = updateData.start_date;
      const endDate = updateData.end_date;
      if (!startDate || (typeof startDate === 'string' && startDate.trim() === '')) {
        missingFields.push('start_date');
        console.log('Start date missing or empty:', startDate);
      }
      if (!endDate || (typeof endDate === 'string' && endDate.trim() === '')) {
        missingFields.push('end_date');
        console.log('End date missing or empty:', endDate);
      }

      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        console.error('Full updateData object:', updateData);
        console.error('updateData keys:', Object.keys(updateData || {}));
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      console.log('Context updateBudget called:', { id, updateData });

      const updatedBudget = await BudgetService.updateBudget(id, updateData, user.id);
      
      console.log('Budget updated successfully:', updatedBudget);
      
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
      const errorMessage = error?.message || error?.error_description || error?.details || "Failed to update budget";
      toast({
        title: "Error",
        description: errorMessage, 
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteBudget = async (id) => {
    if (!user) return;
    
    try {
      await BudgetService.deleteBudget(id);
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
    
    const totalBudget = budgetCategories.reduce((acc, cat) => acc + parseFloat(cat.budget_limit || 0), 0);
    const totalSpent = budgetCategories.reduce((acc, cat) => acc + parseFloat(cat.spentAmount || 0), 0);
    const remainingBudget = totalBudget - totalSpent;
    const budgetUsedPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    const overBudgetCategories = budgetCategories.filter(cat => 
      parseFloat(cat.spentAmount || 0) > parseFloat(cat.budget_limit || 0)
    );
    
    const nearLimitCategories = budgetCategories.filter(cat => {
      const spent = parseFloat(cat.spentAmount || 0);
      const limit = parseFloat(cat.budget_limit || 0);
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