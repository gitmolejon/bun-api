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

// TODO: Refactor this
function calculateExtraPriceGreatherThan9(
    pax: number,
    kilometersHours: number,
    basePrice: number,
    island: Island,
    CONSTANT: number,
    MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA: number = 15,
    SPECIAL_PRICE_FTV_IS_ACTIVE: boolean = true, // Cuidado!! Esta variable se comporta como constante!!!
): number {
    if (island == Island.GC || island == Island.TNF || island == Island.LNZ) {
        if (pax >= 9 && pax <= 18) {
            return basePrice;
        } else if (pax >= 19 && pax <= 30) {
            return kilometersHours < CONSTANT ? basePrice + 48 : basePrice + 60
        } else if (pax >= 31 && pax <= 55) {
            return kilometersHours < CONSTANT ? basePrice + 96 : basePrice + 144
        } else if (pax >= 56 && pax <= 71) {
            return kilometersHours < CONSTANT ? basePrice + 132 : basePrice + 264
        }
    } else if (island == Island.LP) {
        if (pax >= 9 && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA) {
            return basePrice;
        } else if (pax > MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA && pax <= 30) {
            if (kilometersHours < 12) {
                return basePrice + 38.4;
            } else if (kilometersHours < 160) {
                return basePrice + 38.4;
            } else if (kilometersHours < 240) {
                return basePrice + 48;
            }  else if (kilometersHours < 380) {
                return basePrice + 40.8;
            } else {
                return basePrice + 60;
            }
        } else if (pax >= 31 && pax <= 55) {
            if (kilometersHours < 12) {
                return basePrice + 86.4;
            } else if (kilometersHours < 160) {
                return basePrice + 134.4;
            } else if (kilometersHours < 240) {
                return basePrice + 129.6;
            }  else if (kilometersHours < 380) {
                return basePrice + 112.8;
            } else {
                return basePrice + 144;
            }
        }
    } else if (island == Island.FTV) {
        if (pax >= 9 && pax <= 18 && !SPECIAL_PRICE_FTV_IS_ACTIVE) {
            return basePrice;
        } else if (pax >= 19 && pax <= 30 && !SPECIAL_PRICE_FTV_IS_ACTIVE) {
            if (kilometersHours < 480) {
                return basePrice + 48;
            } else {
                return basePrice + 60;
            }
        } else if (pax >= 31 && pax <= 55) {
            if (kilometersHours < 480) {
                return basePrice + 96;
            } else {
                return basePrice + 144;
            }
        } else if (pax >= 56 && pax <= 71) {
            if (kilometersHours < 480) {
                return basePrice + 132;
            } else {
                return basePrice + 264;
            }
        }
    }

    console.error("Error on _calculateExtraPrice9to18");
    return 0;
}

function calculateSpecialExtraPriceGreaterThan9(
    pax: number,
    kilometersHours: number,
    basePrice: number,
    island: Island,
    CONSTANT: number,
    SPECIAL_PRICE_FTV_IS_ACTIVE: boolean = true, // Cuidado!! Esta variable se comporta como constante!!!
): number {
    if (island == Island.GC || island == Island.TNF || island == Island.LNZ) {
        if (pax >= 9 && pax <= 18) {
            return basePrice;
        } else if (pax >= 19 && pax <= 30) {
            return kilometersHours < CONSTANT ? basePrice + 48 : basePrice + 96
        } else if (pax >= 31 && pax <= 55) {
            return kilometersHours < CONSTANT ? basePrice + 96 : basePrice + 192
        } else if (pax >= 56 && pax <= 71) {
            return kilometersHours < CONSTANT ? basePrice + 132 : basePrice + 264
        }
    } else if (island == Island.FTV) {
        if (pax >= 9 && pax <= 18 && !SPECIAL_PRICE_FTV_IS_ACTIVE) {
            return basePrice;
        } else if (pax >= 19 && pax <= 30 && !SPECIAL_PRICE_FTV_IS_ACTIVE) {
            if (kilometersHours < 480) {
                return basePrice + 48;
            } else if (kilometersHours < 550) {
                return basePrice + 60;
            } else {
                return basePrice + 96;
            }
        } else if (pax >= 31 && pax <= 55) {
            if (kilometersHours < 480) {
                return basePrice + 96;
            } else if (kilometersHours < 550) {
                return basePrice + 144;
            } else {
                return basePrice + 192;
            }
        } else if (pax >= 56 && pax <= 71) {
            if (kilometersHours < 480) {
                return basePrice + 132;
            } else {
                return basePrice + 264;
            }
        }
    }
    console.error("Error on _calculateSpecialExtraPrice9to18");
    return 0;
}

export function calculatePricesWithTresholds(kilometersHours: number, priceThresholds: PriceThreshold[]) {
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
    isAdapted: boolean,
    island: Island,
): number {
    
    if (island == Island.GC) {
        if (isLuxury) {
            if (pax <= 3) {
                if (kilometersHours < 355) {
                    return basePrice + 12;
                } else if (kilometersHours < 650) {
                    return basePrice + 24;
                } else { 
                    return basePrice + 120;
                }
            } else if (pax <= 6) {
                if (kilometersHours < 355) {
                    return basePrice + 36;
                } else if (kilometersHours < 650) {
                    return basePrice + 72;
                } else { 
                    return basePrice + 180;
                }
            } else if (pax <= 9) {
                if (kilometersHours < 355) {
                    return basePrice + 60;
                } else if (kilometersHours < 650) {
                    return basePrice + 120;
                } else { 
                    return basePrice + 240;
                }
            }
        } else if (isAdapted) {
            if (pax <= 4) {
                if (kilometersHours < 355) {
                    return basePrice + 24;
                } else if (kilometersHours < 650) {
                    return basePrice + 48;
                } else { 
                    return basePrice + 0;
                }
            } else if (pax <= 10) {
                if (kilometersHours < 355) {
                    return basePrice + 36;
                } else if (kilometersHours < 650) {
                    return basePrice + 72;
                } else { 
                    return basePrice + 0;
                }
            }
        } else if (pax <= 3) {
            return basePrice;
        } else if (pax <= 8) {
            if (kilometersHours < 355) {
                return basePrice + 24;
            } else if (kilometersHours < 650) {
                return basePrice + 48;
            } else { 
                return basePrice + 0;
            }
        }
    } else if (island == Island.TNF) {
        if (isLuxury) {
            if (pax <= 3) {
                if (kilometersHours < 700) {
                    return basePrice + 12;
                } else if (kilometersHours < 1200) {
                    return basePrice + 24;
                } else { 
                    return basePrice + 120;
                }
            } else if (pax <= 6) {
                if (kilometersHours < 700) {
                    return basePrice + 36;
                } else if (kilometersHours < 1200) {
                    return basePrice + 72;
                } else { 
                    return basePrice + 180;
                }
            } else if (pax <= 9) {
                if (kilometersHours < 700) {
                    return basePrice + 60;
                } else if (kilometersHours < 1200) {
                    return basePrice + 120;
                } else { 
                    return basePrice + 240;
                }
            }
        } else if (isAdapted) {
            if (pax <= 4) {
                if (kilometersHours < 700) {
                    return basePrice + 24;
                } else if (kilometersHours < 1200) {
                    return basePrice + 48;
                } else { 
                    return basePrice + 0;
                }
            } else if (pax <= 10) {
                if (kilometersHours < 700) {
                    return basePrice + 36;
                } else if (kilometersHours < 1200) {
                    return basePrice + 72;
                } else { 
                    return basePrice + 0;
                }
            }
        } else if (pax <= 3) {
            return basePrice;
        } else if (pax <= 8) {
            if (kilometersHours < 50) {
                return basePrice + 18;
            } else if (kilometersHours < 700) {
                return basePrice + 24;
            } else if (kilometersHours < 1200) {
                return basePrice + 48;
            } else { 
                return basePrice + 0;
            }
        }
    } else if (island == Island.FTV) {
        if (isLuxury) {
            if (pax <= 3) {
                if (kilometersHours < 480) {
                    return basePrice + 12;
                } else if (kilometersHours < 900) {
                    return basePrice + 24;
                } else { 
                    return basePrice + 120;
                }
            } else if (pax <= 6) {
                if (kilometersHours < 480) {
                    return basePrice + 36;
                } else if (kilometersHours < 900) {
                    return basePrice + 72;
                } else { 
                    return basePrice + 180;
                }
            } else if (pax <= 9) {
                if (kilometersHours < 480) {
                    return basePrice + 60;
                } else if (kilometersHours < 900) {
                    return basePrice + 120;
                } else { 
                    return basePrice + 240;
                }
            }
        } else if (isAdapted) {
            if (pax <= 4) {
                if (kilometersHours < 480) {
                    return basePrice + 24;
                } else if (kilometersHours < 900) {
                    return basePrice + 24;
                } else { 
                    return basePrice + 0;
                }
            } else if (pax <= 10) {
                if (kilometersHours < 480) {
                    return basePrice + 36;
                } else if (kilometersHours < 900) {
                    return basePrice + 36;
                } else { 
                    return basePrice + 0;
                }
            }
        } else if (pax <= 3) {
            return basePrice;
        } else if (pax <= 8) {
            if (kilometersHours < 6.5) {
                return basePrice + 15.6;
            } else if (kilometersHours < 50) {
                return basePrice + 18;
            } else if (kilometersHours < 480) {
                return basePrice + 24;
            } else if (kilometersHours < 900) {
                return basePrice + 48;
            } else { 
                return basePrice + 0;
            }
        }
    } else if (island == Island.LNZ) {
        if (isLuxury) {
            if (pax <= 3) {
                if (kilometersHours < 130) {
                    return basePrice + 12;
                } else if (kilometersHours < 350) {
                    return basePrice + 24;
                } else { 
                    return basePrice + 120;
                }
            } else if (pax <= 6) {
                if (kilometersHours < 130) {
                    return basePrice + 36;
                } else if (kilometersHours < 350) {
                    return basePrice + 72;
                } else { 
                    return basePrice + 180;
                }
            } else if (pax <= 9) {
                if (kilometersHours < 130) {
                    return basePrice + 60;
                } else if (kilometersHours < 350) {
                    return basePrice + 120;
                } else { 
                    return basePrice + 240;
                }
            }
        } else if (isAdapted) {
            if (pax <= 4) {
                if (kilometersHours < 130) {
                    return basePrice + 24;
                } else if (kilometersHours < 350) {
                    return basePrice + 48;
                } else { 
                    return basePrice + 0;
                }
            } else if (pax <= 10) {
                if (kilometersHours < 130) {
                    return basePrice + 36;
                } else if (kilometersHours < 350) {
                    return basePrice + 72;
                } else { 
                    return basePrice + 0;
                }
            }
        } else if (pax <= 3) {
            return basePrice;
        } else if (pax <= 8) {
            if (kilometersHours < 6.5) {
                return basePrice + 15.6;
            } else if (kilometersHours < 50) {
                return basePrice + 18;
            } else if (kilometersHours < 130) {
                return basePrice + 24;
            } else if (kilometersHours < 350) {
                return basePrice + 48;
            } else { 
                return basePrice + 0;
            }
        }
    } else if (island == Island.LP) {
        if (isAdapted) {
            if (pax <= 4) {
                if (kilometersHours < 380) {
                    return basePrice + 24;
                } else { 
                    return basePrice + 0;
                }
            } else if (pax <= 10) {
                if (kilometersHours < 380) {
                    return basePrice + 36;
                } else { 
                    return basePrice + 0;
                }
            }
        } else if (pax <= 3) {
            return basePrice;
        } else if (pax <= 8) {
            if (kilometersHours < 12) {
                return basePrice + 4.8;
            } else if (kilometersHours < 160) {
                return basePrice + 10.8;
            } else if (kilometersHours < 240) {
                return basePrice + 12;
            } else if (kilometersHours < 380) {
                return basePrice + 24;
            } else { 
                return basePrice + 0;
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
    pax: number,
    airportCoordinates: { [key in Airport]: Coordinates },
    islandsRoundZonePolygons: Partial<{ [key in Island]: Partial<{ [key in CardinalPoint]: Coordinates[] }> }>,
    ): { coordinates: Coordinates[], roundTrip: boolean } {

    var route: Coordinates[] = [];
    var roundTrip: boolean = false;
    if (serviceType == ServiceType.PRIVADO) {
        if (island == Island.GC
            && islandsRoundZonePolygons.GC
            && islandsRoundZonePolygons.GC.NORTH
            && islandsRoundZonePolygons.GC.WEST) {
            route.push(airportCoordinates.LPA);
            route.push(origin);

            if (origin == destination) {
                route.push(airportCoordinates.LPA);
            }

            if (pax > 30 &&
                (
                    (isPointInPolygon(origin, islandsRoundZonePolygons.GC.NORTH) && isPointInPolygon(destination, islandsRoundZonePolygons.GC.WEST))
                    || (isPointInPolygon(origin, islandsRoundZonePolygons.GC.WEST) && isPointInPolygon(destination, islandsRoundZonePolygons.GC.NORTH))
                )
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
            && islandsRoundZonePolygons.TNF.WEST) {
            
            if (isAirportCloseToCoordinates(destination, airportCoordinates, 500)) {
                route.push(destination);
            } else {
                route.push(airportCoordinates[nearestAirport]);
            }

            route.push(origin);

            if (origin == destination) {
                route.push(airportCoordinates[nearestAirport]);
            }

            if (pax > 30 && isPointInPolygon(origin, islandsRoundZonePolygons.TNF.NORTH) && isPointInPolygon(destination, islandsRoundZonePolygons.TNF.WEST)) {
                console.log('🌏 Round island!');
                roundTrip = true;
                route.push(airportCoordinates.TFN);
                route.push(airportCoordinates.TFS);
                route.push(destination);
                route.push(airportCoordinates.TFS);
                route.push(airportCoordinates.TFN);
            } else if (pax > 30 && isPointInPolygon(origin, islandsRoundZonePolygons.TNF.WEST) && isPointInPolygon(destination, islandsRoundZonePolygons.TNF.NORTH)) {
                console.log('🌏 Round island!');
                roundTrip = true;
                route.push(airportCoordinates.TFS);
                route.push(airportCoordinates.TFN);
                route.push(destination);
                route.push(airportCoordinates.TFN);
                route.push(airportCoordinates.TFS);
            } else {
                route.push(destination);
                route.push(airportCoordinates[nearestAirport]);
            }
        } else if (island == Island.FTV) {
            route.push(airportCoordinates.FUE);
            route.push(origin);

            if (origin == destination) {
                route.push(airportCoordinates.FUE);
            }

            route.push(destination);
            route.push(airportCoordinates.FUE);
        } else if (island == Island.LNZ) {
            route.push(airportCoordinates.ACE);
            route.push(origin);

            if (origin == destination) {
                route.push(airportCoordinates.ACE);
            }

            route.push(destination);
            route.push(airportCoordinates.ACE);
        } else if (island == Island.LP) {
            route.push(airportCoordinates.SPC);
            route.push(origin);

            if (origin == destination) {
                route.push(airportCoordinates.SPC);
            }

            route.push(destination);
            route.push(airportCoordinates.SPC);
        }
    }
    return { coordinates: route, roundTrip: roundTrip };
}

// TODO: Check if is necessary to calculate the arrival hours.
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

// TODO: Check if this is used correctly
export function calculateIsAdapted(vehicleType: VehicleType | undefined): boolean {
    if (!vehicleType) {
        return false;
    }
    return vehicleType == VehicleType.ADAPTED_VEHICLE;
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

        if (island == Island.GC && kilometersHours <= 5) {
            return {
                isReduced: true,
                kilometers: kilometers,
                hours: hours
            }
        } else if (island == Island.TNF && kilometersHours <= 8) {
            return {
                isReduced: true,
                kilometers: kilometers,
                hours: hours
            }
        } else if (island == Island.FTV && kilometersHours <= 7) {
            return {
                isReduced: true,
                kilometers: kilometers,
                hours: hours
            }
        } else if (island == Island.LNZ && kilometersHours <= 4) {
            return {
                isReduced: true,
                kilometers: kilometers,
                hours: hours
            }
        } else if (island == Island.LP && kilometersHours <= 10) {
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
    isAdapted: boolean,
    island: Island,
    zoneLevel: ZoneLevel,
    MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA: number,
    SPECIAL_PRICE_FTV_IS_ACTIVE: boolean = true, // Cuidado!! Esta variable se comporta como constante!!!
): number {

    // TODO: Limitar maximo de pax en Luxury -> 9, La Palma -> 55 y TNF -> 63, y en La Palma no hay luxury

    // TODO: Pasar a una constante al hacer refactor
    const TABLE_PRICES = {
        'medio_dia': {
            'normal_1_tramo': 240,
            'normal_2_tramo': 300,
            'normal_3_tramo': 384,
            'normal_4_tramo': 504,
            'vip_1_tramo': 360,
            'vip_2_tramo': 420,
            'vip_3_tramo': 480,
        },
        'dia_completo': {
            'normal_1_tramo': 360,
            'normal_2_tramo': 420,
            'normal_3_tramo': 504,
            'normal_4_tramo': 648,
            'vip_1_tramo': 480,
            'vip_2_tramo': 600,
            'vip_3_tramo': 720,
        },
        'hora_extra': {
            'normal_1_tramo': 36,
            'normal_2_tramo': 48,
            'normal_3_tramo': 60,
            'normal_4_tramo': 72,
            'vip_1_tramo': 36,
            'vip_2_tramo': 48,
            'vip_3_tramo': 48,
        }
    }

    if (island == Island.FTV && pax >= 9 && pax <= 30 && !isLuxury && !isAdapted && SPECIAL_PRICE_FTV_IS_ACTIVE) {
        pax = 55;
    }

    const TOTAL_HOURS: number = (arrivalDateTime.getTime() - departureDateTime.getTime()) / 1000 / 60 / 60;

    console.log(`⏳ Total hours: ${TOTAL_HOURS}`);

    if (zoneLevel == ZoneLevel.HARD || zoneLevel == ZoneLevel.VERY_HARD) {
        if (isLuxury) {
            if (TOTAL_HOURS <= 7) {
                if (pax <= 3) {
                    return TABLE_PRICES.dia_completo.vip_1_tramo;
                } else if (pax <= 6) {
                    return TABLE_PRICES.dia_completo.vip_2_tramo;
                } else if (pax <= 9) {
                    return TABLE_PRICES.dia_completo.vip_3_tramo;
                }
            } else if (TOTAL_HOURS <= 11) {
                const extraHours = Math.ceil(TOTAL_HOURS - 7);
                if (pax <= 3) {
                    return TABLE_PRICES.dia_completo.vip_1_tramo + extraHours * TABLE_PRICES.hora_extra.vip_1_tramo;
                } else if (pax <= 6) {
                    return TABLE_PRICES.dia_completo.vip_2_tramo + extraHours * TABLE_PRICES.hora_extra.vip_3_tramo;
                } else if (pax <= 9) {
                    return TABLE_PRICES.dia_completo.vip_3_tramo + extraHours * TABLE_PRICES.hora_extra.vip_3_tramo;
                }
            } else if (TOTAL_HOURS <= 12) {
                if (pax <= 3) {
                    return TABLE_PRICES.dia_completo.vip_1_tramo + TABLE_PRICES.medio_dia.vip_1_tramo + TABLE_PRICES.hora_extra.vip_1_tramo;
                } else if (pax <= 6) {
                    return TABLE_PRICES.dia_completo.vip_2_tramo + TABLE_PRICES.medio_dia.vip_2_tramo + TABLE_PRICES.hora_extra.vip_2_tramo;
                } else if (pax <= 9) {
                    return TABLE_PRICES.dia_completo.vip_3_tramo + TABLE_PRICES.medio_dia.vip_3_tramo + TABLE_PRICES.hora_extra.vip_3_tramo;
                }
            } else if (TOTAL_HOURS <= 16) {
                if (pax <= 3) {
                    return (TABLE_PRICES.dia_completo.vip_1_tramo * 2) + TABLE_PRICES.hora_extra.vip_1_tramo;
                } else if (pax <= 6) {
                    return (TABLE_PRICES.dia_completo.vip_2_tramo * 2) + TABLE_PRICES.hora_extra.vip_2_tramo;
                } else if (pax <= 9) {
                    return (TABLE_PRICES.dia_completo.vip_3_tramo * 2) + TABLE_PRICES.hora_extra.vip_3_tramo;
                }
            }
        } else {
            if (TOTAL_HOURS <= 7) {
                if (
                    (pax <= 18 && island != Island.LP)
                    || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
                ) {
                    return TABLE_PRICES.dia_completo.normal_1_tramo;
                } else if (pax <= 30) {
                    return TABLE_PRICES.dia_completo.normal_2_tramo;
                } else if (pax <= 55) {
                    return TABLE_PRICES.dia_completo.normal_3_tramo;
                } else if (pax <= 71) {
                    return TABLE_PRICES.dia_completo.normal_3_tramo;
                }
            } else if (TOTAL_HOURS <= 11) {
                const extraHours = Math.ceil(TOTAL_HOURS - 7);
                if (
                    (pax <= 18 && island != Island.LP)
                    || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
                ) {
                    return TABLE_PRICES.dia_completo.normal_1_tramo + extraHours * TABLE_PRICES.hora_extra.normal_1_tramo;
                } else if (pax <= 30) {
                    return TABLE_PRICES.dia_completo.normal_2_tramo + extraHours * TABLE_PRICES.hora_extra.normal_2_tramo;
                } else if (pax <= 55) {
                    return TABLE_PRICES.dia_completo.normal_3_tramo + extraHours * TABLE_PRICES.hora_extra.normal_3_tramo;
                } else if (pax <= 71) {
                    return TABLE_PRICES.dia_completo.normal_4_tramo + extraHours * TABLE_PRICES.hora_extra.normal_4_tramo;
                }
            } else if (TOTAL_HOURS <= 12) {
                if (
                    (pax <= 18 && island != Island.LP)
                    || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
                ) {
                    return TABLE_PRICES.dia_completo.normal_1_tramo + TABLE_PRICES.medio_dia.normal_1_tramo + TABLE_PRICES.hora_extra.normal_1_tramo;
                } else if (pax <= 30) {
                    return TABLE_PRICES.dia_completo.normal_2_tramo + TABLE_PRICES.medio_dia.normal_2_tramo + TABLE_PRICES.hora_extra.normal_2_tramo;
                } else if (pax <= 55) {
                    return TABLE_PRICES.dia_completo.normal_3_tramo + TABLE_PRICES.medio_dia.normal_3_tramo + TABLE_PRICES.hora_extra.normal_3_tramo;
                } else if (pax <= 71) {
                    return TABLE_PRICES.dia_completo.normal_4_tramo + TABLE_PRICES.medio_dia.normal_4_tramo + TABLE_PRICES.hora_extra.normal_4_tramo;
                }
            } else if (TOTAL_HOURS <= 16) {
                if (
                    (pax <= 18 && island != Island.LP)
                    || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
                ) {
                    return (TABLE_PRICES.dia_completo.normal_1_tramo * 2) + TABLE_PRICES.hora_extra.normal_1_tramo;
                } else if (pax <= 30) {
                    return (TABLE_PRICES.dia_completo.normal_2_tramo * 2) + TABLE_PRICES.hora_extra.normal_2_tramo;
                } else if (pax <= 55) {
                    return (TABLE_PRICES.dia_completo.normal_3_tramo * 2) + TABLE_PRICES.hora_extra.normal_3_tramo;
                } else if (pax <= 71) {
                    return (TABLE_PRICES.dia_completo.normal_4_tramo * 2) + TABLE_PRICES.hora_extra.normal_4_tramo;
                }
            }
        }
    }

    if (isLuxury) {
        if (TOTAL_HOURS <= 4) {
            if (pax <= 3) {
                return TABLE_PRICES.medio_dia.vip_1_tramo;
            } else if (pax <= 6) {
                return TABLE_PRICES.medio_dia.vip_2_tramo;
            } else if (pax <= 9) {
                return TABLE_PRICES.medio_dia.vip_3_tramo;
            }
        } else if (TOTAL_HOURS <= 8) {
            if (pax <= 3) {
                return TABLE_PRICES.dia_completo.vip_1_tramo;
            } else if (pax <= 6) {
                return TABLE_PRICES.dia_completo.vip_2_tramo;
            } else if (pax <= 9) {
                return TABLE_PRICES.dia_completo.vip_3_tramo;
            }
        } else if (TOTAL_HOURS <= 11) {
            const extraHours = Math.ceil(TOTAL_HOURS - 8);
            if (pax <= 3) {
                return TABLE_PRICES.dia_completo.vip_1_tramo + extraHours * TABLE_PRICES.hora_extra.vip_1_tramo;
            } else if (pax <= 6) {
                return TABLE_PRICES.dia_completo.vip_2_tramo + extraHours * TABLE_PRICES.hora_extra.vip_3_tramo;
            } else if (pax <= 9) {
                return TABLE_PRICES.dia_completo.vip_3_tramo + extraHours * TABLE_PRICES.hora_extra.vip_3_tramo;
            }
        } else if (TOTAL_HOURS <= 12) {
            if (pax <= 3) {
                return TABLE_PRICES.dia_completo.vip_1_tramo + TABLE_PRICES.medio_dia.vip_1_tramo;
            } else if (pax <= 6) {
                return TABLE_PRICES.dia_completo.vip_2_tramo + TABLE_PRICES.medio_dia.vip_2_tramo;
            } else if (pax <= 9) {
                return TABLE_PRICES.dia_completo.vip_3_tramo + TABLE_PRICES.medio_dia.vip_3_tramo;
            }
        } else if (TOTAL_HOURS <= 16) {
            if (pax <= 3) {
                return TABLE_PRICES.dia_completo.vip_1_tramo * 2;
            } else if (pax <= 6) {
                return TABLE_PRICES.dia_completo.vip_2_tramo * 2;
            } else if (pax <= 9) {
                return TABLE_PRICES.dia_completo.vip_3_tramo * 2;
            }
        }
    } else {
        if (TOTAL_HOURS <= 4) {
            if (
                (pax <= 18 && island != Island.LP)
                || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
            ) {
                return TABLE_PRICES.medio_dia.normal_1_tramo;
            } else if (pax <= 30) {
                return TABLE_PRICES.medio_dia.normal_2_tramo;
            } else if (pax <= 55) {
                return TABLE_PRICES.medio_dia.normal_3_tramo;
            } else if (pax <= 71) {
                return TABLE_PRICES.medio_dia.normal_4_tramo;
            }
        } else if (TOTAL_HOURS <= 8) {
            if (
                (pax <= 18 && island != Island.LP)
                || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
            ) {
                return TABLE_PRICES.dia_completo.normal_1_tramo;
            } else if (pax <= 30) {
                return TABLE_PRICES.dia_completo.normal_2_tramo;
            } else if (pax <= 55) {
                return TABLE_PRICES.dia_completo.normal_3_tramo;
            } else if (pax <= 71) {
                return TABLE_PRICES.dia_completo.normal_4_tramo;
            }
        } else if (TOTAL_HOURS <= 11) {
            const extraHours = Math.ceil(TOTAL_HOURS - 8);
            if (
                (pax <= 18 && island != Island.LP)
                || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
            ) {
                return TABLE_PRICES.dia_completo.normal_1_tramo + (extraHours * TABLE_PRICES.hora_extra.normal_1_tramo);
            } else if (pax <= 30) {
                return TABLE_PRICES.dia_completo.normal_2_tramo + (extraHours * TABLE_PRICES.hora_extra.normal_2_tramo);
            } else if (pax <= 55) {
                return TABLE_PRICES.dia_completo.normal_3_tramo + (extraHours * TABLE_PRICES.hora_extra.normal_3_tramo);
            } else if (pax <= 71) {
                return TABLE_PRICES.dia_completo.normal_4_tramo + (extraHours * TABLE_PRICES.hora_extra.normal_4_tramo);
            }
        } else if (TOTAL_HOURS <= 12) {
            if (
                (pax <= 18 && island != Island.LP)
                || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
            ) {
                return TABLE_PRICES.dia_completo.normal_1_tramo + TABLE_PRICES.medio_dia.normal_1_tramo;
            } else if (pax <= 30) {
                return TABLE_PRICES.dia_completo.normal_2_tramo + TABLE_PRICES.medio_dia.normal_2_tramo;
            } else if (pax <= 55) {
                return TABLE_PRICES.dia_completo.normal_3_tramo + TABLE_PRICES.medio_dia.normal_3_tramo;
            } else if (pax <= 71) {
                return TABLE_PRICES.dia_completo.normal_4_tramo + TABLE_PRICES.medio_dia.normal_4_tramo;
            }
        } else if (TOTAL_HOURS <= 16) {
            if (
                (pax <= 18 && island != Island.LP)
                || (island == Island.LP && pax <= MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA)
            ) {
                return TABLE_PRICES.dia_completo.normal_1_tramo * 2;
            } else if (pax <= 30) {
                return TABLE_PRICES.dia_completo.normal_2_tramo * 2;
            } else if (pax <= 55) {
                return TABLE_PRICES.dia_completo.normal_3_tramo * 2;
            } else if (pax <= 71) {
                return TABLE_PRICES.dia_completo.normal_4_tramo * 2;
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
    isAdapted: boolean,
    isSpecial: boolean,
    MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA: number
): number {

    let basePrice: number = 0;

    if (pax >= 9 && !isLuxury && !isAdapted) {

        if (nearestAiport == Airport.LPA) {

            if (isReducedPrice) {
                basePrice = 132
            } else if (isSpecial) {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [50, 132],
                    [150, 144],
                    [225, 156],
                    [300, 168],
                    [355, 180],
                    [450, 288],
                    [550, 312],
                    [650, 324],
                    [Infinity, 324]
                ])
                calculateSpecialExtraPriceGreaterThan9(pax, kilometersHours, basePrice, Island.GC,  355);
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [50, 132],
                    [150, 144],
                    [225, 156],
                    [300, 168],
                    [355, 180],
                    [Infinity, 240]
                ])
            }

            return calculateExtraPriceGreatherThan9(pax, kilometersHours, basePrice, Island.GC, 355);

        } else if (nearestAiport == Airport.TFN || nearestAiport == Airport.TFS) {

            if (isReducedPrice && kilometersHours <= 4) {
                basePrice = 120;
            } else if (isReducedPrice && kilometersHours <= 8) {
                basePrice = 132
            } else if (isSpecial) {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 132],
                    [70, 144],
                    [100, 156],
                    [200, 168],
                    [370, 180],
                    [500, 192],
                    [700, 204],
                    [1000, 276],
                    [1200, 300],
                    [Infinity, 312]
                ]);
                calculateSpecialExtraPriceGreaterThan9(pax, kilometersHours, basePrice, Island.TNF, 700);
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 132],
                    [70, 144],
                    [100, 156],
                    [200, 168],
                    [370, 180],
                    [500, 192],
                    [700, 204],
                    [Infinity, 240]
                ])
            }

            return calculateExtraPriceGreatherThan9(pax, kilometersHours, basePrice, Island.TNF, 700);

        } else if (nearestAiport == Airport.ACE) {

            if (isReducedPrice && kilometersHours <= 4) {
                basePrice = 120;
            } else if (isSpecial) {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 120],
                    [130, 156],
                    [200, 276],
                    [350, 312],
                    [Infinity, 312]
                ]);
                calculateSpecialExtraPriceGreaterThan9(pax, kilometersHours, basePrice, Island.LNZ, 130);
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 120],
                    [130, 156],
                    [Infinity, 240]
                ])
            }

            return calculateExtraPriceGreatherThan9(pax, kilometersHours, basePrice, Island.LNZ, 130);

        } else if (nearestAiport == Airport.FUE) {

            if (isReducedPrice && kilometersHours <= 7) {
                basePrice = 120;
            } else if (isSpecial) {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [50, 120],
                    [100, 132],
                    [160, 156],
                    [300, 168],
                    [480, 180],
                    [550, 240],
                    [650, 300],
                    [900, 312],
                    [Infinity, 312]
                ]);
                calculateSpecialExtraPriceGreaterThan9(pax, kilometersHours, basePrice, Island.FTV, 480);
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [50, 120],
                    [100, 132],
                    [160, 156],
                    [300, 168],
                    [480, 180],
                    [Infinity, 240]
                ])
            }

            return calculateExtraPriceGreatherThan9(pax, kilometersHours, basePrice, Island.FTV, 480);

        } else if (nearestAiport == Airport.SPC) {

            if (isReducedPrice) {
                basePrice = 50.4;
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 120],
                    [50, 144],
                    [160, 172.8],
                    [250, 180],
                    [380, 211.2],
                    [Infinity, 240]
                ])
            }

            return calculateExtraPriceGreatherThan9(pax, kilometersHours, basePrice, Island.LP, 380, MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA);

        }

    } else {
        if (nearestAiport == Airport.LPA) {

            if (isReducedPrice) {
                basePrice = 48
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [50, 48],
                    [150, 60],
                    [225, 72],
                    [300, 84],
                    [355, 96],
                    [450, 120],
                    [550, 144],
                    [650, 156],
                    [Infinity, 240]
                ])
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, isAdapted, Island.GC);
        } else if (nearestAiport == Airport.TFN || nearestAiport == Airport.TFS) {

            if (isReducedPrice && kilometersHours <= 4) {
                basePrice = 36;
            } else if (isReducedPrice && kilometersHours <= 8) {
                basePrice = 42
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 42],
                    [70, 54],
                    [100, 60],
                    [200, 84],
                    [370, 120],
                    [500, 132],
                    [700, 144],
                    [1000, 156],
                    [1200, 168],
                    [Infinity, 240]
                ]);
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, isAdapted, Island.TNF);
        } else if (nearestAiport == Airport.ACE) {

            if (isReducedPrice && kilometersHours <= 4) {
                basePrice = 32.4;
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 36],
                    [130, 60],
                    [200, 96],
                    [350, 120],
                    [Infinity, 240]
                ]);
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, isAdapted, Island.LNZ);
        } else if (nearestAiport == Airport.FUE) {

            if (isReducedPrice && kilometersHours <= 7) {
                basePrice = 32.4;
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [50, 32.4],
                    [100, 60],
                    [160, 72],
                    [300, 108],
                    [480, 120],
                    [550, 150],
                    [650, 168],
                    [900, 180],
                    [Infinity, 240]
                ]);
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, isAdapted, Island.FTV);
        } else if (nearestAiport == Airport.SPC) {

            if (isReducedPrice) {
                basePrice = 14.4;
            } else {
                basePrice = calculatePricesWithTresholds(kilometersHours, [
                    [30, 32.4],
                    [50, 54],
                    [160, 66],
                    [250, 90],
                    [380, 120],
                    [Infinity, 240]
                ])
            }

            return calculateExtraPrice1to8(pax, kilometersHours, basePrice, isLuxury, isAdapted, Island.LP);
        }

    }

    return basePrice;
}


export function calculateModelPrice(
    zoneLevel: ZoneLevel,
    pax: number,
    island: Island,
    isLuxury: boolean,
    kilometersHours: number,
    nearestAirport: Airport,
    isReduced: boolean,
    isAdapted: boolean,
    isSpecial: boolean,
    MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA: number
) {

    let priceKMH: number = calculatePriceKMH(pax, kilometersHours, nearestAirport, isLuxury, isReduced, isAdapted, isSpecial, MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA);

    if (zoneLevel == ZoneLevel.HARD || zoneLevel == ZoneLevel.VERY_HARD) {
        const datetimeNow: Date = new Date();
        const datetimeNowPlus4Hours: Date = new Date(datetimeNow.getTime() + (4 * 60 * 60 * 1000));
        let referencePrice: number = calculateAtDisposalPrice(pax, datetimeNow, datetimeNowPlus4Hours, isLuxury, isAdapted, island, ZoneLevel.NORMAL, MAX_MICROBUS_PAX_CAPACITY_AT_LA_PALMA);

        return priceKMH > referencePrice ? priceKMH : referencePrice;
    } 

    return priceKMH;
}

export function calculatePriceLuggage(luggage: number): number {
    return luggage * 12;
}

export function calculatePriceLuggageManipulation(pax: number, isLuxury: boolean, luggage: number, originCoordinates: Coordinates, destinationCoordinates: Coordinates, LUGGAGE_ZONE_POLYGONS: Coordinates[][]) {
    if (luggage > 0) {
        if (pax <= 8 || isLuxury) {
            return 5;
        } else {
            return 10;
        }
    }

    const isLuggageZone = isPointInAnyPolygon(originCoordinates, LUGGAGE_ZONE_POLYGONS) || isPointInAnyPolygon(destinationCoordinates, LUGGAGE_ZONE_POLYGONS);

    if (isLuggageZone) {
        if (pax <= 8 || isLuxury) {
            return 5;
        } else {
            return 10;
        }
    }

    return 0;
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

export function calculateTaxes(pax: number, isLuxury: boolean): number {
    if (pax < 9 && isLuxury) {
        return 0.07;
    }
    return 0.03
}
