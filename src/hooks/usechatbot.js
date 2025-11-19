// src/hooks/useChatbot.js
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

  const detectCategoryFromText = (text) => {
    const lower = (text || "").toLowerCase();
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

  // ------------------ Financial calculations ------------------
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

  // ---------------- RL STATE BUILD ----------------
  const buildRlState = ({ amountRequested, categoryName }) => {
    const income = getMonthlyIncome();
    const expense = getMonthlyExpense();
    const catRemaining = categoryName
      ? getCategoryRemaining(categoryName)
      : null;

    return {
      monthly_income: income,
      monthly_expense: expense,
      savings: income - expense,
      category_remaining: catRemaining,
      total_remaining: remainingBudget,
      request_amount: Number(amountRequested),
    };
  };

  // ---------------- SMART SUGGESTIONS ----------------
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

  // ---------------- FIXED actionToAdvice (Corrected buy_now) ----------------
  const actionToAdvice = (action, { amount, category, categoryRemaining, overallRemaining }) => {
    const catRem = Number(categoryRemaining);

    if (action === "buy_now") {
      if (catRem < 0 || catRem < amount) {
        return `Buy it using your overall remaining budget (your ${category} budget cannot cover this).`;
      }
      return `Your ${category} budget has enough. You can buy it safely.`;
    }

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
    ["it worked", "yes it worked", "worked"].some((x) => t.includes(x));

  const detectNegativeFeedback = (t) =>
    ["didn't work", "did not work", "no it didn't", "not helpful"].some((x) =>
      t.includes(x)
    );

  // ---------------- MAIN CHATBOT LOGIC ----------------
  const processMessage = (raw) => {
    if (!raw) return "";
    const msg = raw.toLowerCase();

    // FEEDBACK
    if (detectPositiveFeedback(msg) || detectNegativeFeedback(msg)) {
      const last = RLAgent.getLast();
      if (!last)
        return "No previous suggestion to record feedback for.";

      const reward = detectPositiveFeedback(msg) ? 1 : -1;
      RLAgent.update(last.stateObj, last.action, reward);

      return detectPositiveFeedback(msg)
        ? "Great — I'll keep giving similar suggestions!"
        : "Got it — I will avoid similar suggestions next time.";
    }

    // Greetings
    if (["hi", "hello", "hey"].includes(msg)) {
      return "Hello! Try: 'How should I spend 2000 on food?' or 'Can I spend 2000 on shoes?'.";
    }

    // Weekly
    if (msg.includes("weekly expense"))
      return `You have spent ₹${getWeeklyExpense().toFixed(2)} this week.`;

    // Multi-intent
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

    // Category spent on
    const detectedCat = detectCategoryFromText(msg);
    if (detectedCat && msg.includes("spent")) {
      const amt = getCategoryExpense(detectedCat);
      return amt
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
      const catRemain = getCategoryRemaining(detected);

      if (catRemain !== null) {
        if (amount > catRemain)
          return `No, you cannot buy it from ${detected}. Only ₹${catRemain.toFixed(
            2
          )} left in ${detected}.`;
        return `Yes, you can buy it from ${detected}. You have ₹${catRemain.toFixed(
          2
        )} left.`;
      }

      if (amount > remainingBudget)
        return `No — you only have ₹${remainingBudget.toFixed(
          2
        )} remaining overall.`;

      return `Yes — your overall budget can cover it.`;
    }

    // CAN I SPEND X ON Y?
    const buy2 = msg.match(/can i spend (\d+)\s+on\s+([a-zA-Z\s]+)/);
    if (buy2) {
      const amount = Number(buy2[1]);
      const catRaw = buy2[2].trim();
      const detected = detectCategoryFromText(catRaw);
      const catRemain = getCategoryRemaining(detected);

      if (catRemain !== null) {
        if (amount > catRemain)
          return `No, you cannot spend it. Only ₹${catRemain.toFixed(
            2
          )} left in ${detected}.`;
        return `Yes, you can spend it — ₹${catRemain.toFixed(
          2
        )} left in ${detected}.`;
      }

      if (amount > remainingBudget)
        return `No — only ₹${remainingBudget.toFixed(
          2
        )} remaining overall.`;

      return `Yes — your overall budget can cover ₹${amount}.`;
    }

    // HOW SHOULD I / HOW CAN I
    const howMatch = msg.match(/(how should i|how can i) (spend|buy|purchase)/);
    if (howMatch) {
      const amountMatch = msg.match(/(\d{1,9})/);
      if (!amountMatch) return "How much do you want to spend?";

      const amount = Number(amountMatch[1]);
      const catDetected = detectCategoryFromText(msg);
      const realCat = catDetected || "this category";
      const catRemain = getCategoryRemaining(realCat);
      const overallRemain = remainingBudget;
      const savings = getMonthlyIncome() - getMonthlyExpense();

      // Category over budget
      if (catRemain !== null && catRemain < 0) {
        if (amount > overallRemain)
          return `No — your ${realCat} category is over budget and you have only ₹${overallRemain} left overall.`;

        if (amount > savings)
          return `No — your ${realCat} category is over budget and your savings are only ₹${savings}.`;

        // RL recommendation
        const state = buildRlState({
          amountRequested: amount,
          categoryName: realCat,
        });
        const { action, ranking } = RLAgent.chooseAction(state);

        const recommended = actionToAdvice(action, {
          amount,
          category: realCat,
          categoryRemaining: catRemain,
          overallRemaining: overallRemain,
        });

        const alternatives = ranking
          .filter((r) => r.action !== action)
          .slice(0, 2)
          .map((r) =>
            actionToAdvice(r.action, {
              amount,
              category: realCat,
              categoryRemaining: catRemain,
              overallRemaining: overallRemain,
            })
          );

        RLAgent.saveLast(null, action, state);

        let out = `Your ${realCat} category is over budget, but your overall budget can cover it.\n\n`;
        out += `1) Recommended → ${recommended}\n\n`;
        if (alternatives.length) {
          out += `Other options:\n`;
          alternatives.forEach(
            (alt, idx) => (out += `${idx + 2}) ${alt}\n`)
          );
          out += `\n`;
        }
        out += `Reply "it worked" or "no it didn't".`;
        return out;
      }

      // Category insufficient AND overall insufficient
      if (
        catRemain !== null &&
        amount > catRemain &&
        amount > overallRemain
      ) {
        return `No — you cannot spend ₹${amount}.\nYour ${realCat} category has only ₹${catRemain}, and overall remaining is ₹${overallRemain}.`;
      }

      // Category insufficient BUT overall can cover
      if (
        catRemain !== null &&
        amount > catRemain &&
        amount <= overallRemain
      ) {
        const state = buildRlState({
          amountRequested: amount,
          categoryName: realCat,
        });

        const { action, ranking } = RLAgent.chooseAction(state);

        const recommended = actionToAdvice(action, {
          amount,
          category: realCat,
          categoryRemaining: catRemain,
          overallRemaining: overallRemain,
        });

        const alternatives = ranking
          .filter((r) => r.action !== action)
          .slice(0, 2)
          .map((r) =>
            actionToAdvice(r.action, {
              amount,
              category: realCat,
              categoryRemaining: catRemain,
              overallRemaining: overallRemain,
            })
          );

        RLAgent.saveLast(null, action, state);

        let out = `You don't have enough in ${realCat} but your overall budget can cover it.\n\n`;
        out += `1) Recommended → ${recommended}\n\n`;
        if (alternatives.length) {
          out += `Other options:\n`;
          alternatives.forEach(
            (alt, idx) => (out += `${idx + 2}) ${alt}\n`)
          );
          out += `\n`;
        }
        out += `Reply "it worked" or "no it didn't".`;
        return out;
      }

      // Category has enough → use RL normally
      const state = buildRlState({
        amountRequested: amount,
        categoryName: realCat,
      });

      const { action, ranking } = RLAgent.chooseAction(state);

      const recommended = actionToAdvice(action, {
        amount,
        category: realCat,
        categoryRemaining: catRemain,
        overallRemaining: overallRemain,
      });

      const alternatives = ranking
        .filter((r) => r.action !== action)
        .slice(0, 2)
        .map((r) =>
          actionToAdvice(r.action, {
            amount,
            category: realCat,
            categoryRemaining: catRemain,
            overallRemaining: overallRemain,
          })
        );

      RLAgent.saveLast(null, action, state);

      let out = `Recommended → ${recommended}\n\n`;
      if (alternatives.length) {
        out += `Other options:\n`;
        alternatives.forEach((alt, idx) => (out += `${idx + 2}) ${alt}\n`));
        out += `\n`;
      }
      out += `Reply "it worked" or "no it didn't".`;
      return out;
    }

    // Savings
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

      let adv = `Here’s how you can improve your savings:\n\n`;
      adv += `• Income: ₹${income}, Expense: ₹${expense}, Savings: ₹${savings}\n\n`;

      if (overspent.length > 0) {
        adv += `• You overspent in:\n`;
        overspent.forEach(
          (c) =>
            (adv += `   - ${c.category}: overspent by ₹${
              c.spentAmount - c.budget_limit
            }\n`)
        );
        adv += `  Reduce these next month.\n\n`;
      }

      if (underSpent.length > 0) {
        adv += `• You still have remaining budget in:\n`;
        underSpent.forEach(
          (c) =>
            (adv += `   - ${c.category}: ₹${
              c.budget_limit - c.spentAmount
            } remaining\n`)
        );
        adv += `  Shift this to savings.\n\n`;
      }

      adv += `• Avoid impulse spending.\n• Target ₹500–1500 monthly savings.\n• Review weekly.\n`;

      return adv;
    }

    // Fallbacks
    if (msg.includes("expense"))
      return `You spent ₹${getMonthlyExpense().toFixed(2)} this month.`;
    if (msg.includes("income"))
      return `Your income this month is ₹${getMonthlyIncome().toFixed(2)}.`;
    if (msg.includes("saving"))
      return `Savings: ₹${(
        getMonthlyIncome() - getMonthlyExpense()
      ).toFixed(2)}`;
    if (msg.includes("budget"))
      return `Total budget: ₹${totalBudget}, spent: ₹${totalSpent}, remaining: ₹${remainingBudget}.`;

    return "Sorry, I didn't understand. Try: 'Can I spend 2000 on food?' or 'How should I spend 2000 on shoes?'.";
  };

  return { processMessage };
}