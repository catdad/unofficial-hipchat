/* jshint browser: true */
/* global Strophe, console */

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
    // Overload the Strophe library used by HipChat
    /////////////////////////////////////////
    function attemptToOverloadStrophe() {
        console.log('checking if we can overload');

        var hasStrophe = window.Strophe && Strophe.Request.prototype._newXHR;
        if (!hasStrophe) {
            setTimeout(attemptToOverloadStrophe, 10);
            return;
        }

        // this Strophe override code was copied from the HipChat implementation itself
        // let's hope they never secure it
        var originalXHRFactory = window.Strophe.Request.prototype._newXHR;
        window.Strophe.Request.prototype._newXHR = function () {

            var originalOnReadyStateChange, xhr;
            xhr = originalXHRFactory.bind(this)();
            originalOnReadyStateChange = xhr.onreadystatechange;
            xhr.send = (function (child) {
                return function () {
                    var e;
                    try {
                        return XMLHttpRequest.prototype.send.apply(xhr, arguments);
                    } catch (_error) {
                        e = _error;
                        return Strophe.log(Strophe.LogLevel.WARN, e.message);
                    }
                };
            })(this);
            xhr.onreadystatechange = function () {
                if (this.readyState === 1 && !this.withCredentials) {
                    this.withCredentials = true;
                }
                
                // when the request is done, attempt to parse it
                if (this.readyState === 4 && this.responseURL === 'https://likeabosh.hipchat.com/http-bind/') {
                    parseHttpBindBody(xhr.responseText);
                }

                return originalOnReadyStateChange.apply(this, arguments);
            };
            return xhr;
        };
    }
    attemptToOverloadStrophe();
    
    // parse responses from the jabber protocol
    //  This entire thing is a hack, as I did not event attempt to find
    //  out if there is a protocol here, and just guessed things.
    function parseHttpBindBody(body) {
        
        // try/catch the whole thing
        try {
        
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(body, 'text/xml');
            
            // attempt to find a message, and return if no message is found
            var message = xmlDoc.querySelector('message');
            if (!message) { return; }
            
            console.log(xmlDoc);
            
            // if there is an id assigned to the message, we can assume that it
            // is a message sent by this app, and it should be ignored
            var id = message.getAttribute('id');
            if (id !== undefined && id !== null) { return; }
            
            // check for a delay element inside the message
            // this suggests a re-broadcast, so we want to ignore it
            var delay = message.querySelector('delay');
            if (delay) { return; }
            
            console.log(message);

            var from = message.getAttribute('from').split('/').pop();
            // assume the first child is the body
            // TODO this is probably not good
            var msgBody = message.firstChild.innerHTML;

            notify({
                title: from,
                body: msgBody
            });
        } catch(e) {
            console.log('ERROR: ' + e.message);
        }
    }
    
} +  '()';

// inject the script into the webview document
(document.head || document.documentElement).appendChild(script);
