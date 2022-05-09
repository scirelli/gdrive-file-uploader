const debug = require('debug');

module.exports = {
    debug: debug('debug'),
    info:  debug('info'),
    log:   debug('log'),
    warn:  debug('warn'),
    error: debug('error'),
    fail:  debug('fail')
};
