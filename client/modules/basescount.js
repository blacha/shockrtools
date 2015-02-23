/* globals ClientLib, qx, webfrontend, ST */

var BaseCounter = {
    name: 'BaseCounter',
    ui: {},

    pasteOutput: function(x, y, baseCount, baseData, waves, average) {
        var input = qx.core.Init.getApplication().getChat().getChatWidget().getEditable();
        var dom = input.getContentElement().getDomElement();

        var output = [];
        output.push(dom.value.substring(0, dom.selectionStart));
        output.push('[coords]' + x + ':' + y + '[/coords] [' + baseCount + ' Bases (' + waves + ' waves): ' + baseData + ' (' + average + ')]');
        output.push(dom.value.substring(dom.selectionEnd, dom.value.length));

        input.setValue(output.join(' '));
    },

    pasteCoords: function () {
        if (BaseCounter.selectedBase === null || BaseCounter.selectedBase === undefined) {
            return;
        }
        var input = qx.core.Init.getApplication().getChat().getChatWidget().getEditable();
        var dom = input.getContentElement().getDomElement();

        var output = [];
        output.push(dom.value.substring(0, dom.selectionStart));
        output.push('[coords]' + BaseCounter.selectedBase.get_RawX() + ':' + BaseCounter.selectedBase.get_RawY() + '[/coords]');
        output.push(dom.value.substring(dom.selectionEnd, dom.value.length));

        input.setValue(output.join(' '));
    },

    countBases: function(x, y, paste) {
        var levelCount = [];
        var count = 0;
        var waves = 1;
        var average = 0;
        var maxAttack = 10;
        var world = ClientLib.Data.MainData.GetInstance().get_World();
        for (var scanY = y - 11; scanY <= y + 11; scanY++) {
            for (var scanX = x - 11; scanX <= x + 11; scanX++) {
                var distX = Math.abs(x - scanX);
                var distY = Math.abs(y - scanY);
                var distance = Math.sqrt((distX * distX) + (distY * distY));
                // too far away to scan
                if (distance > maxAttack) {
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

                average += level;
                count++;
            }
        }

        if(count > 49) {
            waves = 5;
        } else if(count > 39) {
            waves = 4;
        } else if(count > 29) {
            waves = 3;
        } else if(count > 19) {
            waves = 2;
        }

        if(average !== 0){
            average /= count;
        }

        var output = [];

        for (var i = 0; i < levelCount.length; i++) {
            var lvl = levelCount[i];
            if (lvl !== undefined) {
                if (paste === undefined || paste === true) {
                    output.push(lvl + 'x' + i);
                } else {
                    output.push(lvl + 'x ' + i);
                }
            }
        }

        if (paste === undefined || paste === true) {
            BaseCounter.pasteOutput(x, y, count, output.join(' '), waves, average.toFixed(2));
        }

        return {
            total: count,
            levels: levelCount,
            formatted: output.join(' '),
            waves: waves,
            average: average.toFixed(2)
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
        BaseCounter.ui.region.waves.setValue(' (' + count.waves + ' waves)');
        BaseCounter.ui.region.average.setValue(' (' + count.average + ')');

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
        BaseCounter.ui.move.waves.setValue(' (' + count.waves + ' waves)');
        BaseCounter.ui.move.average.setValue(' (' + count.average + ')');
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

        BaseCounter.ui.move.waves = new qx.ui.basic.Label().set({
            textColor: 'text-region-value'
        });
        a.add(BaseCounter.ui.move.waves);

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

        BaseCounter.ui.move.average = new qx.ui.basic.Label().set({
            textColor: 'text-region-value'
        });
        b.add(BaseCounter.ui.move.average);

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

        BaseCounter.ui.region.waves = new qx.ui.basic.Label().set({
            textColor: 'text-region-value'
        });
        a.add(BaseCounter.ui.region.waves);

        var b = new qx.ui.container.Composite(new qx.ui.layout.HBox(4));
        b.add(new qx.ui.basic.Label('Levels:'));
        BaseCounter.ui.region.levels = new qx.ui.basic.Label().set({
            textColor: 'text-region-value'
        });
        b.add(BaseCounter.ui.region.levels);

        BaseCounter.ui.region.average = new qx.ui.basic.Label().set({
            textColor: 'text-region-value'
        });
        b.add(BaseCounter.ui.region.average);

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
            webfrontend.gui.region.RegionRuinStatusInfo,
            webfrontend.gui.region.RegionPointOfInterestStatusInfo
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
        if (!webfrontend.gui.region.RegionCityMenu.prototype.__countButton_showMenu) {
            webfrontend.gui.region.RegionCityMenu.prototype.__countButton_showMenu = webfrontend.gui.region.RegionCityMenu.prototype.showMenu;
            webfrontend.gui.region.RegionCityMenu.prototype.showMenu = function (selectedVisObject) {

                var self = this;
                BaseCounter.selectedBase = selectedVisObject;

                if (this.__countButton_initialized != 1) {
                    this.__countButton_initialized = 1;

                    this.__coordButton = [];
                    this.__countButton = [];

                    this.__countComposite = new qx.ui.container.Composite(new qx.ui.layout.VBox(0)).set({
                        padding: 2
                    });

                    for (var i in this) {
                        try {
                            if (this[i] && this[i].basename == "Composite") {
                                var coordbutton = new qx.ui.form.Button("Paste Coords");
                                coordbutton.addListener("execute", function () {
                                    BaseCounter.pasteCoords();
                                });
                                var countbutton = new qx.ui.form.Button("Paste Count");
                                countbutton.addListener("execute", function () {
                                    BaseCounter.count();
                                });
                                this[i].add(coordbutton);
                                this[i].add(countbutton);
                                this.__coordButton.push(coordbutton);
                                this.__countButton.push(countbutton);
                            }
                        } catch (e) {
                            console.log("buttons ", e);
                        }
                    }
                }
                var count = BaseCounter.count(false);
                for (var i = 0; i < self.__countButton.length; ++i) {
                    self.__countButton[i].setLabel('Paste Count (' + count.total + ')');
                }

                switch (selectedVisObject.get_VisObjectType()) {
                    case ClientLib.Vis.VisObject.EObjectType.RegionPointOfInterest:
                    case ClientLib.Vis.VisObject.EObjectType.RegionRuin:
                    case ClientLib.Vis.VisObject.EObjectType.RegionHubControl:
                    case ClientLib.Vis.VisObject.EObjectType.RegionHubServer:
                        this.add(this.__countComposite);
                        break;
                }

                this.__countButton_showMenu(selectedVisObject);
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