(function() {
  var $ziti$ = function(string) { return string; };
  var h3 = document.querySelectorAll('h3');
  for (var i = 0; i < h3.length; i++) {
    h3[i].innerHTML = $ziti$('字体名称');
  }

  var dataText = document.querySelector('[data-text]');
  if (dataText) {
    dataText.innerHTML = dataText.getAttribute('data-text');
  }
})();
