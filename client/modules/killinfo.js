var KillInfo = {
    name: 'KillInfo',
    /* globals $I */
    startup: function() {

        KillInfo.findPrototype();

        if (KillInfo.protoName === undefined) {
            ST.log.warn('ST:KillInfo - Cant find prototype');
            return;
        }
        var proto = $I[KillInfo.protoName];
        if (proto === undefined ||
            proto.prototype[KillInfo.funcName] === undefined) {
            ST.log.warn('ST:KillInfo - Cant find function');
            return;
        }

        KillInfo.oldFunc = proto.prototype[KillInfo.funcName];
        proto.prototype[KillInfo.funcName] = function(c) {
            if (typeof c.get_UnitDetails !== 'function') {
                return KillInfo.oldFunc.call(this, c);
            }

            KillInfo.oldFunc.call(this, c);
            if (ClientLib.Vis.VisMain.GetInstance().get_MouseMode() !== 0) {
                return;
            }

            var unit = c.get_UnitDetails();
            // TODO adjust plunder to hp
            // Does modifying the plunder object have any other effects
            // var hp = unit.get_HitpointsPercent();
            var plunder = unit.get_UnitLevelRepairRequirements();
            var data = unit.get_UnitGameData_Obj();

            if (this[KillInfo.internalObj] !== null) {
                this[KillInfo.internalObj][KillInfo.showFunc](data.dn, data.ds, plunder, '');
            }
        };
    },

    findPrototype: function() {
        var funcNameMatch = '"tnf:full hp needed to upgrade")';
        var funcContentMatch = 'DefenseTerrainFieldType';
        var funcName = '';

        function searchFunction(proto) {
            for (var j in proto) {
                if (j.length !== 6) {
                    continue;
                }
                var func = proto[j];
                if (typeof func === 'function') {
                    var str = func.toString();
                    if (str.indexOf(funcNameMatch) !== -1) {
                        console.log(j);
                        return j;
                    }
                }
            }
            return '';
        }

        for (var i in $I) {
            var obj = $I[i];
            if (obj.prototype === undefined) {
                continue;
            }
            if (funcName === '') {
                funcName = searchFunction(obj.prototype);
                if (funcName === '') {
                    continue;
                }
            }
            var func = obj.prototype[funcName];
            if (func === undefined) {
                continue;
            }
            var str = func.toString();

            // not the particular version we are looking for
            if (str.indexOf(funcContentMatch) === -1) {
                continue;
            }

            KillInfo.protoName = i;
            KillInfo.funcName = funcName;

            var matches = str.match(/(.{6}).(.{6})\(d,e,i,f\)/);
            if (matches !== null && matches.length === 3) {
                KillInfo.internalObj = matches[1];
                KillInfo.showFunc = matches[2];
            }

        }

    },

    destroy: function() {
        if (KillInfo.oldFunc === undefined) {
            return;
        }
        // reset the function
        $I[KillInfo.protoName].prototype[KillInfo.funcName] = KillInfo.oldFunc;
        KillInfo.oldFunc = undefined;
    }

};

ST.register(KillInfo);