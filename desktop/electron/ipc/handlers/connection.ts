import { ipcMain } from 'electron';
import { ChildProcess } from 'child_process';

let rustProcess: ChildProcess | null = null;
let serverRunning = false;
let serverPort = 0;

export function registerConnectionHandlers() {
  ipcMain.handle('connection:start', async (_event, port: number) => {
    if (serverRunning) {
      return { success: false, error: 'Server already running' };
    }

    const portNum = port || 8765;

    try {
      // TODO: Uncomment when Rust server is built
      // const serverPath = path.join(__dirname, '../../target/release/aitmeow-server.exe');
      // const { spawn } = await import('child_process');
      // rustProcess = spawn(serverPath, ['--port', String(portNum)], {
      //   stdio: ['pipe', 'pipe', 'pipe'],
      // });
      //
      // rustProcess.stdout?.on('data', (data: Buffer) => {
      //   const message = data.toString();
      //   if (message.includes('Server started')) {
      //     serverRunning = true;
      //     serverPort = portNum;
      //   }
      // });
      //
      // rustProcess.on('exit', (code) => {
      //   serverRunning = false;
      //   serverPort = 0;
      //   rustProcess = null;
      // });

      serverRunning = true;
      serverPort = portNum;

      return { success: true, port: portNum };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('connection:stop', async () => {
    if (!serverRunning) {
      return { success: false, error: 'Server not running' };
    }

    try {
      if (rustProcess) {
        rustProcess.kill();
        rustProcess = null;
      }
      serverRunning = false;
      serverPort = 0;
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle('connection:status', async () => {
    return {
      running: serverRunning,
      port: serverPort,
    };
  });
}
