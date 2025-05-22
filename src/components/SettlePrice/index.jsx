import React, { useState, useEffect } from "react";

const SettlePrice = ({ duration, bet, latestPrice, setSettlementPrice }) => {
  const [expiredPrice, setExpiredPrice] = useState(0);

  useEffect(() => {
    const getExpiredPrice = async () => {
      try {
        const res = await bet.getPrice();
        const formattedPrice = (res / 100000000).toFixed(4);
        setExpiredPrice(formattedPrice);
        setSettlementPrice(Number(formattedPrice));
      } catch (error) {
        console.error("Failed to get expired price:", error);
      }
    };

    // Only set timeout if bet and required data are available
    if (bet?.data?.expiresAt && bet?.data?.createdAt) {
      const durationSeconds =
        bet.status === "pending"
          ? bet.data.expiresAt.toNumber() - bet.data.createdAt.toNumber()
          : 0;
      console.log("durationSeconds >>>", durationSeconds);
      const timeout = setTimeout(() => {
        getExpiredPrice();
      }, durationSeconds * 1000);

      return () => clearTimeout(timeout);
    }
  }, [bet]); // Add `bet` to dependency array if it's fetched asynchronously

  return (
    <div>
      {expiredPrice === 0 ? latestPrice?.price.toFixed(4) : expiredPrice}
    </div>
  );
};

export default SettlePrice;
