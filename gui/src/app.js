/* eslint-disable no-console */

const electron = require('electron');
const ipc = electron.ipcRenderer;
const zerorpc = require("zerorpc");
var client = new zerorpc.Client();


// ipc register
ipc.on('getPort_callback', (event, port) => {

  client.connect("tcp://127.0.0.1:" + port);
  
  /*
  sendCmdToCore('genPhotoImage', 'arg1', (error, res) => {
    if (error) {
      console.error(error);
      console.error(res);
    } else {
      //update console
    }
  });
  */

  // task running

});


ipc.on('getCoreStatus', () => {
  //update UI
});

// OnStart
$(document).ready(function () {

  //call main run core

});

