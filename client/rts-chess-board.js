var required = Module.Helper.required;

class RtsChessBoard {
  // Valid move logic from http://chessboardjs.com/examples#5000
  // TODO (mduan): Investigate es7 property initializers

  constructor(options) {
    this.gameId = required(options.gameId);
    this.moves = required(options.moves);
    this.color = required(options.color);
    this.started = required(options.started);
    this.$board = required(options.$board);

    if (this.moves.length) {
      var lastMove = this.moves[this.moves.length - 1];
      this.game = new Module.RtsChess({position: lastMove.position});
    } else {
      this.game = new Module.RtsChess();
    }

    this.board = ChessBoard(this.$board, {
      draggable: true,
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this),
      orientation: this.color === Module.RtsChess.WHITE ? 'white' : 'black',
      pieceTheme: '/img/chesspieces/wikipedia/{piece}.png',
      position: this.game.getPosition(),
      showNotation: false
    });
  }

  destroy() {
    this.board.destroy();
  }

  // do not pick up pieces if the game is over
  // only pick up pieces for the side to move
  onDragStart(source, piece, position, orientation) {
    return this.started && piece[0] === this.color && !this.game.getWinner();
  }

  onDrop(source, target) {
    var isValid = this.game.makeMove({
      source: source,
      target: target,
      color: this.color
    });

    if (!isValid) {
      return 'snapback';
    }

    Meteor.call('makeMove', {
      gameId: this.gameId,
      source: source,
      target, target,
      color: this.color
    });
  }
}

Module.RtsChessBoard = RtsChessBoard;
