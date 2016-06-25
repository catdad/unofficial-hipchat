/* jshint browser: true, devel: true, expr: true */
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
    
    function sendAnalytics(category, action) {
        category = category || 'Default';
        action = action || 'default';
        
        if (window.tracker && window.tracker.sendEvent) {
            window.tracker.sendEvent(category, action);
        }
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
        sendAnalytics('Loader', 'show');
    }
    
    function hide() {
        loader.classList.add(HIDDEN);
        sendAnalytics('Loader', 'hide');
        cancelTroubleshoot && cancelTroubleshoot();
    }
    
    function showTroughleshootingEventually() {
        var timeout = setTimeout(function() {
            troubleshoot.classList.add('show');
            sendAnalytics('Loader', 'troubleshoot');
        }, 1000 * 15);
        
        return function clearTroubleshootTimeout() {
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
        };
    }
    
    webview.addEventListener('contentload', function() {
        if (/\/chat$/.test(webview.src)) {
            hide();
        }
    });
    
    close.addEventListener('click', function() {
        hide();
        sendAnalytics('Loader', 'forceclose');
    });
    
    $.forEach(links, function(link) {
        link.addEventListener('click', open(link));
    });
    
    $.on('showLoader', show);
    $.on('hideLoader', hide);
    
    var cancelTroubleshoot = showTroughleshootingEventually();
});
