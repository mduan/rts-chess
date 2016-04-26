Router.route('/', function() {
  var userId = Session.get('userId');
  if (userId) {
    Meteor.call('createGame', {userId: userId}, function(_, result) {
      Router.go('/game/' + result.gameId);
    });
  }
  this.render('loading');
});

Router.onBeforeAction(function() {
  var user;
  var userId = Session.get('userId');
  if (userId) {
    var userCursor = Meteor.subscribe('user');
    if (!userCursor.ready()) {
      this.render('loading');
      return;
    }
    user = Collections.User.findOne(userId);
  }

  if (!user) {
    Meteor.call('createUser', function(_, result) {
      var userId = result.userId;
      Session.setPersistent('userId', userId);
    });
    this.render('loading');
    return;
  }

  this.next();
});
