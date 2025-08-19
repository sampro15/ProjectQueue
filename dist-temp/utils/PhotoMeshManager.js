"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhotoMeshManager = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class PhotoMeshManager {
    /**
     * Checks if a process is running by name
     */
    static async isProcessRunning(processName) {
        try {
            const platform = process.platform;
            let cmd = '';
            switch (platform) {
                case 'win32':
                    cmd = 'tasklist';
                    break;
                case 'darwin':
                    cmd = `ps -ax | grep ${processName}`;
                    break;
                case 'linux':
                    cmd = 'ps -A';
                    break;
                default:
                    throw new Error(`Unsupported platform: ${platform}`);
            }
            const { stdout } = await execAsync(cmd);
            return stdout.toLowerCase().includes(processName.toLowerCase());
        }
        catch (error) {
            console.error('Error checking process status:', error);
            return false;
        }
    }
    /**
     * Attempts to start the PhotoMesh executable
     */
    static async startPhotoMeshProcess() {
        try {
            const isRunning = await this.isProcessRunning('PhotoMesh.exe');
            if (isRunning) {
                console.log('PhotoMesh.exe is already running');
                return;
            }
            // Check if PhotoMesh.exe exists in the expected location
            const exePath = path_1.default.join(path_1.default.dirname(process.argv0), '../../../PhotoMesh.exe');
            try {
                await promises_1.default.access(exePath);
            }
            catch {
                console.log('PhotoMesh.exe not found at expected location:', exePath);
                return;
            }
            console.log('- PhotoMesh Automation will now try to start PhotoMesh.exe.');
            const subprocess = (0, child_process_1.spawn)('PhotoMesh.exe', [], {
                cwd: path_1.default.join(path_1.default.dirname(process.argv0), '..'),
                detached: true,
                stdio: 'ignore',
            });
            subprocess.on('error', (err) => {
                console.log('Failed to start subprocess.', err.message);
            });
            subprocess.unref();
        }
        catch (error) {
            console.error('Cannot run PhotoMesh Manager:', error);
        }
    }
    /**
     * Tries to launch PhotoMesh.exe when automation starts
     */
    static async tryLaunchPhotoMeshExeUponAutomationStartup() {
        if (process.platform !== 'win32') {
            return;
        }
        try {
            const isRunning = await this.isProcessRunning('PhotoMesh.exe');
            if (!isRunning) {
                console.log('- PhotoMesh Automation cannot detect PhotoMesh.exe currently running.');
                // Wait 5 seconds before attempting to start
                await new Promise(resolve => setTimeout(resolve, 5000));
                await this.startPhotoMeshProcess();
            }
        }
        catch (error) {
            console.error('Error launching PhotoMesh:', error);
        }
    }
    /**
     * Starts the PhotoMesh manager - can be called externally
     */
    static async startManager() {
        await this.startPhotoMeshProcess();
    }
}
exports.PhotoMeshManager = PhotoMeshManager;
