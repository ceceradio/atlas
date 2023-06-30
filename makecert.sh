#!/bin/bash

source .env

mkdir certs

openssl genrsa -out certs/key.pem

openssl req \
    -new \
    -newkey rsa:4096 \
    -days 365 \
    -nodes \
    -x509 \
    -subj "/C=US/ST=oned/L=ocal/O=atlas.zone/CN=local.atlas.zone" \
    -keyout certs/local.atlas.zone.key \
    -out certs/local.atlas.zone.cert

