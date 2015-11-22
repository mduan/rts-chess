class RtsChessBoard {
  // Valid move logic from http://chessboardjs.com/examples#5000
  // TODO (mduan): Investigate es7 property initializers

  constructor(options) {
    this.$board = options.$board;
    this.$status = options.$status;
    this.$pgn = options.$pgn;
    this.game = new Chess();
    this.board = ChessBoard(this.$board, {
      draggable: true,
      pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
      position: 'start',
      showNotation: false,
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this),
      onSnapEnd: this.onSnapEnd.bind(this),
      orientation: options.orientation
    });
    this.updateStatus();
  }

  // do not pick up pieces if the game is over
  // only pick up pieces for the side to move
  onDragStart(source, piece, position, orientation) {
    if (this.game.game_over() === true ||
        (this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
      return false;
    }
  }

  onDrop(source, target) {
    // see if the move is legal
    var move = this.game.move({
      from: source,
      to: target,
      promotion: 'q' // NOTE: always promote to a queen for example simplicity
    });

    // illegal move
    if (move === null) return 'snapback';

    this.updateStatus();
  }

  // update the board position after the piece snap
  // for castling, en passant, pawn promotion
  onSnapEnd() {
    this.board.position(this.game.fen());
  }

  updateStatus() {
    var status = '';

    var moveColor = 'White';
    if (this.game.turn() === 'b') {
      moveColor = 'Black';
    }

    // checkmate?
    if (this.game.in_checkmate() === true) {
      status = 'Game over, ' + moveColor + ' is in checkmate.';
    }

    // draw?
    else if (this.game.in_draw() === true) {
      status = 'Game over, drawn position';
    }

    // game still on
    else {
      status = moveColor + ' to move';

      // check?
      if (this.game.in_check() === true) {
        status += ', ' + moveColor + ' is in check';
      }
    }

    this.$status.html(status);
    this.$pgn.html(this.game.pgn());
  }
}

Module.RtsChessBoard = RtsChessBoard;
