// Repositorio único de datos. Todo el SQL vive aquí; los servicios y las rutas
// no construyen consultas. Los alias conservan el contrato JSON que ya usa el
// frontend (`_id`, camelCase) para no tocar ni una línea de la interfaz.
import { query, withTransaction, isUniqueViolation } from './pool.js';

export { isUniqueViolation };

const USER_FIELDS = `id as "_id", name, email, preferences, analysis,
  photo_input as "photoInput", profile, deleting, birth_date as "birthDate",
  created_at as "createdAt"`;

const PLAN_FIELDS = `id as "_id", user_id as "userId", to_char(plan_date,'YYYY-MM-DD') as date,
  time_zone as "timeZone", garment_ids as "garmentIds", signature, labels, colors,
  origin, explanation, profile_version as "profileVersion", status,
  created_at as "createdAt"`;

const GARMENT_FIELDS = `id as "_id", user_id as "userId", name, category, colors, season,
  occasions, excludes, available, created_at as "createdAt"`;

const JOB_FIELDS = `id as "_id", user_id as "userId", key, hash, state,
  input_version as "inputVersion", profile_version as "profileVersion",
  payload, result, error, started_at as "startedAt", finished_at as "finishedAt",
  created_at as "createdAt"`;

/* ------------------------------------------------------------------ users */
export async function userById(id, { includeDeleting = false } = {}) {
  const { rows } = await query(
    `select ${USER_FIELDS} from users where id = $1 ${includeDeleting ? '' : 'and deleting = false'}`,
    [id]
  );
  return rows[0] || null;
}

export async function userByEmail(email) {
  const { rows } = await query(
    `select ${USER_FIELDS} from users where lower(email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

// Credenciales para login: el hash nunca sale de aquí hacia una respuesta HTTP.
export async function credentialsByEmail(email) {
  const { rows } = await query(
    `select id as "_id", name, email, password_hash as "passwordHash", deleting
     from users where lower(email) = lower($1)`,
    [email]
  );
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, birthDate }) {
  const { rows } = await query(
    `insert into users (name, email, password_hash, birth_date) values ($1,$2,$3,$4) returning ${USER_FIELDS}`,
    [name, email, passwordHash, birthDate]
  );
  return rows[0];
}

export async function saveUser(id, patch = {}) {
  const sets = [];
  const values = [];
  const put = (column, value) => {
    if (value === undefined) return;
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  put('preferences', patch.preferences);
  put('analysis', patch.analysis);
  put('photo_input', patch.photoInput);
  put('profile', patch.profile);
  put('password_hash', patch.passwordHash);
  if (!sets.length) return userById(id, { includeDeleting: true });
  values.push(id);
  const { rows } = await query(
    `update users set ${sets.join(', ')}, updated_at = now()
     where id = $${values.length} returning ${USER_FIELDS}`,
    values
  );
  return rows[0] || null;
}

// Bloqueo optimista por versión de perfil: sustituye al filtro de Mongoose.
export async function updateProfileVersioned(id, expectedVersion, profile) {
  const { rows } = await query(
    `update users set profile = $3, updated_at = now()
     where id = $1 and deleting = false
       and coalesce((profile->>'version')::int, 0) = $2
     returning ${USER_FIELDS}`,
    [id, expectedVersion, profile]
  );
  return rows[0] || null;
}

export async function updateAnalysisVersioned(id, { expectedProfileVersion, expectedInputVersion, analysis }) {
  const { rows } = await query(
    `update users set analysis = $3, updated_at = now()
     where id = $1 and deleting = false
       and coalesce((profile->>'version')::int, 0) = $2
       and coalesce(photo_input->>'inputVersion', analysis->>'inputVersion', '') = coalesce($4, '')
     returning ${USER_FIELDS}`,
    [id, expectedProfileVersion, analysis, expectedInputVersion]
  );
  return rows[0] || null;
}

// Reemplazo atómico del objeto `analysis` sólo si ni las fotos ni el análisis
// cambiaron desde que se leyó. Sustituye a la pipeline de agregación de Mongo.
export async function updateAnalysisJsonVersioned(id, { inputVersion, analyzedAt, analysis }) {
  const { rows } = await query(
    `update users set analysis = $4, updated_at = now()
     where id = $1 and deleting = false
       and coalesce(analysis->>'inputVersion','') = coalesce($2,'')
       and coalesce(analysis->>'analyzedAt','') = coalesce($3,'')
     returning ${USER_FIELDS}`,
    [id, inputVersion, analyzedAt, analysis]
  );
  return rows[0] || null;
}

export async function markDeleting(id) {
  await query('update users set deleting = true, updated_at = now() where id = $1', [id]);
}

export async function deleteUser(id) {
  const { rows } = await query('delete from users where id = $1 returning id', [id]);
  return rows.length > 0;
}

/* ----------------------------------------------------------------- photos */
export async function upsertPhoto({ id, userId, mime, storageKey, bytes }) {
  await query(
    `insert into photos (id, user_id, mime, storage_key, bytes) values ($1,$2,$3,$4,$5)
     on conflict (id) do update set mime = excluded.mime, storage_key = excluded.storage_key`,
    [id, userId, mime, storageKey, bytes]
  );
}

export async function photoForUser(id, userId) {
  const { rows } = await query(
    'select id, user_id as "userId", mime, storage_key as "storageKey", bytes from photos where id = $1 and user_id = $2',
    [id, userId]
  );
  return rows[0] || null;
}

export async function photoKeysForUser(userId) {
  const { rows } = await query('select storage_key as "storageKey" from photos where user_id = $1', [userId]);
  return rows.map(row => row.storageKey);
}

/* --------------------------------------------------------------- sessions */
export async function createSessionRow({ tokenHash, userId, expiresAt }) {
  await query('insert into sessions (token_hash, user_id, expires_at) values ($1,$2,$3)', [tokenHash, userId, expiresAt]);
}

export async function sessionByToken(tokenHash) {
  const { rows } = await query(
    `select user_id as "userId", expires_at as "expiresAt" from sessions
     where token_hash = $1 and expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function deleteSessionRow(tokenHash) {
  await query('delete from sessions where token_hash = $1', [tokenHash]);
}

export async function deleteSessionsForUser(userId) {
  await query('delete from sessions where user_id = $1', [userId]);
}

export async function pruneExpired() {
  const { rows } = await query(
    `with s as (delete from sessions where expires_at < now() returning 1),
          r as (delete from reset_tokens where expires_at < now() returning 1)
     select (select count(*) from s)::int as sessions, (select count(*) from r)::int as tokens`
  );
  return rows[0];
}

/* ---------------------------------------------------------------- outfits */
export async function listOutfits(userId, limit = 50) {
  const { rows } = await query(
    `select id as "_id", user_id as "userId", top, top_desc as "topDesc", bottom, bottom_desc as "bottomDesc",
            jacket, jacket_desc as "jacketDesc", acc, acc_desc as "accDesc", note,
            created_at as "createdAt"
     from outfits where user_id = $1 order by created_at desc limit $2`,
    [userId, limit]
  );
  return rows;
}

export async function createOutfit(userId, item) {
  const { rows } = await query(
    `insert into outfits (user_id, top, top_desc, bottom, bottom_desc, jacket, jacket_desc, acc, acc_desc, note)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id as "_id", user_id as "userId", top, top_desc as "topDesc", bottom, bottom_desc as "bottomDesc",
               jacket, jacket_desc as "jacketDesc", acc, acc_desc as "accDesc", note,
               created_at as "createdAt"`,
    [userId, item.top, item.topDesc, item.bottom, item.bottomDesc, item.jacket, item.jacketDesc, item.acc, item.accDesc, item.note]
  );
  return rows[0];
}

/* --------------------------------------------------------------- garments */
export async function listGarments(userId, limit = 200) {
  const { rows } = await query(
    `select ${GARMENT_FIELDS} from garments where user_id = $1 order by created_at limit $2`,
    [userId, limit]
  );
  return rows;
}

export async function countGarments(userId) {
  const { rows } = await query('select count(*)::int as total from garments where user_id = $1', [userId]);
  return rows[0].total;
}

export async function createGarment(userId, clean) {
  const { rows } = await query(
    `insert into garments (user_id, name, category, colors, season, occasions, excludes, available)
     values ($1,$2,$3,$4,$5,$6,$7,$8) returning ${GARMENT_FIELDS}`,
    [userId, clean.name, clean.category, clean.colors || [], clean.season || [], clean.occasions || [], clean.excludes || [], clean.available !== false]
  );
  return rows[0];
}

export async function updateGarment(userId, id, clean) {
  const { rows } = await query(
    `update garments set name = $3, category = $4, colors = $5, season = $6,
            occasions = $7, excludes = $8, available = $9, updated_at = now()
     where id = $1 and user_id = $2 returning ${GARMENT_FIELDS}`,
    [id, userId, clean.name, clean.category, clean.colors || [], clean.season || [], clean.occasions || [], clean.excludes || [], clean.available !== false]
  );
  return rows[0] || null;
}

export async function deleteGarment(userId, id) {
  const { rows } = await query('delete from garments where id = $1 and user_id = $2 returning id', [id, userId]);
  return rows.length > 0;
}

export async function markPlansUnavailable(userId, garmentId) {
  await query(
    `update outfit_plans set status = 'unavailable', updated_at = now()
     where user_id = $1 and $2 = any(garment_ids)`,
    [userId, garmentId]
  );
}

/* ------------------------------------------------------------------ plans */
export async function listPlans(userId, from, to) {
  const { rows } = await query(
    `select ${PLAN_FIELDS} from outfit_plans
     where user_id = $1 and plan_date between $2::date and $3::date
     order by plan_date`,
    [userId, from, to]
  );
  return rows;
}

export async function upsertPlan(userId, plan) {
  await query(
    `insert into outfit_plans (user_id, plan_date, time_zone, garment_ids, signature, labels, colors, origin, explanation, profile_version, status)
     values ($1,$2::date,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (user_id, plan_date) do nothing`,
    [userId, plan.date, plan.timeZone || '', plan.garmentIds || [], plan.signature, plan.labels || [], plan.colors || [], plan.origin || '', plan.explanation || '', plan.profileVersion || 0, plan.status || 'proposed']
  );
}

export async function setPlanStatus(userId, date, status) {
  const { rows } = await query(
    `update outfit_plans set status = $3, updated_at = now()
     where user_id = $1 and plan_date = $2::date returning ${PLAN_FIELDS}`,
    [userId, date, status]
  );
  return rows[0] || null;
}

/* ---------------------------------------------------------------- catálogo */
const PRODUCT_FIELDS = `id as "_id", brand, name, category, description, source, checked_at as "checkedAt"`;
const VARIANT_FIELDS = `id as "_id", product_id as "productId", shade, market, finish, hex,
  color_verified as "colorVerified", barcodes, ingredients,
  ingredients_complete as "ingredientsComplete", source, checked_at as "checkedAt"`;

export async function listProducts(limit = 100) {
  const { rows } = await query(`select ${PRODUCT_FIELDS} from products limit $1`, [limit]);
  return rows;
}

export async function listVariants(limit = 500) {
  const { rows } = await query(`select ${VARIANT_FIELDS} from product_variants limit $1`, [limit]);
  return rows;
}

export async function variantById(id) {
  const { rows } = await query(`select ${VARIANT_FIELDS} from product_variants where id = $1`, [id]);
  return rows[0] || null;
}

export async function variantsByBarcode(barcode) {
  const { rows } = await query(`select ${VARIANT_FIELDS} from product_variants where $1 = any(barcodes)`, [barcode]);
  return rows;
}

export async function variantExists(id) {
  const { rows } = await query('select 1 from product_variants where id = $1', [id]);
  return rows.length > 0;
}

export async function productById(id) {
  const { rows } = await query(`select ${PRODUCT_FIELDS} from products where id = $1`, [id]);
  return rows[0] || null;
}

export async function latestOfferForVariant(variantId) {
  const { rows } = await query(
    `select id as "_id", variant_id as "variantId", merchant, price, currency, url, checked_at as "checkedAt"
     from product_offers where variant_id = $1 order by checked_at desc nulls last limit 1`,
    [variantId]
  );
  return rows[0] || null;
}

export async function upsertProduct(product) {
  await query(
    `insert into products (id, brand, name, category, description, source, checked_at)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (id) do update set brand = excluded.brand, name = excluded.name,
       category = excluded.category, description = excluded.description,
       source = excluded.source, checked_at = excluded.checked_at`,
    [product._id, product.brand, product.name, product.category, product.description, product.source, product.checkedAt]
  );
}

export async function upsertVariant(variant) {
  await query(
    `insert into product_variants (id, product_id, shade, market, finish, hex, color_verified,
       barcodes, ingredients, ingredients_complete, source, checked_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     on conflict (id) do update set product_id = excluded.product_id, shade = excluded.shade,
       market = excluded.market, finish = excluded.finish, hex = excluded.hex,
       color_verified = excluded.color_verified, barcodes = excluded.barcodes,
       ingredients = excluded.ingredients, ingredients_complete = excluded.ingredients_complete,
       source = excluded.source, checked_at = excluded.checked_at`,
    [variant._id, variant.productId, variant.shade, variant.market, variant.finish, variant.hex || '',
      variant.colorVerified === true, variant.barcodes || [], variant.ingredients || [],
      variant.ingredientsComplete === true, variant.source, variant.checkedAt]
  );
}

/* ---------------------------------------------------------------- feedback */
export async function listOwned(userId) {
  const { rows } = await query(
    'select variant_id as "variantId", created_at as "createdAt" from owned_cosmetics where user_id = $1',
    [userId]
  );
  return rows.map(row => ({ ...row, _id: row.variantId, userId }));
}

export async function listFeedback(userId) {
  const { rows } = await query(
    'select variant_id as "variantId", action from recommendation_feedback where user_id = $1',
    [userId]
  );
  return rows.map(row => ({ ...row, _id: row.variantId, userId }));
}

export async function upsertFeedback(userId, variantId, action) {
  await query(
    `insert into recommendation_feedback (user_id, variant_id, action) values ($1,$2,$3)
     on conflict (user_id, variant_id) do update set action = excluded.action, updated_at = now()`,
    [userId, variantId, action]
  );
}

export async function upsertOwned(userId, variantId) {
  await query(
    `insert into owned_cosmetics (user_id, variant_id) values ($1,$2)
     on conflict (user_id, variant_id) do nothing`,
    [userId, variantId]
  );
}

export async function deleteOwned(userId, variantId) {
  await query('delete from owned_cosmetics where user_id = $1 and variant_id = $2', [userId, variantId]);
}

/* --------------------------------------------------------------- tutorial */
export async function getProgress(userId, key) {
  const { rows } = await query(
    'select completed from tutorial_progress where user_id = $1 and key = $2',
    [userId, key]
  );
  return rows[0] ? { completed: rows[0].completed || [] } : { completed: [] };
}

export async function setProgress(userId, key, completed) {
  await query(
    `insert into tutorial_progress (user_id, key, completed) values ($1,$2,$3)
     on conflict (user_id, key) do update set completed = excluded.completed, updated_at = now()`,
    [userId, key, completed]
  );
}

/* --------------------------------------------------------------- trabajos */
export async function jobByKey(userId, key) {
  const { rows } = await query(`select ${JOB_FIELDS} from analysis_jobs where user_id = $1 and key = $2`, [userId, key]);
  return rows[0] || null;
}

export async function activeJobByHash(userId, hash) {
  const { rows } = await query(
    `select ${JOB_FIELDS} from analysis_jobs
     where user_id = $1 and hash = $2 and state in ('queued','processing') limit 1`,
    [userId, hash]
  );
  return rows[0] || null;
}

export async function jobByIdForUser(id, userId) {
  const { rows } = await query(`select ${JOB_FIELDS} from analysis_jobs where id = $1 and user_id = $2`, [id, userId]);
  return rows[0] || null;
}

export async function createJob({ userId, key, hash, inputVersion, profileVersion, payload }) {
  const { rows } = await query(
    `insert into analysis_jobs (user_id, key, hash, state, input_version, profile_version, payload)
     values ($1,$2,$3,'queued',$4,$5,$6) returning ${JOB_FIELDS}`,
    [userId, key, hash, inputVersion, profileVersion, payload]
  );
  return rows[0];
}

export async function latestJobMatching(userId, key, hash) {
  const { rows } = await query(
    `select ${JOB_FIELDS} from analysis_jobs
     where user_id = $1 and (key = $2 or hash = $3) order by created_at desc limit 1`,
    [userId, key, hash]
  );
  return rows[0] || null;
}

export async function claimNextJob() {
  const { rows } = await query(
    `update analysis_jobs set state = 'processing', started_at = now()
     where id = (
       select id from analysis_jobs where state = 'queued'
       order by created_at limit 1 for update skip locked
     )
     returning ${JOB_FIELDS}`
  );
  return rows[0] || null;
}

export async function expireStaleJobs(cutoff) {
  await query(
    `update analysis_jobs set state = 'uncertain',
            error = $2::jsonb, finished_at = now()
     where state = 'processing' and started_at < $1`,
    [cutoff, JSON.stringify({ code: 'EXECUTION_UNCERTAIN', message: 'El proceso se interrumpió. Comprueba el resultado antes de solicitar otro análisis.' })]
  );
}

export async function finishJob(id, { state, result, error }) {
  await query(
    `update analysis_jobs set state = $2, result = $3, error = $4, finished_at = now()
     where id = $1 and state = 'processing'`,
    [id, state, result ? JSON.stringify(result) : null, error ? JSON.stringify(error) : null]
  );
}

/* ------------------------------------------------------------------ cuota */
export async function consumeQuota(userId, day, limit) {
  const { rows } = await query(
    `insert into quotas (user_id, day, count) values ($1,$2::date,1)
     on conflict (user_id, day) do update set count = quotas.count + 1
     where quotas.count < $3
     returning count`,
    [userId, day, limit]
  );
  return rows[0] || null;
}

export async function refundQuota(userId, day) {
  await query(
    `update quotas set count = greatest(count - 1, 0) where user_id = $1 and day = $2::date`,
    [userId, day]
  );
}

/* --------------------------------------------------------------- recovery */
export async function createResetToken({ userId, hash, expiresAt }) {
  const { rows } = await query(
    'insert into reset_tokens (user_id, hash, expires_at) values ($1,$2,$3) returning id',
    [userId, hash, expiresAt]
  );
  return rows[0];
}

export async function consumeResetToken(hash) {
  const { rows } = await query(
    `delete from reset_tokens where hash = $1 and expires_at > now()
     returning user_id as "userId"`,
    [hash]
  );
  return rows[0] || null;
}

export async function deleteResetToken(id) {
  await query('delete from reset_tokens where id = $1', [id]);
}

export async function deleteResetTokensForUser(userId) {
  await query('delete from reset_tokens where user_id = $1', [userId]);
}

export async function updatePassword(userId, passwordHash) {
  const { rows } = await query(
    `update users set password_hash = $2, updated_at = now()
     where id = $1 and deleting = false returning id`,
    [userId, passwordHash]
  );
  return rows.length > 0;
}

/* -------------------------------------------------------- baja de cuenta */
// Las claves foráneas son `on delete cascade`: borrar la fila de `users`
// elimina fotos, sesiones, armario, planes, progreso y trabajos de golpe.
export async function deleteAccount(userId) {
  return withTransaction(async client => {
    const { rows } = await client.query('select storage_key as "storageKey" from photos where user_id = $1', [userId]);
    await client.query('delete from users where id = $1', [userId]);
    return rows.map(row => row.storageKey);
  });
}

export async function countRows(table, userId) {
  const allowed = ['users', 'photos', 'outfits', 'garments', 'outfit_plans', 'owned_cosmetics',
    'recommendation_feedback', 'tutorial_progress', 'analysis_jobs', 'quotas', 'sessions'];
  if (!allowed.includes(table)) throw new Error('Tabla no permitida: ' + table);
  const column = table === 'users' ? 'id' : 'user_id';
  const { rows } = await query(`select count(*)::int as total from ${table} where ${column} = $1`, [userId]);
  return rows[0].total;
}
