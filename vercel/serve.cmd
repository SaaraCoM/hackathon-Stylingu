#!/usr/bin/env bash
set -e

echo "=== 1. Montar hono, mongoose y bcryptjs como ESM ==="

echo "--- hono ---"
node --input-type=module -e "import { Hono } from 'hono'; console.log('hono ESM OK:', typeof Hono);" 2>&1 | head -n 20
echo

echo "--- mongoose ---"
node --input-type=module -e "import mongoose from 'mongoose'; console.log('mongoose ESM OK:', typeof mongoose.connect, typeof mongoose.models);" 2>&1 | head -n 20
echo

echo "--- bcryptjs ---"
node --input-type=module -e "import bcrypt from 'bcryptjs'; console.log('bcryptjs ESM OK:', typeof bcrypt.hash, typeof bcrypt.compare);" 2>&1 | head -n 20
echo

echo "=== 2. Verificar api/index.js como ESM exportable (sin MONGODB_URI aún) ==="
echo "Se importa sin intentar conexión (el módulo define los esquemas y la app hono)."

node --input-type=module -e "
import app from './api/index.js';
console.log('app:', typeof app);
console.log('app.fetch:', typeof app.fetch);
" 2>&1 | head -n 20
echo

echo "=== 3. Comprobar que los modelos se registran sin conexión ==="
node --input-type=module -e "
import app from './api/index.js';
import mongoose from 'mongoose';
const names = Object.keys(mongoose.models);
console.log('modelos registrados:', names);
" 2>&1 | head -n 20
echo

echo "=== 4. listado de paquetes relevantes ==="
node -e "const p=require('./package.json'); console.log('deps:', JSON.stringify(p.dependencies||{}, null, 2))" 2>&1 | head -n 30
echo

echo "=== 5. contenido api/index.js ==="
cat api/index.js
echo

echo "=== 6. vercel.json ==="
cat vercel.json
echo

echo "=== 7. package.json ==="
cat package.json
echo

echo "=== 8. tree de vercel/ ==="
ls -laR vercel | head -n 200
echo

echo "=== listado de node_modules hono, mongoose y bcryptjs ==="
ls -la node_modules | grep -E "hono|mongoose|bcryptjs" | head -n 20
echo

echo "=== ok ==="