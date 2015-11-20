/* jshint browser: true */
/* global chrome */

/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function() {
    chrome.storage.local.get(runApp);
});

/**
 * Listens for the app restarting then re-creates the window.
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 */
chrome.app.runtime.onRestarted.addListener(function() {
    chrome.storage.local.get(runApp);
});

/**
 * Creates the window for the application.
 *
 * @see http://developer.chrome.com/apps/app.window.html
 */
function runApp(storedData) {
    
    console.log(storedData);
    
    var urlToLoad = storedData['chat-server-url'] || 'https://www.hipchat.com/chat';
    
    chrome.app.window.create('main.html', {
        id: "hipChatWebview",
        innerBounds: {
            width: 1024,
            height: 768
        },
//        frame: "chrome"
        frame: "none"
    }, function(appWindow) {
        appWindow.contentWindow.__webviewUrl__ = urlToLoad;
        appWindow.contentWindow.__storedData__ = storedData;
    });
}
