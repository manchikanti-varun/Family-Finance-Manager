import { Router } from 'express'; import { z } from 'zod'; import { Types } from 'mongoose'; import { Account } from '../models/Account.js'; import { Person } from '../models/Person.js'; import { AuditLog } from '../models/AuditLog.js'; import { AuthRequest } from '../middleware/auth.js'; import { encryptCard } from '../services/crypto.js';
const router=Router();
const ACCOUNT_TYPES=['BANK_ACCOUNT','CREDIT_CARD','CASH','WALLET'] as const;
const scope=(req:AuthRequest,id:string)=>({_id:id,workspaceId:req.auth!.workspaceId});

const input=z.object({
  ownerPersonId:z.string(),
  accountName:z.string().trim().min(1).max(80),
  accountType:z.enum(ACCOUNT_TYPES),
  bankName:z.string().trim().max(80).optional(),
  openingBalanceMinor:z.number().int().default(0),
  // Credit card
  creditLimitMinor:z.number().int().nonnegative().optional(),
  currentOutstandingMinor:z.number().int().nonnegative().optional(),
  // Card instrument details (never CVV/PIN)
  cardNumber:z.string().trim().regex(/^\d{12,19}$/).optional(),
  expiryMonth:z.number().int().min(1).max(12).optional(),
  expiryYear:z.number().int().min(2000).max(2100).optional(),
  linkedBankAccountId:z.string().optional()
}).superRefine((v,c)=>{
  if(v.accountType==='CREDIT_CARD'&&v.creditLimitMinor===undefined)c.addIssue({code:'custom',message:'Credit limit is required for a credit card'});
});

router.get('/',async(req:AuthRequest,res,next)=>{try{res.json(await Account.find({workspaceId:req.auth!.workspaceId}).sort({status:1,accountType:1,accountName:1}).lean())}catch(e){next(e)}});

router.post('/',async(req:AuthRequest,res,next)=>{try{
  const d=input.parse(req.body);
  // Ownership: the person and any linked account must belong to this workspace.
  const owner=await Person.findOne({_id:d.ownerPersonId,workspaceId:req.auth!.workspaceId});
  if(!owner)return res.status(400).json({error:'Owner person is outside this workspace'});
  if(d.linkedBankAccountId){const linked=await Account.findOne({_id:d.linkedBankAccountId,workspaceId:req.auth!.workspaceId,accountType:'BANK_ACCOUNT'});if(!linked)return res.status(400).json({error:'Linked bank account is invalid'});}
  const doc:any={
    workspaceId:req.auth!.workspaceId,ownerPersonId:new Types.ObjectId(d.ownerPersonId),
    accountName:d.accountName,accountType:d.accountType,bankName:d.bankName,
    openingBalanceMinor:d.openingBalanceMinor,currentBalanceMinor:d.openingBalanceMinor
  };
  if(d.linkedBankAccountId)doc.linkedBankAccountId=new Types.ObjectId(d.linkedBankAccountId);
  if(d.expiryMonth)doc.expiryMonth=d.expiryMonth; if(d.expiryYear)doc.expiryYear=d.expiryYear;
  if(d.cardNumber){doc.cardNumberEncrypted=encryptCard(d.cardNumber);doc.last4Digits=d.cardNumber.slice(-4);}
  if(d.accountType==='CREDIT_CARD'){
    const limit=d.creditLimitMinor!;const outstanding=d.currentOutstandingMinor||0;
    doc.creditLimitMinor=limit;doc.currentOutstandingMinor=outstanding;doc.availableCreditMinor=limit-outstanding;
    doc.currentBalanceMinor=0;doc.openingBalanceMinor=0;
  }
  const account=await Account.create(doc);
  const safe=account.toObject();delete (safe as any).cardNumberEncrypted;
  await AuditLog.create({workspaceId:req.auth!.workspaceId,userId:req.auth!.userId,action:'ACCOUNT_CREATED',entityType:'Account',entityId:account._id,newValue:{accountName:account.accountName,accountType:account.accountType}});
  res.status(201).json(safe);
}catch(e){next(e)}});

// Deactivate/close rather than delete so historical transactions keep their account identity (spec #76, #79).
router.delete('/:id',async(req:AuthRequest,res,next)=>{try{
  const account=await Account.findOne(scope(req,String(req.params.id)));
  if(!account)return res.status(404).json({error:'Account not found'});
  account.status='CLOSED';await account.save();
  await AuditLog.create({workspaceId:req.auth!.workspaceId,userId:req.auth!.userId,action:'ACCOUNT_CLOSED',entityType:'Account',entityId:account._id,oldValue:{accountName:account.accountName}});
  res.status(200).json({id:account._id,status:account.status});
}catch(e){next(e)}});

export default router;
