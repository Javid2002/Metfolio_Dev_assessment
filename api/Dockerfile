FROM node:20-alpine

WORKDIR /app

COPY api/package*.json ./
RUN npm install

COPY api/tsconfig.json ./
COPY api/src ./src

RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]