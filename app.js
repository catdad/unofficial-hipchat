/* jshint browser: true, devel: true */
/* global chrome, analytics */

(function() {
    var wv = document.querySelector('webview');
    
    // always set partition first, as this can only be done before the first navigation
    if (wv && window.__webviewPartition__) {
        wv.setAttribute('partition', 'persist:' + window.__webviewPartition__);
    }
    
    // set the URL of the webview... this should always be defined
    if (wv && window.__webviewUrl__) {
        wv.setAttribute('src', window.__webviewUrl__);
    }
})();

window.onload = function() {
    var DEBUG_MODE = true;
//    var DEBUG_MODE = false;
    var STORED_DATA = window.__storedData__ || {};
    
    // some utils
    var $ = function(sel) {
		return document.querySelector(sel);
	};
    $.forEach = function(obj, cb, context){
        // check for a native forEach function
        var native = [].forEach,
            hasProp = Object.prototype.hasOwnProperty,
            callback = (typeof cb === 'function') ? cb : function noop() {};

        // if there is a native function, use it
        if (native && obj.forEach === native) {
            //don't bother if there is no function
            obj.forEach(callback, context);
        }
        // if the object is array-like
        else if (obj.length === +obj.length) {
            // loop though all values
            for (var i = 0, length = obj.length; i < length; i++) {
                // call the function with the context and native-like arguments
                callback.call(context, obj[i], i, obj);
            }
        }
        // it's an object, use the keys
        else {
            // loop through all keys
            for (var name in obj){
                // call the function with context and native-like arguments
                if (hasProp.call(obj, name)) {
                    callback.call(context, obj[name], name, obj);
                }
            }
        }
    };
    
    function sendAnalytics(category, action) {
        category = category || 'Default';
        action = action || 'default';
        
        if (window.tracker && window.tracker.sendEvent) {
            window.tracker.sendEvent(category, action);
        }
    }

    var webview = $('#chat');
    var appWindow = chrome.app.window.current();
    
    // keep track of messages that get notified
    var messageCount = (function() {
        var elem = $('title');
        var defaultText = 'HipChat';
        var count = 0;
        
        return function(val) {
            if (typeof val === 'number') {
                count = val || 0;
                return (elem.innerHTML = (count) ? '(' + count + ') - ' + defaultText : defaultText);
            }
            
            return count;
        };
    })();
    
    var shouldNotify = true;

    // generate the absolute URL for the content script
    var scripts = [
//        chrome.runtime.getURL('inject-options.js'),
        chrome.runtime.getURL('inject-notifications.js'),
//        chrome.runtime.getURL('inject-xhr.js')
    ];
    
    // simple get request
    var get = function(url, callback) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                // generate executable code
                callback(undefined, xmlHttp.responseText + '\n');
            }
        };
        xmlHttp.open("GET", url, true); // true for asynchronous
        xmlHttp.send(null);
    };
    
    // some vars to save the state
    var code = '';
    var scriptsCode = [];
    var scriptDone = false;
    var loadDone = false;
    
    // get the code from the content scrips as text,
    // and inject all of it... order doesn't matter here
    scripts.forEach(function(url) {
        get(url, function(err, content) {
            scriptsCode.push('!function(){\n ' +
                        content + '\n' +
                       '}(window); \n');
            
            if (scriptsCode.length === scripts.length) {
                code = '!function(){\n ' +
                        scriptsCode.join('\n') + '\n' +
                       '}(window); \n';
                
                scriptDone = true;
                loadCode();
            }
        });
    });
    
    // savely embed the code; this will wait for us to have the code, and for
    // the page to finish loading before injecting the code
    function loadCode() {
        // wait until both are done in order to load the code
        if (!scriptDone || !loadDone) { return; }

        webview.executeScript({ code: code }, function(){
            // post the first message, to initialize message sending from the
            // guest webiew page
            webview.contentWindow.postMessage('thing', '*');
            
            sendAnalytics('Script', 'injected');
        });
    }

    // execute every time the page is done loading
    // this will inject the code into any page that happens to load
    function loadstop() {
        // we do not want to register events more than once
        if (loadDone) {
            return loadCode();
        }

        loadDone = true;

        // catch all console logging from the webview
        webview.addEventListener('consolemessage', function(ev) {
            console.log('HipChat says: %c%s', 'color: blue', ev.message);
        });

        // catch all attempts to open a link from the webview
        webview.addEventListener('newwindow', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var target = ev.targetUrl;
            
            if (DEBUG_MODE && /hipchat\.com\/chat\/video/.test(target)) {
                console.log('video button', target);
                openNewVideoWindow(target);
            } else if (/hipchat\.com\/sign_in/.test(target)) {
                openNewLoginWindow(target);
            } else {
                open(target);
            }
        });

        // catch all permision requests and allow them
        webview.addEventListener('permissionrequest', function(ev) {
            if (ev.permission === 'media') {
                ev.request.allow();
            } else if (DEBUG_MODE) {
                // allow all requests... this might not be a good idea
                console.log('permission:', ev.permission);
                ev.request.allow();
            }
            
            // just in case, log all permission requests,
            // in order to make sure I am not missing any requests 
            // that the app tries to use
            sendAnalytics('Permission', (ev.permission && ev.permission.toString()) || 'unknwon');
        });
        
        function linkOpen(ev) {
            if (ev.linkUrl) {
                open(ev.linkUrl);
            }
        }
        function linkCopy(ev) {
            if (ev.linkUrl) {
                copy(ev.linkUrl);
            }
        }
        
        webview.contextMenus.create({
            title: 'Open link in browser',
            contexts: ['link'],
            onclick: linkOpen
        }, function() { });
        webview.contextMenus.create({
            title: 'Copy link address',
            contexts: ['link'],
            onclick: linkCopy
        }, function() { });
        
//        webview.request.onCompleted.addListener(function(details) { 
//            var bindAddr = 'https://likeabosh.hipchat.com/http-bind/';
//            
//            if (details.url === bindAddr && details.statusCode === 200) {
//                console.log('details', details);
//            }
//        }, { urls: ["*://*/*"] });
        
        loadCode();
    }

    webview.addEventListener('contentload', loadstop);

    window.addEventListener('message', function(ev) {
        var data = ev.data;

        if (data.type && data.type === 'notification') {
            notify(data);
        } else if (DEBUG_MODE && data.type && data.type === 'connection') {
            notify({
                message: 'Connection is lost'
            });
        }
    });
    
    // send a notification
    function notify(data) {
        if (!shouldNotify) { return; }
        
        var id = (Math.floor(Math.random() * 9007199254740992) + 1).toString();
            
        var opts = {
            title: data.title || 'HipChat',
            type: chrome.notifications.TemplateType.BASIC,
            message: data.message,
            priority: 0,
            iconUrl: chrome.runtime.getURL('assets/128.png')
        };

        chrome.notifications.create(id, opts, function() {
            console.log('notification callback', arguments);
        });
        
        // update the taskbar message count
        messageCount( messageCount() + 1 );
        // make the taskbar icon flash orange
        appWindow.drawAttention();
        
        // send interaction analytics
        sendAnalytics('Notification', 'shown');
    }
    
    // copy data to clipboard
    function copy(str) {
        var input = document.createElement('textarea');
        document.body.appendChild(input);
        input.value = str;
        input.focus();
        input.select();
        document.execCommand('Copy');
        input.remove();
    }
    
    // open a link in the browser
    function open(url) {
        window.open(url);
        
        sendAnalytics('Window', 'open');
    }
    
    function openNewLoginWindow(url) {
        var bounds = {
            width: appWindow.innerBounds.width,
            height: appWindow.innerBounds.height
        };
        
        chrome.app.window.create('main.html', {
            innerBounds: bounds,
            frame: "none"
        }, function(newAppWindow) {
            var win = newAppWindow.contentWindow;
            var partition = 'second';
            
            // overload this url with the chat url, so that users don't
            // have to press the "launch the app" button
            win.__webviewUrl__ = url;
            
            // assigning a different partition name isolates the memory
            // space of the new webview from the one in the main window
            win.__webviewPartition__ = partition;
            
            // pass any stored data from this window to the new one
            win.__storedData__ = STORED_DATA;
        });
        
        sendAnalytics('Team', 'second team');
    }
    
    function openNewVideoWindow(url) {
        var bounds = {
            width: appWindow.innerBounds.width,
            height: appWindow.innerBounds.height
        };
        
        chrome.app.window.create('main.html', {
            innerBounds: bounds,
            frame: "none"
        }, function(newAppWindow) {
            var win = newAppWindow.contentWindow;
//            var partition = 'persist:trusted';
            
            win.__webviewUrl__ = url;
        });
        
        sendAnalytics('Team', 'video chat');
    }
    
    chrome.notifications.onClicked.addListener(function(notificationId) {
        appWindow.show(true);
        
        // send interaction analytics
        sendAnalytics('Notification', 'clicked');
    });
    
    // detect when the window is active and inactive
    window.onfocus = function onFocus(ev) {
        shouldNotify = false;
        
        // clear existing notifications
        messageCount(0);
        chrome.notifications.getAll(function(nots) {
            $.forEach(nots, function(val, key) {
                chrome.notifications.clear(key);
            });
        });
        
//        appWindow.clearAttention();
        
        sendAnalytics('State', 'focused');
    };
    
    window.onblur = function onBlur(ev) {
        shouldNotify = true;
        sendAnalytics('State', 'blurred');
    };
    
    // detect when the machine is idle
    // always send notifications when idle or locked, even if 
    // the window is focused
    chrome.idle.onStateChanged.addListener(function(state) {
        switch (state) {
            case chrome.idle.IdleState.ACTIVE:
                console.log('is active');
                sendAnalytics('State', 'active');
                break;
            case chrome.idle.IdleState.IDLE:
                console.log('is idle');
                shouldNotify = true;
                sendAnalytics('State', 'idle');
                break;
            case chrome.idle.IdleState.LOCKED:
                console.log('is locked');
                shouldNotify = true;
                sendAnalytics('State', 'locked');
                break;
        }
    });
    // set state to idle after 60 seconds of inactivity
    chrome.idle.setDetectionInterval(60);
    
    // listen to commands
    chrome.commands.onCommand.addListener(function(command) {
        if (command === 'new-team-login') {
            openNewLoginWindow('https://www.hipchat.com/sign_in');
        } else if (command === 'reload') {
            console.log('reload');
            webview.reload();
        }
    });
    
    // code related to the header bar
    $('#close').onclick = window.close.bind(window);
    $('#minimize').onclick = function() { appWindow.minimize(); };
    $('#maximize').onclick = function() { 
        var max = 'at-max';
        
        if (this.classList.contains(max)) {
            appWindow.restore();
            this.classList.remove(max);
        } else {
            appWindow.maximize();
            this.classList.add(max);
        }
    };
    
    var showClass = 'show-settings';
    function closeOverlay() {
        body.classList.remove(showClass);
    }
    function openOverlay() {
        body.classList.add(showClass);
    }
    
    // manage the settings control
    var overlay = $('#overlay');
    var body = $('body');
    $('#settings').onclick = function() {
        
        if (body.classList.contains(showClass)) {
            closeOverlay();
        } else {
            openOverlay();
        }
    };
    
    var serverKey = 'chat-server-url';
    var serverInput = $('#chat-server');
    if (STORED_DATA && STORED_DATA[serverKey]) {
        serverInput.value = STORED_DATA[serverKey];
    }
    $('#save').onclick = function() {
        var val = serverInput.value || '';
        var data = {};
        data[serverKey] = val;
        chrome.storage.local.set(data);
        
        closeOverlay();
    };
    $('#cancel').onclick = closeOverlay;
};
