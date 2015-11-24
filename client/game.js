Router.route('/', function() {
  var self = this;
  var userId = Meteor.userId();
  if (userId) {
    Meteor.call('getGameId', function(error, gameId) {
      self.render('game', {
        data: function() {
          return {gameId: gameId};
        }
      });
    });
  } else {
    Router.go('/login');
  }
});

Template.game.helpers({
  game: function() {
    var RtsChess = Module.RtsChess;

    var game = Collections.Game.findOne(this.gameId);
    var myUser = Meteor.user();

    if (game.whiteUserId === myUser._id) {
      myUser = _.extend(myUser, {color: RtsChess.WHITE});
      if (game.blackUserId) {
        var oppUser = Meteor.users.findOne(game.blackUserId);
        oppUser = _.extend(oppUser, {color: RtsChess.BLACK});
      }
    } else {
      myUser = _.extend(myUser, {color: RtsChess.BLACK});
      if (game.whiteUserId) {
        var oppUser = Meteor.users.findOne(game.whiteUserId);
        oppUser = _.extend(oppUser, {color: RtsChess.WHITE});
      }
    }

    // TODO(mduan): Move this into separate Tracker.autorun
    var moves = Collections.Move.find(
      {gameId: game._id},
      {sort: {moveIdx: 1}}
    ).fetch();

    _.extend(game, {
      myUser: myUser,
      oppUser: oppUser,
      moves: moves
    });

    Template.instance().game.set(game);
    return game;
  }
});

Template.game.onCreated(function() {
  this.game = new ReactiveVar();
});

Template.game.onRendered(function() {
  var self = this;
  this.autorun(function() {
    if (self.rtsChessBoard) {
      self.rtsChessBoard.destroy();
    }

    var game = self.game.get();
    self.rtsChessBoard = new Module.RtsChessBoard({
      gameId: game._id,
      moves: game.moves,
      color: game.myUser.color,
      $board: $('#board')
    });
  });
});
