Module.Helper = _.extend(Module.Helper, {
  copyToClipboard: function(text) {
    var $input = $('<input>');
    $('body').append($input);
    $input.val(text).select();
    document.execCommand('copy');
    $input.remove();
  },

  requireUser: function(callback) {
    var userId;
    var user;
    Tracker.nonreactive(function() {
      userId = Session.get('userId');
      if (userId) {
        user = Collections.User.findOne(userId);
      }
    });
    if (!user) {
      // TODO(mduan): Remove user from Session before calling createUser
      Meteor.call('createUser', function(_, result) {
        var userId = result.userId;
        Session.setPersistent('userId', userId);
        callback(userId);
      });
    } else {
      callback(userId);
    }
  }
});
