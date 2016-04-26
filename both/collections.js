var User = new Mongo.Collection('user');
var Game = new Mongo.Collection('game');
var Board = new Mongo.Collection('board');
var Move = new Mongo.Collection('move');

Collections = {
  User: User,
  Game: Game,
  Board: Board,
  Move: Move
};

function getGameUsers(options) {
  var myUser = User.findOne(Session.get('userId'));
  if (myUser._id === options.whiteUserId) {
    _.extend(myUser, {
      color: RtsChess.WHITE,
      isReady: options.whiteUserReady
    });
  } else {
    _.extend(myUser, {
      color: RtsChess.BLACK,
      isReady: options.blackUserReady
    });
  }

  var oppUser;
  if (myUser._id === options.whiteUserId && options.blackUserId) {
    oppUser = User.findOne(options.blackUserId);
    _.extend(oppUser, {
      color: RtsChess.BLACK,
      isReady: options.blackUserReady
    });
  } else if (myUser._id === options.blackUserId && options.whiteUserId) {
    oppUser = User.findOne(options.whiteUserId);
    _.extend(oppUser, {
      color: RtsChess.WHITE,
      isReady: this.whiteUserReady
    });
  }

  return {
    myUser: myUser,
    oppUser: oppUser
  };
}

Board.helpers({
  getColor: function() {
    if (Session.get('userId') === this.blackUserId) {
      return RtsChess.BLACK;
    } else {
      return RtsChess.WHITE;
    }
  },

  myUser: function() {
    var gameUsers = getGameUsers(this);
    return gameUsers.myUser;
  },

  oppUser: function() {
    var gameUsers = getGameUsers(this);
    return gameUsers.oppUser;
  },

  isComputerOpp: function() {
    var oppUser = this.oppUser();
    return oppUser.isComputer;
  },

  getLastMove: function() {
    return Move.find(
      {boardId: this._id},
      {sort: {moveIdx: -1}, limit: 1}
    ).fetch()[0];
  },

  isInProgress: function() {
    return !this.winner;
  },

  isOver: function() {
    return !!this.winner;
  },

  isWinner: function() {
    return this.myUser().color === this.winner;
  }
});

Game.helpers({
  myUser: function() {
    var gameUsers = getGameUsers(this);
    return gameUsers.myUser;
  },

  oppUser: function() {
    var gameUsers = getGameUsers(this);
    return gameUsers.oppUser;
  },

  isComputerOpp: function() {
    var oppUser = this.oppUser();
    return !!(oppUser && oppUser.isComputer);
  },

  isHumanOpp: function() {
    var oppUser = this.oppUser();
    return !!(oppUser && !oppUser.isComputer);
  },

  getBoard: function() {
    if (this.currBoardId) {
      return Board.findOne(this.currBoardId);
    } else {
      return null;
    }
  },

  isInProgress: function() {
    var board = this.getBoard();
    return !!(board && board.isInProgress());
  },

  isOver: function() {
    var board = this.getBoard();
    return !!(board && board.isOver());
  },

  isWinner: function() {
    var board = this.getBoard();
    return !!(board && board.isWinner());
  }
});
