// Weather Forecast Page
class WeatherForecast {
    constructor() {
        this.cities = [
            'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
            'Tirunelveli', 'Tiruppur', 'Erode', 'Vellore', 'Thoothukudi',
            'Dindigul', 'Thanjavur', 'Hosur', 'Nagercoil', 'Karur',
            'Kanchipuram', 'Neyveli', 'Kumbakonam', 'Cuddalore', 'Avadi',
            'Rajapalayam', 'Pollachi', 'Sivakasi', 'Tiruvannamalai', 'Pudukkottai',
            'Ooty', 'Kodaikanal', 'Yercaud', 'Kanyakumari', 'Mahabalipuram'
        ];
        this.currentCity = null;
        this.init();
    }

    init() {
        const selector = document.getElementById('city-selector');
        
        // Populate city selector
        this.cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            selector.appendChild(option);
        });

        // Handle city selection
        selector.addEventListener('change', (e) => {
            const city = e.target.value;
            if (city) {
                this.loadWeatherForecast(city);
            } else {
                this.showPlaceholder();
            }
        });
    }

    showPlaceholder() {
        const display = document.getElementById('weather-display');
        display.innerHTML = `
            <div class="weather-placeholder">
                <div class="placeholder-icon">🌤️</div>
                <h3>Select a city to view forecast</h3>
                <p>Choose from the dropdown above</p>
            </div>
        `;
    }

    loadWeatherForecast(city) {
        const display = document.getElementById('weather-display');
        display.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div class="window-loading-spinner" style="margin: 0 auto 16px;"></div>
                <p style="color: var(--text-muted);">Loading forecast for ${city}...</p>
            </div>
        `;

        // Generate forecast data (using sample data)
        setTimeout(() => {
            const forecast = this.generateForecast(city);
            this.renderForecast(city, forecast);
        }, 800);
    }

    generateForecast(city) {
        const forecast = {
            current: {
                temp: Math.round(25 + Math.random() * 8),
                condition: ['Partly Cloudy', 'Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
                humidity: Math.round(60 + Math.random() * 30),
                windSpeed: Math.round(5 + Math.random() * 15),
                precipitation: Math.round(Math.random() * 30)
            },
            hourly: [],
            daily: []
        };

        // Generate hourly forecast (24 hours)
        for (let i = 0; i < 24; i++) {
            const hour = new Date();
            hour.setHours(i, 0, 0, 0);
            forecast.hourly.push({
                time: hour.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
                temp: Math.round(22 + Math.random() * 10),
                condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)],
                icon: this.getWeatherIcon(['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)])
            });
        }

        // Generate 7-day forecast
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const condition = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorm'][Math.floor(Math.random() * 5)];
            forecast.daily.push({
                day: i === 0 ? 'Today' : days[date.getDay()],
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                condition: condition,
                icon: this.getWeatherIcon(condition),
                high: Math.round(26 + Math.random() * 6),
                low: Math.round(20 + Math.random() * 5),
                precip: Math.round(Math.random() * 40)
            });
        }

        return forecast;
    }

    getWeatherIcon(condition) {
        const icons = {
            'Sunny': '☀️',
            'Partly Cloudy': '⛅',
            'Cloudy': '☁️',
            'Rainy': '🌧️',
            'Thunderstorm': '⛈️',
            'Clear': '☀️'
        };
        return icons[condition] || '☀️';
    }

    renderForecast(city, forecast) {
        const display = document.getElementById('weather-display');
        
        const hourlyHtml = forecast.hourly.map(hour => `
            <div class="hour-item">
                <div class="hour-time">${hour.time}</div>
                <div class="hour-icon">${hour.icon}</div>
                <div class="hour-temp">${hour.temp}°</div>
            </div>
        `).join('');

        const dailyHtml = forecast.daily.map((day, index) => `
            <div class="day-item ${index === 0 ? 'selected' : ''}">
                <div class="day-name">${day.day}<br><span style="font-size: 12px; color: var(--text-muted); font-weight: 400;">${day.date}</span></div>
                <div class="day-icon">${day.icon}</div>
                <div class="day-condition">${day.condition}</div>
                <div class="day-temps">
                    <div class="day-high">${day.high}°</div>
                    <div class="day-low">${day.low}°</div>
                    <div class="day-precip">${day.precip}%</div>
                </div>
            </div>
        `).join('');

        display.innerHTML = `
            <div class="weather-card">
                <div class="current-weather">
                    <h2 class="city-name-large">${city}</h2>
                    <div class="current-temp">${forecast.current.temp}°C</div>
                    <div class="current-condition">${forecast.current.condition}</div>
                    <div class="weather-details-grid">
                        <div class="weather-detail">
                            <div class="detail-label">Feels Like</div>
                            <div class="detail-value">${forecast.current.temp + 2}°</div>
                        </div>
                        <div class="weather-detail">
                            <div class="detail-label">Humidity</div>
                            <div class="detail-value">${forecast.current.humidity}%</div>
                        </div>
                        <div class="weather-detail">
                            <div class="detail-label">Wind</div>
                            <div class="detail-value">${forecast.current.windSpeed} km/h</div>
                        </div>
                        <div class="weather-detail">
                            <div class="detail-label">Precipitation</div>
                            <div class="detail-value">${forecast.current.precipitation}%</div>
                        </div>
                    </div>
                </div>

                <div class="hourly-forecast">
                    <h3 class="section-title">Hourly Forecast</h3>
                    <div class="hourly-scroll">
                        ${hourlyHtml}
                    </div>
                </div>

                <div class="weekly-forecast">
                    <h3 class="section-title">7-Day Forecast</h3>
                    ${dailyHtml}
                </div>
            </div>
        `;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WeatherForecast();
});

