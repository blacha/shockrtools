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
ST.log.level = ST.log.WARN;

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
    // URL: 'wss://localhost:443/websocket',
    URL: 'wss://c.ac.nz/websocket',

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

        ddp.on('connected', function() {
            ST.log.info('Websocket connected');
            ST.util.ddp = ddp;
            if (typeof callback === 'function') {
                callback();
            }
        });
    },

    api: function(method, data, callback) {
        if (typeof callback === 'undefined') {
            callback = ST.util.noop;
        }

        if (ST.util.ddp === undefined) {
            return ST.util.connect(function() {
                ST.util.api(method, data, callback);
            });
        }

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