import { useMemo } from 'react';
import { useTransactions } from '@/contexts/TransactionContext';

const parseLocalDate = (input) => {
  if (input instanceof Date) return input;
  if (typeof input === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.test(input)) {
    const [y, m, d] = input.split('T')[0].split('-').map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d);
  }
  return new Date(input);
};

export function useWeeklySpendingData() {
  const { transactions } = useTransactions();

  const weeklySpending = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999); // Include the entire last day
    const daysInMonth = endOfMonth.getDate();
    const weekCount = Math.ceil(daysInMonth / 7);
    const totals = Array.from({ length: weekCount + 1 }, () => 0); // index 1..weekCount

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const d = parseLocalDate(t.date);
        // Reset time to midnight for accurate comparison
        const transactionDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        
        // Check if transaction is in current month
        if (transactionDate >= startOfMonth && transactionDate <= endOfMonth) {
          // Calculate which week of the month (1-based)
          // Days 1-7 = Week 1, Days 8-14 = Week 2, Days 15-21 = Week 3, Days 22-28 = Week 4, Days 29-31 = Week 5
          const dayOfMonth = d.getDate();
          const weekIndex = Math.ceil(dayOfMonth / 7);
          // Ensure weekIndex is within valid range (1 to weekCount)
          const validWeekIndex = Math.max(1, Math.min(weekCount, weekIndex));
          const val = parseFloat(t.amount || 0);
          if (!Number.isNaN(val)) {
            totals[validWeekIndex] += val;
          }
        }
      });

    // Return array with weeks 1-4 only (exclude week 5 and beyond)
    const maxWeeksToShow = 4;
    const weeksToShow = Math.min(weekCount, maxWeeksToShow);
    return Array.from({ length: weeksToShow }, (_, i) => ({
      week: `Week ${i + 1}`,
      amount: Math.round(totals[i + 1] || 0),
    }));
  }, [transactions]);

  return { weeklySpending };
}


