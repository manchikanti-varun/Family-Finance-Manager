import { Schema, model, Types } from 'mongoose';
/** Monetary fields are integer paise, never JavaScript decimal rupees. */
const accountSchema = new Schema({
  workspaceId: { type: Types.ObjectId, required: true, index: true }, ownerPersonId: { type: Types.ObjectId, required: true, index: true },
  bankName: String, accountName: { type: String, required: true, trim: true }, accountType: { type: String, enum: ['BANK_ACCOUNT','CREDIT_CARD','CASH','WALLET'], required: true },
  linkedBankAccountId: { type: Types.ObjectId, ref: 'Account' }, cardNumberEncrypted: { type: String, select: false }, last4Digits: String, expiryMonth: Number, expiryYear: Number, replacedCardId: { type: Types.ObjectId, ref: 'Account' },
  currency: { type: String, default: 'INR', immutable: true }, openingBalanceMinor: { type: Number, required: true, default: 0 }, currentBalanceMinor: { type: Number, required: true, default: 0 },
  creditLimitMinor: Number, availableCreditMinor: Number, currentOutstandingMinor: { type: Number, default: 0 }, statementBalanceMinor: Number, minimumDueMinor: Number, paymentDueDate: Date,
  status: { type: String, enum: ['ACTIVE','INACTIVE','CLOSED'], default: 'ACTIVE' }
}, { timestamps: true, strict: 'throw' });
accountSchema.index({ workspaceId: 1, ownerPersonId: 1, accountType: 1 }); export const Account = model('Account', accountSchema);
