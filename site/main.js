async function load() {
    const items = await loadItems();
    const chartDom = document.querySelector("#chart");
    newSearchComponent(document.querySelector("#search"), items,
        (hits) => {
            items.forEach(item => item.chart = false);
            showChart(chartDom, []);
            return hits;
        },
        null,
        (header) => {
            header.append(dom("th", ""));
            return header;
        }, (item, itemDom, items) => {
            const chartCheckbox = dom("input");
            chartCheckbox.setAttribute("type", "checkbox");
            const cell = dom("td", "");
            cell.appendChild(chartCheckbox);
            itemDom.appendChild(cell);

            chartCheckbox.addEventListener("click", () => {
                item.chart = chartCheckbox.checked;
                const data = [];
                items.forEach(i => { if (i.chart) data.push(i) });
                if (data.length == 0) {
                    chartDom.style.display = "none";
                } else {
                    chartDom.style.display = "block";
                    showChart(chartDom, data);
                }
            });

            return itemDom;
        });
}

load();
