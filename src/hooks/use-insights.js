import { useMemo } from 'react';
import { useTransactions } from '@/contexts/TransactionContext';
import { useBudgets } from '@/contexts/BudgetContext';
import { formatINR } from '@/lib/utils';

// Local date parser to avoid timezone off-by-one when using YYYY-MM-DD
const parseLocalDate = (input) => {
  if (input instanceof Date) return input;
  if (typeof input === 'string' && /^(\d{4})-(\d{2})-(\d{2})/.test(input)) {
    const [y, m, d] = input.split('T')[0].split('-').map((n) => parseInt(n, 10));
    return new Date(y, m - 1, d);
  }
  return new Date(input);
};

export function useInsights() {
  const { transactions } = useTransactions();
  const { getBudgetMetrics } = useBudgets();

  const insights = useMemo(() => {
    const { budgetUsedPercentage } = getBudgetMetrics();
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const inThisMonth = (t) => {
      const d = parseLocalDate(t.date);
      return d >= startOfThisMonth && d <= now;
    };

    // Helper: month stats (offset 0 this month, 1 previous month)
    const getMonthlyStats = (offset = 0) => {
      const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      const inRange = (t) => {
        const d = parseLocalDate(t.date);
        return d >= start && d <= end;
      };
      const income = transactions.filter(t => t.type === 'income' && inRange(t)).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const expenses = transactions.filter(t => t.type === 'expense' && inRange(t)).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
      return { income, expenses, savingsRate };
    };

    const thisMonth = getMonthlyStats(0);
    const prevMonth = getMonthlyStats(1);
    const savingsRateDelta = thisMonth.savingsRate - (isFinite(prevMonth.savingsRate) ? prevMonth.savingsRate : 0);

    // Food detection against user's categories
    const findFoodCategoryName = () => {
      const categories = Array.from(new Set(transactions.map(t => t.category || 'Other')));
      const match = categories.find(c => /food/i.test(c));
      return match || 'Food & Dining';
    };
    const foodCategory = findFoodCategoryName();

    const monthlyFood = (offset = 0) => {
      const ref = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      return transactions
        .filter(t => t.type === 'expense' && (t.category || 'Other') === foodCategory)
        .filter(t => {
          const d = parseLocalDate(t.date);
          return d >= start && d <= end;
        })
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    };

    const foodThisMonth = monthlyFood(0);
    const foodPrev1 = monthlyFood(1);
    const foodPrev2 = monthlyFood(2);
    const foodPrev3 = monthlyFood(3);
    const prevs = [foodPrev1, foodPrev2, foodPrev3].filter(v => v >= 0);
    const foodAvgPrev = prevs.length > 0 ? (prevs.reduce((a, b) => a + b, 0) / prevs.length) : 0;
    const foodChangePct = foodAvgPrev > 0 ? ((foodThisMonth - foodAvgPrev) / foodAvgPrev) * 100 : 0;

    // Best week this month
    const weekTotals = Array.from({ length: 6 }, () => 0);
    transactions.filter(t => t.type === 'expense' && inThisMonth(t)).forEach(t => {
      const d = parseLocalDate(t.date);
      const weekIndex = Math.ceil(d.getDate() / 7);
      const val = parseFloat(t.amount || 0);
      weekTotals[weekIndex] += Number.isNaN(val) ? 0 : val;
    });
    let bestWeekIndex = null;
    let bestWeekAmount = null;
    for (let i = 1; i < weekTotals.length; i++) {
      if (weekTotals[i] > 0 && (bestWeekAmount === null || weekTotals[i] < bestWeekAmount)) {
        bestWeekAmount = weekTotals[i];
        bestWeekIndex = i;
      }
    }

    // Build neutral/success/warning insight tiles
    const result = [];

    // Savings change
    result.push({
      key: 'savings',
      title: 'Savings Increased',
      description: isFinite(savingsRateDelta)
        ? `Your savings rate ${savingsRateDelta >= 0 ? 'improved' : 'declined'} by ${Math.abs(savingsRateDelta).toFixed(1)}% compared to last month`
        : 'Not enough data to compare savings rate',
      tone: savingsRateDelta >= 0 ? 'success' : 'warning',
    });

    // Food spending vs average
    result.push({
      key: 'food',
      title: `High ${/food/i.test(foodCategory) ? 'Food' : foodCategory} Spending`,
      description: foodAvgPrev > 0
        ? `${foodCategory} expenses are ${Math.abs(foodChangePct).toFixed(0)}% ${foodChangePct >= 0 ? 'higher' : 'lower'} than your average`
        : `No past data to compare ${foodCategory} spending`,
      tone: foodChangePct >= 0 ? 'warning' : 'success',
    });

    // Best week
    result.push({
      key: 'bestWeek',
      title: 'Best Week',
      description: (bestWeekIndex && bestWeekAmount !== null)
        ? `Week ${bestWeekIndex} had your lowest spending at ${formatINR(Math.round(bestWeekAmount))}`
        : 'Track a few expenses this month to see your best week',
      tone: 'neutral',
    });

    return result;
  }, [transactions, getBudgetMetrics]);

  return { insights };
}


