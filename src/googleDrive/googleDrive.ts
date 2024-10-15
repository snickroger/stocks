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

        //const { startRowIndex, endRowIndex } = sheet.data.sheets![0].bandedRanges![0].range!;

        const startRowIndex = 0;
        const endRowIndex = 20;
        const sheetDataResponse = await this.sheets.spreadsheets.values.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            range: `A${startRowIndex! + 2}:A${endRowIndex!}`,
        });

        return sheetDataResponse.data.values!.map((row, index) => [row[0], `C${startRowIndex! + 2 + index}`]);
    }

    public async updateSheet(updatedStockPrices: Record<string, { cell: string; price: number; }>): Promise<void> {
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

    public async updateGrowthSheet(): Promise<void> {
        const growthSheetId = 932737694; // TODO move to variables
        const today = new Date(); // TODO add date library
        const todayStr = `${today.getMonth()+1}/${today.getDate()-1}/${today.getFullYear()}`;

        // get the unformatted total for today from the main sheet

        const sheetDataResponse = await this.sheets.spreadsheets.values.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            range: 'H5',
            valueRenderOption: 'UNFORMATTED_VALUE'
        });

        const todaysTotal = sheetDataResponse.data.values![0][0];

        // insert a blank row to the growth sheet

        await this.sheets.spreadsheets.batchUpdate({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            requestBody: {
                requests: [
                    {
                        insertDimension: {
                            range: {
                                sheetId: growthSheetId,
                                dimension: 'ROWS',
                                startIndex: 1,
                                endIndex: 2
                            },
                            inheritFromBefore: true
                        }
                    }
                ]
            }
        });

        // write the total to the growth sheet

        await this.sheets.spreadsheets.values.update({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            range: 'Total Growth!A2:D2',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[todayStr, todaysTotal, '=IF(B3>0,B2-B3,"")', '=IF(B3>0,(B2-B3)/ABS(B3),"")']]
            }
        });
    }
}
