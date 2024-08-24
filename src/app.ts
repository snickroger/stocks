import { FileRepository } from "./cache/fileRepository.js";
import { GoogleDrive } from "./googleDrive/googleDrive.js";
import { StocksApi } from "./stocksApi/stocksApi.js";

const google: GoogleDrive = new GoogleDrive();
const fileRepo: FileRepository = new FileRepository();
const stocks: StocksApi = new StocksApi(fileRepo);

const currentStockSymbols = await google.getAllStockSymbols();
const currentStockPrices = await stocks.getStockPrices(currentStockSymbols.map(s => s[0]));

const updatedStockPrices: { [symbol: string]: { cell: string, price: number } } = {};
for (const symbol of currentStockSymbols) {
  updatedStockPrices[symbol[0]] = { cell: symbol[1], price: currentStockPrices[symbol[0]] }
}

await google.updateSheet(updatedStockPrices);