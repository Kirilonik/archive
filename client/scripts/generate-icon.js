#!/usr/bin/env node

/**
 * Скрипт для генерации PNG иконок из SVG
 * Требует установки: npm install -D sharp
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '../public');
const svgPath = join(publicDir, 'favicon.svg');
const pngPath = join(publicDir, 'favicon.png');

try {
  const svgBuffer = readFileSync(svgPath);
  
  await sharp(svgBuffer)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 241, g: 245, b: 249, alpha: 1 } // #F1F5F9
    })
    .png()
    .toFile(pngPath);
  
  console.log('✅ PNG иконка успешно создана: favicon.png (512x512)');
} catch (error) {
  console.error('❌ Ошибка при создании PNG иконки:', error.message);
  console.log('\n💡 Установите sharp: npm install -D sharp');
  process.exit(1);
}

