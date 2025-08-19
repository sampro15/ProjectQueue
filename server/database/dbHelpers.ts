import path from 'path'

export type AsyncFunction = (...args: any[]) => Promise<any>;

export async function withRetry<T>(asyncFn: AsyncFunction, args: any[], retries: number = 5, interval: number = 100): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const result = await asyncFn(...args);
            return result;
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed:`, error);
            if (attempt < retries - 1) {
                console.log(`Retrying in ${interval}ms...`);
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
    }
    console.error(`Failed to complete operation after ${retries} attempts`);
    throw new Error(`Failed to complete operation after ${retries} attempts`);
}

export function AbsPath(rel_path: string) {
    if (process.env.DEBUG === '0') {
        return path.join(process.cwd(), 'services/NewProjectQueue/server', rel_path);
    }
    else {
        return path.join(__dirname, '..', rel_path);
    }
}
