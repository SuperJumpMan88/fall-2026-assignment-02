import { Transaction } from '../models.js';
import { TaxConfigService } from '../services/TaxConfigService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class TaxDeductionStrategy implements AuditStrategy {
  public readonly name = 'Tax & Deductions Auditor';
  public readonly description =
    'Identifies eligible tax-deductible expenses and estimates savings';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {
    // TODO: Feature 4 - Implement this strategy.
    // 1. Call TaxConfigService.getTaxConfig() asynchronously.
    // 2. Filter expenses (amount < 0) that belong to eligible tax-deductible categories.
    // 3. Sum total deductible expenses.
    // 4. Estimate tax savings based on the standard tax rate: total deductible * taxRate.
    // 5. Estimate sales tax/VAT paid on NON-deductible expenses using standard tax rate.
    // 6. Format and return a text-based audit report detailing total deductions, savings, VAT estimates, and eligible transactions.
    const config = await TaxConfigService.getTaxConfig();
    const taxRate = config.standardTaxRate;

    const expenses = transactions.filter((transaction) => transaction.amount < 0);

    const deductibleExpenses = expenses.filter((transactions) => config.deductibleCategories.includes(transactions.category));
    const nonDeductibleExpenses = expenses.filter((transactions) => !config.deductibleCategories.includes(transactions.category))

    const totalDeductions = deductibleExpenses.reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
    const totalNonDeductions = nonDeductibleExpenses.reduce((total, transactions) => total + Math.abs(transactions.amount), 0);

    const estimatedTaxSavings = totalDeductions * taxRate;
    const estimatedVAT = totalNonDeductions * taxRate;

    let eligibleTransactions = 'None';

    if (deductibleExpenses.length > 0) {
      eligibleTransactions = deductibleExpenses
        .map((transaction) => {
          const amount = Math.abs(transaction.amount).toFixed(2);

          return `${transaction.date} | ${transaction.category} | ${transaction.description} | $${amount}`;
        })
        .join('\n');
    }

    return (
      `TAX & DEDUCTIONS AUDIT REPORT\n` +
      `Total Deductions: $${totalDeductions.toFixed(2)}\n` +
      `Estimated Tax Savings: $${estimatedTaxSavings.toFixed(2)}\n` +
      `Estimated Sales Tax/VAT: $${estimatedVAT.toFixed(2)}\n` +
      `\nEligible Deductible Transactions:\n` +
      `${eligibleTransactions}`
    );
  }
}
