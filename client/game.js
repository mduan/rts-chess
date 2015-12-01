var RtsChess = Module.RtsChess;
var User = Collections.User;
var Game = Collections.Game;
var Move = Collections.Move;
var createUser = Module.Helper.createUser;

Router.route('/game/:gameId', function() {
  function joinGame(renderFunc, gameId, userId) {
    Meteor.call('joinGame', {gameId: gameId, userId: userId},
      function() {
        renderFunc('game', {
          data: function() {
            return {gameId: gameId};
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

function getMyUser(game) {
  var myUser = User.findOne(Session.get('userId'));
  if (myUser._id === game.whiteUserId) {
    return _.extend(myUser, {
      color: RtsChess.WHITE,
      isReady: game.whiteUserReady
    });
  } else {
    return _.extend(myUser, {
      color: RtsChess.BLACK,
      isReady: game.blackUserReady
    });
  }
}

function getOppUser(game) {
  var myUser = User.findOne(Session.get('userId'));
  var oppUser;
  if (myUser._id === game.whiteUserId && game.blackUserId) {
    oppUser = User.findOne(game.blackUserId);
    return _.extend(oppUser, {
      color: RtsChess.BLACK,
      isReady: game.blackUserReady
    });
  } else if (myUser._id === game.blackUserId && game.whiteUserId) {
    oppUser = User.findOne(game.whiteUserId);
    return _.extend(oppUser, {
      color: RtsChess.WHITE,
      isReady: game.whiteUserReady
    });
  }
  return null;
}

function getGame(gameId) {
  return Game.findOne(gameId);
}

function getMoves(gameId) {
  return Move.find({gameId: gameId}, {sort: {moveIdx: 1}}).fetch();
}

Template.game.helpers({
  game: function() {
    return getGame(this.gameId);
  },

  moves: function() {
    return getMoves(this._id);
  },

  myUser: function() {
    return getMyUser(this);
  },

  oppUser: function() {
    return getOppUser(this);
  },

  isBlack: function() {
    return getMyUser(this).color === RtsChess.BLACK;
  },

  whiteColor: function() {
    return RtsChess.WHITE;
  },

  blackColor: function() {
    return RtsChess.BLACK;
  },

  cooldownChoices: function() {
    return [
      {label: '0.0', value: 0},
      {label: '0.5', value: 500},
      {label: '1.0', value: 1000},
      {label: '2.0', value: 2000}
    ];
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
    if (!getOppUser(this)) {
      return 'Waiting for opponent to join';
    } else if (!getMyUser(this).isReady) {
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
      color: getMyUser(this).color
    };
  }
});

Template.game.onRendered(function() {
  var self = this;
  this.autorun(function() {
    var gameId = self.data.gameId;
    var game = getGame(gameId);
    var userId = Session.get('userId');

    Tracker.afterFlush(function() {
      self.$('.myUsername input').blur(function() {
        var $el = $(this);
        var newUsername = $el.val();
        if (newUsername) {
          Meteor.call('updateUser', {
            userId: userId,
            username: newUsername
          });
        } else {
          $el.val(User.findOne(userId).username);
        }
      });

      self.$('.ui.dropdown').dropdown({
        onChange: function(value) {
          Meteor.call('updateGame', {
            gameId: game._id,
            cooldown: parseInt(value)
          });
        }
      });

      self.$('.colorBtns .button').click(function() {
        Meteor.call('swapPlayerColor', {
          gameId: game._id,
          userId: userId,
          color: $(this).attr('data-color')
        });
      });

      /* jshint -W101 */
      // Select url on focus: http://stackoverflow.com/questions/3150275/jquery-input-select-all-on-focus#answer-22102081
      /* jshint +W101 */
      self.$('.shareUrlInput input').focus(function() {
        var $el = $(this).one('mouseup.mouseupSelect', function() {
          $el.select();
          return false;
        }).one('mousedown', function() {
          // compensate for untriggered 'mouseup' caused by focus via tab
          $el.off('mouseup.mouseupSelect');
        }).select();
      });

      self.$('.shareUrlInput .copyUrlBtn').click(function() {
        var $input = $(this).closest('.shareUrlInput').find('input');
        Module.Helper.copyToClipboard($input.val());
      });

      self.$('[title]').popup();

      self.$('.startBtn .button').click(function() {
        Meteor.call('startGame', {
          gameId: game._id,
          userId: userId
        });
      });
    });
  });
});

Template.userField.onRendered(function() {
  var self = this;
  this.autorun(function() {
    self.$('input').keypress(function(e) {
      if (e.which === 13 /* enter */) {
        $(this).blur();
      }
    });
  });
});
