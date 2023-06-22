const alasql = require("alasql");

const UNITS = {
    "stk.": { unit: "stk", factor: 1 },
    stück: { unit: "stk", factor: 1 },
    blatt: { unit: "stk", factor: 1 },
    paar: { unit: "stk", factor: 1 },
    stk: { unit: "stk", factor: 1 },
    st: { unit: "stk", factor: 1 },
    teebeutel: { unit: "stk", factor: 1 },
    tücher: { unit: "stk", factor: 1 },
    rollen: { unit: "stk", factor: 1 },
    tabs: { unit: "stk", factor: 1 },
    mm: { unit: "cm", factor: 0.1 },
    cm: { unit: "cm", factor: 1 },
    zentimeter: { unit: "cm", factor: 1 },
    m: { unit: "cm", factor: 100 },
    meter: { unit: "cm", factor: 100 },
    g: { unit: "g", factor: 1 },
    gramm: { unit: "g", factor: 1 },
    dag: { unit: "g", factor: 10 },
    kg: { unit: "g", factor: 1000 },
    kilogramm: { unit: "g", factor: 1000 },
    ml: { unit: "ml", factor: 1 },
    milliliter: { unit: "ml", factor: 1 },
    dl: { unit: "ml", factor: 10 },
    cl: { unit: "ml", factor: 100 },
    l: { unit: "ml", factor: 1000 },
    liter: { unit: "ml", factor: 1000 },
    wg: { unit: "wg", factor: 1 },
};

if (typeof window !== "undefined") {
    function setupLiveEdit() {
        if (window.location.host.indexOf("localhost") < 0 && window.location.host.indexOf("127.0.0.1") < 0) return;
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.onload = () => {
            let lastChangeTimestamp = null;
            let socket = io({ transports: ["websocket"] });
            socket.on("message", (timestamp) => {
                if (lastChangeTimestamp != timestamp) {
                    setTimeout(() => location.reload(), 100);
                    lastChangeTimestamp = timestamp;
                }
            });
        };
        script.src = "js/socket.io.js";
        document.body.appendChild(script);
    }
    setupLiveEdit();
}

exports.isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

exports.today = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

exports.fetchJSON = async (url) => {
    const response = await fetch(url);
    return await response.json();
};

exports.downloadJSON = (filename, content) => {
    const json = JSON.stringify(content, null, 2);
    const blob = new Blob([json], { type: "text/plain" });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
};

exports.dom = (element, innerHTML) => {
    const el = document.createElement(element);
    el.innerHTML = innerHTML;
    return el;
};

exports.getQueryParameter = (name) => {
    const url = new URL(window.location.href);
    const params = url.searchParams.getAll(name);
    return params.length > 1 ? params : params?.[0];
};

exports.getBooleanAttribute = (element, name) => {
    return element.hasAttribute(name) && (element.getAttribute(name).length == 0 || element.getAttribute(name) === "true");
};

exports.parseNumber = (value, defaultValue) => {
    try {
        return Number.parseFloat(value);
    } catch (e) {
        return defaultValue;
    }
};

exports.queryItemsAlasql = (query, items) => {
    alasql.fn.hasPriceChange = (priceHistory, date, endDate) => {
        if (!endDate) return priceHistory.some((price) => price.date == date);
        else return priceHistory.some((price) => price.date >= date && price.date <= endDate);
    };

    alasql.fn.hasPriceChangeLike = (priceHistory, date) => {
        return priceHistory.some((price) => price.date.indexOf(date) >= 0);
    };

    query = query.substring(1);
    return alasql("select * from ? where " + query, [items]);
};

exports.queryItems = (query, items, exactWord) => {
    query = query.trim();
    if (query.length < 3) return [];
    let tokens = query.split(/\s+/).map((token) => token.toLowerCase().replace(",", "."));

    // Find quantity/unit query
    let newTokens = [];
    let unitQueries = [];
    const operators = ["<", "<=", ">", ">=", "="];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        let unit = UNITS[token];
        if (unit && i > 0 && /^\d+(\.\d+)?$/.test(tokens[i - 1])) {
            newTokens.pop();
            let operator = "=";
            if (i > 1 && operators.includes(tokens[i - 2])) {
                newTokens.pop();
                operator = tokens[i - 2];
            }

            unitQueries.push({
                operator,
                quantity: Number.parseFloat(tokens[i - 1]) * unit.factor,
                unit: unit.unit,
            });
        } else {
            newTokens.push(token);
        }
    }
    tokens = newTokens;

    let hits = [];
    for (const item of items) {
        let allFound = true;
        for (let token of tokens) {
            if (token.length === 0) continue;
            let not = false;
            if (token.startsWith("-") && token.length > 1) {
                not = true;
                token = token.substring(1);
            }
            const index = item.search.indexOf(token);
            if ((!not && index < 0) || (not && index >= 0)) {
                allFound = false;
                break;
            }
            if (exactWord) {
                if (index > 0 && item.search.charAt(index - 1) != " " && item.search.charAt(index - 1) != "-") {
                    allFound = false;
                    break;
                }
                if (index + token.length < item.search.length && item.search.charAt(index + token.length) != " ") {
                    allFound = false;
                    break;
                }
            }
        }
        if (allFound) {
            let allUnitsMatched = true;
            for (const query of unitQueries) {
                if (query.unit != item.unit) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == "=" && !(item.quantity == query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == "<" && !(item.quantity < query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == "<=" && !(item.quantity <= query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == ">" && !(item.quantity > query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }

                if (query.operator == ">=" && !(item.quantity >= query.quantity)) {
                    allUnitsMatched = false;
                    break;
                }
            }
            if (allUnitsMatched) hits.push(item);
        }
    }
    return { items: hits, queryTokens: tokens.filter((token) => !token.startsWith("-")) };
};

exports.onVisibleOnce = (target, callback) => {
    let isTargetVisible = false;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.target === target && entry.isIntersecting) {
                if (!isTargetVisible) {
                    isTargetVisible = true;
                    callback();
                }
                observer.unobserve(target);
            }
        });
    });
    observer.observe(target);
};

exports.log = (message, trace = false) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    console.log(`${hours}:${minutes}:${seconds}: ${message}`);
    if (trace) console.trace("trace");
};

exports.deltaTime = (start) => {
    return (performance.now() - start) / 1000;
};
