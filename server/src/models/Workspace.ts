import { Schema, model, Types } from 'mongoose';
export const Workspace=model('Workspace',new Schema({ownerUserId:{type:Types.ObjectId,required:true,unique:true},name:{type:String,required:true},timezone:{type:String,default:'Asia/Kolkata'},currency:{type:String,default:'INR'}},{timestamps:true,strict:'throw'}));
