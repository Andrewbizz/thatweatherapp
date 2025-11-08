const currentWeatherContainer = document.querySelector(".metricsCards");
const currentUserLocation = document.querySelector(".location");
const dateElement = document.querySelector(".dateTime");
const currentTemp = document.querySelector(".tempValue");

// Run as soon as page loads
window.addEventListener("load", getUserLocation);

// 1️⃣ Get user's coordinates
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      onLocationError
    );
  } else {
    currentWeatherContainer.innerHTML = `<p>Geolocation is not supported by this browser.</p>`;
  }
}

// 2️⃣ On successful location access
async function onLocationSuccess(position) {
  const { latitude, longitude } = position.coords;

  // Fetch weather using Open-Meteo
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,weather_code,relative_humidity_2m&timezone=auto`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // Extract current weather data
    const current = data.current;
    renderCurrentWeather(current, data);
  } catch (error) {
    currentWeatherContainer.innerHTML = `<p>Failed to load weather data 😔</p>`;
    console.error(error);
  }
}

// 3️⃣ On location error
function onLocationError(err) {
  currentWeatherContainer.innerHTML = `<p>Unable to retrieve location. Please allow location access.</p>`;
  console.error(err);
}

// 4️⃣ Render current weather
function renderCurrentWeather(current, data) {
  const locationInfo = data.timezone; // temporary (we’ll replace with city name later)

  // Step 1: Clear existing content
  currentWeatherContainer.innerHTML = "";
  const date = data.current.time;
  const options = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
  const formattedDate = new Date(date).toLocaleDateString(undefined, options);
  // Step 2: Create HTML block
  const weatherHTML = `
 

          <div class="metricsCard">

            <div class="miniHeader">Feels Like</div>
            <div class="metrics">  ${Math.round(
              current.apparent_temperature
            )}°</div>
          </div>

          <div class="metricsCard">

            <div class="miniHeader">Humidity</div>
            <div class="metrics">${current.relative_humidity_2m} %</div>
          </div>

          <div class="metricsCard">

            <div class="miniHeader">Wind</div>
            <div class="metrics">${current.wind_speed_10m} km/h</div>
          </div>


          <div class="metricsCard">

            <div class="miniHeader">Precipitation</div>
            <div class="metrics"> ${current.precipitation} mm</div>
          </div>


  `;



  currentUserLocation.textContent = locationInfo;
dateElement.textContent = formattedDate;
currentTemp.textContent = `${Math.round(current.temperature_2m)}°`;
  console.log(data);
  // Step 3: Insert the new block
  currentWeatherContainer.insertAdjacentHTML("beforeend", weatherHTML);
}
