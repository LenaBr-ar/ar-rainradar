function getPosition() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                resolve(position.coords);
            }, (error) => {
                reject("Could not retrieve location: " + error.message);
            });
        } else {
            reject("No geolocation API");
        }
    })
}

async function getPositionOrFallback() {
    // fallback: (<latitude>, <longitude>) of T9
    const fallback_location = {latitude: 52.455753, longitude: 13.297442, fallback: true}; 
    return await getPosition().catch(e => console.error(e)) ?? fallback_location;
}