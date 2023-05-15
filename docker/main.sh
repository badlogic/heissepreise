#!/bin/bash
set -e

npm install
if [ -z "$DEV" ]; then			
	echo "RUNNING STUFF 2"
	node index.js
else	
	echo "RUNNING STUFF"
	npm run dev
fi