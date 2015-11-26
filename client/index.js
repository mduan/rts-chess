Router.route('/', function() {
  var userId = Session.get('userId');
  Meteor.call('createGame', {userId: userId}, function(error, result) {
    Router.go('/game/' + result.gameId);
  });
});
