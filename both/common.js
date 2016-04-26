var Board = Collections.Board;
var Game = Collections.Game;
var User = Collections.User;
var required = Module.Helper.required;

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
        // TODO: Currently can't remove the user since that gets the
        // front-end has reactive functions that try to find the removed
        // user before the game's users are removed.
        // User.remove(gameUsers.opp._id);
        Game.update(gameId, {$unset: unsetData});
      }
    } else if (oppType === RtsChess.OPP_TYPE_COMPUTER) {
      if (!gameUsers.opp) {
        var createUserResult = Meteor.apply(
          'createUser',
          [{isComputer: true}],
          {returnStubValue: true}
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

  resignBoard: function(options) {
    var gameId = required(options.gameId);
    var winner = required(options.winner);
    var game = Game.findOne(gameId);

    if (!game.currBoardId) {
      return {success: false};
    }

    var gameUsers = getGameUsers(game);
    var whiteUserReady = false;
    var blackUserReady = false;
    if (gameUsers.opp.isComputer) {
      if (gameUsers.opp._id === game.whiteUserId) {
        whiteUserReady = true;
      } else {
        blackUserReady = true;
      }
    }

    Board.update(game.currBoardId, {
      $set: {winner: winner}
    });

    Game.update(gameId, {
      $set: {
        whiteUserReady: whiteUserReady,
        blackUserReady: blackUserReady
      }
    });

    return {success: true};
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
  }
});
