/**
 * Created by pi on 8/25/16.
 */
var fs = require('fs');
var logfile = 'OPCUAlog-2.txt';
var wstream = fs.createWriteStream(logfile);
module.exports =  function(logType, data, i18n) {
    var time = new Date().toLocaleString();
    //     new Date().toISOString().
    // replace(/T/, ' ').      // replace T with a space
    // replace(/\..+/, '');
    var log = time
        + ': [' + logType +']: ' + data + '\n';
    wstream.write(log);
    console.log(log);
}