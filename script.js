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

// 🌐 API Endpoints - Centralized configuration for easier maintenance
const API_URLS = {
    WEATHER: "https://api.open-meteo.com/v1/forecast",
    IP_LOOKUP: "https://ipapi.co/json/",
    GEOCODING: "https://api.bigdatacloud.net/data/reverse-geocode-client",
    SEARCH_GEO: "https://geocoding-api.open-meteo.com/v1/search"
};

const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(null, args);
        }, delay);
    };
};


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
            // If suggestions are visible, select the first one instead of running a full search
            if (suggestionsContainer.children.length > 0) {
                suggestionsContainer.children[0].click();
            } else {
                handleSearch();
            }
        }
    });
    
    // 🆕 Add listener for live suggestions, wrapped in a debounce
    searchInput.addEventListener("input", debounce(handleCityInput, 300));

    // Clear suggestions when clicking outside the input
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.searchContainer')) { // Assuming input and suggestions are inside a search container
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.opacity = 0;
        }
    });
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
        
        // Store location data directly on the element
        suggestionDiv.dataset.lat = result.latitude;
        suggestionDiv.dataset.lon = result.longitude;
        suggestionDiv.dataset.city = formattedName;

        // Attach click handler to fetch weather data
        suggestionDiv.addEventListener('click', selectSuggestion);
        
        suggestionsContainer.appendChild(suggestionDiv);
    });
}

function selectSuggestion(e) {
    const { lat, lon, city } = e.target.dataset;
    
    // Update the input field with the selected city for visual confirmation
    searchInput.value = city;
    
    // Clear suggestions
    suggestionsContainer.innerHTML = '';
    suggestionsContainer.style.opacity = 0;
    
    // Fetch the weather for the selected coordinates
    fetchWeather(lat, lon, city);

    // Stop propagation to prevent document click clearing it immediately
    e.stopPropagation(); 
}
/**
 * Attempts to get the user's coordinates via Geolocation API or falls back to IP.
 */
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

/**
 * Handles successful retrieval of user's coordinates.
 * @param {GeolocationPosition} position - The position object from Geolocation API.
 */
async function handleLocationSuccess(position) {
    const { latitude, longitude } = position.coords;
    // cityName is null here, triggering reverse geocoding inside fetchWeather
    await fetchWeather(latitude, longitude); 
}

/**
 * Fetches location data using the user's IP address as a fallback.
 */
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

/**
 * Handles error when retrieving user's coordinates (e.g., permission denied).
 * @param {GeolocationPositionError} err - The error object.
 */
function handleLocationError(err) {
    console.error("Geolocation Error:", err);
    currentWeatherContainer.innerHTML = `<p>Unable to retrieve location. You can use the search bar to find a city. 😔</p>`;
}


// ====================================================================
// 🔍 Search Functionality
// ====================================================================

/**
 * Event handler for the search button/enter key.
 */
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
/**
 * Fetches coordinates for a given city name using a geocoding API.
 * @param {string} cityName - The name of the city to search for.
 */
// async function searchLocation(cityName) {
//     try {
//         const searchUrl = `${API_URLS.SEARCH_GEO}?name=${cityName}&count=1&language=en&format=json`;
//         const res = await fetch(searchUrl);
//         const data = await res.json();

//         if (data.results && data.results.length > 0) {
//             const firstResult = data.results[0];
//             const { latitude, longitude, name, country } = firstResult;
//             // Use a clean, user-friendly name from the search result
//             const formattedCityName = `${name}, ${country}`;
            
//             console.log("Search Result:", formattedCityName, latitude, longitude);
            
//             await fetchWeather(latitude, longitude, formattedCityName);
//         } else {
//             alert(`Location "${cityName}" not found. Try a different name.`);
//         }
//     } catch (error) {
//         console.error("Location Search Error:", error);
//         alert("Failed to search for location. Please check your network.");
//     }
// }


// ====================================================================
// ☁️ Weather Data Fetching and Geocoding
// ====================================================================

 
async function fetchWeather(latitude, longitude, cityName = null) {
    // URL updated to include 'hourly' data (temperature_2m, weather_code)
    const url = `${API_URLS.WEATHER}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&hourly=temperature_2m,weather_code&timezone=auto`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Weather API returned status: ${res.status}`);
        
        const data = await res.json();

        let finalCity = cityName;
        
        // Only perform reverse geocoding if no city name was provided (i.e., from Geolocation API success)
        if (!finalCity) {
            finalCity = await reverseGeocode(latitude, longitude);
        }

        renderCurrentWeather(data.current, data, finalCity);
        renderDailyForecast(data.daily);
        renderHourlyForecast(data.hourly); // Render the new hourly data
    } catch (error) {
        console.error("Weather Fetch Error:", error);
        currentWeatherContainer.innerHTML = `<p>Failed to load weather data 😔</p>`;
    }
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

    const weatherHTML = `
      <div class="metricsCard">
        <div class="miniHeader">Feels Like</div>
        <div class="metrics">${Math.round(current.apparent_temperature)}°</div>
      </div>
      <div class="metricsCard">
        <div class="miniHeader">Humidity</div>
        <div class="metrics">${current.relative_humidity_2m}%</div>
      </div>
      <div class="metricsCard">
        <div class="miniHeader">Wind</div>
        <div class="metrics">${current.wind_speed_10m} km/h</div>
      </div>
      <div class="metricsCard">
        <div class="miniHeader">Precipitation</div>
        <div class="metrics">${current.precipitation} mm</div>
      </div>
    `;

    currentUserLocation.textContent = city;
    dateElement.textContent = formattedDate;
    currentTemp.textContent = `${Math.round(current.temperature_2m)}°`;
    currentWeatherContainer.insertAdjacentHTML("beforeend", weatherHTML);
}

/**
 * Renders the daily forecast cards.
 */
function renderDailyForecast(daily) {
    dailyForecastContainer.innerHTML = "";

    // The API provides daily data, we'll iterate through it.
    daily.time.forEach((time, i) => {
        const date = new Date(time);
        const dayName = date.toLocaleDateString("en-GB", { weekday: "short" });
        const maxTemp = Math.round(daily.temperature_2m_max[i]);
        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const code = daily.weather_code[i];

        const iconClass = getWeatherIconClass(code);

        const cardHTML = `
          <div class="forcastCard">
            <div class="forcastDay">${dayName}</div>
            <div class="forcastIcon ${iconClass}"></div>
            <div class="forcastTemp">
              <div class="forcFrom">${minTemp}°</div>
              <div class="forcTo">${maxTemp}°</div>
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
    
    // We render up to the next 24 hours, starting from the next full hour provided by the API
    const limit = Math.min(24, hourly.time.length); 
    
    // Header setup based on your HTML structure
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
        const temp = Math.round(hourly.temperature_2m[i]);
        const code = hourly.weather_code[i];

        const iconClass = getWeatherIconClass(code);

        const cardHTML = `
          <div class="hourCard">
            <div class="hourHalf">
              <div class="hourIcon ${iconClass}"></div>
              <div class="hourTime">${hourTime}</div>
            </div>
            <div class="hourTemp">${temp}°c</div>
          </div>
        `;
        // Insert after the header
        hourlyForecastContainer.insertAdjacentHTML("beforeend", cardHTML);
    }
}