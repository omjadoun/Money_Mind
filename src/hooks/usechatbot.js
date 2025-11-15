import { useTransactions } from "@/contexts/TransactionContext";
import { useBudgets } from "@/contexts/BudgetContext";

export default function useChatbot() {
  const { transactions } = useTransactions();
  const { getBudgetMetrics } = useBudgets();

  const { remainingBudget, totalBudget, totalSpent, budgetCategories } =
    getBudgetMetrics();

  // CATEGORY KEYWORD MAP
  const CATEGORY_MAP = {
    // Food
    food: "Food & Dining",
    dine: "Food & Dining",
    dining: "Food & Dining",

    // Transport
    travel: "Transportation",
    cab: "Transportation",
    taxi: "Transportation",
    bus: "Transportation",
    transport: "Transportation",
    transportation: "Transportation",

    // Shopping
    shopping: "Shopping",
    shoes: "Shopping",
    clothes: "Shopping",
    fashion: "Shopping",

    // Bills
    rent: "Bills & Utilities",
    bill: "Bills & Utilities",
    electricity: "Bills & Utilities",
    utilities: "Bills & Utilities",

    // Entertainment
    movies: "Entertainment",
    movie: "Entertainment",
    fun: "Entertainment",
    entertainment: "Entertainment",
  };

  const detectCategory = (word) => CATEGORY_MAP[word?.toLowerCase()] || null;

  // ---------------- DATE HELPERS ----------------
  const isCurrentMonth = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const isCurrentWeek = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();

    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return d >= start && d <= end;
  };

  // ---------------- CALCULATIONS ----------------
  const getMonthlyExpense = () =>
    transactions
      .filter((t) => isCurrentMonth(t.date) && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

  const getWeeklyExpense = () =>
    transactions
      .filter((t) => isCurrentWeek(t.date) && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

  const getMonthlyIncome = () =>
    transactions
      .filter((t) => isCurrentMonth(t.date) && t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

  const getCategoryExpense = (realCategory) =>
    transactions
      .filter(
        (t) =>
          isCurrentMonth(t.date) &&
          t.type === "expense" &&
          t.category?.toLowerCase() === realCategory.toLowerCase()
      )
      .reduce((sum, t) => sum + t.amount, 0);

  // Remaining category budget
  const getCategoryRemaining = (userCategory) => {
    const realCategory = detectCategory(userCategory);
    if (!realCategory) return null;

    const found = budgetCategories.find(
      (cat) => cat.category.toLowerCase() === realCategory.toLowerCase()
    );

    if (!found) return null;

    return parseFloat(found.budget_limit) - parseFloat(found.spentAmount);
  };

  // Check spending allowance
  const canUserBuyFromCategory = (amount, categoryWord) => {
    const remaining = getCategoryRemaining(categoryWord);
    const realCategory = detectCategory(categoryWord);

    if (realCategory && remaining !== null) {
      return {
        allowed: remaining >= amount,
        remaining,
        category: realCategory,
      };
    }

    return {
      allowed: remainingBudget >= amount,
      remaining: remainingBudget,
      category: "your overall budget",
    };
  };

  // ---------------- CHATBOT LOGIC ----------------
  const processMessage = (msg) => {
    msg = msg.toLowerCase();

    // GREETING
    if (["hi", "hello", "hey"].includes(msg)) {
      return "Hi! Ask me about expenses, income, savings, weekly spending, or if you can afford something.";
    }

    // WEEKLY EXPENSE PRIORITY
    if (
      msg.includes("weekly expense") ||
      msg.includes("week expense") ||
      msg.includes("spent this week") ||
      (msg.includes("week") && msg.includes("expense"))
    ) {
      return `You have spent ₹${getWeeklyExpense().toFixed(2)} this week.`;
    }

    // MULTI-INTENT DETECTION
    const parts = [];

    if (msg.includes("income")) {
      parts.push(`Your total income this month is ₹${getMonthlyIncome().toFixed(2)}.`);
    }

    if (msg.includes("saving")) {
      const s = (getMonthlyIncome() - getMonthlyExpense()).toFixed(2);
      parts.push(`Your savings this month are ₹${s}.`);
    }

    if (msg.includes("expense") || msg.includes("spent")) {
      parts.push(`You have spent ₹${getMonthlyExpense().toFixed(2)} this month.`);
    }

    if (parts.length > 1) return parts.join("\n");

    // CATEGORY SPENDING ("spent on travel")
    const categoryWord = msg.split(" ").find((word) => detectCategory(word));

    if (categoryWord && msg.includes("spent")) {
      const realCat = detectCategory(categoryWord);
      const amt = getCategoryExpense(realCat);

      return amt > 0
        ? `You spent ₹${amt} on ${realCat} this month.`
        : `No spending recorded for ${realCat} this month.`;
    }

    // PATTERN 1: "can I buy shoes for 1000"
    const buyMatch = msg.match(/can i (buy|spend).*?(\w+).*?for (\d+)/);

    if (buyMatch) {
      const item = buyMatch[2];
      const amount = parseInt(buyMatch[3]);

      const result = canUserBuyFromCategory(amount, item);

      return result.allowed
        ? `Yes, you can buy it. You still have ₹${result.remaining.toFixed(2)} left from ${result.category}.`
        : `No, you cannot buy it. You only have ₹${result.remaining.toFixed(2)} left in ${result.category}.`;
    }

    // PATTERN 2 (NEW): "can I spend 4000 on food"
    const spendOnMatch = msg.match(/can i spend (\d+)\s+on\s+(\w+)/);

    if (spendOnMatch) {
      const amount = parseInt(spendOnMatch[1]);
      const category = spendOnMatch[2];

      const result = canUserBuyFromCategory(amount, category);

      return result.allowed
        ? `Yes, you can spend it. You still have ₹${result.remaining.toFixed(2)} left in ${result.category}.`
        : `No, you cannot spend it. You only have ₹${result.remaining.toFixed(2)} left in ${result.category}.`;
    }

    // SINGLE INTENT FALLBACKS
    if (msg.includes("expense") || msg.includes("spent")) {
      return `You have spent ₹${getMonthlyExpense().toFixed(2)} this month.`;
    }

    if (msg.includes("income")) {
      return `Your total income this month is ₹${getMonthlyIncome().toFixed(2)}.`;
    }

    if (msg.includes("saving")) {
      const s = (getMonthlyIncome() - getMonthlyExpense()).toFixed(2);
      return `Your savings this month are ₹${s}.`;
    }

    if (msg.includes("budget")) {
      return `Your total budget is ₹${totalBudget}, you spent ₹${totalSpent}, and you have ₹${remainingBudget} left.`;
    }

    return "Sorry, I didn't understand. Try asking about expenses, category spending, savings, or if you can afford something!";
  };

  return { processMessage };
}
