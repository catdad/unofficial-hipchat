/* jshint browser: true, devel: true */
/* global analytics */

// sample code from the Chrome PLatform Analytics GitHub example
// https://github.com/GoogleChrome/chrome-platform-analytics

(function() {
    var service, tracker;
    
    function startApp() {
        console.log('configuring analytics');
        
        // Initialize the Analytics service object with the name of your app.
        service = analytics.getService('unofficial-hipchat');
        service.getConfig().addCallback(initAnalyticsConfig);

        // Get a Tracker using your Google Analytics app Tracking ID.
        tracker = service.getTracker('UA-67424312-1');
        
        // Record an "appView" each time the user launches your app or goes to a new
        // screen within the app.
        tracker.sendAppView('HipChat');
    }
    
    function initAnalyticsConfig(config) {
        config.setTrackingPermitted(true);
    }
    
    startApp();
    
    window.tracker = tracker;
})();
