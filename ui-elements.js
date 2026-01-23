// A-Frame entities:
const fixedCloudsEle = document.querySelector(`#fixed-clouds`);

// UI-Elements:
const locationChoiceElement = document.getElementById(`location-choice`);
const gpsCheckbox = document.getElementById("gps-checkbox");
const locationInput = document.getElementById("location-input");
const forecastSlider = document.getElementById("forecast-slider");
const animationToggle = document.getElementById("animation-toggle");
const precipScales = [document.getElementById("rain-scale"), document.getElementById("snow-scale"), document.getElementById("hail-scale")];
const scaleIcon = document.getElementById("scale-icon");

// Misc.:
let capitals;
let currScaleIdx = 0;
const iconNames = ["water-outline", "snowflake", "decagram-outline"];

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
        
        const sector = ["centerSector", "northSector", "southSector", "eastSector", "westSector"];
        for (let i = 0; i < pointHourMatrix.length; i++){
            fixedCloudsEle.dispatchEvent(new CustomEvent('sector-weather-changed', { 
                detail: { 
                    sector: sector[i],
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

// send a different weather event to each cloud sector
function dbgWeatherEvents() {
    const sector = ["centerSector", "northSector", "southSector", "eastSector", "westSector"];
    const dbgType = ["rain", "snow", "rain", "hail", "dry"];
    const intensities = [3, 1, 4, 2, 3];
    for (let i = 0; i < sector.length; i++){
        fixedCloudsEle.dispatchEvent(new CustomEvent('sector-weather-changed', { 
            detail: { 
                sector: sector[i],
                type: dbgType[i],
                intensity: intensities[i],
                animationOn: animationToggle.checked ? i === 0 : false
            }
        }));
    }
}

function rotateScale() {
    const numScales = precipScales.length
    precipScales[currScaleIdx].style.display = "none";
    precipScales[(currScaleIdx + 1) % numScales].style.display = "grid";
    currScaleIdx = (currScaleIdx + 1) % numScales;
    scaleIcon.src = `assets/${iconNames[currScaleIdx]}.png`
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