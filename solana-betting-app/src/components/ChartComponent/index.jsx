import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import axios from "axios";

const ChartComponent = ({ latestPrices, selectedNetwork }) => {
  function getLocalShiftedTimestamp(timestamp) {
    const fromDate = new Date(timestamp * 1000);
    const offsetInSeconds = fromDate.getTimezoneOffset() * 60;
    const localTimestamp = timestamp - offsetInSeconds;

    return localTimestamp;
  }
  // Networks
  const networks = [
    {
      name: "SOL/USD",
      symbol: "SOL",
    },
    {
      name: "ETH/USD",
      symbol: "ETH",
    },
    {
      name: "BTC/USD",
      symbol: "BTC",
    },
  ];

  const latestPrice =
    selectedNetwork === 1
      ? latestPrices.SOL_USD
      : selectedNetwork === 2
      ? latestPrices.ETH_USD
      : latestPrices.BTC_USD;

  const chartContainerRef = useRef();
  const chartRef = useRef();
  const seriesRef = useRef();
  const [selectedPeriod, setSelectedPeriod] = useState("1HOUR");
  const [periodData, setPeriodData] = useState([]);
  const fetchPriceHistory = async () => {
    try {
      const res = await axios.get(
        `https://web-api.pyth.network/history?symbol=Crypto.${
          networks[selectedNetwork - 1].symbol
        }%2FUSD&range=1H&cluster=pythnet`
      );
      const allPrices = res.data || [];
      const timeDivide =
        selectedPeriod === "1HOUR"
          ? 1
          : selectedPeriod === "30MINS"
          ? 2
          : selectedPeriod === "15MINS"
          ? 4
          : 6; // default fallback
      // Get only the first half
      const halfLength = Math.floor(allPrices.length / timeDivide);
      const slicedPrices = allPrices.slice(-halfLength);
      // ✅ Format for lightweight-charts
      const formatted = slicedPrices.map((p) => ({
        time: Math.floor(Date.parse(p.timestamp + "Z") / 1000),
        value: p.close_price,
      }));

      setPeriodData(formatted);
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    }
  };

  useEffect(() => {
    fetchPriceHistory(); // fetch on mount
  }, [selectedPeriod, selectedNetwork]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPeriodData((prev) => {
        // Only remove if there's more than 1 item
        if (prev.length <= 1) return prev;

        // Remove first (oldest) data point
        return prev.slice(1);
      });
    }, 5000); // every 5 seconds

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (
      !latestPrice?.price ||
      !latestPrice?.timestamp ||
      periodData.length === 0
    )
      return;

    const newPoint = {
      time: latestPrice?.timestamp !== undefined && latestPrice?.timestamp, // ✅ UTC seconds
      value: latestPrice.price,
    };

    setPeriodData((prev) => {
      const existingIndex = prev.findIndex((p) => p.time === newPoint.time);

      let updated;
      if (existingIndex !== -1) {
        updated = [...prev];
        updated[existingIndex] = newPoint;
      } else {
        updated = [...prev, newPoint];
      }

      updated.sort((a, b) => a.time - b.time);

      return updated;
    });
  }, [latestPrice]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { type: "solid", color: "#000000" },
        textColor: "white",
      },
      grid: {
        vertLines: { color: "##0000070" },
        horzLines: { color: "#00000070" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
      stroke: {
        curve: "smooth",
      },
    });

    chartRef.current = chart;

    const series = chart.addAreaSeries({
      topColor: "#5849fe",
      bottomColor: "#5849fe03",
      lineColor: "#5849fe",
      lineWidth: 1,
    });

    series.setData(periodData);
    seriesRef.current = series;

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && chartRef.current) {
      seriesRef.current.setData(periodData);
      chartRef.current.timeScale().fitContent();
    }
  });

  return (
    <div>
      <div>
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            gap: "10px",
            marginBottom: "10px",
          }}
        >
          {["10MINS", "15MINS", "30MINS", "1HOUR"].map((interval) => (
            <button
              key={interval}
              onClick={() => setSelectedPeriod(interval)}
              style={{
                padding: "6px 12px",
                background: selectedPeriod === interval ? "#5849fe" : "#333",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            >
              {interval}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: "300px",
          position: "relative",
          fontWeight: "sans-serif",
        }}
      />
    </div>
  );
};

export default ChartComponent;
