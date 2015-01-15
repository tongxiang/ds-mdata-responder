var path = require('path')
  , express = require('express')
  , fs = require('fs')
  , root_dirname = path.dirname(path.dirname(__dirname))
  , mongoose = require('mongoose')
  , stathat = require('stathat')
  , errorHandler = require('errorhandler')
  , bodyParser = require('body-parser')
  , cookieParser = require('cookie-parser')
  , swig = require('swig')
  ;

module.exports = function() {

  // View engine setup. 
  app.set('views', path.join(root_dirname, 'views')); // Sets default directory for views. 
  app.set('view engine', 'html'); // Default engine extension to use when omitted.
  app.engine('html', swig.renderFile); // Compiles and renders a template file for final output. 

  // Set port variable
  app.set('port', process.env.PORT || 4711);

  // Parses request body and populates request.body
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));

  // For multi-part parsing
  app.use(require('connect-multiparty')());

  // Show all errors in development
  app.use(errorHandler());

  // Parses Cookie headers. 
  app.use(cookieParser());

  // Add static path for public assets
  app.use(express.static(path.join(root_dirname, 'public')));

  // Set the database URI this app will use for SMS operations.
  app.set('operations-database-uri', process.env.DB_URI || 'mongodb://localhost/ds-mdata-responder');

  // Set the database URI this app will use to retrieve SMS config files.
  app.set('config-database-uri', process.env.CONFIG_DB_URI || 'mongodb://localhost/config');

  // @TODO: Find a better way of passing the host URL to SGSoloController.createSoloGame()
  // Specify app host URL. 
  if (process.env.NODE_ENV == 'production') {
    app.hostName = 'ds-mdata-responder.jit.su';
  } else {
    app.hostName = 'localhost:' + app.get('port');
  }

  /**
   * Global stathat reporting wrapper function
   *
   * @param type
   *   String type of stathat report (Count or Value)
   * @param statname
   *   String statname to track
   * @param count
   *   Integer the value or count you want to add
   */
  app.stathatReport = function(type, statname, count) {
    stathat["trackEZ" + type](
      process.env.STATHAT_EZ_KEY,
      statname,
      count,
      function(status, json) {}
    );
  };
}
