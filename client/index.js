var required = Module.Helper.required;
var createUser = Module.Helper.createUser;

function createGame(options) {
  var userId = required(options.userId);
  Meteor.call('createGame', {userId: userId}, function(_, result) {
    Router.go('/game/' + result.gameId);
  });
}

Router.route('/', function() {
  var userId = Session.get('userId');
  if (!userId) {
    createUser(function(userId) {
      createGame({userId: userId});
    });
  } else {
    createGame({userId: userId});
  }
});
