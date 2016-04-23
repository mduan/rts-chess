var RtsChess = (function() {
  var BLACK = 'b';
  var WHITE = 'w';
  var KING = 'K';
  var QUEEN = 'Q';
  var BISHOP = 'B';
  var KNIGHT = 'N';
  var ROOK = 'R';
  var PAWN = 'P';

  /* jshint -W101 */
  var START_POSITION = {
    a8: 'bR', b8: 'bN', c8: 'bB', d8: 'bQ', e8: 'bK', f8: 'bB', g8: 'bN', h8: 'bR',
    a7: 'bP', b7: 'bP', c7: 'bP', d5: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP',
    a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', e4: 'wP', f2: 'wP', g2: 'wP', h2: 'wP',
    a1: 'wR', b1: 'wN', c1: 'wB', d1: 'wQ', e1: 'wK', f1: 'wB', g1: 'wN', h1: 'wR'
  };
  /* jshint +W101 */

  function RtsChess(options) {
    options = options || {};
    if (options.positions) {
      this.positions = _.extend({}, options.positions);
    } else {
      this.positions = RtsChess.getStartPosition();
    }
    this.computeWinner();
  }

  _.extend(RtsChess.prototype, {

    getPositions: function() {
      return this.positions;
    },

    isValidSquare: function(square) {
      var col = square[0];
      var row = square[1];
      return col >= 'a' && col <= 'h' && row >= '1' && row <= '8';
    },

    isOccupied: function(square) {
      return square in this.positions;
    },

    isGameOver: function() {
      // TODO (mduan): Implement
      return false;
    },

    getPieceColor: function(square) {
      if (!this.isOccupied(square)) {
        return null;
      }
      return this.positions[square][0];
    },

    getPieceType: function(square) {
      if (!this.isOccupied(square)) {
        return null;
      }
      return this.positions[square][1];
    },

    getRowIdx: function(square) {
      return square.charCodeAt(1) - '1'.charCodeAt(0);
    },

    getColIdx: function(square) {
      return square.charCodeAt(0) - 'a'.charCodeAt(0);
    },

    getRowDiff: function(source, target) {
      return target.charCodeAt(1) - source.charCodeAt(1);
    },

    getColDiff: function(source, target) {
      return target.charCodeAt(0) - source.charCodeAt(0);
    },

    getDir: function(diff) {
      if (diff < 0) {
        return -1;
      } else if (diff > 0) {
        return 1;
      }
      return 0;
    },

    isValidPieceMove: function(source, target) {
      var pieceType = this.getPieceType(source);
      var pieceColor = this.getPieceColor(source);
      var rowDiff = this.getRowDiff(source, target);
      var colDiff = this.getColDiff(source, target);
      var absRowDiff = Math.abs(rowDiff);
      var absColDiff = Math.abs(colDiff);
      var sourceRowIdx = this.getRowIdx(source);
      var targetRowIdx = this.getRowIdx(target);
      var sourceColIdx = this.getColIdx(source);
      var targetColIdx = this.getColIdx(target);
      var rowDir = this.getDir(rowDiff);
      var colDir = this.getDir(colDiff);

      if (pieceType === KING) {
        if (absRowDiff <= 1 && absColDiff <= 1) {
          return true;
        }

        // TODO (mduan): Handle castling
        return false;
      } else if (pieceType === BISHOP || pieceType === ROOK
        || pieceType === QUEEN) {

        if (pieceType === BISHOP && absRowDiff !== absColDiff) {
          return false;
        }
        if (pieceType === ROOK && rowDiff !== 0 && colDiff !== 0) {
          return false;
        }
        if (pieceType === QUEEN && absRowDiff !== absColDiff &&
            (rowDiff !== 0 && colDiff !== 0)) {
          return false;
        }

        var rowIdx = sourceRowIdx + rowDir;
        var colIdx = sourceColIdx + colDir;
        while (!(rowIdx === targetRowIdx && colIdx === targetColIdx)) {
          if (this.isOccupied(RtsChess.toSquare(rowIdx, colIdx))) {
            return false;
          }
          rowIdx += rowDir;
          colIdx += colDir;
        }
        return true;
      } else if (pieceType === KNIGHT) {
        if (absRowDiff + absColDiff !== 3) {
          return false;
        }
        if (absRowDiff < 1 || absColDiff < 1) {
          return false;
        }
        return true;
      } else if (pieceType === PAWN) {
        if (rowDiff === 0) {
          return false;
        }
        if (pieceColor === WHITE && rowDiff < 0
          || pieceColor === BLACK && rowDiff > 0) {
          return false;
        }
        if (absRowDiff === 1 && absColDiff === 1 &&
            this.isOccupied(target)) {
          // capture
          return true;
        }
        if (colDiff !== 0) {
          return false;
        }
        if (!this.isOccupied(target)) {
          // moving forwards
          if ((pieceColor === WHITE && sourceRowIdx === 1
            || pieceColor === BLACK && sourceRowIdx === 6)
            && absRowDiff <= 2) {
            return true;
          }
          if (absRowDiff === 1) {
            return true;
          }
        }
        return false;
      }

      return false;
    },

    handlePromotion: function(target) {
      var pieceType = this.getPieceType(target);
      var pieceColor = this.getPieceColor(target);
      var targetRowIdx = this.getRowIdx(target);
      if (pieceType === PAWN
          && (pieceColor === WHITE && targetRowIdx === 7
            || pieceColor === BLACK && targetRowIdx === 0)) {
        this.positions[target] = pieceColor + QUEEN;
      }
    },

    makeMove: function(moveData) {
      var source = moveData.source;
      var target = moveData.target;

      if (source === target) {
        return false;
      }

      if (!this.isValidSquare(source)
        || !this.isValidSquare(target)) {
        return false;
      }

      if (this.getPieceColor(source) !== moveData.color) {
        return false;
      }

      if (this.getPieceColor(target) === moveData.color) {
        return false;
      }

      if (!this.isValidPieceMove(source, target)) {
        return false;
      }

      this.positions[target] = this.positions[source];
      delete this.positions[source];

      this.handlePromotion(target);

      this.computeWinner();

      return true;
    },

    getWinner: function() {
      return this.winner;
    },

    // TODO(mduan): Handle when both kings are gone?
    computeWinner: function() {
      var hasWhiteKing = _.any(this.positions, function(piece) {
        return piece === WHITE + KING;
      });
      if (!hasWhiteKing) {
        this.winner = BLACK;
        return;
      }

      var hasBlackKing = _.any(this.positions, function(piece) {
        return piece === BLACK + KING;
      });
      if (!hasBlackKing) {
        this.winner = WHITE;
        return;
      }
    }
  });

  RtsChess.BLACK = BLACK;
  RtsChess.WHITE = WHITE;
  RtsChess.NUM_ROWS = 8;
  RtsChess.NUM_COLS = 8;

  RtsChess.getStartPosition = function() {
    return _.extend({}, START_POSITION);
  };

  RtsChess.toSquare = function(rowIdx, colIdx) {
    return String.fromCharCode('a'.charCodeAt(0) + colIdx) + (rowIdx + 1);
  };

  RtsChess.swapColor = function(color) {
    if (color === WHITE) {
      return BLACK;
    } else {
      return WHITE;
    }
  };

  RtsChess.getSquares = function(color) {
    color = color || RtsChess.WHITE;
    var rowIndices;
    var colIndices;
    if (color === RtsChess.WHITE) {
      rowIndices = _.range(RtsChess.NUM_ROWS - 1, -1, -1);
      colIndices = _.range(RtsChess.NUM_COLS);
    } else {
      rowIndices = _.range(RtsChess.NUM_ROWS);
      colIndices = _.range(RtsChess.NUM_COLS - 1, -1, -1);
    }

    var rows = [];
    _.each(rowIndices, function(rowIdx) {
      var row = [];
      _.each(colIndices, function(colIdx) {
        row.push(RtsChess.toSquare(rowIdx, colIdx));
      });
      rows.push(row);
    });
    return rows;
  };

  return RtsChess;
})();

Module.RtsChess = RtsChess;
