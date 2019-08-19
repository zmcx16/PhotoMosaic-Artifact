/* eslint-disable no-console */
'use strict';

// module
const path = require('path');
const os = require('os');
const fs = require('fs');
const electron = require('electron');
const app = electron.app;
const Menu = electron.Menu;
const BrowserWindow = electron.BrowserWindow;
const ipc = electron.ipcMain;
const app_path = app.getAppPath();
const platform = os.platform();

const child_process = require('child_process');
const detect_port = require('detect-port');

let appIcon = null;
let mainWindow = null;

let port = '';
let core_proc = null;

var root_path = '';

const menu_template = [
  {
    label: 'Menu',
    submenu: [
      { 
        label: 'About PhotoMosaic-Artifact',
        click: () => {}
      },
      {
        label: 'Debug Console',
        click: () => { 
          if (mainWindow != null && mainWindow.isFocused())
            mainWindow.webContents.openDevTools();
        }
      },
      { 
        label: 'Quit',
        click: () => { quitAll(); }
      }
    ]
  }
]

// app register
app.on('ready', () => {

  const menu = Menu.buildFromTemplate(menu_template)
  Menu.setApplicationMenu(menu)

  // OnStart
  if (app_path.indexOf('default_app.asar') != -1)  //dev mode
    root_path = path.resolve(path.dirname(app_path), '..', '..', '..', '..');
  else  //binary mode
    root_path = path.resolve(path.dirname(app_path), '..');

  // render process
  mainWindow = new BrowserWindow({

    icon: path.join(__dirname, 'PhotoMosaic-Artifact.png'),
    webPreferences: {
      nodeIntegration: true
    },
    width: 960, height: 600
    //,minWidth: 640, minHeight: 480
    //,maxWidth: 1024, maxHeight: 768
    });

    mainWindow.loadURL(`file://${__dirname}/index.html`);
    mainWindow.webContents.on('dom-ready', () => {
  });

  // core process
  let port_candidate = '7777';
  detect_port(port_candidate, (err, _port) => {
    if (err) {
      console.log(err);
    }

    if (port_candidate == _port) {
      console.log(`port: ${port_candidate} was not occupied`);
      port = port_candidate;
    } else {
      console.log(`port: ${port_candidate} was occupied, try port: ${_port}`);
      port = _port;
    }

    console.log('dir path:' + __dirname);
    console.log('platform:' + platform);
    let script = path.join(path.resolve(__dirname, '..', '..'), 'core', 'src', 'photomosaic-core.py');
    if (!fs.existsSync(script)) {
      if (platform == 'win32') {
        script = path.join(__dirname, 'core-win', 'photomosaic-core.exe');
      }else if(platform == 'darwin'){
        script = path.join(__dirname, 'core-mac', 'photomosaic-core');
      } else if (platform == 'linux'){
        script = path.join(__dirname, 'core-linux', 'photomosaic-core');
      } 
      console.log(script);
      core_proc = child_process.execFile(script, ['-port', port]);

    }else{
      core_proc = child_process.spawn('python', [script, '-port', port]);
    }
  });
});

app.on('will-quit', () => {
  console.log('kill core process');
  core_proc.kill();
  core_proc = null;
});

// ipc register
ipc.on('getPort', (event) => {
  event.sender.send('getPort_callback', port);
});

ipc.on('getPortSync', (event) => {
  console.log('get port: ' + port);
  event.returnValue = port;
});

function quitAll(){
  app.quit();
  app.exit(0);
}
