FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY db db
COPY tsconfig.json .

ARG NODE_ENV
CMD ["bun", "src/index.ts"]

EXPOSE 3000