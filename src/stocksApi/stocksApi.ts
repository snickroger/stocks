import axios from "axios";
import { env } from "process";
import { FileRepository } from "../fileRepository/fileRepository.js";

export class StocksApi {
    private readonly apiKey: string;
    private readonly fileRepo: FileRepository;

    constructor(fileRepo: FileRepository) {
        this.apiKey = env.TWELVEDATA_APIKEY!;
        this.fileRepo = fileRepo;
    }

    public async getStockPrices(stockSymbols: string[]): Promise<Record<string, number>> {
        const result: Record<string, number> = {};
        let responses: string[];

        const cachedResponses = await this.fileRepo.getAllCachedResponses();

        if (cachedResponses !== null) {
            responses = cachedResponses;
        } else {
            responses = [];
            const responseObjs = await this.getResponsesFromApi(stockSymbols);
            for (const [symbol, datetime, json] of responseObjs) {
                await this.fileRepo.writeResponseFile(symbol, datetime, json);
                responses.push(json);
            }
        }

        for (const response of responses) {
            const responseObj = JSON.parse(response);
            if (responseObj.symbol && responseObj.close) {
                result[responseObj.symbol] = parseFloat(responseObj.close);
            }
        }

        return result;
    }

    private getUrl(symbol: string): string {
        return `https://api.twelvedata.com/eod?symbol=${symbol}&apikey=${this.apiKey}`;
    }

    private async getResponsesFromApi(stockSymbols: string[]): Promise<[symbol: string, datetime: string, json: string][]> {
        const responses: [symbol: string, datetime: string, json: string][] = [];
        let count = 0;
        for (const symbol of stockSymbols) {
            if (count === 8) {
                console.log("Waiting one minute...");
                await new Promise(r => setTimeout(r, 60 * 1000));
                count = 0;
            }

            const url = this.getUrl(symbol);
            const response = await axios.get(url);

            responses.push([response.data.symbol, response.data.datetime, JSON.stringify(response.data)]);
            console.log("Retrieved data for symbol %s", response.data.symbol);
            count++;
        }

        return responses;
    }
}