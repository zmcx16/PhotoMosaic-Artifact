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
const image_sizeOf = require('image-size');

const child_process = require('child_process');
const detect_port = require('detect-port');

let mainWindow = null;
let aboutWindow = null;

let port = -1;
let core_proc = null;

var root_path = '';

const menu_template = [
  {
    label: 'Menu',
    submenu: [
      { 
        label: 'About PhotoMosaic-Artifact',
        click: () => {
          if (!aboutWindow) {
            console.log('open about Window');
            aboutWindow = new BrowserWindow({
              icon: path.join(__dirname, 'PhotoMosaic-Artifact.png'),
              webPreferences: {
                nodeIntegration: true
              },
              width: 640, height: 320
            });

            aboutWindow.loadURL(`file://${__dirname}/about.html`);
            aboutWindow.on('closed', () => {
              aboutWindow = null
            })
            aboutWindow.removeMenu()
          }
        }
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
    width: 1024, height: 600
    //,minWidth: 640, minHeight: 480
    //,maxWidth: 1024, maxHeight: 768
    });

    mainWindow.loadURL(`file://${__dirname}/index.html`);
    mainWindow.webContents.on('dom-ready', () => {
  });

  // core process
  let port_candidate = 7777;
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
  });
  
});

app.on('will-quit', () => {
  killCore();
});

// ipc register
ipc.on('getPort', (event) => {
  event.sender.send('getPort_callback', port);
});

ipc.on('getPortSync', (event) => {
  console.log('get port: ' + port);
  event.returnValue = port;
});

ipc.on('exeCore', (event, args) => {

  args['port'] = port.toString();
  args['root_path'] = root_path;

  console.log('dir path:' + __dirname);
  console.log('platform:' + platform);
  let script = path.join(path.resolve(__dirname, '..', '..'), 'core', 'src', 'photomosaic-core.py');
  if (!fs.existsSync(script)) {
    if (platform == 'win32') {
      script = path.join(__dirname, 'core-win', 'photomosaic-core.exe');
    } else if (platform == 'darwin') {
      script = path.join(__dirname, 'core-mac', 'photomosaic-core');
    } else if (platform == 'linux') {
      script = path.join(__dirname, 'core-linux', 'photomosaic-core');
    }
    //console.log(script);
    core_proc = child_process.execFile(script, ['-tool-args', JSON.stringify(args)]);

  } else {
    //console.log(args);
    core_proc = child_process.spawn('python', [script, '-tool-args', JSON.stringify(args)]);
  }
});

ipc.on('killCore', () => {
  killCore();
});

ipc.on('navExec', (event, target) => {
  if (platform == 'win32') {
    child_process.execSync('start ' + target);
  } else if (platform == 'darwin') {
    child_process.execSync('open ' + target);
  } else if (platform == 'linux') {
    child_process.execSync('xdg-open ' + target);
  }
});

ipc.on('openDialog', (event, arg) => {
  const { dialog } = require('electron');
  event.returnValue = dialog.showOpenDialog(mainWindow, {
    properties: arg['properties'],
    filters: arg['filters']
  });
});

ipc.on('getImageSize', (event, file_path) => {

  if (file_path.length > 0){
    image_sizeOf(file_path[0], function (err, dimensions) {
      event.sender.send('getImageSize_callback', dimensions);
    });
  }
});

ipc.on('getImagesAndVideosInfo', (event, isFolder) => {

  const { dialog } = require('electron');
  const images_filter_list = ['png', 'bmp', 'jpg', 'gif'];
  const videos_filter_list = ['mp4', 'mkv', 'mpg', 'avi'];
  const filter_list = images_filter_list.concat(videos_filter_list);
  
  var material_list = [];
  if (isFolder){
    var foldlist = dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'multiSelections']
    });

    if (foldlist){
      var filelist_temp = [];
      foldlist.forEach(function (item) {
        walkSync(item, filelist_temp);
      });

      var images_cnt = 0, videos_cnt = 0;
      filelist_temp.forEach(function (file_path) {
        if (type_check(file_path, images_filter_list))
          images_cnt++;
        else if (type_check(file_path, videos_filter_list))
          videos_cnt++;
      });

      foldlist.forEach(function (fold_path) {
        material_list.push({ 'path': fold_path, 'size': 0, 'type': 'folder', 'images_cnt': images_cnt, 'videos_cnt': videos_cnt });
      });
    }

  }else{
    var filelist = dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Image / Video', extensions: filter_list }]
    });

    if (filelist) {
      filelist.forEach(function (file_path) {
        const stats = fs.statSync(file_path);
        var type = '';
        if (type_check(file_path, images_filter_list)){
          type = 'image';
        }
        else if (type_check(file_path, videos_filter_list)){
          type = 'video';
        }
        material_list.push({ 'path': file_path, 'size': stats.size, 'type': type, 'images_cnt': type == 'image' ? 1 : 0, 'videos_cnt': type == 'video' ? 1 : 0 });
      });
    }
  }

  event.returnValue = material_list;
  
});

function quitAll(){
  app.quit();
  app.exit(0);
}

function killCore(){
  console.log('kill core process');
  if (core_proc)
    core_proc.kill();
  core_proc = null;
}

// common function
function walkSync(dir, filelist) {
  var path = path || require('path');
  var fs = fs || require('fs'), files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
}

function type_check(file_path, filter){

  var ret = false;
  filter.some(function (ext) {
    if (file_path.toLowerCase().indexOf(ext.toLowerCase()) == file_path.length - ext.length) {
      ret = true;
      return true;
    } else {
      return false;
    }
  });

  return ret;
}