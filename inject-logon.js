/* jshint browser: true, devel: true, -W027 */
/* global unescape */

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
    
    var SIGNIN_REGEX = /\/sign_in/;
    var PASS_REGEX = /\/login_password/;
    
    var query = (function parseQuery(args){
        var query = {};
        for (var i = args.length; i--;) {
            var q = args[i].split('=');
            query[q.shift()] = unescape(q.join('='));
        }
        return query;
    }(window.location.search.substring(1).split('&')));
    
    function newSigninEmailWorkflow(opts) {
        // in this workflow, we have an email box on 
        // one page, and then a password box on the next page
        
        
        // TODO what do I do here? There is nothing to do on the first
        // page. I would need to hide the loader, unless we already
        // have login data and we need to attempt a login.
    }
    
    function attachPasswordWorkflow() {
        var passwordField = document.querySelector('#password');
        var signInButton = document.querySelector('#signin');
        var rememberCheckbox = document.querySelector('#stay_signed_in');
        
        if (!passwordField || !signInButton) {
            return;
        }
        
        signInButton.addEventListener('click', function() {
            // If the checkbox is not found for some reason, or it is not
            // checked, do not remember this login.
            if (!rememberCheckbox || !rememberCheckbox.checked) {
                return;
            }
            
            send({
                type: 'account',
                email: query.email,
                password: passwordField.value
            });
        });
    }
    
    function attach() {
        var emailField = document.querySelector('#email');
        var passwordField = document.querySelector('#password');
        var signInButton = document.querySelector('#signin');
        var rememberCheckbox = document.querySelector('#stay_signed_in');
        
        if (emailField && signInButton && !passwordField) {
            return newSigninEmailWorkflow({
                emailField: emailField,
                signInButton: signInButton
            });
        }
        
        if (!emailField || !passwordField || !signInButton) {
            return;
        }
        
        signInButton.addEventListener('click', function() {
            // If the checkbox is not found for some reason, or it is not
            // checked, do not remember this login.
            if (!rememberCheckbox || !rememberCheckbox.checked) {
                return;
            }
            
            send({
                type: 'account',
                email: emailField.value,
                password: passwordField.value
            });
        });
    }
    
    function attemptLogon(data) {
        console.log('attempt login', data);
        
        var emailField = document.querySelector('#email');
        var passwordField = document.querySelector('#password');
        var signInButton = document.querySelector('#signin');
        
        if (!signInButton) {
            return;
        }
        
        // In the new workflow, we get these fields one
        // at a time, so fill in as much as are present.
        
        if (emailField) {
            emailField.value = data.email;
        }
        
        if (passwordField) {
            passwordField.value = data.password;
        }
        
        signInButton.removeAttribute('disabled');
        signInButton.click();
    }
    
    if (SIGNIN_REGEX.test(window.location.href)) {
        if (document.readyState === 'complete') {
            attach();
        } else {
            window.onload = attach;
        }
    } else if (PASS_REGEX.test(window.location.href)) {
        if (document.readyState === 'complete') {
            attachPasswordWorkflow();
        } else {
            window.onload = attachPasswordWorkflow;
        }
    }
    
} +  '();';

// inject the script into the webview document
(document.head || document.documentElement).appendChild(script);
