import { useTransactions } from "@/contexts/TransactionContext";
import { useBudgets } from "@/contexts/BudgetContext";
import RLAgent from "@/rl/rlAgent";

export default function useChatbot() {
  const { transactions } = useTransactions();
  const { getBudgetMetrics } = useBudgets();

  const { remainingBudget, totalBudget, totalSpent, budgetCategories } =
    getBudgetMetrics();

  // ------------------ CATEGORY MAP ------------------
  const CATEGORY_MAP = {
    "fast food": "Food & Dining",
    "junk food": "Food & Dining",
    "online shopping": "Shopping",
    "food": "Food & Dining",
    "restaurant": "Food & Dining",
    "dining": "Food & Dining",

    "shopping": "Shopping",
    "shoes": "Shopping",
    "clothes": "Shopping",
    "fashion": "Shopping",

    "travel": "Transportation",
    "cab": "Transportation",
    "taxi": "Transportation",
    "bus": "Transportation",
    "train ticket": "Transportation",

    "rent": "Bills & Utilities",
    "bill": "Bills & Utilities",
    "electricity bill": "Bills & Utilities",
    "electricity": "Bills & Utilities",

    "movies": "Entertainment",
    "movie": "Entertainment",
    "fun": "Entertainment",
    "entertainment": "Entertainment",
  };

  // detect multi-word categories
  const detectCategoryFromText = (text) => {
    const lower = text.toLowerCase();
    const keys = Object.keys(CATEGORY_MAP).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (lower.includes(k)) return CATEGORY_MAP[k];
    }
    return null;
  };

  const detectCategoryToken = (word) =>
    CATEGORY_MAP[word?.toLowerCase()] || null;

  // ------------------ Date Helpers ------------------
  const isCurrentMonth = (d) => {
    const date = new Date(d);
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  };

  const isCurrentWeek = (d) => {
    const date = new Date(d);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return date >= start && date <= end;
  };

  // ------------------ Financial Calculations ------------------
  const getMonthlyExpense = () =>
    transactions
      .filter((t) => isCurrentMonth(t.date) && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

  const getWeeklyExpense = () =>
    transactions
      .filter((t) => isCurrentWeek(t.date) && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

  const getMonthlyIncome = () =>
    transactions
      .filter((t) => isCurrentMonth(t.date) && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);

  const getCategoryExpense = (realCategory) =>
    transactions
      .filter(
        (t) =>
          isCurrentMonth(t.date) &&
          t.type === "expense" &&
          t.category?.toLowerCase() === realCategory.toLowerCase()
      )
      .reduce((s, t) => s + t.amount, 0);

  const getCategoryRemaining = (userCategory) => {
    if (!userCategory) return null;
    const real = detectCategoryFromText(userCategory) || userCategory;
    const found = budgetCategories.find(
      (c) => c.category.toLowerCase() === real.toLowerCase()
    );
    if (!found) return null;
    return found.budget_limit - found.spentAmount;
  };

  // ---------------- RL STATE ----------------
  const buildRlState = ({ amountRequested, categoryName }) => {
    const income = getMonthlyIncome();
    const expense = getMonthlyExpense();
    const catRemaining = categoryName ? getCategoryRemaining(categoryName) : null;

    return {
      monthly_income: income,
      monthly_expense: expense,
      savings: income - expense,
      category_remaining: catRemaining,
      total_remaining: remainingBudget,
      request_amount: Number(amountRequested),
    };
  };

  // ---------------- Helpful Suggestions ----------------
  const buildSmartAdvice = (amount, category, catRemaining) => {
    const diff = amount - catRemaining;

    return (
      `Your ${category} budget has only ₹${catRemaining.toFixed(
        2
      )} left — ₹${amount} exceeds it by ₹${diff}.\n\n` +
      `Here are safe spending options:\n` +
      `• Spend ₹${catRemaining.toFixed(
        2
      )} from ${category} and pay the remaining ₹${diff} from overall budget.\n` +
      `• Split into 4 weekly payments of ₹${Math.ceil(amount / 4)}.\n` +
      `• Or reduce another category by ₹${diff}.\n\n` +
      `Reply "it worked" or "no it didn't".`
    );
  };

  const actionToAdvice = (action, { amount, category }) => {
    if (action === "buy_now")
      return `Your ${category} budget is sufficient. You can buy it safely.`;

    if (action === "split_payment")
      return `Split ₹${amount} into 4 weekly payments of ₹${Math.ceil(
        amount / 4
      )}.`;

    if (action === "reduce_other")
      return `Buy it, but reduce another category slightly to maintain savings.`;

    if (action === "buy_later")
      return `Consider delaying this purchase until next month.`;

    return "Spend carefully.";
  };

  // ---------------- FEEDBACK DETECTION ----------------
  const detectPositiveFeedback = (t) =>
    ["it worked", "yes it worked"].some((x) => t.includes(x));

  const detectNegativeFeedback = (t) =>
    ["didn't work", "did not work", "no it didn't"].some((x) =>
      t.includes(x)
    );

  // ---------------- MAIN CHATBOT LOGIC ----------------
  const processMessage = (raw) => {
    if (!raw) return "";
    const msg = raw.toLowerCase();

    // Feedback
    if (detectPositiveFeedback(msg) || detectNegativeFeedback(msg)) {
      const last = RLAgent.getLast();
      if (!last) return "No previous suggestion to record feedback for.";
      RLAgent.update(
        last.stateObj,
        last.action,
        detectPositiveFeedback(msg) ? 1 : -1
      );
      return detectPositiveFeedback(msg)
        ? "Great — I'll keep giving similar suggestions!"
        : "Got it — I will avoid similar suggestions next time.";
    }

    // Greetings
    if (["hi", "hello", "hey"].includes(msg))
      return "Hello! Try asking: 'How should I spend 2000 on food?'";

    // Weekly
    if (msg.includes("weekly expense") || msg.includes("this week"))
      return `You have spent ₹${getWeeklyExpense().toFixed(2)} this week.`;

    // Multi Intent
    const multi = [];
    if (msg.includes("income"))
      multi.push(
        `Your total income this month is ₹${getMonthlyIncome().toFixed(2)}.`
      );
    if (msg.includes("saving"))
      multi.push(
        `Your savings this month are ₹${(
          getMonthlyIncome() - getMonthlyExpense()
        ).toFixed(2)}.`
      );
    if (msg.includes("expense") && !msg.includes("spent on"))
      multi.push(
        `You have spent ₹${getMonthlyExpense().toFixed(2)} this month.`
      );
    if (multi.length > 1) return multi.join("\n");

    // Category "spent on"
    const detectedCat = detectCategoryFromText(msg);
    if (detectedCat && msg.includes("spent")) {
      const amt = getCategoryExpense(detectedCat);
      return amt > 0
        ? `You spent ₹${amt} on ${detectedCat} this month.`
        : `No spending recorded for ${detectedCat} this month.`;
    }

    // CAN I BUY ___ FOR ___?
    const buy1 = msg.match(/can i (buy|spend).*?(\w+).*?for (\d+)/);
    if (buy1) {
      const item = buy1[2];
      const amount = Number(buy1[3]);
      const detected =
        detectCategoryFromText(msg) || detectCategoryToken(item);
      const remaining = getCategoryRemaining(detected);

      if (remaining !== null) {
        if (amount > remaining)
          return `No, you cannot buy it. Only ₹${remaining.toFixed(
            2
          )} left in ${detected}.`;
        return `Yes, you can buy it. You have ₹${remaining.toFixed(
          2
        )} left in ${detected}.`;
      }
      return `Yes, based on your overall budget you can buy it.`;
    }

    // CAN I SPEND 2000 ON FOOD?
    const buy2 = msg.match(/can i spend (\d+)\s+on\s+([a-zA-Z\s]+)/);
    if (buy2) {
      const amount = Number(buy2[1]);
      const catRaw = buy2[2].trim();
      const detected = detectCategoryFromText(catRaw);
      const remaining = getCategoryRemaining(detected);
      if (remaining !== null) {
        if (amount > remaining)
          return `No, you cannot spend it. Only ₹${remaining.toFixed(
            2
          )} left in ${detected}.`;
        return `Yes, you can spend it. You still have ₹${remaining.toFixed(
          2
        )} left in ${detected}.`;
      }
    }

    // ---------------- HOW SHOULD I SPEND (FINAL LOGIC) ----------------
    const howMatch = msg.match(/how should i (spend|buy|purchase)/);
    if (howMatch) {
      const amountMatch = msg.match(/(\d{2,})/);
      if (!amountMatch) return "How much do you want to spend?";

      const amount = Number(amountMatch[1]);
      const catDetected = detectCategoryFromText(msg);
      const realCat = catDetected || "this category";

      const catRemaining = getCategoryRemaining(realCat);

      // CASE 1: Category over budget → CHECK ONLY OVERALL REMAINING BUDGET
      if (catRemaining !== null && catRemaining < 0) {

        if (amount > remainingBudget) {
          return (
            `No — you cannot spend ₹${amount}.\n` +
            `Your ${realCat} category is over budget and you only have ₹${remainingBudget} left overall.`
          );
        }

        return (
          `Your ${realCat} category is over budget, but your overall budget can cover it.\n\n` +
          `Smart options:\n` +
          `• Use ₹${amount} from your overall remaining budget.\n` +
          `• Split into 4 weekly payments of ₹${Math.ceil(amount / 4)}.\n` +
          `• Delay part of it to next month.\n\n` +
          `Reply "it worked" or "no it didn't".`
        );
      }

      // CASE 2: Category insufficient & overall insufficient
      if (
        catRemaining !== null &&
        amount > catRemaining &&
        amount > remainingBudget
      ) {
        return (
          `No — you cannot spend ₹${amount}.\n` +
          `Your ${realCat} category has only ₹${catRemaining}, ` +
          `and your overall remaining budget is ₹${remainingBudget}.`
        );
      }

      // CASE 3: Category insufficient but overall can cover
      if (
        catRemaining !== null &&
        amount > catRemaining &&
        amount <= remainingBudget
      ) {
        return buildSmartAdvice(amount, realCat, catRemaining);
      }

      // CASE 4: Category has enough → RL advice
      const state = buildRlState({
        amountRequested: amount,
        categoryName: realCat,
      });
      const action = RLAgent.chooseAction(state);
      const advice = actionToAdvice(action, {
        amount,
        category: realCat,
        categoryRemaining: catRemaining,
      });

      RLAgent.saveLast(state, action);
      return advice + "\n\nReply 'it worked' or 'no it didn't'.";
    }

    // ---------------- SAVINGS IMPROVEMENT LOGIC ----------------
    if (
      msg.includes("improve my savings") ||
      msg.includes("save more") ||
      msg.includes("increase my savings") ||
      msg.includes("improve savings") ||
      msg.includes("how can i save")
    ) {
      const income = getMonthlyIncome();
      const expense = getMonthlyExpense();
      const savings = income - expense;

      const overspent = budgetCategories.filter(
        (c) => c.spentAmount > c.budget_limit
      );

      const underSpent = budgetCategories.filter(
        (c) => c.budget_limit - c.spentAmount > 0
      );

      let advice = `Here’s how you can improve your savings:\n\n`;

      advice += `• Your monthly income is ₹${income} and expenses are ₹${expense}, giving monthly savings of ₹${savings}.\n\n`;

      if (overspent.length > 0) {
        advice += `• You overspent in these categories:\n`;
        overspent.forEach((c) => {
          advice += `   - ${c.category}: overspent by ₹${c.spentAmount - c.budget_limit}\n`;
        });
        advice += `  Try reducing these next month.\n\n`;
      }

      if (underSpent.length > 0) {
        advice += `• You still have remaining limits in:\n`;
        underSpent.forEach((c) => {
          advice += `   - ${c.category}: ₹${c.budget_limit - c.spentAmount} remaining\n`;
        });
        advice += `  Try shifting this amount directly to savings.\n\n`;
      }

      advice += `• Avoid impulse purchases this month.\n`;
      advice += `• Set aside a fixed goal like ₹500–1500 per month.\n`;
      advice += `• Check your expenses weekly for better control.\n`;

      return advice;
    }

    // Fallbacks
    if (msg.includes("expense"))
      return `You have spent ₹${getMonthlyExpense().toFixed(2)} this month.`;
    if (msg.includes("income"))
      return `Your total income this month is ₹${getMonthlyIncome().toFixed(2)}.`;
    if (msg.includes("saving"))
      return `Your savings this month are ₹${(
        getMonthlyIncome() - getMonthlyExpense()
      ).toFixed(2)}.`;
    if (msg.includes("budget"))
      return `Your total budget is ₹${totalBudget}, spent ₹${totalSpent}, remaining ₹${remainingBudget}.`;

    return "Sorry, I didn't understand. Try asking: 'How should I spend 2000 on food?'";
  };

  return { processMessage };
}
