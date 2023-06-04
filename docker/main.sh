#!/bin/bash
set -e

npm install
if [ -z "$DEV" ]; then
	echo "Running in prod."
	node server.js
else
	echo "Running in dev."
	npm run dev
fi