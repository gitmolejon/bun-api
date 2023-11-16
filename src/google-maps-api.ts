import { Coordinates } from "./types";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

async function getRouteInfo(coordinates: Coordinates[]): Promise<{kilometers: number, hours: number}> {
    let myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("X-Goog-Api-Key", GOOGLE_API_KEY);
    myHeaders.append("X-Goog-FieldMask", "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline");

    let origin = coordinates[0];
    let destination = coordinates[coordinates.length - 1];

    let raw = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": origin[0],
                    "longitude": origin[1]
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": destination[0],
                    "longitude": destination[1]
                }
            }
        },
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_UNAWARE",
        "computeAlternativeRoutes": false,
        "routeModifiers": {
            "avoidTolls": false,
            "avoidHighways": false,
            "avoidFerries": true
        },
        "languageCode": "es-ES",
        "units": "METRIC"
    };

    if (coordinates.length > 2) {
        let intermediates = coordinates.slice(1, -1);
        let waypoints = {
            "intermediates": intermediates.map(intermediate => ({
                "location": {
                    "latLng": {
                        "latitude": intermediate[0],
                        "longitude": intermediate[1]
                    }
                }
            }))
        }
        raw['intermediates'] = waypoints['intermediates'];
    }

    const jsonRaw = JSON.stringify(raw);

    var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: jsonRaw,
        redirect: 'follow'
    };

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", requestOptions as any);
    const result = await response.json();
    // console.log('🚀', result);
    try {
        const distanceMeters = parseInt(result.routes[0].distanceMeters);
        const duration = parseInt(result.routes[0].duration);
        return {kilometers: distanceMeters / 1000, hours: duration / 3600};
    } catch (error) {
        console.log('Error on getRouteInfo response ->', error);
        return {kilometers: 0, hours: 0}
    }
}

export default getRouteInfo;