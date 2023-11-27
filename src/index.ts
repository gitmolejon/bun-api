import { Elysia, t } from "elysia";
import { swagger } from '@elysiajs/swagger'
import { Database } from "bun:sqlite";
import { migrate } from './migration'
import { getMigrations } from './migrator'

import { calculateEstimatePrice } from './calculate-price'
import { ServiceType, VehicleType } from "./types";

const API_KEY = process.env.API_KEY || false;

const db = new Database(`db/data.sqlite`, { create: true })
migrate(db, getMigrations('./migrations'))

const app = new Elysia()
  .use(swagger())
  .get('/', () => {
    return "Go to /swagger to see the API documentation"
  })
  .post('/quote', async ({ body, headers }) => {
    if (API_KEY && headers['authorization'] !== `Bearer ${API_KEY}`) {
      return { error: "Unauthorized" };
    }
    
    console.log("Body: ", body);
    const departureDateTime = new Date(body.departureDateTime);
    const arrivalDateTime = body.arrivalDateTime ? new Date(body.arrivalDateTime) : undefined;
    const originCoordinates = body.originCoordinates as [number, number];
    const destinationCoordinates = body.destinationCoordinates as [number, number];
    const result = await calculateEstimatePrice({ ...body, departureDateTime, arrivalDateTime, originCoordinates, destinationCoordinates }, db);
    if (result > 0)
      return { price: result, time: console.timeEnd("quote") };
    else
      return { error: "No se ha podido calcular el precio", time: console.timeEnd("quote") };
  }, {
    body: t.Object({
      serviceType: t.Enum(ServiceType),
      departureDateTime: t.String(),
      arrivalDateTime: t.Optional(t.String()),
      pax: t.Integer(),
      originCoordinates: t.Array(t.Number(), { minItems: 2, maxItems: 2 }),
      destinationCoordinates: t.Array(t.Number(), { minItems: 2, maxItems: 2 }),
      rate: t.Optional(t.Number()),
      vehicleType: t.Optional(t.Enum(VehicleType)),
      kidStroller: t.Optional(t.Integer()),
      surfBoard: t.Optional(t.Integer()),
      golfBag: t.Optional(t.Integer()),
      bike: t.Optional(t.Integer()),
      specialLuggage: t.Optional(t.Integer()),
      extraLuggage: t.Optional(t.Integer())
    })
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
