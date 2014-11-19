// ==UserScript==
// @name            Shockr - Tiberium Alliances Tools
// @author          Shockr <shockr@c.ac.nz>
// @description     Tools to work with Tiberium alliances http://c.ac.nz/taopt
// @include         http*://prodgame*.alliances.commandandconquer.com/*/index.aspx*
// @grant           GM_xmlhttpRequest
// @grant           GM_updatingEnabled
// @grant           unsafeWindow
// @version         4.0
// @downloadURL     https://c.ac.nz/beta/client/shockrtools.user.js
// ==/UserScript==

/* globals qx, ClientLib, DDP */
var setupShockrTools = function() {
    var ST = window.ST || {};
    ST.modules = [];

    ST.register = function(module) {
        ST[module.name.toLowerCase()] = module;
        ST[module.name] = module;

        for (var i = 0; i < ST.modules.length; i++) {
            var stMod = ST.modules[i];
            if (stMod.name === module.name) {
                ST.log.info('Destroy [' + module.name + ']');
                if (typeof stMod.destroy === 'function') {
                    stMod.destroy();
                }
                ST.modules.slice(i, 1);
                break;
            }
        }

        ST.modules.push(module);

        if (ST.util.isLoaded() === false) {
            return;
        }
        if (typeof module.startup === 'function') {
            module.startup();
        }
    };

    ST.startup = function() {
        if (ST.config === undefined) {
            ST.config = ST.storage.get('config') || {};
        }

        if (ST.util.isLoaded() === false) {
            setTimeout(function() {
                ST.startup();
            }, 1000);
            return;
        }

        ST.modules.forEach(function(o) {
            if (ST.config[o.name.toLowerCase()] === false) {
                return ST.log.info('Skipping [' + o.name + '] as its disabled');
            }

            ST.log.info('Starting [' + o.name + ']');
            if (typeof o.startup === 'function') {
                o.startup();
            }
        });
    };

    ST.log = function() {
        console.log.apply(console, arguments);
    };
    ST.log.WARN = 40;
    ST.log.INFO = 30;
    ST.log.DEBUG = 20;
    ST.log.level = ST.log.DEBUG;

    ST.log.info = function() {
        if (ST.log.level > ST.log.INFO) {
            return;
        }
        ST.log(arguments);
    };

    ST.log.warn = function() {
        if (ST.log.level > ST.log.WARN) {
            return;
        }

        ST.log(arguments);
    };

    ST.log.debug = function() {
        if (ST.log.level > ST.log.DEBUG) {
            return;
        }

        ST.log(arguments);
    };

    // Wrap localStorage
    // - Prefix keys with "ST:"
    // - Automatically convert to/from JSON
    // - Remove item if setting null or undefined
    ST.storage = {};
    ST.storage.get = function(key) {
        var value = localStorage.getItem('ST:' + key);
        if (value === null) {
            return value;
        }
        return JSON.parse(value);
    };

    ST.storage.set = function(key, value) {
        if (value === null || value === undefined) {
            return ST.storage.remove(key);
        }
        if (typeof value !== 'string') {
            value = JSON.stringify(value);
        }

        return localStorage.setItem('ST:' + key, value);
    };

    ST.storage.remove = function(key) {
        return localStorage.removeItem('ST:' + key);
    };


    ST.util = {
        URL: 'wss://localhost:443/websocket',
        // URL: 'http://localhost:44556/beta/api/',

        isLoaded: function() {
            if (typeof qx === 'undefined') {
                return false;
            }

            var a = qx.core.Init.getApplication();
            if (a === null || a === undefined) {
                return false;
            }

            var mb = qx.core.Init.getApplication().getMenuBar();
            if (mb === null || mb === undefined) {
                return false;
            }

            var md = ClientLib.Data.MainData.GetInstance();
            if (md === null || md === undefined) {
                return false;
            }

            var player = md.get_Player();
            if (player === null || player === undefined) {
                return false;
            }

            if (player.get_Name() === '') {
                return false;
            }

            return true;
        },

        connect: function(callback) {
            var options = {
                endpoint: ST.util.URL,
                SocketConstructor: WebSocket
            };

            var ddp = new DDP(options);

            ddp.on('connected', function(){
                ST.log.info('Websocket connected');
                ST.util.ddp = ddp;
                if (typeof callback === 'function') {
                    callback();
                }
            });
        },

        api: function(method, data, callback) {
            if (typeof callback === 'undefined'){
                callback = ST.util.noop;
            }

            if (ST.util.ddp === undefined){
                return ST.util.connect(function () {
                    ST.util.api(method, data, callback);
                });
            }

            ST.log.info('API', method, data);
            ST.util.ddp.method(method, [data], callback);
        },

        alert: function(message) {
            window.alert(message);
        },

        handleError: function() {
            console.log('Error Caught:', arguments);
        },

        noop: function() {},

        _g: function(k, r, q, m) {
            var p = [];
            var o = k.toString();
            var n = o.replace(/\s/gim, '');
            p = n.match(r);
            var l;
            for (l = 1; l < (m + 1); l++) {
                if (p !== null && p[l].length === 6) {
                    console.debug(q, l, p[l]);
                } else {
                    if (p !== null && p[l].length > 0) {
                        console.warn(q, l, p[l]);
                    } else {
                        console.error('Error - ', q, l, 'not found');
                        console.warn(q, n);
                    }
                }
            }
            return p;
        },

        // Empty button until one gets made for us.
        button: {
            setLabel: function() {}
        }
    };

    window.ST = ST;

    ST.startup();

    window.onerror = function() {
        ST.util.handleError(arguments);
    };
};



var ST_MODULES = window.ST_MODULES = [];
ST_MODULES.push(setupShockrTools);

// import "ddp.js"
// import "button.js"
// import "basescanner.js"
// import "playerinfo.js"
// import "basescount.js"
// import "supportstats.js"

function innerHTML(functions) {
    var output = [];
    for (var i = 0; i < functions.length; i++) {
        var func = functions[i];
        output.push('try {(  ' + func.toString() + ')()' +
            '} catch(e) { console.log("Error Registering function", e);};');
    }
    return output.join('\n\n');
}

if (window.location.pathname !== ('/login/auth')) {
    var script = document.createElement('script');
    script.innerHTML = innerHTML(ST_MODULES);
    script.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(script);
}