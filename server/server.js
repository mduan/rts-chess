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
      var updateData = {startTime: new Date()};
      if (!existingGame.whiteUserId) {
        updateData.whiteUserId = userId;
      } else {
        updateData.blackUserId = userId;
      }
      Game.update(existingGame._id, {$set: updateData});
      return existingGame._id;
    }

    return Game.insert({
      whiteUserId: userId
    });
  }
});
