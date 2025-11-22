export function createEmailVerificationTemplate(verificationUrl: string, userName?: string | null): string {
  const greeting = userName ? `Здравствуйте, ${userName}!` : 'Здравствуйте!';
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подтверждение email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; margin-top: 0; font-size: 24px;">Подтверждение email адреса</h1>
    
    <p>${greeting}</p>
    
    <p>Спасибо за регистрацию! Для завершения регистрации необходимо подтвердить ваш email адрес.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Подтвердить email
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Если кнопка не работает, скопируйте и вставьте следующую ссылку в ваш браузер:
    </p>
    <p style="word-break: break-all; color: #007bff; font-size: 14px;">
      ${verificationUrl}
    </p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Эта ссылка действительна в течение 24 часов. Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Это автоматическое письмо, пожалуйста, не отвечайте на него.
    </p>
  </div>
</body>
</html>
  `.trim();
}

export function createResendVerificationTemplate(verificationUrl: string, userName?: string | null): string {
  const greeting = userName ? `Здравствуйте, ${userName}!` : 'Здравствуйте!';
  
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Подтверждение email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; margin-top: 0; font-size: 24px;">Новая ссылка для подтверждения email</h1>
    
    <p>${greeting}</p>
    
    <p>Вы запросили новую ссылку для подтверждения вашего email адреса.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Подтвердить email
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px;">
      Если кнопка не работает, скопируйте и вставьте следующую ссылку в ваш браузер:
    </p>
    <p style="word-break: break-all; color: #007bff; font-size: 14px;">
      ${verificationUrl}
    </p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      Эта ссылка действительна в течение 24 часов.
    </p>
    
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      Это автоматическое письмо, пожалуйста, не отвечайте на него.
    </p>
  </div>
</body>
</html>
  `.trim();
}

