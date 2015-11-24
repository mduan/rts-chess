class RtsChessBoard {
  // Valid move logic from http://chessboardjs.com/examples#5000
  // TODO (mduan): Investigate es7 property initializers

  constructor(options) {
    this.gameId = options.gameId;
    this.moves = options.moves;
    this.color = options.color;
    this.$board = options.$board;
    this.initBoard();
    this.game = new Module.RtsChess(this.board.position());
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

    this.saveMove(source, target);
  }

  saveMove(source, target) {
    var numMoves = Collections.Move.find({gameId: this.gameId}).count();
    Collections.Move.insert({
      gameId: this.gameId,
      moveIdx: numMoves,
      source: source,
      target: target,
      color: this.color,
      position: this.game.getPosition()
    });

    if (this.game.getWinner()) {
      Collections.Game.update(
        this.gameId,
        {$set: {winner: this.game.getWinner()}}
      );
    }
  }
}

Module.RtsChessBoard = RtsChessBoard;
