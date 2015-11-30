var RtsChess = Module.RtsChess;
var Move = Collections.Move;

var BOARD_SQUARE_SELECTOR = '.board-square';
var BOARD_HIGHLIGHT_CLASS = 'board-highlight';
var BOARD_PIECE_SELECTOR = BOARD_SQUARE_SELECTOR + ' img';
var BOARD_DRAG_PIECE_CLASS = 'board-dragPiece';

function getXYSquare(squareBounds, x, y) {
  return squareBounds.find(function(bound) {
    return (x >= bound.left && x < bound.right
      && y >= bound.top && y < bound.bottom);
  });
}

function getSquareBounds($squares) {
  return $squares.toArray().map(function(square) {
    var $square = $(square);
    var offset = $square.offset();
    return {
      $el: $square,
      top: offset.top,
      left: offset.left,
      bottom: offset.top + $square.outerHeight(),
      right: offset.left + $square.outerWidth()
    };
  });
}

Template.board.onCreated(function() {
  this.squares = new ReactiveDict();
  var self = this;
  this.autorun(function() {
    var lastMove = Move.find(
      {gameId: self.data.gameId},
      {sort: {moveIdx: -1}, limit: 1}
    ).fetch();

    var position;
    if (lastMove.length) {
      position = _.extend({}, lastMove[0].position);
    } else {
      position = RtsChess.getStartPosition();
    }

    _.each(position, function(piece, square) {
      self.squares.set(square, piece);
    });
  });
});

Template.board.onRendered(function() {
  var self = this;

  this.squareBounds = getSquareBounds(this.$(BOARD_SQUARE_SELECTOR));

  $(window).mousemove(function(e) {
    var $dragPiece = self.$dragPiece;
    if (!$dragPiece) {
      return;
    }

    var $target = $(e.target);
    console.log('mousemove', $target);
    var width = $dragPiece.width();
    var height = $dragPiece.height();
    $dragPiece.css({
      'top': e.pageY - height/2,
      'left': e.pageX - width/2
    });

    var newSquare = getXYSquare(self.squareBounds, e.pageX, e.pageY);
    if (self.dragSquare) {
      self.dragSquare.$el.removeClass(BOARD_HIGHLIGHT_CLASS);
    }
    if (newSquare) {
      newSquare.$el.addClass(BOARD_HIGHLIGHT_CLASS);
    }
    self.dragSquare = newSquare;
  });

  $(window).mouseup(function() {
    if (self.dragSquare) {
      self.dragSquare.$el.find(BOARD_PIECE_SELECTOR).remove();
      self.dragSquare.$el.append(self.$dragSource);
    }
    self.$dragSource.show();
    self.$dragPiece.remove();

    self.$dragSource = null;
    self.dragSquare = null;
    self.$dragPiece = null;
  });
});

Template.board.events({
  'mousedown .board-square img': function(e) {
    e.preventDefault();
    var $target = $(e.target);
    var width = $target.width();
    var height = $target.height();
    var $img = $('<img>')
      .addClass(BOARD_DRAG_PIECE_CLASS)
      .attr('src', $target.attr('src'))
      .width(width)
      .height(height)
      .css({
        'z-index': 100,
        'position': 'absolute',
        'top': e.pageY - height/2,
        'left': e.pageX - width/2
      });

    var self = Template.instance();

    $('body').append($img);
    self.$dragPiece = $img;

    $target.hide();
    self.$dragSource = $target;
  }
});

Template.board.helpers({
  rows: function() {
    var rows = [];

    var rowIndices;
    var colIndices;
    var currColor = RtsChess.WHITE;
    if (this.color === RtsChess.WHITE) {
      rowIndices = _.range(RtsChess.NUM_ROWS - 1, -1, -1);
      colIndices = _.range(RtsChess.NUM_COLS);
    } else {
      rowIndices = _.range(RtsChess.NUM_ROWS);
      colIndices = _.range(RtsChess.NUM_COLS - 1, -1, -1);
    }

    _.each(rowIndices, function(rowIdx) {
      var row = [];
      _.each(colIndices, function(colIdx) {
        if (row.length) {
          // The first square in row has same color as last square in previous
          // row. So only swap color if not the first square.
          currColor = RtsChess.swapColor(currColor);
        }
        var data = {
          square: RtsChess.toSquare(rowIdx, colIdx),
          color: currColor
        };
        row.push(data);
      });
      rows.push(row);
    });

    return rows;
  },

  piece: function(square) {
    var piece = Template.instance().squares.get(square);
    if (piece) {
      return {
        iconUrl: '/img/chesspieces/wikipedia/' + piece + '.png'
      };
    } else {
      return null;
    }
  }
});
