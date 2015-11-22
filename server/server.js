var Game = Collections.Game;
var Move = Collections.Move;

Meteor.methods({
  'removeGames': function() {
    Game.remove({});
  },

  'getGameId': function() {
    var userId = Meteor.userId();
    var myGame = Game.findOne({
      $or: [
        {whiteUserId: userId},
        {blackUserId: userId}
      ]
    });
    if (myGame) {
      return myGame._id;
    }

    var existingGame = Game.findOne({
      $or: [
        {whiteUserId: null},
        {blackUserId: null}
      ]
    });
    if (existingGame) {
      if (!existingGame.whiteUserId) {
        Game.update(existingGame._id, {$set: {whiteUserId: userId}});
      } else {
        Game.update(existingGame._id, {$set: {blackUserId: userId}});
      }
      return existingGame._id;
    }

    return Game.insert({
      whiteUserId: userId
    });
  }
});
