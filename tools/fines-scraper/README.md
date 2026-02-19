# Fines Charging – скрапер за локации

Извлича локации от [finescharging.com/locations](https://finescharging.com/locations) чрез headless браузър (Playwright) и извежда JSON масив на stdout за импорт в платформата.

## Изисквания

- **Node.js** 18+
- Стартиране на backend от **корена на проекта** (`ev-charging-platform`), за да се намери `tools/fines-scraper`.

## Инсталация (веднъж)

```bash
cd tools/fines-scraper
npm install
npx playwright install chromium
```

## Ръчно пускане

```bash
cd tools/fines-scraper
node scrape.js
```

Изходът е един ред JSON (масив от обекти с полета: name, address, city, country, latitude, longitude, maxPowerKw и др.).

## Импорт чрез backend

- **POST** `/api/stations/import/fines-scrape` – стартира скрапера, парсва изхода и записва/актуализира станции в БД (operator: "Fines Charging", externalId: "fines-scrape-...").
- В админ панела: бутон **„Fines (скрапинг)“**.

Конфигурация в `application.properties`:

- `fines.scraper.path=tools/fines-scraper` – път спрямо work dir на приложението
- `fines.scraper.timeout-seconds=60` – таймаут за скрапера

## Как работи

1. Playwright отваря страницата в headless Chromium.
2. Прихваща всички мрежови отговори (XHR/fetch); ако някой е JSON и прилича на списък с локации (lat/lng, name, address), използва го.
3. Ако няма такъв отговор, след 5 s търси маркери в DOM (data-lat/data-lng) или вградени данни в script тагове.
4. Нормализира обектите и извежда масив на stdout.

Ако сайтът на Fines промени източника на данните (друго API или структура), скриптът може да трябва да се адаптира.
