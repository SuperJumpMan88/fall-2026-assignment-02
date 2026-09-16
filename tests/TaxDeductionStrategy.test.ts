import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaxDeductionStrategy } from '../src/strategies/TaxDeductionStrategy.js';
import { TaxConfigService } from '../src/services/TaxConfigService.js';
import { Transaction } from '../src/models.js';

function transaction(
  id: string,
  category: string,
  amount: number,
): Transaction {
  return {
    id,
    date: '2026-05-01',
    amount,
    category,
    description: `Transaction ${id}`,
    status: 'completed',
  };
}

describe('TaxDeductionStrategy (Feature 4)', () => {
  let strategy: TaxDeductionStrategy;

  beforeEach(() => {
    strategy = new TaxDeductionStrategy();
    vi.spyOn(TaxConfigService, 'getTaxConfig').mockResolvedValue({
      standardTaxRate: 0.1,
      deductibleCategories: ['Charity', 'Medical'],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch config and report deduction totals, savings, VAT, and itemized expenses', async () => {
    const transactions: Transaction[] = [
      transaction('donation', 'Charity', -200),
      transaction('appointment', 'Medical', -75),
      transaction('second-donation', 'Charity', -25),
      transaction('groceries', 'Food', -120),
      transaction('rent', 'Rent', -500),
    ];

    const result = await strategy.execute(transactions);

    expect(TaxConfigService.getTaxConfig).toHaveBeenCalledTimes(1);
    expect(TaxConfigService.getTaxConfig).toHaveBeenCalledWith();
    expect(result).toContain('TAX & DEDUCTIONS AUDIT REPORT');
    expect(result).toContain('Total Deductions: $300.00');
    expect(result).toContain('Estimated Tax Savings: $30.00');
    expect(result).toContain('Estimated Sales Tax/VAT: $62.00');
    expect(result).toContain('Eligible Deductible Transactions:');
    expect(result).toContain(
      '2026-05-01 | Charity | Transaction donation | $200.00',
    );
    expect(result).toContain(
      '2026-05-01 | Medical | Transaction appointment | $75.00',
    );
    expect(result).toContain(
      '2026-05-01 | Charity | Transaction second-donation | $25.00',
    );
    expect(result).not.toContain('Transaction groceries');
    expect(result).not.toContain('Transaction rent');
  });

  it('should use the deductible categories supplied by the service', async () => {
    vi.mocked(TaxConfigService.getTaxConfig).mockResolvedValue({
      standardTaxRate: 0.1,
      deductibleCategories: ['Education'],
    });

    const result = await strategy.execute([
      transaction('tuition', 'Education', -400),
      transaction('donation', 'Charity', -100),
    ]);

    expect(result).toContain('Total Deductions: $400.00');
    expect(result).toContain('Estimated Tax Savings: $40.00');
    expect(result).toContain('Estimated Sales Tax/VAT: $10.00');
    expect(result).toContain('Transaction tuition');
    expect(result).not.toContain('Transaction donation');
  });

  it('should exclude income and zero amounts from deductions, VAT, and itemization', async () => {
    const result = await strategy.execute([
      transaction('donation', 'Charity', -100),
      transaction('groceries', 'Food', -50),
      transaction('refund', 'Charity', 200),
      transaction('salary', 'Salary', 1000),
      transaction('eligible-zero', 'Medical', 0),
      transaction('regular-zero', 'Food', 0),
    ]);

    expect(result).toContain('Total Deductions: $100.00');
    expect(result).toContain('Estimated Tax Savings: $10.00');
    expect(result).toContain('Estimated Sales Tax/VAT: $5.00');
    for (const id of ['refund', 'salary', 'eligible-zero', 'regular-zero']) {
      expect(result).not.toContain(`Transaction ${id}`);
    }
  });

  it.each([0, 0.075, 0.25])(
    'should apply a configured tax rate of %s and format money to two decimal places',
    async (standardTaxRate) => {
      vi.mocked(TaxConfigService.getTaxConfig).mockResolvedValue({
        standardTaxRate,
        deductibleCategories: ['Charity'],
      });

      const result = await strategy.execute([
        transaction('donation', 'Charity', -123.45),
        transaction('groceries', 'Food', -67.89),
      ]);

      const expectedAmounts = {
        0: ['0.00', '0.00'],
        0.075: ['9.26', '5.09'],
        0.25: ['30.86', '16.97'],
      }[standardTaxRate]!;
      expect(result).toContain('Total Deductions: $123.45');
      expect(result).toContain(`Estimated Tax Savings: $${expectedAmounts[0]}`);
      expect(result).toContain(
        `Estimated Sales Tax/VAT: $${expectedAmounts[1]}`,
      );
    },
  );

  it.each([
    { scenario: 'an empty transaction list', transactions: [] },
    {
      scenario: 'only income and zero amounts',
      transactions: [
        transaction('refund', 'Charity', 200),
        transaction('salary', 'Salary', 1000),
        transaction('zero', 'Medical', 0),
      ],
    },
  ])('should report zero totals for $scenario', async ({ transactions }) => {
    const result = await strategy.execute(transactions);

    expect(result).toContain('Total Deductions: $0.00');
    expect(result).toContain('Estimated Tax Savings: $0.00');
    expect(result).toContain('Estimated Sales Tax/VAT: $0.00');
    expect(result).toContain('Eligible Deductible Transactions:\nNone');
  });

  it('should report VAT when no expenses qualify for deductions', async () => {
    const result = await strategy.execute([
      transaction('groceries', 'Food', -80),
      transaction('rent', 'Rent', -120),
    ]);

    expect(result).toContain('Total Deductions: $0.00');
    expect(result).toContain('Estimated Tax Savings: $0.00');
    expect(result).toContain('Estimated Sales Tax/VAT: $20.00');
    expect(result).toContain('Eligible Deductible Transactions:\nNone');
  });

  it('should treat all expenses as non-deductible when no categories are configured', async () => {
    vi.mocked(TaxConfigService.getTaxConfig).mockResolvedValue({
      standardTaxRate: 0.1,
      deductibleCategories: [],
    });

    const result = await strategy.execute([
      transaction('donation', 'Charity', -200),
      transaction('appointment', 'Medical', -50),
    ]);

    expect(result).toContain('Total Deductions: $0.00');
    expect(result).toContain('Estimated Tax Savings: $0.00');
    expect(result).toContain('Estimated Sales Tax/VAT: $25.00');
    expect(result).toContain('Eligible Deductible Transactions:\nNone');
  });

  it('should report zero VAT when every expense is deductible', async () => {
    const result = await strategy.execute([
      transaction('donation', 'Charity', -100.25),
      transaction('appointment', 'Medical', -49.75),
    ]);

    expect(result).toContain('Total Deductions: $150.00');
    expect(result).toContain('Estimated Tax Savings: $15.00');
    expect(result).toContain('Estimated Sales Tax/VAT: $0.00');
  });

  it('should propagate a failure to fetch the tax configuration', async () => {
    const error = new Error('Tax configuration unavailable');
    vi.mocked(TaxConfigService.getTaxConfig).mockRejectedValue(error);

    await expect(
      strategy.execute([transaction('donation', 'Charity', -100)]),
    ).rejects.toBe(error);
  });
});
