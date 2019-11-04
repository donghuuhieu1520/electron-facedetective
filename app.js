const electron = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');
const dotenv = require('dotenv').config();
const request = require('request');

const detectFaceFromImage = exports.detectFaceFromImage = (path) => {
  return new Promise((resolve, reject) => {
    const params = {
      "returnFaceId": "true",
      "returnFaceLandmarks": "false",
      "returnFaceAttributes": "{string}",
      "recognitionModel": "recognition_01",
      "returnRecognitionModel": "false",
      "detectionModel": "detection_01",
    };
    const options = {
      url: process.env.API_ENDPOINT,
      method: 'POST',
      headers: {
        ['Content-Type']: 'application/json',
        ['Ocp-Apim-Subscription-Key']: process.env.API_KEY
      },
      data: fs.createReadStream(path),
      qs: params,
      json: true
    };
    request(options, (err, response, body) => {
      if (err) reject(err);
      resolve(body);
    });
  });
};

const { app, 
        BrowserWindow, 
        dialog, 
        Menu,
        globalShortcut,
        ipcMain,
      } = electron;

let mainWindow = null;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
    },
    show: false,
    autoHideMenuBar: true,
    frame: false,
  });

  mainWindow.loadURL(url.format({
    pathname: path.resolve(__dirname, 'GUI', 'main.html'),
    protocol: 'file:',
    slashes: true,
  }));

  const ctxMainWindow = Menu.buildFromTemplate([]);
  Menu.setApplicationMenu(ctxMainWindow);
  
  require('./lib/registerShortcut')(mainWindow);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    app.quit();
  });
  ipcMain.on('dialog:open', (event) => {
    const filePaths = dialog.showOpenDialogSync(mainWindow, {
      properties: ['openFile'],
      title: 'Select your image',
      filters: [
        { name: 'Images', extensions: ['jpg', 'png'] },
      ],
    });
    if (filePaths) {
      mainWindow.webContents.send('dialog:open:filepath', filePaths[0]);
    }
  });

  ipcMain.on('app:close', (event) => {
    app.quit();
  })
  ipcMain.on('app:minimize', (event) => {
    mainWindow.minimize()
  })

});

app.on('window-all-closed', () => {
  app.quit();
});

