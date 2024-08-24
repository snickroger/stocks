import { OAuth2Client } from "google-auth-library";
import { google, sheets_v4 } from "googleapis";
import { env } from "process";

export class GoogleDrive {
    private readonly sheets: sheets_v4.Sheets;

    private readonly oAuth2Client: OAuth2Client;

    private readonly googleSheetId: string;

    constructor() {
        this.sheets = google.sheets('v4');
        this.googleSheetId = env.GOOGLE_SHEETID!;

        const clientId = env.GOOGLE_CLIENTID!;
        const clientSecret = env.GOOGLE_CLIENTSECRET!;
        const refreshToken = env.GOOGLE_REFRESHTOKEN!;

        this.oAuth2Client = new google.auth.OAuth2(clientId, clientSecret);
        this.oAuth2Client.setCredentials({ refresh_token: refreshToken });
    }

    public async getAllStockSymbols(): Promise<[symbol: string, cell: string][]> {
        const sheet = await this.sheets.spreadsheets.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId
        });

        const { startRowIndex, endRowIndex } = sheet.data.sheets![0].bandedRanges![0].range!;

        const sheetDataResponse = await this.sheets.spreadsheets.values.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            range: `A${startRowIndex! + 2}:A${endRowIndex!}`,
        });

        return sheetDataResponse.data.values!.map((row, index) => [row[0], `C${startRowIndex! + 2 + index}`]);
    }

    public async updateSheet(updatedStockPrices: { [symbol: string]: { cell: string; price: number; }; }): Promise<void> {
        for (const symbol of Object.keys(updatedStockPrices)) {
            const symbolData = updatedStockPrices[symbol];
            
            await this.sheets.spreadsheets.values.update({
                auth: this.oAuth2Client,
                spreadsheetId: this.googleSheetId,
                range: symbolData.cell,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[symbolData.price]]
                }
            });
        }
    }
}