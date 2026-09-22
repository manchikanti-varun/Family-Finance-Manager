import { ClientSession } from 'mongoose'; import { Account } from '../models/Account.js';
export type Posting = { type:string; amountMinor:number; sourceAccountId?:string; destinationAccountId?:string };

// A single balance effect the ledger must apply to one account.
// balanceDelta -> currentBalanceMinor; outstandingDelta -> currentOutstandingMinor (and inverse availableCredit).
export type LedgerOp = { accountId:string; balanceDelta?:number; outstandingDelta?:number };

const validMoney=(n:number)=>{ if(!Number.isSafeInteger(n)||n<1) throw new Error('Amount must be positive integer paise'); };

/**
 * Pure decision function: given a posting and the account types, returns the balance
 * operations to apply. No DB access, so it is fully unit-testable. `isCreditCard` lets
 * the caller resolve whether the source/destination account is a credit card.
 */
export function computeLedgerOps(p:Posting, isCreditCard:(accountId?:string)=>boolean):LedgerOp[]{
  validMoney(p.amountMinor);
  const amt=p.amountMinor;
  const src=()=>{ if(!p.sourceAccountId) throw new Error('Source account required'); return p.sourceAccountId; };
  const dst=()=>{ if(!p.destinationAccountId) throw new Error('Destination account required'); return p.destinationAccountId; };
  switch(p.type){
    case 'EXPENSE': case 'UPI_PAYMENT': case 'DEBIT_CARD_PAYMENT': case 'CASH_EXPENSE': case 'FEE': {
      const a=src();
      return isCreditCard(a) ? [{accountId:a,outstandingDelta:amt}] : [{accountId:a,balanceDelta:-amt}];
    }
    case 'CREDIT_CARD_PURCHASE': case 'INTEREST':
      return [{accountId:src(),outstandingDelta:amt}];
    case 'INCOME': case 'CASHBACK':
      return [{accountId:src(),balanceDelta:amt}];
    case 'TRANSFER': case 'CASH_WITHDRAWAL':
      return [{accountId:src(),balanceDelta:-amt},{accountId:dst(),balanceDelta:amt}];
    case 'CREDIT_CARD_PAYMENT': {
      const to=dst();
      if(!isCreditCard(to)) throw new Error('Destination must be a credit card');
      return [{accountId:src(),balanceDelta:-amt},{accountId:to,outstandingDelta:-amt}];
    }
    case 'REFUND': {
      const a=src();
      return isCreditCard(a) ? [{accountId:a,outstandingDelta:-amt}] : [{accountId:a,balanceDelta:amt}];
    }
    case 'ADJUSTMENT':
      return [{accountId:src(),balanceDelta:amt}];
    default:
      throw new Error(`Unsupported posting type: ${p.type}`);
  }
}

/** Applies the ledger ops for a posting inside the given Mongo transaction. */
export async function postTransaction(p:Posting, session:ClientSession){
  const ids=[p.sourceAccountId,p.destinationAccountId].filter(Boolean) as string[];
  const accounts=await Account.find({_id:{$in:ids}}).session(session);
  const typeById=new Map(accounts.map(a=>[String(a._id),a.accountType]));
  const isCreditCard=(id?:string)=> !!id && typeById.get(id)==='CREDIT_CARD';
  const ops=computeLedgerOps(p,isCreditCard);
  for(const op of ops){
    const inc:Record<string,number>={};
    if(op.balanceDelta!==undefined) inc.currentBalanceMinor=op.balanceDelta;
    if(op.outstandingDelta!==undefined){ inc.currentOutstandingMinor=op.outstandingDelta; inc.availableCreditMinor=-op.outstandingDelta; }
    await Account.updateOne({_id:op.accountId,status:'ACTIVE'},{$inc:inc},{session});
  }
}
