import * as repo from './db/repo.js';
import { personalService } from '../../shared/personal-service.js';
import { productService } from '../../shared/product-service.js';
import { normalizePhoto } from './images.js';
import * as storage from '../../shared/storage.js';

export { repo, storage };
export const personal = personalService({ repo, storage, normalizePhoto });
export const products = productService({ repo, personal, env: process.env });
