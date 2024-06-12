import React, { useEffect, useRef } from 'react';
import './index.css';
import { widget } from '../../charting_library';
import datafeed from './datafeed';

function getLanguageFromURL() {
    const regex = new RegExp('[\\?&]lang=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

export const TVChartContainer = () => {
    const chartContainerRef = useRef();
    const defaultProps = {
        // symbol: "Bitfinex:BTC/USD",
        symbol: "DSE:ROBI/BDT", // Change the default symbol here
        interval: 'D',
        // datafeedUrl: 'https://demo_feed.tradingview.com',
        libraryPath: '/charting_library/',
        chartsStorageUrl: 'https://saveload.tradingview.com',
        chartsStorageApiVersion: '1.1',
        clientId: 'tradingview.com',
        userId: 'public_user_id',
        fullscreen: true,
        autosize: true,
        studiesOverrides: {},
        timeframe: '5M',
        theme: 'dark',
        timezone: 'Asia/Dhaka'
    };
    useEffect(() => {
        const widgetOptions = {
            symbol: defaultProps.symbol,
            // BEWARE: no trailing slash is expected in feed URL
            datafeed: datafeed,
            interval: defaultProps.interval,
            container: chartContainerRef.current,
            library_path: defaultProps.libraryPath,
            locale: getLanguageFromURL() || 'en',
            disabled_features: ['use_localstorage_for_settings'],
            enabled_features: ['study_templates'],
            charts_storage_url: defaultProps.chartsStorageUrl,
            charts_storage_api_version: defaultProps.chartsStorageApiVersion,
            client_id: defaultProps.clientId,
            user_id: defaultProps.userId,
            fullscreen: defaultProps.fullscreen,
            autosize: defaultProps.autosize,
            studies_overrides: defaultProps.studiesOverrides,
            timeframe: defaultProps.timeframe,
            theme: defaultProps.theme,
            timezone: defaultProps.timezone,
        };

        const tvWidget = new widget(widgetOptions);

        tvWidget.onChartReady(() => {
            tvWidget.headerReady().then(() => {
                const button = tvWidget.createButton();
                button.setAttribute('title', 'Click to show a notification popup');
                button.classList.add('apply-common-tooltip');
                button.addEventListener('click', () => tvWidget.showNoticeDialog({
                    title: 'Notification',
                    body: 'TradingView Charting Library API works correctly',
                    callback: () => {
                        console.log('Noticed!');
                    },
                }));

                button.innerHTML = 'Check API';
            });
        });
        return () => {
            tvWidget.remove();
        };
    }, []);

    return (
        <div
            ref={chartContainerRef}
            className={'TVChartContainer'}
        />
    );
}
