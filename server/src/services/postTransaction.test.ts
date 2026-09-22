import { describe, it, expect } from 'vitest';
import { computeLedgerOps, Posting } from './postTransaction.js';

// Test accounts: a bank (SBI), cash, and a credit card (HDFC).
const SBI = 'sbi', CASH = 'cash', HDFC = 'hdfc', KOTAK = 'kotak';
const isCreditCard = (id?: string) => id === HDFC;

// Simulate applying ops to running balances so we can assert net effects.
type Balances = Record<string, { balance: number; outstanding: number }>;
function apply(balances: Balances, p: Posting) {
  const ops = computeLedgerOps(p, isCreditCard);
  for (const op of ops) {
    balances[op.accountId] ??= { balance: 0, outstanding: 0 };
    if (op.balanceDelta !== undefined) balances[op.accountId].balance += op.balanceDelta;
    if (op.outstandingDelta !== undefined) balances[op.accountId].outstanding += op.outstandingDelta;
  }
}

describe('computeLedgerOps — per type', () => {
  it('UPI payment debits the source bank account', () => {
    expect(computeLedgerOps({ type: 'UPI_PAYMENT', amountMinor: 200000, sourceAccountId: SBI }, isCreditCard))
      .toEqual([{ accountId: SBI, balanceDelta: -200000 }]);
  });
  it('debit card payment debits the source bank account', () => {
    expect(computeLedgerOps({ type: 'DEBIT_CARD_PAYMENT', amountMinor: 200000, sourceAccountId: SBI }, isCreditCard))
      .toEqual([{ accountId: SBI, balanceDelta: -200000 }]);
  });
  it('cash expense debits the cash account', () => {
    expect(computeLedgerOps({ type: 'CASH_EXPENSE', amountMinor: 100000, sourceAccountId: CASH }, isCreditCard))
      .toEqual([{ accountId: CASH, balanceDelta: -100000 }]);
  });
  it('credit card purchase increases outstanding only (no bank debit)', () => {
    expect(computeLedgerOps({ type: 'CREDIT_CARD_PURCHASE', amountMinor: 400000, sourceAccountId: HDFC }, isCreditCard))
      .toEqual([{ accountId: HDFC, outstandingDelta: 400000 }]);
  });
  it('income credits the account', () => {
    expect(computeLedgerOps({ type: 'INCOME', amountMinor: 500000, sourceAccountId: SBI }, isCreditCard))
      .toEqual([{ accountId: SBI, balanceDelta: 500000 }]);
  });
  it('cash withdrawal moves bank -> cash (no expense)', () => {
    expect(computeLedgerOps({ type: 'CASH_WITHDRAWAL', amountMinor: 500000, sourceAccountId: SBI, destinationAccountId: CASH }, isCreditCard))
      .toEqual([{ accountId: SBI, balanceDelta: -500000 }, { accountId: CASH, balanceDelta: 500000 }]);
  });
  it('transfer moves bank -> bank (no expense)', () => {
    expect(computeLedgerOps({ type: 'TRANSFER', amountMinor: 1000000, sourceAccountId: SBI, destinationAccountId: KOTAK }, isCreditCard))
      .toEqual([{ accountId: SBI, balanceDelta: -1000000 }, { accountId: KOTAK, balanceDelta: 1000000 }]);
  });
  it('credit card payment debits bank and reduces outstanding', () => {
    expect(computeLedgerOps({ type: 'CREDIT_CARD_PAYMENT', amountMinor: 400000, sourceAccountId: SBI, destinationAccountId: HDFC }, isCreditCard))
      .toEqual([{ accountId: SBI, balanceDelta: -400000 }, { accountId: HDFC, outstandingDelta: -400000 }]);
  });
  it('credit card payment rejects a non-card destination', () => {
    expect(() => computeLedgerOps({ type: 'CREDIT_CARD_PAYMENT', amountMinor: 400000, sourceAccountId: SBI, destinationAccountId: KOTAK }, isCreditCard))
      .toThrow(/must be a credit card/);
  });
  it('refund to a bank account credits it', () => {
    expect(computeLedgerOps({ type: 'REFUND', amountMinor: 50000, sourceAccountId: SBI }, isCreditCard))
      .toEqual([{ accountId: SBI, balanceDelta: 50000 }]);
  });
  it('refund to a credit card reduces outstanding', () => {
    expect(computeLedgerOps({ type: 'REFUND', amountMinor: 200000, sourceAccountId: HDFC }, isCreditCard))
      .toEqual([{ accountId: HDFC, outstandingDelta: -200000 }]);
  });
  it('rejects non-positive or non-integer amounts', () => {
    expect(() => computeLedgerOps({ type: 'EXPENSE', amountMinor: 0, sourceAccountId: SBI }, isCreditCard)).toThrow();
    expect(() => computeLedgerOps({ type: 'EXPENSE', amountMinor: 10.5, sourceAccountId: SBI }, isCreditCard)).toThrow();
  });
});

describe('spec #89 full scenario — ₹7,000 actual spend, not ₹11,000', () => {
  it('produces correct balances and total actual expenses', () => {
    // Opening: Mom SBI ₹50,000; Mom Cash ₹0; Sister HDFC outstanding ₹10,000.
    const b: Balances = { [SBI]: { balance: 5000000, outstanding: 0 }, [CASH]: { balance: 0, outstanding: 0 }, [HDFC]: { balance: 0, outstanding: 1000000 } };

    const steps: { p: Posting; actualExpenseMinor: number }[] = [
      { p: { type: 'UPI_PAYMENT', amountMinor: 200000, sourceAccountId: SBI }, actualExpenseMinor: 200000 },              // 1. ₹2,000 UPI
      { p: { type: 'CASH_WITHDRAWAL', amountMinor: 500000, sourceAccountId: SBI, destinationAccountId: CASH }, actualExpenseMinor: 0 }, // 2. ₹5,000 withdrawal
      { p: { type: 'CASH_EXPENSE', amountMinor: 100000, sourceAccountId: CASH }, actualExpenseMinor: 100000 },            // 3. ₹1,000 cash
      { p: { type: 'CREDIT_CARD_PURCHASE', amountMinor: 400000, sourceAccountId: HDFC }, actualExpenseMinor: 400000 },    // 4. ₹4,000 on HDFC
      { p: { type: 'CREDIT_CARD_PAYMENT', amountMinor: 400000, sourceAccountId: SBI, destinationAccountId: HDFC }, actualExpenseMinor: 0 } // 5. ₹4,000 bill payment
    ];

    let totalActual = 0;
    for (const s of steps) { apply(b, s.p); totalActual += s.actualExpenseMinor; }

    // Final balances
    expect(b[SBI].balance).toBe(3900000);  // ₹39,000
    expect(b[CASH].balance).toBe(400000);  // ₹4,000
    expect(b[HDFC].outstanding).toBe(1000000); // back to ₹10,000

    // The headline number: actual spend is ₹7,000, not ₹11,000.
    expect(totalActual).toBe(700000);
  });
});
