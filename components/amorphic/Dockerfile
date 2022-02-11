FROM node:16.13-alpine3.15

EXPOSE 3001
RUN apk update && apk add --no-cache bash

WORKDIR /app

COPY ./wait-for-it.sh .
#COPY ./ ./
RUN npm install
RUN npm run build
