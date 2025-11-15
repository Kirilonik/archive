import sharp from 'sharp';
import type { AvatarProcessor } from '../../domain/users/user.types.js';

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 2048;

export class SharpAvatarProcessor implements AvatarProcessor {
  async process(dataUrl: string): Promise<string> {
    if (!dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return dataUrl;
    const base64 = dataUrl.slice(commaIdx + 1);
    
    // Проверка размера base64 строки до декодирования (примерно 4/3 от размера бинарных данных)
    // Максимальный размер base64 для 5MB файла: ~6.67MB
    const MAX_BASE64_SIZE = Math.ceil(MAX_AVATAR_SIZE * 4 / 3);
    if (base64.length > MAX_BASE64_SIZE) {
      throw new Error(`Размер файла превышает ${MAX_AVATAR_SIZE / 1024 / 1024}MB`);
    }
    
    const input = Buffer.from(base64, 'base64');

    // Проверка размера файла
    if (input.length > MAX_AVATAR_SIZE) {
      throw new Error(`Размер файла превышает ${MAX_AVATAR_SIZE / 1024 / 1024}MB`);
    }

    // Получаем метаданные для проверки размеров
    const metadata = await sharp(input).metadata();
    if (metadata.width && metadata.width > MAX_DIMENSION) {
      throw new Error(`Ширина изображения превышает ${MAX_DIMENSION}px`);
    }
    if (metadata.height && metadata.height > MAX_DIMENSION) {
      throw new Error(`Высота изображения превышает ${MAX_DIMENSION}px`);
    }

    const output = await sharp(input)
      .resize({ width: 512, height: 512, fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const encoded = output.toString('base64');
    return `data:image/webp;base64,${encoded}`;
  }
}

