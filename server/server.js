var Game = Collections.Game;
var Move = Collections.Move;

Meteor.methods({
  'removeGames': function() {
    Game.remove({});
  },

  'removeMoves': function() {
    Move.remove({});
  },

  'createGame': function(userId) {
    return Game.insert({
      createdById: userId,
      whiteUserId: userId
    });
  },

  'joinGame': function(gameId, userId) {
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

  'startGame': function(gameId, userId) {
    var game = Game.findOne(gameId);
    if (userId === game.whiteUserId) {
      Game.update(game._id, {$set: {whiteUserReady: true}});
    } else {
      Game.update(game._id, {$set: {blackUserReady: true}});
    }
    game = Game.findOne(gameId);
    return game.whiteUserReady && game.blackUserReady;
  }
});
