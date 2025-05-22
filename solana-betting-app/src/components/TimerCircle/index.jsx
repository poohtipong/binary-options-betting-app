import React, { useState, useEffect } from "react";
import "./style.css"; // Import external CSS

const TimerCircle = ({
  initialTime,
  direction,
  entryPrice,
  status,
  bet,
  settlementPrice,
  setBettingStatus,
}) => {
  console.log("Bet >>>", bet?.expiresAt.toNumber(), new Date());
  const [timeLeft, setTimeLeft] = useState(
    status === "pending"
      ? bet?.expiresAt.toNumber() - bet.createdAt.toNumber()
      : 0
  );
  useEffect(() => {
    if (timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (settlementPrice === 0) return;

    const won =
      (settlementPrice > entryPrice && direction === "buy") ||
      (settlementPrice < entryPrice && direction === "sell");

    setBettingStatus(won ? "WON" : "LOSE");
  }, [settlementPrice]);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const progress = ((initialTime - timeLeft) / initialTime) * circumference;

  return (
    <div className="timer-container">
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} className="circle-background" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          className={`circle-progress ${
            entryPrice < settlementPrice ? "red-progress" : "green-progress"
          }`}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
        />
      </svg>
      <div className="timer-text">{timeLeft}s</div>
    </div>
  );
};

export default TimerCircle;
