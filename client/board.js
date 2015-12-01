var RtsChess = Module.RtsChess;
var Move = Collections.Move;

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

    if (lastMove.length) {
      self.position = _.extend({}, lastMove[0].position);
    } else {
      self.position = RtsChess.getStartPosition();
    }

    _.each(self.position, function(piece, square) {
      self.squares.set(square, piece);
    });
  });
});

Template.board.onRendered(function() {
  var self = this;

  this.squareBounds = getSquareBounds(this.$('.board-square'));

  $(window).mousemove(function(e) {
    var $dragPiece = self.$dragPiece;
    if (!$dragPiece) {
      return;
    }

    var width = $dragPiece.width();
    var height = $dragPiece.height();
    $dragPiece.css({
      'top': e.pageY - height/2,
      'left': e.pageX - width/2
    });

    if (self.$dragTarget) {
      self.$dragTarget.removeClass('board-highlight');
    }

    var newSquare = getXYSquare(self.squareBounds, e.pageX, e.pageY);
    if (newSquare) {
      self.$dragTarget = newSquare.$el;
      self.$dragTarget.addClass('board-highlight');
    } else {
      self.$dragTarget = null;
    }
  });

  $(window).mouseup(function() {
    var $sourceImg = self.$dragSource.find('img');
    if (self.$dragTarget) {
      self.$dragTarget.removeClass('board-highlight');

      var sourceSquare = self.$dragSource.attr('data-square');
      var targetSquare = self.$dragTarget.attr('data-square');
      var game = new RtsChess({position: self.position});

      var isValid = game.makeMove({
        source: sourceSquare,
        target: targetSquare,
        color: self.data.color
      });

      if (isValid) {
        Meteor.call('makeMove', {
          gameId: self.data.gameId,
          source: sourceSquare,
          target: targetSquare,
          color: self.data.color
        });

        self.$dragTarget.find('img').remove();
        self.$dragTarget.append($sourceImg);
      }
    }

    $sourceImg.show();
    self.$dragPiece.remove();

    self.$dragSource = null;
    self.$dragTarget = null;
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
      .addClass('board-dragPiece')
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
    self.$dragSource = $target.closest('.board-square');
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
