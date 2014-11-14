var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , messageHelper = require('../app/lib/userMessageHelpers')
  , SGCompetitiveStoryController = require('../app/controllers/SGCompetitiveStoryController')
  , testHelper = require('./testHelperFunctions')
  ;

describe('Testing end game from user exit by creating two Science Sleuth games', function() {
  var alpha1Name = 'alpha2';
  var alpha1Phone = '5555550200';
  var betaName0 = 'friend0';
  var betaPhone0 = '5555550201';
  var betaName1 = 'friend1';
  var betaPhone1 = '5555550202';

  var betaPhone2 = '5555550203';
  var betaName2 = 'friend2';

  var alpha2Name = 'alpha2';
  var alpha2Phone = '5555550204';
  var betaName3 = 'friend3';
  var betaPhone3 = '5555550205';
  var betaName4 = 'friend4';
  var betaPhone4 = '5555550206';

  var storyId = 101;

  before('instantiating Express app, game controller, game config, dummy response', function() {
    var app = express();
    require('../app/config')(app, express);

    this.gameController = new SGCompetitiveStoryController(app);

    // Reassigning the this.gameConfig property of the controller we just
    // instantiated to use our test config file. 
    this.gameController.gameConfig = require('../app/config/competitive-stories');
    // Because of the unique scope of the before() hook, 
    // the variables below weren't actually used/reassigned in testing. 
    // They're defined much lower, globally. 
    // var gameId = 2;
    // var gameMappingId = 2;

    // Dummy Express response object.
    response = {
      send: function(code, message) {
        if (typeof code === 'undefined') {
          code = 200;
        }
        if (typeof message === 'undefined') {
          if (code == 200)
            message = 'OK';
          else
            message = '';
        }

        console.log('Response: ' + code + ' - ' + message);
      }
    };
  })

  describe('Creating Science Sleuth Game 1', function() {
    var request;
    before(function() {
      // Test request object to create the game.
      request = {
        body: {
          story_id: storyId,
          alpha_first_name: alpha1Name,
          alpha_mobile: alpha1Phone,
          beta_mobile_0: betaPhone0,
          beta_mobile_1: betaPhone1,
          beta_mobile_2: betaPhone2
        }
      };
    })

    it('should emit all game doc events', function(done) {
      var eventCount = 0;
      var expectedEvents = 6;

      var onEventReceived = function() {
        eventCount++;
        if (eventCount == expectedEvents) {
          done();

          emitter.removeAllListeners('alpha-user-created');
          emitter.removeAllListeners('beta-user-created');
          emitter.removeAllListeners('game-mapping-created');
          emitter.removeAllListeners('game-created');
        }
      };

      // 1 expected alpha-user-created event
      emitter.on('alpha-user-created', onEventReceived);
      // 3 expected beta-user-created events
      emitter.on('beta-user-created', onEventReceived);
      // 1 expected game-mapping-created event
      emitter.on('game-mapping-created', function(doc) {
        gameMappingId = doc._id;
        onEventReceived();
      });
      // 1 expected game-created event
      emitter.on('game-created', function(doc) {
        gameId = doc._id;
        onEventReceived();
      });

      // With event listeners setup, can now create the game.
      assert.equal(true, this.gameController.createGame(request, response));
    })

    describe('Beta 0 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone0);
    })

    describe('Beta 1 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone1);
    })

    describe('Beta 2 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone2);

      it('should auto-start the game', function(done) {
        var alphaStarted = beta0Started = beta1Started = beta2Started = false; // Chaining assignment operators. They all are set to false. 
        var startOip = this.gameController.gameConfig[storyId].story_start_oip;
        this.gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
          if (!err && doc) {
            for (var i = 0; i < doc.players_current_status.length; i++) {
              if (doc.players_current_status[i].opt_in_path == startOip) {
                var phone = doc.players_current_status[i].phone;
                var aPhone = messageHelper.getNormalizedPhone(alpha1Phone);
                var b0Phone = messageHelper.getNormalizedPhone(betaPhone0);
                var b1Phone = messageHelper.getNormalizedPhone(betaPhone1);
                var b2Phone = messageHelper.getNormalizedPhone(betaPhone2);
                if (phone == aPhone)
                  alphaStarted = true;
                else if (phone == b0Phone)
                  beta0Started = true;
                else if (phone == b1Phone)
                  beta1Started = true;
                else if (phone == b2Phone)
                  beta2Started = true;
              }
            }
          }

          assert(alphaStarted && beta0Started && beta1Started && beta2Started);
          done();
        })
      })

      it('should send the start message to all players')
    })

    // Gameplay.

    // Level 1. 
    describe('Alpha answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(alpha1Phone)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Alpha answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(alpha1Phone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1').expectNextLevelMessage(172153).exec();
    });

    describe('Beta0 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta0 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .exec();
    });

    describe('Beta1 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta1 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .exec();
    });

    describe('Beta2 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta2 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .expectEndStageName('END-LEVEL1-GROUP')
        .expectEndStageMessage(172163)
        .expectNextStageName('2-0')
        .expectNextStageMessage(172165)
        .exec();
    });

    describe('Before Game 2 is created, Game 1\'s game_ended property is false.', function() {
      it('should have a game_ended property of false.', function(done) {
        this.gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
          if (doc.game_ended == false) {
            done();
          }
        })
      })
    })
  })

  describe('Creating Science Sleuth Game 2', function() {
    var request;
    before(function() {
      // Test request object to create the game.
      request = {
        body: {
          story_id: storyId,
          alpha_first_name: alpha2Name,
          alpha_mobile: alpha2Phone,
          beta_mobile_0: betaPhone2,
          beta_mobile_1: betaPhone3,
          beta_mobile_2: betaPhone4
        }
      };
    })

    it('should emit all game doc events', function(done) {
      var eventCount = 0;
      var expectedEvents = 6;

      var onEventReceived = function() {
        eventCount++;
        if (eventCount == expectedEvents) {
          done();

          emitter.removeAllListeners('alpha-user-created');
          emitter.removeAllListeners('beta-user-created');
          emitter.removeAllListeners('game-mapping-created');
          emitter.removeAllListeners('game-created');
        }
      };

      // 1 expected alpha-user-created event
      emitter.on('alpha-user-created', onEventReceived);
      // 3 expected beta-user-created events
      emitter.on('beta-user-created', onEventReceived);
      // 1 expected game-mapping-created event
      emitter.on('game-mapping-created', function(doc) {
        gameMappingId = doc._id;
        onEventReceived();
      });
      // 1 expected game-created event
      emitter.on('game-created', function(doc) {
        gameId = doc._id;
        onEventReceived();
      });

      // With event listeners setup, can now create the game.
      assert.equal(true, this.gameController.createGame(request, response));
    })

    describe('Beta 2 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone2);
    })

    describe('Beta 3 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone3);
    })

    describe('Beta 4 joining the game', function() {
      testHelper.betaJoinGameTest(betaPhone4);

      it('should auto-start the game', function(done) {
        var alphaStarted = beta2Started = beta3Started = beta4Started = false; // Chaining assignment operators. They all are set to false. 
        var startOip = this.gameController.gameConfig[storyId].story_start_oip;
        this.gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
          if (!err && doc) {
            for (var i = 0; i < doc.players_current_status.length; i++) {
              if (doc.players_current_status[i].opt_in_path == startOip) {
                var phone = doc.players_current_status[i].phone;
                var aPhone = messageHelper.getNormalizedPhone(alpha2Phone);
                var b0Phone = messageHelper.getNormalizedPhone(betaPhone2);
                var b1Phone = messageHelper.getNormalizedPhone(betaPhone3);
                var b2Phone = messageHelper.getNormalizedPhone(betaPhone4);
                if (phone == aPhone) {
                  alphaStarted = true;
                }
                else if (phone == b0Phone) {
                  beta2Started = true;
                }  
                else if (phone == b1Phone) {
                  beta3Started = true;
                }
                else if (phone == b2Phone) {
                  beta4Started = true;
                } 
              }
            }
          }

          assert(alphaStarted && beta2Started && beta3Started && beta4Started);
          done();
        })
      })

      it('should send the start message to all players')
    })

    // Gameplay. 

    // Level 1. 
    describe('Alpha2 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(alpha2Phone)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Alpha2 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(alpha2Phone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1').expectNextLevelMessage(172153).exec();
    });

    describe('Beta2 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta2 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .exec();
    });

    describe('Beta3 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone3)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta3 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone3)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .exec();
    });

    describe('Beta4 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone4)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(172149)
        .exec();
    });

    describe('Beta4 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone4)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(172153)
        .expectEndStageName('END-LEVEL1-GROUP')
        .expectEndStageMessage(172163)
        .expectNextStageName('2-0')
        .expectNextStageMessage(172165)
        .exec();
    });

    describe('When Game 2 is created, Game 1\'s game_ended property is true.', function() {
      it('Game 1 should now have a game_ended property of true.', function(done) {
        this.gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
          if (doc.game_ended == false) {
            done();
          }
        })
      })
    })
  })
  
  after(function() {
    // Remove all test documents
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(alpha1Phone)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone0)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone1)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone2)}, function() {});
    this.gameController.gameMappingModel.remove({_id: gameMappingId}, function() {});
    this.gameController.gameModel.remove({_id: gameId}, function() {});
    this.gameController = null;
  })
})