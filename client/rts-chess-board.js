class RtsChessBoard {
  // Valid move logic from http://chessboardjs.com/examples#5000
  // TODO (mduan): Investigate es7 property initializers

  constructor(options) {
    this.gameId = options.gameId;
    this.moves = options.moves;
    this.orientation = options.orientation;
    this.$board = options.$board;
    this.$status = options.$status;
    this.$pgn = options.$pgn;
    this.initBoard();
  }

  initBoard() {
    var self = this;
    this.game = new Chess();

    this.moves.forEach(function(move) {
      self.game.move({
        from: move.source,
        to: move.target,
        promotion: 'q' // NOTE: always promote to a queen for example simplicity
      });
    });

    this.board = ChessBoard(this.$board, {
      draggable: true,
      pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
      position: 'start',
      showNotation: false,
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this),
      onSnapEnd: this.onSnapEnd.bind(this),
      orientation: this.orientation,
      position: this.game.fen()
    });
  }

  destroy() {
    this.board.destroy();
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
      to: target
    });

    // illegal move
    if (move === null) return 'snapback';

    var numMoves = Collections.Move.find({gameId: this.gameId}).count();
    Collections.Move.insert({
      gameId: this.gameId,
      moveIdx: numMoves,
      source: source,
      target: target
    });
  }

  // update the board position after the piece snap
  // for castling, en passant, pawn promotion
  onSnapEnd() {
    this.board.position(this.game.fen());
  }

  //updateStatus() {
  //  var status = '';

  //  var moveColor = 'White';
  //  if (this.game.turn() === 'b') {
  //    moveColor = 'Black';
  //  }

  //  // checkmate?
  //  if (this.game.in_checkmate() === true) {
  //    status = 'Game over, ' + moveColor + ' is in checkmate.';
  //  }

  //  // draw?
  //  else if (this.game.in_draw() === true) {
  //    status = 'Game over, drawn position';
  //  }

  //  // game still on
  //  else {
  //    status = moveColor + ' to move';

  //    // check?
  //    if (this.game.in_check() === true) {
  //      status += ', ' + moveColor + ' is in check';
  //    }
  //  }

  //  this.$status.html(status);
  //  this.$pgn.html(this.game.pgn());
  //}
}

Module.RtsChessBoard = RtsChessBoard;
