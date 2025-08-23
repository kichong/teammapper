#!/bin/sh
set -e
npm --prefix teammapper-backend run prod:typeorm:migrate || true
exec sh entrypoint.prod.sh
