// Generate CSV for monthly transactions
export const generateMonthlyCSV = (data) => {
  const { transactions, budgets, totalIncome, totalExpenses, netSavings } = data;
  
  const rows = [];
  
  // Header
  rows.push('Money Mind - Monthly Financial Report');
  rows.push(`Generated on: ${new Date().toLocaleDateString('en-IN')}`);
  rows.push('');
  
  // Summary
  rows.push('SUMMARY');
  rows.push('Metric,Amount (₹)');
  rows.push(`Total Income,${totalIncome.toFixed(2)}`);
  rows.push(`Total Expenses,${totalExpenses.toFixed(2)}`);
  rows.push(`Net Savings,${netSavings.toFixed(2)}`);
  rows.push(`Savings Rate,${totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(2) : 0}%`);
  rows.push('');
  
  // Budget Performance
  if (budgets && budgets.length > 0) {
    rows.push('BUDGET PERFORMANCE');
    rows.push('Category,Budget Limit (₹),Amount Spent (₹),Usage (%)');
    budgets.forEach(budget => {
      rows.push(`${budget.category},${budget.limit.toFixed(2)},${budget.spent.toFixed(2)},${budget.percentage.toFixed(2)}`);
    });
    rows.push('');
  }
  
  // Transactions
  rows.push('TRANSACTIONS');
  rows.push('Date,Type,Category,Description,Amount (₹),Payment Method');
  
  transactions.forEach(transaction => {
    const date = new Date(transaction.date).toLocaleDateString('en-IN');
    const type = transaction.type || '';
    const category = transaction.category || 'Other';
    const description = (transaction.description || '').replace(/,/g, ';'); // Replace commas to avoid CSV issues
    const amount = parseFloat(transaction.amount || 0).toFixed(2);
    const paymentMethod = transaction.payment_method || 'N/A';
    
    rows.push(`${date},${type},${category},${description},${amount},${paymentMethod}`);
  });
  
  return rows.join('\n');
};

