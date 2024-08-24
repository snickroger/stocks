import fs from "node:fs";
import path from "node:path";
import { env } from "node:process";

export class FileRepository {
    private readonly cacheDir: string;

    constructor() {
        this.cacheDir = env.CACHE_DIR!;
    }

    public async getAllCachedResponses(): Promise<string[] | null> {
        const yesterday = new Date();
        const result: string[] = [];

        yesterday.setDate(yesterday.getDate() - 1);

        const todayIso = new Date().toISOString().slice(0, 10);
        const yesterdayIso = yesterday.toISOString().slice(0, 10);

        const todayDir = path.join(this.cacheDir, todayIso);
        const yesterdayDir = path.join(this.cacheDir, yesterdayIso);

        let dirToUse: string;

        if (fs.existsSync(todayDir)) {
            dirToUse = todayDir;
        } else if (fs.existsSync(yesterdayDir)) {
            dirToUse = yesterdayDir;
        } else {
            return null;
        }

        const allFiles = fs.readdirSync(dirToUse).map(fileName => path.join(dirToUse, fileName));
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