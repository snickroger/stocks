import { loadConfig } from "./config.js";
import { FileRepository } from "./fileRepository/fileRepository.js";
import { GoogleDrive } from "./googleDrive/googleDrive.js";
import { StocksApi } from "./stocksApi/stocksApi.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const google = new GoogleDrive(config.google);
  const fileRepo = new FileRepository(config.cacheDir);
  const stocks = new StocksApi(config.twelveDataApiKey, fileRepo);

  const currentStockSymbols = await google.getAllStockSymbols();
  const currentStockPrices = await stocks.getStockPrices(currentStockSymbols.map(s => s[0]));

  const updatedStockPrices: Record<string, { cell: string, price: number }> = {};
  for (const symbol of currentStockSymbols) {
    updatedStockPrices[symbol[0]] = { cell: symbol[1], price: currentStockPrices[symbol[0]] };
  }

  await google.updateSheet(updatedStockPrices);
  await google.updateGrowthSheet();
}

process.on("unhandledRejection", reason => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", err => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

try {
  await main();
} catch (err) {
  console.error("Fatal error:", err);
  process.exit(1);
}
