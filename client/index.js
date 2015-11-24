Router.route('/', function() {
  var userId = Session.get('userId');
  Meteor.call('createGame', {userId: userId}, function(error, gameId) {
    Router.go('/game/' + gameId);
  });
});
