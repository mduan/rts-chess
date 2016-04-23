Router.route('/', function() {
  this.render('index', {data: {}});
});

Template.index.onCreated(function() {
  this.subscribe('user');
});

Template.index.onRendered(function() {
  this.autorun(function() {
    if (!Template.instance().subscriptionsReady()) {
      return;
    }

    var user;
    var userId = Session.get('userId');
    if (userId) {
      user = Collections.User.findOne(userId);
    }
    if (!user) {
      // TODO(mduan): Remove user from Session before calling createUser
      Meteor.call('createUser', function(_, result) {
        var userId = result.userId;
        Session.setPersistent('userId', userId);
      });
      return;
    }

    Meteor.call('createGame', {userId: userId}, function(_, result) {
      Router.go('/game/' + result.gameId);
    });
  });
});
