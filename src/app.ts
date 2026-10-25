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
  console.log("Fetched %d stock symbols from sheet", currentStockSymbols.length);

  const currentStockPrices = await stocks.getStockPrices(currentStockSymbols.map(([symbol]) => symbol));

  const updatedStockPrices: Record<string, { cell: string, price: number }> = {};
  for (const [symbol, cell] of currentStockSymbols) {
    const price = currentStockPrices[symbol];
    if (price === undefined) {
      throw new Error(`Missing price data for symbol "${symbol}" (cell ${cell})`);
    }
    updatedStockPrices[symbol] = { cell, price };
  }

  console.log("Updating holdings sheet...");
  await google.updateSheet(updatedStockPrices);

  console.log("Updating growth sheet...");
  await google.updateGrowthSheet();

  console.log("Stock sheet update complete.");
}

try {
  await main();
} catch (err) {
  console.error("Fatal error:", err);
  process.exitCode = 1;
}
