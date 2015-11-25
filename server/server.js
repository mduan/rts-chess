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

  createGame: function(options) {
    var userId = required(options.userId);
    return Game.insert({
      createdById: userId,
      whiteUserId: userId
    });
  },

  joinGame: function(options) {
    var gameId = required(options.gameId);
    var userId = required(options.userId);
    // TODO(mduan): Validate game exists
    var game = Game.findOne(gameId);
    if (userId === game.whiteUserId || userId === game.blackUserId) {
      return true;
    } else if (!game.whiteUserId || !game.blackUserId) {
      if (!game.whiteUserId) {
        var updateData = {whiteUserId: userId};
      } else {
        var updateData = {blackUserId: userId};
      }
      Game.update(game._id, {$set: updateData});
      return true;
    } else {
      return false;
    }
  },

  startGame: function(options) {
    var gameId = required(options.gameId);
    var userId = required(options.color);
    var game = Game.findOne(gameId);
    if (color === RtsChess.WHITE) {
      Game.update(game._id, {$set: {whiteUserReady: true}});
    } else {
      Game.update(game._id, {$set: {blackUserReady: true}});
    }
    game = Game.findOne(gameId);
    return game.whiteUserReady && game.blackUserReady;
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
    if (lastMove) {
      var chess = new RtsChess({position: lastMove.position});
    } else {
      var chess = new RtsChess();
    }

    console.log('gameId', gameId);
    console.log('lastMove', lastMove);

    var isValid = chess.makeMove({
      source: source,
      target: target,
      color: color
    });

    console.log('isValid', isValid);

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

      return true;
    } else {
      return false;
    }
  }
});
