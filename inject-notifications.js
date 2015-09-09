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
    if (window.__hipchatBootstrapConfiged__) {
        return;
    }

    window.__hipchatBootstrapConfiged__ = true;

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
    function notify(opts) {
        return send({
            type: 'notification',
            title: opts.title,
            message: opts.body
        });
    }

    window.addEventListener('message', onMessage);

    /////////////////////////////////////////
    // Overload the Notification object
    /////////////////////////////////////////
    var OriginalNotification = window.Notification;
    
    var NewNotification = function(title, options) {
        options = options || {};
        
        var id = (Math.floor(Math.random() * 9007199254740992) + 1).toString();
        
        console.log('notification: ' + title, options);
        
        Object.defineProperties(this, {
            'title': {
                value: title,
                writable: false,
                enumerable: true
            },
            'dir': {
                value: options.dir || 'auto', // ltr or rtl
                writable: false,
                enumerable: true
            },
            'lang': {
                value: options.lang || 'en-US',
                writable: false,
                enumerable: true
            },
            'body': {
                value: options.body || '',
                writable: false,
                enumerable: true
            },
            'tag': {
                value: options.tag || id,
                writable: false,
                enumerable: true
            },
            'icon': {
                value: options.icon || undefined,
                writable: false,
                enumerable: true
            },
            'data': {
                value: options.data || undefined,
                writable: false,
                enumerable: true
            },
            'silent': {
                value: options.silent || false,
                writable: false,
                enumerable: true
            },
        });
        
        notify({
            title: title,
            message: options.body
        });
    };
    
    // static methods
    NewNotification.permission = 'granted';
    NewNotification.requestPermission = function requestPermission(callback) {
        setTimeout(function(){
            callback(NewNotification.permission);
        }, 0);
    };
    
    // instance methods
    NewNotification.prototype.close = function close() { };
    NewNotification.prototype.onclick = function onclick() { };
    NewNotification.prototype.onerror = function onerror() { };
    
} + '();';

// inject the script into the webview document
(document.head || document.documentElement).appendChild(script);
