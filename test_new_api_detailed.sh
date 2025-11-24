#!/bin/bash

# Детальный скрипт для тестирования нового API Kinopoisk
# Использование: ./test_new_api_detailed.sh YOUR_BEARER_TOKEN

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

echo "🔍 Детальное тестирование нового API Kinopoisk..."
echo "=========================================="
echo ""

# Функция для сохранения ответа в файл
save_response() {
    local test_name="$1"
    local response="$2"
    local filename="test_results_${test_name}.json"
    echo "$response" > "$filename"
    echo "   💾 Сохранено в: $filename"
}

# Тест 1: Поиск фильма
echo "1️⃣ ТЕСТ: Поиск фильма 'Голяк'"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "${API_BASE}/movie/search?name=Голяк&page=1&limit=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | jq '.' > /dev/null 2>&1; then
    echo "✅ Успешный ответ (JSON валиден):"
    echo "$RESPONSE" | jq '.'
    
    # Извлекаем первый ID для следующих тестов
    FIRST_ID=$(echo "$RESPONSE" | jq -r '.results[0].kp_id // .results[0].id // empty' 2>/dev/null)
    FIRST_NAME=$(echo "$RESPONSE" | jq -r '.results[0].name_ru // .results[0].name // empty' 2>/dev/null)
    
    if [ -n "$FIRST_ID" ]; then
        echo ""
        echo "   📌 Найден фильм: $FIRST_NAME (ID: $FIRST_ID)"
        TEST_MOVIE_ID="$FIRST_ID"
    else
        # Пробуем альтернативные структуры
        FIRST_ID=$(echo "$RESPONSE" | jq -r '.[0].kp_id // .[0].id // empty' 2>/dev/null)
        if [ -n "$FIRST_ID" ]; then
            TEST_MOVIE_ID="$FIRST_ID"
        else
            TEST_MOVIE_ID="435"  # Fallback на известный ID
        fi
    fi
    
    save_response "search_golyak" "$RESPONSE"
else
    echo "❌ Ошибка или невалидный JSON:"
    echo "$RESPONSE"
    TEST_MOVIE_ID="435"  # Fallback
fi

echo ""
echo "=========================================="
echo ""

# Тест 2: Детали фильма
echo "2️⃣ ТЕСТ: Получение деталей фильма (ID: ${TEST_MOVIE_ID})"
echo "----------------------------------------"
RESPONSE=$(curl -s -X GET "${API_BASE}/movie/${TEST_MOVIE_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | jq '.' > /dev/null 2>&1; then
    echo "✅ Успешный ответ:"
    echo "$RESPONSE" | jq '.'
    
    # Проверяем важные поля
    echo ""
    echo "📋 Проверка важных полей:"
    echo "$RESPONSE" | jq '{
        kp_id,
        name_ru,
        name_eng,
        is_serial,
        year_production,
        kino_poisk_rating,
        imdb_rating,
        poster,
        description: (.description // .short_description),
        genres: (.genres | length),
        countries: (.countries | length),
        actors: (.actors | length),
        directors: (.directors | length),
        seasons: (.seasons | type)
    }'
    
    # Проверяем структуру seasons
    echo ""
    echo "🔍 Детальная проверка поля 'seasons':"
    SEASONS_TYPE=$(echo "$RESPONSE" | jq -r '.seasons | type' 2>/dev/null)
    echo "   Тип: $SEASONS_TYPE"
    
    if [ "$SEASONS_TYPE" = "string" ]; then
        echo "   ⚠️  seasons - это строка, возможно JSON:"
        echo "$RESPONSE" | jq -r '.seasons' | head -5
        echo ""
        echo "   Попытка парсинга как JSON:"
        echo "$RESPONSE" | jq -r '.seasons' | jq '.' 2>/dev/null || echo "   ❌ Не валидный JSON"
    elif [ "$SEASONS_TYPE" = "array" ] || [ "$SEASONS_TYPE" = "object" ]; then
        echo "   ✅ seasons - структурированные данные:"
        echo "$RESPONSE" | jq '.seasons'
    else
        echo "   ⚠️  seasons: $SEASONS_TYPE"
    fi
    
    save_response "movie_details_${TEST_MOVIE_ID}" "$RESPONSE"
else
    echo "❌ Ошибка или невалидный JSON:"
    echo "$RESPONSE"
fi

echo ""
echo "=========================================="
echo ""

# Тест 3: Проверка актеров и режиссеров
echo "3️⃣ ТЕСТ: Структура актеров и режиссеров"
echo "----------------------------------------"
if [ -n "$RESPONSE" ] && echo "$RESPONSE" | jq '.' > /dev/null 2>&1; then
    echo "Актеры (первые 3):"
    echo "$RESPONSE" | jq '.actors[0:3]'
    echo ""
    echo "Режиссеры:"
    echo "$RESPONSE" | jq '.directors'
else
    echo "⚠️  Используем предыдущий ответ или делаем новый запрос..."
    RESPONSE=$(curl -s -X GET "${API_BASE}/movie/${TEST_MOVIE_ID}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json")
    echo "$RESPONSE" | jq '{actors: .actors[0:3], directors: .directors}'
fi

echo ""
echo "=========================================="
echo ""

# Тест 4: Проверка изображений
echo "4️⃣ ТЕСТ: Проверка доступности изображений"
echo "----------------------------------------"
if [ -n "$RESPONSE" ] && echo "$RESPONSE" | jq '.' > /dev/null 2>&1; then
    echo "Поля связанные с изображениями:"
    echo "$RESPONSE" | jq '{
        poster,
        additional,
        has_poster: (.poster != null and .poster != ""),
        has_additional: (.additional != null)
    }'
    
    echo ""
    echo "Содержимое поля 'additional':"
    echo "$RESPONSE" | jq '.additional'
else
    RESPONSE=$(curl -s -X GET "${API_BASE}/movie/${TEST_MOVIE_ID}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json")
    echo "$RESPONSE" | jq '{poster, additional}'
fi

echo ""
echo "=========================================="
echo ""

# Тест 5: Поиск сериала
echo "5️⃣ ТЕСТ: Поиск сериала 'Игра престолов'"
echo "----------------------------------------"
SERIES_RESPONSE=$(curl -s -X GET "${API_BASE}/movie/search?name=Игра престолов&page=1&limit=3" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

if echo "$SERIES_RESPONSE" | jq '.' > /dev/null 2>&1; then
    echo "✅ Результаты поиска:"
    echo "$SERIES_RESPONSE" | jq '.results[] | {kp_id, name_ru, is_serial}' 2>/dev/null || \
    echo "$SERIES_RESPONSE" | jq '.[] | {kp_id, name_ru, is_serial}' 2>/dev/null || \
    echo "$SERIES_RESPONSE" | jq '.'
    
    # Ищем сериал
    SERIES_ID=$(echo "$SERIES_RESPONSE" | jq -r '.results[] | select(.is_serial == true) | .kp_id' 2>/dev/null | head -1)
    if [ -z "$SERIES_ID" ]; then
        SERIES_ID=$(echo "$SERIES_RESPONSE" | jq -r '.[] | select(.is_serial == true) | .kp_id' 2>/dev/null | head -1)
    fi
    
    if [ -n "$SERIES_ID" ]; then
        echo ""
        echo "   📺 Найден сериал, ID: $SERIES_ID"
        echo "   Проверяем структуру seasons для сериала:"
        SERIES_DETAILS=$(curl -s -X GET "${API_BASE}/movie/${SERIES_ID}" \
          -H "Authorization: Bearer ${TOKEN}" \
          -H "Content-Type: application/json")
        echo "$SERIES_DETAILS" | jq '{seasons: .seasons, seasons_type: (.seasons | type)}'
    fi
    
    save_response "search_series" "$SERIES_RESPONSE"
else
    echo "❌ Ошибка:"
    echo "$SERIES_RESPONSE"
fi

echo ""
echo "=========================================="
echo ""

# Итоговый отчет
echo "📊 ИТОГОВЫЙ ОТЧЕТ"
echo "=========================================="
echo ""
echo "✅ Проверено:"
echo "   - Поиск фильмов"
echo "   - Детали фильма"
echo "   - Структура актеров/режиссеров"
echo "   - Доступность изображений"
echo "   - Структура сезонов (для сериалов)"
echo ""
echo "📁 Результаты сохранены в файлы test_results_*.json"
echo ""
echo "⚠️  ВАЖНО: Проверьте следующие моменты:"
echo "   1. Формат поля 'seasons' - это строка или объект?"
echo "   2. Есть ли в 'additional' информация об изображениях?"
echo "   3. Соответствует ли структура данных ожиданиям?"
echo ""

