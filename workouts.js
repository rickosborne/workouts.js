var mixerConsole = require('./lib/workout-mixer-console.js'),
    mixerLib = require('./lib/workout-mixer-lib.js'),
    tempDir = '__workout_temp__',
    outputTitle = 'workout',
    app = new mixerConsole.MixerConsole(),
    debug = (function(verbose){
        return verbose ? console.log : function(){};
    })(app.options.verbose),
    lib = new mixerLib.MixerLib(app.options, debug)
;

debug("workouts.js");

console.log(app.options);
console.log(lib);
