// TODO: Mejorar la respuesta de status con los errores...

import { Elysia, t } from "elysia";
import { swagger } from '@elysiajs/swagger'
import { Database } from "bun:sqlite";
import { migrate } from './migration'
import { getMigrations } from './migrator'

import { calculateEstimatePrice } from './calculate-price'
import { ServiceType, bodyArrayObject, bodyObject } from "./types";

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

    const result = await calculateEstimatePrice({
      ...body,
      departureDateTime,
      arrivalDateTime,
      originCoordinates,
      destinationCoordinates
    }, db);

    if (body.roundTrip) {
      if (arrivalDateTime && ['PRIVADO'].includes(body.serviceType)) {
        const resultRoundTrip = await calculateEstimatePrice({
          ...body,
          departureDateTime: arrivalDateTime,
          arrivalDateTime: undefined,
          originCoordinates,
          destinationCoordinates
        }, db);

        result.price += resultRoundTrip.price;
      } else {
        console.error("Round trip error because there is no arrivalDateTime or serviceType is not PRIVADO")
        return { price: 0, metadata: { ...result.metadata, roundTrip: body.roundTrip }, status: "Round trip error because there is no arrivalDateTime or serviceType is not PRIVADO" };
      }
    } 

    if (result.price > 0)
      return { price: result.price, metadata: { ...result.metadata, roundTrip: body.roundTrip } };
    else
      return { price: 0, metadata: {}, status: "ERROR" };
  }, {
    body: bodyObject
  })
  .post('/quotes', async ({ body, headers }) => {
    if (API_KEY && headers['authorization'] !== `Bearer ${API_KEY}`) {
      return { error: "Unauthorized" };
    }
    
    console.log("Body: ", body);
    const quotes = [];

    for (const item of body) {
      const departureDateTime = new Date(item.departureDateTime);
      const arrivalDateTime = item.arrivalDateTime ? new Date(item.arrivalDateTime) : undefined;
      const originCoordinates = item.originCoordinates as [number, number];
      const destinationCoordinates = item.destinationCoordinates as [number, number];
      const result = await calculateEstimatePrice({ ...item, departureDateTime, arrivalDateTime, originCoordinates, destinationCoordinates }, db);

      console.log('🐛 [BORRAR] ->', 'El resultado obtenido es ', result)

      console.log("Round trip: ", item.roundTrip)
      if (item.roundTrip) {
        if (item.serviceType == ServiceType.SHUTTLE) {
          result.price *= 2;
        } else if (arrivalDateTime && [ServiceType.PRIVADO].includes(item.serviceType)) {
          const resultRoundTrip = await calculateEstimatePrice({
            ...item,
            departureDateTime: arrivalDateTime,
            arrivalDateTime: undefined,
            originCoordinates,
            destinationCoordinates
          }, db);

          const resultBackRoundTrip = await calculateEstimatePrice({
            ...item,
            departureDateTime: arrivalDateTime,
            arrivalDateTime: undefined,
            destinationCoordinates,
            originCoordinates
          }, db);
  
          result.price += resultRoundTrip.price + resultBackRoundTrip.price;
          
        } else {
          quotes.push({ price: 0, uid: item.uid, metadata: {}, status: "Round trip error because there is no arrivalDateTime or serviceType is not PRIVADO" });
          console.error("Round trip error because there is no arrivalDateTime or serviceType is not PRIVADO")
          continue;
        }
      } 

      if (result.price > 0) {
        quotes.push({ price: result.price, uid: item.uid, metadata: result.metadata, status: "OK" });
      } else {
        quotes.push({ price: 0, uid: item.uid, metadata: {}, status: "ERROR" });
      }
    }
    return quotes;
  }, {
    body: bodyArrayObject
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
