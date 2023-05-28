const axios = require("axios");
const HITS = Math.floor(30000 + Math.random() * 2000);

const conversions = {
    "": {unit: "stk", factor: 1},
    "dosen": {unit: "stk", factor: 1},
    "blatt": {unit: "stk", factor: 1},
    "flaschen": {unit: "stk", factor: 1},
    "l": {unit: "ml", factor: 1000},
    "liter": {unit: "ml", factor: 1000},
    "ml": {unit: "ml", factor: 1},
    "g": {unit: "g", factor: 1},
    "kg": {unit: "g", factor: 1000},
    "stk.": {unit: "stk", factor: 1},
};

exports.getCanonical = function(item, today) {
    let quantity = 1;
    let unit = '';
    let text = (item.price.basePrice?.text ?? "").trim().split('(')[0].replaceAll(',', '.').toLowerCase();
    if(text.startsWith('bei') && text.search('je ') != -1)
        text = text.substr(text.search('je '))

    for (let s of ['ab ', 'je ', 'ca. ', 'z.b.: ', 'z.b. '])
        text = text.replace(s, '').trim()

    const regex = /^([0-9.x ]+)(.*)$/;
    const matches = text.match(regex);
    if(matches) {
        matches[1].split('x').forEach( (q)=> {
          quantity = quantity * parseFloat(q.split('/')[0])
        })
        unit = matches[2].split('/')[0].trim().split(' ')[0];
    }
    unit = unit.split('-')[0];
    if(unit in conversions) {
        const conv = conversions[unit];
        quantity = conv.factor * quantity;
        unit = conv.unit;
    }
    else
        console.error(`unknown lidl unit: '${unit}'`, item.price.basePrice?.text ?? "")

    return {
        id: item.productId,
        name: `${item.keyfacts?.supplementalDescription?.concat(" ") ?? ""}${item.fullTitle}`,
        price: item.price.price,
        priceHistory: [{ date: today, price: item.price.price }],
        unit,
        quantity,
        url: item.canonicalUrl
    };
}

exports.fetchData = async function() {
    const LIDL_SEARCH = `https://www.lidl.at/p/api/gridboxes/AT/de/?max=${HITS}`;
    return (await axios.get(LIDL_SEARCH)).data.filter(item => !!item.price.price);
}