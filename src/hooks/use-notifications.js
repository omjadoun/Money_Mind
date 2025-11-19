import { useState, useEffect, useCallback, useRef } from 'react';
import { useBudgets } from '@/contexts/BudgetContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'money_mind_notifications';
const LAST_TRANSACTION_CHECK_KEY = 'money_mind_last_transaction_check';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { getBudgetMetrics } = useBudgets();
  const { transactions } = useTransactions();
  const { user } = useAuth();
  const notificationsRef = useRef([]);
  const lastTransactionIdsRef = useRef(new Set());

  // Load notifications from localStorage
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      notificationsRef.current = [];
      lastTransactionIdsRef.current = new Set();
      return;
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure parsed is an array
        const validNotifications = Array.isArray(parsed) ? parsed : [];
        setNotifications(validNotifications);
        notificationsRef.current = validNotifications;
        const unread = validNotifications.filter(n => n && !n.read).length;
        setUnreadCount(unread);
        console.log('📬 Loaded notifications:', validNotifications.length, 'unread:', unread);
      } else {
        // Initialize empty if no stored notifications
        setNotifications([]);
        notificationsRef.current = [];
        setUnreadCount(0);
      }

      // Load last known transaction IDs
      const lastCheck = localStorage.getItem(`${LAST_TRANSACTION_CHECK_KEY}_${user.id}`);
      if (lastCheck) {
        const ids = JSON.parse(lastCheck);
        lastTransactionIdsRef.current = new Set(ids);
      } else {
        // Initialize with current transaction IDs
        lastTransactionIdsRef.current = new Set(transactions.map(t => t.id));
        localStorage.setItem(`${LAST_TRANSACTION_CHECK_KEY}_${user.id}`, JSON.stringify(Array.from(lastTransactionIdsRef.current)));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
      notificationsRef.current = [];
    }
  }, [user, transactions]);

  // Save notifications to localStorage
  const saveNotifications = useCallback((newNotifications) => {
    if (!user) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newNotifications));
      setNotifications(newNotifications);
      notificationsRef.current = newNotifications;
      setUnreadCount(newNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }, [user]);

  // Generate notifications from budget metrics
  const generateBudgetNotifications = useCallback(() => {
    if (!user) return [];

    const metrics = getBudgetMetrics();
    const newNotifications = [];
    const currentNotifications = notificationsRef.current;

    // PRIORITY: Check for exceeded budgets first (always show these)
    metrics.overBudgetCategories.forEach(category => {
      const spent = parseFloat(category.spentAmount || 0);
      const limit = parseFloat(category.budget_limit || 0);
      const overAmount = spent - limit;

      // Always create/update over-budget notifications (they're critical)
      const existingNotification = currentNotifications.find(
        n => n.type === 'budget_exceeded' && n.categoryId === category.id
      );

      if (existingNotification) {
        // Update existing notification if amount changed significantly
        const existingOverAmount = parseFloat(existingNotification.overAmount || 0);
        if (Math.abs(overAmount - existingOverAmount) > 1) {
          // Remove old and create new
          newNotifications.push({
            id: `budget_exceeded_${category.id}_${Date.now()}`,
            type: 'budget_exceeded',
            title: `🚨 Budget Exceeded: ${category.category}`,
            message: `You've exceeded your ${category.category} budget by $${overAmount.toFixed(2)}`,
            categoryId: category.id,
            category: category.category,
            overAmount: overAmount,
            timestamp: new Date().toISOString(),
            read: false,
            priority: 'high',
            link: '/budget'
          });
        }
      } else {
        newNotifications.push({
          id: `budget_exceeded_${category.id}_${Date.now()}`,
          type: 'budget_exceeded',
          title: `🚨 Budget Exceeded: ${category.category}`,
          message: `You've exceeded your ${category.category} budget by $${overAmount.toFixed(2)}`,
          categoryId: category.id,
          category: category.category,
          overAmount: overAmount,
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'high',
          link: '/budget'
        });
      }
    });

    // Check for budgets at 80% threshold
    metrics.nearLimitCategories.forEach(category => {
      const spent = parseFloat(category.spentAmount || 0);
      const limit = parseFloat(category.budget_limit || 0);
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;

      // Check if notification already exists (within last 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const existingNotification = currentNotifications.find(
        n => n.type === 'budget_warning' && 
        n.categoryId === category.id &&
        new Date(n.timestamp).getTime() > oneDayAgo
      );

      if (!existingNotification) {
        newNotifications.push({
          id: `budget_warning_${category.id}_${Date.now()}`,
          type: 'budget_warning',
          title: `Budget Alert: ${category.category}`,
          message: `You've used ${percentage.toFixed(1)}% of your ${category.category} budget ($${spent.toFixed(2)} / $${limit.toFixed(2)})`,
          categoryId: category.id,
          category: category.category,
          timestamp: new Date().toISOString(),
          read: false,
          link: '/budget'
        });
      }
    });

    return newNotifications;
  }, [user, getBudgetMetrics]);

  // Generate notifications from recent transactions
  const generateTransactionNotifications = useCallback(() => {
    if (!user || !transactions || transactions.length === 0) return [];

    const newNotifications = [];
    const currentTransactionIds = new Set(transactions.map(t => t.id));
    const lastKnownIds = lastTransactionIdsRef.current;

    // Find new transactions (not in last known set)
    const newTransactions = transactions.filter(t => !lastKnownIds.has(t.id));

    // Get recent transactions (last 10, sorted by date)
    const recentTransactions = transactions
      .slice(0, 10)
      .filter(t => {
        const transactionDate = new Date(t.date);
        const daysAgo = (Date.now() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7; // Only transactions from last 7 days
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Create notifications for new transactions
    newTransactions.slice(0, 5).forEach(transaction => {
      const isIncome = transaction.type === 'income';
      const amount = parseFloat(transaction.amount || 0);
      
      newNotifications.push({
        id: `transaction_${transaction.id}_${Date.now()}`,
        type: 'transaction_update',
        title: isIncome ? `💰 Income Added` : `💸 Expense Recorded`,
        message: `${transaction.description || 'Transaction'} - ${isIncome ? '+' : '-'}$${amount.toFixed(2)} (${transaction.category})`,
        transactionId: transaction.id,
        category: transaction.category,
        amount: amount,
        transactionType: transaction.type,
        timestamp: transaction.created_at || new Date().toISOString(),
        read: false,
        link: '/transactions'
      });
    });

    // Update last known transaction IDs
    if (newTransactions.length > 0) {
      lastTransactionIdsRef.current = currentTransactionIds;
      try {
        localStorage.setItem(`${LAST_TRANSACTION_CHECK_KEY}_${user.id}`, JSON.stringify(Array.from(currentTransactionIds)));
      } catch (error) {
        console.error('Error saving transaction check:', error);
      }
    }

    return newNotifications;
  }, [user, transactions]);

  // Update notifications periodically
  useEffect(() => {
    if (!user) return;

    const updateNotifications = () => {
      setNotifications(current => {
        const budgetNotifications = generateBudgetNotifications();
        const transactionNotifications = generateTransactionNotifications();
        const allNewNotifications = [...budgetNotifications, ...transactionNotifications];

        // Always clean up old over-budget notifications and add new ones
        let filtered = current;
        try {
          const metrics = getBudgetMetrics();
          const currentOverBudgetIds = new Set(metrics.overBudgetCategories.map(c => c.id));
          filtered = current.filter(n => {
            if (n.type === 'budget_exceeded') {
              return currentOverBudgetIds.has(n.categoryId);
            }
            return true;
          });
        } catch (error) {
          console.error('Error getting budget metrics:', error);
        }

        if (allNewNotifications.length > 0 || filtered.length !== current.length) {
          const updated = [...filtered, ...allNewNotifications];
          
          // Sort by priority (high priority first) then by timestamp
          const sorted = updated.sort((a, b) => {
            if (a.priority === 'high' && b.priority !== 'high') return -1;
            if (b.priority === 'high' && a.priority !== 'high') return 1;
            return new Date(b.timestamp) - new Date(a.timestamp);
          });
          
          // Keep only last 100 notifications
          const limited = sorted.slice(0, 100);
          saveNotifications(limited);
          return limited;
        }
        return filtered;
      });
    };

    // Check immediately after a short delay to ensure data is loaded
    const initialTimeout = setTimeout(updateNotifications, 1500);

    // Check every 2 minutes for real-time updates
    const interval = setInterval(updateNotifications, 2 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, generateBudgetNotifications, generateTransactionNotifications, saveNotifications]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Delete notification
  const deleteNotification = useCallback((notificationId) => {
    const updated = notifications.filter(n => n.id !== notificationId);
    saveNotifications(updated);
  }, [notifications, saveNotifications]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    saveNotifications([]);
  }, [saveNotifications]);

  // Sort notifications: priority first, then by timestamp
  // Use slice() to avoid mutating the original array
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  // Ensure unreadCount matches actual unread notifications
  const actualUnreadCount = sortedNotifications.filter(n => !n.read).length;
  const finalUnreadCount = actualUnreadCount !== unreadCount ? actualUnreadCount : unreadCount;

  return {
    notifications: sortedNotifications,
    unreadCount: finalUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  };
}

