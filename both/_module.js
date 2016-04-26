Module = {};

Module.Helper = {
  required: function(param) {
    if (param === null || typeof param === 'undefined') {
      throw new Error('Required arg was not provided');
    }
    return param;
  }
};
