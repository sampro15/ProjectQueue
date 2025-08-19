import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PhotoMeshManager {
  /**
   * Checks if a process is running by name
   */
  private static async isProcessRunning(processName: string): Promise<boolean> {
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
    } catch (error) {
      console.error('Error checking process status:', error);
      return false;
    }
  }

  /**
   * Attempts to start the PhotoMesh executable
   */
  private static async startPhotoMeshProcess(): Promise<void> {
    try {
      const isRunning = await this.isProcessRunning('PhotoMesh.exe');
      
      if (isRunning) {
        console.log('PhotoMesh.exe is already running');
        return;
      }

      // Check if PhotoMesh.exe exists in the expected location
      const exePath = path.join(
        path.dirname(process.argv0),
        '../../../PhotoMesh.exe'
      );
      
      try {
        await fs.access(exePath);
      } catch {
        console.log('PhotoMesh.exe not found at expected location:', exePath);
        return;
      }

      console.log('- PhotoMesh Automation will now try to start PhotoMesh.exe.');
      
      const subprocess = spawn('PhotoMesh.exe', [], {
        cwd: path.join(path.dirname(process.argv0), '..'),
        detached: true,
        stdio: 'ignore',
      });

      subprocess.on('error', (err) => {
        console.log('Failed to start subprocess.', err.message);
      });

      subprocess.unref();

    } catch (error) {
      console.error('Cannot run PhotoMesh Manager:', error);
    }
  }

  /**
   * Tries to launch PhotoMesh.exe when automation starts
   */
  public static async tryLaunchPhotoMeshExeUponAutomationStartup(): Promise<void> {
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
    } catch (error) {
      console.error('Error launching PhotoMesh:', error);
    }
  }

  /**
   * Starts the PhotoMesh manager - can be called externally
   */
  public static async startManager(): Promise<void> {
    await this.startPhotoMeshProcess();
  }
} 