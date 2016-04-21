/* jshint browser: true, devel: true */
/* global chrome, analytics, $ */

window.addEventListener('load', function() {
    var APP = window.__app__ || {};
    window.__app__ = APP;
    
    var STORED_DATA = window.__storedData__ || {};
    window.__storedData__ = STORED_DATA;
    
    var accountsKey = 'accounts';
    var ACCOUNTS = STORED_DATA[accountsKey] || {};
    STORED_DATA[accountsKey] = ACCOUNTS;
    
    ////////////////////////////////////////
    // Acount management
    ////////////////////////////////////////
    function accountMessage(data) {
        console.log(data);
        
        ACCOUNTS[data.email] = {
            email: data.email,
            password: data.password
        };
        
        var saveData = {};
        saveData[accountsKey] = ACCOUNTS;
        
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
    
    ////////////////////////////////////////
    // Accounts UI and things
    ////////////////////////////////////////
    var accountsButton = $('#accounts');
    var accountsBubble = $('#accounts-bubble');
    
    accountsButton.addEventListener('click', function() {
        $.toggleClass(accountsBubble, 'visible');
    });
    
    function addAccountUI(account) {
        // init the accounts bubble UI
        var div = $.elem('div');
        div.innerHTML = account.email;
        accountsBubble.appendChild(div);
    }
    
    $.forEach(ACCOUNTS, addAccountUI);
    
    ////////////////////////////////////////
    // Public Accounts API
    ////////////////////////////////////////
    APP.accountMessage = accountMessage;
    APP.sendLogon = sendLogon;
    
});
