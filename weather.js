class Coordinates {
    constructor(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    }
}

class Condition {
    constructor(type, intensity) {
        this.type = type;
        this.intensity = intensity;
    }
}

function parseWeather(weatherData, forecast) {
    let condition = new Condition();

    switch (weatherData.condition) {
        case "rain":
            condition.type = "rainy";
            break;
        case "snow":
            condition.type = "snowy";
            break;
        case "hail":
            condition.type = "hail";
            break;
        case "null":
            if (forecast) {
                if (weatherData.precipitation > 0) {
                    condition.type = "rainy";
                } else {
                    condition.type = "dry";
                }
            } else {
                if (weatherData.precipitation_10 > 0) {
                    condition.type = "rainy";
                } else {
                    condition.type = "dry";
                }
            }
            break;
        default:
            condition.type = "dry";
            break;
    }

    if (forecast) {
        if (weatherData.precipitation == 0) {
            condition.intensity = 0;
        } else if (weatherData.precipitation <= 1) {
            condition.intensity = 1;
        } else if (weatherData.precipitation <= 4) {
            condition.intensity = 2
        } else if (weatherData.precipitation <= 10) {
            condition.intensity = 3;
        } else {
            condition.intensity = 4;
        }
    } else {
        if (weatherData.precipitation_10 == 0) {
            condition.intensity = 0;
        } else if (weatherData.precipitation_10 <= 1) {
            condition.intensity = 1;
        } else if (weatherData.precipitation_10 <= 4) {
            condition.intensity = 2
        } else if (weatherData.precipitation_10 <= 10) {
            condition.intensity = 3;
        } else {
            condition.intensity = 4;
        }
    }

    return condition;
}

async function getWeather(coords) {
    if (!coords) {
        return null;
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
    const lat = parseFloat(coords.latitude);
    const lon = parseFloat(coords.longitude);
    points.push(new Coordinates(lat, lon));
    const distance = 10000;
    // north by the distance in m
    const lat_north = lat + (180 / Math.PI) * (distance / 6378137);
    points.push(new Coordinates(lat_north, lon));
    // south by the distance in m
    const lat_south = lat - (180 / Math.PI) * (distance / 6378137);
    points.push(new Coordinates(lat_south, lon));
    // east by the distance in m
    const lon_east = lon + ((180 / Math.PI) * (distance / 6378137)) / Math.cos(lon);
    points.push(new Coordinates(lat, lon_east));
    // west by the distance in m
    const lon_west = lon - ((180 / Math.PI) * (distance / 6378137)) / Math.cos(lon);
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
                pointHourMatrix[i] = [parseWeather(data.weather, false)];
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
                    pointHourMatrix[i].push(parseWeather(data.weather[j], true));
                }
            }
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    console.log(pointHourMatrix);
    return pointHourMatrix;
}
