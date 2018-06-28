FROM node:8.3-alpine

EXPOSE 3001
RUN apk update && apk add --no-cache bash

WORKDIR /app

COPY ./wait-for-it.sh .
COPY ./ ./
RUN npm install --production=false