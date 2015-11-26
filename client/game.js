var RtsChess = Module.RtsChess;

Router.route('/game/:gameId', function() {
  var gameId = this.params.gameId;
  var userId = Session.get('userId');
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
  var myUser = {_id: Session.get('userId')};
  if (game.whiteUserId === myUser._id) {
    return _.extend(myUser, {color: RtsChess.WHITE});
  } else {
    return _.extend(myUser, {color: RtsChess.BLACK});
  }
}

function getOppUser(game) {
  var myUserId = Session.get('userId');
  if (myUserId === game.whiteUserId && game.blackUserId) {
    return {_id: game.blackUserId, color: RtsChess.BLACK};
  } else if (myUserId === game.blackUserId && game.whiteUserId) {
    return {_id: game.whiteUserId, color: RtsChess.WHITE};
  }
  return null;
}

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
    self.$('.ui.dropdown').dropdown();
    self.$('[title]').popup();

    if (self.rtsChessBoard) {
      self.rtsChessBoard.destroy();
    }

    var game = self.game.get();
    var moves = self.moves.get();
    self.rtsChessBoard = new Module.RtsChessBoard({
      gameId: game._id,
      moves: moves,
      color: getMyUser(game).color,
      started: !!game.startTime,
      $board: self.$('.board')
    });
  });
});
