const fs = require("fs");
const analysis = require("./analysis.js");

fs.copyFileSync("docker/data/latest-canonical.json", "docker/data/latest-canonical-old.json");
fs.writeFileSync("docker/data/latest-canonical.json", JSON.stringify(analysis.replay("docker/data"), null, 2));