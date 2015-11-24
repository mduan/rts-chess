if (!Session.get('userId')) {
  var userId = 'user' + Date.now();
  Session.setPersistent('userId', userId);
}
