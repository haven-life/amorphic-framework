FROM node:8.3-alpine

EXPOSE 3001
EXPOSE 9229
RUN apk update && apk add --no-cache bash

WORKDIR /app

COPY ./wait-for-it.sh .
#COPY ./ ./
RUN npm install
#RUN npm run build
# This docker config is only used locally so always mount local