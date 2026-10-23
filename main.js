const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

const SHELLS = {
  win32: [
    { id: 'powershell', name: 'PowerShell', cmd: 'powershell.exe', args: ['-NoLogo', '-NoProfile', '-Command', '-'] },
    { id: 'cmd', name: 'Command Prompt', cmd: 'cmd.exe', args: [] }
  ],
  darwin: [
    { id: 'zsh', name: 'Terminal (zsh)', cmd: '/bin/zsh', args: [] },
    { id: 'bash', name: 'bash', cmd: '/bin/bash', args: [] },
    { id: 'sh', name: 'sh', cmd: '/bin/sh', args: [] }
  ],
  linux: [
    { id: 'bash', name: 'bash', cmd: '/bin/bash', args: [] },
    { id: 'sh', name: 'sh', cmd: '/bin/sh', args: [] },
    { id: 'zsh', name: 'zsh', cmd: '/bin/zsh', args: [] }
  ]
};
const list = SHELLS[process.platform] || SHELLS.linux;
let proc = null;

function stopShell() {
  if (proc) {
    try { proc.kill(); } catch (e) {}
    proc = null;
  }
}

function startShell(win, id) {
  stopShell();
  const s = list.find(x => x.id === id) || list[0];
  const p = spawn(s.cmd, s.args, { cwd: app.getPath('home'), env: process.env });
  proc = p;
  const send = t => { if (!win.isDestroyed()) win.webContents.send('term:data', t); };
  p.stdout.on('data', d => send(d.toString()));
  p.stderr.on('data', d => send(d.toString()));
  p.on('error', e => send('Could not start ' + s.name + ': ' + e.message + '\n'));
  p.on('exit', () => { if (proc === p) { proc = null; send('\n[' + s.name + ' closed]\n'); } });
  return s.id;
}

ipcMain.handle('term:shells', () => list.map(({ id, name }) => ({ id, name })));
ipcMain.handle('term:start', (e, id) => startShell(BrowserWindow.fromWebContents(e.sender), id));
ipcMain.on('term:write', (e, text) => {
  if (proc && proc.stdin.writable && typeof text === 'string') proc.stdin.write(text);
});
ipcMain.on('open:azure', () => shell.openExternal('https://shell.azure.com'));

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('before-quit', stopShell);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
