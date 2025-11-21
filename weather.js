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
    const lat = parseFloat(coords.latitude);
    const lon = parseFloat(coords.longitude);
    points.push(new Coordinates(lat, lon));    // current location
    const lat_north = lat + (180/Math.PI) * (2500/6378137);
    points.push(new Coordinates(lat_north, lon));          // north by 2.5km
    const lat_south = lat - (180/Math.PI) * (2500/6378137)
    points.push(new Coordinates(lat_south, lon));          // south by 2.5km
    const lon_east = lon + (180/Math.PI) * (2500/6378137) / Math.cos(lon);
    points.push(new Coordinates(lat, lon_east));    // east by 2.5km
    const lon_west = lon - (180/Math.PI) * (2500/6378137) / Math.cos(lon);
    points.push(new Coordinates(lat, lon_west));    // west by 2.5km

    // fetch the forecast data for each point
    const data = [];
    for (let i=0; i<points.length; i++) {
        try {
            const reqUrl = `${baseUrl}?date=${date.toISOString()}&last_date=${lastDate.toISOString()}&lat=${points[i].lat}&lon=${points[i].lon}&tz=${tz}`;
            console.log(reqUrl);
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