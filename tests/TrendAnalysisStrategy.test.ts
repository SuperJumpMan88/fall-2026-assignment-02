import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Transaction } from '../src/models.js';
import { HistoricalDataService } from '../src/services/HistoricalDataService.js';
import { TrendAnalysisStrategy } from '../src/strategies/TrendAnalysisStrategy.js';

describe('TrendAnalysisStrategy (Feature 3)', () => {
  let strategy: TrendAnalysisStrategy;

  beforeEach(() => {
    vi.restoreAllMocks();
    strategy = new TrendAnalysisStrategy();
  });

  it('should group current expenses by category and compute accurate totals', async () => {
    const serviceSpy = vi
      .spyOn(HistoricalDataService, 'getHistoricalAverages')
      .mockResolvedValue({
        Food: 200,
        Rent: 1000,
      });

    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -75,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -50,
        category: 'Food',
        description: 'Restaurant',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -1000,
        category: 'Rent',
        description: 'Monthly rent',
        status: 'completed',
      },
      {
        id: '4',
        date: '2026-05-04',
        amount: 500,
        category: 'Income',
        description: 'Paycheck',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(serviceSpy).toHaveBeenCalledOnce();
    expect(result).toContain('Food: Current $125.00');
    expect(result).toContain('Rent: Current $1000.00');
    expect(result).not.toContain('Income: Current');
  });

  it('should calculate variance percentages correctly', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({
      Food: 200,
      Rent: 1000,
    });

    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -250,
        category: 'Food',
        description: 'Food expenses',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -800,
        category: 'Rent',
        description: 'Rent expense',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(result).toContain('Food');
    expect(result).toContain('+25.00%');
    expect(result).toContain('Rent');
    expect(result).toContain('-20.00%');
  });

  it('should highlight positive and negative variances exceeding 20 percent', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({
      Food: 200,
      Entertainment: 200,
      Rent: 1000,
    });

    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -250,
        category: 'Food',
        description: 'Food expense',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -100,
        category: 'Entertainment',
        description: 'Entertainment expense',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -800,
        category: 'Rent',
        description: 'Rent expense',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);
    const growthSection = result.split('Significant Growth Categories')[1];
    const savingsSection = result.split('Significant Savings Categories')[1];

    expect(growthSection).toContain('Food: +25.00%');
    expect(savingsSection).toContain('Entertainment: -50.00%');

    // Exactly -20% does not exceed the threshold.
    expect(savingsSection).not.toContain('Rent');
  });

  it('should handle a current category with no historical benchmark', async () => {
    vi.spyOn(HistoricalDataService, 'getHistoricalAverages').mockResolvedValue({
      Food: 200,
    });

    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -50,
        category: 'Pet Care',
        description: 'Dog food',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(transactions);

    expect(result).toContain('Pet Care: Current $50.00');
    expect(result).toContain('Historical N/A');
    expect(result).toContain('Change N/A');
  });

  it('should return a readable report when there are no transactions', async () => {
    const serviceSpy = vi
      .spyOn(HistoricalDataService, 'getHistoricalAverages')
      .mockResolvedValue({
        Food: 200,
      });

    const result = await strategy.execute([]);

    expect(serviceSpy).toHaveBeenCalledOnce();
    expect(result).toContain('Historical Trend Audit Report');
    expect(result).toContain('Current Spending vs. Historical Averages');
    expect(result).toContain('No current expenses to analyze.');
    expect(result).toContain('No significant growth categories.');
    expect(result).toContain('No significant savings categories.');
  });
});
