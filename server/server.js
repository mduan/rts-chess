var User = Collections.User;
var Game = Collections.Game;
var Board = Collections.Board;
var Move = Collections.Move;
var required = Module.Helper.required;

Meteor.publishComposite('gameData', function(gameId) {
  return {
    find: function() {
      return Game.find({_id: gameId});
    },
    children: [{
      find: function(game) {
        return Board.find({gameId: game._id});
      },
      children: [{
        find: function(board) {
          return Move.find({boardId: board._id});
        }
      }]
    }, {
      find: function(game) {
        var userIds = [];
        if (game.whiteUserId) {
          userIds.push(game.whiteUserId);
        }
        if (game.blackUserId) {
          userIds.push(game.blackUserId);
        }
        return User.find({_id: {$in: userIds}});
      }
    }]
  };
});

function createBoard(gameId) {
  var game = Game.findOne(gameId);
  var boardId = Board.insert({
    gameId: game._id,
    cooldown: game.cooldown,
    whiteUserId: game.whiteUserId,
    blackUserId: game.blackUserId,
    computerDifficulty: game.computerDifficulty
  });

  Game.update(gameId, {$set: {currBoardId: boardId}});

  var positions = {};
  _.each(RtsChess.getStartPosition(), function(piece, square) {
    positions[square] = {
      piece: piece,
      lastMoveTime: 0
    };
  });
  Move.insert({
    boardId: boardId,
    moveIdx: 0,
    positions: positions
  });
}

Meteor.methods({
  reset: function() {
    Meteor.call('resetGames');
    Meteor.call('resetMoves');
  },

  resetGames: function() {
    Game.remove({});
  },

  resetMoves: function() {
    Move.remove({});
  },

  findUser: function(userId) {
    return {success: !!User.findOne(userId)};
  },

  createGame: function(options) {
    var userId = required(options.userId);

    var createUserResult = Meteor.call(
      'createUser',
      {isComputer: true}
    );
    // TODO: Refactor hardcoded values
    var gameId = Game.insert({
      computerDifficulty: 2,
      createdById: userId,
      whiteUserId: userId,
      blackUserId: createUserResult.userId,
      blackUserReady: true,
      cooldown: 3000
    });

    return {gameId: gameId};
  },

  joinGame: function(options) {
    var gameId = required(options.gameId);
    var userId = required(options.userId);
    var game = Game.findOne(gameId);
    var updateData = {};

    if (userId === game.whiteUserId || userId === game.blackUserId) {
      return {success: true};
    }

    var whiteUser;
    if (game.whiteUserId) {
      whiteUser = User.findOne(game.whiteUserId);
    }
    var blackUser;
    if (game.blackUserId) {
      blackUser = User.findOne(game.blackUserId);
    }

    // Setting *UserReady as well since there might have been a computer
    // player whose *UserReady is defaulted to true
    if (!whiteUser || whiteUser.isComputer) {
      updateData.whiteUserId = userId;
      updateData.whiteUserReady = false;
    } else if (!blackUser || blackUser.isComputer) {
      updateData.blackUserId = userId;
      updateData.blackUserReady = false;
    }

    if (!_.isEmpty(updateData)) {
      Game.update(gameId, {$set: updateData});
      return {success: true};
    } else {
      return {success: false};
    }
  },

  startBoard: function(options) {
    var gameId = required(options.gameId);
    var userId = required(options.userId);
    var game = Game.findOne(gameId);
    var updateData = {};

    if (userId === game.whiteUserId) {
      updateData.whiteUserReady = true;
    } else if (userId === game.blackUserId) {
      updateData.blackUserReady = true;
    }

    var success = false;
    if ((game.whiteUserReady || updateData.whiteUserReady) &&
        (game.blackUserReady || updateData.blackUserReady)) {
      success = true;
      createBoard(gameId);
    }

    if (!_.isEmpty(updateData)) {
      Game.update(gameId, {$set: updateData});
    }

    return {success: success};
  },

  makeMove: function(options) {
    var boardId = required(options.boardId);
    var source = required(options.source);
    var target = required(options.target);
    var color = required(options.color);

    var lastMove = Move.find(
      {boardId: boardId},
      {sort: {moveIdx: -1}, limit: 1}
    ).fetch()[0];
    if (!(source in lastMove.positions)) {
      return {success: false};
    }

    var elapsedTime = Date.now() - lastMove.positions[source].lastMoveTime;
    var board = Board.findOne(boardId);
    var game = Game.findOne(board.gameId);
    if (elapsedTime < game.cooldown) {
      return {success: false};
    }

    var chess = RtsChess.fromMovePositions(lastMove.positions);
    var isValid = chess.makeMove({
      source: source,
      target: target,
      color: color
    });

    if (isValid) {
      // TODO(mduan): Clean this up? Maybe have RtsChess return positions
      // with lastMoveTime as part of .getPositions()?
      delete lastMove.positions[source];
      lastMove.positions[target] = {
        piece: chess.getPositions()[target],
        lastMoveTime: Date.now()
      };
      var numMoves = Move.find({boardId: boardId}).count();
      Move.insert({
        boardId: boardId,
        moveIdx: numMoves,
        source: source,
        target: target,
        color: color,
        positions: lastMove.positions
      });

      if (chess.getWinner()) {
        Meteor.call('resignBoard', {
          gameId: board.gameId,
          winner: chess.getWinner()
        });
      }

      return {success: true};
    } else {
      return {success: false};
    }
  }
});
