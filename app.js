const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const WEEKDAYS = [
  "неділя",
  "понеділок",
  "вівторок",
  "середа",
  "четвер",
  "пʼятниця",
  "субота",
];

const MONTHS = [
  "січ",
  "лют",
  "бер",
  "кві",
  "тра",
  "чер",
  "лип",
  "сер",
  "вер",
  "жов",
  "лис",
  "гру",
];

const WEATHER = {
  0: { label: "Ясно", icon: "sun", effect: "sunny" },
  1: { label: "Переважно ясно", icon: "sun", effect: "sunny" },
  2: { label: "Мінлива хмарність", icon: "partly", effect: "sunny" },
  3: { label: "Хмарно", icon: "cloud", effect: null },
  45: { label: "Туман", icon: "fog", effect: null },
  48: { label: "Інійний туман", icon: "fog", effect: null },
  51: { label: "Мряка", icon: "drizzle", effect: "rainy" },
  53: { label: "Мряка", icon: "drizzle", effect: "rainy" },
  55: { label: "Сильна мряка", icon: "drizzle", effect: "rainy" },
  56: { label: "Крижана мряка", icon: "drizzle", effect: "rainy" },
  57: { label: "Крижана мряка", icon: "drizzle", effect: "rainy" },
  61: { label: "Невеликий дощ", icon: "rain", effect: "rainy" },
  63: { label: "Дощ", icon: "rain", effect: "rainy" },
  65: { label: "Сильний дощ", icon: "rain", effect: "rainy" },
  66: { label: "Крижаний дощ", icon: "rain", effect: "rainy" },
  67: { label: "Сильний крижаний дощ", icon: "rain", effect: "rainy" },
  71: { label: "Невеликий сніг", icon: "snow", effect: "snowy" },
  73: { label: "Сніг", icon: "snow", effect: "snowy" },
  75: { label: "Сильний сніг", icon: "snow", effect: "snowy" },
  77: { label: "Снігові зерна", icon: "snow", effect: "snowy" },
  80: { label: "Невеликі зливи", icon: "rain", effect: "rainy" },
  81: { label: "Зливи", icon: "rain", effect: "rainy" },
  82: { label: "Сильні зливи", icon: "rain", effect: "rainy" },
  85: { label: "Снігові зливи", icon: "snow", effect: "snowy" },
  86: { label: "Сильні снігові зливи", icon: "snow", effect: "snowy" },
  95: { label: "Гроза", icon: "thunder", effect: "rainy" },
  96: { label: "Гроза з градом", icon: "thunder", effect: "rainy" },
  99: { label: "Сильна гроза з градом", icon: "thunder", effect: "rainy" },
};

const EFFECT_CLASSES = ["is-sunny", "is-snowy", "is-rainy"];
const snowLayer = document.getElementById("fx-snow");
const SNOWFLAKE_CHARS = ["❄", "❅", "❆", "·", "✦"];
let snowBuilt = false;

const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const statusEl = document.getElementById("status");
const suggestionsEl = document.getElementById("suggestions");
const forecastEl = document.getElementById("forecast");
const heroEl = document.getElementById("hero-weather");
const placeNameEl = document.getElementById("place-name");
const todayTempEl = document.getElementById("today-temp");
const todayDescEl = document.getElementById("today-desc");
const todayMetaEl = document.getElementById("today-meta");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = cityInput.value.trim();
  if (!query) return;

  setStatus("Шукаємо місто…");
  hideSuggestions();

  try {
    const places = await searchPlaces(query);
    if (!places.length) {
      setStatus("Місто не знайдено. Спробуйте іншу назву.", true);
      return;
    }

    if (places.length === 1) {
      await loadForecast(places[0]);
      return;
    }

    showSuggestions(places);
    setStatus("Оберіть місто зі списку:");
  } catch (error) {
    console.error(error);
    setStatus("Не вдалося отримати дані. Перевірте інтернет і спробуйте ще раз.", true);
  }
});

async function searchPlaces(name) {
  const url = new URL(GEO_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "uk");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Geocoding failed");

  const data = await response.json();
  return data.results || [];
}

async function loadForecast(place) {
  hideSuggestions();
  setStatus("Завантажуємо прогноз…");

  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", place.latitude);
  url.searchParams.set("longitude", place.longitude);
  url.searchParams.set(
    "daily",
    [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(",")
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "7");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Forecast failed");

  const data = await response.json();
  renderPlace(place);
  renderHero(place, data.daily);
  renderWeek(data.daily);
  setStatus("");
}

function renderPlace(place) {
  const parts = [place.name];
  if (place.admin1) parts.push(place.admin1);
  if (place.country) parts.push(place.country);
  placeNameEl.textContent = parts.join(", ");
}

function renderHero(place, daily) {
  const code = daily.weather_code[0];
  const weather = describeWeather(code);
  const max = Math.round(daily.temperature_2m_max[0]);
  const min = Math.round(daily.temperature_2m_min[0]);
  const rainChance = daily.precipitation_probability_max[0];
  const wind = Math.round(daily.wind_speed_10m_max[0]);

  todayTempEl.textContent = `${max}°`;
  todayDescEl.textContent = weather.label;
  todayMetaEl.innerHTML = `
    <span>мін. ${min}°</span>
    <span>опади ${rainChance ?? 0}%</span>
    <span>вітер до ${wind} км/год</span>
  `;
  heroEl.hidden = false;
  setWeatherEffect(weather.effect);
}

function setWeatherEffect(effect) {
  EFFECT_CLASSES.forEach((cls) => document.body.classList.remove(cls));

  if (effect === "sunny") {
    document.body.classList.add("is-sunny");
  } else if (effect === "snowy") {
    document.body.classList.add("is-snowy");
    ensureSnowflakes();
  } else if (effect === "rainy") {
    document.body.classList.add("is-rainy");
  }
}

function ensureSnowflakes() {
  if (snowBuilt || !snowLayer) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = reduceMotion ? 12 : 48;

  for (let i = 0; i < count; i += 1) {
    const flake = document.createElement("span");
    flake.className = "snowflake";
    flake.textContent = SNOWFLAKE_CHARS[i % SNOWFLAKE_CHARS.length];

    const size = 10 + Math.random() * 16;
    const left = Math.random() * 100;
    const duration = 8 + Math.random() * 12;
    const delay = Math.random() * -20;
    const drift = `${(Math.random() * 80 - 40).toFixed(0)}px`;

    flake.style.left = `${left}%`;
    flake.style.fontSize = `${size}px`;
    flake.style.animationDuration = `${duration}s`;
    flake.style.animationDelay = `${delay}s`;
    flake.style.setProperty("--drift", drift);
    flake.style.opacity = String(0.45 + Math.random() * 0.5);

    snowLayer.appendChild(flake);
  }

  snowBuilt = true;
}

function describeWeather(code) {
  return WEATHER[code] || { label: "Невідомо", icon: "cloud", effect: null };
}

function renderWeek(daily) {
  forecastEl.innerHTML = "";

  daily.time.forEach((isoDate, index) => {
    const date = new Date(`${isoDate}T12:00:00`);
    const code = daily.weather_code[index];
    const weather = describeWeather(code);
    const max = Math.round(daily.temperature_2m_max[index]);
    const min = Math.round(daily.temperature_2m_min[index]);
    const precip = daily.precipitation_sum[index];
    const isToday = index === 0;

    const card = document.createElement("article");
    card.className = `day${isToday ? " is-today" : ""}`;
    card.style.animationDelay = `${index * 0.05}s`;
    card.innerHTML = `
      <p class="day__name">${isToday ? "сьогодні" : WEEKDAYS[date.getDay()]}</p>
      <p class="day__date">${date.getDate()} ${MONTHS[date.getMonth()]}</p>
      ${weatherIcon(weather.icon)}
      <p class="day__temps">${max}° <span>/ ${min}°</span></p>
      <p class="day__extra">${weather.label}</p>
      <p class="day__extra">${precip > 0 ? `опади ${precip} мм` : "без опадів"}</p>
    `;
    forecastEl.appendChild(card);
  });
}

function weatherIcon(type) {
  const icons = {
    sun: `<svg class="day__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="9" fill="#E8A04A"/>
      <g stroke="#E8A04A" stroke-width="2.5" stroke-linecap="round">
        <path d="M24 6v4M24 38v4M6 24h4M38 24h4M11 11l3 3M34 34l3 3M11 37l3-3M34 14l3-3"/>
      </g>
    </svg>`,
    partly: `<svg class="day__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <circle cx="18" cy="18" r="7" fill="#E8A04A"/>
      <path d="M16 34h18a7 7 0 0 0 0-14 9.5 9.5 0 0 0-18.3 3A6.5 6.5 0 0 0 16 34Z" fill="#D7E3EF" stroke="#9BB4CB" stroke-width="1.5"/>
    </svg>`,
    cloud: `<svg class="day__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M14 34h20a8 8 0 0 0 0-16 11 11 0 0 0-21.2 3.5A7.5 7.5 0 0 0 14 34Z" fill="#D7E3EF" stroke="#9BB4CB" stroke-width="1.5"/>
    </svg>`,
    fog: `<svg class="day__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M14 22h20a7 7 0 0 0 0-14 9.5 9.5 0 0 0-18.4 3A6.5 6.5 0 0 0 14 22Z" fill="#D7E3EF"/>
      <g stroke="#9BB4CB" stroke-width="2.2" stroke-linecap="round">
        <path d="M10 28h28M13 33h22M16 38h16"/>
      </g>
    </svg>`,
    drizzle: `<svg class="day__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M14 24h20a7 7 0 0 0 0-14 9.5 9.5 0 0 0-18.4 3A6.5 6.5 0 0 0 14 24Z" fill="#D7E3EF"/>
      <g stroke="#4A7FB5" stroke-width="2.2" stroke-linecap="round">
        <path d="M18 30v4M24 29v5M30 30v4"/>
      </g>
    </svg>`,
    rain: `<svg class="day__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M14 22h20a7 7 0 0 0 0-14 9.5 9.5 0 0 0-18.4 3A6.5 6.5 0 0 0 14 22Z" fill="#C9D8E8"/>
      <g stroke="#4A7FB5" stroke-width="2.4" stroke-linecap="round">
        <path d="M17 28v7M24 27v9M31 28v7"/>
      </g>
    </svg>`,
    snow: `<svg class="day__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M14 22h20a7 7 0 0 0 0-14 9.5 9.5 0 0 0-18.4 3A6.5 6.5 0 0 0 14 22Z" fill="#E6EEF6"/>
      <g stroke="#7EA0C2" stroke-width="2" stroke-linecap="round">
        <path d="M18 30v6M15 33h6M24 29v8M21 33h6M30 30v6M27 33h6"/>
      </g>
    </svg>`,
    thunder: `<svg class="day__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M14 20h20a7 7 0 0 0 0-14 9.5 9.5 0 0 0-18.4 3A6.5 6.5 0 0 0 14 20Z" fill="#B8C7D8"/>
      <path d="M26 22 19 34h6l-2 8 10-14h-6l5-6h-6Z" fill="#E8A04A"/>
    </svg>`,
  };

  return icons[type] || icons.cloud;
}

function showSuggestions(places) {
  suggestionsEl.innerHTML = "";
  places.forEach((place) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    const bits = [place.name];
    if (place.admin1) bits.push(place.admin1);
    if (place.country) bits.push(place.country);
    button.textContent = bits.join(", ");
    button.addEventListener("click", () => {
      cityInput.value = place.name;
      loadForecast(place).catch((error) => {
        console.error(error);
        setStatus("Не вдалося завантажити прогноз.", true);
      });
    });
    li.appendChild(button);
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.hidden = false;
}

function hideSuggestions() {
  suggestionsEl.hidden = true;
  suggestionsEl.innerHTML = "";
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

// Стартове місто — Київ
(async function init() {
  cityInput.value = "Київ";
  setStatus("Завантажуємо погоду для Києва…");
  try {
    const places = await searchPlaces("Київ");
    if (places.length) {
      await loadForecast(places[0]);
    } else {
      setStatus("Введіть місто, щоб побачити прогноз.");
    }
  } catch (error) {
    console.error(error);
    setStatus("Введіть місто, щоб побачити прогноз.");
  }
})();
