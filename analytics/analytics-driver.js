/* jshint browser: true, devel: true */
/* global analytics */

(function() {
    var service, tracker;
    
    function startApp() {
        console.log('configuring analytics');
        
        // Initialize the Analytics service object with the name of your app.
        service = analytics.getService('unofficial-hipchat');
        service.getConfig().addCallback(initAnalyticsConfig);

        // Get a Tracker using your Google Analytics app Tracking ID.
        tracker = service.getTracker('UA-67424312-1');

        // Start timing...
        //var timing = tracker.startTiming('Analytics Performance', 'Send Event');

        // Record an "appView" each time the user launches your app or goes to a new
        // screen within the app.
        tracker.sendAppView('HipChat');

        // Record user actions with "sendEvent".
        //tracker.sendEvent('Interesting Stuff', 'User Did Something');

        // ...send elapsed time since we started timing.
        //timing.send();
    }
    
    function initAnalyticsConfig(config) {
        config.setTrackingPermitted(true);
    }
    
    startApp();
    
    window.tracker = tracker;
})();
