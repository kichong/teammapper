#!/bin/bash
docker compose up -d --build --force-recreate
docker compose exec app npm --prefix teammapper-frontend run build:packages
docker compose exec app npm --prefix teammapper-backend run dev

