const fs = require("fs");
const analysis = require("./analysis.js");

if (process.argv.length < 3) {
    console.log("Usage: node gzipJson.js <data-dir>");
    console.log();
    console.log("e.g. node gzipJson.js data/");
    console.log();
    process.exit(1);
}
const dataDir = process.argv[2];

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

(async function () {
    try {
        const files = fs
            .readdirSync(dataDir)
            .filter((file) => file.indexOf("canonical") == -1 && analysis.STORE_KEYS.some((store) => file.indexOf(`${store}-`) == 0 && file.endsWith(".json")));
        if (fs.existsSync(`${dataDir}/latest-canonical.json`)) files.push(`latest-canonical.json`);
        for (const file of files) {
            const path = `${dataDir}/${file}`;
            const data = analysis.readJSON(path);
            analysis.writeJSON(path, data, true);
            fs.unlinkSync(path);
            console.log(`Wrote ${file}.gz`);
        }
    } catch (e) {
        process.exit(1);
    }
})();
