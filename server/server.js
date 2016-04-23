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
      cooldown: 0
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
        updateData.blackUserId = game.whiteUserId;
      } else {
        updateData.blackUserId = userId;
        updateData.whiteUserId = game.blackUserId;
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
      updateData.startTime = Date.now();
    }

    if (!_.isEmpty(updateData)) {
      Game.update(gameId, {$set: updateData});
    }

    return {success: !!updateData.startTime};
  }
});
