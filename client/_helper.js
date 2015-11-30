Module.Helper = _.extend(Module.Helper, {
  copyToClipboard: function(text) {
    var $input = $('<input>');
    $('body').append($input);
    $input.val(text).select();
    document.execCommand('copy');
    $input.remove();
  },

  createUser: function(callback) {
    Meteor.call('createUser', function(_, result) {
      var userId = result.userId;
      Session.setPersistent('userId', userId);
      callback(userId);
    });
  }
});
