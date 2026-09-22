import { NextFunction, Request, Response } from 'express'; import jwt from 'jsonwebtoken';
export type AuthRequest=Request & { auth?:{userId:string;workspaceId:string;tokenVersion:number} };
const accessSecret=()=>{const s=process.env.JWT_ACCESS_SECRET;if(!s)throw new Error('JWT_ACCESS_SECRET is required');return s};
export function signAccess(payload:{userId:string;workspaceId:string;tokenVersion:number}){return jwt.sign(payload,accessSecret(),{expiresIn:'15m'})}
export function requireAuth(req:AuthRequest,res:Response,next:NextFunction){try{const token=req.headers.authorization?.replace(/^Bearer\s+/,'');if(!token)return res.status(401).json({error:'Authentication required'});req.auth=jwt.verify(token,accessSecret()) as AuthRequest['auth'];next()}catch{return res.status(401).json({error:'Invalid or expired session'})}}
