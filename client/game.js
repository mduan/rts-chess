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

      console.log('game', game);

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
  var game = this.data.game;
  new Module.RtsChessBoard({
    $board: $('#board'),
    $pgn: $('#pgn'),
    $status: $('#status'),
    orientation: game.myUser.playOrder === 0 ? 'white' : 'black'
  });
});
