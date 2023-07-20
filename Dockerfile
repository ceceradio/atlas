FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

COPY . .

EXPOSE 80
EXPOSE 443

RUN apk update && apk add libpq-dev g++ make

RUN npm install --global npm

RUN npm install --global node-gyp@latest

RUN apk update && apk add python3 postgresql-client

RUN npm install

CMD npm start