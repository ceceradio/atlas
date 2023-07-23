#!/bin/bash

mkdir nginx/certs

openssl genrsa -out nginx/certs/key.pem

openssl req \
    -new \
    -newkey rsa:4096 \
    -days 365 \
    -nodes \
    -x509 \
    -subj "/C=US/ST=oned/L=ocal/O=atlasai.zone/CN=local.atlasai.zone" \
    -keyout nginx/certs/local.atlasai.zone.key \
    -out nginx/certs/local.atlasai.zone.cert

