// A-Frame entities:
const cloudElements = [];

// UI-Elements:
const locationChoiceElement = document.getElementById(`location-choice`);
const gpsCheckbox = document.getElementById("gps-checkbox");
const locationInput = document.getElementById("location-input");
const forecastSlider = document.getElementById("forecast-slider");
const animationToggle = document.getElementById("animation-toggle");

// Misc.:
let capitals;

function getCloudElemsById() {
    for (const direction of ["center", "north", "south", "east", "west"]) {
        cloudElements.push(document.querySelector(`#${direction}-cloud`));
    }
}

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
    let coords = /^\s*(?<latitude>-?\d+\.\d+)[,\s*/\s+](?<longitude>-?\d+\.\d+)\s*$/.exec(coordsStr)?.groups; // null for malformed coordinate strings
    if (!coords || coords.latitude < -90 || coords.latitude > 90 || coords.longitude < -180 || coords.longitude > 180) {
        return null; // invalid geo coordinates
    }
    coords["latitude"] = parseFloat(coords["latitude"]);
    coords["longitude"] = parseFloat(coords["longitude"]);
    return coords;
}

async function showWeather(event) {
    // get and parse the forecast data    
    event?.preventDefault?.();
    const element = document.getElementById("weatherData");
    const pointHourMatrix = await getWeather(getLocationFromInput());
    const hourIdx = forecastSlider.value;
    if (pointHourMatrix) {
        let text =  `C:  ${pointHourMatrix[0][hourIdx].type}, ${pointHourMatrix[0][hourIdx].intensity}\n`;
            text += `N:  ${pointHourMatrix[1][hourIdx].type}, ${pointHourMatrix[1][hourIdx].intensity}\n`;
            text += `S:  ${pointHourMatrix[2][hourIdx].type}, ${pointHourMatrix[2][hourIdx].intensity}\n`;
            text += `E:  ${pointHourMatrix[3][hourIdx].type}, ${pointHourMatrix[3][hourIdx].intensity}\n`;
            text += `W:  ${pointHourMatrix[4][hourIdx].type}, ${pointHourMatrix[4][hourIdx].intensity}`;
        element.innerText = text;

        for (let i = 0; i < cloudElements.length; i++){
            cloudElements[i].dispatchEvent(new CustomEvent('weather-changed', { 
                detail: { 
                    type: pointHourMatrix[i][hourIdx].type, 
                    intensity: pointHourMatrix[i][hourIdx].intensity,
                    animationOn: animationToggle.checked ? i === 0 : false
                }
            }));
        }
    } else {
        element.innerText = "Error retrieving weather data"
    }
    return false;
}

// load current location to input field and visualize weather
async function showLocalWeather() {
    await loadLocationToInput();
    await submitLocation();
}

// visualize weather for location in input field
async function submitLocation() {
    forecastSlider.value = 0;
    await showWeather();
}

document.getElementById("location-form").addEventListener("submit", submitLocation);

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

animationToggle.addEventListener("change",showWeather);
forecastSlider.addEventListener("input", showWeather);