const fs = require("fs");
const analysis = require("./analysis");
const template = require("./template");

function copyItemsToSite(dataDir) {
    const items = analysis.readJSON(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`);
    for (const store of analysis.STORE_KEYS) {
        const storeItems = items.filter((item) => item.store === store);
        analysis.writeJSON(`site/output/data/latest-canonical.${store}.compressed.json`, storeItems, false, 0, true);
    }
}

function scheduleFunction(hour, minute, second, func) {
    const now = new Date();

    const scheduledTime = new Date();
    scheduledTime.setHours(hour);
    scheduledTime.setMinutes(minute);
    scheduledTime.setSeconds(second);

    if (now > scheduledTime) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    const delay = scheduledTime.getTime() - now.getTime();

    console.log("Scheduling next function call: " + scheduledTime.toString());

    setTimeout(async () => {
        await func();
        scheduleFunction(hour, minute, second, func);
    }, delay);
}

(async () => {
    const dataDir = "data";

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    template.generateSite("site", "site/output");

    analysis.migrateCompression(dataDir, ".json", ".json.br");
    analysis.migrateCompression(dataDir, ".json.gz", ".json.br");

    if (fs.existsSync(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`)) {
        copyItemsToSite(dataDir);
        analysis.updateData(dataDir, (_newItems) => {
            copyItemsToSite(dataDir);
        });
    } else {
        await analysis.updateData(dataDir);
        copyItemsToSite(dataDir);
    }
    scheduleFunction(7, 0, 0, async () => {
        items = await analysis.updateData(dataDir);
        copyItemsToSite(dataDir);
    });

    const express = require("express");
    const compression = require("compression");
    const app = express();
    const port = process?.argv?.[2] ?? 3000;

    app.use(compression());
    app.use(express.static("site/output"));

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
})();
