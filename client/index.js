var required = Module.Helper.required;
var requireUser = Module.Helper.requireUser;

function createGame(options) {
  var userId = required(options.userId);
  Meteor.call('createGame', {userId: userId}, function(_, result) {
    Router.go('/game/' + result.gameId);
  });
}

Router.route('/', function() {
  requireUser(function(userId) {
    createGame({userId: userId});
  });
});
