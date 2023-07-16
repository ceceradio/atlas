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
    -subj "/C=US/ST=oned/L=ocal/O=atlasai.zone/CN=local.atlasai.zone" \
    -keyout certs/local.atlasai.zone.key \
    -out certs/local.atlasai.zone.cert

