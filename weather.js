class Coordinates {
    constructor(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    }
}

function parseWeather(weatherData) {
    switch(weatherData.weather[0].condition) {
        case "rain":
            return "rainy";
        case "snow":
            return "snowy";
        case "hail":
            return "hail";
        case "null":
            if (weatherData.weather[0].precipitation > 0) {
                return "rainy";
            } else {
                return "dry";
            }
        default:
            return "dry";
    }
}

async function getWeather(coords) {
    if (!coords) {
        return null;
    }

    // calculate parameters for forecast in local timezone
    const forecastHour = 1;
    const date = new Date();
    date.setTime(date.getTime() + (forecastHour * 60 * 60 * 1000));
    let lastDate = new Date();
    lastDate.setTime(date.getTime() + (60 * 60 * 1000));
    const tz = "Europe/Berlin";
    const baseUrl = "https://api.brightsky.dev/weather";

    // calculate surrounding points
    const points = [];
    points.push(new Coordinates(coords.latitude, coords.longitude));    // current location
    const lat_north = coords.latitude + (180/Math.PI) * (2500/6378137);
    points.push(new Coordinates(lat_north, coords.longitude));          // north by 2.5km
    const lat_south = coords.latitude - (180/Math.PI) * (2500/6378137)
    points.push(new Coordinates(lat_south, coords.longitude));          // south by 2.5km
    const lon_east = coords.longitude + (180/Math.PI) * (2500/6378137) / Math.cos(coords.longitude);
    points.push(new Coordinates(coords.latitude, lon_east));    // east by 2.5km
    const lon_west = coords.longitude - (180/Math.PI) * (2500/6378137) / Math.cos(coords.longitude);
    points.push(new Coordinates(coords.latitude, lon_west));    // west by 2.5km

    // fetch the forecast data for each point
    const data = [];
    for (let point in points) {
        try {
            const reqUrl = `${baseUrl}?date=${date.toISOString()}&last_date=${lastDate.toISOString()}&lat=${coords.latitude}&lon=${coords.longitude}&tz=${tz}`;
            const response = await fetch(encodeURI(reqUrl));
            if (!response.ok) {
                console.error(`Response status: ${response.status}`);
                return [];
            } else {
                data.push(parseWeather(await response.json()));
            }
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    return data;
}