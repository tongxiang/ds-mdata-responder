var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , messageHelper = require('../app/lib/userMessageHelpers')
  , SGCompetitiveStoryController = require('../app/controllers/SGCompetitiveStoryController')
  , testHelper = require('./testHelperFunctions')
  ;

describe('Bully Text game being played:', function() {
  var alphaName = 'alpha';
  var alphaPhone = '5555550200';
  var betaName0 = 'friend0';
  var betaName1 = 'friend1';
  var betaName2 = 'friend2';
  var betaPhone0 = '5555550201';
  var betaPhone1 = '5555550202';
  var betaPhone2 = '5555550203';
  var storyId = 100;

  before('instantiating Express app, game controller, game config, dummy response', function() {
    var app = express();
    require('../app/config')(app, express);

    this.gameController = new SGCompetitiveStoryController(app);

    // Reassigning the this.gameConfig property of the controller we just 
    // instantiated to use our test config file. 
    this.gameController.gameConfig = require('../app/config/competitive-stories');

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

  describe('Creating a BullyText game', function() {
    var request;
    before(function() {
      // Test request object to create the game.
      request = {
        body: {
          story_id: storyId,
          alpha_first_name: alphaName,
          alpha_mobile: alphaPhone,
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
  
    it('should add sg_user doc for alpha user', function(done) {
      var phone = messageHelper.getNormalizedPhone(alphaPhone);
      this.gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta0 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone0);
      this.gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta1 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone1);
      this.gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta2 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone2);
      this.gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_gamemapping document', function(done) {
      this.gameController.gameMappingModel.find({_id: gameMappingId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_competitivestory_game document', function(done) {
      this.gameController.gameModel.find({_id: gameId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should have a sg_competitivestory_game document with Bully Text\'s story_id of 100', function(done) {
      this.gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        if (!err && doc.story_id == 100) { done(); }
        else { assert(false); }
      })
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
                var aPhone = messageHelper.getNormalizedPhone(alphaPhone);
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
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(169861)
        .exec();
    });

    describe('Alpha answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(169865)
        .exec();
    });

    describe('Beta0 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(169861)
        .exec();
    });

    describe('Beta0 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(169865)
        .exec();
    });

    describe('Beta1 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(169861)
        .exec();
    });

    describe('Beta1 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(169865)
        .exec();
    });

    describe('Beta2 answers A at Level 1-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('11A')
        .expectNextLevelMessage(169861)
        .exec();
    });

    describe('Beta2 answers A at Level 1-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL1')
        .expectNextLevelMessage(169865)
        .expectEndStageName('END-LEVEL1-GROUP')
        .expectEndStageMessage(169875)
        .expectNextStageName('2-0')
        .expectNextStageMessage(169877)
        .exec();
    });

    // Level 2. 
    describe('Alpha answers A at Level 2-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('21A')
        .expectNextLevelMessage(169879)
        .exec();
    });

    describe('Alpha answers A at Level 2-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL2').expectNextLevelMessage(169883).exec();
    });

    describe('Beta0 answers A at Level 2-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('21A')
        .expectNextLevelMessage(169879)
        .exec();
    });

    describe('Beta0 answers A at Level 2-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL2').expectNextLevelMessage(169883).exec();
    });

    describe('Beta1 answers A at Level 2-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('21A')
        .expectNextLevelMessage(169879)
        .exec();
    });

    describe('Beta1 answers A at Level 2-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL2').expectNextLevelMessage(169883).exec();
    });

    describe('Beta2 answers A at Level 2-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('21A')
        .expectNextLevelMessage(169879)
        .exec();
    });

    describe('Beta2 answers A at Level 2-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL2')
        .expectNextLevelMessage(169883)
        .expectEndStageName('END-LEVEL2-GROUP')
        .expectEndStageMessage(169893)
        .expectNextStageName('3-0')
        .expectNextStageMessage(169895)
        .exec();
    });

    //Level 3.
    describe('Alpha answers A at Level 3-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('31A')
        .expectNextLevelMessage(169897)
        .exec();
    });

    describe('Alpha answers A at Level 3-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL3').expectNextLevelMessage(169901).exec();
    });

    describe('Beta0 answers A at Level 3-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('31A')
        .expectNextLevelMessage(169897)
        .exec();
    });

    describe('Beta0 answers A at Level 3-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL3').expectNextLevelMessage(169901).exec();
    });

    describe('Beta1 answers A at Level 3-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('31A')
        .expectNextLevelMessage(169897)
        .exec();
    });

    describe('Beta1 answers A at Level 3-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL3')
        .expectNextLevelMessage(169901)
        .exec();
    });

    describe('Beta2 answers A at Level 3-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('31A')
        .expectNextLevelMessage(169897)
        .exec();
    });

    describe('Beta2 answers A at Level 3-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL3')
        .expectNextLevelMessage(169901)
        .expectEndStageName('END-LEVEL3-GROUP')
        .expectEndStageMessage(169909)
        .expectNextStageName('4-0')
        .expectNextStageMessage(169915)
        .exec();
    });

    //Level 4. 
    describe('Alpha answers A at Level 4-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('41A')
        .expectNextLevelMessage(169917)
        .exec();
    });

    describe('Alpha answers A at Level 4-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL4')
        .expectNextLevelMessage(169921)
        .exec();
    });

    describe('Beta0 answers A at Level 4-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('41A')
        .expectNextLevelMessage(169917)
        .exec();
    });

    describe('Beta0 answers A at Level 4-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL4')
        .expectNextLevelMessage(169921)
        .exec();
    });

    describe('Beta1 answers A at Level 4-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('41A')
        .expectNextLevelMessage(169917)
        .exec();
    });

    describe('Beta1 answers A at Level 4-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL4')
        .expectNextLevelMessage(169921)
        .exec();
    });

    describe('Beta2 answers A at Level 4-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('41A')
        .expectNextLevelMessage(169917)
        .exec();
    });

    describe('Beta2 answers A at Level 4-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL4')
        .expectNextLevelMessage(169921)
        .expectEndStageName('END-LEVEL4-GROUP')
        .expectEndStageMessage(169921)
        .expectNextStageName('5-0')
        .expectNextStageMessage(169933)
        .exec();
    });

    //Level 5. 
    describe('Alpha answers A at Level 5-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('51A')
        .expectNextLevelMessage(169935)
        .exec();
    });

    describe('Alpha answers A at Level 5-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL5')
        .expectNextLevelMessage(169939)
        .exec();
    });

    describe('Beta0 answers A at Level 5-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('51A')
        .expectNextLevelMessage(169935)
        .exec();
    });

    describe('Beta0 answers A at Level 5-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL5')
        .expectNextLevelMessage(169939)
        .exec();
    });

    describe('Beta1 answers A at Level 5-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('51A')
        .expectNextLevelMessage(169935)
        .exec();
    });

    describe('Beta1 answers A at Level 5-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL5')
        .expectNextLevelMessage(169939)
        .exec();
    });

    describe('Beta2 answers A at Level 5-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('51A')
        .expectNextLevelMessage(169935)
        .exec();
    });

    describe('Beta2 answers A at Level 5-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL5')
        .expectNextLevelMessage(169939)
        .expectEndStageName('END-LEVEL5-GROUP')
        .expectEndStageMessage(169947)
        .expectNextStageName('6-0')
        .expectNextStageMessage(169951)
        .exec();
    });

    //Level 6. 
    describe('Alpha answers A at Level 6-0', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('61A')
        .expectNextLevelMessage(169953)
        .exec();
    });

    describe('Alpha answers A at Level 6-1A', function() {
      testHelper.userActionTest().withPhone(alphaPhone)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL6')
        .expectNextLevelMessage(169957)
        .exec();
    });

    describe('Beta0 answers A at Level 6-0', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('61A')
        .expectNextLevelMessage(169953)
        .exec();
    });

    describe('Beta0 answers A at Level 6-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone0)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL6')
        .expectNextLevelMessage(169957)
        .exec();
    });

    describe('Beta1 answers A at Level 6-0', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('61A')
        .expectNextLevelMessage(169953)
        .exec();
    });

    describe('Beta1 answers A at Level 6-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone1)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL6')
        .expectNextLevelMessage(169957)
        .exec();
    });

    describe('Beta2 answers A at Level 6-0', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('61A')
        .expectNextLevelMessage(169953)
        .exec();
    });

    describe('Beta2 answers A at Level 6-1A', function() {
      testHelper.userActionTest().withPhone(betaPhone2)
        .withUserInput('A')
        .expectNextLevelName('END-LEVEL6')
        .expectNextLevelMessage(169957)
        .expectEndStageName('END-LEVEL6-GROUP')
        .expectEndStageMessage(169965)
        .expectEndGameIndividualMessageFormat('individual-decision-based')
        .expectEndGameIndividualMessage(170453)
        .exec();
    });
  })

  after(function() {
    // Remove all test documents
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(alphaPhone)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone0)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone1)}, function() {});
    this.gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone2)}, function() {});
    this.gameController.gameMappingModel.remove({_id: gameMappingId}, function() {});
    this.gameController.gameModel.remove({_id: gameId}, function() {});
    this.gameController = null;
  })
})