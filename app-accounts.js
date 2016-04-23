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
        var key = data.email;
        var account = ACCOUNTS[key] || {};
        
        account.email = data.email;
        account.password = data.password;
        
        ACCOUNTS[key] = account;
        
        var saveData = {};
        saveData[accountsKey] = ACCOUNTS;
        
        saveAccounts();
    }
    
    function saveAccounts(done) {
        chrome.storage.local.get(function(data) {
            $.forEach(ACCOUNTS, function(ac, key) {
                data[accountsKey][key] = ac;
            });
            
            chrome.storage.local.set(data, function() {
                if (done && typeof done === 'function') {
                    done();
                }
            });
        });
    }
    
    function setDefaultAccount(account) {
        $.forEach(ACCOUNTS, function(ac) {
            if (ac.email === account.email) {
                ac.isDefault = true;
            } else {
                ac.isDefault = false;
            }
        });
        
        saveAccounts();
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
        var account;
        
        if (window.__logonAccount__) {
            account = window.__logonAccount__;
            return useLogon(account);
        }
        
        if (window.__logonAccount__ === false) {
            return;
        }
        
        $.forEach(accounts, function(ac) {
            if (!account || ac.isDefault) {
                account = ac;
            }
        });
        
        if (account) {
            useLogon(account);
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
        
        var pin = $.elem('button', 'pin');
        pin.innerHTML = '<svg class="icon"><use xlink:href="#icon-pin" /></svg>';
        
        if (account.isDefault) {
            pin.classList.add('selected');
        }
        
        var buttons = $.elem('div', 'buttons');
        
        var remove = $.elem('button', 'remove');
        // I don't feel like building this as UI
        remove.innerHTML = '<svg class="icon"><use xlink:href="#icon-trash" /></svg>';
        
        // add events to all buttons
        elem.addEventListener('click', function() {
            logonOnClick(account);
        });
        
        pin.addEventListener('click', function(ev) {
            ev.stopPropagation();
            
            $.forEach(accountsList.querySelectorAll('.pin.selected'), function(el) {
                el.classList.remove('selected');
            });
            
            pin.classList.add('selected');
            
            setDefaultAccount(account);
        });
        
        // build the DOM
        buttons.appendChild(pin);
        buttons.appendChild(remove);
        
        email.appendChild(buttons);
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
