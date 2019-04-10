'use strict';

const path = require('path');
const { BrowserWindow } = require('electron');

const Common = require('../../common');

class BroadCastWindow {
    constructor() {
        this.broadcastWindow = null;
        this.createBroadcastWindow();
    }

    createBroadcastWindow() {
        this.broadcastWindow = new BrowserWindow({
            width: Common.WINDOW_SIZE_BROADCAST.width,
            height: Common.WINDOW_SIZE_BROADCAST.height*0.9,
            resizable: false,
            fullscreenable: false,
            show: false,
            frame: true,
            alwaysOnTop: true,
            titleBarStyle: 'hidden',
        }); //  icon: 'assets/icon.png',

        this.initWindowEvents();
        this.initBroadcastWindowShortcut();

        this.broadcastWindow.loadURL(`file://${path.join(__dirname, '/../views/broadcastWindow.html')}`);
    }

    initWindowEvents() {
        this.broadcastWindow.on('close', () => {
            this.unregisterLocalShortCut();
            this.broadcastWindow = null;
            this.isShown = false;
        });
        this.broadcastWindow.once('ready-to-show', () => {
            this.broadcastWindow.show();
        });
    }

    show() {
        if (!this.broadcastWindow) {
            this.createSettingsWindow();
        }
        this.broadcastWindow.show();
        this.isShown = true;
    }

    hide() {
        this.broadcastWindow.hide();
        this.isShown = false;
    }

    registerLocalShortcut() {
        electronLocalShortcut.register(this.broadcastWindow, 'Esc', () => {
            this.broadcastWindow.close();
        });
    }

    unregisterLocalShortCut() {
        electronLocalShortcut.unregisterAll(this.broadcastWindow);
    }

    initSettingsWindowShortcut() {
        this.registerLocalShortcut();
    }
}