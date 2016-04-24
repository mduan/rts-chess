var User = Collections.User;
var Game = Collections.Game;
var Move = Collections.Move;
var RtsChess = Module.RtsChess;
var required = Module.Helper.required;

Meteor.publish('user', function() {
  return User.find();
});
Meteor.publish('game', function() {
  return Game.find();
});
Meteor.publish('move', function() {
  return Move.find();
});

function getGameUsers(options) {
  var blackUser;
  var blackUserId = options.blackUserId;
  if (blackUserId) {
    blackUser = User.findOne(blackUserId);
  }
  var whiteUser;
  var whiteUserId = options.whiteUserId;
  if (whiteUserId) {
    whiteUser = User.findOne(whiteUserId);
  }

  var createdByUser;
  var oppUser;
  if (options.createdById === whiteUserId) {
    createdByUser = whiteUser;
    oppUser = blackUser;
  }
  if (options.createdById === blackUserId) {
    createdByUser = blackUser;
    oppUser = whiteUser;
  }

  return {
    white: whiteUser,
    black: blackUser,
    createdBy: createdByUser,
    opp: oppUser
  };
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

  createUser: function(options) {
    options = options || {};
    var userId = Collections.User.insert({
      isComputer: !!options.isComputer
    });
    Meteor.call('updateUser', {
      userId: userId,
      username: 'user' + userId
    });
    return {userId: userId};
  },

  updateUser: function(options) {
    var userId = required(options.userId);
    var user = User.findOne(userId);
    var updateData = {};

    var username = options.username;
    if (username && username !== user.username) {
      updateData.username = username;
    }

    if (!_.isEmpty(updateData)) {
      User.update(userId, {$set: updateData});
    }
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

    var positions = {};
    _.each(RtsChess.getStartPosition(), function(piece, square) {
      positions[square] = {
        piece: piece,
        lastMoveTime: 0
      };
    });
    Move.insert({
      gameId: gameId,
      moveIdx: 0,
      positions: positions
    });

    return {gameId: gameId};
  },

  updateGame: function(options) {
    var gameId = required(options.gameId);
    var game = Game.findOne(gameId);
    var updateData = {};

    var cooldown = options.cooldown;
    if (_.isFinite(cooldown) && cooldown !== game.cooldown) {
      updateData.cooldown = cooldown;
    }

    var computerDifficulty = options.computerDifficulty;
    if (_.isFinite(computerDifficulty) &&
        computerDifficulty !== game.computerDifficulty) {
      updateData.computerDifficulty = computerDifficulty;
    }

    if (!_.isEmpty(updateData)) {
      Game.update(gameId, {$set: updateData});
    }
  },

  setOppType: function(options) {
    var gameId = required(options.gameId);
    var oppType = required(options.oppType);
    var game = Game.findOne(gameId);

    var gameUsers = getGameUsers(game);

    if (oppType === RtsChess.OPP_TYPE_HUMAN) {
      if (gameUsers.opp && gameUsers.opp.isComputer) {
        var unsetData = {};
        if (gameUsers.opp === gameUsers.white) {
          unsetData.whiteUserId = true;
          unsetData.whiteUserReady = true;
        } else {
          unsetData.blackUserId = true;
          unsetData.blackUserReady = true;
        }
        User.remove(gameUsers.opp._id);
        Game.update(gameId, {$unset: unsetData});
      }
    } else if (oppType === RtsChess.OPP_TYPE_COMPUTER) {
      if (!gameUsers.opp) {
        var createUserResult = Meteor.call(
          'createUser',
          {isComputer: true}
        );
        var setData = {};
        if (gameUsers.createdBy === gameUsers.white) {
          setData.blackUserId = createUserResult.userId;
          setData.blackUserReady = true;
        } else {
          setData.whiteUserId = createUserResult.userId;
          setData.whiteUserReady = true;
        }
        Game.update(gameId, {$set: setData});
      }
    }
  },

  swapPlayerColor: function(options) {
    var gameId = required(options.gameId);
    var userId = required(options.userId);
    var color = required(options.color);
    var game = Game.findOne(gameId);
    var updateData = {};

    if (color === RtsChess.WHITE && userId !== game.whiteUserId ||
        color === RtsChess.BLACK && userId !== game.blackUserId) {
      if (color === RtsChess.WHITE) {
        updateData.whiteUserId = userId;
        updateData.blackUserId = game.whiteUserId;
      } else {
        updateData.blackUserId = userId;
        updateData.whiteUserId = game.blackUserId;
      }
      updateData.whiteUserReady = game.whiteUserReady;
      updateData.blackUserReady = game.blackUserReady;
    }

    if (!_.isEmpty(updateData)) {
      Game.update(gameId, {$set: updateData});
    }
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

  startGame: function(options) {
    var gameId = required(options.gameId);
    var userId = required(options.userId);
    var game = Game.findOne(gameId);
    var updateData = {};

    if (userId === game.whiteUserId) {
      updateData.whiteUserReady = true;
    } else if (userId === game.blackUserId) {
      updateData.blackUserReady = true;
    }

    if ((game.whiteUserReady || updateData.whiteUserReady) &&
        (game.blackUserReady || updateData.blackUserReady)) {
      updateData.startTime = Date.now();
    }

    if (!_.isEmpty(updateData)) {
      Game.update(gameId, {$set: updateData});
    }

    return {success: !!updateData.startTime};
  },

  makeMove: function(options) {
    var gameId = required(options.gameId);
    var source = required(options.source);
    var target = required(options.target);
    var color = required(options.color);

    var lastMove = Move.find(
      {gameId: gameId},
      {sort: {moveIdx: -1}, limit: 1}
    ).fetch()[0];
    var chess = RtsChess.fromMovePositions(lastMove.positions);

    var elapsedTime = Date.now() - lastMove.positions[source].lastMoveTime;
    var game = Game.findOne(gameId);
    if (elapsedTime < game.cooldown) {
      return {success: false};
    }

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
      var numMoves = Move.find({gameId: gameId}).count();
      Move.insert({
        gameId: gameId,
        moveIdx: numMoves,
        source: source,
        target: target,
        color: color,
        positions: lastMove.positions
      });

      if (chess.getWinner()) {
        Game.update(gameId, {$set: {winner: chess.getWinner()}});
      }

      return {success: true};
    } else {
      return {success: false};
    }
  }
});
