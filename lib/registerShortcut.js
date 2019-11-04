const gs = require('electron').globalShortcut;

const gsWrapper = (window) => {
  gs.register('CommandOrControl+R', () => {
    window.webContents.reload();
  });
  gs.register('CommandOrControl+Shift+I', () => {
    window.webContents.openDevTools();
  });
};

module.exports = gsWrapper;
