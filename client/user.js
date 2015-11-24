if (!Session.get('userId')) {
  var userId = 'user' + Date.now();
  Session.set('userId', userId);
}
