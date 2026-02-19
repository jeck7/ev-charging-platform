# Предложение за Интерактивна Карта на Зарядни Станции

## Анализ на конкурентните решения

### Fines Charging (https://finescharging.com/locations)
- ✅ Интерактивна карта с маркери за станциите
- ✅ Филтри: маршрути, конектори (CCS Type 2, CHAdeMO), мощност (50kW, 100kW, 150kW+)
- ✅ Списък на станциите под картата
- ✅ Показване на детайли при кликване

### Electrip (https://electripglobal.com/bg)
- ✅ Интерактивна карта с цветно кодиране по мощност (< 50kw, 50kw-150kw, > 150kw)
- ✅ Филтри за разстояние (5km, 10km, 25km, 50km, 100km)
- ✅ Интеграция с мобилно приложение
- ✅ Показване на детайли за всяка станция

## Предложено решение

### Технологии
**Leaflet.js** (препоръчително):
- ✅ Безплатен и open source
- ✅ Леко и бързо
- ✅ Добра документация
- ✅ Работи на всички устройства
- ✅ Не изисква API ключ

**Алтернатива: Google Maps**
- ⚠️ Изисква API ключ (платено след определен брой заявки)
- ✅ По-добра интеграция с Google услуги
- ✅ Street View, Directions API

### Функционалности

#### 1. Split View (Карта + Списък)
```
┌─────────────────────────────────────────┐
│  [Филтри] [Търсене] [Toggle View]      │
├──────────────────┬──────────────────────┤
│                  │                      │
│   КАРТА          │   СПИСЪК             │
│   (60%)          │   (40%)              │
│                  │                      │
│   [Маркери]      │   [Station Cards]    │
│                  │                      │
└──────────────────┴──────────────────────┘
```

#### 2. Маркери на картата
- 🟢 Зелен: ACTIVE станции
- 🟡 Жълт: MAINTENANCE станции
- 🔴 Червен: INACTIVE станции
- Размер на маркера според мощността (малък/среден/голям)

#### 3. Филтри
- **Статус**: ACTIVE, MAINTENANCE, INACTIVE
- **Мощност**: < 50kW, 50-150kW, > 150kW
- **Конектор**: CCS Type 2, CHAdeMO, Type 2 AC
- **Държава/Град**: Dropdown списък
- **Разстояние**: Ако има user location (5km, 10km, 25km, 50km)

#### 4. Интерактивност
- Кликване на маркер → показва popup с основна информация
- Кликване на станция от списъка → центрира картата на тази станция
- Hover на маркер → показва име на станцията
- Zoom in/out → автоматично филтрира станции в видимата област

#### 5. Допълнителни функции
- **Търсене по име/адрес**: Autocomplete
- **Моята локация**: Бутон за центриране на текущата локация
- **Toggle View**: Покажи само карта / само списък / split view
- **Export**: Изтегли станции като CSV/JSON
- **Share**: Сподели локация на станция

### Структура на компонентите

```
stations-map-view/
├── stations-map-view.component.ts
├── stations-map-view.component.html
├── stations-map-view.component.css
├── map/
│   ├── map.component.ts (Leaflet wrapper)
│   ├── map.component.html
│   └── map.component.css
├── filters/
│   ├── station-filters.component.ts
│   └── station-filters.component.html
└── station-popup/
    └── station-popup.component.ts
```

### Имплементация стъпка по стъпка

#### Стъпка 1: Инсталиране на зависимости
```bash
npm install leaflet @types/leaflet
npm install --save-dev @types/leaflet
```

#### Стъпка 2: Конфигурация на Leaflet
- Добави CSS в `angular.json` или `styles.css`
- Създай wrapper компонент за картата

#### Стъпка 3: Интеграция в stations-list
- Преименувай `stations-list` → `stations-map-view`
- Добави split view layout
- Интегрирай картата и списъка

#### Стъпка 4: Филтри и търсене
- Създай filters компонент
- Добави reactive forms за филтрите
- Синхронизирай филтрите между карта и списък

#### Стъпка 5: Маркери и popups
- Генерирай маркери от станциите
- Добави popup компонент с детайли
- Добави click handlers

### Примерен код структура

```typescript
// stations-map-view.component.ts
export class StationsMapViewComponent {
  stations: ChargingStation[] = [];
  filteredStations: ChargingStation[] = [];
  map: L.Map | null = null;
  markers: L.Marker[] = [];
  
  filters = {
    status: null,
    minPower: null,
    maxPower: null,
    connectorType: null,
    country: null,
    city: null
  };
  
  viewMode: 'map' | 'list' | 'split' = 'split';
  
  // Methods...
}
```

### Препоръки за UX

1. **По подразбиране**: Split view (карта + списък)
2. **Мобилни устройства**: Toggle между карта и списък
3. **Performance**: Lazy loading на маркери при zoom
4. **Accessibility**: Keyboard navigation, ARIA labels
5. **Loading states**: Skeleton loaders за карта и списък

### Следващи стъпки

1. ✅ Инсталиране на Leaflet
2. ✅ Създаване на базов map компонент
3. ✅ Интеграция в stations-list
4. ✅ Добавяне на маркери
5. ✅ Филтри и търсене
6. ✅ Popups и детайли
7. ✅ Responsive design
8. ✅ Тестване
