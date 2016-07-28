/* jshint browser: true, devel: true */
/* global chrome, analytics, $ */

window.addEventListener('load', function() {
    var APP = window.__app__ || {};
    window.__app__ = APP;
    
    var STORED_DATA = window.__storedData__ || {};
    window.__storedData__ = STORED_DATA;
    
    var webview = $('#chat');
    
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
        
        // if this is the first account being added,
        // mark it as the default
        if (Object.keys(ACCOUNTS).length === 0) {
            account.isDefault = true;
        }
        
        ACCOUNTS[key] = account;
        
        var saveData = {};
        saveData[accountsKey] = ACCOUNTS;
        
        saveAccounts();
        buildAccountUI();
    }
    
    function overloadAccountsState(accounts) {
        ACCOUNTS = STORED_DATA[accountsKey] = accounts;
    }
    
    function saveAccounts(done) {
        done = $.func(done);
        
        chrome.storage.local.get(function(data) {
            data[accountsKey] = data[accountsKey] || {};
            
            $.forEach(ACCOUNTS, function(ac, key) {
                data[accountsKey][key] = ac;
            });
            
            overloadAccountsState(data[accountsKey]);
            
            chrome.storage.local.set(data, done);
        });
    }
    
    function deleteAccount(account, done) {
        done = $.func(done);
        var accountsCopy = {};
        
        chrome.storage.local.get(function(data) {
            $.forEach(data[accountsKey], function(ac, key) {
                if (account.email !== ac.email) {
                    accountsCopy[key] = ac;
                }
            });
            
            var saveData = {};
            saveData[accountsKey] = accountsCopy;
            
            overloadAccountsState(accountsCopy);
            
            chrome.storage.local.set(saveData, done);
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
            return $.trigger('hideLoader');
        }
        
        $.forEach(accounts, function(ac) {
            if (!account || ac.isDefault) {
                account = ac;
            }
        });
        
        if (account) {
            useLogon(account);
        } else {
            return $.trigger('hideLoader');
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
        var selected = 'selected';
        
        // init the accounts bubble UI
        var elem = $.elem('div', 'account-entry');
        var email = $.elem('div', 'email');
        email.innerHTML = account.email;
        
        var pin = $.elem('button', 'pin' + (account.isDefault ? ' ' + selected : ''));
        pin.innerHTML = '<svg class="icon"><use xlink:href="#icon-pin" /></svg>';
        
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
            
            $.forEach(accountsList.querySelectorAll('.pin.' + selected), function(el) {
                el.classList.remove(selected);
            });
            
            pin.classList.add(selected);
            
            setDefaultAccount(account);
        });
        
        remove.addEventListener('click', function(ev) {
            ev.stopPropagation();
            
            // just rebuild the whole UI when the
            // delete is done
            deleteAccount(account, buildAccountUI);
        });
        
        // build the DOM
        buttons.appendChild(pin);
        buttons.appendChild(remove);
        
        email.appendChild(buttons);
        elem.appendChild(email);
        accountsList.appendChild(elem);
    }
    
    function buildAccountUI() {
        accountsList.innerHTML = '';
        $.forEach(ACCOUNTS, addAccountUI);
    }
    
    buildAccountUI();
    
    addAccount.addEventListener('click', function() {
        logonOnClick(false);
    });
    
    ////////////////////////////////////////
    // Public Accounts API
    ////////////////////////////////////////
    APP.accountMessage = accountMessage;
    APP.sendLogon = sendLogon;
    
//    $.once('ready', sendLogon);
    $.on('accountMessage', accountMessage);
    
    webview.addEventListener('contentload', sendLogon);
});
