FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

EXPOSE 80
EXPOSE 443

RUN apk update && apk add libpq-dev g++ make bash docker

RUN npm install --global npm

RUN npm install --global node-gyp@latest

RUN apk update && apk add python3 postgresql-client

RUN npm config set registry https://registry.npmjs.org/

COPY .npmrc ./
COPY package.json ./
COPY package-lock.json ./
COPY api/package.json ./api/
COPY api/package-lock.json ./api/
COPY next/package.json ./next/
COPY next/package-lock.json ./next/

RUN npm ci

COPY api ./api
COPY next ./next

CMD npm run start-node