const fs = require("fs");
const analysis = require("./analysis");

function copyItemsToSite(dataDir) {
    fs.copyFileSync(`${dataDir}/latest-canonical.json`, `site/latest-canonical.json`);
    const items = JSON.parse(fs.readFileSync(`${dataDir}/latest-canonical.json`));
    for (const store of analysis.STORE_KEYS) {
        const storeItems = items.filter((item) => item.store === store);
        fs.writeFileSync(`site/latest-canonical.${store}.compressed.json`, JSON.stringify(analysis.compress(storeItems)));
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

    if (fs.existsSync(`${dataDir}/latest-canonical.json`)) {
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
    app.use(express.static("site"));

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
})();
