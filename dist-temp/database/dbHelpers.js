"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
exports.AbsPath = AbsPath;
const path_1 = __importDefault(require("path"));
async function withRetry(asyncFn, args, retries = 5, interval = 100) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const result = await asyncFn(...args);
            return result;
        }
        catch (error) {
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
function AbsPath(rel_path) {
    if (process.env.DEBUG === '0') {
        return path_1.default.join(process.cwd(), 'services/NewProjectQueue/server', rel_path);
    }
    else {
        return path_1.default.join(__dirname, '..', rel_path);
    }
}
