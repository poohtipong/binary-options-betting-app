const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { AnchorProvider, Wallet } = require("@coral-xyz/anchor");
const { BinaryOptionContext, BetStatus } = require("optn-sdk");
require("dotenv").config();

const BATCH_SIZE = 15;
const POLL_INTERVAL = 10_000; // 10 seconds

const RPC_URL = process.env.HELIUS_RPC;
const secretKeyArray = JSON.parse(process.env.ADMIN_KEYPAIR);
const secretKey = Uint8Array.from(secretKeyArray);
const ADMIN_KEYPAIR = Keypair.fromSecretKey(secretKey);
const HOUSE_KEY = new PublicKey(process.env.HOUSE_KEY);
const ALT_KEY = new PublicKey(process.env.ALT_KEY);

(async () => {
  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new Wallet(ADMIN_KEYPAIR);
  const provider = new AnchorProvider(connection, wallet);
  const sdkContext = new BinaryOptionContext(provider);

  const house = await sdkContext.loadHouse(HOUSE_KEY);
  const { value: altAccount } = await connection.getAddressLookupTable(ALT_KEY);

  const runBot = async () => {
    try {
      const markets = await sdkContext.loadMarkets(house);
      const bets = [];

      for (const market of markets) {
        bets.push(...(await sdkContext.loadBets(market)));
      }

      const currentTime = Date.now();
      const expiredBets = bets.filter(
        (bet) =>
          bet.status === BetStatus.Pending &&
          bet.expiresAt.getTime() < currentTime
      );

      console.log(
        `[${new Date().toISOString()}] Found ${
          expiredBets.length
        } expired bets.`
      );

      let i = 0;
      while (i < expiredBets.length) {
        const chunk = expiredBets.slice(i, i + BATCH_SIZE);
        const instructions = [];

        for (const bet of chunk) {
          try {
            instructions.push(await sdkContext.settleBetInstruction(bet));
          } catch (err) {
            console.error(
              "⚠️ Failed to generate instruction for bet:",
              bet.publicKey.toBase58(),
              err
            );
          }
        }

        try {
          const sig = await sdkContext.sendSmartTransaction(
            instructions,
            [],
            [altAccount],
            "High",
            100000000000 // maxcap: 0.0001 SOL, do not set it lower than 0.00005 SOL
          );
          console.log("✅ Transaction sent:", sig);
        } catch (err) {
          console.error("❌ Transaction failed:", err);
        }

        i += BATCH_SIZE;
      }
    } catch (err) {
      console.error("🚨 Error in runBot:", err);
    }

    // Wait and repeat
    setTimeout(runBot, POLL_INTERVAL);
  };

  runBot(); // start the loop
})();
