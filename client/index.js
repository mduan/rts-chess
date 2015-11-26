var required = Module.Helper.required;

function createGame(options) {
  var userId = required(options.userId);
  Meteor.call('createGame', {userId: userId}, function(error, result) {
    Router.go('/game/' + result.gameId);
  });
}

Router.route('/', function() {
  var userId = Session.get('userId');
  if (!userId) {
    Meteor.call('createUser', function(error, result) {
      var userId = result.userId;
      Session.setPersistent('userId', userId);
      createGame({userId: userId});
    });
  } else {
    createGame({userId: userId});
  }
});
