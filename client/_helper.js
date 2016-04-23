Module.Helper = _.extend(Module.Helper, {
  copyToClipboard: function(text) {
    var $input = $('<input>');
    $('body').append($input);
    $input.val(text).select();
    document.execCommand('copy');
    $input.remove();
  },
});
