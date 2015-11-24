var required = Module.Helper.required;

class RtsChessBoard {
  // Valid move logic from http://chessboardjs.com/examples#5000
  // TODO (mduan): Investigate es7 property initializers

  constructor(options) {
    this.gameId = required(options.gameId);
    this.moves = required(options.moves);
    this.color = required(options.color);
    this.$board = required(options.$board);
    this.initBoard();
    this.game = new Module.RtsChess({position: this.board.position()});
  }

  initBoard() {
    var self = this;

    if (this.moves.length) {
      var lastMove = this.moves[this.moves.length - 1];
      var position = lastMove.position;
    } else {
      var position = 'start';
    }
    this.board = ChessBoard(this.$board, {
      draggable: true,
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this),
      orientation: this.color === Module.RtsChess.WHITE ? 'white' : 'black',
      pieceTheme: '/img/chesspieces/wikipedia/{piece}.png',
      position: position,
      showNotation: false
    });
  }

  destroy() {
    this.board.destroy();
  }

  // do not pick up pieces if the game is over
  // only pick up pieces for the side to move
  onDragStart(source, piece, position, orientation) {
    return piece[0] === this.color && !this.game.getWinner();
  }

  onDrop(source, target) {
    // see if the move is legal
    var valid = this.game.makeMove({
      source: source,
      target: target,
      color: this.color
    });

    // illegal move
    if (!valid) {
      return 'snapback';
    }
  }
}

Module.RtsChessBoard = RtsChessBoard;
