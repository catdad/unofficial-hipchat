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
        ACCOUNTS[data.email] = {
            email: data.email,
            password: data.password
        };
        
        var saveData = {};
        saveData[accountsKey] = ACCOUNTS;
        
        chrome.storage.local.set(saveData);
    }
    
    function useLogon(account) {
        if (account.email && account.password) {
            APP.sendMessage({
                type: 'logon',
                email: account.email,
                password: account.password
            });
        }
    }
    
    function sendLogon() {
        var accounts = STORED_DATA[accountsKey];
        
        if (window.__logonAccount__) {
            var account = window.__logonAccount__;
            return useLogon(account);
        }
        
        if (window.__logonAccount__ === false) {
            return;
        }
        
        if (Object.keys(accounts).length) {
            // temp -- use the first account
            var key = Object.keys(accounts)[0];
            var val = accounts[key];
            
            return useLogon(val);
        }
    }
    
    ////////////////////////////////////////
    // Accounts UI and things
    ////////////////////////////////////////
    var accountsButton = $('#accounts');
    var accountsBubble = $('#accounts-bubble');
    var accountsList = $('#accounts-selector');
    var addAccount = $('#add-account');
    
    accountsButton.addEventListener('click', function() {
        $.toggleClass(accountsBubble, 'visible');
    });
    
    function logonOnClick(account) {
        $.trigger('newLogon', account);
        $.toggleClass(accountsBubble, 'visible');
    }
    
    function addAccountUI(account) {
        // init the accounts bubble UI
        var elem = $.elem('div', 'account-entry');
        var email = $.elem('div', 'email');
        email.innerHTML = account.email;
        
        var remove = $.elem('button', 'remove');
        // I don't feel like building this as UI
        remove.innerHTML = '<svg class="icon"><use xlink:href="#icon-trash" /></svg>';
        
        elem.addEventListener('click', function() {
            logonOnClick(account);
        });
        
        email.appendChild(remove);
        elem.appendChild(email);
        accountsList.appendChild(elem);
    }
    
    $.forEach(ACCOUNTS, addAccountUI);
    
    addAccount.addEventListener('click', function() {
        logonOnClick(false);
    });
    
    ////////////////////////////////////////
    // Public Accounts API
    ////////////////////////////////////////
    APP.accountMessage = accountMessage;
    APP.sendLogon = sendLogon;
    
    $.once('ready', sendLogon);
    $.on('accountMessage', accountMessage);
});
