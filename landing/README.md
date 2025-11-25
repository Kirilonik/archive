# 🎬 Landing Page для Медиа-Архива

Современный одностраничный landing page в стиле Apple с 3D элементами и векторной графикой.

## 🚀 Быстрый старт

```bash
# Перейдите в папку landing
cd landing

# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для production
npm run build

# Превью production сборки
npm run preview
```

Landing page будет доступен на `http://localhost:5174`

> ⚠️ **Важно**: Этот модуль полностью независим от основного приложения. Установите зависимости отдельно в папке `landing/`.

## 📁 Структура

```
landing/
├── src/
│   ├── components/
│   │   ├── Hero.tsx          # Главная секция с hero контентом
│   │   ├── Features.tsx      # Секция с возможностями
│   │   ├── Stats.tsx         # Статистика
│   │   ├── CTA.tsx           # Призыв к действию
│   │   ├── Navbar.tsx        # Навигационная панель
│   │   ├── Floating3D.tsx    # 3D элементы (Three.js)
│   │   └── VectorGraphics.tsx # Векторная графика
│   ├── styles/
│   │   └── globals.css       # Глобальные стили
│   ├── App.tsx               # Главный компонент
│   └── main.tsx              # Точка входа
├── index.html
└── package.json
```

## 🎨 Особенности

- **Минималистичный дизайн** в стиле Apple
- **3D элементы** с использованием Three.js и React Three Fiber
- **Векторная графика** с анимированными линиями и геометрическими фигурами
- **Плавные анимации** с Framer Motion
- **Glassmorphism эффекты** для современного вида
- **Адаптивный дизайн** для всех устройств

## 🛠 Технологии

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Three.js + React Three Fiber
- @react-three/drei

## 📝 Примечания

Этот модуль полностью независим от основного приложения и может быть развернут отдельно.
