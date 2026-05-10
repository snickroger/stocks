import { env } from "node:process";

export interface GoogleConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    sheetId: string;
    holdingsSheetIndex: number;
    growthSheetIndex: number;
}

export interface Config {
    google: GoogleConfig;
    twelveDataApiKey: string;
    cacheDir: string;
}

function required(name: string): string {
    const value = env[name];
    if (value === undefined || value === "") {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
}

function requiredInt(name: string): number {
    const raw = required(name);
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be an integer (got ${JSON.stringify(raw)})`);
    }
    return parsed;
}

export function loadConfig(): Config {
    return {
        google: {
            clientId: required("GOOGLE_CLIENTID"),
            clientSecret: required("GOOGLE_CLIENTSECRET"),
            refreshToken: required("GOOGLE_REFRESHTOKEN"),
            sheetId: required("GOOGLE_SHEETID"),
            holdingsSheetIndex: requiredInt("HOLDINGS_SHEET_INDEX"),
            growthSheetIndex: requiredInt("GROWTH_SHEET_INDEX"),
        },
        twelveDataApiKey: required("TWELVEDATA_APIKEY"),
        cacheDir: required("CACHE_DIR"),
    };
}
