# Стиль дизайна: Мягкий киберпанк с стеклянным эффектом

## Общая концепция

Минималистичный дизайн в стиле "glassmorphism" (стеклянная морфология) с мягкими киберпанк акцентами. Основные принципы:
- **Прозрачность и размытие** (backdrop-filter blur)
- **Мягкие закругления** (border-radius 15-30px)
- **Нежные цвета** с низкой насыщенностью
- **Плавные переходы** (transition)
- **Мягкие тени** для глубины
- **Центрированная компоновка**

## Цветовая палитра

### Фоновые градиенты (с прозрачностью)
```css
/* Soft Purple */
background: linear-gradient(135deg, rgba(138, 43, 226, 0.3) 0%, rgba(75, 0, 130, 0.4) 50%, rgba(138, 43, 226, 0.3) 100%);

/* Gentle Blue */
background: linear-gradient(135deg, rgba(70, 130, 180, 0.3) 0%, rgba(25, 25, 112, 0.4) 50%, rgba(70, 130, 180, 0.3) 100%);

/* Warm Pink */
background: linear-gradient(135deg, rgba(255, 20, 147, 0.3) 0%, rgba(199, 21, 133, 0.4) 50%, rgba(255, 20, 147, 0.3) 100%);

/* Cool Cyan */
background: linear-gradient(135deg, rgba(0, 191, 255, 0.3) 0%, rgba(0, 139, 139, 0.4) 50%, rgba(0, 191, 255, 0.3) 100%);

/* Lavender */
background: linear-gradient(135deg, rgba(230, 230, 250, 0.3) 0%, rgba(147, 112, 219, 0.4) 50%, rgba(230, 230, 250, 0.3) 100%);

/* Mint Dream */
background: linear-gradient(135deg, rgba(152, 251, 152, 0.3) 0%, rgba(64, 224, 208, 0.4) 50%, rgba(152, 251, 152, 0.3) 100%);
```

### Акцентные цвета (для элементов)
- `rgba(138, 43, 226, 0.8)` - Purple
- `rgba(70, 130, 180, 0.8)` - Blue
- `rgba(255, 20, 147, 0.8)` - Pink
- `rgba(0, 191, 255, 0.8)` - Cyan
- `rgba(147, 112, 219, 0.8)` - Lavender
- `rgba(64, 224, 208, 0.8)` - Mint

### Текст
- Основной: `rgba(255, 255, 255, 0.95)`
- Вторичный: `rgba(255, 255, 255, 0.7)`
- Приглушенный: `rgba(255, 255, 255, 0.5)`

## Типографика

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Размеры шрифтов
- Заголовки: `24-28px`, font-weight: `300`, letter-spacing: `2px`
- Основной текст: `13-14px`, font-weight: `500`
- Мелкий текст: `10-11px`, font-weight: `300-500`
- Все тексты: `text-transform: uppercase` для лейблов с `letter-spacing: 1.5-3px`

## Основные компоненты

### Панели (Glassmorphism эффект)
```css
background: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.15);
border-radius: 30px;
padding: 35px;
box-shadow: 
  0 8px 32px rgba(0, 0, 0, 0.2),
  inset 0 1px 0 rgba(255, 255, 255, 0.1);
transition: all 0.3s ease;
```

### Кнопки
```css
background: rgba(255, 255, 255, 0.15);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 18-20px;
padding: 15px 24px;
color: rgba(255, 255, 255, 0.95);
font-size: 20-24px;
transition: all 0.3s ease;
box-shadow: 
  0 4px 15px rgba(0, 0, 0, 0.2),
  inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

### Hover эффект для кнопок
```css
background: rgba(255, 255, 255, 0.25);
transform: translateY(-2px);
box-shadow: 
  0 6px 20px rgba(0, 0, 0, 0.3),
  inset 0 1px 0 rgba(255, 255, 255, 0.15);
```

### Active эффект для кнопок
```css
transform: translateY(0);
box-shadow: 
  0 2px 10px rgba(0, 0, 0, 0.2),
  inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

### Слайдеры (Range inputs)
```css
height: 6px;
background: rgba(255, 255, 255, 0.1);
border-radius: 10px;
border: none;
outline: none;
-webkit-appearance: none;
appearance: none;
cursor: pointer;
transition: all 0.2s ease;
```

### Слайдеры - Thumb (ползунок)
```css
width: 18px;
height: 18px;
background: rgba(255, 255, 255, 0.9);
border-radius: 50%;
cursor: pointer;
box-shadow: 
  0 2px 8px rgba(0, 0, 0, 0.3),
  inset 0 1px 0 rgba(255, 255, 255, 0.5);
transition: all 0.2s ease;
```

### Hover для слайдеров
```css
background: rgba(255, 255, 255, 0.15); /* для track */
background: rgba(255, 255, 255, 1); /* для thumb */
transform: scale(1.1);
box-shadow: 
  0 3px 12px rgba(0, 0, 0, 0.4),
  inset 0 1px 0 rgba(255, 255, 255, 0.6);
```

### Контейнеры с информацией
```css
background: rgba(255, 255, 255, 0.05);
border-radius: 15px;
border: 1px solid rgba(255, 255, 255, 0.1);
padding: 12-18px;
```

### Визуализатор (Audio bars)
```css
display: flex;
align-items: flex-end;
justify-content: center;
gap: 3-4px;
height: 100px;
padding: 12-15px;
background: rgba(0, 0, 0, 0.2);
border-radius: 15px;
border: 1px solid rgba(255, 255, 255, 0.1);
```

### Бар визуализатора
```css
flex: 1;
background: linear-gradient(to top, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.6));
min-height: 5px;
border-radius: 3px 3px 0 0;
box-shadow: 
  0 0 10px rgba(255, 255, 255, 0.3),
  inset 0 0 5px rgba(255, 255, 255, 0.2);
transition: height 0.1s ease, background-color 0.3s ease;
```

## Эффекты и анимации

### Радиальный градиент для фона
```css
background: radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
```

### Плавные переходы
```css
transition: all 0.3s ease; /* для основных элементов */
transition: height 0.1s ease; /* для анимированных элементов */
transition: opacity 0.3s ease, box-shadow 0.3s ease; /* для фоновых эффектов */
```

### Свечение (Glow effect)
```css
box-shadow: 
  0 0 30px rgba(цвет, 0.5),
  inset 0 0 20px rgba(цвет, 0.3);
```

### Динамическое свечение (на основе данных)
```css
box-shadow: 
  0 0 ${30 + level * 50}px ${color},
  inset 0 0 ${20 + level * 30}px ${color};
```

## Layout принципы

### Центрирование
```css
display: flex;
justify-content: center;
align-items: center;
```

### Вертикальный стек
```css
display: flex;
flex-direction: column;
gap: 20px;
align-items: center;
```

### Горизонтальный ряд
```css
display: flex;
justify-content: center;
gap: 15px;
align-items: center;
```

## Адаптивность

### Мобильные устройства (max-width: 768px)
- Уменьшение padding: `25px 20px`
- Уменьшение border-radius: `25px`
- Уменьшение размеров шрифтов
- Уменьшение gap между элементами: `8-12px`

### Малые экраны (max-width: 480px)
- Вертикальная компоновка вместо горизонтальной
- Минимальные размеры элементов
- Скрытие второстепенных элементов

## Ключевые CSS свойства для переиспользования

```css
/* Базовый стеклянный эффект */
.glass-effect {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 30px;
}

/* Мягкая кнопка */
.soft-button {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  transition: all 0.3s ease;
  box-shadow: 
    0 4px 15px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Мягкий контейнер */
.soft-container {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 18px;
}

/* Мягкий слайдер */
.soft-slider {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  border: none;
  -webkit-appearance: none;
  appearance: none;
}

.soft-slider::-webkit-slider-thumb {
  width: 18px;
  height: 18px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
```

## Рекомендации по использованию

1. **Всегда используйте прозрачность** - rgba с альфа-каналом 0.05-0.3 для фонов
2. **Применяйте backdrop-filter** для стеклянного эффекта
3. **Закругления** - минимум 15px для контейнеров, 20px для кнопок
4. **Плавные переходы** - всегда transition для интерактивных элементов
5. **Мягкие тени** - используйте box-shadow для глубины
6. **Центрирование** - основной контент по центру экрана
7. **Минимализм** - убирайте лишние элементы, оставляйте только необходимое

## Пример полной структуры компонента

```css
.my-component {
  /* Glassmorphism */
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  
  /* Границы */
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 30px;
  
  /* Отступы */
  padding: 35px;
  
  /* Тени */
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  
  /* Анимации */
  transition: all 0.3s ease;
}

.my-component:hover {
  box-shadow: 
    0 12px 40px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}
```

Этот стиль создает современный, мягкий и приятный интерфейс с эффектом стекла, который хорошо работает для музыкальных приложений, дашбордов и любых минималистичных интерфейсов.

