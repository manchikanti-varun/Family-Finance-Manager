// Shared types and money/format helpers. All money is integer paise on the wire.
export type ID = string;

export type Person = { _id: ID; name: string; email?: string; isActive: boolean };
export type AccountType = 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH' | 'WALLET';
export type Account = {
  _id: ID; ownerPersonId: ID; accountName: string; accountType: AccountType; bankName?: string;
  currentBalanceMinor: number; openingBalanceMinor: number; last4Digits?: string;
  creditLimitMinor?: number; currentOutstandingMinor?: number; availableCreditMinor?: number;
  linkedBankAccountId?: ID; status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
};
export type TxType = 'EXPENSE'|'INCOME'|'TRANSFER'|'UPI_PAYMENT'|'DEBIT_CARD_PAYMENT'|'CREDIT_CARD_PURCHASE'|'CREDIT_CARD_PAYMENT'|'CASH_WITHDRAWAL'|'CASH_EXPENSE'|'REFUND'|'REVERSAL'|'ADJUSTMENT'|'FEE'|'INTEREST'|'CASHBACK';
export type PaymentMethod = 'CASH'|'DEBIT_CARD'|'CREDIT_CARD'|'UPI'|'BANK_TRANSFER'|'WALLET'|'OTHER';
export type Transaction = {
  _id: ID; workspaceId: ID; eventId?: ID | null; type: TxType; amountMinor: number; currency: string;
  transactionDate: string; transactionTime?: string; spentById?: ID; accountOwnerId?: ID;
  sourceAccountId?: ID; destinationAccountId?: ID; paymentMethod: PaymentMethod; upiApp?: string;
  categoryId?: ID; merchant?: string; description?: string; notes?: string; status: string; createdAt: string;
};
export type EventType = 'TRIP'|'VACATION'|'FAMILY'|'SHOPPING'|'BIRTHDAY'|'WEDDING'|'FESTIVAL'|'COLLEGE'|'PROJECT'|'EMERGENCY'|'OTHER';
export type EventStatus = 'PLANNED'|'ACTIVE'|'COMPLETED'|'CANCELLED';
export type FinEvent = {
  _id: ID; name: string; description?: string; type: EventType; startDate: string; endDate?: string;
  status: EventStatus; color?: string; budgetMinor?: number; spentMinor: number; transactionCount: number;
};
export type Dashboard = {
  currency: string; totalMoneyMinor: number; creditOutstandingMinor: number; netWorthMinor: number;
  monthIncomeMinor: number; monthExpensesMinor: number; accountsCount: number;
  whereDidMyMoneyGo: { actualExpensesMinor: number; transfersMinor: number; creditCardPaymentsMinor: number; cashWithdrawalsMinor: number };
  recent: Transaction[];
};

// Rupees <-> paise. Never do floating math on money; parse to integer paise.
export const toMinor = (rupees: string | number): number => Math.round(Number(rupees) * 100);
export const fromMinor = (minor: number): number => minor / 100;
export const fmt = (minor: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(fromMinor(minor));
export const fmt2 = (minor: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(fromMinor(minor));

export const TX_TYPE_LABELS: Record<TxType, string> = {
  EXPENSE: 'Expense', INCOME: 'Income', TRANSFER: 'Transfer', UPI_PAYMENT: 'UPI payment',
  DEBIT_CARD_PAYMENT: 'Debit card', CREDIT_CARD_PURCHASE: 'Credit card purchase', CREDIT_CARD_PAYMENT: 'Credit card payment',
  CASH_WITHDRAWAL: 'Cash withdrawal', CASH_EXPENSE: 'Cash expense', REFUND: 'Refund', REVERSAL: 'Reversal',
  ADJUSTMENT: 'Adjustment', FEE: 'Fee', INTEREST: 'Interest', CASHBACK: 'Cashback'
};
