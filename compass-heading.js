function compassHeading(alpha, beta, gamma) {
    // Copied from: https://www.w3.org/TR/2025/CRD-orientation-event-20250212/#worked-example
    // Example on how to compute compass heading for a device that is held vertically in front of the user (AR applications)
    // from wip W3C document on deviceorientation/devicemotien events.

    const degtorad = Math.PI / 180; // Degree-to-Radian conversion

    const _x = beta  ? beta  * degtorad : 0; // beta value
    const _y = gamma ? gamma * degtorad : 0; // gamma value
    const _z = alpha ? alpha * degtorad : 0; // alpha value

    const cY = Math.cos(_y);
    const cZ = Math.cos(_z);
    const sX = Math.sin(_x);
    const sY = Math.sin(_y);
    const sZ = Math.sin(_z);

    // Calculate Vx and Vy components
    var Vx = - cZ * sY - sZ * sX * cY;
    var Vy = - sZ * sY + cZ * sX * cY;

    // Calculate compass heading
    let compassHeading = Math.atan(Vx / Vy);

    // Convert compass heading to use whole unit circle
    if( Vy < 0 ) {
        compassHeading += Math.PI;
    } else if( Vx < 0 ) {
        compassHeading += 2 * Math.PI;
    }

    return compassHeading * (180 / Math.PI); // Compass Heading (in degrees)
}

const {promise: headingPromise, resolve: resolveHeadingPromise, reject: rejectHeadingPromise} = Promise.withResolvers();

function handleOrientation(event) {
    if (!event.absolute) { // orientation data refers to earth coordinate frames (only supported on Android)
        rejectHeadingPromise?.("Could not retrieve compass heading.");
    }
    resolveHeadingPromise?.(compassHeading(event.alpha, event.beta, event.gamma));
}

AFRAME.registerComponent('rotate-to-compass-dir', {
    init: async function () {
        const compassHeading = await headingPromise;
        if (compassHeading) {
            this.el.object3D.rotation.y = THREE.MathUtils.degToRad(-compassHeading); 
        }
    }
});
