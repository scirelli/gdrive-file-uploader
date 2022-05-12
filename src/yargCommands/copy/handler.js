const requestDriveService = require('../../drive');

module.exports = ()=>{
    return (argv)=> {
        requestDriveService(argv.cfg.google).then((drive)=>{
            argv.cfg.logger.log(drive);
        });
    };
};
