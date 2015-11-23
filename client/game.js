Router.route('/', function() {
  var self = this;
  var userId = Meteor.userId();
  if (userId) {
    Meteor.call('getGameId', function(error, gameId) {
      var game = Collections.Game.findOne(gameId);
      var myUser = Meteor.user();

      if (game.startTime) {
        if (game.whiteUserId === userId) {
          myUser = _.extend(myUser, {playOrder: 0});
          var oppUser = Meteor.users.findOne(game.blackUserId);
          oppUser = _.extend(oppUser, {playOrder: 1});
        } else {
          myUser = _.extend(myUser, {playOrder: 1});
          var oppUser = Meteor.users.findOne(game.whiteUserId);
          oppUser = _.extend(oppUser, {playOrder: 0});
        }
      } else {
        var oppUser = null;
      }

      game = _.extend(game, {
        myUser: myUser,
        oppUser: oppUser
      });

      self.render('game', {
        data: function() {
          return {game: game};
        }
      });
    });
  } else {
    Router.go('/login');
  }
});

Template.game.onRendered(function() {
  var self = this;

  Tracker.autorun(function() {
    if (self.rtsChessBoard) {
      self.rtsChessBoard.destroy();
    }

    var game = self.data.game;

    var moves = Collections.Move.find(
      {gameId: game._id},
      {sort: {moveIdx: 1}}
    ).fetch();

    self.rtsChessBoard = new Module.RtsChessBoard({
      gameId: game._id,
      moves: moves,
      orientation: game.myUser.playOrder === 0 ? 'white' : 'black',
      $board: $('#board'),
      $pgn: $('#pgn'),
      $status: $('#status')
    });
  });
});
