# Mindmapper

Make your own mindmaps. An expriment coding with A.I.

## Acknowledgements

- TeamMapper: https://github.com/b310-digital/teammapper
- Mindmapp: https://github.com/cedoor/mindmapp (discontinued)
- mmp: https://github.com/cedoor/mmp (discontinued)
- D3: https://github.com/d3/d3
- DOMPurify: https://github.com/cure53/DOMPurify
- Pictograms by Sergio Palao (ARASAAC, CC BY-NC-SA), Government of Aragon (Spain)

## Getting started

### Quick start (Docker)

1. Pull the image:

   ```bash
   docker pull ghcr.io/kichong/mindmapper:latest
   ```

2. Create `docker-compose.yml` and set a Postgres password:

   ```yaml
   version: "3.8"

   services:
     app_prod:
       image: ghcr.io/kichong/mindmapper:latest
       environment:
         MODE: PROD
         BINDING: "0.0.0.0"
         POSTGRES_DATABASE: teammapper-db
         POSTGRES_HOST: postgres_prod
         POSTGRES_PASSWORD: <postgres-password>
         POSTGRES_PORT: 5432
         POSTGRES_SSL: false
         POSTGRES_SSL_REJECT_UNAUTHORIZED: false
         POSTGRES_USER: teammapper-user
         POSTGRES_QUERY_TIMEOUT: 100000
         POSTGRES_STATEMENT_TIMEOUT: 100000
         DELETE_AFTER_DAYS: 30
       ports:
         - 80:3000
       depends_on:
         - postgres_prod

     postgres_prod:
       image: postgres:15-alpine
       environment:
         PGDATA: /var/lib/postgresql/data/pgdata
         POSTGRES_DB: teammapper-db
         POSTGRES_PASSWORD: <postgres-password>
         POSTGRES_PORT: 5432
         POSTGRES_USER: teammapper-user
       volumes:
         - postgres_prod_data:/var/lib/postgresql/data/pgdata

   volumes:
     postgres_prod_data:
   ```

3. Run `docker compose up -d` and open `http://localhost`.

For reverse proxy examples see [docs/deployment.md](docs/deployment.md).

### Development

```bash
docker compose up -d --build --force-recreate
docker compose exec app npm --prefix teammapper-frontend run build:packages
docker compose exec app npm --prefix teammapper-backend run dev
```

To start frontend and backend separately:

```bash
docker compose exec app npm --prefix teammapper-backend start
docker compose exec app npm --prefix teammapper-frontend start
```

Frontend is served on `http://localhost:4200`.

### Test

```bash
docker compose exec postgres createdb -e -U teammapper-user -W teammapper-backend-test
docker compose exec app npm --prefix teammapper-backend run test:e2e
```

### Production

```bash
cp .env.default .env.prod
# adjust .env.prod
docker compose --file docker-compose-prod.yml --env-file .env.prod up -d --build --force-recreate
```

The default port in `.env.prod` is `3011`.

Optional commands:

```bash
docker compose --file docker-compose-prod.yml --env-file .env.prod build --no-cache
docker compose --file docker-compose-prod.yml --env-file .env.prod up -d --force-recreate
docker compose --file docker-compose-prod.yml --env-file .env.prod down -v
docker compose exec app_prod npm --prefix teammapper-backend run prod:typeorm:migrate
```

### Postgres and SSL

```bash
mkdir -p ./ca
openssl req -new -text -passout pass:abcd -subj /CN=localhost -out ./ca/server.req -keyout ./ca/privkey.pem
openssl rsa -in ./ca/privkey.pem -passin pass:abcd -out ./ca/server.key
openssl req -x509 -in ./ca/server.req -text -key ./ca/server.key -out ./ca/server.crt
chmod 600 ./ca/server.key
test $(uname -s) = Linux && chown 70 ./ca/server.key
```

Uncomment in `docker-compose-prod.yml`:

```
# command: -c ssl=on -c ssl_cert_file=/var/lib/postgresql/server.crt -c ssl_key_file=/var/lib/postgresql/server.key
```

### Jobs & queries

- Delete old maps:

  ```bash
  docker compose --file docker-compose-prod.yml --env-file .env.prod exec app_prod npm --prefix teammapper-backend run prod:data:maps:cleanup
  ```

- Run SQL via TypeORM:

  ```bash
  docker compose --file docker-compose-prod.yml --env-file .env.prod exec app_prod npx --prefix teammapper-backend typeorm query "select * from mmp_node" --dataSource ./teammapper-backend/dist/data-source.js
  ```

