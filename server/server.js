var User = Collections.User;
var Game = Collections.Game;
var Move = Collections.Move;
var RtsChess = Module.RtsChess;
var required = Module.Helper.required;

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

  createUser: function() {
    var userId = Collections.User.insert({});
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
    var gameId = Game.insert({
      createdById: userId,
      whiteUserId: userId,
      cooldown: 0.0
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

    if (!_.isEmpty(updateData)) {
      Game.update(gameId, {$set: updateData});
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
        if (game.whiteUserId) {
          updateData.blackUserId = game.whiteUserId;
        }
      } else {
        updateData.blackUserId = userId;
        if (game.blackUserId) {
          updateData.whiteUserId = game.blackUserId;
        }
      }
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

    if (!game.whiteUserId || !game.blackUserId) {
      if (!game.whiteUserId) {
        updateData.whiteUserId = userId;
      } else {
        updateData.blackUserId = userId;
      }
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
      updateData.startTime = new Date();
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
    ).fetch();
    var chess;
    if (lastMove.length) {
      chess = new RtsChess({position: lastMove[0].position});
    } else {
      chess = new RtsChess();
    }

    var isValid = chess.makeMove({
      source: source,
      target: target,
      color: color
    });

    if (isValid) {
      var numMoves = Move.find({gameId: gameId}).count();
      var record = {
        gameId: gameId,
        moveIdx: numMoves,
        source: source,
        target: target,
        color: color,
        position: chess.getPosition()
      };
      Move.insert(record);

      if (chess.getWinner()) {
        Game.update(gameId, {$set: {winner: chess.getWinner()}});
      }

      return {success: true};
    } else {
      return {success: true};
    }
  }
});
