function parseWeather(weatherData) {
    switch(weatherData.weather[0].condition) {
        case "rain":
            return "rainy";
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

async function getWeatherData(coords) {
    if (!coords) {
        return null;
    }
    // forecast for local timezone in 6 hours
    const forecastHour = 6;
    const date = new Date();
    date.setTime(date.getTime() + (forecastHour * 60 * 60 * 1000));
    let lastDate = new Date();
    lastDate.setTime(date.getTime() + (60 * 60 * 1000));
    const tz = "Europe/Berlin";
    const baseUrl = "https://api.brightsky.dev/weather";

    // fetch the forecast data
    try {
        const reqUrl = `${baseUrl}?date=${date.toISOString()}&last_date=${lastDate.toISOString()}&lat=${coords.latitude}&lon=${coords.longitude}&tz=${tz}`;
        const response = await fetch(encodeURI(reqUrl));
        if (!response.ok) {
            console.error(`Response status: ${response.status}`);
        } else {
            return await response.json();
        }
    } catch (error) {
        console.error(error.message);
    }
}