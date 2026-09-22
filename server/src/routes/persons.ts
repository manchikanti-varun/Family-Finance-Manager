import { Router } from 'express'; import { z } from 'zod'; import { Person } from '../models/Person.js'; import { AuditLog } from '../models/AuditLog.js'; import { AuthRequest } from '../middleware/auth.js';
const router=Router();
const input=z.object({name:z.string().trim().min(1).max(80),email:z.string().trim().email().optional()});
const scope=(req:AuthRequest,id:string)=>({_id:id,workspaceId:req.auth!.workspaceId});

router.get('/',async(req:AuthRequest,res,next)=>{try{res.json(await Person.find({workspaceId:req.auth!.workspaceId}).sort({isActive:-1,name:1}).lean())}catch(e){next(e)}});

router.post('/',async(req:AuthRequest,res,next)=>{try{const d=input.parse(req.body);const person=await Person.create({...d,workspaceId:req.auth!.workspaceId});await AuditLog.create({workspaceId:req.auth!.workspaceId,userId:req.auth!.userId,action:'PERSON_CREATED',entityType:'Person',entityId:person._id,newValue:{name:person.name}});res.status(201).json(person)}catch(e){next(e)}});

router.patch('/:id',async(req:AuthRequest,res,next)=>{try{const person=await Person.findOne(scope(req,String(req.params.id)));if(!person)return res.status(404).json({error:'Person not found'});const d=input.partial().parse(req.body);Object.assign(person,d);await person.save();res.json(person)}catch(e){next(e)}});

// Deactivate (never hard-delete a financial identity referenced by transactions/accounts).
router.delete('/:id',async(req:AuthRequest,res,next)=>{try{const person=await Person.findOne(scope(req,String(req.params.id)));if(!person)return res.status(404).json({error:'Person not found'});person.isActive=false;await person.save();await AuditLog.create({workspaceId:req.auth!.workspaceId,userId:req.auth!.userId,action:'PERSON_DEACTIVATED',entityType:'Person',entityId:person._id,oldValue:{name:person.name}});res.status(200).json(person)}catch(e){next(e)}});

export default router;
