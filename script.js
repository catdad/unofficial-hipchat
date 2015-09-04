/* jshint browser: true */

var appWindow, appOrigin;

function onMessage(e) {
    appWindow = e.source;
    appOrigin = e.origin;

    send('message back');
};

function send(str) {
    appWindow.postMessage(str, appOrigin);
}

window.addEventListener('message', onMessage);

// var OldNotification = window.Notification;
//
// var NewNotification = function() {
//     OldNotification.call(this);
//
//     console.log('notification created');
// };
// NewNotification.prototype = Object.create(OldNotification);
// NewNotification.requestPermission = OldNotification.requestPermission.bind(OldNotification);
//
// window.Notification = NewNotification;
//
//
//
// function notify(str) {
//     if (Notification.permission === "granted") {
//         // If it's okay let's create a notification
//         var notification = new Notification(str);
//     }
//
//     // Otherwise, we need to ask the user for permission
//     else if (Notification.permission !== 'denied') {
//         Notification.requestPermission(function (permission) {
//             // If the user accepts, let's create a notification
//             if (permission === "granted") {
//                 var notification = new Notification(str);
//             }
//         });
//     }
// }
