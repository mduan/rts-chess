Router.route('/', function() {
  this.render('index', {data: {}});
});

Template.index.onCreated(function() {
  this.autorun(function() {
    var user = Module.Helper.getUser();
    if (!user) {
      return;
    }

    Meteor.call('createGame', {userId: user._id}, function(_, result) {
      Router.go('/game/' + result.gameId);
    });
  });
});
