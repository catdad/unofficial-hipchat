/* jshint browser: true, devel: true */
/* global chrome, analytics, $ */

window.addEventListener('load', function() {
    var HIDDEN = 'hide';
    var loader = $('#loader');
    var webview = $('#chat');
    var troubleshoot = $('#troubleshoot');
    var links = $.allIn('a', troubleshoot);
    var close = $('#hide-loader');
    
    function kill(ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }
    
    function open(link) {
        return function opener(ev) {
            kill(ev);
            
            chrome.browser.openTab({
                url: link.href
            });
        };
    }
    
    function show() {
        loader.classList.remove(HIDDEN);
    }
    
    function hide() {
        loader.classList.add(HIDDEN);
    }
    
    function showTroughleshootingEventually() {
        setTimeout(function() {
            troubleshoot.classList.add('show');
        }, 1000 * 15);
    }
    
    webview.addEventListener('contentload', function() {
        if (/\/chat$/.test(webview.src)) {
            hide();
        }
    });
    
    close.addEventListener('click', hide);
    
    $.forEach(links, function(link) {
        link.addEventListener('click', open(link));
    });
    
    $.on('showLoader', show);
    $.on('hideLoader', hide);
    
    showTroughleshootingEventually();
});
