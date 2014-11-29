/* globals ClientLib, qx, webfrontend, ST */
var STBaseCounter = function() {

    var BaseCounter = {
        name: 'BaseCounter',
        ui: {},

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

            // console.log('[' + x + ':' + y + '] Found ' + count + ' bases - ' + output.join(', '));
            if (paste === undefined || paste === true) {
                BaseCounter.pasteOutput(x, y, count, output.join(', '));
            }
            return {
                total: count,
                levels: levelCount,
                formatted: output.join(', ')
            };
        },

        count: function(paste) {
            if (BaseCounter.selectedBase === null || BaseCounter.selectedBase === undefined) {
                return;
            }

            return BaseCounter.countBases(BaseCounter.selectedBase.get_RawX(), BaseCounter.selectedBase.get_RawY(), paste);
        },

        onRegionShow: function(c) {
            var target = c.getTarget();
            var object = target.getLayoutParent().getObject();

            var count = BaseCounter.countBases(object.get_RawX(), object.get_RawY(), false);

            BaseCounter.ui.region.total.setValue(count.total);
            BaseCounter.ui.region.levels.setValue(count.formatted);

            target.add(BaseCounter.ui.region.container);
        },

        onBaseMoveChange: function(x, y) {
            var coord = ClientLib.Base.MathUtil.EncodeCoordId(x, y);
            var count = BaseCounter.moveCache[coord];

            if (count === undefined) {
                count = BaseCounter.countBases(x, y, false);
                BaseCounter.moveCache[coord] = count;
            }

            BaseCounter.ui.move.total.setValue(count.total);
            BaseCounter.ui.move.levels.setValue(count.formatted);
        },

        onBaseMoveDeActivate: function() {
            BaseCounter.moveCache = {};
        },

        onBaseMoveActivate: function() {
            BaseCounter.moveCache = {};
        },

        buildMoveUI: function() {
            BaseCounter.ui.move = {};

            var a = new qx.ui.container.Composite(new qx.ui.layout.HBox(6));
            a.add(new qx.ui.basic.Label('# Forgotten bases:').set({
                alignY: 'middle'
            }));
            BaseCounter.ui.move.total = new qx.ui.basic.Label().set({
                alignY: 'middle',
                font: 'bold',
                textColor: 'text-region-value'
            });
            a.add(BaseCounter.ui.move.total);

            var b = new qx.ui.container.Composite(new qx.ui.layout.HBox(6));
            b.add(new qx.ui.basic.Label('Levels:').set({
                alignY: 'middle'
            }));
            BaseCounter.ui.move.levels = new qx.ui.basic.Label().set({
                alignY: 'middle',
                font: 'bold',
                textColor: 'text-region-value'
            });
            b.add(BaseCounter.ui.move.levels);


            BaseCounter.ui.move.container = new qx.ui.container.Composite(new qx.ui.layout.VBox()).set({
                textColor: 'text-region-tooltip'
            });

            BaseCounter.ui.move.container.add(a);
            BaseCounter.ui.move.container.add(b);
            webfrontend.gui.region.RegionCityMoveInfo.getInstance().addAt(BaseCounter.ui.move.container, 3);
        },

        buildRegionUI: function() {
            BaseCounter.ui.region = {};

            var a = new qx.ui.container.Composite(new qx.ui.layout.HBox(4));
            a.add(new qx.ui.basic.Label('# Forgotten bases:'));
            BaseCounter.ui.region.total = new qx.ui.basic.Label().set({
                textColor: 'text-region-value'
            });
            a.add(BaseCounter.ui.region.total);

            var b = new qx.ui.container.Composite(new qx.ui.layout.HBox(4));
            b.add(new qx.ui.basic.Label('Levels:'));
            BaseCounter.ui.region.levels = new qx.ui.basic.Label().set({
                textColor: 'text-region-value'
            });
            b.add(BaseCounter.ui.region.levels);

            BaseCounter.ui.region.container = new qx.ui.container.Composite(new qx.ui.layout.VBox()).set({
                marginTop: 6,
                textColor: 'text-region-tooltip'
            });

            BaseCounter.ui.region.container.add(a);
            BaseCounter.ui.region.container.add(b);
        },

        startup: function() {
            if (typeof webfrontend.gui.region.RegionCityInfo.prototype.getObject !== 'function') {
                var a = webfrontend.gui.region.RegionCityInfo.prototype.setObject.toString();
                var b = a.match(/^function \(([A-Za-z]+)\)\{.+this\.([A-Za-z_]+)=\1;/)[2];
                webfrontend.gui.region.RegionCityInfo.prototype.getObject = function() {
                    return this[b];
                };
            }

            BaseCounter.bindings = [
                webfrontend.gui.region.RegionCityStatusInfoOwn,
                webfrontend.gui.region.RegionCityStatusInfoAlliance,
                webfrontend.gui.region.RegionCityStatusInfoEnemy,
                webfrontend.gui.region.RegionNPCBaseStatusInfo,
                webfrontend.gui.region.RegionNPCCampStatusInfo,
                webfrontend.gui.region.RegionRuinStatusInfo
            ];

            BaseCounter._listeners = [];
            for (var i = 0; i < BaseCounter.bindings.length; i++) {
                var bind = BaseCounter.bindings[i];
                var bindID = bind.getInstance().addListener('appear', BaseCounter.onRegionShow);
                BaseCounter._listeners[i] = bindID;
            }

            var mouseTool = ClientLib.Vis.VisMain.GetInstance().GetMouseTool(ClientLib.Vis.MouseTool.EMouseTool.MoveBase);
            phe.cnc.Util.attachNetEvent(mouseTool, 'OnCellChange', ClientLib.Vis.MouseTool.OnCellChange, BaseCounter, BaseCounter.onBaseMoveChange);
            phe.cnc.Util.attachNetEvent(mouseTool, 'OnDeactivate', ClientLib.Vis.MouseTool.OnDeactivate, BaseCounter, BaseCounter.onBaseMoveDeActivate);
            phe.cnc.Util.attachNetEvent(mouseTool, 'OnActivate', ClientLib.Vis.MouseTool.OnActivate, BaseCounter, BaseCounter.onBaseMoveActivate);

            BaseCounter.buildRegionUI();
            BaseCounter.buildMoveUI();
            BaseCounter.registerButton();
        },

        destroy: function() {
            for (var i = 0; i < BaseCounter.bindings.length; i++) {
                var bindID = BaseCounter._listeners[i];
                if (bindID !== undefined) {
                    BaseCounter.bindings[i].getInstance().removeListenerById(bindID);
                }
            }
            BaseCounter._listeners = [];

            var mouseTool = ClientLib.Vis.VisMain.GetInstance().GetMouseTool(ClientLib.Vis.MouseTool.EMouseTool.MoveBase);
            phe.cnc.Util.detachNetEvent(mouseTool, 'OnCellChange', ClientLib.Vis.MouseTool.OnCellChange, BaseCounter, BaseCounter.onBaseMoveChange);
            phe.cnc.Util.detachNetEvent(mouseTool, 'OnDeactivate', ClientLib.Vis.MouseTool.OnDeactivate, BaseCounter, BaseCounter.onBaseMoveDeActivate);
            phe.cnc.Util.detachNetEvent(mouseTool, 'OnActivate', ClientLib.Vis.MouseTool.OnActivate, BaseCounter, BaseCounter.onBaseMoveActivate);

            webfrontend.gui.region.RegionCityMoveInfo.getInstance().removeAt(3);
        },

        onShow: function(c) {
            console.log(c);
        },

        registerButton: function() {
            if (!webfrontend.gui.region.RegionCityMenu.prototype.__baseCounterButton_showMenu) {
                webfrontend.gui.region.RegionCityMenu.prototype.__baseCounterButton_showMenu = webfrontend.gui.region.RegionCityMenu.prototype.showMenu;

                webfrontend.gui.region.RegionCityMenu.prototype.showMenu = function(selectedVisObject) {
                    BaseCounter.selectedBase = selectedVisObject;
                    if (this.__baseCounterButton_initialized !== true) {
                        this.__baseCounterButton_initialized = true;

                        this.__baseCountButton = new qx.ui.form.Button('Paste BaseCount');
                        this.__baseCountButton.addListener('execute', function() {
                            BaseCounter.count();
                        });
                    }


                    if (BaseCounter.lastBase !== BaseCounter.selectedBase) {
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