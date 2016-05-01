/* jshint browser: true, devel: true */
/* global chrome, analytics, $ */

window.addEventListener('load', function() {
    var HIDDEN = 'hide';
    var loader = $('#loader');
    var webview = $('#chat');
    
    function show() {
        loader.classList.remove(HIDDEN);
    }
    
    function hide() {
        loader.classList.add(HIDDEN);
    }
    
    webview.addEventListener('contentload', function() {
        if (/\/chat$/.test(webview.src)) {
            hide();
        }
    });
    
    $.on('showLoader', show);
    $.on('hideLoader', hide);
});
