var STPlayerInfo = function() {
    /* globals ClientLib, GAMEDATA, ST */

    var PlayerInfo = {
        name: 'PlayerInfo',

        instance: null,
        output: {},

        getInfo: function() {
            ST.log.debug('getInfo');
            PlayerInfo.instance = ClientLib.Data.MainData.GetInstance();
            PlayerInfo.output.world = PlayerInfo.instance.get_Server().get_WorldId();
            PlayerInfo.output.worldname = PlayerInfo.instance.get_Server().get_Name();

            PlayerInfo._getPlayerInfo();
            PlayerInfo._getNextMVC();
            PlayerInfo._getCities();

            ST.log.debug(PlayerInfo.output);

            PlayerInfo.saveInfo();
        },

        _getPlayerInfo: function() {
            ST.log.debug('\t getPlayerInfo');
            var player = PlayerInfo.instance.get_Player();
            PlayerInfo.output.id = player.get_Id();
            PlayerInfo.output.faction = PlayerInfo.map.faction[player.get_Faction()];
            PlayerInfo.output.player = player.get_Name();
            PlayerInfo.output.score = player.get_ScorePoints();
            PlayerInfo.output.rank = player.get_OverallRank();

            var alliance = PlayerInfo.instance.get_Alliance();
            PlayerInfo.output.alliancename = alliance.get_Name();
            PlayerInfo.output.alliance = alliance.get_Id();

            PlayerInfo.output.rp = player.get_ResearchPoints();
            PlayerInfo.output.credit = player.get_Credits();

            PlayerInfo.output.command = {
                max: player.GetCommandPointMaxStorage(),
                current: player.GetCommandPointCount()
            };

            PlayerInfo.output.bonus = {};
            PlayerInfo.output.bonus.power = alliance.GetPOIBonusFromResourceType(ClientLib.Base.EResourceType.Power);
            PlayerInfo.output.bonus.crystal = alliance.GetPOIBonusFromResourceType(ClientLib.Base.EResourceType.Crystal);
            PlayerInfo.output.bonus.tiberium = alliance.GetPOIBonusFromResourceType(ClientLib.Base.EResourceType.Tiberium);
        },

        _getNextMVC: function() {
            ST.log.debug('\t getNextMVC');
            var player = PlayerInfo.instance.get_Player();

            var TechId = ClientLib.Base.Tech.GetTechIdFromTechNameAndFaction(
                ClientLib.Base.ETechName.Research_BaseFound, player.get_Faction());
            var PlayerResearch = player.get_PlayerResearch();
            var ResearchItem = PlayerResearch.GetResearchItemFomMdbId(TechId);

            if (ResearchItem === null) {
                return;
            }
            var NextLevelInfo = ResearchItem.get_NextLevelInfo_Obj();

            var resourcesNeeded = [];
            for (var i in NextLevelInfo.rr) {
                if (NextLevelInfo.rr[i].t > 0) {
                    resourcesNeeded[NextLevelInfo.rr[i].t] = NextLevelInfo.rr[i].c;
                }
            }
            var creditsNeeded = resourcesNeeded[ClientLib.Base.EResourceType.Gold];
            var creditsResourceData = player.get_Credits();
            var creditsGrowthPerHour = (creditsResourceData.Delta + creditsResourceData.ExtraBonusDelta) *
                ClientLib.Data.MainData.GetInstance().get_Time().get_StepsPerHour();
            var creditsTimeLeftInHours = (creditsNeeded - player.GetCreditsCount()) / creditsGrowthPerHour;

            var mcvTime = creditsTimeLeftInHours * 60 * 60;
            if (mcvTime !== Infinity && !isNaN(mcvTime)) {
                PlayerInfo.output.mcvtime = mcvTime;
            }
        },


        _getCities: function() {
            ST.log.debug('\t getCities');
            PlayerInfo.output.bases = [];
            var allCities = ClientLib.Data.MainData.GetInstance().get_Cities().get_AllCities().d;
            for (var selectedBaseID in allCities) {
                if (!allCities.hasOwnProperty(selectedBaseID)) {
                    continue;
                }

                var selectedBase = allCities[selectedBaseID];
                if (selectedBase === undefined) {
                    throw new Error('unable to find base: ' + selectedBaseID);
                }

                PlayerInfo._getCity(selectedBase);
            }
        },

        _getCity: function(c) {
            ST.log.debug('\t\t getCity - ' + c.get_Name());
            var base = {};

            PlayerInfo.output.repair = c.GetResourceMaxStorage(ClientLib.Base.EResourceType.RepairChargeInf);

            base.defense = c.get_LvlDefense();
            base.offense = c.get_LvlOffense();

            base.power = c.GetResourceGrowPerHour(ClientLib.Base.EResourceType.Power, false, false) +
                c.GetResourceBonusGrowPerHour(ClientLib.Base.EResourceType.Power);

            base.tiberium = c.GetResourceGrowPerHour(ClientLib.Base.EResourceType.Tiberium, false, false) +
                c.GetResourceBonusGrowPerHour(ClientLib.Base.EResourceType.Tiberium);

            base.crystal = c.GetResourceGrowPerHour(ClientLib.Base.EResourceType.Crystal, false, false) +
                c.GetResourceBonusGrowPerHour(ClientLib.Base.EResourceType.Crystal);

            base.credits = ClientLib.Base.Resource.GetResourceGrowPerHour(c.get_CityCreditsProduction(), false) +
                ClientLib.Base.Resource.GetResourceBonusGrowPerHour(c.get_CityCreditsProduction(), false);

            base.health = c.GetBuildingsConditionInPercent();

            base.current = {};
            base.current.power = c.GetResourceCount(ClientLib.Base.EResourceType.Power);
            base.current.tiberium = c.GetResourceCount(ClientLib.Base.EResourceType.Tiberium);
            base.current.crystal = c.GetResourceCount(ClientLib.Base.EResourceType.Crystal);

            base.level = c.get_LvlBase();

            base.id = c.get_Id();

            base.x = c.get_PosX();
            base.y = c.get_PosY();

            base.buildings = PlayerInfo._getBuildings(c, base);

            base.repair = {};
            base.repair.infantry = c.get_CityUnitsData().GetRepairTimeFromEUnitGroup(ClientLib.Data.EUnitGroup.Infantry, false);
            base.repair.vehicle = c.get_CityUnitsData().GetRepairTimeFromEUnitGroup(ClientLib.Data.EUnitGroup.Vehicle, false);
            base.repair.air = c.get_CityUnitsData().GetRepairTimeFromEUnitGroup(ClientLib.Data.EUnitGroup.Aircraft, false);
            base.repair.time = c.GetResourceCount(ClientLib.Base.EResourceType.RepairChargeInf);

            base.name = c.get_Name();
            if (typeof base.name === 'string') {
                base.name.replace(/\./g, '');
            }
            PlayerInfo.output.bases.push(base);
        },

        saveInfo: function() {
            ST.util.api('savePlayer', PlayerInfo.output);
        },
        _getUnits: function(city) {
            var D = {};
            var O = {};
            var x, y, o;
            for (var k in city) {
                var currentFunc = city[k];
                if (typeof currentFunc !== 'object') {
                    continue;
                }

                for (var k2 in currentFunc) {
                    var listObj = currentFunc[k2];
                    // console.log(k2, listObj);
                    if (listObj === null || typeof listObj !== 'object' || listObj.d === undefined) {
                        continue;
                    }

                    var lst = listObj.d;
                    // console.log(lst);
                    if (typeof lst !== 'object') {
                        continue;
                    }

                    for (var i in lst) {
                        var unit = lst[i];
                        if (typeof unit !== 'object' || unit.get_UnitGameData_Obj === undefined) {
                            continue;
                        }
                        // console.log(unit, unit.get_UnitGameData_Obj());
                        var name = unit.get_UnitGameData_Obj().n;
                        x = unit.get_CoordX();
                        y = unit.get_CoordY();
                        var level = unit.get_CurrentLevel();
                        var dName = PlayerInfo.map.defense[name];
                        var oName = PlayerInfo.map.offense[name];
                        if (dName !== undefined) {
                            D[x + ':' + y] = level + dName;
                        }
                        if (oName !== undefined) {
                            O[x + ':' + y] = level + oName;
                        }
                    }
                }

            }
            var out = [];
            for (y = 0; y < 8; y++) {
                for (x = 0; x < 9; x++) {
                    o = D[x + ':' + y];
                    if (o === undefined) {
                        out.push('.');
                    } else {
                        out.push(o);
                    }

                }
            }

            for (y = 0; y < 4; y++) {
                for (x = 0; x < 9; x++) {
                    o = O[x + ':' + y];
                    if (o === undefined) {
                        out.push('.');
                    } else {
                        out.push(o);
                    }

                }
            }

            return out.join('');
        },


        _getBuildings: function(base) {
            var buildings = base.get_Buildings();
            var buildingData = {};

            for (var b in buildings.d) {
                var build = buildings.d[b];
                buildingData[build.get_CoordX() + ':' + build.get_CoordY()] = build;
            }


            var layout = [];

            // buildings
            for (var y = 0; y < 8; y++) {
                for (var x = 0; x < 9; x++) {
                    var resourceType = base.GetResourceType(x, y);
                    var building = buildingData[x + ':' + y];
                    var token = '.';
                    var level = 1;

                    if (building !== undefined) {
                        var info = GAMEDATA.Tech[building.get_MdbBuildingId()];
                        token = PlayerInfo.map.buildings[info.n];
                        level = building.get_CurrentLevel();
                    }

                    if (level > 1) {
                        layout.push(level);
                    }

                    switch (resourceType) {
                        case 0:
                            layout.push(token);
                            break;
                        case 1:
                            if (building === undefined) {
                                layout.push('c');
                            } else {
                                layout.push('n');
                            }
                            break;
                        case 2:
                            if (building === undefined) {
                                layout.push('t');
                            } else {
                                layout.push('h');
                            }

                            break;
                    }
                }
            }

            return layout.join('') + PlayerInfo._getUnits(base);
        },

        startup: function() {
            PlayerInfo.getInfo();
            PlayerInfo.interval = setInterval(PlayerInfo.getInfo, 1200000);
        },

        destroy: function() {
            if (PlayerInfo.interval === undefined) {
                return;
            }

            clearInterval(PlayerInfo.interval);
            PlayerInfo.interval = undefined;
        },


        map: {
            faction: {
                1: 'GDI',
                2: 'NOD'
            },

            buildings: {
                /* GDI Buildings */
                'GDI_Accumulator': 'a',
                'GDI_Refinery': 'r',
                'GDI_Trade Center': 'u',
                'GDI_Silo': 's',
                'GDI_Power Plant': 'p',
                'GDI_Construction Yard': 'y',
                'GDI_Airport': 'd',
                'GDI_Barracks': 'b',
                'GDI_Factory': 'f',
                'GDI_Defense HQ': 'q',
                'GDI_Defense Facility': 'w',
                'GDI_Command Center': 'e',
                'GDI_Support_Art': 'z',
                'GDI_Support_Air': 'x',
                'GDI_Support_Ion': 'i',

                /* Nod Buildings */
                'NOD_Refinery': 'r',
                'NOD_Power Plant': 'p',
                'NOD_Harvester': 'h',
                'NOD_Construction Yard': 'y',
                'NOD_Airport': 'd',
                'NOD_Trade Center': 'u',
                'NOD_Defense HQ': 'q',
                'NOD_Barracks': 'b',
                'NOD_Silo': 's',
                'NOD_Factory': 'f',
                'NOD_Harvester_Crystal': 'n',
                'NOD_Command Post': 'e',
                'NOD_Support_Art': 'z',
                'NOD_Support_Ion': 'i',
                'NOD_Accumulator': 'a',
                'NOD_Support_Air': 'x',
                'NOD_Defense Facility': 'w',
            },

            defense: {
                /* GDI Defense Units */
                'GDI_Wall': 'w',
                'GDI_Cannon': 'c',
                'GDI_Antitank Barrier': 't',
                'GDI_Barbwire': 'b',
                'GDI_Turret': 'm',
                'GDI_Flak': 'f',
                'GDI_Art Inf': 'r',
                'GDI_Art Air': 'e',
                'GDI_Art Tank': 'a',
                'GDI_Def_APC Guardian': 'g',
                'GDI_Def_Missile Squad': 'q',
                'GDI_Def_Pitbull': 'p',
                'GDI_Def_Predator': 'd',
                'GDI_Def_Sniper': 's',
                'GDI_Def_Zone Trooper': 'z',
                /* Nod Defense Units */
                'NOD_Def_Antitank Barrier': 't',
                'NOD_Def_Art Air': 'e',
                'NOD_Def_Art Inf': 'r',
                'NOD_Def_Art Tank': 'a',
                'NOD_Def_Attack Bike': 'p',
                'NOD_Def_Barbwire': 'b',
                'NOD_Def_Black Hand': 'z',
                'NOD_Def_Cannon': 'c',
                'NOD_Def_Confessor': 's',
                'NOD_Def_Flak': 'f',
                'NOD_Def_MG Nest': 'm',
                'NOD_Def_Militant Rocket Soldiers': 'q',
                'NOD_Def_Reckoner': 'g',
                'NOD_Def_Scorpion Tank': 'd',
                'NOD_Def_Wall': 'w',
            },

            offense: {
                /* GDI Offense Units */
                'GDI_APC Guardian': 'g',
                'GDI_Commando': 'c',
                'GDI_Firehawk': 'f',
                'GDI_Juggernaut': 'j',
                'GDI_Kodiak': 'k',
                'GDI_Mammoth': 'm',
                'GDI_Missile Squad': 'q',
                'GDI_Orca': 'o',
                'GDI_Paladin': 'a',
                'GDI_Pitbull': 'p',
                'GDI_Predator': 'd',
                'GDI_Riflemen': 'r',
                'GDI_Sniper Team': 's',
                'GDI_Zone Trooper': 'z',

                /* Nod Offense Units */
                'NOD_Attack Bike': 'b',
                'NOD_Avatar': 'a',
                'NOD_Black Hand': 'z',
                'NOD_Cobra': 'r',
                'NOD_Commando': 'c',
                'NOD_Confessor': 's',
                'NOD_Militant Rocket Soldiers': 'q',
                'NOD_Militants': 'm',
                'NOD_Reckoner': 'k',
                'NOD_Salamander': 'l',
                'NOD_Scorpion Tank': 'o',
                'NOD_Specter Artilery': 'p',
                'NOD_Venom': 'v',
                'NOD_Vertigo': 't',
                '': ''
            }

        }
    };

    ST.register(PlayerInfo);
};

var ST_MODULES = window.ST_MODULES || [];
ST_MODULES.push(STPlayerInfo);