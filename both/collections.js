Collections = {
  User: new Mongo.Collection('user'),
  Game: new Mongo.Collection('game'),
  Move: new Mongo.Collection('move')
};

Meteor.methods({
  makeMove: function(options) {
    var Game = Collections.Game;
    var Move = Collections.Move;
    var RtsChess = Module.RtsChess;
    var required = Module.Helper.required;

    // FIXME: remove
    //if (Meteor.isServer) {
    //  Meteor._sleepForMs(5000);
    //}
    //if (Meteor.isSimulation) {
    //  console.log('on client!!!!');
    //}

    var gameId = required(options.gameId);
    var source = required(options.source);
    var target = required(options.target);
    var color = required(options.color);

    var lastMove = Move.find(
      {gameId: gameId},
      {sort: {moveIdx: -1}, limit: 1}
    ).fetch()[0];
    var positions = {};
    _.each(lastMove.positions, function(pieceData, position) {
      positions[position] = pieceData.piece;
    });
    var chess = new RtsChess({positions: positions});

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
        pending: !Meteor.isServer,
        piece: chess.getPositions()[target],
        lastMoveTime: Date.now()
      };
      var numMoves = Move.find({gameId: gameId}).count();
      Move.insert({
        gameId: gameId,
        moveIdx: numMoves,
        pending: !Meteor.isServer,
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
