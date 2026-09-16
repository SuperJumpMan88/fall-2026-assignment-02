import { Transaction } from '../models.js';
import { BudgetService } from '../services/BudgetService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class BudgetLimitStrategy implements AuditStrategy {
  public readonly name = 'Budget Limit Auditor';
  public readonly description =
    'Checks category spending against monthly budget limits';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {
    // TODO: Feature 1 - Implement this strategy.
    // 1. Call BudgetService.getCategoryBudgets() asynchronously.
    // 2. Group expenses (amounts < 0) by category and compute total spending for each category.
    // 3. Compare spending against the fetched limits.
    // 4. Identify overages (categories where spending exceeds the budget).
    // 5. Format and return a text-based audit report outlining limits, actuals, overage amounts, percentages, and lists of transactions causing the overage.

    // 1. Fetch budgets
const budgets = await BudgetService.getCategoryBudgets();

// 2. Filter only expenses (negative amounts)
const expenses = transactions.filter(t => t.amount < 0);

if (expenses.length === 0) {
  return 'No categories are over budget';
}


// 3. Group expenses by category
const grouped: Record<string, Transaction[]> = {};
for (const tx of expenses) {
  if (!grouped[tx.category]) grouped[tx.category] = [];
  grouped[tx.category].push(tx);
}

let report = '';
let anyOverBudget = false;

// 4. Compare totals vs budgets
for (const category of Object.keys(grouped)) {
  const totalSpent = grouped[category].reduce(
    (sum, tx) => sum + Math.abs(tx.amount),
    0
  );

  const budget = budgets[category] ?? 0;

  report += `\nCategory: ${category}\nTotal Spent: ${totalSpent}\nBudget: ${budget}\n`;

  if (totalSpent > budget) {
    anyOverBudget = true;

    const overage = totalSpent - budget;
    const percent = ((overage / budget) * 100).toFixed(0);

    report += `Status: OVER BUDGET by ${overage} (${percent}%)\nTransactions:\n`;

    for (const tx of grouped[category]) {
      report += ` - ${tx.description} (${Math.abs(tx.amount)})\n`;
    }
  } else {
    report += `Status: Within Budget\n`;
  }
}

// 5. Final result
if (!anyOverBudget) {
  report += `\nNo categories are over budget`;
}

return report.trim();
  }
}