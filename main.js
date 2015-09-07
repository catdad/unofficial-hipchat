/* jshint browser: true */
/* global chrome */

/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function() {
    runApp();
});

/**
 * Listens for the app restarting then re-creates the window.
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 */
chrome.app.runtime.onRestarted.addListener(function() {
    runApp();
});

/**
 * Creates the window for the application.
 *
 * @see http://developer.chrome.com/apps/app.window.html
 */
function runApp() {
    chrome.app.window.create('main.html', {
        id: "browserWinID",
        innerBounds: {
            width: 1024,
            height: 768
        },
        frame: {
            type: "chrome",
            color: '#fefefe'
        }
    }, function(appWindow) {
        configureWindow(appWindow);
    });
}

function configureWindow(appWindow) {
    chrome.notifications.onClicked.addListener(function(notificationId) {
        appWindow.show(true);
    });
}
