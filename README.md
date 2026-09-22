# Family Finance Manager

Family Finance Manager tracks the relationship that ordinary expense apps lose: **who spent**, **who owns the money**, and **what actually funded the payment**.

## Architecture (MVP)

`Authenticated React UI → protected REST API → ledger service → MongoDB`

Transactions carry `spentById`, `accountOwnerId`, `accountId`, and `paymentMethod` independently. UPI apps are channels, never balances. Debit/UPI/cash expenses debit the selected account; credit-card purchases increase outstanding; transfers move funds without becoming spend; credit-card payments reduce both a bank balance and card outstanding.

### Key collections

`users`, `families`, `familyMembers`, `accounts`, `transactions`, `categories`, `budgets`, `bills`, `recurringTransactions`, `auditLogs`.

### Authorization

JWT access token + refresh token cookie, with family membership verified for every account and transaction query/mutation. Card PANs are encrypted server-side; CVV/PIN/OTP are never stored.

## Start the UI

```powershell
npm install
npm run dev
```

New workspaces start empty. The API uses private workspace isolation, bcrypt authentication, access tokens plus HTTP-only refresh cookies, and atomic integer-paise ledger posting. Review [SECURITY_AUDIT.md](SECURITY_AUDIT.md) before deploying; it lists the implemented controls and remaining planned modules.
