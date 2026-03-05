/**
 * Charge le fichier .env AVANT tout autre module qui lit process.env.
 * Ce fichier doit être importé en premier dans index.ts.
 */
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const possiblePaths = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(process.cwd(), '.env'),
];
const envPath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];
dotenv.config({ path: envPath });
