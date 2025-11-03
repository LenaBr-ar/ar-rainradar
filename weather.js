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

async function getWeather(element) {
    // forecast for local timezone in 6 hours
    const forecastHour = 6;
    const date = new Date();
    date.setTime(date.getTime() + (forecastHour * 60 * 60 * 1000));
    let lastDate = new Date();
    lastDate.setTime(date.getTime() + (60 * 60 * 1000));
    const tz = "Europe/Berlin";
    const baseUrl = "https://api.brightsky.dev/weather";

    // get position with fallback to lawn in front of the institute
    let lat = 52.455753;
    let lon = 13.297442;
    try {
        const position = await getPosition();
        lat = position.coords.latitude;
        lon = position.coords.longitude;
    } catch (error) {
        console.error("Failed getting position: " + error.message);
    }

    // get and parse the forecast data
    try {
        const reqUrl = `${baseUrl}?date=${date.toISOString()}&last_date=${lastDate.toISOString()}&lat=${lat}&lon=${lon}&tz=${tz}`;
        const response = await fetch(encodeURI(reqUrl));
        if (!response.ok) {
            console.error(`Response status: ${response.status}`);
        } else {
            const weatherData = await response.json();
            element.innerText = "The weather will be " + parseWeather(weatherData);
        }
    } catch (error) {
        element.innerText = "Error retrieving weather data: " + error.message
        console.error(error.message);
    }
}