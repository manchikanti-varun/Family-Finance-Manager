import { Router } from 'express'; import mongoose from 'mongoose'; import { Account } from '../models/Account.js'; import { Transaction } from '../models/Transaction.js'; import { AuthRequest } from '../middleware/auth.js';
const router=Router();
// Classification shared with event analytics: what counts as an actual expense vs. internal movement.
const ACTUAL_EXPENSE=['EXPENSE','UPI_PAYMENT','DEBIT_CARD_PAYMENT','CREDIT_CARD_PURCHASE','CASH_EXPENSE','FEE','INTEREST'];
const INCOME=['INCOME','CASHBACK'];
const monthRange=(d=new Date())=>{const y=d.getFullYear(),m=d.getMonth();const s=new Date(Date.UTC(y,m,1)).toISOString().slice(0,10);const e=new Date(Date.UTC(y,m+1,0)).toISOString().slice(0,10);return{start:s,end:e}};

router.get('/',async(req:AuthRequest,res,next)=>{try{
  const wsId=new mongoose.Types.ObjectId(req.auth!.workspaceId);
  const {start,end}=monthRange();
  const accounts=await Account.find({workspaceId:wsId,status:'ACTIVE'}).lean();
  // Assets = bank/cash/wallet balances. Liabilities = credit-card outstanding.
  let totalMoneyMinor=0,creditOutstandingMinor=0;
  for(const a of accounts){if(a.accountType==='CREDIT_CARD')creditOutstandingMinor+=a.currentOutstandingMinor||0;else totalMoneyMinor+=a.currentBalanceMinor||0;}
  const netWorthMinor=totalMoneyMinor-creditOutstandingMinor;

  const monthMatch={workspaceId:wsId,status:'COMPLETED',transactionDate:{$gte:start,$lte:end}};
  const [byType]=await Promise.all([
    Transaction.aggregate([{$match:monthMatch},{$group:{_id:'$type',amountMinor:{$sum:'$amountMinor'}}}])
  ]);
  const sumOf=(types:string[])=>byType.filter((r:any)=>types.includes(r._id)).reduce((a:number,r:any)=>a+r.amountMinor,0);
  const monthExpensesMinor=sumOf(ACTUAL_EXPENSE);
  const monthIncomeMinor=sumOf(INCOME);
  // "Where did my money go?" — separate real spend from internal movements.
  const whereDidMyMoneyGo={
    actualExpensesMinor:monthExpensesMinor,
    transfersMinor:sumOf(['TRANSFER']),
    creditCardPaymentsMinor:sumOf(['CREDIT_CARD_PAYMENT']),
    cashWithdrawalsMinor:sumOf(['CASH_WITHDRAWAL'])
  };

  const recent=await Transaction.find({workspaceId:wsId,status:{$ne:'VOIDED'}}).sort({transactionDate:-1,createdAt:-1}).limit(10).lean();
  res.json({currency:'INR',totalMoneyMinor,creditOutstandingMinor,netWorthMinor,monthIncomeMinor,monthExpensesMinor,whereDidMyMoneyGo,accountsCount:accounts.length,recent});
}catch(e){next(e)}});

export default router;
