require('./class.js');

var async = require('async');

var TAOPT = require('../meteor/lib/taopt/base.js');

var mongojs = require('mongojs');

var db = mongojs('localhost:27017/taopt');
var bases = db.collection('bases');
var basesOld = db.collection('bases_archive');
var layout = db.collection('layout');

function deleteBase(base) {
    return function(next) {
        basesOld.insert(base, next);
    };
}

function layoutBase(base) {
    return function(next) {
        layout.findOne({
            world: base.world,
            x: base.x,
            y: base.y
        }, function(err, val) {
            if (err){
                return next(err);
            }

            if (val !== null) {
                return next();
            }

            var Base = new TAOPT.Base('TEMP', base.value);
            TAOPT.Util.Base.optimzeSilos(Base);
            var output = Base.getOutput();

            var lastseenby = base.lastseenby;
            if (!lastseenby) {
                lastseenby = base.player;
            }

            var newObj = {
                world: base.world,
                x: base.x,
                y: base.y,

                foundby: base.player,
                found: new Date(base.date),

                lastseen: new Date(base.lastseen),
                lastseenby: lastseenby,

                layout: Base.toCnCOptString(),

                tib: output.tiberium,
                cry: output.crystal,
                total: output.tiberium + output.crystal
            };

            console.log(base.x, base.y, 'ADD');
            layout.insert(newObj, next);
        });
    };
}

var oldDate = new Date(new Date() - 30 * 24 * 60 * 60 * 1000);

bases.find(function(err, values) {
    if (err) {
        return console.log(err);
    }
    var toRun = [];

    for (var i = 0; i < values.length; i++) {
        var val = values[i];
        if (val.date < oldDate) {
            delete val._id;
            toRun.push(deleteBase(val));
        } else {
            toRun.push(layoutBase(val));
        }
    }

    toRun.push(function(next) {
        console.log('REMOVE!');
        bases.remove({
            date: {
                $lt: oldDate
            }
        }, next);
    });

    async.series(toRun, function(err) {
        console.log(err);

        process.exit();
    });
});