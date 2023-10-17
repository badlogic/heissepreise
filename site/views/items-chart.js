const { STORE_KEYS } = require("../model/stores");
const { settings } = require("../model");
const { today, log, deltaTime, uniqueDates, calculateItemPriceTimeSeries } = require("../js/misc");
const { __ } = require("../browser_i18n");
const { View } = require("./view");
require("./custom-checkbox");
const moment = require("moment");
const { Chart, registerables } = require("chart.js");
require("chartjs-adapter-moment");
Chart.register(...registerables);

class ItemsChart extends View {
    constructor() {
        super();

        this.unitPrice = false;
        this.innerHTML = /*html*/ `
            <div x-id="canvasContainer" class="bg-stone-200 flex flex-col h-[calc(50vh)] p-4 mb-4 mx-auto md:rounded-none md:mb-0 rounded-xl mb-4w ${
                settings.stickyChart ? "sticky top-0" : ""
            }">
                <div class="w-full grow">
                    <canvas x-id="canvas" class="bg-white rounded-lg"></canvas>
                    <div x-id="noData" class="hidden flex items-center justify-center h-full">${__("ItemsChart_Keine Daten ausgewählt")}</div>
                </div>
                <div class="filters flex items-center flex-wrap justify-center gap-2 pt-2">
                    <custom-checkbox x-id="sumTotal" x-change x-state label="${__("ItemsChart_Preissumme Gesamt")}"></custom-checkbox>
                    <custom-checkbox x-id="sumStores" x-change x-state label="${__("ItemsChart_Preissumme Ketten")}"></custom-checkbox>
                    <custom-checkbox x-id="onlyToday" x-change x-state label="${__("ItemsChart_Nur heutige Preise")}"></custom-checkbox>
                    <custom-checkbox x-id="percentageChange" x-change x-state label="${__("ItemsChart_Änderung in % seit")}"></custom-checkbox>
                    <div
                        class="cursor-pointer inline-flex items-center gap-x-1 rounded-full bg-white border border-gray-400 px-2 py-1 text-xs font-medium text-gray-600">
                        <input x-id="startDate" x-change x-state type="date" value="2017-01-01" />
                        -
                        <input x-id="endDate" x-change x-state type="date" value="${today()}"/>
                    </div>
                </div>
            </div>
        `;
        this.elements.startDate.value = settings.startDate;
        this.setupEventHandlers();
        this.addEventListener("x-change", () => {
            this.render();
        });
    }

    calculateOverallPriceChanges(items, onlyToday, percentageChange, startDate, endDate) {
        if (items.length == 0) return { dates: [], changes: [] };

        const getPrice = this.unitPrice ? (o) => o.unitPrice : (o) => o.price;

        if (onlyToday) {
            let sum = 0;
            for (const item of items) sum += getPrice(item);
            return [{ date: today(), price: sum, unitPrice: sum }];
        }

        const dates = uniqueDates(items, startDate, endDate);

        let priceChanges = new Array(dates.length);
        for (let i = 0; i < dates.length; i++) {
            priceChanges[i] = { date: dates[i], price: 0, unitPrice: 0 };
        }

        let numItems = 0;
        items.forEach((product) => {
            const priceScratch = calculateItemPriceTimeSeries(product, percentageChange, startDate, dates);
            if (priceScratch == null) return;
            numItems++;

            for (let i = 0; i < priceScratch.length; i++) {
                const price = priceScratch[i];
                priceChanges[i].price += price;
                priceChanges[i].unitPrice += price;
            }
        });

        if (percentageChange) {
            for (let i = 0; i < priceChanges.length; i++) {
                priceChanges[i].price /= numItems;
                priceChanges[i].unitPrice /= numItems;
            }

            for (let i = 0; i < priceChanges.length; i++) {
                priceChanges[i].price = priceChanges[i].price.toFixed(2);
                priceChanges[i].unitPrice = priceChanges[i].unitPrice.toFixed(2);
            }
        }

        return priceChanges;
    }

    renderChart(items, chartType, startDate) {
        const getPrice = this.unitPrice ? (o) => o.unitPrice : (o) => o.price;
        const canvasDom = this.elements.canvas;
        const noData = this.elements.noData;
        if (items.length === 0) {
            canvasDom.classList.add("hidden");
            noData.classList.remove("hidden");
            return;
        } else {
            canvasDom.classList.remove("hidden");
            noData.classList.add("hidden");
        }

        const percentageChange = this.elements.percentageChange.checked;

        const now = performance.now();
        const datasets = items.map((item) => {
            const prices = item.priceHistory;

            const dataset = {
                label: (item.store ? item.store + " " : "") + item.name,
                data: prices.map((price) => {
                    return {
                        x: moment(price.date),
                        y: getPrice(price),
                    };
                }),
            };
            if (settings.chartType == "stepped") {
                dataset.stepped =
                    prices.length >= 2 && prices[0].price != prices[1].price && prices[prices.length - 2].price != prices[prices.length - 1].price
                        ? "after"
                        : "before";
            }

            return dataset;
        });
        log("ItemsChart - Calculating datasets took " + ((performance.now() - now) / 1000).toFixed(2) + " secs");

        const ctx = canvasDom.getContext("2d");
        let scrollTop = -1;
        if (canvasDom.lastChart) {
            scrollTop = document.documentElement.scrollTop;
            canvasDom.lastChart.destroy();
        }

        let yAxis = {
            ticks: {
                callback: function (value, index, ticks) {
                    return value.toLocaleString(navigator.language || "de-DE", {
                        minimumFractionDigits: 2,
                        style: "currency",
                        currency: "EUR",
                    });
                },
            },
        };
        if (percentageChange) {
            yAxis = {
                title: {
                    display: true,
                    text: __("ItemsChart_Änderung in % seit {{date}}", { date: startDate }),
                },
                ticks: {
                    callback: (value) => {
                        return value + "%";
                    },
                },
            };
        }

        canvasDom.lastChart = new Chart(ctx, {
            type: chartType ? chartType : "line",
            data: {
                datasets: datasets,
            },
            options: {
                layout: {
                    padding: 16,
                },
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: "time",
                        adapters: {
                            date: moment,
                        },
                        time: {
                            unit: "day",
                            displayFormats: {
                                day: "YYYY-MM-D",
                            },
                        },
                        title: {
                            display: true,
                            text: "Date",
                        },
                    },
                    y: yAxis,
                },
            },
        });
        if (scrollTop != -1) document.documentElement.scrollTop = scrollTop;
    }

    render() {
        if (!this.model) return;
        const start = performance.now();
        const items = this.model.filteredItems;
        const elements = this.elements;
        const onlyToday = this.elements.onlyToday.checked;
        let startDate = this.elements.startDate.value;
        let endDate = this.elements.endDate.value;
        let validDate = /^20\d{2}-\d{2}-\d{2}$/;
        if (!validDate.test(startDate)) startDate = "2017-01-01";
        if (!validDate.test(endDate)) endDate = today();
        const percentageChange = this.elements.percentageChange.checked;
        const itemsToShow = [];

        if (elements.sumTotal.checked && items.length > 0) {
            const now = performance.now();
            itemsToShow.push({
                name: __("ItemsChart_Preissumme Gesamt"),
                priceHistory: this.calculateOverallPriceChanges(items, onlyToday, percentageChange, startDate, endDate),
            });
            log("ItemsChart - Calculating overall sum total " + ((performance.now() - now) / 1000).toFixed(2) + " secs");
        }

        if (elements.sumStores.checked && items.length > 0) {
            const now = performance.now();
            STORE_KEYS.forEach((store) => {
                const storeItems = items.filter((item) => item.store === store);
                if (storeItems.length > 0) {
                    itemsToShow.push({
                        name: __("ItemsChart_Preissumme {{s}}", { s: store }),
                        priceHistory: this.calculateOverallPriceChanges(storeItems, onlyToday, percentageChange, startDate, endDate),
                    });
                }
            });
            log("ItemsChart - Calculating overall sum per store took " + ((performance.now() - now) / 1000).toFixed(2) + " secs");
        }

        items.forEach((item) => {
            if (item.chart) {
                const dates = uniqueDates([item], startDate, endDate);
                const prices = calculateItemPriceTimeSeries(item, percentageChange, startDate, dates).map((price) =>
                    percentageChange ? price.toFixed(2) : price
                );
                const priceHistory = [];
                if (!onlyToday) {
                    for (let i = 0; i < dates.length; i++) {
                        priceHistory.push({ date: dates[i], price: prices[i], unitPrice: prices[i] });
                    }
                } else {
                    priceHistory.push({ date: dates[dates.length - 1], price: prices[prices.length - 1], unitPrice: prices[prices.length - 1] });
                }
                const chartItem = {
                    name: item.store + " " + item.name,
                    priceHistory,
                };
                itemsToShow.push(chartItem);
            }
        });

        this.renderChart(itemsToShow, onlyToday ? "bar" : "line", startDate);
        log(`ItemsChart - charted ${itemsToShow.length} items in ${deltaTime(start).toFixed(2)} secs`);
    }
}
customElements.define("items-chart", ItemsChart);
