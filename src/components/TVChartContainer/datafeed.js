async function makeApiRequest(path) {
    try {
        const response = await fetch(`http://localhost:8000/${path}`);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        // console.log('API Response:', data); // Log the entire API response
        return data;
    } catch (error) {
        throw new Error(`Request error: ${error.message}`);
    }
}

const Datafeed = {
    configurationData: {
        supported_resolutions: ['1h', '2h', '3h', '4h', '5h', '6h', '1D', '1W', '3W', '1M', '6M'],
        exchanges: [
            { value: 'DSE', name: 'DSE', desc: 'Dhaka Stock Exchange' }
        ],
        symbols_types: [
            { name: "All types", value: "" },
            { name: "Stock", value: "stock" },
            { name: "Index", value: "index" }
        ]
    },

    async getAllSymbols() {
        const data = await makeApiRequest('all');

        // console.log(data)

        let allSymbols = [];

        for (const exchange of this.configurationData.exchanges) {
            const pairs = data.Data[exchange.value].pairs;

            // console.log(pairs)

            for (const leftPairPart of Object.keys(pairs)) {
                const symbols = pairs[leftPairPart].map(rightPairPart => {
                    const symbol = generateSymbol(exchange.value, leftPairPart, rightPairPart);
                    return {
                        symbol: symbol.short,
                        ticker: symbol.full,
                        description: symbol.short,
                        exchange: exchange.value,
                        type: 'stock',
                    };
                });
                allSymbols = [...allSymbols, ...symbols];
            }
        }

        console.log(allSymbols)

        return allSymbols;
    },

    onReady: function (callback) {
        console.log('[onReady]: Method call');
        setTimeout(() => callback(this.configurationData), 0);
    },

    async searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
        console.log('[searchSymbols]: Method call');
        const symbols = await this.getAllSymbols();
        const newSymbols = symbols.filter(symbol => {
            const isExchangeValid = exchange === '' || symbol.exchange === exchange;
            const isFullSymbolContainsInput = symbol.ticker.toLowerCase().includes(userInput.toLowerCase());
            return isExchangeValid && isFullSymbolContainsInput;
        });
        onResultReadyCallback(newSymbols);
    },

    async resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback, extension) {
        console.log('[resolveSymbol]: Method call', symbolName);
        const symbols = await this.getAllSymbols();


        console.log(symbols)


        const symbolItem = symbols.find(({ ticker }) => ticker === symbolName);

        console.log({ symbolItem })
        console.log(symbols.find(({ ticker }) => ticker === symbolName))

        if (!symbolItem) {
            console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
            onResolveErrorCallback('Cannot resolve symbol');
            return;
        }
        const symbolInfo = {
            ticker: symbolItem.ticker,
            name: symbolItem.symbol,
            description: symbolItem.description,
            type: symbolItem.type,
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: symbolItem.exchange,
            minmov: 1,
            pricescale: 100,
            has_intraday: false,
            visible_plots_set: 'ohlc',
            has_weekly_and_monthly: false,
            supported_resolutions: this.configurationData.supported_resolutions,
            volume_precision: 2,
            data_status: 'streaming',
        };
        console.log('[resolveSymbol]: Symbol resolved', symbolName);
        onSymbolResolvedCallback(symbolInfo);
    },
    async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        const { from, to } = periodParams;
        const parsedSymbol = parseFullSymbol(symbolInfo.ticker);
        const urlParameters = {
            e: parsedSymbol.exchange,
        };
        const query = Object.keys(urlParameters)
            .map(name => `${name}=${encodeURIComponent(urlParameters[name])}`)
            .join('&');
        try {
            const data = await makeApiRequest(`histoday?${query}`);

            if (data.Response && data.Response === 'Error' || !data.Data || data.Data.length === 0) {
                onHistoryCallback([], { noData: true });
                return;
            }

            const bars = data.Data.map(bar => ({
                time: bar.time * 1000,
                low: bar.low,
                high: bar.high,
                open: bar.open,
                close: bar.close,
            }));

            const filteredBars = bars.filter(bar => bar.time >= from && bar.time < to);

            onHistoryCallback(filteredBars, { noData: false });
        } catch (error) {
            console.log('[getBars]: Get error', error);
            onErrorCallback(error);
        }
    },

    subscribeBars: function (symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
    },

    unsubscribeBars: function (subscriberUID) {
        console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
    },
};

export default Datafeed;

function generateSymbol(exchange, fromSymbol, toSymbol) {
    const short = `${exchange}:${fromSymbol}/${toSymbol}`;
    const full = `${exchange}:${fromSymbol}${toSymbol}`;
    return {
        short: short,
        full: full
    };
}

function parseFullSymbol(fullSymbol) {
    const match = fullSymbol.match(/^(\w+):(\w+)(\w+)$/);
    return {
        exchange: match[1],
        fromSymbol: match[2],
        toSymbol: match[3]
    };
}