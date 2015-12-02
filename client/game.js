var RtsChess = Module.RtsChess;
var User = Collections.User;
var Game = Collections.Game;
var createUser = Module.Helper.createUser;

Router.route('/game/:gameId', function() {

  function getGame(gameId) {
    var game = Game.findOne(gameId);

    game.myUser = User.findOne(Session.get('userId'));
    if (game.myUser._id === game.whiteUserId) {
      _.extend(game.myUser, {
        color: RtsChess.WHITE,
        isReady: game.whiteUserReady
      });
    } else {
      _.extend(game.myUser, {
        color: RtsChess.BLACK,
        isReady: game.blackUserReady
      });
    }

    if (game.myUser._id === game.whiteUserId && game.blackUserId) {
      game.oppUser = User.findOne(game.blackUserId);
      _.extend(game.oppUser, {
        color: RtsChess.BLACK,
        isReady: game.blackUserReady
      });
    } else if (game.myUser._id === game.blackUserId && game.whiteUserId) {
      game.oppUser = User.findOne(game.whiteUserId);
      _.extend(game.oppUser, {
        color: RtsChess.WHITE,
        isReady: game.whiteUserReady
      });
    }

    return game;
  }

  function joinGame(renderFunc, gameId, userId) {
    Meteor.call('joinGame', {gameId: gameId, userId: userId},
      function() {
        renderFunc('game', {
          data: function() {
            return getGame(gameId);
          }
        });
      }
    );
  }

  var renderFunc = this.render.bind(this);
  var gameId = this.params.gameId;
  var userId = Session.get('userId');
  if (!userId) {
    createUser(function(userId) {
      joinGame(renderFunc, gameId, userId);
    });
  } else {
    joinGame(renderFunc, gameId, userId);
  }
});

Template.registerHelper('toFloat', function(str) {
  return parseFloat(str);
});

Template.registerHelper('equal', function(val1, val2) {
  return val1 === val2;
});

Template.game.helpers({
  isBlack: function() {
    return this.myUser.color === RtsChess.BLACK;
  },

  whiteColor: function() {
    return RtsChess.WHITE;
  },

  blackColor: function() {
    return RtsChess.BLACK;
  },

  cooldownChoices: function() {
    var choices = [
      {label: '0.0', value: 0},
      {label: '0.5', value: 500},
      {label: '1.0', value: 1000},
      {label: '2.0', value: 2000}
    ];

    var cooldown = this.cooldown;
    choices.some(function(choice) {
      if (cooldown === choice.value) {
        choice.selected = true;
        return true;
      }
    });

    return choices;
  },

  gameUrl: function() {
    return location.href;
  },

  disabled: function() {
    if (Session.get('userId') !== this.createdById) {
      return 'disabled';
    } else {
      return null;
    }
  },

  status: function() {
    if (!this.oppUser) {
      return 'Waiting for opponent to join';
    } else if (!this.myUser.isReady) {
      return 'Click "Start" to begin';
    } else if (!this.startTime) {
      return 'Waiting for opponent to click "Start"';
    } else {
      return null;
    }
  },

  boardData: function() {
    return {
      gameId: this._id,
      color: this.myUser.color,
      cooldown: this.cooldown
    };
  }
});

Template.game.events({
  'blur .myUsername input': function(e) {
    var $target = $(e.target);
    var userId = Session.get('userId');
    var newUsername = $target.val();
    if (newUsername) {
      Meteor.call('updateUser', {
        userId: userId,
        username: newUsername
      });
    } else {
      $target.val(User.findOne(userId).username);
    }
  },

  'click .colorBtns .button': function(e) {
    var $target = $(e.target);
    var userId = Session.get('userId');
    Meteor.call('swapPlayerColor', {
      gameId: this._id,
      userId: userId,
      color: $target.attr('data-color')
    });
  },

  'focus input': function(e) {
    /* jshint -W101 */
    // Select url on focus: http://stackoverflow.com/questions/3150275/jquery-input-select-all-on-focus#answer-22102081
    /* jshint +W101 */
    var $target = $(e.target).one('mouseup.mouseupSelect', function() {
      $target.select();
      return false;
    }).one('mousedown', function() {
      // compensate for untriggered 'mouseup' caused by focus via tab
      $target.off('mouseup.mouseupSelect');
    }).select();
  },

  'keypress input': function(e) {
    if (e.which === 13 /* enter */) {
      $(e.target).blur();
    }
  },

  'click .shareUrlInput .copyUrlBtn': function(e) {
    var $input = $(e.target).closest('.shareUrlInput').find('input');
    Module.Helper.copyToClipboard($input.val());
  },

  'click .startBtn .button': function() {
    var userId = Session.get('userId');
    Meteor.call('startGame', {
      gameId: this._id,
      userId: userId
    });
  }
});

Template.game.onCreated(function() {
  var self = this;

  this.reactiveVars = {
    _id: new ReactiveVar(),
    cooldown: new ReactiveVar()
  };

  this.autorun(function() {
    var data = Template.currentData();
    self.reactiveVars._id.set(data._id);
    self.reactiveVars.cooldown.set(data.cooldown);
  });
});

Template.game.onRendered(function() {
  var self = this;

  this.$('[title]').popup();

  this.autorun(function() {
    var gameId = self.reactiveVars._id.get();
    // Limit this to just changes of the cooldown value
    self.reactiveVars.cooldown.get();
    Tracker.afterFlush(function() {
      // Need to reattach dropdown to pick up reactive changes to the
      // cooldown value
      self.$('.ui.dropdown').dropdown({
        onChange: function(value) {
          Meteor.call('updateGame', {
            gameId: gameId,
            cooldown: parseInt(value)
          });
        }
      });
    });
  });
});
