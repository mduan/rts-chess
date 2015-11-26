var RtsChess = Module.RtsChess;
var User = Collections.User;

Router.route('/game/:gameId', function() {
  var userId = Session.get('userId');
  if (!userId) {
    Router.go('/');
  }

  var gameId = this.params.gameId;
  var self = this;
  Meteor.call('joinGame', {gameId: gameId, userId: userId},
    function(error, result) {
      self.render('game', {
        data: function() {
          return {gameId: gameId};
        }
      });
    }
  );
});

function getMyUser(game) {
  var myUser = User.findOne(Session.get('userId'));
  if (myUser._id === game.whiteUserId) {
    return _.extend(myUser, {color: RtsChess.WHITE});
  } else {
    return _.extend(myUser, {color: RtsChess.BLACK});
  }
}

function getOppUser(game) {
  var myUser = User.findOne(Session.get('userId'));
  if (myUser._id === game.whiteUserId && game.blackUserId) {
    var oppUser = User.findOne(game.blackUserId);
    return _.extend(oppUser, {color: RtsChess.BLACK});
  } else if (myUser._id === game.blackUserId && game.whiteUserId) {
    var oppUser = User.findOne(game.whiteUserId);
    return _.extend(oppUser, {color: RtsChess.WHITE});
  }
  return null;
}

Template.registerHelper('toFloat', function(str) {
  return parseFloat(str);
});

Template.registerHelper('equal', function(val1, val2) {
  return val1 === val2;
});

Template.game.helpers({
  game: function() {
    var game = Collections.Game.findOne(this.gameId);
    Template.instance().game.set(game);
    return game;
  },

  myUser: function() {
    return getMyUser(this);
  },

  oppUser: function() {
    return getOppUser(this);
  },

  cooldownVals: function() {
    return ['0.0', '0.5', '1.0', '2.0'];
  },

  status: function() {
    if (!getOppUser(this)) {
      return 'Waiting for opponent';
    } else {
      return 'Click "Start" to begin';
    }
  },

  moves: function() {
    var moves = Collections.Move.find(
      {gameId: this._id},
      {sort: {moveIdx: 1}}
    ).fetch();
    Template.instance().moves.set(moves);
    return moves;
  }
});

Template.game.onCreated(function() {
  this.game = new ReactiveVar();
  this.moves = new ReactiveVar([]);
});

Template.game.onRendered(function() {
  var self = this;
  this.autorun(function() {
    var game = self.game.get();
    var moves = self.moves.get();

    Tracker.afterFlush(function() {
      self.$('.myUsername input').blur(function() {
        var $el = $(this);
        var newUsername = $el.val();
        if (newUsername) {
          Meteor.call('updateUser', {
            userId: Session.get('userId'),
            username: newUsername
          });
        } else {
          $el.val(User.findOne(Session.get('userId')).username);
        }
      });

      self.$('.ui.dropdown').dropdown({
        onChange: function(value, text, $selectedItem) {
          var cooldown = parseFloat(value);
          Meteor.call('updateGame', {
            gameId: game._id,
            cooldown: cooldown
          });
        }
      });

      self.$('[title]').popup();

      if (self.rtsChessBoard) {
        self.rtsChessBoard.destroy();
      }
      self.rtsChessBoard = new Module.RtsChessBoard({
        gameId: game._id,
        moves: moves,
        color: getMyUser(game).color,
        started: !!game.startTime,
        $board: self.$('.board')
      });
    });
  });
});

Template.userField.onRendered(function() {
  var self = this;
  this.autorun(function() {
    self.$('input').keypress(function(e) {
      if (e.which == 13 /* enter */) {
        $(this).blur();
      }
    });
  });
});
