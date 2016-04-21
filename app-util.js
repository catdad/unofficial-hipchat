/* jshint browser: true, devel: true */
/* global chrome, analytics */

(function(root) {
    var $ = function(sel) {
        return document.querySelector(sel);
    };

    $.forEach = function(obj, cb, context){
        // check for a native forEach function
        var native = [].forEach,
            hasProp = Object.prototype.hasOwnProperty,
            callback = (typeof cb === 'function') ? cb : function noop() {};

        // if there is a native function, use it
        if (native && obj.forEach === native) {
            //don't bother if there is no function
            obj.forEach(callback, context);
        }
        // if the object is array-like
        else if (obj.length === +obj.length) {
            // loop though all values
            for (var i = 0, length = obj.length; i < length; i++) {
                // call the function with the context and native-like arguments
                callback.call(context, obj[i], i, obj);
            }
        }
        // it's an object, use the keys
        else {
            // loop through all keys
            for (var name in obj) {
                // call the function with context and native-like arguments
                if (hasProp.call(obj, name)) {
                    callback.call(context, obj[name], name, obj);
                }
            }
        }
    };

    $.elem = function(name, className) {
        var el = document.createElement(name);
        
        if (className) {
            el.className = className;
        }
        
        return el;
    };

    $.toggleClass = function(elem, className) {
        if (elem.classList.contains(className)) {
            elem.classList.remove(className);
            return false;
        }

        elem.classList.add(className);
        return true;
    };
    
    root.$ = $;
})(window);
