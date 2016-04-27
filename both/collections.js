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
  var userId = Session.get('userId');
  // TODO: Currently handle null if User.findOne() returns null. But this
  // really shouldn't be happening. It's happening because the User collection
  // is reactively changing, but old blaze data (i.e. old white/blackUserId)
  // are used for the User.findOne().

  var whiteUser;
  if (options.whiteUserId) {
    whiteUser = User.findOne(options.whiteUserId);
    if (whiteUser) {
      _.extend(whiteUser, {
        color: RtsChess.WHITE,
        isReady: options.whiteUserReady
      });
    }
  }
  var blackUser;
  if (options.blackUserId) {
    blackUser = User.findOne(options.blackUserId);
    if (blackUser) {
      _.extend(blackUser, {
        color: RtsChess.BLACK,
        isReady: options.blackUserReady
      });
    }
  }

  var myUser;
  var oppUser;
  var isObserver = false;
  if (userId && userId === options.blackUserId) {
    myUser = blackUser;
    oppUser = whiteUser;
  } else if (userId && userId === options.whiteUserId) {
    myUser = whiteUser;
    oppUser = blackUser;
  } else {
    if (options.whiteUserId === options.createdById) {
      myUser = whiteUser;
      oppUser = blackUser;
    } else {
      myUser = blackUser;
      oppUser = whiteUser;
    }
    isObserver = true;
  }

  return {
    isObserver: isObserver,
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
  },

  isWhiteWinner: function() {
    return RtsChess.WHITE === this.winner;
  },

  isBlackWinner: function() {
    return RtsChess.BLACK === this.winner;
  },

  isObserver: function() {
    return getGameUsers(this).isObserver;
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
  },

  isWhiteWinner: function() {
    var board = this.getBoard();
    return !!(board && board.isWhiteWinner());
  },

  isBlackWinner: function() {
    var board = this.getBoard();
    return !!(board && board.isBlackWinner());
  },

  isObserver: function() {
    var gameUsers = getGameUsers(this);
    return gameUsers.isObserver;
  }
});
