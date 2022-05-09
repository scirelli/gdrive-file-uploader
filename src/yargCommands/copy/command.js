const fs = require('fs'),
    {promisify} = require('util'),
    readFile = promisify(fs.readFile);

module.exports = (config, logger)=> {
    const handler = require('./handler')(config, logger);

    return {
        command:     ['copy <source> <target>', '$0'],
        aliases:     ['cp'],
        description: 'Copy files between hosts and Google Drive.',
        builder:     (yargs)=> {
            return yargs
                .count('verbose')
                .positional('source', {
                    describe: 'Local path name',
                    type:     'string'
                })
                .positional('target', {
                    describe: 'Target\'s location on Google Drive.'
                })
                .options({
                    'config': {
                        alias:        'c',
                        describe:     'Config file. Contains Google drive setup information.',
                        demandOption: true,
                        type:         'string'
                    },
                    'recursive': {
                        alias:        'r',
                        describe:     'Recursively copy entire directories.  Note that $0 follows symbolic links encountered in the tree traversal.',
                        demandOption: false,
                        type:         'boolean'
                    },
                    'limit': {
                        alias:        'l',
                        describe:     'Limit the number of simultaneous uploads.',
                        demandOption: false,
                        type:         'number',
                        default:      1
                    },
                    'quiet': {
                        alias:        'q',
                        describe:     'Quiet mode: disable warning and diagnostic messages.',
                        demandOption: false,
                        type:         'boolean'
                    },
                    'verbose': {
                        alias:        'v',
                        demandOption: false,
                        describe:     'Causes $0 to print debugging messages about it\'s progress. Add more v\'s to increase verbosity.',
                        type:         'boolean'
                    }
                }).coerce('config', function (arg) {
                    return readFile(arg, {encoding: 'utf8'}).then(JSON.parse);
                })
                .example('$0 --config /tmp/config.json /path/of/file/to/copy.txt /destination/on/Google/Drive', 'Copy a file to Google Drive')
                .example('$0 --config /tmp/config.json -r /path/of/dir/to/copy /destination/on/Google/Drive', 'Copy all files and directories to Google Drive');
        },
        handler: handler
    };
};
