class Coordinates {
    constructor(lat, lon) {
        this.lat = lat;
        this.lon = lon;
    }
}

function parseWeather(weatherData) {
    switch(weatherData.condition) {
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

async function getWeather(coords) {
    if (!coords) {
        return null;
    }

    // calculate parameters for forecast in local timezone
    const currentTime = new Date();
    let firecastTime = new Date();
    firecastTime.setTime(firecastTime.getTime() + (6 * 60 * 60 * 1000));
    const tz = "Europe/Berlin";
    const baseUrl = "https://api.brightsky.dev/weather";

    // calculate surrounding points
    const points = [];
    // current location
    const lat = parseFloat(coords.latitude);
    const lon = parseFloat(coords.longitude);
    points.push(new Coordinates(lat, lon));
    // north by 2.5km
    const lat_north = lat + (180/Math.PI) * (2500/6378137);
    points.push(new Coordinates(lat_north, lon));
    // south by 2.5 km
    const lat_south = lat - (180/Math.PI) * (2500/6378137)
    points.push(new Coordinates(lat_south, lon));
    // east by 2.5km
    const lon_east = lon + (180/Math.PI) * (2500/6378137) / Math.cos(lon);
    points.push(new Coordinates(lat, lon_east));
    // west by 2.5km
    const lon_west = lon - (180/Math.PI) * (2500/6378137) / Math.cos(lon);
    points.push(new Coordinates(lat, lon_west));

    // fetch the forecast data for each point
    // matrix rows are the points, columns are the hours
    const pointHourMatrix = [];
    for (let i=0; i<points.length; i++) {
        try {
            const reqUrl = `${baseUrl}?date=${currentTime.toISOString()}&last_date=${firecastTime.toISOString()}&lat=${points[i].lat}&lon=${points[i].lon}&tz=${tz}`;
            console.log(reqUrl);
            const response = await fetch(encodeURI(reqUrl));
            if (!response.ok) {
                console.error(`Response status: ${response.status}`);
                return [];
            } else {
                // parse the data for each forecasted hour for one point
                const data = await response.json();
                const pointData = []
                for (let i=0; i<data.weather.length; i++) {
                    pointData.push(parseWeather(data.weather[i]));
                }
                pointHourMatrix.push(pointData);
            }
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }

    return pointHourMatrix;
}
