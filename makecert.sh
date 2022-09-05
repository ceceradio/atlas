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
    -subj "/C=US/ST=oned/L=ocal/O=cece.zone/CN=local.cece.zone" \
    -keyout certs/local.cece.zone.key \
    -out certs/local.cece.zone.cert

