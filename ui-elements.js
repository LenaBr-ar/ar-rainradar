const locationChoiceElement = document.getElementById(`location-choice`);
const gpsCheckbox = document.getElementById("gps-checkbox");
const locationInput = document.getElementById("location-input");
let capitals;

async function populateCapitals() {
    const response = await fetch("./capitals-europe.json");
    if (!response.ok) {
        console.error("Hauptstädte konnten nicht aus der Datei capitals-europe.json geladen werden.");
        return;
    }
    capitals = await response.json();
    const root = document.getElementById("default-places");
    for (let capital in capitals) {
        root.appendChild(new Option("", capital));
    }    
}

async function loadLocationToInput() {
    const coords = await getCoords();
    if (coords.fallback) {
        console.log("Fallback location: T9")
    }
    locationChoiceElement.value = `${coords.latitude.toFixed(6)} ${coords.longitude.toFixed(6)}`;
}

/**
 * Parses geo coordinates from the input field `location-choice` and creates a `coords` object containing `latitude` and `longitude`, if possible.
 * For a valid coordinate representation latitude and longitude must be given as a decimal fraction, 
 * must be separated by a comma or whitespace, and must be valid geo coordinates.
 * @returns `coords` object if the input field contains a valid coordinate representation, otherwise `null`.
 */
function getLocationFromInput() {
    let coordsStr = locationChoiceElement.value;
    if (capitals && capitals[coordsStr]) {
        coordsStr = capitals[coordsStr];
    }
    const coords = /^\s*(?<latitude>-?\d+\.\d+)[,\s*/\s+](?<longitude>-?\d+\.\d+)\s*$/.exec(coordsStr)?.groups; // null for malformed coordinate strings
    if (!coords || coords.latitude < -90 || coords.latitude > 90 || coords.longitude < -180 || coords.longitude > 180) {
        return null; // invalid geo coordinates
    }
    return coords;
}

async function showWeather(event) {
    // get and parse the forecast data    
    event?.preventDefault?.();
    const element = document.getElementById("weatherData");
    const pointHourMatrix = await getWeather(getLocationFromInput());
    if (pointHourMatrix) {
        let text = "The weather here is currently " + pointHourMatrix[0][0] + "\n";
        text += "The weather north is currently " + pointHourMatrix[1][0] + "\n";
        text += "The weather south is currently " + pointHourMatrix[2][0] + "\n";
        text += "The weather east is currently " + pointHourMatrix[3][0] + "\n";
        text += "The weather west is currently " + pointHourMatrix[4][0];
        element.innerText = text;
    } else {
        element.innerText = "Error retrieving weather data"
    }
    return false;
}

async function showLocalWeather() {
    await loadLocationToInput();
    await showWeather();
}

document.getElementById("location-form").addEventListener("submit", showWeather);

locationChoiceElement.addEventListener("input", (event) => {
    // Validate with the built-in constraints
    locationChoiceElement.setCustomValidity("");

    // check for valid geo coordinates
    if (!getLocationFromInput()) {
        locationChoiceElement.setCustomValidity("Keine gültigen Geo-Koordinaten");
    }
});

gpsCheckbox.addEventListener("change", () => {
    if (gpsCheckbox.checked) {
      locationInput.style.visibility = "hidden";
      showLocalWeather();
    } else {
      locationInput.style.visibility = "visible";
    }
});