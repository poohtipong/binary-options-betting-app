import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import axios from "axios";

const PriceChart = ({ selectedNetwork }) => {
  const [duration, setDuration] = useState(60); // Default to 1 minute

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
  const durations = {
    "5MIN": 5,
    "10MIN": 10,
    "30MIN": 30,
    "1H": 60,
  };
  const [series, setSeries] = useState([
    {
      name: "SOL/USD",
      data: [],
    },
    {
      name: "ETH/USD",
      data: [],
    },
    {
      name: "BTC/USD",
      data: [],
    },
  ]);
  const [options, setOptions] = useState({
    chart: {
      height: 350,
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false },
      background: "#0e0e0e", // ✅ set chart background color
    },
    xaxis: {
      type: "datetime",
      labels: {
        datetimeUTC: false,
        labels: { style: { colors: "white" } },
      },
    },
    colors: ["#5849fe"],

    yaxis: {
      opposite: true,
      decimalsInFloat: 4,
      labels: { style: { colors: "white" } },
    },
    stroke: {
      curve: "smooth",
    },
    tooltip: {
      x: {
        format: "HH:mm:ss",
      },
    },
    grid: { borderColor: "#ffffff30", border: "solid" },
  });

  const fetchPriceHistory = async () => {
    try {
      const res = await axios.get(
        `https://web-api.pyth.network/history?symbol=Crypto.${
          networks[selectedNetwork - 1].symbol
        }%2FUSD&range=1H&cluster=pythnet`
      );

      const prices = res.data || [];

      const formatted = prices.map((p) => ({
        x: new Date(p.timestamp).getTime(),
        y: p.close_price,
      }));

      setSeries([{ name: "SOL/USD", data: formatted }]);
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    }
  };
  useEffect(() => {
    fetchPriceHistory(); // fetch on mount
    const interval = setInterval(fetchPriceHistory, 10000); // refresh every 1 min
    return () => clearInterval(interval); // cleanup on unmount
  }, [selectedNetwork]);

  return (
    <div
      style={{
        color: "white",
        width: "97%",
        borderRadius: "10px",
      }}
    >
      {/* Duration buttons */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        {Object.entries(durations).map(([label, val]) => (
          <button
            key={label}
            onClick={() => setDuration(val)}
            style={{
              padding: "6px 14px",
              border: "none",
              borderRadius: "4px",
              background: duration === val ? "#5849fe" : "#222",
              color: duration === val ? "#fff" : "#aaa",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <ApexChart options={options} series={series} type="line" height={350} />
    </div>
  );
};

export default PriceChart;
