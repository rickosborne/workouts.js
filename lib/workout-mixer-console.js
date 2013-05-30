var getopt = require('posix-getopt'),
    defaults = {
        library: (process.env['HOME'] || '~') + '/Music/iTunes/iTunes Music Library.xml',
        mix: '30@*:*',
        accept: '',
        reject: '',
        cutoff: 15,
        bitrate: 128, // oh, the humanity!
        artist: '',
        year: (new Date()).getFullYear(),
        image: '',
        album: '',
        overlap: 3000,
        verbose: false,
        help: false
    },
    argNames = {
        'Input Options': [
            { opt: 'l', name: 'library', arg: "'path'", help: 'Path to your iTunes Library XML', extra: 'Default: ' + defaults.library },
            { opt: 'r', name: 'reject',  arg: "'regex'", help: 'Match and reject tracks on Album, Artist, Title', extra: 'Note: the default state is "allow all"' },
            { opt: 'a', name: 'accept',  arg: "'regex'", help: 'Match and accept (overridden by --reject)', extra: 'Note: using --accept sets up "reject by default" state' },
            { opt: 'c', name: 'cutoff',  arg: "nn", help: 'Reject tracks longer than nn minutes, default: ' + defaults.cutoff },
            { opt: 'o', name: 'overlap', arg: "nnnn", help: 'Crossfade between tracks in ms, default: ' + defaults.overlap },
            { opt: 'm', name: 'mix',     arg: "'mixspec'", help: 'See the MIX SPECS section below.', extra: 'Default: ' + defaults.mix }
        ],
        'Output Options': [
            { opt: 't', name: 'title',   arg: "'name'", help: 'The Title tag for the output MP4' },
            { opt: 's', name: 'artist',  arg: "'name'", help: 'The Artist tag for the output MP4' },
            { opt: 'u', name: 'album',   arg: "'name'", help: 'The Album tag the output MP4' },
            { opt: 'b', name: 'bitrate', arg: "nnn", help: 'Bitrate in kbps, default: ' + defaults.bitrate },
            { opt: 'i', name: 'image',   arg: "'path'", help: 'Cover art (preferably JPEG)' }
        ],
        'Misc. Options': [
            { opt: 'h', name: 'help',    arg: false, help: 'Prattle on about minutia' },
            { opt: 'v', name: 'verbose', arg: false, help: 'This fine manual' }
        ]
    },
    extraHelp = "Mix Specs:\n  Mix specifications are semicolon (;) delimited strings detailing a series\n  of workout segments.  Each segment consists of:\n\n    * Duration\n    * Input tempo range (BPM)\n    * Output tempo range\n\n  For example, a segment might define 15 minutes at a 160bpm tempo mixed from\n  songs with an original tempo between 120 and 140 bpm.  An entire workout\n  can combine any number of segments, each with its own duration and tempos.\n\n  Each segment is in the format \"dd@tt\" with \";\" between segments, like so:\n\n    \"dd@tt;dd@tt;dd@tt\"\n\n  The duration (\"dd\") parameter is a whole number that defaults to minutes\n\n  but can be specified in seconds, minutes, or hours with a \"s\", \"m\", or \"h\"\n  suffix.  For example: \"45m\", \"90s\" or \"1h\".\n\n  The tempo (\"tt\") parameter defaults to \"*\" which then does not perform any\n  tempo adjustment.  Otherwise, tempo should be in an \"aa:bb\" format, where\n  \"aa\" is the input tempo range and \"bb\" is the output tempo range.  Each\n  range may be a single number, such as \"145\", or a range with a minimum and\n  maximum, such as \"120-140\".\n\n  The input (\"aa\") filters tracks to reject those outside that BPM range.\n\n  The output (\"bb\") specifies the target BPM to which the tracks will be\n  adjusted.  If this is a single number, such as \"165\", then all tracks in\n  that segment will be adjusted to match that tempo.  Ranges such as \"160-140\"\n  specify the starting and ending BPM for that segment.  Tracks will be\n  adjusted to match that range according to where they fall in the segment.\n\n  If no output tempo is specified then no adjusment is performed.\n\n  Examples:\n\n    '10@160'  (shorthand for: '10m@160:*')\n    10 minutes of tracks with an original BPM of 160; no tempo adjustment.\n\n    '10@145-165'  (shorthand for: '10m@145-165:*')\n    The same as before, but the input BPM is between 145 and 165.\n\n    '10@145-165:160'  (shorthand for: '10m@145-165:160')\n    Like the last, but tempo-adjust the tracks to 160bpm.\n\n    '10@145-165:160-180'  (shorthand for: '10m@145-165:160-180')\n\n    Like the last, but tempo-adjust the tracks to begin the segment at 160bpm\n    and end the segment at 180bpm.\n\n    '1h'  (shorthand for: '1h@*:*')\n    One hour of tracks of any original BPM, not tempo-adjusted.\n\n    '10m@*:160;25@*:170;5@*:160'\n    A 3-segment workout:\n      10-minute warmup, tempo-adjusted to 160bpm\n      25-minute workout, tempo-adjusted to 170bpm\n      5-minute cooldown, tempo-adjusted to 160bpm\n\n    '10m@110-170:160;25@120-180:170;5@110-170:160'\n    The same as before, but filtering out tracks that would be too slow or\n    too fast and might not sound good when tempo-adjusted.  (Subjective!)\n",
    optNamesFromHelp = function(help) {
        var ret = ':';
        Object.keys(help).forEach(function(sectionName) {
            help[sectionName].forEach(function(line) {
                ret += line.opt + (line.arg !== false ? ':' : '') + '(' + line.name + ')';
            });
        });
        return ret;
    },
    argParser = new getopt.BasicParser(optNamesFromHelp(argNames), process.argv),
    parseArgs = function(argParser, defaults, help) {
        var option, ret = {}, nameFromOption = {};
        Object.keys(defaults).forEach(function(name){ // too paranoid?
            ret[name] = defaults[name];
        });
        // structured help is pretty but requires some denormalizing
        Object.keys(help).forEach(function(sectionName) {
            help[sectionName].forEach(function(line) {
                nameFromOption[line.opt] = line.name;
            });
        });
        while ((option = argParser.getopt()) !== undefined) {
            if ('error' in option) {
                console.error('ERROR: Unknown argument: ', option.optopt || option.option);
                process.exit(1);
            }
            ret[nameFromOption[option.option]] = ('optarg' in option) ? option.optarg : true;
        }
        return ret;
    },
    showHelp = function(help) {
        var colWidth = 22,
            rpad = function(s, length) {
                if (s.length >= length) { return s; }
                return s + (new Array(1 + length - s.length)).join(' ');
            };
        console.log('workouts.js by Rick Osborne\n');
        Object.keys(help).forEach(function(sectionName) {
            console.log(sectionName + ':');
            help[sectionName].forEach(function(line) {
                console.log(rpad('  -' + line.opt + ' ' + (line.arg || ''), colWidth) + line.help);
                console.log(rpad('  --' + line.name + ' ' + (line.arg || ''), colWidth));
                if ('extra' in line) { console.log('    ' + line.extra); }
            });
            console.log('');
        });
        console.log(extraHelp);
    },
    MixerConsole = function() {
        if (!(this instanceof MixerConsole)) { return new MixerConsole(); }
        this.options = parseArgs(argParser, defaults, argNames);
        if (this.options.help) {
            showHelp(argNames);
            process.exit(0);
        }
        return this; // unnecessary, but it makes validators happy
    }
;

exports.MixerConsole = MixerConsole;
