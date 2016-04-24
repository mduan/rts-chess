User = {
  getUser: function() {
    return reactiveUser.get();
  }
};

var reactiveUser = new ReactiveVar();
var userHandle = Meteor.subscribe('user');

Tracker.autorun(function(computation) {
  if (!userHandle.ready()) {
    return;
  }

  var user;
  var userId = Session.get('userId');
  if (userId) {
    user = Collections.User.findOne(userId);
  }
  if (!user) {
    Meteor.call('createUser', function(_, result) {
      var userId = result.userId;
      Session.setPersistent('userId', userId);
    });
    return;
  }

  reactiveUser.set(user);
  computation.stop();
});
