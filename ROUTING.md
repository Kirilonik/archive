# Роутинг приложения

## Структура роутов

### Landing Page (Точка входа)

- `/` - Landing page с презентацией приложения

### Основное приложение (под `/app`)

- `/app` - Главная страница (Home)
- `/app/profile` - Профиль пользователя
- `/app/youtube` - YouTube интеграция
- `/app/films/:id` - Детали фильма
- `/app/series/:id` - Детали сериала

### Авторизация (под `/app`)

- `/app/login` - Вход в систему
- `/app/register` - Регистрация
- `/app/check-email` - Проверка email
- `/app/verify-email` - Подтверждение email
- `/app/forgot-password` - Восстановление пароля
- `/app/reset-password` - Сброс пароля

## Редиректы

- Старые пути `/login` и `/register` автоматически редиректятся на `/app/login` и `/app/register`
- Все неизвестные пути редиректятся на `/` (landing page)
- Неавторизованные пользователи редиректятся на `/app/login`

## Развертывание

Landing page интегрирован в основное приложение и разворачивается вместе с ним. Все компоненты landing находятся в `client/src/components/landing/`.
