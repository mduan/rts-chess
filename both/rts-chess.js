RtsChess = (function() {
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
    a7: 'bP', b7: 'bP', c7: 'bP', d7: 'bP', e7: 'bP', f7: 'bP', g7: 'bP', h7: 'bP',
    a2: 'wP', b2: 'wP', c2: 'wP', d2: 'wP', e2: 'wP', f2: 'wP', g2: 'wP', h2: 'wP',
    a1: 'wR', b1: 'wN', c1: 'wB', d1: 'wQ', e1: 'wK', f1: 'wB', g1: 'wN', h1: 'wR'
  };
  /* jshint +W101 */

  // TODO: Move static functions out of prototype
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

    isOccupied: function(square) {
      return square in this.positions;
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

      if (!RtsChess.isValidSquare(source)
        || !RtsChess.isValidSquare(target)) {
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

    isChecked: function(color) {
      var square = this.getKingSquare(color);
      if (!square) {
        return false;
      }
      return this.isAttacked(square, color);
    },

    // Is square attacked by color?
    isAttacked: function(square, color) {
      // Rook directions
      var specs = [{
        pieces: [ROOK, QUEEN],
        multiple: true,
        directions: [[1, 0], [0, 1], [-1, 0], [0, -1]]
      }, {
        pieces: [BISHOP, QUEEN],
        multiple: true,
        directions: [[1, -1], [1, 1], [-1, -1], [-1, 1]]
      }, {
        pieces: [KNIGHT],
        multiple: false,
        directions: [
          [1, -2], [2, -1], [2, 1], [1, 2],
          [-1, -2], [-2, -1], [-2, 1], [-1, 2]
        ]
      }, {
        pieces: [KING],
        multiple: false,
        directions: [
          [1, -1], [1, 0], [1, 1], [0, 1],
          [-1, -1], [-1, 0], [-1, 1], [0, -1]
        ],
      }, {
        pieces: [PAWN],
        multiple: false,
        directions: {
          white: [[1, -1], [1, 1]],
          black: [[-1, -1], [-1, 1]]
        }
      }];

      var rowIdx = this.getRowIdx(square);
      var colIdx = this.getColIdx(square);
      var positions = this.positions;

      var isAttacked = specs.some(function(spec) {
        var directions;
        if (color === WHITE && spec.directions.white) {
          directions = spec.directions.white;
        } else if (color === BLACK && spec.directions.black) {
          directions = spec.directions.black;
        } else {
          directions = spec.directions;
        }
        return directions.some(function(dir) {
          var currRowIdx = rowIdx;
          var currColIdx = colIdx;
          while (true) {
            currRowIdx += dir[0];
            currColIdx += dir[1];
            var square = RtsChess.toSquare(currRowIdx, currColIdx);
            if (!RtsChess.isValidSquare(square)) {
              return false;
            }

            if (square in positions) {
              var piece = positions[square];
              if (piece[0] === color) {
                return false;
              }
              if (spec.pieces.indexOf(piece[1]) < 0) {
                return false;
              }
              return true;
            }

            if (!spec.multiple) {
              return false;
            }
          }
        });
      });

      return isAttacked;
    },

    getKingSquare: function(color) {
      // TODO: Do this in a cleaner way
      var kingSquare;
      _.find(this.positions, function(piece, square) {
        if (piece === color + KING) {
          kingSquare = square;
          return true;
        }
      });
      return kingSquare;
    },

    // TODO(mduan): Handle when both kings are gone?
    computeWinner: function() {
      if (!this.getKingSquare(WHITE)) {
        this.winner = BLACK;
      } else if (!this.getKingSquare(BLACK)) {
        this.winner = WHITE;
      }
    },

    getFen: function(color, moveNumber) {
      var fenBoard = '';

      for (var rowIdx = RtsChess.NUM_ROWS - 1; rowIdx >= 0; --rowIdx) {
        for (var colIdx = 0; colIdx < RtsChess.NUM_COLS; ++colIdx) {
          var square = RtsChess.toSquare(rowIdx, colIdx);
          if (square in this.positions) {
            var piece = this.positions[square];
            var pieceFen;
            if (piece[0] === RtsChess.WHITE) {
              pieceFen = piece[1].toUpperCase();
            } else {
              pieceFen = piece[1].toLowerCase();
            }
            fenBoard += pieceFen;
          } else {
            fenBoard += '1';
          }
        }

        if (rowIdx !== 0) {
          fenBoard += '/';
        }
      }

      fenBoard = fenBoard.replace(/11111111/g, '8');
      fenBoard = fenBoard.replace(/1111111/g, '7');
      fenBoard = fenBoard.replace(/111111/g, '6');
      fenBoard = fenBoard.replace(/11111/g, '5');
      fenBoard = fenBoard.replace(/1111/g, '4');
      fenBoard = fenBoard.replace(/111/g, '3');
      fenBoard = fenBoard.replace(/11/g, '2');

      var fenArr = [
        fenBoard,
        color,
        '-', /* castles */
        '-', /* en passant */
        '0', /* timeout */
        moveNumber
      ];
      return fenArr.join(' ');
    }
  });

  RtsChess.BLACK = BLACK;
  RtsChess.WHITE = WHITE;
  RtsChess.NUM_ROWS = 8;
  RtsChess.NUM_COLS = 8;
  // TODO: Move somewhere more sensible
  RtsChess.OPP_TYPE_COMPUTER = 'c';
  RtsChess.OPP_TYPE_HUMAN = 'h';

  RtsChess.getStartPosition = function() {
    return _.extend({}, START_POSITION);
  };

  RtsChess.toSquare = function(rowIdx, colIdx) {
    return String.fromCharCode('a'.charCodeAt(0) + colIdx) + (rowIdx + 1);
  };

  RtsChess.idxToSquare = function(idx) {
    var ROW_LEN = 10;
    var COL_PADDING = 2;
    var ROW_PADDING = 1;
    var rowIdx = Math.floor(idx / ROW_LEN) - COL_PADDING;
    var colIdx = (idx % ROW_LEN) - ROW_PADDING;
    return RtsChess.toSquare(rowIdx, colIdx);
  };

  RtsChess.fromMovePositions = function(movePositions) {
    var positions = {};
    _.each(movePositions, function(pieceData, position) {
      positions[position] = pieceData.piece;
    });
    return new RtsChess({positions: positions});
  };

  RtsChess.getPieceColor = function(piece) {
    return piece[0];
  };

  RtsChess.getPieceType = function(piece) {
    return piece[1];
  };

  RtsChess.swapColor = function(color) {
    if (color === WHITE) {
      return BLACK;
    } else {
      return WHITE;
    }
  };

  RtsChess.isValidSquare = function(square) {
    var col = square[0];
    var row = square[1];
    return (
      square.length === 2 &&
      col >= 'a' && col <= 'h' && row >= '1' && row <= '8'
    );
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
