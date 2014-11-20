var STBaseScanner = function() {
    /* globals ClientLib, phe, ST */
    var MAX_FAILS = 25;

    var BaseScanner = {
        name: 'BaseScanner',

        _patched: false,
        _bases: {},
        _selectionBases: {},
        failCount: 0,

        scan: function() {
            if (BaseScanner._scanning) {
                return;
            }

            BaseScanner._bases = {};

            BaseScanner._scanning = true;

            BaseScanner.index = -1;
            BaseScanner._toScanMap = {};
            BaseScanner._toScan = [];

            var allCities = ClientLib.Data.MainData.GetInstance().get_Cities().get_AllCities().d;
            for (var selectedBaseID in allCities) {
                if (!allCities.hasOwnProperty(selectedBaseID)) {
                    continue;
                }

                var selectedBase = allCities[selectedBaseID];
                if (selectedBase === undefined) {
                    throw new Error('unable to find base: ' + selectedBaseID);
                }

                BaseScanner.getNearByBases(selectedBase);
            }

            BaseScanner.scanNextBase();
        },

        getNearByBases: function(base) {
            var x = base.get_PosX();
            var y = base.get_PosY();

            var maxAttack = ClientLib.Data.MainData.GetInstance().get_Server().get_MaxAttackDistance() - 0.5;
            var world = ClientLib.Data.MainData.GetInstance().get_World();
            ST.log.debug('[BaseScanner] Scanning from ' + x + ':' + y);
            var toScanCount = 0;
            for (var scanY = y - 11; scanY <= y + 11; scanY++) {
                for (var scanX = x - 11; scanX <= x + 11; scanX++) {
                    var distX = Math.abs(x - scanX);
                    var distY = Math.abs(y - scanY);
                    var distance = Math.sqrt((distX * distX) + (distY * distY));
                    // too far away to scan
                    if (distance >= maxAttack) {
                        continue;
                    }
                    // already scanning this base from another city.
                    if (BaseScanner._toScanMap[scanX + ':' + scanY] !== undefined) {
                        continue;
                    }

                    var object = world.GetObjectFromPosition(scanX, scanY);
                    // Nothing to scan
                    if (object === null) {
                        continue;
                    }


                    // Object isnt a NPC Base/Camp/Outpost
                    if (object.Type !== ClientLib.Data.WorldSector.ObjectType.NPCBase && object.Type !== ClientLib.Data.WorldSector.ObjectType.NPCCamp) {
                        continue;
                    }

                    if (typeof object.getCampType === 'function' && object.getCampType() === ClientLib.Data.Reports.ENPCCampType.Destroyed) {
                        continue;
                    }

                    // Cached
                    var offlineBase = BaseScanner.getOfflineBase(scanX, scanY);
                    if (offlineBase !== null && offlineBase.id === object.getID()) {
                        delete offlineBase.obj;
                        BaseScanner._bases[scanX + ':' + scanY] = offlineBase;
                        continue;
                    }

                    var scanBase = {
                        x: scanX,
                        y: scanY,
                        level: object.getLevel(),
                        id: object.getID(),
                        distance: distance,
                        selectedBaseID: base.get_Id(),
                        alliance: ClientLib.Data.MainData.GetInstance().get_Alliance().get_Id(),
                        failCount: 0
                    };

                    BaseScanner._toScan.push(scanBase);
                    BaseScanner._toScanMap[scanX + ':' + scanY] = scanBase;
                    toScanCount++;
                }
            }

            ST.log.info('[BaseScanner] Found ' + toScanCount + ' new bases to scan from:' + base.get_Name());

        },

        abort: function() {
            BaseScanner._scanning = false;
            BaseScanner._abort = true;
        },

        getBaseLayout: function(base) {
            if (BaseScanner._abort) {
                BaseScanner._abort = false;
                BaseScanner._scanning = false;
                return ST.log.info('[BaseScanner] aborting');
            }

            if (base === undefined) {
                BaseScanner._abort = false;
                BaseScanner._scanning = false;
                ST.util.button.setLabel('Scan');
                return;
            }

            if (BaseScanner._lastBaseID !== base.selectedBaseID) {
                BaseScanner.setCurrentBase(base.selectedBaseID);
            }

            // var currentCity = ClientLib.Data.MainData.GetInstance().get_Cities().get_CurrentOwnCity();
            // var world = ClientLib.Data.MainData.GetInstance().get_World();
            ClientLib.Data.MainData.GetInstance().get_Cities().set_CurrentCityId(base.id);
            var scanBase = ClientLib.Data.MainData.GetInstance().get_Cities().GetCity(base.id);

            var comm = ClientLib.Net.CommunicationManager.GetInstance();
            comm.UserAction();

            // base was destroyed.
            if (scanBase.get_IsGhostMode()) {
                return BaseScanner.scanNextBase();
            }

            // Base hasnt loaded yet.
            if (scanBase.GetBuildingsConditionInPercent() === 0) {
                base.failCount++;
                if (base.failCount === MAX_FAILS) {
                    return BaseScanner.scanNextBase();
                }

                return setTimeout(function() {
                    BaseScanner.getBaseLayout(base);
                }, 100);
            }

            var baseName = scanBase.get_Name();
            if (baseName !== 'Camp' && baseName !== 'Outpost' && baseName !== 'Base') {
                return BaseScanner.scanNextBase();
            }

            base.layout = BaseScanner.getLayout(scanBase);
            base.name = baseName;

            BaseScanner._bases[base.x + ':' + base.y] = base;

            // cache the base in local storage
            ST.storage.set('base-' + base.x + ':' + base.y, base);


            var data = {
                'base': base,
                'world': ClientLib.Data.MainData.GetInstance().get_Server().get_WorldId(),
                'player': ClientLib.Data.MainData.GetInstance().get_Player().get_Name()
            };

            ST.util.api('scanBase', data, function() {
                BaseScanner.printScanResults(base);
            });

            BaseScanner.scanNextBase();
        },

        scanNextBase: function() {
            if (BaseScanner.index === undefined) {
                BaseScanner.index = 0;
            } else {
                BaseScanner.index++;
            }

            var base = BaseScanner._toScan[BaseScanner.index];

            BaseScanner.getBaseLayout(base);
        },

        isScanning: function() {
            return BaseScanner._scanning === true;
        },

        printScanResults: function(base) {
            ST.util.button.setLabel(('   ' + BaseScanner.index).slice(-3) + '/' + BaseScanner._toScan.length);
            console.log('[' + ('   ' + BaseScanner.index).slice(-3) + '/' + BaseScanner._toScan.length + ']\t' + base.x + ':' + base.y + ' ' + base.layout + ' (' + base.failCount + ')');
        },

        getLayout: function(base) {
            var layout = [];
            for (var y = 0; y < 16; y++) {
                for (var x = 0; x < 9; x++) {
                    var resourceType = base.GetResourceType(x, y);

                    switch (resourceType) {
                        case 0:
                            // Nothing
                            layout.push('.');
                            break;
                        case 1:
                            // Crystal
                            layout.push('c');
                            break;
                        case 2:
                            // Tiberium
                            layout.push('t');
                            break;
                        case 4:
                            // Woods
                            layout.push('j');
                            break;
                        case 5:
                            // Scrub
                            layout.push('h');
                            break;
                        case 6:
                            // Oil
                            layout.push('l');
                            break;
                        case 7:
                            // Swamp
                            layout.push('k');
                            break;
                    }
                }
            }
            return layout.join('');
        },

        setCurrentBase: function(baseID) {
            var allCities = ClientLib.Data.MainData.GetInstance().get_Cities().get_AllCities().d;
            var selectedBase = allCities[baseID];

            ClientLib.Vis.VisMain.GetInstance().CenterGridPosition(selectedBase.get_PosX(), selectedBase.get_PosY());
            ClientLib.Vis.VisMain.GetInstance().Update();
            ClientLib.Vis.VisMain.GetInstance().ViewUpdate();
            BaseScanner._lastBaseID = baseID;
        },

        getOfflineBase: function(x, y) {
            return ST.storage.get('base-' + x + ':' + y);

        },

        startup: function() {
            PatchClientLib.patch();
            // Listen for base changes
            phe.cnc.Util.attachNetEvent(ClientLib.Vis.VisMain.GetInstance(),
                'SelectionChange', ClientLib.Vis.SelectionChange,
                BaseScanner, BaseScanner.onSelectionChange);
        },

        destroy: function() {
            phe.cnc.Util.detachNetEvent(ClientLib.Vis.VisMain.GetInstance(),
                'SelectionChange', ClientLib.Vis.SelectionChange,
                BaseScanner, BaseScanner.onSelectionChange);
        },

        onSelectionChange: function() {
            BaseScanner.failCount = 0;
            try {
                // Maybe we caused the change in selection
                if (BaseScanner.isScanning()) {
                    return;
                }

                if (BaseScanner.selectionChange !== undefined) {
                    clearTimeout(BaseScanner.selectionChange);
                    BaseScanner.selectionChange = undefined;
                }
                var currentObj = ClientLib.Vis.VisMain.GetInstance().get_SelectedObject();
                if (currentObj === null) {
                    return;
                }

                var currentType = currentObj.get_VisObjectType();
                if (currentType === ClientLib.Vis.VisObject.EObjectType.RegionNPCCamp ||
                    currentType === ClientLib.Vis.VisObject.EObjectType.RegionNPCBase) {
                    BaseScanner.scanCurrentBase();
                }

            } catch (e) {
                ST.log.warn('Error in selection change', e);
            }
        },

        scanCurrentBase: function() {
            var cities = ClientLib.Data.MainData.GetInstance().get_Cities();
            var base = cities.get_CurrentCity();
            BaseScanner.failCount++;
            if (BaseScanner.failCount > MAX_FAILS) {
                return;
            }

            if (base === null) {
                BaseScanner.selectionChange = setTimeout(BaseScanner.scanCurrentBase, 100);
                return;
            }


            var obj = {
                x: base.get_PosX(),
                y: base.get_PosY(),
                id: base.get_Id()
            };

            // already scanned
            var offlineBase = BaseScanner.getOfflineBase(obj.x, obj.y);
            if (offlineBase !== null && offlineBase.id === obj.id) {
                delete offlineBase.obj;
                BaseScanner._bases[obj.x + ':' + obj.y] = offlineBase;
                BaseScanner.failCount = 0;
                return;
            }

            if (base.get_IsGhostMode()) {
                BaseScanner.failCount = 0;
                return;
            }

            if (base.GetBuildingsConditionInPercent() === 0) {
                BaseScanner.selectionChange = setTimeout(BaseScanner.scanCurrentBase, 100);
                return;
            }

            BaseScanner.failCount = 0;

            var baseName = base.get_Name();
            if (baseName !== 'Camp' && baseName !== 'Outpost' && baseName !== 'Base') {
                return;
            }

            obj.layout = BaseScanner.getLayout(base);
            obj.name = baseName;
            obj.alliance = ClientLib.Data.MainData.GetInstance().get_Alliance().get_Id();

            BaseScanner._bases[obj.x + ':' + obj.y] = obj;
            BaseScanner._selectionBases[obj.x + ':' + obj.y] = obj;

            // cache the base in local storage
            ST.storage.set('base-' + obj.x + ':' + obj.y, JSON.stringify(obj));
            ST.log.info('[BaseScanner:AutoScan] ' + obj.x + ':' + obj.y + ' ' + obj.layout);

            var data = {
                'base': obj,
                'world': ClientLib.Data.MainData.GetInstance().get_Server().get_WorldId(),
                'player': ClientLib.Data.MainData.GetInstance().get_Player().get_Name()
            };

            ST.util.api('scanBase', data, function() {
                console.log('SAVED BASE', data, arguments);
                ST.util.button.setLabel('Scan');
            });
        }
    };


    var PatchClientLib = {
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

        patch: function() {
            if (BaseScanner._patched) {
                return;
            }

            var t = ClientLib.Data.WorldSector.WorldObjectCity.prototype;
            var re = /this\.(.{6})=\(?\(?g>>8\)?\&.*d\+=f;this\.(.{6})=\(/;
            var y = PatchClientLib._g(t.$ctor, re, ClientLib.Data.WorldSector.WorldObjectCity, 2);
            if (y !== null && y[1].length === 6) {
                t.getLevel = function() {
                    return this[y[1]];
                };
            } else {
                console.error('Error - ClientLib.Data.WorldSector.WorldObjectCity.Level undefined');
            }
            if (y !== null && y[2].length === 6) {
                t.getID = function() {
                    return this[y[2]];
                };
            } else {
                console.error('Error - ClientLib.Data.WorldSector.WorldObjectCity.ID undefined');
            }

            t = ClientLib.Data.WorldSector.WorldObjectNPCBase.prototype;
            re = /100\){0,1};this\.(.{6})=Math.floor.*d\+=f;this\.(.{6})=\(/;
            var x = PatchClientLib._g(t.$ctor, re, 'ClientLib.Data.WorldSector.WorldObjectNPCBase', 2);
            if (x !== null && x[1].length === 6) {
                t.getLevel = function() {
                    return this[x[1]];
                };
            } else {
                console.error('Error - ClientLib.Data.WorldSector.WorldObjectNPCBase.Level undefined');
            }
            if (x !== null && x[2].length === 6) {
                t.getID = function() {
                    return this[x[2]];
                };
            } else {
                console.error('Error - ClientLib.Data.WorldSector.WorldObjectNPCBase.ID undefined');
            }

            t = ClientLib.Data.WorldSector.WorldObjectNPCCamp.prototype;
            re = /100\){0,1};this\.(.{6})=Math.floor.*this\.(.{6})=\(*g\>\>(22|0x16)\)*\&.*=-1;\}this\.(.{6})=\(/;
            var w = PatchClientLib._g(t.$ctor, re, 'ClientLib.Data.WorldSector.WorldObjectNPCCamp', 4);
            if (w !== null && w[1].length === 6) {
                t.getLevel = function() {
                    return this[w[1]];
                };
            } else {
                console.error('Error - ClientLib.Data.WorldSector.WorldObjectNPCCamp.Level undefined');
            }
            if (w !== null && w[2].length === 6) {
                t.getCampType = function() {
                    return this[w[2]];
                };
            } else {
                console.error('Error - ClientLib.Data.WorldSector.WorldObjectNPCCamp.CampType undefined');
            }
            if (w !== null && w[4].length === 6) {
                t.getID = function() {
                    return this[w[4]];
                };
            } else {
                console.error('Error - ClientLib.Data.WorldSector.WorldObjectNPCCamp.ID undefined');
            }

            BaseScanner._patched = true;
        }
    };



    ST.register(BaseScanner);
};


var ST_MODULES = window.ST_MODULES || [];
ST_MODULES.push(STBaseScanner);