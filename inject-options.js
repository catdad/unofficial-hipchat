/* jshint browser: true */
/* global chrome */

/* jshint browser: true, devel: true */

// For some reason, a Chrome Packaged App, using executeScript, 
// cannot access or make changes to the window object in the 
// guest webview. However, it can inject another script into
// the webview document, in which case, that script will be 
// treated like native code, instead of code specifically
// injected by the app. So... let's see how much we can 
// exploit that.

var script = document.createElement('script');
script.textContent = '!' + function() {
    
    /////////////////////////////////////////
    // This file should only be executed once
    /////////////////////////////////////////

    // this is particularly an issue when the user has to sign in
    // before starting to use the app
    if (window.__hipchatNotificationBootstrap__) {
        return;
    }

    window.__hipchatNotificationBootstrap__ = true;
    
    console.log('EMBEDDING NOTIFICATION');

    /////////////////////////////////////////
    // Register messaging with the parent
    /////////////////////////////////////////
    var appWindow, appOrigin;

    // catch messages from the parent
    function onMessage(e) {
        if (!appWindow || !appOrigin) {
            appWindow = e.source;
            appOrigin = e.origin;
        }
    }

    // send messages to the parent
    // since this is Chrome, we can use JSON objects
    function send(data) {
        if (appWindow && appOrigin) {
            appWindow.postMessage(data, appOrigin);
        }
    }
    
    // create a dedicated notify method
    function changeOpts(opts) {
        return send({
            type: 'options',
            options: opts
        });
    }

    window.addEventListener('message', onMessage);
    
    var retryInject = 0;
    
    function injectOptionsUI(retry) {
        var elem = document.querySelector('nav .aui-header-secondary ul.aui-nav');
        if (!elem && retryInject < 500) {
            retryInject += 1;
            setTimeout(injectOptionsUI, 100);
        }
        
        var button = document.createElement('button');
        button.innerHTML = 'Options';
        
        elem.appendChild(button);
        
        console.log('OPTIONS EMBEDDED');
    }
    
    if (document.readyState === 'complete') {
        injectOptionsUI();
    } else {
        document.addEventListener('DOMContentLoaded', injectOptionsUI);
    }
    
} + '();';

// inject the script into the webview document
(document.head || document.documentElement).appendChild(script);














//
//// Saves options to chrome.storage
//function saveOptions() {
//    var formatting = document.getElementById('uh-formatting').checked;
//    
//    chrome.storage.sync.set({
//        experimentalFormatting: !!formatting
//    }, function () {
//        console.log('saved');
//    });
//}
//
//// Restores select box and checkbox state using the preferences
//// stored in chrome.storage.
//function restoreOptions() {
//    // Use default value:
//    // experimentalFormatting = false
//    
//    chrome.storage.sync.get({
//        experimentalFormatting: false
//    }, function (items) {
//        document.getElementById('uh-formatting').checked = items.experimentalFormatting;
//    });
//}
//
//document.addEventListener('DOMContentLoaded', restoreOptions);
//document.getElementById('save').addEventListener('click', saveOptions);
