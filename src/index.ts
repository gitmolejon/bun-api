import { Elysia, t } from "elysia";
import { swagger } from '@elysiajs/swagger'

import { calculateEstimatePrice } from './calculate-price'
import { ServiceType, VehicleType } from "./types";

const app = new Elysia()
  .use(swagger())
  .post('/quote', async ({ body }) => {
    console.log("Body: ", body);
    const departureDateTime = new Date(body.departureDateTime);
    const arrivalDateTime = body.arrivalDateTime ? new Date(body.arrivalDateTime) : undefined;
    const originCoordinates = body.originCoordinates as [number, number];
    const destinationCoordinates = body.destinationCoordinates as [number, number];
    const result = await calculateEstimatePrice({ ...body, departureDateTime, arrivalDateTime, originCoordinates, destinationCoordinates });
    if (result > 0)
      return { price: result };
    else
      return { error: "No se ha podido calcular el precio" };
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
