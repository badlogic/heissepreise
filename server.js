const fs = require("fs");
const path = require("path");
const http = require("http");
const analysis = require("./analysis");
const bundle = require("./bundle");
const csv = require("./site/js/misc");
const chokidar = require("chokidar");
const express = require("express");
const compression = require("compression");
const i18n = require("./i18n");

function copyItemsToSite(dataDir) {
    const items = analysis.readJSON(`${dataDir}/latest-canonical.json.${analysis.FILE_COMPRESSOR}`);
    analysis.writeJSON(`site/output/data/latest-canonical.json`, items);
    for (const store of analysis.STORE_KEYS) {
        const storeItems = items.filter((item) => item.store === store);
        analysis.writeJSON(`site/output/data/latest-canonical.${store}.compressed.json`, storeItems, false, 0, true);
    }
    const csvItems = csv.itemsToCSV(items);
    fs.writeFileSync("site/output/data/latest-canonical.csv", csvItems, "utf-8");
    console.log("Copied latest items to site.");
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

function parseArguments() {
    const args = process.argv.slice(2);
    let port = process.env.PORT !== undefined && process.env.PORT != "" ? parseInt(process.env.PORT) : 3000;
    let liveReload = process.env.NODE_ENV === "development" || false;
    let skipDataUpdate = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "-p" || args[i] === "--port") {
            port = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === "-l" || args[i] === "--live-reload") {
            if (process.env.NODE_ENV !== "development") {
                throw new Error("Live reload is only supported in development mode");
            }
            liveReload = true;
        } else if (args[i] === "-s" || args[i] === "--skip-data-update") {
            skipDataUpdate = true;
        } else if (args[i] === "-h" || args[i] === "--help") {
            console.log("Usage: node server.js [-p|--port PORT] [-l|--live-reload]");
            console.log();
            console.log("Options:");
            console.log("  -p, --port PORT         Port to listen on (default: 3000)");
            console.log("  -l, --live-reload       Enable live reload (automatically enabled if NODE_ENV is development)");
            console.log("  -s, --skip-data-update  Skip fetching data");
            process.exit(0);
        }
    }

    return { port, liveReload, skipDataUpdate };
}

function setupLogging() {
    // Poor man's logging framework, wooh...
    const originalConsoleLog = console.log;
    const logStream = fs.createWriteStream("site/output/data/log.txt", { flags: "a" });
    logStream.write("===========================================\n\n");
    console.log = (message) => {
        const formattedMessage = `[${new Date().toISOString()}] ${message}\n`;
        logStream.write(formattedMessage);
        originalConsoleLog.apply(console, [message]);
    };
}

(async () => {
    const dataDir = "data";
    const { port, liveReload, skipDataUpdate } = parseArguments();

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    const outputDir = "site/output";

    if (fs.existsSync("site/output/data/log.txt")) {
        fs.copyFileSync("site/output/data/log.txt", "site/log.txt");
    }
    bundle.deleteDirectory(outputDir);
    fs.mkdirSync(outputDir);
    fs.mkdirSync(outputDir + "/data");
    if (fs.existsSync("site/log.txt")) {
        fs.copyFileSync("site/log.txt", "site/output/data/log.txt");
        fs.unlinkSync("site/log.txt");
    }
    setupLogging();
    bundle.bundle("site", outputDir, liveReload);

    if (!skipDataUpdate) {
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
        scheduleFunction(5, 0, 0, async () => {
            items = await analysis.updateData(dataDir);
            copyItemsToSite(dataDir);
        });
    } else {
        copyItemsToSite(dataDir);
    }

    const app = express();
    app.use(compression());
    app.use(function (req, res, next) {
        if (req.method == "GET") {
            if (req.path == "/") {
                req.url = "/index.html";
            }
            if (req.path.endsWith(".html")) {
                // Only html files are translated
                let pickedLanguage = req.acceptsLanguages(i18n.locales);
                if (pickedLanguage) {
                    let translatedPath = req.path.substring(0, req.path.length - "html".length) + pickedLanguage + ".html";
                    req.url = translatedPath;
                } // otherwise use default, untranslated file
            }
        }
        next();
    });
    app.use(express.static("site/output"));
    const server = http.createServer(app).listen(port, () => {
        console.log(`App listening on port ${port}`);
    });
    if (liveReload) {
        const socketIO = require("socket.io");
        const sockets = [];
        const io = socketIO(server);
        io.on("connection", (socket) => sockets.push(socket));
        let timeoutId = 0;
        chokidar.watch("site/output").on("all", () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastChangeTimestamp = Date.now();
                for (let i = 0; i < sockets.length; i++) {
                    sockets[i].send(`${lastChangeTimestamp}`);
                }
            }, 500);
        });
    }
})();
