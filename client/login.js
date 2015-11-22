Router.route('/login', function() {
  this.render('login');
});

Template.login.events({
  'submit form': function(e) {
    e.preventDefault();
    console.log('submitting form');
    $target = $(e.target);
    Accounts.createUser({
      email: $target.find('[name="email"]').val(),
      username: $target.find('[name="username"]').val(),
      password: $target.find('[name="password"]').val()
    }, function() {
      Router.go('/');
    });
  }
});
