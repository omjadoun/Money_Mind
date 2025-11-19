import { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

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
  'Other'
];

export const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Cash',
  'Bank Transfer',
  'Digital Wallet',
  'Other'
];

// Transaction service with retry logic and timeout
class TransactionService {
  static async withRetry(operation, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          )
        ]);
        return result;
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  static async getTransactions() {
    return this.withRetry(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error loading transactions:', error);
        throw error;
      }
      
      return data || [];
    });
  }

  static async addTransaction(transactionData, userId) {
    if (!userId) {
      throw new Error('User ID is required to add transaction');
    }
    
    return this.withRetry(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          ...transactionData,
          user_id: userId
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding transaction:', error);
        throw error;
      }
      
      return data;
    });
  }

  static async updateTransaction(id, updateData) {
    return this.withRetry(async () => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating transaction:', error);
        throw error;
      }
      
      return data;
    });
  }

  static async deleteTransaction(id) {
    return this.withRetry(async () => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
      }
    });
  }
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Load transactions on mount and when user changes
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadedTransactions = await TransactionService.getTransactions();
        setTransactions(loadedTransactions);
      } catch (error) {
        console.error('Failed to load transactions:', error);
        setError(error.message);
        toast({
          title: "Error",
          description: "Failed to load transactions. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user]);

  const addTransaction = async (transactionData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add transactions",
        variant: "destructive",
      });
      return;
    }

    try {
      const newTransaction = await TransactionService.addTransaction(transactionData, user.id);
      setTransactions(prev => [newTransaction, ...prev]);
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      return newTransaction;
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTransaction = async (id, updateData) => {
    try {
      const updatedTransaction = await TransactionService.updateTransaction(id, updateData);
      setTransactions(prev => 
        prev.map(t => t.id === id ? updatedTransaction : t)
      );
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      return updatedTransaction;
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update transaction",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await TransactionService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
      throw error;
    }
  };

  const refreshTransactions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const loadedTransactions = await TransactionService.getTransactions();
      setTransactions(loadedTransactions);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions,
    categories: TRANSACTION_CATEGORIES,
    paymentMethods: PAYMENT_METHODS,
  };

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
}

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
};
