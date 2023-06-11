const { STORE_KEYS } = require("../model/stores");
const { today } = require("../misc");
const { View } = require("./view");
require("./custom-checkbox");
const { Chart, registerables } = require("chart.js");
Chart.register(...registerables);

class ItemsChart extends View {
    constructor() {
        super();

        this.innerHTML = /*html*/ `
            <div class="bg-stone-200 p-4 mx-auto">
                <canvas x-id="canvas" class="bg-white rounded-lg py-4"></canvas>
                <div class="filters flex items-center flex-wrap justify-center gap-2 pt-2">
                    <custom-checkbox x-id="sumTotal" x-change label="Preissumme Gesamt"></custom-checkbox>
                    <custom-checkbox x-id="sumStores" x-change label="Preissumme Ketten"></custom-checkbox>
                    <custom-checkbox x-id="onlyToday" x-change label="Nur heutige Preise"></custom-checkbox>
                    <div
                        class="cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                        <input x-id="startDate" x-change type="date" value="2020-01-01" />
                        -
                        <input x-id="endDate" x-change type="date" value="${today()}"/>
                    </div>
                </div>
            </div>
        `;
        this.setupEventHandlers();
        this.addEventListener("change", () => {
            this.render();
        });
    }

    calculateOverallPriceChanges(items, onlyToday, startDate, endDate) {
        if (items.length == 0) return { dates: [], changes: [] };

        if (onlyToday) {
            let sum = 0;
            for (const item of items) sum += item.price;
            return [{ date: today(), price: sum }];
        }

        const allDates = items.flatMap((product) => product.priceHistory.map((item) => item.date));
        let uniqueDates = [...new Set(allDates)];
        uniqueDates.sort();

        const allPrices = items.map((product) => {
            let price = null;
            const prices = uniqueDates.map((date) => {
                const priceObj = product.priceHistory.find((item) => item.date === date);
                if (!price && priceObj) price = priceObj.price;
                return priceObj ? priceObj.price : null;
            });

            for (let i = 0; i < prices.length; i++) {
                if (!prices[i]) {
                    prices[i] = price;
                } else {
                    price = prices[i];
                }
            }
            return prices;
        });

        const priceChanges = [];
        for (let i = 0; i < uniqueDates.length; i++) {
            if (uniqueDates[i] < startDate || uniqueDates[i] > endDate) continue;
            let price = 0;
            for (let j = 0; j < allPrices.length; j++) {
                price += allPrices[j][i];
            }
            priceChanges.push({ date: uniqueDates[i], price });
        }

        return priceChanges;
    }

    renderChart(items, chartType) {
        const canvasDom = this.elements.canvas;
        if (items.length === 0) {
            canvasDom.classList.add("hidden");
            return;
        } else {
            canvasDom.classList.remove("hidden");
        }

        const allDates = items.flatMap((product) => product.priceHistory.map((item) => item.date));
        const uniqueDates = [...new Set(allDates)];
        uniqueDates.sort();

        const datasets = items.map((product) => {
            let price = null;
            const prices = uniqueDates.map((date) => {
                const priceObj = product.priceHistory.find((item) => item.date === date);
                if (!price && priceObj) price = priceObj.price;
                return priceObj ? priceObj.price : null;
            });

            for (let i = 0; i < prices.length; i++) {
                if (prices[i] == null) {
                    prices[i] = price;
                } else {
                    price = prices[i];
                }
            }

            return {
                label: (product.store ? product.store + " " : "") + product.name,
                data: prices,
            };
        });

        const ctx = canvasDom.getContext("2d");
        let scrollTop = -1;
        if (canvasDom.lastChart) {
            scrollTop = document.documentElement.scrollTop;
            canvasDom.lastChart.destroy();
        }
        canvasDom.lastChart = new Chart(ctx, {
            type: chartType ? chartType : "line",
            data: {
                labels: uniqueDates,
                datasets: datasets,
            },
            options: {
                responsive: true,
                aspectRation: 16 / 9,
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: "EURO",
                        },
                    },
                },
            },
        });
        if (scrollTop != -1) document.documentElement.scrollTop = scrollTop;
    }

    render() {
        if (!this.model) return;
        const items = this.model.filteredItems;
        const elements = this.elements;
        const onlyToday = this.elements.onlyToday.checked;
        const startDate = this.elements.startDate.value;
        const endDate = this.elements.endDate.value;
        const itemsToShow = [];

        if (elements.sumTotal.checked && items.length > 0) {
            itemsToShow.push({
                name: "Preissumme Gesamt",
                priceHistory: this.calculateOverallPriceChanges(items, onlyToday, startDate, endDate),
            });
        }

        if (elements.sumStores.checked && items.length > 0) {
            STORE_KEYS.forEach((store) => {
                const storeItems = items.filter((item) => item.store === store);
                if (storeItems.length > 0) {
                    itemsToShow.push({
                        name: "Preissumme " + store,
                        priceHistory: this.calculateOverallPriceChanges(storeItems, onlyToday, startDate, endDate),
                    });
                }
            });
        }

        items.forEach((item) => {
            if (item.chart) {
                itemsToShow.push({
                    name: item.store + " " + item.name,
                    priceHistory: onlyToday
                        ? [{ date: today(), price: item.price }]
                        : item.priceHistory.filter((price) => price.date >= startDate && price.date <= endDate),
                });
            }
        });

        console.log("Items to show " + itemsToShow.length);

        this.renderChart(itemsToShow, onlyToday ? "bar" : "line");
    }
}
customElements.define("items-chart", ItemsChart);
