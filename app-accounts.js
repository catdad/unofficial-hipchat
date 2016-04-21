/* jshint browser: true, devel: true */
/* global chrome, analytics */

window.addEventListener('load', function() {
    var APP = window.__app__ || {};
    window.__app__ = APP;
    
    var STORED_DATA = window.__storedData__ || {};
    window.__storedData__ = STORED_DATA;
    
    //////////////////////////////////
    // Acount management
    //////////////////////////////////
    var accountsKey = 'accounts';
    function accountMessage(data) {
        console.log(data);
        
        var accounts = STORED_DATA[accountsKey] || {};
        accounts[data.email] = {
            email: data.email,
            password: data.password
        };
        
        var saveData = {};
        saveData[accountsKey] = accounts;
        
        chrome.storage.local.set(saveData);
    }
    
    function sendLogon() {
        var accounts = STORED_DATA[accountsKey];
        
        if (Object.keys(accounts).length) {
            // temp -- use the first account
            var key = Object.keys(accounts)[0];
            var val = accounts[key];
            
            APP.sendMessage({
                type: 'logon',
                email: val.email,
                password: val.password
            });
        }
    }
    
    APP.accountMessage = accountMessage;
    APP.sendLogon = sendLogon;
    
});
