var RtsChess = Module.RtsChess;
var User = Collections.User;
var Game = Collections.Game;

Router.route('/game/:gameId', function() {
  this.render('gameContainer', {data: {gameId: this.params.gameId}});
});

Template.gameContainer.onCreated(function() {
  var self = this;

  this.subscribe('user');
  this.subscribe('game');

  this.reactiveVars = {
    userId: new ReactiveVar(),
    hasJoinedGame: new ReactiveVar()
  };

  this.autorun(function() {
    if (!self.subscriptionsReady()) {
      return;
    }

    // TODO: This code is duplicated in index.js
    var userId;
    var user;
    userId = Session.get('userId');
    if (userId) {
      user = Collections.User.findOne(userId);
    }
    if (!user) {
      // TODO(mduan): Remove user from Session before calling createUser
      Meteor.call('createUser', function(_, result) {
        var userId = result.userId;
        Session.setPersistent('userId', userId);
      });
      return;
    }

    self.reactiveVars.userId.set(userId);

    var gameId = Template.currentData().gameId;
    Meteor.call('joinGame', {gameId: gameId, userId: userId},
      function() {
        self.reactiveVars.hasJoinedGame.set(true);
      }
    );
  });
});

Template.gameContainer.helpers({
  gameData: function() {
    var reactiveVars = Template.instance().reactiveVars;

    if (!Template.instance().subscriptionsReady()) {
      return null;
    }
    var userId = reactiveVars.userId.get();
    if (!userId) {
      return null;
    }

    var hasJoinedGame = reactiveVars.hasJoinedGame.get();
    if (!hasJoinedGame) {
      return null;
    }

    var game = Game.findOne(this.gameId);

    game.myUser = User.findOne(userId);
    if (game.myUser._id === game.whiteUserId) {
      _.extend(game.myUser, {
        color: RtsChess.WHITE,
        isReady: game.whiteUserReady
      });
    } else {
      _.extend(game.myUser, {
        color: RtsChess.BLACK,
        isReady: game.blackUserReady
      });
    }

    if (game.myUser._id === game.whiteUserId && game.blackUserId) {
      game.oppUser = User.findOne(game.blackUserId);
      _.extend(game.oppUser, {
        color: RtsChess.BLACK,
        isReady: game.blackUserReady
      });
    } else if (game.myUser._id === game.blackUserId && game.whiteUserId) {
      game.oppUser = User.findOne(game.whiteUserId);
      _.extend(game.oppUser, {
        color: RtsChess.WHITE,
        isReady: game.whiteUserReady
      });
    }

    return game;
  }
});
