import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

const TransactionContext = createContext();

// Default categories and payment methods
export const TRANSACTION_CATEGORIES = [
  'Food & Dining',
  'Transportation', 
  'Shopping',
  'Entertainment',
  'Bills & Utilities',
  'Healthcare',
  'Income',
  'Investment',
  'Other'
];

export const PAYMENT_METHODS = [
  'Cash',
  'Credit Card', 
  'Debit Card',
  'Bank Transfer'
];

// Transaction service for localStorage operations
class TransactionService {
  static STORAGE_KEY = 'moneyMind_transactions';

  static getTransactions() {
    try {
      const transactions = localStorage.getItem(this.STORAGE_KEY);
      return transactions ? JSON.parse(transactions) : [];
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  }

  static saveTransactions(transactions) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw new Error('Failed to save transaction');
    }
  }

  static addTransaction(transactionData) {
    const transactions = this.getTransactions();
    const newTransaction = {
      id: Date.now().toString(),
      ...transactionData,
      date: transactionData.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    
    transactions.unshift(newTransaction);
    this.saveTransactions(transactions);
    return newTransaction;
  }

  static updateTransaction(id, updateData) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error('Transaction not found');
    }
    
    transactions[index] = { ...transactions[index], ...updateData };
    this.saveTransactions(transactions);
    return transactions[index];
  }

  static deleteTransaction(id) {
    const transactions = this.getTransactions();
    const filteredTransactions = transactions.filter(t => t.id !== id);
    this.saveTransactions(filteredTransactions);
  }
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load transactions on mount
  useEffect(() => {
    try {
      const loadedTransactions = TransactionService.getTransactions();
      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const addTransaction = async (transactionData) => {
    try {
      const newTransaction = TransactionService.addTransaction(transactionData);
      setTransactions(prev => [newTransaction, ...prev]);
      
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      
      return newTransaction;
    } catch (error) {
      console.error('Failed to add transaction:', error);
      toast({
        title: "Error", 
        description: "Failed to add transaction",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTransaction = async (id, updateData) => {
    try {
      const updatedTransaction = TransactionService.updateTransaction(id, updateData);
      setTransactions(prev => 
        prev.map(t => t.id === id ? updatedTransaction : t)
      );
      
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      
      return updatedTransaction;
    } catch (error) {
      console.error('Failed to update transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction", 
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTransaction = async (id) => {
    try {
      TransactionService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive", 
      });
      throw error;
    }
  };

  // Calculate financial metrics
  const getFinancialMetrics = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });

    const income = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      
    const expenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const netSavings = income - expenses;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

    return {
      totalIncome: income,
      totalExpenses: expenses, 
      netSavings,
      savingsRate
    };
  };

  // Get spending by category
  const getSpendingByCategory = (timeframe = 'current-month') => {
    let filteredTransactions = transactions.filter(t => t.type === 'expense');
    
    if (timeframe === 'current-month') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      filteredTransactions = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      });
    }

    const categorySpending = {};
    filteredTransactions.forEach(transaction => {
      const category = transaction.category || 'Other';
      categorySpending[category] = (categorySpending[category] || 0) + parseFloat(transaction.amount || 0);
    });

    return Object.entries(categorySpending).map(([name, value]) => ({
      name,
      value
    }));
  };

  const value = {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getFinancialMetrics,
    getSpendingByCategory,
    categories: TRANSACTION_CATEGORIES,
    paymentMethods: PAYMENT_METHODS
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}