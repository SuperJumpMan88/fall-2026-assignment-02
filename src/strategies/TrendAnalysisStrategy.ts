import { Transaction } from '../models.js';
import { HistoricalDataService } from '../services/HistoricalDataService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class TrendAnalysisStrategy implements AuditStrategy {
  public readonly name = 'Historical Trend Auditor';
  public readonly description =
    'Compares current monthly category spending against historical averages';

  public async execute(transactions: Transaction[]): Promise<string> {
    const historicalAverages =
      await HistoricalDataService.getHistoricalAverages();

    const currentSpending: Record<string, number> = {};

    // Include only expenses and total their absolute values by category.
    for (const transaction of transactions) {
      if (transaction.amount < 0) {
        const expenseAmount = Math.abs(transaction.amount);

        currentSpending[transaction.category] =
          (currentSpending[transaction.category] ?? 0) + expenseAmount;
      }
    }

    const comparisonLines: string[] = [];
    const growthCategories: string[] = [];
    const savingsCategories: string[] = [];

    for (const [category, currentTotal] of Object.entries(currentSpending)) {
      const historicalAverage = historicalAverages[category];

      // A variance cannot be calculated without a valid historical benchmark.
      if (historicalAverage === undefined || historicalAverage === 0) {
        comparisonLines.push(
          `${category}: Current $${currentTotal.toFixed(
            2,
          )} | Historical N/A | Change N/A`,
        );
        continue;
      }

      const variance =
        ((currentTotal - historicalAverage) / historicalAverage) * 100;

      const formattedVariance =
        variance > 0 ? `+${variance.toFixed(2)}%` : `${variance.toFixed(2)}%`;

      comparisonLines.push(
        `${category}: Current $${currentTotal.toFixed(
          2,
        )} | Historical $${historicalAverage.toFixed(
          2,
        )} | Change ${formattedVariance}`,
      );

      if (variance > 20) {
        growthCategories.push(`${category}: ${formattedVariance}`);
      } else if (variance < -20) {
        savingsCategories.push(`${category}: ${formattedVariance}`);
      }
    }

    const comparisons =
      comparisonLines.length > 0
        ? comparisonLines.join('\n')
        : 'No current expenses to analyze.';

    const growthReport =
      growthCategories.length > 0
        ? growthCategories.join('\n')
        : 'No significant growth categories.';

    const savingsReport =
      savingsCategories.length > 0
        ? savingsCategories.join('\n')
        : 'No significant savings categories.';

    return [
      'Historical Trend Audit Report',
      '=============================',
      '',
      'Current Spending vs. Historical Averages',
      comparisons,
      '',
      'Significant Growth Categories',
      growthReport,
      '',
      'Significant Savings Categories',
      savingsReport,
    ].join('\n');
  }
}
