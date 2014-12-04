var STSupportStats = function() {
    /* globals ClientLib, GAMEDATA, ST */
    var SupportStats = {
        name: 'SupportStats',

        _players: {},
        _supports: {},
        _levels: {},
        _alliance: {},
        _stats: [],

        refresh: function() {
            SupportStats.reset();
            SupportStats.getStats();
        },

        getStats: function() {
            if (SupportStats._stats.length > 0) {
                return;
            }

            var allSupports = ClientLib.Data.MainData.GetInstance().get_AllianceSupportState().get_Bases().d;
            var allPlayers = ClientLib.Data.MainData.GetInstance().get_Alliance().get_MemberData().d;

            var AllianceName = ClientLib.Data.MainData.GetInstance().get_Alliance().get_Name();

            var keys = Object.keys(allSupports);
            SupportStats.addStat(AllianceName, null, SupportStats._alliance);

            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var support = allSupports[key];

                var player = allPlayers[support.get_PlayerId()];
                if (player === undefined) {
                    continue;
                }

                var stats = {
                    x: support.get_X(),
                    y: support.get_Y(),
                    level: support.get_Level(),
                    player: player.Name,
                    type: support.get_Type(),
                    name: GAMEDATA.supportTechs[support.get_Type()].dn
                };

                SupportStats._stats.push(stats);

                SupportStats.addStat(player.Name, stats, SupportStats._players, player);
                SupportStats.addStat(stats.type, stats, SupportStats._supports);
                SupportStats.addStat(stats.level, stats, SupportStats._levels);
                SupportStats.addStat(AllianceName, stats, SupportStats._alliance);
            }

            for (var playerId in allPlayers) {
                var alliancePlayer = allPlayers[playerId];
                SupportStats.addStat(alliancePlayer.Name, null, SupportStats._players, alliancePlayer);
                SupportStats._alliance[AllianceName].bases += alliancePlayer.Bases;
            }
        },

        getPlayers: function() {
            SupportStats.getStats();

            var data = [];
            var players = Object.keys(SupportStats._players);
            for (var i = 0; i < players.length; i++) {
                var player = players[i];
                var stats = SupportStats._players[player];

                data.push(stats);
            }

            data.sort(function(a, b) {
                return b.average - a.average;
            });

            var finalOutput = [];
            data.forEach(function(o) {
                var output = [
                    (o.average || 0).toFixed(2),
                    o.name
                ];

                finalOutput.push(output.join(' \t '));
            });

            return finalOutput;
        },


        print: function() {
            SupportStats.getStats();
            var AllianceName = ClientLib.Data.MainData.GetInstance().get_Alliance().get_Name();
            var output = [];
            var stats = SupportStats._alliance[AllianceName];
            output.push('Alliance Report for "' + AllianceName + '"');
            output.push('-----------');
            output.push('Bases:    ' + stats.bases);
            output.push('Supports: ' + stats.count);
            output.push('Average:  ' + ((stats.count / stats.bases) * 100).toFixed(2) + '%');
            output.push('-----------');
            output.push('Biggest Support');
            output.push('Player:   ' + stats.big_support.player);
            output.push('Type:     ' + stats.big_support.name);
            output.push('Level:    ' + stats.big_support.level + ' @ [coords]' + stats.big_support.x + ':' + stats.big_support.y + '[/coords]');
            output.push('-----------');
            output.push('Smallest Support');
            output.push('Player:   ' + stats.small_support.player);
            output.push('Type:     ' + stats.small_support.name);
            output.push('Level:    ' + stats.small_support.level + ' @ [coords]' + stats.small_support.x + ':' + stats.small_support.y + '[/coords]');
            output.push('-----------');
            output.push('Breakdown');
            output.push('-----------');

            for (var supportId in GAMEDATA.supportTechs) {
                var supportName = GAMEDATA.supportTechs[supportId];
                var supportStat = SupportStats._supports[supportId];

                var count = supportStat === undefined ? 0 : supportStat.count;
                var avg = supportStat === undefined ? 0 : (supportStat.level / supportStat.count);

                output.push(SupportStats.pad(supportName.dn, 18) + ' count:' + count + '   avg:' + avg);
            }

            output.push('-----------');
            output.push('Players');
            output.push('-----------');
            output.push('Average  Player');
            output = output.concat(SupportStats.getPlayers());

            console.log(output.join('\n'));
        },

        pad: function(str, len) {
            return str + new Array(len + 1 - str.length).join(' ');
        },

        addStat: function(name, support, obj, player) {
            var data = obj[name];

            if (data === undefined) {
                data = {
                    name: name,
                    count: 0,
                    level: 0,
                    big: 0,
                    small: -1,
                    support: []
                };
                if (player !== undefined) {
                    data.bases = player.Bases;
                } else {
                    data.bases = 0;
                }
                obj[name] = data;
            }

            if (support === null) {
                return;
            }

            data.count++;
            data.level += support.level;

            if (data.bases > 0) {
                data.average = data.level / data.bases;
            }

            if (support.level > data.big) {
                data.big = support.level;
                data.big_support = support;
            }

            if (support.level < data.small || data.small === -1) {
                data.small = support.level;
                data.small_support = support;
            }

            data.support.push(support);
        },

        reset: function() {
            SupportStats._players = {};
            SupportStats._supports = {};
            SupportStats._levels = {};
            SupportStats._stats = [];
            SupportStats._alliance = {};
        }
    };

    ST.register(SupportStats);

};

var ST_MODULES = window.ST_MODULES || [];
ST_MODULES.push(STSupportStats);