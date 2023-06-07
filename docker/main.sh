#!/bin/bash
set -e

npm install
if [ -z "$DEV" ] || [ "$NODE_ENV" = "production" ]; then
	echo "Running in prod."
	npm run start
else
	echo "Running in dev."
	npm run dev
fi