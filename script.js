/* jshint browser: true */

/////////////////////////////////////////
// This file should only be executed once
/////////////////////////////////////////

// this is particularly an issue when the user has to sign in
// before starting to use the app
if (window.__hipchatBootstrapCongiged__) {
    return;
}

window.__hipchatBootstrapCongiged__ = true;

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

    // temporary for testing
    // new Notification('test notification', {
    //     body: 'this is just a test to say everything connected'
    // });
    notify({
        title: 'HipChat started',
        body: e.data.toString()
    });
};

// send messages to the parent
// since this is Chrome, we can use JSON objects
function send(data) {
    if (appWindow && appOrigin) {
        appWindow.postMessage(data, appOrigin);
    }
}

window.addEventListener('message', onMessage);

/////////////////////////////////////////
// Overload the HTML5 notification system
/////////////////////////////////////////
function notify(opts) {
    console.log('polyfilled notification');
    return send({
        type: 'notification',
        title: opts.title,
        message: opts.body,
        eventTime: Date.now()
    });
}
