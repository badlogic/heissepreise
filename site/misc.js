if (typeof window !== "undefined") {
    function setupLiveEdit() {
        if (window.location.host.indexOf("localhost") < 0 && window.location.host.indexOf("127.0.0.1") < 0) return;
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.onload = () => {
            let lastChangeTimestamp = null;
            let socket = io({ transports: ["websocket"] });
            socket.on("connect", () => console.log("Connected"));
            socket.on("disconnect", () => console.log("Disconnected"));
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

/**
 * Searches all children with attribute `x-id` and returns them
 * in an object under keys equal to the `x-id` value.
 *
 * @param {HTMLElement} dom
 * @returns Object storing each child under a key equal to its `x-id`.
 */
exports.getDynamicElements = (dom) => {
    const elements = dom.querySelectorAll("[x-id]");
    const result = {};
    elements.forEach((element) => (result[element.getAttribute("x-id")] = element));
    return result;
};

exports.getBooleanAttribute = (element, name) => {
    return element.hasAttribute(name) && (element.getAttribute(name).length == 0 || element.getAttribute(name) === "true");
};
