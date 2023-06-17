const axios = require("axios");
const utils = require("./utils");
const HTMLParser = require("node-html-parser");

const units = {
    mbe: { unit: "wg", factor: 1 },
};

exports.getCanonical = function (item, today) {
    let [quantity, unit] = utils.parseUnitAndQuantityAtEnd(item.unit.replace("/ EINWEG", "").replace("/ MEHRWEG", ""));
    return utils.convertUnit(
        {
            id: item.id,
            name: item.name,
            // description: "", not available
            price: item.price,
            priceHistory: [{ date: today, price: item.price }],
            quantity,
            unit,
            bio: item.name.toLowerCase().includes("bio"),
            url: item.canonicalUrl,
        },
        units,
        "unimarkt",
        {
            unit: "stk",
            quantity: 1,
        }
    );
};

exports.fetchData = async function () {
    const UNIMARKT_BASE_URL = `https://shop.unimarkt.at/`;
    const UNIMARKT_MAIN_CATEGORIES = [
        "obst-gemuese",
        "kuehlprodukte",
        "fleisch-wurst",
        "brot-gebaeck",
        "getraenke",
        "lebensmittel",
        "suesses-snacks",
        "haushalt",
    ];

    let unimarktItems = [];
    for (let category of UNIMARKT_MAIN_CATEGORIES) {
        var res = await axios.get(UNIMARKT_BASE_URL + category, {
            validateStatus: function (status) {
                return status >= 200 && status < 300;
            },
        });

        if (res && res.data) {
            var root = HTMLParser.parse(res.data);

            root.querySelectorAll(".articleListItem .produktContainer").forEach((product) => {
                unimarktItems.push({
                    id: product._attrs["data-articleid"],
                    name: product.querySelector(".name").text,
                    price: parseFloat(product._attrs["data-price"]),
                    unit: product.querySelector(".grammatur").text,
                    canonicalUrl: product.querySelector(".image > a")._attrs["href"],
                });
            });
        }
    }
    return unimarktItems;
};

exports.urlBase = "https://shop.unimarkt.at";
