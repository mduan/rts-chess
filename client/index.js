Router.route('/', function() {
  var userId = Session.get('userId');
  if (userId) {
    Meteor.call('createGame', {userId: userId}, function(_, result) {
      Router.go('/game/' + result.gameId);
    });
  }
  this.render('loading');
});
