var reactiveUser = new ReactiveVar();

function createUser() {
  Meteor.call('createUser', function(_, result) {
    Session.setPersistent('userId', result.userId);
    reactiveUser.set(true);
  });
}

var userId = Session.get('userId');
if (userId) {
  Meteor.call('findUser', userId, function(_, result) {
    if (result.success) {
      reactiveUser.set(true);
    } else {
      createUser();
    }
  });
} else {
  createUser();
}

Router.onBeforeAction(function() {
  if (reactiveUser.get()) {
    this.next();
  } else {
    this.render('loading');
  }
});
