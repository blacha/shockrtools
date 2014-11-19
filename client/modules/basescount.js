/* globals ClientLib, qx, webfrontend, ST */
var STBaseCounter = function() {

    var BaseCounter = {
        name: 'BaseCounter',

        pasteOutput: function(x, y, baseCount, baseData) {
            var input = qx.core.Init.getApplication().getChat().getChatWidget().getEditable();
            var dom = input.getContentElement().getDomElement();

            var output = [];
            output.push(dom.value.substring(0, dom.selectionStart));
            output.push('[[coords]' + x + ':' + y + '[/coords]] Found ' + baseCount + ' Bases - ' + baseData);
            output.push(dom.value.substring(dom.selectionEnd, dom.value.length));

            input.setValue(output.join(' '));
        },

        countBases: function(x, y, paste) {
            var levelCount = [];
            var count = 0;
            var maxAttack = ClientLib.Data.MainData.GetInstance().get_Server().get_MaxAttackDistance();
            var world = ClientLib.Data.MainData.GetInstance().get_World();
            for (var scanY = y - 10; scanY <= y + 10; scanY++) {
                for (var scanX = x - 10; scanX <= x + 10; scanX++) {
                    var distX = Math.abs(x - scanX);
                    var distY = Math.abs(y - scanY);
                    var distance = Math.sqrt((distX * distX) + (distY * distY));
                    // too far away to scan
                    if (distance >= maxAttack) {
                        continue;
                    }

                    var object = world.GetObjectFromPosition(scanX, scanY);
                    // Nothing to scan
                    if (object === null) {
                        continue;
                    }

                    // Object isnt a NPC Base/Camp/Outpost
                    if (object.Type !== ClientLib.Data.WorldSector.ObjectType.NPCBase) {
                        continue;
                    }

                    if (typeof object.getCampType === 'function' && object.getCampType() === ClientLib.Data.Reports.ENPCCampType.Destroyed) {
                        continue;
                    }

                    if (typeof object.getLevel !== 'function') {
                        BaseCounter._patchClientLib();
                    }

                    var level = object.getLevel();
                    levelCount[level] = (levelCount[level] || 0) + 1;

                    count++;
                }
            }

            var output = [];
            for (var i = 0; i < levelCount.length; i++) {
                var lvl = levelCount[i];
                if (lvl !== undefined) {
                    output.push(lvl + ' x ' + i);
                }
            }

            console.log('[' + x + ':' + y + '] Found ' + count + ' bases - ' + output.join(', '));
            if (paste === undefined || paste === true){
                BaseCounter.pasteOutput(x, y, count, output.join(', '));
            }
            return {total: count, levels: levelCount};
        },

        count: function(paste) {
            if (BaseCounter.selectedBase === null || BaseCounter.selectedBase === undefined) {
                return;
            }

            return BaseCounter.countBases(BaseCounter.selectedBase.get_RawX(), BaseCounter.selectedBase.get_RawY(), paste);
        },

        startup: function() {
            BaseCounter.registerButton();
        },

        destroy: function() {
            if ( webfrontend.gui.region.RegionCityMenu.prototype.__baseCounterButton_showMenu ){
                webfrontend.gui.region.RegionCityMenu.prototype.showMenu = webfrontend.gui.region.RegionCityMenu.prototype.__baseCounterButton_showMenu;
                webfrontend.gui.region.RegionCityMenu.prototype.__baseCounterButton_initialized = false;
                webfrontend.gui.region.RegionCityMenu.prototype.__baseCounterButton_showMenu = undefined;
            }
        },

        registerButton: function() {
            if (!webfrontend.gui.region.RegionCityMenu.prototype.__baseCounterButton_showMenu) {
                webfrontend.gui.region.RegionCityMenu.prototype.__baseCounterButton_showMenu = webfrontend.gui.region.RegionCityMenu.prototype.showMenu;

                webfrontend.gui.region.RegionCityMenu.prototype.showMenu = function(selectedVisObject) {
                    BaseCounter.selectedBase = selectedVisObject;
                    if (this.__baseCounterButton_initialized !== true) {
                        this.__baseCounterButton_initialized = true;

                        this.__baseCountButton = new qx.ui.form.Button('Paste BaseCount');
                        this.__baseCountButton.addListener('execute', function(){
                            BaseCounter.count();
                        });
                    }


                    if (BaseCounter.lastBase !== BaseCounter.selectedBase){
                        var count = BaseCounter.count(false);
                        this.__baseCountButton.setLabel('Bases: ' + count.total);
                        BaseCounter.lastBase = BaseCounter.selectedBase;
                    }
                    // console.log(children);
                    this.__baseCounterButton_showMenu(selectedVisObject);
                    switch (selectedVisObject.get_VisObjectType()) {
                        case ClientLib.Vis.VisObject.EObjectType.RegionNPCCamp:
                        case ClientLib.Vis.VisObject.EObjectType.RegionNPCBase:
                        case ClientLib.Vis.VisObject.EObjectType.RegionPointOfInterest:
                        case ClientLib.Vis.VisObject.EObjectType.RegionRuin:
                        case ClientLib.Vis.VisObject.EObjectType.RegionHubControl:
                        case ClientLib.Vis.VisObject.EObjectType.RegionHubServer:
                        case ClientLib.Vis.VisObject.EObjectType.RegionCityType:
                            this.add(this.__baseCountButton);
                            break;
                        default:
                            console.log(selectedVisObject.get_VisObjectType());
                    }
                };
            }

        },

        _patchClientLib: function() {
            var proto = ClientLib.Data.WorldSector.WorldObjectNPCBase.prototype;
            var re = /100\){0,1};this\.(.{6})=Math.floor.*d\+=f;this\.(.{6})=\(/;
            var x = ST.util._g(proto.$ctor, re, 'ClientLib.Data.WorldSector.WorldObjectNPCBase', 2);
            if (x !== null && x[1].length === 6) {
                proto.getLevel = function() {
                    return this[x[1]];
                };
            } else {
                console.error('Error - ClientLib.Data.WorldSector.WorldObjectNPCBase.Level undefined');
            }
        }

    };

    ST.register(BaseCounter);
};


var ST_MODULES = window.ST_MODULES || [];
ST_MODULES.push(STBaseCounter);


