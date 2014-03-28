(function() {
  var variable = '内';
  var variable2 = '部'; /*!ziti{内}ziti { 部 } */
  var $ziti$ = function(string) { return string; };
  var not$ziti$ = function(string) { return string; };
  var h3 = document.querySelectorAll('h3');
  not$ziti$('ABCDEFGHIJKLMNOPQRST');
  for (var i = 0; i < h3.length; i++) {
    h3[i].innerHTML = $ziti$(
      '字'+'体' + variable + variable2 + "(名)" +
      "称"
    );
  }

  var dataText = document.querySelectorAll('[data-text]');
  for (var i = 0; i < dataText.length; i++) {
    dataText[i].innerHTML = dataText[i].getAttribute('data-text');
  }
})();
