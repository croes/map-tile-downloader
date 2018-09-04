//downloads rectified aerial photos from NYPL Mapwarper

var options = {
    url : 	'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png ',
    subdomains: ["a", "b", "c"],
    rootDir: 'C:\\OSMTilesNorthSea',
    bbox : [51.0, 0.0, 56.0, 10.0],
    zoom : {
        max : 15,
        min : 1
    }
};

var mapDownloader = require('../map-tile-downloader.js');

//execute mapDownloader
mapDownloader.run(options,function(err){
  console.log(err);
  process.exit();
});