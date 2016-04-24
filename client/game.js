var RtsChess = Module.RtsChess;
var User = Collections.User;

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

  oppTypeComputer: function() {
    return RtsChess.OPP_TYPE_COMPUTER;
  },

  oppTypeHuman: function() {
    return RtsChess.OPP_TYPE_HUMAN;
  },

  oppComputerDisabled: function() {
    if (this.oppUser && !this.oppUser.isComputer) {
      return 'disabled';
    } else {
      return null;
    }
  },

  computerDifficultyChoices: function() {
    var choices = [
      {label: '1', value: 1},
      {label: '2', value: 2},
      {label: '3', value: 3}
    ];

    var computerDifficulty = this.computerDifficulty;
    choices.some(function(choice) {
      if (computerDifficulty === choice.value) {
        choice.selected = true;
        return true;
      }
    });

    return choices;
  },

  cooldownChoices: function() {
    var choices = [
      {label: '0.0', value: 0},
      {label: '0.5', value: 500},
      {label: '1.0', value: 1000},
      {label: '2.0', value: 2000},
      {label: '3.0', value: 3000},
      {label: '5.0', value: 5000},
      {label: '10.0', value: 10000},
      {label: '15.0', value: 15000},
      {label: '20.0', value: 20000},
      {label: '30.0', value: 30000},
      {label: '45.0', value: 45000},
      {label: '60.0', value: 60000}
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
    if (Session.get('userId') !== Template.instance().data.createdById) {
      return 'disabled';
    } else {
      return null;
    }
  },

  status: function() {
    if (this.winner) {
      if (this.winner === this.myUser.color) {
        return 'Congrats! You win :)';
      } else {
        return 'Sorry. You lost :(';
      }
    } else if (!this.oppUser) {
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
      // TODO(mduan): Normalize gameStarted and gameOver into one field
      gameStarted: !!this.startTime,
      gameEnded: !!this.winner,
      color: this.myUser.color,
      cooldown: this.cooldown,
      isOppComputer: this.isOppComputer,
      computerDifficulty: this.computerDifficulty
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

  'click .oppTypeBtns .button': function(e) {
    var $target = $(e.target);
    Meteor.call('setOppType', {
      gameId: this._id,
      oppType: $target.attr('data-value')
    });
  },

  'click .computerDifficultyBtns .button': function(e) {
    var $target = $(e.target);
    var gameId = Template.instance().data._id;
    Meteor.call('updateGame', {
      gameId: gameId,
      computerDifficulty: parseInt($target.attr('data-value'))
    });
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
    /* jshint ignore:start */
    // Select url on focus: http://stackoverflow.com/questions/3150275/jquery-input-select-all-on-focus#answer-22102081
    /* jshint ignore:end */
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
