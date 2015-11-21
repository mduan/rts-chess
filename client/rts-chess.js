$(function() {
  //Session.setDefault('counter', 0);

  //Template.hello.helpers({
  //  counter: function () {
  //    return Session.get('counter');
  //  }
  //});

  //Template.hello.events({
  //  'click button': function () {
  //    // increment the counter when button is clicked
  //    Session.set('counter', Session.get('counter') + 1);
  //  }
  //});

  var board = ChessBoard('board', {
    draggable: true,
    pieceTheme: 'img/chesspieces/wikipedia/{piece}.png',
    position: 'start',
    showNotation: false,
    sparePieces: true
  });
});
