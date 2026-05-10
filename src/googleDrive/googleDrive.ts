import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { OAuth2Client } from "google-auth-library";
import { google, sheets_v4 } from "googleapis";
import { GoogleConfig } from "../config.js";

export class GoogleDrive {
    private readonly sheets: sheets_v4.Sheets;

    private readonly oAuth2Client: OAuth2Client;

    private readonly googleSheetId: string;

    private readonly holdingsSheetIndex: number;

    private readonly growthSheetIndex: number;

    constructor(config: GoogleConfig) {
        this.sheets = google.sheets('v4');
        this.googleSheetId = config.sheetId;
        this.holdingsSheetIndex = config.holdingsSheetIndex;
        this.growthSheetIndex = config.growthSheetIndex;

        this.oAuth2Client = new OAuth2Client(config.clientId, config.clientSecret);
        this.oAuth2Client.setCredentials({ refresh_token: config.refreshToken });
    }

    public async getAllStockSymbols(): Promise<[symbol: string, cell: string][]> {
        const sheet = await this.sheets.spreadsheets.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId
        });

        const holdingsSheet = sheet.data.sheets![this.holdingsSheetIndex];
        const { startRowIndex, endRowIndex } = holdingsSheet.bandedRanges![0].range!;
        const holdingsSheetName = holdingsSheet.properties?.title;

        const sheetDataResponse = await this.sheets.spreadsheets.values.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            range: `${holdingsSheetName}!A${startRowIndex! + 2}:A${endRowIndex!}`,
        });

        return sheetDataResponse.data.values!.map((row, index) => [row[0], `C${startRowIndex! + 2 + index}`]);
    }

    public async updateSheet(updatedStockPrices: Record<string, { cell: string; price: number; }>): Promise<void> {
        const sheet = await this.sheets.spreadsheets.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId
        });

        const holdingsSheet = sheet.data.sheets![this.holdingsSheetIndex];
        const holdingsSheetName = holdingsSheet.properties?.title;

        for (const symbol of Object.keys(updatedStockPrices)) {
            const symbolData = updatedStockPrices[symbol];

            await this.sheets.spreadsheets.values.update({
                auth: this.oAuth2Client,
                spreadsheetId: this.googleSheetId,
                range: `${holdingsSheetName}!${symbolData.cell}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [[symbolData.price]]
                }
            });
        }
    }

    public async updateGrowthSheet(): Promise<void> {
        const today = new Date();
        const todayStr = format(today, 'M/dd/yyyy', { in: tz("America/New_York") })

        // get the spreadsheet data
        const sheet = await this.sheets.spreadsheets.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId
        });

        const holdingsSheet = sheet.data.sheets![this.holdingsSheetIndex];
        const holdingsSheetName = holdingsSheet.properties?.title;

        const growthSheet = sheet.data.sheets![this.growthSheetIndex];
        const growthSheetId = growthSheet.properties?.sheetId;
        const growthSheetName = growthSheet.properties?.title;

        const endRowIndex = growthSheet.bandedRanges![0].range!.endRowIndex!;

        const conditionalFormat1 = growthSheet.conditionalFormats![0];
        conditionalFormat1.ranges![0].startRowIndex = 1;
        conditionalFormat1.ranges![0].endRowIndex = endRowIndex + 1;

        const conditionalFormat2 = growthSheet.conditionalFormats![1];
        conditionalFormat2.ranges![0].startRowIndex = 1;
        conditionalFormat2.ranges![0].endRowIndex = endRowIndex + 1;

        // get the unformatted total for today from the main sheet

        const sheetDataResponse = await this.sheets.spreadsheets.values.get({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            range: `${holdingsSheetName}!H5`,
            valueRenderOption: 'UNFORMATTED_VALUE'
        });

        const todaysTotal = sheetDataResponse.data.values![0][0];

        // insert a blank row to the growth sheet and update the conditional formatting ranges

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

        await this.sheets.spreadsheets.batchUpdate({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            requestBody: {
                requests: [
                    {
                        updateConditionalFormatRule: {
                            index: 0,
                            sheetId: growthSheetId,
                            rule: conditionalFormat1
                        }
                    },
                    {
                        updateConditionalFormatRule: {
                            index: 1,
                            sheetId: growthSheetId,
                            rule: conditionalFormat2
                        }
                    }
                ]
            }
        });

        // write the total to the growth sheet

        await this.sheets.spreadsheets.values.update({
            auth: this.oAuth2Client,
            spreadsheetId: this.googleSheetId,
            range: `${growthSheetName}!A2:D2`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[todayStr, todaysTotal, '=IF(B3>0,B2-B3,"")', '=IF(B3>0,(B2-B3)/ABS(B3),"")']]
            }
        });
    }
}
