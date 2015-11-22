Router.route('/', function() {
  var self = this;
  var userId = Meteor.userId();
  if (userId) {
    Meteor.call('getGameId', function(error, gameId) {
      var game = Collections.Game.findOne(gameId);
      var myUser = Meteor.user();
      if (game.whiteUserId === userId) {
        myUser = _.extend(myUser, {playOrder: 0});
        var oppUser = Meteor.users.findOne(game.blackUserId);
        oppUser = _.extend(oppUser, {playOrder: 1});
      } else {
        myUser = _.extend(myUser, {playOrder: 1});
        var oppUser = Meteor.users.findOne(game.whiteUserId);
        oppUser = _.extend(oppUser, {playOrder: 0});
      }

      game = _.extend(game, {
        myUser: myUser,
        oppUser: oppUser
      });

      var moves = Collections.Move.find(
        {gameId: game._id},
        {sort: {moveIdx: 1}}
      ).fetch();

      self.render('game', {
        data: function() {
          return {
            game: game,
            moves: moves
          };
        }
      });
    });
  } else {
    Router.go('/login');
  }
});

Template.game.onRendered(function() {
  var game = this.data.game;
  new Module.RtsChessBoard({
    gameId: game._id,
    moves: this.data.moves,
    orientation: game.myUser.playOrder === 0 ? 'white' : 'black',
    $board: $('#board'),
    $pgn: $('#pgn'),
    $status: $('#status')
  });
});
