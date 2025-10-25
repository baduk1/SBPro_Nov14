#!/bin/bash

echo "🔄 БЫСТРЫЙ ПЕРЕЗАПУСК ПРОЕКТА"
echo "================================"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Проверка backend...${NC}"
if [ -f "backend/boq.db" ]; then
    echo -e "${GREEN}✓ База данных найдена${NC}"
else
    echo -e "${RED}✗ База данных не найдена. Создайте её сначала.${NC}"
fi

echo ""
echo -e "${YELLOW}2. Запуск миграций...${NC}"
cd backend

# Активируем виртуальное окружение
if [ -d "env" ]; then
    source env/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
else
    echo -e "${RED}✗ Виртуальное окружение не найдено${NC}"
    exit 1
fi

# Запускаем миграции
echo "   Запуск migrate_add_registration.py..."
python migrate_add_registration.py 2>/dev/null && echo -e "${GREEN}   ✓ Registration migration completed${NC}" || echo -e "${YELLOW}   ⚠ Migration already applied or error${NC}"

echo "   Запуск migrate_add_templates_estimates.py..."
python migrate_add_templates_estimates.py 2>/dev/null && echo -e "${GREEN}   ✓ Templates/Estimates migration completed${NC}" || echo -e "${YELLOW}   ⚠ Migration already applied or error${NC}"

cd ..

echo ""
echo -e "${GREEN}✅ ВСЁ ГОТОВО!${NC}"
echo ""
echo -e "${YELLOW}Следующие шаги:${NC}"
echo "1. Перезапустите backend:"
echo "   cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "2. Перезапустите frontend:"
echo "   cd apps/user-frontend && npm run dev"
echo ""
echo "3. Очистите кэш браузера (Cmd+Shift+R)"
echo ""
