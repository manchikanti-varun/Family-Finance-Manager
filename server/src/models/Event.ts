import { Schema, model, Types } from 'mongoose';
export const EVENT_TYPES=['TRIP','VACATION','FAMILY','SHOPPING','BIRTHDAY','WEDDING','FESTIVAL','COLLEGE','PROJECT','EMERGENCY','OTHER'] as const;
export const EVENT_STATUSES=['PLANNED','ACTIVE','COMPLETED','CANCELLED'] as const;
const eventSchema=new Schema({workspaceId:{type:Types.ObjectId,required:true,index:true},name:{type:String,required:true,trim:true,maxlength:120},description:{type:String,trim:true,maxlength:2000},type:{type:String,enum:EVENT_TYPES,default:'OTHER'},startDate:{type:String,required:true},endDate:String,status:{type:String,enum:EVENT_STATUSES,default:'PLANNED'},color:{type:String,match:/^#[0-9a-fA-F]{6}$/},budgetMinor:{type:Number,min:0},currency:{type:String,default:'INR'}},{timestamps:true,strict:'throw'});
eventSchema.index({workspaceId:1,status:1,startDate:-1}); eventSchema.index({workspaceId:1,name:1});
export const Event=model('Event',eventSchema);
