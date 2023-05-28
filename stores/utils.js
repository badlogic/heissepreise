exports.convertUnit = function (item, units, store) {

    if(!(item.unit in units)) {
        console.error(`Unknown unit in ${store}: '${item.unit}`);
        return item;
    }

    if(typeof(item.quantity) == 'string')
        item.quantity = parseFloat(item.quantity.replace(',', '.'));

    const conv = units[item.unit];
    item.quantity = conv.factor * item.quantity;
    item.unit = conv.unit;

    if(item.isWeighted && (item.unit =='g' || item.unit == 'ml')) {
        item.price = 100*item.price/item.quantity;
        item.quantity = 100;
    }
    return item;
}
