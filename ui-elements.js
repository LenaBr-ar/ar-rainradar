async function loadLocationToInput() {
    element = document.getElementById(`location-choice`)
    const coords = await getPositionOrFallback();
    if (coords.fallback) {
        console.log("Fallback location: T9")
    }
    element.value = `${coords.latitude.toFixed(6)} ${coords.longitude.toFixed(6)}`;
}

function getLocationFromInputOrNull() {
    coordsStr = document.getElementById(`location-choice`).value;
    coords = /^\s*(?<latitude>-?\d+\.\d+)[,/\s+](?<longitude>-?\d+\.\d+)\s*$/.exec(coordsStr)?.groups; // null for malformed coordinate strings
    if (coords.latitude < -90 || coords.latitude > 90 || coords.longitude < -180 || coords.longitude > 180) {
        return null; // invalid geo coordinates
    }
    return coords;
}

async function showWeather(event) {
    // get and parse the forecast data    
    event?.preventDefault?.();
    element = document.getElementById("weatherData");
    weatherData = await getWeatherData(getLocationFromInputOrNull());
    if (weatherData){
        element.innerText = "The weather will be " + parseWeather(weatherData);
    } else {
        element.innerText = "Error retrieving weather data"
    }
    return false;
}

async function showLocalWeather() {
    await loadLocationToInput();
    await showWeather();
}

