var required = Module.Helper.required;
var requireUser = Module.Helper.requireUser;

function createGame(options) {
  var userId = required(options.userId);
  var callback = required(options.callback);
  Meteor.call('createGame', {userId: userId}, function(_, result) {
    callback(result.gameId);
  });
}

Router.route('/', function() {
  var self = this;

  this.render('loading', {data: {message: 'Creating game'}});

  requireUser(function(userId) {
    createGame({
      userId: userId,
      callback: function(gameId) {
        self.redirect('/game/' + gameId);
      }
    });
  });
});
