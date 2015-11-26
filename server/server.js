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

  createUser: function(options) {
    var userId = Collections.User.insert({});
    Meteor.call('saveUsername', {
      userId: userId,
      username: 'user' + userId
    });
    return {userId: userId};
  },

  saveUsername: function(options) {
    var userId = required(options.userId);
    var username = required(options.username);
    var user = User.findOne(userId);
    if (username && username !== user.username) {
      User.update(userId, {$set: {username: username}});
    }
  },

  createGame: function(options) {
    var userId = required(options.userId);
    var gameId = Game.insert({
      createdById: userId,
      whiteUserId: userId
    });
    return {gameId: gameId};
  },

  joinGame: function(options) {
    var gameId = required(options.gameId);
    var userId = required(options.userId);
    // TODO(mduan): Validate game exists
    var game = Game.findOne(gameId);
    if (userId === game.whiteUserId || userId === game.blackUserId) {
      return {success: true};
    } else if (!game.whiteUserId || !game.blackUserId) {
      if (!game.whiteUserId) {
        var updateData = {whiteUserId: userId};
      } else {
        var updateData = {blackUserId: userId};
      }
      Game.update(game._id, {$set: updateData});
      return {success: true};
    } else {
      return {success: false};
    }
  },

  startGame: function(options) {
    var gameId = required(options.gameId);
    var userId = required(options.color);
    var game = Game.findOne(gameId);
    var updateData = {};
    if (color === RtsChess.WHITE) {
      updateData.whiteUserReady = true;
    } else {
      updateData.blackUserReady = true;
    }
    if ((game.whiteUserReady || updateData.whiteUserReady) &&
        (game.blackUserReady || updateData.blackUserReady)) {
      updateData.startTime = new Date();
    }
    Game.update(game._id, {$set: updateData});

    return {success: !!updateData.startGame};
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
    if (lastMove.length) {
      var chess = new RtsChess({position: lastMove[0].position});
    } else {
      var chess = new RtsChess();
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
