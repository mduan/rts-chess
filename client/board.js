var required = Module.Helper.required;
var RtsChess = Module.RtsChess;
var Move = Collections.Move;

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

    setCooldown: function(cooldown) {
      this.cooldown = cooldown;
    },

    startAnimation: function(square, lastMoveTime) {
      var serverOffset = 0;
      Tracker.nonreactive(function() {
        serverOffset = TimeSync.serverOffset();
      });
      var currTime = Date.now();
      var lastMoveAdjustedTime = (lastMoveTime - serverOffset);
      var elapsedTime = currTime - lastMoveAdjustedTime;
      if (elapsedTime > this.cooldown) {
        return;
      }

      if (elapsedTime < 0) {
        lastMoveAdjustedTime = currTime;
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
      this.lastMoveTimes[square] = lastMoveAdjustedTime;
    },

    isAnimating: function(square) {
      return square in this.lastMoveTimes;
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

  this.subscribe('move');

  this.reactiveVars = {
    squares: new ReactiveDict(),
    cooldown: new ReactiveVar()
  };

  this.autorun(function() {
    var data = Template.currentData();
    self.reactiveVars.cooldown.set(data.cooldown);
  });

  this.autorun(function(computation) {
    var cooldown = self.reactiveVars.cooldown.get();
    if (computation.firstRun) {
      self.cooldownAnimator = new CooldownAnimator({cooldown: cooldown});
    } else {
      self.cooldownAnimator.setCooldown(cooldown);
    }
  });

  this.autorun(function() {
    if (!Template.instance().subscriptionsReady()) {
      return;
    }

    var lastMove = Move.find(
      {gameId: self.data.gameId},
      {sort: {moveIdx: -1}, limit: 1}
    ).fetch()[0];
    var positions = lastMove.positions;

    RtsChess.getSquares().forEach(function(rowSquares) {
      rowSquares.forEach(function(square) {
        if (square in positions) {
          var position = positions[square];
          self.reactiveVars.squares.set(square, {
            pending: position.pending,
            piece: position.piece,
            lastMoveTime: position.lastMoveTime
          });
        } else {
          self.reactiveVars.squares.set(square, null);
        }
      });
    });
  });
});

Template.board.onRendered(function() {
  var self = this;

  this.squareBounds = getSquareBounds(this.$('.board-square'));
  this.$board = this.$('.board');
  this.cooldownAnimator.ready(this.$board);

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
      //var positions = {};
      //_.each(self.reactiveVars.squares.all(), function(pieceData, position) {
      //  if (pieceData) {
      //    positions[position] = pieceData.piece;
      //  }
      //});
      //var chess = new RtsChess({positions: positions});

      //var isValid = chess.makeMove({
      //  source: sourceSquare,
      //  target: targetSquare,
      //  color: self.data.color
      //});

      var response = Meteor.apply('makeMove', [{
        gameId: self.data.gameId,
        source: sourceSquare,
        target: targetSquare,
        color: self.data.color
      }], {
        returnStubValue: true
      });
      if (response.success) {
        // TODO(mduan): Blaze doesn't when doing
        // $dragTarget.append($sourceImg). This is probably because doing this
        // messes with the DOM in a way it can't deal with. Should find a
        // cleaner way for doing this than the current hack.
        //var $targetImg = self.$dragTarget.find('img');
        //if ($targetImg.length) {
        //  $targetImg.attr('src', $sourceImg.attr('src'));
        //  $sourceImg.remove();
        //} else {
        //  self.$dragTarget.append($sourceImg);
        //}
        // self.$dragTarget.addClass('board-pending');
        $sourceImg.remove();
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
    var template = Template.instance();

    if (!template.data.gameStarted || template.data.gameEnded) {
      return;
    }

    var playerColor = template.data.color;
    if (this.color !== playerColor) {
      return;
    }

    var square = $target.closest('.board-square').attr('data-square');
    if (template.cooldownAnimator.isAnimating(square)) {
      return;
    }

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

    $('body').append($img);
    template.$dragPiece = $img;

    $target.hide();
    template.$dragSource = $target.closest('.board-square');
  }
});

Template.board.helpers({
  rows: function() {
    var template = Template.instance();
    var rows = [];
    var currColor = RtsChess.WHITE;
    RtsChess.getSquares(this.color).forEach(function(rowSquares) {
      var row = [];
      rowSquares.forEach(function(square) {
        if (row.length) {
          // The first square in row has same color as last square in previous
          // row. So only swap color if not the first square.
          currColor = RtsChess.swapColor(currColor);
        }
        var pieceData = template.reactiveVars.squares.get(square);
        var data = {
          pending: !!(pieceData && pieceData.pending),
          square: square,
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

    var pieceData = template.reactiveVars.squares.get(square);
    var cooldownAnimator = template.cooldownAnimator;
    if (pieceData) {
      if (!pieceData.pending) {
        cooldownAnimator.startAnimation(square, pieceData.lastMoveTime);
      }

      return {
        iconUrl: '/img/chesspieces/wikipedia/' + pieceData.piece + '.png',
        // TODO(mduan): Refactor this
        color: pieceData.piece[0]
      };
    } else {
      cooldownAnimator.stopAnimation(square);
      return null;
    }
  }
});
