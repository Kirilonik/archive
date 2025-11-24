#!/bin/bash

# Скрипт для тестирования нового API Kinopoisk
# Использование: ./test_new_api.sh YOUR_BEARER_TOKEN

TOKEN="${1:-${KINOPOISK_API_TOKEN_NEW}}"

if [ -z "$TOKEN" ]; then
    echo "❌ Ошибка: Токен не указан"
    echo "Использование: $0 YOUR_BEARER_TOKEN"
    echo "Или установите переменную: export KINOPOISK_API_TOKEN_NEW=your_token"
    echo ""
    echo "Получить токен можно через бота: @kinopoiskapiuz_bot"
    exit 1
fi

API_BASE="https://api.kinopoiskapi.uz/v1/kinopoisk"

echo "🔍 Тестирование нового API Kinopoisk..."
echo ""

# Тест 1: Поиск фильма
echo "1️⃣ Тест поиска фильма 'Голяк':"
curl -s -X GET "${API_BASE}/movie/search?name=Голяк&page=1&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || curl -s -X GET "${API_BASE}/movie/search?name=Голяк&page=1&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo ""
echo "---"
echo ""

# Тест 2: Детали фильма (нужен реальный ID, возьмем из первого теста или используем известный)
echo "2️⃣ Тест получения деталей фильма (ID 435):"
curl -s -X GET "${API_BASE}/movie/435" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || curl -s -X GET "${API_BASE}/movie/435" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json"

echo ""
echo "---"
echo ""

# Тест 3: Проверка структуры seasons для сериала
echo "3️⃣ Тест получения сериала (ID 435 - Голяк):"
curl -s -X GET "${API_BASE}/movie/435" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.seasons' 2>/dev/null || echo "Не удалось распарсить JSON"

echo ""
echo "---"
echo ""

# Тест 4: Проверка наличия изображений
echo "4️⃣ Проверка полей изображений:"
curl -s -X GET "${API_BASE}/movie/435" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '{poster, additional}' 2>/dev/null || echo "Не удалось распарсить JSON"

echo ""
echo "✅ Тестирование завершено"

