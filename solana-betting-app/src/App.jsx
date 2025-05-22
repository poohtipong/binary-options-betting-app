import { useState, useEffect, useRef, useCallback, useContext } from "react";
import axios from "axios";
// Images
import LogoImage from "/op.png";
import SolanaImage from "/solanaLogo.png";
// Components
import TradeTable from "./components/TradeTable";
import CustomSelect from "./components/CustomSelect";
import ChartComponent from "./components/ChartComponent";
import DescriptionLabel from "./components/DescriptionLabel";
// Global Context
import { PricesContext } from "./context/PricesContext";
// Icons
import { LuMoveDownRight } from "react-icons/lu";
import { LuMoveUpRight } from "react-icons/lu";
import { MdLogout } from "react-icons/md";
import { AnchorProvider } from "@coral-xyz/anchor";
// CSS
import "./App.css";
// Solana Packages
import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { RotatingLines } from "react-loader-spinner";

// Reown Appkit Imports
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { solana, solanaTestnet, solanaDevnet } from "@reown/appkit/networks";
import {
  useDisconnect,
  useAppKit,
  createAppKit,
  useAppKitAccount,
  useAppKitProvider,
} from "@reown/appkit/react";
import { BinaryOptionContext, BinaryOptionListener, Bet } from "optn-sdk";

// 0. Set up Solana Adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});
// 1. Get projectId from https://cloud.reown.com
const projectId = "6d47d684147742bf03668bc5abc690b8";
// 2. Create a metadata object - optional
const metadata = {
  name: "binary-betting",
  description: "AppKit Example",
  url: "https://dev.optn.trade/", // origin must match your domain & subdomain
  icons: ["https://assets.reown.com/reown-profile-pic.png"],
};
// 3. Create modal
createAppKit({
  adapters: [solanaWeb3JsAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  metadata: metadata,
  projectId,
  autoConnect: false,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
    socials: false,
    email: false,
    emailShowWallets: false,
  },
});

function App() {
  const tickerIcons = ["/solanaLogo.png", "/ethLogo.png", "/btcIcon.png"];
  const { latestPrices } = useContext(PricesContext);
  const priceFeedIDs = [
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ];
  const { address, isConnected, status } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const { open } = useAppKit();
  const { walletProvider } = useAppKitProvider("solana");
  // States
  const [openSelect, setOpenSelect] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(1);
  const [markets, setMarkets] = useState([]);
  const [bets, setBets] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [closeEvent, setCloseEvent] = useState(false);

  const [tradingAmount, setTradingAmount] = useState(0.05);
  const [bettingOption, setBettingOption] = useState("buy");
  const [duration, setDuration] = useState(30);
  const [walletBalance, setWalletBalance] = useState(0);
  // States for Validation
  const [amountValidation, setAmountValidation] = useState("");
  const [connectValidation, setConnectValidation] = useState("");
  // Loading States
  const [buyLoading, setBuyLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);

  const marketsMapRef = useRef(new Map());
  const betsRef = useRef([]);

  /* Web3 Integration */
  // 1. Setup Connection
  const connection = new Connection(
    "https://devnet.helius-rpc.com/?api-key=6a50f1d4-3796-4112-b0dd-bdb83d44c3dc"
  );
  const provider1 = { connection };
  // 2. Initialize SDK
  const sdk = new BinaryOptionContext(provider1);
  // Fetch Bets Function
  const fetchBets = useCallback(async () => {
    try {
      const housePublicKey = new PublicKey(
        "2Kog34y9TshD1qd4DSSm4L9yi4nnYqxAo95bUvetehMy"
      );
      const house = await sdk.loadHouse(housePublicKey);

      const marketsData = await sdk.loadMarkets(house);
      setMarkets(marketsData);

      marketsMapRef.current = new Map(
        marketsData.map((market) => [market.address.toBase58(), market])
      );

      const allBets = await sdk.loadAllBets(marketsMapRef.current);
      const sortedBets = allBets
        .filter(
          (bet) =>
            walletProvider?.publicKey &&
            bet.authorityAddress.equals(walletProvider.publicKey)
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      betsRef.current = sortedBets;
      console.log("sortedBets >>>", sortedBets[0]);
      setBets(sortedBets);
    } catch (error) {
      console.error("Error fetching bets:", error);
    }
  }, [isConnected]);

  //  useEffect to Run fetchBets on Dependencies
  useEffect(() => {
    if (!isConnected) return;
    fetchBets();
  }, [isConnected]);

  // @@@ Listener Setup (Only Once on Mount)
  useEffect(() => {
    if (!isConnected || !walletProvider?.publicKey) return;

    const sdkListener = new BinaryOptionListener(sdk.program);

    sdkListener.addBetListeners(async (event) => {
      const existing = betsRef.current.find((bet) =>
        event.pubkey.equals(bet.address)
      );

      if (existing) {
        await fetchBets();
      } else {
        const market = marketsMapRef.current.get(event.data.market.toBase58());
        if (!market) {
          console.warn("Market not found for bet:", event.pubkey.toBase58());
          return;
        }
        const createdBet = new Bet(market, event.pubkey, event.data);
        betsRef.current = [createdBet, ...betsRef.current];
        setBets([...betsRef.current]);
        console.log("New Bet Added >>>");
        if (bettingOption === "buy") {
          setBuyLoading(false);
        } else {
          setSellLoading(false);
        }
      }
    });

    return () => {
      sdkListener.removeAllListeners?.();
    };
  }, [isConnected]);

  useEffect(() => {
    if (isConnected === true || walletBalance > 0.03) {
      setConnectValidation("");
    }
  }, [isConnected]);
  // Create Bet function
  const onCreateBetHandler = async (bettingDirection) => {
    setBettingOption(bettingDirection);

    if (isConnected === false) {
      setConnectValidation("Please connect your wallet.");
      return;
    }
    if (walletBalance < 0.03) {
      setConnectValidation("Insufficient Funds");
    }
    if (amountValidation !== "") {
      setAmountValidation("Please set the exact amount");
      return;
    }
    if (!walletProvider || !walletProvider.publicKey) {
      console.error("Wallet not connected!");
      return;
    }
    try {
      if (bettingDirection === "buy") {
        setBuyLoading(true);
      } else {
        setSellLoading(true);
      }
      const provider = await new AnchorProvider(connection, walletProvider, {
        preflightCommitment: "processed",
      });
      const sdkContext = new BinaryOptionContext(provider);
      const res = await sdkContext.createBet({
        market: markets.find(
          (market) => market.feedId == priceFeedIDs[selectedNetwork - 1]
        ), // SOL/USD market
        direction: bettingDirection, // Direction
        expiration: duration, // Seconds
        amount: tradingAmount, // SOL
      });
      console.log("✅ Create Bet succeeded", res);
      // setLoading(false);
    } catch (error) {
      console.log("❌ Create Bet Error: ", error);
      // setLoading(false);
      setBuyLoading(false);
      setSellLoading(false);
    }
  };
  // Close Bet function
  const onCloseBetHandler = async (closingBetAddress) => {
    const closingBet = bets.filter((bet) =>
      bet.address.equals(closingBetAddress)
    );

    if (closingBet.length == 0) return;
    try {
      const provider = await new AnchorProvider(connection, walletProvider, {
        preflightCommitment: "processed",
      });
      const sdkContext = new BinaryOptionContext(provider);
      const res = await sdkContext.closeBet({ bet: closingBet[0] });
      setTimeout(() => {
        const updatedBets = bets.filter(
          (bet) => !bet.address.equals(closingBetAddress)
        );
        setBets(updatedBets);
        setCloseEvent(!closeEvent);
      }, 750);
      console.log("closingBet Origin >>>", closingBet);
      const closedBet = closingBet[0];
      console.log("closingBet >>>", closedBet?.market.feedId);

      const tradeData = {
        address: address,
        network:
          closedBet?.market.feedId == priceFeedIDs[0]
            ? "SOL"
            : closedBet?.market.feedId == priceFeedIDs[1]
            ? "ETH"
            : "BTC",
        amount:
          closedBet?.wageredAmount !== undefined && closedBet?.wageredAmount,
        direction: closedBet?.direction,
        win: closedBet?.status,
        rewards:
          closedBet?.status === "won"
            ? closedBet?.wageredAmount * 1.7
            : closedBet?.wageredAmount,
      };
      const response = await axios.post(
        "https://optn-history-service.onrender.com/api/trades",
        tradeData
      );
      console.log("✅ Closing Bet succeeded", closeEvent, res);
    } catch (error) {
      console.log("Close Bet Error: ", error);
    }
  };
  // Minimize Wallet Address Handler
  function minimizeAddress(addr) {
    return addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
  }
  // Connect & Disconnect Handlers
  const onConnectWalletHandler = async () => {
    await open();
  };
  const onDisconnectHandler = () => {
    disconnect();
  };
  // Validation Handler
  const onAmountValidationHandler = (value) => {
    if (value > 0.1) {
      setAmountValidation("Max amount is 0.1 SOL");
    } else if (value < 0.03) {
      setAmountValidation("Min amount is 0.03 SOL");
    } else {
      setAmountValidation("");
    }
  };
  // Get Wallet Balance
  useEffect(() => {
    if (isConnected) {
      console.log("address >>>", address);
      const fetchBalance = async () => {
        console.log("isConnected >>> ", isConnected);

        try {
          const res = await axios.get(
            `https://optn-history-service.onrender.com/api/trades/${address}`
          );
          console.log("Res >>>>", res);
          setMyBets(res?.data);

          const lamports = await connection.getBalance(
            walletProvider?.publicKey
          );
          const sol = lamports / 1e9;
          setWalletBalance(sol);
        } catch (error) {
          console.error("Failed to fetch balance:", error);
        }
      };
      fetchBalance(); // Immediately invoke
    }
  }, [isConnected, closeEvent, address]);
  // Description Handler

  return (
    <div className="container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo_image">
          <img
            src={LogoImage}
            width={"auto"}
            height={40}
            className="logo"
            alt="Vite logo"
          />
          <div className="beta_navbar">BETA</div>
        </div>
        <div className="connect_wallet">
          <button className="navbar-button" onClick={onConnectWalletHandler}>
            <img src="/ghost.png" width={20} height={"auto"} alt="" />
            {isConnected === true ? (
              <span className="connect_wallet_text">
                {minimizeAddress(address)}
              </span>
            ) : (
              <span className="connect_wallet_text">CONNECT WALLET</span>
            )}
          </button>
          {isConnected === true && (
            <button
              className="navbar-disconnect-button"
              onClick={onDisconnectHandler}
            >
              <MdLogout size={20} strokeWidth={1} />
            </button>
          )}
        </div>
      </nav>
      {/* Navbar - END */}
      {/* Trading Content */}
      <div className="trading">
        {/* Chart & History */}
        <div className="chart_history">
          <div className="realtime_chart">
            <div className="select_network">
              <CustomSelect
                setOpenSelect={setOpenSelect}
                openSelect={openSelect}
                setSelectedNetwork={setSelectedNetwork}
                selectedNetwork={selectedNetwork}
                tickerIcons={tickerIcons}
              />
              <div className="latest_price">
                <div className="monospace_font">
                  {selectedNetwork === 1
                    ? latestPrices.SOL_USD?.price?.toFixed(4)
                    : selectedNetwork === 2
                    ? latestPrices.ETH_USD?.price?.toFixed(4)
                    : latestPrices.BTC_USD?.price?.toFixed(4)}
                </div>
                <div
                  className="sans_font"
                  style={{ fontSize: "14px", color: "#ffffff60" }}
                >
                  PRICE
                </div>
              </div>
              <div className="latest_price">
                <div className="monospace_font">70%</div>
                <div
                  className="sans_font"
                  style={{ fontSize: "14px", color: "#ffffff60" }}
                >
                  PAYOUT
                </div>
              </div>
            </div>
            <ChartComponent
              latestPrices={latestPrices}
              selectedNetwork={selectedNetwork}
            />
          </div>
          <div className="betting_history">
            <div className="trade_history_text">Trade History</div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SYMBOL</th>
                    <th>AMOUNT</th>
                    <th>DIRECTION</th>
                    <th>RESULT</th>
                    <th>REWARDS</th>
                  </tr>
                </thead>
                <tbody>
                  {[...myBets].reverse().map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item?.network}</td>
                      <td>{item?.amount}</td>
                      <td>{item?.direction}</td>
                      <td className={item?.win === "won" ? "win" : "lose"}>
                        {item?.win}
                      </td>
                      <td
                        className={item.win === "won" ? "positive" : "negative"}
                      >
                        {item.win === "won"
                          ? `+${item?.rewards.toFixed(3)}`
                          : `-${item?.rewards}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Chart & History - END */}
        {/* Settings */}
        <div className="settings">
          {/* Amount & Duration & Direction */}
          <div className="trade_settings">
            <div className="wallet_balance">
              <div className="wallet_balance_text">Your Balance:</div>
              <div className="balance_value_text">
                {isConnected === false ? 0 : walletBalance.toFixed(3)}{" "}
                <span
                  style={{ fontSize: "16px" }}
                  className="wallet_balance_value"
                >
                  SOL
                </span>
              </div>
            </div>
            <DescriptionLabel
              title="Trading Amount"
              titleText="SOL Amount"
              descriptionText="During BETA testing - Max amount 0.1 SOL, Min amount 0.01 SOL"
            />
            <div className="betting_price">
              <div
                style={{
                  width: "140%",
                }}
              >
                <input
                  type="number"
                  value={tradingAmount}
                  placeholder="0.01"
                  onChange={(e) => {
                    setTradingAmount(e.target.value);
                    onAmountValidationHandler(e.target.value);
                  }}
                  min={0.03}
                  max={0.1}
                />
              </div>{" "}
              <div className="input_right">
                <span>SOL</span>
                <img src={SolanaImage} width={30} height={30} alt="" />
              </div>
            </div>
            <div className="amount_validation">{amountValidation}</div>
            <DescriptionLabel
              title="Duration"
              titleText="Choose your duration"
              descriptionText="This defines how long your trade will last for."
            />
            <div className="betting_duration">
              <div className="duration_buttons">
                <div
                  className={`${
                    duration === 30 ? "selected_time_button" : "time_button"
                  }`}
                  onClick={() => {
                    setDuration(30);
                  }}
                >
                  30s
                </div>
                <div
                  className={`${
                    duration === 60 ? "selected_time_button" : "time_button"
                  }`}
                  onClick={() => {
                    setDuration(60);
                  }}
                >
                  1MIN
                </div>
                <div
                  className={`${
                    duration === 600 ? "selected_time_button" : "time_button"
                  }`}
                  onClick={() => {
                    setDuration(600);
                  }}
                >
                  10MINS
                </div>
                <div
                  className={`${
                    duration === 900 ? "selected_time_button" : "time_button"
                  }`}
                  onClick={() => {
                    setDuration(900);
                  }}
                >
                  15MINS
                </div>
                <div
                  className={`${
                    duration === 1800 ? "selected_time_button" : "time_button"
                  }`}
                  onClick={() => {
                    setDuration(1800);
                  }}
                >
                  30MINS
                </div>
                <div
                  className={`${
                    duration === 3600 ? "selected_time_button" : "time_button"
                  }`}
                  onClick={() => {
                    setDuration(3600);
                  }}
                >
                  1HOUR
                </div>
              </div>
            </div>
            <div className="betting_options">
              <DescriptionLabel
                title="Direction"
                titleText="Choose your directional bias"
                descriptionText="Choose between BUY (up) and SELL (down)"
              />
              <div className="betting_options_buttons">
                <div
                  className={`${
                    bettingOption === "buy"
                      ? "selected_option_button"
                      : "option_button"
                  }`}
                  onClick={() => {
                    !buyLoading && onCreateBetHandler("buy");
                  }}
                >
                  {buyLoading === false ? (
                    "BUY"
                  ) : (
                    <RotatingLines
                      strokeColor="white"
                      strokeWidth="5"
                      animationDuration="0.75"
                      width="24"
                      visible={true}
                    />
                  )}
                  {buyLoading === false && (
                    <LuMoveUpRight size={24} strokeWidth={3} />
                  )}
                </div>
                <div
                  className={`${
                    bettingOption === "sell"
                      ? "selected_down_option_button"
                      : "down_option_button"
                  }`}
                  onClick={() => {
                    !sellLoading && onCreateBetHandler("sell");
                  }}
                >
                  {sellLoading === false ? (
                    "SELL"
                  ) : (
                    <RotatingLines
                      strokeColor="white"
                      strokeWidth="5"
                      animationDuration="0.75"
                      width="24"
                      visible={true}
                    />
                  )}
                  {sellLoading === false && (
                    <LuMoveDownRight size={24} strokeWidth={3} />
                  )}
                </div>
              </div>
            </div>
            {connectValidation !== "" && (
              <div className="connect_validation">{connectValidation}</div>
            )}
            <div className="win_payout">
              WIN PAYOUT:{"  "}
              <span className="win_payout_info">
                +70% / {(tradingAmount * 1.7).toFixed(3)} SOL
              </span>
            </div>
          </div>
          {/* Amount & Duration & Direction - END */}
          {/* Live Trades */}
          <div className="live_trades">
            <div className="large_title">Live Trades</div>
            <TradeTable
              myLiveTrades={bets}
              selectedNetwork={selectedNetwork}
              onCloseBetHandler={onCloseBetHandler}
            />
          </div>
          {/* Live Trades - END */}
        </div>
        {/* Settings - END */}
      </div>
    </div>
  );
}

export default App;
