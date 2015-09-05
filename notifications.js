/* jshint browser: true */
/* global chrome, console */

onload = function() {
    var $ = function(sel) {
		return document.querySelector(sel);
	};

    var webview =$('#chat');

    // generate the absolute URL for the content script
    var fullUrl = chrome.runtime.getURL('script.js');

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
                    '}(); \n';

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

        webview.addEventListener('myCustomEvent', function() {
            console.log('myCustomEvent', arguments);
        });

        // catch all console logging from the webview
        webview.addEventListener('consolemessage', function(ev) {
            console.log('HipChat says: %c%s', 'color: blue', ev.message);
        });

        // catch all attempts to open a link from the webview
        webview.addEventListener('newwindow', function(ev) {
            ev.preventDefault();
            window.open(ev.targetUrl);
        });

        webview.addEventListener('permissionrequest', function(ev) {
            // allow all the things
            ev.request.allow();
        });

        loadCode();
    }

    webview.addEventListener('contentload', loadstop);

    window.addEventListener('message', function(ev) {
        var data = ev.data;
        console.log(data);

        if (data.type && data.type === 'notification') {
            var id = (Math.floor(Math.random() * 9007199254740992) + 1).toString();
            var opts = {
                title: data.title || 'HipChat',
                type: chrome.notifications.TemplateType.BASIC,
                message: data.message,
                priority: 2,
                iconUrl: chrome.runtime.getURL('128.png')
            };

            chrome.notifications.create(id, opts, function() {
                console.log('notification callback', arguments);
            });
        }
    });
};
