const fs = require("fs");
const path = require("path");
const analysis = require("./analysis");
const [, , dataDir, fromSuffix, toSuffix] = process.argv;

const errorExit = (message) => {
    console.log(message);
    console.log();
    console.log("Usage: node migrate.js <data-dir> <from-suffix> <to-suffix>");
    console.log();
    console.log(`E.g.: node migrate.js data ".json" ".json.gz`);
    process.exit(1);
};

if (!fs.existsSync(dataDir) || !fs.lstatSync(dataDir).isDirectory()) errorExit("Error: The specified data directory does not exist.");
if (!fromSuffix || typeof fromSuffix !== "string") errorExit('Error: The "from-suffix" parameter must be a non-empty string.');
if (!toSuffix || typeof toSuffix !== "string") errorExit('Error: The "to-suffix" parameter must be a non-empty string.');

analysis.migrateCompression(dataDir, fromSuffix, toSuffix);