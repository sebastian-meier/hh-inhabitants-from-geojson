const fs = require("fs");
const request = require("request");
const parseString = require('xml2js').parseString;

const geojson = JSON.parse(fs.readFileSync("./stats.geojson"));
let featureId = 0;

const load = () => {
  if (featureId < geojson.features.length) {
    const feature = geojson.features[featureId];
    const payload = `<wps:Execute xmlns:wps="http://www.opengis.net/wps/1.0.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:ows="http://www.opengis.net/ows/1.1" service="WPS" version="1.0.0" xsi:schemaLocation="http://www.opengis.net/wps/1.0.0 http://schemas.opengis.net/wps/1.0.0/wpsExecute_request.xsd">\
      <ows:Identifier>einwohner_ermitteln.fmw</ows:Identifier>\
      <wps:DataInputs>\
        <wps:Input>\
          <ows:Identifier>such_flaeche</ows:Identifier>\
          <wps:Data>
            <wps:LiteralData>${JSON.stringify(feature.geometry)}</wps:LiteralData>\
          </wps:Data>\
        </wps:Input>\
      </wps:DataInputs>\
    </wps:Execute>`;

    const options = {
      method: "POST",
      url: "https://geodienste.hamburg.de/HH_WPS",
      headers: {'Content-Type': 'text/xml'},
      body: payload
    };

    request(options, function (error, response, body) {
        if(error){
            throw error;
        }
        parseString(body, function (err, result) {
          try {
            const data = JSON.parse(result['wps:ExecuteResponse']['wps:ProcessOutputs'][0]['wps:Output'][0]['wps:Data'][0]['wps:ComplexData'][0]['wps:einwohner'][0]['wps:ergebnis'][0]);
            console.log(featureId, data.einwohner_gesamt);
            Object.keys(data).forEach((key) => {
              geojson.features[featureId].properties["wps_" + key] = data[key];
            });
          } catch (err) {
            console.log(featureId, "too small");
          }
          
          featureId += 1;
          load();
        });
    });
  } else {
    fs.writeFileSync("stats_w_data.geojson", JSON.stringify(geojson), "utf8");
    console.log("done");
  }
};

load();