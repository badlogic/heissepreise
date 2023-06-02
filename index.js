const fs = require("fs");
const analysis = require("./analysis");

function copyItemsToSite(dataDir) {
    const items = analysis.readJSON(`${dataDir}/latest-canonical.json`, true);
    for (const store of analysis.STORE_KEYS) {
        const storeItems = items.filter(item => item.store === store);
        analysis.writeJSON(`site/latest-canonical.${store}.compressed.json`, storeItems, false, 0, true);
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
    const dataDir = 'data';

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir)
    }

    // gzip existing data
    if (fs.existsSync(`${dataDir}/latest-canonical.json`)) {
        const files = fs.readdirSync(dataDir).filter(
            file => file.indexOf("canonical") == -1 &&
               analysis.STORE_KEYS.some(store => file.indexOf(`${store}-`) == 0)
        );
        files.push(`latest-canonical.json`);
        for(const file of files) {
            const path = `${dataDir}/${file}`
            const data = analysis.readJSON(path);
            analysis.writeJSON(path, data, true);
            fs.unlinkSync(path);
        }
    }

    if (fs.existsSync(`${dataDir}/latest-canonical.json.gz`)) {
        copyItemsToSite(dataDir);
        analysis.updateData(dataDir, (_newItems) => {
            copyItemsToSite(dataDir);
        });
    } else {
        await analysis.updateData(dataDir)
        copyItemsToSite(dataDir);
    }
    scheduleFunction(7, 0, 0, async () => {
        items = await analysis.updateData(dataDir)
        copyItemsToSite(dataDir);
    });

    const express = require('express')
    const compression = require('compression');
    const app = express()
    const port = process?.argv?.[2] ?? 3000

    app.use(compression());
    app.use(express.static('site'));

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
})();