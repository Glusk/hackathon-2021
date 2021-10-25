# FROM node:14.15.0-alpine3.10 as base
FROM node

WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 8080
CMD npm run server