/* jshint browser: true */

onload = function() {
    var $ = function(sel) {
		return document.querySelector(sel);
	};

    var webview =$('#chat');

    // generate the absolute URL for the content script
    var a = document.createElement('a');
    a.href = 'script.js';
    var fullUrl = a.href;

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
    }
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

        loadCode();
    }

    webview.addEventListener('contentload', loadstop);

    window.addEventListener('message', function(e) {
        console.log(e.data);
    });
};
