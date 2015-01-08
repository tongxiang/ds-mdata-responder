/**
 * Route which accepts config changes. 
 */

var express = require('express')
  , router = express.Router()
  , logger = rootRequire('app/lib/logger')
  , connectionConfig = require('./connectionConfig')
  , configModelArray = [
      rootRequire('app/lib/ds-routing/config/tipsConfigModel')(connectionConfig)
    , rootRequire('app/lib/donations/models/donorschooseConfigModel')(connectionConfig)
    , rootRequire('app/lib/ds-routing/config/campaignStartConfigModel')(connectionConfig)
    , rootRequire('app/lib/ds-routing/config/startCampaignTransitionsConfigModel')(connectionConfig)
    , rootRequire('app/lib/ds-routing/config/yesNoPathsConfigModel')(connectionConfig)
    , rootRequire('app/lib/sms-games/config/competitiveStoriesConfigModel')(connectionConfig)
    ]
  ;

router.post('/:configCollectionName', function(req, res) {
  console.log('Config collection post request made for collection: ' + req.body['__comments']);
  for (var i = 0; i < configModelArray.length; i++) {
    if (configModelArray[i].modelName == req.params.configCollectionName) {
      configModelArray[i].findOneAndUpdate({'_id': req.body['_id']}, req.body, { upsert: true }, function(err, doc) {
        res.send(doc);
        console.log('new doc: ', doc)
      })
    }
  }
})

module.exports = router;