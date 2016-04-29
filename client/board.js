var required = Module.Helper.required;

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

    reset: function() {
      var self = this;
      _.each(this.lastMoveTimes, function(_, square) {
        self.stopAnimation(square);
      });
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

    getCooldownData: function(lastMoveTime) {
      var serverOffset = 0;
      Tracker.nonreactive(function() {
        serverOffset = TimeSync.serverOffset();
      });
      var currTime = Date.now();
      var lastMoveAdjustedTime = (lastMoveTime - serverOffset);
      var elapsedTime = currTime - lastMoveAdjustedTime;
      if (elapsedTime > this.cooldown) {
        return {
          cooldown: false
        };
      }

      if (elapsedTime < 0) {
        lastMoveAdjustedTime = currTime;
      }

      var remainingTime;
      if (elapsedTime > this.cooldown) {
        remainingTime = 0;
      } else {
        if (elapsedTime < 0) {
          remainingTime = this.cooldown;
        } else {
          remainingTime = this.cooldown - elapsedTime;
        }
      }
      return {
        cooldown: true,
        remainingTime: remainingTime,
        lastMoveAdjustedTime: lastMoveAdjustedTime
      };
    },

    startAnimation: function(square, lastMoveTime) {
      // The board has not been initially rendered yet.
      if (!this.$board) {
        return;
      }

      var cooldownData = this.getCooldownData(lastMoveTime);
      if (!cooldownData.cooldown) {
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
      this.lastMoveTimes[square] = cooldownData.lastMoveAdjustedTime;
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

  this.reactiveVars = {
    squares: new ReactiveDict(),
    pendingMoves: new ReactiveVar([])
  };

  this.cooldownAnimator = new CooldownAnimator({
    cooldown: 0
  });

  this.computerMoveTimer = null;

  function updateSquares(positions) {
    RtsChess.getSquares().forEach(function(rowSquares) {
      rowSquares.forEach(function(square) {
        if (square in positions) {
          var position = positions[square];
          self.reactiveVars.squares.set(square, position);
        } else {
          self.reactiveVars.squares.set(square, null);
        }
      });
    });
  }

  function makeComputerMove() {
    var data = self.data;

    if (!data.board || !data.board.isInProgress()) {
      return;
    }

    var lastMove = data.board.getLastMove();
    var positions = lastMove.positions;
    var chess = RtsChess.fromMovePositions(positions);

    var oppColor = RtsChess.swapColor(data.color);
    var fen = chess.getFen(
      oppColor,
      lastMove.lastMoveIdx + 1
    );

    var move = ChessAi.findMove(fen, data.board.computerDifficulty - 1);
    var oppSourceSquare = RtsChess.idxToSquare(move[0]);
    var oppTargetSquare = RtsChess.idxToSquare(move[1]);
    var pieceData = positions[oppSourceSquare];
    var cooldownData = self.cooldownAnimator.getCooldownData(
      pieceData.lastMoveTime
    );
    if (cooldownData.cooldown) {
      self.computerMoveTimer = setTimeout(makeComputerMove, 500);
    } else {
      Meteor.call('makeMove', {
        boardId: data.board._id,
        source: oppSourceSquare,
        target: oppTargetSquare,
        color: oppColor
      });

      self.computerMoveTimer = setTimeout(
        makeComputerMove,
        data.board.computerFrequency
      );
    }
  }

  this.autorun(function() {
    var data = Template.currentData();
    if (!data.board) {
      return;
    }
    self.cooldownAnimator.reset();
    self.cooldownAnimator.setCooldown(data.board.cooldown);
  });

  this.autorun(function() {
   var data = Template.currentData();
    if (!data.board || !data.board.isInProgress()) {
      return;
    }

    if (self.computerMoveTimer) {
      clearTimeout(self.computerMoveTimer);
    }
    if (data.board.isComputerOpp() && !data.board.isObserver()) {
      self.computerMoveTimer = setTimeout(makeComputerMove, 1000);
    }
  });

  this.autorun(function() {
    var data = Template.currentData();
    if (!data.board) {
      return;
    }

    var lastMove = data.board.getLastMove();
    if (!lastMove) {
      return;
    }

    var positions = lastMove.positions;

    var pendingMoves = self.reactiveVars.pendingMoves;

    var invalidPendingMoves = [];
    var chess = RtsChess.fromMovePositions(lastMove.positions);
    pendingMoves.get().forEach(function(pendingMove) {
      var chessPositions = chess.getPositions();
      if (chessPositions[pendingMove.source] === pendingMove.piece) {
        var isValid = chess.makeMove({
          source: pendingMove.source,
          target: pendingMove.target,
          color: data.color
        });
        if (isValid) {
          delete positions[pendingMove.source];
          positions[pendingMove.target] = {
            piece: chessPositions[pendingMove.target],
            isPendingMove: true
          };
        } else {
          invalidPendingMoves.push(pendingMove);
        }
      }
    });

    invalidPendingMoves.forEach(function(pendingMove) {
      var index = pendingMoves.get().indexOf(pendingMove);
      if (index >= 0) {
        pendingMoves.get().splice(index, 1);
      }
    });

    var square = chess.getKingSquare(data.color);
    if (square) {
      if (chess.isAttacked(square, data.color)) {
        positions[square].isAttacked = true;
      }
    }

    updateSquares(positions);
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

      var pieceData = self.reactiveVars.squares.get(sourceSquare);

      var positions = {};
      _.each(self.reactiveVars.squares.all(), function(pieceData, position) {
        if (pieceData) {
          positions[position] = pieceData.piece;
        }
      });
      var data = self.data;
      var chess = new RtsChess({positions: positions});
      var isValid = chess.makeMove({
        source: sourceSquare,
        target: targetSquare,
        color: data.color
      });

      if (isValid) {
        var pendingMoves = self.reactiveVars.pendingMoves;
        var pendingMove = {
          piece: pieceData.piece,
          source: sourceSquare,
          target: targetSquare
        };
        var newPendingMoves = pendingMoves.get();
        newPendingMoves.push(pendingMove);
        pendingMoves.set(newPendingMoves);
        Meteor.call('makeMove', {
          boardId: data.board._id,
          source: sourceSquare,
          target: targetSquare,
          color: data.color
        }, function() {
          var index = pendingMoves.get().indexOf(pendingMove);
          if (index >= 0) {
            pendingMoves.get().splice(index, 1);
          }
        });
      } else {
        $sourceImg.show();
      }
    } else {
      $sourceImg.show();
    }

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
    var data = Template.currentData();

    if (data.board.isObserver()) {
      return;
    }

    if (!data.board.isInProgress()) {
      return;
    }

    var playerColor = data.color;
    if (this.color !== playerColor) {
      /* jshint ignore:start */
      console.log('not my color', this.color)
      /* jshint ignore:end */
      return;
    }

    var $boardSquare = $target.closest('.board-square');
    if ($boardSquare.hasClass('board-pendingMove')) {
      return;
    }

    var square = $boardSquare.attr('data-square');
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
        var data = _.extend(pieceData || {}, {
          square: square,
          color: currColor
        });
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
      if (!pieceData.isPendingMove) {
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
