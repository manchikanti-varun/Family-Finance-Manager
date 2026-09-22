import { Schema, model, Types } from 'mongoose';
const userSchema = new Schema({ email:{type:String,required:true,unique:true,lowercase:true,trim:true}, googleSubject:{type:String,required:true,unique:true}, workspaceId:{type:Types.ObjectId,required:true,index:true}, tokenVersion:{type:Number,default:0} },{timestamps:true,strict:'throw'});
export const User=model('User',userSchema);
