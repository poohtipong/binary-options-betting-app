import { useState } from "react";
import "./style.css"; // Import CSS file

export default function CustomSelect({
  openSelect,
  setOpenSelect,
  setSelectedNetwork,
  selectedNetwork,
  tickerIcons,
}) {
  const networks = ["SOL", "ETH", "BTC"];
  return (
    <div className="custom-select" onClick={() => setOpenSelect(!openSelect)}>
      <div className="select-box">
        <img
          src={tickerIcons[selectedNetwork - 1]}
          width={32}
          height={32}
          alt=""
        />
        <span className="monospace_font">{networks[selectedNetwork - 1]}</span>
      </div>
      <ul className={`select-dropdown ${openSelect ? "show" : ""}`}>
        {networks.map((network, index) => (
          <li
            key={index}
            className="select-option"
            onClick={(e) => {
              setSelectedNetwork(index + 1);
              setOpenSelect(false);
              e.stopPropagation();
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <img
                src={tickerIcons[index]}
                width={28}
                height={28}
                alt="Ticker"
              />
              <span className="monospace_font">{network}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
