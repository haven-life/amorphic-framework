FROM node:18.13.0-alpine3.17

EXPOSE 3001
RUN apk update && apk add --no-cache bash

WORKDIR /app

COPY ./wait-for-it.sh .
COPY ./ ./
RUN npm install
RUN npm run build
