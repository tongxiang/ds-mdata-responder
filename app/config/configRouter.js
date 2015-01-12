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

router.route('/')
      .get(function(req, res) {
        res.send('Eventually, maybe this will return all the config documents in a way that\'s useful for our CMS.')
      })

router.route('/:configCollectionName')
      . 

router.use(function(req, res, next) {
        logger.info('Request made for configRouter with contents: ' + req.body)
      })

      .post('/:configCollectionName', function(req, res) {
        console.log('Config collection post request made for collection: ' + req.body.__comments);
        findConfigCollection(req.params.configCollectionName).findOneAndUpdate({'_id': req.body._id}, req.body, { upsert: true }, function(err, doc) {
          res.send(doc);
          console.log('new doc: ', doc);
        })
      })

      .delete('/:configCollectionName', function(req, res) {
        findConfigCollection(req.params.configCollectionName).remove({
          _id: req.body._id
        }, function(err) {
          if (err) {
            logger.error('Unable to delete doc with _id ' + req.body._id + ' for configCollection: ' + req.params.configCollectionName)
          }
        })
      })



function findConfigCollection(configCollectionName) {
  for (var i = 0; i < configModelArray.length; i++) {
    if (configModelArray[i].modelName == configCollectionName) {
      return configModelArray[i];
    }
  }
  logger.error('Unable to find requested config collection model for ' + configCollectionName);
  return false;
}


module.exports = router;