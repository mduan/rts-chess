var reactiveUser = new ReactiveVar();

var userHandle = Meteor.subscribe('user');

Tracker.autorun(function(computation) {
  if (!userHandle || !userHandle.ready()) {
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

Module.Helper = _.extend(Module.Helper, {
  copyToClipboard: function(text) {
    var $input = $('<input>');
    $('body').append($input);
    $input.val(text).select();
    document.execCommand('copy');
    $input.remove();
  },

  getUser: function() {
    return reactiveUser.get();
  }
});
