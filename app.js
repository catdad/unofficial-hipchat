/* jshint browser: true */
/* global chrome, console */

onload = function() {
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
//    var fullUrl = chrome.runtime.getURL('inject-xhr.js');
    var fullUrl = chrome.runtime.getURL('inject-notifications.js');

    // some vars to save the state
    var code = '';
    var scriptDone = false;
    var loadDone = false;
    
    // get the code from the content scrip as text
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            // generate executable code
            code = '!function(){\n ' +
                    xmlHttp.responseText + '\n' +
                   '}(window); \n';
            
            scriptDone = true;
            loadCode();
        }
    };
    xmlHttp.open("GET", fullUrl, true); // true for asynchronous
    xmlHttp.send(null);

    // savely embed the code; this will wait for us to have the code, and for
    // the page to finish loading before injecting the code
    function loadCode() {
        // wait until both are done in order to load the code
        if (!scriptDone || !loadDone) { return; }

        webview.executeScript({ code: code }, function(){
            console.log('script was executed', arguments);
            // post the first message, to initialize message sending from the
            // guest webiew page
            webview.contentWindow.postMessage('thing', '*');
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
            window.open(ev.targetUrl);
        });

        // catch all permision requests and allow them
//        webview.addEventListener('permissionrequest', function(ev) {
//            // allow all the things
//            ev.request.allow();
//        });
        
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
        console.log(data);

        if (data.type && data.type === 'notification') {
            notify(data);
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
    }
    
    chrome.notifications.onClicked.addListener(function(notificationId) {
        appWindow.show(true);
    });
    
    // detect when the window is active and inactive
    window.onfocus = function onFocus(ev) {
        console.log('focus', arguments);
        shouldNotify = false;
        
        // clear existing notifications
        messageCount(0);
        chrome.notifications.getAll(function(nots) {
            $.forEach(nots, function(val, key) {
                chrome.notifications.clear(key);
            });
        });
    };
    
    window.onblur = function onBlur(ev) {
        console.log('blur', arguments);
        shouldNotify = true;
    };
    
    // detect when the machine is idle
    // always send notifications when idle or locked, even if 
    // the window is focused
    chrome.idle.onStateChanged.addListener(function(state) {
        switch (state) {
            case chrome.idle.IdleState.ACTIVE:
                console.log('is active');
                break;
            case chrome.idle.IdleState.IDLE:
                console.log('is idle');
                shouldNotify = true;
                break;
            case chrome.idle.IdleState.LOCKED:
                console.log('is locked');
                shouldNotify = true;
                break;
        }
    });
    // set state to idle after 60 seconds of inactivity
    chrome.idle.setDetectionInterval(60);
};
