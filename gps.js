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

/**
 * Attempts to access the current position of the device and returns a `coords` object.
 * A `coords` object has the attributes `latitude` and `longitude`, given as decimal fractions.
 * @returns `coords` object if the position was retrieved, otherwise the coordinates of T9 are returned 
 *          and the `coords` object has an additional `fallback` attribute that is set to `true`.
 */
async function getCoords() {
    // fallback: (<latitude>, <longitude>) of T9
    const fallback_location = {latitude: 52.455753, longitude: 13.297442, fallback: true}; 
    return await getPosition().catch(e => console.error(e)) ?? fallback_location;
}