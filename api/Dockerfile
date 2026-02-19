FROM node:20-alpine

WORKDIR /app

RUN npm install -g ts-node typescript

COPY api/package*.json ./
RUN npm install

COPY api/tsconfig.json ./
COPY api/src ./src

EXPOSE 3001
CMD ["ts-node", "--skip-project", "--compiler-options", "{\"module\":\"commonjs\"}", "src/index.ts"]