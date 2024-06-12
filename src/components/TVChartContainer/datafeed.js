const API_KEY = 'a617f44edefa9b5794f43e6a1054755d13a69d11318c8d3ed4e5bf08cd61730d';

async function makeApiRequest(path) {
    try {
        const response = await fetch(`https://min-api.cryptocompare.com/${path}`, {
            headers: {
                Authorization: `Apikey ${API_KEY}`
            }
        });
        return response.json();
    } catch (error) {
        throw new Error(`CryptoCompare request error: ${error.status}`);
    }
}

// Generates a symbol ID from a pair of the coins
function generateSymbol(exchange, fromSymbol, toSymbol) {
    const short = `${fromSymbol}/${toSymbol}`;
    return {
        short,
        full: `${exchange}:${short}`,
    };
}

// Returns all parts of the symbol
function parseFullSymbol(fullSymbol) {
    const match = fullSymbol.match(/^(\w+):(\w+)\/(\w+)$/);
    if (!match) {
        return null;
    }
    return { exchange: match[1], fromSymbol: match[2], toSymbol: match[3] };
}

const Datafeed = {
    configurationData: {
        supported_resolutions: ['1h', '2h', '3h', '4h', '5h', '6h','1D', '1W', '3W', '1M', '6M'],
        exchanges: [
            { value: 'Bitfinex', name: 'Bitfinex', desc: 'Bitfinex'},
            { value: 'Kraken', name: 'Kraken', desc: 'Kraken bitcoin exchange'},
        ],
        symbols_types: [
            { name: 'crypto', value: 'crypto'}
        ]
    },

    async getAllSymbols() {
        const data = await makeApiRequest('data/v3/all/exchanges');
        let allSymbols = [];

        for (const exchange of this.configurationData.exchanges) {
            const pairs = data.Data[exchange.value].pairs;

            for (const leftPairPart of Object.keys(pairs)) {
                const symbols = pairs[leftPairPart].map(rightPairPart => {
                    const symbol = generateSymbol(exchange.value, leftPairPart, rightPairPart);
                    return {
                        symbol: symbol.short,
                        ticker: symbol.full,
                        description: symbol.short,
                        exchange: exchange.value,
                        type: 'crypto',
                    };
                });
                allSymbols = [...allSymbols, ...symbols];
            }
        }
        return allSymbols;
    },

    onReady: function(callback) {
        console.log('[onReady]: Method call');
        setTimeout(() => callback(this.configurationData));
    },

    async searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
        console.log('[searchSymbols]: Method call');
        const symbols = await this.getAllSymbols();
        const newSymbols = symbols.filter(symbol => {
            const isExchangeValid = exchange === '' || symbol.exchange === exchange;
            const isFullSymbolContainsInput = symbol.ticker
                .toLowerCase()
                .indexOf(userInput.toLowerCase()) !== -1;
            return isExchangeValid && isFullSymbolContainsInput;
        });
        onResultReadyCallback(newSymbols);
    },

    async resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback, extension) {
        console.log('[resolveSymbol]: Method call', symbolName);
        const symbols = await this.getAllSymbols();
        const symbolItem = symbols.find(({ ticker }) => ticker === symbolName);
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
        const { from, to, firstDataRequest } = periodParams;
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
            const data = await makeApiRequest(`data/histoday?${query}`);
            if (data.Response && data.Response === 'Error' || data.Data.length === 0) {
                onHistoryCallback([], { noData: true });
                return;
            }
            let bars = [];
            data.Data.forEach(bar => {
                if (bar.time >= from && bar.time < to) {
                    bars = [...bars, {
                        time: bar.time * 1000,
                        low: bar.low,
                        high: bar.high,
                        open: bar.open,
                        close: bar.close,
                    }];
                }
            });
            onHistoryCallback(bars, { noData: false });
        } catch (error) {
            console.log('[getBars]: Get error', error);
            onErrorCallback(error);
        }
    },

    subscribeBars: function(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        console.log('[subscribeBars]: Method call with subscriberUID:', subscriberUID);
    },

    unsubscribeBars: function(subscriberUID) {
        console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
    },
};

export default Datafeed;