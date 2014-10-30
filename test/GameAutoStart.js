var assert = require('assert')
  , express = require('express')
  , emitter = require('../app/eventEmitter')
  , messageHelper = require('../app/lib/userMessageHelpers')
  , SGCompetitiveStoryController = require('../app/controllers/SGCompetitiveStoryController')
  ;

describe('Auto-Start Game:', function() {
  // Test players' details.
  alphaName = 'alpha';
  alphaPhone = '5555550100';
  betaName0 = 'friend0';
  betaName1 = 'friend1';
  betaName2 = 'friend2';
  betaPhone0 = '5555550101';
  betaPhone1 = '5555550102';
  betaPhone2 = '5555550103';
  storyId = 1;

  before(function() {
    app = express();
    require('../app/config')(app, express);

    gameController = new SGCompetitiveStoryController(app);

    // Reassigning the this.gameConfig property of the controller we just
    // instantiated to use our test config file. 
    gameController.gameConfig = require('./test_config/test-competitive-stories');
    gameId = 0;
    gameMappingId = 0;

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

  describe('Creating a Competitive Story game', function() {
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
      assert.equal(true, gameController.createGame(request, response));
    })

    it('should add sg_user doc for alpha user', function(done) {
      var phone = messageHelper.getNormalizedPhone(alphaPhone);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta0 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone0);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta1 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone1);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add sg_user doc for beta2 user', function(done) {
      var phone = messageHelper.getNormalizedPhone(betaPhone2);
      gameController.userModel.find({phone: phone}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_gamemapping document', function(done) {
      gameController.gameMappingModel.find({_id: gameMappingId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })

    it('should add a sg_competitivestory_game document', function(done) {
      gameController.gameModel.find({_id: gameId}, function(err, docs) {
        if (!err && docs.length > 0) { done(); }
        else { assert(false); }
      })
    })
  })

  // Describe test for betas joining the game.
  var betaJoinGameTest = function(_phone) {
    var request;
    var phone = _phone;
    before(function() {
      phone = messageHelper.getNormalizedPhone(phone);
      request = {
        body: {
          phone: phone,
          args: 'Y'
        }
      }
    })

    it('should emit game-updated event', function(done) {
      emitter.on('game-updated', function() {
        done();
        emitter.removeAllListeners('game-updated');
      });

      // Join beta user to the game.
      gameController.betaJoinGame(request, response);
    })

    it('should update the game document', function(done) {
      gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        var updated = false;
        if (!err && doc) {
          for (var i = 0; i < doc.betas.length; i++) {
            if (doc.betas[i].phone == phone && doc.betas[i].invite_accepted) {
              updated = true;
              done();
            }
          }
        }

        if (!updated) assert(false);
      })
    })
    it('should send a Mobile Commons opt-in to Beta(' + phone + ')')
    it('should send a Mobile Commons opt-in to Alpha')
  };

  describe('Beta 0 joining the game', function() {
    betaJoinGameTest(betaPhone0);
  })

  describe('Beta 1 joining the game', function() {
    betaJoinGameTest(betaPhone1);
  })

  describe('Beta 2 joining the game', function() {
    betaJoinGameTest(betaPhone2);

    it('should auto-start the game', function(done) {
      var alphaStarted = beta0Started = beta1Started = beta2Started = false; // Chaining assignment operators. They all are set to false. 
      var startOip = gameController.gameConfig[storyId].story_start_oip;
      gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
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
  
  /**
   * Tests that a user action has opted her into the proper opt in path, 
   * at the proper level, and that action has been saved as the user's 
   * current status in the db. 
   * 
   * @param userPhone
   *  The user's phone number. 
   * @param userInput
   *  What we're simulating the user texting in.
   * @param correctNextLevelId
   *  The ID of the next level, for test readability purposes. (ex: 'L11B')
   * @param correctNextLevelOip
   *  What oip the user should be opted into, given her input. 
   */
  var userActionTest = function(userPhone, userInput, correctNextLevelId, correctNextLevelOip) {
    var request; 
    before(function() {
      phone = messageHelper.getNormalizedPhone(userPhone);
      request = {
        body: {
          phone: phone,
          args: userInput
        }
      }
    });

    it('should emit player-status-updated event', function(done) {
      emitter.on('player-status-updated', function() {
        done();
        emitter.removeAllListeners('player-status-updated')
      })

      // User submits user action. 
      gameController.userAction(request, response);
    })

    it('should move user to level ' + correctNextLevelId + ' (optin path: ' + correctNextLevelOip + ') in the game doc', function(done) {
      gameController.gameModel.findOne({_id: gameId}, function(err, doc) {
        var updated = false;
        var playerStatus = doc.players_current_status
        for (i = 0; i < playerStatus.length; i ++) {
          if (playerStatus[i].phone == phone && playerStatus[i].opt_in_path == correctNextLevelOip) {
            done();
            updated = true;
          }
        }
        if (!updated) { assert(false); }
      }) 
    })
  }

  var userActionEndLevelTest = function(userPhone, userInput, correctNextLevelId, correctNextLevelOip) {

  }

  var userActionEndGameTest = function() {

  }
  
  describe('Alpha answers A at Level 1-0', function() {
    userActionTest(alphaPhone, 'A', '11A', 168455);
  })

  describe('Alpha answers A at Level 1-1', function() {
    userActionTest(alphaPhone, 'A', '12A', 168459);
  })

  describe('Alpha answers A at Level 1-2', function() {
    userActionTest(alphaPhone, 'A', '13A', 168657);
  })

  describe('Alpha answers A at Level 1-3', function() {
    userActionTest(alphaPhone, 'A', 'END-LEVEL1', 168825);
  })


  describe('Beta0 answers A at Level 1-0', function() {
    userActionTest(betaPhone0, 'A', '11A', 168455);
  })

  describe('Beta0 answers A at Level 1-1', function() {
    userActionTest(betaPhone0, 'A', '12A', 168459);
  })

  describe('Beta0 answers A at Level 1-2', function() {
    userActionTest(betaPhone0, 'A', '13A', 168657);
  })

  describe('Beta0 answers A at Level 1-3', function() {
    userActionTest(betaPhone0, 'A', 'END-LEVEL1', 168825);
  })


  describe('Beta1 answers A at Level 1-0', function() {
    userActionTest(betaPhone1, 'A', '11A', 168455);
  })

  describe('Beta1 answers A at Level 1-1', function() {
    userActionTest(betaPhone1, 'A', '12A', 168459);
  })

  describe('Beta1 answers A at Level 1-2', function() {
    userActionTest(betaPhone1, 'A', '13A', 168657);
  })

  describe('Beta1 answers A at Level 1-3', function() {
    userActionTest(betaPhone1, 'A', 'END-LEVEL1', 168825);
  })


  describe('Beta2 answers A at Level 1-0', function() {
    userActionTest(betaPhone2, 'A', '11A', 168455);
  })

  describe('Beta2 answers A at Level 1-1', function() {
    userActionTest(betaPhone2, 'A', '12A', 168459);
  })

  describe('Beta2 answers A at Level 1-2', function() {
    userActionTest(betaPhone2, 'A', '13A', 168657);
  })

  describe('Beta2 answers A at Level 1-3', function() {

    // userActionTest(betaPhone2, 'A', 'END-LEVEL1', 168825); // Hmmm.. this fails, because the last OIP the user gets put into is the end-level group message, not the other thang. Let's write another function to do this. 
    
    it('should move Beta2 to End-Level 1')
    it('should deliver the end-level group message')
    it('should move all players to Level 2')
  })

  describe('Alpha answers A at Level 2-0', function() {
    it('should move Alpha to Level 2-1')
  })

  describe('Alpha answers A at Level 2-1', function() {
    it('should move Alpha to Level 2-2')
  })

  describe('Alpha answers A at Level 2-2', function() {
    it('should move Alpha to End-Level 2')
  })

  describe('Beta0 answers A at Level 2-0', function() {
    it('should move Beta0 to Level 2-1')
  })

  describe('Beta0 answers A at Level 2-1', function() {
    it('should move Beta0 to Level 2-2')
  })

  describe('Beta0 answers A at Level 2-2', function() {
    it('should move Beta0 to End-Level 2')
  })

  describe('Beta1 answers A at Level 2-0', function() {
    it('should move Beta1 to Level 2-1')
  })

  describe('Beta1 answers A at Level 2-1', function() {
    it('should move Beta1 to Level 2-2')
  })

  describe('Beta1 answers A at Level 2-2', function() {
    it('should move Beta1 to End-Level 2')
  })

  describe('Beta2 answers A at Level 2-0', function() {
    it('should move Beta2 to Level 2-1')
  })

  describe('Beta2 answers A at Level 2-1', function() {
    it('should move Beta2 to Level 2-2')
  })

  describe('Beta2 answers A at Level 2-2', function() {
    it('should move Beta2 to End-Level 2')
    it('should deliver the end-level group message')
    it('should deliver to all player the end-game group message')
  })

  after(function() {
    // Remove all test documents
    gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(alphaPhone)}, function() {});
    gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone0)}, function() {});
    gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone1)}, function() {});
    gameController.userModel.remove({phone: messageHelper.getNormalizedPhone(betaPhone2)}, function() {});
    gameController.gameMappingModel.remove({_id: gameMappingId}, function() {});
    gameController.gameModel.remove({_id: gameId}, function() {});
  })
});
