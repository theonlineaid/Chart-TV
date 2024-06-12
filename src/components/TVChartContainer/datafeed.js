async function makeApiRequest(path) {
    try {
        const response = await fetch(`http://localhost:8000/${path}`, {
            headers: {
                "Accept": 'application/json',
                // 'User-agent': 'learning app',
            }
        });
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        console.log('API Response:', data); // Log the entire API response
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
        try {
            const data = await makeApiRequest('DSE');
            let allSymbols = [];

            console.log(allSymbols)

            if (!data.pairs) {
                console.error('DSE data is undefined');
                throw new Error('DSE data is undefined');
            }

            console.log('DSE data:', data.pairs); // Log the DSE data

            for (const exchange of this.configurationData.exchanges) {
                console.log(exchange, '============= exchange')
                // const pairs = data[exchange.value]?.pairs || {};
                const pairs = data?.pairs || {};
                console.log(pairs, '============= pairs')


                for (const leftPairPart of Object.keys(pairs)) {
                    const symbols = pairs[leftPairPart].map(rightPairPart => {
                        const symbol = generateSymbol(exchange.value, leftPairPart, rightPairPart);
                        console.log(symbol)
                        return {
                            symbol: symbol.short,
                            // symbol: symbol.full,
                            ticker: symbol.full,
                            description: symbol.short,
                            exchange: exchange.value,
                            type: 'stock',
                        };
                    });
                    allSymbols = [...allSymbols, ...symbols];
                }
            }

            console.log('All Symbols:', allSymbols); // Log all the symbols
            return allSymbols;
        } catch (error) {
            console.error('[getAllSymbols]: Error', error);
            throw error;
        }
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
        try {
            const symbols = await this.getAllSymbols();
            const symbolItem = symbols.find(({ ticker }) => ticker === symbolName);
            // const symbolItem = symbols.find(({ ticker }) => ticker );

            console.log({symbols, symbolItem},  "----------------- see result")

            if (!symbolItem) {
                console.error('[resolveSymbol]: Cannot resolve symbol', symbolName);
                onResolveErrorCallback('Cannot resolve symbol');
                return;
            }

            const symbolInfo = {
                ticker: symbolItem.ticker,
                name: symbolItem.symbol,
                description: symbolItem.description,
                type: "stock",
                session: '20x5',
                timezone: 'Asia/Dhaka',
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

            console.log('Symbols:', symbols); // Log all symbols
            console.log('Symbol Item:', symbolItem); // Log the resolved symbol item
            console.log('[resolveSymbol]: Symbol resolved', symbolName);
            onSymbolResolvedCallback(symbolInfo);
        } catch (error) {
            console.error('[resolveSymbol]: Error', error);
            onResolveErrorCallback('Cannot resolve symbol');
        }
    },

    async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        const { from, to } = periodParams;
        const parsedSymbol = parseFullSymbol(symbolInfo.ticker);
        const urlParameters = {
            e: parsedSymbol.exchange,
            fsym: parsedSymbol.fromSymbol,
            tsym: parsedSymbol.toSymbol,
            toTs: to,
            limit: 2000,
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

    console.log(short, full, "=================Short full")
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
