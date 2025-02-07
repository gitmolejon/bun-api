export type Coordinates = [number, number];

export type PriceThreshold = [number, number];

export enum Airport {
    VDE = "VDE",
    SPC = "SPC",
    GMZ = "GMZ",
    TNF = "TNF",
    TNS = "TNS",
    LPA = "LPA",
    ACE = "ACE",
    FUE = "FUE",
}

export enum ServiceType {
    PRIVADO = "PRIVADO",
    A_DISPOSICION = "A_DISPOSICION", // TODO: Ver si tiene sentido dejarlo
}

export enum Island {
    GC = "GC",
    TNF = "TNF",
    LP = "LP",
    FTV = "FTV",
    LNZ = "LNZ"
}

export enum VehicleType {
    BUS = "BUS",
    CAR = "CAR",
    LUXURY_CAR = "LUXURY_CAR",
    LUXURY_MINIVAN = "LUXURY_MINIVAN",
    MICROBUS = "MICROBUS",
    ADAPTED_VEHICLE = "ADAPTED_VEHICLE",
}

export enum CardinalPoint {
    NORTH = "NORTH",
    SOUTH = "SOUTH",
    EAST = "EAST",
    WEST = "WEST",
}

export enum ZoneLevel {
    NORMAL = "NORMAL",
    HARD = "HARD",
    VERY_HARD = "VERY_HARD",
}

export enum DayTime {
    DAY = "DAY",
    NIGHT = "NIGHT"
}

export interface Parameters {
    serviceType: ServiceType;
    departureDateTime: Date;
    originCoordinates: Coordinates;
    destinationCoordinates: Coordinates;
    pax: number;
    rate?: number;
    vehicleType?: VehicleType;
    arrivalDateTime?: Date;
    kidStroller?: number;
    surfBoard?: number;
    golfBag?: number;
    bike?: number;
    specialLuggage?: number;
    extraLuggage?: number;
}

export interface Constants {
    hardZonePolygons: Coordinates[][];
    veryHardZonePolygons: Coordinates[][];
    islandsRoundZonePolygons: Partial<{ [key in Island]: Partial<{ [key in CardinalPoint]: Coordinates[] }> }>;
    airportCoordinates: { [key in Airport]: Coordinates };
    shuttleZonePolygons: Coordinates[][];
    luggageZonePolygons: Coordinates[][];
    islandZonePolygons: { [key in Island]: Coordinates[] };
}
