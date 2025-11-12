#!/usr/bin/env node

/**
 * Script pour générer un secret JWT sécurisé
 * Usage: node scripts/generate-secret.js
 */

const crypto = require('crypto');

console.log('🔐 Génération d\'un secret JWT sécurisé...\n');

// Générer un secret de 64 bytes (512 bits)
const secret = crypto.randomBytes(64).toString('hex');

console.log('✅ Secret JWT généré avec succès !');
console.log('\n📋 Copiez cette valeur dans votre fichier .env :');
console.log('='.repeat(60));
console.log(`JWT_SECRET=${secret}`);
console.log('='.repeat(60));

console.log('\n⚠️  IMPORTANT :');
console.log('- Gardez ce secret en sécurité');
console.log('- Ne le partagez jamais');
console.log('- Utilisez des secrets différents par environnement');
console.log('- Changez ce secret si vous soupçonnez une compromission');

console.log('\n🔧 Pour utiliser ce secret :');
console.log('1. Ouvrez votre fichier .env');
console.log('2. Remplacez la ligne JWT_SECRET par celle ci-dessus');
console.log('3. Redémarrez votre serveur'); 