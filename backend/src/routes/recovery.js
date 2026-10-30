import { Router } from 'express';
import { randomBytes,createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import * as repo from '../db/repo.js';
import { connectDB } from '../config/db.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { fail } from '../../../shared/product-domain.js';
export const recoveryRoutes=Router();
const handle=fn=>(req,res,next)=>Promise.resolve(fn(req,res)).catch(next);
const hash=s=>createHash('sha256').update(s).digest('hex');
recoveryRoutes.post('/forgot-password',authLimiter,handle(async(req,res)=>{
 if(!process.env.SMTP_URL||!process.env.MAIL_FROM||!process.env.PUBLIC_ORIGIN)fail('Recuperación por correo no configurada. Contacta con soporte.','MAIL_NOT_CONFIGURED',503);
 const email=req.body?.email;if(typeof email!=='string'||email.length>160)fail('Email no válido.');
 await connectDB();const user=await repo.userByEmail(email.toLowerCase().trim());
 if(user&&!user.deleting) {
  const token=randomBytes(32).toString('hex');const doc=await repo.createResetToken({userId:user._id,hash:hash(token),expiresAt:new Date(Date.now()+30*60000)});
  const url=new URL(process.env.PUBLIC_ORIGIN);url.hash='reset='+token;
  try{await nodemailer.createTransport(process.env.SMTP_URL).sendMail({from:process.env.MAIL_FROM,to:user.email,subject:'Recupera tu cuenta StylingU',text:'Abre este enlace para establecer una nueva contraseña (caduca en 30 minutos): '+url.href});}
  catch{await repo.deleteResetToken(doc.id);fail('No se pudo enviar el correo. Reintenta más tarde.','MAIL_DELIVERY_FAILED',503);}
 }
 res.json({ok:true,message:'Si existe una cuenta con ese email, recibirás un enlace de recuperación.'});
}));
recoveryRoutes.post('/reset-password',authLimiter,handle(async(req,res)=>{
 const {token,password}=req.body||{};
 if(typeof token!=='string'||!/^\w{64}$/.test(token)||typeof password!=='string'||password.length<8||Buffer.byteLength(password)>72)fail('Token o contraseña no válidos (8 caracteres mínimo, 72 bytes máximo).');
 await connectDB();const passwordHash=await bcrypt.hash(password,12);
 // El DELETE ... RETURNING consume el token de forma atómica: dos peticiones
 // simultáneas no pueden reutilizarlo.
 const reset=await repo.consumeResetToken(hash(token));
 if(!reset)fail('El enlace ha caducado o ya fue utilizado.','INVALID_RESET',400);
 const updated=await repo.updatePassword(reset.userId,passwordHash);
 if(!updated)fail('El enlace ha caducado o ya fue utilizado.','INVALID_RESET',400);
 await Promise.all([repo.deleteSessionsForUser(reset.userId),repo.deleteResetTokensForUser(reset.userId)]);
 res.json({ok:true});
}));
