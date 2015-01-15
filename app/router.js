var express = require('express')
  , router = express.Router()
  , logger = rootRequire('app/lib/logger')
  ;

var multiplayerGameRouter = require('./lib/sms-games')
  , donationsRouter = require('./lib/donations')
  , dsCampaignRouter = require('./lib/ds-routing')
  , reportback = require('./lib/reportback')
  , config = rootRequire('app/config/configRouter')
  ;

var connectionOperations = rootRequire('app/config/connectionOperations')
  , connectionConfig = rootRequire('app/config/connectionConfig')

var competitiveStoriesConfigModel = rootRequire('app/lib/sms-games/config/competitiveStoriesConfigModel')(connectionConfig);

// Directs all requests to the top-level router. 
app.use('/', router);

// Directs multiplayer game requests to the appropriate router. 
router.use('/sms-multiplayer-game', multiplayerGameRouter);

// Internal module for handling SMS donations.
router.use('/donations', donationsRouter);

// Custom DS routing to Mobile Commons paths for campaigns.
router.use('/ds-routing', dsCampaignRouter);

// Standard Staff Pick campaign report back.
router.use('/reportback', reportback);

// Accepts requests to add responder config files. 
router.use('/config', config);

router.get('/', function(req, res) {
  competitiveStoriesConfigModel.find({}, function(err, docs) {
    if (err) {
      logger.error('Error retrieving configuration documents for CMS, error: ' + err);
    } 
    else {
      res.render('index', {docs: docs});
    }
  })
  
})