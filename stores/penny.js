const axios = require("axios");
const utils = require("./utils");
const MAXITEMS = 10000;

const conversions = {
    "bd": { unit: 'stk', factor: 1 },
    "g": { unit: 'g', factor: 1},
    "gr": { unit: 'g', factor: 1},
    "kg": { unit: 'g', factor: 1000},
    "lt": { unit: 'ml', factor: 1000},
    "ml": { unit: 'ml', factor: 1},
    "pk": { unit: 'stk', factor: 1 },
    "pa": { unit: 'stk', factor: 1 },
    "rl": { unit: 'stk', factor: 1 },
    "st": { unit: 'stk', factor: 1 },
    "tb": { unit: 'stk', factor: 1 },
    "wg": { unit: 'wg', factor: 1 },
};

exports.getCanonical = function(item, today) {
    let quantity = item.amount;
    let unit = item.volumeLabelKey;
    return utils.convertUnit({
        id: item.productId,
        name: item.name,
        price: item.price.regular.value/100,
        priceHistory: [{ date: today, price: item.price.regular.value/100 }],
        isWeighted : item.isWeightArticle,
        unit,
        quantity,
        bio: item.name.toLowerCase().includes("bio") && !item.name.toLowerCase().includes("fabio"),
        url: `https://www.penny.at/produkte/${item.slug}`,
    }, conversions, 'penny');
}

exports.fetchData = async function() {
    hits = 100;
    page = 0;
    done = false;
    result = [];
    while(!done) {
      const PENNY_SEARCH = `https://www.penny.at/api/products?page=${page}&pageSize=${hits}`;
      data = (await axios.get(PENNY_SEARCH)).data;
      done = (data.count < hits || page*hits > MAXITEMS);
      page++;
      result = result.concat(data.results);
    }
    return result;
}
