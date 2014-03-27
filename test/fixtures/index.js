(function() {
  var $ziti$ = function(string) { return string; };
  var h3 = document.querySelectorAll('h3');
  for (var i = 0; i < h3.length; i++) {
    h3[i].innerHTML = $ziti$('字体名称');
  }

  var dataText = document.querySelectorAll('[data-text]');
  for (var i = 0; i < dataText.length; i++) {
    dataText[i].innerHTML = dataText[i].getAttribute('data-text');
  }
})();
