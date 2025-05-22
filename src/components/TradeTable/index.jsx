import React, { useState, useContext } from "react";
import TimerCircle from "../TimerCircle";
import SettlePrice from "../SettlePrice";
import { PricesContext } from "../../context/PricesContext";
import { RotatingLines } from "react-loader-spinner";

import "./style.css"; // Import the CSS file

const TradeTable = ({ myLiveTrades, selectedNetwork, onCloseBetHandler }) => {
  const { latestPrices } = useContext(PricesContext);
  const [settlementPrices, setSettlementPrices] = useState({});
  const [bettingStatuses, setBettingStatuses] = useState({});
  const networks = ["SOL", "ETH", "BTC"];

  const latestPrice =
    selectedNetwork === 1
      ? latestPrices.SOL_USD
      : selectedNetwork === 2
      ? latestPrices.ETH_USD
      : latestPrices.BTC_USD;

  const handleClose = (address) => {
    onCloseBetHandler(address);
  };

  const getDuration = async (bet) => {
    return Math.floor(
      (new Date(bet?.expiresAt) - new Date(bet?.createdAt)) / 1000
    );
  };
  return (
    <div className="live-trades-table-container">
      <table className="trade-table">
        <thead>
          <tr>
            <th>SYMBOL</th>
            <th>DIRECTION</th>
            <th>ENTRY</th>
            <th>CURRENT</th>
            <th>TIME</th>
            <th>RESULT</th>
            <th>PAYOUT</th>
          </tr>
        </thead>
        <tbody>
          {myLiveTrades !== undefined &&
            myLiveTrades.map((trade, index) => (
              <tr key={index}>
                {/* <td>{networks[Number(trade.selectedNetwork) - 1]}</td> */}
                <td>SOL</td>
                <td>{trade.direction.toUpperCase()}</td>
                <td>${trade.entryPrice.toFixed(4)}</td>
                <td>
                  <SettlePrice
                    duration={30}
                    bet={trade}
                    latestPrice={latestPrice}
                    setSettlementPrice={(price) =>
                      setSettlementPrices((prev) => ({
                        ...prev,
                        [index]: price,
                      }))
                    }
                  />
                </td>
                <td>
                  <TimerCircle
                    initialTime={trade?.duration}
                    entryPrice={trade.entryPrice}
                    direction={trade.direction}
                    status={trade.status}
                    bet={trade.data}
                    settlementPrice={settlementPrices[index] || 0}
                    setBettingStatus={(status) =>
                      setBettingStatuses((prev) => ({
                        ...prev,
                        [index]: trade.status,
                      }))
                    }
                  />
                </td>
                <td
                  className={
                    trade.status === "pending"
                      ? "pending_text"
                      : trade.status === "won"
                      ? "won_text"
                      : "lose_text"
                  }
                >
                  {trade.status.toUpperCase()}
                  {/* {bettingStatuses[index] == undefined
                    ? "Pending"
                    : bettingStatuses[index]} */}
                </td>
                <td>
                  <div
                    onClick={() => handleClose(trade.address)}
                    className={
                      trade.status === "pending"
                        ? ""
                        : trade.status === "won"
                        ? "win_button"
                        : "lose_button"
                    }
                  >
                    {trade.status === "pending" ? (
                      <RotatingLines
                        strokeColor="white"
                        strokeWidth="5"
                        animationDuration="0.75"
                        width="24"
                        visible={true}
                      />
                    ) : trade.status === "won" ? (
                      "Claim Win"
                    ) : (
                      "Reclaim Rent"
                    )}
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default TradeTable;
