const $ = require('jquery');
const electron = require('electron');
const path = require('path');
const snackbar = require('node-snackbar');
const dotenv = require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
});

const { ipcRenderer, remote } = electron;
const currentWindow = remote.getCurrentWindow();
const mainProcess = remote.require('./app');

const $buttonOpen = $('#button-open');
const $buttonCloseWindow = $('.button-control.close');
const $buttonMinimizeButton = $('.button-control.minimize');
const $buttonBack = $('#btn-back');
const $sectionDrop = $('.wrapper');
const $sectionOpen = $('.canvas-wrapper');
const $canvas = document.getElementById('canvas');


const updateTitleBar = (filePath) => {
  let title = 'Face Detector';
  if (filePath) {
    title = path.basename(filePath);  
  }
  currentWindow.setTitle(title);
  const ellipsisTitle = title.length > 35 ? title.substr(0, 36) + '...' : title;
  $('.window-bar .title span').text(ellipsisTitle);
}

function processImage(data, ctx, imgInCanvasInfo) {
  const faceResult = data;
  if (faceResult.length === 0) {
    snackbar.show({
      text: 'Could not detect any faces.',
      pos: 'bottom-center',
    });
    return;
  }
  const colors = ['#e74c3c', '#e67e22', '#27ae60', '#8e44ad', 
                  '#16a085', '#fd79a8', '#0984e3', '#f39c12'];
  for (let i = 0; i < faceResult.length; i++) {
    console.log(faceResult[i].faceRectangle);
    drawRectangle(ctx, imgInCanvasInfo, faceResult[i].faceRectangle.top,
                               faceResult[i].faceRectangle.left,
                               faceResult[i].faceRectangle.width,
                               faceResult[i].faceRectangle.height,
      colors[(i + 1) * Math.ceil(Math.random() * colors.length) % colors.length]
    );
  }
};

const drawRectangle = (ctx, imageInCanvasInfo, top, left, width, height, color) => {
  ctx.beginPath();
  ctx.lineWidth = '4';
  ctx.strokeStyle = color;
  ctx.rect(left * imageInCanvasInfo.ratio + imageInCanvasInfo.x, 
           top * imageInCanvasInfo.ratio + imageInCanvasInfo.y, 
           width * imageInCanvasInfo.ratio, height * imageInCanvasInfo.ratio);
  ctx.stroke();
}

const drawImageScaled = (img, ctx) => {
  const canvas = ctx.canvas;
  let ratio;
  if (canvas.width > img.width && canvas.height > img.height) {
    ratio = 1;
  } else {
    const hRatio = canvas.width / img.width;
    const vRatio =  canvas.height / img.height;
    ratio  = Math.min(hRatio, vRatio); 
  }
  const centerShift_x = (canvas.width - img.width * ratio) / 2;
  const centerShift_y = (canvas.height - img.height * ratio) / 2;  
  ctx.drawImage(img, 0, 0, img.width, img.height,
                     centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
  return {
    x: centerShift_x,
    y: centerShift_y,
    ratio: ratio,
  };
}

const openFile = async (filePath) => {
  $('.icon-loading').show();
  updateTitleBar(filePath);

  const ctx = $canvas.getContext('2d');
  const img = new Image();
  img.addEventListener('load', () => {
    $('.icon-loading').hide();
    const imgInCanvasInfo = drawImageScaled(img, ctx);
    snackbar.show({
      text: 'Uploading image...',
      pos: 'bottom-center',
    });
    try {
      let faceInfo = await mainProcess.detectFaceFromImage(filePath);
      processImage(faceInfo, ctx, imgInCanvasInfo);
    } catch (e) {
      snackbar.show({
        text: 'Unexpected error while uploading image!',
        pos: 'bottom-center',
      });
    }
  });
  img.src = filePath;
};

document.addEventListener('dragstart', event => event.preventDefault());
document.addEventListener('dragover', event => event.preventDefault());
document.addEventListener('dragleave', event => event.preventDefault());
document.addEventListener('drop', event => event.preventDefault());

$sectionDrop.on('dragover', (event) => {
  const file = event.originalEvent.dataTransfer.items[0];
  if (['image/jpg', 'image/png', 'image/jpeg'].includes(file.type)) {
    $sectionDrop.addClass('drag-over');
  } else {
    $sectionDrop.addClass('drag-error');
  }
});

$sectionDrop.on('dragleave', (event) => {
  $sectionDrop.removeClass('drag-over');
  $sectionDrop.removeClass('drag-error');
});

$sectionDrop.on('drop', (event) => {
  const fileType = event.originalEvent.dataTransfer.items[0].type;
  if (['image/jpg', 'image/png', 'image/jpeg'].includes(fileType)) {
    const file = event.originalEvent.dataTransfer.files[0];
    $sectionDrop.hide();
    openFile(file.path);
    $sectionOpen.show();
  }
  $sectionDrop.removeClass('drag-over');
  $sectionDrop.removeClass('drag-error');
});

$buttonOpen.on('click', () => {
  ipcRenderer.send('dialog:open');
});

$buttonCloseWindow.on('click', () => {
  ipcRenderer.send('app:close');
});

$buttonMinimizeButton.on('click', () => {
  ipcRenderer.send('app:minimize');
});

$buttonBack.on('click', (event) => {
  $sectionOpen.hide();
  const ctx = $canvas.getContext('2d');
  ctx.clearRect(0, 0, $canvas.width, $canvas.height);
  $sectionDrop.show();
  updateTitleBar();
});

ipcRenderer.on('dialog:open:filepath', (event, filePath) => {
  $sectionDrop.hide();
  openFile(filePath);
  $sectionOpen.show();
});
