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
            header = dom("tr", `<th>Kette</th><th>Name</th><th>Menge</th><th>Preis 📈</th><th></th>`)
            const showHideAll = header.querySelectorAll('th:nth-child(4)')[0];
            showHideAll.style["cursor"] = "pointer";
            showHideAll.showAll = true;
            showHideAll.addEventListener("click", () => {
                document.querySelectorAll(".priceinfo").forEach(el => showHideAll.showAll ? el.classList.remove("hide") : el.classList.add("hide"));
                showHideAll.showAll = !showHideAll.showAll;
            })
            return header;
        }, (item, itemDom, items, setQuery) => {
            const chartCheckbox = dom("input");
            const checked = (getQueryParameter("c") ?? []).includes(`${item.store}:${item.id}`);
            chartCheckbox.setAttribute("type", "checkbox");
            chartCheckbox.checked = checked;
            item.chart = checked;
            chartCheckbox.setAttribute("data-id", `${item.store}:${item.id}`);
            const cell = dom("td", "");
            cell.appendChild(chartCheckbox);
            itemDom.appendChild(cell);
            const handleClick = (eventShouldSetQuery = false) =>{
                item.chart = chartCheckbox.checked;
                const data = [];
                items.forEach(i => { if (i.chart) data.push(i) });
                if (data.length == 0) {
                    chartDom.style.display = "none";
                } else {
                    chartDom.style.display = "block";
                    showChart(chartDom, data);
                }
                !!eventShouldSetQuery && setQuery();
            }
            chartCheckbox.addEventListener("click", handleClick);
            checked && handleClick();
            return itemDom;
        });
    const query = getQueryParameter("q");
    if (query) {
        document.querySelector("input").value = query;
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        document.querySelector("input").dispatchEvent(inputEvent);
    }
}

load();
