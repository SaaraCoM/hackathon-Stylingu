import { Router } from 'express';
import * as repo from './db/repo.js';
import { storage } from './product.js';
import { requireUser } from './middleware/auth.js';
import { capabilities } from '../../shared/meta-client.js';
import { aiLimiter } from './middleware/rateLimit.js';
export { analyzeSimulated } from './analysis.js';
import { personal as service } from './product.js';
const router = Router();
router.use(requireUser);
const handle = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
router.post('/photos', handle(async (req, res) => res.json(await service.savePhotos(req.sessionUser, req.body))));
router.get('/capabilities', handle(async (_req,res)=>res.json(capabilities(process.env))));
router.post('/analyze', aiLimiter, handle(async (req, res) => res.json(await service.analyze(req.sessionUser,req.body??{},process.env))));
router.post('/segment', aiLimiter, handle(async (req,res)=>res.json(await service.visual(req.sessionUser,req.body??{},process.env,'segment'))));
router.post('/preview', aiLimiter, handle(async (req,res)=>res.json(await service.visual(req.sessionUser,req.body??{},process.env,'preview'))));
router.get('/analysis', handle(async (req, res) => res.json({ analysis: (await service.findUser(req.sessionUser)).analysis ?? null })));
router.get('/photos/:id', handle(async (req, res) => {
  const photo = await repo.photoForUser(req.params.id, req.sessionUser);
  if (!photo) return res.status(404).json({ error: 'Foto no encontrada.' });
  const bytes = await storage.get(photo.storageKey);
  if (!bytes) return res.status(404).json({ error: 'Foto no encontrada.' });
  res.set('Cache-Control', 'private, no-store').set('X-Content-Type-Options', 'nosniff').type(photo.mime).send(bytes);
}));
export function mountPersonal(app) {
  app.use('/api/personal', router);
  app.use('/api/auth/personal', router);
}
