
/*
(function() {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();
*/
var fs = require('fs'), path = require('path'), zlib = require('zlib');

var upload = function(options, callback){
    var AWS = require('aws-sdk');


    var body = fs.createReadStream( options.filename);

    var ret = null;

    var s3 = new AWS.S3();
   var s3obj = new AWS.S3({
    params: {
        Bucket: 'abcd-config',
        Key: path.basename(options.filename),
         ACL: 'public-read',
        ContentType: 'image/jpeg',
        Body: 'Hello'
    }
});
s3obj.upload({
    Body: body
}).
on('httpUploadProgress', function(evt) {
    console.log(evt);
}).
send(function(err, data) {
    if (err) {
        callback(err);
    } else {

      console.log(data);
      callback(null, data);
    }
});


};

// Entry Point
exports.handler = function( event, context, callback ) {
  "use strict";

  var path = require('path'),
      fs = require('fs'),
      http = require('http'),
      crypto = require('crypto');

    console.log(event);
    var url = event.url;
    var s = event.size;
    var w = s[0], h = s[1];

    var Horseman = require('node-horseman');
   

    // Get the path to the phantomjs application
    function getPhantomFileName(callback) {
        console.log('getPhantomFileName');
        var nodeModulesPath = path.join(__dirname, 'node_modules');
        fs.exists(nodeModulesPath, function(exists) {
            if (exists) {
                callback(path.join(__dirname, 'node_modules','phantomjs', 'bin', 'phantomjs'));
            }
            else {
                callback(path.join(__dirname, 'phantomjs'));
            }
        });
     }

     // Call the phantomjs script
     function callPhantom(event, context, callback) {
         console.log('callPhantom');
         getPhantomFileName(function(phantomJsPath) {
             console.log('Calling phantom: ', phantomJsPath);

             var horseman = new Horseman({phantomPath: phantomJsPath, timeout: 10000});
             var title = horseman
                 //.userAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36')
                 .headers({'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
                           'Referer': 'https://map.geo.admin.ch',
                           'Accept': 'image/webp,image/*,*/*;q=0.8',
                           'Accept-Language': 'fr-FR,fr;q=0.8,en-US;q=0.6,en;q=0.4',
                           'Connection': 'keep-alive',
                           'Accept-Encoding': 'gzip, deflate, sdch'})
                 .viewport(w,h)
                 .open(url)
                 .status()
    .then(function (statusCode) {
      console.log('HTTP status code: ', statusCode);
      if (Number(statusCode) >= 400) {
        throw 'Page failed with status: ' + statusCode;
      }
    })
                 .wait(event.wait)
                 .screenshotBase64('JPEG')
                 .then(function (screenshotBase64) {
                     // Name the file based on a sha1 hash of the url
                      var urlSha1 = crypto.createHash('sha1').update(url).digest('hex')
                         , filePath = '/tmp/' + urlSha1  +'.jpeg';
                             
                     //var filePath = '/tmp/toto.jpeg';
                     var binaryData = new Buffer(screenshotBase64, 'base64').toString('binary');
                     
      
                     fs.writeFile(filePath, screenshotBase64, 'base64', function(err){
                         if (err) {
                             callback(err);
                          }
                          console.log('Success! You should now have a new screenshot at: ', filePath);
                          //callback(null, filePath);
                          upload({filename: filePath}, callback);
                      }); 
                  })
                 .catch(function (err) {
                      console.log('Error taking screenshot: ', err);
                      callback(err);
                  })
                 .close();
         });
         //listBuckets({}, callback);
     } 

    // Execute the phantom call and exit
    console.log('calling phantomjs');
    callPhantom(event, context, callback); 
}
