/* jshint browser: true, devel: true, -W027 */

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
    if (window.__hipchatXhrBootstrap__) {
        return;
    }

    window.__hipchatXhrBootstrap__ = true;
    
    console.log('EMBEDDING LOGON');

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
        
        if (e.data && e.data.type === 'logon') {
            attemptLogon(e.data);
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
    // Attach password stuff
    /////////////////////////////////////////
    
    function attach() {
        var emailField = document.querySelector('#email');
        var passwordField = document.querySelector('#password');
        var signInButton = document.querySelector('#signin');
        
        if (!emailField || !passwordField || !signInButton) {
            return;
        }
        
        signInButton.addEventListener('click', function() {
            send({
                type: 'account',
                email: emailField.value,
                password: passwordField.value
            });
        });
    }
    
    function attemptLogon(data) {
        var emailField = document.querySelector('#email');
        var passwordField = document.querySelector('#password');
        var signInButton = document.querySelector('#signin');
        
        if (!emailField || !passwordField || !signInButton) {
            return;
        }
        
        emailField.value = data.email;
        passwordField.value = data.password;
        signInButton.click();
    }
    
    if (/\/sign_in/.test(window.location.href)) {
        if (document.readyState === 'complete') {
            attach();
        } else {
            window.onload = attach;
        }
    }
    
} +  '();';

// inject the script into the webview document
(document.head || document.documentElement).appendChild(script);
