import { Schema, model, Types } from 'mongoose';
export const Person=model('Person',new Schema({workspaceId:{type:Types.ObjectId,required:true,index:true},name:{type:String,required:true,trim:true},email:String,isActive:{type:Boolean,default:true}},{timestamps:true,strict:'throw'}));
