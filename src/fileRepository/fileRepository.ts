import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";


export class FileRepository {
    private readonly cacheDir: string;

    constructor(cacheDir: string) {
        this.cacheDir = cacheDir;
    }

    public async getAllCachedResponses(): Promise<string[] | null> {
        const todayIso = format(new Date(), "yyyy-MM-dd", { in: tz("America/New_York") });
        const result: string[] = [];

        const todayDir = path.join(this.cacheDir, todayIso);

        if (!fs.existsSync(todayDir)) {
            return null;
        }

        const allFiles = fs.readdirSync(todayDir).map(fileName => path.join(todayDir, fileName));
        for (const file of allFiles) {
            const fileContents = await fs.promises.readFile(file);
            result.push(fileContents.toString());
        }

        return result;
    }

    public async writeResponseFile(symbol: string, datetime: string, jsonStr: string): Promise<void> {
        const dir = path.join(this.cacheDir, datetime);
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }

        const filePath = path.join(dir, `${symbol}.json`);
        await fs.promises.writeFile(filePath, jsonStr);
    }
}