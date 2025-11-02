function getPosition() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                resolve(position);
            }, (error) => {
                reject("Could not retrieve location: " + error.message);
            });
        } else {
            reject("No geolocation API");
        }
    })
}

async function loadLocation(element) {
    let position = await getPosition().catch(e => element.innerText = e);
    if (position) {
        element.innerText = `Geo-Koordinaten: ${position.coords.latitude} ${position.coords.longitude}`;
    }
}