var fs = require('fs'),
http = require('http'),
request = require('request'),
Mustache = require('mustache'),
Agent = require('agentkeepalive');

module.exports = {

    run: function(options, callback) {
        var tileCount = 0,
        tileCoords = {},
        tileBounds;

        //turn all single curly braces in the zxy tile URL into double curly braces
        options.url = options.url.replace(/[{]/ig, '{{').replace(/[}]/ig, '}}');

        //create the "root directory" to place downloaded tiles in 
        try {fs.mkdirSync(options.rootDir, 0777);}
        catch(err){
            if (err.code !== 'EEXIST') callback(err);
        }
        console.log('Fetching tiles from: ' + options.url);

        const keepaliveAgent = new Agent();

        //set the initial z, x, and y tile names
        //z values are a fixed range defined in options
        tileCoords.z=options.zoom.min;
        //x and y ranges are based on the bounding box and the current zoom
        tileBounds=calcMinAndMaxValues(options.bbox, tileCoords.z);
        tileCoords.x=tileBounds.xMin;
        tileCoords.y=tileBounds.yMin;

        var subDomainIdx = 0;

        //start the recursive function that fetches tiles
        getTile();

        /* Function Declarations */

        //recursive function to iterate over each z, x, and y tile name
        //
        function getTile() {
            
            //render the url template
            var template = Object.assign({}, tileCoords);
            if (options.subdomains && options.subdomains.length > 0) {
                template.s = options.subdomains[subDomainIdx++ % options.subdomains.length];
            }
            var url = Mustache.render(options.url,template);
            console.log('Fetching tile: ' + url);

            //create z directory in the root directory
            zPath = options.rootDir + '/' + tileCoords.z.toString() + '/';

            fs.mkdir(zPath, 077, function(err) {
              if (err && err.code !== 'EEXIST') {
                callback(err);
              }

              //create x directory in the z directory
              xPath = zPath + tileCoords.x.toString();

              fs.mkdir(xPath, 0777, function(err) {
                if (err && err.code !== 'EEXIST') {
                  callback(err);
                }

                //create writestream as z/x/y.png
                var file = fs.createWriteStream(xPath + '/' + tileCoords.y + '.png');

                file.on('error', function(err) { console.log(err); });
                file.on('finish', function() {
                  tileCount++;

                  //increment y
                  tileCoords.y++;
                  if(tileCoords.y<=tileBounds.yMax) {
                    getTile();
                  } else { //increment x
                    tileCoords.x++;
                    tileCoords.y=tileBounds.yMin;
                    if(tileCoords.x<=tileBounds.xMax) {
                      getTile();
                    } else { //increment z
                      tileCoords.z++;
                      tileBounds=calcMinAndMaxValues(options.bbox, tileCoords.z);
                      tileCoords.x=tileBounds.xMin;
                      tileCoords.y=tileBounds.yMin;

                      if(tileCoords.z<=options.zoom.max) {
                        getTile();
                      } else {
                        console.log('Download Complete! I grabbed ' + tileCount + ' tiles!');
                        //callback();
                      }
                    }
                  }
                });
                request({url: url, agent: keepaliveAgent}).pipe(file);
              });
            });
        }

        //given a bounding box and zoom level, calculate x and y tile ranges
        function calcMinAndMaxValues(bbox, zoom) {
            var tileBounds = {};

            /* Not sure why yMin and yMax are transposed on the tile coordinate system */
            tileBounds.yMax = lat2tile(bbox[0], zoom);
            tileBounds.xMin = long2tile(bbox[1], zoom);
            tileBounds.yMin = lat2tile(bbox[2], zoom);
            tileBounds.xMax = long2tile(bbox[3], zoom);

            return tileBounds;
        }

        //lookup tile name based on lat/lon, courtesy of http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Lon..2Flat._to_tile_numbers
        function long2tile(lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); }
        function lat2tile(lat,zoom)  { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); };

    }
}


