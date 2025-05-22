import { useEffect, useState, useRef } from "react";

const PYTH_WS_URL =
  "wss://hermes.pyth.network/v2/updates/price/stream?ids[]=0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

export function usePythPrice() {
  const [prices, setPrices] = useState([]); // Store latest price updates
  const [connected, setConnected] = useState(false); // Track connection status
  const wsRef = useRef(null); // Store WebSocket instance
  const reconnectTimeoutRef = useRef(null); // Store timeout ID for reconnect
  let retryCount = 0; // Track reconnect attempts

  useEffect(() => {
    let isMounted = true; // Ensure component is mounted before updating state

    const connectWebSocket = () => {
      if (wsRef.current) return; // Prevent multiple WebSocket instances

      console.log("🔄 Connecting to Pyth WebSocket...");
      wsRef.current = new WebSocket(PYTH_WS_URL);

      wsRef.current.onopen = () => {
        console.log("✅ Connected to Pyth WebSocket");
        if (isMounted) {
          setConnected(true);
          retryCount = 0; // Reset retry count on successful connection
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const extractedPrices =
            data.parsed?.map((item) => ({
              id: item.id, // Market ID (Solana public key)
              price: item.price.price, // Extracted price
              conf: item.price.conf, // Confidence interval
              expo: item.price.expo, // Exponent
              timestamp: new Date(
                item.price.publish_time * 1000
              ).toLocaleTimeString(), // Convert timestamp
            })) || [];

          if (isMounted) {
            setPrices((prev) => [...extractedPrices, ...prev].slice(0, 20)); // Keep only last 20 prices
          }
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.warn("⚠️ WebSocket closed. Reason:", event.reason);
        if (isMounted) {
          setConnected(false);
          if (event.code !== 1000) {
            // Exponential backoff for reconnection
            const reconnectDelay = Math.min(5000 * 2 ** retryCount, 60000);
            console.log(
              `⏳ Reconnecting in ${reconnectDelay / 1000} seconds...`
            );
            reconnectTimeoutRef.current = setTimeout(
              connectWebSocket,
              reconnectDelay
            );
            retryCount++;
          }
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
      };
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        console.log("🔴 Closing WebSocket connection");
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return { prices, connected };
}
