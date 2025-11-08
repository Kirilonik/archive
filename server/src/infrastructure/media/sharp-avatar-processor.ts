import sharp from 'sharp';
import type { AvatarProcessor } from '../../domain/users/user.types.js';

export class SharpAvatarProcessor implements AvatarProcessor {
  async process(dataUrl: string): Promise<string> {
    if (!dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return dataUrl;
    const base64 = dataUrl.slice(commaIdx + 1);
    const input = Buffer.from(base64, 'base64');

    const output = await sharp(input)
      .resize({ width: 512, height: 512, fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const encoded = output.toString('base64');
    return `data:image/webp;base64,${encoded}`;
  }
}

