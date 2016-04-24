var RtsChess = Module.RtsChess;
var User = Collections.User;
var Game = Collections.Game;

Router.route('/game/:gameId', function() {
  this.render('gameContainer', {data: {gameId: this.params.gameId}});
});

Template.gameContainer.onCreated(function() {
  var self = this;

  this.subscribe('game');

  this.reactiveVars = {
    hasJoinedGame: new ReactiveVar()
  };

  this.autorun(function() {
    var user = Module.Helper.getUser();
    if (!user) {
      return;
    }

    var gameId = Template.currentData().gameId;
    Meteor.call('joinGame', {gameId: gameId, userId: user._id},
      function() {
        self.reactiveVars.hasJoinedGame.set(true);
      }
    );
  });
});

Template.gameContainer.helpers({
  gameData: function() {
    var template = Template.instance();
    var reactiveVars = template.reactiveVars;

    var user = Module.Helper.getUser();
    var subscriptionsReady = template.subscriptionsReady();
    var hasJoinedGame = reactiveVars.hasJoinedGame.get();
    if (!subscriptionsReady || !user || !hasJoinedGame) {
      return null;
    }

    var game = Game.findOne(this.gameId);

    game.myUser = User.findOne(user._id);
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
