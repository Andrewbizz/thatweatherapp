// ====================================================================
// 🏠 DOM Element Selectors & API Configuration
// ====================================================================
const currentWeatherContainer = document.querySelector(".metricsCards");
const currentUserLocation = document.querySelector(".location");
const dateElement = document.querySelector(".dateTime");
const currentTemp = document.querySelector(".tempValue");
const dailyForecastContainer = document.querySelector(".dailyForcast");
const hourlyForecastContainer = document.querySelector(".hourlyCard"); 
const searchInput = document.querySelector(".searchInput");
const searchButton = document.querySelector(".searchBtn");
const suggestionsContainer = document.querySelector(".suggestionsContainer"); // 🆕 New selector
const unitsBtn = document.querySelector(".unitsBtn");
const unitsDropdown = document.querySelector(".unitsDropdown");
const unitOptions = document.querySelectorAll(".unitOption");
const switchImperialBtn = document.querySelector(".switchImperialBtn");

// 🌐 API Endpoints - Centralized configuration for easier maintenance
const API_URLS = {
    WEATHER: "https://api.open-meteo.com/v1/forecast",
    IP_LOOKUP: "https://ipapi.co/json/",
    GEOCODING: "https://api.bigdatacloud.net/data/reverse-geocode-client",
    SEARCH_GEO: "https://geocoding-api.open-meteo.com/v1/search"
};

let UNITS = {
    TEMPERATURE: 'celsius', // 'celsius' or 'fahrenheit'
    WIND: 'kmh',            // 'kmh' or 'mph'
    PRECIPITATION: 'mm'     // 'mm' or 'inches'
};
let currentWeatherData = null; // Store fetched data globally for re-rendering

function toFahrenheit(c) {
    return (c * 9 / 5) + 32;
}

 
function toMph(kmh) {
    return kmh * 0.621371;
}

 
function toInches(mm) {
    return mm * 0.0393701;
}

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(null, args);
        }, delay);
    };
};

function setUnit(type, value) {
    let stateKey;
    switch (type) {
        case 'temp':
            stateKey = 'TEMPERATURE';
            break;
        case 'wind':
            stateKey = 'WIND';
            break;
        case 'prec':
            stateKey = 'PRECIPITATION';
            break;
        default:
            return;
    }
     
    UNITS[stateKey] = value;
     
    updateUnitDropdownUI(type, value);
     
    if (currentWeatherData) { 
        const city = currentUserLocation.textContent; 
        renderWeather(currentWeatherData.current, currentWeatherData, city);
    }
}

function toggleUnitsDropdown() {
    unitsDropdown.classList.toggle('visible'); // Assuming you have CSS to show/hide this class
}

function setAllToImperial() {
    UNITS.TEMPERATURE = 'fahrenheit';
    UNITS.WIND = 'mph';
    UNITS.PRECIPITATION = 'inches';
    
    // Update UI for all unit groups
    updateUnitDropdownUI('temp', 'fahrenheit');
    updateUnitDropdownUI('wind', 'mph');
    updateUnitDropdownUI('prec', 'inches');
    
    // Re-render
    if (currentWeatherData) {
        const city = currentUserLocation.textContent;
        renderWeather(currentWeatherData.current, currentWeatherData, city);
    }
}


function updateUnitDropdownUI(type, value) {
    unitOptions.forEach(option => {
        if (option.dataset.unitType === type) {
            option.classList.remove('active');
            if (option.dataset.unitValue === value) {
                option.classList.add('active');
            }
        }
    });
}

// ====================================================================
// 🚀 Initialization and User Location Logic
// ====================================================================

// Run as soon as page loads
window.addEventListener("load", initializeApp);

/**
 * Initializes the application: gets user location and sets up event listeners.
 */
function initializeApp() {
    getUserLocation();
    searchButton.addEventListener("click", handleSearch);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            if (suggestionsContainer.children.length > 0) {
                suggestionsContainer.children[0].click();
            } else {
                handleSearch();
            }
        }
    });
    
    // 🆕 Add listener for live suggestions, wrapped in a debounce
    searchInput.addEventListener("input", debounce(handleCityInput, 300));

    // Clear suggestions when clicking outside the input/dropdowns
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.searchContainer')) { 
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.opacity = 0;
        }
        // Also close the units dropdown if clicked outside
        if (!e.target.closest('.unitsContainer') && unitsDropdown.classList.contains('visible')) {
            unitsDropdown.classList.remove('visible');
        }
    });

    // --- 🆕 Unit Dropdown Listeners ---
    unitsBtn.addEventListener('click', toggleUnitsDropdown);
    switchImperialBtn.addEventListener('click', setAllToImperial);
    
    unitOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            const type = e.currentTarget.dataset.unitType;
            const value = e.currentTarget.dataset.unitValue;
            setUnit(type, value);
        });
    });
    // ---------------------------------
}

async function handleCityInput() {
    const query = searchInput.value.trim();
    if (query.length < 3) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.opacity = 0;
        return;
    }

    await fetchSuggestions(query);
}

async function fetchSuggestions(query) {
    try {
        const searchUrl = `${API_URLS.SEARCH_GEO}?name=${query}&count=5&language=en&format=json`;
        const res = await fetch(searchUrl);
        const data = await res.json();

        if (data.results) {
            renderSuggestions(data.results);
        } else {
            suggestionsContainer.innerHTML = '';
        }
    } catch (error) {
        console.error("Suggestion Fetch Error:", error);
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.opacity = 0;
    }
}


function renderSuggestions(results) {
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.opacity = 1;
    
    results.forEach(result => {
        // Format as "City, Country"
        const formattedName = `${result.name}, ${result.country}`;
        
        const suggestionDiv = document.createElement('div');
        suggestionDiv.classList.add('suggestionItem');
        suggestionDiv.textContent = formattedName; 
        suggestionDiv.dataset.lat = result.latitude;
        suggestionDiv.dataset.lon = result.longitude;
        suggestionDiv.dataset.city = formattedName;
 
        suggestionDiv.addEventListener('click', selectSuggestion);
        
        suggestionsContainer.appendChild(suggestionDiv);
    });
}

function selectSuggestion(e) {
    const { lat, lon, city } = e.target.dataset;
     
    searchInput.value = city;
     
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.opacity = 0;
     
    fetchWeather(lat, lon, city);
 
    e.stopPropagation(); 
}
 
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            handleLocationSuccess, 
            async () => {
                console.warn("Geolocation failed — using IP fallback.");
                await getLocationFromIP();
            }, 
            handleLocationError // Added error handler for Geolocation permission issues
        );
    } else {
        getLocationFromIP();
    }
}

 
async function handleLocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    // cityName is null here, triggering reverse geocoding inside fetchWeather
    await fetchWeather(latitude, longitude); 
}

 
async function getLocationFromIP() {
    try {
        const res = await fetch(API_URLS.IP_LOOKUP);
        const data = await res.json();
        const { latitude, longitude, city } = data;

        console.log("Fallback Location:", city, latitude, longitude);
        // Pass the city name to avoid another reverse geocoding call
        await fetchWeather(latitude, longitude, city); 
    } catch (err) {
        console.error("IP-based location failed:", err);
        currentWeatherContainer.innerHTML =
            "<p>Unable to retrieve location. Please check your network or use the search bar. 😔</p>";
    }
}

 
function handleLocationError(err) {
    console.error("Geolocation Error:", err);
    currentWeatherContainer.innerHTML = `<p>Unable to retrieve location. You can use the search bar to find a city. 😔</p>`;
}

 
async function handleSearch() {
    const cityName = searchInput.value.trim();
    if (!cityName) return;

    // Use the first result from the full search API call
    try {
        const searchUrl = `${API_URLS.SEARCH_GEO}?name=${cityName}&count=1&language=en&format=json`;
        const res = await fetch(searchUrl);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const firstResult = data.results[0];
            const formattedCityName = `${firstResult.name}, ${firstResult.country}`;
            
            searchInput.value = formattedCityName; // Update input
            suggestionsContainer.innerHTML = '';   // Clear suggestions

            await fetchWeather(firstResult.latitude, firstResult.longitude, formattedCityName);
        } else {
            alert(`Location "${cityName}" not found. Try a different name.`);
        }
    } catch (error) {
        console.error("Location Search Error:", error);
        alert("Failed to search for location. Please check your network.");
    }
}
 

 
async function fetchWeather(latitude, longitude, cityName = null) {
    const url = `${API_URLS.WEATHER}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&hourly=temperature_2m,weather_code&timezone=auto`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Weather API returned status: ${res.status}`);
        
        const data = await res.json();
        
        // --- 🆕 Store data globally before potential geocoding ---
        currentWeatherData = data;
        // --------------------------------------------------------

        let finalCity = cityName;
        
        if (!finalCity) {
            finalCity = await reverseGeocode(latitude, longitude);
        }

        // Use a single wrapper function to call all rendering functions
        renderWeather(data.current, data, finalCity);
        
    } catch (error) {
        console.error("Weather Fetch Error:", error);
        currentWeatherContainer.innerHTML = `<p>Failed to load weather data 😔</p>`;
    }
}

// 🆕 New wrapper function to simplify re-rendering
function renderWeather(current, data, city) {
    renderCurrentWeather(current, data, city);
    renderDailyForecast(data.daily);
    renderHourlyForecast(data.hourly);
}

/**
 * Performs reverse geocoding to get a city name from coordinates.
 * @param {number} lat - Latitude.
 * @param {number} lon - Longitude.
 * @returns {Promise<string>} - The formatted city name.
 */
async function reverseGeocode(lat, lon) {
    try {
        const geoRes = await fetch(
            `${API_URLS.GEOCODING}?latitude=${lat}&longitude=${lon}&localityLanguage=en`
        );
        const geoData = await geoRes.json();
        
        // Prioritize city, then locality, then a fallback for country name
        return `${geoData.city || geoData.locality || "Unknown Location"}, ${geoData.countryName || ""}`.trim().replace(/,$/, '');
    } catch (err) {
        console.error("Reverse Geocoding Failed:", err);
        return "Unknown Location";
    }
}


// ====================================================================
// 🎨 Rendering Functions
// ====================================================================

/**
 * Maps a weather code (WMO code) to a custom CSS icon class name.
 * @param {number} code - The WMO weather code.
 * @returns {string} - The corresponding CSS class name.
 */
function getWeatherIconClass(code) {
    if ([0].includes(code)) return "sunny";
    if ([1, 2].includes(code)) return "partCloud";
    if ([3].includes(code)) return "cloudy";
    if ([45, 48].includes(code)) return "foggy";
    if ([51, 53, 55, 56, 57].includes(code)) return "rainy";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "stormy";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
    if ([95, 96, 99].includes(code)) return "windy";
    return "partCloud"; // default
}

/**
 * Renders the main current weather section and metrics cards.
 */
function renderCurrentWeather(current, data, city) {
    currentWeatherContainer.innerHTML = "";

    const date = data.current.time;
    const options = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
    const formattedDate = new Date(date).toLocaleDateString(undefined, options);

    // --- UNIT CONVERSION LOGIC ---
    let currentTempVal = current.temperature_2m;
    let apparentTempVal = current.apparent_temperature;
    let windSpeedVal = current.wind_speed_10m;
    let precipitationVal = current.precipitation;
    let tempUnit = '°';
    let windUnit = 'km/h';
    let precUnit = 'mm';

    if (UNITS.TEMPERATURE === 'fahrenheit') {
        currentTempVal = toFahrenheit(currentTempVal);
        apparentTempVal = toFahrenheit(apparentTempVal);
        tempUnit = '°';
    }

    if (UNITS.WIND === 'mph') {
        windSpeedVal = toMph(windSpeedVal);
        windUnit = 'mph';
    }

    if (UNITS.PRECIPITATION === 'inches') {
        precipitationVal = toInches(precipitationVal);
        precUnit = 'in';
    }
    // ---------------------------

    const weatherHTML = `
      <div class="metricsCard">
        <div class="miniHeader">Feels Like</div>
        <div class="metrics">${Math.round(apparentTempVal)}${tempUnit}</div>
      </div>
      <div class="metricsCard">
        <div class="miniHeader">Humidity</div>
        <div class="metrics">${current.relative_humidity_2m}%</div>
      </div>
      <div class="metricsCard">
        <div class="miniHeader">Wind</div>
        <div class="metrics">${windSpeedVal.toFixed(1)} ${windUnit}</div>
      </div>
      <div class="metricsCard">
        <div class="miniHeader">Precipitation</div>
        <div class="metrics">${precipitationVal.toFixed(1)} ${precUnit}</div>
      </div>
    `;

    currentUserLocation.textContent = city;
    dateElement.textContent = formattedDate;
    currentTemp.textContent = `${Math.round(currentTempVal)}${tempUnit}`;
    currentWeatherContainer.insertAdjacentHTML("beforeend", weatherHTML);
}

/**
 * Renders the daily forecast cards.
 */
function renderDailyForecast(daily) {
    dailyForecastContainer.innerHTML = "";
    
    // Determine the temperature unit and conversion function to use
    const tempUnit = UNITS.TEMPERATURE === 'fahrenheit' ? '°' : '°'; 
    const convertTemp = UNITS.TEMPERATURE === 'fahrenheit' ? toFahrenheit : (t) => t;

    daily.time.forEach((time, i) => {
        const date = new Date(time);
        const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
        
        // Apply conversion
        const maxTemp = Math.round(convertTemp(daily.temperature_2m_max[i]));
        const minTemp = Math.round(convertTemp(daily.temperature_2m_min[i]));
        
        const code = daily.weather_code[i];
        const iconClass = getWeatherIconClass(code);

        const cardHTML = `
          <div class="forcastCard">
            <div class="forcastDay">${dayName}</div>
            <div class="forcastIcon ${iconClass}"></div>
            <div class="forcastTemp">
              <div class="forcFrom">${minTemp}${tempUnit}</div>
              <div class="forcTo">${maxTemp}${tempUnit}</div>
            </div>
          </div>
        `;
        dailyForecastContainer.insertAdjacentHTML("beforeend", cardHTML);
    });
}

/**
 * Renders the hourly forecast cards for the next 24 hours.
 */
function renderHourlyForecast(hourly) {
    if (!hourlyForecastContainer) {
        console.warn("Hourly forecast container not found in DOM.");
        return;
    }
    hourlyForecastContainer.innerHTML = ""; 
    
    // Determine the temperature unit and conversion function to use
    const tempUnit = UNITS.TEMPERATURE === 'fahrenheit' ? '°' : '°'; 
    const convertTemp = UNITS.TEMPERATURE === 'fahrenheit' ? toFahrenheit : (t) => t;
    
    const limit = Math.min(24, hourly.time.length); 
    const currentDayName = new Date(hourly.time[0]).toLocaleDateString("en-GB", { weekday: "long" });
    
    const headerHTML = `
      <div class="headDetails">
        <div class="headTitle">Hourly Forecast</div>
        <div class="headDayDropDown">${currentDayName}</div>
      </div>
    `;
    hourlyForecastContainer.insertAdjacentHTML("afterbegin", headerHTML);

    for (let i = 0; i < limit; i++) {
        const time = new Date(hourly.time[i]);
        const hourTime = time.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
        
        // Apply conversion
        const temp = Math.round(convertTemp(hourly.temperature_2m[i]));
        
        const code = hourly.weather_code[i];
        const iconClass = getWeatherIconClass(code);

        const cardHTML = `
          <div class="hourCard">
            <div class="hourHalf">
              <div class="hourIcon ${iconClass}"></div>
              <div class="hourTime">${hourTime}</div>
            </div>
            <div class="hourTemp">${temp}${tempUnit}</div>
          </div>
        `;
        hourlyForecastContainer.insertAdjacentHTML("beforeend", cardHTML);
    }
}