// Weather — live Open-Meteo conditions. Never present sample data as live weather.
class WeatherApp {
    constructor() {
        this.windowId = 'weather';
        this.cities = [
            { name: 'Chennai', latitude: 13.0827, longitude: 80.2707 },
            { name: 'Coimbatore', latitude: 11.0168, longitude: 76.9558 },
            { name: 'Madurai', latitude: 9.9252, longitude: 78.1198 },
            { name: 'Tiruchirappalli', latitude: 10.7905, longitude: 78.7047 },
            { name: 'Salem', latitude: 11.6643, longitude: 78.1460 },
            { name: 'Tirunelveli', latitude: 8.7139, longitude: 77.7567 },
            { name: 'Erode', latitude: 11.3410, longitude: 77.7172 },
            { name: 'Vellore', latitude: 12.9165, longitude: 79.1325 },
            { name: 'Thanjavur', latitude: 10.7870, longitude: 79.1378 },
            { name: 'Ooty', latitude: 11.4064, longitude: 76.6932 }
        ];
        this.abort = null;
    }

    open() {
        const win = windowManager.createWindow(this.windowId, {
            title: 'Weather',
            width: 900,
            height: 700,
            class: 'app-weather',
            icon: (window.AEGIS_APP_ICONS && window.AEGIS_APP_ICONS.weather) || '',
            content: this.render()
        });
        this.attachEvents(win);
        this.loadWeather(win);
        win.addEventListener('close', () => {
            if (this.abort) this.abort.abort();
        });
    }

    render() {
        return `
            <div class="weather-container aegis-app">
                <header class="aegis-app-header">
                    <div>
                        <h2 class="aegis-app-title">Weather</h2>
                        <p class="aegis-app-subtitle">Live conditions from Open-Meteo</p>
                    </div>
                    <div class="aegis-app-toolbar">
                        <button type="button" class="aegis-btn" id="weather-refresh">Refresh</button>
                    </div>
                </header>
                <div class="aegis-app-body">
                    <p class="weather-source">Source: Open-Meteo. This is not a sample dataset.</p>
                    <div class="weather-cities" id="weather-cities"></div>
                </div>
            </div>
        `;
    }

    attachEvents(win) {
        win.querySelector('#weather-refresh')?.addEventListener('click', () => this.loadWeather(win));
    }

    async loadWeather(win) {
        const container = win.querySelector('#weather-cities');
        if (!container) return;
        container.innerHTML = window.AegisAppKit
            ? AegisAppKit.loadingState('Loading live weather')
            : '<p>Loading…</p>';
        if (this.abort) this.abort.abort();
        this.abort = new AbortController();
        try {
            const data = await Promise.all(this.cities.map((city) => this.fetchCity(city, this.abort.signal)));
            container.innerHTML = data.map((city) => this.renderCity(city)).join('');
        } catch (error) {
            if (error.name === 'AbortError') return;
            container.innerHTML = window.AegisAppKit
                ? AegisAppKit.errorState(
                    'Weather is unavailable',
                    'Open-Meteo could not be reached. Check the network and try again.',
                    'Retry',
                    'id="weather-retry"'
                )
                : `<p role="alert">${this.escapeHtml(error.message)}</p>`;
            container.querySelector('#weather-retry')?.addEventListener('click', () => this.loadWeather(win));
        }
    }

    async fetchCity(city, signal) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error('Open-Meteo request failed');
        const json = await response.json();
        const current = json.current || {};
        return {
            name: city.name,
            temp: current.temperature_2m,
            feelsLike: current.apparent_temperature,
            humidity: current.relative_humidity_2m,
            windSpeed: current.wind_speed_10m,
            condition: this.getWeatherCondition(current.weather_code)
        };
    }

    renderCity(city) {
        const temp = city.temp == null ? '—' : `${Math.round(city.temp)}°C`;
        return `
            <article class="weather-city-card">
                <div class="city-name">${this.escapeHtml(city.name)}</div>
                <div class="city-weather-main">
                    <div>
                        <div class="city-temp">${temp}</div>
                        <div class="city-condition">${this.escapeHtml(city.condition)}</div>
                    </div>
                </div>
                <div class="city-details">
                    <div class="city-detail-item"><span>Feels like</span><span>${city.feelsLike == null ? '—' : Math.round(city.feelsLike) + '°C'}</span></div>
                    <div class="city-detail-item"><span>Humidity</span><span>${city.humidity == null ? '—' : city.humidity + '%'}</span></div>
                    <div class="city-detail-item"><span>Wind</span><span>${city.windSpeed == null ? '—' : city.windSpeed + ' km/h'}</span></div>
                </div>
            </article>
        `;
    }

    getWeatherCondition(code) {
        const codes = {
            0: 'Clear', 1: 'Clear', 2: 'Partly cloudy', 3: 'Cloudy',
            45: 'Foggy', 48: 'Foggy', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
            61: 'Rain', 63: 'Rain', 65: 'Rain', 71: 'Snow', 73: 'Snow', 75: 'Snow',
            80: 'Rain', 81: 'Rain', 82: 'Rain', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
        };
        return codes[code] || 'Conditions unavailable';
    }

    escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}

const weatherApp = new WeatherApp();
