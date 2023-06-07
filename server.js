const fs = require("fs");
const path = require("path");
const http = require("http");
const chokidar = require("chokidar");
const analysis = require("./analysis");
const template = require("./template");
const express = require("express");
const compression = require("compression");

function copyItemsToSite(dataDir) {
    const items = analysis.readJSON(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`);
    analysis.writeJSON(`site/output/data/latest-canonical.json`, items);
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

    const args = process.argv.slice(2);
    let port = process.env.PORT !== undefined && process.env.PORT != "" ? parseInt(process.env.PORT) : 3000;
    let liveReload = process.env.NODE_ENV === "development" || false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "-p" || args[i] === "--port") {
            port = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === "-l" || args[i] === "--live-reload") {
            if (process.env.NODE_ENV !== "development") {
                throw new Error("Live reload is only supported in development mode");
            }
            liveReload = true;
        } else if (args[i] === "-h" || args[i] === "--help") {
            console.log("Usage: node server.js [-p|--port PORT] [-l|--live-reload]");
            console.log();
            console.log("Options:");
            console.log("  -p, --port PORT      Port to listen on (default: 3000)");
            console.log("  -l, --live-reload    Enable live reload (automatically enabled if NODE_ENV is development)");
            process.exit(0);
        }
    }

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
        console.log(`App listening on port ${port}`);
    });
    if (liveReload) {
        const socketIO = require("socket.io");
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
