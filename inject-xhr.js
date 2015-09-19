/* jshint browser: true, devel: true, -W027 */
/* global Strophe */

// For some reason, a Chrome Packaged App, using executeScript, 
// cannot access or make changes to the window object in the 
// guest webview. However, it can inject another script into
// the webview document, in which case, that script will be 
// treated like native code, instead of code specifically
// injected by the app. So... let's see how much we can 
// exploit that.

var script = document.createElement('script');
script.textContent = '!' + function() {
    
    /////////////////////////////////////////
    // This file should only be executed once
    /////////////////////////////////////////

    // this is particularly an issue when the user has to sign in
    // before starting to use the app
    if (window.__hipchatXHRConfiged__) {
        return;
    }

    window.__hipchatXHRConfiged__ = true;

    /////////////////////////////////////////
    // Register messaging with the parent
    /////////////////////////////////////////
    var appWindow, appOrigin;

    // catch messages from the parent
    function onMessage(e) {
        if (!appWindow || !appOrigin) {
            appWindow = e.source;
            appOrigin = e.origin;
        }
    }

    // send messages to the parent
    // since this is Chrome, we can use JSON objects
    function send(data) {
        if (appWindow && appOrigin) {
            appWindow.postMessage(data, appOrigin);
        }
    }
    
    // create a dedicated notify method
    function notify(opts) {
        return send({
            type: 'notification',
            title: opts.title,
            message: opts.body
        });
    }

    window.addEventListener('message', onMessage);

    /////////////////////////////////////////
    // Overload the Strophe library used by HipChat
    /////////////////////////////////////////
    function attemptToOverloadStrophe() {
        console.log('checking if we can overload');

        var hasStrophe = window.Strophe && Strophe.Request.prototype._newXHR;
        if (!hasStrophe) {
            setTimeout(attemptToOverloadStrophe, 10);
            return;
        }

        // this Strophe override code was copied from the HipChat implementation itself
        // let's hope they never secure it
        var originalXHRFactory = window.Strophe.Request.prototype._newXHR;
        window.Strophe.Request.prototype._newXHR = function () {

            var originalOnReadyStateChange, xhr;
            xhr = originalXHRFactory.bind(this)();
            originalOnReadyStateChange = xhr.onreadystatechange;
            
            xhr.send = (function (child) {
                return function () {
                    var e;
                    
                    var args = Array.prototype.slice.call(arguments);
                    var body = args[0];
                    
                    var augmentedBody = parseBody(body);
                    
                    args[0] = augmentedBody.content;
                    
                    try {
                        return XMLHttpRequest.prototype.send.apply(xhr, args);
//                        return XMLHttpRequest.prototype.send.apply(xhr, arguments);
                    } catch (_error) {
                        e = _error;
                        return Strophe.log(Strophe.LogLevel.WARN, e.message);
                    }
                };
            })(this);
            
            xhr.onreadystatechange = function () {
                if (this.readyState === 1 && !this.withCredentials) {
                    this.withCredentials = true;
                }
                
                // when the request is done, attempt to parse it
//                if (this.readyState === 4 && this.responseURL === 'https://likeabosh.hipchat.com/http-bind/') {
//                    xhr.responseText = parseHttpBindBody(xhr.responseText);
//                }

                return originalOnReadyStateChange.apply(this, arguments);
            };
            
            return xhr;
        };
    }
    attemptToOverloadStrophe();
    
    // overload response text retrieval
    var accessorText = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
    Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
        get: function() {
            var resp = accessorText.get.call(this);
            console.log('getting xhr text:', resp);
            return resp;
        },
        set: function() {
            console.log('setting xhr text');
        },
        configurable: true
    });
    
    // overload response xml retrieval, because that exists apparently
    var accessorXml = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseXML');
    Object.defineProperty(XMLHttpRequest.prototype, 'responseXML', {
        get: function() {
            var resp = accessorXml.get.call(this);
            var newResp;
            
            
            try {
                console.time('parse xml');
                
                // wait, how do you copy an XML object, again?
                var xmlCopyStr = xmlToString(resp);
                var xmlCopy = stringToXml(xmlCopyStr);
                
                newResp = formatResponseXml(xmlCopy);
                
                console.timeEnd('parse xml');
            } catch(e) {
                console.log(e);
                newResp = resp;
            }
            
            console.log('getting xhr xml:', newResp);
            return newResp;
        },
        set: function() {
            console.log('setting xhr xml');
        },
        configurable: true
    });
    
    // lookup table of formatting characters
    // Note: regex format, where _ is the hidden character
    //   /\s_[^_]*_\s/g
    var chars = {};
    chars.bold = {
        xml: '&#x034F;',
        js: '\u034f',
        regex: /\s\u034f[^\u034f]*\u034f\s/g
    };
    chars.link = {
        regex: /([a-zA-Z0-9]{0,}:?\/\/)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
    };
    
    function parseBody(body) {
        var newXml = body;
        
        function returnObj() {
            return {
                content: newXml,
                contentLength: newXml.length
            };
        }
        
        // never let this throw
        try {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(body, 'text/xml');

            var message = xmlDoc.querySelector('message');
            if (!message) { return returnObj(); }

            var bodyEl = message.querySelector('body');
            if (!bodyEl) { return returnObj(); }

            // "May contain basic tags: a, b, i, strong, em, br, img, pre, code, lists, tables."
            // https://www.hipchat.com/docs/api/method/rooms/message
            
//            var orig = bodyEl.innerHTML;
//            bodyEl.innerHTML = '&lt;b&gt;this is a test&lt;/b&gt;';
//            bodyEl.innerHTML = orig + 'a&#x0028;';
            
//            var html = xmlDoc.createElement('html');
//            html.setAttribute('xmlns', 'http://jabber.org/protocol/xhtml-im');
//            
//            var htmlBody = xmlDoc.createElement('body');
//            htmlBody.innerHTML = '<b>this is a test</b>';
//            htmlBody.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
//            
//            html.appendChild(htmlBody);
//            message.appendChild(html);
            
            var serializer = new XMLSerializer();
            newXml = serializer.serializeToString(xmlDoc).trim();
            
//            var temp = newXml.replace(/(?:<body>)[^<]{0,}(?!=<\/body>)/, function(v) { 
//                var tag = v.slice(0,6); 
//                var cont = v.slice(6);
//                
//                return tag + cont + '&#x007F;';
//            });
//
//            newXml = temp;
            
            var bold = '*';
            var boldChar = '\u0080';
            var boldXml = '&#x0080;';
            
            var italic = '_';
            var italicChar = '\0081';
            var italicXml = '&#x0081;';
            
            newXml = newXml.replace(/\*/g, chars.bold.xml);
//                           .replace(/\_/g, italicXml);
            
//            console.log('parsed request body', body.length, newXml.length);

            return returnObj();
        } catch(e) {
            // TODO send error to google analytics
            console.log(e);
            return returnObj();
        }
    }
    
    function stringToXml(str) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(str, 'text/xml');
        return xmlDoc;
    }
    
    function xmlToString(xml) {
        var serializer = new XMLSerializer();
        var str = serializer.serializeToString(xml).trim();
        return str;
    }
    
    var formatter = {
        openCaret: '&lt;',
        closeCaret: '&gt;',
        openTag: function(name) {
            return formatter.openCaret + name + formatter.closeCaret;
        },
        closeTag: function(name) {
            return formatter.openCaret + '/' + name + formatter.closeCaret;
        },
        bold: function(str) {
            return formatter.tag('strong', str);    
        },
        italic: function(str) {
            return formatter.tab('i', str);
        },
        code: function(str) {
            return formatter.tag('code', str);
        },
        link: function(str) {
            var link = str;
            if (!(/:\/\//.test(link))) {
                link = '//' + str;
            }
            
            return (
                formatter.openCaret + 'a href="' + link + '" target="_blank" ' + formatter.closeCaret + 
                    str + 
                formatter.closeTag('a')
            );
        },
        tag: function(name, str) {
            return formatter.openTag(name) + str + formatter.closeTag(name); 
        }
    };
    
    function formatResponseText(str) {
        var xml = stringToXml(str);
        var newXml = formatResponseXml(xml);
        return xmlToString(newXml);
    }
    
    function formatResponseXml(xml) {
        var messages = xml.querySelectorAll('message');
        if (!(messages && messages.length)) { return xml; }

        var messagesArr = Array.prototype.slice.call(messages);
        messagesArr.forEach(function(message) {
            var newMessage = formatMessage(message, xml);
            
            if (message !== newMessage) {
                message.parentElement.replaceChild(newMessage, message);
            }
        });
        
        return xml;
    }
    
    function formatMessage(message, xmlDoc) {
        var body = message.querySelector('body');
        if (!body || body.getAttribute('xmlns')) { return message; }
        
        var orig = body.innerHTML;
        var formatted = orig.replace(chars.bold.regex, function(val) {
            return formatter.bold(val);
        }).replace(chars.link.regex, function(val) {
            return formatter.link(val);
        });
        
        // check if any formatting was applied
//        if (orig === formatted) { return message; }
        
        body.innerHTML = formatted;
        
        
        
//    <x xmlns="http://hipchat.com/protocol/muc#room">
//        <type>system</type>
//        <notify>0</notify>
//        <color>green</color>
//        <message_format>html</message_format>
//    </x>
        
        var x = xmlDoc.createElement('x');
        x.setAttribute('xmlns', "http://hipchat.com/protocol/muc#room");
        
//        var type = xmlDoc.createElement('type');
//        type.innerHTML = 'system';
//        
//        var notify = xmlDoc.createElement('notify');
//        notify.innerHTML = '1';
//        
//        var color = xmlDoc.createElement('color');
//        color.innerHTML = 'gray';
//        
        
        // only the message format it required to switch to HTML, yay!
        var messageFormat = xmlDoc.createElement('message_format');
        messageFormat.innerHTML = 'html';
        
//        x.appendChild(type);
//        x.appendChild(notify);
//        x.appendChild(color);
        x.appendChild(messageFormat);
        
        message.appendChild(x);
        

        var html = xmlDoc.createElement('html');
        html.setAttribute('xmlns', 'http://jabber.org/protocol/xhtml-im');

        var htmlBody = xmlDoc.createElement('body');
        // TODO make this correct HTML, even though HipChat doesn't use it
        htmlBody.innerHTML = orig;
        htmlBody.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

        html.appendChild(htmlBody);
        message.appendChild(html);
        
        return message;
    }
    
} +  '();';

// inject the script into the webview document
(document.head || document.documentElement).appendChild(script);
