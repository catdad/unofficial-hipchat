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
    if (window.__hipchatXhrBootstrap__) {
        return;
    }

    window.__hipchatXhrBootstrap__ = true;
    
    console.log('EMBEDDING XHR');

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
                    
                    var augmentedBody = encodeFormattingForUpload(body);
                    
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
            return resp;
        },
        set: function() {
//            console.log('setting xhr text');
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
                // wait, how do you copy an XML object, again?
                var xmlCopyStr = xmlToString(resp);
                var xmlCopy = stringToXml(xmlCopyStr);
                
                newResp = formatResponseXml(xmlCopy);
            } catch(e) {
                console.log(e);
                newResp = resp;
            }
            
            return newResp;
        },
        set: function() {
//            console.log('setting xhr xml');
        },
        configurable: true
    });
    
    // lookup table of formatting characters
    // Note: regex format, where _ is the hidden character
    //   /(?:^|\s)_[^_]*_(?:\s|$)/g
    var chars = {
        replaceAt: function(str, idx, newText) {
            return str.substr(0, idx) + newText + str.substr(idx + 1);
        },
        applyStyle: function(str, regex, fromChar, toChar) {
            
            var newStr = str.replace(regex, function(val) {
                var firstIsWS = /\s/.test(val.charAt(0));
                var lastIsWS = /\s/.test(val.charAt(val.length - 1));

                var temp = val.trim();
                
                var first = temp.indexOf(fromChar);
                var last = temp.lastIndexOf(fromChar);
                
                temp = chars.replaceAt(temp, 0, toChar);
                temp = chars.replaceAt(temp, temp.length - 1, toChar);
                
                var res = (firstIsWS ? val.charAt(0) : '') + 
                    temp + 
                   (lastIsWS ? val.charAt(val.length - 1) : '');
                
                return res;
            });
            
            return newStr;            
        }
    };
    chars.bold = {
        // zero width space
        char: '*',
        xml: '&#x200b;',
        js: '\u200b',
        regex: /(?:^|\s)\u200b[^\u200b]*\u200b(?:\s|$)/g,
        test: /\u200b/,
        applyStyle: function(str) {
            var regexp = /(^|\s)\*[^*]*\*(\s|$)/g;
            return chars.applyStyle(str, regexp, chars.bold.char, chars.bold.js);
        },
        parseStyle: function(str) {
            return str.replace(chars.bold.regex, function(val) {
                return formatter.bold(val);
            });
        }
    };
    chars.italic = {
        // zero width non-joiner
        char: '_',
        xml: '&#x200c;',
        js: '\u200c',
        regex: /(?:^|\s)\u200c[^\u200c]*\u200c(?:\s|$)/g,
        test: /\u200c/,
        applyStyle: function(str) {
            var regexp = /(^|\s)_[^_]*_(\s|$)/g;
            return chars.applyStyle(str, regexp, chars.italic.char, chars.italic.js);
        },
        parseStyle: function(str) {
            return str.replace(chars.italic.regex, function(val) {
                return formatter.italic(val);
            });
        }
    };
    chars.code = {
        // zero width joiner
        char: '`',
        xml: '&#x200d;',
        js: '\u200d',
        regex: /(?:^|\s)\u200d[^\u200d]*\u200d(?:\s|$)/g,
        test: /\u200d/,
        applyStyle: function(str) {
            var regexp = /(^|\s)`[^`]*`(\s|$)/g;
            return chars.applyStyle(str, regexp, chars.code.char, chars.code.js);
        },
        parseStyle: function(str) {
            return str.replace(chars.code.regex, function(val) {
                return formatter.code(val);
            });
        }
    };
    // when formatting to an HTML message, links needs to also be parsed
    chars.link = {
        regex: /([a-zA-Z0-9]{0,}:?\/\/)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
    };
    
    function encodeFormattingForUpload(body) {
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

            var orig = bodyEl.innerHTML;
            
            var newText = orig;
            newText = chars.italic.applyStyle(newText);
            newText = chars.bold.applyStyle(newText);
            newText = chars.code.applyStyle(newText);
            
            if (orig !== newText) {
                bodyEl.innerHTML = newText;
            }
            
            newXml = xmlToString(xmlDoc);

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
    
    // "May contain basic tags: a, b, i, strong, em, br, img, pre, code, lists, tables."
    // https://www.hipchat.com/docs/api/method/rooms/message        
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
            return formatter.tag('em', str);
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
            var val = str;
            
            var firstIsWS = /\s/.test(val.charAt(0));
            var lastIsWS = /\s/.test(val.charAt(val.length - 1));

            var temp = val.trim();

            temp = formatter.openTag(name) + temp + formatter.closeTag(name);
            
            var res = (firstIsWS ? val.charAt(0) : '') + 
                temp + 
               (lastIsWS ? val.charAt(val.length - 1) : '');

            return res;
            
            
//            return formatter.openTag(name) + str + formatter.closeTag(name); 
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
        
        var hasBold = chars.bold.test.test(orig);
        var hasItalic = chars.italic.test.test(orig);
        var hasCode = chars.code.test.test(orig);
        
        // if no formatting exist, return the original message
        if (!hasBold && !hasItalic && !hasCode) {
            return message;
        }
        
        // parse for formatting
        var formatted = orig;
        formatted = chars.bold.parseStyle(formatted);
        formatted = chars.italic.parseStyle(formatted);
        formatted = chars.code.parseStyle(formatted);
        
        // check if any formatting was applied
        // it's technically possile that a single hidden char exists
        if (orig === formatted) { return message; }
        
        // if we choose to format, we need to parse for URLs as well
        formatted = formatted.replace(chars.link.regex, function(val) {
            return formatter.link(val);
        });
        
        body.innerHTML = formatted;
        console.log('got formatted message', formatted);
        
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
        
        // TODO make this correct HTML, even though HipChat doesn't use it currently
        var html = xmlDoc.createElement('html');
        html.setAttribute('xmlns', 'http://jabber.org/protocol/xhtml-im');

        var htmlBody = xmlDoc.createElement('body');
        htmlBody.innerHTML = orig;
        htmlBody.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

        html.appendChild(htmlBody);
        message.appendChild(html);
        
        return message;
    }
    
} +  '();';

// inject the script into the webview document
(document.head || document.documentElement).appendChild(script);

// css: 
//.hc-chat-message code, code {
//    font-family: monospace;
//    background-color: rgba(204,202,202,0.46);
//    padding: .05em .2em;
//    border: 1px solid rgba(128,128,128,0.48);
//    border-radius: 2px;
//    font-size: .84rem;
//    line-height: 1.6;
//    vertical-align: bottom;
//}

