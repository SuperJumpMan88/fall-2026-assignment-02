import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetLimitStrategy } from '../src/strategies/BudgetLimitStrategy.js';
import { BudgetService } from '../src/services/BudgetService.js';
import { Transaction } from '../src/models.js';

describe('BudgetLimitStrategy (Feature 1)', () => {
  let strategy: BudgetLimitStrategy;

  beforeEach(() => {
    strategy = new BudgetLimitStrategy();
    vi.restoreAllMocks();
  });

  // Example of how to write and mock in your tests:
  //
  // it('should correctly identify categories that are over budget', async () => {
  //   // 1. Mock the BudgetService asynchronously
  //   const mockBudgets = { Food: 100, Rent: 1000 };
  //   const spy = vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(mockBudgets);
  //
  //   // 2. Set up test transactions
  //   const testTransactions: Transaction[] = [
  //     { id: '1', date: '2026-05-01', amount: -150.00, category: 'Food', description: 'Grocery', status: 'completed' }, // Over budget
  //     { id: '2', date: '2026-05-02', amount: -900.00, category: 'Rent', description: 'Apartment', status: 'completed' }, // Under budget
  //   ];
  //
  //   // 3. Execute
  //   const result = await strategy.execute(testTransactions);
  //
  //   // 4. Assert
  //   expect(spy).toHaveBeenCalled();
  //   expect(result).toContain('Food');
  //   expect(result).toContain('OVER BUDGET'); // or whatever formatting you choose
  //   expect(result).not.toContain('Rent over budget');
  // });

  it('should group expenses correctly by category and sum them', async () => {
  const mockBudgets = { Food: 200, Rent: 1000 };
  vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(mockBudgets);

  const tx: Transaction[] = [
    { id: '1', date: '2026-05-01', amount: -50, category: 'Food', description: 'Groceries', status: 'completed' },
    { id: '2', date: '2026-05-02', amount: -30, category: 'Food', description: 'Snacks', status: 'completed' },
    { id: '3', date: '2026-05-03', amount: -900, category: 'Rent', description: 'Apartment', status: 'completed' },
  ];

  const result = await strategy.execute(tx);

  expect(result).toContain('Food');
  expect(result).toContain('80'); // 50 + 30
  expect(result).toContain('Rent');
  expect(result).toContain('900');
});


it('should calculate absolute overage amounts and percentage exceeded', async () => {
  const mockBudgets = { Food: 100 };
  vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(mockBudgets);

  const tx: Transaction[] = [
    { id: '1', date: '2026-05-01', amount: -150, category: 'Food', description: 'Groceries', status: 'completed' },
  ];

  const result = await strategy.execute(tx);

  expect(result).toContain('Food');
  expect(result).toContain('150'); // total spent
  expect(result).toContain('OVER BUDGET');
  expect(result).toContain('50'); // overage amount
  expect(result).toMatch(/50%|50\.0%/); // percentage exceeded
});


it('should list the specific transactions contributing to categories that are over budget', async () => {
  const mockBudgets = { Entertainment: 50 };
  vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(mockBudgets);

  const tx: Transaction[] = [
    { id: '1', date: '2026-05-01', amount: -40, category: 'Entertainment', description: 'Movie', status: 'completed' },
    { id: '2', date: '2026-05-02', amount: -30, category: 'Entertainment', description: 'Games', status: 'completed' },
  ];

  const result = await strategy.execute(tx);

  expect(result).toContain('Entertainment');
  expect(result).toContain('OVER BUDGET');
  expect(result).toContain('Movie');
  expect(result).toContain('Games');
});


it('should handle scenarios where no categories are over budget', async () => {
  const mockBudgets = { Food: 200, Rent: 1500 };
  vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(mockBudgets);

  const tx: Transaction[] = [
    { id: '1', date: '2026-05-01', amount: -50, category: 'Food', description: 'Groceries', status: 'completed' },
    { id: '2', date: '2026-05-02', amount: -900, category: 'Rent', description: 'Apartment', status: 'completed' },
  ];

  const result = await strategy.execute(tx);

  expect(result).toContain('No categories are over budget');
});


it('should handle empty transaction list gracefully', async () => {
  const mockBudgets = { Food: 100 };
  vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(mockBudgets);

  const tx: Transaction[] = [];

  const result = await strategy.execute(tx);

  expect(result).toContain('No categories are over budget');
});
});