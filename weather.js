const weatherCache = {};

class Coordinates {
    constructor(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    }
}

function parseWeather(weatherData) {
    switch (weatherData.condition) {
        case "rain":
            return "rainy";
        case "snow":
            return "snowy";
        case "hail":
            return "hail";
        case "null":
            if (weatherData.precipitation > 0) {
                return "rainy";
            } else {
                return "dry";
            }
        default:
            return "dry";
    }
}

function cacheKey(coords) {
    return `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}`;
}

async function getWeather(coords) {
    if (!coords) {
        return null;
    }

    const coordKey = cacheKey(coords);
    if (weatherCache[coordKey]) {
        return weatherCache[coordKey];
    }

    // calculate parameters for forecast in local timezone
    const currentTime = new Date();
    let forecastTime = new Date();
    forecastTime.setTime(forecastTime.getTime() + 6 * 60 * 60 * 1000);
    const tz = "Europe/Berlin";
    const baseUrl = "https://api.brightsky.dev/weather";

    // calculate surrounding points
    const points = [];
    // current location
    const lat = coords.latitude;
    const lon = coords.longitude;
    points.push(new Coordinates(lat, lon));
    // north by 2.5km
    const lat_north = lat + (180 / Math.PI) * (2500 / 6378137);
    points.push(new Coordinates(lat_north, lon));
    // south by 2.5 km
    const lat_south = lat - (180 / Math.PI) * (2500 / 6378137);
    points.push(new Coordinates(lat_south, lon));
    // east by 2.5km
    const lon_east = lon + ((180 / Math.PI) * (2500 / 6378137)) / Math.cos(lon);
    points.push(new Coordinates(lat, lon_east));
    // west by 2.5km
    const lon_west = lon - ((180 / Math.PI) * (2500 / 6378137)) / Math.cos(lon);
    points.push(new Coordinates(lat, lon_west));

    // fetch the current weather data for each point
    // matrix rows are the points, columns are the hours
    const pointHourMatrix = [];
    for (let i = 0; i < points.length; i++) {
        try {
            const reqUrl = `https://api.brightsky.dev/current_weather?lat=${points[i].lat}&lon=${points[i].lon}&tz=${tz}`;
            const response = await fetch(encodeURI(reqUrl));
            if (!response.ok) {
                console.error(`Response status: ${response.status}`);
                return [];
            } else {
                // parse the data
                const data = await response.json();
                pointHourMatrix[i] = [parseWeather(data.weather)];
            }
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    // fetch the forecast data for each point
    for (let i = 0; i < points.length; i++) {
        try {
            const reqUrl = `${baseUrl}?date=${currentTime.toISOString()}&last_date=${forecastTime.toISOString()}&lat=${points[i].lat}&lon=${points[i].lon}&tz=${tz}`;
            const response = await fetch(encodeURI(reqUrl));
            if (!response.ok) {
                console.error(`Response status: ${response.status}`);
                return [];
            } else {
                // parse the data for each forecasted hour for one point
                const data = await response.json();
                for (let j = 0; j < data.weather.length; j++) {
                    pointHourMatrix[i].push(parseWeather(data.weather[j]));
                }
            }
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    weatherCache[coordKey] = pointHourMatrix;
    console.log(pointHourMatrix);
    return pointHourMatrix;
}
