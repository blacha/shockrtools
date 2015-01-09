// ==UserScript==
// @name            Shockr - Tiberium Alliances Tools
// @author          Shockr <shockr@c.ac.nz>
// @description     Tools to work with Tiberium alliances http://c.ac.nz/taopt
// @include         http*://prodgame*.alliances.commandandconquer.com/*/index.aspx*
// @grant           GM_xmlhttpRequest
// @grant           GM_updatingEnabled
// @grant           unsafeWindow
// @version         4.5.2
// @downloadURL     https://c.ac.nz/client/shockrtools.user.js
// @icon            https://c.ac.nz/favicon.png
// ==/UserScript==

var setupShockrTools = function() {
// import "main.js"
};


var ST_MODULES = window.ST_MODULES = [];
ST_MODULES.push(setupShockrTools);

var setupShockrModules = function() {
    console.time('ST:LoadModules');
// import "ddp.js"
// import "button.js"
// import "basescanner.js"
// import "playerinfo.js"
// import "basescount.js"
// import "supportstats.js"
// import "killinfo.js"
    console.timeEnd('ST:LoadModules');
};
ST_MODULES.push(setupShockrModules);

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