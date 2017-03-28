
exports.loader = function(config) {
    config.set("autoloaded", true);
    return {com:"com_autoload.js"};
};