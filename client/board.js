var required = Module.Helper.required;
var RtsChess = Module.RtsChess;
var Game = Collections.Game;
var Position = Collections.Position;

var CooldownAnimator = (function() {
  function CooldownAnimator(options) {
    this.cooldown = required(options.cooldown);
    this.lastMoveTimes = {};
  }

  _.extend(CooldownAnimator.prototype, {
    ready: function($board) {
      this.$board = $board;
      window.requestAnimationFrame(this.tick.bind(this));
    },

    getSquareEl: function(square) {
      return this.$board.find('[data-square="' + square + '"]');
    },

    getCanvasEl: function(square) {
      return this.getSquareEl(square).find('canvas');
    },

    updateCooldown: function(cooldown) {
      this.cooldown = cooldown;
    },

    startAnimation: function(square, lastMoveTime) {
      var elapsedTime = Date.now() - lastMoveTime;
      if (elapsedTime > this.cooldown) {
        return;
      }

      this.stopAnimation(square);
      var $square = this.getSquareEl(square);
      var $canvas = $('<canvas>').css({
        'opacity': '0.5',
        'position': 'absolute',
        'top': 0,
        'left': 0
      });
      $canvas[0].width = $square.width();
      $canvas[0].height = $square.height();
      $square.append($canvas);
      this.lastMoveTimes[square] = lastMoveTime;
    },

    stopAnimation: function(square) {
      if (square in this.lastMoveTimes) {
        var $square = this.getSquareEl(square);
        $square.find('canvas').remove();
        delete this.lastMoveTimes[square];
      }
    },

    tick: function() {
      var self = this;
      _.each(this.lastMoveTimes, function(lastMoveTime, square) {
        var elapsedTime = Date.now() - lastMoveTime;
        if (elapsedTime > self.cooldown) {
          self.stopAnimation(square);
          return;
        }

        var canvas = self.getCanvasEl(square)[0];
        var ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        var width = canvas.height;
        var height = canvas.height;
        var midWidth = width/2;
        var midHeight = height/2;

        ctx.beginPath();
        ctx.moveTo(midWidth, midHeight);
        ctx.lineTo(midWidth, -midHeight);
        var startAngle = -Math.PI/2;
        var cooldownRatio = elapsedTime/self.cooldown;
        var endAngle = startAngle + 2*Math.PI*cooldownRatio;
        ctx.arc(midWidth, midHeight, width, startAngle, endAngle, true);
        ctx.lineTo(midWidth, midHeight);
        ctx.closePath();
        ctx.clip();

        ctx.beginPath();
        ctx.fillStyle = 'yellow';
        ctx.fillRect(0, 0, width, height);
      });

      window.requestAnimationFrame(this.tick.bind(this));
    }
  });

  return CooldownAnimator;
})();

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
  var self = this;

  this.positions = new ReactiveDict();

// TODO(mduan): Remove this hack for getting the new cooldown
  this.autorun(function() {
    var game = Game.findOne(self.data.gameId);
    if (self.cooldownAnimator) {
      self.cooldownAnimator.updateCooldown(game.cooldown);
    } else {
      self.cooldownAnimator = new CooldownAnimator({
        cooldown: game.cooldown
      });
    }
  });

  this.autorun(function() {
    var positions = Position.find(
      {gameId: self.data.gameId}
    ).fetch();

    positions.forEach(function(position) {
      self.positions.set(position.square, {
        piece: position.piece,
        lastMoveTime: position.lastMoveTime
      });
    });
  });
});

Template.board.onRendered(function() {
  var self = this;

  this.squareBounds = getSquareBounds(this.$('.board-square'));
  // TODO(mduan): Remove hack, and use .board as the root element
  self.cooldownAnimator.ready($('.boardWrapper'));

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
    if (!self.$dragSource) {
      return;
    }

    var $sourceImg = self.$dragSource.find('img');
    if (self.$dragTarget) {
      self.$dragTarget.removeClass('board-highlight');

      var sourceSquare = self.$dragSource.attr('data-square');
      var targetSquare = self.$dragTarget.attr('data-square');
      var positions = {};
      _.each(self.positions.all(), function(pieceData, position) {
        positions[position] = pieceData.piece;
      });
      var chess = new RtsChess({positions: positions});

      var isValid = chess.makeMove({
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

    var template = Template.instance();

    $('body').append($img);
    template.$dragPiece = $img;

    $target.hide();
    template.$dragSource = $target.closest('.board-square');
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
    var template = Template.instance();
    var pieceData = template.positions.get(square);
    var cooldownAnimator = template.cooldownAnimator;
    if (pieceData) {
      cooldownAnimator.startAnimation(square, pieceData.lastMoveTime);
      return {
        iconUrl: '/img/chesspieces/wikipedia/' + pieceData.piece + '.png'
      };
    } else {
      cooldownAnimator.stopAnimation(square);
      return null;
    }
  }
});
