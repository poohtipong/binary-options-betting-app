// src/context/PricesContext.js
import React, { createContext, useEffect, useRef, useState } from "react";
import { HermesClient } from "@pythnetwork/hermes-client";

export const PricesContext = createContext();

const PriceIds = {
  SOL_USD: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BTC_USD: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH_USD: "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
};

export const PricesProvider = ({ children }) => {
  const [latestPrices, setLatestPrices] = useState(0);
  const [priceFeedId, setPriceFeedId] = useState(
    "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d"
  );
  const clientRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    clientRef.current = new HermesClient("https://hermes.pyth.network");

    Object.entries(PriceIds).forEach(([symbol, priceFeedId]) => {
      clientRef.current
        .getPriceUpdatesStream([priceFeedId], { parsed: true })
        .then((stream) => {
          stream.onmessage = (event) => {
            const data = JSON.parse(event.data)?.parsed || [];
            data.forEach((item) => {
              const price = item.price.price * Math.pow(10, item.price.expo);
              const timestamp = item.price.publish_time;

              setLatestPrices((prev) => ({
                ...prev,
                [symbol]: {
                  price,
                  timestamp,
                },
              }));
            });
          };

          stream.onerror = (err) => {
            console.error(`Hermes error for ${symbol}:`, err);
            stream.close();
          };
        });
    });
  }, []);

  return (
    <PricesContext.Provider
      value={{
        latestPrices,
        priceFeedId,
        setPriceFeedId,
      }}
    >
      {children}
    </PricesContext.Provider>
  );
};
