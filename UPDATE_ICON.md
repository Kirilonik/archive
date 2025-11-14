# Инструкция по обновлению иконки приложения

## Что уже сделано:

✅ Создан `favicon.svg` с буквой "А" в стиле сайта
✅ Обновлен `index.html` для использования SVG иконки
✅ Создан `manifest.json` для PWA поддержки

## Обновление PNG иконки (опционально)

Текущий `favicon.png` можно обновить из SVG следующими способами:

### Способ 1: Онлайн конвертер
1. Откройте https://convertio.co/svg-png/ или https://cloudconvert.com/svg-to-png
2. Загрузите файл `client/public/favicon.svg`
3. Установите размер 512x512px
4. Скачайте и замените `client/public/favicon.png`

### Способ 2: ImageMagick (если установлен)
```bash
cd client/public
convert -background none -resize 512x512 favicon.svg favicon.png
```

### Способ 3: Inkscape (если установлен)
```bash
cd client/public
inkscape favicon.svg --export-filename=favicon.png --export-width=512 --export-height=512
```

### Способ 4: Node.js скрипт (требует установки sharp)
```bash
npm install -g sharp-cli
cd client/public
sharp-cli -i favicon.svg -o favicon.png --resize 512 512
```

## Проверка

После обновления иконки:
1. Перезапустите dev сервер
2. Откройте сайт в браузере
3. Проверьте вкладку - должна отображаться новая иконка с буквой "А"
4. Для PWA: откройте DevTools → Application → Manifest и проверьте иконки

## Размеры иконок для разных платформ

- **512x512** - основной размер для PWA и современных браузеров
- **192x192** - минимальный размер для Android
- **180x180** - размер для Apple Touch Icon (iOS)
- **32x32** - размер для favicon в старых браузерах

Текущий SVG масштабируется автоматически, но для лучшей совместимости рекомендуется иметь PNG версии разных размеров.

