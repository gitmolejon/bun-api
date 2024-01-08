import {
    Coordinates,
    ZoneLevel,
    Island,
    Airport,
    CardinalPoint,
    ServiceType,
    DayTime,
    VehicleType,
    PriceThreshold
} from "./types";
import getRouteInfo from "./google-maps-api";
import Database from "bun:sqlite";
import { RAW_PLACES, RAW_PRICES } from "./db_data";

function reversePointsOrder(points: Coordinates[]) {
    return points.map(point => [point[1], point[0]]);
}

function calculateExtraPrice9to18(
    pax: number,
    kilometersHours: number,
    basePrice: number,
    CONSTANT: number
): number {
    if (pax >= 9 && pax <= 18) {
        return basePrice;
    } else if (pax >= 19 && pax <= 30) {
        return kilometersHours < CONSTANT ? basePrice + 48 : basePrice + 96
    } else if (pax >= 31 && pax <= 55) {
        return kilometersHours < CONSTANT ? basePrice + 96 : basePrice + 192
    } else if (pax >= 56 && pax <= 71) {
        return kilometersHours < CONSTANT ? basePrice + 132 : basePrice + 264
    }
    console.error("Error on _calculateExtraPrice9to18");
    return 0;
}

function calculatePricesWithTresholds(kilometersHours: number, priceThresholds: PriceThreshold[]) {
    let basePrice = 0;
    for (let i = 0; i < priceThresholds.length; i++) {
        if (kilometersHours < priceThresholds[i][0]) {
            basePrice = priceThresholds[i][1];
            break;
        }
    }
    if (basePrice === 0) {
        basePrice = priceThresholds[priceThresholds.length - 1][1]; // Default to the last price if no condition is met
    }
    return basePrice;
}

function calculateExtraPrice1to8(
    pax: number,
    kilometersHours: number,
    basePrice: number,
    isLuxury: boolean,
    FIRST_CONSTANT: number,
    SECOND_CONSTANT?: number,
): number {
    const SECOND_CONSTANT_CALCULATED = SECOND_CONSTANT || FIRST_CONSTANT;
    if (isLuxury) {
        if (pax <= 3) {
            return kilometersHours < FIRST_CONSTANT ? basePrice + 12 : basePrice + 24;
        } else if (pax <= 6) {
            if (kilometersHours < 6.5) {
                return basePrice + 15.6 + 12;
            } else if (kilometersHours < 50) {
                return basePrice + 18 + 12;
            } else if (kilometersHours < FIRST_CONSTANT) {
                return basePrice + 24 + 12
            } else {
                return basePrice + 48 + 24;
            }
        } else if (pax <= 9) {
            if (kilometersHours < 6.5) {
                return basePrice + 15.6 + 24;
            } else if (kilometersHours < 50) {
                return basePrice + 18 + 24;
            } else if (kilometersHours < FIRST_CONSTANT) {
                return basePrice + 24 + 24
            } else {
                return basePrice + 48 + 48;
            }
        }
    } else {
        if (pax <= 3) {
            return basePrice;
        } else if (pax >= 4 && pax <= 8) {
            if (kilometersHours < 6.5) {
                return basePrice + 15.6;
            } else if (kilometersHours < 50) {
                return basePrice + 18;
            } else if (kilometersHours < FIRST_CONSTANT) {
                return basePrice + 24
            } else if (kilometersHours < SECOND_CONSTANT_CALCULATED) {
                return basePrice + 42
            } else {
                return basePrice + 48;
            }
        }
    }
    console.error("Error on _calculateExtraPrice1to8");
    return 0;
}

export function isPointInPolygon(point: Coordinates, vs: Coordinates[]) {
    // This is made because the polygons are defined with [lat, lng] and the point is defined with [lng, lat]
    const vsReverse = reversePointsOrder(vs);

    var x = point[0], y = point[1];

    var inside = false;
    for (var i = 0, j = vsReverse.length - 1; i < vsReverse.length; j = i++) {
        var xi = vsReverse[i][0], yi = vsReverse[i][1];
        var xj = vsReverse[j][0], yj = vsReverse[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
};

export function isPointInAnyPolygon(point: Coordinates, vs: Coordinates[][]) {
    return vs.some(polygon => isPointInPolygon(point, polygon));
};

export function calculateZoneLevel(origin: Coordinates, destination: Coordinates, hardZonePolygons: Coordinates[][], veryHardZonePolygons: Coordinates[][]): ZoneLevel {
    if (isPointInAnyPolygon(origin, veryHardZonePolygons) || isPointInAnyPolygon(destination, veryHardZonePolygons)) {
        return ZoneLevel.VERY_HARD;
    } else if (isPointInAnyPolygon(origin, hardZonePolygons) || isPointInAnyPolygon(destination, hardZonePolygons)) {
        return ZoneLevel.HARD;
    }
    return ZoneLevel.NORMAL;
}

export async function calculateKilometersBetweenPoints(route: Coordinates[], db: Database): Promise<{ kilometers: number, hours: number }> {
    const result = await getRouteInfoCached(route, db);
    return result
}

export async function calculateNearestAirport(
    origin: Coordinates,
    island: Island,
    airportCoordinates: { [key in Airport]: Coordinates },
    islandsRoundZonePolygons: Partial<{ [key in Island]: Partial<{ [key in CardinalPoint]: Coordinates[] }> }>,
    db: Database): Promise<Airport> {

    if (island == Island.GC) {
        return Airport.LPA;
    } else if (island == Island.FTV) {
        return Airport.FUE;
    } else if (island == Island.LNZ) {
        return Airport.ACE;
    } else if (island == Island.LP) {
        return Airport.SPC;
    } else if (island == Island.TNF) {
        if (islandsRoundZonePolygons.TNF?.NORTH && isPointInPolygon(origin, islandsRoundZonePolygons.TNF.NORTH)) {
            return Airport.TFN;
        }
        try {
            const [tfnResult, tfsResult] = await Promise.all([
                getRouteInfoCached([origin, airportCoordinates.TFN], db),
                getRouteInfoCached([origin, airportCoordinates.TFS], db)
            ]);
            if (tfnResult.hours < tfsResult.hours) { // TODO: Check if use hours or km
                return Airport.TFN;
            } else {
                return Airport.TFS;
            }
        } catch (e) {
            console.error("Error on calculateNearestAirport -> ", e);
            return Airport.TFN;
        }
    }

    console.error("Error on calculateNearestAirport()");
    return Airport.LPA;
}

export function calculateCustomRoute(
    origin: Coordinates,
    destination: Coordinates,
    island: Island,
    serviceType: ServiceType,
    nearestAirport: Airport,
    airportCoordinates: { [key in Airport]: Coordinates },
    islandsRoundZonePolygons: Partial<{ [key in Island]: Partial<{ [key in CardinalPoint]: Coordinates[] }> }>): { coordinates: Coordinates[], roundTrip: boolean } {

    var route: Coordinates[] = [];
    var roundTrip: boolean = false;
    if (serviceType == ServiceType.PRIVADO) {
        if (island == Island.GC
            && islandsRoundZonePolygons.GC
            && islandsRoundZonePolygons.GC.NORTH
            && islandsRoundZonePolygons.GC.WEST) {
            route.push(airportCoordinates.LPA);
            route.push(origin);
            if (
                (isPointInPolygon(origin, islandsRoundZonePolygons.GC.NORTH) && isPointInPolygon(destination, islandsRoundZonePolygons.GC.WEST))
                || (isPointInPolygon(origin, islandsRoundZonePolygons.GC.WEST) && isPointInPolygon(destination, islandsRoundZonePolygons.GC.NORTH))
            ) {
                console.log('🌏 Round island!');
                roundTrip = true;
                route.push(airportCoordinates.LPA);
            }
            route.push(destination);
            route.push(airportCoordinates.LPA);
        } else if (island == Island.TNF
            && islandsRoundZonePolygons.TNF
            && islandsRoundZonePolygons.TNF.NORTH
            && islandsRoundZonePolygons.TNF.SOUTH
            && islandsRoundZonePolygons.TNF.WEST) {
            route.push(airportCoordinates[nearestAirport]);
            route.push(origin);
            if (isPointInPolygon(origin, islandsRoundZonePolygons.TNF.NORTH) && isPointInPolygon(destination, islandsRoundZonePolygons.TNF.SOUTH)) {
                console.log('🌏 Round island!');
                roundTrip = true;
                route.push(airportCoordinates.TFN);
                route.push(destination)
                route.push(airportCoordinates.TFN);
            } else if (isPointInPolygon(origin, islandsRoundZonePolygons.TNF.NORTH) && isPointInPolygon(destination, islandsRoundZonePolygons.TNF.WEST)) {
                console.log('🌏 Round island!');
                roundTrip = true;
                route.push(airportCoordinates.TFN);
                route.push(airportCoordinates.TFS);
                route.push(destination)
                route.push(airportCoordinates.TFS);
                route.push(airportCoordinates.TFN);
            } else if (isPointInPolygon(origin, islandsRoundZonePolygons.TNF.SOUTH) && isPointInPolygon(destination, islandsRoundZonePolygons.TNF.NORTH)) {
                console.log('🌏 Round island!');
                roundTrip = true;
                route.push(airportCoordinates.TFN);
                route.push(destination)
                route.push(airportCoordinates.TFN);
                route.push(airportCoordinates.TFS);
            } else if (isPointInPolygon(origin, islandsRoundZonePolygons.TNF.WEST) && isPointInPolygon(destination, islandsRoundZonePolygons.TNF.NORTH)) {
                console.log('🌏 Round island!');
                roundTrip = true;
                route.push(airportCoordinates.TFS);
                route.push(airportCoordinates.TFN);
                route.push(destination)
                route.push(airportCoordinates.TFN);
                route.push(airportCoordinates.TFS);
            }
            route.push(destination);
            route.push(airportCoordinates[nearestAirport]);
        } else if (island == Island.FTV) {
            route.push(airportCoordinates.FUE);
            route.push(origin);
            route.push(destination);
            route.push(airportCoordinates.FUE);
        } else if (island == Island.LNZ) {
            route.push(airportCoordinates.ACE);
            route.push(origin);
            route.push(destination);
            route.push(airportCoordinates.ACE);
        }
    }
    return { coordinates: route, roundTrip: roundTrip };
}

export function calculateDayTime(departureDateTime: Date): DayTime {
    if (departureDateTime.getHours() >= 0 && departureDateTime.getHours() < 6) {
        return DayTime.NIGHT;
    }
    return DayTime.DAY;
}

// TODO: Apply real logic to this function
export function calculateTariff(serviceType: ServiceType, island: Island): number {
    return 0.3;
}

export function calculateTaxType(pax: number, serviceType: ServiceType, vehicleType: VehicleType) {
    if (serviceType == ServiceType.A_DISPOSICION) {
        return 0.07;
    } else {
        if (pax <= 8 || (
            (vehicleType == VehicleType.LUXURY_CAR || vehicleType == VehicleType.LUXURY_MINIVAN)
            && pax <= 9)) {
            return 0.07;
        } else {
            return 0.03;
        }
    }
}

export function calculateIsLuxury(vehicleType: VehicleType | undefined): boolean {
    if (!vehicleType) {
        return false;
    }
    return vehicleType == VehicleType.LUXURY_CAR || vehicleType == VehicleType.LUXURY_MINIVAN;
}

export async function calculateReducedKMH(
    origin: Coordinates,
    destination: Coordinates,
    island: Island,
    isShuttleZone: boolean,
    db: Database
): Promise<{ isReduced: boolean, kilometers: number, hours: number }> {

    if (isShuttleZone) {
        const { kilometers, hours } = await calculateKilometersBetweenPoints([origin, destination], db)
        const kilometersHours = kilometers * hours;

        if (island == Island.GC && kilometersHours <= 7) {
            return {
                isReduced: true,
                kilometers: kilometers,
                hours: hours
            }
        } else if (island == Island.TNF && kilometersHours <= 10) {
            return {
                isReduced: true,
                kilometers: kilometers,
                hours: hours
            }
        } else if (island == Island.FTV && kilometersHours <= 10) {
            return {
                isReduced: true,
                kilometers: kilometers,
                hours: hours
            }
        } else if (island == Island.LNZ && kilometersHours <= 20) {
            return {
                isReduced: true,
                kilometers: kilometers,
                hours: hours
            }
        }

        return {
            isReduced: false,
            kilometers: 0,
            hours: 0
        }
    }

    return {
        isReduced: false,
        kilometers: 0,
        hours: 0
    }
}

export function calculateAtDisposalPrice(
    pax: number,
    departureDateTime: Date,
    arrivalDateTime: Date,
    isLuxury: boolean,
    island: Island,
    zoneLevel: ZoneLevel,
    MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA: number
): number {

    const TOTAL_HOURS: number = (arrivalDateTime.getTime() - departureDateTime.getTime()) / 1000 / 60 / 60;

    console.log(`⏳ Total hours: ${TOTAL_HOURS}`);

    if (zoneLevel == ZoneLevel.HARD || zoneLevel == ZoneLevel.VERY_HARD) {
        if (isLuxury) {
            if (pax <= 3) {
                if (TOTAL_HOURS <= 7) {
                    return 480;
                } else {
                    return 480 + (TOTAL_HOURS - 7) * 36;
                }
            } else if (pax <= 6) {
                if (TOTAL_HOURS <= 7) {
                    return 600;
                } else {
                    return 600 + (TOTAL_HOURS - 7) * 48;
                }
            } else if (pax <= 9) {
                if (TOTAL_HOURS <= 7) {
                    return 720;
                } else {
                    return 720 + (TOTAL_HOURS - 7) * 48;
                }
            }
        } else {
            if (
                (pax <= 18 && island != Island.LP)
                || (pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA && island == Island.LP)
            ) {
                if (TOTAL_HOURS <= 7) {
                    return 360;
                } else {
                    return 360 + (TOTAL_HOURS - 7) * 36;
                }
            } else if (pax <= 30) {
                if (TOTAL_HOURS <= 7) {
                    return 420;
                } else {
                    return 420 + (TOTAL_HOURS - 7) * 48;
                }
            } else if (pax <= 55) {
                if (TOTAL_HOURS <= 7) {
                    return 504;
                } else {
                    return 504 + (TOTAL_HOURS - 7) * 60;
                }
            } else if (pax <= 71) {
                if (TOTAL_HOURS <= 7) {
                    return 648;
                } else {
                    return 648 + (TOTAL_HOURS - 7) * 72;
                }
            }
        }
    }

    if (isLuxury) {
        if (pax <= 3) {
            if (TOTAL_HOURS <= 4) {
                return 360;
            } else if (TOTAL_HOURS <= 8) {
                return 480;
            } else {
                return 480 + (TOTAL_HOURS - 8) * 36;
            }
        } else if (pax <= 6) {
            if (TOTAL_HOURS <= 4) {
                return 420;
            } else if (TOTAL_HOURS <= 8) {
                return 600;
            } else {
                return 600 + (TOTAL_HOURS - 8) * 48;
            }
        } else if (pax <= 9) {
            if (TOTAL_HOURS <= 4) {
                return 480;
            } else if (TOTAL_HOURS <= 8) {
                return 720;
            } else {
                return 720 + (TOTAL_HOURS - 8) * 48;
            }
        }
    } else {
        if (
            (pax <= 18 && island != Island.LP)
            || (pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA && island == Island.LP)
        ) {
            if (TOTAL_HOURS <= 4) {
                return 240;
            } else if (TOTAL_HOURS <= 8) {
                return 360;
            } else {
                return 360 + (TOTAL_HOURS - 8) * 36;
            }
        } else if (pax <= 30) {
            if (TOTAL_HOURS <= 4) {
                return 300;
            } else if (TOTAL_HOURS <= 8) {
                return 420;
            } else {
                return 420 + (TOTAL_HOURS - 8) * 48;
            }
        } else if (pax <= 55) {
            if (TOTAL_HOURS <= 4) {
                return 384;
            } else if (TOTAL_HOURS <= 8) {
                return 504;
            } else {
                return 504 + (TOTAL_HOURS - 8) * 60;
            }
        } else if (pax <= 71) {
            if (TOTAL_HOURS <= 4) {
                return 504;
            } else if (TOTAL_HOURS <= 8) {
                return 648;
            } else {
                return 648 + (TOTAL_HOURS - 8) * 72;
            }
        }
    }
    return 0;
}

export function calculatePriceKMH(
    pax: number,
    kilometersHours: number,
    nearestAiport: Airport,
    isLuxury: boolean,
    isReducedPrice: boolean,
): number {

    let basePrice: number = 0;

    if (pax >= 9) {

        if (nearestAiport == Airport.LPA) {

            if (isReducedPrice) {
                basePrice = 132
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [90, 132],
                    [145, 144],
                    [200, 156],
                    [275, 168],
                    [300, 180],
                    [320, 204],
                    [340, 240],
                    [400, 264],
                    [450, 288],
                    [500, 300],
                    [600, 312],
                    [700, 324],
                    [800, 336],
                    [960, 348],
                    [Infinity, 360]
                ])
            }

            return calculateExtraPrice9to18(pax, kilometersHours, basePrice, 355);

        } else if (nearestAiport == Airport.TFN) {

            if (isReducedPrice) {
                if (kilometersHours <= 5) {
                    basePrice = 120;
                } else if (kilometersHours <= 10) {
                    basePrice = 132
                }
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [15, 120],
                    [40, 132],
                    [60, 138],
                    [90, 144],
                    [150, 156],
                    [200, 168],
                    [350, 180],
                    [450, 192],
                    [550, 204],
                    [650, 240],
                    [750, 276],
                    [850, 312],
                    [960, 342],
                    [Infinity, 360]
                ])
            }

            return calculateExtraPrice9to18(pax, kilometersHours, basePrice, 700);

        } else if (nearestAiport == Airport.TFS) {

            if (isReducedPrice) {
                if (kilometersHours <= 5) {
                    basePrice = 120;
                } else if (kilometersHours <= 10) {
                    basePrice = 132
                }
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [12, 120],
                    [30, 132],
                    [70, 144],
                    [200, 156],
                    [350, 168],
                    [550, 180],
                    [650, 240],
                    [750, 288],
                    [960, 336],
                    [Infinity, 360]
                ])
            }

            return calculateExtraPrice9to18(pax, kilometersHours, basePrice, 600);

        } else if (nearestAiport == Airport.ACE) {

            if (isReducedPrice) {
                if (kilometersHours <= 20) {
                    basePrice = 120;
                }
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 120],
                    [45, 132],
                    [60, 144],
                    [100, 156],
                    [115, 180],
                    [130, 204],
                    [200, 240],
                    [250, 264],
                    [300, 288],
                    [350, 312],
                    [600, 336],
                    [Infinity, 360]
                ])
            }

            return calculateExtraPrice9to18(pax, kilometersHours, basePrice, 120);

        } else if (nearestAiport == Airport.FUE) {

            if (isReducedPrice) {
                if (kilometersHours <= 7) {
                    basePrice = 120;
                } else if (kilometersHours <= 10) {
                    basePrice = 132;
                }
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [15, 120],
                    [114, 132],
                    [190, 156],
                    [300, 168],
                    [420, 180],
                    [450, 192],
                    [480, 204],
                    [510, 216],
                    [540, 240],
                    [570, 264],
                    [600, 288],
                    [650, 300],
                    [850, 312],
                    [960, 330],
                    [Infinity, 360]
                ])
            }

            return calculateExtraPrice9to18(pax, kilometersHours, basePrice, 600);

        }

    } else {
        if (nearestAiport == Airport.LPA) {

            if (isReducedPrice) {
                basePrice = 48
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [90, 48],
                    [145, 60],
                    [200, 72],
                    [275, 84],
                    [300, 96],
                    [340, 108],
                    [400, 120],
                    [500, 132],
                    [600, 144],
                    [700, 156],
                    [800, 168],
                    [Infinity, 180]
                ])
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, 355);
        } else if (nearestAiport == Airport.TFN) {

            if (isReducedPrice) {
                if (kilometersHours <= 5) {
                    basePrice = 36;
                } else if (kilometersHours <= 10) {
                    basePrice = 42
                }
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [15, 36],
                    [40, 42],
                    [60, 48],
                    [90, 60],
                    [150, 84],
                    [200, 96],
                    [250, 108],
                    [350, 120],
                    [450, 132],
                    [650, 144],
                    [750, 156],
                    [850, 168],
                    [Infinity, 180]
                ])
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, 700);
        } else if (nearestAiport == Airport.TFS) {

            if (isReducedPrice) {
                if (kilometersHours <= 5) {
                    basePrice = 36;
                } else if (kilometersHours <= 10) {
                    basePrice = 42
                }
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [12, 36],
                    [30, 42],
                    [70, 54],
                    [120, 60],
                    [150, 72],
                    [300, 84],
                    [350, 108],
                    [550, 120],
                    [650, 132],
                    [750, 144],
                    [850, 156],
                    [960, 168],
                    [Infinity, 180]
                ])
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, 600);
        } else if (nearestAiport == Airport.ACE) {

            if (isReducedPrice) {
                if (kilometersHours <= 7) {
                    basePrice = 32.4;
                } else if (kilometersHours <= 20) {
                    basePrice = 36;
                }
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [15, 32],
                    [30, 36],
                    [60, 48],
                    [100, 60],
                    [115, 72],
                    [130, 84],
                    [200, 96],
                    [300, 108],
                    [350, 120],
                    [600, 144],
                    [Infinity, 180]
                ])
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, 120, 180);
        } else if (nearestAiport == Airport.FUE) {

            if (isReducedPrice) {
                if (kilometersHours <= 7) {
                    basePrice = 32.4;
                } else if (kilometersHours <= 20) {
                    basePrice = 36;
                }
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [15, 32.4],
                    [50, 46],
                    [114, 60],
                    [150, 72],
                    [190, 84],
                    [230, 96],
                    [300, 108],
                    [420, 120],
                    [480, 132],
                    [540, 144],
                    [600, 156],
                    [650, 168],
                    [Infinity, 180]
                ])
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, 600);
        }

    }

    return basePrice;
}


export function calculateModelPrice(
    zoneLevel: ZoneLevel,
    pax: number,
    dayTime: DayTime,
    island: Island,
    isLuxury: boolean,
    kilometersHours: number,
    nearestAirport: Airport,
    isReduced: boolean,
    MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA: number
) {
    const datetimeNow: Date = new Date();
    const datetimeNowPlus4Hours: Date = new Date(datetimeNow.getTime() + (4 * 60 * 60 * 1000));

    let referencePrice: number = 0;
    if (pax <= 3) {
        referencePrice = 144;
    } else if (pax <= 8) {
        referencePrice = 144 + 48;
    } else {
        referencePrice = calculateAtDisposalPrice(pax, datetimeNow, datetimeNowPlus4Hours, isLuxury, island, ZoneLevel.NORMAL, MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA);
    }

    let priceKMH: number = calculatePriceKMH(pax, kilometersHours, nearestAirport, isLuxury, isReduced);

    let extraNightPrice: number = 0;
    if (dayTime == DayTime.NIGHT) {
        if (isLuxury) {
            if (pax <= 3) {
                extraNightPrice = 36;
            } else {
                extraNightPrice = 48;
            }
        } else {
            if (
                (pax <= 18 && island != Island.LP)
                || (pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA && island == Island.LP)
            ) {
                extraNightPrice = 36;
            } else if (pax <= 30) {
                extraNightPrice = 48;
            } else if (pax <= 55) {
                extraNightPrice = 60;
            } else if (pax <= 71) {
                extraNightPrice = 72;
            }
        }
    }

    referencePrice = referencePrice + extraNightPrice;
    priceKMH = priceKMH + extraNightPrice;

    if (zoneLevel == ZoneLevel.HARD || zoneLevel == ZoneLevel.VERY_HARD) {
        if (island == Island.GC && kilometersHours < 350) {
            return referencePrice;
        } else {
            return priceKMH > referencePrice ? priceKMH : referencePrice;
        }
    } else {
        return priceKMH;
    }
}

export function calculatePriceLuggage(pax: number, isLuxury: boolean, otherLuggage: number, extraLuggage: number, originCoordinates: Coordinates, destinationCoordinates: Coordinates, LUGGAGE_ZONE_POLYGONS: Coordinates[][]): number {
    let price: number = 0;
    const isLuggageZone = isPointInAnyPolygon(originCoordinates, LUGGAGE_ZONE_POLYGONS) || isPointInAnyPolygon(destinationCoordinates, LUGGAGE_ZONE_POLYGONS);
    if (isLuggageZone || extraLuggage > 0) {
        if (pax <= 8 || isLuxury) {
            price += 5;
        } else {
            price += 10;
        }
    }
    price += (extraLuggage + otherLuggage) * 13;

    return price;
}

export function calculateIslandFromCoordinates(coordinates: Coordinates, ISLANDS_POLYGONS: { [key in Island]: Coordinates[] }): Island | undefined {
    for (const [island, polygons] of Object.entries(ISLANDS_POLYGONS)) {
        if (isPointInPolygon(coordinates, polygons)) {
            return island as Island;
        }
    }
    console.error("Error on calculateIslandFromCoordinates()");
    return undefined;
}

async function getRouteInfoCached(route: Coordinates[], db: Database): Promise<{ kilometers: number, hours: number }> {
    const query = db.query(`SELECT kilometers, hours FROM routes WHERE coordinates = '${route}'`);
    const result = query.get() as { kilometers: number, hours: number } | undefined;
    if (result) {
        console.log('📦 Cached route!')
        return { kilometers: result.kilometers, hours: result.hours };
    }

    const { kilometers, hours } = await getRouteInfo(route);

    db.exec(`INSERT INTO routes (coordinates, kilometers, hours)
        VALUES ('${route}', ${kilometers}, ${hours})`);
    console.log('🎁 New route cached!')

    return { kilometers, hours };
}

function degreesToRadients(degrees: number) {
    return degrees * (Math.PI / 180);
}

export function calculateDistanceBetweenCoordinates(origin: Coordinates, destination: Coordinates): number {
    var radioTierra = 6371; // Radio de la Tierra en kilómetros

    var dLat = degreesToRadients(destination[0] - origin[0]);
    var dLon = degreesToRadients(destination[1] - origin[1]);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(degreesToRadients(origin[0])) * Math.cos(degreesToRadients(destination[0])) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distancia = radioTierra * c;

    return distancia * 1000; // Distancia en metros
}

export function isAirportCloseToCoordinates(origin: Coordinates, destinationList: { [key in Airport]: Coordinates }, thresholdInMeters: number = 100): Airport | undefined {
    for (const [airport, coordinates] of Object.entries(destinationList)) {
        var distance = calculateDistanceBetweenCoordinates(origin, coordinates);
        if (distance < thresholdInMeters) {
            return airport as Airport;
        }
    }
    return undefined;
}

export function isPlaceSuitableForShuttle(
    point: Coordinates,
    destinationList: {
        coordinates: Coordinates;
        name: string;
        zone_id: string;
    }[],
    thresholdInMeters: number = 100
): string | false {
    let closestPlace: {
        coordinates: Coordinates;
        name: string;
        zone_id: string;
    } | undefined;
    let minDistance = Infinity;

    destinationList.forEach((place) => {
        var distance = calculateDistanceBetweenCoordinates(point, place.coordinates);
        if (distance < thresholdInMeters && distance < minDistance) {
            closestPlace = place;
            minDistance = distance;
        }
    });

    if (closestPlace) {
        console.log(`🚐 Closest shuttle place found! ${closestPlace.name}`);
        return closestPlace.zone_id;
    }

    return false;
}

// TODO: Get info from DB instead of file modified
export async function getIslandsPlacesForShuttle(): Promise<{ [key in Island]: { coordinates: Coordinates, name: string, zone_id: string }[] }> {
    const data = RAW_PLACES

    let transformedData: { [key in Island]: { coordinates: Coordinates, name: string, zone_id: string }[] } = {
        [Island.GC]: [],
        [Island.TNF]: [],
        [Island.LP]: [],
        [Island.FTV]: [],
        [Island.LNZ]: []
    };

    // TODO: Transform island from Booker to Island type.
    data.forEach((item: { island: string; coordinates: string; name: string; zone_id: number; }) => {
        let coordinatesArray = item.coordinates.split(',').map(Number);

        transformedData[item.island as Island].push({
            coordinates: coordinatesArray as Coordinates,
            name: item.name,
            zone_id: item.zone_id.toString()
        });
    });

    return transformedData;
}

// TODO: Get info from DB instead of file modified
export async function getAirportsPricesForShuttle(): Promise<{ [key in Airport]: { [key: string]: { price: number; zone_name: string } } }> {
    const data = RAW_PRICES;
    
    let transformedData: {
        [key in Airport]: {
            [key: string]:
            { price: number, zone_name: string }
        }
    } = {
        [Airport.LPA]: {},
        [Airport.TFN]: {},
        [Airport.TFS]: {},
        [Airport.ACE]: {},
        [Airport.FUE]: {},
        [Airport.SPC]: {},
        [Airport.VDE]: {},
        [Airport.GMZ]: {},
    };

    data.forEach((item: { island: string; airport_id: number; zone_id: number; airport: string; zone_name: string; price: string | null }) => {
        try {
            let price = item.price !== null ? parseFloat(item.price.replace(',', '.')) : 0;
            transformedData[item.airport as Airport][item.zone_id] = {
                price: price,
                zone_name: item.zone_name
            };
        } catch (e) {
            
        }
    });

    return transformedData;
}