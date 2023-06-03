const fs = require("fs");
const path = require("path");
const http = require("http");
const chokidar = require("chokidar");
const analysis = require("./analysis");
const template = require("./template");
const socketIO = require("socket.io");
const express = require("express");
const compression = require("compression");

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

function generateSiteAndWatch(inputDir, outputDir) {
    template.generateSite(inputDir, outputDir, true);
    const watcher = chokidar.watch(inputDir, { ignored: /(^|[\/\\])\../ });

    let initialScan = true;
    watcher.on("ready", () => (initialScan = false));
    watcher.on("all", (event, filePath) => {
        if (initialScan) return;
        if (path.resolve(filePath).startsWith(path.resolve(outputDir))) return;
        console.log(`File ${filePath} has been ${event}`);
        template.generateSite(inputDir, outputDir, false);
    });
    console.log(`Watching directory for changes: ${inputDir}`);
}

(async () => {
    const dataDir = "data";
    const port = process?.argv?.[2] ?? 3000;
    const liveReload = process?.argv?.[3] ?? false;

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    generateSiteAndWatch("site", "site/output");

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

    const app = express();
    app.use(compression());
    app.use(express.static("site/output"));
    const server = http.createServer(app).listen(port, () => {
        console.log(`Example app listening on port ${port}`);
    });
    if (liveReload === "true") {
        const sockets = [];
        const io = socketIO(server);
        io.on("connection", (socket) => sockets.push(socket));
        chokidar.watch("site/output").on("all", () => {
            lastChangeTimestamp = Date.now();
            for (let i = 0; i < sockets.length; i++) {
                sockets[i].send(`${lastChangeTimestamp}`);
            }
        });
    }
})();
