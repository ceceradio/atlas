FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

EXPOSE 80
EXPOSE 443

RUN apk update && apk add libpq-dev g++ make

RUN npm install --global npm

RUN npm install --global node-gyp@latest

RUN apk update && apk add python3 postgresql-client

COPY package.json package-lock.json ./
COPY api/package.json api/package-lock.json ./api/
COPY next/package.json next/package-lock.json ./next/

RUN npm install

COPY api ./api
COPY next ./next

CMD npm run start-node