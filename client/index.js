var required = Module.Helper.required;
var createUser = Module.Helper.createUser;
var User = Collections.User;

function createGame(options) {
  var userId = required(options.userId);
  Meteor.call('createGame', {userId: userId}, function(_, result) {
    Router.go('/game/' + result.gameId);
  });
}

Router.route('/', function() {
  var userId = Session.get('userId');
  if (!userId || !User.find(userId).count()) {
    // TODO(mduan): Remove user from Session before calling createUser
    createUser(function(userId) {
      createGame({userId: userId});
    });
  } else {
    createGame({userId: userId});
  }
});
