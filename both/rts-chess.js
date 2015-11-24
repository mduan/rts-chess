var required = Module.Helper.required;

var BLACK = 'b';
var WHITE = 'w';
var KING = 'K';
var QUEEN = 'Q';
var BISHOP = 'B';
var KNIGHT = 'N';
var ROOK = 'R';
var PAWN = 'P';

class RtsChess {
  constructor(options) {
    this.position = required(options.position);
    this.computeWinner();
  }

  getPosition() {
    return this.position;
  }

  isValidCell(cell) {
    col = cell[0];
    row = cell[1];
    return col >= 'a' && col <= 'h' && row >= '1' && row <= '8';
  }

  isOccupied(cell) {
    return cell in this.position;
  }

  isGameOver() {
    // TODO (mduan): Implement
    return false;
  }

  getPieceColor(cell) {
    if (!this.isOccupied(cell)) {
      return null;
    }
    return this.position[cell][0];
  }

  getPieceType(cell) {
    if (!this.isOccupied(cell)) {
      return null;
    }
    return this.position[cell][1];
  }

  getRowIdx(cell) {
    return cell.charCodeAt(1) - '1'.charCodeAt(0);
  }

  getColIdx(cell) {
    return cell.charCodeAt(0) - 'a'.charCodeAt(0);
  }

  getRowDiff(source, target) {
    return target.charCodeAt(1) - source.charCodeAt(1);
  }

  getColDiff(source, target) {
    return target.charCodeAt(0) - source.charCodeAt(0);
  }

  getDir(diff) {
    if (diff < 0) {
      return -1;
    } else if (diff > 0) {
      return 1;
    }
    return 0;
  }

  toCell(rowIdx, colIdx) {
    return String.fromCharCode('a'.charCodeAt(0) + colIdx) + (rowIdx + 1);
  }

  isValidPieceMove(source, target) {
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
    } else if (pieceType === BISHOP || pieceType === ROOK || pieceType === QUEEN) {

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
        if (this.isOccupied(this.toCell(rowIdx, colIdx))) {
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
      if (pieceColor === WHITE && rowDiff < 0 ||
          pieceColor === BLACK && rowDiff > 0) {
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
      if ((pieceColor === WHITE && sourceRowIdx === 1 ||
            pieceColor === BLACK && sourceRowIdx === 6) && absRowDiff <= 2) {
        return true;
      }
      if (absRowDiff === 1) {
        return true;
      }
      return false;
    }

    return false;
  }

  makeMove(moveData) {
    var source = moveData.source;
    var target = moveData.target;

    if (source === target) {
      return false;
    }

    if (!this.isValidCell(source) ||
        !this.isValidCell(target)) {
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

    // TODO(mduan): Handle promotion

    this.position[target] = this.position[source];
    delete this.position[source];

    this.computeWinner();

    return true;
  }

  saveMove(source, target) {
    var numMoves = Collections.Move.find({gameId: this.gameId}).count();
    Collections.Move.insert({
      gameId: this.gameId,
      moveIdx: numMoves,
      source: source,
      target: target,
      color: this.color,
      position: this.position
    });

    if (this.getWinner()) {
      Collections.Game.update(
        this.gameId,
        {$set: {winner: this.getWinner()}}
      );
    }
  }

  getWinner() {
    return this.winner;
  }

  // TODO(mduan): Handle when both kings are gone?
  computeWinner() {
    var hasWhiteKing = _.any(this.position, function(piece) {
      return piece === WHITE + KING;
    });
    if (!hasWhiteKing) {
      this.winner = BLACK;
      return;
    }

    var hasBlackKing = _.any(this.position, function(piece) {
      return piece === BLACK + KING;
    });
    if (!hasBlackKing) {
      this.winner = WHITE;
      return;
    }
  }
}

RtsChess.BLACK = BLACK;
RtsChess.WHITE = WHITE;

Module.RtsChess = RtsChess;
